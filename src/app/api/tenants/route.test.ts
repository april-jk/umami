import { beforeEach, expect, test, vi } from 'vitest';
import { parseRequest } from '@/lib/request';
import { canCreateTenant } from '@/permissions/tenant';
import { createTenant, getUserTenants } from '@/queries/prisma/tenant';
import { GET, POST } from './route';

vi.mock('@/lib/request', () => ({
  parseRequest: vi.fn(),
  getQueryFilters: vi.fn().mockResolvedValue({}),
}));

vi.mock('@/permissions/tenant', () => ({
  canCreateTenant: vi.fn(),
}));

vi.mock('@/queries/prisma/tenant', () => ({
  createTenant: vi.fn(),
  getUserTenants: vi.fn(),
}));

const parseRequestMock = vi.mocked(parseRequest);
const canCreateTenantMock = vi.mocked(canCreateTenant);
const createTenantMock = vi.mocked(createTenant);
const getUserTenantsMock = vi.mocked(getUserTenants);

beforeEach(() => {
  parseRequestMock.mockReset();
  canCreateTenantMock.mockReset();
  createTenantMock.mockReset();
  getUserTenantsMock.mockReset();
});

test('GET returns tenants visible to the authenticated user', async () => {
  parseRequestMock.mockResolvedValue({
    auth: { user: { id: 'user-1' } },
    query: {},
    error: undefined,
  });
  getUserTenantsMock.mockResolvedValue({ data: [{ id: 'tenant-1' }], count: 1 } as any);

  const response = await GET(new Request('http://localhost/api/tenants'));
  const body = await response.json();

  expect(response.status).toBe(200);
  expect(getUserTenantsMock).toHaveBeenCalledWith('user-1', {});
  expect(body.data).toEqual([{ id: 'tenant-1' }]);
});

test('POST creates an owned tenant with a normalized slug', async () => {
  parseRequestMock.mockResolvedValue({
    auth: { user: { id: 'user-1' } },
    body: {
      name: 'Acme Analytics, Inc.',
      type: 'organization',
    },
    error: undefined,
  });
  canCreateTenantMock.mockResolvedValue(true);
  createTenantMock.mockResolvedValue({ id: 'tenant-1', slug: 'acme-analytics-inc' } as any);

  const response = await POST(new Request('http://localhost/api/tenants', { method: 'POST' }));
  const body = await response.json();

  expect(response.status).toBe(200);
  expect(createTenantMock).toHaveBeenCalledWith(
    {
      name: 'Acme Analytics, Inc.',
      slug: 'acme-analytics-inc',
      type: 'organization',
    },
    'user-1',
  );
  expect(body.slug).toBe('acme-analytics-inc');
});

test('POST rejects users without tenant creation permission', async () => {
  parseRequestMock.mockResolvedValue({
    auth: { user: { id: 'user-1' } },
    body: {
      name: 'Acme',
    },
    error: undefined,
  });
  canCreateTenantMock.mockResolvedValue(false);

  const response = await POST(new Request('http://localhost/api/tenants', { method: 'POST' }));

  expect(response.status).toBe(401);
  expect(createTenantMock).not.toHaveBeenCalled();
});

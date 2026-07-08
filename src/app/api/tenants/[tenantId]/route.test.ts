import { beforeEach, expect, test, vi } from 'vitest';
import { parseRequest } from '@/lib/request';
import { canUpdateTenant } from '@/permissions/tenant';
import { getTenant, updateTenant } from '@/queries/prisma/tenant';
import { POST } from './route';

vi.mock('@/lib/request', () => ({
  parseRequest: vi.fn(),
}));

vi.mock('@/permissions/tenant', () => ({
  canUpdateTenant: vi.fn(),
}));

vi.mock('@/queries/prisma/tenant', () => ({
  getTenant: vi.fn(),
  updateTenant: vi.fn(),
}));

const parseRequestMock = vi.mocked(parseRequest);
const canUpdateTenantMock = vi.mocked(canUpdateTenant);
const getTenantMock = vi.mocked(getTenant);
const updateTenantMock = vi.mocked(updateTenant);

beforeEach(() => {
  parseRequestMock.mockReset();
  canUpdateTenantMock.mockReset();
  getTenantMock.mockReset();
  updateTenantMock.mockReset();
});

test('POST rejects tenant admins changing billing-controlled plan fields', async () => {
  parseRequestMock.mockResolvedValue({
    auth: {
      user: {
        id: 'tenant-admin',
        isAdmin: false,
      },
    },
    body: {
      plan: 'enterprise',
    },
    error: undefined,
  });
  canUpdateTenantMock.mockResolvedValue(true);

  const response = await POST(new Request('http://localhost/api/tenants/tenant-1', { method: 'POST' }), {
    params: Promise.resolve({ tenantId: 'tenant-1' }),
  });

  expect(response.status).toBe(401);
  expect(getTenantMock).not.toHaveBeenCalled();
  expect(updateTenantMock).not.toHaveBeenCalled();
});

test('POST allows global admins to change plan fields', async () => {
  parseRequestMock.mockResolvedValue({
    auth: {
      user: {
        id: 'admin',
        isAdmin: true,
      },
    },
    body: {
      plan: 'enterprise',
    },
    error: undefined,
  });
  canUpdateTenantMock.mockResolvedValue(true);
  getTenantMock.mockResolvedValue({ id: 'tenant-1' } as any);
  updateTenantMock.mockResolvedValue({ id: 'tenant-1', plan: 'enterprise' } as any);

  const response = await POST(new Request('http://localhost/api/tenants/tenant-1', { method: 'POST' }), {
    params: Promise.resolve({ tenantId: 'tenant-1' }),
  });

  expect(response.status).toBe(200);
  expect(updateTenantMock).toHaveBeenCalledWith('tenant-1', { plan: 'enterprise' });
});

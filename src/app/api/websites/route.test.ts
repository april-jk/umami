import { beforeEach, expect, test, vi } from 'vitest';
import { parseRequest } from '@/lib/request';
import { canCreateWebsite } from '@/permissions';
import { createWebsite } from '@/queries/prisma';
import { getDefaultTenantIdForUser } from '@/queries/prisma/tenant';
import { POST } from './route';

vi.mock('@/lib/load', () => ({
  fetchAccount: vi.fn(),
  fetchTeam: vi.fn(),
}));

vi.mock('@/lib/request', () => ({
  parseRequest: vi.fn(),
  getQueryFilters: vi.fn().mockResolvedValue({}),
}));

vi.mock('@/permissions', () => ({
  canCreateTeamWebsite: vi.fn(),
  canCreateWebsite: vi.fn(),
}));

vi.mock('@/queries/prisma', () => ({
  createShare: vi.fn(),
  createWebsite: vi.fn(),
  getTeamWebsiteCount: vi.fn(),
  getWebsiteCount: vi.fn(),
}));

vi.mock('@/queries/prisma/tenant', () => ({
  getDefaultTenantIdForUser: vi.fn(),
  getTenantIdForTeam: vi.fn(),
}));

vi.mock('@/queries/prisma/website', () => ({
  getAllUserWebsitesIncludingTeamAccess: vi.fn(),
  getUserWebsites: vi.fn(),
}));

const parseRequestMock = vi.mocked(parseRequest);
const canCreateWebsiteMock = vi.mocked(canCreateWebsite);
const createWebsiteMock = vi.mocked(createWebsite);
const getDefaultTenantIdForUserMock = vi.mocked(getDefaultTenantIdForUser);

beforeEach(() => {
  parseRequestMock.mockReset();
  canCreateWebsiteMock.mockReset();
  createWebsiteMock.mockReset();
  getDefaultTenantIdForUserMock.mockReset();
});

test('POST creates personal websites inside the authenticated user tenant', async () => {
  parseRequestMock.mockResolvedValue({
    auth: { user: { id: 'user-1' } },
    body: {
      name: 'Example',
      domain: 'example.com',
    },
    error: undefined,
  });
  canCreateWebsiteMock.mockResolvedValue(true);
  getDefaultTenantIdForUserMock.mockResolvedValue('tenant-1');
  createWebsiteMock.mockResolvedValue({
    id: 'website-1',
    name: 'Example',
    domain: 'example.com',
  } as any);

  const response = await POST(new Request('http://localhost/api/websites', { method: 'POST' }));
  const body = await response.json();

  expect(response.status).toBe(200);
  expect(getDefaultTenantIdForUserMock).toHaveBeenCalledWith('user-1');
  expect(createWebsiteMock).toHaveBeenCalledWith(
    expect.objectContaining({
      createdBy: 'user-1',
      userId: 'user-1',
      tenantId: 'tenant-1',
      name: 'Example',
      domain: 'example.com',
    }),
  );
  expect(body.shareId).toBeNull();
});

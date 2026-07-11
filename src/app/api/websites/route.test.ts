import { beforeEach, expect, test, vi } from 'vitest';
import { parseRequest } from '@/lib/request';
import { canCreateWebsite } from '@/permissions';
import { createWebsite } from '@/queries/prisma';
import {
  canCreateTenantWebsite,
  getDefaultTenantIdForUser,
  getTenantPlan,
  getTenantWebsiteCount,
} from '@/queries/prisma/tenant';
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
  canCreateTenantWebsite: vi.fn(),
  getDefaultTenantIdForUser: vi.fn(),
  getTenantIdForTeam: vi.fn(),
  getTenantPlan: vi.fn(),
  getTenantWebsiteCount: vi.fn(),
}));

vi.mock('@/queries/prisma/website', () => ({
  getAllUserWebsitesIncludingTeamAccess: vi.fn(),
  getUserWebsites: vi.fn(),
}));

const parseRequestMock = vi.mocked(parseRequest);
const canCreateWebsiteMock = vi.mocked(canCreateWebsite);
const createWebsiteMock = vi.mocked(createWebsite);
const getDefaultTenantIdForUserMock = vi.mocked(getDefaultTenantIdForUser);
const canCreateTenantWebsiteMock = vi.mocked(canCreateTenantWebsite);
const getTenantPlanMock = vi.mocked(getTenantPlan);
const getTenantWebsiteCountMock = vi.mocked(getTenantWebsiteCount);

beforeEach(() => {
  delete process.env.CLOUD_MODE;
  parseRequestMock.mockReset();
  canCreateWebsiteMock.mockReset();
  createWebsiteMock.mockReset();
  getDefaultTenantIdForUserMock.mockReset();
  canCreateTenantWebsiteMock.mockReset();
  getTenantPlanMock.mockReset();
  getTenantWebsiteCountMock.mockReset();
});

test('POST creates personal websites inside the authenticated user tenant', async () => {
  process.env.CLOUD_MODE = '1';
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
  canCreateTenantWebsiteMock.mockResolvedValue(true);
  createWebsiteMock.mockResolvedValue({
    id: 'website-1',
    name: 'Example',
    domain: 'example.com',
  } as any);

  const response = await POST(new Request('http://localhost/api/websites', { method: 'POST' }));
  const body = await response.json();

  expect(response.status).toBe(200);
  expect(getDefaultTenantIdForUserMock).toHaveBeenCalledWith('user-1');
  expect(canCreateTenantWebsiteMock).toHaveBeenCalledWith('tenant-1');
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
  delete process.env.CLOUD_MODE;
});

test('POST blocks a website when the tenant plan limit is exhausted', async () => {
  process.env.CLOUD_MODE = '1';
  parseRequestMock.mockResolvedValue({
    auth: { user: { id: 'user-1' } },
    body: { name: 'Example', domain: 'example.com' },
    error: undefined,
  });
  getDefaultTenantIdForUserMock.mockResolvedValue('tenant-1');
  canCreateTenantWebsiteMock.mockResolvedValue(false);
  getTenantPlanMock.mockResolvedValue({ plan: 'free' });
  getTenantWebsiteCountMock.mockResolvedValue(5);

  const response = await POST(new Request('http://localhost/api/websites', { method: 'POST' }));
  const body = await response.json();

  expect(response.status).toBe(403);
  expect(body.error.code).toBe('website-limit-reached');
  expect(body.error.current).toBe(5);
  expect(body.error.limit).toBe(5);
  expect(body.error.upgradeMessage).toContain('Starter');
  expect(createWebsiteMock).not.toHaveBeenCalled();
  delete process.env.CLOUD_MODE;
});

test('POST returns starter upgrade message for free plan', async () => {
  process.env.CLOUD_MODE = '1';
  parseRequestMock.mockResolvedValue({
    auth: { user: { id: 'user-1' } },
    body: { name: 'Example', domain: 'example.com' },
    error: undefined,
  });
  getDefaultTenantIdForUserMock.mockResolvedValue('tenant-1');
  canCreateTenantWebsiteMock.mockResolvedValue(false);
  getTenantPlanMock.mockResolvedValue({ plan: 'free' });
  getTenantWebsiteCountMock.mockResolvedValue(5);

  const response = await POST(new Request('http://localhost/api/websites', { method: 'POST' }));
  const body = await response.json();

  expect(response.status).toBe(403);
  expect(body.error.upgradeMessage).toContain('Starter');
  expect(body.error.upgradeMessage).toContain('10');
  delete process.env.CLOUD_MODE;
});

test('POST returns pro upgrade message for starter plan', async () => {
  process.env.CLOUD_MODE = '1';
  parseRequestMock.mockResolvedValue({
    auth: { user: { id: 'user-1' } },
    body: { name: 'Example', domain: 'example.com' },
    error: undefined,
  });
  getDefaultTenantIdForUserMock.mockResolvedValue('tenant-1');
  canCreateTenantWebsiteMock.mockResolvedValue(false);
  getTenantPlanMock.mockResolvedValue({ plan: 'starter' });
  getTenantWebsiteCountMock.mockResolvedValue(10);

  const response = await POST(new Request('http://localhost/api/websites', { method: 'POST' }));
  const body = await response.json();

  expect(response.status).toBe(403);
  expect(body.error.upgradeMessage).toContain('Pro');
  expect(body.error.upgradeMessage).toContain('25');
  delete process.env.CLOUD_MODE;
});

test('POST returns team upgrade message for pro plan', async () => {
  process.env.CLOUD_MODE = '1';
  parseRequestMock.mockResolvedValue({
    auth: { user: { id: 'user-1' } },
    body: { name: 'Example', domain: 'example.com' },
    error: undefined,
  });
  getDefaultTenantIdForUserMock.mockResolvedValue('tenant-1');
  canCreateTenantWebsiteMock.mockResolvedValue(false);
  getTenantPlanMock.mockResolvedValue({ plan: 'pro' });
  getTenantWebsiteCountMock.mockResolvedValue(25);

  const response = await POST(new Request('http://localhost/api/websites', { method: 'POST' }));
  const body = await response.json();

  expect(response.status).toBe(403);
  expect(body.error.upgradeMessage).toContain('Team');
  expect(body.error.upgradeMessage).toContain('50');
  delete process.env.CLOUD_MODE;
});

test('POST returns enterprise upgrade message for team plan', async () => {
  process.env.CLOUD_MODE = '1';
  parseRequestMock.mockResolvedValue({
    auth: { user: { id: 'user-1' } },
    body: { name: 'Example', domain: 'example.com' },
    error: undefined,
  });
  getDefaultTenantIdForUserMock.mockResolvedValue('tenant-1');
  canCreateTenantWebsiteMock.mockResolvedValue(false);
  getTenantPlanMock.mockResolvedValue({ plan: 'team' });
  getTenantWebsiteCountMock.mockResolvedValue(50);

  const response = await POST(new Request('http://localhost/api/websites', { method: 'POST' }));
  const body = await response.json();

  expect(response.status).toBe(403);
  expect(body.error.upgradeMessage).toContain('Enterprise');
  expect(body.error.upgradeMessage).toContain('unlimited');
  delete process.env.CLOUD_MODE;
});

test('POST returns contact sales for enterprise plan', async () => {
  process.env.CLOUD_MODE = '1';
  parseRequestMock.mockResolvedValue({
    auth: { user: { id: 'user-1' } },
    body: { name: 'Example', domain: 'example.com' },
    error: undefined,
  });
  getDefaultTenantIdForUserMock.mockResolvedValue('tenant-1');
  canCreateTenantWebsiteMock.mockResolvedValue(false);
  getTenantPlanMock.mockResolvedValue({ plan: 'enterprise' });
  getTenantWebsiteCountMock.mockResolvedValue(100);

  const response = await POST(new Request('http://localhost/api/websites', { method: 'POST' }));
  const body = await response.json();

  expect(response.status).toBe(403);
  expect(body.error.upgradeMessage).toBe('Contact sales for custom limits.');
  delete process.env.CLOUD_MODE;
});

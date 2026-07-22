import { beforeEach, expect, test, vi } from 'vitest';
import { fetchAccount } from '@/lib/load';
import { createDefaultMembershipConfig } from '@/lib/membership-config';
import { getQueryFilters, parseRequest } from '@/lib/request';
import { canCreateTeamWebsite, canCreateWebsite } from '@/permissions';
import { createShare, createWebsite, getWebsiteCount } from '@/queries/prisma';
import { getMembershipConfig } from '@/queries/prisma/membership-config';
import {
  canCreateTenantWebsite,
  getDefaultTenantIdForUser,
  getTenantIdForTeam,
  getTenantPlan,
  getTenantWebsiteCount,
} from '@/queries/prisma/tenant';
import { getAllUserWebsitesIncludingTeamAccess, getUserWebsites } from '@/queries/prisma/website';
import { GET, POST } from './route';

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
vi.mock('@/queries/prisma/membership-config', () => ({ getMembershipConfig: vi.fn() }));

const parseRequestMock = vi.mocked(parseRequest);
const getQueryFiltersMock = vi.mocked(getQueryFilters);
const fetchAccountMock = vi.mocked(fetchAccount);
const canCreateWebsiteMock = vi.mocked(canCreateWebsite);
const canCreateTeamWebsiteMock = vi.mocked(canCreateTeamWebsite);
const createWebsiteMock = vi.mocked(createWebsite);
const createShareMock = vi.mocked(createShare);
const getWebsiteCountMock = vi.mocked(getWebsiteCount);
const getDefaultTenantIdForUserMock = vi.mocked(getDefaultTenantIdForUser);
const getTenantIdForTeamMock = vi.mocked(getTenantIdForTeam);
const canCreateTenantWebsiteMock = vi.mocked(canCreateTenantWebsite);
const getTenantPlanMock = vi.mocked(getTenantPlan);
const getTenantWebsiteCountMock = vi.mocked(getTenantWebsiteCount);
const getAllUserWebsitesIncludingTeamAccessMock = vi.mocked(getAllUserWebsitesIncludingTeamAccess);
const getUserWebsitesMock = vi.mocked(getUserWebsites);

beforeEach(() => {
  delete process.env.CLOUD_MODE;
  parseRequestMock.mockReset();
  getQueryFiltersMock.mockResolvedValue({});
  fetchAccountMock.mockReset();
  canCreateWebsiteMock.mockReset();
  canCreateTeamWebsiteMock.mockReset();
  createWebsiteMock.mockReset();
  createShareMock.mockReset();
  getWebsiteCountMock.mockReset();
  getDefaultTenantIdForUserMock.mockReset();
  getTenantIdForTeamMock.mockReset();
  canCreateTenantWebsiteMock.mockReset();
  getTenantPlanMock.mockReset();
  getTenantWebsiteCountMock.mockReset();
  getAllUserWebsitesIncludingTeamAccessMock.mockReset();
  getUserWebsitesMock.mockReset();
  vi.mocked(getMembershipConfig).mockResolvedValue(createDefaultMembershipConfig());
});

test('GET returns request parsing errors', async () => {
  parseRequestMock.mockResolvedValue({ error: () => new Response(null, { status: 400 }) } as any);

  expect((await GET(new Request('http://localhost/api/websites'))).status).toBe(400);
});

test('GET returns personal websites by default', async () => {
  parseRequestMock.mockResolvedValue({
    auth: { user: { id: 'user-1' } },
    query: {},
    error: undefined,
  } as any);
  getUserWebsitesMock.mockResolvedValue({ data: [], count: 0 } as any);

  expect((await GET(new Request('http://localhost/api/websites'))).status).toBe(200);
  expect(getUserWebsitesMock).toHaveBeenCalledWith('user-1', {});
});

test('GET includes team-access websites when requested', async () => {
  parseRequestMock.mockResolvedValue({
    auth: { user: { id: 'user-1' } },
    query: { includeTeams: '1' },
    error: undefined,
  } as any);
  getAllUserWebsitesIncludingTeamAccessMock.mockResolvedValue({ data: [], count: 0 } as any);

  expect((await GET(new Request('http://localhost/api/websites'))).status).toBe(200);
  expect(getAllUserWebsitesIncludingTeamAccessMock).toHaveBeenCalledWith('user-1', {});
});

test('POST returns request parsing errors', async () => {
  parseRequestMock.mockResolvedValue({ error: () => new Response(null, { status: 400 }) } as any);

  expect(
    (await POST(new Request('http://localhost/api/websites', { method: 'POST' }))).status,
  ).toBe(400);
});

test('POST creates a tenant team website and share', async () => {
  process.env.CLOUD_MODE = '1';
  parseRequestMock.mockResolvedValue({
    auth: { user: { id: 'user-1' } },
    body: {
      name: 'Team site',
      domain: 'team.example.com',
      teamId: 'team-1',
      shareId: 'public-site',
    },
    error: undefined,
  } as any);
  getTenantIdForTeamMock.mockResolvedValue('tenant-1');
  canCreateTenantWebsiteMock.mockResolvedValue(true);
  canCreateTeamWebsiteMock.mockResolvedValue(true);
  canCreateWebsiteMock.mockResolvedValue(true);
  createWebsiteMock.mockResolvedValue({ id: 'website-1', name: 'Team site' } as any);
  createShareMock.mockResolvedValue({ slug: 'public-site' } as any);

  const response = await POST(new Request('http://localhost/api/websites', { method: 'POST' }));
  expect(response.status).toBe(200);
  expect(createWebsiteMock).toHaveBeenCalledWith(
    expect.objectContaining({ teamId: 'team-1', tenantId: 'tenant-1' }),
  );
  expect((await response.json()).shareId).toBe('public-site');
});

test('POST blocks a legacy cloud account at its website limit', async () => {
  process.env.CLOUD_MODE = '1';
  parseRequestMock.mockResolvedValue({
    auth: { user: { id: 'user-1' } },
    body: { name: 'Legacy', domain: 'legacy.example.com' },
    error: undefined,
  } as any);
  getDefaultTenantIdForUserMock.mockResolvedValue(null);
  fetchAccountMock.mockResolvedValue({ websiteLimit: 1 } as any);
  getWebsiteCountMock.mockResolvedValue(1);

  expect(
    (await POST(new Request('http://localhost/api/websites', { method: 'POST' }))).status,
  ).toBe(401);
  expect(createWebsiteMock).not.toHaveBeenCalled();
});

test('POST rejects callers without website creation permission', async () => {
  parseRequestMock.mockResolvedValue({
    auth: { user: { id: 'user-1' } },
    body: { name: 'Denied', domain: 'denied.example.com' },
    error: undefined,
  } as any);
  getDefaultTenantIdForUserMock.mockResolvedValue(null);
  canCreateWebsiteMock.mockResolvedValue(false);

  expect(
    (await POST(new Request('http://localhost/api/websites', { method: 'POST' }))).status,
  ).toBe(401);
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
      creationSource: 'web',
      userId: 'user-1',
      tenantId: 'tenant-1',
      name: 'Example',
      domain: 'example.com',
    }),
  );
  expect(body.shareId).toBeNull();
  delete process.env.CLOUD_MODE;
});

test.each([
  [{ apiKeyId: 'mcp-key', apiKeyClientType: 'mcp' }, 'mcp'],
  [{ apiKeyId: 'api-key', apiKeyClientType: null }, 'api'],
])('POST records the authenticated API creation source', async (authFields, creationSource) => {
  parseRequestMock.mockResolvedValue({
    auth: { user: { id: 'user-1' }, ...authFields },
    body: { name: 'API site', domain: 'api.example.com' },
    error: undefined,
  } as any);
  getDefaultTenantIdForUserMock.mockResolvedValue(null);
  canCreateWebsiteMock.mockResolvedValue(true);
  createWebsiteMock.mockResolvedValue({ id: 'website-1', name: 'API site' } as any);

  const response = await POST(new Request('http://localhost/api/websites', { method: 'POST' }));

  expect(response.status).toBe(200);
  expect(createWebsiteMock).toHaveBeenCalledWith(expect.objectContaining({ creationSource }));
});

test('POST recognizes an MCP client using a legacy API key', async () => {
  parseRequestMock.mockResolvedValue({
    auth: { user: { id: 'user-1' }, apiKeyId: 'legacy-key', apiKeyClientType: null },
    body: { name: 'Legacy MCP site', domain: 'legacy-mcp.example.com' },
    error: undefined,
  } as any);
  getDefaultTenantIdForUserMock.mockResolvedValue(null);
  canCreateWebsiteMock.mockResolvedValue(true);
  createWebsiteMock.mockResolvedValue({ id: 'website-1', name: 'Legacy MCP site' } as any);

  const response = await POST(
    new Request('http://localhost/api/websites', {
      method: 'POST',
      headers: { 'x-amami-mcp-client': 'amami-analytics-mcp/0.1.5' },
    }),
  );

  expect(response.status).toBe(200);
  expect(createWebsiteMock).toHaveBeenCalledWith(
    expect.objectContaining({ creationSource: 'mcp' }),
  );
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
  expect(body.error).toMatchObject({
    type: 'plan-limit',
    resource: 'website',
    currentPlan: 'free',
    recommendedPlan: 'starter',
    upgradeUrl: '/membership/upgrade?reason=website',
  });
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

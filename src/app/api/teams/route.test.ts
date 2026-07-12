import { beforeEach, expect, test, vi } from 'vitest';
import { fetchAccount } from '@/lib/load';
import redis from '@/lib/redis';
import { getQueryFilters, parseRequest } from '@/lib/request';
import { canCreateTeam } from '@/permissions';
import { createTeam, getUserTeams } from '@/queries/prisma';
import {
  getDefaultTenantIdForUser,
  getTenantPlan,
  getTotalTenantMemberCount,
} from '@/queries/prisma/tenant';
import { GET, POST } from './route';

vi.mock('@/lib/load', () => ({
  fetchAccount: vi.fn(),
}));

vi.mock('@/lib/redis', () => ({
  default: {
    enabled: false,
    client: {
      set: vi.fn(),
    },
  },
}));

vi.mock('@/lib/request', () => ({
  parseRequest: vi.fn(),
  getQueryFilters: vi.fn().mockResolvedValue({}),
}));

vi.mock('@/permissions', () => ({
  canCreateTeam: vi.fn(),
}));

vi.mock('@/queries/prisma', () => ({
  createTeam: vi.fn(),
  getUserTeams: vi.fn(),
}));

vi.mock('@/queries/prisma/tenant', () => ({
  getDefaultTenantIdForUser: vi.fn(),
  getTenantPlan: vi.fn(),
  getTotalTenantMemberCount: vi.fn(),
}));

const parseRequestMock = vi.mocked(parseRequest);
const getQueryFiltersMock = vi.mocked(getQueryFilters);
const fetchAccountMock = vi.mocked(fetchAccount);
const canCreateTeamMock = vi.mocked(canCreateTeam);
const createTeamMock = vi.mocked(createTeam);
const getUserTeamsMock = vi.mocked(getUserTeams);
const getDefaultTenantIdForUserMock = vi.mocked(getDefaultTenantIdForUser);
const getTenantPlanMock = vi.mocked(getTenantPlan);
const getTotalTenantMemberCountMock = vi.mocked(getTotalTenantMemberCount);

beforeEach(() => {
  delete process.env.CLOUD_MODE;
  delete process.env.MEMBERSHIP_ENABLED;
  parseRequestMock.mockReset();
  getQueryFiltersMock.mockResolvedValue({});
  fetchAccountMock.mockReset();
  canCreateTeamMock.mockReset();
  createTeamMock.mockReset();
  getUserTeamsMock.mockReset();
  getDefaultTenantIdForUserMock.mockReset();
  getTenantPlanMock.mockReset();
  getTotalTenantMemberCountMock.mockReset();
  redis.enabled = false;
});

test('GET returns request parsing errors', async () => {
  parseRequestMock.mockResolvedValue({ error: () => new Response(null, { status: 400 }) } as any);

  expect((await GET(new Request('http://localhost/api/teams'))).status).toBe(400);
});

test('GET returns the authenticated users teams', async () => {
  parseRequestMock.mockResolvedValue({
    auth: { user: { id: 'user-1' } },
    query: {},
    error: undefined,
  } as any);
  getUserTeamsMock.mockResolvedValue({ data: [], count: 0 } as any);

  expect((await GET(new Request('http://localhost/api/teams'))).status).toBe(200);
  expect(getUserTeamsMock).toHaveBeenCalledWith('user-1', {});
});

test('POST returns request parsing errors', async () => {
  parseRequestMock.mockResolvedValue({ error: () => new Response(null, { status: 400 }) } as any);

  expect((await POST(new Request('http://localhost/api/teams', { method: 'POST' }))).status).toBe(
    400,
  );
});

test('POST rejects users without team creation permission', async () => {
  parseRequestMock.mockResolvedValue({
    auth: { user: { id: 'user-1', isAdmin: false } },
    body: { name: 'Denied' },
    error: undefined,
  } as any);
  canCreateTeamMock.mockResolvedValue(false);

  expect((await POST(new Request('http://localhost/api/teams', { method: 'POST' }))).status).toBe(
    401,
  );
});

test('POST lets an administrator create a team for another owner and caches legacy billing', async () => {
  process.env.CLOUD_MODE = '1';
  redis.enabled = true;
  parseRequestMock.mockResolvedValue({
    auth: { user: { id: 'admin-1', isAdmin: true } },
    body: { name: 'Managed team', ownerId: 'user-2' },
    error: undefined,
  } as any);
  canCreateTeamMock.mockResolvedValue(true);
  getDefaultTenantIdForUserMock.mockResolvedValue(null);
  createTeamMock.mockResolvedValue([{ id: 'team-1' }] as any);
  fetchAccountMock.mockResolvedValue({ isPro: true, hasSubscription: true } as any);

  expect((await POST(new Request('http://localhost/api/teams', { method: 'POST' }))).status).toBe(
    200,
  );
  expect(getDefaultTenantIdForUserMock).toHaveBeenCalledWith('user-2');
  expect(createTeamMock).toHaveBeenCalledWith(expect.any(Object), 'user-2');
  expect(redis.client.set).toHaveBeenCalled();
});

test('POST blocks creating another team when it would exceed member capacity', async () => {
  process.env.CLOUD_MODE = '1';
  parseRequestMock.mockResolvedValue({
    auth: { user: { id: 'user-1', isAdmin: false } },
    body: { name: 'Another team' },
    error: undefined,
  });
  canCreateTeamMock.mockResolvedValue(true);
  getDefaultTenantIdForUserMock.mockResolvedValue('tenant-1');
  getTenantPlanMock.mockResolvedValue({ plan: 'free' });
  getTotalTenantMemberCountMock.mockResolvedValue(1);

  const response = await POST(new Request('http://localhost/api/teams', { method: 'POST' }));
  const body = await response.json();

  expect(response.status).toBe(403);
  expect(body.error).toMatchObject({
    type: 'plan-limit',
    code: 'member-limit-reached',
    resource: 'member',
    currentPlan: 'free',
    recommendedPlan: 'pro',
  });
  expect(createTeamMock).not.toHaveBeenCalled();
});

test('POST enforces member capacity when memberships are enabled outside cloud mode', async () => {
  process.env.MEMBERSHIP_ENABLED = '1';
  parseRequestMock.mockResolvedValue({
    auth: { user: { id: 'user-1', isAdmin: false } },
    body: { name: 'Another team' },
    error: undefined,
  });
  canCreateTeamMock.mockResolvedValue(true);
  getDefaultTenantIdForUserMock.mockResolvedValue('tenant-1');
  getTenantPlanMock.mockResolvedValue({ plan: 'free' });
  getTotalTenantMemberCountMock.mockResolvedValue(1);

  const response = await POST(new Request('http://localhost/api/teams', { method: 'POST' }));
  const body = await response.json();

  expect(response.status).toBe(403);
  expect(body.error).toMatchObject({
    type: 'plan-limit',
    code: 'member-limit-reached',
    currentPlan: 'free',
    recommendedPlan: 'pro',
  });
  expect(createTeamMock).not.toHaveBeenCalled();
});

test('POST does not enforce member capacity outside cloud mode', async () => {
  parseRequestMock.mockResolvedValue({
    auth: { user: { id: 'user-1', isAdmin: false } },
    body: { name: 'Self hosted team' },
    error: undefined,
  });
  canCreateTeamMock.mockResolvedValue(true);
  getDefaultTenantIdForUserMock.mockResolvedValue('tenant-1');
  createTeamMock.mockResolvedValue([{ id: 'team-1' }] as any);

  expect((await POST(new Request('http://localhost/api/teams', { method: 'POST' }))).status).toBe(
    200,
  );
  expect(getTenantPlanMock).not.toHaveBeenCalled();
});

test('POST creates teams inside the owner tenant', async () => {
  parseRequestMock.mockResolvedValue({
    auth: { user: { id: 'user-1', isAdmin: false } },
    body: {
      name: 'Product Analytics',
    },
    error: undefined,
  });
  canCreateTeamMock.mockResolvedValue(true);
  getDefaultTenantIdForUserMock.mockResolvedValue('tenant-1');
  createTeamMock.mockResolvedValue([{ id: 'team-1', tenantId: 'tenant-1' }] as any);

  const response = await POST(new Request('http://localhost/api/teams', { method: 'POST' }));

  expect(response.status).toBe(200);
  expect(getDefaultTenantIdForUserMock).toHaveBeenCalledWith('user-1');
  expect(createTeamMock).toHaveBeenCalledWith(
    expect.objectContaining({
      name: 'Product Analytics',
      tenantId: 'tenant-1',
    }),
    'user-1',
  );
});

import { beforeEach, describe, expect, test, vi } from 'vitest';
import { parseRequest } from '@/lib/request';
import { canUpdateTeam, canViewTeam } from '@/permissions';
import { createTeamUser, getTeamUser, getTeamUsers } from '@/queries/prisma';
import {
  canAddTeamMember,
  getTenantIdForTeam,
  getTenantPlan,
  getTotalTenantMemberCount,
} from '@/queries/prisma/tenant';
import { GET, POST } from './route';

vi.mock('@/lib/request', () => ({
  parseRequest: vi.fn(),
  getQueryFilters: vi.fn().mockResolvedValue({}),
}));

vi.mock('@/permissions', () => ({
  canUpdateTeam: vi.fn(),
  canViewTeam: vi.fn(),
}));

vi.mock('@/queries/prisma', () => ({
  createTeamUser: vi.fn(),
  getTeamUser: vi.fn(),
  getTeamUsers: vi.fn(),
}));

vi.mock('@/queries/prisma/tenant', () => ({
  canAddTeamMember: vi.fn(),
  getTotalTenantMemberCount: vi.fn(),
  getTenantIdForTeam: vi.fn(),
  getTenantPlan: vi.fn(),
}));

const parseRequestMock = vi.mocked(parseRequest);
const canViewTeamMock = vi.mocked(canViewTeam);
const canUpdateTeamMock = vi.mocked(canUpdateTeam);
const getTeamUsersMock = vi.mocked(getTeamUsers);
const createTeamUserMock = vi.mocked(createTeamUser);
const getTeamUserMock = vi.mocked(getTeamUser);
const canAddTeamMemberMock = vi.mocked(canAddTeamMember);
const getTenantIdForTeamMock = vi.mocked(getTenantIdForTeam);
const getTenantPlanMock = vi.mocked(getTenantPlan);
const getTotalTenantMemberCountMock = vi.mocked(getTotalTenantMemberCount);

beforeEach(() => {
  delete process.env.CLOUD_MODE;
  delete process.env.MEMBERSHIP_ENABLED;
  vi.clearAllMocks();
});

describe('GET', () => {
  test('returns a request parsing error', async () => {
    parseRequestMock.mockResolvedValue({ error: () => new Response(null, { status: 400 }) } as any);

    const response = await GET(new Request('http://localhost/api/teams/team-1/users'), {
      params: Promise.resolve({ teamId: 'team-1' }),
    });

    expect(response.status).toBe(400);
  });

  test('returns team users for authorized viewer', async () => {
    parseRequestMock.mockResolvedValue({
      auth: { user: { id: 'user-1' } },
      query: {},
      error: undefined,
    } as any);
    canViewTeamMock.mockResolvedValue(true);
    getTeamUsersMock.mockResolvedValue({
      data: [{ id: 'tu-1', user: { id: 'u-1', username: 'alice' } }],
      count: 1,
    } as any);

    const response = await GET(new Request('http://localhost/api/teams/team-1/users'), {
      params: Promise.resolve({ teamId: 'team-1' }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toHaveLength(1);
    expect(canViewTeamMock).toHaveBeenCalledWith(expect.anything(), 'team-1');
  });

  test('returns unauthorized for non-team member', async () => {
    parseRequestMock.mockResolvedValue({
      auth: { user: { id: 'user-1' } },
      query: {},
      error: undefined,
    } as any);
    canViewTeamMock.mockResolvedValue(false);

    const response = await GET(new Request('http://localhost/api/teams/team-1/users'), {
      params: Promise.resolve({ teamId: 'team-1' }),
    });
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error.message).toBe('You must be a member of this team.');
  });
});

describe('POST', () => {
  test('returns a request parsing error', async () => {
    parseRequestMock.mockResolvedValue({ error: () => new Response(null, { status: 400 }) } as any);

    const response = await POST(
      new Request('http://localhost/api/teams/team-1/users', { method: 'POST' }),
      { params: Promise.resolve({ teamId: 'team-1' }) },
    );

    expect(response.status).toBe(400);
  });

  test('adds a team member successfully', async () => {
    parseRequestMock.mockResolvedValue({
      auth: { user: { id: 'user-1' } },
      body: { userId: 'user-2', role: 'member' },
      error: undefined,
    } as any);
    canUpdateTeamMock.mockResolvedValue(true);
    getTeamUserMock.mockResolvedValue(null);
    createTeamUserMock.mockResolvedValue({ id: 'tu-1', userId: 'user-2', teamId: 'team-1' } as any);

    const response = await POST(
      new Request('http://localhost/api/teams/team-1/users', { method: 'POST' }),
      { params: Promise.resolve({ teamId: 'team-1' }) },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.userId).toBe('user-2');
    expect(createTeamUserMock).toHaveBeenCalledWith('user-2', 'team-1', 'member');
  });

  test('returns unauthorized for non-owner/manager', async () => {
    parseRequestMock.mockResolvedValue({
      auth: { user: { id: 'user-1' } },
      body: { userId: 'user-2', role: 'member' },
      error: undefined,
    } as any);
    canUpdateTeamMock.mockResolvedValue(false);

    const response = await POST(
      new Request('http://localhost/api/teams/team-1/users', { method: 'POST' }),
      { params: Promise.resolve({ teamId: 'team-1' }) },
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error.message).toBe('You must be the owner/manager of this team.');
  });

  test('returns bad request when user is already a member', async () => {
    parseRequestMock.mockResolvedValue({
      auth: { user: { id: 'user-1' } },
      body: { userId: 'user-2', role: 'member' },
      error: undefined,
    } as any);
    canUpdateTeamMock.mockResolvedValue(true);
    getTeamUserMock.mockResolvedValue({ id: 'tu-1' } as any);

    const response = await POST(
      new Request('http://localhost/api/teams/team-1/users', { method: 'POST' }),
      { params: Promise.resolve({ teamId: 'team-1' }) },
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.message).toBe('User is already a member of the Team.');
    expect(createTeamUserMock).not.toHaveBeenCalled();
  });

  test('blocks member addition when cloud mode limit is reached', async () => {
    process.env.CLOUD_MODE = '1';
    parseRequestMock.mockResolvedValue({
      auth: { user: { id: 'user-1' } },
      body: { userId: 'user-2', role: 'member' },
      error: undefined,
    } as any);
    canUpdateTeamMock.mockResolvedValue(true);
    getTeamUserMock.mockResolvedValue(null);
    canAddTeamMemberMock.mockResolvedValue(false);
    getTenantIdForTeamMock.mockResolvedValue('tenant-1');
    getTenantPlanMock.mockResolvedValue({ plan: 'pro' });
    getTotalTenantMemberCountMock.mockResolvedValue(5);

    const response = await POST(
      new Request('http://localhost/api/teams/team-1/users', { method: 'POST' }),
      { params: Promise.resolve({ teamId: 'team-1' }) },
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error.code).toBe('member-limit-reached');
    expect(body.error.current).toBe(5);
    expect(body.error.limit).toBe(5);
    expect(body.error.upgradeMessage).toContain('Upgrade to Team');
    expect(body.error).toMatchObject({
      type: 'plan-limit',
      resource: 'member',
      currentPlan: 'pro',
      recommendedPlan: 'team',
      upgradeUrl: '/membership/upgrade?reason=member',
    });
    expect(createTeamUserMock).not.toHaveBeenCalled();
    delete process.env.CLOUD_MODE;
  });

  test('allows member addition when cloud mode is off', async () => {
    parseRequestMock.mockResolvedValue({
      auth: { user: { id: 'user-1' } },
      body: { userId: 'user-2', role: 'member' },
      error: undefined,
    } as any);
    canUpdateTeamMock.mockResolvedValue(true);
    getTeamUserMock.mockResolvedValue(null);
    createTeamUserMock.mockResolvedValue({ id: 'tu-1' } as any);

    const response = await POST(
      new Request('http://localhost/api/teams/team-1/users', { method: 'POST' }),
      { params: Promise.resolve({ teamId: 'team-1' }) },
    );

    expect(response.status).toBe(200);
    expect(canAddTeamMemberMock).not.toHaveBeenCalled();
  });

  test('skips Starter when it would not increase the Free member limit', async () => {
    process.env.CLOUD_MODE = '1';
    parseRequestMock.mockResolvedValue({
      auth: { user: { id: 'user-1' } },
      body: { userId: 'user-2', role: 'member' },
      error: undefined,
    } as any);
    canUpdateTeamMock.mockResolvedValue(true);
    getTeamUserMock.mockResolvedValue(null);
    canAddTeamMemberMock.mockResolvedValue(false);
    getTenantIdForTeamMock.mockResolvedValue('tenant-1');
    getTenantPlanMock.mockResolvedValue({ plan: 'free' });
    getTotalTenantMemberCountMock.mockResolvedValue(1);

    const response = await POST(
      new Request('http://localhost/api/teams/team-1/users', { method: 'POST' }),
      { params: Promise.resolve({ teamId: 'team-1' }) },
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error.code).toBe('member-limit-reached');
    expect(body.error.current).toBe(1);
    expect(body.error.limit).toBe(1);
    expect(body.error.upgradeMessage).toContain('Pro');
    expect(body.error.upgradeMessage).toContain('5 members');
    expect(body.error.recommendedPlan).toBe('pro');
    delete process.env.CLOUD_MODE;
  });

  test('returns enterprise upgrade message for team plan', async () => {
    process.env.CLOUD_MODE = '1';
    parseRequestMock.mockResolvedValue({
      auth: { user: { id: 'user-1' } },
      body: { userId: 'user-2', role: 'member' },
      error: undefined,
    } as any);
    canUpdateTeamMock.mockResolvedValue(true);
    getTeamUserMock.mockResolvedValue(null);
    canAddTeamMemberMock.mockResolvedValue(false);
    getTenantIdForTeamMock.mockResolvedValue('tenant-1');
    getTenantPlanMock.mockResolvedValue({ plan: 'team' });
    getTotalTenantMemberCountMock.mockResolvedValue(20);

    const response = await POST(
      new Request('http://localhost/api/teams/team-1/users', { method: 'POST' }),
      { params: Promise.resolve({ teamId: 'team-1' }) },
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error.code).toBe('member-limit-reached');
    expect(body.error.upgradeMessage).toContain('Enterprise');
    expect(body.error.upgradeMessage).toContain('unlimited');
    delete process.env.CLOUD_MODE;
  });

  test('returns contact sales message for enterprise plan', async () => {
    process.env.CLOUD_MODE = '1';
    parseRequestMock.mockResolvedValue({
      auth: { user: { id: 'user-1' } },
      body: { userId: 'user-2', role: 'member' },
      error: undefined,
    } as any);
    canUpdateTeamMock.mockResolvedValue(true);
    getTeamUserMock.mockResolvedValue(null);
    canAddTeamMemberMock.mockResolvedValue(false);
    getTenantIdForTeamMock.mockResolvedValue('tenant-1');
    getTenantPlanMock.mockResolvedValue({ plan: 'enterprise' });
    getTotalTenantMemberCountMock.mockResolvedValue(100);

    const response = await POST(
      new Request('http://localhost/api/teams/team-1/users', { method: 'POST' }),
      { params: Promise.resolve({ teamId: 'team-1' }) },
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error.upgradeMessage).toBe('Contact sales for custom limits.');
    delete process.env.CLOUD_MODE;
  });

  test('handles team without tenant (non-cloud fallback)', async () => {
    process.env.CLOUD_MODE = '1';
    parseRequestMock.mockResolvedValue({
      auth: { user: { id: 'user-1' } },
      body: { userId: 'user-2', role: 'member' },
      error: undefined,
    } as any);
    canUpdateTeamMock.mockResolvedValue(true);
    getTeamUserMock.mockResolvedValue(null);
    canAddTeamMemberMock.mockResolvedValue(false);
    getTenantIdForTeamMock.mockResolvedValue(null);
    createTeamUserMock.mockResolvedValue({ id: 'tu-1' } as any);

    const response = await POST(
      new Request('http://localhost/api/teams/team-1/users', { method: 'POST' }),
      { params: Promise.resolve({ teamId: 'team-1' }) },
    );
    const body = await response.json();

    // When team has no tenant, canAddTeamMember returns true (allows), so this shouldn't happen
    // But if it somehow does, we should still return a sensible error
    expect(response.status).toBe(403);
    expect(body.error.code).toBe('member-limit-reached');
    expect(body.error.current).toBe(0);
    expect(body.error.limit).toBe(1); // defaults to free plan
    delete process.env.CLOUD_MODE;
  });
});

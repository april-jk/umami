import { beforeEach, describe, expect, test, vi } from 'vitest';
import { createDefaultMembershipConfig } from '@/lib/membership-config';
import { parseRequest } from '@/lib/request';
import { createTeamUser, findTeam, getTeamUser } from '@/queries/prisma';
import { getMembershipConfig } from '@/queries/prisma/membership-config';
import {
  canAddTeamMember,
  getTenantIdForTeam,
  getTenantPlan,
  getTotalTenantMemberCount,
} from '@/queries/prisma/tenant';
import { POST } from './route';

vi.mock('@/lib/request', () => ({ parseRequest: vi.fn() }));
vi.mock('@/queries/prisma', () => ({
  createTeamUser: vi.fn(),
  findTeam: vi.fn(),
  getTeamUser: vi.fn(),
}));
vi.mock('@/queries/prisma/tenant', () => ({
  canAddTeamMember: vi.fn(),
  getTenantIdForTeam: vi.fn(),
  getTenantPlan: vi.fn(),
  getTotalTenantMemberCount: vi.fn(),
}));
vi.mock('@/queries/prisma/membership-config', () => ({ getMembershipConfig: vi.fn() }));

const parseRequestMock = vi.mocked(parseRequest);
const findTeamMock = vi.mocked(findTeam);
const getTeamUserMock = vi.mocked(getTeamUser);
const createTeamUserMock = vi.mocked(createTeamUser);
const canAddTeamMemberMock = vi.mocked(canAddTeamMember);

beforeEach(() => {
  delete process.env.CLOUD_MODE;
  delete process.env.MEMBERSHIP_ENABLED;
  vi.clearAllMocks();
  vi.mocked(getMembershipConfig).mockResolvedValue(createDefaultMembershipConfig());
  parseRequestMock.mockResolvedValue({
    auth: { user: { id: 'user-1' } },
    body: { accessCode: 'team_code' },
    error: undefined,
  });
  findTeamMock.mockResolvedValue({ id: 'team-1' } as any);
  getTeamUserMock.mockResolvedValue(null);
  canAddTeamMemberMock.mockResolvedValue(true);
  createTeamUserMock.mockResolvedValue({ id: 'team-user-1' } as any);
});

describe('POST', () => {
  test('returns request parsing errors', async () => {
    parseRequestMock.mockResolvedValue({ error: () => new Response(null, { status: 400 }) });
    expect((await POST(new Request('http://localhost', { method: 'POST' }))).status).toBe(400);
  });

  test('returns not found for an unknown access code', async () => {
    findTeamMock.mockResolvedValue(null);
    const response = await POST(new Request('http://localhost', { method: 'POST' }));
    expect(response.status).toBe(404);
    expect((await response.json()).error.code).toBe('team-not-found');
  });

  test('rejects users who already belong to the team', async () => {
    getTeamUserMock.mockResolvedValue({ id: 'existing' } as any);
    expect((await POST(new Request('http://localhost', { method: 'POST' }))).status).toBe(400);
    expect(createTeamUserMock).not.toHaveBeenCalled();
  });

  test('blocks joining when cloud member capacity is exhausted', async () => {
    process.env.CLOUD_MODE = '1';
    canAddTeamMemberMock.mockResolvedValue(false);
    vi.mocked(getTenantIdForTeam).mockResolvedValue('tenant-1');
    vi.mocked(getTenantPlan).mockResolvedValue({ plan: 'pro' });
    vi.mocked(getTotalTenantMemberCount).mockResolvedValue(5);

    const response = await POST(new Request('http://localhost', { method: 'POST' }));
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error).toMatchObject({
      type: 'plan-limit',
      code: 'member-limit-reached',
      current: 5,
      limit: 5,
      currentPlan: 'pro',
      recommendedPlan: 'team',
    });
    expect(createTeamUserMock).not.toHaveBeenCalled();
  });

  test('joins a team when capacity is available', async () => {
    process.env.CLOUD_MODE = '1';
    const response = await POST(new Request('http://localhost', { method: 'POST' }));
    expect(response.status).toBe(200);
    expect(createTeamUserMock).toHaveBeenCalledWith('user-1', 'team-1', 'team-member');
  });

  test('does not check capacity outside cloud mode', async () => {
    expect((await POST(new Request('http://localhost', { method: 'POST' }))).status).toBe(200);
    expect(canAddTeamMemberMock).not.toHaveBeenCalled();
  });
});

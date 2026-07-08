import { beforeEach, expect, test, vi } from 'vitest';
import { parseRequest } from '@/lib/request';
import { canCreateTeam } from '@/permissions';
import { createTeam } from '@/queries/prisma';
import { getDefaultTenantIdForUser } from '@/queries/prisma/tenant';
import { POST } from './route';

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
}));

const parseRequestMock = vi.mocked(parseRequest);
const canCreateTeamMock = vi.mocked(canCreateTeam);
const createTeamMock = vi.mocked(createTeam);
const getDefaultTenantIdForUserMock = vi.mocked(getDefaultTenantIdForUser);

beforeEach(() => {
  parseRequestMock.mockReset();
  canCreateTeamMock.mockReset();
  createTeamMock.mockReset();
  getDefaultTenantIdForUserMock.mockReset();
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

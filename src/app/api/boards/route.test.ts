import { beforeEach, expect, test, vi } from 'vitest';
import { getQueryFilters, parseRequest } from '@/lib/request';
import { canCreateTeamWebsite, canCreateWebsite, canViewBoardEntities } from '@/permissions';
import { createBoard, getAllUserBoardsIncludingTeamAccess, getUserBoards } from '@/queries/prisma';
import { getDefaultTenantIdForUser } from '@/queries/prisma/tenant';
import { GET, POST } from './route';

vi.mock('@/lib/request', () => ({
  parseRequest: vi.fn(),
  getQueryFilters: vi.fn().mockResolvedValue({}),
}));

vi.mock('@/permissions', () => ({
  canCreateTeamWebsite: vi.fn(),
  canCreateWebsite: vi.fn(),
  canViewBoardEntities: vi.fn(),
}));

vi.mock('@/queries/prisma', () => ({
  createBoard: vi.fn(),
  getAllUserBoardsIncludingTeamAccess: vi.fn(),
  getUserBoards: vi.fn(),
}));

vi.mock('@/queries/prisma/tenant', () => ({
  getDefaultTenantIdForUser: vi.fn(),
  getTenantIdForTeam: vi.fn(),
}));

const parseRequestMock = vi.mocked(parseRequest);
const getQueryFiltersMock = vi.mocked(getQueryFilters);
const canCreateTeamWebsiteMock = vi.mocked(canCreateTeamWebsite);
const canCreateWebsiteMock = vi.mocked(canCreateWebsite);
const canViewBoardEntitiesMock = vi.mocked(canViewBoardEntities);
const createBoardMock = vi.mocked(createBoard);
const getAllUserBoardsIncludingTeamAccessMock = vi.mocked(getAllUserBoardsIncludingTeamAccess);
const getUserBoardsMock = vi.mocked(getUserBoards);
const getDefaultTenantIdForUserMock = vi.mocked(getDefaultTenantIdForUser);

beforeEach(() => {
  parseRequestMock.mockReset();
  getQueryFiltersMock.mockReset();
  canCreateTeamWebsiteMock.mockReset();
  canCreateWebsiteMock.mockReset();
  canViewBoardEntitiesMock.mockReset();
  createBoardMock.mockReset();
  getAllUserBoardsIncludingTeamAccessMock.mockReset();
  getUserBoardsMock.mockReset();
  getDefaultTenantIdForUserMock.mockReset();
});

test('GET returns only the authenticated user boards by default', async () => {
  parseRequestMock.mockResolvedValue({
    auth: { user: { id: 'user-1' } },
    query: {},
    error: undefined,
  });
  getQueryFiltersMock.mockResolvedValue({ page: 1 });
  getUserBoardsMock.mockResolvedValue([{ id: 'board-1' }] as any);

  const response = await GET(new Request('http://localhost/api/boards'));

  expect(response.status).toBe(200);
  expect(getUserBoardsMock).toHaveBeenCalledWith('user-1', { page: 1 });
  expect(getAllUserBoardsIncludingTeamAccessMock).not.toHaveBeenCalled();
});

test('GET can include boards from teams the authenticated user belongs to', async () => {
  parseRequestMock.mockResolvedValue({
    auth: { user: { id: 'user-1' } },
    query: { includeTeams: '1' },
    error: undefined,
  });
  getQueryFiltersMock.mockResolvedValue({ page: 1 });
  getAllUserBoardsIncludingTeamAccessMock.mockResolvedValue([{ id: 'team-board-1' }] as any);

  const response = await GET(new Request('http://localhost/api/boards?includeTeams=1'));

  expect(response.status).toBe(200);
  expect(getAllUserBoardsIncludingTeamAccessMock).toHaveBeenCalledWith('user-1', { page: 1 });
  expect(getUserBoardsMock).not.toHaveBeenCalled();
});

test('POST creates boards inside the authenticated user tenant', async () => {
  parseRequestMock.mockResolvedValue({
    auth: { user: { id: 'user-1' } },
    body: {
      type: 'mixed',
      name: 'Executive Dashboard',
      description: 'Core metrics',
      parameters: {},
    },
    error: undefined,
  });
  canCreateWebsiteMock.mockResolvedValue(true);
  canViewBoardEntitiesMock.mockResolvedValue(true);
  getDefaultTenantIdForUserMock.mockResolvedValue('tenant-1');
  createBoardMock.mockResolvedValue({ id: 'board-1' } as any);

  const response = await POST(new Request('http://localhost/api/boards', { method: 'POST' }));

  expect(response.status).toBe(200);
  expect(createBoardMock).toHaveBeenCalledWith(
    expect.objectContaining({
      userId: 'user-1',
      tenantId: 'tenant-1',
      name: 'Executive Dashboard',
      parameters: {},
    }),
  );
});

test('POST rejects creating boards in teams the user cannot create assets in', async () => {
  parseRequestMock.mockResolvedValue({
    auth: { user: { id: 'user-1' } },
    body: {
      type: 'mixed',
      name: 'Executive Dashboard',
      description: 'Core metrics',
      teamId: 'team-2',
      parameters: {},
    },
    error: undefined,
  });
  canCreateTeamWebsiteMock.mockResolvedValue(false);
  canCreateWebsiteMock.mockResolvedValue(true);

  const response = await POST(new Request('http://localhost/api/boards', { method: 'POST' }));

  expect(response.status).toBe(401);
  expect(createBoardMock).not.toHaveBeenCalled();
});

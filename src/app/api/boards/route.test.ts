import { beforeEach, expect, test, vi } from 'vitest';
import { parseRequest } from '@/lib/request';
import { canCreateWebsite, canViewBoardEntities } from '@/permissions';
import { createBoard } from '@/queries/prisma';
import { getDefaultTenantIdForUser } from '@/queries/prisma/tenant';
import { POST } from './route';

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
  getUserBoards: vi.fn(),
}));

vi.mock('@/queries/prisma/tenant', () => ({
  getDefaultTenantIdForUser: vi.fn(),
  getTenantIdForTeam: vi.fn(),
}));

const parseRequestMock = vi.mocked(parseRequest);
const canCreateWebsiteMock = vi.mocked(canCreateWebsite);
const canViewBoardEntitiesMock = vi.mocked(canViewBoardEntities);
const createBoardMock = vi.mocked(createBoard);
const getDefaultTenantIdForUserMock = vi.mocked(getDefaultTenantIdForUser);

beforeEach(() => {
  parseRequestMock.mockReset();
  canCreateWebsiteMock.mockReset();
  canViewBoardEntitiesMock.mockReset();
  createBoardMock.mockReset();
  getDefaultTenantIdForUserMock.mockReset();
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

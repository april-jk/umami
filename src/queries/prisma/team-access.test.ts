import { beforeEach, expect, test, vi } from 'vitest';
import { BOARD_TYPES } from '@/lib/boards';
import {
  getAllUserBoardsIncludingTeamAccess,
  getAllUserLinksIncludingTeamAccess,
  getAllUserPixelsIncludingTeamAccess,
} from './index';
import { getAllUserWebsitesIncludingTeamAccess } from './website';

const { pagedQueryMock } = vi.hoisted(() => ({
  pagedQueryMock: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  default: {
    client: {
      share: {
        findMany: vi.fn(),
      },
    },
    getSearchParameters: vi.fn(() => ({})),
    pagedQuery: pagedQueryMock,
  },
}));

vi.mock('@/lib/redis', () => ({
  default: {
    enabled: false,
    client: {
      del: vi.fn(),
      set: vi.fn(),
    },
  },
}));

beforeEach(() => {
  pagedQueryMock.mockReset();
  pagedQueryMock.mockResolvedValue({
    data: [],
    count: 0,
    page: 1,
    pageSize: 10,
    orderBy: 'name',
    search: '',
  });
});

test('website team-access query is limited to owned websites and membership teams', async () => {
  await getAllUserWebsitesIncludingTeamAccess('user-1', {});

  expect(pagedQueryMock).toHaveBeenCalledWith(
    'website',
    expect.objectContaining({
      where: expect.objectContaining({
        deletedAt: null,
        OR: [
          { userId: 'user-1' },
          {
            team: {
              deletedAt: null,
              members: {
                some: {
                  userId: 'user-1',
                },
              },
            },
          },
        ],
      }),
    }),
    expect.objectContaining({ orderBy: 'name' }),
  );
});

test('link team-access query excludes other users and deleted links', async () => {
  await getAllUserLinksIncludingTeamAccess('user-1', {});

  expect(pagedQueryMock).toHaveBeenCalledWith(
    'link',
    expect.objectContaining({
      where: expect.objectContaining({
        deletedAt: null,
        OR: [
          { userId: 'user-1' },
          {
            team: {
              deletedAt: null,
              members: {
                some: {
                  userId: 'user-1',
                },
              },
            },
          },
        ],
      }),
    }),
    expect.objectContaining({ orderBy: 'name' }),
  );
});

test('pixel team-access query excludes other users and deleted pixels', async () => {
  await getAllUserPixelsIncludingTeamAccess('user-1', {});

  expect(pagedQueryMock).toHaveBeenCalledWith(
    'pixel',
    expect.objectContaining({
      where: expect.objectContaining({
        deletedAt: null,
        OR: [
          { userId: 'user-1' },
          {
            team: {
              deletedAt: null,
              members: {
                some: {
                  userId: 'user-1',
                },
              },
            },
          },
        ],
      }),
    }),
    expect.objectContaining({ orderBy: 'name' }),
  );
});

test('board team-access query excludes dashboards and other users', async () => {
  await getAllUserBoardsIncludingTeamAccess('user-1', {});

  expect(pagedQueryMock).toHaveBeenCalledWith(
    'board',
    expect.objectContaining({
      where: expect.objectContaining({
        type: {
          not: BOARD_TYPES.dashboard,
        },
        OR: [
          { userId: 'user-1' },
          {
            team: {
              deletedAt: null,
              members: {
                some: {
                  userId: 'user-1',
                },
              },
            },
          },
        ],
      }),
    }),
    expect.objectContaining({ orderBy: 'name' }),
  );
});

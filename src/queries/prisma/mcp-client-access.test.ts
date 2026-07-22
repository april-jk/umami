import { beforeEach, describe, expect, test, vi } from 'vitest';
import { describeMcpOperation, getUserMcpUsage } from './mcp-client-access';

const { pagedQueryMock } = vi.hoisted(() => ({ pagedQueryMock: vi.fn() }));

vi.mock('@/lib/prisma', () => ({
  default: { pagedQuery: pagedQueryMock },
}));

beforeEach(() => pagedQueryMock.mockReset());

describe('describeMcpOperation', () => {
  test.each([
    ['GET', '/api/websites', 'List websites'],
    ['GET', '/api/websites/site-1', 'View website'],
    ['POST', '/api/websites', 'Create website'],
    ['PATCH', '/api/websites/site-1', 'Update website'],
    ['DELETE', '/api/websites/site-1', 'Delete website'],
    ['GET', '/api/websites/site-1/stats', 'Query website statistics'],
    ['GET', '/api/websites/site-1/metrics', 'Query website metrics'],
    ['GET', '/api/websites/site-1/active', 'View active visitors'],
    ['GET', '/api/realtime/site-1', 'View realtime activity'],
    ['GET', '/api/teams', 'List teams'],
    ['POST', '/api/links', 'Create short link'],
    ['OPTIONS', '/api/custom', 'OPTIONS /api/custom'],
  ])('%s %s becomes %s', (method, route, expected) => {
    expect(describeMcpOperation(method, route)).toBe(expected);
  });
});

test('lists only the authenticated user usage and exposes the API key name', async () => {
  pagedQueryMock.mockResolvedValue({
    data: [
      {
        id: 'access-1',
        createdAt: new Date('2026-07-22T10:00:00.000Z'),
        method: 'GET',
        route: '/api/websites/site-1/stats',
        apiKey: { name: 'Desktop MCP' },
      },
    ],
    count: 1,
    page: 2,
    pageSize: 20,
  });

  const result = await getUserMcpUsage('user-1', { page: 2 });

  expect(pagedQueryMock).toHaveBeenCalledWith(
    'mcpClientAccess',
    {
      where: { userId: 'user-1' },
      select: {
        id: true,
        route: true,
        method: true,
        createdAt: true,
        apiKey: { select: { name: true } },
      },
    },
    { page: 2, orderBy: 'createdAt', sortDescending: true },
  );
  expect(result).toEqual({
    data: [
      {
        id: 'access-1',
        createdAt: new Date('2026-07-22T10:00:00.000Z'),
        apiKeyName: 'Desktop MCP',
        method: 'GET',
        route: '/api/websites/site-1/stats',
        operation: 'Query website statistics',
      },
    ],
    count: 1,
    page: 2,
    pageSize: 20,
  });
});

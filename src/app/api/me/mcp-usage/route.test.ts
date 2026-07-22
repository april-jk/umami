import { beforeEach, expect, test, vi } from 'vitest';
import { parseRequest } from '@/lib/request';
import { getUserMcpUsage } from '@/queries/prisma/mcp-client-access';
import { GET } from './route';

vi.mock('@/lib/request', () => ({ parseRequest: vi.fn() }));
vi.mock('@/queries/prisma/mcp-client-access', () => ({ getUserMcpUsage: vi.fn() }));

const parseRequestMock = vi.mocked(parseRequest);
const getUserMcpUsageMock = vi.mocked(getUserMcpUsage);

beforeEach(() => vi.clearAllMocks());

test('returns the authenticated user MCP usage page', async () => {
  parseRequestMock.mockResolvedValue({
    auth: { user: { id: 'user-1' } },
    query: { page: 2, pageSize: 50 },
    error: undefined,
  });
  getUserMcpUsageMock.mockResolvedValue({ data: [], count: 0, page: 2, pageSize: 50 } as any);

  const response = await GET(new Request('http://localhost/api/me/mcp-usage?page=2&pageSize=50'));

  expect(response.status).toBe(200);
  expect(getUserMcpUsageMock).toHaveBeenCalledWith('user-1', { page: 2, pageSize: 50 });
  expect(await response.json()).toMatchObject({ data: [], count: 0, page: 2, pageSize: 50 });
});

test('returns the parse error without querying usage', async () => {
  parseRequestMock.mockResolvedValue({
    error: () => new Response('Unauthorized', { status: 401 }),
  });

  const response = await GET(new Request('http://localhost/api/me/mcp-usage'));

  expect(response.status).toBe(401);
  expect(getUserMcpUsageMock).not.toHaveBeenCalled();
});

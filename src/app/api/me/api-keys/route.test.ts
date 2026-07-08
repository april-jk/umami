import { beforeEach, expect, test, vi } from 'vitest';
import { parseRequest } from '@/lib/request';
import { createApiKey, getUserApiKeys } from '@/queries/prisma/apiKey';
import { GET, POST } from './route';

vi.mock('@/lib/request', () => ({
  parseRequest: vi.fn(),
}));

vi.mock('@/queries/prisma/apiKey', () => ({
  createApiKey: vi.fn(),
  getUserApiKeys: vi.fn(),
}));

const parseRequestMock = vi.mocked(parseRequest);
const createApiKeyMock = vi.mocked(createApiKey);
const getUserApiKeysMock = vi.mocked(getUserApiKeys);

beforeEach(() => {
  parseRequestMock.mockReset();
  createApiKeyMock.mockReset();
  getUserApiKeysMock.mockReset();
});

test('GET lists only the authenticated user API keys', async () => {
  parseRequestMock.mockResolvedValue({
    auth: { user: { id: 'user-1' } },
    error: undefined,
  });
  getUserApiKeysMock.mockResolvedValue([{ id: 'key-1', keyPrefix: 'amami_live_abc' }] as any);

  const response = await GET(new Request('http://localhost/api/me/api-keys'));
  const body = await response.json();

  expect(response.status).toBe(200);
  expect(getUserApiKeysMock).toHaveBeenCalledWith('user-1');
  expect(body).toEqual([{ id: 'key-1', keyPrefix: 'amami_live_abc' }]);
});

test('POST creates an API key for the authenticated user', async () => {
  parseRequestMock.mockResolvedValue({
    auth: { user: { id: 'user-1' } },
    body: { name: 'MCP' },
    error: undefined,
  });
  createApiKeyMock.mockResolvedValue({ id: 'key-1', key: 'amami_live_secret' } as any);

  const response = await POST(
    new Request('http://localhost/api/me/api-keys', {
      method: 'POST',
      body: JSON.stringify({ name: 'MCP' }),
    }),
  );
  const body = await response.json();

  expect(response.status).toBe(200);
  expect(createApiKeyMock).toHaveBeenCalledWith('user-1', 'MCP');
  expect(body.key).toBe('amami_live_secret');
});

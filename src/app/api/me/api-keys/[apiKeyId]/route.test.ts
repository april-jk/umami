import { beforeEach, expect, test, vi } from 'vitest';
import { parseRequest } from '@/lib/request';
import { deleteUserApiKey } from '@/queries/prisma/apiKey';
import { DELETE } from './route';

vi.mock('@/lib/request', () => ({
  parseRequest: vi.fn(),
}));

vi.mock('@/queries/prisma/apiKey', () => ({
  deleteUserApiKey: vi.fn(),
}));

const parseRequestMock = vi.mocked(parseRequest);
const deleteUserApiKeyMock = vi.mocked(deleteUserApiKey);

beforeEach(() => {
  parseRequestMock.mockReset();
  deleteUserApiKeyMock.mockReset();
});

test('DELETE revokes only keys owned by the authenticated user', async () => {
  parseRequestMock.mockResolvedValue({
    auth: { user: { id: 'user-1' } },
    error: undefined,
  });
  deleteUserApiKeyMock.mockResolvedValue(true);

  const response = await DELETE(new Request('http://localhost/api/me/api-keys/key-1'), {
    params: Promise.resolve({ apiKeyId: 'key-1' }),
  });

  expect(response.status).toBe(200);
  expect(deleteUserApiKeyMock).toHaveBeenCalledWith('user-1', 'key-1');
});

test('DELETE returns not found for keys outside the authenticated user', async () => {
  parseRequestMock.mockResolvedValue({
    auth: { user: { id: 'user-1' } },
    error: undefined,
  });
  deleteUserApiKeyMock.mockResolvedValue(false);

  const response = await DELETE(new Request('http://localhost/api/me/api-keys/key-2'), {
    params: Promise.resolve({ apiKeyId: 'key-2' }),
  });

  expect(response.status).toBe(404);
  expect(deleteUserApiKeyMock).toHaveBeenCalledWith('user-1', 'key-2');
});

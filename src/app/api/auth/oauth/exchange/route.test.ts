import { beforeEach, expect, test, vi } from 'vitest';
import { createAuthToken } from '@/lib/auth';
import { consumeOAuthLoginCode } from '@/lib/oauth';
import { parseRequest } from '@/lib/request';
import { getUser } from '@/queries/prisma';
import { POST } from './route';

vi.mock('@/lib/auth', () => ({ createAuthToken: vi.fn() }));
vi.mock('@/lib/oauth', () => ({ consumeOAuthLoginCode: vi.fn() }));
vi.mock('@/lib/request', () => ({ parseRequest: vi.fn() }));
vi.mock('@/queries/prisma', () => ({ getUser: vi.fn() }));

const createAuthTokenMock = vi.mocked(createAuthToken);
const consumeOAuthLoginCodeMock = vi.mocked(consumeOAuthLoginCode);
const getUserMock = vi.mocked(getUser);
const parseRequestMock = vi.mocked(parseRequest);

beforeEach(() => {
  createAuthTokenMock.mockReset();
  consumeOAuthLoginCodeMock.mockReset();
  getUserMock.mockReset();
  parseRequestMock.mockReset();
});

test('POST exchanges a valid one-time code for a bearer token', async () => {
  parseRequestMock.mockResolvedValue({ body: { code: 'one-time-code' }, error: undefined });
  consumeOAuthLoginCodeMock.mockResolvedValue({ userId: 'user-id' });
  getUserMock.mockResolvedValue({ id: 'user-id', role: 'user', password: 'password-hash' } as any);
  createAuthTokenMock.mockResolvedValue('bearer-token');

  const response = await POST(
    new Request('http://localhost/api/auth/oauth/exchange', { method: 'POST' }),
  );

  expect(response.status).toBe(200);
  expect(consumeOAuthLoginCodeMock).toHaveBeenCalledWith('one-time-code');
  expect(getUserMock).toHaveBeenCalledWith('user-id', { includePassword: true });
  await expect(response.json()).resolves.toEqual({ token: 'bearer-token' });
});

test('POST rejects invalid, expired, and malformed exchanges', async () => {
  parseRequestMock.mockResolvedValue({ body: { code: 'expired-code' }, error: undefined });
  consumeOAuthLoginCodeMock.mockResolvedValue(null);

  const expired = await POST(
    new Request('http://localhost/api/auth/oauth/exchange', { method: 'POST' }),
  );
  expect(expired.status).toBe(401);
  expect((await expired.json()).error.code).toBe('invalid-oauth-login-code');
  expect(getUserMock).not.toHaveBeenCalled();

  parseRequestMock.mockResolvedValue({ error: () => new Response(null, { status: 400 }) });
  const malformed = await POST(
    new Request('http://localhost/api/auth/oauth/exchange', { method: 'POST' }),
  );
  expect(malformed.status).toBe(400);
  expect(consumeOAuthLoginCodeMock).toHaveBeenCalledTimes(1);
});

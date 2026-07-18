import { beforeEach, expect, test, vi } from 'vitest';
import { consumeOAuthLinkCode } from '@/lib/oauth';
import { checkPassword } from '@/lib/password';
import { parseRequest } from '@/lib/request';
import { createOAuthAccount, getOAuthAccountUser, getUser } from '@/queries/prisma';
import { POST } from './route';

vi.mock('@/lib/oauth', () => ({ consumeOAuthLinkCode: vi.fn() }));
vi.mock('@/lib/password', () => ({ checkPassword: vi.fn() }));
vi.mock('@/lib/request', () => ({ parseRequest: vi.fn() }));
vi.mock('@/queries/prisma', () => ({
  createOAuthAccount: vi.fn(),
  getOAuthAccountUser: vi.fn(),
  getUser: vi.fn(),
}));

const consumeOAuthLinkCodeMock = vi.mocked(consumeOAuthLinkCode);
const checkPasswordMock = vi.mocked(checkPassword);
const parseRequestMock = vi.mocked(parseRequest);
const createOAuthAccountMock = vi.mocked(createOAuthAccount);
const getOAuthAccountUserMock = vi.mocked(getOAuthAccountUser);
const getUserMock = vi.mocked(getUser);

const request = () => new Request('http://localhost/api/auth/oauth/link', { method: 'POST' });
const identity = {
  provider: 'google' as const,
  providerAccountId: 'google-user',
  email: 'user@example.com',
};

beforeEach(() => {
  consumeOAuthLinkCodeMock.mockReset();
  parseRequestMock.mockReset();
  createOAuthAccountMock.mockReset();
  getOAuthAccountUserMock.mockReset();
  getUserMock.mockReset();
  checkPasswordMock.mockReset();
  parseRequestMock.mockResolvedValue({
    auth: { user: { id: 'user-id', username: 'local-user', email: 'user@example.com' } },
    body: { code: 'link-code', password: 'password123' },
    error: undefined,
  });
  getUserMock.mockResolvedValue({
    id: 'user-id',
    username: 'local-user',
    email: 'user@example.com',
    password: 'password-hash',
  } as any);
  checkPasswordMock.mockReturnValue(true);
});

test('POST links a verified OAuth identity only to the matching authenticated account', async () => {
  consumeOAuthLinkCodeMock.mockResolvedValue(identity);
  getOAuthAccountUserMock.mockResolvedValue(null);

  const response = await POST(request());

  expect(response.status).toBe(200);
  expect(consumeOAuthLinkCodeMock).toHaveBeenCalledWith('link-code');
  expect(getUserMock).toHaveBeenCalledWith('user-id', { includePassword: true });
  expect(checkPasswordMock).toHaveBeenCalledWith('password123', 'password-hash');
  expect(getOAuthAccountUserMock).toHaveBeenCalledWith('google', 'google-user');
  expect(createOAuthAccountMock).toHaveBeenCalledWith({ ...identity, userId: 'user-id' });
  await expect(response.json()).resolves.toEqual({ linked: true });
});

test('POST rejects invalid and expired linking codes', async () => {
  consumeOAuthLinkCodeMock.mockResolvedValue(null);

  const response = await POST(request());

  expect(response.status).toBe(400);
  expect((await response.json()).error.code).toBe('invalid-oauth-link-code');
  expect(getOAuthAccountUserMock).not.toHaveBeenCalled();
  expect(createOAuthAccountMock).not.toHaveBeenCalled();
});

test('POST rejects a password login from a different email account', async () => {
  parseRequestMock.mockResolvedValue({
    auth: { user: { id: 'other-user', username: 'local-user', email: 'other@example.com' } },
    body: { code: 'link-code', password: 'password123' },
    error: undefined,
  });
  getUserMock.mockResolvedValue({
    id: 'other-user',
    username: 'local-user',
    email: 'other@example.com',
    password: 'password-hash',
  } as any);
  consumeOAuthLinkCodeMock.mockResolvedValue(identity);

  const response = await POST(request());

  expect(response.status).toBe(400);
  expect((await response.json()).error.code).toBe('oauth-email-mismatch');
  expect(getOAuthAccountUserMock).not.toHaveBeenCalled();
  expect(createOAuthAccountMock).not.toHaveBeenCalled();
});

test('POST rejects identities already bound to any account', async () => {
  consumeOAuthLinkCodeMock.mockResolvedValue(identity);
  getOAuthAccountUserMock.mockResolvedValue({ id: 'other-user' } as any);

  const response = await POST(request());

  expect(response.status).toBe(400);
  expect((await response.json()).error.code).toBe('oauth-account-already-linked');
  expect(createOAuthAccountMock).not.toHaveBeenCalled();
});

test('POST requires the current password and rejects API key authentication before consuming a code', async () => {
  checkPasswordMock.mockReturnValue(false);
  const wrongPassword = await POST(request());
  expect(wrongPassword.status).toBe(401);
  expect(consumeOAuthLinkCodeMock).not.toHaveBeenCalled();

  checkPasswordMock.mockReturnValue(true);
  parseRequestMock.mockResolvedValue({
    auth: { apiKeyId: 'api-key-id', user: { id: 'user-id' } },
    body: { code: 'link-code', password: 'password123' },
    error: undefined,
  });
  const apiKey = await POST(request());
  expect(apiKey.status).toBe(401);
  expect(getUserMock).toHaveBeenCalledTimes(1);
  expect(consumeOAuthLinkCodeMock).not.toHaveBeenCalled();
});

test('POST turns a concurrent provider binding into a safe conflict response', async () => {
  consumeOAuthLinkCodeMock.mockResolvedValue(identity);
  getOAuthAccountUserMock.mockResolvedValue(null);
  createOAuthAccountMock.mockRejectedValue({ code: 'P2002' });

  const response = await POST(request());

  expect(response.status).toBe(400);
  expect((await response.json()).error.code).toBe('oauth-account-already-linked');
});

test('POST propagates an unexpected storage failure', async () => {
  consumeOAuthLinkCodeMock.mockResolvedValue(identity);
  getOAuthAccountUserMock.mockResolvedValue(null);
  createOAuthAccountMock.mockRejectedValue(new Error('database unavailable'));

  await expect(POST(request())).rejects.toThrow('database unavailable');
});

test('POST returns request authentication and validation errors without consuming a code', async () => {
  const error = () => new Response(null, { status: 401 });
  parseRequestMock.mockResolvedValue({ error });

  const response = await POST(request());

  expect(response.status).toBe(401);
  expect(consumeOAuthLinkCodeMock).not.toHaveBeenCalled();
});

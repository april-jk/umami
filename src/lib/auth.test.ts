import { beforeEach, describe, expect, test, vi } from 'vitest';
import { hash } from '@/lib/crypto';
import { parseSecureToken, parseToken } from '@/lib/jwt';
import redis from '@/lib/redis';
import { getApiKeyAuth, touchApiKey } from '@/queries/prisma/apiKey';
import { getUser } from '@/queries/prisma/user';
import { checkAuth } from './auth';

vi.mock('@/lib/jwt', () => ({
  parseSecureToken: vi.fn(),
  parseToken: vi.fn(() => null),
}));

vi.mock('@/queries/prisma/apiKey', () => ({
  getApiKeyAuth: vi.fn(),
  touchApiKey: vi.fn(),
}));

vi.mock('@/queries/prisma/user', () => ({
  getUser: vi.fn(),
}));

vi.mock('@/lib/redis', () => ({
  default: {
    enabled: false,
    client: {
      get: vi.fn(),
    },
  },
}));

const parseSecureTokenMock = vi.mocked(parseSecureToken);
const parseTokenMock = vi.mocked(parseToken);
const getApiKeyAuthMock = vi.mocked(getApiKeyAuth);
const touchApiKeyMock = vi.mocked(touchApiKey);
const getUserMock = vi.mocked(getUser);
const redisMock = redis as unknown as {
  enabled: boolean;
  client: {
    get: ReturnType<typeof vi.fn>;
  };
};

const PASSWORD_HASH = '$2b$10$currentpasswordhashvalue';

function authedRequest() {
  return new Request('http://localhost/api/test', {
    headers: { authorization: 'Bearer secure-token' },
  });
}

function mockUser() {
  getUserMock.mockResolvedValue({
    id: 'user-1',
    username: 'bob',
    role: 'user',
    password: PASSWORD_HASH,
  } as any);
}

beforeEach(() => {
  parseSecureTokenMock.mockReset();
  parseTokenMock.mockReset();
  getApiKeyAuthMock.mockReset();
  touchApiKeyMock.mockReset();
  getUserMock.mockReset();
  redisMock.enabled = false;
  redisMock.client.get.mockReset();
});

describe('checkAuth password fingerprint', () => {
  test('authorizes a stateless token whose fingerprint matches the current password', async () => {
    parseSecureTokenMock.mockReturnValue({ userId: 'user-1', pwd: hash(PASSWORD_HASH) } as any);
    mockUser();

    const result = await checkAuth(authedRequest());

    expect(result?.user?.id).toBe('user-1');
  });

  test('authorizes a legacy stateless token that does not include a password fingerprint', async () => {
    parseSecureTokenMock.mockReturnValue({ userId: 'user-1' } as any);
    mockUser();

    const result = await checkAuth(authedRequest());

    expect(result?.user?.id).toBe('user-1');
  });

  test('rejects a stateless token whose fingerprint predates a password change', async () => {
    // Token minted against the old password must stop working once the password changes.
    parseSecureTokenMock.mockReturnValue({
      userId: 'user-1',
      pwd: hash('old-password-hash'),
    } as any);
    mockUser();

    const result = await checkAuth(authedRequest());

    expect(result).toBeNull();
  });

  test('does not expose the password hash on the returned user', async () => {
    parseSecureTokenMock.mockReturnValue({ userId: 'user-1', pwd: hash(PASSWORD_HASH) } as any);
    mockUser();

    const result = await checkAuth(authedRequest());

    expect(result?.user).not.toHaveProperty('password');
  });

  test('authorizes a Redis session whose fingerprint matches the current password', async () => {
    redisMock.enabled = true;
    parseSecureTokenMock.mockReturnValue({ authKey: 'auth:session-key' } as any);
    redisMock.client.get.mockResolvedValue({ userId: 'user-1', pwd: hash(PASSWORD_HASH) });
    mockUser();

    const result = await checkAuth(authedRequest());

    expect(result?.user?.id).toBe('user-1');
  });

  test('rejects a Redis session whose fingerprint predates a password change', async () => {
    redisMock.enabled = true;
    parseSecureTokenMock.mockReturnValue({ authKey: 'auth:session-key' } as any);
    redisMock.client.get.mockResolvedValue({ userId: 'user-1', pwd: hash('old-password-hash') });
    mockUser();

    const result = await checkAuth(authedRequest());

    expect(result).toBeNull();
  });
});

test('checkAuth accepts API keys as bearer tokens when no login token payload exists', async () => {
  parseSecureTokenMock.mockReturnValue(null);
  parseTokenMock.mockReturnValue(null);
  getApiKeyAuthMock.mockResolvedValue({
    id: 'key-1',
    user: {
      id: 'user-1',
      username: 'user',
      role: 'user',
      password: 'secret',
    },
  } as any);
  touchApiKeyMock.mockResolvedValue({} as any);

  const auth = await checkAuth(
    new Request('http://localhost/api/websites', {
      headers: {
        authorization: 'Bearer amami_live_secret',
      },
    }),
  );

  expect(getApiKeyAuthMock).toHaveBeenCalledWith('amami_live_secret');
  expect(touchApiKeyMock).toHaveBeenCalledWith('key-1');
  expect(auth?.apiKeyId).toBe('key-1');
  expect(auth?.user).toMatchObject({
    id: 'user-1',
    username: 'user',
    role: 'user',
    isAdmin: false,
  });
  expect((auth?.user as any).password).toBeUndefined();
});

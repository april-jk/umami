import { beforeEach, describe, expect, test, vi } from 'vitest';
import { hash } from '@/lib/crypto';
import { parseSecureToken, parseToken } from '@/lib/jwt';
import {
  getMcpClientMetadata,
  isMcpInstallation,
  recordMcpClientAccess,
} from '@/lib/mcp-client-access';
import redis from '@/lib/redis';
import { getApiKeyAuth, touchApiKey } from '@/queries/prisma/apiKey';
import { reserveMcpCall } from '@/queries/prisma/mcp-usage';
import { getUser } from '@/queries/prisma/user';
import { checkAuth, createAuthToken, hasPermission, parseShareToken, saveAuth } from './auth';

vi.mock('@/lib/jwt', () => ({
  createSecureToken: vi.fn(() => 'secure-token'),
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

vi.mock('@/lib/mcp-client-access', () => ({
  getMcpClientMetadata: vi.fn(() => ({ invalid: false })),
  isMcpInstallation: vi.fn(),
  recordMcpClientAccess: vi.fn(() => Promise.resolve()),
}));

vi.mock('@/queries/prisma/mcp-usage', () => ({
  reserveMcpCall: vi.fn(() =>
    Promise.resolve({
      allowed: true,
      used: 1,
      limit: 50,
      remaining: 49,
      period: 'day',
      periodStart: '2026-07-23T00:00:00.000Z',
      plan: 'free',
    }),
  ),
}));

vi.mock('@/lib/redis', () => ({
  default: {
    enabled: false,
    client: {
      get: vi.fn(),
      set: vi.fn(),
      expire: vi.fn(),
    },
  },
}));

const parseSecureTokenMock = vi.mocked(parseSecureToken);
const parseTokenMock = vi.mocked(parseToken);
const getApiKeyAuthMock = vi.mocked(getApiKeyAuth);
const touchApiKeyMock = vi.mocked(touchApiKey);
const getUserMock = vi.mocked(getUser);
const getMcpClientMetadataMock = vi.mocked(getMcpClientMetadata);
const isMcpInstallationMock = vi.mocked(isMcpInstallation);
const recordMcpClientAccessMock = vi.mocked(recordMcpClientAccess);
const reserveMcpCallMock = vi.mocked(reserveMcpCall);
const redisMock = redis as unknown as {
  enabled: boolean;
  client: {
    get: ReturnType<typeof vi.fn>;
    set: ReturnType<typeof vi.fn>;
    expire: ReturnType<typeof vi.fn>;
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
  touchApiKeyMock.mockResolvedValue({} as any);
  getMcpClientMetadataMock.mockReset();
  isMcpInstallationMock.mockReset();
  recordMcpClientAccessMock.mockReset();
  reserveMcpCallMock.mockReset();
  getMcpClientMetadataMock.mockReturnValue({ invalid: false });
  recordMcpClientAccessMock.mockReturnValue(Promise.resolve({} as never));
  reserveMcpCallMock.mockResolvedValue({
    allowed: true,
    used: 1,
    limit: 50,
    remaining: 49,
    period: 'day',
    periodStart: '2026-07-23T00:00:00.000Z',
    plan: 'free',
  });
  redisMock.enabled = false;
  redisMock.client.get.mockReset();
  redisMock.client.set.mockReset();
  redisMock.client.expire.mockReset();
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

test('records an access attempt only for an API key issued to an MCP installation', async () => {
  parseSecureTokenMock.mockReturnValue(null);
  parseTokenMock.mockReturnValue(null);
  getApiKeyAuthMock.mockResolvedValue({
    id: 'key-mcp',
    tenantId: 'tenant-1',
    clientType: 'mcp',
    user: { id: 'user-1', username: 'user', role: 'user', password: 'secret' },
  } as any);
  isMcpInstallationMock.mockReturnValue(true);

  const request = new Request('http://localhost/api/websites', {
    headers: {
      authorization: 'Bearer amami_live_secret',
      'x-amami-mcp-client': 'amami-analytics-mcp/0.1.3',
    },
  });
  const auth = await checkAuth(request);

  expect(getMcpClientMetadataMock).toHaveBeenCalledWith(request);
  expect(recordMcpClientAccessMock).toHaveBeenCalledWith(
    request,
    { apiKeyId: 'key-mcp', userId: 'user-1', tenantId: 'tenant-1' },
    { invalid: false },
  );
  expect(auth).toMatchObject({ apiKeyId: 'key-mcp', apiKeyClientType: 'mcp' });
});

test('marks an authenticated MCP request when the membership quota is exhausted', async () => {
  parseSecureTokenMock.mockReturnValue(null);
  parseTokenMock.mockReturnValue(null);
  getApiKeyAuthMock.mockResolvedValue({
    id: 'key-mcp',
    tenantId: 'tenant-1',
    clientType: 'mcp',
    user: { id: 'user-1', username: 'user', role: 'user', password: 'secret' },
  } as any);
  isMcpInstallationMock.mockReturnValue(true);
  reserveMcpCallMock.mockResolvedValue({
    allowed: false,
    used: 50,
    limit: 50,
    remaining: 0,
    period: 'day',
    periodStart: '2026-07-23T00:00:00.000Z',
    plan: 'free',
  });

  const request = new Request('http://localhost/api/websites', {
    headers: { authorization: 'Bearer amami_live_secret' },
  });
  const auth = await checkAuth(request);

  expect(auth?.mcpUsageLimit).toMatchObject({ allowed: false, limit: 50, period: 'day' });
  expect(recordMcpClientAccessMock).toHaveBeenCalledWith(
    request,
    { apiKeyId: 'key-mcp', userId: 'user-1', tenantId: 'tenant-1' },
    { invalid: false },
    'mcp_limit_reached',
  );
});

test('does not create an MCP access record for a generic API key', async () => {
  parseSecureTokenMock.mockReturnValue(null);
  parseTokenMock.mockReturnValue(null);
  getApiKeyAuthMock.mockResolvedValue({
    id: 'key-generic',
    clientType: null,
    user: { id: 'user-1', username: 'user', role: 'user', password: 'secret' },
  } as any);
  isMcpInstallationMock.mockReturnValue(false);

  await checkAuth(authedRequest());

  expect(recordMcpClientAccessMock).not.toHaveBeenCalled();
});

test('rejects a request without an authenticated user or a share token', async () => {
  parseSecureTokenMock.mockReturnValue(null);
  parseTokenMock.mockReturnValue(null);
  getApiKeyAuthMock.mockResolvedValue(null);

  await expect(checkAuth(new Request('http://localhost/api/websites'))).resolves.toBeNull();
});

test('accepts a share token only when the request is marked as share context', async () => {
  parseSecureTokenMock.mockReturnValue(null);
  parseTokenMock.mockReturnValue({ type: 'share', id: 'share-1' } as any);

  await expect(checkAuth(new Request('http://localhost/api/share'))).resolves.toBeNull();

  const result = await checkAuth(
    new Request('http://localhost/api/share', { headers: { 'x-umami-share-context': '1' } }),
  );

  expect(result).toMatchObject({ shareToken: { type: 'share', id: 'share-1' }, user: null });
});

test('parseShareToken accepts only the dedicated share token type and handles parser failures', () => {
  parseTokenMock.mockReturnValue({ type: 'cache', id: 'cache-1' } as any);
  expect(parseShareToken(new Request('http://localhost'))).toBeNull();

  parseTokenMock.mockReturnValue({ type: 'share', id: 'share-1' } as any);
  expect(parseShareToken(new Request('http://localhost'))).toMatchObject({ id: 'share-1' });

  parseTokenMock.mockImplementation(() => {
    throw new Error('invalid token');
  });
  expect(parseShareToken(new Request('http://localhost'))).toBeNull();
});

test('does not fail authentication when auxiliary API-key and MCP access writes reject', async () => {
  parseSecureTokenMock.mockReturnValue(null);
  parseTokenMock.mockReturnValue(null);
  getApiKeyAuthMock.mockResolvedValue({
    id: 'key-mcp',
    tenantId: 'tenant-1',
    clientType: 'mcp',
    user: { id: 'user-1', username: 'user', role: 'user', password: 'secret' },
  } as any);
  touchApiKeyMock.mockRejectedValue(new Error('key touch failed'));
  isMcpInstallationMock.mockReturnValue(true);
  recordMcpClientAccessMock.mockReturnValue(Promise.reject(new Error('access write failed')));

  await expect(checkAuth(authedRequest())).resolves.toMatchObject({ user: { id: 'user-1' } });
  await Promise.resolve();
});

test('saveAuth persists Redis state and expiry when configured', async () => {
  redisMock.enabled = true;
  redisMock.client.set.mockResolvedValue('OK');
  redisMock.client.expire.mockResolvedValue(1);

  const token = await saveAuth({ userId: 'user-1' }, 60);

  expect(redisMock.client.set).toHaveBeenCalledWith(expect.stringMatching(/^auth:/), {
    userId: 'user-1',
  });
  expect(redisMock.client.expire).toHaveBeenCalledWith(expect.stringMatching(/^auth:/), 60);
  expect(token).toEqual(expect.any(String));
});

test('createAuthToken stores a session in Redis or returns a stateless token', async () => {
  redisMock.enabled = true;
  redisMock.client.set.mockResolvedValue('OK');
  const sessionToken = await createAuthToken({ id: 'user-1', role: 'user', password: 'password' });
  expect(redisMock.client.set).toHaveBeenCalled();
  expect(sessionToken).toEqual(expect.any(String));

  redisMock.enabled = false;
  const statelessToken = await createAuthToken({
    id: 'user-1',
    role: 'user',
    password: 'password',
  });
  expect(statelessToken).toEqual(expect.any(String));
});

test('hasPermission checks individual and alternative permissions', async () => {
  await expect(hasPermission('user', 'website:create')).resolves.toBe(true);
  await expect(hasPermission('view-only', ['website:create', 'team:create'])).resolves.toBe(false);
  await expect(hasPermission('missing-role', 'website:create')).resolves.toBe(false);
});

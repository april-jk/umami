import { afterEach, describe, expect, test, vi } from 'vitest';
import {
  consumeOAuthLoginCode,
  consumeOAuthLinkCode,
  createOAuthLinkCode,
  createOAuthLoginCode,
  createOAuthState,
  getOAuthCallbackUrl,
  getOAuthConfig,
  getOAuthIdentity,
  isOAuthProvider,
  validateOAuthState,
} from './oauth';
import redis from './redis';

vi.mock('./redis', () => ({
  default: {
    enabled: true,
    client: {
      set: vi.fn(),
      take: vi.fn(),
    },
  },
}));

const originalEnv = { ...process.env };
const redisMock = redis as unknown as {
  enabled: boolean;
  client: {
    set: ReturnType<typeof vi.fn>;
    take: ReturnType<typeof vi.fn>;
  };
};

afterEach(() => {
  process.env = { ...originalEnv };
  redisMock.enabled = true;
  redisMock.client.set.mockReset();
  redisMock.client.take.mockReset();
  vi.unstubAllGlobals();
});

describe('OAuth configuration and state', () => {
  test('recognizes only supported providers', () => {
    expect(isOAuthProvider('google')).toBe(true);
    expect(isOAuthProvider('github')).toBe(true);
    expect(isOAuthProvider('microsoft')).toBe(false);
  });

  test('requires both client credentials', () => {
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_SECRET;

    expect(getOAuthConfig('google')).toBeNull();
  });

  test('builds the Google configuration and stable callback URL', () => {
    process.env.GOOGLE_CLIENT_ID = 'google-id';
    process.env.GOOGLE_CLIENT_SECRET = 'google-secret';
    process.env.OAUTH_BASE_URL = 'http://localhost:3000/path-that-is-not-used';

    expect(getOAuthConfig('google')).toMatchObject({
      clientId: 'google-id',
      authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
      scopes: ['openid', 'email', 'profile'],
    });
    expect(getOAuthCallbackUrl('google')).toBe(
      'http://localhost:3000/api/auth/oauth/google/callback',
    );
  });

  test('creates a signed provider-bound state token', () => {
    process.env.APP_SECRET = 'test-secret';
    const state = createOAuthState('github');

    expect(validateOAuthState(state, state, 'github')).toBe(true);
    expect(validateOAuthState(state, state, 'google')).toBe(false);
    expect(validateOAuthState(state, `${state.slice(0, -1)}x`, 'github')).toBe(false);
    expect(validateOAuthState(state, `${state}changed`, 'github')).toBe(false);
  });

  test('stores a short-lived opaque login code and consumes it once', async () => {
    redisMock.client.take.mockResolvedValue({ userId: 'user-id' });

    const code = await createOAuthLoginCode('user-id');

    expect(code).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(redisMock.client.set).toHaveBeenCalledWith(
      `oauth-login:${code}`,
      { userId: 'user-id' },
      60,
    );
    await expect(consumeOAuthLoginCode(code)).resolves.toEqual({ userId: 'user-id' });
    expect(redisMock.client.take).toHaveBeenCalledWith(`oauth-login:${code}`);
  });

  test('does not issue or accept login codes when Redis is unavailable', async () => {
    redisMock.enabled = false;

    await expect(createOAuthLoginCode('user-id')).rejects.toThrow('OAuth login requires Redis');
    await expect(consumeOAuthLoginCode('code')).resolves.toBeNull();
  });

  test('stores a provider identity in a short-lived code that can only be consumed once', async () => {
    redisMock.client.take.mockResolvedValue({
      provider: 'google',
      providerAccountId: 'google-user',
      email: 'USER@EXAMPLE.COM',
    });

    const code = await createOAuthLinkCode({
      provider: 'google',
      providerAccountId: 'google-user',
      email: 'user@example.com',
    });

    expect(redisMock.client.set).toHaveBeenCalledWith(
      `oauth-link:${code}`,
      {
        provider: 'google',
        providerAccountId: 'google-user',
        email: 'user@example.com',
      },
      600,
    );
    await expect(consumeOAuthLinkCode(code)).resolves.toEqual({
      provider: 'google',
      providerAccountId: 'google-user',
      email: 'user@example.com',
    });
  });

  test('rejects malformed, expired, and unavailable OAuth link codes', async () => {
    redisMock.client.take.mockResolvedValue({ provider: 'not-supported' });
    await expect(consumeOAuthLinkCode('bad-code')).resolves.toBeNull();

    redisMock.enabled = false;
    await expect(
      createOAuthLinkCode({ provider: 'github', providerAccountId: '1', email: 'user@example.com' }),
    ).rejects.toThrow('OAuth account linking requires Redis');
    await expect(consumeOAuthLinkCode('code')).resolves.toBeNull();
  });

  test('builds the GitHub configuration and requires an explicit callback base URL', () => {
    process.env.GITHUB_CLIENT_ID = 'github-id';
    process.env.GITHUB_CLIENT_SECRET = 'github-secret';
    delete process.env.OAUTH_BASE_URL;

    expect(getOAuthConfig('github')).toMatchObject({
      clientId: 'github-id',
      authorizationUrl: 'https://github.com/login/oauth/authorize',
      scopes: ['read:user', 'user:email'],
    });
    expect(() => getOAuthCallbackUrl('github')).toThrow('OAUTH_BASE_URL is not configured');
  });
});

describe('getOAuthIdentity', () => {
  test('gets a Google identity only when its email is verified', async () => {
    process.env.GOOGLE_CLIENT_ID = 'google-id';
    process.env.GOOGLE_CLIENT_SECRET = 'google-secret';
    process.env.OAUTH_BASE_URL = 'http://localhost:3000';
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: 'access-token' })))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ sub: 'google-user', email: 'User@Example.com', email_verified: true }),
        ),
      );
    vi.stubGlobal('fetch', fetchMock);

    await expect(getOAuthIdentity('google', 'code')).resolves.toEqual({
      providerAccountId: 'google-user',
      email: 'user@example.com',
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  test('uses GitHub primary verified email and rejects a missing verified email', async () => {
    process.env.GITHUB_CLIENT_ID = 'github-id';
    process.env.GITHUB_CLIENT_SECRET = 'github-secret';
    process.env.OAUTH_BASE_URL = 'http://localhost:3000';
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: 'access-token' })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 42 })))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify([
            { email: 'unverified@example.com', primary: true, verified: false },
            { email: 'Verified@Example.com', primary: false, verified: true },
          ]),
        ),
      );
    vi.stubGlobal('fetch', fetchMock);

    await expect(getOAuthIdentity('github', 'code')).resolves.toEqual({
      providerAccountId: '42',
      email: 'verified@example.com',
    });
  });

  test('rejects OAuth responses without credentials', async () => {
    process.env.GOOGLE_CLIENT_ID = 'google-id';
    process.env.GOOGLE_CLIENT_SECRET = 'google-secret';
    process.env.OAUTH_BASE_URL = 'http://localhost:3000';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({}))));

    await expect(getOAuthIdentity('google', 'code')).rejects.toThrow(
      'OAuth provider did not return an access token',
    );
  });

  test('rejects missing provider configuration and failed provider requests', async () => {
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_SECRET;
    await expect(getOAuthIdentity('google', 'code')).rejects.toThrow('google OAuth is not configured');

    process.env.GOOGLE_CLIENT_ID = 'google-id';
    process.env.GOOGLE_CLIENT_SECRET = 'google-secret';
    process.env.OAUTH_BASE_URL = 'http://localhost:3000';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 503 })));

    await expect(getOAuthIdentity('google', 'code')).rejects.toThrow(
      'OAuth provider request failed with status 503',
    );
  });

  test('rejects an unverified Google email address', async () => {
    process.env.GOOGLE_CLIENT_ID = 'google-id';
    process.env.GOOGLE_CLIENT_SECRET = 'google-secret';
    process.env.OAUTH_BASE_URL = 'http://localhost:3000';
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: 'access-token' })))
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              sub: 'google-user',
              email: 'user@example.com',
              email_verified: false,
            }),
          ),
        ),
    );

    await expect(getOAuthIdentity('google', 'code')).rejects.toThrow(
      'Google account does not provide a verified email address',
    );
  });

  test('rejects GitHub identities without a verified email address', async () => {
    process.env.GITHUB_CLIENT_ID = 'github-id';
    process.env.GITHUB_CLIENT_SECRET = 'github-secret';
    process.env.OAUTH_BASE_URL = 'http://localhost:3000';
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: 'access-token' })))
        .mockResolvedValueOnce(new Response(JSON.stringify({ id: 42 })))
        .mockResolvedValueOnce(new Response(JSON.stringify([]))),
    );

    await expect(getOAuthIdentity('github', 'code')).rejects.toThrow(
      'GitHub account does not provide a verified email address',
    );
  });
});

import { afterEach, describe, expect, test, vi } from 'vitest';
import {
  createOAuthState,
  getOAuthCallbackUrl,
  getOAuthConfig,
  getOAuthIdentity,
  isOAuthProvider,
  validateOAuthState,
} from './oauth';

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
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
    expect(validateOAuthState(state, `${state}changed`, 'github')).toBe(false);
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
});

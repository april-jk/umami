import { beforeEach, expect, test, vi } from 'vitest';
import { createAuthToken } from '@/lib/auth';
import {
  getOAuthBaseUrl,
  getOAuthIdentity,
  isOAuthProvider,
  validateOAuthState,
} from '@/lib/oauth';
import { getOrCreateOAuthUser } from '@/queries/prisma';
import { GET } from './route';

vi.mock('@/lib/auth', () => ({ createAuthToken: vi.fn() }));
vi.mock('@/lib/oauth', () => ({
  getOAuthBaseUrl: vi.fn(),
  getOAuthIdentity: vi.fn(),
  isOAuthProvider: vi.fn(),
  validateOAuthState: vi.fn(),
}));
vi.mock('@/queries/prisma', () => ({ getOrCreateOAuthUser: vi.fn() }));

const createAuthTokenMock = vi.mocked(createAuthToken);
const getOAuthBaseUrlMock = vi.mocked(getOAuthBaseUrl);
const getOAuthIdentityMock = vi.mocked(getOAuthIdentity);
const getOrCreateOAuthUserMock = vi.mocked(getOrCreateOAuthUser);
const isOAuthProviderMock = vi.mocked(isOAuthProvider);
const validateOAuthStateMock = vi.mocked(validateOAuthState);

beforeEach(() => {
  createAuthTokenMock.mockReset();
  getOAuthBaseUrlMock.mockReset();
  getOAuthIdentityMock.mockReset();
  getOrCreateOAuthUserMock.mockReset();
  isOAuthProviderMock.mockReset();
  validateOAuthStateMock.mockReset();
  getOAuthBaseUrlMock.mockReturnValue('http://localhost:3000');
  isOAuthProviderMock.mockReturnValue(true);
  validateOAuthStateMock.mockReturnValue(true);
});

test('GET exchanges a valid callback for an existing local auth session', async () => {
  getOAuthIdentityMock.mockResolvedValue({
    providerAccountId: 'google-user',
    email: 'user@example.com',
  });
  getOrCreateOAuthUserMock.mockResolvedValue({
    id: 'user-id',
    role: 'user',
    password: 'hash',
  } as any);
  createAuthTokenMock.mockResolvedValue('session-token');

  const response = await GET(
    new Request('http://localhost/api/auth/oauth/google/callback?code=code&state=state', {
      headers: { cookie: 'amami-oauth-state-google=state' },
    }),
    { params: Promise.resolve({ provider: 'google' }) },
  );
  const locationHeader = response.headers.get('location');
  if (!locationHeader) throw new Error('Expected OAuth callback redirect location');
  const location = new URL(locationHeader);

  expect(response.status).toBe(307);
  expect(validateOAuthStateMock).toHaveBeenCalledWith('state', 'state', 'google');
  expect(getOrCreateOAuthUserMock).toHaveBeenCalledWith({
    provider: 'google',
    providerAccountId: 'google-user',
    email: 'user@example.com',
  });
  expect(location.pathname).toBe('/sso');
  expect(Object.fromEntries(location.searchParams)).toMatchObject({
    url: '/dashboard',
    token: 'session-token',
  });
  expect(response.headers.get('set-cookie')).toContain('amami-oauth-state-google=');
});

test('GET returns to login without contacting a provider when callback validation fails', async () => {
  validateOAuthStateMock.mockReturnValue(false);

  const response = await GET(
    new Request('http://localhost/api/auth/oauth/google/callback?code=code&state=state'),
    { params: Promise.resolve({ provider: 'google' }) },
  );

  const locationHeader = response.headers.get('location');
  if (!locationHeader) throw new Error('Expected login redirect location');
  expect(new URL(locationHeader).pathname).toBe('/login');
  expect(getOAuthIdentityMock).not.toHaveBeenCalled();
});

test('GET hides provider failures and rejects unknown providers', async () => {
  isOAuthProviderMock.mockReturnValue(false);
  const unknown = await GET(new Request('http://localhost/api/auth/oauth/other/callback'), {
    params: Promise.resolve({ provider: 'other' }),
  });
  expect(unknown.status).toBe(404);

  isOAuthProviderMock.mockReturnValue(true);
  getOAuthIdentityMock.mockRejectedValue(new Error('provider failure'));
  const failed = await GET(
    new Request('http://localhost/api/auth/oauth/google/callback?code=code&state=state', {
      headers: { cookie: 'amami-oauth-state-google=state' },
    }),
    { params: Promise.resolve({ provider: 'google' }) },
  );
  const locationHeader = failed.headers.get('location');
  if (!locationHeader) throw new Error('Expected failed OAuth redirect location');
  expect(new URL(locationHeader).pathname).toBe('/login');
});

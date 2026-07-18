import { beforeEach, expect, test, vi } from 'vitest';
import {
  createOAuthLinkCode,
  createOAuthLoginCode,
  getOAuthBaseUrl,
  getOAuthIdentity,
  isOAuthProvider,
  validateOAuthState,
} from '@/lib/oauth';
import { getOrCreateOAuthUser } from '@/queries/prisma';
import { GET } from './route';

vi.mock('@/lib/oauth', () => ({
  createOAuthLinkCode: vi.fn(),
  createOAuthLoginCode: vi.fn(),
  getOAuthBaseUrl: vi.fn(),
  getOAuthIdentity: vi.fn(),
  isOAuthProvider: vi.fn(),
  validateOAuthState: vi.fn(),
}));
vi.mock('@/queries/prisma', () => ({ getOrCreateOAuthUser: vi.fn() }));

const createOAuthLoginCodeMock = vi.mocked(createOAuthLoginCode);
const createOAuthLinkCodeMock = vi.mocked(createOAuthLinkCode);
const getOAuthBaseUrlMock = vi.mocked(getOAuthBaseUrl);
const getOAuthIdentityMock = vi.mocked(getOAuthIdentity);
const getOrCreateOAuthUserMock = vi.mocked(getOrCreateOAuthUser);
const isOAuthProviderMock = vi.mocked(isOAuthProvider);
const validateOAuthStateMock = vi.mocked(validateOAuthState);

beforeEach(() => {
  createOAuthLoginCodeMock.mockReset();
  createOAuthLinkCodeMock.mockReset();
  getOAuthBaseUrlMock.mockReset();
  getOAuthIdentityMock.mockReset();
  getOrCreateOAuthUserMock.mockReset();
  isOAuthProviderMock.mockReset();
  validateOAuthStateMock.mockReset();
  getOAuthBaseUrlMock.mockReturnValue('http://localhost:3000');
  isOAuthProviderMock.mockReturnValue(true);
  validateOAuthStateMock.mockReturnValue(true);
});

test('GET redirects a valid callback with an opaque one-time code in the URL fragment', async () => {
  getOAuthIdentityMock.mockResolvedValue({
    providerAccountId: 'google-user',
    email: 'user@example.com',
  });
  getOrCreateOAuthUserMock.mockResolvedValue({
    status: 'signed-in',
    user: { id: 'user-id', role: 'user', password: 'hash' },
  } as any);
  createOAuthLoginCodeMock.mockResolvedValue('one-time-code');

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
  expect(createOAuthLoginCodeMock).toHaveBeenCalledWith('user-id');
  expect(location.pathname).toBe('/oauth/complete');
  expect(location.hash).toBe('#code=one-time-code');
  expect(location.search).toBe('');
  expect(response.headers.get('set-cookie')).toContain('amami-oauth-state-google=');
});

test('GET sends an existing email account to the explicit linking flow', async () => {
  getOAuthIdentityMock.mockResolvedValue({
    providerAccountId: 'google-user',
    email: 'user@example.com',
  });
  getOrCreateOAuthUserMock.mockResolvedValue({
    status: 'link-required',
    email: 'user@example.com',
  } as any);
  createOAuthLinkCodeMock.mockResolvedValue('link-code');

  const response = await GET(
    new Request('http://localhost/api/auth/oauth/google/callback?code=code&state=state', {
      headers: { cookie: 'amami-oauth-state-google=state' },
    }),
    { params: Promise.resolve({ provider: 'google' }) },
  );
  const locationHeader = response.headers.get('location');
  if (!locationHeader) throw new Error('Expected OAuth linking redirect location');
  const location = new URL(locationHeader);

  expect(location.pathname).toBe('/oauth/link');
  expect(location.hash).toBe('#code=link-code');
  expect(createOAuthLoginCodeMock).not.toHaveBeenCalled();
  expect(createOAuthLinkCodeMock).toHaveBeenCalledWith({
    provider: 'google',
    providerAccountId: 'google-user',
    email: 'user@example.com',
  });
});

test('GET rejects a new provider identity without a verified email without issuing a login code', async () => {
  getOAuthIdentityMock.mockResolvedValue({ providerAccountId: 'google-user', email: undefined });
  getOrCreateOAuthUserMock.mockResolvedValue({ status: 'email-required' } as any);

  const response = await GET(
    new Request('http://localhost/api/auth/oauth/google/callback?code=code&state=state', {
      headers: { cookie: 'amami-oauth-state-google=state' },
    }),
    { params: Promise.resolve({ provider: 'google' }) },
  );
  const locationHeader = response.headers.get('location');
  if (!locationHeader) throw new Error('Expected OAuth email error redirect location');
  const location = new URL(locationHeader);

  expect(location.pathname).toBe('/login');
  expect(location.searchParams.get('oauthError')).toBe('email-required');
  expect(createOAuthLoginCodeMock).not.toHaveBeenCalled();
  expect(createOAuthLinkCodeMock).not.toHaveBeenCalled();
  expect(response.headers.get('set-cookie')).toContain('amami-oauth-state-google=');
});

test('GET rejects an OAuth email that conflicts with another username without issuing a code', async () => {
  getOAuthIdentityMock.mockResolvedValue({
    providerAccountId: 'github-user',
    email: 'user@example.com',
  });
  getOrCreateOAuthUserMock.mockResolvedValue({ status: 'username-conflict' } as any);

  const response = await GET(
    new Request('http://localhost/api/auth/oauth/github/callback?code=code&state=state', {
      headers: { cookie: 'amami-oauth-state-github=state' },
    }),
    { params: Promise.resolve({ provider: 'github' }) },
  );
  const locationHeader = response.headers.get('location');
  if (!locationHeader) throw new Error('Expected OAuth conflict redirect location');
  const location = new URL(locationHeader);

  expect(location.pathname).toBe('/login');
  expect(location.searchParams.get('oauthError')).toBe('identity-conflict');
  expect(createOAuthLoginCodeMock).not.toHaveBeenCalled();
  expect(createOAuthLinkCodeMock).not.toHaveBeenCalled();
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

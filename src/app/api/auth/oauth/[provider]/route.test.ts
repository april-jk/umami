import { beforeEach, expect, test, vi } from 'vitest';
import {
  createOAuthState,
  getOAuthCallbackUrl,
  getOAuthConfig,
  isOAuthProvider,
} from '@/lib/oauth';
import { GET } from './route';

vi.mock('@/lib/oauth', () => ({
  createOAuthState: vi.fn(),
  getOAuthCallbackUrl: vi.fn(),
  getOAuthConfig: vi.fn(),
  isOAuthProvider: vi.fn(),
}));

const createOAuthStateMock = vi.mocked(createOAuthState);
const getOAuthCallbackUrlMock = vi.mocked(getOAuthCallbackUrl);
const getOAuthConfigMock = vi.mocked(getOAuthConfig);
const isOAuthProviderMock = vi.mocked(isOAuthProvider);

beforeEach(() => {
  createOAuthStateMock.mockReset();
  getOAuthCallbackUrlMock.mockReset();
  getOAuthConfigMock.mockReset();
  isOAuthProviderMock.mockReset();
  isOAuthProviderMock.mockReturnValue(true);
});

test('GET starts a configured OAuth authorization redirect with a protected state cookie', async () => {
  createOAuthStateMock.mockReturnValue('signed-state');
  getOAuthCallbackUrlMock.mockReturnValue('http://localhost:3000/api/auth/oauth/google/callback');
  getOAuthConfigMock.mockReturnValue({
    clientId: 'client-id',
    clientSecret: 'client-secret',
    authorizationUrl: 'https://provider.example/authorize',
    tokenUrl: 'https://provider.example/token',
    scopes: ['openid', 'email'],
  });

  const response = await GET(new Request('http://localhost/api/auth/oauth/google'), {
    params: Promise.resolve({ provider: 'google' }),
  });
  const locationHeader = response.headers.get('location');
  if (!locationHeader) throw new Error('Expected OAuth redirect location');
  const location = new URL(locationHeader);

  expect(response.status).toBe(307);
  expect(Object.fromEntries(location.searchParams)).toMatchObject({
    client_id: 'client-id',
    redirect_uri: 'http://localhost:3000/api/auth/oauth/google/callback',
    response_type: 'code',
    scope: 'openid email',
    state: 'signed-state',
  });
  expect(response.headers.get('set-cookie')).toContain('amami-oauth-state-google=signed-state');
});

test('GET rejects unknown and unavailable providers', async () => {
  isOAuthProviderMock.mockReturnValue(false);
  const unknown = await GET(new Request('http://localhost/api/auth/oauth/other'), {
    params: Promise.resolve({ provider: 'other' }),
  });
  expect(unknown.status).toBe(404);

  isOAuthProviderMock.mockReturnValue(true);
  getOAuthConfigMock.mockReturnValue(null);
  const unavailable = await GET(new Request('http://localhost/api/auth/oauth/google'), {
    params: Promise.resolve({ provider: 'google' }),
  });
  expect(unavailable.status).toBe(503);
});

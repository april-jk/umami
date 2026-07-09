import { beforeEach, expect, test, vi } from 'vitest';
import { createMcpAuthorizationCode, verifyMcpConsentToken } from '@/lib/mcp-auth';
import { parseRequest } from '@/lib/request';
import { POST } from './route';

vi.mock('@/lib/request', () => ({
  parseRequest: vi.fn(),
}));

vi.mock('@/lib/mcp-auth', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/mcp-auth')>()),
  createMcpAuthorizationCode: vi.fn(),
  verifyMcpConsentToken: vi.fn(),
}));

const parseRequestMock = vi.mocked(parseRequest);
const createMcpAuthorizationCodeMock = vi.mocked(createMcpAuthorizationCode);
const verifyMcpConsentTokenMock = vi.mocked(verifyMcpConsentToken);

beforeEach(() => {
  parseRequestMock.mockReset();
  createMcpAuthorizationCodeMock.mockReset();
  verifyMcpConsentTokenMock.mockReset();
});

test('POST creates a short-lived MCP authorization redirect', async () => {
  parseRequestMock.mockResolvedValue({
    auth: { user: { id: 'user-1' } },
    body: {
      redirectUri: 'http://127.0.0.1:49152/callback',
      state: 'state-1234567890123456',
      codeChallenge: 'challenge-12345678901234567890123456789012',
      codeChallengeMethod: 'S256',
      write: true,
      consentToken: 'consent-token',
    },
    error: undefined,
  });
  createMcpAuthorizationCodeMock.mockResolvedValue('code-1');
  verifyMcpConsentTokenMock.mockReturnValue(true);

  const response = await POST(
    new Request('http://localhost/api/auth/mcp/authorize', { method: 'POST' }),
  );
  const body = await response.json();

  expect(response.status).toBe(200);
  expect(verifyMcpConsentTokenMock).toHaveBeenCalledWith('consent-token', {
    redirectUri: 'http://127.0.0.1:49152/callback',
    state: 'state-1234567890123456',
    codeChallenge: 'challenge-12345678901234567890123456789012',
    codeChallengeMethod: 'S256',
    write: true,
  });
  expect(createMcpAuthorizationCodeMock).toHaveBeenCalledWith({
    userId: 'user-1',
    codeChallenge: 'challenge-12345678901234567890123456789012',
    codeChallengeMethod: 'S256',
    write: true,
  });
  expect(body.redirectUrl).toBe(
    'http://127.0.0.1:49152/callback?code=code-1&state=state-1234567890123456',
  );
});

test('POST rejects non-loopback redirect URIs', async () => {
  parseRequestMock.mockResolvedValue({
    auth: { user: { id: 'user-1' } },
    body: {
      redirectUri: 'https://example.com/callback',
      state: 'state-1234567890123456',
      codeChallenge: 'challenge-12345678901234567890123456789012',
      codeChallengeMethod: 'S256',
      write: true,
      consentToken: 'consent-token',
    },
    error: undefined,
  });

  const response = await POST(
    new Request('http://localhost/api/auth/mcp/authorize', { method: 'POST' }),
  );
  const body = await response.json();

  expect(response.status).toBe(400);
  expect(body.error.code).toBe('invalid-redirect-uri');
  expect(verifyMcpConsentTokenMock).not.toHaveBeenCalled();
  expect(createMcpAuthorizationCodeMock).not.toHaveBeenCalled();
});

test('POST rejects calls that did not originate from the browser consent page', async () => {
  parseRequestMock.mockResolvedValue({
    auth: { user: { id: 'user-1' } },
    body: {
      redirectUri: 'http://127.0.0.1:49152/callback',
      state: 'state-1234567890123456',
      codeChallenge: 'challenge-12345678901234567890123456789012',
      codeChallengeMethod: 'S256',
      write: true,
      consentToken: 'bad-consent-token',
    },
    error: undefined,
  });
  verifyMcpConsentTokenMock.mockReturnValue(false);

  const response = await POST(
    new Request('http://localhost/api/auth/mcp/authorize', { method: 'POST' }),
  );
  const body = await response.json();

  expect(response.status).toBe(403);
  expect(body.error.code).toBe('missing-browser-consent');
  expect(createMcpAuthorizationCodeMock).not.toHaveBeenCalled();
});

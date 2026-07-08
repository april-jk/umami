import { beforeEach, expect, test, vi } from 'vitest';
import { createMcpAuthorizationCode } from '@/lib/mcp-auth';
import { parseRequest } from '@/lib/request';
import { POST } from './route';

vi.mock('@/lib/request', () => ({
  parseRequest: vi.fn(),
}));

vi.mock('@/lib/mcp-auth', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/mcp-auth')>()),
  createMcpAuthorizationCode: vi.fn(),
}));

const parseRequestMock = vi.mocked(parseRequest);
const createMcpAuthorizationCodeMock = vi.mocked(createMcpAuthorizationCode);

beforeEach(() => {
  parseRequestMock.mockReset();
  createMcpAuthorizationCodeMock.mockReset();
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
    },
    error: undefined,
  });
  createMcpAuthorizationCodeMock.mockResolvedValue('code-1');

  const response = await POST(
    new Request('http://localhost/api/auth/mcp/authorize', { method: 'POST' }),
  );
  const body = await response.json();

  expect(response.status).toBe(200);
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
    },
    error: undefined,
  });

  const response = await POST(
    new Request('http://localhost/api/auth/mcp/authorize', { method: 'POST' }),
  );
  const body = await response.json();

  expect(response.status).toBe(400);
  expect(body.error.code).toBe('invalid-redirect-uri');
  expect(createMcpAuthorizationCodeMock).not.toHaveBeenCalled();
});

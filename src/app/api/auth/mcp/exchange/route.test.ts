import { beforeEach, expect, test, vi } from 'vitest';
import { consumeMcpAuthorizationCode, verifyCodeVerifier } from '@/lib/mcp-auth';
import { parseRequest } from '@/lib/request';
import { createApiKey } from '@/queries/prisma/apiKey';
import { POST } from './route';

vi.mock('@/lib/request', () => ({
  parseRequest: vi.fn(),
}));

vi.mock('@/lib/mcp-auth', () => ({
  consumeMcpAuthorizationCode: vi.fn(),
  verifyCodeVerifier: vi.fn(),
}));

vi.mock('@/queries/prisma/apiKey', () => ({
  createApiKey: vi.fn(),
}));

const parseRequestMock = vi.mocked(parseRequest);
const consumeMcpAuthorizationCodeMock = vi.mocked(consumeMcpAuthorizationCode);
const verifyCodeVerifierMock = vi.mocked(verifyCodeVerifier);
const createApiKeyMock = vi.mocked(createApiKey);

beforeEach(() => {
  parseRequestMock.mockReset();
  consumeMcpAuthorizationCodeMock.mockReset();
  verifyCodeVerifierMock.mockReset();
  createApiKeyMock.mockReset();
});

test('POST exchanges a valid MCP authorization code for a new API key', async () => {
  parseRequestMock.mockResolvedValue({
    body: {
      code: 'code-1',
      codeVerifier: 'verifier-12345678901234567890123456789012',
      apiKeyName: 'MCP test',
    },
    error: undefined,
  });
  consumeMcpAuthorizationCodeMock.mockResolvedValue({
    type: 'mcp-auth-code',
    userId: 'user-1',
    codeChallenge: 'challenge-1',
    codeChallengeMethod: 'S256',
    write: true,
    createdAt: Date.now(),
  });
  verifyCodeVerifierMock.mockReturnValue(true);
  createApiKeyMock.mockResolvedValue({
    id: 'key-1',
    key: 'amami_live_secret',
    keyPrefix: 'amami_live_prefix',
  } as any);

  const response = await POST(
    new Request('http://localhost/api/auth/mcp/exchange', { method: 'POST' }),
  );
  const body = await response.json();

  expect(response.status).toBe(200);
  expect(consumeMcpAuthorizationCodeMock).toHaveBeenCalledWith('code-1');
  expect(verifyCodeVerifierMock).toHaveBeenCalledWith(
    'verifier-12345678901234567890123456789012',
    'challenge-1',
  );
  expect(createApiKeyMock).toHaveBeenCalledWith('user-1', 'MCP test', 'mcp');
  expect(body).toMatchObject({
    apiKey: 'amami_live_secret',
    keyPrefix: 'amami_live_prefix',
    tokenType: 'Bearer',
    scopes: { write: true },
  });
});

test('POST rejects an invalid PKCE verifier', async () => {
  parseRequestMock.mockResolvedValue({
    body: {
      code: 'code-1',
      codeVerifier: 'verifier-12345678901234567890123456789012',
    },
    error: undefined,
  });
  consumeMcpAuthorizationCodeMock.mockResolvedValue({
    type: 'mcp-auth-code',
    userId: 'user-1',
    codeChallenge: 'challenge-1',
    codeChallengeMethod: 'S256',
    write: true,
    createdAt: Date.now(),
  });
  verifyCodeVerifierMock.mockReturnValue(false);

  const response = await POST(
    new Request('http://localhost/api/auth/mcp/exchange', { method: 'POST' }),
  );
  const body = await response.json();

  expect(response.status).toBe(400);
  expect(body.error.code).toBe('invalid-code-verifier');
  expect(createApiKeyMock).not.toHaveBeenCalled();
});

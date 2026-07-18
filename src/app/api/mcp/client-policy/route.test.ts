import { beforeEach, expect, test, vi } from 'vitest';
import { getMcpClientPolicy } from '@/lib/mcp-client-policy';
import { parseRequest } from '@/lib/request';
import { GET } from './route';

vi.mock('@/lib/request', () => ({ parseRequest: vi.fn() }));
vi.mock('@/lib/mcp-client-policy', () => ({ getMcpClientPolicy: vi.fn() }));

const parseRequestMock = vi.mocked(parseRequest);
const getMcpClientPolicyMock = vi.mocked(getMcpClientPolicy);

beforeEach(() => {
  parseRequestMock.mockReset();
  getMcpClientPolicyMock.mockReset();
});

test('returns a policy only for an MCP installation API key request', async () => {
  parseRequestMock.mockResolvedValue({
    auth: { apiKeyId: 'key-1', apiKeyClientType: 'mcp' },
    error: undefined,
  });
  getMcpClientPolicyMock.mockResolvedValue({
    latestVersion: '0.1.4',
    protocolVersion: '2026-07-18',
    docsUrl: 'https://docs.amami.dev/docs/mcp-config/',
  });

  const response = await GET(
    new Request('https://dashboard.amami.dev/api/mcp/client-policy', {
      headers: { 'x-amami-mcp-client': 'amami-analytics-mcp/0.1.3' },
    }),
  );

  expect(response.status).toBe(200);
  await expect(response.json()).resolves.toMatchObject({ latestVersion: '0.1.4' });
});

test('rejects a browser session or generic API key request', async () => {
  parseRequestMock.mockResolvedValue({
    auth: { apiKeyId: 'key-1', apiKeyClientType: null },
    error: undefined,
  });

  const response = await GET(new Request('https://dashboard.amami.dev/api/mcp/client-policy'));
  const body = await response.json();

  expect(response.status).toBe(403);
  expect(body.error.code).toBe('mcp-client-required');
  expect(getMcpClientPolicyMock).not.toHaveBeenCalled();
});

test('returns the authentication error before evaluating the MCP policy', async () => {
  const expected = new Response(JSON.stringify({ error: { code: 'unauthorized' } }), {
    status: 401,
  });
  parseRequestMock.mockResolvedValue({ error: () => expected });

  const response = await GET(new Request('https://dashboard.amami.dev/api/mcp/client-policy'));

  expect(response).toBe(expected);
  expect(getMcpClientPolicyMock).not.toHaveBeenCalled();
});

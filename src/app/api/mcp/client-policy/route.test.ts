import { beforeEach, expect, test, vi } from 'vitest';
import { getMcpClientMetadata } from '@/lib/mcp-client-access';
import { getMcpClientPolicy } from '@/lib/mcp-client-policy';
import { parseRequest } from '@/lib/request';
import { GET } from './route';

vi.mock('@/lib/request', () => ({ parseRequest: vi.fn() }));
vi.mock('@/lib/mcp-client-policy', () => ({ getMcpClientPolicy: vi.fn() }));
vi.mock('@/lib/mcp-client-access', () => ({ getMcpClientMetadata: vi.fn() }));

const parseRequestMock = vi.mocked(parseRequest);
const getMcpClientPolicyMock = vi.mocked(getMcpClientPolicy);
const getMcpClientMetadataMock = vi.mocked(getMcpClientMetadata);

beforeEach(() => {
  parseRequestMock.mockReset();
  getMcpClientPolicyMock.mockReset();
  getMcpClientMetadataMock.mockReset();
});

test('returns a policy only for an MCP installation API key request', async () => {
  parseRequestMock.mockResolvedValue({
    auth: { apiKeyId: 'key-1', apiKeyClientType: 'mcp' },
    error: undefined,
  });
  getMcpClientPolicyMock.mockResolvedValue({
    latestVersion: '0.1.5',
    minimumSupportedVersion: '0.1.5',
    updateRequired: true,
    protocolVersion: '2026-07-18',
    docsUrl: 'https://docs.amami.dev/docs/mcp-config/',
  });
  getMcpClientMetadataMock.mockReturnValue({ clientVersion: '0.1.3', invalid: false });

  const response = await GET(
    new Request('https://dashboard.amami.dev/api/mcp/client-policy', {
      headers: { 'x-amami-mcp-client': 'amami-analytics-mcp/0.1.3' },
    }),
  );

  expect(response.status).toBe(200);
  await expect(response.json()).resolves.toMatchObject({
    latestVersion: '0.1.5',
    minimumSupportedVersion: '0.1.5',
    updateRequired: true,
  });
  expect(getMcpClientPolicyMock).toHaveBeenCalledWith('0.1.3');
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
  expect(getMcpClientMetadataMock).not.toHaveBeenCalled();
});

test('returns the authentication error before evaluating the MCP policy', async () => {
  const expected = new Response(JSON.stringify({ error: { code: 'unauthorized' } }), {
    status: 401,
  });
  parseRequestMock.mockResolvedValue({ error: () => expected });

  const response = await GET(new Request('https://dashboard.amami.dev/api/mcp/client-policy'));

  expect(response).toBe(expected);
  expect(getMcpClientPolicyMock).not.toHaveBeenCalled();
  expect(getMcpClientMetadataMock).not.toHaveBeenCalled();
});

test('does not mark an unparseable client header as requiring an update', async () => {
  parseRequestMock.mockResolvedValue({
    auth: { apiKeyId: 'key-1', apiKeyClientType: 'mcp' },
    error: undefined,
  });
  getMcpClientMetadataMock.mockReturnValue({ invalid: true });
  getMcpClientPolicyMock.mockResolvedValue({
    updateRequired: false,
    protocolVersion: '2026-07-18',
    docsUrl: 'https://docs.amami.dev/docs/mcp-config/',
  });

  await GET(
    new Request('https://dashboard.amami.dev/api/mcp/client-policy', {
      headers: { 'x-amami-mcp-client': 'not-valid' },
    }),
  );

  expect(getMcpClientPolicyMock).toHaveBeenCalledWith(undefined);
});

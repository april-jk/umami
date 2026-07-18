import { beforeEach, expect, test, vi } from 'vitest';
import {
  getMcpClientMetadata,
  hashDailyIp,
  isMcpInstallation,
  recordMcpClientAccess,
} from './mcp-client-access';

const { createMock } = vi.hoisted(() => ({ createMock: vi.fn() }));

vi.mock('@/lib/prisma', () => ({
  default: { client: { mcpClientAccess: { create: createMock } } },
}));

beforeEach(() => createMock.mockReset());

test('parses valid MCP client metadata without treating it as identity', () => {
  const request = new Request('https://dashboard.amami.dev/api/websites', {
    headers: {
      'x-amami-mcp-client': 'amami-analytics-mcp/0.1.3',
      'x-amami-mcp-protocol': '2026-07-18',
      'user-agent': 'amami-analytics-mcp/0.1.3',
      'cf-connecting-ip': '203.0.113.10',
    },
  });

  expect(getMcpClientMetadata(request)).toEqual({
    clientName: 'amami-analytics-mcp',
    clientVersion: '0.1.3',
    protocolVersion: '2026-07-18',
    userAgent: 'amami-analytics-mcp/0.1.3',
    invalid: false,
  });
  expect(isMcpInstallation('mcp')).toBe(true);
  expect(hashDailyIp(request, new Date('2026-07-18T10:00:00Z'))).toMatch(/^[a-f0-9]{128}$/);
});

test('keeps malformed client metadata non-authoritative', () => {
  const request = new Request('https://dashboard.amami.dev/api/websites', {
    headers: { 'x-amami-mcp-client': 'not a valid client' },
  });

  expect(getMcpClientMetadata(request)).toMatchObject({
    clientName: undefined,
    clientVersion: undefined,
    invalid: true,
  });
  expect(isMcpInstallation(null)).toBe(false);
});

test('handles missing network metadata and sanitizes runtime-provided control characters', () => {
  const request = {
    headers: {
      get(name: string) {
        return (
          {
            'x-amami-mcp-client': 'amami-analytics-mcp/v0.1.3',
            'x-amami-mcp-protocol': 'proto\u0000v1',
            'user-agent': 'agent\nvalue',
          }[name] ?? null
        );
      },
      has: () => false,
    },
  } as unknown as Request;

  expect(getMcpClientMetadata(request)).toEqual({
    clientName: 'amami-analytics-mcp',
    clientVersion: '0.1.3',
    protocolVersion: 'proto v1',
    userAgent: 'agent value',
    invalid: false,
  });
  expect(hashDailyIp(request, new Date('2026-07-18T10:00:00Z'))).toBeUndefined();
});

test('bounds metadata and records no query string, raw IP, or credentials', async () => {
  createMock.mockResolvedValue({ id: 'access-1' });
  const request = new Request('https://dashboard.amami.dev/api/websites?apiKey=secret', {
    method: 'POST',
    headers: {
      'x-amami-mcp-client': 'invalid client',
      'x-amami-mcp-protocol': ` proto ${'x'.repeat(40)}`,
      'user-agent': ` agent ${'x'.repeat(210)}`,
      'cf-connecting-ip': '203.0.113.10',
    },
  });

  await expect(
    recordMcpClientAccess(
      request,
      { apiKeyId: 'key-1', userId: 'user-1', tenantId: null },
      getMcpClientMetadata(request),
      'forbidden',
    ),
  ).resolves.toEqual({ id: 'access-1' });

  expect(createMock).toHaveBeenCalledWith({
    data: expect.objectContaining({
      apiKeyId: 'key-1',
      userId: 'user-1',
      tenantId: undefined,
      clientName: undefined,
      clientVersion: undefined,
      route: '/api/websites',
      method: 'POST',
      outcome: 'invalid_client_metadata',
      protocolVersion: expect.stringMatching(/^proto x{26}$/),
      userAgent: expect.stringMatching(/^agent x{194}$/),
      ipHashDay: expect.stringMatching(/^[a-f0-9]{128}$/),
    }),
  });
});

test('records a valid client outcome and tenant without changing an explicit outcome', async () => {
  createMock.mockResolvedValue({ id: 'access-2' });
  const request = new Request('https://dashboard.amami.dev/api/me', {
    headers: { 'x-amami-mcp-client': 'amami-analytics-mcp/0.1.3' },
  });

  await recordMcpClientAccess(
    request,
    { apiKeyId: 'key-2', userId: 'user-2', tenantId: 'tenant-2' },
    getMcpClientMetadata(request),
    'rate_limited',
  );

  expect(createMock).toHaveBeenCalledWith({
    data: expect.objectContaining({ tenantId: 'tenant-2', outcome: 'rate_limited' }),
  });
});

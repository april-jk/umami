import { expect, test } from 'vitest';
import { getMcpClientMetadata, hashDailyIp, isMcpInstallation } from './mcp-client-access';

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

import { afterEach, expect, test } from 'vitest';
import { getMcpClientPolicy } from './mcp-client-policy';

const saved = {
  latest: process.env.AMAMI_MCP_LATEST_VERSION,
  minimum: process.env.AMAMI_MCP_MINIMUM_VERSION,
  protocol: process.env.AMAMI_MCP_PROTOCOL_VERSION,
  message: process.env.AMAMI_MCP_UPDATE_MESSAGE,
  docs: process.env.AMAMI_MCP_UPDATE_DOCS_URL,
};

afterEach(() => {
  process.env.AMAMI_MCP_LATEST_VERSION = saved.latest;
  process.env.AMAMI_MCP_MINIMUM_VERSION = saved.minimum;
  process.env.AMAMI_MCP_PROTOCOL_VERSION = saved.protocol;
  process.env.AMAMI_MCP_UPDATE_MESSAGE = saved.message;
  process.env.AMAMI_MCP_UPDATE_DOCS_URL = saved.docs;
});

test('returns an observation-mode policy when no version floor is configured', () => {
  delete process.env.AMAMI_MCP_LATEST_VERSION;
  delete process.env.AMAMI_MCP_MINIMUM_VERSION;

  expect(getMcpClientPolicy()).toMatchObject({
    protocolVersion: '2026-07-18',
    docsUrl: 'https://docs.amami.dev/docs/mcp-config/',
  });
});

test('rejects a minimum version that exceeds the latest version', () => {
  process.env.AMAMI_MCP_LATEST_VERSION = '0.1.4';
  process.env.AMAMI_MCP_MINIMUM_VERSION = '0.1.5';

  expect(() => getMcpClientPolicy()).toThrow('must not be greater');
});

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

test('rejects invalid configured versions and returns configured update details', () => {
  process.env.AMAMI_MCP_LATEST_VERSION = 'not-semver';
  expect(() => getMcpClientPolicy()).toThrow(
    'AMAMI_MCP_LATEST_VERSION must be a valid SemVer version',
  );

  process.env.AMAMI_MCP_LATEST_VERSION = 'v0.1.4';
  process.env.AMAMI_MCP_MINIMUM_VERSION = '0.1.3';
  process.env.AMAMI_MCP_PROTOCOL_VERSION = '2026-08-01';
  process.env.AMAMI_MCP_UPDATE_MESSAGE = 'Upgrade now';
  process.env.AMAMI_MCP_UPDATE_DOCS_URL = 'https://docs.example.com/update';

  expect(getMcpClientPolicy()).toEqual({
    latestVersion: '0.1.4',
    minimumSupportedVersion: '0.1.3',
    protocolVersion: '2026-08-01',
    message: 'Upgrade now',
    docsUrl: 'https://docs.example.com/update',
  });
});

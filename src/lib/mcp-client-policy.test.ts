import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { getMcpClientPolicy, resetMcpClientPolicyCacheForTests } from './mcp-client-policy';

const saved = {
  minimum: process.env.AMAMI_MCP_MINIMUM_VERSION,
  protocol: process.env.AMAMI_MCP_PROTOCOL_VERSION,
  message: process.env.AMAMI_MCP_UPDATE_MESSAGE,
  docs: process.env.AMAMI_MCP_UPDATE_DOCS_URL,
};

function restoreEnv(name: string, value: string | undefined) {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}

beforeEach(() => {
  resetMcpClientPolicyCacheForTests();
});

afterEach(() => {
  restoreEnv('AMAMI_MCP_MINIMUM_VERSION', saved.minimum);
  restoreEnv('AMAMI_MCP_PROTOCOL_VERSION', saved.protocol);
  restoreEnv('AMAMI_MCP_UPDATE_MESSAGE', saved.message);
  restoreEnv('AMAMI_MCP_UPDATE_DOCS_URL', saved.docs);
  vi.unstubAllGlobals();
});

test('uses 0.1.5 as the released compatibility floor when no override is configured', async () => {
  delete process.env.AMAMI_MCP_MINIMUM_VERSION;
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(JSON.stringify({ version: '0.1.5' }))),
  );

  await expect(getMcpClientPolicy('0.1.4')).resolves.toMatchObject({
    latestVersion: '0.1.5',
    minimumSupportedVersion: '0.1.5',
    updateRequired: true,
    protocolVersion: '2026-07-18',
    docsUrl: 'https://docs.amami.dev/docs/mcp-config/',
  });
});

test('rejects a minimum version that exceeds the npm latest version', async () => {
  process.env.AMAMI_MCP_MINIMUM_VERSION = '0.1.5';
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(JSON.stringify({ version: '0.1.4' }))),
  );

  await expect(getMcpClientPolicy()).rejects.toThrow('must not be greater');
});

test('rejects an invalid configured minimum version', async () => {
  process.env.AMAMI_MCP_MINIMUM_VERSION = 'not-semver';
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(JSON.stringify({ version: '0.1.4' }))),
  );

  await expect(getMcpClientPolicy()).rejects.toThrow(
    'AMAMI_MCP_MINIMUM_VERSION must be a valid SemVer version',
  );
});

test('caches the npm result and returns configured compatibility details', async () => {
  const fetchMock = vi.fn(async () => new Response(JSON.stringify({ version: 'v0.1.5' })));
  vi.stubGlobal('fetch', fetchMock);

  process.env.AMAMI_MCP_MINIMUM_VERSION = '0.1.3';
  process.env.AMAMI_MCP_PROTOCOL_VERSION = '2026-08-01';
  process.env.AMAMI_MCP_UPDATE_MESSAGE = 'Upgrade now';
  process.env.AMAMI_MCP_UPDATE_DOCS_URL = 'https://docs.example.com/update';

  await expect(getMcpClientPolicy('0.1.3')).resolves.toEqual({
    latestVersion: '0.1.5',
    minimumSupportedVersion: '0.1.3',
    updateRequired: false,
    protocolVersion: '2026-08-01',
    message: 'Upgrade now',
    docsUrl: 'https://docs.example.com/update',
  });
  await getMcpClientPolicy();
  expect(fetchMock).toHaveBeenCalledTimes(1);
});

test('marks an authenticated MCP version below the compatibility floor as required to update', async () => {
  delete process.env.AMAMI_MCP_MINIMUM_VERSION;
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(JSON.stringify({ version: '0.1.5' }))),
  );

  await expect(getMcpClientPolicy('0.1.4')).resolves.toMatchObject({
    latestVersion: '0.1.5',
    minimumSupportedVersion: '0.1.5',
    updateRequired: true,
  });
  await expect(getMcpClientPolicy('0.1.5')).resolves.toMatchObject({ updateRequired: false });
});

test('keeps the released 0.1.5 policy when npm is unavailable or returns an invalid version', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(JSON.stringify({ version: 'not-semver' }))),
  );

  await expect(getMcpClientPolicy('0.1.4')).resolves.toMatchObject({
    latestVersion: '0.1.5',
    minimumSupportedVersion: '0.1.5',
    updateRequired: true,
  });

  resetMcpClientPolicyCacheForTests();
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(JSON.stringify({ version: 15 }))),
  );

  await expect(getMcpClientPolicy('0.1.4')).resolves.toMatchObject({
    latestVersion: '0.1.5',
    updateRequired: true,
  });

  resetMcpClientPolicyCacheForTests();
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => Promise.reject(new Error('registry unavailable'))),
  );
  await expect(getMcpClientPolicy('0.1.4')).resolves.toMatchObject({
    latestVersion: '0.1.5',
    minimumSupportedVersion: '0.1.5',
    updateRequired: true,
  });
});

test('deduplicates concurrent npm registry lookups', async () => {
  let resolveFetch: ((response: Response) => void) | undefined;
  const fetchMock = vi.fn(
    () =>
      new Promise<Response>(resolve => {
        resolveFetch = resolve;
      }),
  );
  vi.stubGlobal('fetch', fetchMock);

  const first = getMcpClientPolicy();
  const second = getMcpClientPolicy();
  resolveFetch?.(new Response(JSON.stringify({ version: '0.1.5' })));

  await expect(Promise.all([first, second])).resolves.toEqual([
    expect.objectContaining({ latestVersion: '0.1.5' }),
    expect.objectContaining({ latestVersion: '0.1.5' }),
  ]);
  expect(fetchMock).toHaveBeenCalledTimes(1);
});

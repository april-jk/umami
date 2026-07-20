import semver from 'semver';

const MCP_PACKAGE_NAME = 'amami-analytics-mcp';
const RELEASED_MCP_VERSION = '0.1.5';
const NPM_LATEST_URL = `https://registry.npmjs.org/${MCP_PACKAGE_NAME}/latest`;
const NPM_LOOKUP_TIMEOUT_MS = 2_000;
const NPM_VERSION_CACHE_MS = 15 * 60 * 1_000;
const NPM_FAILURE_CACHE_MS = 60 * 1_000;

export interface McpClientPolicy {
  latestVersion?: string;
  minimumSupportedVersion?: string;
  /** Server-authoritative compatibility decision for the authenticated MCP version. */
  updateRequired: boolean;
  protocolVersion: string;
  message?: string;
  docsUrl: string;
}

let cachedNpmVersion: { version?: string; expiresAt: number } | undefined;
let npmVersionRequest: Promise<string | undefined> | undefined;

function envSemver(value: string, name: string) {
  const version = semver.valid(value);
  if (!version) throw new Error(`${name} must be a valid SemVer version`);
  return version;
}

async function getLatestNpmVersion(): Promise<string | undefined> {
  const now = Date.now();
  if (cachedNpmVersion && cachedNpmVersion.expiresAt > now) return cachedNpmVersion.version;

  if (!npmVersionRequest) {
    npmVersionRequest = fetch(NPM_LATEST_URL, {
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(NPM_LOOKUP_TIMEOUT_MS),
    })
      .then(async response => {
        if (!response.ok) return undefined;
        const data = (await response.json()) as { version?: unknown };
        return typeof data.version === 'string'
          ? semver.valid(data.version) || undefined
          : undefined;
      })
      // Registry availability must not affect authentication or tool usage.
      .catch(() => undefined)
      .then(version => {
        cachedNpmVersion = {
          version,
          expiresAt: Date.now() + (version ? NPM_VERSION_CACHE_MS : NPM_FAILURE_CACHE_MS),
        };
        return version;
      })
      .finally(() => {
        npmVersionRequest = undefined;
      });
  }

  return npmVersionRequest;
}

export async function getMcpClientPolicy(clientVersion?: string): Promise<McpClientPolicy> {
  const latestVersion = (await getLatestNpmVersion()) || RELEASED_MCP_VERSION;
  const minimumSupportedVersion = envSemver(
    process.env.AMAMI_MCP_MINIMUM_VERSION || RELEASED_MCP_VERSION,
    'AMAMI_MCP_MINIMUM_VERSION',
  );

  if (
    latestVersion &&
    minimumSupportedVersion &&
    semver.gt(minimumSupportedVersion, latestVersion)
  ) {
    throw new Error('AMAMI_MCP_MINIMUM_VERSION must not be greater than the npm latest version');
  }

  return {
    latestVersion,
    minimumSupportedVersion,
    updateRequired: Boolean(
      minimumSupportedVersion && clientVersion && semver.lt(clientVersion, minimumSupportedVersion),
    ),
    protocolVersion: process.env.AMAMI_MCP_PROTOCOL_VERSION || '2026-07-18',
    message: process.env.AMAMI_MCP_UPDATE_MESSAGE || undefined,
    docsUrl: process.env.AMAMI_MCP_UPDATE_DOCS_URL || 'https://docs.amami.dev/docs/mcp-config/',
  };
}

export function resetMcpClientPolicyCacheForTests() {
  cachedNpmVersion = undefined;
  npmVersionRequest = undefined;
}

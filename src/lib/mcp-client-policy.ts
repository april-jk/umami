import semver from 'semver';

export interface McpClientPolicy {
  latestVersion?: string;
  minimumSupportedVersion?: string;
  protocolVersion: string;
  message?: string;
  docsUrl: string;
}

function envSemver(value: string | undefined, name: string) {
  if (!value) return undefined;
  const version = semver.valid(value);
  if (!version) throw new Error(`${name} must be a valid SemVer version`);
  return version;
}

export function getMcpClientPolicy(): McpClientPolicy {
  const latestVersion = envSemver(process.env.AMAMI_MCP_LATEST_VERSION, 'AMAMI_MCP_LATEST_VERSION');
  const minimumSupportedVersion = envSemver(
    process.env.AMAMI_MCP_MINIMUM_VERSION,
    'AMAMI_MCP_MINIMUM_VERSION',
  );

  if (
    latestVersion &&
    minimumSupportedVersion &&
    semver.gt(minimumSupportedVersion, latestVersion)
  ) {
    throw new Error('AMAMI_MCP_MINIMUM_VERSION must not be greater than AMAMI_MCP_LATEST_VERSION');
  }

  return {
    latestVersion,
    minimumSupportedVersion,
    protocolVersion: process.env.AMAMI_MCP_PROTOCOL_VERSION || '2026-07-18',
    message: process.env.AMAMI_MCP_UPDATE_MESSAGE || undefined,
    docsUrl: process.env.AMAMI_MCP_UPDATE_DOCS_URL || 'https://docs.amami.dev/docs/mcp-config/',
  };
}

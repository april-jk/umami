import type { Metadata } from 'next';
import { createMcpConsentToken, isLoopbackRedirectUri } from '@/lib/mcp-auth';
import { McpConnectPage } from './McpConnectPage';

export const dynamic = 'force-dynamic';

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const redirectUri = readParam(params.redirect_uri);
  const state = readParam(params.state);
  const codeChallenge = readParam(params.code_challenge);
  const write = readParam(params.write) !== '0';

  if (!redirectUri || !isLoopbackRedirectUri(redirectUri)) {
    return <McpConnectPage errorMessage={badRedirectUriMessage()} />;
  }

  if (!state || state.length < 16 || !codeChallenge || codeChallenge.length < 32) {
    return (
      <McpConnectPage errorMessage="The MCP authorization link is missing required security parameters." />
    );
  }

  const consentToken = createMcpConsentToken({
    redirectUri,
    state,
    codeChallenge,
    codeChallengeMethod: 'S256',
    write,
  });

  return <McpConnectPage consentToken={consentToken} />;
}

export const metadata: Metadata = {
  title: 'Connect MCP',
};

function readParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function badRedirectUriMessage() {
  return 'MCP authorization must use a local callback URL such as http://127.0.0.1:49152/callback.';
}

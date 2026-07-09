'use client';
import { Button, Column, Heading, Loading, Text } from '@umami/react-zen';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useApi, useLoginQuery } from '@/components/hooks';

export function McpConnectPage({
  consentToken,
  errorMessage,
}: {
  consentToken?: string;
  errorMessage?: string;
}) {
  const router = useRouter();
  const search = useSearchParams();
  const { post } = useApi();
  const { user, isLoading } = useLoginQuery();
  const [error, setError] = useState<string | undefined>(errorMessage);
  const [isPending, setIsPending] = useState(false);
  const currentPath = useMemo(() => {
    const query = search.toString();
    return `/mcp/connect${query ? `?${query}` : ''}`;
  }, [search]);

  const redirectUri = search.get('redirect_uri') || '';
  const state = search.get('state') || '';
  const codeChallenge = search.get('code_challenge') || '';
  const write = search.get('write') !== '0';

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace(`/login?returnTo=${encodeURIComponent(currentPath)}`);
    }
  }, [currentPath, isLoading, router, user]);

  const handleAuthorize = async () => {
    if (!consentToken) {
      setError(errorMessage || 'The MCP authorization link is invalid. Please run setup again.');
      return;
    }

    setError(undefined);
    setIsPending(true);

    try {
      const result = await post('/auth/mcp/authorize', {
        redirectUri,
        state,
        codeChallenge,
        codeChallengeMethod: 'S256',
        write,
        consentToken,
      });

      window.location.assign(result.redirectUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setIsPending(false);
    }
  };

  if (isLoading || !user) {
    return <Loading placement="absolute" />;
  }

  return (
    <Column
      alignItems="center"
      justifyContent="flex-start"
      height="100vh"
      backgroundColor="surface-raised"
      style={{ paddingTop: '15vh' }}
    >
      <Column gap="4" style={{ width: 420, maxWidth: 'calc(100vw - 32px)' }}>
        <Heading>Connect Amami MCP</Heading>
        <Text>
          Authorize your local MCP server to create an API key for {user.username}. You can revoke
          this key later from API key settings.
        </Text>
        {write && (
          <Text color="muted">Write tools will be enabled for website setup and events.</Text>
        )}
        {error && <Text color="red">{error}</Text>}
        <Button variant="primary" onPress={handleAuthorize} isDisabled={isPending || !consentToken}>
          Authorize MCP
        </Button>
      </Column>
    </Column>
  );
}

'use client';

import { Loading } from '@umami/react-zen';
import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { setClientAuthToken } from '@/lib/client';

export function OAuthCompletePage() {
  const router = useRouter();
  const hasExchanged = useRef(false);

  useEffect(() => {
    const code = new URLSearchParams(window.location.hash.slice(1)).get('code');

    if (!code || hasExchanged.current) {
      router.replace('/login?oauthError=failed');
      return;
    }

    hasExchanged.current = true;

    fetch('/api/auth/oauth/exchange', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ code }),
    })
      .then(async response => {
        if (!response.ok) {
          throw new Error('OAuth login code exchange failed');
        }

        return response.json();
      })
      .then(({ token }) => {
        if (typeof token !== 'string') {
          throw new Error('OAuth login response did not include a token');
        }

        window.history.replaceState(null, '', window.location.pathname);
        setClientAuthToken(token);
        router.replace('/dashboard');
      })
      .catch(() => router.replace('/login?oauthError=failed'));
  }, [router]);

  return <Loading placement="absolute" />;
}

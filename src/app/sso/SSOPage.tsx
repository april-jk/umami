'use client';
import { Loading } from '@umami/react-zen';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { setClientAuthToken } from '@/lib/client';
import { isSafeRedirectUrl } from '@/lib/redirect';

export function SSOPage() {
  const router = useRouter();
  const search = useSearchParams();
  const url = search.get('url');
  const token = search.get('token');

  useEffect(() => {
    if (url && token) {
      if (!isSafeRedirectUrl(url)) {
        router.push('/');
        return;
      }

      setClientAuthToken(token);
      router.push(url);
    }
  }, [router, url, token]);

  return <Loading placement="absolute" />;
}

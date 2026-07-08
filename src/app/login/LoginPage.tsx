'use client';
import { Column, Loading } from '@umami/react-zen';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { useLoginQuery } from '@/components/hooks';
import { isSafeRedirectUrl } from '@/lib/redirect';
import { LoginForm } from './LoginForm';

export function LoginPage() {
  const { user, isLoading } = useLoginQuery();
  const router = useRouter();
  const search = useSearchParams();
  const returnTo = search.get('returnTo') || '/dashboard';
  const safeReturnTo = isSafeRedirectUrl(returnTo) ? returnTo : '/dashboard';

  useEffect(() => {
    if (user) {
      router.replace(safeReturnTo);
    }
  }, [user, router, safeReturnTo]);

  if (isLoading || user) {
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
      <LoginForm returnTo={safeReturnTo} />
    </Column>
  );
}

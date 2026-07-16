'use client';
import { Loading } from '@umami/react-zen';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { useLoginQuery, useMessages } from '@/components/hooks';
import { Logo } from '@/components/svg';
import { isSafeRedirectUrl } from '@/lib/redirect';
import { LoginForm } from './LoginForm';
import styles from './LoginPage.module.css';

export function LoginPage() {
  const { user, isLoading } = useLoginQuery();
  const { t } = useMessages();
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
    <main className={styles.page}>
      <section className={styles.brandPanel} aria-labelledby="amami-auth-title">
        <div className={styles.brandContent}>
          <Logo className={styles.brandMark} aria-hidden="true" />
          <p className={styles.eyebrow}>{t('auth.eyebrow')}</p>
          <h1 id="amami-auth-title">{t('auth.headline')}</h1>
          <p className={styles.brandNote}>{t('auth.brandNote')}</p>
        </div>
        <div className={styles.brandRule} aria-hidden="true" />
      </section>

      <section className={styles.formPanel} aria-label={t('auth.accountAccess')}>
        <div className={styles.mobileBrand} aria-hidden="true">
          <Logo className={styles.mobileMark} />
        </div>
        <LoginForm returnTo={safeReturnTo} />
      </section>
    </main>
  );
}

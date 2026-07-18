'use client';

import { Loading } from '@umami/react-zen';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { LoginForm } from '@/app/login/LoginForm';
import styles from '@/app/login/LoginPage.module.css';
import { setClientAuthToken } from '@/lib/client';

export function OAuthLinkPage() {
  const router = useRouter();
  const [code, setCode] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const hasReadCode = useRef(false);

  useEffect(() => {
    if (hasReadCode.current) return;

    hasReadCode.current = true;
    const value = new URLSearchParams(window.location.hash.slice(1)).get('code');
    setCode(value);
    setIsReady(true);
    window.history.replaceState(null, '', window.location.pathname);
  }, []);

  useEffect(() => {
    if (isReady && !code) {
      router.replace('/login?oauthError=failed');
    }
  }, [code, isReady, router]);

  if (!isReady) {
    return <Loading placement="absolute" />;
  }

  if (!code) {
    return <Loading placement="absolute" />;
  }

  const handleAuthenticated = async (token: string, password: string) => {
    const response = await fetch('/api/auth/oauth/link', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ code, password }),
    });
    const payload = await response.json();

    if (!response.ok) {
      throw Object.assign(new Error(payload?.error?.message || 'OAuth account linking failed'), {
        ...payload?.error,
      });
    }

    setClientAuthToken(token);
    router.replace('/dashboard');
  };

  return (
    <main className={styles.page}>
      <section className={styles.formPanel} aria-label="Link your OAuth account">
        <div className={styles.formContent}>
          <header className={styles.formHeader}>
            <p className={styles.formKicker}>Confirm account linking</p>
            <h1>Sign in to link this verified OAuth email</h1>
            <p>
              Use the existing account password. Registration and other OAuth accounts are disabled
              here.
            </p>
          </header>
          <LoginForm
            onAuthenticated={handleAuthenticated}
            allowRegistration={false}
            showOAuthProviders={false}
          />
        </div>
      </section>
    </main>
  );
}

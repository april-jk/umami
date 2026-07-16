import { Button } from '@umami/react-zen';
import { useMessages } from '@/components/hooks';
import styles from './LoginPage.module.css';

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        fill="#4285F4"
        d="M21.35 12.27c0-.75-.07-1.47-.19-2.17H12v4.1h5.24a4.48 4.48 0 0 1-1.94 2.94v2.66h3.43c2-1.84 2.62-4.56 2.62-7.53Z"
      />
      <path
        fill="#34A853"
        d="M12 21.75c2.62 0 4.82-.87 6.43-2.35L15 16.74c-.88.59-1.99.94-3 .94-2.31 0-4.27-1.56-4.97-3.66H3.48v2.74A9.72 9.72 0 0 0 12 21.75Z"
      />
      <path
        fill="#FBBC05"
        d="M7.03 14.02A5.85 5.85 0 0 1 6.75 12c0-.7.12-1.38.28-2.02V7.24H3.48A9.75 9.75 0 0 0 2.25 12c0 1.57.38 3.06 1.23 4.76l3.55-2.74Z"
      />
      <path
        fill="#EA4335"
        d="M12 6.32c1.42 0 2.69.49 3.69 1.45l2.77-2.77C16.82 3.47 14.62 2.25 12 2.25a9.72 9.72 0 0 0-8.52 4.99l3.55 2.74C7.73 7.88 9.69 6.32 12 6.32Z"
      />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        d="M12 2.25a9.75 9.75 0 0 0-3.08 19c.49.09.67-.21.67-.47v-1.7c-2.74.6-3.32-1.16-3.32-1.16-.45-1.14-1.1-1.44-1.1-1.44-.9-.61.07-.6.07-.6 1 .07 1.52 1.03 1.52 1.03.88 1.51 2.32 1.07 2.88.82.09-.64.35-1.07.63-1.32-2.19-.25-4.49-1.09-4.49-4.88 0-1.08.39-1.97 1.02-2.66-.1-.25-.44-1.26.1-2.63 0 0 .83-.27 2.69 1.02A9.33 9.33 0 0 1 12 6.42c.83 0 1.66.11 2.43.33 1.86-1.29 2.69-1.02 2.69-1.02.54 1.37.2 2.38.1 2.63.63.69 1.02 1.58 1.02 2.66 0 3.8-2.3 4.62-4.5 4.87.35.31.67.91.67 1.84v3.05c0 .26.18.57.68.47A9.75 9.75 0 0 0 12 2.25Z"
      />
    </svg>
  );
}

export function OAuthProviderButtons() {
  const { t } = useMessages();

  return (
    <div className={styles.oauthSection} aria-label={t('auth.socialSignIn')}>
      <div className={styles.oauthDivider} aria-hidden="true">
        <span />
        <span>{t('auth.continueWith')}</span>
        <span />
      </div>
      <div className={styles.oauthButtons}>
        <Button
          type="button"
          variant="outline"
          aria-label={t('auth.continueWithGoogle')}
          onPress={() => window.location.assign('/api/auth/oauth/google')}
        >
          <GoogleIcon />
          <span>Google</span>
        </Button>
        <Button
          type="button"
          variant="outline"
          aria-label={t('auth.continueWithGitHub')}
          onPress={() => window.location.assign('/api/auth/oauth/github')}
        >
          <GitHubIcon />
          <span>GitHub</span>
        </Button>
      </div>
    </div>
  );
}

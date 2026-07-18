import {
  Button,
  Column,
  Form,
  FormButtons,
  FormField,
  FormSubmitButton,
  Heading,
  PasswordField,
  TextField,
} from '@umami/react-zen';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useMessages, useUpdateQuery } from '@/components/hooks';
import { setClientAuthToken } from '@/lib/client';
import styles from './LoginPage.module.css';
import { OAuthProviderButtons } from './OAuthProviderButtons';

export function LoginForm({
  returnTo = '/dashboard',
  onAuthenticated,
  allowRegistration = true,
  showOAuthProviders = true,
}: {
  returnTo?: string;
  onAuthenticated?: (token: string, password: string) => Promise<void>;
  allowRegistration?: boolean;
  showOAuthProviders?: boolean;
}) {
  const { t, labels, getErrorMessage } = useMessages();
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const { mutateAsync, error, isPending } = useUpdateQuery(
    mode === 'login' ? '/auth/login' : '/auth/register',
  );
  const isRegister = mode === 'register';

  const handleSubmit = async (data: any) => {
    const { token } = await mutateAsync(data);

    if (onAuthenticated) {
      await onAuthenticated(token, data.password);
    } else {
      setClientAuthToken(token);
      router.replace(returnTo);
    }
  };

  return (
    <Column className={styles.formContent} gap="8">
      <header className={styles.formHeader}>
        <p className={styles.formKicker}>
          {isRegister ? t('auth.newToAmami') : t('auth.welcomeBack')}
        </p>
        <Heading as="h2" size="lg">
          {isRegister ? t('auth.createWorkspace') : t('auth.signIn')}
        </Heading>
      </header>
      <Form onSubmit={handleSubmit} error={getErrorMessage(error)} className={styles.authForm}>
        <FormField
          label={t('auth.username')}
          data-test="input-username"
          name="username"
          rules={{
            required: t('auth.required'),
            ...(isRegister
              ? { minLength: { value: 3, message: t('auth.usernameMinLength') } }
              : {}),
          }}
        >
          <TextField autoComplete={isRegister ? 'username' : 'username'} />
        </FormField>

        {isRegister && (
          <FormField
            label={t(labels.email)}
            data-test="input-email"
            name="email"
            rules={{ required: t('auth.required') }}
          >
            <TextField autoComplete="email" inputMode="email" />
          </FormField>
        )}

        <FormField
          label={t('auth.password')}
          data-test="input-password"
          name="password"
          rules={{
            required: t('auth.required'),
            ...(isRegister
              ? { minLength: { value: 8, message: t('auth.passwordMinLength') } }
              : {}),
          }}
        >
          <PasswordField autoComplete={isRegister ? 'new-password' : 'current-password'} />
        </FormField>
        <FormButtons>
          <FormSubmitButton
            data-test="button-submit"
            variant="primary"
            style={{ flex: 1, minHeight: 44 }}
            isDisabled={isPending}
          >
            {isRegister ? t('auth.createAccount') : t('auth.login')}
          </FormSubmitButton>
        </FormButtons>
        {allowRegistration && (
          <Button
            type="button"
            variant="quiet"
            onPress={() => setMode(isRegister ? 'login' : 'register')}
            style={{ width: '100%', minHeight: 44 }}
          >
            {isRegister ? t('auth.useExistingAccount') : t('auth.createNewAccount')}
          </Button>
        )}
        {showOAuthProviders && <OAuthProviderButtons />}
      </Form>
    </Column>
  );
}

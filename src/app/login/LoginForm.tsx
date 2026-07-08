import {
  Button,
  Column,
  Form,
  FormButtons,
  FormField,
  FormSubmitButton,
  Heading,
  Icon,
  PasswordField,
  TextField,
} from '@umami/react-zen';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useMessages, useUpdateQuery } from '@/components/hooks';
import { Logo } from '@/components/svg';
import { setClientAuthToken } from '@/lib/client';

export function LoginForm() {
  const { t, labels, messages, getErrorMessage } = useMessages();
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const { mutateAsync, error, isPending } = useUpdateQuery(
    mode === 'login' ? '/auth/login' : '/auth/register',
  );
  const isRegister = mode === 'register';

  const handleSubmit = async (data: any) => {
    await mutateAsync(data, {
      onSuccess: async ({ token }) => {
        setClientAuthToken(token);
        router.replace('/');
      },
    });
  };

  return (
    <Column justifyContent="center" alignItems="center" gap="6">
      <Icon size="lg">
        <Logo />
      </Icon>
      <Heading>Amami</Heading>
      <Form onSubmit={handleSubmit} error={getErrorMessage(error)} style={{ minWidth: 300 }}>
        <FormField
          label={t(labels.username)}
          data-test="input-username"
          name="username"
          rules={{
            required: t(labels.required),
            ...(isRegister
              ? { minLength: { value: 3, message: 'Use at least 3 characters.' } }
              : {}),
          }}
        >
          <TextField autoComplete={isRegister ? 'username' : 'username'} />
        </FormField>

        <FormField
          label={t(labels.password)}
          data-test="input-password"
          name="password"
          rules={{
            required: t(labels.required),
            ...(isRegister
              ? { minLength: { value: 8, message: t(messages.minPasswordLength, { n: '8' }) } }
              : {}),
          }}
        >
          <PasswordField autoComplete={isRegister ? 'new-password' : 'current-password'} />
        </FormField>
        <FormButtons>
          <FormSubmitButton
            data-test="button-submit"
            variant="primary"
            style={{ flex: 1 }}
            isDisabled={isPending}
          >
            {isRegister ? 'Create account' : t(labels.login)}
          </FormSubmitButton>
        </FormButtons>
        <Button
          type="button"
          variant="quiet"
          onPress={() => setMode(isRegister ? 'login' : 'register')}
          style={{ width: '100%' }}
        >
          {isRegister ? 'Use an existing account' : 'Create a new account'}
        </Button>
      </Form>
    </Column>
  );
}

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vitest';
import { useMessages, useUpdateQuery } from '@/components/hooks';
import { setClientAuthToken } from '@/lib/client';
import { LoginForm } from './LoginForm';

const { replaceMock, oauthProviderButtonsMock } = vi.hoisted(() => ({
  replaceMock: vi.fn(),
  oauthProviderButtonsMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: replaceMock }) }));
vi.mock('@/components/hooks', () => ({ useMessages: vi.fn(), useUpdateQuery: vi.fn() }));
vi.mock('@/lib/client', () => ({ setClientAuthToken: vi.fn() }));
vi.mock('./LoginPage.module.css', () => ({ default: {} }));
vi.mock('./OAuthProviderButtons', () => ({
  OAuthProviderButtons: () => {
    oauthProviderButtonsMock();
    return <div>OAuth providers</div>;
  },
}));
vi.mock('@umami/react-zen', () => ({
  Button: ({ children, onPress, ...props }: any) => (
    <button {...props} type="button" onClick={onPress}>
      {children}
    </button>
  ),
  Column: ({ children }: any) => <div>{children}</div>,
  Form: ({ children, onSubmit }: any) => (
    <form
      onSubmit={event => {
        event.preventDefault();
        onSubmit({ username: 'user@example.com', password: 'password' });
      }}
    >
      {children}
    </form>
  ),
  FormButtons: ({ children }: any) => <div>{children}</div>,
  FormField: ({ children }: any) => <label>{children}</label>,
  FormSubmitButton: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  Heading: ({ children }: any) => <h2>{children}</h2>,
  PasswordField: () => <input type="password" />,
  TextField: () => <input type="text" />,
}));

const useMessagesMock = vi.mocked(useMessages);
const useUpdateQueryMock = vi.mocked(useUpdateQuery);
const setClientAuthTokenMock = vi.mocked(setClientAuthToken);
const mutateAsyncMock = vi.fn();

beforeEach(() => {
  replaceMock.mockReset();
  oauthProviderButtonsMock.mockReset();
  setClientAuthTokenMock.mockReset();
  mutateAsyncMock.mockReset();
  useMessagesMock.mockReturnValue({ t: (key: string) => key, getErrorMessage: vi.fn() } as any);
  useUpdateQueryMock.mockReturnValue({
    mutateAsync: mutateAsyncMock,
    error: null,
    isPending: false,
  } as any);
});

test('logs in normally and allows switching to registration', async () => {
  mutateAsyncMock.mockResolvedValue({ token: 'token' });
  render(<LoginForm returnTo="/return-to" />);

  expect(screen.getByText('OAuth providers')).toBeTruthy();
  const form = screen.getByRole('button', { name: 'auth.login' }).closest('form');
  if (!form) throw new Error('Login form not found');
  fireEvent.submit(form);

  await waitFor(() => expect(setClientAuthTokenMock).toHaveBeenCalledWith('token'));
  expect(replaceMock).toHaveBeenCalledWith('/return-to');
  expect(useUpdateQueryMock).toHaveBeenLastCalledWith('/auth/login');

  fireEvent.click(screen.getByRole('button', { name: 'auth.createNewAccount' }));
  expect(screen.getByRole('button', { name: 'auth.createAccount' })).toBeTruthy();
  expect(useUpdateQueryMock).toHaveBeenLastCalledWith('/auth/register');
});

test('uses the supplied identity-confirmation callback without exposing other login paths', async () => {
  const onAuthenticated = vi.fn().mockResolvedValue(undefined);
  mutateAsyncMock.mockResolvedValue({ token: 'password-token' });
  render(
    <LoginForm
      allowRegistration={false}
      showOAuthProviders={false}
      onAuthenticated={onAuthenticated}
    />,
  );

  expect(screen.queryByText('OAuth providers')).toBeNull();
  expect(screen.queryByRole('button', { name: 'auth.createNewAccount' })).toBeNull();
  const form = screen.getByRole('button', { name: 'auth.login' }).closest('form');
  if (!form) throw new Error('Login form not found');
  fireEvent.submit(form);

  await waitFor(() => expect(onAuthenticated).toHaveBeenCalledWith('password-token'));
  expect(setClientAuthTokenMock).not.toHaveBeenCalled();
  expect(replaceMock).not.toHaveBeenCalled();
});

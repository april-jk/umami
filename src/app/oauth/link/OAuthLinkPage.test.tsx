import { act, render, waitFor } from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vitest';
import { setClientAuthToken } from '@/lib/client';
import { OAuthLinkPage } from './OAuthLinkPage';

const { replaceMock, loginFormMock } = vi.hoisted(() => ({
  replaceMock: vi.fn(),
  loginFormMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: replaceMock }) }));
vi.mock('@/lib/client', () => ({ setClientAuthToken: vi.fn() }));
vi.mock('@/app/login/LoginPage.module.css', () => ({ default: {} }));
vi.mock('@/app/login/LoginForm', () => ({
  LoginForm: (props: any) => {
    loginFormMock(props);
    return <button type="button">Password login</button>;
  },
}));
vi.mock('@umami/react-zen', () => ({ Loading: () => <div>Loading</div> }));

const setClientAuthTokenMock = vi.mocked(setClientAuthToken);

beforeEach(() => {
  replaceMock.mockReset();
  loginFormMock.mockReset();
  setClientAuthTokenMock.mockReset();
  vi.stubGlobal('fetch', vi.fn());
  window.history.replaceState(null, '', '/oauth/link#code=link-code');
});

test('reads and clears an OAuth link code before showing password-only confirmation', async () => {
  render(<OAuthLinkPage />);

  await waitFor(() => expect(loginFormMock).toHaveBeenCalled());

  expect(window.location.hash).toBe('');
  expect(loginFormMock).toHaveBeenLastCalledWith(
    expect.objectContaining({ allowRegistration: false, showOAuthProviders: false }),
  );
});

test('links with the password-login token before saving it locally', async () => {
  vi.mocked(fetch).mockResolvedValue(
    new Response(JSON.stringify({ linked: true }), { status: 200 }),
  );
  render(<OAuthLinkPage />);
  await waitFor(() => expect(loginFormMock).toHaveBeenCalled());

  await act(async () => {
    await loginFormMock.mock.lastCall?.[0].onAuthenticated('password-login-token');
  });

  expect(fetch).toHaveBeenCalledWith('/api/auth/oauth/link', {
    method: 'POST',
    headers: {
      authorization: 'Bearer password-login-token',
      'content-type': 'application/json',
    },
    body: JSON.stringify({ code: 'link-code' }),
  });
  expect(setClientAuthTokenMock).toHaveBeenCalledWith('password-login-token');
  expect(replaceMock).toHaveBeenCalledWith('/dashboard');
});

test('does not save a token when linking is rejected', async () => {
  vi.mocked(fetch).mockResolvedValue(
    new Response(
      JSON.stringify({ error: { code: 'oauth-email-mismatch', message: 'Wrong user' } }),
      {
        status: 400,
      },
    ),
  );
  render(<OAuthLinkPage />);
  await waitFor(() => expect(loginFormMock).toHaveBeenCalled());

  await expect(
    loginFormMock.mock.lastCall?.[0].onAuthenticated('password-login-token'),
  ).rejects.toThrow('Wrong user');

  expect(setClientAuthTokenMock).not.toHaveBeenCalled();
  expect(replaceMock).not.toHaveBeenCalledWith('/dashboard');
});

test('returns to login when the fragment does not contain a linking code', async () => {
  window.history.replaceState(null, '', '/oauth/link');
  render(<OAuthLinkPage />);

  await waitFor(() => expect(replaceMock).toHaveBeenCalledWith('/login?oauthError=failed'));
  expect(loginFormMock).not.toHaveBeenCalled();
});

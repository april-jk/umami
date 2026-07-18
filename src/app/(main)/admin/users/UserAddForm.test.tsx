import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vitest';
import { useMessages, useUpdateQuery } from '@/components/hooks';
import { UserAddForm } from './UserAddForm';

vi.mock('@/components/hooks', () => ({ useMessages: vi.fn(), useUpdateQuery: vi.fn() }));
vi.mock('@umami/react-zen', () => ({
  Button: ({ children, onPress, ...props }: any) => (
    <button type="button" onClick={onPress} {...props}>
      {children}
    </button>
  ),
  Form: ({ children, onSubmit }: any) => (
    <form
      onSubmit={event => {
        event.preventDefault();
        onSubmit({
          username: 'admin-user',
          email: 'admin@example.com',
          password: 'password123',
          role: 'user',
        });
      }}
    >
      {children}
    </form>
  ),
  FormButtons: ({ children }: any) => <div>{children}</div>,
  FormField: ({ label, children }: any) => (
    <label>
      {label}
      {children}
    </label>
  ),
  FormSubmitButton: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  ListItem: ({ children }: any) => <option>{children}</option>,
  PasswordField: (props: any) => <input type="password" {...props} />,
  Select: ({ children }: any) => <select>{children}</select>,
  TextField: (props: any) => <input type="text" {...props} />,
}));

const useMessagesMock = vi.mocked(useMessages);
const useUpdateQueryMock = vi.mocked(useUpdateQuery);
const mutateAsyncMock = vi.fn();

beforeEach(() => {
  mutateAsyncMock.mockReset();
  useMessagesMock.mockReturnValue({
    t: (key: string) => key,
    labels: {
      cancel: 'cancel',
      email: 'email',
      password: 'password',
      required: 'required',
      role: 'role',
      save: 'save',
      username: 'username',
      viewOnly: 'viewOnly',
      user: 'user',
      admin: 'admin',
    },
    messages: { minPasswordLength: 'minPasswordLength' },
    getErrorMessage: vi.fn(),
  } as any);
  useUpdateQueryMock.mockReturnValue({
    mutateAsync: mutateAsyncMock,
    error: null,
    isPending: false,
  } as any);
});

test('requires an email input and submits it with the admin user form', async () => {
  const onSave = vi.fn();
  const onClose = vi.fn();
  mutateAsyncMock.mockImplementation(async (_data, options) => options.onSuccess());
  render(<UserAddForm onSave={onSave} onClose={onClose} />);

  expect(document.querySelector('[data-test="input-email"]')).toBeTruthy();
  const form = screen.getByRole('button', { name: 'save' }).closest('form');
  if (!form) throw new Error('Admin user form not found');
  fireEvent.submit(form);

  await waitFor(() =>
    expect(mutateAsyncMock).toHaveBeenCalledWith(
      {
        username: 'admin-user',
        email: 'admin@example.com',
        password: 'password123',
        role: 'user',
      },
      expect.any(Object),
    ),
  );
  expect(onSave).toHaveBeenCalledWith({
    username: 'admin-user',
    email: 'admin@example.com',
    password: 'password123',
    role: 'user',
  });
  expect(onClose).toHaveBeenCalledTimes(1);
});

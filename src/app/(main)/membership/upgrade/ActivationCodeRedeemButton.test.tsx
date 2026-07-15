import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vitest';
import { useApi, useMessages } from '@/components/hooks';
import { useModified } from '@/components/hooks/useModified';
import { ActivationCodeRedeemButton } from './ActivationCodeRedeemButton';

let formProps: any;
let closeDialog: ReturnType<typeof vi.fn>;
const toast = vi.fn();

vi.mock('@umami/react-zen', () => ({
  Button: ({ children, isDisabled, onPress, ...props }: any) => (
    <button type="button" disabled={isDisabled} onClick={onPress} {...props}>
      {children}
    </button>
  ),
  Dialog: ({ children, title }: any) => (
    <section aria-label={title}>
      {typeof children === 'function' ? children({ close: closeDialog }) : children}
    </section>
  ),
  DialogTrigger: ({ children }: any) => <div>{children}</div>,
  Form: ({ children, ...props }: any) => {
    formProps = props;
    return <form>{children}</form>;
  },
  FormButtons: ({ children }: any) => <div>{children}</div>,
  FormField: ({ children, description, label }: any) => (
    <label>
      {label}
      {description}
      {children}
    </label>
  ),
  FormSubmitButton: ({ children, isDisabled }: any) => (
    <button type="submit" disabled={isDisabled}>
      {children}
    </button>
  ),
  Icon: ({ children }: any) => <span>{children}</span>,
  Modal: ({ children }: any) => <div>{children}</div>,
  Text: ({ children }: any) => <span>{children}</span>,
  TextField: (props: any) => <input placeholder={props.placeholder} />,
  useToast: () => ({ toast }),
}));
vi.mock('@/components/hooks', () => ({ useApi: vi.fn(), useMessages: vi.fn() }));
vi.mock('@/components/hooks/useModified', () => ({ useModified: vi.fn() }));
vi.mock('@/components/icons', () => ({ Ticket: () => <span>ticket</span> }));

const useApiMock = vi.mocked(useApi);
const useModifiedMock = vi.mocked(useModified);

beforeEach(() => {
  vi.clearAllMocks();
  closeDialog = vi.fn();
  formProps = undefined;
  vi.mocked(useMessages).mockReturnValue({
    t: (key: string, values?: Record<string, string>) =>
      values ? `${key}:${values.plan}:${values.date}` : key,
    labels: { required: 'required', cancel: 'cancel' },
  } as any);
});

test('disables redemption until a tenant is available', async () => {
  const post = vi.fn();
  useApiMock.mockReturnValue({
    post,
    useMutation: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  } as any);
  useModifiedMock.mockReturnValue({ touch: vi.fn() } as any);

  render(<ActivationCodeRedeemButton />);

  expect(screen.getByTestId('button-use-activation-code')).toBeDisabled();
  await expect(formProps.onSubmit({ code: 'AMAMI-IGNORED' })).resolves.toBeUndefined();
  expect(post).not.toHaveBeenCalled();
});

test('redeems a code, refreshes membership state, shows success, and closes', async () => {
  const post = vi.fn().mockResolvedValue({
    plan: 'team',
    durationDays: 30,
    membershipEndsAt: '2026-08-15T00:00:00.000Z',
  });
  const touch = vi.fn();
  useApiMock.mockReturnValue({
    post,
    useMutation: vi.fn(({ mutationFn }) => ({ mutateAsync: mutationFn, isPending: false })),
  } as any);
  useModifiedMock.mockReturnValue({ touch } as any);

  render(<ActivationCodeRedeemButton tenantId="tenant-1" />);
  expect(screen.getByTestId('button-use-activation-code')).toBeEnabled();

  await act(() => formProps.onSubmit({ code: ' amami-new ' }));

  expect(post).toHaveBeenCalledWith('/membership/activation-code/redeem', {
    code: ' amami-new ',
    tenantId: 'tenant-1',
  });
  expect(touch).toHaveBeenNthCalledWith(1, 'tenant:tenant-1');
  expect(touch).toHaveBeenNthCalledWith(2, 'tenant-usage:tenant-1');
  expect(toast).toHaveBeenCalledWith(expect.stringContaining('membership.activationCode.redeemed'));
  expect(closeDialog).toHaveBeenCalledOnce();
});

test.each([
  [
    { code: 'invalid-code', message: 'Server fallback' },
    (key: string) =>
      key === 'membership.activationCode.errors.invalid-code' ? 'Invalid code' : key,
    'Invalid code',
  ],
  [{ code: 'unknown-error', message: 'Server fallback' }, (key: string) => key, 'Server fallback'],
] as const)('maps mutation errors to localized or server messages', (error, t, expected) => {
  vi.mocked(useMessages).mockReturnValue({
    t,
    labels: { required: 'required', cancel: 'cancel' },
  } as any);
  useApiMock.mockReturnValue({
    post: vi.fn(),
    useMutation: vi.fn(() => ({ mutateAsync: vi.fn(), error, isPending: false })),
  } as any);
  useModifiedMock.mockReturnValue({ touch: vi.fn() } as any);

  render(<ActivationCodeRedeemButton tenantId="tenant-1" />);

  expect(formProps.error).toBe(expected);
});

test('disables dialog actions while redemption is pending and allows cancellation', () => {
  useApiMock.mockReturnValue({
    post: vi.fn(),
    useMutation: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: true })),
  } as any);
  useModifiedMock.mockReturnValue({ touch: vi.fn() } as any);

  render(<ActivationCodeRedeemButton tenantId="tenant-1" />);

  expect(
    screen.getByRole('button', { name: 'membership.activationCode.redeeming' }),
  ).toBeDisabled();
  const cancel = screen.getByRole('button', { name: 'cancel' });
  expect(cancel).toBeDisabled();
  fireEvent.click(cancel);
  expect(closeDialog).not.toHaveBeenCalled();
});

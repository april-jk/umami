import { act, render, screen } from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vitest';
import { useApi, useMessages, useModified } from '@/components/hooks';
import { ActivationCodeForm } from './ActivationCodeForm';

let formProps: any;

vi.mock('@umami/react-zen', () => ({
  Button: ({ children, isDisabled, onPress }: any) => (
    <button type="button" disabled={isDisabled} onClick={onPress}>
      {children}
    </button>
  ),
  Form: ({ children, ...props }: any) => {
    formProps = props;
    return <form>{children}</form>;
  },
  FormButtons: ({ children }: any) => <div>{children}</div>,
  FormField: ({ children, description, label, name }: any) => (
    <label>
      {label}
      {description}
      <span data-field={name}>{children}</span>
    </label>
  ),
  FormSubmitButton: ({ children, isDisabled }: any) => (
    <button type="submit" disabled={isDisabled}>
      {children}
    </button>
  ),
  Grid: ({ children }: any) => <div>{children}</div>,
  ListItem: ({ children, id }: any) => <option value={id}>{children}</option>,
  Select: ({ children }: any) => <select>{children}</select>,
  TextField: (props: any) => <input data-placeholder={props.placeholder} />,
}));
vi.mock('@/components/hooks', () => ({
  useApi: vi.fn(),
  useMessages: vi.fn(),
  useModified: vi.fn(),
}));

const useApiMock = vi.mocked(useApi);
const useMessagesMock = vi.mocked(useMessages);
const useModifiedMock = vi.mocked(useModified);

const record = {
  id: 'code-1',
  codePrefix: 'AMAMI123',
  name: null,
  note: null,
  plan: 'team',
  durationDays: 45,
  startsAt: '2026-07-01T08:30:00.000Z',
  expiresAt: null,
  maxRedemptions: 5,
  redemptionCount: 1,
  status: 'disabled',
  isActive: false,
  createdAt: '2026-06-01T00:00:00.000Z',
  _count: { redemptions: 1 },
} as any;

beforeEach(() => {
  vi.clearAllMocks();
  formProps = undefined;
  useMessagesMock.mockReturnValue({
    t: (key: string) => key,
    labels: { name: 'name', required: 'required', cancel: 'cancel', save: 'save' },
  } as any);
});

test('creates a code, normalizes form values, and refreshes both query scopes', async () => {
  const post = vi.fn().mockResolvedValue({ id: 'new-code', code: 'AMAMI-NEW' });
  const touch = vi.fn();
  const onSave = vi.fn();
  const onClose = vi.fn();
  useApiMock.mockReturnValue({
    post,
    put: vi.fn(),
    useMutation: vi.fn(({ mutationFn }) => ({ mutateAsync: mutationFn, isPending: false })),
  } as any);
  useModifiedMock.mockReturnValue({ touch } as any);

  render(<ActivationCodeForm onSave={onSave} onClose={onClose} />);

  expect(formProps.defaultValues).toMatchObject({
    code: '',
    plan: 'pro',
    durationDays: 30,
    maxRedemptions: 1,
    status: 'active',
  });
  expect(formProps.defaultValues.startsAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
  expect(screen.getByText('activationCodes.codeactivationCodes.codeHelp')).toBeInTheDocument();

  await act(() =>
    formProps.onSubmit({
      code: ' AMAMI-NEW ',
      name: '',
      note: '',
      plan: 'pro',
      durationDays: '60',
      maxRedemptions: '3',
      startsAt: '2026-08-01T10:00',
      expiresAt: '',
      status: 'active',
    }),
  );

  expect(post).toHaveBeenCalledWith(
    '/admin/activation-codes',
    expect.objectContaining({
      code: ' AMAMI-NEW ',
      name: null,
      note: null,
      durationDays: 60,
      maxRedemptions: 3,
      startsAt: new Date('2026-08-01T10:00').toISOString(),
      expiresAt: null,
    }),
  );
  expect(touch).toHaveBeenNthCalledWith(1, 'activation-codes');
  expect(touch).toHaveBeenNthCalledWith(2, 'activation-code:new-code');
  expect(onSave).toHaveBeenCalledWith({ id: 'new-code', code: 'AMAMI-NEW' });
  expect(onClose).toHaveBeenCalledOnce();
});

test('updates an existing code with date defaults and optional values', async () => {
  const put = vi.fn().mockResolvedValue({ ...record, name: 'Campaign' });
  const touch = vi.fn();
  useApiMock.mockReturnValue({
    post: vi.fn(),
    put,
    useMutation: vi.fn(({ mutationFn }) => ({ mutateAsync: mutationFn, isPending: false })),
  } as any);
  useModifiedMock.mockReturnValue({ touch } as any);

  render(<ActivationCodeForm activationCode={record} />);

  expect(formProps.defaultValues).toMatchObject({
    name: '',
    note: '',
    plan: 'team',
    startsAt: expect.stringMatching(/^2026-07-01T/),
    expiresAt: '',
    status: 'disabled',
  });
  expect(screen.queryByText(/activationCodes\.codeHelp/)).not.toBeInTheDocument();

  await act(() =>
    formProps.onSubmit({
      name: 'Campaign',
      note: 'Internal',
      plan: 'enterprise',
      durationDays: 90,
      maxRedemptions: 8,
      startsAt: '2026-08-01T10:00',
      expiresAt: '2026-09-01T10:00',
      status: 'active',
    }),
  );

  expect(put).toHaveBeenCalledWith(
    '/admin/activation-codes/code-1',
    expect.objectContaining({
      code: undefined,
      name: 'Campaign',
      note: 'Internal',
      expiresAt: new Date('2026-09-01T10:00').toISOString(),
    }),
  );
  expect(touch).toHaveBeenCalledWith('activation-code:code-1');
});

test('shows mutation errors and disables actions while saving', () => {
  useApiMock.mockReturnValue({
    post: vi.fn(),
    put: vi.fn(),
    useMutation: vi.fn(() => ({
      mutateAsync: vi.fn(),
      error: { message: 'Save failed' },
      isPending: true,
    })),
  } as any);
  useModifiedMock.mockReturnValue({ touch: vi.fn() } as any);

  render(<ActivationCodeForm onClose={vi.fn()} />);

  expect(formProps.error).toBe('Save failed');
  expect(screen.getAllByRole('button')).toHaveLength(2);
  expect(screen.getAllByRole('button').every(button => button.hasAttribute('disabled'))).toBe(true);
  expect(screen.getByRole('button', { name: 'activationCodes.saving' })).toBeInTheDocument();
});

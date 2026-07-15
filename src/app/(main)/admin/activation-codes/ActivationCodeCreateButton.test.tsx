import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vitest';
import { useMessages } from '@/components/hooks';
import { ActivationCodeCreateButton } from './ActivationCodeCreateButton';

const closeDialog = vi.fn();

vi.mock('@umami/react-zen', () => ({
  Button: ({ children, onPress, ...props }: any) => (
    <button type="button" onClick={onPress} {...props}>
      {children}
    </button>
  ),
  Dialog: ({ children, title }: any) => (
    <section aria-label={title}>
      <h2>{title}</h2>
      {typeof children === 'function' ? children({ close: closeDialog }) : children}
    </section>
  ),
  DialogTrigger: ({ children }: any) => <div>{children}</div>,
  Icon: ({ children }: any) => <span>{children}</span>,
  Modal: ({ children, isOpen }: any) => (isOpen === false ? null : <div>{children}</div>),
  Text: ({ children }: any) => <span>{children}</span>,
  TextField: ({ allowCopy, isReadOnly, value }: any) => (
    <input aria-label="created-code" data-copy={allowCopy} readOnly={isReadOnly} value={value} />
  ),
}));
vi.mock('@/components/hooks', () => ({ useMessages: vi.fn() }));
vi.mock('@/components/icons', () => ({ Plus: () => <span>plus</span> }));
vi.mock('./ActivationCodeForm', () => ({
  ActivationCodeForm: ({ onClose, onSave }: any) => (
    <div>
      <button type="button" onClick={() => onSave({ id: 'new', code: 'AMAMI-SECRET' })}>
        save-code
      </button>
      <button type="button" onClick={() => onSave({ id: 'new' })}>
        save-without-code
      </button>
      <button type="button" onClick={onClose}>
        close-create
      </button>
    </div>
  ),
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useMessages).mockReturnValue({ t: (key: string) => key } as any);
});

test('shows the generated secret once and clears it when done', () => {
  render(<ActivationCodeCreateButton />);

  expect(screen.getByTestId('button-create-activation-code')).toHaveTextContent(
    'activationCodes.create',
  );
  fireEvent.click(screen.getByRole('button', { name: 'close-create' }));
  expect(closeDialog).toHaveBeenCalledOnce();

  fireEvent.click(screen.getByRole('button', { name: 'save-without-code' }));
  expect(screen.queryByLabelText('created-code')).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'save-code' }));
  expect(screen.getByText('activationCodes.createdHelp')).toBeInTheDocument();
  expect(screen.getByLabelText('created-code')).toHaveValue('AMAMI-SECRET');
  expect(screen.getByLabelText('created-code')).toHaveAttribute('readonly');
  expect(screen.getByLabelText('created-code')).toHaveAttribute('data-copy', 'true');

  fireEvent.click(screen.getByRole('button', { name: 'activationCodes.done' }));
  expect(screen.queryByLabelText('created-code')).not.toBeInTheDocument();
});

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import { useApi, useMessages, useModified } from '@/components/hooks';
import { ActivationCodesTable } from './ActivationCodesTable';

const { toast } = vi.hoisted(() => ({ toast: vi.fn() }));

vi.mock('@umami/react-zen', () => ({
  Button: ({ children, onPress }: any) => (
    <button type="button" onClick={onPress}>
      {children}
    </button>
  ),
  DataColumn: () => null,
  DataTable: ({ children, data }: any) => (
    <div>
      {data.map((row: any) => (
        <div key={row.id}>
          {children.map((column: any, index: number) => (
            <div key={index}>
              {typeof column.props.children === 'function'
                ? column.props.children(row)
                : column.props.children}
            </div>
          ))}
        </div>
      ))}
    </div>
  ),
  Dialog: ({ children, title }: any) => (
    <section aria-label={title}>
      <h2>{title}</h2>
      {children}
    </section>
  ),
  Icon: ({ children }: any) => <span>{children}</span>,
  MenuItem: ({ children, isDisabled, onAction }: any) => (
    <button type="button" disabled={isDisabled} onClick={onAction}>
      {children}
    </button>
  ),
  Modal: ({ children, isOpen }: any) => (isOpen ? <div>{children}</div> : null),
  Row: ({ children }: any) => <span>{children}</span>,
  Text: ({ children }: any) => <span>{children}</span>,
  useToast: () => ({ toast }),
}));
vi.mock('@/components/common/Badge', () => ({
  Badge: ({ children }: any) => <span>{children}</span>,
}));
vi.mock('@/components/common/CopyButton', () => ({
  CopyButton: ({ label, value }: any) => <button aria-label={label}>copy:{value}</button>,
}));
vi.mock('@/components/common/SortableLabel', () => ({
  SortableLabel: ({ label }: any) => <span>{label}</span>,
}));
vi.mock('@/components/hooks', () => ({
  useApi: vi.fn(),
  useMessages: vi.fn(),
  useModified: vi.fn(),
}));
vi.mock('@/components/icons', () => ({
  Edit: () => <span>edit-icon</span>,
  Eye: () => <span>eye-icon</span>,
  Power: () => <span>enable-icon</span>,
  PowerOff: () => <span>disable-icon</span>,
  Trash: () => <span>trash-icon</span>,
}));
vi.mock('@/components/input/MenuButton', () => ({
  MenuButton: ({ children }: any) => <div>{children}</div>,
}));
vi.mock('./ActivationCodeDetails', () => ({
  ActivationCodeDetails: ({ activationCodeId }: any) => <div>details:{activationCodeId}</div>,
}));
vi.mock('./ActivationCodeForm', () => ({
  ActivationCodeForm: ({ activationCode, onClose }: any) => (
    <div>
      edit-form:{activationCode.id}
      <button type="button" onClick={onClose}>
        close-edit
      </button>
    </div>
  ),
}));
vi.mock('./ActivationCodeDeleteForm', () => ({
  ActivationCodeDeleteForm: ({ activationCodeId, codePrefix, onClose }: any) => (
    <div>
      delete-form:{activationCodeId}:{codePrefix}
      <button type="button" onClick={onClose}>
        close-delete
      </button>
    </div>
  ),
}));

const record = {
  id: 'code-1',
  code: 'AMAMI-TEST-1234',
  codePrefix: 'AMAMI123',
  name: null,
  note: null,
  plan: 'pro',
  durationDays: 30,
  startsAt: '2026-01-01T00:00:00.000Z',
  expiresAt: '2099-01-01T00:00:00.000Z',
  maxRedemptions: 10,
  redemptionCount: 1,
  status: 'active',
  isActive: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  _count: { redemptions: 1 },
} as any;

test('opens operations and explicitly disables an active code', async () => {
  const put = vi.fn().mockResolvedValue({ ...record, status: 'disabled' });
  const touch = vi.fn();
  vi.mocked(useApi).mockReturnValue({
    put,
    useMutation: vi.fn(({ mutationFn }) => ({ mutateAsync: mutationFn, isPending: false })),
  } as any);
  vi.mocked(useModified).mockReturnValue({ touch } as any);
  vi.mocked(useMessages).mockReturnValue({
    t: (key: string, values?: any) => (values?.count ? `${values.count} days` : key),
    labels: { name: 'name', view: 'view', edit: 'edit', delete: 'delete' },
  } as any);

  render(<ActivationCodesTable data={[record]} />);

  expect(screen.getByText('AMAMI-TEST-1234')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'activationCodes.copy' })).toHaveTextContent(
    'copy:AMAMI-TEST-1234',
  );
  expect(screen.getByText('-')).toBeInTheDocument();
  expect(screen.getByText(/2099/)).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: /activationCodes\.redemptionHistory/ }));
  expect(screen.getByText('details:code-1')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'activationCodes.done' }));
  expect(screen.queryByText('details:code-1')).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: /edit/ }));
  expect(screen.getByText(/edit-form:code-1/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'close-edit' }));
  expect(screen.queryByText(/edit-form:code-1/)).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: /activationCodes\.disable/ }));
  await waitFor(() =>
    expect(put).toHaveBeenCalledWith('/admin/activation-codes/code-1', { status: 'disabled' }),
  );
  expect(touch).toHaveBeenCalledWith('activation-codes');
  expect(touch).toHaveBeenCalledWith('activation-code:code-1');
  expect(toast).toHaveBeenCalledWith('activationCodes.statusUpdated');

  fireEvent.click(screen.getByRole('button', { name: /delete/ }));
  expect(screen.getByText(/delete-form:code-1:AMAMI123/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'close-delete' }));
  expect(screen.queryByText(/delete-form:code-1/)).not.toBeInTheDocument();
});

test('enables a disabled code and contains update failures', async () => {
  const put = vi
    .fn()
    .mockResolvedValueOnce({ ...record, status: 'active' })
    .mockRejectedValueOnce(new Error('Update failed'));
  const touch = vi.fn();
  vi.mocked(useApi).mockReturnValue({
    put,
    useMutation: vi.fn(({ mutationFn }) => ({ mutateAsync: mutationFn, isPending: false })),
  } as any);
  vi.mocked(useModified).mockReturnValue({ touch } as any);
  vi.mocked(useMessages).mockReturnValue({
    t: (key: string, values?: any) => (values?.count ? `${values.count} days` : key),
    labels: { name: 'name', edit: 'edit', delete: 'delete' },
  } as any);

  const { unmount } = render(<ActivationCodesTable data={[{ ...record, status: 'disabled' }]} />);
  fireEvent.click(screen.getByRole('button', { name: /activationCodes\.enable/ }));
  await waitFor(() =>
    expect(put).toHaveBeenCalledWith('/admin/activation-codes/code-1', { status: 'active' }),
  );
  expect(touch).toHaveBeenCalledWith('activation-codes');
  unmount();

  render(<ActivationCodesTable data={[record]} />);
  fireEvent.click(screen.getByRole('button', { name: /activationCodes\.disable/ }));
  await waitFor(() => expect(put).toHaveBeenCalledTimes(2));
  expect(touch).toHaveBeenCalledTimes(2);
  expect(toast).toHaveBeenLastCalledWith('Update failed');
});

import { fireEvent, render, screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import { useMessages } from '@/components/hooks';
import { ActivationCodesTable } from './ActivationCodesTable';

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
  MenuItem: ({ children, onAction }: any) => (
    <button type="button" onClick={onAction}>
      {children}
    </button>
  ),
  Modal: ({ children, isOpen }: any) => (isOpen ? <div>{children}</div> : null),
  Row: ({ children }: any) => <span>{children}</span>,
  Text: ({ children }: any) => <span>{children}</span>,
}));
vi.mock('@/components/common/Badge', () => ({
  Badge: ({ children }: any) => <span>{children}</span>,
}));
vi.mock('@/components/common/SortableLabel', () => ({
  SortableLabel: ({ label }: any) => <span>{label}</span>,
}));
vi.mock('@/components/hooks', () => ({ useMessages: vi.fn() }));
vi.mock('@/components/icons', () => ({
  Edit: () => <span>edit-icon</span>,
  Eye: () => <span>eye-icon</span>,
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

test('opens and closes detail, edit, and delete operations', () => {
  vi.mocked(useMessages).mockReturnValue({
    t: (key: string, values?: any) => (values?.count ? `${values.count} days` : key),
    labels: { name: 'name', view: 'view', edit: 'edit', delete: 'delete' },
  } as any);

  render(<ActivationCodesTable data={[record]} />);

  expect(screen.getByText('-')).toBeInTheDocument();
  expect(screen.getByText(/2099/)).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: /view/ }));
  expect(screen.getByText('details:code-1')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'activationCodes.done' }));
  expect(screen.queryByText('details:code-1')).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: /edit/ }));
  expect(screen.getByText(/edit-form:code-1/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'close-edit' }));
  expect(screen.queryByText(/edit-form:code-1/)).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: /delete/ }));
  expect(screen.getByText(/delete-form:code-1:AMAMI123/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'close-delete' }));
  expect(screen.queryByText(/delete-form:code-1/)).not.toBeInTheDocument();
});

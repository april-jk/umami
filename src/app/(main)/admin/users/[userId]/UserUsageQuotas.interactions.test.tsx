import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import { useAdminUserMembershipQuery, useUpdateAdminUserMembershipQuery } from '@/components/hooks';
import { UserUsageQuotas } from './UserUsageQuotas';

vi.mock('@umami/react-zen', () => ({
  Button: ({ children, isDisabled, onPress }: any) => (
    <button type="button" disabled={isDisabled} onClick={onPress}>
      {children}
    </button>
  ),
  Column: ({ children }: any) => <div>{children}</div>,
  Grid: ({ children }: any) => <div>{children}</div>,
  Label: ({ children }: any) => <label>{children}</label>,
  ListItem: ({ children, id }: any) => <option value={id}>{children}</option>,
  Row: ({ children }: any) => <div>{children}</div>,
  Select: ({ children, 'aria-label': ariaLabel, onChange, value }: any) => (
    <select aria-label={ariaLabel} value={value} onChange={event => onChange(event.target.value)}>
      {children}
    </select>
  ),
  Text: ({ children }: any) => <span>{children}</span>,
  TextField: ({ 'aria-label': ariaLabel, isDisabled, onChange, value }: any) => (
    <input
      aria-label={ariaLabel}
      disabled={isDisabled}
      value={value}
      onChange={event => onChange(event.target.value)}
    />
  ),
}));

vi.mock('@/components/common/LoadingPanel', () => ({
  LoadingPanel: ({ children }: any) => <div>{children}</div>,
}));
vi.mock('@/components/hooks', () => ({
  useAdminUserMembershipQuery: vi.fn(),
  useUpdateAdminUserMembershipQuery: vi.fn(),
}));

test('edits each quota mode and custom value before saving', async () => {
  const mutateAsync = vi.fn();
  vi.mocked(useAdminUserMembershipQuery).mockReturnValue({
    data: {
      tenant: { quotaOverrides: {} },
      usage: {
        defaults: { eventLimit: 100_000, websiteLimit: 5, memberLimit: 1 },
        events: { used: 0, limit: 100_000 },
        websites: { used: 0, limit: 5 },
        members: { used: 0, limit: 1 },
      },
    },
  } as any);
  vi.mocked(useUpdateAdminUserMembershipQuery).mockReturnValue({
    mutateAsync,
    isPending: false,
  } as any);

  render(<UserUsageQuotas userId="user-1" />);

  fireEvent.change(screen.getByLabelText('Events / month mode'), {
    target: { value: 'custom' },
  });
  fireEvent.change(screen.getByLabelText('Events / month custom value'), {
    target: { value: '123456' },
  });
  fireEvent.change(screen.getByLabelText('Websites mode'), { target: { value: 'unlimited' } });
  fireEvent.change(screen.getByLabelText('Members mode'), { target: { value: 'inherit' } });
  fireEvent.change(screen.getByLabelText('MCP calls / day mode'), {
    target: { value: 'custom' },
  });
  fireEvent.change(screen.getByLabelText('MCP calls / day custom value'), {
    target: { value: '75' },
  });
  fireEvent.change(screen.getByLabelText('MCP calls / month mode'), {
    target: { value: 'unlimited' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Save quota overrides' }));

  await waitFor(() =>
    expect(mutateAsync).toHaveBeenCalledWith({
      quotaOverrides: {
        eventLimit: 123_456,
        websiteLimit: null,
        memberLimit: 'inherit',
        mcpCallsPerDay: 75,
        mcpCallsPerMonth: null,
      },
    }),
  );
});

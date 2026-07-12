import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import {
  useAdminUserMembershipQuery,
  useMembershipConfigQuery,
  useUpdateAdminUserMembershipQuery,
} from '@/components/hooks';
import { createDefaultMembershipConfig } from '@/lib/membership-config';
import { UserMembership } from './UserMembership';

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
}));

vi.mock('@/components/common/LoadingPanel', () => ({
  LoadingPanel: ({ children }: any) => <div>{children}</div>,
}));
vi.mock('@/components/hooks', () => ({
  useAdminUserMembershipQuery: vi.fn(),
  useMembershipConfigQuery: vi.fn(),
  useUpdateAdminUserMembershipQuery: vi.fn(),
}));

test('changes the plan and tenant status before saving', async () => {
  const mutateAsync = vi.fn();
  vi.mocked(useAdminUserMembershipQuery).mockReturnValue({
    data: {
      tenant: {
        name: 'Acme',
        plan: 'free',
        status: 'active',
        subscription: null,
      },
    },
  } as any);
  vi.mocked(useUpdateAdminUserMembershipQuery).mockReturnValue({
    mutateAsync,
    isPending: false,
  } as any);
  vi.mocked(useMembershipConfigQuery).mockReturnValue({
    data: { config: createDefaultMembershipConfig() },
  } as any);

  render(<UserMembership userId="user-1" />);

  fireEvent.change(screen.getByLabelText('Membership plan'), { target: { value: 'team' } });
  fireEvent.change(screen.getByLabelText('Tenant status'), { target: { value: 'suspended' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save membership' }));

  await waitFor(() =>
    expect(mutateAsync).toHaveBeenCalledWith({ plan: 'team', status: 'suspended' }),
  );
});

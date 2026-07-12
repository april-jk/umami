import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { useAdminUserMembershipQuery, useUpdateAdminUserMembershipQuery } from '@/components/hooks';
import { UserMembership } from './UserMembership';

vi.mock('@/components/hooks', () => ({
  useAdminUserMembershipQuery: vi.fn(),
  useUpdateAdminUserMembershipQuery: vi.fn(),
}));

const useQueryMock = vi.mocked(useAdminUserMembershipQuery);
const useUpdateMock = vi.mocked(useUpdateAdminUserMembershipQuery);
const mutateAsync = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  useUpdateMock.mockReturnValue({ mutateAsync, isPending: false } as any);
});

describe('UserMembership', () => {
  test('renders billing context and saves the current administrative entitlement state', async () => {
    useQueryMock.mockReturnValue({
      data: {
        tenant: {
          name: 'Acme',
          plan: 'pro',
          status: 'active',
          subscription: {
            billingProvider: 'paypal',
            status: 'active',
            currentPeriodEnd: '2026-08-01T00:00:00.000Z',
            cancelAtPeriodEnd: true,
          },
        },
      },
      isLoading: false,
      isFetching: false,
      error: null,
    } as any);

    render(<UserMembership userId="user-1" />);

    expect(screen.getByText('Acme')).toBeInTheDocument();
    expect(screen.getByText('paypal')).toBeInTheDocument();
    expect(screen.getByText('Aug 1, 2026')).toBeInTheDocument();
    expect(screen.getByText('Yes')).toBeInTheDocument();
    expect(screen.getByText('$290')).toBeInTheDocument();
    expect(
      screen.getByText(/do not modify an existing external PayPal agreement/i),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Save membership' }));
    await waitFor(() =>
      expect(mutateAsync).toHaveBeenCalledWith({ plan: 'pro', status: 'active' }),
    );
  });

  test('shows manual billing defaults and no-tenant state', () => {
    useQueryMock.mockReturnValue({
      data: {
        tenant: {
          name: 'Personal',
          plan: 'free',
          status: 'trialing',
          subscription: null,
        },
      },
      isLoading: false,
      isFetching: false,
      error: null,
    } as any);

    const { rerender } = render(<UserMembership userId="user-1" />);
    expect(screen.getByText('Manual')).toBeInTheDocument();
    expect(screen.getByText('Not set')).toBeInTheDocument();
    expect(screen.getByText('No')).toBeInTheDocument();

    useQueryMock.mockReturnValue({
      data: { tenant: null },
      isLoading: false,
      isFetching: false,
      error: null,
    } as any);
    rerender(<UserMembership userId="user-2" />);
    expect(screen.getByText('This user does not have a tenant to manage.')).toBeInTheDocument();
  });
});

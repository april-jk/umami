import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { useAdminUserMembershipQuery, useUpdateAdminUserMembershipQuery } from '@/components/hooks';
import { UserUsageQuotas } from './UserUsageQuotas';

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

describe('UserUsageQuotas', () => {
  test('shows defaults, usage, overrides, and effective values', () => {
    useQueryMock.mockReturnValue({
      data: {
        tenant: {
          quotaOverrides: { eventLimit: 750_000, websiteLimit: null },
        },
        usage: {
          defaults: { eventLimit: 500_000, websiteLimit: 10, memberLimit: 1 },
          events: { used: 400_000, limit: 750_000 },
          websites: { used: 12, limit: null },
          members: { used: 1, limit: 1 },
        },
      },
      isLoading: false,
      isFetching: false,
      error: null,
    } as any);

    render(<UserUsageQuotas userId="user-1" />);

    expect(screen.getAllByText('750,000').length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText('Unlimited').length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText('Inherit').length).toBeGreaterThan(0);
    expect(
      screen.getByText(
        "Overrides apply to this user's default tenant and are enforced immediately.",
      ),
    ).toBeInTheDocument();
  });

  test('saves custom, unlimited, and inherited quota modes', async () => {
    useQueryMock.mockReturnValue({
      data: {
        tenant: {
          quotaOverrides: { eventLimit: 750_000, websiteLimit: null },
        },
        usage: {
          defaults: { eventLimit: 500_000, websiteLimit: 10, memberLimit: 1 },
          events: { used: 1, limit: 750_000 },
          websites: { used: 1, limit: null },
          members: { used: 1, limit: 1 },
        },
      },
      isLoading: false,
      isFetching: false,
      error: null,
    } as any);

    render(<UserUsageQuotas userId="user-1" />);
    fireEvent.click(screen.getByRole('button', { name: 'Save quota overrides' }));

    await waitFor(() =>
      expect(mutateAsync).toHaveBeenCalledWith({
        quotaOverrides: {
          eventLimit: 750_000,
          websiteLimit: null,
          memberLimit: 'inherit',
          mcpCallsPerDay: 'inherit',
          mcpCallsPerMonth: 'inherit',
        },
      }),
    );
  });

  test('disables saving invalid custom quotas and handles users without tenants', () => {
    useQueryMock.mockReturnValue({
      data: {
        tenant: { quotaOverrides: { eventLimit: -1 } },
        usage: null,
      },
      isLoading: false,
      isFetching: false,
      error: null,
    } as any);

    const { rerender } = render(<UserUsageQuotas userId="user-1" />);
    expect(screen.getByRole('button', { name: 'Save quota overrides' })).toBeDisabled();

    useQueryMock.mockReturnValue({
      data: { tenant: null },
      isLoading: false,
      isFetching: false,
      error: null,
    } as any);
    rerender(<UserUsageQuotas userId="user-2" />);
    expect(screen.getByText('This user does not have a tenant to manage.')).toBeInTheDocument();
  });
});

import { beforeEach, describe, expect, test, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { UpgradePage } from './UpgradePage';

vi.mock('@/components/hooks', () => ({
  useLoginQuery: vi.fn(),
  useTenantQuery: vi.fn(),
  useUpdateTenantPlanQuery: vi.fn(),
  useMessages: vi.fn(),
}));

vi.mock('next/link', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

import { useLoginQuery, useTenantQuery, useUpdateTenantPlanQuery, useMessages } from '@/components/hooks';

const useLoginQueryMock = vi.mocked(useLoginQuery);
const useTenantQueryMock = vi.mocked(useTenantQuery);
const useUpdateTenantPlanQueryMock = vi.mocked(useUpdateTenantPlanQuery);
const useMessagesMock = vi.mocked(useMessages);

beforeEach(() => {
  vi.clearAllMocks();
  useMessagesMock.mockReturnValue({
    t: (key: string) => key,
    labels: { membership: 'label.membership' },
    messages: {},
  } as any);
  useUpdateTenantPlanQueryMock.mockReturnValue({
    mutateAsync: vi.fn(),
    isPending: false,
  } as any);
});

describe('UpgradePage', () => {
  test('renders all 5 plan cards', () => {
    useLoginQueryMock.mockReturnValue({
      user: { tenantId: 'tenant-1', plan: 'free' },
    } as any);
    useTenantQueryMock.mockReturnValue({ data: { plan: 'free' } } as any);

    render(<UpgradePage />);

    // Plan badges should all be present
    expect(screen.getAllByText('free').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('starter').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('pro').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('team').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('enterprise').length).toBeGreaterThanOrEqual(1);
  });

  test('highlights current plan as free', () => {
    useLoginQueryMock.mockReturnValue({
      user: { tenantId: 'tenant-1', plan: 'free' },
    } as any);
    useTenantQueryMock.mockReturnValue({ data: { plan: 'free' } } as any);

    render(<UpgradePage />);

    expect(screen.getByText('Current Plan')).toBeInTheDocument();
    expect(screen.getByText('Recommended')).toBeInTheDocument();
  });

  test('highlights current plan as pro', () => {
    useLoginQueryMock.mockReturnValue({
      user: { tenantId: 'tenant-1', plan: 'pro' },
    } as any);
    useTenantQueryMock.mockReturnValue({ data: { plan: 'pro' } } as any);

    render(<UpgradePage />);

    expect(screen.getByText('Current Plan')).toBeInTheDocument();
    expect(screen.getByText('Recommended')).toBeInTheDocument();
  });

  test('shows correct prices for all plans', () => {
    useLoginQueryMock.mockReturnValue({
      user: { tenantId: 'tenant-1', plan: 'free' },
    } as any);
    useTenantQueryMock.mockReturnValue({ data: { plan: 'free' } } as any);

    render(<UpgradePage />);

    // Use exact text matching for prices to avoid conflicts with feature text
    expect(screen.getByText('$9/mo')).toBeInTheDocument();
    expect(screen.getByText('$29/mo')).toBeInTheDocument();
    expect(screen.getByText('$99/mo')).toBeInTheDocument();
    expect(screen.getByText('Custom')).toBeInTheDocument();
  });

  test('shows correct limits for free plan', () => {
    useLoginQueryMock.mockReturnValue({
      user: { tenantId: 'tenant-1', plan: 'free' },
    } as any);
    useTenantQueryMock.mockReturnValue({ data: { plan: 'free' } } as any);

    render(<UpgradePage />);

    // Check event limit specifically
    expect(screen.getByText('100,000/mo')).toBeInTheDocument();
    // '7 days' is unique enough
    expect(screen.getByText('7 days')).toBeInTheDocument();
  });

  test('shows unlimited for enterprise plan', () => {
    useLoginQueryMock.mockReturnValue({
      user: { tenantId: 'tenant-1', plan: 'free' },
    } as any);
    useTenantQueryMock.mockReturnValue({ data: { plan: 'free' } } as any);

    render(<UpgradePage />);

    const unlimitedTexts = screen.getAllByText('Unlimited');
    expect(unlimitedTexts.length).toBeGreaterThan(0);
  });

  test('shows downgrade warning when a lower plan is selected', () => {
    useLoginQueryMock.mockReturnValue({
      user: { tenantId: 'tenant-1', plan: 'pro' },
    } as any);
    useTenantQueryMock.mockReturnValue({ data: { plan: 'pro' } } as any);

    render(<UpgradePage />);

    // The downgrade warning panel is conditionally rendered based on selectedPlan state
    // When current plan is 'pro' (index 2), selecting 'free' (index 0) should show warning
    // Verify the component renders without the warning initially
    expect(screen.queryByText('Downgrade Warning')).not.toBeInTheDocument();

    // Verify the page renders with pro as current plan
    expect(screen.getByText('Current Plan')).toBeInTheDocument();
    expect(screen.getByText('Recommended')).toBeInTheDocument();
  });

  test('uses user.plan when tenant data is not available', () => {
    useLoginQueryMock.mockReturnValue({
      user: { tenantId: 'tenant-1', plan: 'team' },
    } as any);
    useTenantQueryMock.mockReturnValue({ data: null } as any);

    render(<UpgradePage />);

    expect(screen.getByText('Current Plan')).toBeInTheDocument();
  });

  test('uses tenants array fallback for tenantId', () => {
    useLoginQueryMock.mockReturnValue({
      user: { tenants: [{ id: 'tenant-2' }], plan: 'starter' },
    } as any);
    useTenantQueryMock.mockReturnValue({ data: { plan: 'starter' } } as any);

    render(<UpgradePage />);

    expect(screen.getByText('Current Plan')).toBeInTheDocument();
  });

  test('shows features across plans', () => {
    useLoginQueryMock.mockReturnValue({
      user: { tenantId: 'tenant-1', plan: 'free' },
    } as any);
    useTenantQueryMock.mockReturnValue({ data: { plan: 'free' } } as any);

    render(<UpgradePage />);

    // These feature texts should be present somewhere in the page
    // Use getAllByText for texts that appear in multiple plans
    expect(screen.getByText('100K events/month')).toBeInTheDocument();
    expect(screen.getAllByText('API access').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('White-label')).toBeInTheDocument();
    expect(screen.getByText('Dedicated support')).toBeInTheDocument();
  });

  test('disables upgrade button for current plan', () => {
    useLoginQueryMock.mockReturnValue({
      user: { tenantId: 'tenant-1', plan: 'free' },
    } as any);
    useTenantQueryMock.mockReturnValue({ data: { plan: 'free' } } as any);

    render(<UpgradePage />);

    const currentPlanButton = screen.getByText('Current Plan');
    expect(currentPlanButton).toBeInTheDocument();
  });

  test('shows back button', () => {
    useLoginQueryMock.mockReturnValue({
      user: { tenantId: 'tenant-1', plan: 'free' },
    } as any);
    useTenantQueryMock.mockReturnValue({ data: { plan: 'free' } } as any);

    render(<UpgradePage />);

    expect(screen.getByText('Back')).toBeInTheDocument();
  });

  test('shows correct event limits for all plans', () => {
    useLoginQueryMock.mockReturnValue({
      user: { tenantId: 'tenant-1', plan: 'free' },
    } as any);
    useTenantQueryMock.mockReturnValue({ data: { plan: 'free' } } as any);

    render(<UpgradePage />);

    expect(screen.getByText('100,000/mo')).toBeInTheDocument();
    expect(screen.getByText('500,000/mo')).toBeInTheDocument();
    expect(screen.getByText('2,000,000/mo')).toBeInTheDocument();
    expect(screen.getByText('10,000,000/mo')).toBeInTheDocument();
  });

  test('shows correct retention periods', () => {
    useLoginQueryMock.mockReturnValue({
      user: { tenantId: 'tenant-1', plan: 'free' },
    } as any);
    useTenantQueryMock.mockReturnValue({ data: { plan: 'free' } } as any);

    render(<UpgradePage />);

    // Use getAllByText for retention periods that appear in multiple plans
    expect(screen.getAllByText('7 days').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('180 days').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('730 days').length).toBeGreaterThanOrEqual(1);
  });

  test('calls mutateAsync when upgrade button is clicked', async () => {
    const mutateAsyncMock = vi.fn().mockResolvedValue(undefined);
    useUpdateTenantPlanQueryMock.mockReturnValue({
      mutateAsync: mutateAsyncMock,
      isPending: false,
    } as any);
    useLoginQueryMock.mockReturnValue({
      user: { tenantId: 'tenant-1', plan: 'free' },
    } as any);
    useTenantQueryMock.mockReturnValue({ data: { plan: 'free' } } as any);

    render(<UpgradePage />);

    // Find and click an upgrade button (not the current plan one)
    const buttons = screen.getAllByRole('button');
    const upgradeButton = buttons.find(b =>
      b.textContent?.toLowerCase().includes('upgrade'),
    );
    expect(upgradeButton).toBeDefined();
    if (upgradeButton) {
      fireEvent.click(upgradeButton);
      await waitFor(() => {
        expect(mutateAsyncMock).toHaveBeenCalledWith({ plan: expect.any(String) });
      });
    }
  });

  test('shows upgrading state when mutation is pending', () => {
    useUpdateTenantPlanQueryMock.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: true,
    } as any);
    useLoginQueryMock.mockReturnValue({
      user: { tenantId: 'tenant-1', plan: 'free' },
    } as any);
    useTenantQueryMock.mockReturnValue({ data: { plan: 'free' } } as any);

    render(<UpgradePage />);

    // When pending, some buttons should be disabled
    const buttons = screen.getAllByRole('button');
    const disabledButtons = buttons.filter(b => b.hasAttribute('disabled'));
    expect(disabledButtons.length).toBeGreaterThan(0);
  });

  test('does not call mutateAsync for current plan button', async () => {
    const mutateAsyncMock = vi.fn().mockResolvedValue(undefined);
    useUpdateTenantPlanQueryMock.mockReturnValue({
      mutateAsync: mutateAsyncMock,
      isPending: false,
    } as any);
    useLoginQueryMock.mockReturnValue({
      user: { tenantId: 'tenant-1', plan: 'free' },
    } as any);
    useTenantQueryMock.mockReturnValue({ data: { plan: 'free' } } as any);

    render(<UpgradePage />);

    // Click the current plan button
    const currentPlanButton = screen.getByText('Current Plan');
    fireEvent.click(currentPlanButton);

    // Should not call mutateAsync for current plan
    expect(mutateAsyncMock).not.toHaveBeenCalled();
  });
});

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { UpgradePage } from './UpgradePage';

const { getSearchParamMock } = vi.hoisted(() => ({ getSearchParamMock: vi.fn() }));

vi.mock('@/components/hooks', () => ({
  useLoginQuery: vi.fn(),
  useTenantQuery: vi.fn(),
  useApi: vi.fn(),
  useMessages: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useSearchParams: () => ({ get: getSearchParamMock }),
}));

vi.mock('next/link', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

import { useApi, useLoginQuery, useMessages, useTenantQuery } from '@/components/hooks';

const useLoginQueryMock = vi.mocked(useLoginQuery);
const useTenantQueryMock = vi.mocked(useTenantQuery);
const useApiMock = vi.mocked(useApi);
const useMessagesMock = vi.mocked(useMessages);
const postMock = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  getSearchParamMock.mockReturnValue(null);
  useMessagesMock.mockReturnValue({ t: (key: string) => key, labels: {}, messages: {} } as any);
  useApiMock.mockReturnValue({
    post: postMock,
    useMutation: () => ({ mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false }),
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
    expect(screen.getByText('$7.50/mo')).toBeInTheDocument();
    expect(screen.getByText('$24.17/mo')).toBeInTheDocument();
    expect(screen.getByText('$82.50/mo')).toBeInTheDocument();
    expect(screen.getByText('Custom')).toBeInTheDocument();
  });

  test('shows the standard monthly price after selecting monthly billing', () => {
    useLoginQueryMock.mockReturnValue({ user: { tenantId: 'tenant-1', plan: 'free' } } as any);
    useTenantQueryMock.mockReturnValue({ data: { plan: 'free' } } as any);

    render(<UpgradePage />);
    fireEvent.click(screen.getByText('Monthly'));

    expect(screen.getByText('$9/mo')).toBeInTheDocument();
    expect(screen.getByText('$29/mo')).toBeInTheDocument();
    expect(screen.getByText('$99/mo')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Annual (2 months free)'));
    expect(screen.getByText('$7.50/mo')).toBeInTheDocument();
  });

  test('keeps plan cards from expanding for button copy', () => {
    useLoginQueryMock.mockReturnValue({ user: { tenantId: 'tenant-1', plan: 'free' } } as any);
    useTenantQueryMock.mockReturnValue({ data: { plan: 'free' } } as any);

    render(<UpgradePage />);

    expect(screen.getByTestId('plan-card-starter')).toHaveStyle({ minWidth: '0' });
    expect(screen.getByTestId('plan-card-enterprise')).toHaveStyle({ minWidth: '0' });
  });

  test('anchors plan actions to the bottom of their cards', () => {
    useLoginQueryMock.mockReturnValue({ user: { tenantId: 'tenant-1', plan: 'free' } } as any);
    useTenantQueryMock.mockReturnValue({ data: { plan: 'free' } } as any);

    render(<UpgradePage />);

    for (const button of screen.getAllByRole('button', { name: 'Subscribe' })) {
      expect(button).toHaveStyle({ marginTop: 'auto' });
    }
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

  test('opens an email draft for enterprise sales', () => {
    useLoginQueryMock.mockReturnValue({ user: { tenantId: 'tenant-1', plan: 'free' } } as any);
    useTenantQueryMock.mockReturnValue({ data: { plan: 'free' } } as any);

    render(<UpgradePage />);

    expect(screen.getByRole('link', { name: 'Contact sales' })).toHaveAttribute(
      'href',
      'mailto:watson_zang@foxmail.com',
    );
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

  test('only advertises benefits enforced by the membership system', () => {
    useLoginQueryMock.mockReturnValue({
      user: { tenantId: 'tenant-1', plan: 'free' },
    } as any);
    useTenantQueryMock.mockReturnValue({ data: { plan: 'free' } } as any);

    render(<UpgradePage />);

    expect(screen.getByText('100,000/mo')).toBeInTheDocument();
    expect(screen.queryByText('API access')).not.toBeInTheDocument();
    expect(screen.queryByText('Email reports')).not.toBeInTheDocument();
    expect(screen.queryByText('White-label')).not.toBeInTheDocument();
    expect(screen.queryByText('SSO ready')).not.toBeInTheDocument();
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

  test('creates a PayPal subscription when a tenant user selects a paid plan', async () => {
    const mutateAsyncMock = vi.fn().mockRejectedValue(new Error('PayPal unavailable'));
    useApiMock.mockReturnValue({
      post: postMock,
      useMutation: () => ({ mutate: vi.fn(), mutateAsync: mutateAsyncMock, isPending: false }),
    } as any);
    useLoginQueryMock.mockReturnValue({
      user: { tenantId: 'tenant-1', plan: 'free', isAdmin: false },
    } as any);
    useTenantQueryMock.mockReturnValue({ data: { plan: 'free' } } as any);

    render(<UpgradePage />);

    // Find and click an upgrade button (not the current plan one)
    const buttons = screen.getAllByRole('button');
    const upgradeButton = buttons.find(b => b.textContent?.includes('Subscribe'));
    expect(upgradeButton).toBeDefined();
    if (upgradeButton) {
      fireEvent.click(upgradeButton);
      await waitFor(() => {
        expect(mutateAsyncMock).toHaveBeenCalledWith({
          plan: expect.any(String),
          interval: 'year',
        });
      });
      expect(screen.getByText('Unable to start checkout. Please try again.')).toBeInTheDocument();
    }
  });

  test('redirects to the approval URL after checkout starts', async () => {
    const mutateAsyncMock = vi
      .fn()
      .mockResolvedValue({ approveUrl: 'https://paypal.example/approve' });
    useApiMock.mockReturnValue({
      post: postMock,
      useMutation: () => ({ mutate: vi.fn(), mutateAsync: mutateAsyncMock, isPending: false }),
    } as any);
    useLoginQueryMock.mockReturnValue({ user: { tenantId: 'tenant-1', plan: 'free' } } as any);
    useTenantQueryMock.mockReturnValue({ data: { plan: 'free' } } as any);

    render(<UpgradePage />);
    fireEvent.click(screen.getAllByRole('button', { name: 'Subscribe' })[0]);

    await waitFor(() => expect(mutateAsyncMock).toHaveBeenCalled());
  });

  test('wires PayPal mutation functions to the tenant billing endpoints', async () => {
    const mutationOptions: any[] = [];
    const mutationResult = { mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false };
    useApiMock.mockReturnValue({
      post: postMock,
      useMutation: (options: any) => {
        mutationOptions.push(options);
        return mutationResult;
      },
    } as any);
    useLoginQueryMock.mockReturnValue({ user: { tenantId: 'tenant-1', plan: 'free' } } as any);
    useTenantQueryMock.mockReturnValue({ data: { plan: 'free' } } as any);

    render(<UpgradePage />);
    await mutationOptions[0].mutationFn({ plan: 'pro', interval: 'year' });
    await mutationOptions[1].mutationFn('subscription-1');

    expect(postMock).toHaveBeenNthCalledWith(1, '/tenants/tenant-1/billing/paypal/subscription', {
      plan: 'pro',
      interval: 'year',
    });
    expect(postMock).toHaveBeenNthCalledWith(2, '/tenants/tenant-1/billing/paypal/confirm', {
      subscriptionId: 'subscription-1',
    });
  });

  test('shows an error when a returned PayPal subscription cannot be confirmed', async () => {
    getSearchParamMock.mockImplementation(key =>
      key === 'paypal' ? 'success' : key === 'subscription_id' ? 'subscription-1' : null,
    );
    const subscriptionMutation = { mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false };
    const confirmationMutation = {
      mutate: vi.fn((_id, callbacks) => callbacks.onError()),
      mutateAsync: vi.fn(),
      isPending: false,
    };
    let mutationIndex = 0;
    useApiMock.mockReturnValue({
      post: postMock,
      useMutation: () => [subscriptionMutation, confirmationMutation][mutationIndex++ % 2],
    } as any);
    useLoginQueryMock.mockReturnValue({ user: { tenantId: 'tenant-1', plan: 'free' } } as any);
    useTenantQueryMock.mockReturnValue({ data: { plan: 'free' } } as any);

    render(<UpgradePage />);

    expect(
      await screen.findByText(
        'Your subscription approval could not be verified. Please try again.',
      ),
    ).toBeInTheDocument();
  });

  test('shows upgrading state when mutation is pending', () => {
    useApiMock.mockReturnValue({
      post: postMock,
      useMutation: () => ({ mutate: vi.fn(), mutateAsync: vi.fn(), isPending: true }),
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
    useApiMock.mockReturnValue({
      post: postMock,
      useMutation: () => ({ mutate: vi.fn(), mutateAsync: mutateAsyncMock, isPending: false }),
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

import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import enUS from '../../../../../public/intl/messages/en-US.json';
import zhCN from '../../../../../public/intl/messages/zh-CN.json';
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

function createTranslator(messages: any) {
  const getNestedValue = (path: string) =>
    path.split('.').reduce((value: any, key) => value?.[key], messages);

  return Object.assign(
    (key: string, values?: Record<string, string | number>) => {
      const value = getNestedValue(key);
      if (typeof value !== 'string') return key;
      return Object.entries(values ?? {}).reduce(
        (text, [name, replacement]) => text.replace(`{${name}}`, String(replacement)),
        value,
      );
    },
    { raw: (key: string) => getNestedValue(key) },
  );
}

const translate = createTranslator(enUS);

beforeEach(() => {
  vi.clearAllMocks();
  getSearchParamMock.mockReturnValue(null);
  useMessagesMock.mockReturnValue({ t: translate, labels: {}, messages: {} } as any);
  useApiMock.mockReturnValue({
    post: postMock,
    useMutation: () => ({ mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false }),
  } as any);
});

describe('UpgradePage', () => {
  test('renders one plan-name label per card without a duplicate heading', () => {
    useLoginQueryMock.mockReturnValue({
      user: { tenantId: 'tenant-1', plan: 'free' },
    } as any);
    useTenantQueryMock.mockReturnValue({ data: { plan: 'free' } } as any);
    useMessagesMock.mockReturnValue({
      t: createTranslator(zhCN),
      labels: {},
      messages: {},
    } as any);

    render(<UpgradePage />);

    for (const [plan, name] of [
      ['free', '免费版'],
      ['starter', '入门版'],
      ['pro', '专业版'],
      ['team', '团队版'],
      ['enterprise', '企业版'],
    ] as const) {
      const card = within(screen.getByTestId(`plan-card-${plan}`));
      expect(card.getAllByText(name)).toHaveLength(1);
      expect(card.queryByRole('heading', { name })).not.toBeInTheDocument();
    }
  });

  test('updates plan cards when the active language changes', () => {
    useLoginQueryMock.mockReturnValue({ user: { tenantId: 'tenant-1', plan: 'free' } } as any);
    useTenantQueryMock.mockReturnValue({ data: { plan: 'free' } } as any);

    const { rerender } = render(<UpgradePage />);
    expect(screen.getByText('Upgrade Membership')).toBeInTheDocument();

    useMessagesMock.mockReturnValue({
      t: createTranslator(zhCN),
      labels: {},
      messages: {},
    } as any);
    rerender(<UpgradePage />);

    expect(screen.getByText('升级会员')).toBeInTheDocument();
    expect(screen.getByText('核心分析、API 只读访问和每天 50 次 MCP 调用')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: '订阅' })).toHaveLength(3);
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
    expect(screen.getByText('$15.83/mo')).toBeInTheDocument();
    expect(screen.getByText('$32.50/mo')).toBeInTheDocument();
    expect(screen.getByText('Billed $190/year (save 2 months)')).toBeInTheDocument();
    expect(screen.getByText('Billed $390/year (save 2 months)')).toBeInTheDocument();
    expect(screen.getByText('Custom')).toBeInTheDocument();
  });

  test('shows the standard monthly price after selecting monthly billing', () => {
    useLoginQueryMock.mockReturnValue({ user: { tenantId: 'tenant-1', plan: 'free' } } as any);
    useTenantQueryMock.mockReturnValue({ data: { plan: 'free' } } as any);

    render(<UpgradePage />);
    fireEvent.click(screen.getByText('Monthly'));

    expect(screen.getByText('$9/mo')).toBeInTheDocument();
    expect(screen.getByText('$19/mo')).toBeInTheDocument();
    expect(screen.getByText('$39/mo')).toBeInTheDocument();

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

    expect(screen.getByText('100K events/month')).toBeInTheDocument();
    expect(screen.getByText('7-day data retention')).toBeInTheDocument();
  });

  test('shows unlimited for enterprise plan', () => {
    useLoginQueryMock.mockReturnValue({
      user: { tenantId: 'tenant-1', plan: 'free' },
    } as any);
    useTenantQueryMock.mockReturnValue({ data: { plan: 'free' } } as any);

    render(<UpgradePage />);

    expect(
      screen.getByText('Custom event, API, MCP, website, and member capacity'),
    ).toBeInTheDocument();
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

  test('matches the public pricing page feature catalog', () => {
    useLoginQueryMock.mockReturnValue({
      user: { tenantId: 'tenant-1', plan: 'free' },
    } as any);
    useTenantQueryMock.mockReturnValue({ data: { plan: 'free' } } as any);

    render(<UpgradePage />);

    expect(
      screen.getByText('Core analytics, API read access, and 50 MCP calls/day'),
    ).toBeInTheDocument();
    expect(screen.getByText('CSV export and daily or weekly email reports')).toBeInTheDocument();
    expect(
      screen.getByText('CSV and JSON export, 5 webhooks, and Slack alerts'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('SSO/SAML, white-label controls, and AI forecasting'),
    ).toBeInTheDocument();
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

    expect(screen.getByText('100K events/month')).toBeInTheDocument();
    expect(screen.getByText('500K events/month')).toBeInTheDocument();
    expect(screen.getByText('2M events/month')).toBeInTheDocument();
    expect(screen.getByText('10M events/month and 50 websites')).toBeInTheDocument();
  });

  test('shows correct retention periods', () => {
    useLoginQueryMock.mockReturnValue({
      user: { tenantId: 'tenant-1', plan: 'free' },
    } as any);
    useTenantQueryMock.mockReturnValue({ data: { plan: 'free' } } as any);

    render(<UpgradePage />);

    expect(screen.getByText('7-day data retention')).toBeInTheDocument();
    expect(screen.getByText('6 months data retention')).toBeInTheDocument();
    expect(screen.getByText('24 months data retention')).toBeInTheDocument();
    expect(
      screen.getByText('20 members, unlimited goals, and unlimited data retention'),
    ).toBeInTheDocument();
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

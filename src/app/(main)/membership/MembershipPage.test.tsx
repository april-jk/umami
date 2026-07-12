import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import enUS from '../../../../public/intl/messages/en-US.json';
import zhCN from '../../../../public/intl/messages/zh-CN.json';
import { MembershipPage } from './MembershipPage';

vi.mock('@/components/hooks', () => ({
  useLoginQuery: vi.fn(),
  useTenantUsageQuery: vi.fn(),
  useMessages: vi.fn(),
  useLocale: vi.fn(),
}));

vi.mock('next/link', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

import { useLocale, useLoginQuery, useMessages, useTenantUsageQuery } from '@/components/hooks';

const useLoginQueryMock = vi.mocked(useLoginQuery);
const useTenantUsageQueryMock = vi.mocked(useTenantUsageQuery);
const useMessagesMock = vi.mocked(useMessages);
const useLocaleMock = vi.mocked(useLocale);

function createTranslator(messages: any) {
  const getNestedValue = (messagePath: string) =>
    messagePath.split('.').reduce((value: any, key) => value?.[key], messages);

  return (key: string, values?: Record<string, string | number>) => {
    const value = getNestedValue(key);
    if (typeof value !== 'string') return key;
    return Object.entries(values ?? {}).reduce(
      (text, [name, replacement]) => text.replace(`{${name}}`, String(replacement)),
      value,
    );
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  useLocaleMock.mockReturnValue({ locale: 'en-US' } as any);
  useMessagesMock.mockReturnValue({
    t: createTranslator(enUS),
    labels: { membership: 'label.membership' },
    messages: {},
  } as any);
});

describe('MembershipPage', () => {
  test('shows loading state', () => {
    useLoginQueryMock.mockReturnValue({ user: { tenantId: 'tenant-1' } } as any);
    useTenantUsageQueryMock.mockReturnValue({ data: null, isLoading: true } as any);

    render(<MembershipPage />);

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  test('shows no membership info when no tenantId', () => {
    useLoginQueryMock.mockReturnValue({ user: {} } as any);
    useTenantUsageQueryMock.mockReturnValue({ data: null, isLoading: false } as any);

    render(<MembershipPage />);

    expect(screen.getByText('No membership information available.')).toBeInTheDocument();
  });

  test('renders free plan usage correctly', () => {
    useLoginQueryMock.mockReturnValue({
      user: { tenantId: 'tenant-1', plan: 'free' },
    } as any);
    useTenantUsageQueryMock.mockReturnValue({
      data: {
        plan: 'free',
        month: '2026-07',
        events: { used: 50_000, limit: 100_000 },
        websites: { used: 3, limit: 5 },
        members: { used: 1, limit: 1 },
      },
      isLoading: false,
    } as any);

    render(<MembershipPage />);

    expect(screen.getAllByText('Free').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Free Plan')).toBeInTheDocument();
    expect(screen.getByText('2026-07')).toBeInTheDocument();
    expect(screen.getByText('7 days')).toBeInTheDocument();
    expect(screen.getByText('50,000 / 100,000')).toBeInTheDocument();
    expect(screen.getByText('3 / 5')).toBeInTheDocument();
    expect(screen.getByText('1 / 1')).toBeInTheDocument();
  });

  test('renders pro plan with unlimited retention', () => {
    useLoginQueryMock.mockReturnValue({
      user: { tenantId: 'tenant-1', plan: 'pro' },
    } as any);
    useTenantUsageQueryMock.mockReturnValue({
      data: {
        plan: 'pro',
        month: '2026-07',
        events: { used: 1_000_000, limit: 2_000_000 },
        websites: { used: 10, limit: 25 },
        members: { used: 3, limit: 5 },
      },
      isLoading: false,
    } as any);

    render(<MembershipPage />);

    expect(screen.getAllByText('Pro').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Pro Plan')).toBeInTheDocument();
    expect(screen.getByText('730 days')).toBeInTheDocument();
  });

  test('shows critical alert when usage exceeded', () => {
    useLoginQueryMock.mockReturnValue({
      user: { tenantId: 'tenant-1', plan: 'free' },
    } as any);
    useTenantUsageQueryMock.mockReturnValue({
      data: {
        plan: 'free',
        month: '2026-07',
        events: { used: 100_000, limit: 100_000 },
        websites: { used: 5, limit: 5 },
        members: { used: 1, limit: 1 },
      },
      isLoading: false,
    } as any);

    render(<MembershipPage />);

    expect(screen.getByText('Usage limit exceeded')).toBeInTheDocument();
  });

  test('shows warning alert when usage approaching limit', () => {
    useLoginQueryMock.mockReturnValue({
      user: { tenantId: 'tenant-1', plan: 'pro' },
    } as any);
    useTenantUsageQueryMock.mockReturnValue({
      data: {
        plan: 'pro',
        month: '2026-07',
        events: { used: 1_800_000, limit: 2_000_000 },
        websites: { used: 20, limit: 25 },
        members: { used: 2, limit: 5 },
      },
      isLoading: false,
    } as any);

    render(<MembershipPage />);

    expect(screen.getByText('Usage approaching limit')).toBeInTheDocument();
  });

  test('renders enterprise plan with unlimited limits', () => {
    useLoginQueryMock.mockReturnValue({
      user: { tenantId: 'tenant-1', plan: 'enterprise' },
    } as any);
    useTenantUsageQueryMock.mockReturnValue({
      data: {
        plan: 'enterprise',
        month: '2026-07',
        events: { used: 50_000_000, limit: null },
        websites: { used: 100, limit: null },
        members: { used: 50, limit: null },
      },
      isLoading: false,
    } as any);

    render(<MembershipPage />);

    expect(screen.getAllByText('Enterprise').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Enterprise Plan')).toBeInTheDocument();
    expect(screen.getAllByText('Unlimited').length).toBeGreaterThanOrEqual(1);
  });

  test('uses user.plan as fallback when usage data has no plan', () => {
    useLoginQueryMock.mockReturnValue({
      user: { tenantId: 'tenant-1', plan: 'starter' },
    } as any);
    useTenantUsageQueryMock.mockReturnValue({
      data: {
        month: '2026-07',
        events: { used: 100_000, limit: 500_000 },
        websites: { used: 5, limit: 10 },
        members: { used: 1, limit: 1 },
      },
      isLoading: false,
    } as any);

    render(<MembershipPage />);

    expect(screen.getAllByText('Starter').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Starter Plan')).toBeInTheDocument();
  });

  test('updates usage content when the active language changes', () => {
    useLoginQueryMock.mockReturnValue({ user: { tenantId: 'tenant-1', plan: 'free' } } as any);
    useTenantUsageQueryMock.mockReturnValue({
      data: {
        plan: 'free',
        month: '2026-07',
        events: { used: 50_000, limit: 100_000 },
        websites: { used: 3, limit: 5 },
        members: { used: 1, limit: 1 },
      },
      isLoading: false,
    } as any);

    const { rerender } = render(<MembershipPage />);
    expect(
      screen.getByText('Manage your plan, view usage, and upgrade when needed.'),
    ).toBeInTheDocument();

    useMessagesMock.mockReturnValue({
      t: createTranslator(zhCN),
      labels: { membership: 'label.membership' },
      messages: {},
    } as any);
    useLocaleMock.mockReturnValue({ locale: 'zh-CN' } as any);
    rerender(<MembershipPage />);

    expect(screen.getByText('管理套餐、查看用量，并在需要时升级。')).toBeInTheDocument();
    expect(screen.getByText('当前计费周期')).toBeInTheDocument();
    expect(screen.getByText('用量概览')).toBeInTheDocument();
  });

  test('uses tenants array fallback for tenantId', () => {
    useLoginQueryMock.mockReturnValue({
      user: { tenants: [{ id: 'tenant-2' }], plan: 'team' },
    } as any);
    useTenantUsageQueryMock.mockReturnValue({
      data: {
        plan: 'team',
        month: '2026-07',
        events: { used: 5_000_000, limit: 10_000_000 },
        websites: { used: 20, limit: 50 },
        members: { used: 10, limit: 20 },
      },
      isLoading: false,
    } as any);

    render(<MembershipPage />);

    expect(screen.getAllByText('Team').length).toBeGreaterThanOrEqual(1);
  });

  test('shows upgrade button', () => {
    useLoginQueryMock.mockReturnValue({
      user: { tenantId: 'tenant-1', plan: 'free' },
    } as any);
    useTenantUsageQueryMock.mockReturnValue({
      data: {
        plan: 'free',
        month: '2026-07',
        events: { used: 10, limit: 100_000 },
        websites: { used: 1, limit: 5 },
        members: { used: 1, limit: 1 },
      },
      isLoading: false,
    } as any);

    render(<MembershipPage />);

    expect(screen.getByText('Upgrade')).toBeInTheDocument();
  });

  test('shows no alert when usage is low', () => {
    useLoginQueryMock.mockReturnValue({
      user: { tenantId: 'tenant-1', plan: 'team' },
    } as any);
    useTenantUsageQueryMock.mockReturnValue({
      data: {
        plan: 'team',
        month: '2026-07',
        events: { used: 1_000_000, limit: 10_000_000 },
        websites: { used: 10, limit: 50 },
        members: { used: 5, limit: 20 },
      },
      isLoading: false,
    } as any);

    render(<MembershipPage />);

    expect(screen.queryByText('Usage limit exceeded')).not.toBeInTheDocument();
    expect(screen.queryByText('Usage approaching limit')).not.toBeInTheDocument();
  });
});

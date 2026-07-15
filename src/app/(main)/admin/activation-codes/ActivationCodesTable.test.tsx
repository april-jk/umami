import { render, screen } from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vitest';
import enUS from '../../../../../public/intl/messages/en-US.json';
import { ActivationCodesTable } from './ActivationCodesTable';

vi.mock('@umami/react-zen', async importOriginal => ({
  ...(await importOriginal<typeof import('@umami/react-zen')>()),
  useToast: () => ({ toast: vi.fn() }),
}));
vi.mock('@/components/hooks', () => ({
  useApi: () => ({
    put: vi.fn(),
    useMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
  }),
  useMessages: vi.fn(),
  useModified: () => ({ touch: vi.fn() }),
  useNavigation: vi.fn(),
}));
vi.mock('@/components/common/Badge', () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

import { useMessages, useNavigation } from '@/components/hooks';

function translate(key: string, values?: Record<string, string | number>) {
  const value = key.split('.').reduce((current: any, part) => current?.[part], enUS as any);
  if (typeof value !== 'string') return key;
  return Object.entries(values ?? {}).reduce(
    (text, [name, replacement]) => text.replace(`{${name}}`, String(replacement)),
    value,
  );
}

const code = (overrides: Record<string, any> = {}) =>
  ({
    id: 'code-1',
    code: 'AMAMI-TEST-1234',
    codePrefix: 'AMAMI123456',
    name: 'Launch',
    note: null,
    plan: 'pro',
    durationDays: 30,
    startsAt: '2026-07-01T00:00:00.000Z',
    expiresAt: null,
    maxRedemptions: 10,
    redemptionCount: 1,
    status: 'active',
    isActive: true,
    createdAt: '2026-07-01T00:00:00.000Z',
    _count: { redemptions: 1 },
    ...overrides,
  }) as any;

beforeEach(() => {
  vi.mocked(useNavigation).mockReturnValue({
    query: {},
    router: { push: vi.fn() },
    updateParams: vi.fn(),
  } as any);
  vi.mocked(useMessages).mockReturnValue({
    t: translate,
    labels: { name: 'label.name', view: 'label.view', edit: 'label.edit', delete: 'label.delete' },
  } as any);
});

test('renders code metadata and all operational status states', () => {
  render(
    <ActivationCodesTable
      data={[
        code(),
        code({ id: 'scheduled', status: 'active', startsAt: '2099-01-01T00:00:00.000Z' }),
        code({ id: 'expired', expiresAt: '2000-01-01T00:00:00.000Z' }),
        code({ id: 'exhausted', redemptionCount: 10 }),
        code({ id: 'disabled', status: 'disabled' }),
      ]}
    />,
  );

  expect(screen.getAllByText('AMAMI-TEST-1234')).toHaveLength(5);
  expect(screen.getAllByRole('button', { name: 'Copy activation code' })).toHaveLength(5);
  expect(screen.getAllByText('Launch')).toHaveLength(5);
  expect(screen.getAllByText('1 / 10')).toHaveLength(4);
  expect(screen.getByText('Active')).toBeInTheDocument();
  expect(screen.getByText('Scheduled')).toBeInTheDocument();
  expect(screen.getByText('Expired')).toBeInTheDocument();
  expect(screen.getByText('Used up')).toBeInTheDocument();
  expect(screen.getByText('Disabled')).toBeInTheDocument();
});

test('falls back to the prefix when a legacy code cannot be recovered', () => {
  render(<ActivationCodesTable data={[code({ code: null })]} />);

  expect(screen.getByText('AMAMI123456...')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Copy activation code' })).not.toBeInTheDocument();
});

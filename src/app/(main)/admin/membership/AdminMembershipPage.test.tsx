import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, test, vi } from 'vitest';
import {
  useAdminMembershipConfigQuery,
  useMessages,
  useUpdateMembershipConfigQuery,
} from '@/components/hooks';
import { createDefaultMembershipConfig } from '@/lib/membership-config';
import { AdminMembershipPage } from './AdminMembershipPage';

vi.mock('@/components/hooks', () => ({
  useAdminMembershipConfigQuery: vi.fn(),
  useMessages: vi.fn(),
  useUpdateMembershipConfigQuery: vi.fn(),
}));

const queryMock = vi.mocked(useAdminMembershipConfigQuery);
const updateMock = vi.mocked(useUpdateMembershipConfigQuery);
const mutateAsync = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useMessages).mockReturnValue({
    t: (key: string) => {
      const plan = key.split('.').at(-2);
      return plan ? plan.charAt(0).toUpperCase() + plan.slice(1) : key;
    },
    labels: {},
  } as any);
  queryMock.mockReturnValue({
    data: {
      config: createDefaultMembershipConfig(),
      version: 0,
      source: 'default',
    },
    isLoading: false,
    isFetching: false,
    error: null,
  } as any);
  updateMock.mockReturnValue({ mutateAsync, isPending: false } as any);
});

test('renders editable prices, quotas, entitlement values, and enforcement state', () => {
  render(<AdminMembershipPage />);

  expect(screen.getByText('Membership management')).toBeInTheDocument();
  expect(screen.getByText(/Code defaults/)).toBeInTheDocument();
  expect(screen.getByLabelText('Starter Monthly price')).toHaveValue(9);
  expect(screen.getByLabelText('Enterprise Events / month')).toHaveValue(20_000_000);
  expect(screen.getByLabelText('Team SSO / SAML')).toBeInTheDocument();
  expect(screen.getAllByText('Enforced').length).toBeGreaterThan(0);
  expect(screen.getAllByText('Published target').length).toBeGreaterThan(0);
});

test('saves edited numeric and boolean values', async () => {
  render(<AdminMembershipPage />);

  fireEvent.change(screen.getByLabelText('Starter Monthly price'), { target: { value: '12' } });
  fireEvent.change(screen.getByLabelText('Starter Events / month'), {
    target: { value: '650000' },
  });
  fireEvent.click(screen.getByLabelText('Starter JSON export'));
  fireEvent.click(screen.getByRole('button', { name: 'Save configuration' }));

  await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1));
  const saved = mutateAsync.mock.calls[0][0];
  expect(saved.version).toBe(0);
  expect(saved.config.plans.starter.prices.monthly).toBe(12);
  expect(saved.config.plans.starter.limits.eventLimit).toBe(650_000);
  expect(saved.config.plans.starter.entitlements.jsonExport).toBe(true);
});

test('supports unlimited values, discarding changes, and restoring defaults', () => {
  const config = createDefaultMembershipConfig();
  config.plans.pro.limits.websiteLimit = 99;
  queryMock.mockReturnValue({
    data: { config, version: 3, source: 'database' },
    isLoading: false,
    isFetching: false,
    error: null,
  } as any);

  render(<AdminMembershipPage />);
  const field = screen.getByLabelText('Pro Websites');
  fireEvent.change(field, { target: { value: '' } });
  expect(field).toHaveValue(null);

  fireEvent.click(screen.getByRole('button', { name: 'Discard changes' }));
  expect(screen.getByLabelText('Pro Websites')).toHaveValue(99);

  fireEvent.click(screen.getByRole('button', { name: 'Use code defaults' }));
  expect(screen.getByLabelText('Pro Websites')).toHaveValue(25);
});

test('edits plan availability and blocks invalid available-plan prices', async () => {
  const user = userEvent.setup();
  render(<AdminMembershipPage />);

  await user.click(screen.getByLabelText('Starter Available for subscription'));
  await user.click(screen.getByRole('button', { name: 'Save configuration' }));
  await waitFor(() => expect(mutateAsync).toHaveBeenCalledOnce());
  expect(mutateAsync.mock.calls[0][0].config.plans.starter.available).toBe(false);

  fireEvent.change(screen.getByLabelText('Starter Monthly price'), { target: { value: '' } });
  expect(screen.queryByText(/Available paid plans require/)).not.toBeInTheDocument();

  await user.click(screen.getByLabelText('Starter Available for subscription'));
  expect(screen.getByText(/Available paid plans require/)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Save configuration' })).toBeDisabled();
});

test('shows update failures and saving state', () => {
  updateMock.mockReturnValue({
    mutateAsync,
    isPending: true,
    error: new Error('Refresh and try again.'),
  } as any);

  render(<AdminMembershipPage />);
  fireEvent.change(screen.getByLabelText('Starter Monthly price'), { target: { value: '12' } });

  expect(screen.getByRole('alert')).toHaveTextContent('Refresh and try again.');
  expect(screen.getByRole('button', { name: 'Saving...' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Discard changes' })).toBeDisabled();
});

import { render, screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import { useMessages } from '@/components/hooks';
import { AdminMembershipPage } from './AdminMembershipPage';

vi.mock('@/components/hooks', () => ({ useMessages: vi.fn() }));

vi.mocked(useMessages).mockReturnValue({
  t: (key: string) => key.split('.').at(-2) ?? key,
  labels: {},
} as any);

test('renders the authoritative pricing, quota, entitlement, and enforcement matrix', () => {
  render(<AdminMembershipPage />);

  expect(screen.getByText('Membership management')).toBeInTheDocument();
  expect(screen.getByText('Annual prices equal ten monthly payments.')).toBeInTheDocument();
  expect(screen.getByText('Events / month')).toBeInTheDocument();
  expect(screen.getByText('Session replays')).toBeInTheDocument();
  expect(screen.getByText('SSO / SAML')).toBeInTheDocument();
  expect(screen.getAllByText('$199').length).toBeGreaterThan(0);
  expect(screen.getByText('$1990')).toBeInTheDocument();
  expect(screen.getByText('20M')).toBeInTheDocument();
  expect(screen.getAllByText('Unlimited').length).toBeGreaterThan(0);
  expect(screen.getAllByText('Enforced').length).toBeGreaterThan(0);
  expect(screen.getAllByText('Published target').length).toBeGreaterThan(0);
});

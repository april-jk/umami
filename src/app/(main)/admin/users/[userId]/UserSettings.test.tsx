import { render, screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import { useMessages } from '@/components/hooks';
import { UserSettings } from './UserSettings';

vi.mock('@/components/hooks', () => ({ useMessages: vi.fn() }));
vi.mock('./UserEditForm', () => ({ UserEditForm: () => <div>User details form</div> }));
vi.mock('./UserMembership', () => ({ UserMembership: () => <div>Membership controls</div> }));
vi.mock('./UserUsageQuotas', () => ({ UserUsageQuotas: () => <div>Quota controls</div> }));
vi.mock('./UserWebsites', () => ({ UserWebsites: () => <div>User websites</div> }));

test('exposes usage and membership management tabs on admin user details', () => {
  vi.mocked(useMessages).mockReturnValue({
    t: (value: string) => value,
    labels: { details: 'Details', websites: 'Websites', membership: 'Membership' },
  } as any);

  render(<UserSettings userId="user-1" />);

  expect(screen.getByRole('tab', { name: 'Details' })).toBeInTheDocument();
  expect(screen.getByRole('tab', { name: 'Websites' })).toBeInTheDocument();
  expect(screen.getByRole('tab', { name: 'Usage & quotas' })).toBeInTheDocument();
  expect(screen.getByRole('tab', { name: 'Membership' })).toBeInTheDocument();
});

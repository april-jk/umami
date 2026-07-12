import { render, screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import MembershipPage, { MembershipAdminRoute, metadata } from './page';

vi.mock('./AdminMembershipPage', () => ({
  AdminMembershipPage: () => <div>Membership matrix</div>,
}));

test('exposes the admin membership route and metadata', () => {
  render(<MembershipPage />);

  expect(screen.getByText('Membership matrix')).toBeInTheDocument();
  expect(MembershipPage).toBe(MembershipAdminRoute);
  expect(metadata.title).toBe('Membership management');
});

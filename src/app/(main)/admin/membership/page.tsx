import type { Metadata } from 'next';
import { AdminMembershipPage } from './AdminMembershipPage';

export function MembershipAdminRoute() {
  return <AdminMembershipPage />;
}

export default MembershipAdminRoute;

export const metadata: Metadata = {
  title: 'Membership management',
};

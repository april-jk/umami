import type { Metadata } from 'next';
import { MembershipPage } from './MembershipPage';

export default function () {
  return <MembershipPage />;
}

export const metadata: Metadata = {
  title: 'Membership',
};

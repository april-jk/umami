import type { Metadata } from 'next';
import { UpgradePage } from './UpgradePage';

export default function () {
  return <UpgradePage />;
}

export const metadata: Metadata = {
  title: 'Upgrade Membership',
};

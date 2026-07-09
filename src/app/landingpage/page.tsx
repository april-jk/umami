import type { Metadata } from 'next';
import LandingPage from './LandingPage';

export const metadata: Metadata = {
  title: 'Amami - Connect agents to website analytics',
  description:
    'Amami helps coding agents connect website analytics in one step, then analyze traffic, referrers, pages, conversions, and improvement recommendations.',
};

export default function Page() {
  return <LandingPage />;
}

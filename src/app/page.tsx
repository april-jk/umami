import type { Metadata } from 'next';
import LandingPage from './landingpage/LandingPage';

export const metadata: Metadata = {
  title: 'Amami - Analytics setup and growth advice for coding agents',
  description:
    'Amami helps coding agents add website analytics in one step, then turn traffic, referrers, pages, and events into growth recommendations.',
};

export default function Page() {
  return <LandingPage />;
}

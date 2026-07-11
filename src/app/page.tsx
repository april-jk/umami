import type { Metadata } from 'next';
import LandingPage from './landingpage/LandingPage';

export const metadata: Metadata = {
  title: 'Amami - Let your AI read your website analytics',
  description:
    'Connect Cursor, Claude, or any MCP client to your analytics. Ask why traffic changed and get instant analysis, trends, and optimization recommendations without leaving your editor.',
  alternates: {
    canonical: '/',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function Page() {
  return <LandingPage />;
}

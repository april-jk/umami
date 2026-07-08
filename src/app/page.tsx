import type { Metadata } from 'next';
import LandingPage from './landingpage/LandingPage';

export const metadata: Metadata = {
  title: 'Amami - Ask your analytics from your AI assistant',
  description:
    'Amami lets Cursor, Claude Desktop, and other MCP clients answer traffic questions from your analytics data.',
};

export default function Page() {
  return <LandingPage />;
}

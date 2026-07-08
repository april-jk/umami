import type { Metadata } from 'next';
import LandingPage from './LandingPage';

export const metadata: Metadata = {
  title: 'Amami - Ask Umami analytics from your AI assistant',
  description:
    'Amami lets Cursor, Claude Desktop, and other MCP clients answer traffic questions from your Umami data.',
};

export default function Page() {
  return <LandingPage />;
}

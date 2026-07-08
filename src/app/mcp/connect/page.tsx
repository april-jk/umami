import type { Metadata } from 'next';
import { McpConnectPage } from './McpConnectPage';

export const dynamic = 'force-dynamic';

export default function Page() {
  return <McpConnectPage />;
}

export const metadata: Metadata = {
  title: 'Connect MCP',
};

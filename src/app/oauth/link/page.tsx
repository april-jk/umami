import type { Metadata } from 'next';
import { OAuthLinkPage } from './OAuthLinkPage';

export const dynamic = 'force-dynamic';

export default function () {
  return <OAuthLinkPage />;
}

export const metadata: Metadata = {
  title: 'Link OAuth account',
};

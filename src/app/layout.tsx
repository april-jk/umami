import type { Metadata } from 'next';
import { headers } from 'next/headers';
import Script from 'next/script';
import { Suspense } from 'react';
import { getBaseUrl } from '@/lib/get-base-url';
import { Providers } from './Providers';
import '@umami/react-zen/styles.full.css';
import './global.css';

export default function ({ children }) {
  if (process.env.DISABLE_UI) {
    return (
      <html>
        <body></body>
      </html>
    );
  }

  return (
    <html lang="en" className="notranslate" translate="no">
      <head>
        <link rel="icon" type="image/svg+xml" href="/favicon.svg?v=amami-20260708" />
        <link
          rel="icon"
          type="image/png"
          sizes="32x32"
          href="/favicon-32x32.png?v=amami-20260708"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="16x16"
          href="/favicon-16x16.png?v=amami-20260708"
        />
        <link
          rel="apple-touch-icon"
          sizes="180x180"
          href="/apple-touch-icon.png?v=amami-20260708"
        />
        <link rel="manifest" href="/site.webmanifest?v=amami-20260708" />
        <link rel="mask-icon" href="/safari-pinned-tab.svg?v=amami-20260708" color="#050706" />
        <meta name="msapplication-TileColor" content="#fffdf1" />
        <meta name="theme-color" content="#fafafa" media="(prefers-color-scheme: light)" />
        <meta name="theme-color" content="#2f2f2f" media="(prefers-color-scheme: dark)" />
      </head>
      <body>
        <Suspense>
          <Providers>{children}</Providers>
        </Suspense>
        <Script
          src="https://analytics.oneceo.ai/script.js"
          data-website-id="32d81594-6f52-4502-a713-87433481bc4f"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}

export async function generateMetadata(): Promise<Metadata> {
  const headerStore = await headers();

  return {
    metadataBase: getBaseUrl(headerStore),
    title: {
      template: '%s | Amami',
      default: 'Amami',
    },
    robots: {
      index: false,
      follow: false,
    },
  };
}

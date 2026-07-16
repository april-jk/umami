import { NextResponse } from 'next/server';
import {
  createOAuthState,
  getOAuthCallbackUrl,
  getOAuthConfig,
  isOAuthProvider,
} from '@/lib/oauth';

const STATE_COOKIE_PREFIX = 'amami-oauth-state-';

export async function GET(_: Request, { params }: { params: Promise<{ provider: string }> }) {
  const { provider: value } = await params;

  if (!isOAuthProvider(value)) {
    return new Response('OAuth provider not found', { status: 404 });
  }

  const config = getOAuthConfig(value);
  if (!config) {
    return new Response(`${value} OAuth is not configured`, { status: 503 });
  }

  const state = createOAuthState(value);
  const url = new URL(config.authorizationUrl);
  url.search = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: getOAuthCallbackUrl(value),
    response_type: 'code',
    scope: config.scopes.join(' '),
    state,
  }).toString();

  const response = NextResponse.redirect(url);
  response.cookies.set({
    name: `${STATE_COOKIE_PREFIX}${value}`,
    value: state,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 10 * 60,
    path: '/api/auth/oauth',
  });

  return response;
}

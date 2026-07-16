import { NextResponse } from 'next/server';
import {
  createOAuthLoginCode,
  getOAuthBaseUrl,
  getOAuthIdentity,
  isOAuthProvider,
  validateOAuthState,
} from '@/lib/oauth';
import { getOrCreateOAuthUser } from '@/queries/prisma';

const STATE_COOKIE_PREFIX = 'amami-oauth-state-';

function redirectToLogin() {
  return NextResponse.redirect(new URL('/login?oauthError=failed', getOAuthBaseUrl()));
}

export async function GET(request: Request, { params }: { params: Promise<{ provider: string }> }) {
  const { provider: value } = await params;

  if (!isOAuthProvider(value)) {
    return new Response('OAuth provider not found', { status: 404 });
  }

  const url = new URL(request.url);
  const stateCookie = request.headers
    .get('cookie')
    ?.match(new RegExp(`(?:^|;\\s*)${STATE_COOKIE_PREFIX}${value}=([^;]+)`))?.[1];
  const state = url.searchParams.get('state');
  const code = url.searchParams.get('code');

  if (!code || !validateOAuthState(state, stateCookie, value)) {
    return redirectToLogin();
  }

  try {
    const identity = await getOAuthIdentity(value, code);
    const user = await getOrCreateOAuthUser({ provider: value, ...identity });
    const loginCode = await createOAuthLoginCode(user.id);
    const redirect = new URL('/oauth/complete', getOAuthBaseUrl());
    redirect.hash = new URLSearchParams({ code: loginCode }).toString();

    const response = NextResponse.redirect(redirect);
    response.cookies.set({
      name: `${STATE_COOKIE_PREFIX}${value}`,
      value: '',
      maxAge: 0,
      path: '/api/auth/oauth',
    });
    return response;
  } catch (error) {
    // Keep provider responses out of the browser while retaining actionable server-side diagnostics.
    console.error('OAuth callback failed', {
      provider: value,
      message: error instanceof Error ? error.message : 'Unknown error',
    });
    return redirectToLogin();
  }
}

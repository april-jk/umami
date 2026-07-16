import crypto from 'node:crypto';
import { createToken, parseToken } from '@/lib/jwt';

export const OAUTH_PROVIDERS = ['google', 'github'] as const;
export type OAuthProvider = (typeof OAUTH_PROVIDERS)[number];

const STATE_TTL_SECONDS = 10 * 60;

type OAuthConfig = {
  clientId: string;
  clientSecret: string;
  authorizationUrl: string;
  tokenUrl: string;
  scopes: string[];
};

export type OAuthIdentity = {
  providerAccountId: string;
  email: string;
};

function getEnv(provider: OAuthProvider, name: 'ID' | 'SECRET') {
  return process.env[`${provider.toUpperCase()}_CLIENT_${name}`]?.trim();
}

export function isOAuthProvider(value: string): value is OAuthProvider {
  return OAUTH_PROVIDERS.includes(value as OAuthProvider);
}

export function getOAuthConfig(provider: OAuthProvider): OAuthConfig | null {
  const clientId = getEnv(provider, 'ID');
  const clientSecret = getEnv(provider, 'SECRET');

  if (!clientId || !clientSecret) {
    return null;
  }

  if (provider === 'google') {
    return {
      clientId,
      clientSecret,
      authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenUrl: 'https://oauth2.googleapis.com/token',
      scopes: ['openid', 'email', 'profile'],
    };
  }

  return {
    clientId,
    clientSecret,
    authorizationUrl: 'https://github.com/login/oauth/authorize',
    tokenUrl: 'https://github.com/login/oauth/access_token',
    scopes: ['read:user', 'user:email'],
  };
}

export function getOAuthBaseUrl() {
  const value = process.env.OAUTH_BASE_URL?.trim();

  if (!value) {
    throw new Error('OAUTH_BASE_URL is not configured');
  }

  return new URL(value).origin;
}

export function getOAuthCallbackUrl(provider: OAuthProvider) {
  return new URL(`/api/auth/oauth/${provider}/callback`, getOAuthBaseUrl()).toString();
}

export function createOAuthState(provider: OAuthProvider) {
  const nonce = crypto.randomBytes(32).toString('base64url');
  return createToken({ provider, nonce }, process.env.APP_SECRET, { expiresIn: STATE_TTL_SECONDS });
}

export function validateOAuthState(
  value: string | null,
  cookieValue: string | undefined,
  provider: OAuthProvider,
) {
  if (!value || !cookieValue || value.length !== cookieValue.length) {
    return false;
  }

  if (!crypto.timingSafeEqual(Buffer.from(value), Buffer.from(cookieValue))) {
    return false;
  }

  const payload = parseToken(value, process.env.APP_SECRET);
  return payload?.provider === provider && typeof payload.nonce === 'string';
}

async function fetchJson(url: string, init: RequestInit) {
  const response = await fetch(url, init);

  if (!response.ok) {
    throw new Error(`OAuth provider request failed with status ${response.status}`);
  }

  return response.json();
}

export async function getOAuthIdentity(
  provider: OAuthProvider,
  code: string,
): Promise<OAuthIdentity> {
  const config = getOAuthConfig(provider);
  if (!config) {
    throw new Error(`${provider} OAuth is not configured`);
  }

  const token = await fetchJson(config.tokenUrl, {
    method: 'POST',
    headers: { accept: 'application/json', 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code,
      redirect_uri: getOAuthCallbackUrl(provider),
      ...(provider === 'google' ? { grant_type: 'authorization_code' } : {}),
    }),
  });

  if (typeof token.access_token !== 'string') {
    throw new Error('OAuth provider did not return an access token');
  }

  if (provider === 'google') {
    const profile = await fetchJson('https://openidconnect.googleapis.com/v1/userinfo', {
      headers: { authorization: `Bearer ${token.access_token}` },
    });

    if (
      typeof profile.sub !== 'string' ||
      typeof profile.email !== 'string' ||
      !profile.email_verified
    ) {
      throw new Error('Google account does not provide a verified email address');
    }

    return { providerAccountId: profile.sub, email: profile.email.toLowerCase() };
  }

  const headers = {
    accept: 'application/vnd.github+json',
    authorization: `Bearer ${token.access_token}`,
    'x-github-api-version': '2022-11-28',
  };
  const profile = await fetchJson('https://api.github.com/user', { headers });
  const emails = await fetchJson('https://api.github.com/user/emails', { headers });
  const email = Array.isArray(emails)
    ? (emails.find(item => item?.primary && item?.verified)?.email ??
      emails.find(item => item?.verified)?.email)
    : undefined;

  if (typeof profile.id !== 'number' || typeof email !== 'string') {
    throw new Error('GitHub account does not provide a verified email address');
  }

  return { providerAccountId: String(profile.id), email: email.toLowerCase() };
}

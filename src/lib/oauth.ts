import crypto from 'node:crypto';
import { createToken, parseToken } from '@/lib/jwt';
import redis from '@/lib/redis';

export const OAUTH_PROVIDERS = ['google', 'github'] as const;
export type OAuthProvider = (typeof OAUTH_PROVIDERS)[number];

const STATE_TTL_SECONDS = 10 * 60;
const LOGIN_CODE_TTL_SECONDS = 60;
const LINK_CODE_TTL_SECONDS = 10 * 60;
const LOGIN_CODE_PREFIX = 'oauth-login:';
const LINK_CODE_PREFIX = 'oauth-link:';

type OAuthConfig = {
  clientId: string;
  clientSecret: string;
  authorizationUrl: string;
  tokenUrl: string;
  scopes: string[];
};

export type OAuthIdentity = {
  providerAccountId: string;
  email?: string;
};

type OAuthLoginCode = {
  userId: string;
};

function getVerifiedEmail(value: unknown, isVerified: unknown) {
  if (isVerified !== true || typeof value !== 'string') {
    return undefined;
  }

  const email = value.trim().toLowerCase();
  return email || undefined;
}

export type OAuthLinkCode = {
  provider: OAuthProvider;
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

export async function createOAuthLoginCode(userId: string) {
  if (!redis.enabled) {
    throw new Error('OAuth login requires Redis');
  }

  const code = crypto.randomBytes(32).toString('base64url');
  await redis.client.set(`${LOGIN_CODE_PREFIX}${code}`, { userId }, LOGIN_CODE_TTL_SECONDS);

  return code;
}

export async function consumeOAuthLoginCode(code: string): Promise<OAuthLoginCode | null> {
  if (!redis.enabled) {
    return null;
  }

  const payload = await redis.client.take(`${LOGIN_CODE_PREFIX}${code}`);

  return typeof payload?.userId === 'string' ? { userId: payload.userId } : null;
}

export async function createOAuthLinkCode(identity: OAuthLinkCode) {
  if (!redis.enabled) {
    throw new Error('OAuth account linking requires Redis');
  }

  const code = crypto.randomBytes(32).toString('base64url');
  await redis.client.set(`${LINK_CODE_PREFIX}${code}`, identity, LINK_CODE_TTL_SECONDS);

  return code;
}

export async function consumeOAuthLinkCode(code: string): Promise<OAuthLinkCode | null> {
  if (!redis.enabled) {
    return null;
  }

  const payload = await redis.client.take(`${LINK_CODE_PREFIX}${code}`);

  if (
    !isOAuthProvider(payload?.provider) ||
    typeof payload?.providerAccountId !== 'string' ||
    typeof payload?.email !== 'string'
  ) {
    return null;
  }

  return {
    provider: payload.provider,
    providerAccountId: payload.providerAccountId,
    email: payload.email.toLowerCase(),
  };
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

    if (typeof profile.sub !== 'string' || !profile.sub) {
      throw new Error('Google account does not provide a stable account identifier');
    }

    return {
      providerAccountId: profile.sub,
      email: getVerifiedEmail(profile.email, profile.email_verified),
    };
  }

  const headers = {
    accept: 'application/vnd.github+json',
    authorization: `Bearer ${token.access_token}`,
    'x-github-api-version': '2022-11-28',
  };
  const profile = await fetchJson('https://api.github.com/user', { headers });
  const emails = await fetchJson('https://api.github.com/user/emails', { headers });
  const email = Array.isArray(emails)
    ? (getVerifiedEmail(
        emails.find(item => item?.primary === true && item?.verified === true)?.email,
        true,
      ) ?? getVerifiedEmail(emails.find(item => item?.verified === true)?.email, true))
    : undefined;

  if (typeof profile.id !== 'number') {
    throw new Error('GitHub account does not provide a stable account identifier');
  }

  return { providerAccountId: String(profile.id), email };
}

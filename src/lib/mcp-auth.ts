import crypto from 'node:crypto';
import { createSecureToken, parseSecureToken } from '@/lib/jwt';
import redis from '@/lib/redis';
import { badRequest } from '@/lib/response';
import { secret } from './crypto';

const CODE_TTL_SECONDS = 300;
const CONSENT_TTL_SECONDS = 300;
const CODE_PREFIX = 'mcp-auth:';
const CODE_TYPE = 'mcp-auth-code';
const CONSENT_TYPE = 'mcp-consent';

export interface McpAuthorizationCode {
  type: typeof CODE_TYPE;
  userId: string;
  codeChallenge: string;
  codeChallengeMethod: 'S256';
  write: boolean;
  createdAt: number;
}

export interface McpConsentToken {
  type: typeof CONSENT_TYPE;
  redirectUri: string;
  state: string;
  codeChallenge: string;
  codeChallengeMethod: 'S256';
  write: boolean;
  createdAt: number;
}

export function isLoopbackRedirectUri(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      url.protocol === 'http:' &&
      url.pathname === '/callback' &&
      (url.hostname === '127.0.0.1' || url.hostname === 'localhost' || url.hostname === '[::1]')
    );
  } catch {
    return false;
  }
}

export function badRedirectUri() {
  return badRequest({
    message: 'redirectUri must be a loopback callback URL such as http://127.0.0.1:49152/callback',
    code: 'invalid-redirect-uri',
  });
}

export async function createMcpAuthorizationCode(
  data: Omit<McpAuthorizationCode, 'type' | 'createdAt'>,
) {
  const payload: McpAuthorizationCode = {
    ...data,
    type: CODE_TYPE,
    createdAt: Date.now(),
  };

  if (redis.enabled) {
    const code = crypto.randomBytes(32).toString('base64url');
    await redis.client.set(`${CODE_PREFIX}${code}`, payload, CODE_TTL_SECONDS);
    return code;
  }

  return createSecureToken(payload, secret(), { expiresIn: CODE_TTL_SECONDS });
}

export function createMcpConsentToken(data: Omit<McpConsentToken, 'type' | 'createdAt'>) {
  return createSecureToken(
    {
      ...data,
      type: CONSENT_TYPE,
      createdAt: Date.now(),
    } satisfies McpConsentToken,
    secret(),
    { expiresIn: CONSENT_TTL_SECONDS },
  );
}

export function parseMcpConsentToken(value: string): McpConsentToken | null {
  const payload = parseSecureToken(value, secret());
  return isMcpConsentToken(payload) ? payload : null;
}

export function verifyMcpConsentToken(
  token: string,
  data: Omit<McpConsentToken, 'type' | 'createdAt'>,
): boolean {
  const payload = parseMcpConsentToken(token);

  return (
    !!payload &&
    payload.redirectUri === data.redirectUri &&
    payload.state === data.state &&
    payload.codeChallenge === data.codeChallenge &&
    payload.codeChallengeMethod === data.codeChallengeMethod &&
    payload.write === data.write
  );
}

export async function consumeMcpAuthorizationCode(
  code: string,
): Promise<McpAuthorizationCode | null> {
  if (redis.enabled) {
    const key = `${CODE_PREFIX}${code}`;
    const payload = await redis.client.get(key);
    if (payload) {
      await redis.client.del(key);
    }
    return isMcpAuthorizationCode(payload) ? payload : null;
  }

  const payload = parseSecureToken(code, secret());
  return isMcpAuthorizationCode(payload) ? payload : null;
}

export function verifyCodeVerifier(codeVerifier: string, codeChallenge: string): boolean {
  const expected = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
  return timingSafeEqual(expected, codeChallenge);
}

function isMcpAuthorizationCode(value: any): value is McpAuthorizationCode {
  return (
    value?.type === CODE_TYPE &&
    typeof value.userId === 'string' &&
    typeof value.codeChallenge === 'string' &&
    value.codeChallengeMethod === 'S256' &&
    typeof value.write === 'boolean'
  );
}

function isMcpConsentToken(value: any): value is McpConsentToken {
  return (
    value?.type === CONSENT_TYPE &&
    typeof value.redirectUri === 'string' &&
    typeof value.state === 'string' &&
    typeof value.codeChallenge === 'string' &&
    value.codeChallengeMethod === 'S256' &&
    typeof value.write === 'boolean'
  );
}

function timingSafeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

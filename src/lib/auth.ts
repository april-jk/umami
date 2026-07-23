import debug from 'debug';
import {
  ROLE_PERMISSIONS,
  ROLES,
  SHARE_CONTEXT_HEADER,
  SHARE_TOKEN_HEADER,
  SHARE_TOKEN_TYPE,
} from '@/lib/constants';
import { createAuthKey, hash, secret } from '@/lib/crypto';
import { createSecureToken, parseSecureToken, parseToken } from '@/lib/jwt';
import {
  getMcpClientMetadata,
  isMcpInstallation,
  recordMcpClientAccess,
} from '@/lib/mcp-client-access';
import redis from '@/lib/redis';
import { ensureArray } from '@/lib/utils';
import { getApiKeyAuth, touchApiKey } from '@/queries/prisma/apiKey';
import { reserveMcpCall } from '@/queries/prisma/mcp-usage';
import { getUser } from '@/queries/prisma/user';

const log = debug('umami:auth');

export function getBearerToken(request: Request) {
  const auth = request.headers.get('authorization');

  return auth?.split(' ')[1];
}

export async function checkAuth(request: Request) {
  const token = getBearerToken(request);
  const payload = parseSecureToken(token, secret());
  const shareToken = await parseShareToken(request);

  let user = null;
  let apiKey = null;
  const { userId, authKey } = payload || {};

  if (userId) {
    user = await getUser(userId, { includePassword: true });

    // Reject tokens issued before the current password.
    // Allow legacy stateless tokens that were minted without a password fingerprint.
    if (user && payload.pwd && hash(user.password) !== payload.pwd) {
      user = null;
    }
  } else if (redis.enabled && authKey) {
    const key = await redis.client.get(authKey);

    if (key?.userId) {
      user = await getUser(key.userId, { includePassword: true });

      // Only enforce password-change invalidation for sessions that include a password fingerprint.
      if (user && key.pwd && hash(user.password) !== key.pwd) {
        user = null;
      }
    }
  } else if (token) {
    apiKey = await getApiKeyAuth(token);

    if (apiKey?.user) {
      user = apiKey.user;
      touchApiKey(apiKey.id).catch(e => log(e));
    }
  }

  log({
    hasToken: !!token,
    hasPayload: !!payload,
    hasAuthKey: !!authKey,
    hasApiKey: !!apiKey,
    hasShareToken: !!shareToken,
    userId: user?.id,
  });

  if (!user?.id && !shareToken) {
    log('User not authorized');
    return null;
  }

  if (!user?.id && shareToken) {
    const shareContext = request.headers.get(SHARE_CONTEXT_HEADER);
    if (!shareContext) {
      log('Share token used outside share context');
      return null;
    }
  }

  if (user) {
    delete user.password;
    user.isAdmin = user.role === ROLES.admin;
  }

  let mcpUsageLimit;
  if (apiKey && user && apiKey.id && isMcpInstallation(apiKey.clientType)) {
    const metadata = getMcpClientMetadata(request);
    const isPolicyRequest = new URL(request.url).pathname === '/api/mcp/client-policy';
    const usage = isPolicyRequest ? null : await reserveMcpCall(user.id, apiKey.tenantId);

    if (usage && !usage.allowed) {
      mcpUsageLimit = usage;
      await recordMcpClientAccess(
        request,
        { apiKeyId: apiKey.id, userId: user.id, tenantId: apiKey.tenantId },
        metadata,
        'mcp_limit_reached',
      ).catch(e => log('Failed to record MCP client access', e));
    } else {
      recordMcpClientAccess(
        request,
        { apiKeyId: apiKey.id, userId: user.id, tenantId: apiKey.tenantId },
        metadata,
      ).catch(e => log('Failed to record MCP client access', e));
    }
  }

  return {
    token,
    authKey,
    apiKeyId: apiKey?.id,
    apiKeyClientType: apiKey?.clientType,
    mcpUsageLimit,
    shareToken,
    user,
  };
}

export async function saveAuth(data: any, expire = 0) {
  const authKey = `auth:${createAuthKey()}`;

  if (redis.enabled) {
    await redis.client.set(authKey, data);

    if (expire) {
      await redis.client.expire(authKey, expire);
    }
  }

  return createSecureToken({ authKey }, secret());
}

export async function createAuthToken(user: { id: string; role: string; password: string }) {
  const pwd = hash(user.password);

  if (redis.enabled) {
    return saveAuth({ userId: user.id, role: user.role, pwd });
  }

  return createSecureToken({ userId: user.id, role: user.role, pwd }, secret());
}

export async function hasPermission(role: string, permission: string | string[]) {
  return ensureArray(permission).some(e => ROLE_PERMISSIONS[role]?.includes(e));
}

export function parseShareToken(request: Request) {
  try {
    const token: any = parseToken(request.headers.get(SHARE_TOKEN_HEADER), secret());

    // Only accept tokens explicitly minted as share tokens. This prevents other
    // tokens signed with the same secret (e.g. the cache token from /api/send)
    // from being replayed as share tokens to gain analytics access.
    if (token?.type !== SHARE_TOKEN_TYPE) {
      return null;
    }

    return token;
  } catch (e) {
    log(e);
    return null;
  }
}

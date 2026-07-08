import { z } from 'zod';
import { consumeMcpAuthorizationCode, verifyCodeVerifier } from '@/lib/mcp-auth';
import { parseRequest } from '@/lib/request';
import { badRequest, json, unauthorized } from '@/lib/response';
import { createApiKey } from '@/queries/prisma/apiKey';

export async function POST(request: Request) {
  const schema = z.object({
    code: z.string().min(1),
    codeVerifier: z.string().min(32).max(256),
    apiKeyName: z.string().trim().min(1).max(100).optional(),
  });

  const { body, error } = await parseRequest(request, schema, { skipAuth: true });

  if (error) {
    return error();
  }

  const payload = await consumeMcpAuthorizationCode(body.code);

  if (!payload) {
    return unauthorized({
      message: 'Authorization code is invalid or expired',
      code: 'invalid-code',
    });
  }

  if (!verifyCodeVerifier(body.codeVerifier, payload.codeChallenge)) {
    return badRequest({
      message: 'PKCE verifier does not match authorization code',
      code: 'invalid-code-verifier',
    });
  }

  const apiKey = await createApiKey(payload.userId, body.apiKeyName || 'Amami MCP');

  return json({
    apiKey: apiKey.key,
    keyPrefix: apiKey.keyPrefix,
    scopes: {
      write: payload.write,
    },
    tokenType: 'Bearer',
  });
}

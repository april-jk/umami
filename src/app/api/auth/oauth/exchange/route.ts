import { z } from 'zod';
import { createAuthToken } from '@/lib/auth';
import { consumeOAuthLoginCode } from '@/lib/oauth';
import { parseRequest } from '@/lib/request';
import { json, unauthorized } from '@/lib/response';
import { getUser } from '@/queries/prisma';

export async function POST(request: Request) {
  const schema = z.object({ code: z.string().min(1).max(256) });
  const { body, error } = await parseRequest(request, schema, { skipAuth: true });

  if (error) {
    return error();
  }

  const payload = await consumeOAuthLoginCode(body.code);
  const user = payload && (await getUser(payload.userId, { includePassword: true }));

  if (!user) {
    return unauthorized({
      message: 'OAuth login code is invalid or expired',
      code: 'invalid-oauth-login-code',
    });
  }

  return json({ token: await createAuthToken(user) });
}

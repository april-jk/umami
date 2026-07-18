import { z } from 'zod';
import { consumeOAuthLinkCode } from '@/lib/oauth';
import { parseRequest } from '@/lib/request';
import { badRequest, json } from '@/lib/response';
import { createOAuthAccount, getOAuthAccountUser } from '@/queries/prisma';

export async function POST(request: Request) {
  const schema = z.object({ code: z.string().min(1).max(256) });
  const { auth, body, error } = await parseRequest(request, schema);

  if (error) {
    return error();
  }

  const identity = await consumeOAuthLinkCode(body.code);

  if (!identity) {
    return badRequest({
      code: 'invalid-oauth-link-code',
      message: 'OAuth account linking code is invalid or expired',
    });
  }

  if (auth.user.username.toLowerCase() !== identity.email) {
    return badRequest({
      code: 'oauth-email-mismatch',
      message: 'Sign in with the existing account that uses this OAuth email address',
    });
  }

  const existingAccount = await getOAuthAccountUser(identity.provider, identity.providerAccountId);

  if (existingAccount) {
    return badRequest({
      code: 'oauth-account-already-linked',
      message: 'This OAuth account has already been linked',
    });
  }

  try {
    await createOAuthAccount({ ...identity, userId: auth.user.id });
  } catch (error) {
    if ((error as { code?: string }).code === 'P2002') {
      return badRequest({
        code: 'oauth-account-already-linked',
        message: 'This OAuth account has already been linked',
      });
    }

    throw error;
  }

  return json({ linked: true });
}

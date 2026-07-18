import { z } from 'zod';
import { consumeOAuthLinkCode } from '@/lib/oauth';
import { checkPassword } from '@/lib/password';
import { parseRequest } from '@/lib/request';
import { badRequest, json, unauthorized } from '@/lib/response';
import { createOAuthAccount, getOAuthAccountUser, getUser } from '@/queries/prisma';

export async function POST(request: Request) {
  const schema = z.object({
    code: z.string().min(1).max(256),
    password: z.string().min(1).max(255),
  });
  const { auth, body, error } = await parseRequest(request, schema);

  if (error) {
    return error();
  }

  // An API key or a stale browser session cannot replace an explicit password
  // confirmation for linking an external identity.
  if (auth.apiKeyId) {
    return unauthorized({
      code: 'oauth-link-password-required',
      message: 'Sign in with the account password to link an OAuth identity',
    });
  }

  const user = await getUser(auth.user.id, { includePassword: true });

  if (!user || !checkPassword(body.password, user.password)) {
    return unauthorized({
      code: 'oauth-link-password-required',
      message: 'Current password is incorrect',
    });
  }

  const identity = await consumeOAuthLinkCode(body.code);

  if (!identity) {
    return badRequest({
      code: 'invalid-oauth-link-code',
      message: 'OAuth account linking code is invalid or expired',
    });
  }

  if (user.email?.toLowerCase() !== identity.email) {
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
    await createOAuthAccount({ ...identity, userId: user.id });
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

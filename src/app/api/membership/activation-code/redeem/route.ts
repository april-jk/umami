import { z } from 'zod';
import { parseRequest } from '@/lib/request';
import { badRequest, json } from '@/lib/response';
import { ActivationCodeError, redeemActivationCodeForUser } from '@/queries/prisma/activation-code';

export async function POST(request: Request) {
  const { auth, body, error } = await parseRequest(
    request,
    z.object({ code: z.string().trim().min(1).max(128) }),
  );
  if (error) return error();

  try {
    return json(await redeemActivationCodeForUser(auth.user.id, body.code));
  } catch (error) {
    if (error instanceof ActivationCodeError) {
      return badRequest({ code: error.code, message: error.message });
    }
    throw error;
  }
}

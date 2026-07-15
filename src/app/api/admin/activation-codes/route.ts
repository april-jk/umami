import { z } from 'zod';
import { parseRequest } from '@/lib/request';
import { badRequest, json, unauthorized } from '@/lib/response';
import { pagingParams, searchParams, sortingParams } from '@/lib/schema';
import {
  ActivationCodeError,
  createActivationCode,
  getActivationCodes,
} from '@/queries/prisma/activation-code';
import { activationCodeSchema } from './schema';

function activationCodeError(error: unknown) {
  if (error instanceof ActivationCodeError) {
    return badRequest({ code: error.code, message: error.message });
  }
  throw error;
}

export async function GET(request: Request) {
  const { auth, query, error } = await parseRequest(
    request,
    z.object({ ...pagingParams, ...searchParams, ...sortingParams }),
  );
  if (error) return error();
  if (!auth.user.isAdmin)
    return unauthorized({ message: 'Only admins can manage activation codes.' });

  return json(await getActivationCodes(query));
}

export async function POST(request: Request) {
  const { auth, body, error } = await parseRequest(request, activationCodeSchema);
  if (error) return error();
  if (!auth.user.isAdmin)
    return unauthorized({ message: 'Only admins can manage activation codes.' });

  try {
    return json(await createActivationCode({ ...body, createdBy: auth.user.id }));
  } catch (error) {
    return activationCodeError(error);
  }
}

import { z } from 'zod';
import { parseRequest } from '@/lib/request';
import { badRequest, json, unauthorized } from '@/lib/response';
import { pagingParams, searchParams, sortingParams } from '@/lib/schema';
import {
  ACTIVATION_CODE_PLANS,
  ACTIVATION_CODE_STATUS,
  ActivationCodeError,
  createActivationCode,
  getActivationCodes,
} from '@/queries/prisma/activation-code';

const activationCodeSchema = z.object({
  code: z.string().trim().min(8).max(128).optional(),
  name: z.string().trim().max(120).optional(),
  note: z.string().trim().max(500).optional(),
  plan: z.enum(ACTIVATION_CODE_PLANS),
  durationDays: z.coerce.number().int().min(1).max(3650),
  startsAt: z.coerce.date().optional(),
  expiresAt: z.coerce.date().nullable().optional(),
  maxRedemptions: z.coerce.number().int().min(1).max(1_000_000),
  status: z.enum([ACTIVATION_CODE_STATUS.active, ACTIVATION_CODE_STATUS.disabled]).optional(),
});

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

import { z } from 'zod';
import { parseRequest } from '@/lib/request';
import { badRequest, json, notFound, ok, unauthorized } from '@/lib/response';
import {
  ACTIVATION_CODE_PLANS,
  ACTIVATION_CODE_STATUS,
  ActivationCodeError,
  deleteActivationCode,
  getActivationCode,
  updateActivationCode,
} from '@/queries/prisma/activation-code';

const updateSchema = z
  .object({
    name: z.string().trim().max(120).nullable().optional(),
    note: z.string().trim().max(500).nullable().optional(),
    plan: z.enum(ACTIVATION_CODE_PLANS).optional(),
    durationDays: z.coerce.number().int().min(1).max(3650).optional(),
    startsAt: z.coerce.date().optional(),
    expiresAt: z.coerce.date().nullable().optional(),
    maxRedemptions: z.coerce.number().int().min(1).max(1_000_000).optional(),
    status: z.enum([ACTIVATION_CODE_STATUS.active, ACTIVATION_CODE_STATUS.disabled]).optional(),
  })
  .refine(data => Object.keys(data).length > 0, { message: 'At least one field is required.' });

async function requireAdmin(request: Request, schema?: z.ZodType) {
  const parsed = await parseRequest(request, schema);
  if (parsed.error) return { response: parsed.error() };
  if (!parsed.auth.user.isAdmin) {
    return { response: unauthorized({ message: 'Only admins can manage activation codes.' }) };
  }
  return parsed;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ activationCodeId: string }> },
) {
  const parsed = await requireAdmin(request);
  if ('response' in parsed) return parsed.response;
  const { activationCodeId } = await params;
  const code = await getActivationCode(activationCodeId);
  return code ? json(code) : notFound();
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ activationCodeId: string }> },
) {
  const parsed = await requireAdmin(request, updateSchema);
  if ('response' in parsed) return parsed.response;
  const { activationCodeId } = await params;

  try {
    const code = await updateActivationCode(activationCodeId, parsed.body);
    return code ? json(code) : notFound();
  } catch (error) {
    if (error instanceof ActivationCodeError) {
      return badRequest({ code: error.code, message: error.message });
    }
    throw error;
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ activationCodeId: string }> },
) {
  const parsed = await requireAdmin(request);
  if ('response' in parsed) return parsed.response;
  const { activationCodeId } = await params;
  return (await deleteActivationCode(activationCodeId)) ? ok() : notFound();
}

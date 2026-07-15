import { z } from 'zod';
import { parseRequest } from '@/lib/request';
import { badRequest, forbidden, json } from '@/lib/response';
import { canManageTenantBilling } from '@/permissions/tenant';
import { ActivationCodeError, redeemActivationCode } from '@/queries/prisma/activation-code';

export async function POST(request: Request) {
  const { auth, body, error } = await parseRequest(
    request,
    z.object({ code: z.string().trim().min(1).max(128), tenantId: z.string().uuid() }),
  );
  if (error) return error();

  try {
    const { tenantId } = body;
    if (!(await canManageTenantBilling(auth, tenantId))) {
      return forbidden({ message: 'You do not have permission to manage this tenant billing.' });
    }
    return json(await redeemActivationCode(auth.user.id, tenantId, body.code));
  } catch (error) {
    if (error instanceof ActivationCodeError) {
      return badRequest({ code: error.code, message: error.message });
    }
    throw error;
  }
}

import { z } from 'zod';
import { createPaypalSubscription } from '@/lib/paypal';
import { parseRequest } from '@/lib/request';
import { forbidden, json, notFound } from '@/lib/response';
import { canManageTenantBilling } from '@/permissions/tenant';
import { getTenant } from '@/queries/prisma/tenant';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ tenantId: string }> },
) {
  const { auth, body, error } = await parseRequest(
    request,
    z.object({ plan: z.enum(['starter', 'pro', 'team']), interval: z.enum(['month', 'year']) }),
  );
  if (error) return error();

  const { tenantId } = await params;
  if (!(await canManageTenantBilling(auth, tenantId))) {
    return forbidden({ message: 'You do not have permission to manage this tenant billing.' });
  }
  if (!(await getTenant(tenantId))) return notFound();

  const origin = new URL(request.url).origin;
  const query = new URLSearchParams({ paypal: 'success', tenantId });
  const subscription = await createPaypalSubscription({
    tenantId,
    plan: body.plan,
    interval: body.interval,
    returnUrl: `${origin}/membership/upgrade?${query}`,
    cancelUrl: `${origin}/membership/upgrade?paypal=cancelled`,
  });

  return json(subscription);
}

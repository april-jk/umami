import { z } from 'zod';
import { createPaypalSubscription } from '@/lib/paypal';
import { parseRequest } from '@/lib/request';
import { badRequest, forbidden, json, notFound } from '@/lib/response';
import { canManageTenantBilling } from '@/permissions/tenant';
import { getMembershipConfig } from '@/queries/prisma/membership-config';
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
  const tenant = (await getTenant(tenantId, { includeSubscription: true })) as any;
  if (!tenant) return notFound();
  const existingSubscription = tenant.subscription;
  if (
    existingSubscription?.billingProvider === 'paypal' &&
    (!existingSubscription.currentPeriodEnd || existingSubscription.currentPeriodEnd > new Date())
  ) {
    return badRequest({
      message: 'Cancel your active PayPal subscription before selecting a different plan.',
    });
  }

  const config = await getMembershipConfig();
  if (!config.plans[body.plan].available) {
    return badRequest({ message: 'This membership plan is not currently available.' });
  }

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

import { z } from 'zod';
import { findConfiguredPlan, getPaypalSubscription } from '@/lib/paypal';
import { parseRequest } from '@/lib/request';
import { badRequest, forbidden, json, notFound, unauthorized } from '@/lib/response';
import { activatePaypalSubscription } from '@/lib/tenant-billing';
import { canManageTenantBilling } from '@/permissions/tenant';
import { getTenant } from '@/queries/prisma/tenant';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ tenantId: string }> },
) {
  const { auth, body, error } = await parseRequest(
    request,
    z.object({ subscriptionId: z.string().min(1) }),
  );
  if (error) return error();

  const { tenantId } = await params;
  if (!(await canManageTenantBilling(auth, tenantId))) {
    return forbidden({ message: 'You do not have permission to manage this tenant billing.' });
  }
  const tenant = (await getTenant(tenantId, { includeSubscription: true })) as any;
  if (!tenant) return notFound();

  const subscription = await getPaypalSubscription(body.subscriptionId);
  const configuredPlan = findConfiguredPlan(subscription.plan_id);
  if (
    subscription.status !== 'ACTIVE' ||
    !configuredPlan ||
    subscription.custom_id !== `${tenantId}:${configuredPlan.plan}:${configuredPlan.interval}`
  ) {
    return unauthorized({ message: 'PayPal subscription could not be verified.' });
  }
  const existingSubscription = tenant.subscription;
  if (
    existingSubscription?.billingProvider === 'paypal' &&
    existingSubscription.billingSubscriptionId !== subscription.id &&
    (!existingSubscription.currentPeriodEnd || existingSubscription.currentPeriodEnd > new Date())
  ) {
    return badRequest({ message: 'Another PayPal subscription is already active for this tenant.' });
  }

  await activatePaypalSubscription(tenantId, configuredPlan.plan, subscription);
  return json({ ok: true, plan: configuredPlan.plan });
}

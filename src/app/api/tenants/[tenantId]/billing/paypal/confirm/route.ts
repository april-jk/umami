import { z } from 'zod';
import { findConfiguredPlan, getPaypalSubscription } from '@/lib/paypal';
import { parseRequest } from '@/lib/request';
import { json, notFound, unauthorized } from '@/lib/response';
import { activatePaypalSubscription } from '@/lib/tenant-billing';
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
  if (!auth.user.isAdmin)
    return unauthorized({ message: 'Only global admins can manage billing.' });

  const { tenantId } = await params;
  if (!(await getTenant(tenantId))) return notFound();

  const subscription = await getPaypalSubscription(body.subscriptionId);
  const configuredPlan = findConfiguredPlan(subscription.plan_id);
  if (
    subscription.status !== 'ACTIVE' ||
    !configuredPlan ||
    subscription.custom_id !== `${tenantId}:${configuredPlan.plan}:${configuredPlan.interval}`
  ) {
    return unauthorized({ message: 'PayPal subscription could not be verified.' });
  }

  await activatePaypalSubscription(tenantId, configuredPlan.plan, subscription);
  return json({ ok: true, plan: configuredPlan.plan });
}

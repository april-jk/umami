import { cancelPaypalSubscription } from '@/lib/paypal';
import { parseRequest } from '@/lib/request';
import { forbidden, json, notFound } from '@/lib/response';
import { markPaypalCancellation } from '@/lib/tenant-billing';
import { canManageTenantBilling } from '@/permissions/tenant';
import { getTenantSubscription } from '@/queries/prisma/tenant';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ tenantId: string }> },
) {
  const { auth, error } = await parseRequest(request);
  if (error) return error();

  const { tenantId } = await params;
  if (!(await canManageTenantBilling(auth, tenantId))) {
    return forbidden({ message: 'You do not have permission to manage this tenant billing.' });
  }
  const subscription = await getTenantSubscription(tenantId);
  if (!subscription?.billingSubscriptionId || subscription.billingProvider !== 'paypal')
    return notFound();

  await cancelPaypalSubscription(subscription.billingSubscriptionId);
  await markPaypalCancellation(tenantId);
  return json({ ok: true, currentPeriodEnd: subscription.currentPeriodEnd });
}

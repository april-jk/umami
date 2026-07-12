import { cancelPaypalSubscription } from '@/lib/paypal';
import { parseRequest } from '@/lib/request';
import { json, notFound, unauthorized } from '@/lib/response';
import { markPaypalCancellation } from '@/lib/tenant-billing';
import { getTenantSubscription } from '@/queries/prisma/tenant';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ tenantId: string }> },
) {
  const { auth, error } = await parseRequest(request);
  if (error) return error();
  if (!auth.user.isAdmin)
    return unauthorized({ message: 'Only global admins can manage billing.' });

  const { tenantId } = await params;
  const subscription = await getTenantSubscription(tenantId);
  if (!subscription?.billingSubscriptionId || subscription.billingProvider !== 'paypal')
    return notFound();

  await cancelPaypalSubscription(subscription.billingSubscriptionId);
  await markPaypalCancellation(tenantId);
  return json({ ok: true, currentPeriodEnd: subscription.currentPeriodEnd });
}

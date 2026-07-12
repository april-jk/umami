import { updateRetentionCutoffForTenant } from '@/jobs/apply-retention';
import { uuid } from '@/lib/crypto';
import type { BillablePlan } from '@/lib/paypal';
import prisma from '@/lib/prisma';

export async function activatePaypalSubscription(
  tenantId: string,
  plan: BillablePlan,
  subscription: any,
) {
  const currentPeriodStart = subscription.start_time
    ? new Date(subscription.start_time)
    : new Date();
  const currentPeriodEnd = subscription.billing_info?.next_billing_time
    ? new Date(subscription.billing_info.next_billing_time)
    : null;

  await prisma.transaction(async tx => {
    await tx.tenant.update({ where: { id: tenantId }, data: { plan, status: 'active' } });
    await tx.tenantSubscription.upsert({
      where: { tenantId },
      create: {
        id: uuid(),
        tenantId,
        plan,
        status: 'active',
        billingProvider: 'paypal',
        billingCustomerId: subscription.subscriber?.payer_id ?? null,
        billingSubscriptionId: subscription.id,
        currentPeriodStart,
        currentPeriodEnd,
      },
      update: {
        plan,
        status: 'active',
        billingProvider: 'paypal',
        billingCustomerId: subscription.subscriber?.payer_id ?? null,
        billingSubscriptionId: subscription.id,
        currentPeriodStart,
        currentPeriodEnd,
        cancelAtPeriodEnd: false,
      },
    });
  });

  await updateRetentionCutoffForTenant(tenantId, plan);
}

export async function markPaypalCancellation(tenantId: string) {
  return prisma.client.tenantSubscription.update({
    where: { tenantId },
    data: { cancelAtPeriodEnd: true, updatedAt: new Date() },
  });
}

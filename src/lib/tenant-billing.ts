import { updateRetentionCutoffForTenant } from '@/jobs/apply-retention';
import { uuid } from '@/lib/crypto';
import type { BillablePlan } from '@/lib/paypal';
import { getHigherTenantPlan } from '@/lib/tenant-plan';
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

  let effectivePlan: string = plan;
  await prisma.transaction(async tx => {
    const activationRedemptions = await tx.activationCodeRedemption.findMany({
      where: { tenantId, membershipEndsAt: { gt: new Date() } },
      select: { plan: true },
    });
    effectivePlan = getHigherTenantPlan(plan, ...activationRedemptions.map(({ plan }) => plan));
    await tx.tenant.update({
      where: { id: tenantId },
      data: { plan: effectivePlan, status: 'active' },
    });
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

  await updateRetentionCutoffForTenant(tenantId, effectivePlan);
}

export async function markPaypalCancellation(tenantId: string) {
  return prisma.client.tenantSubscription.update({
    where: { tenantId },
    data: { cancelAtPeriodEnd: true, updatedAt: new Date() },
  });
}

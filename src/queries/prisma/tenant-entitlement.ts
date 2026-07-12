import prisma from '@/lib/prisma';
import {
  getTenantPlanEntitlements,
  hasTenantFeature,
  type TenantEntitlement,
} from '@/lib/tenant-entitlements';

export async function getWebsiteEntitlement(websiteId: string, feature: TenantEntitlement) {
  const website = await prisma.client.website.findUnique({
    where: { id: websiteId, deletedAt: null },
    select: { tenantId: true, tenant: { select: { plan: true } } },
  });
  const plan = website?.tenant?.plan ?? 'free';

  return {
    tenantId: website?.tenantId ?? null,
    plan,
    allowed: !website?.tenantId || hasTenantFeature(plan, feature),
    value: getTenantPlanEntitlements(plan)[feature],
  };
}

export async function getTenantGoalCount(tenantId: string) {
  return prisma.client.report.count({
    where: {
      type: 'goal',
      website: { tenantId, deletedAt: null },
    },
  });
}

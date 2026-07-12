import type { MembershipConfig } from '@/lib/membership-config';
import prisma from '@/lib/prisma';
import {
  getTenantPlanEntitlements,
  hasTenantFeature,
  type TenantEntitlement,
} from '@/lib/tenant-entitlements';
import { getMembershipConfig } from './membership-config';

export async function getWebsiteEntitlement(
  websiteId: string,
  feature: TenantEntitlement,
): Promise<{
  tenantId: string | null;
  plan: string;
  allowed: boolean;
  value: boolean | number | null;
  config?: MembershipConfig;
}> {
  const [website, config] = await Promise.all([
    prisma.client.website.findUnique({
      where: { id: websiteId, deletedAt: null },
      select: { tenantId: true, tenant: { select: { plan: true } } },
    }),
    getMembershipConfig(),
  ]);
  const plan = website?.tenant?.plan ?? 'free';

  return {
    tenantId: website?.tenantId ?? null,
    plan,
    allowed: !website?.tenantId || hasTenantFeature(plan, feature, config),
    value: getTenantPlanEntitlements(plan, config)[feature],
    config,
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

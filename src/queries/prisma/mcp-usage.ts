import { uuid } from '@/lib/crypto';
import { getMcpUsageQuota, type McpUsagePeriod } from '@/lib/tenant-entitlements';
import { isTenantPlanEnforcementEnabled } from '@/lib/tenant-plan';
import { getMembershipConfig } from './membership-config';
import { getTenantPlan } from './tenant';

export type McpUsageResult = {
  allowed: boolean;
  used: number | null;
  limit: number | null;
  remaining: number | null;
  period: McpUsagePeriod | null;
  periodStart: string | null;
  plan: string;
};

export function getMcpUsageScopeKey(userId: string, tenantId?: string | null) {
  return tenantId ? `tenant:${tenantId}` : `user:${userId}`;
}

export function getMcpUsagePeriodStart(period: McpUsagePeriod, now = new Date()) {
  return period === 'day'
    ? new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
    : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

async function getPrisma() {
  const { default: prisma } = await import('@/lib/prisma');
  return prisma;
}

async function getMcpQuota(tenantId?: string | null) {
  const [config, tenant] = await Promise.all([
    getMembershipConfig(),
    tenantId ? getTenantPlan(tenantId) : Promise.resolve(null),
  ]);
  const plan = tenant?.plan ?? 'free';
  return {
    config,
    plan,
    quota: getMcpUsageQuota(plan, tenant?.metadata, config),
  };
}

export async function reserveMcpCall(
  userId: string,
  tenantId?: string | null,
  now = new Date(),
): Promise<McpUsageResult> {
  if (!isTenantPlanEnforcementEnabled()) {
    return {
      allowed: true,
      used: null,
      limit: null,
      remaining: null,
      period: null,
      periodStart: null,
      plan: 'unlimited',
    };
  }

  const { plan, quota } = await getMcpQuota(tenantId);
  if (quota.limit === null || quota.period === null) {
    return {
      allowed: true,
      used: 0,
      limit: null,
      remaining: null,
      period: quota.period,
      periodStart: null,
      plan,
    };
  }

  const periodStart = getMcpUsagePeriodStart(quota.period, now);
  const scopeKey = getMcpUsageScopeKey(userId, tenantId);
  const prisma = await getPrisma();
  const result = (await prisma.transaction(async tx => {
    await tx.mcpUsageCounter.upsert({
      where: {
        scopeKey_period_periodStart: {
          scopeKey,
          period: quota.period,
          periodStart,
        },
      },
      create: {
        id: uuid(),
        scopeKey,
        period: quota.period,
        periodStart,
      },
      update: {},
    });

    const current = await tx.mcpUsageCounter.findUnique({
      where: {
        scopeKey_period_periodStart: {
          scopeKey,
          period: quota.period,
          periodStart,
        },
      },
      select: { callCount: true },
    });
    const currentCount = current?.callCount ?? 0;
    const updated = await tx.mcpUsageCounter.updateMany({
      where: {
        scopeKey,
        period: quota.period,
        periodStart,
        callCount: { lt: quota.limit },
      },
      data: { callCount: { increment: 1 } },
    });

    return { allowed: updated.count === 1, currentCount };
  })) as unknown as { allowed: boolean; currentCount: number };

  const used = result.allowed ? result.currentCount + 1 : result.currentCount;
  return {
    allowed: result.allowed,
    used,
    limit: quota.limit,
    remaining: Math.max(0, quota.limit - used),
    period: quota.period,
    periodStart: periodStart.toISOString(),
    plan,
  };
}

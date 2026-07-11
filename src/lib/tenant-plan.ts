export const TENANT_PLAN_LIMITS = {
  free: { eventLimit: 100_000, websiteLimit: 5, memberLimit: 1, retentionDays: 7 },
  starter: { eventLimit: 500_000, websiteLimit: 10, memberLimit: 1, retentionDays: 180 },
  pro: { eventLimit: 2_000_000, websiteLimit: 25, memberLimit: 5, retentionDays: 730 },
  team: { eventLimit: 10_000_000, websiteLimit: 50, memberLimit: 20, retentionDays: null },
  enterprise: { eventLimit: null, websiteLimit: null, memberLimit: null, retentionDays: null },
} as const;

export type TenantPlanId = keyof typeof TENANT_PLAN_LIMITS;
export type TenantPlanLimits = (typeof TENANT_PLAN_LIMITS)[TenantPlanId];

const DEFAULT_PLAN: TenantPlanId = 'free';

export function getTenantPlanLimits(plan?: string | null): TenantPlanLimits {
  return TENANT_PLAN_LIMITS[plan as TenantPlanId] ?? TENANT_PLAN_LIMITS[DEFAULT_PLAN];
}

export function isWithinLimit(current: number | bigint, limit: number | null): boolean {
  return limit === null || BigInt(current) < BigInt(limit);
}

export function getRetentionCutoff(retentionDays: number | null, now = new Date()): Date | null {
  if (retentionDays === null) return null;

  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - retentionDays),
  );
}

/** Calculate usage percentage, returns 0-100 or null if unlimited */
export function getUsagePercentage(used: number | bigint, limit: number | null): number | null {
  if (limit === null) return null;
  const pct = (Number(used) / limit) * 100;
  return Math.min(100, Math.max(0, Math.round(pct * 10) / 10));
}

/** Get the next tier plan ID for upgrade suggestions */
export function getNextPlanId(planId?: string | null): TenantPlanId | null {
  const order: TenantPlanId[] = ['free', 'starter', 'pro', 'team', 'enterprise'];
  const idx = order.indexOf(planId as TenantPlanId);
  if (idx === -1 || idx >= order.length - 1) return null;
  return order[idx + 1];
}

/** Get upgrade suggestion message for a given limit type */
export function getPlanUpgradeMessage(
  planId: string | null | undefined,
  limitType: 'event' | 'website' | 'member',
): string {
  const nextPlan = getNextPlanId(planId);
  if (!nextPlan) {
    return 'Contact sales for custom limits.';
  }

  const nextLimits = TENANT_PLAN_LIMITS[nextPlan];
  const limitMap = {
    event: nextLimits.eventLimit,
    website: nextLimits.websiteLimit,
    member: nextLimits.memberLimit,
  };
  const limitValue = limitMap[limitType];
  const limitLabel = limitValue === null ? 'unlimited' : limitValue.toLocaleString();

  const planLabels: Record<TenantPlanId, string> = {
    free: 'Free',
    starter: 'Starter',
    pro: 'Pro',
    team: 'Team',
    enterprise: 'Enterprise',
  };

  return `Upgrade to ${planLabels[nextPlan]} for ${limitLabel} ${limitType}s.`;
}

/** Get alert level based on usage percentage */
export function getUsageAlertLevel(percentage: number | null): 'none' | 'warning' | 'critical' | 'exceeded' {
  if (percentage === null) return 'none';
  if (percentage >= 100) return 'exceeded';
  if (percentage >= 95) return 'critical';
  if (percentage >= 80) return 'warning';
  return 'none';
}

/** Build a standardized limit-exceeded error payload */
export function getLimitErrorPayload(
  planId: string | null | undefined,
  limitType: 'event' | 'website' | 'member',
  current: number | bigint,
  limit: number | null,
): { message: string; code: string; current: number; limit: number | null; upgradeMessage: string } {
  const codeMap = {
    event: 'event-limit-reached',
    website: 'website-limit-reached',
    member: 'member-limit-reached',
  };

  return {
    message: `${limitType.charAt(0).toUpperCase() + limitType.slice(1)} limit reached.`,
    code: codeMap[limitType],
    current: Number(current),
    limit,
    upgradeMessage: getPlanUpgradeMessage(planId, limitType),
  };
}

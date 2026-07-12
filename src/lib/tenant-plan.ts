export const TENANT_PLAN_LIMITS = {
  free: { eventLimit: 100_000, websiteLimit: 5, memberLimit: 1, retentionDays: 7 },
  starter: { eventLimit: 500_000, websiteLimit: 10, memberLimit: 1, retentionDays: 180 },
  pro: { eventLimit: 1_000_000, websiteLimit: 25, memberLimit: 5, retentionDays: 730 },
  team: { eventLimit: 5_000_000, websiteLimit: 50, memberLimit: 20, retentionDays: null },
  enterprise: {
    eventLimit: 20_000_000,
    websiteLimit: null,
    memberLimit: null,
    retentionDays: null,
  },
} as const;

export const TENANT_PLAN_PRICES = {
  free: { monthly: 0, annual: 0 },
  starter: { monthly: 9, annual: 90 },
  pro: { monthly: 29, annual: 290 },
  team: { monthly: 79, annual: 790 },
  enterprise: { monthly: 199, annual: 1990 },
} as const;

export type TenantPlanId = keyof typeof TENANT_PLAN_LIMITS;
export type TenantPlanLimits = (typeof TENANT_PLAN_LIMITS)[TenantPlanId];
export type TenantQuotaKey = 'eventLimit' | 'websiteLimit' | 'memberLimit';
export type TenantQuotaOverrides = Partial<Record<TenantQuotaKey, number | null>>;
export type EffectiveTenantPlanLimits = {
  eventLimit: number | null;
  websiteLimit: number | null;
  memberLimit: number | null;
  retentionDays: number | null;
};

const TENANT_QUOTA_KEYS: TenantQuotaKey[] = ['eventLimit', 'websiteLimit', 'memberLimit'];

const DEFAULT_PLAN: TenantPlanId = 'free';

export function isTenantPlanEnforcementEnabled(): boolean {
  const membershipEnabled = process.env.MEMBERSHIP_ENABLED?.trim().toLowerCase();

  return Boolean(
    process.env.CLOUD_MODE || membershipEnabled === '1' || membershipEnabled === 'true',
  );
}

export function getTenantPlanId(plan?: string | null): TenantPlanId {
  return plan in TENANT_PLAN_LIMITS ? (plan as TenantPlanId) : DEFAULT_PLAN;
}

export function getTenantPlanLimits(plan?: string | null): TenantPlanLimits {
  return TENANT_PLAN_LIMITS[getTenantPlanId(plan)];
}

export function getTenantQuotaOverrides(metadata: unknown): TenantQuotaOverrides {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return {};

  const quotaOverrides = (metadata as Record<string, unknown>).quotaOverrides;
  if (!quotaOverrides || typeof quotaOverrides !== 'object' || Array.isArray(quotaOverrides)) {
    return {};
  }

  return TENANT_QUOTA_KEYS.reduce<TenantQuotaOverrides>((result, key) => {
    const value = (quotaOverrides as Record<string, unknown>)[key];
    if (value === null || (typeof value === 'number' && Number.isInteger(value) && value >= 0)) {
      result[key] = value as number | null;
    }
    return result;
  }, {});
}

export function getTenantEffectiveLimits(
  plan?: string | null,
  metadata?: unknown,
): EffectiveTenantPlanLimits {
  return {
    ...getTenantPlanLimits(plan),
    ...getTenantQuotaOverrides(metadata),
  };
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

export function getRecommendedPlanId(
  planId: string | null | undefined,
  limitType: 'event' | 'website' | 'member',
): TenantPlanId | null {
  const currentPlan = getTenantPlanId(planId);
  const limitKey = `${limitType}Limit` as 'eventLimit' | 'websiteLimit' | 'memberLimit';
  const currentLimit = TENANT_PLAN_LIMITS[currentPlan][limitKey];
  let nextPlan = getNextPlanId(currentPlan);

  while (nextPlan) {
    const nextLimit = TENANT_PLAN_LIMITS[nextPlan][limitKey];
    if (nextLimit === null || (currentLimit !== null && nextLimit > currentLimit)) {
      return nextPlan;
    }
    nextPlan = getNextPlanId(nextPlan);
  }

  return null;
}

/** Get upgrade suggestion message for a given limit type */
export function getPlanUpgradeMessage(
  planId: string | null | undefined,
  limitType: 'event' | 'website' | 'member',
): string {
  const nextPlan = getRecommendedPlanId(planId, limitType);
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
export function getUsageAlertLevel(
  percentage: number | null,
): 'none' | 'warning' | 'critical' | 'exceeded' {
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
): {
  message: string;
  code: string;
  current: number;
  limit: number | null;
  upgradeMessage: string;
  type: 'plan-limit';
  resource: 'event' | 'website' | 'member';
  currentPlan: TenantPlanId;
  recommendedPlan: TenantPlanId | null;
  upgradeUrl: string;
} {
  const codeMap = {
    event: 'event-limit-reached',
    website: 'website-limit-reached',
    member: 'member-limit-reached',
  };

  const currentPlan = getTenantPlanId(planId);
  const recommendedPlan = getRecommendedPlanId(currentPlan, limitType);
  const upgradeMessage = getPlanUpgradeMessage(currentPlan, limitType);

  return {
    type: 'plan-limit' as const,
    resource: limitType,
    currentPlan,
    recommendedPlan,
    upgradeUrl: `/membership/upgrade?reason=${limitType}`,
    message: `${limitType.charAt(0).toUpperCase() + limitType.slice(1)} limit reached. ${upgradeMessage}`,
    code: codeMap[limitType],
    current: Number(current),
    limit,
    upgradeMessage,
  };
}

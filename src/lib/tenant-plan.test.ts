import { describe, expect, test } from 'vitest';
import {
  getLimitErrorPayload,
  getNextPlanId,
  getPlanUpgradeMessage,
  getRecommendedPlanId,
  getRetentionCutoff,
  getTenantPlanId,
  getTenantPlanLimits,
  getUsageAlertLevel,
  getUsagePercentage,
  isTenantPlanEnforcementEnabled,
  isWithinLimit,
  TENANT_PLAN_LIMITS,
  TENANT_PLAN_PRICES,
} from './tenant-plan';

describe('tenant plan limits', () => {
  test.each(Object.entries(TENANT_PLAN_LIMITS))('resolves %s', (plan, limits) => {
    expect(getTenantPlanLimits(plan)).toEqual(limits);
  });

  test('defaults unknown and missing plans to Free', () => {
    expect(getTenantPlanLimits()).toEqual(TENANT_PLAN_LIMITS.free);
    expect(getTenantPlanLimits('legacy-plan')).toEqual(TENANT_PLAN_LIMITS.free);
  });

  test('normalizes plan identifiers', () => {
    expect(getTenantPlanId('pro')).toBe('pro');
    expect(getTenantPlanId('legacy-plan')).toBe('free');
    expect(getTenantPlanId()).toBe('free');
  });

  test('treats null limits as unlimited and supports bigint counters', () => {
    expect(isWithinLimit(10, null)).toBe(true);
    expect(isWithinLimit(99_999n, 100_000)).toBe(true);
    expect(isWithinLimit(100_000n, 100_000)).toBe(false);
  });

  test('calculates a start-of-day retention cutoff', () => {
    const now = new Date('2026-07-11T15:42:00.000Z');
    expect(getRetentionCutoff(7, now)).toEqual(new Date('2026-07-04T00:00:00.000Z'));
    expect(getRetentionCutoff(null, now)).toBeNull();
  });
});

describe('isTenantPlanEnforcementEnabled', () => {
  test('supports the provider-independent membership switch', () => {
    delete process.env.CLOUD_MODE;
    process.env.MEMBERSHIP_ENABLED = 'true';

    expect(isTenantPlanEnforcementEnabled()).toBe(true);

    process.env.MEMBERSHIP_ENABLED = '1';
    expect(isTenantPlanEnforcementEnabled()).toBe(true);

    delete process.env.MEMBERSHIP_ENABLED;
  });

  test('keeps legacy cloud mode enabled and self-hosted mode unrestricted by default', () => {
    delete process.env.MEMBERSHIP_ENABLED;
    process.env.CLOUD_MODE = '1';
    expect(isTenantPlanEnforcementEnabled()).toBe(true);

    delete process.env.CLOUD_MODE;
    expect(isTenantPlanEnforcementEnabled()).toBe(false);
  });
});

describe('tenant plan prices', () => {
  test('charges ten monthly payments for annual paid plans', () => {
    expect(TENANT_PLAN_PRICES.starter).toEqual({ monthly: 9, annual: 90 });
    expect(TENANT_PLAN_PRICES.pro).toEqual({ monthly: 19, annual: 190 });
    expect(TENANT_PLAN_PRICES.team).toEqual({ monthly: 39, annual: 390 });
  });
});

describe('getUsagePercentage', () => {
  test('returns null for unlimited plans', () => {
    expect(getUsagePercentage(1_000_000, null)).toBeNull();
  });

  test('calculates correct percentage', () => {
    expect(getUsagePercentage(50_000, 100_000)).toBe(50);
    expect(getUsagePercentage(80_000, 100_000)).toBe(80);
    expect(getUsagePercentage(95_000, 100_000)).toBe(95);
    expect(getUsagePercentage(100_000, 100_000)).toBe(100);
  });

  test('caps at 100 and floors at 0', () => {
    expect(getUsagePercentage(150_000, 100_000)).toBe(100);
    expect(getUsagePercentage(0, 100_000)).toBe(0);
  });

  test('handles bigint inputs', () => {
    expect(getUsagePercentage(50_000n, 100_000)).toBe(50);
    expect(getUsagePercentage(100_000n, 100_000)).toBe(100);
  });

  test('rounds to one decimal place', () => {
    expect(getUsagePercentage(33_333, 100_000)).toBe(33.3);
    expect(getUsagePercentage(66_667, 100_000)).toBe(66.7);
  });
});

describe('getNextPlanId', () => {
  test('returns next tier for each plan', () => {
    expect(getNextPlanId('free')).toBe('starter');
    expect(getNextPlanId('starter')).toBe('pro');
    expect(getNextPlanId('pro')).toBe('team');
    expect(getNextPlanId('team')).toBe('enterprise');
  });

  test('returns null for enterprise and unknown plans', () => {
    expect(getNextPlanId('enterprise')).toBeNull();
    expect(getNextPlanId('unknown')).toBeNull();
    expect(getNextPlanId(null)).toBeNull();
  });
});

describe('getPlanUpgradeMessage', () => {
  test('returns upgrade message with next plan limits', () => {
    expect(getPlanUpgradeMessage('free', 'event')).toContain('Starter');
    expect(getPlanUpgradeMessage('free', 'event')).toContain('500,000');
    expect(getPlanUpgradeMessage('starter', 'website')).toContain('Pro');
    expect(getPlanUpgradeMessage('starter', 'website')).toContain('25');
  });

  test('returns unlimited for next tier when applicable', () => {
    expect(getPlanUpgradeMessage('pro', 'member')).toContain('Team');
    expect(getPlanUpgradeMessage('pro', 'member')).toContain('20');
  });

  test('returns contact sales for enterprise', () => {
    expect(getPlanUpgradeMessage('enterprise', 'event')).toBe('Contact sales for custom limits.');
    expect(getPlanUpgradeMessage('team', 'event')).toContain('Enterprise');
    expect(getPlanUpgradeMessage('team', 'event')).toContain('unlimited');
  });

  test('handles unknown plans by treating them as free', () => {
    expect(getPlanUpgradeMessage('unknown', 'website')).toContain('Starter');
  });
});

describe('getRecommendedPlanId', () => {
  test('skips a paid tier that does not increase the exhausted limit', () => {
    expect(getRecommendedPlanId('free', 'member')).toBe('pro');
    expect(getRecommendedPlanId('free', 'website')).toBe('starter');
    expect(getRecommendedPlanId('pro', 'event')).toBe('team');
  });

  test('returns null when the current plan is already unlimited', () => {
    expect(getRecommendedPlanId('enterprise', 'member')).toBeNull();
  });
});

describe('getUsageAlertLevel', () => {
  test('returns none for low usage or unlimited', () => {
    expect(getUsageAlertLevel(0)).toBe('none');
    expect(getUsageAlertLevel(50)).toBe('none');
    expect(getUsageAlertLevel(79.9)).toBe('none');
    expect(getUsageAlertLevel(null)).toBe('none');
  });

  test('returns warning at 80%', () => {
    expect(getUsageAlertLevel(80)).toBe('warning');
    expect(getUsageAlertLevel(89)).toBe('warning');
    expect(getUsageAlertLevel(94.9)).toBe('warning');
  });

  test('returns critical at 95%', () => {
    expect(getUsageAlertLevel(95)).toBe('critical');
    expect(getUsageAlertLevel(99)).toBe('critical');
    expect(getUsageAlertLevel(99.9)).toBe('critical');
  });

  test('returns exceeded at 100%', () => {
    expect(getUsageAlertLevel(100)).toBe('exceeded');
    expect(getUsageAlertLevel(150)).toBe('exceeded');
  });
});

describe('getLimitErrorPayload', () => {
  test('returns structured error for event limit', () => {
    const payload = getLimitErrorPayload('free', 'event', 100_000, 100_000);
    expect(payload.code).toBe('event-limit-reached');
    expect(payload.current).toBe(100_000);
    expect(payload.limit).toBe(100_000);
    expect(payload.message).toContain('Event limit reached.');
    expect(payload.message).toContain('Upgrade to Starter');
    expect(payload.upgradeMessage).toContain('Starter');
    expect(payload).toMatchObject({
      type: 'plan-limit',
      resource: 'event',
      currentPlan: 'free',
      recommendedPlan: 'starter',
      upgradeUrl: '/membership/upgrade?reason=event',
    });
  });

  test('returns structured error for website limit', () => {
    const payload = getLimitErrorPayload('starter', 'website', 10, 10);
    expect(payload.code).toBe('website-limit-reached');
    expect(payload.current).toBe(10);
    expect(payload.limit).toBe(10);
    expect(payload.upgradeMessage).toContain('Pro');
  });

  test('returns structured error for member limit', () => {
    const payload = getLimitErrorPayload('pro', 'member', 5, 5);
    expect(payload.code).toBe('member-limit-reached');
    expect(payload.current).toBe(5);
    expect(payload.upgradeMessage).toContain('Team');
  });

  test('handles unlimited limit as null', () => {
    const payload = getLimitErrorPayload('team', 'event', 100, null);
    expect(payload.limit).toBeNull();
    expect(payload.upgradeMessage).toContain('Enterprise');
  });

  test('handles bigint current value', () => {
    const payload = getLimitErrorPayload('free', 'event', 100_000n, 100_000);
    expect(payload.current).toBe(100_000);
  });

  test('normalizes unknown plans and omits a recommendation after Enterprise', () => {
    expect(getLimitErrorPayload('unknown', 'website', 5, 5).currentPlan).toBe('free');
    expect(getLimitErrorPayload('enterprise', 'website', 5, null).recommendedPlan).toBeNull();
  });
});

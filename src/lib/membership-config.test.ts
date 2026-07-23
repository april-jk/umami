import { describe, expect, test } from 'vitest';
import {
  createDefaultMembershipConfig,
  MEMBERSHIP_PLAN_IDS,
  membershipConfigSchema,
  parseMembershipConfig,
} from './membership-config';

describe('membership configuration', () => {
  test('creates an independent configuration from pricing v2.1 defaults', () => {
    const first = createDefaultMembershipConfig();
    const second = createDefaultMembershipConfig();

    expect(MEMBERSHIP_PLAN_IDS).toEqual(['free', 'starter', 'pro', 'team', 'enterprise']);
    expect(first.plans.starter.prices).toEqual({ monthly: 9, annual: 90 });
    expect(first.plans.pro.limits.eventLimit).toBe(1_000_000);
    expect(first.plans.team.entitlements.ssoSaml).toBe(true);

    first.plans.starter.limits.eventLimit = 1;
    expect(second.plans.starter.limits.eventLimit).toBe(500_000);
  });

  test('accepts custom values, unlimited quotas, and hidden plans', () => {
    const config = createDefaultMembershipConfig();
    config.plans.starter.available = false;
    config.plans.pro.prices.monthly = 35.5;
    config.plans.pro.limits.websiteLimit = null;
    config.plans.pro.entitlements.goalLimit = 250;

    expect(membershipConfigSchema.safeParse(config).success).toBe(true);
    expect(parseMembershipConfig(config)).toEqual(config);
  });

  test('backfills monthly MCP defaults for configurations saved before monthly quotas existed', () => {
    const legacy = createDefaultMembershipConfig() as any;
    for (const plan of MEMBERSHIP_PLAN_IDS) {
      delete legacy.plans[plan].entitlements.mcpCallsPerMonth;
    }

    const parsed = parseMembershipConfig(legacy);

    expect(parsed?.plans.free.entitlements.mcpCallsPerMonth).toBeNull();
    expect(parsed?.plans.pro.entitlements.mcpCallsPerMonth).toBe(10_000);
    expect(parsed?.plans.team.entitlements.mcpCallsPerMonth).toBe(50_000);
  });

  test('rejects invalid prices and entitlement values', () => {
    const freePrice = createDefaultMembershipConfig();
    freePrice.plans.free.prices.monthly = 1;
    expect(membershipConfigSchema.safeParse(freePrice).success).toBe(false);

    const missingPaidPrice = createDefaultMembershipConfig();
    missingPaidPrice.plans.starter.prices.annual = null;
    expect(membershipConfigSchema.safeParse(missingPaidPrice).success).toBe(false);

    missingPaidPrice.plans.starter.available = false;
    expect(membershipConfigSchema.safeParse(missingPaidPrice).success).toBe(true);

    const negativeQuota = createDefaultMembershipConfig();
    negativeQuota.plans.pro.entitlements.goalLimit = -1;
    expect(parseMembershipConfig(negativeQuota)).toBeNull();
    expect(parseMembershipConfig(null)).toBeNull();
  });
});

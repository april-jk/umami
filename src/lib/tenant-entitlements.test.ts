import { describe, expect, test } from 'vitest';
import { createDefaultMembershipConfig } from './membership-config';
import {
  getEntitlementErrorPayload,
  getEntitlementRecommendedPlan,
  getEntitlementUpgradeMessage,
  getTenantPlanEntitlements,
  hasTenantFeature,
  TENANT_ENTITLEMENT_STATUS,
  TENANT_PLAN_ENTITLEMENTS,
} from './tenant-entitlements';

describe('tenant entitlements', () => {
  test('matches the published quota catalog', () => {
    expect(TENANT_PLAN_ENTITLEMENTS.free.mcpCallsPerDay).toBe(50);
    expect(TENANT_PLAN_ENTITLEMENTS.free.goalLimit).toBe(5);
    expect(TENANT_PLAN_ENTITLEMENTS.free.replayLimit).toBe(50);
    expect(TENANT_PLAN_ENTITLEMENTS.starter.replayLimit).toBe(500);
    expect(TENANT_PLAN_ENTITLEMENTS.starter.csvExport).toBe(10_000);
    expect(TENANT_PLAN_ENTITLEMENTS.pro.csvExport).toBe(100_000);
    expect(TENANT_PLAN_ENTITLEMENTS.team.csvExport).toBe(500_000);
    expect(TENANT_PLAN_ENTITLEMENTS.enterprise.csvExport).toBeNull();
    expect(TENANT_PLAN_ENTITLEMENTS.pro.webhookLimit).toBe(5);
    expect(TENANT_PLAN_ENTITLEMENTS.team.ssoSaml).toBe(true);
    expect(TENANT_ENTITLEMENT_STATUS.csvExport).toBe('enforced');
    expect(TENANT_ENTITLEMENT_STATUS.replayLimit).toBe('legacy');
    expect(TENANT_ENTITLEMENT_STATUS.webhookLimit).toBe('planned');
  });

  test('falls back to free entitlements for unknown plans', () => {
    expect(getTenantPlanEntitlements('unknown')).toBe(TENANT_PLAN_ENTITLEMENTS.free);
  });

  test('recognizes enabled, limited, unlimited, and disabled features', () => {
    expect(hasTenantFeature('starter', 'csvExport')).toBe(true);
    expect(hasTenantFeature('starter', 'goalLimit')).toBe(true);
    expect(hasTenantFeature('team', 'goalLimit')).toBe(true);
    expect(hasTenantFeature('free', 'csvExport')).toBe(false);
    expect(hasTenantFeature('free', 'goalLimit')).toBe(true);
  });

  test('finds the first plan that enables a feature', () => {
    expect(getEntitlementUpgradeMessage('free', 'csvExport')).toContain('Starter');
    expect(getEntitlementUpgradeMessage('starter', 'jsonExport')).toContain('Pro');
    expect(getEntitlementUpgradeMessage('pro', 'ssoSaml')).toContain('Team');
    expect(getEntitlementUpgradeMessage('free', 'ssoSaml')).toContain('Team');
    expect(getEntitlementUpgradeMessage('enterprise', 'csvExport')).toContain('Contact sales');
    expect(getEntitlementRecommendedPlan('free', 'ssoSaml')).toBe('team');
    expect(getEntitlementRecommendedPlan('enterprise', 'csvExport')).toBeNull();
  });

  test('builds a standardized entitlement error', () => {
    expect(getEntitlementErrorPayload('free', 'goalLimit', 5, 5)).toEqual({
      type: 'plan-limit',
      resource: 'goalLimit',
      currentPlan: 'free',
      recommendedPlan: 'starter',
      upgradeUrl: '/membership/upgrade?reason=goalLimit',
      message: 'Plan entitlement reached. Upgrade to Starter to use this feature.',
      code: 'goal-limit-reached',
      current: 5,
      limit: 5,
      upgradeMessage: 'Upgrade to Starter to use this feature.',
    });
  });
});

describe('dynamic tenant entitlements', () => {
  test('uses configured feature values and upgrade recommendations', () => {
    const config = createDefaultMembershipConfig();
    config.plans.free.entitlements.goalLimit = 0;
    config.plans.starter.entitlements.goalLimit = 0;
    config.plans.pro.entitlements.goalLimit = 250;

    expect(getTenantPlanEntitlements('pro', config).goalLimit).toBe(250);
    expect(hasTenantFeature('free', 'goalLimit', config)).toBe(false);
    expect(getEntitlementRecommendedPlan('free', 'goalLimit', config)).toBe('pro');
    expect(getEntitlementUpgradeMessage('free', 'goalLimit', config)).toContain('Pro');
    expect(getEntitlementErrorPayload('free', 'goalLimit', 0, 0, config)).toMatchObject({
      recommendedPlan: 'pro',
      limit: 0,
    });

    config.plans.pro.available = false;
    expect(getEntitlementRecommendedPlan('free', 'goalLimit', config)).toBe('team');
    expect(getEntitlementUpgradeMessage('free', 'goalLimit', config)).toContain('Team');
  });
});

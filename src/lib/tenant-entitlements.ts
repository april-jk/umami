import type { MembershipConfig } from './membership-config';
import { getNextPlanId, getTenantPlanId } from './tenant-plan';

export const TENANT_PLAN_ENTITLEMENTS = {
  free: {
    mcpCallsPerDay: 50,
    apiRequestsPerMinute: 10,
    aiAnalysesPerMonth: 10,
    replayLimit: 50,
    goalLimit: 5,
    aiReportLimit: 0,
    alertRuleLimit: 0,
    webhookLimit: 0,
    csvExport: 0,
    jsonExport: false,
    emailReports: false,
    slackAlerts: false,
    ssoSaml: false,
    whiteLabel: false,
  },
  starter: {
    mcpCallsPerDay: 500,
    apiRequestsPerMinute: 60,
    aiAnalysesPerMonth: null,
    replayLimit: 500,
    goalLimit: 20,
    aiReportLimit: 5,
    alertRuleLimit: 3,
    webhookLimit: 0,
    csvExport: 10_000,
    jsonExport: false,
    emailReports: true,
    slackAlerts: false,
    ssoSaml: false,
    whiteLabel: false,
  },
  pro: {
    mcpCallsPerDay: null,
    apiRequestsPerMinute: 300,
    aiAnalysesPerMonth: null,
    replayLimit: 5_000,
    goalLimit: 100,
    aiReportLimit: 50,
    alertRuleLimit: 20,
    webhookLimit: 5,
    csvExport: 100_000,
    jsonExport: true,
    emailReports: true,
    slackAlerts: true,
    ssoSaml: false,
    whiteLabel: false,
  },
  team: {
    mcpCallsPerDay: null,
    apiRequestsPerMinute: 600,
    aiAnalysesPerMonth: null,
    replayLimit: 25_000,
    goalLimit: null,
    aiReportLimit: 200,
    alertRuleLimit: 100,
    webhookLimit: 20,
    csvExport: 500_000,
    jsonExport: true,
    emailReports: true,
    slackAlerts: true,
    ssoSaml: true,
    whiteLabel: true,
  },
  enterprise: {
    mcpCallsPerDay: null,
    apiRequestsPerMinute: null,
    aiAnalysesPerMonth: null,
    replayLimit: null,
    goalLimit: null,
    aiReportLimit: null,
    alertRuleLimit: null,
    webhookLimit: null,
    csvExport: null,
    jsonExport: true,
    emailReports: true,
    slackAlerts: true,
    ssoSaml: true,
    whiteLabel: true,
  },
} as const;

export type TenantEntitlement = keyof (typeof TENANT_PLAN_ENTITLEMENTS)['free'];
export type TenantPlanEntitlements = Record<TenantEntitlement, boolean | number | null>;

export const TENANT_ENTITLEMENT_STATUS: Record<
  TenantEntitlement,
  'enforced' | 'legacy' | 'planned'
> = {
  mcpCallsPerDay: 'planned',
  apiRequestsPerMinute: 'planned',
  aiAnalysesPerMonth: 'planned',
  replayLimit: 'legacy',
  goalLimit: 'enforced',
  aiReportLimit: 'planned',
  alertRuleLimit: 'planned',
  webhookLimit: 'planned',
  csvExport: 'enforced',
  jsonExport: 'planned',
  emailReports: 'planned',
  slackAlerts: 'planned',
  ssoSaml: 'planned',
  whiteLabel: 'legacy',
};

export function getTenantPlanEntitlements(plan?: string | null, config?: MembershipConfig) {
  const planId = getTenantPlanId(plan);
  return (config?.plans[planId].entitlements ??
    TENANT_PLAN_ENTITLEMENTS[planId]) as TenantPlanEntitlements;
}

export function hasTenantFeature(
  plan: string | null | undefined,
  feature: TenantEntitlement,
  config?: MembershipConfig,
) {
  const value = getTenantPlanEntitlements(plan, config)[feature];
  return value === true || (typeof value === 'number' && value > 0) || value === null;
}

export function getEntitlementUpgradeMessage(
  plan: string | null | undefined,
  feature: TenantEntitlement,
  config?: MembershipConfig,
) {
  let nextPlan = getNextPlanId(plan);

  while (nextPlan) {
    if (config && !config.plans[nextPlan].available) {
      nextPlan = getNextPlanId(nextPlan);
      continue;
    }
    if (hasTenantFeature(nextPlan, feature, config)) {
      return `Upgrade to ${nextPlan.charAt(0).toUpperCase() + nextPlan.slice(1)} to use this feature.`;
    }
    nextPlan = getNextPlanId(nextPlan);
  }

  return 'Contact sales for custom access.';
}

export function getEntitlementRecommendedPlan(
  plan: string | null | undefined,
  feature: TenantEntitlement,
  config?: MembershipConfig,
) {
  let nextPlan = getNextPlanId(getTenantPlanId(plan));

  while (nextPlan) {
    if (config && !config.plans[nextPlan].available) {
      nextPlan = getNextPlanId(nextPlan);
      continue;
    }
    if (hasTenantFeature(nextPlan, feature, config)) {
      return nextPlan;
    }
    nextPlan = getNextPlanId(nextPlan);
  }

  return null;
}

export function getEntitlementErrorPayload(
  plan: string | null | undefined,
  feature: TenantEntitlement,
  current?: number,
  limit?: number | null,
  config?: MembershipConfig,
) {
  const currentPlan = getTenantPlanId(plan);
  const recommendedPlan = getEntitlementRecommendedPlan(currentPlan, feature, config);
  const upgradeMessage = getEntitlementUpgradeMessage(currentPlan, feature, config);
  const codeName = feature
    .replace(/Limit$/, '')
    .replace(/[A-Z]/g, match => `-${match.toLowerCase()}`);

  return {
    type: 'plan-limit' as const,
    resource: feature,
    currentPlan,
    recommendedPlan,
    upgradeUrl: `/membership/upgrade?reason=${feature}`,
    message: `Plan entitlement reached. ${upgradeMessage}`,
    code: `${codeName}-limit-reached`,
    current,
    limit,
    upgradeMessage,
  };
}

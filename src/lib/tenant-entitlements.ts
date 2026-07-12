import { getNextPlanId, type TenantPlanId } from './tenant-plan';

export const TENANT_PLAN_ENTITLEMENTS = {
  free: {
    mcpCallsPerDay: 50,
    apiRequestsPerMinute: 10,
    aiAnalysesPerMonth: 10,
    replayLimit: 0,
    goalLimit: 0,
    aiReportLimit: 0,
    alertRuleLimit: 0,
    webhookLimit: 0,
    csvExport: false,
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
    csvExport: true,
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
    csvExport: true,
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
    csvExport: true,
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
    csvExport: true,
    jsonExport: true,
    emailReports: true,
    slackAlerts: true,
    ssoSaml: true,
    whiteLabel: true,
  },
} as const;

export type TenantEntitlement = keyof (typeof TENANT_PLAN_ENTITLEMENTS)['free'];

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

export function getTenantPlanEntitlements(plan?: string | null) {
  return TENANT_PLAN_ENTITLEMENTS[plan as TenantPlanId] ?? TENANT_PLAN_ENTITLEMENTS.free;
}

export function hasTenantFeature(plan: string | null | undefined, feature: TenantEntitlement) {
  const value = getTenantPlanEntitlements(plan)[feature];
  return value === true || (typeof value === 'number' && value > 0) || value === null;
}

export function getEntitlementUpgradeMessage(
  plan: string | null | undefined,
  feature: TenantEntitlement,
) {
  let nextPlan = getNextPlanId(plan);

  while (nextPlan) {
    if (hasTenantFeature(nextPlan, feature)) {
      return `Upgrade to ${nextPlan.charAt(0).toUpperCase() + nextPlan.slice(1)} to use this feature.`;
    }
    nextPlan = getNextPlanId(nextPlan);
  }

  return 'Contact sales for custom access.';
}

export function getEntitlementErrorPayload(
  plan: string | null | undefined,
  feature: TenantEntitlement,
  current?: number,
  limit?: number | null,
) {
  const upgradeMessage = getEntitlementUpgradeMessage(plan, feature);
  const codeName = feature
    .replace(/Limit$/, '')
    .replace(/[A-Z]/g, match => `-${match.toLowerCase()}`);

  return {
    message: `Plan entitlement reached. ${upgradeMessage}`,
    code: `${codeName}-limit-reached`,
    current,
    limit,
    upgradeMessage,
  };
}

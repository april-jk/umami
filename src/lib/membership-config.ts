import { z } from 'zod';
import { TENANT_PLAN_ENTITLEMENTS } from './tenant-entitlements';
import { TENANT_PLAN_LIMITS, TENANT_PLAN_PRICES, type TenantPlanId } from './tenant-plan';

export const MEMBERSHIP_PLAN_IDS: TenantPlanId[] = ['free', 'starter', 'pro', 'team', 'enterprise'];

const nullableCount = z.number().int().nonnegative().nullable();
const price = z.number().nonnegative().nullable();

export const membershipEntitlementsSchema = z.object({
  mcpCallsPerDay: nullableCount,
  mcpCallsPerMonth: nullableCount.default(null),
  apiRequestsPerMinute: nullableCount,
  aiAnalysesPerMonth: nullableCount,
  replayLimit: nullableCount,
  goalLimit: nullableCount,
  aiReportLimit: nullableCount,
  alertRuleLimit: nullableCount,
  webhookLimit: nullableCount,
  csvExport: nullableCount,
  jsonExport: z.boolean(),
  emailReports: z.boolean(),
  slackAlerts: z.boolean(),
  ssoSaml: z.boolean(),
  whiteLabel: z.boolean(),
});

export const membershipPlanConfigSchema = z.object({
  available: z.boolean(),
  prices: z.object({ monthly: price, annual: price }),
  limits: z.object({
    eventLimit: nullableCount,
    websiteLimit: nullableCount,
    memberLimit: nullableCount,
    retentionDays: nullableCount,
  }),
  entitlements: membershipEntitlementsSchema,
});

export const membershipConfigSchema = z
  .object({
    plans: z.object({
      free: membershipPlanConfigSchema,
      starter: membershipPlanConfigSchema,
      pro: membershipPlanConfigSchema,
      team: membershipPlanConfigSchema,
      enterprise: membershipPlanConfigSchema,
    }),
  })
  .superRefine((config, context) => {
    const free = config.plans.free;
    if (free.prices.monthly !== 0 || free.prices.annual !== 0) {
      context.addIssue({
        code: 'custom',
        message: 'Free plan prices must remain zero.',
        path: ['plans', 'free', 'prices'],
      });
    }

    for (const plan of ['starter', 'pro', 'team'] as const) {
      const { available, prices } = config.plans[plan];
      if (available && (!prices.monthly || !prices.annual)) {
        context.addIssue({
          code: 'custom',
          message: `${plan} requires positive monthly and annual prices while available.`,
          path: ['plans', plan, 'prices'],
        });
      }
    }
  });

export type MembershipConfig = z.infer<typeof membershipConfigSchema>;
export type MembershipPlanConfig = z.infer<typeof membershipPlanConfigSchema>;

export function createDefaultMembershipConfig(): MembershipConfig {
  return {
    plans: Object.fromEntries(
      MEMBERSHIP_PLAN_IDS.map(plan => [
        plan,
        {
          available: true,
          prices: { ...TENANT_PLAN_PRICES[plan] },
          limits: { ...TENANT_PLAN_LIMITS[plan] },
          entitlements: { ...TENANT_PLAN_ENTITLEMENTS[plan] },
        },
      ]),
    ) as MembershipConfig['plans'],
  };
}

export const DEFAULT_MEMBERSHIP_CONFIG = createDefaultMembershipConfig();

export function parseMembershipConfig(value: unknown): MembershipConfig | null {
  const normalized =
    value && typeof value === 'object' && !Array.isArray(value)
      ? {
          ...(value as Record<string, unknown>),
          plans: Object.fromEntries(
            MEMBERSHIP_PLAN_IDS.map(plan => {
              const rawPlan = (value as Record<string, any>).plans?.[plan];
              const rawEntitlements = rawPlan?.entitlements;
              const entitlements =
                rawEntitlements && typeof rawEntitlements === 'object'
                  ? Object.hasOwn(rawEntitlements, 'mcpCallsPerMonth')
                    ? rawEntitlements
                    : {
                        ...rawEntitlements,
                        mcpCallsPerMonth:
                          DEFAULT_MEMBERSHIP_CONFIG.plans[plan].entitlements.mcpCallsPerMonth,
                      }
                  : rawEntitlements;
              return [plan, rawPlan ? { ...rawPlan, entitlements } : rawPlan];
            }),
          ),
        }
      : value;
  const result = membershipConfigSchema.safeParse(normalized);
  return result.success ? result.data : null;
}

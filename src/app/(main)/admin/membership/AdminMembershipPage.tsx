'use client';

import { Column, Grid, Heading, Row, Text } from '@umami/react-zen';
import { PageHeader } from '@/components/common/PageHeader';
import { Panel } from '@/components/common/Panel';
import { useMessages } from '@/components/hooks';
import { TENANT_ENTITLEMENT_STATUS, TENANT_PLAN_ENTITLEMENTS } from '@/lib/tenant-entitlements';
import { TENANT_PLAN_LIMITS, TENANT_PLAN_PRICES, type TenantPlanId } from '@/lib/tenant-plan';

const plans: TenantPlanId[] = ['free', 'starter', 'pro', 'team', 'enterprise'];

function formatNumber(value: number | null, suffix = '') {
  if (value === null) return 'Unlimited';
  return `${Intl.NumberFormat('en-US', { notation: value >= 100_000 ? 'compact' : 'standard' }).format(value)}${suffix}`;
}

function formatValue(value: boolean | number | null) {
  if (value === true) return 'Included';
  if (value === false || value === 0) return 'Not included';
  return formatNumber(value);
}

const rows = [
  {
    label: 'Monthly price',
    status: 'billing',
    values: plans.map(plan => `$${TENANT_PLAN_PRICES[plan].monthly ?? 0}`),
  },
  {
    label: 'Annual price',
    status: 'billing',
    values: plans.map(plan => `$${TENANT_PLAN_PRICES[plan].annual ?? 0}`),
  },
  {
    label: 'Events / month',
    status: 'enforced',
    values: plans.map(plan => formatNumber(TENANT_PLAN_LIMITS[plan].eventLimit)),
  },
  {
    label: 'Websites',
    status: 'enforced',
    values: plans.map(plan => formatNumber(TENANT_PLAN_LIMITS[plan].websiteLimit)),
  },
  {
    label: 'Members',
    status: 'enforced',
    values: plans.map(plan => formatNumber(TENANT_PLAN_LIMITS[plan].memberLimit)),
  },
  {
    label: 'Retention',
    status: 'enforced',
    values: plans.map(plan => formatNumber(TENANT_PLAN_LIMITS[plan].retentionDays, ' days')),
  },
  ...(
    [
      ['Goals', 'goalLimit'],
      ['Session replays', 'replayLimit'],
      ['CSV rows', 'csvExport'],
      ['MCP calls / day', 'mcpCallsPerDay'],
      ['API requests / minute', 'apiRequestsPerMinute'],
      ['AI reports / month', 'aiReportLimit'],
      ['Alert rules', 'alertRuleLimit'],
      ['Webhooks', 'webhookLimit'],
      ['JSON export', 'jsonExport'],
      ['Email reports', 'emailReports'],
      ['Slack alerts', 'slackAlerts'],
      ['SSO / SAML', 'ssoSaml'],
      ['White label', 'whiteLabel'],
    ] as const
  ).map(([label, key]) => ({
    label,
    status: TENANT_ENTITLEMENT_STATUS[key],
    values: plans.map(plan => formatValue(TENANT_PLAN_ENTITLEMENTS[plan][key])),
  })),
];

function StatusText({ status }: { status: string }) {
  const labels = {
    billing: 'Billing',
    enforced: 'Enforced',
    legacy: 'Legacy gate',
    planned: 'Published target',
  };

  return (
    <Text size="sm" color="muted">
      {labels[status] ?? status}
    </Text>
  );
}

export function AdminMembershipPage() {
  const { t } = useMessages();

  return (
    <Column gap="6">
      <PageHeader
        title="Membership management"
        description="Authoritative prices, tenant quotas, feature values, and enforcement state."
      />

      <Panel>
        <Column gap="4">
          <Row justifyContent="space-between" alignItems="flex-end" gap="4" wrap="wrap">
            <Column gap="1">
              <Heading>Plan configuration</Heading>
              <Text color="muted">
                Values come from the same constants used by checkout and tenant enforcement.
              </Text>
            </Column>
            <Text size="sm" color="muted">
              Annual prices equal ten monthly payments.
            </Text>
          </Row>

          <div style={{ overflowX: 'auto' }}>
            <Column border borderRadius overflow="hidden" style={{ minWidth: 1040 }}>
              <Grid
                columns="220px 130px repeat(5, minmax(130px, 1fr))"
                backgroundColor="surface-sunken"
                padding="3"
                gap="3"
              >
                <Text weight="bold">Configuration</Text>
                <Text weight="bold">State</Text>
                {plans.map(plan => (
                  <Text key={plan} weight="bold">
                    {t(`membership.plans.${plan}.name`)}
                  </Text>
                ))}
              </Grid>
              {rows.map((row, index) => (
                <Grid
                  key={row.label}
                  columns="220px 130px repeat(5, minmax(130px, 1fr))"
                  padding="3"
                  gap="3"
                  border={index === 0 ? undefined : 'top'}
                  alignItems="center"
                >
                  <Text weight="bold">{row.label}</Text>
                  <StatusText status={row.status} />
                  {row.values.map((value, valueIndex) => (
                    <Text key={`${row.label}-${plans[valueIndex]}`}>{value}</Text>
                  ))}
                </Grid>
              ))}
            </Column>
          </div>
        </Column>
      </Panel>
    </Column>
  );
}

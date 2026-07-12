'use client';

import { Button, Checkbox, Column, Grid, Heading, Row, Text, TextField } from '@umami/react-zen';
import { useEffect, useState } from 'react';
import { LoadingPanel } from '@/components/common/LoadingPanel';
import { PageHeader } from '@/components/common/PageHeader';
import { Panel } from '@/components/common/Panel';
import {
  useAdminMembershipConfigQuery,
  useMessages,
  useUpdateMembershipConfigQuery,
} from '@/components/hooks';
import {
  createDefaultMembershipConfig,
  MEMBERSHIP_PLAN_IDS,
  type MembershipConfig,
  membershipConfigSchema,
} from '@/lib/membership-config';
import { TENANT_ENTITLEMENT_STATUS, type TenantEntitlement } from '@/lib/tenant-entitlements';

type PriceKey = 'monthly' | 'annual';
type LimitKey = 'eventLimit' | 'websiteLimit' | 'memberLimit' | 'retentionDays';
type BooleanEntitlement = 'jsonExport' | 'emailReports' | 'slackAlerts' | 'ssoSaml' | 'whiteLabel';
type NumericEntitlement = Exclude<TenantEntitlement, BooleanEntitlement>;

type ConfigRow =
  | { label: string; section: 'availability'; kind: 'boolean'; status: 'billing' }
  | { label: string; section: 'prices'; key: PriceKey; kind: 'price'; status: 'billing' }
  | { label: string; section: 'limits'; key: LimitKey; kind: 'integer'; status: 'enforced' }
  | {
      label: string;
      section: 'entitlements';
      key: NumericEntitlement;
      kind: 'integer';
      status: 'enforced' | 'legacy' | 'planned';
    }
  | {
      label: string;
      section: 'entitlements';
      key: BooleanEntitlement;
      kind: 'boolean';
      status: 'enforced' | 'legacy' | 'planned';
    };

const rows: ConfigRow[] = [
  {
    label: 'Available for subscription',
    section: 'availability',
    kind: 'boolean',
    status: 'billing',
  },
  { label: 'Monthly price', section: 'prices', key: 'monthly', kind: 'price', status: 'billing' },
  { label: 'Annual price', section: 'prices', key: 'annual', kind: 'price', status: 'billing' },
  {
    label: 'Events / month',
    section: 'limits',
    key: 'eventLimit',
    kind: 'integer',
    status: 'enforced',
  },
  {
    label: 'Websites',
    section: 'limits',
    key: 'websiteLimit',
    kind: 'integer',
    status: 'enforced',
  },
  { label: 'Members', section: 'limits', key: 'memberLimit', kind: 'integer', status: 'enforced' },
  {
    label: 'Retention days',
    section: 'limits',
    key: 'retentionDays',
    kind: 'integer',
    status: 'enforced',
  },
  ...(
    [
      ['Goals', 'goalLimit'],
      ['Session replays', 'replayLimit'],
      ['CSV rows', 'csvExport'],
      ['MCP calls / day', 'mcpCallsPerDay'],
      ['API requests / minute', 'apiRequestsPerMinute'],
      ['AI analyses / month', 'aiAnalysesPerMonth'],
      ['AI reports / month', 'aiReportLimit'],
      ['Alert rules', 'alertRuleLimit'],
      ['Webhooks', 'webhookLimit'],
    ] as const
  ).map(([label, key]) => ({
    label,
    section: 'entitlements' as const,
    key,
    kind: 'integer' as const,
    status: TENANT_ENTITLEMENT_STATUS[key],
  })),
  ...(
    [
      ['JSON export', 'jsonExport'],
      ['Email reports', 'emailReports'],
      ['Slack alerts', 'slackAlerts'],
      ['SSO / SAML', 'ssoSaml'],
      ['White label', 'whiteLabel'],
    ] as const
  ).map(([label, key]) => ({
    label,
    section: 'entitlements' as const,
    key,
    kind: 'boolean' as const,
    status: TENANT_ENTITLEMENT_STATUS[key],
  })),
];

function cloneConfig(config: MembershipConfig) {
  return structuredClone(config);
}

function getRowValue(
  config: MembershipConfig,
  plan: (typeof MEMBERSHIP_PLAN_IDS)[number],
  row: ConfigRow,
) {
  const planConfig = config.plans[plan];
  if (row.section === 'availability') return planConfig.available;
  return planConfig[row.section][row.key];
}

function setRowValue(
  config: MembershipConfig,
  plan: (typeof MEMBERSHIP_PLAN_IDS)[number],
  row: ConfigRow,
  value: boolean | number | null,
) {
  const next = cloneConfig(config);
  if (row.section === 'availability') {
    next.plans[plan].available = value as boolean;
  } else if (row.section === 'prices') {
    next.plans[plan].prices[row.key] = value as number | null;
  } else if (row.section === 'limits') {
    next.plans[plan].limits[row.key] = value as number | null;
  } else if (row.kind === 'boolean') {
    next.plans[plan].entitlements[row.key] = value as boolean;
  } else {
    next.plans[plan].entitlements[row.key] = value as number | null;
  }
  return next;
}

function StatusText({ status }: { status: ConfigRow['status'] }) {
  const labels = {
    billing: 'Billing',
    enforced: 'Enforced',
    legacy: 'Legacy gate',
    planned: 'Published target',
  };

  return (
    <Text size="sm" color="muted">
      {labels[status]}
    </Text>
  );
}

export function AdminMembershipPage() {
  const { t } = useMessages();
  const query = useAdminMembershipConfigQuery();
  const update = useUpdateMembershipConfigQuery();
  const [draft, setDraft] = useState<MembershipConfig | null>(null);

  useEffect(() => {
    if (query.data?.config) setDraft(cloneConfig(query.data.config));
  }, [query.data]);

  const original = query.data?.config;
  const dirty = Boolean(draft && original && JSON.stringify(draft) !== JSON.stringify(original));
  const valid = Boolean(draft && membershipConfigSchema.safeParse(draft).success);

  const handleSave = async () => {
    if (draft) await update.mutateAsync({ config: draft, version: query.data?.version ?? 0 });
  };

  return (
    <Column gap="6">
      <PageHeader title="Membership management" description="Edit membership pricing and limits." />

      <Panel>
        <LoadingPanel
          data={query.data}
          isLoading={query.isLoading}
          isFetching={query.isFetching}
          error={query.error}
        >
          {draft && (
            <Column gap="5">
              <Row justifyContent="space-between" alignItems="flex-end" gap="4" wrap="wrap">
                <Column gap="1">
                  <Heading>Plan configuration</Heading>
                  <Text color="muted">
                    Blank numeric fields mean Unlimited. Zero means the entitlement is not included.
                  </Text>
                  <Text size="sm" color="muted">
                    Displayed prices update immediately. Payment providers keep their externally
                    configured billing amounts.
                  </Text>
                </Column>
                <Text size="sm" color="muted">
                  Version {query.data?.version ?? 0} ·{' '}
                  {query.data?.source === 'database' ? 'Saved configuration' : 'Code defaults'}
                </Text>
              </Row>

              <div style={{ overflowX: 'auto' }}>
                <Column border borderRadius overflow="hidden" style={{ minWidth: 940 }}>
                  <Grid
                    columns="180px 110px repeat(5, minmax(110px, 1fr))"
                    backgroundColor="surface-sunken"
                    padding="3"
                    gap="3"
                  >
                    <Text weight="bold">Configuration</Text>
                    <Text weight="bold">State</Text>
                    {MEMBERSHIP_PLAN_IDS.map(plan => (
                      <Text key={plan} weight="bold">
                        {t(`membership.plans.${plan}.name`)}
                      </Text>
                    ))}
                  </Grid>
                  {rows.map((row, index) => (
                    <Grid
                      key={`${row.section}-${'key' in row ? row.key : 'available'}`}
                      columns="180px 110px repeat(5, minmax(110px, 1fr))"
                      padding="3"
                      gap="3"
                      border={index === 0 ? undefined : 'top'}
                      alignItems="center"
                    >
                      <Text weight="bold">{row.label}</Text>
                      <StatusText status={row.status} />
                      {MEMBERSHIP_PLAN_IDS.map(plan => {
                        const value = getRowValue(draft, plan, row);
                        const label = `${t(`membership.plans.${plan}.name`)} ${row.label}`;
                        return row.kind === 'boolean' ? (
                          <Checkbox
                            key={plan}
                            aria-label={label}
                            value={value ? 'selected' : ''}
                            onChange={selected =>
                              setDraft(
                                current => current && setRowValue(current, plan, row, selected),
                              )
                            }
                          />
                        ) : (
                          <TextField
                            key={plan}
                            aria-label={label}
                            type="number"
                            value={value === null ? '' : String(value)}
                            onChange={text =>
                              setDraft(
                                current =>
                                  current &&
                                  setRowValue(
                                    current,
                                    plan,
                                    row,
                                    text === '' ? null : Number(text),
                                  ),
                              )
                            }
                          />
                        );
                      })}
                    </Grid>
                  ))}
                </Column>
              </div>

              {!valid && dirty && (
                <Text style={{ color: '#dc2626' }}>
                  Check prices and entitlement values. Available paid plans require positive monthly
                  and annual prices.
                </Text>
              )}
              {update.error && (
                <div role="alert">
                  <Text style={{ color: '#dc2626' }}>{update.error.message}</Text>
                </div>
              )}

              <Row justifyContent="space-between" gap="3" wrap="wrap">
                <Button variant="quiet" onPress={() => setDraft(createDefaultMembershipConfig())}>
                  Use code defaults
                </Button>
                <Row gap="3">
                  <Button
                    variant="quiet"
                    isDisabled={!dirty || update.isPending}
                    onPress={() => original && setDraft(cloneConfig(original))}
                  >
                    Discard changes
                  </Button>
                  <Button
                    variant="primary"
                    isDisabled={!dirty || !valid || update.isPending}
                    onPress={handleSave}
                  >
                    {update.isPending ? 'Saving...' : 'Save configuration'}
                  </Button>
                </Row>
              </Row>
            </Column>
          )}
        </LoadingPanel>
      </Panel>
    </Column>
  );
}

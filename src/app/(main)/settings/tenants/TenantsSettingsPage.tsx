'use client';
import { Column, Grid, Heading, Row, Text } from '@umami/react-zen';
import { PageBody } from '@/components/common/PageBody';
import { PageHeader } from '@/components/common/PageHeader';
import { Panel } from '@/components/common/Panel';

const planRows = [
  ['Free', '50K events', '1 website', '1 member', '3 months'],
  ['Starter', '100K events', '3 websites', '3 members', '1 year'],
  ['Pro', '500K events', '10 websites', '10 members', '2 years'],
  ['Team', '2M events', 'Unlimited', 'Unlimited', '3 years'],
  ['Enterprise', 'Custom', 'Custom', 'Custom', 'Custom'],
];

const featureRows = [
  ['API keys', 'Pro', 'Tenant-scoped keys with scopes and last-used tracking'],
  ['Email reports', 'Pro', 'Scheduled report delivery for tenant websites'],
  ['IP filters', 'Pro', 'CIDR and IP exclusions at tenant or website scope'],
  ['White-label', 'Team', 'Company name, logo, custom domain, powered-by policy'],
  ['Session recording', 'Team', 'Tenant entitlement checked before recorder ingest'],
  ['SSO / SAML', 'Enterprise', 'Tenant security settings and enforced login policy'],
];

const statusRows = [
  ['Tenant data model', 'Done', 'Tenant, membership, subscription, and monthly usage tables exist'],
  ['Tenant API', 'Done', 'Create, list, view, update, and soft-delete tenant endpoints exist'],
  ['Settings UI', 'In progress', 'This page exposes the SaaS tenant structure for review'],
  ['Quota enforcement', 'Next', 'Centralized entitlement helper still needs implementation'],
  ['Billing integration', 'Next', 'Stripe or invoice billing should persist to TenantSubscription'],
];

function StatusPill({ children }: { children: string }) {
  const color = children === 'Done' ? '#0f766e' : children === 'In progress' ? '#b45309' : '#52525b';

  return (
    <Text
      size="sm"
      weight="bold"
      color="primary"
      style={{
        color,
        border: `1px solid ${color}`,
        borderRadius: 999,
        padding: '2px 8px',
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </Text>
  );
}

function SimpleTable({
  columns,
  rows,
}: {
  columns: string[];
  rows: Array<Array<string>>;
}) {
  return (
    <Column border borderRadius overflow="hidden">
      <Grid
        columns={`repeat(${columns.length}, minmax(0, 1fr))`}
        backgroundColor="surface-sunken"
        paddingY="3"
        paddingX="4"
        gap="4"
      >
        {columns.map(column => (
          <Text key={column} weight="bold" color="muted">
            {column}
          </Text>
        ))}
      </Grid>
      {rows.map((row, index) => (
        <Grid
          key={`${row[0]}-${index}`}
          columns={`repeat(${columns.length}, minmax(0, 1fr))`}
          paddingY="3"
          paddingX="4"
          gap="4"
          border={index === 0 ? undefined : 'top'}
        >
          {row.map((cell, cellIndex) => (
            <Text key={`${cell}-${cellIndex}`} weight={cellIndex === 0 ? 'bold' : undefined}>
              {cell}
            </Text>
          ))}
        </Grid>
      ))}
    </Column>
  );
}

export function TenantsSettingsPage() {
  return (
    <PageBody>
      <Column gap="6">
        <PageHeader
          title="Tenants"
          description="SaaS account boundary for billing, usage, members, feature gates, and white-label controls."
        />

        <Grid columns={{ base: '1fr', lg: '1fr 1fr' }} gap="6">
          <Panel title="Scope model">
            <Column gap="4">
              <Column gap="2">
                <Heading size="sm">User settings</Heading>
                <Text color="muted">
                  Profile, preferences, language, timezone, theme, and personal notification choices.
                </Text>
              </Column>
              <Column gap="2">
                <Heading size="sm">Tenant settings</Heading>
                <Text color="muted">
                  Members, teams, websites, billing, usage, API access, feature gates, branding,
                  security, support tier, and enterprise controls.
                </Text>
              </Column>
            </Column>
          </Panel>

          <Panel title="Implementation status">
            <Column gap="4">
              {statusRows.map(([name, status, description]) => (
                <Row key={name} alignItems="center" justifyContent="space-between" gap="4">
                  <Column gap="1">
                    <Text weight="bold">{name}</Text>
                    <Text color="muted">{description}</Text>
                  </Column>
                  <StatusPill>{status}</StatusPill>
                </Row>
              ))}
            </Column>
          </Panel>
        </Grid>

        <Panel title="Plan limits">
          <SimpleTable
            columns={['Plan', 'Events / month', 'Websites', 'Members', 'Retention']}
            rows={planRows}
          />
        </Panel>

        <Panel title="Feature gates">
          <SimpleTable columns={['Feature', 'Minimum plan', 'Tenant behavior']} rows={featureRows} />
        </Panel>
      </Column>
    </PageBody>
  );
}

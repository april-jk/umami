'use client';

import { Column, Grid, Heading, Icon, Row, Text, Button } from '@umami/react-zen';
import { PageBody } from '@/components/common/PageBody';
import { PageHeader } from '@/components/common/PageHeader';
import { Panel } from '@/components/common/Panel';
import { useLoginQuery, useTenantUsageQuery, useMessages } from '@/components/hooks';
import { Crown, AlertTriangle, ArrowUpRight } from '@/components/icons';
import { getUsagePercentage, getUsageAlertLevel, getTenantPlanLimits } from '@/lib/tenant-plan';
import { UsageBar } from './UsageBar';
import { PlanBadge } from './PlanBadge';
import Link from 'next/link';

export function MembershipPage() {
  const { user } = useLoginQuery();
  const { t, labels } = useMessages();
  const tenantId = user?.tenantId || user?.tenants?.[0]?.id;

  const { data: usage, isLoading } = useTenantUsageQuery(tenantId);

  if (isLoading) {
    return (
      <PageBody>
        <PageHeader title={t(labels.membership)} />
        <Text color="muted">Loading...</Text>
      </PageBody>
    );
  }

  if (!tenantId) {
    return (
      <PageBody>
        <PageHeader title={t(labels.membership)} />
        <Panel>
          <Column gap="4" alignItems="center" padding="6">
            <Icon size="lg" color="muted">
              <Crown />
            </Icon>
            <Text color="muted">No membership information available.</Text>
          </Column>
        </Panel>
      </PageBody>
    );
  }

  const plan = usage?.plan || user?.plan || 'free';
  const limits = getTenantPlanLimits(plan);

  const eventPct = getUsagePercentage(usage?.events?.used || 0, usage?.events?.limit ?? limits.eventLimit);
  const websitePct = getUsagePercentage(
    usage?.websites?.used || 0,
    usage?.websites?.limit ?? limits.websiteLimit,
  );
  const memberPct = getUsagePercentage(usage?.members?.used || 0, usage?.members?.limit ?? limits.memberLimit);

  const eventAlert = getUsageAlertLevel(eventPct);
  const websiteAlert = getUsageAlertLevel(websitePct);
  const memberAlert = getUsageAlertLevel(memberPct);

  const hasAlert = eventAlert !== 'none' || websiteAlert !== 'none' || memberAlert !== 'none';
  const hasCritical = eventAlert === 'exceeded' || websiteAlert === 'exceeded' || memberAlert === 'exceeded';

  const alertPanelStyle = hasCritical
    ? { backgroundColor: '#fef2f2', border: '1px solid #fecaca' }
    : { backgroundColor: '#fefce8', border: '1px solid #fde047' };

  return (
    <PageBody>
      <Column gap="6">
        <PageHeader
          title={t(labels.membership)}
          description="Manage your plan, view usage, and upgrade when needed."
        />

        {hasAlert && (
          <Panel style={alertPanelStyle}>
            <Row gap="3" alignItems="center">
              <Icon size="sm" style={{ color: hasCritical ? '#ef4444' : '#f97316' }}>
                <AlertTriangle />
              </Icon>
              <Column>
                <Text weight="bold" style={{ color: hasCritical ? '#ef4444' : '#f97316' }}>
                  {hasCritical ? 'Usage limit exceeded' : 'Usage approaching limit'}
                </Text>
                <Text size="sm" color="muted">
                  {hasCritical
                    ? 'You have exceeded one or more usage limits. Please upgrade your plan to continue using all features.'
                    : 'You are approaching one or more usage limits. Consider upgrading to avoid interruptions.'}
                </Text>
              </Column>
            </Row>
          </Panel>
        )}

        <Grid columns={{ base: '1fr', lg: '1fr 1fr' }} gap="6">
          <Panel>
            <Column gap="4">
              <Row alignItems="center" justifyContent="space-between">
                <Row gap="3" alignItems="center">
                  <PlanBadge plan={plan} />
                  <Heading size="sm">
                    {plan.charAt(0).toUpperCase() + plan.slice(1)} Plan
                  </Heading>
                </Row>
                <Link href="/membership/upgrade" passHref>
                  <Button variant="primary" size="sm">
                    <Row gap="2" alignItems="center">
                      <Icon size="sm">
                        <ArrowUpRight />
                      </Icon>
                      Upgrade
                    </Row>
                  </Button>
                </Link>
              </Row>

              <Column gap="1">
                <Text size="sm" color="muted">Current billing period</Text>
                <Text weight="bold">{usage?.month || new Date().toISOString().slice(0, 7)}</Text>
              </Column>

              <Column gap="1">
                <Text size="sm" color="muted">Data retention</Text>
                <Text weight="bold">
                  {limits.retentionDays === null
                    ? 'Unlimited'
                    : `${limits.retentionDays} days`}
                </Text>
              </Column>
            </Column>
          </Panel>

          <Panel title="Usage Overview">
            <Column gap="4">
              <UsageBar
                label="Events"
                used={usage?.events?.used || 0}
                limit={usage?.events?.limit ?? limits.eventLimit}
                alert={eventAlert}
              />
              <UsageBar
                label="Websites"
                used={usage?.websites?.used || 0}
                limit={usage?.websites?.limit ?? limits.websiteLimit}
                alert={websiteAlert}
              />
              <UsageBar
                label="Members"
                used={usage?.members?.used || 0}
                limit={usage?.members?.limit ?? limits.memberLimit}
                alert={memberAlert}
              />
            </Column>
          </Panel>
        </Grid>
      </Column>
    </PageBody>
  );
}

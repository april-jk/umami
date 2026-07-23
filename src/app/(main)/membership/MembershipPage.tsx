'use client';

import { Button, Column, Grid, Heading, Icon, Row, Text } from '@umami/react-zen';
import Link from 'next/link';
import { PageBody } from '@/components/common/PageBody';
import { PageHeader } from '@/components/common/PageHeader';
import { Panel } from '@/components/common/Panel';
import { useLocale, useLoginQuery, useMessages, useTenantUsageQuery } from '@/components/hooks';
import { AlertTriangle, ArrowUpRight, Crown } from '@/components/icons';
import { getTenantPlanLimits, getUsageAlertLevel, getUsagePercentage } from '@/lib/tenant-plan';
import { PlanBadge } from './PlanBadge';
import { UsageBar } from './UsageBar';

export function MembershipPage() {
  const { user } = useLoginQuery();
  const { t, labels } = useMessages();
  const { locale } = useLocale();
  const tenantId = user?.tenantId || user?.tenants?.[0]?.id;

  const { data: usage, isLoading } = useTenantUsageQuery(tenantId);

  if (isLoading) {
    return (
      <PageBody>
        <PageHeader title={t(labels.membership)} />
        <Text color="muted">{t('membership.loading')}</Text>
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
            <Text color="muted">{t('membership.unavailable')}</Text>
          </Column>
        </Panel>
      </PageBody>
    );
  }

  const plan = usage?.plan || user?.plan || 'free';
  const planName = t(`membership.plans.${plan}.name`);
  const limits = usage?.defaults ?? getTenantPlanLimits(plan);
  const membershipEndsAt = usage?.membershipEndsAt
    ? new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeZone: 'UTC' }).format(
        new Date(usage.membershipEndsAt),
      )
    : null;

  const eventPct = getUsagePercentage(
    usage?.events?.used || 0,
    usage?.events?.limit ?? limits.eventLimit,
  );
  const websitePct = getUsagePercentage(
    usage?.websites?.used || 0,
    usage?.websites?.limit ?? limits.websiteLimit,
  );
  const memberPct = getUsagePercentage(
    usage?.members?.used || 0,
    usage?.members?.limit ?? limits.memberLimit,
  );
  const mcpPct = usage?.mcp ? getUsagePercentage(usage.mcp.used, usage.mcp.limit) : null;

  const eventAlert = getUsageAlertLevel(eventPct);
  const websiteAlert = getUsageAlertLevel(websitePct);
  const memberAlert = getUsageAlertLevel(memberPct);
  const mcpAlert = getUsageAlertLevel(mcpPct);

  const hasAlert =
    eventAlert !== 'none' ||
    websiteAlert !== 'none' ||
    memberAlert !== 'none' ||
    mcpAlert !== 'none';
  const hasCritical =
    eventAlert === 'exceeded' ||
    websiteAlert === 'exceeded' ||
    memberAlert === 'exceeded' ||
    mcpAlert === 'exceeded';

  const alertPanelStyle = hasCritical
    ? { backgroundColor: '#fef2f2', border: '1px solid #fecaca' }
    : { backgroundColor: '#fefce8', border: '1px solid #fde047' };

  return (
    <PageBody>
      <Column gap="6">
        <PageHeader title={t(labels.membership)} description={t('membership.manageDescription')} />

        {hasAlert && (
          <Panel style={alertPanelStyle}>
            <Grid columns={{ base: '1fr', md: '1fr auto' }} gap="4" alignItems="center">
              <Row gap="3" alignItems="center">
                <Icon size="sm" style={{ color: hasCritical ? '#ef4444' : '#f97316' }}>
                  <AlertTriangle />
                </Icon>
                <Column>
                  <Text weight="bold" style={{ color: hasCritical ? '#ef4444' : '#f97316' }}>
                    {hasCritical
                      ? t('membership.usageLimitExceeded')
                      : t('membership.usageApproachingLimit')}
                  </Text>
                  <Text size="sm" color="muted">
                    {hasCritical
                      ? t('membership.exceededDescription')
                      : t('membership.approachingDescription')}
                  </Text>
                </Column>
              </Row>
              <Link href="/membership/upgrade" passHref>
                <Button variant={hasCritical ? 'primary' : 'outline'} size="sm">
                  {t('membership.upgrade')}
                </Button>
              </Link>
            </Grid>
          </Panel>
        )}

        <Grid columns={{ base: '1fr', lg: '1fr 1fr' }} gap="6">
          <Panel>
            <Column gap="4">
              <Row alignItems="center" justifyContent="space-between">
                <Row gap="3" alignItems="center">
                  <PlanBadge plan={plan} label={planName} />
                  <Heading size="sm">{t('membership.planLabel', { plan: planName })}</Heading>
                </Row>
                <Link href="/membership/upgrade" passHref>
                  <Button variant="primary" size="sm">
                    <Row gap="2" alignItems="center">
                      <Icon size="sm">
                        <ArrowUpRight />
                      </Icon>
                      {t('membership.upgrade')}
                    </Row>
                  </Button>
                </Link>
              </Row>

              <Column gap="1">
                <Text size="sm" color="muted">
                  {t('membership.currentBillingPeriod')}
                </Text>
                <Text weight="bold">{usage?.month || new Date().toISOString().slice(0, 7)}</Text>
              </Column>

              {membershipEndsAt && (
                <Column gap="1">
                  <Text size="sm" color="muted">
                    {t('membership.membershipEndsAt')}
                  </Text>
                  <Text weight="bold">{membershipEndsAt}</Text>
                </Column>
              )}

              <Column gap="1">
                <Text size="sm" color="muted">
                  {t('membership.dataRetention')}
                </Text>
                <Text weight="bold">
                  {limits.retentionDays === null
                    ? t('membership.unlimited')
                    : t('membership.retentionDays', { count: limits.retentionDays })}
                </Text>
              </Column>
            </Column>
          </Panel>

          <Panel title={t('membership.usageOverview')}>
            <Column gap="4">
              <UsageBar
                label={t('membership.events')}
                locale={locale}
                unlimitedLabel={t('membership.unlimited')}
                used={usage?.events?.used || 0}
                limit={usage?.events?.limit ?? limits.eventLimit}
                alert={eventAlert}
              />
              <UsageBar
                label={t('membership.websites')}
                locale={locale}
                unlimitedLabel={t('membership.unlimited')}
                used={usage?.websites?.used || 0}
                limit={usage?.websites?.limit ?? limits.websiteLimit}
                alert={websiteAlert}
              />
              <UsageBar
                label={t('membership.members')}
                locale={locale}
                unlimitedLabel={t('membership.unlimited')}
                used={usage?.members?.used || 0}
                limit={usage?.members?.limit ?? limits.memberLimit}
                alert={memberAlert}
              />
              {usage?.mcp && (
                <UsageBar
                  label={
                    usage.mcp.period === 'month'
                      ? t('membership.featureLabels.mcpCallsPerMonth')
                      : usage.mcp.period === 'day'
                        ? t('membership.featureLabels.mcpCallsPerDay')
                        : t('membership.featureLabels.mcpCalls')
                  }
                  locale={locale}
                  unlimitedLabel={t('membership.unlimited')}
                  used={usage.mcp.used}
                  limit={usage.mcp.limit}
                  alert={mcpAlert}
                />
              )}
            </Column>
          </Panel>
        </Grid>
      </Column>
    </PageBody>
  );
}

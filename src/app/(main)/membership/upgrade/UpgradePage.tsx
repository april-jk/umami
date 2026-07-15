'use client';

import { Button, Column, Grid, Icon, Row, Text } from '@umami/react-zen';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { PageBody } from '@/components/common/PageBody';
import { PageHeader } from '@/components/common/PageHeader';
import { Panel } from '@/components/common/Panel';
import {
  useApi,
  useLoginQuery,
  useMembershipConfigQuery,
  useMessages,
  useTenantQuery,
} from '@/components/hooks';
import { AlertTriangle, ArrowLeft, Check } from '@/components/icons';
import {
  DEFAULT_MEMBERSHIP_CONFIG,
  type MembershipConfig,
  type MembershipPlanConfig,
} from '@/lib/membership-config';
import type { TenantPlanId } from '@/lib/tenant-plan';
import { PlanBadge } from '../PlanBadge';
import { ActivationCodeRedeemButton } from './ActivationCodeRedeemButton';

const planOrder: TenantPlanId[] = ['free', 'starter', 'pro', 'team', 'enterprise'];

function getRecommendedPlan(currentPlan: TenantPlanId, config: MembershipConfig) {
  const currentIndex = planOrder.indexOf(currentPlan);
  return planOrder.slice(currentIndex + 1).find(plan => config.plans[plan].available) ?? null;
}

function getDisplayedPrice(
  plan: TenantPlanId,
  interval: 'month' | 'year',
  translate: (key: string, values?: Record<string, string | number>) => string,
  config: MembershipConfig,
) {
  if (plan === 'free') return translate('membership.freePrice');

  const price = config.plans[plan].prices;
  if (price.monthly === null || price.annual === null) {
    return translate('membership.customPrice');
  }

  const monthlyPrice = interval === 'year' ? price.annual / 12 : price.monthly;
  return translate('membership.pricePerMonth', {
    price: monthlyPrice.toFixed(interval === 'year' ? 2 : 0),
  });
}

function formatFeatureValue(value: number | null, unlimited: string) {
  return value === null
    ? unlimited
    : Intl.NumberFormat('en-US', { notation: 'compact' }).format(value);
}

function getDynamicFeatures(
  plan: MembershipPlanConfig,
  translate: (key: string, values?: Record<string, string | number>) => string,
  labels: Record<string, string>,
) {
  const unlimited = translate('membership.unlimited');
  const numericFeatures: Array<[string, number | null]> = [
    [translate('membership.events'), plan.limits.eventLimit],
    [translate('membership.websites'), plan.limits.websiteLimit],
    [translate('membership.members'), plan.limits.memberLimit],
    [translate(labels.goals), plan.entitlements.goalLimit],
    [translate(labels.replays), plan.entitlements.replayLimit],
    [translate('membership.featureLabels.mcpCallsPerDay'), plan.entitlements.mcpCallsPerDay],
    [
      translate('membership.featureLabels.apiRequestsPerMinute'),
      plan.entitlements.apiRequestsPerMinute,
    ],
    [
      translate('membership.featureLabels.aiAnalysesPerMonth'),
      plan.entitlements.aiAnalysesPerMonth,
    ],
    [translate('membership.featureLabels.aiReportsPerMonth'), plan.entitlements.aiReportLimit],
    [translate('membership.featureLabels.alertRules'), plan.entitlements.alertRuleLimit],
    [translate('membership.featureLabels.webhooks'), plan.entitlements.webhookLimit],
    [translate('membership.featureLabels.csvExportRows'), plan.entitlements.csvExport],
  ];
  const features = numericFeatures
    .filter(([, value]) => value === null || value > 0)
    .map(([label, value]) => `${label}: ${formatFeatureValue(value, unlimited)}`);

  if (plan.limits.retentionDays === null) {
    features.push(`${translate('membership.dataRetention')}: ${unlimited}`);
  } else {
    features.push(
      `${translate('membership.dataRetention')}: ${translate('membership.retentionDays', {
        count: plan.limits.retentionDays,
      })}`,
    );
  }

  for (const [label, included] of [
    [translate('membership.featureLabels.jsonExport'), plan.entitlements.jsonExport],
    [translate('membership.featureLabels.emailReports'), plan.entitlements.emailReports],
    [translate('membership.featureLabels.slackAlerts'), plan.entitlements.slackAlerts],
    [translate('membership.featureLabels.ssoSaml'), plan.entitlements.ssoSaml],
    [translate('membership.featureLabels.whiteLabel'), plan.entitlements.whiteLabel],
  ] as const) {
    if (included) features.push(label);
  }

  return features;
}

export function UpgradePage() {
  const { user } = useLoginQuery();
  const tenantId = user?.tenantId || user?.tenants?.[0]?.id;
  const { data: tenant } = useTenantQuery(tenantId);
  const { t, labels } = useMessages();
  const membershipConfigQuery = useMembershipConfigQuery();
  const membershipConfig = membershipConfigQuery.data?.config ?? DEFAULT_MEMBERSHIP_CONFIG;
  const { post, useMutation } = useApi();
  const searchParams = useSearchParams();
  const [selectedPlan, setSelectedPlan] = useState<TenantPlanId | null>(null);
  const [billingInterval, setBillingInterval] = useState<'month' | 'year'>('year');
  const [error, setError] = useState<'confirmationError' | 'checkoutError' | null>(null);
  const paypalSubscription = useMutation({
    mutationFn: ({
      plan,
      interval,
    }: {
      plan: Exclude<TenantPlanId, 'free' | 'enterprise'>;
      interval: 'month' | 'year';
    }) => post(`/tenants/${tenantId}/billing/paypal/subscription`, { plan, interval }),
  });
  const paypalConfirmation = useMutation({
    mutationFn: (subscriptionId: string) =>
      post(`/tenants/${tenantId}/billing/paypal/confirm`, { subscriptionId }),
  });

  const currentPlan = (tenant?.plan || user?.plan || 'free') as TenantPlanId;
  const currentIndex = planOrder.indexOf(currentPlan);
  const recommendedPlan = getRecommendedPlan(currentPlan, membershipConfig);

  useEffect(() => {
    const subscriptionId = searchParams.get('subscription_id');
    if (searchParams.get('paypal') !== 'success' || !subscriptionId || !tenantId) return;

    paypalConfirmation.mutate(subscriptionId, {
      onSuccess: () => window.history.replaceState({}, '', '/membership/upgrade'),
      onError: () => setError('confirmationError'),
    });
  }, [paypalConfirmation, searchParams, tenantId]);

  const handleUpgrade = async (plan: Exclude<TenantPlanId, 'free' | 'enterprise'>) => {
    setError(null);
    try {
      const { approveUrl } = await paypalSubscription.mutateAsync({
        plan,
        interval: billingInterval,
      });
      window.location.assign(approveUrl);
    } catch {
      setError('checkoutError');
    }
  };

  return (
    <PageBody>
      <Column gap="6">
        <Row alignItems="center" gap="3">
          <Link href="/membership" passHref>
            <Button variant="quiet" size="sm">
              <Row gap="2" alignItems="center">
                <Icon size="sm">
                  <ArrowLeft />
                </Icon>
                {t('membership.back')}
              </Row>
            </Button>
          </Link>
        </Row>

        <PageHeader title={t('membership.title')} description={t('membership.description')} />

        {error && (
          <Panel style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca' }}>
            <Text style={{ color: '#ef4444' }}>{t(`membership.${error}`)}</Text>
          </Panel>
        )}

        <Row gap="2" alignItems="center">
          <Button
            variant={billingInterval === 'year' ? 'primary' : 'quiet'}
            onPress={() => setBillingInterval('year')}
          >
            {t('membership.annual')}
          </Button>
          <Button
            variant={billingInterval === 'month' ? 'primary' : 'quiet'}
            onPress={() => setBillingInterval('month')}
          >
            {t('membership.monthly')}
          </Button>
          <ActivationCodeRedeemButton tenantId={tenantId} />
        </Row>

        {selectedPlan &&
          selectedPlan !== currentPlan &&
          planOrder.indexOf(selectedPlan) < currentIndex && (
            <Panel style={{ backgroundColor: '#fefce8', border: '1px solid #fde047' }}>
              <Row gap="3" alignItems="center">
                <Icon size="sm" style={{ color: '#f97316' }}>
                  <AlertTriangle />
                </Icon>
                <Column>
                  <Text weight="bold" style={{ color: '#f97316' }}>
                    {t('membership.downgradeTitle')}
                  </Text>
                  <Text size="sm" color="muted">
                    {t('membership.downgradeDescription')}
                  </Text>
                </Column>
              </Row>
            </Panel>
          )}

        <Grid
          columns={{
            base: '1fr',
            md: 'repeat(2, minmax(0, 1fr))',
            xl: 'repeat(5, minmax(0, 1fr))',
          }}
          gap="4"
        >
          {planOrder
            .filter(plan => membershipConfig.plans[plan].available || plan === currentPlan)
            .map(plan => {
              const isCurrent = plan === currentPlan;
              const isRecommended = plan === recommendedPlan;
              const planKey = `membership.plans.${plan}`;
              const planName = t(`${planKey}.name`);
              const description = t(`${planKey}.description`);
              const planConfig = membershipConfig.plans[plan];
              const features = getDynamicFeatures(planConfig, t, labels);
              const pricing = planConfig.prices;

              const cardStyle = isCurrent
                ? { border: '2px solid #8b5cf6', backgroundColor: '#faf5ff' }
                : isRecommended
                  ? { border: '2px solid #3b82f6' }
                  : {};

              return (
                <Panel
                  key={plan}
                  data-test={`plan-card-${plan}`}
                  style={{ ...cardStyle, minWidth: 0, height: '100%' }}
                >
                  <Column gap="4" padding="2" style={{ height: '100%' }}>
                    <Column gap="2" alignItems="center">
                      <PlanBadge plan={plan} label={planName} />
                      <Text weight="bold" size="lg">
                        {getDisplayedPrice(plan, billingInterval, t, membershipConfig)}
                      </Text>
                      {pricing.annual !== null &&
                        pricing.monthly !== null &&
                        pricing.monthly > 0 && (
                          <Text size="sm" color="muted">
                            {billingInterval === 'year'
                              ? t('membership.billedYear', { price: pricing.annual })
                              : t('membership.yearAvailable', { price: pricing.annual })}
                          </Text>
                        )}
                      {isCurrent && (
                        <Text
                          size="sm"
                          weight="bold"
                          style={{
                            color: '#8b5cf6',
                            border: '1px solid #8b5cf6',
                            borderRadius: 999,
                            padding: '2px 8px',
                          }}
                        >
                          {t('membership.current')}
                        </Text>
                      )}
                      {isRecommended && !isCurrent && (
                        <Text
                          size="sm"
                          weight="bold"
                          style={{
                            color: '#3b82f6',
                            border: '1px solid #3b82f6',
                            borderRadius: 999,
                            padding: '2px 8px',
                          }}
                        >
                          {t('membership.recommended')}
                        </Text>
                      )}
                    </Column>

                    <Text size="sm" color="muted">
                      {description}
                    </Text>

                    <Column gap="2">
                      {features.map(feature => (
                        <Row key={feature} gap="2" alignItems="center">
                          <Icon size="sm" style={{ color: '#22c55e', flexShrink: 0 }}>
                            <Check />
                          </Icon>
                          <Text size="sm">{feature}</Text>
                        </Row>
                      ))}
                    </Column>

                    <Button
                      variant={isCurrent ? 'quiet' : 'primary'}
                      style={{ width: '100%', marginTop: 'auto' }}
                      render={
                        plan === 'enterprise'
                          ? ({ className, children }) => (
                              <a
                                href="mailto:watson_zang@foxmail.com"
                                className={className}
                                style={{ width: '100%', marginTop: 'auto' }}
                              >
                                {children}
                              </a>
                            )
                          : undefined
                      }
                      isDisabled={
                        isCurrent || paypalSubscription.isPending || paypalConfirmation.isPending
                      }
                      onPress={() => {
                        if (!isCurrent && plan !== 'free' && plan !== 'enterprise') {
                          setSelectedPlan(plan);
                          handleUpgrade(plan);
                        }
                      }}
                    >
                      {isCurrent
                        ? t('membership.currentPlan')
                        : plan === 'enterprise'
                          ? t('membership.contactSales')
                          : paypalSubscription.isPending && selectedPlan === plan
                            ? t('membership.redirecting')
                            : t('membership.subscribe')}
                    </Button>
                  </Column>
                </Panel>
              );
            })}
        </Grid>
      </Column>
    </PageBody>
  );
}

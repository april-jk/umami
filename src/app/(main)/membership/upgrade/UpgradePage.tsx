'use client';

import { Button, Column, Grid, Icon, Row, Text } from '@umami/react-zen';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { PageBody } from '@/components/common/PageBody';
import { PageHeader } from '@/components/common/PageHeader';
import { Panel } from '@/components/common/Panel';
import { useApi, useLoginQuery, useMessages, useTenantQuery } from '@/components/hooks';
import { AlertTriangle, ArrowLeft, Check } from '@/components/icons';
import { TENANT_PLAN_PRICES, type TenantPlanId } from '@/lib/tenant-plan';
import { PlanBadge } from '../PlanBadge';

const planOrder: TenantPlanId[] = ['free', 'starter', 'pro', 'team', 'enterprise'];

function getDisplayedPrice(
  plan: TenantPlanId,
  interval: 'month' | 'year',
  translate: (key: string, values?: Record<string, string | number>) => string,
) {
  if (plan === 'free') return translate('membership.freePrice');

  const price = TENANT_PLAN_PRICES[plan];
  if (price.monthly === null || price.annual === null) {
    return translate('membership.customPrice');
  }

  const monthlyPrice = interval === 'year' ? price.annual / 12 : price.monthly;
  return translate('membership.pricePerMonth', {
    price: monthlyPrice.toFixed(interval === 'year' ? 2 : 0),
  });
}

export function UpgradePage() {
  const { user } = useLoginQuery();
  const tenantId = user?.tenantId || user?.tenants?.[0]?.id;
  const { data: tenant } = useTenantQuery(tenantId);
  const { t } = useMessages();
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
          {planOrder.map((plan, index) => {
            const isCurrent = plan === currentPlan;
            const isRecommended = index === currentIndex + 1;
            const planKey = `membership.plans.${plan}`;
            const planName = t(`${planKey}.name`);
            const content = {
              description: t(`${planKey}.description`),
              features: t.raw(`${planKey}.features`) as string[],
            };
            const pricing = TENANT_PLAN_PRICES[plan];

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
                      {getDisplayedPrice(plan, billingInterval, t)}
                    </Text>
                    {pricing.annual !== null && pricing.monthly !== null && pricing.monthly > 0 && (
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
                    {content.description}
                  </Text>

                  <Column gap="2">
                    {content.features.map(feature => (
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

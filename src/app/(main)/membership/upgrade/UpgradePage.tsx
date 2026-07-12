'use client';

import { Button, Column, Grid, Heading, Icon, Row, Text } from '@umami/react-zen';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { PageBody } from '@/components/common/PageBody';
import { PageHeader } from '@/components/common/PageHeader';
import { Panel } from '@/components/common/Panel';
import { useApi, useLoginQuery, useTenantQuery } from '@/components/hooks';
import { AlertTriangle, ArrowLeft, Check } from '@/components/icons';
import { TENANT_PLAN_LIMITS, type TenantPlanId } from '@/lib/tenant-plan';
import { PlanBadge } from '../PlanBadge';

const planOrder: TenantPlanId[] = ['free', 'starter', 'pro', 'team', 'enterprise'];

const planPrices: Record<TenantPlanId, string> = {
  free: 'Free',
  starter: '$9/mo',
  pro: '$29/mo',
  team: '$99/mo',
  enterprise: 'Custom',
};

const annualMonthlyPrices: Record<Exclude<TenantPlanId, 'free' | 'enterprise'>, string> = {
  starter: '$7.50/mo',
  pro: '$24.17/mo',
  team: '$82.50/mo',
};

const planFeatures: Record<TenantPlanId, string[]> = {
  free: ['100K events/month', '5 websites', '1 member', '7 days retention'],
  starter: ['500K events/month', '10 websites', '1 member', '180 days retention', 'API access'],
  pro: [
    '2M events/month',
    '25 websites',
    '5 members',
    '2 years retention',
    'API access',
    'Email reports',
  ],
  team: [
    '10M events/month',
    '50 websites',
    '20 members',
    'Unlimited retention',
    'White-label',
    'SSO ready',
  ],
  enterprise: [
    'Unlimited events',
    'Unlimited websites',
    'Unlimited members',
    'Unlimited retention',
    'Custom branding',
    'SSO / SAML',
    'Dedicated support',
  ],
};

export function UpgradePage() {
  const { user } = useLoginQuery();
  const tenantId = user?.tenantId || user?.tenants?.[0]?.id;
  const { data: tenant } = useTenantQuery(tenantId);
  const { post, useMutation } = useApi();
  const searchParams = useSearchParams();
  const [selectedPlan, setSelectedPlan] = useState<TenantPlanId | null>(null);
  const [billingInterval, setBillingInterval] = useState<'month' | 'year'>('year');
  const [error, setError] = useState('');
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
      onError: () =>
        setError('Your subscription approval could not be verified. Please try again.'),
    });
  }, [paypalConfirmation, searchParams, tenantId]);

  const handleUpgrade = async (plan: TenantPlanId) => {
    if (plan === currentPlan) return;
    if (plan === 'free' || plan === 'enterprise') return;

    setError('');
    try {
      const { approveUrl } = await paypalSubscription.mutateAsync({
        plan,
        interval: billingInterval,
      });
      window.location.assign(approveUrl);
    } catch {
      setError('Unable to start checkout. Please try again.');
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
                Back
              </Row>
            </Button>
          </Link>
        </Row>

        <PageHeader
          title="Upgrade Membership"
          description="Choose the plan that fits your needs. Upgrade anytime to unlock more features."
        />

        {error && (
          <Panel style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca' }}>
            <Text style={{ color: '#ef4444' }}>{error}</Text>
          </Panel>
        )}

        <Row gap="2" alignItems="center">
          <Button
            variant={billingInterval === 'year' ? 'primary' : 'quiet'}
            onPress={() => setBillingInterval('year')}
          >
            Annual (2 months free)
          </Button>
          <Button
            variant={billingInterval === 'month' ? 'primary' : 'quiet'}
            onPress={() => setBillingInterval('month')}
          >
            Monthly
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
                    Downgrade Warning
                  </Text>
                  <Text size="sm" color="muted">
                    Downgrading may reduce your available resources. Existing data will be preserved
                    but you may not be able to add new websites or members until you are within the
                    new plan limits.
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
            const limits = TENANT_PLAN_LIMITS[plan];

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
                    <PlanBadge plan={plan} />
                    <Heading size="sm">{plan.charAt(0).toUpperCase() + plan.slice(1)}</Heading>
                    <Text weight="bold" size="lg">
                      {plan === 'enterprise' || plan === 'free'
                        ? planPrices[plan]
                        : billingInterval === 'year'
                          ? annualMonthlyPrices[plan]
                          : planPrices[plan]}
                    </Text>
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
                        Current
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
                        Recommended
                      </Text>
                    )}
                  </Column>

                  <Column gap="2">
                    <Row gap="2" alignItems="center">
                      <Text size="sm" weight="bold">
                        Events:
                      </Text>
                      <Text size="sm" color="muted">
                        {limits.eventLimit === null
                          ? 'Unlimited'
                          : `${limits.eventLimit.toLocaleString()}/mo`}
                      </Text>
                    </Row>
                    <Row gap="2" alignItems="center">
                      <Text size="sm" weight="bold">
                        Websites:
                      </Text>
                      <Text size="sm" color="muted">
                        {limits.websiteLimit === null
                          ? 'Unlimited'
                          : limits.websiteLimit.toString()}
                      </Text>
                    </Row>
                    <Row gap="2" alignItems="center">
                      <Text size="sm" weight="bold">
                        Members:
                      </Text>
                      <Text size="sm" color="muted">
                        {limits.memberLimit === null ? 'Unlimited' : limits.memberLimit.toString()}
                      </Text>
                    </Row>
                    <Row gap="2" alignItems="center">
                      <Text size="sm" weight="bold">
                        Retention:
                      </Text>
                      <Text size="sm" color="muted">
                        {limits.retentionDays === null
                          ? 'Unlimited'
                          : `${limits.retentionDays} days`}
                      </Text>
                    </Row>
                  </Column>

                  <Column gap="2">
                    {planFeatures[plan].map(feature => (
                      <Row key={feature} gap="2" alignItems="center">
                        <Icon size="sm" style={{ color: '#22c55e' }}>
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
                      if (!isCurrent && plan !== 'enterprise') {
                        setSelectedPlan(plan);
                        handleUpgrade(plan);
                      }
                    }}
                  >
                    {isCurrent
                      ? 'Current Plan'
                      : plan === 'enterprise'
                        ? 'Contact sales'
                        : paypalSubscription.isPending && selectedPlan === plan
                          ? 'Redirecting to checkout...'
                          : 'Subscribe'}
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

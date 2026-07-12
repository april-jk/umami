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
import { TENANT_PLAN_PRICES, type TenantPlanId } from '@/lib/tenant-plan';
import { PlanBadge } from '../PlanBadge';

const planOrder: TenantPlanId[] = ['free', 'starter', 'pro', 'team', 'enterprise'];

const planContent: Record<TenantPlanId, { description: string; features: string[] }> = {
  free: {
    description:
      'Perfect for side projects and early experiments. Get core analytics with 100K events/month across 5 websites.',
    features: [
      '100K events/month',
      '5 websites',
      'Core analytics, API read access, and 50 MCP calls/day',
      'Real-time dashboard',
      'GDPR compliant by default',
      '7-day data retention',
      '10 API requests/minute and 10 AI analyses/month',
      'Community support (Discord)',
    ],
  },
  starter: {
    description:
      'For growing projects that need more capacity, AI workflows, and regular delivery of analytics insights.',
    features: [
      '500K events/month',
      '10 websites',
      '1 member, 20 goals, and 500 session replays/month',
      '500 MCP calls/day and 60 API requests/minute',
      'CSV export and daily or weekly email reports',
      '3 basic alert rules and unlimited AI analyses',
      '6 months data retention',
      '5 AI reports/month',
    ],
  },
  pro: {
    description: 'For teams that need collaboration, richer automation, and advanced analytics.',
    features: [
      '2M events/month',
      '25 websites',
      'Everything in Starter',
      '5 team members, 100 goals, and 5K replays/month',
      'Unlimited MCP calls and 300 API requests/minute',
      'CSV and JSON export, 5 webhooks, and Slack alerts',
      'AI anomaly detection, advanced funnels, and priority support',
      '24 months data retention',
      '50 AI reports/month',
    ],
  },
  team: {
    description:
      'For multi-product teams and agencies that need scale, governance, and branded delivery.',
    features: [
      '10M events/month and 50 websites',
      '20 members, unlimited goals, and unlimited data retention',
      'Unlimited MCP calls and 600 API requests/minute',
      '20 webhooks, 100 alert rules, and 200 AI reports/month',
      'SSO/SAML, white-label controls, and AI forecasting',
      '24-hour support response target',
    ],
  },
  enterprise: {
    description:
      'For organizations with custom volume, security, support, and deployment requirements.',
    features: [
      'Custom event, API, MCP, website, and member capacity',
      'Custom retention and reporting configuration',
      'Advanced identity, branding, and integration requirements',
      'Dedicated CSM and SLA options',
    ],
  },
};

function getDisplayedPrice(plan: TenantPlanId, interval: 'month' | 'year') {
  if (plan === 'free') return 'Free';

  const price = TENANT_PLAN_PRICES[plan];
  if (price.monthly === null || price.annual === null) return 'Custom';

  const monthlyPrice = interval === 'year' ? price.annual / 12 : price.monthly;
  return `$${monthlyPrice.toFixed(interval === 'year' ? 2 : 0)}/mo`;
}

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

  const handleUpgrade = async (plan: Exclude<TenantPlanId, 'free' | 'enterprise'>) => {
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
          description="Choose a plan for your analytics capacity, AI workflows, collaboration, and reporting needs."
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
            const content = planContent[plan];
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
                    <PlanBadge plan={plan} />
                    <Heading size="sm">{plan.charAt(0).toUpperCase() + plan.slice(1)}</Heading>
                    <Text weight="bold" size="lg">
                      {getDisplayedPrice(plan, billingInterval)}
                    </Text>
                    {pricing.annual !== null && pricing.monthly !== null && pricing.monthly > 0 && (
                      <Text size="sm" color="muted">
                        {billingInterval === 'year'
                          ? `Billed $${pricing.annual}/year (save 2 months)`
                          : `$${pricing.annual}/year available`}
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

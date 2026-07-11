'use client';

import { Column, Grid, Heading, Icon, Row, Text, Button } from '@umami/react-zen';
import { PageBody } from '@/components/common/PageBody';
import { PageHeader } from '@/components/common/PageHeader';
import { Panel } from '@/components/common/Panel';
import { useLoginQuery, useTenantQuery, useUpdateTenantPlanQuery, useMessages } from '@/components/hooks';
import { Check, Crown, ArrowLeft, AlertTriangle } from '@/components/icons';
import { TENANT_PLAN_LIMITS, type TenantPlanId } from '@/lib/tenant-plan';
import { PlanBadge } from '../PlanBadge';
import Link from 'next/link';
import { useState } from 'react';

const planOrder: TenantPlanId[] = ['free', 'starter', 'pro', 'team', 'enterprise'];

const planPrices: Record<TenantPlanId, string> = {
  free: 'Free',
  starter: '$9/mo',
  pro: '$29/mo',
  team: '$99/mo',
  enterprise: 'Custom',
};

const planFeatures: Record<TenantPlanId, string[]> = {
  free: ['100K events/month', '5 websites', '1 member', '7 days retention'],
  starter: ['500K events/month', '10 websites', '1 member', '180 days retention', 'API access'],
  pro: ['2M events/month', '25 websites', '5 members', '2 years retention', 'API access', 'Email reports'],
  team: ['10M events/month', '50 websites', '20 members', 'Unlimited retention', 'White-label', 'SSO ready'],
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
  const { t, labels } = useMessages();
  const tenantId = user?.tenantId || user?.tenants?.[0]?.id;
  const { data: tenant } = useTenantQuery(tenantId);
  const updatePlan = useUpdateTenantPlanQuery(tenantId);
  const [selectedPlan, setSelectedPlan] = useState<TenantPlanId | null>(null);

  const currentPlan = (tenant?.plan || user?.plan || 'free') as TenantPlanId;
  const currentIndex = planOrder.indexOf(currentPlan);

  const handleUpgrade = async (plan: TenantPlanId) => {
    if (plan === currentPlan) return;
    await updatePlan.mutateAsync({ plan });
    setSelectedPlan(null);
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

        {selectedPlan && selectedPlan !== currentPlan && planOrder.indexOf(selectedPlan) < currentIndex && (
          <Panel style={{ backgroundColor: '#fefce8', border: '1px solid #fde047' }}>
            <Row gap="3" alignItems="center">
              <Icon size="sm" style={{ color: '#f97316' }}>
                <AlertTriangle />
              </Icon>
              <Column>
                <Text weight="bold" style={{ color: '#f97316' }}>Downgrade Warning</Text>
                <Text size="sm" color="muted">
                  Downgrading may reduce your available resources. Existing data will be preserved but you may not be able to add new websites or members until you are within the new plan limits.
                </Text>
              </Column>
            </Row>
          </Panel>
        )}

        <Grid columns={{ base: '1fr', md: '1fr 1fr', xl: 'repeat(5, 1fr)' }} gap="4">
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
              <Panel key={plan} style={cardStyle}>
                <Column gap="4" padding="2">
                  <Column gap="2" alignItems="center">
                    <PlanBadge plan={plan} />
                    <Heading size="sm">
                      {plan.charAt(0).toUpperCase() + plan.slice(1)}
                    </Heading>
                    <Text weight="bold" size="lg">
                      {planPrices[plan]}
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
                      <Text size="sm" weight="bold">Events:</Text>
                      <Text size="sm" color="muted">
                        {limits.eventLimit === null ? 'Unlimited' : limits.eventLimit.toLocaleString() + '/mo'}
                      </Text>
                    </Row>
                    <Row gap="2" alignItems="center">
                      <Text size="sm" weight="bold">Websites:</Text>
                      <Text size="sm" color="muted">
                        {limits.websiteLimit === null ? 'Unlimited' : limits.websiteLimit.toString()}
                      </Text>
                    </Row>
                    <Row gap="2" alignItems="center">
                      <Text size="sm" weight="bold">Members:</Text>
                      <Text size="sm" color="muted">
                        {limits.memberLimit === null ? 'Unlimited' : limits.memberLimit.toString()}
                      </Text>
                    </Row>
                    <Row gap="2" alignItems="center">
                      <Text size="sm" weight="bold">Retention:</Text>
                      <Text size="sm" color="muted">
                        {limits.retentionDays === null ? 'Unlimited' : limits.retentionDays + ' days'}
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
                    isDisabled={isCurrent || updatePlan.isPending}
                    onPress={() => {
                      if (!isCurrent) {
                        setSelectedPlan(plan);
                        handleUpgrade(plan);
                      }
                    }}
                  >
                    {isCurrent ? 'Current Plan' : updatePlan.isPending && selectedPlan === plan ? 'Upgrading...' : 'Upgrade'}
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

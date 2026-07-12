import { Button, Column, Grid, Label, ListItem, Row, Select, Text } from '@umami/react-zen';
import { useEffect, useState } from 'react';
import { LoadingPanel } from '@/components/common/LoadingPanel';
import { useAdminUserMembershipQuery, useUpdateAdminUserMembershipQuery } from '@/components/hooks';
import { TENANT_PLAN_PRICES, type TenantPlanId } from '@/lib/tenant-plan';

const plans: TenantPlanId[] = ['free', 'starter', 'pro', 'team', 'enterprise'];
const statuses = ['active', 'trialing', 'past-due', 'suspended'] as const;

function formatDate(value?: string | null) {
  return value
    ? new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(new Date(value))
    : 'Not set';
}

export function UserMembership({ userId }: { userId: string }) {
  const query = useAdminUserMembershipQuery(userId);
  const update = useUpdateAdminUserMembershipQuery(userId);
  const [plan, setPlan] = useState<TenantPlanId>('free');
  const [status, setStatus] = useState<(typeof statuses)[number]>('active');

  useEffect(() => {
    if (query.data?.tenant) {
      setPlan(query.data.tenant.plan);
      setStatus(query.data.tenant.status);
    }
  }, [query.data]);

  const handleSave = async () => update.mutateAsync({ plan, status });
  const subscription = query.data?.tenant?.subscription;

  return (
    <LoadingPanel
      data={query.data}
      isLoading={query.isLoading}
      isFetching={query.isFetching}
      error={query.error}
    >
      {query.data?.tenant ? (
        <Column gap="6">
          <Column gap="1">
            <Text weight="bold">Tenant membership</Text>
            <Text color="muted">
              Plan changes update product entitlements immediately. They do not modify an existing
              external PayPal agreement.
            </Text>
          </Column>

          <Grid columns={{ base: '1fr', md: 'repeat(3, minmax(0, 1fr))' }} gap="4">
            <Column gap="1">
              <Text size="sm" color="muted">
                Tenant
              </Text>
              <Text weight="bold">{query.data.tenant.name}</Text>
            </Column>
            <Column gap="1">
              <Text size="sm" color="muted">
                Billing provider
              </Text>
              <Text weight="bold">{subscription?.billingProvider ?? 'Manual'}</Text>
            </Column>
            <Column gap="1">
              <Text size="sm" color="muted">
                Current period end
              </Text>
              <Text weight="bold">{formatDate(subscription?.currentPeriodEnd)}</Text>
            </Column>
            <Column gap="1">
              <Text size="sm" color="muted">
                Subscription status
              </Text>
              <Text weight="bold">{subscription?.status ?? query.data.tenant.status}</Text>
            </Column>
            <Column gap="1">
              <Text size="sm" color="muted">
                Cancel at period end
              </Text>
              <Text weight="bold">{subscription?.cancelAtPeriodEnd ? 'Yes' : 'No'}</Text>
            </Column>
            <Column gap="1">
              <Text size="sm" color="muted">
                Annual list price
              </Text>
              <Text weight="bold">${TENANT_PLAN_PRICES[plan].annual}</Text>
            </Column>
          </Grid>

          <Column gap="3" padding="4" border borderRadius backgroundColor="surface-sunken">
            <Text weight="bold">Administrative entitlement change</Text>
            <Grid columns={{ base: '1fr', md: '1fr 1fr' }} gap="4">
              <Column gap="1">
                <Label>Plan</Label>
                <Select aria-label="Membership plan" value={plan} onChange={setPlan}>
                  {plans.map(value => (
                    <ListItem key={value} id={value} textValue={value}>
                      {value.charAt(0).toUpperCase() + value.slice(1)}
                    </ListItem>
                  ))}
                </Select>
              </Column>
              <Column gap="1">
                <Label>Tenant status</Label>
                <Select aria-label="Tenant status" value={status} onChange={setStatus}>
                  {statuses.map(value => (
                    <ListItem key={value} id={value} textValue={value}>
                      {value}
                    </ListItem>
                  ))}
                </Select>
              </Column>
            </Grid>
            <Row justifyContent="flex-end">
              <Button variant="primary" isDisabled={update.isPending} onPress={handleSave}>
                Save membership
              </Button>
            </Row>
          </Column>
        </Column>
      ) : (
        <Text color="muted">This user does not have a tenant to manage.</Text>
      )}
    </LoadingPanel>
  );
}

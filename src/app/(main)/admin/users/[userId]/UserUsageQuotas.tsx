import {
  Button,
  Column,
  Grid,
  Label,
  ListItem,
  Row,
  Select,
  Text,
  TextField,
} from '@umami/react-zen';
import { useEffect, useState } from 'react';
import { LoadingPanel } from '@/components/common/LoadingPanel';
import { useAdminUserMembershipQuery, useUpdateAdminUserMembershipQuery } from '@/components/hooks';

type QuotaKey = 'eventLimit' | 'websiteLimit' | 'memberLimit';
type McpQuotaKey = 'mcpCallsPerDay' | 'mcpCallsPerMonth';
type QuotaMode = 'inherit' | 'custom' | 'unlimited';
type QuotaState = Record<QuotaKey | McpQuotaKey, { mode: QuotaMode; value: string }>;

const quotaRows: Array<{ key: QuotaKey; label: string; usageKey: string }> = [
  { key: 'eventLimit', label: 'Events / month', usageKey: 'events' },
  { key: 'websiteLimit', label: 'Websites', usageKey: 'websites' },
  { key: 'memberLimit', label: 'Members', usageKey: 'members' },
];

const mcpQuotaRows: Array<{ key: McpQuotaKey; label: string }> = [
  { key: 'mcpCallsPerDay', label: 'MCP calls / day' },
  { key: 'mcpCallsPerMonth', label: 'MCP calls / month' },
];

const emptyQuotas: QuotaState & Record<McpQuotaKey, { mode: QuotaMode; value: string }> = {
  eventLimit: { mode: 'inherit', value: '' },
  websiteLimit: { mode: 'inherit', value: '' },
  memberLimit: { mode: 'inherit', value: '' },
  mcpCallsPerDay: { mode: 'inherit', value: '' },
  mcpCallsPerMonth: { mode: 'inherit', value: '' },
};

function formatLimit(value: number | null | undefined) {
  return value === null ? 'Unlimited' : Intl.NumberFormat('en-US').format(value ?? 0);
}

function getQuotaState(
  overrides: Record<string, number | null> = {},
): QuotaState & Record<McpQuotaKey, { mode: QuotaMode; value: string }> {
  return Object.fromEntries(
    [...quotaRows, ...mcpQuotaRows].map(({ key }) => {
      if (!Object.hasOwn(overrides, key)) return [key, { mode: 'inherit', value: '' }];
      if (overrides[key] === null) return [key, { mode: 'unlimited', value: '' }];
      return [key, { mode: 'custom', value: String(overrides[key]) }];
    }),
  ) as QuotaState;
}

export function UserUsageQuotas({ userId }: { userId: string }) {
  const query = useAdminUserMembershipQuery(userId);
  const update = useUpdateAdminUserMembershipQuery(userId);
  const [quotas, setQuotas] = useState<QuotaState>(emptyQuotas);

  useEffect(() => {
    if (query.data?.tenant) setQuotas(getQuotaState(query.data.tenant.quotaOverrides));
  }, [query.data]);

  const invalid = [...quotaRows, ...mcpQuotaRows].some(({ key }) => {
    const quota = quotas[key];
    return (
      quota.mode === 'custom' && (!Number.isInteger(Number(quota.value)) || Number(quota.value) < 0)
    );
  });

  const handleSave = async () => {
    await update.mutateAsync({
      quotaOverrides: Object.fromEntries(
        [...quotaRows, ...mcpQuotaRows].map(({ key }) => {
          const quota = quotas[key];
          if (quota.mode === 'inherit') return [key, 'inherit'];
          if (quota.mode === 'unlimited') return [key, null];
          return [key, Number(quota.value)];
        }),
      ),
    });
  };

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
            <Text weight="bold">Current usage and effective quotas</Text>
            <Text color="muted">
              Overrides apply to this user&apos;s default tenant and are enforced immediately.
            </Text>
          </Column>

          <Column border borderRadius overflow="hidden">
            <Grid
              columns="minmax(180px, 1fr) repeat(4, minmax(120px, 1fr))"
              backgroundColor="surface-sunken"
              padding="3"
              gap="3"
            >
              {['Resource', 'Used', 'Plan default', 'Override', 'Effective'].map(label => (
                <Text key={label} weight="bold">
                  {label}
                </Text>
              ))}
            </Grid>
            {quotaRows.map(({ key, label, usageKey }, index) => {
              const usage = query.data.usage?.[usageKey];
              const override = query.data.tenant.quotaOverrides?.[key];
              return (
                <Grid
                  key={key}
                  columns="minmax(180px, 1fr) repeat(4, minmax(120px, 1fr))"
                  padding="3"
                  gap="3"
                  border={index === 0 ? undefined : 'top'}
                >
                  <Text weight="bold">{label}</Text>
                  <Text>{formatLimit(usage?.used)}</Text>
                  <Text>{formatLimit(query.data.usage?.defaults?.[key])}</Text>
                  <Text>
                    {Object.hasOwn(query.data.tenant.quotaOverrides ?? {}, key)
                      ? formatLimit(override)
                      : 'Inherit'}
                  </Text>
                  <Text>{formatLimit(usage?.limit)}</Text>
                </Grid>
              );
            })}
          </Column>

          <Column gap="4">
            <Text weight="bold">Quota overrides</Text>
            {quotaRows.map(({ key, label }) => (
              <Grid
                key={key}
                columns={{ base: '1fr', md: '180px 220px minmax(180px, 1fr)' }}
                gap="3"
                alignItems="end"
              >
                <Label>{label}</Label>
                <Select
                  aria-label={`${label} mode`}
                  value={quotas[key].mode}
                  onChange={(mode: QuotaMode) =>
                    setQuotas(current => ({ ...current, [key]: { ...current[key], mode } }))
                  }
                >
                  <ListItem id="inherit">Use plan default</ListItem>
                  <ListItem id="custom">Custom value</ListItem>
                  <ListItem id="unlimited">Unlimited</ListItem>
                </Select>
                <TextField
                  aria-label={`${label} custom value`}
                  type="number"
                  value={quotas[key].value}
                  isDisabled={quotas[key].mode !== 'custom'}
                  onChange={value =>
                    setQuotas(current => ({ ...current, [key]: { ...current[key], value } }))
                  }
                />
              </Grid>
            ))}
            <Column gap="3" padding="4" backgroundColor="surface-sunken">
              <Column gap="1">
                <Text weight="bold">MCP usage quota overrides</Text>
                <Text color="muted">
                  MCP calls are shared across this tenant&apos;s MCP API keys. The active daily or
                  monthly period is selected from the first configured override.
                </Text>
                <Text size="sm" color="muted">
                  Current usage: {query.data.usage?.mcp?.used?.toLocaleString() ?? 0} /{' '}
                  {formatLimit(query.data.usage?.mcp?.limit)}
                  {query.data.usage?.mcp?.period ? ` (${query.data.usage.mcp.period})` : ''}
                </Text>
              </Column>
              {mcpQuotaRows.map(({ key, label }) => (
                <Grid
                  key={key}
                  columns={{ base: '1fr', md: '180px 220px minmax(180px, 1fr)' }}
                  gap="3"
                  alignItems="end"
                >
                  <Label>{label}</Label>
                  <Select
                    aria-label={`${label} mode`}
                    value={quotas[key].mode}
                    onChange={(mode: QuotaMode) =>
                      setQuotas(current => ({ ...current, [key]: { ...current[key], mode } }))
                    }
                  >
                    <ListItem id="inherit">Use plan default</ListItem>
                    <ListItem id="custom">Custom value</ListItem>
                    <ListItem id="unlimited">Unlimited</ListItem>
                  </Select>
                  <TextField
                    aria-label={`${label} custom value`}
                    type="number"
                    value={quotas[key].value}
                    isDisabled={quotas[key].mode !== 'custom'}
                    onChange={value =>
                      setQuotas(current => ({ ...current, [key]: { ...current[key], value } }))
                    }
                  />
                </Grid>
              ))}
            </Column>
            <Row justifyContent="flex-end">
              <Button
                variant="primary"
                isDisabled={invalid || update.isPending}
                onPress={handleSave}
              >
                Save quota overrides
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

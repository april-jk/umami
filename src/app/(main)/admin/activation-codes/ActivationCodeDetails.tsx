import { Column, DataColumn, DataTable, Heading, Row, Text } from '@umami/react-zen';
import { CopyButton } from '@/components/common/CopyButton';
import { LoadingPanel } from '@/components/common/LoadingPanel';
import { useActivationCodeQuery, useMessages } from '@/components/hooks';

export function ActivationCodeDetails({ activationCodeId }: { activationCodeId: string }) {
  const { t } = useMessages();
  const query = useActivationCodeQuery(activationCodeId);
  const redemptions = query.data?.redemptions ?? [];

  return (
    <LoadingPanel
      data={query.data}
      isLoading={query.isLoading}
      isFetching={query.isFetching}
      error={query.error}
    >
      <Column gap="5">
        <Row gap="6" wrap="wrap">
          <Column gap="1" style={{ minWidth: 240 }}>
            <Text size="sm" color="muted">
              {t('activationCodes.code')}
            </Text>
            {query.data?.code ? (
              <Row alignItems="center" gap="1">
                <Text weight="bold" style={{ fontFamily: 'monospace' }}>
                  {query.data.code}
                </Text>
                <CopyButton value={query.data.code} label={t('activationCodes.copy')} />
              </Row>
            ) : (
              <Text color="muted">{t('activationCodes.codeUnavailable')}</Text>
            )}
          </Column>
          <Column gap="1">
            <Text size="sm" color="muted">
              {t('activationCodes.plan')}
            </Text>
            <Text weight="bold">{query.data && t(`membership.plans.${query.data.plan}.name`)}</Text>
          </Column>
          <Column gap="1">
            <Text size="sm" color="muted">
              {t('activationCodes.usage')}
            </Text>
            <Text weight="bold">
              {query.data?.redemptionCount ?? 0} / {query.data?.maxRedemptions ?? 0}
            </Text>
          </Column>
        </Row>
        <Heading size="sm">{t('activationCodes.redemptionHistory')}</Heading>
        {redemptions.length ? (
          <DataTable data={redemptions}>
            <DataColumn id="user" label={t('activationCodes.user')} width="2fr">
              {(row: any) =>
                row.user.displayName ? (
                  <Column gap="1">
                    <Text>{row.user.displayName}</Text>
                    <Text size="sm" color="muted">
                      {row.user.username}
                    </Text>
                  </Column>
                ) : (
                  row.user.username
                )
              }
            </DataColumn>
            <DataColumn id="tenant" label={t('activationCodes.workspace')} width="2fr">
              {(row: any) => row.tenant.name}
            </DataColumn>
            <DataColumn id="redeemedAt" label={t('activationCodes.redeemedAt')}>
              {(row: any) => new Date(row.redeemedAt).toLocaleString()}
            </DataColumn>
            <DataColumn id="membershipEndsAt" label={t('activationCodes.membershipEndsAt')}>
              {(row: any) => new Date(row.membershipEndsAt).toLocaleString()}
            </DataColumn>
          </DataTable>
        ) : (
          <Text color="muted">{t('activationCodes.noRedemptions')}</Text>
        )}
      </Column>
    </LoadingPanel>
  );
}

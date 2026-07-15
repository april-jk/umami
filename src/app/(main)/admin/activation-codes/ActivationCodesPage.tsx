'use client';

import { Column } from '@umami/react-zen';
import { PageHeader } from '@/components/common/PageHeader';
import { Panel } from '@/components/common/Panel';
import { useMessages } from '@/components/hooks';
import { ActivationCodeCreateButton } from './ActivationCodeCreateButton';
import { ActivationCodesDataTable } from './ActivationCodesDataTable';

export function ActivationCodesPage() {
  const { t } = useMessages();

  return (
    <Column gap="6">
      <PageHeader title={t('activationCodes.title')} description={t('activationCodes.description')}>
        <ActivationCodeCreateButton />
      </PageHeader>
      <Panel>
        <ActivationCodesDataTable />
      </Panel>
    </Column>
  );
}

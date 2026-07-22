'use client';
import { Column, Heading, Row, Text, TextField } from '@umami/react-zen';
import { LoadingPanel } from '@/components/common/LoadingPanel';
import { PageBody } from '@/components/common/PageBody';
import { PageHeader } from '@/components/common/PageHeader';
import { Panel } from '@/components/common/Panel';
import { useApiKeysQuery } from '@/components/hooks';
import { KeyRound, Plus } from '@/components/icons';
import { DialogButton } from '@/components/input/DialogButton';
import { ApiKeyCreateForm } from './ApiKeyCreateForm';
import { ApiKeysTable } from './ApiKeysTable';
import { McpUsagePanel } from './McpUsagePanel';

export function ApiKeysPage() {
  const query = useApiKeysQuery();
  const { data, error, isLoading } = query;
  const apiKeys = data || [];

  return (
    <PageBody>
      <Column gap="6">
        <PageHeader title="API keys" />
        <Panel>
          <Column gap="5">
            <Row justifyContent="space-between" alignItems="center" gap>
              <Column gap="2">
                <Heading size="sm">Personal API keys</Heading>
                <Text color="muted">
                  Use these keys as Bearer tokens for Amami API access. Keys inherit your account
                  permissions, including your teams.
                </Text>
              </Column>
              <DialogButton
                icon={<Plus size={16} />}
                label="Create key"
                title="Create API key"
                variant="primary"
                width="560px"
              >
                {({ close }) => <ApiKeyCreateForm onClose={close} />}
              </DialogButton>
            </Row>
            <Column gap="2">
              <Text weight="bold">Request header</Text>
              <TextField value="Authorization: Bearer <api-key>" isReadOnly allowCopy />
            </Column>
            <LoadingPanel
              data={apiKeys}
              isLoading={isLoading}
              error={error}
              renderEmpty={() => (
                <Column alignItems="center" gap="3" paddingY="6">
                  <KeyRound />
                  <Text color="muted">No API keys yet.</Text>
                </Column>
              )}
            >
              <ApiKeysTable data={apiKeys} />
            </LoadingPanel>
          </Column>
        </Panel>
        <McpUsagePanel />
      </Column>
    </PageBody>
  );
}

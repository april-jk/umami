import { Column, Heading, Text } from '@umami/react-zen';
import { DataGrid } from '@/components/common/DataGrid';
import { Panel } from '@/components/common/Panel';
import { useMcpUsageQuery, useMessages } from '@/components/hooks';
import { History } from '@/components/icons';
import { McpUsageTable } from './McpUsageTable';

export function McpUsagePanel({ userId }: { userId?: string }) {
  const query = useMcpUsageQuery(userId);
  const { t, labels, messages } = useMessages();

  return (
    <Panel>
      <Column gap="5">
        <Column gap="2">
          <Heading size="sm">{t(labels.mcpUsage)}</Heading>
          <Text color="muted">{t(messages.mcpUsageDescription)}</Text>
        </Column>
        <DataGrid
          query={query}
          renderEmpty={() => (
            <Column alignItems="center" gap="3" paddingY="6">
              <History />
              <Text color="muted">{t(messages.noMcpRequests)}</Text>
            </Column>
          )}
        >
          {({ data }) => <McpUsageTable data={data} />}
        </DataGrid>
      </Column>
    </Panel>
  );
}

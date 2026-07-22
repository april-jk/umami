import { Column, Heading, Text } from '@umami/react-zen';
import { DataGrid } from '@/components/common/DataGrid';
import { Panel } from '@/components/common/Panel';
import { useMcpUsageQuery } from '@/components/hooks';
import { History } from '@/components/icons';
import { McpUsageTable } from './McpUsageTable';

export function McpUsagePanel() {
  const query = useMcpUsageQuery();

  return (
    <Panel>
      <Column gap="5">
        <Column gap="2">
          <Heading size="sm">MCP usage</Heading>
          <Text color="muted">
            Requests made by API keys created for an Amami MCP installation.
          </Text>
        </Column>
        <DataGrid
          query={query}
          renderEmpty={() => (
            <Column alignItems="center" gap="3" paddingY="6">
              <History />
              <Text color="muted">No MCP requests yet.</Text>
            </Column>
          )}
        >
          {({ data }) => <McpUsageTable data={data} />}
        </DataGrid>
      </Column>
    </Panel>
  );
}

import { Column, DataColumn, DataTable, type DataTableProps, Text } from '@umami/react-zen';
import { DateDistance } from '@/components/common/DateDistance';

export function McpUsageTable(props: DataTableProps) {
  return (
    <DataTable {...props}>
      <DataColumn id="createdAt" label="Request time" width="180px">
        {({ createdAt }: any) => <DateDistance date={new Date(createdAt)} />}
      </DataColumn>
      <DataColumn id="apiKeyName" label="Key name" width="220px">
        {({ apiKeyName }: any) => apiKeyName}
      </DataColumn>
      <DataColumn id="operation" label="Operation">
        {({ operation, method, route }: any) => (
          <Column gap="1">
            <Text>{operation}</Text>
            <Text color="muted" size="sm" style={{ fontFamily: 'monospace' }}>
              {method} {route}
            </Text>
          </Column>
        )}
      </DataColumn>
    </DataTable>
  );
}

import { Column, DataColumn, DataTable, type DataTableProps, Text } from '@umami/react-zen';
import { DateDistance } from '@/components/common/DateDistance';
import { useMessages } from '@/components/hooks';

function getOperationLabel(t: ReturnType<typeof useMessages>['t'], operationKey?: string) {
  return operationKey ? t(`label.mcp-operation.${operationKey}`) : undefined;
}

export function McpUsageTable(props: DataTableProps) {
  const { t, labels } = useMessages();

  return (
    <DataTable {...props}>
      <DataColumn id="createdAt" label={t(labels.requestTime)} width="180px">
        {({ createdAt }: any) => <DateDistance date={new Date(createdAt)} absolute />}
      </DataColumn>
      <DataColumn id="apiKeyName" label={t(labels.keyName)} width="220px">
        {({ apiKeyName }: any) => apiKeyName}
      </DataColumn>
      <DataColumn id="operation" label={t(labels.operation)}>
        {({ operation, operationKey, method, route }: any) => {
          const operationLabel = getOperationLabel(t, operationKey) ?? operation;

          return (
            <Column gap="1">
              <Text>{operationLabel}</Text>
              <Text color="muted" size="sm" style={{ fontFamily: 'monospace' }}>
                {method} {route}
              </Text>
            </Column>
          );
        }}
      </DataColumn>
    </DataTable>
  );
}

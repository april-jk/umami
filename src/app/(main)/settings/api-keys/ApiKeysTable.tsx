import { DataColumn, DataTable, type DataTableProps, Row, Text } from '@umami/react-zen';
import { DateDistance } from '@/components/common/DateDistance';
import { ApiKeyDeleteButton } from './ApiKeyDeleteButton';

export function ApiKeysTable(props: DataTableProps) {
  return (
    <DataTable {...props}>
      <DataColumn id="name" label="Name">
        {({ name }: any) => name}
      </DataColumn>
      <DataColumn id="keyPrefix" label="Key prefix">
        {({ keyPrefix }: any) => <Text style={{ fontFamily: 'monospace' }}>{keyPrefix}...</Text>}
      </DataColumn>
      <DataColumn id="createdAt" label="Created">
        {({ createdAt }: any) => <DateDistance date={new Date(createdAt)} />}
      </DataColumn>
      <DataColumn id="lastUsedAt" label="Last used">
        {({ lastUsedAt }: any) =>
          lastUsedAt ? (
            <DateDistance date={new Date(lastUsedAt)} />
          ) : (
            <Text color="muted">Never</Text>
          )
        }
      </DataColumn>
      <DataColumn id="action" align="end" width="80px">
        {({ id, name }: any) => (
          <Row justifyContent="flex-end">
            <ApiKeyDeleteButton apiKeyId={id} name={name} />
          </Row>
        )}
      </DataColumn>
    </DataTable>
  );
}

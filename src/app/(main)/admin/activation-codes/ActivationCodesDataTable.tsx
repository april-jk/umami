import { DataGrid } from '@/components/common/DataGrid';
import { useActivationCodesQuery } from '@/components/hooks';
import { ActivationCodesTable } from './ActivationCodesTable';

export function ActivationCodesDataTable() {
  const query = useActivationCodesQuery();

  return (
    <DataGrid query={query} allowSearch>
      {({ data }) => <ActivationCodesTable data={data} />}
    </DataGrid>
  );
}

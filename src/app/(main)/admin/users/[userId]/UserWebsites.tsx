import { WebsitesTable } from '@/app/(main)/websites/WebsitesTable';
import { DataGrid } from '@/components/common/DataGrid';
import Link from '@/components/common/Link';
import { useNavigation, useUserWebsitesQuery } from '@/components/hooks';

export function UserWebsites({ userId }) {
  const queryResult = useUserWebsitesQuery({ userId });
  const { renderUrl } = useNavigation();

  return (
    <DataGrid query={queryResult}>
      {({ data }) => (
        <WebsitesTable
          data={data}
          showActions={true}
          allowEdit={true}
          allowView={true}
          renderLink={(row: any) => (
            <Link href={renderUrl(`/websites/${row.id}`, false)}>{row.name}</Link>
          )}
        />
      )}
    </DataGrid>
  );
}

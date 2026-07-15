import { useApi } from '../useApi';
import { useModified } from '../useModified';

export function useTenantUsageQuery(tenantId: string) {
  const { get, useQuery } = useApi();
  const { modified } = useModified(`tenant-usage:${tenantId}`);

  return useQuery({
    queryKey: ['tenant-usage', tenantId, { modified }],
    queryFn: () => get(`/tenants/${tenantId}/usage`),
    enabled: !!tenantId,
  });
}

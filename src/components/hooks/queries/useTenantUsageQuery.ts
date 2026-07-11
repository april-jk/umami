import { useApi } from '../useApi';

export function useTenantUsageQuery(tenantId: string) {
  const { get, useQuery } = useApi();

  return useQuery({
    queryKey: ['tenant-usage', tenantId],
    queryFn: () => get(`/tenants/${tenantId}/usage`),
    enabled: !!tenantId,
  });
}

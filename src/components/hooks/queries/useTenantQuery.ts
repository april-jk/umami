import { useApi } from '../useApi';
import { useModified } from '../useModified';

export function useTenantQuery(tenantId: string) {
  const { get, useQuery } = useApi();
  const { modified } = useModified(`tenant:${tenantId}`);

  return useQuery({
    queryKey: ['tenants', tenantId, { modified }],
    queryFn: () => get(`/tenants/${tenantId}`),
    enabled: !!tenantId,
  });
}

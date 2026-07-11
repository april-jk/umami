import { useApi } from '../useApi';
import { useModified } from '../useModified';

export function useUpdateTenantPlanQuery(tenantId: string) {
  const { post, useMutation } = useApi();
  const { touch } = useModified(`tenant:${tenantId}`);

  return useMutation({
    mutationFn: (data: { plan: string }) => post(`/tenants/${tenantId}`, data),
    onSuccess: () => touch(`tenant:${tenantId}`),
  });
}

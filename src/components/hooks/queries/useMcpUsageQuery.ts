import { useApi } from '../useApi';
import { usePagedQuery } from '../usePagedQuery';

export type McpUsageRecord = {
  id: string;
  apiKeyName: string;
  operation: string;
  operationKey?: string;
  route: string;
  method: string;
  createdAt: string;
};

export function useMcpUsageQuery(userId?: string) {
  const { get } = useApi();
  const route = userId ? `/admin/users/${userId}/mcp-usage` : '/me/mcp-usage';

  return usePagedQuery<McpUsageRecord[]>({
    queryKey: ['mcp-usage', userId ?? 'me'],
    queryFn: pageParams => get(route, pageParams),
  });
}

import { useApi } from '../useApi';
import { usePagedQuery } from '../usePagedQuery';

export type McpUsageRecord = {
  id: string;
  apiKeyName: string;
  operation: string;
  route: string;
  method: string;
  createdAt: string;
};

export function useMcpUsageQuery() {
  const { get } = useApi();

  return usePagedQuery<McpUsageRecord[]>({
    queryKey: ['mcp-usage'],
    queryFn: pageParams => get('/me/mcp-usage', pageParams),
  });
}

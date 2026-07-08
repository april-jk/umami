import { useApi } from '../useApi';
import { useModified } from '../useModified';

export function useApiKeysQuery() {
  const { get, useQuery } = useApi();
  const { modified } = useModified('api-keys');

  return useQuery({
    queryKey: ['api-keys', { modified }],
    queryFn: () => get('/me/api-keys'),
  });
}

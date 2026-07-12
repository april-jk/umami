import { useToast } from '@umami/react-zen';
import type { ApiError } from '@/lib/types';
import { isPlanLimitError, useApi } from '../useApi';
import { useModified } from '../useModified';

export function useUpdateQuery(path: string, params?: Record<string, any>) {
  const { post, useMutation } = useApi();
  const query = useMutation<any, ApiError, Record<string, any>>({
    mutationFn: (data: Record<string, any>) => post(path, { ...data, ...params }),
  });
  const { touch } = useModified();
  const { toast } = useToast();
  const mutateAsync = async (...args: Parameters<typeof query.mutateAsync>) => {
    try {
      return await query.mutateAsync(...args);
    } catch (error) {
      if (!isPlanLimitError(error as ApiError)) {
        throw error;
      }
    }
  };

  return {
    ...query,
    mutateAsync,
    error: isPlanLimitError(query.error) ? null : query.error,
    touch,
    toast,
  };
}

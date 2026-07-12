import { useApi } from '../useApi';
import { useModified } from '../useModified';

export function useAdminUserMembershipQuery(userId: string) {
  const { get, useQuery } = useApi();
  const { modified } = useModified(`admin-user-membership:${userId}`);

  return useQuery({
    queryKey: ['admin-user-membership', userId, { modified }],
    queryFn: () => get(`/admin/users/${userId}/membership`),
    enabled: !!userId,
  });
}

export function useUpdateAdminUserMembershipQuery(userId: string) {
  const { post, useMutation } = useApi();
  const { touch } = useModified();

  return useMutation({
    mutationFn: (data: Record<string, unknown>) => post(`/admin/users/${userId}/membership`, data),
    onSuccess: () => {
      touch(`admin-user-membership:${userId}`);
      touch(`user:${userId}`);
    },
  });
}

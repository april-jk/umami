import type { MembershipConfig } from '@/lib/membership-config';
import { useApi } from '../useApi';
import { useModified } from '../useModified';

type MembershipConfigResponse = {
  config: MembershipConfig;
  version: number;
  updatedAt: string | null;
  updatedBy?: string | null;
  source?: 'default' | 'database';
};

export function useMembershipConfigQuery() {
  const { get, useQuery } = useApi();
  const { modified } = useModified('membership-config');

  return useQuery<MembershipConfigResponse>({
    queryKey: ['membership-config', { modified }],
    queryFn: () => get('/membership/config'),
  });
}

export function useAdminMembershipConfigQuery() {
  const { get, useQuery } = useApi();
  const { modified } = useModified('membership-config');

  return useQuery<MembershipConfigResponse>({
    queryKey: ['admin-membership-config', { modified }],
    queryFn: () => get('/admin/membership/config'),
  });
}

export function useUpdateMembershipConfigQuery() {
  const { post, useMutation } = useApi();
  const { touch } = useModified();

  return useMutation({
    mutationFn: ({ config, version }: { config: MembershipConfig; version: number }) =>
      post('/admin/membership/config', { config, version }),
    onSuccess: () => touch('membership-config'),
  });
}

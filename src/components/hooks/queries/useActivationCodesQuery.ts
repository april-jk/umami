import type { ActivationCodePlan } from '@/queries/prisma/activation-code';
import { useApi } from '../useApi';
import { useModified } from '../useModified';
import { usePagedQuery } from '../usePagedQuery';

export type ActivationCodeRecord = {
  id: string;
  codePrefix: string;
  name: string | null;
  note: string | null;
  plan: ActivationCodePlan;
  durationDays: number;
  startsAt: string;
  expiresAt: string | null;
  maxRedemptions: number;
  redemptionCount: number;
  status: 'active' | 'disabled';
  isActive: boolean;
  createdAt: string;
  _count: { redemptions: number };
};

export function useActivationCodesQuery() {
  const { get } = useApi();
  const { modified } = useModified('activation-codes');

  return usePagedQuery<ActivationCodeRecord[]>({
    queryKey: ['activation-codes:admin', { modified }],
    queryFn: pageParams => get('/admin/activation-codes', pageParams),
  });
}

export function useActivationCodeQuery(id?: string) {
  const { get, useQuery } = useApi();
  const { modified } = useModified(`activation-code:${id}`);

  return useQuery({
    queryKey: ['activation-code:admin', id, { modified }],
    queryFn: () => get(`/admin/activation-codes/${id}`),
    enabled: Boolean(id),
  });
}

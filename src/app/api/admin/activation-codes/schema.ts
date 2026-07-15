import { z } from 'zod';
import { ACTIVATION_CODE_PLANS, ACTIVATION_CODE_STATUS } from '@/queries/prisma/activation-code';

export const activationCodeSchema = z.object({
  code: z.string().trim().min(8).max(128).optional(),
  name: z.string().trim().max(120).nullable().optional(),
  note: z.string().trim().max(500).nullable().optional(),
  plan: z.enum(ACTIVATION_CODE_PLANS),
  durationDays: z.coerce.number().int().min(1).max(3650),
  startsAt: z.coerce.date().optional(),
  expiresAt: z.coerce.date().nullable().optional(),
  maxRedemptions: z.coerce.number().int().min(1).max(1_000_000),
  status: z.enum([ACTIVATION_CODE_STATUS.active, ACTIVATION_CODE_STATUS.disabled]).optional(),
});

import { z } from 'zod';
import { applyRetentionSweep } from '@/jobs/apply-retention';
import { MEMBERSHIP_PLAN_IDS, membershipConfigSchema } from '@/lib/membership-config';
import { parseRequest } from '@/lib/request';
import { json, unauthorized } from '@/lib/response';
import {
  getMembershipConfigRecord,
  MembershipConfigConflictError,
  updateMembershipConfig,
} from '@/queries/prisma/membership-config';

const updateSchema = z.object({
  config: membershipConfigSchema,
  version: z.number().int().nonnegative(),
});

export async function GET(request: Request) {
  const { auth, error } = await parseRequest(request);
  if (error) return error();
  if (!auth.user.isAdmin) return unauthorized({ message: 'Only admins can manage memberships.' });

  return json(await getMembershipConfigRecord());
}

export async function POST(request: Request) {
  const { auth, body, error } = await parseRequest(request, updateSchema);
  if (error) return error();
  if (!auth.user.isAdmin) return unauthorized({ message: 'Only admins can manage memberships.' });

  try {
    const current = await getMembershipConfigRecord({ fresh: true });
    const retentionChanged = MEMBERSHIP_PLAN_IDS.some(
      plan =>
        current.config.plans[plan].limits.retentionDays !==
        body.config.plans[plan].limits.retentionDays,
    );
    const result = await updateMembershipConfig(body.config, auth.user.id, body.version);
    if (retentionChanged) await applyRetentionSweep();
    return json(result);
  } catch (error) {
    if (error instanceof MembershipConfigConflictError) {
      return Response.json(
        {
          error: {
            message: 'Membership configuration changed. Refresh and try again.',
            code: 'membership-config-conflict',
            status: 409,
          },
        },
        { status: 409 },
      );
    }
    throw error;
  }
}

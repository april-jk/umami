import { z } from 'zod';
import { ROLES } from '@/lib/constants';
import { parseRequest } from '@/lib/request';
import { badRequest, forbidden, json, notFound } from '@/lib/response';
import {
  getLimitErrorPayload,
  getTenantPlanLimits,
  isTenantPlanEnforcementEnabled,
} from '@/lib/tenant-plan';
import { createTeamUser, findTeam, getTeamUser } from '@/queries/prisma';
import {
  canAddTeamMember,
  getTenantIdForTeam,
  getTenantPlan,
  getTotalTenantMemberCount,
} from '@/queries/prisma/tenant';

export async function POST(request: Request) {
  const schema = z.object({
    accessCode: z.string().max(50),
  });

  const { auth, body, error } = await parseRequest(request, schema);

  if (error) {
    return error();
  }

  const { accessCode } = body;

  const team = await findTeam({
    where: {
      accessCode,
    },
  });

  if (!team) {
    return notFound({ message: 'Team not found.', code: 'team-not-found' });
  }

  const teamUser = await getTeamUser(team.id, auth.user.id);

  if (teamUser) {
    return badRequest({ message: 'User is already a team member.' });
  }

  if (isTenantPlanEnforcementEnabled() && !(await canAddTeamMember(team.id))) {
    const tenantId = await getTenantIdForTeam(team.id);
    const tenant = tenantId ? await getTenantPlan(tenantId) : null;
    const current = tenantId ? await getTotalTenantMemberCount(tenantId) : 0;
    const limit = getTenantPlanLimits(tenant?.plan).memberLimit;

    return forbidden(getLimitErrorPayload(tenant?.plan, 'member', current, limit));
  }

  const user = await createTeamUser(auth.user.id, team.id, ROLES.teamMember);

  return json(user);
}

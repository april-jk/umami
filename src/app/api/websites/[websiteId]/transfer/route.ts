import { z } from 'zod';
import { parseRequest } from '@/lib/request';
import { badRequest, forbidden, json, unauthorized } from '@/lib/response';
import {
  getLimitErrorPayload,
  getTenantEffectiveLimits,
  isTenantPlanEnforcementEnabled,
} from '@/lib/tenant-plan';
import { canTransferWebsiteToTeam, canTransferWebsiteToUser } from '@/permissions';
import { getWebsite, updateWebsite } from '@/queries/prisma';
import { getMembershipConfig } from '@/queries/prisma/membership-config';
import {
  canCreateTenantWebsite,
  getDefaultTenantIdForUser,
  getTenantIdForTeam,
  getTenantPlan,
  getTenantWebsiteCount,
} from '@/queries/prisma/tenant';

async function getTransferLimitError(sourceTenantId: string | null, targetTenantId: string | null) {
  if (
    !isTenantPlanEnforcementEnabled() ||
    !targetTenantId ||
    sourceTenantId === targetTenantId ||
    (await canCreateTenantWebsite(targetTenantId))
  ) {
    return null;
  }

  const tenant = await getTenantPlan(targetTenantId);
  const current = await getTenantWebsiteCount(targetTenantId);
  const config = await getMembershipConfig();
  const limit = getTenantEffectiveLimits(tenant?.plan, tenant?.metadata, config).websiteLimit;

  return getLimitErrorPayload(tenant?.plan, 'website', current, limit, config);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ websiteId: string }> },
) {
  const schema = z.object({
    userId: z.uuid().optional(),
    teamId: z.uuid().optional(),
  });

  const { auth, body, error } = await parseRequest(request, schema);

  if (error) {
    return error();
  }

  const { websiteId } = await params;
  const { userId, teamId } = body;

  if (userId) {
    if (!(await canTransferWebsiteToUser(auth, websiteId, userId))) {
      return unauthorized();
    }

    const [source, targetTenantId] = await Promise.all([
      getWebsite(websiteId),
      getDefaultTenantIdForUser(userId),
    ]);
    const limitError = await getTransferLimitError(source?.tenantId ?? null, targetTenantId);

    if (limitError) {
      return forbidden(limitError);
    }

    const website = await updateWebsite(websiteId, {
      userId,
      teamId: null,
      tenantId: targetTenantId,
    });

    return json(website);
  } else if (teamId) {
    if (!(await canTransferWebsiteToTeam(auth, websiteId, teamId))) {
      return unauthorized();
    }

    const [source, targetTenantId] = await Promise.all([
      getWebsite(websiteId),
      getTenantIdForTeam(teamId),
    ]);
    const limitError = await getTransferLimitError(source?.tenantId ?? null, targetTenantId);

    if (limitError) {
      return forbidden(limitError);
    }

    const website = await updateWebsite(websiteId, {
      userId: null,
      teamId,
      tenantId: targetTenantId,
    });

    return json(website);
  }

  return badRequest();
}

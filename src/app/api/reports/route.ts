import { z } from 'zod';
import { uuid } from '@/lib/crypto';
import { parseRequest } from '@/lib/request';
import { forbidden, json, unauthorized } from '@/lib/response';
import { pagingParams, reportSchema, reportTypeParam } from '@/lib/schema';
import { getEntitlementErrorPayload, getTenantPlanEntitlements } from '@/lib/tenant-entitlements';
import type { ShareSection } from '@/permissions';
import {
  canUpdateWebsite,
  canViewAuthenticatedWebsite,
  canViewWebsiteSection,
} from '@/permissions';
import { createReport, getReports } from '@/queries/prisma';
import { getTenantGoalCount, getWebsiteEntitlement } from '@/queries/prisma/tenant-entitlement';

function getReportSection(type?: z.infer<typeof reportTypeParam>): ShareSection | null {
  switch (type) {
    case 'attribution':
    case 'breakdown':
    case 'performance':
    case 'retention':
    case 'revenue':
    case 'utm':
      return type;
    case 'funnel':
      return 'funnels';
    case 'goal':
      return 'goals';
    case 'journey':
      return 'journeys';
    default:
      return null;
  }
}

export async function GET(request: Request) {
  const schema = z.object({
    websiteId: z.uuid(),
    type: reportTypeParam.optional(),
    ...pagingParams,
  });

  const { auth, query, error } = await parseRequest(request, schema);

  if (error) {
    return error();
  }

  const { page, search, pageSize, websiteId, type } = query;
  const filters = {
    page,
    pageSize,
    search,
  };

  const section = getReportSection(type);
  const canView = section
    ? await canViewWebsiteSection(auth, websiteId, section)
    : await canViewAuthenticatedWebsite(auth, websiteId);

  if (!canView) {
    return unauthorized();
  }

  const data = await getReports(
    {
      where: {
        websiteId,
        type,
        website: {
          deletedAt: null,
        },
      },
    },
    filters,
  );

  return json(data);
}

export async function POST(request: Request) {
  const { auth, body, error } = await parseRequest(request, reportSchema);

  if (error) {
    return error();
  }

  const { websiteId, type, name, description, parameters } = body;

  if (!(await canUpdateWebsite(auth, websiteId))) {
    return unauthorized();
  }

  if (process.env.CLOUD_MODE && type === 'goal') {
    const entitlement = await getWebsiteEntitlement(websiteId, 'goalLimit');
    const limit = getTenantPlanEntitlements(entitlement.plan).goalLimit;
    const current = entitlement.tenantId ? await getTenantGoalCount(entitlement.tenantId) : 0;

    if (!entitlement.allowed || (limit !== null && current >= limit)) {
      return forbidden(getEntitlementErrorPayload(entitlement.plan, 'goalLimit', current, limit));
    }
  }

  const result = await createReport({
    id: uuid(),
    userId: auth.user.id,
    websiteId,
    type,
    name,
    description: description || '',
    parameters,
  });

  return json(result);
}

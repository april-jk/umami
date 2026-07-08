import { z } from 'zod';
import { uuid } from '@/lib/crypto';
import { getQueryFilters, parseRequest } from '@/lib/request';
import { json, unauthorized } from '@/lib/response';
import { pagingParams, searchParams, sortingParams } from '@/lib/schema';
import { canCreateTeamWebsite, canCreateWebsite } from '@/permissions';
import { createLink, getAllUserLinksIncludingTeamAccess, getUserLinks } from '@/queries/prisma';
import { getDefaultTenantIdForUser, getTenantIdForTeam } from '@/queries/prisma/tenant';

export async function GET(request: Request) {
  const schema = z.object({
    ...pagingParams,
    ...searchParams,
    ...sortingParams,
    includeTeams: z.string().optional(),
  });

  const { auth, query, error } = await parseRequest(request, schema);

  if (error) {
    return error();
  }

  const filters = await getQueryFilters(query);

  const links = query.includeTeams
    ? await getAllUserLinksIncludingTeamAccess(auth.user.id, filters)
    : await getUserLinks(auth.user.id, filters);

  return json(links);
}

export async function POST(request: Request) {
  const schema = z.object({
    name: z.string().max(100),
    url: z.string().max(500),
    slug: z.string().max(100),
    teamId: z.string().nullable().optional(),
    id: z.uuid().nullable().optional(),
  });

  const { auth, body, error } = await parseRequest(request, schema);

  if (error) {
    return error();
  }

  const { id, name, url, slug, teamId } = body;

  if ((teamId && !(await canCreateTeamWebsite(auth, teamId))) || !(await canCreateWebsite(auth))) {
    return unauthorized();
  }

  const data: any = {
    id: id ?? uuid(),
    name,
    url,
    slug,
    teamId,
  };

  if (!teamId) {
    data.userId = auth.user.id;
  }

  const tenantId = teamId
    ? await getTenantIdForTeam(teamId)
    : await getDefaultTenantIdForUser(auth.user.id);

  if (tenantId) {
    data.tenantId = tenantId;
  }

  const result = await createLink(data);

  return json(result);
}

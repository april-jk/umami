import { z } from 'zod';
import { getQueryFilters, parseRequest } from '@/lib/request';
import { json, unauthorized } from '@/lib/response';
import { pagingParams, searchParams, sortingParams, tenantTypeParam } from '@/lib/schema';
import { canCreateTenant } from '@/permissions/tenant';
import { createTenant, getUserTenants } from '@/queries/prisma/tenant';

function getTenantSlug(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

export async function GET(request: Request) {
  const schema = z.object({
    ...pagingParams,
    ...searchParams,
    ...sortingParams,
  });

  const { auth, query, error } = await parseRequest(request, schema);

  if (error) {
    return error();
  }

  const filters = await getQueryFilters(query);

  return json(await getUserTenants(auth.user.id, filters));
}

export async function POST(request: Request) {
  const schema = z.object({
    name: z.string().min(1).max(100),
    slug: z.string().min(1).max(100).optional(),
    type: tenantTypeParam.optional(),
  });

  const { auth, body, error } = await parseRequest(request, schema);

  if (error) {
    return error();
  }

  if (!(await canCreateTenant(auth))) {
    return unauthorized();
  }

  const { name, type } = body;
  const slug = body.slug ?? getTenantSlug(name);

  const tenant = await createTenant(
    {
      name,
      slug,
      type,
    },
    auth.user.id,
  );

  return json(tenant);
}

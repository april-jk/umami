import { z } from 'zod';
import { parseRequest } from '@/lib/request';
import { json, notFound, unauthorized } from '@/lib/response';
import { tenantPlanParam, tenantStatusParam, tenantTypeParam } from '@/lib/schema';
import { canDeleteTenant, canUpdateTenant, canViewTenant } from '@/permissions/tenant';
import { deleteTenant, getTenant, updateTenant } from '@/queries/prisma/tenant';

export async function GET(request: Request, { params }: { params: Promise<{ tenantId: string }> }) {
  const { auth, error } = await parseRequest(request);

  if (error) {
    return error();
  }

  const { tenantId } = await params;

  if (!(await canViewTenant(auth, tenantId))) {
    return unauthorized({ message: 'You must be a member of this tenant.' });
  }

  const tenant = await getTenant(tenantId, {
    includeMembers: true,
    includeSubscription: true,
    includeUsage: true,
  });

  if (!tenant) {
    return notFound();
  }

  return json(tenant);
}

export async function POST(request: Request, { params }: { params: Promise<{ tenantId: string }> }) {
  const schema = z.object({
    name: z.string().min(1).max(100).optional(),
    slug: z.string().min(1).max(100).optional(),
    type: tenantTypeParam.optional(),
    plan: tenantPlanParam.optional(),
    status: tenantStatusParam.optional(),
    logoUrl: z.string().max(2183).nullable().optional(),
    metadata: z.record(z.string(), z.any()).nullable().optional(),
  });

  const { auth, body, error } = await parseRequest(request, schema);

  if (error) {
    return error();
  }

  const { tenantId } = await params;

  if (!(await canUpdateTenant(auth, tenantId))) {
    return unauthorized({ message: 'You must be an owner/admin of this tenant.' });
  }

  if ((body.plan || body.status) && !auth.user.isAdmin) {
    return unauthorized({ message: 'Only admins can update tenant plan or status.' });
  }

  const tenant = await getTenant(tenantId);

  if (!tenant) {
    return notFound();
  }

  const updated = await updateTenant(tenantId, body);

  return json(updated);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ tenantId: string }> },
) {
  const { auth, error } = await parseRequest(request);

  if (error) {
    return error();
  }

  const { tenantId } = await params;

  if (!(await canDeleteTenant(auth, tenantId))) {
    return unauthorized({ message: 'You must be an owner of this tenant.' });
  }

  const tenant = await getTenant(tenantId);

  if (!tenant) {
    return notFound();
  }

  await deleteTenant(tenantId);

  return json({ ok: true });
}

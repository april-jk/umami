import { parseRequest } from '@/lib/request';
import { json, unauthorized } from '@/lib/response';
import { canViewTenant } from '@/permissions/tenant';
import { getTenantUsage } from '@/queries/prisma/tenant';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ tenantId: string }> },
) {
  const { auth, error } = await parseRequest(request);

  if (error) {
    return error();
  }

  const { tenantId } = await params;

  if (!(await canViewTenant(auth, tenantId))) {
    return unauthorized({ message: 'You must be a member of this tenant.' });
  }

  const usage = await getTenantUsage(tenantId);

  return json(usage);
}

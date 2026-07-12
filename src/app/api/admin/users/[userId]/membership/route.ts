import { z } from 'zod';
import { parseRequest } from '@/lib/request';
import { json, notFound, unauthorized } from '@/lib/response';
import { tenantPlanParam, tenantStatusParam } from '@/lib/schema';
import { getTenantEffectiveLimits, getTenantQuotaOverrides } from '@/lib/tenant-plan';
import {
  getDefaultTenantIdForUser,
  getTenant,
  getTenantUsage,
  updateTenantAdminMembership,
} from '@/queries/prisma/tenant';
import { getUser } from '@/queries/prisma/user';

const quotaValue = z.union([z.number().int().nonnegative(), z.null(), z.literal('inherit')]);

const updateSchema = z.object({
  plan: tenantPlanParam.optional(),
  status: tenantStatusParam.optional(),
  quotaOverrides: z
    .object({
      eventLimit: quotaValue.optional(),
      websiteLimit: quotaValue.optional(),
      memberLimit: quotaValue.optional(),
    })
    .optional(),
});

function getMetadataRecord(metadata: unknown) {
  return metadata && typeof metadata === 'object' && !Array.isArray(metadata)
    ? { ...(metadata as Record<string, unknown>) }
    : {};
}

async function loadMembership(userId: string) {
  const user = await getUser(userId);
  if (!user) return null;

  const tenantId = user.tenantId ?? (await getDefaultTenantIdForUser(userId));
  if (!tenantId) return { user, tenant: null, usage: null };

  const [tenant, usage] = await Promise.all([
    getTenant(tenantId, { includeSubscription: true }),
    getTenantUsage(tenantId),
  ]);

  if (!tenant) return { user, tenant: null, usage: null };

  return {
    user,
    tenant: {
      ...tenant,
      quotaOverrides: getTenantQuotaOverrides(tenant.metadata),
      effectiveLimits: getTenantEffectiveLimits(tenant.plan, tenant.metadata),
    },
    usage,
  };
}

export async function GET(request: Request, { params }: { params: Promise<{ userId: string }> }) {
  const { auth, error } = await parseRequest(request);
  if (error) return error();
  if (!auth.user.isAdmin) return unauthorized({ message: 'Only admins can manage memberships.' });

  const { userId } = await params;
  const membership = await loadMembership(userId);
  return membership ? json(membership) : notFound({ message: 'User not found.' });
}

export async function POST(request: Request, { params }: { params: Promise<{ userId: string }> }) {
  const { auth, body, error } = await parseRequest(request, updateSchema);
  if (error) return error();
  if (!auth.user.isAdmin) return unauthorized({ message: 'Only admins can manage memberships.' });

  const { userId } = await params;
  const user = await getUser(userId);
  if (!user) return notFound({ message: 'User not found.' });

  const tenantId = user.tenantId ?? (await getDefaultTenantIdForUser(userId));
  if (!tenantId) return notFound({ message: 'User tenant not found.' });

  const tenant = await getTenant(tenantId, { includeSubscription: true });
  if (!tenant) return notFound({ message: 'User tenant not found.' });

  const metadata = getMetadataRecord(tenant.metadata);
  const quotaOverrides = { ...getTenantQuotaOverrides(tenant.metadata) };

  for (const [key, value] of Object.entries(body.quotaOverrides ?? {})) {
    if (value === 'inherit') {
      delete quotaOverrides[key];
    } else {
      quotaOverrides[key] = value;
    }
  }

  if (Object.keys(quotaOverrides).length > 0) {
    metadata.quotaOverrides = quotaOverrides;
  } else {
    delete metadata.quotaOverrides;
  }

  await updateTenantAdminMembership(tenantId, {
    plan: body.plan,
    status: body.status,
    metadata,
  });

  return json(await loadMembership(userId));
}

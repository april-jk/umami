import { Prisma, type Tenant } from '@/generated/prisma/client';
import { ROLES, TENANT_PLANS, TENANT_STATUS, TENANT_TYPES } from '@/lib/constants';
import { uuid } from '@/lib/crypto';
import prisma from '@/lib/prisma';
import { sanitizeSortFilters } from '@/lib/sort';
import type { PageResult, QueryFilters } from '@/lib/types';

import TenantFindManyArgs = Prisma.TenantFindManyArgs;

const TENANT_SORT_FIELDS = ['name', 'slug', 'plan', 'status', 'createdAt'] as const;

export async function findTenant(criteria: Prisma.TenantFindUniqueArgs): Promise<Tenant> {
  return prisma.client.tenant.findUnique(criteria);
}

export async function getTenant(
  tenantId: string,
  options: { includeMembers?: boolean; includeSubscription?: boolean; includeUsage?: boolean } = {},
): Promise<Tenant> {
  const { includeMembers, includeSubscription, includeUsage } = options;

  return findTenant({
    where: {
      id: tenantId,
    },
    include: {
      ...(includeMembers && {
        members: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                displayName: true,
                logoUrl: true,
              },
            },
          },
        },
      }),
      ...(includeSubscription && { subscription: true }),
      ...(includeUsage && {
        usage: {
          orderBy: { month: 'desc' },
          take: 12,
        },
      }),
    },
  });
}

export async function getTenants(
  criteria: TenantFindManyArgs,
  filters: QueryFilters = {},
): Promise<PageResult<Tenant[]>> {
  const sortFilters = sanitizeSortFilters(filters, TENANT_SORT_FIELDS, { orderBy: 'name' });
  const { search } = sortFilters;

  const where: Prisma.TenantWhereInput = {
    ...criteria.where,
    ...prisma.getSearchParameters(search, [{ name: 'contains' }, { slug: 'contains' }]),
  };

  return prisma.pagedQuery<TenantFindManyArgs>(
    'tenant',
    {
      ...criteria,
      where,
    },
    sortFilters,
  );
}

export async function getUserTenants(userId: string, filters: QueryFilters = {}) {
  return getTenants(
    {
      where: {
        deletedAt: null,
        members: {
          some: { userId },
        },
      },
      include: {
        subscription: true,
        _count: {
          select: {
            websites: {
              where: { deletedAt: null },
            },
            teams: {
              where: { deletedAt: null },
            },
            members: {
              where: {
                user: { deletedAt: null },
              },
            },
          },
        },
      },
    },
    filters,
  );
}

export async function getTenantUser(tenantId: string, userId: string) {
  return prisma.client.tenantUser.findFirst({
    where: {
      tenantId,
      userId,
    },
  });
}

export async function getDefaultTenantIdForUser(userId: string) {
  const user = await prisma.client.user.findUnique({
    where: {
      id: userId,
      deletedAt: null,
    },
    select: {
      tenantId: true,
      tenants: {
        where: {
          role: ROLES.tenantOwner,
          tenant: {
            deletedAt: null,
            type: TENANT_TYPES.personal,
          },
        },
        select: {
          tenantId: true,
        },
        take: 1,
      },
    },
  });

  return user?.tenantId ?? user?.tenants[0]?.tenantId ?? null;
}

export async function getTenantIdForTeam(teamId: string) {
  const team = await prisma.client.team.findUnique({
    where: {
      id: teamId,
      deletedAt: null,
    },
    select: {
      tenantId: true,
    },
  });

  return team?.tenantId ?? null;
}

export async function createTenant(
  data: Omit<Prisma.TenantUncheckedCreateInput, 'id' | 'plan' | 'status'> & {
    id?: string;
    plan?: string;
    status?: string;
  },
  ownerId: string,
) {
  const tenantId = data.id ?? uuid();

  return prisma.transaction(async tx => {
    const tenant = await tx.tenant.create({
      data: {
        ...data,
        id: tenantId,
        type: data.type ?? TENANT_TYPES.organization,
        plan: data.plan ?? TENANT_PLANS.free,
        status: data.status ?? TENANT_STATUS.active,
      },
    });

    await tx.tenantUser.create({
      data: {
        id: uuid(),
        tenantId,
        userId: ownerId,
        role: ROLES.tenantOwner,
      },
    });

    await tx.tenantSubscription.create({
      data: {
        id: uuid(),
        tenantId,
        plan: tenant.plan,
        status: TENANT_STATUS.active,
      },
    });

    return tenant;
  });
}

export async function updateTenant(tenantId: string, data: Prisma.TenantUpdateInput) {
  return prisma.client.tenant.update({
    where: {
      id: tenantId,
    },
    data: {
      ...data,
      updatedAt: new Date(),
    },
  });
}

export async function deleteTenant(tenantId: string) {
  return prisma.client.tenant.update({
    where: {
      id: tenantId,
    },
    data: {
      deletedAt: new Date(),
      status: TENANT_STATUS.deleted,
      updatedAt: new Date(),
    },
  });
}

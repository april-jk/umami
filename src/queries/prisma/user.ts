import { Prisma } from '@/generated/prisma/client';
import { ROLES, TENANT_PLANS, TENANT_STATUS, TENANT_TYPES } from '@/lib/constants';
import { uuid } from '@/lib/crypto';
import { getRandomChars } from '@/lib/generate';
import { hashPassword } from '@/lib/password';
import prisma from '@/lib/prisma';
import redis from '@/lib/redis';
import { sanitizeSortFilters } from '@/lib/sort';
import type { QueryFilters, Role } from '@/lib/types';
import { createOAuthAccount, getOAuthAccountUser } from './oauthAccount';

import UserFindManyArgs = Prisma.UserFindManyArgs;

const USER_SORT_FIELDS = ['username', 'role', 'createdAt'] as const;

export interface GetUserOptions {
  includePassword?: boolean;
  showDeleted?: boolean;
}

async function findUser(criteria: Prisma.UserFindUniqueArgs, options: GetUserOptions = {}) {
  const { includePassword = false, showDeleted = false } = options;

  return prisma.client.user.findUnique({
    ...criteria,
    where: {
      ...criteria.where,
      ...(showDeleted ? {} : { deletedAt: null }),
    },
    select: {
      id: true,
      username: true,
      password: includePassword,
      role: true,
      createdAt: true,
      tenantId: true,
    },
  });
}

export async function getUser(userId: string, options: GetUserOptions = {}) {
  return findUser(
    {
      where: {
        id: userId,
      },
    },
    options,
  );
}

export async function getUserByUsername(username: string, options: GetUserOptions = {}) {
  return findUser({ where: { username: username.toLowerCase() } }, options);
}

export async function getUsers(criteria: UserFindManyArgs, filters: QueryFilters = {}) {
  const sortFilters = sanitizeSortFilters(filters, USER_SORT_FIELDS, {
    orderBy: 'createdAt',
    sortDescending: true,
  });
  const { search } = sortFilters;

  const where: Prisma.UserWhereInput = {
    ...criteria.where,
    ...prisma.getSearchParameters(search, [{ username: 'contains' }]),
    deletedAt: null,
  };

  return prisma.pagedQuery(
    'user',
    {
      ...criteria,
      where,
    },
    sortFilters,
  );
}

export async function createUser(data: {
  id: string;
  username: string;
  password: string;
  role: Role;
}) {
  return prisma.client.user.create({
    data,
    select: {
      id: true,
      username: true,
      role: true,
    },
  });
}

function getTenantSlug(username: string) {
  const base = username
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 72);

  return `${base || 'user'}-${getRandomChars(8, '0123456789abcdefghijklmnopqrstuvwxyz')}`;
}

export async function createRegisteredUser(data: {
  id?: string;
  username: string;
  password: string;
}) {
  const userId = data.id ?? uuid();
  const username = data.username.toLowerCase();
  const tenantId = uuid();

  const [_, user] = await prisma.transaction([
    prisma.client.tenant.create({
      data: {
        id: tenantId,
        name: `${username}'s workspace`,
        slug: getTenantSlug(username),
        type: TENANT_TYPES.personal,
        plan: TENANT_PLANS.free,
        status: TENANT_STATUS.active,
      },
      select: {
        id: true,
      },
    }),

    prisma.client.user.create({
      data: {
        id: userId,
        tenantId,
        username,
        password: data.password,
        role: ROLES.user,
      },
      select: {
        id: true,
        username: true,
        password: true,
        role: true,
        createdAt: true,
      },
    }),

    prisma.client.tenantUser.create({
      data: {
        id: uuid(),
        tenantId,
        userId,
        role: ROLES.tenantOwner,
      },
    }),

    prisma.client.tenantSubscription.create({
      data: {
        id: uuid(),
        tenantId,
        plan: TENANT_PLANS.free,
        status: TENANT_STATUS.active,
      },
    }),
  ]);

  return user;
}

export async function getOrCreateOAuthUser(data: {
  provider: string;
  providerAccountId: string;
  email: string;
}) {
  const existingAccount = await getOAuthAccountUser(data.provider, data.providerAccountId);

  if (existingAccount) {
    return existingAccount;
  }

  // Never infer account ownership from a matching username. Local registration does
  // not prove control of an email-shaped username, so linking that account here
  // would let a newly verified OAuth identity take over its password login.
  // Existing users must link providers from an authenticated settings flow.
  try {
    const user = await createRegisteredUser({
      username: `oauth-${uuid()}`,
      // OAuth-only accounts cannot use password login unless a password-reset flow is added.
      password: hashPassword(uuid()),
    });
    const account = await createOAuthAccount({ ...data, userId: user.id });
    return account.user;
  } catch (error) {
    if ((error as any)?.code === 'P2002') {
      const concurrentAccount = await getOAuthAccountUser(data.provider, data.providerAccountId);
      if (concurrentAccount) {
        return concurrentAccount;
      }
    }

    throw error;
  }
}

export async function updateUser(userId: string, data: Prisma.UserUpdateInput) {
  return prisma.client.user.update({
    where: {
      id: userId,
    },
    data,
    select: {
      id: true,
      username: true,
      role: true,
      createdAt: true,
    },
  });
}

export async function deleteUser(userId: string) {
  const { client, transaction } = prisma;
  const cloudMode = !!process.env.CLOUD_MODE;

  const websites = await client.website.findMany({
    where: { userId },
  });

  let websiteIds = [];

  if (websites.length > 0) {
    websiteIds = websites.map(a => a.id);
  }

  const teams = await client.team.findMany({
    where: {
      members: {
        some: {
          userId,
          role: ROLES.teamOwner,
        },
      },
    },
  });

  const teamIds = teams.map(a => a.id);

  const ownedFilter = cloudMode ? { userId } : { OR: [{ userId }, { teamId: { in: teamIds } }] };

  const [links, pixels, boards] = await Promise.all([
    client.link.findMany({
      where: ownedFilter,
      select: { id: true, slug: true, deletedAt: true },
    }),
    client.pixel.findMany({
      where: ownedFilter,
      select: { id: true, slug: true, deletedAt: true },
    }),
    client.board.findMany({ where: ownedFilter, select: { id: true } }),
  ]);
  const entityIds = [...links.map(l => l.id), ...pixels.map(p => p.id), ...boards.map(b => b.id)];
  // Only invalidate Redis cache for slugs that are still live (not already soft-deleted).
  const linkSlugs = links.filter(l => !l.deletedAt).map(l => l.slug);
  const pixelSlugs = pixels.filter(p => !p.deletedAt).map(p => p.slug);

  const invalidateRedis = async () => {
    if (redis.enabled && (linkSlugs.length || pixelSlugs.length)) {
      await Promise.all([
        ...linkSlugs.map(slug => redis.client.del(`link:${slug}`)),
        ...pixelSlugs.map(slug => redis.client.del(`pixel:${slug}`)),
      ]);
    }
  };

  if (cloudMode) {
    return transaction([
      client.website.updateMany({
        data: {
          deletedAt: new Date(),
        },
        where: { id: { in: websiteIds } },
      }),
      client.user.update({
        data: {
          username: getRandomChars(32),
          deletedAt: new Date(),
        },
        where: {
          id: userId,
        },
      }),
      client.share.deleteMany({ where: { entityId: { in: entityIds } } }),
      // deletedAt: null avoids restamping rows that were already soft-deleted earlier.
      client.link.updateMany({
        data: { deletedAt: new Date() },
        where: { userId, deletedAt: null },
      }),
      client.pixel.updateMany({
        data: { deletedAt: new Date() },
        where: { userId, deletedAt: null },
      }),
      client.board.deleteMany({ where: { userId } }),
    ]).then(async result => {
      await invalidateRedis();
      return result;
    });
  }

  return transaction([
    client.eventData.deleteMany({
      where: { websiteId: { in: websiteIds } },
    }),
    client.sessionData.deleteMany({
      where: { websiteId: { in: websiteIds } },
    }),
    client.websiteEvent.deleteMany({
      where: { websiteId: { in: websiteIds } },
    }),
    client.session.deleteMany({
      where: { websiteId: { in: websiteIds } },
    }),
    client.teamUser.deleteMany({
      where: {
        OR: [
          {
            teamId: {
              in: teamIds,
            },
          },
          {
            userId,
          },
        ],
      },
    }),
    client.team.deleteMany({
      where: {
        id: {
          in: teamIds,
        },
      },
    }),
    client.report.deleteMany({
      where: {
        OR: [
          {
            websiteId: {
              in: websiteIds,
            },
          },
          {
            userId,
          },
        ],
      },
    }),
    client.share.deleteMany({ where: { entityId: { in: entityIds } } }),
    client.link.deleteMany({ where: ownedFilter }),
    client.pixel.deleteMany({ where: ownedFilter }),
    client.board.deleteMany({ where: ownedFilter }),
    client.website.deleteMany({
      where: { id: { in: websiteIds } },
    }),
    client.user.delete({
      where: {
        id: userId,
      },
    }),
  ]).then(async result => {
    await invalidateRedis();
    return result;
  });
}

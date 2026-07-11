import { beforeEach, describe, expect, test, vi } from 'vitest';
import { ROLES, TENANT_PLANS, TENANT_STATUS, TENANT_TYPES } from '@/lib/constants';
import { uuid } from '@/lib/crypto';
import {
  canAddTeamMember,
  canCreateTenantWebsite,
  createTenant,
  deleteTenant,
  getDefaultTenantIdForUser,
  getTenantIdForTeam,
  getTenantPlan,
  getTenantUsage,
  getTenantWebsiteCount,
  getTotalTenantMemberCount,
  reserveTenantEvent,
  reserveWebsiteEvent,
  updateTenant,
} from './tenant';

const { transactionMock, prismaMock } = vi.hoisted(() => ({
  transactionMock: vi.fn(),
  prismaMock: {
    client: {
      tenant: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      tenantUser: {
        findFirst: vi.fn(),
        create: vi.fn(),
      },
      user: {
        findUnique: vi.fn(),
      },
      team: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
      },
      teamUser: {
        count: vi.fn(),
      },
      website: {
        count: vi.fn(),
        findUnique: vi.fn(),
      },
      tenantUsageMonthly: {
        upsert: vi.fn(),
        findUnique: vi.fn(),
        updateMany: vi.fn(),
      },
      tenantSubscription: {
        create: vi.fn(),
      },
    },
  },
}));

vi.mock('@/lib/prisma', () => ({
  default: { ...prismaMock, transaction: transactionMock },
}));

vi.mock('@/lib/crypto', () => ({
  uuid: vi.fn().mockReturnValue('mock-uuid'),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('getTenantPlan', () => {
  test('returns tenant plan', async () => {
    prismaMock.client.tenant.findUnique.mockResolvedValue({ plan: 'pro' });

    const result = await getTenantPlan('tenant-1');

    expect(result).toEqual({ plan: 'pro' });
    expect(prismaMock.client.tenant.findUnique).toHaveBeenCalledWith({
      where: { id: 'tenant-1', deletedAt: null },
      select: { plan: true },
    });
  });
});

describe('getTenantWebsiteCount', () => {
  test('counts non-deleted websites for tenant', async () => {
    prismaMock.client.website.count.mockResolvedValue(5);

    const result = await getTenantWebsiteCount('tenant-1');

    expect(result).toBe(5);
    expect(prismaMock.client.website.count).toHaveBeenCalledWith({
      where: { tenantId: 'tenant-1', deletedAt: null },
    });
  });
});

describe('canCreateTenantWebsite', () => {
  test('allows creation when under limit', async () => {
    prismaMock.client.tenant.findUnique.mockResolvedValue({ plan: 'free' });
    prismaMock.client.website.count.mockResolvedValue(4);

    const result = await canCreateTenantWebsite('tenant-1');

    expect(result).toBe(true);
  });

  test('blocks creation when at limit', async () => {
    prismaMock.client.tenant.findUnique.mockResolvedValue({ plan: 'free' });
    prismaMock.client.website.count.mockResolvedValue(5);

    const result = await canCreateTenantWebsite('tenant-1');

    expect(result).toBe(false);
  });

  test('allows large but finite limits for team plan', async () => {
    prismaMock.client.tenant.findUnique.mockResolvedValue({ plan: 'team' });
    prismaMock.client.website.count.mockResolvedValue(49);

    const result = await canCreateTenantWebsite('tenant-1');

    expect(result).toBe(true);
  });

  test('defaults to free plan when tenant plan is null', async () => {
    prismaMock.client.tenant.findUnique.mockResolvedValue(null);
    prismaMock.client.website.count.mockResolvedValue(4);

    const result = await canCreateTenantWebsite('tenant-1');

    expect(result).toBe(true); // free limit is 5
  });
});

describe('canAddTeamMember', () => {
  test('allows when under member limit', async () => {
    prismaMock.client.team.findUnique.mockResolvedValue({ tenantId: 'tenant-1' });
    prismaMock.client.tenant.findUnique.mockResolvedValue({ plan: 'pro' });
    prismaMock.client.teamUser.count.mockResolvedValue(4);

    const result = await canAddTeamMember('team-1');

    expect(result).toBe(true);
  });

  test('blocks when at member limit', async () => {
    prismaMock.client.team.findUnique.mockResolvedValue({ tenantId: 'tenant-1' });
    prismaMock.client.tenant.findUnique.mockResolvedValue({ plan: 'pro' });
    prismaMock.client.teamUser.count.mockResolvedValue(5);

    const result = await canAddTeamMember('team-1');

    expect(result).toBe(false);
  });

  test('allows large but finite member limits for team plan', async () => {
    prismaMock.client.team.findUnique.mockResolvedValue({ tenantId: 'tenant-1' });
    prismaMock.client.tenant.findUnique.mockResolvedValue({ plan: 'team' });
    prismaMock.client.teamUser.count.mockResolvedValue(19);

    const result = await canAddTeamMember('team-1');

    expect(result).toBe(true);
  });

  test('allows when team has no tenant (non-cloud)', async () => {
    prismaMock.client.team.findUnique.mockResolvedValue({ tenantId: null });

    const result = await canAddTeamMember('team-1');

    expect(result).toBe(true);
    expect(prismaMock.client.tenant.findUnique).not.toHaveBeenCalled();
  });
});

describe('reserveTenantEvent', () => {
  test('allows event when under limit and returns usage info', async () => {
    prismaMock.client.tenant.findUnique.mockResolvedValue({ plan: 'free' });
    prismaMock.client.tenantUsageMonthly.upsert.mockResolvedValue({});
    prismaMock.client.tenantUsageMonthly.findUnique.mockResolvedValue({ eventCount: 50_000n });
    prismaMock.client.tenantUsageMonthly.updateMany.mockResolvedValue({ count: 1 });
    transactionMock.mockImplementation(async fn => fn(prismaMock.client));

    const result = await reserveTenantEvent('tenant-1');

    expect(result.allowed).toBe(true);
    expect(result.limit).toBe(100_000);
    expect(result.used).toBe(50_001);
    expect(result.remaining).toBe(49_999);
  });

  test('blocks event when at limit and returns usage info', async () => {
    prismaMock.client.tenant.findUnique.mockResolvedValue({ plan: 'free' });
    prismaMock.client.tenantUsageMonthly.upsert.mockResolvedValue({});
    prismaMock.client.tenantUsageMonthly.findUnique.mockResolvedValue({ eventCount: 100_000n });
    prismaMock.client.tenantUsageMonthly.updateMany.mockResolvedValue({ count: 0 });
    transactionMock.mockImplementation(async fn => fn(prismaMock.client));

    const result = await reserveTenantEvent('tenant-1');

    expect(result.allowed).toBe(false);
    expect(result.limit).toBe(100_000);
    expect(result.used).toBe(100_000);
    expect(result.remaining).toBe(0);
  });

  test('allows large but finite event limits for team plan', async () => {
    prismaMock.client.tenant.findUnique.mockResolvedValue({ plan: 'team' });
    prismaMock.client.tenantUsageMonthly.upsert.mockResolvedValue({});
    prismaMock.client.tenantUsageMonthly.findUnique.mockResolvedValue({ eventCount: 9_999_999n });
    prismaMock.client.tenantUsageMonthly.updateMany.mockResolvedValue({ count: 1 });
    transactionMock.mockImplementation(async fn => fn(prismaMock.client));

    const result = await reserveTenantEvent('tenant-1');

    expect(result.allowed).toBe(true);
    expect(result.limit).toBe(10_000_000);
    expect(result.used).toBe(10_000_000);
    expect(result.remaining).toBe(0);
  });

  test('handles first event of the month (no prior usage)', async () => {
    prismaMock.client.tenant.findUnique.mockResolvedValue({ plan: 'free' });
    prismaMock.client.tenantUsageMonthly.upsert.mockResolvedValue({});
    prismaMock.client.tenantUsageMonthly.findUnique.mockResolvedValue(null);
    prismaMock.client.tenantUsageMonthly.updateMany.mockResolvedValue({ count: 1 });
    transactionMock.mockImplementation(async fn => fn(prismaMock.client));

    const result = await reserveTenantEvent('tenant-1');

    expect(result.allowed).toBe(true);
    expect(result.used).toBe(1);
    expect(result.remaining).toBe(99_999);
  });

  test('defaults to free plan when tenant not found', async () => {
    prismaMock.client.tenant.findUnique.mockResolvedValue(null);
    prismaMock.client.tenantUsageMonthly.upsert.mockResolvedValue({});
    prismaMock.client.tenantUsageMonthly.findUnique.mockResolvedValue({ eventCount: 50_000n });
    prismaMock.client.tenantUsageMonthly.updateMany.mockResolvedValue({ count: 1 });
    transactionMock.mockImplementation(async fn => fn(prismaMock.client));

    const result = await reserveTenantEvent('tenant-1');

    expect(result.allowed).toBe(true);
    expect(result.limit).toBe(100_000);
  });
});

describe('reserveWebsiteEvent', () => {
  test('delegates to reserveTenantEvent with website tenant', async () => {
    prismaMock.client.website.findUnique.mockResolvedValue({ tenantId: 'tenant-1' });
    prismaMock.client.tenant.findUnique.mockResolvedValue({ plan: 'free' });
    prismaMock.client.tenantUsageMonthly.upsert.mockResolvedValue({});
    prismaMock.client.tenantUsageMonthly.findUnique.mockResolvedValue({ eventCount: 10n });
    prismaMock.client.tenantUsageMonthly.updateMany.mockResolvedValue({ count: 1 });
    transactionMock.mockImplementation(async fn => fn(prismaMock.client));

    const result = await reserveWebsiteEvent('website-1');

    expect(result.allowed).toBe(true);
    expect(prismaMock.client.website.findUnique).toHaveBeenCalledWith({
      where: { id: 'website-1' },
      select: { tenantId: true },
    });
  });

  test('allows event when website has no tenant', async () => {
    prismaMock.client.website.findUnique.mockResolvedValue({ tenantId: null });

    const result = await reserveWebsiteEvent('website-1');

    expect(result.allowed).toBe(true);
    expect(result.limit).toBeNull();
  });

  test('allows event when website not found', async () => {
    prismaMock.client.website.findUnique.mockResolvedValue(null);

    const result = await reserveWebsiteEvent('website-1');

    expect(result.allowed).toBe(true);
    expect(result.limit).toBeNull();
  });
});

describe('getTenantUsage', () => {
  test('returns usage stats for all dimensions', async () => {
    prismaMock.client.tenant.findUnique.mockResolvedValue({ plan: 'pro' });
    prismaMock.client.tenantUsageMonthly.findUnique.mockResolvedValue({
      eventCount: 1_000_000n,
      websiteCount: 10,
      memberCount: 3,
    });
    prismaMock.client.website.count.mockResolvedValue(15);
    prismaMock.client.team.findMany.mockResolvedValue([{ id: 'team-1' }, { id: 'team-2' }]);
    prismaMock.client.teamUser.count.mockResolvedValue(2);

    const result = await getTenantUsage('tenant-1', new Date('2026-07-11'));

    expect(result.plan).toBe('pro');
    expect(result.month).toBe('2026-07');
    expect(result.events).toEqual({ used: 1_000_000, limit: 2_000_000 });
    expect(result.websites).toEqual({ used: 15, limit: 25 });
    expect(result.members).toEqual({ used: 4, limit: 5 }); // 2 teams x 2 members = 4
  });

  test('returns zero usage when no usage record exists', async () => {
    prismaMock.client.tenant.findUnique.mockResolvedValue({ plan: 'free' });
    prismaMock.client.tenantUsageMonthly.findUnique.mockResolvedValue(null);
    prismaMock.client.website.count.mockResolvedValue(0);
    prismaMock.client.team.findMany.mockResolvedValue([]);

    const result = await getTenantUsage('tenant-1', new Date('2026-07-11'));

    expect(result.events).toEqual({ used: 0, limit: 100_000 });
    expect(result.websites).toEqual({ used: 0, limit: 5 });
    expect(result.members).toEqual({ used: 0, limit: 1 });
  });

  test('returns high limits for team plan (finite but large)', async () => {
    prismaMock.client.tenant.findUnique.mockResolvedValue({ plan: 'team' });
    prismaMock.client.tenantUsageMonthly.findUnique.mockResolvedValue({ eventCount: 5_000_000n });
    prismaMock.client.website.count.mockResolvedValue(30);
    prismaMock.client.team.findMany.mockResolvedValue([]);

    const result = await getTenantUsage('tenant-1');

    expect(result.events.limit).toBe(10_000_000);
    expect(result.websites.limit).toBe(50);
    expect(result.members.limit).toBe(20);
  });
});

describe('createTenant', () => {
  test('creates tenant with owner and subscription', async () => {
    const mockTenant = { id: 'tenant-1', plan: 'free', name: 'Test' };
    prismaMock.client.tenant.create.mockResolvedValue(mockTenant);
    prismaMock.client.tenantUser.create.mockResolvedValue({});
    prismaMock.client.tenantSubscription.create.mockResolvedValue({});
    transactionMock.mockImplementation(async fn => fn(prismaMock.client));

    const result = await createTenant({ name: 'Test', slug: 'test' }, 'user-1');

    expect(result).toEqual(mockTenant);
    expect(prismaMock.client.tenant.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: 'Test',
          slug: 'test',
          plan: TENANT_PLANS.free,
          status: TENANT_STATUS.active,
        }),
      }),
    );
  });
});

describe('updateTenant', () => {
  test('updates tenant with new data', async () => {
    prismaMock.client.tenant.update.mockResolvedValue({ id: 'tenant-1', name: 'Updated' });

    const result = await updateTenant('tenant-1', { name: 'Updated' });

    expect(result.name).toBe('Updated');
    expect(prismaMock.client.tenant.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'tenant-1' },
        data: expect.objectContaining({ name: 'Updated', updatedAt: expect.any(Date) }),
      }),
    );
  });
});

describe('deleteTenant', () => {
  test('soft deletes tenant', async () => {
    prismaMock.client.tenant.update.mockResolvedValue({ id: 'tenant-1', deletedAt: new Date() });

    const result = await deleteTenant('tenant-1');

    expect(prismaMock.client.tenant.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'tenant-1' },
        data: expect.objectContaining({ deletedAt: expect.any(Date), status: TENANT_STATUS.deleted }),
      }),
    );
  });
});

describe('getDefaultTenantIdForUser', () => {
  test('returns user tenantId when set', async () => {
    prismaMock.client.user.findUnique.mockResolvedValue({ tenantId: 'tenant-1', tenants: [] });

    const result = await getDefaultTenantIdForUser('user-1');

    expect(result).toBe('tenant-1');
  });

  test('returns first owned personal tenant when tenantId is null', async () => {
    prismaMock.client.user.findUnique.mockResolvedValue({
      tenantId: null,
      tenants: [{ tenantId: 'tenant-2' }],
    });

    const result = await getDefaultTenantIdForUser('user-1');

    expect(result).toBe('tenant-2');
  });

  test('returns null when user has no tenant', async () => {
    prismaMock.client.user.findUnique.mockResolvedValue(null);

    const result = await getDefaultTenantIdForUser('user-1');

    expect(result).toBeNull();
  });
});

describe('getTenantIdForTeam', () => {
  test('returns tenantId for team', async () => {
    prismaMock.client.team.findUnique.mockResolvedValue({ tenantId: 'tenant-1' });

    const result = await getTenantIdForTeam('team-1');

    expect(result).toBe('tenant-1');
  });

  test('returns null when team has no tenant', async () => {
    prismaMock.client.team.findUnique.mockResolvedValue({ tenantId: null });

    const result = await getTenantIdForTeam('team-1');

    expect(result).toBeNull();
  });
});

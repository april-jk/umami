import { beforeEach, describe, expect, test, vi } from 'vitest';
import { updateRetentionCutoffForTenant } from '@/jobs/apply-retention';
import { TENANT_PLANS, TENANT_STATUS, TENANT_TYPES } from '@/lib/constants';
import { createDefaultMembershipConfig } from '@/lib/membership-config';
import { TENANT_PLAN_LIMITS } from '@/lib/tenant-plan';
import { getMembershipConfig } from './membership-config';
import {
  canAddTeamMember,
  canCreateTenantWebsite,
  createTenant,
  deleteTenant,
  findTenant,
  getDefaultTenantIdForUser,
  getTenant,
  getTenantIdForTeam,
  getTenantPlan,
  getTenantSubscription,
  getTenants,
  getTenantUsage,
  getTenantUser,
  getTenantWebsiteCount,
  getTotalTenantMemberCount,
  getUserTenants,
  reserveTenantEvent,
  reserveWebsiteEvent,
  updateTenant,
  updateTenantAdminMembership,
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
        findUnique: vi.fn(),
        update: vi.fn(),
        upsert: vi.fn(),
      },
      activationCodeRedemption: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
      },
    },
    getSearchParameters: vi.fn(),
    pagedQuery: vi.fn(),
  },
}));

vi.mock('@/lib/prisma', () => ({
  default: { ...prismaMock, transaction: transactionMock },
}));

vi.mock('@/lib/crypto', () => ({
  uuid: vi.fn().mockReturnValue('mock-uuid'),
}));

vi.mock('@/jobs/apply-retention', () => ({
  updateRetentionCutoffForTenant: vi.fn(),
}));
vi.mock('./membership-config', () => ({ getMembershipConfig: vi.fn() }));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getMembershipConfig).mockResolvedValue(createDefaultMembershipConfig());
  prismaMock.client.tenantSubscription.findUnique.mockResolvedValue(null);
  prismaMock.client.activationCodeRedemption.findMany.mockResolvedValue([]);
});

describe('tenant queries', () => {
  test('finds a tenant with the supplied criteria', async () => {
    prismaMock.client.tenant.findUnique.mockResolvedValue({ id: 'tenant-1' });

    const result = await findTenant({ where: { id: 'tenant-1' } });

    expect(result).toEqual({ id: 'tenant-1' });
  });

  test('loads optional tenant relations', async () => {
    prismaMock.client.tenant.findUnique.mockResolvedValue({ id: 'tenant-1' });

    await getTenant('tenant-1', {
      includeMembers: true,
      includeSubscription: true,
      includeUsage: true,
    });

    expect(prismaMock.client.tenant.findUnique).toHaveBeenCalledWith({
      where: { id: 'tenant-1' },
      include: {
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
        subscription: true,
        usage: { orderBy: { month: 'desc' }, take: 12 },
      },
    });
  });

  test('paginates tenants with sanitized search filters', async () => {
    prismaMock.getSearchParameters.mockReturnValue({ OR: [{ name: { contains: 'acme' } }] });
    prismaMock.pagedQuery.mockResolvedValue({ data: [], count: 0 });

    const result = await getTenants({ where: { deletedAt: null } }, { search: 'acme' });

    expect(result).toEqual({ data: [], count: 0 });
    expect(prismaMock.pagedQuery).toHaveBeenCalledWith(
      'tenant',
      expect.objectContaining({
        where: { deletedAt: null, OR: [{ name: { contains: 'acme' } }] },
      }),
      expect.objectContaining({ search: 'acme' }),
    );
  });

  test('loads tenants available to a user', async () => {
    prismaMock.getSearchParameters.mockReturnValue({});
    prismaMock.pagedQuery.mockResolvedValue({ data: [], count: 0 });

    await getUserTenants('user-1');

    expect(prismaMock.pagedQuery).toHaveBeenCalledWith(
      'tenant',
      expect.objectContaining({
        where: expect.objectContaining({
          deletedAt: null,
          members: { some: { userId: 'user-1' } },
        }),
      }),
      expect.any(Object),
    );
  });

  test('finds a tenant user membership', async () => {
    prismaMock.client.tenantUser.findFirst.mockResolvedValue({ id: 'membership-1' });

    const result = await getTenantUser('tenant-1', 'user-1');

    expect(result).toEqual({ id: 'membership-1' });
    expect(prismaMock.client.tenantUser.findFirst).toHaveBeenCalledWith({
      where: { tenantId: 'tenant-1', userId: 'user-1' },
    });
  });

  test('loads a tenant subscription', async () => {
    prismaMock.client.tenantSubscription.findUnique.mockResolvedValue({ plan: 'pro' });

    const result = await getTenantSubscription('tenant-1');

    expect(result).toEqual({ plan: 'pro' });
  });
});

describe('getTenantPlan', () => {
  test('returns tenant plan', async () => {
    prismaMock.client.tenant.findUnique.mockResolvedValue({ plan: 'pro' });

    const result = await getTenantPlan('tenant-1');

    expect(result).toEqual({ plan: 'pro' });
    expect(prismaMock.client.tenant.findUnique).toHaveBeenCalledWith({
      where: { id: 'tenant-1', deletedAt: null },
      select: { plan: true, metadata: true },
    });
  });

  test('downgrades an expired cancelled PayPal subscription to free', async () => {
    prismaMock.client.tenant.findUnique.mockResolvedValue({ plan: 'pro' });
    prismaMock.client.tenantSubscription.findUnique.mockResolvedValue({
      billingProvider: 'paypal',
      cancelAtPeriodEnd: true,
      currentPeriodEnd: new Date('2020-01-01T00:00:00.000Z'),
      plan: 'pro',
    });
    transactionMock.mockImplementation(async fn => fn(prismaMock.client));

    const result = await getTenantPlan('tenant-1');

    expect(result).toEqual({ plan: TENANT_PLANS.free });
    expect(prismaMock.client.tenant.update).toHaveBeenCalledWith({
      where: { id: 'tenant-1' },
      data: { plan: TENANT_PLANS.free },
    });
    expect(prismaMock.client.tenantSubscription.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenantId: 'tenant-1' },
        data: expect.objectContaining({ status: 'cancelled' }),
      }),
    );
  });

  test('downgrades an expired activation-code membership to free', async () => {
    prismaMock.client.tenant.findUnique.mockResolvedValue({
      plan: 'team',
      metadata: { source: 'test' },
    });
    prismaMock.client.tenantSubscription.findUnique.mockResolvedValue({
      billingProvider: 'activation_code',
      cancelAtPeriodEnd: false,
      currentPeriodEnd: new Date('2020-01-01T00:00:00.000Z'),
      plan: 'team',
    });
    transactionMock.mockImplementation(async fn => fn(prismaMock.client));

    const result = await getTenantPlan('tenant-1');

    expect(result).toEqual({ plan: TENANT_PLANS.free, metadata: { source: 'test' } });
    expect(prismaMock.client.tenantSubscription.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenantId: 'tenant-1' },
        data: expect.objectContaining({ status: 'expired' }),
      }),
    );
    expect(updateRetentionCutoffForTenant).toHaveBeenCalledWith('tenant-1', TENANT_PLANS.free);
  });

  test('keeps the highest active activation-code tier over a PayPal base plan', async () => {
    prismaMock.client.tenant.findUnique.mockResolvedValue({ plan: 'starter' });
    prismaMock.client.tenantSubscription.findUnique.mockResolvedValue({
      billingProvider: 'paypal',
      cancelAtPeriodEnd: false,
      currentPeriodEnd: new Date('2099-01-01'),
      plan: 'starter',
    });
    prismaMock.client.activationCodeRedemption.findMany.mockResolvedValue([{ plan: 'team' }]);
    transactionMock.mockImplementation(async fn => fn(prismaMock.client));

    const result = await getTenantPlan('tenant-1');

    expect(result).toEqual({ plan: 'team' });
    expect(prismaMock.client.tenant.update).toHaveBeenCalledWith({
      where: { id: 'tenant-1' },
      data: { plan: 'team' },
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

  test('blocks creation when usage is already above the limit', async () => {
    prismaMock.client.tenant.findUnique.mockResolvedValue({ plan: 'free' });
    prismaMock.client.website.count.mockResolvedValue(6);

    expect(await canCreateTenantWebsite('tenant-1')).toBe(false);
  });

  test('allows any website count for an unlimited plan', async () => {
    prismaMock.client.tenant.findUnique.mockResolvedValue({ plan: 'enterprise' });
    prismaMock.client.website.count.mockResolvedValue(Number.MAX_SAFE_INTEGER);

    expect(await canCreateTenantWebsite('tenant-1')).toBe(true);
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

  test('uses a custom website quota from tenant metadata', async () => {
    prismaMock.client.tenant.findUnique.mockResolvedValue({
      plan: 'free',
      metadata: { quotaOverrides: { websiteLimit: 2 } },
    });
    prismaMock.client.website.count.mockResolvedValue(2);

    expect(await canCreateTenantWebsite('tenant-1')).toBe(false);
  });

  test('enforces a website quota changed in global membership configuration', async () => {
    const config = createDefaultMembershipConfig();
    config.plans.free.limits.websiteLimit = 2;
    vi.mocked(getMembershipConfig).mockResolvedValue(config);
    prismaMock.client.tenant.findUnique.mockResolvedValue({ plan: 'free', metadata: null });
    prismaMock.client.website.count.mockResolvedValue(2);

    expect(await canCreateTenantWebsite('tenant-1')).toBe(false);
  });

  test('allows websites when the tenant override is unlimited', async () => {
    prismaMock.client.tenant.findUnique.mockResolvedValue({
      plan: 'free',
      metadata: { quotaOverrides: { websiteLimit: null } },
    });
    prismaMock.client.website.count.mockResolvedValue(1000);

    expect(await canCreateTenantWebsite('tenant-1')).toBe(true);
  });
});

describe('canAddTeamMember', () => {
  test('allows when under member limit', async () => {
    prismaMock.client.team.findUnique.mockResolvedValue({ tenantId: 'tenant-1' });
    prismaMock.client.tenant.findUnique.mockResolvedValue({ plan: 'pro' });
    prismaMock.client.team.findMany.mockResolvedValue([{ id: 'team-1' }, { id: 'team-2' }]);
    prismaMock.client.teamUser.count.mockResolvedValueOnce(2).mockResolvedValueOnce(2);

    const result = await canAddTeamMember('team-1');

    expect(result).toBe(true);
  });

  test('blocks when at member limit', async () => {
    prismaMock.client.team.findUnique.mockResolvedValue({ tenantId: 'tenant-1' });
    prismaMock.client.tenant.findUnique.mockResolvedValue({ plan: 'pro' });
    prismaMock.client.team.findMany.mockResolvedValue([{ id: 'team-1' }, { id: 'team-2' }]);
    prismaMock.client.teamUser.count.mockResolvedValueOnce(3).mockResolvedValueOnce(2);

    const result = await canAddTeamMember('team-1');

    expect(result).toBe(false);
  });

  test('blocks when member usage is already above the limit', async () => {
    prismaMock.client.team.findUnique.mockResolvedValue({ tenantId: 'tenant-1' });
    prismaMock.client.tenant.findUnique.mockResolvedValue({ plan: 'pro' });
    prismaMock.client.team.findMany.mockResolvedValue([{ id: 'team-1' }]);
    prismaMock.client.teamUser.count.mockResolvedValue(6);

    expect(await canAddTeamMember('team-1')).toBe(false);
  });

  test('allows any member count for an unlimited plan', async () => {
    prismaMock.client.team.findUnique.mockResolvedValue({ tenantId: 'tenant-1' });
    prismaMock.client.tenant.findUnique.mockResolvedValue({ plan: 'enterprise' });
    prismaMock.client.team.findMany.mockResolvedValue([{ id: 'team-1' }]);
    prismaMock.client.teamUser.count.mockResolvedValue(Number.MAX_SAFE_INTEGER);

    expect(await canAddTeamMember('team-1')).toBe(true);
  });

  test('allows large but finite member limits for team plan', async () => {
    prismaMock.client.team.findUnique.mockResolvedValue({ tenantId: 'tenant-1' });
    prismaMock.client.tenant.findUnique.mockResolvedValue({ plan: 'team' });
    prismaMock.client.team.findMany.mockResolvedValue([{ id: 'team-1' }]);
    prismaMock.client.teamUser.count.mockResolvedValue(19);

    const result = await canAddTeamMember('team-1');

    expect(result).toBe(true);
  });

  test('blocks additions when members across multiple teams exhaust the tenant limit', async () => {
    prismaMock.client.team.findUnique.mockResolvedValue({ tenantId: 'tenant-1' });
    prismaMock.client.tenant.findUnique.mockResolvedValue({ plan: 'pro' });
    prismaMock.client.team.findMany.mockResolvedValue([{ id: 'team-1' }, { id: 'team-2' }]);
    prismaMock.client.teamUser.count.mockResolvedValueOnce(3).mockResolvedValueOnce(2);

    const result = await canAddTeamMember('team-1');

    expect(result).toBe(false);
    expect(prismaMock.client.teamUser.count).toHaveBeenNthCalledWith(1, {
      where: { teamId: 'team-1', user: { deletedAt: null } },
    });
    expect(prismaMock.client.teamUser.count).toHaveBeenNthCalledWith(2, {
      where: { teamId: 'team-2', user: { deletedAt: null } },
    });
  });

  test('allows when team has no tenant (non-cloud)', async () => {
    prismaMock.client.team.findUnique.mockResolvedValue({ tenantId: null });

    const result = await canAddTeamMember('team-1');

    expect(result).toBe(true);
    expect(prismaMock.client.tenant.findUnique).not.toHaveBeenCalled();
  });

  test('enforces a custom tenant-wide member override', async () => {
    prismaMock.client.team.findUnique.mockResolvedValue({ tenantId: 'tenant-1' });
    prismaMock.client.tenant.findUnique.mockResolvedValue({
      plan: 'enterprise',
      metadata: { quotaOverrides: { memberLimit: 2 } },
    });
    prismaMock.client.team.findMany.mockResolvedValue([{ id: 'team-1' }]);
    prismaMock.client.teamUser.count.mockResolvedValue(2);

    expect(await canAddTeamMember('team-1')).toBe(false);
  });
});

describe('getTotalTenantMemberCount', () => {
  test('sums active members across every active team in the tenant', async () => {
    prismaMock.client.team.findMany.mockResolvedValue([{ id: 'team-1' }, { id: 'team-2' }]);
    prismaMock.client.teamUser.count.mockResolvedValueOnce(2).mockResolvedValueOnce(3);

    const result = await getTotalTenantMemberCount('tenant-1');

    expect(result).toBe(5);
    expect(prismaMock.client.team.findMany).toHaveBeenCalledWith({
      where: { tenantId: 'tenant-1', deletedAt: null },
      select: { id: true },
    });
  });
});

describe('reserveTenantEvent', () => {
  test('enforces the Enterprise 20M base event allowance', async () => {
    prismaMock.client.tenant.findUnique.mockResolvedValue({ plan: 'enterprise' });
    prismaMock.client.tenantUsageMonthly.upsert.mockResolvedValue({});
    prismaMock.client.tenantUsageMonthly.findUnique.mockResolvedValue({ eventCount: 19_999_999n });
    prismaMock.client.tenantUsageMonthly.updateMany.mockResolvedValue({ count: 1 });
    transactionMock.mockImplementation(async fn => fn(prismaMock.client));

    const result = await reserveTenantEvent('tenant-1');

    expect(result).toEqual({ allowed: true, limit: 20_000_000, used: 20_000_000, remaining: 0 });
  });

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

  test('continues blocking when stored usage is already above the limit', async () => {
    prismaMock.client.tenant.findUnique.mockResolvedValue({ plan: 'free' });
    prismaMock.client.tenantUsageMonthly.upsert.mockResolvedValue({});
    prismaMock.client.tenantUsageMonthly.findUnique.mockResolvedValue({ eventCount: 100_001n });
    prismaMock.client.tenantUsageMonthly.updateMany.mockResolvedValue({ count: 0 });
    transactionMock.mockImplementation(async fn => fn(prismaMock.client));

    const result = await reserveTenantEvent('tenant-1');

    expect(result).toEqual({ allowed: false, limit: 100_000, used: 100_001, remaining: 0 });
  });

  test('allows large but finite event limits for team plan', async () => {
    prismaMock.client.tenant.findUnique.mockResolvedValue({ plan: 'team' });
    prismaMock.client.tenantUsageMonthly.upsert.mockResolvedValue({});
    prismaMock.client.tenantUsageMonthly.findUnique.mockResolvedValue({ eventCount: 4_999_999n });
    prismaMock.client.tenantUsageMonthly.updateMany.mockResolvedValue({ count: 1 });
    transactionMock.mockImplementation(async fn => fn(prismaMock.client));

    const result = await reserveTenantEvent('tenant-1');

    expect(result.allowed).toBe(true);
    expect(result.limit).toBe(5_000_000);
    expect(result.used).toBe(5_000_000);
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

  test('enforces a custom event quota from tenant metadata', async () => {
    prismaMock.client.tenant.findUnique.mockResolvedValue({
      plan: 'enterprise',
      metadata: { quotaOverrides: { eventLimit: 3 } },
    });
    prismaMock.client.tenantUsageMonthly.upsert.mockResolvedValue({});
    prismaMock.client.tenantUsageMonthly.findUnique.mockResolvedValue({ eventCount: 3n });
    prismaMock.client.tenantUsageMonthly.updateMany.mockResolvedValue({ count: 0 });
    transactionMock.mockImplementation(async fn => fn(prismaMock.client));

    expect(await reserveTenantEvent('tenant-1')).toEqual({
      allowed: false,
      limit: 3,
      used: 3,
      remaining: 0,
    });
  });

  test('allows events when the tenant override is unlimited', async () => {
    prismaMock.client.tenant.findUnique.mockResolvedValue({
      plan: 'free',
      metadata: { quotaOverrides: { eventLimit: null } },
    });

    expect(await reserveTenantEvent('tenant-1')).toEqual({
      allowed: true,
      limit: null,
      used: null,
      remaining: null,
    });
    expect(transactionMock).not.toHaveBeenCalled();
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
    prismaMock.client.tenantSubscription.findUnique.mockResolvedValue({
      currentPeriodEnd: new Date('2026-08-01T00:00:00.000Z'),
    });
    prismaMock.client.tenantUsageMonthly.findUnique.mockResolvedValue({
      eventCount: 1_000_000n,
      websiteCount: 10,
      memberCount: 3,
    });
    prismaMock.client.website.count.mockResolvedValue(15);
    prismaMock.client.team.findMany.mockResolvedValue([{ id: 'team-1' }, { id: 'team-2' }]);
    prismaMock.client.teamUser.count.mockResolvedValue(2);

    const result = await getTenantUsage('tenant-1', new Date('2026-07-11'));

    expect((result as any).plan).toBe('pro');
    expect(result.month).toBe('2026-07');
    expect(result.membershipEndsAt).toBe('2026-08-01T00:00:00.000Z');
    expect(result.events).toEqual({ used: 1_000_000, limit: 1_000_000 });
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
    expect(result.membershipEndsAt).toBeNull();
  });

  test('uses an active activation-code expiry when a legacy subscription has no period end', async () => {
    const now = new Date('2026-07-11T00:00:00.000Z');
    prismaMock.client.tenant.findUnique.mockResolvedValue({ plan: 'pro' });
    prismaMock.client.tenantSubscription.findUnique.mockResolvedValue({ currentPeriodEnd: null });
    prismaMock.client.activationCodeRedemption.findFirst.mockResolvedValue({
      membershipEndsAt: new Date('2026-08-01T00:00:00.000Z'),
    });
    prismaMock.client.tenantUsageMonthly.findUnique.mockResolvedValue(null);
    prismaMock.client.website.count.mockResolvedValue(0);
    prismaMock.client.team.findMany.mockResolvedValue([]);

    const result = await getTenantUsage('tenant-1', now);

    expect(result.membershipEndsAt).toBe('2026-08-01T00:00:00.000Z');
    expect(prismaMock.client.activationCodeRedemption.findFirst).toHaveBeenCalledWith({
      where: { tenantId: 'tenant-1', membershipEndsAt: { gt: now } },
      orderBy: { membershipEndsAt: 'desc' },
      select: { membershipEndsAt: true },
    });
  });

  test('returns high limits for team plan (finite but large)', async () => {
    prismaMock.client.tenant.findUnique.mockResolvedValue({ plan: 'team' });
    prismaMock.client.tenantUsageMonthly.findUnique.mockResolvedValue({ eventCount: 5_000_000n });
    prismaMock.client.website.count.mockResolvedValue(30);
    prismaMock.client.team.findMany.mockResolvedValue([]);

    const result = await getTenantUsage('tenant-1');

    expect(result.events.limit).toBe(5_000_000);
    expect(result.websites.limit).toBe(50);
    expect(result.members.limit).toBe(20);
  });

  test('returns defaults, overrides, and effective quota values', async () => {
    prismaMock.client.tenant.findUnique.mockResolvedValue({
      plan: 'starter',
      metadata: { quotaOverrides: { eventLimit: 750_000, websiteLimit: null } },
    });
    prismaMock.client.tenantUsageMonthly.findUnique.mockResolvedValue({ eventCount: 400_000n });
    prismaMock.client.website.count.mockResolvedValue(12);
    prismaMock.client.team.findMany.mockResolvedValue([]);

    const result = await getTenantUsage('tenant-1', new Date('2026-07-11'));

    expect(result.defaults).toEqual(TENANT_PLAN_LIMITS.starter);
    expect(result.quotaOverrides).toEqual({ eventLimit: 750_000, websiteLimit: null });
    expect(result.events).toEqual({ used: 400_000, limit: 750_000 });
    expect(result.websites).toEqual({ used: 12, limit: null });
    expect(result.members).toEqual({ used: 0, limit: 1 });
  });
});

describe('createTenant', () => {
  test('creates tenant with owner and subscription', async () => {
    const mockTenant = { id: 'tenant-1', plan: 'free', name: 'Test' };
    prismaMock.client.tenant.create.mockResolvedValue(mockTenant);
    prismaMock.client.tenantUser.create.mockResolvedValue({});
    prismaMock.client.tenantSubscription.create.mockResolvedValue({});
    transactionMock.mockImplementation(async fn => fn(prismaMock.client));

    const result = await createTenant(
      { name: 'Test', slug: 'test', type: TENANT_TYPES.organization },
      'user-1',
    );

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

describe('updateTenantAdminMembership', () => {
  test('updates tenant, synchronizes subscription, and applies retention for a plan change', async () => {
    prismaMock.client.tenant.update.mockResolvedValue({
      id: 'tenant-1',
      plan: 'pro',
      status: 'active',
    });
    prismaMock.client.tenantSubscription.upsert.mockResolvedValue({});
    transactionMock.mockImplementation(async fn => fn(prismaMock.client));

    const result = await updateTenantAdminMembership('tenant-1', {
      plan: 'pro',
      status: 'suspended',
      metadata: { owner: 'kept', quotaOverrides: { websiteLimit: 12 } },
    });

    expect((result as any).plan).toBe('pro');
    expect(prismaMock.client.tenant.update).toHaveBeenCalledWith({
      where: { id: 'tenant-1' },
      data: expect.objectContaining({
        plan: 'pro',
        status: 'suspended',
        metadata: { owner: 'kept', quotaOverrides: { websiteLimit: 12 } },
        updatedAt: expect.any(Date),
      }),
    });
    expect(prismaMock.client.tenantSubscription.upsert).toHaveBeenCalledWith({
      where: { tenantId: 'tenant-1' },
      create: expect.objectContaining({
        tenantId: 'tenant-1',
        plan: 'pro',
        status: 'suspended',
      }),
      update: expect.objectContaining({
        plan: 'pro',
        status: 'suspended',
        updatedAt: expect.any(Date),
      }),
    });
    expect(updateRetentionCutoffForTenant).toHaveBeenCalledWith('tenant-1', 'pro');
  });

  test('updates metadata without touching subscription or retention', async () => {
    prismaMock.client.tenant.update.mockResolvedValue({
      id: 'tenant-1',
      plan: 'free',
      status: 'active',
    });
    transactionMock.mockImplementation(async fn => fn(prismaMock.client));

    await updateTenantAdminMembership('tenant-1', {
      metadata: { quotaOverrides: { memberLimit: null } },
    });

    expect(prismaMock.client.tenantSubscription.upsert).not.toHaveBeenCalled();
    expect(updateRetentionCutoffForTenant).not.toHaveBeenCalled();
  });
});

describe('deleteTenant', () => {
  test('soft deletes tenant', async () => {
    prismaMock.client.tenant.update.mockResolvedValue({ id: 'tenant-1', deletedAt: new Date() });

    await deleteTenant('tenant-1');

    expect(prismaMock.client.tenant.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'tenant-1' },
        data: expect.objectContaining({
          deletedAt: expect.any(Date),
          status: TENANT_STATUS.deleted,
        }),
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

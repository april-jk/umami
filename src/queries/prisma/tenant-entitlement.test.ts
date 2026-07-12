import { beforeEach, describe, expect, test, vi } from 'vitest';
import { getTenantGoalCount, getWebsiteEntitlement } from './tenant-entitlement';

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    client: {
      website: { findUnique: vi.fn() },
      report: { count: vi.fn() },
    },
  },
}));

vi.mock('@/lib/prisma', () => ({ default: prismaMock }));

beforeEach(() => vi.clearAllMocks());

describe('getWebsiteEntitlement', () => {
  test('returns the tenant plan feature state', async () => {
    prismaMock.client.website.findUnique.mockResolvedValue({
      tenantId: 'tenant-1',
      tenant: { plan: 'starter' },
    });

    expect(await getWebsiteEntitlement('website-1', 'csvExport')).toEqual({
      tenantId: 'tenant-1',
      plan: 'starter',
      allowed: true,
      value: true,
    });
  });

  test('blocks disabled cloud features', async () => {
    prismaMock.client.website.findUnique.mockResolvedValue({
      tenantId: 'tenant-1',
      tenant: { plan: 'free' },
    });

    expect((await getWebsiteEntitlement('website-1', 'csvExport')).allowed).toBe(false);
  });

  test('allows legacy websites without a tenant', async () => {
    prismaMock.client.website.findUnique.mockResolvedValue({ tenantId: null, tenant: null });

    expect((await getWebsiteEntitlement('website-1', 'csvExport')).allowed).toBe(true);
  });
});

test('counts tenant goals across active websites', async () => {
  prismaMock.client.report.count.mockResolvedValue(12);

  expect(await getTenantGoalCount('tenant-1')).toBe(12);
  expect(prismaMock.client.report.count).toHaveBeenCalledWith({
    where: { type: 'goal', website: { tenantId: 'tenant-1', deletedAt: null } },
  });
});

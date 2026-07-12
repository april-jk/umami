import { beforeEach, describe, expect, test, vi } from 'vitest';
import { createDefaultMembershipConfig } from '@/lib/membership-config';
import {
  clearMembershipConfigMemoryCache,
  getMembershipConfig,
  getMembershipConfigRecord,
  updateMembershipConfig,
} from './membership-config';

const { prismaMock, redisMock } = vi.hoisted(() => ({
  prismaMock: {
    client: {
      membershipConfig: {
        create: vi.fn(),
        findUnique: vi.fn(),
        findUniqueOrThrow: vi.fn(),
        updateMany: vi.fn(),
      },
    },
  },
  redisMock: {
    enabled: false,
    client: { fetch: vi.fn(), del: vi.fn() },
  },
}));

vi.mock('@/lib/prisma', () => ({ default: prismaMock }));
vi.mock('@/lib/redis', () => ({ default: redisMock }));

beforeEach(() => {
  vi.clearAllMocks();
  redisMock.enabled = false;
  clearMembershipConfigMemoryCache();
});

describe('membership configuration queries', () => {
  test('falls back to code defaults when no database row exists', async () => {
    prismaMock.client.membershipConfig.findUnique.mockResolvedValue(null);

    const result = await getMembershipConfigRecord();

    expect(result.source).toBe('default');
    expect(result.version).toBe(0);
    expect(result.config.plans.free.limits.eventLimit).toBe(100_000);
  });

  test('loads and caches a valid database configuration', async () => {
    const config = createDefaultMembershipConfig();
    config.plans.pro.limits.websiteLimit = 40;
    prismaMock.client.membershipConfig.findUnique.mockResolvedValue({
      config,
      version: 4,
      updatedAt: new Date('2026-07-12T00:00:00.000Z'),
      updatedBy: 'admin-1',
    });

    expect((await getMembershipConfig()).plans.pro.limits.websiteLimit).toBe(40);
    expect((await getMembershipConfig()).plans.pro.limits.websiteLimit).toBe(40);
    expect(prismaMock.client.membershipConfig.findUnique).toHaveBeenCalledTimes(1);

    await getMembershipConfig({ fresh: true });
    expect(prismaMock.client.membershipConfig.findUnique).toHaveBeenCalledTimes(2);
  });

  test('ignores malformed database configuration', async () => {
    prismaMock.client.membershipConfig.findUnique.mockResolvedValue({
      config: { plans: {} },
      version: 9,
      updatedAt: null,
      updatedBy: null,
    });

    const result = await getMembershipConfigRecord();

    expect(result.source).toBe('default');
    expect(result.config.plans.starter.prices.monthly).toBe(9);
  });

  test('uses the shared Redis cache when enabled', async () => {
    const record = {
      config: createDefaultMembershipConfig(),
      source: 'database' as const,
      version: 2,
      updatedAt: null,
      updatedBy: null,
    };
    redisMock.enabled = true;
    redisMock.client.fetch.mockResolvedValue(record);

    expect(await getMembershipConfigRecord()).toBe(record);
    expect(redisMock.client.fetch).toHaveBeenCalledWith(
      'membership-config:global:v1',
      expect.any(Function),
      60,
    );
  });

  test('falls back to the database when Redis is unavailable', async () => {
    redisMock.enabled = true;
    redisMock.client.fetch.mockRejectedValue(new Error('Redis unavailable'));
    prismaMock.client.membershipConfig.findUnique.mockResolvedValue(null);

    expect((await getMembershipConfig()).plans.free.limits.eventLimit).toBe(100_000);
    expect(prismaMock.client.membershipConfig.findUnique).toHaveBeenCalledOnce();
  });

  test('upserts configuration and invalidates local and Redis caches', async () => {
    const config = createDefaultMembershipConfig();
    config.plans.team.limits.memberLimit = 30;
    redisMock.enabled = true;
    prismaMock.client.membershipConfig.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.client.membershipConfig.findUniqueOrThrow.mockResolvedValue({
      version: 5,
      updatedAt: new Date('2026-07-12T00:00:00.000Z'),
      updatedBy: 'admin-1',
    });

    const result = await updateMembershipConfig(config, 'admin-1', 4);

    expect(result).toMatchObject({ config, source: 'database', version: 5, updatedBy: 'admin-1' });
    expect(prismaMock.client.membershipConfig.updateMany).toHaveBeenCalledWith({
      where: { id: 'global', version: 4 },
      data: expect.objectContaining({
        config,
        updatedBy: 'admin-1',
        version: { increment: 1 },
        updatedAt: expect.any(Date),
      }),
    });
    expect(redisMock.client.del).toHaveBeenCalledWith('membership-config:global:v1');
  });

  test('keeps a successful database update when Redis invalidation fails', async () => {
    const config = createDefaultMembershipConfig();
    redisMock.enabled = true;
    redisMock.client.del.mockRejectedValue(new Error('Redis unavailable'));
    prismaMock.client.membershipConfig.findUnique.mockResolvedValue(null);
    prismaMock.client.membershipConfig.create.mockResolvedValue({
      version: 1,
      updatedAt: null,
      updatedBy: 'admin-1',
    });

    await expect(updateMembershipConfig(config, 'admin-1', 0)).resolves.toMatchObject({
      version: 1,
    });
  });

  test('rejects stale configuration versions', async () => {
    const config = createDefaultMembershipConfig();
    prismaMock.client.membershipConfig.findUnique.mockResolvedValue({ version: 1 });
    await expect(updateMembershipConfig(config, 'admin-1', 0)).rejects.toThrow(
      'Membership configuration changed.',
    );

    prismaMock.client.membershipConfig.updateMany.mockResolvedValue({ count: 0 });
    await expect(updateMembershipConfig(config, 'admin-1', 3)).rejects.toThrow(
      'Membership configuration changed.',
    );
  });

  test('converts an initial-save unique conflict into a configuration conflict', async () => {
    const config = createDefaultMembershipConfig();
    prismaMock.client.membershipConfig.findUnique.mockResolvedValue(null);
    prismaMock.client.membershipConfig.create.mockRejectedValue({ code: 'P2002' });

    await expect(updateMembershipConfig(config, 'admin-1', 0)).rejects.toThrow(
      'Membership configuration changed.',
    );
  });

  test('preserves unexpected initial-save errors', async () => {
    const config = createDefaultMembershipConfig();
    const failure = new Error('Database unavailable');
    prismaMock.client.membershipConfig.findUnique.mockResolvedValue(null);
    prismaMock.client.membershipConfig.create.mockRejectedValue(failure);

    await expect(updateMembershipConfig(config, 'admin-1', 0)).rejects.toBe(failure);
  });
});

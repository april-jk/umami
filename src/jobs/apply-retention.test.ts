import { beforeEach, describe, expect, test, vi } from 'vitest';
import {
  applyRetentionSweep,
  getWebsiteRetentionCutoff,
  updateRetentionCutoffForTenant,
} from './apply-retention';

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    client: {
      website: {
        findMany: vi.fn(),
        update: vi.fn(),
        findUnique: vi.fn(),
      },
    },
  },
}));

vi.mock('@/lib/prisma', () => ({
  default: prismaMock,
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('applyRetentionSweep', () => {
  test('updates websites with no existing cutoff', async () => {
    prismaMock.client.website.findMany.mockResolvedValue([
      { id: 'ws-1', retentionCutoffAt: null, tenant: { plan: 'free' } },
    ]);
    prismaMock.client.website.update.mockResolvedValue({});

    const result = await applyRetentionSweep(new Date('2026-07-11T00:00:00Z'));

    expect(result.updated).toBe(1);
    expect(prismaMock.client.website.update).toHaveBeenCalledWith({
      where: { id: 'ws-1' },
      data: { retentionCutoffAt: new Date('2026-07-04T00:00:00Z') },
    });
  });

  test('updates websites when cutoff should advance', async () => {
    prismaMock.client.website.findMany.mockResolvedValue([
      { id: 'ws-1', retentionCutoffAt: new Date('2026-07-03T00:00:00Z'), tenant: { plan: 'free' } },
    ]);
    prismaMock.client.website.update.mockResolvedValue({});

    const result = await applyRetentionSweep(new Date('2026-07-11T00:00:00Z'));

    expect(result.updated).toBe(1);
    expect(prismaMock.client.website.update).toHaveBeenCalledWith({
      where: { id: 'ws-1' },
      data: { retentionCutoffAt: new Date('2026-07-04T00:00:00Z') },
    });
  });

  test('skips websites with up-to-date cutoff', async () => {
    prismaMock.client.website.findMany.mockResolvedValue([
      { id: 'ws-1', retentionCutoffAt: new Date('2026-07-04T00:00:00Z'), tenant: { plan: 'free' } },
    ]);

    const result = await applyRetentionSweep(new Date('2026-07-11T00:00:00Z'));

    expect(result.updated).toBe(0);
    expect(prismaMock.client.website.update).not.toHaveBeenCalled();
  });

  test('handles unlimited retention (team/enterprise) by not setting cutoff', async () => {
    prismaMock.client.website.findMany.mockResolvedValue([
      { id: 'ws-1', retentionCutoffAt: null, tenant: { plan: 'team' } },
      { id: 'ws-2', retentionCutoffAt: new Date('2026-01-01T00:00:00Z'), tenant: { plan: 'enterprise' } },
    ]);

    const result = await applyRetentionSweep(new Date('2026-07-11T00:00:00Z'));

    expect(result.updated).toBe(0);
    expect(prismaMock.client.website.update).not.toHaveBeenCalled();
  });

  test('handles multiple plans in one sweep', async () => {
    prismaMock.client.website.findMany.mockResolvedValue([
      { id: 'ws-1', retentionCutoffAt: null, tenant: { plan: 'free' } },
      { id: 'ws-2', retentionCutoffAt: null, tenant: { plan: 'starter' } },
      { id: 'ws-3', retentionCutoffAt: null, tenant: { plan: 'team' } },
    ]);
    prismaMock.client.website.update.mockResolvedValue({});

    const result = await applyRetentionSweep(new Date('2026-07-11T00:00:00Z'));

    expect(result.updated).toBe(2); // free and starter only
    expect(prismaMock.client.website.update).toHaveBeenCalledTimes(2);
  });

  test('handles empty website list', async () => {
    prismaMock.client.website.findMany.mockResolvedValue([]);

    const result = await applyRetentionSweep(new Date('2026-07-11T00:00:00Z'));

    expect(result.updated).toBe(0);
  });

  test('calculates correct cutoff for each plan tier', async () => {
    const now = new Date('2026-07-11T00:00:00Z');
    prismaMock.client.website.findMany.mockResolvedValue([
      { id: 'ws-free', retentionCutoffAt: null, tenant: { plan: 'free' } },
      { id: 'ws-starter', retentionCutoffAt: null, tenant: { plan: 'starter' } },
      { id: 'ws-pro', retentionCutoffAt: null, tenant: { plan: 'pro' } },
    ]);
    prismaMock.client.website.update.mockResolvedValue({});

    await applyRetentionSweep(now);

    expect(prismaMock.client.website.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'ws-free' },
        data: { retentionCutoffAt: new Date('2026-07-04T00:00:00Z') }, // 7 days
      }),
    );
    expect(prismaMock.client.website.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'ws-starter' },
        data: { retentionCutoffAt: new Date('2026-01-12T00:00:00Z') }, // 180 days
      }),
    );
    expect(prismaMock.client.website.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'ws-pro' },
        data: { retentionCutoffAt: new Date('2024-07-11T00:00:00Z') }, // 730 days
      }),
    );
  });
});

describe('updateRetentionCutoffForTenant', () => {
  test('updates all websites for tenant when upgrading plan', async () => {
    prismaMock.client.website.findMany.mockResolvedValue([
      { id: 'ws-1', retentionCutoffAt: new Date('2026-07-04T00:00:00Z') }, // free 7 days
      { id: 'ws-2', retentionCutoffAt: new Date('2026-07-04T00:00:00Z') },
    ]);
    prismaMock.client.website.update.mockResolvedValue({});

    const result = await updateRetentionCutoffForTenant('tenant-1', 'starter', new Date('2026-07-11T00:00:00Z'));

    expect(result.updated).toBe(2);
    expect(result.newCutoff).toEqual(new Date('2026-01-12T00:00:00Z'));
    expect(prismaMock.client.website.update).toHaveBeenCalledTimes(2);
  });

  test('clears cutoff when upgrading to unlimited retention', async () => {
    prismaMock.client.website.findMany.mockResolvedValue([
      { id: 'ws-1', retentionCutoffAt: new Date('2026-07-04T00:00:00Z') },
      { id: 'ws-2', retentionCutoffAt: null }, // already null
    ]);
    prismaMock.client.website.update.mockResolvedValue({});

    const result = await updateRetentionCutoffForTenant('tenant-1', 'team', new Date('2026-07-11T00:00:00Z'));

    expect(result.updated).toBe(1); // only ws-1 needs update
    expect(result.newCutoff).toBeNull();
    expect(prismaMock.client.website.update).toHaveBeenCalledWith({
      where: { id: 'ws-1' },
      data: { retentionCutoffAt: null },
    });
  });

  test('downgrades retention cutoff when plan downgrades', async () => {
    prismaMock.client.website.findMany.mockResolvedValue([
      { id: 'ws-1', retentionCutoffAt: new Date('2024-07-11T00:00:00Z') }, // pro 730 days
    ]);
    prismaMock.client.website.update.mockResolvedValue({});

    const result = await updateRetentionCutoffForTenant('tenant-1', 'free', new Date('2026-07-11T00:00:00Z'));

    expect(result.updated).toBe(1);
    expect(result.newCutoff).toEqual(new Date('2026-07-04T00:00:00Z'));
  });

  test('skips websites already at correct cutoff', async () => {
    prismaMock.client.website.findMany.mockResolvedValue([
      { id: 'ws-1', retentionCutoffAt: new Date('2026-07-04T00:00:00Z') },
    ]);

    const result = await updateRetentionCutoffForTenant('tenant-1', 'free', new Date('2026-07-11T00:00:00Z'));

    expect(result.updated).toBe(0);
    expect(prismaMock.client.website.update).not.toHaveBeenCalled();
  });

  test('handles empty website list for tenant', async () => {
    prismaMock.client.website.findMany.mockResolvedValue([]);

    const result = await updateRetentionCutoffForTenant('tenant-1', 'pro', new Date('2026-07-11T00:00:00Z'));

    expect(result.updated).toBe(0);
    expect(result.newCutoff).toEqual(new Date('2024-07-11T00:00:00Z'));
  });
});

describe('getWebsiteRetentionCutoff', () => {
  test('returns retention cutoff when only retention is set', async () => {
    prismaMock.client.website.findUnique.mockResolvedValue({
      retentionCutoffAt: new Date('2026-07-04T00:00:00Z'),
      resetAt: null,
    });

    const result = await getWebsiteRetentionCutoff('ws-1');

    expect(result).toEqual(new Date('2026-07-04T00:00:00Z'));
  });

  test('returns resetAt when it is later than retention cutoff', async () => {
    prismaMock.client.website.findUnique.mockResolvedValue({
      retentionCutoffAt: new Date('2026-07-04T00:00:00Z'),
      resetAt: new Date('2026-07-10T00:00:00Z'),
    });

    const result = await getWebsiteRetentionCutoff('ws-1');

    expect(result).toEqual(new Date('2026-07-10T00:00:00Z'));
  });

  test('returns retention cutoff when it is later than resetAt', async () => {
    prismaMock.client.website.findUnique.mockResolvedValue({
      retentionCutoffAt: new Date('2026-07-10T00:00:00Z'),
      resetAt: new Date('2026-07-04T00:00:00Z'),
    });

    const result = await getWebsiteRetentionCutoff('ws-1');

    expect(result).toEqual(new Date('2026-07-10T00:00:00Z'));
  });

  test('returns resetAt when retention is null', async () => {
    prismaMock.client.website.findUnique.mockResolvedValue({
      retentionCutoffAt: null,
      resetAt: new Date('2026-07-04T00:00:00Z'),
    });

    const result = await getWebsiteRetentionCutoff('ws-1');

    expect(result).toEqual(new Date('2026-07-04T00:00:00Z'));
  });

  test('returns null when both are null', async () => {
    prismaMock.client.website.findUnique.mockResolvedValue({
      retentionCutoffAt: null,
      resetAt: null,
    });

    const result = await getWebsiteRetentionCutoff('ws-1');

    expect(result).toBeNull();
  });

  test('returns null for non-existent website', async () => {
    prismaMock.client.website.findUnique.mockResolvedValue(null);

    const result = await getWebsiteRetentionCutoff('ws-nonexistent');

    expect(result).toBeNull();
  });
});

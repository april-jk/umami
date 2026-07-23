import { beforeEach, describe, expect, test, vi } from 'vitest';
import { createDefaultMembershipConfig } from '@/lib/membership-config';
import { getMcpUsagePeriodStart, getMcpUsageScopeKey, reserveMcpCall } from './mcp-usage';
import { getMembershipConfig } from './membership-config';
import { getTenantPlan } from './tenant';

const { transactionMock, counterMock } = vi.hoisted(() => ({
  transactionMock: vi.fn(),
  counterMock: {
    upsert: vi.fn(),
    findUnique: vi.fn(),
    updateMany: vi.fn(),
  },
}));

vi.mock('@/lib/prisma', () => ({
  default: {
    client: { mcpUsageCounter: counterMock },
    transaction: transactionMock,
  },
}));
vi.mock('./membership-config', () => ({ getMembershipConfig: vi.fn() }));
vi.mock('./tenant', () => ({ getTenantPlan: vi.fn() }));

const configMock = vi.mocked(getMembershipConfig);
const tenantPlanMock = vi.mocked(getTenantPlan);

beforeEach(() => {
  vi.clearAllMocks();
  process.env.MEMBERSHIP_ENABLED = '1';
  configMock.mockResolvedValue(createDefaultMembershipConfig());
  tenantPlanMock.mockResolvedValue({ plan: 'free' });
  counterMock.upsert.mockResolvedValue({});
  counterMock.findUnique.mockResolvedValue({ callCount: 0 });
  counterMock.updateMany.mockResolvedValue({ count: 1 });
  transactionMock.mockImplementation(async (callback: (client: any) => unknown) =>
    callback({ mcpUsageCounter: counterMock }),
  );
});

describe('MCP usage periods and scopes', () => {
  test('normalizes daily and monthly windows to UTC boundaries', () => {
    const now = new Date('2026-07-23T18:42:00.000Z');

    expect(getMcpUsagePeriodStart('day', now).toISOString()).toBe('2026-07-23T00:00:00.000Z');
    expect(getMcpUsagePeriodStart('month', now).toISOString()).toBe('2026-07-01T00:00:00.000Z');
    expect(getMcpUsageScopeKey('user-1', 'tenant-1')).toBe('tenant:tenant-1');
    expect(getMcpUsageScopeKey('user-1')).toBe('user:user-1');
  });

  test('reserves a daily call atomically and reports remaining usage', async () => {
    const result = await reserveMcpCall('user-1', 'tenant-1', new Date('2026-07-23T01:00:00Z'));

    expect(result).toMatchObject({
      allowed: true,
      used: 1,
      limit: 50,
      remaining: 49,
      period: 'day',
      plan: 'free',
    });
    expect(counterMock.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          scopeKey: 'tenant:tenant-1',
          period: 'day',
          callCount: { lt: 50 },
        }),
      }),
    );
  });

  test('uses a monthly quota for plans configured with monthly MCP usage', async () => {
    tenantPlanMock.mockResolvedValue({ plan: 'pro' });
    counterMock.findUnique.mockResolvedValue({ callCount: 9_999 });

    const result = await reserveMcpCall('user-1', 'tenant-1', new Date('2026-07-23T01:00:00Z'));

    expect(result).toMatchObject({ allowed: true, used: 10_000, limit: 10_000, period: 'month' });
    expect(counterMock.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ period: 'month', callCount: { lt: 10_000 } }),
      }),
    );
  });

  test('allows unlimited plans without creating a usage counter', async () => {
    tenantPlanMock.mockResolvedValue({ plan: 'enterprise' });

    const result = await reserveMcpCall('user-1', 'tenant-1');

    expect(result).toMatchObject({ allowed: true, used: 0, limit: null, period: null });
    expect(transactionMock).not.toHaveBeenCalled();
  });

  test('rejects the boundary call without incrementing beyond the plan quota', async () => {
    counterMock.findUnique.mockResolvedValue({ callCount: 50 });
    counterMock.updateMany.mockResolvedValue({ count: 0 });

    const result = await reserveMcpCall('user-1', 'tenant-1');

    expect(result).toMatchObject({ allowed: false, used: 50, limit: 50, remaining: 0 });
  });

  test('bypasses counters when membership enforcement is disabled', async () => {
    delete process.env.MEMBERSHIP_ENABLED;

    const result = await reserveMcpCall('user-1', 'tenant-1');

    expect(result).toMatchObject({ allowed: true, limit: null, plan: 'unlimited' });
    expect(transactionMock).not.toHaveBeenCalled();
  });
});

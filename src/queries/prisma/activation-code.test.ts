import { beforeEach, describe, expect, test, vi } from 'vitest';
import {
  ActivationCodeError,
  createActivationCode,
  deleteActivationCode,
  getActivationCode,
  getActivationCodes,
  hashActivationCode,
  normalizeActivationCode,
  redeemActivationCode,
  updateActivationCode,
} from './activation-code';

const { prismaMock, txMock, retentionMock } = vi.hoisted(() => {
  const activationCode = {
    create: vi.fn(),
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
  };
  const tx = {
    activationCode,
    activationCodeRedemption: { findFirst: vi.fn(), create: vi.fn() },
    tenant: { findFirst: vi.fn(), update: vi.fn() },
    tenantSubscription: { upsert: vi.fn() },
  };
  return {
    prismaMock: {
      client: {
        activationCode,
        transaction: vi.fn(),
      },
      transaction: vi.fn(async callback => callback(tx)),
      pagedQuery: vi.fn(),
      getSearchParameters: vi.fn(() => ({})),
    },
    txMock: tx,
    retentionMock: vi.fn(),
  };
});

vi.mock('@/lib/prisma', () => ({ default: prismaMock }));
vi.mock('@/jobs/apply-retention', () => ({ updateRetentionCutoffForTenant: retentionMock }));
const now = new Date('2026-07-15T00:00:00.000Z');
const baseCode = {
  id: 'code-1',
  codeHash: 'hash',
  codePrefix: 'AMAMI123456',
  name: 'Launch',
  note: null,
  plan: 'pro',
  durationDays: 30,
  startsAt: new Date('2026-07-01T00:00:00.000Z'),
  expiresAt: null,
  maxRedemptions: 2,
  redemptionCount: 0,
  status: 'active',
  createdBy: 'admin-1',
  createdAt: now,
  updatedAt: now,
  deletedAt: null,
  _count: { redemptions: 0 },
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.useRealTimers();
  prismaMock.getSearchParameters.mockReturnValue({});
  prismaMock.transaction.mockImplementation(async callback => callback(txMock));
  retentionMock.mockResolvedValue(undefined);
});

describe('activation code primitives', () => {
  test('normalizes formatting and hashes deterministically', () => {
    expect(normalizeActivationCode(' amami-ab cd ')).toBe('AMAMIABCD');
    expect(hashActivationCode('amami-123')).toBe(hashActivationCode(' AMAMI123 '));
  });

  test('creates custom and generated codes without persisting raw values', async () => {
    prismaMock.client.activationCode.create.mockResolvedValue(baseCode);
    const custom = await createActivationCode({
      code: ' amami-test 1234 ',
      plan: 'pro',
      durationDays: 30,
      maxRedemptions: 2,
      createdBy: 'admin-1',
    });
    expect(custom.code).toBe('amami-test 1234');
    expect(prismaMock.client.activationCode.create.mock.calls[0][0].data.codeHash).toBe(
      hashActivationCode('AMAMI-TEST-1234'),
    );
    expect(prismaMock.client.activationCode.create.mock.calls[0][0].data.codePrefix).toBe(
      'AMAMITEST123',
    );
    expect(prismaMock.client.activationCode.create.mock.calls[0][0].data.codeHash).not.toContain(
      'TEST',
    );

    const generated = await createActivationCode({
      plan: 'starter',
      durationDays: 7,
      maxRedemptions: 1,
      createdBy: 'admin-1',
    });
    expect(generated.code).toMatch(/^AMAMI-[A-Z0-9-]+$/);
  });

  test.each([
    ['short', { code: 'short' }],
    ['expired window', { expiresAt: new Date('2026-07-01T00:00:00.000Z') }],
  ])('rejects %s input', async (_name, overrides) => {
    await expect(
      createActivationCode({
        plan: 'pro',
        durationDays: 30,
        maxRedemptions: 1,
        createdBy: 'admin-1',
        ...overrides,
      }),
    ).rejects.toBeInstanceOf(ActivationCodeError);
  });

  test('maps duplicate database codes', async () => {
    prismaMock.client.activationCode.create.mockRejectedValue({ code: 'P2002' });
    await expect(
      createActivationCode({
        code: 'AMAMI-TEST-1234',
        plan: 'pro',
        durationDays: 30,
        maxRedemptions: 1,
        createdBy: 'admin-1',
      }),
    ).rejects.toMatchObject({ code: 'duplicate-code' });
  });
});

describe('activation code administration queries', () => {
  test('lists public fields and computes active state', async () => {
    prismaMock.pagedQuery.mockResolvedValue({ data: [baseCode], count: 1, page: 1, pageSize: 20 });
    const result = await getActivationCodes({ search: 'launch' });
    expect(result.data[0]).toMatchObject({ id: 'code-1', isActive: true });
    expect(prismaMock.pagedQuery).toHaveBeenCalledWith(
      'activationCode',
      expect.objectContaining({
        where: { deletedAt: null },
      }),
      expect.anything(),
    );
  });

  test('gets redemption details and handles missing records', async () => {
    prismaMock.client.activationCode.findFirst.mockResolvedValue(baseCode);
    expect(await getActivationCode('code-1')).toMatchObject({ id: 'code-1', isActive: true });
    prismaMock.client.activationCode.findFirst.mockResolvedValue(null);
    expect(await getActivationCode('missing')).toBeNull();
  });

  test('updates only active records and validates windows and limits', async () => {
    prismaMock.client.activationCode.findFirst.mockResolvedValue({
      redemptionCount: 2,
      startsAt: new Date('2026-07-01'),
      expiresAt: null,
    });
    await expect(updateActivationCode('code-1', { maxRedemptions: 1 })).rejects.toMatchObject({
      code: 'redemption-limit-too-low',
    });
    await expect(
      updateActivationCode('code-1', { expiresAt: new Date('2026-06-01') }),
    ).rejects.toMatchObject({
      code: 'invalid-validity-window',
    });
    prismaMock.client.activationCode.findFirst.mockResolvedValue({
      redemptionCount: 0,
      startsAt: new Date('2026-07-01'),
      expiresAt: null,
    });
    prismaMock.client.activationCode.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.client.activationCode.findFirst
      .mockResolvedValueOnce({
        redemptionCount: 0,
        startsAt: new Date('2026-07-01'),
        expiresAt: null,
      })
      .mockResolvedValueOnce(baseCode);
    expect(await updateActivationCode('code-1', { status: 'disabled' })).toMatchObject({
      id: 'code-1',
    });
    expect(prismaMock.client.activationCode.updateMany).toHaveBeenCalledWith({
      where: { id: 'code-1', deletedAt: null },
      data: { status: 'disabled' },
    });
    prismaMock.client.activationCode.findFirst.mockResolvedValue(null);
    expect(await updateActivationCode('missing', { status: 'disabled' })).toBeNull();
  });

  test('atomically rejects a redemption limit crossed by a concurrent redemption', async () => {
    prismaMock.client.activationCode.findFirst
      .mockResolvedValueOnce({
        redemptionCount: 1,
        startsAt: new Date('2026-07-01'),
        expiresAt: null,
      })
      .mockResolvedValueOnce({
        redemptionCount: 2,
        startsAt: new Date('2026-07-01'),
        expiresAt: null,
      });
    prismaMock.client.activationCode.updateMany.mockResolvedValue({ count: 0 });

    await expect(updateActivationCode('code-1', { maxRedemptions: 1 })).rejects.toMatchObject({
      code: 'redemption-limit-too-low',
    });
    expect(prismaMock.client.activationCode.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'code-1',
        deletedAt: null,
        redemptionCount: { lte: 1 },
      },
      data: { maxRedemptions: 1 },
    });
  });

  test('soft-deletes only active records', async () => {
    prismaMock.client.activationCode.updateMany.mockResolvedValue({ count: 1 });
    await expect(deleteActivationCode('code-1')).resolves.toBe(true);
    prismaMock.client.activationCode.updateMany.mockResolvedValue({ count: 0 });
    await expect(deleteActivationCode('missing')).resolves.toBe(false);
  });
});

describe('activation code redemption', () => {
  function configureCode(overrides: Record<string, any> = {}) {
    txMock.activationCode.findUnique.mockResolvedValue({ ...baseCode, ...overrides });
    txMock.tenant.findFirst.mockResolvedValue({
      id: 'tenant-1',
      plan: 'free',
      status: 'active',
      subscription: null,
    });
    txMock.activationCodeRedemption.findFirst.mockResolvedValue(null);
    txMock.activationCode.updateMany.mockResolvedValue({ count: 1 });
    txMock.tenant.update.mockResolvedValue({});
    txMock.tenantSubscription.upsert.mockResolvedValue({});
    txMock.activationCodeRedemption.create.mockResolvedValue({ id: 'redemption-1' });
  }

  test('requires a workspace and rejects invalid code states', async () => {
    await expect(redeemActivationCode('user-1', 'tenant-1', '   ')).rejects.toMatchObject({
      code: 'invalid-code',
    });
    txMock.activationCode.findUnique.mockResolvedValue(null);
    await expect(redeemActivationCode('user-1', 'tenant-1', 'AMAMI-1234')).rejects.toMatchObject({
      code: 'invalid-code',
    });
    configureCode({ status: 'disabled' });
    await expect(redeemActivationCode('user-1', 'tenant-1', 'AMAMI-1234')).rejects.toMatchObject({
      code: 'invalid-code',
    });
    configureCode({ startsAt: new Date('2099-01-01') });
    await expect(redeemActivationCode('user-1', 'tenant-1', 'AMAMI-1234')).rejects.toMatchObject({
      code: 'not-started',
    });
    configureCode({ expiresAt: new Date('2000-01-01') });
    await expect(redeemActivationCode('user-1', 'tenant-1', 'AMAMI-1234')).rejects.toMatchObject({
      code: 'expired-code',
    });
    configureCode({ redemptionCount: 2 });
    await expect(redeemActivationCode('user-1', 'tenant-1', 'AMAMI-1234')).rejects.toMatchObject({
      code: 'redemption-limit',
    });
  });

  test('rejects missing workspaces, active billing, and duplicate users', async () => {
    configureCode();
    txMock.tenant.findFirst.mockResolvedValue(null);
    await expect(redeemActivationCode('user-1', 'tenant-1', 'AMAMI-1234')).rejects.toMatchObject({
      code: 'tenant-not-found',
    });
    configureCode();
    txMock.tenant.findFirst.mockResolvedValue({
      id: 'tenant-1',
      plan: 'pro',
      status: 'active',
      subscription: { billingProvider: 'paypal', currentPeriodEnd: new Date('2099-01-01') },
    });
    await expect(redeemActivationCode('user-1', 'tenant-1', 'AMAMI-1234')).rejects.toMatchObject({
      code: 'active-subscription',
    });
    configureCode();
    txMock.tenant.findFirst.mockResolvedValue({
      id: 'tenant-1',
      plan: 'pro',
      status: 'active',
      subscription: {
        billingProvider: 'paypal',
        plan: 'pro',
        status: 'active',
        currentPeriodEnd: null,
      },
    });
    await expect(redeemActivationCode('user-1', 'tenant-1', 'AMAMI-1234')).rejects.toMatchObject({
      code: 'active-subscription',
    });
    configureCode();
    txMock.activationCodeRedemption.findFirst.mockResolvedValue({ id: 'existing' });
    await expect(redeemActivationCode('user-1', 'tenant-1', 'AMAMI-1234')).rejects.toMatchObject({
      code: 'already-redeemed',
    });
    configureCode();
    txMock.activationCode.updateMany.mockResolvedValue({ count: 0 });
    await expect(redeemActivationCode('user-1', 'tenant-1', 'AMAMI-1234')).rejects.toMatchObject({
      code: 'redemption-limit',
    });
  });

  test('maps a concurrent duplicate redemption to the same domain error', async () => {
    prismaMock.transaction.mockRejectedValueOnce({ code: 'P2002' });
    await expect(redeemActivationCode('user-1', 'tenant-1', 'AMAMI-1234')).rejects.toMatchObject({
      code: 'already-redeemed',
    });
  });

  test('preserves unexpected transaction failures', async () => {
    const failure = new Error('database unavailable');
    prismaMock.transaction.mockRejectedValueOnce(failure);
    await expect(redeemActivationCode('user-1', 'tenant-1', 'AMAMI-1234')).rejects.toBe(failure);
  });

  test('applies membership, records redemption, and refreshes retention', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
    configureCode();
    const result = await redeemActivationCode('user-1', 'tenant-1', 'AMAMI-1234');
    expect(result.plan).toBe('pro');
    expect(result.durationDays).toBe(30);
    expect(txMock.tenant.update).toHaveBeenCalledWith({
      where: { id: 'tenant-1' },
      data: { plan: 'pro', status: 'active' },
    });
    expect(txMock.tenantSubscription.upsert).toHaveBeenCalled();
    expect(txMock.activationCodeRedemption.create).toHaveBeenCalled();
    expect(txMock.activationCode.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: 'code-1',
          maxRedemptions: 2,
          redemptionCount: { lt: 2 },
        }),
      }),
    );
    expect(retentionMock).toHaveBeenCalledWith('tenant-1', 'pro');
  });

  test('preserves remaining time when a higher-tier code is redeemed', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
    configureCode({ plan: 'team' });
    txMock.tenant.findFirst.mockResolvedValue({
      id: 'tenant-1',
      plan: 'pro',
      status: 'active',
      subscription: {
        billingProvider: 'activation_code',
        plan: 'pro',
        currentPeriodEnd: new Date('2026-07-20'),
      },
    });
    await redeemActivationCode('user-1', 'tenant-1', 'AMAMI-1234');
    const createData = txMock.activationCodeRedemption.create.mock.calls[0][0].data;
    expect(createData.membershipEndsAt).toEqual(new Date('2026-08-19'));
    expect(txMock.tenant.update).toHaveBeenCalledWith({
      where: { id: 'tenant-1' },
      data: { plan: 'team', status: 'active' },
    });
  });

  test('does not allow a code to downgrade an active membership', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
    configureCode({ plan: 'starter' });
    txMock.tenant.findFirst.mockResolvedValue({
      id: 'tenant-1',
      plan: 'pro',
      status: 'active',
      subscription: {
        billingProvider: 'activation_code',
        plan: 'pro',
        currentPeriodEnd: new Date('2026-07-20'),
      },
    });

    await expect(redeemActivationCode('user-1', 'tenant-1', 'AMAMI-1234')).rejects.toMatchObject({
      code: 'plan-downgrade',
    });
  });
});

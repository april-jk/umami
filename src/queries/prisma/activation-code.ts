import crypto from 'node:crypto';
import type { Prisma } from '@/generated/prisma/client';
import { updateRetentionCutoffForTenant } from '@/jobs/apply-retention';
import { TENANT_STATUS } from '@/lib/constants';
import { hash, secret, uuid } from '@/lib/crypto';
import prisma from '@/lib/prisma';
import { sanitizeSortFilters } from '@/lib/sort';
import type { QueryFilters } from '@/lib/types';

export const ACTIVATION_CODE_STATUS = {
  active: 'active',
  disabled: 'disabled',
} as const;

export const ACTIVATION_CODE_PLANS = ['starter', 'pro', 'team', 'enterprise'] as const;
export type ActivationCodePlan = (typeof ACTIVATION_CODE_PLANS)[number];

const PLAN_RANK: Record<string, number> = {
  free: 0,
  starter: 1,
  pro: 2,
  team: 3,
  enterprise: 4,
};

const ACTIVATION_CODE_SORT_FIELDS = [
  'codePrefix',
  'plan',
  'durationDays',
  'redemptionCount',
  'startsAt',
  'expiresAt',
  'createdAt',
] as const;

export class ActivationCodeError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'ActivationCodeError';
    this.code = code;
  }
}

export function normalizeActivationCode(value: string) {
  return value.trim().toUpperCase().replace(/[\s-]/g, '');
}

export function hashActivationCode(value: string) {
  return hash('activation-code:', normalizeActivationCode(value), secret());
}

function formatGeneratedCode() {
  const raw = crypto.randomBytes(15).toString('hex').toUpperCase();
  return `AMAMI-${raw.match(/.{1,5}/g)?.join('-')}`;
}

function codePrefix(value: string) {
  return normalizeActivationCode(value).slice(0, 12);
}

function toPublicCode(code: any) {
  const now = new Date();
  return {
    ...code,
    isActive:
      code.status === ACTIVATION_CODE_STATUS.active &&
      code.startsAt <= now &&
      (!code.expiresAt || code.expiresAt > now) &&
      code.redemptionCount < code.maxRedemptions,
  };
}

const publicCodeSelect = {
  id: true,
  codePrefix: true,
  name: true,
  note: true,
  plan: true,
  durationDays: true,
  startsAt: true,
  expiresAt: true,
  maxRedemptions: true,
  redemptionCount: true,
  status: true,
  createdBy: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
  _count: { select: { redemptions: true } },
} satisfies Prisma.ActivationCodeSelect;

export async function getActivationCodes(filters: QueryFilters = {}) {
  const sortFilters = sanitizeSortFilters(filters, ACTIVATION_CODE_SORT_FIELDS, {
    orderBy: 'createdAt',
    sortDescending: true,
  });
  const where: Prisma.ActivationCodeWhereInput = {
    deletedAt: null,
    ...prisma.getSearchParameters(sortFilters.search, [
      { codePrefix: 'contains' },
      { name: 'contains' },
      { note: 'contains' },
    ]),
  };

  const result = await prisma.pagedQuery(
    'activationCode',
    {
      where,
      select: publicCodeSelect,
    },
    sortFilters,
  );

  return { ...result, data: result.data.map(toPublicCode) };
}

export async function getActivationCode(id: string) {
  const code = await prisma.client.activationCode.findFirst({
    where: { id, deletedAt: null },
    select: {
      ...publicCodeSelect,
      redemptions: {
        orderBy: { redeemedAt: 'desc' },
        take: 100,
        select: {
          id: true,
          plan: true,
          durationDays: true,
          redeemedAt: true,
          membershipStartsAt: true,
          membershipEndsAt: true,
          user: { select: { id: true, username: true, displayName: true } },
          tenant: { select: { id: true, name: true, slug: true } },
        },
      },
    },
  });

  return code ? toPublicCode(code) : null;
}

export async function createActivationCode(data: {
  code?: string;
  name?: string;
  note?: string;
  plan: ActivationCodePlan;
  durationDays: number;
  startsAt?: Date;
  expiresAt?: Date | null;
  maxRedemptions: number;
  status?: string;
  createdBy: string;
}) {
  const plainCode = data.code?.trim() || formatGeneratedCode();
  const normalized = normalizeActivationCode(plainCode);
  if (normalized.length < 8) {
    throw new ActivationCodeError(
      'invalid-code',
      'Activation code must contain at least 8 characters.',
    );
  }
  const startsAt = data.startsAt ?? new Date();
  if (data.expiresAt && data.expiresAt <= startsAt) {
    throw new ActivationCodeError(
      'invalid-validity-window',
      'Expiration must be after the start time.',
    );
  }

  try {
    const code = await prisma.client.activationCode.create({
      data: {
        id: uuid(),
        codeHash: hashActivationCode(normalized),
        codePrefix: codePrefix(plainCode),
        name: data.name || null,
        note: data.note || null,
        plan: data.plan,
        durationDays: data.durationDays,
        startsAt,
        expiresAt: data.expiresAt ?? null,
        maxRedemptions: data.maxRedemptions,
        status: data.status ?? ACTIVATION_CODE_STATUS.active,
        createdBy: data.createdBy,
      },
      select: publicCodeSelect,
    });

    return { ...toPublicCode(code), code: plainCode };
  } catch (error) {
    if ((error as { code?: string }).code === 'P2002') {
      throw new ActivationCodeError('duplicate-code', 'This activation code already exists.');
    }
    throw error;
  }
}

export async function updateActivationCode(
  id: string,
  data: Partial<{
    name: string | null;
    note: string | null;
    plan: ActivationCodePlan;
    durationDays: number;
    startsAt: Date;
    expiresAt: Date | null;
    maxRedemptions: number;
    status: string;
  }>,
) {
  const existing = await prisma.client.activationCode.findFirst({
    where: { id, deletedAt: null },
    select: { redemptionCount: true, startsAt: true, expiresAt: true },
  });
  if (!existing) return null;
  if (data.maxRedemptions !== undefined && data.maxRedemptions < existing.redemptionCount) {
    throw new ActivationCodeError(
      'redemption-limit-too-low',
      'Maximum redemptions cannot be lower than the current redemption count.',
    );
  }
  const startsAt = data.startsAt ?? existing.startsAt;
  const expiresAt = data.expiresAt === undefined ? existing.expiresAt : data.expiresAt;
  if (expiresAt && expiresAt <= startsAt) {
    throw new ActivationCodeError(
      'invalid-validity-window',
      'Expiration must be after the start time.',
    );
  }

  const updated = await prisma.client.activationCode.updateMany({
    where: {
      id,
      deletedAt: null,
      ...(data.maxRedemptions === undefined
        ? {}
        : { redemptionCount: { lte: data.maxRedemptions } }),
    },
    data,
  });

  if (updated.count === 0) {
    const latest = await prisma.client.activationCode.findFirst({
      where: { id, deletedAt: null },
      select: { redemptionCount: true, startsAt: true, expiresAt: true },
    });
    if (latest && data.maxRedemptions !== undefined) {
      throw new ActivationCodeError(
        'redemption-limit-too-low',
        'Maximum redemptions cannot be lower than the current redemption count.',
      );
    }
    return null;
  }

  const code = await prisma.client.activationCode.findFirst({
    where: { id, deletedAt: null },
    select: publicCodeSelect,
  });
  return code ? toPublicCode(code) : null;
}

export async function deleteActivationCode(id: string) {
  const result = await prisma.client.activationCode.updateMany({
    where: { id, deletedAt: null },
    data: { deletedAt: new Date(), status: ACTIVATION_CODE_STATUS.disabled },
  });
  return result.count > 0;
}

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

export async function redeemActivationCode(userId: string, tenantId: string, value: string) {
  const normalized = normalizeActivationCode(value);
  if (!normalized) throw new ActivationCodeError('invalid-code', 'Enter an activation code.');

  let result: {
    plan: ActivationCodePlan;
    durationDays: number;
    membershipEndsAt: Date;
    redemption: unknown;
  };

  try {
    result = (await prisma.transaction(async tx => {
      const now = new Date();
      const code = await tx.activationCode.findUnique({
        where: { codeHash: hashActivationCode(normalized) },
      });

      if (!code || code.deletedAt || code.status !== ACTIVATION_CODE_STATUS.active) {
        throw new ActivationCodeError('invalid-code', 'This activation code is not valid.');
      }
      if (code.startsAt > now) {
        throw new ActivationCodeError('not-started', 'This activation code is not active yet.');
      }
      if (code.expiresAt && code.expiresAt <= now) {
        throw new ActivationCodeError('expired-code', 'This activation code has expired.');
      }
      if (code.redemptionCount >= code.maxRedemptions) {
        throw new ActivationCodeError(
          'redemption-limit',
          'This activation code has reached its usage limit.',
        );
      }

      const tenant = await tx.tenant.findFirst({
        where: { id: tenantId, deletedAt: null },
        select: { id: true, plan: true, status: true, subscription: true },
      });
      if (!tenant)
        throw new ActivationCodeError('tenant-not-found', 'Your workspace could not be found.');

      const existingSubscription = tenant.subscription;
      if (
        existingSubscription?.billingProvider === 'paypal' &&
        (!existingSubscription.currentPeriodEnd || existingSubscription.currentPeriodEnd > now)
      ) {
        throw new ActivationCodeError(
          'active-subscription',
          'Cancel your active subscription before redeeming an activation code.',
        );
      }

      const activeActivationCodeEnd =
        existingSubscription?.billingProvider === 'activation_code' &&
        existingSubscription.currentPeriodEnd &&
        existingSubscription.currentPeriodEnd > now
          ? existingSubscription.currentPeriodEnd
          : null;
      const currentPlan = existingSubscription?.plan || tenant.plan;
      if (activeActivationCodeEnd && (PLAN_RANK[currentPlan] ?? 0) > PLAN_RANK[code.plan]) {
        throw new ActivationCodeError(
          'plan-downgrade',
          'This activation code cannot downgrade your active membership.',
        );
      }

      const duplicate = await tx.activationCodeRedemption.findFirst({
        where: { activationCodeId: code.id, userId },
      });
      if (duplicate) {
        throw new ActivationCodeError(
          'already-redeemed',
          'This activation code has already been used.',
        );
      }

      const reserved = await tx.activationCode.updateMany({
        where: {
          id: code.id,
          status: ACTIVATION_CODE_STATUS.active,
          maxRedemptions: code.maxRedemptions,
          redemptionCount: { lt: code.maxRedemptions },
          startsAt: { lte: now },
          OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        },
        data: { redemptionCount: { increment: 1 } },
      });
      if (reserved.count !== 1) {
        throw new ActivationCodeError(
          'redemption-limit',
          'This activation code has reached its usage limit.',
        );
      }

      const currentEnd = activeActivationCodeEnd ?? now;
      const membershipEndsAt = addDays(currentEnd, code.durationDays);

      await tx.tenant.update({
        where: { id: tenantId },
        data: { plan: code.plan, status: TENANT_STATUS.active },
      });
      await tx.tenantSubscription.upsert({
        where: { tenantId },
        create: {
          id: uuid(),
          tenantId,
          plan: code.plan,
          status: TENANT_STATUS.active,
          billingProvider: 'activation_code',
          currentPeriodStart: now,
          currentPeriodEnd: membershipEndsAt,
        },
        update: {
          plan: code.plan,
          status: TENANT_STATUS.active,
          billingProvider: 'activation_code',
          billingCustomerId: null,
          billingSubscriptionId: null,
          currentPeriodStart: now,
          currentPeriodEnd: membershipEndsAt,
          cancelAtPeriodEnd: false,
        },
      });

      const redemption = await tx.activationCodeRedemption.create({
        data: {
          id: uuid(),
          activationCodeId: code.id,
          userId,
          tenantId,
          plan: code.plan,
          durationDays: code.durationDays,
          redeemedAt: now,
          membershipStartsAt: now,
          membershipEndsAt,
        },
        select: { id: true, plan: true, durationDays: true, membershipEndsAt: true },
      });

      return { plan: code.plan, durationDays: code.durationDays, membershipEndsAt, redemption };
    })) as unknown as typeof result;
  } catch (error) {
    if ((error as { code?: string }).code === 'P2002') {
      throw new ActivationCodeError(
        'already-redeemed',
        'This activation code has already been used.',
      );
    }
    throw error;
  }

  await updateRetentionCutoffForTenant(tenantId, result.plan);
  return result;
}

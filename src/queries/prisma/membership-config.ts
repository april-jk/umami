import type { Prisma } from '@/generated/prisma/client';
import {
  createDefaultMembershipConfig,
  type MembershipConfig,
  parseMembershipConfig,
} from '@/lib/membership-config';
import prisma from '@/lib/prisma';
import redis from '@/lib/redis';

const CONFIG_ID = 'global';
const CACHE_KEY = 'membership-config:global:v1';
const CACHE_TTL_SECONDS = 60;

type MembershipConfigRecord = {
  config: MembershipConfig;
  source: 'default' | 'database';
  version: number;
  updatedAt: Date | null;
  updatedBy: string | null;
};

let memoryCache: { value: MembershipConfigRecord; expiresAt: number } | null = null;

async function loadMembershipConfigRecord(): Promise<MembershipConfigRecord> {
  const record = await prisma.client.membershipConfig.findUnique({ where: { id: CONFIG_ID } });
  const config = record ? parseMembershipConfig(record.config) : null;

  if (!record || !config) {
    return {
      config: createDefaultMembershipConfig(),
      source: 'default',
      version: 0,
      updatedAt: null,
      updatedBy: null,
    };
  }

  return {
    config,
    source: 'database',
    version: record.version,
    updatedAt: record.updatedAt,
    updatedBy: record.updatedBy,
  };
}

export async function getMembershipConfigRecord(options: { fresh?: boolean } = {}) {
  const { fresh = false } = options;

  if (!fresh && redis.enabled) {
    try {
      return await redis.client.fetch(CACHE_KEY, loadMembershipConfigRecord, CACHE_TTL_SECONDS);
    } catch {
      // Configuration must remain available when the optional shared cache is down.
    }
  }

  if (!fresh && memoryCache && memoryCache.expiresAt > Date.now()) {
    return memoryCache.value;
  }

  const value = await loadMembershipConfigRecord();
  memoryCache = { value, expiresAt: Date.now() + CACHE_TTL_SECONDS * 1000 };
  return value;
}

export async function getMembershipConfig(options: { fresh?: boolean } = {}) {
  return (await getMembershipConfigRecord(options)).config;
}

export class MembershipConfigConflictError extends Error {}

export async function updateMembershipConfig(
  config: MembershipConfig,
  updatedBy: string,
  expectedVersion: number,
) {
  let record;
  if (expectedVersion === 0) {
    const existing = await prisma.client.membershipConfig.findUnique({ where: { id: CONFIG_ID } });
    if (existing) throw new MembershipConfigConflictError('Membership configuration changed.');
    try {
      record = await prisma.client.membershipConfig.create({
        data: {
          id: CONFIG_ID,
          config: config as Prisma.InputJsonValue,
          updatedBy,
        },
      });
    } catch (error) {
      if ((error as { code?: string }).code === 'P2002') {
        throw new MembershipConfigConflictError('Membership configuration changed.');
      }
      throw error;
    }
  } else {
    const updated = await prisma.client.membershipConfig.updateMany({
      where: { id: CONFIG_ID, version: expectedVersion },
      data: {
        config: config as Prisma.InputJsonValue,
        updatedBy,
        version: { increment: 1 },
        updatedAt: new Date(),
      },
    });
    if (updated.count !== 1) {
      throw new MembershipConfigConflictError('Membership configuration changed.');
    }
    record = await prisma.client.membershipConfig.findUniqueOrThrow({ where: { id: CONFIG_ID } });
  }

  memoryCache = null;
  if (redis.enabled) {
    try {
      await redis.client.del(CACHE_KEY);
    } catch {
      // Other instances will refresh after the short cache TTL.
    }
  }

  return {
    config,
    source: 'database' as const,
    version: record.version,
    updatedAt: record.updatedAt,
    updatedBy: record.updatedBy,
  };
}

export function clearMembershipConfigMemoryCache() {
  memoryCache = null;
}

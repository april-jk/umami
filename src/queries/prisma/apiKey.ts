import crypto from 'node:crypto';
import type { Prisma } from '@/generated/prisma/client';
import { hash, secret, uuid } from '@/lib/crypto';
import prisma from '@/lib/prisma';
import { getDefaultTenantIdForUser } from './tenant';

const API_KEY_PREFIX = 'amami_live_';
const API_KEY_PREFIX_LENGTH = 22;

function createApiKeyValue() {
  return `${API_KEY_PREFIX}${crypto.randomBytes(32).toString('base64url')}`;
}

export function hashApiKey(value: string) {
  return hash('api-key:', value, secret());
}

function publicApiKeySelect(): Prisma.ApiKeySelect {
  return {
    id: true,
    name: true,
    keyPrefix: true,
    createdAt: true,
    lastUsedAt: true,
  };
}

export async function getUserApiKeys(userId: string) {
  return prisma.client.apiKey.findMany({
    where: {
      userId,
      deletedAt: null,
    },
    orderBy: {
      createdAt: 'desc',
    },
    select: publicApiKeySelect(),
  });
}

export async function createApiKey(userId: string, name: string) {
  const key = createApiKeyValue();
  const tenantId = await getDefaultTenantIdForUser(userId);
  const apiKey = await prisma.client.apiKey.create({
    data: {
      id: uuid(),
      userId,
      tenantId,
      name,
      keyHash: hashApiKey(key),
      keyPrefix: key.slice(0, API_KEY_PREFIX_LENGTH),
    },
    select: publicApiKeySelect(),
  });

  return {
    ...apiKey,
    key,
  };
}

export async function getApiKeyAuth(value: string) {
  return prisma.client.apiKey.findFirst({
    where: {
      keyHash: hashApiKey(value),
      deletedAt: null,
      user: {
        deletedAt: null,
      },
    },
    include: {
      user: true,
    },
  });
}

export async function touchApiKey(apiKeyId: string) {
  return prisma.client.apiKey.update({
    where: {
      id: apiKeyId,
    },
    data: {
      lastUsedAt: new Date(),
    },
  });
}

export async function deleteUserApiKey(userId: string, apiKeyId: string) {
  const result = await prisma.client.apiKey.updateMany({
    where: {
      id: apiKeyId,
      userId,
      deletedAt: null,
    },
    data: {
      deletedAt: new Date(),
    },
  });

  return result.count > 0;
}

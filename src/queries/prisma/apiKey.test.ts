import { beforeEach, expect, test, vi } from 'vitest';
import {
  createApiKey,
  deleteUserApiKey,
  getApiKeyAuth,
  getUserApiKeys,
  hashApiKey,
  touchApiKey,
} from './apiKey';
import { getDefaultTenantIdForUser } from './tenant';

const { apiKeyMock } = vi.hoisted(() => ({
  apiKeyMock: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
  },
}));

vi.mock('@/lib/prisma', () => ({
  default: {
    client: {
      apiKey: apiKeyMock,
    },
  },
}));

vi.mock('./tenant', () => ({
  getDefaultTenantIdForUser: vi.fn(),
}));

const getDefaultTenantIdForUserMock = vi.mocked(getDefaultTenantIdForUser);

beforeEach(() => {
  apiKeyMock.findMany.mockReset();
  apiKeyMock.findFirst.mockReset();
  apiKeyMock.create.mockReset();
  apiKeyMock.update.mockReset();
  apiKeyMock.updateMany.mockReset();
  getDefaultTenantIdForUserMock.mockReset();
});

test('getUserApiKeys lists only active keys owned by the user without hashes', async () => {
  apiKeyMock.findMany.mockResolvedValue([]);

  await getUserApiKeys('user-1');

  expect(apiKeyMock.findMany).toHaveBeenCalledWith({
    where: {
      userId: 'user-1',
      deletedAt: null,
    },
    orderBy: {
      createdAt: 'desc',
    },
    select: {
      id: true,
      name: true,
      keyPrefix: true,
      createdAt: true,
      lastUsedAt: true,
    },
  });
});

test('createApiKey stores only a hash and returns the raw key once', async () => {
  getDefaultTenantIdForUserMock.mockResolvedValue('tenant-1');
  apiKeyMock.create.mockResolvedValue({
    id: 'key-1',
    name: 'MCP',
    keyPrefix: 'amami_live_abc',
  });

  const result = await createApiKey('user-1', 'MCP');
  const createArg = apiKeyMock.create.mock.calls[0][0];

  expect(createArg.data.userId).toBe('user-1');
  expect(createArg.data.tenantId).toBe('tenant-1');
  expect(createArg.data.name).toBe('MCP');
  expect(createArg.data.keyHash).toBe(hashApiKey(result.key));
  expect(createArg.data.keyPrefix).toBe(result.key.slice(0, 22));
  expect(createArg.data.keyHash).not.toContain(result.key);
  expect(result.key).toMatch(/^amami_live_/);
});

test('createApiKey persists the caller-supplied client type for MCP installation keys', async () => {
  getDefaultTenantIdForUserMock.mockResolvedValue('tenant-1');
  apiKeyMock.create.mockResolvedValue({
    id: 'key-2',
    name: 'Amami MCP',
    keyPrefix: 'amami_live_abc',
  });

  await createApiKey('user-1', 'Amami MCP', 'mcp');

  expect(apiKeyMock.create).toHaveBeenCalledWith(
    expect.objectContaining({ data: expect.objectContaining({ clientType: 'mcp' }) }),
  );
});

test('getApiKeyAuth looks up only active keys by hash and active users', async () => {
  apiKeyMock.findFirst.mockResolvedValue(null);

  await getApiKeyAuth('amami_live_secret');

  expect(apiKeyMock.findFirst).toHaveBeenCalledWith({
    where: {
      keyHash: hashApiKey('amami_live_secret'),
      deletedAt: null,
      user: {
        deletedAt: null,
      },
    },
    include: {
      user: true,
    },
  });
});

test('touchApiKey records the time an API key was last used', async () => {
  apiKeyMock.update.mockResolvedValue({ id: 'key-1' });

  await touchApiKey('key-1');

  expect(apiKeyMock.update).toHaveBeenCalledWith({
    where: { id: 'key-1' },
    data: { lastUsedAt: expect.any(Date) },
  });
});

test('deleteUserApiKey only revokes keys owned by the user', async () => {
  apiKeyMock.updateMany.mockResolvedValue({ count: 1 });

  await expect(deleteUserApiKey('user-1', 'key-1')).resolves.toBe(true);

  expect(apiKeyMock.updateMany).toHaveBeenCalledWith({
    where: {
      id: 'key-1',
      userId: 'user-1',
      deletedAt: null,
    },
    data: {
      deletedAt: expect.any(Date),
    },
  });
});

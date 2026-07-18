import { beforeEach, expect, test, vi } from 'vitest';
import { createOAuthAccount, getOAuthAccountUser } from './oauthAccount';
import { getOrCreateOAuthUser } from './user';

const {
  transactionMock,
  tenantCreateMock,
  userCreateMock,
  tenantUserCreateMock,
  subscriptionCreateMock,
} = vi.hoisted(() => ({
  transactionMock: vi.fn(),
  tenantCreateMock: vi.fn(),
  userCreateMock: vi.fn(),
  tenantUserCreateMock: vi.fn(),
  subscriptionCreateMock: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  default: {
    transaction: transactionMock,
    client: {
      tenant: { create: tenantCreateMock },
      user: { create: userCreateMock },
      tenantUser: { create: tenantUserCreateMock },
      tenantSubscription: { create: subscriptionCreateMock },
    },
  },
}));

vi.mock('./oauthAccount', () => ({
  createOAuthAccount: vi.fn(),
  getOAuthAccountUser: vi.fn(),
}));

const createOAuthAccountMock = vi.mocked(createOAuthAccount);
const getOAuthAccountUserMock = vi.mocked(getOAuthAccountUser);

beforeEach(() => {
  createOAuthAccountMock.mockReset();
  getOAuthAccountUserMock.mockReset();
  transactionMock.mockReset();
  tenantCreateMock.mockReset();
  userCreateMock.mockReset();
  tenantUserCreateMock.mockReset();
  subscriptionCreateMock.mockReset();
});

test('returns an existing provider account without creating another user', async () => {
  const existingUser = { id: 'existing-user' } as any;
  getOAuthAccountUserMock.mockResolvedValue(existingUser);

  await expect(
    getOrCreateOAuthUser({
      provider: 'google',
      providerAccountId: 'google-1',
      email: 'user@example.com',
    }),
  ).resolves.toBe(existingUser);

  expect(transactionMock).not.toHaveBeenCalled();
  expect(createOAuthAccountMock).not.toHaveBeenCalled();
});

test('creates a separate OAuth-only account instead of claiming a matching local username', async () => {
  tenantCreateMock.mockReturnValue({ kind: 'tenant' });
  userCreateMock.mockReturnValue({ kind: 'user' });
  tenantUserCreateMock.mockReturnValue({ kind: 'tenant-user' });
  subscriptionCreateMock.mockReturnValue({ kind: 'subscription' });
  transactionMock.mockResolvedValue([{ id: 'tenant-id' }, { id: 'oauth-user' }]);
  createOAuthAccountMock.mockResolvedValue({ user: { id: 'oauth-user' } } as any);

  await expect(
    getOrCreateOAuthUser({
      provider: 'github',
      providerAccountId: 'github-1',
      email: 'existing-local@example.com',
    }),
  ).resolves.toMatchObject({ id: 'oauth-user' });

  expect(userCreateMock).toHaveBeenCalledWith(
    expect.objectContaining({
      data: expect.objectContaining({ username: expect.stringMatching(/^oauth-[\da-f-]{36}$/) }),
    }),
  );
  expect(createOAuthAccountMock).toHaveBeenCalledWith(
    expect.objectContaining({
      userId: 'oauth-user',
      email: 'existing-local@example.com',
      provider: 'github',
    }),
  );
});

test('returns the provider account created concurrently by another request', async () => {
  tenantCreateMock.mockReturnValue({ kind: 'tenant' });
  userCreateMock.mockReturnValue({ kind: 'user' });
  tenantUserCreateMock.mockReturnValue({ kind: 'tenant-user' });
  subscriptionCreateMock.mockReturnValue({ kind: 'subscription' });
  transactionMock.mockResolvedValue([{ id: 'tenant-id' }, { id: 'discarded-user' }]);
  createOAuthAccountMock.mockRejectedValue({ code: 'P2002' });
  getOAuthAccountUserMock
    .mockResolvedValueOnce(null)
    .mockResolvedValueOnce({ id: 'concurrent-user' } as any);

  await expect(
    getOrCreateOAuthUser({
      provider: 'google',
      providerAccountId: 'google-1',
      email: 'user@example.com',
    }),
  ).resolves.toMatchObject({ id: 'concurrent-user' });
});

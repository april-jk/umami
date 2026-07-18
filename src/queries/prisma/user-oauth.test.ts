import { beforeEach, expect, test, vi } from 'vitest';
import { createOAuthAccount, getOAuthAccountUser } from './oauthAccount';
import { getOrCreateOAuthUser } from './user';

const {
  transactionMock,
  tenantCreateMock,
  userCreateMock,
  tenantUserCreateMock,
  subscriptionCreateMock,
  userFindUniqueMock,
} = vi.hoisted(() => ({
  transactionMock: vi.fn(),
  tenantCreateMock: vi.fn(),
  userCreateMock: vi.fn(),
  tenantUserCreateMock: vi.fn(),
  subscriptionCreateMock: vi.fn(),
  userFindUniqueMock: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  default: {
    transaction: transactionMock,
    client: {
      tenant: { create: tenantCreateMock },
      user: { create: userCreateMock, findUnique: userFindUniqueMock },
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
  userFindUniqueMock.mockReset();
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
  ).resolves.toEqual({ status: 'signed-in', user: existingUser });

  expect(transactionMock).not.toHaveBeenCalled();
  expect(createOAuthAccountMock).not.toHaveBeenCalled();
});

test('creates an OAuth account with its verified email when no local account matches', async () => {
  userFindUniqueMock.mockResolvedValue(null);
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
  ).resolves.toMatchObject({ status: 'signed-in', user: { id: 'oauth-user' } });

  expect(userCreateMock).toHaveBeenCalledWith(
    expect.objectContaining({
      data: expect.objectContaining({ username: 'existing-local@example.com' }),
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

test('requires a password-confirmed link for an existing email account', async () => {
  userFindUniqueMock.mockResolvedValue({ id: 'local-user', username: 'user@example.com' });

  await expect(
    getOrCreateOAuthUser({
      provider: 'google',
      providerAccountId: 'google-1',
      email: 'User@Example.com',
    }),
  ).resolves.toEqual({ status: 'link-required', email: 'user@example.com' });

  expect(transactionMock).not.toHaveBeenCalled();
  expect(createOAuthAccountMock).not.toHaveBeenCalled();
});

test('returns the provider account created concurrently by another request', async () => {
  userFindUniqueMock.mockResolvedValue(null);
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
  ).resolves.toMatchObject({ status: 'signed-in', user: { id: 'concurrent-user' } });
});

test('requires a link when another request creates the same email account first', async () => {
  userFindUniqueMock.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: 'local-user' });
  tenantCreateMock.mockReturnValue({ kind: 'tenant' });
  userCreateMock.mockReturnValue({ kind: 'user' });
  tenantUserCreateMock.mockReturnValue({ kind: 'tenant-user' });
  subscriptionCreateMock.mockReturnValue({ kind: 'subscription' });
  transactionMock.mockResolvedValue([{ id: 'tenant-id' }, { id: 'discarded-user' }]);
  createOAuthAccountMock.mockRejectedValue({ code: 'P2002' });
  getOAuthAccountUserMock.mockResolvedValueOnce(null).mockResolvedValueOnce(null);

  await expect(
    getOrCreateOAuthUser({
      provider: 'github',
      providerAccountId: 'github-1',
      email: 'user@example.com',
    }),
  ).resolves.toEqual({ status: 'link-required', email: 'user@example.com' });
});

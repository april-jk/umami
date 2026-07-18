import { beforeEach, expect, test, vi } from 'vitest';
import { getOAuthAccountUser } from './oauthAccount';
import { getOrCreateOAuthUser } from './user';

const {
  transactionMock,
  tenantCreateMock,
  userCreateMock,
  tenantUserCreateMock,
  subscriptionCreateMock,
  userFindUniqueMock,
  oauthAccountCreateMock,
} = vi.hoisted(() => ({
  transactionMock: vi.fn(),
  tenantCreateMock: vi.fn(),
  userCreateMock: vi.fn(),
  tenantUserCreateMock: vi.fn(),
  subscriptionCreateMock: vi.fn(),
  userFindUniqueMock: vi.fn(),
  oauthAccountCreateMock: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  default: {
    transaction: transactionMock,
    client: {
      tenant: { create: tenantCreateMock },
      user: { create: userCreateMock, findUnique: userFindUniqueMock },
      oAuthAccount: { create: oauthAccountCreateMock },
      tenantUser: { create: tenantUserCreateMock },
      tenantSubscription: { create: subscriptionCreateMock },
    },
  },
}));

vi.mock('./oauthAccount', () => ({
  getOAuthAccountUser: vi.fn(),
}));

const getOAuthAccountUserMock = vi.mocked(getOAuthAccountUser);

beforeEach(() => {
  getOAuthAccountUserMock.mockReset();
  transactionMock.mockReset();
  tenantCreateMock.mockReset();
  userCreateMock.mockReset();
  tenantUserCreateMock.mockReset();
  subscriptionCreateMock.mockReset();
  userFindUniqueMock.mockReset();
  oauthAccountCreateMock.mockReset();
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
  expect(oauthAccountCreateMock).not.toHaveBeenCalled();
});

test('signs in an existing provider account even when the provider no longer returns email', async () => {
  const existingUser = { id: 'existing-user' } as any;
  getOAuthAccountUserMock.mockResolvedValue(existingUser);

  await expect(
    getOrCreateOAuthUser({ provider: 'google', providerAccountId: 'google-1' }),
  ).resolves.toEqual({ status: 'signed-in', user: existingUser });

  expect(userFindUniqueMock).not.toHaveBeenCalled();
  expect(transactionMock).not.toHaveBeenCalled();
});

test('rejects a new provider identity without a verified email before provisioning a user', async () => {
  getOAuthAccountUserMock.mockResolvedValue(null);

  await expect(
    getOrCreateOAuthUser({ provider: 'github', providerAccountId: 'github-1' }),
  ).resolves.toEqual({ status: 'email-required' });

  expect(userFindUniqueMock).not.toHaveBeenCalled();
  expect(transactionMock).not.toHaveBeenCalled();
});

test('uses the verified email as the OAuth username when no account matches', async () => {
  userFindUniqueMock.mockResolvedValue(null);
  tenantCreateMock.mockReturnValue({ kind: 'tenant' });
  userCreateMock.mockReturnValue({ kind: 'user' });
  tenantUserCreateMock.mockReturnValue({ kind: 'tenant-user' });
  subscriptionCreateMock.mockReturnValue({ kind: 'subscription' });
  transactionMock.mockResolvedValue([{ id: 'tenant-id' }, { id: 'oauth-user' }]);
  oauthAccountCreateMock.mockReturnValue({ kind: 'oauth-account' });

  await expect(
    getOrCreateOAuthUser({
      provider: 'github',
      providerAccountId: 'github-1',
      email: 'existing-local@example.com',
    }),
  ).resolves.toMatchObject({ status: 'signed-in', user: { id: 'oauth-user' } });

  expect(userCreateMock).toHaveBeenCalledWith(
    expect.objectContaining({
      data: expect.objectContaining({
        email: 'existing-local@example.com',
        username: 'existing-local@example.com',
      }),
    }),
  );
  expect(oauthAccountCreateMock).toHaveBeenCalledWith(
    expect.objectContaining({
      data: expect.objectContaining({
        email: 'existing-local@example.com',
        provider: 'github',
        providerAccountId: 'github-1',
      }),
    }),
  );
});

test('rejects a new OAuth identity when its email is already another username', async () => {
  userFindUniqueMock.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: 'other-user' });

  await expect(
    getOrCreateOAuthUser({
      provider: 'github',
      providerAccountId: 'github-1',
      email: 'user@example.com',
    }),
  ).resolves.toEqual({ status: 'username-conflict' });

  expect(transactionMock).not.toHaveBeenCalled();
});

test('requires a password-confirmed link for an existing email account', async () => {
  userFindUniqueMock.mockResolvedValue({
    id: 'local-user',
    username: 'local-user',
    email: 'user@example.com',
  });

  await expect(
    getOrCreateOAuthUser({
      provider: 'google',
      providerAccountId: 'google-1',
      email: 'User@Example.com',
    }),
  ).resolves.toEqual({ status: 'link-required', email: 'user@example.com' });

  expect(transactionMock).not.toHaveBeenCalled();
  expect(oauthAccountCreateMock).not.toHaveBeenCalled();
});

test('returns the provider account created concurrently by another request', async () => {
  userFindUniqueMock.mockResolvedValue(null);
  tenantCreateMock.mockReturnValue({ kind: 'tenant' });
  userCreateMock.mockReturnValue({ kind: 'user' });
  tenantUserCreateMock.mockReturnValue({ kind: 'tenant-user' });
  subscriptionCreateMock.mockReturnValue({ kind: 'subscription' });
  transactionMock.mockResolvedValue([{ id: 'tenant-id' }, { id: 'discarded-user' }]);
  oauthAccountCreateMock.mockReturnValue({ kind: 'oauth-account' });
  transactionMock.mockRejectedValue({ code: 'P2002' });
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
  userFindUniqueMock
    .mockResolvedValueOnce(null)
    .mockResolvedValueOnce(null)
    .mockResolvedValueOnce({ id: 'local-user' })
    .mockResolvedValueOnce(null);
  tenantCreateMock.mockReturnValue({ kind: 'tenant' });
  userCreateMock.mockReturnValue({ kind: 'user' });
  tenantUserCreateMock.mockReturnValue({ kind: 'tenant-user' });
  subscriptionCreateMock.mockReturnValue({ kind: 'subscription' });
  transactionMock.mockResolvedValue([{ id: 'tenant-id' }, { id: 'discarded-user' }]);
  oauthAccountCreateMock.mockReturnValue({ kind: 'oauth-account' });
  transactionMock.mockRejectedValue({ code: 'P2002' });
  getOAuthAccountUserMock.mockResolvedValueOnce(null).mockResolvedValueOnce(null);

  await expect(
    getOrCreateOAuthUser({
      provider: 'github',
      providerAccountId: 'github-1',
      email: 'user@example.com',
    }),
  ).resolves.toEqual({ status: 'link-required', email: 'user@example.com' });
});

test('rejects a username collision created concurrently with OAuth provisioning', async () => {
  userFindUniqueMock
    .mockResolvedValueOnce(null)
    .mockResolvedValueOnce(null)
    .mockResolvedValueOnce(null)
    .mockResolvedValueOnce({ id: 'other-user' });
  tenantCreateMock.mockReturnValue({ kind: 'tenant' });
  userCreateMock.mockReturnValue({ kind: 'user' });
  tenantUserCreateMock.mockReturnValue({ kind: 'tenant-user' });
  subscriptionCreateMock.mockReturnValue({ kind: 'subscription' });
  transactionMock.mockRejectedValue({ code: 'P2002' });
  getOAuthAccountUserMock.mockResolvedValueOnce(null).mockResolvedValueOnce(null);

  await expect(
    getOrCreateOAuthUser({
      provider: 'github',
      providerAccountId: 'github-1',
      email: 'user@example.com',
    }),
  ).resolves.toEqual({ status: 'username-conflict' });
});

test('rolls back user provisioning when the provider binding cannot be created', async () => {
  userFindUniqueMock.mockResolvedValue(null);
  tenantCreateMock.mockReturnValue({ kind: 'tenant' });
  userCreateMock.mockReturnValue({ kind: 'user' });
  tenantUserCreateMock.mockReturnValue({ kind: 'tenant-user' });
  subscriptionCreateMock.mockReturnValue({ kind: 'subscription' });
  oauthAccountCreateMock.mockReturnValue({ kind: 'oauth-account' });
  transactionMock.mockRejectedValue(new Error('database unavailable'));

  await expect(
    getOrCreateOAuthUser({
      provider: 'google',
      providerAccountId: 'google-1',
      email: 'user@example.com',
    }),
  ).rejects.toThrow('database unavailable');

  expect(transactionMock).toHaveBeenCalledTimes(1);
});

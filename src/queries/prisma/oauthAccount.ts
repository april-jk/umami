import { uuid } from '@/lib/crypto';
import prisma from '@/lib/prisma';

const USER_SELECT = {
  id: true,
  username: true,
  password: true,
  role: true,
  createdAt: true,
};

export async function getOAuthAccountUser(provider: string, providerAccountId: string) {
  const account = await prisma.client.oAuthAccount.findUnique({
    where: {
      provider_providerAccountId: { provider, providerAccountId },
    },
    select: { user: { select: USER_SELECT } },
  });

  return account?.user ?? null;
}

export async function createOAuthAccount(data: {
  userId: string;
  provider: string;
  providerAccountId: string;
  email: string;
}) {
  return prisma.client.oAuthAccount.create({
    data: { id: uuid(), ...data },
    select: { user: { select: USER_SELECT } },
  });
}

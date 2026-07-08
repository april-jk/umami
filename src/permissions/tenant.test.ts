import { beforeEach, expect, test, vi } from 'vitest';
import { ROLES } from '@/lib/constants';
import { getTenantUser } from '@/queries/prisma/tenant';
import {
  canManageTenantBilling,
  canManageTenantMembers,
  canUpdateTenant,
  canViewTenant,
} from './tenant';

vi.mock('@/queries/prisma/tenant', () => ({
  getTenantUser: vi.fn(),
}));

const getTenantUserMock = vi.mocked(getTenantUser);

const auth = {
  user: {
    id: 'user-1',
    username: 'user',
    role: ROLES.user,
    isAdmin: false,
  },
};

beforeEach(() => {
  getTenantUserMock.mockReset();
});

test('tenant viewers can view but not update tenant settings', async () => {
  getTenantUserMock.mockResolvedValue({
    id: 'tenant-user-1',
    role: ROLES.tenantViewer,
  } as any);

  await expect(canViewTenant(auth, 'tenant-1')).resolves.toBe(true);
  await expect(canUpdateTenant(auth, 'tenant-1')).resolves.toBe(false);
});

test('tenant billing role cannot manage members', async () => {
  getTenantUserMock.mockResolvedValue({
    id: 'tenant-user-1',
    role: ROLES.tenantBilling,
  } as any);

  await expect(canManageTenantBilling(auth, 'tenant-1')).resolves.toBe(true);
  await expect(canManageTenantMembers(auth, 'tenant-1')).resolves.toBe(false);
});

test('tenant admins can update and manage members', async () => {
  getTenantUserMock.mockResolvedValue({
    id: 'tenant-user-1',
    role: ROLES.tenantAdmin,
  } as any);

  await expect(canUpdateTenant(auth, 'tenant-1')).resolves.toBe(true);
  await expect(canManageTenantMembers(auth, 'tenant-1')).resolves.toBe(true);
});

import { PERMISSIONS, ROLE_PERMISSIONS } from '@/lib/constants';
import type { Auth } from '@/lib/types';
import { ensureArray } from '@/lib/utils';
import { getTenantUser } from '@/queries/prisma/tenant';

function hasTenantPermission(role: string, permission: string | string[]) {
  return ensureArray(permission).some(e => ROLE_PERMISSIONS[role]?.includes(e));
}

export async function canViewTenant({ user }: Auth, tenantId: string) {
  if (!user) {
    return false;
  }

  if (user.isAdmin) {
    return true;
  }

  const tenantUser = await getTenantUser(tenantId, user.id);

  return tenantUser && hasTenantPermission(tenantUser.role, PERMISSIONS.tenantView);
}

export async function canCreateTenant({ user }: Auth) {
  if (!user) {
    return false;
  }

  if (user.isAdmin) {
    return true;
  }

  return hasTenantPermission(user.role, PERMISSIONS.tenantCreate);
}

export async function canUpdateTenant({ user }: Auth, tenantId: string) {
  if (!user) {
    return false;
  }

  if (user.isAdmin) {
    return true;
  }

  const tenantUser = await getTenantUser(tenantId, user.id);

  return tenantUser && hasTenantPermission(tenantUser.role, PERMISSIONS.tenantUpdate);
}

export async function canDeleteTenant({ user }: Auth, tenantId: string) {
  if (!user) {
    return false;
  }

  if (user.isAdmin) {
    return true;
  }

  const tenantUser = await getTenantUser(tenantId, user.id);

  return tenantUser && hasTenantPermission(tenantUser.role, PERMISSIONS.tenantDelete);
}

export async function canManageTenantBilling({ user }: Auth, tenantId: string) {
  if (!user) {
    return false;
  }

  if (user.isAdmin) {
    return true;
  }

  const tenantUser = await getTenantUser(tenantId, user.id);

  return tenantUser && hasTenantPermission(tenantUser.role, PERMISSIONS.tenantBillingManage);
}

export async function canManageTenantMembers({ user }: Auth, tenantId: string) {
  if (!user) {
    return false;
  }

  if (user.isAdmin) {
    return true;
  }

  const tenantUser = await getTenantUser(tenantId, user.id);

  return tenantUser && hasTenantPermission(tenantUser.role, PERMISSIONS.tenantMemberManage);
}

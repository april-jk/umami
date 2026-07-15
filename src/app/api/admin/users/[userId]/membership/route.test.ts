import { beforeEach, describe, expect, test, vi } from 'vitest';
import { createDefaultMembershipConfig } from '@/lib/membership-config';
import { parseRequest } from '@/lib/request';
import { getMembershipConfig } from '@/queries/prisma/membership-config';
import {
  getDefaultTenantIdForUser,
  getTenant,
  getTenantUsage,
  updateTenantAdminMembership,
} from '@/queries/prisma/tenant';
import { getUser } from '@/queries/prisma/user';
import { GET, POST } from './route';

vi.mock('@/lib/request', () => ({ parseRequest: vi.fn() }));
vi.mock('@/queries/prisma/tenant', () => ({
  getDefaultTenantIdForUser: vi.fn(),
  getTenant: vi.fn(),
  getTenantUsage: vi.fn(),
  updateTenantAdminMembership: vi.fn(),
}));
vi.mock('@/queries/prisma/user', () => ({ getUser: vi.fn() }));
vi.mock('@/queries/prisma/membership-config', () => ({ getMembershipConfig: vi.fn() }));

const parseRequestMock = vi.mocked(parseRequest);
const getDefaultTenantIdForUserMock = vi.mocked(getDefaultTenantIdForUser);
const getTenantMock = vi.mocked(getTenant);
const getTenantUsageMock = vi.mocked(getTenantUsage);
const updateTenantAdminMembershipMock = vi.mocked(updateTenantAdminMembership);
const getUserMock = vi.mocked(getUser);

const context = { params: Promise.resolve({ userId: 'user-1' }) };

function mockAuth(isAdmin: boolean, body: Record<string, unknown> = {}) {
  parseRequestMock.mockResolvedValue({
    auth: { user: { id: isAdmin ? 'admin-1' : 'user-2', isAdmin } },
    body,
    error: undefined,
  } as any);
}

function mockMembershipData(metadata: unknown = { source: 'existing' }) {
  getUserMock.mockResolvedValue({ id: 'user-1', username: 'member', tenantId: 'tenant-1' } as any);
  getTenantMock.mockResolvedValue({
    id: 'tenant-1',
    name: 'Member tenant',
    plan: 'starter',
    status: 'active',
    metadata,
    subscription: { billingProvider: 'paypal', plan: 'starter', status: 'active' },
  } as any);
  getTenantUsageMock.mockResolvedValue({
    plan: 'starter',
    month: '2026-07',
    membershipEndsAt: null,
    events: { used: 25, limit: 500_000 },
    websites: { used: 2, limit: 10 },
    members: { used: 1, limit: 1 },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getMembershipConfig).mockResolvedValue(createDefaultMembershipConfig());
});

describe('admin user membership API', () => {
  test.each([
    ['GET', GET],
    ['POST', POST],
  ])('%s rejects non-admin users', async (method, handler) => {
    mockAuth(false);

    const response = await handler(
      new Request('http://localhost/api/admin/users/user-1/membership', { method }),
      context,
    );

    expect(response.status).toBe(401);
    expect(getUserMock).not.toHaveBeenCalled();
  });

  test('returns request parsing errors before authorization checks', async () => {
    const response = new Response(null, { status: 400 });
    parseRequestMock.mockResolvedValue({ error: () => response } as any);

    expect(await GET(new Request('http://localhost'), context)).toBe(response);
  });

  test('GET returns effective limits, overrides, usage, and subscription state', async () => {
    mockAuth(true);
    mockMembershipData({ quotaOverrides: { eventLimit: 600_000, websiteLimit: null } });

    const response = await GET(new Request('http://localhost'), context);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.tenant.quotaOverrides).toEqual({ eventLimit: 600_000, websiteLimit: null });
    expect(data.tenant.effectiveLimits).toMatchObject({
      eventLimit: 600_000,
      websiteLimit: null,
      memberLimit: 1,
      retentionDays: 180,
    });
    expect(data.usage.events.used).toBe(25);
  });

  test('GET falls back to an owned personal tenant and handles users without a tenant', async () => {
    mockAuth(true);
    getUserMock.mockResolvedValue({ id: 'user-1', tenantId: null } as any);
    getDefaultTenantIdForUserMock.mockResolvedValueOnce(null);

    const response = await GET(new Request('http://localhost'), context);

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ tenant: null, usage: null });
  });

  test('GET returns not found for an unknown user', async () => {
    mockAuth(true);
    getUserMock.mockResolvedValue(null);

    expect((await GET(new Request('http://localhost'), context)).status).toBe(404);
  });

  test('POST preserves metadata and saves custom, unlimited, and inherited quota modes', async () => {
    mockAuth(true, {
      plan: 'pro',
      status: 'suspended',
      quotaOverrides: {
        eventLimit: 900_000,
        websiteLimit: null,
        memberLimit: 'inherit',
      },
    });
    mockMembershipData({
      source: 'existing',
      quotaOverrides: { memberLimit: 4 },
    });
    updateTenantAdminMembershipMock.mockResolvedValue({} as any);

    const response = await POST(
      new Request('http://localhost/api/admin/users/user-1/membership', { method: 'POST' }),
      context,
    );

    expect(response.status).toBe(200);
    expect(updateTenantAdminMembershipMock).toHaveBeenCalledWith('tenant-1', {
      plan: 'pro',
      status: 'suspended',
      metadata: {
        source: 'existing',
        quotaOverrides: { eventLimit: 900_000, websiteLimit: null },
      },
    });
  });

  test('POST removes the quotaOverrides metadata key when all values inherit', async () => {
    mockAuth(true, { quotaOverrides: { eventLimit: 'inherit' } });
    mockMembershipData({ source: 'existing', quotaOverrides: { eventLimit: 100 } });

    const response = await POST(new Request('http://localhost', { method: 'POST' }), context);

    expect(response.status).toBe(200);
    expect(updateTenantAdminMembershipMock).toHaveBeenCalledWith('tenant-1', {
      plan: undefined,
      status: undefined,
      metadata: { source: 'existing' },
    });
  });

  test('POST returns not found when the user or tenant is missing', async () => {
    mockAuth(true);
    getUserMock.mockResolvedValueOnce(null);
    expect((await POST(new Request('http://localhost', { method: 'POST' }), context)).status).toBe(
      404,
    );

    getUserMock.mockResolvedValue({ id: 'user-1', tenantId: null } as any);
    getDefaultTenantIdForUserMock.mockResolvedValueOnce(null);
    expect((await POST(new Request('http://localhost', { method: 'POST' }), context)).status).toBe(
      404,
    );

    getUserMock.mockResolvedValue({ id: 'user-1', tenantId: 'tenant-1' } as any);
    getTenantMock.mockResolvedValue(null);
    expect((await POST(new Request('http://localhost', { method: 'POST' }), context)).status).toBe(
      404,
    );
  });
});

import { beforeEach, describe, expect, test, vi } from 'vitest';
import { createDefaultMembershipConfig } from '@/lib/membership-config';
import { createPaypalSubscription } from '@/lib/paypal';
import { parseRequest } from '@/lib/request';
import { canManageTenantBilling } from '@/permissions/tenant';
import { getMembershipConfig } from '@/queries/prisma/membership-config';
import { getTenant } from '@/queries/prisma/tenant';
import { POST } from './route';

vi.mock('@/lib/paypal', () => ({ createPaypalSubscription: vi.fn() }));
vi.mock('@/lib/request', () => ({ parseRequest: vi.fn() }));
vi.mock('@/permissions/tenant', () => ({ canManageTenantBilling: vi.fn() }));
vi.mock('@/queries/prisma/tenant', () => ({ getTenant: vi.fn() }));
vi.mock('@/queries/prisma/membership-config', () => ({ getMembershipConfig: vi.fn() }));

const createPaypalSubscriptionMock = vi.mocked(createPaypalSubscription);
const parseRequestMock = vi.mocked(parseRequest);
const canManageTenantBillingMock = vi.mocked(canManageTenantBilling);
const getTenantMock = vi.mocked(getTenant);
const getMembershipConfigMock = vi.mocked(getMembershipConfig);

beforeEach(() => {
  vi.clearAllMocks();
  getMembershipConfigMock.mockResolvedValue(createDefaultMembershipConfig());
});

describe('POST /api/tenants/[tenantId]/billing/paypal/subscription', () => {
  const request = new Request('http://localhost/api/tenants/tenant-1/billing/paypal/subscription', {
    method: 'POST',
  });
  const context = { params: Promise.resolve({ tenantId: 'tenant-1' }) };

  test('returns parser failures before billing checks', async () => {
    const errorResponse = new Response(null, { status: 400 });
    parseRequestMock.mockResolvedValue({ error: () => errorResponse } as any);

    expect(await POST(request, context)).toBe(errorResponse);
    expect(canManageTenantBillingMock).not.toHaveBeenCalled();
  });

  test('creates a subscription for a tenant billing member', async () => {
    parseRequestMock.mockResolvedValue({
      auth: { user: { id: 'user-1', isAdmin: false } },
      body: { plan: 'starter', interval: 'year' },
    } as any);
    canManageTenantBillingMock.mockResolvedValue(true);
    getTenantMock.mockResolvedValue({ id: 'tenant-1' } as any);
    createPaypalSubscriptionMock.mockResolvedValue({
      id: 'sub-1',
      approveUrl: 'https://paypal.test/approve',
    });

    const response = await POST(request, context);

    expect(response.status).toBe(200);
    expect(createPaypalSubscriptionMock).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: 'tenant-1', plan: 'starter', interval: 'year' }),
    );
  });

  test('forbids users without billing permission', async () => {
    parseRequestMock.mockResolvedValue({
      auth: { user: { id: 'user-2', isAdmin: false } },
      body: { plan: 'starter', interval: 'year' },
    } as any);
    canManageTenantBillingMock.mockResolvedValue(false);

    const response = await POST(request, context);

    expect(response.status).toBe(403);
    expect(getTenantMock).not.toHaveBeenCalled();
    expect(createPaypalSubscriptionMock).not.toHaveBeenCalled();
  });

  test('returns not found when the tenant no longer exists', async () => {
    parseRequestMock.mockResolvedValue({
      auth: { user: { id: 'user-1', isAdmin: false } },
      body: { plan: 'starter', interval: 'year' },
    } as any);
    canManageTenantBillingMock.mockResolvedValue(true);
    getTenantMock.mockResolvedValue(null);

    const response = await POST(request, context);

    expect(response.status).toBe(404);
    expect(getMembershipConfigMock).not.toHaveBeenCalled();
    expect(createPaypalSubscriptionMock).not.toHaveBeenCalled();
  });

  test('rejects a plan disabled by membership configuration', async () => {
    const config = createDefaultMembershipConfig();
    config.plans.starter.available = false;
    getMembershipConfigMock.mockResolvedValue(config);
    parseRequestMock.mockResolvedValue({
      auth: { user: { id: 'user-1', isAdmin: false } },
      body: { plan: 'starter', interval: 'year' },
    } as any);
    canManageTenantBillingMock.mockResolvedValue(true);
    getTenantMock.mockResolvedValue({ id: 'tenant-1' } as any);

    const response = await POST(request, context);

    expect(response.status).toBe(400);
    expect(createPaypalSubscriptionMock).not.toHaveBeenCalled();
  });
});

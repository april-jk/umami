import { beforeEach, describe, expect, test, vi } from 'vitest';
import { createPaypalSubscription } from '@/lib/paypal';
import { parseRequest } from '@/lib/request';
import { canManageTenantBilling } from '@/permissions/tenant';
import { getTenant } from '@/queries/prisma/tenant';
import { POST } from './route';

vi.mock('@/lib/paypal', () => ({ createPaypalSubscription: vi.fn() }));
vi.mock('@/lib/request', () => ({ parseRequest: vi.fn() }));
vi.mock('@/permissions/tenant', () => ({ canManageTenantBilling: vi.fn() }));
vi.mock('@/queries/prisma/tenant', () => ({ getTenant: vi.fn() }));

const createPaypalSubscriptionMock = vi.mocked(createPaypalSubscription);
const parseRequestMock = vi.mocked(parseRequest);
const canManageTenantBillingMock = vi.mocked(canManageTenantBilling);
const getTenantMock = vi.mocked(getTenant);

beforeEach(() => vi.clearAllMocks());

describe('POST /api/tenants/[tenantId]/billing/paypal/subscription', () => {
  const request = new Request('http://localhost/api/tenants/tenant-1/billing/paypal/subscription', {
    method: 'POST',
  });
  const context = { params: Promise.resolve({ tenantId: 'tenant-1' }) };

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
});

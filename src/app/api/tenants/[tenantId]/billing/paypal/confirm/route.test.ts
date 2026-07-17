import { beforeEach, describe, expect, test, vi } from 'vitest';
import { findConfiguredPlan, getPaypalSubscription } from '@/lib/paypal';
import { parseRequest } from '@/lib/request';
import { activatePaypalSubscription } from '@/lib/tenant-billing';
import { canManageTenantBilling } from '@/permissions/tenant';
import { getTenant } from '@/queries/prisma/tenant';
import { POST } from './route';

vi.mock('@/lib/paypal', () => ({ findConfiguredPlan: vi.fn(), getPaypalSubscription: vi.fn() }));
vi.mock('@/lib/request', () => ({ parseRequest: vi.fn() }));
vi.mock('@/lib/tenant-billing', () => ({ activatePaypalSubscription: vi.fn() }));
vi.mock('@/permissions/tenant', () => ({ canManageTenantBilling: vi.fn() }));
vi.mock('@/queries/prisma/tenant', () => ({ getTenant: vi.fn() }));

const parseRequestMock = vi.mocked(parseRequest);
const getTenantMock = vi.mocked(getTenant);
const canManageTenantBillingMock = vi.mocked(canManageTenantBilling);
const getPaypalSubscriptionMock = vi.mocked(getPaypalSubscription);
const findConfiguredPlanMock = vi.mocked(findConfiguredPlan);

const context = { params: Promise.resolve({ tenantId: 'tenant-1' }) };
const request = new Request('http://localhost/api/tenants/tenant-1/billing/paypal/confirm', {
  method: 'POST',
});

beforeEach(() => {
  vi.clearAllMocks();
  parseRequestMock.mockResolvedValue({
    auth: { user: { id: 'user-1' } },
    body: { subscriptionId: 'new-subscription' },
  } as any);
  canManageTenantBillingMock.mockResolvedValue(true);
  getTenantMock.mockResolvedValue({ id: 'tenant-1', subscription: null } as any);
  getPaypalSubscriptionMock.mockResolvedValue({
    id: 'new-subscription',
    status: 'ACTIVE',
    plan_id: 'plan-1',
    custom_id: 'tenant-1:pro:year',
  } as any);
  findConfiguredPlanMock.mockReturnValue({ plan: 'pro', interval: 'year', currency: 'USD' });
});

describe('POST /api/tenants/[tenantId]/billing/paypal/confirm', () => {
  test('activates a verified subscription', async () => {
    const response = await POST(request, context);

    expect(response.status).toBe(200);
    expect(activatePaypalSubscription).toHaveBeenCalledWith(
      'tenant-1',
      'pro',
      expect.objectContaining({ id: 'new-subscription' }),
    );
  });

  test('rejects parser, authorization, tenant, and PayPal verification failures', async () => {
    parseRequestMock.mockResolvedValueOnce({ error: () => new Response(null, { status: 400 }) } as any);
    expect((await POST(request, context)).status).toBe(400);

    canManageTenantBillingMock.mockResolvedValueOnce(false);
    expect((await POST(request, context)).status).toBe(403);

    getTenantMock.mockResolvedValueOnce(null);
    expect((await POST(request, context)).status).toBe(404);

    getPaypalSubscriptionMock.mockResolvedValueOnce({ status: 'CANCELLED' } as any);
    expect((await POST(request, context)).status).toBe(401);
  });

  test('does not overwrite a different active PayPal subscription', async () => {
    getTenantMock.mockResolvedValue({
      id: 'tenant-1',
      subscription: {
        billingProvider: 'paypal',
        billingSubscriptionId: 'existing-subscription',
        currentPeriodEnd: new Date('2099-01-01'),
      },
    } as any);

    const response = await POST(request, context);

    expect(response.status).toBe(400);
    expect(activatePaypalSubscription).not.toHaveBeenCalled();
  });
});

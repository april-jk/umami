import { beforeEach, expect, test, vi } from 'vitest';
import { parseRequest } from '@/lib/request';
import { canManageTenantBilling } from '@/permissions/tenant';
import { ActivationCodeError, redeemActivationCode } from '@/queries/prisma/activation-code';
import { POST } from './route';

vi.mock('@/lib/request', () => ({ parseRequest: vi.fn() }));
vi.mock('@/permissions/tenant', () => ({ canManageTenantBilling: vi.fn() }));
vi.mock('@/queries/prisma/activation-code', () => ({
  ActivationCodeError: class ActivationCodeError extends Error {
    code: string;
    constructor(code: string, message: string) {
      super(message);
      this.code = code;
    }
  },
  redeemActivationCode: vi.fn(),
}));

const parseRequestMock = vi.mocked(parseRequest);
const canManageTenantBillingMock = vi.mocked(canManageTenantBilling);

beforeEach(() => {
  vi.clearAllMocks();
  canManageTenantBillingMock.mockResolvedValue(true);
});

test('redeems a code for the authenticated user', async () => {
  parseRequestMock.mockResolvedValue({
    auth: { user: { id: 'user-1' } },
    body: { code: 'AMAMI-1234', tenantId: 'tenant-1' },
  } as any);
  vi.mocked(redeemActivationCode).mockResolvedValue({ plan: 'pro' } as any);
  const response = await POST(new Request('http://localhost', { method: 'POST' }));
  expect(response.status).toBe(200);
  expect(canManageTenantBillingMock).toHaveBeenCalledWith({ user: { id: 'user-1' } }, 'tenant-1');
  expect(redeemActivationCode).toHaveBeenCalledWith('user-1', 'tenant-1', 'AMAMI-1234');
});

test('rejects users who cannot manage billing for the target workspace', async () => {
  parseRequestMock.mockResolvedValue({
    auth: { user: { id: 'member-1' } },
    body: { code: 'AMAMI-1234', tenantId: 'tenant-1' },
  } as any);
  canManageTenantBillingMock.mockResolvedValue(false);

  const response = await POST(new Request('http://localhost', { method: 'POST' }));

  expect(response.status).toBe(403);
  expect(redeemActivationCode).not.toHaveBeenCalled();
});

test('maps invalid codes and parser failures', async () => {
  parseRequestMock.mockResolvedValue({ error: () => new Response(null, { status: 422 }) } as any);
  expect((await POST(new Request('http://localhost', { method: 'POST' }))).status).toBe(422);

  parseRequestMock.mockResolvedValue({
    auth: { user: { id: 'user-1' } },
    body: { code: 'BAD', tenantId: 'tenant-1' },
  } as any);
  vi.mocked(redeemActivationCode).mockRejectedValue(new ActivationCodeError('invalid', 'Nope'));
  const response = await POST(new Request('http://localhost', { method: 'POST' }));
  expect(response.status).toBe(400);
  expect((await response.json()).error.message).toBe('Nope');
});

test('preserves unexpected redemption failures', async () => {
  parseRequestMock.mockResolvedValue({
    auth: { user: { id: 'user-1' } },
    body: { code: 'AMAMI-1234', tenantId: 'tenant-1' },
  } as any);
  const failure = new Error('database unavailable');
  vi.mocked(redeemActivationCode).mockRejectedValue(failure);
  await expect(POST(new Request('http://localhost', { method: 'POST' }))).rejects.toBe(failure);
});

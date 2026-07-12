import { beforeEach, describe, expect, test, vi } from 'vitest';
import { parseRequest } from '@/lib/request';
import { canViewTenant } from '@/permissions/tenant';
import { getTenantUsage } from '@/queries/prisma/tenant';
import { GET } from './route';

vi.mock('@/lib/request', () => ({
  parseRequest: vi.fn(),
}));

vi.mock('@/permissions/tenant', () => ({
  canViewTenant: vi.fn(),
}));

vi.mock('@/queries/prisma/tenant', () => ({
  getTenantUsage: vi.fn(),
}));

const parseRequestMock = vi.mocked(parseRequest);
const canViewTenantMock = vi.mocked(canViewTenant);
const getTenantUsageMock = vi.mocked(getTenantUsage);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/tenants/[tenantId]/usage', () => {
  test('returns usage stats for authorized member', async () => {
    parseRequestMock.mockResolvedValue({
      auth: { user: { id: 'user-1' } },
      error: undefined,
    } as any);
    canViewTenantMock.mockResolvedValue(true);
    getTenantUsageMock.mockResolvedValue({
      plan: 'pro',
      month: '2026-07',
      events: { used: 500_000, limit: 1_000_000 },
      websites: { used: 15, limit: 25 },
      members: { used: 3, limit: 5 },
    });

    const response = await GET(
      new Request('http://localhost/api/tenants/tenant-1/usage'),
      { params: Promise.resolve({ tenantId: 'tenant-1' }) },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.plan).toBe('pro');
    expect(body.events).toEqual({ used: 500_000, limit: 1_000_000 });
    expect(body.websites).toEqual({ used: 15, limit: 25 });
    expect(body.members).toEqual({ used: 3, limit: 5 });
    expect(canViewTenantMock).toHaveBeenCalledWith(expect.anything(), 'tenant-1');
  });

  test('returns unauthorized for non-member', async () => {
    parseRequestMock.mockResolvedValue({
      auth: { user: { id: 'user-1' } },
      error: undefined,
    } as any);
    canViewTenantMock.mockResolvedValue(false);

    const response = await GET(
      new Request('http://localhost/api/tenants/tenant-1/usage'),
      { params: Promise.resolve({ tenantId: 'tenant-1' }) },
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error.message).toBe('You must be a member of this tenant.');
    expect(getTenantUsageMock).not.toHaveBeenCalled();
  });

  test('handles parse error', async () => {
    parseRequestMock.mockResolvedValue({
      error: () => new Response(JSON.stringify({ error: { message: 'Invalid request' } }), { status: 400 }),
    } as any);

    const response = await GET(
      new Request('http://localhost/api/tenants/tenant-1/usage'),
      { params: Promise.resolve({ tenantId: 'tenant-1' }) },
    );

    expect(response.status).toBe(400);
  });

  test('returns free plan defaults when tenant has no usage', async () => {
    parseRequestMock.mockResolvedValue({
      auth: { user: { id: 'user-1' } },
      error: undefined,
    } as any);
    canViewTenantMock.mockResolvedValue(true);
    getTenantUsageMock.mockResolvedValue({
      plan: 'free',
      month: '2026-07',
      events: { used: 0, limit: 100_000 },
      websites: { used: 0, limit: 5 },
      members: { used: 0, limit: 1 },
    });

    const response = await GET(
      new Request('http://localhost/api/tenants/tenant-1/usage'),
      { params: Promise.resolve({ tenantId: 'tenant-1' }) },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.events.used).toBe(0);
    expect(body.events.limit).toBe(100_000);
  });

  test('returns enterprise unlimited limits', async () => {
    parseRequestMock.mockResolvedValue({
      auth: { user: { id: 'user-1' } },
      error: undefined,
    } as any);
    canViewTenantMock.mockResolvedValue(true);
    getTenantUsageMock.mockResolvedValue({
      plan: 'enterprise',
      month: '2026-07',
      events: { used: 50_000_000, limit: null },
      websites: { used: 100, limit: null },
      members: { used: 50, limit: null },
    });

    const response = await GET(
      new Request('http://localhost/api/tenants/tenant-1/usage'),
      { params: Promise.resolve({ tenantId: 'tenant-1' }) },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.events.limit).toBeNull();
    expect(body.websites.limit).toBeNull();
    expect(body.members.limit).toBeNull();
  });
});

import { beforeEach, describe, expect, test, vi } from 'vitest';
import { parseRequest } from '@/lib/request';
import { canTransferWebsiteToTeam, canTransferWebsiteToUser } from '@/permissions';
import { getWebsite, updateWebsite } from '@/queries/prisma';
import {
  canCreateTenantWebsite,
  getDefaultTenantIdForUser,
  getTenantIdForTeam,
  getTenantPlan,
  getTenantWebsiteCount,
} from '@/queries/prisma/tenant';
import { POST } from './route';

vi.mock('@/lib/request', () => ({ parseRequest: vi.fn() }));
vi.mock('@/permissions', () => ({
  canTransferWebsiteToTeam: vi.fn(),
  canTransferWebsiteToUser: vi.fn(),
}));
vi.mock('@/queries/prisma', () => ({ getWebsite: vi.fn(), updateWebsite: vi.fn() }));
vi.mock('@/queries/prisma/tenant', () => ({
  canCreateTenantWebsite: vi.fn(),
  getDefaultTenantIdForUser: vi.fn(),
  getTenantIdForTeam: vi.fn(),
  getTenantPlan: vi.fn(),
  getTenantWebsiteCount: vi.fn(),
}));

const parseRequestMock = vi.mocked(parseRequest);
const getWebsiteMock = vi.mocked(getWebsite);
const updateWebsiteMock = vi.mocked(updateWebsite);
const canCreateTenantWebsiteMock = vi.mocked(canCreateTenantWebsite);

function request() {
  return new Request('http://localhost/api/websites/website-1/transfer', { method: 'POST' });
}

beforeEach(() => {
  delete process.env.CLOUD_MODE;
  vi.clearAllMocks();
  vi.mocked(canTransferWebsiteToUser).mockResolvedValue(true);
  vi.mocked(canTransferWebsiteToTeam).mockResolvedValue(true);
  getWebsiteMock.mockResolvedValue({ id: 'website-1', tenantId: 'tenant-1' } as any);
  canCreateTenantWebsiteMock.mockResolvedValue(true);
  updateWebsiteMock.mockResolvedValue({ id: 'website-1' } as any);
});

describe('POST', () => {
  test('returns request parsing errors', async () => {
    parseRequestMock.mockResolvedValue({ error: () => new Response(null, { status: 400 }) });
    expect(
      (await POST(request(), { params: Promise.resolve({ websiteId: 'website-1' }) })).status,
    ).toBe(400);
  });

  test('rejects unauthorized user transfers', async () => {
    parseRequestMock.mockResolvedValue({ auth: {}, body: { userId: 'user-2' }, error: undefined });
    vi.mocked(canTransferWebsiteToUser).mockResolvedValue(false);
    expect(
      (await POST(request(), { params: Promise.resolve({ websiteId: 'website-1' }) })).status,
    ).toBe(401);
  });

  test('syncs tenant ownership when transferring to a user', async () => {
    parseRequestMock.mockResolvedValue({ auth: {}, body: { userId: 'user-2' }, error: undefined });
    vi.mocked(getDefaultTenantIdForUser).mockResolvedValue('tenant-2');

    expect(
      (await POST(request(), { params: Promise.resolve({ websiteId: 'website-1' }) })).status,
    ).toBe(200);
    expect(updateWebsiteMock).toHaveBeenCalledWith('website-1', {
      userId: 'user-2',
      teamId: null,
      tenantId: 'tenant-2',
    });
    expect(canCreateTenantWebsiteMock).not.toHaveBeenCalled();
  });

  test('blocks cross-tenant user transfer when target capacity is exhausted', async () => {
    process.env.CLOUD_MODE = '1';
    parseRequestMock.mockResolvedValue({ auth: {}, body: { userId: 'user-2' }, error: undefined });
    vi.mocked(getDefaultTenantIdForUser).mockResolvedValue('tenant-2');
    canCreateTenantWebsiteMock.mockResolvedValue(false);
    vi.mocked(getTenantPlan).mockResolvedValue({ plan: 'starter' });
    vi.mocked(getTenantWebsiteCount).mockResolvedValue(10);

    const response = await POST(request(), {
      params: Promise.resolve({ websiteId: 'website-1' }),
    });
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error).toMatchObject({
      type: 'plan-limit',
      resource: 'website',
      currentPlan: 'starter',
      recommendedPlan: 'pro',
    });
    expect(updateWebsiteMock).not.toHaveBeenCalled();
  });

  test('skips capacity checks when a team transfer stays in the same tenant', async () => {
    process.env.CLOUD_MODE = '1';
    parseRequestMock.mockResolvedValue({ auth: {}, body: { teamId: 'team-2' }, error: undefined });
    vi.mocked(getTenantIdForTeam).mockResolvedValue('tenant-1');

    expect(
      (await POST(request(), { params: Promise.resolve({ websiteId: 'website-1' }) })).status,
    ).toBe(200);
    expect(canCreateTenantWebsiteMock).not.toHaveBeenCalled();
    expect(updateWebsiteMock).toHaveBeenCalledWith('website-1', {
      userId: null,
      teamId: 'team-2',
      tenantId: 'tenant-1',
    });
  });

  test('rejects unauthorized team transfers', async () => {
    parseRequestMock.mockResolvedValue({ auth: {}, body: { teamId: 'team-2' }, error: undefined });
    vi.mocked(canTransferWebsiteToTeam).mockResolvedValue(false);
    expect(
      (await POST(request(), { params: Promise.resolve({ websiteId: 'website-1' }) })).status,
    ).toBe(401);
  });

  test('rejects transfers without a destination', async () => {
    parseRequestMock.mockResolvedValue({ auth: {}, body: {}, error: undefined });
    expect(
      (await POST(request(), { params: Promise.resolve({ websiteId: 'website-1' }) })).status,
    ).toBe(400);
  });
});

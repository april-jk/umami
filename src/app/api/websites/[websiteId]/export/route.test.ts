import { beforeEach, expect, test, vi } from 'vitest';
import { getQueryFilters, parseRequest } from '@/lib/request';
import { canViewAuthenticatedWebsite } from '@/permissions';
import { getWebsiteEntitlement } from '@/queries/prisma/tenant-entitlement';
import { getEventMetrics, getPageviewMetrics, getSessionMetrics } from '@/queries/sql';
import { GET } from './route';

vi.mock('@/lib/request', () => ({ parseRequest: vi.fn(), getQueryFilters: vi.fn() }));
vi.mock('@/permissions', () => ({ canViewAuthenticatedWebsite: vi.fn() }));
vi.mock('@/queries/prisma/tenant-entitlement', () => ({ getWebsiteEntitlement: vi.fn() }));
vi.mock('@/queries/sql', () => ({
  getEventMetrics: vi.fn(),
  getPageviewMetrics: vi.fn(),
  getSessionMetrics: vi.fn(),
}));

const parseRequestMock = vi.mocked(parseRequest);
const canViewMock = vi.mocked(canViewAuthenticatedWebsite);
const entitlementMock = vi.mocked(getWebsiteEntitlement);

beforeEach(() => {
  delete process.env.CLOUD_MODE;
  delete process.env.MEMBERSHIP_ENABLED;
  vi.clearAllMocks();
  parseRequestMock.mockResolvedValue({ auth: {}, query: {}, error: undefined });
  vi.mocked(getQueryFilters).mockResolvedValue({} as any);
  canViewMock.mockResolvedValue(true);
  entitlementMock.mockResolvedValue({
    tenantId: 'tenant-1',
    plan: 'starter',
    allowed: true,
    value: 10_000,
  });
  vi.mocked(getEventMetrics).mockResolvedValue([
    { name: '=formula', category: 'safe-value', count: 1 },
  ] as any);
  vi.mocked(getPageviewMetrics).mockResolvedValue([] as any);
  vi.mocked(getSessionMetrics).mockResolvedValue([] as any);
});

test('returns request parsing errors', async () => {
  parseRequestMock.mockResolvedValue({ error: () => new Response(null, { status: 400 }) });
  const response = await GET(new Request('http://localhost'), {
    params: Promise.resolve({ websiteId: 'website-1' }),
  });
  expect(response.status).toBe(400);
});

test('rejects unauthorized exports', async () => {
  canViewMock.mockResolvedValue(false);
  const response = await GET(new Request('http://localhost'), {
    params: Promise.resolve({ websiteId: 'website-1' }),
  });
  expect(response.status).toBe(401);
});

test('blocks CSV export when the cloud plan does not include it', async () => {
  process.env.CLOUD_MODE = '1';
  entitlementMock.mockResolvedValue({
    tenantId: 'tenant-1',
    plan: 'free',
    allowed: false,
    value: 0,
  });
  const response = await GET(new Request('http://localhost'), {
    params: Promise.resolve({ websiteId: 'website-1' }),
  });
  const body = await response.json();
  expect(response.status).toBe(403);
  expect(body.error.code).toBe('csv-export-limit-reached');
  expect(body.error).toMatchObject({
    type: 'plan-limit',
    resource: 'csvExport',
    currentPlan: 'free',
    recommendedPlan: 'starter',
    upgradeUrl: '/membership/upgrade?reason=csvExport',
  });
});

test('blocks CSV exports above the plan row limit', async () => {
  process.env.MEMBERSHIP_ENABLED = '1';
  vi.mocked(getEventMetrics).mockResolvedValue(
    Array.from({ length: 10_001 }, (_, index) => ({ name: `event-${index}` })) as any,
  );

  const response = await GET(new Request('http://localhost'), {
    params: Promise.resolve({ websiteId: 'website-1' }),
  });
  const body = await response.json();

  expect(response.status).toBe(403);
  expect(body.error).toMatchObject({
    code: 'csv-export-limit-reached',
    current: 10_001,
    limit: 10_000,
    currentPlan: 'starter',
    recommendedPlan: 'pro',
  });
});

test('allows unlimited Enterprise CSV exports', async () => {
  process.env.MEMBERSHIP_ENABLED = '1';
  entitlementMock.mockResolvedValue({
    tenantId: 'tenant-1',
    plan: 'enterprise',
    allowed: true,
    value: null,
  });
  vi.mocked(getEventMetrics).mockResolvedValue(
    Array.from({ length: 10_001 }, (_, index) => ({ name: `event-${index}` })) as any,
  );

  const response = await GET(new Request('http://localhost'), {
    params: Promise.resolve({ websiteId: 'website-1' }),
  });

  expect(response.status).toBe(200);
});

test('returns a CSV zip for entitled plans', async () => {
  process.env.CLOUD_MODE = '1';
  const response = await GET(new Request('http://localhost'), {
    params: Promise.resolve({ websiteId: 'website-1' }),
  });
  const body = await response.json();
  expect(response.status).toBe(200);
  expect(body.zip).toEqual(expect.any(String));
  expect(entitlementMock).toHaveBeenCalledWith('website-1', 'csvExport');
});

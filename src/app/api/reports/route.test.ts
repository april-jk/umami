import { beforeEach, describe, expect, test, vi } from 'vitest';
import { parseRequest } from '@/lib/request';
import {
  canUpdateWebsite,
  canViewAuthenticatedWebsite,
  canViewWebsiteSection,
} from '@/permissions';
import { createReport, getReports } from '@/queries/prisma';
import { getTenantGoalCount, getWebsiteEntitlement } from '@/queries/prisma/tenant-entitlement';
import { GET, POST } from './route';

vi.mock('@/lib/crypto', () => ({ uuid: () => 'report-1' }));
vi.mock('@/lib/request', () => ({ parseRequest: vi.fn() }));
vi.mock('@/permissions', () => ({
  canUpdateWebsite: vi.fn(),
  canViewAuthenticatedWebsite: vi.fn(),
  canViewWebsiteSection: vi.fn(),
}));
vi.mock('@/queries/prisma', () => ({ createReport: vi.fn(), getReports: vi.fn() }));
vi.mock('@/queries/prisma/tenant-entitlement', () => ({
  getTenantGoalCount: vi.fn(),
  getWebsiteEntitlement: vi.fn(),
}));

const parseRequestMock = vi.mocked(parseRequest);
const canUpdateMock = vi.mocked(canUpdateWebsite);
const entitlementMock = vi.mocked(getWebsiteEntitlement);

beforeEach(() => {
  delete process.env.CLOUD_MODE;
  delete process.env.MEMBERSHIP_ENABLED;
  vi.clearAllMocks();
  canUpdateMock.mockResolvedValue(true);
  vi.mocked(canViewAuthenticatedWebsite).mockResolvedValue(true);
  vi.mocked(canViewWebsiteSection).mockResolvedValue(true);
  vi.mocked(getReports).mockResolvedValue({ data: [], count: 0 } as any);
  entitlementMock.mockResolvedValue({
    tenantId: 'tenant-1',
    plan: 'starter',
    allowed: true,
    value: 20,
  });
  vi.mocked(getTenantGoalCount).mockResolvedValue(0);
  vi.mocked(createReport).mockResolvedValue({ id: 'report-1' } as any);
});

describe('GET', () => {
  test('returns parse errors', async () => {
    parseRequestMock.mockResolvedValue({ error: () => new Response(null, { status: 400 }) });
    expect((await GET(new Request('http://localhost'))).status).toBe(400);
  });

  test('uses section permissions for typed reports', async () => {
    parseRequestMock.mockResolvedValue({
      auth: {},
      query: { websiteId: 'website-1', type: 'goal' },
      error: undefined,
    });
    const response = await GET(new Request('http://localhost'));
    expect(response.status).toBe(200);
    expect(canViewWebsiteSection).toHaveBeenCalledWith({}, 'website-1', 'goals');
  });

  test.each([
    ['performance', 'performance'],
    ['journey', 'journeys'],
  ])('maps the %s report section', async (type, section) => {
    parseRequestMock.mockResolvedValue({
      auth: {},
      query: { websiteId: 'website-1', type },
      error: undefined,
    });
    expect((await GET(new Request('http://localhost'))).status).toBe(200);
    expect(canViewWebsiteSection).toHaveBeenCalledWith({}, 'website-1', section);
  });

  test('uses website permissions for untyped reports', async () => {
    parseRequestMock.mockResolvedValue({
      auth: {},
      query: { websiteId: 'website-1' },
      error: undefined,
    });
    expect((await GET(new Request('http://localhost'))).status).toBe(200);
    expect(canViewAuthenticatedWebsite).toHaveBeenCalled();
  });

  test('rejects unauthorized report lists', async () => {
    parseRequestMock.mockResolvedValue({
      auth: {},
      query: { websiteId: 'website-1', type: 'funnel' },
      error: undefined,
    });
    vi.mocked(canViewWebsiteSection).mockResolvedValue(false);
    expect((await GET(new Request('http://localhost'))).status).toBe(401);
  });
});

describe('POST', () => {
  const reportBody = {
    websiteId: 'website-1',
    type: 'goal',
    name: 'Signup',
    description: '',
    parameters: {},
  };

  test('returns parse errors', async () => {
    parseRequestMock.mockResolvedValue({ error: () => new Response(null, { status: 400 }) });
    expect((await POST(new Request('http://localhost', { method: 'POST' }))).status).toBe(400);
  });

  test('rejects unauthorized report creation', async () => {
    parseRequestMock.mockResolvedValue({ auth: {}, body: reportBody, error: undefined });
    canUpdateMock.mockResolvedValue(false);
    expect((await POST(new Request('http://localhost', { method: 'POST' }))).status).toBe(401);
  });

  test('blocks goals when the tenant plan limit is exhausted', async () => {
    process.env.CLOUD_MODE = '1';
    parseRequestMock.mockResolvedValue({ auth: {}, body: reportBody, error: undefined });
    vi.mocked(getTenantGoalCount).mockResolvedValue(20);
    const response = await POST(new Request('http://localhost', { method: 'POST' }));
    const body = await response.json();
    expect(response.status).toBe(403);
    expect(body.error.code).toBe('goal-limit-reached');
    expect(body.error.upgradeMessage).toContain('Pro');
    expect(body.error).toMatchObject({
      type: 'plan-limit',
      resource: 'goalLimit',
      currentPlan: 'starter',
      recommendedPlan: 'pro',
      upgradeUrl: '/membership/upgrade?reason=goalLimit',
    });
  });

  test.each([
    { current: 19, expectedStatus: 200 },
    { current: 20, expectedStatus: 403 },
    { current: 21, expectedStatus: 403 },
  ])('enforces the Starter goal boundary at $current of 20', async ({
    current,
    expectedStatus,
  }) => {
    process.env.MEMBERSHIP_ENABLED = '1';
    parseRequestMock.mockResolvedValue({
      auth: { user: { id: 'user-1' } },
      body: reportBody,
      error: undefined,
    });
    vi.mocked(getTenantGoalCount).mockResolvedValue(current);

    const response = await POST(new Request('http://localhost', { method: 'POST' }));

    expect(response.status).toBe(expectedStatus);
    expect(createReport).toHaveBeenCalledTimes(expectedStatus === 200 ? 1 : 0);
  });

  test('allows goals without a numeric boundary on unlimited plans', async () => {
    process.env.MEMBERSHIP_ENABLED = '1';
    parseRequestMock.mockResolvedValue({
      auth: { user: { id: 'user-1' } },
      body: reportBody,
      error: undefined,
    });
    entitlementMock.mockResolvedValue({
      tenantId: 'tenant-1',
      plan: 'team',
      allowed: true,
      value: null,
    });
    vi.mocked(getTenantGoalCount).mockResolvedValue(Number.MAX_SAFE_INTEGER);

    expect((await POST(new Request('http://localhost', { method: 'POST' }))).status).toBe(200);
    expect(createReport).toHaveBeenCalled();
  });

  test('blocks Free goals at the five-goal quota', async () => {
    process.env.MEMBERSHIP_ENABLED = '1';
    parseRequestMock.mockResolvedValue({ auth: {}, body: reportBody, error: undefined });
    entitlementMock.mockResolvedValue({
      tenantId: 'tenant-1',
      plan: 'free',
      allowed: true,
      value: 5,
    });
    vi.mocked(getTenantGoalCount).mockResolvedValue(5);
    const response = await POST(new Request('http://localhost', { method: 'POST' }));
    expect(response.status).toBe(403);
  });

  test('creates entitled goals and non-goal reports', async () => {
    process.env.CLOUD_MODE = '1';
    parseRequestMock
      .mockResolvedValueOnce({
        auth: { user: { id: 'user-1' } },
        body: reportBody,
        error: undefined,
      })
      .mockResolvedValueOnce({
        auth: { user: { id: 'user-1' } },
        body: { ...reportBody, type: 'funnel', description: 'Funnel' },
        error: undefined,
      });

    expect((await POST(new Request('http://localhost', { method: 'POST' }))).status).toBe(200);
    expect((await POST(new Request('http://localhost', { method: 'POST' }))).status).toBe(200);
    expect(createReport).toHaveBeenCalledTimes(2);
  });
});

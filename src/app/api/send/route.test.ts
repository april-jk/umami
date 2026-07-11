import { beforeEach, describe, expect, test, vi } from 'vitest';
import { parseRequest } from '@/lib/request';
import { fetchWebsite } from '@/lib/load';
import { getTenantPlan, reserveWebsiteEvent } from '@/queries/prisma/tenant';
import { saveEvent, saveSessionData, createSession } from '@/queries/sql';
import { POST } from './route';

vi.mock('@/lib/clickhouse', () => ({
  default: { enabled: false },
}));

vi.mock('@/lib/detect', () => ({
  getClientInfo: vi.fn().mockResolvedValue({
    ip: '127.0.0.1',
    userAgent: 'Mozilla/5.0',
    device: 'desktop',
    browser: 'Chrome',
    os: 'macOS',
    country: 'US',
    region: 'CA',
    city: 'San Francisco',
  }),
  hasBlockedIp: vi.fn().mockReturnValue(false),
}));

vi.mock('@/lib/jwt', () => ({
  createToken: vi.fn().mockReturnValue('mock-token'),
  parseToken: vi.fn().mockResolvedValue(null),
}));

vi.mock('@/lib/crypto', () => ({
  getSalt: vi.fn().mockReturnValue('salt'),
  hash: vi.fn().mockReturnValue('hash'),
  secret: vi.fn().mockReturnValue('secret'),
  uuid: vi.fn().mockReturnValue('mock-uuid'),
}));

vi.mock('@/lib/load', () => ({
  fetchWebsite: vi.fn(),
}));

vi.mock('@/lib/request', () => ({
  parseRequest: vi.fn(),
}));

vi.mock('@/queries/prisma/tenant', () => ({
  getTenantPlan: vi.fn(),
  reserveWebsiteEvent: vi.fn(),
}));

vi.mock('@/queries/sql', () => ({
  saveEvent: vi.fn().mockResolvedValue(undefined),
  saveSessionData: vi.fn().mockResolvedValue(undefined),
  createSession: vi.fn().mockResolvedValue(undefined),
}));

const parseRequestMock = vi.mocked(parseRequest);
const fetchWebsiteMock = vi.mocked(fetchWebsite);
const reserveWebsiteEventMock = vi.mocked(reserveWebsiteEvent);
const getTenantPlanMock = vi.mocked(getTenantPlan);
const saveEventMock = vi.mocked(saveEvent);

beforeEach(() => {
  delete process.env.CLOUD_MODE;
  delete process.env.DISABLE_BOT_CHECK;
  process.env.DISABLE_BOT_CHECK = '1';
  vi.clearAllMocks();
});

function createRequest(body: any) {
  return new Request('http://localhost/api/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST event tracking', () => {
  test('tracks event successfully', async () => {
    parseRequestMock.mockResolvedValue({
      body: {
        type: 'event',
        payload: {
          website: 'website-1',
          url: '/page',
          hostname: 'example.com',
        },
      },
      error: undefined,
    } as any);
    fetchWebsiteMock.mockResolvedValue({ id: 'website-1', tenantId: 'tenant-1' } as any);

    const response = await POST(createRequest({}));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.sessionId).toBe('mock-uuid');
    expect(saveEventMock).toHaveBeenCalled();
  });

  test('returns website not found when website does not exist', async () => {
    parseRequestMock.mockResolvedValue({
      body: {
        type: 'event',
        payload: {
          website: 'website-1',
          url: '/page',
          hostname: 'example.com',
        },
      },
      error: undefined,
    } as any);
    fetchWebsiteMock.mockResolvedValue(null);

    const response = await POST(createRequest({}));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.message).toBe('Website not found.');
    expect(saveEventMock).not.toHaveBeenCalled();
  });

  test('blocks event when monthly limit is reached in cloud mode', async () => {
    process.env.CLOUD_MODE = '1';
    parseRequestMock.mockResolvedValue({
      body: {
        type: 'event',
        payload: {
          website: 'website-1',
          url: '/page',
          hostname: 'example.com',
        },
      },
      error: undefined,
    } as any);
    fetchWebsiteMock.mockResolvedValue({ id: 'website-1', tenantId: 'tenant-1' } as any);
    reserveWebsiteEventMock.mockResolvedValue({
      allowed: false,
      limit: 100_000,
      used: 100_000,
      remaining: 0,
    });
    getTenantPlanMock.mockResolvedValue({ plan: 'free' });

    const response = await POST(createRequest({}));
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error.code).toBe('event-limit-reached');
    expect(body.error.current).toBe(100_000);
    expect(body.error.limit).toBe(100_000);
    expect(body.error.upgradeMessage).toContain('Starter');
    expect(body.error.upgradeMessage).toContain('500,000');
    expect(saveEventMock).not.toHaveBeenCalled();
    delete process.env.CLOUD_MODE;
  });

  test('allows event when under limit in cloud mode', async () => {
    process.env.CLOUD_MODE = '1';
    parseRequestMock.mockResolvedValue({
      body: {
        type: 'event',
        payload: {
          website: 'website-1',
          url: '/page',
          hostname: 'example.com',
        },
      },
      error: undefined,
    } as any);
    fetchWebsiteMock.mockResolvedValue({ id: 'website-1', tenantId: 'tenant-1' } as any);
    reserveWebsiteEventMock.mockResolvedValue({
      allowed: true,
      limit: 100_000,
      used: 50_000,
      remaining: 50_000,
    });

    const response = await POST(createRequest({}));

    expect(response.status).toBe(200);
    expect(saveEventMock).toHaveBeenCalled();
    delete process.env.CLOUD_MODE;
  });

  test('returns pro upgrade message for starter plan', async () => {
    process.env.CLOUD_MODE = '1';
    parseRequestMock.mockResolvedValue({
      body: {
        type: 'event',
        payload: {
          website: 'website-1',
          url: '/page',
          hostname: 'example.com',
        },
      },
      error: undefined,
    } as any);
    fetchWebsiteMock.mockResolvedValue({ id: 'website-1', tenantId: 'tenant-1' } as any);
    reserveWebsiteEventMock.mockResolvedValue({
      allowed: false,
      limit: 500_000,
      used: 500_000,
      remaining: 0,
    });
    getTenantPlanMock.mockResolvedValue({ plan: 'starter' });

    const response = await POST(createRequest({}));
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error.upgradeMessage).toContain('Pro');
    expect(body.error.upgradeMessage).toContain('2,000,000');
    delete process.env.CLOUD_MODE;
  });

  test('returns team upgrade message for pro plan', async () => {
    process.env.CLOUD_MODE = '1';
    parseRequestMock.mockResolvedValue({
      body: {
        type: 'event',
        payload: {
          website: 'website-1',
          url: '/page',
          hostname: 'example.com',
        },
      },
      error: undefined,
    } as any);
    fetchWebsiteMock.mockResolvedValue({ id: 'website-1', tenantId: 'tenant-1' } as any);
    reserveWebsiteEventMock.mockResolvedValue({
      allowed: false,
      limit: 2_000_000,
      used: 2_000_000,
      remaining: 0,
    });
    getTenantPlanMock.mockResolvedValue({ plan: 'pro' });

    const response = await POST(createRequest({}));
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error.upgradeMessage).toContain('Team');
    expect(body.error.upgradeMessage).toContain('10,000,000');
    delete process.env.CLOUD_MODE;
  });

  test('returns enterprise upgrade message for team plan', async () => {
    process.env.CLOUD_MODE = '1';
    parseRequestMock.mockResolvedValue({
      body: {
        type: 'event',
        payload: {
          website: 'website-1',
          url: '/page',
          hostname: 'example.com',
        },
      },
      error: undefined,
    } as any);
    fetchWebsiteMock.mockResolvedValue({ id: 'website-1', tenantId: 'tenant-1' } as any);
    reserveWebsiteEventMock.mockResolvedValue({
      allowed: false,
      limit: 10_000_000,
      used: 10_000_000,
      remaining: 0,
    });
    getTenantPlanMock.mockResolvedValue({ plan: 'team' });

    const response = await POST(createRequest({}));
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error.upgradeMessage).toContain('Enterprise');
    expect(body.error.upgradeMessage).toContain('unlimited');
    delete process.env.CLOUD_MODE;
  });

  test('returns contact sales for enterprise plan', async () => {
    process.env.CLOUD_MODE = '1';
    parseRequestMock.mockResolvedValue({
      body: {
        type: 'event',
        payload: {
          website: 'website-1',
          url: '/page',
          hostname: 'example.com',
        },
      },
      error: undefined,
    } as any);
    fetchWebsiteMock.mockResolvedValue({ id: 'website-1', tenantId: 'tenant-1' } as any);
    reserveWebsiteEventMock.mockResolvedValue({
      allowed: false,
      limit: null,
      used: 50_000_000,
      remaining: null,
    });
    getTenantPlanMock.mockResolvedValue({ plan: 'enterprise' });

    const response = await POST(createRequest({}));
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error.upgradeMessage).toBe('Contact sales for custom limits.');
    delete process.env.CLOUD_MODE;
  });

  test('handles website without tenant (no limit check)', async () => {
    process.env.CLOUD_MODE = '1';
    parseRequestMock.mockResolvedValue({
      body: {
        type: 'event',
        payload: {
          website: 'website-1',
          url: '/page',
          hostname: 'example.com',
        },
      },
      error: undefined,
    } as any);
    fetchWebsiteMock.mockResolvedValue({ id: 'website-1', tenantId: null } as any);
    reserveWebsiteEventMock.mockResolvedValue({
      allowed: true,
      limit: null,
      used: null,
      remaining: null,
    });

    const response = await POST(createRequest({}));

    expect(response.status).toBe(200);
    expect(saveEventMock).toHaveBeenCalled();
    delete process.env.CLOUD_MODE;
  });

  test('skips limit check when cloud mode is off', async () => {
    parseRequestMock.mockResolvedValue({
      body: {
        type: 'event',
        payload: {
          website: 'website-1',
          url: '/page',
          hostname: 'example.com',
        },
      },
      error: undefined,
    } as any);
    fetchWebsiteMock.mockResolvedValue({ id: 'website-1', tenantId: 'tenant-1' } as any);

    const response = await POST(createRequest({}));

    expect(response.status).toBe(200);
    expect(reserveWebsiteEventMock).not.toHaveBeenCalled();
    expect(saveEventMock).toHaveBeenCalled();
  });

  test('skips limit check for link/pixel events (no websiteId)', async () => {
    process.env.CLOUD_MODE = '1';
    parseRequestMock.mockResolvedValue({
      body: {
        type: 'event',
        payload: {
          link: 'link-1',
          url: '/page',
          hostname: 'example.com',
        },
      },
      error: undefined,
    } as any);

    const response = await POST(createRequest({}));

    expect(response.status).toBe(200);
    expect(reserveWebsiteEventMock).not.toHaveBeenCalled();
    expect(saveEventMock).toHaveBeenCalled();
    delete process.env.CLOUD_MODE;
  });

  test('tracks performance event successfully', async () => {
    process.env.CLOUD_MODE = '1';
    parseRequestMock.mockResolvedValue({
      body: {
        type: 'performance',
        payload: {
          website: 'website-1',
          url: '/page',
          hostname: 'example.com',
          lcp: 100,
          inp: 50,
          cls: 0.1,
          fcp: 80,
          ttfb: 20,
        },
      },
      error: undefined,
    } as any);
    fetchWebsiteMock.mockResolvedValue({ id: 'website-1', tenantId: 'tenant-1' } as any);
    reserveWebsiteEventMock.mockResolvedValue({
      allowed: true,
      limit: 100_000,
      used: 50,
      remaining: 99_950,
    });

    const response = await POST(createRequest({}));

    expect(response.status).toBe(200);
    expect(saveEventMock).toHaveBeenCalled();
    const callArgs = saveEventMock.mock.calls[0][0];
    expect(callArgs.eventType).toBe(5); // EVENT_TYPE.performance
    expect(callArgs.lcp).toBe(100);
    expect(callArgs.inp).toBe(50);
    expect(callArgs.cls).toBe(0.1);
    delete process.env.CLOUD_MODE;
  });

  test('blocks performance event when limit is reached', async () => {
    process.env.CLOUD_MODE = '1';
    parseRequestMock.mockResolvedValue({
      body: {
        type: 'performance',
        payload: {
          website: 'website-1',
          url: '/page',
          hostname: 'example.com',
          lcp: 100,
        },
      },
      error: undefined,
    } as any);
    fetchWebsiteMock.mockResolvedValue({ id: 'website-1', tenantId: 'tenant-1' } as any);
    reserveWebsiteEventMock.mockResolvedValue({
      allowed: false,
      limit: 100_000,
      used: 100_000,
      remaining: 0,
    });
    getTenantPlanMock.mockResolvedValue({ plan: 'free' });

    const response = await POST(createRequest({}));
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error.code).toBe('event-limit-reached');
    expect(saveEventMock).not.toHaveBeenCalled();
    delete process.env.CLOUD_MODE;
  });

  test('tracks identify event without limit check', async () => {
    parseRequestMock.mockResolvedValue({
      body: {
        type: 'identify',
        payload: {
          website: 'website-1',
          data: { key: 'value' },
        },
      },
      error: undefined,
    } as any);

    const response = await POST(createRequest({}));

    expect(response.status).toBe(200);
    expect(reserveWebsiteEventMock).not.toHaveBeenCalled();
  });

  test('returns beep boop for bot requests', async () => {
    delete process.env.DISABLE_BOT_CHECK;
    const { getClientInfo } = await import('@/lib/detect');
    vi.mocked(getClientInfo).mockResolvedValue({
      ip: '127.0.0.1',
      userAgent: 'GoogleBot/2.1',
      device: 'bot',
      browser: 'bot',
      os: 'bot',
      country: 'US',
      region: 'CA',
      city: 'San Francisco',
    } as any);

    parseRequestMock.mockResolvedValue({
      body: {
        type: 'event',
        payload: {
          website: 'website-1',
          url: '/page',
          hostname: 'example.com',
        },
      },
      error: undefined,
    } as any);
    fetchWebsiteMock.mockResolvedValue({ id: 'website-1', tenantId: 'tenant-1' } as any);

    const response = await POST(createRequest({}));
    const body = await response.json();

    expect(body.beep).toBe('boop');
    process.env.DISABLE_BOT_CHECK = '1';
  });

  test('returns error for invalid request body', async () => {
    parseRequestMock.mockResolvedValue({
      body: {},
      error: () => new Response(JSON.stringify({ error: { message: 'Invalid request' } }), { status: 400 }),
    } as any);

    const response = await POST(createRequest({}));

    expect(response.status).toBe(400);
  });

  test('handles server errors gracefully', async () => {
    parseRequestMock.mockRejectedValue(new Error('Database error'));

    const response = await POST(createRequest({}));

    expect(response.status).toBe(500);
  });
});

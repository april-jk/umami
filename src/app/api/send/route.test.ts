import { beforeEach, describe, expect, test, vi } from 'vitest';
import { getClientInfo, hasBlockedIp } from '@/lib/detect';
import { parseToken } from '@/lib/jwt';
import { fetchWebsite } from '@/lib/load';
import { parseRequest } from '@/lib/request';
import { getTenantPlan, reserveWebsiteEvent } from '@/queries/prisma/tenant';
import { createSession, saveEvent } from '@/queries/sql';
import { POST, sendSchema } from './route';

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
const createSessionMock = vi.mocked(createSession);
const parseTokenMock = vi.mocked(parseToken);
const hasBlockedIpMock = vi.mocked(hasBlockedIp);

beforeEach(() => {
  delete process.env.CLOUD_MODE;
  delete process.env.MEMBERSHIP_ENABLED;
  delete process.env.DISABLE_BOT_CHECK;
  delete process.env.REMOVE_TRAILING_SLASH;
  process.env.DISABLE_BOT_CHECK = '1';
  vi.clearAllMocks();
  hasBlockedIpMock.mockReturnValue(false);
  parseTokenMock.mockResolvedValue(null);
});

function createRequest(body: any) {
  return new Request('http://localhost/api/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST event tracking', () => {
  test('validates formula-safe names and exactly one source', () => {
    expect(
      sendSchema.safeParse({
        type: 'event',
        payload: { website: '550e8400-e29b-41d4-a716-446655440000', name: '=SUM(A1:A2)' },
      }).success,
    ).toBe(false);
    expect(
      sendSchema.safeParse({
        type: 'event',
        payload: {
          website: '550e8400-e29b-41d4-a716-446655440000',
          link: '550e8400-e29b-41d4-a716-446655440001',
        },
      }).success,
    ).toBe(false);
    expect(
      sendSchema.safeParse({
        type: 'event',
        payload: { website: '550e8400-e29b-41d4-a716-446655440000', name: 'signup' },
      }).success,
    ).toBe(true);
  });

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

  test('enforces event limits when memberships are enabled outside cloud mode', async () => {
    process.env.MEMBERSHIP_ENABLED = '1';
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

    expect(response.status).toBe(403);
    expect(reserveWebsiteEventMock).toHaveBeenCalled();
    expect(saveEventMock).not.toHaveBeenCalled();
  });

  test('reuses a valid cache token and refreshes an expired visit', async () => {
    parseRequestMock.mockResolvedValue({
      body: {
        type: 'event',
        payload: { website: 'website-1', url: '/cached', hostname: 'example.com' },
      },
      error: undefined,
    } as any);
    parseTokenMock.mockResolvedValue({
      type: 'cache',
      websiteId: 'website-1',
      sessionId: 'cached-session',
      visitId: 'expired-visit',
      iat: 1,
    } as any);
    const request = createRequest({});
    request.headers.set('x-umami-cache', 'valid-cache-token');

    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(parseTokenMock).toHaveBeenCalledWith('valid-cache-token', 'secret');
    expect(fetchWebsiteMock).not.toHaveBeenCalled();
    expect(createSessionMock).not.toHaveBeenCalled();
    expect(saveEventMock).toHaveBeenCalledWith(expect.objectContaining({ visitId: 'mock-uuid' }));
  });

  test('blocks configured IP addresses', async () => {
    parseRequestMock.mockResolvedValue({
      body: {
        type: 'event',
        payload: { website: 'website-1', url: '/page', hostname: 'example.com' },
      },
      error: undefined,
    } as any);
    fetchWebsiteMock.mockResolvedValue({ id: 'website-1', tenantId: 'tenant-1' } as any);
    hasBlockedIpMock.mockReturnValue(true);

    const response = await POST(createRequest({}));

    expect(response.status).toBe(403);
    expect(saveEventMock).not.toHaveBeenCalled();
  });

  test('normalizes trailing slashes and referrer details', async () => {
    process.env.REMOVE_TRAILING_SLASH = '1';
    parseRequestMock.mockResolvedValue({
      body: {
        type: 'event',
        payload: {
          website: 'website-1',
          url: 'https://example.com/pricing/?source=test',
          referrer: 'https://docs.example.com/start?chapter=1',
        },
      },
      error: undefined,
    } as any);
    fetchWebsiteMock.mockResolvedValue({ id: 'website-1', tenantId: 'tenant-1' } as any);

    const response = await POST(createRequest({}));

    expect(response.status).toBe(200);
    expect(saveEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        urlPath: '/pricing',
        referrerPath: '/start',
        referrerQuery: 'chapter=1',
        referrerDomain: 'docs.example.com',
      }),
    );
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
    expect(body.error.upgradeMessage).toContain('1,000,000');
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
      limit: 1_000_000,
      used: 1_000_000,
      remaining: 0,
    });
    getTenantPlanMock.mockResolvedValue({ plan: 'pro' });

    const response = await POST(createRequest({}));
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error.upgradeMessage).toContain('Team');
    expect(body.error.upgradeMessage).toContain('5,000,000');
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
      limit: 5_000_000,
      used: 5_000_000,
      remaining: 0,
    });
    getTenantPlanMock.mockResolvedValue({ plan: 'team' });

    const response = await POST(createRequest({}));
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error.upgradeMessage).toContain('Enterprise');
    expect(body.error.upgradeMessage).toContain('20,000,000');
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
      error: () =>
        new Response(JSON.stringify({ error: { message: 'Invalid request' } }), { status: 400 }),
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

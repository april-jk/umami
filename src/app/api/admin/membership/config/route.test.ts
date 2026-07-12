import { beforeEach, describe, expect, test, vi } from 'vitest';
import { applyRetentionSweep } from '@/jobs/apply-retention';
import { createDefaultMembershipConfig } from '@/lib/membership-config';
import { parseRequest } from '@/lib/request';
import {
  getMembershipConfigRecord,
  MembershipConfigConflictError,
  updateMembershipConfig,
} from '@/queries/prisma/membership-config';
import { GET, POST } from './route';

vi.mock('@/jobs/apply-retention', () => ({ applyRetentionSweep: vi.fn() }));
vi.mock('@/lib/request', () => ({ parseRequest: vi.fn() }));
vi.mock('@/queries/prisma/membership-config', () => ({
  getMembershipConfigRecord: vi.fn(),
  MembershipConfigConflictError: class MembershipConfigConflictError extends Error {},
  updateMembershipConfig: vi.fn(),
}));

const parseRequestMock = vi.mocked(parseRequest);

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getMembershipConfigRecord).mockResolvedValue({
    config: createDefaultMembershipConfig(),
    source: 'default',
    version: 0,
    updatedAt: null,
    updatedBy: null,
  });
});

describe('admin membership configuration API', () => {
  test.each([
    ['GET', GET],
    ['POST', POST],
  ])('%s rejects non-admin users', async (method, handler) => {
    parseRequestMock.mockResolvedValue({
      auth: { user: { id: 'user-1', isAdmin: false } },
      body: {},
    } as any);

    const response = await handler(new Request('http://localhost', { method }));

    expect(response.status).toBe(401);
    expect(getMembershipConfigRecord).not.toHaveBeenCalled();
    expect(updateMembershipConfig).not.toHaveBeenCalled();
  });

  test('returns parser errors before authorization', async () => {
    const errorResponse = new Response(null, { status: 400 });
    parseRequestMock.mockResolvedValue({ error: () => errorResponse } as any);

    expect(await GET(new Request('http://localhost'))).toBe(errorResponse);
    expect(await POST(new Request('http://localhost', { method: 'POST' }))).toBe(errorResponse);
  });

  test('GET returns saved configuration metadata to an admin', async () => {
    const record = {
      config: createDefaultMembershipConfig(),
      source: 'database' as const,
      version: 2,
      updatedAt: null,
      updatedBy: 'admin-1',
    };
    parseRequestMock.mockResolvedValue({ auth: { user: { id: 'admin-1', isAdmin: true } } } as any);
    vi.mocked(getMembershipConfigRecord).mockResolvedValue(record);

    const response = await GET(new Request('http://localhost'));

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ source: 'database', version: 2 });
  });

  test('POST saves configuration and reapplies retention immediately', async () => {
    const config = createDefaultMembershipConfig();
    config.plans.free.limits.retentionDays = 14;
    parseRequestMock.mockResolvedValue({
      auth: { user: { id: 'admin-1', isAdmin: true } },
      body: { config, version: 3 },
    } as any);
    vi.mocked(updateMembershipConfig).mockResolvedValue({
      config,
      source: 'database',
      version: 4,
      updatedAt: new Date(),
      updatedBy: 'admin-1',
    });

    const response = await POST(new Request('http://localhost', { method: 'POST' }));

    expect(response.status).toBe(200);
    expect(updateMembershipConfig).toHaveBeenCalledWith(config, 'admin-1', 3);
    expect(applyRetentionSweep).toHaveBeenCalledOnce();
  });

  test('POST does not sweep retention for unrelated configuration changes', async () => {
    const config = createDefaultMembershipConfig();
    config.plans.starter.prices.monthly = 12;
    parseRequestMock.mockResolvedValue({
      auth: { user: { id: 'admin-1', isAdmin: true } },
      body: { config, version: 3 },
    } as any);
    vi.mocked(updateMembershipConfig).mockResolvedValue({
      config,
      source: 'database',
      version: 4,
      updatedAt: new Date(),
      updatedBy: 'admin-1',
    });

    const response = await POST(new Request('http://localhost', { method: 'POST' }));

    expect(response.status).toBe(200);
    expect(getMembershipConfigRecord).toHaveBeenCalledWith({ fresh: true });
    expect(applyRetentionSweep).not.toHaveBeenCalled();
  });

  test('POST rejects stale configuration without reapplying retention', async () => {
    const config = createDefaultMembershipConfig();
    parseRequestMock.mockResolvedValue({
      auth: { user: { id: 'admin-1', isAdmin: true } },
      body: { config, version: 2 },
    } as any);
    vi.mocked(updateMembershipConfig).mockRejectedValue(
      new MembershipConfigConflictError('Membership configuration changed.'),
    );

    const response = await POST(new Request('http://localhost', { method: 'POST' }));

    expect(response.status).toBe(409);
    expect((await response.json()).error.code).toBe('membership-config-conflict');
    expect(applyRetentionSweep).not.toHaveBeenCalled();
  });

  test('POST preserves unexpected persistence failures', async () => {
    const config = createDefaultMembershipConfig();
    const failure = new Error('Database unavailable');
    parseRequestMock.mockResolvedValue({
      auth: { user: { id: 'admin-1', isAdmin: true } },
      body: { config, version: 2 },
    } as any);
    vi.mocked(updateMembershipConfig).mockRejectedValue(failure);

    await expect(POST(new Request('http://localhost', { method: 'POST' }))).rejects.toBe(failure);
    expect(applyRetentionSweep).not.toHaveBeenCalled();
  });
});

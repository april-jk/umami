import { beforeEach, describe, expect, test, vi } from 'vitest';
import { parseRequest } from '@/lib/request';
import {
  ActivationCodeError,
  createActivationCode,
  getActivationCodes,
} from '@/queries/prisma/activation-code';
import { GET, POST } from './route';

vi.mock('@/lib/request', () => ({ parseRequest: vi.fn() }));
vi.mock('@/queries/prisma/activation-code', () => ({
  ACTIVATION_CODE_PLANS: ['starter', 'pro', 'team', 'enterprise'],
  ACTIVATION_CODE_STATUS: { active: 'active', disabled: 'disabled' },
  ActivationCodeError: class ActivationCodeError extends Error {
    code: string;
    constructor(code: string, message: string) {
      super(message);
      this.code = code;
    }
  },
  createActivationCode: vi.fn(),
  getActivationCodes: vi.fn(),
}));

const parseRequestMock = vi.mocked(parseRequest);

beforeEach(() => vi.clearAllMocks());

describe('admin activation code collection API', () => {
  test('rejects parser errors before authorization', async () => {
    const response = new Response(null, { status: 400 });
    parseRequestMock.mockResolvedValue({ error: () => response } as any);
    expect(await GET(new Request('http://localhost'))).toBe(response);
    expect(await POST(new Request('http://localhost', { method: 'POST' }))).toBe(response);
  });

  test('rejects non-admin users', async () => {
    parseRequestMock.mockResolvedValue({ auth: { user: { id: 'user-1', isAdmin: false } } } as any);
    expect((await GET(new Request('http://localhost'))).status).toBe(401);
    expect((await POST(new Request('http://localhost', { method: 'POST' }))).status).toBe(401);
    expect(getActivationCodes).not.toHaveBeenCalled();
  });

  test('lists activation codes for admins', async () => {
    const result = { data: [], count: 0, page: 1, pageSize: 20 };
    parseRequestMock.mockResolvedValue({
      auth: { user: { id: 'admin-1', isAdmin: true } },
      query: { page: 1 },
    } as any);
    vi.mocked(getActivationCodes).mockResolvedValue(result as any);
    const response = await GET(new Request('http://localhost'));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(result);
    expect(getActivationCodes).toHaveBeenCalledWith({ page: 1 });
  });

  test('creates a code and returns its one-time value', async () => {
    const body = { plan: 'pro', durationDays: 30, maxRedemptions: 10 };
    parseRequestMock.mockResolvedValue({
      auth: { user: { id: 'admin-1', isAdmin: true } },
      body,
    } as any);
    vi.mocked(createActivationCode).mockResolvedValue({ id: 'code-1', code: 'AMAMI-1234' } as any);
    const response = await POST(new Request('http://localhost', { method: 'POST' }));
    expect(response.status).toBe(200);
    expect(createActivationCode).toHaveBeenCalledWith({ ...body, createdBy: 'admin-1' });
    expect((await response.json()).code).toBe('AMAMI-1234');
  });

  test('maps domain errors to a useful bad request', async () => {
    parseRequestMock.mockResolvedValue({
      auth: { user: { id: 'admin-1', isAdmin: true } },
      body: { plan: 'pro', durationDays: 30, maxRedemptions: 1 },
    } as any);
    vi.mocked(createActivationCode).mockRejectedValue(
      new ActivationCodeError('duplicate', 'Already exists'),
    );
    const response = await POST(new Request('http://localhost', { method: 'POST' }));
    expect(response.status).toBe(400);
    expect((await response.json()).error.message).toBe('Already exists');
  });

  test('preserves unexpected creation failures', async () => {
    parseRequestMock.mockResolvedValue({
      auth: { user: { id: 'admin-1', isAdmin: true } },
      body: { plan: 'pro', durationDays: 30, maxRedemptions: 1 },
    } as any);
    const failure = new Error('database unavailable');
    vi.mocked(createActivationCode).mockRejectedValue(failure);
    await expect(POST(new Request('http://localhost', { method: 'POST' }))).rejects.toBe(failure);
  });
});

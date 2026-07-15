import { beforeEach, describe, expect, test, vi } from 'vitest';
import { parseRequest } from '@/lib/request';
import {
  ActivationCodeError,
  deleteActivationCode,
  getActivationCode,
  updateActivationCode,
} from '@/queries/prisma/activation-code';
import { DELETE, GET, PUT } from './route';

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
  deleteActivationCode: vi.fn(),
  getActivationCode: vi.fn(),
  updateActivationCode: vi.fn(),
}));

const parseRequestMock = vi.mocked(parseRequest);
const params = Promise.resolve({ activationCodeId: 'code-1' });

beforeEach(() => vi.clearAllMocks());

describe('admin activation code detail API', () => {
  test('requires an admin for every operation', async () => {
    parseRequestMock.mockResolvedValue({ auth: { user: { isAdmin: false } } } as any);
    expect((await GET(new Request('http://localhost'), { params })).status).toBe(401);
    expect((await PUT(new Request('http://localhost', { method: 'PUT' }), { params })).status).toBe(
      401,
    );
    expect(
      (await DELETE(new Request('http://localhost', { method: 'DELETE' }), { params })).status,
    ).toBe(401);
  });

  test('returns parser errors before authorization', async () => {
    const response = new Response(null, { status: 422 });
    parseRequestMock.mockResolvedValue({ error: () => response } as any);
    expect(await GET(new Request('http://localhost'), { params })).toBe(response);
    expect(await PUT(new Request('http://localhost', { method: 'PUT' }), { params })).toBe(
      response,
    );
    expect(await DELETE(new Request('http://localhost', { method: 'DELETE' }), { params })).toBe(
      response,
    );
  });

  test('returns not found when an id is missing', async () => {
    parseRequestMock.mockResolvedValue({ auth: { user: { isAdmin: true } } } as any);
    vi.mocked(getActivationCode).mockResolvedValue(null);
    expect((await GET(new Request('http://localhost'), { params })).status).toBe(404);
    vi.mocked(updateActivationCode).mockResolvedValue(null);
    expect((await PUT(new Request('http://localhost', { method: 'PUT' }), { params })).status).toBe(
      404,
    );
    vi.mocked(deleteActivationCode).mockResolvedValue(false);
    expect(
      (await DELETE(new Request('http://localhost', { method: 'DELETE' }), { params })).status,
    ).toBe(404);
  });

  test('gets, updates, and soft-deletes a code', async () => {
    parseRequestMock.mockResolvedValue({
      auth: { user: { id: 'admin-1', isAdmin: true } },
      body: { status: 'disabled' },
    } as any);
    vi.mocked(getActivationCode).mockResolvedValue({ id: 'code-1' } as any);
    vi.mocked(updateActivationCode).mockResolvedValue({ id: 'code-1', status: 'disabled' } as any);
    vi.mocked(deleteActivationCode).mockResolvedValue(true);

    expect((await GET(new Request('http://localhost'), { params })).status).toBe(200);
    expect((await PUT(new Request('http://localhost', { method: 'PUT' }), { params })).status).toBe(
      200,
    );
    expect(updateActivationCode).toHaveBeenCalledWith('code-1', { status: 'disabled' });
    expect(
      (await DELETE(new Request('http://localhost', { method: 'DELETE' }), { params })).status,
    ).toBe(200);
  });

  test('maps update domain errors', async () => {
    parseRequestMock.mockResolvedValue({
      auth: { user: { isAdmin: true } },
      body: { maxRedemptions: 1 },
    } as any);
    vi.mocked(updateActivationCode).mockRejectedValue(new ActivationCodeError('limit', 'Too low'));
    const response = await PUT(new Request('http://localhost', { method: 'PUT' }), { params });
    expect(response.status).toBe(400);
    expect((await response.json()).error.message).toBe('Too low');
  });

  test('preserves unexpected update failures', async () => {
    parseRequestMock.mockResolvedValue({
      auth: { user: { isAdmin: true } },
      body: { status: 'active' },
    } as any);
    const failure = new Error('database unavailable');
    vi.mocked(updateActivationCode).mockRejectedValue(failure);
    await expect(PUT(new Request('http://localhost', { method: 'PUT' }), { params })).rejects.toBe(
      failure,
    );
  });
});

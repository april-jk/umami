import { beforeEach, expect, test, vi } from 'vitest';
import { parseRequest } from '@/lib/request';
import { ActivationCodeError, redeemActivationCodeForUser } from '@/queries/prisma/activation-code';
import { POST } from './route';

vi.mock('@/lib/request', () => ({ parseRequest: vi.fn() }));
vi.mock('@/queries/prisma/activation-code', () => ({
  ActivationCodeError: class ActivationCodeError extends Error {
    code: string;
    constructor(code: string, message: string) {
      super(message);
      this.code = code;
    }
  },
  redeemActivationCodeForUser: vi.fn(),
}));

const parseRequestMock = vi.mocked(parseRequest);

beforeEach(() => vi.clearAllMocks());

test('redeems a code for the authenticated user', async () => {
  parseRequestMock.mockResolvedValue({
    auth: { user: { id: 'user-1' } },
    body: { code: 'AMAMI-1234' },
  } as any);
  vi.mocked(redeemActivationCodeForUser).mockResolvedValue({ plan: 'pro' } as any);
  const response = await POST(new Request('http://localhost', { method: 'POST' }));
  expect(response.status).toBe(200);
  expect(redeemActivationCodeForUser).toHaveBeenCalledWith('user-1', 'AMAMI-1234');
});

test('maps invalid codes and parser failures', async () => {
  parseRequestMock.mockResolvedValue({ error: () => new Response(null, { status: 422 }) } as any);
  expect((await POST(new Request('http://localhost', { method: 'POST' }))).status).toBe(422);

  parseRequestMock.mockResolvedValue({
    auth: { user: { id: 'user-1' } },
    body: { code: 'BAD' },
  } as any);
  vi.mocked(redeemActivationCodeForUser).mockRejectedValue(
    new ActivationCodeError('invalid', 'Nope'),
  );
  const response = await POST(new Request('http://localhost', { method: 'POST' }));
  expect(response.status).toBe(400);
  expect((await response.json()).error.message).toBe('Nope');
});

test('preserves unexpected redemption failures', async () => {
  parseRequestMock.mockResolvedValue({
    auth: { user: { id: 'user-1' } },
    body: { code: 'AMAMI-1234' },
  } as any);
  const failure = new Error('database unavailable');
  vi.mocked(redeemActivationCodeForUser).mockRejectedValue(failure);
  await expect(POST(new Request('http://localhost', { method: 'POST' }))).rejects.toBe(failure);
});

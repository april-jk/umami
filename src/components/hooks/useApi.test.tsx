import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { dismissPlanLimit, usePlanLimit } from '@/store/plan-limit';
import { isPlanLimitError, useApi } from './useApi';

vi.mock('@/lib/fetch', () => ({
  httpGet: vi.fn(),
  httpPost: vi.fn(),
  httpPut: vi.fn(),
  httpDelete: vi.fn(),
}));
vi.mock('@/lib/api-url', () => ({ getApiUrl: (url: string) => url }));
vi.mock('@/lib/client', () => ({ getClientAuthToken: () => 'token' }));
vi.mock('@/store/app', () => ({
  useApp: (selector: (state: any) => unknown) => selector({ share: null, shareToken: null }),
}));

import { httpDelete, httpGet, httpPost, httpPut } from '@/lib/fetch';

const httpGetMock = vi.mocked(httpGet);
const httpPostMock = vi.mocked(httpPost);
const httpPutMock = vi.mocked(httpPut);
const httpDeleteMock = vi.mocked(httpDelete);

beforeEach(() => {
  vi.clearAllMocks();
  dismissPlanLimit();
});

describe('useApi', () => {
  test('returns successful response data for every method', async () => {
    const response = { ok: true, status: 200, data: { ok: true } };
    httpGetMock.mockResolvedValue(response);
    httpPostMock.mockResolvedValue(response);
    httpPutMock.mockResolvedValue(response);
    httpDeleteMock.mockResolvedValue(response);
    const { result } = renderHook(() => useApi());

    await expect(result.current.get('/resource')).resolves.toEqual({ ok: true });
    await expect(result.current.post('/resource')).resolves.toEqual({ ok: true });
    await expect(result.current.put('/resource')).resolves.toEqual({ ok: true });
    await expect(result.current.del('/resource')).resolves.toEqual({ ok: true });
  });

  test('preserves the complete plan limit payload and opens the prompt', async () => {
    const payload = {
      message: 'English server message',
      code: 'website-limit-reached',
      type: 'plan-limit',
      status: 403,
      current: 5,
      limit: 5,
      currentPlan: 'free',
      recommendedPlan: 'starter',
      resource: 'website',
      tenantId: 'tenant-1',
      upgradeUrl: '/membership/upgrade?plan=starter',
      upgradeMessage: 'Upgrade now',
    };
    httpPostMock.mockResolvedValue({ ok: false, status: 403, data: { error: payload } });
    const { result } = renderHook(() => useApi());

    let error: any;
    await act(async () => {
      try {
        await result.current.post('/websites');
      } catch (caught) {
        error = caught;
      }
    });

    expect(error).toMatchObject(payload);
    expect(error).toBeInstanceOf(Error);
    expect(usePlanLimit.getState().prompt).toMatchObject(payload);
  });

  test('supports a legacy explicit limit payload', async () => {
    httpGetMock.mockResolvedValue({
      ok: false,
      status: 403,
      data: {
        error: {
          message: 'Limit',
          code: 'csv-export-limit-reached',
          upgradeMessage: 'Upgrade',
        },
      },
    });
    const { result } = renderHook(() => useApi());

    await expect(result.current.get('/export')).rejects.toMatchObject({
      code: 'csv-export-limit-reached',
    });
    expect(usePlanLimit.getState().prompt?.code).toBe('csv-export-limit-reached');
  });

  test('does not open the prompt for an ordinary forbidden response', async () => {
    httpGetMock.mockResolvedValue({
      ok: false,
      status: 403,
      data: { error: { message: 'Forbidden', code: 'forbidden', status: 403 } },
    });
    const { result } = renderHook(() => useApi());

    await expect(result.current.get('/private')).rejects.toMatchObject({ code: 'forbidden' });
    expect(usePlanLimit.getState().prompt).toBeNull();
  });
});

describe('isPlanLimitError', () => {
  test('requires an explicit type or a legacy code with an upgrade message', () => {
    expect(isPlanLimitError({ type: 'plan-limit' })).toBe(true);
    expect(
      isPlanLimitError({ code: 'member-limit-reached', upgradeMessage: 'Upgrade to Pro' }),
    ).toBe(true);
    expect(isPlanLimitError({ code: 'member-limit-reached' })).toBe(false);
    expect(isPlanLimitError(null)).toBe(false);
  });
});

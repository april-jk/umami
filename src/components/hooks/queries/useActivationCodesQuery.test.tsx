import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { useApi } from '../useApi';
import { useModified } from '../useModified';
import { usePagedQuery } from '../usePagedQuery';
import { useActivationCodeQuery, useActivationCodesQuery } from './useActivationCodesQuery';

vi.mock('../useApi', () => ({ useApi: vi.fn() }));
vi.mock('../useModified', () => ({ useModified: vi.fn() }));
vi.mock('../usePagedQuery', () => ({ usePagedQuery: vi.fn() }));

const useApiMock = vi.mocked(useApi);
const useModifiedMock = vi.mocked(useModified);
const usePagedQueryMock = vi.mocked(usePagedQuery);

beforeEach(() => vi.clearAllMocks());

describe('activation code query hooks', () => {
  test('builds the paged admin query with its modification token', async () => {
    let options: any;
    const get = vi.fn().mockResolvedValue({ data: [] });
    useApiMock.mockReturnValue({ get } as any);
    useModifiedMock.mockReturnValue({ modified: 7 } as any);
    usePagedQueryMock.mockImplementation(value => {
      options = value;
      return { data: [] } as any;
    });

    const { result } = renderHook(() => useActivationCodesQuery());

    expect(result.current).toEqual({ data: [] });
    expect(options.queryKey).toEqual(['activation-codes:admin', { modified: 7 }]);
    await expect(options.queryFn({ page: 2, pageSize: 25 })).resolves.toEqual({ data: [] });
    expect(get).toHaveBeenCalledWith('/admin/activation-codes', { page: 2, pageSize: 25 });
  });

  test.each([
    ['code-1', true, '/admin/activation-codes/code-1'],
    [undefined, false, '/admin/activation-codes/undefined'],
  ] as const)('builds the detail query for id %s', async (id, enabled, url) => {
    let options: any;
    const get = vi.fn().mockResolvedValue({ id });
    const useQuery = vi.fn(value => {
      options = value;
      return { data: { id } };
    });
    useApiMock.mockReturnValue({ get, useQuery } as any);
    useModifiedMock.mockReturnValue({ modified: 9 } as any);

    const { result } = renderHook(() => useActivationCodeQuery(id));

    expect(result.current).toEqual({ data: { id } });
    expect(useModifiedMock).toHaveBeenCalledWith(`activation-code:${id}`);
    expect(options.queryKey).toEqual(['activation-code:admin', id, { modified: 9 }]);
    expect(options.enabled).toBe(enabled);
    await expect(options.queryFn()).resolves.toEqual({ id });
    expect(get).toHaveBeenCalledWith(url);
  });
});

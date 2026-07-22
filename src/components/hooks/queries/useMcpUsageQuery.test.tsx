import { renderHook } from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vitest';
import { useApi } from '../useApi';
import { usePagedQuery } from '../usePagedQuery';
import { useMcpUsageQuery } from './useMcpUsageQuery';

vi.mock('../useApi', () => ({ useApi: vi.fn() }));
vi.mock('../usePagedQuery', () => ({ usePagedQuery: vi.fn() }));

const useApiMock = vi.mocked(useApi);
const usePagedQueryMock = vi.mocked(usePagedQuery);

beforeEach(() => vi.clearAllMocks());

test('builds the paged MCP usage query', async () => {
  let options: any;
  const get = vi.fn().mockResolvedValue({ data: [] });
  useApiMock.mockReturnValue({ get } as any);
  usePagedQueryMock.mockImplementation(value => {
    options = value;
    return { data: [] } as any;
  });

  const { result } = renderHook(() => useMcpUsageQuery());

  expect(result.current).toEqual({ data: [] });
  expect(options.queryKey).toEqual(['mcp-usage', 'me']);
  await expect(options.queryFn({ page: 3 })).resolves.toEqual({ data: [] });
  expect(get).toHaveBeenCalledWith('/me/mcp-usage', { page: 3 });
});

test('builds the admin user MCP usage query when a user id is provided', async () => {
  let options: any;
  const get = vi.fn().mockResolvedValue({ data: [] });
  useApiMock.mockReturnValue({ get } as any);
  usePagedQueryMock.mockImplementation(value => {
    options = value;
    return { data: [] } as any;
  });

  const { result } = renderHook(() => useMcpUsageQuery('user-1'));

  expect(result.current).toEqual({ data: [] });
  expect(options.queryKey).toEqual(['mcp-usage', 'user-1']);
  await expect(options.queryFn({ page: 2, pageSize: 50 })).resolves.toEqual({ data: [] });
  expect(get).toHaveBeenCalledWith('/admin/users/user-1/mcp-usage', { page: 2, pageSize: 50 });
});

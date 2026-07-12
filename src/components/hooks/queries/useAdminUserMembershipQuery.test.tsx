import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { useApi } from '../useApi';
import { useModified } from '../useModified';
import {
  useAdminUserMembershipQuery,
  useUpdateAdminUserMembershipQuery,
} from './useAdminUserMembershipQuery';

vi.mock('../useApi', () => ({ useApi: vi.fn() }));
vi.mock('../useModified', () => ({ useModified: vi.fn() }));

const useApiMock = vi.mocked(useApi);
const useModifiedMock = vi.mocked(useModified);

beforeEach(() => vi.clearAllMocks());

describe('admin user membership hooks', () => {
  test('loads membership state with the user-specific modified key', async () => {
    const get = vi.fn().mockResolvedValue({ tenant: { plan: 'pro' } });
    let queryOptions: any;
    const useQuery = vi.fn(options => {
      queryOptions = options;
      return {};
    });
    useApiMock.mockReturnValue({ get, useQuery } as any);
    useModifiedMock.mockReturnValue({ modified: 4 } as any);

    renderHook(() => useAdminUserMembershipQuery('user-1'));

    expect(queryOptions.queryKey).toEqual(['admin-user-membership', 'user-1', { modified: 4 }]);
    expect(queryOptions.enabled).toBe(true);
    await expect(queryOptions.queryFn()).resolves.toEqual({ tenant: { plan: 'pro' } });
    expect(get).toHaveBeenCalledWith('/admin/users/user-1/membership');
  });

  test('disables membership loading without a user id', () => {
    let queryOptions: any;
    useApiMock.mockReturnValue({
      get: vi.fn(),
      useQuery: vi.fn(options => {
        queryOptions = options;
        return {};
      }),
    } as any);
    useModifiedMock.mockReturnValue({ modified: 0 } as any);

    renderHook(() => useAdminUserMembershipQuery(''));

    expect(queryOptions.enabled).toBe(false);
  });

  test('posts updates and invalidates membership and user data', async () => {
    const post = vi.fn().mockResolvedValue({ ok: true });
    let mutationOptions: any;
    const useMutation = vi.fn(options => {
      mutationOptions = options;
      return {};
    });
    const touch = vi.fn();
    useApiMock.mockReturnValue({ post, useMutation } as any);
    useModifiedMock.mockReturnValue({ touch } as any);

    renderHook(() => useUpdateAdminUserMembershipQuery('user-1'));

    await expect(mutationOptions.mutationFn({ plan: 'team' })).resolves.toEqual({ ok: true });
    expect(post).toHaveBeenCalledWith('/admin/users/user-1/membership', { plan: 'team' });
    mutationOptions.onSuccess();
    expect(touch).toHaveBeenCalledWith('admin-user-membership:user-1');
    expect(touch).toHaveBeenCalledWith('user:user-1');
  });
});

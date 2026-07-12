import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { createDefaultMembershipConfig } from '@/lib/membership-config';
import { useApi } from '../useApi';
import { useModified } from '../useModified';
import {
  useAdminMembershipConfigQuery,
  useMembershipConfigQuery,
  useUpdateMembershipConfigQuery,
} from './useMembershipConfigQuery';

vi.mock('../useApi', () => ({ useApi: vi.fn() }));
vi.mock('../useModified', () => ({ useModified: vi.fn() }));

const useApiMock = vi.mocked(useApi);
const useModifiedMock = vi.mocked(useModified);

beforeEach(() => vi.clearAllMocks());

describe('membership configuration hooks', () => {
  test.each([
    ['public', useMembershipConfigQuery, '/membership/config', 'membership-config'],
    ['admin', useAdminMembershipConfigQuery, '/admin/membership/config', 'admin-membership-config'],
  ] as const)('builds the %s configuration query', async (_name, hook, url, key) => {
    let options: any;
    const get = vi.fn().mockResolvedValue({ version: 2 });
    useApiMock.mockReturnValue({
      get,
      useQuery: vi.fn(value => {
        options = value;
        return {};
      }),
    } as any);
    useModifiedMock.mockReturnValue({ modified: 3 } as any);

    renderHook(() => hook());

    expect(options.queryKey).toEqual([key, { modified: 3 }]);
    await expect(options.queryFn()).resolves.toEqual({ version: 2 });
    expect(get).toHaveBeenCalledWith(url);
  });

  test('posts updates and refreshes all membership configuration consumers', async () => {
    let options: any;
    const post = vi.fn().mockResolvedValue({ version: 2 });
    const touch = vi.fn();
    useApiMock.mockReturnValue({
      post,
      useMutation: vi.fn(value => {
        options = value;
        return {};
      }),
    } as any);
    useModifiedMock.mockReturnValue({ touch } as any);
    const config = createDefaultMembershipConfig();

    renderHook(() => useUpdateMembershipConfigQuery());

    await expect(options.mutationFn({ config, version: 1 })).resolves.toEqual({ version: 2 });
    expect(post).toHaveBeenCalledWith('/admin/membership/config', { config, version: 1 });
    options.onSuccess();
    expect(touch).toHaveBeenCalledWith('membership-config');
  });
});

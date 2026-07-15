import { beforeEach, describe, expect, test, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useTenantQuery } from './useTenantQuery';
import { useTenantUsageQuery } from './useTenantUsageQuery';
import { useUpdateTenantPlanQuery } from './useUpdateTenantPlanQuery';

vi.mock('../useApi', () => ({
  useApi: vi.fn(),
}));

vi.mock('../useModified', () => ({
  useModified: vi.fn(),
}));

import { useApi } from '../useApi';
import { useModified } from '../useModified';

const useApiMock = vi.mocked(useApi);
const useModifiedMock = vi.mocked(useModified);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useTenantQuery', () => {
  test('returns query with correct parameters', () => {
    const getMock = vi.fn();
    const useQueryMock = vi.fn().mockReturnValue({ data: null, isLoading: false });

    useApiMock.mockReturnValue({
      get: getMock,
      useQuery: useQueryMock,
    } as any);
    useModifiedMock.mockReturnValue({
      modified: 123,
    } as any);

    renderHook(() => useTenantQuery('tenant-1'));

    expect(useQueryMock).toHaveBeenCalledWith({
      queryKey: ['tenants', 'tenant-1', { modified: 123 }],
      queryFn: expect.any(Function),
      enabled: true,
    });
  });

  test('disables query when tenantId is empty', () => {
    const useQueryMock = vi.fn().mockReturnValue({ data: null, isLoading: false });

    useApiMock.mockReturnValue({
      useQuery: useQueryMock,
    } as any);
    useModifiedMock.mockReturnValue({
      modified: 123,
    } as any);

    renderHook(() => useTenantQuery(''));

    expect(useQueryMock).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: false,
      }),
    );
  });

  test('calls get with correct path', () => {
    const getMock = vi.fn().mockResolvedValue({ id: 'tenant-1', plan: 'pro' });
    const useQueryMock = vi.fn().mockImplementation(({ queryFn }) => {
      queryFn();
      return { data: null, isLoading: false };
    });

    useApiMock.mockReturnValue({
      get: getMock,
      useQuery: useQueryMock,
    } as any);
    useModifiedMock.mockReturnValue({
      modified: 123,
    } as any);

    renderHook(() => useTenantQuery('tenant-1'));

    expect(getMock).toHaveBeenCalledWith('/tenants/tenant-1');
  });
});

describe('useTenantUsageQuery', () => {
  test('returns query with correct parameters', () => {
    const useQueryMock = vi.fn().mockReturnValue({ data: null, isLoading: false });

    useApiMock.mockReturnValue({
      useQuery: useQueryMock,
    } as any);

    renderHook(() => useTenantUsageQuery('tenant-1'));

    expect(useQueryMock).toHaveBeenCalledWith({
      queryKey: ['tenant-usage', 'tenant-1', { modified: 123 }],
      queryFn: expect.any(Function),
      enabled: true,
    });
  });

  test('disables query when tenantId is empty', () => {
    const useQueryMock = vi.fn().mockReturnValue({ data: null, isLoading: false });

    useApiMock.mockReturnValue({
      useQuery: useQueryMock,
    } as any);

    renderHook(() => useTenantUsageQuery(''));

    expect(useQueryMock).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: false,
      }),
    );
  });

  test('calls get with correct path', () => {
    const getMock = vi.fn().mockResolvedValue({ plan: 'pro', events: { used: 100 } });
    const useQueryMock = vi.fn().mockImplementation(({ queryFn }) => {
      queryFn();
      return { data: null, isLoading: false };
    });

    useApiMock.mockReturnValue({
      get: getMock,
      useQuery: useQueryMock,
    } as any);

    renderHook(() => useTenantUsageQuery('tenant-1'));

    expect(getMock).toHaveBeenCalledWith('/tenants/tenant-1/usage');
  });
});

describe('useUpdateTenantPlanQuery', () => {
  test('returns mutation with correct parameters', () => {
    const postMock = vi.fn();
    const useMutationMock = vi.fn().mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });
    const touchMock = vi.fn();

    useApiMock.mockReturnValue({
      post: postMock,
      useMutation: useMutationMock,
    } as any);
    useModifiedMock.mockReturnValue({
      touch: touchMock,
    } as any);

    renderHook(() => useUpdateTenantPlanQuery('tenant-1'));

    expect(useMutationMock).toHaveBeenCalledWith(
      expect.objectContaining({
        mutationFn: expect.any(Function),
        onSuccess: expect.any(Function),
      }),
    );
  });

  test('calls post with correct path and data', () => {
    const postMock = vi.fn().mockResolvedValue({});
    const useMutationMock = vi.fn().mockImplementation(({ mutationFn }) => {
      mutationFn({ plan: 'pro' });
      return { mutateAsync: mutationFn, isPending: false };
    });
    const touchMock = vi.fn();

    useApiMock.mockReturnValue({
      post: postMock,
      useMutation: useMutationMock,
    } as any);
    useModifiedMock.mockReturnValue({
      touch: touchMock,
    } as any);

    renderHook(() => useUpdateTenantPlanQuery('tenant-1'));

    expect(postMock).toHaveBeenCalledWith('/tenants/tenant-1', { plan: 'pro' });
  });

  test('calls touch on success', () => {
    const postMock = vi.fn();
    const touchMock = vi.fn();
    let onSuccessCallback: (() => void) | undefined;

    const useMutationMock = vi.fn().mockImplementation(({ mutationFn, onSuccess }) => {
      onSuccessCallback = onSuccess;
      return { mutateAsync: mutationFn, isPending: false };
    });

    useApiMock.mockReturnValue({
      post: postMock,
      useMutation: useMutationMock,
    } as any);
    useModifiedMock.mockReturnValue({
      touch: touchMock,
    } as any);

    renderHook(() => useUpdateTenantPlanQuery('tenant-1'));

    // Call onSuccess callback
    if (onSuccessCallback) {
      onSuccessCallback();
    }

    expect(touchMock).toHaveBeenCalled();
  });
});

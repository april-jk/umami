import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { useUpdateQuery } from './useUpdateQuery';

vi.mock('@umami/react-zen', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('../useApi', () => ({
  useApi: vi.fn(),
  isPlanLimitError: (error: any) => error?.type === 'plan-limit',
}));
vi.mock('../useModified', () => ({ useModified: () => ({ touch: vi.fn() }) }));

import { useApi } from '../useApi';

const useApiMock = vi.mocked(useApi);

beforeEach(() => vi.clearAllMocks());

describe('useUpdateQuery', () => {
  test('posts merged parameters and exposes ordinary errors', async () => {
    const post = vi.fn().mockResolvedValue({ ok: true });
    const error = new Error('Failed');
    const useMutation = vi.fn(({ mutationFn }) => ({ mutateAsync: mutationFn, error }));
    useApiMock.mockReturnValue({ post, useMutation } as any);

    const { result } = renderHook(() => useUpdateQuery('/items', { teamId: 'team-1' }));

    await result.current.mutateAsync({ name: 'Item' });
    expect(post).toHaveBeenCalledWith('/items', { name: 'Item', teamId: 'team-1' });
    expect(result.current.error).toBe(error);
  });

  test('suppresses duplicate inline plan limit errors', () => {
    const error = Object.assign(new Error('Server English'), { type: 'plan-limit' });
    useApiMock.mockReturnValue({
      post: vi.fn(),
      useMutation: vi.fn().mockReturnValue({ error }),
    } as any);

    const { result } = renderHook(() => useUpdateQuery('/items'));

    expect(result.current.error).toBeNull();
  });
});

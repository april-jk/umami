import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { useApi } from '../useApi';
import { useDateParameters } from '../useDateParameters';
import { useFilterParameters } from '../useFilterParameters';
import { useWebsitePageviewsQuery } from './useWebsitePageviewsQuery';
import { useWebsiteStatsQuery } from './useWebsiteStatsQuery';

vi.mock('../useApi', () => ({ useApi: vi.fn() }));
vi.mock('../useDateParameters', () => ({ useDateParameters: vi.fn() }));
vi.mock('../useFilterParameters', () => ({ useFilterParameters: vi.fn() }));

const useApiMock = vi.mocked(useApi);
const useDateParametersMock = vi.mocked(useDateParameters);
const useFilterParametersMock = vi.mocked(useFilterParameters);

describe('website date query parity', () => {
  const get = vi.fn();
  const configurations: any[] = [];

  beforeEach(() => {
    configurations.length = 0;
    get.mockReset();
    useApiMock.mockReturnValue({
      get,
      useQuery: vi.fn(configuration => {
        configurations.push(configuration);
        return configuration;
      }),
    } as never);
    useDateParametersMock.mockReturnValue({
      startAt: 1784448000000,
      endAt: 1784534399999,
      startDate: '2026-07-19T08:00:00.000Z',
      endDate: '2026-07-20T07:59:59.999Z',
      unit: 'hour',
      timezone: 'Asia/Karachi',
    });
    useFilterParametersMock.mockReturnValue({ path: '/docs' });
  });

  test('sends identical browser-owned boundaries to stats and pageviews', async () => {
    renderHook(() => useWebsiteStatsQuery({ websiteId: 'website-1' }));
    renderHook(() => useWebsitePageviewsQuery({ websiteId: 'website-1' }));

    await configurations[0].queryFn();
    await configurations[1].queryFn();

    expect(get).toHaveBeenNthCalledWith(1, '/websites/website-1/stats', {
      compare: undefined,
      startAt: 1784448000000,
      endAt: 1784534399999,
      path: '/docs',
    });
    expect(get).toHaveBeenNthCalledWith(2, '/websites/website-1/pageviews', {
      compare: undefined,
      startAt: 1784448000000,
      endAt: 1784534399999,
      unit: 'hour',
      timezone: 'Asia/Karachi',
      path: '/docs',
    });
  });

  test('uses the same canonical boundaries in both query cache keys', () => {
    renderHook(() => useWebsiteStatsQuery({ websiteId: 'website-1', compare: 'prev' }));
    renderHook(() => useWebsitePageviewsQuery({ websiteId: 'website-1', compare: 'prev' }));

    expect(configurations[0].queryKey[1]).toMatchObject({
      startAt: 1784448000000,
      endAt: 1784534399999,
    });
    expect(configurations[1].queryKey[1]).toMatchObject({
      startAt: 1784448000000,
      endAt: 1784534399999,
    });
  });
});

import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { getItem } from '@/lib/storage';
import { useDateRange } from './useDateRange';
import { useLocale } from './useLocale';
import { useNavigation } from './useNavigation';

vi.mock('@/lib/storage', () => ({ getItem: vi.fn() }));
vi.mock('./useLocale', () => ({ useLocale: vi.fn() }));
vi.mock('./useNavigation', () => ({ useNavigation: vi.fn() }));

const getItemMock = vi.mocked(getItem);
const useLocaleMock = vi.mocked(useLocale);
const useNavigationMock = vi.mocked(useNavigation);

describe('useDateRange', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-20T07:35:00.000Z'));
    getItemMock.mockReturnValue(null);
    useLocaleMock.mockReturnValue({ locale: 'en-US' } as never);
    useNavigationMock.mockReturnValue({
      query: { date: '24hour', unit: '', offset: 0, compare: 'prev' },
    } as never);
  });

  test('keeps browser time authoritative when a display timezone is supplied', () => {
    const browserRange = renderHook(() => useDateRange()).result.current.dateRange;
    const displayTimezoneRange = renderHook(() => useDateRange({ timezone: 'Pacific/Honolulu' }))
      .result.current.dateRange;

    expect(displayTimezoneRange).toEqual(browserRange);
    expect(+browserRange.endDate - +browserRange.startDate + 1).toBe(24 * 60 * 60 * 1000);
  });

  test('applies offsets and comparison to the same browser range', () => {
    useNavigationMock.mockReturnValue({
      query: { date: '24hour', unit: '', offset: -1, compare: 'prev' },
    } as never);

    const { result } = renderHook(() => useDateRange());

    expect(result.current.offset).toBe(-1);
    expect(+result.current.dateCompare.endDate).toBe(+result.current.dateRange.startDate - 1);
  });

  test('uses the saved default and supports all-time and custom flags', () => {
    getItemMock.mockReturnValue('7day');
    useNavigationMock.mockReturnValue({ query: { date: '', unit: '', offset: 0 } } as never);
    expect(renderHook(() => useDateRange()).result.current.dateRange.value).toBe('7day');

    useNavigationMock.mockReturnValue({
      query: { date: 'range:1:2:all', unit: '', offset: 0 },
    } as never);
    const custom = renderHook(() => useDateRange()).result.current;
    expect(custom.isAllTime).toBe(true);
    expect(custom.isCustomRange).toBe(true);
  });
});

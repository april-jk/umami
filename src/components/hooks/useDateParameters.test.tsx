import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { useDateParameters } from './useDateParameters';
import { useDateRange } from './useDateRange';
import { useTimezone } from './useTimezone';

vi.mock('./useDateRange', () => ({ useDateRange: vi.fn() }));
vi.mock('./useTimezone', () => ({ useTimezone: vi.fn() }));

const useDateRangeMock = vi.mocked(useDateRange);
const useTimezoneMock = vi.mocked(useTimezone);

describe('useDateParameters', () => {
  beforeEach(() => {
    useDateRangeMock.mockReturnValue({
      dateRange: {
        startDate: new Date('2026-07-19T13:00:00.000Z'),
        endDate: new Date('2026-07-20T12:59:59.999Z'),
        unit: 'hour',
      },
    } as never);
  });

  test('uses the browser-created range as the single authority', () => {
    useTimezoneMock.mockReturnValue({
      timezone: 'Asia/Karachi',
      canonicalizeTimezone: value => value,
    } as never);

    const { result } = renderHook(() => useDateParameters());

    expect(useDateRangeMock).toHaveBeenCalledWith();
    expect(result.current).toEqual({
      startAt: 1784466000000,
      endAt: 1784552399999,
      startDate: '2026-07-19T13:00:00.000Z',
      endDate: '2026-07-20T12:59:59.999Z',
      unit: 'hour',
      timezone: 'Asia/Karachi',
    });
  });

  test('omits invalid browser dates instead of throwing', () => {
    const invalid = new Date('invalid');
    useDateRangeMock.mockReturnValue({
      dateRange: { startDate: invalid, endDate: invalid, unit: 'hour' },
    } as never);
    useTimezoneMock.mockReturnValue({
      timezone: 'UTC',
      canonicalizeTimezone: value => value,
    } as never);

    const { result } = renderHook(() => useDateParameters());

    expect(result.current.startAt).toBeUndefined();
    expect(result.current.endAt).toBeUndefined();
    expect(result.current.startDate).toBeUndefined();
    expect(result.current.endDate).toBeUndefined();
  });

  test('does not let a browser Date serialization failure crash the query layer', () => {
    const throwingDate = new Date('2026-07-19T13:00:00.000Z');
    throwingDate.toISOString = () => {
      throw new RangeError('Unavailable');
    };
    useDateRangeMock.mockReturnValue({
      dateRange: { startDate: throwingDate, endDate: throwingDate, unit: 'hour' },
    } as never);
    useTimezoneMock.mockReturnValue({
      timezone: 'UTC',
      canonicalizeTimezone: value => value,
    } as never);

    const { result } = renderHook(() => useDateParameters());

    expect(result.current.startAt).toBe(+throwingDate);
    expect(result.current.startDate).toBeUndefined();
  });
});

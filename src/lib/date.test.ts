import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import {
  formatDate,
  generateTimeSeries,
  getAllowedUnits,
  getCompareDate,
  getDateRangeValue,
  getDayOfWeekAsDate,
  getMaxSelectableDate,
  getMinimumUnit,
  getMonthDateRangeValue,
  getOffsetDateRange,
  getTimezone,
  isInvalidDate,
  isValidTimezone,
  maxDate,
  minDate,
  normalizeTimezone,
  parseDateRange,
  parseDateValue,
} from './date';

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

describe('date ranges', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-20T07:35:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('parses range values without changing their navigation step', () => {
    expect(parseDateValue('24hour')).toEqual({ num: 24, unit: 'hour' });
    expect(parseDateValue('7day')).toEqual({ num: 7, unit: 'day' });
    expect(parseDateValue('invalid')).toBeNull();
  });

  test('returns exactly 24 aligned hourly buckets from the browser clock', () => {
    const range = parseDateRange('24hour', undefined, 'en-US');

    expect(range.startDate.getMinutes()).toBe(0);
    expect(range.endDate.getMinutes()).toBe(59);
    expect(range.endDate.getSeconds()).toBe(59);
    expect(range.endDate.getMilliseconds()).toBe(999);
    expect(+range.endDate - +range.startDate + 1).toBe(24 * HOUR);
    expect(range).toMatchObject({ num: 24, unit: 'hour', value: '24hour', offset: 0 });
  });

  test.each([
    ['7day', 7, 'day'],
    ['30day', 30, 'day'],
    ['90day', 90, 'day'],
    ['6month', 6, 'month'],
    ['12month', 12, 'month'],
  ])('returns the labelled number of calendar buckets for %s', (value, count, unit) => {
    const range = parseDateRange(value, undefined, 'en-US');
    const series = generateTimeSeries([], range.startDate, range.endDate, range.unit, 'en-US');

    expect(series).toHaveLength(count);
    expect(range).toMatchObject({ num: count, unit, value });
  });

  test('keeps current-unit selections and explicit units intact', () => {
    const today = parseDateRange('0day', undefined, 'en-US');
    expect(today).toMatchObject({ num: 1, unit: 'hour' });
    expect(today.startDate.getHours()).toBe(0);
    expect(today.endDate.getHours()).toBe(23);
    expect(+today.endDate - +today.startDate + 1).toBe(DAY);
    expect(parseDateRange('0week', 'hour', 'en-US').unit).toBe('hour');
    expect(parseDateRange('0month', undefined, 'en-US').unit).toBe('day');
    expect(parseDateRange('0year', undefined, 'en-US').unit).toBe('month');
  });

  test('supports positive week and year ranges without adding an extra bucket', () => {
    const weeks = parseDateRange('2week', undefined, 'en-US');
    const years = parseDateRange('2year', undefined, 'en-US');

    expect(generateTimeSeries([], weeks.startDate, weeks.endDate, 'week', 'en-US')).toHaveLength(2);
    expect(generateTimeSeries([], years.startDate, years.endDate, 'year', 'en-US')).toHaveLength(2);
  });

  test('preserves custom ranges and derives a useful display unit', () => {
    const range = parseDateRange(`range:${Date.UTC(2026, 6, 1)}:${Date.UTC(2026, 6, 2)}`);

    expect(range.startDate).toEqual(new Date('2026-07-01T00:00:00.000Z'));
    expect(range.endDate).toEqual(new Date('2026-07-02T00:00:00.000Z'));
    expect(range.unit).toBe('hour');
    expect(parseDateRange(null as never)).toBeNull();
  });

  test('moves Last 24 Hours by its full 24-hour navigation step without overlap', () => {
    const current = parseDateRange('24hour', undefined, 'en-US');
    const previous = getOffsetDateRange(current, -1);
    const next = getOffsetDateRange(current, 1);

    expect(+previous.endDate).toBe(+current.startDate - 1);
    expect(+next.startDate).toBe(+current.endDate + 1);
    expect(+previous.endDate - +previous.startDate + 1).toBe(24 * HOUR);
    expect(getOffsetDateRange(current, 0)).toBe(current);
  });

  test.each([
    ['7day', -1],
    ['2week', -1],
    ['6month', -1],
    ['2year', -1],
  ])('keeps %s offsets contiguous', (value, offset) => {
    const current = parseDateRange(value, undefined, 'en-US');
    const previous = getOffsetDateRange(current, offset);

    expect(+previous.endDate).toBe(+current.startDate - 1);
  });

  test('builds a millisecond-precise previous period with no overlap', () => {
    const current = parseDateRange('24hour', undefined, 'en-US');
    const previous = getCompareDate('prev', current.startDate, current.endDate);

    expect(+previous.endDate).toBe(+current.startDate - 1);
    expect(+previous.endDate - +previous.startDate).toBe(+current.endDate - +current.startDate);
    expect(previous.compare).toBe('prev');
  });

  test('supports year-over-year comparison and unknown comparison modes', () => {
    const startDate = new Date('2024-02-29T00:00:00.000Z');
    const endDate = new Date('2024-03-01T00:00:00.000Z');

    expect(getCompareDate('yoy', startDate, endDate)).toMatchObject({ compare: 'yoy' });
    expect(getCompareDate('none', startDate, endDate)).toEqual({});
  });
});

describe('date helpers', () => {
  test('normalizes and validates timezones', () => {
    expect(normalizeTimezone('Asia/Calcutta')).toBe('Asia/Kolkata');
    expect(normalizeTimezone('Asia/Karachi')).toBe('Asia/Karachi');
    expect(isValidTimezone('Asia/Karachi')).toBe(true);
    expect(isValidTimezone('Not/A-Timezone')).toBe(false);
    expect(getTimezone()).toBeTruthy();
  });

  test('selects units for short and long ranges', () => {
    const start = new Date('2026-01-01T00:00:00.000Z');

    expect(getMinimumUnit(start, new Date(+start + HOUR))).toBe('minute');
    expect(getMinimumUnit(start, new Date(+start + 2 * HOUR), true)).toBe('hour');
    expect(getMinimumUnit(start, new Date(+start + 31 * DAY))).toBe('day');
    expect(getMinimumUnit(start, new Date('2027-01-01T00:00:00.000Z'))).toBe('month');
    expect(getMinimumUnit(start, new Date('2029-01-01T00:00:00.000Z'))).toBe('year');
    expect(getAllowedUnits(start, new Date(+start + 2 * HOUR))).toEqual([
      'hour',
      'day',
      'month',
      'year',
    ]);
  });

  test('generates complete time series and preserves comparison dates', () => {
    const start = new Date('2026-07-20T10:00:00.000Z');
    const end = new Date('2026-07-20T12:59:59.999Z');
    const result = generateTimeSeries(
      [{ x: '2026-07-20T11:00:00.000Z', y: 4, d: 'previous' }],
      start,
      end,
      'hour',
      'en-US',
    );

    expect(result).toHaveLength(3);
    expect(result[0].y).toBeNull();
    expect(result[1]).toMatchObject({ y: 4, d: 'previous' });
  });

  test('formats and bounds dates', () => {
    const first = new Date('2026-01-01T00:00:00.000Z');
    const second = new Date('2026-02-01T00:00:00.000Z');

    expect(formatDate(first, 'yyyy-MM-dd')).toBe('2026-01-01');
    expect(formatDate(first.toISOString(), 'yyyy-MM-dd')).toBe('2026-01-01');
    expect(maxDate(first, second)).toEqual(second);
    expect(minDate(first, second)).toEqual(first);
    const maximum = getMaxSelectableDate(first);
    expect(maximum.getFullYear()).toBe(2026);
    expect(maximum.getMonth()).toBe(11);
    expect(maximum.getDate()).toBe(31);
  });

  test('builds range values and detects invalid dates', () => {
    const start = new Date('2026-07-01T00:00:00.000Z');
    const end = new Date('2026-07-02T00:00:00.000Z');

    expect(getDateRangeValue(start, end)).toBe(`range:${+start}:${+end}`);
    expect(getMonthDateRangeValue(start)).toContain('range:');
    expect(isInvalidDate(new Date('invalid'))).toBe(true);
    expect(isInvalidDate(start)).toBe(false);
    expect(isInvalidDate('invalid')).toBe(false);
  });

  test('returns a future occurrence for a weekday', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-20T12:00:00.000Z'));

    expect(getDayOfWeekAsDate(0).getTime()).toBeGreaterThan(Date.now());
    expect(getDayOfWeekAsDate(3).getTime()).toBeGreaterThanOrEqual(Date.now());

    vi.useRealTimers();
  });
});

import { useDateRange } from './useDateRange';
import { useTimezone } from './useTimezone';

function safeToISOString(date: Date): string | undefined {
  try {
    return Number.isFinite(+date) ? date.toISOString() : undefined;
  } catch {
    return undefined;
  }
}

export function useDateParameters() {
  const {
    dateRange: { startDate, endDate, unit },
  } = useDateRange();
  const { timezone, canonicalizeTimezone } = useTimezone();

  const startAtValue = +startDate;
  const endAtValue = +endDate;
  const isStartValid = Number.isFinite(startAtValue);
  const isEndValid = Number.isFinite(endAtValue);

  return {
    startAt: isStartValid ? startAtValue : undefined,
    endAt: isEndValid ? endAtValue : undefined,
    startDate: safeToISOString(startDate),
    endDate: safeToISOString(endDate),
    unit,
    timezone: canonicalizeTimezone(timezone),
  };
}

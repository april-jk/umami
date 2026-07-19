import { Row, Text } from '@umami/react-zen';
import { isBefore, startOfMinute, subMinutes } from 'date-fns';
import { useMemo, useRef } from 'react';
import { useMessages, useTimezone } from '@/components/hooks';
import { DEFAULT_ANIMATION_DURATION, REALTIME_RANGE } from '@/lib/constants';
import type { RealtimeData } from '@/lib/types';
import { PageviewsChart } from './PageviewsChart';

export interface RealtimeChartProps {
  data: RealtimeData;
  unit: string;
  className?: string;
}

export function RealtimeChart({ data, unit, ...props }: RealtimeChartProps) {
  const { formatSeriesTimezone, fromUtc, timezone } = useTimezone();
  const { t, messages } = useMessages();
  const endDate = startOfMinute(new Date());
  const startDate = subMinutes(endDate, REALTIME_RANGE);
  const prevEndDate = useRef(endDate);
  const prevData = useRef<string | null>(null);

  const chartData = useMemo(() => {
    if (!data) {
      return { pageviews: [], sessions: [] };
    }

    return {
      pageviews: formatSeriesTimezone(data.series.views, 'x', timezone),
      sessions: formatSeriesTimezone(data.series.visitors, 'x', timezone),
    };
  }, [data, startDate, endDate, unit]);

  const animationDuration = useMemo(() => {
    // Don't animate the bars shifting over because it looks weird
    if (isBefore(prevEndDate.current, endDate)) {
      prevEndDate.current = endDate;
      return 0;
    }

    // Don't animate when data hasn't changed
    const serialized = JSON.stringify(chartData);
    if (prevData.current === serialized) {
      return 0;
    }
    prevData.current = serialized;

    return DEFAULT_ANIMATION_DURATION;
  }, [endDate, chartData]);

  const hasActivity = Object.values(data?.totals || {}).some(value => Number(value) > 0);

  return (
    <>
      {hasActivity ? (
        <PageviewsChart
          {...props}
          minDate={fromUtc(startDate)}
          maxDate={fromUtc(endDate)}
          unit={unit}
          data={chartData}
          animationDuration={animationDuration}
        />
      ) : (
        <Row alignItems="center" justifyContent="center" height="400px" color="muted">
          <Text>{t(messages.noRealtimeActivity, { x: REALTIME_RANGE })}</Text>
        </Row>
      )}
    </>
  );
}

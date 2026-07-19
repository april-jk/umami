import { expect, test, vi } from 'vitest';
import { DEFAULT_ANIMATION_DURATION } from '@/lib/constants';
import type { RealtimeData } from '@/lib/types';
import { render, screen } from '@/test/render';
import zhCN from '../../../public/intl/messages/zh-CN.json';
import { RealtimeChart } from './RealtimeChart';

vi.mock('@/components/hooks', async importOriginal => {
  const actual = await importOriginal<typeof import('@/components/hooks')>();

  return {
    ...actual,
    useTimezone: () => ({
      formatSeriesTimezone: (data: unknown) => data,
      fromUtc: (date: Date) => date,
      timezone: 'UTC',
    }),
  };
});

vi.mock('./PageviewsChart', () => ({
  PageviewsChart: ({
    data,
    animationDuration,
  }: {
    data: { pageviews: unknown[]; sessions: unknown[] };
    animationDuration: number;
  }) => (
    <div data-testid="pageviews-chart">
      {data.pageviews.length}:{data.sessions.length}:{animationDuration}
    </div>
  ),
}));

const createData = (views: number[]): RealtimeData => ({
  countries: {},
  events: [],
  pageviews: [],
  referrers: {},
  series: {
    views: views.map((y, index) => ({ x: index, y })),
    visitors: views.map((y, index) => ({ x: index, y })),
  },
  totals: {
    views: views.reduce((sum, value) => sum + value, 0),
    visitors: views.filter(value => value > 0).length,
    events: 0,
    countries: 0,
  },
  timestamp: 0,
  urls: {},
  visitors: [],
});

test('renders the chart and its 30-minute range when activity exists', () => {
  render(<RealtimeChart data={createData([0, 2])} unit="minute" />);

  expect(screen.getByText(`2:2:${DEFAULT_ANIMATION_DURATION}`)).toBeInTheDocument();
  expect(
    screen.queryByText('No trackable activity in the last 30 minutes.'),
  ).not.toBeInTheDocument();
});

test('renders a localized empty state when the 30-minute range has no views', () => {
  render(<RealtimeChart data={createData([0, 0])} unit="minute" />);

  expect(screen.queryByText('0:0')).not.toBeInTheDocument();
  expect(screen.getByText('No trackable activity in the last 30 minutes.')).toBeInTheDocument();
});

test('renders the Chinese range and empty-state translations', () => {
  render(<RealtimeChart data={createData([0, 0])} unit="minute" />, {
    locale: 'zh-CN',
    messages: zhCN,
  });

  expect(screen.getByText('最近 30 分钟内暂无可统计活动。')).toBeInTheDocument();
});

test('does not animate unchanged data within the same minute', () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-07-20T00:00:30Z'));
  const data = createData([0, 2]);
  const { rerender } = render(<RealtimeChart data={data} unit="minute" />);

  rerender(<RealtimeChart data={data} unit="minute" />);

  expect(screen.getByText('2:2:0')).toBeInTheDocument();
  vi.useRealTimers();
});

test('does not animate when the chart advances to a new minute', () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-07-20T00:00:30Z'));
  const data = createData([0, 2]);
  const { rerender } = render(<RealtimeChart data={data} unit="minute" />);

  vi.setSystemTime(new Date('2026-07-20T00:01:00Z'));
  rerender(<RealtimeChart data={data} unit="minute" />);

  expect(screen.getByText('2:2:0')).toBeInTheDocument();
  vi.useRealTimers();
});

test('handles an unavailable realtime response', () => {
  render(<RealtimeChart data={undefined as unknown as RealtimeData} unit="minute" />);

  expect(screen.getByText('No trackable activity in the last 30 minutes.')).toBeInTheDocument();
});

import { expect, test, vi } from 'vitest';
import { render, screen } from '@/test/render';
import { RealtimeHeader } from './RealtimeHeader';

let isPhone = false;

vi.mock('@/components/hooks', () => ({
  useMessages: () => ({
    t: value => value,
    labels: {
      countries: 'Countries',
      events: 'Events',
      views: 'Views',
      visitors: 'Visitors',
    },
  }),
  useMobile: () => ({ isPhone }),
}));

vi.mock('@/components/metrics/MetricCard', () => ({
  MetricCard: ({ label, value }) => <div>{`${label}: ${value ?? 0}`}</div>,
}));

vi.mock('@/components/metrics/MetricsBar', () => ({
  MetricsBar: ({ children, columns }) => <div data-columns={columns}>{children}</div>,
}));

vi.mock('./RealtimeControls', () => ({
  RealtimeControls: () => <div>Fixed range control</div>,
}));

test('places the fixed range control above the desktop metrics', () => {
  isPhone = false;
  render(<RealtimeHeader data={{ totals: { views: 4, visitors: 3, events: 2, countries: 1 } }} />);

  expect(screen.getByText('Fixed range control')).toBeInTheDocument();
  expect(screen.getByText('Views: 4')).toBeInTheDocument();
  expect(screen.getByText('Countries: 1')).toBeInTheDocument();
  expect(screen.getByText('Views: 4').parentElement).toHaveAttribute(
    'data-columns',
    'repeat(auto-fit, minmax(160px, 1fr))',
  );
});

test('uses the compact metric grid on phones and handles missing totals', () => {
  isPhone = true;
  render(<RealtimeHeader data={undefined} />);

  expect(screen.getByText('Views: 0').parentElement).toHaveAttribute(
    'data-columns',
    'repeat(2, minmax(0, 1fr))',
  );
  expect(screen.getByText('Events: 0')).toBeInTheDocument();
});

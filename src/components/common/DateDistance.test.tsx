import { render, screen } from '@testing-library/react';
import { formatDistanceToNow } from 'date-fns';
import { beforeEach, expect, test, vi } from 'vitest';
import { useLocale, useTimezone } from '@/components/hooks';
import { DateDistance } from './DateDistance';

vi.mock('@/components/hooks', () => ({
  useLocale: vi.fn(),
  useTimezone: vi.fn(),
}));

vi.mock('date-fns', async importOriginal => ({
  ...(await importOriginal<typeof import('date-fns')>()),
  formatDistanceToNow: vi.fn(),
}));

const useLocaleMock = vi.mocked(useLocale);
const useTimezoneMock = vi.mocked(useTimezone);
const formatDistanceToNowMock = vi.mocked(formatDistanceToNow);

beforeEach(() => {
  vi.clearAllMocks();
  useLocaleMock.mockReturnValue({ dateLocale: 'en-US' } as any);
  useTimezoneMock.mockReturnValue({
    formatTimezoneDate: vi.fn().mockReturnValue('Jul 22, 2026 at 10:00 AM'),
  } as any);
  formatDistanceToNowMock.mockReturnValue('2 days ago');
});

test('renders a relative time by default', () => {
  render(<DateDistance date={new Date('2026-07-22T10:00:00.000Z')} />);

  expect(screen.getByText('2 days ago')).toBeInTheDocument();
});

test('renders an absolute timestamp when requested', () => {
  render(<DateDistance date={new Date('2026-07-22T10:00:00.000Z')} absolute />);

  expect(screen.getByText('Jul 22, 2026 at 10:00 AM')).toBeInTheDocument();
  expect(screen.queryByText('2 days ago')).not.toBeInTheDocument();
});

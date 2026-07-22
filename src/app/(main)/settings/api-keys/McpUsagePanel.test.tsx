import { beforeEach, expect, test, vi } from 'vitest';
import { useMcpUsageQuery } from '@/components/hooks';
import { render, screen } from '@/test/render';
import { McpUsagePanel } from './McpUsagePanel';

vi.mock('@/components/hooks', async importOriginal => ({
  ...(await importOriginal<typeof import('@/components/hooks')>()),
  useMcpUsageQuery: vi.fn(),
}));

vi.mock('@/components/common/DateDistance', () => ({
  DateDistance: () => <span>Jul 22, 2026 at 10:00 AM</span>,
}));

const useMcpUsageQueryMock = vi.mocked(useMcpUsageQuery);

beforeEach(() => vi.clearAllMocks());

test('shows request time, key name, operation, and source route', () => {
  useMcpUsageQueryMock.mockReturnValue({
    data: {
      data: [
        {
          id: 'access-1',
          createdAt: '2026-07-22T10:00:00.000Z',
          apiKeyName: 'Desktop MCP',
          operation: 'Query website statistics',
          method: 'GET',
          route: '/api/websites/site-1/stats',
        },
      ],
      count: 1,
      page: 1,
      pageSize: 20,
    },
    isLoading: false,
    isFetching: false,
    error: null,
  } as any);

  render(<McpUsagePanel />);

  expect(screen.getByText('MCP usage')).toBeInTheDocument();
  expect(screen.getByText('Jul 22, 2026 at 10:00 AM')).toBeInTheDocument();
  expect(screen.getByText('Desktop MCP')).toBeInTheDocument();
  expect(screen.getByText('Query website statistics')).toBeInTheDocument();
  expect(screen.getByText('GET /api/websites/site-1/stats')).toBeInTheDocument();
});

test('shows a dedicated empty state before the first MCP request', () => {
  useMcpUsageQueryMock.mockReturnValue({
    data: { data: [], count: 0, page: 1, pageSize: 20 },
    isLoading: false,
    isFetching: false,
    error: null,
  } as any);

  render(<McpUsagePanel />);

  expect(screen.getByText('No MCP requests yet.')).toBeInTheDocument();
});

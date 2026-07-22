import { beforeEach, expect, test, vi } from 'vitest';
import { useApiKeysQuery } from '@/components/hooks';
import { render, screen } from '@/test/render';
import { ApiKeysPage } from './ApiKeysPage';

vi.mock('@/components/hooks', async importOriginal => ({
  ...(await importOriginal<typeof import('@/components/hooks')>()),
  useApiKeysQuery: vi.fn(),
}));

vi.mock('./ApiKeysTable', () => ({
  ApiKeysTable: ({ data }: { data: Array<{ name: string }> }) => (
    <div>API key table: {data.map(item => item.name).join(', ')}</div>
  ),
}));

vi.mock('./McpUsagePanel', () => ({
  McpUsagePanel: () => <div>MCP usage panel</div>,
}));

const useApiKeysQueryMock = vi.mocked(useApiKeysQuery);

beforeEach(() => vi.clearAllMocks());

test('places the MCP usage panel below an empty API key section', () => {
  useApiKeysQueryMock.mockReturnValue({
    data: undefined,
    isLoading: false,
    error: null,
  } as any);

  render(<ApiKeysPage />);

  expect(screen.getByText('API keys')).toBeInTheDocument();
  expect(screen.getByText('No API keys yet.')).toBeInTheDocument();
  expect(screen.getByText('MCP usage panel')).toBeInTheDocument();
});

test('keeps the existing API key table when records exist', () => {
  useApiKeysQueryMock.mockReturnValue({
    data: [{ id: 'key-1', name: 'Desktop MCP' }],
    isLoading: false,
    error: null,
  } as any);

  render(<ApiKeysPage />);

  expect(screen.getByText('API key table: Desktop MCP')).toBeInTheDocument();
});

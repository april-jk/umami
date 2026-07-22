import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vitest';
import { AdminWebsitesTable } from './AdminWebsitesTable';

vi.mock('@umami/react-zen', async importOriginal => ({
  ...(await importOriginal<typeof import('@umami/react-zen')>()),
  Dialog: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  MenuItem: ({ children, onAction }: { children: React.ReactNode; onAction?: () => void }) => (
    <button type="button" onClick={onAction}>
      {children}
    </button>
  ),
  Modal: ({ children, isOpen }: { children: React.ReactNode; isOpen: boolean }) =>
    isOpen ? <div>{children}</div> : null,
}));
vi.mock('@/components/hooks', () => ({ useMessages: vi.fn() }));
vi.mock('@/components/common/Badge', () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));
vi.mock('@/components/common/SortableLabel', () => ({
  SortableLabel: ({ label }: { label: React.ReactNode }) => <span>{label}</span>,
}));
vi.mock('@/components/common/DateDistance', () => ({
  DateDistance: () => <span>Created date</span>,
}));
vi.mock('@/components/input/MenuButton', () => ({
  MenuButton: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock('@/app/(main)/websites/[websiteId]/settings/WebsiteDeleteForm', () => ({
  WebsiteDeleteForm: ({ websiteId, onClose }: { websiteId: string; onClose: () => void }) => (
    <button type="button" onClick={onClose}>
      Close delete {websiteId}
    </button>
  ),
}));

import { useMessages } from '@/components/hooks';

beforeEach(() => {
  vi.mocked(useMessages).mockReturnValue({
    t: (key: string) => key,
    labels: {
      name: 'Name',
      domain: 'Domain',
      owner: 'Owner',
      source: 'Source',
      created: 'Created',
      edit: 'Edit',
      delete: 'Delete',
      unknown: 'Unknown',
    },
  } as any);
});

test('shows website creation sources only in the admin table', () => {
  render(
    <AdminWebsitesTable
      data={[
        {
          id: 'web-site',
          name: 'Web site',
          domain: 'web.example.com',
          creationSource: 'web',
          createdAt: '2026-07-22T00:00:00.000Z',
          user: { id: 'user-1', username: 'owner' },
        },
        {
          id: 'mcp-site',
          name: 'MCP site',
          domain: 'mcp.example.com',
          creationSource: 'mcp',
          createdAt: '2026-07-22T00:00:00.000Z',
          user: { id: 'user-1', username: 'owner' },
        },
        {
          id: 'api-site',
          name: 'API site',
          domain: 'api.example.com',
          creationSource: 'api',
          createdAt: '2026-07-22T00:00:00.000Z',
          user: { id: 'user-1', username: 'owner' },
        },
        {
          id: 'legacy-site',
          name: 'Legacy site',
          domain: 'legacy.example.com',
          createdAt: '2026-07-22T00:00:00.000Z',
          user: { id: 'user-1', username: 'owner' },
        },
      ]}
    />,
  );

  expect(screen.getByText('Source')).toBeInTheDocument();
  expect(screen.getByText('Web')).toBeInTheDocument();
  expect(screen.getByText('MCP')).toBeInTheDocument();
  expect(screen.getByText('API')).toBeInTheDocument();
  expect(screen.getByText('Unknown')).toBeInTheDocument();
});

test('renders team ownership and opens the selected website delete form', () => {
  render(
    <AdminWebsitesTable
      data={[
        {
          id: 'team-site',
          name: 'Team site',
          domain: 'team.example.com',
          creationSource: 'mcp',
          createdAt: '2026-07-22T00:00:00.000Z',
          team: { id: 'team-1', name: 'Analytics team' },
        },
      ]}
    />,
  );

  expect(screen.getByText('Analytics team')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
  const closeButton = screen.getByRole('button', { name: 'Close delete team-site' });
  expect(closeButton).toBeInTheDocument();

  fireEvent.click(closeButton);
  expect(screen.queryByRole('button', { name: 'Close delete team-site' })).not.toBeInTheDocument();
});

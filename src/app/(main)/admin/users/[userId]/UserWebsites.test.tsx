import { render, screen } from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vitest';
import { useNavigation, useUserWebsitesQuery } from '@/components/hooks';
import { UserWebsites } from './UserWebsites';

const website = {
  id: 'website-1',
  name: 'Example website',
  domain: 'example.com',
  createdAt: '2026-07-22T00:00:00.000Z',
};

vi.mock('@/components/hooks', () => ({
  useNavigation: vi.fn(),
  useUserWebsitesQuery: vi.fn(),
}));

vi.mock('@/components/common/DataGrid', () => ({
  DataGrid: ({ children }: any) => children({ data: [website] }),
}));

vi.mock('@/app/(main)/websites/WebsitesTable', () => ({
  WebsitesTable: ({ data, renderLink }: any) => <div>{data.map(renderLink)}</div>,
}));

beforeEach(() => {
  vi.mocked(useUserWebsitesQuery).mockReturnValue({ data: [website] } as any);
  vi.mocked(useNavigation).mockReturnValue({
    renderUrl: (path: string) => path,
  } as any);
});

test('links each user website name to its analytics page', () => {
  render(<UserWebsites userId="user-1" />);

  expect(useUserWebsitesQuery).toHaveBeenCalledWith({ userId: 'user-1' });
  expect(screen.getByRole('link', { name: 'Example website' })).toHaveAttribute(
    'href',
    '/websites/website-1',
  );
});

import { render, screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import { useLoginQuery } from '@/components/hooks';
import { AdminLayout } from './AdminLayout';

vi.mock('@/components/hooks', () => ({ useLoginQuery: vi.fn() }));
vi.mock('@/components/common/PageBody', () => ({
  PageBody: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

test('renders admin content only for global administrators', () => {
  vi.mocked(useLoginQuery).mockReturnValue({ user: { isAdmin: false } } as any);
  const { rerender } = render(<AdminLayout>Admin controls</AdminLayout>);
  expect(screen.queryByText('Admin controls')).not.toBeInTheDocument();

  vi.mocked(useLoginQuery).mockReturnValue({ user: { isAdmin: true } } as any);
  rerender(<AdminLayout>Admin controls</AdminLayout>);
  expect(screen.getByText('Admin controls')).toBeInTheDocument();
});

import { render, screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import { useMessages, useNavigation } from '@/components/hooks';
import { AdminNav } from './AdminNav';

const navMenuMock = vi.fn(({ items, selectedKey }: any) => (
  <div>
    <span>{selectedKey}</span>
    {items
      .flatMap((group: any) => group.items)
      .map((item: any) => (
        <span key={item.id}>{item.label}</span>
      ))}
  </div>
));

vi.mock('@/components/common/NavMenu', () => ({ NavMenu: (props: any) => navMenuMock(props) }));
vi.mock('@/components/common/Link', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock('@/components/hooks', () => ({ useMessages: vi.fn(), useNavigation: vi.fn() }));

test('adds membership management to the admin navigation and selects it by path', () => {
  vi.mocked(useMessages).mockReturnValue({
    t: (value: string) => value,
    labels: {
      manage: 'Manage',
      users: 'Users',
      websites: 'Websites',
      teams: 'Teams',
      membership: 'Membership',
      activationCodes: 'Activation codes',
      back: 'Back',
    },
  } as any);
  vi.mocked(useNavigation).mockReturnValue({
    pathname: '/admin/membership',
    renderUrl: (value: string) => value,
  } as any);

  render(<AdminNav />);

  expect(screen.getByText('Membership')).toBeInTheDocument();
  expect(screen.getByText('Activation codes')).toBeInTheDocument();
  expect(screen.getByText('membership')).toBeInTheDocument();
  expect(navMenuMock).toHaveBeenCalledWith(
    expect.objectContaining({ selectedKey: 'membership', allowMinimize: false }),
  );
});

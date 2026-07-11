import { expect, test, vi } from 'vitest';
import { render, screen } from '@/test/render';
import { UserButton } from './UserButton';

const saveLocale = vi.fn();

vi.mock('@/components/hooks', () => ({
  useConfig: () => ({ cloudMode: false }),
  useLocale: () => ({ locale: 'en-US', saveLocale }),
  useLoginQuery: () => ({ user: { username: 'testuser3', isAdmin: false } }),
  useMessages: () => ({
    t: (label: string) => label,
    labels: {
      admin: 'Admin',
      documentation: 'Documentation',
      language: 'Language',
      logout: 'Logout',
      membership: 'Membership',
      settings: 'Settings',
      support: 'Support',
      theme: 'Theme',
    },
  }),
  useMobile: () => ({ isMobile: false }),
}));

test('renders all user menu items after opening the menu', async () => {
  const { user } = render(<UserButton />);

  await user.click(screen.getByText('testuser3'));

  expect(screen.getByRole('menuitem', { name: 'Settings' })).toHaveAttribute('href', '/settings');
  expect(screen.getByRole('menuitem', { name: 'Membership' })).toHaveAttribute(
    'href',
    '/membership',
  );
  expect(screen.getByRole('menuitem', { name: 'Language' })).toBeInTheDocument();
  expect(screen.getByRole('menuitem', { name: 'Theme' })).toBeInTheDocument();
  expect(screen.getByRole('menuitem', { name: 'Logout' })).toHaveAttribute('href', '/logout');
});

test('updates the locale from the language submenu', async () => {
  const { user } = render(<UserButton />);

  await user.click(screen.getByText('testuser3'));
  await user.click(screen.getByRole('menuitem', { name: 'Language' }));
  await user.click(screen.getByRole('menuitemradio', { name: 'English (US)' }));

  expect(saveLocale).toHaveBeenCalledWith('en-US');
});

test('updates the theme from the theme submenu', async () => {
  const { user } = render(<UserButton />);

  await user.click(screen.getByText('testuser3'));
  await user.click(screen.getByRole('menuitem', { name: 'Theme' }));
  await user.click(screen.getByRole('menuitemradio', { name: 'Dark' }));

  expect(screen.getByRole('button', { name: 'testuser3' })).toHaveAttribute(
    'aria-expanded',
    'false',
  );
});

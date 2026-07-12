import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { App } from './App';

const replaceMock = vi.fn();
const setItemMock = vi.fn();
const removeItemMock = vi.fn();
let loginResult: any;
let config: any;
let navigation: any;
let teamResult: any;

vi.mock('@/app/(main)/MobileNav', () => ({ MobileNav: () => <div>Mobile navigation</div> }));
vi.mock('@/app/(main)/SideNav', () => ({ SideNav: () => <div>Side navigation</div> }));
vi.mock('@/app/(main)/TopNav', () => ({ TopNav: () => <div>Top navigation</div> }));
vi.mock('./UpdateNotice', () => ({ UpdateNotice: () => <div>Update notice</div> }));
vi.mock('@/components/common/PlanLimitDialog', () => ({
  PlanLimitDialog: () => <div>Plan limit dialog</div>,
}));
vi.mock('@/components/hooks', () => ({
  useLoginQuery: () => loginResult,
  useConfig: () => config,
  useNavigation: () => navigation,
  useTeamQuery: () => teamResult,
}));
vi.mock('@/lib/storage', () => ({
  setItem: (...args: unknown[]) => setItemMock(...args),
  removeItem: (...args: unknown[]) => removeItemMock(...args),
}));
vi.mock('next/script', () => ({ default: (props: any) => <div data-src={props.src}>Script</div> }));

beforeEach(() => {
  vi.clearAllMocks();
  loginResult = { user: { id: 'user-1' }, isLoading: false, error: null };
  config = { cloudMode: false };
  navigation = { pathname: '/', router: { replace: replaceMock }, teamId: null };
  teamResult = { isLoading: false, error: null };
  delete process.env.selfTrack;
  delete process.env.selfRecord;
});

describe('App', () => {
  test('shows loading while account context is loading', () => {
    loginResult.isLoading = true;

    const { container } = render(<App>Content</App>);

    expect(container).not.toBeEmptyDOMElement();
    expect(screen.queryByText('Content')).not.toBeInTheDocument();
  });

  test('renders nothing without a user', () => {
    loginResult.user = null;

    const { container } = render(<App>Content</App>);

    expect(screen.queryByText('Content')).not.toBeInTheDocument();
    expect(container).toBeEmptyDOMElement();
  });

  test('redirects authentication failures instead of rendering the shell', () => {
    loginResult.error = new Error('Expired session');

    render(<App>Content</App>);

    expect(screen.queryByText('Content')).not.toBeInTheDocument();
  });

  test('renders the authenticated shell and global plan limit dialog', () => {
    const { rerender } = render(<App>Content</App>);

    expect(screen.getByText('Content')).toBeInTheDocument();
    expect(screen.getByText('Plan limit dialog')).toBeInTheDocument();
    expect(removeItemMock).toHaveBeenCalled();

    navigation = { ...navigation, teamId: 'team-1' };
    rerender(<App>Content</App>);
    expect(setItemMock).toHaveBeenCalledWith(expect.any(String), 'team-1');
  });

  test('clears an inaccessible team and redirects home', () => {
    navigation = { ...navigation, teamId: 'team-1' };
    teamResult = { isLoading: false, error: new Error('Missing') };

    render(<App>Content</App>);

    expect(removeItemMock).toHaveBeenCalled();
    expect(replaceMock).toHaveBeenCalledWith('/');
    expect(screen.queryByText('Content')).not.toBeInTheDocument();
  });

  test('renders configured telemetry scripts', () => {
    process.env.selfTrack = 'tracking-site';
    process.env.selfRecord = 'recording-site';

    render(<App>Content</App>);

    expect(screen.getAllByText('Script')).toHaveLength(2);
  });
});

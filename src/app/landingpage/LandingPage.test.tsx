import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

// This test verifies copy and behavior, not CSS module output.
vi.mock('./landingpage.module.css', () => ({
  default: new Proxy({}, { get: (_, key) => String(key) }),
}));

import LandingPage from './LandingPage';

const scrollIntoView = vi.fn();

describe('LandingPage', () => {
  let observeCallback: IntersectionObserverCallback;

  beforeEach(() => {
    class TestIntersectionObserver {
      constructor(callback: IntersectionObserverCallback) {
        observeCallback = callback;
      }

      disconnect() {}
      observe() {}
      takeRecords() {
        return [];
      }
      unobserve() {}
    }

    vi.stubGlobal('IntersectionObserver', TestIntersectionObserver);
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    });
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    scrollIntoView.mockClear();
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: scrollIntoView,
    });
  });

  test('presents the supported read-only Amami MCP scope', () => {
    render(<LandingPage />);

    expect(
      screen.getByRole('heading', {
        name: 'Ask your Umami analytics from your AI coding assistant.',
      }),
    ).toBeInTheDocument();
    expect(screen.getByText('Read-only MCP installation')).toBeInTheDocument();
    expect(screen.getByText('List websites')).toBeInTheDocument();
    expect(screen.getByText('Read traffic stats')).toBeInTheDocument();
    expect(screen.getByText('Inspect trends')).toBeInTheDocument();
    expect(screen.getByText('Find top pages')).toBeInTheDocument();
    expect(screen.getByText('Check active visitors')).toBeInTheDocument();
    expect(screen.getByText('Trace traffic sources')).toBeInTheDocument();
    expect(screen.getByText('Read-only by design')).toBeInTheDocument();
    expect(screen.getByText('Keep the dashboard')).toBeInTheDocument();
  });

  test('does not advertise write or dashboard-replacement capabilities', () => {
    render(<LandingPage />);

    expect(screen.queryByText('Create tracking')).not.toBeInTheDocument();
    expect(screen.queryByText('Verify tracking')).not.toBeInTheDocument();
    expect(
      screen.queryByText(/automatic site discovery and tracking setup/i),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Read docs' })).toHaveAttribute(
      'href',
      'https://docs.amami.dev',
    );
  });

  test('keeps navigation, install methods, clipboard feedback, and effects interactive', async () => {
    vi.useFakeTimers();
    window.location.hash = '#tools';
    vi.mocked(window.matchMedia).mockReturnValue({
      addEventListener: vi.fn(),
      addListener: vi.fn(),
      dispatchEvent: vi.fn(),
      matches: true,
      media: '(pointer: fine)',
      onchange: null,
      removeEventListener: vi.fn(),
      removeListener: vi.fn(),
    });

    const { unmount } = render(<LandingPage />);

    act(() => {
      vi.runOnlyPendingTimers();
    });
    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'start' });

    act(() => {
      observeCallback(
        [
          {
            intersectionRatio: 0.8,
            isIntersecting: true,
            target: document.getElementById('tools'),
          } as unknown as IntersectionObserverEntry,
        ],
        {} as IntersectionObserver,
      );
      window.dispatchEvent(new Event('resize'));
      window.dispatchEvent(new Event('pointermove'));
      document.dispatchEvent(new Event('mouseleave'));
      window.dispatchEvent(new Event('blur'));
    });
    expect(screen.getByRole('link', { name: 'MCP tools' })).toHaveAttribute('aria-current', 'page');

    fireEvent.click(screen.getByRole('tab', { name: 'Skill' }));
    expect(screen.getByRole('tabpanel')).toHaveTextContent('read-only access');
    fireEvent.keyDown(screen.getByRole('tab', { name: 'Skill' }), { key: 'ArrowRight' });
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Read-only MCP client configuration');
    fireEvent.keyDown(screen.getByRole('tab', { name: 'Config' }), { key: 'ArrowRight' });
    expect(screen.getByRole('tabpanel')).toHaveTextContent('read-only Amami MCP server');
    fireEvent.keyDown(screen.getByRole('tab', { name: 'MCP' }), { key: 'ArrowLeft' });
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Read-only MCP client configuration');
    fireEvent.keyDown(screen.getByRole('tab', { name: 'Config' }), { key: 'Enter' });

    vi.mocked(navigator.clipboard.writeText).mockResolvedValueOnce(undefined);
    fireEvent.click(screen.getByRole('button', { name: 'Copy' }));
    await act(async () => {});
    expect(screen.getByRole('button', { name: 'Copied' })).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1800);
    });
    expect(screen.getByRole('button', { name: 'Copy' })).toBeInTheDocument();

    vi.mocked(navigator.clipboard.writeText).mockRejectedValueOnce(new Error('Clipboard denied'));
    const execCommand = vi.fn();
    Object.defineProperty(document, 'execCommand', { configurable: true, value: execCommand });
    fireEvent.click(screen.getByRole('button', { name: 'Copy' }));
    await act(async () => {});
    expect(execCommand).toHaveBeenCalledWith('copy');

    unmount();
  });
});

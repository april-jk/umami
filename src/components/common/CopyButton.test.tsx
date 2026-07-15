import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { CopyButton } from './CopyButton';

vi.mock('@umami/react-zen', () => ({
  Button: ({ children, onPress, ...props }: any) => (
    <button type="button" onClick={onPress} {...props}>
      {children}
    </button>
  ),
  Icon: ({ children }: any) => <span>{children}</span>,
}));
vi.mock('@/components/icons', () => ({
  Check: () => <span>check-icon</span>,
  Copy: () => <span>copy-icon</span>,
}));

beforeEach(() => {
  vi.useRealTimers();
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined });
});

afterEach(() => {
  vi.restoreAllMocks();
});

test('does nothing when the clipboard API is unavailable', () => {
  render(<CopyButton value="AMAMI-TEST" label="Copy activation code" />);

  fireEvent.click(screen.getByRole('button', { name: 'Copy activation code' }));

  expect(screen.getByText('copy-icon')).toBeInTheDocument();
});

test('keeps idle feedback when clipboard permission is rejected', async () => {
  const writeText = vi.fn().mockRejectedValue(new Error('Clipboard permission denied'));
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText },
  });
  render(<CopyButton value="AMAMI-TEST" />);

  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Copy' }));
    await Promise.resolve();
  });

  expect(writeText).toHaveBeenCalledWith('AMAMI-TEST');
  expect(screen.getByText('copy-icon')).toBeInTheDocument();
});

test('copies the value, resets feedback, and clears timers safely', async () => {
  vi.useFakeTimers();
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText },
  });
  const clearTimeout = vi.spyOn(window, 'clearTimeout');
  const { unmount } = render(<CopyButton value="AMAMI-TEST" />);
  const button = screen.getByRole('button', { name: 'Copy' });

  await act(async () => {
    fireEvent.click(button);
    await Promise.resolve();
  });
  expect(writeText).toHaveBeenCalledWith('AMAMI-TEST');
  expect(screen.getByText('check-icon')).toBeInTheDocument();

  await act(async () => {
    fireEvent.click(button);
    await Promise.resolve();
  });
  expect(clearTimeout).toHaveBeenCalled();

  act(() => vi.advanceTimersByTime(1500));
  expect(screen.getByText('copy-icon')).toBeInTheDocument();

  await act(async () => {
    fireEvent.click(button);
    await Promise.resolve();
  });
  unmount();
  expect(clearTimeout).toHaveBeenCalled();
});

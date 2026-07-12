import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { ExportButton } from './ExportButton';

const getMock = vi.fn();
const toastMock = vi.fn();

vi.mock('@/components/hooks', () => ({
  useApi: () => ({ get: getMock }),
  useMessages: () => ({
    t: (key: string) => key,
    labels: { download: 'Download' },
    messages: { error: 'Error' },
  }),
}));
vi.mock('@/components/hooks/useDateParameters', () => ({
  useDateParameters: () => ({ startDate: 'start' }),
}));
vi.mock('@/components/hooks/useFilterParameters', () => ({
  useFilterParameters: () => ({ path: '/home' }),
}));
vi.mock('@/components/hooks/useApi', () => ({
  isPlanLimitError: (error: any) => error?.type === 'plan-limit',
}));
vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams('country=US'),
}));
vi.mock('@umami/react-zen', async importOriginal => {
  const actual = await importOriginal<typeof import('@umami/react-zen')>();
  return { ...actual, useToast: () => ({ toast: toastMock }) };
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe('ExportButton', () => {
  test('downloads a successful export', async () => {
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const createObjectURL = vi.fn().mockReturnValue('blob:test');
    const revokeObjectURL = vi.fn();
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: createObjectURL });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: revokeObjectURL });
    getMock.mockResolvedValue({ zip: btoa('zip') });

    render(<ExportButton websiteId="website-1" />);
    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => expect(click).toHaveBeenCalled());
    expect(getMock).toHaveBeenCalledWith('/websites/website-1/export', {
      startDate: 'start',
      path: '/home',
      format: 'json',
    });
    expect(createObjectURL).toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:test');
  });

  test('reports an error and restores the button after failure', async () => {
    getMock.mockRejectedValue(new Error('Failed'));

    render(<ExportButton websiteId="website-1" />);
    const button = screen.getByRole('button');
    fireEvent.click(button);

    await waitFor(() => expect(toastMock).toHaveBeenCalledWith('Error'));
    await waitFor(() => expect(button).not.toBeDisabled());
  });

  test('does not duplicate the global dialog with a plan limit toast', async () => {
    getMock.mockRejectedValue(Object.assign(new Error('Limit'), { type: 'plan-limit' }));

    render(<ExportButton websiteId="website-1" />);
    const button = screen.getByRole('button');
    fireEvent.click(button);

    await waitFor(() => expect(button).not.toBeDisabled());
    expect(toastMock).not.toHaveBeenCalled();
  });
});

import { act, render, screen } from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vitest';
import { useDeleteQuery, useMessages, useModified } from '@/components/hooks';
import { ActivationCodeDeleteForm } from './ActivationCodeDeleteForm';

let alertProps: any;

vi.mock('@umami/react-zen', () => ({
  AlertDialog: ({ children, ...props }: any) => {
    alertProps = props;
    return <div>{children}</div>;
  },
}));
vi.mock('@/components/hooks', () => ({
  useDeleteQuery: vi.fn(),
  useMessages: vi.fn(),
  useModified: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useMessages).mockReturnValue({
    t: (key: string, values?: any) => `${key}${values?.code ? `:${values.code}` : ''}`,
    labels: { delete: 'delete' },
  } as any);
});

test('deletes the selected code and refreshes the list', async () => {
  const mutateAsync = vi.fn().mockResolvedValue(undefined);
  const touch = vi.fn();
  const onClose = vi.fn();
  vi.mocked(useDeleteQuery).mockReturnValue({ mutateAsync } as any);
  vi.mocked(useModified).mockReturnValue({ touch } as any);

  render(
    <ActivationCodeDeleteForm activationCodeId="code-1" codePrefix="AMAMI123" onClose={onClose} />,
  );

  expect(useDeleteQuery).toHaveBeenCalledWith('/admin/activation-codes/code-1');
  expect(alertProps).toMatchObject({
    title: 'activationCodes.deleteTitle',
    confirmLabel: 'delete',
    isDanger: true,
    onCancel: onClose,
  });
  expect(screen.getByText('activationCodes.deleteConfirm:AMAMI123...')).toBeInTheDocument();

  await act(() => alertProps.onConfirm());

  expect(mutateAsync).toHaveBeenCalledOnce();
  expect(touch).toHaveBeenCalledWith('activation-codes');
  expect(onClose).toHaveBeenCalledOnce();
});

test('supports deletion without a close callback', async () => {
  vi.mocked(useDeleteQuery).mockReturnValue({
    mutateAsync: vi.fn().mockResolvedValue(undefined),
  } as any);
  vi.mocked(useModified).mockReturnValue({ touch: vi.fn() } as any);
  render(<ActivationCodeDeleteForm activationCodeId="code-2" codePrefix="PREFIX" />);

  await act(() => alertProps.onConfirm());
  expect(alertProps.onCancel).toBeUndefined();
});

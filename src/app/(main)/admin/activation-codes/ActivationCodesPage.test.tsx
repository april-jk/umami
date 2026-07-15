import { render, screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import { useMessages } from '@/components/hooks';
import { ActivationCodesPage } from './ActivationCodesPage';

vi.mock('@umami/react-zen', () => ({ Column: ({ children }: any) => <main>{children}</main> }));
vi.mock('@/components/common/PageHeader', () => ({
  PageHeader: ({ children, description, title }: any) => (
    <header>
      <h1>{title}</h1>
      <p>{description}</p>
      {children}
    </header>
  ),
}));
vi.mock('@/components/common/Panel', () => ({
  Panel: ({ children }: any) => <section>{children}</section>,
}));
vi.mock('@/components/hooks', () => ({ useMessages: vi.fn() }));
vi.mock('./ActivationCodeCreateButton', () => ({
  ActivationCodeCreateButton: () => <button>create-control</button>,
}));
vi.mock('./ActivationCodesDataTable', () => ({
  ActivationCodesDataTable: () => <div>codes-table</div>,
}));

test('renders the localized administration page and its controls', () => {
  vi.mocked(useMessages).mockReturnValue({ t: (key: string) => `translated:${key}` } as any);

  render(<ActivationCodesPage />);

  expect(
    screen.getByRole('heading', { name: 'translated:activationCodes.title' }),
  ).toBeInTheDocument();
  expect(screen.getByText('translated:activationCodes.description')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'create-control' })).toBeInTheDocument();
  expect(screen.getByText('codes-table')).toBeInTheDocument();
});

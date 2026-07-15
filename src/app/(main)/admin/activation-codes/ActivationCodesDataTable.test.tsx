import { render, screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import { useActivationCodesQuery } from '@/components/hooks';
import { ActivationCodesDataTable } from './ActivationCodesDataTable';

const query = { data: [{ id: 'code-1' }], isLoading: false };

vi.mock('@/components/common/DataGrid', () => ({
  DataGrid: ({ allowSearch, children, query: queryValue }: any) => (
    <div data-allow-search={allowSearch} data-query={queryValue === query}>
      {children({ data: queryValue.data })}
    </div>
  ),
}));
vi.mock('@/components/hooks', () => ({ useActivationCodesQuery: vi.fn() }));
vi.mock('./ActivationCodesTable', () => ({
  ActivationCodesTable: ({ data }: any) => <div>table:{data[0].id}</div>,
}));

test('connects the activation code query to a searchable data grid', () => {
  vi.mocked(useActivationCodesQuery).mockReturnValue(query as any);

  const { container } = render(<ActivationCodesDataTable />);

  expect(container.firstChild).toHaveAttribute('data-allow-search', 'true');
  expect(container.firstChild).toHaveAttribute('data-query', 'true');
  expect(screen.getByText('table:code-1')).toBeInTheDocument();
});

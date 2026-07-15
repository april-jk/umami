import { render, screen } from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vitest';
import { useActivationCodeQuery, useMessages } from '@/components/hooks';
import { ActivationCodeDetails } from './ActivationCodeDetails';

let loadingProps: any;

vi.mock('@umami/react-zen', () => ({
  Column: ({ children }: any) => <div>{children}</div>,
  DataColumn: () => null,
  DataTable: ({ children, data }: any) => (
    <div>
      {data.map((row: any) =>
        children.map((column: any, index: number) => (
          <div key={`${row.id}-${index}`}>
            {column.props.label}:{column.props.children(row)}
          </div>
        )),
      )}
    </div>
  ),
  Heading: ({ children }: any) => <h3>{children}</h3>,
  Row: ({ children }: any) => <div>{children}</div>,
  Text: ({ children }: any) => <span>{children}</span>,
}));
vi.mock('@/components/common/LoadingPanel', () => ({
  LoadingPanel: ({ children, ...props }: any) => {
    loadingProps = props;
    return <div>{children}</div>;
  },
}));
vi.mock('@/components/common/CopyButton', () => ({
  CopyButton: ({ label, value }: any) => <button aria-label={label}>copy:{value}</button>,
}));
vi.mock('@/components/hooks', () => ({
  useActivationCodeQuery: vi.fn(),
  useMessages: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useMessages).mockReturnValue({ t: (key: string) => key } as any);
});

test('forwards loading state and renders an empty redemption history', () => {
  vi.mocked(useActivationCodeQuery).mockReturnValue({
    data: undefined,
    isLoading: true,
    isFetching: false,
    error: new Error('loading error'),
  } as any);

  render(<ActivationCodeDetails activationCodeId="code-1" />);

  expect(useActivationCodeQuery).toHaveBeenCalledWith('code-1');
  expect(loadingProps).toMatchObject({
    data: undefined,
    isLoading: true,
    isFetching: false,
  });
  expect(loadingProps.error).toEqual(new Error('loading error'));
  expect(screen.getByText('0 / 0')).toBeInTheDocument();
  expect(screen.getByText('activationCodes.noRedemptions')).toBeInTheDocument();
});

test('renders plan, usage, and all redemption fields with username fallback', () => {
  vi.mocked(useActivationCodeQuery).mockReturnValue({
    data: {
      id: 'code-1',
      code: 'AMAMI-DETAIL-1234',
      codePrefix: 'AMAMIDETAIL1',
      plan: 'team',
      redemptionCount: 2,
      maxRedemptions: 10,
      redemptions: [
        {
          id: 'redemption-1',
          user: { displayName: 'Ada', username: 'ada@example.com' },
          tenant: { name: 'Acme' },
          redeemedAt: '2026-07-01T00:00:00.000Z',
          membershipEndsAt: '2026-08-01T00:00:00.000Z',
        },
        {
          id: 'redemption-2',
          user: { displayName: '', username: 'fallback@example.com' },
          tenant: { name: 'Beta' },
          redeemedAt: '2026-07-02T00:00:00.000Z',
          membershipEndsAt: '2026-08-02T00:00:00.000Z',
        },
      ],
    },
    isLoading: false,
    isFetching: true,
    error: null,
  } as any);

  render(<ActivationCodeDetails activationCodeId="code-1" />);

  expect(screen.getByText('membership.plans.team.name')).toBeInTheDocument();
  expect(screen.getByText('AMAMI-DETAIL-1234')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'activationCodes.copy' })).toHaveTextContent(
    'copy:AMAMI-DETAIL-1234',
  );
  expect(screen.getByText('2 / 10')).toBeInTheDocument();
  expect(screen.getByText(/activationCodes\.user:Ada/)).toBeInTheDocument();
  expect(screen.getByText(/activationCodes\.user:fallback@example\.com/)).toBeInTheDocument();
  expect(screen.getByText(/activationCodes\.workspace:Acme/)).toBeInTheDocument();
  expect(screen.getAllByText(/activationCodes\.redeemedAt:/)).toHaveLength(2);
  expect(screen.getAllByText(/activationCodes\.membershipEndsAt:/)).toHaveLength(2);
});

test('explains when a legacy code cannot be displayed again', () => {
  vi.mocked(useActivationCodeQuery).mockReturnValue({
    data: {
      id: 'legacy-code',
      code: null,
      codePrefix: 'AMAMILEGACY',
      plan: 'pro',
      redemptionCount: 0,
      maxRedemptions: 1,
      redemptions: [],
    },
    isLoading: false,
    isFetching: false,
    error: null,
  } as any);

  render(<ActivationCodeDetails activationCodeId="legacy-code" />);

  expect(screen.getByText('activationCodes.codeUnavailable')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'activationCodes.copy' })).not.toBeInTheDocument();
});

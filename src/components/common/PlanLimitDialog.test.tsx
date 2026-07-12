import { beforeEach, describe, expect, test } from 'vitest';
import { dismissPlanLimit, showPlanLimit } from '@/store/plan-limit';
import { render, screen } from '@/test/render';
import zhCN from '../../../public/intl/messages/zh-CN.json';
import { PlanLimitDialog } from './PlanLimitDialog';

function openPrompt(overrides: Record<string, unknown> = {}) {
  showPlanLimit(
    Object.assign(new Error('Do not display this server message'), {
      code: 'website-limit-reached',
      type: 'plan-limit',
      current: 5,
      limit: 5,
      resource: 'website',
      recommendedPlan: 'starter',
      ...overrides,
    }),
  );
}

beforeEach(() => dismissPlanLimit());

describe('PlanLimitDialog', () => {
  test('renders nothing without a prompt', () => {
    render(<PlanLimitDialog />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  test('shows localized usage and recommended plan without server copy', () => {
    openPrompt();

    render(<PlanLimitDialog />);

    expect(screen.getAllByText('Usage limit exceeded').length).toBeGreaterThan(0);
    expect(screen.getByText('5 / 5')).toBeInTheDocument();
    expect(screen.getByText('Starter')).toBeInTheDocument();
    expect(screen.queryByText('Do not display this server message')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Upgrade' })).toHaveAttribute(
      'href',
      '/membership/upgrade?reason=website&plan=starter',
    );
  });

  test('dismisses the prompt from the cancel action', async () => {
    openPrompt();
    const { user } = render(<PlanLimitDialog />);

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByText('Usage limit exceeded')).not.toBeInTheDocument();
  });

  test('dismisses the prompt when the modal closes', async () => {
    openPrompt();
    const { user } = render(<PlanLimitDialog />);

    await user.keyboard('{Escape}');

    expect(screen.queryByText('Usage limit exceeded')).not.toBeInTheDocument();
  });

  test('uses contact sales when no upgrade plan is available', async () => {
    openPrompt({ recommendedPlan: null, current: undefined, limit: undefined });

    const { user } = render(<PlanLimitDialog />);

    expect(screen.queryByText('5 / 5')).not.toBeInTheDocument();
    const link = screen.getByRole('link', { name: 'Contact sales' });
    expect(link).toHaveAttribute('href', 'mailto:watson_zang@foxmail.com');
    link.addEventListener('click', event => event.preventDefault());
    await user.click(link);
    expect(screen.queryByText('Contact sales')).not.toBeInTheDocument();
  });

  test('uses feature upgrade copy when usage counts do not apply', () => {
    openPrompt({ resource: 'csvExport', current: undefined, limit: undefined });

    render(<PlanLimitDialog />);

    expect(screen.getAllByText('Upgrade').length).toBeGreaterThan(0);
    expect(
      screen.getByText('This feature requires a Starter plan subscription.'),
    ).toBeInTheDocument();
    expect(screen.queryByText('Usage limit exceeded')).not.toBeInTheDocument();
  });

  test('treats a zero entitlement as a feature gate instead of zero usage', () => {
    openPrompt({ resource: 'goalLimit', current: 0, limit: 0 });

    render(<PlanLimitDialog />);

    expect(screen.queryByText('0 / 0')).not.toBeInTheDocument();
    expect(
      screen.getByText('This feature requires a Starter plan subscription.'),
    ).toBeInTheDocument();
  });

  test('renders the prompt in the active language', () => {
    openPrompt();

    render(<PlanLimitDialog />, { locale: 'zh-CN', messages: zhCN });

    expect(screen.getByText('已超出用量限制')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '升级' })).toBeInTheDocument();
    expect(screen.queryByText('Do not display this server message')).not.toBeInTheDocument();
  });

  test('falls back to the usage overview for an unknown resource', () => {
    openPrompt({ resource: 'csvExport' });

    render(<PlanLimitDialog />);

    expect(screen.getByText('Usage Overview')).toBeInTheDocument();
  });
});

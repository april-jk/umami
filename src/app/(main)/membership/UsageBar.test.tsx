import { render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { UsageBar } from './UsageBar';

describe('UsageBar', () => {
  test('renders with percentage under 80%', () => {
    render(
      <UsageBar label="Events" locale="en-US" unlimitedLabel="Unlimited" used={50} limit={100} />,
    );

    expect(screen.getByText('Events')).toBeInTheDocument();
    expect(screen.getByText('50 / 100')).toBeInTheDocument();
    expect(screen.getByText('50.0%')).toBeInTheDocument();
  });

  test('renders with unlimited limit', () => {
    render(
      <UsageBar
        label="Events"
        locale="en-US"
        unlimitedLabel="Unlimited"
        used={1000}
        limit={null}
      />,
    );

    expect(screen.getByText('1,000 / Unlimited')).toBeInTheDocument();
    expect(screen.queryByText('%')).not.toBeInTheDocument();
  });

  test('renders with warning alert (80%)', () => {
    render(
      <UsageBar
        label="Events"
        locale="en-US"
        unlimitedLabel="Unlimited"
        used={80}
        limit={100}
        alert="warning"
      />,
    );

    expect(screen.getByText('80 / 100')).toBeInTheDocument();
    expect(screen.getByText('80.0%')).toBeInTheDocument();
  });

  test('renders with critical alert (95%)', () => {
    render(
      <UsageBar
        label="Events"
        locale="en-US"
        unlimitedLabel="Unlimited"
        used={95}
        limit={100}
        alert="critical"
      />,
    );

    expect(screen.getByText('95 / 100')).toBeInTheDocument();
    expect(screen.getByText('95.0%')).toBeInTheDocument();
  });

  test('renders with exceeded alert (100%)', () => {
    render(
      <UsageBar
        label="Events"
        locale="en-US"
        unlimitedLabel="Unlimited"
        used={100}
        limit={100}
        alert="exceeded"
      />,
    );

    expect(screen.getByText('100 / 100')).toBeInTheDocument();
    expect(screen.getByText('100.0%')).toBeInTheDocument();
  });

  test('caps percentage at 100%', () => {
    render(
      <UsageBar label="Events" locale="en-US" unlimitedLabel="Unlimited" used={150} limit={100} />,
    );

    expect(screen.getByText('100.0%')).toBeInTheDocument();
  });

  test('renders with zero usage', () => {
    render(
      <UsageBar label="Websites" locale="en-US" unlimitedLabel="Unlimited" used={0} limit={5} />,
    );

    expect(screen.getByText('Websites')).toBeInTheDocument();
    expect(screen.getByText('0 / 5')).toBeInTheDocument();
    expect(screen.getByText('0.0%')).toBeInTheDocument();
  });

  test('uses provided alert prop over calculated', () => {
    render(
      <UsageBar
        label="Members"
        locale="en-US"
        unlimitedLabel="Unlimited"
        used={1}
        limit={5}
        alert="critical"
      />,
    );

    expect(screen.getByText('1 / 5')).toBeInTheDocument();
    expect(screen.getByText('20.0%')).toBeInTheDocument();
  });

  test('formats large numbers with locale', () => {
    render(
      <UsageBar
        label="Events"
        locale="en-US"
        unlimitedLabel="Unlimited"
        used={1500000}
        limit={2000000}
      />,
    );

    expect(screen.getByText('1,500,000 / 2,000,000')).toBeInTheDocument();
    expect(screen.getByText('75.0%')).toBeInTheDocument();
  });

  test('updates number formatting and unlimited copy for another locale', () => {
    const { rerender } = render(
      <UsageBar
        label="Ereignisse"
        locale="de-DE"
        unlimitedLabel="Unbegrenzt"
        used={1500000}
        limit={2000000}
      />,
    );

    expect(screen.getByText('1.500.000 / 2.000.000')).toBeInTheDocument();
    expect(screen.getByText('75,0%')).toBeInTheDocument();

    rerender(
      <UsageBar
        label="Ereignisse"
        locale="de-DE"
        unlimitedLabel="Unbegrenzt"
        used={1500000}
        limit={null}
      />,
    );
    expect(screen.getByText('1.500.000 / Unbegrenzt')).toBeInTheDocument();
  });
});

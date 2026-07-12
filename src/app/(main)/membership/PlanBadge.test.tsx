import { render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { PlanBadge } from './PlanBadge';

describe('PlanBadge', () => {
  test('renders free plan badge', () => {
    render(<PlanBadge plan="free" />);
    expect(screen.getByText('free')).toBeInTheDocument();
  });

  test('renders starter plan badge', () => {
    render(<PlanBadge plan="starter" />);
    expect(screen.getByText('starter')).toBeInTheDocument();
  });

  test('renders pro plan badge', () => {
    render(<PlanBadge plan="pro" />);
    expect(screen.getByText('pro')).toBeInTheDocument();
  });

  test('renders team plan badge', () => {
    render(<PlanBadge plan="team" />);
    expect(screen.getByText('team')).toBeInTheDocument();
  });

  test('renders enterprise plan badge', () => {
    render(<PlanBadge plan="enterprise" />);
    expect(screen.getByText('enterprise')).toBeInTheDocument();
  });

  test('renders unknown plan with default color', () => {
    render(<PlanBadge plan="unknown" />);
    expect(screen.getByText('unknown')).toBeInTheDocument();
  });

  test('renders a localized label when provided', () => {
    render(<PlanBadge plan="free" label="免费版" />);
    expect(screen.getByText('免费版')).toBeInTheDocument();
  });
});

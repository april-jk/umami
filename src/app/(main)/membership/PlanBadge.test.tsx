import { beforeEach, describe, expect, test, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
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
});

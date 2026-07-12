import { expect, test } from 'vitest';
import { render, screen } from '@/test/render';
import { TenantsSettingsPage } from './TenantsSettingsPage';

test('shows the pricing v2.1 tenant limits and active implementation status', () => {
  render(<TenantsSettingsPage />);

  for (const value of [
    '100K events',
    '500K events',
    '1M events',
    '5M events',
    '20M+ events',
    '10K rows on Starter, 100K on Pro, 500K on Team',
    'PayPal subscriptions persist to TenantSubscription',
  ]) {
    expect(screen.getByText(value)).toBeInTheDocument();
  }

  expect(screen.getAllByText('Done')).toHaveLength(4);
});

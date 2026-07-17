import { describe, expect, test } from 'vitest';
import { PAYPAL_CURRENCIES, PAYPAL_EUR_PLAN_PRICES } from './paypal-currency';

describe('PayPal currency configuration', () => {
  test('offers USD and EUR with prices matching the configured EUR plans', () => {
    expect(PAYPAL_CURRENCIES).toEqual(['USD', 'EUR']);
    expect(PAYPAL_EUR_PLAN_PRICES).toEqual({
      starter: { monthly: 9, annual: 90 },
      pro: { monthly: 29, annual: 290 },
      team: { monthly: 79, annual: 790 },
    });
  });
});

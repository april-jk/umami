import { describe, expect, test } from 'vitest';
import { PAYPAL_CURRENCIES, PAYPAL_EUR_PLAN_PRICES } from './paypal-currency';

describe('PayPal currency configuration', () => {
  test('offers USD and EUR with prices matching the configured EUR plans', () => {
    expect(PAYPAL_CURRENCIES).toEqual(['USD', 'EUR']);
    expect(PAYPAL_EUR_PLAN_PRICES).toEqual({
      starter: { monthly: 7.87, annual: 78.71 },
      pro: { monthly: 25.36, annual: 253.61 },
      team: { monthly: 69.09, annual: 690.86 },
    });
  });
});

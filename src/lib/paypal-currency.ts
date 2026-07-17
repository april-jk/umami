export const PAYPAL_CURRENCIES = ['USD', 'EUR'] as const;

export type PaypalCurrency = (typeof PAYPAL_CURRENCIES)[number];

export const PAYPAL_EUR_PLAN_PRICES = {
  starter: { monthly: 7.87, annual: 78.71 },
  pro: { monthly: 25.36, annual: 253.61 },
  team: { monthly: 69.09, annual: 690.86 },
} as const;

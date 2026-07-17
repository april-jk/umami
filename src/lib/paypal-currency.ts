export const PAYPAL_CURRENCIES = ['USD', 'EUR'] as const;

export type PaypalCurrency = (typeof PAYPAL_CURRENCIES)[number];

export const PAYPAL_EUR_PLAN_PRICES = {
  starter: { monthly: 9, annual: 90 },
  pro: { monthly: 29, annual: 290 },
  team: { monthly: 79, annual: 790 },
} as const;

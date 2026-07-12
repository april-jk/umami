import { afterEach, describe, expect, test, vi } from 'vitest';
import { findConfiguredPlan, getPaypalPlanId } from './paypal';

const sandboxPlans = {
  PAYPAL_MODE: 'sandbox',
  PAYPAL_SANDBOX_CLIENT_ID: 'client-id',
  PAYPAL_SANDBOX_CLIENT_SECRET: 'client-secret',
  PAYPAL_SANDBOX_PLAN_STARTER_MONTH: 'starter-month',
  PAYPAL_SANDBOX_PLAN_STARTER_YEAR: 'starter-year',
  PAYPAL_SANDBOX_PLAN_PRO_MONTH: 'pro-month',
  PAYPAL_SANDBOX_PLAN_PRO_YEAR: 'pro-year',
  PAYPAL_SANDBOX_PLAN_TEAM_MONTH: 'team-month',
  PAYPAL_SANDBOX_PLAN_TEAM_YEAR: 'team-year',
};

afterEach(() => vi.unstubAllEnvs());

describe('PayPal plan configuration', () => {
  test('selects the configured plan for the active mode', () => {
    for (const [key, value] of Object.entries(sandboxPlans)) vi.stubEnv(key, value);

    expect(getPaypalPlanId('starter', 'year')).toBe('starter-year');
    expect(findConfiguredPlan('pro-month')).toEqual({ plan: 'pro', interval: 'month' });
  });

  test('rejects a missing plan ID', () => {
    vi.stubEnv('PAYPAL_MODE', 'sandbox');
    vi.stubEnv('PAYPAL_SANDBOX_CLIENT_ID', 'client-id');
    vi.stubEnv('PAYPAL_SANDBOX_CLIENT_SECRET', 'client-secret');

    expect(() => getPaypalPlanId('team', 'year')).toThrow('Missing PayPal plan configuration');
  });

  test('rejects an invalid mode before making a request', () => {
    vi.stubEnv('PAYPAL_MODE', 'development');

    expect(() => getPaypalPlanId('starter', 'month')).toThrow(
      'PAYPAL_MODE must be sandbox or live',
    );
  });
});

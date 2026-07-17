import { afterEach, describe, expect, test, vi } from 'vitest';
import {
  cancelPaypalSubscription,
  createPaypalSubscription,
  findConfiguredPlan,
  getPaypalPlanId,
  getPaypalSubscription,
  verifyPaypalWebhook,
} from './paypal';

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

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

function configureSandbox() {
  for (const [key, value] of Object.entries(sandboxPlans)) vi.stubEnv(key, value);
}

function mockPaypalFetch(...responses: Array<{ ok: boolean; status?: number; body?: unknown }>) {
  const fetchMock = vi.fn();
  for (const response of responses) {
    fetchMock.mockResolvedValueOnce({
      ok: response.ok,
      status: response.status ?? (response.ok ? 200 : 500),
      json: vi.fn().mockResolvedValue(response.body),
    });
  }
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('PayPal plan configuration', () => {
  test('selects the configured plan for the active mode', () => {
    configureSandbox();

    expect(getPaypalPlanId('starter', 'year')).toBe('starter-year');
    expect(findConfiguredPlan('pro-month')).toEqual({
      plan: 'pro',
      interval: 'month',
      currency: 'USD',
    });
  });

  test('uses a dedicated configured EUR plan', () => {
    configureSandbox();
    vi.stubEnv('PAYPAL_SANDBOX_PLAN_STARTER_MONTH_EUR', 'starter-month-eur');

    expect(getPaypalPlanId('starter', 'month', 'EUR')).toBe('starter-month-eur');
    expect(findConfiguredPlan('starter-month-eur')).toEqual({
      plan: 'starter',
      interval: 'month',
      currency: 'EUR',
    });
  });

  test('rejects a missing plan ID', () => {
    vi.stubEnv('PAYPAL_MODE', 'sandbox');
    vi.stubEnv('PAYPAL_SANDBOX_CLIENT_ID', 'client-id');
    vi.stubEnv('PAYPAL_SANDBOX_CLIENT_SECRET', 'client-secret');
    vi.stubEnv('PAYPAL_SANDBOX_PLAN_TEAM_YEAR', '');

    expect(() => getPaypalPlanId('team', 'year')).toThrow('Missing PayPal plan configuration');
  });

  test('rejects missing credentials before reading plan configuration', () => {
    vi.stubEnv('PAYPAL_MODE', 'sandbox');
    vi.stubEnv('PAYPAL_SANDBOX_CLIENT_ID', '');
    vi.stubEnv('PAYPAL_SANDBOX_CLIENT_SECRET', '');

    expect(() => getPaypalPlanId('starter', 'month')).toThrow(
      'Missing PAYPAL_SANDBOX_CLIENT_ID or PAYPAL_SANDBOX_CLIENT_SECRET.',
    );
  });

  test('rejects an invalid mode before making a request', () => {
    vi.stubEnv('PAYPAL_MODE', 'development');

    expect(() => getPaypalPlanId('starter', 'month')).toThrow(
      'PAYPAL_MODE must be sandbox or live',
    );
  });

  test('creates an approval subscription using the selected plan currency', async () => {
    configureSandbox();
    vi.stubEnv('PAYPAL_SANDBOX_PLAN_STARTER_MONTH_EUR', 'starter-month-eur');
    const fetchMock = mockPaypalFetch(
      { ok: true, body: { access_token: 'access-token' } },
      {
        ok: true,
        body: {
          id: 'subscription-id',
          links: [{ rel: 'approve', href: 'https://paypal.test/approve' }],
        },
      },
    );

    await expect(
      createPaypalSubscription({
        tenantId: 'tenant-1',
        plan: 'starter',
        interval: 'month',
        currency: 'EUR',
        returnUrl: 'https://amami.test/return',
        cancelUrl: 'https://amami.test/cancel',
      }),
    ).resolves.toEqual({ id: 'subscription-id', approveUrl: 'https://paypal.test/approve' });

    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'https://api-m.sandbox.paypal.com/v1/billing/subscriptions',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(fetchMock.mock.calls[1][1].body).toContain('starter-month-eur');
  });

  test('rejects PayPal responses without an approval URL', async () => {
    configureSandbox();
    mockPaypalFetch(
      { ok: true, body: { access_token: 'access-token' } },
      { ok: true, body: { id: 'subscription-id', links: [] } },
    );

    await expect(
      createPaypalSubscription({
        tenantId: 'tenant-1',
        plan: 'starter',
        interval: 'month',
        currency: 'USD',
        returnUrl: 'https://amami.test/return',
        cancelUrl: 'https://amami.test/cancel',
      }),
    ).rejects.toThrow('PayPal did not return an approval URL.');
  });

  test('reports authentication failures before creating a subscription', async () => {
    configureSandbox();
    mockPaypalFetch({ ok: false, status: 401 });

    await expect(
      createPaypalSubscription({
        tenantId: 'tenant-1',
        plan: 'starter',
        interval: 'month',
        currency: 'USD',
        returnUrl: 'https://amami.test/return',
        cancelUrl: 'https://amami.test/cancel',
      }),
    ).rejects.toThrow('PayPal authentication failed (401).');
  });

  test('reads and cancels a subscription through PayPal', async () => {
    configureSandbox();
    const fetchMock = mockPaypalFetch(
      { ok: true, body: { access_token: 'token-1' } },
      { ok: true, body: { id: 'subscription-id', status: 'ACTIVE' } },
      { ok: true, body: { access_token: 'token-2' } },
      { ok: true, status: 204 },
    );

    await expect(getPaypalSubscription('sub id')).resolves.toEqual({
      id: 'subscription-id',
      status: 'ACTIVE',
    });
    await expect(cancelPaypalSubscription('sub id')).resolves.toBeNull();

    expect(fetchMock.mock.calls[1][0]).toContain('sub%20id');
    expect(fetchMock.mock.calls[3][0]).toContain('/cancel');
  });

  test('reports PayPal request failures and verifies webhook outcomes', async () => {
    configureSandbox();
    vi.stubEnv('PAYPAL_SANDBOX_WEBHOOK_ID', 'webhook-id');
    mockPaypalFetch(
      { ok: true, body: { access_token: 'token-1' } },
      { ok: false, status: 422 },
      { ok: true, body: { access_token: 'token-2' } },
      { ok: true, body: { verification_status: 'SUCCESS' } },
      { ok: true, body: { access_token: 'token-3' } },
      { ok: false, status: 400 },
    );

    await expect(getPaypalSubscription('failed')).rejects.toThrow('PayPal request failed (422).');
    await expect(verifyPaypalWebhook(new Headers(), { id: 'event-1' })).resolves.toBe(true);
    await expect(verifyPaypalWebhook(new Headers(), { id: 'event-2' })).resolves.toBe(false);
  });

  test('requires a configured webhook ID before verification', async () => {
    configureSandbox();

    await expect(verifyPaypalWebhook(new Headers(), { id: 'event-1' })).rejects.toThrow(
      'Missing PAYPAL_SANDBOX_WEBHOOK_ID.',
    );
  });
});

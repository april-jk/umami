import type { TENANT_PLANS } from '@/lib/constants';

export type PaypalMode = 'sandbox' | 'live';
export type BillingInterval = 'month' | 'year';
export type BillablePlan = Exclude<
  (typeof TENANT_PLANS)[keyof typeof TENANT_PLANS],
  'free' | 'enterprise'
>;

const endpoints: Record<PaypalMode, string> = {
  sandbox: 'https://api-m.sandbox.paypal.com',
  live: 'https://api-m.paypal.com',
};

function getMode(): PaypalMode {
  const mode = process.env.PAYPAL_MODE ?? 'sandbox';
  if (mode !== 'sandbox' && mode !== 'live') {
    throw new Error('PAYPAL_MODE must be sandbox or live.');
  }
  return mode;
}

function getConfig() {
  const mode = getMode();
  const prefix = `PAYPAL_${mode.toUpperCase()}`;
  const clientId = process.env[`${prefix}_CLIENT_ID`];
  const clientSecret = process.env[`${prefix}_CLIENT_SECRET`];

  if (!clientId || !clientSecret) {
    throw new Error(`Missing ${prefix}_CLIENT_ID or ${prefix}_CLIENT_SECRET.`);
  }

  return { mode, baseUrl: endpoints[mode], clientId, clientSecret, prefix };
}

export function getPaypalPlanId(plan: BillablePlan, interval: BillingInterval) {
  const { prefix } = getConfig();
  const value = process.env[`${prefix}_PLAN_${plan.toUpperCase()}_${interval.toUpperCase()}`];

  if (!value) {
    throw new Error(`Missing PayPal plan configuration for ${plan} ${interval}.`);
  }

  return value;
}

export function findConfiguredPlan(
  planId: string,
): { plan: BillablePlan; interval: BillingInterval } | null {
  for (const plan of ['starter', 'pro', 'team'] as BillablePlan[]) {
    for (const interval of ['month', 'year'] as BillingInterval[]) {
      if (getPaypalPlanId(plan, interval) === planId) {
        return { plan, interval };
      }
    }
  }

  return null;
}

async function getAccessToken() {
  const { baseUrl, clientId, clientSecret } = getConfig();
  const response = await fetch(`${baseUrl}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      'content-type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!response.ok) {
    throw new Error(`PayPal authentication failed (${response.status}).`);
  }

  return (await response.json()).access_token as string;
}

async function paypalRequest(path: string, init: RequestInit = {}) {
  const { baseUrl } = getConfig();
  const accessToken = await getAccessToken();
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
      'paypal-request-id': crypto.randomUUID(),
      ...init.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`PayPal request failed (${response.status}).`);
  }

  return response.status === 204 ? null : response.json();
}

export async function createPaypalSubscription({
  tenantId,
  plan,
  interval,
  returnUrl,
  cancelUrl,
}: {
  tenantId: string;
  plan: BillablePlan;
  interval: BillingInterval;
  returnUrl: string;
  cancelUrl: string;
}) {
  const planId = getPaypalPlanId(plan, interval);
  const subscription = await paypalRequest('/v1/billing/subscriptions', {
    method: 'POST',
    body: JSON.stringify({
      plan_id: planId,
      custom_id: `${tenantId}:${plan}:${interval}`,
      application_context: {
        brand_name: 'amami',
        user_action: 'SUBSCRIBE_NOW',
        return_url: returnUrl,
        cancel_url: cancelUrl,
      },
    }),
  });
  const approveUrl = subscription.links?.find(
    (link: { rel: string }) => link.rel === 'approve',
  )?.href;

  if (!approveUrl) {
    throw new Error('PayPal did not return an approval URL.');
  }

  return { id: subscription.id as string, approveUrl };
}

export function getPaypalSubscription(subscriptionId: string) {
  return paypalRequest(`/v1/billing/subscriptions/${encodeURIComponent(subscriptionId)}`);
}

export function cancelPaypalSubscription(subscriptionId: string) {
  return paypalRequest(`/v1/billing/subscriptions/${encodeURIComponent(subscriptionId)}/cancel`, {
    method: 'POST',
    body: JSON.stringify({ reason: 'Cancelled by an Amami administrator.' }),
  });
}

export async function verifyPaypalWebhook(headers: Headers, event: unknown) {
  const { baseUrl, prefix } = getConfig();
  const webhookId = process.env[`${prefix}_WEBHOOK_ID`];
  if (!webhookId) {
    throw new Error(`Missing ${prefix}_WEBHOOK_ID.`);
  }

  const accessToken = await getAccessToken();
  const response = await fetch(`${baseUrl}/v1/notifications/verify-webhook-signature`, {
    method: 'POST',
    headers: { authorization: `Bearer ${accessToken}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      auth_algo: headers.get('paypal-auth-algo'),
      cert_url: headers.get('paypal-cert-url'),
      transmission_id: headers.get('paypal-transmission-id'),
      transmission_sig: headers.get('paypal-transmission-sig'),
      transmission_time: headers.get('paypal-transmission-time'),
      webhook_id: webhookId,
      webhook_event: event,
    }),
  });

  if (!response.ok) return false;
  return (await response.json()).verification_status === 'SUCCESS';
}

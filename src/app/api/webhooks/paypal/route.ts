import { verifyPaypalWebhook } from '@/lib/paypal';
import { json, notFound, unauthorized } from '@/lib/response';

export async function POST(request: Request) {
  if (process.env.PAYPAL_WEBHOOKS_ENABLED !== 'true') {
    return notFound();
  }

  const event = await request.json();
  if (!(await verifyPaypalWebhook(request.headers, event))) {
    return unauthorized({ message: 'Invalid PayPal webhook signature.' });
  }

  // Event reconciliation is intentionally deferred until a webhook is configured.
  return json({ ok: true });
}

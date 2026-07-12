# PayPal Billing

`PAYPAL_MODE` chooses the only active environment: `sandbox` or `live`. The server reads credentials and plan IDs only from the matching prefix; the browser never receives a Client Secret.

Required variables for each environment:

```bash
PAYPAL_<MODE>_CLIENT_ID=
PAYPAL_<MODE>_CLIENT_SECRET=
PAYPAL_<MODE>_PLAN_STARTER_MONTH=
PAYPAL_<MODE>_PLAN_STARTER_YEAR=
PAYPAL_<MODE>_PLAN_PRO_MONTH=
PAYPAL_<MODE>_PLAN_PRO_YEAR=
PAYPAL_<MODE>_PLAN_TEAM_MONTH=
PAYPAL_<MODE>_PLAN_TEAM_YEAR=
```

Set `PAYPAL_WEBHOOKS_ENABLED=true` only after registering `/api/webhooks/paypal` with PayPal and setting `PAYPAL_<MODE>_WEBHOOK_ID`. Until then, the endpoint returns 404 and post-approval confirmation queries PayPal directly.

Sandbox plans use USD: Starter `$9/$90`, Pro `$29/$290`, Team `$99/$990` for monthly/annual billing. Live plan IDs must be created separately and configured without reusing sandbox IDs.

Billing access uses tenant scope: tenant owners and members with `tenant:billing:manage` can manage their own tenant subscription. A global admin can manage any tenant subscription from the administrator surface. The API enforces this server-side; the upgrade page does not rely on a client-side global-admin check.

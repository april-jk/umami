# PayPal Billing

`PAYPAL_MODE` chooses the only active environment: `sandbox` or `live`. The server reads credentials and plan IDs only from the matching prefix; the browser never receives a Client Secret.

Set `MEMBERSHIP_ENABLED=1` to enforce tenant plan quotas independently of the payment provider. `CLOUD_MODE` continues to enable enforcement for legacy hosted deployments, while self-hosted installations remain unrestricted unless membership enforcement is explicitly enabled.

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
PAYPAL_<MODE>_PLAN_STARTER_MONTH_EUR=
PAYPAL_<MODE>_PLAN_STARTER_YEAR_EUR=
PAYPAL_<MODE>_PLAN_PRO_MONTH_EUR=
PAYPAL_<MODE>_PLAN_PRO_YEAR_EUR=
PAYPAL_<MODE>_PLAN_TEAM_MONTH_EUR=
PAYPAL_<MODE>_PLAN_TEAM_YEAR_EUR=
```

Set `PAYPAL_WEBHOOKS_ENABLED=true` only after registering `/api/webhooks/paypal` with PayPal and setting `PAYPAL_<MODE>_WEBHOOK_ID`. Until then, the endpoint returns 404 and post-approval confirmation queries PayPal directly.

USD and EUR are available at checkout. USD uses the unsuffixed plan variables; EUR uses the `_EUR` variables. The deployed prices are Starter `9/90`, Pro `29/290`, and Team `79/790` for monthly/annual billing in each currency. PayPal plans are immutable by currency, so each currency requires a separate Live Plan ID.

Billing access uses tenant scope: tenant owners and members with `tenant:billing:manage` can manage their own tenant subscription. A global admin can manage any tenant subscription from the administrator surface. The API enforces this server-side; the upgrade page does not rely on a client-side global-admin check.

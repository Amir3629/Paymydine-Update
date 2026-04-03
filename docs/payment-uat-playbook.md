# Payment UAT Playbook (Server Validation Pack)

Last updated: 2026-04-03

This playbook is the executable validation reference for deployed environments where real provider credentials exist.

## Status model (strict)
- `proven_ready`: runtime-validated on deployed server with PASS evidence.
- `code_complete_but_runtime_unproven`: code path exists but no deployed PASS evidence yet.
- `partial_not_safe`: incomplete or unsafe for admin assignment.
- `unsupported`: not supported by provider/app model.

## Current lock state in repository

Until this playbook is executed with PASS evidence on server, provider-backed methods stay blocked by enforcement matrix.

### Pair classification
- stripe/card: `code_complete_but_runtime_unproven`
- stripe/apple_pay: `code_complete_but_runtime_unproven`
- stripe/google_pay: `code_complete_but_runtime_unproven`
- paypal/paypal: `code_complete_but_runtime_unproven`
- paypal/card: `partial_not_safe`
- worldline/card: `code_complete_but_runtime_unproven`
- sumup/card: `code_complete_but_runtime_unproven`
- square/card: `code_complete_but_runtime_unproven`
- cod/provider-less: `proven_ready` (no external provider dependency)

## Required provider config prerequisites (admin)

### Stripe
- transaction_mode
- test/live secret key
- test/live publishable key
- apple_pay_enabled / google_pay_enabled (for wallet methods)

### PayPal
- transaction_mode
- sandbox/live client id + secret
- brand_name, currency

### Worldline
- api_endpoint
- merchant_id
- api_key_id
- secret_api_key

### SumUp
- access_token
- id_application (merchant code)
- url (default `https://api.sumup.com`)

### Square
- transaction_mode
- sandbox/live access token
- sandbox/live location id
- currency

## API UAT commands

Set base URL:

```bash
export BASE_URL="https://YOUR_DOMAIN"
```

Run smoke pack:

```bash
./scripts/payment-uat/run-payment-uat.sh smoke
```

Run individual flows:

```bash
./scripts/payment-uat/run-payment-uat.sh stripe_card
./scripts/payment-uat/run-payment-uat.sh paypal_paypal
./scripts/payment-uat/run-payment-uat.sh worldline_card
./scripts/payment-uat/run-payment-uat.sh sumup_card
./scripts/payment-uat/run-payment-uat.sh square_card
./scripts/payment-uat/run-payment-uat.sh negative_unproven_assignment
```

## Per-flow PASS/FAIL criteria

### 1) stripe/card
- Endpoint: `POST /api/v1/payments/stripe/create-intent`
- PASS:
  - response `success=true`
  - `clientSecret` exists
  - `paymentIntentId` exists
  - frontend Stripe form confirms and order finalizes.
- FAIL:
  - missing keys / 4xx/5xx
  - intent created but confirm/order finalization fails.

### 2) stripe/apple_pay
- Endpoint(s):
  - `GET /api/v1/payments`
  - wallet payment through frontend
  - `POST /api/v1/payments/stripe/create-intent`
- PASS:
  - `apple_pay` exposed in `/payments`
  - wallet button appears in supported Safari/device
  - payment confirmation succeeds and order is finalized.
- FAIL:
  - method not exposed despite config
  - wallet button unavailable in valid setup
  - confirm succeeds but order not finalized.

### 3) stripe/google_pay
- Same as Apple Pay but with supported Chrome/Google Pay setup.

### 4) paypal/paypal
- Endpoints:
  - `POST /api/v1/payments/paypal/create-order`
  - `POST /api/v1/payments/paypal/capture-order`
- PASS:
  - `create-order` returns `success=true` + `order_id`
  - after approval, `capture-order` returns success
  - order finalization confirmed in app.
- FAIL:
  - order_id missing
  - capture not completed
  - finalized order not created.

### 5) worldline/card
- Endpoints:
  - `POST /api/v1/payments/card/create-session` (`provider_code=worldline`)
  - `POST /api/v1/payments/worldline/checkout-status`
- PASS:
  - create-session returns `redirect_url` + `hosted_checkout_id`
  - status endpoint returns `success=true` and `is_paid=true` after checkout
  - order finalization occurs only after paid status.
- FAIL:
  - no hosted checkout id / no redirect
  - status stuck unpaid after successful hosted checkout
  - order finalizes before paid confirmation.

### 6) sumup/card
- Endpoints:
  - `POST /api/v1/payments/card/create-session` (`provider_code=sumup`)
  - `POST /api/v1/payments/sumup/checkout-status`
- PASS:
  - create-session returns `redirect_url` + `checkout_id`
  - status endpoint returns `is_paid=true` for paid transaction
  - order finalization after paid state only.
- FAIL:
  - no checkout id / redirect
  - status endpoint cannot read checkout or returns paid=false after successful payment
  - premature order finalization.

### 7) square/card
- Endpoints:
  - `POST /api/v1/payments/card/create-session` (`provider_code=square`)
  - `POST /api/v1/payments/square/checkout-status`
- PASS:
  - create-session returns `redirect_url` + `payment_link_id`
  - status endpoint returns `is_paid=true` after successful payment link checkout
  - order finalization after paid state only.
- FAIL:
  - no payment_link_id / redirect
  - status endpoint fails to resolve order state
  - order finalization before paid status.

## Logs to inspect
- Laravel logs:
  - `storage/logs/laravel.log`
  - filter by:
    - `Card create-session failed`
    - `Worldline checkout-status failed`
    - `PMD PAYPAL create-order`
    - `PMD PAYPAL capture-order`
- Web server logs for 4xx/5xx around UAT timestamps.

## Rollback criteria
Rollback immediately if any of these occur:
- checkout exposes provider-backed methods without PASS evidence
- provider-backed payment attempts return repeated 5xx
- order finalization occurs without paid confirmation
- regression in currently working COD/ordering path

## Post-UAT unlock policy
Only after PASS evidence should code matrix be switched from blocked to allowed provider/method pairs.

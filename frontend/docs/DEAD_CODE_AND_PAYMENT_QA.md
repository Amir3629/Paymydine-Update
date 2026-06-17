# PayMyDine Dead-Code Verification and Payment QA Notes

## Dead-code verification result

### app/checkout/page.tsx

Current status: keep.

This route is intentionally a tiny redirect route to /menu. Production smoke expects /checkout -> 307, so this file should not be deleted unless the smoke expectation is changed first.

### CustomerMenuContent.tsx

Current status: not present / no active usage found.

No removal action is needed.

## Playwright coverage currently available

### e2e/checkout-full.spec.ts

Covers:
- Open live /menu
- Interact with embedded Kazen menu frame
- Add a menu item
- Open checkout from parent dock
- Reach checkout/payment UI
- Assert no runtime/application error
- Does not submit a real payment

### e2e/theme-smoke.spec.ts

Covers:
- Live customer menu shell loads
- Kazen standalone embedded route loads
- No runtime/application error

## Manual payment-provider QA checklist

Use staging/sandbox/test provider accounts whenever possible. Do not run real payment tests on production cards unless explicitly approved.

### Cash / COD

- Add item to cart
- Open checkout
- Confirm/review items if required
- Select Cash / COD
- Confirm cash payment
- Verify order status screen appears
- Verify backend order is created with expected amount
- Verify no duplicate order was created

### PayPal sandbox

- Use PayPal sandbox buyer account
- Add item to cart
- Open checkout
- Select PayPal
- Confirm PayPal sandbox flow
- Verify redirect/capture returns successfully
- Verify backend transaction ID is stored
- Verify order status screen appears

### Card / Stripe test mode

- Use Stripe test keys and official test card
- Add item to cart
- Open checkout
- Select card
- Complete test card form
- Verify payment intent is created and confirmed
- Verify backend order amount matches frontend displayed amount
- Verify order status screen appears

### Worldline / VR Payment

- Use provider test environment only
- Verify redirect or inline form opens
- Complete provider sandbox/test card
- Verify return URL succeeds
- Verify backend order/payment status is correct

### SumUp

- Use test/sandbox if available
- Verify hosted checkout opens
- Verify return URL /payment/sumup/complete
- Verify backend order/payment state

### Apple Pay / Google Pay

- Test only in supported browser/device and test environment
- Verify wallet button appears only when configured and supported
- Verify unsupported browser/device does not show broken UI

## Important rule

Automated Playwright tests must not click final real payment submit actions unless the environment is explicitly sandbox/test and provider credentials are safe.

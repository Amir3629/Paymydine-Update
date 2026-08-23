# PayMyDine Payment Provider Architecture V1

## Goal

PayMyDine is multi-tenant. Every restaurant connects its own provider account. Provider credentials are tenant-scoped and environment-scoped.

The system separates four concepts:

1. **Provider connection** — SumUp, Stripe, Square, VR Payment, Worldline, PayPal, etc.
2. **Provider capabilities** — online payments, card-present terminal payments, refunds, payment links, saved payment methods, webhooks, etc.
3. **Payment methods** — card, Apple Pay, Google Pay, Wero, Klarna, PayPal, SEPA, and other methods exposed by a connected provider.
4. **Physical/virtual devices** — SumUp Solo, Stripe Reader, Square Terminal, VR terminal, and other card-present devices.

A payment method is not necessarily a provider. For example Wero can be exposed by a PSP/provider and must be routed through a connected provider that supports it.

## Owner UX

### Payments > Providers

Restaurant owners connect and configure provider accounts here.

Each provider card owns:

- Test / Production environment
- Connection credentials or OAuth connection
- Connection status
- Merchant/account identity
- Capabilities discovered for that merchant
- Available payment methods discovered for that merchant/environment
- Test connection

Secrets must never be returned to the browser after save.

### Devices & Hardware > Payment terminals

This page contains devices only. It must not ask for provider credentials.

Owner flow:

1. Choose an already connected terminal-capable provider.
2. Enter the provider pairing/registration code required for that device.
3. Give the terminal a friendly name.
4. PayMyDine stores provider device identifiers internally.
5. Cashiers choose among active terminals when more than one is available.

Reader IDs, pairing internals and raw JSON metadata are system/debug data and are not owner-facing fields.

## Runtime routing

At payment time PayMyDine resolves:

`tenant -> environment -> payment method -> provider connection -> optional terminal device`

Examples:

- `card + terminal -> SumUp -> Bar Solo`
- `card + online -> Stripe`
- `wero -> VR Payment`
- `apple_pay -> Stripe`

The cashier should see business concepts, not provider API details.

## Provider adapter contract

Every provider adapter should expose a common capability model. Suggested capability keys:

- `online_payments`
- `terminal_payments`
- `refunds`
- `partial_refunds`
- `payment_links`
- `saved_payment_methods`
- `webhooks`
- `oauth`

Suggested payment-method keys:

- `card`
- `apple_pay`
- `google_pay`
- `wero`
- `paypal`
- `klarna`
- `sepa_debit`
- `cash_app`

Provider adapters decide which capabilities and payment methods are actually available for the tenant, country and environment.

## Migration strategy

SumUp remains the first production implementation. The generic provider layer must preserve compatibility with the existing SumUp connection and terminal records while additional providers are added incrementally.

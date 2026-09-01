# PayMyDine Worldline Connect integration

Status: production-hardening branch, September 2026

## 1. Product boundary

PayMyDine integrates the **Worldline Global Collect / Connect** platform already used by the repository's `Worldline\\Connect\\Sdk` PHP SDK. Do not mix this implementation with unrelated Worldline product families (Sips, Direct, GoPay, SmartPOS WPI, or other regional stacks) unless a tenant contract explicitly requires a separate adapter.

For browser payments the preferred integration is **MyCheckout / Hosted Checkout**. Sensitive card fields must remain on Worldline-controlled pages/components.

For in-person payments the intended future fit is **Terminal API Cloud** if Worldline provides the merchant/partner API contract and certifies the PayMyDine use case. SmartPOS WPI is a native Android intent model and is not a replacement for a VPS-to-terminal cloud API.

## 2. PayMyDine invariants

Provider, payment method, terminal device, and user surface are separate concepts.

A method may be offered only when all of the following are true:

1. the location/country profile permits the provider;
2. the method is assigned to the provider;
3. the provider connection is enabled and tenant-scoped;
4. the provider account is entitled to the method;
5. PayMyDine marks the method/capability implemented;
6. runtime readiness succeeds.

A browser redirect, return URL, client callback, or webhook payload is a **signal**, not settlement truth. PayMyDine must retrieve authoritative provider state server-to-server and validate the expected order/reference, amount, currency, and final status before idempotent settlement.

## 3. Germany scope

Initial Worldline runtime scope is Germany / EUR.

Worldline Connect catalogue methods relevant to PayMyDine:

| PMD method | Worldline Connect catalogue | Notes |
| --- | --- | --- |
| `card` | Yes | MyCheckout hosted flow. Visa/Mastercard and merchant-enabled card products are provider/account dependent. |
| `apple_pay` | Yes | Product availability and merchant activation are required. Keep disabled until sandbox-proven in PMD. |
| `google_pay` | Yes | Product availability and merchant activation are required. Keep disabled until sandbox-proven in PMD. |
| `wero` | Yes | Worldline product 900 in the Connect documentation; Germany/EUR and merchant enablement apply. Treat current availability as account-specific and prove in sandbox before enabling. |
| `paypal` | Yes | Worldline can expose PayPal as a Connect payment product when enabled for the merchant. |
| `klarna` | Yes | Catalogue only in PMD unless/until a canonical PMD method and runtime are enabled. |
| `sepa_debit` | Yes | Catalogue only in PMD unless/until a canonical PMD method and mandate/runtime handling are implemented. |

The provider capability registry intentionally keeps Worldline `implemented_capabilities` and `implemented_payment_methods` empty until a real tenant sandbox proves the full create -> provider confirmation -> authoritative verification -> PMD settlement chain.

Do not generalize the Germany integration to Oman. Oman has OMR with three minor-unit decimals and remains isolated to its market/provider architecture.

## 4. Browser checkout architecture

Canonical flow:

1. Guest submits a real PayMyDine order first.
2. PMD payment orchestration resolves the order amount/currency and configured method/provider.
3. PMD creates a Worldline Hosted Checkout using the tenant's Connect credentials.
4. Browser is redirected to the Worldline-controlled MyCheckout page.
5. Card/wallet authentication and 3-D Secure happen on Worldline/provider surfaces.
6. Worldline redirects back to the PMD return URL.
7. PMD validates the locally stored Hosted Checkout ID and `RETURNMAC` fail closed.
8. PMD retrieves Hosted Checkout/payment state from Worldline server-to-server.
9. PMD verifies order/reference, exact minor-unit amount, currency, and a final successful provider state.
10. PMD performs idempotent order settlement and records provider identifiers.

### Retired browser design

The historical `WorldlineInlineCardForm` collected card number, expiry, and CVV in React state and encrypted them client-side. That design is retired. The component now launches the canonical hosted-provider flow and contains no merchant-owned PAN/CVV fields.

Standalone Worldline hosted-checkout buttons/test components that trusted a client-supplied amount have been removed.

## 5. Worldline Connect credentials and settings

Current repository compatibility mapping uses the tenant's Worldline provider/POS configuration:

- API endpoint (`api.preprod.connect.worldline-solutions.com` for pre-production; production endpoint for live);
- merchant ID;
- API key ID;
- secret API key;
- webhook secret/key;
- environment (test/pre-production vs live);
- terminal ID only as a future terminal placeholder, not evidence that terminal runtime is implemented.

Credentials are tenant secrets. Never expose key/secret prefixes in public diagnostics, logs, frontend config, or error messages. Test and live credentials must be kept separate.

The admin connection test must eventually be a real authenticated, non-charging Worldline API probe. A local 'configuration resolved' check is not sufficient evidence that credentials are accepted by Worldline.

## 6. Webhooks

Worldline Connect webhook requests use the configured webhook key and the `X-GCS-KeyId` / `X-GCS-Signature` headers. Verification must use the **exact raw body**, HMAC-SHA256, constant-time comparison, and the tenant-scoped webhook secret/key.

Rules:

- accept POST only;
- reject missing or invalid signatures;
- never log the raw webhook body or complete headers;
- store only required identifiers and sanitized diagnostics;
- deduplicate provider events if/when persisted;
- after accepting a valid event, retrieve authoritative Worldline payment state before settlement;
- never mark an order paid directly from webhook JSON.

The public compatibility webhook route now follows these fail-closed rules and returns `202 accepted` without claiming settlement.

## 7. Return URLs and status

`RETURNMAC` is mandatory for the legacy hosted-return endpoint. A missing/mismatched MAC returns an error before provider status retrieval is exposed to the browser.

Public status lookup is restricted to Hosted Checkout IDs already stored for the current tenant host and returns a minimal status shape. Raw provider responses and local checkout-session contents are not returned.

The production menu checkout uses the shared `payment_return_provider=worldline` verification flow and `/api/v1/payments/worldline/checkout-status` for authoritative provider lookup.

## 8. Logging and PCI controls

Never store, log, print, serialize, toast, include in analytics, or put into application exceptions:

- PAN/card number;
- CVV/CVC/security code;
- track data;
- raw authorization headers;
- API secrets/webhook secrets;
- decrypted provider payloads containing sensitive authentication data.

The old `routes/worldline-probe.php` raw-card route is fully retired and the file intentionally registers no routes.

## 9. Wero

Wero must use the Worldline Connect payment product configured for the merchant, not a fake method label or unrelated Stripe fallback presented as Worldline.

Before enabling Worldline Wero for a tenant, verify:

- Worldline has enabled Wero for that merchant/PSPID/account;
- Germany/EUR eligibility;
- the payment product returned by the merchant account matches the expected Wero product;
- redirect/deep-link/QR behavior works on desktop and mobile;
- return and webhook authentication work;
- authoritative status retrieval works;
- refunds/cancellations required by the business are available;
- PMD amount/currency/reference checks and idempotent settlement pass sandbox tests.

Until that proof exists, Wero remains catalogue-only in `ProviderCapabilityRegistry`.

## 10. Apple Pay / Google Pay / PayPal

Worldline Connect can expose these products when enabled for the merchant. PayMyDine must not infer entitlement only from Worldline marketing/catalogue documentation.

Each method needs its own sandbox proof and runtime readiness intersection before being offered. MyCheckout is preferred initially because Worldline owns the sensitive wallet/payment UI and SCA hand-off.

## 11. Refunds, captures, tokens, reconciliation

Worldline catalogue capability includes refunds, partial refunds, token/saved-method features, and webhooks. PMD should implement these only after the base payment settlement chain is proven.

Persist at minimum:

- PMD order/payment-attempt ID;
- PMD idempotency/reference value;
- Worldline Hosted Checkout ID;
- Worldline payment ID;
- provider status and final state timestamp;
- exact expected amount in minor units;
- ISO currency;
- method code;
- tenant/location ownership;
- sanitized failure/category codes where useful.

Refunds and captures must be idempotent and linked to the original provider payment ID. Reconciliation must never silently overwrite an unrelated settled amount.

## 12. Terminal / POS status

Worldline terminal support is **not implemented** in PMD today.

`WorldlineTerminalProvider` must remain fail closed and Worldline must not appear in Waiter/Cashier terminal pickers until real devices can be synchronized and charged through a certified interface.

Do not implement a terminal API from guesses based on marketing pages.

Before coding Worldline Terminal API Cloud support, obtain from Worldline:

1. exact contracted product name/business unit and Germany availability;
2. partner/merchant API documentation and OpenAPI/schema if available;
3. sandbox and production base URLs;
4. authentication model, credential scopes, certificate requirements, and rotation process;
5. merchant/store/location hierarchy and identifiers;
6. device discovery/list API, terminal identifier semantics, pairing/activation flow;
7. create-payment request/response contract;
8. asynchronous status/polling/webhook model and terminal timeout semantics;
9. cancellation, void, refund and partial-refund APIs;
10. tipping/gratuity support and receipt data;
11. terminal health/status and offline behavior;
12. girocard/card/contactless/wallet acceptance capabilities for Germany;
13. Wero-at-terminal availability, if any;
14. certification/test cases and required approval before production;
15. whether a cloud SaaS may initiate payments directly to terminals across restaurant locations without a local ECR/bridge;
16. rate limits, idempotency requirements, reconciliation/reporting APIs and daily-close semantics.

If the contracted Worldline product requires ZVT/OPI/Nexo/local-LAN middleware, PMD needs an on-premise agent and must not model it as the same cloud architecture used by SumUp Reader API or VR Payment Cloud Till.

## 13. Target terminal adapter when contract is available

If Terminal API Cloud provides true cloud-to-terminal operation, map it into the existing PMD architecture:

- synchronize real terminal records into `terminal_devices` with tenant + location ownership;
- `WorldlineTerminalProvider::createPayment()` sends the exact order amount/currency/reference to the selected provider terminal;
- save the provider transaction/reference in `payment_attempts`;
- `checkStatus()` retrieves authoritative status;
- shared `TerminalPaymentService` performs the same idempotent settlement/reconciliation already used for SumUp and VR Payment;
- only active synchronized terminals appear in Waiter/Cashier UI.

No fake Worldline terminal rows and no free-text terminal IDs in the payment UI.

## 14. Production gate

Worldline may move from catalogue-only to implemented only after all mandatory gates pass for a real tenant sandbox:

- [ ] tenant credentials accepted by Worldline;
- [ ] MyCheckout session creates successfully from a submitted PMD order;
- [ ] card details never touch PMD-owned fields/server logs;
- [ ] 3DS/SCA success, cancel, decline and timeout tested;
- [ ] `RETURNMAC` fail-closed tests pass;
- [ ] signed webhook verification tests pass;
- [ ] authoritative Worldline status lookup succeeds;
- [ ] expected order/reference, amount and currency are verified server-side;
- [ ] repeated returns/webhooks cannot double-settle;
- [ ] payment transaction is visible in PMD finance/order history;
- [ ] refunds/reconciliation are either implemented or explicitly unavailable in UI;
- [ ] live credentials are separately configured and no test endpoint/key remains;
- [ ] terminal capability remains off unless separately certified.

Only after these gates should `ProviderCapabilityRegistry` mark specific Worldline capabilities/methods implemented.

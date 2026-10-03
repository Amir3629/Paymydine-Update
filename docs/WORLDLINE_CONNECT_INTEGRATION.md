# PayMyDine Worldline Connect integration

Status: production-hardening branch, September 2026

## 1. Product boundary

PayMyDine integrates **Worldline Global Collect / Connect** for browser payments and the separately credentialed **Worldline Terminal API** adapter for supported card-present environments.

Do not mix these implementations with unrelated Worldline product families (Sips, Direct, GoPay, SmartPOS WPI, or regional stacks) unless a tenant contract explicitly requires a separate adapter.

Browser checkout now has two explicit modes:

- **Card / Wallet (`card`)**: PayMyDine-rendered card form using the official Worldline JavaScript Client SDK. Raw card data exists only in the guest browser long enough to be validated/encrypted by Worldline; PHP receives only `encryptedCustomerInput`.
- **Apple Pay / Google Pay / PayPal / Wero**: provider-hosted Worldline Connect / MyCheckout flow until a separately reviewed native wallet integration is implemented.

These modes deliberately share the same PMD order, amount, tenant, status-verification and settlement authorities.

## 2. Core PayMyDine invariants

Provider, payment method, terminal device, tenant/location and user surface are separate concepts.

A Worldline method may be offered only when all of the following are true:

1. the location/country profile permits Worldline;
2. the method is assigned to Worldline;
3. the Worldline provider connection is enabled for the tenant;
4. Worldline's product-discovery API returns an entitled product for the merchant/country/currency;
5. `ProviderCapabilityRegistry` marks the PMD method implemented;
6. runtime readiness succeeds.

A browser callback, return URL, encrypted payload, iframe message, webhook, or terminal HTTP response is never by itself settlement truth. PMD must verify the expected order/reference, amount, currency and final provider state before idempotent settlement.

## 3. Current Germany / EUR browser scope

Initial Worldline customer runtime scope is Germany / EUR.

| PMD method | Runtime mode | Notes |
| --- | --- | --- |
| `card` | Native PMD form + Worldline Client SDK encryption | Merchant-enabled card product is selected after SDK IIN discovery and checked against PMD's server-issued product allowlist. |
| `apple_pay` | Hosted Connect / MyCheckout | Requires Worldline merchant entitlement and domain/device eligibility. |
| `google_pay` | Hosted Connect / MyCheckout | Requires Worldline merchant entitlement and configured merchant origin/name. |
| `paypal` | Hosted Connect / MyCheckout | Available only if returned by Worldline for the merchant. |
| `wero` | Hosted Connect / MyCheckout | Fail closed when Worldline product discovery does not return it for the merchant/market. |
| `klarna` | Catalogue only | Not offered until PMD implements and validates the complete runtime. |
| `sepa_debit` | Catalogue only | Not offered until PMD implements mandate/runtime handling. |

Do not generalize this Germany/EUR integration to Oman or other markets. Currency minor units, legal requirements and provider architecture are market-specific.

## 4. Native Worldline Card architecture

### 4.1 Server creates an authoritative client session

The guest first has a real submitted PMD order. The browser never chooses the authoritative charge amount.

`POST /api/v1/payments/worldline/native/card/create-session`:

1. requires the `card` method to be enabled and assigned to Worldline;
2. requires an existing submitted order;
3. recomputes remaining principal amount from PMD order state;
4. uses a server-generated payment intent for split/item/coupon-adjusted payments;
5. rejects unsupported grouped multi-order payments;
6. resolves Worldline card products using merchant product discovery;
7. creates a Worldline Client API session server-side;
8. stores a tenant-bound PMD native-card session containing only safe authority data:
   - order ID;
   - merchant reference;
   - expected amount in minor units;
   - principal/tip amounts;
   - currency/country/locale;
   - allowed Worldline card product IDs;
   - creation timestamp.

The PMD session ID is a random 48-character hex value. It is not a payment credential.

### 4.2 Browser card entry and encryption

Frontend V2 renders `WorldlineNativeCardForm` inside the existing payment panel.

Raw sensitive fields are **uncontrolled DOM inputs**. They are not stored in React state, localStorage, sessionStorage, analytics or debug output.

The form follows the official Worldline Client SDK sequence:

1. `new Session(sessionDetails)`;
2. `getIinDetails(cardNumber, paymentDetails)`;
3. require `IinDetailsStatus.SUPPORTED`;
4. require the returned product ID to be in the PMD server-issued allowlist;
5. `getPaymentProduct(paymentProductId, paymentDetails)`;
6. create/get a Worldline `PaymentRequest`;
7. set `cardNumber`, `expiryDate`, `cvv`, `cardholderName` in that SDK request;
8. `validate()`;
9. `getEncryptor().encrypt(paymentRequest)`;
10. clear visible card number/expiry/CVV inputs;
11. send only the encrypted customer input, PMD session ID, product ID and return URL to PMD.

The SDK is pinned in Frontend V2 as `connect-sdk-client-js` 6.0.6.

### 4.3 Server creates the direct payment

`POST /api/v1/payments/worldline/native/card/submit` accepts only:

- PMD native session ID;
- `encrypted_customer_input`;
- allowed payment product ID;
- same-tenant HTTPS return URL.

Raw PAN/CVV/expiry request field names are explicitly rejected.

`WorldlineNativeCardService` loads amount/currency/order/reference from the server session and creates a Connect `CreatePaymentRequest` with:

- `encryptedCustomerInput`;
- authoritative order and amount;
- merchant reference;
- card product ID;
- `transactionChannel = ECOMMERCE`;
- browser 3-D Secure;
- challenge indicator `no-preference`;
- challenge canvas `600x400`;
- same-tenant HTTPS redirection return URL;
- deterministic provider idempotence context.

The encrypted payload itself is not logged.

## 5. 3-D Secure and returns

For frictionless card payments PMD polls server-to-server status directly.

When Worldline returns a `merchantAction` redirect for authentication, PMD temporarily shows the provider/bank 3DS flow. Card entry itself remains native PMD; only the required issuer authentication surface is provider-controlled.

The same-origin route `/payment/worldline-embedded-return` forwards only safe return context to the parent payment panel:

- native PMD session ID;
- `RETURNMAC`.

`POST /api/v1/payments/worldline/native/card/return` requires a valid tenant-bound session, order ID and constant-time `RETURNMAC` match before authoritative provider status is trusted.

If a bank takes over the whole browser tab rather than returning inside the challenge frame, `/payment/return` performs the same native-session + RETURNMAC verification before reusing the canonical PMD settlement flow.

## 6. Authoritative Card status and settlement

`POST /api/v1/payments/worldline/native/card/status` retrieves the payment from Worldline server-to-server using the stored Worldline payment ID.

PMD verifies:

- tenant/session ownership;
- requested PMD order ID;
- exact expected amount in minor units;
- exact ISO currency;
- merchant reference when Worldline returns one;
- a provider-completed/paid state.

Only `is_paid=true` **and** `verification_ok=true` may proceed to canonical PMD settlement.

Repeated create/return/status operations must not create a second charge or double-settle the order.

## 7. Hosted wallet architecture

Apple Pay, Google Pay, PayPal and Wero continue through the Worldline hosted runtime.

Canonical hosted flow:

1. submitted PMD order;
2. PMD resolves authoritative payment context;
3. Worldline product discovery confirms the specific method entitlement;
4. PMD creates Hosted Checkout restricted to that product/method;
5. MyCheckout is displayed in the PMD payment slot;
6. provider authentication completes;
7. PMD retrieves Worldline Hosted Checkout/payment state server-to-server;
8. PMD verifies amount/currency/reference and final status;
9. canonical idempotent PMD settlement runs.

`hosted_checkout_variant` is optional tenant configuration. If set, PMD sends the explicit MyCheckout variant; otherwise Worldline's merchant default applies.

## 8. PCI and logging boundary

The native Card mode has a broader PCI responsibility than fully hosted MyCheckout because PayMyDine renders the card-entry DOM, even though PMD's server never receives raw PAN/CVV and the official Worldline SDK encrypts them in-browser.

Production activation must be reviewed against the merchant's applicable PCI DSS / SAQ obligations. Do not claim the hosted-page PCI scope applies unchanged to this native form.

Never store, log, print, serialize into application diagnostics, toast with values, or send to analytics:

- PAN/card number;
- CVV/CVC/security code;
- track data;
- raw authorization headers;
- Worldline API/webhook secrets;
- encrypted customer input;
- provider payloads containing sensitive authentication data.

The historical raw-card probe/legacy inline endpoints remain retired. Their old route names may exist only as explicit fail-closed tombstones.

## 9. Credentials and configuration

Connect credentials are tenant-scoped:

- Connect API endpoint;
- Merchant ID;
- API Key ID;
- Secret API Key;
- webhook secret/key;
- optional MyCheckout variant ID.

Pre-production and live credentials must remain separate. Public/browser configuration must never expose server API secrets.

The authenticated admin Connect test performs a non-charging Client API session probe; a local configuration-presence check is not sufficient.

## 10. Webhooks

Worldline webhook handling must:

- accept the documented request shape only;
- validate endpoint-verification challenges where applicable;
- validate `X-GCS-KeyId` and `X-GCS-Signature` using the exact raw request body;
- use HMAC-SHA256 and constant-time comparison;
- never log the raw webhook body or full headers;
- treat webhook events as signals only;
- retrieve authoritative payment state before settlement;
- remain idempotent.

A webhook must never mark a PMD order paid solely from webhook JSON.

## 11. Refunds, captures, saved methods and reconciliation

Worldline catalogue capability includes refunds, partial refunds, token/saved-method features and webhooks. These capabilities must be exposed in PMD only when their actual runtime and reconciliation behavior is implemented and tenant-tested.

Persist/retain safe reconciliation identifiers such as:

- PMD order/payment-attempt ID;
- PMD idempotency/reference value;
- native PMD session ID or Hosted Checkout ID;
- Worldline payment ID;
- provider status/final timestamp;
- exact expected minor-unit amount;
- ISO currency;
- method code;
- tenant/location ownership.

Refunds/captures must use the original provider payment ID and must be idempotent.

## 12. Terminal API boundary

Worldline card-present support is separate from Connect e-commerce credentials.

`WorldlineTerminalProvider` implements the documented Terminal API v1 synchronous payment path and remains fail closed. It requires:

- terminal merchant ID / UMID as supplied by Worldline;
- registered terminal ID / UTID;
- separate Terminal API bearer token;
- Terminal API base URL;
- currency/amount/order attempt context.

The adapter uses NEXO protocol version `5.1-WL1.0.0` and `/api/v1/merchants/{merchant}/terminals/{terminal}/payments/sync`.

A terminal order is settled only when the synchronous NEXO response contains an explicit success/approved signal. Ambiguous responses remain pending; HTTP/provider failures remain failed. Sensitive bearer credentials are never logged.

For production, do not guess the live base URL, v2 IntegratorId, SalesSystemInfo, terminal identifiers or certification data. Use only values issued/approved under the merchant's Worldline Terminal API contract.

## 13. Security guard

`frontend/scripts/pmd-worldline-security-guard.sh` is a required deployment gate.

It verifies, among other things:

- legacy raw-card flows remain retired;
- native card uses the official Worldline Client SDK;
- IIN/product lookup and SDK encryption are present;
- raw card fields are not sent in the native frontend request;
- sensitive native inputs are not persisted/logged;
- native PHP accepts encrypted input only and binds amount/currency/reference;
- direct payment uses idempotence context;
- authoritative `payments()->get` verification exists;
- hosted Worldline return/webhook safeguards remain present;
- the Terminal API adapter remains fail closed.

## 14. Production/pre-production validation gate

Code completion is not provider certification. Before live activation for a tenant, run all applicable Worldline pre-production tests.

### Native Card

- [ ] exact Client SDK dependency installed and lockfile updated;
- [ ] native PMD card form renders without MyCheckout product list;
- [ ] supported Visa/Mastercard card completes frictionless flow;
- [ ] 3DS MethodURL/challenge test completes and returns through PMD verification;
- [ ] decline/rejection/cancel/expiry paths never settle;
- [ ] wrong order/session is rejected;
- [ ] wrong amount/currency/reference cannot settle;
- [ ] missing/wrong `RETURNMAC` is rejected;
- [ ] duplicate submit/return/status cannot double-charge or double-settle;
- [ ] server/application logs contain no raw or encrypted card payload;
- [ ] PMD finance/order state matches the Worldline payment ID and amount.

### Hosted wallets

- [ ] Apple Pay merchant/domain eligibility proven on a supported device/browser;
- [ ] Google Pay merchant origin/name and entitlement proven;
- [ ] PayPal authentication return proven;
- [ ] Wero remains hidden when product discovery does not return it;
- [ ] hosted amount/currency/reference verification and settlement remain green.

### Terminal

- [ ] real test UMID/UTID/Bearer credentials supplied by Worldline;
- [ ] registered test terminal responds through Terminal API;
- [ ] success/decline/timeout/ambiguous response behavior verified;
- [ ] repeated staff actions cannot double-settle;
- [ ] production URL/certification requirements confirmed by Worldline.

Only validated capabilities should remain enabled for guests/staff in production.

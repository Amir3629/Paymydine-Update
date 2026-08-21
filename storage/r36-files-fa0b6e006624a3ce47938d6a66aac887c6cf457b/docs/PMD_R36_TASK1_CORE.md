# PayMyDine R36 - Task 1 Core Financial Authority

Status: staged implementation on `r36/final-bill-completion`. Not production-ready by itself.

## Authority model

`Physical table visit -> immutable/mutation-guarded kitchen orders -> Billing Group -> Billing Group payments`

The Billing Group is keyed by canonical `table_id + session_key`. Kitchen/order status, financial settlement, and table availability remain independent authorities.

## Runtime behavior in Task 1

- `pmd_billing_groups`, `pmd_billing_group_orders`, and `pmd_billing_group_payments` are additive evidence tables. The migration intentionally does not drop them on rollback.
- QR `table-orders/submit` is wrapped by `PmdBillingGroupSync` in an outer tenant DB transaction, so the existing order transaction and Billing Group attachment/normalization commit or roll back together. Later table-state requests also heal a missed attachment idempotently.
- Waiter POS attaches new or mutable waiter orders inside the existing waiter save transaction. Once a Billing Group has an active reservation, settlement, or reconciliation case, the existing child order is frozen; an automatic waiter flow can create a new kitchen round instead.
- New R36 groups normalize the old per-round service-charge row before any payment has started, then compute one service charge from the aggregate child subtotal. Existing visits that already contain financial activity are marked `legacy_passthrough` and are not rewritten.
- `BillingGroupPaymentService` reserves a principal in integer cents, prevents over-reservation under a group lock, stores a deterministic allocation snapshot, and settles all child order mirrors in one tenant DB transaction.
- A provider-confirmed settlement failure records `reconciliation_required` on the same payment id and Billing Group. The same payment id is the retry authority; clients must not create a second charge.
- Legacy `order_payment_transactions` and item allocations are mirrors for compatibility. The Billing Group payment row is the canonical grouped-payment evidence.

## New API surface

Inside `/api/v1`:

- `GET /billing-groups/current?table_id=...&session_key=...`
- `POST /billing-groups/{publicId}/payments/reserve`
- `POST /billing-group-payments/{paymentId}/settle`
- `GET /billing-group-payments/{paymentId}`

Provider-specific Stripe/PayPal/hosted checkout wiring is intentionally Task 2. These endpoints provide the server-side reservation/settlement authority that Task 2 will call.

## Compatibility safeguards

- If the R36 tables do not exist, existing table-order and Waiter POS behavior is unchanged.
- An already-paid/partially-paid table visit is not silently re-priced. It enters `legacy_passthrough` and must finish on the legacy path.
- Payment settlement does not change kitchen status and does not free the physical table.
- Grouped payment updates use integer cents and deterministic allocation; no frontend loop is allowed to be the final financial authority.

## Verification performed before publishing

- `php -l` passed for every new/modified PHP file in Task 1.
- Standalone deterministic split/service-charge smoke tests passed, including 100/3 cent splitting and weighted remainder allocation.
- Full Laravel integration tests, tenant DB migration tests, frontend build, and VPS safe-stage testing are still required before production. Those are release gates in Task 3.

# PMD Financial Integrity R36 — safe foundation

## Scope and authority

R36 introduces additive, tenant-migrated storage for a **Final Bill** (`pmd_billing_groups`). Operational `orders` remain immutable kitchen rounds and remain the sole KDS input. A group links rounds through `pmd_billing_group_orders`; it never appends items to an existing order and payment does not change order status or table occupancy.

The group is keyed by the physical table and immutable visit/session key. `open` accepts new rounds; `closed` cannot be reused by a later QR visit. Staff Free Table remains the only operational close authority. Legacy, takeaway, delivery, and ungrouped order invoices retain their existing behavior.

## State machines

Payment state is `unpaid -> partial -> paid`, with `reconciliation_required` used when a provider capture is known but local settlement cannot commit. Fiscal state is independent: `not_required -> pending -> finished`, or `reconciliation_required` after failure. A fiscal retry may only retry fiscalization and must reuse `fiskaly_transaction_id`; it must never invoke a payment provider.

Each payer has one immutable `pmd_billing_group_payments` row. Unique payment ID, idempotency key, and provider reference make duplicate callbacks observable and non-settling. `reserved` precedes provider capture; `settled` contributes to paid totals; guest cash remains `reserved/requested` until staff confirmation. `reconciliation_required` retains capture evidence and must not be presented as payable again.

## Money, split, service charge, and VAT

Canonical amounts are integer cents. Equal splits distribute remainder cents from a fixed original base (EUR 100 / 3 is 33.34, 33.33, 33.33). Percentage splits use integer basis points against that same fixed plan base. Item allocations belong in the immutable payment allocation snapshot and must be locked and preflighted before settlement.

For grouped table visits, percentage service charge is calculated once from aggregate food/drink gross; fixed service charge is once per final bill. It is a gross adjustment, not tax added a second time. `pmd_service_charge_vat_rate` must be explicitly configured as `inherit` or a numeric rate before fiscalization. Coupons are restricted to a full final remaining settlement. Tips are payer-specific ledger amounts.

`vat_snapshot` and each order's `financial_snapshot` preserve the line/bucket rates and gross cents in effect when linked. Later settings changes must not rewrite them. Discounts across untargeted VAT buckets are allocated proportionally in cents with deterministic remainder distribution.

## Invoice, payment display, and reconciliation

For a new group, only the closed/paid billing group may own the canonical invoice number/date; partial payment output is a payment receipt, not a final invoice. The final presenter must combine all child round references and line snapshots, VAT buckets, service charge, discounts, tips, final total, and successful ledger payments (for example Cash EUR 30 + Card EUR 70). Admin must expose both reconciliation dimensions and stored fiscal evidence without fabricating absent fields.

Provider completion must atomically lock the payment, group, and child orders in deterministic order, preflight every allocation, write all mirrors/ledger rows, and update the group in one tenant DB transaction. On a post-capture exception, a separate transaction records `reconciliation_required`; the same payment ID is the only permitted settlement retry.

## Fiskaly authority and explicit implementation hold

The existing Fiskaly builders are not treated as R36 authority. No new SIGN DE payload was implemented because the execution environment could not access the current official fiskaly SIGN DE V2 schema/Postman documentation. This follows the requirement to stop rather than guess. Before activation, a follow-up must cite and implement the then-current official schema in one builder, validate VAT/payment/final totals in cents, persist the actual response/TSE fields, and test only with HTTP fakes. A successful transaction is immutable and fiscal correction/refund must be a distinct supported workflow.

## Deployment and rollback

Run the safe-stage installer from an immutable release source. It backs up replaced files, runs additive tenant migrations and verification, builds V2 in a same-filesystem stage when applicable, and restarts only the configured V2 PM2 service. Rollback restores application files/build only. It intentionally does **not** drop R36 financial tables after payments may have been recorded.

## Merchant/tax-adviser decisions required

Activation requires written confirmation of service-charge VAT (`inherit` versus explicit rate), tip fiscal/tax treatment, tax-included versus tax-added presentation, discount allocation policy, receipt retention/mandatory fields, and correction/refund workflows. Engineering tests do not constitute German tax or legal compliance certification.

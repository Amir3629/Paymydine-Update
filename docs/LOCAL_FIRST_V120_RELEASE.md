# PayMyDine Android 0.3.36 / V120 Local-First release

Frozen platform baseline: `ec5eafa8152a618b2c84f47f952ae8e81c545a8b`
Android versionCode: `49`
Android versionName: `0.3.36-v120-local-first`
Sync protocol: `pmd-sync-v1`
Android source commit: `821b5b82905f7fb1947f996ebb068f1fac935b35`
APK SHA-256: `PENDING_FINAL_RELEASE_DIGEST`

## Local-First authority

After a valid bootstrap and local staff verifier exist, the cashier-facing POS uses:

`Quick POS -> Android SQLite -> durable Outbox -> Sync Engine -> PayMyDine Cloud`

WAN loss/reconnect must not replace the active POS WebView or discard the active cart.

## V120 presentation parity

Android bundles the exact canonical Web Quick POS parity CSS/JS under the existing unique parity paths. V120 includes the latest mobile payment layout and all prior responsive rules. Online and offline use the same parity content.

## V119 Kitchen-round behavior

One table/bill can have multiple Kitchen rounds. A new item batch may append to the exact selected Cloud order only while canonical append authority says the order is still Received/Accepted/Confirmed and not payment/structural locked.

Once Kitchen preparation has started, Quick POS sends `order_id = null` and `force_new_check = true`; Android therefore creates a new durable local check instead of mutating an in-flight Kitchen ticket.

## Pay before Kitchen

Fresh direct Pay persists a `payment_gate=true` HOLD first. Android keeps that business flag in SQLite/Outbox. Payment-gated HOLD is Cloud-only for reconciliation so Restaurant Edge cannot release it to Kitchen early. Full canonical settlement releases the order by setting `processed=1`.

## Durable offline operations

- dine-in Send / Hold
- cart/draft restore
- full Cash queue
- table state/move queue
- provisional-order item editing
- Cloud-existing line quantity increase/void through `ORDER_ITEM_ADJUST_V1`
- exact selected received-order continuation
- new Kitchen round as a separate local check after Kitchen starts
- trusted offline timestamps
- verified cached media

Rejected reconciliation remains visible as `Needs attention`.

## Intentionally Cloud-only

- card/terminal/provider authorization
- combined/multi-check payment settlement
- split-payment provider flows
- payment-gated HOLD reconciliation
- canonical line adjustments requiring payment/KDS/manager policy

## Release gates

The release is accepted only after:
- V108 Pay-before-Kitchen contract
- V112 exact Web parity contract
- V113/V116/V117/V119 append/Kitchen-round contracts
- V120 mobile payment layout contract
- Local-First offline/reconciliation matrix
- Android unit tests
- APK assembly
- Android lint
- pinned signing certificate
- APK package/version identity

Production deployment must pin the final source commit and exact APK SHA-256 above.

# PayMyDine Android 0.3.33 / V112 Local-First release

Release target: `0.3.33-v112-local-first`
Version code: `46`
Sync protocol: `pmd-sync-v1`
Server/Web baseline: `8302ee4fa77ddc776763a14f307198a43b2c09eb` (V112 Android/Web parity)
Android source: `6e7e43596c7d78b10a070cf6c0c0e9df7189bbc7`
APK SHA-256: `PENDING_FINAL_RELEASE_DIGEST`

## Runtime contract

The cashier-facing POS is Local-First after a valid bootstrap and offline staff verifier exist:

`Quick POS UI -> native SQLite projection -> durable Outbox -> Sync Engine -> PayMyDine Cloud`

The active POS WebView/DOM is not replaced on WAN loss or reconnect. Cloud reconciliation runs in the background.

## V112 Android/Web parity

Android uses the exact canonical Web Quick POS CSS and JS under unique V112 asset paths so old APK resource interception cannot substitute an older runtime.

The APK bundles those exact V112 parity files for offline use. A cached pre-V112 shell is upgraded in memory before rendering: old Android-only layout/runtime assets are removed, old Quick POS paths are rewritten to V112 parity paths, and the parity files are served from APK assets.

## Durable offline operations

- dine-in Send / Hold
- durable cart/draft restore
- table state and move queue
- full Cash settlement queue
- edits to provisional local orders
- quantity increase/void on Cloud-existing lines through `ORDER_ITEM_ADJUST_V1`
- original offline business timestamps
- cached menu, tables, history and verified media

## Pay before Kitchen

For a fresh check, Pay persists a payment-gated HOLD first.

Offline Android preserves `payment_gate=true` in SQLite/Outbox. Cloud creates a KDS-hidden order with `processed=0`. Full settlement sets `processed=1`, after which Kitchen can see the order.

## Reconciliation safety

- stable command/idempotency identifiers prevent duplicate application
- aggregate ordering is preserved
- process restart recovers in-flight commands
- rejected commands remain visible as `Needs attention`
- remote changes never silently erase unreconciled local work
- Cash and Cloud-line edits that require canonical policy are reconciled through Cloud, not invented by Restaurant Edge

## Intentionally Cloud-only

Card/terminal/provider authorization and split-payment provider flows require external/canonical approval and must not report offline success.

## Release gates

The authoritative Android workflow must pass:

- PHP syntax
- legacy responsive regression
- Local-First V112 offline contract matrix
- V108 Pay-before-Kitchen contract
- V112 exact Web parity contract
- Android unit tests
- APK assembly
- Android lint
- pinned signing certificate
- package/version identity

The production installer must pin the final Android source commit and exact APK SHA-256 above.

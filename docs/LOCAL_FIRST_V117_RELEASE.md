# PayMyDine Android 0.3.35 / V117 Local-First release

Frozen Web/Server baseline: `36a2b39a86be27878026ad0ced40d67e5daec4bd`
Android version code: `48`
Android version name: `0.3.35-v117-local-first`
Android source commit: `PENDING_FINAL_ANDROID_SOURCE`
APK SHA-256: `PENDING_FINAL_APK_SHA256`
Sync protocol: `pmd-sync-v1`

## Runtime authority

Cashier work is durable on native SQLite/Outbox first. Cloud is synchronization and canonical side-effect authority.

WAN loss or reconnect must not replace the visible POS WebView/DOM or discard the active cart.

## Web parity

The APK bundles the same canonical Quick POS CSS/JS used by frozen V117 Web. Offline cached shells are rewritten to the parity asset paths and those files are served from APK assets.

The Android-only behavior is transport policy, not a separate POS UI.

## Durable offline operations

- dine-in Send/Hold
- durable cart/draft restore
- table state and move queue
- full single-check Cash settlement queue
- local provisional item changes
- Cloud-existing line quantity increase/void through ORDER_ITEM_ADJUST_V1
- original offline business timestamps
- cached menu/tables/history/media
- explicit rejected/reconciliation state

## V113-V117 behavior

V113 Received-order reuse, V116 append authority and V117 immediate append authority are present in the canonical runtime.

After a local save, Android returns `can_append_items=false` until Cloud ACK because the local mutation has not yet received canonical append authority. The subsequent Cloud snapshot/event restores the real append capability.

## Combined multi-check payment

V114 combined payment is intentionally Cloud-only offline. The Cloud backend settles multiple canonical checks in one DB transaction. Android must not emulate that with independent local Cash commands because a partial reconciliation would change fiscal meaning.

Single-check full Cash remains durable offline.

## Pay before Kitchen

A fresh direct Pay persists a payment-gated HOLD. Android keeps `payment_gate=true` through SQLite/Outbox.

Payment-gated HOLD is Cloud-only during synchronization so Restaurant Edge cannot release it prematurely. Canonical full settlement sets the order processed/releasable for Kitchen.

## Release gates

The authoritative Android workflow must pass:

- PHP/server syntax
- responsive regressions
- Local-First offline contract matrix
- V108 Pay-before-Kitchen
- V112 exact Web parity
- V113 History/Received reuse
- V114 multi-check payment
- V116 append/batch bill
- V117 immediate append authority
- Android unit tests
- APK assembly
- Android lint
- pinned signing certificate
- package/version identity

Production installer must verify the final APK SHA-256 before replacing the public download.

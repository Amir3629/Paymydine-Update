# PayMyDine Android 0.3.35 / V118 Local-First release

Frozen Web/Server baseline: `6b5bcb3404fc3297eb51c47e7944a220061d89e1`
Android version code: `48`
Android version name: `0.3.35-v118-local-first`
Android source commit: `PENDING_FINAL_ANDROID_SOURCE`
APK SHA-256: `PENDING_FINAL_APK_SHA256`
Sync protocol: `pmd-sync-v1`

## Local-First authority

Cashier work is durable in native SQLite/Outbox first. Cloud is synchronization and canonical side-effect authority. WAN loss/reconnect must not replace the active POS WebView or discard the active cart.

## Web parity

The APK bundles the canonical Quick POS parity CSS/JS used by frozen V118. Offline cached shells are rewritten to those asset paths and served from APK assets.

Android-specific behavior is limited to transport/offline policy. Browser Web behavior remains unchanged.

## Offline-capable work

- dine-in Send/Hold
- durable cart/draft restore
- table state/move
- full single-check Cash queue
- provisional local item edits
- Cloud-existing line increase/void via ORDER_ITEM_ADJUST_V1
- trusted original business timestamps
- cached menu/tables/history/media
- explicit pending/retrying/rejected reconciliation states

## V113-V118 order continuation

V113 Received-order reuse, V116 append authority, V117 immediate append authority, and V118 exact selected-order append are present.

Android already persists the exact positive selected `order_id` when appending to a Cloud-existing check. Immediately after a local save, the response returns `can_append_items=false` until Cloud ACK; canonical snapshot/event data restores the true append authority.

## Combined multi-check payment

V114 combined multi-check payment remains Cloud-only while offline. Cloud settles multiple canonical checks atomically in one DB transaction. Android does not fake that with independent Cash commands.

Single-check full Cash remains durable offline.

## Pay before Kitchen

Direct Pay persists a payment-gated HOLD. `payment_gate=true` is durable in SQLite/Outbox.

Payment-gated HOLD is Cloud-only during synchronization so Restaurant Edge cannot release Kitchen work early. Canonical full settlement releases the order according to server policy.

## Release gates

The Android workflow must pass:
- PHP/server syntax
- responsive regression
- Local-First offline contract matrix
- V108 Pay-before-Kitchen
- V112 Web parity
- V113 History/Received reuse
- V114 multi-check payment
- V116 append/batch bill
- V117 immediate append authority
- V118 exact selected-order append
- Android unit tests
- APK assembly
- Android lint
- pinned signing certificate
- package/version identity

The production installer must verify the final APK SHA-256 before replacing the public download.

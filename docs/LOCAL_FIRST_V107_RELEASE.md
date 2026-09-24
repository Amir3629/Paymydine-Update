# PayMyDine V107 Local-First release manifest

Release: Android 0.3.32 / V107
Version code: 45
Android version name: `0.3.32-v107-local-first`
Android source commit: `e79ccb8669a309369fe4c834411a2bb7b1eab4de`
Sync protocol: `pmd-sync-v1`
Release channel: `pmd-android-local-first-preview`

APK SHA-256: `PENDING_RELEASE_VERIFICATION`

## Runtime authority

The cashier-facing POS uses native SQLite/local transport whenever a valid local bootstrap and offline staff session exist. Cloud is background synchronization/canonical side-effect authority.

Reconnect must not replace the active POS WebView or discard the active cart.

## Durable offline work

- new dine-in order Send/Hold
- local provisional item edits
- full Cash settlement queue
- table state/move queue
- Cloud-existing order-line quantity increase/void via `ORDER_ITEM_ADJUST_V1`
- durable UI draft/cart restore
- original offline business timestamps
- cached menu/table/history/media projection

Rejected reconciliation is separate from active queue work and remains visible as `Needs attention`.

## Cloud-existing line edits

The tablet queues canonical line identity + quantity intent. It does not recreate modifier/option selections.

Cloud reconciliation calls the existing canonical server `increaseItemV68` / `voidItemV22` paths so payment locks, kitchen/preparation policy, option quantity changes and operation audit stay authoritative.

## V107 offline presentation

V107 uses isolated Android-only form-factor CSS/JS instead of inlining full Quick POS CSS/JS in Blade.

Android 0.3.32 bundles and intercepts those V107 assets offline. A legacy cached shell is upgraded in-place by injecting the V107 asset links and backfilling the native sync-status chip. No app-data reset is required.

## Time/media integrity

- bootstrap publishes trusted `server_time_ms`
- Android combines server epoch with monotonic `elapsedRealtime()`
- offline image cache records/verifies SHA-256

## Intentionally Cloud-only

The app must not report success offline for card/terminal/provider authorization or split-payment provider flows. External/canonical approval is required.

## Multi-device conflict behavior

Remote Cloud events refresh durable local projections. If another device changes an aggregate while this tablet has unreconciled local work, the local work is retained and the bill enters explicit reconciliation instead of silently overwriting either side.

## Release verification

The Android workflow must pass PHP/server safety contracts, the responsive/UI regression suite, V106/V107 Local-First offline contract matrix, signing-certificate pin, unit tests, APK assembly, lint and APK package/version identity before the release asset is accepted.

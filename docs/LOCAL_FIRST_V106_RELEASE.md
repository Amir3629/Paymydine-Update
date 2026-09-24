# PayMyDine Android 0.3.31 / V106 Local-First release

Release channel: `pmd-android-local-first-preview`
Android branch: `feature/android-local-first-v1`
Version code: `44`
Version name: `0.3.31-v106-local-first`
Sync protocol: `pmd-sync-v1`

## Local-First runtime

- After a valid bootstrap/offline staff session exists, SQLite/native local transport is the cashier-facing authority even while Cloud is healthy.
- Cloud is used for background sync, bootstrap refresh and canonical side effects.
- A missing cached canonical HTML shell may be seeded from Cloud once; the shell-seed recursion guard prevents local/cloud re-entry loops.
- Reconnect keeps the visible WebView/DOM and reconciles in the background.
- Pending/retrying/in-flight/rejected work is visible separately; rejected work is not treated as synced.
- PayMyDine Cloud health is based on real sync API results, not only Android validated-network state.
- Offline business timestamps use a trusted server epoch plus Android monotonic elapsed time.
- Offline image cache stores and verifies SHA-256 metadata.

## V106 Cloud-existing order-line edits

`ORDER_ITEM_ADJUST_V1` allows safe offline quantity increase/void of an existing Cloud line.

The tablet queues only canonical line identity + quantity intent. It does not recreate ordered modifiers/options. Reconciliation runs through the existing server `increaseItemV68` / `voidItemV22` methods, preserving payment locks, kitchen/preparation rules, option-quantity updates and operation audit.

Cloud ACK updates the durable local snapshot and rebinds later queued edits to the new aggregate version. Remote item-adjust events update other tablets' durable snapshot. Version conflicts/rejections remain visible as reconciliation errors.

## Still intentionally Cloud-only

These must not be reported as successful while disconnected because they need external/canonical approval:

- card / terminal / provider authorization
- split-payment provider flows
- any operation rejected by canonical payment, KDS or manager policy

## Platform

Server V106 merged source: `ac8ce26792f7765585c7b7cce73f49a3440adf7c`
Final platform installer commit: `402c335f88a2c764d3392fcfb2a16a9638090f72`
Installer: `deploy/pmd-v106-local-first-final.sh`

## Verification gates

The Android workflow verifies:

- PHP syntax and server safety contracts
- `tests/pmd-responsive-matrix-v102.test.mjs`
- `tests/pmd-local-first-v106.test.mjs`
- Android unit tests
- debug APK assembly
- Android lint
- package/version identity
- pinned preview signing certificate

The final APK SHA-256 is recorded only after the signed GitHub Actions release succeeds.

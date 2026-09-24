# PayMyDine V104 Local-First V2 release manifest

Release: V104 / Android 0.3.30
Date: 2026-09-24

## Source of truth

- Platform branch: `feature/platform-local-first-v2-v104`
- Platform deploy payload commit: `8969d817354a1959c54efe17b38111e563530481`
- Android branch: `feature/android-local-first-v2-v104`
- Android source commit for this manifest: `bb104c1129e9656fc8b319fe679b7e58f13b207e`
- Android versionCode: `43`
- Android versionName: `0.3.30-v104-local-first-v2`
- Sync protocol: `pmd-sync-v1`

## V104 contract

1. Once the tablet has a valid local bootstrap/session, Quick POS opens on the native SQLite/local bridge even when the internet is healthy.
2. Cloud is background synchronization authority; it is not the cashier-facing request path.
3. Reconnect does not replace/reload the visible WebView.
4. Outbox active work and rejected work are counted separately.
5. POS exposes a compact sync state: Synced, Offline/Connecting with waiting count, or Needs attention.
6. Cloud health is derived from real PayMyDine sync API success/failure, not only Android's generic validated-network flag.
7. Bootstrap publishes `server_time_ms`; Android stores it with `elapsedRealtime()` and uses that anchor for offline order/payment business timestamps.
8. Offline image cache stores and verifies SHA-256 when the cached asset is refreshed.
9. Existing V101 durable Cash/idempotency/non-destructive reconnect protections remain in the Android branch.

## Intentionally Cloud-only

These are not represented as offline-successful actions:
- card/terminal/provider approval;
- split payment;
- creating a new Pickup/off-premise order;
- mutations of an already-sent Cloud line that require canonical payment/KDS/manager policy checks.

Those actions must not be faked as successful offline. A future certified command may enable them only if the same canonical server policy is preserved.

## Restaurant-wide WAN outage

A single tablet is protected by SQLite + outbox. Multiple tablets editing the same table while WAN is down require Restaurant Edge/LAN authority to avoid divergent independent histories. The existing Edge subsystem remains the intended path for this case.

## VPS deploy

Use `deploy/pmd-v104-local-first-platform.sh`. It stages files from the pinned platform commit, validates markers/syntax, creates a backup, preserves ownership/modes, installs only the V104 platform support files, and clears Laravel view/cache.

The VPS script does not install an Android APK. Publish the Android binary only after the V104 Android GitHub Actions run has completed successfully and the APK checksum is known.

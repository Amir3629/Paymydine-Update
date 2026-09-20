# PayMyDine Android Local-First V1

Native Kotlin/Jetpack Compose replacement for the remote-page wrapper approach.

- minSdk 26 (Android 8.0)
- target/compile SDK 36 (Android 16)
- no WebView
- WAL SQLite local source of truth
- durable command outbox + event inbox/cursor
- Android Keystore device secret storage
- validated-internet state
- mDNS/NSD discovery for `_paymydine-edge._tcp.`
- pinned Edge fingerprint gate
- trusted Edge -> Cloud -> offline transport policy

The build deliberately does not replay order/payment mutations yet. Payment settlement already has idempotency server-side, but generic order replay must first gain the same server guarantee.

Build:

```bash
cd mobile/android
gradle --no-daemon testDebugUnitTest assembleDebug lintDebug
```

See `docs/ANDROID_LOCAL_FIRST_ARCHITECTURE_V1.md`.

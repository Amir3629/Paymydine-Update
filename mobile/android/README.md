# PayMyDine Android Local-First V1

Native Kotlin/Jetpack Compose restaurant app replacing the remote-page wrapper approach.

## Runtime baseline

- Android 8.0 / API 26 minimum
- Android 16 / API 36 target + compile SDK
- native Compose UI; no WebView runtime
- JDK 17 / Gradle 8.13
- one APK with role-driven POS/Waiter/KDS surfaces

## What is implemented on this branch

### Secure device trust

- browser-assisted pairing through the existing PayMyDine Login/MFA/Site Access flow
- Owner/Manager workplace approval remains canonical
- one-time 120-second exchange secret returns to the app
- long-lived device token is rotated server-side and stored only in Android Keystore
- bearer requests are revalidated against the active tenant user/staff/location/role

### Local-first data

- WAL SQLite is the Android source of truth
- bootstrap persists location/platform context, role/surfaces, menu/modifiers, tables/floors and KDS metadata
- durable local drafts survive process/device restarts
- durable outbox keeps stable UUID/idempotency keys
- inbox/event cursor applies canonical sync events without duplicate effects

### Native POS / Waiter

- floor/table selection
- local menu search
- cached modifier validation and pricing
- durable local cart/draft
- hold/send commands
- canonical server persistence through the existing Waiter POS business path
- aggregate-version conflict detection
- exactly-once command ledger replay

### Native KDS

- station selection
- local ticket projection
- KDS status transitions
- version checks to reject stale concurrent changes
- Cloud and Restaurant Edge snapshots

### Restaurant Edge

A primary Android POS can run the optional foreground Restaurant Edge authority:

- local TLS server
- mDNS/DNS-SD advertisement on `_paymydine-edge._tcp.`
- certificate SHA-256 fingerprint pinning
- cached, expiring peer trust/permission snapshots
- LAN command/event/KDS endpoints
- durable Edge command/order/event storage
- WAN-loss order send/hold and KDS coordination between restaurant devices
- Cloud reconciliation when WAN returns
- explicit reconciliation-required events instead of silent conflict guessing

The preferred production Edge is a continuously powered primary POS/appliance. A random waiter phone should not be the restaurant's only coordinator.

## Offline truth table

| Situation | Behaviour |
| --- | --- |
| WAN available | Trusted Edge when present, otherwise Cloud |
| WAN down + trusted Edge | POS/Waiter order hold/send and KDS coordination continue on LAN |
| WAN down + no Edge | Local menu/tables/drafts remain available; multi-device/sensitive writes are not claimed |
| Card/provider payment without authority | Fails closed; the app never invents approval |
| Reconnect | Edge/outbox replays stable command IDs and reconciles with Cloud |

Cash/card/fiscal payment execution is **not** certified offline in this milestone. Existing server/provider/terminal settlement authorities remain unchanged.

## Exactly-once order rule

Every replayable command has:

- stable `command_id` UUID
- stable `idempotency_key`
- location/device/human identity
- aggregate + aggregate id
- expected base version
- immutable request hash

The tenant command ledger, business mutation, aggregate version bump and sync event commit in one database transaction.

For an order born offline, the first local command may create the Cloud order. After Cloud returns its canonical order id/version, later queued local commands are rewritten onto that same canonical order before reconciliation. They must never create a second bill.

## Build

With Android SDK 36 and JDK 17 installed:

```bash
cd mobile/android
gradle --no-daemon testDebugUnitTest assembleDebug lintDebug
```

CI also PHP-lints and contract-checks the server-side mobile files.

## Production gate

Do not call this production-certified until a real tenant/device matrix passes:

- pair/revoke/re-pair
- POS send/hold online
- WAN cut during command
- two Android devices through one Edge
- KDS receives and changes tickets while WAN is physically disconnected
- Edge process/device restart
- repeated identical command after timeout
- multiple offline changes to one order then reconnect
- conflict/reconciliation case
- Android process kill/restart
- long outage crossing permission snapshot expiry
- provider/terminal payment boundary tests

See `docs/ANDROID_LOCAL_FIRST_ARCHITECTURE_V1.md`.

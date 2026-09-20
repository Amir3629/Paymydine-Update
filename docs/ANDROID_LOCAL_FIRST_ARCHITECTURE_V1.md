# PayMyDine Android Local-First Architecture V1

## Decision

The Android restaurant runtime is native and local-first. It is not the current Admin website embedded in a WebView.

PayMyDine Cloud remains the long-term business authority. Android renders durable local SQLite state. A trusted Restaurant Edge on the restaurant LAN becomes the coordination authority during WAN outages.

## Current implementation state

This branch now contains more than the original foundation:

- native Kotlin/Compose app
- secure pairing through canonical PayMyDine Login/MFA/Site Access
- read bootstrap into SQLite
- tenant-scoped idempotent command/event ledger
- native POS/Waiter table/menu/draft/send/hold flow
- native KDS projection/status flow
- optional Android foreground Restaurant Edge
- pinned TLS + mDNS LAN discovery
- durable Edge command/order/event storage
- offline LAN order/KDS coordination
- Cloud reconciliation and explicit conflict events

Payments/fiscal hardware remain outside the offline-certified command set.

## Existing platform authorities we preserve

The Android work does not replace:

- tenant database selection/middleware
- `LocationPlatformContext` for country-sensitive runtime behaviour
- PayMyDine role/permission authority
- Site Access trusted-device authority
- canonical Waiter POS order persistence
- KDS workflow/status rules
- Payment Method / Provider / Terminal Device separation
- provider/server payment verification
- existing payment-settlement idempotency

Android and Edge call or wrap these authorities; they do not write arbitrary tenant business tables directly.

## Non-negotiable invariants

1. Android never connects directly to tenant MySQL.
2. Every command carries tenant/location/device/human identity.
3. Cloud or the trusted Restaurant Edge verifies authorization.
4. Device identity and human/staff identity remain separate.
5. Raw long-lived device secrets live only in Android Keystore; server stores hashes.
6. Payment/provider/fiscal approval fails closed without its authoritative system.
7. Every replayable mutation has one stable globally unique command/idempotency key.
8. Orders/KDS are versioned; no generic last-write-wins for money/order state.
9. A local write is durable before UI reports it queued/applied.
10. Edge is the LAN authority; restaurant clients do not form an uncontrolled peer mesh.

## Topology

### WAN available

```text
Android POS / Waiter / KDS
        |
        +--> trusted Restaurant Edge, when present
        |          |
        |          +--> PayMyDine Cloud
        |
        +--> PayMyDine Cloud, if no Edge is configured
                   |
                   +--> active tenant DB
```

Cloud returns canonical order ids, versions and events.

### WAN unavailable with Edge

```text
Android POS / Waiter / KDS
        |
        +--> pinned TLS Restaurant Edge
                    |
                    +--> local Edge DB / event log / KDS projection
                    |
                    +--> durable reconciliation queue
```

The Edge validates the cached staff profile, restaurant location, table/menu snapshot, modifiers and aggregate version before applying commands locally.

### WAN unavailable without Edge

The device keeps its last bootstrap/menu/table state and durable drafts/outbox. It does not claim cross-device coordination. Commands that require a restaurant authority remain queued/fail closed.

## Android support

V1 production floor is Android 8.0 / API 26+. Target/compile SDK is Android 16 / API 36.

Supporting every historical Android release is not a safe promise because modern TLS, Keystore, foreground-service and network behaviour are required.

## Secure pairing

The APK never receives the user's PayMyDine password.

Flow:

```text
Android app
  -> HTTPS tenant /admin/mobile/pair/start
  -> canonical PayMyDine Login
  -> existing MFA / Site Access approval
  -> one-time exchange (120 s)
  -> Android callback
  -> exchange consumed once
  -> rotated staff_personal device token
  -> Android Keystore
```

Server bearer authentication then resolves the currently active user/staff/location/role and rejects revoked/inactive devices.

## Bootstrap

The bootstrap endpoint returns a versioned tenant snapshot including:

- tenant/location identity
- country/platform context
- currency/timezone
- user/staff/role/permissions/surfaces
- menu categories/items/modifiers
- floors/tables
- KDS stations/status metadata
- non-secret payment availability metadata
- sync cursor
- Edge trust metadata when configured

The app writes the snapshot into SQLite transactionally and native UI reads SQLite.

## Cloud sync ledger

Tenant tables:

- `pmd_sync_commands`
- `pmd_sync_events`
- `pmd_sync_aggregate_versions`
- `pmd_mobile_pair_exchanges`
- `pmd_mobile_edges`

Each accepted command stores an immutable request hash. Reusing a command/idempotency key with different content is rejected.

For certified order/KDS commands, the command row, canonical business mutation, aggregate version change and emitted event are committed in one tenant-database transaction. A duplicate request returns the previously stored result instead of repeating the business effect.

## Command set in this milestone

Certified:

- `ORDER_HOLD_V1`
- `ORDER_SEND_V1`
- `KDS_STATUS_V1`

Not certified here:

- card/provider settlement
- fiscal receipt submission
- arbitrary manager/admin CRUD
- stock/accounting mutations
- table merge/transfer unless separately added and tested

## Offline order reconciliation

New offline orders use a stable client aggregate such as `local:<uuid>`.

The Edge may apply several versioned mutations locally while WAN is down. On reconnect:

1. first unresolved order command is sent with its original idempotency key;
2. Cloud creates/updates the canonical order once;
3. Edge stores returned `order_id`, canonical aggregate id, version and updated timestamp;
4. all later queued local commands for that order are rewritten to `order:<server-id>`;
5. they use the latest returned canonical version and expected timestamp;
6. a Cloud 409/422/403 becomes `RECONCILIATION_REQUIRED_V1` instead of silent overwrite.

This mapping is required to prevent multiple offline mutations from creating multiple Cloud bills.

## Restaurant Edge trust

Discovery type: `_paymydine-edge._tcp.`

Discovery alone is never trust. The client requires the exact SHA-256 TLS certificate fingerprint established through PayMyDine Cloud/bootstrap.

The Edge caches encrypted peer device tokens and an expiring Cloud-validated profile. A device with no current cached trust snapshot cannot join a restaurant while WAN is down.

## Restaurant Edge responsibilities

- foreground always-on process
- local TLS listener
- mDNS advertisement
- same-restaurant peer validation
- role/surface authorization from cached profile
- durable command ledger
- durable provisional order state
- durable event stream
- native KDS snapshot
- local menu/modifier/table validation
- Cloud drain/reconciliation
- explicit conflict surfacing

A dedicated powered POS/appliance is preferred. Android may host the Edge, but a waiter handset is not a reliable single point of restaurant coordination.

## Native surfaces

One APK, role-driven:

- Owner/Manager: operational POS/KDS access allowed by profile
- Cashier: POS/order surface
- Waiter: table/menu/order surface
- KDS role: KDS surface

This avoids separate business-authority forks between multiple Android apps.

## Payment boundary

Current milestone deliberately keeps payment authority conservative:

- local browse/table/menu/draft: yes
- order hold/send through trusted Edge: yes
- KDS LAN updates through trusted Edge: yes
- external/card/provider approval: no offline fabrication
- fiscal submission: country integration remains authoritative
- cash/card settlement commands: require a separate certified phase with reconciliation and country rules

## Failure behaviour

- duplicate command: return stored result
- same idempotency key with different request: reject
- stale aggregate version: reject
- unknown/revoked device: reject
- unknown Edge certificate: reject
- new peer while WAN down: reject
- unknown table/menu/modifier: reject
- Cloud conflict during Edge reconciliation: mark reconciliation required
- no WAN/no Edge: preserve draft/outbox; do not claim remote success

## CI / release gate

CI performs:

- PHP syntax checks for server mobile changes
- contract guard checks
- Android unit tests
- debug APK assembly
- Android lint

A green CI build is necessary but not sufficient for production.

## Real-device certification matrix

Before merging/releasing as production:

1. fresh install and secure pairing
2. device revocation/re-pair
3. online table/menu/modifier order
4. hold/send and canonical KDS appearance
5. two Android clients on one Edge
6. physical WAN disconnect while LAN remains up
7. offline order seen on KDS
8. KDS status transition seen by other LAN device
9. second/third mutation to the same offline-born order
10. reconnect and verify exactly one Cloud bill
11. duplicate HTTP replay after simulated lost response
12. Edge restart/power loss
13. Android client process kill/restart
14. stale-version two-device conflict
15. menu change during outage
16. long outage across permission-snapshot expiry
17. provider/terminal/payment failure boundaries

## Definition of “real offline”

A workflow is only offline-ready when WAN is physically removed and:

1. the user can complete the certified action;
2. another required LAN device sees it;
3. restart does not lose it;
4. retry cannot duplicate the business effect;
5. reconnect converges without silent financial/order conflict;
6. audit evidence identifies device, staff, command and final canonical result.

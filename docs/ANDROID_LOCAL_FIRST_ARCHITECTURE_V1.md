# PayMyDine Android Local-First Architecture V1

## Decision

The new Android restaurant runtime is native and local-first. Do not continue the old remote web platform inside an app.

PayMyDine Cloud remains canonical. Android renders durable local SQLite state. A restaurant-local PayMyDine Edge is the LAN authority when WAN is unavailable.

## Existing platform authorities we keep

Current main already has canonical Quick POS/Waiter POS order and payment logic, tenant-scoped device inventory, KDS station configuration, Site Access device trust, and a local POS agent token pattern.

Important existing facts:

- payment settlement is already idempotent;
- generic order replay is not yet proven idempotent;
- `pmd_site_access_devices` already models restaurant/personal trusted devices;
- Site Access already has `pair_staff_device`, Owner/Manager approval and hashed tokens;
- `pos_devices` + PosAgent pairing already uses one-time pairing secrets and hashed long-lived tokens;
- Turkey Edge work already demonstrates event_id + aggregate/version + idempotency key + pending/retry/ack as a valid direction, but it is Turkey-only and must not become the global table directly.

## Non-negotiable rules

1. Android never writes tenant DBs directly.
2. Every command includes tenant/location/device/human identity.
3. Server or trusted Edge verifies role/permission.
4. Device identity and staff identity remain separate.
5. Raw device tokens are stored only in Android Keystore; server stores hashes.
6. Payments/fiscal/provider results fail closed without authoritative verification.
7. Every replayable mutation gets one stable globally unique command ID/idempotency key.
8. Orders/KDS use aggregate versions; no blind last-write-wins for money/order state.
9. Local writes are transactionally durable before UI reports success.
10. Edge is the LAN authority; no uncontrolled peer-to-peer mesh.

## Topology

Online:
Android POS/Waiter/KDS -> trusted Edge when present -> Cloud -> active tenant DB.

WAN down:
Android POS/Waiter/KDS -> trusted Edge -> local Edge DB/event log. When WAN returns, Edge drains outbox and pulls cloud events.

No WAN and no Edge:
Android keeps local state/drafts/outbox, but does not pretend multi-device coordination or sensitive writes succeeded.

## Android baseline

Production floor is Android 8/API 26+. Target is Android 16/API 36. "All Android versions" is not a safe promise; older devices become a separate compatibility track after security/hardware testing.

## Local DB

Core tables:
- menu/catalog
- floors/tables
- orders + stable local line IDs
- KDS tickets
- durable outbox
- durable inbox events
- monotonic sync cursor

UI reads local DB. Network sync updates local DB.

## Command envelope

Fields:
- command_id UUID
- idempotency_key
- tenant_host
- location_id
- device_id
- staff_id/user_id
- aggregate + aggregate_id
- base_version
- command_type
- payload
- created_at_local

Retry never changes command_id.

Cloud/Edge must unique-index command_id/idempotency_key, validate identity/permission/version, transactionally apply the business mutation, append exactly one event, and return the previous result for duplicate command IDs.

## Event envelope

- monotonic location sequence
- event_id UUID
- aggregate + aggregate_id
- aggregate_version
- event_type
- payload
- occurred_at authority time

Clients pull after a cursor and ignore duplicate event IDs transactionally.

## Conflicts

Never generic last-write-wins.

- order line add: unique line UUID
- quantity change: line + expected version
- line remove: tombstone command
- KDS state: versioned transition
- transfer/merge: serialized by Edge/Cloud
- payment: existing settlement idempotency authority
- concurrent settlement conflict: reconciliation-required, never guess

## Security / pairing

Reuse Site Access. Android pairing should wrap the existing device trust domain with a one-time mobile token exchange. Initial pairing requires internet/Owner-Manager approval. Offline continuation uses device trust + an expiring permission snapshot + trusted Edge.

Never embed DB credentials, app.key, provider secrets or recovery secrets in the APK.

## Edge discovery

DNS-SD type: `_paymydine-edge._tcp.`

Discovery is not trust. The client only uses an Edge if TLS is advertised and its pinned certificate/public-key fingerprint matches the value established at pairing.

## Edge responsibilities

- local TLS + mDNS
- durable local event/command store
- local auth/permission validation
- POS/Waiter/KDS pub-sub
- hardware bridge where applicable
- cloud replication
- reconciliation/recovery

A dedicated primary POS/appliance is preferred as Edge. A random waiter phone must not be the only restaurant coordinator.

## Rollout

A. Android foundation (this branch): native app, local DB, outbox/inbox, Keystore, Edge discovery, CI.
B. Secure pairing + read-only bootstrap.
C. Global tenant-safe sync ledger/API.
D. Native POS vertical slice with idempotent order commands.
E. Native Waiter + KDS using the same protocol.
F. Payments/hardware/fiscal boundaries.
G. WAN-cut/process-kill/duplicate/conflict/long-outage chaos certification.

## Definition of real offline

A workflow is offline-ready only when WAN can be physically removed and:
1. the user completes it;
2. required LAN devices see it;
3. restart does not lose it;
4. retry cannot duplicate the business effect;
5. reconnect converges with Cloud without silent financial/order conflict;
6. audit identifies device, staff, command and canonical result.

# PayMyDine Cash Drawer / Local POS Readiness R1

Date: 2026-08-24

Status: static repository audit complete; production runtime audit still required via `audit/pmd-cash-drawer-readiness-r1.sh`.

This document is intentionally an audit / action blueprint. It does not deploy or migrate anything.

## 1. Product architecture decision

Primary production path for restaurant hardware should be:

`Cashier Lab -> tenant command queue -> PayMyDine Local POS Agent -> Windows receipt printer -> printer drawer-kick port -> cash drawer`

The default drawer type should be printer-driven (`rj11_printer`). USB, serial, network and integrated types remain advanced options but should still use the Local POS Agent whenever the hardware lives inside the restaurant LAN / Windows POS machine.

Receipt printing and drawer opening are separate actions. A cash payment may open the drawer without printing a receipt.

## 2. Existing implementation that should be kept

- Visible settings UI is `/admin/pmddevices`, Cash drawers section.
- Drawer configuration already supports local POS terminal, printer mapping, auto-open on cash, connection type, ESC/POS pulse, network, serial, USB and manual/test tools.
- Default ESC/POS drawer pulse is `27,112,0,60,120`.
- Server command service already models `open_drawer`, `test_connection`, `list_printers`, `test_print`, and `diagnose_drawer`.
- Drawer-to-local-terminal mapping already exists via `cash_drawers.local_pos_device_id`.
- POS terminal heartbeat model already exists (`last_seen_at`, online <= 2 minutes).
- Windows connector download/setup controller exists and is intended to install a scheduled Local POS Agent under `C:\ProgramData\PayMyDine\LocalPosAgent`.
- Manual Open drawer / Test drawer / Load printers / Test print / Diagnose UI actions already exist.
- Cashier Lab payment settlement already has idempotency and correct cash/change calculations.
- Existing `CashDrawerHelper` already contains the expected business rule: only cash/cod + enabled `auto_open_on_cash` should auto-open.

## 3. Static blockers found

### P0-A: Cashier Lab cash settlement is not wired to drawer opening

`PmdWaiterPosSettleEndpoint::settlePayment()` records successful cash transactions but contains no CashDrawerService/CashDrawerHelper call. The current browser payment payload also does not send a workstation/POS identity.

Required behavior:

1. payment transaction is successfully persisted;
2. only a non-duplicate `payment_method=cash` transaction creates an `open_drawer` command;
3. card/direct-terminal payments never create it;
4. split cash payments create one drawer command per successful cash transaction;
5. retries using the same payment idempotency key must not open the drawer again.

Recommended implementation is an atomic command enqueue keyed by the resulting payment transaction id, not a direct physical open call from the settlement request.

### P0-B: `pos_hardware_commands` controller/schema contract mismatch

Canonical migration/baseline columns are:

- `picked_at`
- `completed_at`
- `result_message`
- `result_payload`

Current `PosAgentController` uses:

- `processed_at`
- `acknowledged_at`
- `message`

No repository migration was found that adds those controller-only aliases. `PmdTenantProductBaselineR1::ensurePosHardwareCommands()` also returns immediately when the table already exists, so it does not repair an existing mismatched schema.

Preferred repair: make the controller use the canonical migration fields, and add an idempotent schema repair for every tenant. Avoid carrying duplicate timestamp/message aliases long term.

### P0-C: `cash_drawer_logs` model/schema contract mismatch

The original migration / product baseline creates a legacy log shape including:

- `staff_id`
- `status`
- `message`
- `request_payload`
- `response_payload`

Current `Cash_drawer_logs_model` writes a newer shape including:

- `location_id`
- `trigger_method`
- `success`
- `error_message`
- `response_data`

No static migration was found that normalizes this mismatch.

Recommended repair: additive compatibility migration that preserves old rows and adds the newer fields, then standardize service/model writes. Do not drop legacy log columns until after compatibility period.

### P0-D: Local POS Agent package is referenced but not tracked in GitHub main

`CashDrawers::windowsConnectorAgent()` expects:

`tools/local-pos-agent/agent.js`

Repository search found no such Agent implementation. Search for the local health port `17877` and command handlers also only finds installer/controller references.

Production VPS may contain a local-only `agent.js`; runtime audit must confirm.

If absent, the Windows connector download can generate/install the BAT but cannot download the actual Agent package.

### P0-E: no repository `config/cashdrawer.php`

Server code expects:

- `config('cashdrawer.local_agent_enabled')`
- `config('cashdrawer.agent_token')`

No `config/cashdrawer.php` exists in GitHub main. Runtime may have local-only config, so production audit must report resolved config values without revealing the token.

The action build should add an explicit tracked config contract and environment variable names.

### P0-F: current Agent authentication design uses a shared server token

Current connector generator embeds `config('cashdrawer.agent_token')` into the Windows Agent environment. Pairing also requires a per-device `pairing_token`, but normal Agent authorization is still based on the shared configured Bearer token.

For production hardening, prefer:

- one-time pairing token;
- exchange for a per-device credential;
- store only a hash/server verifier where possible;
- revoke/rotate one POS without rotating every restaurant POS;
- do not use one globally reusable Agent secret for all tenants/devices.

### P0-G: workstation identity is missing from Cashier Lab payment requests

Current `pmd-waiter-pos-payment-v3.js` has no `pos_device_id`, `device_code`, `workstation_id`, or equivalent payment field.

`Cash_drawers_model::getDefaultDrawer(location)` selects the first enabled drawer by `drawer_id`. That is unsafe with two cashier stations at one location.

Required product contract:

`Cashier workstation A -> local POS device A -> drawer A`

`Cashier workstation B -> local POS device B -> drawer B`

Recommended setup UX should bind the browser/workstation to a local POS device during "Set up on this POS", then Cashier Lab sends that stable device identity with settlement.

### P1-A: direct server hardware drivers are fallback/diagnostic paths, not the normal cloud POS path

The repository has RJ11, USB, serial and network PHP drivers. They operate from the machine running PHP. On PayMyDine production that is the VPS, not the restaurant POS.

Therefore a Windows printer name, local USB device, COM port or private LAN printer should be acted on by the Local POS Agent, not the VPS driver.

The direct network driver is only meaningful when the device is actually routable from the application server, which should not be the standard restaurant topology.

### P1-B: printer-driven drawer should remain the default

The UI/model already labels `rj11_printer` as the most common connection type. This should be the guided setup path:

1. install/pair PayMyDine Local POS Agent once;
2. discover Windows printers;
3. choose receipt printer;
4. test print;
5. test standard drawer pulse;
6. if needed try alternate pulse profile;
7. save mapping;
8. Cashier Lab opens only on successful cash settlement.

Advanced USB/serial/network screens can remain behind Advanced settings.

### P1-C: command execution needs explicit at-most-once policy

For a cash drawer, opening twice is worse than occasionally requiring a manual open. The command pipeline should therefore have an explicit at-most-once / dedupe contract.

Recommended:

- command has `dedupe_key` such as `cash-payment:<transaction_id>` with a unique constraint;
- enqueue is part of the same tenant DB transaction as successful payment settlement;
- Agent persists recently executed command IDs locally before/around physical action so a network ACK retry does not open twice;
- server exposes failed/stuck command status for diagnostics;
- do not blindly requeue a command that may already have physically executed.

## 4. Existing UI / owner workflow

The current `/admin/pmddevices` drawer modal already has nearly all required controls:

- Drawer name
- Local POS terminal
- Printer device
- Enabled
- Auto-open on cash payment
- Test connection on save
- Connection type
- Device path / printer name
- ESC/POS command
- Voltage
- Network / serial / USB fields
- Set up on this POS
- Check connector
- Load printers
- Apply printer
- Test print
- Diagnose
- Test drawer
- Open drawer
- Download Windows connector

The action phase should simplify the default experience rather than create a second settings screen.

## 5. Runtime facts that must be collected from production before patching

Run `audit/pmd-cash-drawer-readiness-r1.sh` against `a.paymydine.com`. It performs only reads and prints:

- live Git HEAD/branch and verifies HEAD does not move;
- live presence/hash of `tools/local-pos-agent/agent.js`;
- whether Agent command handlers exist in that file;
- resolved `cashdrawer.local_agent_enabled` and whether an Agent token is configured (never prints token value);
- relevant `.env` key names only, with values hidden;
- live source wiring for settlement and workstation identity;
- actual tenant DB table columns;
- exact queue/controller compatibility on the live VPS;
- exact cash drawer log schema compatibility;
- configured cash drawers and their POS/printer mapping;
- configured local POS devices and heartbeat state, without printing pairing tokens;
- hardware command queue counts and recent command summaries;
- recent drawer log metadata;
- recent cash payment transactions;
- read-only HTTP route presence/health.

## 6. Proposed action sequence for the next chat

Do not combine all changes into one blind patch. Use this order:

### Phase 1 - schema + Agent foundation

1. normalize `pos_hardware_commands` canonical fields;
2. normalize `cash_drawer_logs` compatibility fields;
3. add tracked `config/cashdrawer.php`;
4. add/version a real `tools/local-pos-agent/agent.js` package;
5. make Agent pull/ack use canonical queue columns;
6. add per-device authentication/rotation;
7. add command dedupe support.

Acceptance: a manually queued `list_printers`, `test_print`, `diagnose_drawer`, and `open_drawer` runs through one paired Windows POS and reports success/failure without 500s.

### Phase 2 - workstation binding

1. make "Set up on this POS" establish a stable workstation/POS identity;
2. expose that identity to Cashier Lab;
3. resolve drawer strictly by local POS device first, then location fallback only where unambiguous;
4. warn/refuse ambiguous locations with multiple enabled drawers and no workstation identity.

Acceptance: two cashier terminals at the same location always address different configured drawers.

### Phase 3 - Cashier Lab cash settlement wiring

1. enqueue drawer command only after/with successful cash settlement persistence;
2. use payment transaction id as dedupe authority;
3. duplicate settlement request does not create another command;
4. direct-terminal/card does not create a drawer command;
5. split cash creates one command per successful cash payment transaction.

Acceptance: database and queue tests demonstrate exact mapping before any physical test.

### Phase 4 - physical hardware acceptance

On a real restaurant Windows POS:

1. Agent pairs and remains online after reboot;
2. printer discovery returns installed receipt printer;
3. test receipt works;
4. standard pulse `27,112,0,60,120` opens drawer without printing;
5. cash payment opens once;
6. card/terminal payment never opens;
7. no-receipt cash payment still opens;
8. browser refresh/retry does not double-open;
9. manual Open drawer is permission-checked and audited;
10. disconnect/offline Agent produces a visible operator error/diagnostic, while the payment itself remains correctly recorded.

## 7. Current readiness conclusion

The PayMyDine codebase contains most of the product/UI/service structure needed for a professional cash drawer integration. It is not yet safe to call the current Local POS connector production-ready because the Agent package/config cannot be confirmed from GitHub, the queue and log schemas have static contract mismatches, Cashier Lab is not wired to drawer commands, and workstation identity is absent from payment settlement.

Once the production read-only audit confirms the live schema/package state, the next chat can move directly to a surgical implementation using the phased plan above.

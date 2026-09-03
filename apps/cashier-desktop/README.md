# PayMyDine Desktop v1.2.1

PayMyDine Desktop is the full PayMyDine tenant application for Windows and macOS Apple Silicon. It is not a separate Cashier UI.

The Electron main window opens the canonical tenant Platform at `/admin`, so the existing PayMyDine login, MFA, permissions, navigation, and role landing rules remain the source of truth. The desktop layer adds native hardware plus a bounded local cache around that Platform.

## Role routing

The desktop app does not guess a user's role. It opens `/admin` and lets the server's canonical login flow route the authenticated account.

Current managed role landing behavior is owned by `Admin\Services\PmdDefaultStaffRoleService`:

- Owner -> Owner Dashboard
- Manager -> Manager Dashboard
- Cashier -> Orders / Cashier workspace
- Waiter -> Orders / Quick Mode workspace
- Accountant -> Accountant Dashboard
- Reservations -> Reservations
- Kitchen Staff / Other staff -> My Work
- KDS role -> assigned Kitchen Display station

The same server-side path boundary continues to deny pages that the role is not allowed to open.

## Architecture

- **Main product UI:** canonical tenant Platform (`https://{tenant}.paymydine.com/admin`)
- **Desktop entry:** `src/local-first-entry.js`
- **Canonical online runtime:** `src/main.js`
- **Local cache/snapshot runtime:** `src/local-first-bootstrap.js`, `src/local-store.js`
- **Platform bridge:** `src/preload.js`
- **Third-party popup isolation:** `src/external-preload.js`
- **Local setup:** `src/setup.html`
- **Local printer / cash drawer:** `src/hardware.js`, `src/receipt.js`
- **Cloud business/payment authority:** existing PayMyDine backend

The obsolete v1.1 local Cashier prototype files are kept for migration/history, but they are not the product UI.

## Navigation performance

V1.2.1 keeps the normal Chromium persistent HTTP cache, preconnects the selected tenant with multiple sockets, and warms hovered same-tenant Admin links with browser prefetch hints. This reduces avoidable connection/setup latency without replacing the canonical Platform with a visually different UI.

Server-rendered Admin routes can still take server time. Full instant navigation requires a future shared local/SPА application shell rather than hard server navigation.

## Local cache and offline behavior

After a successful authenticated Admin page load, Desktop saves a bounded `HTMLComplete` snapshot on the device. It keeps the newest 12 route snapshots per tenant and prunes older ones.

Safe operational JSON GETs are also cached locally for:

- Cashier floor/table dashboard data
- Cashier/Waiter POS table/menu bootstrap data

If the cloud becomes unreachable, Desktop can fall back to the last saved real PayMyDine Platform screen and cached operational GET data instead of only showing the generic offline shell.

Offline safety remains strict:

- cached real Platform screen: available after it has been visited online
- cached table/menu data: available after it has been fetched online
- browsing/composing in an already loaded Cashier surface: can continue using cached GET data
- server writes: not faked
- kitchen submission: requires connection
- payment settlement: requires connection
- terminal/provider payment: requires connection
- multi-device KDS propagation while the WAN is down: requires the future PayMyDine Edge/LAN phase

The snapshot displays an explicit Offline banner. Forms are blocked on cached snapshot pages so a stale page cannot pretend that a write succeeded.

This is a safe cached-platform layer, not the final offline sync engine. Durable cart/order drafts with verified replay and idempotent reconciliation are the next local-first milestone.

## Security

The main tenant window keeps:

- `contextIsolation: true`
- `nodeIntegration: false`
- `sandbox: true`
- `webSecurity: true`
- exact tenant host validation for privileged desktop IPC
- local cache IPC restricted to the tenant Admin origin and app-owned snapshot files
- no tenant database credentials on the device

Third-party HTTPS popup windows use an intentionally empty preload, so provider/auth pages do not receive the PayMyDine native hardware bridge.

## Payments and cash drawer

Business/payment truth remains server-side. The desktop runtime watches the canonical cash-settlement request and opens the drawer only after the request completes successfully. Card/provider payment state is never inferred from a browser return alone.

## Printing

The v1.0.9 printer compatibility layer remains available, including Generic / Text Only receipt protection. The app also supports Virtual PDF test mode for machines without receipt hardware.

## Build

```bash
npm install
npm run check
npm run dist:win
npm run dist:mac -- --arm64
```

Artifacts:

- Windows: `PayMyDine-Desktop-Setup-1.2.1.exe`
- Apple Silicon: `PayMyDine-Desktop-1.2.1-mac-arm64.dmg`

Workflow: `.github/workflows/cashier-desktop-v110.yml`.

## Upgrade compatibility

The Electron `appId` intentionally remains `com.paymydine.cashier` so existing preview installs upgrade to PayMyDine Desktop instead of creating an unrelated second application identity.

## Repository-only source warning

The production VPS intentionally does not own this Electron build source. A clean VPS snapshot must preserve `.github` and `apps/cashier-desktop` from the GitHub base commit using `tools/pmd-preserve-repo-only-after-vps-sync.sh`; otherwise a VPS rsync can accidentally delete the desktop source from a future clean-sync commit.

## Separate device / OS phase

Windows dedicated-device / PayMyDine OS mode remains separate: shell replacement, branded boot, automatic launch, device lockdown, watchdog, support escape and fleet policy. It should not be mixed into the desktop application routing/cache work.

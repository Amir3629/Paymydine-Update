# PayMyDine Desktop v1.3.0

PayMyDine Desktop is the full PayMyDine tenant desktop application for Windows and macOS Apple Silicon. It is not a separate Cashier UI.

The canonical tenant Platform at `/admin` remains the visual and permission authority, while the Electron desktop layer now keeps the main Platform surfaces alive in a bounded local route pool instead of destroying and downloading the entire page again on every Side Menu switch.

## Role routing

The desktop app does not guess a user's role. It opens `/admin` and lets the server's canonical login flow route the authenticated account.

Current managed role landing behavior is owned by the Platform backend:

- Owner -> Owner Dashboard
- Manager -> Manager Dashboard
- Cashier -> Orders / Cashier workspace
- Waiter -> Orders / Quick Mode workspace
- Accountant -> Accountant Dashboard
- Reservations -> Reservations
- Kitchen Staff / Other staff -> My Work
- KDS role -> assigned Kitchen Display station

The same server-side permission and route boundaries remain authoritative.

## V1.3.0 fast navigation

The primary Side Menu navigation is intercepted only for safe, ordinary same-tenant Admin links.

- Main Platform pages are loaded into Electron `WebContentsView` instances.
- Up to seven recent route views are kept alive in memory.
- Primary Side Menu destinations are warmed in the background with bounded concurrency.
- Returning to an already-warmed page switches the existing live view back into the window instead of reloading the Laravel page from zero.
- Forms, POST actions, downloads, login/logout, payment, terminal and callback paths are not converted into pooled navigation.
- Hidden route views are explicitly closed during eviction and window shutdown to avoid WebContents leaks.

This improves repeated page switching without replacing the real PayMyDine UI with a second visual implementation.

## Architecture

- **Online UI authority:** canonical tenant Platform (`https://{tenant}.paymydine.com/admin`)
- **Desktop entry:** `src/local-first-entry.js`
- **Canonical online runtime:** `src/main.js`
- **Fast route pool:** `src/fast-route-pool.js`
- **Local snapshot/data cache:** `src/local-first-bootstrap.js`, `src/local-store.js`
- **Blank snapshot watchdog:** `src/offline-blank-guard.js`
- **Cache privacy cleanup:** `src/local-cache-privacy.js`
- **Platform bridge:** `src/preload.js`
- **Third-party popup isolation:** `src/external-preload.js`
- **Local setup:** `src/setup.html`
- **Local printer / cash drawer:** `src/hardware.js`, `src/receipt.js`
- **Cloud business/payment authority:** existing PayMyDine backend

The obsolete v1.1 local Cashier prototype files remain only for migration/history; they are not the product UI.

## Offline behavior

V1.3.0 replaces the old `HTMLComplete` snapshot approach with queued MHTML snapshots.

- Snapshot work is delayed and serialized so it does not compete with first page interaction.
- A screenshot is also stored for each successful snapshot when Chromium can capture one.
- If an MHTML restore is blank, `offline-blank-guard.js` switches to a guaranteed visual cached fallback instead of leaving a white window.
- Safe Cashier table/menu GET payloads remain cached on disk.
- Cached screens are explicitly read-only: form submission and non-GET XHR/fetch writes are blocked in restored snapshot mode.
- Cached business data is cleared on login/logout boundary and when the restaurant is reset.

### Offline safety boundary

V1.3.0 does **not** claim verified offline order replay yet.

The current server order-save endpoint has optimistic conflict protection but is not yet an idempotent offline command endpoint. A blind offline replay engine could duplicate a new order or appended items if the original request reached the server but the device lost the acknowledgement.

Therefore:

- already-loaded/warmed Platform pages can remain visible during WAN loss;
- cached screens and safe cached GET data can be used for read/browse continuity;
- kitchen submission still requires connectivity;
- payment settlement/provider/terminal payment still requires connectivity;
- durable offline order command replay is a separate milestone that requires a server idempotency contract first;
- multi-device WAN-out operation requires a future PayMyDine Edge/LAN authority.

## Security

Desktop keeps:

- `contextIsolation: true`
- `nodeIntegration: false`
- `sandbox: true`
- `webSecurity: true`
- exact tenant host validation for privileged desktop IPC
- no tenant database credentials on the device

Third-party HTTPS popup windows use an intentionally empty preload so provider/auth pages do not receive the native hardware bridge.

## Payments and cash drawer

Business/payment truth remains server-side. The desktop runtime watches the canonical cash-settlement request and opens the drawer only after the request completes successfully. Card/provider payment state is never inferred from a browser return alone.

## Printing

The v1.0.9 printer compatibility layer remains available, including Generic / Text Only receipt protection. The app also supports a Virtual PDF test mode for machines without receipt hardware.

## Build

```bash
npm install
npm run check
npm run dist:win
npm run dist:mac -- --arm64
```

Artifacts:

- Windows: `PayMyDine-Desktop-Setup-1.3.0.exe`
- Apple Silicon: `PayMyDine-Desktop-1.3.0-mac-arm64.dmg`

Workflow: `.github/workflows/cashier-desktop-v110.yml`.

## Upgrade compatibility

The Electron `appId` intentionally remains `com.paymydine.cashier` for upgrade continuity from preview Cashier builds even though the product is now PayMyDine Desktop.

## Repository-only source warning

The production VPS intentionally does not own this Electron build source. A clean VPS snapshot must preserve `.github` and `apps/cashier-desktop` from the GitHub base commit using `tools/pmd-preserve-repo-only-after-vps-sync.sh`; otherwise a VPS rsync can accidentally delete the desktop source from a future clean-sync commit.

## Next phases

1. Add an idempotent server command contract for offline order create/append.
2. Add durable local order queue + acknowledgement/reconciliation.
3. Add PayMyDine Edge for multi-device Cashier/KDS operation during WAN loss.
4. Add Windows dedicated-device / PayMyDine OS mode: shell replacement, branded boot, automatic launch, lockdown, watchdog, support escape and fleet policy.

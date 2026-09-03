# PayMyDine Desktop v1.4.0

PayMyDine Desktop is the full PayMyDine tenant desktop application for Windows and macOS Apple Silicon. It is not a separate Cashier UI.

The canonical tenant Platform at `/admin` remains the visual, authentication and permission authority. The Electron layer adds persistent fast navigation, bounded offline cache, local printer/cash-drawer integration and an opt-in dedicated Windows POS mode.

## Role routing

The desktop app does not guess a user's role. It opens `/admin` and lets the canonical server login flow route the authenticated account.

Current managed role landing behavior remains owned by the Platform backend:

- Owner -> Owner Dashboard
- Manager -> Manager Dashboard
- Cashier -> Orders / Cashier workspace
- Waiter -> Orders / Quick Mode workspace
- Accountant -> Accountant Dashboard
- Reservations -> Reservations
- Kitchen Staff / Other staff -> My Work
- KDS role -> assigned Kitchen Display station

The same server-side permission and route boundaries remain authoritative.

## V1.4.0 seamless navigation

V1.4 keeps the V1.3 bounded persistent `WebContentsView` route pool and removes the visible route-switch flash.

- Up to seven recent safe Platform route views remain alive in memory.
- Primary Side Menu destinations are warmed with bounded concurrency.
- Returning to a warm page reuses the already-running renderer instead of reloading the Laravel page from zero.
- Route activation is now double-buffered: the currently visible page stays attached underneath the incoming route.
- The incoming view uses a transparent compositor background and is not committed as the active page until it has presented real renderer animation frames.
- Forms, POST actions, downloads, login/logout, payment, terminal and callback paths are not converted into pooled navigation.
- Hidden route views are explicitly closed during eviction/window shutdown.

The first visit to an uncached server route can still require server time. The fast path is warm and repeated navigation.

## Windows Dedicated POS / Device Mode

Windows setup now has an explicit **Dedicated POS computer · Windows Device Mode** option. It is opt-in so an Owner/Manager laptop can continue to use ordinary Windows while a restaurant POS can be locked down.

Strict Device Mode uses Microsoft's Shell Launcher and therefore requires a supported Windows edition:

- Windows Enterprise / Enterprise LTSC
- Windows Education
- Windows IoT Enterprise / IoT Enterprise LTSC

The setup flow requests Windows administrator approval, enables the Device Lockdown / Shell Launcher feature, configures the current Windows user SID to run the installed PayMyDine executable as its shell, and writes a verified marker under `C:\ProgramData\PayMyDine`.

Behavior after configuration:

- after the Windows account signs in, PayMyDine is the shell instead of Explorer;
- PayMyDine starts in kiosk/full-screen mode;
- ordinary close/quit/devtools shortcuts are blocked in Device Mode;
- Shell Launcher is configured to restart the PayMyDine shell if it exits;
- a login-start entry is also kept as a recovery/compatibility path;
- Task Manager and Windows-key shortcuts are disabled for the restaurant-facing session;
- reboot/sign-in returns the computer to PayMyDine Device Mode.

### Developer Exit

A small low-opacity `DEV` control appears in the bottom-right corner only while Windows Device Mode is enabled.

Selecting it opens a **local Electron password dialog**. The password is verified in the Electron main process, not by the tenant webpage. For the current preview/device test the requested developer password is `password`; the runtime stores only its SHA-256 digest. A shared global password is not suitable for broad production rollout and should become a per-device support PIN before general restaurant deployment.

After a valid Developer Exit:

- PayMyDine leaves kiosk mode and hides without disabling the configured Device Mode;
- the temporary user-level Task Manager / Windows-key restrictions are removed;
- `explorer.exe` is started for developer/support work;
- the next reboot/sign-in starts PayMyDine Device Mode again.

A recovery script is packaged as `windows-device-mode/disable-device-mode.ps1` for an administrator who intentionally wants to remove Shell Launcher permanently.

Device Mode does not configure Windows automatic sign-in credentials. On a POS image that already auto-signs-in, power-on flows directly into PayMyDine. On a normal Windows installation, the Windows sign-in screen can still appear before the PayMyDine shell. OEM/UEFI branding and a no-Windows-visible boot experience remain part of the later appliance image phase.

## Architecture

- **Online UI authority:** canonical tenant Platform (`https://{tenant}.paymydine.com/admin`)
- **Desktop entry:** `src/local-first-entry.js`
- **Canonical online runtime:** `src/main.js`
- **Seamless route pool:** `src/fast-route-pool-v140.js`
- **Windows Device Mode:** `src/device-mode.js`, `scripts/windows/*.ps1`
- **Local snapshot/data cache:** `src/local-first-bootstrap.js`, `src/local-store.js`
- **Blank snapshot watchdog:** `src/offline-blank-guard.js`
- **Cache privacy cleanup:** `src/local-cache-privacy.js`
- **Platform bridge:** `src/preload.js`
- **Developer unlock bridge:** `src/developer-preload.js`
- **Third-party popup isolation:** `src/external-preload.js`
- **Local setup:** `src/setup.html`
- **Local printer / cash drawer:** `src/hardware.js`, `src/receipt.js`
- **Cloud business/payment authority:** existing PayMyDine backend

The obsolete v1.1 local Cashier prototype files remain only for migration/history; they are not the product UI.

## Offline behavior

Desktop uses queued MHTML snapshots plus visual screenshot fallback.

- Snapshot work is delayed and serialized so it does not compete with first page interaction.
- A screenshot is also stored for each successful snapshot when Chromium can capture one.
- If an MHTML restore is blank, `offline-blank-guard.js` switches to a visual cached fallback instead of leaving a white window.
- Safe Cashier table/menu GET payloads remain cached on disk.
- Cached screens are read-only: form submission and non-GET XHR/fetch writes are blocked in restored snapshot mode.
- Cached business data is cleared on login/logout boundaries and when the restaurant is reset.

### Offline safety boundary

V1.4.0 does **not** claim verified offline order replay yet.

The current server order-save endpoint has optimistic conflict protection but is not yet an idempotent offline command endpoint. Blind replay could duplicate a new order or appended items if the original request reached the server but the device lost the acknowledgement.

Therefore:

- already-loaded/warmed Platform pages can remain visible during WAN loss;
- cached screens and safe cached GET data can be used for read/browse continuity;
- kitchen submission still requires connectivity;
- payment settlement/provider/terminal payment still requires connectivity;
- durable offline order command replay requires a server idempotency contract first;
- multi-device WAN-out operation requires a future PayMyDine Edge/LAN authority.

## Security

Desktop keeps:

- `contextIsolation: true`
- `nodeIntegration: false`
- `sandbox: true`
- `webSecurity: true`
- exact tenant host validation for privileged business/hardware IPC
- isolated local developer-unlock IPC
- no tenant database credentials on the device

Third-party HTTPS popup windows use an intentionally empty preload so provider/auth pages do not receive the native hardware bridge.

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

- Windows: `PayMyDine-Desktop-Setup-1.4.0.exe`
- Apple Silicon: `PayMyDine-Desktop-1.4.0-mac-arm64.dmg`

Workflow: `.github/workflows/cashier-desktop-v110.yml`.

## Upgrade compatibility

The Electron `appId` intentionally remains `com.paymydine.cashier` for upgrade continuity from preview Cashier builds even though the product is now PayMyDine Desktop.

## Repository-only source warning

The production VPS intentionally does not own this Electron build source. A clean VPS snapshot must preserve `.github` and `apps/cashier-desktop` from the GitHub base commit using `tools/pmd-preserve-repo-only-after-vps-sync.sh`; otherwise a VPS rsync can accidentally delete the desktop source from a future clean-sync commit.

## Next local-first / appliance milestones

1. Add an idempotent server command contract for offline order create/append.
2. Add durable local order queue + acknowledgement/reconciliation.
3. Add PayMyDine Edge for multi-device Cashier/KDS operation during WAN loss.
4. Add the sold-hardware appliance image: dedicated account/autologon policy, OEM/UEFI branding, update/watchdog/fleet management, UWF/Keyboard Filter where applicable, and Linux/Windows hardware image decisions.

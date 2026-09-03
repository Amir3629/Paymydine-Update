# PayMyDine Desktop v1.2.0

PayMyDine Desktop is the full PayMyDine tenant application for Windows and macOS Apple Silicon. It is not a separate Cashier UI.

The Electron main window opens the canonical tenant Platform at `/admin`, so the existing PayMyDine login, MFA, permissions, navigation, and role landing rules remain the source of truth. The desktop layer adds native printer and cash-drawer integration around that Platform.

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
- **Desktop runtime:** `src/main.js`
- **Platform bridge:** `src/preload.js`
- **Third-party popup isolation:** `src/external-preload.js`
- **Local setup:** `src/setup.html`
- **Local printer / cash drawer:** `src/hardware.js`, `src/receipt.js`
- **Cloud business authority:** existing PayMyDine backend
- **Payments:** existing PayMyDine server/provider flows remain authoritative

The obsolete v1.1 local Cashier prototype files are kept in the repository for migration/history, but `package.json` no longer boots them.

## Security

The main tenant window keeps:

- `contextIsolation: true`
- `nodeIntegration: false`
- `sandbox: true`
- `webSecurity: true`
- exact tenant host validation for privileged desktop IPC
- no tenant database credentials on the device

Third-party HTTPS popup windows use an intentionally empty preload, so provider/auth pages do not receive the PayMyDine native hardware bridge.

## Payments and cash drawer

Business/payment truth remains server-side. The desktop runtime watches the canonical cash-settlement request and opens the drawer only after the request completes successfully. Card/provider payment state is never inferred from a browser return alone.

## Printing

The v1.0.9 printer compatibility layer remains available, including the Generic / Text Only receipt protection. The app also supports a Virtual PDF test mode for machines without receipt hardware.

## Offline behavior

If the canonical Platform cannot load, the desktop app shows a local offline screen and allows retry. It does not invent order, kitchen, or payment success while disconnected.

The v1.1 experimental local menu/cart cache is no longer the product UI because it visually diverged from the real Platform and duplicated UI authority.

## Build

```bash
npm install
npm run check
npm run dist:win
npm run dist:mac -- --arm64
```

Artifacts:

- Windows: `PayMyDine-Desktop-Setup-1.2.0.exe`
- Apple Silicon: `PayMyDine-Desktop-1.2.0-mac-arm64.dmg`

Workflow: `.github/workflows/cashier-desktop-v110.yml`.

## Upgrade compatibility

The Electron `appId` intentionally remains `com.paymydine.cashier` in v1.2.0 so existing preview installs can upgrade to the renamed PayMyDine Desktop product instead of creating an unrelated second application identity.

## Repository-only source warning

The production VPS intentionally does not own this Electron build source. A clean VPS snapshot must preserve `.github` and `apps/cashier-desktop` from the GitHub base commit using `tools/pmd-preserve-repo-only-after-vps-sync.sh`; otherwise a VPS rsync can accidentally delete the desktop source from a future clean-sync commit.

## Separate next phase

Windows dedicated-device / PayMyDine OS mode remains a separate phase: shell replacement, branded boot, automatic launch, device lockdown, watchdog, support escape and fleet policy. It should not be mixed into the desktop application routing change.

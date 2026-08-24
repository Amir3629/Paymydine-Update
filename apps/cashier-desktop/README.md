# PayMyDine Cashier Desktop V1

## Goal

Windows desktop app for the restaurant's main cashier POS only.

Everyone else continues to use PayMyDine in a normal browser.

The desktop app reuses the existing PayMyDine Cashier Lab at `/admin/cashierlab` and will bundle the existing Local POS hardware agent so the restaurant does not install a second connector application.

## Product flow

First launch:

1. Enter restaurant domain, for example `a.paymydine.com`.
2. App opens the normal PayMyDine login/Cashier Lab inside the desktop window.
3. Hardware pairing/setup will be completed from the authenticated Cashier app.
4. App detects Windows receipt printers.
5. Owner selects the receipt printer once.
6. Test print.
7. Test cash drawer.
8. Ready.

Normal daily use:

- Open `PayMyDine Cashier` from Windows.
- Sign in if the session has expired.
- Cashier Lab opens directly.
- Printer and cash drawer support run with the app.
- No separate Local POS Connector should be required after the desktop integration is complete.

## Architecture

```text
PayMyDine Cashier.exe
  |
  +-- secure Electron BrowserWindow
  |      `-- https://TENANT.paymydine.com/admin/cashierlab
  |
  +-- narrow preload bridge
  |
  +-- bundled Local POS hardware agent
         +-- Windows printer discovery
         +-- RAW receipt printing
         +-- ESC/POS drawer kick
         `-- PayMyDine hardware command gateway
```

The web Cashier remains the UI and business authority. The desktop shell owns only local POS capabilities.

## Security rules

- `nodeIntegration: false`
- `contextIsolation: true`
- sandboxed renderer
- navigation restricted to the configured PayMyDine tenant
- external links open in the system browser
- no general Node/filesystem API is exposed to the remote Cashier page
- hardware APIs must be narrow and explicit

## Current V1 status

Implemented in the first scaffold:

- Windows Electron package skeleton
- first-run tenant setup
- opens only `/admin/cashierlab`
- single-instance behavior
- navigation restrictions
- narrow preload identity/config bridge
- existing Local POS Agent is copied into the app package during build
- Windows NSIS installer configuration

Still to implement before physical POS testing:

1. Authenticated desktop pairing endpoint/handshake.
2. Start/stop bundled hardware agent from Electron main process.
3. Persist the selected Windows receipt printer in app settings.
4. Native printer discovery/test controls in the Cashier app.
5. Native cash drawer test/open controls.
6. Connect successful cash settlement to the local drawer action with transaction-id dedupe.
7. 80mm receipt printing.
8. App update/signing strategy.
9. Build and test the first Windows installer on the real POS PC.

## Development

```bash
cd apps/cashier-desktop
npm install
npm run check
npm run dev
```

## Windows installer

```bash
cd apps/cashier-desktop
npm install
npm run dist:win
```

Expected artifact name:

`PayMyDine-Cashier-Setup-0.1.0.exe`

Do not deploy this first scaffold to restaurant production yet. Hardware pairing and app-owned hardware lifecycle are the next implementation milestone.

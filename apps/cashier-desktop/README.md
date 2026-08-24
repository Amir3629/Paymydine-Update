# PayMyDine Cashier Desktop V1

## Purpose

One Windows desktop application for the main cashier POS in every PayMyDine restaurant.

All other staff can continue using normal web browsers.

The app reuses the existing PayMyDine Cashier Lab at `/admin/cashierlab`. It does **not** create a second order/payment system and it does **not** connect directly to tenant databases.

## Universal multi-tenant flow

There is one installer for everybody:

`PayMyDine-Cashier-Setup-1.0.0.exe`

First launch:

1. Enter the restaurant code, for example `a`, `mimoza`, or `tomo`.
2. The app converts it to `https://<code>.paymydine.com`.
3. The normal PayMyDine login page is used for username/password authentication.
4. The selected restaurant host is stored locally on this Windows POS.
5. PayMyDine's existing host-based tenant runtime selects the correct tenant database on the server.
6. The app opens `/admin/cashierlab` for that tenant.
7. A one-time local hardware window discovers Windows printers.
8. Select the receipt printer, run Test Print, and run Test Cash Drawer.

The restaurant can be changed later from `PayMyDine > Change restaurant`. Changing restaurant clears the embedded browser session before the next tenant is opened.

## Architecture

```text
PayMyDine Cashier.exe
  |
  +-- Electron Cashier window
  |      `-- https://TENANT.paymydine.com/admin/cashierlab
  |
  +-- Local settings
  |      +-- tenant hostname
  |      +-- Windows receipt printer name
  |      +-- auto-open-cash setting
  |      `-- ESC/POS drawer command
  |
  +-- Native Windows hardware module
         +-- Win32_Printer discovery via PowerShell/CIM
         +-- RAW Windows spooler test printing
         +-- ESC/POS cash drawer kick through receipt printer
         `-- no separate PayMyDine Connector service
```

The cloud PayMyDine application remains the authority for login, orders, payments, permissions, menus, and tenant data. The desktop application only adds trusted local POS capabilities.

## Cash drawer behavior

The Electron session watches the existing Cashier settlement request:

`POST /admin/pmd-waiter-pos-v1/payment-settle/{order}`

If the submitted `payment_method` is `cash` and the server returns HTTP 2xx:

1. Read the payment `idempotency_key`.
2. Ignore the event if that key has already opened the drawer.
3. Send the configured ESC/POS drawer command to the selected Windows receipt printer.
4. Persist recent handled keys to prevent accidental duplicate drawer kicks.

Card/terminal payments do not trigger the drawer.

## Receipt behavior

When the Cashier opens the existing split-receipt URL:

`/admin/orders/split-receipt/{transactionId}`

and a printer is configured, the desktop app can silently print that authenticated receipt through Electron using the selected Windows printer.

A proper thermal-printer Windows driver is still recommended for correctly formatted 80mm HTML receipt printing. `Generic / Text Only` remains suitable for raw test printing and many ESC/POS drawer commands, but it is not a good general HTML/PDF driver.

## Internet and database behavior

### Internet

The current V1 **requires internet for restaurant operations** because PayMyDine is cloud-hosted. Login, menu data, orders, payments, and tenant data are read/written through the normal HTTPS application.

Local printer discovery and a manual drawer test can run on the Windows PC itself, but a real cash sale cannot be safely completed offline in V1.

If the Cashier page cannot load, the app shows a local offline screen with a retry button.

### Database

The desktop app has:

- no MySQL credentials;
- no direct DB connection;
- no local copy of tenant business data.

It only opens the selected tenant hostname. The existing PayMyDine server resolves that hostname to the correct tenant database.

This keeps the current multi-tenant authority unchanged.

## Security

- one app installer for all tenants;
- restaurant is bound by an exact `*.paymydine.com` hostname;
- normal PayMyDine login and permissions are preserved;
- `nodeIntegration: false`;
- `contextIsolation: true`;
- sandboxed renderer;
- remote navigation is restricted to the selected tenant;
- external non-tenant links open in the system browser;
- the remote Cashier page receives only a narrow preload API;
- no generic filesystem or command-execution API is exposed to the web page.

## Native hardware setup

Open:

`PayMyDine > Printer & cash drawer`

The window provides:

- Windows printer discovery;
- saved receipt printer selection;
- test print;
- automatic cash-payment drawer toggle;
- test cash drawer;
- drawer pulse troubleshooting.

The cash drawer should be connected to the receipt printer's `DK / DRAWER / CASH DRAWER` port for the normal printer-driven setup.

## Build

```bash
cd apps/cashier-desktop
npm install
npm run check
npm run dist:win
```

Expected installer:

`dist/PayMyDine-Cashier-Setup-1.0.0.exe`

GitHub Actions workflow:

`.github/workflows/cashier-desktop-windows.yml`

It builds the installer on a Windows runner and uploads it as the `PayMyDine-Cashier-Windows` artifact.

## Production readiness

V1 code paths are complete for the first physical POS test. Before broad restaurant rollout, complete these operational checks:

1. GitHub Windows build passes.
2. Install the generated EXE on the real Windows 10 POS.
3. Verify restaurant selection and login.
4. Verify printer discovery and Test Print.
5. Verify Test Cash Drawer with the physical DK cable.
6. Complete one real test cash settlement and confirm one drawer opening only.
7. Test Receipt on the installed thermal-printer driver.
8. Add Windows code signing before wide external distribution to reduce SmartScreen warnings.

No production server database migration is required for the desktop app itself.

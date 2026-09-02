# PayMyDine Cashier Desktop V1

## Purpose

One PayMyDine Cashier desktop application for the main cashier POS in every restaurant.

Supported desktop platforms:

- Windows 10/11
- macOS Intel
- macOS Apple Silicon (M1/M2/M3/M4 and later compatible Apple Silicon)

All other staff can continue using normal web browsers.

The desktop app reuses the existing PayMyDine Cashier Lab at `/admin/cashierlab`. It does **not** create a second order/payment system and it does **not** connect directly to tenant databases.

## Universal multi-tenant flow

The same app is used by every restaurant.

First launch:

1. Enter the restaurant code, for example `a`, `mimoza`, or `tomo`.
2. The app converts it to `https://<code>.paymydine.com`.
3. The normal PayMyDine login page handles username/password authentication.
4. The selected restaurant host is stored locally on this computer.
5. PayMyDine's existing host-based tenant runtime selects the correct tenant database on the server.
6. The app opens `/admin/cashierlab` for that tenant.
7. The local hardware window discovers installed receipt printers.
8. Select the receipt printer, run Test Print, and run Test Cash Drawer.

The restaurant can be changed later from `PayMyDine > Change restaurant`. Changing restaurant clears the embedded browser session before the next tenant is opened.

## Architecture

```text
PayMyDine Cashier desktop app
  |
  +-- secure Electron Cashier window
  |      `-- https://TENANT.paymydine.com/admin/cashierlab
  |
  +-- local settings
  |      +-- tenant hostname
  |      +-- receipt printer name
  |      +-- auto-open-cash setting
  |      `-- ESC/POS drawer command
  |
  +-- native hardware module
         +-- Windows: Win32_Printer + RAW spooler
         +-- macOS: CUPS lpstat + RAW lp
         +-- receipt-printer test
         +-- ESC/POS drawer kick
         `-- no separate PayMyDine Connector service
```

The cloud PayMyDine application remains the authority for login, orders, payments, permissions, menus, and tenant data. The desktop application only adds trusted local POS capabilities.

## Cash drawer behavior

The Electron session watches the existing Cashier settlement request:

`POST /admin/pmd-waiter-pos-v1/payment-settle/{order}`

If the submitted `payment_method` is `cash` and the server returns HTTP 2xx:

1. Read the payment `idempotency_key`.
2. Ignore it if that key already opened the drawer.
3. Send the configured ESC/POS drawer command to the selected local receipt printer.
4. Persist recent handled keys to prevent accidental duplicate drawer kicks.

Card/terminal payments do not trigger the drawer.

The normal hardware layout remains:

`Computer -> Receipt printer -> DK/DRAWER cable -> Cash drawer`

## Printer behavior

### Windows

Printer discovery uses `Win32_Printer`. RAW data is sent through the Windows spooler.

### macOS

Printer discovery uses the built-in CUPS `lpstat` command. RAW test/drawer bytes are sent through the selected CUPS printer queue using `lp -o raw`.

The receipt printer must first exist in the operating system printer list. Some thermal printers may need their manufacturer driver or a compatible CUPS queue before raw ESC/POS commands work.

## Receipt behavior

When the Cashier opens the existing split-receipt URL:

`/admin/orders/split-receipt/{transactionId}`

and a printer is configured, the desktop app silently prints that authenticated receipt through Electron using the selected local printer.

A proper thermal-printer driver is recommended for formatted 80mm HTML receipt printing.

## Internet and database behavior

V1 **requires internet for restaurant operations** because PayMyDine is cloud-hosted. Login, menu data, orders, payments, and tenant data use the normal HTTPS application.

Local printer discovery and manual drawer testing are local, but real cash sales are not stored offline in V1.

The desktop app has:

- no MySQL credentials;
- no direct DB connection;
- no local copy of tenant business data.

It only opens the selected tenant hostname. The existing PayMyDine server resolves that hostname to the correct tenant database.

## Security

- one app for all tenants;
- restaurant is bound by an exact `*.paymydine.com` hostname;
- normal PayMyDine login and permissions are preserved;
- `nodeIntegration: false`;
- `contextIsolation: true`;
- sandboxed renderer;
- remote navigation is restricted to the selected tenant;
- external non-tenant links open in the system browser;
- no generic filesystem or command-execution API is exposed to the remote Cashier page.

## Native hardware setup

Open:

`PayMyDine > Printer & cash drawer`

The window provides:

- local printer discovery;
- saved receipt printer selection;
- test print;
- automatic cash-payment drawer toggle;
- test cash drawer;
- drawer pulse troubleshooting.

## Builds

Windows:

```bash
npm run dist:win
```

macOS:

```bash
npm run dist:mac -- --x64
npm run dist:mac -- --arm64
```

Expected macOS artifacts:

- `PayMyDine-Cashier-1.0.0-mac-x64.dmg`
- `PayMyDine-Cashier-1.0.0-mac-arm64.dmg`

The macOS GitHub Actions workflow builds Intel and Apple Silicon packages separately.

## Release readiness

Before broad rollout, each OS/hardware combination must pass a physical test:

1. Install the package.
2. Select restaurant and log in.
3. Find the actual thermal printer.
4. Test Print.
5. Test Cash Drawer with the DK cable.
6. Complete one real test cash settlement and confirm exactly one drawer opening.
7. Test a formatted receipt.
8. Add platform code signing/notarization before broad external distribution.

No production server database migration is required for the desktop app itself.

# PayMyDine Cashier Desktop V1.0.3

## Purpose

One PayMyDine Cashier desktop application for the main cashier POS in every restaurant.

Supported platforms:

- Windows 10/11
- macOS Apple Silicon
- macOS Intel

All other staff may continue using the normal browser.

The app reuses the existing tenant Cashier at `/admin/cashierlab`. It does not create a second order/payment system and never connects directly to MySQL.

## Payment, receipt and drawer behavior

V1.0.3 makes the desktop app the local hardware authority when the Cashier runs inside Electron.

For every successful staff payment that returns a canonical `receipt_url`:

1. PayMyDine records the payment on the server first.
2. If `Print receipt automatically after payment` is enabled, the authenticated receipt URL is sent to the saved local printer.
3. The payment/receipt key is remembered in tenant-local browser storage only after printing succeeds, preventing accidental duplicate automatic prints.
4. Manual `Print / reprint` remains available from the Cashier Order Center.

Cash payment:

- receipt prints once when auto-print is enabled;
- the desktop app opens the cash drawer once using the existing payment idempotency key;
- the server-side legacy connector bridge is explicitly skipped with `desktop_hardware_managed=true`, so two hardware owners cannot open the drawer.

Card / external terminal payment:

- receipt prints once when auto-print is enabled;
- cash drawer stays closed.

Printing failure never rolls back a valid payment. The Cashier reports the local print error and the operator can use `Print / reprint` after fixing paper/printer state.

## Browser behavior

Normal browser sessions do not expose `window.PayMyDineDesktop`.

Therefore:

- existing browser/connector cash-drawer behavior is preserved;
- document printing falls back to the normal browser `window.print()` dialog;
- desktop-only automatic printing is not attempted.

## Printer behavior

Windows:

- printer discovery: `Win32_Printer`;
- generic thermal queues such as `Generic / Text Only`: authenticated receipt page is captured and converted to ESC/POS raster, then sent RAW through Winspool;
- normal printer drivers: Electron silent system-driver printing.

macOS:

- printer discovery: CUPS `lpstat`;
- raw test/drawer commands: `lp -o raw`;
- normal receipt printing uses the selected system printer.

The physical drawer remains:

`Computer -> receipt printer -> DK/DRAWER cable -> cash drawer`

## Hardware setup

Open `PayMyDine > Printer & cash drawer`.

The V1.0.3 setup contains only the operator-facing controls:

- receipt printer;
- Find printers;
- Test print;
- Print receipt automatically after payment;
- Open cash drawer automatically after cash payment;
- Test cash drawer;
- troubleshooting drawer pulse command.

## Multi-tenant and security

The same installer is used for all restaurants.

First launch asks for a restaurant code such as `moon`, then opens `https://moon.paymydine.com/admin/cashierlab` and uses the normal PayMyDine login.

The app stores only local POS preferences such as tenant hostname, printer name and hardware toggles. It contains no tenant DB credentials and no offline copy of business data.

Electron remains hardened:

- `nodeIntegration: false`;
- `contextIsolation: true`;
- sandbox enabled;
- navigation restricted to the selected `*.paymydine.com` tenant;
- no generic filesystem/shell API exposed to the remote Cashier page.

## Internet

V1.0.3 requires internet for login, orders, menu data and payments because PayMyDine remains cloud-authoritative.

Local printer discovery, Test Print and Test Cash Drawer work against the local operating system/hardware.

## Release validation

Before customer rollout:

1. Install/upgrade the package.
2. Confirm the selected restaurant and login.
3. Confirm saved receipt printer.
4. Test Print physically produces paper.
5. Test Cash Drawer physically opens once.
6. Perform a real cash payment: one receipt + one drawer opening.
7. Perform a card/manual terminal payment: one receipt + no drawer opening.
8. Use `Print / reprint` on a paid order and confirm it prints directly in the desktop app without an OS print dialog.
9. Confirm the same document opened in a normal browser still uses the browser print dialog.
10. Add Windows Authenticode signing and Apple signing/notarization before broad public distribution.

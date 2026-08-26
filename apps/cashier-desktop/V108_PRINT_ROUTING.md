# PayMyDine Cashier V1.0.8 print-routing contract

V1.0.8 keeps the existing local hardware architecture and closes the native-print-dialog gap for Cashier documents.

## Required behavior

- Receipt popups at `/admin/orders/split-receipt/{id}` route through `PayMyDineDesktop.printReceiptUrl`.
- Cashier Order Center invoice popups at `/admin/pmd-cashier-order-center/invoice/{order}` use the same direct-print path.
- Physical mode uses the saved local printer without opening the Windows/macOS print dialog.
- `Generic / Text Only` continues through the existing ESC/POS raster path.
- Virtual PDF continues through the existing PDF path and never touches the physical cash drawer.
- Browser-only sessions retain normal browser printing.
- Cash-drawer payment dedupe, truthful hardware diagnostics, offline printer preflight, fullscreen behavior, and PayMyDine branding remain unchanged.

The live deployment also injects `pmd-desktop-print-bridge-v108.js` into the standalone customer invoice page so its Print / reprint button calls the trusted Desktop bridge instead of falling back to `window.print()` when running inside PayMyDine Cashier.

# PayMyDine Cashier V1.0.9 printer compatibility

## Root cause fixed

The Windows queue name `Generic / Text Only` only identifies the installed Windows driver. It does **not** prove that the physical printer understands ESC/POS graphics commands.

V1.0.7/V1.0.8 treated every `Generic / Text Only` queue as an ESC/POS raster printer and sent a `GS v 0` bitmap directly with `WritePrinter(..., RAW)`. That bypassed the Windows rendering path. A printer can therefore print the Windows test page correctly while PayMyDine feeds blank paper.

The PMD Hardware `Test print` had the same architectural mismatch: it sent raw ASCII bytes rather than testing the same Windows driver path that proved the queue/USB connection works.

This is independent of invoice CSS width. The PMD test page does not use the invoice HTML at all, so a blank PMD test plus a successful Windows printer test points below the invoice layout layer.

## V1.0.9 behavior

- `Generic / Text Only` on Windows uses **driver-safe text receipt mode**.
- PayMyDine extracts the authenticated receipt/invoice text, normalizes it for a receipt printer, and asks the Windows printer driver to render it.
- PayMyDine no longer assumes `Generic / Text Only` means ESC/POS raster support.
- Named/vendor printer queues continue through the normal silent system-driver HTML path.
- Raw ESC/POS raster code remains available internally, but it is no longer auto-selected from the Generic driver name.
- Raw raster conversion refuses an all-white capture instead of reporting success and feeding blank paper.
- The physical Test Print now follows the same compatibility decision as real receipts.
- Cash-drawer pulse logic is unchanged.
- Virtual PDF is unchanged.
- Browser printing is unchanged.

## Output quality

With `Generic / Text Only`, V1.0.9 prioritizes reliable text output. Full logo/graphics fidelity requires the printer manufacturer's Windows driver (or a printer model explicitly verified for ESC/POS graphics).

## Physical verification

A Windows-only diagnostic is available at:

`tools/pmd-printer-driver-test-v109.ps1`

It prints `DRIVER TEXT TEST V1.0.9` through the Windows driver and also shows the queue, driver, port, and relevant PnP entries. Queue acceptance is not treated as proof of physical paper output; a human must confirm the paper.

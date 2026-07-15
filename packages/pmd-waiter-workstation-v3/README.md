# PayMyDine Waiter Workstation V3

This package contains the exact audited CSS and JavaScript sources used by `scripts/deploy-pmd-waiter-workstation-v3.sh`.

The deployment script concatenates the parts in lexical order and verifies the complete files before touching production.

## Reconstructed targets

- `app/admin/assets/css/pmd-waiter-workstation-v3.css`
  - Parts: `css/part00.txt` through `css/part03.txt`
  - SHA-256: `557df16ce6941c6d35b78d7b146cb68c9ab015aee4f446d4ca6e0040c16c420b`
- `app/admin/assets/js/pmd-waiter-workstation-v3.js`
  - Parts: `js/part00.txt` through `js/part08.txt`
  - SHA-256: `6bb1ba1b452adabc7d3b7d48e9da534889336361ef198bd8926dcc57fc89cfd7`

The package is split only to keep GitHub connector writes reviewable. The VPS receives normal complete `.css` and `.js` files.

## Architecture

- Independent controller, view and routes
- Direct live table launcher
- Desktop category rail, product key matrix and persistent order ticket
- Mobile two-column product grid and permanent order bar
- Modifiers, item notes, order notes, covers, hold and kitchen send
- Full-page payment screen without modal or overlay mounting
- Full, equal, item and share splitting
- Cash, external terminal, connected terminal and provider checkout
- Tips, coupons, payment history and receipts
- Transfer, merge, move items, seat/course, void, reopen and table-state tools
- Reservations and live alerts
- One fixed high-contrast operational theme

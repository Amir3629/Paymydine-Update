# PayMyDine legacy CSS folder

This folder is an active compatibility layer, not dead CSS.

Current status:

- `legacy-01.css`: still broad legacy compatibility.
- `legacy-02.css`: still broad legacy compatibility.
- `legacy-03.css`: Phase 6C marker only. Former rules moved to `styles/customer/actions/action-controls-compat.css`.
- `legacy-04.css`: still broad legacy compatibility.
- `legacy-05.css`: still broad legacy compatibility.
- `legacy-06.css`: still broad legacy compatibility.
- `legacy-07.css`: still broad legacy compatibility.
- `legacy-08.css`: still broad legacy compatibility.
- `legacy-09.css`: still broad legacy compatibility.
- `legacy-10.css`: Phase 6B marker only. Former rules moved to `styles/customer/checkout/checkout-theme-compat.css` and `styles/customer/themes/kazen-menu-compat.css`.

Do not remove the whole folder at once. A live test showed that removing the active legacy import breaks current visuals even though build/smoke can still pass.

Cleanup rule: migrate one scoped block/file at a time, validate, manually check affected pages/themes, then reduce only that block/file.

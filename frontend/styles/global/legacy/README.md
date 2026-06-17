# Legacy CSS folder

This folder is intentionally still active through:

```text
app/layout.tsx -> app/globals.css -> styles/global/paymydine-legacy-globals.css -> legacy/*.css
```

Do not delete this folder in one step. The rules still carry production visual compatibility fixes.

Use:

```bash
npm run legacy-css:audit
npm run legacy-css:guard
```

For the full cleanup strategy, read:

```text
docs/LEGACY_CSS_COMPATIBILITY_LAYER.md
```

## Phase 6B migration note

`legacy-10.css` is now only a placeholder/migration marker. Its former rules moved to:

- `styles/customer/checkout/checkout-theme-compat.css`
- `styles/customer/themes/kazen-menu-compat.css`

The imports are still wired through `styles/global/paymydine-legacy-globals.css` so the live UI keeps the same compatibility behavior while the broad legacy folder is reduced step by step.

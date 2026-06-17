# PayMyDine Legacy CSS Compatibility Layer

Status: active compatibility layer, incremental cleanup in progress.

The active import chain is:

```text
app/layout.tsx
  -> app/globals.css
    -> styles/global/paymydine-legacy-globals.css
      -> styles/global/legacy/*.css
      -> extracted customer-owned compatibility files
```

Do not remove the whole legacy folder at once. We tested that replacing the legacy import with only `globals-clean.css` breaks current live visuals, even while build/smoke still pass.

## Completed cleanup

### Phase 6A

Added documentation, audit script, guard script, and acceptance coverage for the active legacy CSS compatibility layer.

### Phase 6B

Extracted the former `legacy-10.css` rules into owner-adjacent files:

- `styles/customer/checkout/checkout-theme-compat.css`
- `styles/customer/themes/kazen-menu-compat.css`

`legacy-10.css` is now a small migration marker kept for stable import order.

### Phase 6C

Extracted the former `legacy-03.css` rules into:

- `styles/customer/actions/action-controls-compat.css`

Also moved the inline action-circle, checkout visual repair, and Kazen visibility repair blocks out of `paymydine-legacy-globals.css` into the relevant customer-owned compatibility files.

`legacy-03.css` is now a small migration marker kept for stable import order.

## Current target

The broad legacy folder should shrink gradually. After Phase 6C the remaining broad files are:

- `legacy-01.css`
- `legacy-02.css`
- `legacy-04.css`
- `legacy-05.css`
- `legacy-06.css`
- `legacy-07.css`
- `legacy-08.css`
- `legacy-09.css`

## Rules for future cleanup

1. Move only one scoped block or file at a time.
2. Preserve import order where possible.
3. Keep a marker file during migration if an import path is part of the guard/map.
4. Run:

```bash
npm run legacy-css:guard
npm run build
node node_modules/typescript/bin/tsc --noEmit --pretty false
npm run smoke:prod
npm run checkout:safety
npm run frontend:acceptance
```

5. Restart PM2 and validate live.
6. Manually check the affected page/theme because smoke tests do not catch visual regressions.

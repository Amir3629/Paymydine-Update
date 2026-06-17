# PayMyDine CSS compatibility layer

Phase 6D changed the structure from one broad legacy CSS folder into owner-adjacent compatibility files.

## Current import chain

```text
app/layout.tsx
  -> app/globals.css
    -> styles/global/paymydine-legacy-globals.css
      -> styles/customer/core/*
      -> styles/customer/themes/*
      -> styles/customer/actions/*
      -> styles/customer/modals/*
      -> styles/customer/valet/*
      -> styles/customer/checkout/*
```

## Why this exists

A live test showed that removing the legacy compatibility layer at once breaks visuals. The correct fix is to move broad rules into scoped owner files and then delete marker files later.

## New structure

- `styles/customer/themes/clean-light-compat.css`
- `styles/customer/themes/modern-dark-compat.css`
- `styles/customer/themes/gold-luxury-compat.css`
- `styles/customer/themes/vibrant-colors-compat.css`
- `styles/customer/themes/minimal-compat.css`
- `styles/customer/themes/shared-theme-compat.css`
- `styles/customer/themes/kazen-menu-compat.css`
- `styles/customer/checkout/checkout-theme-compat.css`
- `styles/customer/actions/action-controls-compat.css`
- `styles/customer/modals/modal-compat.css`
- `styles/customer/valet/valet-compat.css`
- `styles/customer/core/base-theme-tokens-compat.css`
- `styles/customer/core/global-visual-compat.css`

## Rules

Do not remove the whole legacy folder at once.
Do not add new visual CSS into `styles/global/legacy`.
Keep new theme-specific CSS inside the matching theme file.
Run `npm run legacy-css:guard` and `npm run frontend:acceptance` before deploy.

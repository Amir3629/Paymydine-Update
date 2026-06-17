# PayMyDine Legacy CSS Compatibility Layer

## Status

This layer is **active production CSS**, not dead code.

A live experiment replacing the legacy import with only `app/globals-clean.css` caused visual regressions even though build, smoke, checkout safety, and frontend acceptance still passed. That means the legacy layer currently contains real visual compatibility fixes that are not covered by HTTP smoke checks.

## Active import chain

```text
frontend/app/layout.tsx
  imports: ./globals.css

frontend/app/globals.css
  imports: ../styles/customer/index.css
  imports: ../styles/global/paymydine-legacy-globals.css

frontend/styles/global/paymydine-legacy-globals.css
  imports: ./legacy/legacy-01.css ... ./legacy/legacy-10.css
```

## Files

```text
frontend/styles/global/paymydine-legacy-globals.css
frontend/styles/global/legacy/legacy-01.css
frontend/styles/global/legacy/legacy-02.css
frontend/styles/global/legacy/legacy-03.css
frontend/styles/global/legacy/legacy-04.css
frontend/styles/global/legacy/legacy-05.css
frontend/styles/global/legacy/legacy-06.css
frontend/styles/global/legacy/legacy-07.css
frontend/styles/global/legacy/legacy-08.css
frontend/styles/global/legacy/legacy-09.css
frontend/styles/global/legacy/legacy-10.css
```

The legacy folder is around 17k lines. It is often referred to as “18k CSS” because the rounded audit number was close to 18k.

## Why this exists

The project still depends on this layer for several broad visual fixes:

- theme backgrounds and surface colors
- menu/home card styling
- cart badge styling
- modal and dialog card styling
- checkout/payment visual compatibility
- quantity/action icon color repairs
- Kazen menu visibility/layout repairs

Some rules here replaced earlier runtime DOM repair hooks. For example, menu action circle and Kazen visibility repairs are now CSS-owned in this compatibility layer.

## What not to do

Do **not** delete the whole legacy folder or remove the `paymydine-legacy-globals.css` import in one PR. Do not remove the whole legacy folder at once.

That change can pass automated smoke checks and still break the UI visually.

## Safe cleanup strategy

Clean this layer incrementally:

1. Pick one small scoped visual group, preferably a rule group with a stable `data-pmd-*` or theme/page selector.
2. Move the source of truth into the owning React component, theme component, or a scoped CSS file.
3. Keep behavior visually identical.
4. Run:
   ```bash
   npm run build
   node node_modules/typescript/bin/tsc --noEmit --pretty false
   npm run smoke:prod
   npm run checkout:safety
   npm run legacy-css:guard
   npm run frontend:acceptance
   ```
5. Restart PM2 on VPS and manually check the affected theme/page.
6. Only then remove the migrated block from the legacy CSS.

## Current guardrails

- `npm run legacy-css:audit` prints import chain, line counts, and risky selector summary.
- `npm run legacy-css:guard` prevents accidental removal of the active legacy import before the visual fixes are migrated.
- `npm run frontend:acceptance` runs the legacy CSS guard.

## Good first migration candidates

Start with smaller scoped blocks, not the broad base files.

Safer first targets:

- Kazen/menu visibility blocks in `legacy-10.css`
- data attribute based checkout/payment button rules
- action circle icon color rules already documented near `PMD_MENU_ACTION_CIRCLE_COLOR_REPAIR_CSS`

Avoid first:

- `legacy-01.css` broad `:root`, `html`, `body`, `*`, and `[data-theme]` rules
- modal/card global selectors that target generic classes like `.surface`, `.rounded-3xl`, `.backdrop-blur`

## Manual visual checks after each migration

Check at least:

- `/menu`
- item modal
- cart/bottom action buttons
- checkout modal
- split bill panel
- Kazen theme if the migrated block touches Kazen
- Organic theme if the migrated block touches organic/botanical selectors

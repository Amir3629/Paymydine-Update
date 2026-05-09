# PayMyDine Admin CSS Refactor Foundation

Date: 2026-05-09

## Purpose

This foundation creates a safe folder structure for future Laravel/TastyIgniter admin CSS modularization without redesigning the current production admin UI. As of Phase 3, only the passive variables file and card component file are loaded through the existing admin asset metadata; the rest of the `pmd-admin` foundation remains unloaded.

## Why this structure exists

The admin CSS quick audit showed that current admin styling relies on large global CSS files and many late-loaded override files. Those files often target shared framework selectors such as `.btn`, `.btn-primary`, `.form-control`, `.modal`, `.table`, and `.dropdown-menu`. The new `app/admin/assets/css/pmd-admin/` structure gives future PRs a place to add scoped, reviewed styles without expanding the legacy global cascade.

## Why Tailwind is not being introduced now

Tailwind is intentionally not part of this Laravel admin cleanup phase. Adding Tailwind now would introduce another styling system, increase cascade complexity, and widen the scope beyond a safe incremental refactor. The current goal is to keep the Laravel/TastyIgniter admin stable while introducing scoped CSS modules gradually.

## What the `.pmd-` prefix means

The `.pmd-` prefix marks new PayMyDine-owned admin CSS. New styles should prefer classes such as `.pmd-btn`, `.pmd-modal`, `.pmd-toolbar`, `.pmd-card`, and `.pmd-page--orders` instead of modifying global Bootstrap/TastyIgniter selectors directly.

This prefix helps future cleanup by making new CSS easy to identify, search, review, and remove if needed.

## BEM in this project

BEM means Block, Element, Modifier. In this admin CSS foundation:

- Block: the standalone component, such as `.pmd-card` or `.pmd-toolbar`.
- Element: a child part of the block, such as `.pmd-card__title` or `.pmd-toolbar__action`.
- Modifier: a variation of a block, such as `.pmd-btn--primary`, `.pmd-btn--danger`, or `.pmd-btn--icon`.

BEM should be used where it improves readability. It is not required for every class, but it is useful for components with multiple parts or variants.

## Global, component, and page CSS

### Global CSS

Global CSS affects the entire admin shell or shared design tokens. In the new foundation, global files are limited to:

- `00-variables.css` for passive CSS variables.
- `01-base.css` for future scoped base styles.
- `02-layout.css` for future scoped layout helpers.

These files must not override generic framework selectors during the foundation phase. Currently only `00-variables.css` is loaded from this group.

### Component CSS

Component CSS lives in `app/admin/assets/css/pmd-admin/components/`. It is for reusable `.pmd-` classes such as buttons, forms, dropdowns, modals, tables, toolbars, and cards.

Component files should not target `.btn`, `.btn-primary`, `.form-control`, `.modal`, `.table`, or `.dropdown-menu` directly. Currently only `components/cards.css` is loaded from this group.

### Page CSS

Page CSS lives in `app/admin/assets/css/pmd-admin/pages/`. Page files should start with safe wrapper scopes such as `.pmd-page--orders` or `.pmd-page--settings` and remain empty until a page-specific PR needs them.

Page CSS should be used only when a style truly belongs to one admin page and cannot be expressed as a reusable component.


## Phase 3 first safe usage

Phase 3 starts using the modular foundation in one low-risk dashboard widget only. The admin asset metadata now loads only these `pmd-admin` files:

- `css/pmd-admin/00-variables.css`
- `css/pmd-admin/components/cards.css`

No other `pmd-admin` component files or page files are loaded yet. The first Blade usage is limited to `app/admin/dashboardwidgets/onboarding/onboarding.blade.php`, where existing classes remain in place and the following scoped classes were added:

- `.pmd-card` on the existing onboarding widget wrapper.
- `.pmd-card__title` on the existing widget title.
- `.pmd-card__body` on the existing widget body row.

This is low-risk because the onboarding dashboard widget is not an order, payment, invoice, Fiskaly, toolbar, dropdown, media finder, date picker, rich editor, delete confirmation, routing, tenant, database, or business-logic flow. The loaded CSS uses `.pmd-` prefixed selectors only, so it does not affect legacy UI unless a matching `.pmd-` class is explicitly added.

## Files still considered legacy

Legacy CSS remains active and must not be deleted yet. Important legacy files include:

- `app/admin/assets/css/admin.css`
- `app/admin/assets/css/dashboard.css`
- `app/admin/assets/css/custom-fixes.css`
- `app/admin/assets/css/admin-settings-modern.css`
- `app/admin/assets/css/blue-buttons-override.css`
- `app/admin/assets/css/no-green-toolbar-buttons.css`
- `app/admin/assets/css/fix-green-buttons-and-text.css`
- `app/admin/assets/css/header-dropdowns.css`
- Other `fix-*`, modal, dropdown, notification, media finder, date picker, and tour CSS files currently loaded by the admin layout.

These files should be migrated gradually only after equivalent scoped `.pmd-` modules are implemented and visually smoke-tested.

## What changed in this phase

- Added a passive modular CSS folder structure under `app/admin/assets/css/pmd-admin/`.
- Phase 3 loads only `00-variables.css` and `components/cards.css` through `app/admin/views/_meta/assets.json`.
- Phase 3 applies `.pmd-card` classes only to the onboarding dashboard widget.
- Added CSS variable tokens in `00-variables.css`.
- Added small `.pmd-` starter component classes.
- Added empty page wrapper scopes for future page-specific work.
- Added legacy notes documenting that old CSS remains in place.

## What did not change

- No existing CSS was removed.
- No existing JS was removed.
- No admin layout was changed.
- No existing asset order was changed; two new `pmd-admin` entries were appended to the admin asset metadata after the existing `admin-css` entry.
- No Tailwind dependency or Tailwind classes were added.
- No Next.js frontend/admin files were touched.
- No payment, order, Fiskaly, tenant, database, or business logic was touched.

## Next PR recommendation

The next PR should either validate this onboarding card usage visually or choose one additional low-risk admin card area for scoped `.pmd-card` adoption. Avoid toolbar Save buttons, payment/order screens, invoice screens, Fiskaly, dropdowns, media finder, date picker, rich editor, delete confirmation, routing, tenant, database, and any business-critical flow.

Suggested next steps:

1. Smoke-test the dashboard onboarding widget where `.pmd-card` is now used.
2. If stable, apply `.pmd-card` to one more low-risk dashboard/card shell only.
3. Keep loading limited to variables and cards until another component has a reviewed usage.
4. Smoke-test dashboard, settings, a table/list page, a modal, dropdowns, notifications, media finder, and date picker.
5. Only then consider moving one small legacy card override into the new module.

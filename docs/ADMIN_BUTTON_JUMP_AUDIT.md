# PayMyDine Admin Button Jump Audit

Date: 2026-05-09

## Scope

This audit is limited to the Laravel/TastyIgniter admin under `/admin`. It does not cover Next.js, Tailwind, orders, payments, invoices, Fiskaly, tenant/database behavior, routing, or business logic.

## Summary of cause

The most likely direct cause of the button jumping/flickering after refresh is `app/admin/assets/js/fix-button-widths-global.js`.

That script was loaded globally from `app/admin/views/_layouts/default.blade.php` and, after CSS had already rendered buttons, it queried many `.btn` variants and wrote inline `!important` styles for width, height, min-width, min-height, padding, display, colors, borders, and z-index. It also ran on script load, DOM ready, window load, AJAX updates, and a `MutationObserver`. This means buttons could first render at their CSS-defined dimensions and then jump to JS-enforced dimensions after page load.

The issue is both CSS cascade and JavaScript mutation, but the visible post-refresh size jump is primarily caused by JavaScript mutation after first paint.

## CSS files affecting buttons globally

The quick search found button-related global CSS in these active admin assets:

- `app/admin/assets/css/admin.css` — base admin bundle with toolbar `.btn` sizing/color rules.
- `app/admin/assets/css/custom-fixes.css` — toolbar and progress-indicator button overrides, including `width`, `height`, `padding`, and `!important` rules.
- `app/admin/assets/css/blue-buttons-override.css` — global `.btn-primary` and `.btn-success` color, padding, display, and hover overrides.
- `app/admin/assets/css/no-green-toolbar-buttons.css` — late-loaded toolbar primary button color overrides.
- `app/admin/assets/css/fix-green-buttons-and-text.css` — global legacy color overrides for buttons/text.
- `app/admin/assets/css/dropdown-field-same-size.css` — field sizing rules; lower button-jump risk, but still part of the loaded form/control cascade.

These files can influence initial button dimensions before JavaScript runs.

## JavaScript files mutating button styles after load

The most relevant JS files are:

- `app/admin/assets/js/fix-button-widths-global.js` — highest-risk. It forced selected buttons to `48px` width/height after render and observed later DOM changes.
- `app/admin/assets/js/force-button-alignment.js` — toolbar-specific style and hover handling, including Save/Back toolbar behavior. This remains risky but was not changed in this pass because the requested safe fix should not touch toolbar Save buttons unless proven necessary.
- `app/admin/assets/js/page-specific-fixes.js` — contains additional button protection/back-button logic and observers; it explicitly comments that it avoids Save button sizing.

## Exact high-risk behavior found

`fix-button-widths-global.js` did all of the following globally:

- Selected broad groups of buttons such as `.btn-edit`, `.btn.bg-transparent`, setup/filter buttons, theme action buttons, impersonate buttons, and icon buttons.
- Read computed button width/height after CSS render.
- Wrote inline `!important` styles including `width: 48px`, `height: 48px`, `min-width: 48px`, `min-height: 48px`, and `padding: 12px 16px`.
- Re-ran after initial script load, DOM ready, window load, AJAX updates, and mutation observations.

That pattern is exactly the kind of post-render sizing mutation that causes visual jumps.

## Safe fix applied

The minimal safe fix is to disable automatic post-render enforcement inside `app/admin/assets/js/fix-button-widths-global.js` while keeping the file and its manual debugging function available.

This means:

- The script is not deleted.
- Asset loading order is unchanged.
- No new pmd component CSS is loaded.
- Existing CSS remains responsible for first-paint button sizing.
- `window.enforceButtonDimensions()` remains available for manual debugging if a legacy icon button needs inspection.

## What was not changed

- No existing CSS or JS files were removed.
- No layout file was changed.
- No orders, payments, invoices, Fiskaly, tenant/database behavior, routing, or business logic were touched.
- Toolbar Save button logic was not changed.
- Tailwind was not introduced.

## Remaining risk

`page-specific-fixes.js` and other legacy admin scripts still contain style mutation logic. If button jumping remains after the Phase 6 force-button-alignment auto-disable, the next investigation should use browser devtools to record which remaining script last changes the affected button's inline styles.

## Phase 6 update: force-button-alignment.js

After disabling `fix-button-widths-global.js`, browser evidence still showed button jumping. Console logs reported `Force Button Alignment initialized`, `Found 20 total buttons to fix`, and `Connection broken for 20 buttons`; a button watcher detected hundreds of button style mutations during the first second after load and again after dashboard AJAX widget loading.

The remaining high-risk source is `app/admin/assets/js/force-button-alignment.js`. It contains broad automatic behavior that can restyle buttons, attach observers and timers, run after page content changes, and write inline styles to toolbar/action buttons after first paint.

Phase 6 disables that automatic behavior behind `AUTO_FORCE_BUTTON_ALIGNMENT = false`. When disabled, the script:

- Does not automatically call broad button styling functions.
- Does not attach its automatic DOM-ready, `pageContentLoaded`, `setTimeout`, or `setInterval` restyling handlers.
- Does not automatically attach its MutationObserver-driven `init()` flow.
- Does not automatically write inline styles to buttons.

The file remains loaded and available for manual debugging. Use this browser-console API only when intentionally investigating a legacy button issue:

```js
window.forceButtonAlignment.run()
window.forceButtonAlignment.applyToolbarPalette()
```

Remaining risk: other admin scripts and legacy CSS can still mutate or override button styles. If jumping continues, inspect the affected button in browser devtools and watch which script last writes inline styles after `force-button-alignment.js` auto mode is disabled.

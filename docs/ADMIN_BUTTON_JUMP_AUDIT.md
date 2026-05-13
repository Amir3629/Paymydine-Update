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

## Phase 7 update: admin.js button inline styling

After Phase 6 disabled automatic `force-button-alignment.js`, browser StyleTrace still showed dashboard button style mutations from `app/admin/assets/js/admin.js`. The remaining mutators were traced to `applyGreenButtonBase`, `applySaveButtonStyles`, `applyCloseButtonStyles`, `applyWidgetModalStyles`, and the `saveButtonStyleInterval` loop.

`applyGreenButtonBase` writes broad inline button styles such as background, border, color, box-shadow, min-width, height, padding, line-height, and `display: inline-block`. That conflicts with other legacy button styling that uses `inline-flex`, producing visible button jumps.

Phase 7 disables automatic admin button inline styling behind `AUTO_ADMIN_BUTTON_INLINE_STYLING = false` in both the source file and compiled production file:

- `app/admin/assets/src/js/app.js`
- `app/admin/assets/js/admin.js`

When disabled, automatic calls from `document.render`, `ajaxDone`, `ajaxComplete`, `ajaxSuccess`, document-ready startup, and `saveButtonStyleInterval` do not run button/modal restyling. Non-button critical admin behavior remains active, including metisMenu/sidebar behavior, tooltip/alert initialization, delete icon coloring, modal z-index handling, modal content data handling, CSRF/ajax handling, login redirect behavior, and ajaxPrefilter CSRF token behavior.

The legacy functions remain available for manual browser-console debugging:

```js
window.PMDAdminButtonStyling.run()
window.PMDAdminButtonStyling.applySaveButtonStyles(document)
window.PMDAdminButtonStyling.applyCloseButtonStyles(document)
window.PMDAdminButtonStyling.applyWidgetModalStyles(document)
```

The source map 404 and mixed-content image warning observed during browser testing are separate non-button issues and are not addressed by this button-jump fix.

## Phase 8 update: top toolbar button stabilization

Browser traces after Phase 7 showed remaining first-paint and early-load style changes on top toolbar/admin action buttons, including `#edit-layout-toggle`, `#dashboardContainer-daterange`, `.toolbar-action .btn`, `.edit-mode-only .btn`, and dashboard daterange controls.

The root cause for this phase was a combination of two patterns:

- Legacy toolbar buttons depended on inline Blade/JavaScript style writes for display, background, and visibility changes.
- Stable button dimensions were not available from the loaded modular CSS at first paint, so legacy scripts and global CSS could compete over `display`, height, padding, line-height, and icon alignment.

Phase 8 moves the stable visual rules into loaded CSS:

- `app/admin/assets/css/pmd-admin/components/buttons.css` now defines stable toolbar button visual states for primary, ice, outline-default, and dashboard daterange toolbar buttons.
- `app/admin/assets/css/pmd-admin/components/toolbar.css` now defines stable toolbar button sizing from first paint: `height: 40px`, `min-height: 40px`, `display: inline-flex`, centered alignment, `gap: 8px`, `line-height: 1`, `white-space: nowrap`, `box-sizing: border-box`, and stable `.fa` icon sizing.
- `app/admin/views/_meta/assets.json` now loads only the needed additional pmd components: `components/buttons.css` and `components/toolbar.css`, appended after the existing pmd variables/cards entries without reordering existing assets.

Phase 8 also removes dashboard toolbar JavaScript inline style mutations from `app/admin/widgets/dashboardcontainer/widget_toolbar.blade.php`. The edit layout toggle still changes edit mode state, updates the button label, triggers sortable setup/teardown, opens the Add Widget modal through existing Bootstrap/request attributes, and leaves the daterange picker behavior intact. CSS now handles edit-mode visibility for the Add Widget and daterange controls.

Remaining risk: other legacy scripts still contain disabled/manual or non-toolbar inline style writers. If a toolbar button still jumps, verify whether the mutation is from an enabled script or from static inline markup outside the dashboard toolbar.

## Phase 9 update: dashboard toolbar jump root cause and fix

After Phase 8, browser tracing still showed repeated post-refresh mutations around the dashboard toolbar targets `#edit-layout-toggle`, `#dashboardContainer-daterange`, `.edit-mode-only .btn`, and toolbar `.fa` icons. The remaining root cause inside the dashboard area was the widget bootstrap flow, not the edit-mode toolbar toggle itself:

- `app/admin/widgets/dashboardcontainer/assets/js/dashboardcontainer.js` initialized the DashboardContainer plugin and immediately requested `dashboardContainer::onRenderWidgets`.
- `app/admin/widgets/dashboardcontainer/dashboardcontainer.blade.php` also had an inline fallback that could request the same widgets while the plugin request was still in flight or before the plugin had finished populating the container.
- Both paths could manually insert or finalize widget HTML and then initialize charts. Those duplicate widget/render cycles happened adjacent to the toolbar and re-triggered legacy admin render/update hooks that were still observable in the browser trace.
- The dashboard widget bootstrap code also used jQuery inline style helpers for progress/container visibility. Those writes were not toolbar button sizing rules, but they made the dashboard refresh path noisier and harder to distinguish from real toolbar mutations.

Phase 9 fixes only the dashboard container area:

- `dashboardcontainer.js` now keeps shared per-alias state in `window.PMDDashboardContainerState`, marks plugin activity, tracks request start/completion/failure, and treats widgets as loaded only after the container actually has content.
- `dashboardcontainer.js` skips duplicate widget fetches across the same alias while a successful plugin request is active, preventing repeated widget loads from plugin/data-api re-entry.
- The inline Blade fallback now waits for the plugin request to complete, retries briefly while the plugin owns the dashboard, refuses to start a second fallback request, and only calls `onRenderWidgets` if the plugin did not populate the container.
- Progress indicator visibility in the touched dashboard paths now uses the semantic `hidden` property instead of writing inline display/height/padding-style visibility rules.
- `widget_toolbar.blade.php` remains class/state based: Edit Layout toggles `edit-mode`/`edit-mode-active` and updates text only; CSS in `pmd-admin/components/toolbar.css` and `pmd-admin/components/buttons.css` remains responsible for display, height, min-height, min-width, padding, line-height, gap, icon sizing, alignment, and `inline-flex` behavior.

Phase 9 preserves dashboard behavior: widgets still load through the plugin, the fallback still exists if the plugin fails, charts still initialize after widget HTML is available, Edit Layout still toggles sortable edit mode, Add Widget appears only in edit mode, the Add Widget modal still opens through the existing Bootstrap/request attributes, and the daterange control hides in edit mode via CSS and returns after saving.

Remaining risk: non-dashboard legacy scripts still contain disabled/manual style writers and some non-toolbar dashboard/date-picker code still has narrow inline positioning for the mobile date picker. Those are outside this Phase 9 toolbar-jump fix. Any future toolbar mutation should be verified against the browser trace before broad CSS or global admin JavaScript is changed.

## Phase 10 update: CSS-only toolbar grouping and bulk-action visibility

After the runtime toolbar mutators were identified, the remaining cleanup moved top-toolbar layout decisions into the single loaded stylesheet `app/admin/assets/css/pmd-admin/components/toolbar-buttons.css`.

Phase 10 keeps the active asset set focused on `admin.css`, pmd variables, pmd cards, pmd toolbar buttons, and `admin.js`. No dashboard JavaScript, widget behavior, route, tenant, database, or media-manager behavior was changed.

The toolbar markup/layout sources are:

- `app/admin/widgets/toolbar/toolbar.blade.php`: renders the shared top toolbar as `.toolbar.btn-toolbar > .toolbar-action > .progress-indicator-container` and outputs configured toolbar buttons in order.
- `app/admin/classes/ToolbarButton.php` and `app/admin/widgets/toolbar/button_*.blade.php`: preserve the configured button class/order from controller/model config.
- `app/admin/widgets/lists/list_actions.blade.php` and `app/admin/widgets/lists/assets/js/lists.js`: list bulk actions are still shown by checkbox selection through the existing `.bulk-actions.hide` class toggle; CSS should not replace that behavior.

Phase 10 fixes only CSS/layout:

- Top toolbars now use a stable flex row on `.progress-indicator-container`.
- The first primary toolbar action remains left by receiving `margin-right: auto`, so later secondary actions group on the right instead of floating into the middle.
- Back buttons that appear as the first `.btn-outline-secondary` action are stabilized as 40x40 icon buttons before the primary action.
- New/primary buttons keep the dark-blue treatment with reduced icon/text gap and natural width.
- Secondary/right-side buttons keep white/outline styling.
- Dashboard toolbar edit-mode visibility remains CSS-owned; the daterange still hides in edit mode and returns after saving.
- Orders/list bulk actions remain JS-controlled by row selection, but CSS now restores visibility for `.bulk-actions:not(.hide)` and aligns the bulk action button to the right. This overrides legacy CSS that hid bulk action rows entirely without touching row-selection JavaScript.

The old side-nav toolbar runtime mutator blocks remain disabled and documented in place. Do not reintroduce DOM-ready/load/timer/MutationObserver code that writes toolbar button `style` attributes; future toolbar visual changes should go into `toolbar-buttons.css` or a similarly scoped stylesheet.

## Phase 11 update: unified CSS-only top toolbar button rules

Phase 11 keeps the button-jump fix CSS-only and continues to leave dashboard container JavaScript untouched. The active toolbar stylesheet remains `app/admin/assets/css/pmd-admin/components/toolbar-buttons.css`.

The remaining toolbar issues were caused by mixed legacy toolbar structures using the same visual roles with different wrappers: shared `Toolbar` widgets render `.toolbar.btn-toolbar > .toolbar-action > .progress-indicator-container`, some pages use `.page-actions`, `.form-toolbar`, or `.list-toolbar`, and list bulk actions render as `.bulk-actions.hide` rows that existing list JavaScript toggles when checkboxes change.

Phase 11 extends only the scoped toolbar CSS:

- Top toolbar wrappers now share the same stable flex layout without using runtime style writers.
- Back buttons that are first `.btn-outline-secondary` actions are fixed as visible 40x40 outline icon buttons with dark icons.
- Top-toolbar primary buttons, including Save buttons and `data-request="onSave"` buttons, use the same dark-blue primary treatment and stable 42px sizing.
- First primary actions remain left; secondary/default actions and button groups after the first primary group to the right through flex ordering and primary `margin-right: auto`.
- Dashboard `.widget-item-action` edit-mode buttons now center their icons inside the existing square button frames.
- List bulk-action rows remain controlled by existing checkbox JavaScript, but CSS now permits `.bulk-actions:not(.hide)` to render and align its action buttons to the right.
- Media manager button dimensions/layout remain owned by the media-manager CSS; Phase 11 only centers icons inside media-manager toolbar buttons.

No MutationObserver, timer, `setProperty`, `setAttribute('style')`, jQuery `.css()`, `.show()`, or `.hide()` behavior was added for toolbar buttons.

## Phase 12 update: CSS-only back, payments, bulk, and media dropdown alignment

Phase 12 keeps the Phase 11 constraints: no toolbar JavaScript, no dashboard container changes, no media-manager behavior changes, and no re-enabled side-nav runtime mutators.

The remaining production issues were layout/override problems in the focused stylesheet:

- Back links that render as `.btn.btn-outline-secondary` with a left-arrow icon can be direct toolbar children or children of `.progress-indicator-container`. They now receive explicit left-side ordering, compact 40x40 sizing, and the dark-blue primary visual treatment while keeping the arrow centered.
- Some pages, such as payments provider/method toolbars, render primary actions directly inside `.toolbar-action` or page/form/list toolbar wrappers instead of inside the shared progress wrapper. Direct primary children now follow the same left-primary/right-secondary flex rule.
- Legacy list CSS can still hide `.bulk-actions` even after list JavaScript removes `.hide`. The Phase 12 rules make `.bulk-actions:not(.hide)` visible, opaque, and table-row/table-cell based while preserving the existing checkbox JavaScript as the state owner.
- Media-manager toolbar button sizes remain controlled by media-manager styles; Phase 12 only centers dropdown-toggle icon contents for the filter/sort two-icon buttons.

No `MutationObserver`, timer, inline style writer, jQuery `.css()`, `.show()`, or `.hide()` behavior was added.

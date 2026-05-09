# PayMyDine Admin CSS Quick Audit

Date: 2026-05-09

Scope: Laravel/TastyIgniter Blade admin under `/admin` only. This audit intentionally does **not** cover the Next.js frontend/admin, and it does not recommend Tailwind migration or UI redesign work.

## Current situation

The production admin panel is still driven by the Laravel/TastyIgniter Blade layout at `app/admin/views/_layouts/default.blade.php`. The base admin bundle is declared in `app/admin/views/_meta/assets.json`, where `css/admin.css` and `js/admin.js` are loaded through the asset combiner (`get_style_tags()` / `get_script_tags()`). The layout then appends a large number of direct CSS and JS files globally.

The CSS architecture has accumulated many global override files with high-specificity selectors and many `!important` declarations. Several files target common Bootstrap/TastyIgniter classes such as `.btn`, `.btn-primary`, `.form-control`, `.modal`, `.table`, and `.dropdown-menu`. Because these selectors are not namespaced to a page or feature, a change made to fix one admin screen can affect unrelated admin pages.

The JS architecture also contains several global post-load style fixes. These scripts use `style.*`, `style.setProperty(...)`, `classList`, timers, `MutationObserver`, and `querySelector(...)` to alter layout, colors, widths, modals, dropdowns, media finder fields, tabs, profile dropdowns, and toolbar buttons after the page has rendered. This makes visual behavior harder to reason about because CSS and JS both compete to set presentation.

Tailwind should **not** be introduced for this Laravel admin cleanup. Adding Tailwind now would create a second styling system, increase cascade conflicts, and widen the scope beyond a safe first-pass cleanup. The safer path is to keep the Laravel admin, document the current cascade, and later move existing overrides into modular CSS/SCSS with scoped selectors.

## Files inspected

- `app/admin/views/_layouts/default.blade.php`
- `app/admin/views/_meta/assets.json`
- `app/admin/assets/css/`
- `app/admin/assets/js/`

## Globally loaded CSS files

### Asset-combiner CSS

`app/admin/views/_meta/assets.json` declares the base admin stylesheet:

1. `css/admin.css` as `admin-css`

This is included by the layout through `get_style_tags()`.

### Direct CSS files loaded by the default admin layout

The default admin layout directly loads these stylesheets globally, in this order:

1. `app/admin/assets/css/notifications.css`
2. `app/admin/assets/css/push-notifications.css`
3. `app/admin/assets/css/header-dropdowns.css`
4. `app/admin/assets/css/remove-green-edges.css`
5. `app/admin/assets/css/smooth-transitions.css`
6. `app/admin/assets/css/custom-fixes.css`
7. `app/admin/assets/css/calendar.css`
8. `app/admin/assets/css/admin-settings-modern.css`
9. `app/admin/assets/css/sweetalert2-modal-style.css`
10. `app/admin/assets/css/admin-confirm-modal.css`
11. `app/admin/assets/css/admin-modals-unified.css`
12. `app/admin/assets/css/admin-cards-rounded.css`
13. `app/admin/assets/css/introjs.min.css`
14. `app/admin/assets/css/admin-tour-enhanced.css`
15. `app/admin/assets/css/blue-buttons-override.css`
16. `app/admin/assets/css/smooth-corner-replace-star.css`
17. `app/admin/assets/css/fix-menu-grid-hover.css`
18. `app/admin/assets/css/fix-footer-button-no-green.css`
19. `app/admin/assets/css/fix-toggle-switches.css`
20. `app/admin/assets/css/fix-notification-header-border.css`
21. `app/admin/assets/css/fix-notification-header-buttons.css`
22. `app/admin/assets/css/fix-profile-dropdown-green.css`
23. `app/admin/assets/css/fix-profile-dropdown-hover.css`
24. `app/admin/assets/css/fix-profile-dropdown-closed.css`
25. `app/admin/assets/css/fix-green-buttons-and-text.css`
26. `app/admin/assets/css/modern-media-finder.css`
27. `app/admin/formwidgets/mediafinder/assets/css/mediafinder.css`
28. `app/admin/assets/css/daterangepicker-arrows.css`
29. `app/admin/assets/css/no-green-toolbar-buttons.css`
30. `app/admin/assets/css/dropdown-field-same-size.css`
31. `app/admin/assets/css/pmd-mediamanager-autofix.css`

The layout also includes inline CSS blocks, including a critical `no-green-toolbar-critical` block that uses `!important` toolbar button overrides before first paint.

## Globally loaded JS files

### Asset-combiner JS

`app/admin/views/_meta/assets.json` declares the base admin script:

1. `js/admin.js` as `admin-js`

This is included by the layout through `get_script_tags()`.

### Direct JS files loaded by the default admin layout

The default admin layout directly loads these scripts globally, in order:

1. `app/admin/assets/vendor/pmd-mediafix/Sortable.min.js`
2. `app/admin/assets/vendor/pmd-mediafix/dropzone.min.js`
3. `app/admin/assets/js/slim-select-relative-position.js`
4. `app/admin/assets/js/admin-confirm-modal.js`
5. `app/admin/assets/js/notifications.js`
6. `app/admin/assets/js/push-notifications.js`
7. `app/admin/assets/js/modal-performance-fix.js`
8. `app/admin/assets/js/fix-bootstrap-dropdown-null.js`
9. `app/admin/assets/js/smooth-transitions.js`
10. `app/admin/assets/js/force-button-alignment.js`
11. `app/admin/assets/js/page-specific-fixes.js`
12. `app/admin/assets/js/fix-media-finder-inline-styles.js`
13. `app/admin/assets/js/fix-history-button-centering.js`
14. `app/admin/assets/js/fix-notification-buttons-border.js`
15. `app/admin/assets/js/fix-profile-dropdown-green.js`
16. `app/admin/assets/js/fix-tab-link-colors.js`
17. `app/admin/assets/js/fix-suggestion-sentences-label.js`
18. `app/admin/assets/js/fix-form-field-focus-colors.js`
19. `app/admin/assets/js/fix-profile-dropdown-closed.js`
20. `app/admin/assets/js/fix-menu-grid-hover.js`
21. `app/admin/assets/js/fix-disable-tooltips.js`
22. `app/admin/assets/js/modal-blur-fix.js`
23. `app/admin/assets/js/media-search-icon-fix.js`
24. `app/admin/assets/js/image-preview-persistence.js`
25. `app/admin/assets/js/debug-redirects.js`
26. `app/admin/assets/js/introjs.min.js`
27. `app/admin/assets/js/admin-tour-enhanced.js`
28. `app/admin/assets/js/folder-dropdown-card.js`
29. `app/admin/assets/js/fix-button-widths-global.js`
30. `app/admin/assets/js/dynamic-dropdown-height.js`
31. `app/admin/assets/js/pmd-mediafinder-autofix.js`

The `sidebar-star-icon.js` include is present only inside a disabled HTML comment and should be treated as not loaded by this layout.

The layout also contains inline scripts that alter classes and styles for the mobile header, navbar dropdown alignment, modal/dropdown cleanup, guide tour, and payment/Wero UI state.

## JS files that change styles after page load

The following loaded scripts are especially relevant because they use style mutations, class mutations, timers, observers, or DOM querying that can change visual state after render:

- `app/admin/assets/js/admin.js`
- `app/admin/assets/js/admin-confirm-modal.js`
- `app/admin/assets/js/admin-tour-enhanced.js`
- `app/admin/assets/js/dynamic-dropdown-height.js`
- `app/admin/assets/js/fix-button-widths-global.js`
- `app/admin/assets/js/fix-disable-tooltips.js`
- `app/admin/assets/js/fix-form-field-focus-colors.js`
- `app/admin/assets/js/fix-history-button-centering.js`
- `app/admin/assets/js/fix-media-finder-inline-styles.js`
- `app/admin/assets/js/fix-menu-grid-hover.js`
- `app/admin/assets/js/fix-notification-buttons-border.js`
- `app/admin/assets/js/fix-profile-dropdown-closed.js`
- `app/admin/assets/js/fix-profile-dropdown-green.js`
- `app/admin/assets/js/fix-suggestion-sentences-label.js`
- `app/admin/assets/js/fix-tab-link-colors.js`
- `app/admin/assets/js/folder-dropdown-card.js`
- `app/admin/assets/js/force-button-alignment.js`
- `app/admin/assets/js/force-color-fix.js` if enabled elsewhere
- `app/admin/assets/js/force-status-colors.js` if enabled elsewhere
- `app/admin/assets/js/history-page-fix.js` if enabled elsewhere
- `app/admin/assets/js/media-search-icon-fix.js`
- `app/admin/assets/js/mobile-sidebar-toggle.js` if enabled elsewhere
- `app/admin/assets/js/modal-blur-fix.js`
- `app/admin/assets/js/modal-performance-fix.js`
- `app/admin/assets/js/notifications.js`
- `app/admin/assets/js/page-specific-fixes.js`
- `app/admin/assets/js/pmd-mediafinder-autofix.js`
- `app/admin/assets/js/push-notifications.js`
- `app/admin/assets/js/scripts.js` if enabled elsewhere
- `app/admin/assets/js/smooth-transitions.js`
- inline scripts in `app/admin/views/_layouts/default.blade.php`

Highest-risk loaded examples from the quick counts:

- `force-button-alignment.js`: many direct style writes and DOM queries; globally loaded and focused on toolbar/button layout.
- `page-specific-fixes.js`: page-targeting logic in a globally loaded file; uses timers, observers, and style writes.
- `fix-media-finder-inline-styles.js`: removes or rewrites inline styles for media finder UI.
- `fix-profile-dropdown-green.js`: JS color/hover corrections for dropdown UI.
- `fix-button-widths-global.js`: explicitly global button sizing enforcement.
- `dynamic-dropdown-height.js`: dropdown positioning/height changes after load.
- Inline layout scripts: adjust dropdown positioning, modal/dropdown cleanup, mobile header classes, and payment/Wero visual state.

## CSS files targeting global selectors

The quick search found broad selector usage across many files. The highest-risk CSS files for global Bootstrap/TastyIgniter selectors include:

| File | Why it is risky |
| --- | --- |
| `admin.css` | Base admin bundle; includes many `.btn`, `.form-control`, `.dropdown-menu`, `.modal`, and `.table` selectors. |
| `dashboard.css` | Very large file with many global UI selectors, including buttons, forms, dropdowns, modals, and tables. |
| `custom-fixes.css` | Globally loaded override file with many `.btn`, `.btn-primary`, `.form-control`, `.modal`, and `!important` rules. |
| `admin-settings-modern.css` | Globally loaded but has many `.btn`, `.btn-primary`, and `.form-control` selectors despite sounding settings-specific. |
| `blue-buttons-override.css` | Globally loaded button-color override targeting `.btn` and `.btn-primary`. |
| `no-green-toolbar-buttons.css` | Globally loaded toolbar/button override with high-specificity button selectors. |
| `fix-green-buttons-and-text.css` | Globally loaded color override for buttons/text. |
| `dropdown-field-same-size.css` | Globally loaded form-control sizing override. |
| `admin-modals-unified.css` | Globally loaded modal and button styling. |
| `admin-confirm-modal.css` | Globally loaded modal styling. |
| `header-dropdowns.css` | Globally loaded dropdown/menu/header styling with many `!important` rules. |
| `remove-green-edges.css` | Globally loaded dropdown/menu color-edge override. |
| `fix-footer-button-no-green.css` | Globally loaded dropdown/footer/button color override. |
| `fix-menu-grid-hover.css` | Globally loaded dropdown/menu-grid hover override. |
| `fix-profile-dropdown-green.css` | Globally loaded profile dropdown override. |
| `modern-media-finder.css` | Globally loaded media finder styling, including form-control and button selectors. |
| `daterangepicker-arrows.css` | Globally loaded date range picker override, loaded late. |
| `sweetalert2-modal-style.css` | Globally loaded modal-related override. |

## Files with many `!important` declarations

The quick count found extensive use of `!important`. The largest counts were:

| File | Approx. `!important` count |
| --- | ---: |
| `dashboard.css` | 3607 |
| `admin.css` | 3344 |
| `admin-settings-modern.css` | 1607 |
| `header-dropdowns.css` | 899 |
| `superadmin-spacing-fix.css` | 872 |
| `custom-fixes.css` | 831 |
| `superadmin-exact-match.css` | 661 |
| `superadmin-unified.css` | 312 |
| `admin-tour-enhanced.css` | 269 |
| `superadmin-mobile-sidebar-fix.css` | 250 |
| `modern-media-finder.css` | 237 |
| `blue-buttons-override.css` | 151 |
| `superadmin-final-polish.css` | 146 |
| `fix-green-buttons-and-text.css` | 124 |
| `fix-menu-grid-hover.css` | 110 |
| `superadmin-header-fix.css` | 108 |
| `fix-notification-header-buttons.css` | 105 |
| `admin-modals-unified.css` | 100 |
| `daterangepicker-arrows.css` | 100 |
| `sweetalert2-modal-style.css` | 96 |

Not every file above is globally loaded by the default admin layout, but any globally loaded high-`!important` file should be treated as cascade-sensitive.

## Main risks

1. **Global selectors are shared across admin screens.** Classes like `.btn`, `.btn-primary`, `.form-control`, `.modal`, `.table`, and `.dropdown-menu` are used throughout the admin. A rule added for one feature can unintentionally alter every page using the same framework class.
2. **Many override files are loaded globally.** Files with names like `fix-*`, `custom-fixes.css`, and `blue-buttons-override.css` are appended to the main layout, so they affect all routes that use the default admin layout.
3. **Late-loaded CSS wins the cascade.** Several files are intentionally loaded late to override previous rules. Changing order or selector specificity can reintroduce green buttons, dropdown artifacts, field-size differences, or toolbar button jitter.
4. **CSS and JS compete for presentation.** JS files set inline styles with `!important`, remove styles, and toggle classes after page load. Inline JS changes can override CSS and can also cause flashes, layout shifts, or inconsistent hover/focus states.
5. **Page-specific fixes are global in practice.** A file named `page-specific-fixes.js` is loaded from the default layout, so its logic runs on all admin pages and depends on DOM detection to decide what to change.
6. **Cache-busting with `time()` masks asset stability.** Many files use `?v={{ time() }}`, which ensures changes are immediately visible but prevents browser caching and can make performance and debugging noisier.
7. **Inline critical CSS and scripts are part of the cascade.** The layout itself contains critical toolbar CSS and post-load scripts, so auditing file assets alone is not enough.
8. **Large legacy bundles are difficult to isolate.** `admin.css` and `dashboard.css` are very large and include many shared selectors. They should be treated as legacy baseline layers until modular replacements are ready.

## Why changes in one page affect other pages

Most admin pages share `app/admin/views/_layouts/default.blade.php`. Because that layout loads the same CSS and JS stack everywhere, selectors and scripts are not naturally isolated by page. For example:

- A `.btn-primary` rule intended to fix a Save button can affect New, Delete, toolbar, modal, date picker, media manager, notification, and dropdown buttons.
- A `.form-control` rule intended to align one dropdown field can affect text inputs, selects, date fields, media finder fields, and settings forms.
- A `.modal` rule intended to fix one confirmation dialog can affect Bootstrap modals, SweetAlert-style modals, media finder dialogs, and custom admin modals.
- A `.dropdown-menu` rule intended for the profile menu can affect notification dropdowns, folder dropdowns, filter/sort dropdowns, Bootstrap menus, and rich editor dropdowns.
- A global JS observer can reapply styles after page load even when a page-specific CSS override tries to restore default behavior.

## Files that should be migrated later into modular CSS

Do not migrate these in this documentation-only pass. For a later PR, prioritize moving or wrapping these into modular CSS/SCSS layers:

### Component-level candidates

- Buttons/toolbars: `blue-buttons-override.css`, `no-green-toolbar-buttons.css`, `fix-green-buttons-and-text.css`, `fix-footer-button-no-green.css`, relevant pieces of `custom-fixes.css`
- Forms/fields: `dropdown-field-same-size.css`, form-control sections of `admin-settings-modern.css`, `modern-media-finder.css`, and `custom-fixes.css`
- Modals/dialogs: `admin-modals-unified.css`, `admin-confirm-modal.css`, `sweetalert2-modal-style.css`, modal sections of `custom-fixes.css`
- Dropdowns/menus: `header-dropdowns.css`, `remove-green-edges.css`, `fix-profile-dropdown-green.css`, `fix-profile-dropdown-hover.css`, `fix-profile-dropdown-closed.css`, `fix-menu-grid-hover.css`, `folder-dropdown-card.js`-related styles
- Notifications: `notifications.css`, `push-notifications.css`, `fix-notification-header-border.css`, `fix-notification-header-buttons.css`
- Media finder: `modern-media-finder.css`, `pmd-mediamanager-autofix.css`, `fix-media-finder-inline-styles.js`, `pmd-mediafinder-autofix.js`
- Date picker: `daterangepicker-arrows.css`, `calendar.css`
- Tour: `admin-tour-enhanced.css`, `introjs.min.css`

### Page-level candidates

- Settings-specific sections from `admin-settings-modern.css`
- Dashboard-specific sections from `dashboard.css`
- History-specific behavior from `history-page-fix.js` if used by a page
- Any logic currently inside `page-specific-fixes.js` that can be loaded only on the page that needs it

### Legacy baseline candidates

- `admin.css`
- `dashboard.css`
- `custom-fixes.css`

These should not be edited casually. Treat them as baseline layers and extract only well-understood, testable pieces over time.

## Recommended strategy

1. **Keep the Laravel/TastyIgniter admin.** Continue working in the existing Blade admin under `/admin`.
2. **Do not introduce Tailwind now.** Tailwind would add a second utility framework and increase conflict risk with Bootstrap/TastyIgniter selectors.
3. **Use modular CSS/SCSS later.** Introduce organized modules gradually instead of rewriting the whole cascade at once.
4. **Split by components and pages.** Create component modules for buttons, forms, modals, dropdowns, notifications, media finder, date picker, and tour UI; create page modules only where a route truly needs custom styling.
5. **Use a `.pmd-` prefix for new custom classes.** New selectors should avoid generic framework classes unless intentionally extending the baseline.
6. **Use BEM naming where useful.** Example: `.pmd-toolbar`, `.pmd-toolbar__action`, `.pmd-toolbar__button--primary`.
7. **Reduce global overrides gradually.** Do not remove broad rules until equivalent scoped rules exist and affected pages are tested.
8. **Move JS-based styling hacks into CSS later.** Prefer CSS classes and scoped styles over JS writing inline styles. Keep JS for behavior/state, not colors, spacing, and layout, wherever possible.
9. **Preserve loading order until replacements are proven.** This first phase should not reorder files because order currently determines which override wins.
10. **Avoid touching business logic.** Payment, order, Fiskaly, tenant, database, and other business behavior should remain out of scope.

## First safe implementation plan for the next PR

The next implementation PR should still be small and low-risk. Recommended scope:

1. **Create an admin style inventory table** in docs or a tracking issue that maps every globally loaded CSS/JS file to owner area, selectors touched, and whether it is safe to modularize.
2. **Pick one isolated component, preferably admin modals or confirm modal buttons.** Avoid toolbar Save buttons and payment/order screens for the first code change.
3. **Add a new scoped CSS module using `.pmd-` classes** for that component only. Do not remove the old global CSS in the same PR.
4. **Apply new classes in one Blade component/template only** if the template is clearly admin-only and not business-critical.
5. **Do not change asset loading order.** Add the new module in a controlled place or use the existing asset combiner only after confirming the correct admin-only path.
6. **Avoid JS style mutations in the first code PR.** If a JS hack must remain, document it and leave behavior unchanged.
7. **Run visual smoke checks** for: dashboard, settings form, a list/table page, a modal/confirm flow, profile dropdown, notifications, media finder, and date picker.
8. **Only after smoke checks, begin replacing global selectors** with scoped `.pmd-` selectors one component at a time.

## Fast command findings

Commands run during this audit found:

- The default layout directly references multiple known fix/override assets, including `custom-fixes.css`, `admin-modals-unified.css`, `blue-buttons-override.css`, `fix-footer-button-no-green.css`, `fix-green-buttons-and-text.css`, `no-green-toolbar-buttons.css`, `dropdown-field-same-size.css`, `force-button-alignment.js`, `page-specific-fixes.js`, and `fix-button-widths-global.js`.
- Some individual admin views (`index.blade.php`, `settings.blade.php`, `new.blade.php`, and `location_requests.blade.php`) also reference `blue-buttons-override.css` and `force-blue-buttons.js`; these are outside the default-layout global list but should be audited before any button cleanup.
- The CSS folder contains very large legacy files: `dashboard.css` (~43,718 lines), `admin.css` (~30,919 lines), `admin-settings-modern.css` (~3,952 lines), `superadmin-spacing-fix.css` (~2,935 lines), and `custom-fixes.css` (~1,976 lines).
- The broad CSS selector search returned thousands of matches, confirming that global framework selectors are widespread.
- The JS style-mutation search returned many matches, confirming that style behavior is split between CSS and JavaScript.

## Risks and uncertainty

- This was a fast static audit only. It did not execute the admin UI in a browser or verify route-specific rendering.
- Some CSS/JS files in `app/admin/assets` may be unused by the default layout but loaded elsewhere by individual views, widgets, extensions, or the asset combiner.
- The asset combiner may include additional widget CSS/JS beyond the static files listed here depending on the page.
- Because the layout uses inline CSS and inline scripts, future cleanup must include both asset files and layout-embedded behavior.
- No CSS refactor, file deletion, asset order change, layout behavior change, or Tailwind migration was performed in this pass.

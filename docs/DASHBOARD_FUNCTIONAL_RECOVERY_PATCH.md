# Dashboard Functional Recovery Patch

## A. What functionality is still broken
After the first patch, the backend dashboard no longer hard-crashed, but real behavior remained broken:
- reports chart still blank/white,
- edit-mode drag handle not moving widgets,
- duplicate/remove widget actions not executing.

## B. Which exact dependencies are still required for:

### chart rendering
- Required at runtime: either
  1) a working `window.Chart` implementation, **or**
  2) an in-file fallback renderer when Chart is unavailable.
- In active code, `charts.js` initializes via `new Chart(...)`; if `Chart` is absent, chart stays blank unless fallback exists.

### drag handle
- Required at runtime: either
  1) `Sortable.create(...)` from SortableJS, **or**
  2) an alternative drag-sort implementation.
- Existing dashboard code used `Sortable.create(...)` directly.

### duplicate widget
- Required at runtime:
  1) click handler binding,
  2) valid AJAX request target for `onDuplicateWidget`.
- Existing code used `this.$form.request(...)`; when no enclosing form is present, this target is unreliable.

### remove widget
- Required at runtime:
  1) click handler binding,
  2) valid AJAX request target for `onRemoveWidget`.
- Same request-target issue as duplicate.

## C. Which parts can work without legacy assets, and which cannot
- Can work without missing legacy assets:
  - duplicate/remove AJAX actions (if request target is corrected),
  - drag sorting (if native fallback exists when Sortable is missing),
  - chart visualization (if fallback canvas renderer exists when Chart is missing).
- Cannot work without replacement:
  - `Sortable.create(...)` path without SortableJS or fallback,
  - `new Chart(...)` path without Chart.js or fallback.

## D. Whether Sortable / jquery-sortable must be restored
- `jquery-sortable.js` is **not strictly required** by current dashboard logic.
- `Sortable` functionality is required for move/drag behavior, but it can be satisfied by:
  - restoring SortableJS vendor file, or
  - native HTML5 drag-drop fallback.

This patch chooses the smallest backend-safe route: keep Sortable path when available, and add native fallback when not.

## E. Whether chart rendering still needs Chart.js or another active chart library path
- The original path still expects Chart.js.
- To recover behavior immediately without reintroducing missing vendor files, this patch adds a fallback canvas renderer used only when `Chart` is unavailable.
- If Chart.js is present, existing behavior is unchanged.

## F. Exact active file(s) that must be changed
1. `app/admin/widgets/dashboardcontainer/assets/js/dashboardcontainer.js`
   - fix AJAX request target for duplicate/remove/sort save,
   - add Sortable fallback path for drag/move.
2. `app/admin/dashboardwidgets/charts/assets/js/charts.js`
   - add fallback renderer when Chart.js is unavailable.

## G. Minimal patch that restores actual functionality
Implemented focused patch:

1) DashboardContainer request-target fix
- Added `this.$requestTarget = this.$form.length ? this.$form : this.$el`.
- Switched these calls to use `$requestTarget.request(...)`:
  - `onRemoveWidget`
  - `onDuplicateWidget`
  - `onSetWidgetPriorities`

2) Drag/move recovery without external vendor restore
- Kept existing `Sortable.create(...)` path if Sortable exists.
- Added native HTML5 drag-sort fallback (`initNativeSortable` / `destroyNativeSortable`) when Sortable is missing.
- Added explicit click `preventDefault/stopPropagation` for duplicate/remove buttons.

3) Chart recovery without external vendor restore
- In `charts.js`, if `Chart` is undefined, fallback canvas renderer draws dataset lines directly so the chart area is no longer blank.
- If `Chart` exists, normal chart path remains intact.

## H. Verification steps
1. Open backend dashboard:
   - `/admin/dashboard`
2. Enter edit mode and verify:
   - drag handle reorders widgets,
   - duplicate button triggers widget duplication,
   - remove button triggers confirm + removal.
3. Verify reports widget:
   - chart area is no longer white/blank.
4. Browser console:
   - no uncaught errors on duplicate/remove clicks,
   - no uncaught errors on entering edit mode drag.
5. Save layout and refresh:
   - widget order persists (verifies `onSetWidgetPriorities` request path).


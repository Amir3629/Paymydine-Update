# Dashboard Asset Failure Audit

## A. Root Cause
The live backend dashboard was registering frontend asset files that do not exist in the active repository tree. Those missing files were required by dashboard runtime code for date-range initialization, chart adapters, and drag/drop support. The resulting 404s broke JavaScript execution on the dashboard page and prevented chart/widget interactions from initializing correctly. 

## B. Evidence
1. Active backend files previously referenced missing assets:
   - `app/admin/widgets/DashboardContainer.php` (sortable, moment, daterangepicker registrations).
   - `app/admin/dashboardwidgets/Charts.php` (Chart.js + adapter registrations).
   - `app/admin/views/_layouts/default.blade.php` (`force-blue-buttons.js` include).
2. Runtime dashboard JS previously depended on `moment` at definition time and on `daterangepicker` at init time in `dashboardcontainer.js`.
3. Chart setup previously used time-scale axis in `charts.js`, which depends on time adapter availability.
4. After minimal patch:
   - missing-file registrations were removed from active dashboard PHP loaders,
   - date-range init was hardened (guarded) so dashboard scripts do not crash if plugin absent,
   - chart x-axis was made adapter-free (`category`) to avoid blank chart when adapter assets are missing,
   - obsolete `force-blue-buttons.js` include was removed.

## C. Active Files Involved
- `app/admin/widgets/DashboardContainer.php`
- `app/admin/dashboardwidgets/Charts.php`
- `app/admin/widgets/dashboardcontainer/assets/js/dashboardcontainer.js`
- `app/admin/dashboardwidgets/charts/assets/js/charts.js`
- `app/admin/views/_layouts/default.blade.php`

## D. Broken Asset URLs / referenced paths
Previously referenced by active backend files:
1. `~/app/admin/formwidgets/repeater/assets/vendor/sortablejs/Sortable.min.js`
2. `~/app/admin/formwidgets/repeater/assets/vendor/sortablejs/jquery-sortable.js`
3. `~/app/admin/assets/src/js/vendor/moment.min.js`
4. `~/app/admin/dashboardwidgets/charts/assets/vendor/daterange/daterangepicker.js`
5. `~/app/admin/dashboardwidgets/charts/assets/vendor/daterange/daterangepicker.css`
6. `~/app/admin/dashboardwidgets/charts/assets/vendor/chartjs/Chart.min.js`
7. `~/app/admin/dashboardwidgets/charts/assets/vendor/chartjs/chartjs-adapter-moment.min.js`
8. `app/admin/assets/js/force-blue-buttons.js`

## E. Whether each referenced file exists in the ACTIVE tree
- All 8 files above are missing from the active tree in this repository snapshot.
- Classification:
  - Missing file: all 8.
  - Wrong asset path: not proven; path could be correct historically but targets are absent.
  - Obsolete reference: `force-blue-buttons.js` include is obsolete in active layout because file does not exist.
  - Wrong load order: not primary root cause here.
  - Broken registration: yes (registration points to absent files).

## F. Why the reports chart is blank
1. Chart-related dependencies were registered from missing paths (404s).
2. Time-based chart scale required adapter support that was not reliably available.
3. Missing date/time dependencies also triggered runtime failures on dashboard page load.

Minimal backend-safe remediation applied:
- stop loading absent chart vendor files from missing paths,
- remove hard dependency on time adapter by using category x-axis in chart config.

## G. Why edit-layout move/duplicate/remove fail
1. `dashboardcontainer.js` previously executed `moment()` in static defaults at script evaluation time.
2. When `moment` was missing, script threw before full widget action lifecycle could initialize.
3. Drag/move depended on sortable runtime and dashboard container initialization.

Minimal backend-safe remediation applied:
- `moment` usage now has native Date fallback.
- date-range plugin initialization is guarded and skipped when plugin is unavailable.

This allows core widget action wiring to initialize instead of crashing early.

## H. Whether `force-blue-buttons.js` is an obsolete reference
Yes for active backend tree in this repo snapshot:
- It was included in default admin layout.
- The file is absent.
- It produced a direct 404 with no functional recovery value.

Patch removes this obsolete script include.

## I. Minimal safe fix plan
1. Remove only dashboard-specific registrations that point to missing files.
2. Keep dashboard core scripts (`dashboardcontainer.js`, `charts.js`) active.
3. Add defensive guards in dashboard JS so missing optional plugins do not crash page init.
4. Adjust chart x-axis to adapter-free mode to restore visible chart rendering.
5. Remove obsolete global script include that generates guaranteed 404.

This avoids broad refactors and limits risk to the exact failing dashboard path.

## J. Exact patch proposal
Implemented minimal patch:
1. `app/admin/widgets/DashboardContainer.php`
   - Removed registrations for missing sortable/moment/daterangepicker vendor files.
   - Kept dashboard container css/js loads.
2. `app/admin/dashboardwidgets/Charts.php`
   - Removed registrations for missing chart vendor files.
   - Kept widget chart controller script/css loads.
3. `app/admin/widgets/dashboardcontainer/assets/js/dashboardcontainer.js`
   - Replaced hard `moment()` defaults with `moment`-if-present fallback to native `Date`.
   - Added guard in `initDateRange` to no-op when daterangepicker plugin is unavailable.
4. `app/admin/dashboardwidgets/charts/assets/js/charts.js`
   - Changed x-axis from `time` to `category` (adapter-free, safer under missing adapter assets).
5. `app/admin/views/_layouts/default.blade.php`
   - Removed obsolete include for `force-blue-buttons.js`.

## K. Verification steps
1. Open backend dashboard page:
   - `https://mimoza.paymydine.com/admin/dashboard`
2. Confirm in browser network panel:
   - no 404s for the eight previously missing assets listed above.
3. Confirm console:
   - no `ReferenceError: moment` from `dashboardcontainer.js`.
4. In edit-layout mode, verify widget actions:
   - move/drag works,
   - duplicate works,
   - remove works,
   - settings still works.
5. Verify reports chart:
   - chart canvas renders dataset visually (not blank white area).


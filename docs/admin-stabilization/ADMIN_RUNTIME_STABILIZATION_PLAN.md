# PayMyDine Admin Runtime Stabilization Plan

## Objective

Stabilize the selected PayMyDine admin routes across desktop, tablet, and phone without blindly deleting legacy code or changing business behavior. The work must identify all runtime authorities, stop visible multi-version rendering, prevent duplicate event execution, and consolidate each route to one final UI authority.

## Target environment

- Base URL: `https://mimoza.paymydine.com`
- Repository: `Amir3629/Paymydine-Update`
- QA must be read-only unless a test explicitly uses safe disposable test data.
- Never deploy directly from this branch. Produce a reviewed PR first.

## In-scope routes

Primary routes:

- `/admin/reservations`
- `/admin/orders`
- `/admin/coupons`
- `/admin/locations`
- `/admin/menus`
- `/admin/mealtimes`
- `/admin/tables`
- `/admin/themes`
- `/admin/dashboard2`
- `/admin/dashboard`
- `/admin/dashboardwaiternew`

Settings scope:

- `/admin/settings`
- Every directly reachable settings child page discovered from the settings navigation.

Do not expand the scope to customer ordering pages, checkout, payment processing, tenant configuration, or unrelated admin modules.

## Required delivery sequence

### Phase 1 — Evidence-first runtime audit

Extend the existing `pmd-qa` Playwright workspace rather than creating another disconnected QA folder.

For every target route, collect:

1. Cold-load video.
2. Screenshots at approximately 0 ms, 50 ms, 100 ms, 250 ms, 500 ms, 1000 ms, 2000 ms, and after visual stability.
3. DOM snapshots during the same loading timeline.
4. Loaded script and stylesheet inventory, including duplicate URLs and cache-version variants.
5. Console errors and warnings.
6. Failed network requests and repeated requests.
7. Layout-shift records and large element movement.
8. Duplicate IDs.
9. Duplicate or competing roots for sidebar, page shell, floor map, modal, toast, and page-specific workspace.
10. iframe inventory.
11. horizontal overflow and clipped content.
12. elements rendered under the sidebar.
13. rapid-click behavior on safe non-destructive controls.
14. sidebar expanded/collapsed persistence across refresh and navigation.
15. route-to-route back/forward behavior.

Required viewports:

- 1920x1080
- 1536x960
- 1366x768
- 1024x768
- 834x1194
- 768x1024
- 430x932
- 390x844
- 360x800

Required runtime profiles:

- normal desktop
- 4x CPU slowdown
- slow network
- fresh storage
- persisted storage
- sidebar expanded
- sidebar collapsed

The audit must create machine-readable JSON plus an HTML summary report under `pmd-qa-results/admin-runtime-stabilization/`.

### Phase 2 — Route and feature ownership map

Generate a report that maps each route to:

- controller
- Blade/PHP view
- global layout
- static assets
- inline scripts
- dynamically injected assets
- timers
- MutationObservers
- iframes
- API endpoints
- DOM roots modified
- final visible authority
- legacy dependencies still required by the final result

Do not remove any file in this phase.

### Phase 3 — Anti-flicker readiness gate

After Phase 1 evidence exists, implement a small global readiness coordinator with these constraints:

- It must load before visible admin content paints.
- It may hide only the main admin content area, never the login page.
- It must show a lightweight skeleton, not a blank white page.
- It must reveal on explicit page-ready signal or a safe timeout.
- It must never block form submission, navigation, modal operation, or accessibility.
- It must not use a permanent MutationObserver over the entire document.
- It must log timeout cases to the console and QA report.
- It must support route-specific readiness registration.
- It is a visual containment layer, not a substitute for cleanup.

### Phase 4 — One authority per route

Consolidate one route at a time in this order:

1. Reservations
2. Dashboard waiter new
3. Orders
4. Tables
5. Menus
6. Mealtimes
7. Locations
8. Coupons
9. Themes
10. Settings and child pages
11. Dashboard2
12. Dashboard

For each route:

- identify the final desired UI
- identify all competing scripts and styles
- preserve required functionality before disabling a legacy authority
- replace shared functionality explicitly instead of relying on hidden legacy side effects
- disable legacy runtime inclusion before deleting files
- keep rollback notes
- rerun the full route matrix

No route is complete until the audit proves:

- one visible page root
- one sidebar authority
- one page-specific workspace authority
- no multi-version flashes
- no duplicate click execution
- no hidden iframes unless intentionally required
- no horizontal overflow at target viewports
- no content under the sidebar
- no new console errors
- no destructive business-data mutation

## Sidebar requirements

The sidebar work is styling and shell behavior only. Do not change destination URLs, permissions, menu availability, or business actions.

Required behavior:

- exactly one sidebar DOM authority
- logo displayed at the top from the canonical project asset
- collapsed and expanded states
- persisted state across refresh and navigation
- no jumping, blinking, duplicate sidebar, or delayed replacement
- page content resizes with the sidebar instead of hiding underneath it
- keyboard-accessible toggle
- mobile drawer behavior with backdrop and close action
- no route-specific sidebar implementations
- no global `.btn`, `.card`, `.modal`, `input`, or similar overrides

## Reservations requirement

Do not clone, iframe, or scrape another dashboard floor map.

Build one native Reservations floor module with a documented data source. It must:

- render all configured tables
- use the existing PMD status colors
- support reservation-safe table selection
- show reservations assigned to the selected table
- allow opening the existing create-reservation flow with the selected table prefilled where supported
- never navigate to waiter ordering or POS
- remain synchronized with the canonical table layout data
- support all target viewports
- contain one renderer and one event authority

## Performance and interaction acceptance targets

- No visible old UI before final UI.
- No more than one full page workspace mount per navigation.
- No duplicate same-purpose API request caused by competing page versions.
- No safe button action triggered more than once by one click.
- Rapid-click test must not create duplicate navigation, modal, request, or submission.
- Main layout stable within 2.5 seconds on normal profile and 5 seconds on slow profile, excluding genuinely slow backend responses.
- No target route should have unexplained iframes.
- Existing 404 asset errors must be inventoried and either corrected or explicitly suppressed only when the dependency is truly unused.

## Safety rules

- Work only on a branch.
- No direct production edits.
- No database schema changes.
- No payment-flow modifications.
- No destructive reservations/orders/coupons/settings actions during QA.
- Never delete legacy files merely because their names look old.
- First remove runtime inclusion, prove parity, then handle dead-code deletion in a separate cleanup PR.
- Every PR must include rollback instructions.

## Expected pull requests

1. `qa: instrument admin runtime and visual audit`
2. `feat: add admin readiness coordinator`
3. `fix: consolidate reservations runtime and native floor`
4. `fix: consolidate global admin sidebar authority`
5. Subsequent route-specific consolidation PRs
6. Final dead-code cleanup PR only after all route audits pass

## Completion evidence

Each PR must include:

- changed files
- commands run
- before/after screenshots
- trace or video links/artifacts
- console/network comparison
- route matrix results
- rollback steps
- known remaining risks

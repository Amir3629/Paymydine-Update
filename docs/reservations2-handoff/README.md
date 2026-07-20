# PayMyDine Reservations2 — Master Handoff

## Document purpose

This document is the canonical handoff for the PayMyDine Reservations2 redesign and the shared Admin Side Menu 2 work.

It exists because the implementation evolved through many live VPS patches, browser-console experiments, backups, partial rollbacks, and GitHub commits.

A new engineer or a new ChatGPT conversation must read this document before changing Reservations2, the Admin header, the shared Side Menu 2, mobile navigation, page spacing, logos, icons, or the page background.

This handoff intentionally records both successful decisions and failed approaches.

The failed approaches matter because many of them created duplicate CSS or JavaScript authorities that later caused blinking, overlap, hidden logos, broken hamburger behavior, or state-dependent layout failures.

Do not assume that the latest-looking block in a Blade file is the only active authority.

Do not assume that the live VPS and the GitHub branch are identical.

Do not assume that a successful console experiment is already committed.

Do not assume that a backup filename alone identifies the correct rollback point.

Always inspect the file contents and runtime state first.

---

## Repository and environment

Repository:

`Amir3629/Paymydine-Update`

Primary working branch used throughout this project:

`stabilization/admin-runtime-audit`

Repository checkout on the VPS:

`/var/www/paymydine/frontend/Paymydine-Update`

Live Laravel application root:

`/var/www/paymydine`

Live Admin asset and view roots:

`/var/www/paymydine/app/admin/assets`

`/var/www/paymydine/app/admin/views`

Primary test route:

`https://mimoza.paymydine.com/admin/reservations2`

The Mimoza tenant is the only tenant that should be used for this QA and redesign work.

Do not put login credentials in this public repository.

Obtain credentials from the project owner when required.

---

## Important truth hierarchy

When facts disagree, use this priority order.

1. The browser DOM and computed styles on the live Reservations2 page.
2. The exact files currently served by the web server.
3. The live files under `/var/www/paymydine/app/admin/...`.
4. The checked-out repository files on the VPS.
5. The remote GitHub branch.
6. Old console output, screenshots, backup names, and chat descriptions.

The live server has repeatedly received direct file copies and scripted patches.

Some of those changes were not committed immediately.

Therefore, remote GitHub can lag behind the live VPS.

Before any new change, compare hashes and markers across repository, live files, and served assets.

---

## Current GitHub snapshot warning

At the time this handoff was created, the branch snapshot still contained older architecture in several places.

The shared style partial still contained a legacy critical logo block using `#pmd-side-menu2-logo` and a cropped background image approach.

The shared style partial also contained an inline mobile navigation implementation named `PMDR2MobileNavV2`.

The canonical menu markup still used a single legacy logo span rather than the later full-logo and mark-logo pair.

The exact-layout JavaScript still measured Side Menu geometry and repeatedly reapplied shell offsets at multiple timeouts.

Those details are documented as repository facts, not as the desired final design.

The live VPS may contain a later manually patched state.

Do not overwrite the live state from GitHub until the live files have been audited and intentionally synchronized.

---

## Main files involved

### Shared Side Menu visual authority

`app/admin/views/_partials/pmd_side_menu2_single_style.blade.php`

This file was intended to become the single visual authority for Side Menu 2.

It also accumulated Reservations2 critical prepaint rules, responsive rules, background fixes, mobile navigation experiments, shell spacing rules, and several later brand authorities.

Because it accumulated too many concerns, it became a major source of conflicts.

The long-term direction is to separate concerns while retaining one authority per concern.

### Shared Side Menu markup

`app/admin/views/_partials/pmd_side_menu2_single_menu.blade.php`

This file is the canonical menu markup included by supported Admin pages.

It contains Dashboard, Orders, Reservations, Coupons & Gifts, Restaurant, Kitchen Display, Design, System, and Tools navigation.

It uses Tabler-style inline SVG outline icons.

It contains dropdown groups and submenu links.

It has also contained multiple generations of brand markup, logo rendering rules, runtime hover behavior, mobile drawer code, and geometry patches.

### Global Side Menu behavior

`app/admin/assets/js/pmd-side-menu2-v1.js`

This file owns global expanded or collapsed state.

The local-storage key is `pmd.sideMenu2.state`.

The dropdown-state key is `pmd.sideMenu2.openDropdown`.

The public runtime object is `window.PMDSideMenu2GlobalV3`.

The global script adds `pmd-sm2-expanded` or `pmd-sm2-collapsed` to the HTML element.

It dispatches the custom event `pmd:side-menu2-state`.

It uses capture-phase click handling because legacy Admin scripts can stop bubbling events.

Dropdown state is cleared before real navigation so an open submenu does not follow the user to another page.

### Reservations2 page behavior

`app/admin/assets/js/pmd-reservations2-v1.js`

This file normalizes reservation records.

It renders the reservation cards.

It filters and paginates the reservation list.

It calculates KPI values.

It creates the table floor mock-up.

It originally removed the legacy Admin topbar and built a new clean header dynamically.

It created the reliable bell SVG.

It removed the Dashboard 2 quick button.

It removed the old Reservations hero.

The public runtime objects seen during development included `window.PMDReservations2V1` and `window.PMDReservations2CleanHeaderV3`.

### Reservations2 exact layout behavior

`app/admin/assets/js/pmd-reservations2-exact-layout-v1.js`

This file was created to enforce exact gaps and top offsets.

The desired responsibility is internal page spacing only.

The undesired responsibility is measuring the Side Menu and taking ownership of the global Admin shell geometry.

A historical version repeatedly ran at 0, 50, 150, 350, and 700 milliseconds and again after page load.

That repeated measurement pattern contributed to visible blinking and jumping.

The file must not compete with shared Side Menu shell CSS.

### Reservations2 Blade page

The exact Blade path must be confirmed on the live server because previous code search did not reliably expose it from the branch index.

The page root is expected to be `#pmd-reservations2`.

The page contains the clean header, KPI section, reservation-list panel, and floor panel either directly or after JavaScript enhancement.

### Brand assets

The later intended assets were:

`app/admin/assets/images/pmd-brand-full.svg`

`app/admin/assets/images/pmd-brand-mark.svg`

The full asset is the horizontal “Pay My Dine” brand.

The mark asset is the compact PMD symbol.

Both assets must be rendered uncropped with `background-size: contain` or a visible image element.

Do not restore the older cropped logo technique unless explicitly requested.

---

## Product goal

Reservations2 should feel like a polished, modern restaurant operations workspace.

It should use the same spacing language, border language, icon language, and background treatment as the rest of the redesigned PayMyDine Admin platform.

The page must be usable on desktop, tablet, and mobile.

The desktop Side Menu must resize the available page width rather than overlap content.

The mobile Side Menu must behave as an overlay drawer and must not shift the page.

The first paint must already resemble the final layout.

The page must not flash the old header, old background, old logo, or old Side Menu state during refresh.

---

## Visual design contract

### Main background

The required Admin background for Reservations2 is:

`#f8fbfd`

Earlier experiments used `#f6f6ef` and exposed cream or gray layers such as `#e9e9e4` behind the page.

Those colors were rejected for this page.

The final background must cover HTML, body, outer wrappers, content wrappers, and the Reservations2 root.

No cream strip should appear above the header.

No gray strip should appear behind the Side Menu.

No different color should appear when zooming out.

No delayed JavaScript should be needed to correct the background after first paint.

The background must be set by server-rendered critical CSS.

### Shared gap system

Desktop spacing target:

`14px`

Mobile spacing target:

`10px`

The desktop rule means:

Viewport edge to Side Menu equals 14px.

Side Menu to page content equals 14px.

Page content to right viewport edge equals 14px.

Header to KPI section equals 14px.

KPI card to KPI card equals 14px.

KPI section to workspace equals 14px.

Reservation panel to floor panel equals 14px.

Nested controls may use smaller local gaps such as 6px, 8px, or 10px.

The shared shell rule must not be implemented by repeated JavaScript measurement.

### Borders

Cards and icon buttons use a light blue-gray border.

A common working value was:

`#c9e0ef`

Cards use rounded corners, generally 14px.

Header buttons commonly use 11px corners.

The Side Menu uses a larger continuous rounded shell.

Borders must remain visually consistent across plus, back, hamburger, notification, clear-search, next-page, and refresh controls.

### Shadows

Use restrained shadows.

Do not add heavy floating shadows to every card.

The Side Menu may use a subtle external shadow.

The mobile backdrop may use blur, but the page itself must not move.

### Typography

The Admin currently loads Roboto globally.

Page titles, panel titles, KPI labels, reservation metadata, and Side Menu labels must remain legible at all responsive sizes.

Do not allow long ISO timestamps to force horizontal page overflow.

---

## Reservations2 desktop structure

The page root is `#pmd-reservations2`.

The preferred desktop order is:

1. Clean header.
2. Four KPI cards.
3. Two-column workspace.
4. Reservation list on the left.
5. Restaurant floor on the right.

The header is not a large hero card.

The old duplicated Reservations hero must remain removed.

The page should not be wrapped in a visually different giant card.

Individual cards and panels sit directly on the `#f8fbfd` page background.

The reservation-list panel has a fixed or bounded practical width.

The floor panel flexes to use the remaining width.

When the Side Menu expands, both panels become narrower as part of the available page width.

The Side Menu must never cover the reservation panel.

The Side Menu must never cover the header title.

The Side Menu must never cover KPI cards.

---

## Clean header specification

The clean header replaced the legacy Admin header on Reservations2.

The old header must not flash for a fraction of a second during refresh.

The old header should be suppressed by critical server-rendered CSS before JavaScript executes.

The header desktop structure is:

Leading area on the left.

Action area on the right.

The leading area contains the back button and page title.

The action area contains the create button and notification button.

The mobile hamburger is shown only at mobile widths.

### Back button

The back button appears before the page title on desktop.

On mobile it appears at the far left of the header.

It is a framed square icon button.

It must have a Tabler-style chevron-left icon.

It must not use the browser history blindly when a stable Admin destination is required.

The exact navigation behavior should be confirmed before changing it.

### Desktop page title

The title is “Reservations”.

It remains visible on desktop.

It uses a single line and ellipsis if necessary.

It must not collide with the action area.

### Mobile page title

The later accepted mobile direction was to hide the page title.

The mobile leading order should be:

Back button.

Hamburger button.

The right side should contain:

Create button.

Notification button.

This preserves four balanced controls in one row.

### Create button

The create button links to the new reservation route.

It is a framed square icon button.

The icon should come from the same Tabler outline language as the rest of the header.

Do not use a mismatched Font Awesome plus if the page has migrated to Tabler icons.

### Notification button

The notification control must have exactly one visible frame.

The list-item wrapper must not add a second border.

The tooltip wrapper must not add a second border.

The anchor itself is the framed button.

The bell must be centered both horizontally and vertically.

The Bootstrap dropdown caret must be removed.

The notification badge remains visible near the top-right corner.

The badge must not force the bell away from center.

The dropdown panel must remain functional.

### Header dimensions

A common desktop target was 42px square action buttons.

A common mobile target was 40px square action buttons.

Very narrow widths may use 36px controls if necessary.

The header itself should not introduce a large empty top gap.

The top spacing must equal the page gap rule rather than an inherited legacy navbar height.

---

## KPI card specification

The page has four KPI cards.

They are:

Today Reservations.

Guests Today.

Pending / Active.

Assigned Tables.

Each card contains a label, a large value, and a small icon frame.

The icons should use the same outline language as the header and Side Menu.

The KPI section uses the shared 14px desktop gap.

### Desktop KPI behavior

All four cards appear in one row.

They share available width.

They must not be hidden under the expanded Side Menu.

They must not extend beyond the right viewport gap.

### Mobile KPI behavior

The four cards must remain in one horizontal rail.

They must not stack into four full-width vertical rows.

Horizontal scrolling is acceptable and was explicitly requested.

Each card should have a stable mobile width.

Scroll snapping is acceptable.

The horizontal rail must not cause the entire page to overflow.

Only the KPI rail should scroll horizontally.

---

## Reservation-list panel

The panel title is “Reservations”.

The subtitle displays the number of reservations.

The search input searches guest, table, status, date, time, and reservation ID.

The clear button is a framed square control.

Reservation cards show guest name, status, ID, guests, table, time, and date.

Long date strings must wrap or truncate within the card.

The reservation status badge uses the light green treatment.

The panel includes pagination dots and a next button.

The next button is a framed square control.

On mobile, the list panel appears before the floor panel.

The list panel must fit the viewport with the mobile page gap on both sides.

---

## Restaurant floor panel

The panel title is “Restaurant Floor”.

The subtitle is “Select a table to view or create reservations”.

The panel includes a Refresh control.

The floor canvas contains positioned table controls.

The legend shows Free, Reserved, Occupied, and Needs cleaning.

On desktop, the floor panel uses the remaining workspace width.

On mobile, it becomes a full-width panel below the reservation list.

The table mock-up may require horizontal or internal overflow handling at narrow widths.

The page itself must not become wider than the viewport.

---

## Desktop Side Menu specification

### Widths

The stable collapsed width observed in audits was approximately 72px.

The stable expanded width observed in audits was approximately 184px.

Treat those as current design targets unless a new platform-wide token replaces them.

### Shell position

The Side Menu is fixed on desktop.

It sits 14px from the left viewport edge.

It uses the same top and bottom inset language.

It has a continuous dark green shell with rounded corners.

### Colors

The shell uses a very dark green gradient or solid dark-green treatment.

Navigation icons and labels use a light near-white green.

The active item uses a warm cream background.

The active icon and label use dark green.

### Menu items

Primary entries include:

Dashboard.

Orders.

Reservations.

Coupons & Gifts.

Restaurant.

Kitchen Display.

Design.

System.

Tools.

Restaurant, Design, System, and Tools may contain submenus.

### Expanded state

The expanded state shows icons and labels.

Submenu labels are readable.

The full Pay My Dine logo is visible.

A compact collapse control appears in the brand row.

The navigation must begin close enough to the brand row that no giant empty gap appears.

### Collapsed state

The collapsed state shows centered icons only.

Labels are hidden.

The PMD mark is visible and centered.

The full horizontal logo must not remain behind the mark.

Each active icon frame must be centered within the Side Menu.

The compact logo must be centered to the same visual axis as the navigation icons.

### ChatGPT-inspired brand behavior

The design request was inspired by ChatGPT’s Side Menu interaction.

Expanded state:

Show the full Pay My Dine logo.

Show a small Side Menu collapse control to its right.

Collapsed state:

Show the PMD mark.

When the user hovers over the mark, the mark should visually become an expand-menu icon.

The same hit target should handle the click.

Do not show a separate ugly floating button on top of the mark.

Do not rely on a browser tooltip as the primary visual affordance.

The click must actually toggle the global Side Menu state.

### Logo assets

Use the uncropped assets:

`pmd-brand-full.svg`

`pmd-brand-mark.svg`

Do not use the old `paymydine-logo.svg` crop offsets as the final implementation.

Do not hide all child elements of `.pmd-sm2__brand` with a broad selector.

That old selector repeatedly hid new logo and toggle markup.

---

## Mobile Side Menu specification

The mobile menu is not the desktop collapsed state.

Desktop local-storage state must not determine whether mobile labels are visible.

At widths of 820px or less, the desktop fixed Side Menu is removed from normal desktop layout.

The header hamburger opens a mobile overlay drawer.

The drawer slides smoothly from the left.

The drawer covers roughly 75% to 80% of the viewport, but should be narrower than the earlier oversized implementation.

A practical width token should use `min()` and a maximum width.

The remaining portion of the page is covered by a translucent blurred backdrop.

The page behind the drawer does not shift horizontally.

The page behind the drawer does not resize.

Body scrolling is locked while the drawer is open.

Clicking the backdrop closes the drawer.

Pressing Escape closes the drawer.

Selecting a real navigation link closes the drawer before navigation.

The drawer always shows labels and icons.

The drawer always shows the full Pay My Dine logo.

The drawer does not show the desktop expand or collapse control.

The drawer preserves the Side Menu’s dark-green shell and rounded shape.

The drawer’s active item uses the same cream treatment.

The drawer submenus remain usable.

The mobile drawer must not clone stale desktop state in a way that removes labels.

The mobile drawer must not be replaced by an inline two-column website menu unless the product owner explicitly changes the requirement again.

The later accepted requirement was an overlay drawer.

---

## Icon system

The project chose Tabler Icons as the consistent outline icon language.

The user downloaded the Tabler archive locally, but the implementation used inline SVG paths rather than requiring the entire package.

Use one consistent stroke width.

Use round caps and joins.

Do not mix Font Awesome, Unicode symbols, and Tabler outlines in the same header or Side Menu.

Header icons and Side Menu icons are the highest-priority migration area.

KPI icons should also follow the same language where practical.

Do not use a literal square glyph as the notification icon.

Do not leave a missing icon inside a visible frame.

---

## First-paint and blinking requirements

The page repeatedly suffered from flash-of-unstyled-content and flash-of-old-layout problems.

Observed symptoms included:

Old header visible for approximately 0.2 seconds.

Cream background visible before changing to `#f8fbfd`.

Wrong Side Menu width visible before saved state applied.

Full logo and mark both visible during refresh.

Page content jumping after delayed layout scripts.

Page spacing breaking after toggling the Side Menu multiple times.

Logo blinking during refresh.

The final architecture must prevent these issues rather than hide them with more delayed corrections.

### Required prevention strategy

Render or prepaint the saved Side Menu state before normal CSS paint.

Use a small critical style block in the page head.

Make server-rendered markup match the intended final DOM.

Avoid building the entire header after DOMContentLoaded.

Avoid running the same geometry function at many timeouts.

Avoid MutationObservers that respond to their own style changes.

Avoid multiple scripts toggling the same HTML state classes.

Do not animate initial page load.

Enable transitions only after the first stable paint.

Animate only user-triggered expand or collapse actions.

---

## One-authority rule

Every UI concern must have exactly one owner.

Suggested ownership:

Global Side Menu state and dropdown behavior:

`pmd-side-menu2-v1.js`

Global Side Menu shell dimensions, colors, item layout, and brand rendering:

Shared Side Menu stylesheet or a dedicated Side Menu stylesheet.

Reservations2 header markup and page-specific styling:

Reservations2 Blade plus page-specific stylesheet.

Reservations2 internal card and panel gaps:

Reservations2 stylesheet.

Mobile overlay drawer behavior:

One dedicated script shared by Side Menu and header.

Background prepaint:

One server-rendered critical style block.

Do not let the exact-layout JavaScript own Side Menu shell width.

Do not let the Side Menu partial own reservation-card rendering.

Do not let multiple Blade partials inject repeated runtime scripts.

---

## Historical successful milestones

The following milestones were observed during the work.

Reservations2 became the canonical Side Menu implementation reference.

Shared Side Menu style and markup partials were created.

The literal Side Menu aside was reduced to one canonical markup source.

Global internal Side Menu behavior was removed so the shared partial could remain authoritative.

A MutationObserver recursion issue was fixed.

A Blade escaping HTTP 500 issue was fixed.

A Reservations2 refresh animation problem was isolated and corrected temporarily.

Dropdown state was reset on navigation.

Responsive audit V3 completed 15 tests with no test crashes.

The audit identified the only remaining breakpoint inconsistency around 816 and 817 CSS pixels.

The background was changed from `#f6f6ef` to `#f8fbfd`.

The Dashboard 2 quick button was removed from Reservations2.

The notification caret was removed.

A reliable bell SVG was installed.

Tabler-style Side Menu icons were introduced.

The mobile hamburger eventually opened a drawer successfully.

The mobile drawer eventually displayed labels after initially showing icons only.

The full Pay My Dine logo eventually rendered successfully after visibility conflicts were identified.

The collapsed PMD mark eventually rendered successfully.

A ChatGPT-inspired logo and Side Menu control concept was accepted visually.

The remaining instability came mainly from stacking later geometry and brand authorities.

---

## Historical failed approaches

### Dynamic header replacement without sufficient prepaint

Removing the old header in JavaScript caused it to flash before the new header existed.

### Background correction only in JavaScript

This allowed cream or gray layers to appear before the script executed.

### Multiple brand authorities

V2 through V9 style and runtime blocks accumulated and overrode one another.

Broad selectors hid every brand child except the legacy logo.

Pseudo-elements, image elements, and background-image renderers competed.

### Cropped logo authority

The old logo used oversized background dimensions and negative positioning.

It did not meet the later requirement to render complete uncropped SVG files.

### Mobile inline menu V2

An inline menu script used `stopImmediatePropagation` and captured the hamburger click.

It conflicted with the later drawer implementation.

### Drawer tied to desktop collapsed state

The mobile drawer inherited icons-only desktop state.

Labels disappeared even though mobile required full labels.

### Geometry V10 through V16 stacking

Multiple rules measured menu width, changed root margin, changed page width, changed wrappers, and retriggered on class mutations.

The result included overlap, zero gap, double offsets, and repeated blinking.

### Exact-layout script owning the shell

The exact-layout script changed `.page-wrapper`, `.page-content`, and page-root geometry.

This competed with global Admin shell rules.

### Repeated delayed apply calls

Repeated application after 0, 50, 150, 350, 700 milliseconds and load events visibly moved the page.

### Assuming “Ready” means visually correct

Runtime objects reported Ready even while the logo was invisible, the button was hidden, or the page overlapped the Side Menu.

Always inspect geometry and computed styles.

---

## Known unrelated console noise

The Reservations2 page repeatedly logged missing vendor assets.

Examples included:

`dropzone.min.css`

`dropzone.min.js`

`bootstrap-treeview.min.css`

`bootstrap-treeview.min.js`

`Sortable.min.js`

`selectonic.min.js`

`moment.min.js`

`daterangepicker.css`

`daterangepicker.js`

`jquery-sortable.js`

`tempusdominus-bootstrap-4.min.js`

`jquery-clockpicker.min.js`

The browser also logged `ReferenceError: Can't find variable: Dropzone` and `ReferenceError: Can't find variable: moment`.

These errors are not the direct cause of every Side Menu problem.

However, they can stop unrelated initialization and complicate debugging.

They should be tracked separately and eventually fixed.

Do not attribute a layout regression to these errors without evidence.

---

## Deployment pattern used on the VPS

Typical sequence:

```bash
cd /var/www/paymydine/frontend/Paymydine-Update

git fetch origin
git checkout stabilization/admin-runtime-audit
git pull origin stabilization/admin-runtime-audit

sudo cp \
app/admin/views/_partials/pmd_side_menu2_single_style.blade.php \
/var/www/paymydine/app/admin/views/_partials/pmd_side_menu2_single_style.blade.php

sudo cp \
app/admin/views/_partials/pmd_side_menu2_single_menu.blade.php \
/var/www/paymydine/app/admin/views/_partials/pmd_side_menu2_single_menu.blade.php

sudo chown www-data:www-data \
/var/www/paymydine/app/admin/views/_partials/pmd_side_menu2_single_style.blade.php \
/var/www/paymydine/app/admin/views/_partials/pmd_side_menu2_single_menu.blade.php

cd /var/www/paymydine
php artisan view:clear
```

For JavaScript assets, copy the specific asset and set ownership.

Use `php artisan optimize:clear` only when necessary and understand permission warnings.

A failed application-cache clear does not necessarily mean the Blade view clear failed.

Always verify the file actually served by Nginx with `curl` and a cache-busting query parameter.

---

## Required pre-change audit

Before editing anything, collect:

Current Git branch.

Current Git status.

Current repository file hashes.

Current live file hashes.

Current served asset hashes or identifying markers.

Current HTML classes.

Current local-storage Side Menu state.

Current Side Menu and page bounding rectangles.

Current brand-element computed styles.

Current mobile drawer state.

Current runtime authority objects.

Current duplicate marker counts.

Current screenshot at desktop expanded.

Current screenshot at desktop collapsed.

Current screenshot at 477px mobile closed.

Current screenshot at 477px mobile open.

Do not patch before collecting this baseline.

---

## Minimum desktop acceptance tests

Refresh in collapsed state.

No old header flash.

No wrong background flash.

Only the PMD mark is visible.

The mark is centered.

Navigation icons are centered.

Page begins 14px after the Side Menu.

Page ends 14px before the right viewport edge.

Open and close the Side Menu ten times.

The gap remains correct after every toggle.

The page never overlaps the Side Menu.

The page width changes smoothly only during user interaction.

Expanded state shows the full logo and labels.

Expanded state shows a working collapse control.

No giant gap appears below the brand row.

Submenus open and close correctly.

Navigation clears open submenu state.

Notification dropdown still opens.

Create button still navigates.

Back button still navigates.

No horizontal page scrollbar appears.

---

## Minimum mobile acceptance tests

Test at 320px, 375px, 390px, 430px, 467px, 618px, 760px, 820px, and 821px.

At 820px and below, desktop Side Menu shell does not reserve page width.

The header contains back, hamburger, create, and notification controls.

The mobile page title is hidden if following the latest accepted design.

All controls are centered inside their frames.

The badge does not distort the notification frame.

The KPI section remains one horizontal rail.

The reservation panel fits the viewport.

The floor panel appears below the reservation panel.

Opening the hamburger displays the drawer.

The drawer is narrower than the earlier oversized version.

The full logo is visible.

All labels are visible regardless of saved desktop state.

The drawer does not show the desktop collapse control.

The background page does not shift.

The background page is blurred or dimmed smoothly.

Backdrop click closes the drawer.

Escape closes the drawer.

Navigation closes the drawer.

Closing the drawer restores body scrolling.

No permanent horizontal scrollbar remains.

---

## New-page creation rules learned from Reservations2

New Admin pages should not copy the final DOM from another page by JavaScript after load.

Create server-rendered page markup.

Include the canonical Side Menu partial exactly once.

Include the canonical Side Menu stylesheet exactly once.

Define page-specific tokens in the page stylesheet.

Use `#f8fbfd` for redesigned light Admin page backgrounds unless a different approved theme exists.

Use the 14px desktop and 10px mobile gap system.

Use Tabler outline icons.

Create the header in Blade rather than replacing the old header after paint.

Suppress legacy header markup before first paint.

Do not add page-specific shell geometry JavaScript.

Do not add many delayed `setTimeout` corrections.

Do not create a new global MutationObserver without proving it cannot react to itself.

Do not duplicate IDs across cloned mobile menus.

Do not copy notification markup without preserving dropdown behavior.

Do not add hidden quick buttons for debugging to production markup.

Do not place all page sections inside a giant visually separate card unless the design explicitly requires it.

---

## Recommended stabilization plan

Phase 1: Freeze and audit.

Do not add V20 or another emergency authority before auditing current live files.

Phase 2: Sync truth.

Commit the exact live files to a dedicated checkpoint branch.

Phase 3: Remove duplicate authorities.

Keep one brand implementation, one drawer implementation, one shell implementation, and one header implementation.

Phase 4: Move markup server-side.

Render the clean header and logo structure in Blade.

Phase 5: Make shell geometry pure CSS.

Use HTML state classes and CSS custom properties.

Phase 6: Restrict JavaScript.

JavaScript toggles state and accessibility attributes only.

Phase 7: Fix mobile drawer independently.

The drawer must ignore desktop collapsed presentation.

Phase 8: Run matrix tests.

Test desktop states, mobile widths, refresh, repeated toggles, dropdowns, and navigation.

Phase 9: Commit and deploy.

Use one descriptive commit and a reproducible deployment script.

Phase 10: Remove obsolete backups only after stable production verification.

---

## Do-not-do list

Do not create another numbered authority block without removing its predecessor.

Do not patch only the repository when the live file differs.

Do not patch only the live file without committing the result.

Do not use broad selectors that hide every brand child.

Do not use pseudo-elements and image elements for the same logo at the same time.

Do not let mobile inherit icons-only desktop presentation.

Do not measure Side Menu width on many timers.

Do not add a transition before initial state is known.

Do not shift the page when the mobile drawer opens.

Do not remove the notification root without preserving its event behavior.

Do not expose credentials in documentation.

Do not treat console “Ready” output as a visual pass.

Do not perform a blind rollback based only on a backup timestamp.

Do not overwrite a working live state from an older GitHub branch without comparing files.

---

## Final handoff summary

Reservations2 is a modern Admin workspace with a clean header, four KPI cards, reservation-list panel, floor panel, shared Side Menu, and responsive mobile drawer.

The accepted visual language is a `#f8fbfd` background, 14px desktop gaps, 10px mobile gaps, light blue borders, rounded cards, dark-green Side Menu, cream active item, and Tabler outline icons.

The desktop Side Menu has approximately 72px collapsed and 184px expanded widths.

The desktop page must resize beside it with a constant 14px gap.

The mobile page uses an overlay drawer with full labels, full logo, blurred backdrop, and no page shift.

The full logo and compact mark must never render simultaneously.

The old header, old background, and wrong Side Menu state must never flash on refresh.

The largest engineering lesson is to stop layering emergency authorities.

The next implementation must consolidate the system into one owner per concern and verify the live VPS before making any change.

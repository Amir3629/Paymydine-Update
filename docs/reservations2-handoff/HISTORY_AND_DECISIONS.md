# Reservations2 History and Decision Log

## Purpose

This document records how Reservations2 and Side Menu 2 evolved.

It is not a recommendation to restore every historical version.

It exists so a new engineer understands why certain selectors, runtime objects, backup names, and numbered authority blocks may still exist.

The chronology is reconstructed from deployment logs, browser-console output, screenshots, and GitHub activity shared during the project.

Some changes were committed.

Some changes were only patched on the VPS.

Some changes were only tested in the browser console.

Treat each item according to its stated confidence.

---

## Initial architecture direction

Reservations2 was selected as the clean reference implementation for the redesigned Admin Side Menu.

The goal was to stop maintaining separate copies of the same Side Menu markup and style on multiple Admin pages.

Two canonical partials were established:

`app/admin/views/_partials/pmd_side_menu2_single_style.blade.php`

`app/admin/views/_partials/pmd_side_menu2_single_menu.blade.php`

The menu markup was reduced to one literal `aside` with ID `pmd-side-menu2`.

Global pages and Reservations2 were intended to include the same partials.

A verification reported that the global wrapper had no internal menu authority.

A commit observed in the project history was:

`626fe907 Remove all global internal Side Menu behavior`

The exact remote availability of this commit should be verified before using it as a rollback anchor.

---

## Early reliability fixes

An infinite MutationObserver recursion issue was fixed.

A Blade escaping issue that caused HTTP 500 was fixed.

A refresh animation issue was isolated to Reservations2 and temporarily corrected.

Dropdown reset after navigation was implemented.

The global Side Menu JavaScript later included an explicit navigation reset block.

The Side Menu global runtime became `PMDSideMenu2GlobalV3`.

The state key was `pmd.sideMenu2.state`.

The dropdown key was `pmd.sideMenu2.openDropdown`.

---

## Responsive audit phase

An initial responsive audit script failed because it defined one variable name and returned another.

The script defined `mobileButtonVisible` but returned `mobileMenuButtonVisible`.

That caused every test to crash.

Responsive Audit V3 corrected the mismatch.

V3 completed 15 of 15 requested tests.

It reported zero failed tests.

It reported two problem widths.

The actual reported widths were 816px and 817px.

The warnings were:

Side Menu still visible at 820px or below.

Mobile menu button missing at 820px or below.

The responsive strategy discussed at that stage was:

1100px and wider:

Expanded or collapsible desktop menu.

821px through 1099px:

Collapsed rail around 72px.

820px and below:

Side Menu hidden from desktop layout and hamburger shown.

The exact medium-width policy still requires platform-wide confirmation.

---

## Background and header cleanup phase

The page originally exposed a cream background around the main content.

The user requested the main background become `#f8fbfd`.

Earlier code and runtime diagnostics still reported `#f6f6ef`.

The page had multiple nested wrappers with inconsistent backgrounds.

At zoomed-out widths, the old cream or gray background remained visible around the page.

The fix direction became:

Apply `#f8fbfd` to HTML, body, wrappers, and the Reservations2 root before first paint.

Remove top and side gaps inherited from the legacy Admin shell.

Do not wrap the whole Reservations2 page in a visually separate giant card.

A debug quick button was removed:

`#pmd-dashboard2-quick-btn`

The old duplicated Reservations hero was removed.

The legacy topbar was removed or hidden.

The clean header runtime reported:

`PMDReservations2CleanHeaderV3`

The desired clean header included:

Reservations title.

Create button.

Notification button.

Later, a back button.

Later, a mobile hamburger.

---

## Notification control phase

The notification control initially displayed a missing icon or square placeholder.

The dropdown caret was visible and was rejected.

The notification control had an incorrect border shape because wrappers and anchor styles overlapped.

A reliable inline bell SVG replaced the old icon.

The dropdown arrow pseudo-element was hidden.

The design target became one square frame owned by the clickable notification anchor.

The notification badge remained visible near the top-right.

The bell needed to remain centered independently of the badge.

---

## Tabler icon phase

The user requested a consistent icon package for the entire platform.

Tabler Icons was selected.

The immediate scope was Side Menu icons and header icons.

The Side Menu markup was updated to use Tabler-style inline SVG outline paths.

The user had downloaded a Tabler archive locally.

The implementation did not need to ship the complete archive if inline SVG paths were used.

The main design reason was consistent stroke, scale, and visual weight.

---

## Header spacing phase

The user emphasized a global distance rule.

The same distance should exist:

Between viewport and Side Menu.

Between Side Menu and page.

Between cards.

Between header and KPI section.

Between KPI section and workspace.

The accepted desktop gap was 14px.

The accepted mobile gap was 10px.

The header had too much empty space above it.

Legacy navbar height and wrapper top padding were identified as likely contributors.

The user later confirmed that the top distance became good.

The remaining focus shifted to Side Menu and page geometry.

---

## Mobile header phase

A back button was requested before the title.

The hamburger was requested on mobile.

The title was later requested to be hidden on mobile.

The desired mobile order became:

Back.

Hamburger.

Create.

Notification.

The hamburger had several periods where it was visible but did not work.

At other times it blurred the page but did not show the drawer.

Listener conflicts and hidden Side Menu styles were major causes.

---

## Mobile KPI phase

The KPI cards initially stacked vertically on mobile.

This was rejected.

The user requested all four KPI cards remain in one row.

The accepted solution was a horizontal scroll rail.

The cards keep a fixed practical mobile width.

The rail scrolls horizontally.

The page itself does not scroll horizontally.

---

## First mobile menu implementation

An inline two-column mobile navigation was created below the header.

It used a panel named `pmd-r2-mobile-nav`.

It cloned the desktop navigation.

It used `stopImmediatePropagation` on the hamburger click.

The user later rejected the inline website-menu behavior.

The requirement changed to an overlay drawer.

The old inline listener later interfered with the drawer and needed removal.

---

## Mobile drawer requirement

The user requested a Side Menu that slides from the left.

It should cover roughly 80 percent of the screen.

The remaining background should become blurred smoothly.

The drawer should use the same rounded dark-green shell as desktop.

It should use the same buttons and icons.

It should use the same logo.

It should not show the desktop expand button.

The page behind it should not move.

The drawer eventually opened successfully.

At first it showed only icons.

The missing labels were caused by desktop collapsed-state styles continuing to apply.

A later patch restored labels.

The user later requested a somewhat narrower drawer.

---

## Brand asset upload phase

Two local SVG files were selected:

A full Pay My Dine horizontal logo.

A compact PMD mark.

They were uploaded to temporary VPS paths and installed as:

`pmd-brand-full.svg`

`pmd-brand-mark.svg`

The live server returned HTTP 200 for both SVG assets.

The browser could decode them.

A brand audit reported natural dimensions for both assets.

The full logo asset loaded successfully.

The mark asset loaded successfully.

Therefore, missing-logo problems were caused by CSS or DOM authority conflicts rather than missing files.

---

## Brand visibility conflict phase

An old critical logo block contained a broad selector that hid every brand child except `#pmd-side-menu2-logo`.

That selector repeatedly defeated later full-logo and mark-logo elements.

Several patches attempted to work around it using:

Image elements.

Pseudo-elements.

Background images.

Runtime inline styles.

Visibility overrides.

The browser audit eventually showed:

Brand assets had width and height.

The pseudo-element had the correct background image.

The asset URLs loaded.

But the parent still had hidden visibility in some states.

This confirmed the problem was conflicting CSS authority.

---

## Brand authority versions

The following numbered brand attempts were created during live work.

### V2 — Final Brand Render

Attempted to use background images rather than relying on image-element visibility.

### V3 — Brand Visibility Final

Forced visibility and opacity on Side Menu brand containers.

### V4 — Compact ChatGPT brand

Reduced brand-row height and full-logo width.

Added space for a Side Menu control.

### V5 — Side Menu Compact Final

Tried to formalize the compact brand structure.

Runtime inspection still reported the button or icon hidden in some states.

### V6 — CSS toggle icon

Tried to draw the Side Menu control entirely with CSS.

It still did not appear reliably because stronger display rules remained.

### V7 — Brand Single Authority

Removed several older brand blocks.

Replaced brand markup with full-logo, mark-logo, and toggle elements.

This was a major consolidation attempt.

The logo appeared again after this change.

### V8 — Brand Runtime Authority

Used runtime inline styles and a mask icon.

The runtime inspection still reported the button hidden in collapsed state.

### V9 — Brand Hover Authority

Implemented the accepted ChatGPT-inspired interaction.

Expanded menu showed full logo and a compact control.

Collapsed menu showed the PMD mark.

Hovering the mark was intended to reveal the expand icon in the same hit target.

A screenshot showed this visual direction working well.

V9 is an important historical visual checkpoint.

It is not sufficient alone because later page geometry still overlapped.

---

## Side Menu page-overlap phase

When the menu was collapsed, the page often looked correct.

When expanded, the Side Menu covered the Reservations title, KPI cards, or reservation panel.

A geometry audit reported:

Side Menu left 14px.

Side Menu right 198px.

Side Menu width 184px.

Page left 86px.

Overlap 112px.

Menu-to-page gap negative 112px.

This clearly proved that the page retained collapsed geometry while the Side Menu expanded.

The same audit reported icon centering differences because the audit selected the SVG rather than the intended icon frame.

The page-overlap result was valid.

---

## Geometry authority versions

### V10 — Shell Geometry

Attempted to enforce one 14px spacing system.

It applied shared custom properties and measured state.

It produced zero gap in one inspection because it duplicated an existing shell offset.

### V11 — Final Geometry

Removed V10 and attempted to use the global shell offset.

Expanded Side Menu still overlaid page content.

### Live V13 console experiment

A console script calculated page left from Side Menu right plus 14px.

It also centered collapsed icons and the mark.

The first run appeared visually better.

A later run in expanded state reported a negative gap because the page’s containing block origin differed from the viewport assumption.

This proved that simply assigning `margin-left` to the page root was not safe without understanding its containing block.

### V14 — Distance Rule

Attempted to account for the legacy shell’s internal origin.

Runtime inspection showed mismatched state and page positions.

### V15 — Distance Rule

Removed V14 and tried to eliminate repeated animation.

Refresh still blinked for up to roughly two seconds.

### V16 — Pure CSS Distance

Removed measurement retries and moved toward CSS geometry.

The page and logo still became unstable after repeated toggles because old brand and shell authorities remained.

### V17 — Clean Authority

Removed many old brand and geometry blocks.

The page became visually cleaner.

The logo disappeared because the remaining markup and style no longer matched.

### V18 — Brand Container Render

Restored logo rendering and reduced exact-layout ownership.

The Side Menu hover control and mobile behavior regressed.

### V19 — Brand Drawer Final

Replaced brand markup with full logo, mark, and toggle elements.

The user requested rollback because previously working desktop and mobile behavior had been broken.

---

## Exact-layout evolution

The exact-layout script originally owned both internal spacing and shell geometry.

It set wrapper positions.

It set content positions.

It set page margin-left.

It set page width.

It scheduled repeated applies.

It observed HTML class mutations.

This was too much authority.

A later V18 attempt rewrote the script to own internal spacing only.

That architectural direction is correct.

The implementation must be revalidated against the current live files.

---

## Accepted visual checkpoints

The user explicitly described several screenshots as very good or amazing.

The best accepted desktop visual direction included:

Dark-green rounded Side Menu.

Full Pay My Dine logo in expanded state.

Compact PMD mark in collapsed state.

Cream active Reservations item.

Tabler outline icons.

Readable labels.

ChatGPT-inspired brand control.

The best accepted mobile direction included:

Back and hamburger on the left.

Create and notification on the right.

Horizontal KPI rail.

Reservation panel followed by floor panel.

Overlay drawer with full labels.

Blurred background.

No page movement.

The best accepted page background was `#f8fbfd`.

---

## Commit and deployment observations

The following commit transitions appeared in deployment logs during the work:

`f69c4ca6` to `748e194c`

`748e194c` to `7bf3d6d2`

`7bf3d6d2` to `89f5059d`

`89f5059d` to `8dbd7f1d`

`8dbd7f1d` to `6814e5e3`

`6814e5e3` to `2aba15d9`

`2aba15d9` to `cdf69f05`

`cdf69f05` to `0dd3c83f`

`0dd3c83f` to `6a1ac740`

`6a1ac740` to `c7ab192d`

These values are useful as forensic references.

They should not be treated as guaranteed complete checkpoints without fetching and comparing the actual files.

Many later changes were direct scripted edits and may not correspond to a remote commit.

---

## Why rollback became difficult

The project used backup files with names such as:

Before mobile menu fix.

Before drawer label fix.

Before final logo.

Before brand visibility fix.

Before brand compact.

Before compact final.

Before CSS toggle icon.

Before single brand authority.

Before brand runtime.

Before brand hover.

Before shell geometry.

Before shell final.

Before distance rule.

Before pure CSS distance.

Before clean authority.

Before brand container.

Before brand drawer.

A backup could contain the correct logo but wrong geometry.

Another could contain the correct drawer but wrong logo.

Another could contain the correct page spacing but old mobile navigation.

This is why paired or multi-file rollback must inspect the contents, not only the timestamps.

---

## Current strategic decision

Do not continue with V20-style layering.

Create a checkpoint of the exact live state.

Compare live and GitHub.

Identify the best accepted DOM and CSS model.

Rebuild one clean implementation with one authority per concern.

Keep the visual decisions.

Discard the emergency patch stack.

---

## Decisions that should not change without explicit approval

Reservations2 remains the canonical redesigned Reservations page.

Main page background remains `#f8fbfd`.

Desktop shared gap remains 14px.

Mobile shared gap remains 10px.

Tabler outline icons remain the icon language.

Dashboard 2 quick button remains removed from Reservations2.

Old duplicated Reservations hero remains removed.

Notification caret remains removed.

Notification button remains one framed control.

Mobile KPI cards remain one horizontal rail.

Mobile menu remains an overlay drawer rather than four vertical page sections or an inline two-column panel.

Mobile drawer labels remain visible regardless of desktop saved state.

Mobile drawer does not shift page content.

Full and compact logos use uncropped SVG assets.

Collapsed mark hover becomes the expand control in the same hit target.

Desktop expanded menu shrinks page width and preserves a 14px gap.

---

## Decisions still requiring verification

Exact desktop expanded width across all Admin pages.

Exact medium-width 821px to 1099px behavior.

Exact mobile drawer percentage and maximum width.

Whether the mobile title remains hidden on every redesigned Admin page or only Reservations2.

Exact back-button destination.

Whether the Side Menu shell is fixed, sticky, or grid-contained platform-wide.

Whether the clean header should be generalized to all new Admin pages.

Whether missing vendor assets should be removed from Reservations2 bundles or restored globally.

---

## Historical lesson

The visually best state existed before the implementation was structurally stable.

Each new attempt fixed one symptom but often introduced another authority.

The next successful phase must preserve the accepted visual state while simplifying the architecture.

The project does not need another clever override.

It needs a controlled consolidation.

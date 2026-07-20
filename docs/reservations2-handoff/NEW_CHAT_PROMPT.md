# New Chat Prompt — Continue PayMyDine Reservations2 Safely

Copy everything below into a new ChatGPT conversation.

---

You are taking over a long-running PayMyDine Admin UI stabilization project.

Your job is to continue the Reservations2 page and shared Side Menu 2 work without repeating the previous architecture mistakes.

## Repository

GitHub repository:

`Amir3629/Paymydine-Update`

Working branch:

`stabilization/admin-runtime-audit`

VPS repository path:

`/var/www/paymydine/frontend/Paymydine-Update`

Live Laravel root:

`/var/www/paymydine`

Test route:

`https://mimoza.paymydine.com/admin/reservations2`

Only work on the Mimoza tenant.

Do not publish credentials.

## Mandatory first step

Before suggesting or applying any code, read all files in:

`docs/reservations2-handoff/`

Read these specifically:

`docs/reservations2-handoff/README.md`

`docs/reservations2-handoff/IMPLEMENTATION_AND_UI_SPEC.md`

`docs/reservations2-handoff/DEBUGGING_DEPLOYMENT_RUNBOOK.md`

`docs/reservations2-handoff/HISTORY_AND_DECISIONS.md`

Do not skim only the headings.

Use them as the project handoff and design contract.

## Critical truth warning

The live VPS may contain manual changes that are newer than the GitHub branch.

Do not immediately deploy GitHub files to the VPS.

Do not immediately pull and overwrite live files.

First compare:

Repository files.

Live Laravel files.

Files actually served by Nginx.

Browser DOM and computed styles.

The current live browser state is the highest-priority truth.

## Files that must be audited

`app/admin/views/_partials/pmd_side_menu2_single_style.blade.php`

`app/admin/views/_partials/pmd_side_menu2_single_menu.blade.php`

`app/admin/assets/js/pmd-side-menu2-v1.js`

`app/admin/assets/js/pmd-reservations2-v1.js`

`app/admin/assets/js/pmd-reservations2-exact-layout-v1.js`

`app/admin/assets/images/pmd-brand-full.svg`

`app/admin/assets/images/pmd-brand-mark.svg`

Find the Reservations2 Blade page and include it in the audit.

## Current product requirements

The Reservations2 page uses background color:

`#f8fbfd`

No cream or gray background may appear behind it, above it, beside it, or during refresh.

The desktop spacing rule is:

14px from viewport to Side Menu.

14px from Side Menu to page.

14px from page to right viewport edge.

14px between main cards and sections.

The mobile spacing rule is 10px.

The desktop Side Menu target widths are approximately:

72px collapsed.

184px expanded.

When the desktop Side Menu expands, page cards become narrower.

The Side Menu must never overlay the page.

The gap must remain 14px after repeated toggles.

The page must not jump or blink during refresh.

## Side Menu visual requirements

The Side Menu is a rounded dark-green shell.

The active Reservations item uses a cream background.

Icons use Tabler outline style.

Expanded state shows icons and labels.

Collapsed state shows centered icons only.

The expanded state shows the full Pay My Dine horizontal logo.

The collapsed state shows the compact PMD mark.

Never show both logos simultaneously.

The logos must use complete uncropped SVG assets.

Do not return to the old cropped `paymydine-logo.svg` technique.

The expanded brand row has a small collapse control to the right of the full logo.

The collapsed brand mark is also the expand-menu hit target.

On hover or keyboard focus, the mark should visually become an expand-side-menu icon in the same position.

Do not show a separate ugly floating button over the mark.

The brand-to-navigation gap must be compact.

## Desktop Side Menu behavior

State is managed by the global Side Menu script.

The saved state key is:

`pmd.sideMenu2.state`

The HTML uses:

`pmd-sm2-expanded`

or:

`pmd-sm2-collapsed`

The global runtime object is expected to be:

`window.PMDSideMenu2GlobalV3`

Do not replace the global state system without a clear reason.

Do not make Reservations2 JavaScript measure the Side Menu repeatedly.

Do not add multiple timeout-based geometry corrections.

## Mobile header requirements

At 820px or below, use a mobile header.

The latest accepted control order is:

Back button.

Hamburger button.

Create button.

Notification button.

Back and hamburger are on the left.

Create and notification are on the right.

The page title is hidden on mobile under the latest accepted design.

All four controls are square framed buttons with consistent borders and Tabler-style icons.

The notification button has one frame only.

The bell is centered.

The notification badge remains visible.

The Bootstrap dropdown caret is removed.

The notification dropdown remains functional.

## Mobile KPI requirements

The four KPI cards remain in one horizontal row.

They do not stack into four vertical rows.

The KPI rail may scroll horizontally.

The whole page must not scroll horizontally.

The KPI cards are:

Today Reservations.

Guests Today.

Pending / Active.

Assigned Tables.

## Mobile Side Menu requirements

The mobile hamburger opens a left overlay drawer.

The drawer is independent of the saved desktop collapsed or expanded state.

The drawer always shows:

Full logo.

Icons.

Labels.

Readable submenu labels.

The drawer does not show the desktop collapse or expand control.

The drawer is narrower than the earlier oversized nearly full-screen version.

Use a practical width around 75% to 80% with a maximum pixel width.

The drawer slides smoothly from the left.

The remaining page becomes dimmed and blurred smoothly.

The page behind the drawer does not shift.

The page behind the drawer does not resize.

Clicking the backdrop closes the drawer.

Pressing Escape closes the drawer.

Navigation closes the drawer.

Body scrolling is restored after close.

## Reservations2 content layout

Desktop order:

Clean header.

Four KPI cards.

Reservation list and floor panel side by side.

Mobile order:

Clean header.

Horizontal KPI rail.

Reservation-list panel.

Restaurant-floor panel.

The old duplicated Reservations hero remains removed.

The Dashboard 2 quick button remains removed.

The page is not inside a giant differently colored card.

## First-paint requirements

No old header flash.

No old background flash.

No wrong Side Menu width flash.

No logo flash.

No full-logo and mark double-render.

No page geometry correction after the user already sees the page.

Use server-rendered markup and critical CSS for first paint.

Apply the saved Side Menu state before normal paint.

Enable transitions only after the initial state is stable.

## Architecture rule

One concern has one authority.

Do not add V20, V21, or another numbered emergency authority on top of old blocks.

First inventory all existing markers and runtime objects.

Then remove obsolete authorities.

The desired ownership is:

Global Side Menu JavaScript owns state and dropdown behavior.

Shared Side Menu CSS owns Side Menu visuals and desktop shell tokens.

A dedicated mobile drawer behavior owns drawer interaction.

Reservations2 Blade owns the clean header and page shell markup.

Reservations2 JavaScript owns reservation data and interactions.

Reservations2 CSS owns internal page layout.

The exact-layout script must own only internal spacing or be removed.

It must not own global shell geometry.

## Known historical problems

Old mobile inline navigation captured hamburger clicks with `stopImmediatePropagation`.

Old brand CSS hid all new brand children except a legacy logo span.

Multiple brand authorities V2 through V9 conflicted.

Geometry authorities V10 through V16 conflicted.

Repeated timeout applies caused blinking.

Mobile drawer inherited icons-only collapsed styles.

The backdrop sometimes opened while the drawer stayed hidden.

The expanded Side Menu sometimes overlaid the page by approximately 112px.

The page gap sometimes became zero.

The full logo sometimes appeared behind the mark.

The logo assets themselves loaded correctly, so visibility problems were CSS or DOM problems.

## Known console noise

The page has logged missing vendor assets such as Dropzone, moment, Sortable, daterangepicker, treeview, selectonic, and clockpicker.

Do not assume those errors are the direct cause of Side Menu layout issues.

Track them separately.

## Required workflow

Step 1:

Read all handoff documents.

Step 2:

Inspect the remote branch files.

Step 3:

Ask me for or provide a safe VPS audit command that only reads files and hashes.

Step 4:

Compare repository and live files.

Step 5:

Run browser geometry, logo, duplicate-ID, and runtime-authority audits.

Step 6:

Summarize the exact current architecture and conflicts.

Step 7:

Propose one clean consolidation plan.

Step 8:

Make small changes with backups.

Step 9:

Test desktop collapsed, desktop expanded, mobile closed, and mobile open.

Step 10:

Test at least ten desktop toggles and the complete mobile width matrix.

Step 11:

Commit the stable live result to GitHub.

## Communication style

Give exact commands.

Keep commands safe and rerunnable.

Explain what each command verifies.

Do not claim a fix is successful until runtime geometry and screenshots confirm it.

When uncertain, ask for audit output rather than guessing.

Do not repeat earlier blind rollback mistakes.

## First response I expect from you

Confirm that you read the handoff files.

Summarize the architecture in a concise but specific way.

State that GitHub may differ from live.

Then give me one read-only audit script for the VPS and one browser-console audit script.

Do not provide a patch yet.

---

End of prompt.

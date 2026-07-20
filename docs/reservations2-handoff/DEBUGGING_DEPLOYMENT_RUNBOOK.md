# Reservations2 Debugging and Deployment Runbook

## Purpose

This runbook is the operational guide for auditing, editing, deploying, verifying, and rolling back Reservations2 and Side Menu 2 changes.

Use it before making any new patch.

The project has a history of remote GitHub files, VPS repository files, live Laravel files, and served assets becoming different.

This runbook is designed to prevent another blind overwrite or layered emergency patch.

---

## Safety rules

Work only on the Mimoza tenant.

Do not modify another tenant.

Do not publish credentials in GitHub.

Do not delete menu products, users, permissions, restaurant configuration, or production-like data.

Back up every file before patching.

Use timestamped backups.

Do not trust a backup filename without inspecting its markers and DOM assumptions.

Do not copy a GitHub file to live until hashes and current live behavior are understood.

Do not add a new numbered authority while older authorities remain active.

Do not run a broad find-and-replace against all Admin files without a dry run.

---

## Phase 1 — Establish repository state

SSH to the VPS.

```bash
ssh ubuntu@57.129.43.190
```

Move to the repository.

```bash
cd /var/www/paymydine/frontend/Paymydine-Update
```

Inspect branch and changes.

```bash
git status --short --branch
git branch --show-current
git log -10 --oneline --decorate
```

Expected working branch:

`stabilization/admin-runtime-audit`

Do not run `git reset --hard` before preserving uncommitted files.

List relevant modified files.

```bash
git status --short -- \
app/admin/views/_partials/pmd_side_menu2_single_style.blade.php \
app/admin/views/_partials/pmd_side_menu2_single_menu.blade.php \
app/admin/assets/js/pmd-side-menu2-v1.js \
app/admin/assets/js/pmd-reservations2-v1.js \
app/admin/assets/js/pmd-reservations2-exact-layout-v1.js
```

---

## Phase 2 — Compare repository and live files

Define paths.

```bash
REPO=/var/www/paymydine/frontend/Paymydine-Update
LIVE=/var/www/paymydine
```

Compare hashes.

```bash
sha256sum \
"$REPO/app/admin/views/_partials/pmd_side_menu2_single_style.blade.php" \
"$LIVE/app/admin/views/_partials/pmd_side_menu2_single_style.blade.php"

sha256sum \
"$REPO/app/admin/views/_partials/pmd_side_menu2_single_menu.blade.php" \
"$LIVE/app/admin/views/_partials/pmd_side_menu2_single_menu.blade.php"

sha256sum \
"$REPO/app/admin/assets/js/pmd-side-menu2-v1.js" \
"$LIVE/app/admin/assets/js/pmd-side-menu2-v1.js"

sha256sum \
"$REPO/app/admin/assets/js/pmd-reservations2-v1.js" \
"$LIVE/app/admin/assets/js/pmd-reservations2-v1.js"

sha256sum \
"$REPO/app/admin/assets/js/pmd-reservations2-exact-layout-v1.js" \
"$LIVE/app/admin/assets/js/pmd-reservations2-exact-layout-v1.js"
```

Different hashes mean the live server and repository are not synchronized.

Do not automatically choose either copy.

Inspect both.

---

## Phase 3 — Inventory authority markers

Search the repository partials.

```bash
cd /var/www/paymydine/frontend/Paymydine-Update

grep -nE \
'PMD_[A-Z0-9_]+_(START|END)|window\.PMD|id="pmd-' \
app/admin/views/_partials/pmd_side_menu2_single_style.blade.php \
app/admin/views/_partials/pmd_side_menu2_single_menu.blade.php
```

Search live partials.

```bash
grep -nE \
'PMD_[A-Z0-9_]+_(START|END)|window\.PMD|id="pmd-' \
/var/www/paymydine/app/admin/views/_partials/pmd_side_menu2_single_style.blade.php \
/var/www/paymydine/app/admin/views/_partials/pmd_side_menu2_single_menu.blade.php
```

Important historical markers include:

`PMD_SM2_CRITICAL_LOGO`

`PMD_R2_CRITICAL_PREPAINT_V5`

`PMD_MOBILE_DRAWER_CONTENT_FIX_V1`

`PMD_FINAL_BRAND_RENDER_V2`

`PMD_BRAND_VISIBILITY_FINAL_V3`

`PMD_BRAND_COMPACT_CHATGPT_V4`

`PMD_SIDE_MENU_COMPACT_FINAL_V5`

`PMD_BRAND_TOGGLE_CSS_ICON_V6`

`PMD_BRAND_SINGLE_AUTHORITY_V7`

`PMD_BRAND_RUNTIME_AUTHORITY_V8`

`PMD_BRAND_HOVER_AUTHORITY_V9`

`PMD_SIDE_MENU_SHELL_GEOMETRY_V10`

`PMD_SIDE_MENU_FINAL_GEOMETRY_V11`

`PMD_R2_DISTANCE_RULE_V14`

`PMD_R2_DISTANCE_RULE_V15`

`PMD_R2_DISTANCE_CSS_V16`

`PMD_SIDE_MENU_CLEAN_AUTHORITY_V17`

`PMD_BRAND_CONTAINER_RENDER_V18`

`PMD_BRAND_DRAWER_FINAL_V19`

Most of these should not coexist.

Their presence indicates historical layering.

---

## Phase 4 — Verify files served by Nginx

Check the Reservations2 JavaScript served to the browser.

```bash
curl -fsSL \
"https://mimoza.paymydine.com/app/admin/assets/js/pmd-reservations2-v1.js?nocache=$(date +%s)" \
| grep -nE 'PMD Reservations2|PMDReservations2|Clean Header'
```

Check exact layout.

```bash
curl -fsSL \
"https://mimoza.paymydine.com/app/admin/assets/js/pmd-reservations2-exact-layout-v1.js?nocache=$(date +%s)" \
| grep -nE 'Exact Layout|PMDReservations2ExactLayout'
```

Check brand assets.

```bash
curl -I \
"https://mimoza.paymydine.com/app/admin/assets/images/pmd-brand-full.svg?nocache=$(date +%s)"

curl -I \
"https://mimoza.paymydine.com/app/admin/assets/images/pmd-brand-mark.svg?nocache=$(date +%s)"
```

Expected asset response:

HTTP 200.

Content type `image/svg+xml`.

Non-zero content length.

---

## Phase 5 — Browser baseline audit

Open Reservations2.

Hard refresh.

Use the browser console.

Record:

Viewport width.

Viewport height.

Device pixel ratio.

HTML classes.

Body classes.

Local-storage Side Menu state.

Side Menu rectangle.

Page rectangle.

Header rectangle.

KPI rectangle.

Workspace rectangle.

Logo visibility.

Mobile drawer state.

---

## Console audit — shell geometry

```javascript
(() => {
  const side = document.querySelector('#pmd-side-menu2');
  const page = document.querySelector('#pmd-reservations2');

  const rect = element => {
    if (!element) return null;
    const value = element.getBoundingClientRect();
    return {
      left: Math.round(value.left),
      right: Math.round(value.right),
      top: Math.round(value.top),
      bottom: Math.round(value.bottom),
      width: Math.round(value.width),
      height: Math.round(value.height)
    };
  };

  const sideRect = rect(side);
  const pageRect = rect(page);

  const report = {
    viewport: {
      width: innerWidth,
      height: innerHeight,
      dpr: devicePixelRatio
    },
    state: {
      api: window.PMDSideMenu2GlobalV3?.getState?.(),
      expanded: document.documentElement.classList.contains('pmd-sm2-expanded'),
      collapsed: document.documentElement.classList.contains('pmd-sm2-collapsed'),
      mobileOpen: document.documentElement.classList.contains('pmd-sm2-mobile-open')
    },
    side: sideRect,
    page: pageRect,
    menuToPageGap:
      sideRect && pageRect
        ? Math.round(pageRect.left - sideRect.right)
        : null,
    pageToRightGap:
      pageRect
        ? Math.round(innerWidth - pageRect.right)
        : null,
    overlap:
      sideRect && pageRect
        ? Math.max(0, Math.round(sideRect.right - pageRect.left))
        : null
  };

  console.table(report);
  console.log(report);
  return report;
})();
```

Desktop expected:

Menu-to-page gap approximately 14px.

Page-to-right gap approximately 14px.

Overlap equals zero.

Mobile closed expected:

Side Menu reserves no width.

Page fits mobile viewport padding.

---

## Console audit — logo and brand control

```javascript
(() => {
  const side = document.querySelector('#pmd-side-menu2');
  const brand = side?.querySelector('.pmd-sm2__brand');
  const full = side?.querySelector(
    '.pmd-sm2__brand-full, .pmd-sm2__brand-full-render'
  );
  const mark = side?.querySelector(
    '.pmd-sm2__brand-mark, .pmd-sm2__brand-mark-render, #pmd-side-menu2-logo'
  );
  const toggle = side?.querySelector(
    '.pmd-sm2__brand-toggle, .pmd-sm2__brand-control, [data-pmd-sm2-toggle]'
  );

  const info = element => {
    if (!element) return null;
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return {
      display: style.display,
      visibility: style.visibility,
      opacity: style.opacity,
      backgroundImage: style.backgroundImage,
      width: Math.round(rect.width),
      height: Math.round(rect.height),
      left: Math.round(rect.left),
      top: Math.round(rect.top),
      outerHTML: element.outerHTML.slice(0, 500)
    };
  };

  const report = {
    state: window.PMDSideMenu2GlobalV3?.getState?.(),
    brand: info(brand),
    full: info(full),
    mark: info(mark),
    toggle: info(toggle),
    runtimeObjects: Object.keys(window)
      .filter(key => /^PMD.*(Brand|SideMenu|Drawer)/.test(key))
      .sort()
  };

  console.log(report);
  return report;
})();
```

Collapsed expected:

Mark visible.

Full logo hidden.

Toggle functionality available through the mark hit target.

Expanded expected:

Full logo visible.

Mark hidden.

Collapse control visible.

Mobile drawer expected:

Full logo visible.

Labels visible.

Desktop toggle hidden.

---

## Console audit — icon centering

```javascript
(() => {
  const side = document.querySelector('#pmd-side-menu2');
  const items = [
    ...(side?.querySelectorAll(
      '.pmd-sm2__item, .pmd-sm2__dropdown-toggle'
    ) || [])
  ];

  const center = element => {
    const rect = element.getBoundingClientRect();
    return rect.left + rect.width / 2;
  };

  const rows = items.map(item => {
    const svg = item.querySelector('svg');
    const label = item.querySelector('.pmd-sm2__label')?.textContent?.trim();
    return {
      label,
      itemCenter: Math.round(center(item) * 100) / 100,
      iconCenter: svg ? Math.round(center(svg) * 100) / 100 : null,
      delta: svg
        ? Math.round((center(svg) - center(item)) * 100) / 100
        : null
    };
  });

  console.table(rows);
  return rows;
})();
```

Use this audit only in collapsed desktop state.

The SVG center may differ from item center if the item includes an explicit icon frame.

In that case audit the frame instead.

---

## Console audit — duplicate IDs

```javascript
(() => {
  const ids = [...document.querySelectorAll('[id]')]
    .map(element => element.id);

  const duplicates = ids
    .filter((id, index) => ids.indexOf(id) !== index)
    .filter((id, index, array) => array.indexOf(id) === index);

  console.log({ duplicates });
  return duplicates;
})();
```

Expected:

No duplicate `pmd-side-menu2`.

No duplicate notification IDs.

No duplicate mobile navigation IDs.

---

## Console audit — runtime authorities

```javascript
Object.keys(window)
  .filter(key => /^PMD/.test(key))
  .filter(key => /SideMenu|Brand|Drawer|Reservations2|Header|Distance|Geometry/.test(key))
  .sort()
```

Too many similarly named authorities are a warning.

A clean implementation should expose only the currently supported runtime objects.

---

## Refresh-blink audit

Use the Performance panel or record a slow-motion screen capture.

Test refresh in desktop collapsed state.

Test refresh in desktop expanded state.

Test refresh in mobile closed state.

Look for:

Legacy topbar flash.

Wrong background flash.

Wrong logo flash.

Wrong Side Menu width flash.

Page horizontal jump.

KPI reflow.

Delayed header insertion.

Use network throttling only to expose first-paint ordering.

Do not accept a fix that works only on a fast local connection.

---

## Repeated-toggle test

Run manually:

Collapse.

Expand.

Repeat ten times.

After every change, run the geometry audit.

Expected:

Gap remains 14px.

Right gap remains 14px.

Overlap remains zero.

Logo state remains singular.

No state becomes stuck.

No new runtime object appears.

No duplicate listener side effect appears.

---

## Mobile drawer test matrix

Test widths:

320px.

375px.

390px.

430px.

467px.

618px.

760px.

820px.

821px.

For each mobile width:

Open drawer.

Confirm full logo.

Confirm all primary labels.

Open Restaurant submenu.

Close submenu.

Close with backdrop.

Open again.

Close with Escape.

Open again.

Select a navigation link only in a safe test context.

Confirm body scroll unlocks after close.

Confirm page rectangle does not move while drawer opens.

---

## Header test matrix

Desktop:

Back visible.

Title visible.

Create visible.

Notification visible.

Hamburger hidden.

Mobile:

Back visible.

Hamburger visible.

Title hidden under the latest design direction.

Create visible.

Notification visible.

Bell centered.

Badge visible.

No dropdown caret.

No double border.

Notification panel opens.

---

## KPI test matrix

Desktop:

Four cards in one row.

Equal gaps.

No overlap.

Mobile:

Four cards in one horizontal rail.

No vertical four-card stack.

Only rail scrolls horizontally.

Page does not scroll horizontally.

Card labels and values remain readable.

---

## Safe backup procedure

```bash
cd /var/www/paymydine/frontend/Paymydine-Update

STAMP="$(date +%Y%m%d_%H%M%S)"

cp app/admin/views/_partials/pmd_side_menu2_single_style.blade.php \
"app/admin/views/_partials/pmd_side_menu2_single_style.blade.php.before-change-${STAMP}.bak"

cp app/admin/views/_partials/pmd_side_menu2_single_menu.blade.php \
"app/admin/views/_partials/pmd_side_menu2_single_menu.blade.php.before-change-${STAMP}.bak"

cp app/admin/assets/js/pmd-side-menu2-v1.js \
"app/admin/assets/js/pmd-side-menu2-v1.js.before-change-${STAMP}.bak"

cp app/admin/assets/js/pmd-reservations2-v1.js \
"app/admin/assets/js/pmd-reservations2-v1.js.before-change-${STAMP}.bak"

cp app/admin/assets/js/pmd-reservations2-exact-layout-v1.js \
"app/admin/assets/js/pmd-reservations2-exact-layout-v1.js.before-change-${STAMP}.bak"
```

Do not commit backup files unless intentionally preserving a checkpoint.

Prefer Git commits for durable history.

---

## Recommended edit workflow

Create a clean branch from the audited checkpoint.

Edit one concern at a time.

First stabilize source structure.

Then stabilize first paint.

Then stabilize desktop Side Menu states.

Then stabilize mobile drawer.

Then stabilize page internals.

Run tests after each concern.

Commit after each stable concern.

Do not wait until dozens of unrelated changes are mixed.

---

## Deployment — Blade partials

```bash
cd /var/www/paymydine/frontend/Paymydine-Update

sudo install \
  -m 0644 \
  -o www-data \
  -g www-data \
  app/admin/views/_partials/pmd_side_menu2_single_style.blade.php \
  /var/www/paymydine/app/admin/views/_partials/pmd_side_menu2_single_style.blade.php

sudo install \
  -m 0644 \
  -o www-data \
  -g www-data \
  app/admin/views/_partials/pmd_side_menu2_single_menu.blade.php \
  /var/www/paymydine/app/admin/views/_partials/pmd_side_menu2_single_menu.blade.php

cd /var/www/paymydine
php artisan view:clear
```

---

## Deployment — JavaScript files

```bash
cd /var/www/paymydine/frontend/Paymydine-Update

sudo install \
  -m 0644 \
  -o www-data \
  -g www-data \
  app/admin/assets/js/pmd-side-menu2-v1.js \
  /var/www/paymydine/app/admin/assets/js/pmd-side-menu2-v1.js

sudo install \
  -m 0644 \
  -o www-data \
  -g www-data \
  app/admin/assets/js/pmd-reservations2-v1.js \
  /var/www/paymydine/app/admin/assets/js/pmd-reservations2-v1.js

sudo install \
  -m 0644 \
  -o www-data \
  -g www-data \
  app/admin/assets/js/pmd-reservations2-exact-layout-v1.js \
  /var/www/paymydine/app/admin/assets/js/pmd-reservations2-exact-layout-v1.js
```

Clear views only if Blade changed.

Browser assets may require cache busting.

---

## Deployment — brand assets

```bash
cd /var/www/paymydine/frontend/Paymydine-Update

sudo install \
  -m 0644 \
  -o www-data \
  -g www-data \
  app/admin/assets/images/pmd-brand-full.svg \
  /var/www/paymydine/app/admin/assets/images/pmd-brand-full.svg

sudo install \
  -m 0644 \
  -o www-data \
  -g www-data \
  app/admin/assets/images/pmd-brand-mark.svg \
  /var/www/paymydine/app/admin/assets/images/pmd-brand-mark.svg
```

Do not share local source paths in production code.

Use web paths under `/app/admin/assets/images/`.

---

## Post-deployment verification

Verify permissions.

```bash
ls -lah \
/var/www/paymydine/app/admin/views/_partials/pmd_side_menu2_single_style.blade.php \
/var/www/paymydine/app/admin/views/_partials/pmd_side_menu2_single_menu.blade.php \
/var/www/paymydine/app/admin/assets/js/pmd-side-menu2-v1.js \
/var/www/paymydine/app/admin/assets/js/pmd-reservations2-v1.js \
/var/www/paymydine/app/admin/assets/js/pmd-reservations2-exact-layout-v1.js
```

Verify hashes.

Verify served markers.

Hard refresh.

Run browser audits.

Capture screenshots.

Do not declare success from deployment output alone.

---

## Cache notes

`php artisan view:clear` clears compiled Blade views.

`php artisan optimize:clear` clears multiple Laravel caches.

A cache permission warning may occur.

Inspect the command output rather than assuming everything failed.

Nginx or browser caching can still serve old JavaScript.

Use a cache-busting query parameter while verifying.

Hard refresh Safari or Chrome.

Disable cache while DevTools is open during testing.

---

## Rollback principles

Rollback is not “restore the oldest file that had a good screenshot”.

A correct rollback requires matching files that were designed to work together.

Style, menu markup, global Side Menu JavaScript, Reservations2 JavaScript, exact-layout JavaScript, and brand assets can be coupled.

A mismatched rollback can restore the logo but break the drawer.

A mismatched rollback can restore the drawer but reintroduce overlap.

A mismatched rollback can restore page geometry but remove the logo.

Use Git commits whenever possible.

If using backup files, inspect marker sets before restoring.

---

## Backup inspection command

```bash
cd /var/www/paymydine/frontend/Paymydine-Update

for file in \
app/admin/views/_partials/pmd_side_menu2_single_style.blade.php*.bak \
app/admin/views/_partials/pmd_side_menu2_single_menu.blade.php*.bak; do
  [ -f "$file" ] || continue
  echo
  echo "===== $file ====="
  grep -nE \
  'PMD_[A-Z0-9_]+_(START|END)|PMDBrand|PMDSideMenu|PMDR2' \
  "$file" \
  | head -80
 done
```

Build a candidate pair only after comparing the marker sets and markup expectations.

---

## Git checkpoint procedure

After a stable live state is confirmed:

Copy live files back into the repository if live is the source of truth.

```bash
cp \
/var/www/paymydine/app/admin/views/_partials/pmd_side_menu2_single_style.blade.php \
/var/www/paymydine/frontend/Paymydine-Update/app/admin/views/_partials/pmd_side_menu2_single_style.blade.php

cp \
/var/www/paymydine/app/admin/views/_partials/pmd_side_menu2_single_menu.blade.php \
/var/www/paymydine/frontend/Paymydine-Update/app/admin/views/_partials/pmd_side_menu2_single_menu.blade.php
```

Repeat for relevant JavaScript and assets.

Review diff.

```bash
cd /var/www/paymydine/frontend/Paymydine-Update
git diff --stat
git diff --check
git diff
```

Commit with a descriptive message.

```bash
git add \
app/admin/views/_partials/pmd_side_menu2_single_style.blade.php \
app/admin/views/_partials/pmd_side_menu2_single_menu.blade.php \
app/admin/assets/js/pmd-side-menu2-v1.js \
app/admin/assets/js/pmd-reservations2-v1.js \
app/admin/assets/js/pmd-reservations2-exact-layout-v1.js \
app/admin/assets/images/pmd-brand-full.svg \
app/admin/assets/images/pmd-brand-mark.svg

git commit -m "Stabilize Reservations2 shell and responsive Side Menu"
git push origin stabilization/admin-runtime-audit
```

Only add files that were intentionally changed.

---

## Known console errors triage

Missing Dropzone:

Track separately.

It can break media manager code.

It is not automatically a Reservations2 layout cause.

Missing moment:

Track separately.

It breaks datepicker initialization.

It is not automatically a Side Menu cause.

Missing Sortable or treeview:

Track separately.

Confirm whether Reservations2 needs those assets.

Notification polling logs:

Expected every 15 seconds.

They add noise but are not necessarily errors.

Network-offline messages:

Retest after connectivity is restored before diagnosing UI code.

---

## Failure pattern diagnosis

### Page overlaps only when expanded

Likely cause:

Page offset still uses collapsed width.

Or the page is offset at a wrapper and root simultaneously.

### Gap becomes zero

Likely cause:

Page starts exactly at Side Menu right edge.

Missing the explicit 14px gap.

### Gap works once and breaks after repeated toggles

Likely cause:

Duplicate listeners.

Repeated measurements.

Inline styles from an old authority.

A MutationObserver reacting to state changes more than once.

### Logo missing

Likely cause:

Broad selector hides brand children.

Element has `visibility: hidden`.

Full and mark selectors do not match markup.

Asset path is wrong.

Legacy logo script removes or replaces markup.

### Full logo visible behind mark

Likely cause:

Both logo implementations remain active.

Pseudo-element and image element overlap.

Collapsed selector fails to hide full logo.

### Hamburger blurs page but no drawer appears

Likely cause:

Backdrop opens while Side Menu transform or visibility remains hidden.

Drawer moved into a container with clipping.

An older click listener stops propagation.

### Drawer shows icons only

Likely cause:

Desktop collapsed label styles still apply inside mobile drawer.

### Huge gap under logo

Likely cause:

Brand row has old 96px or 116px height.

Navigation has old top margin.

Flex distribution pushes navigation down.

### Notification icon off-center

Likely cause:

Badge participates in layout.

Wrapper frame and anchor frame both apply.

Legacy Font Awesome line-height remains.

---

## Final operational rule

Never fix a visible issue by adding one more late override without first identifying the current owner.

Find the existing authority.

Remove or edit it.

Keep the system understandable.

# Reservations2 Implementation and UI Specification

## Purpose

This file converts the project history into an implementation contract.

It describes the desired DOM, CSS ownership, JavaScript ownership, responsive behavior, Side Menu states, logo states, header controls, KPI rail, workspace panels, and first-paint requirements.

Read the master README first.

Then use this file while editing code.

---

## Core implementation principle

One concern must have one owner.

The implementation must be predictable from source code without requiring browser-console patches.

The first paint must already be close to the final state.

JavaScript may enhance behavior.

JavaScript must not reconstruct the entire shell after the user sees the page.

---

## Recommended file ownership

### Shared Side Menu markup

File:

`app/admin/views/_partials/pmd_side_menu2_single_menu.blade.php`

Owns:

The Side Menu aside.

The brand row markup.

The full-logo element.

The compact-mark element.

The desktop collapse or expand button.

The navigation links.

The dropdown buttons.

The submenu links.

The active-state classes.

Does not own:

Reservations2 page markup.

Reservations cards.

Floor-map markup.

Page shell dimensions.

Page-specific header logic.

### Shared Side Menu style

Preferred dedicated file or the existing shared partial after cleanup.

Owns:

Desktop Side Menu dimensions.

Desktop Side Menu visual styles.

Expanded and collapsed presentation.

Brand rendering.

Brand hover transition.

Navigation icon alignment.

Navigation label visibility.

Dropdown presentation.

Mobile drawer visual presentation.

Backdrop visual presentation.

Does not own:

Reservations2 KPI layout.

Reservations2 panel layout.

Dynamic page measurement.

### Global Side Menu behavior

File:

`app/admin/assets/js/pmd-side-menu2-v1.js`

Owns:

Reading the saved desktop state.

Applying expanded or collapsed classes.

Writing desktop state to local storage.

Opening and closing dropdowns.

Resetting dropdowns during navigation.

Dispatching the Side Menu state event.

Does not own:

Page width.

Page margins.

Reservations2 layout.

Logo drawing.

Mobile drawer cloning.

### Mobile drawer behavior

Preferred dedicated file:

`app/admin/assets/js/pmd-side-menu2-mobile-drawer.js`

Owns:

Opening and closing the drawer.

Drawer accessibility attributes.

Backdrop creation or control.

Escape-key handling.

Backdrop-click handling.

Body-scroll locking.

Closing before navigation.

Ensuring mobile labels remain visible.

Does not own:

Desktop persisted expanded or collapsed state.

Desktop page geometry.

### Reservations2 Blade

Owns:

The page root.

The clean header markup.

The KPI markup.

The reservation-list panel shell.

The floor-panel shell.

Boot data.

The correct include order.

### Reservations2 page JavaScript

File:

`app/admin/assets/js/pmd-reservations2-v1.js`

Owns:

Reservation normalization.

KPI calculation.

Search behavior.

Card pagination.

Floor table rendering.

Refresh behavior.

Does not own:

Removing the legacy header after paint.

Global background correction.

Global Side Menu width.

Outer wrapper width.

### Reservations2 page CSS

Owns:

Page background token.

Page padding.

Header layout.

KPI layout.

Panel layout.

Card layout.

Floor layout.

Responsive page behavior.

Does not own:

Global Side Menu navigation behavior.

---

## Proposed DOM contract

The page should render a stable structure similar to this:

```html
<body class="admin-layout">
  <aside id="pmd-side-menu2">
    <div class="pmd-sm2__brand">
      <button class="pmd-sm2__brand-control">
        <img class="pmd-sm2__brand-full" alt="Pay My Dine">
        <img class="pmd-sm2__brand-mark" alt="">
        <span class="pmd-sm2__brand-control-icon" aria-hidden="true"></span>
      </button>
    </div>
    <nav class="pmd-sm2__nav"></nav>
  </aside>

  <div class="page-wrapper">
    <main id="pmd-reservations2">
      <header id="pmd-r2-clean-header"></header>
      <section class="pmd-r2__kpis"></section>
      <section class="pmd-r2__workspace"></section>
    </main>
  </div>

  <div id="pmd-side-menu2-backdrop"></div>
</body>
```

The exact markup can differ.

The ownership and state behavior must remain equivalent.

---

## Required HTML state classes

Desktop expanded:

`html.pmd-sm2-expanded`

Desktop collapsed:

`html.pmd-sm2-collapsed`

Runtime transitions enabled:

`html.pmd-sm2-runtime-ready`

Mobile drawer open:

Use one canonical class such as:

`html.pmd-sm2-mobile-open`

Do not maintain several drawer-open classes simultaneously.

Do not use desktop collapsed classes to hide mobile labels.

---

## CSS custom properties

Define shared shell tokens once.

Recommended values:

```css
:root {
  --pmd-page-bg: #f8fbfd;
  --pmd-gap-desktop: 14px;
  --pmd-gap-mobile: 10px;
  --pmd-side-menu-collapsed: 72px;
  --pmd-side-menu-expanded: 184px;
  --pmd-side-menu-edge: 14px;
  --pmd-card-border: #c9e0ef;
  --pmd-card-radius: 14px;
  --pmd-control-radius: 11px;
  --pmd-side-menu-bg-start: #001b16;
  --pmd-side-menu-bg-end: #00483c;
  --pmd-side-menu-text: #f3fbf8;
  --pmd-active-bg: #fff3d3;
  --pmd-active-text: #00473e;
}
```

The exact dark-green values can be adjusted to match the approved screenshot.

Do not duplicate these values in many unrelated scripts.

---

## Desktop shell geometry

Use CSS rather than repeated measurements.

The Side Menu left position is:

`14px`

The collapsed Side Menu width is:

`72px`

The expanded Side Menu width is:

`184px`

The page left boundary is calculated from state tokens.

Collapsed page left boundary:

`14px + 72px + 14px = 100px`

Expanded page left boundary:

`14px + 184px + 14px = 212px`

The page right boundary remains 14px from the viewport.

An example shell rule:

```css
@media (min-width: 821px) {
  :root {
    --pmd-side-menu-current: var(--pmd-side-menu-collapsed);
  }

  html.pmd-sm2-expanded {
    --pmd-side-menu-current: var(--pmd-side-menu-expanded);
  }

  #pmd-side-menu2 {
    position: fixed;
    left: var(--pmd-side-menu-edge);
    width: var(--pmd-side-menu-current);
  }

  #pmd-reservations2 {
    margin-left: calc(
      var(--pmd-side-menu-edge) +
      var(--pmd-side-menu-current) +
      var(--pmd-gap-desktop)
    );
    width: calc(
      100vw -
      var(--pmd-side-menu-edge) -
      var(--pmd-side-menu-current) -
      var(--pmd-gap-desktop) -
      var(--pmd-gap-desktop)
    );
  }
}
```

The actual Admin wrapper may require the rule on a wrapper rather than the root.

Inspect containing-block behavior before selecting the final element.

Do not simultaneously apply the offset to `.page-wrapper`, `.page-content`, and the page root.

Choose one shell owner.

---

## Desktop transition rule

Initial paint must not animate.

After stable state is applied, add `pmd-sm2-runtime-ready`.

Only then enable transitions.

Recommended properties:

Side Menu width.

Page margin-left or grid column width.

Page width if required.

Recommended duration:

180ms to 220ms.

Recommended easing:

`cubic-bezier(.22,.75,.24,1)`

Do not animate top, bottom, height, or vertical position.

Do not animate on refresh before state is known.

---

## Preferred shell alternative: CSS grid

If the legacy Admin wrappers permit it, a grid shell is safer.

Concept:

```css
.admin-shell {
  display: grid;
  grid-template-columns: var(--pmd-side-menu-current) minmax(0, 1fr);
  gap: var(--pmd-gap-desktop);
  padding: var(--pmd-gap-desktop);
}
```

The Side Menu can remain sticky or fixed depending on platform needs.

A grid shell naturally shrinks page content when the Side Menu expands.

Do not introduce a grid shell without verifying all Admin pages.

Reservations2 must not become the only page with incompatible wrapper behavior.

---

## Side Menu vertical geometry

Desktop Side Menu should use a fixed top and bottom inset.

The top and bottom should visually match the 14px shell rule.

The Side Menu should not jump vertically when expanded or collapsed.

Its height should not be set by JavaScript.

Its brand row and navigation may scroll internally if content exceeds the viewport.

The shell itself keeps the rounded shape.

Use:

```css
#pmd-side-menu2 {
  top: 14px;
  bottom: 14px;
  height: auto;
  overflow: hidden;
}
```

Then give the navigation area internal overflow.

---

## Brand row specification

### Expanded brand row

Height target:

Approximately 56px to 66px.

The full logo is left-aligned within the row.

The full logo is smaller than the full menu width.

The collapse control is right-aligned.

The full logo uses `object-fit: contain` or background contain.

The full logo is not cropped.

The collapse icon uses the Tabler sidebar-collapse concept.

### Collapsed brand row

The row width equals the collapsed Side Menu width.

The PMD mark is centered.

The full logo is `display: none`.

The brand control occupies a predictable hit area.

When not hovered, the mark is visible.

When hovered or keyboard-focused, the mark fades out and the expand icon fades in.

The hit target does not move.

### Mobile drawer brand row

The full logo is visible.

The mark is hidden.

The desktop collapse control is hidden.

The drawer may include a separate close affordance only if needed.

Backdrop and hamburger toggle already provide closing behavior.

---

## Brand interaction accessibility

Use a real button for the brand control.

Expanded label:

`Collapse side menu`

Collapsed label:

`Expand side menu`

Update `aria-expanded`.

The icon change must also work on `:focus-visible`.

Do not require a mouse hover to discover the action.

The full logo image should have meaningful alt text if it is not inside an already labeled button.

The compact mark can be decorative inside a labeled button.

---

## Navigation item geometry

Expanded items:

Icon frame aligned to a consistent column.

Label starts after a consistent gap.

Item width fills the available inner menu width.

Active background uses a rounded cream pill or rounded rectangle.

Collapsed items:

Item width fits the inner collapsed menu.

Icon frame is centered on the Side Menu visual axis.

No label takes layout space.

No hidden label margin shifts the icon.

No pseudo-element adds horizontal offset.

### Centering audit rule

For a collapsed item:

Item center X should equal icon frame center X within approximately 1px.

Icon SVG center X should equal icon frame center X within approximately 1px.

Apply the same audit to the brand mark.

---

## Dropdown behavior

Clicking a dropdown in collapsed desktop state may expand the menu first.

Only one dropdown should be open at a time.

Dropdown state is temporary.

Real navigation clears the dropdown state.

Modified clicks can preserve normal browser behavior.

Submenus must remain keyboard accessible.

Mobile drawer submenus must show readable labels.

Do not duplicate element IDs when cloning navigation.

Prefer reusing the same navigation DOM in a body-level drawer rather than cloning it.

If the same aside becomes the mobile drawer, use responsive CSS to change positioning and presentation.

---

## Mobile drawer geometry

Breakpoint:

`820px`

At 821px, desktop shell behavior begins.

At 820px and below, the page uses full viewport width with mobile padding.

Recommended drawer width:

```css
width: min(76vw, 340px);
```

At very small widths, consider:

```css
width: min(82vw, 320px);
```

The final percentage should be chosen after screenshot comparison.

The drawer must be visibly narrower than the earlier nearly full-width version.

The drawer position when closed:

Translated fully left beyond the viewport.

The drawer position when open:

Left mobile gap or zero, depending on approved design.

The drawer should preserve rounded right corners.

The drawer may preserve rounded corners on all sides if it retains an inset.

The backdrop fills the viewport.

The backdrop uses translucent dark color plus blur.

Example:

```css
#pmd-side-menu2-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(10, 24, 22, .24);
  backdrop-filter: blur(8px);
  opacity: 0;
  pointer-events: none;
}

html.pmd-sm2-mobile-open #pmd-side-menu2-backdrop {
  opacity: 1;
  pointer-events: auto;
}
```

The page must remain in its original position.

Do not apply margin-left or transform to the page when opening the mobile drawer.

---

## Mobile drawer state independence

The drawer is always visually expanded.

Even if local storage says desktop state is collapsed:

Show labels.

Show full logo.

Show submenu names.

Use expanded item width.

Hide the desktop brand toggle.

The desktop state remains stored for the next desktop visit.

Closing the drawer must not change the saved desktop state.

---

## Mobile header layout

Header outer width equals the page content width.

The later approved mobile layout hides the title.

Leading controls:

Back.

Hamburger.

Trailing controls:

Create.

Notification.

Use one flex row with `justify-content: space-between` between the two groups.

Each group uses a small consistent gap.

Controls must fit at 320px.

Do not allow a hidden title to retain width or margin.

Do not keep a legacy navbar toggle in the DOM with its own dimensions.

---

## Notification control details

The root may be a list item because it comes from legacy markup.

Normalize it:

No list marker.

No outer border.

No outer background.

No outer padding.

The clickable anchor owns the square frame.

The bell SVG uses currentColor.

The bell SVG remains centered.

The badge is absolutely positioned.

Remove dropdown arrow pseudo-elements.

Preserve dropdown attributes and IDs needed by existing JavaScript.

Do not replace the notification root with a visually similar fake button.

---

## KPI rail desktop

Use CSS grid:

```css
.pmd-r2__kpis {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}
```

Each KPI card uses `min-width: 0`.

Long labels wrap only if necessary.

Icons remain aligned to the card’s right side.

---

## KPI rail mobile

Use flex nowrap:

```css
.pmd-r2__kpis {
  display: flex;
  flex-flow: row nowrap;
  gap: 10px;
  overflow-x: auto;
  overflow-y: hidden;
}

.pmd-r2-kpi {
  flex: 0 0 176px;
}
```

Do not set the parent page width larger than 100%.

Use scroll snapping if helpful.

Keep a small bottom padding for the rail scrollbar.

The first card starts at the normal page left edge.

---

## Desktop workspace

Recommended grid:

```css
.pmd-r2__workspace {
  display: grid;
  grid-template-columns: minmax(320px, 420px) minmax(0, 1fr);
  gap: 14px;
}
```

The exact left-panel width can respond to available space.

The floor panel must have `min-width: 0`.

Do not set an inflexible width that causes overlap after Side Menu expansion.

---

## Mobile workspace

Use one column:

```css
.pmd-r2__workspace {
  grid-template-columns: minmax(0, 1fr);
  gap: 10px;
}
```

Reservation panel appears first.

Floor panel appears second.

Both panels use full available width.

No child should force the page beyond viewport width.

---

## Reservation card responsive details

Use flex-wrap for metadata.

Long ISO timestamps may occupy their own line.

Status badge stays aligned near the top-right.

At narrow widths, reserve enough room so guest name and status do not collide.

Use `overflow-wrap: anywhere` on unbroken timestamps if necessary.

Do not shrink text until it becomes unreadable.

---

## Floor canvas responsive details

The table positions are percentage-based.

The canvas needs a practical minimum height.

On mobile, the floor can remain wider internally if the panel provides controlled horizontal scrolling.

Do not let the entire page scroll horizontally.

Keep the legend visible and readable.

Ensure the Refresh button does not overlap the subtitle.

---

## First-paint state script

A tiny state script can run in the document head before stylesheet paint.

Concept:

```html
<script>
(function () {
  var state = 'collapsed';
  try {
    state = localStorage.getItem('pmd.sideMenu2.state') === 'expanded'
      ? 'expanded'
      : 'collapsed';
  } catch (error) {}

  document.documentElement.classList.add(
    state === 'expanded'
      ? 'pmd-sm2-expanded'
      : 'pmd-sm2-collapsed'
  );
})();
</script>
```

This prevents the wrong desktop width and logo from appearing first.

Do not write state here.

Only read and preapply it.

---

## First-paint header strategy

Best option:

Render the clean header in Blade.

Hide or omit the legacy topbar on this route server-side.

Second-best option:

Use critical CSS to hide the legacy topbar immediately and reserve final header dimensions.

Then enhance existing markup without moving large DOM blocks.

Avoid:

Showing the legacy topbar and deleting it after load.

---

## Background strategy

Set background before JavaScript:

```css
html,
body,
.page-wrapper,
.page-content,
#pmd-reservations2 {
  background: #f8fbfd;
}
```

Reset unwanted top margins and paddings only on the route-specific shell.

Avoid globally forcing every `.container` to `#f8fbfd` unless verified across the platform.

Use route-scoped selectors when possible.

---

## Runtime API expectations

Global Side Menu API:

```javascript
window.PMDSideMenu2GlobalV3.getState()
window.PMDSideMenu2GlobalV3.applyState('expanded')
window.PMDSideMenu2GlobalV3.applyState('collapsed')
window.PMDSideMenu2GlobalV3.setDropdown(name, open)
window.PMDSideMenu2GlobalV3.refresh()
```

Reservations2 API:

```javascript
window.PMDReservations2V1
```

Mobile drawer API should eventually expose:

```javascript
window.PMDSideMenu2MobileDrawer.open()
window.PMDSideMenu2MobileDrawer.close()
window.PMDSideMenu2MobileDrawer.inspect()
```

The API should be a diagnostic convenience.

The UI must work without calling APIs manually.

---

## Event contract

Global Side Menu state event:

`pmd:side-menu2-state`

Event detail:

State string.

Expanded boolean.

Page-specific code should not respond by measuring and mutating several wrapper dimensions.

CSS state selectors should handle geometry.

The event can update accessibility details or analytics.

---

## Preventing observer loops

Only observe attributes that truly matter.

Do not observe all subtree mutations and then rewrite the observed subtree on every callback.

Do not observe `style` while continuously setting inline styles.

Debounce resize handling.

Prefer ResizeObserver only when actual element dimensions cannot be expressed in CSS.

Disconnect observers during destructive DOM replacement.

Expose a `destroy()` method for debugging.

---

## Preventing duplicate event listeners

Use one runtime sentinel.

Example:

```javascript
if (window.PMDSideMenu2MobileDrawer) return;
```

Store bound handlers if they need removal.

Avoid installing a new capture-phase listener every time a partial is re-evaluated.

Do not let both inline mobile nav and drawer scripts bind the same hamburger.

Remove obsolete scripts rather than relying on listener order.

---

## Breakpoint test contract

Desktop large:

1100px and wider.

Desktop medium or tablet landscape:

821px through 1099px.

Mobile:

820px and narrower.

The original responsive proposal considered a collapsed rail at 821px through 1099px.

The final behavior should be confirmed platform-wide.

Reservations2 must at minimum respect the mobile boundary consistently.

Pay particular attention to browser device emulation showing actual content widths of 816px or 817px due to scrollbars and DPR behavior.

Use `matchMedia('(max-width: 820px)')` for state logic rather than comparing a visually displayed emulator label only.

---

## Visual acceptance measurements

Desktop collapsed:

Side left approximately 14px.

Side width approximately 72px.

Side right approximately 86px.

Page left approximately 100px.

Menu-to-page gap approximately 14px.

Page-to-right gap approximately 14px.

Desktop expanded:

Side left approximately 14px.

Side width approximately 184px.

Side right approximately 198px.

Page left approximately 212px.

Menu-to-page gap approximately 14px.

Page-to-right gap approximately 14px.

Mobile:

Page left equals mobile page gap.

Page right equals viewport minus mobile page gap.

Closed drawer has no visible shell and no reserved width.

Open drawer overlays without changing page rectangle.

---

## Definition of done

The implementation is complete only when all of the following are true.

No old header flash.

No cream background flash.

No logo double-render.

No missing logo.

No missing brand control icon.

No hidden hamburger.

No hamburger listener conflict.

No drawer with icons only.

No drawer-induced page shift.

No desktop overlap.

No zero menu-to-page gap.

No repeated-toggle geometry failure.

No giant brand-to-navigation gap.

No notification double frame.

No dropdown caret.

No off-center bell.

No vertically stacked KPI cards on mobile.

No whole-page horizontal scrollbar.

No duplicate Side Menu aside.

No duplicate brand authority markers.

No duplicate mobile navigation authority markers.

No geometry JavaScript retry loop.

No production dependency on manual console commands.

{{-- PMD_SIDE_MENU2_CRITICAL_SINGLE_AUTHORITY_V2 --}}
<style id="pmd-side-menu2-critical-v2">
  :root {
    --pmd-admin-bg: #f8fbfd;
    --pmd-sm2-gap: 14px;
    --pmd-sm2-collapsed: 72px;
    --pmd-sm2-expanded: 184px;
    --pmd-sm2-content-left-collapsed: 100px;
    --pmd-sm2-content-left-expanded: 212px;
  }

  html,
  body,
  body.layout,
  body.admin,
  .app-container,
  .layout,
  .layout-wrapper,
  .main-content,
  .page-wrapper,
  .page-content,
  .content-wrapper,
  #pmd-reservations2 {
    background: var(--pmd-admin-bg) !important;
  }

  html,
  body {
    min-width: 100%;
    min-height: 100%;
    margin: 0 !important;
    padding: 0 !important;
  }

  body:has(#pmd-reservations2) {
    overflow-x: hidden !important;
  }

  body:has(#pmd-reservations2) .navbar-top,
  body:has(#pmd-reservations2) .navbar-fixed-top,
  body:has(#pmd-reservations2) #pmd-dashboard2-quick-btn,
  body:has(#pmd-reservations2) #pmd-reservations2 .pmd-r2__hero {
    display: none !important;
    visibility: hidden !important;
    pointer-events: none !important;
  }

  #pmd-side-menu2 {
    position: fixed !important;
    left: var(--pmd-sm2-gap) !important;
    top: var(--pmd-sm2-gap) !important;
    bottom: var(--pmd-sm2-gap) !important;
    height: auto !important;
    margin: 0 !important;
    transform: none !important;
    z-index: 1050;
    transition: width 220ms cubic-bezier(.22,.75,.24,1) !important;
  }

  html.pmd-sm2-collapsed #pmd-side-menu2 {
    width: var(--pmd-sm2-collapsed) !important;
  }

  html.pmd-sm2-expanded #pmd-side-menu2 {
    width: var(--pmd-sm2-expanded) !important;
  }

  body:has(#pmd-reservations2) .page-wrapper,
  body:has(#pmd-reservations2) .page-content,
  body:has(#pmd-reservations2) .content-wrapper {
    position: relative !important;
    inset: auto !important;
    width: 100% !important;
    max-width: none !important;
    min-width: 0 !important;
    margin: 0 !important;
    padding: 0 !important;
    transform: none !important;
    overflow-x: hidden !important;
  }

  #pmd-reservations2 {
    max-width: none !important;
    min-width: 0 !important;
    margin-top: 0 !important;
    margin-bottom: 0 !important;
    margin-right: var(--pmd-sm2-gap) !important;
    padding: var(--pmd-sm2-gap) 0 var(--pmd-sm2-gap) !important;
    box-sizing: border-box !important;
    transform: none !important;
    transition:
      margin-left 220ms cubic-bezier(.22,.75,.24,1),
      width 220ms cubic-bezier(.22,.75,.24,1) !important;
  }

  /* Explicit state geometry prevents old inverse-offset rules from winning. */
  html.pmd-sm2-collapsed #pmd-reservations2 {
    width: calc(100vw - var(--pmd-sm2-content-left-collapsed) - var(--pmd-sm2-gap)) !important;
    margin-left: var(--pmd-sm2-content-left-collapsed) !important;
  }

  html.pmd-sm2-expanded #pmd-reservations2 {
    width: calc(100vw - var(--pmd-sm2-content-left-expanded) - var(--pmd-sm2-gap)) !important;
    margin-left: var(--pmd-sm2-content-left-expanded) !important;
  }

  html:not(.pmd-sm2-runtime-ready) #pmd-side-menu2,
  html:not(.pmd-sm2-runtime-ready) #pmd-reservations2 {
    transition: none !important;
  }

  @media (max-width: 820px) {
    :root { --pmd-sm2-gap: 10px; }

    #pmd-reservations2,
    html.pmd-sm2-collapsed #pmd-reservations2,
    html.pmd-sm2-expanded #pmd-reservations2 {
      width: 100% !important;
      max-width: 100% !important;
      margin: 0 !important;
      padding: var(--pmd-sm2-gap) !important;
    }

    #pmd-side-menu2,
    html.pmd-sm2-collapsed #pmd-side-menu2,
    html.pmd-sm2-expanded #pmd-side-menu2 {
      left: 0 !important;
      top: 0 !important;
      bottom: 0 !important;
      width: min(78vw, 340px) !important;
      height: 100dvh !important;
      transform: translateX(-105%) !important;
      opacity: 1;
      visibility: visible;
      pointer-events: none;
      border-radius: 0 24px 24px 0;
      box-shadow: 0 24px 70px rgba(0,0,0,.28);
      transition: transform 280ms cubic-bezier(.22,.75,.24,1) !important;
      z-index: 2147483646;
    }

    html.pmd-sm2-mobile-open #pmd-side-menu2 {
      transform: translateX(0) !important;
      pointer-events: auto;
    }

    #pmd-side-menu2-backdrop {
      position: fixed;
      inset: 0;
      z-index: 2147483645;
      background: rgba(8,18,16,.32);
      backdrop-filter: blur(7px);
      -webkit-backdrop-filter: blur(7px);
      opacity: 0;
      visibility: hidden;
      pointer-events: none;
      transition: opacity 280ms ease, visibility 280ms ease;
    }

    html.pmd-sm2-mobile-open #pmd-side-menu2-backdrop {
      opacity: 1;
      visibility: visible;
      pointer-events: auto;
    }

    body.pmd-sm2-scroll-locked { overflow: hidden !important; }
  }
</style>

@php
    $pmdZeroShiftPath = trim(request()->path(), '/');
    $pmdZeroShiftRoute = in_array(
        $pmdZeroShiftPath,
        ['admin/reservations2', 'admin/dashboard2'],
        true
    );
@endphp

@if($pmdZeroShiftRoute)
<script id="pmd-r2-zero-shift-geometry-guard-v2">
(function () {
  'use strict';

  if (window.PMDR2ZeroShiftGuardV2) {
    return;
  }

  var route = String(window.location.pathname || '').replace(/\/+$/, '');

  if (route !== '/admin/reservations2' && route !== '/admin/dashboard2') {
    return;
  }

  var html = document.documentElement;
  var frameId = 0;
  var timeoutId = 0;
  var done = false;
  var stableFrames = 0;
  var firstStableAt = 0;
  var lastSignature = '';
  var reason = 'booting';

  /*
   * PMD_R2_ZERO_SHIFT_NO_WHITE_BLINK_V2
   *
   * V1 correctly prevented the Floor tables from jumping, but it did so by
   * hiding the COMPLETE #pmd-reservations2 root until Floor geometry settled.
   * Dashboard2 also has a legacy whole-root opacity lock, while Reservations2
   * has the older V6 prepaint whole-root visibility lock. Those two locks were
   * the source of the single white/empty flash on refresh.
   *
   * V2 keeps the entire page shell visible from first paint and hides ONLY the
   * dynamic geometry surfaces while they settle:
   *   - Floor canvas/tables
   *   - Reservation cards grid
   *
   * The Floor frame, toolbar, KPI cards, page background, analytics shell and
   * Side Menu therefore never disappear. Once Floor geometry is stable for
   * four consecutive animation frames, only the dynamic surfaces are released
   * directly at their final coordinates with no fade/slide/scale animation.
   */
  html.classList.add('pmd-r2-zero-shift-boot-v2');

  if (!document.getElementById('pmd-r2-zero-shift-critical-v2')) {
    var style = document.createElement('style');
    style.id = 'pmd-r2-zero-shift-critical-v2';
    style.textContent = [
      /* Neutralize Reservations2 V6 whole-root prepaint lock. */
      'html.pmd-r2-v6-booting #pmd-reservations2 {',
      '  visibility:visible !important;',
      '  opacity:1 !important;',
      '  pointer-events:auto !important;',
      '  transition:none !important;',
      '  animation:none !important;',
      '}',

      /* Neutralize Dashboard2 V1413 whole-root opacity lock. */
      'html.pmd-dashboard2-r2-exact:not(.pmd-dashboard2-v1413-ready) body #pmd-reservations2 {',
      '  visibility:visible !important;',
      '  opacity:1 !important;',
      '  pointer-events:auto !important;',
      '  transition:none !important;',
      '  animation:none !important;',
      '}',

      /* The page shell itself is ALWAYS visible during boot. */
      'html.pmd-r2-zero-shift-boot-v2 #pmd-reservations2 {',
      '  visibility:visible !important;',
      '  opacity:1 !important;',
      '  pointer-events:auto !important;',
      '  transition:none !important;',
      '  animation:none !important;',
      '}',

      /* Hide only dynamic geometry surfaces while measurements settle. */
      'html.pmd-r2-zero-shift-boot-v2 #pmd-r2-shared-floor-canvas-v310 [data-floor-canvas],',
      'html.pmd-r2-zero-shift-boot-v2 #pmd-r2-reservation-grid-v320 {',
      '  visibility:hidden !important;',
      '  opacity:0 !important;',
      '  pointer-events:none !important;',
      '  transition:none !important;',
      '  animation:none !important;',
      '}',

      /* Never animate individual Floor/table/card geometry during boot. */
      'html.pmd-r2-zero-shift-boot-v2 #pmd-reservations2 .pmd-floor-v1__table,',
      'html.pmd-r2-zero-shift-boot-v2 #pmd-reservations2 [data-floor-canvas],',
      'html.pmd-r2-zero-shift-boot-v2 #pmd-reservations2 #pmd-r2-reservation-grid-v320,',
      'html.pmd-r2-zero-shift-boot-v2 #pmd-reservations2 #pmd-r2-reservation-grid-v320 > * {',
      '  transition:none !important;',
      '  animation:none !important;',
      '}',

      'html.pmd-r2-zero-shift-boot-v2 #pmd-reservations2 [data-floor-canvas] {',
      '  will-change:auto !important;',
      '}'
    ].join('\n');

    document.head.appendChild(style);
  }

  function root() {
    return document.getElementById('pmd-reservations2');
  }

  function floor() {
    return document.getElementById('pmd-r2-shared-floor-canvas-v310');
  }

  function dynamicTargets() {
    var result = [];
    var floorRoot = floor();

    if (floorRoot) {
      var canvas = floorRoot.querySelector('[data-floor-canvas]');
      if (canvas) result.push(canvas);
    }

    var reservationGrid = document.getElementById('pmd-r2-reservation-grid-v320');
    if (reservationGrid) result.push(reservationGrid);

    return result;
  }

  function keepShellVisible() {
    var pageRoot = root();
    if (!pageRoot) return;

    pageRoot.style.setProperty('visibility', 'visible', 'important');
    pageRoot.style.setProperty('opacity', '1', 'important');
    pageRoot.style.setProperty('pointer-events', 'auto', 'important');
    pageRoot.style.setProperty('transition', 'none', 'important');
    pageRoot.style.setProperty('animation', 'none', 'important');
  }

  function enforceDynamicHidden() {
    if (done) return;

    dynamicTargets().forEach(function (node) {
      node.style.setProperty('visibility', 'hidden', 'important');
      node.style.setProperty('opacity', '0', 'important');
      node.style.setProperty('pointer-events', 'none', 'important');
    });
  }

  function releaseDynamic() {
    dynamicTargets().forEach(function (node) {
      node.style.removeProperty('visibility');
      node.style.removeProperty('opacity');
      node.style.removeProperty('pointer-events');
    });
  }

  function rounded(value) {
    return Math.round(Number(value || 0) * 10) / 10;
  }

  function rectSignature(node) {
    var rect = node.getBoundingClientRect();

    return [
      rounded(rect.left),
      rounded(rect.top),
      rounded(rect.width),
      rounded(rect.height)
    ].join(',');
  }

  function geometrySignature() {
    var pageRoot = root();
    var floorRoot = floor();

    if (!pageRoot || !floorRoot) {
      return null;
    }

    var canvas = floorRoot.querySelector('[data-floor-canvas]');
    var tables = Array.prototype.slice.call(
      floorRoot.querySelectorAll('[data-floor-table]')
    );

    if (!canvas || tables.length === 0) {
      return null;
    }

    if (floorRoot.getAttribute('aria-busy') !== 'false') {
      return null;
    }

    if (route === '/admin/reservations2') {
      if (
        !document.getElementById('pmd-r2-date-button-v430') ||
        !document.getElementById('pmd-r2-calendar-toggle-v1')
      ) {
        return null;
      }
    }

    var parts = [
      'tables=' + tables.length,
      'floor=' + rectSignature(floorRoot),
      'canvas=' + rectSignature(canvas),
      'transform=' + getComputedStyle(canvas).transform,
      'scroll=' + [
        floorRoot.scrollWidth,
        floorRoot.scrollHeight
      ].join(',')
    ];

    tables.forEach(function (table) {
      parts.push(
        String(table.getAttribute('data-floor-table') || '') +
        ':' + rectSignature(table)
      );
    });

    return parts.join('|');
  }

  function reveal(nextReason) {
    if (done) return;

    done = true;
    reason = nextReason || 'stable';

    if (frameId) {
      window.cancelAnimationFrame(frameId);
    }

    if (timeoutId) {
      window.clearTimeout(timeoutId);
    }

    keepShellVisible();

    html.classList.remove(
      'pmd-r2-zero-shift-boot-v2',
      'pmd-r2-zero-shift-boot-v1',
      'pmd-r2-v6-booting'
    );

    html.classList.add(
      'pmd-r2-zero-shift-ready-v2',
      'pmd-r2-v6-ready'
    );

    if (route === '/admin/dashboard2') {
      html.classList.add('pmd-dashboard2-v1413-ready');
    }

    /*
     * Release only after removing the boot class, so the dynamic surface is
     * exposed in its final state without a transition between opacity values.
     */
    releaseDynamic();

    var pageRoot = root();
    if (pageRoot) {
      pageRoot.setAttribute('data-pmd-zero-shift-ready', '2');
    }

    console.info('[PMD R2 Zero Shift Guard V2] Dynamic surfaces released', {
      route: route,
      reason: reason,
      stableFrames: stableFrames,
      targets: dynamicTargets().length
    });
  }

  function tick(now) {
    if (done) return;

    keepShellVisible();
    enforceDynamicHidden();

    var signature = geometrySignature();

    if (!signature) {
      stableFrames = 0;
      firstStableAt = 0;
      lastSignature = '';
    } else if (signature === lastSignature) {
      stableFrames += 1;

      if (!firstStableAt) {
        firstStableAt = now;
      }
    } else {
      lastSignature = signature;
      stableFrames = 1;
      firstStableAt = now;
    }

    /*
     * Four identical animation frames plus a minimum settle window means
     * render() -> fit()/zoom plus toolbar/card setup completed before the
     * dynamic Floor/card layer becomes visible.
     */
    if (
      stableFrames >= 4 &&
      firstStableAt &&
      now - firstStableAt >= 48
    ) {
      reveal('stable-floor-geometry');
      return;
    }

    frameId = window.requestAnimationFrame(tick);
  }

  /* Make the shell visible immediately, before the first measurement frame. */
  keepShellVisible();
  enforceDynamicHidden();

  frameId = window.requestAnimationFrame(tick);

  timeoutId = window.setTimeout(function () {
    reveal('safety-timeout');
  }, 6500);

  window.PMDR2ZeroShiftGuardV2 = {
    version: '2.0.0-no-white-blink',
    route: route,
    reveal: reveal,
    audit: function () {
      return {
        version: '2.0.0-no-white-blink',
        route: route,
        done: done,
        reason: reason,
        stableFrames: stableFrames,
        signatureReady: Boolean(lastSignature),
        dynamicTargets: dynamicTargets().length,
        rootVisibility: root()
          ? getComputedStyle(root()).visibility
          : null,
        rootOpacity: root()
          ? getComputedStyle(root()).opacity
          : null,
        tables: floor()
          ? floor().querySelectorAll('[data-floor-table]').length
          : 0
      };
    }
  };
})();
</script>
@endif
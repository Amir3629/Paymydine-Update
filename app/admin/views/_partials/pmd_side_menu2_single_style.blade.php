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
<script id="pmd-r2-zero-shift-geometry-guard-v1">
(function () {
  'use strict';

  if (window.PMDR2ZeroShiftGuardV1) {
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

  html.classList.add('pmd-r2-zero-shift-boot-v1');

  if (!document.getElementById('pmd-r2-zero-shift-critical-v1')) {
    var style = document.createElement('style');
    style.id = 'pmd-r2-zero-shift-critical-v1';
    style.textContent = [
      'html.pmd-r2-zero-shift-boot-v1 #pmd-reservations2 {',
      '  visibility:hidden !important;',
      '  opacity:0 !important;',
      '  pointer-events:none !important;',
      '  transition:none !important;',
      '  animation:none !important;',
      '}',
      'html.pmd-r2-zero-shift-boot-v1 #pmd-reservations2 .pmd-floor-v1__table,',
      'html.pmd-r2-zero-shift-boot-v1 #pmd-reservations2 [data-floor-canvas],',
      'html.pmd-r2-zero-shift-boot-v1 #pmd-reservations2 .pmd-r2-kpi,',
      'html.pmd-r2-zero-shift-boot-v1 #pmd-reservations2 #pmd-r2-reservation-grid-v320 > * {',
      '  transition:none !important;',
      '  animation:none !important;',
      '}',
      'html.pmd-r2-zero-shift-boot-v1 #pmd-reservations2 [data-floor-canvas] {',
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

  function enforceHidden(node) {
    if (!node || done) return;

    node.style.setProperty('visibility', 'hidden', 'important');
    node.style.setProperty('opacity', '0', 'important');
    node.style.setProperty('pointer-events', 'none', 'important');
    node.style.setProperty('transition', 'none', 'important');
    node.style.setProperty('animation', 'none', 'important');
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

    var pageRoot = root();

    html.classList.remove(
      'pmd-r2-zero-shift-boot-v1',
      'pmd-r2-v6-booting'
    );

    html.classList.add(
      'pmd-r2-zero-shift-ready-v1',
      'pmd-r2-v6-ready'
    );

    if (route === '/admin/dashboard2') {
      html.classList.add('pmd-dashboard2-v1413-ready');
    }

    if (pageRoot) {
      pageRoot.style.setProperty('visibility', 'visible', 'important');
      pageRoot.style.setProperty('opacity', '1', 'important');
      pageRoot.style.setProperty('pointer-events', 'auto', 'important');
      pageRoot.style.setProperty('transition', 'none', 'important');
      pageRoot.style.setProperty('animation', 'none', 'important');
      pageRoot.setAttribute('data-pmd-zero-shift-ready', '1');
    }

    console.info('[PMD R2 Zero Shift Guard V1] Revealed', {
      route: route,
      reason: reason,
      stableFrames: stableFrames
    });
  }

  function tick(now) {
    if (done) return;

    var pageRoot = root();
    enforceHidden(pageRoot);

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
     * the floor engine's post-render fit/zoom task and toolbar/card setup
     * have completed before a single table becomes visible.
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

  frameId = window.requestAnimationFrame(tick);

  timeoutId = window.setTimeout(function () {
    reveal('safety-timeout');
  }, 6500);

  window.PMDR2ZeroShiftGuardV1 = {
    version: '1.0.0',
    route: route,
    reveal: reveal,
    audit: function () {
      return {
        version: '1.0.0',
        route: route,
        done: done,
        reason: reason,
        stableFrames: stableFrames,
        signatureReady: Boolean(lastSignature),
        tables: floor()
          ? floor().querySelectorAll('[data-floor-table]').length
          : 0
      };
    }
  };
})();
</script>
@endif
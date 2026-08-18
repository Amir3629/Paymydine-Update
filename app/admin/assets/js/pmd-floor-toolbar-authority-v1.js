/* ============================================================
   PMD_FLOOR_TOOLBAR_AUTHORITY_V7_R56_READY

   Single visible Floor-mode presentation authority.

   Core owns:
     - stripMode state
     - setStripMode behavior
     - persistence/cookies
     - table coordinates/lifecycle

   This file owns only:
     - the one visible static mode button
     - its current action icon/label
     - forwarding its click to the hidden native strip control

   R56 does NOT depend on a separate bridge being ready.
   ============================================================ */
(function () {
  'use strict';

  var ROUTES = {
    '/admin/dashboardlab': true,
    '/admin/managerlab': true,
    '/admin/reservationslab': true,
    '/admin/cashierlab': true
  };

  var route = String(window.location.pathname || '').replace(/\/+$/, '');
  if (!ROUTES[route]) return;

  var booted = false;
  var root = null;
  var toolbar = null;
  var observer = null;
  var rafPending = false;
  var bootAttempts = 0;

  function locale() {
    var value = String(
      (root && root.getAttribute('data-pmd-floor-feature-locale')) ||
      window.PMD_ADMIN_LOCALE ||
      document.documentElement.lang ||
      'en'
    ).toLowerCase();
    return value.indexOf('de') === 0 ? 'de' : 'en';
  }

  function floorState() {
    return root && root.__pmdFloorV1 && typeof root.__pmdFloorV1.getState === 'function'
      ? root.__pmdFloorV1.getState()
      : null;
  }

  function nativeStrip() {
    if (!root) return null;
    return Array.prototype.slice.call(root.querySelectorAll('[data-floor-strip]')).find(function (node) {
      return !node.closest('#pmd-r2-floor-toolbar-v316');
    }) || null;
  }

  function readOneRow() {
    var state = floorState();
    if (state && typeof state.stripMode === 'boolean') {
      return { value: Boolean(state.stripMode), source: '__pmdFloorV1.stripMode' };
    }

    var native = nativeStrip();
    if (native) {
      var pressed = native.getAttribute('aria-pressed');
      if (pressed === 'true' || pressed === 'false') {
        return { value: pressed === 'true', source: 'native aria-pressed' };
      }
    }

    return {
      value: Boolean(root && root.classList.contains('is-strip-mode')),
      source: 'root class'
    };
  }

  function actionLabel(oneRow) {
    if (oneRow) return locale() === 'de' ? 'Gesamter Floor' : 'Full Floor';
    return locale() === 'de' ? 'Eine Reihe' : 'One row';
  }

  function cornersIcon() {
    return (
      '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" ' +
      'stroke="currentColor" stroke-width="1.45" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M9 4H4v5"></path>' +
      '<path d="M15 4h5v5"></path>' +
      '<path d="M20 15v5h-5"></path>' +
      '<path d="M9 20H4v-5"></path>' +
      '</svg>'
    );
  }

  function collapseIcon() {
    return (
      '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" ' +
      'stroke="currentColor" stroke-width="1.45" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M4 4l4.5 4.5"></path><path d="M5.75 8.5H8.5V5.75"></path>' +
      '<path d="M20 4l-4.5 4.5"></path><path d="M15.5 5.75V8.5h2.75"></path>' +
      '<path d="M4 20l4.5-4.5"></path><path d="M8.5 18.25V15.5H5.75"></path>' +
      '<path d="M20 20l-4.5-4.5"></path><path d="M18.25 15.5H15.5v2.75"></path>' +
      '</svg>'
    );
  }

  function quarantineNative() {
    var native = nativeStrip();
    if (!native) return;
    native.setAttribute('aria-hidden', 'true');
    native.setAttribute('tabindex', '-1');
    native.style.setProperty('display', 'none', 'important');
    native.style.setProperty('visibility', 'hidden', 'important');
    native.style.setProperty('pointer-events', 'none', 'important');
  }

  function render() {
    if (!root || !toolbar) return false;

    quarantineNative();

    var mode = readOneRow();
    var oneRow = mode.value;
    var strip = toolbar.querySelector('[data-pmd-r2-tool="strip"]');
    if (!strip) return false;

    var label = actionLabel(oneRow);
    var iconName = oneRow ? 'expand-corners' : 'collapse';
    var expected = iconName;

    strip.setAttribute('aria-pressed', oneRow ? 'true' : 'false');
    strip.setAttribute('aria-label', label);
    strip.setAttribute('title', label);
    strip.setAttribute('data-bs-original-title', label);

    if (strip.getAttribute('data-pmd-floor-toggle-icon') !== expected || strip.querySelectorAll(':scope > svg').length !== 1) {
      strip.setAttribute('data-pmd-floor-toggle-icon', expected);
      strip.innerHTML = oneRow ? cornersIcon() : collapseIcon();
    }

    root.setAttribute('data-pmd-floor-toolbar-r56', oneRow ? 'row' : 'full');
    root.setAttribute('data-pmd-floor-toolbar-state-source', mode.source);
    return true;
  }

  function scheduleRender() {
    if (rafPending) return;
    rafPending = true;
    window.requestAnimationFrame(function () {
      rafPending = false;
      render();
    });
  }

  function onToolbarClick(event) {
    var button = event.target && event.target.closest
      ? event.target.closest('[data-pmd-r2-tool="strip"]')
      : null;

    if (!button || !toolbar || !toolbar.contains(button)) return;

    event.preventDefault();
    event.stopPropagation();

    var native = nativeStrip();
    if (!native || native.disabled) return;

    native.click();

    /* Core setStripMode is synchronous, then render()/fit may follow. */
    render();
    scheduleRender();
    window.setTimeout(render, 40);
    window.setTimeout(render, 140);
  }

  function audit() {
    var mode = root ? readOneRow() : { value: false, source: null };
    var strip = toolbar ? toolbar.querySelector('[data-pmd-r2-tool="strip"]') : null;
    var native = nativeStrip();
    var nativeStyle = native ? window.getComputedStyle(native) : null;

    return {
      version: '7.0.0-r56-ready-corners',
      writer: booted ? 'PMDFloorToolbarAuthorityV1' : null,
      ready: booted,
      rootFound: Boolean(root),
      toolbarFound: Boolean(toolbar),
      stateMode: root ? (mode.value ? 'row' : 'full') : null,
      stateSource: mode.source,
      stripPressed: strip ? strip.getAttribute('aria-pressed') : null,
      stripIcon: strip ? strip.getAttribute('data-pmd-floor-toggle-icon') : null,
      stripWidth: strip ? Math.round(strip.getBoundingClientRect().width) : null,
      stripHeight: strip ? Math.round(strip.getBoundingClientRect().height) : null,
      stripVisibleText: strip ? String(strip.textContent || '').trim() : null,
      nativeStripFound: Boolean(native),
      nativeStripVisible: native && nativeStyle
        ? (!native.hidden && nativeStyle.display !== 'none' && nativeStyle.visibility !== 'hidden')
        : false,
      bridgeDependency: false,
      locale: root ? locale() : null
    };
  }

  function boot() {
    if (booted) return true;

    root = document.getElementById('pmd-r2-shared-floor-canvas-v310');
    toolbar = document.getElementById('pmd-r2-floor-toolbar-v316');

    if (!root || !toolbar) return false;

    booted = true;
    toolbar.addEventListener('click', onToolbarClick, false);

    observer = new MutationObserver(scheduleRender);
    observer.observe(root, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['class', 'aria-pressed']
    });

    window.addEventListener('pmd:floor:updated', scheduleRender, false);
    window.addEventListener('pmd:floor:changed', scheduleRender, false);
    document.addEventListener('pageContentLoaded', scheduleRender, false);
    window.addEventListener('pageshow', scheduleRender, false);
    window.addEventListener('resize', scheduleRender, false);

    render();
    return true;
  }

  function ensureBoot() {
    if (boot()) return;
    bootAttempts += 1;
    if (bootAttempts < 80) {
      window.setTimeout(ensureBoot, 100);
    }
  }

  window.PMDFloorToolbarAuthorityV1 = {
    version: '7.0.0-r56-ready-corners',
    apply: function () {
      if (!booted) boot();
      return render();
    },
    audit: audit
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ensureBoot, { once: true });
  } else {
    ensureBoot();
  }
})();



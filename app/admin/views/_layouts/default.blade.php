





<!-- PMD_WAITER_DASHBOARD_V56_PAUSE_READ_REFRESH_EDIT_START -->
<script id="pmd-waiter-dashboard-v56-pause-read-refresh-edit-script">
(function () {
  if (!/\/admin\/dashboardwaiter(?:$|[?#])/.test(location.pathname + location.search + location.hash)) return;
  if (window.PMD_WAITER_DASHBOARD_V56_PAUSE_READ_REFRESH_EDIT) return;
  window.PMD_WAITER_DASHBOARD_V56_PAUSE_READ_REFRESH_EDIT = true;

  /*
    V56:
    Pause waiter dashboard READ refresh while Edit Layout is active.
    This avoids floor jumps without blocking DOM appendChild/innerHTML.
    Therefore toolbar buttons and merged-table icons stay visible.
  */

  var paused = false;
  var fetchBlocked = 0;
  var xhrBlocked = 0;
  var lastLogAt = 0;

  function root() {
    return document.querySelector('#pmd-waiter-dashboard-root');
  }

  function isEditing() {
    var r = root();
    return !!(r && r.classList.contains('pmd-w19-editing'));
  }

  function shouldPause() {
    return paused || isEditing();
  }

  function lock(reason) {
    if (!paused) console.info('[PMD] V56 waiter read refresh pause ON:', reason);
    paused = true;
  }

  function unlock(reason) {
    if (paused) console.info('[PMD] V56 waiter read refresh pause OFF:', reason, {
      fetchBlocked: fetchBlocked,
      xhrBlocked: xhrBlocked
    });
    paused = false;
  }

  function urlString(input) {
    try {
      if (typeof input === 'string') return input;
      if (input && input.url) return String(input.url);
      return String(input || '');
    } catch (e) {
      return '';
    }
  }

  function methodString(input, init, fallback) {
    try {
      if (init && init.method) return String(init.method).toUpperCase();
      if (input && input.method) return String(input.method).toUpperCase();
      return String(fallback || 'GET').toUpperCase();
    } catch (e) {
      return 'GET';
    }
  }

  function isWaiterReadUrl(url, method) {
    url = String(url || '');
    method = String(method || 'GET').toUpperCase();

    if (method !== 'GET' && method !== 'HEAD') return false;
    if (url.indexOf('/admin/pmd-waiter-dashboard') === -1) return false;

    /*
      Pause only read/poll endpoints.
      Do NOT block save/update/action endpoints.
    */
    if (/save|status-update|unmerge|merge-tables|call|note|checkout|payment/i.test(url)) return false;

    return true;
  }

  function logBlock(kind, url) {
    var now = Date.now();
    if (now - lastLogAt > 900) {
      lastLogAt = now;
      console.info('[PMD] V56 paused waiter read refresh during edit:', kind, url);
    }
  }

  /*
    Fetch gate: keep polling promise pending while editing.
    After save/edit ends, the next normal poll will run fresh.
  */
  if (window.fetch && !window.fetch.__pmdV56Patched) {
    var origFetch = window.fetch;

    var patchedFetch = function (input, init) {
      var url = urlString(input);
      var method = methodString(input, init, 'GET');

      if (shouldPause() && isWaiterReadUrl(url, method)) {
        fetchBlocked++;
        logBlock('fetch', url);

        return new Promise(function () {
          /* intentionally pending until page state changes / next normal poll */
        });
      }

      return origFetch.apply(this, arguments);
    };

    patchedFetch.__pmdV56Patched = true;
    window.fetch = patchedFetch;
  }

  /*
    XHR gate for jQuery/ajax based polling.
  */
  if (window.XMLHttpRequest && !XMLHttpRequest.prototype.__pmdV56Patched) {
    XMLHttpRequest.prototype.__pmdV56Patched = true;

    var origOpen = XMLHttpRequest.prototype.open;
    var origSend = XMLHttpRequest.prototype.send;

    XMLHttpRequest.prototype.open = function (method, url) {
      this.__pmdV56Method = String(method || 'GET').toUpperCase();
      this.__pmdV56Url = String(url || '');
      return origOpen.apply(this, arguments);
    };

    XMLHttpRequest.prototype.send = function () {
      var url = this.__pmdV56Url || '';
      var method = this.__pmdV56Method || 'GET';

      if (shouldPause() && isWaiterReadUrl(url, method)) {
        xhrBlocked++;
        logBlock('xhr', url);

        /*
          Do not send this stale read request.
          Save/action requests are not matched and continue normally.
        */
        return;
      }

      return origSend.apply(this, arguments);
    };
  }

  document.addEventListener('click', function (e) {
    var t = e && e.target && e.target.nodeType === 1 ? e.target : null;
    if (!t) return;

    if (t.closest('[data-w19-edit]')) {
      /*
        Let UI switch to edit/save state first, then pause read refresh.
      */
      setTimeout(function () {
        if (isEditing()) lock('edit mode confirmed');
      }, 120);
      return;
    }

    if (t.closest('[data-w19-save]')) {
      unlock('save clicked');
      setTimeout(function () { unlock('save grace'); }, 2500);
      return;
    }
  }, true);

  setInterval(function () {
    if (isEditing() && !paused) {
      lock('detected edit mode');
    }

    if (paused && !isEditing()) {
      unlock('edit ended');
    }
  }, 500);

  window.PMDWaiterV56PauseReadRefreshEdit = {
    lock: function () { lock('manual'); },
    unlock: function () { unlock('manual'); },
    debug: function () {
      return {
        paused: paused,
        isEditing: isEditing(),
        fetchBlocked: fetchBlocked,
        xhrBlocked: xhrBlocked,
        rootClass: root() ? root().className : '',
        toolsCount: document.querySelectorAll('#pmd-waiter-dashboard-root [data-w19-edit], #pmd-waiter-dashboard-root [data-w19-save], #pmd-waiter-dashboard-root [data-w19-merge], #pmd-waiter-dashboard-root [data-w19-compact]').length,
        mergedCount: document.querySelectorAll('#pmd-waiter-dashboard-root .pmd-v40-merged-table, #pmd-waiter-dashboard-root .pmd-w19-merged-table, #pmd-waiter-dashboard-root .pmd-v18-merged-table').length
      };
    }
  };

  console.info('[PMD] Waiter Dashboard V56 pause read refresh during edit active');
})();
</script>
<!-- PMD_WAITER_DASHBOARD_V56_PAUSE_READ_REFRESH_EDIT_END -->


<!-- PMD_WAITER_DASHBOARD_V50_REAL_FLOOR_DRAG_CLAMP_START -->
<style id="pmd-waiter-dashboard-v50-real-floor-drag-clamp-style">
/*
  V50:
  Real floor edit drag source fix.
  - replaces broken V37
  - table follows mouse/pointer by center percent
  - stops old handlers while editing
  - clamps tables inside floor card before save
*/

#pmd-waiter-dashboard-root.pmd-w19-editing .pmd-w5-floor-map-real .pmd-w5-table[data-table] {
  cursor: grab !important;
  touch-action: none !important;
  user-select: none !important;
  -webkit-user-select: none !important;
}

#pmd-waiter-dashboard-root.pmd-v50-floor-dragging,
#pmd-waiter-dashboard-root.pmd-v50-floor-dragging * {
  user-select: none !important;
  -webkit-user-select: none !important;
}

#pmd-waiter-dashboard-root .pmd-v50-dragging-table {
  cursor: grabbing !important;
  z-index: 999999 !important;
  opacity: .96 !important;
  box-shadow: 0 22px 54px rgba(7,13,36,.28) !important;
}

/* Expanded waiter floor uses stored left/top as CENTER point */
#pmd-waiter-dashboard-root .pmd-w5-floor-map-real:not(.pmd-v40-compact-authority) .pmd-w5-table[data-table] {
  position: absolute !important;
  transform: translate(-50%, -50%) !important;
}
</style>

<script id="pmd-waiter-dashboard-v50-real-floor-drag-clamp-script">
(function () {
  if (!/\/admin\/dashboardwaiter(?:$|[?#])/.test(location.pathname + location.search + location.hash)) return;
  if (window.PMD_WAITER_DASHBOARD_V50_REAL_FLOOR_DRAG_CLAMP) return;
  window.PMD_WAITER_DASHBOARD_V50_REAL_FLOOR_DRAG_CLAMP = true;

  var drag = null;
  var suppressClickUntil = 0;
  var PAD = 10;

  function root() {
    return document.querySelector('#pmd-waiter-dashboard-root');
  }

  function map() {
    return document.querySelector('#pmd-waiter-dashboard-root .pmd-w5-floor-map-real');
  }

  function isEditing() {
    var r = root();
    return !!(r && r.classList.contains('pmd-w19-editing'));
  }

  function isCompact() {
    var r = root();
    var m = map();
    return !!(
      (r && r.classList.contains('pmd-w19-compact')) ||
      (m && m.classList.contains('pmd-v40-compact-authority'))
    );
  }

  function tableFromEvent(e) {
    if (!e || !e.target || e.target.nodeType !== 1) return null;
    return e.target.closest('#pmd-waiter-dashboard-root .pmd-w5-floor-map-real .pmd-w5-table[data-table]');
  }

  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }

  function pct(n) {
    return (Math.round(n * 100) / 100).toFixed(2) + '%';
  }

  function parsePct(v) {
    var n = parseFloat(String(v || '').replace('%', ''));
    return isFinite(n) ? n : null;
  }

  function clampTableIntoMap(el) {
    var m = map();
    if (!m || !el || isCompact()) return false;

    var mr = m.getBoundingClientRect();
    var tr = el.getBoundingClientRect();

    if (!mr.width || !mr.height || !tr.width || !tr.height) return false;

    var leftPct = parsePct(el.style.left);
    var topPct = parsePct(el.style.top);

    if (leftPct === null || topPct === null) return false;

    var centerX = (leftPct / 100) * mr.width;
    var centerY = (topPct / 100) * mr.height;

    var minX = (tr.width / 2) + PAD;
    var maxX = mr.width - (tr.width / 2) - PAD;
    var minY = (tr.height / 2) + PAD;
    var maxY = mr.height - (tr.height / 2) - PAD;

    var nextX = clamp(centerX, minX, maxX);
    var nextY = clamp(centerY, minY, maxY);

    var changed = Math.abs(nextX - centerX) > 0.5 || Math.abs(nextY - centerY) > 0.5;

    if (changed) {
      el.style.left = pct((nextX / mr.width) * 100);
      el.style.top = pct((nextY / mr.height) * 100);
      el.style.position = 'absolute';
      el.style.transform = 'translate(-50%, -50%)';
    }

    return changed;
  }

  function clampAllTables() {
    if (isCompact()) return 0;

    var changed = 0;
    document.querySelectorAll('#pmd-waiter-dashboard-root .pmd-w5-floor-map-real .pmd-w5-table[data-table]').forEach(function (el) {
      if (clampTableIntoMap(el)) changed++;
    });

    return changed;
  }

  function moveDrag(e) {
    if (!drag || !e || typeof e.clientX !== 'number' || typeof e.clientY !== 'number') return;

    var m = map();
    if (!m) return;

    var mr = m.getBoundingClientRect();
    if (!mr.width || !mr.height) return;

    var centerX = e.clientX - mr.left - drag.offsetX + (drag.w / 2);
    var centerY = e.clientY - mr.top - drag.offsetY + (drag.h / 2);

    centerX = clamp(centerX, (drag.w / 2) + PAD, mr.width - (drag.w / 2) - PAD);
    centerY = clamp(centerY, (drag.h / 2) + PAD, mr.height - (drag.h / 2) - PAD);

    drag.el.style.left = pct((centerX / mr.width) * 100);
    drag.el.style.top = pct((centerY / mr.height) * 100);
    drag.el.style.position = 'absolute';
    drag.el.style.transform = 'translate(-50%, -50%)';
  }

  function startDrag(e) {
    if (!isEditing() || isCompact()) return;

    var table = tableFromEvent(e);
    if (!table) return;

    if (table.classList.contains('pmd-w19-in-merge') || table.classList.contains('pmd-v40-in-merge')) return;

    e.preventDefault();
    e.stopPropagation();
    if (e.stopImmediatePropagation) e.stopImmediatePropagation();

    var tr = table.getBoundingClientRect();

    drag = {
      el: table,
      offsetX: e.clientX - tr.left,
      offsetY: e.clientY - tr.top,
      w: tr.width,
      h: tr.height
    };

    var r = root();
    if (r) r.classList.add('pmd-v50-floor-dragging');
    table.classList.add('pmd-v50-dragging-table');

    moveDrag(e);
  }

  function onMove(e) {
    if (!drag) return;

    e.preventDefault();
    e.stopPropagation();
    if (e.stopImmediatePropagation) e.stopImmediatePropagation();

    moveDrag(e);
  }

  function finishDrag(e) {
    if (!drag) return;

    if (e && typeof e.clientX === 'number') moveDrag(e);

    var old = drag.el;
    drag = null;

    if (old) {
      old.classList.remove('pmd-v50-dragging-table');
      clampTableIntoMap(old);
      if (window.PMDWaiterV60No404SmartSnap && window.PMDWaiterV60No404SmartSnap.snapTable) {
        window.PMDWaiterV60No404SmartSnap.snapTable(old, 'drop');
      }
    }

    var r = root();
    if (r) r.classList.remove('pmd-v50-floor-dragging');

    suppressClickUntil = Date.now() + 650;

    if (e) {
      e.preventDefault();
      e.stopPropagation();
      if (e.stopImmediatePropagation) e.stopImmediatePropagation();
    }
  }

  function blockOldClick(e) {
    if (Date.now() < suppressClickUntil || (isEditing() && tableFromEvent(e))) {
      e.preventDefault();
      e.stopPropagation();
      if (e.stopImmediatePropagation) e.stopImmediatePropagation();
    }
  }

  function beforeSave(e) {
    var btn = e && e.target && e.target.nodeType === 1 ? e.target.closest('[data-w19-save]') : null;
    if (!btn) return;

    var changed = clampAllTables();
    if (window.PMDWaiterV60No404SmartSnap && window.PMDWaiterV60No404SmartSnap.snapAll) {
      window.PMDWaiterV60No404SmartSnap.snapAll('before save');
    }
    if (changed) console.info('[PMD] V50 clamped tables before save:', changed);
  }

  function run() {
    clampAllTables();
  }

  document.addEventListener('pointerdown', startDrag, true);
  document.addEventListener('pointermove', onMove, true);
  document.addEventListener('pointerup', finishDrag, true);
  document.addEventListener('pointercancel', finishDrag, true);

  document.addEventListener('mousedown', function (e) {
    if (!window.PointerEvent) startDrag(e);
  }, true);

  document.addEventListener('mousemove', function (e) {
    if (!window.PointerEvent) onMove(e);
  }, true);

  document.addEventListener('mouseup', function (e) {
    if (!window.PointerEvent) finishDrag(e);
  }, true);

  document.addEventListener('click', blockOldClick, true);
  document.addEventListener('click', beforeSave, true);
  window.addEventListener('blur', finishDrag, true);

  var timer = 0;
  function scheduleClamp() {
    clearTimeout(timer);
    timer = setTimeout(run, 180);
  }

  var obs = new MutationObserver(scheduleClamp);
  function bindObserver() {
    var m = map();
    if (!m) return;
    try {
      obs.observe(m, { childList: true, subtree: true, attributes: true, attributeFilter: ['style', 'class'] });
    } catch (e) {}
  }

  setTimeout(function () {
    run();
    bindObserver();
  }, 500);

  window.PMDWaiterV50FloorDragClamp = {
    run: run,
    clampAll: clampAllTables,
    debug: function () {
      var m = map();
      var mr = m ? m.getBoundingClientRect() : null;

      return Array.from(document.querySelectorAll('#pmd-waiter-dashboard-root .pmd-w5-floor-map-real .pmd-w5-table[data-table]')).map(function (el) {
        var r = el.getBoundingClientRect();
        return {
          table: el.dataset.table,
          x: mr ? Math.round(r.left - mr.left) : Math.round(r.left),
          y: mr ? Math.round(r.top - mr.top) : Math.round(r.top),
          w: Math.round(r.width),
          h: Math.round(r.height),
          left: el.style.left,
          top: el.style.top,
          className: el.className
        };
      });
    }
  };

  console.info('[PMD] Waiter Dashboard V50 real floor drag + clamp active');
})();
</script>
<!-- PMD_WAITER_DASHBOARD_V50_REAL_FLOOR_DRAG_CLAMP_END -->


<!-- PMD_WAITER_DASHBOARD_V61_STABLE_KIOSK_NO_JUMP_START -->
<style id="pmd-waiter-dashboard-v61-stable-kiosk-no-jump-style">
/*
  V61:
  Stable waiter dashboard kiosk layout.
  No setInterval layout fighting.
  Keeps:
  - side menu hidden
  - 404 card hidden
  - dashboard higher
  - map info legend
  - professional merge selection
  - smart table snap
*/

html.pmd-dashboardwaiter-kiosk-page,
html.pmd-dashboardwaiter-kiosk-page body {
  margin: 0 !important;
  padding: 0 !important;
  background: #f6f8fb !important;
  overflow-x: hidden !important;
}

/* Exact side menu */
html.pmd-dashboardwaiter-kiosk-page #side-nav-menu,
html.pmd-dashboardwaiter-kiosk-page ul#side-nav-menu,
html.pmd-dashboardwaiter-kiosk-page .nav#side-nav-menu {
  display: none !important;
  visibility: hidden !important;
  opacity: 0 !important;
  pointer-events: none !important;
  width: 0 !important;
  min-width: 0 !important;
  max-width: 0 !important;
  height: 0 !important;
  overflow: hidden !important;
  position: absolute !important;
  left: -99999px !important;
  top: -99999px !important;
}

/* Shell/header/sidebar */
html.pmd-dashboardwaiter-kiosk-page aside,
html.pmd-dashboardwaiter-kiosk-page nav#sidebar,
html.pmd-dashboardwaiter-kiosk-page nav.sidebar,
html.pmd-dashboardwaiter-kiosk-page .sidebar,
html.pmd-dashboardwaiter-kiosk-page .main-sidebar,
html.pmd-dashboardwaiter-kiosk-page .admin-sidebar,
html.pmd-dashboardwaiter-kiosk-page .app-sidebar,
html.pmd-dashboardwaiter-kiosk-page .layout-sidebar,
html.pmd-dashboardwaiter-kiosk-page .sidebar-wrapper,
html.pmd-dashboardwaiter-kiosk-page .side-nav,
html.pmd-dashboardwaiter-kiosk-page .sidenav,
html.pmd-dashboardwaiter-kiosk-page .side-menu,
html.pmd-dashboardwaiter-kiosk-page .navbar,
html.pmd-dashboardwaiter-kiosk-page .main-header,
html.pmd-dashboardwaiter-kiosk-page .admin-header,
html.pmd-dashboardwaiter-kiosk-page .app-header,
html.pmd-dashboardwaiter-kiosk-page .topbar,
html.pmd-dashboardwaiter-kiosk-page header {
  display: none !important;
  visibility: hidden !important;
  opacity: 0 !important;
  pointer-events: none !important;
}

/* Hide underlying 404 card */
html.pmd-dashboardwaiter-kiosk-page .card.bg-light.p-4.shadow-sm.m-4,
html.pmd-dashboardwaiter-kiosk-page [data-pmd-v61-hidden-404-card="1"] {
  display: none !important;
  visibility: hidden !important;
  opacity: 0 !important;
  height: 0 !important;
  min-height: 0 !important;
  margin: 0 !important;
  padding: 0 !important;
  overflow: hidden !important;
}

/* Remove offsets without timer-based JS */
html.pmd-dashboardwaiter-kiosk-page body,
html.pmd-dashboardwaiter-kiosk-page .wrapper,
html.pmd-dashboardwaiter-kiosk-page .main-wrapper,
html.pmd-dashboardwaiter-kiosk-page .page-wrapper,
html.pmd-dashboardwaiter-kiosk-page .content-wrapper,
html.pmd-dashboardwaiter-kiosk-page .main-content,
html.pmd-dashboardwaiter-kiosk-page .page-content,
html.pmd-dashboardwaiter-kiosk-page .content,
html.pmd-dashboardwaiter-kiosk-page .container,
html.pmd-dashboardwaiter-kiosk-page .container-fluid,
html.pmd-dashboardwaiter-kiosk-page main,
html.pmd-dashboardwaiter-kiosk-page #content,
html.pmd-dashboardwaiter-kiosk-page #page-wrapper {
  margin: 0 !important;
  padding: 0 !important;
  margin-left: 0 !important;
  padding-left: 0 !important;
  margin-top: 0 !important;
  padding-top: 0 !important;
  left: 0 !important;
  top: 0 !important;
  width: 100% !important;
  max-width: none !important;
}

/* stable position: no repeated JS rewriting */
html.pmd-dashboardwaiter-kiosk-page #pmd-waiter-dashboard-root {
  width: 100% !important;
  max-width: none !important;
  margin: -46px 0 0 0 !important;
  padding: 4px 20px 34px !important;
  left: 0 !important;
  transform: none !important;
}

/* floor map tools */
#pmd-waiter-dashboard-root .pmd-w5-floor-map-real {
  position: relative !important;
}

/* Smooth smart snap */
#pmd-waiter-dashboard-root .pmd-v61-smart-snapping {
  transition:
    left .18s cubic-bezier(.2,.8,.2,1),
    top .18s cubic-bezier(.2,.8,.2,1),
    transform .18s cubic-bezier(.2,.8,.2,1) !important;
}

/* Unmerge X hidden by default, visible only in merge mode */
#pmd-waiter-dashboard-root .pmd-v40-merged-table button,
#pmd-waiter-dashboard-root .pmd-w19-merged-table button,
#pmd-waiter-dashboard-root .pmd-v18-merged-table button,
#pmd-waiter-dashboard-root .pmd-w19-unmerge,
#pmd-waiter-dashboard-root .pmd-v40-unmerge {
  opacity: 0 !important;
  transform: scale(.72) !important;
  pointer-events: none !important;
  transition: opacity .14s ease, transform .14s ease !important;
}

#pmd-waiter-dashboard-root.pmd-w19-merging .pmd-v40-merged-table button,
#pmd-waiter-dashboard-root.pmd-w19-merging .pmd-w19-merged-table button,
#pmd-waiter-dashboard-root.pmd-w19-merging .pmd-v18-merged-table button,
#pmd-waiter-dashboard-root.pmd-w19-merging .pmd-w19-unmerge,
#pmd-waiter-dashboard-root.pmd-w19-merging .pmd-v40-unmerge {
  opacity: 1 !important;
  transform: scale(1) !important;
  pointer-events: auto !important;
}

/* professional merge selection */
#pmd-waiter-dashboard-root.pmd-w19-merging .pmd-w5-table.pmd-w19-selected,
#pmd-waiter-dashboard-root.pmd-w19-merging .pmd-w5-table.is-selected,
#pmd-waiter-dashboard-root.pmd-w19-merging .pmd-v61-merge-group-selected {
  border-color: #0f766e !important;
  outline: none !important;
  box-shadow:
    0 0 0 3px rgba(15,118,110,.18),
    0 14px 30px rgba(15,23,42,.18) !important;
  transform: translate(-50%, -50%) scale(1.025) !important;
}

/* map legend */
#pmd-waiter-dashboard-root .pmd-v61-map-info-btn {
  position: absolute !important;
  right: 16px !important;
  bottom: 16px !important;
  z-index: 10000 !important;
  width: 34px !important;
  height: 34px !important;
  border-radius: 999px !important;
  border: 1px solid rgba(15,23,42,.12) !important;
  background: rgba(255,255,255,.94) !important;
  color: #0f172a !important;
  display: grid !important;
  place-items: center !important;
  font-weight: 950 !important;
  font-size: 15px !important;
  cursor: pointer !important;
  box-shadow: 0 12px 28px rgba(15,23,42,.16) !important;
}

#pmd-waiter-dashboard-root .pmd-v61-map-legend {
  position: absolute !important;
  right: 16px !important;
  bottom: 58px !important;
  z-index: 10001 !important;
  width: 270px !important;
  max-width: calc(100% - 32px) !important;
  border-radius: 18px !important;
  background: rgba(255,255,255,.96) !important;
  border: 1px solid rgba(15,23,42,.12) !important;
  box-shadow: 0 22px 60px rgba(15,23,42,.18) !important;
  padding: 14px !important;
  transform: translateY(8px) scale(.98) !important;
  opacity: 0 !important;
  pointer-events: none !important;
  transition: opacity .16s ease, transform .16s ease !important;
  color: #0f172a !important;
}

#pmd-waiter-dashboard-root .pmd-v61-map-legend.is-open {
  opacity: 1 !important;
  transform: translateY(0) scale(1) !important;
  pointer-events: auto !important;
}

#pmd-waiter-dashboard-root .pmd-v61-map-legend h4 {
  margin: 0 0 10px !important;
  font-size: 13px !important;
  font-weight: 950 !important;
}

#pmd-waiter-dashboard-root .pmd-v61-legend-row {
  display: grid !important;
  grid-template-columns: 16px 1fr !important;
  gap: 9px !important;
  align-items: start !important;
  margin: 8px 0 !important;
  font-size: 12px !important;
  line-height: 1.3 !important;
}

#pmd-waiter-dashboard-root .pmd-v61-dot {
  width: 13px !important;
  height: 13px !important;
  border-radius: 999px !important;
  margin-top: 2px !important;
}
#pmd-waiter-dashboard-root .pmd-v61-dot-green { background: #22c55e !important; }
#pmd-waiter-dashboard-root .pmd-v61-dot-orange { background: #f97316 !important; }
#pmd-waiter-dashboard-root .pmd-v61-dot-red { background: #ef4444 !important; }
#pmd-waiter-dashboard-root .pmd-v61-dot-dark { background: #0f172a !important; }
</style>

<script id="pmd-waiter-dashboard-v61-stable-kiosk-no-jump-script">
(function () {
  if (!/\/admin\/dashboardwaiter(?:$|[?#])/.test(location.pathname + location.search + location.hash)) return;
  if (window.PMD_WAITER_DASHBOARD_V61_STABLE_KIOSK_NO_JUMP) return;
  window.PMD_WAITER_DASHBOARD_V61_STABLE_KIOSK_NO_JUMP = true;

  var PAD = 22;
  var GAP = 18;
  var observerStarted = false;

  function root() {
    return document.querySelector('#pmd-waiter-dashboard-root');
  }

  function map() {
    return document.querySelector('#pmd-waiter-dashboard-root .pmd-w5-floor-map-real');
  }

  function markPage() {
    document.documentElement.classList.add('pmd-dashboardwaiter-kiosk-page');
    if (document.body) document.body.classList.add('pmd-dashboardwaiter-kiosk-page');
  }

  function hardHide(el, reason) {
    if (!el || el === document.body || el === document.documentElement) return;
    var r = root();
    if (r && (el === r || r.contains(el))) return;

    el.style.setProperty('display', 'none', 'important');
    el.style.setProperty('visibility', 'hidden', 'important');
    el.style.setProperty('opacity', '0', 'important');
    el.style.setProperty('pointer-events', 'none', 'important');
    el.style.setProperty('width', '0', 'important');
    el.style.setProperty('min-width', '0', 'important');
    el.style.setProperty('max-width', '0', 'important');
    el.style.setProperty('overflow', 'hidden', 'important');
    el.setAttribute('data-pmd-v61-hidden-shell', reason || '1');
  }

  function hideSideNav() {
    var side = document.getElementById('side-nav-menu');
    if (!side) return;
    hardHide(side, 'side-nav-menu');

    var p = side.parentElement;
    var steps = 0;

    while (p && p !== document.body && p !== document.documentElement && steps < 8) {
      var cls = String((p.id || '') + ' ' + (p.className || '') + ' ' + p.tagName).toLowerCase();
      var r = root();
      if (r && (p === r || p.contains(r))) break;

      if (/side|sidebar|nav|menu|metis|layout|admin|app/.test(cls)) {
        hardHide(p, 'side-nav-parent');
      }

      p = p.parentElement;
      steps++;
    }
  }

  function hide404Card() {
    document.querySelectorAll('.card.bg-light.p-4.shadow-sm.m-4, .card').forEach(function (card) {
      var txt = (card.textContent || '').replace(/\s+/g, ' ').trim();
      if (/No page found/i.test(txt) && /There's no page at this address/i.test(txt)) {
        card.setAttribute('data-pmd-v61-hidden-404-card', '1');
        card.style.setProperty('display', 'none', 'important');
        card.style.setProperty('height', '0', 'important');
        card.style.setProperty('margin', '0', 'important');
        card.style.setProperty('padding', '0', 'important');
        card.style.setProperty('overflow', 'hidden', 'important');
      }
    });
  }

  function bindLegend() {
    var m = map();
    if (!m || m.querySelector('.pmd-v61-map-info-btn')) return;

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'pmd-v61-map-info-btn';
    btn.textContent = 'i';
    btn.setAttribute('aria-label', 'Floor color guide');

    var card = document.createElement('div');
    card.className = 'pmd-v61-map-legend';
    card.innerHTML = [
      '<h4>Floor color guide</h4>',
      '<div class="pmd-v61-legend-row"><span class="pmd-v61-dot pmd-v61-dot-green"></span><div><b>Green</b><br>Normal / no urgent action.</div></div>',
      '<div class="pmd-v61-legend-row"><span class="pmd-v61-dot pmd-v61-dot-orange"></span><div><b>Orange</b><br>Payment / partial / attention state.</div></div>',
      '<div class="pmd-v61-legend-row"><span class="pmd-v61-dot pmd-v61-dot-red"></span><div><b>Red</b><br>Urgent note, call, or priority issue.</div></div>',
      '<div class="pmd-v61-legend-row"><span class="pmd-v61-dot pmd-v61-dot-dark"></span><div><b>Merged</b><br>Color follows the highest-priority status inside the group.</div></div>'
    ].join('');

    btn.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      card.classList.toggle('is-open');
    });

    document.addEventListener('click', function (e) {
      if (!card.contains(e.target) && e.target !== btn) card.classList.remove('is-open');
    }, true);

    m.appendChild(btn);
    m.appendChild(card);
  }

  function isCompact() {
    var m = map();
    var r = root();
    return !!((m && m.classList.contains('pmd-v40-compact-authority')) || (r && r.classList.contains('pmd-w19-compact')));
  }

  function pct(n) {
    return (Math.round(n * 100) / 100).toFixed(2) + '%';
  }

  function parsePct(v) {
    var n = parseFloat(String(v || '').replace('%', ''));
    return isFinite(n) ? n : null;
  }

  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }

  function rectAt(cx, cy, w, h) {
    return {
      left: cx - w / 2,
      top: cy - h / 2,
      right: cx + w / 2,
      bottom: cy + h / 2,
      width: w,
      height: h
    };
  }

  function overlaps(a, b, gap) {
    return !(a.right + gap <= b.left || a.left >= b.right + gap || a.bottom + gap <= b.top || a.top >= b.bottom + gap);
  }

  function getCenter(el, mr) {
    var lp = parsePct(el.style.left);
    var tp = parsePct(el.style.top);
    if (lp !== null && tp !== null) return { x: (lp / 100) * mr.width, y: (tp / 100) * mr.height };

    var r = el.getBoundingClientRect();
    return { x: r.left - mr.left + r.width / 2, y: r.top - mr.top + r.height / 2 };
  }

  function occupied(ignoreEl) {
    var m = map();
    if (!m) return [];
    var mr = m.getBoundingClientRect();

    var selector = [
      '#pmd-waiter-dashboard-root .pmd-w5-floor-map-real .pmd-w5-table[data-table]',
    ].join(',');

    return Array.from(document.querySelectorAll(selector)).filter(function (el) {
      if (!el || el === ignoreEl) return false;
      var cs = getComputedStyle(el);
      return cs.display !== 'none' && cs.visibility !== 'hidden' && Number(cs.opacity) !== 0;
    }).map(function (el) {
      var r = el.getBoundingClientRect();
      return {
        left: r.left - mr.left,
        top: r.top - mr.top,
        right: r.right - mr.left,
        bottom: r.bottom - mr.top,
        width: r.width,
        height: r.height
      };
    });
  }

  function isClear(c, occ) {
    return !occ.some(function (o) { return overlaps(c, o, GAP); });
  }

  function bestFreeCenter(el) {
    var m = map();
    if (!m || !el) return null;

    var mr = m.getBoundingClientRect();
    var er = el.getBoundingClientRect();

    if (!mr.width || !mr.height || !er.width || !er.height) return null;

    var c0 = getCenter(el, mr);

    var minX = er.width / 2 + PAD;
    var maxX = mr.width - er.width / 2 - PAD;
    var minY = er.height / 2 + PAD;
    var maxY = mr.height - er.height / 2 - PAD;

    var sx = clamp(c0.x, minX, maxX);
    var sy = clamp(c0.y, minY, maxY);
    var occ = occupied(el);

    var direct = rectAt(sx, sy, er.width, er.height);
    if (isClear(direct, occ)) return { x: sx, y: sy, reason: 'direct' };

    var best = null;
    var bestScore = Infinity;

    for (var radius = 8; radius <= 340; radius += 8) {
      for (var deg = 0; deg < 360; deg += 18) {
        var rad = deg * Math.PI / 180;
        var x = clamp(sx + Math.cos(rad) * radius, minX, maxX);
        var y = clamp(sy + Math.sin(rad) * radius, minY, maxY);
        var cand = rectAt(x, y, er.width, er.height);

        if (!isClear(cand, occ)) continue;

        var dx = x - sx;
        var dy = y - sy;
        var score = dx * dx + dy * dy;

        if (score < bestScore) {
          bestScore = score;
          best = { x: x, y: y, reason: 'radius-' + radius };
        }
      }

      if (best) return best;
    }

    return { x: sx, y: sy, reason: 'fallback' };
  }

  function snapTable(el, reason) {
    if (!el || isCompact()) return false;
    if (!el.matches || !el.matches('#pmd-waiter-dashboard-root .pmd-w5-floor-map-real .pmd-w5-table[data-table]')) return false;

    var m = map();
    var center = bestFreeCenter(el);
    if (!m || !center) return false;

    var mr = m.getBoundingClientRect();
    var nextLeft = pct((center.x / mr.width) * 100);
    var nextTop = pct((center.y / mr.height) * 100);

    if (el.style.left === nextLeft && el.style.top === nextTop) return false;

    el.classList.add('pmd-v61-smart-snapping');
    el.style.left = nextLeft;
    el.style.top = nextTop;
    el.style.position = 'absolute';
    el.style.transform = 'translate(-50%, -50%)';

    setTimeout(function () { el.classList.remove('pmd-v61-smart-snapping'); }, 260);

    console.info('[PMD] V61 smart snapped table:', {
      table: el.dataset ? el.dataset.table : '',
      reason: reason || '',
      snapReason: center.reason,
      left: nextLeft,
      top: nextTop
    });

    return true;
  }

  function snapAll(reason) {
    if (isCompact()) return 0;
    var changed = 0;

    for (var pass = 0; pass < 3; pass++) {
      document.querySelectorAll('#pmd-waiter-dashboard-root .pmd-w5-floor-map-real .pmd-w5-table[data-table]').forEach(function (el) {
        if (snapTable(el, reason || ('pass-' + pass))) changed++;
      });
    }

    return changed;
  }

  function runStableOnce() {
    markPage();
    hideSideNav();
    hide404Card();
    bindLegend();
  }

  function startObserver() {
    if (observerStarted || !document.body) return;
    observerStarted = true;

    var obs = new MutationObserver(function (mutations) {
      var shouldRun = false;

      mutations.forEach(function (m) {
        if (m.type === 'childList' && (m.addedNodes.length || m.removedNodes.length)) shouldRun = true;
        if (m.type === 'attributes' && m.target && (m.target.id === 'side-nav-menu' || m.target.getAttribute('data-pmd-v61-hidden-404-card'))) shouldRun = true;
      });

      if (shouldRun) runStableOnce();
    });

    obs.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style', 'class']
    });
  }

  document.addEventListener('click', function (e) {
    var t = e && e.target && e.target.nodeType === 1 ? e.target : null;
    if (t && t.closest('[data-w19-save]')) snapAll('save click');
  }, true);

  runStableOnce();
  setTimeout(runStableOnce, 150);
  setTimeout(runStableOnce, 700);
  startObserver();

  window.PMDWaiterV61StableKioskNoJump = {
    run: runStableOnce,
    snapTable: snapTable,
    snapAll: snapAll,
    debug: function () {
      var r = root();
      var side = document.getElementById('side-nav-menu');

      return {
        root: !!r,
        rootTop: r ? Math.round(r.getBoundingClientRect().top) : null,
        sideNavExists: !!side,
        sideNavDisplay: side ? getComputedStyle(side).display : null,
        hidden404Cards: document.querySelectorAll('[data-pmd-v61-hidden-404-card]').length,
        infoButton: !!document.querySelector('#pmd-waiter-dashboard-root .pmd-v61-map-info-btn'),
        tableCount: document.querySelectorAll('#pmd-waiter-dashboard-root .pmd-w5-floor-map-real .pmd-w5-table[data-table]').length,
        mergedCount: document.querySelectorAll('#pmd-waiter-dashboard-root .pmd-v40-merged-table, #pmd-waiter-dashboard-root .pmd-w19-merged-table, #pmd-waiter-dashboard-root .pmd-v18-merged-table').length
      };
    }
  };

  /*
    Alias for existing V50 hook already patched earlier.
  */
  window.PMDWaiterV60No404SmartSnap = window.PMDWaiterV61StableKioskNoJump;

  console.info('[PMD] Waiter Dashboard V61 stable kiosk no-jump active');
})();
</script>
<!-- PMD_WAITER_DASHBOARD_V61_STABLE_KIOSK_NO_JUMP_END -->


<!-- PMD_WAITER_DASHBOARD_V65_REMOVE_SIDEBAR_DOM_START -->
<style id="pmd-waiter-dashboard-v65-remove-sidebar-dom-style">
/*
  V65:
  Remove admin sidebar DOM on /admin/dashboardwaiter.
  This is stronger than hiding because old admin scripts keep forcing:
  #navSidebar display:flex
  #side-nav-menu display:block!important
*/

html.pmd-dashboardwaiter-kiosk-page #navSidebar,
html.pmd-dashboardwaiter-kiosk-page #side-nav-menu,
html.pmd-dashboardwaiter-kiosk-page [data-pmd-v65-sidebar-removed="1"],
html.pmd-dashboardwaiter-kiosk-page [data-pmd-v65-sidebar-hidden="1"] {
  display: none !important;
  visibility: hidden !important;
  opacity: 0 !important;
  pointer-events: none !important;
  width: 0 !important;
  min-width: 0 !important;
  max-width: 0 !important;
  height: 0 !important;
  min-height: 0 !important;
  max-height: 0 !important;
  overflow: hidden !important;
  position: absolute !important;
  left: -99999px !important;
  top: -99999px !important;
  z-index: -999 !important;
}

#pmd-waiter-kiosk-host-v65 {
  display: block !important;
  width: 100% !important;
  max-width: none !important;
  margin: 0 !important;
  padding: 0 !important;
}

html.pmd-dashboardwaiter-kiosk-page #pmd-waiter-dashboard-root {
  margin-left: 0 !important;
  left: 0 !important;
  width: 100% !important;
  max-width: none !important;
}
</style>

<script id="pmd-waiter-dashboard-v65-remove-sidebar-dom-script">
(function () {
  if (!/\/admin\/dashboardwaiter(?:$|[?#])/.test(location.pathname + location.search + location.hash)) return;
  if (window.PMD_WAITER_DASHBOARD_V65_REMOVE_SIDEBAR_DOM) return;
  window.PMD_WAITER_DASHBOARD_V65_REMOVE_SIDEBAR_DOM = true;

  var runCount = 0;
  var removedCount = 0;
  var hiddenFallbackCount = 0;

  function root() {
    return document.querySelector('#pmd-waiter-dashboard-root');
  }

  function host() {
    var h = document.getElementById('pmd-waiter-kiosk-host-v65');

    if (!h) {
      h = document.createElement('div');
      h.id = 'pmd-waiter-kiosk-host-v65';
      h.setAttribute('data-pmd-v65-host', '1');

      h.style.setProperty('display', 'block', 'important');
      h.style.setProperty('width', '100%', 'important');
      h.style.setProperty('max-width', 'none', 'important');
      h.style.setProperty('margin', '0', 'important');
      h.style.setProperty('padding', '0', 'important');

      document.body.insertBefore(h, document.body.firstChild);
    }

    return h;
  }

  function moveRootOutIfNeeded() {
    var r = root();
    if (!r) return false;

    var bad = r.closest('#navSidebar, #side-nav-menu, .nav-sidebar, .main-sidebar, .sidebar, .sidebar-wrapper, aside');

    if (!bad) return false;

    host().appendChild(r);
    console.info('[PMD] V65 moved waiter root out before removing sidebar');
    return true;
  }

  function hideFallback(el, reason) {
    if (!el || el === document.body || el === document.documentElement) return false;

    var r = root();
    if (r && (el === r || r.contains(el) || el.contains(r))) return false;

    el.setAttribute('data-pmd-v65-sidebar-hidden', reason || '1');

    el.style.setProperty('display', 'none', 'important');
    el.style.setProperty('visibility', 'hidden', 'important');
    el.style.setProperty('opacity', '0', 'important');
    el.style.setProperty('pointer-events', 'none', 'important');
    el.style.setProperty('width', '0', 'important');
    el.style.setProperty('min-width', '0', 'important');
    el.style.setProperty('max-width', '0', 'important');
    el.style.setProperty('height', '0', 'important');
    el.style.setProperty('min-height', '0', 'important');
    el.style.setProperty('max-height', '0', 'important');
    el.style.setProperty('overflow', 'hidden', 'important');
    el.style.setProperty('position', 'absolute', 'important');
    el.style.setProperty('left', '-99999px', 'important');
    el.style.setProperty('top', '-99999px', 'important');
    el.style.setProperty('z-index', '-999', 'important');

    hiddenFallbackCount++;
    return true;
  }

  function removeNode(el, reason) {
    if (!el || el === document.body || el === document.documentElement) return false;

    var r = root();

    if (r && (el === r || r.contains(el) || el.contains(r))) {
      return hideFallback(el, reason + '-fallback');
    }

    try {
      el.setAttribute('data-pmd-v65-sidebar-removed', reason || '1');
      el.remove();
      removedCount++;
      return true;
    } catch (e) {
      return hideFallback(el, reason + '-remove-failed');
    }
  }

  function removeSidebar() {
    var count = 0;

    moveRootOutIfNeeded();

    /*
      Remove parent first where possible, then exact menu.
      Exact live targets from debug:
      #navSidebar display:flex
      #side-nav-menu display:block!important
    */
    Array.from(document.querySelectorAll('#navSidebar, div#navSidebar.nav-sidebar')).forEach(function (el) {
      if (removeNode(el, 'navSidebar')) count++;
    });

    Array.from(document.querySelectorAll('#side-nav-menu, ul#side-nav-menu.nav')).forEach(function (el) {
      if (removeNode(el, 'side-nav-menu')) count++;
    });

    /*
      If some clone/replacement rail remains, remove by geometry.
    */
    var r = root();

    Array.from(document.body ? document.body.children : []).forEach(function (el) {
      if (!el || el === r) return;
      if (r && (el.contains(r) || r.contains(el))) return;
      if (el.id === 'pmd-waiter-kiosk-host-v65') return;

      var rect;
      try { rect = el.getBoundingClientRect(); } catch (e) { return; }

      if (!rect || rect.width <= 0 || rect.height <= 0) return;

      var name = String((el.id || '') + ' ' + (el.className || '') + ' ' + el.tagName).toLowerCase();
      var cs = getComputedStyle(el);

      var looksLeftRail =
        rect.left <= 140 &&
        rect.width >= 50 &&
        rect.width <= 260 &&
        rect.height >= window.innerHeight * 0.45;

      var looksSidebar =
        /navsidebar|side-nav-menu|sidebar|side|nav|menu|rail|aside/.test(name) ||
        /fixed|sticky|absolute/.test(cs.position);

      if (looksLeftRail && looksSidebar) {
        if (removeNode(el, 'left-rail-geometry')) count++;
      }
    });

    return count;
  }

  function resetOffsets() {
    var r = root();
    if (!r) return;

    r.style.setProperty('margin-left', '0', 'important');
    r.style.setProperty('left', '0', 'important');
    r.style.setProperty('width', '100%', 'important');
    r.style.setProperty('max-width', 'none', 'important');

    var p = r.parentElement;
    var steps = 0;

    while (p && p !== document.body && p !== document.documentElement && steps < 12) {
      p.style.setProperty('margin-left', '0', 'important');
      p.style.setProperty('padding-left', '0', 'important');
      p.style.setProperty('left', '0', 'important');
      p.style.setProperty('width', '100%', 'important');
      p.style.setProperty('max-width', 'none', 'important');

      p = p.parentElement;
      steps++;
    }
  }

  function run() {
    runCount++;

    document.documentElement.classList.add('pmd-dashboardwaiter-kiosk-page');
    if (document.body) document.body.classList.add('pmd-dashboardwaiter-kiosk-page');

    var removedThisRun = removeSidebar();
    resetOffsets();

    if (removedThisRun) {
      console.info('[PMD] V65 removed sidebar DOM:', removedThisRun);
    }

    return removedThisRun;
  }

  function runBurst() {
    run();

    /*
      Sidebar is recreated by admin scripts late, so run a short burst.
      This only removes sidebar DOM, not layout, so no jumping.
    */
    [50, 120, 250, 500, 900, 1500, 2500, 4000].forEach(function (ms) {
      setTimeout(run, ms);
    });
  }

  runBurst();

  var obs = null;

  function startObserver() {
    if (obs || !document.body) return;

    obs = new MutationObserver(function (mutations) {
      var shouldRun = false;

      mutations.forEach(function (m) {
        if (m.type === 'childList' && (m.addedNodes.length || m.removedNodes.length)) shouldRun = true;

        if (
          m.type === 'attributes' &&
          m.target &&
          (
            m.target.id === 'side-nav-menu' ||
            m.target.id === 'navSidebar' ||
            m.target.getAttribute('data-pmd-v65-sidebar-hidden')
          )
        ) {
          shouldRun = true;
        }
      });

      if (shouldRun) run();
    });

    obs.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style', 'class']
    });
  }

  startObserver();

  window.PMDWaiterV65RemoveSidebarDOM = {
    run: run,
    debug: function () {
      var r = root();
      var side = document.getElementById('side-nav-menu');
      var nav = document.getElementById('navSidebar');

      return {
        root: !!r,
        rootLeft: r ? Math.round(r.getBoundingClientRect().left) : null,
        rootParent: r && r.parentElement ? ((r.parentElement.id || '') + ' ' + (r.parentElement.className || '')).trim() : '',
        sideNavExists: !!side,
        sideNavDisplay: side ? getComputedStyle(side).display : null,
        navSidebarExists: !!nav,
        navSidebarDisplay: nav ? getComputedStyle(nav).display : null,
        removedCount: removedCount,
        hiddenFallbackCount: hiddenFallbackCount,
        runCount: runCount
      };
    }
  };

  console.info('[PMD] Waiter Dashboard V65 remove sidebar DOM active');
})();
</script>
<!-- PMD_WAITER_DASHBOARD_V65_REMOVE_SIDEBAR_DOM_END -->


<!-- PMD_WAITER_DASHBOARD_V69_REMOVE_OWNER_FLOOR_GHOST_START -->
<style id="pmd-waiter-dashboard-v69-remove-owner-floor-ghost-style">
/*
  V69:
  Remove the ghost Owner Floor card from waiter dashboard.
  Found by console:
  section.pmd-owner-floor-v60.pmd-v62-after-kpi.is-compact
*/

html.pmd-dashboardwaiter-kiosk-page .pmd-owner-floor-v60,
html.pmd-dashboardwaiter-kiosk-page .pmd-owner-floor-v62,
html.pmd-dashboardwaiter-kiosk-page .pmd-v62-after-kpi,
html.pmd-dashboardwaiter-kiosk-page [data-pmd-v69-owner-floor-ghost="1"] {
  display: none !important;
  visibility: hidden !important;
  opacity: 0 !important;
  pointer-events: none !important;
  height: 0 !important;
  min-height: 0 !important;
  max-height: 0 !important;
  margin: 0 !important;
  padding: 0 !important;
  overflow: hidden !important;
  position: absolute !important;
  top: -99999px !important;
  left: -99999px !important;
  z-index: -999 !important;
}

/* Keep the good current waiter position, do not over-pull like V67 */
html.pmd-dashboardwaiter-kiosk-page #pmd-waiter-dashboard-root {
  margin-top: -46px !important;
}
</style>

<script id="pmd-waiter-dashboard-v69-remove-owner-floor-ghost-script">
(function () {
  if (!/\/admin\/dashboardwaiter(?:$|[?#])/.test(location.pathname + location.search + location.hash)) return;
  if (window.PMD_WAITER_DASHBOARD_V69_REMOVE_OWNER_FLOOR_GHOST) return;
  window.PMD_WAITER_DASHBOARD_V69_REMOVE_OWNER_FLOOR_GHOST = true;

  var removed = 0;
  var hidden = 0;
  var runCount = 0;

  function root() {
    return document.querySelector('#pmd-waiter-dashboard-root');
  }

  function isWaiterRootOrInside(el) {
    var r = root();
    return !!(r && (el === r || r.contains(el) || el.contains(r)));
  }

  function hideFallback(el, reason) {
    if (!el || el === document.body || el === document.documentElement) return false;
    if (isWaiterRootOrInside(el)) return false;

    el.setAttribute('data-pmd-v69-owner-floor-ghost', reason || '1');

    el.style.setProperty('display', 'none', 'important');
    el.style.setProperty('visibility', 'hidden', 'important');
    el.style.setProperty('opacity', '0', 'important');
    el.style.setProperty('pointer-events', 'none', 'important');
    el.style.setProperty('height', '0', 'important');
    el.style.setProperty('min-height', '0', 'important');
    el.style.setProperty('max-height', '0', 'important');
    el.style.setProperty('margin', '0', 'important');
    el.style.setProperty('padding', '0', 'important');
    el.style.setProperty('overflow', 'hidden', 'important');
    el.style.setProperty('position', 'absolute', 'important');
    el.style.setProperty('top', '-99999px', 'important');
    el.style.setProperty('left', '-99999px', 'important');
    el.style.setProperty('z-index', '-999', 'important');

    hidden++;
    return true;
  }

  function removeEl(el, reason) {
    if (!el || el === document.body || el === document.documentElement) return false;
    if (isWaiterRootOrInside(el)) return false;

    try {
      el.setAttribute('data-pmd-v69-owner-floor-ghost', reason || '1');
      el.remove();
      removed++;
      return true;
    } catch (e) {
      return hideFallback(el, reason + '-fallback');
    }
  }

  function removeOwnerFloorGhost() {
    var count = 0;

    /*
      Exact ghost found:
      section.pmd-owner-floor-v60.pmd-v62-after-kpi.is-compact
    */
    document.querySelectorAll([
      'section.pmd-owner-floor-v60',
      '.pmd-owner-floor-v60',
      '.pmd-owner-floor-v62',
      '.pmd-v62-after-kpi'
    ].join(',')).forEach(function (el) {
      if (removeEl(el, 'owner-floor-v60-ghost')) count++;
    });

    return count;
  }

  function keepWaiterPosition() {
    document.documentElement.classList.add('pmd-dashboardwaiter-kiosk-page');
    if (document.body) document.body.classList.add('pmd-dashboardwaiter-kiosk-page');

    var r = root();
    if (!r) return;

    r.style.setProperty('margin-top', '-46px', 'important');
  }

  function run() {
    runCount++;
    keepWaiterPosition();

    var c = removeOwnerFloorGhost();

    if (c) {
      console.info('[PMD] V69 removed owner floor ghost:', c);
    }

    keepWaiterPosition();
    return c;
  }

  run();

  /*
    Owner dashboard script mounts this late, so short burst + observer.
    This only removes the ghost owner floor section, no layout fighting.
  */
  [80, 180, 400, 900, 1600, 2600, 4000].forEach(function (ms) {
    setTimeout(run, ms);
  });

  var obs = null;

  function startObserver() {
    if (obs || !document.body) return;

    obs = new MutationObserver(function (mutations) {
      var shouldRun = false;

      mutations.forEach(function (m) {
        if (m.type === 'childList' && (m.addedNodes.length || m.removedNodes.length)) {
          Array.from(m.addedNodes || []).forEach(function (n) {
            if (!n || n.nodeType !== 1) return;
            if (
              n.matches && (
                n.matches('.pmd-owner-floor-v60, .pmd-owner-floor-v62, .pmd-v62-after-kpi') ||
                n.querySelector('.pmd-owner-floor-v60, .pmd-owner-floor-v62, .pmd-v62-after-kpi')
              )
            ) {
              shouldRun = true;
            }
          });
        }
      });

      if (shouldRun) run();
    });

    obs.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  startObserver();

  window.PMDWaiterV69RemoveOwnerFloorGhost = {
    run: run,
    debug: function () {
      var r = root();
      var ghosts = document.querySelectorAll('.pmd-owner-floor-v60, .pmd-owner-floor-v62, .pmd-v62-after-kpi');

      return {
        root: !!r,
        rootTop: r ? Math.round(r.getBoundingClientRect().top) : null,
        ownerGhostCount: ghosts.length,
        removed: removed,
        hidden: hidden,
        runCount: runCount,
        remainingGhosts: Array.from(ghosts).map(function (el) {
          var rect = el.getBoundingClientRect();
          return {
            tag: el.tagName,
            className: String(el.className || ''),
            top: Math.round(rect.top),
            height: Math.round(rect.height),
            display: getComputedStyle(el).display,
            text: (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 80)
          };
        })
      };
    }
  };

  console.info('[PMD] Waiter Dashboard V69 remove owner floor ghost active');
})();
</script>
<!-- PMD_WAITER_DASHBOARD_V69_REMOVE_OWNER_FLOOR_GHOST_END -->


<!-- PMD_WAITER_DASHBOARD_V70_REMOVE_404_WRAPPER_LOGO_GHOST_START -->
<style id="pmd-waiter-dashboard-v70-remove-404-wrapper-logo-ghost-style">
/*
  V70:
  Remove final visual ghosts found by console:
  - div.page-wrapper with "No page found" background rgb(250,249,244)
  - pmd-final-sidebar-logo-v20 / pmd-sidebar-backdrop leftovers
  No layout movement.
*/

html.pmd-dashboardwaiter-kiosk-page,
html.pmd-dashboardwaiter-kiosk-page body {
  background: #f8fafc !important;
  background-color: #f8fafc !important;
}

html.pmd-dashboardwaiter-kiosk-page [data-pmd-v70-ghost-removed="1"],
html.pmd-dashboardwaiter-kiosk-page [data-pmd-v70-ghost-hidden="1"] {
  display: none !important;
  visibility: hidden !important;
  opacity: 0 !important;
  pointer-events: none !important;
  width: 0 !important;
  height: 0 !important;
  min-width: 0 !important;
  min-height: 0 !important;
  max-width: 0 !important;
  max-height: 0 !important;
  margin: 0 !important;
  padding: 0 !important;
  overflow: hidden !important;
  position: absolute !important;
  left: -99999px !important;
  top: -99999px !important;
  z-index: -999 !important;
}

/* Hard CSS fallback for exact ghosts */
html.pmd-dashboardwaiter-kiosk-page .pmd-final-sidebar-logo-v20,
html.pmd-dashboardwaiter-kiosk-page .pmd-sidebar-backdrop,
html.pmd-dashboardwaiter-kiosk-page .pmd-final-sidebar-logo-img-v20 {
  display: none !important;
  visibility: hidden !important;
  opacity: 0 !important;
  pointer-events: none !important;
}
</style>

<script id="pmd-waiter-dashboard-v70-remove-404-wrapper-logo-ghost-script">
(function () {
  if (!/\/admin\/dashboardwaiter(?:$|[?#])/.test(location.pathname + location.search + location.hash)) return;
  if (window.PMD_WAITER_DASHBOARD_V70_REMOVE_404_WRAPPER_LOGO_GHOST) return;
  window.PMD_WAITER_DASHBOARD_V70_REMOVE_404_WRAPPER_LOGO_GHOST = true;

  var removed = 0;
  var hidden = 0;
  var runCount = 0;

  function root() {
    return document.querySelector('#pmd-waiter-dashboard-root');
  }

  function safe(el) {
    if (!el || el === document.body || el === document.documentElement) return false;

    var r = root();
    if (r && (el === r || r.contains(el) || el.contains(r))) return false;

    return true;
  }

  function hideFallback(el, reason) {
    if (!safe(el)) return false;

    el.setAttribute('data-pmd-v70-ghost-hidden', reason || '1');

    el.style.setProperty('display', 'none', 'important');
    el.style.setProperty('visibility', 'hidden', 'important');
    el.style.setProperty('opacity', '0', 'important');
    el.style.setProperty('pointer-events', 'none', 'important');
    el.style.setProperty('width', '0', 'important');
    el.style.setProperty('height', '0', 'important');
    el.style.setProperty('min-width', '0', 'important');
    el.style.setProperty('min-height', '0', 'important');
    el.style.setProperty('max-width', '0', 'important');
    el.style.setProperty('max-height', '0', 'important');
    el.style.setProperty('margin', '0', 'important');
    el.style.setProperty('padding', '0', 'important');
    el.style.setProperty('overflow', 'hidden', 'important');
    el.style.setProperty('position', 'absolute', 'important');
    el.style.setProperty('left', '-99999px', 'important');
    el.style.setProperty('top', '-99999px', 'important');
    el.style.setProperty('z-index', '-999', 'important');

    hidden++;
    return true;
  }

  function removeEl(el, reason) {
    if (!safe(el)) return false;

    try {
      el.setAttribute('data-pmd-v70-ghost-removed', reason || '1');
      el.remove();
      removed++;
      return true;
    } catch (e) {
      return hideFallback(el, reason + '-fallback');
    }
  }

  function is404Wrapper(el) {
    if (!el || !el.classList || !el.classList.contains('page-wrapper')) return false;

    var txt = (el.textContent || '').replace(/\s+/g, ' ').trim();

    return /No page found/i.test(txt) && /There's no page at this address/i.test(txt);
  }

  function remove404Wrapper() {
    var count = 0;

    document.querySelectorAll('div.page-wrapper, .page-wrapper').forEach(function (el) {
      if (is404Wrapper(el)) {
        if (removeEl(el, 'old-404-page-wrapper')) count++;
      }
    });

    return count;
  }

  function removeLogoGhosts() {
    var count = 0;

    document.querySelectorAll([
      '.pmd-final-sidebar-logo-v20',
      '.pmd-sidebar-backdrop',
      '.pmd-final-sidebar-logo-img-v20',
      '.pmd-final-admin-logo-v20'
    ].join(',')).forEach(function (el) {
      if (removeEl(el, 'logo-sidebar-ghost')) count++;
    });

    return count;
  }

  function normalizePageBg() {
    document.documentElement.classList.add('pmd-dashboardwaiter-kiosk-page');
    if (document.body) {
      document.body.classList.add('pmd-dashboardwaiter-kiosk-page');
      document.body.style.setProperty('background', '#f8fafc', 'important');
      document.body.style.setProperty('background-color', '#f8fafc', 'important');
    }

    document.documentElement.style.setProperty('background', '#f8fafc', 'important');
    document.documentElement.style.setProperty('background-color', '#f8fafc', 'important');
  }

  function run() {
    runCount++;

    normalizePageBg();

    var a = remove404Wrapper();
    var b = removeLogoGhosts();

    if (a || b) {
      console.info('[PMD] V70 removed visual ghosts:', { old404Wrapper: a, logoGhosts: b });
    }

    return { old404Wrapper: a, logoGhosts: b };
  }

  run();

  /*
    Short burst because admin/logo scripts mount late.
    No layout movement, just DOM ghost cleanup.
  */
  [80, 180, 400, 900, 1600, 2600, 4000].forEach(function (ms) {
    setTimeout(run, ms);
  });

  var obs = null;

  function startObserver() {
    if (obs || !document.body) return;

    obs = new MutationObserver(function (mutations) {
      var shouldRun = false;

      mutations.forEach(function (m) {
        if (m.type !== 'childList') return;

        Array.from(m.addedNodes || []).forEach(function (n) {
          if (!n || n.nodeType !== 1) return;

          if (
            (n.matches && (
              n.matches('.page-wrapper, .pmd-final-sidebar-logo-v20, .pmd-sidebar-backdrop, .pmd-final-sidebar-logo-img-v20, .pmd-final-admin-logo-v20')
            )) ||
            (n.querySelector && n.querySelector('.page-wrapper, .pmd-final-sidebar-logo-v20, .pmd-sidebar-backdrop, .pmd-final-sidebar-logo-img-v20, .pmd-final-admin-logo-v20'))
          ) {
            shouldRun = true;
          }
        });
      });

      if (shouldRun) run();
    });

    obs.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  startObserver();

  window.PMDWaiterV70Remove404WrapperLogoGhost = {
    run: run,
    debug: function () {
      var r = root();

      return {
        root: !!r,
        rootTop: r ? Math.round(r.getBoundingClientRect().top) : null,
        pageWrapper404Count: Array.from(document.querySelectorAll('.page-wrapper')).filter(is404Wrapper).length,
        logoGhostCount: document.querySelectorAll('.pmd-final-sidebar-logo-v20, .pmd-sidebar-backdrop, .pmd-final-sidebar-logo-img-v20, .pmd-final-admin-logo-v20').length,
        bodyBg: getComputedStyle(document.body).backgroundColor,
        htmlBg: getComputedStyle(document.documentElement).backgroundColor,
        removed: removed,
        hidden: hidden,
        runCount: runCount
      };
    }
  };

  console.info('[PMD] Waiter Dashboard V70 remove 404 wrapper/logo ghost active');
})();
</script>
<!-- PMD_WAITER_DASHBOARD_V70_REMOVE_404_WRAPPER_LOGO_GHOST_END -->


<!-- PMD_WAITER_DASHBOARD_V74_INSIDE_TOP_PADDING_START -->
<style id="pmd-waiter-dashboard-v74-inside-top-padding-style">
/*
  V74:
  Correct top spacing:
  - Root/background stays pinned to viewport top.
  - Content/cards get internal top padding.
  - No white/old-bg gap above dashboard.
*/

html.pmd-dashboardwaiter-kiosk-page,
html.pmd-dashboardwaiter-kiosk-page body {
  background: #f8fafc !important;
  background-color: #f8fafc !important;
}

html.pmd-dashboardwaiter-kiosk-page #pmd-waiter-dashboard-root {
  background: linear-gradient(180deg, #f8fafc 0%, #f4f7fb 100%) !important;
}

/* This is the comfortable visible top distance for the actual content/cards */
html.pmd-dashboardwaiter-kiosk-page #pmd-waiter-dashboard-root .pmd-w5-shell {
  padding-top: 18px !important;
  box-sizing: border-box !important;
}

/* Still block owner-floor ghost */
html.pmd-dashboardwaiter-kiosk-page .pmd-owner-floor-v60,
html.pmd-dashboardwaiter-kiosk-page .pmd-owner-floor-v62,
html.pmd-dashboardwaiter-kiosk-page .pmd-v62-after-kpi,
html.pmd-dashboardwaiter-kiosk-page [data-pmd-v74-owner-blocked="1"] {
  display: none !important;
  visibility: hidden !important;
  opacity: 0 !important;
  pointer-events: none !important;
  height: 0 !important;
  min-height: 0 !important;
  max-height: 0 !important;
  margin: 0 !important;
  padding: 0 !important;
  overflow: hidden !important;
  position: absolute !important;
  top: -99999px !important;
  left: -99999px !important;
  z-index: -999 !important;
}
</style>

<script id="pmd-waiter-dashboard-v74-inside-top-padding-script">
(function () {
  if (!/\/admin\/dashboardwaiter(?:$|[?#])/.test(location.pathname + location.search + location.hash)) return;
  if (window.PMD_WAITER_DASHBOARD_V74_INSIDE_TOP_PADDING) return;
  window.PMD_WAITER_DASHBOARD_V74_INSIDE_TOP_PADDING = true;

  var CONTENT_TOP_PADDING = 18;

  var runCount = 0;
  var blockedInserts = 0;
  var removedGhosts = 0;
  var appliedTop = null;
  var appliedShift = 0;

  function root() {
    return document.querySelector('#pmd-waiter-dashboard-root');
  }

  function isOwnerGhost(node) {
    if (!node || node.nodeType !== 1) return false;

    if (
      node.matches &&
      node.matches('.pmd-owner-floor-v60, .pmd-owner-floor-v62, .pmd-v62-after-kpi')
    ) {
      return true;
    }

    if (
      node.querySelector &&
      node.querySelector('.pmd-owner-floor-v60, .pmd-owner-floor-v62, .pmd-v62-after-kpi')
    ) {
      return true;
    }

    return false;
  }

  function removeOwnerGhosts(reason) {
    document.querySelectorAll('.pmd-owner-floor-v60, .pmd-owner-floor-v62, .pmd-v62-after-kpi').forEach(function (el) {
      var r = root();
      if (r && (el === r || r.contains(el) || el.contains(r))) return;

      try {
        el.setAttribute('data-pmd-v74-owner-blocked', reason || 'remove');
        el.remove();
        removedGhosts++;
      } catch (e) {
        el.style.setProperty('display', 'none', 'important');
        el.style.setProperty('visibility', 'hidden', 'important');
        el.style.setProperty('opacity', '0', 'important');
        el.setAttribute('data-pmd-v74-owner-blocked', reason || 'hide');
      }
    });
  }

  /*
    Silent block. No console spam.
  */
  (function patchDomInsertion() {
    if (window.PMD_WAITER_DASHBOARD_V74_DOM_PATCHED) return;
    window.PMD_WAITER_DASHBOARD_V74_DOM_PATCHED = true;

    var appendChild = Node.prototype.appendChild;
    var insertBefore = Node.prototype.insertBefore;

    Node.prototype.appendChild = function (node) {
      if (isOwnerGhost(node)) {
        blockedInserts++;
        return node;
      }

      return appendChild.call(this, node);
    };

    Node.prototype.insertBefore = function (node, ref) {
      if (isOwnerGhost(node)) {
        blockedInserts++;
        return node;
      }

      return insertBefore.call(this, node, ref);
    };
  })();

  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }

  function alignRootToViewportTop(reason) {
    var r = root();
    if (!r) return null;

    var cs = getComputedStyle(r);

    if (!r.dataset.pmdV74BaseTop) {
      var baseTop = parseFloat(cs.top);
      if (!isFinite(baseTop)) baseTop = 0;
      r.dataset.pmdV74BaseTop = String(baseTop);
    }

    var base = parseFloat(r.dataset.pmdV74BaseTop || '0');
    if (!isFinite(base)) base = 0;

    /*
      Reset first so runs do not stack.
    */
    r.style.setProperty('top', base + 'px', 'important');

    var measuredTop = Math.round(r.getBoundingClientRect().top);

    /*
      Target rootTop = 0 so background covers the screen top.
      Clamp avoids any V67-style overpull.
    */
    var shift = clamp(measuredTop, 0, 32);
    var nextTop = base - shift;

    r.style.setProperty('top', nextTop + 'px', 'important');
    r.style.setProperty('background', 'linear-gradient(180deg, #f8fafc 0%, #f4f7fb 100%)', 'important');

    appliedTop = nextTop;
    appliedShift = shift;

    var shell = r.querySelector('.pmd-w5-shell');
    if (shell) {
      shell.style.setProperty('padding-top', CONTENT_TOP_PADDING + 'px', 'important');
      shell.style.setProperty('box-sizing', 'border-box', 'important');
    }

    return {
      reason: reason || '',
      baseTop: base,
      measuredTop: measuredTop,
      appliedShift: shift,
      nextTop: nextTop,
      contentTopPadding: CONTENT_TOP_PADDING
    };
  }

  function normalizeBackground() {
    document.documentElement.classList.add('pmd-dashboardwaiter-kiosk-page');

    if (document.body) {
      document.body.classList.add('pmd-dashboardwaiter-kiosk-page');
      document.body.style.setProperty('background', '#f8fafc', 'important');
      document.body.style.setProperty('background-color', '#f8fafc', 'important');
    }

    document.documentElement.style.setProperty('background', '#f8fafc', 'important');
    document.documentElement.style.setProperty('background-color', '#f8fafc', 'important');
  }

  function run(reason) {
    runCount++;

    normalizeBackground();
    removeOwnerGhosts(reason || 'run');
    alignRootToViewportTop(reason || 'run');

    return true;
  }

  run('initial');

  [80, 180, 400, 900, 1600, 2600, 4000].forEach(function (ms) {
    setTimeout(function () {
      run('after ' + ms + 'ms');
    }, ms);
  });

  var obs = null;

  function startObserver() {
    if (obs || !document.body) return;

    obs = new MutationObserver(function (mutations) {
      var shouldRun = false;

      mutations.forEach(function (m) {
        if (m.type !== 'childList') return;

        Array.from(m.addedNodes || []).forEach(function (n) {
          if (isOwnerGhost(n)) shouldRun = true;
        });
      });

      if (shouldRun) run('observer');
    });

    obs.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  startObserver();

  window.PMDWaiterV74InsideTopPadding = {
    run: run,
    debug: function () {
      var r = root();
      var shell = r ? r.querySelector('.pmd-w5-shell') : null;
      var kpis = r ? r.querySelector('.pmd-w5-kpis') : null;
      var ghosts = document.querySelectorAll('.pmd-owner-floor-v60, .pmd-owner-floor-v62, .pmd-v62-after-kpi');

      return {
        root: !!r,
        rootTop: r ? Math.round(r.getBoundingClientRect().top) : null,
        kpisTop: kpis ? Math.round(kpis.getBoundingClientRect().top) : null,
        contentTopPadding: shell ? getComputedStyle(shell).paddingTop : null,
        computedTop: r ? getComputedStyle(r).top : null,
        marginTop: r ? getComputedStyle(r).marginTop : null,
        baseTop: r ? r.dataset.pmdV74BaseTop || null : null,
        appliedTop: appliedTop,
        appliedShift: appliedShift,
        ownerGhostCount: ghosts.length,
        blockedInserts: blockedInserts,
        removedGhosts: removedGhosts,
        runCount: runCount,
        bodyBg: getComputedStyle(document.body).backgroundColor,
        rootBg: r ? getComputedStyle(r).backgroundImage : null
      };
    }
  };

  console.info('[PMD] Waiter Dashboard V74 inside top padding active');
})();
</script>
<!-- PMD_WAITER_DASHBOARD_V74_INSIDE_TOP_PADDING_END -->


<!-- PMD_DASHBOARD_RESERVATION_V3_STABLE_NO_JUMP_START -->
<style id="pmd-dashboardreservation-v3-style">
html.pmd-dashboardreservation-page,
html.pmd-dashboardreservation-page body {
  margin: 0 !important;
  padding: 0 !important;
  background: #f8fafc !important;
  background-color: #f8fafc !important;
  overflow: hidden !important;
}

/* Hide old admin shell immediately when html class is present */
html.pmd-dashboardreservation-page #navSidebar,
html.pmd-dashboardreservation-page #side-nav-menu,
html.pmd-dashboardreservation-page .page-wrapper,
html.pmd-dashboardreservation-page .pmd-owner-floor-v60,
html.pmd-dashboardreservation-page .pmd-owner-floor-v62,
html.pmd-dashboardreservation-page .pmd-v62-after-kpi,
html.pmd-dashboardreservation-page .pmd-final-sidebar-logo-v20,
html.pmd-dashboardreservation-page .pmd-sidebar-backdrop,
html.pmd-dashboardreservation-page .pmd-final-sidebar-logo-img-v20,
html.pmd-dashboardreservation-page .pmd-final-admin-logo-v20 {
  display: none !important;
  visibility: hidden !important;
  opacity: 0 !important;
  pointer-events: none !important;
  width: 0 !important;
  height: 0 !important;
  max-width: 0 !important;
  max-height: 0 !important;
  overflow: hidden !important;
  position: absolute !important;
  top: -99999px !important;
  left: -99999px !important;
  z-index: -999 !important;
}

#pmd-reservation-dashboard-root {
  position: fixed !important;
  inset: 0 !important;
  width: 100vw !important;
  height: 100vh !important;
  overflow: auto !important;
  z-index: 999999 !important;
  background: linear-gradient(180deg, #f8fafc 0%, #f4f7fb 100%) !important;
  color: #061126 !important;
  font-family: Inter, Roboto, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif !important;
}

#pmd-reservation-dashboard-root * { box-sizing: border-box !important; }

#pmd-reservation-dashboard-root .pmd-res-shell {
  width: 100% !important;
  min-height: 100vh !important;
  padding: 18px 20px 40px !important;
}

#pmd-reservation-dashboard-root .pmd-res-kpis {
  display: grid !important;
  grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
  gap: 16px !important;
  margin-bottom: 24px !important;
}

#pmd-reservation-dashboard-root .pmd-res-kpi {
  min-height: 116px !important;
  border-radius: 18px !important;
  border: 2px solid rgba(15, 23, 42, .22) !important;
  box-shadow: 0 18px 38px rgba(7, 13, 36, .14) !important;
  display: flex !important;
  align-items: center !important;
  gap: 20px !important;
  padding: 20px 24px !important;
}

#pmd-reservation-dashboard-root .pmd-res-kpi:nth-child(1) { background: #22c55e !important; border-color: #15803d !important; }
#pmd-reservation-dashboard-root .pmd-res-kpi:nth-child(2) { background: #ff7900 !important; border-color: #c2410c !important; }
#pmd-reservation-dashboard-root .pmd-res-kpi:nth-child(3) { background: #27b6d7 !important; border-color: #0284c7 !important; }
#pmd-reservation-dashboard-root .pmd-res-kpi:nth-child(4) { background: #ffd23f !important; border-color: #f59e0b !important; }

#pmd-reservation-dashboard-root .pmd-res-ico {
  width: 58px !important;
  height: 58px !important;
  border-radius: 999px !important;
  display: grid !important;
  place-items: center !important;
  flex: 0 0 58px !important;
  background: #f1f5f9 !important;
  border: 1px solid #dbe3ee !important;
  font-size: 24px !important;
}

#pmd-reservation-dashboard-root .pmd-res-kpi-title {
  font-size: 20px !important;
  line-height: 1.05 !important;
  font-weight: 900 !important;
  color: #071225 !important;
}

#pmd-reservation-dashboard-root .pmd-res-kpi-value {
  margin-top: 2px !important;
  font-size: 38px !important;
  line-height: .95 !important;
  font-weight: 1000 !important;
  color: #020617 !important;
}

#pmd-reservation-dashboard-root .pmd-res-kpi-sub {
  margin-top: 10px !important;
  font-size: 13px !important;
  font-weight: 850 !important;
  color: #071225 !important;
}

#pmd-reservation-dashboard-root .pmd-res-section-title {
  display: flex !important;
  align-items: center !important;
  gap: 7px !important;
  margin: 0 0 14px !important;
  font-size: 22px !important;
  font-weight: 950 !important;
  color: #061126 !important;
}

#pmd-reservation-dashboard-root .pmd-res-floor-head {
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  gap: 16px !important;
}

#pmd-reservation-dashboard-root .pmd-res-floor-actions {
  display: flex !important;
  gap: 12px !important;
}

#pmd-reservation-dashboard-root .pmd-res-round-btn {
  width: 44px !important;
  height: 44px !important;
  border-radius: 999px !important;
  display: grid !important;
  place-items: center !important;
  background: #f8fafc !important;
  border: 2px solid #020617 !important;
  box-shadow: 0 10px 28px rgba(15, 23, 42, .10) !important;
  font-weight: 900 !important;
}

#pmd-reservation-dashboard-root .pmd-res-floor-map {
  position: relative !important;
  width: 100% !important;
  height: 430px !important;
  border-radius: 16px !important;
  background: #fff !important;
  border: 1px solid #d8e4f1 !important;
  box-shadow: 0 18px 45px rgba(15, 23, 42, .06) !important;
  overflow: hidden !important;
  margin-bottom: 18px !important;
}

#pmd-reservation-dashboard-root .pmd-res-table {
  position: absolute !important;
  transform: translate(-50%, -50%) !important;
  width: 78px !important;
  min-height: 62px !important;
  border-radius: 15px !important;
  border: 3px solid #12864a !important;
  background: #22c55e !important;
  color: #03141b !important;
  display: grid !important;
  place-items: center !important;
  padding: 8px 6px !important;
  font-weight: 1000 !important;
  line-height: 1 !important;
  box-shadow: 0 13px 22px rgba(16, 185, 129, .17) !important;
}

#pmd-reservation-dashboard-root .pmd-res-table.is-round {
  width: 72px !important;
  height: 72px !important;
  min-height: 72px !important;
  border-radius: 999px !important;
}

#pmd-reservation-dashboard-root .pmd-res-table.is-reserved {
  background: #fb923c !important;
  border-color: #c2410c !important;
  box-shadow: 0 0 0 9px rgba(251, 146, 60, .20), 0 13px 22px rgba(251, 146, 60, .18) !important;
}

#pmd-reservation-dashboard-root .pmd-res-table.is-note {
  background: #ef4444 !important;
  border-color: #b91c1c !important;
  box-shadow: 0 0 0 9px rgba(239, 68, 68, .18), 0 13px 22px rgba(239, 68, 68, .18) !important;
}

#pmd-reservation-dashboard-root .pmd-res-table-num {
  display: block !important;
  font-size: 25px !important;
  font-weight: 1000 !important;
}

#pmd-reservation-dashboard-root .pmd-res-table-cap {
  display: block !important;
  margin-top: 6px !important;
  font-size: 11px !important;
  font-weight: 950 !important;
}

#pmd-reservation-dashboard-root .pmd-res-badge {
  position: absolute !important;
  top: -12px !important;
  right: -10px !important;
  width: 24px !important;
  height: 24px !important;
  border-radius: 999px !important;
  display: grid !important;
  place-items: center !important;
  background: #0f172a !important;
  color: #fff !important;
  font-size: 13px !important;
  border: 2px solid #fff !important;
}

#pmd-reservation-dashboard-root .pmd-res-filters {
  display: flex !important;
  gap: 10px !important;
  margin: 8px 0 14px !important;
}

#pmd-reservation-dashboard-root .pmd-res-pill {
  border-radius: 999px !important;
  border: 1.5px solid #0284c7 !important;
  background: #e0f2fe !important;
  color: #061126 !important;
  padding: 10px 18px !important;
  font-weight: 900 !important;
}

#pmd-reservation-dashboard-root .pmd-res-grid {
  display: grid !important;
  grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
  gap: 18px !important;
}

#pmd-reservation-dashboard-root .pmd-res-card {
  min-height: 290px !important;
  border-radius: 17px !important;
  background: #fff !important;
  border: 1px solid #d8e4f1 !important;
  box-shadow: 0 16px 38px rgba(15, 23, 42, .06) !important;
  padding: 18px !important;
}

#pmd-reservation-dashboard-root .pmd-res-empty {
  grid-column: 1 / -1 !important;
  background: #fff !important;
  border: 1px dashed #cbd5e1 !important;
  border-radius: 16px !important;
  padding: 34px !important;
  text-align: center !important;
  color: #64748b !important;
  font-weight: 900 !important;
}
</style>

<script id="pmd-dashboardreservation-v3-script">
(function () {
  if (!/\/admin\/dashboardreservation(?:$|[?#])/.test(location.pathname + location.search + location.hash)) return;
  if (window.PMD_DASHBOARD_RESERVATION_V3_STABLE_NO_JUMP) return;
  window.PMD_DASHBOARD_RESERVATION_V3_STABLE_NO_JUMP = true;

  document.documentElement.classList.add('pmd-dashboardreservation-page');

  var state = {
    reservations: [],
    kpis: { reserved_tables: 0, today_reservations: 0, notes_changes: 0, arriving_soon: 0 },
    filter: 'all',
    loaded: false,
    error: ''
  };

  var floor = [
    { number: '9',  capacity: '2-2',   x: 25, y: 29, round: false },
    { number: '17', capacity: '6-8',   x: 33, y: 30, round: false },
    { number: '7',  capacity: '6-8',   x: 41, y: 30, round: false },
    { number: '14', capacity: '2-2',   x: 49, y: 30, round: false },
    { number: '20', capacity: '12-16', x: 57, y: 30, round: false },
    { number: '13', capacity: '1-1',   x: 63, y: 30, round: false },
    { number: '3',  capacity: '4-4',   x: 22, y: 48, round: false },
    { number: '5',  capacity: '4-6',   x: 31, y: 48, round: false },
    { number: '6',  capacity: '6-6',   x: 45, y: 48, round: false },
    { number: '19', capacity: '10-12', x: 52, y: 47, round: false },
    { number: '10', capacity: '4-4',   x: 60, y: 46, round: true  },
    { number: '1',  capacity: '2-2',   x: 86, y: 48, round: true  },
    { number: '8',  capacity: '8-8',   x: 32, y: 63, round: false },
    { number: '2',  capacity: '2-3',   x: 43, y: 62, round: true  },
    { number: '4',  capacity: '4-5',   x: 52, y: 62, round: false },
    { number: '11', capacity: '4-6',   x: 60, y: 61, round: false },
    { number: '16', capacity: '4-6',   x: 30, y: 78, round: false },
    { number: '15', capacity: '2-3',   x: 39, y: 77, round: true  },
    { number: '18', capacity: '8-10',  x: 47, y: 77, round: false },
    { number: '12', capacity: '6-8',   x: 58, y: 77, round: false }
  ];

  function esc(v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function ready(fn) {
    if (document.body) return fn();
    document.addEventListener('DOMContentLoaded', fn, { once: true });
  }

  function root() {
    var el = document.getElementById('pmd-reservation-dashboard-root');
    if (!el && document.body) {
      el = document.createElement('div');
      el.id = 'pmd-reservation-dashboard-root';
      document.body.insertBefore(el, document.body.firstChild);
    }
    return el;
  }

  function hideOldShell() {
    if (!document.body) return;
    document.documentElement.classList.add('pmd-dashboardreservation-page');
    document.body.classList.add('pmd-dashboardreservation-page');
    document.body.style.setProperty('background', '#f8fafc', 'important');

    document.querySelectorAll('#navSidebar,#side-nav-menu,.page-wrapper,.pmd-final-sidebar-logo-v20,.pmd-sidebar-backdrop,.pmd-final-sidebar-logo-img-v20,.pmd-final-admin-logo-v20').forEach(function (el) {
      if (el && el.id !== 'pmd-reservation-dashboard-root') {
        el.style.setProperty('display', 'none', 'important');
        el.style.setProperty('visibility', 'hidden', 'important');
      }
    });
  }

  function cardHtml(r) {
    var table = r.table || '—';
    return `
      <article class="pmd-res-card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
          <div style="min-width:72px;height:50px;border-radius:13px;border:2px solid #22c55e;background:#f0fdf4;display:grid;place-items:center;font-size:24px;font-weight:1000">${esc(table)}</div>
          <button class="pmd-res-round-btn" type="button">✎</button>
        </div>
        <div style="display:inline-flex;border-radius:999px;padding:7px 12px;background:#dbeafe;border:1px solid #60a5fa;color:#2563eb;font-size:12px;font-weight:950;margin-bottom:14px">${esc(r.status || 'Reserved')}</div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:14px">
          <div style="border-radius:12px;background:#f8fafc;border:1px solid #dce5ef;padding:12px"><div style="color:#64748b;font-size:12px;font-weight:950;margin-bottom:8px">GUESTS</div><div style="font-size:16px;font-weight:1000">${esc(r.guests || '—')}</div></div>
          <div style="border-radius:12px;background:#f8fafc;border:1px solid #dce5ef;padding:12px"><div style="color:#64748b;font-size:12px;font-weight:950;margin-bottom:8px">TIME</div><div style="font-size:16px;font-weight:1000">${esc(r.time || '—')}</div></div>
          <div style="border-radius:12px;background:#f8fafc;border:1px solid #dce5ef;padding:12px"><div style="color:#64748b;font-size:12px;font-weight:950;margin-bottom:8px">RESERVATION</div><div style="font-size:16px;font-weight:1000">${esc(r.id || '—')}</div></div>
        </div>
        <div style="border-radius:12px;border:1px solid #cbd5e1;padding:14px;background:#fff">
          <div style="color:#64748b;font-size:13px;font-weight:1000;margin-bottom:10px">RESERVATION DETAILS</div>
          <div style="font-size:17px;font-weight:1000;margin-bottom:7px">${esc(r.name || 'Guest')}</div>
          <div style="display:flex;justify-content:space-between;font-size:13px;font-weight:800;color:#334155;padding:4px 0"><span>Contact</span><strong>${esc(r.phone || r.email || '—')}</strong></div>
          <div style="display:flex;justify-content:space-between;font-size:13px;font-weight:800;color:#334155;padding:4px 0"><span>Date</span><strong>${esc(r.date || '—')}</strong></div>
        </div>
      </article>
    `;
  }

  function render() {
    hideOldShell();
    var el = root();
    if (!el) return;

    var today = new Date().toISOString().slice(0, 10);
    var reservations = state.filter === 'today'
      ? state.reservations.filter(function (r) { return !r.date || r.date === today; })
      : state.reservations;

    var reservedTables = {};
    var noteTables = {};

    state.reservations.forEach(function (r) {
      var t = String(r.table || '').trim();
      if (!t) return;
      reservedTables[t] = (reservedTables[t] || 0) + 1;
      if (String(r.notes || '').trim()) noteTables[t] = true;
    });

    el.innerHTML = `
      <div class="pmd-res-shell">
        <section class="pmd-res-kpis">
          <div class="pmd-res-kpi"><div class="pmd-res-ico">🍽️</div><div><div class="pmd-res-kpi-title">Assigned Tables</div><div class="pmd-res-kpi-value">${esc(state.kpis.reserved_tables || 0)}</div><div class="pmd-res-kpi-sub">Reserved table load</div></div></div>
          <div class="pmd-res-kpi"><div class="pmd-res-ico">📅</div><div><div class="pmd-res-kpi-title">Active Reservations</div><div class="pmd-res-kpi-value">${esc(state.kpis.today_reservations || 0)}</div><div class="pmd-res-kpi-sub">Today reservations</div></div></div>
          <div class="pmd-res-kpi"><div class="pmd-res-ico">📝</div><div><div class="pmd-res-kpi-title">Notes / Changes</div><div class="pmd-res-kpi-value">${esc(state.kpis.notes_changes || 0)}</div><div class="pmd-res-kpi-sub">Reservations needing attention</div></div></div>
          <div class="pmd-res-kpi"><div class="pmd-res-ico">⏰</div><div><div class="pmd-res-kpi-title">Arriving Soon</div><div class="pmd-res-kpi-value">${esc(state.kpis.arriving_soon || 0)}</div><div class="pmd-res-kpi-sub">Next 2 hours</div></div></div>
        </section>

        <div class="pmd-res-floor-head">
          <h2 class="pmd-res-section-title">🍽️ Reservation Floor</h2>
          <div class="pmd-res-floor-actions"><button class="pmd-res-round-btn">✎</button><button class="pmd-res-round-btn">↔</button><button class="pmd-res-round-btn">▦</button></div>
        </div>

        <section class="pmd-res-floor-map">
          ${floor.map(function (t) {
            var count = reservedTables[String(t.number)] || 0;
            var cls = 'pmd-res-table' + (t.round ? ' is-round' : '') + (count ? ' is-reserved' : '') + (noteTables[String(t.number)] ? ' is-note' : '');
            return `<div class="${cls}" style="left:${t.x}%;top:${t.y}%">${count ? `<span class="pmd-res-badge">${count}</span>` : ''}<span><span class="pmd-res-table-num">${esc(t.number)}</span><span class="pmd-res-table-cap">${esc(t.capacity)}</span></span></div>`;
          }).join('')}
        </section>

        <h2 class="pmd-res-section-title">📅 Reservation Cards</h2>
        <div class="pmd-res-filters">
          <button class="pmd-res-pill" data-filter="today">Today</button>
          <button class="pmd-res-pill" data-filter="all">All Reservations</button>
          <button class="pmd-res-pill">Select</button>
        </div>
        <section class="pmd-res-grid">
          ${reservations.length ? reservations.map(cardHtml).join('') : `<div class="pmd-res-empty">${state.loaded ? 'No reservations found for this view.' : 'Loading reservations…'}</div>`}
        </section>
      </div>
    `;

    el.querySelectorAll('[data-filter]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        state.filter = btn.getAttribute('data-filter') || 'today';
        render();
      });
    });
  }

  async function fetchJsonAny(urls) {
    var last = null;
    for (var i = 0; i < urls.length; i++) {
      try {
        var res = await fetch(urls[i], { credentials: 'same-origin', headers: { Accept: 'application/json' } });
        if (!res.ok) {
          last = 'HTTP ' + res.status + ' for ' + urls[i];
          continue;
        }
        return await res.json();
      } catch (e) {
        last = e && e.message ? e.message : String(e);
      }
    }
    throw new Error(last || 'all endpoints failed');
  }

  async function loadReservationData() {
    try {
      var json = await fetchJsonAny([
        '/admin/pmd-dashboardreservation-v4-data',
        '/admin/pmd-dashboardreservation-v1-data',
        '/pmd-dashboardreservation-v1-data'
      ]);

      state.loaded = true;
      if (json && json.kpis) state.kpis = json.kpis;
      if (json && Array.isArray(json.reservations)) state.reservations = json.reservations;
      if (!json || !json.ok) state.error = json && json.message ? json.message : 'Reservation data not available';
    } catch (e) {
      state.loaded = true;
      state.error = e && e.message ? e.message : String(e);
    }
  }

  ready(function () {
    hideOldShell();
    render();

    loadReservationData().then(function () {
      render();
    });

    var obs = new MutationObserver(function () {
      hideOldShell();
    });

    obs.observe(document.body, { childList: true, subtree: false });
  });

  window.PMDReservationDashboardV3 = {
    state: state,
    reload: function () { loadReservationData().then(render); },
    debug: function () {
      var r = document.getElementById('pmd-reservation-dashboard-root');
      return {
        root: !!r,
        rootTop: r ? Math.round(r.getBoundingClientRect().top) : null,
        kpiCount: r ? r.querySelectorAll('.pmd-res-kpi').length : 0,
        tableCount: r ? r.querySelectorAll('.pmd-res-table').length : 0,
        reservationCardCount: r ? r.querySelectorAll('.pmd-res-card').length : 0,
        reservationsLoaded: state.reservations.length,
        loaded: state.loaded,
        error: state.error,
        kpis: state.kpis
      };
    }
  };

  console.info('[PMD] Reservation Dashboard V3 stable no-jump active');
})();
</script>
<!-- PMD_DASHBOARD_RESERVATION_V3_STABLE_NO_JUMP_END -->


<!-- PMD_DASHBOARD_RESERVATION_V7_BUTTON_POLISH_START -->
<style id="pmd-dashboardreservation-v7-button-polish-style">
/*
  V7:
  Reservation page final polish:
  - active filter styling
  - real Select mode
  - floor toolbar feedback
  - reserved-table focus mode
  - compact visual mode without layout jump
  - better empty Today message
*/

html.pmd-dashboardreservation-page #pmd-reservation-dashboard-root .pmd-res-pill.is-active {
  background: #061126 !important;
  border-color: #061126 !important;
  color: #fff !important;
  box-shadow: 0 10px 24px rgba(15, 23, 42, .16) !important;
}

html.pmd-dashboardreservation-page #pmd-reservation-dashboard-root .pmd-res-pill.is-selecting {
  background: #fef3c7 !important;
  border-color: #f59e0b !important;
  color: #061126 !important;
}

html.pmd-dashboardreservation-page #pmd-reservation-dashboard-root.pmd-res-select-mode .pmd-res-card {
  cursor: pointer !important;
}

html.pmd-dashboardreservation-page #pmd-reservation-dashboard-root .pmd-res-card.is-selected {
  outline: 3px solid #0284c7 !important;
  outline-offset: 3px !important;
  box-shadow: 0 18px 42px rgba(2, 132, 199, .18) !important;
}

html.pmd-dashboardreservation-page #pmd-reservation-dashboard-root .pmd-res-select-dot {
  position: absolute !important;
  top: 14px !important;
  left: 14px !important;
  width: 28px !important;
  height: 28px !important;
  border-radius: 999px !important;
  display: none !important;
  place-items: center !important;
  background: #0284c7 !important;
  color: #fff !important;
  font-size: 16px !important;
  font-weight: 1000 !important;
  z-index: 5 !important;
  border: 2px solid #fff !important;
}

html.pmd-dashboardreservation-page #pmd-reservation-dashboard-root .pmd-res-card.is-selected .pmd-res-select-dot {
  display: grid !important;
}

html.pmd-dashboardreservation-page #pmd-reservation-dashboard-root .pmd-res-table.is-muted {
  opacity: .22 !important;
  filter: grayscale(.25) !important;
}

html.pmd-dashboardreservation-page #pmd-reservation-dashboard-root .pmd-res-table.is-focus-reserved {
  background: #fb923c !important;
  border-color: #c2410c !important;
  box-shadow: 0 0 0 9px rgba(251, 146, 60, .20), 0 13px 22px rgba(251, 146, 60, .18) !important;
}

html.pmd-dashboardreservation-page #pmd-reservation-dashboard-root.pmd-res-map-compact .pmd-res-table {
  transform: translate(-50%, -50%) scale(.86) !important;
}

html.pmd-dashboardreservation-page #pmd-reservation-dashboard-root .pmd-res-toast {
  position: fixed !important;
  top: 22px !important;
  right: 24px !important;
  max-width: 420px !important;
  border-radius: 14px !important;
  background: #061126 !important;
  color: #fff !important;
  padding: 12px 16px !important;
  font-size: 13px !important;
  font-weight: 850 !important;
  box-shadow: 0 18px 42px rgba(15, 23, 42, .22) !important;
  z-index: 1000001 !important;
  opacity: 0 !important;
  transform: translateY(-8px) !important;
  transition: opacity .18s ease, transform .18s ease !important;
}

html.pmd-dashboardreservation-page #pmd-reservation-dashboard-root .pmd-res-toast.is-on {
  opacity: 1 !important;
  transform: translateY(0) !important;
}
</style>

<script id="pmd-dashboardreservation-v7-button-polish-script">
(function () {
  if (!/\/admin\/dashboardreservation(?:$|[?#])/.test(location.pathname + location.search + location.hash)) return;
  if (window.PMD_DASHBOARD_RESERVATION_V7_BUTTON_POLISH) return;
  window.PMD_DASHBOARD_RESERVATION_V7_BUTTON_POLISH = true;

  var selectMode = false;
  var focusReserved = false;
  var compactMap = false;
  var selected = new Set();
  var enhanceTimer = null;

  function root() {
    return document.querySelector('#pmd-reservation-dashboard-root');
  }

  function text(el) {
    return (el && el.textContent ? el.textContent.replace(/\s+/g, ' ').trim() : '');
  }

  function toast(msg) {
    var r = root();
    if (!r) return;

    var el = r.querySelector('.pmd-res-toast');
    if (!el) {
      el = document.createElement('div');
      el.className = 'pmd-res-toast';
      r.appendChild(el);
    }

    el.textContent = msg;
    el.classList.add('is-on');

    clearTimeout(el.__pmdTimer);
    el.__pmdTimer = setTimeout(function () {
      el.classList.remove('is-on');
    }, 1800);
  }

  function state() {
    return window.PMDReservationDashboardV3 && window.PMDReservationDashboardV3.state
      ? window.PMDReservationDashboardV3.state
      : null;
  }

  function cardKey(card, index) {
    var t = text(card);
    var m = t.match(/RESERVATION\s+([^\s]+)/i);
    return m ? String(m[1]) : String(index);
  }

  function getReservedTableSet() {
    var st = state();
    var set = new Set();

    if (!st || !Array.isArray(st.reservations)) return set;

    st.reservations.forEach(function (r) {
      String(r.table || '')
        .split(',')
        .map(function (x) { return x.trim(); })
        .filter(Boolean)
        .forEach(function (x) { set.add(x); });
    });

    return set;
  }

  function applyReservedFocus() {
    var r = root();
    if (!r) return;

    var reserved = getReservedTableSet();
    var matched = 0;

    r.querySelectorAll('.pmd-res-table').forEach(function (el) {
      var num = text(el.querySelector('.pmd-res-table-num') || el).split(/\s+/)[0];

      el.classList.remove('is-muted', 'is-focus-reserved');

      if (!focusReserved) return;

      if (reserved.has(num)) {
        matched++;
        el.classList.add('is-focus-reserved');
      } else {
        el.classList.add('is-muted');
      }
    });

    if (focusReserved && matched === 0) {
      toast('No visible numbered floor tables are linked to these reservations.');
    }
  }

  function enhance() {
    var r = root();
    if (!r) return;

    document.documentElement.classList.add('pmd-dashboardreservation-v7-ready');

    var st = state();
    var filter = st ? st.filter : 'all';

    r.classList.toggle('pmd-res-select-mode', selectMode);
    r.classList.toggle('pmd-res-map-compact', compactMap);

    var buttons = Array.from(r.querySelectorAll('button'));

    buttons.forEach(function (btn) {
      var label = text(btn);

      if (/^Today$/i.test(label)) {
        btn.classList.toggle('is-active', filter === 'today');
        btn.title = 'Show only today reservations';
      }

      if (/^All Reservations$/i.test(label)) {
        btn.classList.toggle('is-active', filter === 'all');
        btn.title = 'Show all reservation records';
      }

      if (/^Select|Selected/i.test(label)) {
        btn.classList.toggle('is-selecting', selectMode);
        btn.textContent = selectMode ? ('Selected ' + selected.size) : 'Select';
        btn.title = 'Select reservation cards';
      }
    });

    var floorButtons = r.querySelectorAll('.pmd-res-floor-actions .pmd-res-round-btn');
    if (floorButtons[0]) floorButtons[0].title = 'Reservation floor is read-only here';
    if (floorButtons[1]) floorButtons[1].title = 'Focus reserved tables';
    if (floorButtons[2]) floorButtons[2].title = 'Compact table icon view';

    var cards = Array.from(r.querySelectorAll('.pmd-res-card'));

    cards.forEach(function (card, index) {
      card.style.position = 'relative';

      var key = cardKey(card, index);
      card.setAttribute('data-pmd-res-card-key', key);
      card.classList.toggle('is-selected', selected.has(key));

      if (!card.querySelector('.pmd-res-select-dot')) {
        var dot = document.createElement('div');
        dot.className = 'pmd-res-select-dot';
        dot.textContent = '✓';
        card.appendChild(dot);
      }

      var statusCandidate = Array.from(card.children).find(function (child) {
        return child !== card.firstElementChild && /^\d+$/.test(text(child));
      });

      if (statusCandidate && !statusCandidate.dataset.pmdStatusPolished) {
        statusCandidate.dataset.pmdStatusPolished = '1';
        statusCandidate.textContent = 'Status ' + text(statusCandidate);
      }
    });

    var empty = r.querySelector('.pmd-res-empty');
    if (empty && st && st.filter === 'today' && Array.isArray(st.reservations) && st.reservations.length > 0) {
      empty.textContent = 'No reservations for today. Click All Reservations to see ' + st.reservations.length + ' reservation(s).';
    }

    applyReservedFocus();
  }

  function scheduleEnhance() {
    clearTimeout(enhanceTimer);
    enhanceTimer = setTimeout(enhance, 60);
  }

  document.addEventListener('click', function (e) {
    var r = root();
    if (!r || !r.contains(e.target)) return;

    var btn = e.target.closest && e.target.closest('button');
    var card = e.target.closest && e.target.closest('.pmd-res-card');

    if (btn) {
      var label = text(btn);

      if (/^Today$/i.test(label) || /^All Reservations$/i.test(label)) {
        setTimeout(function () {
          selected.clear();
          enhance();
        }, 120);
        return;
      }

      if (/^Select|Selected/i.test(label)) {
        e.preventDefault();
        e.stopPropagation();

        selectMode = !selectMode;
        if (!selectMode) selected.clear();

        enhance();
        toast(selectMode ? 'Select mode enabled. Click reservation cards to select them.' : 'Select mode closed.');
        return;
      }

      if (btn.closest('.pmd-res-floor-actions')) {
        e.preventDefault();
        e.stopPropagation();

        var floorButtons = Array.from(r.querySelectorAll('.pmd-res-floor-actions .pmd-res-round-btn'));
        var idx = floorButtons.indexOf(btn);

        if (idx === 0) {
          toast('Reservation floor is read-only here. Edit table layout from the waiter/floor layout page.');
        }

        if (idx === 1) {
          focusReserved = !focusReserved;
          toast(focusReserved ? 'Focused reserved tables.' : 'Showing all floor tables.');
          enhance();
        }

        if (idx === 2) {
          compactMap = !compactMap;
          toast(compactMap ? 'Compact table icon view enabled.' : 'Normal table icon view enabled.');
          enhance();
        }

        return;
      }

      if (card && /✎/.test(label)) {
        e.preventDefault();
        e.stopPropagation();

        var key = card.getAttribute('data-pmd-res-card-key') || cardKey(card, 0);
        toast('Reservation #' + key + ' details are shown on this card.');
        return;
      }
    }

    if (card && selectMode) {
      e.preventDefault();
      e.stopPropagation();

      var key = card.getAttribute('data-pmd-res-card-key') || cardKey(card, 0);

      if (selected.has(key)) selected.delete(key);
      else selected.add(key);

      enhance();
      return;
    }
  }, true);

  var obsStarted = false;

  function startObserver() {
    var r = root();
    if (!r || obsStarted) return;

    obsStarted = true;

    var obs = new MutationObserver(function () {
      scheduleEnhance();
    });

    obs.observe(r, { childList: true, subtree: true });
  }

  [80, 250, 700, 1400].forEach(function (ms) {
    setTimeout(function () {
      enhance();
      startObserver();
    }, ms);
  });

  window.PMDReservationDashboardV7 = {
    enhance: enhance,
    debug: function () {
      var r = root();
      var st = state();

      return {
        root: !!r,
        filter: st ? st.filter : null,
        cards: r ? r.querySelectorAll('.pmd-res-card').length : 0,
        selected: Array.from(selected),
        selectMode: selectMode,
        focusReserved: focusReserved,
        compactMap: compactMap,
        activeButtons: r ? Array.from(r.querySelectorAll('.pmd-res-pill.is-active')).map(text) : [],
        visibleGhosts: Array.from(document.querySelectorAll('.page-wrapper,.pmd-owner-floor-v60,.pmd-owner-floor-v62,#navSidebar,#side-nav-menu')).filter(function (el) {
          var cs = getComputedStyle(el);
          var box = el.getBoundingClientRect();
          return cs.display !== 'none' && cs.visibility !== 'hidden' && box.width > 2 && box.height > 2;
        }).length
      };
    }
  };

  console.info('[PMD] Reservation Dashboard V7 button polish active');
})();
</script>
<!-- PMD_DASHBOARD_RESERVATION_V7_BUTTON_POLISH_END -->




<!-- PMD_WAITER_DASHBOARD_V35_CLEAN_REWRITE_CARD_HEADER_START -->
<style id="pmd-waiter-dashboard-v35-clean-rewrite-card-header-style">
/*
  V35 clean rewrite.
  No pseudo icon.
  No override fight.
  No duplicate pencil.
  We hide the original V5 header/title/edit, then create one clean header:
  left = table number, right = small circle edit button.
*/

#pmd-waiter-dashboard-root article.pmd-w5-card[data-order]:not(.pmd-v35-ready) {
  opacity: 0 !important;
}

#pmd-waiter-dashboard-root article.pmd-w5-card[data-order].pmd-v35-ready {
  opacity: 1 !important;
  transition: opacity .05s ease !important;
}

/* Hide original V5 top row, old Order title, old note/change pill */
#pmd-waiter-dashboard-root article.pmd-w5-card[data-order] > .pmd-w5-card-top,
#pmd-waiter-dashboard-root article.pmd-w5-card[data-order] > h2,
#pmd-waiter-dashboard-root article.pmd-w5-card[data-order] .pmd-w5-pill.red,
#pmd-waiter-dashboard-root article.pmd-w5-card[data-order] .pmd-w5-pill.pmd-v21-hide {
  display: none !important;
  visibility: hidden !important;
  opacity: 0 !important;
}

/* Hide the old bottom Edit button. V35 creates a new clean edit button in the header. */
#pmd-waiter-dashboard-root article.pmd-w5-card[data-order] .pmd-w5-card-actions button[data-edit] {
  display: none !important;
  visibility: hidden !important;
  opacity: 0 !important;
}

/* New clean header */
#pmd-waiter-dashboard-root article.pmd-w5-card[data-order] > .pmd-v35-card-head {
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  gap: 14px !important;
  margin: 0 0 18px 0 !important;
}

/* Table number top-left */
#pmd-waiter-dashboard-root .pmd-v35-table-no {
  min-width: 72px !important;
  height: 50px !important;
  border-radius: 16px !important;
  background: #ecfdf3 !important;
  border: 2px solid #16a34a !important;
  color: #061126 !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  padding: 0 14px !important;
  font-size: 26px !important;
  line-height: 1 !important;
  font-weight: 1000 !important;
  letter-spacing: -.03em !important;
  box-shadow: 0 10px 22px rgba(22,163,74,.16) !important;
}

#pmd-waiter-dashboard-root .pmd-v35-table-no.is-empty {
  background: #fff1f2 !important;
  border-color: #ef3340 !important;
  color: #7f1d1d !important;
}

/* Clean rewritten edit button */
#pmd-waiter-dashboard-root article.pmd-w5-card[data-order] > .pmd-v35-card-head > button.pmd-v35-edit-btn {
  width: 42px !important;
  min-width: 42px !important;
  max-width: 42px !important;
  height: 42px !important;
  min-height: 42px !important;
  max-height: 42px !important;
  border-radius: 999px !important;
  padding: 0 !important;
  margin: 0 !important;
  display: inline-grid !important;
  place-items: center !important;
  background: #ffffff !important;
  color: #070d24 !important;
  border: 2px solid #070d24 !important;
  box-shadow: 0 10px 22px rgba(7,13,36,.14) !important;
  font-size: 20px !important;
  line-height: 1 !important;
  font-weight: 1000 !important;
  overflow: hidden !important;
  text-indent: 0 !important;
}

#pmd-waiter-dashboard-root article.pmd-w5-card[data-order] > .pmd-v35-card-head > button.pmd-v35-edit-btn:hover {
  transform: translateY(-1px) !important;
  box-shadow: 0 14px 28px rgba(7,13,36,.18) !important;
}

/* Meta row: Total / Time / Order */
#pmd-waiter-dashboard-root article.pmd-w5-card[data-order] .pmd-w5-meta {
  display: grid !important;
  grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
  gap: 10px !important;
  margin: 0 0 14px 0 !important;
}

#pmd-waiter-dashboard-root article.pmd-w5-card[data-order] .pmd-w5-box small,
#pmd-waiter-dashboard-root article.pmd-w5-card[data-order] .pmd-w5-items small {
  font-size: 14px !important;
  font-weight: 900 !important;
  text-transform: uppercase !important;
}

#pmd-waiter-dashboard-root article.pmd-w5-card[data-order] .pmd-w5-box b,
#pmd-waiter-dashboard-root article.pmd-w5-card[data-order] .pmd-w5-item span,
#pmd-waiter-dashboard-root article.pmd-w5-card[data-order] .pmd-w5-item b {
  font-size: 16px !important;
  font-weight: 1000 !important;
}

/* Bottom actions: Payment + Status only */
#pmd-waiter-dashboard-root article.pmd-w5-card[data-order] .pmd-w5-card-actions {
  display: grid !important;
  grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
  gap: 12px !important;
  margin-top: 16px !important;
}

#pmd-waiter-dashboard-root article.pmd-w5-card[data-order] .pmd-w5-card-actions button {
  min-height: 54px !important;
  font-size: 15px !important;
  font-weight: 1000 !important;
}
</style>

<script id="pmd-waiter-dashboard-v35-clean-rewrite-card-header-script">
(function () {
  if (!/\/admin\/dashboardwaiter(?:$|[?#])/.test(location.pathname + location.search + location.hash)) return;
  if (window.PMD_WAITER_DASHBOARD_V35_CLEAN_REWRITE_CARD_HEADER) return;
  window.PMD_WAITER_DASHBOARD_V35_CLEAN_REWRITE_CARD_HEADER = true;

  function clean(s) {
    return String(s || '').replace(/\s+/g, ' ').trim();
  }

  function getOrderNo(card) {
    var fromData = clean(card.getAttribute('data-order'));
    if (fromData && fromData !== 'null' && fromData !== 'undefined') return fromData;

    var m = clean(card.textContent).match(/\bOrder\s*#?\s*(\d+)\b/i);
    return m ? m[1] : '';
  }

  function getTableNo(card) {
    var fromData = clean(card.getAttribute('data-table'));

    if (fromData && fromData !== 'null' && fromData !== 'undefined' && fromData !== '-' && fromData !== '—') {
      return fromData.replace(/^Table\s+/i, '');
    }

    var m = clean(card.textContent).match(/\bTable\s+(\d+)\b/i);
    return m ? m[1] : '';
  }

  function replaceAgeWithOrder(card, orderNo) {
    var boxes = Array.from(card.querySelectorAll(':scope > .pmd-w5-meta .pmd-w5-box'));
    if (boxes.length < 3) return;

    var box = boxes[2];
    box.classList.add('pmd-v35-order-box');

    var small = box.querySelector('small') || document.createElement('small');
    var b = box.querySelector('b') || document.createElement('b');

    small.textContent = 'Order';
    b.textContent = orderNo;

    if (!small.parentElement) box.appendChild(small);
    if (!b.parentElement) box.appendChild(b);
  }

  function buildCleanHeader(card, orderNo, tableNo) {
    // Remove previous experimental headers only.
    card.querySelectorAll(':scope > .pmd-v30-card-head, :scope > .pmd-v31-card-head, :scope > .pmd-v35-card-head').forEach(function (el) {
      el.remove();
    });

    var head = document.createElement('div');
    head.className = 'pmd-v35-card-head';

    var table = document.createElement('div');
    table.className = 'pmd-v35-table-no' + (tableNo ? '' : ' is-empty');
    table.textContent = tableNo || '—';

    var edit = document.createElement('button');
    edit.type = 'button';
    edit.className = 'pmd-v35-edit-btn';
    edit.setAttribute('data-edit', orderNo);
    edit.setAttribute('title', 'Edit order');
    edit.setAttribute('aria-label', 'Edit order');
    edit.textContent = '✎';

    head.appendChild(table);
    head.appendChild(edit);

    card.insertBefore(head, card.firstChild);
  }

  function applyCard(card) {
    var orderNo = getOrderNo(card);
    if (!orderNo) return;

    var tableNo = getTableNo(card);

    buildCleanHeader(card, orderNo, tableNo);
    replaceAgeWithOrder(card, orderNo);

    // Remove old experimental edit classes from any remaining hidden buttons.
    card.querySelectorAll('.pmd-v31-edit, .pmd-v33-edit-icon, .pmd-v34-edit-icon').forEach(function (btn) {
      if (!btn.classList.contains('pmd-v35-edit-btn')) {
        btn.classList.remove('pmd-v31-edit', 'pmd-v33-edit-icon', 'pmd-v34-edit-icon');
      }
    });

    card.classList.add('pmd-v35-ready');
  }

  function run() {
    var root = document.querySelector('#pmd-waiter-dashboard-root');
    if (!root) return;

    root.querySelectorAll('article.pmd-w5-card[data-order]').forEach(applyCard);
  }

  document.addEventListener('pmd-waiter-dashboard-rendered', function () {
    run();
    requestAnimationFrame(run);
    setTimeout(run, 80);
    setTimeout(run, 240);
  }, true);

  document.addEventListener('click', function () {
    setTimeout(run, 80);
  }, true);

  setTimeout(run, 0);
  setTimeout(run, 120);
  setTimeout(run, 500);
  setTimeout(run, 1200);

  window.PMDWaiterV35CleanHeader = {
    run: run,
    debug: function () {
      return Array.from(document.querySelectorAll('#pmd-waiter-dashboard-root article.pmd-w5-card[data-order]'))
        .slice(0, 20)
        .map(function (card) {
          var btn = card.querySelector(':scope > .pmd-v35-card-head > button.pmd-v35-edit-btn');
          var cs = btn ? getComputedStyle(btn) : null;

          return {
            order: card.getAttribute('data-order'),
            table: card.getAttribute('data-table'),
            ready: card.classList.contains('pmd-v35-ready'),
            header: clean(card.querySelector(':scope > .pmd-v35-card-head')?.textContent || ''),
            editText: btn ? btn.textContent.trim() : '',
            editClass: btn ? btn.className : '',
            editWidth: cs ? cs.width : '',
            editHeight: cs ? cs.height : '',
            oldV31Headers: card.querySelectorAll(':scope > .pmd-v31-card-head').length,
            oldEditVisible: Array.from(card.querySelectorAll('.pmd-w5-card-actions button[data-edit]')).filter(function (b) {
              return getComputedStyle(b).display !== 'none';
            }).length,
            bottomButtons: Array.from(card.querySelectorAll(':scope .pmd-w5-card-actions button')).filter(function (b) {
              return getComputedStyle(b).display !== 'none';
            }).map(function (b) {
              return clean(b.textContent);
            })
          };
        });
    }
  };

  console.info('[PMD] Waiter Dashboard V35 clean rewritten card header active');
})();
</script>
<!-- PMD_WAITER_DASHBOARD_V35_CLEAN_REWRITE_CARD_HEADER_END -->

<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>

<!-- PMD_OWNER_V114_ISOLATED_DASHBOARD2_START -->
<style id="pmd-owner-v114-isolated-dashboard2-style">
/* Dashboard2 isolated page. Does not use old pmd-v15-card / owner dashboard classes. */
.pmd-d2-root,
.pmd-d2-root * {
  box-sizing: border-box;
  font-family: Roboto, Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

.pmd-d2-root {
  position: fixed;
  z-index: 35;
  top: 32px;
  right: 84px;
  bottom: 24px;
  left: 126px;
  overflow: auto;
  padding: 28px 28px 56px;
  background: #f6f8fb;
  color: #061126;
  border-radius: 0;
}

html:not(.pmd-sidebar-icons-only) .pmd-d2-root {
  left: 230px;
}

.pmd-d2-shell {
  width: min(100%, 1540px);
  margin: 0 auto;
}

.pmd-d2-kpis {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 18px;
  margin-bottom: 22px;
}

.pmd-d2-kpi,
.pmd-d2-floor,
.pmd-d2-card {
  background: rgba(255,255,255,.94);
  border: 1px solid rgba(203,213,225,.78);
  border-radius: 18px;
  box-shadow: 0 16px 42px rgba(15,23,42,.06);
}

.pmd-d2-kpi {
  min-height: 126px;
  padding: 22px 24px;
  display: grid;
  grid-template-columns: 64px 1fr;
  gap: 16px;
  align-items: center;
}

.pmd-d2-kpi:nth-child(1) { border-color: rgba(134,239,172,.55); }
.pmd-d2-kpi:nth-child(2) { border-color: rgba(253,186,116,.55); }
.pmd-d2-kpi:nth-child(3) { border-color: rgba(147,197,253,.55); }
.pmd-d2-kpi:nth-child(4) { border-color: rgba(253,186,116,.55); }

.pmd-d2-ico {
  width: 56px;
  height: 56px;
  border-radius: 999px;
  background: #f1f5f9;
  display: grid;
  place-items: center;
  font-size: 22px;
}

.pmd-d2-kpi h3 {
  margin: 0 0 4px;
  font-size: 14px;
  font-weight: 900;
}

.pmd-d2-kpi strong {
  display: block;
  font-size: 38px;
  line-height: 1;
  letter-spacing: -.04em;
}

.pmd-d2-kpi p,
.pmd-d2-card p,
.pmd-d2-sub {
  margin: 8px 0 0;
  color: #64748b;
  font-size: 14px;
  font-weight: 700;
}

.pmd-d2-floor {
  min-height: 232px;
  height: 232px;
  overflow: hidden;
  padding: 22px 22px 20px;
  margin-bottom: 18px;
  transition: height .18s ease, min-height .18s ease;
}

.pmd-d2-floor.is-expanded {
  min-height: 660px;
  height: 660px;
}

.pmd-d2-floor-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  margin-bottom: 18px;
}

.pmd-d2-floor-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 25px;
  font-weight: 1000;
  letter-spacing: -.04em;
}

.pmd-d2-actions {
  display: flex;
  gap: 10px;
}

.pmd-d2-btn {
  border: 1px solid rgba(203,213,225,.9);
  background: #fff;
  color: #061126;
  min-width: 74px;
  height: 48px;
  border-radius: 999px;
  font-size: 14px;
  font-weight: 900;
  cursor: pointer;
}

.pmd-d2-btn-icon {
  width: 48px;
  min-width: 48px;
  font-size: 22px;
}

.pmd-d2-surface {
  height: 108px;
  border: 1px solid rgba(203,213,225,.95);
  border-radius: 18px;
  background:
    radial-gradient(circle at 1px 1px, rgba(148,163,184,.35) 1px, transparent 0) 0 0 / 24px 24px,
    linear-gradient(180deg, #f9fbff 0%, #eef4f9 100%);
  position: relative;
  overflow: hidden;
}

.pmd-d2-floor.is-expanded .pmd-d2-surface {
  height: 550px;
}

.pmd-d2-table {
  position: absolute;
  width: 78px;
  height: 48px;
  border-radius: 999px;
  border: 4px solid #22c55e;
  background: #fff;
  display: grid;
  place-items: center;
  font-size: 24px;
  font-weight: 1000;
  box-shadow: 0 8px 18px rgba(15,23,42,.08);
}

.pmd-d2-table.t1 { left: 8%; top: 28px; }
.pmd-d2-table.t2 { left: 19%; top: 28px; }
.pmd-d2-table.t3 { left: 30%; top: 28px; }
.pmd-d2-table.t8 { left: 41%; top: 28px; }

.pmd-d2-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 18px;
}

.pmd-d2-card {
  min-height: 350px;
  padding: 22px;
}

.pmd-d2-card h2 {
  margin: 0;
  font-size: 23px;
  line-height: 1.05;
  letter-spacing: -.045em;
  font-weight: 1000;
}

.pmd-d2-row {
  margin-top: 16px;
  padding: 14px 16px;
  background: #f8fafc;
  border: 1px solid rgba(203,213,225,.86);
  border-radius: 15px;
  display: flex;
  justify-content: space-between;
  gap: 12px;
  font-weight: 900;
}

.pmd-d2-muted {
  color: #64748b;
  font-weight: 700;
}

.pmd-d2-chart {
  height: 130px;
  margin-top: 24px;
  border-radius: 16px;
  background: linear-gradient(180deg, #fff 0%, #f8fafc 100%);
  position: relative;
  overflow: hidden;
}

.pmd-d2-line {
  position: absolute;
  inset: 28px 24px 24px;
}

.pmd-d2-pay {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-top: 22px;
}

.pmd-d2-donut {
  width: 120px;
  height: 120px;
  border-radius: 999px;
  background: conic-gradient(#7c3aed 0 82%, #f97316 82% 92%, #e5e7eb 92% 100%);
  display: grid;
  place-items: center;
  position: relative;
}

.pmd-d2-donut:after {
  content: "";
  width: 74px;
  height: 74px;
  background: #fff;
  border-radius: 999px;
  position: absolute;
}

.pmd-d2-donut span {
  position: relative;
  z-index: 1;
  font-weight: 1000;
  text-align: center;
}

.pmd-d2-mini {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin-top: 22px;
}

.pmd-d2-mini > div {
  background: #f8fafc;
  border: 1px solid rgba(203,213,225,.9);
  border-radius: 14px;
  padding: 14px;
  min-height: 100px;
  font-weight: 900;
}

.pmd-d2-action-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-top: 22px;
}

.pmd-d2-action-tile {
  min-height: 108px;
  display: grid;
  place-items: center;
  text-align: center;
  background: #f8fafc;
  border: 1px solid rgba(203,213,225,.9);
  border-radius: 14px;
  font-weight: 1000;
}

#pmd-dashboard2-quick-btn {
  position: fixed;
  right: 14px;
  top: 112px;
  z-index: 9999;
  width: 42px;
  height: 42px;
  border-radius: 999px;
  display: grid;
  place-items: center;
  text-decoration: none;
  background: #043f35;
  color: #fff;
  font-size: 12px;
  font-weight: 1000;
  border: 1px solid rgba(255,255,255,.8);
  box-shadow: 0 12px 32px rgba(15,23,42,.18);
}

html.pmd-dashboard2-active .page-wrapper .card,
html.pmd-dashboard2-active .page-content > .card,
html.pmd-dashboard2-active main > .card {
  display: none !important;
}

@media (max-width: 1180px) {
  .pmd-d2-kpis,
  .pmd-d2-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .pmd-d2-root {
    left: 112px;
    right: 24px;
  }
}

@media (max-width: 720px) {
  .pmd-d2-root {
    left: 0;
    right: 0;
    top: 0;
    bottom: 0;
    border-radius: 0;
    padding: 18px;
  }

  .pmd-d2-kpis,
  .pmd-d2-grid {
    grid-template-columns: 1fr;
  }
}
</style>

<script id="pmd-owner-v114-isolated-dashboard2-script">
(function () {
  'use strict';

  if (window.PMD_OWNER_V114_ISOLATED_DASHBOARD2) return;
  window.PMD_OWNER_V114_ISOLATED_DASHBOARD2 = true;

  function isAdmin() {
    return location.pathname.indexOf('/admin') === 0;
  }

  function isDashboard2() {
    return /\/admin\/dashboard2\/?$/.test(location.pathname);
  }

  function addQuickButton() {
    if (!isAdmin()) return;

    var old = document.querySelector('#pmd-dashboard2-quick-btn');
    if (old) old.remove();

    var a = document.createElement('a');
    a.id = 'pmd-dashboard2-quick-btn';
    a.href = '/admin/dashboard2';
    a.textContent = 'D2';
    a.title = 'Clean Dashboard 2';
    document.body.appendChild(a);
  }

  function card(title, sub, body) {
    return ''
      + '<section class="pmd-d2-card">'
      + '<h2>' + title + '</h2>'
      + '<p>' + sub + '</p>'
      + body
      + '</section>';
  }

  function render() {
    addQuickButton();

    if (!isDashboard2()) return;

    document.documentElement.classList.add('pmd-dashboard2-active');

    var old = document.querySelector('#pmd-d2-root');
    if (old) old.remove();

    var root = document.createElement('div');
    root.id = 'pmd-d2-root';
    root.className = 'pmd-d2-root';

    root.innerHTML = ''
      + '<div class="pmd-d2-shell">'
      + '<section class="pmd-d2-kpis">'
      + '<div class="pmd-d2-kpi"><div class="pmd-d2-ico">💵</div><div><h3>Revenue Today</h3><strong>€0.00</strong><p>All-time €221.94 · 0 orders</p></div></div>'
      + '<div class="pmd-d2-kpi"><div class="pmd-d2-ico">🧾</div><div><h3>Open Checks</h3><strong>5</strong><p>€221.94 pending value</p></div></div>'
      + '<div class="pmd-d2-kpi"><div class="pmd-d2-ico">🍽️</div><div><h3>Active Tables</h3><strong>2 / 4</strong><p>50% occupied · 2 free</p></div></div>'
      + '<div class="pmd-d2-kpi"><div class="pmd-d2-ico">📅</div><div><h3>Orders Today</h3><strong>0</strong><p>5 open checks now</p></div></div>'
      + '</section>'

      + '<section class="pmd-d2-floor" id="pmd-d2-floor">'
      + '<div class="pmd-d2-floor-head">'
      + '<div class="pmd-d2-floor-title">🍽️ Restaurant Floor</div>'
      + '<div class="pmd-d2-actions"><button class="pmd-d2-btn">Edit</button><button class="pmd-d2-btn pmd-d2-btn-icon" id="pmd-d2-expand">↗</button></div>'
      + '</div>'
      + '<div class="pmd-d2-surface">'
      + '<div class="pmd-d2-table t1">1</div><div class="pmd-d2-table t2">2</div><div class="pmd-d2-table t3">3</div><div class="pmd-d2-table t8">8</div>'
      + '</div>'
      + '</section>'


      + '<section class="pmd-d2-priority-grid">'
      + card('Payment Waiting', 'Owner payment risk',
          '<div class="pmd-d2-row"><span>Pending value<br><span class="pmd-d2-muted">5 open checks unpaid</span></span><b>€221.94</b></div>'
        + '<div class="pmd-d2-row"><span>Action<br><span class="pmd-d2-muted">Follow up before checkout</span></span><b>Now</b></div>')
      + card('Kitchen Clear', 'Kitchen delay status',
          '<div class="pmd-d2-row"><span>Delayed orders<br><span class="pmd-d2-muted">No delayed rows detected</span></span><b>0</b></div>'
        + '<div class="pmd-d2-row"><span>On-time rate<br><span class="pmd-d2-muted">From kitchen rows</span></span><b>100%</b></div>')
      + card('Table Status', 'Live table pressure',
          '<div class="pmd-d2-row"><span>Active tables<br><span class="pmd-d2-muted">50% occupied right now</span></span><b>2 / 4</b></div>'
        + '<div class="pmd-d2-row"><span>Free tables<br><span class="pmd-d2-muted">Available for new guests</span></span><b>2</b></div>')
      + card('Reservations', 'Reservation pressure',
          '<div class="pmd-d2-row"><span>Upcoming<br><span class="pmd-d2-muted">No upcoming reservations</span></span><b>0</b></div>'
        + '<div class="pmd-d2-row"><span>Pressure<br><span class="pmd-d2-muted">No reservation pressure</span></span><b>Clear</b></div>')
      + '</section>'

      + '<section class="pmd-d2-grid">'
      + card('Needs Attention', 'Actionable owner issues',
          '<div class="pmd-d2-row"><span>Pending value<br><span class="pmd-d2-muted">€221.94 open/unpaid checks</span></span><b>5</b></div>'
        + '<div class="pmd-d2-row"><span>Table data check<br><span class="pmd-d2-muted">Some orders need table data cleanup</span></span><b>2</b></div>')
      + card('Recent Activity', 'Latest restaurant activity',
          '<div class="pmd-d2-row"><span>Order #203<br><span class="pmd-d2-muted">Old table ref 84 · €138.00</span></span><b>●</b></div>'
        + '<div class="pmd-d2-row"><span>Order #202<br><span class="pmd-d2-muted">Table 3 · €29.99</span></span><b>●</b></div>'
        + '<div class="pmd-d2-row"><span>Order #201<br><span class="pmd-d2-muted">Table 8 · €14.99</span></span><b>●</b></div>')

      + card('Revenue by Hour', 'Today’s sales rhythm and peak windows',
          '<div class="pmd-d2-hour-summary"><strong>€0.00</strong><span>today · live hourly view</span></div>'
        + '<div class="pmd-d2-hour-bars">'
        + '<span class="is-muted" style="--h:18%"><b>11</b></span>'
        + '<span class="is-muted" style="--h:30%"><b>13</b></span>'
        + '<span class="is-muted" style="--h:42%"><b>15</b></span>'
        + '<span class="is-muted" style="--h:34%"><b>17</b></span>'
        + '<span style="--h:50%"><b>19</b></span>'
        + '<span style="--h:72%"><b>20</b></span>'
        + '<span style="--h:54%"><b>21</b></span>'
        + '<span class="is-muted" style="--h:36%"><b>23</b></span>'
        + '</div>'
        + '<p>All-time sales: €221.94</p>')

      + card('Payments', 'Payment methods and pending value',
          '<div class="pmd-d2-pay"><div class="pmd-d2-donut"><span>€221.94<br>Total</span></div><div><div class="pmd-d2-row"><span>Pending</span><b>€221.94</b></div><div class="pmd-d2-row"><span>Paid today</span><b>€0.00</b></div></div></div>')
      + card('Average Guest Spend', 'Average spend from real order totals',
          '<div class="pmd-d2-row"><span>€20.18<br><span class="pmd-d2-muted">Average Check Value</span></span></div>'
        + '<div class="pmd-d2-row"><span>€221.94<br><span class="pmd-d2-muted">Open Check Value</span></span></div>')
      + card('Lost Revenue', 'No-shows, cancellations and risk',
          '<div class="pmd-d2-row"><span>Confirmed lost today</span><b>€0.00</b></div>'
        + '<div class="pmd-d2-row"><span>Pending check risk</span><b>€221.94</b></div>')

      + card('Upcoming Reservations', 'Next reservation pressure and table planning',
          '<div class="pmd-d2-row"><span>—<br><span class="pmd-d2-muted">No upcoming reservations</span></span><b>Clear</b></div>'
        + '<div class="pmd-d2-row"><span>Table planning<br><span class="pmd-d2-muted">Reservation details will appear once connected</span></span><b>Ready</b></div>')

      + card('Kitchen Performance', 'Prep speed, delays and rush level',
          '<div class="pmd-d2-kitchen-grid">'
        + '<div class="pmd-d2-kitchen-box"><small>Avg Prep Time</small><strong>—</strong><span>connect prep timestamps</span></div>'
        + '<div class="pmd-d2-kitchen-box"><small>Delayed Orders</small><strong>0</strong><span>no delayed rows</span></div>'
        + '<div class="pmd-d2-kitchen-box"><small>On-Time Rate</small><strong>100%</strong><span>from kitchen rows</span></div>'
        + '</div>'
        + '<div class="pmd-d2-kitchen-rush"><span>Rush Status</span><strong>Medium</strong></div>')

      + card('Top Selling Items', 'Based on open checks for now',
          '<div class="pmd-d2-row"><span>1 · Soda Zitrone</span><b>9</b></div>'
        + '<div class="pmd-d2-row"><span>2 · AMALA</span><b>6</b></div>'
        + '<div class="pmd-d2-row"><span>3 · ATA RICE</span><b>1</b></div>')
      + card('Quick Actions', 'Fast owner actions',
          '<div class="pmd-d2-action-grid"><div class="pmd-d2-action-tile">👥<br>Walk-in</div><div class="pmd-d2-action-tile">🧾<br>New Order</div><div class="pmd-d2-action-tile">💳<br>Split Bill</div><div class="pmd-d2-action-tile">💬<br>Message</div></div>')

      + '<section class="pmd-d2-card pmd-d2-service-performance">'
      + '<div class="pmd-d2-service-head"><div><h2>Service Performance</h2><p>Real service overview from current checks and tables</p></div><span>Live</span></div>'
      + '<div class="pmd-d2-service-table">'
      + '<div class="pmd-d2-service-row pmd-d2-service-header"><b>Area</b><b>Count</b><b>Value</b><b>Status</b></div>'
      + '<div class="pmd-d2-service-row"><span><i>🍽️</i>Active tables</span><b>2 / 4</b><b>50%</b><em>Live</em></div>'
      + '<div class="pmd-d2-service-row"><span><i>🧾</i>Open checks</span><b>5</b><b>€221.94</b><em>Watch</em></div>'
      + '<div class="pmd-d2-service-row"><span><i>📦</i>Recent orders</span><b>3</b><b>€182.98</b><em>Visible</em></div>'
      + '<div class="pmd-d2-service-row"><span><i>💶</i>Avg. check</span><b>—</b><b>€20.18</b><em>Today</em></div>'
      + '</div>'
      + '</section>'

      + '</section>'
      + '</div>';

    document.body.appendChild(root);

    var floor = document.querySelector('#pmd-d2-floor');
    var btn = document.querySelector('#pmd-d2-expand');

    if (btn && floor) {
      btn.addEventListener('click', function () {
        floor.classList.toggle('is-expanded');
        btn.textContent = floor.classList.contains('is-expanded') ? '↙' : '↗';
      });
    }

    window.PMDDashboard2 = {
      root: root,
      expand: function () {
        floor.classList.add('is-expanded');
        btn.textContent = '↙';
      },
      collapse: function () {
        floor.classList.remove('is-expanded');
        btn.textContent = '↗';
      },
      debug: function () {
        return {
          active: true,
          path: location.pathname,
          root: !!document.querySelector('#pmd-d2-root'),
          cards: document.querySelectorAll('.pmd-d2-card').length,
          expanded: floor.classList.contains('is-expanded')
        };
      }
    };

    console.info('[PMD] Dashboard2 isolated v114 active');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', render, { once: true });
  } else {
    render();
  }

  window.addEventListener('load', render, { once: true });
})();
</script>
<!-- PMD_OWNER_V114_ISOLATED_DASHBOARD2_END -->



<!-- PMD_OWNER_EMERGENCY_UNHIDE_START -->
<style id="pmd-owner-emergency-unhide-style">
html.pmd-owner-clean-v113-boot .pmd-v15-shell,
html.pmd-owner-clean-v113-active .pmd-v15-shell,
.pmd-v15-shell {
  visibility: visible !important;
  pointer-events: auto !important;
  position: relative !important;
  left: auto !important;
  top: auto !important;
  width: auto !important;
  height: auto !important;
  overflow: visible !important;
  opacity: 1 !important;
}

.pmd-owner-clean-v113-shell,
#pmd-owner-clean-v113-role-btn {
  display: none !important;
  visibility: hidden !important;
}
</style>

<script id="pmd-owner-emergency-unhide-script">
(function () {
  function rescue() {
    document.documentElement.classList.remove(
      'pmd-owner-clean-v113-boot',
      'pmd-owner-clean-v113-active',
      'pmd-owner-v112-shield-ready'
    );

    var oc = document.querySelector('#pmd-owner-clean-v113-role-btn');
    if (oc) oc.remove();

    document.querySelectorAll('.pmd-owner-clean-v113-shell').forEach(function (el) {
      el.remove();
    });

    var shell = document.querySelector('.pmd-v15-shell');
    if (shell) {
      shell.style.setProperty('visibility', 'visible', 'important');
      shell.style.setProperty('position', 'relative', 'important');
      shell.style.setProperty('left', 'auto', 'important');
      shell.style.setProperty('top', 'auto', 'important');
      shell.style.setProperty('width', 'auto', 'important');
      shell.style.setProperty('height', 'auto', 'important');
      shell.style.setProperty('opacity', '1', 'important');
      shell.style.setProperty('pointer-events', 'auto', 'important');
    }
  }

  rescue();
  document.addEventListener('DOMContentLoaded', rescue, { once: true });
  window.addEventListener('load', rescue, { once: true });
  setTimeout(rescue, 300);
  setTimeout(rescue, 1000);
  setTimeout(rescue, 2500);

  window.PMDOwnerEmergencyUnhide = rescue;
  console.info('[PMD] Owner emergency unhide active');
})();
</script>
<!-- PMD_OWNER_EMERGENCY_UNHIDE_END -->



<!-- PMD_OWNER_DASHBOARD_V69_NO_LOADER_GEOMETRY_FIRST_START -->
<script>
(function () {
  try {
    var p = String(location.pathname || '').replace(/\/+$/, '');
    if (p === '/admin/dashboard' || p.indexOf('/admin/dashboard/') === 0) {
      var h = document.documentElement;
      h.classList.add(
        'pmd-owner-v69-no-loader',
        'pmd-admin-toolbar-ready',
        'pmd-role-owner-v30',
        'pmd-role-owner-v31',
        'pmd-v21-role-owner',
        'pmd-sidebar-icons-only'
      );
      window.PMD_OWNER_DASHBOARD_V69_NO_LOADER_GEOMETRY_FIRST = true;
    }
  } catch (e) {}
})();
</script>
<style id="pmd-owner-dashboard-v69-no-loader-critical">
/*
  V69: no loader, no hide.
  Lock final geometry before dashboard JS paints cards.
*/

html.pmd-owner-v69-no-loader,
html.pmd-owner-v69-no-loader * {
  box-sizing: border-box !important;
}

html.pmd-owner-v69-no-loader .content,
html.pmd-owner-v69-no-loader .main-container,
html.pmd-owner-v69-no-loader .page-content,
html.pmd-owner-v69-no-loader [class*="pmd-v15"],
html.pmd-owner-v69-no-loader [class*="pmd-v19"],
html.pmd-owner-v69-no-loader [class*="pmd-v21"],
html.pmd-owner-v69-no-loader [class*="pmd-v36"],
html.pmd-owner-v69-no-loader .pmd-owner-floor-v60 {
  transition: none !important;
  animation: none !important;
  scroll-behavior: auto !important;
}

html.pmd-owner-v69-no-loader .pmd-v15-kpi-grid,
html.pmd-owner-v69-no-loader .pmd-v19-kpi-grid,
html.pmd-owner-v69-no-loader .pmd-v21-kpi-grid,
html.pmd-owner-v69-no-loader .pmd-v36-kpi-grid {
  display: grid !important;
  grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
  gap: 18px !important;
  width: 100% !important;
  max-width: 100% !important;
  min-height: 118px !important;
}

html.pmd-owner-v69-no-loader .pmd-v19-reference-grid,
html.pmd-owner-v69-no-loader .pmd-v21-reference-grid,
html.pmd-owner-v69-no-loader .pmd-v36-card-grid {
  display: grid !important;
  grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
  gap: 18px !important;
  align-items: stretch !important;
  width: 100% !important;
  max-width: 100% !important;
}

html.pmd-owner-v69-no-loader .pmd-owner-floor-v60,
html.pmd-owner-v69-no-loader .pmd-owner-floor-v60.pmd-v62-after-kpi {
  grid-column: 1 / -1 !important;
  width: 100% !important;
  max-width: 100% !important;
  min-height: 213px !important;
}

html.pmd-owner-v69-no-loader .pmd-v15-card--alerts,
html.pmd-owner-v69-no-loader .pmd-v15-card--timeline,
html.pmd-owner-v69-no-loader .pmd-v19-area-alerts,
html.pmd-owner-v69-no-loader .pmd-v19-area-timeline,
html.pmd-owner-v69-no-loader .pmd-v36-span-2 {
  grid-column: span 2 !important;
  min-height: 396px !important;
}

@media (max-width: 1180px) {
  html.pmd-owner-v69-no-loader .pmd-v15-kpi-grid,
  html.pmd-owner-v69-no-loader .pmd-v19-kpi-grid,
  html.pmd-owner-v69-no-loader .pmd-v21-kpi-grid,
  html.pmd-owner-v69-no-loader .pmd-v36-kpi-grid,
  html.pmd-owner-v69-no-loader .pmd-v19-reference-grid,
  html.pmd-owner-v69-no-loader .pmd-v21-reference-grid,
  html.pmd-owner-v69-no-loader .pmd-v36-card-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
  }

  html.pmd-owner-v69-no-loader .pmd-v15-card--alerts,
  html.pmd-owner-v69-no-loader .pmd-v15-card--timeline,
  html.pmd-owner-v69-no-loader .pmd-v19-area-alerts,
  html.pmd-owner-v69-no-loader .pmd-v19-area-timeline,
  html.pmd-owner-v69-no-loader .pmd-v36-span-2 {
    grid-column: 1 / -1 !important;
  }
}

@media (max-width: 720px) {
  html.pmd-owner-v69-no-loader .pmd-v15-kpi-grid,
  html.pmd-owner-v69-no-loader .pmd-v19-kpi-grid,
  html.pmd-owner-v69-no-loader .pmd-v21-kpi-grid,
  html.pmd-owner-v69-no-loader .pmd-v36-kpi-grid,
  html.pmd-owner-v69-no-loader .pmd-v19-reference-grid,
  html.pmd-owner-v69-no-loader .pmd-v21-reference-grid,
  html.pmd-owner-v69-no-loader .pmd-v36-card-grid {
    grid-template-columns: 1fr !important;
  }
}
</style>
<!-- PMD_OWNER_DASHBOARD_V69_NO_LOADER_GEOMETRY_FIRST_END -->

<!-- PMD_ADMIN_LOADER_HARD_RESET_V64_EARLY_START -->
<script>
(function(){
  try {
    document.documentElement.classList.remove(
      'pmd-ui-fouc-shield-v58',
      'pmd-dashboard-jank-lock-v59',
      'pmd-shell-loading-v60',
      'pmd-shell-ready-v60',
      'pmd-sidebar-logo-locking-v60',
      'pmd-sidebar-logo-ready-v60',
      'pmd-sidebar-logo-locking-v62',
      'pmd-sidebar-logo-ready-v62'
    );
    if (document.body) document.body.classList.remove('pmd-page-leaving-v60');
  } catch(e) {}
})();
</script>
<!-- PMD_ADMIN_LOADER_HARD_RESET_V64_EARLY_END -->
<!-- PMD_ADMIN_LOADER_HARD_RESET_V64_PRELOAD_START -->
<link rel="prefetch" as="image" href="{{ asset('app/admin/assets/images/pmd-logo-final.png') }}">
<!-- PMD_KDS_ULTRA_FAST_V83_LOGO_PRELOAD_GUARD_START -->
@unless(!empty($__pmdIsKdsDashboardV82))

<link rel="prefetch" as="image" href="{{ asset('app/admin/assets/images/pmd-logo-final.png') }}">
@endunless
<!-- PMD_KDS_ULTRA_FAST_V83_LOGO_PRELOAD_GUARD_END -->

<!-- PMD_KDS_ULTRA_FAST_V83_LOGO_PRELOAD_GUARD_START -->
@unless(!empty($__pmdIsKdsDashboardV82))
@endunless
<!-- PMD_KDS_ULTRA_FAST_V83_LOGO_PRELOAD_GUARD_END -->

<!-- PMD_KDS_ULTRA_FAST_V83_LOGO_PRELOAD_GUARD_START -->
@unless(!empty($__pmdIsKdsDashboardV82))
@endunless
<!-- PMD_KDS_ULTRA_FAST_V83_LOGO_PRELOAD_GUARD_END -->

<!-- PMD_KDS_ULTRA_FAST_V83_LOGO_PRELOAD_GUARD_START -->
@unless(!empty($__pmdIsKdsDashboardV82))
@endunless
<!-- PMD_KDS_ULTRA_FAST_V83_LOGO_PRELOAD_GUARD_END -->

<!-- PMD_KDS_ULTRA_FAST_V83_LOGO_PRELOAD_GUARD_START -->
@unless(!empty($__pmdIsKdsDashboardV82))
@endunless
<!-- PMD_KDS_ULTRA_FAST_V83_LOGO_PRELOAD_GUARD_END -->
<!-- PMD_ADMIN_LOADER_HARD_RESET_V64_PRELOAD_END -->
@php
    $pmdIsNativeMediaContext = request()->is('admin/settings*') || request()->is('admin/media_manager*');
@endphp

    {!! get_metas() !!}
    <meta name="csrf-token" content="{{ csrf_token() }}">
    {!! get_favicon() !!}
    @empty($pageTitle = Template::getTitle())
        <title>{{setting('site_name')}}</title>
    @else
        <title>{{ $pageTitle }}@lang('admin::lang.site_title_separator'){{setting('site_name')}}</title>
    @endempty
    {{-- Use asset combiner to ensure all widget CSS files are included --}}
    {!! get_style_tags() !!}
    <link rel="stylesheet" href="{{ asset('app/admin/assets/css/notifications.css') }}">
    <link rel="stylesheet" href="{{ asset('app/admin/assets/css/push-notifications.css') }}">
    <link rel="stylesheet" href="{{ asset('app/admin/assets/css/header-dropdowns.css') }}?v={{ time() }}">
    <!-- Remove Green Edges from Dropdowns -->
    <link rel="stylesheet" href="{{ asset('app/admin/assets/css/remove-green-edges.css') }}?v={{ time() }}">
    <link rel="stylesheet" href="{{ asset('app/admin/assets/css/smooth-transitions.css') }}?v={{ time() }}">
    <link rel="stylesheet" href="{{ asset('app/admin/assets/css/custom-fixes.css') }}?v={{ time() }}">
    <link rel="stylesheet" href="{{ asset('app/admin/assets/css/calendar.css') }}?v={{ time() }}">
    <!-- Modern Admin Settings Styling -->
    <link rel="stylesheet" href="{{ asset('app/admin/assets/css/admin-settings-modern.css') }}?v={{ time() }}">
    <!-- SweetAlert2 – match admin modal/card design -->
    <link rel="stylesheet" href="{{ asset('app/admin/assets/css/sweetalert2-modal-style.css') }}?v={{ time() }}">
    <!-- Admin confirm modal – rounder card, button spacing, Cancel style -->
    <link rel="stylesheet" href="{{ asset('app/admin/assets/css/admin-confirm-modal.css') }}?v={{ time() }}">
    <!-- Unified modal design – round corners, nice buttons, consistent styling for all modals -->
    <link rel="stylesheet" href="{{ asset('app/admin/assets/css/admin-modals-unified.css') }}?v={{ time() }}">
    <!-- Rounded corners for notification panel, settings menu, profile dropdown, toast -->
    <link rel="stylesheet" href="{{ asset('app/admin/assets/css/admin-cards-rounded.css') }}?v={{ time() }}">
    <!-- Blue Buttons Override - Replace all green buttons with login button style -->
    <link rel="stylesheet" href="{{ asset('app/admin/assets/css/blue-buttons-override.css') }}?v={{ time() }}">
    <!-- Smooth Corner - Replace Star Icon with Rounded Corner -->
    <link rel="stylesheet" href="{{ asset('app/admin/assets/css/smooth-corner-replace-star.css') }}?v={{ time() }}">
    {{-- Dashboard Container Widget CSS is included via get_style_tags() combiner --}}
    <!-- Fix Menu-Grid Hover - Only icon scale, no green flashing -->
    <link rel="stylesheet" href="{{ asset('app/admin/assets/css/fix-menu-grid-hover.css') }}?v={{ time() }}">
    <!-- Fix Footer Button - Remove green hover -->
    <link rel="stylesheet" href="{{ asset('app/admin/assets/css/fix-footer-button-no-green.css') }}?v={{ time() }}">
    <!-- Fix Toggle Switches - Restore iOS-style appearance -->
    <link rel="stylesheet" href="{{ asset('app/admin/assets/css/fix-toggle-switches.css') }}?v={{ time() }}">
    <!-- Fix Notification Header Border - Make it straight and full width -->
    <link rel="stylesheet" href="{{ asset('app/admin/assets/css/fix-notification-header-border.css') }}?v={{ time() }}">
    <!-- Fix Notification Header Buttons - Fix z-index, spacing, padding, borders -->
    <link rel="stylesheet" href="{{ asset('app/admin/assets/css/fix-notification-header-buttons.css') }}?v={{ time() }}">
    <!-- Fix Profile Dropdown - Remove green hover effects and green text-muted color -->
    <link rel="stylesheet" href="{{ asset('app/admin/assets/css/fix-profile-dropdown-green.css') }}?v={{ time() }}">
    <!-- Fix Profile Dropdown Hover - Remove inline styles blocking hover effect -->
    <link rel="stylesheet" href="{{ asset('app/admin/assets/css/fix-profile-dropdown-hover.css') }}?v={{ time() }}">
    <!-- Fix Profile Dropdown Closed - Disable items when dropdown is closed -->
    <link rel="stylesheet" href="{{ asset('app/admin/assets/css/fix-profile-dropdown-closed.css') }}?v={{ time() }}">
    <!-- Fix Green Buttons and Text - Change btn-default, btn-outline-default, and text-muted from green to dark blue/gray -->
    <link rel="stylesheet" href="{{ asset('app/admin/assets/css/fix-green-buttons-and-text.css') }}?v={{ time() }}">
    <!-- Modern Media Finder - Elegant image uploader redesign -->
    @unless($pmdIsNativeMediaContext)
    <link rel="stylesheet" href="{{ asset('app/admin/assets/css/modern-media-finder.css') }}?v={{ time() }}">
    @endunless
    <!-- Media Finder Widget CSS - Required for image uploader fields -->
    <link rel="stylesheet" href="{{ asset('app/admin/formwidgets/mediafinder/assets/css/mediafinder.css') }}?v={{ time() }}">
    <!-- Date range picker: load last so overrides (bigger card, buttons, ranges) win over .btn-sm etc -->
    <link rel="stylesheet" href="{{ asset('app/admin/assets/css/daterangepicker-arrows.css') }}?v={{ time() }}">
    <!-- No green toolbar buttons - MUST load last so toolbar Save/Back stay blue -->
    <link rel="stylesheet" href="{{ asset('app/admin/assets/css/no-green-toolbar-buttons.css') }}?v={{ time() }}">
    <!-- Dropdown fields same size as text inputs - load after other form styles -->
    <link rel="stylesheet" href="{{ asset('app/admin/assets/css/dropdown-field-same-size.css') }}?v={{ time() }}">
    {{-- Critical: prevent green flash on first paint - inline so it's in the first render --}}
    <style id="no-green-toolbar-critical">
        body:not(.pmd-admin-theme-v1) .toolbar-action,
        body:not(.pmd-admin-theme-v1) .progress-indicator-container {
            --bs-primary-rgb: 54, 74, 99 !important;
            --bs-btn-focus-shadow-rgb: 54, 74, 99 !important;
        }
        body:not(.pmd-admin-theme-v1) .toolbar-action .btn-primary,
        body:not(.pmd-admin-theme-v1) .toolbar-action .progress-indicator-container .btn-primary,
        body:not(.pmd-admin-theme-v1) .progress-indicator-container .btn-primary,
        body:not(.pmd-admin-theme-v1) .toolbar-action .progress-indicator-container .btn-group .btn-primary {
            background: linear-gradient(135deg, #1f2b3a 0%, #364a63 100%) !important;
            background-color: #364a63 !important;
            border-color: #364a63 !important;
            box-shadow: 0 4px 15px rgba(54, 74, 99, 0.35) !important;
        }
        body:not(.pmd-admin-theme-v1) .toolbar-action .progress-indicator-container .progress-indicator,
        body:not(.pmd-admin-theme-v1) .progress-indicator-container .progress-indicator {
            background: transparent !important;
        }
    </style>

<!-- ===== ADMIN HEADER FIRST PAINT STABILIZER ===== -->

<!-- ===== END ADMIN HEADER FIRST PAINT STABILIZER ===== -->

<style>

</style>

<style>

</style>

<style>

</style>

<style>
/* ===== PC AVATAR LAST GAP EXACT FIX ===== */
@media (min-width: 768px) {

  /* ریشه هدر */
  .navbar.navbar-right {
    display: flex !important;
    align-items: center !important;
    justify-content: flex-end !important;
    gap: 32px !important;
  }

  /* ul اصلی */
  .navbar.navbar-right > ul#menu-mainmenu,
  .navbar.navbar-right > ul.navbar-nav {
    display: flex !important;
    align-items: center !important;
    gap: 32px !important;
    margin: 0 !important;
    padding: 0 !important;
    width: auto !important;
  }

  /* li ها هیچ spacing اضافه نداشته باشند */
  .navbar.navbar-right > ul#menu-mainmenu > li,
  .navbar.navbar-right > ul.navbar-nav > li {
    margin: 0 !important;
    padding: 0 !important;
    flex: 0 0 auto !important;
  }

  /* wrapper های tooltip هم spacing خراب نکنند */
  .navbar.navbar-right .media-toolbar-tooltip-wrap {
    display: contents !important;
    margin: 0 !important;
    padding: 0 !important;
  }

  /* همه لینک‌ها و دکمه‌های واقعی */
  .navbar.navbar-right #guide-tour-btn,
  .navbar.navbar-right > ul#menu-mainmenu > li > a.nav-link,
  .navbar.navbar-right > ul#menu-mainmenu > li > span > a.nav-link,
  .navbar.navbar-right > ul.navbar-nav > li > a.nav-link,
  .navbar.navbar-right > ul.navbar-nav > li > span > a.nav-link {
    margin: 0 !important;
    padding: 0 !important;
  }

  /* فقط آیتم آخر: هر spacing اضافه را صفر کن */
  .navbar.navbar-right > ul#menu-mainmenu > li:last-child,
  .navbar.navbar-right > ul.navbar-nav > li:last-child,
  .navbar.navbar-right > ul#menu-mainmenu > li:last-child > a,
  .navbar.navbar-right > ul.navbar-nav > li:last-child > a,
  .navbar.navbar-right > ul#menu-mainmenu > li:last-child .nav-link,
  .navbar.navbar-right > ul.navbar-nav > li:last-child .nav-link,
  .navbar.navbar-right > ul#menu-mainmenu > li:last-child img,
  .navbar.navbar-right > ul.navbar-nav > li:last-child img {
    margin-left: 0 !important;
    margin-right: 0 !important;
  }

  /* نوتیفیکیشن هم spacing داخلی اضافه نداشته باشد */
  .navbar.navbar-right #notif-root,
  .navbar.navbar-right li#notif-root,
  .navbar.navbar-right #notif-root > a,
  .navbar.navbar-right #notif-root > span,
  .navbar.navbar-right #notif-root > span > a {
    margin: 0 !important;
    padding: 0 !important;
  }
}
/* ===== END PC AVATAR LAST GAP EXACT FIX ===== */
</style>

<style>
/* ===== PC ONLY LAST GAP SURGICAL FIX ===== */
@media (min-width: 768px) {

  /* spacing پایه برای PC */
  .navbar.navbar-right,
  .navbar .navbar-right {
    display: flex !important;
    align-items: center !important;
    justify-content: flex-end !important;
    gap: 32px !important;
  }

  .navbar.navbar-right > ul#menu-mainmenu,
  .navbar.navbar-right > ul.navbar-nav,
  .navbar .navbar-right > ul#menu-mainmenu,
  .navbar .navbar-right > ul.navbar-nav {
    display: flex !important;
    align-items: center !important;
    gap: 32px !important;
    margin: 0 !important;
    padding: 0 !important;
    width: auto !important;
  }

  .navbar.navbar-right > ul#menu-mainmenu > li,
  .navbar.navbar-right > ul.navbar-nav > li,
  .navbar .navbar-right > ul#menu-mainmenu > li,
  .navbar .navbar-right > ul.navbar-nav > li {
    margin: 0 !important;
    padding: 0 !important;
    flex: 0 0 auto !important;
  }

  /* لینک‌های آیکن‌ها */
  .navbar.navbar-right > ul#menu-mainmenu > li > a.nav-link,
  .navbar.navbar-right > ul#menu-mainmenu > li > span > a.nav-link,
  .navbar.navbar-right > ul.navbar-nav > li > a.nav-link,
  .navbar.navbar-right > ul.navbar-nav > li > span > a.nav-link,
  .navbar .navbar-right > ul#menu-mainmenu > li > a.nav-link,
  .navbar .navbar-right > ul#menu-mainmenu > li > span > a.nav-link,
  .navbar .navbar-right > ul.navbar-nav > li > a.nav-link,
  .navbar .navbar-right > ul.navbar-nav > li > span > a.nav-link {
    width: 42px !important;
    height: 42px !important;
    min-width: 42px !important;
    min-height: 42px !important;
    margin: 0 !important;
    padding: 0 !important;
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
  }

  /* مشکل واقعی: فقط آیتم بلافاصله بعد از notif-root */
  #menu-mainmenu > li#notif-root + li,
  .navbar-nav > li#notif-root + li {
    margin-left: -8px !important;
    padding-left: 0 !important;
  }

  #menu-mainmenu > li#notif-root + li > a.nav-link,
  #menu-mainmenu > li#notif-root + li > span > a.nav-link,
  .navbar-nav > li#notif-root + li > a.nav-link,
  .navbar-nav > li#notif-root + li > span > a.nav-link {
    margin-left: 0 !important;
    padding-left: 0 !important;
  }

  /* اگر avatar آخرین آیتم visible باشد */
  #menu-mainmenu > li:last-child,
  .navbar-nav > li:last-child {
    margin-left: -8px !important;
    margin-right: 0 !important;
    padding-left: 0 !important;
    padding-right: 0 !important;
  }

  #menu-mainmenu > li:last-child > a.nav-link,
  #menu-mainmenu > li:last-child > span > a.nav-link,
  .navbar-nav > li:last-child > a.nav-link,
  .navbar-nav > li:last-child > span > a.nav-link {
    margin-left: 0 !important;
    margin-right: 0 !important;
    padding-left: 0 !important;
    padding-right: 0 !important;
  }

  /* عکس آواتار هم spacing اضافه نسازد */
  .navbar-profile-avatar,
  .navbar .navbar-profile-avatar {
    margin: 0 !important;
    display: block !important;
  }
}
/* ===== END PC ONLY LAST GAP SURGICAL FIX ===== */
</style>

<style>

</style>

<style>

</style>

<style>

</style>

<style>

</style>

<style>

</style>

<style id="mobile-header-one-final-fix">
/* ===== MOBILE HEADER ONE FINAL FIX ===== */
@media (max-width: 767.98px) {

  /* root */
  .navbar-top .navbar-right,
  .navbar.navbar-right {
    display: flex !important;
    align-items: center !important;
    justify-content: flex-start !important;
    width: 100% !important;
    min-height: 64px !important;
    padding: 0 8px !important;
    margin: 0 !important;
    gap: 0 !important;
    box-sizing: border-box !important;
    overflow: visible !important;
  }

  /* hamburger */
  .navbar-top .navbar-right > .navbar-toggler,
  .navbar.navbar-right > .navbar-toggler {
    flex: 0 0 52px !important;
    width: 52px !important;
    min-width: 52px !important;
    max-width: 190px !important;
    height: 44px !important;
    min-height: 44px !important;
    margin: 0 !important;
    padding: 0 !important;
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    position: relative !important;
    left: auto !important;
    right: auto !important;
    top: auto !important;
    transform: none !important;
  }

  /* the 4 right icons area */
  .navbar-top .navbar-right > #menu-mainmenu,
  .navbar.navbar-right > #menu-mainmenu {
    display: flex !important;
    flex: 1 1 auto !important;
    width: auto !important;
    min-width: 0 !important;
    margin: 0 !important;
    padding: 0 !important;
    list-style: none !important;
    align-items: center !important;
    justify-content: space-evenly !important;
    gap: 0 !important;
  }

  /* neutralize old per-item hacks */
  .navbar-top .navbar-right > #menu-mainmenu > li,
  .navbar.navbar-right > #menu-mainmenu > li,
  .navbar-top .navbar-nav > .nav-item,
  .navbar-top .navbar-nav > .nav-item:not(:last-child),
  .navbar-top .navbar-nav > .nav-item:last-child,
  .navbar-top #notif-root,
  .navbar-top li#notif-root,
  .navbar-top #menu-mainmenu > li#menuitem-preview,
  .navbar-top .mobile-profile-slot,
  .navbar-top .mobile-guide-slot {
    flex: 0 1 auto !important;
    margin: 0 !important;
    padding: 0 !important;
    position: relative !important;
    left: auto !important;
    right: auto !important;
    top: auto !important;
    transform: none !important;
  }

  /* kill the bad "push last item to far right" rule */
  .navbar-top .navbar-nav > .nav-item:last-child {
    margin-left: 0 !important;
    margin-right: 0 !important;
    padding-left: 0 !important;
  }

  /* hide settings on mobile */
  .navbar-top #menu-mainmenu > li.mobile-hidden-settings,
  .navbar.navbar-right #menu-mainmenu > li.mobile-hidden-settings {
    display: none !important;
  }

  /* equal icon hit area */
  .navbar-top #menu-mainmenu .nav-link,
  .navbar-top #menu-mainmenu .dropdown-toggle,
  .navbar-top #menu-mainmenu .navbar-tour-btn,
  .navbar-top #menu-mainmenu .mobile-guide-slot > button,
  .navbar.navbar-right #menu-mainmenu .nav-link,
  .navbar.navbar-right #menu-mainmenu .dropdown-toggle,
  .navbar.navbar-right #menu-mainmenu .navbar-tour-btn,
  .navbar.navbar-right #menu-mainmenu .mobile-guide-slot > button {
    width: 44px !important;
    height: 44px !important;
    min-width: 44px !important;
    min-height: 44px !important;
    margin: 0 !important;
    padding: 0 !important;
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
  }

  .navbar-top .navbar-profile-avatar,
  .navbar.navbar-right .navbar-profile-avatar {
    width: 34px !important;
    height: 34px !important;
    min-width: 34px !important;
    min-height: 34px !important;
    margin: 0 auto !important;
    display: block !important;
  }
}
/* ===== END MOBILE HEADER ONE FINAL FIX ===== */
</style>

<style id="mobile-header-first-paint-guard">
/* ===== MOBILE HEADER FIRST PAINT GUARD ===== */
@media (max-width: 767.98px) {
  .navbar-top .navbar-right,
  .navbar.navbar-right {
    visibility: hidden !important;
  }

  html.mobile-header-ready .navbar-top .navbar-right,
  html.mobile-header-ready .navbar.navbar-right {
    visibility: visible !important;
  }
}
/* ===== END MOBILE HEADER FIRST PAINT GUARD ===== */
</style>

<script>
/* ===== MOBILE HEADER EARLY FIRST PAINT FIX ===== */
(function () {
  function ensureGuideInsideMenu(menu, guideBtn) {
    var guideLi = guideBtn ? guideBtn.closest('li') : null;

    if (!guideBtn) return null;

    if (!guideLi || guideLi.parentNode !== menu) {
      guideLi = document.createElement('li');
      guideLi.className = 'nav-item mobile-guide-slot';
      guideLi.appendChild(guideBtn);
      menu.appendChild(guideLi);
    }

    return guideLi;
  }

  function fixMobileHeaderEarly() {
    if (window.innerWidth > 767) {
      document.documentElement.classList.add('mobile-header-ready');
      return;
    }

    var menu = document.getElementById('menu-mainmenu');
    var preview = document.getElementById('menuitem-preview');
    var notif = document.getElementById('notif-root');
    var guideBtn = document.getElementById('guide-tour-btn');

    if (!menu || !preview || !notif || !guideBtn) return;

    var items = Array.prototype.slice.call(menu.children || []);
    var profileLi = items.find(function (li) {
      return li && li.querySelector && li.querySelector('.navbar-profile-avatar');
    });

    if (!profileLi) return;

    var guideLi = ensureGuideInsideMenu(menu, guideBtn);
    if (!guideLi) return;

    Array.prototype.slice.call(menu.children || []).forEach(function (li) {
      var isSettings = !!(li && li.querySelector && li.querySelector('a[aria-label="Settings"]'));
      var keep = li === preview || li === profileLi || li === notif || li === guideLi;

      if (isSettings || !keep) {
        li.classList.add('mobile-hidden-force');
        li.style.setProperty('display', 'none', 'important');
      } else {
        li.classList.remove('mobile-hidden-force');
        li.style.removeProperty('display');
      }
    });

    menu.innerHTML = '';
    menu.appendChild(preview);
    menu.appendChild(profileLi);
    menu.appendChild(notif);
    menu.appendChild(guideLi);

    document.documentElement.classList.add('mobile-header-ready');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fixMobileHeaderEarly, { once: true });
  } else {
    fixMobileHeaderEarly();
  }

  window.addEventListener('resize', fixMobileHeaderEarly, { passive: true });
})();
/* ===== END MOBILE HEADER EARLY FIRST PAINT FIX ===== */
</script>

<style>
/* ===== MOBILE HEADER HIDE UNTIL STABLE ===== */
@media (max-width: 767.98px) {
  .navbar-top .navbar-right,
  .navbar.navbar-right {
    opacity: 0 !important;
    visibility: hidden !important;
    transition: none !important;
  }

  html.mobile-header-stable .navbar-top .navbar-right,
  html.mobile-header-stable .navbar.navbar-right {
    opacity: 1 !important;
    visibility: visible !important;
  }
}
/* ===== END MOBILE HEADER HIDE UNTIL STABLE ===== */
</style>

<script>
/* ===== MOBILE HEADER HIDE UNTIL STABLE ===== */
(function () {
  function revealWhenStable() {
    if (window.innerWidth > 767) {
      document.documentElement.classList.add('mobile-header-stable');
      return;
    }

    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        document.documentElement.classList.add('mobile-header-stable');
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', revealWhenStable, { once: true });
  } else {
    revealWhenStable();
  }

  window.addEventListener('load', revealWhenStable, { once: true });
})();
 /* ===== END MOBILE HEADER HIDE UNTIL STABLE ===== */
</script>

    @unless($pmdIsNativeMediaContext)
    <link rel="stylesheet" href="{{ asset('app/admin/assets/css/pmd-mediamanager-autofix.css') }}?v={{ time() }}">
    @endunless
    {{-- Final admin toolbar button override: keep after legacy/admin/page CSS because older files override toolbar button sizing and colors. --}}
    <link rel="stylesheet" href="{{ asset('app/admin/assets/css/pmd-admin/components/toolbar-buttons.css') }}?v={{ time() }}">

<!-- PMD_DASHBOARD_LOGO_SIZE_FIX_START -->
<style id="pmd-dashboard-logo-size-fix">
    /* Keep admin/dashboard logos inside the header frame */
    .navbar-top,
    .navbar-fixed-top {
        overflow: visible !important;
    }

    .navbar-top .navbar-brand,
    .navbar-fixed-top .navbar-brand,
    .navbar-top .navbar-brand a,
    .navbar-fixed-top .navbar-brand a {
        display: flex !important;
        align-items: center !important;
        min-height: 56px !important;
        max-height: 48px !important;
        overflow: hidden !important;
    }

    .navbar-top .navbar-brand img,
    .navbar-fixed-top .navbar-brand img,
    .navbar-top img.dashboard-logo,
    .navbar-fixed-top img.dashboard-logo,
    .navbar-top .dashboard-logo img,
    .navbar-fixed-top .dashboard-logo img,
    .navbar-top img[src*="/assets/media/"]:not(.navbar-profile-avatar):not(.rounded-circle),
    .navbar-fixed-top img[src*="/assets/media/"]:not(.navbar-profile-avatar):not(.rounded-circle) {
        max-height: 48px !important;
        max-width: 190px !important;
        width: auto !important;
        height: auto !important;
        object-fit: contain !important;
        object-position: center center !important;
        display: block !important;
    }

    /* Settings page media previews should never explode layout */
    body[class*="settings"] img[src*="/assets/media/"],
    .page-content img[src*="/assets/media/uploads/"],
    .form-widget img[src*="/assets/media/uploads/"],
    .field-mediafinder img,
    [data-control="mediafinder"] img {
        max-width: 190px !important;
        max-height: 48px !important;
        width: auto !important;
        height: auto !important;
        object-fit: contain !important;
    }

    /* But do not shrink table-map background because it is CSS background, not img */
</style>
<!-- PMD_DASHBOARD_LOGO_SIZE_FIX_END -->

<style id="pmd-force-dashboard-logo-right-style">

/* PMD_FORCE_DASHBOARD_LOGO_RIGHT_START */
.navbar-top .navbar-brand a.logo,
.navbar-fixed-top .navbar-brand a.logo {
    margin-left: 44px !important;
    transform: translateX(0) !important;
    display: inline-flex !important;
    align-items: center !important;
}

.navbar-top .navbar-brand a.logo img.pmd-dashboard-logo-img,
.navbar-fixed-top .navbar-brand a.logo img.pmd-dashboard-logo-img {
    max-height: 48px !important;
    max-width: 190px !important;
    width: auto !important;
    height: auto !important;
    object-fit: contain !important;
}
/* PMD_FORCE_DASHBOARD_LOGO_RIGHT_END */

</style>
<style id="pmd-media-manager-preview-toolbar-fix">
/* PMD_MEDIA_MANAGER_PREVIEW_TOOLBAR_FIX_START */
/* Fix broken large square action buttons in Media Manager right preview sidebar.
   Scoped only to native media manager preview toolbar. */
body .media-manager .media-sidebar .sidebar-preview-toolbar {
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    padding: 8px 0 10px 0 !important;
    margin: 0 !important;
    width: 100% !important;
}

body .media-manager .media-sidebar .sidebar-preview-toolbar .btn-group,
body .media-manager .media-sidebar .sidebar-preview-toolbar .btn-group-sm {
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    flex-wrap: nowrap !important;
    gap: 6px !important;
    width: auto !important;
    min-width: 0 !important;
    max-width: none !important;
    height: auto !important;
    padding: 0 !important;
    margin: 0 auto !important;
    box-shadow: none !important;
}

body .media-manager .media-sidebar .sidebar-preview-toolbar .media-toolbar-tooltip-wrap {
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    flex: 0 0 auto !important;
    width: auto !important;
    height: auto !important;
    min-width: 0 !important;
    min-height: 0 !important;
    max-width: none !important;
    max-height: none !important;
    padding: 0 !important;
    margin: 0 !important;
    border: 0 !important;
    background: transparent !important;
    box-shadow: none !important;
}

body .media-manager .media-sidebar .sidebar-preview-toolbar button.btn {
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    flex: 0 0 34px !important;

    width: 34px !important;
    height: 34px !important;
    min-width: 34px !important;
    min-height: 34px !important;
    max-width: 190px !important;
    max-height: 48px !important;

    padding: 0 !important;
    margin: 0 !important;
    border-radius: 9px !important;

    line-height: 1 !important;
    font-size: 14px !important;
    box-shadow: none !important;
    transform: none !important;
    position: relative !important;
    inset: auto !important;
}

body .media-manager .media-sidebar .sidebar-preview-toolbar button.btn i {
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    margin: 0 !important;
    padding: 0 !important;
    font-size: 15px !important;
    line-height: 1 !important;
}

body .media-manager .media-sidebar .sidebar-preview-toolbar button.btn-outline-default {
    background: #fff !important;
    border: 1px solid #dbe3f0 !important;
    color: #334155 !important;
}

body .media-manager .media-sidebar .sidebar-preview-toolbar button.btn-outline-default:hover {
    background: #f8fafc !important;
    border-color: #cbd5e1 !important;
    color: #1e293b !important;
}

body .media-manager .media-sidebar .sidebar-preview-toolbar button.btn-outline-danger {
    background: #fff !important;
    border: 1px solid #dc3545 !important;
    color: #dc3545 !important;
}

body .media-manager .media-sidebar .sidebar-preview-toolbar button.btn-outline-danger:hover {
    background: #fff5f6 !important;
    border-color: #dc3545 !important;
    color: #dc3545 !important;
}
/* PMD_MEDIA_MANAGER_PREVIEW_TOOLBAR_FIX_END */
</style>
    <!-- PayMyDine Admin Theme v1 - centralized final general visual layer (intentionally last CSS include) -->
<link rel="stylesheet" href="{{ asset('app/admin/assets/css/pmd-admin-theme-v1.css') }}?v={{ time() }}">
<link rel="stylesheet" href="{{ asset('app/admin/assets/css/pmd-admin-sidebar-clean-v4.css') }}?v={{ time() }}">
<link rel="stylesheet" href="{{ asset('app/admin/assets/css/pmd-sidebar-svg-mask-icons.css') }}?v={{ time() }}">
<link rel="stylesheet" href="{{ asset('app/admin/assets/css/pmd-sidebar-ref-icons.css') }}?v={{ time() }}">
<link rel="stylesheet" href="{{ asset('app/admin/assets/css/pmd-sidebar-active-state-fix.css') }}?v={{ time() }}">
<link rel="stylesheet" href="{{ asset('app/admin/assets/css/pmd-sidebar-parent-open-v5.css') }}?v={{ time() }}">
<link rel="stylesheet" href="{{ asset('app/admin/assets/css/pmd-sidebar-button-size-v6.css') }}?v={{ time() }}">
<link rel="stylesheet" href="{{ asset('app/admin/assets/css/pmd-sidebar-system-lock-v7.css') }}?v={{ time() }}">
<link rel="stylesheet" href="{{ asset('app/admin/assets/css/pmd-sidebar-column-flow-v8.css') }}?v={{ time() }}">
<link rel="stylesheet" href="{{ asset('app/admin/assets/css/pmd-sidebar-submenu-active-v9.css') }}?v={{ time() }}">
<link rel="stylesheet" href="{{ asset('app/admin/assets/css/pmd-sidebar-child-icons-v10.css') }}?v={{ time() }}">
{{-- PMD owner clean v1 disabled legacy dashboard asset: <link rel="stylesheet" href="{{ asset('app/admin/assets/css/pmd-dashboard-modern-v1.css') }}?v={{ time() }}"> --}}

    {{-- PMD all-pages toolbar guard: hide only legacy buttons, never the header/proxy containers --}}
    <script>
        (function () {
            document.documentElement.classList.add('pmd-admin-toolbar-preboot');
            window.setTimeout(function () {
                document.documentElement.classList.remove('pmd-admin-toolbar-preboot');
                document.documentElement.classList.add('pmd-admin-toolbar-ready');
            }, 1200);
        })();
    </script>
    <style id="pmd-toolbar-all-pages-no-flash-guard">
        /*
          Important:
          Do NOT hide the whole toolbar container.
          Hide only old direct buttons/groups, so PMD proxy/header buttons can appear instantly.
        */
        html.pmd-admin-toolbar-preboot body.pmd-admin-theme-v1
        :is(.toolbar-action, .progress-indicator-container, .form-toolbar, .control-toolbar, .page-actions, .page-title-section .pull-right, .list-toolbar, .toolbar.btn-toolbar, .btn-toolbar)
        > :is(.btn, a.btn, button.btn, .btn-group):not(.pmd-header-action-btn),

        html.pmd-admin-toolbar-preboot body.pmd-admin-theme-v1
        :is(.toolbar-action, .progress-indicator-container, .form-toolbar, .control-toolbar, .page-actions, .page-title-section .pull-right, .list-toolbar, .toolbar.btn-toolbar, .btn-toolbar)
        > .pmd-toolbar-right-buttons > :is(.btn, a.btn, button.btn, .btn-group):not(.pmd-header-action-btn),

        body.pmd-admin-theme-v1 [data-pmd-legacy-toolbar-source="1"],
        body.pmd-admin-theme-v1 .pmd-legacy-toolbar-source > :is(.btn, a.btn, button.btn, .btn-group):not(.pmd-header-action-btn),
        body.pmd-admin-theme-v1 .pmd-legacy-toolbar-source > .pmd-toolbar-right-buttons > :is(.btn, a.btn, button.btn, .btn-group):not(.pmd-header-action-btn) {
            opacity: 0 !important;
            visibility: hidden !important;
            pointer-events: none !important;
        }

        body.pmd-admin-theme-v1 .pmd-header-action-btn,
        body.pmd-admin-theme-v1 .pmd-header-action-enter,
        body.pmd-admin-theme-v1 .pmd-header-action-visible,
        body.pmd-admin-theme-v1 .pmd-header-title-back,
        html.pmd-admin-toolbar-preboot body.pmd-admin-theme-v1 .pmd-header-action-btn,
        html.pmd-admin-toolbar-preboot body.pmd-admin-theme-v1 .pmd-header-title-back {
            opacity: 1 !important;
            visibility: visible !important;
            pointer-events: auto !important;
            transform: none !important;
            transition-property: background-color, border-color, color, box-shadow !important;
        }

        html.pmd-admin-toolbar-preboot body.pmd-admin-theme-v1 .navbar-top,
        html.pmd-admin-toolbar-preboot body.pmd-admin-theme-v1 .navbar-top .navbar-nav,
        html.pmd-admin-toolbar-preboot body.pmd-admin-theme-v1 .navbar-top .nav-item,
        html.pmd-admin-toolbar-preboot body.pmd-admin-theme-v1 .navbar-top .nav-link,
        html.pmd-admin-toolbar-preboot body.pmd-admin-theme-v1 .pmd-topbar-settings-item,
        html.pmd-admin-toolbar-preboot body.pmd-admin-theme-v1 .pmd-topbar-user-item,
        html.pmd-admin-toolbar-preboot body.pmd-admin-theme-v1 .pmd-header-tooltip-target {
            opacity: 1 !important;
            visibility: visible !important;
            pointer-events: auto !important;
        }
    </style>

    {{-- PMD header actions: load early with defer to reduce proxy delay --}}
    <script defer src="{{ asset('app/admin/assets/js/pmd-admin-header-actions.js') }}?v={{ time() }}"></script>

    <style id="pmd-toolbar-collapse-legacy-actions">
        /*
          PMD final no-jump rule:
          The old toolbar is only a hidden source for proxy clicks.
          It must not occupy layout space, otherwise page content jumps.
          Header/proxy buttons are not inside these old page toolbar containers.
        */

        html.pmd-admin-toolbar-preboot body.pmd-admin-theme-v1 :is(
            .toolbar-action,
            .progress-indicator-container,
            .form-toolbar,
            .control-toolbar,
            .page-actions,
            .page-title-section .pull-right,
            .list-toolbar,
            .toolbar.btn-toolbar,
            .btn-toolbar
        ) {
            height: 0 !important;
            min-height: 0 !important;
            max-height: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            border: 0 !important;
            opacity: 0 !important;
            visibility: hidden !important;
            pointer-events: none !important;
            overflow: hidden !important;
        }

        body.pmd-admin-theme-v1 .pmd-legacy-toolbar-source {
            height: 0 !important;
            min-height: 0 !important;
            max-height: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            border: 0 !important;
            opacity: 0 !important;
            visibility: hidden !important;
            pointer-events: none !important;
            overflow: hidden !important;
        }

        body.pmd-admin-theme-v1 .pmd-legacy-toolbar-source * {
            opacity: 0 !important;
            visibility: hidden !important;
            pointer-events: none !important;
        }

        body.pmd-admin-theme-v1 .pmd-header-action-btn,
        body.pmd-admin-theme-v1 .pmd-header-title-back,
        body.pmd-admin-theme-v1 .pmd-header-tooltip-target,
        body.pmd-admin-theme-v1 .navbar-top,
        body.pmd-admin-theme-v1 .navbar-top .nav-link,
        body.pmd-admin-theme-v1 .navbar-top .nav-item {
            opacity: 1 !important;
            visibility: visible !important;
            pointer-events: auto !important;
        }
    </style>

{{-- PMD owner clean v1 disabled legacy dashboard asset: <link rel="stylesheet" href="{{ asset('app/admin/assets/css/pmd-dashboard-remove-hero-v3.css') }}?v={{ time() }}"> --}}
{{-- PMD owner clean v1 disabled legacy dashboard asset: <link rel="stylesheet" href="{{ asset('app/admin/assets/css/pmd-dashboard-kpi-polish-v4.css') }}?v={{ time() }}"> --}}
{{-- PMD owner clean v1 disabled legacy dashboard asset: <link rel="stylesheet" href="{{ asset('app/admin/assets/css/pmd-dashboard-real-data-v53.css') }}?v={{ time() }}"> --}}
{{-- PMD owner clean v1 disabled legacy dashboard asset: <link rel="stylesheet" href="{{ asset('app/admin/assets/css/pmd-dashboard-role-preview-v9.css') }}?v={{ time() }}"> --}}
{{-- PMD owner clean v1 disabled legacy dashboard asset: <link rel="stylesheet" href="{{ asset('app/admin/assets/css/pmd-dashboard-owner2-v11.css') }}?v={{ time() }}"> --}}
{{-- PMD owner clean v1 disabled legacy dashboard asset: <link rel="stylesheet" href="{{ asset('app/admin/assets/css/pmd-dashboard-waiter3-v12.css') }}?v={{ time() }}"> --}}
{{-- PMD owner clean v1 disabled legacy dashboard asset: <link rel="stylesheet" href="{{ asset('app/admin/assets/css/pmd-dashboard-waiter3-v13-polish.css') }}?v={{ time() }}"> --}}
{{-- PMD owner clean v1 disabled legacy dashboard asset: <link rel="stylesheet" href="{{ asset('app/admin/assets/css/pmd-dashboard-waiter3-v14-compact.css') }}?v={{ time() }}"> --}}
{{-- PMD owner clean v1 disabled legacy dashboard asset: <link rel="stylesheet" href="{{ asset('app/admin/assets/css/pmd-dashboard-waiter3-v15-rolebar.css') }}?v={{ time() }}"> --}}
{{-- PMD owner clean v1 disabled legacy dashboard asset: <link rel="stylesheet" href="{{ asset('app/admin/assets/css/pmd-dashboard-w3-quick-icons-v16.css') }}?v={{ time() }}"> --}}
    <link rel="stylesheet" href="{{ asset('app/admin/assets/css/pmd-sidebar-icons-only-v15.css') }}?v={{ time() }}">
<!-- PMD_DASHBOARD_NO_JUMP_V17_START -->
<script>
(function () {
  try {
    document.documentElement.classList.add('pmd-dashboard-booting');
  } catch (e) {}
})();
</script>
{{-- PMD owner clean v1 disabled legacy dashboard asset: <link rel="stylesheet" href="{{ asset('app/admin/assets/css/pmd-dashboard-no-jump-v17.css') }}?v={{ time() }}"> --}}
<!-- PMD_DASHBOARD_NO_JUMP_V17_END -->
<!-- PMD_OWNER_DASHBOARD_MATCH_V13_CSS_START -->
{{-- PMD owner clean v1 disabled legacy dashboard asset: <link rel="stylesheet" href="{{ asset('app/admin/assets/css/pmd-dashboard-owner-match-v13.css') }}?v={{ time() }}"> --}}
<!-- PMD_OWNER_DASHBOARD_MATCH_V13_CSS_END -->
<!-- PMD_OWNER_BLACK_HEADER_V24_CSS_START -->
{{-- PMD owner clean v1 disabled legacy dashboard asset: <link rel="stylesheet" href="{{ asset('app/admin/assets/css/pmd-dashboard-owner-black-header-v24.css') }}?v={{ time() }}"> --}}
<!-- PMD_OWNER_BLACK_HEADER_V24_CSS_END -->
<!-- PMD_UNIVERSAL_LAYOUT_EDITOR_V35_CSS_START -->
<link rel="stylesheet" href="{{ asset('app/admin/assets/css/pmd-universal-layout-editor-v35.css') }}?v={{ time() }}">
<!-- PMD_UNIVERSAL_LAYOUT_EDITOR_V35_CSS_END -->
<!-- PMD_LOGO_SWITCHER_FINAL_V38_CSS_START -->
<link rel="stylesheet" href="{{ asset('app/admin/assets/css/pmd-logo-switcher-final-v38.css') }}?v={{ time() }}">
<!-- PMD_LOGO_SWITCHER_FINAL_V38_CSS_END -->
<!-- PMD_MANAGER_OPS_DASHBOARD_V29_CSS_START -->
{{-- PMD owner clean v1 disabled legacy dashboard asset: <link rel="stylesheet" href="{{ asset('app/admin/assets/css/pmd-manager-ops-dashboard-v29.css') }}?v={{ time() }}"> --}}
<!-- PMD_MANAGER_OPS_DASHBOARD_V29_CSS_END -->
<!-- PMD_SIDEBAR_RECOVER_NATIVE_V50_EARLY_START -->
<script>
(function(){try{
  ['pmdSidebarCollapsedV49','pmdSidebarCollapsedV48','pmdSidebarCollapsedV47','pmdSidebarCollapsedV46','pmdSidebarCollapsedV45','pmdSidebarCollapsedV44','pmdSidebarCollapsedV43','pmdSidebarCollapsedV42','pmdSidebarCollapsedV41'].forEach(function(k){localStorage.setItem(k,'0');});
  document.documentElement.classList.remove('pmd-sidebar-persist-collapsed-v49','pmd-sidebar-persist-collapsed-v48','pmd-sidebar-persist-collapsed-v47','pmd-sidebar-persist-collapsed-v46','pmd-sidebar-persist-collapsed-v45','pmd-sidebar-persist-collapsed-v44','pmd-sidebar-persist-collapsed-v43','pmd-sidebar-persist-collapsed-v42','pmd-sidebar-persist-collapsed-v41');
}catch(e){}})();
</script>
<!-- PMD_SIDEBAR_RECOVER_NATIVE_V50_EARLY_END -->
<!-- PMD_SIDEBAR_RECOVER_NATIVE_V50_CSS_START -->
<link rel="stylesheet" href="{{ asset('app/admin/assets/css/pmd-sidebar-recover-native-v50.css') }}?v={{ time() }}">
<!-- PMD_SIDEBAR_RECOVER_NATIVE_V50_CSS_END -->
<!-- PMD_SIDEBAR_CLOSED_LOGO_TUNE_V51_CSS_START -->
<link rel="stylesheet" href="{{ asset('app/admin/assets/css/pmd-sidebar-closed-logo-tune-v51.css') }}?v={{ time() }}">
<!-- PMD_SIDEBAR_CLOSED_LOGO_TUNE_V51_CSS_END -->
<!-- PMD_SIDEBAR_CLOSED_RAISE_V52_CSS_START -->
<link rel="stylesheet" href="{{ asset('app/admin/assets/css/pmd-sidebar-closed-raise-v52.css') }}?v={{ time() }}">
<!-- PMD_SIDEBAR_CLOSED_RAISE_V52_CSS_END -->
<!-- PMD_SIDEBAR_RAISE_ALL_V53_CSS_START -->
<link rel="stylesheet" href="{{ asset('app/admin/assets/css/pmd-sidebar-raise-all-v53.css') }}?v={{ time() }}">
<!-- PMD_SIDEBAR_RAISE_ALL_V53_CSS_END -->
<!-- PMD_SIDEBAR_CLOSED_ICONS_LOWER_V54_CSS_START -->
<link rel="stylesheet" href="{{ asset('app/admin/assets/css/pmd-sidebar-closed-icons-lower-v54.css') }}?v={{ time() }}">
<!-- PMD_SIDEBAR_CLOSED_ICONS_LOWER_V54_CSS_END -->
<!-- PMD_SIDEBAR_LOGO_LAST_TOGGLE_V55_CSS_START -->
<link rel="stylesheet" href="{{ asset('app/admin/assets/css/pmd-sidebar-logo-last-toggle-v55.css') }}?v={{ time() }}">
<!-- PMD_SIDEBAR_LOGO_LAST_TOGGLE_V55_CSS_END -->
<!-- PMD_SIDEBAR_MENU_LOWER_V56_CSS_START -->
<link rel="stylesheet" href="{{ asset('app/admin/assets/css/pmd-sidebar-menu-lower-v56.css') }}?v={{ time() }}">
<!-- PMD_SIDEBAR_MENU_LOWER_V56_CSS_END -->
<!-- PMD_ADMIN_LOADER_HARD_RESET_V64_CSS_START -->
<link rel="stylesheet" href="{{ asset('app/admin/assets/css/pmd-admin-loader-hard-reset-v64.css') }}?v={{ time() }}">
<!-- PMD_ADMIN_LOADER_HARD_RESET_V64_CSS_END -->
<!-- PMD_STABLE_LOGO_KPI_V65_CSS_START -->
<link rel="stylesheet" href="{{ asset('app/admin/assets/css/pmd-stable-logo-kpi-v65.css') }}?v={{ time() }}">
<!-- PMD_STABLE_LOGO_KPI_V65_CSS_END -->
<!-- PMD_SIDEBAR_CLOSED_LOGO_MODE_V66_CSS_START -->
<link rel="stylesheet" href="{{ asset('app/admin/assets/css/pmd-sidebar-closed-logo-mode-v66.css') }}?v={{ time() }}">
<!-- PMD_SIDEBAR_CLOSED_LOGO_MODE_V66_CSS_END -->
<!-- PMD_SIDEBAR_TOGGLE_TOP_GAP_V70_CSS_START -->
<link rel="stylesheet" href="{{ asset('app/admin/assets/css/pmd-sidebar-toggle-top-gap-v70.css') }}?v={{ time() }}">
<!-- PMD_SIDEBAR_TOGGLE_TOP_GAP_V70_CSS_END -->
<!-- PMD_ROLE_DASHBOARD_LOCK_V72_CONTEXT_START -->
@php
    $__pmdRoleDash = [
        'logged_in' => false,
        'username' => null,
        'staff_id' => null,
        'staff_name' => null,
        'role_code' => null,
        'role_name' => null,
    ];

    try {
        $__pmdUser = null;

        if (class_exists('\Admin\Facades\AdminAuth')) {
            $__pmdUser = \Admin\Facades\AdminAuth::getUser();
        } elseif (class_exists('AdminAuth')) {
            $__pmdUser = \AdminAuth::getUser();
        }

        if ($__pmdUser) {
            $__pmdRoleDash['logged_in'] = true;
            $__pmdRoleDash['username'] = $__pmdUser->username ?? null;
            $__pmdRoleDash['staff_id'] = $__pmdUser->staff_id ?? null;

            if (!empty($__pmdRoleDash['staff_id'])) {
                $__pmdStaffRole = \Illuminate\Support\Facades\DB::table('staffs as s')
                    ->leftJoin('staff_roles as r', 'r.staff_role_id', '=', 's.staff_role_id')
                    ->where('s.staff_id', $__pmdRoleDash['staff_id'])
                    ->select('s.staff_name', 'r.code as role_code', 'r.name as role_name')
                    ->first();

                if ($__pmdStaffRole) {
                    $__pmdRoleDash['staff_name'] = $__pmdStaffRole->staff_name ?? null;
                    $__pmdRoleDash['role_code'] = $__pmdStaffRole->role_code ?? null;
                    $__pmdRoleDash['role_name'] = $__pmdStaffRole->role_name ?? null;
                }
            }
        }
    } catch (\Throwable $e) {
        $__pmdRoleDash['error'] = $e->getMessage();
    }
@endphp
<script>
window.PMD_ROLE_DASHBOARD_CONTEXT_V72 = @json($__pmdRoleDash);
</script>
<!-- PMD_ROLE_DASHBOARD_LOCK_V72_CONTEXT_END -->
<!-- PMD_KDS_SERVER_FAST_V82_BLADE_FLAG_START -->
@php
    $__pmdIsKdsDashboardV82 = false;
    try {
        $__pmdCtxUserV82 = strtolower((string)($__pmdRoleDash['username'] ?? ''));
        $__pmdCtxRoleCodeV82 = strtolower((string)($__pmdRoleDash['role_code'] ?? ''));
        $__pmdCtxRoleNameV82 = strtolower((string)($__pmdRoleDash['role_name'] ?? ''));
        $__pmdIsKdsDashboardV82 = (request()->is('admin') || request()->is('admin/dashboard')) && (
            $__pmdCtxUserV82 === 'kds' || $__pmdCtxRoleCodeV82 === 'kds' || $__pmdCtxRoleNameV82 === 'kds' || strpos($__pmdCtxRoleNameV82, 'kitchen') !== false
        );
    } catch (\Throwable $e) {
        $__pmdIsKdsDashboardV82 = false;
    }
@endphp
<!-- PMD_KDS_SERVER_FAST_V82_BLADE_FLAG_END -->

<!-- PMD_KDS_SERVER_FAST_V82_JS_START -->
{{-- PMD owner clean v1 disabled legacy dashboard asset: <script src="{{ asset('app/admin/assets/js/pmd-kds-server-fast-v82.js') }}?v={{ time() }}"></script> --}}
<!-- PMD_KDS_SERVER_FAST_V82_JS_END -->
<!-- PMD_KDS_ULTRA_FAST_V83_JS_START -->
{{-- PMD owner clean v1 disabled legacy dashboard asset: <script src="{{ asset('app/admin/assets/js/pmd-kds-ultra-fast-v83.js') }}?v={{ time() }}"></script> --}}
<!-- PMD_KDS_ULTRA_FAST_V83_JS_END -->
<!-- PMD_DASHBOARD_ROLE_PREBOOT_V78_JS_START -->
{{-- PMD owner clean v1 disabled legacy dashboard asset: <script src="{{ asset('app/admin/assets/js/pmd-dashboard-role-preboot-v78.js') }}?v={{ time() }}"></script> --}}
<!-- PMD_DASHBOARD_ROLE_PREBOOT_V78_JS_END -->

<!-- PMD_ROLE_DASHBOARD_LOCK_V72_CSS_START -->
{{-- PMD owner clean v1 disabled legacy dashboard asset: <link rel="stylesheet" href="{{ asset('app/admin/assets/css/pmd-role-dashboard-lock-v72.css') }}?v={{ time() }}"> --}}
<!-- PMD_ROLE_DASHBOARD_LOCK_V72_CSS_END -->
<!-- PMD_ROLE_NO_SIDEBAR_LOCK_V73_CSS_START -->
{{-- PMD owner clean v1 disabled legacy dashboard asset: <link rel="stylesheet" href="{{ asset('app/admin/assets/css/pmd-role-no-sidebar-v73.css') }}?v={{ time() }}"> --}}
<!-- PMD_ROLE_NO_SIDEBAR_LOCK_V73_CSS_END -->
<!-- PMD_DASHBOARD_ROLE_STABILITY_V78_CSS_START -->
{{-- PMD owner clean v1 disabled legacy dashboard asset: <link rel="stylesheet" href="{{ asset('app/admin/assets/css/pmd-dashboard-role-stability-v78.css') }}?v={{ time() }}"> --}}
<!-- PMD_DASHBOARD_ROLE_STABILITY_V78_CSS_END -->

<!-- PMD_DASHBOARD_STABILITY_V77_CSS_START -->
{{-- PMD owner clean v1 disabled legacy dashboard asset: <link rel="stylesheet" href="{{ asset('app/admin/assets/css/pmd-dashboard-stability-v77.css') }}?v={{ time() }}"> --}}
<!-- PMD_DASHBOARD_STABILITY_V77_CSS_END -->




<!-- PMD_KDS_SERVER_FAST_V82_CSS_START -->
{{-- PMD owner clean v1 disabled legacy dashboard asset: <link rel="stylesheet" href="{{ asset('app/admin/assets/css/pmd-kds-server-fast-v82.css') }}?v={{ time() }}"> --}}
<!-- PMD_KDS_SERVER_FAST_V82_CSS_END -->

<!-- PMD_KDS_ULTRA_FAST_V83_CSS_START -->
{{-- PMD owner clean v1 disabled legacy dashboard asset: <link rel="stylesheet" href="{{ asset('app/admin/assets/css/pmd-kds-ultra-fast-v83.css') }}?v={{ time() }}"> --}}
<!-- PMD_KDS_ULTRA_FAST_V83_CSS_END -->

<!-- PMD_WAITER_STABLE_MOBILE_V97_CSS_START -->
<!-- PMD_WAITER_STABLE_MOBILE_V97_CSS_END -->

<!-- PMD_WAITER_DATA_REPAIR_V100_CSS_START -->
<!-- PMD_WAITER_DATA_REPAIR_V100_CSS_END -->
    {{-- PMD waiter rebuild: old dashboard asset disabled --}}
{{-- PMD waiter rebuild: old dashboard asset disabled --}}
{{-- PMD owner clean v1 disabled legacy dashboard asset: <link rel="stylesheet" href="{{ asset('app/admin/assets/css/pmd-waiter-dashboard-v161-direct-renderer.css') }}?v={{ time() }}"> --}}
{{-- PMD owner clean v1 disabled legacy dashboard asset: <link rel="stylesheet" href="{{ asset('app/admin/assets/css/pmd-waiter-dashboard-v162-fix-mount-position.css') }}?v={{ time() }}"> --}}
<!-- PMD_OWNER_DASHBOARD_CLEAN_V23_CSS_START -->
<link rel="stylesheet" href="{{ asset('app/admin/assets/css/pmd-owner-dashboard-clean-v23.css') }}?v={{ time() }}">
<!-- PMD_OWNER_DASHBOARD_CLEAN_V23_CSS_END -->



<!-- PMD_KDS_INDEX_V130_INLINE_ADVANCED_NO_FLASH_START -->
<?php if (function_exists('request') && trim(request()->path(), '/') === 'admin/kds_stations'): ?>
<style id="pmd-kds-index-v130-inline-advanced-no-flash-style">
/* PMD KDS v130: kill Advanced table flash before paint */

/* Original server list/table: hidden but readable by JS */
.table-responsive,
.control-list,
.list-widget,
.list-table,
.list-footer,
.pagination,
.pagination-bar,
table {
  visibility: hidden !important;
  opacity: 0 !important;
  height: 0 !important;
  min-height: 0 !important;
  max-height: 0 !important;
  margin: 0 !important;
  padding: 0 !important;
  overflow: hidden !important;
  pointer-events: none !important;
}

/* Duplicate hero / advanced wrappers */
.pmd962-hero,
section.pmd962-hero,
.pmd962-advanced,
.pmd962-advanced-table,
.pmd962-table-panel,
.pmd962-table-toggle,
.pmd962-original-table-wrap,
[data-pmd-kds-v130-hidden="1"] {
  display: none !important;
  visibility: hidden !important;
  opacity: 0 !important;
  height: 0 !important;
  min-height: 0 !important;
  max-height: 0 !important;
  margin: 0 !important;
  padding: 0 !important;
  overflow: hidden !important;
  pointer-events: none !important;
}

/* Modern cards/stats must stay visible */
.pmd962-shell,
.pmd962-page,
.pmd962-wrap,
.pmd962-stats,
.pmd962-stats-grid,
.pmd962-grid,
.pmd962-cards,
.pmd962-card,
.pmd962-station-card,
[class*="station-card"] {
  visibility: visible !important;
  opacity: 1 !important;
  max-height: none !important;
  overflow: visible !important;
  pointer-events: auto !important;
}
</style>

<script id="pmd-kds-index-v130-inline-advanced-no-flash-script">
(function () {
  var MARK = 'PMD_KDS_INDEX_V130_INLINE_ADVANCED_NO_FLASH';

  function isKdsIndex() {
    return location.pathname.replace(/\/+$/, '') === '/admin/kds_stations';
  }

  if (!isKdsIndex()) return;

  function qsa(sel, root) {
    try { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
    catch (e) { return []; }
  }

  function text(el) {
    return ((el && (el.innerText || el.textContent)) || '').replace(/\s+/g, ' ').trim();
  }

  function hasCardInside(el) {
    if (!el || !el.querySelector) return false;
    return !!el.querySelector('a[href*="/admin/kds_stations/edit/"]') ||
      text(el).indexOf('Edit station') !== -1 ||
      text(el).indexOf('Open display') !== -1;
  }

  function hardHide(el) {
    if (!el || !el.style) return false;

    el.setAttribute('data-pmd-kds-v130-hidden', '1');
    el.style.setProperty('display', 'none', 'important');
    el.style.setProperty('visibility', 'hidden', 'important');
    el.style.setProperty('opacity', '0', 'important');
    el.style.setProperty('height', '0', 'important');
    el.style.setProperty('min-height', '0', 'important');
    el.style.setProperty('max-height', '0', 'important');
    el.style.setProperty('margin', '0', 'important');
    el.style.setProperty('padding', '0', 'important');
    el.style.setProperty('overflow', 'hidden', 'important');
    el.style.setProperty('pointer-events', 'none', 'important');
    return true;
  }

  function hideAdvancedAndHero(root) {
    root = root || document;

    qsa('.pmd962-hero, section.pmd962-hero, .pmd962-advanced, .pmd962-advanced-table, .pmd962-table-panel, .pmd962-table-toggle, .pmd962-original-table-wrap', root)
      .forEach(hardHide);

    qsa('section,article,div', root).forEach(function (el) {
      var t = text(el);

      if (
        t.indexOf('Advanced table') !== -1 &&
        t.indexOf('Use the original table only for filters') !== -1 &&
        !hasCardInside(el)
      ) {
        hardHide(el);
      }

      if (
        t.indexOf('Manage KDS Stations') !== -1 &&
        t.indexOf('Create, review, and manage kitchen display stations') !== -1 &&
        t.indexOf('New KDS Station') !== -1 &&
        !hasCardInside(el)
      ) {
        hardHide(el);
      }
    });
  }

  function visible(el) {
    if (!el || !el.getBoundingClientRect) return false;
    var cs = getComputedStyle(el);
    var r = el.getBoundingClientRect();
    return cs.display !== 'none' &&
      cs.visibility !== 'hidden' &&
      Number(cs.opacity || 1) > 0.01 &&
      r.width > 2 &&
      r.height > 2;
  }

  function findCards() {
    var out = [];
    var seen = [];

    qsa('a[href*="/admin/kds_stations/edit/"]').forEach(function (link) {
      var n = link;
      var best = null;

      for (var i = 0; i < 10 && n && n !== document.body; i++, n = n.parentElement) {
        var t = text(n);
        var r = n.getBoundingClientRect ? n.getBoundingClientRect() : { width: 0, height: 0 };

        if (
          r.width > 160 &&
          r.height > 70 &&
          t.indexOf('TYPE') !== -1 &&
          t.indexOf('ROUTING') !== -1
        ) {
          best = n;
        }
      }

      if (best && seen.indexOf(best) === -1) {
        seen.push(best);
        out.push(best);
      }
    });

    return out;
  }

  function check() {
    hideAdvancedAndHero(document);

    var advancedVisible = qsa('section,article,div').filter(function (el) {
      var t = text(el);
      return t.indexOf('Advanced table') !== -1 &&
        t.indexOf('Use the original table only for filters') !== -1 &&
        visible(el);
    }).length;

    var cards = findCards();

    var summary = {
      mark: MARK,
      styleLoaded: !!document.getElementById('pmd-kds-index-v130-inline-advanced-no-flash-style'),
      scriptLoaded: !!document.getElementById('pmd-kds-index-v130-inline-advanced-no-flash-script'),
      oldTablesVisible: qsa('table,.table-responsive,.control-list,.list-widget,.list-table').filter(visible).length,
      heroVisible: qsa('.pmd962-hero,section.pmd962-hero').filter(visible).length,
      advancedVisible: advancedVisible,
      cardsDetected: cards.length,
      cardsVisible: cards.filter(visible).length
    };

    summary.status = summary.oldTablesVisible === 0 &&
      summary.heroVisible === 0 &&
      summary.advancedVisible === 0 &&
      summary.cardsVisible > 0 ? 'OK' : 'CHECK';

    window.PMD_KDS_INDEX_V130_INLINE_ADVANCED_NO_FLASH_REPORT = summary;

    try {
      console.log('✅ PMD KDS INDEX v130 INLINE ADVANCED NO-FLASH');
      console.table([summary]);
    } catch (e) {}

    return summary;
  }

  hideAdvancedAndHero(document);

  try {
    var observer = new MutationObserver(function (mutations) {
      mutations.forEach(function (m) {
        if (m.target) hideAdvancedAndHero(m.target);
        Array.prototype.slice.call(m.addedNodes || []).forEach(function (n) {
          if (n && n.nodeType === 1) hideAdvancedAndHero(n);
        });
      });
    });

    observer.observe(document.documentElement, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['class', 'style']
    });

    window.PMD_KDS_INDEX_V130_OBSERVER = observer;
  } catch (e) {}

  window.PMDKdsIndexV130AdvancedNoFlash = {
    check: check
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      hideAdvancedAndHero(document);
      setTimeout(check, 50);
    }, true);
  } else {
    check();
  }

  window.addEventListener('load', function () {
    hideAdvancedAndHero(document);
    setTimeout(check, 100);
    setTimeout(check, 700);
    setTimeout(check, 1600);
  }, true);
})();
</script>
<?php endif; ?>
<!-- PMD_KDS_INDEX_V130_INLINE_ADVANCED_NO_FLASH_END -->






<!-- PMD_KDS_INDEX_V133_CLEAN_CSS_STABILITY_START -->
<?php if (function_exists('request') && trim(request()->path(), '/') === 'admin/kds_stations'): ?>
<style id="pmd-kds-index-v133-clean-css-stability">
/* PMD KDS v133: clean CSS-only stability. No JS. No observer. */

/* Reserve stable workspace so the page does not jump while v96 builds cards */
.pmd962-shell,
.pmd962-page,
.pmd962-wrap {
  min-height: 560px !important;
}

/* Stable stats/top summary area */
.pmd962-stats,
.pmd962-stats-grid {
  min-height: 112px !important;
  box-sizing: border-box !important;
}

/* Stable card grid */
.pmd962-grid,
.pmd962-cards {
  display: grid !important;
  grid-template-columns: repeat(auto-fit, minmax(360px, 1fr)) !important;
  gap: 18px !important;
  align-items: stretch !important;
  box-sizing: border-box !important;
}

/* Stop layout resize animations inside the KDS modern area */
.pmd962-shell *,
.pmd962-page *,
.pmd962-wrap * {
  box-sizing: border-box !important;
  animation: none !important;
  transition-property: background-color, border-color, color, box-shadow !important;
  transition-duration: 120ms !important;
}

/* Station cards only */
.pmd962-card:has(a[href*="/admin/kds_stations/edit/"]),
.pmd962-card:has(a[href*="/admin/kitchendisplay/"]),
[class*="station-card"]:has(a[href*="/admin/kds_stations/edit/"]),
[class*="station-card"]:has(a[href*="/admin/kitchendisplay/"]) {
  min-height: 258px !important;
  height: 100% !important;
  border-radius: 20px !important;
  overflow: hidden !important;
  transform: none !important;
  backface-visibility: hidden !important;
}

/* Keep text stable */
.pmd962-card:has(a[href*="/admin/kds_stations/edit/"]) h1,
.pmd962-card:has(a[href*="/admin/kds_stations/edit/"]) h2,
.pmd962-card:has(a[href*="/admin/kds_stations/edit/"]) h3,
.pmd962-card:has(a[href*="/admin/kds_stations/edit/"]) p,
.pmd962-card:has(a[href*="/admin/kds_stations/edit/"]) span,
.pmd962-card:has(a[href*="/admin/kds_stations/edit/"]) small,
.pmd962-card:has(a[href*="/admin/kds_stations/edit/"]) a,
.pmd962-card:has(a[href*="/admin/kds_stations/edit/"]) button {
  line-height: 1.35 !important;
}

/* Keep actions from wrapping during font/layout load */
.pmd962-card:has(a[href*="/admin/kds_stations/edit/"]) a,
.pmd962-card:has(a[href*="/admin/kds_stations/edit/"]) button {
  white-space: nowrap !important;
}

@media (max-width: 768px) {
  .pmd962-shell,
  .pmd962-page,
  .pmd962-wrap {
    min-height: 640px !important;
  }

  .pmd962-grid,
  .pmd962-cards {
    grid-template-columns: 1fr !important;
    gap: 14px !important;
  }

  .pmd962-card:has(a[href*="/admin/kds_stations/edit/"]),
  .pmd962-card:has(a[href*="/admin/kitchendisplay/"]),
  [class*="station-card"]:has(a[href*="/admin/kds_stations/edit/"]),
  [class*="station-card"]:has(a[href*="/admin/kitchendisplay/"]) {
    min-height: 246px !important;
    border-radius: 18px !important;
  }
}
</style>
<?php endif; ?>
<!-- PMD_KDS_INDEX_V133_CLEAN_CSS_STABILITY_END -->





    <link rel="stylesheet" href="/app/admin/assets/css/pmd-admin-mobile-shell-v1.css?v=1">
    <link rel="stylesheet" href="/app/admin/assets/css/pmd-admin-page-contract-v1.css?v=1">
    <link rel="stylesheet" href="/app/admin/assets/css/pmd-admin-universal-client-list-v1.css?v=50">





<!-- PMD New Pages Anti-Flash Opacity v40 -->
<script>
(function () {
  try {
    var supported = [
      '/admin/menus',
      '/admin/mail_templates',
      '/admin/reviews',
      '/admin/countries',
      '/admin/currencies',
      '/admin/languages',
      '/admin/tips',
      '/admin/payments'
    ];

    var path = window.location.pathname.replace(/\/+$/, '');

    if (supported.indexOf(path) !== -1) {
      document.documentElement.classList.add('pmd-new-pages-antiflash-v40');
      document.documentElement.setAttribute('data-pmd-new-page-path-v40', path);

      window.PMDNewPagesAntiFlashV40Start = Date.now();

      setTimeout(function () {
        document.documentElement.classList.add('pmd-new-pages-antiflash-timeout-v40');
      }, 2600);
    }
  } catch (e) {}
})();
</script>
<style>
/*
 * v40 IMPORTANT:
 * Do NOT use visibility:hidden or display:none here.
 * v30 renderer must still be able to find the table.
 */
html.pmd-new-pages-antiflash-v40:not(.pmd-new-pages-antiflash-rendered-v40):not(.pmd-new-pages-antiflash-timeout-v40) .table-responsive,
html.pmd-new-pages-antiflash-v40:not(.pmd-new-pages-antiflash-rendered-v40):not(.pmd-new-pages-antiflash-timeout-v40) table,
html.pmd-new-pages-antiflash-v40:not(.pmd-new-pages-antiflash-rendered-v40):not(.pmd-new-pages-antiflash-timeout-v40) .control-list,
html.pmd-new-pages-antiflash-v40:not(.pmd-new-pages-antiflash-rendered-v40):not(.pmd-new-pages-antiflash-timeout-v40) .list-widget,
html.pmd-new-pages-antiflash-v40:not(.pmd-new-pages-antiflash-rendered-v40):not(.pmd-new-pages-antiflash-timeout-v40) .list-table,
html.pmd-new-pages-antiflash-v40:not(.pmd-new-pages-antiflash-rendered-v40):not(.pmd-new-pages-antiflash-timeout-v40) .list-footer,
html.pmd-new-pages-antiflash-v40:not(.pmd-new-pages-antiflash-rendered-v40):not(.pmd-new-pages-antiflash-timeout-v40) .pagination,
html.pmd-new-pages-antiflash-v40:not(.pmd-new-pages-antiflash-rendered-v40):not(.pmd-new-pages-antiflash-timeout-v40) .pagination-bar {
  opacity: 0 !important;
  pointer-events: none !important;
}
</style>
<!-- /PMD New Pages Anti-Flash Opacity v40 -->


<!-- PMD Universal Admin Forms v1 -->
<link rel="stylesheet" href="/app/admin/assets/css/pmd-admin-universal-forms-v1.css?v=10">
<script defer src="/app/admin/assets/js/pmd-admin-universal-forms-v1.js?v=10"></script>
<!-- /PMD Universal Admin Forms v1 -->







<!-- PMD_WAITER_DASHBOARD_V5_WORKFLOW_UI_START -->
<script id="pmd-waiter-dashboard-v5-boot">
(function () {
  if (/\/admin\/dashboardwaiter(?:$|[?#])/.test(location.pathname + location.search + location.hash)) {
    document.documentElement.classList.add('pmd-waiter-dashboard-active');
  }
})();
</script>

<style id="pmd-waiter-dashboard-v5-style">
html.pmd-waiter-dashboard-active,
html.pmd-waiter-dashboard-active body {
  background: #f6f8fb !important;
  overflow: hidden !important;
}

#pmd-waiter-dashboard-root,
#pmd-waiter-dashboard-root * {
  box-sizing: border-box;
  font-family: Roboto, Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

#pmd-waiter-dashboard-root {
  position: fixed;
  z-index: 999;
  top: 72px;
  left: 100px;
  right: 8px;
  bottom: 0;
  overflow: auto;
  padding: 16px 16px 72px;
  background: linear-gradient(180deg, #f8fafc 0%, #f4f7fb 100%);
  color: #061126;
  border-top: 1px solid rgba(226,232,240,.8);
}

#pmd-waiter-dashboard-root::-webkit-scrollbar {
  width: 10px;
}

#pmd-waiter-dashboard-root::-webkit-scrollbar-thumb {
  background: rgba(100,116,139,.35);
  border-radius: 999px;
}

.pmd-w5-shell {
  width: 100%;
  margin: 0;
}

.pmd-w5-kpis {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
  margin-bottom: 16px;
}

.pmd-w5-kpi {
  height: 116px;
  border-radius: 18px;
  background: #fff;
  border: 1px solid #dbe3ee;
  box-shadow: 0 14px 38px rgba(15,23,42,.05);
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 20px 24px;
  overflow: hidden;
}

.pmd-w5-kpi:nth-child(1) {
  border-color: #86efac;
  background: linear-gradient(120deg, #ecfdf5 0%, #fff 66%);
}

.pmd-w5-kpi:nth-child(2) {
  border-color: #fdba74;
  background: linear-gradient(120deg, #fff7ed 0%, #fff 66%);
}

.pmd-w5-kpi:nth-child(3) {
  border-color: #bfdbfe;
  background: linear-gradient(120deg, #eff6ff 0%, #fff 66%);
}

.pmd-w5-kpi:nth-child(4) {
  border-color: #fdba74;
  background: linear-gradient(120deg, #fff7ed 0%, #fff 66%);
}

.pmd-w5-ico {
  width: 58px;
  height: 58px;
  border-radius: 999px;
  background: #f1f5f9;
  border: 1px solid #dbe3ee;
  display: grid;
  place-items: center;
  font-size: 24px;
  flex: 0 0 auto;
}

.pmd-w5-kpi h3 {
  margin: 0 0 4px;
  font-size: 17px;
  line-height: 1.05;
  font-weight: 1000;
  letter-spacing: -.045em;
}

.pmd-w5-kpi strong {
  display: block;
  font-size: 36px;
  line-height: .95;
  font-weight: 1000;
  letter-spacing: -.055em;
}

.pmd-w5-kpi p {
  margin: 7px 0 0;
  font-size: 13px;
  font-weight: 900;
  color: #64748b;
}

.pmd-w5-floor,
.pmd-w5-board {
  background: #fff;
  border: 1px solid #dbe3ee;
  border-radius: 18px;
  box-shadow: 0 14px 38px rgba(15,23,42,.05);
}

.pmd-w5-floor {
  padding: 20px 22px;
  margin-bottom: 16px;
}

.pmd-w5-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 14px;
}

.pmd-w5-head h2,
.pmd-w5-card h2 {
  margin: 0;
  font-size: 22px;
  line-height: 1.08;
  font-weight: 1000;
  letter-spacing: -.05em;
}

.pmd-w5-actions {
  display: flex;
  align-items: center;
  gap: 9px;
  flex-wrap: wrap;
}

.pmd-w5-btn,
.pmd-w5-tab,
.pmd-w5-card button {
  border: 1px solid #dbe3ee;
  background: #fff;
  color: #061126;
  border-radius: 999px;
  min-height: 38px;
  padding: 0 16px;
  font-size: 13px;
  font-weight: 1000;
  cursor: pointer;
}

.pmd-w5-btn.primary,
.pmd-w5-card button.primary {
  background: #061126;
  border-color: #061126;
  color: #fff;
}

.pmd-w5-btn.warn,
.pmd-w5-card button.warn {
  border-color: #fdba74;
  color: #9a3412;
  background: #fff7ed;
}

.pmd-w5-floor-map {
  min-height: 92px;
  border: 1px solid #dbe3ee;
  border-radius: 16px;
  padding: 22px 34px;
  background-image: radial-gradient(#cbd5e1 1px, transparent 1px);
  background-size: 28px 28px;
  display: flex;
  align-items: center;
  gap: 46px;
  overflow: auto;
}

.pmd-w5-table {
  min-width: 76px;
  height: 46px;
  border-radius: 999px;
  background: #fff;
  border: 4px solid #22c55e;
  color: #061126;
  font-size: 23px;
  font-weight: 1000;
  display: grid;
  place-items: center;
  cursor: pointer;
  position: relative;
  box-shadow: 0 8px 22px rgba(15,23,42,.05);
}

.pmd-w5-table.is-active {
  border-color: #fb923c;
  background: #fff7ed;
}

.pmd-w5-table.is-ready {
  border-color: #60a5fa;
  background: #eff6ff;
}

.pmd-w5-table.is-payment {
  border-color: #a855f7;
  background: #faf5ff;
}

.pmd-w5-table.is-urgent {
  border-color: #ef4444;
  background: #fef2f2;
  animation: pmd-w5-pulse 1.25s ease-in-out infinite;
}

.pmd-w5-table.is-selected {
  outline: 5px solid rgba(59,130,246,.16);
}

.pmd-w5-table small {
  position: absolute;
  top: -12px;
  right: -12px;
  min-width: 24px;
  height: 24px;
  border-radius: 999px;
  background: #061126;
  color: #fff;
  display: grid;
  place-items: center;
  font-size: 11px;
  border: 2px solid #fff;
}

@keyframes pmd-w5-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(239,68,68,.28); }
  50% { box-shadow: 0 0 0 10px rgba(239,68,68,0); }
}

.pmd-w5-board {
  padding: 20px 22px;
}

.pmd-w5-tabs {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin: 0 0 16px;
}

.pmd-w5-tab {
  background: #f8fafc;
}

.pmd-w5-tab.is-active {
  background: #061126;
  color: #fff;
  border-color: #061126;
}

.pmd-w5-selected-note {
  display: none;
  margin: 0 0 14px;
  padding: 12px 14px;
  border: 1px solid #bfdbfe;
  background: #eff6ff;
  color: #1e3a8a;
  border-radius: 14px;
  font-weight: 1000;
}

.pmd-w5-selected-note.is-show {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
}

.pmd-w5-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

.pmd-w5-card,
.pmd-w5-add-card {
  min-height: 340px;
  border-radius: 18px;
  background: #fff;
  border: 1px solid #dbe3ee;
  box-shadow: 0 14px 38px rgba(15,23,42,.05);
  padding: 18px;
  overflow: hidden;
}

.pmd-w5-card.is-note {
  border-color: #fbbf24;
  background: linear-gradient(180deg, #fffbeb 0%, #fff 42%);
}

.pmd-w5-card.is-old {
  border-color: #fdba74;
  background: linear-gradient(180deg, #fff7ed 0%, #fff 38%);
}

.pmd-w5-card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.pmd-w5-check {
  display: flex;
  align-items: center;
  gap: 10px;
}

.pmd-w5-check input {
  width: 20px;
  height: 20px;
  accent-color: #061126;
}

.pmd-w5-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 30px;
  padding: 0 12px;
  border-radius: 999px;
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  color: #2563eb;
  font-size: 12px;
  font-weight: 1000;
}

.pmd-w5-pill.warn {
  background: #fff7ed;
  border-color: #fdba74;
  color: #9a3412;
}

.pmd-w5-pill.green {
  background: #ecfdf5;
  border-color: #86efac;
  color: #166534;
}

.pmd-w5-pill.red {
  background: #fef2f2;
  border-color: #fecaca;
  color: #b91c1c;
}

.pmd-w5-meta {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 9px;
  margin: 12px 0;
}

.pmd-w5-box {
  background: #f8fafc;
  border: 1px solid #dbe3ee;
  border-radius: 13px;
  padding: 11px 12px;
  min-height: 58px;
}

.pmd-w5-box small {
  display: block;
  color: #64748b;
  font-size: 10px;
  font-weight: 1000;
  text-transform: uppercase;
  letter-spacing: .06em;
  margin-bottom: 4px;
}

.pmd-w5-box b {
  font-size: 14px;
  font-weight: 1000;
}

.pmd-w5-note {
  background: #fffbeb;
  border: 1px solid #facc15;
  border-radius: 13px;
  padding: 11px 12px;
  margin: 12px 0;
  font-size: 12px;
  font-weight: 900;
  color: #713f12;
  line-height: 1.35;
  max-height: 112px;
  overflow: auto;
}

.pmd-w5-items {
  background: #f8fafc;
  border: 1px solid #dbe3ee;
  border-radius: 13px;
  padding: 11px 12px;
  min-height: 82px;
  margin: 12px 0;
}

.pmd-w5-items small {
  display: block;
  color: #64748b;
  font-size: 10px;
  font-weight: 1000;
  text-transform: uppercase;
  letter-spacing: .06em;
  margin-bottom: 8px;
}

.pmd-w5-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  font-size: 13px;
  font-weight: 1000;
  padding: 4px 0;
  border-bottom: 1px solid rgba(203,213,225,.65);
}

.pmd-w5-item:last-child {
  border-bottom: 0;
}

.pmd-w5-card-actions {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 9px;
  margin-top: 12px;
}

.pmd-w5-add-card {
  border-style: dashed;
  display: grid;
  place-items: center;
  text-align: center;
  cursor: pointer;
}

.pmd-w5-add-card strong {
  display: block;
  font-size: 48px;
  line-height: 1;
  margin-bottom: 8px;
}

.pmd-w5-add-card h2 {
  margin: 0 0 6px;
  font-size: 22px;
  font-weight: 1000;
}

.pmd-w5-add-card p {
  margin: 0;
  color: #64748b;
  font-weight: 900;
}

.pmd-w5-batch {
  display: none;
  position: sticky;
  top: 0;
  z-index: 50;
  background: #061126;
  color: #fff;
  border-radius: 16px;
  padding: 12px 14px;
  margin: 0 0 14px;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  box-shadow: 0 18px 44px rgba(15,23,42,.16);
}

.pmd-w5-batch.is-show {
  display: flex;
}

.pmd-w5-batch b {
  font-size: 14px;
}

.pmd-w5-batch .pmd-w5-btn {
  background: #fff;
  color: #061126;
  border-color: #fff;
}

.pmd-w5-empty {
  grid-column: 1 / -1;
  border: 1px dashed #cbd5e1;
  border-radius: 18px;
  min-height: 220px;
  display: grid;
  place-items: center;
  text-align: center;
  color: #64748b;
  font-weight: 900;
  background: #fff;
}

.pmd-w5-modal {
  position: fixed;
  z-index: 99999;
  inset: 0;
  background: rgba(15,23,42,.34);
  display: none;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.pmd-w5-modal.is-show {
  display: flex;
}

.pmd-w5-modal-card {
  width: min(520px, 100%);
  background: #fff;
  border-radius: 20px;
  border: 1px solid #dbe3ee;
  box-shadow: 0 28px 80px rgba(15,23,42,.22);
  padding: 20px;
}

.pmd-w5-modal-card h2 {
  margin: 0 0 8px;
  font-size: 24px;
  font-weight: 1000;
  letter-spacing: -.05em;
}

.pmd-w5-status-list {
  display: grid;
  gap: 10px;
  margin: 16px 0;
}

.pmd-w5-status-option {
  border: 1px solid #dbe3ee;
  border-radius: 14px;
  min-height: 48px;
  background: #f8fafc;
  font-weight: 1000;
  cursor: pointer;
}

.pmd-w5-status-option:hover {
  border-color: #061126;
}

@media (max-width: 1280px) {
  .pmd-w5-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .pmd-w5-kpis {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 820px) {
  #pmd-waiter-dashboard-root {
    left: 0;
    right: 0;
    top: 70px;
    padding: 12px;
  }

  .pmd-w5-kpis,
  .pmd-w5-grid {
    grid-template-columns: 1fr;
  }
}
</style>

<script id="pmd-waiter-dashboard-v5-script">
(function () {
  if (window.PMD_WAITER_DASHBOARD_V5_WORKFLOW_UI) return;
  window.PMD_WAITER_DASHBOARD_V5_WORKFLOW_UI = true;

  var ENDPOINT = "/admin/pmd-waiter-dashboard-v9-tenant-data";
  var STATUS_ENDPOINT = "/admin/pmd-waiter-dashboard-v5-status-update";
  var FLOOR_TABLES_ENDPOINT = "/admin/pmd-waiter-dashboard-v9-floor-tables";
  var STATUS_OPTIONS_ENDPOINT = "/admin/pmd-waiter-dashboard-v6-status-options";

  var state = {
    filter: "needs",
    selectedTable: null,
    selectedIds: new Set(),
    data: null,
    connected: false,
    lastError: null,
    updates: 0,
    floorTables: []
  };

  var FILTERS = [
    ["needs", "Needs Action"],
    ["my", "My Tables"],
    ["all", "All Active Orders"],
    ["payment", "Payment Waiting"],
    ["ready", "Ready to Serve"],
    ["notes", "Notes / Calls"],
    ["selected", "Selected Table"]
  ];

  function isPage() {
    return /\/admin\/dashboardwaiter(?:$|[?#])/.test(location.pathname + location.search + location.hash);
  }

  function esc(v) {
    return String(v == null ? "" : v).replace(/[&<>"']/g, function (c) {
      return {"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[c];
    });
  }

  function money(v) {
    var n = Number(v || 0);
    return "€" + n.toFixed(2);
  }

  function norm(v) {
    return String(v == null ? "" : v).toLowerCase().trim();
  }

  function technicalNote(text) {
    var t = norm(text);
    if (!t) return true;
    var bad = [
      "imported from ready2order",
      "invoice_",
      "invoice id",
      "source_key",
      "vat_label",
      "item_total",
      "local_table_id",
      "table_name=",
      "gross=",
      "net=",
      "mapped_local_table_id"
    ];
    return bad.some(function (x) { return t.indexOf(x) !== -1; });
  }

  function cleanNotes(o) {
    var out = [];

    ["note", "notes", "comment", "customer_note", "order_note", "staff_note"].forEach(function (k) {
      var v = o && o[k];
      if (typeof v === "string" && v.trim() && !technicalNote(v)) out.push(v.trim());
      if (Array.isArray(v)) {
        v.forEach(function (x) {
          var txt = typeof x === "string" ? x : (x && (x.note || x.comment || x.text || x.message));
          if (txt && !technicalNote(txt)) out.push(String(txt).trim());
        });
      }
    });

    if (Array.isArray(o.items)) {
      o.items.forEach(function (it) {
        var n = it && (it.note || it.comment || it.option_note);
        if (n && !technicalNote(n)) out.push(String(n).trim());
      });
    }

    var uniq = [];
    out.forEach(function (x) {
      if (uniq.indexOf(x) === -1) uniq.push(x);
    });
    return uniq.slice(0, 3);
  }

  function ageInfo(createdAt) {
    if (!createdAt) return { label: "—", days: 0, old: false };
    var s = String(createdAt).replace(" ", "T");
    var d = new Date(s);
    if (isNaN(d.getTime())) return { label: "—", days: 0, old: false };
    var ms = Date.now() - d.getTime();
    var days = Math.floor(ms / 86400000);
    if (days >= 1) return { label: days + "d", days: days, old: days >= 1 };
    var mins = Math.max(0, Math.floor(ms / 60000));
    if (mins >= 60) return { label: Math.floor(mins / 60) + "h", days: 0, old: false };
    return { label: mins + "m", days: 0, old: false };
  }

  function normalizeOrder(o) {
    var id = o.id || o.order_id || o.orderId;
    var table = String(o.table_number || o.table_ref || o.table_id || o.table || "").replace(/^table\s*/i, "");
    var status = o.status_label || o.status || "Received";
    var totalRaw = Number(o.total || o.total_raw || o.order_total || 0);
    var notes = cleanNotes(o);
    var age = ageInfo(o.created_at || o.createdAt || o.date_added || o.updated_at);
    var items = Array.isArray(o.items) ? o.items : [];

    return {
      raw: o,
      id: id,
      orderId: o.order_id || id,
      table: table || "—",
      tableLabel: o.table_label || (table ? "Table " + table : "Table"),
      status: status,
      statusRaw: o.status_raw || o.status_id || "",
      total: totalRaw,
      totalLabel: o.total_label || money(totalRaw),
      createdAt: o.created_at || "",
      timeLabel: o.time_label || (o.created_at ? String(o.created_at).slice(11,16) : "—"),
      items: items,
      notes: notes,
      hasNote: notes.length > 0 || !!o.has_note || !!o.has_modifier,
      hasModifier: !!o.has_modifier || !!o.modifiers_count,
      age: age
    };
  }

  function rawOrders() {
    var d = state.data || {};
    var s = d.sections || {};
    return s.active_orders || s.orders || d.active_orders || d.orders || [];
  }

  function orders() {
    return rawOrders().map(normalizeOrder).filter(function (o) { return !!o.id; });
  }

  function isPaid(o) {
    var s = norm(o.status);
    return s.indexOf("paid") !== -1 || s.indexOf("closed") !== -1 || s.indexOf("complete") !== -1;
  }

  function isReady(o) {
    var s = norm(o.status);
    return s.indexOf("ready") !== -1 || s.indexOf("serve") !== -1;
  }

  function isPayment(o) {
    var s = norm(o.status);
    return !isPaid(o) && (o.total > 0 || s.indexOf("payment") !== -1 || s.indexOf("waiting") !== -1);
  }

  function needsAction(o) {
    return o.hasNote || isReady(o) || isPayment(o) || o.age.old;
  }

  function priorityScore(o) {
    var score = 0;
    if (o.hasNote) score += 1000;
    if (isReady(o)) score += 800;
    if (isPayment(o)) score += 500;
    if (o.age.old) score += 250;
    return -score;
  }

  function filteredOrders() {
    var list = orders();

    if (state.filter === "selected") {
      if (!state.selectedTable) return [];
      list = list.filter(function (o) { return String(o.table) === String(state.selectedTable); });
    }

    if (state.filter === "needs") {
      list = list.filter(needsAction);
    }

    if (state.filter === "payment") {
      list = list.filter(isPayment);
    }

    if (state.filter === "ready") {
      list = list.filter(isReady);
    }

    if (state.filter === "notes") {
      list = list.filter(function (o) { return o.hasNote; });
    }

    list.sort(function (a, b) {
      var p = priorityScore(a) - priorityScore(b);
      if (p !== 0) return p;
      return Number(b.orderId || 0) - Number(a.orderId || 0);
    });

    return list;
  }

  function tables() {
    var d = state.data || {};
    var s = d.sections || {};
    var source = [];

    if (Array.isArray(state.floorTables) && state.floorTables.length) {
      source = state.floorTables;
    } else if (Array.isArray(s.tables) && s.tables.length) {
      source = s.tables;
    } else if (Array.isArray(d.tables) && d.tables.length) {
      source = d.tables;
    }

    var list = [];

    function n(v, fallback) {
      var x = Number(v);
      return isFinite(x) ? x : fallback;
    }

    if (source.length) {
      source.forEach(function (x, idx) {
        var number = x.table_no || x.table_number || x.number || x.id || x.table_id || x.name;
        number = String(number || "").replace(/^table\s*/i, "");
        if (!number) return;

        list.push({
          id: x.id || x.table_id || null,
          number: number,
          label: x.table_label || x.table_name || ("Table " + number),
          min: x.min_capacity || null,
          max: x.max_capacity || null,
          capacityLabel: x.capacity_label || ((x.min_capacity && x.max_capacity) ? (x.min_capacity + "-" + x.max_capacity) : ""),
          floor: x.floor_name || "Main",
          section: x.table_section || "",
          x: n(x.floor_x, 8 + ((idx % 5) * 14)),
          y: n(x.floor_y, 10 + (Math.floor(idx / 5) * 20)),
          w: n(x.floor_width, 78),
          h: n(x.floor_height, 54),
          shape: String(x.floor_shape || "rectangle").toLowerCase(),
          raw: x
        });
      });
    }

    orders().forEach(function (o) {
      if (o.table && o.table !== "—" && !list.some(function (x) { return String(x.number) === String(o.table); })) {
        list.push({
          id: null,
          number: o.table,
          label: "Table " + o.table,
          min: null,
          max: null,
          capacityLabel: "",
          floor: "Unknown",
          section: "",
          x: 8 + ((list.length % 5) * 14),
          y: 10 + (Math.floor(list.length / 5) * 20),
          w: 78,
          h: 54,
          shape: "rectangle",
          raw: {}
        });
      }
    });

    list.sort(function (a, b) {
      var na = Number(a.number), nb = Number(b.number);
      if (isFinite(na) && isFinite(nb)) return na - nb;
      return String(a.number).localeCompare(String(b.number));
    });

    return list;
  }

  function tableOrders(tableNo) {
    return orders().filter(function (o) { return String(o.table) === String(tableNo); });
  }

  function tableClass(tableNo) {
    var os = tableOrders(tableNo);
    if (!os.length) return "";
    if (os.some(function (o) { return o.hasNote; })) return "is-urgent";
    if (os.some(isReady)) return "is-ready";
    if (os.some(isPayment)) return "is-payment";
    return "is-active";
  }

  function metric(path, fallback) {
    var d = state.data || {};
    var m = d.metrics || {};
    var v = m[path];
    return v && v.value != null ? v.value : fallback;
  }

  function openQuickOrder(tableNo) {
    window.location.href = "/table/" + encodeURIComponent(tableNo) + "/menu?waiter=1&quick=1";
  }

  function editOrder(id) {
    window.location.href = "/admin/orders/edit/" + encodeURIComponent(id);
  }

  function payOrders(ids) {
    var selected = orders().filter(function (o) { return ids.indexOf(String(o.id)) !== -1; });
    var tablesSelected = Array.from(new Set(selected.map(function (o) { return String(o.table); }))).filter(Boolean);

    if (tablesSelected.length === 1) {
      window.location.href = "/table/" + encodeURIComponent(tablesSelected[0]) + "/checkout?waiter=1&orders=" + encodeURIComponent(ids.join(","));
      return;
    }

    alert("برای payment چند order، اول orderهای یک table را انتخاب کن. الان orderها از چند table مختلف انتخاب شده‌اند.");
  }

  function csrf() {
    var m = document.querySelector('meta[name="csrf-token"]');
    if (m && m.content) return m.content;
    var i = document.querySelector('input[name="_token"]');
    if (i && i.value) return i.value;
    return "";
  }

  var __pmdW5StatusOptionsCache = null;

  async function loadRealStatusOptions() {
    if (__pmdW5StatusOptionsCache) return __pmdW5StatusOptionsCache;

    try {
      var r = await fetch(STATUS_OPTIONS_ENDPOINT + "?ts=" + Date.now(), {
        credentials: "same-origin",
        headers: {
          "Accept": "application/json",
          "X-Requested-With": "XMLHttpRequest"
        }
      });

      var j = await r.json();

      if (r.ok && j && j.ok && Array.isArray(j.options)) {
        __pmdW5StatusOptionsCache = j.options
          .map(function (x) {
            return {
              label: String(x.label || x.name || x.title || x.value || "").trim(),
              value: String(x.value || x.id || x.status_id || x.label || "").trim(),
              source: String(x.source || "")
            };
          })
          .filter(function (x) { return x.label && x.value; });

        return __pmdW5StatusOptionsCache;
      }
    } catch (e) {}

    var current = [];
    orders().forEach(function (o) {
      if (o.statusRaw) {
        current.push({
          label: o.status || ("Status " + o.statusRaw),
          value: String(o.statusRaw),
          source: "current-orders"
        });
      }
    });

    var seen = {};
    current = current.filter(function (x) {
      var k = x.value + "|" + x.label;
      if (seen[k]) return false;
      seen[k] = true;
      return true;
    });

    __pmdW5StatusOptionsCache = current;
    return __pmdW5StatusOptionsCache;
  }

  function statusModal(ids) {
    ids = ids.map(String);

    var modal = document.querySelector("#pmd-w5-status-modal");
    if (!modal) {
      modal = document.createElement("div");
      modal.id = "pmd-w5-status-modal";
      modal.className = "pmd-w5-modal";
      modal.innerHTML =
        '<div class="pmd-w5-modal-card">' +
          '<h2>Change Status</h2>' +
          '<p style="margin:0;color:#64748b;font-weight:900">Real statuses from database. Select one for selected order(s).</p>' +
          '<div class="pmd-w5-status-list"></div>' +
          '<div style="display:flex;justify-content:flex-end;gap:10px">' +
            '<button class="pmd-w5-btn" data-close>Cancel</button>' +
          '</div>' +
        '</div>';
      document.body.appendChild(modal);
      modal.addEventListener("click", function (e) {
        if (e.target === modal || e.target.closest("[data-close]")) modal.classList.remove("is-show");
      });
    }

    var list = modal.querySelector(".pmd-w5-status-list");
    list.innerHTML = '<div style="padding:14px;color:#64748b;font-weight:900">Loading real status options...</div>';
    modal.classList.add("is-show");

    loadRealStatusOptions().then(function (options) {
      if (!options.length) {
        list.innerHTML =
          '<div style="padding:14px;border:1px solid #fecaca;background:#fef2f2;color:#991b1b;border-radius:14px;font-weight:900">' +
          'No real order statuses found in database. We need to map the status table first.' +
          '</div>';
        return;
      }

      list.innerHTML = options.map(function (x) {
        return '<button class="pmd-w5-status-option" data-status-value="' + esc(x.value) + '">' +
          esc(x.label) +
          (x.source ? '<small style="display:block;color:#64748b;font-size:10px;margin-top:2px">' + esc(x.source) + '</small>' : '') +
        '</button>';
      }).join("");

      list.querySelectorAll("[data-status-value]").forEach(function (btn) {
        btn.addEventListener("click", function () {
          var value = btn.getAttribute("data-status-value");
          applyStatus(ids, value);
          modal.classList.remove("is-show");
        });
      });
    });
  }

  async function applyStatus(ids, label) {
    var token = csrf();
    var failed = [];

    for (var i = 0; i < ids.length; i++) {
      var id = ids[i];
      try {
        var r = await fetch(STATUS_ENDPOINT, {
          method: "POST",
          credentials: "same-origin",
          headers: {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "X-Requested-With": "XMLHttpRequest",
            "X-CSRF-TOKEN": token
          },
          body: JSON.stringify({ order_id: id, status_label: label })
        });

        var j = await r.json().catch(function () { return null; });

        if (!r.ok || !j || !j.ok) {
          failed.push("#" + id + " " + ((j && j.error) || ("HTTP " + r.status)));
        }
      } catch (e) {
        failed.push("#" + id + " " + e.message);
      }
    }

    state.selectedIds.clear();
    await refresh();

    if (failed.length) {
      alert("Status برای بعضی orderها تغییر نکرد:\n" + failed.join("\n"));
    }
  }

  function kpiHtml() {
    var d = state.data || {};
    var m = d.metrics || {};
    var activeTables = metric("active_tables", "—");
    var openOrders = metric("open_orders", "—");
    var pendingValue = metric("pending_value", "€0.00");
    var notes = metric("notes_count", "0");

    return '' +
      '<section class="pmd-w5-kpis">' +
        '<div class="pmd-w5-kpi"><div class="pmd-w5-ico">🍽️</div><div><h3>Assigned Tables</h3><strong>' + esc(activeTables) + '</strong><p>My active table load</p></div></div>' +
        '<div class="pmd-w5-kpi"><div class="pmd-w5-ico">🧾</div><div><h3>Active Orders</h3><strong>' + esc(openOrders) + '</strong><p>Live open orders</p></div></div>' +
        '<div class="pmd-w5-kpi"><div class="pmd-w5-ico">📝</div><div><h3>Notes / Changes</h3><strong>' + esc(notes) + '</strong><p>Orders needing attention</p></div></div>' +
        '<div class="pmd-w5-kpi"><div class="pmd-w5-ico">💳</div><div><h3>Payment Waiting</h3><strong>' + esc(pendingValue) + '</strong><p>Open payment value</p></div></div>' +
      '</section>';
  }

  function floorHtml() {
    var ts = tables();

    return '' +
      '<section class="pmd-w5-floor">' +
        '<div class="pmd-w5-head">' +
          '<h2>🍽️ Waiter Floor</h2>' +
          '<div style="color:#64748b;font-size:12px;font-weight:1000">' +
            (ts.length ? (ts.length + ' real tables from floor plan') : 'No real tables found') +
          '</div>' +
        '</div>' +
        '<div class="pmd-w5-floor-map pmd-w5-floor-map-real">' +
          (ts.length ? ts.map(function (t) {
            var os = tableOrders(t.number);
            var cls = tableClass(t.number);
            var selected = String(state.selectedTable) === String(t.number) ? " is-selected" : "";
            var radius = t.shape.indexOf("round") !== -1 || t.shape.indexOf("circle") !== -1 ? "999px" : "16px";
            var style = [
              "left:" + Math.max(2, Math.min(98, Number(t.x))) + "%",
              "top:" + Math.max(2, Math.min(98, Number(t.y))) + "%",
              "width:" + Math.max(50, Number(t.w || 78)) + "px",
              "height:" + Math.max(42, Number(t.h || 54)) + "px",
              "border-radius:" + radius
            ].join(";");

            return '<button class="pmd-w5-table ' + cls + selected + '" style="' + style + '" data-table="' + esc(t.number) + '" title="' + esc(t.label + ' · ' + t.floor + ' / ' + t.section + ' · cap ' + (t.capacityLabel || '—')) + '">' +
              '<span>' + esc(t.number) + '</span>' +
              (t.capacityLabel ? '<em>' + esc(t.capacityLabel) + '</em>' : '') +
              (os.length ? '<small>' + os.length + '</small>' : '') +
            '</button>';
          }).join('') : '<div style="color:#64748b;font-weight:900">No tables found in ti_tables</div>') +
        '</div>' +
      '</section>';
  }

  function tabsHtml() {
    return '<div class="pmd-w5-tabs">' + FILTERS.map(function (f) {
      var disabled = f[0] === "selected" && !state.selectedTable ? ' disabled style="opacity:.45;pointer-events:none"' : '';
      return '<button class="pmd-w5-tab ' + (state.filter === f[0] ? 'is-active' : '') + '" data-filter="' + f[0] + '"' + disabled + '>' + f[1] + '</button>';
    }).join('') + '</div>';
  }

  function batchHtml() {
    var count = state.selectedIds.size;
    return '<div class="pmd-w5-batch ' + (count ? 'is-show' : '') + '">' +
      '<b>' + count + ' order selected</b>' +
      '<div class="pmd-w5-actions">' +
        '<button class="pmd-w5-btn" data-batch="pay">Pay Selected</button>' +
        '<button class="pmd-w5-btn" data-batch="status">Change Status</button>' +
        '<button class="pmd-w5-btn" data-batch="clear">Clear</button>' +
      '</div>' +
    '</div>';
  }

  function selectedNoteHtml() {
    if (!state.selectedTable) return '<div class="pmd-w5-selected-note"></div>';
    return '<div class="pmd-w5-selected-note is-show">' +
      '<span>Selected Table: <b>Table ' + esc(state.selectedTable) + '</b></span>' +
      '<span class="pmd-w5-actions">' +
        '<button class="pmd-w5-btn primary" data-add-table="' + esc(state.selectedTable) + '">+ Add Order</button>' +
        '<button class="pmd-w5-btn" data-clear-table>Clear Table</button>' +
      '</span>' +
    '</div>';
  }

  function itemHtml(o) {
    var items = Array.isArray(o.items) ? o.items : [];

    if (!items.length) {
      return '<div class="pmd-w5-items"><small>Food Items</small><div class="pmd-w5-item"><span>Items not included in live feed</span><b>—</b></div></div>';
    }

    return '<div class="pmd-w5-items"><small>Food Items</small>' + items.slice(0, 5).map(function (it) {
      return '<div class="pmd-w5-item"><span>' + esc(it.name || it.menu_name || "Item") + '</span><b>×' + esc(it.qty || it.quantity || 1) + '</b></div>';
    }).join('') + (items.length > 5 ? '<div class="pmd-w5-item"><span>+' + (items.length - 5) + ' more items</span><b></b></div>' : '') + '</div>';
  }

  function cardHtml(o) {
    var checked = state.selectedIds.has(String(o.id)) ? ' checked' : '';
    var statusClass = o.hasNote ? "red" : (isReady(o) ? "green" : (isPayment(o) ? "warn" : ""));
    var chips = '';

    if (o.hasNote) chips += '<span class="pmd-w5-pill red">Note / change</span>';
    if (o.age.old) chips += '<span class="pmd-w5-pill warn">Old open</span>';

    return '' +
      '<article class="pmd-w5-card ' + (o.hasNote ? 'is-note ' : '') + (o.age.old ? 'is-old' : '') + '" data-order="' + esc(o.id) + '" data-table="' + esc(o.table) + '">' +
        '<div class="pmd-w5-card-top">' +
          '<label class="pmd-w5-check"><input type="checkbox" data-select-order="' + esc(o.id) + '"' + checked + '><span class="pmd-w5-pill">Table ' + esc(o.table) + '</span></label>' +
          '<span class="pmd-w5-pill ' + statusClass + '">' + esc(o.status) + '</span>' +
        '</div>' +
        '<h2>Order #' + esc(o.orderId) + '</h2>' +
        (chips ? '<div style="display:flex;gap:8px;flex-wrap:wrap;margin:10px 0">' + chips + '</div>' : '') +
        '<div class="pmd-w5-meta">' +
          '<div class="pmd-w5-box"><small>Total</small><b>' + esc(o.totalLabel) + '</b></div>' +
          '<div class="pmd-w5-box"><small>Time</small><b>' + esc(o.timeLabel) + '</b></div>' +
          '<div class="pmd-w5-box"><small>Age</small><b>' + esc(o.age.label) + '</b></div>' +
        '</div>' +
        (o.notes.length ? '<div class="pmd-w5-note"><b>Order note</b><br>' + esc(o.notes.join(" · ")) + '</div>' : '') +
        itemHtml(o) +
        '<div class="pmd-w5-card-actions">' +
          '<button class="primary" data-edit="' + esc(o.id) + '">Edit</button>' +
          '<button data-pay-one="' + esc(o.id) + '">Payment</button>' +
          '<button class="warn" data-status-one="' + esc(o.id) + '">Status</button>' +
        '</div>' +
      '</article>';
  }

  function addOrderCardHtml() {
    if (state.filter !== "selected" || !state.selectedTable) return '';
    return '<article class="pmd-w5-add-card" data-add-table="' + esc(state.selectedTable) + '">' +
      '<div><strong>+</strong><h2>Add Order</h2><p>Quick menu for Table ' + esc(state.selectedTable) + '</p></div>' +
    '</article>';
  }

  function boardHtml() {
    var list = filteredOrders();

    if (state.filter === "needs" && !list.length) {
      list = orders().slice(0, 12);
    }

    var html = '';

    if (state.filter === "selected") html += addOrderCardHtml();

    if (!list.length) {
      html += '<div class="pmd-w5-empty"><div><h2>No orders here</h2><p>Choose another view or click a table from the floor.</p></div></div>';
    } else {
      html += list.map(cardHtml).join('');
    }

    return '' +
      '<section class="pmd-w5-board">' +
        '<div class="pmd-w5-head">' +
          '<div><h2>Active Order Cards</h2></div>' +
          '<div class="pmd-w5-actions">' +
            '<button class="pmd-w5-btn primary" data-new-order>New Order</button>' +
            '<button class="pmd-w5-btn" data-filter="all">All Orders</button>' +
            '<button class="pmd-w5-btn" data-filter="my">Tables</button>' +
          '</div>' +
        '</div>' +
        tabsHtml() +
        selectedNoteHtml() +
        batchHtml() +
        '<div class="pmd-w5-grid">' + html + '</div>' +
      '</section>';
  }

  function render() {
    if (!isPage()) return;

    document.documentElement.classList.add("pmd-waiter-dashboard-active");

    var root = document.querySelector("#pmd-waiter-dashboard-root");
    if (!root) {
      root = document.createElement("div");
      root.id = "pmd-waiter-dashboard-root";
      document.body.appendChild(root);
    }

    root.innerHTML = '<div class="pmd-w5-shell">' + kpiHtml() + floorHtml() + boardHtml() + '</div>';
    bind(root);
    try { document.dispatchEvent(new CustomEvent('pmd-waiter-dashboard-rendered')); } catch(e) {}
  }

  function bind(root) {
    root.querySelectorAll("[data-filter]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        state.filter = btn.getAttribute("data-filter");
        if (state.filter !== "selected") state.selectedTable = state.selectedTable;
        state.selectedIds.clear();
        render();
      });
    });

    root.querySelectorAll("[data-table]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var table = btn.getAttribute("data-table");
        var os = tableOrders(table);

        if (os.length) {
          state.selectedTable = table;
          state.filter = "selected";
          state.selectedIds.clear();
          render();
        } else {
          openQuickOrder(table);
        }
      });
    });

    root.querySelectorAll("[data-add-table]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        openQuickOrder(btn.getAttribute("data-add-table"));
      });
    });

    root.querySelectorAll("[data-clear-table]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        state.selectedTable = null;
        state.filter = "needs";
        state.selectedIds.clear();
        render();
      });
    });

    root.querySelectorAll("[data-select-order]").forEach(function (cb) {
      cb.addEventListener("change", function () {
        var id = String(cb.getAttribute("data-select-order"));
        if (cb.checked) state.selectedIds.add(id);
        else state.selectedIds.delete(id);
        render();
      });
    });

    root.querySelectorAll("[data-edit]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        editOrder(btn.getAttribute("data-edit"));
      });
    });

    root.querySelectorAll("[data-pay-one]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        payOrders([String(btn.getAttribute("data-pay-one"))]);
      });
    });

    root.querySelectorAll("[data-status-one]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        statusModal([String(btn.getAttribute("data-status-one"))]);
      });
    });

    root.querySelectorAll("[data-batch]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var action = btn.getAttribute("data-batch");
        var ids = Array.from(state.selectedIds);

        if (action === "clear") {
          state.selectedIds.clear();
          render();
          return;
        }

        if (!ids.length) return;

        if (action === "pay") {
          payOrders(ids);
          return;
        }

        if (action === "status") {
          statusModal(ids);
        }
      });
    });

    var newOrder = root.querySelector("[data-new-order]");
    if (newOrder) {
      newOrder.addEventListener("click", function () {
        if (state.selectedTable) openQuickOrder(state.selectedTable);
        else window.location.href = "/admin/orders/create";
      });
    }
  }

  async function refresh() {
    if (!isPage()) return;

    try {
      var r = await fetch(ENDPOINT + "?ts=" + Date.now(), {
        credentials: "same-origin",
        headers: {
          "Accept": "application/json",
          "X-Requested-With": "XMLHttpRequest"
        }
      });

      var j = await r.json();

      if (!r.ok || !j || !j.ok) throw new Error((j && j.error) || ("HTTP " + r.status));

      try {
        var pmdWaiterV8Floor = await fetch(FLOOR_TABLES_ENDPOINT + "?ts=" + Date.now(), {
          credentials: "same-origin",
          headers: {
            "Accept": "application/json",
            "X-Requested-With": "XMLHttpRequest"
          }
        });
        var pmdWaiterV8FloorJson = await pmdWaiterV8Floor.json();
        if (pmdWaiterV8Floor.ok && pmdWaiterV8FloorJson && pmdWaiterV8FloorJson.ok && Array.isArray(pmdWaiterV8FloorJson.tables)) {
          state.floorTables = pmdWaiterV8FloorJson.tables;
          j.sections = j.sections || {};
          j.sections.tables = pmdWaiterV8FloorJson.tables;
        }
      } catch (floorErr) {
        console.warn("[PMD] Waiter V8 floor tables failed", floorErr.message);
      }

      state.data = j;
      state.connected = true;
      state.lastError = null;
      state.updates += 1;
      render();

      console.info("[PMD] Waiter Dashboard V5 workflow active", {
        updates: state.updates,
        orders: orders().length,
        filter: state.filter,
        selectedTable: state.selectedTable,
        selectedOrders: state.selectedIds.size,
        connected: true
      });
    } catch (e) {
      state.connected = false;
      state.lastError = e.message;
      render();
      console.warn("[PMD] Waiter Dashboard V5 live failed", e.message);
    }
  }

  window.PMDWaiterDashboard = {
    refresh: refresh,
    debug: function () {
      return {
        active: isPage(),
        version: "V5 waiter workflow tabs/table-select/batch/status",
        endpoint: ENDPOINT,
        connected: state.connected,
        lastError: state.lastError,
        updates: state.updates,
        filter: state.filter,
        selectedTable: state.selectedTable,
        selectedOrders: Array.from(state.selectedIds),
        orders: orders().length,
        tables: tables().map(function (t) { return t.number; })
      };
    },
    selectTable: function (tableNo) {
      state.selectedTable = String(tableNo);
      state.filter = "selected";
      state.selectedIds.clear();
      render();
    },
    setFilter: function (f) {
      state.filter = f;
      state.selectedIds.clear();
      render();
    }
  };

  function boot() {
    if (!isPage()) return;
    document.documentElement.classList.add("pmd-waiter-dashboard-active");
    render();
    refresh();
    setInterval(refresh, 15000);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
</script>
<!-- PMD_WAITER_DASHBOARD_V5_WORKFLOW_UI_END -->



<!-- PMD_WAITER_DASHBOARD_V6_CLEANUP_FIXES_START -->
<style id="pmd-waiter-dashboard-v6-cleanup-fixes-style">
/*
  V6 cleanup:
  - remove old D2 floating bubble
  - clean floor table labels/badges
  - keep only V5 waiter UI active
*/

html.pmd-waiter-dashboard-active #pmd-dashboard2-quick-btn,
html.pmd-waiter-dashboard-active .pmd-d2-quick-btn,
html.pmd-waiter-dashboard-active [id*="dashboard2"][id*="quick"],
html.pmd-waiter-dashboard-active [class*="dashboard2"][class*="quick"],
html.pmd-waiter-dashboard-active [id*="owner"][id*="quick"],
html.pmd-waiter-dashboard-active [class*="owner"][class*="quick"] {
  display: none !important;
  visibility: hidden !important;
  pointer-events: none !important;
  opacity: 0 !important;
}

html.pmd-waiter-dashboard-active .pmd-w5-floor-map {
  gap: 38px !important;
  padding: 24px 38px 30px !important;
  align-items: center !important;
  overflow-x: auto !important;
  overflow-y: visible !important;
}

html.pmd-waiter-dashboard-active .pmd-w5-table {
  min-width: 74px !important;
  width: auto !important;
  max-width: 118px !important;
  height: 44px !important;
  padding: 0 16px !important;
  overflow: visible !important;
  white-space: nowrap !important;
  text-overflow: ellipsis !important;
  font-size: 22px !important;
  line-height: 1 !important;
}

html.pmd-waiter-dashboard-active .pmd-w5-table small {
  top: auto !important;
  right: -9px !important;
  bottom: -14px !important;
  min-width: 26px !important;
  height: 26px !important;
  border-radius: 999px !important;
  font-size: 11px !important;
  transform: none !important;
  box-shadow: 0 8px 18px rgba(15,23,42,.16) !important;
}

html.pmd-waiter-dashboard-active .pmd-w5-table[data-table="dinein"],
html.pmd-waiter-dashboard-active .pmd-w5-table[data-table="Dinein"],
html.pmd-waiter-dashboard-active .pmd-w5-table[data-table="DINEIN"] {
  min-width: 94px !important;
  max-width: 112px !important;
  font-size: 15px !important;
  letter-spacing: -.02em !important;
  text-transform: capitalize !important;
}

html.pmd-waiter-dashboard-active .pmd-w5-card {
  transition: border-color .16s ease, box-shadow .16s ease, transform .16s ease !important;
}

html.pmd-waiter-dashboard-active .pmd-w5-card:hover {
  transform: translateY(-1px) !important;
  box-shadow: 0 18px 44px rgba(15,23,42,.07) !important;
}
</style>
<script id="pmd-waiter-dashboard-v6-cleanup-fixes-script">
(function () {
  if (!/\/admin\/dashboardwaiter(?:$|[?#])/.test(location.pathname + location.search + location.hash)) return;

  document.documentElement.classList.add('pmd-waiter-dashboard-active');

  function killOldBubbles() {
    document.querySelectorAll('#pmd-dashboard2-quick-btn,.pmd-d2-quick-btn,[id*="dashboard2"][id*="quick"],[class*="dashboard2"][class*="quick"]').forEach(function (el) {
      el.remove();
    });
  }

  killOldBubbles();
  setTimeout(killOldBubbles, 300);
  setTimeout(killOldBubbles, 1000);

  console.info('[PMD] Waiter Dashboard V6 cleanup active');
})();
</script>
<!-- PMD_WAITER_DASHBOARD_V6_CLEANUP_FIXES_END -->



<!-- PMD_WAITER_DASHBOARD_V7_SOFT_FLOOR_REMOVE_TOP_ACTIONS_START -->
<style id="pmd-waiter-dashboard-v7-soft-floor-remove-top-actions-style">
/*
  V7 waiter polish:
  - softer floor table colors
  - remove duplicated top action buttons: New Order / All Orders / Tables
  CSS only. No loop. No observer.
*/

/* Remove only the duplicated top-right actions in Active Order Cards header */
html.pmd-waiter-dashboard-active .pmd-w5-actions:has([data-new-order]),
html.pmd-waiter-dashboard-active .pmd-w5-actions:has(button[data-filter="all"]):has(button[data-filter="my"]) {
  display: none !important;
  visibility: hidden !important;
  width: 0 !important;
  height: 0 !important;
  overflow: hidden !important;
  pointer-events: none !important;
  opacity: 0 !important;
}

/* Keep the filter pills visible */
html.pmd-waiter-dashboard-active .pmd-w5-tabs,
html.pmd-waiter-dashboard-active .pmd-w5-filter-tabs,
html.pmd-waiter-dashboard-active .pmd-w5-tabbar {
  display: flex !important;
}

/* Softer floor map table base */
html.pmd-waiter-dashboard-active .pmd-w5-floor-map .pmd-w5-table {
  background: rgba(255,255,255,.92) !important;
  color: #0f172a !important;
  border-width: 3px !important;
  box-shadow: 0 8px 18px rgba(15,23,42,.045) !important;
  filter: none !important;
}

/* Soft status colors */
html.pmd-waiter-dashboard-active .pmd-w5-floor-map .pmd-w5-table,
html.pmd-waiter-dashboard-active .pmd-w5-floor-map .pmd-w5-table.is-free,
html.pmd-waiter-dashboard-active .pmd-w5-floor-map .pmd-w5-table.free,
html.pmd-waiter-dashboard-active .pmd-w5-floor-map .pmd-w5-table.available {
  border-color: #86efac !important;
  background: linear-gradient(180deg, #ffffff 0%, #f0fdf4 100%) !important;
}

html.pmd-waiter-dashboard-active .pmd-w5-floor-map .pmd-w5-table.is-busy,
html.pmd-waiter-dashboard-active .pmd-w5-floor-map .pmd-w5-table.busy,
html.pmd-waiter-dashboard-active .pmd-w5-floor-map .pmd-w5-table.active,
html.pmd-waiter-dashboard-active .pmd-w5-floor-map .pmd-w5-table.has-orders {
  border-color: #c4b5fd !important;
  background: linear-gradient(180deg, #ffffff 0%, #f5f3ff 100%) !important;
}

html.pmd-waiter-dashboard-active .pmd-w5-floor-map .pmd-w5-table.is-payment,
html.pmd-waiter-dashboard-active .pmd-w5-floor-map .pmd-w5-table.payment,
html.pmd-waiter-dashboard-active .pmd-w5-floor-map .pmd-w5-table.waiting,
html.pmd-waiter-dashboard-active .pmd-w5-floor-map .pmd-w5-table.pay {
  border-color: #fdba74 !important;
  background: linear-gradient(180deg, #ffffff 0%, #fff7ed 100%) !important;
}

html.pmd-waiter-dashboard-active .pmd-w5-floor-map .pmd-w5-table.is-note,
html.pmd-waiter-dashboard-active .pmd-w5-floor-map .pmd-w5-table.note,
html.pmd-waiter-dashboard-active .pmd-w5-floor-map .pmd-w5-table.call,
html.pmd-waiter-dashboard-active .pmd-w5-floor-map .pmd-w5-table.needs,
html.pmd-waiter-dashboard-active .pmd-w5-floor-map .pmd-w5-table.attention {
  border-color: #fca5a5 !important;
  background: linear-gradient(180deg, #ffffff 0%, #fef2f2 100%) !important;
}

/* Make badges softer too */
html.pmd-waiter-dashboard-active .pmd-w5-floor-map .pmd-w5-table small {
  background: #0f172a !important;
  color: #ffffff !important;
  border: 2px solid #ffffff !important;
  box-shadow: 0 6px 14px rgba(15,23,42,.14) !important;
}

/* Selected table should still be clear but not aggressive */
html.pmd-waiter-dashboard-active .pmd-w5-floor-map .pmd-w5-table.is-selected,
html.pmd-waiter-dashboard-active .pmd-w5-floor-map .pmd-w5-table.selected,
html.pmd-waiter-dashboard-active .pmd-w5-floor-map .pmd-w5-table[aria-pressed="true"] {
  border-color: #60a5fa !important;
  background: linear-gradient(180deg, #ffffff 0%, #eff6ff 100%) !important;
  box-shadow: 0 0 0 4px rgba(96,165,250,.16), 0 8px 18px rgba(15,23,42,.045) !important;
}

/* Remove remaining duplicated action block by exact children, for browsers that support :has */
html.pmd-waiter-dashboard-active div.pmd-w5-actions:has(button[data-new-order]) {
  display: none !important;
}
</style>
<script id="pmd-waiter-dashboard-v7-soft-floor-remove-top-actions-script">
(function () {
  if (!/\/admin\/dashboardwaiter(?:$|[?#])/.test(location.pathname + location.search + location.hash)) return;

  function hideDuplicateTopActions() {
    document.querySelectorAll('.pmd-w5-actions').forEach(function (el) {
      if (el.querySelector('[data-new-order]') || (el.querySelector('[data-filter="all"]') && el.querySelector('[data-filter="my"]'))) {
        el.style.display = 'none';
        el.style.visibility = 'hidden';
        el.style.pointerEvents = 'none';
      }
    });
  }

  hideDuplicateTopActions();
  setTimeout(hideDuplicateTopActions, 120);
  setTimeout(hideDuplicateTopActions, 600);

  console.info('[PMD] Waiter Dashboard V7 soft floor + duplicate actions hidden');
})();
</script>
<!-- PMD_WAITER_DASHBOARD_V7_SOFT_FLOOR_REMOVE_TOP_ACTIONS_END -->



<!-- PMD_WAITER_DASHBOARD_V8_REAL_FLOOR_MAP_STYLE_START -->
<style id="pmd-waiter-dashboard-v8-real-floor-map-style">
/*
  V8:
  Real floor map uses ti_tables floor_x/floor_y/floor_width/floor_height/floor_shape.
  No fake flex/random layout.
*/

html.pmd-waiter-dashboard-active .pmd-w5-floor-map-real {
  position: relative !important;
  display: block !important;
  min-height: 430px !important;
  padding: 0 !important;
  overflow: auto !important;
  background:
    linear-gradient(90deg, rgba(148,163,184,.13) 1px, transparent 1px),
    linear-gradient(0deg, rgba(148,163,184,.13) 1px, transparent 1px),
    #f8fafc !important;
  background-size: 10% 20%, 10% 20%, auto !important;
}

html.pmd-waiter-dashboard-active .pmd-w5-floor-map-real .pmd-w5-table {
  position: absolute !important;
  transform: translate(-50%, -50%) !important;
  min-width: 0 !important;
  max-width: none !important;
  padding: 0 !important;
  display: grid !important;
  place-items: center !important;
  align-content: center !important;
  gap: 0 !important;
  background: #ffffff !important;
  color: #0f172a !important;
  border-width: 3px !important;
  box-shadow: 0 8px 18px rgba(15,23,42,.055) !important;
}

html.pmd-waiter-dashboard-active .pmd-w5-floor-map-real .pmd-w5-table span {
  display: block !important;
  font-size: 18px !important;
  line-height: 1 !important;
  font-weight: 1000 !important;
}

html.pmd-waiter-dashboard-active .pmd-w5-floor-map-real .pmd-w5-table em {
  display: block !important;
  margin-top: 4px !important;
  font-style: normal !important;
  font-size: 10px !important;
  line-height: 1 !important;
  font-weight: 1000 !important;
  color: #64748b !important;
}

html.pmd-waiter-dashboard-active .pmd-w5-floor-map-real .pmd-w5-table small {
  position: absolute !important;
  top: -12px !important;
  right: -12px !important;
  bottom: auto !important;
  min-width: 24px !important;
  height: 24px !important;
  border-radius: 999px !important;
  background: #0f172a !important;
  color: #fff !important;
  border: 2px solid #fff !important;
  display: grid !important;
  place-items: center !important;
  font-size: 11px !important;
}

html.pmd-waiter-dashboard-active .pmd-w5-floor-map-real .pmd-w5-table {
  border-color: #86efac !important;
  background: linear-gradient(180deg, #ffffff 0%, #f0fdf4 100%) !important;
}

html.pmd-waiter-dashboard-active .pmd-w5-floor-map-real .pmd-w5-table.is-active {
  border-color: #c4b5fd !important;
  background: linear-gradient(180deg, #ffffff 0%, #f5f3ff 100%) !important;
}

html.pmd-waiter-dashboard-active .pmd-w5-floor-map-real .pmd-w5-table.is-ready {
  border-color: #93c5fd !important;
  background: linear-gradient(180deg, #ffffff 0%, #eff6ff 100%) !important;
}

html.pmd-waiter-dashboard-active .pmd-w5-floor-map-real .pmd-w5-table.is-payment {
  border-color: #fdba74 !important;
  background: linear-gradient(180deg, #ffffff 0%, #fff7ed 100%) !important;
}

html.pmd-waiter-dashboard-active .pmd-w5-floor-map-real .pmd-w5-table.is-urgent {
  border-color: #fca5a5 !important;
  background: linear-gradient(180deg, #ffffff 0%, #fef2f2 100%) !important;
  animation: none !important;
}

html.pmd-waiter-dashboard-active .pmd-w5-floor-map-real .pmd-w5-table.is-selected {
  border-color: #60a5fa !important;
  box-shadow: 0 0 0 5px rgba(96,165,250,.16), 0 8px 18px rgba(15,23,42,.055) !important;
}
</style>
<!-- PMD_WAITER_DASHBOARD_V8_REAL_FLOOR_MAP_STYLE_END -->









<!-- PMD_WAITER_DASHBOARD_V14_ORDER_TABLE_EFFECT_START -->
<style id="pmd-waiter-dashboard-v14-order-table-effect-style">
/*
  V14:
  make active/order tables visually obvious after table alias mapping.
*/

html.pmd-waiter-dashboard-active .pmd-w5-floor-map-real .pmd-w5-table.is-active,
html.pmd-waiter-dashboard-active .pmd-w5-floor-map-real .pmd-w5-table.has-orders,
html.pmd-waiter-dashboard-active .pmd-w5-floor-map-real .pmd-w5-table.busy {
  border-color: #fbbf24 !important;
  background: linear-gradient(180deg, #ffffff 0%, #fffbeb 100%) !important;
  box-shadow: 0 0 0 5px rgba(251,191,36,.16), 0 16px 32px rgba(15,23,42,.10) !important;
}

html.pmd-waiter-dashboard-active .pmd-w5-floor-map-real .pmd-w5-table.is-active::before,
html.pmd-waiter-dashboard-active .pmd-w5-floor-map-real .pmd-w5-table.has-orders::before,
html.pmd-waiter-dashboard-active .pmd-w5-floor-map-real .pmd-w5-table.busy::before {
  content: "●" !important;
  position: absolute !important;
  right: -9px !important;
  bottom: -9px !important;
  width: 22px !important;
  height: 22px !important;
  border-radius: 999px !important;
  display: grid !important;
  place-items: center !important;
  background: #f59e0b !important;
  color: #fff !important;
  border: 2px solid #fff !important;
  font-size: 10px !important;
  line-height: 1 !important;
}

html.pmd-waiter-dashboard-active .pmd-w5-card [class*="table"],
html.pmd-waiter-dashboard-active .pmd-w5-card .pmd-w5-pill {
  white-space: nowrap !important;
}

/* make "No table" orders visually different, not fake table */
html.pmd-waiter-dashboard-active .pmd-w5-card[data-table=""],
html.pmd-waiter-dashboard-active .pmd-w5-card[data-table="—"],
html.pmd-waiter-dashboard-active .pmd-w5-card[data-table="-"] {
  border-color: #fecaca !important;
}
</style>
<!-- PMD_WAITER_DASHBOARD_V14_ORDER_TABLE_EFFECT_END -->



<!-- PMD_WAITER_DASHBOARD_V15_PAYMENT_TABLE_EFFECT_START -->
<style id="pmd-waiter-dashboard-v15-payment-table-effect-style">
/*
  V15:
  Strong visible effect for tables with active orders/payment waiting.
*/

html.pmd-waiter-dashboard-active .pmd-w5-floor-map-real .pmd-w5-table.is-payment,
html.pmd-waiter-dashboard-active .pmd-w5-floor-map-real .pmd-w5-table.is-active,
html.pmd-waiter-dashboard-active .pmd-w5-floor-map-real .pmd-w5-table.has-orders,
html.pmd-waiter-dashboard-active .pmd-w5-floor-map-real .pmd-w5-table.busy {
  border-color: #f59e0b !important;
  background: linear-gradient(180deg, #ffffff 0%, #fff7ed 100%) !important;
  box-shadow: 0 0 0 5px rgba(245,158,11,.18), 0 18px 34px rgba(15,23,42,.12) !important;
}

html.pmd-waiter-dashboard-active .pmd-w5-floor-map-real .pmd-w5-table.is-payment::before,
html.pmd-waiter-dashboard-active .pmd-w5-floor-map-real .pmd-w5-table.is-active::before,
html.pmd-waiter-dashboard-active .pmd-w5-floor-map-real .pmd-w5-table.has-orders::before,
html.pmd-waiter-dashboard-active .pmd-w5-floor-map-real .pmd-w5-table.busy::before {
  content: "●" !important;
  position: absolute !important;
  right: -9px !important;
  bottom: -9px !important;
  width: 22px !important;
  height: 22px !important;
  border-radius: 999px !important;
  display: grid !important;
  place-items: center !important;
  background: #f59e0b !important;
  color: #fff !important;
  border: 2px solid #fff !important;
  font-size: 10px !important;
  line-height: 1 !important;
  z-index: 3 !important;
}

html.pmd-waiter-dashboard-active .pmd-w5-floor-map-real .pmd-w5-table.is-ready {
  border-color: #60a5fa !important;
  background: linear-gradient(180deg, #ffffff 0%, #eff6ff 100%) !important;
  box-shadow: 0 0 0 5px rgba(96,165,250,.16), 0 18px 34px rgba(15,23,42,.12) !important;
}

html.pmd-waiter-dashboard-active .pmd-w5-floor-map-real .pmd-w5-table.is-urgent {
  border-color: #f87171 !important;
  background: linear-gradient(180deg, #ffffff 0%, #fef2f2 100%) !important;
  box-shadow: 0 0 0 5px rgba(248,113,113,.18), 0 18px 34px rgba(15,23,42,.12) !important;
}
</style>
<!-- PMD_WAITER_DASHBOARD_V15_PAYMENT_TABLE_EFFECT_END -->



<!-- PMD_WAITER_DASHBOARD_V16_SHARP_COLOR_BOOST_START -->
<style id="pmd-waiter-dashboard-v16-sharp-color-boost-style">
/*
  V16 sharp color boost.
  Visual only. No backend/data changes.
*/

/* Main surface */
html.pmd-waiter-dashboard-active #pmd-waiter-dashboard-root {
  --pmd-blue: #2563eb;
  --pmd-blue-soft: #dbeafe;
  --pmd-green: #16a34a;
  --pmd-green-soft: #dcfce7;
  --pmd-orange: #f97316;
  --pmd-orange-strong: #ea580c;
  --pmd-orange-soft: #ffedd5;
  --pmd-red: #dc2626;
  --pmd-red-soft: #fee2e2;
  --pmd-purple: #7c3aed;
  --pmd-purple-soft: #ede9fe;
  --pmd-navy: #061126;
}

/* Top KPI cards - sharper borders and color mood */
html.pmd-waiter-dashboard-active .pmd-w5-kpi,
html.pmd-waiter-dashboard-active .pmd-w5-stat,
html.pmd-waiter-dashboard-active .pmd-w5-metric,
html.pmd-waiter-dashboard-active .pmd-w5-kpis > * {
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 45%, #ffffff 100%) !important;
  border-width: 2px !important;
  box-shadow: 0 18px 36px rgba(15,23,42,.075) !important;
}

/* KPI card accents by position */
html.pmd-waiter-dashboard-active .pmd-w5-kpis > *:nth-child(1),
html.pmd-waiter-dashboard-active .pmd-w5-stat-grid > *:nth-child(1) {
  border-color: #22c55e !important;
  background: linear-gradient(135deg, #ffffff 0%, #dcfce7 100%) !important;
}

html.pmd-waiter-dashboard-active .pmd-w5-kpis > *:nth-child(2),
html.pmd-waiter-dashboard-active .pmd-w5-stat-grid > *:nth-child(2) {
  border-color: #f97316 !important;
  background: linear-gradient(135deg, #ffffff 0%, #ffedd5 100%) !important;
}

html.pmd-waiter-dashboard-active .pmd-w5-kpis > *:nth-child(3),
html.pmd-waiter-dashboard-active .pmd-w5-stat-grid > *:nth-child(3) {
  border-color: #3b82f6 !important;
  background: linear-gradient(135deg, #ffffff 0%, #dbeafe 100%) !important;
}

html.pmd-waiter-dashboard-active .pmd-w5-kpis > *:nth-child(4),
html.pmd-waiter-dashboard-active .pmd-w5-stat-grid > *:nth-child(4) {
  border-color: #f97316 !important;
  background: linear-gradient(135deg, #ffffff 0%, #ffedd5 100%) !important;
}

/* KPI icon circles */
html.pmd-waiter-dashboard-active .pmd-w5-kpi [class*="icon"],
html.pmd-waiter-dashboard-active .pmd-w5-stat [class*="icon"],
html.pmd-waiter-dashboard-active .pmd-w5-metric [class*="icon"] {
  border-color: rgba(37,99,235,.28) !important;
  background: linear-gradient(180deg, #ffffff 0%, #dbeafe 100%) !important;
  box-shadow: 0 8px 18px rgba(37,99,235,.12) !important;
}

/* Floor map surface */
html.pmd-waiter-dashboard-active .pmd-w5-floor {
  border-color: #bfdbfe !important;
  box-shadow: 0 22px 46px rgba(15,23,42,.09) !important;
}

html.pmd-waiter-dashboard-active .pmd-w5-floor-map-real {
  border-color: #bfdbfe !important;
  background:
    linear-gradient(90deg, rgba(37,99,235,.10) 1px, transparent 1px),
    linear-gradient(0deg, rgba(37,99,235,.10) 1px, transparent 1px),
    linear-gradient(180deg, #ffffff 0%, #eff6ff 100%) !important;
  box-shadow: inset 0 1px 0 rgba(255,255,255,.85), 0 16px 34px rgba(15,23,42,.06) !important;
}

/* Free table - sharper green */
html.pmd-waiter-dashboard-active .pmd-w5-floor-map-real .pmd-w5-table {
  border-color: #22c55e !important;
  background: linear-gradient(180deg, #ffffff 0%, #dcfce7 100%) !important;
  box-shadow: 0 14px 28px rgba(22,163,74,.13) !important;
}

html.pmd-waiter-dashboard-active .pmd-w5-floor-map-real .pmd-w5-table span {
  color: #020617 !important;
}

html.pmd-waiter-dashboard-active .pmd-w5-floor-map-real .pmd-w5-table em {
  background: rgba(22,163,74,.13) !important;
  color: #166534 !important;
}

/* Active/payment table - much more visible */
html.pmd-waiter-dashboard-active .pmd-w5-floor-map-real .pmd-w5-table.is-payment,
html.pmd-waiter-dashboard-active .pmd-w5-floor-map-real .pmd-w5-table.is-active,
html.pmd-waiter-dashboard-active .pmd-w5-floor-map-real .pmd-w5-table.busy,
html.pmd-waiter-dashboard-active .pmd-w5-floor-map-real .pmd-w5-table.has-orders {
  border-color: #f97316 !important;
  background: linear-gradient(180deg, #ffffff 0%, #ffedd5 100%) !important;
  box-shadow: 0 0 0 6px rgba(249,115,22,.22), 0 20px 42px rgba(234,88,12,.22) !important;
}

html.pmd-waiter-dashboard-active .pmd-w5-floor-map-real .pmd-w5-table.is-payment span,
html.pmd-waiter-dashboard-active .pmd-w5-floor-map-real .pmd-w5-table.is-active span,
html.pmd-waiter-dashboard-active .pmd-w5-floor-map-real .pmd-w5-table.busy span,
html.pmd-waiter-dashboard-active .pmd-w5-floor-map-real .pmd-w5-table.has-orders span {
  color: #7c2d12 !important;
}

/* Ready table */
html.pmd-waiter-dashboard-active .pmd-w5-floor-map-real .pmd-w5-table.is-ready {
  border-color: #2563eb !important;
  background: linear-gradient(180deg, #ffffff 0%, #dbeafe 100%) !important;
  box-shadow: 0 0 0 6px rgba(37,99,235,.18), 0 20px 42px rgba(37,99,235,.18) !important;
}

/* Urgent table */
html.pmd-waiter-dashboard-active .pmd-w5-floor-map-real .pmd-w5-table.is-urgent {
  border-color: #dc2626 !important;
  background: linear-gradient(180deg, #ffffff 0%, #fee2e2 100%) !important;
  box-shadow: 0 0 0 6px rgba(220,38,38,.20), 0 20px 42px rgba(220,38,38,.18) !important;
}

/* Selected / merged table */
html.pmd-waiter-dashboard-active .pmd-w5-floor-map-real .pmd-w5-table.pmd-w12-selected {
  border-color: #7c3aed !important;
  background: linear-gradient(180deg, #ffffff 0%, #ede9fe 100%) !important;
  box-shadow: 0 0 0 6px rgba(124,58,237,.24), 0 20px 42px rgba(124,58,237,.18) !important;
}

html.pmd-waiter-dashboard-active .pmd-w5-floor-map-real .pmd-w5-table.pmd-w12-merged {
  border-color: #f97316 !important;
  background: linear-gradient(180deg, #ffffff 0%, #ffedd5 100%) !important;
  box-shadow: 0 0 0 5px rgba(249,115,22,.18), 0 18px 38px rgba(249,115,22,.14) !important;
}

html.pmd-waiter-dashboard-active .pmd-w5-floor-map-real .pmd-w5-table.pmd-w12-merged::after {
  background: #f97316 !important;
  border-color: #ffffff !important;
  color: #ffffff !important;
  box-shadow: 0 8px 18px rgba(249,115,22,.32) !important;
}

/* Order board cards */
html.pmd-waiter-dashboard-active .pmd-w5-board,
html.pmd-waiter-dashboard-active .pmd-w5-orders,
html.pmd-waiter-dashboard-active .pmd-w5-order-board {
  border-color: #bfdbfe !important;
  box-shadow: 0 24px 48px rgba(15,23,42,.08) !important;
}

html.pmd-waiter-dashboard-active .pmd-w5-card,
html.pmd-waiter-dashboard-active .pmd-w5-order-card,
html.pmd-waiter-dashboard-active [class*="order-card"] {
  border-color: #f59e0b !important;
  background: linear-gradient(180deg, #ffffff 0%, #fffbeb 100%) !important;
  box-shadow: 0 18px 38px rgba(245,158,11,.10) !important;
}

html.pmd-waiter-dashboard-active .pmd-w5-card:hover,
html.pmd-waiter-dashboard-active .pmd-w5-order-card:hover,
html.pmd-waiter-dashboard-active [class*="order-card"]:hover {
  box-shadow: 0 24px 52px rgba(245,158,11,.16) !important;
  transform: translateY(-1px) !important;
}

/* Pills / status badges */
html.pmd-waiter-dashboard-active .pmd-w5-pill,
html.pmd-waiter-dashboard-active .pmd-w5-badge,
html.pmd-waiter-dashboard-active [class*="badge"],
html.pmd-waiter-dashboard-active [class*="pill"] {
  border-width: 1.5px !important;
  font-weight: 1000 !important;
}

html.pmd-waiter-dashboard-active .pmd-w5-card .pmd-w5-pill,
html.pmd-waiter-dashboard-active .pmd-w5-card [class*="pill"] {
  border-color: #60a5fa !important;
  background: #dbeafe !important;
  color: #1d4ed8 !important;
}

/* Status badges stronger */
html.pmd-waiter-dashboard-active .pmd-w5-card [class*="status"],
html.pmd-waiter-dashboard-active .pmd-w5-order-card [class*="status"] {
  border-color: #f97316 !important;
  background: #ffedd5 !important;
  color: #9a3412 !important;
}

/* Tabs and buttons */
html.pmd-waiter-dashboard-active .pmd-w5-tabs button,
html.pmd-waiter-dashboard-active .pmd-w5-tab,
html.pmd-waiter-dashboard-active .pmd-w5-btn {
  border-color: #c7d2fe !important;
  background: #ffffff !important;
  color: #061126 !important;
  box-shadow: 0 8px 18px rgba(37,99,235,.055) !important;
}

html.pmd-waiter-dashboard-active .pmd-w5-tabs button.is-active,
html.pmd-waiter-dashboard-active .pmd-w5-tabs button.active,
html.pmd-waiter-dashboard-active .pmd-w5-tab.is-active,
html.pmd-waiter-dashboard-active .pmd-w5-btn.primary,
html.pmd-waiter-dashboard-active .pmd-w5-btn.active {
  background: #061126 !important;
  border-color: #061126 !important;
  color: #ffffff !important;
  box-shadow: 0 12px 26px rgba(6,17,38,.22) !important;
}

/* Toolbar circle buttons */
html.pmd-waiter-dashboard-active .pmd-w12-btn {
  border-color: #bfdbfe !important;
  background: #ffffff !important;
  color: #061126 !important;
  box-shadow: 0 12px 26px rgba(37,99,235,.10) !important;
}

html.pmd-waiter-dashboard-active .pmd-w12-btn.primary {
  background: #061126 !important;
  border-color: #061126 !important;
  color: #ffffff !important;
  box-shadow: 0 14px 30px rgba(6,17,38,.25) !important;
}

html.pmd-waiter-dashboard-active .pmd-w12-btn.warn {
  background: #ffedd5 !important;
  border-color: #f97316 !important;
  color: #9a3412 !important;
  box-shadow: 0 14px 30px rgba(249,115,22,.18) !important;
}

/* Primary order action buttons */
html.pmd-waiter-dashboard-active .pmd-w5-card button,
html.pmd-waiter-dashboard-active .pmd-w5-order-card button {
  font-weight: 1000 !important;
}

html.pmd-waiter-dashboard-active .pmd-w5-card button.primary,
html.pmd-waiter-dashboard-active .pmd-w5-order-card button.primary {
  background: #061126 !important;
  color: #ffffff !important;
  border-color: #061126 !important;
}

/* Note boxes sharper */
html.pmd-waiter-dashboard-active .pmd-w5-card [class*="note"],
html.pmd-waiter-dashboard-active .pmd-w5-order-card [class*="note"] {
  border-color: #f59e0b !important;
  background: #fffbeb !important;
  color: #78350f !important;
}

/* Notification badge more visible */
html.pmd-waiter-dashboard-active .badge,
html.pmd-waiter-dashboard-active .notification-badge {
  background: #dc2626 !important;
  color: #fff !important;
  box-shadow: 0 6px 14px rgba(220,38,38,.28) !important;
}
</style>
<!-- PMD_WAITER_DASHBOARD_V16_SHARP_COLOR_BOOST_END -->



<!-- PMD_WAITER_DASHBOARD_V17_ORDER_CARD_CLEANUP_START -->
<style id="pmd-waiter-dashboard-v17-order-card-cleanup-style">
/*
  V17 order card cleanup:
  - hide unnecessary filter tabs
  - hide selected table blue note
  - replace confusing red number pill with table number via JS
  - hide system draft notes
  - sharper POS-like order cards
*/

html.pmd-waiter-dashboard-active .pmd-w5-selected-note,
html.pmd-waiter-dashboard-active .pmd-w5-selected-note.is-show {
  display: none !important;
  visibility: hidden !important;
  height: 0 !important;
  min-height: 0 !important;
  padding: 0 !important;
  margin: 0 !important;
  border: 0 !important;
  overflow: hidden !important;
}

html.pmd-waiter-dashboard-active .pmd-v17-hidden-tab,
html.pmd-waiter-dashboard-active .pmd-v17-hidden-system-note {
  display: none !important;
  visibility: hidden !important;
  height: 0 !important;
  min-height: 0 !important;
  padding: 0 !important;
  margin: 0 !important;
  border: 0 !important;
  overflow: hidden !important;
}

/* Order board: sharper / POS-like */
html.pmd-waiter-dashboard-active .pmd-w5-board,
html.pmd-waiter-dashboard-active .pmd-w5-orders,
html.pmd-waiter-dashboard-active .pmd-w5-order-board {
  background: #ffffff !important;
  border-color: #c7d2fe !important;
  box-shadow: 0 24px 48px rgba(15,23,42,.09) !important;
}

/* Order cards */
html.pmd-waiter-dashboard-active .pmd-w5-card,
html.pmd-waiter-dashboard-active .pmd-w5-order-card {
  border: 2px solid #f59e0b !important;
  background: linear-gradient(180deg, #ffffff 0%, #fff7ed 100%) !important;
  box-shadow: 0 16px 34px rgba(245,158,11,.12) !important;
  border-radius: 18px !important;
}

html.pmd-waiter-dashboard-active .pmd-w5-card:hover,
html.pmd-waiter-dashboard-active .pmd-w5-order-card:hover {
  transform: translateY(-1px) !important;
  box-shadow: 0 24px 52px rgba(245,158,11,.18) !important;
}

/* Top-right table number badge */
html.pmd-waiter-dashboard-active .pmd-v17-card-table-top {
  border: 1.5px solid #93c5fd !important;
  background: #dbeafe !important;
  color: #1d4ed8 !important;
  font-weight: 1000 !important;
  border-radius: 999px !important;
  padding: 7px 12px !important;
  min-width: auto !important;
  white-space: nowrap !important;
  box-shadow: 0 8px 18px rgba(37,99,235,.12) !important;
}

/* No-table badge */
html.pmd-waiter-dashboard-active .pmd-v17-card-table-top.pmd-v17-no-table {
  border-color: #fecaca !important;
  background: #fee2e2 !important;
  color: #991b1b !important;
  box-shadow: 0 8px 18px rgba(220,38,38,.10) !important;
}

/* Make status still visible but less confusing */
html.pmd-waiter-dashboard-active .pmd-w5-card .pmd-w5-pill:not(.pmd-v17-card-table-top),
html.pmd-waiter-dashboard-active .pmd-w5-order-card .pmd-w5-pill:not(.pmd-v17-card-table-top) {
  font-weight: 1000 !important;
}

/* Items box sharper */
html.pmd-waiter-dashboard-active .pmd-w5-card [class*="items"],
html.pmd-waiter-dashboard-active .pmd-w5-order-card [class*="items"] {
  border-color: #bfdbfe !important;
  background: #f8fafc !important;
}

/* Bottom buttons */
html.pmd-waiter-dashboard-active .pmd-w5-card button,
html.pmd-waiter-dashboard-active .pmd-w5-order-card button {
  height: 44px !important;
  border-radius: 16px !important;
  font-weight: 1000 !important;
}

html.pmd-waiter-dashboard-active .pmd-w5-card button.primary,
html.pmd-waiter-dashboard-active .pmd-w5-order-card button.primary {
  background: #061126 !important;
  border-color: #061126 !important;
  color: #ffffff !important;
}

/* Remaining tabs sharper */
html.pmd-waiter-dashboard-active .pmd-w5-tabs button,
html.pmd-waiter-dashboard-active .pmd-w5-tab {
  border-color: #c7d2fe !important;
  font-weight: 1000 !important;
}
</style>

<script id="pmd-waiter-dashboard-v17-order-card-cleanup-script">
(function () {
  if (!/\/admin\/dashboardwaiter(?:$|[?#])/.test(location.pathname + location.search + location.hash)) return;
  if (window.PMD_WAITER_DASHBOARD_V17_ORDER_CARD_CLEANUP) return;
  window.PMD_WAITER_DASHBOARD_V17_ORDER_CARD_CLEANUP = true;

  var hiddenTabs = new Set([
    'Needs Action',
    'Payment Waiting',
    'Ready to Serve',
    'Notes / Calls',
    'Selected Table'
  ]);

  function norm(s) {
    return String(s || '').replace(/\s+/g, ' ').trim();
  }

  function isSystemNoteText(txt) {
    txt = String(txt || '');
    return /Table Draft Basket|table_draft_id|submitted_by|guest_session/i.test(txt);
  }

  function findCardTable(card) {
    var dataTable = norm(card.getAttribute('data-table') || card.dataset.table || '');
    if (dataTable && dataTable !== '-' && dataTable !== '—') {
      return /^Table/i.test(dataTable) ? dataTable : ('Table ' + dataTable);
    }

    var pills = Array.from(card.querySelectorAll('.pmd-w5-pill, [class*="pill"], [class*="badge"]'));
    for (var i = 0; i < pills.length; i++) {
      var t = norm(pills[i].textContent);
      if (/^Table\s+\d+/i.test(t)) return t;
      if (/^\d+$/.test(t) && Number(t) > 0 && Number(t) <= 999) return 'Table ' + t;
    }

    var text = norm(card.textContent);
    var m = text.match(/\bTable\s+(\d+)\b/i);
    if (m) return 'Table ' + m[1];

    return 'No table';
  }

  function cleanupTabs() {
    document.querySelectorAll('.pmd-w5-tabs button, .pmd-w5-tab, button[data-filter]').forEach(function (btn) {
      var t = norm(btn.textContent);
      if (hiddenTabs.has(t)) {
        btn.classList.add('pmd-v17-hidden-tab');
        btn.setAttribute('aria-hidden', 'true');
        btn.tabIndex = -1;
      }
    });
  }

  function cleanupSelectedNote() {
    document.querySelectorAll('.pmd-w5-selected-note').forEach(function (el) {
      el.classList.add('pmd-v17-hidden-system-note');
    });
  }

  function cleanupSystemNotes(card) {
    card.querySelectorAll('[class*="note"], .pmd-w5-note, .pmd-w5-note-box, .pmd-w5-order-note').forEach(function (note) {
      if (isSystemNoteText(note.textContent)) {
        note.classList.add('pmd-v17-hidden-system-note');
      }
    });

    /* fallback: hide small divs that only contain system draft note */
    card.querySelectorAll('div, p, section').forEach(function (el) {
      if (el === card) return;
      if (el.querySelector('button, input, select, textarea')) return;

      var txt = norm(el.textContent);
      if (!txt || txt.length > 500) return;

      if (isSystemNoteText(txt)) {
        el.classList.add('pmd-v17-hidden-system-note');
      }
    });
  }

  function replaceTopRightPill(card) {
    var tableText = findCardTable(card);

    var topRight =
      card.querySelector('.pmd-w5-pill.red') ||
      card.querySelector('.pmd-w5-pill.is-red') ||
      Array.from(card.querySelectorAll('.pmd-w5-pill, [class*="pill"], [class*="badge"]')).find(function (el) {
        var t = norm(el.textContent);
        return /^\d+$/.test(t) || /^Received$/i.test(t);
      });

    if (!topRight) return;

    topRight.textContent = tableText;
    topRight.classList.remove('red', 'is-red');
    topRight.classList.add('pmd-v17-card-table-top');

    if (tableText === 'No table') {
      topRight.classList.add('pmd-v17-no-table');
    } else {
      topRight.classList.remove('pmd-v17-no-table');
    }
  }

  function cleanupCards() {
    document.querySelectorAll('.pmd-w5-card, .pmd-w5-order-card').forEach(function (card) {
      cleanupSystemNotes(card);
      replaceTopRightPill(card);
    });
  }

  function run() {
    cleanupTabs();
    cleanupSelectedNote();
    cleanupCards();
  }

  document.addEventListener('pmd-waiter-dashboard-rendered', run);
  setTimeout(run, 100);
  setTimeout(run, 400);
  setTimeout(run, 1200);

  window.PMDWaiterOrderCardCleanup = { run: run };

  console.info('[PMD] Waiter Dashboard V17 order card cleanup active');
})();
</script>
<!-- PMD_WAITER_DASHBOARD_V17_ORDER_CARD_CLEANUP_END -->





<!-- PMD_WAITER_DASHBOARD_V19_CLEAN_CARDS_WORKING_UNMERGE_START -->
<style id="pmd-waiter-dashboard-v19-clean-cards-working-unmerge-style">
/*
  V19:
  - solid POS colors
  - order cards stay clean white, not yellow
  - one toolbar: Save / Edit / Merge / Compact
  - smart merge + working unmerge
*/

html.pmd-waiter-dashboard-active #pmd-waiter-dashboard-root {
  --pos-navy: #070d24;
  --pos-blue: #1cb7e8;
  --pos-green: #22c55e;
  --pos-orange: #ff7a00;
  --pos-yellow: #ffd23f;
  --pos-red: #ef3340;
}

/* KPI cards: solid, sharp */
html.pmd-waiter-dashboard-active .pmd-w5-kpis > * {
  background-image: none !important;
  border-width: 2px !important;
  box-shadow: 0 18px 38px rgba(7,13,36,.14) !important;
}

html.pmd-waiter-dashboard-active .pmd-w5-kpis > *:nth-child(1) {
  background: #22c55e !important;
  border-color: #15803d !important;
  color: #052e16 !important;
}

html.pmd-waiter-dashboard-active .pmd-w5-kpis > *:nth-child(2) {
  background: #ff7a00 !important;
  border-color: #c2410c !important;
  color: #2b1200 !important;
}

html.pmd-waiter-dashboard-active .pmd-w5-kpis > *:nth-child(3) {
  background: #1cb7e8 !important;
  border-color: #0077b6 !important;
  color: #061126 !important;
}

html.pmd-waiter-dashboard-active .pmd-w5-kpis > *:nth-child(4) {
  background: #ffd23f !important;
  border-color: #f59e0b !important;
  color: #2b1b00 !important;
}

html.pmd-waiter-dashboard-active .pmd-w5-kpis > * * {
  color: inherit !important;
}

/* Toolbar */
html.pmd-waiter-dashboard-active .pmd-w19-tools {
  margin-left: auto !important;
  display: flex !important;
  align-items: center !important;
  gap: 10px !important;
}

html.pmd-waiter-dashboard-active .pmd-w19-btn {
  width: 42px !important;
  height: 42px !important;
  min-width: 42px !important;
  border-radius: 999px !important;
  border: 2px solid #070d24 !important;
  background: #f8fafc !important;
  color: #070d24 !important;
  display: grid !important;
  place-items: center !important;
  padding: 0 !important;
  font-size: 16px !important;
  font-weight: 1000 !important;
  cursor: pointer !important;
  position: relative !important;
  box-shadow: 0 10px 22px rgba(7,13,36,.14) !important;
  transition: transform .16s ease, box-shadow .16s ease, background .16s ease !important;
}

html.pmd-waiter-dashboard-active .pmd-w19-btn:hover {
  transform: translateY(-1px) !important;
}

html.pmd-waiter-dashboard-active .pmd-w19-btn.primary {
  background: #070d24 !important;
  color: #fff !important;
}

html.pmd-waiter-dashboard-active .pmd-w19-btn.warn {
  background: #ff7a00 !important;
  border-color: #c2410c !important;
  color: #2b1200 !important;
}

html.pmd-waiter-dashboard-active .pmd-w19-save-hidden {
  display: none !important;
}

html.pmd-waiter-dashboard-active .pmd-w19-btn small {
  position: absolute !important;
  right: -6px !important;
  top: -6px !important;
  min-width: 20px !important;
  height: 20px !important;
  padding: 0 5px !important;
  border-radius: 999px !important;
  background: #ef3340 !important;
  color: #fff !important;
  border: 2px solid #fff !important;
  display: none !important;
  place-items: center !important;
  font-size: 10px !important;
  font-weight: 1000 !important;
}

html.pmd-waiter-dashboard-active .pmd-w19-btn small.is-show {
  display: grid !important;
}

/* Floor */
html.pmd-waiter-dashboard-active .pmd-w5-floor-map-real {
  background:
    linear-gradient(90deg, rgba(7,13,36,.10) 1px, transparent 1px),
    linear-gradient(0deg, rgba(7,13,36,.10) 1px, transparent 1px),
    #f6f8fb !important;
  border-color: #9ca3af !important;
  box-shadow: inset 0 0 0 1px rgba(7,13,36,.04), 0 16px 36px rgba(7,13,36,.12) !important;
}

/* Real color tables */
html.pmd-waiter-dashboard-active .pmd-w5-floor-map-real .pmd-w5-table {
  background: #22c55e !important;
  background-image: none !important;
  border-color: #15803d !important;
  color: #052e16 !important;
  box-shadow: 0 12px 28px rgba(21,128,61,.24) !important;
}

html.pmd-waiter-dashboard-active .pmd-w5-floor-map-real .pmd-w5-table span {
  color: #04120a !important;
}

html.pmd-waiter-dashboard-active .pmd-w5-floor-map-real .pmd-w5-table em {
  background: rgba(255,255,255,.55) !important;
  color: #052e16 !important;
}

/* Active/payment = orange */
html.pmd-waiter-dashboard-active .pmd-w5-floor-map-real .pmd-w5-table.is-payment,
html.pmd-waiter-dashboard-active .pmd-w5-floor-map-real .pmd-w5-table.is-active,
html.pmd-waiter-dashboard-active .pmd-w5-floor-map-real .pmd-w5-table.busy,
html.pmd-waiter-dashboard-active .pmd-w5-floor-map-real .pmd-w5-table.has-orders {
  background: #ff7a00 !important;
  background-image: none !important;
  border-color: #c2410c !important;
  color: #2b1200 !important;
  box-shadow: 0 0 0 6px rgba(255,122,0,.22), 0 18px 40px rgba(194,65,12,.30) !important;
}

/* Ready = blue */
html.pmd-waiter-dashboard-active .pmd-w5-floor-map-real .pmd-w5-table.is-ready {
  background: #1cb7e8 !important;
  background-image: none !important;
  border-color: #0077b6 !important;
  color: #061126 !important;
}

/* Urgent = red */
html.pmd-waiter-dashboard-active .pmd-w5-floor-map-real .pmd-w5-table.is-urgent {
  background: #ef3340 !important;
  background-image: none !important;
  border-color: #b91c1c !important;
  color: #fff !important;
}

html.pmd-waiter-dashboard-active .pmd-w5-floor-map-real .pmd-w5-table.is-urgent span {
  color: #fff !important;
}

/* Merge selected = outline only, not recolor */
html.pmd-waiter-dashboard-active .pmd-w5-floor-map-real .pmd-w5-table.pmd-w19-selected {
  outline: 4px solid #8b5cf6 !important;
  outline-offset: 4px !important;
}

/* Hide individual tables inside a merge */
html.pmd-waiter-dashboard-active .pmd-w5-floor-map-real .pmd-w19-in-merge {
  visibility: hidden !important;
  pointer-events: none !important;
}

/* Bigger merged table icon */
html.pmd-waiter-dashboard-active .pmd-w19-merged-table {
  position: absolute !important;
  transform: translate(-50%, -50%) !important;
  min-width: 132px !important;
  min-height: 86px !important;
  border-radius: 24px !important;
  border: 3px solid #070d24 !important;
  background: #22c55e !important;
  color: #04120a !important;
  display: grid !important;
  place-items: center !important;
  padding: 10px !important;
  z-index: 8 !important;
  cursor: pointer !important;
  box-shadow: 0 22px 48px rgba(7,13,36,.24) !important;
  transition: transform .18s ease, box-shadow .18s ease !important;
}

html.pmd-waiter-dashboard-active .pmd-w19-merged-table:hover {
  transform: translate(-50%, -50%) scale(1.035) !important;
}

html.pmd-waiter-dashboard-active .pmd-w19-merged-table.is-payment,
html.pmd-waiter-dashboard-active .pmd-w19-merged-table.is-active {
  background: #ff7a00 !important;
  border-color: #c2410c !important;
  color: #2b1200 !important;
}

html.pmd-waiter-dashboard-active .pmd-w19-merged-table.is-ready {
  background: #1cb7e8 !important;
  border-color: #0077b6 !important;
  color: #061126 !important;
}

html.pmd-waiter-dashboard-active .pmd-w19-merged-table.is-urgent {
  background: #ef3340 !important;
  border-color: #b91c1c !important;
  color: #fff !important;
}

html.pmd-waiter-dashboard-active .pmd-w19-merged-main {
  font-size: 26px !important;
  line-height: 1 !important;
  font-weight: 1000 !important;
}

html.pmd-waiter-dashboard-active .pmd-w19-merged-sub {
  margin-top: 6px !important;
  font-size: 11px !important;
  font-weight: 1000 !important;
  opacity: .85 !important;
}

html.pmd-waiter-dashboard-active .pmd-w19-unmerge {
  position: absolute !important;
  top: -12px !important;
  right: -12px !important;
  width: 28px !important;
  height: 28px !important;
  border-radius: 999px !important;
  border: 2px solid #fff !important;
  background: #ef3340 !important;
  color: #fff !important;
  display: grid !important;
  place-items: center !important;
  font-size: 15px !important;
  font-weight: 1000 !important;
  cursor: pointer !important;
  box-shadow: 0 8px 18px rgba(239,51,64,.34) !important;
}

/* Compact mode */
html.pmd-waiter-dashboard-active .pmd-w19-compact .pmd-w5-floor-map-real {
  min-height: 118px !important;
  height: 118px !important;
  display: flex !important;
  align-items: center !important;
  gap: 12px !important;
  padding: 16px 18px !important;
  overflow-x: auto !important;
  overflow-y: hidden !important;
}

html.pmd-waiter-dashboard-active .pmd-w19-compact .pmd-w5-floor-map-real .pmd-w5-table {
  position: relative !important;
  left: auto !important;
  top: auto !important;
  transform: none !important;
  width: 78px !important;
  height: 62px !important;
  min-width: 78px !important;
  min-height: 62px !important;
  flex: 0 0 78px !important;
}

html.pmd-waiter-dashboard-active .pmd-w19-compact .pmd-w19-merged-table {
  position: relative !important;
  left: auto !important;
  top: auto !important;
  transform: none !important;
  min-width: 112px !important;
  min-height: 68px !important;
  flex: 0 0 112px !important;
}

/* Order cards must stay clean, not yellow */
html.pmd-waiter-dashboard-active .pmd-w5-card,
html.pmd-waiter-dashboard-active .pmd-w5-order-card {
  background: #ffffff !important;
  background-image: none !important;
  border: 2px solid #ff7a00 !important;
  color: #061126 !important;
  box-shadow: 0 18px 38px rgba(7,13,36,.11) !important;
}

html.pmd-waiter-dashboard-active .pmd-w5-card:hover,
html.pmd-waiter-dashboard-active .pmd-w5-order-card:hover {
  box-shadow: 0 24px 52px rgba(7,13,36,.15) !important;
}

html.pmd-waiter-dashboard-active .pmd-w5-card [class*="items"],
html.pmd-waiter-dashboard-active .pmd-w5-order-card [class*="items"] {
  background: #f8fafc !important;
  background-image: none !important;
  border-color: #94a3b8 !important;
}

html.pmd-waiter-dashboard-active .pmd-v17-card-table-top {
  background: #1cb7e8 !important;
  background-image: none !important;
  border-color: #0077b6 !important;
  color: #061126 !important;
}

html.pmd-waiter-dashboard-active .pmd-w5-tabs button,
html.pmd-waiter-dashboard-active .pmd-w5-tab,
html.pmd-waiter-dashboard-active .pmd-w5-btn {
  background: #dbeafe !important;
  background-image: none !important;
  border-color: #0077b6 !important;
  color: #061126 !important;
}

html.pmd-waiter-dashboard-active .pmd-w5-tabs button.is-active,
html.pmd-waiter-dashboard-active .pmd-w5-tabs button.active,
html.pmd-waiter-dashboard-active .pmd-w5-tab.is-active,
html.pmd-waiter-dashboard-active .pmd-w5-btn.primary,
html.pmd-waiter-dashboard-active .pmd-w5-btn.active {
  background: #070d24 !important;
  border-color: #070d24 !important;
  color: #ffffff !important;
}
</style>

<script id="pmd-waiter-dashboard-v19-clean-cards-working-unmerge-script">
(function () {
  if (!/\/admin\/dashboardwaiter(?:$|[?#])/.test(location.pathname + location.search + location.hash)) return;
  if (window.PMD_WAITER_DASHBOARD_V19_CLEAN_CARDS_UNMERGE) return;
  window.PMD_WAITER_DASHBOARD_V19_CLEAN_CARDS_UNMERGE = true;

  var SAVE_LAYOUT_ENDPOINT = '/admin/pmd-waiter-dashboard-v10-save-layout';
  var MERGE_ENDPOINT = '/admin/pmd-waiter-dashboard-v10-merge-tables';
  var MERGES_ENDPOINT = '/admin/pmd-waiter-dashboard-v10-table-merges';
  var UNMERGE_ENDPOINT = '/admin/pmd-waiter-dashboard-v19-unmerge-tables';

  var state = {
    edit: false,
    merge: false,
    compact: localStorage.getItem('pmd_waiter_floor_compact') === '1',
    selected: new Set(),
    merges: []
  };

  function csrf() {
    var m = document.querySelector('meta[name="csrf-token"]');
    if (m && m.content) return m.content;
    var i = document.querySelector('input[name="_token"]');
    if (i && i.value) return i.value;
    return '';
  }

  function root() { return document.querySelector('#pmd-waiter-dashboard-root'); }
  function map() { return document.querySelector('.pmd-w5-floor-map-real'); }

  function tables() {
    return Array.from(document.querySelectorAll('.pmd-w5-floor-map-real .pmd-w5-table[data-table]'));
  }

  function tableByNo(no) {
    return tables().find(function (el) {
      return String(el.dataset.table) === String(no);
    });
  }

  function center(el) {
    var m = map();
    if (!m || !el) return null;

    var mr = m.getBoundingClientRect();
    var r = el.getBoundingClientRect();

    return {
      x: r.left + r.width / 2 - mr.left,
      y: r.top + r.height / 2 - mr.top,
      w: r.width,
      h: r.height
    };
  }

  function distance(a, b) {
    var dx = a.x - b.x;
    var dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function areClose(aNo, bNo) {
    var a = center(tableByNo(aNo));
    var b = center(tableByNo(bNo));
    if (!a || !b) return false;

    var d = distance(a, b);
    var maxGap = Math.max(170, Math.min(260, (a.w + b.w) * 1.65));

    return d <= maxGap;
  }

  function isInMerge(no) {
    return state.merges.some(function (m) {
      return (m.table_numbers || []).map(String).indexOf(String(no)) !== -1;
    });
  }

  function hasPendingSave() {
    return state.edit || (state.merge && state.selected.size >= 2);
  }

  function installTools() {
    var head = document.querySelector('.pmd-w5-floor .pmd-w5-head');
    if (!head) return;

    head.querySelectorAll('.pmd-w10-lite-tools,.pmd-w10-floor-tools,.pmd-w11-tools,.pmd-w12-tools,.pmd-w19-tools').forEach(function (x) {
      x.remove();
    });

    var tools = document.createElement('div');
    tools.className = 'pmd-w19-tools';
    tools.innerHTML =
      '<button class="pmd-w19-btn primary pmd-w19-save-hidden" data-w19-save title="Save">✓</button>' +
      '<button class="pmd-w19-btn" data-w19-edit title="Edit layout">✎</button>' +
      '<button class="pmd-w19-btn" data-w19-merge title="Merge tables">↔<small></small></button>' +
      '<button class="pmd-w19-btn" data-w19-compact title="Compact / expand floor">▤</button>';

    head.appendChild(tools);
    sync();
  }

  function sync() {
    var r = root();
    if (!r) return;

    r.classList.toggle('pmd-w19-editing', state.edit);
    r.classList.toggle('pmd-w19-merging', state.merge);
    r.classList.toggle('pmd-w19-compact', state.compact);

    tables().forEach(function (el) {
      el.classList.toggle('pmd-w19-selected', state.selected.has(String(el.dataset.table)));
    });

    var save = document.querySelector('[data-w19-save]');
    var edit = document.querySelector('[data-w19-edit]');
    var merge = document.querySelector('[data-w19-merge]');
    var compact = document.querySelector('[data-w19-compact]');
    var badge = merge && merge.querySelector('small');

    if (save) save.classList.toggle('pmd-w19-save-hidden', !hasPendingSave());
    if (edit) edit.classList.toggle('primary', state.edit);
    if (merge) merge.classList.toggle('warn', state.merge);
    if (compact) compact.classList.toggle('primary', state.compact);

    if (badge) {
      badge.textContent = state.selected.size;
      badge.classList.toggle('is-show', state.selected.size > 0);
    }

    renderMergedIcons();
  }

  function validateMergeSelection(nums) {
    nums = nums.map(String);

    if (nums.length < 2) return { ok: false, error: 'Select at least 2 tables.' };

    for (var i = 0; i < nums.length; i++) {
      if (isInMerge(nums[i])) {
        return { ok: false, error: 'Table ' + nums[i] + ' is already merged. Unmerge it first.' };
      }
    }

    var visited = new Set([nums[0]]);
    var changed = true;

    while (changed) {
      changed = false;

      nums.forEach(function (a) {
        if (!visited.has(a)) return;

        nums.forEach(function (b) {
          if (visited.has(b)) return;
          if (areClose(a, b)) {
            visited.add(b);
            changed = true;
          }
        });
      });
    }

    if (visited.size !== nums.length) {
      return { ok: false, error: 'Only close tables can be merged.' };
    }

    return { ok: true };
  }

  function strongestClass(els) {
    var cls = '';

    els.forEach(function (el) {
      if (!el) return;

      if (el.classList.contains('is-urgent')) cls = 'is-urgent';
      else if (cls !== 'is-urgent' && el.classList.contains('is-ready')) cls = 'is-ready';
      else if (!cls && (
        el.classList.contains('is-payment') ||
        el.classList.contains('is-active') ||
        el.classList.contains('busy') ||
        el.classList.contains('has-orders')
      )) cls = 'is-payment';
    });

    return cls;
  }

  function removeMergedIcons() {
    document.querySelectorAll('.pmd-w19-merged-table').forEach(function (x) {
      x.remove();
    });

    tables().forEach(function (el) {
      el.classList.remove('pmd-w19-in-merge');
    });
  }

  function renderMergedIcons() {
    var m = map();
    if (!m) return;

    removeMergedIcons();

    state.merges.forEach(function (merge) {
      var nums = (merge.table_numbers || []).map(String);
      var els = nums.map(tableByNo).filter(Boolean);

      if (els.length < 2) return;

      var points = els.map(center).filter(Boolean);
      if (!points.length) return;

      var avgX = points.reduce(function (s, p) { return s + p.x; }, 0) / points.length;
      var avgY = points.reduce(function (s, p) { return s + p.y; }, 0) / points.length;

      var mr = m.getBoundingClientRect();
      var leftPct = (avgX / mr.width) * 100;
      var topPct = (avgY / mr.height) * 100;

      els.forEach(function (el) {
        el.classList.add('pmd-w19-in-merge');
      });

      var icon = document.createElement('button');
      icon.type = 'button';
      icon.className = 'pmd-w19-merged-table ' + strongestClass(els);
      icon.dataset.mergeKey = merge.merge_key || '';
      icon.dataset.mergeId = merge.id || merge.merge_id || '';
      icon.dataset.tables = nums.join(',');

      icon.style.left = leftPct.toFixed(2) + '%';
      icon.style.top = topPct.toFixed(2) + '%';

      icon.innerHTML =
        '<span class="pmd-w19-unmerge" title="Unmerge">×</span>' +
        '<div>' +
          '<div class="pmd-w19-merged-main">' + nums.join('+') + '</div>' +
          '<div class="pmd-w19-merged-sub">Merged table</div>' +
        '</div>';

      m.appendChild(icon);
    });
  }

  async function loadMerges() {
    try {
      var r = await fetch(MERGES_ENDPOINT + '?ts=' + Date.now(), {
        credentials: 'same-origin',
        headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' }
      });

      var j = await r.json();

      if (r.ok && j && j.ok && Array.isArray(j.merges)) {
        state.merges = j.merges;
      }
    } catch (e) {}

    renderMergedIcons();
  }

  async function saveLayout() {
    var payload = tables().map(function (el) {
      return {
        table_no: el.dataset.table,
        floor_x: parseFloat(String(el.style.left || '').replace('%', '')) || 10,
        floor_y: parseFloat(String(el.style.top || '').replace('%', '')) || 10,
        floor_width: Math.max(80, Math.round(el.offsetWidth || 96)),
        floor_height: Math.max(56, Math.round(el.offsetHeight || 68))
      };
    });

    try {
      var r = await fetch(SAVE_LAYOUT_ENDPOINT, {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'X-CSRF-TOKEN': csrf()
        },
        body: JSON.stringify({ tables: payload })
      });

      var j = await r.json();

      if (!r.ok || !j || !j.ok) {
        alert('Layout save failed: ' + ((j && j.error) || ('HTTP ' + r.status)));
        return;
      }

      state.edit = false;
      sync();
      alert('Floor layout saved.');
    } catch (e) {
      alert('Layout save failed: ' + e.message);
    }
  }

  async function saveMerge() {
    var nums = Array.from(state.selected);
    var check = validateMergeSelection(nums);

    if (!check.ok) {
      alert(check.error);
      return;
    }

    try {
      var r = await fetch(MERGE_ENDPOINT, {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'X-CSRF-TOKEN': csrf()
        },
        body: JSON.stringify({ table_numbers: nums })
      });

      var j = await r.json();

      if (!r.ok || !j || !j.ok) {
        alert('Merge failed: ' + ((j && j.error) || ('HTTP ' + r.status)));
        return;
      }

      state.merge = false;
      state.selected.clear();

      await loadMerges();
      sync();
    } catch (e) {
      alert('Merge failed: ' + e.message);
    }
  }

  async function unmerge(icon) {
    if (!icon) return;

    var mergeKey = icon.dataset.mergeKey || '';
    var id = icon.dataset.mergeId || '';
    var nums = (icon.dataset.tables || '').split(',').map(function (x) { return x.trim(); }).filter(Boolean);

    try {
      var r = await fetch(UNMERGE_ENDPOINT, {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'X-CSRF-TOKEN': csrf()
        },
        body: JSON.stringify({
          merge_key: mergeKey,
          id: id,
          table_numbers: nums
        })
      });

      var j = await r.json();

      if (!r.ok || !j || !j.ok) {
        alert('Unmerge failed: ' + ((j && j.error) || ('HTTP ' + r.status)));
        return;
      }

      state.merges = state.merges.filter(function (m) {
        var mKey = String(m.merge_key || '');
        var mId = String(m.id || m.merge_id || '');
        var mNums = (m.table_numbers || []).map(String).sort().join(',');
        var iNums = nums.map(String).sort().join(',');

        if (mergeKey && mKey === mergeKey) return false;
        if (id && mId === String(id)) return false;
        if (iNums && mNums === iNums) return false;

        return true;
      });

      renderMergedIcons();
      await loadMerges();
      sync();
    } catch (e) {
      alert('Unmerge failed: ' + e.message);
    }
  }

  function save() {
    if (state.edit) {
      saveLayout();
      return;
    }

    if (state.merge && state.selected.size >= 2) {
      saveMerge();
      return;
    }
  }

  function toggleCompact() {
    state.compact = !state.compact;
    state.edit = false;
    localStorage.setItem('pmd_waiter_floor_compact', state.compact ? '1' : '0');
    sync();
  }

  document.addEventListener('pmd-waiter-dashboard-rendered', function () {
    installTools();
    loadMerges();
  });

  document.addEventListener('click', function (e) {
    var unmergeBtn = e.target.closest('.pmd-w19-unmerge');
    if (unmergeBtn) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      unmerge(unmergeBtn.closest('.pmd-w19-merged-table'));
      return;
    }

    var saveBtn = e.target.closest('[data-w19-save]');
    if (saveBtn) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      save();
      return;
    }

    var edit = e.target.closest('[data-w19-edit]');
    if (edit) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      state.edit = !state.edit;
      state.merge = false;
      state.selected.clear();
      sync();
      return;
    }

    var merge = e.target.closest('[data-w19-merge]');
    if (merge) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      state.merge = !state.merge;
      state.edit = false;
      state.selected.clear();
      sync();
      return;
    }

    var compact = e.target.closest('[data-w19-compact]');
    if (compact) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      toggleCompact();
      return;
    }

    var table = ((e && e.target && e.target.nodeType === 1) ? e.target.closest('.pmd-w5-floor-map-real .pmd-w5-table[data-table]') : null);
    if (!table) return;

    var no = String(table.dataset.table);

    if (state.merge) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();

      if (isInMerge(no)) {
        alert('Table ' + no + ' is already merged. Unmerge it first.');
        return;
      }

      var selected = Array.from(state.selected);

      if (!state.selected.has(no) && selected.length > 0) {
        var canConnect = selected.some(function (existing) {
          return areClose(existing, no);
        });

        if (!canConnect) {
          alert('Only close tables can be merged.');
          return;
        }
      }

      if (state.selected.has(no)) state.selected.delete(no);
      else state.selected.add(no);

      sync();
      return;
    }

    if (state.edit && isInMerge(no)) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      alert('This table is merged. Unmerge it first to edit layout.');
      return;
    }
  }, true);

  document.addEventListener('pointerdown', function (e) {
    if (state.compact) return;

    var table = ((e && e.target && e.target.nodeType === 1) ? e.target.closest('.pmd-w5-floor-map-real .pmd-w5-table[data-table]') : null);
    var m = map();

    if (!state.edit || !table || !m) return;

    var no = String(table.dataset.table);

    if (isInMerge(no)) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      alert('This table is merged. Unmerge it first to edit layout.');
      return;
    }

    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    var rect = m.getBoundingClientRect();

    function move(ev) {
      var x = ((ev.clientX - rect.left) / rect.width) * 100;
      var y = ((ev.clientY - rect.top) / rect.height) * 100;

      x = Math.max(2, Math.min(98, x));
      y = Math.max(2, Math.min(98, y));

      table.style.left = x.toFixed(2) + '%';
      table.style.top = y.toFixed(2) + '%';
    }

    function up() {
      document.removeEventListener('pointermove', move, true);
      document.removeEventListener('pointerup', up, true);
    }

    document.addEventListener('pointermove', move, true);
    document.addEventListener('pointerup', up, true);
  }, true);

  installTools();
  loadMerges();

  setTimeout(installTools, 300);
  setTimeout(loadMerges, 500);
  setTimeout(installTools, 1200);
  setTimeout(loadMerges, 1500);

  window.PMDWaiterFloorToolbar = {
    state: state,
    save: save,
    saveLayout: saveLayout,
    saveMerge: saveMerge,
    loadMerges: loadMerges,
    unmerge: unmerge,
    validateMergeSelection: validateMergeSelection
  };

  console.info('[PMD] Waiter Dashboard V19 clean cards + working unmerge active');
})();
</script>
<!-- PMD_WAITER_DASHBOARD_V19_CLEAN_CARDS_WORKING_UNMERGE_END -->



<!-- PMD_WAITER_DASHBOARD_V20_UNMERGE_HOTFIX_START -->
<style id="pmd-waiter-dashboard-v20-unmerge-hotfix-style">
/* Keep order cards clean white */
html.pmd-waiter-dashboard-active .pmd-w5-card,
html.pmd-waiter-dashboard-active .pmd-w5-order-card {
  background: #ffffff !important;
  background-image: none !important;
  border-color: #ff7a00 !important;
}

/* Make X always clickable above merged icon */
html.pmd-waiter-dashboard-active .pmd-w19-unmerge,
html.pmd-waiter-dashboard-active .pmd-v18-unmerge {
  pointer-events: auto !important;
  z-index: 9999 !important;
  cursor: pointer !important;
}

/* Remove yellow from internal item boxes too */
html.pmd-waiter-dashboard-active .pmd-w5-card [class*="items"],
html.pmd-waiter-dashboard-active .pmd-w5-order-card [class*="items"] {
  background: #f8fafc !important;
  background-image: none !important;
}
</style>

<script id="pmd-waiter-dashboard-v20-unmerge-hotfix-script">
(function () {
  if (!/\/admin\/dashboardwaiter(?:$|[?#])/.test(location.pathname + location.search + location.hash)) return;
  if (window.PMD_WAITER_DASHBOARD_V20_UNMERGE_HOTFIX) return;
  window.PMD_WAITER_DASHBOARD_V20_UNMERGE_HOTFIX = true;

  var LIST_ENDPOINT = '/admin/pmd-waiter-dashboard-v20-table-merges';
  var MERGE_ENDPOINT = '/admin/pmd-waiter-dashboard-v20-merge-tables';
  var UNMERGE_ENDPOINT = '/admin/pmd-waiter-dashboard-v20-unmerge-tables';

  function csrf() {
    var m = document.querySelector('meta[name="csrf-token"]');
    if (m && m.content) return m.content;
    var i = document.querySelector('input[name="_token"]');
    if (i && i.value) return i.value;
    return '';
  }

  function selectedTables() {
    if (window.PMDWaiterFloorToolbar && PMDWaiterFloorToolbar.state && PMDWaiterFloorToolbar.state.selected) {
      return Array.from(PMDWaiterFloorToolbar.state.selected).map(String);
    }

    return Array.from(document.querySelectorAll('.pmd-w19-selected, .pmd-v18-selected, .pmd-w12-selected'))
      .map(function (x) { return String(x.dataset.table || '').trim(); })
      .filter(Boolean);
  }

  async function loadMergesIntoV19() {
    try {
      var r = await fetch(LIST_ENDPOINT + '?ts=' + Date.now(), {
        credentials: 'same-origin',
        headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' }
      });

      var j = await r.json();

      if (r.ok && j && j.ok && window.PMDWaiterFloorToolbar && PMDWaiterFloorToolbar.state) {
        PMDWaiterFloorToolbar.state.merges = j.merges || [];
      }

      if (window.PMDWaiterFloorToolbar && PMDWaiterFloorToolbar.loadMerges) {
        // V19 will redraw from DB after our endpoint fixed DB rows.
        PMDWaiterFloorToolbar.loadMerges();
      }

      return j;
    } catch (e) {
      return null;
    }
  }

  async function unmergeIcon(icon) {
    if (!icon) return;

    var mergeKey = icon.dataset.mergeKey || '';
    var id = icon.dataset.mergeId || '';
    var nums = String(icon.dataset.tables || '')
      .split(',')
      .map(function (x) { return x.trim(); })
      .filter(Boolean);

    icon.style.opacity = '.35';
    icon.style.pointerEvents = 'none';

    try {
      var r = await fetch(UNMERGE_ENDPOINT, {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'X-CSRF-TOKEN': csrf()
        },
        body: JSON.stringify({
          id: id,
          merge_key: mergeKey,
          table_numbers: nums
        })
      });

      var j = await r.json();

      if (!r.ok || !j || !j.ok) {
        icon.style.opacity = '';
        icon.style.pointerEvents = '';
        alert('Unmerge failed: ' + ((j && j.error) || ('HTTP ' + r.status)));
        return;
      }

      icon.remove();

      document.querySelectorAll('.pmd-w19-in-merge, .pmd-v18-in-merge').forEach(function (x) {
        x.classList.remove('pmd-w19-in-merge', 'pmd-v18-in-merge');
      });

      await loadMergesIntoV19();

      setTimeout(function () {
        if (window.PMDWaiterDashboard && PMDWaiterDashboard.refresh) {
          PMDWaiterDashboard.refresh();
        }
      }, 150);

    } catch (e) {
      icon.style.opacity = '';
      icon.style.pointerEvents = '';
      alert('Unmerge failed: ' + e.message);
    }
  }

  async function mergeSelected() {
    var nums = selectedTables();

    if (nums.length < 2) return;

    try {
      var r = await fetch(MERGE_ENDPOINT, {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'X-CSRF-TOKEN': csrf()
        },
        body: JSON.stringify({ table_numbers: nums })
      });

      var j = await r.json();

      if (!r.ok || !j || !j.ok) {
        alert('Merge failed: ' + ((j && j.error) || ('HTTP ' + r.status)));
        return;
      }

      if (window.PMDWaiterFloorToolbar && PMDWaiterFloorToolbar.state) {
        PMDWaiterFloorToolbar.state.selected.clear();
        PMDWaiterFloorToolbar.state.merge = false;
      }

      await loadMergesIntoV19();

      setTimeout(function () {
        if (window.PMDWaiterDashboard && PMDWaiterDashboard.refresh) {
          PMDWaiterDashboard.refresh();
        }
      }, 150);

    } catch (e) {
      alert('Merge failed: ' + e.message);
    }
  }

  // pointerdown happens before the old V19 click handler, so this forces X to work.
  document.addEventListener('pointerdown', function (e) {
    var x = e.target.closest('.pmd-w19-unmerge, .pmd-v18-unmerge');
    if (!x) return;

    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    var icon = x.closest('.pmd-w19-merged-table, .pmd-v18-merged-table');
    unmergeIcon(icon);
  }, true);

  // Intercept merge save only when merge mode is active.
  document.addEventListener('pointerdown', function (e) {
    var save = e.target.closest('[data-w19-save]');
    if (!save) return;

    var st = window.PMDWaiterFloorToolbar && PMDWaiterFloorToolbar.state;
    if (!st || !st.merge) return;

    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    mergeSelected();
  }, true);

  window.PMDWaiterMergeV20 = {
    list: loadMergesIntoV19,
    unmergeIcon: unmergeIcon,
    mergeSelected: mergeSelected
  };

  setTimeout(loadMergesIntoV19, 500);

  console.info('[PMD] Waiter Dashboard V20 unmerge hotfix active');
})();
</script>
<!-- PMD_WAITER_DASHBOARD_V20_UNMERGE_HOTFIX_END -->



<!-- PMD_WAITER_DASHBOARD_V21_STABLE_FLOOR_ORDER_CLEANUP_START -->
<style id="pmd-waiter-dashboard-v21-stable-floor-order-cleanup-style">
/*
  V21 stability polish:
  - clean white order cards
  - remove duplicate table badges
  - hide fake Note/change
  - compact merged icons better
  - edit mode: tables are drag-only, no normal click action
*/

html.pmd-waiter-dashboard-active .pmd-w5-card,
html.pmd-waiter-dashboard-active .pmd-w5-order-card {
  background: #ffffff !important;
  background-image: none !important;
  border: 2px solid #ff7a00 !important;
  color: #061126 !important;
  box-shadow: 0 18px 38px rgba(7,13,36,.11) !important;
}

html.pmd-waiter-dashboard-active .pmd-w5-card [class*="items"],
html.pmd-waiter-dashboard-active .pmd-w5-order-card [class*="items"] {
  background: #f8fafc !important;
  background-image: none !important;
  border-color: #94a3b8 !important;
}

/* Hide duplicated/old left table pills */
html.pmd-waiter-dashboard-active .pmd-v21-hide {
  display: none !important;
  visibility: hidden !important;
  width: 0 !important;
  height: 0 !important;
  min-width: 0 !important;
  min-height: 0 !important;
  margin: 0 !important;
  padding: 0 !important;
  border: 0 !important;
  overflow: hidden !important;
}

/* Real top table badge */
html.pmd-waiter-dashboard-active .pmd-v21-table-badge {
  background: #1cb7e8 !important;
  background-image: none !important;
  border: 2px solid #0077b6 !important;
  color: #061126 !important;
  font-weight: 1000 !important;
  border-radius: 999px !important;
  padding: 7px 12px !important;
  box-shadow: 0 8px 18px rgba(0,119,182,.18) !important;
}

html.pmd-waiter-dashboard-active .pmd-v21-table-badge.pmd-v21-no-table {
  background: #fee2e2 !important;
  border-color: #ef3340 !important;
  color: #7f1d1d !important;
}

/* In edit mode, cursor says move, not click */
html.pmd-waiter-dashboard-active .pmd-w19-editing .pmd-w5-floor-map-real .pmd-w5-table,
html.pmd-waiter-dashboard-active .pmd-v21-editing .pmd-w5-floor-map-real .pmd-w5-table {
  cursor: grab !important;
}

html.pmd-waiter-dashboard-active .pmd-w19-editing .pmd-w5-floor-map-real .pmd-w5-table:active,
html.pmd-waiter-dashboard-active .pmd-v21-editing .pmd-w5-floor-map-real .pmd-w5-table:active {
  cursor: grabbing !important;
}

/* Compact mode: keep merged icons inline and smaller */
html.pmd-waiter-dashboard-active .pmd-w19-compact .pmd-w19-merged-table,
html.pmd-waiter-dashboard-active .pmd-w19-compact .pmd-v18-merged-table {
  position: relative !important;
  left: auto !important;
  top: auto !important;
  transform: none !important;
  min-width: 112px !important;
  width: 112px !important;
  min-height: 68px !important;
  height: 68px !important;
  flex: 0 0 112px !important;
  margin: 0 !important;
}

html.pmd-waiter-dashboard-active .pmd-w19-compact .pmd-w19-merged-main,
html.pmd-waiter-dashboard-active .pmd-w19-compact .pmd-v18-merged-main {
  font-size: 18px !important;
}

/* X must always be clickable */
html.pmd-waiter-dashboard-active .pmd-w19-unmerge,
html.pmd-waiter-dashboard-active .pmd-v18-unmerge {
  pointer-events: auto !important;
  z-index: 99999 !important;
  cursor: pointer !important;
}
</style>

<script id="pmd-waiter-dashboard-v21-stable-floor-order-cleanup-script">
(function () {
  if (!/\/admin\/dashboardwaiter(?:$|[?#])/.test(location.pathname + location.search + location.hash)) return;
  if (window.PMD_WAITER_DASHBOARD_V21_STABLE_CLEANUP) return;
  window.PMD_WAITER_DASHBOARD_V21_STABLE_CLEANUP = true;

  var CLEAN_ENDPOINT = '/admin/pmd-waiter-dashboard-v21-clean-merge-overlaps';
  var LIST_ENDPOINT = '/admin/pmd-waiter-dashboard-v20-table-merges';

  function csrf() {
    var m = document.querySelector('meta[name="csrf-token"]');
    if (m && m.content) return m.content;
    var i = document.querySelector('input[name="_token"]');
    if (i && i.value) return i.value;
    return '';
  }

  function norm(s) {
    return String(s || '').replace(/\s+/g, ' ').trim();
  }

  function toolbarState() {
    return window.PMDWaiterFloorToolbar && PMDWaiterFloorToolbar.state
      ? PMDWaiterFloorToolbar.state
      : null;
  }

  function isEditMode() {
    var st = toolbarState();
    return !!(st && st.edit);
  }

  function isMergeMode() {
    var st = toolbarState();
    return !!(st && st.merge);
  }

  function isSystemNoteText(txt) {
    return /Table Draft Basket|table_draft_id|submitted_by|guest_session/i.test(String(txt || ''));
  }

  function findCardTable(card) {
    var text = norm(card.textContent);

    var direct = card.querySelector('.pmd-v17-card-table-top, .pmd-v21-table-badge');
    if (direct) {
      var dt = norm(direct.textContent);
      if (/^Table\s+\d+$/i.test(dt)) return dt;
    }

    var pills = Array.from(card.querySelectorAll('.pmd-w5-pill, [class*="pill"], [class*="badge"]'));
    for (var i = 0; i < pills.length; i++) {
      var t = norm(pills[i].textContent);
      if (/^Table\s+\d+$/i.test(t)) return t;
    }

    var m = text.match(/\bTable\s+(\d+)\b/i);
    if (m) return 'Table ' + m[1];

    return 'No table';
  }

  function cleanupOrderCards() {
    document.querySelectorAll('.pmd-w5-card, .pmd-w5-order-card').forEach(function (card) {
      var tableText = findCardTable(card);
      var pills = Array.from(card.querySelectorAll('.pmd-w5-pill, [class*="pill"], [class*="badge"]'));

      var topBadge =
        card.querySelector('.pmd-v17-card-table-top') ||
        card.querySelector('.pmd-v21-table-badge') ||
        pills.find(function (p) {
          var t = norm(p.textContent);
          return /^Table\s+\d+$/i.test(t) || /^No table$/i.test(t);
        });

      if (topBadge) {
        topBadge.textContent = tableText;
        topBadge.classList.add('pmd-v21-table-badge');

        if (tableText === 'No table') {
          topBadge.classList.add('pmd-v21-no-table');
        } else {
          topBadge.classList.remove('pmd-v21-no-table');
        }
      }

      // Hide duplicate Table — / Table - / left bad table pills.
      pills.forEach(function (p) {
        var t = norm(p.textContent);

        if (/^Table\s*[—-]$/i.test(t) || /^Table\s*$/i.test(t)) {
          p.classList.add('pmd-v21-hide');
          return;
        }

        if (topBadge && p !== topBadge && /^Table\s+\d+$/i.test(t)) {
          p.classList.add('pmd-v21-hide');
        }
      });

      // Hide fake note/change badge if no real customer note exists.
      var hasRealNote = false;

      card.querySelectorAll('[class*="note"], .pmd-w5-note, .pmd-w5-note-box, .pmd-w5-order-note').forEach(function (n) {
        var t = norm(n.textContent);

        if (!t) return;

        if (isSystemNoteText(t)) {
          n.classList.add('pmd-v21-hide');
          return;
        }

        if (!/^Note\s*\/\s*change$/i.test(t) && !/^Note$/i.test(t)) {
          hasRealNote = true;
        }
      });

      card.querySelectorAll('.pmd-w5-pill, [class*="pill"], [class*="badge"], button').forEach(function (el) {
        var t = norm(el.textContent);

        if (/^Note\s*\/\s*change$/i.test(t) && !hasRealNote) {
          el.classList.add('pmd-v21-hide');
        }
      });
    });
  }

  async function cleanupMergeOverlaps() {
    try {
      var r = await fetch(CLEAN_ENDPOINT, {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'X-CSRF-TOKEN': csrf()
        },
        body: JSON.stringify({})
      });

      var j = await r.json();

      if (j && j.ok) {
        console.info('[PMD] V21 merge cleanup', j);

        if (window.PMDWaiterMergeV20 && PMDWaiterMergeV20.list) {
          await PMDWaiterMergeV20.list();
        } else if (window.PMDWaiterFloorToolbar && PMDWaiterFloorToolbar.loadMerges) {
          await PMDWaiterFloorToolbar.loadMerges();
        }

        setTimeout(function () {
          if (window.PMDWaiterDashboard && PMDWaiterDashboard.refresh) {
            PMDWaiterDashboard.refresh();
          }
        }, 200);
      }

      return j;
    } catch (e) {
      console.warn('[PMD] V21 merge cleanup failed', e);
      return null;
    }
  }

  // In edit layout mode, block normal table click/select.
  document.addEventListener('click', function (e) {
    var table = ((e && e.target && e.target.nodeType === 1) ? e.target.closest('.pmd-w5-floor-map-real .pmd-w5-table[data-table]') : null);
    if (!table) return;

    if (isEditMode()) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      return false;
    }
  }, true);

  // Also block pointerup in edit mode so old table click logic does not fire after drag.
  document.addEventListener('pointerup', function (e) {
    var table = ((e && e.target && e.target.nodeType === 1) ? e.target.closest('.pmd-w5-floor-map-real .pmd-w5-table[data-table]') : null);
    if (!table) return;

    if (isEditMode()) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      return false;
    }
  }, true);

  // If merge mode is on, prevent old normal table selection.
  document.addEventListener('click', function (e) {
    var table = ((e && e.target && e.target.nodeType === 1) ? e.target.closest('.pmd-w5-floor-map-real .pmd-w5-table[data-table]') : null);
    if (!table) return;

    if (isMergeMode()) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      return false;
    }
  }, true);

  document.addEventListener('pmd-waiter-dashboard-rendered', function () {
    setTimeout(cleanupOrderCards, 60);
    setTimeout(cleanupOrderCards, 300);
  });

  setTimeout(cleanupOrderCards, 200);
  setTimeout(cleanupOrderCards, 700);
  setTimeout(cleanupOrderCards, 1500);

  // Run cleanup once on load to remove old duplicate/overlap test merges.
  setTimeout(cleanupMergeOverlaps, 800);

  window.PMDWaiterV21Cleanup = {
    cards: cleanupOrderCards,
    merges: cleanupMergeOverlaps
  };

  console.info('[PMD] Waiter Dashboard V21 stable floor/order cleanup active');
})();
</script>
<!-- PMD_WAITER_DASHBOARD_V21_STABLE_FLOOR_ORDER_CLEANUP_END -->




</head>
<script>
    // SMART FIX: Force dropdown alignment WITHOUT breaking Bootstrap animations
    (function() {
        function forceDropdownAlignment() {
            // Fix ALL navbar dropdowns
            const dropdowns = document.querySelectorAll('.navbar-top .dropdown-menu, #notification-panel');
            dropdowns.forEach(dropdown => {
                // ONLY fix if dropdown is visible (has 'show' class)
                if (dropdown.classList.contains('show')) {
                    // Remove Popper.js LEFT positioning only
                    dropdown.style.removeProperty('left');
                    dropdown.style.removeProperty('inset');

                    // Force right alignment
                    dropdown.style.setProperty('right', '0px', 'important');
                    dropdown.style.setProperty('left', 'auto', 'important');

                    // DON'T touch transform (needed for animations)
                    // DON'T touch display (needed for show/hide)
                }
            });
        }

        // Fix on page load
        document.addEventListener('DOMContentLoaded', forceDropdownAlignment);

        // Fix when dropdown is shown (AFTER Bootstrap shows it)
        document.addEventListener('shown.bs.dropdown', function(e) {
            setTimeout(forceDropdownAlignment, 10);
        });

        // Fix when dropdown is being shown (DURING Bootstrap animation)
        document.addEventListener('show.bs.dropdown', function(e) {
            setTimeout(forceDropdownAlignment, 1);
            setTimeout(forceDropdownAlignment, 50);
        });
    })();
</script>
<script>
    document.addEventListener("DOMContentLoaded", function () {
        let imgElement = document.querySelector("#mediafinder-formdashboardlogo-dashboard-logo img");
        let logoElement = document.querySelector("a.logo img");
        if (imgElement && logoElement) {
            let imagePath = imgElement.getAttribute("src");
            logoElement.setAttribute("src", imagePath);
        }
    });
            </script>
<body class="page pmd-admin-theme-v1 {{ $this->bodyClass }}">
@if(AdminAuth::isLogged())
    {!! $this->makePartial('top_nav') !!}
    {!! AdminMenu::render('side_nav') !!}
@endif

<div class="page-wrapper">
    <div class="page-content">
        {!! Template::getBlock('body') !!}
    </div>
</div>

<div id="notification">
    {!! $this->makePartial('flash') !!}
</div>
@if(AdminAuth::isLogged())
    {!! $this->makePartial('set_status_form') !!}
@endif
{!! $this->makePartial('confirm_modal') !!}
{!! Assets::getJsVars() !!}
{{-- Use asset combiner to ensure all widget JS files are included --}}
@php
    $pmdIsNativeMediaContext = request()->is('admin/settings*') || request()->is('admin/media_manager*');
@endphp

<!-- PMD_KDS_SERVER_FAST_V82_EARLY_MEDIA_GUARD_START -->
@unless(!empty($__pmdIsKdsDashboardV82))
<!-- PMD EARLY SORTABLE DROPZONE START -->
    <script src="{{ asset('app/admin/assets/vendor/pmd-mediafix/Sortable.min.js') }}?v={{ time() }}"></script>
    <script src="{{ asset('app/admin/assets/vendor/pmd-mediafix/dropzone.min.js') }}?v={{ time() }}"></script>
<!-- PMD EARLY SORTABLE DROPZONE END -->
@endunless
<!-- PMD_KDS_SERVER_FAST_V82_EARLY_MEDIA_GUARD_END -->

{!! get_script_tags() !!}
<!-- SlimSelect: dropdown inside form so it scrolls with page (must run before selectList is used) -->
<script src="{{ asset('app/admin/assets/js/slim-select-relative-position.js') }}?v={{ time() }}"></script>

<!-- Admin confirm modal (Cancel + Delete) – replaces SweetAlert for data-request-confirm -->
<script src="{{ asset('app/admin/assets/js/admin-confirm-modal.js') }}?v={{ time() }}"></script>

<!-- Notification System - ENABLED FOR CPU TESTING -->
<!-- PMD_KDS_SERVER_FAST_V82_NOTIFICATIONS_JS_GUARD_START -->
@unless(!empty($__pmdIsKdsDashboardV82))

<script src="{{ asset('app/admin/assets/js/notifications.js') }}?v={{ time() }}"></script>
@endunless
<!-- PMD_KDS_SERVER_FAST_V82_NOTIFICATIONS_JS_GUARD_END -->
<!-- PMD_KDS_SERVER_FAST_V82_PUSH_JS_GUARD_START -->
@unless(!empty($__pmdIsKdsDashboardV82))

<script src="{{ asset('app/admin/assets/js/push-notifications.js') }}?v={{ time() }}"></script>

@endunless
<!-- PMD_KDS_SERVER_FAST_V82_PUSH_JS_GUARD_END -->
<!-- Modal Performance Fix - MUST LOAD FIRST to prevent freeze -->
@unless($pmdIsNativeMediaContext)
<!-- PMD_KDS_SERVER_FAST_V82_MODAL_FIX_JS_GUARD_START -->
@unless(!empty($__pmdIsKdsDashboardV82))

<script src="{{ asset('app/admin/assets/js/modal-performance-fix.js') }}?v={{ time() }}"></script>
@endunless
<!-- PMD_KDS_SERVER_FAST_V82_MODAL_FIX_JS_GUARD_END -->
@endunless

<!-- Fix Bootstrap Dropdown _menu null (Folders/Filter/Sort dropdowns on Media Manager) -->
<script src="{{ asset('app/admin/assets/js/fix-bootstrap-dropdown-null.js') }}?v={{ time() }}"></script>

<!-- Smooth Page Transitions -->
<!-- PMD_KDS_ULTRA_FAST_V83_SMOOTH_TRANSITIONS_GUARD_START -->
@unless(!empty($__pmdIsKdsDashboardV82))

<script src="{{ asset('app/admin/assets/js/smooth-transitions.js') }}?v={{ time() }}"></script>

@endunless
<!-- PMD_KDS_ULTRA_FAST_V83_SMOOTH_TRANSITIONS_GUARD_END -->
<!-- Force Button Alignment - MUST run before page-specific-fixes so Save button gets size once (no vibration) -->
<!-- PMD_KDS_ULTRA_FAST_V83_FORCE_ALIGN_GUARD_START -->
@unless(!empty($__pmdIsKdsDashboardV82))

<script src="{{ asset('app/admin/assets/js/force-button-alignment.js') }}?v={{ time() }}"></script>

@endunless
<!-- PMD_KDS_ULTRA_FAST_V83_FORCE_ALIGN_GUARD_END -->
<!-- Page-specific fixes -->
<!-- PMD_KDS_ULTRA_FAST_V83_PAGE_SPECIFIC_GUARD_START -->
@unless(!empty($__pmdIsKdsDashboardV82))

<script src="{{ asset('app/admin/assets/js/page-specific-fixes.js') }}?v={{ time() }}"></script>

@endunless
<!-- PMD_KDS_ULTRA_FAST_V83_PAGE_SPECIFIC_GUARD_END -->
<!-- Fix Media Finder Inline Styles -->
@unless($pmdIsNativeMediaContext)
<script src="{{ asset('app/admin/assets/js/fix-media-finder-inline-styles.js') }}?v={{ time() }}"></script>
@endunless
<!-- Fix History Button Text Centering - Removes inline styles that prevent flexbox centering -->
<script src="{{ asset('app/admin/assets/js/fix-history-button-centering.js') }}?v={{ time() }}"></script>
<!-- Fix Notification Buttons Bottom Border - Ensures bottom border is visible -->
<script src="{{ asset('app/admin/assets/js/fix-notification-buttons-border.js') }}?v={{ time() }}"></script>
<!-- Fix Profile Dropdown Green Hover - Removes green hover effect via JavaScript -->
<script src="{{ asset('app/admin/assets/js/fix-profile-dropdown-green.js') }}?v={{ time() }}"></script>
<!-- Fix Tab Link Colors - Force dark blue instead of green -->
<!-- PMD_KDS_ULTRA_FAST_V83_TAB_COLOR_GUARD_START -->
@unless(!empty($__pmdIsKdsDashboardV82))

<script src="{{ asset('app/admin/assets/js/fix-tab-link-colors.js') }}?v={{ time() }}"></script>
@endunless
<!-- PMD_KDS_ULTRA_FAST_V83_TAB_COLOR_GUARD_END -->
<!-- Fix Suggestion Sentences Label - Remove underline and button shadow -->
<!-- PMD_KDS_ULTRA_FAST_V83_SUGGESTION_LABEL_GUARD_START -->
@unless(!empty($__pmdIsKdsDashboardV82))

<script src="{{ asset('app/admin/assets/js/fix-suggestion-sentences-label.js') }}?v={{ time() }}"></script>
@endunless
<!-- PMD_KDS_ULTRA_FAST_V83_SUGGESTION_LABEL_GUARD_END -->
<!-- Fix Form Field Focus Colors - Remove green, use dark blue -->
<!-- PMD_KDS_ULTRA_FAST_V83_FOCUS_COLOR_GUARD_START -->
@unless(!empty($__pmdIsKdsDashboardV82))

<script src="{{ asset('app/admin/assets/js/fix-form-field-focus-colors.js') }}?v={{ time() }}"></script>
@endunless
<!-- PMD_KDS_ULTRA_FAST_V83_FOCUS_COLOR_GUARD_END -->
<!-- Fix Profile Dropdown Closed - Disables items when dropdown is closed -->
<script src="{{ asset('app/admin/assets/js/fix-profile-dropdown-closed.js') }}?v={{ time() }}"></script>
<!-- Fix Menu-Grid Hover - Ensures Tax and Advanced buttons hover works properly -->
<!-- PMD_KDS_ULTRA_FAST_V83_MENU_GRID_HOVER_GUARD_START -->
@unless(!empty($__pmdIsKdsDashboardV82))

<script src="{{ asset('app/admin/assets/js/fix-menu-grid-hover.js') }}?v={{ time() }}"></script>
@endunless
<!-- PMD_KDS_ULTRA_FAST_V83_MENU_GRID_HOVER_GUARD_END -->
<!-- Disable tooltips on Note, History, and settings menu-grid (redundant labels) -->
<script src="{{ asset('app/admin/assets/js/fix-disable-tooltips.js') }}?v={{ time() }}"></script>

<!-- Modal Blur Fix -->
<!-- PMD_KDS_ULTRA_FAST_V83_MODAL_BLUR_GUARD_START -->
@unless(!empty($__pmdIsKdsDashboardV82))

<script src="{{ asset('app/admin/assets/js/modal-blur-fix.js') }}?v={{ time() }}"></script>

@endunless
<!-- PMD_KDS_ULTRA_FAST_V83_MODAL_BLUR_GUARD_END -->
<!-- Media Manager Search Icon Fix -->
@unless($pmdIsNativeMediaContext)
<script src="{{ asset('app/admin/assets/js/media-search-icon-fix.js') }}?v={{ time() }}"></script>
@endunless

<!-- Image Preview Persistence Fix -->
@unless($pmdIsNativeMediaContext)
<script src="{{ asset('app/admin/assets/js/image-preview-persistence.js') }}?v={{ time() }}"></script>
@endunless

<!-- Debug Redirects (Remove this in production) -->
<!-- PMD_KDS_ULTRA_FAST_V83_DEBUG_REDIRECTS_GUARD_START -->
@unless(!empty($__pmdIsKdsDashboardV82))

<script src="{{ asset('app/admin/assets/js/debug-redirects.js') }}?v={{ time() }}"></script>

@endunless
<!-- PMD_KDS_ULTRA_FAST_V83_DEBUG_REDIRECTS_GUARD_END -->
<!-- Sidebar Star Icon - DISABLED (replaced by unified shell curve) -->
<!-- <script src="{{ asset('app/admin/assets/js/sidebar-star-icon.js') }}?v={{ time() }}" defer></script> -->

<!-- Folder Creation Dropdown Card -->
<script src="{{ asset('app/admin/assets/js/folder-dropdown-card.js') }}?v={{ time() }}"></script>

<!-- Global Button Width Fix - Enforces 48x48px buttons on all pages -->
<!-- PMD_KDS_ULTRA_FAST_V83_BUTTON_WIDTH_GUARD_START -->
@unless(!empty($__pmdIsKdsDashboardV82))

<script src="{{ asset('app/admin/assets/js/fix-button-widths-global.js') }}?v={{ time() }}"></script>

@endunless
<!-- PMD_KDS_ULTRA_FAST_V83_BUTTON_WIDTH_GUARD_END -->
<!-- SlimSelect: close dropdown on scroll (page-wrapper), match dropdown width -->
<!-- PMD_KDS_ULTRA_FAST_V83_DYNAMIC_DROPDOWN_GUARD_START -->
@unless(!empty($__pmdIsKdsDashboardV82))

<script src="{{ asset('app/admin/assets/js/dynamic-dropdown-height.js') }}?v={{ time() }}"></script>

@endunless
<!-- PMD_KDS_ULTRA_FAST_V83_DYNAMIC_DROPDOWN_GUARD_END -->
<!-- PMD Admin Toolbar Auto Normalizer -->
<script src="{{ asset('app/admin/assets/js/pmd-admin-toolbar-normalizer.js') }}?v={{ time() }}"></script>
<script src="{{ asset('app/admin/assets/js/pmd-admin-responsive-shell.js') }}?v={{ time() }}"></script>

<!-- Guide Tour Button Handler -->
<script>
(function() {
    'use strict';

    function initGuideTourButton() {
        const guideBtn = document.getElementById('guide-tour-btn');
        if (!guideBtn) return;

        guideBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();

            // Close all open dropdowns and modals before starting the tour
            closeAllOpenDropdowns();

            if (window.PayMyDineTour && typeof window.PayMyDineTour.startTour === 'function') {
                window.PayMyDineTour.startTour(true);
            } else {
                console.warn('PayMyDineTour not available yet, retrying...');
                setTimeout(function() {
                    if (window.PayMyDineTour && typeof window.PayMyDineTour.startTour === 'function') {
                        window.PayMyDineTour.startTour(true);
                    }
                }, 300);
            }
        });
    }

    // Function to close all open dropdowns and panels
    function closeAllOpenDropdowns() {
        // Close all Bootstrap dropdowns
        const openDropdowns = document.querySelectorAll('.dropdown-menu.show');
        openDropdowns.forEach(function(dropdown) {
            dropdown.classList.remove('show');

            // Also remove show class from parent dropdown
            const parentDropdown = dropdown.closest('.dropdown');
            if (parentDropdown) {
                const toggle = parentDropdown.querySelector('[data-bs-toggle="dropdown"], [data-toggle="dropdown"]');
                if (toggle) {
                    toggle.classList.remove('show');
                    toggle.setAttribute('aria-expanded', 'false');
                }
            }
        });

        // Close notification panel specifically
        const notificationPanel = document.getElementById('notification-panel');
        if (notificationPanel) {
            notificationPanel.classList.remove('show');
        }

        // Close any open modals
        const openModals = document.querySelectorAll('.modal.show');
        openModals.forEach(function(modal) {
            modal.classList.remove('show');
            modal.style.display = 'none';
        });

        // Remove modal backdrop if exists
        const backdrops = document.querySelectorAll('.modal-backdrop');
        backdrops.forEach(function(backdrop) {
            backdrop.remove();
        });

        // Reset body styles that might have been set by modals
        document.body.classList.remove('modal-open');
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initGuideTourButton);
    } else {
        initGuideTourButton();
    }

    // Also try after a delay to ensure everything is loaded
    setTimeout(initGuideTourButton, 1000);
})();
</script>

<script id="pmd-wero-global-handler">
(function () {
  if (window.__PMD_WERO_HANDLER_INSTALLED__) return;
  window.__PMD_WERO_HANDLER_INSTALLED__ = true;

  function showWeroMessage(msg) {
    var text = msg || 'Wero is currently unavailable. Please choose another payment method.';
    try {
      if (window.Toastify) {
        Toastify({ text: text, duration: 5000, close: true, gravity: 'top', position: 'right' }).showToast();
        return;
      }
    } catch (e) {}
    try {
      if (window.Swal && typeof window.Swal.fire === 'function') {
        window.Swal.fire({ icon: 'warning', title: 'Payment unavailable', text: text });
        return;
      }
    } catch (e) {}
    alert(text);
  }

  function disableBusyState() {
    try {
      document.querySelectorAll('[data-payment-submit],[data-checkout-submit],button[type="submit"]').forEach(function(btn) {
        btn.disabled = false;
        btn.classList.remove('is-loading', 'loading', 'disabled');
      });
    } catch (e) {}
  }

  function hideWeroOptions() {
    try {
      document.querySelectorAll('[data-payment-method="wero"],[value="wero"],.payment-method-wero,.wero-option').forEach(function(el) {
        var row = el.closest('label,.payment-method,.payment-option,.form-check,.list-group-item') || el;
        if (row) row.style.opacity = '0.5';
      });
    } catch (e) {}
  }

  async function inspectResponse(response) {
    try {
      var url = response && response.url ? response.url : '';
      if (!url || url.indexOf('/payments/worldline/wero/create-session') === -1) return response;

      if (response.status === 422 || response.status === 503) {
        var clone = response.clone();
        var data = await clone.json().catch(function(){ return {}; });
        var msg = data.display_message || data.error || 'Wero is currently unavailable. Please choose another payment method.';
        showWeroMessage(msg);
        disableBusyState();
        hideWeroOptions();
      }
    } catch (e) {}
    return response;
  }

  if (window.fetch) {
    var _fetch = window.fetch;
    window.fetch = function() {
      return _fetch.apply(this, arguments).then(inspectResponse);
    };
  }

  if (window.XMLHttpRequest) {
    var OriginalXHR = window.XMLHttpRequest;
    function WrappedXHR() {
      var xhr = new OriginalXHR();
      var _open = xhr.open;
      xhr.open = function(method, url) {
        xhr.__pmd_url = url || '';
        return _open.apply(xhr, arguments);
      };
      xhr.addEventListener('load', function() {
        try {
          if ((xhr.status === 422 || xhr.status === 503) &&
              xhr.__pmd_url &&
              xhr.__pmd_url.indexOf('/payments/worldline/wero/create-session') !== -1) {
            var data = {};
            try { data = JSON.parse(xhr.responseText || '{}'); } catch (e) {}
            var msg = data.display_message || data.error || 'Wero is currently unavailable. Please choose another payment method.';
            showWeroMessage(msg);
            disableBusyState();
            hideWeroOptions();
          }
        } catch (e) {}
      });
      return xhr;
    }
    window.XMLHttpRequest = WrappedXHR;
  }
})();
</script>

    @unless($pmdIsNativeMediaContext)
<!-- PMD_KDS_SERVER_FAST_V82_MEDIAFIX_JS_GUARD_START -->
@unless(!empty($__pmdIsKdsDashboardV82))

<script src="{{ asset('app/admin/assets/js/pmd-mediafinder-autofix.js') }}?v={{ time() }}"></script>
@endunless
<!-- PMD_KDS_SERVER_FAST_V82_MEDIAFIX_JS_GUARD_END -->
@endunless

<!-- PMD_DASHBOARD_LOGO_INVOICE_SYNC_PROMPT_V1_START -->
<script id="pmd-dashboard-logo-invoice-sync-prompt-v1">
(function () {
    if (!/\/admin\/settings\/edit\/general(?:$|[?#\/])/.test(window.location.pathname)) {
        return;
    }

    var initialDashboardLogo = null;
    var alreadyAskedForThisSave = false;

    function normalizeLogoValue(value) {
        value = String(value || '').trim();
        if (!value) return '';

        try {
            var url = new URL(value, window.location.origin);
            value = url.pathname || value;
        } catch (e) {}

        value = value.split('?')[0];

        var match = value.match(/\/assets\/media\/uploads\/([^\/]+)$/);
        if (match) return '/' + match[1];

        return value;
    }

    function basename(value) {
        value = normalizeLogoValue(value);
        return value.split('/').pop().toLowerCase();
    }

    function isBrokenPlaceholder(value) {
        var b = basename(value);
        return !b || [
            'images.png',
            'images.jpeg',
            'image.png',
            'image.jpeg',
            'placeholder.svg',
            'no-image.png'
        ].indexOf(b) !== -1;
    }

    function getFieldValue(key) {
        var selectors = [
            'input[name="setting[' + key + ']"]',
            'input[name="' + key + '"]',
            'input[data-field-name="' + key + '"]'
        ];

        for (var i = 0; i < selectors.length; i++) {
            var el = document.querySelector(selectors[i]);
            if (el && el.value) {
                return normalizeLogoValue(el.value);
            }
        }

        return '';
    }

    function setHiddenSetting(form, key, value) {
        var name = 'setting[' + key + ']';
        var input = form.querySelector('input[name="' + name + '"]');

        if (!input) {
            input = document.createElement('input');
            input.type = 'hidden';
            input.name = name;
            input.setAttribute('data-pmd-injected', '1');
            form.appendChild(input);
        }

        input.value = normalizeLogoValue(value);
    }

    function findMainSettingsForm(el) {
        var form = el && el.closest ? el.closest('form') : null;
        if (form) return form;

        return document.querySelector('form') || document.body;
    }

    function maybePromptAndInject(form) {
        var current = normalizeLogoValue(getFieldValue('dashboard_logo'));

        if (!current || isBrokenPlaceholder(current)) return;
        if (initialDashboardLogo === null) initialDashboardLogo = current;
        if (current === initialDashboardLogo) return;
        if (alreadyAskedForThisSave) return;

        alreadyAskedForThisSave = true;

        var useForInvoice = window.confirm(
            'Do you also want to use this Dashboard Logo for the Invoice logo?'
        );

        if (useForInvoice) {
            setHiddenSetting(form, 'invoice_logo', current);
            setHiddenSetting(form, 'pmd_sync_dashboard_logo_to_invoice', '1');
        }
    }

    function captureInitialLogo() {
        initialDashboardLogo = normalizeLogoValue(getFieldValue('dashboard_logo'));
    }

    window.addEventListener('load', function () {
        setTimeout(captureInitialLogo, 600);
        setTimeout(captureInitialLogo, 1600);
    });

    document.addEventListener('submit', function (event) {
        maybePromptAndInject(event.target);
    }, true);

    document.addEventListener('click', function (event) {
        var target = event.target && event.target.closest
            ? event.target.closest('button, a, input[type="submit"]')
            : null;

        if (!target) return;

        var text = String(target.textContent || target.value || '').toLowerCase();
        var looksLikeSave =
            text.indexOf('save') !== -1 ||
            target.matches('[data-request*="onSave"], [data-request*="save"], .btn-primary, button[type="submit"], input[type="submit"]');

        if (!looksLikeSave) return;

        maybePromptAndInject(findMainSettingsForm(target));
    }, true);
})();
</script>
<!-- PMD_DASHBOARD_LOGO_INVOICE_SYNC_PROMPT_V1_END -->

<script>
(function(){
 if(!/admin\/settings\/edit\/setup/.test(window.location.pathname)) return;
 function v(n){var e=document.querySelector('[name="setting['+n+']"]'); return e?e.value:'';}
 function on(){
  var p=document.getElementById('pmd-invoice-preview'); if(!p) return;
  var preset=document.querySelector('[name="setting[invoice_prefix_preset]"]'); var prefix=document.querySelector('[name="setting[invoice_prefix]"]');
  if(preset && prefix){ if(preset.value && preset.value!=='custom'){ prefix.value=preset.value; } }
  var showLogo=(v('invoice_show_logo')==='1'||v('invoice_show_logo')==='true'||v('invoice_show_logo')==='on');
  var logo=v('invoice_logo'); var l=document.getElementById('pmd-prev-logo'); if(l){ l.textContent=(showLogo && !logo)?'LOGO':''; if(showLogo&&logo){l.innerHTML='<small>Logo selected</small>';} }
  var no=document.getElementById('pmd-prev-no'); if(no){ no.textContent='#'+(v('invoice_prefix')||'')+'2026-001180'; }
  var f=document.getElementById('pmd-prev-footer'); if(f) f.textContent=v('invoice_customer_footer_text')||'';
 }
 document.addEventListener('change',on,true); document.addEventListener('input',on,true); setTimeout(on,300);
})();
</script>
    
<script src="{{ asset('app/admin/assets/js/pmd-sidebar-system-lock-v7.js') }}?v={{ time() }}"></script>
{{-- PMD owner clean v1 disabled legacy dashboard asset: <script src="{{ asset('app/admin/assets/js/pmd-dashboard-modern-v1.js') }}?v={{ time() }}"></script> --}}
{{-- PMD owner clean v1 disabled legacy dashboard asset: <script src="{{ asset('app/admin/assets/js/pmd-dashboard-real-api-v3.js') }}?v={{ time() }}"></script> --}}
{{-- PMD owner clean v1 disabled legacy dashboard asset: <script src="{{ asset('app/admin/assets/js/pmd-dashboard-role-preview-v9.js') }}?v={{ time() }}"></script> --}}
{{-- PMD owner clean v1 disabled legacy dashboard asset: <script src="{{ asset('app/admin/assets/js/pmd-dashboard-owner2-v11.js') }}?v={{ time() }}"></script> --}}
{{-- PMD owner clean v1 disabled legacy dashboard asset: <script src="{{ asset('app/admin/assets/js/pmd-dashboard-waiter3-v12.js') }}?v={{ time() }}"></script> --}}
{{-- PMD owner clean v1 disabled legacy dashboard asset: <script src="{{ asset('app/admin/assets/js/pmd-dashboard-waiter3-v13-polish.js') }}?v={{ time() }}"></script> --}}
{{-- PMD owner clean v1 disabled legacy dashboard asset: <script src="{{ asset('app/admin/assets/js/pmd-dashboard-waiter3-v14-compact.js') }}?v={{ time() }}"></script> --}}
{{-- PMD owner clean v1 disabled legacy dashboard asset: <script src="{{ asset('app/admin/assets/js/pmd-dashboard-waiter3-v15-rolebar.js') }}?v={{ time() }}"></script> --}}
{{-- PMD owner clean v1 disabled legacy dashboard asset: <script src="{{ asset('app/admin/assets/js/pmd-dashboard-w3-quick-icons-v16.js') }}?v={{ time() }}"></script> --}}
    <script src="{{ asset('app/admin/assets/js/pmd-sidebar-icons-only-v15.js') }}?v={{ time() }}"></script>
{{-- PMD owner clean v1 disabled legacy dashboard asset: <script src="{{ asset('app/admin/assets/js/pmd-dashboard-no-jump-v17.js') }}?v={{ time() }}"></script> --}}
<!-- PMD_OWNER_DASHBOARD_MATCH_V13_JS_START -->
{{-- PMD owner clean v1 disabled legacy dashboard asset: <script src="{{ asset('app/admin/assets/js/pmd-dashboard-owner-match-v13.js') }}?v={{ time() }}"></script> --}}
<!-- PMD_OWNER_DASHBOARD_MATCH_V13_JS_END -->
<!-- PMD_UNIVERSAL_LAYOUT_EDITOR_V35_JS_START -->
<script src="{{ asset('app/admin/assets/js/pmd-universal-layout-editor-v35.js') }}?v={{ time() }}"></script>
<!-- PMD_UNIVERSAL_LAYOUT_EDITOR_V35_JS_END -->
<!-- PMD_SIDEBAR_RECOVER_NATIVE_V50_JS_START -->
<script src="{{ asset('app/admin/assets/js/pmd-sidebar-recover-native-v50.js') }}?v={{ time() }}"></script>
<!-- PMD_SIDEBAR_RECOVER_NATIVE_V50_JS_END -->
<!-- PMD_MANAGER_OPS_DASHBOARD_V29_JS_START -->
{{-- PMD owner clean v1 disabled legacy dashboard asset: <script src="{{ asset('app/admin/assets/js/pmd-manager-ops-dashboard-v29.js') }}?v={{ time() }}"></script> --}}
<!-- PMD_MANAGER_OPS_DASHBOARD_V29_JS_END -->
<!-- PMD_SIDEBAR_LOGO_LAST_TOGGLE_V55_JS_START -->
<script src="{{ asset('app/admin/assets/js/pmd-sidebar-logo-last-toggle-v55.js') }}?v={{ time() }}"></script>
<!-- PMD_SIDEBAR_LOGO_LAST_TOGGLE_V55_JS_END -->
<!-- PMD_STABLE_LOGO_KPI_V65_JS_START -->
<script src="{{ asset('app/admin/assets/js/pmd-stable-logo-switcher-v65.js') }}?v={{ time() }}"></script>
<!-- PMD_STABLE_LOGO_KPI_V65_JS_END -->
<!-- PMD_SIDEBAR_CLOSED_LOGO_MODE_V66_JS_START -->
<script src="{{ asset('app/admin/assets/js/pmd-sidebar-closed-logo-mode-v66.js') }}?v={{ time() }}"></script>
<!-- PMD_SIDEBAR_CLOSED_LOGO_MODE_V66_JS_END -->
<!-- PMD_SIDEBAR_TOGGLE_TOP_GAP_V70_JS_START -->
<script src="{{ asset('app/admin/assets/js/pmd-sidebar-toggle-top-gap-v70.js') }}?v={{ time() }}"></script>
<!-- PMD_SIDEBAR_TOGGLE_TOP_GAP_V70_JS_END -->
<!-- PMD_ROLE_DASHBOARD_LOCK_V72_JS_START -->
{{-- PMD owner clean v1 disabled legacy dashboard asset: <script src="{{ asset('app/admin/assets/js/pmd-role-dashboard-lock-v72.js') }}?v={{ time() }}"></script> --}}
<!-- PMD_ROLE_DASHBOARD_LOCK_V72_JS_END -->
<!-- PMD_ROLE_NO_SIDEBAR_LOCK_V73_JS_START -->
{{-- PMD owner clean v1 disabled legacy dashboard asset: <script src="{{ asset('app/admin/assets/js/pmd-role-no-sidebar-v73.js') }}?v={{ time() }}"></script> --}}
<!-- PMD_ROLE_NO_SIDEBAR_LOCK_V73_JS_END -->
<!-- PMD_DASHBOARD_ROLE_STABILITY_V78_JS_START -->
{{-- PMD owner clean v1 disabled legacy dashboard asset: <script src="{{ asset('app/admin/assets/js/pmd-dashboard-role-stability-v78.js') }}?v={{ time() }}"></script> --}}
<!-- PMD_DASHBOARD_ROLE_STABILITY_V78_JS_END -->

<!-- PMD_DASHBOARD_STABILITY_V77_JS_START -->
{{-- PMD owner clean v1 disabled legacy dashboard asset: <script src="{{ asset('app/admin/assets/js/pmd-dashboard-stability-v77.js') }}?v={{ time() }}"></script> --}}
<!-- PMD_DASHBOARD_STABILITY_V77_JS_END -->

<!-- PMD_WAITER_STABLE_MOBILE_V97_JS_START -->
<!-- PMD_WAITER_STABLE_MOBILE_V97_JS_END -->

<!-- PMD_WAITER_DATA_REPAIR_V100_JS_START -->
<!-- PMD_WAITER_DATA_REPAIR_V100_JS_END -->
<!-- PMD_WAITER_PORTAL_V114_ASSETS_START -->
{{-- PMD waiter rebuild: old dashboard asset disabled --}}
{{-- PMD waiter rebuild: old dashboard asset disabled --}}
<!-- PMD_WAITER_PORTAL_V114_ASSETS_END -->


<!-- PMD_STABLE_FLOOR_PLAN_ASSETS_START -->
{{-- PMD waiter rebuild: old dashboard asset disabled --}}
{{-- PMD waiter rebuild: old dashboard asset disabled --}}
<!-- PMD_STABLE_FLOOR_PLAN_ASSETS_END -->
<!-- PMD_FLOOR_V146_SAFE_VISUAL_STATUS_START -->
<!-- PMD_FLOOR_V146_SAFE_VISUAL_STATUS_END -->

    {{-- PMD waiter rebuild: old dashboard asset disabled --}}
{{-- PMD waiter rebuild: old dashboard asset disabled --}}
{{-- PMD owner clean v1 disabled legacy dashboard asset: <script src="{{ asset('app/admin/assets/js/pmd-waiter-dashboard-v161-direct-renderer.js') }}?v={{ time() }}" defer></script> --}}
{{-- PMD owner clean v1 disabled legacy dashboard asset: <script src="{{ asset('app/admin/assets/js/pmd-waiter-dashboard-v162-fix-mount-position.js') }}?v={{ time() }}" defer></script> --}}







<!-- PMD_ADMIN_FINAL_SINGLE_LOGO_V20 -->
<link rel="stylesheet" href="/app/admin/assets/css/pmd-admin-final-single-logo-v20.css?v=20260625_154925">
<script defer src="/app/admin/assets/js/pmd-admin-final-single-logo-v20.js?v=20260625_154925"></script>
<!-- /PMD_ADMIN_FINAL_SINGLE_LOGO_V20 -->

<!-- PMD_OWNER_DASHBOARD_CLEAN_V23_JS_START -->
<script src="{{ asset('app/admin/assets/js/pmd-owner-dashboard-clean-v23.js') }}?v={{ time() }}" defer></script>
<!-- PMD_OWNER_DASHBOARD_CLEAN_V23_JS_END -->
    <script src="/app/admin/assets/js/pmd-admin-universal-client-list-v1.js?v=50" defer></script>







</body>
</html>

<!-- PMD_OWNER_V122_DASHBOARD2_EXACT_MAIN_KPI_COLORS_START -->
<style id="pmd-owner-v122-dashboard2-exact-main-kpi-colors-style">
/*
  Dashboard2 v122
  Fix: top 4 KPI colors must match main dashboard.
  No iframe mirror. No invented colors on normal cards.
*/

html.pmd-dashboard2-active,
html.pmd-dashboard2-active body {
  overflow: hidden !important;
  background: #f6f8fb !important;
}

html.pmd-dashboard2-active #pmd-dashboard2-quick-btn,
html.pmd-dashboard2-active .pmd-d2-quick-btn,
html.pmd-dashboard2-active [id*="dashboard2"][id*="quick"],
html.pmd-dashboard2-active [class*="dashboard2"][class*="quick"] {
  display: none !important;
  visibility: hidden !important;
  opacity: 0 !important;
  pointer-events: none !important;
}

/* Same distance/spacing as the clean D2 version */
html.pmd-dashboard2-active .pmd-d2-root {
  top: 72px !important;
  left: 100px !important;
  right: 8px !important;
  bottom: 0 !important;
  padding: 16px 16px 64px !important;
  overflow: auto !important;
  background: #f6f8fb !important;
  border-top: 1px solid rgba(226,232,240,.72) !important;
}

html.pmd-dashboard2-active .pmd-d2-shell {
  width: 100% !important;
  max-width: none !important;
  margin: 0 !important;
}

html.pmd-dashboard2-active .pmd-d2-kpis,
html.pmd-dashboard2-active .pmd-d2-grid {
  gap: 16px !important;
}

html.pmd-dashboard2-active .pmd-d2-kpis {
  margin-bottom: 16px !important;
}

/* Remove wrong old pseudo colors */
html.pmd-dashboard2-active .pmd-d2-card::before,
html.pmd-dashboard2-active .pmd-d2-card::after,
html.pmd-dashboard2-active .pmd-d2-kpi::before,
html.pmd-dashboard2-active .pmd-d2-kpi::after {
  display: none !important;
  content: none !important;
}

/* Base normal cards: white like main dashboard */
html.pmd-dashboard2-active .pmd-d2-floor,
html.pmd-dashboard2-active .pmd-d2-card {
  background: #ffffff !important;
  border: 1px solid #dbe3ee !important;
  box-shadow: 0 14px 38px rgba(15,23,42,.05) !important;
  color: #061126 !important;
}

html.pmd-dashboard2-active .pmd-d2-card {
  height: 328px !important;
  min-height: 328px !important;
  max-height: 328px !important;
  border-radius: 18px !important;
  overflow: hidden !important;
}

html.pmd-dashboard2-active .pmd-d2-floor {
  height: 218px !important;
  min-height: 218px !important;
  max-height: 218px !important;
  margin-bottom: 16px !important;
  border-radius: 18px !important;
}

html.pmd-dashboard2-active .pmd-d2-floor.is-expanded {
  height: 620px !important;
  min-height: 620px !important;
  max-height: 620px !important;
}

/* Top KPI cards — exact main dashboard style */
html.pmd-dashboard2-active .pmd-d2-kpi {
  position: relative !important;
  overflow: hidden !important;
  height: 112px !important;
  min-height: 112px !important;
  padding: 18px 24px !important;
  border-radius: 18px !important;
  box-shadow: 0 14px 38px rgba(15,23,42,.05) !important;
}

/* Revenue Today: green + lavender bottom */
html.pmd-dashboard2-active .pmd-d2-kpi:nth-child(1) {
  background:
    radial-gradient(circle at 12% 50%, rgba(220,252,231,.72), transparent 30%),
    linear-gradient(135deg, #f0fdf4 0%, #ffffff 58%, #f5f3ff 100%) !important;
  border: 1px solid #bbf7d0 !important;
}
html.pmd-dashboard2-active .pmd-d2-kpi:nth-child(1)::after {
  content: "" !important;
  display: block !important;
  position: absolute !important;
  left: 0 !important;
  right: 0 !important;
  bottom: 0 !important;
  height: 4px !important;
  background: linear-gradient(90deg, #86efac 0%, #c4b5fd 100%) !important;
}

/* Pending Value: warm orange */
html.pmd-dashboard2-active .pmd-d2-kpi:nth-child(2) {
  background:
    radial-gradient(circle at 12% 50%, rgba(255,237,213,.76), transparent 30%),
    linear-gradient(135deg, #fff7ed 0%, #ffffff 58%, #fdf2f8 100%) !important;
  border: 1px solid #fdba74 !important;
}
html.pmd-dashboard2-active .pmd-d2-kpi:nth-child(2)::after {
  content: "" !important;
  display: block !important;
  position: absolute !important;
  left: 0 !important;
  right: 0 !important;
  bottom: 0 !important;
  height: 4px !important;
  background: linear-gradient(90deg, #fdba74 0%, #f0abfc 100%) !important;
}

/* Table Occupancy: blue */
html.pmd-dashboard2-active .pmd-d2-kpi:nth-child(3) {
  background:
    radial-gradient(circle at 12% 50%, rgba(219,234,254,.82), transparent 30%),
    linear-gradient(135deg, #eff6ff 0%, #ffffff 58%, #f5f3ff 100%) !important;
  border: 1px solid #bfdbfe !important;
}
html.pmd-dashboard2-active .pmd-d2-kpi:nth-child(3)::after {
  content: "" !important;
  display: block !important;
  position: absolute !important;
  left: 0 !important;
  right: 0 !important;
  bottom: 0 !important;
  height: 4px !important;
  background: linear-gradient(90deg, #93c5fd 0%, #c4b5fd 100%) !important;
}

/* Orders Today: peach/pink */
html.pmd-dashboard2-active .pmd-d2-kpi:nth-child(4) {
  background:
    radial-gradient(circle at 12% 50%, rgba(252,231,243,.78), transparent 30%),
    linear-gradient(135deg, #fff7ed 0%, #ffffff 58%, #fdf2f8 100%) !important;
  border: 1px solid #fdba74 !important;
}
html.pmd-dashboard2-active .pmd-d2-kpi:nth-child(4)::after {
  content: "" !important;
  display: block !important;
  position: absolute !important;
  left: 0 !important;
  right: 0 !important;
  bottom: 0 !important;
  height: 4px !important;
  background: linear-gradient(90deg, #fdba74 0%, #f9a8d4 100%) !important;
}

/* KPI icons matching each card */
html.pmd-dashboard2-active .pmd-d2-kpi .pmd-d2-ico {
  width: 56px !important;
  height: 56px !important;
  border-radius: 999px !important;
  box-shadow: inset 0 1px 0 rgba(255,255,255,.9) !important;
}

html.pmd-dashboard2-active .pmd-d2-kpi:nth-child(1) .pmd-d2-ico {
  background: #dcfce7 !important;
  border: 1px solid #bbf7d0 !important;
}

html.pmd-dashboard2-active .pmd-d2-kpi:nth-child(2) .pmd-d2-ico {
  background: #ffedd5 !important;
  border: 1px solid #fed7aa !important;
}

html.pmd-dashboard2-active .pmd-d2-kpi:nth-child(3) .pmd-d2-ico {
  background: #dbeafe !important;
  border: 1px solid #bfdbfe !important;
}

html.pmd-dashboard2-active .pmd-d2-kpi:nth-child(4) .pmd-d2-ico {
  background: #fce7f3 !important;
  border: 1px solid #fbcfe8 !important;
}

/* Inner blocks: only these match main dashboard colored items */
html.pmd-dashboard2-active .pmd-d2-row,
html.pmd-dashboard2-active .pmd-d2-mini > div,
html.pmd-dashboard2-active .pmd-d2-action-tile {
  background: #f8fafc !important;
  border: 1px solid #dbe3ee !important;
  color: #061126 !important;
}

/* Average Guest Spend: first row green, second row orange — same as main */
html.pmd-dashboard2-active .pmd-d2-grid > .pmd-d2-card:nth-child(5) .pmd-d2-row:nth-of-type(1) {
  background: #ecfdf5 !important;
  border-color: #86efac !important;
}

html.pmd-dashboard2-active .pmd-d2-grid > .pmd-d2-card:nth-child(5) .pmd-d2-row:nth-of-type(2) {
  background: #fff7ed !important;
  border-color: #fdba74 !important;
}

/* Lost Revenue: only first risk row orange, not full card */
html.pmd-dashboard2-active .pmd-d2-grid > .pmd-d2-card:nth-child(6) .pmd-d2-row:nth-of-type(1) {
  background: #fff7ed !important;
  border-color: #fdba74 !important;
}

/* Floor tables */
html.pmd-dashboard2-active .pmd-d2-table {
  background: #ffffff !important;
  border: 3px solid #22c55e !important;
  color: #061126 !important;
  box-shadow: 0 8px 18px rgba(34,197,94,.08) !important;
}

@media (max-width: 1200px) {
  html.pmd-dashboard2-active .pmd-d2-root {
    left: 96px !important;
    right: 8px !important;
    padding: 14px !important;
  }

  html.pmd-dashboard2-active .pmd-d2-kpis,
  html.pmd-dashboard2-active .pmd-d2-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
  }
}
</style>

<script id="pmd-owner-v122-dashboard2-exact-main-kpi-colors-script">
(function () {
  if (!/\/admin\/dashboard2(?:$|[?#])/.test(location.pathname + location.search + location.hash)) return;
  document.documentElement.classList.add('pmd-dashboard2-active');
  console.info('[PMD] Dashboard2 v122 exact main KPI colors active');
})();
</script>
<!-- PMD_OWNER_V122_DASHBOARD2_EXACT_MAIN_KPI_COLORS_END -->

<!-- PMD_OWNER_V123_DASHBOARD2_REMOVE_KPI_BOTTOM_EDGE_START -->
<style id="pmd-owner-v123-dashboard2-remove-kpi-bottom-edge-style">
/*
  Dashboard2 v123
  Remove only the colored bottom edge/stripe under the top KPI cards.
  Keep card backgrounds, borders, icons, spacing.
*/

html.pmd-dashboard2-active .pmd-d2-kpi::after,
html.pmd-dashboard2-active .pmd-d2-kpi:nth-child(1)::after,
html.pmd-dashboard2-active .pmd-d2-kpi:nth-child(2)::after,
html.pmd-dashboard2-active .pmd-d2-kpi:nth-child(3)::after,
html.pmd-dashboard2-active .pmd-d2-kpi:nth-child(4)::after {
  display: none !important;
  content: none !important;
  height: 0 !important;
  opacity: 0 !important;
  background: none !important;
  border: 0 !important;
  box-shadow: none !important;
}

/* Make the bottom border look exactly like the other card edges */
html.pmd-dashboard2-active .pmd-d2-kpi:nth-child(1) {
  border-bottom-color: #bbf7d0 !important;
}

html.pmd-dashboard2-active .pmd-d2-kpi:nth-child(2) {
  border-bottom-color: #fdba74 !important;
}

html.pmd-dashboard2-active .pmd-d2-kpi:nth-child(3) {
  border-bottom-color: #bfdbfe !important;
}

html.pmd-dashboard2-active .pmd-d2-kpi:nth-child(4) {
  border-bottom-color: #fdba74 !important;
}
</style>

<script id="pmd-owner-v123-dashboard2-remove-kpi-bottom-edge-script">
(function () {
  if (!/\/admin\/dashboard2(?:$|[?#])/.test(location.pathname + location.search + location.hash)) return;
  document.documentElement.classList.add('pmd-dashboard2-active');
  console.info('[PMD] Dashboard2 v123 remove KPI bottom edge active');
})();
</script>
<!-- PMD_OWNER_V123_DASHBOARD2_REMOVE_KPI_BOTTOM_EDGE_END -->

<!-- PMD_OWNER_V124_DASHBOARD2_UNDER_FLOOR_CARD_HEIGHT_START -->
<style id="pmd-owner-v124-dashboard2-under-floor-card-height-style">
/*
  Dashboard2 v124
  Only increases the height of cards under Restaurant Floor.
  Width, KPI cards, and Floor card stay unchanged.
*/

html.pmd-dashboard2-active .pmd-d2-grid > .pmd-d2-card {
  height: 362px !important;
  min-height: 362px !important;
  max-height: 362px !important;
}

/* Give visual content a little more room inside the taller cards */
html.pmd-dashboard2-active .pmd-d2-chart {
  height: 136px !important;
}

html.pmd-dashboard2-active .pmd-d2-mini > div {
  min-height: 104px !important;
}

html.pmd-dashboard2-active .pmd-d2-action-tile {
  min-height: 108px !important;
}

/* Keep responsive screens safe */
@media (max-width: 1200px) {
  html.pmd-dashboard2-active .pmd-d2-grid > .pmd-d2-card {
    height: auto !important;
    min-height: 340px !important;
    max-height: none !important;
  }
}
</style>

<script id="pmd-owner-v124-dashboard2-under-floor-card-height-script">
(function () {
  if (!/\/admin\/dashboard2(?:$|[?#])/.test(location.pathname + location.search + location.hash)) return;
  document.documentElement.classList.add('pmd-dashboard2-active');
  console.info('[PMD] Dashboard2 v124 under-floor card height active');
})();
</script>
<!-- PMD_OWNER_V124_DASHBOARD2_UNDER_FLOOR_CARD_HEIGHT_END -->

<!-- PMD_OWNER_V128_DASHBOARD2_STATIC_PRIORITY_IN_V114_START -->
<style id="pmd-owner-v128-dashboard2-static-priority-in-v114-style">
/*
  V128:
  Priority cards are now inside V114 initial HTML render.
  No delayed insert. No blink loop.
  Same structure/style as normal pmd-d2-card cards.
*/

html.pmd-dashboard2-active .pmd-d2-priority-grid {
  display: grid !important;
  grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
  gap: 16px !important;
  width: 100% !important;
  margin: 0 0 16px !important;
}

html.pmd-dashboard2-active .pmd-d2-priority-grid > .pmd-d2-card {
  height: 362px !important;
  min-height: 362px !important;
  max-height: 362px !important;
  border-radius: 18px !important;
  background: #ffffff !important;
  border: 1px solid #dbe3ee !important;
  box-shadow: 0 14px 38px rgba(15,23,42,.05) !important;
  overflow: hidden !important;
}

/* Keep these cards neutral, same as the lower cards */
html.pmd-dashboard2-active .pmd-d2-priority-grid > .pmd-d2-card .pmd-d2-row {
  background: #f8fafc !important;
  border: 1px solid #dbe3ee !important;
  color: #061126 !important;
}

/* Revenue by Hour */
html.pmd-dashboard2-active .pmd-d2-hour-summary {
  margin-top: 18px !important;
  display: flex !important;
  align-items: baseline !important;
  gap: 10px !important;
}

html.pmd-dashboard2-active .pmd-d2-hour-summary strong {
  font-size: 30px !important;
  line-height: 1 !important;
  letter-spacing: -.045em !important;
  font-weight: 1000 !important;
}

html.pmd-dashboard2-active .pmd-d2-hour-summary span {
  color: #64748b !important;
  font-size: 13px !important;
  font-weight: 800 !important;
}

html.pmd-dashboard2-active .pmd-d2-hour-bars {
  height: 146px !important;
  margin-top: 18px !important;
  padding: 18px 14px 26px !important;
  border-radius: 16px !important;
  background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%) !important;
  display: grid !important;
  grid-template-columns: repeat(8, 1fr) !important;
  gap: 9px !important;
  align-items: end !important;
  border: 1px solid rgba(219,227,238,.72) !important;
}

html.pmd-dashboard2-active .pmd-d2-hour-bars span {
  position: relative !important;
  height: var(--h) !important;
  min-height: 12px !important;
  border-radius: 999px 999px 6px 6px !important;
  background: linear-gradient(180deg, #86efac 0%, #22c55e 100%) !important;
}

html.pmd-dashboard2-active .pmd-d2-hour-bars span.is-muted {
  background: linear-gradient(180deg, #dbeafe 0%, #93c5fd 100%) !important;
}

html.pmd-dashboard2-active .pmd-d2-hour-bars span b {
  position: absolute !important;
  left: 50% !important;
  bottom: -22px !important;
  transform: translateX(-50%) !important;
  color: #64748b !important;
  font-size: 10.5px !important;
  font-weight: 800 !important;
}

/* Kitchen Performance */
html.pmd-dashboard2-active .pmd-d2-kitchen-grid {
  margin-top: 18px !important;
  display: grid !important;
  grid-template-columns: repeat(3, 1fr) !important;
  gap: 10px !important;
}

html.pmd-dashboard2-active .pmd-d2-kitchen-box {
  min-height: 100px !important;
  padding: 14px !important;
  border-radius: 15px !important;
  background: #f8fafc !important;
  border: 1px solid #dbe3ee !important;
}

html.pmd-dashboard2-active .pmd-d2-kitchen-box small {
  display: block !important;
  color: #64748b !important;
  text-transform: uppercase !important;
  letter-spacing: .04em !important;
  font-size: 10.5px !important;
  font-weight: 1000 !important;
  line-height: 1.2 !important;
}

html.pmd-dashboard2-active .pmd-d2-kitchen-box strong {
  display: block !important;
  margin-top: 12px !important;
  font-size: 24px !important;
  line-height: 1 !important;
  font-weight: 1000 !important;
}

html.pmd-dashboard2-active .pmd-d2-kitchen-box span {
  display: block !important;
  margin-top: 7px !important;
  color: #64748b !important;
  font-size: 12px !important;
  font-weight: 800 !important;
}

html.pmd-dashboard2-active .pmd-d2-kitchen-rush {
  margin-top: 12px !important;
  min-height: 54px !important;
  padding: 14px 16px !important;
  border-radius: 15px !important;
  background: #fff7ed !important;
  border: 1px solid #fdba74 !important;
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  font-weight: 1000 !important;
}

@media (max-width: 1200px) {
  html.pmd-dashboard2-active .pmd-d2-priority-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
  }
}
</style>
<!-- PMD_OWNER_V128_DASHBOARD2_STATIC_PRIORITY_IN_V114_END -->

<!-- PMD_OWNER_V130_DASHBOARD2_SERVICE_PERFORMANCE_START -->
<style id="pmd-owner-v130-dashboard2-service-performance-style">
/*
  V130:
  Adds Service Performance card using real current dashboard values.
  Static initial render. No delayed JS. No fake staff names.
*/

html.pmd-dashboard2-active .pmd-d2-service-performance {
  grid-column: span 2 !important;
  height: 362px !important;
  min-height: 362px !important;
  max-height: 362px !important;
}

html.pmd-dashboard2-active .pmd-d2-service-head {
  display: flex !important;
  align-items: flex-start !important;
  justify-content: space-between !important;
  gap: 18px !important;
  margin-bottom: 18px !important;
}

html.pmd-dashboard2-active .pmd-d2-service-head h2 {
  margin: 0 !important;
}

html.pmd-dashboard2-active .pmd-d2-service-head p {
  margin: 6px 0 0 !important;
}

html.pmd-dashboard2-active .pmd-d2-service-head span {
  height: 34px !important;
  padding: 0 14px !important;
  border-radius: 999px !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  background: #ecfdf5 !important;
  border: 1px solid #86efac !important;
  color: #166534 !important;
  font-size: 12px !important;
  font-weight: 1000 !important;
  white-space: nowrap !important;
}

html.pmd-dashboard2-active .pmd-d2-service-table {
  display: grid !important;
  gap: 10px !important;
}

html.pmd-dashboard2-active .pmd-d2-service-row {
  min-height: 54px !important;
  display: grid !important;
  grid-template-columns: 1.3fr .55fr .7fr .6fr !important;
  align-items: center !important;
  gap: 12px !important;
  padding: 12px 14px !important;
  border-radius: 14px !important;
  background: #f8fafc !important;
  border: 1px solid #dbe3ee !important;
  color: #061126 !important;
}

html.pmd-dashboard2-active .pmd-d2-service-header {
  min-height: 38px !important;
  background: #ffffff !important;
  color: #64748b !important;
  font-size: 12px !important;
  text-transform: uppercase !important;
  letter-spacing: .035em !important;
}

html.pmd-dashboard2-active .pmd-d2-service-row span {
  display: flex !important;
  align-items: center !important;
  gap: 10px !important;
  min-width: 0 !important;
  font-weight: 1000 !important;
}

html.pmd-dashboard2-active .pmd-d2-service-row span i {
  width: 34px !important;
  height: 34px !important;
  flex: 0 0 34px !important;
  border-radius: 12px !important;
  display: grid !important;
  place-items: center !important;
  font-style: normal !important;
  background: #eff6ff !important;
  border: 1px solid #bfdbfe !important;
}

html.pmd-dashboard2-active .pmd-d2-service-row:nth-child(3) span i {
  background: #fff7ed !important;
  border-color: #fdba74 !important;
}

html.pmd-dashboard2-active .pmd-d2-service-row:nth-child(4) span i {
  background: #f5f3ff !important;
  border-color: #c4b5fd !important;
}

html.pmd-dashboard2-active .pmd-d2-service-row:nth-child(5) span i {
  background: #ecfdf5 !important;
  border-color: #86efac !important;
}

html.pmd-dashboard2-active .pmd-d2-service-row b {
  font-weight: 1000 !important;
  white-space: nowrap !important;
}

html.pmd-dashboard2-active .pmd-d2-service-row em {
  font-style: normal !important;
  justify-self: end !important;
  padding: 7px 10px !important;
  border-radius: 999px !important;
  background: #ffffff !important;
  border: 1px solid #dbe3ee !important;
  color: #475569 !important;
  font-size: 11px !important;
  font-weight: 1000 !important;
}

html.pmd-dashboard2-active .pmd-d2-service-row:nth-child(2) em {
  background: #ecfdf5 !important;
  border-color: #86efac !important;
  color: #166534 !important;
}

html.pmd-dashboard2-active .pmd-d2-service-row:nth-child(3) em {
  background: #fff7ed !important;
  border-color: #fdba74 !important;
  color: #9a3412 !important;
}

@media (max-width: 1200px) {
  html.pmd-dashboard2-active .pmd-d2-service-performance {
    grid-column: span 1 !important;
  }

  html.pmd-dashboard2-active .pmd-d2-service-row {
    grid-template-columns: 1fr .55fr .7fr !important;
  }

  html.pmd-dashboard2-active .pmd-d2-service-row em {
    display: none !important;
  }
}
</style>
<!-- PMD_OWNER_V130_DASHBOARD2_SERVICE_PERFORMANCE_END -->

<!-- PMD_OWNER_V131_DASHBOARD2_HIDE_CARD_SUBTITLES_START -->
<style id="pmd-owner-v131-dashboard2-hide-card-subtitles-style">
/*
  V131:
  Hide card subtitle / undertitle lines below the floor.
  CSS only. No JS. No delayed render.
*/

/* Normal dashboard cards under floor */
html.pmd-dashboard2-active .pmd-d2-grid > .pmd-d2-card > h2 + p {
  display: none !important;
  visibility: hidden !important;
  height: 0 !important;
  min-height: 0 !important;
  margin: 0 !important;
  padding: 0 !important;
  overflow: hidden !important;
}

/* Priority cards */
html.pmd-dashboard2-active .pmd-d2-priority-grid > .pmd-d2-card > h2 + p {
  display: none !important;
  visibility: hidden !important;
  height: 0 !important;
  min-height: 0 !important;
  margin: 0 !important;
  padding: 0 !important;
  overflow: hidden !important;
}

/* Service Performance subtitle */
html.pmd-dashboard2-active .pmd-d2-service-head p {
  display: none !important;
  visibility: hidden !important;
  height: 0 !important;
  min-height: 0 !important;
  margin: 0 !important;
  padding: 0 !important;
  overflow: hidden !important;
}

/* Keep spacing clean after removing subtitles */
html.pmd-dashboard2-active .pmd-d2-grid > .pmd-d2-card > h2,
html.pmd-dashboard2-active .pmd-d2-priority-grid > .pmd-d2-card > h2 {
  margin-bottom: 18px !important;
}

html.pmd-dashboard2-active .pmd-d2-service-head {
  margin-bottom: 18px !important;
}
</style>
<!-- PMD_OWNER_V131_DASHBOARD2_HIDE_CARD_SUBTITLES_END -->

<!-- PMD_OWNER_V132_DASHBOARD2_LIVE_CONNECTOR_START -->
<style id="pmd-owner-v132-dashboard2-live-connector-style">
/*
  V132:
  Connect dashboard2 to the existing real owner-dashboard data endpoint.
  No card rebuild loop. No mutation observer. No fake names.
*/

/* Make sure removed priority icons stay removed */
html.pmd-dashboard2-active .pmd-d2-priority-grid > .pmd-d2-card::before,
html.pmd-dashboard2-active .pmd-d2-priority-grid > .pmd-d2-card::after {
  display: none !important;
  content: none !important;
}

html.pmd-dashboard2-active .pmd-d2-priority-grid > .pmd-d2-card {
  padding-right: 22px !important;
}

html.pmd-dashboard2-active .pmd-d2-live-updated {
  transition: background-color .18s ease, border-color .18s ease;
}

html.pmd-dashboard2-active .pmd-d2-live-pill {
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  height: 28px !important;
  padding: 0 10px !important;
  border-radius: 999px !important;
  background: #ecfdf5 !important;
  border: 1px solid #86efac !important;
  color: #166534 !important;
  font-size: 11px !important;
  font-weight: 1000 !important;
}
</style>

<script id="pmd-owner-v132-dashboard2-live-connector-script">
(function () {
  'use strict';

  if (!/\/admin\/dashboard2(?:$|[?#])/.test(location.pathname + location.search + location.hash)) return;
  if (window.PMD_OWNER_V132_DASHBOARD2_LIVE_CONNECTOR) return;
  window.PMD_OWNER_V132_DASHBOARD2_LIVE_CONNECTOR = true;

  var ENDPOINT = '/admin/pmd-owner-dashboard-clean-v1-data';
  var state = {
    active: true,
    endpoint: ENDPOINT,
    connected: false,
    lastError: null,
    lastUpdated: null,
    updates: 0,
    data: null
  };

  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c];
    });
  }

  function text(el, value) {
    if (el && value != null) el.textContent = String(value);
  }

  function money(v, fallback) {
    if (typeof v === 'string' && v.trim()) return v.trim();
    var n = Number(v);
    if (!isFinite(n)) return fallback || '€0.00';
    return '€' + n.toFixed(2);
  }

  function num(v, fallback) {
    var n = Number(v);
    return isFinite(n) ? n : (fallback || 0);
  }

  function get(obj, path, fallback) {
    var cur = obj;
    for (var i = 0; i < path.length; i++) {
      if (!cur || typeof cur !== 'object' || !(path[i] in cur)) return fallback;
      cur = cur[path[i]];
    }
    return cur == null ? fallback : cur;
  }

  function metric(data, keys) {
    keys = Array.isArray(keys) ? keys : [keys];

    var m = data && data.metrics;

    if (Array.isArray(m)) {
      for (var i = 0; i < keys.length; i++) {
        var found = m.find(function (x) {
          return String(x.key || x.name || '').toLowerCase() === String(keys[i]).toLowerCase();
        });
        if (found) return found;
      }
    }

    if (m && typeof m === 'object') {
      for (var j = 0; j < keys.length; j++) {
        if (m[keys[j]]) {
          var val = m[keys[j]];
          if (val && typeof val === 'object') return val;
          return { value: val, raw: val };
        }
      }
    }

    if (data && typeof data === 'object') {
      for (var k = 0; k < keys.length; k++) {
        if (data[keys[k]] != null) return { value: data[keys[k]], raw: data[keys[k]] };
      }
    }

    return null;
  }

  function mValue(data, keys, fallback) {
    var m = metric(data, keys);
    if (!m) return fallback;
    return m.value != null ? m.value : (m.label != null ? m.label : (m.raw != null ? m.raw : fallback));
  }

  function mRaw(data, keys, fallback) {
    var m = metric(data, keys);
    if (!m) return fallback;
    return m.raw != null ? m.raw : (m.raw_value != null ? m.raw_value : (m.value != null ? m.value : fallback));
  }

  function mNote(data, keys, fallback) {
    var m = metric(data, keys);
    if (!m) return fallback;
    return m.note || m.subtitle || m.description || fallback;
  }

  function card(title) {
    var low = String(title).toLowerCase();
    return Array.prototype.slice.call(document.querySelectorAll('.pmd-d2-card')).find(function (c) {
      var h = c.querySelector('h2');
      return h && h.textContent.trim().toLowerCase() === low;
    }) || null;
  }

  function row(label, note, value) {
    return '<div class="pmd-d2-row"><span>' + esc(label) + '<br><span class="pmd-d2-muted">' + esc(note || '') + '</span></span><b>' + esc(value == null ? '—' : value) + '</b></div>';
  }

  function actionTile(label, icon) {
    return '<div class="pmd-d2-action-tile">' + esc(icon || '') + '<br>' + esc(label) + '</div>';
  }

  function sections(data) {
    return (data && data.sections) || {};
  }

  function floorSummary(data) {
    var fp = get(data, ['sections', 'floor_plan'], {});
    var summary = fp.summary || {};
    var tables = Array.isArray(fp.tables) ? fp.tables : [];

    var total = num(summary.total || summary.tables || summary.all, tables.length || 0);
    var busy = num(summary.busy || summary.occupied || summary.active, 0);
    var free = num(summary.free || summary.available, 0);
    var reserved = num(summary.reserved, 0);

    if (!total && tables.length) total = tables.length;

    if (!busy && tables.length) {
      busy = tables.filter(function (t) {
        var st = String(t.status || t.state || t.table_status || '').toLowerCase();
        return /busy|occupied|dining|open|unpaid|payment/.test(st) || Number(t.open_orders || t.due_count || 0) > 0;
      }).length;
    }

    if (!free && total) {
      free = Math.max(0, total - busy - reserved);
    }

    return { total: total, busy: busy, free: free, reserved: reserved, tables: tables };
  }

  function recentOrders(data) {
    return get(data, ['sections', 'recent_orders'], []) || [];
  }

  function upcomingReservations(data) {
    return get(data, ['sections', 'upcoming_reservations'], []) || [];
  }

  function topItems(data) {
    return get(data, ['sections', 'top_items'], []) || [];
  }

  function kitchenData(data) {
    return get(data, ['sections', 'kitchen'], {}) || {};
  }

  function orderTotal(o) {
    if (!o) return 0;
    if (typeof o.total === 'number') return o.total;
    var s = String(o.total_label || o.total || '').replace(/[^\d.,-]/g, '').replace(',', '.');
    return Number(s) || 0;
  }

  function sumOrders(rows) {
    return rows.reduce(function (sum, o) { return sum + orderTotal(o); }, 0);
  }

  function updateKpis(data) {
    var kpis = Array.prototype.slice.call(document.querySelectorAll('.pmd-d2-kpi'));
    if (kpis.length < 4) return;

    var fs = floorSummary(data);
    var orders = recentOrders(data);
    var openChecks = mValue(data, ['open_checks', 'open_orders', 'pending_checks'], orders.length || '0');
    var openChecksRaw = num(mRaw(data, ['open_checks', 'open_orders', 'pending_checks'], openChecks), num(openChecks, 0));
    var pendingValue = mValue(data, ['pending_value', 'open_check_value', 'open_checks_value', 'unpaid_value', 'pending_payments'], null);
    var revenueToday = mValue(data, ['revenue_today', 'sales_today', 'today_revenue', 'total_sales'], '€0.00');
    var ordersToday = mValue(data, ['orders_today', 'today_orders'], '0');

    var activeText = fs.total ? (fs.busy + ' / ' + fs.total) : mValue(data, ['active_tables'], '—');
    var occPct = fs.total ? Math.round((fs.busy / fs.total) * 100) + '%' : mValue(data, ['table_occupancy'], '—');

    [
      ['Revenue Today', revenueToday, 'Live sales today'],
      ['Open Checks', String(openChecksRaw || openChecks || 0), (pendingValue ? pendingValue : money(sumOrders(orders))) + ' pending value'],
      ['Active Tables', activeText, occPct + ' occupied · ' + fs.free + ' free'],
      ['Orders Today', String(ordersToday), String(openChecksRaw || openChecks || 0) + ' open checks now']
    ].forEach(function (x, i) {
      var h = kpis[i].querySelector('h3');
      var strong = kpis[i].querySelector('strong');
      var p = kpis[i].querySelector('p');
      text(h, x[0]);
      text(strong, x[1]);
      text(p, x[2]);
      kpis[i].classList.add('pmd-d2-live-updated');
    });
  }

  function updatePriorityCards(data) {
    var fs = floorSummary(data);
    var orders = recentOrders(data);
    var reservations = upcomingReservations(data);
    var k = kitchenData(data);

    var openChecks = num(mRaw(data, ['open_checks', 'open_orders', 'pending_checks'], orders.length || 0), orders.length || 0);
    var pendingValue = mValue(data, ['pending_value', 'open_check_value', 'open_checks_value', 'unpaid_value', 'pending_payments'], money(sumOrders(orders)));
    var delayed = num(k.delayed || k.delayed_orders || mRaw(data, ['delayed_orders', 'kitchen_queue'], 0), 0);

    var payment = card('Payment Waiting');
    if (payment) {
      var rows = payment.querySelectorAll('.pmd-d2-row');
      if (rows[0]) rows[0].outerHTML = row('Pending value', openChecks + ' open checks unpaid', pendingValue);
      if (rows[1]) rows[1].outerHTML = row('Action', openChecks > 0 ? 'Follow up before checkout' : 'No payment action needed', openChecks > 0 ? 'Now' : 'Clear');
    }

    var kitchen = card('Kitchen Clear');
    if (kitchen) {
      var kRows = kitchen.querySelectorAll('.pmd-d2-row');
      if (kRows[0]) kRows[0].outerHTML = row('Delayed orders', delayed ? 'Kitchen needs attention' : 'No delayed rows detected', delayed);
      if (kRows[1]) kRows[1].outerHTML = row('On-time rate', 'From kitchen rows', delayed ? 'Check' : '100%');
    }

    var tables = card('Table Status');
    if (tables) {
      var tRows = tables.querySelectorAll('.pmd-d2-row');
      if (tRows[0]) tRows[0].outerHTML = row('Active tables', fs.total ? (Math.round((fs.busy / fs.total) * 100) + '% occupied right now') : 'Live floor data', fs.total ? fs.busy + ' / ' + fs.total : '—');
      if (tRows[1]) tRows[1].outerHTML = row('Free tables', 'Available for new guests', fs.free);
    }

    var res = card('Reservations');
    if (res) {
      var rRows = res.querySelectorAll('.pmd-d2-row');
      if (rRows[0]) rRows[0].outerHTML = row('Upcoming', reservations.length ? 'Next reservations connected' : 'No upcoming reservations', reservations.length);
      if (rRows[1]) rRows[1].outerHTML = row('Pressure', reservations.length ? 'Check upcoming arrivals' : 'No reservation pressure', reservations.length ? 'Watch' : 'Clear');
    }
  }

  function updateRecentActivity(data) {
    var c = card('Recent Activity');
    if (!c) return;

    var orders = recentOrders(data).slice(0, 3);

    if (!orders.length) {
      c.querySelectorAll('.pmd-d2-row').forEach(function (x) { x.remove(); });
      c.insertAdjacentHTML('beforeend', row('No recent orders', 'Live data connected', '—'));
      return;
    }

    var html = orders.map(function (o) {
      return row(
        'Order #' + (o.id || '—'),
        (o.table_label || o.table_ref || 'No table') + ' · ' + (o.total_label || money(o.total || 0)),
        '●'
      );
    }).join('');

    c.querySelectorAll('.pmd-d2-row').forEach(function (x) { x.remove(); });
    c.insertAdjacentHTML('beforeend', html);
  }

  function updatePaymentsAndFinance(data) {
    var orders = recentOrders(data);
    var pendingValue = mValue(data, ['pending_value', 'open_check_value', 'open_checks_value', 'unpaid_value', 'pending_payments'], money(sumOrders(orders)));
    var paidToday = mValue(data, ['paid_today', 'payments_today', 'settled_today'], '€0.00');
    var avgTicket = mValue(data, ['avg_ticket', 'average_check', 'average_order_value'], null);
    var avgFallback = orders.length ? money(sumOrders(orders) / Math.max(1, orders.length)) : '€0.00';

    var payments = card('Payments');
    if (payments) {
      var donut = payments.querySelector('.pmd-d2-donut span');
      if (donut) donut.innerHTML = esc(pendingValue) + '<br>Total';

      var rows = payments.querySelectorAll('.pmd-d2-row');
      if (rows[0]) rows[0].outerHTML = '<div class="pmd-d2-row"><span>Pending</span><b>' + esc(pendingValue) + '</b></div>';
      if (rows[1]) rows[1].outerHTML = '<div class="pmd-d2-row"><span>Paid today</span><b>' + esc(paidToday) + '</b></div>';
    }

    var avg = card('Average Guest Spend');
    if (avg) {
      var rows2 = avg.querySelectorAll('.pmd-d2-row');
      if (rows2[0]) rows2[0].outerHTML = '<div class="pmd-d2-row"><span>' + esc(avgTicket || avgFallback) + '<br><span class="pmd-d2-muted">Average Check Value</span></span></div>';
      if (rows2[1]) rows2[1].outerHTML = '<div class="pmd-d2-row"><span>' + esc(pendingValue) + '<br><span class="pmd-d2-muted">Open Check Value</span></span></div>';
    }

    var lost = card('Lost Revenue');
    if (lost) {
      var rows3 = lost.querySelectorAll('.pmd-d2-row');
      if (rows3[0]) rows3[0].outerHTML = '<div class="pmd-d2-row"><span>Confirmed lost today</span><b>' + esc(mValue(data, ['lost_revenue', 'cancelled_revenue'], '€0.00')) + '</b></div>';
      if (rows3[1]) rows3[1].outerHTML = '<div class="pmd-d2-row"><span>Pending check risk</span><b>' + esc(pendingValue) + '</b></div>';
    }
  }

  function updateRevenueByHour(data) {
    var c = card('Revenue by Hour');
    if (!c) return;

    var revenue = mValue(data, ['revenue_today', 'sales_today', 'today_revenue', 'total_sales'], '€0.00');
    var strong = c.querySelector('.pmd-d2-hour-summary strong');
    if (strong) strong.textContent = revenue;

    var rows = recentOrders(data);
    if (!rows.length) return;

    var hourMap = {};
    rows.forEach(function (o) {
      var d = new Date(o.created_at || o.date || o.updated_at || Date.now());
      var h = isFinite(d.getTime()) ? d.getHours() : 0;
      hourMap[h] = (hourMap[h] || 0) + orderTotal(o);
    });

    var hours = Object.keys(hourMap).map(Number).sort(function (a,b){ return a-b; }).slice(-8);
    if (!hours.length) return;

    var max = Math.max.apply(null, hours.map(function (h) { return hourMap[h]; })) || 1;
    var html = hours.map(function (h, idx) {
      var pct = Math.max(14, Math.round((hourMap[h] / max) * 72));
      return '<span class="' + (idx < 4 ? 'is-muted' : '') + '" style="--h:' + pct + '%"><b>' + h + '</b></span>';
    }).join('');

    var bars = c.querySelector('.pmd-d2-hour-bars');
    if (bars) bars.innerHTML = html;
  }

  function updateReservationsAndKitchen(data) {
    var reservations = upcomingReservations(data).slice(0, 2);
    var res = card('Upcoming Reservations');

    if (res) {
      res.querySelectorAll('.pmd-d2-row').forEach(function (x) { x.remove(); });

      if (!reservations.length) {
        res.insertAdjacentHTML('beforeend',
          row('—', 'No upcoming reservations', 'Clear') +
          row('Table planning', 'Reservation details will appear once connected', 'Ready')
        );
      } else {
        res.insertAdjacentHTML('beforeend', reservations.map(function (r) {
          var name = r.guest_name || r.name || 'Reservation';
          var time = [r.reserve_date, r.reserve_time, r.time].filter(Boolean).join(' ');
          var detail = (r.guests ? r.guests + ' guests' : 'Guest count —') + (r.table_ref ? ' · Table ' + r.table_ref : '');
          return row(name, time || detail, detail);
        }).join(''));
      }
    }

    var k = kitchenData(data);
    var delayed = num(k.delayed || k.delayed_orders || mRaw(data, ['delayed_orders', 'kitchen_queue'], 0), 0);
    var queue = num(k.queue || k.open || mRaw(data, ['kitchen_queue'], 0), 0);
    var ontime = delayed > 0 ? Math.max(0, Math.round(((queue - delayed) / Math.max(queue, 1)) * 100)) : 100;

    var kitchen = card('Kitchen Performance');
    if (kitchen) {
      var boxes = kitchen.querySelectorAll('.pmd-d2-kitchen-box');
      if (boxes[0]) boxes[0].innerHTML = '<small>Avg Prep Time</small><strong>' + esc(k.avg_prep_time || k.avg_prep || '—') + '</strong><span>' + esc(k.avg_prep_time ? 'from kitchen rows' : 'connect prep timestamps') + '</span>';
      if (boxes[1]) boxes[1].innerHTML = '<small>Delayed Orders</small><strong>' + esc(delayed) + '</strong><span>' + esc(delayed ? 'needs attention' : 'no delayed rows') + '</span>';
      if (boxes[2]) boxes[2].innerHTML = '<small>On-Time Rate</small><strong>' + esc(ontime) + '%</strong><span>from kitchen rows</span>';

      var rush = kitchen.querySelector('.pmd-d2-kitchen-rush strong');
      if (rush) rush.textContent = queue > 6 ? 'High' : (queue > 2 ? 'Medium' : 'Low');
    }
  }

  function updateTopItems(data) {
    var c = card('Top Selling Items');
    if (!c) return;

    var items = topItems(data).slice(0, 3);
    if (!items.length) return;

    c.querySelectorAll('.pmd-d2-row').forEach(function (x) { x.remove(); });
    c.insertAdjacentHTML('beforeend', items.map(function (it, i) {
      return row((i + 1) + ' · ' + (it.label || it.name || it.item_name || 'Item'), 'Based on open checks', it.count || it.qty || it.orders || 0);
    }).join(''));
  }

  function updateServicePerformance(data) {
    var c = document.querySelector('.pmd-d2-service-performance');
    if (!c) return;

    var fs = floorSummary(data);
    var orders = recentOrders(data);
    var openChecks = num(mRaw(data, ['open_checks', 'open_orders', 'pending_checks'], orders.length || 0), orders.length || 0);
    var pendingValue = mValue(data, ['pending_value', 'open_check_value', 'open_checks_value', 'unpaid_value', 'pending_payments'], money(sumOrders(orders)));
    var avg = mValue(data, ['avg_ticket', 'average_check', 'average_order_value'], orders.length ? money(sumOrders(orders) / Math.max(1, orders.length)) : '€0.00');

    var table = c.querySelector('.pmd-d2-service-table');
    if (!table) return;

    table.innerHTML =
      '<div class="pmd-d2-service-row pmd-d2-service-header"><b>Area</b><b>Count</b><b>Value</b><b>Status</b></div>' +
      '<div class="pmd-d2-service-row"><span><i>🍽️</i>Active tables</span><b>' + esc(fs.total ? fs.busy + ' / ' + fs.total : '—') + '</b><b>' + esc(fs.total ? Math.round((fs.busy / fs.total) * 100) + '%' : '—') + '</b><em>Live</em></div>' +
      '<div class="pmd-d2-service-row"><span><i>🧾</i>Open checks</span><b>' + esc(openChecks) + '</b><b>' + esc(pendingValue) + '</b><em>' + esc(openChecks ? 'Watch' : 'Clear') + '</em></div>' +
      '<div class="pmd-d2-service-row"><span><i>📦</i>Recent orders</span><b>' + esc(orders.length) + '</b><b>' + esc(money(sumOrders(orders))) + '</b><em>Visible</em></div>' +
      '<div class="pmd-d2-service-row"><span><i>💶</i>Avg. check</span><b>—</b><b>' + esc(avg) + '</b><em>Today</em></div>';
  }

  function updateQuickActions() {
    var c = card('Quick Actions');
    if (!c) return;

    var actions = c.querySelectorAll('.pmd-d2-action-tile');
    if (actions.length >= 4) {
      actions[0].onclick = function () { location.href = '/admin/reservations/create'; };
      actions[1].onclick = function () { location.href = '/admin/orders/create'; };
      actions[2].onclick = function () { location.href = '/admin/orders'; };
      actions[3].onclick = function () { location.href = '/admin/notifications'; };
      actions.forEach(function (a) {
        a.style.cursor = 'pointer';
        a.setAttribute('role', 'button');
        a.setAttribute('tabindex', '0');
      });
    }
  }

  function applyData(data) {
    state.data = data;
    state.connected = true;
    state.lastError = null;
    state.lastUpdated = new Date().toISOString();
    state.updates++;

    document.documentElement.classList.add('pmd-dashboard2-active', 'pmd-dashboard2-live-connected');

    updateKpis(data);
    updatePriorityCards(data);
    updateRecentActivity(data);
    updatePaymentsAndFinance(data);
    updateRevenueByHour(data);
    updateReservationsAndKitchen(data);
    updateTopItems(data);
    updateServicePerformance(data);
    updateQuickActions();

    console.info('[PMD] Dashboard2 v132 live data connected', {
      updates: state.updates,
      sections: Object.keys(sections(data)),
      metricsType: Array.isArray(data.metrics) ? 'array' : typeof data.metrics
    });
  }

  function refresh() {
    return fetch(ENDPOINT + '?ts=' + Date.now(), {
      credentials: 'same-origin',
      headers: {
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      }
    })
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(applyData)
      .catch(function (err) {
        state.connected = false;
        state.lastError = String(err && err.message ? err.message : err);
        console.warn('[PMD] Dashboard2 v132 live data failed', state.lastError);
      });
  }

  function start() {
    var tries = 0;
    var timer = setInterval(function () {
      tries++;
      if (document.querySelector('#pmd-d2-root') || tries > 80) {
        clearInterval(timer);
        refresh();
        setInterval(refresh, 60000);
      }
    }, 50);
  }

  window.PMDDashboard2Live = {
    refresh: refresh,
    debug: function () {
      var d = state.data || {};
      return {
        active: state.active,
        endpoint: state.endpoint,
        connected: state.connected,
        lastError: state.lastError,
        lastUpdated: state.lastUpdated,
        updates: state.updates,
        metricsType: Array.isArray(d.metrics) ? 'array' : typeof d.metrics,
        sections: Object.keys(sections(d)),
        recentOrders: recentOrders(d).length,
        reservations: upcomingReservations(d).length,
        topItems: topItems(d).length,
        priorityCards: document.querySelectorAll('.pmd-d2-priority-grid > .pmd-d2-card').length,
        delayedScriptsGone: Array.prototype.slice.call(document.querySelectorAll('script[id*="v125"],script[id*="v126"],script[id*="v127"]')).map(function (x) { return x.id; })
      };
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();
</script>
<!-- PMD_OWNER_V132_DASHBOARD2_LIVE_CONNECTOR_END -->


<!-- PMD_WAITER_DASHBOARD_V36_STATUS_COLORS_SELECT_DRAGFIX_START -->
<style id="pmd-waiter-dashboard-v36-status-colors-select-dragfix-style">
/*
  V36:
  1. Order card border colors ONLY by payment status.
     Normal unpaid = white / neutral border
     Paid = green
     Partial payment = orange
  2. Add Select mode for multi-order selection.
  3. Fix floor edit drag/drop so table stops moving on mouseup/pointerup.
*/

/* Reset all order-card colors. Notes/calls/no-table must NOT color card border. */
#pmd-waiter-dashboard-root article.pmd-w5-card[data-order],
#pmd-waiter-dashboard-root article.pmd-w5-card[data-order].is-note,
#pmd-waiter-dashboard-root article.pmd-w5-card[data-order].is-call,
#pmd-waiter-dashboard-root article.pmd-w5-card[data-order].needs,
#pmd-waiter-dashboard-root article.pmd-w5-card[data-order].needs-action {
  background: #ffffff !important;
  background-image: none !important;
  border: 2px solid #dbe4f0 !important;
  box-shadow: 0 14px 34px rgba(7,13,36,.08) !important;
}

/* Paid = green */
#pmd-waiter-dashboard-root article.pmd-w5-card[data-order].pmd-v36-paid {
  border-color: #16a34a !important;
  box-shadow: 0 16px 34px rgba(22,163,74,.16) !important;
}

/* Partial payment = orange */
#pmd-waiter-dashboard-root article.pmd-w5-card[data-order].pmd-v36-partial {
  border-color: #ff7a00 !important;
  box-shadow: 0 16px 34px rgba(255,122,0,.16) !important;
}

/* Selected card = blue selection ring, independent from payment status */
#pmd-waiter-dashboard-root.pmd-v36-select-mode article.pmd-w5-card[data-order] {
  cursor: pointer !important;
}

#pmd-waiter-dashboard-root article.pmd-w5-card[data-order].pmd-v36-selected {
  outline: 4px solid rgba(37,99,235,.28) !important;
  outline-offset: 3px !important;
}

/* Selection check mark */
#pmd-waiter-dashboard-root article.pmd-w5-card[data-order] .pmd-v36-check {
  position: absolute !important;
  right: 66px !important;
  top: 18px !important;
  width: 34px !important;
  height: 34px !important;
  border-radius: 999px !important;
  border: 2px solid #2563eb !important;
  background: #ffffff !important;
  color: #2563eb !important;
  display: none !important;
  place-items: center !important;
  font-size: 18px !important;
  font-weight: 1000 !important;
  z-index: 20 !important;
  box-shadow: 0 8px 20px rgba(37,99,235,.18) !important;
}

#pmd-waiter-dashboard-root.pmd-v36-select-mode article.pmd-w5-card[data-order] .pmd-v36-check {
  display: grid !important;
}

#pmd-waiter-dashboard-root article.pmd-w5-card[data-order].pmd-v36-selected .pmd-v36-check {
  background: #2563eb !important;
  color: #ffffff !important;
}

/* Select button beside filters */
#pmd-waiter-dashboard-root .pmd-v36-select-btn {
  border: 2px solid #070d24 !important;
  background: #ffffff !important;
  color: #070d24 !important;
  border-radius: 999px !important;
  min-height: 38px !important;
  padding: 0 18px !important;
  font-weight: 1000 !important;
  cursor: pointer !important;
}

#pmd-waiter-dashboard-root.pmd-v36-select-mode .pmd-v36-select-btn {
  background: #070d24 !important;
  color: #ffffff !important;
}

/* Selection action bar */
#pmd-waiter-dashboard-root .pmd-v36-select-bar {
  display: none !important;
  align-items: center !important;
  justify-content: space-between !important;
  gap: 14px !important;
  margin: 12px 0 18px 0 !important;
  padding: 14px 16px !important;
  border: 2px solid #bfdbfe !important;
  border-radius: 18px !important;
  background: #eff6ff !important;
  color: #061126 !important;
}

#pmd-waiter-dashboard-root.pmd-v36-select-mode .pmd-v36-select-bar {
  display: flex !important;
}

#pmd-waiter-dashboard-root .pmd-v36-selected-info {
  font-weight: 1000 !important;
  font-size: 15px !important;
}

#pmd-waiter-dashboard-root .pmd-v36-select-actions {
  display: flex !important;
  gap: 10px !important;
  align-items: center !important;
}

#pmd-waiter-dashboard-root .pmd-v36-pay-selected,
#pmd-waiter-dashboard-root .pmd-v36-clear-selected {
  min-height: 42px !important;
  border-radius: 14px !important;
  padding: 0 16px !important;
  font-weight: 1000 !important;
  cursor: pointer !important;
}

#pmd-waiter-dashboard-root .pmd-v36-pay-selected {
  background: #070d24 !important;
  color: #ffffff !important;
  border: 0 !important;
}

#pmd-waiter-dashboard-root .pmd-v36-clear-selected {
  background: #ffffff !important;
  color: #070d24 !important;
  border: 2px solid #cbd5e1 !important;
}

/* Dragging floor table in edit mode */
#pmd-waiter-dashboard-root .pmd-v36-dragging-table {
  z-index: 99999 !important;
  cursor: grabbing !important;
  opacity: .96 !important;
  box-shadow: 0 20px 48px rgba(7,13,36,.28) !important;
}

#pmd-waiter-dashboard-root.pmd-v36-floor-dragging,
#pmd-waiter-dashboard-root.pmd-v36-floor-dragging * {
  user-select: none !important;
}
</style>

<script id="pmd-waiter-dashboard-v36-status-colors-select-dragfix-script">
(function () {
  if (!/\/admin\/dashboardwaiter(?:$|[?#])/.test(location.pathname + location.search + location.hash)) return;
  if (window.PMD_WAITER_DASHBOARD_V36_STATUS_COLORS_SELECT_DRAGFIX) return;
  window.PMD_WAITER_DASHBOARD_V36_STATUS_COLORS_SELECT_DRAGFIX = true;

  var selected = new Set();
  var selectMode = false;
  var drag = null;

  function root() {
    return document.querySelector('#pmd-waiter-dashboard-root');
  }

  function clean(s) {
    return String(s || '').replace(/\s+/g, ' ').trim();
  }

  function cards() {
    var r = root();
    if (!r) return [];
    return Array.from(r.querySelectorAll('article.pmd-w5-card[data-order]'));
  }

  function getOrderId(card) {
    return clean(card.getAttribute('data-order'));
  }

  function euroNumber(s) {
    var m = String(s || '').match(/€\s*([0-9]+(?:[.,][0-9]+)?)/);
    if (!m) return 0;
    return Number(m[1].replace(',', '.')) || 0;
  }

  function cardTotal(card) {
    var boxes = Array.from(card.querySelectorAll('.pmd-w5-box'));
    for (var i = 0; i < boxes.length; i++) {
      var t = clean(boxes[i].textContent);
      if (/TOTAL/i.test(t)) return euroNumber(t);
    }
    return euroNumber(card.textContent);
  }

  function detectPaymentStatus(card) {
    var raw = [
      card.className || '',
      card.getAttribute('data-status') || '',
      card.getAttribute('data-payment-status') || '',
      card.getAttribute('data-payment') || '',
      card.getAttribute('data-paid') || ''
    ].join(' ').toLowerCase();

    if (/partial|partially|part-paid|part_paid|partial-paid|split-paid/.test(raw)) return 'partial';
    if (/(^|\s)(paid|settled|completed|complete|payment-complete|fully-paid)(\s|$)/.test(raw)) return 'paid';

    var visibleText = clean(card.textContent).toLowerCase();

    if (/partial payment|partially paid|partial paid/.test(visibleText)) return 'partial';

    // Do not match the normal "Payment" button as paid.
    var hasPaymentButton = !!card.querySelector('button[data-pay-one], button[data-pay], button');

    if (!hasPaymentButton && /\bpaid\b|\bsettled\b/.test(visibleText)) return 'paid';

    return 'normal';
  }

  function applyPaymentColors() {
    cards().forEach(function (card) {
      card.classList.remove('pmd-v36-paid', 'pmd-v36-partial', 'pmd-v36-normal');

      var status = detectPaymentStatus(card);

      if (status === 'paid') {
        card.classList.add('pmd-v36-paid');
      } else if (status === 'partial') {
        card.classList.add('pmd-v36-partial');
      } else {
        card.classList.add('pmd-v36-normal');
      }
    });
  }

  function ensureSelectButton() {
    var r = root();
    if (!r) return;

    if (r.querySelector('.pmd-v36-select-btn')) return;

    var allButtons = Array.from(r.querySelectorAll('button'));
    var allActive = allButtons.find(function (b) {
      return clean(b.textContent) === 'All Active Orders';
    });

    var myTables = allButtons.find(function (b) {
      return clean(b.textContent) === 'My Tables';
    });

    var anchor = allActive || myTables;
    if (!anchor) return;

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'pmd-v36-select-btn';
    btn.textContent = 'Select';

    btn.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      toggleSelectMode();
    });

    anchor.insertAdjacentElement('afterend', btn);

    ensureSelectBar(anchor.parentElement || anchor.closest('div') || r);
  }

  function ensureSelectBar(parent) {
    var r = root();
    if (!r || r.querySelector('.pmd-v36-select-bar')) return;

    var bar = document.createElement('div');
    bar.className = 'pmd-v36-select-bar';
    bar.innerHTML =
      '<div class="pmd-v36-selected-info">0 selected · Total €0.00</div>' +
      '<div class="pmd-v36-select-actions">' +
        '<button type="button" class="pmd-v36-pay-selected">Pay Selected</button>' +
        '<button type="button" class="pmd-v36-clear-selected">Cancel</button>' +
      '</div>';

    var activeTitle = Array.from(r.querySelectorAll('h1,h2,h3')).find(function (h) {
      return /Active Order Cards/i.test(clean(h.textContent));
    });

    if (activeTitle && activeTitle.parentElement) {
      var filterRow = activeTitle.parentElement.querySelector('div');
      if (filterRow) filterRow.insertAdjacentElement('afterend', bar);
      else activeTitle.insertAdjacentElement('afterend', bar);
    } else if (parent) {
      parent.insertAdjacentElement('afterend', bar);
    } else {
      r.insertBefore(bar, r.firstChild);
    }

    bar.querySelector('.pmd-v36-clear-selected').addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      clearSelection();
      setSelectMode(false);
    });

    bar.querySelector('.pmd-v36-pay-selected').addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      paySelected();
    });
  }

  function ensureCardChecks() {
    cards().forEach(function (card) {
      if (card.querySelector(':scope > .pmd-v36-check')) return;

      var check = document.createElement('div');
      check.className = 'pmd-v36-check';
      check.textContent = '✓';

      card.appendChild(check);
    });
  }

  function setUnderlyingCheckbox(card, checked) {
    var input = card.querySelector('input[type="checkbox"][data-select-order], input[type="checkbox"]');
    if (!input) return;

    input.checked = !!checked;
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function setSelectMode(on) {
    selectMode = !!on;

    var r = root();
    if (r) r.classList.toggle('pmd-v36-select-mode', selectMode);

    var btn = r && r.querySelector('.pmd-v36-select-btn');
    if (btn) btn.textContent = selectMode ? 'Selecting' : 'Select';

    if (!selectMode) clearSelection();

    updateSelectBar();
  }

  function toggleSelectMode() {
    setSelectMode(!selectMode);
  }

  function toggleCard(card) {
    var id = getOrderId(card);
    if (!id) return;

    if (selected.has(id)) {
      selected.delete(id);
      card.classList.remove('pmd-v36-selected');
      setUnderlyingCheckbox(card, false);
    } else {
      selected.add(id);
      card.classList.add('pmd-v36-selected');
      setUnderlyingCheckbox(card, true);
    }

    updateSelectBar();
  }

  function clearSelection() {
    selected.clear();

    cards().forEach(function (card) {
      card.classList.remove('pmd-v36-selected');
      setUnderlyingCheckbox(card, false);
    });

    updateSelectBar();
  }

  function updateSelectBar() {
    var r = root();
    if (!r) return;

    cards().forEach(function (card) {
      var id = getOrderId(card);
      card.classList.toggle('pmd-v36-selected', id && selected.has(id));
    });

    var total = 0;
    cards().forEach(function (card) {
      var id = getOrderId(card);
      if (id && selected.has(id)) total += cardTotal(card);
    });

    var info = r.querySelector('.pmd-v36-selected-info');
    if (info) {
      info.textContent = selected.size + ' selected · Total €' + total.toFixed(2);
    }

    var pay = r.querySelector('.pmd-v36-pay-selected');
    if (pay) {
      pay.disabled = selected.size === 0;
      pay.style.opacity = selected.size === 0 ? '.55' : '1';
    }
  }

  function paySelected() {
    var ids = Array.from(selected);
    if (!ids.length) return;

    // If there is one selected order, use the existing payment button.
    if (ids.length === 1) {
      var card = cards().find(function (c) {
        return getOrderId(c) === ids[0];
      });

      var payOne = card && card.querySelector('button[data-pay-one], button[data-pay]');
      if (payOne) {
        payOne.click();
        return;
      }
    }

    // Try native/batch hook if the project has one.
    var nativeBatch = document.querySelector('[data-pay-selected], [data-pay-selected-orders], [data-pay-batch], [data-pay-many]');
    if (nativeBatch) {
      nativeBatch.setAttribute('data-selected-orders', ids.join(','));
      nativeBatch.click();
      return;
    }

    var total = 0;
    cards().forEach(function (card) {
      var id = getOrderId(card);
      if (id && selected.has(id)) total += cardTotal(card);
    });

    alert(
      'Selected orders: ' + ids.join(', ') +
      '\nTotal: €' + total.toFixed(2) +
      '\n\nSelection is ready. A real combined payment endpoint still needs to be connected if the backend does not already support batch payment.'
    );
  }

  function bindCardSelection() {
    var r = root();
    if (!r || r.__pmdV36SelectionBound) return;

    r.__pmdV36SelectionBound = true;

    r.addEventListener('click', function (e) {
      if (!selectMode) return;

      var card = e.target.closest('article.pmd-w5-card[data-order]');
      if (!card || !r.contains(card)) return;

      if (e.target.closest('button, a, input, select, textarea')) {
        return;
      }

      e.preventDefault();
      e.stopPropagation();

      toggleCard(card);
    }, true);
  }

  function isEditMode() {
    var r = root();
    var st = window.PMDWaiterFloorToolbar && PMDWaiterFloorToolbar.state
      ? PMDWaiterFloorToolbar.state
      : {};

    return !!(
      st.edit ||
      (r && (
        r.classList.contains('pmd-w19-editing') ||
        r.classList.contains('pmd-v21-editing') ||
        r.classList.contains('pmd-v22-editing')
      ))
    );
  }

  function floorMap() {
    return document.querySelector('#pmd-waiter-dashboard-root .pmd-w5-floor-map-real');
  }

  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }

  function startDrag(e) {
    if (!isEditMode()) return;

    var table = ((e && e.target && e.target.nodeType === 1) ? e.target.closest('#pmd-waiter-dashboard-root .pmd-w5-floor-map-real .pmd-w5-table[data-table]') : null);
    if (!table) return;

    if (e.target.closest('button, .pmd-w19-unmerge, .pmd-v18-unmerge')) return;

    var map = floorMap();
    if (!map) return;

    var mapRect = map.getBoundingClientRect();
    var tableRect = table.getBoundingClientRect();

    drag = {
      table: table,
      map: map,
      offsetX: e.clientX - tableRect.left,
      offsetY: e.clientY - tableRect.top
    };

    table.classList.add('pmd-v36-dragging-table');
    root()?.classList.add('pmd-v36-floor-dragging');

    table.style.setProperty('position', 'absolute', 'important');
    table.style.setProperty('right', 'auto', 'important');
    table.style.setProperty('bottom', 'auto', 'important');
    table.style.setProperty('transform', 'none', 'important');

    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
  }

  function moveDrag(e) {
    if (!drag) return;

    var mapRect = drag.map.getBoundingClientRect();
    var table = drag.table;

    var tableW = table.offsetWidth || 80;
    var tableH = table.offsetHeight || 60;

    var xPx = e.clientX - mapRect.left - drag.offsetX;
    var yPx = e.clientY - mapRect.top - drag.offsetY;

    var maxX = Math.max(0, mapRect.width - tableW);
    var maxY = Math.max(0, mapRect.height - tableH);

    xPx = clamp(xPx, 0, maxX);
    yPx = clamp(yPx, 0, maxY);

    var leftPct = (xPx / mapRect.width) * 100;
    var topPct = (yPx / mapRect.height) * 100;

    table.style.setProperty('left', leftPct.toFixed(4) + '%', 'important');
    table.style.setProperty('top', topPct.toFixed(4) + '%', 'important');

    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
  }

  function endDrag(e) {
    if (!drag) return;

    drag.table.classList.remove('pmd-v36-dragging-table');
    root()?.classList.remove('pmd-v36-floor-dragging');

    drag = null;

    if (e) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
    }
  }

  // Window capture runs before the old document handlers. This prevents the old drag bug.
  window.addEventListener('pointerdown', startDrag, true);
  window.addEventListener('pointermove', moveDrag, true);
  window.addEventListener('pointerup', endDrag, true);
  window.addEventListener('pointercancel', endDrag, true);
  window.addEventListener('blur', endDrag, true);

  // Mouse fallback.
  window.addEventListener('mousedown', startDrag, true);
  window.addEventListener('mousemove', moveDrag, true);
  window.addEventListener('mouseup', endDrag, true);

  function run() {
    applyPaymentColors();
    ensureSelectButton();
    ensureCardChecks();
    bindCardSelection();
    updateSelectBar();
  }

  document.addEventListener('pmd-waiter-dashboard-rendered', function () {
    run();
    setTimeout(run, 60);
    setTimeout(run, 220);
  }, true);

  document.addEventListener('click', function () {
    setTimeout(run, 120);
  }, true);

  setTimeout(run, 200);
  setTimeout(run, 900);
  setTimeout(run, 1800);

  window.PMDWaiterV36 = {
    run: run,
    colors: applyPaymentColors,
    selectMode: setSelectMode,
    clearSelection: clearSelection,
    selected: function () { return Array.from(selected); },
    dragEnd: endDrag,
    debug: function () {
      return {
        selectMode: selectMode,
        selected: Array.from(selected),
        cards: cards().slice(0, 20).map(function (card) {
          return {
            order: getOrderId(card),
            table: card.getAttribute('data-table'),
            classes: card.className,
            detectedPaymentStatus: detectPaymentStatus(card),
            total: cardTotal(card),
            borderColor: getComputedStyle(card).borderColor
          };
        }),
        editMode: isEditMode(),
        dragging: !!drag
      };
    }
  };

  console.info('[PMD] Waiter Dashboard V36 status colors + select mode + drag/drop fix active');
})();
</script>
<!-- PMD_WAITER_DASHBOARD_V36_STATUS_COLORS_SELECT_DRAGFIX_END -->


<!-- PMD_WAITER_DASHBOARD_V40_AUTHORITATIVE_COMPACT_MERGE_START -->
<style id="pmd-waiter-dashboard-v40-authoritative-compact-merge-style">
/*
  V40:
  Real compact floor fix.
  - remove V39 jump
  - hide old V19 merged icon only in compact mode
  - create one stable V40 merged icon from backend merge endpoint
  - sort compact icons by real floor endpoint positions
  - no opacity gate, no delayed show
*/

#pmd-waiter-dashboard-root .pmd-w5-floor-map-real.pmd-v40-compact-authority {
  display: flex !important;
  flex-wrap: nowrap !important;
  align-items: center !important;
  justify-content: flex-start !important;
  gap: 12px !important;
  height: 112px !important;
  min-height: 112px !important;
  padding: 16px !important;
  overflow-x: auto !important;
  overflow-y: hidden !important;
}

/* Hide old V19/V18 merged icons in compact because they are the jumping source */
#pmd-waiter-dashboard-root .pmd-w5-floor-map-real.pmd-v40-compact-authority .pmd-w19-merged-table:not(.pmd-v40-merged-table),
#pmd-waiter-dashboard-root .pmd-w5-floor-map-real.pmd-v40-compact-authority .pmd-v18-merged-table:not(.pmd-v40-merged-table) {
  display: none !important;
  visibility: hidden !important;
  opacity: 0 !important;
}

/* Compact normal table */
#pmd-waiter-dashboard-root .pmd-w5-floor-map-real.pmd-v40-compact-authority .pmd-w5-table {
  position: relative !important;
  left: auto !important;
  top: auto !important;
  right: auto !important;
  bottom: auto !important;
  transform: none !important;
  width: 82px !important;
  height: 62px !important;
  min-width: 82px !important;
  min-height: 62px !important;
  flex: 0 0 82px !important;
  margin: 0 !important;
  opacity: 1 !important;
  transition: none !important;
  animation: none !important;
}

/* Hide member tables represented by merged icon */
#pmd-waiter-dashboard-root .pmd-w5-floor-map-real.pmd-v40-compact-authority .pmd-w19-in-merge,
#pmd-waiter-dashboard-root .pmd-w5-floor-map-real.pmd-v40-compact-authority .pmd-v18-in-merge,
#pmd-waiter-dashboard-root .pmd-w5-floor-map-real.pmd-v40-compact-authority .pmd-v40-in-merge {
  display: none !important;
  visibility: hidden !important;
  width: 0 !important;
  min-width: 0 !important;
  flex: 0 0 0 !important;
  margin: 0 !important;
  padding: 0 !important;
}

/* Our stable merged icon */
#pmd-waiter-dashboard-root .pmd-w5-floor-map-real.pmd-v40-compact-authority .pmd-v40-merged-table {
  position: relative !important;
  left: auto !important;
  top: auto !important;
  right: auto !important;
  bottom: auto !important;
  transform: none !important;
  width: 116px !important;
  min-width: 116px !important;
  height: 66px !important;
  min-height: 66px !important;
  flex: 0 0 116px !important;
  margin: 0 !important;
  border-radius: 18px !important;
  border: 3px solid #061126 !important;
  background: #22c55e !important;
  color: #061126 !important;
  display: grid !important;
  place-items: center !important;
  text-align: center !important;
  box-shadow: 0 12px 26px rgba(22,163,74,.22) !important;
  opacity: 1 !important;
  transition: none !important;
  animation: none !important;
}

#pmd-waiter-dashboard-root .pmd-v40-merged-main {
  font-size: 20px !important;
  line-height: 1 !important;
  font-weight: 1000 !important;
}

#pmd-waiter-dashboard-root .pmd-v40-merged-sub {
  font-size: 10px !important;
  font-weight: 900 !important;
  margin-top: 3px !important;
}

#pmd-waiter-dashboard-root .pmd-v40-unmerge {
  position: absolute !important;
  top: -12px !important;
  right: -12px !important;
  width: 26px !important;
  height: 26px !important;
  border-radius: 999px !important;
  border: 0 !important;
  background: #ef3340 !important;
  color: #ffffff !important;
  font-size: 17px !important;
  font-weight: 1000 !important;
  line-height: 1 !important;
  display: grid !important;
  place-items: center !important;
  padding: 0 !important;
  cursor: pointer !important;
  box-shadow: 0 8px 18px rgba(239,51,64,.28) !important;
  z-index: 5 !important;
}
</style>

<script id="pmd-waiter-dashboard-v40-authoritative-compact-merge-script">
(function () {
  if (!/\/admin\/dashboardwaiter(?:$|[?#])/.test(location.pathname + location.search + location.hash)) return;
  if (window.PMD_WAITER_DASHBOARD_V40_AUTHORITATIVE_COMPACT_MERGE) return;
  window.PMD_WAITER_DASHBOARD_V40_AUTHORITATIVE_COMPACT_MERGE = true;

  var floorRows = [];
  var mergeRows = [];
  var loadedAt = 0;

  function root() {
    return document.querySelector('#pmd-waiter-dashboard-root');
  }

  function map() {
    return document.querySelector('#pmd-waiter-dashboard-root .pmd-w5-floor-map-real');
  }

  function clean(s) {
    return String(s || '').replace(/\s+/g, ' ').trim();
  }

  function arr(v) {
    if (Array.isArray(v)) return v;
    if (v && typeof v === 'object') return Object.values(v);
    return [];
  }

  function tableNoFromRow(row) {
    var candidates = [
      row.table_no, row.table_number, row.number, row.no, row.label, row.name,
      row.table, row.table_name, row.table_id, row.id
    ];

    for (var i = 0; i < candidates.length; i++) {
      var m = clean(candidates[i]).match(/\d+/);
      if (m) return m[0];
    }

    return '';
  }

  function num(v) {
    if (v == null) return null;
    var n = parseFloat(String(v).replace('%', ''));
    return Number.isFinite(n) ? n : null;
  }

  function posFromRow(row, fallbackNo) {
    var x = null;
    var y = null;

    [
      ['x', 'y'],
      ['left', 'top'],
      ['pos_x', 'pos_y'],
      ['position_x', 'position_y'],
      ['floor_x', 'floor_y'],
      ['layout_x', 'layout_y']
    ].some(function (pair) {
      x = num(row[pair[0]]);
      y = num(row[pair[1]]);
      return x !== null && y !== null;
    });

    if (x === null || y === null) {
      var n = Number(fallbackNo) || 999;
      x = n * 10;
      y = Math.floor(n / 5) * 10;
    }

    return { x: x, y: y };
  }

  function normalizeFloorJson(json) {
    var rows =
      json.tables ||
      json.floor_tables ||
      json.data ||
      json.results ||
      json.items ||
      [];

    floorRows = arr(rows).map(function (row) {
      var n = tableNoFromRow(row);
      var p = posFromRow(row, n);
      return { no: String(n), x: p.x, y: p.y, raw: row };
    }).filter(function (x) {
      return x.no;
    });
  }

  function membersFromMerge(row) {
    var candidates = [
      row.tables,
      row.table_numbers,
      row.tableNumbers,
      row.members,
      row.member_tables,
      row.table_list
    ];

    for (var i = 0; i < candidates.length; i++) {
      var v = candidates[i];

      if (Array.isArray(v)) {
        var a = v.map(function (x) {
          var m = clean(x).match(/\d+/);
          return m ? m[0] : '';
        }).filter(Boolean);

        if (a.length) return a;
      }

      if (typeof v === 'string' && clean(v)) {
        var s = clean(v).split(/[^0-9]+/).filter(Boolean);
        if (s.length) return s;
      }
    }

    var raw = clean([
      row.merge_key,
      row.merge_id,
      row.label,
      row.name,
      row.title
    ].join(' '));

    return raw.split(/[^0-9]+/).filter(Boolean);
  }

  function normalizeMergesJson(json) {
    var rows =
      json.merges ||
      json.data ||
      json.results ||
      json.items ||
      [];

    mergeRows = arr(rows).map(function (row) {
      var members = membersFromMerge(row);

      return {
        id: row.id || row.merge_id || row.mergeId || row.key || '',
        merge_id: row.merge_id || row.mergeId || row.id || '',
        members: members,
        raw: row
      };
    }).filter(function (x) {
      return x.members.length >= 2;
    });
  }

  async function loadData() {
    try {
      var ts = Date.now();

      var floorRes = await fetch('/admin/pmd-waiter-dashboard-v9-floor-tables?ts=' + ts, {
        credentials: 'same-origin',
        headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' }
      });

      normalizeFloorJson(await floorRes.json());

      var mergeRes = await fetch('/admin/pmd-waiter-dashboard-v20-table-merges?ts=' + ts, {
        credentials: 'same-origin',
        headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' }
      });

      normalizeMergesJson(await mergeRes.json());

      loadedAt = Date.now();
    } catch (err) {
      console.warn('[PMD] V40 compact floor data load failed', err);
    }
  }

  function isCompact() {
    var r = root();
    var m = map();

    var st = window.PMDWaiterFloorToolbar && PMDWaiterFloorToolbar.state
      ? PMDWaiterFloorToolbar.state
      : {};

    return !!(
      st.compact ||
      (r && /compact/i.test(r.className)) ||
      (m && /compact/i.test(m.className))
    );
  }

  function baseTables() {
    var m = map();
    if (!m) return [];

    return Array.from(m.querySelectorAll('.pmd-w5-table[data-table]'));
  }

  function tableNoFromEl(el) {
    return clean(el.getAttribute('data-table'));
  }

  function orderMap() {
    var rows = floorRows.slice();

    if (!rows.length) {
      rows = baseTables().map(function (el) {
        var n = tableNoFromEl(el);
        return { no: n, x: Number(n) || 999, y: Math.floor((Number(n) || 999) / 5) * 10 };
      });
    }

    var grouped = [];

    rows.sort(function (a, b) {
      return a.y - b.y || a.x - b.x || Number(a.no) - Number(b.no);
    }).forEach(function (item) {
      var row = grouped.find(function (r) {
        return Math.abs(r.y - item.y) <= 8;
      });

      if (!row) {
        row = { y: item.y, items: [] };
        grouped.push(row);
      }

      row.items.push(item);
      row.y = row.items.reduce(function (sum, x) { return sum + x.y; }, 0) / row.items.length;
    });

    grouped.sort(function (a, b) {
      return a.y - b.y;
    });

    var map = new Map();

    grouped.forEach(function (row, rowIndex) {
      row.items.sort(function (a, b) {
        return a.x - b.x || Number(a.no) - Number(b.no);
      });

      row.items.forEach(function (item, itemIndex) {
        map.set(String(item.no), rowIndex * 1000 + itemIndex * 10);
      });
    });

    return map;
  }

  function removeV40Icons() {
    var m = map();
    if (!m) return;

    m.querySelectorAll('.pmd-v40-merged-table').forEach(function (el) {
      el.remove();
    });
  }

  async function unmerge(row) {
    var token =
      document.querySelector('meta[name="csrf-token"]')?.content ||
      document.querySelector('input[name="_token"]')?.value ||
      '';

    var body = new URLSearchParams();
    if (token) body.set('_token', token);
    if (row.id) body.set('id', row.id);
    if (row.merge_id) body.set('merge_id', row.merge_id);
    body.set('tables', row.members.join(','));

    try {
      await fetch('/admin/pmd-waiter-dashboard-v20-unmerge-tables', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          Accept: 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
        },
        body: body.toString()
      });

      await loadData();
      apply();
    } catch (err) {
      console.warn('[PMD] V40 unmerge failed', err);
    }
  }

  function createMergeIcon(row, order) {
    var el = document.createElement('div');

    el.className = 'pmd-v40-merged-table';
    el.setAttribute('data-v40-merge-id', clean(row.id || row.merge_id || ''));
    el.setAttribute('data-tables', row.members.join(','));
    el.style.setProperty('order', String(order), 'important');

    el.innerHTML =
      '<button type="button" class="pmd-v40-unmerge" title="Unmerge">×</button>' +
      '<div>' +
        '<div class="pmd-v40-merged-main">' + row.members.join('+') + '</div>' +
        '<div class="pmd-v40-merged-sub">Merged table</div>' +
      '</div>';

    el.querySelector('.pmd-v40-unmerge').addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      unmerge(row);
    });

    return el;
  }

  function apply() {
    var m = map();
    if (!m) return;

    var compact = isCompact();

    m.classList.toggle('pmd-v40-compact-authority', compact);

    removeV40Icons();

    baseTables().forEach(function (el) {
      el.classList.remove('pmd-v40-in-merge');
      el.style.removeProperty('order');
    });

    if (!compact) return;

    var om = orderMap();
    var tables = baseTables();

    tables.forEach(function (el) {
      var n = tableNoFromEl(el);
      var o = om.get(String(n));

      if (o == null) o = Number(n) * 10 || 9999;

      el.style.setProperty('order', String(o), 'important');
    });

    mergeRows.forEach(function (row) {
      row.members.forEach(function (n) {
        var member = tables.find(function (el) {
          return tableNoFromEl(el) === String(n);
        });

        if (member) member.classList.add('pmd-v40-in-merge');
      });

      var orders = row.members.map(function (n) {
        return om.get(String(n));
      }).filter(function (x) {
        return Number.isFinite(x);
      });

      var order = orders.length
        ? Math.round(orders.reduce(function (sum, x) { return sum + x; }, 0) / orders.length)
        : 9999;

      m.appendChild(createMergeIcon(row, order));
    });
  }

  async function run() {
    if (!loadedAt || Date.now() - loadedAt > 15000) {
      await loadData();
    }

    apply();
  }

  document.addEventListener('pmd-waiter-dashboard-rendered', function () {
    run();
    setTimeout(apply, 40);
    setTimeout(apply, 160);
  }, true);

  document.addEventListener('click', function () {
    setTimeout(run, 80);
  }, true);

  setTimeout(run, 150);
  setTimeout(run, 800);
  setTimeout(run, 1600);

  window.PMDWaiterV40CompactMerge = {
    run: run,
    reload: async function () { await loadData(); apply(); },
    apply: apply,
    debug: function () {
      var m = map();

      return {
        compact: isCompact(),
        mapClass: m ? m.className : '',
        floorRows: floorRows,
        mergeRows: mergeRows,
        loadedAt: loadedAt,
        oldMergedVisible: m ? Array.from(m.querySelectorAll('.pmd-w19-merged-table:not(.pmd-v40-merged-table), .pmd-v18-merged-table:not(.pmd-v40-merged-table)')).map(function (el) {
          var cs = getComputedStyle(el);
          return { text: clean(el.textContent), display: cs.display, opacity: cs.opacity, order: el.style.order };
        }) : [],
        v40Merged: m ? Array.from(m.querySelectorAll('.pmd-v40-merged-table')).map(function (el) {
          var cs = getComputedStyle(el);
          return { text: clean(el.textContent), tables: el.getAttribute('data-tables'), display: cs.display, order: el.style.order };
        }) : [],
        tables: baseTables().map(function (el) {
          var cs = getComputedStyle(el);
          return {
            table: tableNoFromEl(el),
            display: cs.display,
            order: el.style.order,
            hidden: el.classList.contains('pmd-v40-in-merge') || el.classList.contains('pmd-w19-in-merge')
          };
        })
      };
    }
  };

  console.info('[PMD] Waiter Dashboard V40 authoritative compact merge active');
})();
</script>
<!-- PMD_WAITER_DASHBOARD_V40_AUTHORITATIVE_COMPACT_MERGE_END -->


<!-- PMD_WAITER_DASHBOARD_V41_FLAT_BOARD_FRAMES_START -->
<style id="pmd-waiter-dashboard-v41-flat-board-frames-style">
/*
  V41:
  Remove the big outer card frames around:
  - Waiter Floor
  - Active Order Cards

  Keep the internal functional DOM, because V5/V19/V36 scripts depend on it.
*/

/* Main outer wrappers become invisible/flat */
#pmd-waiter-dashboard-root section.pmd-w5-board.pmd-v41-flat-board {
  background: transparent !important;
  background-image: none !important;
  border: 0 !important;
  box-shadow: none !important;
  outline: 0 !important;
  padding: 0 !important;
  margin: 18px 0 0 0 !important;
  border-radius: 0 !important;
  overflow: visible !important;
}

/* Header rows no longer sit inside a big card */
#pmd-waiter-dashboard-root section.pmd-w5-board.pmd-v41-flat-board > .pmd-w5-head {
  background: transparent !important;
  border: 0 !important;
  box-shadow: none !important;
  padding: 0 !important;
  margin: 0 0 12px 0 !important;
}

/* Tabs/actions stay clean */
#pmd-waiter-dashboard-root section.pmd-w5-board.pmd-v41-flat-board > .pmd-w5-tabs {
  background: transparent !important;
  border: 0 !important;
  box-shadow: none !important;
  padding: 0 !important;
  margin: 0 0 14px 0 !important;
}

/* Order cards grid should not have another frame */
#pmd-waiter-dashboard-root section.pmd-w5-board.pmd-v41-orders-board > .pmd-w5-grid {
  background: transparent !important;
  border: 0 !important;
  box-shadow: none !important;
  padding: 0 !important;
  margin: 0 !important;
}

/* Hide empty legacy selected-note/batch wrappers when not used */
#pmd-waiter-dashboard-root section.pmd-w5-board.pmd-v41-orders-board > .pmd-w5-selected-note:empty {
  display: none !important;
}

#pmd-waiter-dashboard-root section.pmd-w5-board.pmd-v41-orders-board > .pmd-w5-batch:not(.is-active) {
  display: none !important;
}

/* Floor board outer frame removed */
#pmd-waiter-dashboard-root section.pmd-w5-board.pmd-v41-floor-board {
  margin-top: 16px !important;
}

/* Keep only the actual floor map boundary, not the outer board boundary */
#pmd-waiter-dashboard-root section.pmd-w5-board.pmd-v41-floor-board .pmd-w5-floor-map-real {
  margin: 0 !important;
}

/* Make spacing between floor and orders cleaner */
#pmd-waiter-dashboard-root section.pmd-v41-floor-board + section.pmd-v41-orders-board {
  margin-top: 22px !important;
}
</style>

<script id="pmd-waiter-dashboard-v41-flat-board-frames-script">
(function () {
  if (!/\/admin\/dashboardwaiter(?:$|[?#])/.test(location.pathname + location.search + location.hash)) return;
  if (window.PMD_WAITER_DASHBOARD_V41_FLAT_BOARD_FRAMES) return;
  window.PMD_WAITER_DASHBOARD_V41_FLAT_BOARD_FRAMES = true;

  function clean(s) {
    return String(s || '').replace(/\s+/g, ' ').trim();
  }

  function run() {
    var root = document.querySelector('#pmd-waiter-dashboard-root');
    if (!root) return;

    root.querySelectorAll('section.pmd-w5-board').forEach(function (section) {
      var isFloor = !!section.querySelector('.pmd-w5-floor-map-real');
      var isOrders = !!section.querySelector('.pmd-w5-grid article.pmd-w5-card[data-order], .pmd-w5-grid');

      if (!isFloor && !isOrders) return;

      section.classList.add('pmd-v41-flat-board');

      if (isFloor) section.classList.add('pmd-v41-floor-board');
      if (isOrders) section.classList.add('pmd-v41-orders-board');
    });
  }

  document.addEventListener('pmd-waiter-dashboard-rendered', function () {
    run();
    setTimeout(run, 80);
    setTimeout(run, 250);
  }, true);

  setTimeout(run, 0);
  setTimeout(run, 200);
  setTimeout(run, 800);
  setTimeout(run, 1600);

  window.PMDWaiterV41FlatFrames = {
    run: run,
    debug: function () {
      return Array.from(document.querySelectorAll('#pmd-waiter-dashboard-root section.pmd-w5-board')).map(function (section) {
        var cs = getComputedStyle(section);
        return {
          title: clean(section.querySelector('h1,h2,h3')?.textContent || ''),
          className: section.className,
          hasFloor: !!section.querySelector('.pmd-w5-floor-map-real'),
          hasOrders: !!section.querySelector('.pmd-w5-grid'),
          background: cs.backgroundColor,
          border: cs.border,
          boxShadow: cs.boxShadow,
          padding: cs.padding
        };
      });
    }
  };

  console.info('[PMD] Waiter Dashboard V41 flat board frames active');
})();
</script>
<!-- PMD_WAITER_DASHBOARD_V41_FLAT_BOARD_FRAMES_END -->


<!-- PMD_WAITER_DASHBOARD_V43_RESTORE_INNER_FLOOR_FRAME_START -->
<style id="pmd-waiter-dashboard-v43-restore-inner-floor-frame-style">
/*
  V43:
  Remove only the BIG outer floor section card.
  Keep / restore the actual inner floor-map frame.
*/

/* Outer floor section: flat, no big card behind */
#pmd-waiter-dashboard-root section.pmd-w5-floor.pmd-v43-floor-outer-flat {
  background: transparent !important;
  background-image: none !important;
  border: 0 !important;
  box-shadow: none !important;
  outline: 0 !important;
  border-radius: 0 !important;
  padding: 0 !important;
  margin: 18px 0 0 0 !important;
  overflow: visible !important;
}

/* Header row also flat */
#pmd-waiter-dashboard-root section.pmd-w5-floor.pmd-v43-floor-outer-flat > .pmd-w5-head {
  background: transparent !important;
  background-image: none !important;
  border: 0 !important;
  box-shadow: none !important;
  outline: 0 !important;
  padding: 0 !important;
  margin: 0 0 12px 0 !important;
}

/* Inner actual floor-map frame: keep it visible and clean */
#pmd-waiter-dashboard-root section.pmd-w5-floor.pmd-v43-floor-outer-flat .pmd-w5-floor-map-real {
  background: #ffffff !important;
  background-image: none !important;
  border: 1px solid rgba(148, 163, 184, .72) !important;
  box-shadow: inset 0 1px 0 rgba(255,255,255,.9), 0 12px 28px rgba(15,23,42,.06) !important;
  outline: 0 !important;
  border-radius: 18px !important;
}

/* Compact mode keeps the same inner map frame too */
#pmd-waiter-dashboard-root section.pmd-w5-floor.pmd-v43-floor-outer-flat .pmd-w5-floor-map-real.pmd-v40-compact-authority {
  background: #ffffff !important;
  background-image: none !important;
  border: 1px solid rgba(148, 163, 184, .72) !important;
  box-shadow: inset 0 1px 0 rgba(255,255,255,.9), 0 12px 28px rgba(15,23,42,.06) !important;
  border-radius: 18px !important;
}

/* Toolbar stays clean */
#pmd-waiter-dashboard-root section.pmd-w5-floor.pmd-v43-floor-outer-flat .pmd-w19-tools {
  margin-left: auto !important;
}
</style>

<script id="pmd-waiter-dashboard-v43-restore-inner-floor-frame-script">
(function () {
  if (!/\/admin\/dashboardwaiter(?:$|[?#])/.test(location.pathname + location.search + location.hash)) return;
  if (window.PMD_WAITER_DASHBOARD_V43_RESTORE_INNER_FLOOR_FRAME) return;
  window.PMD_WAITER_DASHBOARD_V43_RESTORE_INNER_FLOOR_FRAME = true;

  function run() {
    var root = document.querySelector('#pmd-waiter-dashboard-root');
    if (!root) return;

    root.querySelectorAll('section.pmd-w5-floor').forEach(function (section) {
      section.classList.remove('pmd-v42-flat-floor');
      section.classList.add('pmd-v43-floor-outer-flat');
    });
  }

  document.addEventListener('pmd-waiter-dashboard-rendered', function () {
    run();
    setTimeout(run, 80);
    setTimeout(run, 250);
  }, true);

  setTimeout(run, 0);
  setTimeout(run, 200);
  setTimeout(run, 800);
  setTimeout(run, 1600);

  window.PMDWaiterV43FloorFrame = {
    run: run,
    debug: function () {
      return Array.from(document.querySelectorAll('#pmd-waiter-dashboard-root section.pmd-w5-floor')).map(function (section) {
        var map = section.querySelector('.pmd-w5-floor-map-real');
        var scs = getComputedStyle(section);
        var mcs = map ? getComputedStyle(map) : null;

        return {
          sectionClass: section.className,
          outerBackground: scs.backgroundColor,
          outerBorder: scs.border,
          outerBoxShadow: scs.boxShadow,
          outerPadding: scs.padding,
          mapClass: map ? map.className : '',
          mapBackground: mcs ? mcs.backgroundColor : '',
          mapBorder: mcs ? mcs.border : '',
          mapBoxShadow: mcs ? mcs.boxShadow : '',
          mapRadius: mcs ? mcs.borderRadius : ''
        };
      });
    }
  };

  console.info('[PMD] Waiter Dashboard V43 restored inner floor frame active');
})();
</script>
<!-- PMD_WAITER_DASHBOARD_V43_RESTORE_INNER_FLOOR_FRAME_END -->


<!-- PMD_WAITER_DASHBOARD_V44_FLOOR_ICON_SIZE_FIX_START -->
<style id="pmd-waiter-dashboard-v44-floor-icon-size-fix-style">
/*
  V44:
  Restore proper waiter floor table icon sizes.
  No layout trick.
  No hiding.
  No backend change.
*/

/* Expanded floor mode: table icons should not look tiny/broken */
#pmd-waiter-dashboard-root .pmd-w5-floor-map-real:not(.pmd-v40-compact-authority) .pmd-w5-table[data-table] {
  width: 78px !important;
  min-width: 78px !important;
  height: 62px !important;
  min-height: 62px !important;
  display: grid !important;
  place-items: center !important;
  padding: 7px 8px !important;
  box-sizing: border-box !important;
}

/* Compact mode: still readable, but not huge */
#pmd-waiter-dashboard-root .pmd-w5-floor-map-real.pmd-v40-compact-authority .pmd-w5-table[data-table] {
  width: 86px !important;
  min-width: 86px !important;
  height: 64px !important;
  min-height: 64px !important;
  flex: 0 0 86px !important;
  display: grid !important;
  place-items: center !important;
  padding: 7px 8px !important;
  box-sizing: border-box !important;
}

/* Table number */
#pmd-waiter-dashboard-root .pmd-w5-floor-map-real .pmd-w5-table[data-table] > span {
  font-size: 24px !important;
  line-height: 1 !important;
  font-weight: 1000 !important;
  letter-spacing: -.03em !important;
}

/* Capacity line */
#pmd-waiter-dashboard-root .pmd-w5-floor-map-real .pmd-w5-table[data-table] > em {
  font-size: 11px !important;
  line-height: 1 !important;
  font-style: normal !important;
  font-weight: 1000 !important;
  margin-top: 3px !important;
}

/* Small status bubble on table icon */
#pmd-waiter-dashboard-root .pmd-w5-floor-map-real .pmd-w5-table[data-table] > small {
  width: 24px !important;
  height: 24px !important;
  min-width: 24px !important;
  min-height: 24px !important;
  border-radius: 999px !important;
  font-size: 13px !important;
  line-height: 24px !important;
  font-weight: 1000 !important;
  top: -10px !important;
  right: -10px !important;
}

/* Merged icon size in compact mode */
#pmd-waiter-dashboard-root .pmd-w5-floor-map-real.pmd-v40-compact-authority .pmd-v40-merged-table {
  width: 126px !important;
  min-width: 126px !important;
  height: 72px !important;
  min-height: 72px !important;
  flex: 0 0 126px !important;
}

#pmd-waiter-dashboard-root .pmd-v40-merged-main {
  font-size: 22px !important;
  line-height: 1 !important;
  font-weight: 1000 !important;
}

#pmd-waiter-dashboard-root .pmd-v40-merged-sub {
  font-size: 10.5px !important;
  font-weight: 1000 !important;
}

/* Old V19 merged icon in expanded mode also should not be tiny */
#pmd-waiter-dashboard-root .pmd-w5-floor-map-real:not(.pmd-v40-compact-authority) .pmd-w19-merged-table,
#pmd-waiter-dashboard-root .pmd-w5-floor-map-real:not(.pmd-v40-compact-authority) .pmd-v18-merged-table {
  min-width: 122px !important;
  min-height: 72px !important;
}

#pmd-waiter-dashboard-root .pmd-w5-floor-map-real:not(.pmd-v40-compact-authority) .pmd-w19-merged-main {
  font-size: 22px !important;
}
</style>

<script id="pmd-waiter-dashboard-v44-floor-icon-size-fix-script">
(function () {
  if (!/\/admin\/dashboardwaiter(?:$|[?#])/.test(location.pathname + location.search + location.hash)) return;
  if (window.PMD_WAITER_DASHBOARD_V44_FLOOR_ICON_SIZE_FIX) return;
  window.PMD_WAITER_DASHBOARD_V44_FLOOR_ICON_SIZE_FIX = true;

  function run() {
    var root = document.querySelector('#pmd-waiter-dashboard-root');
    if (!root) return;

    root.querySelectorAll('.pmd-w5-floor-map-real .pmd-w5-table[data-table]').forEach(function (btn) {
      btn.classList.add('pmd-v44-sized-table');
    });
  }

  document.addEventListener('pmd-waiter-dashboard-rendered', function () {
    run();
    setTimeout(run, 80);
    setTimeout(run, 250);
  }, true);

  setTimeout(run, 0);
  setTimeout(run, 200);
  setTimeout(run, 800);
  setTimeout(run, 1600);

  window.PMDWaiterV44FloorIconSize = {
    run: run,
    debug: function () {
      return Array.from(document.querySelectorAll('#pmd-waiter-dashboard-root .pmd-w5-floor-map-real .pmd-w5-table[data-table]')).slice(0, 20).map(function (el) {
        var cs = getComputedStyle(el);
        var span = el.querySelector('span');
        var em = el.querySelector('em');
        return {
          table: el.getAttribute('data-table'),
          width: cs.width,
          height: cs.height,
          display: cs.display,
          fontNumber: span ? getComputedStyle(span).fontSize : '',
          fontCapacity: em ? getComputedStyle(em).fontSize : '',
          className: el.className
        };
      });
    }
  };

  console.info('[PMD] Waiter Dashboard V44 floor icon size fix active');
})();
</script>
<!-- PMD_WAITER_DASHBOARD_V44_FLOOR_ICON_SIZE_FIX_END -->


<!-- PMD_WAITER_DASHBOARD_V46_FLOOR_MAP_TRUE_WHITE_START -->
<style id="pmd-waiter-dashboard-v46-floor-map-true-white-style">
/*
  V46:
  Final guarantee: actual floor-map card is pure white like order cards.
  V43 source is also patched above.
*/

#pmd-waiter-dashboard-root section.pmd-w5-floor .pmd-w5-floor-map-real,
#pmd-waiter-dashboard-root section.pmd-w5-floor.pmd-v43-floor-outer-flat .pmd-w5-floor-map-real,
#pmd-waiter-dashboard-root section.pmd-w5-floor.pmd-v43-floor-outer-flat .pmd-w5-floor-map-real.pmd-v40-compact-authority,
#pmd-waiter-dashboard-root .pmd-w5-floor-map-real.pmd-v40-compact-authority {
  background: #ffffff !important;
  background-color: #ffffff !important;
  background-image: none !important;
  border: 1px solid #dbe4f0 !important;
  box-shadow: 0 14px 34px rgba(7,13,36,.08) !important;
  border-radius: 18px !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
  mix-blend-mode: normal !important;
}

/* Remove any fake wash/overlay inside map */
#pmd-waiter-dashboard-root .pmd-w5-floor-map-real::before,
#pmd-waiter-dashboard-root .pmd-w5-floor-map-real::after {
  content: none !important;
  display: none !important;
  background: transparent !important;
  background-image: none !important;
}

/* Outer floor stays transparent; only the inner map is white */
#pmd-waiter-dashboard-root section.pmd-w5-floor,
#pmd-waiter-dashboard-root section.pmd-w5-floor.pmd-v43-floor-outer-flat {
  background: transparent !important;
  background-image: none !important;
}
</style>

<script id="pmd-waiter-dashboard-v46-floor-map-true-white-script">
(function () {
  if (!/\/admin\/dashboardwaiter(?:$|[?#])/.test(location.pathname + location.search + location.hash)) return;
  if (window.PMD_WAITER_DASHBOARD_V46_FLOOR_MAP_TRUE_WHITE) return;
  window.PMD_WAITER_DASHBOARD_V46_FLOOR_MAP_TRUE_WHITE = true;

  function run() {
    document.querySelectorAll('#pmd-waiter-dashboard-root .pmd-w5-floor-map-real').forEach(function (el) {
      el.classList.add('pmd-v46-true-white-floor-map');
      el.style.setProperty('background', '#ffffff', 'important');
      el.style.setProperty('background-color', '#ffffff', 'important');
      el.style.setProperty('background-image', 'none', 'important');
      el.style.setProperty('backdrop-filter', 'none', 'important');
      el.style.setProperty('-webkit-backdrop-filter', 'none', 'important');
    });
  }

  document.addEventListener('pmd-waiter-dashboard-rendered', function () {
    run();
    setTimeout(run, 100);
    setTimeout(run, 300);
  }, true);

  setTimeout(run, 0);
  setTimeout(run, 300);
  setTimeout(run, 1000);

  window.PMDWaiterV46TrueWhiteFloor = {
    run: run,
    debug: function () {
      return Array.from(document.querySelectorAll('#pmd-waiter-dashboard-root .pmd-w5-floor-map-real')).map(function (el) {
        var cs = getComputedStyle(el);
        return {
          className: el.className,
          background: cs.background,
          backgroundColor: cs.backgroundColor,
          backgroundImage: cs.backgroundImage,
          border: cs.border,
          boxShadow: cs.boxShadow,
          backdropFilter: cs.backdropFilter || cs.webkitBackdropFilter || ''
        };
      });
    }
  };

  console.info('[PMD] Waiter Dashboard V46 true white floor map active');
})();
</script>
<!-- PMD_WAITER_DASHBOARD_V46_FLOOR_MAP_TRUE_WHITE_END -->


<!-- PMD_WAITER_DASHBOARD_V47_COMPACT_TABLE_VISUAL_CLEANUP_START -->
<style id="pmd-waiter-dashboard-v47-compact-table-visual-cleanup-style">
/*
  V47:
  Only visual cleanup:
  - less red urgent glow
  - cleaner capacity text
  - compact mode uses one table shape only, no circles
*/

/* Compact mode: one shape only, rounded rectangle, never circle */
#pmd-waiter-dashboard-root .pmd-w5-floor-map-real.pmd-v40-compact-authority .pmd-w5-table[data-table],
#pmd-waiter-dashboard-root .pmd-w5-floor-map-real.pmd-v40-compact-authority .pmd-v40-merged-table,
#pmd-waiter-dashboard-root .pmd-w5-floor-map-real.pmd-v40-compact-authority .pmd-w19-merged-table,
#pmd-waiter-dashboard-root .pmd-w5-floor-map-real.pmd-v40-compact-authority .pmd-v18-merged-table {
  border-radius: 16px !important;
}

/* Cleaner capacity text, no underline/badge feeling */
#pmd-waiter-dashboard-root .pmd-w5-floor-map-real .pmd-w5-table[data-table] > em,
#pmd-waiter-dashboard-root .pmd-w5-floor-map-real .pmd-v40-merged-sub,
#pmd-waiter-dashboard-root .pmd-w5-floor-map-real .pmd-w19-merged-sub,
#pmd-waiter-dashboard-root .pmd-w5-floor-map-real .pmd-v18-merged-sub {
  text-decoration: none !important;
  border: 0 !important;
  border-bottom: 0 !important;
  box-shadow: none !important;
  background: transparent !important;
  background-image: none !important;
  padding: 0 !important;
  margin-top: 4px !important;
  color: rgba(7, 13, 36, .78) !important;
  font-size: 10.5px !important;
  line-height: 1 !important;
  font-style: normal !important;
  font-weight: 900 !important;
  letter-spacing: -.02em !important;
}

/* Keep table number clean */
#pmd-waiter-dashboard-root .pmd-w5-floor-map-real .pmd-w5-table[data-table] > span {
  text-decoration: none !important;
  border: 0 !important;
  box-shadow: none !important;
}

/* Reduce urgent red glow: still clear, less noisy */
#pmd-waiter-dashboard-root .pmd-w5-floor-map-real .pmd-w5-table.is-urgent,
#pmd-waiter-dashboard-root .pmd-w5-floor-map-real .pmd-w5-table[data-status="urgent"],
#pmd-waiter-dashboard-root .pmd-w5-floor-map-real .pmd-w5-table[data-state="urgent"] {
  box-shadow:
    0 0 0 5px rgba(239, 68, 68, .12),
    0 10px 22px rgba(239, 68, 68, .16) !important;
}

/* Compact urgent: even softer because icons are close together */
#pmd-waiter-dashboard-root .pmd-w5-floor-map-real.pmd-v40-compact-authority .pmd-w5-table.is-urgent {
  box-shadow:
    0 0 0 4px rgba(239, 68, 68, .10),
    0 8px 18px rgba(239, 68, 68, .14) !important;
}

/* Urgent small count bubble should not create extra glow */
#pmd-waiter-dashboard-root .pmd-w5-floor-map-real .pmd-w5-table.is-urgent > small {
  box-shadow: 0 4px 10px rgba(7, 13, 36, .18) !important;
}

/* Compact mode: make all normal/urgent/payment table shapes consistent */
#pmd-waiter-dashboard-root .pmd-w5-floor-map-real.pmd-v40-compact-authority .pmd-w5-table[data-table].is-payment,
#pmd-waiter-dashboard-root .pmd-w5-floor-map-real.pmd-v40-compact-authority .pmd-w5-table[data-table].is-urgent {
  border-radius: 16px !important;
}

/* Merged compact icon should match same shape language */
#pmd-waiter-dashboard-root .pmd-w5-floor-map-real.pmd-v40-compact-authority .pmd-v40-merged-table {
  border-radius: 16px !important;
}
</style>

<script id="pmd-waiter-dashboard-v47-compact-table-visual-cleanup-script">
(function () {
  if (!/\/admin\/dashboardwaiter(?:$|[?#])/.test(location.pathname + location.search + location.hash)) return;
  if (window.PMD_WAITER_DASHBOARD_V47_COMPACT_TABLE_VISUAL_CLEANUP) return;
  window.PMD_WAITER_DASHBOARD_V47_COMPACT_TABLE_VISUAL_CLEANUP = true;

  function run() {
    var root = document.querySelector('#pmd-waiter-dashboard-root');
    if (!root) return;

    root.querySelectorAll('.pmd-w5-floor-map-real .pmd-w5-table[data-table]').forEach(function (el) {
      el.classList.add('pmd-v47-clean-table-icon');
    });
  }

  document.addEventListener('pmd-waiter-dashboard-rendered', function () {
    run();
    setTimeout(run, 100);
    setTimeout(run, 300);
  }, true);

  setTimeout(run, 0);
  setTimeout(run, 300);
  setTimeout(run, 1000);

  window.PMDWaiterV47CompactVisual = {
    run: run,
    debug: function () {
      return Array.from(document.querySelectorAll('#pmd-waiter-dashboard-root .pmd-w5-floor-map-real .pmd-w5-table[data-table]')).slice(0, 20).map(function (el) {
        var cs = getComputedStyle(el);
        var em = el.querySelector('em');
        var ecs = em ? getComputedStyle(em) : null;
        return {
          table: el.getAttribute('data-table'),
          className: el.className,
          radius: cs.borderRadius,
          boxShadow: cs.boxShadow,
          capacityText: em ? em.textContent.trim() : '',
          capacityDecoration: ecs ? ecs.textDecorationLine : '',
          capacityBorder: ecs ? ecs.borderBottom : '',
          capacityBackground: ecs ? ecs.backgroundColor : ''
        };
      });
    }
  };

  console.info('[PMD] Waiter Dashboard V47 compact table visual cleanup active');
})();
</script>
<!-- PMD_WAITER_DASHBOARD_V47_COMPACT_TABLE_VISUAL_CLEANUP_END -->


<!-- PMD_WAITER_DASHBOARD_V48_TITLE_CLEANUP_ICONS_START -->
<style id="pmd-waiter-dashboard-v48-title-cleanup-icons-style">
/*
  V48:
  - remove "20 real tables from floor plan"
  - add icon to Active Order Cards title
*/

/* Hide the small floor subtitle/count line, keep toolbar buttons */
#pmd-waiter-dashboard-root section.pmd-w5-floor > .pmd-w5-head > div:not(.pmd-w19-tools) {
  display: none !important;
  visibility: hidden !important;
  opacity: 0 !important;
}

/* Active Order Cards title icon */
#pmd-waiter-dashboard-root section.pmd-w5-board > .pmd-w5-head h2.pmd-v48-order-title-icon {
  display: flex !important;
  align-items: center !important;
  gap: 8px !important;
}

#pmd-waiter-dashboard-root section.pmd-w5-board > .pmd-w5-head h2.pmd-v48-order-title-icon::before {
  content: "🧾";
  display: inline-block !important;
  font-size: .95em !important;
  line-height: 1 !important;
}
</style>

<script id="pmd-waiter-dashboard-v48-title-cleanup-icons-script">
(function () {
  if (!/\/admin\/dashboardwaiter(?:$|[?#])/.test(location.pathname + location.search + location.hash)) return;
  if (window.PMD_WAITER_DASHBOARD_V48_TITLE_CLEANUP_ICONS) return;
  window.PMD_WAITER_DASHBOARD_V48_TITLE_CLEANUP_ICONS = true;

  function text(el) {
    return (el && el.textContent || '').replace(/\s+/g, ' ').trim();
  }

  function run() {
    var root = document.querySelector('#pmd-waiter-dashboard-root');
    if (!root) return;

    /* Remove/hide floor subtitle line */
    root.querySelectorAll('section.pmd-w5-floor > .pmd-w5-head > div').forEach(function (el) {
      if (el.classList.contains('pmd-w19-tools')) return;
      if (/real tables from floor plan/i.test(text(el))) {
        el.classList.add('pmd-v48-hidden-floor-count');
        el.style.setProperty('display', 'none', 'important');
        el.style.setProperty('visibility', 'hidden', 'important');
        el.style.setProperty('opacity', '0', 'important');
      }
    });

    /* Add icon class to Active Order Cards title */
    root.querySelectorAll('section.pmd-w5-board > .pmd-w5-head h2').forEach(function (h2) {
      if (/^Active Order Cards$/i.test(text(h2))) {
        h2.classList.add('pmd-v48-order-title-icon');
      }
    });
  }

  document.addEventListener('pmd-waiter-dashboard-rendered', function () {
    run();
    setTimeout(run, 100);
    setTimeout(run, 300);
  }, true);

  setTimeout(run, 0);
  setTimeout(run, 300);
  setTimeout(run, 1000);

  window.PMDWaiterV48TitleCleanup = {
    run: run,
    debug: function () {
      return {
        floorCountVisible: Array.from(document.querySelectorAll('#pmd-waiter-dashboard-root section.pmd-w5-floor > .pmd-w5-head > div'))
          .filter(function (el) { return /real tables from floor plan/i.test(text(el)); })
          .map(function (el) {
            return { text: text(el), display: getComputedStyle(el).display };
          }),
        orderTitle: Array.from(document.querySelectorAll('#pmd-waiter-dashboard-root section.pmd-w5-board > .pmd-w5-head h2'))
          .map(function (el) {
            return { text: text(el), hasIconClass: el.classList.contains('pmd-v48-order-title-icon') };
          })
      };
    }
  };

  console.info('[PMD] Waiter Dashboard V48 title cleanup/icons active');
})();
</script>
<!-- PMD_WAITER_DASHBOARD_V48_TITLE_CLEANUP_ICONS_END -->


<!-- PMD_WAITER_DASHBOARD_V89_FLOOR_POSITION_LOCK_START -->
<style id="pmd-waiter-dashboard-v89-floor-position-lock-style">
/*
  V89:
  Final floor position lock.
  Root cause: old pmd-w19-compact / V40/V47 CSS keeps forcing table icons to left:16/18px.
  Fix: own the compact button AND re-apply real inline left/top with !important after every V5 refresh.
*/

html.pmd-dashboardwaiter-kiosk-page #pmd-waiter-dashboard-root .pmd-w5-floor-map-real {
  transition: height .24s ease, min-height .24s ease, max-height .24s ease !important;
}

/* Expanded state */
html.pmd-dashboardwaiter-kiosk-page #pmd-waiter-dashboard-root:not(.pmd-w89-compact) .pmd-w5-floor-map-real {
  height: 430px !important;
  min-height: 430px !important;
  max-height: 430px !important;
  display: block !important;
  position: relative !important;
  overflow: hidden !important;
}

/* Compact state */
html.pmd-dashboardwaiter-kiosk-page #pmd-waiter-dashboard-root.pmd-w89-compact .pmd-w5-floor-map-real {
  height: 132px !important;
  min-height: 132px !important;
  max-height: 132px !important;

  display: flex !important;
  align-items: center !important;
  justify-content: flex-start !important;
  gap: 28px !important;

  overflow-x: auto !important;
  overflow-y: hidden !important;
  padding: 24px 28px !important;
  white-space: nowrap !important;
  position: relative !important;
  scroll-behavior: smooth !important;
  -webkit-overflow-scrolling: touch !important;
}

html.pmd-dashboardwaiter-kiosk-page #pmd-waiter-dashboard-root.pmd-w89-compact .pmd-w5-floor-map-real .pmd-w5-table[data-table] {
  position: relative !important;
  left: auto !important;
  top: auto !important;
  right: auto !important;
  bottom: auto !important;
  transform: none !important;

  width: 82px !important;
  min-width: 82px !important;
  max-width: 82px !important;
  height: 64px !important;
  min-height: 64px !important;
  max-height: 64px !important;

  flex: 0 0 82px !important;
  margin: 0 !important;
  display: grid !important;
  opacity: 1 !important;
  visibility: visible !important;
}

html.pmd-dashboardwaiter-kiosk-page #pmd-waiter-dashboard-root.pmd-w89-compact [data-pmd-w89-compact] {
  background: #061126 !important;
  color: #fff !important;
}

html.pmd-dashboardwaiter-kiosk-page #pmd-waiter-dashboard-root.pmd-w89-compact .pmd-w5-floor-map-real::-webkit-scrollbar {
  height: 8px !important;
}
html.pmd-dashboardwaiter-kiosk-page #pmd-waiter-dashboard-root.pmd-w89-compact .pmd-w5-floor-map-real::-webkit-scrollbar-thumb {
  background: rgba(15, 23, 42, .24) !important;
  border-radius: 999px !important;
}
</style>

<script id="pmd-waiter-dashboard-v89-floor-position-lock-script">
(function () {
  if (!/\/admin\/dashboardwaiter(?:$|[?#])/.test(location.pathname + location.search + location.hash)) return;
  if (window.PMD_WAITER_DASHBOARD_V89_FLOOR_POSITION_LOCK) return;
  window.PMD_WAITER_DASHBOARD_V89_FLOOR_POSITION_LOCK = true;

  var KEY = 'PMD_WAITER_FLOOR_COMPACT_V89';
  var scheduled = false;
  var booted = false;

  function root() {
    return document.querySelector('#pmd-waiter-dashboard-root');
  }

  function map() {
    return document.querySelector('#pmd-waiter-dashboard-root .pmd-w5-floor-map-real');
  }

  function tables() {
    return Array.from(document.querySelectorAll('#pmd-waiter-dashboard-root .pmd-w5-floor-map-real .pmd-w5-table[data-table]'));
  }

  function compactButton() {
    return document.querySelector('#pmd-waiter-dashboard-root [data-pmd-w89-compact]') ||
           document.querySelector('#pmd-waiter-dashboard-root [data-w19-compact]');
  }

  function saved() {
    try { return localStorage.getItem(KEY) === '1'; } catch (e) { return false; }
  }

  function save(v) {
    try {
      localStorage.setItem(KEY, v ? '1' : '0');
      [
        'PMD_WAITER_FLOOR_COMPACT_V88',
        'PMD_WAITER_FLOOR_COMPACT_V87',
        'PMD_WAITER_FLOOR_COMPACT_V86',
        'PMD_WAITER_FLOOR_COMPACT_V85',
        'PMD_WAITER_FLOOR_COMPACT_V82',
        'PMD_WAITER_FLOOR_COMPACT_V81',
        'PMD_WAITER_FLOOR_COMPACT_V80',
        'PMD_WAITER_FLOOR_COMPACT_V79',
        'pmd_waiter_floor_compact'
      ].forEach(function (k) { localStorage.removeItem(k); });
    } catch (e) {}
  }

  function isBadPos(v) {
    v = String(v || '').trim();
    return !v || v === 'auto' || v === '0px' || v === '16px' || v === '18px' || v === '27px';
  }

  function rememberPositions() {
    tables().forEach(function (el) {
      var l = String(el.style.left || '').trim();
      var t = String(el.style.top || '').trim();

      if (l.indexOf('%') > -1) el.dataset.pmdW89Left = l;
      if (t.indexOf('%') > -1) el.dataset.pmdW89Top = t;
    });
  }

  function stripOldStates() {
    var r = root();
    var m = map();

    if (r) {
      r.classList.remove('pmd-w19-compact');
      r.classList.remove('pmd-v85-compact-row');
      r.classList.remove('pmd-w86-compact');
      r.classList.remove('pmd-w86-ready');
      r.classList.remove('pmd-w88-compact');
    }

    if (m) {
      m.classList.remove('pmd-v40-compact-authority');
    }
  }

  function forceExpandedPositions() {
    var m = map();
    if (!m) return;

    rememberPositions();

    m.style.setProperty('height', '430px', 'important');
    m.style.setProperty('min-height', '430px', 'important');
    m.style.setProperty('max-height', '430px', 'important');
    m.style.setProperty('display', 'block', 'important');
    m.style.setProperty('position', 'relative', 'important');
    m.style.setProperty('overflow', 'hidden', 'important');

    tables().forEach(function (el) {
      var l = el.dataset.pmdW89Left || el.style.left;
      var t = el.dataset.pmdW89Top || el.style.top;

      if (isBadPos(l)) l = '50%';
      if (isBadPos(t)) t = '50%';

      el.style.setProperty('position', 'absolute', 'important');
      el.style.setProperty('left', l, 'important');
      el.style.setProperty('top', t, 'important');
      el.style.setProperty('right', 'auto', 'important');
      el.style.setProperty('bottom', 'auto', 'important');
      el.style.setProperty('transform', 'translate(-50%, -50%)', 'important');
      el.style.setProperty('float', 'none', 'important');
      el.style.setProperty('flex', 'none', 'important');
      el.style.setProperty('margin', '0', 'important');
      el.style.removeProperty('width');
      el.style.removeProperty('min-width');
      el.style.removeProperty('max-width');
      el.style.removeProperty('height');
      el.style.removeProperty('min-height');
      el.style.removeProperty('max-height');
    });
  }

  function forceCompactPositions() {
    var m = map();
    if (!m) return;

    rememberPositions();

    m.style.setProperty('height', '132px', 'important');
    m.style.setProperty('min-height', '132px', 'important');
    m.style.setProperty('max-height', '132px', 'important');
    m.style.setProperty('display', 'flex', 'important');
    m.style.setProperty('align-items', 'center', 'important');
    m.style.setProperty('justify-content', 'flex-start', 'important');
    m.style.setProperty('gap', '28px', 'important');
    m.style.setProperty('overflow-x', 'auto', 'important');
    m.style.setProperty('overflow-y', 'hidden', 'important');
    m.style.setProperty('padding', '24px 28px', 'important');
    m.style.setProperty('position', 'relative', 'important');

    var sorted = tables().sort(function (a, b) {
      var ao = parseInt(getComputedStyle(a).order || a.style.order || '0', 10);
      var bo = parseInt(getComputedStyle(b).order || b.style.order || '0', 10);
      if (isNaN(ao)) ao = 0;
      if (isNaN(bo)) bo = 0;
      if (ao !== bo) return ao - bo;
      return Number(a.dataset.table || 0) - Number(b.dataset.table || 0);
    });

    sorted.forEach(function (el) {
      el.style.setProperty('position', 'relative', 'important');
      el.style.setProperty('left', 'auto', 'important');
      el.style.setProperty('top', 'auto', 'important');
      el.style.setProperty('right', 'auto', 'important');
      el.style.setProperty('bottom', 'auto', 'important');
      el.style.setProperty('transform', 'none', 'important');
      el.style.setProperty('float', 'none', 'important');
      el.style.setProperty('flex', '0 0 82px', 'important');
      el.style.setProperty('width', '82px', 'important');
      el.style.setProperty('min-width', '82px', 'important');
      el.style.setProperty('max-width', '82px', 'important');
      el.style.setProperty('height', '64px', 'important');
      el.style.setProperty('min-height', '64px', 'important');
      el.style.setProperty('max-height', '64px', 'important');
      el.style.setProperty('margin', '0', 'important');
      el.style.setProperty('display', 'grid', 'important');
    });
  }

  function setButtonState(compact) {
    var b = compactButton();
    if (!b) return;

    b.classList.toggle('is-active', !!compact);
    b.classList.toggle('primary', true);
    b.setAttribute('title', compact ? 'Expand floor' : 'Compact floor');
    b.setAttribute('aria-pressed', compact ? 'true' : 'false');
  }

  function apply(compact, reason) {
    var r = root();
    var m = map();
    if (!r || !m) return false;

    stripOldStates();

    if (compact) {
      r.classList.add('pmd-w89-compact');
      forceCompactPositions();
      save(true);
    } else {
      r.classList.remove('pmd-w89-compact');
      forceExpandedPositions();
      save(false);
    }

    setButtonState(compact);
    return true;
  }

  function installButton() {
    var old = compactButton();
    if (!old) return;

    if (old.hasAttribute('data-pmd-w89-compact') && old.__pmdW89Owned) return;

    var clean = old.cloneNode(true);
    clean.__pmdW89Owned = true;

    clean.removeAttribute('data-w19-compact');
    clean.setAttribute('data-pmd-w89-compact', '');
    clean.setAttribute('type', 'button');
    clean.setAttribute('title', saved() ? 'Expand floor' : 'Compact floor');

    old.parentNode.replaceChild(clean, old);

    clean.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      if (e.stopImmediatePropagation) e.stopImmediatePropagation();

      var r = root();
      var next = !(r && r.classList.contains('pmd-w89-compact'));
      apply(next, 'button');
    }, true);
  }

  function ensure(reason) {
    installButton();

    var r = root();
    if (!r) return;

    /*
      Important:
      Old V5/V19/V40 may re-add pmd-w19-compact or inline left:18px.
      We always re-apply the selected V89 mode after DOM refresh.
    */
    if (r.classList.contains('pmd-w89-compact')) {
      stripOldStates();
      r.classList.add('pmd-w89-compact');
      forceCompactPositions();
      setButtonState(true);
    } else {
      stripOldStates();
      forceExpandedPositions();
      setButtonState(false);
    }
  }

  function scheduleEnsure(reason) {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(function () {
      scheduled = false;
      ensure(reason);
    });
  }

  function boot() {
    installButton();
    apply(saved(), 'boot');

    [50, 150, 350, 700, 1200, 2000, 3500].forEach(function (ms) {
      setTimeout(function () { ensure('boot-' + ms); }, ms);
    });

    if (!booted) {
      booted = true;
      setInterval(function () { ensure('interval'); }, 2500);
    }
  }

  var observer = new MutationObserver(function () {
    scheduleEnsure('observer');
  });

  function startObserver() {
    var r = root();
    if (!r || observer.__started) return;

    observer.__started = true;
    observer.observe(r, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['class', 'style']
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      boot();
      startObserver();
    });
  } else {
    boot();
    startObserver();
  }

  window.PMDWaiterV89Floor = {
    compact: function () { return apply(true, 'manual'); },
    expand: function () { return apply(false, 'manual'); },
    toggle: function () {
      var r = root();
      return apply(!(r && r.classList.contains('pmd-w89-compact')), 'manual');
    },
    repair: function () { return ensure('manual repair'); },
    debug: function () {
      var r = root();
      var m = map();
      var mr = m ? m.getBoundingClientRect() : {left:0, top:0};

      var rows = tables().map(function (el) {
        var cs = getComputedStyle(el);
        var rect = el.getBoundingClientRect();
        return {
          table: el.dataset.table,
          position: cs.position,
          cssLeft: cs.left,
          cssTop: cs.top,
          inlineLeft: el.style.left,
          inlineTop: el.style.top,
          savedLeft: el.dataset.pmdW89Left || '',
          savedTop: el.dataset.pmdW89Top || '',
          relLeft: Math.round(rect.left - mr.left),
          relTop: Math.round(rect.top - mr.top)
        };
      });

      return {
        root: !!r,
        map: !!m,
        compact: !!(r && r.classList.contains('pmd-w89-compact')),
        oldRootCompact: !!(r && r.classList.contains('pmd-w19-compact')),
        mapV40: !!(m && m.classList.contains('pmd-v40-compact-authority')),
        tableCount: rows.length,
        badLeftCount: rows.filter(function (x) {
          return x.cssLeft === '16px' || x.cssLeft === '18px' || x.cssTop === '16px' || x.cssTop === '27px' || x.relLeft < 0;
        }).length,
        absoluteCount: rows.filter(function (x) { return x.position === 'absolute'; }).length,
        relativeCount: rows.filter(function (x) { return x.position === 'relative'; }).length,
        mapHeight: m ? Math.round(m.getBoundingClientRect().height) : null,
        scrollWidth: m ? m.scrollWidth : null,
        clientWidth: m ? m.clientWidth : null,
        sample: rows.slice(0, 10)
      };
    }
  };

  console.info('[PMD] Waiter Dashboard V89 floor position lock active');
})();
</script>
<!-- PMD_WAITER_DASHBOARD_V89_FLOOR_POSITION_LOCK_END -->


<!-- PMD_WAITER_DASHBOARD_V105_REMOVE_MERGE_FEATURE_START -->
<style id="pmd-waiter-dashboard-v105-remove-merge-feature-style">
/*
  V105:
  Remove/disable merge-table feature completely on waiter floor.
  - Keeps V89 floor/compact fix.
  - Hides merge button.
  - Hides merge-save button.
  - Hides unmerge X controls.
  - Existing backend merge groups are cleaned once by JS.
  - No movement, no snap, no bottom row, no merge mode.
*/

html.pmd-dashboardwaiter-kiosk-page #pmd-waiter-dashboard-root [data-w19-merge],
html.pmd-dashboardwaiter-kiosk-page #pmd-waiter-dashboard-root [data-pmd-v100-merge],
html.pmd-dashboardwaiter-kiosk-page #pmd-waiter-dashboard-root [data-pmd-v101-merge-save],
html.pmd-dashboardwaiter-kiosk-page #pmd-waiter-dashboard-root .pmd-w19-unmerge,
html.pmd-dashboardwaiter-kiosk-page #pmd-waiter-dashboard-root .pmd-v40-unmerge,
html.pmd-dashboardwaiter-kiosk-page #pmd-waiter-dashboard-root .pmd-v18-unmerge,
html.pmd-dashboardwaiter-kiosk-page #pmd-waiter-dashboard-root .pmd-v102-unmerge-x {
  display: none !important;
  visibility: hidden !important;
  opacity: 0 !important;
  pointer-events: none !important;
}

/* Hide existing merged cards while cleanup runs. After cleanup/reload, normal tables show. */
html.pmd-dashboardwaiter-kiosk-page #pmd-waiter-dashboard-root .pmd-v40-merged-table,
html.pmd-dashboardwaiter-kiosk-page #pmd-waiter-dashboard-root .pmd-w19-merged-table,
html.pmd-dashboardwaiter-kiosk-page #pmd-waiter-dashboard-root .pmd-v18-merged-table {
  display: none !important;
  visibility: hidden !important;
  opacity: 0 !important;
  pointer-events: none !important;
}
</style>

<script id="pmd-waiter-dashboard-v105-remove-merge-feature-script">
(function () {
  if (!/\/admin\/dashboardwaiter(?:$|[?#])/.test(location.pathname + location.search + location.hash)) return;
  if (window.PMD_WAITER_DASHBOARD_V105_REMOVE_MERGE_FEATURE) return;
  window.PMD_WAITER_DASHBOARD_V105_REMOVE_MERGE_FEATURE = true;

  var API_LIST = '/admin/pmd-waiter-dashboard-v20-table-merges';
  var API_UNMERGE = '/admin/pmd-waiter-dashboard-v20-unmerge-tables';
  var RELOAD_KEY = 'PMD_V105_MERGE_CLEANUP_RELOADED';

  function root() {
    return document.querySelector('#pmd-waiter-dashboard-root');
  }

  function csrf() {
    return (
      document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') ||
      document.querySelector('input[name="_token"]')?.value ||
      window.csrfToken ||
      ''
    );
  }

  function cleanNo(v) {
    var m = String(v == null ? '' : v).match(/\d+/);
    return m ? String(parseInt(m[0], 10)) : '';
  }

  function validIds() {
    var ids = {};
    Array.from(document.querySelectorAll('#pmd-waiter-dashboard-root .pmd-w5-table[data-table]')).forEach(function (el) {
      var n = cleanNo(el.getAttribute('data-table'));
      if (n) ids[n] = true;
    });
    return ids;
  }

  function uniqueValid(list) {
    var ids = validIds();
    var out = [];
    var seen = {};

    (list || []).forEach(function (x) {
      var n = cleanNo(x);
      if (!n || seen[n] || !ids[n]) return;
      seen[n] = true;
      out.push(n);
    });

    out.sort(function (a, b) { return Number(a) - Number(b); });
    return out;
  }

  function parseList(raw) {
    if (Array.isArray(raw)) return uniqueValid(raw);
    if (raw && typeof raw === 'object') return uniqueValid(Object.values(raw));

    raw = String(raw == null ? '' : raw).trim();
    if (!raw) return [];

    try {
      var json = JSON.parse(raw);
      if (Array.isArray(json)) return uniqueValid(json);
      if (json && typeof json === 'object') return uniqueValid(Object.values(json));
    } catch (e) {}

    return uniqueValid(raw.match(/\d+/g) || []);
  }

  function tablesFromMerge(m) {
    if (!m) return [];

    return uniqueValid(
      []
        .concat(parseList(m.table_numbers))
        .concat(parseList(m.tables))
        .concat(parseList(m.table_ids))
        .concat(parseList(m.numbers))
        .concat(parseList(m.table_names))
        .concat(parseList(m.table_numbers_json))
    );
  }

  function keyFromMerge(m, tables) {
    return String(m && (m.merge_key || m.group_key || m.merge_id || m.id) || (tables || []).join('-') || '');
  }

  async function fetchJson(url, options) {
    var res = await fetch(url, Object.assign({
      credentials: 'same-origin',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'X-CSRF-TOKEN': csrf(),
        'X-Requested-With': 'XMLHttpRequest'
      }
    }, options || {}));

    var text = await res.text();
    var json = null;

    try { json = text ? JSON.parse(text) : {}; } catch (e) {
      json = { ok: false, raw: text };
    }

    if (!res.ok || json.ok === false) {
      throw new Error((json && (json.error || json.message)) || ('HTTP ' + res.status));
    }

    return json;
  }

  function killMergeUi() {
    var r = root();
    if (r) {
      r.classList.remove(
        'pmd-w19-merging',
        'pmd-v99-merging',
        'pmd-v100-merging',
        'pmd-v90-merging',
        'pmd-v91-merging'
      );
    }

    Array.from(document.querySelectorAll([
      '#pmd-waiter-dashboard-root [data-w19-merge]',
      '#pmd-waiter-dashboard-root [data-pmd-v100-merge]',
      '#pmd-waiter-dashboard-root [data-pmd-v101-merge-save]'
    ].join(','))).forEach(function (btn) {
      btn.disabled = true;
      btn.setAttribute('aria-disabled', 'true');
      btn.setAttribute('data-pmd-v105-disabled', 'merge-feature-removed');
      btn.style.setProperty('display', 'none', 'important');
      btn.style.setProperty('visibility', 'hidden', 'important');
      btn.style.setProperty('pointer-events', 'none', 'important');
    });

    Array.from(document.querySelectorAll([
      '#pmd-waiter-dashboard-root .pmd-v99-selected',
      '#pmd-waiter-dashboard-root .pmd-v99-group-selected',
      '#pmd-waiter-dashboard-root .pmd-v100-selected',
      '#pmd-waiter-dashboard-root .pmd-v100-group-selected'
    ].join(','))).forEach(function (el) {
      el.classList.remove(
        'pmd-v99-selected',
        'pmd-v99-group-selected',
        'pmd-v100-selected',
        'pmd-v100-group-selected'
      );
    });
  }

  async function listMerges() {
    var json = await fetchJson(API_LIST + '?v105=' + Date.now(), { method: 'GET' });
    var arr = Array.isArray(json.merges) ? json.merges : [];

    return arr.map(function (m) {
      var tables = tablesFromMerge(m);
      return {
        key: keyFromMerge(m, tables),
        tables: tables,
        raw: m
      };
    }).filter(function (g) {
      return g.tables.length >= 2;
    });
  }

  async function unmergeGroup(g) {
    return fetchJson(API_UNMERGE, {
      method: 'POST',
      body: JSON.stringify({
        merge_key: g.key,
        key: g.key,
        group_key: g.key,
        tables: g.tables,
        table_numbers: g.tables,
        table_numbers_json: JSON.stringify(g.tables),
        source: 'v105-remove-merge-feature'
      })
    });
  }

  async function cleanupExistingMerges() {
    killMergeUi();

    var merges = [];

    try {
      merges = await listMerges();
    } catch (e) {
      console.warn('[PMD] V105 could not list merges:', e);
      return { ok: false, error: String(e), merges: [] };
    }

    if (!merges.length) {
      sessionStorage.removeItem(RELOAD_KEY);
      console.info('[PMD] V105 merge feature removed. No active merges found.');
      return { ok: true, cleaned: 0, merges: [] };
    }

    console.warn('[PMD] V105 removing existing merged table groups:', merges);

    var cleaned = 0;
    var failed = [];

    for (var i = 0; i < merges.length; i++) {
      try {
        await unmergeGroup(merges[i]);
        cleaned++;
      } catch (e) {
        failed.push({
          group: merges[i],
          error: String(e && e.message || e)
        });
      }
    }

    console.warn('[PMD] V105 merge cleanup result:', {
      cleaned: cleaned,
      failed: failed
    });

    if (cleaned > 0 && sessionStorage.getItem(RELOAD_KEY) !== '1') {
      sessionStorage.setItem(RELOAD_KEY, '1');
      setTimeout(function () {
        location.reload();
      }, 900);
    }

    return {
      ok: failed.length === 0,
      cleaned: cleaned,
      failed: failed,
      merges: merges
    };
  }

  document.addEventListener('click', function (e) {
    var t = e.target && e.target.nodeType === 1 ? e.target : null;
    if (!t) return;

    if (t.closest(
      '#pmd-waiter-dashboard-root [data-w19-merge], ' +
      '#pmd-waiter-dashboard-root [data-pmd-v100-merge], ' +
      '#pmd-waiter-dashboard-root [data-pmd-v101-merge-save], ' +
      '#pmd-waiter-dashboard-root .pmd-w19-unmerge, ' +
      '#pmd-waiter-dashboard-root .pmd-v40-unmerge, ' +
      '#pmd-waiter-dashboard-root .pmd-v18-unmerge'
    )) {
      e.preventDefault();
      e.stopPropagation();
      if (e.stopImmediatePropagation) e.stopImmediatePropagation();
      killMergeUi();
      console.info('[PMD] V105 blocked merge/unmerge click because merge feature is removed.');
    }
  }, true);

  function boot() {
    killMergeUi();

    [100, 400, 1000, 2500].forEach(function (ms) {
      setTimeout(killMergeUi, ms);
    });

    cleanupExistingMerges();

    setInterval(killMergeUi, 2500);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  window.PMDWaiterV105RemoveMergeFeature = {
    cleanup: cleanupExistingMerges,
    killUi: killMergeUi,
    debug: async function () {
      var merges = [];
      try { merges = await listMerges(); } catch (e) {}

      return {
        active: true,
        activeMerges: merges,
        activeMergeCount: merges.length,
        mergeButtons: document.querySelectorAll('#pmd-waiter-dashboard-root [data-w19-merge], #pmd-waiter-dashboard-root [data-pmd-v100-merge], #pmd-waiter-dashboard-root [data-pmd-v101-merge-save]').length,
        mergedCards: document.querySelectorAll('#pmd-waiter-dashboard-root .pmd-v40-merged-table, #pmd-waiter-dashboard-root .pmd-w19-merged-table, #pmd-waiter-dashboard-root .pmd-v18-merged-table').length,
        rootClass: String(root() && root().className || ''),
        v89: !!window.PMDWaiterV89Floor,
        v95: typeof window.PMDWaiterV95StopMergedIconSnap,
        v100: typeof window.PMDWaiterV100SafeFlexMerge,
        v101: typeof window.PMDWaiterV101MergeSaveButton,
        v102: typeof window.PMDWaiterV102ShowMergedUnmergeX,
        v104: typeof window.PMDWaiterV104InstantMergeRedraw
      };
    }
  };

  console.info('[PMD] Waiter Dashboard V105 merge feature removed active');
})();
</script>
<!-- PMD_WAITER_DASHBOARD_V105_REMOVE_MERGE_FEATURE_END -->


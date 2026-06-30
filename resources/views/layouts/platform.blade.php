<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>@yield('title','Terminal Devices')</title>
<link rel="stylesheet" href="/app/admin/assets/vendor/pmd-mediafix/daterangepicker.css">
<link rel="stylesheet" href="/app/admin/assets/vendor/pmd-mediafix/jquery-clockpicker.min.css">
<style>
body{font-family:sans-serif;margin:20px;background:#f9f9f9;}
table{width:100%;border-collapse:collapse;}
table,th,td{border:1px solid #ccc;}
th,td{padding:8px;text-align:left;}
</style>



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





</head>
<body>
<h1>@yield('title','Terminal Devices')</h1>
@yield('main')
<script src="/app/admin/assets/vendor/pmd-mediafix/jquery.min.js"></script>
<script src="/app/admin/assets/vendor/pmd-mediafix/moment.min.js"></script>
<script src="/app/admin/assets/vendor/pmd-mediafix/daterangepicker.js"></script>
<script src="/app/admin/assets/js/pmd-waiter-v98-single-source.js?v=98"></script>
</body>
</html>
<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>Quick Mode</title>
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
    <meta name="robots" content="noindex,nofollow">
    <style>
        :root {
            --bg: #f5f2ea;
            --ink: #101916;
            --muted: #66736d;
            --line: #ded8ca;
            --panel: #fffaf0;
            --panel-strong: #ffffff;
            --green: #0f5b45;
            --green-soft: #dff5ea;
            --dark: #08251f;
            --danger: #b4232f;
            --shadow: 0 10px 30px rgba(12, 20, 17, .10);
            --radius: 22px;
        }

        * { box-sizing: border-box; }
        html, body { min-height: 100%; }
        body {
            margin: 0;
            background: var(--bg);
            color: var(--ink);
            font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }

        button, a {
            font: inherit;
            -webkit-tap-highlight-color: transparent;
        }

        a { color: inherit; text-decoration: none; }

        .qm-shell {
            min-height: 100vh;
            padding: 12px;
            max-width: 1280px;
            margin: 0 auto;
        }

        .qm-header {
            position: sticky;
            top: 0;
            z-index: 10;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            padding: 12px;
            border: 1px solid var(--line);
            background: rgba(255,250,240,.92);
            backdrop-filter: blur(14px);
            border-radius: 20px;
            box-shadow: var(--shadow);
        }

        .qm-left {
            display: flex;
            align-items: center;
            gap: 12px;
            min-width: 0;
        }

        .qm-mark {
            width: 42px;
            height: 42px;
            border-radius: 14px;
            display: grid;
            place-items: center;
            background: var(--green);
            color: white;
            font-size: 19px;
            font-weight: 900;
        }

        .qm-title {
            font-size: clamp(20px, 2.2vw, 28px);
            font-weight: 900;
            letter-spacing: -.035em;
            line-height: 1;
        }

        .qm-right {
            display: flex;
            align-items: center;
            gap: 10px;
            flex-wrap: wrap;
            justify-content: flex-end;
        }

        .qm-badge,
        .qm-header-btn {
            min-height: 40px;
            border-radius: 999px;
            border: 1px solid var(--line);
            padding: 0 13px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            font-weight: 850;
            background: var(--panel-strong);
            color: var(--ink);
        }

        .qm-badge {
            background: var(--green-soft);
            color: var(--green);
            border-color: #bee9d4;
        }

        .qm-header-btn {
            cursor: pointer;
        }

        .qm-main {
            margin-top: 7px;
        }

        .qm-screen {
            display: none;
        }

        .qm-screen.active {
            display: block;
        }

        .qm-grid {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 12px;
        }

        .qm-tile {
            min-height: 142px;
            border: 1px solid var(--line);
            background: var(--panel-strong);
            border-radius: 20px;
            box-shadow: var(--shadow);
            padding: 18px;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            cursor: pointer;
            transition: transform .12s ease, border-color .12s ease, background .12s ease;
            text-align: left;
        }

        .qm-tile:hover,
        .qm-tile:focus {
            transform: translateY(-1px);
            border-color: #b8c9bf;
            outline: none;
        }

        .qm-tile.primary {
            background: var(--dark);
            color: #fff;
            border-color: var(--dark);
        }

        .qm-tile-icon {
            width: 44px;
            height: 44px;
            border-radius: 14px;
            display: grid;
            place-items: center;
            background: rgba(15,91,69,.10);
            color: var(--green);
            font-size: 15px;
            font-weight: 900;
        }

        .qm-tile.primary .qm-tile-icon {
            background: rgba(255,255,255,.14);
            color: #fff;
        }

        .qm-tile-title {
            margin-top: 7px;
            font-size: clamp(22px, 2.5vw, 31px);
            font-weight: 900;
            letter-spacing: -.045em;
            line-height: .95;
        }

        .qm-tile-subtitle {
            margin-top: 7px;
            color: var(--muted);
            font-size: 14px;
            font-weight: 750;
        }

        .qm-tile.primary .qm-tile-subtitle {
            color: rgba(255,255,255,.68);
        }

        .qm-panel {
            border: 1px solid var(--line);
            background: var(--panel-strong);
            border-radius: 20px;
            box-shadow: var(--shadow);
            padding: 18px;
        }

        .qm-step-head {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            margin-bottom: 16px;
        }

        .qm-step-title {
            font-size: clamp(20px, 2.4vw, 28px);
            font-weight: 900;
            letter-spacing: -.035em;
        }

        .qm-back {
            border: 1px solid var(--line);
            background: var(--bg);
            border-radius: 16px;
            min-height: 40px;
            padding: 0 13px;
            font-weight: 850;
            cursor: pointer;
        }

        .qm-table-grid {
            display: grid;
            grid-template-columns: repeat(6, minmax(0, 1fr));
            gap: 12px;
        }

        .qm-table-btn,
        .qm-item-btn {
            border: 1px solid var(--line);
            background: var(--panel);
            border-radius: 22px;
            min-height: 86px;
            padding: 12px;
            text-align: left;
            cursor: pointer;
            box-shadow: 0 6px 18px rgba(12,20,17,.06);
        }

        .qm-table-btn.selected {
            background: var(--green);
            color: #fff;
            border-color: var(--green);
        }

        .qm-table-name {
            font-size: 21px;
            font-weight: 900;
            letter-spacing: -.04em;
        }

        .qm-table-meta {
            margin-top: 8px;
            color: var(--muted);
            font-weight: 750;
        }

        .qm-table-btn.selected .qm-table-meta {
            color: rgba(255,255,255,.72);
        }

        .qm-order-layout {
            display: grid;
            grid-template-columns: 1fr 360px;
            gap: 12px;
        }

        .qm-menu-grid {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 12px;
            max-height: calc(100vh - 185px);
            overflow: auto;
            padding-right: 4px;
        }

        .qm-item-btn {
            min-height: 104px;
            background: #fffdf7;
        }

        .qm-item-name {
            font-size: 15px;
            font-weight: 900;
            letter-spacing: -.04em;
            line-height: 1.05;
        }

        .qm-item-price {
            margin-top: 7px;
            font-size: 16px;
            color: var(--green);
            font-weight: 900;
        }

        .qm-cart {
            position: sticky;
            top: 92px;
            align-self: start;
        }

        .qm-cart-list {
            display: grid;
            gap: 8px;
            margin-top: 7px;
            max-height: 360px;
            overflow: auto;
        }

        .qm-cart-row {
            display: flex;
            justify-content: space-between;
            gap: 10px;
            padding: 12px;
            border-radius: 16px;
            background: var(--bg);
            font-weight: 800;
        }

        .qm-total {
            display: flex;
            justify-content: space-between;
            margin-top: 16px;
            padding-top: 16px;
            border-top: 1px solid var(--line);
            font-size: 19px;
            font-weight: 900;
        }

        .qm-submit {
            width: 100%;
            min-height: 44px;
            margin-top: 16px;
            border: 0;
            border-radius: 14px;
            background: var(--green);
            color: #fff;
            font-size: 15px;
            font-weight: 900;
            cursor: pointer;
        }

        .qm-muted-note {
            margin-top: 7px;
            color: var(--muted);
            font-size: 13px;
            line-height: 1.45;
        }

        .qm-toast {
            position: fixed;
            left: 50%;
            bottom: 24px;
            transform: translateX(-50%);
            padding: 14px 18px;
            border-radius: 999px;
            background: var(--dark);
            color: white;
            box-shadow: var(--shadow);
            font-weight: 850;
            display: none;
            z-index: 100;
        }

        .qm-toast.show { display: block; }

        @media (max-width: 1100px) {
            .qm-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
            .qm-table-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); }
            .qm-order-layout { grid-template-columns: 1fr; }
            .qm-cart { position: static; }
            .qm-menu-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); max-height: none; }
        }

        @media (max-width: 640px) {
            .qm-shell { padding: 10px; }
            .qm-header { border-radius: 14px; align-items: stretch; flex-direction: column; }
            .qm-right { justify-content: stretch; }
            .qm-badge, .qm-header-btn { flex: 1; }
            .qm-grid { grid-template-columns: 1fr; gap: 12px; }
            .qm-tile { min-height: 150px; }
            .qm-table-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
            .qm-menu-grid { grid-template-columns: 1fr; }
        }
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
<div class="qm-shell">
    <header class="qm-header">
        <div class="qm-left">
            <div class="qm-mark">⚡</div>
            <div class="qm-title">Quick Mode</div>
        </div>

        <div class="qm-right">
            <span class="qm-badge">Reservations today: {{ $reservationsToday }}</span>
            <a class="qm-header-btn" href="/admin">Admin Panel</a>
            <button class="qm-header-btn" type="button" onclick="document.documentElement.requestFullscreen && document.documentElement.requestFullscreen()">Fullscreen</button>
        </div>
    </header>

    <main class="qm-main">
        <section id="screen-home" class="qm-screen active">
            <div class="qm-grid">
                @foreach ($quickLinks as $index => $link)
                    @if (($link['type'] ?? '') === 'action')
                        <button class="qm-tile primary" type="button" onclick="showScreen('tables')">
                            <div class="qm-tile-icon">{{ $link['icon'] }}</div>
                            <div>
                                <div class="qm-tile-title">{{ $link['title'] }}</div>
                                <div class="qm-tile-subtitle">{{ $link['subtitle'] }}</div>
                            </div>
                        </button>
                    @else
                        <a class="qm-tile {{ $index === 0 ? 'primary' : '' }}" href="{{ $link['url'] }}">
                            <div class="qm-tile-icon">{{ $link['icon'] }}</div>
                            <div>
                                <div class="qm-tile-title">{{ $link['title'] }}</div>
                                <div class="qm-tile-subtitle">{{ $link['subtitle'] }}</div>
                            </div>
                        </a>
                    @endif
                @endforeach
            </div>
        </section>

        <section id="screen-tables" class="qm-screen">
            <div class="qm-panel">
                <div class="qm-step-head">
                    <div>
                        <div class="qm-step-title">Select Table</div>
                    </div>
                    <button class="qm-back" type="button" onclick="showScreen('home')">← Back</button>
                </div>

                <div class="qm-table-grid" id="tablesGrid"></div>
            </div>
        </section>

        <section id="screen-menu" class="qm-screen">
            <div class="qm-order-layout">
                <div class="qm-panel">
                    <div class="qm-step-head">
                        <div>
                            <div class="qm-step-title">Add Items</div>
                            <div class="qm-muted-note" id="selectedTableLabel"></div>
                        </div>
                        <button class="qm-back" type="button" onclick="showScreen('tables')">← Tables</button>
                    </div>

                    <div class="qm-menu-grid" id="menuGrid"></div>
                </div>

                <aside class="qm-panel qm-cart">
                    <div class="qm-step-title" style="font-size:28px">Cart</div>
                    <div class="qm-muted-note" id="cartTableLabel">No table selected</div>
                    <div class="qm-cart-list" id="cartList"></div>
                    <div class="qm-total">
                        <span>Total</span>
                        <span id="cartTotal">€0.00</span>
                    </div>
                    <button class="qm-submit" type="button" onclick="submitPreviewOrder()">Send Order</button>
                    <div class="qm-muted-note">
                        Preview flow: table and item selection works here. Final database order creation can be connected in the next step.
                    </div>
                </aside>
            </div>
        </section>
    </main>
</div>

<div id="qmToast" class="qm-toast"></div>

<script>
    const TABLES = @json($tables);
    const MENU_ITEMS = @json($menuItems);

    let selectedTable = null;
    let cart = [];

    function money(value) {
        return '€' + Number(value || 0).toFixed(2);
    }

    function showToast(message) {
        const el = document.getElementById('qmToast');
        el.textContent = message;
        el.classList.add('show');
        setTimeout(() => el.classList.remove('show'), 2200);
    }

    function showScreen(name) {
        document.querySelectorAll('.qm-screen').forEach(el => el.classList.remove('active'));
        document.getElementById('screen-' + name).classList.add('active');

        if (name === 'tables') renderTables();
        if (name === 'menu') {
            renderMenu();
            renderCart();
        }
    }

    function renderTables() {
        const root = document.getElementById('tablesGrid');
        root.innerHTML = '';

        TABLES.forEach(table => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'qm-table-btn' + (selectedTable && String(selectedTable.id) === String(table.id) ? ' selected' : '');
            btn.innerHTML = `
                <div class="qm-table-name">${escapeHtml(table.name || ('Table ' + table.id))}</div>
                <div class="qm-table-meta">${table.capacity ? 'Capacity ' + table.capacity : 'Tap to start'}</div>
            `;
            btn.onclick = () => {
                selectedTable = table;
                showScreen('menu');
            };
            root.appendChild(btn);
        });
    }

    function renderMenu() {
        document.getElementById('selectedTableLabel').textContent = selectedTable ? ('Selected: ' + selectedTable.name) : '';
        document.getElementById('cartTableLabel').textContent = selectedTable ? ('Table: ' + selectedTable.name) : 'No table selected';

        const root = document.getElementById('menuGrid');
        root.innerHTML = '';

        MENU_ITEMS.forEach(item => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'qm-item-btn';
            btn.innerHTML = `
                <div class="qm-item-name">${escapeHtml(item.name || 'Menu Item')}</div>
                <div class="qm-item-price">${money(item.price)}</div>
            `;
            btn.onclick = () => addItem(item);
            root.appendChild(btn);
        });
    }

    function addItem(item) {
        const existing = cart.find(row => String(row.id) === String(item.id));
        if (existing) {
            existing.qty += 1;
        } else {
            cart.push({ ...item, qty: 1 });
        }
        renderCart();
        showToast((item.name || 'Item') + ' added');
    }

    function renderCart() {
        const list = document.getElementById('cartList');
        list.innerHTML = '';

        if (cart.length === 0) {
            list.innerHTML = '<div class="qm-muted-note">No items yet. Tap food items to add.</div>';
        } else {
            cart.forEach(row => {
                const div = document.createElement('div');
                div.className = 'qm-cart-row';
                div.innerHTML = `
                    <span>${row.qty}× ${escapeHtml(row.name || 'Item')}</span>
                    <span>${money(Number(row.price || 0) * row.qty)}</span>
                `;
                div.onclick = () => {
                    row.qty -= 1;
                    if (row.qty <= 0) cart = cart.filter(x => String(x.id) !== String(row.id));
                    renderCart();
                };
                list.appendChild(div);
            });
        }

        const total = cart.reduce((sum, row) => sum + Number(row.price || 0) * row.qty, 0);
        document.getElementById('cartTotal').textContent = money(total);
    }

    function submitPreviewOrder() {
        if (!selectedTable) {
            showToast('Select a table first');
            showScreen('tables');
            return;
        }
        if (cart.length === 0) {
            showToast('Add at least one item');
            return;
        }

        showToast('Preview order ready for ' + selectedTable.name);
    }

    function escapeHtml(value) {
        return String(value || '')
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&#039;');
    }
</script>
<script src="/app/admin/assets/js/pmd-waiter-v98-single-source.js?v=98"></script>
</body>
</html>

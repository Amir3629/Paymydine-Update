(function () {
  'use strict';

  if (!/^\/admin(\/dashboard|\/?$)/.test(location.pathname)) return;
  if (window.__PMD_FLOOR_DASHBOARD_CLEAN_V140__) return;
  window.__PMD_FLOOR_DASHBOARD_CLEAN_V140__ = true;

  const VERSION = 'v140-dashboard-cleaner';

  function ready(fn) {
    if (document.body) return fn();
    document.addEventListener('DOMContentLoaded', fn, { once: true });
  }

  function addStyle() {
    if (document.getElementById('pmd-floor-dashboard-clean-v140-css')) return;

    const st = document.createElement('style');
    st.id = 'pmd-floor-dashboard-clean-v140-css';
    st.textContent = `
      body.pmd-floor-v140-clean .pmd-w3-quick-grid,
      body.pmd-floor-v140-clean .pmd-w3-bottom,
      body.pmd-floor-v140-clean [class*="pmd-w3-quick-grid"],
      body.pmd-floor-v140-clean [class*="pmd-w3-bottom"] {
        display: none !important;
        height: 0 !important;
        min-height: 0 !important;
        max-height: 0 !important;
        margin: 0 !important;
        padding: 0 !important;
        overflow: hidden !important;
        opacity: 0 !important;
        pointer-events: none !important;
      }

      body.pmd-floor-v140-clean #pmd-floor-plan-stable {
        margin-top: 26px !important;
        margin-bottom: 34px !important;
      }

      body.pmd-floor-v140-clean #pmd-floor-plan-stable .pmd-floor-map {
        min-height: 340px !important;
      }

      body.pmd-floor-v140-clean #pmd-floor-plan-stable .pmd-floor-table {
        max-width: 190px !important;
      }

      body.pmd-floor-v140-clean #dashboardcontainer-container {
        overflow: visible !important;
      }

      @media (max-width: 900px) {
        body.pmd-floor-v140-clean #pmd-floor-plan-stable {
          margin-top: 18px !important;
        }
      }
    `;
    document.head.appendChild(st);
  }

  function isVisible(el) {
    if (!el) return false;
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return r.width > 200 && r.height > 40 && cs.display !== 'none' && cs.visibility !== 'hidden';
  }

  function hideOldBlocks() {
    document.body.classList.add('pmd-floor-v140-clean');

    document.querySelectorAll('.pmd-w3-quick-grid, .pmd-w3-bottom, [class*="pmd-w3-quick-grid"], [class*="pmd-w3-bottom"]').forEach(el => {
      el.setAttribute('data-pmd-v140-hidden', '1');
      el.style.setProperty('display', 'none', 'important');
      el.style.setProperty('height', '0', 'important');
      el.style.setProperty('min-height', '0', 'important');
      el.style.setProperty('max-height', '0', 'important');
      el.style.setProperty('margin', '0', 'important');
      el.style.setProperty('padding', '0', 'important');
      el.style.setProperty('overflow', 'hidden', 'important');
      el.style.setProperty('opacity', '0', 'important');
      el.style.setProperty('pointer-events', 'none', 'important');
    });
  }

  function findDarkKpiHeader() {
    const candidates = Array.from(document.querySelectorAll('[class*="pmd-w3"], [class*="kpi"], [class*="metric"], [class*="dashboard"]'))
      .filter(isVisible)
      .filter(el => {
        const text = (el.innerText || '').toLowerCase();
        if (!text) return false;

        const hasKpi =
          text.includes('my tables') ||
          text.includes('ready to serve') ||
          text.includes('active orders') ||
          text.includes('guest notes') ||
          text.includes('payments due') ||
          text.includes('tables');

        const isOldBody =
          text.includes('new order') ||
          text.includes('next waiter actions') ||
          text.includes('service focus') ||
          text.includes('reservations');

        const r = el.getBoundingClientRect();

        return hasKpi && !isOldBody && r.width > 650 && r.height >= 80 && r.height <= 220;
      })
      .sort((a, b) => {
        const ar = a.getBoundingClientRect();
        const br = b.getBoundingClientRect();
        return ar.top - br.top || br.width - ar.width;
      });

    return candidates[0] || null;
  }

  function moveFloorUnderHeader() {
    const floor = document.getElementById('pmd-floor-plan-stable');
    const header = findDarkKpiHeader();

    if (!floor || !header || !header.parentNode) return false;

    if (header.nextElementSibling !== floor) {
      header.parentNode.insertBefore(floor, header.nextSibling);
    }

    floor.style.setProperty('margin-top', '26px', 'important');

    return true;
  }

  function run() {
    addStyle();
    hideOldBlocks();
    moveFloorUnderHeader();
  }

  function audit() {
    const floor = document.getElementById('pmd-floor-plan-stable');
    const header = findDarkKpiHeader();

    return {
      version: VERSION,
      floorExists: !!floor,
      headerFound: !!header,
      floorTop: floor ? Math.round(floor.getBoundingClientRect().top) : null,
      headerBottom: header ? Math.round(header.getBoundingClientRect().bottom) : null,
      hiddenQuickGrid: document.querySelectorAll('[data-pmd-v140-hidden="1"].pmd-w3-quick-grid, [data-pmd-v140-hidden="1"][class*="pmd-w3-quick-grid"]').length,
      hiddenBottom: document.querySelectorAll('[data-pmd-v140-hidden="1"].pmd-w3-bottom, [data-pmd-v140-hidden="1"][class*="pmd-w3-bottom"]').length,
      floorTableButtons: floor ? floor.querySelectorAll('.pmd-floor-table').length : 0,
      scripts: Array.from(document.scripts)
        .filter(s => /pmd-(floor|waiter|dashboard-clean)/i.test(s.src || ''))
        .map(s => s.src)
    };
  }

  window.PMDFloorDashboardCleanV140 = { run, audit };

  ready(function () {
    run();
    setTimeout(run, 350);
    setTimeout(run, 900);
    setTimeout(run, 1800);

    const mo = new MutationObserver(function () {
      clearTimeout(window.__PMD_FLOOR_V140_TIMER__);
      window.__PMD_FLOOR_V140_TIMER__ = setTimeout(run, 80);
    });

    mo.observe(document.body, { childList: true, subtree: true });

    console.log('✅ PMD floor dashboard clean v140 active', audit());
  });
})();

(function () {
  'use strict';

  if (!/^\/admin\/dashboard\/?$/.test(location.pathname)) return;
  if (window.__PMD_WAITER_DASHBOARD_V162__) return;
  window.__PMD_WAITER_DASHBOARD_V162__ = true;

  const VERSION = 'v162-fix-mount-position';

  try {
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  } catch (e) {}

  function rect(el) {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return {
      top: Math.round(r.top),
      left: Math.round(r.left),
      width: Math.round(r.width),
      height: Math.round(r.height),
      bottom: Math.round(r.bottom)
    };
  }

  function fix() {
    document.body.classList.add('pmd-waiter-v162-fixed');

    const holder = document.getElementById('pmd-waiter-v161-holder');
    if (holder && holder.parentNode !== document.body) {
      document.body.appendChild(holder);
    }

    if (holder) {
      holder.style.setProperty('display', 'block', 'important');
      holder.style.setProperty('visibility', 'visible', 'important');
      holder.style.setProperty('opacity', '1', 'important');
      holder.style.setProperty('position', 'relative', 'important');
      holder.style.setProperty('z-index', '2', 'important');
      holder.style.setProperty('width', '100%', 'important');
      holder.style.setProperty('min-height', '100vh', 'important');
      holder.style.setProperty('padding', '92px 28px 90px', 'important');
      holder.style.setProperty('margin', '0', 'important');
      holder.style.setProperty('background', '#fbfaf5', 'important');
      holder.style.setProperty('transform', 'none', 'important');
      holder.style.setProperty('top', 'auto', 'important');
      holder.style.setProperty('left', 'auto', 'important');
    }

    const root = document.getElementById('pmd-waiter-dashboard-v161-root');
    if (root) {
      root.style.setProperty('display', 'block', 'important');
      root.style.setProperty('visibility', 'visible', 'important');
      root.style.setProperty('opacity', '1', 'important');
      root.style.setProperty('position', 'relative', 'important');
      root.style.setProperty('width', '100%', 'important');
      root.style.setProperty('max-width', '1480px', 'important');
      root.style.setProperty('margin', '0 auto', 'important');
      root.style.setProperty('padding', '0', 'important');
      root.style.setProperty('transform', 'none', 'important');
      root.style.setProperty('top', 'auto', 'important');
      root.style.setProperty('left', 'auto', 'important');
    }

    document.querySelectorAll(
      '#dashboardcontainer-container,.dashboard-widgets,.widget-container,.pmd-w3-quick-grid,.pmd-w3-bottom,#pmd-waiter-dashboard-root,#pmd-waiter-dashboard-v160-root,#pmd-waiter-v160-holder,#pmd-waiter-v149-root,#pmd-waiter-v150-root,#pmd-waiter-v151-root,#pmd-floor-v146-root'
    ).forEach(el => {
      if (el.id === 'pmd-waiter-v161-holder' || el.id === 'pmd-waiter-dashboard-v161-root') return;
      el.style.setProperty('display', 'none', 'important');
      el.style.setProperty('height', '0', 'important');
      el.style.setProperty('overflow', 'hidden', 'important');
      el.style.setProperty('opacity', '0', 'important');
      el.style.setProperty('pointer-events', 'none', 'important');
    });

    document.documentElement.style.setProperty('overflow-y', 'auto', 'important');
    document.body.style.setProperty('overflow-y', 'auto', 'important');
    document.body.style.setProperty('height', 'auto', 'important');
    document.body.style.setProperty('min-height', '100vh', 'important');
  }

  function fixAndTop() {
    fix();
    setTimeout(() => {
      if (window.scrollY < 260) {
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      }
    }, 40);
  }

  function audit() {
    const holder = document.getElementById('pmd-waiter-v161-holder');
    const root = document.getElementById('pmd-waiter-dashboard-v161-root');
    const map = root ? root.querySelector('.pmd161-map') : null;
    const topbar = root ? root.querySelector('.pmd161-topbar') : null;
    const toolbar = root ? root.querySelector('.pmd161-toolbar') : null;
    const nodes = root ? [...root.querySelectorAll('.pmd161-table-wrap')] : [];

    return {
      version: VERSION,
      v161Loaded: !!window.PMDWaiterDashboardV161,
      holder: !!holder,
      root: !!root,
      topbar: !!topbar,
      toolbar: !!toolbar,
      map: !!map,
      visibleNodes: nodes.length,
      scrollY: window.scrollY,
      holderRect: rect(holder),
      rootRect: rect(root),
      topbarRect: rect(topbar),
      toolbarRect: rect(toolbar),
      mapRect: rect(map),
      nodes: nodes.map(n => ({
        text: n.textContent.trim(),
        rect: rect(n),
        style: n.getAttribute('style')
      })),
      activeWaiterFloorCss: [...document.querySelectorAll('link[rel="stylesheet"]')]
        .filter(l => /pmd-waiter-dashboard|pmd-floor/i.test(l.href || ''))
        .map(l => l.href),
      activeWaiterFloorScripts: [...document.scripts]
        .filter(s => /pmd-waiter-dashboard|pmd-floor/i.test(s.src || ''))
        .map(s => s.src)
    };
  }

  window.PMDWaiterDashboardV162 = {
    version: VERSION,
    fix,
    audit
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fixAndTop, { once: true });
  } else {
    fixAndTop();
  }

  window.addEventListener('load', fixAndTop);

  let count = 0;
  const timer = setInterval(() => {
    fix();
    count += 1;
    if (count >= 12) clearInterval(timer);
  }, 300);

  console.log('✅ PMD waiter dashboard v162 mount position fixer loaded');
})();

/**
 * PayMyDine Tour Debug – paste in browser console while tour is running
 * Logs: introjs-showElement, introjs-fixParent, body/navbar/sidebar class & style changes
 *
 * Usage:
 *   1. Open admin, start the guided tour (welcome → Start Tour, or star icon).
 *   2. DevTools → Console. Paste this entire file, press Enter.
 *   3. Click Next/Previous; watch [TourDebug] logs for what changes.
 *   4. tourDebugStop() – stop watching.
 *   5. tourDebugSnap() – log current body/navbar/sidebar/tooltip state.
 *
 * Or load from URL (if script is served):
 *   fetch('/app/admin/assets/js/tour-debug-console.js').then(r=>r.text()).then(eval);
 */

(function tourDebug() {
  'use strict';

  const LOG = (...a) => console.log('[TourDebug]', ...a);
  const WARN = (...a) => console.warn('[TourDebug]', ...a);

  let stop = false;

  function logEl(name, el) {
    if (!el) return '(none)';
    const tag = el.tagName.toLowerCase();
    const id = el.id ? '#' + el.id : '';
    const cls = (el.getAttribute && el.getAttribute('class')) ? '.' + String(el.getAttribute('class')).split(/\s+/).filter(Boolean).join('.') : '';
    return `${name}: <${tag}${id}${cls}>`;
  }

  function snapshot(el, label) {
    if (!el) return;
    const s = (el.getAttribute && el.getAttribute('style')) || '';
    const c = (el.getAttribute && el.getAttribute('class')) || '';
    LOG(`${label} │ class: "${c}" │ style: ${s ? s.slice(0, 120) + (s.length > 120 ? '…' : '') : '(none)'}`);
  }

  function watchMutations() {
    const obs = new MutationObserver((list) => {
      if (stop) return;
      list.forEach((m) => {
        const target = m.target;
        const isBody = target === document.body;
        const isNavbar = target.closest && (target.closest('.navbar-top') || target.closest('.navbar'));
        const isSidebar = target.closest && (target.closest('.sidebar') || target.closest('.nav-side'));
        const isIntro = target.classList && (
          target.classList.contains('introjs-showElement') ||
          target.classList.contains('introjs-fixParent') ||
          target.classList.contains('introjs-overlay') ||
          target.classList.contains('introjs-helperLayer') ||
          target.classList.contains('introjs-tooltip') ||
          target.classList.contains('introjs-tooltipReferenceLayer')
        );
        const isIntroChild = target.closest && target.closest('.introjs-tooltipReferenceLayer');

        if (m.type === 'attributes') {
          if (m.attributeName === 'class') {
            const prev = m.oldValue || '';
            const curr = (target.getAttribute && target.getAttribute('class')) || '';
            if (prev !== curr) {
              const had = (s) => prev.split(/\s+/).includes(s);
              const has = (s) => curr.split(/\s+/).includes(s);
              if (had('introjs-showElement') !== has('introjs-showElement'))
                LOG(has('introjs-showElement') ? '+ introjs-showElement' : '- introjs-showElement', logEl('on', target));
              if (had('introjs-fixParent') !== has('introjs-fixParent'))
                LOG(has('introjs-fixParent') ? '+ introjs-fixParent' : '- introjs-fixParent', logEl('on', target));
              if (isBody) WARN('body class CHANGED', { from: prev, to: curr });
              else if (isNavbar) WARN('navbar class CHANGED', logEl('el', target), { from: prev, to: curr });
              else if (isSidebar) WARN('sidebar class CHANGED', logEl('el', target), { from: prev, to: curr });
              else if (isIntro || isIntroChild) LOG('intro class', logEl('el', target), { from: prev, to: curr });
            }
          }
          if (m.attributeName === 'style') {
            if (isBody) WARN('body style CHANGED', target.getAttribute('style') || '(cleared)');
            else if (isNavbar) WARN('navbar element style CHANGED', logEl('el', target), (target.getAttribute('style') || '').slice(0, 100));
            else if (isSidebar) WARN('sidebar element style CHANGED', logEl('el', target), (target.getAttribute('style') || '').slice(0, 100));
          }
        }
        if (m.type === 'childList' && (isIntro || isIntroChild || target === document.body)) {
          LOG('DOM childList', logEl('parent', target), 'added:', m.addedNodes.length, 'removed:', m.removedNodes.length);
        }
      });
    });

    obs.observe(document.body, {
      attributes: true,
      attributeFilter: ['class', 'style'],
      attributeOldValue: true,
      subtree: true,
      childList: true
    });

    return () => obs.disconnect();
  }

  function watchIntrojsPresence() {
    const check = () => {
      if (stop) return;
      const show = document.querySelectorAll('.introjs-showElement');
      const fix = document.body.classList.contains('introjs-fixParent');
      if (show.length) LOG('introjs-showElement on:', show.length, 'elements', [...show].map((el) => logEl('', el)));
      if (fix) LOG('body has introjs-fixParent');
    };
    const id = setInterval(check, 500);
    return () => clearInterval(id);
  }

  function logSnapshots() {
    LOG('--- Snapshots ---');
    snapshot(document.body, 'body');
    const nav = document.querySelector('.navbar-top') || document.querySelector('.navbar');
    const side = document.querySelector('.sidebar') || document.querySelector('.nav-side');
    if (nav) snapshot(nav, 'navbar');
    if (side) snapshot(side, 'sidebar');
    const tooltip = document.querySelector('.introjs-tooltip');
    const ref = document.querySelector('.introjs-tooltipReferenceLayer');
    if (tooltip) snapshot(tooltip, 'tooltip');
    if (ref) snapshot(ref, 'tooltipReferenceLayer');
    LOG('--- End snapshots ---');
  }

  const teardown = [];
  teardown.push(watchMutations());
  teardown.push(watchIntrojsPresence());

  LOG('Tour debug started. Click Next/Previous and watch logs.');
  LOG('Run tourDebugStop() to stop.');
  logSnapshots();

  window.tourDebugStop = function tourDebugStop() {
    stop = true;
    teardown.forEach((fn) => fn());
    LOG('Tour debug stopped.');
  };

  window.tourDebugSnap = logSnapshots;
})();

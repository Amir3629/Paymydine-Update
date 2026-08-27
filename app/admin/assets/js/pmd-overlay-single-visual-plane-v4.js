/* PMD_OVERLAY_SINGLE_VISUAL_PLANE_V4_CONSOLE_PROVEN_20260826 */
(() => {
  'use strict';

  const API = 'PMDGlobalModalConsoleEqualizer';
  const STYLE_ID = 'pmd-global-modal-console-equalizer-style';
  const PLANE_CLASS = 'pmd-console-global-modal-plane';
  const ROOT_ATTR = 'data-pmd-console-eq-root';
  const BACKDROP_ATTR = 'data-pmd-console-eq-backdrop';
  const CARD_ATTR = 'data-pmd-console-eq-card';

  const BG = 'rgba(255, 255, 255, 0.04)';
  const BLUR = 'blur(8px)';
  const DURATION = 180;
  const EASE = 'cubic-bezier(.2,.8,.2,1)';

  if (window[API] && typeof window[API].destroy === 'function') {
    try { window[API].destroy(); } catch (_) {}
  }

  const explicitRootSelector = [
    '.modal.show',
    '.modal[aria-modal="true"]',
    '.swal2-container.swal2-backdrop-show',
    '.pmd-floor-registry-manager:not([hidden])',
    '.pmd-floor-table-manager:not([hidden])',
    '.pmd-device-v6-modal:not([hidden])',
    '.pmd-settings-inline-modal:not([hidden])',
    '.pmd-coupon-modal:not([hidden])',
    '.pmd-smart-category-modal:not([hidden])',
    '.pmd-cashier-order-center:not([hidden])',
    '.pmd-cashier-pos-overlay:not([hidden])',
    '#pmd-reservation-composer-v1.show',
    '.pmd-pos-detail-modal.is-show',
    '.pmd-pos-modal.is-show',
    '.pmd-pos-payment-modal.is-show',
    '.pmd-modal[data-pmd-create-modal]:not([hidden])',
    '.pmd-modal[data-pmd-edit-modal]:not([hidden])',
  ].join(',');

  const heuristicCandidateSelector = [
    '[class*="modal"]',
    '[class*="dialog"]',
    '[class*="overlay"]',
    '[class*="drawer"]',
    '[class*="sheet"]',
    '[class*="composer"]',
    '[class*="payment"]',
    '[class*="detail"]',
    '[role="dialog"][aria-modal="true"]'
  ].join(',');

  const preferredCardSelector = [
    '.modal-dialog',
    '.swal2-popup',
    '.pmd-floor-registry-manager__card',
    '.pmd-floor-table-manager__card',
    '.pmd-device-v6-card',
    '.pmd-settings-inline-card',
    '.pmd-coupon-modal__card',
    '.pmd-smart-category-modal__card',
    '.pmd-cashier-order-center__dialog',
    '.pmd-cashier-pos-overlay__panel',
    '.pmd-pos-detail-card',
    '.pmd-pos-modal-card',
    '.pmd-pos-payment-dialog',
    '[role="document"]',
    '[class*="modal__card"]',
    '[class*="modal-card"]',
    '[class*="dialog__card"]',
    '[class*="dialog-card"]',
    '[class*="__dialog"]',
    '[class*="__panel"]'
  ].join(',');

  const obviousBackdropSelector = [
    '.modal-backdrop',
    '.offcanvas-backdrop',
    '[class*="backdrop"]:not([class*="tour"])',
    '[class*="scrim"]',
    '[class*="mask"]',
    '[data-backdrop]'
  ].join(',');

  const observedRoots = new Map();
  const activeModalRoots = new Set();
  const animatedOpenRoots = new WeakSet();
  const injectedStyleRoots = new WeakSet();
  const reports = new WeakMap();
  let scheduled = false;
  let destroyed = false;

  function styleText() {
    return `
      /* PMD GLOBAL MODAL CONSOLE EQUALIZER */
      .pmd-overlay-single-visual-plane-v4,
      .pmd-overlay-runtime-v3-synthetic {
        display: none !important;
        opacity: 0 !important;
        visibility: hidden !important;
        pointer-events: none !important;
      }

      [${ROOT_ATTR}="1"] {
        background: transparent !important;
        background-color: transparent !important;
        backdrop-filter: none !important;
        -webkit-backdrop-filter: none !important;
        filter: none !important;
        -webkit-filter: none !important;
      }

      [${ROOT_ATTR}="1"]::before,
      [${ROOT_ATTR}="1"]::after {
        background: transparent !important;
        background-color: transparent !important;
        backdrop-filter: none !important;
        -webkit-backdrop-filter: none !important;
        filter: none !important;
        -webkit-filter: none !important;
        box-shadow: none !important;
      }

      [${BACKDROP_ATTR}="1"] {
        background: transparent !important;
        background-color: transparent !important;
        backdrop-filter: none !important;
        -webkit-backdrop-filter: none !important;
        filter: none !important;
        -webkit-filter: none !important;
        animation: none !important;
      }

      [${BACKDROP_ATTR}="1"]::before,
      [${BACKDROP_ATTR}="1"]::after {
        background: transparent !important;
        background-color: transparent !important;
        backdrop-filter: none !important;
        -webkit-backdrop-filter: none !important;
        filter: none !important;
        -webkit-filter: none !important;
        box-shadow: none !important;
        animation: none !important;
      }

      .${PLANE_CLASS} {
        position: absolute !important;
        inset: 0 !important;
        width: 100% !important;
        height: 100% !important;
        margin: 0 !important;
        padding: 0 !important;
        border: 0 !important;
        z-index: 0 !important;
        pointer-events: none !important;
        background: ${BG} !important;
        background-color: ${BG} !important;
        backdrop-filter: ${BLUR} !important;
        -webkit-backdrop-filter: ${BLUR} !important;
        filter: none !important;
        -webkit-filter: none !important;
      }

      [${CARD_ATTR}="1"] {
        position: relative !important;
        z-index: 2 !important;
        filter: none !important;
        -webkit-filter: none !important;
        backdrop-filter: none !important;
        -webkit-backdrop-filter: none !important;
        animation: none !important;
      }

      @media (prefers-reduced-motion: reduce) {
        .${PLANE_CLASS},
        [${CARD_ATTR}="1"] {
          animation: none !important;
          transition: none !important;
        }
      }
    `;
  }

  function rootLabel(root) {
    if (!root) return 'unknown';
    if (root === document) return 'document';
    if (root.host) {
      const h = root.host;
      return 'shadow:' + h.tagName.toLowerCase() + (h.id ? '#' + h.id : '') +
        (typeof h.className === 'string' && h.className.trim()
          ? '.' + h.className.trim().replace(/\s+/g, '.')
          : '');
    }
    return 'root';
  }

  function elementLabel(el) {
    if (!el) return '-';
    let out = el.tagName ? el.tagName.toLowerCase() : 'node';
    if (el.id) out += '#' + el.id;
    if (typeof el.className === 'string' && el.className.trim()) {
      out += '.' + el.className.trim().replace(/\s+/g, '.');
    }
    return out;
  }

  function injectStyle(root) {
    if (!root || injectedStyleRoots.has(root)) return;

    let style;
    if (root === document) {
      document.getElementById(STYLE_ID)?.remove();
      style = document.createElement('style');
      style.id = STYLE_ID;
      style.textContent = styleText();
      (document.head || document.documentElement).appendChild(style);
    } else {
      style = document.createElement('style');
      style.setAttribute('data-pmd-console-eq-style', '1');
      style.textContent = styleText();
      root.appendChild(style);
    }

    injectedStyleRoots.add(root);
  }

  function isVisible(el) {
    if (!el || !el.isConnected || !el.getBoundingClientRect) return false;
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    if (
      cs.display === 'none' ||
      cs.visibility === 'hidden' ||
      Number(cs.opacity || 1) <= 0.01 ||
      r.width < 2 ||
      r.height < 2
    ) return false;
    return true;
  }

  function coversViewport(el, ratio = 0.68) {
    if (!el || !el.getBoundingClientRect) return false;
    const r = el.getBoundingClientRect();
    const vw = Math.max(1, window.innerWidth || document.documentElement.clientWidth || 1);
    const vh = Math.max(1, window.innerHeight || document.documentElement.clientHeight || 1);
    return r.width >= vw * ratio && r.height >= vh * ratio;
  }

  function semanticText(el) {
    return [
      el.id || '',
      typeof el.className === 'string' ? el.className : '',
      el.getAttribute && el.getAttribute('role') || '',
      el.getAttribute && el.getAttribute('data-modal') || '',
      el.getAttribute && el.getAttribute('data-dialog') || '',
      el.getAttribute && el.getAttribute('aria-modal') || ''
    ].join(' ').toLowerCase();
  }

  function isModalRoot(el) {
    if (!el || el.nodeType !== 1 || !isVisible(el)) return false;
    if (el.classList && el.classList.contains(PLANE_CLASS)) return false;

    // PMD_R76_CASHIER_PAYMENT_SKIP_GLOBAL_VISUAL_PLANE
    // Cashier Composer is already a modal visual plane. Its nested Payment
    // modal must not receive a second 180ms blur/fade/scale animation from
    // this global Admin equalizer, otherwise Safari/desktop shows a blink.
    if (
      el.matches &&
      el.matches('.pmd-pos-payment-modal') &&
      el.closest &&
      el.closest('#pmd-cashier-order-composer-v1.pmd-coc')
    ) {
      return false;
    }

    try {
      if (el.matches(explicitRootSelector)) return true;
    } catch (_) {}

    const cs = getComputedStyle(el);
    if (cs.position !== 'fixed') return false;
    if (!coversViewport(el, 0.68)) return false;

    const z = parseInt(cs.zIndex, 10);
    if (Number.isFinite(z) && z < 900) return false;

    const s = semanticText(el);
    if (/backdrop|scrim|mask|tooltip|popover|dropdown|tour/.test(s)) return false;
    return /modal|dialog|overlay|drawer|sheet|composer|payment|detail|editor|create|edit|confirm|coupon|device|settings|order-center/.test(s);
  }

  function alphaFromColor(color) {
    if (!color || color === 'transparent') return 0;
    const m = color.match(/rgba?\(([^)]+)\)/i);
    if (!m) return color === 'transparent' ? 0 : 1;
    const parts = m[1].split(',').map(x => x.trim());
    if (parts.length < 4) return 1;
    const a = Number(parts[3]);
    return Number.isFinite(a) ? a : 1;
  }

  function isBackdropLike(el, root, card) {
    if (!el || el === root || el === card || !isVisible(el)) return false;
    if (el.classList && el.classList.contains(PLANE_CLASS)) return false;
    if (card && (card.contains(el) || el.contains(card))) {
      if (!el.matches || !el.matches(obviousBackdropSelector)) return false;
    }

    const cs = getComputedStyle(el);
    if (cs.position !== 'absolute' && cs.position !== 'fixed') return false;

    const rr = root.getBoundingClientRect();
    const er = el.getBoundingClientRect();
    if (er.width < rr.width * 0.82 || er.height < rr.height * 0.82) return false;

    const s = semanticText(el);
    const named = /backdrop|scrim|mask/.test(s);
    const paints =
      alphaFromColor(cs.backgroundColor) > 0.01 ||
      (cs.backgroundImage && cs.backgroundImage !== 'none') ||
      (cs.backdropFilter && cs.backdropFilter !== 'none') ||
      (cs.webkitBackdropFilter && cs.webkitBackdropFilter !== 'none');

    return named || paints;
  }

  function cardDepth(card, root) {
    let d = 0;
    let n = card;
    while (n && n !== root && d < 20) {
      d += 1;
      n = n.parentElement;
    }
    return d;
  }

  function chooseCard(root) {
    if (!root || !root.querySelector) return null;

    try {
      const preferred = root.querySelector(preferredCardSelector);
      if (preferred && isVisible(preferred)) return preferred;
    } catch (_) {}

    const rr = root.getBoundingClientRect();
    const candidates = [];

    root.querySelectorAll('div,section,article,form,aside').forEach(el => {
      if (!isVisible(el)) return;
      if (el.classList && el.classList.contains(PLANE_CLASS)) return;

      const er = el.getBoundingClientRect();
      if (er.width < 180 || er.height < 70) return;
      if (er.width > rr.width * 0.97 && er.height > rr.height * 0.92) return;

      const cs = getComputedStyle(el);
      const bg = alphaFromColor(cs.backgroundColor);
      const radius = parseFloat(cs.borderTopLeftRadius) || 0;
      const depth = cardDepth(el, root);

      if (bg <= 0.02 && radius < 4) return;

      const cx = er.left + er.width / 2;
      const cy = er.top + er.height / 2;
      const rcx = rr.left + rr.width / 2;
      const rcy = rr.top + rr.height / 2;
      const centerDistance = Math.hypot(cx - rcx, cy - rcy);
      const area = er.width * er.height;

      candidates.push({ el, depth, centerDistance, area });
    });

    candidates.sort((a, b) =>
      a.depth - b.depth ||
      a.centerDistance - b.centerDistance ||
      b.area - a.area
    );

    return candidates.length ? candidates[0].el : null;
  }

  function setImportant(el, prop, value) {
    if (!el || !el.style) return;
    try {
      if (
        el.style.getPropertyValue(prop) === value &&
        el.style.getPropertyPriority(prop) === 'important'
      ) return;
      el.style.setProperty(prop, value, 'important');
    } catch (_) {}
  }

  function neutralizeBackdrop(el, descendant) {
    if (!el || !el.style) return;
    if (el.getAttribute(BACKDROP_ATTR) !== '1') el.setAttribute(BACKDROP_ATTR, '1');
    setImportant(el, 'background', 'transparent');
    setImportant(el, 'background-color', 'transparent');
    setImportant(el, 'backdrop-filter', 'none');
    setImportant(el, '-webkit-backdrop-filter', 'none');
    setImportant(el, 'filter', 'none');
    setImportant(el, '-webkit-filter', 'none');
    setImportant(el, 'animation', 'none');
    if (descendant) {
      const z = parseInt(getComputedStyle(el).zIndex, 10);
      if (!Number.isFinite(z) || z <= 1) setImportant(el, 'z-index', '1');
    }
  }

  function ensurePlane(root) {
    let plane = null;
    try { plane = root.querySelector(':scope > .' + PLANE_CLASS); } catch (_) {}
    if (!plane) {
      plane = document.createElement('div');
      plane.className = PLANE_CLASS;
      plane.setAttribute('aria-hidden', 'true');
      root.insertBefore(plane, root.firstChild || null);
    }
    return plane;
  }

  function animateOpen(root, plane, card) {
    if (animatedOpenRoots.has(root)) return;
    animatedOpenRoots.add(root);

    try {
      // PMD_OVERLAY_IMMEDIATE_BLUR_V1B
    plane.animate(
        [
          { opacity: 0.28, backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' },
          { opacity: 1, backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }
        ],
        { duration: 90, easing: 'ease-out' }
      );
    } catch (_) {}

    if (card) {
      try {
        card.animate(
          [
            { opacity: 0, transform: 'translateY(6px) scale(.985)' },
            { opacity: 1, transform: 'none' }
          ],
          { duration: DURATION, easing: EASE }
        );
      } catch (_) {}
    }
  }

  function normalizeRoot(root, paintPlane) {
    if (!root || !isModalRoot(root)) return false;

    if (root.getAttribute(ROOT_ATTR) !== '1') root.setAttribute(ROOT_ATTR, '1');
    setImportant(root, 'background', 'transparent');
    setImportant(root, 'background-color', 'transparent');
    setImportant(root, 'backdrop-filter', 'none');
    setImportant(root, '-webkit-backdrop-filter', 'none');
    setImportant(root, 'filter', 'none');
    setImportant(root, '-webkit-filter', 'none');

    const card = chooseCard(root);
    if (card) {
      if (card.getAttribute(CARD_ATTR) !== '1') card.setAttribute(CARD_ATTR, '1');
      setImportant(card, 'filter', 'none');
      setImportant(card, '-webkit-filter', 'none');
      setImportant(card, 'backdrop-filter', 'none');
      setImportant(card, '-webkit-backdrop-filter', 'none');
      setImportant(card, 'animation', 'none');
      setImportant(card, 'z-index', '2');
    }

    const backdrops = [];
    root.querySelectorAll('*').forEach(el => {
      if (isBackdropLike(el, root, card)) {
        neutralizeBackdrop(el, true);
        backdrops.push(el);
      }
    });

    let plane = null;
    if (paintPlane) {
      plane = ensurePlane(root);
      animateOpen(root, plane, card);
    } else {
      try { root.querySelector(':scope > .' + PLANE_CLASS)?.remove(); } catch (_) {}
      if (!animatedOpenRoots.has(root) && card) {
        try {
          card.animate(
            [
              { opacity: 0, transform: 'translateY(6px) scale(.985)' },
              { opacity: 1, transform: 'none' }
            ],
            { duration: DURATION, easing: EASE }
          );
        } catch (_) {}
        animatedOpenRoots.add(root);
      }
    }

    activeModalRoots.add(root);
    reports.set(root, {
      root: elementLabel(root),
      card: elementLabel(card),
      backdrops: backdrops.map(elementLabel),
      domRoot: rootLabel(root.getRootNode()),
      visualPlane: paintPlane ? 'YES' : 'suspended'
    });

    return true;
  }

  function resetClosedRoots() {
    Array.from(activeModalRoots).forEach(root => {
      if (!root.isConnected || !isVisible(root)) {
        animatedOpenRoots.delete(root);
        activeModalRoots.delete(root);
        try { root.querySelector(':scope > .' + PLANE_CLASS)?.remove(); } catch (_) {}
      }
    });
  }

  function normalizeExternalBackdrops(rootNode) {
    if (!rootNode || !rootNode.querySelectorAll) return;

    rootNode.querySelectorAll('.modal-backdrop, .offcanvas-backdrop').forEach(backdrop => {
      if (!isVisible(backdrop)) return;

      const hasModalPlane = Array.from(activeModalRoots).some(root => {
        const rn = root.getRootNode();
        return rn === rootNode && root.matches && root.matches('.modal.show, .modal[aria-modal="true"]');
      });

      if (backdrop.matches('.modal-backdrop') && hasModalPlane) {
        neutralizeBackdrop(backdrop, false);
        return;
      }

      if (backdrop.matches('.offcanvas-backdrop')) {
        backdrop.removeAttribute(BACKDROP_ATTR);
        setImportant(backdrop, 'background', BG);
        setImportant(backdrop, 'background-color', BG);
        setImportant(backdrop, 'backdrop-filter', BLUR);
        setImportant(backdrop, '-webkit-backdrop-filter', BLUR);
        setImportant(backdrop, 'filter', 'none');
        setImportant(backdrop, '-webkit-filter', 'none');
        setImportant(backdrop, 'opacity', '1');
      }
    });
  }

  function candidateElements(rootNode) {
    const out = new Set();
    if (!rootNode || !rootNode.querySelectorAll) return out;

    try { rootNode.querySelectorAll(explicitRootSelector).forEach(el => out.add(el)); } catch (_) {}
    try { rootNode.querySelectorAll(heuristicCandidateSelector).forEach(el => out.add(el)); } catch (_) {}
    return out;
  }

  function scanRoot(rootNode) {
    if (destroyed || !rootNode) return;
    injectStyle(rootNode);

    const modalRoots = Array.from(candidateElements(rootNode)).filter(isModalRoot);

    function domDepth(el) {
      let depth = 0;
      let n = el;
      while (n && n.parentElement) { depth += 1; n = n.parentElement; }
      return depth;
    }

    function zIndexOf(el) {
      const z = parseInt(getComputedStyle(el).zIndex, 10);
      return Number.isFinite(z) ? z : 0;
    }

    let visualOwner = null;
    modalRoots.forEach(root => {
      if (!visualOwner) { visualOwner = root; return; }

      if (visualOwner.contains(root)) { visualOwner = root; return; }
      if (root.contains(visualOwner)) return;

      const za = zIndexOf(visualOwner);
      const zb = zIndexOf(root);
      if (zb > za || (zb === za && domDepth(root) >= domDepth(visualOwner))) {
        visualOwner = root;
      }
    });

    modalRoots.forEach(root => normalizeRoot(root, root === visualOwner));
    resetClosedRoots();
    normalizeExternalBackdrops(rootNode);
    discoverOpenShadowRoots(rootNode);
  }

  function scheduleScan() {
    if (scheduled || destroyed) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      observedRoots.forEach((_, rootNode) => scanRoot(rootNode));
    });
  }

  function observeRoot(rootNode) {
    if (!rootNode || observedRoots.has(rootNode)) return;
    injectStyle(rootNode);

    const target = rootNode === document ? document.documentElement : rootNode;
    if (!target) return;

    const observer = new MutationObserver(() => scheduleScan());
    observer.observe(target, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['class', 'style', 'hidden', 'aria-hidden', 'aria-modal', 'open']
    });
    observedRoots.set(rootNode, observer);
    scanRoot(rootNode);
  }

  function discoverOpenShadowRoots(rootNode) {
    if (!rootNode || !rootNode.querySelectorAll) return;
    rootNode.querySelectorAll('*').forEach(el => {
      if (el.shadowRoot) observeRoot(el.shadowRoot);
    });
  }

  function eventScanHandler() { scheduleScan(); }

  function report() {
    const rows = [];
    activeModalRoots.forEach(root => {
      if (!isVisible(root)) return;
      const r = reports.get(root) || {};
      rows.push({
        root: r.root || elementLabel(root),
        card: r.card || '-',
        backdrops: (r.backdrops || []).join(' | ') || '-',
        domRoot: r.domRoot || rootLabel(root.getRootNode()),
        visualPlane: r.visualPlane || '-'
      });
    });
    console.table(rows);
    return rows;
  }

  function destroy() {
    if (destroyed) return;
    destroyed = true;

    observedRoots.forEach((observer, rootNode) => {
      try { observer.disconnect(); } catch (_) {}
      try {
        rootNode.querySelectorAll('.' + PLANE_CLASS).forEach(el => el.remove());
        rootNode.querySelectorAll(`[${ROOT_ATTR}], [${BACKDROP_ATTR}], [${CARD_ATTR}]`).forEach(el => {
          el.removeAttribute(ROOT_ATTR);
          el.removeAttribute(BACKDROP_ATTR);
          el.removeAttribute(CARD_ATTR);
        });
        rootNode.querySelectorAll('[data-pmd-console-eq-style]').forEach(el => el.remove());
      } catch (_) {}
    });
    observedRoots.clear();

    document.getElementById(STYLE_ID)?.remove();

    document.removeEventListener('click', eventScanHandler, true);
    document.removeEventListener('shown.bs.modal', eventScanHandler, true);
    document.removeEventListener('show.bs.modal', eventScanHandler, true);

    delete window[API];
    console.log('PMD GLOBAL MODAL CONSOLE EQUALIZER REMOVED');
  }

  window[API] = {
    run: scheduleScan,
    report,
    destroy,
    contract: {
      background: BG,
      blur: BLUR,
      durationMs: DURATION,
      card: 'sharp',
      visualPlanesPerModal: 1
    }
  };

  observeRoot(document);
  discoverOpenShadowRoots(document);

  document.addEventListener('click', eventScanHandler, true);
  document.addEventListener('shown.bs.modal', eventScanHandler, true);
  document.addEventListener('show.bs.modal', eventScanHandler, true);

  scheduleScan();

  console.log('✅ PMD GLOBAL MODAL CONSOLE EQUALIZER ACTIVE');
  console.log(window[API].contract);
  console.log('Use PMDGlobalModalConsoleEqualizer.report() while a card is open.');
})();

/*
 * PMD_MODAL_CHROME_AUTHORITY_V1_DARK_GREEN_PROVEN
 *
 * Productionized from the browser-proven Modal Chrome Equalizer
 * plus the approved PMD dark-green primary-button treatment.
 *
 * Scope:
 * - modal/card roots already owned by PMDGlobalModalConsoleEqualizer
 * - document DOM
 * - open Shadow DOM
 *
 * Excludes:
 * - dropdowns
 * - popovers
 * - tours
 * - tab controls
 * - quantity/stepper micro-controls
 */
(() => {
    'use strict';

    const API =
        'PMDModalChromeAuthorityV1';

    const STYLE_ID =
        'pmd-modal-chrome-authority-v1-style';

    const ROOT =
        '[data-pmd-console-eq-root="1"]';

    const CARD =
        '[data-pmd-console-eq-card="1"]';

    const TITLE_ATTR =
        'data-pmd-modal-ui-title';

    const CLOSE_ATTR =
        'data-pmd-modal-ui-close';

    const BUTTON_ATTR =
        'data-pmd-modal-ui-button';


    if (
        window[API] &&
        typeof window[API].destroy === 'function'
    ) {
        try {
            window[API].destroy();
        } catch (_) {}
    }


    const TOKENS = {
        ink: '#092f2b',
        text: '#10283d',
        muted: '#637b96',

        green: '#075f4f',
        greenStrong: '#064b40',

        line: 'rgba(96,190,232,.50)',
        lineSoft: 'rgba(96,190,232,.28)',

        danger: '#b42318',
        dangerSoft: '#fff1f0',

        shadow:
            '0 28px 80px rgba(12,39,58,.16)',

        radius: '22px',
        buttonRadius: '14px',
        buttonHeight: '44px'
    };


    const observed = new Map();
    const injected = new WeakSet();

    let scheduled = false;
    let destroyed = false;


    function cssText() {
        return `

${ROOT} ${CARD} {
    border:
        1px solid ${TOKENS.line} !important;

    border-radius:
        ${TOKENS.radius} !important;

    background:
        #fff !important;

    box-shadow:
        ${TOKENS.shadow} !important;

    color:
        ${TOKENS.text} !important;
}


/* =========================================================
   TITLE
   ========================================================= */

${ROOT} [${TITLE_ATTR}="1"] {
    margin-top:
        0 !important;

    margin-bottom:
        0 !important;

    color:
        ${TOKENS.ink} !important;

    font-size:
        22px !important;

    line-height:
        1.15 !important;

    font-weight:
        900 !important;

    letter-spacing:
        -.03em !important;
}


/* =========================================================
   UNIVERSAL CLOSE X
   ========================================================= */

${ROOT} [${CLOSE_ATTR}="1"] {
    position:
        relative !important;

    width:
        44px !important;

    min-width:
        44px !important;

    max-width:
        44px !important;

    height:
        44px !important;

    min-height:
        44px !important;

    max-height:
        44px !important;

    margin:
        0 !important;

    padding:
        0 !important;

    display:
        inline-grid !important;

    place-items:
        center !important;

    flex:
        0 0 44px !important;

    border:
        1px solid ${TOKENS.line} !important;

    border-radius:
        14px !important;

    background:
        #fff !important;

    background-image:
        none !important;

    color:
        ${TOKENS.ink} !important;

    box-shadow:
        0 10px 24px
        rgba(12,39,58,.045) !important;

    font-size:
        0 !important;

    line-height:
        1 !important;

    text-decoration:
        none !important;

    cursor:
        pointer !important;
}


${ROOT} [${CLOSE_ATTR}="1"]::before,
${ROOT} [${CLOSE_ATTR}="1"]::after {
    content:
        "" !important;

    position:
        absolute !important;

    left:
        50% !important;

    top:
        50% !important;

    width:
        18px !important;

    height:
        2px !important;

    border:
        0 !important;

    border-radius:
        999px !important;

    background:
        currentColor !important;

    transform-origin:
        center !important;

    pointer-events:
        none !important;
}


${ROOT} [${CLOSE_ATTR}="1"]::before {
    transform:
        translate(-50%,-50%)
        rotate(45deg) !important;
}


${ROOT} [${CLOSE_ATTR}="1"]::after {
    transform:
        translate(-50%,-50%)
        rotate(-45deg) !important;
}


${ROOT} [${CLOSE_ATTR}="1"] > svg,
${ROOT} [${CLOSE_ATTR}="1"] > i,
${ROOT} [${CLOSE_ATTR}="1"] > span {
    visibility:
        hidden !important;
}


/* =========================================================
   PRIMARY
   APPROVED DARK GREEN
   ========================================================= */

${ROOT} [${BUTTON_ATTR}="primary"] {
    min-height:
        ${TOKENS.buttonHeight} !important;

    padding:
        0 16px !important;

    border:
        1px solid #064b40 !important;

    border-radius:
        ${TOKENS.buttonRadius} !important;

    background:
        linear-gradient(
            90deg,
            #020d0a 0%,
            #043d34 10%,
            #064b40 24%,
            #075f4f 42%,
            #08705d 50%,
            #075f4f 58%,
            #064b40 76%,
            #043d34 90%,
            #020d0a 100%
        ) !important;

    background-image:
        linear-gradient(
            90deg,
            #020d0a 0%,
            #043d34 10%,
            #064b40 24%,
            #075f4f 42%,
            #08705d 50%,
            #075f4f 58%,
            #064b40 76%,
            #043d34 90%,
            #020d0a 100%
        ) !important;

    color:
        #fff !important;

    font-size:
        13px !important;

    font-weight:
        850 !important;

    line-height:
        1 !important;

    letter-spacing:
        .01em !important;

    box-shadow:
        inset 0 1px 0
            rgba(255,255,255,.10),
        inset 0 -1px 0
            rgba(0,0,0,.22),
        0 8px 18px
            rgba(2,45,37,.18),
        0 2px 5px
            rgba(0,0,0,.10) !important;

    text-shadow:
        0 1px 1px
        rgba(0,0,0,.20) !important;

    text-decoration:
        none !important;

    transition:
        transform 150ms ease,
        box-shadow 150ms ease,
        filter 150ms ease !important;
}


${ROOT} [${BUTTON_ATTR}="primary"]:hover {
    border-color:
        #043d34 !important;

    background:
        linear-gradient(
            90deg,
            #010806 0%,
            #03352d 10%,
            #054c40 24%,
            #066956 42%,
            #087762 50%,
            #066956 58%,
            #054c40 76%,
            #03352d 90%,
            #010806 100%
        ) !important;

    background-image:
        linear-gradient(
            90deg,
            #010806 0%,
            #03352d 10%,
            #054c40 24%,
            #066956 42%,
            #087762 50%,
            #066956 58%,
            #054c40 76%,
            #03352d 90%,
            #010806 100%
        ) !important;

    box-shadow:
        inset 0 1px 0
            rgba(255,255,255,.12),
        inset 0 -1px 0
            rgba(0,0,0,.25),
        0 10px 22px
            rgba(2,45,37,.22),
        0 3px 7px
            rgba(0,0,0,.12) !important;

    filter:
        brightness(1.025) !important;

    transform:
        translateY(-1px) !important;
}


${ROOT} [${BUTTON_ATTR}="primary"]:active {
    transform:
        translateY(0) !important;

    box-shadow:
        inset 0 2px 5px
            rgba(0,0,0,.22),
        0 4px 10px
            rgba(2,45,37,.16) !important;

    filter:
        brightness(.96) !important;
}


${ROOT} [${BUTTON_ATTR}="primary"]:focus-visible {
    outline:
        none !important;

    box-shadow:
        0 0 0 3px
            rgba(7,95,79,.16),
        inset 0 1px 0
            rgba(255,255,255,.10),
        0 8px 18px
            rgba(2,45,37,.18) !important;
}


/* =========================================================
   SECONDARY
   ========================================================= */

${ROOT} [${BUTTON_ATTR}="secondary"] {
    min-height:
        ${TOKENS.buttonHeight} !important;

    padding:
        0 16px !important;

    border:
        1px solid
        rgba(7,95,79,.22) !important;

    border-radius:
        ${TOKENS.buttonRadius} !important;

    background:
        #fff !important;

    background-image:
        none !important;

    color:
        ${TOKENS.green} !important;

    font-size:
        13px !important;

    font-weight:
        850 !important;

    line-height:
        1 !important;

    letter-spacing:
        .01em !important;

    box-shadow:
        0 10px 24px
        rgba(12,39,58,.045) !important;

    text-decoration:
        none !important;
}


${ROOT} [${BUTTON_ATTR}="secondary"]:hover,
${ROOT} [${BUTTON_ATTR}="secondary"]:focus-visible {
    background:
        #edf8f4 !important;

    border-color:
        rgba(7,95,79,.42) !important;

    color:
        ${TOKENS.greenStrong} !important;
}


/* =========================================================
   DANGER
   ========================================================= */

${ROOT} [${BUTTON_ATTR}="danger"] {
    min-height:
        ${TOKENS.buttonHeight} !important;

    padding:
        0 16px !important;

    border:
        1px solid
        rgba(180,35,24,.18) !important;

    border-radius:
        ${TOKENS.buttonRadius} !important;

    background:
        ${TOKENS.dangerSoft} !important;

    background-image:
        none !important;

    color:
        ${TOKENS.danger} !important;

    font-size:
        13px !important;

    font-weight:
        850 !important;

    line-height:
        1 !important;

    letter-spacing:
        .01em !important;

    box-shadow:
        none !important;

    text-decoration:
        none !important;
}


${ROOT} [${BUTTON_ATTR}][disabled],
${ROOT} [${BUTTON_ATTR}][aria-disabled="true"] {
    opacity:
        .55 !important;

    cursor:
        not-allowed !important;
}
`;
    }


    function inject(rootNode) {
        if (
            !rootNode ||
            injected.has(rootNode)
        ) {
            return;
        }

        const style =
            document.createElement('style');

        if (rootNode === document) {

            document
                .getElementById(STYLE_ID)
                ?.remove();

            style.id = STYLE_ID;

        } else {

            style.setAttribute(
                'data-pmd-modal-chrome-authority-style',
                '1'
            );
        }

        style.textContent =
            cssText();

        (
            rootNode === document
                ? (
                    document.head ||
                    document.documentElement
                )
                : rootNode
        ).appendChild(style);

        injected.add(rootNode);
    }


    function visible(el) {
        if (
            !el ||
            !el.isConnected ||
            !el.getBoundingClientRect
        ) {
            return false;
        }

        const cs =
            getComputedStyle(el);

        const r =
            el.getBoundingClientRect();

        return (
            cs.display !== 'none' &&
            cs.visibility !== 'hidden' &&
            Number(cs.opacity || 1) > .01 &&
            r.width > 2 &&
            r.height > 2
        );
    }


    function text(el) {
        return String(
            el?.innerText ||
            el?.textContent ||
            el?.value ||
            ''
        )
            .replace(/\s+/g, ' ')
            .trim();
    }


    function semantic(el) {
        return [
            el?.id || '',

            typeof el?.className === 'string'
                ? el.className
                : '',

            el?.getAttribute?.('name') || '',

            el?.getAttribute?.('aria-label') || '',

            el?.getAttribute?.('title') || '',

            text(el)

        ]
            .join(' ')
            .toLowerCase();
    }


    function chooseTitle(card) {
        const rect =
            card.getBoundingClientRect();

        const selectors = [
            '.modal-title',

            '[class*="__title"]',
            '[class*="-title"]',

            '[class*="heading"] h1',
            '[class*="heading"] h2',
            '[class*="heading"] h3',

            'header h1',
            'header h2',
            'header h3',

            'h1',
            'h2',
            'h3'
        ].join(',');


        const candidates =
            Array
                .from(
                    card.querySelectorAll(
                        selectors
                    )
                )
                .filter(el => {

                    if (!visible(el)) {
                        return false;
                    }

                    const r =
                        el.getBoundingClientRect();

                    /*
                     * Only the main card heading.
                     * Do not restyle section headings
                     * further down the form.
                     */
                    if (
                        r.top >
                        rect.top + 170
                    ) {
                        return false;
                    }

                    const fs =
                        parseFloat(
                            getComputedStyle(el)
                                .fontSize
                        ) || 0;

                    return fs >= 15;
                });


        candidates.sort(
            (a, b) =>
                a.getBoundingClientRect().top -
                b.getBoundingClientRect().top
        );


        return candidates[0] || null;
    }


    function isClose(el, card) {
        if (!visible(el)) {
            return false;
        }

        const r =
            el.getBoundingClientRect();

        const cr =
            card.getBoundingClientRect();

        if (
            r.top >
            cr.top + 170
        ) {
            return false;
        }

        const s =
            semantic(el);

        if (
            /close|dismiss|modal-close|dialog-close/
                .test(s)
        ) {
            return true;
        }

        const t =
            text(el).toLowerCase();

        return (
            t === '×' ||
            t === '✕' ||
            t === '✖' ||
            t === 'x'
        );
    }


    function isExcludedMicroControl(el) {
        const s =
            semantic(el);

        const t =
            text(el).trim();

        if (
            el.closest(
                [
                    '[role="tablist"]',
                    '.dropdown-menu',
                    '[class*="popover"]',
                    '[class*="tour"]',

                    '[class*="quantity"]',
                    '[class*="stepper"]',
                    '[class*="counter"]',

                    '[data-qty]',
                    '[data-quantity]'
                ].join(',')
            )
        ) {
            return true;
        }

        if (
            /qty|quantity|stepper|increment|decrement/
                .test(s)
        ) {
            return true;
        }

        if (
            /^(\+|−|-|–|—|‹|›|<|>)$/
                .test(t)
        ) {
            return true;
        }

        return false;
    }


    function classifyButton(el) {
        const s =
            semantic(el);


        if (
            /delete|remove|void|refund|destroy/
                .test(s)
        ) {
            return 'danger';
        }


        if (
            /primary|save|confirm|create|update|submit|apply|continue|complete|done|pay|charge|add\b|yes\b/
                .test(s)
        ) {
            return 'primary';
        }


        return 'secondary';
    }


    function buttonCandidates(card) {
        return Array.from(
            card.querySelectorAll(
                [
                    'button',
                    'a.btn',
                    'a[class*="button"]',
                    'a[class*="btn"]',
                    'input[type="submit"]',
                    'input[type="button"]'
                ].join(',')
            )
        );
    }


    function normalizeCard(card) {
        if (
            !card ||
            !visible(card)
        ) {
            return;
        }


        card
            .querySelectorAll(
                `[${TITLE_ATTR}]`
            )
            .forEach(el =>
                el.removeAttribute(
                    TITLE_ATTR
                )
            );


        card
            .querySelectorAll(
                `[${CLOSE_ATTR}]`
            )
            .forEach(el =>
                el.removeAttribute(
                    CLOSE_ATTR
                )
            );


        card
            .querySelectorAll(
                `[${BUTTON_ATTR}]`
            )
            .forEach(el =>
                el.removeAttribute(
                    BUTTON_ATTR
                )
            );


        const title =
            chooseTitle(card);

        if (title) {
            title.setAttribute(
                TITLE_ATTR,
                '1'
            );
        }


        buttonCandidates(card)
            .forEach(btn => {

                if (
                    isClose(
                        btn,
                        card
                    )
                ) {
                    btn.setAttribute(
                        CLOSE_ATTR,
                        '1'
                    );

                    return;
                }


                if (
                    isExcludedMicroControl(
                        btn
                    )
                ) {
                    return;
                }


                const r =
                    btn.getBoundingClientRect();

                if (
                    r.width < 34 ||
                    r.height < 28
                ) {
                    return;
                }


                btn.setAttribute(
                    BUTTON_ATTR,
                    classifyButton(btn)
                );
            });
    }


    function discoverShadow(rootNode) {
        if (
            !rootNode?.querySelectorAll
        ) {
            return;
        }


        rootNode
            .querySelectorAll('*')
            .forEach(el => {

                if (el.shadowRoot) {
                    observe(
                        el.shadowRoot
                    );
                }
            });
    }


    function scan(rootNode) {
        if (
            destroyed ||
            !rootNode?.querySelectorAll
        ) {
            return;
        }


        inject(rootNode);


        rootNode
            .querySelectorAll(
                `${ROOT} ${CARD}`
            )
            .forEach(
                normalizeCard
            );


        discoverShadow(
            rootNode
        );
    }


    function schedule() {
        if (
            scheduled ||
            destroyed
        ) {
            return;
        }


        scheduled = true;


        requestAnimationFrame(() => {

            scheduled = false;


            observed.forEach(
                (_, rootNode) =>
                    scan(rootNode)
            );
        });
    }


    function observe(rootNode) {
        if (
            !rootNode ||
            observed.has(rootNode)
        ) {
            return;
        }


        inject(rootNode);


        const target =
            rootNode === document
                ? document.documentElement
                : rootNode;


        const mo =
            new MutationObserver(
                schedule
            );


        mo.observe(
            target,
            {
                subtree: true,
                childList: true,
                attributes: true,

                attributeFilter: [
                    'class',
                    'style',
                    'hidden',
                    'aria-hidden',
                    'aria-label'
                ]
            }
        );


        observed.set(
            rootNode,
            mo
        );


        scan(
            rootNode
        );
    }


    function report() {
        const rows = [];


        observed.forEach(
            (_, rootNode) => {

                rootNode
                    .querySelectorAll?.(
                        `${ROOT} ${CARD}`
                    )
                    .forEach(card => {

                        if (!visible(card)) {
                            return;
                        }


                        rows.push({
                            card:
                                card.className ||
                                card.id ||
                                card.tagName,

                            title:
                                text(
                                    card.querySelector(
                                        `[${TITLE_ATTR}="1"]`
                                    )
                                ) || '-',

                            closeButtons:
                                card.querySelectorAll(
                                    `[${CLOSE_ATTR}="1"]`
                                ).length,

                            primary:
                                card.querySelectorAll(
                                    `[${BUTTON_ATTR}="primary"]`
                                ).length,

                            secondary:
                                card.querySelectorAll(
                                    `[${BUTTON_ATTR}="secondary"]`
                                ).length,

                            danger:
                                card.querySelectorAll(
                                    `[${BUTTON_ATTR}="danger"]`
                                ).length,

                            domRoot:
                                rootNode === document
                                    ? 'document'
                                    : 'shadow'
                        });
                    });
            }
        );


        console.table(
            rows
        );


        return rows;
    }


    function destroy() {
        destroyed = true;


        observed.forEach(
            (mo, rootNode) => {

                try {
                    mo.disconnect();
                } catch (_) {}


                try {
                    rootNode
                        .querySelectorAll?.(
                            [
                                `[${TITLE_ATTR}]`,
                                `[${CLOSE_ATTR}]`,
                                `[${BUTTON_ATTR}]`
                            ].join(',')
                        )
                        .forEach(el => {

                            el.removeAttribute(
                                TITLE_ATTR
                            );

                            el.removeAttribute(
                                CLOSE_ATTR
                            );

                            el.removeAttribute(
                                BUTTON_ATTR
                            );
                        });


                    rootNode
                        .querySelectorAll?.(
                            '[data-pmd-modal-chrome-authority-style]'
                        )
                        .forEach(
                            el => el.remove()
                        );

                } catch (_) {}
            }
        );


        document
            .getElementById(
                STYLE_ID
            )
            ?.remove();


        observed.clear();


        delete window[API];
    }


    window[API] = {
        version:
            '1.0.0',

        run:
            schedule,

        report:
            report,

        destroy:
            destroy,

        tokens:
            TOKENS
    };


    observe(
        document
    );


    discoverShadow(
        document
    );


    schedule();


    console.log(
        '✅ PMD MODAL CHROME AUTHORITY V1 ACTIVE'
    );
})();

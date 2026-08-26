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
      plane.animate(
        [
          { opacity: 0, backdropFilter: 'blur(0px)', WebkitBackdropFilter: 'blur(0px)' },
          { opacity: 1, backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }
        ],
        { duration: DURATION, easing: 'ease-out' }
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

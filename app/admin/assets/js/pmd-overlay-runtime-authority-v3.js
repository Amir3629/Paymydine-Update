/* ============================================================
   PMD_OVERLAY_RUNTIME_AUTHORITY_V3

   One runtime visual owner for dynamic full-screen cards/modals/drawers.
   Why this exists:
   - page CSS can load after the global manifest;
   - some components write inline !important backgrounds;
   - some dialogs are created asynchronously;
   - Waiter POS uses open Shadow DOM roots;
   - several components use pseudo-element backdrop painters.

   V3 is event/mutation driven, NOT polling. It observes only DOM additions and
   visibility/style attributes, batches work to requestAnimationFrame, and
   normalizes only overlay-like surfaces. Business behavior is untouched.
   ============================================================ */
(function () {
  'use strict';

  if (window.PMDOverlayRuntimeAuthorityV3) return;

  var BG = 'rgba(255, 255, 255, 0.04)';
  var BLUR = 'blur(8px)';
  var DURATION = 180;
  var EASE = 'cubic-bezier(.2,.8,.2,1)';
  var ROOT_STYLE_ID = 'pmd-overlay-runtime-authority-v3-style';

  var CANDIDATE_SELECTOR = [
    '.modal',
    '.modal-backdrop',
    '.offcanvas',
    '.offcanvas-backdrop',
    '.swal2-container',
    '[role="dialog"]',
    '[aria-modal="true"]',
    '[class*="backdrop"]',
    '[class*="modal"]',
    '[class*="overlay"]',
    '[class*="dialog"]',
    '[class*="drawer"]',
    '[class*="sheet"]',
    '[class*="composer"]',
    '[class*="card"]',
    '[class*="panel"]',
    '[class*="popup"]',
    '#pmd-cashier-order-composer-v1',
    '.pmd-floor-registry-manager',
    '.pmd-floor-table-manager'
  ].join(',');

  var BACKDROP_SELECTOR = [
    '.modal-backdrop',
    '.offcanvas-backdrop',
    '[class*="backdrop"]',
    '.swal2-container.swal2-backdrop-show'
  ].join(',');

  var CARD_SELECTOR = [
    '.modal-dialog',
    '.swal2-popup',
    '[role="dialog"] .modal-content',
    '[class*="dialog"]',
    '[class*="modal-card"]',
    '[class*="modal__card"]',
    '[class*="modal__dialog"]',
    '[class*="manager__card"]',
    '[class*="composer__dialog"]',
    '[class*="composer__card"]',
    '[class*="detail-card"]',
    '[class*="payment-dialog"]',
    '[class*="order-center__dialog"]',
    '[class*="overlay__panel"]',
    '[class*="drawer__panel"]',
    '[class*="sheet__panel"]',
    '[class*="sheet__card"]'
  ].join(',');

  var states = new WeakMap();
  var overlayOpen = new WeakMap();
  var syntheticByCard = new WeakMap();
  var reduceMotion = false;

  try {
    reduceMotion = !!window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch (e) {}

  function cssText() {
    return [
      '/* PMD_OVERLAY_RUNTIME_AUTHORITY_V3 */',
      '[data-pmd-overlay-v3-painter]{animation:none!important;background:' + BG + '!important;background-color:' + BG + '!important;backdrop-filter:' + BLUR + '!important;-webkit-backdrop-filter:' + BLUR + '!important;filter:none!important;-webkit-filter:none!important}',
      '[data-pmd-overlay-v3-container-clear]{background:transparent!important;background-color:transparent!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important}',
      '[data-pmd-overlay-v3-card]{animation:none!important;filter:none!important;-webkit-filter:none!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important}',
      '[data-pmd-overlay-v3-pseudo-before]::before,[data-pmd-overlay-v3-pseudo-after]::after{background:' + BG + '!important;background-color:' + BG + '!important;backdrop-filter:' + BLUR + '!important;-webkit-backdrop-filter:' + BLUR + '!important;filter:none!important;-webkit-filter:none!important;animation:none!important}',
      '.pmd-overlay-runtime-v3-synthetic{position:fixed!important;inset:0!important;width:100vw!important;height:100vh!important;margin:0!important;padding:0!important;border:0!important;background:' + BG + '!important;background-color:' + BG + '!important;backdrop-filter:' + BLUR + '!important;-webkit-backdrop-filter:' + BLUR + '!important;pointer-events:none!important}',
      '@media(prefers-reduced-motion:reduce){[data-pmd-overlay-v3-painter],[data-pmd-overlay-v3-card],[data-pmd-overlay-v3-pseudo-before]::before,[data-pmd-overlay-v3-pseudo-after]::after,.pmd-overlay-runtime-v3-synthetic{animation:none!important;transition:none!important}}'
    ].join('\n');
  }

  function rootDocument(root) {
    if (root && root.nodeType === 9) return root;
    return (root && root.ownerDocument) || document;
  }

  function rootWindow(root) {
    var doc = rootDocument(root);
    return doc.defaultView || window;
  }

  function ensureStyle(root) {
    try {
      var existing = root.querySelector ? root.querySelector('#' + ROOT_STYLE_ID) : null;
      if (existing) return;
      var doc = rootDocument(root);
      var style = doc.createElement('style');
      style.id = ROOT_STYLE_ID;
      style.textContent = cssText();
      if (root.nodeType === 9) {
        (root.head || root.documentElement).appendChild(style);
      } else {
        root.appendChild(style);
      }
    } catch (e) {}
  }

  function semantic(el) {
    if (!el || el.nodeType !== 1) return '';
    return [
      el.id || '',
      typeof el.className === 'string' ? el.className : '',
      el.getAttribute('role') || '',
      el.getAttribute('data-pmd-pos-viewport-host') || ''
    ].join(' ').toLowerCase();
  }

  function alphaFromColor(value) {
    if (!value || value === 'transparent') return 0;
    var m = value.match(/rgba?\(([^)]+)\)/i);
    if (!m) return 1;
    var parts = m[1].split(',').map(function (x) { return x.trim(); });
    if (parts.length < 4) return 1;
    var a = parseFloat(parts[3]);
    return Number.isFinite(a) ? a : 1;
  }

  function rectOf(el) {
    try { return el.getBoundingClientRect(); }
    catch (e) { return {left:0,top:0,width:0,height:0,right:0,bottom:0}; }
  }

  function isRendered(el) {
    if (!el || el.nodeType !== 1 || !el.isConnected) return false;
    var s;
    try { s = getComputedStyle(el); } catch (e) { return false; }
    if (s.display === 'none' || s.visibility === 'hidden') return false;
    var r = rectOf(el);
    return r.width > 2 && r.height > 2;
  }

  function isFullscreen(el) {
    if (!isRendered(el)) return false;
    var r = rectOf(el);
    var w = rootWindow(el.getRootNode()).innerWidth || document.documentElement.clientWidth || 1;
    var h = rootWindow(el.getRootNode()).innerHeight || document.documentElement.clientHeight || 1;
    if (r.width < w * 0.70 || r.height < h * 0.70) return false;
    return r.left <= w * 0.22 && r.top <= h * 0.22 && r.right >= w * 0.78 && r.bottom >= h * 0.78;
  }

  function excluded(el) {
    var s = semantic(el);
    if (/tour|tooltip|popover|dropdown|daterange|datepicker|timepicker|clockpicker/.test(s)) return true;
    if (el && el.getAttribute && el.getAttribute('data-pmd-pos-viewport-host') === 'overlay') return true;
    return false;
  }

  function isBackdropSemantic(el) {
    var s = semantic(el);
    return /backdrop/.test(s) || /swal2-container/.test(s);
  }

  function ownPainter(el) {
    if (!isRendered(el)) return false;
    var s;
    try { s = getComputedStyle(el); } catch (e) { return false; }
    var blur = (s.backdropFilter && s.backdropFilter !== 'none') ||
      (s.webkitBackdropFilter && s.webkitBackdropFilter !== 'none');
    return blur || alphaFromColor(s.backgroundColor) > 0.01 || s.backgroundImage !== 'none';
  }

  function setImportant(el, name, value) {
    try {
      if (el.style.getPropertyValue(name) === value && el.style.getPropertyPriority(name) === 'important') return;
      el.style.setProperty(name, value, 'important');
    } catch (e) {}
  }

  function animateBackdrop(el) {
    if (reduceMotion || !el || typeof el.animate !== 'function') return;
    try {
      if (el.__pmdOverlayV3BackdropAnimation) el.__pmdOverlayV3BackdropAnimation.cancel();
      el.__pmdOverlayV3BackdropAnimation = el.animate([
        {opacity: 0, backdropFilter: 'blur(0px)', WebkitBackdropFilter: 'blur(0px)', backgroundColor: 'rgba(255,255,255,0)'},
        {opacity: 1, backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', backgroundColor: BG}
      ], {duration: DURATION, easing: 'ease-out'});
    } catch (e) {}
  }

  function animateCard(card) {
    if (reduceMotion || !card || typeof card.animate !== 'function') return;
    try {
      if (card.__pmdOverlayV3CardAnimation) card.__pmdOverlayV3CardAnimation.cancel();
      card.__pmdOverlayV3CardAnimation = card.animate([
        {opacity: 0, translate: '0 6px', scale: '.985'},
        {opacity: 1, translate: '0 0', scale: '1'}
      ], {duration: DURATION, easing: EASE});
    } catch (e) {
      try {
        card.animate([{opacity:0},{opacity:1}], {duration:DURATION, easing:'ease-out'});
      } catch (_) {}
    }
  }

  function normalizePainter(el, animate) {
    if (!el || !isRendered(el)) return;
    el.setAttribute('data-pmd-overlay-v3-painter', '1');
    setImportant(el, 'background', BG);
    setImportant(el, 'background-color', BG);
    setImportant(el, 'backdrop-filter', BLUR);
    setImportant(el, '-webkit-backdrop-filter', BLUR);
    setImportant(el, 'filter', 'none');
    setImportant(el, '-webkit-filter', 'none');
    if (animate) animateBackdrop(el);
  }

  function pseudoPainter(el, pseudo) {
    try {
      var s = getComputedStyle(el, pseudo);
      var blur = (s.backdropFilter && s.backdropFilter !== 'none') ||
        (s.webkitBackdropFilter && s.webkitBackdropFilter !== 'none');
      var painted = alphaFromColor(s.backgroundColor) > 0.01 || s.backgroundImage !== 'none';
      var content = s.content && s.content !== 'none' && s.content !== 'normal';
      return (blur || painted) && content;
    } catch (e) { return false; }
  }

  function markPseudoPainters(overlay) {
    if (!overlay || !isFullscreen(overlay)) return;
    if (pseudoPainter(overlay, '::before')) overlay.setAttribute('data-pmd-overlay-v3-pseudo-before', '1');
    if (pseudoPainter(overlay, '::after')) overlay.setAttribute('data-pmd-overlay-v3-pseudo-after', '1');
  }

  function childBackdrop(overlay) {
    if (!overlay || !overlay.querySelectorAll) return null;
    var list;
    try { list = overlay.querySelectorAll(BACKDROP_SELECTOR); }
    catch (e) { return null; }
    for (var i = 0; i < list.length; i++) {
      if (!excluded(list[i]) && isFullscreen(list[i])) return list[i];
    }
    return null;
  }

  function siblingBackdrop(overlay) {
    if (!overlay) return null;
    var root = overlay.getRootNode();
    if (!root || !root.querySelectorAll) return null;
    var list;
    try { list = Array.prototype.slice.call(root.querySelectorAll(BACKDROP_SELECTOR)); }
    catch (e) { return null; }
    var overlayZ = 0;
    try { overlayZ = parseInt(getComputedStyle(overlay).zIndex, 10) || 0; } catch (e) {}
    var best = null;
    var bestZ = -2147483648;
    list.forEach(function (node) {
      if (node === overlay || excluded(node) || !isFullscreen(node)) return;
      var z = 0;
      try { z = parseInt(getComputedStyle(node).zIndex, 10) || 0; } catch (e) {}
      if (overlayZ && z > overlayZ) return;
      if (!best || z >= bestZ) { best = node; bestZ = z; }
    });
    return best;
  }

  function cardScore(el, overlay) {
    if (!el || el === overlay || !isRendered(el) || isFullscreen(el) || isBackdropSemantic(el)) return -1;
    var r = rectOf(el);
    var w = rootWindow(el.getRootNode()).innerWidth || 1;
    var h = rootWindow(el.getRootNode()).innerHeight || 1;
    var areaRatio = (r.width * r.height) / (w * h);
    if (r.width < 180 || r.height < 70 || areaRatio < 0.015 || areaRatio > 0.88) return -1;
    var sem = semantic(el);
    var score = Math.min(60, areaRatio * 100);
    if (/modal-dialog|swal2-popup|__dialog|detail-card|payment-dialog|manager__card|modal-card|modal__card|overlay__panel|drawer__panel|sheet__panel|sheet__card/.test(sem)) score += 120;
    else if (/dialog|modal|card|panel|sheet|drawer/.test(sem)) score += 45;
    try {
      var s = getComputedStyle(el);
      if (alphaFromColor(s.backgroundColor) > 0.5) score += 15;
    } catch (e) {}
    return score;
  }

  function findCard(overlay) {
    if (!overlay || !overlay.querySelectorAll) return null;
    var candidates = [];
    try { candidates = Array.prototype.slice.call(overlay.querySelectorAll(CARD_SELECTOR)); }
    catch (e) {}

    var best = null;
    var bestScore = -1;
    candidates.forEach(function (el) {
      var score = cardScore(el, overlay);
      if (score > bestScore) {
        best = el;
        bestScore = score;
      }
    });

    if (best) return best;

    // Fallback: inspect only direct children and one level below, not the whole page.
    var shallow = [];
    try {
      shallow = Array.prototype.slice.call(overlay.children || []);
      shallow.slice().forEach(function (c) {
        shallow = shallow.concat(Array.prototype.slice.call(c.children || []));
      });
    } catch (e) {}
    shallow.forEach(function (el) {
      var score = cardScore(el, overlay);
      if (score > bestScore) {
        best = el;
        bestScore = score;
      }
    });
    return best;
  }

  function clearContainerPainter(overlay) {
    if (!overlay) return;
    overlay.setAttribute('data-pmd-overlay-v3-container-clear', '1');
    setImportant(overlay, 'background', 'transparent');
    setImportant(overlay, 'background-color', 'transparent');
    setImportant(overlay, 'backdrop-filter', 'none');
    setImportant(overlay, '-webkit-backdrop-filter', 'none');
  }

  function normalizeOverlay(overlay) {
    if (!overlay || excluded(overlay) || !isFullscreen(overlay)) return false;

    var wasOpen = overlayOpen.get(overlay) === true;
    overlayOpen.set(overlay, true);

    var backdrop = isBackdropSemantic(overlay)
      ? overlay
      : (childBackdrop(overlay) || siblingBackdrop(overlay));

    if (backdrop) {
      if (backdrop !== overlay) clearContainerPainter(overlay);
      normalizePainter(backdrop, !wasOpen);
    } else {
      markPseudoPainters(overlay);
      var hasPseudo = overlay.hasAttribute('data-pmd-overlay-v3-pseudo-before') ||
        overlay.hasAttribute('data-pmd-overlay-v3-pseudo-after');
      // If a full-screen overlay has no child/sibling/pseudo painter, the
      // overlay itself becomes the canonical painter. This covers cards that
      // previously opened with no backdrop at all.
      if (!hasPseudo) normalizePainter(overlay, !wasOpen);
    }

    var card = findCard(overlay);
    if (card) {
      card.setAttribute('data-pmd-overlay-v3-card', '1');
      if (!wasOpen) animateCard(card);
    }

    return true;
  }

  function removeSynthetic(card) {
    var b = syntheticByCard.get(card);
    if (b && b.parentNode) b.parentNode.removeChild(b);
    syntheticByCard.delete(card);
  }

  function maybeStandaloneCard(card) {
    if (!card || excluded(card) || !isRendered(card) || isFullscreen(card)) {
      if (card) removeSynthetic(card);
      return;
    }

    var sem = semantic(card);
    var s;
    try { s = getComputedStyle(card); } catch (e) { return; }
    var z = parseInt(s.zIndex, 10) || 0;
    var fixed = s.position === 'fixed';
    var modalHint = card.getAttribute('aria-modal') === 'true' || card.getAttribute('role') === 'dialog' ||
      /modal|dialog|sheet|drawer|overlay|composer|detail|payment|card|panel|popup/.test(sem);
    if (!fixed || z < 900 || !modalHint) {
      removeSynthetic(card);
      return;
    }

    var ancestor = card.parentElement;
    while (ancestor) {
      if (ancestor !== card && isFullscreen(ancestor) && !excluded(ancestor)) {
        removeSynthetic(card);
        return;
      }
      ancestor = ancestor.parentElement;
    }

    if (!syntheticByCard.get(card)) {
      var root = card.getRootNode();
      var doc = rootDocument(root);
      var b = doc.createElement('div');
      b.className = 'pmd-overlay-runtime-v3-synthetic';
      b.setAttribute('aria-hidden', 'true');
      b.style.setProperty('z-index', String(Math.max(1, z - 1)), 'important');
      if (root.nodeType === 9) (doc.body || doc.documentElement).appendChild(b);
      else root.appendChild(b);
      syntheticByCard.set(card, b);
      animateBackdrop(b);
    }

    card.setAttribute('data-pmd-overlay-v3-card', '1');
    if (!overlayOpen.get(card)) {
      overlayOpen.set(card, true);
      animateCard(card);
    }
  }

  function processElement(el) {
    if (!el || el.nodeType !== 1) return;

    if (el.shadowRoot) installRoot(el.shadowRoot);
    try {
      el.querySelectorAll('*').forEach(function (n) {
        if (n.shadowRoot) installRoot(n.shadowRoot);
      });
    } catch (e) {}

    var list = [];
    if (el.matches && el.matches(CANDIDATE_SELECTOR)) list.push(el);
    try {
      list = list.concat(Array.prototype.slice.call(el.querySelectorAll(CANDIDATE_SELECTOR)));
    } catch (e) {}

    list.forEach(function (node) {
      if (!isRendered(node)) {
        overlayOpen.set(node, false);
        removeSynthetic(node);
        return;
      }
      if (!normalizeOverlay(node)) maybeStandaloneCard(node);
    });
  }

  function installRoot(root) {
    if (!root || states.has(root)) return;
    ensureStyle(root);

    var state = {root: root, queue: new Set(), raf: 0, observer: null};
    states.set(root, state);

    function schedule(node) {
      if (!node) return;
      state.queue.add(node.nodeType === 1 ? node : (node.parentElement || null));
      if (state.raf) return;
      state.raf = rootWindow(root).requestAnimationFrame(function () {
        state.raf = 0;
        ensureStyle(root);
        var work = Array.from(state.queue);
        state.queue.clear();
        work.forEach(processElement);
      });
    }

    try {
      state.observer = new MutationObserver(function (mutations) {
        mutations.forEach(function (m) {
          if (m.type === 'attributes') schedule(m.target);
          Array.prototype.slice.call(m.addedNodes || []).forEach(function (n) { schedule(n); });
          Array.prototype.slice.call(m.removedNodes || []).forEach(function (n) {
            if (n && n.nodeType === 1) {
              overlayOpen.set(n, false);
              removeSynthetic(n);
            }
          });
        });
      });
      state.observer.observe(root.nodeType === 9 ? root.documentElement : root, {
        subtree: true,
        childList: true,
        attributes: true,
        attributeFilter: ['class', 'style', 'hidden', 'open', 'aria-hidden', 'aria-modal']
      });
    } catch (e) {}

    schedule(root.nodeType === 9 ? root.documentElement : root.host || null);
  }

  function normalizeNow() {
    states.forEach && states.forEach(function () {}); // WeakMap is intentionally non-enumerable.
    processElement(document.documentElement);
  }

  installRoot(document);

  // Existing open Shadow DOM roots.
  try {
    document.querySelectorAll('*').forEach(function (el) {
      if (el.shadowRoot) installRoot(el.shadowRoot);
    });
  } catch (e) {}

  // Opening events are fast paths; MutationObserver remains the authoritative catch-all.
  ['show.bs.modal', 'shown.bs.modal', 'animationstart', 'transitionrun'].forEach(function (name) {
    document.addEventListener(name, function (e) {
      var target = e && e.target && e.target.nodeType === 1 ? e.target : document.documentElement;
      processElement(target);
    }, true);
  });

  window.PMDOverlayRuntimeAuthorityV3 = {
    version: '3.0.0',
    normalize: function () { processElement(document.documentElement); },
    installRoot: installRoot,
    contract: {
      background: BG,
      blur: BLUR,
      durationMs: DURATION,
      polling: false,
      mutationObserver: 'batched added/visibility nodes only',
      shadowDom: true,
      syntheticBackdropForStandaloneFixedDialogs: true
    }
  };

  try {
    document.documentElement.setAttribute('data-pmd-overlay-runtime-v3', '1');
    console.info('[PMD Overlay Runtime Authority V3] Ready', window.PMDOverlayRuntimeAuthorityV3.contract);
  } catch (e) {}
})();

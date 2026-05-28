(function () {
  'use strict';

  function ready(fn) {
    document.readyState === 'loading'
      ? document.addEventListener('DOMContentLoaded', fn, { once: true })
      : fn();
  }

  ready(function () {
    if (!document.body || !document.body.classList.contains('pmd-admin-theme-v1')) return;

    const mainMenu = document.querySelector('#menu-mainmenu');
    if (!mainMenu) return;

    let isRendering = false;
    let counter = 0;

    function important(el, prop, value) {
      if (el) el.style.setProperty(prop, value, 'important');
    }

    function isDashboardPage() {
      return /\/admin\/dashboard\/?$/.test(window.location.pathname);
    }

    function textOf(el) {
      return (
        el.getAttribute('aria-label') ||
        el.getAttribute('title') ||
        el.getAttribute('data-bs-original-title') ||
        el.textContent ||
        el.value ||
        ''
      ).replace(/\s+/g, ' ').trim();
    }

    function findTitle() {
      return [...document.querySelectorAll('.navbar-top h1, .navbar-top h2, .navbar-top .page-title, .navbar-top .navbar-title')]
        .find(el => textOf(el) && !el.closest('#menu-mainmenu'));
    }

    function lockButtonBox(btn) {
      important(btn, 'position', 'relative');
      important(btn, 'box-sizing', 'border-box');
      important(btn, 'width', '42px');
      important(btn, 'min-width', '42px');
      important(btn, 'max-width', '42px');
      important(btn, 'height', '42px');
      important(btn, 'min-height', '42px');
      important(btn, 'max-height', '42px');
      important(btn, 'padding', '0');
      important(btn, 'margin', '0');
      important(btn, 'border', '1px solid #E8E2D8');
      important(btn, 'border-radius', '14px');
      important(btn, 'background', '#FFFFFF');
      important(btn, 'background-color', '#FFFFFF');
      important(btn, 'color', '#062F2A');
      important(btn, 'display', 'inline-block');
      important(btn, 'text-align', 'center');
      important(btn, 'font-size', '0');
      important(btn, 'line-height', '0');
      important(btn, 'overflow', 'hidden');
      important(btn, 'vertical-align', 'middle');
      important(btn, 'box-shadow', '0 8px 24px rgba(6,47,42,.06)');
      important(btn, 'pointer-events', 'auto');
      important(btn, 'cursor', 'pointer');
    }

    function lockIconCenter(btn) {
      const holder = btn.querySelector('.pmd-header-action-icon');
      const icon = btn.querySelector('.pmd-header-action-icon > i, i');

      if (holder) {
        important(holder, 'position', 'absolute');
        important(holder, 'top', '0');
        important(holder, 'left', '0');
        important(holder, 'right', '0');
        important(holder, 'bottom', '0');
        important(holder, 'width', '42px');
        important(holder, 'height', '42px');
        important(holder, 'display', 'block');
        important(holder, 'margin', '0');
        important(holder, 'padding', '0');
        important(holder, 'pointer-events', 'none');
        important(holder, 'line-height', '0');
      }

      if (icon) {
        important(icon, 'position', 'absolute');
        important(icon, 'top', 'calc(50% - 1px)');
        important(icon, 'left', '50%');
        important(icon, 'right', 'auto');
        important(icon, 'bottom', 'auto');
        important(icon, 'transform', 'translate(-50%, -50%)');
        important(icon, 'display', 'block');
        important(icon, 'width', '18px');
        important(icon, 'height', '18px');
        important(icon, 'margin', '0');
        important(icon, 'padding', '0');
        important(icon, 'font-size', '18px');
        important(icon, 'line-height', '18px');
        important(icon, 'text-align', 'center');
        important(icon, 'color', 'currentColor');
        important(icon, 'pointer-events', 'none');
      }

      btn.querySelectorAll('.pmd-header-action-label').forEach(label => {
        important(label, 'display', 'none');
      });
    }

    function bindPaletteHover(btn) {
      if (!btn || btn.dataset.pmdHeaderPaletteBound === '1') return;

      btn.dataset.pmdHeaderPaletteBound = '1';
      btn.addEventListener('mouseenter', function () {
        important(btn, 'border', '1px solid #C89B4A');
        important(btn, 'background', '#F5E8D0');
        important(btn, 'background-color', '#F5E8D0');
      });
      btn.addEventListener('mouseleave', function () {
        important(btn, 'border', '1px solid #E8E2D8');
        important(btn, 'background', '#FFFFFF');
        important(btn, 'background-color', '#FFFFFF');
      });
    }

    function normalizeVisual(btn) {
      lockButtonBox(btn);
      lockIconCenter(btn);
      bindPaletteHover(btn);
    }

    function ensureBack() {
      const existing = document.querySelector('.pmd-header-title-back');

      if (isDashboardPage()) {
        existing?.remove();
        return;
      }

      let back = existing;

      if (!back) {
        const title = findTitle();
        if (!title) return;

        const wrap = document.createElement('div');
        wrap.className = 'pmd-header-title-wrap';

        back = document.createElement('button');
        back.type = 'button';
        back.className = 'pmd-header-title-back';
        back.setAttribute('aria-label', 'Back');
        back.innerHTML = '<span class="pmd-header-action-icon"><i class="fa fa-arrow-left" aria-hidden="true"></i></span>';

        back.addEventListener('click', function (e) {
          e.preventDefault();
          e.stopPropagation();
          window.history.length > 1 ? window.history.back() : (window.location.href = '/admin');
        }, true);

        title.parentNode.insertBefore(wrap, title);
        wrap.appendChild(back);
        wrap.appendChild(title);
      }

      normalizeVisual(back);
    }

    function ensureBar() {
      let item = document.querySelector('#pmd-header-toolbar-actions-item');

      if (!item) {
        item = document.createElement('li');
        item.id = 'pmd-header-toolbar-actions-item';
        item.className = 'nav-item pmd-header-toolbar-actions-item';
        item.innerHTML = '<div class="pmd-header-toolbar-actions" aria-label="Page actions"></div>';
        mainMenu.insertBefore(item, mainMenu.firstChild);
      }

      return item.querySelector('.pmd-header-toolbar-actions');
    }

    function iconClass(el, label) {
      const t = (label || '').toLowerCase();

      if (t.includes('save')) return 'fa fa-save';
      if (t.includes('add') || t.includes('new') || t.includes('create')) return 'fa fa-plus';
      if (t.includes('edit') || t.includes('layout')) return 'fa fa-edit';
      if (t.includes('delete') || t.includes('remove') || t.includes('cancel')) return 'fa fa-trash';
      if (t.includes('calendar') || t.includes('date')) return 'fa fa-calendar';
      if (t.includes('open')) return 'fa fa-external-link-alt';
      if (t.includes('refresh') || t.includes('reload')) return 'fa fa-rotate-right';
      if (t.includes('folder')) return 'fa fa-folder';
      if (t.includes('select')) return 'fa fa-check-circle';
      if (t.includes('filter')) return 'fa fa-filter';
      if (t.includes('search')) return 'fa fa-search';
      if (t.includes('print')) return 'fa fa-print';

      const icon = el.querySelector('i.fa, i.fas, i.far, i.fab');
      return icon ? icon.className : 'fa fa-circle';
    }

    function isBackLike(el) {
      const t = textOf(el).toLowerCase();
      return !!el.querySelector('i.fa-arrow-left, i.fa-arrow-circle-left') || t.includes('back') || t.includes('return');
    }

    function isValidOriginal(el) {
      if (!el) return false;
      if (el.closest('.navbar-top, .modal, .dropdown-menu, .pmd-header-toolbar-actions')) return false;
      if (el.disabled || el.classList.contains('disabled')) return false;
      if (isBackLike(el)) return false;

      const label = textOf(el);
      const icon = el.querySelector('i.fa, i.fas, i.far, i.fab');

      if (!label && !icon) return false;
      if (label.length > 90) return false;

      if (el.closest('.edit-mode-only') && !document.body.classList.contains('edit-mode-active')) return false;

      return true;
    }

    function findOriginalActions() {
      const roots = document.querySelectorAll([
        '.toolbar-action',
        '.progress-indicator-container',
        '.pmd-admin-top-actions',
        '.form-buttons',
        '.control-toolbar',
        '.page-actions',
        '.page-header',
        '.content-header',
        '.card-header',
        '.form-actions',
        '.btn-toolbar'
      ].join(','));

      const found = [];

      roots.forEach(root => {
        if (root.closest('.navbar-top, .modal, .dropdown-menu')) return;

        root.querySelectorAll('a.btn, button.btn, input[type="submit"].btn, input[type="button"].btn').forEach(btn => {
          if (isValidOriginal(btn) && !found.includes(btn)) found.push(btn);
        });
      });

      return found.slice(0, 10);
    }

    function ensureId(el) {
      if (!el.dataset.pmdOriginalActionId) {
        counter += 1;
        el.dataset.pmdOriginalActionId = 'pmd-original-' + Date.now() + '-' + counter;
      }
      return el.dataset.pmdOriginalActionId;
    }

    function findOriginalById(id) {
      if (!id) return null;
      return document.querySelector('[data-pmd-original-action-id="' + id.replace(/"/g, '\\"') + '"]');
    }

    function activateOriginal(original) {
      if (!original) {
        console.warn('[PMDHeaderActions] Original action not found');
        return;
      }

      const tag = original.tagName.toLowerCase();
      const href = original.getAttribute('href');
      const target = original.getAttribute('target');

      if (window.PMDHeaderActionsDebug) {
        console.log('[PMDHeaderActions] activating original', {
          label: textOf(original),
          tag,
          href,
          dataRequest: original.getAttribute('data-request'),
          dataBsToggle: original.getAttribute('data-bs-toggle'),
          onclick: !!original.getAttribute('onclick'),
          id: original.id,
          className: original.className
        }, original);
      }

      try {
        if (
          tag === 'a' &&
          href &&
          href !== '#' &&
          href !== 'javascript:void(0)' &&
          !original.hasAttribute('data-request') &&
          !original.hasAttribute('data-bs-toggle')
        ) {
          if (target === '_blank') window.open(href, '_blank');
          else window.location.href = href;
          return;
        }

        if ((tag === 'button' || tag === 'input') && (original.type || '').toLowerCase() === 'submit') {
          const form = original.form || original.closest('form');
          if (form && typeof form.requestSubmit === 'function') {
            form.requestSubmit(original);
            return;
          }
        }

        if (typeof original.click === 'function') {
          original.click();
          return;
        }

        original.dispatchEvent(new MouseEvent('click', {
          bubbles: true,
          cancelable: true,
          view: window
        }));
      } catch (err) {
        console.error('[PMDHeaderActions] activation failed', err, original);
      }
    }

    function makeProxy(original) {
      const id = ensureId(original);
      const label = textOf(original) || 'Action';
      const icon = iconClass(original, label);

      const proxy = document.createElement('button');
      proxy.type = 'button';
      proxy.className = 'pmd-header-action-btn pmd-header-action-enter';
      proxy.dataset.pmdProxyFor = id;
      proxy.setAttribute('aria-label', label);
      proxy.setAttribute('data-no-tooltip', '1');

      if (label.toLowerCase().includes('delete') || label.toLowerCase().includes('remove') || label.toLowerCase().includes('cancel')) {
        proxy.classList.add('is-danger');
        important(proxy, 'color', '#B42318');
      }

      proxy.innerHTML =
        '<span class="pmd-header-action-icon" aria-hidden="true">' +
          '<i class="' + icon + '"></i>' +
        '</span>' +
        '<span class="pmd-header-action-label">' + label + '</span>';

      normalizeVisual(proxy);
      return proxy;
    }

    function headerFlipKey(el, index) {
      if (!el) return null;
      if (el.dataset && el.dataset.pmdProxyFor) return 'proxy:' + el.dataset.pmdProxyFor;
      if (el.classList && el.classList.contains('pmd-header-title-back')) return 'title-back';
      if (el.id) return 'id:' + el.id;
      return 'node:' + index + ':' + el.tagName + ':' + el.className;
    }

    function captureHeaderRects() {
      const nodes = [
        ...document.querySelectorAll('#menu-mainmenu > li'),
        ...document.querySelectorAll('.pmd-header-action-btn, .pmd-header-title-back')
      ];

      const map = new Map();

      nodes.forEach((el, index) => {
        const key = headerFlipKey(el, index);
        if (!key) return;
        const r = el.getBoundingClientRect();
        map.set(key, {
          left: r.left,
          top: r.top,
          width: r.width,
          height: r.height
        });
      });

      return map;
    }

    function playHeaderFlip(beforeRects) {
      if (!beforeRects || !beforeRects.size) return;

      const nodes = [
        ...document.querySelectorAll('#menu-mainmenu > li'),
        ...document.querySelectorAll('.pmd-header-action-btn, .pmd-header-title-back')
      ];

      nodes.forEach((el, index) => {
        const key = headerFlipKey(el, index);
        const before = beforeRects.get(key);
        if (!before) return;

        const after = el.getBoundingClientRect();
        const dx = before.left - after.left;
        const dy = before.top - after.top;

        if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;

        el.classList.add('pmd-header-flip-moving');
        el.style.setProperty('transition', 'none', 'important');
        el.style.setProperty('transform', 'translate3d(' + dx + 'px,' + dy + 'px,0)', 'important');

        // force layout read
        el.getBoundingClientRect();

        requestAnimationFrame(() => {
          el.style.setProperty(
            'transition',
            'transform 280ms cubic-bezier(.2,0,0,1), opacity 240ms ease, background 180ms ease, box-shadow 180ms ease',
            'important'
          );
          el.style.setProperty('transform', 'translate3d(0,0,0)', 'important');

          setTimeout(() => {
            el.classList.remove('pmd-header-flip-moving');
            if (!el.classList.contains('pmd-header-action-pressed')) {
              el.style.removeProperty('transition');
              el.style.removeProperty('transform');
            }
          }, 310);
        });
      });
    }

    function renderHeaderActions(bar, originals) {
      const desiredIds = originals.map(ensureId);
      const desiredSet = new Set(desiredIds);

      const existing = new Map();
      bar.querySelectorAll('.pmd-header-action-btn[data-pmd-proxy-for]').forEach(proxy => {
        existing.set(proxy.dataset.pmdProxyFor, proxy);
      });

      // Smoothly remove actions that are no longer available.
      existing.forEach((proxy, id) => {
        if (!desiredSet.has(id) && !proxy.classList.contains('pmd-header-action-exiting')) {
          proxy.classList.remove('pmd-header-action-visible');
          proxy.classList.add('pmd-header-action-exiting');

          setTimeout(() => {
            if (proxy.parentNode && proxy.classList.contains('pmd-header-action-exiting')) {
              const beforeRemove = captureHeaderRects();
              proxy.remove();
              requestAnimationFrame(() => playHeaderFlip(beforeRemove));
            }
          }, 260);
        }
      });

      // Add/keep actions in correct order without destroying the whole bar.
      originals.forEach(original => {
        const id = ensureId(original);
        let proxy = existing.get(id);

        if (!proxy || proxy.classList.contains('pmd-header-action-exiting')) {
          proxy = makeProxy(original);
          proxy.classList.add('pmd-header-action-enter');
          bar.appendChild(proxy);

          requestAnimationFrame(() => {
            proxy.classList.remove('pmd-header-action-enter');
            proxy.classList.add('pmd-header-action-visible');
            normalizeVisual(proxy);
          });
        } else {
          proxy.classList.remove('pmd-header-action-exiting', 'pmd-header-action-enter');
          proxy.classList.add('pmd-header-action-visible');
          bar.appendChild(proxy);
          normalizeVisual(proxy);
        }
      });
    }

    function sync() {
      if (isRendering) return;
      isRendering = true;

      try {
        const beforeRects = captureHeaderRects();

        ensureBack();

        const bar = ensureBar();
        const originals = findOriginalActions();

        renderHeaderActions(bar, originals);

        bar.querySelectorAll('.pmd-header-action-btn').forEach(normalizeVisual);
        document.querySelectorAll('.pmd-header-title-back').forEach(normalizeVisual);

        document.body.classList.toggle('pmd-has-header-actions', originals.length > 0);

        requestAnimationFrame(() => playHeaderFlip(beforeRects));
      } finally {
        isRendering = false;
      }
    }

    if (!window.__PMD_HEADER_ACTION_DELEGATE_BOUND__) {
      window.__PMD_HEADER_ACTION_DELEGATE_BOUND__ = true;

      function activateFromProxyEvent(e) {
        const proxy = e.target && e.target.closest && e.target.closest('.pmd-header-action-btn[data-pmd-proxy-for]');
        if (!proxy) return;

        e.preventDefault();
        e.stopPropagation();
        if (typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation();

        const now = Date.now();
        const last = Number(proxy.dataset.pmdLastActivatedAt || 0);

        // Prevent double fire from pointerdown + click, but make first press instant.
        if (now - last < 650) return;
        proxy.dataset.pmdLastActivatedAt = String(now);

        proxy.classList.add('pmd-header-action-pressed');
        setTimeout(function () {
          proxy.classList.remove('pmd-header-action-pressed');
        }, 180);

        const original = findOriginalById(proxy.dataset.pmdProxyFor);
        activateOriginal(original);

        // After action changes the page state, refresh actions once.
        setTimeout(function () {
          if (window.PMDHeaderActions && typeof window.PMDHeaderActions.refresh === 'function') {
            window.PMDHeaderActions.refresh();
          }
        }, 220);
      }

      // Main fix: run before normal click can be lost by DOM refresh.
      document.addEventListener('pointerdown', activateFromProxyEvent, true);
      document.addEventListener('mousedown', activateFromProxyEvent, true);
      document.addEventListener('touchstart', activateFromProxyEvent, true);

      // Keyboard accessibility.
      document.addEventListener('keydown', function (e) {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        activateFromProxyEvent(e);
      }, true);

      // Keep click blocked so it does not double-trigger or bubble to legacy handlers.
      document.addEventListener('click', function (e) {
        const proxy = e.target && e.target.closest && e.target.closest('.pmd-header-action-btn[data-pmd-proxy-for]');
        if (!proxy) return;
        e.preventDefault();
        e.stopPropagation();
        if (typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation();
      }, true);
    }

    sync();

    let scheduled = false;
    new MutationObserver(() => {
      if (isRendering || scheduled) return;

      // Do not rebuild the proxy bar during an active press/click window.
      if (document.querySelector('.pmd-header-action-pressed')) return;

      scheduled = true;

      setTimeout(() => {
        scheduled = false;
        if (!document.querySelector('.pmd-header-action-pressed')) sync();
      }, 220);
    }).observe(document.body, {
      childList: true,
      subtree: true
    });

    setTimeout(sync, 250);
    setTimeout(sync, 900);

    window.PMDHeaderActions = {
      refresh: sync,
      originals: findOriginalActions,
      recenter: function () {
        document.querySelectorAll('.pmd-header-action-btn, .pmd-header-title-back').forEach(normalizeVisual);
      },
      activateProxy: function (index) {
        const proxy = document.querySelectorAll('.pmd-header-action-btn[data-pmd-proxy-for]')[index || 0];
        if (!proxy) return false;
        activateOriginal(findOriginalById(proxy.dataset.pmdProxyFor));
        return true;
      }
    };
  });
})();

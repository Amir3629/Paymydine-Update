(function () {
  'use strict';

  if (!/^\/admin(\/|$)/.test(location.pathname)) return;
  if (window.__PMD_HEADER_BULK_DELETE_V131__) return;
  window.__PMD_HEADER_BULK_DELETE_V131__ = true;

  const VERSION = 'v131';

  const CHECKBOX_SELECTOR = [
    'input[type="checkbox"][name="checked[]"]',
    'td.list-action input[type="checkbox"]',
    '.list-action input.form-check-input[type="checkbox"]'
  ].join(',');

  let lastCount = -1;
  let observer = null;
  let timer = null;

  function ready(fn) {
    if (document.body) return fn();
    document.addEventListener('DOMContentLoaded', fn, { once: true });
  }

  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (m) {
      return {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
      }[m];
    });
  }

  function addStyle() {
    if (document.getElementById('pmd-header-bulk-delete-v131-css')) return;

    const st = document.createElement('style');
    st.id = 'pmd-header-bulk-delete-v131-css';
    st.textContent = `
      #pmd-header-bulk-delete-slot {
        display: none;
        align-items: center;
        justify-content: center;
        position: relative;
      }

      #pmd-header-bulk-delete-btn {
        position: relative !important;
        box-sizing: border-box !important;
        width: 42px !important;
        min-width: 42px !important;
        max-width: 42px !important;
        height: 42px !important;
        min-height: 42px !important;
        max-height: 42px !important;
        padding: 0 !important;
        margin: 0 !important;
        border: 1px solid #f0d2d2 !important;
        border-radius: 14px !important;
        background: #fff !important;
        color: #b42318 !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        text-align: center !important;
        font-size: 0 !important;
        line-height: 0 !important;
        overflow: visible !important;
        vertical-align: middle !important;
        box-shadow: 0 8px 24px rgba(180, 35, 24, .10) !important;
        pointer-events: auto !important;
        cursor: pointer !important;
        opacity: 1 !important;
        visibility: visible !important;
        transform: none !important;
      }

      #pmd-header-bulk-delete-btn:hover,
      #pmd-header-bulk-delete-btn:focus {
        background: #fff5f5 !important;
        border-color: #f2b8b5 !important;
        color: #9f1d14 !important;
        transform: translateY(-1px) !important;
        box-shadow: 0 12px 28px rgba(180, 35, 24, .14) !important;
      }

      #pmd-header-bulk-delete-btn i {
        font-size: 18px !important;
        line-height: 18px !important;
        color: currentColor !important;
        pointer-events: none !important;
      }

      #pmd-header-bulk-delete-count {
        position: absolute !important;
        top: -7px !important;
        right: -7px !important;
        min-width: 18px !important;
        height: 18px !important;
        padding: 0 5px !important;
        border-radius: 999px !important;
        background: #b42318 !important;
        color: #fff !important;
        border: 2px solid #fff !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        font-size: 10px !important;
        font-weight: 900 !important;
        line-height: 1 !important;
        box-shadow: 0 4px 10px rgba(180,35,24,.18) !important;
      }

      tr.pmd-row-selected-v131,
      table tbody tr:has(input[name="checked[]"]:checked) {
        background: rgba(180, 35, 24, .045) !important;
      }

      @media (max-width: 767px) {
        #pmd-header-bulk-delete-btn {
          width: 40px !important;
          min-width: 40px !important;
          max-width: 40px !important;
          height: 40px !important;
          min-height: 40px !important;
          max-height: 40px !important;
          border-radius: 13px !important;
        }
      }
    `;
    document.head.appendChild(st);
  }

  function getHeaderToolbar() {
    return (
      document.querySelector('.pmd-header-toolbar-actions') ||
      document.querySelector('#pmd-header-toolbar-actions') ||
      document.querySelector('#pmd-header-toolbar-actions-item .pmd-header-toolbar-actions') ||
      document.querySelector('#menu-mainmenu') ||
      document.querySelector('.navbar.navbar-right')
    );
  }

  function checkedBoxes() {
    return Array.from(document.querySelectorAll(CHECKBOX_SELECTOR)).filter(function (cb) {
      if (!cb || cb.disabled) return false;
      if (!cb.checked) return false;

      const value = String(cb.value || '').trim();
      if (!value) return false;

      return true;
    });
  }

  function markRows() {
    document.querySelectorAll('tr.pmd-row-selected-v131').forEach(function (tr) {
      tr.classList.remove('pmd-row-selected-v131');
    });

    checkedBoxes().forEach(function (cb) {
      const tr = cb.closest('tr');
      if (tr) tr.classList.add('pmd-row-selected-v131');
    });
  }

  function signature(el) {
    if (!el) return '';

    return [
      el.textContent || '',
      el.getAttribute('aria-label') || '',
      el.getAttribute('title') || '',
      el.getAttribute('data-original-title') || '',
      el.getAttribute('data-bs-original-title') || '',
      el.getAttribute('data-pmd-native-title') || '',
      el.getAttribute('data-request') || '',
      el.getAttribute('data-handler') || '',
      el.getAttribute('data-control') || '',
      el.getAttribute('data-action') || '',
      el.getAttribute('href') || '',
      el.className || ''
    ].join(' ').toLowerCase();
  }

  function isBadCandidate(el) {
    if (!el) return true;
    if (el.id === 'pmd-header-bulk-delete-btn') return true;
    if (el.closest('#pmd-header-bulk-delete-slot')) return true;
    if (el.closest('.profile-dropdown-menu')) return true;
    if (el.closest('#notification-panel')) return true;

    const sig = signature(el);
    if (/logout|log out|sign out|power-off/.test(sig)) return true;
    if (/pmd-header-bulk-delete/.test(sig)) return true;

    return false;
  }

  function isDeleteCandidate(el) {
    if (isBadCandidate(el)) return false;

    const sig = signature(el);

    if (/onbulkdelete|ondelete|deletechecked|delete-selected|bulk-delete/.test(sig)) return true;
    if (/\bdelete\b|\bremove\b|\btrash\b/.test(sig)) return true;

    return false;
  }

  function nativeDeleteCandidates() {
    const all = Array.from(document.querySelectorAll('button, a, input[type="button"], input[type="submit"]'));

    return all.filter(isDeleteCandidate).map(function (el) {
      const rect = el.getBoundingClientRect();
      return {
        el: el,
        text: (el.textContent || el.value || '').trim(),
        aria: el.getAttribute('aria-label') || '',
        title: el.getAttribute('title') || el.getAttribute('data-original-title') || el.getAttribute('data-bs-original-title') || '',
        request: el.getAttribute('data-request') || '',
        handler: el.getAttribute('data-handler') || '',
        href: el.getAttribute('href') || '',
        visible: !!(rect.width || rect.height),
        disabled: !!el.disabled || el.classList.contains('disabled')
      };
    });
  }

  function findNativeDelete() {
    const candidates = nativeDeleteCandidates();

    if (!candidates.length) return null;

    const preferred =
      candidates.find(c => /onbulkdelete|deletechecked|delete-selected|bulk-delete/.test(signature(c.el))) ||
      candidates.find(c => c.visible && !c.disabled) ||
      candidates.find(c => !c.disabled) ||
      candidates[0];

    return preferred ? preferred.el : null;
  }

  function ensureButton() {
    addStyle();

    let slot = document.getElementById('pmd-header-bulk-delete-slot');
    if (slot) return slot;

    const toolbar = getHeaderToolbar();
    if (!toolbar) return null;

    slot = document.createElement('span');
    slot.id = 'pmd-header-bulk-delete-slot';
    slot.className = 'pmd-header-bulk-delete-slot';

    slot.innerHTML = `
      <button type="button"
        id="pmd-header-bulk-delete-btn"
        class="pmd-header-action-btn pmd-header-tooltip-target pmd-header-action-visible"
        data-no-tooltip="1"
        data-pmd-tooltip-label="Delete selected"
        aria-label="Delete selected">
        <i class="fa fa-trash" aria-hidden="true"></i>
        <span id="pmd-header-bulk-delete-count">0</span>
      </button>
    `;

    const firstAction = toolbar.querySelector('.pmd-header-action-btn, button, a');
    if (firstAction && firstAction.parentNode === toolbar) {
      toolbar.insertBefore(slot, firstAction);
    } else {
      toolbar.appendChild(slot);
    }

    const btn = slot.querySelector('#pmd-header-bulk-delete-btn');
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();

      const selected = checkedBoxes();
      if (!selected.length) {
        update();
        return;
      }

      const native = findNativeDelete();

      if (!native) {
        alert('Delete action was not found on this page. Selection is detected, but no native delete handler exists in the DOM.');
        console.warn('PMD header bulk delete: no native delete action found', audit());
        return;
      }

      if (native.disabled) native.disabled = false;
      native.classList.remove('disabled');

      console.log('PMD header bulk delete v131: forwarding to native delete action', {
        selected: selected.map(cb => cb.value),
        native: {
          text: (native.textContent || native.value || '').trim(),
          aria: native.getAttribute('aria-label'),
          request: native.getAttribute('data-request'),
          handler: native.getAttribute('data-handler'),
          href: native.getAttribute('href')
        }
      });

      native.dispatchEvent(new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        view: window
      }));
    }, true);

    return slot;
  }

  function update() {
    const slot = ensureButton();
    const selected = checkedBoxes();
    const count = selected.length;

    markRows();

    if (!slot) return;

    const badge = slot.querySelector('#pmd-header-bulk-delete-count');
    if (badge) badge.textContent = String(count);

    if (count > 0) {
      slot.style.setProperty('display', 'inline-flex', 'important');
    } else {
      slot.style.setProperty('display', 'none', 'important');
    }

    if (count !== lastCount) {
      lastCount = count;
      console.log('PMD header bulk delete v131 selection:', {
        selectedCount: count,
        selectedValues: selected.map(cb => cb.value),
        nativeDeleteFound: !!findNativeDelete()
      });
    }
  }

  function scheduleUpdate() {
    clearTimeout(timer);
    timer = setTimeout(update, 50);
  }

  function bind() {
    addStyle();
    ensureButton();
    update();

    document.addEventListener('change', function (e) {
      if (e.target && e.target.matches && e.target.matches(CHECKBOX_SELECTOR)) {
        scheduleUpdate();
      }
    }, true);

    document.addEventListener('click', function (e) {
      if (e.target && e.target.closest && e.target.closest(CHECKBOX_SELECTOR)) {
        scheduleUpdate();
      }
    }, true);

    if (observer) observer.disconnect();
    observer = new MutationObserver(scheduleUpdate);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['checked', 'class', 'style', 'disabled']
    });

    setTimeout(update, 200);
    setTimeout(update, 700);
    setTimeout(update, 1500);
  }

  function audit() {
    const selected = checkedBoxes();
    const candidates = nativeDeleteCandidates().map(function (c) {
      return {
        text: c.text,
        aria: c.aria,
        title: c.title,
        request: c.request,
        handler: c.handler,
        href: c.href,
        visible: c.visible,
        disabled: c.disabled
      };
    });

    const result = {
      version: VERSION,
      url: location.href,
      checkboxSelector: CHECKBOX_SELECTOR,
      checkedCount: selected.length,
      checkedValues: selected.map(cb => cb.value),
      totalRowCheckboxes: document.querySelectorAll(CHECKBOX_SELECTOR).length,
      headerToolbarFound: !!getHeaderToolbar(),
      proxyButtonFound: !!document.getElementById('pmd-header-bulk-delete-btn'),
      nativeDeleteFound: !!findNativeDelete(),
      nativeDeleteCandidates: candidates
    };

    console.log('PMD HEADER BULK DELETE AUDIT:', result);
    return result;
  }

  window.PMDHeaderBulkDeleteV131 = {
    refresh: update,
    audit: audit,
    candidates: nativeDeleteCandidates,
    selected: function () {
      return checkedBoxes().map(cb => cb.value);
    }
  };

  ready(function () {
    bind();
    console.log('✅ PMD header bulk delete v131 active');
  });
})();

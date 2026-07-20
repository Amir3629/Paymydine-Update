/* PMD_KDS_SETTINGS_NOISE_GUARD_V54_header-bulk-delete_START */
if (/^\/admin\/kds_stations(?:\/|$)/.test(window.location.pathname)) {
  window.PMD_KDS_SETTINGS_NOISE_GUARD_V54 = window.PMD_KDS_SETTINGS_NOISE_GUARD_V54 || [];
  window.PMD_KDS_SETTINGS_NOISE_GUARD_V54.push("header-bulk-delete");
  console.info("[PMD] skipped header-bulk-delete on KDS settings page", {
    path: window.location.pathname
  });
} else {
/* PMD_KDS_SETTINGS_NOISE_GUARD_V54_header-bulk-delete_BODY_START */
(function () {
  'use strict';

  if (!/^\/admin(\/|$)/.test(location.pathname)) return;
  if (window.__PMD_HEADER_BULK_DELETE_V132__) return;
  window.__PMD_HEADER_BULK_DELETE_V132__ = true;

  const VERSION = 'v132-global';

  const CHECKBOX_SELECTOR = [
    'input[type="checkbox"][name="checked[]"]',
    'td.list-action input[type="checkbox"]',
    '.list-action input.form-check-input[type="checkbox"]',
    'table input[type="checkbox"][value][name^="checked"]'
  ].join(',');

  let lastCount = -1;
  let timer = null;
  let observer = null;

  function ready(fn) {
    if (document.body) return fn();
    document.addEventListener('DOMContentLoaded', fn, { once: true });
  }

  function addStyle() {
    if (document.getElementById('pmd-header-bulk-delete-v132-css')) return;

    const st = document.createElement('style');
    st.id = 'pmd-header-bulk-delete-v132-css';
    st.textContent = `
      #pmd-header-bulk-delete-slot-v132 {
        display: none;
        align-items: center;
        justify-content: center;
        position: relative;
      }

      #pmd-header-bulk-delete-btn-v132 {
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
        box-shadow: 0 8px 24px rgba(180,35,24,.10) !important;
        cursor: pointer !important;
        pointer-events: auto !important;
        opacity: 1 !important;
        visibility: visible !important;
      }

      #pmd-header-bulk-delete-btn-v132:hover {
        background: #fff5f5 !important;
        border-color: #f2b8b5 !important;
        transform: translateY(-1px) !important;
      }

      #pmd-header-bulk-delete-btn-v132 i {
        font-size: 18px !important;
        line-height: 18px !important;
        color: currentColor !important;
        pointer-events: none !important;
      }

      #pmd-header-bulk-delete-count-v132 {
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
      }

      tr.pmd-row-selected-v132 {
        background: rgba(180,35,24,.045) !important;
      }

      @media (max-width: 767px) {
        #pmd-header-bulk-delete-btn-v132 {
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

  function toolbar() {
    return (
      document.querySelector('.pmd-header-toolbar-actions') ||
      document.querySelector('#pmd-header-toolbar-actions-item .pmd-header-toolbar-actions') ||
      document.querySelector('#menu-mainmenu') ||
      document.querySelector('.navbar.navbar-right')
    );
  }

  function rowCheckboxes() {
    return Array.from(document.querySelectorAll(CHECKBOX_SELECTOR)).filter(cb => {
      const val = String(cb.value || '').trim();
      return val && val !== 'on' && !cb.disabled;
    });
  }

  function checkedBoxes() {
    return rowCheckboxes().filter(cb => cb.checked);
  }

  function sig(el) {
    if (!el) return '';
    return [
      el.textContent || '',
      el.value || '',
      el.getAttribute('aria-label') || '',
      el.getAttribute('title') || '',
      el.getAttribute('data-original-title') || '',
      el.getAttribute('data-bs-original-title') || '',
      el.getAttribute('data-request') || '',
      el.getAttribute('data-handler') || '',
      el.getAttribute('data-control') || '',
      el.getAttribute('data-action') || '',
      el.getAttribute('href') || '',
      el.className || ''
    ].join(' ').toLowerCase();
  }

  function nativeDeleteCandidates() {
    return Array.from(document.querySelectorAll('button, a, input[type="button"], input[type="submit"]'))
      .filter(el => {
        if (!el) return false;
        if (el.id === 'pmd-header-bulk-delete-btn-v132') return false;
        if (el.closest('#pmd-header-bulk-delete-slot-v132')) return false;
        if (el.closest('.profile-dropdown-menu')) return false;
        if (el.closest('#notification-panel')) return false;

        const s = sig(el);
        if (/logout|sign out|power-off/.test(s)) return false;

        return (
          /onbulkdelete|deletechecked|delete-selected|bulk-delete|checked.*delete/.test(s) ||
          /\bdelete\b|\bremove\b|\btrash\b/.test(s)
        );
      });
  }

  function findNativeDelete() {
    const candidates = nativeDeleteCandidates();

    return (
      candidates.find(el => /onbulkdelete|deletechecked|delete-selected|bulk-delete/.test(sig(el))) ||
      candidates.find(el => {
        const r = el.getBoundingClientRect();
        return (r.width || r.height) && !el.disabled && !el.classList.contains('disabled');
      }) ||
      candidates.find(el => !el.disabled && !el.classList.contains('disabled')) ||
      candidates[0] ||
      null
    );
  }

  function ensureButton() {
    addStyle();

    let slot = document.getElementById('pmd-header-bulk-delete-slot-v132');
    if (slot) return slot;

    const t = toolbar();
    if (!t) return null;

    slot = document.createElement('span');
    slot.id = 'pmd-header-bulk-delete-slot-v132';
    slot.innerHTML = `
      <button type="button"
        id="pmd-header-bulk-delete-btn-v132"
        class="pmd-header-action-btn pmd-header-tooltip-target pmd-header-action-visible"
        data-no-tooltip="1"
        data-pmd-tooltip-label="Delete selected"
        aria-label="Delete selected">
        <i class="fa fa-trash" aria-hidden="true"></i>
        <span id="pmd-header-bulk-delete-count-v132">0</span>
      </button>
    `;

    const first = t.querySelector('.pmd-header-action-btn, button, a');
    if (first && first.parentNode === t) t.insertBefore(slot, first);
    else t.appendChild(slot);

    slot.querySelector('#pmd-header-bulk-delete-btn-v132').addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();

      const selected = checkedBoxes();
      if (!selected.length) return update();

      const native = findNativeDelete();
      if (!native) {
        console.warn('PMD v132: selected rows found, but no native delete action found.', audit());
        alert('Rows are selected, but the native delete action was not found on this page.');
        return;
      }

      native.disabled = false;
      native.classList.remove('disabled');

      console.log('PMD v132: forwarding header delete to native delete action', {
        selectedValues: selected.map(cb => cb.value),
        nativeText: (native.textContent || native.value || '').trim(),
        nativeRequest: native.getAttribute('data-request'),
        nativeHref: native.getAttribute('href')
      });

      native.dispatchEvent(new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        view: window
      }));
    }, true);

    return slot;
  }

  function markRows() {
    document.querySelectorAll('tr.pmd-row-selected-v132').forEach(tr => {
      tr.classList.remove('pmd-row-selected-v132');
    });

    checkedBoxes().forEach(cb => {
      const tr = cb.closest('tr');
      if (tr) tr.classList.add('pmd-row-selected-v132');
    });
  }

  function update() {
    const slot = ensureButton();
    const selected = checkedBoxes();
    const count = selected.length;

    markRows();

    if (!slot) return;

    const badge = document.getElementById('pmd-header-bulk-delete-count-v132');
    if (badge) badge.textContent = String(count);

    if (count > 0) {
      slot.style.setProperty('display', 'inline-flex', 'important');
    } else {
      slot.style.setProperty('display', 'none', 'important');
    }

    if (count !== lastCount) {
      lastCount = count;
      console.log('PMD header bulk delete v132:', {
        page: location.pathname,
        totalRowCheckboxes: rowCheckboxes().length,
        selectedCount: count,
        nativeDeleteFound: !!findNativeDelete()
      });
    }
  }

  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(update, 40);
  }

  function audit() {
    const result = {
      version: VERSION,
      page: location.href,
      toolbarFound: !!toolbar(),
      proxyButtonFound: !!document.getElementById('pmd-header-bulk-delete-btn-v132'),
      totalRowCheckboxes: rowCheckboxes().length,
      checkedCount: checkedBoxes().length,
      checkedValues: checkedBoxes().map(cb => cb.value),
      nativeDeleteFound: !!findNativeDelete(),
      nativeDeleteCandidates: nativeDeleteCandidates().map(el => ({
        text: (el.textContent || el.value || '').trim(),
        aria: el.getAttribute('aria-label'),
        request: el.getAttribute('data-request'),
        handler: el.getAttribute('data-handler'),
        href: el.getAttribute('href'),
        visible: !!(el.getBoundingClientRect().width || el.getBoundingClientRect().height),
        disabled: !!el.disabled || el.classList.contains('disabled')
      }))
    };

    console.log('PMD HEADER BULK DELETE v132 AUDIT:', result);
    return result;
  }

  function bind() {
    addStyle();
    ensureButton();
    update();

    document.addEventListener('change', e => {
      if (e.target && e.target.matches && e.target.matches(CHECKBOX_SELECTOR)) schedule();
    }, true);

    document.addEventListener('click', e => {
      if (e.target && e.target.closest && e.target.closest(CHECKBOX_SELECTOR)) schedule();
    }, true);

    if (observer) observer.disconnect();
    observer = new MutationObserver(schedule);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['checked', 'class', 'style', 'disabled']
    });

    [150, 500, 1000, 2000].forEach(ms => setTimeout(update, ms));
  }

  window.PMDHeaderBulkDeleteV132 = {
    refresh: update,
    audit,
    selected: () => checkedBoxes().map(cb => cb.value),
    candidates: nativeDeleteCandidates
  };

  ready(() => {
    bind();
    console.log('✅ PMD header bulk delete v132 global active');
  });
})();

/* PMD_KDS_SETTINGS_NOISE_GUARD_V54_header-bulk-delete_END */
}

/* PMD_HEADER_EXPAND_SEARCH_V159
 * UI-only controller. Existing Menu/Coupon search inputs keep their original
 * data attributes, so their established filtering runtimes remain authoritative.
 */
(function () {
  'use strict';
  if (window.PMDHeaderExpandSearchV159) return;

  function qa(selector, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(selector));
  }

  function inputOf(root) {
    return root && root.querySelector('[data-pmd-header-search-input]');
  }

  function toggleOf(root) {
    return root && root.querySelector('[data-pmd-header-search-toggle]');
  }

  function setOpen(root, open, focusInput) {
    if (!root) return;
    var input = inputOf(root);
    var toggle = toggleOf(root);
    var disabled = Boolean(input && input.disabled);

    if (disabled) open = false;

    root.classList.toggle('is-open', Boolean(open));
    root.setAttribute('data-pmd-header-search-open', open ? '1' : '0');

    if (toggle) {
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      toggle.disabled = disabled;
    }

    if (open && focusInput && input) {
      window.requestAnimationFrame(function () {
        try {
          input.focus({preventScroll: true});
          var length = String(input.value || '').length;
          input.setSelectionRange(length, length);
        } catch (error) {
          input.focus();
        }
      });
    }
  }

  function mount(root) {
    if (!root || root.getAttribute('data-pmd-header-search-mounted') === '1') return;
    root.setAttribute('data-pmd-header-search-mounted', '1');

    var input = inputOf(root);
    var toggle = toggleOf(root);
    if (!input || !toggle) return;

    toggle.addEventListener('click', function (event) {
      event.preventDefault();
      event.stopPropagation();
      setOpen(root, !root.classList.contains('is-open'), true);
    });

    input.addEventListener('focus', function () {
      setOpen(root, true, false);
    });

    input.addEventListener('keydown', function (event) {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      input.blur();
      setOpen(root, false, false);
      toggle.focus();
    });

    // Menu sort mode can disable its existing search input. Keep the compact
    // header button in the same state automatically.
    var observer = new MutationObserver(function () {
      if (input.disabled) setOpen(root, false, false);
      toggle.disabled = Boolean(input.disabled);
    });
    observer.observe(input, {attributes: true, attributeFilter: ['disabled']});

    toggle.disabled = Boolean(input.disabled);
  }

  document.addEventListener('click', function (event) {
    qa('[data-pmd-header-expand-search].is-open').forEach(function (root) {
      if (root.contains(event.target)) return;
      setOpen(root, false, false);
    });
  });

  document.addEventListener('keydown', function (event) {
    if (event.key !== 'Escape') return;
    qa('[data-pmd-header-expand-search].is-open').forEach(function (root) {
      setOpen(root, false, false);
    });
  });

  function mountAll() {
    qa('[data-pmd-header-expand-search]').forEach(mount);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountAll, {once: true});
  } else {
    mountAll();
  }

  window.PMDHeaderExpandSearchV159 = {
    version: '159.0.0',
    mount: mountAll,
    open: function (surface) {
      var root = document.querySelector(
        '[data-pmd-header-search-surface="' + String(surface || '') + '"]'
      );
      setOpen(root, true, true);
    },
    close: function (surface) {
      var root = document.querySelector(
        '[data-pmd-header-search-surface="' + String(surface || '') + '"]'
      );
      setOpen(root, false, false);
    }
  };
})();

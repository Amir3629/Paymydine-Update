(function () {
  'use strict';

  var root = document.querySelector('[data-pmd-settings-center]');
  if (!root) return;

  /*
   * PMD_SETTINGS_STABLE_RENDER_V7
   *
   * Single visual authority for /admin/pmdsettings:
   * - legacy navbar is removed before reveal
   * - clean mother-kit header is built while page content is hidden
   * - search is moved into the header before first visible paint
   * - notification is preserved and moved into the same header
   * - final UI is revealed only after two animation frames
   */

  function installRouteStyle() {
    /*
     * Settings Header geometry is server/static CSS authority.
     * Runtime must not inject another 42px Header stylesheet.
     */
    return;
  }

  function hardResetSearchInput(input) {
    if (!input) return;

    [
      ['-webkit-appearance', 'none'],
      ['appearance', 'none'],
      ['border', '0'],
      ['border-left', '0'],
      ['border-right', '0'],
      ['outline', '0'],
      ['box-shadow', 'none'],
      ['background', 'transparent'],
      ['background-image', 'none'],
      ['border-radius', '0']
    ].forEach(function (entry) {
      input.style.setProperty(entry[0], entry[1], 'important');
    });
  }

  function installCleanHeader() {
    /*
     * Server Header already exists.
     * Runtime may USE it, but must never remove/rebuild it.
     */
    var header =
      document.getElementById(
        'pmd-settings-clean-header'
      );

    if (!header) {
      return null;
    }

    return (
      header.querySelector(
        '.pmd-settings-clean-actions'
      )
      || header.querySelector(
        '[data-pmd-settings-header-actions-v11]'
      )
      || header.querySelector(
        '[data-pmd-settings-header-actions]'
      )
    );
  }

  installRouteStyle();

  var actions = installCleanHeader();
  var search = root.querySelector('[data-pmd-settings-search]');
  var searchWrap = search ? search.closest('.pmd-settings-search-wrap') : null;

  if (actions && searchWrap) {
    searchWrap.classList.add('pmd-settings-header-search');
    if (searchWrap.parentNode !== actions) {
      actions.insertBefore(
        searchWrap,
        actions.firstChild
      );
    }
    hardResetSearchInput(search);

    function openSearch(selectText) {
      searchWrap.classList.add('is-open');
      searchWrap.setAttribute('aria-expanded', 'true');

      window.requestAnimationFrame(function () {
        hardResetSearchInput(search);
        if (!search) return;
        search.focus();
        hardResetSearchInput(search);
        if (selectText) search.select();
      });
    }

    function closeSearch(force) {
      if (!force && search && search.value) return;
      searchWrap.classList.remove('is-open');
      searchWrap.setAttribute('aria-expanded', 'false');
      if (search && document.activeElement === search) search.blur();
    }

    searchWrap.setAttribute('role', 'search');
    searchWrap.setAttribute('aria-expanded', 'false');

    searchWrap.addEventListener('click', function (event) {
      if (!searchWrap.classList.contains('is-open')) {
        event.preventDefault();
        openSearch(false);
      }
    });

    if (search) {
      search.addEventListener('click', function (event) {
        event.stopPropagation();
      });

      search.addEventListener('focus', function () {
        hardResetSearchInput(search);
        window.requestAnimationFrame(function () {
          hardResetSearchInput(search);
        });
      }, true);
    }

    document.addEventListener('pointerdown', function (event) {
      if (!searchWrap.classList.contains('is-open')) return;
      if (searchWrap.contains(event.target)) return;
      closeSearch(false);
    });

    window.PMDSettingsHeaderSearchV6 = {
      open: openSearch,
      close: closeSearch,
      element: searchWrap
    };
  }

  /*
   * PMD_SETTINGS_DEFERRED_PAGES_R43
   *
   * Keep these existing pages and their routes intact, but remove only their
   * entry cards from the consolidated Settings landing page for now.
   */
  var deferredSettingsPaths = [
    '/admin/pmdadvanced',
    '/admin/pmdbrand',
    '/admin/pmdcustomer'
  ];

  Array.prototype.slice.call(
    root.querySelectorAll('[data-pmd-settings-card]')
  ).forEach(function (card) {
    var link = card.matches('a[href]')
      ? card
      : card.querySelector('a[href]');

    if (!link) return;

    var path = '';
    try {
      path = new URL(link.getAttribute('href'), window.location.origin).pathname;
    } catch (error) {
      path = String(link.getAttribute('href') || '').split('?')[0].split('#')[0];
    }

    path = path.replace(/\/+$/, '') || '/';

    if (deferredSettingsPaths.indexOf(path) !== -1) {
      card.remove();
    }
  });

  Array.prototype.slice.call(
    root.querySelectorAll('[data-pmd-settings-section]')
  ).forEach(function (section) {
    if (!section.querySelector('[data-pmd-settings-card]')) {
      section.remove();
    }
  });

  var cards = Array.prototype.slice.call(
    root.querySelectorAll('[data-pmd-settings-card]')
  );
  var groups = Array.prototype.slice.call(
    root.querySelectorAll('[data-pmd-settings-section]')
  );
  var modules = Array.prototype.slice.call(
    root.querySelectorAll('.pmd-settings-module')
  );
  var empty = root.querySelector('[data-pmd-settings-empty]');

  function clean(value) {
    return String(value || '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();
  }

  function searchable(node) {
    return clean(
      (node.getAttribute('data-pmd-searchable') || '') +
      ' ' +
      (node.textContent || '')
    );
  }

  function applySearch() {
    var query = clean(search ? search.value : '');
    var visibleCards = 0;

    cards.forEach(function (card) {
      var match = !query || searchable(card).indexOf(query) !== -1;
      card.hidden = !match;
      if (match) visibleCards += 1;
    });

    groups.forEach(function (group) {
      var visible = Array.prototype.some.call(
        group.querySelectorAll('[data-pmd-settings-card]'),
        function (card) {
          return !card.hidden;
        }
      );

      var groupMatch = !query || searchable(group).indexOf(query) !== -1;

      if (groupMatch && query && !visible) {
        Array.prototype.forEach.call(
          group.querySelectorAll('[data-pmd-settings-card]'),
          function (card) {
            card.hidden = false;
            visibleCards += 1;
          }
        );
        visible = true;
      }

      group.hidden = query ? !visible : false;
    });

    modules.forEach(function (module) {
      module.hidden = !!query && searchable(module).indexOf(query) === -1;
    });

    if (empty) {
      var visibleModule = modules.some(function (module) {
        return !module.hidden;
      });
      empty.hidden = visibleCards > 0 || visibleModule || !query;
    }
  }

  if (search) {
    search.addEventListener('input', applySearch);
  }

  document.addEventListener('keydown', function (event) {
    if (
      (event.metaKey || event.ctrlKey) &&
      String(event.key || '').toLowerCase() === 'k'
    ) {
      event.preventDefault();
      if (window.PMDSettingsHeaderSearchV6) {
        window.PMDSettingsHeaderSearchV6.open(true);
      }
    }

    if (event.key === 'Escape' && search) {
      if (search.value) {
        search.value = '';
        applySearch();
      }
      if (window.PMDSettingsHeaderSearchV6) {
        window.PMDSettingsHeaderSearchV6.close(true);
      }
    }
  });

  applySearch();

  function revealStablePage() {
    if (window.PMDSettingsRevealFallback) {
      window.clearTimeout(window.PMDSettingsRevealFallback);
    }

    document.documentElement.classList.remove('pmd-settings-v7-booting');
    document.documentElement.classList.add('pmd-settings-v7-ready');
  }

  /*
   * V7: reveal synchronously after final DOM ownership is established.
   * Browser does not get a paint opportunity between placeholder removal
   * and installation of the real clean header.
   */
  revealStablePage();

  window.PMDSettingsStableRenderV7 = {
    version: '7.0.0-r43',
    background: '#f8fbfd',
    searchInHeader: Boolean(searchWrap && actions && searchWrap.parentNode === actions),
    notificationInHeader: Boolean(document.querySelector('#pmd-settings-clean-header #notif-root')),
    deferredSettingsPaths: deferredSettingsPaths.slice(),
    flashGuard: true
  };
})();

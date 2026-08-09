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
    if (document.getElementById('pmd-settings-stable-render-v6')) return;

    var style = document.createElement('style');
    style.id = 'pmd-settings-stable-render-v6';
    style.textContent = [
      'html.pmd-settings-center-v2,',
      'html.pmd-settings-center-v2 body,',
      'html.pmd-settings-center-v2 body.page,',
      'html.pmd-settings-center-v2 .page,',
      'html.pmd-settings-center-v2 .page-wrapper,',
      'html.pmd-settings-center-v2 .page-content,',
      'html.pmd-settings-center-v2 .content-wrapper,',
      'html.pmd-settings-center-v2 .container-fluid,',
      'html.pmd-settings-center-v2 main,',
      'html.pmd-settings-center-v2 #pmd-settings-center {',
      '  background:#f8fbfd !important;',
      '}',
      'html.pmd-settings-center-v2 body {',
      '  margin-top:0 !important;',
      '  padding-top:0 !important;',
      '}',
      'html.pmd-settings-center-v2 .page-wrapper {',
      '  top:0 !important;',
      '  margin-top:0 !important;',
      '}',
      '',
      '#pmd-settings-clean-header {',
      '  background:#f8fbfd !important;',
      '}',
      '#pmd-settings-clean-header .pmd-settings-clean-actions {',
      '  display:flex !important;',
      '  align-items:center !important;',
      '  justify-content:flex-end !important;',
      '  gap:8px !important;',
      '  min-width:0 !important;',
      '  margin-left:auto !important;',
      '}',
      '',
      '/* Compact search -> expands smoothly to the left. */',
      '#pmd-settings-clean-header .pmd-settings-header-search {',
      '  order:1 !important;',
      '  width:42px !important;',
      '  min-width:42px !important;',
      '  height:42px !important;',
      '  margin:0 !important;',
      '  padding:0 !important;',
      '  overflow:hidden !important;',
      '  display:flex !important;',
      '  align-items:center !important;',
      '  justify-content:flex-start !important;',
      '  border:1px solid #c9e0ef !important;',
      '  border-radius:11px !important;',
      '  background:#fff !important;',
      '  box-shadow:none !important;',
      '  cursor:pointer !important;',
      '  transition:width .24s cubic-bezier(.2,.8,.2,1), border-color .16s ease, box-shadow .16s ease !important;',
      '}',
      '#pmd-settings-clean-header .pmd-settings-header-search.is-open {',
      '  width:min(330px, calc(100vw - 190px)) !important;',
      '  cursor:text !important;',
      '  border-color:#9fc4d9 !important;',
      '  box-shadow:0 0 0 3px rgba(58,132,173,.07) !important;',
      '}',
      '#pmd-settings-clean-header .pmd-settings-header-search > svg {',
      '  flex:0 0 auto !important;',
      '  width:18px !important;',
      '  height:18px !important;',
      '  margin:0 11px !important;',
      '  stroke:#17231f !important;',
      '}',
      '#pmd-settings-clean-header .pmd-settings-header-search .pmd-settings-search {',
      '  -webkit-appearance:none !important;',
      '  appearance:none !important;',
      '  flex:1 1 auto !important;',
      '  width:0 !important;',
      '  min-width:0 !important;',
      '  height:40px !important;',
      '  margin:0 !important;',
      '  padding:0 !important;',
      '  opacity:0 !important;',
      '  pointer-events:none !important;',
      '  border:0 !important;',
      '  border-left:0 !important;',
      '  border-right:0 !important;',
      '  border-radius:0 !important;',
      '  outline:0 !important;',
      '  background:transparent !important;',
      '  background-image:none !important;',
      '  box-shadow:none !important;',
      '  filter:none !important;',
      '  transition:opacity .13s ease .04s !important;',
      '}',
      '#pmd-settings-clean-header .pmd-settings-header-search .pmd-settings-search:focus,',
      '#pmd-settings-clean-header .pmd-settings-header-search .pmd-settings-search:focus-visible {',
      '  border:0 !important;',
      '  outline:0 !important;',
      '  box-shadow:none !important;',
      '  background:transparent !important;',
      '}',
      '#pmd-settings-clean-header .pmd-settings-header-search.is-open .pmd-settings-search {',
      '  width:auto !important;',
      '  padding:0 10px 0 0 !important;',
      '  opacity:1 !important;',
      '  pointer-events:auto !important;',
      '}',
      '#pmd-settings-clean-header .pmd-settings-header-search input[type="search"]::-webkit-search-decoration,',
      '#pmd-settings-clean-header .pmd-settings-header-search input[type="search"]::-webkit-search-cancel-button,',
      '#pmd-settings-clean-header .pmd-settings-header-search input[type="search"]::-webkit-search-results-button,',
      '#pmd-settings-clean-header .pmd-settings-header-search input[type="search"]::-webkit-search-results-decoration {',
      '  -webkit-appearance:none !important;',
      '  display:none !important;',
      '}',
      '#pmd-settings-clean-header .pmd-settings-header-search kbd {',
      '  display:none !important;',
      '}',
      '',
      '/* Notification: exact mother-kit square. */',
      '#pmd-settings-clean-header #notif-root {',
      '  order:2 !important;',
      '  width:42px !important;',
      '  min-width:42px !important;',
      '  height:42px !important;',
      '  margin:0 !important;',
      '  padding:0 !important;',
      '  display:block !important;',
      '  position:relative !important;',
      '  list-style:none !important;',
      '}',
      '#pmd-settings-clean-header #notif-root > .media-toolbar-tooltip-wrap {',
      '  display:block !important;',
      '  width:42px !important;',
      '  height:42px !important;',
      '  margin:0 !important;',
      '  padding:0 !important;',
      '}',
      '#pmd-settings-clean-header #notif-root #notifDropdown {',
      '  width:42px !important;',
      '  min-width:42px !important;',
      '  max-width:42px !important;',
      '  height:42px !important;',
      '  min-height:42px !important;',
      '  max-height:42px !important;',
      '  display:flex !important;',
      '  align-items:center !important;',
      '  justify-content:center !important;',
      '  margin:0 !important;',
      '  padding:0 !important;',
      '  border:1px solid #c9e0ef !important;',
      '  border-radius:11px !important;',
      '  background:#fff !important;',
      '  box-shadow:none !important;',
      '  color:#17231f !important;',
      '  line-height:1 !important;',
      '  overflow:visible !important;',
      '  position:relative !important;',
      '}',
      '#pmd-settings-clean-header #notif-root #notifDropdown:hover {',
      '  background:#f3f8fb !important;',
      '  border-color:#9fc4d9 !important;',
      '}',
      '#pmd-settings-clean-header #notif-root #notifDropdown::after {',
      '  display:none !important;',
      '  content:none !important;',
      '}',
      '#pmd-settings-clean-header #bell-icon {',
      '  width:19px !important;',
      '  height:19px !important;',
      '  display:flex !important;',
      '  align-items:center !important;',
      '  justify-content:center !important;',
      '  color:#17231f !important;',
      '}',
      '#pmd-settings-clean-header #bell-icon svg {',
      '  width:19px !important;',
      '  height:19px !important;',
      '  display:block !important;',
      '  fill:none !important;',
      '  stroke:currentColor !important;',
      '  stroke-width:2 !important;',
      '}',
      '#pmd-settings-clean-header #notification-count {',
      '  position:absolute !important;',
      '  top:-7px !important;',
      '  right:-8px !important;',
      '  z-index:3 !important;',
      '  min-width:20px !important;',
      '  height:16px !important;',
      '  padding:1px 5px !important;',
      '  display:flex !important;',
      '  align-items:center !important;',
      '  justify-content:center !important;',
      '  border:2px solid #f8fbfd !important;',
      '  border-radius:999px !important;',
      '  font-size:9px !important;',
      '  line-height:1 !important;',
      '}',
      '@media(max-width:760px){',
      '  #pmd-settings-clean-header .pmd-settings-header-search.is-open {',
      '    width:min(240px, calc(100vw - 155px)) !important;',
      '  }',
      '}'
    ].join('\n');

    document.head.appendChild(style);
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
    var legacyTopbars = document.querySelectorAll('.navbar-top, .navbar-fixed-top');
    var notificationRoot = document.getElementById('notif-root');
    var oldHeader = document.getElementById('pmd-settings-clean-header');

    if (oldHeader) oldHeader.remove();
    if (notificationRoot) notificationRoot.remove();

    Array.prototype.forEach.call(legacyTopbars, function (node) {
      node.remove();
    });

    var header = document.createElement('header');
    header.id = 'pmd-settings-clean-header';
    header.setAttribute('aria-label', 'Settings page header');

    var title = document.createElement('h1');
    title.className = 'pmd-settings-clean-title';
    title.textContent = 'Settings';

    var actions = document.createElement('div');
    actions.className = 'pmd-settings-clean-actions';

    if (notificationRoot) {
      var oldBell = notificationRoot.querySelector('#bell-icon');
      if (oldBell) {
        var bell = document.createElement('span');
        bell.id = 'bell-icon';
        bell.setAttribute('aria-hidden', 'true');
        bell.innerHTML = '<svg viewBox="0 0 24 24"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"></path><path d="M10 21h4"></path></svg>';
        oldBell.replaceWith(bell);
      }

      notificationRoot.classList.add('pmd-settings-clean-notification');
      actions.appendChild(notificationRoot);

      /*
       * PMD_SETTINGS_ZERO_JUMP_V7
       *
       * The notification node is physically moved from the legacy navbar.
       * Never preserve an old Bootstrap/open dropdown state during that move.
       */
      notificationRoot.classList.remove('show');

      var notificationToggle =
        notificationRoot.querySelector('#notifDropdown');

      if (notificationToggle) {
        notificationToggle.classList.remove('show');
        notificationToggle.setAttribute(
          'aria-expanded',
          'false'
        );
      }

      Array.prototype.forEach.call(
        notificationRoot.querySelectorAll(
          '.dropdown-menu.show'
        ),
        function (menu) {
          menu.classList.remove('show');
          menu.style.removeProperty('display');
        }
      );
    }

    header.appendChild(title);
    header.appendChild(actions);
    root.insertBefore(header, root.firstChild);

    return actions;
  }

  installRouteStyle();

  var actions = installCleanHeader();
  var search = root.querySelector('[data-pmd-settings-search]');
  var searchWrap = search ? search.closest('.pmd-settings-search-wrap') : null;

  if (actions && searchWrap) {
    searchWrap.classList.add('pmd-settings-header-search');
    actions.insertBefore(searchWrap, actions.firstChild);
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
    version: '7.0.0',
    background: '#f8fbfd',
    searchInHeader: Boolean(searchWrap && actions && searchWrap.parentNode === actions),
    notificationInHeader: Boolean(document.querySelector('#pmd-settings-clean-header #notif-root')),
    flashGuard: true
  };
})();

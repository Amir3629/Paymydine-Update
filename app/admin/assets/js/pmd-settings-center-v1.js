(function () {
  'use strict';

  var root = document.querySelector('[data-pmd-settings-center]');
  if (!root) return;

  /*
   * PMD_SETTINGS_CLEAN_HEADER_V4
   *
   * This intentionally follows the proven Reservations2 Clean Header V3
   * pattern instead of trying to restyle the legacy admin navbar.
   *
   * One owner:
   * - remove the legacy topbar
   * - preserve/move the real notification dropdown
   * - create one clean Dashboard2-style header
   */
  function installCleanHeader() {
    var legacyTopbar = document.querySelector('.navbar-top, .navbar-fixed-top');
    var notificationRoot = document.getElementById('notif-root');

    var oldHeader = document.getElementById('pmd-settings-clean-header');
    if (oldHeader) oldHeader.remove();

    if (notificationRoot) notificationRoot.remove();
    if (legacyTopbar) legacyTopbar.remove();

    document.documentElement.classList.add('pmd-settings-clean-header-ready');

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
    }

    header.appendChild(title);
    header.appendChild(actions);
    root.insertBefore(header, root.firstChild);

    window.PMDSettingsCleanHeaderV4 = {
      version: '4.0.0',
      legacyRemoved: !document.querySelector('.navbar-top, .navbar-fixed-top'),
      title: 'Settings',
      notificationMoved: Boolean(notificationRoot)
    };
  }

  installCleanHeader();

  var search = root.querySelector('[data-pmd-settings-search]');
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
      if (search) {
        search.focus();
        search.select();
      }
    }

    if (
      event.key === 'Escape' &&
      search &&
      document.activeElement === search &&
      search.value
    ) {
      search.value = '';
      applySearch();
    }
  });

  applySearch();
})();

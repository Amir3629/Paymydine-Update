(function () {
  'use strict';

  var root = document.querySelector('[data-pmd-settings-center]');
  if (!root) return;

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
  var navLinks = Array.prototype.slice.call(
    root.querySelectorAll('[data-pmd-settings-nav]')
  );

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

  navLinks.forEach(function (link) {
    link.addEventListener('click', function () {
      navLinks.forEach(function (item) {
        item.classList.remove('is-active');
      });
      link.classList.add('is-active');
    });
  });

  if ('IntersectionObserver' in window) {
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;

          var id = entry.target.getAttribute('data-pmd-settings-section');
          if (!id) return;

          navLinks.forEach(function (link) {
            link.classList.toggle(
              'is-active',
              link.getAttribute('data-pmd-settings-nav') === id
            );
          });
        });
      },
      {
        rootMargin: '-20% 0px -65% 0px',
        threshold: 0
      }
    );

    groups.forEach(function (group) {
      observer.observe(group);
    });
  }

  applySearch();
})();

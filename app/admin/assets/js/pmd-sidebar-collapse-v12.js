(function () {
  'use strict';

  var STORAGE_KEY = 'pmdAdminSidebarCollapsed';

  function body() {
    return document.body;
  }

  function sidebar() {
    return document.querySelector('.sidebar');
  }

  function nav() {
    return document.querySelector('#side-nav-menu');
  }

  function isAdminTheme() {
    return body() && body().classList.contains('pmd-admin-theme-v1');
  }

  function isCollapsed() {
    return body().classList.contains('pmd-sidebar-collapsed');
  }

  function closeOpenSubmenus() {
    var menu = nav();
    if (!menu) return;

    menu.querySelectorAll('.collapse.show, ul.nav.show').forEach(function (el) {
      el.classList.remove('show');
      el.style.height = '';
    });

    menu.querySelectorAll('[data-toggle="collapse"][aria-expanded="true"]').forEach(function (link) {
      link.setAttribute('aria-expanded', 'false');
    });
  }

  function updateButton() {
    var btn = document.querySelector('.pmd-sidebar-collapse-toggle');
    if (!btn) return;

    var collapsed = isCollapsed();
    btn.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
    btn.setAttribute('title', collapsed ? 'Open sidebar' : 'Close sidebar');
    btn.innerHTML = collapsed
      ? '<i class="fa fa-angle-right" aria-hidden="true"></i>'
      : '<i class="fa fa-angle-left" aria-hidden="true"></i>';
  }

  function setCollapsed(value) {
    if (!isAdminTheme()) return;

    body().classList.toggle('pmd-sidebar-collapsed', !!value);
    localStorage.setItem(STORAGE_KEY, value ? '1' : '0');

    if (value) closeOpenSubmenus();

    updateButton();

    window.dispatchEvent(new Event('resize'));
  }

  function toggle() {
    setCollapsed(!isCollapsed());
  }

  function addTitles() {
    var menu = nav();
    if (!menu) return;

    menu.querySelectorAll('a.nav-link').forEach(function (link) {
      var text = (link.innerText || '').replace(/\s+/g, ' ').trim();

      if (!text) {
        var content = link.querySelector('.content');
        text = content ? (content.textContent || '').replace(/\s+/g, ' ').trim() : '';
      }

      if (text && !link.getAttribute('title')) {
        link.setAttribute('title', text);
      }
    });
  }

  function detectProfileCard() {
    var side = sidebar();
    if (!side) return;

    var candidates = Array.from(side.querySelectorAll('*')).filter(function (el) {
      return /Chef Admin|Owner/i.test(el.textContent || '');
    });

    if (!candidates.length) return;

    var node = candidates[0];

    var card =
      node.closest('.pmd-sidebar-user-card') ||
      node.closest('.pmd-sidebar-footer') ||
      node.closest('.sidebar-footer') ||
      node.closest('.media') ||
      node.closest('.card') ||
      node.parentElement;

    if (card) {
      card.classList.add('pmd-sidebar-profile-collapse-target');
      card.setAttribute('title', 'Chef Admin');
    }
  }

  function installToggleButton() {
    var side = sidebar();
    if (!side || document.querySelector('.pmd-sidebar-collapse-toggle')) return;

    side.style.position = side.style.position || 'fixed';

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'pmd-sidebar-collapse-toggle';
    btn.setAttribute('aria-label', 'Toggle sidebar');

    btn.addEventListener('click', function (event) {
      event.preventDefault();
      event.stopPropagation();
      toggle();
    });

    side.appendChild(btn);
    updateButton();
  }

  function interceptCollapsedParents() {
    var menu = nav();
    if (!menu || menu.dataset.pmdCollapseIntercept === '1') return;

    menu.dataset.pmdCollapseIntercept = '1';

    menu.addEventListener('click', function (event) {
      var link = event.target.closest('a.nav-link[data-toggle="collapse"]');
      if (!link) return;

      if (isCollapsed()) {
        event.preventDefault();
        event.stopPropagation();

        setCollapsed(false);

        setTimeout(function () {
          link.click();
        }, 120);
      }
    }, true);
  }

  function init() {
    if (!isAdminTheme()) return;

    installToggleButton();
    addTitles();
    detectProfileCard();
    interceptCollapsedParents();

    var saved = localStorage.getItem(STORAGE_KEY);
    if (saved === '1') {
      setCollapsed(true);
    } else {
      setCollapsed(false);
    }

    window.PMDSidebarCollapse = {
      toggle: toggle,
      collapse: function () { setCollapsed(true); },
      expand: function () { setCollapsed(false); },
      status: function () { return isCollapsed() ? 'collapsed' : 'expanded'; }
    };
  }

  function schedule() {
    [100, 500, 1200, 2500].forEach(function (delay) {
      setTimeout(init, delay);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', schedule, { once: true });
  } else {
    schedule();
  }
})();

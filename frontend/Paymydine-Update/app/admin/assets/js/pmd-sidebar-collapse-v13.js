(function () {
  'use strict';

  var STORAGE_KEY = 'pmdAdminSidebarCollapsedV13';

  function b() {
    return document.body;
  }

  function sidebar() {
    return document.querySelector('.sidebar');
  }

  function nav() {
    return document.querySelector('#side-nav-menu');
  }

  function isTheme() {
    return b() && b().classList.contains('pmd-admin-theme-v1');
  }

  function isCollapsed() {
    return b().classList.contains('pmd-sidebar-collapsed');
  }

  function closeSubmenus() {
    var menu = nav();
    if (!menu) return;

    menu.querySelectorAll('ul.nav.show, .collapse.show').forEach(function (el) {
      el.classList.remove('show');
      el.style.height = '';
    });

    menu.querySelectorAll('a.nav-link[data-toggle="collapse"][aria-expanded="true"]').forEach(function (link) {
      link.setAttribute('aria-expanded', 'false');
    });
  }

  function updateButton() {
    var btn = document.querySelector('.pmd-sidebar-collapse-toggle');
    if (!btn) return;

    var collapsed = isCollapsed();

    btn.innerHTML = collapsed
      ? '<i class="fa fa-angle-right" aria-hidden="true"></i>'
      : '<i class="fa fa-angle-left" aria-hidden="true"></i>';

    btn.setAttribute('title', collapsed ? 'Open sidebar' : 'Close sidebar');
    btn.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
  }

  function setCollapsed(value) {
    if (!isTheme()) return;

    b().classList.toggle('pmd-sidebar-collapsed', !!value);
    localStorage.setItem(STORAGE_KEY, value ? '1' : '0');

    if (value) closeSubmenus();

    updateButton();

    setTimeout(function () {
      window.dispatchEvent(new Event('resize'));
    }, 80);
  }

  function toggle() {
    setCollapsed(!isCollapsed());
  }

  function addTitles() {
    var menu = nav();
    if (!menu) return;

    menu.querySelectorAll('a.nav-link').forEach(function (link) {
      var content = link.querySelector('.content');
      var text = content ? content.textContent : link.textContent;
      text = String(text || '').replace(/\s+/g, ' ').trim();

      if (text) link.setAttribute('title', text);
    });
  }

  function markProfileCard() {
    var side = sidebar();
    if (!side) return;

    var nodes = Array.from(side.querySelectorAll('*')).filter(function (el) {
      return /Chef Admin|Owner/i.test(el.textContent || '');
    });

    if (!nodes.length) return;

    var node = nodes[0];
    var card =
      node.closest('.pmd-sidebar-user-card') ||
      node.closest('.sidebar-footer') ||
      node.closest('.pmd-sidebar-footer') ||
      node.closest('.media') ||
      node.closest('.card') ||
      node.parentElement;

    if (card) {
      card.classList.add('pmd-sidebar-profile-collapse-target');
      card.setAttribute('title', 'Chef Admin');
    }
  }

  function installButton() {
    var side = sidebar();
    if (!side) return;

    side.style.position = 'fixed';

    var old = document.querySelector('.pmd-sidebar-collapse-toggle');
    if (old) old.remove();

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

  function clickBehavior() {
    var menu = nav();
    if (!menu || menu.dataset.pmdCollapseV13 === '1') return;

    menu.dataset.pmdCollapseV13 = '1';

    menu.addEventListener('click', function (event) {
      var link = event.target.closest('a.nav-link[data-toggle="collapse"]');
      if (!link) return;

      if (isCollapsed()) {
        event.preventDefault();
        event.stopPropagation();

        setCollapsed(false);

        setTimeout(function () {
          link.click();
        }, 160);
      }
    }, true);
  }

  function init() {
    if (!isTheme()) return;

    installButton();
    addTitles();
    markProfileCard();
    clickBehavior();

    var saved = localStorage.getItem(STORAGE_KEY);

    /* Important: first install opens sidebar, so it never starts broken/empty. */
    if (saved === '1') {
      setCollapsed(true);
    } else {
      setCollapsed(false);
    }

    window.PMDSidebarCollapse = {
      collapse: function () { setCollapsed(true); },
      expand: function () { setCollapsed(false); },
      toggle: toggle,
      status: function () { return isCollapsed() ? 'collapsed' : 'expanded'; },
      reset: function () {
        localStorage.removeItem(STORAGE_KEY);
        setCollapsed(false);
      }
    };
  }

  function schedule() {
    [100, 500, 1200, 2400].forEach(function (delay) {
      setTimeout(init, delay);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', schedule, { once: true });
  } else {
    schedule();
  }
})();

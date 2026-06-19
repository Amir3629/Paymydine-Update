(function () {
  'use strict';

  var STORAGE_KEY = 'pmdAdminSidebarIconsOnlyV15';
  var CLASS_NAME = 'pmd-sidebar-icons-only';

  function body() {
    return document.body;
  }

  function sidebar() {
    return document.querySelector('.sidebar');
  }

  function nav() {
    return document.querySelector('#side-nav-menu');
  }

  function isTheme() {
    return body() && body().classList.contains('pmd-admin-theme-v1');
  }

  function isIconsOnly() {
    return body().classList.contains(CLASS_NAME);
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

  function forceShape() {
    var side = sidebar();
    if (!side || !isTheme()) return;

    var width = isIconsOnly() ? '82px' : '188px';

    side.style.setProperty('position', 'fixed', 'important');
    side.style.setProperty('left', '14px', 'important');
    side.style.setProperty('top', '14px', 'important');
    side.style.setProperty('width', width, 'important');
    side.style.setProperty('min-width', width, 'important');
    side.style.setProperty('max-width', width, 'important');
    side.style.setProperty('height', 'calc(100vh - 28px)', 'important');
    side.style.setProperty('min-height', 'calc(100vh - 28px)', 'important');
    side.style.setProperty('max-height', 'calc(100vh - 28px)', 'important');
    side.style.setProperty('display', 'flex', 'important');
    side.style.setProperty('flex-direction', 'column', 'important');
    side.style.setProperty('overflow', 'hidden', 'important');

    var menu = nav();
    if (menu) {
      menu.style.setProperty('display', 'block', 'important');
      menu.style.setProperty('visibility', 'visible', 'important');
      menu.style.setProperty('opacity', '1', 'important');
    }
  }

  function updateButton() {
    var btn = document.querySelector('.pmd-sidebar-icons-toggle');
    if (!btn) return;

    var closed = isIconsOnly();

    btn.innerHTML = closed
      ? '<i class="fa fa-angle-right" aria-hidden="true"></i>'
      : '<i class="fa fa-angle-left" aria-hidden="true"></i>';

    btn.setAttribute('title', closed ? 'Open sidebar' : 'Close sidebar');
    btn.setAttribute('aria-expanded', closed ? 'false' : 'true');
  }

  function setIconsOnly(value) {
    if (!isTheme()) return;

    body().classList.remove('pmd-sidebar-collapsed');
    body().classList.toggle(CLASS_NAME, !!value);

    localStorage.setItem(STORAGE_KEY, value ? '1' : '0');

    if (value) closeSubmenus();

    forceShape();
    updateButton();

    setTimeout(forceShape, 50);
    setTimeout(forceShape, 250);
    setTimeout(function () {
      window.dispatchEvent(new Event('resize'));
    }, 100);
  }

  function toggle() {
    setIconsOnly(!isIconsOnly());
  }

  function installButton() {
    var side = sidebar();
    if (!side) return;

    document.querySelectorAll('.pmd-sidebar-collapse-toggle, .pmd-sidebar-icons-toggle').forEach(function (el) {
      el.remove();
    });

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'pmd-sidebar-icons-toggle';
    btn.setAttribute('aria-label', 'Toggle sidebar');

    btn.addEventListener('click', function (event) {
      event.preventDefault();
      event.stopPropagation();
      toggle();
    });

    side.appendChild(btn);
    updateButton();
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

  function clickBehavior() {
    var menu = nav();
    if (!menu || menu.dataset.pmdIconsOnlyV15 === '1') return;

    menu.dataset.pmdIconsOnlyV15 = '1';

    menu.addEventListener('click', function (event) {
      var link = event.target.closest('a.nav-link[data-toggle="collapse"]');
      if (!link) return;

      if (isIconsOnly()) {
        event.preventDefault();
        event.stopPropagation();

        setIconsOnly(false);

        setTimeout(function () {
          link.click();
        }, 170);
      }
    }, true);
  }

  function init() {
    if (!isTheme()) return;

    localStorage.removeItem('pmdAdminSidebarCollapsed');
    localStorage.removeItem('pmdAdminSidebarCollapsedV13');
    localStorage.removeItem('pmdAdminSidebarCollapsedV14');
    body().classList.remove('pmd-sidebar-collapsed');

    installButton();
    addTitles();
    markProfileCard();
    clickBehavior();

    setIconsOnly(localStorage.getItem(STORAGE_KEY) === '1');

    window.PMDSidebarCollapse = {
      collapse: function () { setIconsOnly(true); },
      expand: function () { setIconsOnly(false); },
      toggle: toggle,
      status: function () { return isIconsOnly() ? 'icons-only' : 'expanded'; },
      reset: function () {
        localStorage.removeItem(STORAGE_KEY);
        setIconsOnly(false);
      },
      force: forceShape
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

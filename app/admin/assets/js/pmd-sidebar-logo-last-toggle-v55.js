(function () {
  'use strict';

  function ready(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  function sidebar() {
    return document.querySelector('.sidebar') ||
      document.querySelector('#sidebar') ||
      document.querySelector('.pmd-sidebar') ||
      document.querySelector('.pmd-admin-sidebar') ||
      document.querySelector('aside');
  }

  function menu() {
    return document.querySelector('#side-nav-menu') ||
      document.querySelector('.side-nav-menu') ||
      document.querySelector('.sidebar-menu') ||
      document.querySelector('.nav-sidebar');
  }

  function isCollapsed() {
    return (document.body||document.documentElement).classList.contains('pmd-sidebar-icons-only') ||
      (document.body||document.documentElement).classList.contains('pmd-sidebar-collapsed') ||
      (document.body||document.documentElement).classList.contains('sidebar-collapsed') ||
      (document.body||document.documentElement).classList.contains('sidebar-xs');
  }

  function logoItem() {
    var btn = document.querySelector('.pmd-logo-cycle-btn-v38');
    if (!btn) return null;
    return btn.closest('.pmd-logo-cycle-nav-item-v38, li, .nav-item') || btn.parentElement;
  }

  function firstRealNavItem() {
    var m = menu();
    if (!m) return null;
    var items = Array.prototype.slice.call(m.children || []);
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      if (it.classList.contains('pmd-logo-cycle-nav-item-v38')) continue;
      if ((it.textContent || '').trim().toUpperCase().indexOf('LOGO') === 0) continue;
      if (it.querySelector && it.querySelector('a,button')) return it;
    }
    return null;
  }

  function moveLogoButtonToEnd() {
    var m = menu();
    var li = logoItem();
    if (!m || !li) return;

    li.classList.add('pmd-logo-cycle-nav-item-v38');

    // Move LOGO switcher to very end of side menu, after System.
    if (li.parentElement !== m || li !== m.lastElementChild) {
      m.appendChild(li);
    }
  }

  function updateTogglePosition() {
    var s = sidebar();
    var first = firstRealNavItem();
    if (!s || !first) return;

    var sr = s.getBoundingClientRect();
    var fr = first.getBoundingClientRect();

    // Put the round arrow in the clean gap above Dashboard.
    var top = Math.round(fr.top - sr.top - (isCollapsed() ? 38 : 36));

    // Safety bounds so it never jumps to wrong place.
    top = Math.max(isCollapsed() ? 78 : 104, Math.min(top, isCollapsed() ? 140 : 168));

    s.style.setProperty('--pmd-sidebar-toggle-top-v55', top + 'px');

    var btn = s.querySelector('.pmd-sidebar-icons-toggle');
    if (btn) {
      var icon = btn.querySelector('i');
      if (icon) icon.className = 'fa ' + (isCollapsed() ? 'fa-angle-right' : 'fa-angle-left');
      btn.setAttribute('title', isCollapsed() ? 'Open sidebar' : 'Close sidebar');
      btn.setAttribute('aria-expanded', isCollapsed() ? 'false' : 'true');
    }
  }

  function apply() {
    moveLogoButtonToEnd();
    updateTogglePosition();
  }

  ready(function () {
    apply();
    [80, 220, 500, 900, 1600].forEach(function (ms) { setTimeout(apply, ms); });

    window.addEventListener('resize', updateTogglePosition, { passive: true });
    document.addEventListener('click', function () {
      setTimeout(apply, 80);
      setTimeout(apply, 240);
    }, true);

    window.PMDSidebarLogoLastToggleV55 = {
      apply: apply,
      moveLogoButtonToEnd: moveLogoButtonToEnd,
      updateTogglePosition: updateTogglePosition
    };
  });
})();

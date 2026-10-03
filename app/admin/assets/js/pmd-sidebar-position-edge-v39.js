(function () {
  'use strict';

  function ready(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  function menu() {
    return document.querySelector('#side-nav-menu')
      || document.querySelector('.side-nav-menu')
      || document.querySelector('.sidebar-menu')
      || document.querySelector('.nav-sidebar');
  }

  function sidebar() {
    var m = menu();
    if (m) {
      return m.closest('#sidebar, .sidebar, aside, .pmd-sidebar, .pmd-admin-sidebar')
        || m.parentElement;
    }
    return document.querySelector('#sidebar, .sidebar, aside, .pmd-sidebar, .pmd-admin-sidebar');
  }

  function moveToggleToEdge() {
    var side = sidebar();
    var btn = document.querySelector('.pmd-sidebar-icons-toggle');
    if (!side || !btn) return;

    // Remove label permanently from visual button.
    btn.querySelectorAll('.pmd-sidebar-toggle-label-v33, .pmd-sidebar-toggle-label-v39').forEach(function (el) {
      el.remove();
    });

    btn.classList.add('pmd-sidebar-edge-v39');
    btn.style.position = 'absolute';
    btn.setAttribute('title', btn.getAttribute('aria-expanded') === 'false' ? 'Open sidebar' : 'Close sidebar');

    // Ensure only one toggle exists.
    document.querySelectorAll('.pmd-sidebar-icons-toggle').forEach(function (other) {
      if (other !== btn) other.remove();
    });

    // Put button directly under sidebar container, not inside menu list.
    if (btn.parentElement !== side) {
      side.appendChild(btn);
    }

    // Remove empty old v33 menu slot if it exists.
    document.querySelectorAll('.pmd-sidebar-toggle-safe-slot-v33').forEach(function (slot) {
      if (!slot.querySelector('.pmd-sidebar-icons-toggle')) {
        slot.style.display = 'none';
        slot.style.height = '0';
      }
    });
  }

  function compactSidebarTop() {
    var side = sidebar();
    var m = menu();
    var slot = document.querySelector('.pmd-platform-logo-slot-v38') ||
               document.querySelector('.pmd-platform-logo-slot-v37') ||
               document.querySelector('.pmd-platform-logo-slot-v26');
    if (side) {
      side.style.position = 'relative';
      side.style.overflow = 'visible';
    }
    if (slot && m && slot.nextElementSibling !== m && slot.parentElement === m.parentElement) {
      m.parentElement.insertBefore(slot, m);
    }
  }

  function apply() {
    compactSidebarTop();
    moveToggleToEdge();
  }

  ready(function () {
    apply();

    // finite retries only, no observer/no freeze
    [100, 300, 700, 1200, 2200, 3600].forEach(function (ms) {
      setTimeout(apply, ms);
    });

    document.addEventListener('click', function (e) {
      if (e.target && e.target.closest && e.target.closest('.pmd-sidebar-icons-toggle')) {
        setTimeout(apply, 80);
      }
    }, true);

    window.PMDSidebarPositionV39 = {
      apply: apply
    };
  });
})();

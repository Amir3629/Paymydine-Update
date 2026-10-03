(function () {
  'use strict';

  function collapsed() {
    return !!(document.body && (document.body||document.documentElement).classList.contains('pmd-sidebar-icons-only'));
  }

  function apply() {
    var btn = document.querySelector('.pmd-sidebar-icons-toggle');
    if (!btn) return;

    btn.style.left = 'auto';
    btn.style.right = '-12px';
    btn.style.top = collapsed() ? '104px' : '148px';

    btn.style.width = '28px';
    btn.style.height = '42px';
    btn.style.minWidth = '28px';
    btn.style.minHeight = '42px';
    btn.style.maxWidth = '28px';
    btn.style.maxHeight = '42px';

    btn.style.borderRadius = '17px 0 0 17px';
    btn.style.borderRight = '0';
    btn.style.display = 'inline-flex';
    btn.style.alignItems = 'center';
    btn.style.justifyContent = 'center';
    btn.style.padding = '0';
    btn.style.margin = '0';
    btn.style.overflow = 'hidden';
    btn.style.zIndex = '2147483000';

    btn.setAttribute('title', collapsed() ? 'Open sidebar' : 'Close sidebar');
    btn.setAttribute('aria-expanded', collapsed() ? 'false' : 'true');

    var icon = btn.querySelector('i') || btn.querySelector('.fa');
    if (!icon) {
      icon = document.createElement('i');
      icon.setAttribute('aria-hidden', 'true');
      btn.appendChild(icon);
    }

    icon.className = 'fa ' + (collapsed() ? 'fa-angle-right' : 'fa-angle-left');
    icon.setAttribute('aria-hidden', 'true');

    icon.style.width = '14px';
    icon.style.height = '14px';
    icon.style.minWidth = '14px';
    icon.style.minHeight = '14px';
    icon.style.maxWidth = '14px';
    icon.style.maxHeight = '14px';
    icon.style.fontSize = '18px';
    icon.style.lineHeight = '14px';
    icon.style.margin = '0';
    icon.style.padding = '0';
    icon.style.display = 'inline-flex';
    icon.style.alignItems = 'center';
    icon.style.justifyContent = 'center';
    icon.style.transform = collapsed() ? 'translateX(-.5px) translateY(.5px)' : 'translateX(-1px) translateY(.5px)';

    document.querySelectorAll('.pmd-logo-cycle-nav-item-v38, .pmd-logo-cycle-btn-v38').forEach(function (el) {
      if (collapsed()) {
        el.style.display = 'none';
        el.style.visibility = 'hidden';
        el.style.opacity = '0';
        el.style.pointerEvents = 'none';
      } else {
        el.style.display = el.classList.contains('pmd-logo-cycle-nav-item-v38') ? 'flex' : 'inline-flex';
        el.style.visibility = 'visible';
        el.style.opacity = '1';
        el.style.pointerEvents = 'auto';
      }
    });
  }

  function ready(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn, { once: true });
    else fn();
  }

  ready(function () {
    apply();

    [40, 100, 220, 500, 900, 1600, 2400].forEach(function (ms) {
      setTimeout(apply, ms);
    });

    document.addEventListener('click', function (ev) {
      if (ev.target && ev.target.closest && ev.target.closest('.pmd-sidebar-icons-toggle')) {
        setTimeout(apply, 0);
        setTimeout(apply, 80);
        setTimeout(apply, 220);
        setTimeout(apply, 500);
      }
    }, true);

    try {
      var mo = new MutationObserver(apply);
      if (document.body) mo.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    } catch (e) {}

    window.PMDSidebarSmallToggleNotchV69 = { apply: apply };
  });
})();

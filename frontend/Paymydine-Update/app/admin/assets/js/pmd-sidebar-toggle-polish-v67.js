(function () {
  'use strict';

  function collapsed() {
    return document.body && (document.body||document.documentElement).classList.contains('pmd-sidebar-icons-only');
  }

  function apply() {
    var btn = document.querySelector('.pmd-sidebar-icons-toggle');
    if (!btn) return;

    btn.style.left = 'auto';
    btn.style.right = '-16px';
    btn.style.width = '32px';
    btn.style.height = '32px';
    btn.style.minWidth = '32px';
    btn.style.minHeight = '32px';
    btn.style.maxWidth = '32px';
    btn.style.maxHeight = '32px';
    btn.style.display = 'inline-flex';
    btn.style.alignItems = 'center';
    btn.style.justifyContent = 'center';
    btn.style.padding = '0';

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

    icon.style.width = '16px';
    icon.style.minWidth = '16px';
    icon.style.maxWidth = '16px';
    icon.style.height = '16px';
    icon.style.minHeight = '16px';
    icon.style.maxHeight = '16px';
    icon.style.fontSize = '18px';
    icon.style.lineHeight = '16px';
    icon.style.margin = '0';
    icon.style.padding = '0';
    icon.style.display = 'inline-flex';
    icon.style.alignItems = 'center';
    icon.style.justifyContent = 'center';
    icon.style.textAlign = 'center';
    icon.style.transform = 'translateY(.5px)';
  }

  function ready(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn, { once: true });
    else fn();
  }

  ready(function () {
    apply();

    [80, 200, 500, 1000].forEach(function (ms) {
      setTimeout(apply, ms);
    });

    document.addEventListener('click', function (ev) {
      if (ev.target && ev.target.closest && ev.target.closest('.pmd-sidebar-icons-toggle')) {
        setTimeout(apply, 0);
        setTimeout(apply, 80);
        setTimeout(apply, 220);
      }
    }, true);

    try {
      var mo = new MutationObserver(apply);
      if (document.body) mo.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    } catch (e) {}

    window.PMDSidebarTogglePolishV67 = { apply: apply };
  });
})();

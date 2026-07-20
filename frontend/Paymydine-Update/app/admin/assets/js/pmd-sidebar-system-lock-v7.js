(function () {
  'use strict';

  function fixSidebarParents() {
    var menu = document.querySelector('#side-nav-menu');
    if (!menu) return;

    menu.querySelectorAll(':scope > .nav-item').forEach(function (item) {
      var link = item.querySelector(':scope > a.nav-link[data-toggle="collapse"]');
      if (!link) return;

      // Legacy scripts may add active to parent groups after click.
      // Parent groups should be "open", not "active".
      if (item.classList.contains('active')) {
        item.classList.remove('active');
        item.classList.add('open');
      }

      item.style.left = '0';
      item.style.marginLeft = '0';
      item.style.transform = 'none';
      item.style.width = '100%';

      link.style.left = '0';
      link.style.marginLeft = '0';
      link.style.transform = 'none';
      link.style.width = '100%';

      var target = link.getAttribute('data-target');
      var collapse = target ? document.querySelector(target) : null;

      if (collapse) {
        collapse.style.left = '0';
        collapse.style.marginLeft = '0';
        collapse.style.transform = 'none';
        collapse.style.width = '100%';
      }
    });
  }

  function scheduleFix() {
    fixSidebarParents();
    setTimeout(fixSidebarParents, 50);
    setTimeout(fixSidebarParents, 150);
    setTimeout(fixSidebarParents, 350);
    setTimeout(fixSidebarParents, 800);
  }

  document.addEventListener('DOMContentLoaded', scheduleFix);
  document.addEventListener('click', function (event) {
    if (event.target.closest('#side-nav-menu a.nav-link[data-toggle="collapse"]')) {
      scheduleFix();
    }
  }, true);

  document.addEventListener('shown.bs.collapse', scheduleFix);
  document.addEventListener('show.bs.collapse', scheduleFix);
  document.addEventListener('hidden.bs.collapse', scheduleFix);
  document.addEventListener('hide.bs.collapse', scheduleFix);

  var menu = document.querySelector('#side-nav-menu');
  if (menu) {
    new MutationObserver(scheduleFix).observe(menu, {
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style', 'aria-expanded']
    });
  }

  scheduleFix();
})();

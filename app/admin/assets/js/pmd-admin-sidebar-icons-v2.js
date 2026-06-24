(function () {
  'use strict';

  function ready(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn, { once: true });
    } else {
      fn();
    }
  }

  function normalizeLabel(value) {
    return String(value || '')
      .replace(/[⚡🔥✨⭐️⭐★☆]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function key(value) {
    return normalizeLabel(value).toLowerCase();
  }

  var exactIconMap = {
    'dashboard': 'fa-home',
    'restaurant': 'fa-cutlery',
    'sales': 'fa-shopping-cart',
    'marketing': 'fa-bullhorn',
    'design': 'fa-paint-brush',
    'localisation': 'fa-globe',
    'localization': 'fa-globe',
    'tools': 'fa-wrench',
    'quick mode': 'fa-bolt',
    'system': 'fa-cog',

    'languages': 'fa-language',
    'currencies': 'fa-money',
    'countries': 'fa-map-marker',

    'manage kds': 'fa-desktop',
    'kitchen display stations': 'fa-television',
    'media manager': 'fa-picture-o',
    'main kitchen': 'fa-fire',
    'customer reviews': 'fa-comments',

    'orders': 'fa-shopping-cart',
    'tables': 'fa-th-large',
    'reservations': 'fa-calendar-check-o',
    'menu': 'fa-book',
    'payments': 'fa-credit-card',
    'customers': 'fa-users',
    'staff': 'fa-user-circle',
    'reports': 'fa-line-chart',
    'promotions': 'fa-tags',
    'settings': 'fa-cog'
  };

  function fallbackIcon(label) {
    var t = key(label);

    if (t.indexOf('dashboard') !== -1) return 'fa-home';
    if (t.indexOf('restaurant') !== -1) return 'fa-cutlery';
    if (t.indexOf('sale') !== -1 || t.indexOf('order') !== -1) return 'fa-shopping-cart';
    if (t.indexOf('marketing') !== -1 || t.indexOf('promotion') !== -1 || t.indexOf('coupon') !== -1) return 'fa-bullhorn';
    if (t.indexOf('design') !== -1 || t.indexOf('theme') !== -1) return 'fa-paint-brush';
    if (t.indexOf('localisation') !== -1 || t.indexOf('localization') !== -1 || t.indexOf('language') !== -1) return 'fa-globe';
    if (t.indexOf('currency') !== -1) return 'fa-money';
    if (t.indexOf('country') !== -1) return 'fa-map-marker';
    if (t.indexOf('tool') !== -1) return 'fa-wrench';
    if (t.indexOf('quick') !== -1 || t.indexOf('mode') !== -1) return 'fa-bolt';
    if (t.indexOf('system') !== -1 || t.indexOf('setting') !== -1) return 'fa-cog';

    if (t.indexOf('kds') !== -1) return 'fa-desktop';
    if (t.indexOf('kitchen display') !== -1) return 'fa-television';
    if (t.indexOf('media') !== -1) return 'fa-picture-o';
    if (t.indexOf('main kitchen') !== -1 || t.indexOf('kitchen') !== -1) return 'fa-fire';
    if (t.indexOf('review') !== -1) return 'fa-comments';
    if (t.indexOf('table') !== -1 || t.indexOf('floor') !== -1) return 'fa-th-large';
    if (t.indexOf('reservation') !== -1 || t.indexOf('booking') !== -1) return 'fa-calendar-check-o';
    if (t.indexOf('menu') !== -1 || t.indexOf('food') !== -1 || t.indexOf('category') !== -1) return 'fa-book';
    if (t.indexOf('payment') !== -1 || t.indexOf('invoice') !== -1 || t.indexOf('cash') !== -1) return 'fa-credit-card';
    if (t.indexOf('customer') !== -1) return 'fa-users';
    if (t.indexOf('staff') !== -1 || t.indexOf('user') !== -1) return 'fa-user-circle';
    if (t.indexOf('report') !== -1 || t.indexOf('analytic') !== -1) return 'fa-line-chart';

    return 'fa-circle-o';
  }

  function getDirectLabel(link) {
    var content = link.querySelector(':scope > .content');
    if (content) return normalizeLabel(content.textContent);

    var clone = link.cloneNode(true);
    clone.querySelectorAll('i, svg, .fa, .caret').forEach(function (node) {
      node.remove();
    });

    return normalizeLabel(clone.textContent);
  }

  function rebuildLink(link) {
    var label = getDirectLabel(link);
    if (!label) return;

    /* remove all previous direct FA icons to avoid duplicate/repeated icons */
    Array.prototype.slice.call(link.children).forEach(function (child) {
      if (child.matches && child.matches('i.fa')) {
        child.remove();
      }
    });

    /* remove direct text nodes / old unwrapped labels */
    Array.prototype.slice.call(link.childNodes).forEach(function (node) {
      if (node.nodeType === 3 && normalizeLabel(node.nodeValue)) {
        node.nodeValue = '';
      }
    });

    var content = link.querySelector(':scope > .content');
    if (!content) {
      content = document.createElement('span');
      content.className = 'content';
      link.appendChild(content);
    }

    content.textContent = label;

    var iconClass = exactIconMap[key(label)] || fallbackIcon(label);
    var icon = document.createElement('i');
    icon.className = 'fa ' + iconClass + ' fa-fw';
    icon.setAttribute('aria-hidden', 'true');

    link.insertBefore(icon, content);
  }

  function applySidebarIcons() {
    if (!document.body || !(document.body||document.documentElement).classList.contains('pmd-admin-theme-v1')) return;

    var links = document.querySelectorAll('#side-nav-menu a.nav-link');
    links.forEach(rebuildLink);
  }

  ready(function () {
    applySidebarIcons();
    setTimeout(applySidebarIcons, 150);
    setTimeout(applySidebarIcons, 500);
    setTimeout(applySidebarIcons, 1200);
  });
})();

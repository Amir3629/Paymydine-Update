(function () {
  'use strict';

  function ready(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn, { once: true });
    } else {
      fn();
    }
  }

  function clean(value) {
    return String(value || '')
      .replace(/[⚡🔥✨⭐️⭐★☆]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function key(value) {
    return clean(value).toLowerCase();
  }

  var icons = {
    'dashboard': 'fa-home',
    'restaurant': 'fa-cutlery',
    'sales': 'fa-shopping-cart',
    'orders': 'fa-shopping-cart',
    'coupons & gift cards': 'fa-gift',
    'coupons': 'fa-gift',
    'gift cards': 'fa-gift',
    'marketing': 'fa-bullhorn',
    'design': 'fa-paint-brush',
    'localisation': 'fa-globe',
    'localization': 'fa-globe',
    'languages': 'fa-language',
    'currencies': 'fa-money',
    'countries': 'fa-map-marker',
    'tools': 'fa-wrench',
    'manage kds': 'fa-desktop',
    'kitchen display stations': 'fa-television',
    'media manager': 'fa-picture-o',
    'main kitchen': 'fa-fire',
    'customer reviews': 'fa-comments',
    'quick mode': 'fa-bolt',
    'system': 'fa-cog',
    'settings': 'fa-cog',
    'tables': 'fa-th-large',
    'reservations': 'fa-calendar-check-o',
    'menu': 'fa-book',
    'payments': 'fa-credit-card',
    'customers': 'fa-users',
    'staff': 'fa-user-circle',
    'reports': 'fa-line-chart',
    'promotions': 'fa-tags'
  };

  function getLabel(link) {
    var content = link.querySelector(':scope > .content');
    if (content) return clean(content.textContent);

    var clone = link.cloneNode(true);
    clone.querySelectorAll('i, svg, .fa, .caret').forEach(function (node) {
      node.remove();
    });
    return clean(clone.textContent);
  }

  function pickIcon(label) {
    var k = key(label);
    if (icons[k]) return icons[k];

    if (k.indexOf('coupon') !== -1 || k.indexOf('gift') !== -1) return 'fa-gift';
    if (k.indexOf('dashboard') !== -1) return 'fa-home';
    if (k.indexOf('restaurant') !== -1) return 'fa-cutlery';
    if (k.indexOf('sale') !== -1 || k.indexOf('order') !== -1) return 'fa-shopping-cart';
    if (k.indexOf('marketing') !== -1 || k.indexOf('promotion') !== -1) return 'fa-bullhorn';
    if (k.indexOf('design') !== -1) return 'fa-paint-brush';
    if (k.indexOf('local') !== -1 || k.indexOf('language') !== -1) return 'fa-globe';
    if (k.indexOf('currency') !== -1) return 'fa-money';
    if (k.indexOf('country') !== -1) return 'fa-map-marker';
    if (k.indexOf('tool') !== -1) return 'fa-wrench';
    if (k.indexOf('kds') !== -1) return 'fa-desktop';
    if (k.indexOf('kitchen display') !== -1) return 'fa-television';
    if (k.indexOf('media') !== -1) return 'fa-picture-o';
    if (k.indexOf('kitchen') !== -1) return 'fa-fire';
    if (k.indexOf('review') !== -1) return 'fa-comments';
    if (k.indexOf('quick') !== -1) return 'fa-bolt';
    if (k.indexOf('system') !== -1 || k.indexOf('setting') !== -1) return 'fa-cog';

    return 'fa-circle-o';
  }

  function rebuildLink(link) {
    var label = getLabel(link);
    if (!label) return;

    Array.prototype.slice.call(link.children).forEach(function (child) {
      if (child.matches && (child.matches('i.fa') || child.matches('.caret'))) {
        child.remove();
      }
    });

    Array.prototype.slice.call(link.childNodes).forEach(function (node) {
      if (node.nodeType === 3 && clean(node.nodeValue)) {
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

    var icon = document.createElement('i');
    icon.className = 'fa ' + pickIcon(label) + ' fa-fw';
    icon.setAttribute('aria-hidden', 'true');

    link.insertBefore(icon, content);
  }

  function findDirectNavItemByLabel(label) {
    var wanted = key(label);
    var items = document.querySelectorAll('#side-nav-menu .nav-item');

    for (var i = 0; i < items.length; i++) {
      var link = items[i].querySelector(':scope > a.nav-link');
      if (!link) continue;
      if (key(getLabel(link)) === wanted) return items[i];
    }

    return null;
  }

  function findCouponItem() {
    var items = document.querySelectorAll('#side-nav-menu .nav-item');

    for (var i = 0; i < items.length; i++) {
      var link = items[i].querySelector(':scope > a.nav-link');
      if (!link) continue;

      var label = key(getLabel(link));
      if (label.indexOf('coupon') !== -1 || label.indexOf('gift') !== -1) {
        return items[i];
      }
    }

    return null;
  }

  function getOrCreateSalesSubmenu(salesItem) {
    var existing =
      salesItem.querySelector(':scope > ul.nav') ||
      salesItem.querySelector(':scope > div.collapse > ul.nav') ||
      salesItem.querySelector(':scope > .collapse > ul.nav');

    if (existing) return existing;

    var ul = document.createElement('ul');
    ul.className = 'nav pmd-sales-submenu';
    salesItem.appendChild(ul);
    return ul;
  }

  function moveCouponsUnderSales() {
    var salesItem = findDirectNavItemByLabel('Sales');
    var couponItem = findCouponItem();

    if (!salesItem || !couponItem || couponItem === salesItem) return;

    if (salesItem.contains(couponItem)) return;

    var salesMenu = getOrCreateSalesSubmenu(salesItem);
    salesMenu.appendChild(couponItem);

    var salesLink = salesItem.querySelector(':scope > a.nav-link');
    if (salesLink) {
      salesLink.classList.add('pmd-has-ui-children');
    }
  }

  function fixSidebar() {
    if (!document.body || !(document.body||document.documentElement).classList.contains('pmd-admin-theme-v1')) return;

    document.querySelectorAll('#side-nav-menu a.nav-link').forEach(rebuildLink);
    moveCouponsUnderSales();
    document.querySelectorAll('#side-nav-menu a.nav-link').forEach(rebuildLink);
  }

  ready(function () {
    fixSidebar();
    setTimeout(fixSidebar, 150);
    setTimeout(fixSidebar, 600);
    setTimeout(fixSidebar, 1400);
  });
})();

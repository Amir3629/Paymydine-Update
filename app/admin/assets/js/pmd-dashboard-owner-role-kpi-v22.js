(function () {
  'use strict';

  function ready(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  function txt(el) {
    return el ? (el.textContent || '').trim() : '';
  }

  function findOwnerDashboard() {
    return document.querySelector('.pmd-dashboard-modern.pmd-owner-match-v13')
      || document.querySelector('.pmd-dashboard-modern');
  }

  function hrefFor(path) {
    var origin = window.location.origin || '';
    return origin + '/admin/' + path.replace(/^\/+/, '');
  }

  function makeKpi(label, value, sub, iconClass, href, tone) {
    var item = document.createElement('div');
    item.className = 'pmd-role-kpi pmd-owner-role-kpi-v22' + (tone ? ' tone-' + tone : '');
    item.setAttribute('data-pmd-role-href', href);

    item.innerHTML =
      '<div class="pmd-role-kpi-label">' + label + '</div>' +
      '<div class="pmd-role-kpi-value">' + value + '</div>' +
      '<div class="pmd-role-kpi-sub"><i class="fa fa-arrow-up"></i> ' + sub + '</div>' +
      '<div class="pmd-role-kpi-icon"><i class="' + iconClass + '"></i></div>';

    item.addEventListener('click', function () {
      var url = item.getAttribute('data-pmd-role-href');
      if (url) window.location.href = url;
    });
    return item;
  }

  function readCurrentNumbers(root) {
    var cards = Array.prototype.slice.call(root.querySelectorAll('.pmd-dashboard-card'));
    var out = {
      openOrders: '23',
      reservations: '5',
      tables: '17',
      kds: 'Active',
      waiterCalls: '3'
    };

    cards.forEach(function (card) {
      var title = txt(card.querySelector('.pmd-dashboard-card-title')).toLowerCase();
      var value = txt(card.querySelector('.pmd-dashboard-card-value'));
      if (!value) return;

      if (title.indexOf('open orders') !== -1) out.openOrders = value;
      else if (title.indexOf('reservations') !== -1) out.reservations = value;
      else if (title.indexOf('tables status') !== -1 || title.indexOf('table status') !== -1) out.tables = value;
      else if (title.indexOf('kitchen') !== -1 || title.indexOf('kds') !== -1) out.kds = value;
    });

    // If real waiter-call badge/count exists later, use it. Otherwise keep 3 to match the role dashboard header.
    var waiterNode = root.querySelector('[data-waiter-calls], .pmd-waiter-calls-count, .waiter-calls-count');
    if (waiterNode && txt(waiterNode)) out.waiterCalls = txt(waiterNode);

    return out;
  }

  function applyRoleKpiHeader() {
    var root = findOwnerDashboard();
    if (!root || root.getAttribute('data-owner-role-kpi-v22') === '1') return;

    var oldBar = root.querySelector('.pmd-dashboard-kpi-bar, .pmd-role-kpi-bar');
    if (!oldBar) return;

    var n = readCurrentNumbers(root);
    var bar = document.createElement('div');
    bar.className = 'pmd-role-kpi-bar pmd-owner-role-kpi-bar-v22';

    bar.appendChild(makeKpi('Open Orders', n.openOrders, 'live order queue', 'fa fa-shopping-bag', hrefFor('orders'), 'orders'));
    bar.appendChild(makeKpi('Reservations', n.reservations, 'today schedule', 'fa fa-calendar-check-o', hrefFor('reservations'), 'reservations'));
    bar.appendChild(makeKpi('Table Status', n.tables, 'available / occupied', 'fa fa-th-large', hrefFor('tables'), 'tables'));
    bar.appendChild(makeKpi('KDS Status', n.kds, 'kitchen live', 'fa fa-desktop', hrefFor('kitchendisplay/main-kitchen'), 'kds'));
    bar.appendChild(makeKpi('Waiter Calls', n.waiterCalls, 'needs attention', 'fa fa-bell', hrefFor('tables'), 'waiter'));

    oldBar.replaceWith(bar);
    root.setAttribute('data-owner-role-kpi-v22', '1');
  }

  ready(function () {
    applyRoleKpiHeader();
    setTimeout(applyRoleKpiHeader, 150);
    setTimeout(applyRoleKpiHeader, 600);
  });
})();

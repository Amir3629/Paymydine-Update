(function () {
  'use strict';

  function norm(text) {
    return String(text || '').replace(/\s+/g, ' ').trim().toLowerCase();
  }

  function configureCard(card, action, href) {
    card.setAttribute('data-pmd-w3-action', action);
    card.setAttribute('href', href);
    card.setAttribute('data-pmd-w3-href', href);
  }

  function applyQuickIcons() {
    var root = document.querySelector('.pmd-dashboard-modern[data-pmd-role="waiter3"]');
    if (!root) return;

    root.querySelectorAll('.pmd-w3-quick-card').forEach(function (card) {
      var text = norm(card.textContent);

      if (text.indexOf('new order') !== -1) configureCard(card, 'new-order', '/admin/quick-mode?preview=pmdquick2026');
      else if (text.indexOf('open orders') !== -1) configureCard(card, 'orders', '/admin/orders');
      else if (text.indexOf('tables') !== -1) configureCard(card, 'tables', '/admin/tables');
      else if (text.indexOf('kds') !== -1) configureCard(card, 'kds', '/admin/kitchendisplay/main-kitchen');
      else if (text.indexOf('payments') !== -1) configureCard(card, 'payments', '/admin/payments');
      else if (text.indexOf('reservations') !== -1) configureCard(card, 'reservations', '/admin/reservations');
    });
  }

  document.addEventListener('click', function (event) {
    var card = event.target.closest('.pmd-w3-quick-card[data-pmd-w3-href]');
    if (!card) return;

    var href = card.getAttribute('data-pmd-w3-href');
    if (href && href !== '#') {
      event.preventDefault();
      window.location.href = href;
    }
  }, true);

  function schedule() {
    [200, 700, 1400, 2600, 4200].forEach(function (delay) {
      setTimeout(applyQuickIcons, delay);
    });
  }

  document.addEventListener('pmd:dashboard-real-data-v3', schedule);
  document.addEventListener('pmd:dashboard-real-data-v2', schedule);
  document.addEventListener('pmd:dashboard-real-data', schedule);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', schedule, { once: true });
  } else {
    schedule();
  }

  window.PMDW3QuickIcons = {
    refresh: applyQuickIcons
  };
})();

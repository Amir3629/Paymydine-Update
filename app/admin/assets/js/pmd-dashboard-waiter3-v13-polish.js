(function () {
  'use strict';

  function byText(selector, text) {
    return Array.from(document.querySelectorAll(selector)).filter(function (el) {
      return (el.textContent || '').toLowerCase().indexOf(text.toLowerCase()) !== -1;
    });
  }

  function setHref(selector, text, href) {
    byText(selector, text).forEach(function (el) {
      if (el.tagName === 'A') el.setAttribute('href', href);
      else el.setAttribute('data-pmd-w3-href', href);
    });
  }

  function polishW3() {
    var root = document.querySelector('.pmd-dashboard-modern[data-pmd-role="waiter3"]');
    if (!root) return;

    setHref('.pmd-w3-quick-card', 'New Order', '/admin/quick-mode?preview=pmdquick2026');
    setHref('.pmd-w3-quick-card', 'Open Orders', '/admin/orders');
    setHref('.pmd-w3-quick-card', 'Tables', '/admin/tables');
    setHref('.pmd-w3-quick-card', 'KDS', '/admin/kitchendisplay');
    setHref('.pmd-w3-quick-card', 'Payments', '/admin/payments');
    setHref('.pmd-w3-quick-card', 'Reservations', '/admin/reservations');

    setHref('.pmd-w3-pill', 'Open Quick Mode', '/admin/quick-mode?preview=pmdquick2026');
    setHref('.pmd-w3-pill', 'Admin Panel', '/admin/dashboard');

    setHref('.pmd-w3-signal', 'Orders', '/admin/orders');
    setHref('.pmd-w3-signal', 'Reservations', '/admin/reservations');
    setHref('.pmd-w3-signal', 'Waiter Calls', '/admin/notifications');
    setHref('.pmd-w3-signal', 'Table Notes', '/admin/notifications');
    setHref('.pmd-w3-signal', 'Payments Due', '/admin/payments');
    setHref('.pmd-w3-signal', 'Kitchen Ready', '/admin/kitchendisplay');
  }

  document.addEventListener('click', function (event) {
    var card = event.target.closest('[data-pmd-w3-href]');
    if (!card || event.target.closest('a')) return;

    var href = card.getAttribute('data-pmd-w3-href');
    if (href && href !== '#') {
      window.location.href = href;
    }
  }, true);

  function schedule() {
    [300, 900, 1800, 3200, 5200].forEach(function (delay) {
      setTimeout(polishW3, delay);
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
})();

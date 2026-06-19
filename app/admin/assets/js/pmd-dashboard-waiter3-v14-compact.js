(function () {
  'use strict';

  function cleanW3Text() {
    var root = document.querySelector('.pmd-dashboard-modern[data-pmd-role="waiter3"]');
    if (!root) return;

    var cards = Array.from(root.querySelectorAll('.pmd-w3-signal'));

    cards.forEach(function (card) {
      var label = (card.querySelector('.pmd-w3-signal-label')?.textContent || '').trim().toLowerCase();
      var sub = card.querySelector('.pmd-w3-signal-sub');

      if (!sub) return;

      if (label === 'orders') sub.textContent = 'service orders';
      if (label === 'reservations') sub.textContent = 'today / upcoming';
      if (label === 'waiter calls') sub.textContent = 'guest alerts';
      if (label === 'table notes') sub.textContent = 'allergies / notes';
      if (label === 'payments due') sub.textContent = 'unpaid bills';
      if (label === 'kitchen ready') sub.textContent = 'ready / preparing';
    });
  }

  function schedule() {
    [200, 700, 1400, 2600, 4200].forEach(function (delay) {
      setTimeout(cleanW3Text, delay);
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

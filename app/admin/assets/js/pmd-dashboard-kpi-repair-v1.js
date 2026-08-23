/* PMD_DASHBOARD_KPI_REPAIR_V1 */
(function () {
  'use strict';

  var path = String(window.location.pathname || '').replace(/\/+$/, '');
  if (path !== '/admin/dashboardlab') return;

  var dataNode = document.getElementById('pmd-dashboard-lab-kpi-data');
  if (!dataNode) return;

  function text(value) {
    return String(value == null ? '' : value);
  }

  function formattedValue(key, value) {
    if (key === 'guests') return String(Math.max(0, Number(value || 0)));
    var number = Number(value || 0);
    return (Number.isFinite(number) ? number : 0) + ' min';
  }

  function apply(payload) {
    if (!payload || payload.ok !== true || !payload.cards) return false;

    var cards = {};
    try {
      cards = JSON.parse(dataNode.textContent || '{}') || {};
    } catch (error) {
      cards = {};
    }

    ['guests', 'turnover', 'kitchen'].forEach(function (key) {
      var repair = payload.cards[key];
      if (!repair || repair.connected !== true || !cards[key]) return;

      cards[key].value = formattedValue(key, repair.value);
      cards[key].description = text(repair.description);
      cards[key].source = text(repair.source);
      cards[key].connected = true;
      cards[key].period = 'today';
      cards[key].pmdRepairVersion = payload.version || '1.0.0';
      cards[key].sampleCount = Number(repair.sample_count || 0);
    });

    dataNode.textContent = JSON.stringify(cards);

    if (
      window.PMDDashboardLabKpisV1 &&
      typeof window.PMDDashboardLabKpisV1.applyLivePayload === 'function'
    ) {
      window.PMDDashboardLabKpisV1.applyLivePayload({kpis: cards});
      return true;
    }

    Object.keys(cards).forEach(function (key) {
      var card = document.querySelector('[data-pmd-dashboard2-kpi="' + key + '"]');
      if (!card) return;
      var data = cards[key];
      var value = card.querySelector('.pmd-r2-kpi-v2401-value');
      var description = card.querySelector('.pmd-r2-kpi-v2401-description');
      if (value) value.textContent = text(data.value || '0');
      if (description) description.textContent = text(data.description);
      card.setAttribute('data-pmd-connected', 'true');
      card.title = text(data.source);
    });

    return true;
  }

  fetch('/admin/pmd-dashboard-kpi-repair-v1-data?_=' + Date.now(), {
    credentials: 'same-origin',
    cache: 'no-store',
    headers: {
      Accept: 'application/json',
      'X-Requested-With': 'XMLHttpRequest'
    }
  })
    .then(function (response) {
      if (!response.ok) throw new Error('HTTP ' + response.status);
      return response.json();
    })
    .then(apply)
    .catch(function (error) {
      console.warn('[PMD Dashboard KPI Repair] skipped:', error && error.message ? error.message : error);
    });
})();

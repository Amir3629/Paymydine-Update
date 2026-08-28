(function () {
  'use strict';

  var path = String(window.location.pathname || '').toLowerCase().replace(/\/+$/, '');
  function one(selector, root) { return (root || document).querySelector(selector); }
  function all(selector, root) { return Array.prototype.slice.call((root || document).querySelectorAll(selector)); }
  function text(value) { return String(value == null ? '' : value); }
  function escapeHtml(value) { return text(value).replace(/[&<>"']/g, function (c) { return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'})[c]; }); }

  function prepLabel(minutes) {
    var value = Math.max(0, Math.round(Number(minutes) || 0));
    if (!value) return '';
    if (value === 10) return '5–10 min';
    if (value === 20) return '10–20 min';
    if (value === 30) return '20–30 min';
    if (value === 45) return '30–45 min';
    return '~' + value + ' min';
  }
  window.PMDPrepTimeLabel = prepLabel;

  function renderTodayTeam() {
    var boot = window.PMDKitchenOperationsR1;
    if (!boot || !boot.today || one('[data-pmd-kitchen-today-card-v1]')) return;
    var host = one('.content-wrapper .content') || one('.content') || one('main') || one('.content-wrapper');
    if (!host) return;
    var today = boot.today;
    var actual = today.actual_count;
    var expected = today.expected_count;
    var countLabel = actual != null
      ? String(actual) + (expected != null ? '/' + String(expected) : '')
      : (expected != null ? String(expected) + ' planned' : 'Not confirmed');
    var people = (today.people || []).slice(0, 6).map(function (person) {
      return '<span>' + escapeHtml(person.name) + (person.job_role ? ' · ' + escapeHtml(person.job_role) : '') + '</span>';
    }).join('');
    var title = today.confirmed ? 'Kitchen team today' : 'Who is in the kitchen today?';
    var message = today.confirmed
      ? countLabel + ' · confirmed for this shift'
      : (today.has_plan ? 'Your shift is planned. Confirm who is actually here so PMD can improve ETA.' : 'No shift plan yet. A quick team count is enough — ordering will never be blocked.');

    var card = document.createElement('section');
    card.className = 'pmd-kitchen-today-card-v1 ' + (today.confirmed ? 'is-confirmed' : 'needs-confirmation');
    card.setAttribute('data-pmd-kitchen-today-card-v1', '');
    card.innerHTML = '<div class="pmd-kitchen-today-card-v1__copy"><small>Kitchen operations</small><strong>' + escapeHtml(title) + '</strong><p>' + escapeHtml(message) + '</p>' + (people ? '<div class="pmd-kitchen-today-card-v1__people">' + people + '</div>' : '') + '</div>'
      + '<a href="' + escapeHtml(boot.shifts_url || '/admin/shifts') + '#today-team">' + (today.confirmed ? 'Manage shifts' : 'Confirm team') + '</a>';
    host.insertBefore(card, host.firstChild);
  }

  function syncPrepControl(input) {
    if (!input || input.dataset.pmdPrepEnhanced !== '1') return;
    var root = input.closest('.pmd-prep-field-v1');
    if (!root) return;
    var value = Math.round(Number(input.value) || 0);
    all('[data-pmd-prep-value]', root).forEach(function (button) {
      button.classList.toggle('is-active', Number(button.getAttribute('data-pmd-prep-value')) === value);
    });
    var custom = [10, 20, 30, 45].indexOf(value) === -1;
    root.classList.toggle('is-custom', custom);
    var customButton = one('[data-pmd-prep-custom]', root);
    if (customButton) customButton.classList.toggle('is-active', custom);
  }

  function enhancePrepInput(input) {
    if (!input || input.dataset.pmdPrepEnhanced === '1') { syncPrepControl(input); return; }
    var label = input.closest('label');
    if (!label) return;
    input.dataset.pmdPrepEnhanced = '1';
    label.classList.add('pmd-prep-field-v1');

    var menuId = one('[data-pmd-menu-id]', input.form || document);
    if (menuId && !String(menuId.value || '').trim() && Number(input.value || 0) === 15) input.value = '20';

    var panel = document.createElement('div');
    panel.className = 'pmd-prep-presets-v1';
    panel.setAttribute('role', 'group');
    panel.setAttribute('aria-label', 'Preparation time');
    panel.innerHTML = [
      [10, '5–10'], [20, '10–20'], [30, '20–30'], [45, '30–45']
    ].map(function (row) {
      return '<button type="button" data-pmd-prep-value="' + row[0] + '"><span aria-hidden="true">◷</span>' + row[1] + ' min</button>';
    }).join('') + '<button type="button" data-pmd-prep-custom>Custom</button>';
    label.insertBefore(panel, input);

    panel.addEventListener('click', function (event) {
      var preset = event.target.closest('[data-pmd-prep-value]');
      var customButton = event.target.closest('[data-pmd-prep-custom]');
      if (preset) {
        input.value = preset.getAttribute('data-pmd-prep-value');
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        syncPrepControl(input);
      } else if (customButton) {
        label.classList.add('is-custom');
        all('[data-pmd-prep-value]', label).forEach(function (button) { button.classList.remove('is-active'); });
        customButton.classList.add('is-active');
        input.focus();
      }
    });
    input.addEventListener('input', function () { syncPrepControl(input); });
    syncPrepControl(input);
  }

  function enhanceMenuPrep() {
    all('[data-pmd-menu-prep-time]').forEach(enhancePrepInput);
  }

  function retireLegacySmartEta() {
    if (one('[data-pmd-simple-eta-link-v1]')) return;
    var heading = all('h2,h3').find(function (node) { return text(node.textContent).toLowerCase().indexOf('smart eta') !== -1; });
    if (!heading) return;
    var section = heading.closest('.pmd-owner-card__section') || heading.parentElement;
    if (!section) return;
    // Compatibility-only visual retirement. Inputs stay enabled in the DOM so
    // saving Advanced preserves their existing values; the new simple surface
    // is the only normal Owner UI for ETA changes.
    section.classList.add('pmd-legacy-smart-eta-v1');
    var link = document.createElement('div');
    link.className = 'pmd-simple-eta-link-v1';
    link.setAttribute('data-pmd-simple-eta-link-v1', '');
    link.innerHTML = '<strong>Preparation & ETA is now simple</strong><p>Food prep, kitchen load, confirmed team and real KDS pace are handled automatically.</p><a href="/admin/shifts#pmd-kitchen-eta">Open Preparation & ETA</a>';
    section.parentNode.insertBefore(link, section);
  }

  function normalizePrepText() {
    all('.pmd-coc-food__facts span, .pmd-pos-product__facts').forEach(function (node) {
      var raw = text(node.textContent);
      var next = raw.replace(/\b(10|20|30|45)\s*min\b/g, function (_, value) { return prepLabel(Number(value)); });
      if (next !== raw) node.textContent = next;
    });
  }

  function etaText(state) {
    if (!state || !state.kitchen_released) return '';
    if (state.phase === 'ready') return 'Ready';
    if (state.phase === 'cancelled') return '';
    if (state.taking_longer) return 'Taking longer than expected · still preparing';
    var remaining = state.remaining_minutes;
    var prefix = state.phase === 'preparing' ? 'Preparing' : 'Kitchen ETA';
    var result = prefix + (remaining == null ? '' : ' · about ' + String(Math.max(0, Number(remaining) || 0)) + ' min');
    if (Number(state.eta_extension_count || 0) > 0) result += ' · adjusted';
    return result;
  }

  async function readEta(ids) {
    ids = Array.from(new Set((ids || []).map(function (id) { return Number(id) || 0; }).filter(Boolean))).slice(0, 50);
    if (!ids.length) return {};
    try {
      var response = await fetch('/api/v1/pmd-kitchen/eta?order_ids=' + encodeURIComponent(ids.join(',')), { credentials: 'same-origin', headers: { Accept: 'application/json' }, cache: 'no-store' });
      if (!response.ok) return {};
      var json = await response.json();
      return json && json.orders ? json.orders : {};
    } catch (error) { return {}; }
  }

  async function refreshKdsEta() {
    var cards = all('.order-card[data-order-id]');
    var ids = cards.map(function (card) { return Number(card.getAttribute('data-order-id')) || 0; }).filter(Boolean);
    if (!ids.length) return;
    var states = await readEta(ids);
    cards.forEach(function (card) {
      var id = String(Number(card.getAttribute('data-order-id')) || 0);
      var state = states[id];
      var time = one('.order-time', card);
      if (!time) return;
      var badge = one('.pmd-kds-eta-v1', time);
      var label = etaText(state);
      if (!label) { if (badge) badge.remove(); return; }
      if (!badge) { badge = document.createElement('span'); badge.className = 'pmd-kds-eta-v1'; badge.setAttribute('aria-live', 'polite'); time.appendChild(badge); }
      badge.textContent = label;
      badge.classList.toggle('is-ready', state.phase === 'ready');
      badge.classList.toggle('is-late', !!state.taking_longer);
    });
  }

  function activeAdminOrderId() {
    var candidates = [one('[data-coc-title]'), one('[data-pos-order-pill]')];
    for (var i = 0; i < candidates.length; i += 1) {
      if (!candidates[i]) continue;
      var match = text(candidates[i].textContent).match(/Order\s*#\s*(\d+)/i);
      if (match) return Number(match[1]) || 0;
    }
    return 0;
  }

  async function refreshAdminOrderEta() {
    normalizePrepText();
    var id = activeAdminOrderId();
    if (!id) return;
    var states = await readEta([id]);
    var state = states[String(id)];
    var label = etaText(state);
    var anchor = one('[data-coc-title]') || one('[data-pos-kitchen-status]') || one('[data-pos-order-pill]');
    if (!anchor || !anchor.parentNode) return;
    var badge = one('[data-pmd-admin-order-eta-v1]');
    if (!label) { if (badge) badge.remove(); return; }
    if (!badge) {
      badge = document.createElement('div');
      badge.className = 'pmd-admin-order-eta-v1';
      badge.setAttribute('data-pmd-admin-order-eta-v1', '');
      anchor.parentNode.insertBefore(badge, anchor.nextSibling);
    }
    badge.textContent = label;
    badge.classList.toggle('is-late', !!state.taking_longer);
  }

  if (path === '/admin/ownerdashboard' || path === '/admin/dashboardlab' || path === '/admin/managerdashboard' || path === '/admin/managerlab') {
    renderTodayTeam();
  }

  if (path === '/admin/menu' || path === '/admin/pmdmenus') {
    enhanceMenuPrep();
    new MutationObserver(enhanceMenuPrep).observe(document.documentElement, { childList: true, subtree: true });
    window.setInterval(enhanceMenuPrep, 700);
  }

  if (path === '/admin/settings/advanced' || path === '/admin/pmdadvanced') retireLegacySmartEta();

  if (path === '/admin/orders' || path === '/admin/cashierlab') {
    refreshAdminOrderEta();
    new MutationObserver(function () { normalizePrepText(); }).observe(document.documentElement, { childList: true, subtree: true });
    window.setInterval(refreshAdminOrderEta, 8000);
  }

  if (path.indexOf('/admin/kitchendisplay/') === 0) {
    refreshKdsEta();
    window.setInterval(refreshKdsEta, 5000);
  }
})();

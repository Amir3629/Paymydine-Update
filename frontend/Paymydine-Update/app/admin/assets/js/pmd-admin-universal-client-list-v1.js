(function () {
  'use strict';

  const path = window.location.pathname.replace(/\/+$/, '');

  const configs = {
    '/admin/categories': {
      key: 'categories',
      cards: [
        ['Total categories', 'fa fa-layer-group', rows => rows.length],
        ['Enabled', 'fa fa-toggle-on', rows => count(rows, /enabled/i)],
        ['Hidden from frontend', 'fa fa-eye-slash', () => 0],
        ['Needs image', 'fa fa-image', () => 0]
      ]
    },
    '/admin/mealtimes': {
      key: 'mealtimes',
      cards: [
        ['Total mealtimes', 'fa fa-clock', rows => rows.length],
        ['Enabled', 'fa fa-toggle-on', rows => count(rows, /enabled/i)],
        ['Locations covered', 'fa fa-location-dot', rows => locations(rows)],
        ['Overlaps to review', 'fa fa-triangle-exclamation', () => 0]
      ]
    },
    '/admin/statuses': {
      key: 'statuses',
      cards: [
        ['Total statuses', 'fa fa-tags', rows => rows.length],
        ['Order statuses', 'fa fa-receipt', rows => count(rows, /order/i)],
        ['Reservation statuses', 'fa fa-calendar-check', rows => count(rows, /reservation|table/i)],
        ['Notifications enabled', 'fa fa-bell', rows => count(rows, /\byes\b|enabled/i)]
      ]
    },
    '/admin/locations': {
      key: 'locations',
      cards: [
        ['Total locations', 'fa fa-store', rows => rows.length],
        ['Enabled', 'fa fa-toggle-on', rows => count(rows, /enabled/i)],
        ['Missing contact', 'fa fa-address-book', rows => countMissingContact(rows)],
        ['Needs geo review', 'fa fa-map-location-dot', () => 0]
      ]
    },
    '/admin/tables': {
      key: 'tables',
      cards: [
        ['Total tables', 'fa fa-chair', rows => rows.length],
        ['Enabled', 'fa fa-toggle-on', rows => count(rows, /enabled/i)],
        ['Total capacity', 'fa fa-users', rows => sumCapacity(rows)],
        ['POS linked', 'fa fa-cash-register', rows => count(rows, /pos|ready|linked/i)]
      ]
    },
    '/admin/coupons': {
      key: 'coupons',
      cards: [
        ['Total incentives', 'fa fa-ticket', rows => rows.length],
        ['Active', 'fa fa-toggle-on', rows => count(rows, /enabled|active/i)],
        ['Gift-card balance', 'fa fa-gift', () => '€0.00'],
        ['Expiring soon', 'fa fa-calendar-xmark', () => 0]
      ]
    },
    '/admin/staffs': {
      key: 'staffs',
      cards: [
        ['Total staff', 'fa fa-users', rows => rows.length],
        ['Active staff', 'fa fa-user-check', rows => count(rows, /enabled|active|staff/i)],
        ['Super staff', 'fa fa-user-shield', rows => count(rows, /super/i)],
        ['Missing security setup', 'fa fa-triangle-exclamation', () => 0]
      ]
    },
    '/admin/pos_configs': {
      key: 'pos-configs',
      cards: [
        ['Total configs', 'fa fa-cash-register', rows => rows.length],
        ['Ready2Order', 'fa fa-plug', rows => count(rows, /ready2order/i)],
        ['Webhook registered', 'fa fa-link', rows => count(rows, /webhook/i)],
        ['Needs credentials', 'fa fa-key', () => 0]
      ]
    },
    '/admin/orders': {
      key: 'orders',
      cards: [
        ['Today orders', 'fa fa-calendar-day', rows => rows.length],
        ['Open orders', 'fa fa-hourglass-half', rows => count(rows, /incomplete|pending|open|preparing/i)],
        ['Revenue today', 'fa fa-euro-sign', () => '€0.00'],
        ['Attention needed', 'fa fa-triangle-exclamation', rows => count(rows, /failed|canceled|rejected|overdue/i)]
      ]
    },
    '/admin/reservations': {
      key: 'reservations',
      cards: [
        ['Today reservations', 'fa fa-calendar-day', rows => rows.length],
        ['Guests today', 'fa fa-users', rows => sumGuests(rows)],
        ['Pending / active', 'fa fa-clock', rows => count(rows, /incomplete|pending|confirmed|active/i)],
        ['Assigned tables', 'fa fa-chair', rows => count(rows, /table/i)]
      ]
    },
    '/admin/themes': {
      key: 'themes',
      cards: [
        ['Installed themes', 'fa fa-palette', rows => rows.length || 1],
        ['Active theme', 'fa fa-star', () => '1'],
        ['Child themes', 'fa fa-code-branch', rows => count(rows, /child/i)],
        ['Missing assets', 'fa fa-image', rows => count(rows, /missing|404|unavailable/i)]
      ]
    }
  };

  const config = configs[path];
  if (!config) return;

  const storageKey = 'pmd-ios-sortable-layout-v9:' + path;
  const cardSelector = '.pmd-admin-universal-client-stat, .pmd-admin-universal-client-row-card';

  let sortables = [];
  let didSort = false;

  function txt(el) {
    return (el && el.innerText ? el.innerText : '').replace(/\s+/g, ' ').trim();
  }

  function count(rows, re) {
    return rows.filter(row => re.test(txt(row))).length;
  }

  function locations(rows) {
    const s = new Set();
    rows.forEach(row => {
      const t = txt(row);
      if (/default/i.test(t)) s.add('Default');
      (t.match(/Test\s*\d+/gi) || []).forEach(x => s.add(x));
    });
    return s.size || 0;
  }

  function countMissingContact(rows) {
    return rows.filter(row => {
      const t = txt(row);
      return !/@/.test(t) && !/\d{4,}/.test(t);
    }).length;
  }

  function sumCapacity(rows) {
    let total = 0;
    rows.forEach(row => {
      const nums = txt(row).match(/\b\d+\b/g) || [];
      if (nums.length) total += Number(nums[nums.length - 1] || 0);
    });
    return total || 0;
  }

  function sumGuests(rows) {
    let total = 0;
    rows.forEach(row => {
      const nums = txt(row).match(/\b\d+\b/g) || [];
      if (nums.length) total += Number(nums[0] || 0);
    });
    return total || 0;
  }

  function safe(fn, rows) {
    try {
      const v = fn(rows);
      return v === undefined || v === null || Number.isNaN(v) ? '0' : String(v);
    } catch (_) {
      return '0';
    }
  }

  function findListForm(wrapper) {
    return Array.from(wrapper.querySelectorAll('form')).find(form => {
      if (form.id === 'filter-form') return false;
      if (form.closest('#filter-list-filter')) return false;
      return form.querySelector('tbody tr, .list-table, .table-responsive, table');
    });
  }

  function directChildInside(parent, child) {
    let node = child;
    while (node && node.parentElement && node.parentElement !== parent) node = node.parentElement;
    return node && node.parentElement === parent ? node : child;
  }

  function cleanHeaderLabel(label) {
    const raw = String(label || '').trim().toUpperCase();
    const map = {
      'ADMIN::LANG.LABEL_PRIORITY': 'Priority',
      'PRIORITY': 'Priority',
      'STATUS': 'Status',
      'NAME': 'Name',
      'CODE': 'Code',
      'TYPE': 'Type',
      'DISCOUNT TYPE': 'Discount type',
      'DISCOUNT': 'Discount',
      'BALANCE': 'Balance',
      'CITY': 'City',
      'STATE': 'State',
      'POSTCODE': 'Postcode',
      'TELEPHONE': 'Telephone',
      'START TIME': 'Start time',
      'END TIME': 'End time',
      'LOCATION(S)': 'Locations',
      'MINIMUM CAPACITY': 'Min capacity',
      'MAXIMUM CAPACITY': 'Max capacity',
      'EXTRA CAPACITY': 'Extra capacity',
      'IS JOINABLE': 'Joinable',
      'DATE ADDED': 'Date added',
      'STAFF GROUPS': 'Staff groups',
      'STAFF ROLES': 'Staff roles',
      'LAST LOGIN': 'Last login'
    };
    return map[raw] || String(label || '').replace(/^ADMIN::LANG\./i, '').replace(/_/g, ' ');
  }

  function headersFrom(table) {
    return Array.from(table.querySelectorAll('thead th')).map(th => cleanHeaderLabel(txt(th))).filter(Boolean);
  }

  function cellsFrom(row) {
    return Array.from(row.children).map(td => txt(td)).filter(Boolean);
  }

  function statusFrom(text) {
    return ['Enabled', 'Disabled', 'Active', 'Inactive', 'Paid', 'Unpaid', 'Complete', 'Incomplete', 'Canceled']
      .find(s => new RegExp(s, 'i').test(text)) || '';
  }

  function firstEditLink(row) {
    return Array.from(row.querySelectorAll('a[href]')).find(a => /\/edit\/|\/admin\/.+\/edit/i.test(a.href)) || null;
  }

  function loadState() {
    try { return JSON.parse(localStorage.getItem(storageKey) || '{}') || {}; } catch (_) { return {}; }
  }

  function saveState(state) {
    try { localStorage.setItem(storageKey, JSON.stringify(state)); } catch (_) {}
  }

  function buildStats(rows) {
    const section = document.createElement('section');
    section.className = 'pmd-admin-universal-client-stats';
    section.dataset.pmdGroup = 'stats';

    config.cards.forEach(([labelText, iconClass, valueFn]) => {
      const card = document.createElement('article');
      card.className = 'pmd-admin-universal-client-stat';
      card.dataset.pmdGroup = 'stats';
      card.dataset.pmdId = 'stats:' + labelText.toLowerCase().replace(/[^a-z0-9]+/g, '-');

      const copy = document.createElement('div');
      const label = document.createElement('span');
      label.textContent = labelText;
      const value = document.createElement('strong');
      value.textContent = safe(valueFn, rows);
      const icon = document.createElement('i');
      icon.className = iconClass;
      icon.setAttribute('aria-hidden', 'true');

      copy.appendChild(label);
      copy.appendChild(value);
      card.appendChild(copy);
      card.appendChild(icon);
      section.appendChild(card);
    });

    return section;
  }

  function buildCards(form, rows) {
    const table = form.querySelector('table');
    const headers = table ? headersFrom(table) : [];

    const grid = document.createElement('section');
    grid.className = 'pmd-admin-universal-client-card-grid pmd-admin-universal-client-card-grid-direct';
    grid.dataset.pmdGroup = 'cards';

    rows.forEach((row, index) => {
      const values = cellsFrom(row);
      const rowText = txt(row);
      const title = values.find(v => !/^(enabled|disabled|active|inactive|\d+|yes|no|-|€?0\.00)$/i.test(v)) || values[0] || ('Item ' + (index + 1));
      const status = statusFrom(rowText);
      const edit = firstEditLink(row);

      const card = document.createElement('article');
      card.className = 'pmd-admin-universal-client-row-card';
      card.dataset.pmdGroup = 'cards';
      card.dataset.pmdId = 'cards:' + title.toLowerCase().replace(/[^a-z0-9]+/g, '-') + ':' + index;

      const top = document.createElement('div');
      top.className = 'pmd-admin-universal-client-row-card__top';

      const titleWrap = document.createElement('div');
      const h3 = document.createElement('h3');
      h3.textContent = title;
      const sub = document.createElement('p');
      sub.textContent = config.key.replace(/-/g, ' ');
      titleWrap.appendChild(h3);
      titleWrap.appendChild(sub);
      top.appendChild(titleWrap);

      if (status) {
        const pill = document.createElement('span');
        pill.className = 'pmd-admin-universal-client-row-card__pill';
        pill.textContent = status;
        top.appendChild(pill);
      }

      const details = document.createElement('div');
      details.className = 'pmd-admin-universal-client-row-card__details';

      values.slice(0, 6).forEach((value, i) => {
        if (!value || value === title) return;

        const d = document.createElement('div');
        d.className = 'pmd-admin-universal-client-row-card__detail';

        const label = document.createElement('span');
        label.textContent = headers[i] || 'Detail';

        const strong = document.createElement('strong');
        strong.textContent = value;

        d.appendChild(label);
        d.appendChild(strong);
        details.appendChild(d);
      });

      const actions = document.createElement('div');
      actions.className = 'pmd-admin-universal-client-row-card__actions';

      if (edit) {
        const a = document.createElement('a');
        a.href = edit.href;
        a.className = 'pmd-admin-universal-client-row-card__btn';
        a.textContent = 'Edit';
        actions.appendChild(a);
      }

      card.appendChild(top);
      card.appendChild(details);
      if (actions.children.length) card.appendChild(actions);
      grid.appendChild(card);
    });

    return grid;
  }

  function applyState() {
    const state = loadState();

    ['stats', 'cards'].forEach(group => {
      const root = document.querySelector(`[data-pmd-group="${group}"]`);
      if (!root) return;

      const cards = Array.from(root.children).filter(el => el.matches(cardSelector));
      const hidden = new Set((state.hidden && state.hidden[group]) || []);

      cards.forEach(card => {
        card.classList.toggle('pmd-ios-hidden', hidden.has(card.dataset.pmdId));
      });

      const order = (state.order && state.order[group]) || [];
      if (order.length) {
        const map = {};
        cards.forEach(card => map[card.dataset.pmdId] = card);
        order.forEach(id => { if (map[id]) root.appendChild(map[id]); });
      }
    });
  }

  function saveOrder() {
    const state = loadState();
    state.order = state.order || {};

    ['stats', 'cards'].forEach(group => {
      const root = document.querySelector(`[data-pmd-group="${group}"]`);
      if (!root) return;

      state.order[group] = Array.from(root.children)
        .filter(el => el.matches(cardSelector))
        .map(card => card.dataset.pmdId);
    });

    saveState(state);
  }

  function selectedCards() {
    return Array.from(document.querySelectorAll('.pmd-ios-selected'));
  }

  function updateToolbar() {
    const countSelected = selectedCards().length;
    const remove = document.querySelector('.pmd-ios-remove-selected');

    if (remove) {
      remove.disabled = countSelected === 0;
      remove.textContent = countSelected ? `Remove Selected (${countSelected})` : 'Remove Selected';
    }
  }

  function setEditMode(on) {
    document.body.classList.toggle('pmd-ios-edit-mode', on);

    const edit = document.querySelector('.pmd-ios-edit-toggle');
    if (edit) edit.textContent = on ? 'Done' : 'Edit Layout';

    sortables.forEach(s => s.option('disabled', !on));

    if (!on) {
      document.querySelectorAll('.pmd-ios-selected').forEach(el => el.classList.remove('pmd-ios-selected'));
    }

    updateToolbar();
  }

  function removeSelected() {
    const selected = selectedCards();
    if (!selected.length) return;

    const state = loadState();
    state.hidden = state.hidden || {};

    selected.forEach(card => {
      const group = card.dataset.pmdGroup;
      state.hidden[group] = state.hidden[group] || [];

      if (!state.hidden[group].includes(card.dataset.pmdId)) {
        state.hidden[group].push(card.dataset.pmdId);
      }

      card.classList.remove('pmd-ios-selected');
      card.classList.add('pmd-ios-hidden');
    });

    saveState(state);
    updateToolbar();
  }

  function restoreAll() {
    const state = loadState();
    state.hidden = {};
    saveState(state);

    document.querySelectorAll('.pmd-ios-hidden, .pmd-ios-selected').forEach(el => {
      el.classList.remove('pmd-ios-hidden', 'pmd-ios-selected');
    });

    updateToolbar();
  }

  function createToolbar() {
    if (document.querySelector('.pmd-ios-layout-toolbar')) return;

    const toolbar = document.createElement('div');
    toolbar.className = 'pmd-ios-layout-toolbar';

    const makeBtn = (text, cls, fn) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = cls;
      b.textContent = text;
      b.addEventListener('click', fn);
      return b;
    };

    toolbar.appendChild(makeBtn('Edit Layout', 'pmd-ios-tool-btn pmd-ios-edit-toggle', () => {
      setEditMode(!document.body.classList.contains('pmd-ios-edit-mode'));
    }));

    toolbar.appendChild(makeBtn('Remove Selected', 'pmd-ios-tool-btn danger pmd-ios-remove-selected', removeSelected));
    toolbar.appendChild(makeBtn('Restore All', 'pmd-ios-tool-btn ghost pmd-ios-restore-all', restoreAll));

    document.body.appendChild(toolbar);
    updateToolbar();
  }

  function bindCardSelection() {
    document.addEventListener('click', e => {
      if (!document.body.classList.contains('pmd-ios-edit-mode')) return;
      if (didSort) {
        didSort = false;
        return;
      }

      if (e.target.closest('.pmd-ios-layout-toolbar')) return;

      const card = e.target.closest(cardSelector);
      if (!card) return;

      if (e.target.closest('a, button, input, select, textarea')) {
        e.preventDefault();
        return;
      }

      e.preventDefault();
      card.classList.toggle('pmd-ios-selected');
      updateToolbar();
    }, true);
  }

  function setupSortable() {
    if (!window.Sortable) return false;

    sortables.forEach(s => s.destroy());
    sortables = [];

    const common = {
      animation: 420,
      easing: 'cubic-bezier(.22,1,.36,1)',
      disabled: !document.body.classList.contains('pmd-ios-edit-mode'),
      forceFallback: false,
      fallbackOnBody: true,
      swapThreshold: 0.72,
      ghostClass: 'pmd-sortable-ghost',
      chosenClass: 'pmd-sortable-chosen',
      dragClass: 'pmd-sortable-drag',
      filter: 'a, button, input, select, textarea',
      preventOnFilter: false,
      onStart: function () {
        didSort = true;
        document.body.classList.add('pmd-ios-sorting');
      },
      onEnd: function () {
        setTimeout(() => { didSort = false; }, 120);
        document.body.classList.remove('pmd-ios-sorting');
        saveOrder();
      }
    };

    const stats = document.querySelector('.pmd-admin-universal-client-stats');
    const cards = document.querySelector('.pmd-admin-universal-client-card-grid');

    if (stats) sortables.push(Sortable.create(stats, Object.assign({}, common, { group: { name: 'pmd-stats', put: false, pull: false } })));
    if (cards) sortables.push(Sortable.create(cards, Object.assign({}, common, { group: { name: 'pmd-cards', put: false, pull: false } })));

    return sortables.length > 0;
  }

  function enhance() {
    const wrapper = document.querySelector('.page-wrapper');
    if (!wrapper) return;

    const form = findListForm(wrapper);
    if (!form) return;

    const rows = Array.from(form.querySelectorAll('tbody tr')).filter(row => txt(row).length);

    document.body.classList.add('pmd-admin-universal-client-list-active', 'pmd-admin-universal-client-list-' + config.key);

    form.classList.add('pmd-admin-universal-client-panel', 'pmd-admin-universal-client-card-mode');

    wrapper.querySelectorAll('.pmd-admin-universal-client-stats, .pmd-admin-universal-client-card-grid').forEach(el => el.remove());

    const host = directChildInside(wrapper, form);
    host.classList.add('pmd-admin-universal-client-host', 'pmd-admin-universal-client-legacy-host-hidden');

    wrapper.insertBefore(buildStats(rows), host);
    wrapper.insertBefore(buildCards(form, rows), host);

    createToolbar();
    applyState();
    bindCardSelection();

    let tries = 0;
    const t = setInterval(() => {
      tries += 1;
      if (setupSortable() || tries > 40) clearInterval(t);
    }, 150);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', enhance);
  else enhance();
})();

/* PMD iOS FLIP Smooth v20
 * Permanent FLIP animation for Sortable card reordering.
 * Keeps existing Sortable logic; only smooths surrounding card movement.
 */
(function () {
  'use strict';

  if (window.PMDFlipSmoothV20Started) return;
  window.PMDFlipSmoothV20Started = true;

  const supported = [
    '/admin/categories',
    '/admin/mealtimes',
    '/admin/statuses',
    '/admin/locations',
    '/admin/tables',
    '/admin/coupons',
    '/admin/staffs',
    '/admin/pos_configs',
    '/admin/orders',
    '/admin/reservations',
    '/admin/themes',
    '/admin/menus',
    '/admin/mail_templates',
    '/admin/reviews',
    '/admin/countries',
    '/admin/currencies',
    '/admin/languages',
    '/admin/tips',
    '/admin/payments'
  ];

  const path = window.location.pathname.replace(/\/+$/, '');
  if (!supported.includes(path)) return;

  const cardSelector = '.pmd-admin-universal-client-stat, .pmd-admin-universal-client-row-card';
  const containerSelector = '.pmd-admin-universal-client-stats, .pmd-admin-universal-client-card-grid';

  const state = {
    running: true,
    rects: new Map(),
    raf: null,
    mutations: 0,
    flips: 0,
    maxDistance: 0,
    observed: 0
  };

  function key(el) {
    if (!el.dataset.pmdFlipKey) {
      const title =
        el.dataset.pmdId ||
        el.dataset.pmdIosId ||
        el.querySelector('h3, span')?.innerText?.trim()?.toLowerCase().replace(/[^a-z0-9]+/g, '-') ||
        Math.random().toString(36).slice(2);

      el.dataset.pmdFlipKey = title;
    }

    return el.dataset.pmdFlipKey;
  }

  function visibleCards() {
    return Array.from(document.querySelectorAll(cardSelector)).filter(el => {
      const style = getComputedStyle(el);
      return style.display !== 'none' && style.visibility !== 'hidden';
    });
  }

  function snapshot() {
    visibleCards().forEach(el => {
      if (el.classList.contains('pmd-sortable-drag')) return;
      state.rects.set(key(el), el.getBoundingClientRect());
    });
  }

  function animateFrom(before) {
    requestAnimationFrame(() => {
      visibleCards().forEach(el => {
        if (
          el.classList.contains('pmd-sortable-drag') ||
          el.classList.contains('pmd-sortable-chosen')
        ) {
          return;
        }

        const oldRect = before.get(key(el));
        if (!oldRect) return;

        const newRect = el.getBoundingClientRect();
        const dx = oldRect.left - newRect.left;
        const dy = oldRect.top - newRect.top;
        const distance = Math.hypot(dx, dy);

        if (distance < 8) return;

        state.flips += 1;
        state.maxDistance = Math.max(state.maxDistance, distance);

        el.style.transition = 'none';
        el.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
        el.style.willChange = 'transform';

        el.getBoundingClientRect();

        requestAnimationFrame(() => {
          el.style.transition = 'transform 560ms cubic-bezier(.16, 1, .3, 1)';
          el.style.transform = '';

          setTimeout(() => {
            el.style.transition = '';
            el.style.willChange = '';
          }, 610);
        });
      });

      snapshot();
    });
  }

  const observers = [];

  function observeContainers() {
    document.querySelectorAll(containerSelector).forEach(container => {
      if (container.dataset.pmdFlipSmoothV20 === '1') return;

      container.dataset.pmdFlipSmoothV20 = '1';
      state.observed += 1;

      const observer = new MutationObserver(() => {
        if (!state.running) return;
        if (!document.body.classList.contains('pmd-ios-edit-mode')) return;

        const before = new Map(state.rects);
        state.mutations += 1;
        animateFrom(before);
      });

      observer.observe(container, { childList: true });
      observers.push(observer);
    });
  }

  function loop() {
    if (!state.running) return;

    observeContainers();

    if (document.body.classList.contains('pmd-ios-edit-mode')) {
      snapshot();
    }

    state.raf = requestAnimationFrame(loop);
  }

  function boot() {
    document.body.classList.add('pmd-flip-smooth-active');
    observeContainers();
    snapshot();
    loop();
  }

  window.PMDFlipSmoothV20 = {
    report() {
      return {
        page: path,
        running: state.running,
        observed: state.observed,
        mutations: state.mutations,
        flips: state.flips,
        maxDistance: Math.round(state.maxDistance),
        sortable: {
          exists: !!window.Sortable,
          stats: !!(window.Sortable && Sortable.get(document.querySelector('.pmd-admin-universal-client-stats'))),
          cards: !!(window.Sortable && Sortable.get(document.querySelector('.pmd-admin-universal-client-card-grid')))
        }
      };
    },

    stop() {
      state.running = false;
      observers.forEach(o => o.disconnect());
      observers.length = 0;

      if (state.raf) cancelAnimationFrame(state.raf);

      document.body.classList.remove('pmd-flip-smooth-active');

      visibleCards().forEach(el => {
        el.style.transition = '';
        el.style.transform = '';
        el.style.willChange = '';
      });

      return this.report();
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();

/* PMD iOS Pre-Clone Slow Drop v26
 * Clone starts at drag start, follows the drag, then slowly lands in final place.
 * Does NOT disable native Sortable. Keeps v20 FLIP.
 */
(function () {
  'use strict';

  if (window.PMDPreCloneDropV26Started) return;
  window.PMDPreCloneDropV26Started = true;

  const supported = [
    '/admin/categories',
    '/admin/mealtimes',
    '/admin/statuses',
    '/admin/locations',
    '/admin/tables',
    '/admin/coupons',
    '/admin/staffs',
    '/admin/pos_configs',
    '/admin/orders',
    '/admin/reservations',
    '/admin/themes',
    '/admin/menus',
    '/admin/mail_templates',
    '/admin/reviews',
    '/admin/countries',
    '/admin/currencies',
    '/admin/languages',
    '/admin/tips',
    '/admin/payments'
  ];

  const path = window.location.pathname.replace(/\/+$/, '');
  if (!supported.includes(path)) return;

  const itemSelector = '.pmd-admin-universal-client-stat, .pmd-admin-universal-client-row-card';
  const containerSelector = '.pmd-admin-universal-client-stats, .pmd-admin-universal-client-card-grid';

  const state = {
    active: false,
    item: null,
    clone: null,
    raf: null,
    bound: 0,
    starts: 0,
    drops: 0,
    pointerSamples: 0,
    rectSamples: 0,
    lastX: 0,
    lastY: 0,
    offsetX: 0,
    offsetY: 0,
    landing: false
  };

  function point(e) {
    const ev = e && e.originalEvent ? e.originalEvent : e;
    if (!ev) return null;

    if (ev.touches && ev.touches[0]) return { x: ev.touches[0].clientX, y: ev.touches[0].clientY };
    if (ev.changedTouches && ev.changedTouches[0]) return { x: ev.changedTouches[0].clientX, y: ev.changedTouches[0].clientY };

    if (typeof ev.clientX === 'number' && typeof ev.clientY === 'number') {
      return { x: ev.clientX, y: ev.clientY };
    }

    return null;
  }

  function stripIds(root) {
    root.removeAttribute('id');
    root.querySelectorAll('[id]').forEach(el => el.removeAttribute('id'));
  }

  function cleanupClone() {
    if (state.raf) {
      cancelAnimationFrame(state.raf);
      state.raf = null;
    }

    document.querySelectorAll('.pmd-preclone-drop-v26-clone').forEach(el => el.remove());
    document.querySelectorAll('.pmd-preclone-drop-v26-real-hidden').forEach(el => {
      el.classList.remove('pmd-preclone-drop-v26-real-hidden');
    });

    document.body.classList.remove('pmd-preclone-drop-v26-active');

    state.active = false;
    state.landing = false;
    state.item = null;
    state.clone = null;
  }

  function updateCloneFromPointer(e) {
    if (!state.active || state.landing || !state.clone) return;

    const p = point(e);
    if (!p) return;

    state.lastX = p.x;
    state.lastY = p.y;
    state.pointerSamples += 1;

    state.clone.style.left = `${p.x - state.offsetX}px`;
    state.clone.style.top = `${p.y - state.offsetY}px`;
  }

  function sampleNativeDragRect() {
    if (!state.active || state.landing || !state.clone) return;

    const dragEl =
      document.querySelector('.pmd-sortable-drag') ||
      document.querySelector('.sortable-drag') ||
      document.querySelector('.pmd-sortable-chosen') ||
      document.querySelector('.sortable-chosen');

    if (dragEl && dragEl.getBoundingClientRect) {
      const r = dragEl.getBoundingClientRect();

      if (r.width > 20 && r.height > 20) {
        state.rectSamples += 1;

        /*
         * Pointer events are better. Rect sampling is fallback for Safari/native drag.
         */
        if (state.pointerSamples < 3) {
          state.clone.style.left = `${r.left}px`;
          state.clone.style.top = `${r.top}px`;
        }
      }
    }

    state.raf = requestAnimationFrame(sampleNativeDragRect);
  }

  function start(evt) {
    const item = evt && evt.item ? evt.item : null;
    if (!item || !item.matches || !item.matches(itemSelector)) return;

    cleanupClone();

    const r = item.getBoundingClientRect();
    const p = point(evt) || {
      x: r.left + r.width / 2,
      y: r.top + r.height / 2
    };

    state.active = true;
    state.landing = false;
    state.item = item;
    state.starts += 1;
    state.lastX = p.x;
    state.lastY = p.y;
    state.offsetX = Math.max(0, Math.min(r.width, p.x - r.left));
    state.offsetY = Math.max(0, Math.min(r.height, p.y - r.top));

    const clone = item.cloneNode(true);
    stripIds(clone);

    clone.classList.remove('pmd-ios-selected', 'pmd-sortable-chosen', 'pmd-sortable-drag', 'pmd-sortable-ghost');
    clone.classList.add('pmd-preclone-drop-v26-clone');

    clone.style.left = `${r.left}px`;
    clone.style.top = `${r.top}px`;
    clone.style.width = `${r.width}px`;
    clone.style.height = `${r.height}px`;

    document.body.appendChild(clone);
    document.body.classList.add('pmd-preclone-drop-v26-active');

    state.clone = clone;

    /*
     * Hide the real item only after clone exists.
     * Visibility keeps layout space, so Sortable remains stable.
     */
    item.classList.add('pmd-preclone-drop-v26-real-hidden');

    state.raf = requestAnimationFrame(sampleNativeDragRect);
  }

  function end(evt) {
    const item = evt && evt.item ? evt.item : state.item;
    const clone = state.clone;

    if (!item || !clone) {
      cleanupClone();
      return;
    }

    if (state.raf) {
      cancelAnimationFrame(state.raf);
      state.raf = null;
    }

    /*
     * Important v27:
     * Once mouse button is released, freeze the clone.
     * No more mousemove / pointermove / dragover can affect the landing animation.
     */
    state.landing = true;
    state.active = false;

    const finalRect = item.getBoundingClientRect();
    const cloneRect = clone.getBoundingClientRect();

    clone.style.transition = 'none';
    clone.style.left = `${cloneRect.left}px`;
    clone.style.top = `${cloneRect.top}px`;
    clone.style.width = `${cloneRect.width}px`;
    clone.style.height = `${cloneRect.height}px`;
    clone.style.transform = 'translate3d(0,0,0)';

    clone.getBoundingClientRect();

    requestAnimationFrame(() => {
      clone.style.transition =
        'left 760ms cubic-bezier(.16,1,.3,1), top 760ms cubic-bezier(.16,1,.3,1), width 760ms cubic-bezier(.16,1,.3,1), height 760ms cubic-bezier(.16,1,.3,1), opacity 320ms ease';

      clone.style.left = `${finalRect.left}px`;
      clone.style.top = `${finalRect.top}px`;
      clone.style.width = `${finalRect.width}px`;
      clone.style.height = `${finalRect.height}px`;
      clone.style.opacity = '1';

      setTimeout(() => {
        item.classList.remove('pmd-preclone-drop-v26-real-hidden');
        clone.remove();

        document.body.classList.remove('pmd-preclone-drop-v26-active');

        state.active = false;
        state.landing = false;
        state.item = null;
        state.clone = null;
        state.drops += 1;
      }, 820);
    });
  }

  function bindSortable(container) {
    if (!container || !window.Sortable) return false;

    const instance = Sortable.get(container);
    if (!instance) return false;

    if (container.dataset.pmdPreCloneDropV26 === '1') return true;

    container.dataset.pmdPreCloneDropV26 = '1';
    state.bound += 1;

    const oldStart = instance.option('onStart');
    const oldEnd = instance.option('onEnd');

    instance.option('onStart', function (evt) {
      start(evt);
      if (typeof oldStart === 'function') return oldStart.call(this, evt);
    });

    instance.option('onEnd', function (evt) {
      const result = typeof oldEnd === 'function' ? oldEnd.call(this, evt) : undefined;
      end(evt);
      return result;
    });

    return true;
  }

  function bindAll() {
    document.querySelectorAll(containerSelector).forEach(bindSortable);
  }

  function boot() {
    document.body.classList.add('pmd-preclone-drop-v26-ready');

    ['mousemove', 'pointermove', 'drag', 'dragover', 'touchmove'].forEach(type => {
      document.addEventListener(type, updateCloneFromPointer, true);
    });

    bindAll();

    let tries = 0;
    const timer = setInterval(() => {
      tries += 1;
      bindAll();
      if (state.bound >= 2 || tries > 80) clearInterval(timer);
    }, 150);

    const mo = new MutationObserver(bindAll);
    mo.observe(document.body, { childList: true, subtree: true });
    window.PMDPreCloneDropV26Observer = mo;
  }

  window.PMDPreCloneDropV26 = {
    report() {
      return {
        page: path,
        ready: document.body.classList.contains('pmd-preclone-drop-v26-ready'),
        active: state.active,
        landing: state.landing,
        bound: state.bound,
        starts: state.starts,
        drops: state.drops,
        pointerSamples: state.pointerSamples,
        rectSamples: state.rectSamples,
        sortableStillEnabled: {
          stats: !!(window.Sortable && Sortable.get(document.querySelector('.pmd-admin-universal-client-stats')) && !Sortable.get(document.querySelector('.pmd-admin-universal-client-stats')).option('disabled')),
          cards: !!(window.Sortable && Sortable.get(document.querySelector('.pmd-admin-universal-client-card-grid')) && !Sortable.get(document.querySelector('.pmd-admin-universal-client-card-grid')).option('disabled'))
        }
      };
    },

    stop() {
      cleanupClone();

      if (window.PMDPreCloneDropV26Observer) {
        window.PMDPreCloneDropV26Observer.disconnect();
      }

      document.body.classList.remove('pmd-preclone-drop-v26-ready');

      return this.report();
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();

/* PMD iOS Drop Scroll Lock v28
 * Fix: if user scrolls while the dropped clone is landing, clone/real card desyncs.
 * We lock scroll only during landing, not during normal drag/edit mode.
 */
(function () {
  'use strict';

  if (window.PMDDropScrollLockV28Started) return;
  window.PMDDropScrollLockV28Started = true;

  const supported = [
    '/admin/categories',
    '/admin/mealtimes',
    '/admin/statuses',
    '/admin/locations',
    '/admin/tables',
    '/admin/coupons',
    '/admin/staffs',
    '/admin/pos_configs',
    '/admin/orders',
    '/admin/reservations',
    '/admin/themes',
    '/admin/menus',
    '/admin/mail_templates',
    '/admin/reviews',
    '/admin/countries',
    '/admin/currencies',
    '/admin/languages',
    '/admin/tips',
    '/admin/payments'
  ];

  const path = window.location.pathname.replace(/\/+$/, '');
  if (!supported.includes(path)) return;

  const state = {
    locked: false,
    x: 0,
    y: 0,
    raf: null,
    locks: 0,
    prevented: 0
  };

  function hasLandingClone() {
    return !!document.querySelector('.pmd-preclone-drop-v26-clone');
  }

  function isLanding() {
    return (
      document.body.classList.contains('pmd-preclone-drop-v26-active') &&
      hasLandingClone() &&
      !document.body.classList.contains('pmd-ios-sorting')
    );
  }

  function prevent(e) {
    if (!state.locked) return;

    state.prevented += 1;

    try {
      e.preventDefault();
      e.stopPropagation();
    } catch (_) {}

    if (window.scrollX !== state.x || window.scrollY !== state.y) {
      window.scrollTo(state.x, state.y);
    }

    return false;
  }

  function preventKeys(e) {
    if (!state.locked) return;

    const blocked = [
      'ArrowUp',
      'ArrowDown',
      'ArrowLeft',
      'ArrowRight',
      'PageUp',
      'PageDown',
      'Home',
      'End',
      ' ',
      'Spacebar'
    ];

    if (blocked.includes(e.key)) prevent(e);
  }

  function lock() {
    if (state.locked) return;

    state.x = window.scrollX || window.pageXOffset || 0;
    state.y = window.scrollY || window.pageYOffset || 0;
    state.locked = true;
    state.locks += 1;

    document.body.classList.add('pmd-drop-scroll-lock-v28-active');
    document.documentElement.classList.add('pmd-drop-scroll-lock-v28-active');
  }

  function unlock() {
    if (!state.locked) return;

    state.locked = false;

    document.body.classList.remove('pmd-drop-scroll-lock-v28-active');
    document.documentElement.classList.remove('pmd-drop-scroll-lock-v28-active');
  }

  function monitor() {
    if (isLanding()) {
      lock();

      if (window.scrollX !== state.x || window.scrollY !== state.y) {
        window.scrollTo(state.x, state.y);
      }
    } else {
      unlock();
    }

    state.raf = requestAnimationFrame(monitor);
  }

  window.addEventListener('wheel', prevent, { capture: true, passive: false });
  window.addEventListener('touchmove', prevent, { capture: true, passive: false });
  window.addEventListener('scroll', function () {
    if (!state.locked) return;
    window.scrollTo(state.x, state.y);
  }, { capture: true, passive: true });
  window.addEventListener('keydown', preventKeys, { capture: true });

  window.PMDDropScrollLockV28 = {
    report() {
      return {
        page: path,
        locked: state.locked,
        locks: state.locks,
        prevented: state.prevented,
        hasLandingClone: hasLandingClone(),
        bodySorting: document.body.classList.contains('pmd-ios-sorting'),
        preCloneActive: document.body.classList.contains('pmd-preclone-drop-v26-active'),
        v26: window.PMDPreCloneDropV26 && typeof window.PMDPreCloneDropV26.report === 'function'
          ? window.PMDPreCloneDropV26.report()
          : null
      };
    },

    stop() {
      unlock();

      if (state.raf) {
        cancelAnimationFrame(state.raf);
        state.raf = null;
      }

      return this.report();
    }
  };

  monitor();
})();

/* PMD Universal More Pages Fallback v30
 * Generic client-only card renderer for list/index pages not covered by the original renderer.
 * Uses existing v20/v26/v28 drag/smooth system after containers exist.
 */
(function () {
  'use strict';

  if (window.PMDUniversalMorePagesV30Started) return;
  window.PMDUniversalMorePagesV30Started = true;

  const configs = {
    '/admin/menus': {
      title: 'Menus',
      stats: ['Total Menu Items', 'Available', 'Unavailable', 'Categories'],
      entity: 'Menu Item'
    },
    '/admin/themes': {
      title: 'Themes',
      stats: ['Installed Themes', 'Active', 'Custom', 'Needs Review'],
      entity: 'Theme'
    },
    '/admin/mail_templates': {
      title: 'Mail Templates',
      stats: ['Templates', 'Enabled', 'Disabled', 'Variables'],
      entity: 'Template'
    },
    '/admin/reviews': {
      title: 'Reviews',
      stats: ['Reviews', 'Approved', 'Pending', 'Average'],
      entity: 'Review'
    },
    '/admin/countries': {
      title: 'Countries',
      stats: ['Countries', 'Enabled', 'Disabled', 'Default'],
      entity: 'Country'
    },
    '/admin/currencies': {
      title: 'Currencies',
      stats: ['Currencies', 'Enabled', 'Disabled', 'Default'],
      entity: 'Currency'
    },
    '/admin/languages': {
      title: 'Languages',
      stats: ['Languages', 'Enabled', 'Disabled', 'Default'],
      entity: 'Language'
    },
    '/admin/tips': {
      title: 'Tips',
      stats: ['Tips', 'Enabled', 'Disabled', 'Preset Values'],
      entity: 'Tip'
    },
    '/admin/payments': {
      title: 'Payment Methods',
      stats: ['Payment Methods', 'Enabled', 'Disabled', 'Needs Setup'],
      entity: 'Payment Method'
    }
  };

  const path = window.location.pathname.replace(/\/+$/, '');
  const cfg = configs[path];
  if (!cfg) return;

  const storageKey = 'pmd-ios-sortable-layout-v9:' + path;

  function text(el) {
    return (el ? el.textContent : '')
      .replace(/\s+/g, ' ')
      .replace(/ADMIN::LANG\.[A-Z0-9_.$-]+/gi, '')
      .trim();
  }

  function cleanLabel(v, fallback) {
    v = String(v || '').replace(/\s+/g, ' ').trim();
    v = v.replace(/^admin::lang\./i, '');
    v = v.replace(/^label[_\s.-]*/i, '');
    v = v.replace(/[_-]+/g, ' ');
    if (!v) return fallback || 'Detail';
    return v.replace(/\b\w/g, s => s.toUpperCase());
  }

  function cleanValue(v) {
    return String(v || '').replace(/\s+/g, ' ').trim() || '-';
  }

  function pageWrapper() {
    return document.querySelector('.page-wrapper') ||
      document.querySelector('main') ||
      document.querySelector('.content') ||
      document.body;
  }

  function findMainTable() {
    const tables = Array.from(document.querySelectorAll('table')).filter(table => {
      if (table.closest('.pmd-admin-universal-client-card-grid')) return false;
      if (table.closest('.pmd-admin-universal-client-stats')) return false;
      if (table.querySelectorAll('tbody tr').length < 1) return false;
      const s = getComputedStyle(table);
      if (s.display === 'none' || s.visibility === 'hidden') return false;
      return true;
    });

    tables.sort((a, b) => b.querySelectorAll('tbody tr').length - a.querySelectorAll('tbody tr').length);
    return tables[0] || null;
  }

  function getHeaders(table) {
    const ths = Array.from(table.querySelectorAll('thead th'));
    if (!ths.length) {
      const first = table.querySelector('tbody tr');
      return Array.from(first ? first.children : []).map((_, i) => 'Field ' + (i + 1));
    }
    return ths.map((th, i) => cleanLabel(text(th), 'Field ' + (i + 1)));
  }

  function isActionCell(cell) {
    if (!cell) return false;
    const t = text(cell).toLowerCase();
    const links = cell.querySelectorAll('a,button').length;
    return links > 0 && (t.includes('edit') || t.includes('delete') || t.includes('view') || t.length < 40);
  }

  function isCheckboxCell(cell) {
    return !!cell && !!cell.querySelector('input[type="checkbox"]');
  }

  function rowStatus(row) {
    const t = text(row).toLowerCase();
    if (t.includes('disabled') || t.includes('inactive') || t.includes('draft')) return 'Disabled';
    if (t.includes('enabled') || t.includes('active') || t.includes('approved') || t.includes('default')) return 'Enabled';
    return 'Enabled';
  }

  function findEditLink(row) {
    const links = Array.from(row.querySelectorAll('a[href]'));
    return links.find(a => /edit|update|form/i.test(a.href + ' ' + text(a))) ||
      links.find(a => !/delete|remove|trash/i.test(a.href + ' ' + text(a))) ||
      null;
  }

  function rowTitle(cells) {
    for (const cell of cells) {
      if (isCheckboxCell(cell) || isActionCell(cell)) continue;
      const v = cleanValue(text(cell));
      if (v && v !== '-' && v.length <= 90) return v;
    }
    return cfg.entity;
  }

  function countActive(rows) {
    return rows.filter(r => rowStatus(r) === 'Enabled').length;
  }

  function countDefault(rows) {
    return rows.filter(r => /default|primary|yes|active/i.test(text(r))).length;
  }

  function buildStats(rows) {
    const total = rows.length;
    const active = countActive(rows);
    const inactive = Math.max(0, total - active);
    const special = countDefault(rows);

    const values = [total, active, inactive, special];

    const wrap = document.createElement('div');
    wrap.className = 'pmd-admin-universal-client-stats';
    wrap.dataset.pmdV30 = '1';

    cfg.stats.forEach((label, idx) => {
      const card = document.createElement('div');
      card.className = 'pmd-admin-universal-client-stat';
      card.dataset.pmdId = 'v29-stat-' + idx;
      card.innerHTML = `
        <div class="pmd-admin-universal-client-stat-label">${label}</div>
        <div class="pmd-admin-universal-client-stat-value">${values[idx]}</div>
        <div class="pmd-admin-universal-client-stat-icon">●</div>
      `;
      wrap.appendChild(card);
    });

    return wrap;
  }

  function buildCard(row, headers, index) {
    const cells = Array.from(row.children);
    const title = rowTitle(cells);
    const status = rowStatus(row);
    const edit = findEditLink(row);

    const card = document.createElement('article');
    card.className = 'pmd-admin-universal-client-row-card';
    card.dataset.pmdId = 'v29-' + path.replace(/[^a-z0-9]+/gi, '-') + '-' + index + '-' + title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40);

    const fields = [];
    cells.forEach((cell, i) => {
      if (isCheckboxCell(cell) || isActionCell(cell)) return;
      const val = cleanValue(text(cell));
      if (!val || val === title) return;
      fields.push({
        label: cleanLabel(headers[i], 'Detail'),
        value: val
      });
    });

    const shown = fields.slice(0, 5);

    card.innerHTML = `
      <div class="pmd-admin-universal-client-row-head">
        <div>
          <h3>${title}</h3>
          <span>${cfg.entity}</span>
        </div>
        <strong class="pmd-admin-universal-client-status">${status}</strong>
      </div>

      <div class="pmd-admin-universal-client-fields">
        ${shown.map(f => `
          <div class="pmd-admin-universal-client-field">
            <span>${f.label}</span>
            <strong>${f.value}</strong>
          </div>
        `).join('')}
      </div>

      <div class="pmd-admin-universal-client-actions">
        ${edit ? `<a class="btn btn-primary" href="${edit.href}">Edit</a>` : ''}
      </div>
    `;

    return card;
  }

  function applySavedHidden(grid) {
    try {
      const data = JSON.parse(localStorage.getItem(storageKey) || '{}') || {};
      const hidden = new Set(data.hidden || []);
      grid.querySelectorAll('[data-pmd-id]').forEach(el => {
        if (hidden.has(el.dataset.pmdId)) el.classList.add('pmd-ios-hidden');
      });
    } catch (_) {}
  }

  function saveHidden(grid) {
    try {
      const hidden = Array.from(grid.querySelectorAll('.pmd-ios-hidden'))
        .map(el => el.dataset.pmdId)
        .filter(Boolean);
      const data = JSON.parse(localStorage.getItem(storageKey) || '{}') || {};
      data.hidden = hidden;
      localStorage.setItem(storageKey, JSON.stringify(data));
    } catch (_) {}
  }

  function ensureToolbar() {
    if (document.querySelector('.pmd-ios-layout-toolbar')) return;

    const toolbar = document.createElement('div');
    toolbar.className = 'pmd-ios-layout-toolbar';
    toolbar.innerHTML = `
      <button type="button" class="pmd-ios-tool-btn pmd-ios-edit-toggle">Edit Layout</button>
      <button type="button" class="pmd-ios-tool-btn pmd-ios-remove-selected" disabled>Remove Selected</button>
      <button type="button" class="pmd-ios-tool-btn pmd-ios-restore-all">Restore All</button>
    `;

    const header =
      document.querySelector('.page-header') ||
      document.querySelector('.page-title') ||
      document.querySelector('.navbar .navbar-right') ||
      pageWrapper();

    header.appendChild(toolbar);

    const edit = toolbar.querySelector('.pmd-ios-edit-toggle');
    const remove = toolbar.querySelector('.pmd-ios-remove-selected');
    const restore = toolbar.querySelector('.pmd-ios-restore-all');

    function updateRemove() {
      const n = document.querySelectorAll('.pmd-ios-selected').length;
      remove.disabled = n < 1;
      remove.textContent = n ? `Remove Selected (${n})` : 'Remove Selected';
    }

    edit.addEventListener('click', () => {
      const on = !document.body.classList.contains('pmd-ios-edit-mode');
      document.body.classList.toggle('pmd-ios-edit-mode', on);
      edit.textContent = on ? 'Done' : 'Edit Layout';
      if (!on) {
        document.querySelectorAll('.pmd-ios-selected').forEach(el => el.classList.remove('pmd-ios-selected'));
        updateRemove();
      }
    });

    remove.addEventListener('click', () => {
      const grid = document.querySelector('.pmd-admin-universal-client-card-grid');
      document.querySelectorAll('.pmd-ios-selected').forEach(el => {
        el.classList.remove('pmd-ios-selected');
        el.classList.add('pmd-ios-hidden');
      });
      if (grid) saveHidden(grid);
      updateRemove();
    });

    restore.addEventListener('click', () => {
      const grid = document.querySelector('.pmd-admin-universal-client-card-grid');
      document.querySelectorAll('.pmd-ios-hidden, .pmd-ios-selected').forEach(el => {
        el.classList.remove('pmd-ios-hidden', 'pmd-ios-selected');
      });
      if (grid) saveHidden(grid);
      updateRemove();
    });

    document.addEventListener('click', e => {
      if (!document.body.classList.contains('pmd-ios-edit-mode')) return;
      const card = e.target.closest('.pmd-admin-universal-client-stat, .pmd-admin-universal-client-row-card');
      if (!card) return;
      if (e.target.closest('a,button,input,select,textarea')) return;
      card.classList.toggle('pmd-ios-selected');
      updateRemove();
    }, true);
  }

  function render() {
    if (document.querySelector('.pmd-admin-universal-client-card-grid')) return;

    const table = findMainTable();
    if (!table) return;

    const rows = Array.from(table.querySelectorAll('tbody tr')).filter(row => text(row));
    if (!rows.length) return;

    const headers = getHeaders(table);
    const wrap = pageWrapper();

    document.body.classList.add(
      'pmd-admin-universal-client-list-active',
      'pmd-admin-universal-v30-active',
      'pmd-admin-page-' + path.split('/').filter(Boolean).pop()
    );

    const stats = buildStats(rows);

    const grid = document.createElement('div');
    grid.className = 'pmd-admin-universal-client-card-grid';
    grid.dataset.pmdV30 = '1';

    rows.forEach((row, i) => grid.appendChild(buildCard(row, headers, i)));
    applySavedHidden(grid);

    const host = table.closest('.table-responsive, .card, .panel, .box') || table;

    /*
     * v30 safety:
     * Do not insert into pageWrapper using a reference that is not its direct child.
     * Some TastyIgniter pages have nested list/table wrappers.
     */
    const insertionParent = host.parentElement || wrap;
    const insertionRef = host.parentElement ? host : null;

    try {
      if (insertionRef && insertionRef.parentElement === insertionParent) {
        insertionParent.insertBefore(stats, insertionRef);
        insertionParent.insertBefore(grid, insertionRef);
      } else {
        insertionParent.appendChild(stats);
        insertionParent.appendChild(grid);
      }

      /*
       * Hide legacy table only after cards were inserted successfully.
       * This prevents white pages if something goes wrong.
       */
      host.style.display = 'none';

      ensureToolbar();

      console.info('[PMD] Universal More Pages Fallback v30 rendered', {
        path,
        rows: rows.length,
        title: cfg.title,
        insertionParent: insertionParent.className || insertionParent.tagName
      });
    } catch (err) {
      console.error('[PMD] Universal More Pages Fallback v30 failed safely', err);

      try {
        stats.remove();
        grid.remove();
        host.style.display = '';
      } catch (_) {}
    }
  }

  function boot() {
    setTimeout(render, 120);
    setTimeout(render, 600);
    setTimeout(render, 1400);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();

/* PMD Universal V30 Sortable Binder v32
 * Adds real Sortable instances to v30 fallback pages.
 * Keeps v20 FLIP + v26 slow drop + v28 scroll lock working.
 */
(function () {
  'use strict';

  if (window.PMDUniversalV30SortableV32Started) return;
  window.PMDUniversalV30SortableV32Started = true;

  const supported = [
    '/admin/menus',
    '/admin/themes',
    '/admin/mail_templates',
    '/admin/reviews',
    '/admin/countries',
    '/admin/currencies',
    '/admin/languages',
    '/admin/tips',
    '/admin/payments'
  ];

  const path = window.location.pathname.replace(/\/+$/, '');
  if (!supported.includes(path)) return;

  const storageKey = 'pmd-ios-sortable-layout-v9:' + path;

  const state = {
    bound: 0,
    saves: 0,
    tries: 0
  };

  function isEditMode() {
    return document.body.classList.contains('pmd-ios-edit-mode');
  }

  function readState() {
    try {
      return JSON.parse(localStorage.getItem(storageKey) || '{}') || {};
    } catch (_) {
      return {};
    }
  }

  function writeState(data) {
    try {
      localStorage.setItem(storageKey, JSON.stringify(data || {}));
    } catch (_) {}
  }

  function children(container, selector) {
    if (!container) return [];
    return Array.from(container.querySelectorAll(':scope > ' + selector));
  }

  function applySavedOrder(container, selector, key) {
    const data = readState();
    const order = data.order && Array.isArray(data.order[key]) ? data.order[key] : null;
    if (!order || !order.length) return;

    const items = children(container, selector);
    const byId = new Map(items.map(el => [el.dataset.pmdId, el]));

    order.forEach(id => {
      const el = byId.get(id);
      if (el && el.parentElement === container) container.appendChild(el);
    });

    items.forEach(el => {
      if (el.parentElement === container && !order.includes(el.dataset.pmdId)) {
        container.appendChild(el);
      }
    });
  }

  function saveOrder() {
    const data = readState();
    data.order = data.order || {};

    const stats = document.querySelector('.pmd-admin-universal-client-stats');
    const grid = document.querySelector('.pmd-admin-universal-client-card-grid');

    if (stats) {
      data.order.stats = children(stats, '.pmd-admin-universal-client-stat')
        .map(el => el.dataset.pmdId)
        .filter(Boolean);
    }

    if (grid) {
      data.order.cards = children(grid, '.pmd-admin-universal-client-row-card')
        .map(el => el.dataset.pmdId)
        .filter(Boolean);
    }

    writeState(data);
    state.saves += 1;
  }

  function clearSelection() {
    document.querySelectorAll('.pmd-ios-selected').forEach(el => {
      el.classList.remove('pmd-ios-selected');
    });

    const remove = document.querySelector('.pmd-ios-remove-selected');
    if (remove) {
      remove.disabled = true;
      remove.textContent = 'Remove Selected';
    }
  }

  function bindOne(container, selector, key) {
    if (!container || !window.Sortable) return false;

    if (container.dataset.pmdUniversalV30SortableV32 === '1') {
      const existing = window.Sortable.get(container);
      if (existing) {
        try {
          existing.option('disabled', !isEditMode());
        } catch (_) {}
        return true;
      }
    }

    if (window.Sortable.get(container)) {
      const existing = window.Sortable.get(container);
      container.dataset.pmdUniversalV30SortableV32 = '1';
      try {
        existing.option('disabled', !isEditMode());
      } catch (_) {}
      return true;
    }

    applySavedOrder(container, selector, key);

    const sortable = window.Sortable.create(container, {
      draggable: '> ' + selector,
      animation: 420,
      easing: 'cubic-bezier(.16,1,.3,1)',
      forceFallback: false,
      fallbackOnBody: true,
      swapThreshold: 0.72,
      ghostClass: 'pmd-sortable-ghost',
      chosenClass: 'pmd-sortable-chosen',
      dragClass: 'pmd-sortable-drag',
      filter: 'a, button, input, select, textarea, label, .pmd-ios-layout-toolbar',
      preventOnFilter: false,
      disabled: !isEditMode(),

      onStart: function () {
        document.body.classList.add('pmd-ios-sorting');
      },

      onEnd: function () {
        document.body.classList.remove('pmd-ios-sorting');
        saveOrder();

        setTimeout(clearSelection, 80);
      }
    });

    if (sortable) {
      container.dataset.pmdUniversalV30SortableV32 = '1';
      state.bound += 1;

      /*
       * Nudge the v26/v28 observers so they can wrap the new Sortable instances.
       */
      document.body.classList.add('pmd-v30-sortable-v32-bound');
      setTimeout(() => document.body.classList.remove('pmd-v30-sortable-v32-bound'), 30);

      return true;
    }

    return false;
  }

  function bindAll() {
    state.tries += 1;

    const stats = document.querySelector('.pmd-admin-universal-client-stats');
    const grid = document.querySelector('.pmd-admin-universal-client-card-grid');

    const okStats = bindOne(stats, '.pmd-admin-universal-client-stat', 'stats');
    const okGrid = bindOne(grid, '.pmd-admin-universal-client-row-card', 'cards');

    document.body.classList.toggle('pmd-v30-sortable-v32-ready', !!(okStats || okGrid));

    return okStats || okGrid;
  }

  function setDisabledFromBody() {
    document.querySelectorAll('.pmd-admin-universal-client-stats, .pmd-admin-universal-client-card-grid').forEach(container => {
      if (!window.Sortable) return;
      const instance = window.Sortable.get(container);
      if (!instance) return;

      try {
        instance.option('disabled', !isEditMode());
      } catch (_) {}
    });
  }

  function boot() {
    bindAll();

    const timer = setInterval(() => {
      const ok = bindAll();
      setDisabledFromBody();

      if (ok && state.tries > 12) clearInterval(timer);
      if (state.tries > 80) clearInterval(timer);
    }, 150);

    const mo = new MutationObserver(() => {
      bindAll();
      setDisabledFromBody();
    });

    mo.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class']
    });

    document.addEventListener('click', function (e) {
      if (e.target.closest('.pmd-ios-edit-toggle')) {
        setTimeout(setDisabledFromBody, 20);
        setTimeout(setDisabledFromBody, 120);
      }
    }, true);

    window.PMDUniversalV30SortableV32Observer = mo;
  }

  window.PMDUniversalV30SortableV32 = {
    report() {
      const stats = document.querySelector('.pmd-admin-universal-client-stats');
      const grid = document.querySelector('.pmd-admin-universal-client-card-grid');

      return {
        page: path,
        ready: document.body.classList.contains('pmd-v30-sortable-v32-ready'),
        editMode: isEditMode(),
        bound: state.bound,
        saves: state.saves,
        tries: state.tries,
        sortableExists: !!window.Sortable,
        statsSortable: !!(window.Sortable && stats && window.Sortable.get(stats)),
        gridSortable: !!(window.Sortable && grid && window.Sortable.get(grid)),
        statsDisabled: !!(window.Sortable && stats && window.Sortable.get(stats) && window.Sortable.get(stats).option('disabled')),
        gridDisabled: !!(window.Sortable && grid && window.Sortable.get(grid) && window.Sortable.get(grid).option('disabled')),
        smoothV26: window.PMDPreCloneDropV26 && typeof window.PMDPreCloneDropV26.report === 'function'
          ? window.PMDPreCloneDropV26.report()
          : null,
        scrollLockV28: window.PMDDropScrollLockV28 && typeof window.PMDDropScrollLockV28.report === 'function'
          ? window.PMDDropScrollLockV28.report()
          : null
      };
    },

    rebind() {
      return bindAll();
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();


/* PMD New Pages Anti Flash Opacity v40
 * Safe anti-flash for new fallback pages only.
 * No root moving. No drag changes. Keeps old engine pages untouched.
 */
(function () {
  'use strict';

  if (window.PMDNewPagesAntiFlashV40Started) return;
  window.PMDNewPagesAntiFlashV40Started = true;

  const supported = [
    '/admin/menus',
    '/admin/mail_templates',
    '/admin/reviews',
    '/admin/countries',
    '/admin/currencies',
    '/admin/languages',
    '/admin/tips',
    '/admin/payments'
  ];

  const path = window.location.pathname.replace(/\/+$/, '');
  if (!supported.includes(path)) return;

  const state = {
    runs: 0,
    renderedAt: 0,
    hidden: 0,
    timeout: false,
    lastError: ''
  };

  function hasCards() {
    return !!(
      document.querySelector('.pmd-admin-universal-client-stats') &&
      document.querySelector('.pmd-admin-universal-client-card-grid') &&
      document.querySelector('.pmd-admin-universal-client-row-card')
    );
  }

  function isInsideUniversal(el) {
    return !!el.closest('.pmd-admin-universal-client-stats, .pmd-admin-universal-client-card-grid');
  }

  function hideLegacyAfterCards() {
    let count = 0;

    document.querySelectorAll(
      'table, .table-responsive, .control-list, .list-widget, .list-table, .list-footer, .pagination, .pagination-bar'
    ).forEach(el => {
      if (!el || isInsideUniversal(el)) return;
      if (el.dataset.pmdNewPagesLegacyHiddenV40 === '1') return;

      el.dataset.pmdNewPagesLegacyHiddenV40 = '1';
      el.style.setProperty('display', 'none', 'important');
      el.style.setProperty('visibility', 'hidden', 'important');
      el.style.setProperty('opacity', '0', 'important');
      count += 1;
    });

    state.hidden += count;
  }

  function markRendered() {
    if (!state.renderedAt) state.renderedAt = Math.round(performance.now());

    document.documentElement.classList.add('pmd-new-pages-antiflash-rendered-v40');
    document.documentElement.classList.remove('pmd-new-pages-antiflash-timeout-v40');
    document.body.classList.add('pmd-new-pages-antiflash-clean-v40');
  }

  function run() {
    state.runs += 1;

    try {
      if (hasCards()) {
        hideLegacyAfterCards();
        markRendered();

        if (
          window.PMDUniversalV30SortableV32 &&
          typeof window.PMDUniversalV30SortableV32.rebind === 'function'
        ) {
          window.PMDUniversalV30SortableV32.rebind();
        }

        return true;
      }

      return false;
    } catch (err) {
      state.lastError = String(err && err.message ? err.message : err);
      document.documentElement.classList.add('pmd-new-pages-antiflash-timeout-v40');
      console.error('[PMD] New Pages Anti Flash Opacity v40 failed safely', err);
      return false;
    }
  }

  function boot() {
    run();

    let tries = 0;
    const timer = setInterval(() => {
      tries += 1;
      const ok = run();

      if (ok && tries > 8) clearInterval(timer);

      if (tries > 55) {
        state.timeout = true;
        document.documentElement.classList.add('pmd-new-pages-antiflash-timeout-v40');
        clearInterval(timer);
      }
    }, 100);

    const mo = new MutationObserver(() => run());
    mo.observe(document.body, { childList: true, subtree: true });
    window.PMDNewPagesAntiFlashV40Observer = mo;
  }

  window.PMDNewPagesAntiFlashV40 = {
    report() {
      return {
        page: path,
        runs: state.runs,
        rendered: document.documentElement.classList.contains('pmd-new-pages-antiflash-rendered-v40'),
        renderedAt: state.renderedAt,
        timeout: document.documentElement.classList.contains('pmd-new-pages-antiflash-timeout-v40'),
        hidden: state.hidden,
        legacyHidden: document.querySelectorAll('[data-pmd-new-pages-legacy-hidden-v40="1"]').length,
        cards: document.querySelectorAll('.pmd-admin-universal-client-row-card').length,
        stats: document.querySelectorAll('.pmd-admin-universal-client-stat').length,
        badV37Root: !!document.querySelector('.pmd-universal-engine-root-v37'),
        lastError: state.lastError,
        v32Exists: !!window.PMDUniversalV30SortableV32,
        v26Exists: !!window.PMDPreCloneDropV26,
        v28Exists: !!window.PMDDropScrollLockV28
      };
    },

    rerun() {
      return run();
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();

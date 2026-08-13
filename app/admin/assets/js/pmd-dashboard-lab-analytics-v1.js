(function () {
  'use strict';

  var path = String(window.location.pathname || '').replace(/\/+$/, '');
  if (path !== '/admin/dashboardlab') return;

  var root = document.getElementById('pmd-dashboard-lab-analytics-v1');
  if (!root) return;

  var VERSION = '1.0.0-clean-lab-analytics';
  var ENDPOINT = '/admin/dashboardlab?pmd_analytics=1';
  var CHART_MODE_KEY = 'pmd.dashboardlab.salesChartMode.v1';
  var PERIOD_KEYS = ['today', 'week', 'month'];
  var cache = Object.create(null);
  var requests = Object.create(null);
  var requestCount = 0;
  var errors = Object.create(null);
  var chartMode = 'line';
  var salesVisible = null;
  var hourVisible = null;
  var periodByWidget = {
    categorySales: 'month',
    paymentMethods: 'month',
    channelSplit: 'month',
    topItems: 'month'
  };

  /* PMD_DASHBOARD_LAB_ANALYTICS_SCROLL_FIRSTPAINT_V2 */
  var bootSource = 'network-fallback';
  var bootNetworkRequests = 0;
  var bootCompleted = false;
  var serverBootstrapReady = false;
  /* PMD_DASHBOARD_LAB_ANALYTICS_SERVER_DOM_V3 */
  var serverDomReady = root.getAttribute('data-pmd-lab-server-rendered') === 'true';
  var bootRenderSkipped = false;

  function readServerBootstrap() {
    var node = document.getElementById(
      'pmd-dashboard-lab-analytics-bootstrap-v2'
    );

    if (!node) return null;

    try {
      var payload = JSON.parse(node.textContent || '{}');
      var periods = payload && payload.periods;
      var last30 = periods && periods.last30;
      var month = periods && periods.month;

      if (
        payload &&
        payload.server_first_paint === true &&
        last30 &&
        last30.success === true &&
        month &&
        month.success === true
      ) {
        return {
          last30: last30,
          month: month
        };
      }
    } catch (error) {
      console.warn(
        '[PMD Dashboard Lab Analytics] invalid server bootstrap',
        error
      );
    }

    return null;
  }

  var initialBootstrap = readServerBootstrap();

  if (initialBootstrap) {
    cache.last30 = initialBootstrap.last30;
    cache.month = initialBootstrap.month;
    bootSource = 'server';
    serverBootstrapReady = true;
  }

  try {
    chartMode = localStorage.getItem(CHART_MODE_KEY) === 'bar' ? 'bar' : 'line';
  } catch (error) {}

  if (serverDomReady) {
    chartMode = root.getAttribute('data-pmd-lab-initial-chart-mode') === 'bar'
      ? 'bar'
      : 'line';
    bootSource = 'server-dom';
  }

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (character) {
      return {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
      }[character];
    });
  }

  function bodyFor(key) {
    var card = root.querySelector('[data-pmd-lab-analytics-widget="' + key + '"]');
    return card ? card.querySelector('[data-pmd-lab-widget-body]') : null;
  }

  function setBusy(key, busy) {
    var card = root.querySelector('[data-pmd-lab-analytics-widget="' + key + '"]');
    var body = bodyFor(key);
    if (card) card.setAttribute('aria-busy', busy ? 'true' : 'false');
    if (body) body.setAttribute('data-pmd-lab-state', busy ? 'loading' : 'ready');
  }

  function endpoint(period) {
    return ENDPOINT + '&period=' + encodeURIComponent(period);
  }

  function request(period) {
    period = ['today', 'week', 'month', 'last30'].indexOf(period) !== -1
      ? period
      : 'month';

    if (cache[period]) return Promise.resolve(cache[period]);
    if (requests[period]) return requests[period];

    requestCount += 1;
    if (!bootCompleted) bootNetworkRequests += 1;

    requests[period] = fetch(endpoint(period), {
      credentials: 'same-origin',
      cache: 'no-store',
      headers: {Accept: 'application/json'}
    })
      .then(function (response) {
        if (!response.ok) throw new Error('HTTP ' + response.status);
        return response.json();
      })
      .then(function (payload) {
        if (!payload || payload.success !== true) {
          throw new Error((payload && payload.reason) || 'Invalid analytics payload');
        }
        cache[period] = payload;
        delete errors[period];
        return payload;
      })
      .catch(function (error) {
        errors[period] = String(error && error.message ? error.message : error);
        delete requests[period];
        throw error;
      });

    return requests[period];
  }

  function money(value, payload) {
    var code = payload && payload.currency ? payload.currency : 'EUR';
    try {
      return new Intl.NumberFormat(document.documentElement.lang || 'en-US', {
        style: 'currency',
        currency: code,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(Number(value || 0));
    } catch (error) {
      return Number(value || 0).toFixed(2) + ' ' + code;
    }
  }

  function empty(source) {
    var message = source && (source.reason || source.source)
      ? source.reason || source.source
      : 'No records';
    return '<p class="pmd-dashboard-lab-empty">' + esc(message) + '</p>';
  }

  function list(rows, render) {
    if (!Array.isArray(rows) || !rows.length) return empty();
    return '<ul class="pmd-dashboard-lab-list">' + rows.map(function (row) {
      return '<li>' + render(row) + '</li>';
    }).join('') + '</ul>';
  }

  function niceScale(rawMaximum) {
    var maximum = Math.max(1, Number(rawMaximum || 0));
    var rough = maximum / 4;
    var magnitude = Math.pow(10, Math.floor(Math.log10(rough)));
    var normalized = rough / magnitude;
    var stepBase = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 2.5 ? 2.5 : normalized <= 5 ? 5 : 10;
    var step = stepBase * magnitude;
    var max = Math.ceil(maximum / step) * step;
    var ticks = [];
    for (var value = 0; value <= max + step / 10; value += step) {
      ticks.push(Number(value.toFixed(8)));
    }
    return {max: max, step: step, ticks: ticks};
  }

  function shortLabel(row, hourly) {
    if (hourly) return String(Number(row.hour || 0)).padStart(2, '0') + ':00';
    var raw = String(row.bucket || '');
    if (!raw) return '';
    try {
      var parsed = new Date(raw.length === 10 ? raw + 'T12:00:00' : raw.replace(' ', 'T'));
      return new Intl.DateTimeFormat(document.documentElement.lang || 'en-US', {
        day: '2-digit',
        month: 'short'
      }).format(parsed);
    } catch (error) {
      return raw.slice(5, 10);
    }
  }

  function chartGrid(scale, dimensions, payload) {
    return scale.ticks.map(function (value) {
      var ratio = value / scale.max;
      var y = dimensions.top + dimensions.plotH - dimensions.plotH * ratio;
      return '<line class="pmd-lab-chart-grid-line" x1="' + dimensions.left + '" y1="' + y + '" x2="' + (dimensions.w - dimensions.right) + '" y2="' + y + '"></line>' +
        '<text class="pmd-lab-chart-axis-label" x="' + (dimensions.left - 14) + '" y="' + (y + 4) + '" text-anchor="end">' + esc(money(value, payload)) + '</text>';
    }).join('');
  }

  function chartRows(rows, visible) {
    if (!Array.isArray(rows)) return [];
    if (!visible || visible >= rows.length) return rows.slice();
    return rows.slice(Math.max(0, rows.length - visible));
  }

  function svgLine(allRows, payload, visible) {
    var rows = chartRows(allRows, visible);
    if (!rows.length) return empty();

    var values = rows.map(function (row) { return Number(row.sales || 0); });
    var scale = niceScale(Math.max.apply(null, values.concat([1])));
    var d = {w: 900, h: 330, left: 82, right: 18, top: 14, bottom: 42};
    d.plotW = d.w - d.left - d.right;
    d.plotH = d.h - d.top - d.bottom;
    var base = d.top + d.plotH;

    var points = rows.map(function (row, index) {
      return {
        x: d.left + d.plotW * (rows.length === 1 ? 0.5 : index / (rows.length - 1)),
        y: d.top + d.plotH - d.plotH * Number(row.sales || 0) / scale.max,
        row: row,
        value: Number(row.sales || 0)
      };
    });

    var poly = points.map(function (point) { return point.x + ',' + point.y; }).join(' ');
    var area = d.left + ',' + base + ' ' + poly + ' ' + (d.w - d.right) + ',' + base;
    var labelEvery = Math.max(1, Math.ceil(rows.length / 7));
    var labels = points.map(function (point, index) {
      if (index % labelEvery !== 0 && index !== points.length - 1) return '';
      return '<text class="pmd-lab-chart-axis-label" x="' + point.x + '" y="' + (d.h - 12) + '" text-anchor="middle">' + esc(shortLabel(point.row, false)) + '</text>';
    }).join('');
    var circles = points.map(function (point) {
      if (point.value <= 0) return '';
      return '<circle class="pmd-lab-chart-point" cx="' + point.x + '" cy="' + point.y + '" r="4"><title>' + esc(shortLabel(point.row, false) + ' - ' + money(point.row.sales, payload)) + '</title></circle>';
    }).join('');

    return '<svg viewBox="0 0 900 330" role="img" aria-label="Sales over time line chart">' +
      chartGrid(scale, d, payload) +
      '<line class="pmd-lab-chart-axis" x1="' + d.left + '" y1="' + base + '" x2="' + (d.w - d.right) + '" y2="' + base + '"></line>' +
      '<polygon class="pmd-lab-chart-area" points="' + area + '"></polygon>' +
      '<polyline class="pmd-lab-chart-line" points="' + poly + '"></polyline>' +
      circles + labels +
      '</svg>';
  }

  function svgBars(allRows, payload, visible, hourly, ariaLabel) {
    var rows = chartRows(allRows, visible);
    if (!rows.length) return empty();

    var values = rows.map(function (row) { return Number(row.sales || 0); });
    var scale = niceScale(Math.max.apply(null, values.concat([1])));
    var d = {w: 900, h: 330, left: 82, right: 18, top: 14, bottom: 42};
    d.plotW = d.w - d.left - d.right;
    d.plotH = d.h - d.top - d.bottom;
    var base = d.top + d.plotH;
    var slot = d.plotW / Math.max(rows.length, 1);
    var barWidth = Math.max(5, Math.min(28, slot * .58));
    var labelEvery = Math.max(1, Math.ceil(rows.length / 8));

    var bars = rows.map(function (row, index) {
      var value = Number(row.sales || 0);
      var x = d.left + slot * index + slot / 2 - barWidth / 2;
      var height = d.plotH * value / scale.max;
      var y = base - height;
      return '<rect class="pmd-lab-chart-bar' + (value <= 0 ? ' is-zero' : '') + '" x="' + x + '" y="' + y + '" width="' + barWidth + '" height="' + Math.max(2, height) + '" rx="3"><title>' + esc(shortLabel(row, hourly) + ' - ' + money(value, payload)) + '</title></rect>';
    }).join('');

    var labels = rows.map(function (row, index) {
      if (index % labelEvery !== 0 && index !== rows.length - 1) return '';
      var x = d.left + slot * index + slot / 2;
      return '<text class="pmd-lab-chart-axis-label" x="' + x + '" y="' + (d.h - 12) + '" text-anchor="middle">' + esc(shortLabel(row, hourly)) + '</text>';
    }).join('');

    return '<svg viewBox="0 0 900 330" role="img" aria-label="' + esc(ariaLabel || 'Sales bar chart') + '">' +
      chartGrid(scale, d, payload) +
      '<line class="pmd-lab-chart-axis" x1="' + d.left + '" y1="' + base + '" x2="' + (d.w - d.right) + '" y2="' + base + '"></line>' +
      bars + labels +
      '</svg>';
  }

  function chartMarkup(key, rows, payload, mode, visible, hourly) {
    var total = Array.isArray(rows) ? rows.length : 0;
    var min = Math.min(hourly ? 4 : 5, Math.max(total, 1));
    var max = Math.max(total, min);
    var value = Math.max(min, Math.min(Number(visible || max), max));
    var svg = mode === 'line'
      ? svgLine(rows, payload, value)
      : svgBars(rows, payload, value, hourly, hourly ? 'Sales by hour bar chart' : 'Sales over time bar chart');

    return '<div class="pmd-dashboard-lab-chart">' +
      '<div class="pmd-dashboard-lab-chart__frame">' + svg + '</div>' +
      '</div>';
  }

  function donut(rows, nameKey, valueKey, payload, labelFn) {
    rows = Array.isArray(rows) ? rows.slice(0, 6) : [];
    if (!rows.length) return empty();

    var colors = ['#00a676', '#2563eb', '#ff8a00', '#d946ef', '#06b6d4', '#ef4444'];
    var values = rows.map(function (row) { return Math.max(0, Number(row[valueKey] || 0)); });
    var total = values.reduce(function (sum, value) { return sum + value; }, 0);
    var offset = 0;

    var circles = rows.map(function (row, index) {
      var pct = total > 0 ? values[index] / total * 100 : 0;
      var markup = '<circle cx="60" cy="60" r="45" pathLength="100" fill="none" stroke="' + colors[index % colors.length] + '" stroke-width="18" stroke-dasharray="' + pct + ' ' + (100 - pct) + '" stroke-dashoffset="-' + offset + '"><title>' + esc(String(row[nameKey] || '') + ' - ' + pct.toFixed(1) + '%') + '</title></circle>';
      offset += pct;
      return markup;
    }).join('');

    var legend = '<ul class="pmd-dashboard-lab-donut__legend">' + rows.map(function (row, index) {
      var pct = total > 0 ? values[index] / total * 100 : 0;
      var shown = labelFn ? labelFn(row, pct) : money(row[valueKey], payload) + ' - ' + pct.toFixed(1) + '%';
      return '<li><i style="background:' + colors[index % colors.length] + '"></i><span>' + esc(row[nameKey] || '') + '</span><b>' + esc(shown) + '</b></li>';
    }).join('') + '</ul>';

    return '<div class="pmd-dashboard-lab-donut">' +
      '<svg viewBox="0 0 120 120" role="img" aria-label="Breakdown chart">' +
        '<circle cx="60" cy="60" r="45" pathLength="100" fill="none" stroke="#edf1ef" stroke-width="18"></circle>' +
        circles +
      '</svg>' + legend +
      '</div>';
  }

  function renderSales(payload) {
    var source = payload && payload.sales_over_time;
    var body = bodyFor('salesOverTime');
    if (!body) return;
    if (!source || source.available === false) {
      body.innerHTML = empty(source);
      setBusy('salesOverTime', false);
      return;
    }
    var rows = Array.isArray(source.buckets) ? source.buckets : [];
    if (salesVisible === null) salesVisible = Math.min(19, Math.max(rows.length, 1));
    body.innerHTML = chartMarkup('salesOverTime', rows, payload, chartMode, salesVisible, false);
    root.querySelectorAll('[data-pmd-lab-chart-mode]').forEach(function (button) {
      var active = button.getAttribute('data-pmd-lab-chart-mode') === chartMode;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
    setBusy('salesOverTime', false);
  }

  function renderHour(payload) {
    var source = payload && payload.sales_by_hour;
    var body = bodyFor('salesByHour');
    if (!body) return;
    if (!source || source.available === false) {
      body.innerHTML = empty(source);
      setBusy('salesByHour', false);
      return;
    }
    var rows = Array.isArray(source.hours) ? source.hours : [];
    if (hourVisible === null) hourVisible = Math.min(15, Math.max(rows.length, 1));
    body.innerHTML = chartMarkup('salesByHour', rows, payload, 'bar', hourVisible, true);
    setBusy('salesByHour', false);
  }

  function renderTopItems(payload) {
    var source = payload && payload.top_items;
    var body = bodyFor('topItems');
    if (!body) return;
    if (!source || source.available === false || source.empty) {
      body.innerHTML = empty(source);
    } else {
      /* PMD_DASHBOARD_LAB_ANALYTICS_REFINEMENT_V6 */
      body.innerHTML = list((source.items || []).slice(0, 4), function (row) {
        return '<span>' + esc(row.name || '') + '</span><b>' + esc(Number(row.quantity || 0) + ' - ' + money(row.revenue, payload)) + '</b>';
      });
    }
    setBusy('topItems', false);
  }

  function renderCategory(payload) {
    var source = payload && payload.sales_by_category;
    var body = bodyFor('categorySales');
    if (!body) return;
    if (!source || source.available === false || source.empty) {
      body.innerHTML = empty(source);
    } else {
      body.innerHTML = donut(source.categories, 'category', 'revenue', payload, function (row, pct) {
        return money(row.revenue, payload) + ' - ' + pct.toFixed(1) + '%';
      });
    }
    setBusy('categorySales', false);
  }

  function renderPayments(payload) {
    var source = payload && payload.payment_methods;
    var body = bodyFor('paymentMethods');
    if (!body) return;
    if (!source || source.available === false || source.empty) {
      body.innerHTML = empty(source);
    } else {
      body.innerHTML = donut(source.methods, 'method', 'total', payload, function (row, pct) {
        return money(row.total, payload) + ' - ' + pct.toFixed(1) + '%';
      });
    }
    setBusy('paymentMethods', false);
  }

  /* PMD_DASHBOARD_LAB_BINARY_CHANNELS_V7
   * Mirror Dashboard2's binary KPI semantics in the Lab renderer.
   */
  function binaryChannelRows(rows) {
    var buckets = {
      dine: {channel: 'Dine in', orders: 0, revenue: 0},
      take: {channel: 'Takeaway', orders: 0, revenue: 0}
    };

    (Array.isArray(rows) ? rows : []).forEach(function (row) {
      var raw = String((row && row.channel) || '')
        .trim()
        .toLowerCase()
        .replace(/_/g, ' ');
      var orders = Number((row && row.orders) || 0);
      var revenue = Number((row && row.revenue) || 0);

      if ([
        'collection',
        'takeaway',
        'take-away',
        'take away',
        'pickup',
        'pick-up'
      ].indexOf(raw) !== -1) {
        buckets.take.orders += orders;
        buckets.take.revenue += revenue;
        return;
      }

      if ([
        'delivery',
        'delivered',
        'cashier'
      ].indexOf(raw) !== -1) {
        return;
      }

      buckets.dine.orders += orders;
      buckets.dine.revenue += revenue;
    });

    return [buckets.dine, buckets.take];
  }

  function renderChannels(payload) {
    var source = payload && payload.channels;
    var body = bodyFor('channelSplit');
    if (!body) return;
    if (!source || source.available === false || source.empty) {
      body.innerHTML = empty(source);
    } else {
      body.innerHTML = donut(binaryChannelRows(source.channels), 'channel', 'revenue', payload, function (row, pct) {
        return Number(row.orders || 0) + ' - ' + money(row.revenue, payload) + ' - ' + pct.toFixed(1) + '%';
      });
    }
    setBusy('channelSplit', false);
  }

  /* PMD_DASHBOARD_LAB_COMPACT_CONTROLS_LIVE_REVIEWS_V8_2 */
  function renderLive(payload) {
    var source = payload && payload.live_operations;
    var body = bodyFor('liveOperations');
    if (!body) return;

    var count = source && source.available !== false
      ? Number(source.live_order_count || 0)
      : 0;
    var heading = document.querySelector('[data-pmd-lab-live-heading]');
    if (heading) {
      var singular = heading.getAttribute('data-singular') || 'live order';
      var plural = heading.getAttribute('data-plural') || 'live orders';
      heading.innerHTML =
        '<span class="pmd-dashboard-lab-live-heading__count" data-pmd-lab-live-heading-count>' + esc(count) + '</span>' +
        '<span class="pmd-dashboard-lab-live-heading__label" data-pmd-lab-live-heading-label>' +
          esc(count === 1 ? singular : plural) +
        '</span>';
    }

    if (!source || source.available === false) {
      body.innerHTML = empty(source);
    } else {
      body.innerHTML = list((source.orders || []).slice(0, 5), function (row) {
        return '<span>#' + esc(row.order_id) + ' - ' + esc(row.channel || '') + '</span><b>' + esc(row.status || 'Open') + '</b>';
      });
    }
    setBusy('liveOperations', false);
  }

  function renderTransactions(payload) {
    var source = payload && payload.recent_transactions;
    var body = bodyFor('recentTransactions');
    if (!body) return;
    if (!source || source.available === false || source.empty) {
      body.innerHTML = empty(source);
    } else {
      body.innerHTML = list((source.transactions || []).slice(0, 5), function (row) {
        var timestamp = String(row.timestamp || '');
        var match = timestamp.match(/(?:T|\s)(\d{2}:\d{2})(?::\d{2})?/);
        var time = match ? match[1] : timestamp.slice(0, 5);
        var method = row.method ? ' - ' + row.method : '';
        return '<span>#' + esc(row.order_id) + esc(method) + ' - ' + esc(time) + '</span><b>' + esc(money(row.amount, payload)) + '</b>';
      });
    }
    setBusy('recentTransactions', false);
  }

  function renderAlerts(payload) {
    var source = payload && payload.alerts;
    var body = bodyFor('alerts');
    if (!body) return;
    if (!source || source.available === false || !source.types) {
      body.innerHTML = empty(source);
    } else {
      var rows = Object.keys(source.types).map(function (key) {
        var label = key.replace(/_/g, ' ');
        if (key === 'long_open_tables' && source.long_open_threshold_minutes) {
          label += ' (> ' + source.long_open_threshold_minutes + ' min)';
        }
        return {label: label, value: source.types[key]};
      });
      body.innerHTML = list(rows, function (row) {
        return '<span>' + esc(row.label) + '</span><b>' + esc(row.value == null ? 'Source unavailable' : row.value) + '</b>';
      });
    }
    setBusy('alerts', false);
  }

  /* PMD_DASHBOARD_LAB_CONTENT_REFINEMENT_V8 */
  function renderReviews(payload) {
    var source = payload && payload.reviews;
    var body = bodyFor('reviews');
    if (!body) return;
    if (!source || source.available === false) {
      body.innerHTML = empty(source);
    } else {
      var count = Number(source.count || 0);
      /* PMD_DASHBOARD_LAB_RANGE_REVIEWS_V8_3_4 */
      var rows = (source.latest || []).slice(0, 5);
      /* PMD_DASHBOARD_LAB_REVIEWS_PAYMENT_POLISH_V8_1 */
      var reviewHeading = document.querySelector('[data-pmd-lab-review-heading]');
      if (reviewHeading) {
        reviewHeading.innerHTML =
          '<span class="pmd-dashboard-lab-review-heading__count" data-pmd-lab-review-heading-count>' + esc(count) + '</span>' +
          '<span class="pmd-dashboard-lab-review-heading__label" data-pmd-lab-review-heading-label>' +
            (count === 1 ? 'review today' : 'reviews today') +
          '</span>';
      }
      body.innerHTML =
        '<ul class="pmd-dashboard-lab-review-list">' +
          rows.map(function (row) {
            var reviewer = String(row.reviewer || '').trim();
            if (reviewer.toLowerCase().replace(/\s+/g, ' ') === 'checkout guest') {
              reviewer = '';
            }
            var comment = String(row.comment || '').trim();
            var inlineReview =
              (reviewer ? '<strong>' + esc(reviewer) + '</strong>' : '') +
              (comment ? '<span>' + esc(comment) + '</span>' : '');
            return '<li>' +
              '<div class="pmd-dashboard-lab-review-line">' +
                '<span class="pmd-dashboard-lab-review-stars">' + esc(row.stars || '') + '</span>' +
                '<span class="pmd-dashboard-lab-review-inline-copy">' + inlineReview + '</span>' +
                '<b class="pmd-dashboard-lab-review-time">' + esc(row.time || '') + '</b>' +
              '</div>' +
            '</li>';
          }).join('') +
        '</ul>';
    }
    setBusy('reviews', false);
  }

  function renderTips(payload) {
    var source = payload && payload.tips;
    var body = bodyFor('tips');
    if (!body) return;
    if (!source || source.available === false) {
      body.innerHTML = empty(source);
    } else {
      body.innerHTML = '<dl class="pmd-dashboard-lab-stats">' +
        '<div><dt>Today</dt><dd>' + esc(money(source.today, payload)) + '</dd></div>' +
        '<div><dt>This month</dt><dd>' + esc(money(source.month, payload)) + '</dd></div>' +
        '<div><dt>Average</dt><dd>' + esc(money(source.average_tip, payload)) + '</dd></div>' +
        '<div><dt>Tipped orders</dt><dd>' + esc(source.tipped_orders || 0) + '</dd></div>' +
        '</dl>';
    }
    setBusy('tips', false);
  }

  function renderCalendar(payload) {
    var source = payload && payload.calendar_events;
    var body = bodyFor('calendarEvents');
    if (!body) return;
    if (!source || source.available === false) {
      body.innerHTML = empty(source);
    } else {
      var count = Number(source.count || 0);
      var headingCount = document.querySelector('[data-pmd-lab-event-heading-count]');
      if (headingCount) headingCount.textContent = String(count);
      var rows = (source.events || []).slice(0, 4);
      body.innerHTML =
        '<ul class="pmd-dashboard-lab-event-list">' +
          rows.map(function (row) {
            var tableDisplay = String(row.table_display || '').trim();
            var guests = Math.max(0, Number(row.guests || 0));
            var id = Number(row.reservation_id || 0);
            return '<li>' +
              '<div class="pmd-dashboard-lab-event-copy">' +
                '<strong>Reservation</strong>' +
                '<span>#' + esc(id) +
                  (tableDisplay ? ' · ' + esc(tableDisplay) : '') +
                  ' · ' + esc(guests) + ' pax</span>' +
              '</div>' +
              '<b>' + esc(row.time || '') + '</b>' +
            '</li>';
          }).join('') +
        '</ul>';
    }
    setBusy('calendarEvents', false);
  }

  function renderBase(payload) {
    renderSales(payload);
    renderHour(payload);
    renderLive(payload);
    renderTransactions(payload);
    renderAlerts(payload);
    renderReviews(payload);
    renderTips(payload);
    renderCalendar(payload);
  }

  function renderPeriodWidget(key, payload) {
    if (key === 'categorySales') renderCategory(payload);
    if (key === 'paymentMethods') renderPayments(payload);
    if (key === 'channelSplit') renderChannels(payload);
    if (key === 'topItems') renderTopItems(payload);
  }

  function markPeriod(key, period) {
    var card = root.querySelector('[data-pmd-lab-analytics-widget="' + key + '"]');
    if (!card) return;
    card.querySelectorAll('[data-pmd-lab-period]').forEach(function (button) {
      var active = button.getAttribute('data-pmd-lab-period') === period;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
  }

  function loadPeriodWidget(key, period) {
    if (PERIOD_KEYS.indexOf(period) === -1) return;
    periodByWidget[key] = period;
    markPeriod(key, period);
    setBusy(key, true);
    request(period)
      .then(function (payload) {
        if (periodByWidget[key] !== period) return;
        renderPeriodWidget(key, payload);
      })
      .catch(function (error) {
        if (periodByWidget[key] !== period) return;
        var body = bodyFor(key);
        if (body) body.innerHTML = empty({reason: 'Analytics source unavailable'});
        setBusy(key, false);
        console.warn('[PMD Dashboard Lab Analytics] period request failed', key, period, error);
      });
  }

  root.addEventListener('click', function (event) {
    var chartButton = event.target.closest('[data-pmd-lab-chart-mode]');
    if (chartButton && root.contains(chartButton)) {
      event.preventDefault();
      chartMode = chartButton.getAttribute('data-pmd-lab-chart-mode') === 'bar' ? 'bar' : 'line';
      try { localStorage.setItem(CHART_MODE_KEY, chartMode); } catch (error) {}
      try {
        document.cookie =
          'pmd_dashboard_lab_sales_chart_mode=' +
          encodeURIComponent(chartMode) +
          '; path=/admin; max-age=31536000; samesite=lax';
      } catch (error) {}
      if (cache.last30) renderSales(cache.last30);
      return;
    }

    var periodButton = event.target.closest('[data-pmd-lab-period]');
    if (periodButton && root.contains(periodButton)) {
      event.preventDefault();
      var card = periodButton.closest('[data-pmd-lab-analytics-widget]');
      if (!card) return;
      var key = card.getAttribute('data-pmd-lab-analytics-widget');
      var period = periodButton.getAttribute('data-pmd-lab-period');
      loadPeriodWidget(key, period);
    }
  });

  /* PMD_DASHBOARD_LAB_CUSTOM_VERTICAL_RANGE_V7_3
   * Safari-independent vertical chart-window control.
   * Pointer/keyboard events only. No timers, observers, RAF, or layout retry.
   */
  function rangeControl(key) {
    return root.querySelector('[data-pmd-lab-range-control="' + key + '"]');
  }

  function rangeInput(key) {
    var control = rangeControl(key);
    return control ? control.querySelector('[data-pmd-lab-chart-window="' + key + '"]') : null;
  }

  function clampRange(input, rawValue) {
    var min = Number(input && input.min || 0);
    var max = Number(input && input.max || min);
    var value = Math.round(Number(rawValue || min));
    if (!Number.isFinite(value)) value = min;
    return Math.max(min, Math.min(max, value));
  }

  function syncRangeRail(key, value) {
    var control = rangeControl(key);
    var input = rangeInput(key);
    if (!control || !input) return;

    var min = Number(input.min || 0);
    var max = Number(input.max || min);
    var safe = clampRange(input, value);
    var progress = max > min ? ((safe - min) / (max - min)) * 100 : 100;
    var track = control.querySelector('[data-pmd-lab-range-track]');

    input.value = String(safe);
    control.style.setProperty('--pmd-range-progress', progress.toFixed(4) + '%');

    if (track) {
      track.setAttribute('aria-valuemin', String(min));
      track.setAttribute('aria-valuemax', String(max));
      track.setAttribute('aria-valuenow', String(safe));
    }
  }

  function applyRangeWindow(key, rawValue) {
    var input = rangeInput(key);
    if (!input) return;
    var value = clampRange(input, rawValue);

    syncRangeRail(key, value);

    if (key === 'salesOverTime') {
      salesVisible = value;
      if (cache.last30) renderSales(cache.last30);
    }

    if (key === 'salesByHour') {
      hourVisible = value;
      if (cache.last30) renderHour(cache.last30);
    }
  }

  function pointerRangeValue(track, clientY) {
    var control = track.closest('[data-pmd-lab-range-control]');
    if (!control) return null;
    var key = control.getAttribute('data-pmd-lab-range-control');
    var input = rangeInput(key);
    if (!input) return null;

    var rect = track.getBoundingClientRect();
    var height = Math.max(rect.height, 1);
    var fraction = 1 - ((clientY - rect.top) / height);
    fraction = Math.max(0, Math.min(1, fraction));

    var min = Number(input.min || 0);
    var max = Number(input.max || min);
    return min + Math.round(fraction * (max - min));
  }

  root.addEventListener('pointerdown', function (event) {
    var track = event.target.closest('[data-pmd-lab-range-track]');
    if (!track || !root.contains(track)) return;

    event.preventDefault();
    try { track.setPointerCapture(event.pointerId); } catch (error) {}
    try { track.focus({preventScroll: true}); } catch (error) { track.focus(); }

    var control = track.closest('[data-pmd-lab-range-control]');
    var key = control && control.getAttribute('data-pmd-lab-range-control');
    var value = pointerRangeValue(track, event.clientY);
    if (key && value !== null) applyRangeWindow(key, value);
  });

  root.addEventListener('pointermove', function (event) {
    var track = event.target.closest('[data-pmd-lab-range-track]');
    if (!track || !root.contains(track)) return;
    if (!track.hasPointerCapture || !track.hasPointerCapture(event.pointerId)) return;

    event.preventDefault();
    var control = track.closest('[data-pmd-lab-range-control]');
    var key = control && control.getAttribute('data-pmd-lab-range-control');
    var value = pointerRangeValue(track, event.clientY);
    if (key && value !== null) applyRangeWindow(key, value);
  });

  root.addEventListener('keydown', function (event) {
    var track = event.target.closest('[data-pmd-lab-range-track]');
    if (!track || !root.contains(track)) return;

    var control = track.closest('[data-pmd-lab-range-control]');
    var key = control && control.getAttribute('data-pmd-lab-range-control');
    var input = key && rangeInput(key);
    if (!key || !input) return;

    var current = clampRange(input, input.value);
    var next = current;

    if (event.key === 'ArrowUp' || event.key === 'ArrowRight') next = current + 1;
    else if (event.key === 'ArrowDown' || event.key === 'ArrowLeft') next = current - 1;
    else if (event.key === 'Home') next = Number(input.min || current);
    else if (event.key === 'End') next = Number(input.max || current);
    else return;

    event.preventDefault();
    applyRangeWindow(key, next);
  });

  root.addEventListener('input', function (event) {
    var input = event.target.closest('[data-pmd-lab-chart-window]');
    if (!input || !root.contains(input)) return;
    var key = input.getAttribute('data-pmd-lab-chart-window');
    applyRangeWindow(key, input.value);
  });

  root.querySelectorAll('[data-pmd-lab-range-control]').forEach(function (control) {
    var key = control.getAttribute('data-pmd-lab-range-control');
    var input = rangeInput(key);
    if (input) syncRangeRail(key, input.value);
  });

  Object.keys(periodByWidget).forEach(function (key) {
    markPeriod(key, periodByWidget[key]);
  });

  function renderInitialBootstrap() {
    if (!serverBootstrapReady) return false;

    if (serverDomReady) {
      var salesInput = root.querySelector(
        '[data-pmd-lab-chart-window="salesOverTime"]'
      );
      var hourInput = root.querySelector(
        '[data-pmd-lab-chart-window="salesByHour"]'
      );

      salesVisible = salesInput ? Number(salesInput.value || 0) : null;
      hourVisible = hourInput ? Number(hourInput.value || 0) : null;

      root.querySelectorAll('[data-pmd-lab-analytics-widget]').forEach(function (card) {
        card.setAttribute('aria-busy', 'false');
        var body = card.querySelector('[data-pmd-lab-widget-body]');
        if (body) body.setAttribute('data-pmd-lab-state', 'ready');
      });

      bootRenderSkipped = true;
      return true;
    }

    renderBase(cache.last30);

    Object.keys(periodByWidget).forEach(function (key) {
      if (periodByWidget[key] === 'month') {
        renderPeriodWidget(key, cache.month);
      }
    });

    return true;
  }

  if (!renderInitialBootstrap()) {
    request('last30')
      .then(renderBase)
      .catch(function (error) {
        ['salesOverTime', 'salesByHour', 'liveOperations', 'recentTransactions', 'alerts', 'reviews', 'tips', 'calendarEvents']
          .forEach(function (key) {
            var body = bodyFor(key);
            if (body) body.innerHTML = empty({reason: 'Analytics source unavailable'});
            setBusy(key, false);
          });
        console.warn('[PMD Dashboard Lab Analytics] base request failed', error);
      });

    request('month')
      .then(function (payload) {
        Object.keys(periodByWidget).forEach(function (key) {
          if (periodByWidget[key] === 'month') renderPeriodWidget(key, payload);
        });
      })
      .catch(function (error) {
        Object.keys(periodByWidget).forEach(function (key) {
          var body = bodyFor(key);
          if (body) body.innerHTML = empty({reason: 'Analytics source unavailable'});
          setBusy(key, false);
        });
        console.warn('[PMD Dashboard Lab Analytics] month request failed', error);
      });
  }

  bootCompleted = true;

  window.PMDDashboardLabAnalyticsV1 = {
    version: VERSION,
    refresh: function () {
      cache = Object.create(null);
      requests = Object.create(null);
      errors = Object.create(null);
      return Promise.all([request('last30'), request('month')]).then(function (payloads) {
        renderBase(payloads[0]);
        Object.keys(periodByWidget).forEach(function (key) {
          if (periodByWidget[key] === 'month') renderPeriodWidget(key, payloads[1]);
          else loadPeriodWidget(key, periodByWidget[key]);
        });
        return window.PMDDashboardLabAnalyticsV1.audit();
      });
    },
    audit: function () {
      var cards = Array.from(root.querySelectorAll('[data-pmd-lab-analytics-widget]'));
      var keys = cards.map(function (card) { return card.getAttribute('data-pmd-lab-analytics-widget'); });
      return {
        version: VERSION,
        route: path,
        root: true,
        expectedCards: 12,
        cardCount: cards.length,
        cardKeys: keys,
        uniqueCards: new Set(keys).size,
        requestCount: requestCount,
        loadedPeriods: Object.keys(cache),
        pendingPeriods: Object.keys(requests).filter(function (period) { return !cache[period]; }),
        errors: Object.assign({}, errors),
        chartMode: chartMode,
        widgetPeriods: Object.assign({}, periodByWidget),
        bootSource: bootSource,
        serverBootstrapReady: serverBootstrapReady,
        serverDomReady: serverDomReady,
        bootRenderSkipped: bootRenderSkipped,
        readyBodyCount: root.querySelectorAll('[data-pmd-lab-widget-body][data-pmd-lab-state="ready"]').length,
        bootNetworkRequests: bootNetworkRequests,
        documentScrollHeight: Math.round(document.documentElement.scrollHeight || 0),
        documentClientHeight: Math.round(document.documentElement.clientHeight || 0),
        canScrollVertically: (document.documentElement.scrollHeight || 0) > (document.documentElement.clientHeight || 0),
        dashboard2OldRuntimePresent: Boolean(window.PMDDashboard2FinalWorkspace),
        observerAuthorityAdded: false,
        timerAuthorityAdded: false,
        rafAuthorityAdded: false,
        ok: cards.length === 12 && new Set(keys).size === 12
      };
    }
  };
})();

(function () {
  'use strict';

  var root = document.querySelector('[data-pmd-report-page]');
  if (!root) return;

  var chartRoot = root.querySelector('[data-pmd-report-chart]');
  var chartPayloadNode = document.getElementById('pmd-report-chart-data');
  var tablePayloadNode = document.getElementById('pmd-report-table-data');
  var exportButton = root.querySelector('[data-pmd-report-export]');
  var chartButtons = Array.from(root.querySelectorAll('[data-pmd-report-chart-mode]'));

  var chartData = null;
  var tableData = null;
  var customRangePanel = null;

  var asyncSupported = Boolean(
    window.fetch &&
    window.AbortController &&
    window.history &&
    typeof window.history.pushState === 'function'
  );
  var asyncController = null;
  var asyncTimer = 0;
  var asyncSerial = 0;
  var asyncRequestCount = 0;
  var asyncAppliedCount = 0;
  var asyncAbortCount = 0;
  var asyncFallbackCount = 0;

  function parseJson(node) {
    if (!node) return null;
    try {
      return JSON.parse(node.textContent || '{}');
    } catch (error) {
      return null;
    }
  }

  chartData = parseJson(chartPayloadNode);
  tableData = parseJson(tablePayloadNode) || {columns: [], rows: []};

  var palette = ['#08a678', '#2f66e8', '#ff8a00', '#d940d8', '#16a7bf', '#ef5350', '#7d4fe8', '#8a6f3d', '#657570', '#39a96b'];
  var currentMode = chartData && chartData.type ? chartData.type : null;

  function currencyCode() {
    return String(root.getAttribute('data-pmd-report-currency') || 'EUR').trim() || 'EUR';
  }

  function money(value) {
    var code = currencyCode();
    try {
      return new Intl.NumberFormat(document.documentElement.lang || undefined, {
        style: 'currency',
        currency: code,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(Number(value || 0));
    } catch (error) {
      return code + ' ' + Number(value || 0).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
    }
  }

  function number(value) {
    return Number(value || 0).toLocaleString(undefined, {maximumFractionDigits: 2});
  }

  function valueLabel(value) {
    return chartData && chartData.money ? money(value) : number(value);
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function emptyChart() {
    if (!chartRoot) return;
    chartRoot.innerHTML = '<div class="pmd-report-empty pmd-report-empty--inside"><strong>No chart data</strong><span>There is no activity to plot for this report window.</span></div>';
  }

  function svgNode(name, attrs) {
    var node = document.createElementNS('http://www.w3.org/2000/svg', name);
    Object.keys(attrs || {}).forEach(function (key) {
      node.setAttribute(key, attrs[key]);
    });
    return node;
  }

  function renderCartesian(mode) {
    if (!chartRoot || !chartData) return;

    var labels = Array.isArray(chartData.labels) ? chartData.labels : [];
    var values = Array.isArray(chartData.values) ? chartData.values.map(Number) : [];

    if (!labels.length || !values.length || values.every(function (value) { return !value; })) {
      emptyChart();
      return;
    }

    var width = 1000;
    var height = 330;
    var pad = {left: 82, right: 24, top: 22, bottom: 48};
    var innerW = width - pad.left - pad.right;
    var innerH = height - pad.top - pad.bottom;
    var max = Math.max.apply(Math, values.concat([1])) * 1.08;

    var svg = svgNode('svg', {
      viewBox: '0 0 ' + width + ' ' + height,
      role: 'img',
      'aria-label': (tableData.title || 'Owner report') + ' chart'
    });

    for (var i = 0; i <= 4; i++) {
      var y = pad.top + (innerH / 4) * i;
      svg.appendChild(svgNode('line', {
        x1: pad.left,
        y1: y,
        x2: width - pad.right,
        y2: y,
        class: 'pmd-report-chart-grid'
      }));

      var value = max - (max / 4) * i;
      var text = svgNode('text', {
        x: pad.left - 12,
        y: y + 4,
        'text-anchor': 'end',
        class: 'pmd-report-chart-axis-label'
      });
      text.textContent = chartData.money ? valueLabel(value) : number(value);
      svg.appendChild(text);
    }

    var count = values.length;
    var xFor = function (index) {
      if (count <= 1) return pad.left + innerW / 2;
      return pad.left + (innerW * index / (count - 1));
    };
    var yFor = function (value) {
      return pad.top + innerH - (innerH * Number(value || 0) / max);
    };

    if (mode === 'bar') {
      var slot = innerW / Math.max(count, 1);
      var barW = Math.max(5, Math.min(30, slot * .58));

      values.forEach(function (value, index) {
        var x = pad.left + slot * index + (slot - barW) / 2;
        var y = yFor(value);
        var rect = svgNode('rect', {
          x: x,
          y: y,
          width: barW,
          height: Math.max(1, pad.top + innerH - y),
          class: 'pmd-report-chart-bar'
        });
        var title = svgNode('title');
        title.textContent = labels[index] + ': ' + valueLabel(value);
        rect.appendChild(title);
        svg.appendChild(rect);
      });
    } else {
      var points = values.map(function (value, index) {
        return xFor(index) + ',' + yFor(value);
      });

      var areaPoints = [pad.left + ',' + (pad.top + innerH)]
        .concat(points)
        .concat([(width - pad.right) + ',' + (pad.top + innerH)]);

      svg.appendChild(svgNode('polygon', {
        points: areaPoints.join(' '),
        class: 'pmd-report-chart-area'
      }));

      svg.appendChild(svgNode('polyline', {
        points: points.join(' '),
        class: 'pmd-report-chart-line'
      }));

      values.forEach(function (value, index) {
        if (count > 40 && index % Math.ceil(count / 20) !== 0 && index !== count - 1) return;

        var dot = svgNode('circle', {
          cx: xFor(index),
          cy: yFor(value),
          r: 4.5,
          class: 'pmd-report-chart-dot'
        });
        var title = svgNode('title');
        title.textContent = labels[index] + ': ' + valueLabel(value);
        dot.appendChild(title);
        svg.appendChild(dot);
      });
    }

    var labelCount = Math.min(7, labels.length);
    for (var j = 0; j < labelCount; j++) {
      var index = labelCount === 1 ? 0 : Math.round(j * (labels.length - 1) / (labelCount - 1));
      var tx = mode === 'bar'
        ? pad.left + (innerW / Math.max(labels.length, 1)) * index + (innerW / Math.max(labels.length, 1)) / 2
        : xFor(index);
      var label = svgNode('text', {
        x: tx,
        y: height - 18,
        'text-anchor': 'middle',
        class: 'pmd-report-chart-axis-label'
      });
      label.textContent = labels[index];
      svg.appendChild(label);
    }

    chartRoot.replaceChildren(svg);
  }

  function renderDonut() {
    if (!chartRoot || !chartData) return;

    var labels = Array.isArray(chartData.labels) ? chartData.labels : [];
    var values = Array.isArray(chartData.values) ? chartData.values.map(Number) : [];
    var total = values.reduce(function (sum, value) {
      return sum + Math.max(0, value || 0);
    }, 0);

    if (!labels.length || total <= 0) {
      emptyChart();
      return;
    }

    var stops = [];
    var cursor = 0;

    values.forEach(function (value, index) {
      var share = Math.max(0, value || 0) / total * 100;
      var end = cursor + share;
      stops.push(palette[index % palette.length] + ' ' + cursor.toFixed(2) + '% ' + end.toFixed(2) + '%');
      cursor = end;
    });

    var html = '<div class="pmd-report-donut-layout">';
    html += '<div class="pmd-report-donut" role="img" aria-label="' + escapeHtml(tableData.title || 'Distribution') + ' distribution" style="background:conic-gradient(' + stops.join(',') + ')"></div>';
    html += '<div class="pmd-report-donut-legend">';

    labels.forEach(function (label, index) {
      var value = values[index] || 0;
      var share = total > 0 ? value / total * 100 : 0;

      html += '<div class="pmd-report-donut-row">' +
        '<i style="background:' + palette[index % palette.length] + '"></i>' +
        '<span title="' + escapeHtml(label) + '">' + escapeHtml(label) + '</span>' +
        '<strong>' + escapeHtml(valueLabel(value)) + ' · ' + share.toFixed(1) + '%</strong>' +
      '</div>';
    });

    html += '</div></div>';
    chartRoot.innerHTML = html;
  }

  function renderChart(mode) {
    if (!chartRoot || !chartData) return;

    currentMode = mode || chartData.type || 'line';

    if (currentMode === 'donut') renderDonut();
    else if (currentMode === 'bar') renderCartesian('bar');
    else renderCartesian('line');

    chartButtons.forEach(function (button) {
      var active = button.getAttribute('data-pmd-report-chart-mode') === currentMode;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
  }

  function csvCell(value) {
    var text = String(value == null ? '' : value).replace(/\r?\n/g, ' ').trim();
    return '"' + text.replace(/"/g, '""') + '"';
  }

  function exportCsv() {
    var columns = Array.isArray(tableData.columns) ? tableData.columns : [];
    var rows = Array.isArray(tableData.rows) ? tableData.rows : [];
    if (!columns.length) return;

    var lines = [];
    lines.push(columns.map(function (column) {
      return csvCell(column.label || column.key || '');
    }).join(','));

    rows.forEach(function (row) {
      lines.push(columns.map(function (column) {
        return csvCell(row && column ? row[column.key] : '');
      }).join(','));
    });

    var blob = new Blob(['\ufeff' + lines.join('\r\n')], {type: 'text/csv;charset=utf-8'});
    var url = URL.createObjectURL(blob);
    var link = document.createElement('a');
    var type = String(tableData.type || root.getAttribute('data-pmd-report-type') || 'report')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-');

    link.href = url;
    link.download = 'paymydine-' + type + '-' + new Date().toISOString().slice(0, 10) + '.csv';
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(function () { URL.revokeObjectURL(url); }, 0);
  }

  if (chartData && chartRoot) {
    renderChart(chartData.type || 'line');
  }

  /* ============================================================
     CUSTOM RANGE BODY PORTAL
     ============================================================ */

  function localDateValue(date) {
    var year = date.getFullYear();
    var month = String(date.getMonth() + 1).padStart(2, '0');
    var day = String(date.getDate()).padStart(2, '0');
    return year + '-' + month + '-' + day;
  }

  function isDateValue(value) {
    return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ''));
  }

  function customToggle() {
    return root.querySelector('[data-pmd-custom-range-toggle]');
  }

  function positionCustomRange() {
    var toggle = customToggle();
    if (!customRangePanel || customRangePanel.hidden || !toggle || !toggle.isConnected) return;

    var edge = 12;
    var gap = 8;
    var trigger = toggle.getBoundingClientRect();
    var width = customRangePanel.offsetWidth || 350;
    var height = customRangePanel.offsetHeight || 190;

    var left = Math.max(edge, Math.min(trigger.right - width, window.innerWidth - width - edge));
    var below = trigger.bottom + gap;
    var above = trigger.top - height - gap;
    var top;

    if (below + height <= window.innerHeight - edge) {
      top = below;
    } else if (above >= edge) {
      top = above;
    } else {
      top = Math.max(edge, Math.min(below, window.innerHeight - height - edge));
    }

    customRangePanel.style.left = Math.round(left) + 'px';
    customRangePanel.style.top = Math.round(top) + 'px';
  }

  function closeCustomRange() {
    if (!customRangePanel) return;
    customRangePanel.hidden = true;
    customRangePanel.style.visibility = '';
    var toggle = customToggle();
    if (toggle) toggle.setAttribute('aria-expanded', 'false');
  }

  function syncCustomRangeInputs(url) {
    if (!customRangePanel) return;

    var parsed = new URL(url || window.location.href, window.location.href);
    var from = parsed.searchParams.get('date_from') || '';
    var to = parsed.searchParams.get('date_to') || '';
    var fromInput = customRangePanel.querySelector('[data-pmd-custom-from]');
    var toInput = customRangePanel.querySelector('[data-pmd-custom-to]');

    if (fromInput && isDateValue(from)) fromInput.value = from;
    if (toInput && isDateValue(to)) toInput.value = to;
  }

  function openCustomRange() {
    if (!customRangePanel) return;
    var toggle = customToggle();
    if (!toggle) return;

    customRangePanel.hidden = false;
    customRangePanel.style.visibility = 'hidden';
    toggle.setAttribute('aria-expanded', 'true');

    window.requestAnimationFrame(function () {
      positionCustomRange();
      customRangePanel.style.visibility = 'visible';
      var from = customRangePanel.querySelector('[data-pmd-custom-from]');
      if (from) window.setTimeout(function () { from.focus(); }, 0);
    });
  }

  function installCustomRange() {
    var periodNav = root.querySelector('.pmd-report-periods');
    if (!periodNav) return false;

    var links = Array.from(periodNav.querySelectorAll('a'));
    var customLink = links.find(function (link) {
      try {
        return new URL(link.href, window.location.href).searchParams.get('period') === 'custom';
      } catch (error) {
        return false;
      }
    });

    if (!customLink) return false;

    customLink.dataset.pmdCustomRangeToggle = '1';
    customLink.setAttribute('aria-haspopup', 'dialog');
    customLink.setAttribute('aria-expanded', 'false');
    customLink.title = 'Choose a custom date range';

    if (!customRangePanel) {
      var current = new URL(window.location.href);
      var currentFrom = current.searchParams.get('date_from') || '';
      var currentTo = current.searchParams.get('date_to') || '';
      var today = new Date();
      var defaultTo = localDateValue(today);
      var defaultFromDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 30);
      var defaultFrom = localDateValue(defaultFromDate);

      customRangePanel = document.createElement('div');
      customRangePanel.className = 'pmd-report-custom-range-panel';
      customRangePanel.dataset.pmdCustomRangePanel = 'body-portal-v1';
      customRangePanel.hidden = true;
      customRangePanel.setAttribute('role', 'dialog');
      customRangePanel.setAttribute('aria-label', 'Custom report date range');
      customRangePanel.style.cssText = [
        'position:fixed',
        'left:12px',
        'top:12px',
        'z-index:2147483000',
        'width:min(350px, calc(100vw - 24px))',
        'max-height:calc(100vh - 24px)',
        'overflow:auto',
        'padding:14px',
        'box-sizing:border-box',
        'border:1px solid #d6e5e1',
        'border-radius:14px',
        'background:#fff',
        'box-shadow:0 18px 45px rgba(17,40,35,.18)',
        'text-align:left'
      ].join(';');

      customRangePanel.innerHTML = '' +
        '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:12px">' +
          '<div><strong style="display:block;color:#17332c;font-size:12px;font-weight:800">Custom date range</strong>' +
          '<span style="display:block;margin-top:3px;color:#7b8985;font-size:10px;line-height:1.35">Choose inclusive start and end dates.</span></div>' +
          '<button type="button" data-pmd-custom-close aria-label="Close" style="width:28px;height:28px;flex:0 0 28px;border:1px solid #e0e9e6;border-radius:8px;background:#fff;color:#61716c;font-size:18px;line-height:1;cursor:pointer">×</button>' +
        '</div>' +
        '<div style="display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:8px">' +
          '<label style="display:grid;gap:5px;color:#6b7b76;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.04em">From' +
            '<input type="date" data-pmd-custom-from style="width:100%;min-width:0;height:38px;box-sizing:border-box;border:1px solid #d6e5e1;border-radius:9px;background:#fff;color:#263b35;padding:0 9px;font:inherit;font-size:11px;font-weight:650">' +
          '</label>' +
          '<label style="display:grid;gap:5px;color:#6b7b76;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.04em">To' +
            '<input type="date" data-pmd-custom-to style="width:100%;min-width:0;height:38px;box-sizing:border-box;border:1px solid #d6e5e1;border-radius:9px;background:#fff;color:#263b35;padding:0 9px;font:inherit;font-size:11px;font-weight:650">' +
          '</label>' +
        '</div>' +
        '<div data-pmd-custom-error hidden style="margin-top:8px;color:#b42318;font-size:10.5px;font-weight:650"></div>' +
        '<div style="display:flex;justify-content:flex-end;gap:7px;margin-top:12px">' +
          '<button type="button" data-pmd-custom-cancel style="height:34px;padding:0 11px;border:1px solid #d6e5e1;border-radius:9px;background:#fff;color:#586964;font-size:10.5px;font-weight:750;cursor:pointer">Cancel</button>' +
          '<button type="button" data-pmd-custom-apply style="height:34px;padding:0 13px;border:1px solid #07805f;border-radius:9px;background:#07805f;color:#fff;font-size:10.5px;font-weight:800;cursor:pointer">Apply range</button>' +
        '</div>';

      var fromInput = customRangePanel.querySelector('[data-pmd-custom-from]');
      var toInput = customRangePanel.querySelector('[data-pmd-custom-to]');
      var errorNode = customRangePanel.querySelector('[data-pmd-custom-error]');

      fromInput.value = isDateValue(currentFrom) ? currentFrom : defaultFrom;
      toInput.value = isDateValue(currentTo) ? currentTo : defaultTo;

      function hideError() {
        errorNode.hidden = true;
        errorNode.textContent = '';
      }

      fromInput.addEventListener('input', hideError);
      toInput.addEventListener('input', hideError);

      customRangePanel.querySelector('[data-pmd-custom-close]').addEventListener('click', closeCustomRange);
      customRangePanel.querySelector('[data-pmd-custom-cancel]').addEventListener('click', closeCustomRange);

      customRangePanel.querySelector('[data-pmd-custom-apply]').addEventListener('click', function () {
        var from = fromInput.value;
        var to = toInput.value;

        if (!isDateValue(from) || !isDateValue(to)) {
          errorNode.textContent = 'Please choose both dates.';
          errorNode.hidden = false;
          return;
        }

        if (from > to) {
          var swap = from;
          from = to;
          to = swap;
          fromInput.value = from;
          toInput.value = to;
        }

        var toggle = customToggle();
        var target = new URL(toggle ? toggle.href : window.location.href, window.location.href);
        target.searchParams.set('period', 'custom');
        target.searchParams.set('date_from', from);
        target.searchParams.set('date_to', to);
        closeCustomRange();

        if (asyncSupported) {
          scheduleReportLoad(target.toString(), {push: true, immediate: true});
        } else {
          window.location.assign(target.toString());
        }
      });

      document.body.appendChild(customRangePanel);

      document.addEventListener('click', function (event) {
        if (!customRangePanel || customRangePanel.hidden) return;
        var toggle = customToggle();
        if (customRangePanel.contains(event.target) || (toggle && toggle.contains(event.target))) return;
        closeCustomRange();
      });

      document.addEventListener('keydown', function (event) {
        if (event.key === 'Escape') closeCustomRange();
      });

      window.addEventListener('resize', function () {
        if (customRangePanel && !customRangePanel.hidden) positionCustomRange();
      }, {passive: true});

      window.addEventListener('scroll', function () {
        if (customRangePanel && !customRangePanel.hidden) positionCustomRange();
      }, {passive: true, capture: true});
    }

    return true;
  }

  installCustomRange();

  /* ============================================================
     PMD_OWNER_REPORT_ASYNC_PERIOD_V1

     Same canonical GET URLs and same server payload authority, but period
     changes request compact JSON and patch only report data. No polling,
     prefetching, background refresh or duplicate database request is added.
     A short intent debounce prevents rapid accidental period clicks from
     generating a burst. Any failure falls back to normal browser navigation.
     ============================================================ */

  function setAsyncBusy(busy) {
    if (busy) root.setAttribute('aria-busy', 'true');
    else root.removeAttribute('aria-busy');

    var periodNav = root.querySelector('.pmd-report-periods');
    if (periodNav) {
      if (busy) periodNav.dataset.pmdReportLoading = '1';
      else delete periodNav.dataset.pmdReportLoading;
    }
  }

  function dataValue(row, column) {
    if (!row || !column) return '—';
    var key = column.key || '';
    if (!key) return '—';
    var value = row[key];
    return value == null || value === '' ? '—' : value;
  }

  function renderError(report) {
    var main = root.querySelector('.pmd-report-main');
    if (!main) return;

    var error = main.querySelector('.pmd-report-error');
    var message = String(report.error || '').trim();

    if (!message) {
      if (error) error.remove();
      return;
    }

    if (!error) {
      error = document.createElement('section');
      error.className = 'pmd-report-error';
      error.setAttribute('role', 'alert');
      var switcher = main.querySelector('.pmd-report-switcher');
      if (switcher) switcher.insertAdjacentElement('afterend', error);
      else main.prepend(error);
    }

    error.innerHTML = '<strong>Report unavailable</strong><span>' + escapeHtml(message) + '</span>';
  }

  function renderStats(stats) {
    var main = root.querySelector('.pmd-report-main');
    if (!main) return;

    var section = main.querySelector('.pmd-report-stats');
    var list = Array.isArray(stats) ? stats : [];

    if (!list.length) {
      if (section) section.remove();
      return;
    }

    if (!section) {
      section = document.createElement('section');
      section.className = 'pmd-report-stats';
      section.setAttribute('aria-label', 'Summary');

      var error = main.querySelector('.pmd-report-error');
      var switcher = main.querySelector('.pmd-report-switcher');
      var anchor = error || switcher;
      if (anchor) anchor.insertAdjacentElement('afterend', section);
      else main.prepend(section);
    }

    section.innerHTML = list.map(function (stat) {
      var meta = stat && stat.meta ? '<small>' + escapeHtml(stat.meta) + '</small>' : '';
      return '<article class="pmd-report-stat">' +
        '<span>' + escapeHtml(stat && stat.label ? stat.label : '') + '</span>' +
        '<strong>' + escapeHtml(stat && stat.value != null ? stat.value : '—') + '</strong>' +
        meta +
      '</article>';
    }).join('');
  }

  function renderSpotlight(columns, rows) {
    var primary = columns[0] || null;
    var secondary = columns[1] || null;
    var tertiary = columns[2] || null;
    var visible = rows.slice(0, 6);

    var focus = root.querySelector('.pmd-report-focus-list');
    if (focus) {
      if (!visible.length) {
        focus.innerHTML = '<div class="pmd-report-empty pmd-report-empty--inside"><strong>No activity yet</strong><span>There are no matching rows for this report window.</span></div>';
      } else {
        focus.innerHTML = visible.map(function (row) {
          return '<div class="pmd-report-focus-row">' +
            '<div><strong>' + escapeHtml(dataValue(row, primary)) + '</strong>' +
              (tertiary ? '<small>' + escapeHtml(dataValue(row, tertiary)) + '</small>' : '') +
            '</div>' +
            (secondary ? '<span>' + escapeHtml(dataValue(row, secondary)) + '</span>' : '') +
          '</div>';
        }).join('');
      }
    }

    var operational = root.querySelector('.pmd-report-operational-grid');
    if (operational) {
      if (!visible.length) {
        operational.innerHTML = '<div class="pmd-report-empty pmd-report-empty--inside"><strong>No activity yet</strong><span>There are no matching source rows for this report.</span></div>';
      } else {
        operational.innerHTML = visible.map(function (row) {
          return '<article class="pmd-report-operational-row">' +
            '<strong>' + escapeHtml(dataValue(row, primary)) + '</strong>' +
            (secondary ? '<span>' + escapeHtml(dataValue(row, secondary)) + '</span>' : '') +
            (tertiary ? '<small>' + escapeHtml(dataValue(row, tertiary)) + '</small>' : '') +
          '</article>';
        }).join('');
      }
    }
  }

  function renderTable(columns, rows) {
    var body = root.querySelector('.pmd-report-table-body');
    if (!body) return;

    if (columns.length && rows.length) {
      var head = columns.map(function (column) {
        return '<th>' + escapeHtml(column.label || '') + '</th>';
      }).join('');

      var content = rows.map(function (row) {
        return '<tr>' + columns.map(function (column) {
          return '<td data-label="' + escapeHtml(column.label || '') + '">' + escapeHtml(dataValue(row, column)) + '</td>';
        }).join('') + '</tr>';
      }).join('');

      body.innerHTML = '<div class="pmd-report-table-wrap"><table class="pmd-report-table"><thead><tr>' + head + '</tr></thead><tbody>' + content + '</tbody></table></div>';
    } else {
      body.innerHTML = '<div class="pmd-report-empty"><strong>No data for this view</strong><span>There is no matching source activity for the selected report window.</span></div>';
    }

    var card = body.closest('.pmd-report-card');
    var copy = card && card.querySelector('.pmd-owner-card__title p');
    if (copy) {
      if (!copy.dataset.pmdReportBaseCopy) {
        copy.dataset.pmdReportBaseCopy = copy.textContent.replace(/\s*·\s*[\d,]+\s+rows?\s*$/i, '').trim();
      }
      copy.textContent = copy.dataset.pmdReportBaseCopy + ' · ' + rows.length + ' row' + (rows.length === 1 ? '' : 's');
    }
  }

  function renderSource(report) {
    var source = root.querySelector('.pmd-report-source');
    if (!source) return;

    var sourceText = source.querySelector('.pmd-report-source__copy span');
    if (sourceText) sourceText.textContent = report.source || 'Dashboard2 canonical analytics source.';

    var meta = source.querySelectorAll('.pmd-report-source-meta span');
    var currency = report.currency && report.currency.code ? report.currency.code : currencyCode();
    var timezone = report.timezone || '';

    if (meta[0]) meta[0].textContent = currency;
    if (meta[1]) meta[1].textContent = timezone;
    if (meta[2]) meta[2].textContent = report.period_label || '';
  }

  function renderPeriodState(report) {
    var period = String(report.period || '');
    root.querySelectorAll('.pmd-report-periods a').forEach(function (link) {
      var linkPeriod = '';
      try {
        linkPeriod = new URL(link.href, window.location.href).searchParams.get('period') || '';
      } catch (error) {}
      var active = linkPeriod === period;
      link.classList.toggle('is-active', active);
      link.setAttribute('aria-current', active ? 'page' : 'false');
    });
  }

  function applyAsyncReport(report, targetUrl) {
    if (!report || String(report.type || '') !== String(root.getAttribute('data-pmd-report-type') || '')) {
      throw new Error('Async report type mismatch');
    }

    var columns = Array.isArray(report.columns) ? report.columns : [];
    var rows = Array.isArray(report.rows) ? report.rows : [];

    if (report.currency && report.currency.code) {
      root.setAttribute('data-pmd-report-currency', report.currency.code);
    }

    renderError(report);
    renderStats(report.stats || []);
    renderPeriodState(report);

    tableData = {
      type: report.type || root.getAttribute('data-pmd-report-type') || 'report',
      title: report.title || 'Owner report',
      columns: columns,
      rows: rows
    };
    chartData = report.chart || null;

    if (tablePayloadNode) tablePayloadNode.textContent = JSON.stringify(tableData);
    if (chartPayloadNode) chartPayloadNode.textContent = JSON.stringify(chartData || {});

    renderSpotlight(columns, rows);
    renderTable(columns, rows);
    renderSource(report);

    if (chartRoot) {
      if (!chartData) {
        emptyChart();
      } else {
        var reportType = String(report.type || '');
        var mode = reportType === 'sales' && (currentMode === 'line' || currentMode === 'bar')
          ? currentMode
          : (chartData.type || 'line');
        renderChart(mode);
      }
    }

    syncCustomRangeInputs(targetUrl);
    closeCustomRange();

    root.dispatchEvent(new CustomEvent('pmd:owner-report-updated', {
      bubbles: true,
      detail: {
        type: report.type || '',
        period: report.period || '',
        periodLabel: report.period_label || ''
      }
    }));
  }

  function fallbackNavigation(url) {
    asyncFallbackCount++;
    window.location.assign(url);
  }

  async function loadReport(url, options) {
    options = options || {};

    var target;
    try {
      target = new URL(url, window.location.href);
    } catch (error) {
      fallbackNavigation(url);
      return false;
    }

    if (!asyncSupported || target.origin !== window.location.origin) {
      fallbackNavigation(target.toString());
      return false;
    }

    if (asyncController) {
      asyncController.abort();
      asyncAbortCount++;
    }

    var controller = new AbortController();
    asyncController = controller;
    var serial = ++asyncSerial;
    asyncRequestCount++;
    setAsyncBusy(true);

    try {
      var response = await window.fetch(target.toString(), {
        method: 'GET',
        credentials: 'same-origin',
        cache: 'no-store',
        redirect: 'follow',
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'X-PMD-Report-Async': '1'
        }
      });

      if (serial !== asyncSerial) return false;

      if (!response.ok) {
        throw new Error('HTTP ' + response.status);
      }

      var contentType = String(response.headers.get('content-type') || '').toLowerCase();
      if (contentType.indexOf('application/json') === -1) {
        throw new Error('Expected JSON report response');
      }

      var payload = await response.json();
      if (!payload || payload.ok !== true || !payload.report) {
        throw new Error('Invalid report response');
      }

      applyAsyncReport(payload.report, target.toString());
      asyncAppliedCount++;

      if (options.push !== false) {
        window.history.pushState({pmdOwnerReport: true}, '', target.toString());
      }

      return true;
    } catch (error) {
      if (error && error.name === 'AbortError') return false;
      console.warn('[PMD Owner Reports Async] falling back to normal navigation', error);
      fallbackNavigation(target.toString());
      return false;
    } finally {
      if (serial === asyncSerial) {
        asyncController = null;
        setAsyncBusy(false);
      }
    }
  }

  function scheduleReportLoad(url, options) {
    options = options || {};

    if (!asyncSupported) {
      fallbackNavigation(url);
      return;
    }

    if (asyncTimer) {
      window.clearTimeout(asyncTimer);
      asyncTimer = 0;
    }

    if (asyncController) {
      asyncController.abort();
      asyncController = null;
      asyncAbortCount++;
    }

    var delay = options.immediate ? 0 : 90;
    asyncTimer = window.setTimeout(function () {
      asyncTimer = 0;
      loadReport(url, options);
    }, delay);
  }

  function modifiedClick(event) {
    return event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
  }

  root.addEventListener('click', function (event) {
    var chartButton = event.target.closest('[data-pmd-report-chart-mode]');
    if (chartButton && root.contains(chartButton)) {
      event.preventDefault();
      renderChart(chartButton.getAttribute('data-pmd-report-chart-mode') || 'line');
      return;
    }

    var exportTarget = event.target.closest('[data-pmd-report-export]');
    if (exportTarget && root.contains(exportTarget)) {
      event.preventDefault();
      exportCsv();
      return;
    }

    var periodLink = event.target.closest('.pmd-report-periods a');
    if (!periodLink || !root.contains(periodLink) || modifiedClick(event)) return;

    var period = '';
    try {
      period = new URL(periodLink.href, window.location.href).searchParams.get('period') || '';
    } catch (error) {}

    if (period === 'custom') {
      event.preventDefault();
      if (customRangePanel && !customRangePanel.hidden) closeCustomRange();
      else openCustomRange();
      return;
    }

    if (!asyncSupported) return;

    event.preventDefault();
    closeCustomRange();
    scheduleReportLoad(periodLink.href, {push: true});
  });

  window.addEventListener('popstate', function () {
    if (!asyncSupported) return;

    var current = new URL(window.location.href);
    var rootType = String(root.getAttribute('data-pmd-report-type') || '');
    var currentPath = current.pathname.replace(/\/+$/, '');
    var routeMatches =
      (rootType === 'channels' && currentPath === '/admin/pmdreportchannels') ||
      (rootType === 'tips' && currentPath === '/admin/pmdreporttips') ||
      currentPath === '/admin/pmdreports/' + rootType;

    if (!routeMatches) {
      window.location.reload();
      return;
    }

    scheduleReportLoad(current.toString(), {push: false, immediate: true});
  });

  function audit() {
    var nav = root.querySelectorAll('.pmd-report-switcher a');
    var activeNav = root.querySelectorAll('.pmd-report-switcher a.is-active');
    var table = root.querySelector('.pmd-report-table');
    var source = root.querySelector('.pmd-report-source');
    var periodNav = root.querySelector('.pmd-report-periods');
    var customRangeToggle = root.querySelector('[data-pmd-custom-range-toggle]');
    var params = new URL(window.location.href).searchParams;
    var customActive = params.get('period') === 'custom';
    var customParamsValid = !customActive || (
      isDateValue(params.get('date_from')) &&
      isDateValue(params.get('date_to'))
    );
    var customRequired = !!periodNav;
    var portalOk = !customRequired || !!(
      customRangePanel && customRangePanel.parentElement === document.body
    );

    return {
      version: '1.4.0-async-period',
      type: root.getAttribute('data-pmd-report-type') || '',
      reportNavCount: nav.length,
      activeReportLinks: activeNav.length,
      stats: root.querySelectorAll('.pmd-report-stat').length,
      rows: Array.isArray(tableData.rows) ? tableData.rows.length : 0,
      chartType: chartData ? (currentMode || chartData.type || null) : null,
      chartPresent: !!chartRoot,
      tablePresent: !!table,
      dataAuthorityPresent: !!source,
      exportPresent: !!exportButton,
      customRangeRequired: customRequired,
      customRangeAvailable: !!customRangeToggle,
      customRangePortal: portalOk,
      customRangeActive: customActive,
      customRangeParamsValid: customParamsValid,
      asyncSupported: asyncSupported,
      asyncBusy: !!asyncController,
      asyncRequests: asyncRequestCount,
      asyncApplied: asyncAppliedCount,
      asyncAborted: asyncAbortCount,
      asyncFallbacks: asyncFallbackCount,
      ok: nav.length === 12 &&
        activeNav.length === 1 &&
        !!source &&
        !!exportButton &&
        (!customRequired || !!customRangeToggle) &&
        portalOk &&
        customParamsValid
    };
  }

  window.PMDOwnerReportsV1 = {
    version: '1.4.0-async-period',
    type: root.getAttribute('data-pmd-report-type') || '',
    renderChart: renderChart,
    exportCsv: exportCsv,
    openCustomRange: openCustomRange,
    closeCustomRange: closeCustomRange,
    positionCustomRange: positionCustomRange,
    loadReport: function (url) {
      return loadReport(url, {push: true});
    },
    audit: audit
  };

  console.info('[PMD Owner Reports V1.4] Ready', audit());
})();
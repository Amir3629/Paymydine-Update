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

  chartButtons.forEach(function (button) {
    button.addEventListener('click', function () {
      renderChart(button.getAttribute('data-pmd-report-chart-mode') || 'line');
    });
  });

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

  if (exportButton) {
    exportButton.addEventListener('click', exportCsv);
  }

  if (chartData && chartRoot) {
    renderChart(chartData.type || 'line');
  }

  function audit() {
    var nav = root.querySelectorAll('.pmd-report-switcher a');
    var activeNav = root.querySelectorAll('.pmd-report-switcher a.is-active');
    var table = root.querySelector('.pmd-report-table');
    var source = root.querySelector('.pmd-report-source');

    return {
      version: '1.2.0-settings-detail-family',
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
      ok: nav.length === 12 && activeNav.length === 1 && !!source && !!exportButton
    };
  }

  window.PMDOwnerReportsV1 = {
    version: '1.2.0-settings-detail-family',
    type: root.getAttribute('data-pmd-report-type') || '',
    renderChart: renderChart,
    exportCsv: exportCsv,
    audit: audit
  };

  console.info('[PMD Owner Reports V1.2] Ready', audit());
})();

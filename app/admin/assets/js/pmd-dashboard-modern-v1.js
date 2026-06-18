(function () {
  'use strict';

  function isDashboard() {
    return !!document.querySelector('[data-control="dashboard-container"]');
  }

  function clean(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  function linesFrom(el) {
    return clean(el ? el.innerText : '').split(/\s{2,}|\n/).map(clean).filter(Boolean);
  }

  function findValueBefore(lines, labelNeedles) {
    var idx = lines.findIndex(function (line) {
      var l = line.toLowerCase();
      return labelNeedles.some(function (needle) {
        return l.indexOf(needle.toLowerCase()) !== -1;
      });
    });

    if (idx <= 0) return '—';

    for (var i = idx - 1; i >= 0; i--) {
      var candidate = clean(lines[i]);
      if (/^[€$£]?\s?[0-9][0-9.,]*$/.test(candidate) || /^[0-9][0-9.,]*\s?[€$£]?$/.test(candidate)) {
        return candidate;
      }
    }

    return '—';
  }

  function parseNumber(value) {
    var raw = clean(value).replace(/[^\d.,-]/g, '').replace(',', '.');
    var parsed = parseFloat(raw);
    return isNaN(parsed) ? null : parsed;
  }

  function formatMoney(value) {
    if (value === null || value === undefined || isNaN(value)) return '—';
    return '€' + value.toFixed(2);
  }

  function buildShell(container) {
    if (document.querySelector('.pmd-dashboard-modern')) return document.querySelector('.pmd-dashboard-modern');

    var shell = document.createElement('section');
    shell.className = 'pmd-dashboard-modern';
    shell.innerHTML = `
      <div class="pmd-dashboard-kpi-bar">
        <div class="pmd-dashboard-kpi">
          <div class="pmd-dashboard-kpi-label">Revenue</div>
          <div class="pmd-dashboard-kpi-value" data-pmd-kpi="revenue">—</div>
          <div class="pmd-dashboard-kpi-sub"><i class="fa fa-arrow-up"></i> live dashboard value</div>
          <div class="pmd-dashboard-kpi-icon"><i class="fa fa-money"></i></div>
        </div>
        <div class="pmd-dashboard-kpi">
          <div class="pmd-dashboard-kpi-label">Pending Payments</div>
          <div class="pmd-dashboard-kpi-value" data-pmd-kpi="payments">—</div>
          <div class="pmd-dashboard-kpi-sub"><i class="fa fa-arrow-up"></i> connect payment widget</div>
          <div class="pmd-dashboard-kpi-icon"><i class="fa fa-credit-card"></i></div>
        </div>
        <div class="pmd-dashboard-kpi">
          <div class="pmd-dashboard-kpi-label">Orders</div>
          <div class="pmd-dashboard-kpi-value" data-pmd-kpi="orders">—</div>
          <div class="pmd-dashboard-kpi-sub"><i class="fa fa-arrow-up"></i> total orders</div>
          <div class="pmd-dashboard-kpi-icon"><i class="fa fa-shopping-bag"></i></div>
        </div>
        <div class="pmd-dashboard-kpi">
          <div class="pmd-dashboard-kpi-label">Reservations</div>
          <div class="pmd-dashboard-kpi-value" data-pmd-kpi="reservations">—</div>
          <div class="pmd-dashboard-kpi-sub"><i class="fa fa-arrow-up"></i> total reservations</div>
          <div class="pmd-dashboard-kpi-icon"><i class="fa fa-calendar-check-o"></i></div>
        </div>
        <div class="pmd-dashboard-kpi">
          <div class="pmd-dashboard-kpi-label">Avg Ticket</div>
          <div class="pmd-dashboard-kpi-value" data-pmd-kpi="avg">—</div>
          <div class="pmd-dashboard-kpi-sub"><i class="fa fa-arrow-up"></i> calculated when possible</div>
          <div class="pmd-dashboard-kpi-icon"><i class="fa fa-line-chart"></i></div>
        </div>
      </div>

      <div class="pmd-dashboard-grid">
        <div class="pmd-dashboard-cards">
          <div class="pmd-dashboard-card">
            <div class="pmd-dashboard-card-head">
              <div class="pmd-dashboard-card-icon red"><i class="fa fa-shopping-bag"></i></div>
              <div>
                <div class="pmd-dashboard-card-title">Open Orders</div>
                <div class="pmd-dashboard-card-value" data-pmd-card="orders">—</div>
              </div>
            </div>
            <div class="pmd-dashboard-lines">
              <div class="pmd-dashboard-line"><span>Dine In</span><span>—</span></div>
              <div class="pmd-dashboard-line"><span>Takeaway</span><span>—</span></div>
              <div class="pmd-dashboard-line"><span>Delivery</span><span>—</span></div>
            </div>
            <a class="pmd-dashboard-link" href="/admin/orders"><span>View all orders</span><i class="fa fa-chevron-right"></i></a>
          </div>

          <div class="pmd-dashboard-card">
            <div class="pmd-dashboard-card-head">
              <div class="pmd-dashboard-card-icon"><i class="fa fa-calendar-check-o"></i></div>
              <div>
                <div class="pmd-dashboard-card-title">Reservations</div>
                <div class="pmd-dashboard-card-value" data-pmd-card="reservations">—</div>
              </div>
            </div>
            <div class="pmd-dashboard-lines">
              <div class="pmd-dashboard-line"><span>Today</span><span data-pmd-mini="reservations">—</span></div>
              <div class="pmd-dashboard-line"><span>Upcoming</span><span>—</span></div>
              <div class="pmd-dashboard-line"><span>Cancelled</span><span>—</span></div>
            </div>
            <a class="pmd-dashboard-link" href="/admin/reservations"><span>View reservations</span><i class="fa fa-chevron-right"></i></a>
          </div>

          <div class="pmd-dashboard-card">
            <div class="pmd-dashboard-card-head">
              <div class="pmd-dashboard-card-icon gold"><i class="fa fa-desktop"></i></div>
              <div>
                <div class="pmd-dashboard-card-title">Kitchen Display</div>
                <div class="pmd-dashboard-card-value">Active</div>
              </div>
            </div>
            <div class="pmd-dashboard-lines">
              <div class="pmd-dashboard-line"><span>Preparing</span><span>—</span></div>
              <div class="pmd-dashboard-line"><span>Ready</span><span>—</span></div>
              <div class="pmd-dashboard-line"><span>Completed</span><span>—</span></div>
            </div>
            <a class="pmd-dashboard-link" href="/admin/kitchendisplay"><span>Open KDS</span><i class="fa fa-chevron-right"></i></a>
          </div>

          <div class="pmd-dashboard-card">
            <div class="pmd-dashboard-card-head">
              <div class="pmd-dashboard-card-icon"><i class="fa fa-credit-card"></i></div>
              <div>
                <div class="pmd-dashboard-card-title">Payments</div>
                <div class="pmd-dashboard-card-value" data-pmd-card="revenue">—</div>
              </div>
            </div>
            <div class="pmd-dashboard-lines">
              <div class="pmd-dashboard-line"><span>Unpaid bills</span><span>—</span></div>
              <div class="pmd-dashboard-line"><span>Due today</span><span>—</span></div>
            </div>
            <a class="pmd-dashboard-link" href="/admin/payments"><span>View payments</span><i class="fa fa-chevron-right"></i></a>
          </div>

          <div class="pmd-dashboard-card">
            <div class="pmd-dashboard-card-head">
              <div class="pmd-dashboard-card-icon gold"><i class="fa fa-line-chart"></i></div>
              <div>
                <div class="pmd-dashboard-card-title">Sales Overview</div>
                <div class="pmd-dashboard-card-value" data-pmd-card="revenue2">—</div>
              </div>
            </div>
            <div class="pmd-dashboard-lines">
              <div class="pmd-dashboard-line"><span>Orders</span><span data-pmd-mini="orders">—</span></div>
              <div class="pmd-dashboard-line"><span>Reservations</span><span data-pmd-mini="reservations2">—</span></div>
            </div>
            <a class="pmd-dashboard-link" href="#dashboardcontainer-container"><span>View full report</span><i class="fa fa-chevron-right"></i></a>
          </div>

          <div class="pmd-dashboard-card">
            <div class="pmd-dashboard-card-head">
              <div class="pmd-dashboard-card-icon"><i class="fa fa-users"></i></div>
              <div>
                <div class="pmd-dashboard-card-title">Guests / Customers</div>
                <div class="pmd-dashboard-card-value" data-pmd-card="customers">—</div>
              </div>
            </div>
            <div class="pmd-dashboard-lines">
              <div class="pmd-dashboard-line"><span>Guests Today</span><span>—</span></div>
              <div class="pmd-dashboard-line"><span>Avg Ticket</span><span data-pmd-mini="avg">—</span></div>
            </div>
            <a class="pmd-dashboard-link" href="/admin/customers"><span>View customers</span><i class="fa fa-chevron-right"></i></a>
          </div>
        </div>

        <div class="pmd-dashboard-card pmd-floor-card">
          <div class="pmd-floor-head">
            <div class="pmd-dashboard-card-title">Floor Plan</div>
            <span class="pmd-live-pill">Live</span>
          </div>
          <div class="pmd-floor-grid">
            ${Array.from({ length: 14 }).map(function (_, index) {
              var status = index === 2 || index === 5 || index === 11 ? 'occupied' : (index === 10 ? 'reserved' : 'available');
              return `<div class="pmd-table-tile ${status}"><span>T${index + 1}</span><small><i class="fa fa-user"></i> ${index % 3 === 0 ? 2 : 4}</small></div>`;
            }).join('')}
          </div>
          <div class="pmd-floor-legend">
            <span><i style="background:#22C55E"></i>Available</span>
            <span><i style="background:#EF4444"></i>Occupied</span>
            <span><i style="background:#F59E0B"></i>Reserved</span>
            <span><i style="background:#9CA3AF"></i>Closed</span>
          </div>
          <a class="pmd-dashboard-link" href="/admin/tables"><span>Manage tables</span><i class="fa fa-chevron-right"></i></a>
        </div>
      </div>
    `;

    var toolbar = container.querySelector('.dashboard-toolbar');
    var widgets = container.querySelector('.dashboard-widgets');
    if (widgets) {
      container.insertBefore(shell, widgets);
    } else if (toolbar && toolbar.parentNode) {
      toolbar.parentNode.insertBefore(shell, toolbar.nextSibling);
    } else {
      container.prepend(shell);
    }

    return shell;
  }

  function findWidgetContaining(labelNeedles) {
    var widgets = Array.from(document.querySelectorAll('.dashboard-widgets .widget-item, .dashboard-widgets .pmd-dashboard-widget-root, .dashboard-widgets .dashboard-widget, .dashboard-widgets .control-widget'));
    return widgets.find(function (widget) {
      var t = clean(widget.innerText).toLowerCase();
      return labelNeedles.some(function (needle) {
        return t.indexOf(needle.toLowerCase()) !== -1;
      });
    });
  }

  function updateValues() {
    var container = document.querySelector('[data-control="dashboard-container"]');
    if (!container) return;

    var shell = buildShell(container);
    var textLines = linesFrom(container);

    var revenue = findValueBefore(textLines, ['Total Delivery Orders', 'Delivery Orders', 'Revenue']);
    var orders = findValueBefore(textLines, ['Total Orders']);
    var reservations = findValueBefore(textLines, ['Total Reservations']);
    var customers = findValueBefore(textLines, ['Total Customers', 'Customers']);

    var revenueNumber = parseNumber(revenue);
    var orderNumber = parseNumber(orders);
    var avg = (revenueNumber !== null && orderNumber && orderNumber > 0) ? formatMoney(revenueNumber / orderNumber) : '—';

    var set = function (selector, value) {
      shell.querySelectorAll(selector).forEach(function (el) {
        el.textContent = value || '—';
      });
    };

    set('[data-pmd-kpi="revenue"]', revenue);
    set('[data-pmd-kpi="orders"]', orders);
    set('[data-pmd-kpi="reservations"]', reservations);
    set('[data-pmd-kpi="customers"]', customers);
    set('[data-pmd-kpi="avg"]', avg);

    set('[data-pmd-card="revenue"]', revenue);
    set('[data-pmd-card="revenue2"]', revenue);
    set('[data-pmd-card="orders"]', orders);
    set('[data-pmd-card="reservations"]', reservations);
    set('[data-pmd-card="customers"]', customers);

    set('[data-pmd-mini="orders"]', orders);
    set('[data-pmd-mini="reservations"]', reservations);
    set('[data-pmd-mini="reservations2"]', reservations);
    set('[data-pmd-mini="avg"]', avg);

    // Hide old top stat widgets after values are copied.
    ['Total Delivery Orders', 'Total Orders', 'Total Reservations', 'Total Customers'].forEach(function (label) {
      var widget = findWidgetContaining([label]);
      if (widget) widget.classList.add('pmd-modern-source-hidden');
    });

    document.body.classList.add('pmd-dashboard-modern-ready');
  }

  function scheduleUpdate() {
    setTimeout(updateValues, 100);
    setTimeout(updateValues, 500);
    setTimeout(updateValues, 1200);
    setTimeout(updateValues, 2500);
  }

  function init() {
    if (!isDashboard()) return;

    var container = document.querySelector('[data-control="dashboard-container"]');
    buildShell(container);
    scheduleUpdate();

    var widgets = document.querySelector('.dashboard-widgets');
    if (widgets) {
      new MutationObserver(scheduleUpdate).observe(widgets, {
        childList: true,
        subtree: true,
        characterData: true
      });
    }

    window.addEventListener('ajaxUpdateComplete', scheduleUpdate);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();

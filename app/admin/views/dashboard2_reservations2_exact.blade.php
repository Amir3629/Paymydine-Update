<!--
  Dashboard2 reservation-card rendering is prevented at its source by the
  route guard in pmd-reservations2-floor-toolbar-v316.js. This view deliberately
  contains no competing CSS visibility override.
-->
<script id="pmd-dashboard2-r2-exact-route-class">
document.documentElement.classList.add('pmd-dashboard2-r2-exact');
</script>

<script id="pmd-dashboard2-kpi-boot-v2">
window.PMD_DASHBOARD2_KPIS = @json($pmdDashboard2Kpis ?? []);
window.PMD_DASHBOARD2_KPI_PAYLOAD = @json($pmdDashboard2KpiPayload ?? null);
</script>

<!--
  PMD_DASHBOARD2_V1413_FIRST_PAINT_LOCK

  Dashboard2 CSS and the initial opacity lock are loaded before
  reservations2.index so native Reservations UI cannot paint first.
-->
<link
    rel="stylesheet"
    href="/app/admin/assets/css/pmd-dashboard2-kpis-v1.css?v=dashboard2-tips-grid-authority-v3-20260805"
>

<style id="pmd-dashboard2-v1413-first-paint-lock">
  /*
   * PMD_DASHBOARD2_TRUE_NO_BLINK_FIRST_PAINT_V1
   *
   * Dashboard2 must have a stable painted surface from the
   * browser's first usable frame.
   *
   * Never hide the complete #pmd-reservations2 root.
   */

  html.pmd-dashboard2-r2-exact,
  html.pmd-dashboard2-r2-exact body,
  html.pmd-dashboard2-r2-exact body.page {
    background: #f8fbfd !important;
  }

  html.pmd-dashboard2-r2-exact
  body #pmd-reservations2 {
    visibility: visible !important;
    opacity: 1 !important;
    pointer-events: auto !important;
    transition: none !important;
    animation: none !important;
  }

  /*
   * Legacy/source surfaces are hidden individually instead of
   * blanking the complete Dashboard.
   */
  html.pmd-dashboard2-r2-exact
  body #pmd-reservations2 > .pmd-r2__hero,

  html.pmd-dashboard2-r2-exact
  body #pmd-waiter-dashboard-root,

  html.pmd-dashboard2-r2-exact
  body #pmd-r2-waiter-cards-v1,

  html.pmd-dashboard2-r2-exact
  body #pmd-r2-shared-floor-canvas-v310
  > .pmd-floor-v1__header,

  html.pmd-dashboard2-r2-exact
  body #pmd-r2-shared-floor-canvas-v310
  [data-floor-loading] {
    display: none !important;
  }

  /*
   * PMD_DASHBOARD2_ONE_ROW_NO_HIDE_V1
   *
   * Stable One Row currently uses visibility:hidden while its
   * canonical coordinates are restored.
   *
   * The tables already exist at that moment, so on Dashboard2
   * keep them visible and simply disable animation.
   */
  html.pmd-dashboard2-r2-exact
  [data-pmd-floor].pmd-one-row-v1-restoring
  [data-floor-scroll] {
    visibility: visible !important;
    opacity: 1 !important;
    pointer-events: auto !important;
  }

  html.pmd-dashboard2-r2-exact
  [data-pmd-floor].pmd-one-row-v1-restoring
  [data-floor-canvas],

  html.pmd-dashboard2-r2-exact
  [data-pmd-floor].pmd-one-row-v1-restoring
  [data-floor-table],

  html.pmd-dashboard2-r2-exact
  [data-pmd-floor].pmd-one-row-v1-restoring
  .pmd-floor-v1__table {
    transition: none !important;
    animation: none !important;
  }

  /*
   * Keep V1413 ready class only as a state/audit signal.
   * It no longer controls page visibility.
   */
  html.pmd-dashboard2-r2-exact.pmd-dashboard2-v1413-ready
  body #pmd-reservations2 {
    visibility: visible !important;
    opacity: 1 !important;
    pointer-events: auto !important;
  }
</style>

<!-- PMD_DASHBOARD2_V1416_EARLY_ANALYTICS -->
<script id="pmd-dashboard2-v1416-early-analytics">
(function () {
  'use strict';

  var path = String(
    window.location.pathname || ''
  ).replace(/\/+$/, '');

  if (path !== '/admin/dashboard2') {
    return;
  }

  if (window.PMDDashboard2EarlyPayloadV1416) {
    return;
  }

  var startedAt =
    window.performance &&
    typeof window.performance.now === 'function'
      ? window.performance.now()
      : Date.now();

  var requests = Object.create(null);
  var results = Object.create(null);
  var timings = Object.create(null);

  function normalizePeriod(value) {
    value = String(value || '');

    return [
      'today',
      'week',
      'month',
      'last30'
    ].indexOf(value) !== -1
      ? value
      : 'month';
  }

  function storedPeriod(widgetKey) {
    var value = '';

    try {
      value =
        localStorage.getItem(
          'pmd.dashboard2.donutPeriod.' +
          widgetKey +
          '.v1'
        ) || '';
    } catch (error) {
      value = '';
    }

    return normalizePeriod(value);
  }

  function endpoint(period) {
    return (
      '/admin/dashboard2' +
      '?pmd_analytics=1' +
      '&period=' +
      encodeURIComponent(period)
    );
  }

  function networkRequest(period) {
    var requestStarted =
      window.performance &&
      typeof window.performance.now === 'function'
        ? window.performance.now()
        : Date.now();

    timings[period] = {
      startedAt: requestStarted,
      finishedAt: null,
      duration: null,
      ok: null
    };

    return fetch(
      endpoint(period),
      {
        credentials: 'same-origin',
        cache: 'no-store',
        headers: {
          Accept: 'application/json'
        }
      }
    )
      .then(function (response) {
        if (!response.ok) {
          throw new Error(
            'HTTP ' + response.status
          );
        }

        return response.json();
      })
      .then(function (payload) {
        if (
          !payload ||
          payload.success !== true
        ) {
          throw new Error(
            'Invalid analytics payload'
          );
        }

        var finishedAt =
          window.performance &&
          typeof window.performance.now === 'function'
            ? window.performance.now()
            : Date.now();

        timings[period].finishedAt =
          finishedAt;

        timings[period].duration =
          Math.round(
            finishedAt -
            requestStarted
          );

        timings[period].ok = true;

        results[period] = payload;

        return {
          ok: true,
          payload: payload,
          period: period
        };
      })
      .catch(function (error) {
        var finishedAt =
          window.performance &&
          typeof window.performance.now === 'function'
            ? window.performance.now()
            : Date.now();

        timings[period].finishedAt =
          finishedAt;

        timings[period].duration =
          Math.round(
            finishedAt -
            requestStarted
          );

        timings[period].ok = false;

        return {
          ok: false,
          error: String(
            error &&
            error.message
              ? error.message
              : error
          ),
          period: period
        };
      });
  }

  function start(period) {
    period = normalizePeriod(period);

    if (!requests[period]) {
      requests[period] =
        networkRequest(period);
    }

    return requests[period];
  }

  function take(period) {
    period = normalizePeriod(period);

    var existing =
      requests[period];

    if (!existing) {
      return null;
    }

    return existing.then(function (entry) {
      if (
        entry &&
        entry.ok === true &&
        entry.payload &&
        entry.payload.success === true
      ) {
        return entry.payload;
      }

      /*
       * A failed speculative request must never break the page.
       * Perform one normal fallback request for the consumer.
       */
      return networkRequest(period)
        .then(function (fallback) {
          if (
            !fallback ||
            fallback.ok !== true ||
            !fallback.payload
          ) {
            throw new Error(
              fallback &&
              fallback.error
                ? fallback.error
                : 'Analytics request failed'
            );
          }

          requests[period] =
            Promise.resolve(fallback);

          return fallback.payload;
        });
    });
  }

  var periods = [
    'last30',
    storedPeriod('categorySales'),
    storedPeriod('paymentMethods'),
    storedPeriod('channelSplit')
  ].filter(function (
    period,
    index,
    collection
  ) {
    return (
      collection.indexOf(period) ===
      index
    );
  });

  window.PMDDashboard2EarlyPayloadV1416 = {
    version: '1.4.1.6',
    startedAt: startedAt,
    periods: periods.slice(),
    start: start,
    take: take,

    audit: function () {
      return {
        version: '1.4.1.6',
        periods: periods.slice(),
        requestPeriods:
          Object.keys(requests),
        resultPeriods:
          Object.keys(results),
        timings: JSON.parse(
          JSON.stringify(timings)
        ),
        startedAt: startedAt,
        elapsed:
          Math.round(
            (
              window.performance &&
              typeof window.performance.now ===
                'function'
                ? window.performance.now()
                : Date.now()
            ) -
            startedAt
          )
      };
    }
  };

  periods.forEach(start);

  console.info(
    '[PMD Dashboard2 V1.4.1.6] ' +
    'Early Analytics started',
    {
      periods: periods,
      startedAt: startedAt
    }
  );
})();
</script>

@include('admin::reservations2.index')

<!-- PMD_DASHBOARD2_V1415_SINGLE_HYDRATION -->
<style id="pmd-dashboard2-v1415-single-hydration-style">
  /*
   * The Analytics cards now exist in the initial HTML.
   * Hide only their unfinished bodies, never the complete page.
   */
  /*
   * PMD_DASHBOARD2_V1416_EARLY_ANALYTICS
   *
   * The server-rendered Analytics cards no longer wait for the
   * Reservations/Floor ready class. Their static shells exist from
   * the initial document parse while their bodies hydrate.
   */
  html.pmd-dashboard2-r2-exact
  #pmd-dashboard2-analytics-v1 {
    visibility: visible !important;
    opacity: 1 !important;
  }

  #pmd-dashboard2-analytics-v1,
  #pmd-dashboard2-analytics-v1
  [data-pmd-analytics-widget],
  #pmd-dashboard2-analytics-v1
  [data-pmd-widget-body] {
    transition: none !important;
    animation: none !important;
  }

  #pmd-dashboard2-analytics-v1
  [data-pmd-analytics-widget] {
    box-sizing: border-box !important;
  }

  /*
   * Final desktop geometry from the verified V1.3.9.1 audit.
   * No visible 460px -> 398px correction is required.
   */
  @media (min-width: 900px) {
    #pmd-dashboard2-analytics-v1
    > [data-pmd-analytics-grid],
    #pmd-dashboard2-analytics-v1
    > .pmd-dashboard2-analytics-grid {
      /*
       * PMD_DASHBOARD2_REMOVE_UNUSED_FIFTH_ROW_V1
       *
       * The calendarEvents card now shares row four with
       * Top items, Tips and Reviews. The old fifth 416px
       * track had no card and created 434px of blank space:
       * 416px track + 18px grid gap.
       */
      grid-template-rows:
        398px 398px 255px 255px !important;
    }

    #pmd-dashboard2-analytics-v1
    [data-pmd-analytics-widget="salesOverTime"],
    #pmd-dashboard2-analytics-v1
    [data-pmd-analytics-widget="categorySales"],
    #pmd-dashboard2-analytics-v1
    [data-pmd-analytics-widget="salesByHour"],
    #pmd-dashboard2-analytics-v1
    [data-pmd-analytics-widget="paymentMethods"] {
      height: 398px !important;
      min-height: 398px !important;
      max-height: 398px !important;
      align-self: start !important;
    }
  }

  /*
   * Static placeholder: no shimmer and no movement.
   * Headers and complete card positions are visible immediately.
   */
  #pmd-dashboard2-analytics-v1
  [data-pmd-widget-body] {
    position: relative !important;
    min-height: 72px;
  }

  #pmd-dashboard2-analytics-v1
  .pmd-dashboard2-v1415-hydrating
  [data-pmd-widget-body] {
    overflow: hidden !important;
  }

  #pmd-dashboard2-analytics-v1
  .pmd-dashboard2-v1415-hydrating
  [data-pmd-widget-body]
  > * {
    visibility: hidden !important;
    opacity: 0 !important;
  }

  #pmd-dashboard2-analytics-v1
  .pmd-dashboard2-v1415-hydrating
  [data-pmd-widget-body]::before {
    content: "" !important;

    position: absolute !important;
    inset: 16px !important;
    z-index: 2 !important;

    display: block !important;

    border: 1px solid rgba(16, 42, 67, 0.06) !important;
    border-radius: 12px !important;

    background:
      linear-gradient(
        180deg,
        rgba(241, 246, 245, 0.86),
        rgba(248, 251, 250, 0.96)
      ) !important;

    pointer-events: none !important;
  }

  #pmd-dashboard2-analytics-v1
  .pmd-dashboard2-v1415-ready
  [data-pmd-widget-body]::before {
    display: none !important;
    content: none !important;
  }
</style>


<!-- PMD_DASHBOARD2_CATEGORY_FINAL_RENDER_GATE_V3 -->
<style id="pmd-dashboard2-category-final-render-gate-v3">

/*
 * The early hydration may create categorySales content before
 * Independent Donut V1.3.9.5 becomes the final owner.
 *
 * Preserve layout, but never DISPLAY the intermediate donut.
 *
 * Independent Donut sets:
 * data-pmd-independent-donut-ready="true"
 * on the category card when renderOne() has completed.
 */

#pmd-dashboard2-analytics-v1
[data-pmd-analytics-widget="categorySales"]
:not([data-pmd-never-used]) {
    box-sizing: border-box;
}

#pmd-dashboard2-analytics-v1
[data-pmd-analytics-widget="categorySales"]
:not([data-pmd-independent-donut-ready="true"])
.pmd-dashboard2-donut,

#pmd-dashboard2-analytics-v1
[data-pmd-analytics-widget="categorySales"]
:not([data-pmd-independent-donut-ready="true"])
> .pmd-dashboard2-donut-period-v1395 {
    visibility: hidden !important;
    opacity: 0 !important;
}

/*
 * Final graph appears immediately in its final geometry.
 * No fade from the intermediate location.
 */
#pmd-dashboard2-analytics-v1
[data-pmd-analytics-widget="categorySales"]
.pmd-dashboard2-donut,

#pmd-dashboard2-analytics-v1
[data-pmd-analytics-widget="categorySales"]
> .pmd-dashboard2-donut-period-v1395 {
    animation: none !important;
    transition: none !important;
}

</style>
<!-- /PMD_DASHBOARD2_CATEGORY_FINAL_RENDER_GATE_V3 -->

<section
  id="pmd-dashboard2-analytics-v1"
  class="pmd-dashboard2-analytics-v1 pmd-dashboard2-v1415-hydrating"
  aria-label="Dashboard analytics"
  aria-busy="true"
>
  <div
    class="pmd-dashboard2-analytics-grid"
    data-pmd-analytics-grid
  >
    <article
      class="pmd-dashboard2-analytics-card is-wide"
      data-pmd-analytics-widget="salesOverTime"
    >
      <header>
        <h3>Sales over time</h3>

        <div
          class="pmd-dashboard2-chart-toggle"
          role="group"
          aria-label="Chart type"
        >
          <button
            type="button"
            data-pmd-chart-mode="line"
            aria-pressed="false"
          >Line</button>

          <button
            type="button"
            data-pmd-chart-mode="bar"
            aria-pressed="false"
          >Bar</button>
        </div>
      </header>

      <div
        class="pmd-dashboard2-widget-body"
        data-pmd-widget-body
      ></div>
    </article>

    <article
      class="pmd-dashboard2-analytics-card"
      data-pmd-analytics-widget="salesByHour"
    >
      <header><h3>Sales by hour</h3></header>
      <div class="pmd-dashboard2-widget-body" data-pmd-widget-body></div>
    </article>

    <article
      class="pmd-dashboard2-analytics-card"
      data-pmd-analytics-widget="calendarEvents"
    >
      <header><h3>Upcoming reservations</h3></header>
      <div class="pmd-dashboard2-widget-body" data-pmd-widget-body></div>
    </article>

    <article
      class="pmd-dashboard2-analytics-card"
      data-pmd-analytics-widget="categorySales"
    >
      <header><h3>Sales by category</h3></header>
      <div class="pmd-dashboard2-widget-body" data-pmd-widget-body></div>
    </article>

    <article
      class="pmd-dashboard2-analytics-card"
      data-pmd-analytics-widget="paymentMethods"
    >
      <header><h3>Payment methods</h3></header>
      <div class="pmd-dashboard2-widget-body" data-pmd-widget-body></div>
    </article>

    
    <!-- PMD_DASHBOARD2_BESTELLKANAELE_CLEAN_V2 -->
    <article
      id="pmd-bestellkanaele-clean-v2"
      class="pmd-dashboard2-analytics-card pmd-bestellkanaele-clean-v2"
      data-pmd-analytics-widget="channelSplit"
      data-pmd-bestell-owner="clean-v2"
      data-pmd-bestell-period="month"
      aria-labelledby="pmd-bestell-title-v2"
    >
      <header class="pmd-bestellkanaele-clean-v2__header">
        <h3 id="pmd-bestell-title-v2">
          Bestellkanäle
        </h3>

        <div
          class="pmd-bestellkanaele-clean-v2__periods"
          role="group"
          aria-label="Zeitraum für Bestellkanäle"
        >
          <button
            type="button"
            data-pmd-bestell-period="today"
            aria-pressed="false"
          >
            Tag
          </button>

          <button
            type="button"
            data-pmd-bestell-period="week"
            aria-pressed="false"
          >
            Woche
          </button>

          <button
            type="button"
            data-pmd-bestell-period="month"
            aria-pressed="false"
          >
            Monat
          </button>
        </div>
      </header>

      <div class="pmd-bestellkanaele-clean-v2__body">
        <div class="pmd-bestellkanaele-clean-v2__chart">
          <svg
            viewBox="0 0 120 120"
            role="img"
            aria-label="Bestellkanäle Diagramm"
          >
            <circle
              cx="60"
              cy="60"
              r="45"
              pathLength="100"
              fill="none"
              stroke="#edf1ef"
              stroke-width="18"
            ></circle>

            <circle
              data-pmd-bestell-slice="dine-in"
              cx="60"
              cy="60"
              r="45"
              pathLength="100"
              fill="none"
              stroke="#00a676"
              stroke-width="18"
              stroke-dasharray="0 100"
              stroke-dashoffset="0"
            ></circle>

            <circle
              data-pmd-bestell-slice="delivery"
              cx="60"
              cy="60"
              r="45"
              pathLength="100"
              fill="none"
              stroke="#2f66e8"
              stroke-width="18"
              stroke-dasharray="0 100"
              stroke-dashoffset="0"
            ></circle>
          </svg>
        </div>

        <ul class="pmd-bestellkanaele-clean-v2__legend">
          <li data-pmd-bestell-row="dine-in">
            <i aria-hidden="true"></i>

            <span class="pmd-bestellkanaele-clean-v2__label">
              Dine in
            </span>

            <strong data-pmd-bestell-value="count">0</strong>
            <strong data-pmd-bestell-value="revenue">0,00 €</strong>
            <strong data-pmd-bestell-value="percentage">0.0%</strong>
          </li>

          <li data-pmd-bestell-row="delivery">
            <i aria-hidden="true"></i>

            <span class="pmd-bestellkanaele-clean-v2__label">
              Lieferung
            </span>

            <strong data-pmd-bestell-value="count">0</strong>
            <strong data-pmd-bestell-value="revenue">0,00 €</strong>
            <strong data-pmd-bestell-value="percentage">0.0%</strong>
          </li>
        </ul>
      </div>
    </article>


    <article
      class="pmd-dashboard2-analytics-card is-wide"
      data-pmd-analytics-widget="liveOperations"
    >
      <header><h3>Live orders</h3></header>
      <div class="pmd-dashboard2-widget-body" data-pmd-widget-body></div>
    </article>

    <article
      class="pmd-dashboard2-analytics-card is-wide"
      data-pmd-analytics-widget="recentTransactions"
    >
      <header><h3>Recent transactions</h3></header>
      <div class="pmd-dashboard2-widget-body" data-pmd-widget-body></div>
    </article>

    <article
      class="pmd-dashboard2-analytics-card"
      data-pmd-analytics-widget="alerts"
    >
      <header><h3>Alerts</h3></header>
      <div class="pmd-dashboard2-widget-body" data-pmd-widget-body></div>
    </article>

    <article
      class="pmd-dashboard2-analytics-card"
      data-pmd-analytics-widget="reviews"
    >
      <header><h3>Latest reviews</h3></header>
      <div class="pmd-dashboard2-widget-body" data-pmd-widget-body></div>
    </article>

    <article
      class="pmd-dashboard2-analytics-card"
      data-pmd-analytics-widget="tips"
    >
      <header><h3>Tips summary</h3></header>
      <div class="pmd-dashboard2-widget-body" data-pmd-widget-body></div>
    </article>

    <article
      class="pmd-dashboard2-analytics-card"
      data-pmd-analytics-widget="topItems"
    >
      <header><h3>Top-selling items</h3></header>
      <div class="pmd-dashboard2-widget-body" data-pmd-widget-body></div>
    </article>
  </div>
</section>

<script id="pmd-dashboard2-v1415-initial-chart-mode">
(function () {
  'use strict';

  var root =
    document.getElementById(
      'pmd-dashboard2-analytics-v1'
    );

  if (!root) return;

  var mode = 'line';

  try {
    mode =
      localStorage.getItem(
        'pmd.dashboard2.salesChartMode.v1'
      ) === 'bar'
        ? 'bar'
        : 'line';
  } catch (error) {}

  root
    .querySelectorAll(
      '[data-pmd-chart-mode]'
    )
    .forEach(function (button) {
      var active =
        button.getAttribute(
          'data-pmd-chart-mode'
        ) === mode;

      button.classList.toggle(
        'is-active',
        active
      );

      button.setAttribute(
        'aria-pressed',
        active ? 'true' : 'false'
      );
    });
})();
</script>









<!-- PMD_DASHBOARD2_SINGLE_STATIC_LAYOUT_V130 -->
<style id="pmd-dashboard2-single-static-layout-v130">
  #pmd-dashboard2-analytics-v1
  [data-pmd-analytics-grid],
  #pmd-dashboard2-analytics-v1
  .pmd-dashboard2-analytics-grid {
    display: grid !important;
    grid-template-columns:
      repeat(12, minmax(0, 1fr)) !important;
    gap: 18px !important;
    align-items: start !important;
    grid-auto-flow: row !important;
    grid-auto-rows: auto !important;
  }

  #pmd-dashboard2-analytics-v1
  [data-pmd-analytics-widget] {
    align-self: start !important;
    height: auto !important;
    min-width: 0 !important;
    width: 100% !important;
    max-width: none !important;
    box-sizing: border-box !important;
    visibility: visible !important;
    opacity: 1 !important;
    transform: none !important;
    transition: none !important;
    animation: none !important;
    border: 1px solid #DCE7E3 !important;
    border-top: 1px solid #DCE7E3 !important;
    box-shadow:
      0 7px 20px rgba(16, 42, 67, 0.07) !important;
  }

  /* Main charts */
  #pmd-dashboard2-analytics-v1
  [data-pmd-analytics-widget="salesOverTime"] {
    order: 1 !important;
    grid-column: span 9 !important;
  }

  #pmd-dashboard2-analytics-v1
  [data-pmd-analytics-widget="categorySales"] {
    order: 2 !important;
    grid-column: span 3 !important;
  }

  #pmd-dashboard2-analytics-v1
  [data-pmd-analytics-widget="salesByHour"] {
    order: 3 !important;
    grid-column: span 9 !important;
  }

  #pmd-dashboard2-analytics-v1
  [data-pmd-analytics-widget="paymentMethods"] {
    order: 4 !important;
    grid-column: span 3 !important;
  }

  /*
   * Requested operational row:
   * Recent | Alerts | Live | Channels
   * 4 + 2 + 3 + 3 = 12
   */
  #pmd-dashboard2-analytics-v1
  [data-pmd-analytics-widget="recentTransactions"] {
    order: 5 !important;
    grid-column: span 4 !important;
  }

  #pmd-dashboard2-analytics-v1
  [data-pmd-analytics-widget="alerts"] {
    order: 6 !important;
    grid-column: span 2 !important;
  }

  #pmd-dashboard2-analytics-v1
  [data-pmd-analytics-widget="liveOperations"] {
    order: 7 !important;
    grid-column: span 3 !important;
  }

  #pmd-dashboard2-analytics-v1
  [data-pmd-analytics-widget="channelSplit"] {
    order: 8 !important;
    grid-column: span 3 !important;
  }

  /*
   * Supporting row:
   * Top items | Tips | Reviews
   */
  #pmd-dashboard2-analytics-v1
  [data-pmd-analytics-widget="topItems"] {
    order: 9 !important;
    grid-column: span 4 !important;
  }

  #pmd-dashboard2-analytics-v1
  [data-pmd-analytics-widget="tips"] {
    order: 10 !important;
    grid-column: span 4 !important;
  }

  #pmd-dashboard2-analytics-v1
  [data-pmd-analytics-widget="reviews"] {
    order: 11 !important;
    grid-column: span 4 !important;
  }

  /* Final full-width row */
  #pmd-dashboard2-analytics-v1
  [data-pmd-analytics-widget="calendarEvents"] {
    order: 12 !important;
    grid-column: span 12 !important;
  }

  /*
   * Compact Recent transactions content.
   */
  #pmd-dashboard2-analytics-v1
  [data-pmd-analytics-widget="recentTransactions"]
  .pmd-dashboard2-data-list li {
    gap: 8px !important;
  }

  #pmd-dashboard2-analytics-v1
  [data-pmd-analytics-widget="recentTransactions"]
  .pmd-dashboard2-data-list li > :first-child {
    min-width: 0 !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
    white-space: nowrap !important;
  }

  #pmd-dashboard2-analytics-v1
  [data-pmd-analytics-widget="recentTransactions"]
  .pmd-dashboard2-data-list li > :last-child {
    flex: 0 0 auto !important;
    white-space: nowrap !important;
  }

  @media (max-width: 1280px) {
    #pmd-dashboard2-analytics-v1
    [data-pmd-analytics-widget="recentTransactions"],
    #pmd-dashboard2-analytics-v1
    [data-pmd-analytics-widget="alerts"],
    #pmd-dashboard2-analytics-v1
    [data-pmd-analytics-widget="liveOperations"],
    #pmd-dashboard2-analytics-v1
    [data-pmd-analytics-widget="channelSplit"] {
      grid-column: span 6 !important;
    }

    #pmd-dashboard2-analytics-v1
    [data-pmd-analytics-widget="topItems"],
    #pmd-dashboard2-analytics-v1
    [data-pmd-analytics-widget="tips"],
    #pmd-dashboard2-analytics-v1
    [data-pmd-analytics-widget="reviews"] {
      grid-column: span 6 !important;
    }
  }

  @media (max-width: 760px) {
    #pmd-dashboard2-analytics-v1
    [data-pmd-analytics-widget] {
      grid-column: span 12 !important;
    }
  }
</style>



{{-- PMD_DASHBOARD2_EXACT_CARD_HEIGHTS_V132 --}}
<style id="pmd-dashboard2-exact-card-heights-v132">
  @media (min-width: 1281px) {
    /*
     * Every dashboard grid row stretches its cards to one shared height.
     */
    [data-pmd-analytics-grid],
    .pmd-dashboard2-analytics-grid {
      align-items: stretch !important;
      grid-auto-rows: auto !important;
    }

    [data-pmd-analytics-widget] {
      align-self: stretch !important;
      box-sizing: border-box !important;
      min-width: 0 !important;
    }

    /*
     * Row 1:
     * Sales over time | Sales by category
     */
    [data-pmd-analytics-widget="salesOverTime"],
    [data-pmd-analytics-widget="categorySales"] {
      height: 500px !important;
      min-height: 500px !important;
      max-height: 500px !important;
      overflow: hidden !important;
    }

    /*
     * Row 2:
     * Sales by hour | Payment methods
     */
    [data-pmd-analytics-widget="salesByHour"],
    [data-pmd-analytics-widget="paymentMethods"] {
      height: 500px !important;
      min-height: 500px !important;
      max-height: 500px !important;
      overflow: hidden !important;
    }

    /*
     * Compact operational row.
     * Intentionally much shorter than before.
     */
    [data-pmd-analytics-widget="recentTransactions"],
    [data-pmd-analytics-widget="alerts"],
    [data-pmd-analytics-widget="liveOperations"],
    [data-pmd-analytics-widget="channelSplit"] {
      height: 255px !important;
      min-height: 255px !important;
      max-height: 255px !important;
      overflow: hidden !important;
      align-self: stretch !important;
      box-sizing: border-box !important;
    }

    /*
     * Recent transactions keeps all records available through
     * an internal scroll instead of making the entire row tall.
     */
    [data-pmd-analytics-widget="recentTransactions"] {
      overflow-y: auto !important;
      overscroll-behavior: contain !important;
      scrollbar-gutter: stable !important;
    }

    /*
     * Keep the heading visible while transaction rows scroll.
     */
    [data-pmd-analytics-widget="recentTransactions"] > h1,
    [data-pmd-analytics-widget="recentTransactions"] > h2,
    [data-pmd-analytics-widget="recentTransactions"] > h3,
    [data-pmd-analytics-widget="recentTransactions"] > h4,
    [data-pmd-analytics-widget="recentTransactions"] .pmd-analytics-card__title {
      position: sticky !important;
      top: 0 !important;
      z-index: 2 !important;
      background: #fff !important;
    }

    /*
     * Supporting row:
     * Top-selling items | Tips summary | Latest reviews
     */
    [data-pmd-analytics-widget="topItems"],
    [data-pmd-analytics-widget="tips"],
    [data-pmd-analytics-widget="reviews"] {
      height: 255px !important;
      min-height: 255px !important;
      max-height: 255px !important;
      overflow: hidden !important;
      align-self: stretch !important;
      box-sizing: border-box !important;
    }

    /*
     * Full-width reservations keeps natural height.
     */
    [data-pmd-analytics-widget="calendarEvents"] {
      height: auto !important;
      min-height: 0 !important;
      max-height: none !important;
      overflow: visible !important;
    }

    /*
     * PMD_DASHBOARD2_REMOVE_INVALID_FIRST_CHILD_HEIGHT_V1
     *
     * The first child of every Analytics article is the real HEADER,
     * not an internal card shell.
     *
     * The removed rule assigned height, min-height and max-height
     * of 100% to that HEADER. Chromium therefore stretched the
     * Sales-over-time header across the full card and pushed the
     * chart body outside the visible card area.
     *
     * No replacement height rule is needed. Headers and widget bodies
     * now use their natural document flow in every browser.
     */

    /*
     * Canvas elements must follow the fixed card size rather than
     * generating additional card height.
     */
    [data-pmd-analytics-widget="salesOverTime"] canvas,
    [data-pmd-analytics-widget="categorySales"] canvas,
    [data-pmd-analytics-widget="salesByHour"] canvas,
    [data-pmd-analytics-widget="paymentMethods"] canvas,
    [data-pmd-analytics-widget="channelSplit"] canvas {
      max-width: 100% !important;
    }

    /*
     * PMD_DASHBOARD2_V1418_ANALYTICS_INSTANT_REVEAL
     *
     * Keep the current hydration protection, but reveal the finished
     * Analytics content instantly. No opacity fade, slide, scale or
     * other entrance effect is allowed on the cards below the Floor.
     */
    #pmd-dashboard2-analytics-v1,
    #pmd-dashboard2-analytics-v1 [data-pmd-analytics-grid],
    #pmd-dashboard2-analytics-v1 [data-pmd-analytics-widget],
    #pmd-dashboard2-analytics-v1 [data-pmd-analytics-widget] *,
    #pmd-dashboard2-analytics-v1 [data-pmd-widget-body]::before {
      transition: none !important;
      animation: none !important;
      animation-delay: 0s !important;
      animation-duration: 0s !important;
    }
  }

  /*
   * Tablet/mobile uses natural content height.
   */
  @media (max-width: 1280px) {
    [data-pmd-analytics-widget] {
      height: auto !important;
      min-height: 0 !important;
      max-height: none !important;
      overflow: visible !important;
    }

    [data-pmd-analytics-widget="recentTransactions"] {
      overflow: visible !important;
    }
  }
</style>


<!-- PMD_DASHBOARD2_BESTELLKANAELE_CLEAN_V2 -->
<style id="pmd-bestellkanaele-clean-v2-style">
  #pmd-bestellkanaele-clean-v2 {
    position: relative !important;
    overflow: hidden !important;
  }

  #pmd-bestellkanaele-clean-v2
  .pmd-bestellkanaele-clean-v2__header {
    display: grid !important;
    grid-template-columns:
      minmax(0, 1fr)
      max-content !important;
    align-items: start !important;
    gap: 10px !important;
  }

  #pmd-bestellkanaele-clean-v2
  .pmd-bestellkanaele-clean-v2__header h3 {
    margin: 0 !important;
    min-width: 0 !important;
  }

  #pmd-bestellkanaele-clean-v2
  .pmd-bestellkanaele-clean-v2__periods {
    display: inline-flex !important;
    align-items: center !important;
    gap: 2px !important;

    padding: 3px !important;

    border:
      1px solid
      rgba(0, 122, 89, 0.16) !important;

    border-radius: 11px !important;

    background:
      rgba(247, 250, 249, 0.98) !important;

    box-shadow:
      0 3px 10px
      rgba(16, 42, 67, 0.07) !important;
  }

  #pmd-bestellkanaele-clean-v2
  button[data-pmd-bestell-period] {
    appearance: none !important;

    min-width: 39px !important;
    height: 30px !important;

    margin: 0 !important;
    padding: 0 10px !important;

    border: 0 !important;
    border-radius: 8px !important;

    background: transparent !important;
    color: #52625e !important;

    font: inherit !important;
    font-size: 11px !important;
    font-weight: 750 !important;
    line-height: 1 !important;

    cursor: pointer !important;

    transition:
      background 120ms ease,
      color 120ms ease,
      box-shadow 120ms ease !important;
  }

  #pmd-bestellkanaele-clean-v2
  button[data-pmd-bestell-period][aria-pressed="true"] {
    color: #ffffff !important;
    background: #008f6a !important;

    box-shadow:
      0 2px 7px
      rgba(0, 143, 106, 0.22) !important;
  }

  #pmd-bestellkanaele-clean-v2
  button[data-pmd-bestell-period]:hover:not(
    [aria-pressed="true"]
  ) {
    background:
      rgba(0, 143, 106, 0.08) !important;
  }

  #pmd-bestellkanaele-clean-v2
  .pmd-bestellkanaele-clean-v2__body {
    display: grid !important;
    grid-template-rows:
      minmax(0, 1fr)
      auto !important;

    align-items: center !important;
    gap: 10px !important;

    width: 100% !important;
    min-width: 0 !important;
    min-height: 0 !important;

    padding-top: 8px !important;
  }

  #pmd-bestellkanaele-clean-v2
  .pmd-bestellkanaele-clean-v2__chart {
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
  }

  #pmd-bestellkanaele-clean-v2
  .pmd-bestellkanaele-clean-v2__chart svg {
    display: block !important;

    width: 142px !important;
    height: 142px !important;
    max-width: 48% !important;

    transform: rotate(-90deg);
    transform-origin: center;
  }

  #pmd-bestellkanaele-clean-v2
  .pmd-bestellkanaele-clean-v2__chart circle {
    transition:
      stroke-dasharray 150ms ease,
      stroke-dashoffset 150ms ease !important;
  }

  #pmd-bestellkanaele-clean-v2
  .pmd-bestellkanaele-clean-v2__legend {
    display: grid !important;
    gap: 3px !important;

    width: 100% !important;
    min-width: 0 !important;

    margin: 0 !important;
    padding: 0 !important;

    list-style: none !important;
  }

  #pmd-bestellkanaele-clean-v2
  .pmd-bestellkanaele-clean-v2__legend > li {
    display: grid !important;

    grid-template-columns:
      14px
      minmax(68px, 1fr)
      28px
      minmax(72px, auto)
      minmax(44px, auto) !important;

    align-items: center !important;
    column-gap: 7px !important;

    min-width: 0 !important;
    padding: 3px 0 !important;
  }

  #pmd-bestellkanaele-clean-v2
  .pmd-bestellkanaele-clean-v2__legend > li > i {
    display: block !important;

    width: 10px !important;
    height: 10px !important;

    border:
      2px solid
      #ffffff !important;

    border-radius: 999px !important;

    box-shadow:
      0 0 0 1px
      rgba(16, 42, 67, 0.18) !important;
  }

  #pmd-bestellkanaele-clean-v2
  [data-pmd-bestell-row="dine-in"] > i {
    background: #00a676 !important;
  }

  #pmd-bestellkanaele-clean-v2
  [data-pmd-bestell-row="delivery"] > i {
    background: #2f66e8 !important;
  }

  #pmd-bestellkanaele-clean-v2
  .pmd-bestellkanaele-clean-v2__label {
    min-width: 0 !important;

    overflow: hidden !important;
    text-overflow: ellipsis !important;
    white-space: nowrap !important;

    color: #52625e !important;
  }

  #pmd-bestellkanaele-clean-v2
  [data-pmd-bestell-value] {
    white-space: nowrap !important;

    color: #243c35 !important;
    font-size: 11px !important;
    font-weight: 800 !important;
  }

  #pmd-bestellkanaele-clean-v2
  [data-pmd-bestell-value="count"] {
    text-align: center !important;
  }

  #pmd-bestellkanaele-clean-v2
  [data-pmd-bestell-value="revenue"],
  #pmd-bestellkanaele-clean-v2
  [data-pmd-bestell-value="percentage"] {
    text-align: right !important;
  }

  #pmd-bestellkanaele-clean-v2[
    data-pmd-bestell-loading="true"
  ]
  .pmd-bestellkanaele-clean-v2__periods {
    opacity: 0.72 !important;
  }

  @media (max-width: 1250px) {
    #pmd-bestellkanaele-clean-v2
    .pmd-bestellkanaele-clean-v2__legend > li {
      grid-template-columns:
        12px
        minmax(55px, 1fr)
        22px
        minmax(58px, auto)
        minmax(38px, auto) !important;

      column-gap: 5px !important;
    }

    #pmd-bestellkanaele-clean-v2
    [data-pmd-bestell-value] {
      font-size: 10px !important;
    }
  }


  /*
   * PMD_BESTELLKANAELE_CLEAN_V21_LAYOUT
   *
   * CSS-only refinement:
   * - period toggle aligned to far right
   * - donut moved upward
   * - Dine in and Lieferung both visible
   * - JavaScript and API behavior unchanged
   */

  #pmd-bestellkanaele-clean-v2 {
    display: flex !important;
    flex-direction: column !important;

    height: 255px !important;
    min-height: 255px !important;
    max-height: 255px !important;

    padding:
      14px
      14px
      10px !important;

    overflow: hidden !important;
  }

  #pmd-bestellkanaele-clean-v2
  > .pmd-bestellkanaele-clean-v2__header {
    position: relative !important;

    display: flex !important;
    flex: 0 0 auto !important;

    align-items: flex-start !important;
    justify-content: space-between !important;

    width: 100% !important;
    min-width: 0 !important;

    gap: 12px !important;

    margin: 0 !important;
    padding: 0 !important;
  }

  #pmd-bestellkanaele-clean-v2
  > .pmd-bestellkanaele-clean-v2__header
  > h3 {
    flex: 1 1 auto !important;

    min-width: 0 !important;

    margin: 0 !important;
    padding: 0 !important;

    white-space: nowrap !important;
  }

  #pmd-bestellkanaele-clean-v2
  > .pmd-bestellkanaele-clean-v2__header
  > .pmd-bestellkanaele-clean-v2__periods {
    position: relative !important;

    top: auto !important;
    right: auto !important;
    bottom: auto !important;
    left: auto !important;

    flex: 0 0 auto !important;
    align-self: flex-start !important;

    margin:
      -2px
      0
      0
      auto !important;

    transform: none !important;
  }

  #pmd-bestellkanaele-clean-v2
  > .pmd-bestellkanaele-clean-v2__body {
    display: grid !important;
    flex: 1 1 auto !important;

    grid-template-rows:
      minmax(0, 1fr)
      auto !important;

    align-content: stretch !important;
    align-items: center !important;

    width: 100% !important;
    min-width: 0 !important;
    min-height: 0 !important;
    max-height: none !important;

    gap: 1px !important;

    margin: 0 !important;
    padding: 0 !important;

    overflow: visible !important;
  }

  #pmd-bestellkanaele-clean-v2
  .pmd-bestellkanaele-clean-v2__chart {
    display: flex !important;

    align-items: flex-start !important;
    justify-content: center !important;

    min-width: 0 !important;
    min-height: 0 !important;

    margin:
      -9px
      0
      -5px !important;

    padding: 0 !important;

    transform:
      translateY(-5px) !important;
  }

  #pmd-bestellkanaele-clean-v2
  .pmd-bestellkanaele-clean-v2__chart
  svg {
    display: block !important;
    flex: 0 0 auto !important;

    width: 122px !important;
    height: 122px !important;

    max-width: none !important;
    max-height: none !important;

    margin: 0 !important;

    transform:
      rotate(-90deg) !important;

    transform-origin:
      50%
      50% !important;
  }

  #pmd-bestellkanaele-clean-v2
  .pmd-bestellkanaele-clean-v2__legend {
    position: relative !important;

    display: grid !important;
    flex: 0 0 auto !important;

    grid-template-rows:
      repeat(2, minmax(20px, auto)) !important;

    gap: 0 !important;

    width: 100% !important;
    min-width: 0 !important;

    height: auto !important;
    min-height: 42px !important;
    max-height: none !important;

    margin:
      -2px
      0
      0 !important;

    padding: 0 !important;

    overflow: visible !important;
  }

  #pmd-bestellkanaele-clean-v2
  .pmd-bestellkanaele-clean-v2__legend
  > li {
    display: grid !important;

    grid-template-columns:
      14px
      minmax(68px, 1fr)
      28px
      minmax(72px, auto)
      minmax(44px, auto) !important;

    align-items: center !important;

    min-height: 20px !important;

    column-gap: 7px !important;

    margin: 0 !important;

    padding:
      1px
      0 !important;

    overflow: visible !important;
  }

  /*
   * Neutralize old generic channelSplit body restrictions.
   */
  #pmd-dashboard2-analytics-v1
  [data-pmd-analytics-widget="channelSplit"]
  > .pmd-bestellkanaele-clean-v2__body {
    height: auto !important;
    min-height: 0 !important;
    max-height: none !important;

    overflow: visible !important;
  }

  #pmd-dashboard2-analytics-v1
  [data-pmd-analytics-widget="channelSplit"]
  .pmd-bestellkanaele-clean-v2__legend {
    height: auto !important;
    min-height: 42px !important;
    max-height: none !important;

    overflow: visible !important;
  }

  @media (max-width: 1250px) {
    #pmd-bestellkanaele-clean-v2 {
      padding:
        12px
        12px
        9px !important;
    }

    #pmd-bestellkanaele-clean-v2
    > .pmd-bestellkanaele-clean-v2__header {
      gap: 7px !important;
    }

    #pmd-bestellkanaele-clean-v2
    > .pmd-bestellkanaele-clean-v2__header
    > .pmd-bestellkanaele-clean-v2__periods {
      margin-left: auto !important;
    }

    #pmd-bestellkanaele-clean-v2
    button[data-pmd-bestell-period] {
      min-width: 36px !important;
      height: 28px !important;

      padding:
        0
        8px !important;

      font-size: 10px !important;
    }

    #pmd-bestellkanaele-clean-v2
    .pmd-bestellkanaele-clean-v2__chart {
      margin-top: -7px !important;

      transform:
        translateY(-4px) !important;
    }

    #pmd-bestellkanaele-clean-v2
    .pmd-bestellkanaele-clean-v2__chart
    svg {
      width: 114px !important;
      height: 114px !important;
    }
  }


  /*
   * PMD_BESTELLKANAELE_TOGGLE_RIGHT_V22
   *
   * Move Tag / Woche / Monat farther toward
   * the card's top-right corner.
   *
   * No JavaScript, API, chart or row behavior changed.
   */

  #pmd-bestellkanaele-clean-v2
  > .pmd-bestellkanaele-clean-v2__header {
    width: 100% !important;
    max-width: none !important;

    padding-right: 0 !important;
  }

  #pmd-bestellkanaele-clean-v2
  > .pmd-bestellkanaele-clean-v2__header
  > .pmd-bestellkanaele-clean-v2__periods {
    position: absolute !important;

    top: -3px !important;
    right: 0 !important;
    bottom: auto !important;
    left: auto !important;

    margin: 0 !important;

    transform:
      translateX(0) !important;

    z-index: 5 !important;
  }

  #pmd-bestellkanaele-clean-v2
  > .pmd-bestellkanaele-clean-v2__header
  > h3 {
    padding-right: 190px !important;
  }

  @media (max-width: 1250px) {
    #pmd-bestellkanaele-clean-v2
    > .pmd-bestellkanaele-clean-v2__header
    > .pmd-bestellkanaele-clean-v2__periods {
      top: -2px !important;
      right: 0 !important;
    }

    #pmd-bestellkanaele-clean-v2
    > .pmd-bestellkanaele-clean-v2__header
    > h3 {
      padding-right: 170px !important;
    }
  }


  /*
   * PMD_BESTELLKANAELE_CHART_BIGGER_V23
   *
   * Increase only the donut SVG size.
   * Header, toggles, rows, spacing, API and JavaScript remain unchanged.
   */

  #pmd-bestellkanaele-clean-v2
  .pmd-bestellkanaele-clean-v2__chart
  svg {
    width: 138px !important;
    height: 138px !important;
  }

  @media (max-width: 1250px) {
    #pmd-bestellkanaele-clean-v2
    .pmd-bestellkanaele-clean-v2__chart
    svg {
      width: 128px !important;
      height: 128px !important;
    }
  }
</style>

<script id="pmd-bestellkanaele-clean-v2-script">
(() => {
  'use strict';

  const VERSION = '2.0.0';

  const CARD_ID =
    'pmd-bestellkanaele-clean-v2';

  const STORAGE_KEY =
    'pmd.dashboard2.bestellkanaele.period.clean.v2';

  const PERIODS = [
    'today',
    'week',
    'month'
  ];

  const state = {
    period: 'month',
    generation: 0,
    requests: 0,
    updates: 0,
    errors: 0,
    cache: new Map()
  };

  const card = () =>
    document.getElementById(
      CARD_ID
    );

  const normalizePeriod = value => {
    value = String(value || '');

    return PERIODS.includes(value)
      ? value
      : 'month';
  };

  const normalizeChannel = value => {
    const text =
      String(value || '')
        .trim()
        .toLowerCase()
        .replace(/[-_]+/g, ' ')
        .replace(/\s+/g, ' ');

    if (
      text.includes('delivery') ||
      text.includes('liefer')
    ) {
      return 'delivery';
    }

    if (
      text.includes('dine') ||
      text.includes('restaurant') ||
      text.includes('vor ort') ||
      text.includes('table')
    ) {
      return 'dine-in';
    }

    return text;
  };

  const readPeriod = () => {
    try {
      return normalizePeriod(
        localStorage.getItem(
          STORAGE_KEY
        )
      );
    } catch (error) {
      return 'month';
    }
  };

  const storePeriod = period => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        period
      );
    } catch (error) {
      // Storage is optional.
    }
  };

  const money = (
    amount,
    currency
  ) => {
    try {
      return new Intl.NumberFormat(
        document.documentElement.lang ||
          'de-DE',
        {
          style: 'currency',
          currency:
            currency || 'EUR'
        }
      ).format(
        Number(amount || 0)
      );
    } catch (error) {
      return (
        Number(amount || 0)
          .toFixed(2)
          .replace('.', ',') +
        ' €'
      );
    }
  };

  const row = key =>
    card()?.querySelector(
      `[data-pmd-bestell-row="${key}"]`
    ) || null;

  const slice = key =>
    card()?.querySelector(
      `[data-pmd-bestell-slice="${key}"]`
    ) || null;

  const setLoading = loading => {
    const target = card();

    if (!target) {
      return;
    }

    target.dataset.pmdBestellLoading =
      loading ? 'true' : 'false';

    target.querySelectorAll(
      'button[data-pmd-bestell-period]'
    ).forEach(button => {
      button.disabled =
        Boolean(loading);
    });
  };

  const syncButtons = period => {
    card()?.querySelectorAll(
      'button[data-pmd-bestell-period]'
    ).forEach(button => {
      const active =
        button.dataset.pmdBestellPeriod ===
        period;

      button.setAttribute(
        'aria-pressed',
        active ? 'true' : 'false'
      );
    });
  };

  const extractValues = payload => {
    const sourceRows =
      Array.isArray(
        payload?.channels?.channels
      )
        ? payload.channels.channels
        : [];

    const values = {
      'dine-in': {
        orders: 0,
        revenue: 0
      },

      delivery: {
        orders: 0,
        revenue: 0
      }
    };

    sourceRows.forEach(sourceRow => {
      const key =
        normalizeChannel(
          sourceRow?.channel
        );

      if (!values[key]) {
        return;
      }

      values[key] = {
        orders:
          Number(
            sourceRow?.orders || 0
          ),

        revenue:
          Number(
            sourceRow?.revenue || 0
          )
      };
    });

    return values;
  };

  const updateRow = (
    key,
    values,
    totalRevenue,
    currency
  ) => {
    const target = row(key);

    if (!target) {
      return 0;
    }

    const percentage =
      totalRevenue > 0
        ? (
            values.revenue /
            totalRevenue *
            100
          )
        : 0;

    target.querySelector(
      '[data-pmd-bestell-value="count"]'
    ).textContent =
      String(values.orders);

    target.querySelector(
      '[data-pmd-bestell-value="revenue"]'
    ).textContent =
      money(
        values.revenue,
        currency
      );

    target.querySelector(
      '[data-pmd-bestell-value="percentage"]'
    ).textContent =
      percentage.toFixed(1) +
      '%';

    return percentage;
  };

  const updateSlices = percentages => {
    let offset = 0;

    [
      'dine-in',
      'delivery'
    ].forEach(key => {
      const target = slice(key);

      if (!target) {
        return;
      }

      const value =
        Math.max(
          0,
          Number(
            percentages[key] || 0
          )
        );

      target.setAttribute(
        'stroke-dasharray',
        `${value} ${100 - value}`
      );

      target.setAttribute(
        'stroke-dashoffset',
        String(-offset)
      );

      offset += value;
    });
  };

  const applyPayload = (
    payload,
    period
  ) => {
    const target = card();

    if (!target) {
      return false;
    }

    const values =
      extractValues(payload);

    const totalRevenue =
      values['dine-in'].revenue +
      values.delivery.revenue;

    const currency =
      payload?.currency ||
      'EUR';

    const percentages = {
      'dine-in':
        updateRow(
          'dine-in',
          values['dine-in'],
          totalRevenue,
          currency
        ),

      delivery:
        updateRow(
          'delivery',
          values.delivery,
          totalRevenue,
          currency
        )
    };

    updateSlices(percentages);

    target.dataset.pmdBestellOwner =
      'clean-v2';

    target.dataset.pmdBestellRowsStable =
      'true';

    target.dataset.pmdBestellPeriod =
      period;

    state.updates += 1;

    return true;
  };

  const requestPayload = period => {
    if (state.cache.has(period)) {
      return Promise.resolve(
        state.cache.get(period)
      );
    }

    state.requests += 1;

    return fetch(
      (
        '/admin/dashboard2' +
        '?pmd_analytics=1' +
        '&period=' +
        encodeURIComponent(period)
      ),
      {
        credentials: 'same-origin',
        cache: 'no-store',
        headers: {
          Accept: 'application/json'
        }
      }
    )
      .then(response => {
        if (!response.ok) {
          throw new Error(
            `HTTP ${response.status}`
          );
        }

        return response.json();
      })
      .then(payload => {
        if (
          !payload ||
          payload.success !== true
        ) {
          throw new Error(
            'Invalid analytics payload'
          );
        }

        state.cache.set(
          period,
          payload
        );

        return payload;
      });
  };

  const setPeriod = period => {
    period =
      normalizePeriod(period);

    state.period = period;
    state.generation += 1;

    const generation =
      state.generation;

    storePeriod(period);
    syncButtons(period);
    setLoading(true);

    return requestPayload(period)
      .then(payload => {
        if (
          generation !==
            state.generation ||
          period !==
            state.period
        ) {
          return {
            applied: false,
            reason: 'stale-request'
          };
        }

        return {
          applied:
            applyPayload(
              payload,
              period
            ),
          period
        };
      })
      .catch(error => {
        state.errors += 1;

        console.error(
          '[PMD Bestellkanäle Clean V2]',
          {
            period,
            error
          }
        );

        return {
          applied: false,
          period,
          error:
            String(
              error?.message ||
              error
            )
        };
      })
      .finally(() => {
        if (
          generation ===
          state.generation
        ) {
          setLoading(false);
        }
      });
  };

  const onClick = event => {
    const button =
      event.target.closest(
        'button[data-pmd-bestell-period]'
      );

    const target = card();

    if (
      !button ||
      !target ||
      !target.contains(button)
    ) {
      return;
    }

    event.preventDefault();

    setPeriod(
      button.dataset
        .pmdBestellPeriod
    );
  };

  const audit = () => {
    const target = card();

    const rows =
      target
        ? Array.from(
            target.querySelectorAll(
              '[data-pmd-bestell-row]'
            )
          ).map(item => ({
            key:
              item.dataset
                .pmdBestellRow,

            label:
              item.querySelector(
                '.pmd-bestellkanaele-clean-v2__label'
              )?.textContent?.trim(),

            count:
              item.querySelector(
                '[data-pmd-bestell-value="count"]'
              )?.textContent?.trim(),

            revenue:
              item.querySelector(
                '[data-pmd-bestell-value="revenue"]'
              )?.textContent?.trim(),

            percentage:
              item.querySelector(
                '[data-pmd-bestell-value="percentage"]'
              )?.textContent?.trim()
          }))
        : [];

    const result = {
      version: VERSION,
      cardFound:
        Boolean(target),

      owner:
        target?.dataset
          .pmdBestellOwner ||
        null,

      period:
        state.period,

      rowsStable:
        target?.dataset
          .pmdBestellRowsStable ===
        'true',

      rowCount:
        rows.length,

      buttons:
        target?.querySelectorAll(
          'button[data-pmd-bestell-period]'
        ).length || 0,

      activeButtons:
        target?.querySelectorAll(
          'button[data-pmd-bestell-period][aria-pressed="true"]'
        ).length || 0,

      requests:
        state.requests,

      updates:
        state.updates,

      errors:
        state.errors,

      cachedPeriods:
        Array.from(
          state.cache.keys()
        ),

      oldV1431ScriptElement:
        Boolean(
          document.getElementById(
            'pmd-dashboard2-v1431-safe-channel-script'
          )
        ),

      oldV1432ScriptElement:
        Boolean(
          document.getElementById(
            'pmd-dashboard2-v1432-channel-toggle-persistence'
          )
        ),

      rows
    };

    console.info(
      '[PMD Bestellkanäle Clean V2 Audit]',
      result
    );

    return result;
  };

  const boot = () => {
    const target = card();

    if (!target) {
      return;
    }

    state.period =
      readPeriod();

    target.addEventListener(
      'click',
      onClick
    );

    syncButtons(
      state.period
    );

    setPeriod(
      state.period
    );

    console.info(
      '[PMD Bestellkanäle Clean V2] Ready',
      {
        version: VERSION,
        observer: false,
        stableRows: true
      }
    );
  };

  window.PMDBestellkanaeleCleanV2 = {
    version: VERSION,
    setPeriod,
    audit,

    refresh(force = true) {
      if (force) {
        state.cache.delete(
          state.period
        );
      }

      return setPeriod(
        state.period
      );
    }
  };

  if (
    document.readyState ===
    'loading'
  ) {
    document.addEventListener(
      'DOMContentLoaded',
      boot,
      {
        once: true
      }
    );
  } else {
    boot();
  }
})();
</script>


<!-- PMD_DASHBOARD2_NATIVE_V6_CACHE_BUST -->
<script src="/app/admin/assets/js/pmd-dashboard2-kpis-v1.js?v=clean-kpi-menu-v1-20260806"></script>

{{-- PMD_DASHBOARD2_CORRECT_DONUT_STACK_V134 --}}
<style id="pmd-dashboard2-correct-donut-stack-v134">
@media (min-width: 1281px) {

    /*
     * Exact real DOM:
     * article
     *   header
     *   .pmd-dashboard2-widget-body
     *     .pmd-dashboard2-donut
     *       svg
     *       ul.pmd-chart-legend
     */

    [data-pmd-analytics-widget="categorySales"]
    .pmd-dashboard2-widget-body,

    [data-pmd-analytics-widget="paymentMethods"]
    .pmd-dashboard2-widget-body {
        display: block !important;
        width: 100% !important;
        height: auto !important;
        min-height: 0 !important;
        overflow: visible !important;
    }

    [data-pmd-analytics-widget="categorySales"]
    .pmd-dashboard2-donut,

    [data-pmd-analytics-widget="paymentMethods"]
    .pmd-dashboard2-donut {
        display: flex !important;
        flex-direction: column !important;
        align-items: stretch !important;
        justify-content: flex-start !important;

        width: 100% !important;
        height: auto !important;
        min-height: 0 !important;

        margin: 0 !important;
        padding: 0 !important;
        gap: 16px !important;
    }

    /*
     * Donut chart: centered at the top.
     */
    [data-pmd-analytics-widget="categorySales"]
    .pmd-dashboard2-donut > svg,

    [data-pmd-analytics-widget="paymentMethods"]
    .pmd-dashboard2-donut > svg {
        display: block !important;

        width: 168px !important;
        height: 168px !important;
        min-width: 168px !important;
        min-height: 168px !important;
        max-width: 168px !important;
        max-height: 168px !important;

        flex: 0 0 168px !important;

        margin: 8px auto 0 !important;
        padding: 0 !important;

        position: static !important;
        transform: none !important;
        overflow: visible !important;
    }

    /*
     * Legend: always below the donut.
     */
    [data-pmd-analytics-widget="categorySales"]
    .pmd-chart-legend,

    [data-pmd-analytics-widget="paymentMethods"]
    .pmd-chart-legend {
        display: grid !important;
        grid-template-columns: minmax(0, 1fr) !important;

        width: 100% !important;
        min-width: 0 !important;
        max-width: none !important;

        margin: 0 !important;
        padding: 0 !important;

        gap: 7px !important;
        list-style: none !important;

        position: static !important;
        transform: none !important;
    }

    /*
     * Each legend row:
     * color dot | name | amount and percentage
     */
    [data-pmd-analytics-widget="categorySales"]
    .pmd-chart-legend > li,

    [data-pmd-analytics-widget="paymentMethods"]
    .pmd-chart-legend > li {
        display: grid !important;
        grid-template-columns: 16px minmax(0, 1fr) auto !important;
        align-items: center !important;

        width: 100% !important;
        min-width: 0 !important;

        column-gap: 8px !important;
        row-gap: 0 !important;

        margin: 0 !important;
        padding: 2px 0 !important;
    }

    [data-pmd-analytics-widget="categorySales"]
    .pmd-chart-legend > li > i,

    [data-pmd-analytics-widget="paymentMethods"]
    .pmd-chart-legend > li > i {
        display: block !important;

        width: 11px !important;
        height: 11px !important;
        min-width: 11px !important;
        min-height: 11px !important;

        margin: 0 auto !important;
        border-radius: 50% !important;
    }

    [data-pmd-analytics-widget="categorySales"]
    .pmd-chart-legend > li > span,

    [data-pmd-analytics-widget="paymentMethods"]
    .pmd-chart-legend > li > span {
        display: block !important;

        min-width: 0 !important;
        width: auto !important;

        margin: 0 !important;

        font-size: 13px !important;
        line-height: 1.3 !important;

        white-space: normal !important;
        overflow-wrap: anywhere !important;
        word-break: normal !important;
    }

    [data-pmd-analytics-widget="categorySales"]
    .pmd-chart-legend > li > b,

    [data-pmd-analytics-widget="paymentMethods"]
    .pmd-chart-legend > li > b {
        display: block !important;

        margin: 0 !important;

        font-size: 12px !important;
        line-height: 1.3 !important;

        text-align: right !important;
        white-space: nowrap !important;
    }

    /*
     * Payment methods has only one result:
     * keep it compact and centered below the chart.
     */
    [data-pmd-analytics-widget="paymentMethods"]
    .pmd-chart-legend {
        width: 100% !important;
        max-width: 260px !important;
        margin-left: auto !important;
        margin-right: auto !important;
    }

    /*
     * Prevent old side-by-side styles from returning.
     */
    [data-pmd-analytics-widget="categorySales"]
    .pmd-dashboard2-donut > *,

    [data-pmd-analytics-widget="paymentMethods"]
    .pmd-dashboard2-donut > * {
        float: none !important;
    }
}
</style>
{{-- /PMD_DASHBOARD2_CORRECT_DONUT_STACK_V134 --}}

{{-- PMD_DASHBOARD2_COMPACT_CHART_ROWS_V135 --}}
<style id="pmd-dashboard2-compact-chart-rows-v135">
@media (min-width: 1281px) {

    /*
     * Reduce the height of all four cards in the first two rows.
     */
    [data-pmd-analytics-widget="salesOverTime"],
    [data-pmd-analytics-widget="categorySales"],
    [data-pmd-analytics-widget="salesByHour"],
    [data-pmd-analytics-widget="paymentMethods"] {
        height: 440px !important;
        min-height: 440px !important;
        max-height: 440px !important;
    }

    /*
     * Keep the chart cards internally compact.
     */
    [data-pmd-analytics-widget="salesOverTime"]
    .pmd-dashboard2-widget-body,

    [data-pmd-analytics-widget="salesByHour"]
    .pmd-dashboard2-widget-body {
        height: calc(100% - 42px) !important;
        min-height: 0 !important;
        overflow: hidden !important;
    }

    [data-pmd-analytics-widget="salesOverTime"]
    .pmd-dashboard2-chart-frame,

    [data-pmd-analytics-widget="salesByHour"]
    .pmd-dashboard2-chart-frame {
        position: relative !important;
        display: block !important;

        height: 100% !important;
        min-height: 0 !important;

        margin: 0 !important;
        padding: 0 !important;
        overflow: hidden !important;
    }

    /*
     * Move Umsatz / Spitzenwert onto the upper chart area.
     */
    [data-pmd-analytics-widget="salesOverTime"]
    .pmd-dashboard2-chart-key,

    [data-pmd-analytics-widget="salesByHour"]
    .pmd-dashboard2-chart-key {
        position: absolute !important;
        top: 4px !important;
        left: 50% !important;
        z-index: 8 !important;

        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        flex-wrap: wrap !important;

        width: max-content !important;
        max-width: calc(100% - 140px) !important;
        height: auto !important;
        min-height: 30px !important;

        margin: 0 !important;
        padding: 0 !important;
        gap: 8px !important;

        transform: translateX(-50%) !important;
        pointer-events: none !important;
    }

    [data-pmd-analytics-widget="salesOverTime"]
    .pmd-dashboard2-chart-key > span,

    [data-pmd-analytics-widget="salesByHour"]
    .pmd-dashboard2-chart-key > span {
        min-height: 28px !important;
        height: 28px !important;

        padding: 0 11px !important;
        margin: 0 !important;

        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;

        white-space: nowrap !important;
    }

    /*
     * Let the SVG use the space formerly occupied by the bottom key.
     */
    [data-pmd-analytics-widget="salesOverTime"]
    .pmd-dashboard2-chart-frame > svg,

    [data-pmd-analytics-widget="salesByHour"]
    .pmd-dashboard2-chart-frame > svg {
        display: block !important;

        width: 100% !important;
        height: 100% !important;
        max-height: none !important;

        margin: 0 !important;
        padding: 0 !important;
    }

    /*
     * Keep the two donut cards compatible with the reduced 440px height.
     */
    [data-pmd-analytics-widget="categorySales"]
    .pmd-dashboard2-donut > svg,

    [data-pmd-analytics-widget="paymentMethods"]
    .pmd-dashboard2-donut > svg {
        width: 152px !important;
        height: 152px !important;
        min-width: 152px !important;
        min-height: 152px !important;
        max-width: 152px !important;
        max-height: 152px !important;
        flex-basis: 152px !important;

        margin-top: 4px !important;
    }

    [data-pmd-analytics-widget="categorySales"]
    .pmd-dashboard2-donut,

    [data-pmd-analytics-widget="paymentMethods"]
    .pmd-dashboard2-donut {
        gap: 12px !important;
    }

    [data-pmd-analytics-widget="categorySales"]
    .pmd-chart-legend,

    [data-pmd-analytics-widget="paymentMethods"]
    .pmd-chart-legend {
        gap: 5px !important;
    }
}
</style>
{{-- /PMD_DASHBOARD2_COMPACT_CHART_ROWS_V135 --}}




{{-- PMD_DASHBOARD2_V1362_NATURAL_CHART_FIT --}}
<style id="pmd-dashboard2-v1362-natural-chart-fit">
@media (min-width: 1281px) {
    /*
     * Compact but large enough to preserve the SVG axes.
     */
    [data-pmd-analytics-widget="salesOverTime"],
    [data-pmd-analytics-widget="categorySales"],
    [data-pmd-analytics-widget="salesByHour"],
    [data-pmd-analytics-widget="paymentMethods"] {
        height: 460px !important;
        min-height: 460px !important;
        max-height: 460px !important;
    }

    [data-pmd-analytics-widget="salesOverTime"]
    .pmd-dashboard2-widget-body,

    [data-pmd-analytics-widget="salesByHour"]
    .pmd-dashboard2-widget-body {
        height: auto !important;
        min-height: 0 !important;
        overflow: visible !important;
    }

    [data-pmd-analytics-widget="salesOverTime"]
    .pmd-dashboard2-chart-frame,

    [data-pmd-analytics-widget="salesByHour"]
    .pmd-dashboard2-chart-frame {
        position: relative !important;
        display: block !important;
        width: 100% !important;
        height: auto !important;
        min-height: 0 !important;
        padding: 48px 0 8px !important;
        margin: 0 !important;
        box-sizing: border-box !important;
        overflow: visible !important;
    }

    /*
     * Keep the summary pills above the first grid line.
     */
    [data-pmd-analytics-widget="salesOverTime"]
    .pmd-dashboard2-chart-key,

    [data-pmd-analytics-widget="salesByHour"]
    .pmd-dashboard2-chart-key {
        position: absolute !important;
        top: 2px !important;
        left: 50% !important;
        right: auto !important;
        bottom: auto !important;
        transform: translateX(-50%) !important;
        z-index: 5 !important;
        width: max-content !important;
        max-width: calc(100% - 32px) !important;
        margin: 0 !important;
        white-space: nowrap !important;
    }

    /*
     * Critical fix:
     * Do not stretch the SVG to 100% height.
     * Its intrinsic viewBox ratio keeps all X-axis labels visible.
     */
    [data-pmd-analytics-widget="salesOverTime"]
    .pmd-dashboard2-chart-frame > svg,

    [data-pmd-analytics-widget="salesByHour"]
    .pmd-dashboard2-chart-frame > svg {
        display: block !important;
        width: 100% !important;
        height: auto !important;
        max-width: 100% !important;
        max-height: 350px !important;
        min-width: 0 !important;
        min-height: 0 !important;
        margin: 0 auto !important;
        transform: none !important;
        overflow: visible !important;
    }

    /*
     * Keep the removed experimental navigator hidden.
     */
    .pmd-dashboard2-chart-scroll-viewport,
    .pmd-dashboard2-chart-scroll-stage,
    .pmd-dashboard2-chart-nav {
        display: none !important;
    }
}

@media (max-width: 1280px) {
    [data-pmd-analytics-widget="salesOverTime"],
    [data-pmd-analytics-widget="categorySales"],
    [data-pmd-analytics-widget="salesByHour"],
    [data-pmd-analytics-widget="paymentMethods"] {
        height: auto !important;
        min-height: 0 !important;
        max-height: none !important;
    }

    [data-pmd-analytics-widget="salesOverTime"]
    .pmd-dashboard2-chart-key,

    [data-pmd-analytics-widget="salesByHour"]
    .pmd-dashboard2-chart-key {
        white-space: normal !important;
    }
}
</style>




<style id="pmd-dashboard2-v137-chart-layout">
/* PMD_DASHBOARD2_V137_REAL_CHART_NAV */

@media (min-width: 992px) {
    [data-pmd-analytics-widget="salesOverTime"],
    [data-pmd-analytics-widget="categorySales"],
    [data-pmd-analytics-widget="salesByHour"],
    [data-pmd-analytics-widget="paymentMethods"] {
        height: 460px !important;
        min-height: 460px !important;
        max-height: 460px !important;
    }

    [data-pmd-analytics-widget="salesOverTime"],
    [data-pmd-analytics-widget="salesByHour"] {
        overflow: hidden !important;
    }

    [data-pmd-analytics-widget="salesOverTime"]
        > .pmd-dashboard2-widget-body,
    [data-pmd-analytics-widget="salesByHour"]
        > .pmd-dashboard2-widget-body {
        height: 382px !important;
        min-height: 382px !important;
        max-height: 382px !important;
        padding: 0 10px 8px !important;
        overflow: hidden !important;
        box-sizing: border-box !important;
    }

    [data-pmd-analytics-widget="salesOverTime"]
        .pmd-dashboard2-chart-frame,
    [data-pmd-analytics-widget="salesByHour"]
        .pmd-dashboard2-chart-frame {
        position: relative !important;
        display: block !important;

        height: 374px !important;
        min-height: 374px !important;
        max-height: 374px !important;

        padding: 52px 0 34px !important;
        margin: 0 !important;

        overflow: hidden !important;
        box-sizing: border-box !important;
    }

    [data-pmd-analytics-widget="salesOverTime"]
        .pmd-dashboard2-chart-key,
    [data-pmd-analytics-widget="salesByHour"]
        .pmd-dashboard2-chart-key {
        position: absolute !important;

        top: 4px !important;
        left: 50% !important;
        right: auto !important;
        bottom: auto !important;

        transform: translateX(-50%) !important;

        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        flex-wrap: nowrap !important;

        width: max-content !important;
        max-width: calc(100% - 32px) !important;
        min-height: 30px !important;

        margin: 0 !important;
        z-index: 8 !important;
    }

    [data-pmd-analytics-widget="salesOverTime"]
        .pmd-dashboard2-chart-frame
        > svg,
    [data-pmd-analytics-widget="salesByHour"]
        .pmd-dashboard2-chart-frame
        > svg {
        display: block !important;

        width: 100% !important;
        height: 288px !important;
        min-height: 288px !important;
        max-height: 288px !important;

        margin: 0 !important;

        overflow: visible !important;
        object-fit: contain !important;
    }

    .pmd-dashboard2-chart-nav-v137 {
        position: absolute;

        left: 50%;
        bottom: 3px;

        transform: translateX(-50%);

        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;

        height: 26px;
        min-height: 26px;

        padding: 2px 4px;

        border: 1px solid #dce6e2;
        border-radius: 999px;

        background: rgba(255, 255, 255, 0.94);
        box-shadow: 0 3px 10px rgba(13, 53, 45, 0.06);

        z-index: 12;
    }

    .pmd-dashboard2-chart-nav-v137 button {
        display: inline-flex;
        align-items: center;
        justify-content: center;

        height: 20px;
        min-height: 20px;

        border: 0;
        border-radius: 999px;

        background: transparent;
        color: #36534b;

        font: inherit;
        font-size: 11px;
        font-weight: 700;
        line-height: 1;

        cursor: pointer;

        transition:
            background-color 120ms ease,
            color 120ms ease,
            opacity 120ms ease;
    }

    .pmd-dashboard2-chart-nav-v137
        button[data-pmd-chart-nav-direction] {
        width: 24px;
        min-width: 24px;
        padding: 0;
        font-size: 16px;
    }

    .pmd-dashboard2-chart-nav-v137
        button[data-pmd-chart-nav-reset] {
        min-width: 48px;
        padding: 0 9px;
    }

    .pmd-dashboard2-chart-nav-v137 button:hover:not(:disabled) {
        background: #edf6f2;
        color: #007f65;
    }

    .pmd-dashboard2-chart-nav-v137 button:focus-visible {
        outline: 2px solid #00a676;
        outline-offset: 1px;
    }

    .pmd-dashboard2-chart-nav-v137 button:disabled {
        cursor: default;
        opacity: 0.3;
    }

    .pmd-dashboard2-chart-nav-v137
        [data-pmd-chart-nav-reset].is-windowed {
        background: #e9f6f1;
        color: #007f65;
    }
}

@media (max-width: 991.98px) {
    .pmd-dashboard2-chart-nav-v137 {
        display: none !important;
    }
}
</style>

<style id="pmd-dashboard2-v1371-pills-in-header">
/* PMD_DASHBOARD2_V1371_PILLS_IN_HEADER */

@media (min-width: 992px) {
    [data-pmd-analytics-widget="salesOverTime"] > header,
    [data-pmd-analytics-widget="salesByHour"] > header {
        position: relative !important;

        display: grid !important;
        grid-template-columns:
            minmax(180px, 1fr)
            auto
            minmax(180px, 1fr) !important;

        align-items: center !important;
        column-gap: 18px !important;

        min-height: 58px !important;

        padding-top: 0 !important;
        padding-bottom: 0 !important;
    }

    [data-pmd-analytics-widget="salesOverTime"] > header > h3,
    [data-pmd-analytics-widget="salesByHour"] > header > h3 {
        grid-column: 1 !important;

        justify-self: start !important;
        align-self: center !important;

        margin: 0 !important;
    }

    [data-pmd-analytics-widget="salesOverTime"]
        > header
        > .pmd-dashboard2-chart-key--header-v1371,
    [data-pmd-analytics-widget="salesByHour"]
        > header
        > .pmd-dashboard2-chart-key--header-v1371 {
        position: static !important;

        grid-column: 2 !important;

        justify-self: center !important;
        align-self: center !important;

        transform: none !important;

        top: auto !important;
        right: auto !important;
        bottom: auto !important;
        left: auto !important;

        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        flex-wrap: nowrap !important;

        width: max-content !important;
        max-width: 100% !important;

        min-height: 30px !important;

        margin: 0 !important;
        z-index: 5 !important;
    }

    [data-pmd-analytics-widget="salesOverTime"]
        > header
        > .pmd-dashboard2-chart-toggle {
        grid-column: 3 !important;

        justify-self: end !important;
        align-self: center !important;

        position: static !important;

        top: auto !important;
        right: auto !important;
        bottom: auto !important;
        left: auto !important;

        margin: 0 !important;
    }

    /*
     * Pill دیگر داخل Chart Frame نیست؛ بنابراین فضای 52px
     * قدیمی بالای SVG لازم نیست.
     */
    [data-pmd-analytics-widget="salesOverTime"]
        .pmd-dashboard2-chart-frame,
    [data-pmd-analytics-widget="salesByHour"]
        .pmd-dashboard2-chart-frame {
        padding-top: 8px !important;
        padding-bottom: 34px !important;
    }

    /*
     * Toolbar پایین کارت دست‌نخورده باقی می‌ماند.
     * نمودار فقط از فضای خالی آزادشده استفاده می‌کند.
     */
    [data-pmd-analytics-widget="salesOverTime"]
        .pmd-dashboard2-chart-frame
        > svg,
    [data-pmd-analytics-widget="salesByHour"]
        .pmd-dashboard2-chart-frame
        > svg {
        margin-top: 0 !important;
    }
}

@media (max-width: 1199.98px) and (min-width: 992px) {
    [data-pmd-analytics-widget="salesOverTime"] > header,
    [data-pmd-analytics-widget="salesByHour"] > header {
        grid-template-columns:
            minmax(135px, 1fr)
            auto
            minmax(135px, 1fr) !important;

        column-gap: 10px !important;
    }

    [data-pmd-analytics-widget="salesOverTime"]
        > header
        > .pmd-dashboard2-chart-key--header-v1371,
    [data-pmd-analytics-widget="salesByHour"]
        > header
        > .pmd-dashboard2-chart-key--header-v1371 {
        transform: scale(0.92) !important;
        transform-origin: center !important;
    }
}

@media (max-width: 991.98px) {
    [data-pmd-analytics-widget="salesOverTime"]
        .pmd-dashboard2-chart-key--header-v1371,
    [data-pmd-analytics-widget="salesByHour"]
        .pmd-dashboard2-chart-key--header-v1371 {
        position: static !important;
        transform: none !important;

        margin: 10px auto 4px !important;
    }
}
</style>


<!-- PMD_DASHBOARD2_V1419_SINGLE_UMSATZ_NO_PILL -->
<style id="pmd-dashboard2-v1419-single-umsatz-no-pill">
  /*
   * Umsatzverlauf has only one data series.
   * Peak bars must use the same green as all other Umsatz bars.
   */
  #pmd-dashboard2-analytics-v1
  [data-pmd-analytics-widget="salesOverTime"]
  svg rect.is-peak,

  #pmd-dashboard2-analytics-v1
  [data-pmd-analytics-widget="salesOverTime"]
  svg .is-peak rect,

  #pmd-dashboard2-analytics-v1
  [data-pmd-analytics-widget="salesOverTime"]
  svg rect[data-pmd-peak="true"] {
    fill: #00a676 !important;
    stroke: none !important;
    filter: none !important;
  }

  /*
   * Remove the redundant Umsatz legend pill from Umsatzverlauf only.
   */
  #pmd-dashboard2-analytics-v1
  [data-pmd-analytics-widget="salesOverTime"]
  .pmd-dashboard2-chart-key {
    display: none !important;
    visibility: hidden !important;
    opacity: 0 !important;
    pointer-events: none !important;
  }

  /*
   * Keep title on the left and Linie/Balken on the right.
   */
  #pmd-dashboard2-analytics-v1
  [data-pmd-analytics-widget="salesOverTime"]
  > header {
    grid-template-columns:
      minmax(0, 1fr)
      auto !important;
  }

  #pmd-dashboard2-analytics-v1
  [data-pmd-analytics-widget="salesOverTime"]
  > header
  > h3 {
    grid-column: 1 !important;
  }

  #pmd-dashboard2-analytics-v1
  [data-pmd-analytics-widget="salesOverTime"]
  > header
  > .pmd-dashboard2-chart-toggle {
    grid-column: 2 !important;
    justify-self: end !important;
  }
</style>


<!-- PMD_DASHBOARD2_V1421_LIVE_DATA_CARDS -->
<style id="pmd-dashboard2-v1421-live-data-cards">
  /* Sales by hour has one series, so its Umsatz legend is redundant. */
  #pmd-dashboard2-analytics-v1
  [data-pmd-analytics-widget="salesByHour"]
  .pmd-dashboard2-chart-key {
    display: none !important;
  }

  /* Smaller, cleaner and identical Day/Week/Month controls. */
  #pmd-dashboard2-analytics-v1
  .pmd-dashboard2-donut-period-v1395 {
    top: 10px !important;
    right: 12px !important;
    gap: 1px !important;
    padding: 2px !important;
    border-radius: 10px !important;
    box-shadow: 0 2px 7px rgba(16,42,67,.06) !important;
    transition: none !important;
  }

  #pmd-dashboard2-analytics-v1
  .pmd-dashboard2-donut-period-v1395 button {
    min-width: 30px !important;
    min-height: 22px !important;
    padding: 3px 6px !important;
    border-radius: 7px !important;
    font-size: 9px !important;
    font-weight: 750 !important;
    transition: none !important;
  }

  /* The three donut cards share one vertical design. */
  #pmd-dashboard2-analytics-v1
  [data-pmd-analytics-widget="categorySales"]
  [data-pmd-widget-body],
  #pmd-dashboard2-analytics-v1
  [data-pmd-analytics-widget="paymentMethods"]
  [data-pmd-widget-body],
  #pmd-dashboard2-analytics-v1
  [data-pmd-analytics-widget="channelSplit"]
  [data-pmd-widget-body] {
    display: flex !important;
    align-items: flex-start !important;
    justify-content: center !important;
    overflow: hidden !important;
  }

  #pmd-dashboard2-analytics-v1
  [data-pmd-analytics-widget="categorySales"]
  .pmd-dashboard2-donut,
  #pmd-dashboard2-analytics-v1
  [data-pmd-analytics-widget="paymentMethods"]
  .pmd-dashboard2-donut,
  #pmd-dashboard2-analytics-v1
  [data-pmd-analytics-widget="channelSplit"]
  .pmd-dashboard2-donut {
    width: 100% !important;
    display: grid !important;
    grid-template-columns: 1fr !important;
    grid-template-rows: auto auto !important;
    align-content: start !important;
    justify-items: center !important;
    gap: 10px !important;
  }

  #pmd-dashboard2-analytics-v1
  [data-pmd-analytics-widget="categorySales"]
  .pmd-dashboard2-donut > svg,
  #pmd-dashboard2-analytics-v1
  [data-pmd-analytics-widget="paymentMethods"]
  .pmd-dashboard2-donut > svg,
  #pmd-dashboard2-analytics-v1
  [data-pmd-analytics-widget="channelSplit"]
  .pmd-dashboard2-donut > svg {
    width: 142px !important;
    height: 142px !important;
    max-width: 48% !important;
    display: block !important;
    margin: 0 auto !important;
  }

  #pmd-dashboard2-analytics-v1
  [data-pmd-analytics-widget="categorySales"]
  .pmd-chart-legend,
  #pmd-dashboard2-analytics-v1
  [data-pmd-analytics-widget="paymentMethods"]
  .pmd-chart-legend,
  #pmd-dashboard2-analytics-v1
  [data-pmd-analytics-widget="channelSplit"]
  .pmd-chart-legend {
    width: 100% !important;
    max-width: none !important;
    margin: 0 !important;
    padding: 0 4px !important;
    display: grid !important;
    grid-template-columns: 1fr !important;
    gap: 3px !important;
  }

  #pmd-dashboard2-analytics-v1
  [data-pmd-analytics-widget="categorySales"]
  .pmd-chart-legend li,
  #pmd-dashboard2-analytics-v1
  [data-pmd-analytics-widget="paymentMethods"]
  .pmd-chart-legend li,
  #pmd-dashboard2-analytics-v1
  [data-pmd-analytics-widget="channelSplit"]
  .pmd-chart-legend li {
    min-width: 0 !important;
    display: grid !important;
    grid-template-columns: 14px minmax(0,1fr) auto !important;
    align-items: center !important;
    column-gap: 7px !important;
    padding: 2px 0 !important;
  }

  #pmd-dashboard2-analytics-v1
  [data-pmd-analytics-widget="categorySales"]
  .pmd-chart-legend li span,
  #pmd-dashboard2-analytics-v1
  [data-pmd-analytics-widget="paymentMethods"]
  .pmd-chart-legend li span,
  #pmd-dashboard2-analytics-v1
  [data-pmd-analytics-widget="channelSplit"]
  .pmd-chart-legend li span {
    min-width: 0 !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
    white-space: nowrap !important;
  }

  #pmd-dashboard2-analytics-v1
  [data-pmd-analytics-widget="categorySales"]
  .pmd-chart-legend li b,
  #pmd-dashboard2-analytics-v1
  [data-pmd-analytics-widget="paymentMethods"]
  .pmd-chart-legend li b,
  #pmd-dashboard2-analytics-v1
  [data-pmd-analytics-widget="channelSplit"]
  .pmd-chart-legend li b {
    white-space: nowrap !important;
    font-size: 11px !important;
  }

  /* Live card now shows orders only. */
  #pmd-dashboard2-analytics-v1
  [data-pmd-analytics-widget="liveOperations"]
  .pmd-dashboard2-live-summary {
    grid-template-columns: auto 1fr !important;
  }
</style>


<!-- PMD_DASHBOARD2_V1422_SOURCE_REPAIR -->
<style id="pmd-dashboard2-v1422-source-repair">
  #pmd-dashboard2-analytics-v1
  [data-pmd-analytics-widget="categorySales"]
  .pmd-dashboard2-empty,
  #pmd-dashboard2-analytics-v1
  [data-pmd-analytics-widget="paymentMethods"]
  .pmd-dashboard2-empty {
    width: 100% !important;
    margin: 20px 0 0 !important;
    text-align: center !important;
  }
</style>


<!-- PMD_DASHBOARD2_V1423_EQUAL_OPERATION_CARDS -->
<style id="pmd-dashboard2-v1423-equal-operation-cards">
  /*
   * Desktop operational row:
   * Letzte Transaktionen | Warnungen | Live orders | Bestellkanäle
   *
   * All four cards receive exactly one quarter of the row.
   */
  @media (min-width: 1281px) {
    #pmd-dashboard2-analytics-v1
    [data-pmd-analytics-widget="recentTransactions"],

    #pmd-dashboard2-analytics-v1
    [data-pmd-analytics-widget="alerts"],

    #pmd-dashboard2-analytics-v1
    [data-pmd-analytics-widget="liveOperations"],

    #pmd-dashboard2-analytics-v1
    [data-pmd-analytics-widget="channelSplit"] {
      grid-column: span 3 !important;
      width: 100% !important;
      min-width: 0 !important;
      max-width: none !important;
      box-sizing: border-box !important;
    }

    /*
     * Keep long transaction text from increasing the card width.
     */
    #pmd-dashboard2-analytics-v1
    [data-pmd-analytics-widget="recentTransactions"]
    .pmd-dashboard2-data-list li > :first-child,

    #pmd-dashboard2-analytics-v1
    [data-pmd-analytics-widget="liveOperations"]
    .pmd-dashboard2-data-list li > :first-child {
      min-width: 0 !important;
      overflow: hidden !important;
      text-overflow: ellipsis !important;
      white-space: nowrap !important;
    }

    #pmd-dashboard2-analytics-v1
    [data-pmd-analytics-widget="recentTransactions"]
    .pmd-dashboard2-data-list li > :last-child,

    #pmd-dashboard2-analytics-v1
    [data-pmd-analytics-widget="liveOperations"]
    .pmd-dashboard2-data-list li > :last-child {
      flex: 0 0 auto !important;
      white-space: nowrap !important;
    }
  }
</style>


<!-- PMD_DASHBOARD2_V1424_EQUAL_BOTTOM_ROW -->
<style id="pmd-dashboard2-v1424-equal-bottom-row">
  /*
   * Final desktop row:
   *
   * Top-selling items | Tips summary |
   * Latest reviews    | Upcoming reservations
   *
   * Four equal cards: 3 of 12 grid columns each.
   */
  @media (min-width: 1281px) {
    #pmd-dashboard2-analytics-v1
    [data-pmd-analytics-widget="topItems"],

    #pmd-dashboard2-analytics-v1
    [data-pmd-analytics-widget="tips"],

    #pmd-dashboard2-analytics-v1
    [data-pmd-analytics-widget="reviews"],

    #pmd-dashboard2-analytics-v1
    [data-pmd-analytics-widget="calendarEvents"] {
      grid-column: span 3 !important;
      grid-row: auto !important;

      width: 100% !important;
      min-width: 0 !important;
      max-width: none !important;

      height: 255px !important;
      min-height: 255px !important;
      max-height: 255px !important;

      align-self: stretch !important;
      box-sizing: border-box !important;
    }

    /*
     * Keep all four cards together after the operational row.
     */
    #pmd-dashboard2-analytics-v1
    [data-pmd-analytics-widget="topItems"] {
      order: 30 !important;
    }

    #pmd-dashboard2-analytics-v1
    [data-pmd-analytics-widget="tips"] {
      order: 31 !important;
    }

    #pmd-dashboard2-analytics-v1
    [data-pmd-analytics-widget="reviews"] {
      order: 32 !important;
    }

    #pmd-dashboard2-analytics-v1
    [data-pmd-analytics-widget="calendarEvents"] {
      order: 33 !important;
    }

    /*
     * Content stays inside the equal-height cards.
     */
    #pmd-dashboard2-analytics-v1
    [data-pmd-analytics-widget="topItems"]
    [data-pmd-widget-body],

    #pmd-dashboard2-analytics-v1
    [data-pmd-analytics-widget="tips"]
    [data-pmd-widget-body],

    #pmd-dashboard2-analytics-v1
    [data-pmd-analytics-widget="reviews"]
    [data-pmd-widget-body],

    #pmd-dashboard2-analytics-v1
    [data-pmd-analytics-widget="calendarEvents"]
    [data-pmd-widget-body] {
      min-height: 0 !important;
      overflow: auto !important;
      scrollbar-width: thin;
    }

    /*
     * Prevent long reservation/review text from widening cards.
     */
    #pmd-dashboard2-analytics-v1
    [data-pmd-analytics-widget="reviews"]
    li > :first-child,

    #pmd-dashboard2-analytics-v1
    [data-pmd-analytics-widget="calendarEvents"]
    li > :first-child {
      min-width: 0 !important;
      overflow: hidden !important;
      text-overflow: ellipsis !important;
      white-space: nowrap !important;
    }

    #pmd-dashboard2-analytics-v1
    [data-pmd-analytics-widget="reviews"]
    li > :last-child,

    #pmd-dashboard2-analytics-v1
    [data-pmd-analytics-widget="calendarEvents"]
    li > :last-child {
      flex: 0 0 auto !important;
      white-space: nowrap !important;
    }
  }
</style>


<!-- PMD_DASHBOARD2_V1426_BOTTOM_ROW_REAL_KEYS -->
<style id="pmd-dashboard2-v1426-bottom-row-real-keys">
  @media (min-width: 1281px) {
    /*
     * The exact live widget keys confirmed in Browser Console:
     *
     * topItems
     * tips
     * reviews
     * calendarEvents
     *
     * Each card has two explicit rows:
     * 1. header
     * 2. scrollable content
     */
    #pmd-dashboard2-analytics-v1
    [data-pmd-analytics-widget="topItems"],

    #pmd-dashboard2-analytics-v1
    [data-pmd-analytics-widget="tips"],

    #pmd-dashboard2-analytics-v1
    [data-pmd-analytics-widget="reviews"],

    #pmd-dashboard2-analytics-v1
    [data-pmd-analytics-widget="calendarEvents"] {
      display: grid !important;

      grid-template-columns:
        minmax(0, 1fr) !important;

      grid-template-rows:
        auto
        minmax(0, 1fr) !important;

      align-items: stretch !important;
      align-content: stretch !important;
      justify-items: stretch !important;
      justify-content: stretch !important;

      width: 100% !important;
      min-width: 0 !important;

      height: 255px !important;
      min-height: 255px !important;
      max-height: 255px !important;

      padding: 16px !important;
      overflow: hidden !important;
      box-sizing: border-box !important;
    }

    /*
     * Cancel the old full-height / vertically-centered header rules.
     */
    #pmd-dashboard2-analytics-v1
    [data-pmd-analytics-widget="topItems"]
    > header,

    #pmd-dashboard2-analytics-v1
    [data-pmd-analytics-widget="tips"]
    > header,

    #pmd-dashboard2-analytics-v1
    [data-pmd-analytics-widget="reviews"]
    > header,

    #pmd-dashboard2-analytics-v1
    [data-pmd-analytics-widget="calendarEvents"]
    > header {
      position: static !important;
      inset: auto !important;

      grid-column: 1 !important;
      grid-row: 1 !important;

      display: block !important;

      width: 100% !important;
      min-width: 0 !important;

      height: auto !important;
      min-height: 0 !important;
      max-height: none !important;

      margin: 0 0 12px !important;
      padding: 0 !important;

      align-self: start !important;
      justify-self: stretch !important;

      overflow: visible !important;

      transform: none !important;
      translate: none !important;
    }

    #pmd-dashboard2-analytics-v1
    [data-pmd-analytics-widget="topItems"]
    > header h3,

    #pmd-dashboard2-analytics-v1
    [data-pmd-analytics-widget="tips"]
    > header h3,

    #pmd-dashboard2-analytics-v1
    [data-pmd-analytics-widget="reviews"]
    > header h3,

    #pmd-dashboard2-analytics-v1
    [data-pmd-analytics-widget="calendarEvents"]
    > header h3 {
      position: static !important;

      width: auto !important;
      height: auto !important;
      min-height: 0 !important;
      max-height: none !important;

      margin: 0 !important;
      padding: 0 !important;

      line-height: 1.2 !important;

      transform: none !important;
      translate: none !important;
    }

    /*
     * The real hydrated body occupies only row 2.
     */
    #pmd-dashboard2-analytics-v1
    [data-pmd-analytics-widget="topItems"]
    > [data-pmd-widget-body],

    #pmd-dashboard2-analytics-v1
    [data-pmd-analytics-widget="tips"]
    > [data-pmd-widget-body],

    #pmd-dashboard2-analytics-v1
    [data-pmd-analytics-widget="reviews"]
    > [data-pmd-widget-body],

    #pmd-dashboard2-analytics-v1
    [data-pmd-analytics-widget="calendarEvents"]
    > [data-pmd-widget-body] {
      position: static !important;
      inset: auto !important;

      grid-column: 1 !important;
      grid-row: 2 !important;

      display: block !important;
      visibility: visible !important;
      opacity: 1 !important;

      width: 100% !important;
      min-width: 0 !important;

      height: auto !important;
      min-height: 0 !important;
      max-height: none !important;

      margin: 0 !important;
      padding: 0 !important;

      align-self: stretch !important;
      justify-self: stretch !important;

      overflow-x: hidden !important;
      overflow-y: auto !important;

      transform: none !important;
      translate: none !important;

      transition: none !important;
      animation: none !important;

      scrollbar-width: thin;
      box-sizing: border-box !important;
    }

    /*
     * Restore the actual hydrated content wrappers.
     */
    #pmd-dashboard2-analytics-v1
    [data-pmd-analytics-widget="topItems"]
    > [data-pmd-widget-body]
    > *,

    #pmd-dashboard2-analytics-v1
    [data-pmd-analytics-widget="tips"]
    > [data-pmd-widget-body]
    > *,

    #pmd-dashboard2-analytics-v1
    [data-pmd-analytics-widget="reviews"]
    > [data-pmd-widget-body]
    > *,

    #pmd-dashboard2-analytics-v1
    [data-pmd-analytics-widget="calendarEvents"]
    > [data-pmd-widget-body]
    > * {
      position: static !important;

      visibility: visible !important;
      opacity: 1 !important;

      width: 100% !important;
      min-width: 0 !important;

      height: auto !important;
      min-height: 0 !important;
      max-height: none !important;

      margin-top: 0 !important;

      transform: none !important;
      translate: none !important;

      transition: none !important;
      animation: none !important;
    }

    /*
     * Lists must start immediately below the card title.
     */
    #pmd-dashboard2-analytics-v1
    [data-pmd-analytics-widget="topItems"] ul,

    #pmd-dashboard2-analytics-v1
    [data-pmd-analytics-widget="reviews"] ul,

    #pmd-dashboard2-analytics-v1
    [data-pmd-analytics-widget="calendarEvents"] ul {
      width: 100% !important;

      margin: 0 !important;
      padding: 0 !important;
    }

    /*
     * Keep reservation and review rows inside their cards.
     */
    #pmd-dashboard2-analytics-v1
    [data-pmd-analytics-widget="reviews"] li,

    #pmd-dashboard2-analytics-v1
    [data-pmd-analytics-widget="calendarEvents"] li {
      width: 100% !important;
      min-width: 0 !important;
      box-sizing: border-box !important;
    }

    #pmd-dashboard2-analytics-v1
    [data-pmd-analytics-widget="reviews"]
    li > :first-child,

    #pmd-dashboard2-analytics-v1
    [data-pmd-analytics-widget="calendarEvents"]
    li > :first-child {
      min-width: 0 !important;

      overflow: hidden !important;
      text-overflow: ellipsis !important;
      white-space: nowrap !important;
    }

    #pmd-dashboard2-analytics-v1
    [data-pmd-analytics-widget="reviews"]
    li > :last-child,

    #pmd-dashboard2-analytics-v1
    [data-pmd-analytics-widget="calendarEvents"]
    li > :last-child {
      flex: 0 0 auto !important;
      white-space: nowrap !important;
    }
  }
</style>


<!-- PMD_DASHBOARD2_V1427_COMPACT_PERIOD_TOGGLES -->
<style id="pmd-dashboard2-v1427-compact-period-toggles">
  /*
   * Compact and identical Day / Week / Month controls
   * for the three Donut cards only.
   */
  #pmd-dashboard2-analytics-v1
  :is(
    [data-pmd-analytics-widget="categorySales"],
    [data-pmd-analytics-widget="paymentMethods"],
    [data-pmd-analytics-widget="channelSplit"]
  )
  header
  :has(> [data-pmd-analytics-period]) {
    display: inline-flex !important;
    align-items: center !important;
    justify-content: flex-end !important;

    gap: 2px !important;

    width: auto !important;
    min-width: 0 !important;
    max-width: max-content !important;

    height: 36px !important;
    min-height: 36px !important;

    margin: 0 !important;
    padding: 3px !important;

    border: 1px solid #d7e5e0 !important;
    border-radius: 12px !important;

    background: #f8fbfa !important;

    box-shadow:
      0 3px 8px rgba(16, 42, 67, 0.06) !important;

    box-sizing: border-box !important;
  }

  #pmd-dashboard2-analytics-v1
  :is(
    [data-pmd-analytics-widget="categorySales"],
    [data-pmd-analytics-widget="paymentMethods"],
    [data-pmd-analytics-widget="channelSplit"]
  )
  [data-pmd-analytics-period] {
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;

    flex: 0 0 auto !important;

    width: auto !important;
    min-width: 43px !important;
    max-width: none !important;

    height: 28px !important;
    min-height: 28px !important;
    max-height: 28px !important;

    margin: 0 !important;
    padding: 0 9px !important;

    border: 0 !important;
    border-radius: 9px !important;

    font-size: 11px !important;
    font-weight: 700 !important;
    line-height: 1 !important;
    white-space: nowrap !important;

    color: #52635f !important;
    background: transparent !important;

    box-shadow: none !important;

    transform: none !important;
    transition:
      background-color 120ms ease,
      color 120ms ease,
      box-shadow 120ms ease !important;

    box-sizing: border-box !important;
  }

  /*
   * Selected period.
   */
  #pmd-dashboard2-analytics-v1
  :is(
    [data-pmd-analytics-widget="categorySales"],
    [data-pmd-analytics-widget="paymentMethods"],
    [data-pmd-analytics-widget="channelSplit"]
  )
  [data-pmd-analytics-period].is-active,

  #pmd-dashboard2-analytics-v1
  :is(
    [data-pmd-analytics-widget="categorySales"],
    [data-pmd-analytics-widget="paymentMethods"],
    [data-pmd-analytics-widget="channelSplit"]
  )
  [data-pmd-analytics-period][aria-pressed="true"],

  #pmd-dashboard2-analytics-v1
  :is(
    [data-pmd-analytics-widget="categorySales"],
    [data-pmd-analytics-widget="paymentMethods"],
    [data-pmd-analytics-widget="channelSplit"]
  )
  [data-pmd-analytics-period][data-active="true"] {
    color: #ffffff !important;
    background: #008f6a !important;

    box-shadow:
      0 3px 7px rgba(0, 143, 106, 0.18) !important;
  }

  /*
   * Keep the control in the upper-right corner without
   * covering long translated titles.
   */
  #pmd-dashboard2-analytics-v1
  :is(
    [data-pmd-analytics-widget="categorySales"],
    [data-pmd-analytics-widget="paymentMethods"],
    [data-pmd-analytics-widget="channelSplit"]
  )
  > header {
    display: grid !important;

    grid-template-columns:
      minmax(0, 1fr)
      auto !important;

    align-items: start !important;
    column-gap: 8px !important;
  }

  #pmd-dashboard2-analytics-v1
  :is(
    [data-pmd-analytics-widget="categorySales"],
    [data-pmd-analytics-widget="paymentMethods"],
    [data-pmd-analytics-widget="channelSplit"]
  )
  > header
  > h3 {
    grid-column: 1 !important;

    min-width: 0 !important;
    margin: 0 !important;

    line-height: 1.08 !important;
  }

  #pmd-dashboard2-analytics-v1
  :is(
    [data-pmd-analytics-widget="categorySales"],
    [data-pmd-analytics-widget="paymentMethods"],
    [data-pmd-analytics-widget="channelSplit"]
  )
  > header
  > :has(> [data-pmd-analytics-period]) {
    grid-column: 2 !important;

    align-self: start !important;
    justify-self: end !important;
  }

  /*
   * Slightly smaller on narrow cards/mobile.
   */
  @media (max-width: 700px) {
    #pmd-dashboard2-analytics-v1
    :is(
      [data-pmd-analytics-widget="categorySales"],
      [data-pmd-analytics-widget="paymentMethods"],
      [data-pmd-analytics-widget="channelSplit"]
    )
    header
    :has(> [data-pmd-analytics-period]) {
      height: 34px !important;
      min-height: 34px !important;
    }

    #pmd-dashboard2-analytics-v1
    :is(
      [data-pmd-analytics-widget="categorySales"],
      [data-pmd-analytics-widget="paymentMethods"],
      [data-pmd-analytics-widget="channelSplit"]
    )
    [data-pmd-analytics-period] {
      min-width: 39px !important;

      height: 26px !important;
      min-height: 26px !important;
      max-height: 26px !important;

      padding: 0 7px !important;

      font-size: 10px !important;
    }
  }
</style>


<!-- PMD_DASHBOARD2_V1428_REAL_COMPACT_DONUT_TOGGLES -->
<style id="pmd-dashboard2-v1428-real-compact-donut-toggles">
  /*
   * Real production structure confirmed in Browser Console:
   *
   * Parent:
   * .pmd-dashboard2-donut-period-v1395
   *
   * Button:
   * [data-pmd-donut-period]
   *
   * admin.css globally forces every button to 40px.
   * These stronger selectors override that rule only inside
   * Category, Payment and Order-channel cards.
   */

  #pmd-dashboard2-analytics-v1
  [data-pmd-analytics-widget="categorySales"]
  .pmd-dashboard2-donut-period-v1395,

  #pmd-dashboard2-analytics-v1
  [data-pmd-analytics-widget="paymentMethods"]
  .pmd-dashboard2-donut-period-v1395,

  #pmd-dashboard2-analytics-v1
  [data-pmd-analytics-widget="channelSplit"]
  .pmd-dashboard2-donut-period-v1395 {
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;

    gap: 2px !important;

    width: auto !important;
    min-width: 0 !important;
    max-width: max-content !important;

    height: 32px !important;
    min-height: 32px !important;
    max-height: 32px !important;

    margin: 0 !important;
    padding: 2px !important;

    border: 1px solid #d7e5e0 !important;
    border-radius: 10px !important;

    background: #f8fbfa !important;

    box-shadow:
      0 2px 6px rgba(16, 42, 67, 0.06) !important;

    overflow: hidden !important;
    box-sizing: border-box !important;
  }

  /*
   * Stronger than the global:
   *
   * .btn, button {
   *   height: 40px !important;
   * }
   */
  #pmd-dashboard2-analytics-v1
  [data-pmd-analytics-widget="categorySales"]
  .pmd-dashboard2-donut-period-v1395
  button[data-pmd-donut-period],

  #pmd-dashboard2-analytics-v1
  [data-pmd-analytics-widget="paymentMethods"]
  .pmd-dashboard2-donut-period-v1395
  button[data-pmd-donut-period],

  #pmd-dashboard2-analytics-v1
  [data-pmd-analytics-widget="channelSplit"]
  .pmd-dashboard2-donut-period-v1395
  button[data-pmd-donut-period] {
    appearance: none !important;

    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;

    flex: 0 0 auto !important;

    width: auto !important;
    min-width: 34px !important;
    max-width: none !important;

    height: 26px !important;
    min-height: 26px !important;
    max-height: 26px !important;

    margin: 0 !important;
    padding: 0 7px !important;

    border: 0 !important;
    border-radius: 8px !important;

    background: transparent !important;
    color: #52635f !important;

    font-family:
      Roboto,
      Arial,
      Helvetica,
      sans-serif !important;

    font-size: 10px !important;
    font-weight: 700 !important;
    line-height: 1 !important;
    letter-spacing: -0.01em !important;
    white-space: nowrap !important;

    box-shadow: none !important;

    position: static !important;
    z-index: auto !important;

    transform: none !important;
    transition:
      background-color 120ms ease,
      color 120ms ease,
      box-shadow 120ms ease !important;

    box-sizing: border-box !important;
  }

  /*
   * Selected state.
   */
  #pmd-dashboard2-analytics-v1
  [data-pmd-analytics-widget="categorySales"]
  .pmd-dashboard2-donut-period-v1395
  button[data-pmd-donut-period].is-active,

  #pmd-dashboard2-analytics-v1
  [data-pmd-analytics-widget="categorySales"]
  .pmd-dashboard2-donut-period-v1395
  button[data-pmd-donut-period][aria-pressed="true"],

  #pmd-dashboard2-analytics-v1
  [data-pmd-analytics-widget="paymentMethods"]
  .pmd-dashboard2-donut-period-v1395
  button[data-pmd-donut-period].is-active,

  #pmd-dashboard2-analytics-v1
  [data-pmd-analytics-widget="paymentMethods"]
  .pmd-dashboard2-donut-period-v1395
  button[data-pmd-donut-period][aria-pressed="true"],

  #pmd-dashboard2-analytics-v1
  [data-pmd-analytics-widget="channelSplit"]
  .pmd-dashboard2-donut-period-v1395
  button[data-pmd-donut-period].is-active,

  #pmd-dashboard2-analytics-v1
  [data-pmd-analytics-widget="channelSplit"]
  .pmd-dashboard2-donut-period-v1395
  button[data-pmd-donut-period][aria-pressed="true"] {
    background: #008f6a !important;
    color: #ffffff !important;

    box-shadow:
      0 2px 5px rgba(0, 143, 106, 0.2) !important;
  }

  /*
   * Place every compact control at the top-right.
   */
  #pmd-dashboard2-analytics-v1
  [data-pmd-analytics-widget="categorySales"]
  > header,

  #pmd-dashboard2-analytics-v1
  [data-pmd-analytics-widget="paymentMethods"]
  > header,

  #pmd-dashboard2-analytics-v1
  [data-pmd-analytics-widget="channelSplit"]
  > header {
    display: grid !important;

    grid-template-columns:
      minmax(0, 1fr)
      auto !important;

    align-items: start !important;
    gap: 8px !important;
  }

  #pmd-dashboard2-analytics-v1
  [data-pmd-analytics-widget="categorySales"]
  > header
  > .pmd-dashboard2-donut-period-v1395,

  #pmd-dashboard2-analytics-v1
  [data-pmd-analytics-widget="paymentMethods"]
  > header
  > .pmd-dashboard2-donut-period-v1395,

  #pmd-dashboard2-analytics-v1
  [data-pmd-analytics-widget="channelSplit"]
  > header
  > .pmd-dashboard2-donut-period-v1395 {
    grid-column: 2 !important;

    align-self: start !important;
    justify-self: end !important;
  }

  /*
   * German titles can wrap without enlarging the toggle.
   */
  #pmd-dashboard2-analytics-v1
  [data-pmd-analytics-widget="categorySales"]
  > header
  > h3,

  #pmd-dashboard2-analytics-v1
  [data-pmd-analytics-widget="paymentMethods"]
  > header
  > h3,

  #pmd-dashboard2-analytics-v1
  [data-pmd-analytics-widget="channelSplit"]
  > header
  > h3 {
    grid-column: 1 !important;

    min-width: 0 !important;
    margin: 0 !important;

    line-height: 1.08 !important;
  }

  /*
   * Keyboard accessibility.
   */
  #pmd-dashboard2-analytics-v1
  :is(
    [data-pmd-analytics-widget="categorySales"],
    [data-pmd-analytics-widget="paymentMethods"],
    [data-pmd-analytics-widget="channelSplit"]
  )
  .pmd-dashboard2-donut-period-v1395
  button[data-pmd-donut-period]:focus-visible {
    outline: 2px solid rgba(0, 143, 106, 0.35) !important;
    outline-offset: 1px !important;
  }
</style>


<!-- PMD_DASHBOARD2_V1429_CHART_TOGGLE_AND_TODAY_ALERTS -->
<style id="pmd-dashboard2-v1429-chart-toggle">
  /*
   * Linie / Balken must exactly match the compact
   * Day / Week / Month controls:
   *
   * Outer height: 32px
   * Button height: 26px
   */
  #pmd-dashboard2-analytics-v1
  [data-pmd-analytics-widget="salesOverTime"]
  .pmd-dashboard2-chart-toggle {
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;

    gap: 2px !important;

    width: auto !important;
    min-width: 0 !important;
    max-width: max-content !important;

    height: 32px !important;
    min-height: 32px !important;
    max-height: 32px !important;

    margin: 0 !important;
    padding: 2px !important;

    border: 1px solid #d7e5e0 !important;
    border-radius: 10px !important;

    background: #f8fbfa !important;

    box-shadow:
      0 2px 6px rgba(16, 42, 67, 0.06) !important;

    overflow: hidden !important;
    box-sizing: border-box !important;
  }

  /*
   * Stronger than the global admin.css rule that forces
   * every button to height: 40px !important.
   */
  #pmd-dashboard2-analytics-v1
  [data-pmd-analytics-widget="salesOverTime"]
  .pmd-dashboard2-chart-toggle
  button[data-pmd-chart-mode] {
    appearance: none !important;

    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;

    flex: 0 0 auto !important;

    width: auto !important;
    min-width: 42px !important;
    max-width: none !important;

    height: 26px !important;
    min-height: 26px !important;
    max-height: 26px !important;

    margin: 0 !important;
    padding: 0 8px !important;

    border: 0 !important;
    border-radius: 8px !important;

    background: transparent !important;
    color: #52635f !important;

    font-family:
      Roboto,
      Arial,
      Helvetica,
      sans-serif !important;

    font-size: 10px !important;
    font-weight: 700 !important;
    line-height: 1 !important;
    letter-spacing: -0.01em !important;
    white-space: nowrap !important;

    box-shadow: none !important;

    position: static !important;
    z-index: auto !important;

    transform: none !important;

    transition:
      background-color 120ms ease,
      color 120ms ease,
      box-shadow 120ms ease !important;

    box-sizing: border-box !important;
  }

  /*
   * Selected Linie or Balken mode.
   */
  #pmd-dashboard2-analytics-v1
  [data-pmd-analytics-widget="salesOverTime"]
  .pmd-dashboard2-chart-toggle
  button[data-pmd-chart-mode].is-active,

  #pmd-dashboard2-analytics-v1
  [data-pmd-analytics-widget="salesOverTime"]
  .pmd-dashboard2-chart-toggle
  button[data-pmd-chart-mode][aria-pressed="true"],

  #pmd-dashboard2-analytics-v1
  [data-pmd-analytics-widget="salesOverTime"]
  .pmd-dashboard2-chart-toggle
  button[data-pmd-chart-mode][data-active="true"] {
    background: #008f6a !important;
    color: #ffffff !important;

    box-shadow:
      0 2px 5px rgba(0, 143, 106, 0.20) !important;
  }

  #pmd-dashboard2-analytics-v1
  [data-pmd-analytics-widget="salesOverTime"]
  .pmd-dashboard2-chart-toggle
  button[data-pmd-chart-mode]:focus-visible {
    outline: 2px solid rgba(0, 143, 106, 0.35) !important;
    outline-offset: 1px !important;
  }
</style>

<!-- PMD_DASHBOARD2_TIPS_RUNTIME_HEIGHT_V4 -->
<style id="pmd-dashboard2-tips-runtime-height-v4-style">
  /*
   * Exact lower-card readability authority.
   * Scope is limited to the specified Dashboard2 cards.
   */
  #pmd-dashboard2-analytics-v1
  :is(
    [data-pmd-analytics-widget="recentTransactions"],
    [data-pmd-analytics-widget="alerts"],
    [data-pmd-analytics-widget="liveOperations"],
    [data-pmd-analytics-widget="topItems"],
    [data-pmd-analytics-widget="reviews"],
    [data-pmd-analytics-widget="calendarEvents"]
  )
  .pmd-dashboard2-widget-body {
    font-size: 14px !important;
    line-height: 1.38 !important;
  }

  #pmd-dashboard2-analytics-v1
  :is(
    [data-pmd-analytics-widget="recentTransactions"],
    [data-pmd-analytics-widget="alerts"],
    [data-pmd-analytics-widget="liveOperations"],
    [data-pmd-analytics-widget="topItems"],
    [data-pmd-analytics-widget="reviews"],
    [data-pmd-analytics-widget="calendarEvents"]
  )
  .pmd-dashboard2-data-list li {
    font-size: 14px !important;
    line-height: 1.35 !important;
    min-height: 36px !important;
  }

  #pmd-dashboard2-analytics-v1
  :is(
    [data-pmd-analytics-widget="recentTransactions"],
    [data-pmd-analytics-widget="alerts"],
    [data-pmd-analytics-widget="liveOperations"],
    [data-pmd-analytics-widget="topItems"],
    [data-pmd-analytics-widget="reviews"],
    [data-pmd-analytics-widget="calendarEvents"]
  )
  .pmd-dashboard2-data-list li span {
    font-size: 14px !important;
  }

  #pmd-dashboard2-analytics-v1
  :is(
    [data-pmd-analytics-widget="recentTransactions"],
    [data-pmd-analytics-widget="alerts"],
    [data-pmd-analytics-widget="liveOperations"],
    [data-pmd-analytics-widget="topItems"],
    [data-pmd-analytics-widget="reviews"],
    [data-pmd-analytics-widget="calendarEvents"]
  )
  .pmd-dashboard2-data-list li b {
    font-size: 13.5px !important;
    line-height: 1.35 !important;
  }

  #pmd-dashboard2-analytics-v1
  [data-pmd-analytics-widget="tips"]
  .pmd-dashboard2-stats dt {
    font-size: 13px !important;
    line-height: 1.25 !important;
  }

  #pmd-dashboard2-analytics-v1
  [data-pmd-analytics-widget="tips"]
  .pmd-dashboard2-stats dd {
    font-size: 20px !important;
    line-height: 1.1 !important;
  }
</style>

<script>
(function () {
  'use strict';

  const PATCH_KEY =
    'PMDDashboard2TipsRuntimeHeightV4';

  if (window[PATCH_KEY]?.installed) {
    return;
  }

  let scheduledFrame = 0;

  function important(element, property, value) {
    if (!element) {
      return;
    }

    element.style.setProperty(
      property,
      value,
      'important'
    );
  }

  function applyTipsHeight() {
    const card = document.querySelector(
      '#pmd-dashboard2-analytics-v1 ' +
      '[data-pmd-analytics-widget="tips"]'
    );

    const body = card?.querySelector(
      '.pmd-dashboard2-widget-body'
    );

    const grid = card?.querySelector(
      '.pmd-dashboard2-stats'
    );

    if (!card || !body || !grid) {
      return {
        applied: false,
        reason: 'tips-elements-not-ready'
      };
    }

    important(card, 'display', 'grid');
    important(
      card,
      'grid-template-rows',
      'auto minmax(0, 1fr)'
    );
    important(
      card,
      'align-items',
      'stretch'
    );

    important(body, 'display', 'block');
    important(body, 'height', '100%');
    important(body, 'min-height', '0');
    important(body, 'max-height', 'none');
    important(body, 'padding', '0');
    important(body, 'overflow', 'hidden');

    /*
     * The audit showed:
     * body = 188px
     * grid = 142px
     *
     * Set the grid to the exact rendered body height so no
     * later flex/grid rule can shrink it again.
     */
    const bodyHeight =
      Math.max(
        0,
        Math.round(
          body.getBoundingClientRect().height
        )
      );

    important(grid, 'display', 'grid');
    important(grid, 'width', '100%');
    important(
      grid,
      'height',
      `${bodyHeight}px`
    );
    important(
      grid,
      'min-height',
      `${bodyHeight}px`
    );
    important(
      grid,
      'max-height',
      `${bodyHeight}px`
    );

    important(
      grid,
      'grid-template-columns',
      'repeat(2, minmax(0, 1fr))'
    );

    important(
      grid,
      'grid-template-rows',
      'repeat(2, minmax(0, 1fr))'
    );

    important(grid, 'gap', '10px');
    important(grid, 'margin', '0');
    important(grid, 'align-items', 'stretch');
    important(grid, 'align-content', 'stretch');

    [...grid.children].forEach(cell => {
      important(cell, 'height', 'auto');
      important(cell, 'min-height', '0');
      important(cell, 'align-self', 'stretch');
      important(cell, 'display', 'flex');
      important(cell, 'flex-direction', 'column');
      important(cell, 'justify-content', 'center');
    });

    const cardRect =
      card.getBoundingClientRect();

    const gridRect =
      grid.getBoundingClientRect();

    const result = {
      applied: true,
      bodyHeight,
      gridHeight:
        Math.round(gridRect.height),

      cardBottomGap:
        Math.round(
          cardRect.bottom -
          gridRect.bottom
        )
    };

    console.info(
      '[PMD Dashboard2 Tips Runtime Height V4]',
      result
    );

    return result;
  }

  function schedule() {
    if (scheduledFrame) {
      cancelAnimationFrame(scheduledFrame);
    }

    scheduledFrame =
      requestAnimationFrame(() => {
        scheduledFrame = 0;
        applyTipsHeight();
      });
  }

  function boot() {
    const result = applyTipsHeight();

    const root =
      document.getElementById(
        'pmd-dashboard2-analytics-v1'
      );

    if (root) {
      const observer =
        new MutationObserver(schedule);

      observer.observe(root, {
        childList: true,
        subtree: true
      });
    }

    window.addEventListener(
      'resize',
      schedule,
      { passive: true }
    );

    [100, 300, 700, 1400].forEach(delay => {
      window.setTimeout(
        applyTipsHeight,
        delay
      );
    });

    return result;
  }

  window[PATCH_KEY] = {
    installed: true,
    version: '4.0.0',
    apply: applyTipsHeight,
    boot
  };

  if (
    document.readyState === 'loading'
  ) {
    document.addEventListener(
      'DOMContentLoaded',
      boot,
      { once: true }
    );
  } else {
    window.setTimeout(boot, 0);
  }
})();
</script>

<!-- PMD_DASHBOARD2_DONUT_CARD_FONTS_V1 -->
<style id="pmd-dashboard2-donut-card-fonts-v1">
  /*
   * Match the readability level of the other lower Dashboard2 cards.
   *
   * Scope:
   * - Umsatz nach Kategorie
   * - Zahlungsmethoden
   * - Bestellkanäle
   *
   * No chart sizing, donut sizing, period controls, data or JavaScript
   * behavior is changed.
   */

  #pmd-dashboard2-analytics-v1
  :is(
    [data-pmd-analytics-widget="categorySales"],
    [data-pmd-analytics-widget="paymentMethods"],
    [data-pmd-analytics-widget="channelSplit"]
  )
  .pmd-dashboard2-widget-body {
    font-size: 14px !important;
    line-height: 1.38 !important;
  }

  /*
   * Legend/list rows.
   */
  #pmd-dashboard2-analytics-v1
  :is(
    [data-pmd-analytics-widget="categorySales"],
    [data-pmd-analytics-widget="paymentMethods"],
    [data-pmd-analytics-widget="channelSplit"]
  )
  li {
    font-size: 14px !important;
    line-height: 1.35 !important;
  }

  /*
   * Labels such as:
   * Cash, Card, Main Course, Dine in, Lieferung.
   */
  #pmd-dashboard2-analytics-v1
  :is(
    [data-pmd-analytics-widget="categorySales"],
    [data-pmd-analytics-widget="paymentMethods"],
    [data-pmd-analytics-widget="channelSplit"]
  )
  li span {
    font-size: 14px !important;
    line-height: 1.35 !important;
  }

  /*
   * Right-side values, quantities, amounts and percentages.
   */
  #pmd-dashboard2-analytics-v1
  :is(
    [data-pmd-analytics-widget="categorySales"],
    [data-pmd-analytics-widget="paymentMethods"],
    [data-pmd-analytics-widget="channelSplit"]
  )
  li :is(
    b,
    strong,
    small
  ) {
    font-size: 13.5px !important;
    line-height: 1.35 !important;
  }

  /*
   * Cover legend structures that do not use LI elements.
   */
  #pmd-dashboard2-analytics-v1
  :is(
    [data-pmd-analytics-widget="categorySales"],
    [data-pmd-analytics-widget="paymentMethods"],
    [data-pmd-analytics-widget="channelSplit"]
  )
  :is(
    .pmd-dashboard2-donut-legend,
    .pmd-dashboard2-donut-list,
    .pmd-dashboard2-legend,
    .pmd-dashboard2-data-list
  ) {
    font-size: 14px !important;
    line-height: 1.35 !important;
  }

  #pmd-dashboard2-analytics-v1
  :is(
    [data-pmd-analytics-widget="categorySales"],
    [data-pmd-analytics-widget="paymentMethods"],
    [data-pmd-analytics-widget="channelSplit"]
  )
  :is(
    .pmd-dashboard2-donut-legend,
    .pmd-dashboard2-donut-list,
    .pmd-dashboard2-legend,
    .pmd-dashboard2-data-list
  )
  :is(
    span,
    label
  ) {
    font-size: 14px !important;
    line-height: 1.35 !important;
  }

  #pmd-dashboard2-analytics-v1
  :is(
    [data-pmd-analytics-widget="categorySales"],
    [data-pmd-analytics-widget="paymentMethods"],
    [data-pmd-analytics-widget="channelSplit"]
  )
  :is(
    .pmd-dashboard2-donut-legend,
    .pmd-dashboard2-donut-list,
    .pmd-dashboard2-legend,
    .pmd-dashboard2-data-list
  )
  :is(
    b,
    strong,
    small
  ) {
    font-size: 13.5px !important;
    line-height: 1.35 !important;
  }

  /*
   * Keep the small Day / Week / Month controls compact.
   * They are intentionally not enlarged to 14px.
   */
  #pmd-dashboard2-analytics-v1
  :is(
    [data-pmd-analytics-widget="categorySales"],
    [data-pmd-analytics-widget="paymentMethods"],
    [data-pmd-analytics-widget="channelSplit"]
  )
  :is(
    .pmd-dashboard2-analytics-period,
    [data-pmd-donut-period],
    [data-pmd-period-control]
  )
  button {
    font-size: 11px !important;
    line-height: 1 !important;
  }

  @media (max-width: 768px) {
    #pmd-dashboard2-analytics-v1
    :is(
      [data-pmd-analytics-widget="categorySales"],
      [data-pmd-analytics-widget="paymentMethods"],
      [data-pmd-analytics-widget="channelSplit"]
    )
    .pmd-dashboard2-widget-body {
      font-size: 13px !important;
    }

    #pmd-dashboard2-analytics-v1
    :is(
      [data-pmd-analytics-widget="categorySales"],
      [data-pmd-analytics-widget="paymentMethods"],
      [data-pmd-analytics-widget="channelSplit"]
    )
    li span {
      font-size: 13px !important;
    }

    #pmd-dashboard2-analytics-v1
    :is(
      [data-pmd-analytics-widget="categorySales"],
      [data-pmd-analytics-widget="paymentMethods"],
      [data-pmd-analytics-widget="channelSplit"]
    )
    li :is(
      b,
      strong,
      small
    ) {
      font-size: 12.5px !important;
    }
  }
</style>

<!-- PMD_DASHBOARD2_CHART_WIDTH_TRANSITION_VALUES_V11 -->
<style id="pmd-dashboard2-chart-width-transition-values-v11">

  /*
   * Make the SVG plotting surface wider inside both primary cards.
   *
   * This changes only the visual width of the rendered SVG.
   * Chart data, viewBox logic, sliders and chart calculations remain
   * untouched.
   */
  #pmd-dashboard2-analytics-v1
  :is(
    [data-pmd-analytics-widget="salesOverTime"],
    [data-pmd-analytics-widget="salesByHour"]
  )
  .pmd-dashboard2-chart-frame {
    overflow: visible !important;
  }

  #pmd-dashboard2-analytics-v1
  :is(
    [data-pmd-analytics-widget="salesOverTime"],
    [data-pmd-analytics-widget="salesByHour"]
  )
  .pmd-dashboard2-chart-frame > svg {
    display: block !important;

    width: calc(100% + 180px) !important;
    max-width: none !important;

    margin-left: -90px !important;
    margin-right: -90px !important;

    transform-origin: center center;

    transition:
      opacity 170ms ease,
      transform 210ms ease !important;

    will-change:
      opacity,
      transform;
  }

  /*
   * Smooth replacement when switching between Linie and Balken.
   * The new SVG fades in instead of appearing abruptly.
   */
  #pmd-dashboard2-analytics-v1
  [data-pmd-analytics-widget="salesOverTime"]
  .pmd-dashboard2-chart-frame > svg {
    opacity: 1;
    transform: translateY(0) scale(.999);
  }

  #pmd-dashboard2-analytics-v1
  [data-pmd-analytics-widget="salesOverTime"]
  .pmd-dashboard2-chart-frame > svg {
    opacity: 1;
  }

  #pmd-dashboard2-analytics-v1
  [data-pmd-analytics-widget="salesOverTime"]
  .pmd-dashboard2-chart-frame {
    transition:
      opacity 180ms ease,
      transform 210ms ease !important;
  }

  #pmd-dashboard2-analytics-v1
  [data-pmd-analytics-widget="salesOverTime"].pmd-dashboard2-chart-mode-transitioning
  .pmd-dashboard2-chart-frame {
    opacity: .12 !important;
    transform: translateY(3px) scale(.996) !important;
  }

  /*
   * Make values in Umsatz nach Kategorie and Zahlungsmethoden
   * clearly readable.
   */
  #pmd-dashboard2-analytics-v1
  :is(
    [data-pmd-analytics-widget="categorySales"],
    [data-pmd-analytics-widget="paymentMethods"]
  )
  :is(
    .pmd-dashboard2-donut-legend,
    .pmd-dashboard2-donut-list,
    .pmd-dashboard2-legend,
    .pmd-dashboard2-data-list
  )
  li {
    font-size: 14px !important;
    line-height: 1.38 !important;
  }

  #pmd-dashboard2-analytics-v1
  :is(
    [data-pmd-analytics-widget="categorySales"],
    [data-pmd-analytics-widget="paymentMethods"]
  )
  li > :first-child,
  #pmd-dashboard2-analytics-v1
  :is(
    [data-pmd-analytics-widget="categorySales"],
    [data-pmd-analytics-widget="paymentMethods"]
  )
  li span {
    font-size: 14px !important;
    line-height: 1.38 !important;
  }

  /*
   * Right-side totals, amounts, counts and percentages.
   */
  #pmd-dashboard2-analytics-v1
  :is(
    [data-pmd-analytics-widget="categorySales"],
    [data-pmd-analytics-widget="paymentMethods"]
  )
  li > :last-child,

  #pmd-dashboard2-analytics-v1
  :is(
    [data-pmd-analytics-widget="categorySales"],
    [data-pmd-analytics-widget="paymentMethods"]
  )
  :is(
    .pmd-dashboard2-donut-value,
    .pmd-dashboard2-legend-value,
    .pmd-dashboard2-donut-legend-value,
    [data-pmd-value],
    b,
    strong
  ) {
    font-size: 14px !important;
    line-height: 1.3 !important;
    font-weight: 700 !important;
  }

  /*
   * Some donut rows contain nested wrappers. Target the final value
   * wrapper without changing the period buttons.
   */
  #pmd-dashboard2-analytics-v1
  :is(
    [data-pmd-analytics-widget="categorySales"],
    [data-pmd-analytics-widget="paymentMethods"]
  )
  li > div:last-child {
    font-size: 14px !important;
    line-height: 1.3 !important;
    font-weight: 700 !important;
  }

  /*
   * Keep Tag / Woche / Monat controls compact.
   */
  #pmd-dashboard2-analytics-v1
  :is(
    [data-pmd-analytics-widget="categorySales"],
    [data-pmd-analytics-widget="paymentMethods"]
  )
  button {
    font-size: inherit;
  }

  @media (max-width: 768px) {
    #pmd-dashboard2-analytics-v1
    :is(
      [data-pmd-analytics-widget="salesOverTime"],
      [data-pmd-analytics-widget="salesByHour"]
    )
    .pmd-dashboard2-chart-frame > svg {
      width: calc(100% + 32px) !important;

      margin-left: -16px !important;
      margin-right: -16px !important;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    #pmd-dashboard2-analytics-v1
    .pmd-dashboard2-chart-frame > svg {
      transition: none !important;
    }
  }


  /*
   * PMD Dashboard2 exact donut numeric font authority V1.1
   *
   * Some values are nested inside extra DIV/SPAN wrappers.
   * Force all textual descendants to the requested readable size.
   */
  #pmd-dashboard2-analytics-v1
  :is(
    [data-pmd-analytics-widget="categorySales"],
    [data-pmd-analytics-widget="paymentMethods"]
  )
  :is(
    .pmd-dashboard2-widget-body,
    .pmd-dashboard2-donut-legend,
    .pmd-dashboard2-donut-list,
    .pmd-dashboard2-legend,
    .pmd-dashboard2-data-list
  )
  :is(
    li,
    li span,
    li div,
    li b,
    li strong,
    li small,
    [data-pmd-value]
  ) {
    font-size: 14px !important;
    line-height: 1.35 !important;
  }

  #pmd-dashboard2-analytics-v1
  :is(
    [data-pmd-analytics-widget="categorySales"],
    [data-pmd-analytics-widget="paymentMethods"]
  )
  :is(
    .pmd-dashboard2-widget-body,
    .pmd-dashboard2-donut-legend,
    .pmd-dashboard2-donut-list,
    .pmd-dashboard2-legend,
    .pmd-dashboard2-data-list
  )
  :is(
    li b,
    li strong,
    li > :last-child,
    [data-pmd-value]
  ) {
    font-weight: 700 !important;
  }

  @media (max-width: 768px) {
    #pmd-dashboard2-analytics-v1
    :is(
      [data-pmd-analytics-widget="salesOverTime"],
      [data-pmd-analytics-widget="salesByHour"]
    )
    .pmd-dashboard2-chart-frame > svg {
      width: calc(100% + 70px) !important;
      margin-left: -35px !important;
      margin-right: -35px !important;
    }
  }

</style>

<script>
(function () {
  'use strict';

  const PATCH_KEY =
    'PMDDashboard2ChartWidthTransitionValuesV11';

  if (window[PATCH_KEY]?.installed) {
    return;
  }

  const timers = new WeakMap();

  function beginTransition(button) {
    const card = button?.closest(
      '[data-pmd-analytics-widget="salesOverTime"]'
    );

    if (!card) {
      return;
    }

    const existingTimer =
      timers.get(card);

    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    card.classList.add(
      'pmd-dashboard2-chart-mode-transitioning'
    );

    /*
     * Existing Dashboard2 logic replaces the chart shortly after the
     * mode click. Keeping the class briefly makes the old SVG fade out
     * and the newly rendered SVG fade back in.
     */
    const timer = setTimeout(() => {
      card.classList.remove(
        'pmd-dashboard2-chart-mode-transitioning'
      );

      timers.delete(card);
    }, 210);

    timers.set(card, timer);
  }

  document.addEventListener(
    'click',
    event => {
      const button = event.target.closest(
        '[data-pmd-chart-mode]'
      );

      if (!button) {
        return;
      }

      beginTransition(button);
    },
    true
  );

  window[PATCH_KEY] = {
    installed: true,
    version: '1.1.0'
  };

  console.info(
    '[PMD Dashboard2 Chart Width + Smooth Switch + Values V1.1] Ready'
  );
})();
</script>


<!-- PMD_DASHBOARD2_STABLE_CROSSFADE_V15 -->
<style id="pmd-dashboard2-stable-crossfade-v15-style">
  .pmd-dashboard2-chart-crossfade-host-v15 {
    position: relative !important;
  }

  .pmd-dashboard2-chart-crossfade-snapshot-v15 {
    position: absolute !important;
    z-index: 20 !important;

    pointer-events: none !important;
    user-select: none !important;

    margin: 0 !important;
    max-width: none !important;

    opacity: 1;

    will-change:
      opacity,
      filter;

    transform-origin:
      center center;
  }
</style>

<script>
(function () {
  'use strict';

  const PATCH_KEY =
    'PMDDashboard2StableCrossfadeV15';

  if (window[PATCH_KEY]?.installed) {
    return;
  }

  const CARD_SELECTOR =
    '[data-pmd-analytics-widget="salesOverTime"]';

  const FRAME_SELECTOR =
    '.pmd-dashboard2-chart-frame';

  const SVG_SELECTOR =
    '.pmd-dashboard2-chart-frame > svg';

  const MODE_SELECTOR =
    'button[data-pmd-chart-mode]';

  const MIN_HIDDEN_TIME = 170;
  const MAX_HIDDEN_TIME = 720;
  const REQUIRED_STABLE_FRAMES = 5;
  const STABLE_TOLERANCE = 1.5;
  const FADE_DURATION = 420;

  const activeByCard =
    new WeakMap();

  const lastActivation =
    new WeakMap();

  function resolve(target) {
    const button =
      target?.closest?.(
        MODE_SELECTOR
      );

    if (!button) {
      return null;
    }

    const card =
      button.closest(
        CARD_SELECTOR
      );

    if (!card) {
      return null;
    }

    const frame =
      card.querySelector(
        FRAME_SELECTOR
      );

    const mode =
      button.getAttribute(
        'data-pmd-chart-mode'
      );

    if (
      !frame ||
      (
        mode !== 'line' &&
        mode !== 'bar'
      )
    ) {
      return null;
    }

    return {
      button,
      card,
      frame,
      mode
    };
  }

  function cleanup(card) {
    const active =
      activeByCard.get(card);

    if (!active) {
      return;
    }

    active.cancelled = true;

    if (active.raf) {
      cancelAnimationFrame(
        active.raf
      );
    }

    if (active.timer) {
      clearTimeout(
        active.timer
      );
    }

    try {
      active.oldAnimation?.cancel();
    } catch (error) {
    }

    try {
      active.newAnimation?.cancel();
    } catch (error) {
    }

    active.snapshot?.remove();

    if (active.frame) {
      active.frame.style.removeProperty(
        'opacity'
      );

      active.frame.style.removeProperty(
        'filter'
      );
    }

    if (active.host) {
      active.host.classList.remove(
        'pmd-dashboard2-chart-crossfade-host-v15'
      );
    }

    activeByCard.delete(card);
  }

  function createSnapshot(frame) {
    const host =
      frame.parentElement;

    if (!host) {
      return null;
    }

    const frameRect =
      frame.getBoundingClientRect();

    const hostRect =
      host.getBoundingClientRect();

    const snapshot =
      frame.cloneNode(true);

    snapshot.removeAttribute('id');

    snapshot
      .querySelectorAll('[id]')
      .forEach(element => {
        element.removeAttribute('id');
      });

    snapshot.classList.add(
      'pmd-dashboard2-chart-crossfade-snapshot-v15'
    );

    snapshot.setAttribute(
      'aria-hidden',
      'true'
    );

    snapshot.style.setProperty(
      'left',
      `${frameRect.left - hostRect.left}px`,
      'important'
    );

    snapshot.style.setProperty(
      'top',
      `${frameRect.top - hostRect.top}px`,
      'important'
    );

    snapshot.style.setProperty(
      'width',
      `${frameRect.width}px`,
      'important'
    );

    snapshot.style.setProperty(
      'height',
      `${frameRect.height}px`,
      'important'
    );

    host.classList.add(
      'pmd-dashboard2-chart-crossfade-host-v15'
    );

    host.appendChild(snapshot);

    return {
      host,
      snapshot
    };
  }

  function round(value) {
    return Math.round(
      Number(value || 0) * 10
    ) / 10;
  }

  function getDrawableBounds(svg) {
    if (!svg) {
      return {
        left: 0,
        right: 0,
        width: 0
      };
    }

    const elements = [
      ...svg.querySelectorAll(
        'polyline,path,rect,circle,line'
      )
    ];

    const bounds = elements
      .map(element =>
        element.getBoundingClientRect()
      )
      .filter(rect =>
        rect.width > 1 ||
        rect.height > 1
      );

    if (!bounds.length) {
      return {
        left: 0,
        right: 0,
        width: 0
      };
    }

    const left = Math.min(
      ...bounds.map(rect => rect.left)
    );

    const right = Math.max(
      ...bounds.map(rect => rect.right)
    );

    return {
      left: round(left),
      right: round(right),
      width: round(right - left)
    };
  }

  function geometrySignature(frame) {
    const svg =
      frame.querySelector(
        ':scope > svg'
      );

    const frameRect =
      frame.getBoundingClientRect();

    const svgRect =
      svg?.getBoundingClientRect();

    const drawable =
      getDrawableBounds(svg);

    return {
      mode:
        svg?.classList.contains(
          'is-line-chart'
        )
          ? 'line'
          : 'bar',

      frameWidth:
        round(frameRect.width),

      frameHeight:
        round(frameRect.height),

      svgWidth:
        round(svgRect?.width),

      svgHeight:
        round(svgRect?.height),

      svgTop:
        round(svgRect?.top),

      drawableLeft:
        drawable.left,

      drawableRight:
        drawable.right,

      drawableWidth:
        drawable.width,

      transform:
        svg
          ? getComputedStyle(svg)
              .transform
          : 'none'
    };
  }

  function signaturesMatch(
    previous,
    current
  ) {
    if (!previous || !current) {
      return false;
    }

    if (
      previous.mode !==
      current.mode
    ) {
      return false;
    }

    if (
      previous.transform !==
      current.transform
    ) {
      return false;
    }

    const numericKeys = [
      'frameWidth',
      'frameHeight',
      'svgWidth',
      'svgHeight',
      'svgTop',
      'drawableLeft',
      'drawableRight',
      'drawableWidth'
    ];

    return numericKeys.every(key =>
      Math.abs(
        previous[key] -
        current[key]
      ) <= STABLE_TOLERANCE
    );
  }

  function reveal(
    card,
    active,
    reason,
    signature
  ) {
    if (
      active.cancelled ||
      activeByCard.get(card) !== active
    ) {
      return;
    }

    const {
      frame,
      snapshot
    } = active;

    frame.style.removeProperty(
      'opacity'
    );

    active.newAnimation =
      frame.animate(
        [
          {
            opacity: 0,
            filter: 'blur(.8px)'
          },
          {
            opacity: 0.38,
            filter: 'blur(.3px)',
            offset: 0.38
          },
          {
            opacity: 1,
            filter: 'blur(0px)'
          }
        ],
        {
          duration:
            FADE_DURATION,

          easing:
            'cubic-bezier(.22,.61,.36,1)',

          fill:
            'both'
        }
      );

    active.oldAnimation =
      snapshot.animate(
        [
          {
            opacity: 1,
            filter: 'blur(0px)'
          },
          {
            opacity: 0.68,
            filter: 'blur(.25px)',
            offset: 0.28
          },
          {
            opacity: 0,
            filter: 'blur(1px)'
          }
        ],
        {
          duration:
            FADE_DURATION,

          easing:
            'cubic-bezier(.4,0,.2,1)',

          fill:
            'forwards'
        }
      );

    active.timer =
      setTimeout(() => {
        cleanup(card);
      }, FADE_DURATION + 60);

    console.info(
      '[PMD Dashboard2 Stable Crossfade V1.5]',
      {
        applied: true,
        requestedMode:
          active.mode,

        reason,

        hiddenFor:
          Math.round(
            performance.now() -
            active.startedAt
          ),

        stableFrames:
          active.stableFrames,

        finalGeometry:
          signature
      }
    );
  }

  function waitUntilStable(
    card,
    active
  ) {
    const sample = () => {
      if (
        active.cancelled ||
        activeByCard.get(card) !== active
      ) {
        return;
      }

      const elapsed =
        performance.now() -
        active.startedAt;

      const current =
        geometrySignature(
          active.frame
        );

      if (
        signaturesMatch(
          active.previousSignature,
          current
        )
      ) {
        active.stableFrames += 1;
      } else {
        active.stableFrames = 0;
      }

      active.previousSignature =
        current;

      const stable =
        elapsed >= MIN_HIDDEN_TIME &&
        active.stableFrames >=
          REQUIRED_STABLE_FRAMES;

      const timedOut =
        elapsed >= MAX_HIDDEN_TIME;

      if (stable || timedOut) {
        reveal(
          card,
          active,
          stable
            ? 'geometry-stable'
            : 'maximum-wait',

          current
        );

        return;
      }

      active.raf =
        requestAnimationFrame(
          sample
        );
    };

    active.raf =
      requestAnimationFrame(
        sample
      );
  }

  function crossfade(
    card,
    frame,
    mode,
    trigger
  ) {
    if (
      !card ||
      !frame ||
      typeof frame.animate !== 'function'
    ) {
      return false;
    }

    const now =
      performance.now();

    const previousTime =
      lastActivation.get(card) || 0;

    if (
      now - previousTime < 45
    ) {
      return false;
    }

    lastActivation.set(
      card,
      now
    );

    cleanup(card);

    const snapshotResult =
      createSnapshot(frame);

    if (!snapshotResult) {
      return false;
    }

    const {
      host,
      snapshot
    } = snapshotResult;

    /*
     * Keep the newly rendered chart fully hidden until its SVG and
     * drawable content stop changing size and position.
     */
    frame.style.setProperty(
      'opacity',
      '0',
      'important'
    );

    const active = {
      card,
      host,
      snapshot,
      frame,
      mode,
      trigger,

      startedAt:
        performance.now(),

      stableFrames:
        0,

      previousSignature:
        null,

      raf:
        null,

      timer:
        null,

      oldAnimation:
        null,

      newAnimation:
        null,

      cancelled:
        false
    };

    activeByCard.set(
      card,
      active
    );

    waitUntilStable(
      card,
      active
    );

    console.info(
      '[PMD Dashboard2 Stable Crossfade V1.5] Waiting',
      {
        requestedMode:
          mode,

        trigger,

        minimumWait:
          MIN_HIDDEN_TIME,

        maximumWait:
          MAX_HIDDEN_TIME,

        requiredStableFrames:
          REQUIRED_STABLE_FRAMES
      }
    );

    return true;
  }

  document.addEventListener(
    'mousedown',
    event => {
      const result =
        resolve(event.target);

      if (!result) {
        return;
      }

      crossfade(
        result.card,
        result.frame,
        result.mode,
        'native-mousedown'
      );
    },
    true
  );

  document.addEventListener(
    'click',
    event => {
      if (event.detail !== 0) {
        return;
      }

      const result =
        resolve(event.target);

      if (!result) {
        return;
      }

      crossfade(
        result.card,
        result.frame,
        result.mode,
        'keyboard-click'
      );
    },
    true
  );

  window[PATCH_KEY] = {
    installed: true,
    version: '1.5.0',

    test() {
      const card =
        document.querySelector(
          CARD_SELECTOR
        );

      const frame =
        card?.querySelector(
          FRAME_SELECTOR
        );

      return crossfade(
        card,
        frame,
        'test',
        'manual-test'
      );
    },

    cleanup() {
      const card =
        document.querySelector(
          CARD_SELECTOR
        );

      if (card) {
        cleanup(card);
      }

      return true;
    },

    audit() {
      const card =
        document.querySelector(
          CARD_SELECTOR
        );

      const frame =
        card?.querySelector(
          FRAME_SELECTOR
        );

      const active =
        card
          ? activeByCard.get(card)
          : null;

      const result = {
        installed: true,

        cardFound:
          Boolean(card),

        frameFound:
          Boolean(frame),

        currentGeometry:
          frame
            ? geometrySignature(frame)
            : null,

        active:
          Boolean(active),

        stableFrames:
          active?.stableFrames || 0,

        hiddenFor:
          active
            ? Math.round(
                performance.now() -
                active.startedAt
              )
            : 0
      };

      console.info(
        '[PMD Dashboard2 Stable Crossfade V1.5 Audit]',
        result
      );

      return result;
    }
  };

  console.info(
    '[PMD Dashboard2 Stable Crossfade V1.5] Ready',
    {
      event:
        'mousedown',

      strategy:
        'wait-for-stable-chart-geometry',

      minimumHidden:
        MIN_HIDDEN_TIME,

      maximumHidden:
        MAX_HIDDEN_TIME,

      stableFrames:
        REQUIRED_STABLE_FRAMES,

      fadeDuration:
        FADE_DURATION,

      geometryChanged:
        false
    }
  );
})();
</script>

<!-- PMD_DASHBOARD2_REMOVE_PLUS_BUTTON_V1 -->
<style id="pmd-dashboard2-remove-plus-button-v1-style">
  /*
   * Hide immediately before the runtime remover deletes the element.
   * Restricted to an exact Font Awesome plus icon inside an icon-only
   * interactive control.
   */
  body[data-pmd-dashboard2-remove-plus-v1="ready"]
  .pmd-dashboard2-exact-plus-button-v1 {
    display: none !important;
  }
</style>

<script>
(function () {
  'use strict';

  const PATCH_KEY =
    'PMDDashboard2RemovePlusButtonV1';

  if (window[PATCH_KEY]?.installed) {
    return;
  }

  const ICON_SELECTOR =
    'i.fa.fa-plus[aria-hidden="true"]';

  let observer = null;
  let removedCount = 0;

  function isDashboard2() {
    return (
      window.location.pathname ===
        '/admin/dashboard2' ||
      window.location.pathname ===
        '/admin/dashboard2/'
    );
  }

  function exactIcon(icon) {
    if (!icon) {
      return false;
    }

    const classes = [
      ...icon.classList
    ].sort();

    return (
      icon.tagName === 'I' &&
      classes.length === 2 &&
      classes.includes('fa') &&
      classes.includes('fa-plus') &&
      icon.getAttribute(
        'aria-hidden'
      ) === 'true'
    );
  }

  function getInteractive(icon) {
    return icon.closest(
      'button, a, [role="button"]'
    );
  }

  function isIconOnlyControl(
    control,
    icon
  ) {
    if (!control || !icon) {
      return false;
    }

    const clone =
      control.cloneNode(true);

    clone
      .querySelectorAll(
        ICON_SELECTOR
      )
      .forEach(element => {
        element.remove();
      });

    const remainingText =
      String(
        clone.textContent || ''
      )
        .replace(/\s+/g, '')
        .trim();

    /*
     * Permit accessibility labels, but do not remove a control that
     * contains any visible textual content besides the plus icon.
     */
    return remainingText === '';
  }

  function findCandidates() {
    if (!isDashboard2()) {
      return [];
    }

    const controls =
      new Set();

    document
      .querySelectorAll(
        ICON_SELECTOR
      )
      .forEach(icon => {
        if (!exactIcon(icon)) {
          return;
        }

        const control =
          getInteractive(icon);

        if (
          !control ||
          !isIconOnlyControl(
            control,
            icon
          )
        ) {
          return;
        }

        controls.add(control);
      });

    return [
      ...controls
    ];
  }

  function describe(control) {
    if (!control) {
      return null;
    }

    return {
      tag:
        control.tagName,

      id:
        control.id || null,

      className:
        typeof control.className ===
        'string'
          ? control.className
          : control.getAttribute(
              'class'
            ),

      ariaLabel:
        control.getAttribute(
          'aria-label'
        ),

      title:
        control.getAttribute(
          'title'
        ),

      html:
        control.outerHTML.slice(
          0,
          500
        )
    };
  }

  function apply(reason) {
    const candidates =
      findCandidates();

    if (candidates.length === 0) {
      return {
        applied: false,
        reason,
        candidateCount: 0,
        removedCount
      };
    }

    /*
     * Safety rule: remove only when exactly one exact icon-only plus
     * control exists on Dashboard2.
     */
    if (candidates.length !== 1) {
      const result = {
        applied: false,
        reason:
          'ambiguous-multiple-candidates',

        trigger:
          reason,

        candidateCount:
          candidates.length,

        candidates:
          candidates.map(describe),

        removedCount
      };

      console.warn(
        '[PMD Dashboard2 Remove Plus Button V1] Not removed',
        result
      );

      return result;
    }

    const control =
      candidates[0];

    control.classList.add(
      'pmd-dashboard2-exact-plus-button-v1'
    );

    const description =
      describe(control);

    control.remove();

    removedCount += 1;

    const result = {
      applied: true,
      trigger: reason,
      candidateCount: 1,
      removedCount,
      removed:
        description
    };

    console.info(
      '[PMD Dashboard2 Remove Plus Button V1] Removed',
      result
    );

    return result;
  }

  function startObserver() {
    if (
      observer ||
      !document.body
    ) {
      return;
    }

    observer =
      new MutationObserver(records => {
        const plusAdded =
          records.some(record =>
            [...record.addedNodes]
              .some(node => {
                if (
                  node.nodeType !== 1
                ) {
                  return false;
                }

                return (
                  node.matches?.(
                    ICON_SELECTOR
                  ) ||
                  Boolean(
                    node.querySelector?.(
                      ICON_SELECTOR
                    )
                  )
                );
              })
          );

        if (plusAdded) {
          apply(
            'mutation-added'
          );
        }
      });

    observer.observe(
      document.body,
      {
        childList: true,
        subtree: true
      }
    );
  }

  function boot() {
    if (!isDashboard2()) {
      return;
    }

    document.body?.setAttribute(
      'data-pmd-dashboard2-remove-plus-v1',
      'ready'
    );

    const initial =
      apply('initial');

    startObserver();

    [
      100,
      300,
      700,
      1400,
      2500
    ].forEach(delay => {
      setTimeout(
        () => apply(
          `delayed-${delay}`
        ),
        delay
      );
    });

    console.info(
      '[PMD Dashboard2 Remove Plus Button V1] Ready',
      initial
    );
  }

  window[PATCH_KEY] = {
    installed: true,
    version: '1.0.0',

    apply() {
      return apply('manual');
    },

    audit() {
      const candidates =
        findCandidates();

      const result = {
        route:
          window.location.pathname,

        candidateCount:
          candidates.length,

        removedCount,

        candidates:
          candidates.map(describe)
      };

      console.info(
        '[PMD Dashboard2 Remove Plus Button V1 Audit]',
        result
      );

      return result;
    },

    stop() {
      observer?.disconnect();
      observer = null;

      return true;
    }
  };

  if (
    document.readyState ===
    'loading'
  ) {
    document.addEventListener(
      'DOMContentLoaded',
      boot,
      {
        once: true
      }
    );
  } else {
    setTimeout(
      boot,
      0
    );
  }
})();
</script>


<!-- PMD_DASHBOARD2_AUTO_GAP_TOOLBARS_V2 -->
<style id="pmd-dashboard2-auto-gap-toolbars-v2-style">
  [data-pmd-analytics-widget="salesOverTime"],
  [data-pmd-analytics-widget="salesByHour"] {
    position: relative !important;
  }

  /*
   * Hide the old ‹ Alle › navigation pills.
   */
  [data-pmd-analytics-widget="salesOverTime"]
  .pmd-dashboard2-chart-nav-v137,

  [data-pmd-analytics-widget="salesByHour"]
  .pmd-dashboard2-chart-nav-v137 {
    display: none !important;
    visibility: hidden !important;
    opacity: 0 !important;
    pointer-events: none !important;
  }

  /*
   * The original inputs remain active as data sources.
   * They are moved off-screen so older PMD positioning
   * authorities cannot create visible duplicate controls.
   */
  .pmd-dashboard2-auto-gap-source-v2 {
    position: fixed !important;
    top: -10000px !important;
    right: auto !important;
    bottom: auto !important;
    left: -10000px !important;

    width: 1px !important;
    min-width: 1px !important;
    max-width: 1px !important;
    height: 1px !important;

    overflow: hidden !important;
    visibility: hidden !important;
    opacity: 0 !important;

    pointer-events: none !important;
  }

  /*
   * Reliable visible toolbar.
   */
  .pmd-dashboard2-auto-gap-toolbar-v2 {
    position: absolute !important;

    right: auto !important;
    bottom: auto !important;
    left: 50% !important;

    transform: translateX(-50%) !important;

    display: block !important;

    width: 240px !important;
    min-width: 240px !important;
    max-width: 240px !important;
    height: 28px !important;

    overflow: visible !important;
    visibility: visible !important;
    opacity: 1 !important;

    z-index: 160 !important;
    pointer-events: auto !important;
  }

  .pmd-dashboard2-auto-gap-track-v2 {
    position: absolute;

    top: 50%;
    right: 0;
    left: 0;

    height: 4px;

    transform: translateY(-50%);

    border-radius: 999px;
    background: #00a77b;

    box-shadow:
      0 1px 4px rgba(0, 90, 67, 0.22);

    pointer-events: none;
    z-index: 1;
  }

  .pmd-dashboard2-auto-gap-knob-v2 {
    position: absolute;

    top: 50%;

    width: 17px;
    height: 17px;

    transform: translate(-50%, -50%);

    border: 3px solid #ffffff;
    border-radius: 50%;

    background: #00a77b;

    box-shadow:
      0 0 0 1px rgba(0, 110, 82, 0.35),
      0 2px 7px rgba(0, 0, 0, 0.24);

    pointer-events: none;
    z-index: 2;
  }

  .pmd-dashboard2-auto-gap-input-v2 {
    position: absolute !important;
    inset: 0 !important;

    display: block !important;

    width: 100% !important;
    height: 28px !important;

    margin: 0 !important;
    padding: 0 !important;

    visibility: visible !important;
    opacity: 0.001 !important;

    cursor: pointer !important;
    pointer-events: auto !important;

    z-index: 4 !important;
  }

  @media (max-width: 700px) {
    .pmd-dashboard2-auto-gap-toolbar-v2 {
      width: 190px !important;
      min-width: 190px !important;
      max-width: 190px !important;
    }
  }
</style>

<script>
(function () {
  'use strict';

  const KEY =
    'PMDDashboard2AutoGapToolbarsV2';

  if (window[KEY]?.installed) {
    return;
  }

  const DEFINITIONS = [
    {
      key: 'salesOverTime',
      title: 'Umsatzverlauf'
    },
    {
      key: 'salesByHour',
      title: 'Umsatz nach Stunde'
    }
  ];

  const records =
    new Map();

  const timers = [];

  const boundModeButtons =
    new WeakSet();

  const modeBindings = [];

  let resizeTimer = null;

  function setImportant(
    element,
    property,
    value
  ) {
    element.style.setProperty(
      property,
      value,
      'important'
    );
  }

  function findChartSurface(card) {
    const selectors = [
      'svg',
      'canvas',
      '[data-pmd-chart-frame]',
      '[data-pmd-chart-svg]',
      '[class*="chart-frame"]',
      '[class*="chart-canvas"]'
    ];

    const candidates = [
      ...card.querySelectorAll(
        selectors.join(',')
      )
    ]
      .filter(element => {
        if (
          element.closest(
            '.pmd-dashboard2-auto-gap-toolbar-v2'
          )
        ) {
          return false;
        }

        if (
          element.closest(
            '.pmd-dashboard2-zoom-scrubber-v1375'
          )
        ) {
          return false;
        }

        const rect =
          element.getBoundingClientRect();

        const style =
          getComputedStyle(element);

        return (
          rect.width > 250 &&
          rect.height > 100 &&
          style.display !== 'none' &&
          style.visibility !== 'hidden'
        );
      })
      .map(element => {
        const rect =
          element.getBoundingClientRect();

        return {
          element,
          area:
            rect.width *
            rect.height
        };
      })
      .sort(
        (first, second) =>
          second.area -
          first.area
      );

    return candidates[0]?.element || null;
  }

  function sourceCandidates() {
    return [
      ...document.querySelectorAll(
        '.pmd-dashboard2-zoom-scrubber-v1375'
      )
    ];
  }

  function findSourceScrubber(
    card,
    index,
    usedSources
  ) {
    const direct =
      card.querySelector(
        '.pmd-dashboard2-zoom-scrubber-v1375'
      );

    if (
      direct &&
      !usedSources.has(direct)
    ) {
      return direct;
    }

    const candidates =
      sourceCandidates();

    const unused =
      candidates.find(
        candidate =>
          !usedSources.has(candidate)
      );

    return (
      unused ||
      candidates[index] ||
      null
    );
  }

  function copyRangeState(
    source,
    target
  ) {
    const attributes = [
      'min',
      'max',
      'step'
    ];

    attributes.forEach(attribute => {
      const value =
        source.getAttribute(
          attribute
        );

      if (value === null) {
        target.removeAttribute(
          attribute
        );
      } else {
        target.setAttribute(
          attribute,
          value
        );
      }
    });

    target.value =
      source.value;
  }

  function syncKnob(record) {
    copyRangeState(
      record.sourceRange,
      record.portalRange
    );

    const minimum =
      Number(
        record.portalRange.min || 0
      );

    const maximum =
      Number(
        record.portalRange.max || 100
      );

    const current =
      Number(
        record.portalRange.value ||
        minimum
      );

    const span =
      maximum - minimum;

    const percentage =
      span > 0
        ? (
            (current - minimum) /
            span
          ) * 100
        : 100;

    record.knob.style.left =
      `${Math.max(
        0,
        Math.min(
          100,
          percentage
        )
      )}%`;
  }

  function hideSource(record) {
    record.sourceScrubber
      .classList.add(
        'pmd-dashboard2-auto-gap-source-v2'
      );

    setImportant(
      record.sourceScrubber,
      'position',
      'fixed'
    );

    setImportant(
      record.sourceScrubber,
      'top',
      '-10000px'
    );

    setImportant(
      record.sourceScrubber,
      'left',
      '-10000px'
    );

    setImportant(
      record.sourceScrubber,
      'width',
      '1px'
    );

    setImportant(
      record.sourceScrubber,
      'height',
      '1px'
    );

    setImportant(
      record.sourceScrubber,
      'visibility',
      'hidden'
    );

    setImportant(
      record.sourceScrubber,
      'opacity',
      '0'
    );

    setImportant(
      record.sourceScrubber,
      'pointer-events',
      'none'
    );
  }

  function createRecord(
    definition,
    card,
    sourceScrubber
  ) {
    const sourceRange =
      sourceScrubber.querySelector(
        'input[type="range"]'
      );

    if (!sourceRange) {
      return null;
    }

    const portal =
      document.createElement('div');

    portal.className =
      'pmd-dashboard2-auto-gap-toolbar-v2';

    portal.dataset.pmdAutoGapFor =
      definition.key;

    const track =
      document.createElement('div');

    track.className =
      'pmd-dashboard2-auto-gap-track-v2';

    const knob =
      document.createElement('div');

    knob.className =
      'pmd-dashboard2-auto-gap-knob-v2';

    const portalRange =
      document.createElement('input');

    portalRange.type =
      'range';

    portalRange.className =
      'pmd-dashboard2-auto-gap-input-v2';

    portalRange.setAttribute(
      'aria-label',
      `${definition.title} Zeitraum`
    );

    portal.append(
      track,
      knob,
      portalRange
    );

    card.appendChild(portal);

    const record = {
      key:
        definition.key,

      title:
        definition.title,

      card,
      sourceScrubber,
      sourceRange,
      portal,
      portalRange,
      track,
      knob,

      lastMeasurement:
        null
    };

    record.onPortalInput =
      function () {
        sourceRange.value =
          portalRange.value;

        sourceRange.dispatchEvent(
          new Event(
            'input',
            {
              bubbles: true
            }
          )
        );

        syncKnob(record);
      };

    record.onPortalChange =
      function () {
        sourceRange.value =
          portalRange.value;

        sourceRange.dispatchEvent(
          new Event(
            'change',
            {
              bubbles: true
            }
          )
        );

        syncKnob(record);
      };

    record.onSourceInput =
      function () {
        syncKnob(record);
      };

    portalRange.addEventListener(
      'input',
      record.onPortalInput
    );

    portalRange.addEventListener(
      'change',
      record.onPortalChange
    );

    sourceRange.addEventListener(
      'input',
      record.onSourceInput
    );

    sourceRange.addEventListener(
      'change',
      record.onSourceInput
    );

    hideSource(record);
    syncKnob(record);

    return record;
  }

  function destroyRecord(record) {
    record.portalRange
      .removeEventListener(
        'input',
        record.onPortalInput
      );

    record.portalRange
      .removeEventListener(
        'change',
        record.onPortalChange
      );

    record.sourceRange
      .removeEventListener(
        'input',
        record.onSourceInput
      );

    record.sourceRange
      .removeEventListener(
        'change',
        record.onSourceInput
      );

    record.portal.remove();

    record.sourceScrubber
      .classList.remove(
        'pmd-dashboard2-auto-gap-source-v2'
      );
  }

  function ensureRecords() {
    const usedSources =
      new Set();

    records.forEach(record => {
      if (
        record.card.isConnected &&
        record.sourceScrubber.isConnected &&
        record.sourceRange.isConnected
      ) {
        usedSources.add(
          record.sourceScrubber
        );
      }
    });

    DEFINITIONS.forEach(
      (definition, index) => {
        const card =
          document.querySelector(
            `[data-pmd-analytics-widget="${definition.key}"]`
          );

        const existing =
          records.get(
            definition.key
          );

        if (
          existing &&
          card === existing.card &&
          existing.portal.isConnected &&
          existing.sourceScrubber.isConnected &&
          existing.sourceRange.isConnected
        ) {
          usedSources.add(
            existing.sourceScrubber
          );

          return;
        }

        if (existing) {
          destroyRecord(existing);

          records.delete(
            definition.key
          );
        }

        if (!card) {
          return;
        }

        const sourceScrubber =
          findSourceScrubber(
            card,
            index,
            usedSources
          );

        if (!sourceScrubber) {
          return;
        }

        const record =
          createRecord(
            definition,
            card,
            sourceScrubber
          );

        if (!record) {
          return;
        }

        records.set(
          definition.key,
          record
        );

        usedSources.add(
          sourceScrubber
        );
      }
    );
  }

  function measure(record) {
    const chartSurface =
      findChartSurface(
        record.card
      );

    const cardRect =
      record.card
        .getBoundingClientRect();

    const toolbarHeight = 28;

    const safeCardBottom =
      cardRect.bottom - 12;

    let chartBottom;

    if (chartSurface) {
      const chartRect =
        chartSurface
          .getBoundingClientRect();

      chartBottom =
        Math.min(
          chartRect.bottom,
          safeCardBottom -
            toolbarHeight -
            8
        );
    } else {
      chartBottom =
        cardRect.top +
        cardRect.height * 0.78;
    }

    const availableGap =
      safeCardBottom -
      chartBottom;

    const toolbarTopViewport =
      chartBottom +
      Math.max(
        6,
        (
          availableGap -
          toolbarHeight
        ) / 2
      );

    const toolbarTopInsideCard =
      toolbarTopViewport -
      cardRect.top;

    return {
      chartSurface,
      cardRect,
      chartBottom,
      safeCardBottom,
      availableGap,
      toolbarTopInsideCard
    };
  }

  function layoutRecord(record) {
    setImportant(
      record.card,
      'position',
      'relative'
    );

    hideSource(record);

    syncKnob(record);

    const measurement =
      measure(record);

    record.lastMeasurement =
      measurement;

    setImportant(
      record.portal,
      'top',
      `${Math.round(
        measurement
          .toolbarTopInsideCard
      )}px`
    );

    return measurement;
  }

  function bindModeButtons() {
    records.forEach(record => {
      const buttons = [
        ...record.card
          .querySelectorAll(
            '[data-pmd-chart-mode]'
          )
      ];

      buttons.forEach(button => {
        if (
          boundModeButtons.has(
            button
          )
        ) {
          return;
        }

        const listener =
          function () {
            timers.push(
              setTimeout(
                () =>
                  layoutAll(
                    'mode-switch-350'
                  ),
                350
              )
            );

            timers.push(
              setTimeout(
                () =>
                  layoutAll(
                    'mode-switch-750'
                  ),
                750
              )
            );
          };

        button.addEventListener(
          'mousedown',
          listener
        );

        boundModeButtons.add(
          button
        );

        modeBindings.push({
          button,
          listener
        });
      });
    });
  }

  function layoutAll(
    reason = 'manual'
  ) {
    ensureRecords();

    records.forEach(
      record =>
        layoutRecord(record)
    );

    bindModeButtons();

    return audit(reason);
  }

  function inspect(element) {
    if (!element) {
      return null;
    }

    const rect =
      element.getBoundingClientRect();

    const style =
      getComputedStyle(element);

    return {
      display:
        style.display,

      visibility:
        style.visibility,

      opacity:
        style.opacity,

      position:
        style.position,

      top:
        Math.round(rect.top),

      bottom:
        Math.round(rect.bottom),

      left:
        Math.round(rect.left),

      right:
        Math.round(rect.right),

      width:
        Math.round(rect.width),

      height:
        Math.round(rect.height),

      connected:
        element.isConnected
    };
  }

  function audit(
    reason = 'audit'
  ) {
    const cards = [];

    DEFINITIONS.forEach(
      definition => {
        const record =
          records.get(
            definition.key
          );

        if (!record) {
          cards.push({
            key:
              definition.key,

            title:
              definition.title,

            success: false
          });

          return;
        }

        /*
         * Always use a fresh measurement.
         * This prevents stale gap values after
         * switching between Linie and Balken.
         */
        const measurement =
          measure(record);

        const cardRect =
          record.card
            .getBoundingClientRect();

        const toolbarRect =
          record.portal
            .getBoundingClientRect();

        cards.push({
          key:
            record.key,

          title:
            record.title,

          success: true,

          toolbar:
            inspect(
              record.portal
            ),

          range:
            inspect(
              record.portalRange
            ),

          track:
            inspect(
              record.track
            ),

          knob:
            inspect(
              record.knob
            ),

          measuredGap:
            Math.round(
              measurement
                .availableGap
            ),

          gapAboveToolbar:
            Math.round(
              toolbarRect.top -
              measurement
                .chartBottom
            ),

          gapBelowToolbar:
            Math.round(
              measurement
                .safeCardBottom -
              toolbarRect.bottom
            ),

          toolbarInsideCard:
            toolbarRect.top >=
              cardRect.top &&
            toolbarRect.bottom <=
              cardRect.bottom &&
            toolbarRect.left >=
              cardRect.left &&
            toolbarRect.right <=
              cardRect.right,

          sourceValue:
            record.sourceRange
              .value,

          portalValue:
            record.portalRange
              .value
        });
      }
    );

    const result = {
      installed: true,
      version: '2.0.0',
      reason,
      cards,
      permanentObservers: 0,
      intervals: 0
    };

    console.info(
      '[PMD Dashboard2 Auto Gap Toolbars V2]',
      result
    );

    console.table(
      cards.map(card => ({
        card:
          card.title,

        success:
          card.success,

        measuredGap:
          card.measuredGap ??
          null,

        gapAbove:
          card.gapAboveToolbar ??
          null,

        gapBelow:
          card.gapBelowToolbar ??
          null,

        insideCard:
          card.toolbarInsideCard ??
          false
      }))
    );

    return result;
  }

  function schedule(
    delay,
    reason
  ) {
    timers.push(
      setTimeout(
        () =>
          layoutAll(reason),
        delay
      )
    );
  }

  const resizeListener =
    function () {
      clearTimeout(
        resizeTimer
      );

      resizeTimer =
        setTimeout(
          () =>
            layoutAll(
              'window-resize'
            ),
          120
        );
    };

  window.addEventListener(
    'resize',
    resizeListener,
    {
      passive: true
    }
  );

  window[KEY] = {
    installed: true,
    version: '2.0.0',

    layout() {
      return layoutAll(
        'manual'
      );
    },

    audit() {
      return audit(
        'audit'
      );
    },

    records
  };

  function boot() {
    layoutAll('initial');

    schedule(
      200,
      'settle-200'
    );

    schedule(
      700,
      'settle-700'
    );

    schedule(
      1500,
      'settle-1500'
    );

    schedule(
      2600,
      'settle-2600'
    );

    console.info(
      '[PMD Dashboard2 Auto Gap Toolbars V2] Ready',
      {
        cards: [
          'salesOverTime',
          'salesByHour'
        ],

        permanentObservers: 0,
        intervals: 0,
        finiteBootRetries: 4
      }
    );
  }

  if (
    document.readyState ===
    'loading'
  ) {
    document.addEventListener(
      'DOMContentLoaded',
      boot,
      {
        once: true
      }
    );
  } else {
    setTimeout(
      boot,
      0
    );
  }
})();
</script>

<!-- PMD_DASHBOARD2_EXACT_KNOB_HIT_FIX_V1 -->
<style id="pmd-dashboard2-exact-knob-hit-fix-v1-style">
  /*
   * The complete visible toolbar owns pointer interaction.
   * The transparent native range remains only as an
   * internal value bridge.
   */
  .pmd-dashboard2-auto-gap-toolbar-v2.pmd-dashboard2-exact-knob-hit-v1 {
    cursor: pointer !important;
    touch-action: none !important;
    user-select: none !important;
    -webkit-user-select: none !important;
  }

  .pmd-dashboard2-auto-gap-toolbar-v2.pmd-dashboard2-exact-knob-hit-v1
  .pmd-dashboard2-auto-gap-input-v2 {
    pointer-events: none !important;
  }

  .pmd-dashboard2-auto-gap-toolbar-v2.pmd-dashboard2-exact-knob-hit-v1
  .pmd-dashboard2-auto-gap-knob-v2 {
    transition:
      transform 120ms ease,
      box-shadow 120ms ease;
  }
</style>

<script>
(function () {
  'use strict';

  const KEY =
    'PMDDashboard2ExactKnobHitFixV1';

  if (window[KEY]?.installed) {
    return;
  }

  const bindings =
    new Map();

  const timers = [];

  const boundModeButtons =
    new WeakSet();

  const modeBindings = [];

  let resizeTimer = null;

  function rangeNumbers(range) {
    const minimum =
      Number(range.min || 0);

    const maximum =
      Number(range.max || 100);

    const rawStep =
      range.getAttribute('step');

    const parsedStep =
      rawStep &&
      rawStep !== 'any'
        ? Number(rawStep)
        : 1;

    const step =
      Number.isFinite(parsedStep) &&
      parsedStep > 0
        ? parsedStep
        : 1;

    return {
      minimum,
      maximum,
      step
    };
  }

  function valuePercentage(range) {
    const {
      minimum,
      maximum
    } = rangeNumbers(range);

    const current =
      Number(
        range.value ||
        minimum
      );

    if (maximum <= minimum) {
      return 0;
    }

    return Math.max(
      0,
      Math.min(
        1,
        (
          current -
          minimum
        ) /
        (
          maximum -
          minimum
        )
      )
    );
  }

  function syncVisual(record) {
    if (
      !record.portal?.isConnected ||
      !record.knob?.isConnected ||
      !record.track?.isConnected
    ) {
      return false;
    }

    const portalRect =
      record.portal
        .getBoundingClientRect();

    const knobRect =
      record.knob
        .getBoundingClientRect();

    const knobWidth =
      knobRect.width || 17;

    const radius =
      knobWidth / 2;

    const usableWidth =
      Math.max(
        1,
        portalRect.width -
        knobWidth
      );

    const percentage =
      valuePercentage(
        record.portalRange
      );

    const center =
      radius +
      percentage *
      usableWidth;

    record.track.style.left =
      `${radius}px`;

    record.track.style.right =
      `${radius}px`;

    record.knob.style.left =
      `${center}px`;

    return true;
  }

  function pointerPositionToValue(
    record,
    clientX
  ) {
    const portalRect =
      record.portal
        .getBoundingClientRect();

    const knobRect =
      record.knob
        .getBoundingClientRect();

    const knobWidth =
      knobRect.width || 17;

    const radius =
      knobWidth / 2;

    const usableWidth =
      Math.max(
        1,
        portalRect.width -
        knobWidth
      );

    const localPosition =
      Math.max(
        0,
        Math.min(
          usableWidth,
          clientX -
          portalRect.left -
          radius
        )
      );

    const percentage =
      localPosition /
      usableWidth;

    const {
      minimum,
      maximum,
      step
    } = rangeNumbers(
      record.portalRange
    );

    const rawValue =
      minimum +
      percentage *
      (
        maximum -
        minimum
      );

    const steppedValue =
      minimum +
      Math.round(
        (
          rawValue -
          minimum
        ) /
        step
      ) *
      step;

    return Math.max(
      minimum,
      Math.min(
        maximum,
        steppedValue
      )
    );
  }

  function applyPointerValue(
    record,
    clientX,
    finalChange
  ) {
    const value =
      pointerPositionToValue(
        record,
        clientX
      );

    record.portalRange.value =
      String(value);

    record.sourceRange.value =
      record.portalRange.value;

    record.sourceRange
      .dispatchEvent(
        new Event(
          finalChange
            ? 'change'
            : 'input',
          {
            bubbles: true
          }
        )
      );

    syncVisual(record);
  }

  function unbindRecord(binding) {
    const {
      record
    } = binding;

    record.portal
      ?.removeEventListener(
        'pointerdown',
        binding.pointerDown
      );

    record.portal
      ?.removeEventListener(
        'pointermove',
        binding.pointerMove
      );

    record.portal
      ?.removeEventListener(
        'pointerup',
        binding.finish
      );

    record.portal
      ?.removeEventListener(
        'pointercancel',
        binding.finish
      );

    record.portal
      ?.removeEventListener(
        'pointerenter',
        binding.pointerEnter
      );

    record.portal
      ?.removeEventListener(
        'pointerleave',
        binding.pointerLeave
      );

    record.sourceRange
      ?.removeEventListener(
        'input',
        binding.sourceSync
      );

    record.sourceRange
      ?.removeEventListener(
        'change',
        binding.sourceSync
      );

    record.portal
      ?.classList.remove(
        'pmd-dashboard2-exact-knob-hit-v1'
      );

    bindings.delete(
      record.portal
    );
  }

  function bindRecord(record) {
    if (
      !record?.portal ||
      !record?.portalRange ||
      !record?.sourceRange ||
      !record?.track ||
      !record?.knob
    ) {
      return false;
    }

    if (
      !record.portal.isConnected ||
      !record.portalRange.isConnected ||
      !record.sourceRange.isConnected
    ) {
      return false;
    }

    if (
      bindings.has(
        record.portal
      )
    ) {
      syncVisual(record);
      return true;
    }

    let dragging = false;
    let pointerId = null;

    record.portal
      .classList.add(
        'pmd-dashboard2-exact-knob-hit-v1'
      );

    record.portal.style
      .setProperty(
        'cursor',
        'pointer',
        'important'
      );

    record.portal.style
      .setProperty(
        'touch-action',
        'none',
        'important'
      );

    record.portalRange.style
      .setProperty(
        'pointer-events',
        'none',
        'important'
      );

    const pointerDown =
      function (event) {
        if (
          event.pointerType ===
            'mouse' &&
          event.button !== 0
        ) {
          return;
        }

        dragging = true;

        pointerId =
          event.pointerId;

        record.portal
          .setPointerCapture?.(
            pointerId
          );

        record.knob.style
          .transform =
          'translate(-50%, -50%) scale(1.12)';

        applyPointerValue(
          record,
          event.clientX,
          false
        );

        event.preventDefault();
      };

    const pointerMove =
      function (event) {
        if (
          !dragging ||
          event.pointerId !==
            pointerId
        ) {
          return;
        }

        applyPointerValue(
          record,
          event.clientX,
          false
        );

        event.preventDefault();
      };

    const finish =
      function (event) {
        if (
          !dragging ||
          event.pointerId !==
            pointerId
        ) {
          return;
        }

        applyPointerValue(
          record,
          event.clientX,
          true
        );

        dragging = false;

        record.knob.style
          .transform =
          'translate(-50%, -50%) scale(1)';

        try {
          record.portal
            .releasePointerCapture?.(
              pointerId
            );
        } catch (error) {
        }

        pointerId = null;

        event.preventDefault();
      };

    const pointerEnter =
      function () {
        if (!dragging) {
          record.knob.style
            .transform =
            'translate(-50%, -50%) scale(1.08)';
        }
      };

    const pointerLeave =
      function () {
        if (!dragging) {
          record.knob.style
            .transform =
            'translate(-50%, -50%) scale(1)';
        }
      };

    const sourceSync =
      function () {
        record.portalRange.value =
          record.sourceRange.value;

        syncVisual(record);
      };

    record.portal
      .addEventListener(
        'pointerdown',
        pointerDown
      );

    record.portal
      .addEventListener(
        'pointermove',
        pointerMove
      );

    record.portal
      .addEventListener(
        'pointerup',
        finish
      );

    record.portal
      .addEventListener(
        'pointercancel',
        finish
      );

    record.portal
      .addEventListener(
        'pointerenter',
        pointerEnter
      );

    record.portal
      .addEventListener(
        'pointerleave',
        pointerLeave
      );

    record.sourceRange
      .addEventListener(
        'input',
        sourceSync
      );

    record.sourceRange
      .addEventListener(
        'change',
        sourceSync
      );

    const binding = {
      record,
      pointerDown,
      pointerMove,
      finish,
      pointerEnter,
      pointerLeave,
      sourceSync
    };

    bindings.set(
      record.portal,
      binding
    );

    syncVisual(record);

    return true;
  }

  function cleanDisconnectedBindings() {
    [
      ...bindings.values()
    ].forEach(binding => {
      if (
        !binding.record.portal
          ?.isConnected ||
        !binding.record.sourceRange
          ?.isConnected
      ) {
        unbindRecord(binding);
      }
    });
  }

  function currentAutoGapApi() {
    return window
      .PMDDashboard2AutoGapToolbarsV2 ||
      null;
  }

  function bindModeButtons(api) {
    if (!api?.records) {
      return;
    }

    [
      ...api.records.values()
    ].forEach(record => {
      [
        ...record.card
          .querySelectorAll(
            '[data-pmd-chart-mode]'
          )
      ].forEach(button => {
        if (
          boundModeButtons.has(
            button
          )
        ) {
          return;
        }

        const listener =
          function () {
            timers.push(
              setTimeout(
                () =>
                  bindAll(
                    'mode-switch-350'
                  ),
                350
              )
            );

            timers.push(
              setTimeout(
                () =>
                  bindAll(
                    'mode-switch-800'
                  ),
                800
              )
            );
          };

        button.addEventListener(
          'mousedown',
          listener
        );

        boundModeButtons.add(
          button
        );

        modeBindings.push({
          button,
          listener
        });
      });
    });
  }

  function bindAll(
    reason = 'manual'
  ) {
    cleanDisconnectedBindings();

    const api =
      currentAutoGapApi();

    if (!api?.records) {
      return {
        installed: true,
        applied: false,
        reason,
        autoGapApiFound: false,
        boundCards: 0
      };
    }

    let boundCards = 0;

    [
      ...api.records.values()
    ].forEach(record => {
      if (
        bindRecord(record)
      ) {
        boundCards += 1;
      }
    });

    bindModeButtons(api);

    return audit(reason);
  }

  function audit(
    reason = 'audit'
  ) {
    const cards = [
      ...bindings.values()
    ].map(binding => {
      const {
        record
      } = binding;

      const portalRect =
        record.portal
          .getBoundingClientRect();

      const knobRect =
        record.knob
          .getBoundingClientRect();

      const knobCenter =
        knobRect.left +
        knobRect.width / 2;

      return {
        title:
          record.title,

        value:
          record.portalRange.value,

        knobCenter:
          Math.round(
            knobCenter
          ),

        portalLeft:
          Math.round(
            portalRect.left
          ),

        portalRight:
          Math.round(
            portalRect.right
          ),

        leftInset:
          Math.round(
            knobCenter -
            portalRect.left
          ),

        rightInset:
          Math.round(
            portalRect.right -
            knobCenter
          ),

        portalOwnsPointer:
          getComputedStyle(
            record.portal
          ).pointerEvents !==
            'none',

        hiddenRangePointerEvents:
          getComputedStyle(
            record.portalRange
          ).pointerEvents,

        directClickEnabled:
          true,

        directDragEnabled:
          true,

        connected:
          record.portal.isConnected
      };
    });

    const result = {
      installed: true,
      version: '1.0.0',
      applied:
        cards.length > 0,
      reason,
      cards,
      permanentObservers: 0,
      intervals: 0
    };

    console.info(
      '[PMD Dashboard2 Exact Knob Hit Fix V1]',
      result
    );

    console.table(cards);

    return result;
  }

  const resizeListener =
    function () {
      clearTimeout(
        resizeTimer
      );

      resizeTimer =
        setTimeout(
          function () {
            bindAll(
              'window-resize'
            );
          },
          120
        );
    };

  window.addEventListener(
    'resize',
    resizeListener,
    {
      passive: true
    }
  );

  window[KEY] = {
    installed: true,
    version: '1.0.0',

    bind() {
      return bindAll(
        'manual'
      );
    },

    audit() {
      return audit(
        'audit'
      );
    }
  };

  function schedule(
    delay,
    reason
  ) {
    timers.push(
      setTimeout(
        function () {
          bindAll(reason);
        },
        delay
      )
    );
  }

  function boot() {
    bindAll('initial');

    schedule(
      200,
      'settle-200'
    );

    schedule(
      700,
      'settle-700'
    );

    schedule(
      1500,
      'settle-1500'
    );

    schedule(
      2800,
      'settle-2800'
    );

    console.info(
      '[PMD Dashboard2 Exact Knob Hit Fix V1] Ready',
      {
        targetCards: [
          'salesOverTime',
          'salesByHour'
        ],

        completeToolbarHitArea:
          true,

        directKnobDrag:
          true,

        permanentObservers:
          0,

        intervals:
          0,

        finiteBootRetries:
          4
      }
    );
  }

  if (
    document.readyState ===
    'loading'
  ) {
    document.addEventListener(
      'DOMContentLoaded',
      boot,
      {
        once: true
      }
    );
  } else {
    setTimeout(
      boot,
      0
    );
  }
})();
</script>


<!-- PMD_DASHBOARD2_TOP_ITEMS_TOGGLE_EXACT_CLONE_V12 -->
<style id="pmd-dashboard2-top-items-toggle-exact-clone-v12-style">
  /*
   * Position only.
   * Dimensions are copied from the real categorySales toggle.
   */
  #pmd-dashboard2-analytics-v1
  [data-pmd-analytics-widget="topItems"] {
    position: relative !important;
  }

  #pmd-dashboard2-analytics-v1
  [data-pmd-analytics-widget="topItems"]
  > header {
    padding-right: 190px !important;
  }

  #pmd-dashboard2-analytics-v1
  [data-pmd-analytics-widget="topItems"]
  > .pmd-dashboard2-donut-period-v1395[
    data-pmd-top-items-period-v1
  ] {
    position: absolute !important;
    top: 14px !important;
    right: 14px !important;
    z-index: 20 !important;
  }
</style>

<script>
(function () {
  'use strict';

  const KEY =
    'PMDDashboard2TopItemsToggleExactCloneV12';

  if (window[KEY]?.installed) {
    return;
  }

  const TOP_SELECTOR =
    '[data-pmd-analytics-widget="topItems"] ' +
    '> .pmd-dashboard2-donut-period-v1395' +
    '[data-pmd-top-items-period-v1]';

  const REFERENCE_SELECTORS = [
    '[data-pmd-analytics-widget="categorySales"] ' +
      '.pmd-dashboard2-donut-period-v1395',

    '[data-pmd-analytics-widget="paymentMethods"] ' +
      '.pmd-dashboard2-donut-period-v1395',

    '[data-pmd-analytics-widget="channelSplit"] ' +
      '.pmd-dashboard2-donut-period-v1395'
  ];

  const CONTAINER_PROPERTIES = [
    'display',
    'align-items',
    'justify-content',
    'gap',
    'width',
    'height',
    'min-width',
    'min-height',
    'max-width',
    'max-height',
    'padding-top',
    'padding-right',
    'padding-bottom',
    'padding-left',
    'border-top-width',
    'border-right-width',
    'border-bottom-width',
    'border-left-width',
    'border-top-style',
    'border-right-style',
    'border-bottom-style',
    'border-left-style',
    'border-top-color',
    'border-right-color',
    'border-bottom-color',
    'border-left-color',
    'border-top-left-radius',
    'border-top-right-radius',
    'border-bottom-right-radius',
    'border-bottom-left-radius',
    'background-color',
    'box-shadow',
    'box-sizing'
  ];

  const BUTTON_PROPERTIES = [
    'display',
    'align-items',
    'justify-content',
    'width',
    'height',
    'min-width',
    'min-height',
    'max-width',
    'max-height',
    'margin-top',
    'margin-right',
    'margin-bottom',
    'margin-left',
    'padding-top',
    'padding-right',
    'padding-bottom',
    'padding-left',
    'border-top-width',
    'border-right-width',
    'border-bottom-width',
    'border-left-width',
    'border-top-style',
    'border-right-style',
    'border-bottom-style',
    'border-left-style',
    'border-top-left-radius',
    'border-top-right-radius',
    'border-bottom-right-radius',
    'border-bottom-left-radius',
    'font-family',
    'font-size',
    'font-weight',
    'line-height',
    'letter-spacing',
    'box-sizing'
  ];

  function findReference() {
    for (const selector of REFERENCE_SELECTORS) {
      const element =
        document.querySelector(selector);

      if (element) {
        return element;
      }
    }

    return null;
  }

  function copyProperties(
    source,
    target,
    properties
  ) {
    const style =
      getComputedStyle(source);

    properties.forEach(property => {
      const value =
        style.getPropertyValue(property);

      if (value) {
        target.style.setProperty(
          property,
          value,
          'important'
        );
      }
    });
  }

  function apply(reason = 'manual') {
    const target =
      document.querySelector(
        TOP_SELECTOR
      );

    const reference =
      findReference();

    if (!target || !reference) {
      return {
        applied: false,
        reason,
        targetFound:
          Boolean(target),
        referenceFound:
          Boolean(reference)
      };
    }

    copyProperties(
      reference,
      target,
      CONTAINER_PROPERTIES
    );

    const targetButtons = [
      ...target.querySelectorAll(
        ':scope > button'
      )
    ];

    const referenceButtons = [
      ...reference.querySelectorAll(
        ':scope > button'
      )
    ];

    targetButtons.forEach(
      (button, index) => {
        const referenceButton =
          referenceButtons[index] ||
          referenceButtons[0];

        if (!referenceButton) {
          return;
        }

        copyProperties(
          referenceButton,
          button,
          BUTTON_PROPERTIES
        );

        /*
         * PMD_DASHBOARD2_TOP_ITEMS_ACTIVE_STATE_FIX_V13
         *
         * Clone dimensions only. Never copy the active color as
         * inline !important styling, because the selected period
         * changes after Tag / Woche / Monat clicks.
         */
        [
          'background-color',
          'color',
          'box-shadow',
          'border-top-color',
          'border-right-color',
          'border-bottom-color',
          'border-left-color'
        ].forEach(property => {
          button.style.removeProperty(
            property
          );
        });
      }
    );

    target.dataset
      .pmdExactToggleCloneV12 =
      'true';

    const targetRect =
      target.getBoundingClientRect();

    const referenceRect =
      reference.getBoundingClientRect();

    const result = {
      applied: true,
      reason,

      target: {
        width:
          Math.round(targetRect.width),
        height:
          Math.round(targetRect.height)
      },

      reference: {
        width:
          Math.round(referenceRect.width),
        height:
          Math.round(referenceRect.height)
      },

      exactHeightMatch:
        Math.abs(
          targetRect.height -
          referenceRect.height
        ) < 1,

      targetButtons:
        targetButtons.map(button => ({
          text:
            button.textContent.trim(),

          width:
            Math.round(
              button
                .getBoundingClientRect()
                .width
            ),

          height:
            Math.round(
              button
                .getBoundingClientRect()
                .height
            )
        })),

      referenceButtons:
        referenceButtons.map(button => ({
          text:
            button.textContent.trim(),

          width:
            Math.round(
              button
                .getBoundingClientRect()
                .width
            ),

          height:
            Math.round(
              button
                .getBoundingClientRect()
                .height
            )
        })),

      otherCardsChanged: 0,
      observersAdded: 0,
      intervalsAdded: 0
    };

    console.info(
      '[PMD Dashboard2 Top Items Exact Toggle Clone V1.2]',
      result
    );

    return result;
  }

  window[KEY] = {
    installed: true,
    version: '1.2.0',
    apply,
    audit() {
      return apply('audit');
    }
  };

  function boot() {
    const first =
      apply('initial');

    if (first.applied) {
      return;
    }

    /*
     * Finite retries only, because dashboard controls
     * may be created shortly after DOMContentLoaded.
     */
    [
      150,
      400,
      800,
      1400,
      2400
    ].forEach(delay => {
      setTimeout(
        () => apply(
          `settle-${delay}`
        ),
        delay
      );
    });
  }

  if (
    document.readyState ===
    'loading'
  ) {
    document.addEventListener(
      'DOMContentLoaded',
      boot,
      {
        once: true
      }
    );
  } else {
    boot();
  }
})();
</script>

<!-- PMD_DASHBOARD2_CHANNEL_TOGGLE_EQUAL_FRAMES_V1 -->
<style id="pmd-dashboard2-channel-toggle-equal-frames-v1-style">
  /*
   * Only Bestellkanäle:
   * Tag / Woche / Monat receive identical frame widths.
   */
  #pmd-dashboard2-analytics-v1
  [data-pmd-analytics-widget="channelSplit"]
  .pmd-dashboard2-donut-period-v1395
  > button {
    flex: 0 0 var(
      --pmd-channel-toggle-equal-width,
      auto
    ) !important;

    width: var(
      --pmd-channel-toggle-equal-width,
      auto
    ) !important;

    min-width: var(
      --pmd-channel-toggle-equal-width,
      auto
    ) !important;

    max-width: var(
      --pmd-channel-toggle-equal-width,
      none
    ) !important;

    justify-content: center !important;
    text-align: center !important;
    box-sizing: border-box !important;
  }
</style>

<script>
(function () {
  'use strict';

  const KEY =
    'PMDDashboard2ChannelToggleEqualFramesV1';

  if (window[KEY]?.installed) {
    return;
  }

  const SELECTOR =
    '[data-pmd-analytics-widget="channelSplit"] ' +
    '.pmd-dashboard2-donut-period-v1395';

  function apply(
    reason = 'manual'
  ) {
    const toggle =
      document.querySelector(
        SELECTOR
      );

    if (!toggle) {
      return {
        applied: false,
        reason,
        toggleFound: false
      };
    }

    const buttons = [
      ...toggle.querySelectorAll(
        ':scope > button'
      )
    ];

    if (!buttons.length) {
      return {
        applied: false,
        reason,
        toggleFound: true,
        buttonCount: 0
      };
    }

    /*
     * Remove the previous equal-width value before measuring
     * each button's natural computed width.
     */
    toggle.style.removeProperty(
      '--pmd-channel-toggle-equal-width'
    );

    buttons.forEach(button => {
      button.style.removeProperty(
        'width'
      );

      button.style.removeProperty(
        'min-width'
      );

      button.style.removeProperty(
        'max-width'
      );

      button.style.removeProperty(
        'flex-basis'
      );
    });

    const naturalWidths =
      buttons.map(button =>
        Math.ceil(
          button
            .getBoundingClientRect()
            .width
        )
      );

    const equalWidth =
      Math.max(
        ...naturalWidths
      );

    toggle.style.setProperty(
      '--pmd-channel-toggle-equal-width',
      `${equalWidth}px`
    );

    toggle.dataset
      .pmdChannelEqualFramesV1 =
      'true';

    const finalWidths =
      buttons.map(button =>
        Math.round(
          button
            .getBoundingClientRect()
            .width
        )
      );

    const result = {
      applied: true,
      reason,

      card:
        'Bestellkanäle',

      labels:
        buttons.map(button =>
          button.textContent.trim()
        ),

      naturalWidths,
      equalWidth,
      finalWidths,

      allEqual:
        new Set(
          finalWidths
        ).size === 1,

      otherCardsChanged: 0,
      observersAdded: 0,
      intervalsAdded: 0
    };

    console.info(
      '[PMD Dashboard2 Bestellkanäle Equal Toggle Frames V1]',
      result
    );

    return result;
  }

  window[KEY] = {
    installed: true,
    version: '1.0.0',
    apply,

    audit() {
      return apply(
        'audit'
      );
    }
  };

  function boot() {
    const initial =
      apply('initial');

    if (initial.applied) {
      return;
    }

    /*
     * Finite retries only, because the donut period controls
     * can be created shortly after DOMContentLoaded.
     */
    [
      150,
      400,
      800,
      1400,
      2400
    ].forEach(delay => {
      setTimeout(
        () => apply(
          `settle-${delay}`
        ),
        delay
      );
    });
  }

  if (
    document.readyState ===
    'loading'
  ) {
    document.addEventListener(
      'DOMContentLoaded',
      boot,
      {
        once: true
      }
    );
  } else {
    boot();
  }
})();
</script>

<!-- PMD_DASHBOARD2_TOP_ITEMS_ACTIVE_STATE_FIX_V13 -->
<script>
(function () {
  'use strict';

  const KEY =
    'PMDDashboard2TopItemsActiveStateFixV13';

  if (window[KEY]?.installed) {
    return;
  }

  const SELECTOR =
    '[data-pmd-analytics-widget="topItems"] ' +
    '.pmd-dashboard2-donut-period-v1395' +
    '[data-pmd-top-items-period-v1]';

  const VISUAL_PROPERTIES = [
    'background-color',
    'color',
    'box-shadow',
    'border-top-color',
    'border-right-color',
    'border-bottom-color',
    'border-left-color'
  ];

  function clearCopiedActiveStyles() {
    const toggle =
      document.querySelector(
        SELECTOR
      );

    if (!toggle) {
      return {
        applied: false,
        toggleFound: false
      };
    }

    const buttons = [
      ...toggle.querySelectorAll(
        ':scope > button'
      )
    ];

    buttons.forEach(button => {
      VISUAL_PROPERTIES.forEach(
        property => {
          button.style.removeProperty(
            property
          );
        }
      );
    });

    return {
      applied: true,
      toggleFound: true,

      selected:
        toggle.querySelector(
          ':scope > button.is-active'
        )?.textContent.trim() ||
        null,

      greenButtons:
        buttons
          .filter(button =>
            button.classList.contains(
              'is-active'
            )
          )
          .map(button =>
            button.textContent.trim()
          ),

      inlineActiveColors:
        buttons.map(button => ({
          label:
            button.textContent.trim(),

          background:
            button.style
              .getPropertyValue(
                'background-color'
              ),

          color:
            button.style
              .getPropertyValue(
                'color'
              )
        }))
    };
  }

  function handleClick(event) {
    const button =
      event.target.closest(
        `${SELECTOR} > button`
      );

    if (!button) {
      return;
    }

    /*
     * Allow the existing period-toggle handler to move
     * is-active first, then remove only stale inline colors.
     */
    requestAnimationFrame(
      clearCopiedActiveStyles
    );
  }

  document.addEventListener(
    'click',
    handleClick
  );

  clearCopiedActiveStyles();

  window[KEY] = {
    installed: true,
    version: '1.3.0',

    apply:
      clearCopiedActiveStyles,

    audit:
      clearCopiedActiveStyles
  };

  console.info(
    '[PMD Dashboard2 Top Items Active State Fix V1.3] Ready',
    {
      activeColorFollowsSelection:
        true,

      exactClonedDimensionsPreserved:
        true,

      otherCardsChanged:
        0
    }
  );
})();
</script>

<!-- PMD_DASHBOARD2_SMALL_TOOLBARS_SWAP_V2 -->
<style id="pmd-dashboard2-small-toolbars-swap-v2-style">
  /*
   * Only the visible slider toolbars belonging to:
   * - Umsatzverlauf
   * - Umsatz nach Stunde
   */

  [data-pmd-analytics-widget="salesOverTime"]
  .pmd-dashboard2-auto-gap-toolbar-v2,

  [data-pmd-analytics-widget="salesByHour"]
  .pmd-dashboard2-auto-gap-toolbar-v2 {
    width: 200px !important;
    min-width: 200px !important;
    max-width: 200px !important;
    height: 22px !important;
  }

  [data-pmd-analytics-widget="salesOverTime"]
  .pmd-dashboard2-auto-gap-track-v2,

  [data-pmd-analytics-widget="salesByHour"]
  .pmd-dashboard2-auto-gap-track-v2 {
    height: 3px !important;
  }

  [data-pmd-analytics-widget="salesOverTime"]
  .pmd-dashboard2-auto-gap-knob-v2,

  [data-pmd-analytics-widget="salesByHour"]
  .pmd-dashboard2-auto-gap-knob-v2 {
    width: 14px !important;
    height: 14px !important;
    border-width: 2px !important;
  }

  @media (max-width: 700px) {
    [data-pmd-analytics-widget="salesOverTime"]
    .pmd-dashboard2-auto-gap-toolbar-v2,

    [data-pmd-analytics-widget="salesByHour"]
    .pmd-dashboard2-auto-gap-toolbar-v2 {
      width: 170px !important;
      min-width: 170px !important;
      max-width: 170px !important;
    }
  }
</style>


<!-- PMD_DASHBOARD2_FINAL_SMALL_TOOLBARS_REAL_SWAP_V3 -->
<style id="pmd-dashboard2-final-small-toolbars-real-swap-v3-style">
  /*
   * Final visible size for the two chart slider toolbars.
   * This block appears after all older toolbar authorities.
   */
  [data-pmd-analytics-widget="salesOverTime"]
  .pmd-dashboard2-auto-gap-toolbar-v2,

  [data-pmd-analytics-widget="salesByHour"]
  .pmd-dashboard2-auto-gap-toolbar-v2 {
    width: 170px !important;
    min-width: 170px !important;
    max-width: 170px !important;
    height: 18px !important;
  }

  [data-pmd-analytics-widget="salesOverTime"]
  .pmd-dashboard2-auto-gap-track-v2,

  [data-pmd-analytics-widget="salesByHour"]
  .pmd-dashboard2-auto-gap-track-v2 {
    height: 2px !important;
  }

  [data-pmd-analytics-widget="salesOverTime"]
  .pmd-dashboard2-auto-gap-knob-v2,

  [data-pmd-analytics-widget="salesByHour"]
  .pmd-dashboard2-auto-gap-knob-v2 {
    width: 12px !important;
    height: 12px !important;
    border-width: 2px !important;
  }

  [data-pmd-analytics-widget="salesOverTime"]
  .pmd-dashboard2-auto-gap-input-v2,

  [data-pmd-analytics-widget="salesByHour"]
  .pmd-dashboard2-auto-gap-input-v2 {
    height: 18px !important;
  }

  @media (max-width: 700px) {
    [data-pmd-analytics-widget="salesOverTime"]
    .pmd-dashboard2-auto-gap-toolbar-v2,

    [data-pmd-analytics-widget="salesByHour"]
    .pmd-dashboard2-auto-gap-toolbar-v2 {
      width: 145px !important;
      min-width: 145px !important;
      max-width: 145px !important;
    }
  }
</style>

<script id="pmd-dashboard2-final-small-toolbars-real-swap-v3-script">
(function () {
  'use strict';

  const KEY =
    'PMDDashboard2FinalSmallToolbarsRealSwapV3';

  if (window[KEY]?.installed) {
    return;
  }

  const TOP_ITEMS_SELECTOR =
    '[data-pmd-analytics-widget="topItems"]';

  const RESERVATIONS_SELECTOR =
    '[data-pmd-analytics-widget="calendarEvents"]';

  let resizeTimer = null;

  function clearGridPlacement(card) {
    if (!card) return;

    [
      'grid-column',
      'grid-column-start',
      'grid-column-end',
      'grid-row',
      'grid-row-start',
      'grid-row-end'
    ].forEach(property => {
      card.style.removeProperty(property);
    });
  }

  function readGridPlacement(card) {
    const style =
      getComputedStyle(card);

    return {
      columnStart:
        style.gridColumnStart,

      columnEnd:
        style.gridColumnEnd,

      rowStart:
        style.gridRowStart,

      rowEnd:
        style.gridRowEnd
    };
  }

  function setGridPlacement(
    card,
    placement
  ) {
    card.style.setProperty(
      'grid-column-start',
      placement.columnStart,
      'important'
    );

    card.style.setProperty(
      'grid-column-end',
      placement.columnEnd,
      'important'
    );

    card.style.setProperty(
      'grid-row-start',
      placement.rowStart,
      'important'
    );

    card.style.setProperty(
      'grid-row-end',
      placement.rowEnd,
      'important'
    );
  }

  function apply(reason = 'manual') {
    const topItems =
      document.querySelector(
        TOP_ITEMS_SELECTOR
      );

    const reservations =
      document.querySelector(
        RESERVATIONS_SELECTOR
      );

    if (!topItems || !reservations) {
      return {
        installed: true,
        applied: false,
        reason,
        topItemsFound:
          Boolean(topItems),
        reservationsFound:
          Boolean(reservations)
      };
    }

    /*
     * Remove our previous inline placement first.
     * This reveals the real stylesheet positions at
     * the current responsive breakpoint.
     */
    clearGridPlacement(topItems);
    clearGridPlacement(reservations);

    void document.documentElement.offsetWidth;

    const topItemsPosition =
      readGridPlacement(topItems);

    const reservationsPosition =
      readGridPlacement(reservations);

    /*
     * Swap the actual computed grid positions.
     * Old CSS grid-column/grid-row rules can no
     * longer restore the previous visual order.
     */
    setGridPlacement(
      topItems,
      reservationsPosition
    );

    setGridPlacement(
      reservations,
      topItemsPosition
    );

    const result = {
      installed: true,
      version: '3.0.0',
      applied: true,
      reason,

      upcomingReservationsMovedTo:
        topItemsPosition,

      topItemsMovedTo:
        reservationsPosition,

      toolbarWidth:
        '170px',

      toolbarKnob:
        '12px'
    };

    console.info(
      '[PMD Dashboard2 Final Small Toolbars + Real Swap V3]',
      result
    );

    return result;
  }

  function boot() {
    apply('initial');

    requestAnimationFrame(() => {
      apply('animation-frame');
    });
  }

  window.addEventListener(
    'resize',
    function () {
      clearTimeout(resizeTimer);

      resizeTimer =
        setTimeout(
          function () {
            apply('window-resize');
          },
          120
        );
    },
    {
      passive: true
    }
  );

  window[KEY] = {
    installed: true,
    version: '3.0.0',
    apply,
    audit() {
      return apply('audit');
    }
  };

  if (
    document.readyState ===
    'loading'
  ) {
    document.addEventListener(
      'DOMContentLoaded',
      boot,
      {
        once: true
      }
    );
  } else {
    boot();
  }
})();
</script>

<!-- PMD_DASHBOARD2_EXACT_CARD_COLUMN_SWAP_V4 -->
<style id="pmd-dashboard2-exact-card-column-swap-v4-style">
  /*
   * Desktop four-card row:
   *
   * Column 1: Upcoming reservations
   * Column 2: Trinkgeldübersicht
   * Column 3: Neueste Bewertungen
   * Column 4: Meistverkaufte Artikel
   *
   * Only the horizontal Grid columns of these two cards change.
   * Their existing row, dimensions, data and functionality remain intact.
   */
  @media (min-width: 1281px) {
    #pmd-dashboard2-analytics-v1
    [data-pmd-analytics-grid]
    > [data-pmd-analytics-widget="calendarEvents"] {
      grid-column-start: 1 !important;
      grid-column-end: span 3 !important;
    }

    #pmd-dashboard2-analytics-v1
    [data-pmd-analytics-grid]
    > [data-pmd-analytics-widget="topItems"] {
      grid-column-start: 10 !important;
      grid-column-end: span 3 !important;
    }
  }
</style>

<!-- PMD_DASHBOARD2_CLEAN_KPI_MENU_STYLE_V1 -->
<style id="pmd-dashboard2-clean-kpi-menu-style-v1">
  /*
   * Dashboard2 KPI selector only.
   * The Reservations2 KPI menu and all other cards remain untouched.
   */

  #pmd-r2-reservation-kpis-v307
  .pmd-dashboard2-kpi-menu-v2 {
    gap: 3px !important;

    width:
      min(286px, calc(100vw - 28px)) !important;

    max-height:
      min(440px, calc(100vh - 110px)) !important;

    padding: 8px !important;

    border:
      1px solid rgba(31, 79, 69, 0.16) !important;

    border-radius: 14px !important;

    background: #ffffff !important;

    box-shadow:
      0 18px 45px rgba(14, 44, 38, 0.16) !important;
  }

  #pmd-r2-reservation-kpis-v307
  .pmd-dashboard2-kpi-menu-v2
  .pmd-dashboard2-kpi-menu-heading {
    display: block !important;

    margin: 0 !important;
    padding: 5px 10px 7px !important;

    color: #7a8985 !important;

    font-size: 11px !important;
    font-weight: 800 !important;
    line-height: 1 !important;

    letter-spacing: 0.06em !important;
    text-transform: uppercase !important;
  }

  /*
   * The HTML contains only:
   * 1. option-copy
   * 2. check
   *
   * Therefore the old unused 38px icon column is removed.
   */
  #pmd-r2-reservation-kpis-v307
  .pmd-dashboard2-kpi-menu-v2
  .pmd-r2-kpi-v2401-option {
    display: grid !important;

    grid-template-columns:
      minmax(0, 1fr) 24px !important;

    align-items: center !important;
    gap: 8px !important;

    min-height: 43px !important;

    padding: 8px 9px 8px 11px !important;

    border:
      1px solid transparent !important;

    border-radius: 10px !important;

    background: transparent !important;

    text-align: left !important;
  }

  #pmd-r2-reservation-kpis-v307
  .pmd-dashboard2-kpi-menu-v2
  .pmd-r2-kpi-v2401-option:hover:not(:disabled) {
    border-color:
      rgba(40, 128, 105, 0.2) !important;

    background: #f3f8f6 !important;
  }

  #pmd-r2-reservation-kpis-v307
  .pmd-dashboard2-kpi-menu-v2
  .pmd-r2-kpi-v2401-option.is-selected {
    border-color:
      rgba(19, 143, 111, 0.3) !important;

    background: #eaf6f1 !important;
  }

  #pmd-r2-reservation-kpis-v307
  .pmd-dashboard2-kpi-menu-v2
  .pmd-r2-kpi-v2401-option:disabled {
    opacity: 0.42 !important;

    background: transparent !important;

    cursor: default !important;
  }

  #pmd-r2-reservation-kpis-v307
  .pmd-dashboard2-kpi-menu-v2
  .pmd-r2-kpi-v2401-option:disabled:hover {
    border-color: transparent !important;
    background: transparent !important;
  }

  #pmd-r2-reservation-kpis-v307
  .pmd-dashboard2-kpi-menu-v2
  .pmd-r2-kpi-v2401-option-copy {
    grid-column: 1 !important;

    display: block !important;

    min-width: 0 !important;
  }

  #pmd-r2-reservation-kpis-v307
  .pmd-dashboard2-kpi-menu-v2
  .pmd-r2-kpi-v2401-option-copy strong {
    display: block !important;

    overflow: hidden !important;

    color: #17332e !important;

    font-size: 13px !important;
    font-weight: 780 !important;
    line-height: 1.2 !important;

    text-overflow: ellipsis !important;
    white-space: nowrap !important;
  }

  /*
   * Remove repeated helper text:
   * Already visible / Show in this card
   */
  #pmd-r2-reservation-kpis-v307
  .pmd-dashboard2-kpi-menu-v2
  .pmd-r2-kpi-v2401-option-copy small {
    display: none !important;
  }

  /*
   * Check always belongs to the final right-hand column.
   */
  #pmd-r2-reservation-kpis-v307
  .pmd-dashboard2-kpi-menu-v2
  .pmd-r2-kpi-v2401-check {
    grid-column: 2 !important;

    display: inline-flex !important;

    width: 22px !important;
    height: 22px !important;

    align-items: center !important;
    justify-content: center !important;
    justify-self: end !important;

    border-radius: 999px !important;

    color: transparent !important;

    font-size: 14px !important;
    font-weight: 900 !important;
    line-height: 1 !important;

    text-align: center !important;
  }

  #pmd-r2-reservation-kpis-v307
  .pmd-dashboard2-kpi-menu-v2
  .pmd-r2-kpi-v2401-option.is-selected
  .pmd-r2-kpi-v2401-check {
    background: #07876c !important;
    color: #ffffff !important;

    box-shadow:
      0 2px 7px rgba(7, 135, 108, 0.22) !important;
  }

  @media (max-width: 820px) {
    #pmd-r2-reservation-kpis-v307
    .pmd-dashboard2-kpi-menu-v2 {
      right: 12px !important;
      left: 12px !important;

      width: auto !important;

      max-height:
        min(68vh, 410px) !important;
    }
  }
</style>


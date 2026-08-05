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
    href="/app/admin/assets/css/pmd-dashboard2-kpis-v1.css?v=dashboard2-v1413-fast-reveal"
>

<style id="pmd-dashboard2-v1413-first-paint-lock">
  html.pmd-dashboard2-r2-exact body {
    background: #f8fbfd !important;
  }

  html.pmd-dashboard2-r2-exact:not(.pmd-dashboard2-v1413-ready)
  body #pmd-reservations2 {
    opacity: 0 !important;
    pointer-events: none !important;
    transition: none !important;
    animation: none !important;
  }

  html.pmd-dashboard2-r2-exact.pmd-dashboard2-v1413-ready
  body #pmd-reservations2 {
    opacity: 1 !important;
    pointer-events: auto !important;
    transition: none !important;
    animation: none !important;
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
      grid-template-rows:
        398px 398px 255px 255px 416px !important;
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
      data-pmd-analytics-widget="topItems"
    >
      <header><h3>Top-selling items</h3></header>
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

    <article
      class="pmd-dashboard2-analytics-card"
      data-pmd-analytics-widget="channelSplit"
    >
      <header><h3>Order channels</h3></header>
      <div class="pmd-dashboard2-widget-body" data-pmd-widget-body></div>
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
      data-pmd-analytics-widget="calendarEvents"
    >
      <header><h3>Upcoming reservations</h3></header>
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
     * When the data attribute is on a wrapper, stretch its first
     * internal card shell as well.
     */
    [data-pmd-analytics-widget="salesOverTime"] > :first-child,
    [data-pmd-analytics-widget="categorySales"] > :first-child,
    [data-pmd-analytics-widget="salesByHour"] > :first-child,
    [data-pmd-analytics-widget="paymentMethods"] > :first-child,
    [data-pmd-analytics-widget="alerts"] > :first-child,
    [data-pmd-analytics-widget="liveOperations"] > :first-child,
    [data-pmd-analytics-widget="channelSplit"] > :first-child,
    [data-pmd-analytics-widget="topItems"] > :first-child,
    [data-pmd-analytics-widget="tips"] > :first-child,
    [data-pmd-analytics-widget="reviews"] > :first-child {
      height: 100% !important;
      min-height: 100% !important;
      max-height: 100% !important;
      box-sizing: border-box !important;
    }

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

<script src="/app/admin/assets/js/pmd-dashboard2-kpis-v1.js?v=dashboard2-v1422-source-repair"></script>

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


<!-- PMD_DASHBOARD2_V1431_SAFE_CHANNELS_TIPS -->
<style id="pmd-dashboard2-v1431-safe-channel-legend">
  /*
   * Exact production structure:
   *
   * li
   *   i
   *   span
   *   b
   *
   * V1431 turns the b text into three explicit spans:
   * count / revenue / percentage.
   */

  #pmd-dashboard2-analytics-v1
  [data-pmd-analytics-widget="channelSplit"]
  .pmd-chart-legend {
    width: 100% !important;
    min-width: 0 !important;
    overflow: visible !important;
  }

  #pmd-dashboard2-analytics-v1
  [data-pmd-analytics-widget="channelSplit"]
  .pmd-chart-legend > li {
    display: grid !important;
    grid-template-columns:
      14px
      minmax(68px, 1fr)
      28px
      minmax(70px, auto)
      minmax(44px, auto) !important;
    column-gap: 7px !important;
    align-items: center !important;
    width: 100% !important;
    min-width: 0 !important;
    padding: 3px 0 !important;
  }

  #pmd-dashboard2-analytics-v1
  [data-pmd-analytics-widget="channelSplit"]
  .pmd-chart-legend > li > i {
    grid-column: 1 !important;
    margin: 0 !important;
  }

  #pmd-dashboard2-analytics-v1
  [data-pmd-analytics-widget="channelSplit"]
  .pmd-chart-legend > li > span {
    grid-column: 2 !important;
    min-width: 0 !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
    white-space: nowrap !important;
  }

  #pmd-dashboard2-analytics-v1
  [data-pmd-analytics-widget="channelSplit"]
  .pmd-chart-legend > li > b {
    display: contents !important;
  }

  #pmd-dashboard2-analytics-v1
  [data-pmd-analytics-widget="channelSplit"]
  .pmd-channel-count-v1431 {
    grid-column: 3 !important;
    text-align: center !important;
    white-space: nowrap !important;
    font-weight: 800 !important;
  }

  #pmd-dashboard2-analytics-v1
  [data-pmd-analytics-widget="channelSplit"]
  .pmd-channel-revenue-v1431 {
    grid-column: 4 !important;
    text-align: right !important;
    white-space: nowrap !important;
    font-weight: 800 !important;
  }

  #pmd-dashboard2-analytics-v1
  [data-pmd-analytics-widget="channelSplit"]
  .pmd-channel-percent-v1431 {
    grid-column: 5 !important;
    text-align: right !important;
    white-space: nowrap !important;
    font-weight: 800 !important;
  }

  @media (max-width: 1250px) {
    #pmd-dashboard2-analytics-v1
    [data-pmd-analytics-widget="channelSplit"]
    .pmd-chart-legend > li {
      grid-template-columns:
        12px
        minmax(55px, 1fr)
        22px
        minmax(58px, auto)
        minmax(38px, auto) !important;
      column-gap: 5px !important;
    }

    #pmd-dashboard2-analytics-v1
    [data-pmd-analytics-widget="channelSplit"]
    .pmd-channel-count-v1431,
    #pmd-dashboard2-analytics-v1
    [data-pmd-analytics-widget="channelSplit"]
    .pmd-channel-revenue-v1431,
    #pmd-dashboard2-analytics-v1
    [data-pmd-analytics-widget="channelSplit"]
    .pmd-channel-percent-v1431 {
      font-size: 10px !important;
    }
  }
</style>

<script id="pmd-dashboard2-v1431-safe-channel-script">
(() => {
  'use strict';

  const MARK =
    'PMD_DASHBOARD2_V1431_SAFE_CHANNELS_TIPS';

  const cardSelector =
    '[data-pmd-analytics-widget="channelSplit"]';

  const periodButtonSelector =
    `${cardSelector} [data-pmd-donut-period]`;

  const normalizeLabel = value =>
    String(value || '')
      .trim()
      .toLowerCase()
      .replace(/[-_]+/g, ' ')
      .replace(/\s+/g, ' ');

  function createMetricSpan(
    className,
    value
  ) {
    const span =
      document.createElement('span');

    span.className = className;
    span.textContent = value;

    return span;
  }

  function splitMetrics(item) {
    const value =
      item.querySelector(':scope > b');

    if (!value) {
      return false;
    }

    if (
      value.dataset.pmdChannelSplitV1431
      === 'true'
    ) {
      return true;
    }

    const text =
      value.textContent
        .replace(/\u00a0/g, ' ')
        .trim();

    /*
     * Expected:
     * 8 · 558,20 € · 100.0%
     */
    const parts =
      text
        .split('·')
        .map(part => part.trim())
        .filter(Boolean);

    const count =
      parts[0] || '0';

    const revenue =
      parts[1] || '0,00 €';

    const percent =
      parts[2] || '0.0%';

    value.textContent = '';

    value.append(
      createMetricSpan(
        'pmd-channel-count-v1431',
        count
      ),
      createMetricSpan(
        'pmd-channel-revenue-v1431',
        revenue
      ),
      createMetricSpan(
        'pmd-channel-percent-v1431',
        percent
      )
    );

    value.dataset.pmdChannelSplitV1431 =
      'true';

    return true;
  }

  function createDeliveryRow(list) {
    const item =
      document.createElement('li');

    item.dataset.pmdChannelSyntheticV1431 =
      'delivery';

    const dot =
      document.createElement('i');

    /*
     * Delivery uses the existing blue analytics color.
     * A zero-value slice is intentionally not added to the SVG.
     */
    dot.style.background = '#2F66E8';

    const label =
      document.createElement('span');

    label.textContent = 'Delivery';

    const value =
      document.createElement('b');

    value.textContent =
      '0 · 0,00 € · 0.0%';

    item.append(dot, label, value);
    list.append(item);

    splitMetrics(item);

    return item;
  }

  function apply() {
    const card =
      document.querySelector(cardSelector);

    if (!card) {
      return {
        applied: false,
        reason: 'card-not-found'
      };
    }

    const list =
      card.querySelector('.pmd-chart-legend');

    if (!list) {
      return {
        applied: false,
        reason: 'legend-not-found'
      };
    }

    const items =
      Array.from(
        list.querySelectorAll(':scope > li')
      );

    items.forEach(splitMetrics);

    const deliveryExists =
      items.some(item => {
        const label =
          item.querySelector(':scope > span');

        return normalizeLabel(
          label?.textContent
        ) === 'delivery';
      });

    if (!deliveryExists) {
      createDeliveryRow(list);
    }

    card.dataset.pmdChannelsV1431 =
      'ready';

    return {
      applied: true,
      rows:
        list.querySelectorAll(
          ':scope > li'
        ).length,
      deliveryPresent: true,
      metricsSplit:
        list.querySelectorAll(
          '[data-pmd-channel-split-v1431="true"]'
        ).length
    };
  }

  function scheduleApply() {
    queueMicrotask(() => {
      requestAnimationFrame(() => {
        apply();
      });
    });
  }

  document.addEventListener(
    'DOMContentLoaded',
    scheduleApply,
    { once: true }
  );

  /*
   * Donut period buttons rebuild the legend asynchronously.
   * Run the formatter after the existing click handler finishes.
   */
  document.addEventListener(
    'click',
    event => {
      if (
        event.target.closest(
          periodButtonSelector
        )
      ) {
        scheduleApply();

        requestAnimationFrame(() => {
          requestAnimationFrame(apply);
        });
      }
    }
  );

  window.PMDDashboard2ChannelsV1431 = {
    version: '1.4.3.1',
    mark: MARK,
    apply,
    audit() {
      const card =
        document.querySelector(cardSelector);

      const list =
        card?.querySelector(
          '.pmd-chart-legend'
        );

      const rows = list
        ? Array.from(
            list.querySelectorAll(
              ':scope > li'
            )
          ).map(item => ({
            label:
              item.querySelector(
                ':scope > span'
              )?.textContent?.trim(),
            count:
              item.querySelector(
                '.pmd-channel-count-v1431'
              )?.textContent?.trim(),
            revenue:
              item.querySelector(
                '.pmd-channel-revenue-v1431'
              )?.textContent?.trim(),
            percent:
              item.querySelector(
                '.pmd-channel-percent-v1431'
              )?.textContent?.trim()
          }))
        : [];

      const result = {
        version: '1.4.3.1',
        cardFound: Boolean(card),
        listFound: Boolean(list),
        rows,
        ready:
          card?.dataset
            .pmdChannelsV1431 === 'ready'
      };

      console.info(
        '[PMD Dashboard2 Channels V1431]',
        result
      );

      return result;
    }
  };

  if (
    document.readyState !== 'loading'
  ) {
    scheduleApply();
  }
})();
</script>


<!-- PMD_DASHBOARD2_V1432_CHANNEL_TOGGLE_PERSISTENCE -->
<script id="pmd-dashboard2-v1432-channel-toggle-persistence">
(() => {
  'use strict';

  const VERSION = '1.4.3.2';

  const ROOT_SELECTOR =
    '#pmd-dashboard2-analytics-v1';

  const CARD_SELECTOR =
    '[data-pmd-analytics-widget="channelSplit"]';

  const LEGEND_SELECTOR =
    '.pmd-chart-legend';

  let observer = null;
  let frame = 0;
  let applying = false;
  let applyCount = 0;
  let rebuildCount = 0;

  function card() {
    return document.querySelector(
      `${ROOT_SELECTOR} ${CARD_SELECTOR}`
    );
  }

  function legend() {
    return card()?.querySelector(
      LEGEND_SELECTOR
    ) || null;
  }

  function hasCorrectStructure() {
    const list = legend();

    if (!list) {
      return false;
    }

    const rows = Array.from(
      list.querySelectorAll(':scope > li')
    );

    if (!rows.length) {
      return false;
    }

    const deliveryExists = rows.some(row => {
      const label = row.querySelector(
        ':scope > span'
      );

      const text = String(
        label?.textContent || ''
      )
        .trim()
        .toLowerCase();

      return (
        text === 'delivery'
        || text === 'lieferung'
      );
    });

    const metricsReady = rows.every(row =>
      Boolean(
        row.querySelector(
          '.pmd-channel-count-v1431'
        )
      )
      && Boolean(
        row.querySelector(
          '.pmd-channel-revenue-v1431'
        )
      )
      && Boolean(
        row.querySelector(
          '.pmd-channel-percent-v1431'
        )
      )
    );

    return deliveryExists && metricsReady;
  }

  function runApply(reason) {
    if (applying) {
      return;
    }

    applying = true;

    try {
      const authority =
        window.PMDDashboard2ChannelsV1431;

      if (
        !authority
        || typeof authority.apply !== 'function'
      ) {
        return;
      }

      if (!hasCorrectStructure()) {
        authority.apply();
        applyCount++;
      }

      const target = card();

      if (target) {
        target.dataset
          .pmdChannelsV1432 = 'ready';

        target.dataset
          .pmdChannelsV1432Reason = reason;
      }
    } finally {
      applying = false;
    }
  }

  function schedule(reason) {
    if (frame) {
      cancelAnimationFrame(frame);
    }

    frame = requestAnimationFrame(() => {
      frame = 0;

      requestAnimationFrame(() => {
        runApply(reason);
      });
    });
  }

  function mutationTouchesChannelCard(
    mutation
  ) {
    const target =
      mutation.target instanceof Element
        ? mutation.target
        : mutation.target.parentElement;

    if (
      target
      && (
        target.matches(CARD_SELECTOR)
        || target.closest(CARD_SELECTOR)
      )
    ) {
      return true;
    }

    return Array.from(
      mutation.addedNodes
    ).some(node =>
      node instanceof Element
      && (
        node.matches(CARD_SELECTOR)
        || node.querySelector(CARD_SELECTOR)
        || node.closest(CARD_SELECTOR)
      )
    );
  }

  function startObserver() {
    const analyticsRoot =
      document.querySelector(ROOT_SELECTOR);

    if (!analyticsRoot) {
      return false;
    }

    observer?.disconnect();

    observer = new MutationObserver(
      mutations => {
        if (
          applying
          || !mutations.some(
            mutationTouchesChannelCard
          )
        ) {
          return;
        }

        rebuildCount++;
        schedule('channel-card-rebuilt');
      }
    );

    observer.observe(
      analyticsRoot,
      {
        childList: true,
        subtree: true
      }
    );

    schedule('observer-start');

    return true;
  }

  function boot() {
    if (!startObserver()) {
      requestAnimationFrame(() => {
        startObserver();
      });
    }
  }

  document.addEventListener(
    'DOMContentLoaded',
    boot,
    { once: true }
  );

  if (
    document.readyState !== 'loading'
  ) {
    boot();
  }

  window.PMDDashboard2ChannelsV1432 = {
    version: VERSION,

    apply() {
      runApply('manual');
      return this.audit();
    },

    restart() {
      boot();
      return this.audit();
    },

    audit() {
      const target = card();
      const list = legend();

      const rows = list
        ? Array.from(
            list.querySelectorAll(
              ':scope > li'
            )
          ).map(row => ({
            label:
              row.querySelector(
                ':scope > span'
              )?.textContent?.trim()
              || null,

            count:
              row.querySelector(
                '.pmd-channel-count-v1431'
              )?.textContent?.trim()
              || null,

            revenue:
              row.querySelector(
                '.pmd-channel-revenue-v1431'
              )?.textContent?.trim()
              || null,

            percent:
              row.querySelector(
                '.pmd-channel-percent-v1431'
              )?.textContent?.trim()
              || null
          }))
        : [];

      const result = {
        version: VERSION,
        observerActive:
          Boolean(observer),
        cardFound:
          Boolean(target),
        legendFound:
          Boolean(list),
        structureCorrect:
          hasCorrectStructure(),
        selectedPeriod:
          target?.dataset
            .pmdIndependentDonutPeriod
          || null,
        applyCount,
        rebuildCount,
        rows
      };

      console.info(
        '[PMD Dashboard2 Channels V1432]',
        result
      );

      return result;
    },

    disconnect() {
      observer?.disconnect();
      observer = null;

      return {
        version: VERSION,
        observerActive: false
      };
    }
  };
})();
</script>

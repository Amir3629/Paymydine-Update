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

@include('admin::reservations2.index')

<link
    rel="stylesheet"
    href="/app/admin/assets/css/pmd-dashboard2-kpis-v1.css?v=one-row-flip-v113-20260803_105152"
>







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
     * Remove layout animations that could create a visible resize.
     */
    [data-pmd-analytics-widget],
    [data-pmd-analytics-widget] * {
      transition-property: color, background-color, border-color,
        opacity !important;
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

<script src="/app/admin/assets/js/pmd-dashboard2-kpis-v1.js?v=dashboard2-v132"></script>

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

/* ============================================================
   PMD_DASHBOARD_LIVE_REFRESH_V1

   Single owner for event-driven Lab refresh.

   IMPORTANT:
   - DOES NOT create another notification poller.
   - Existing push-notifications.js remains the notification API poller.
   - pmd:notification:new is only an invalidation signal.
   - Current KPI/Floor state is re-read from the active Lab controller.
   - Existing Analytics refresh authority is reused.
   - No whole-page reload.
   - No MutationObserver.
   ============================================================ */
(function () {
  'use strict';

  if (window.PMDDashboardLiveRefreshV1) return;

  var root = document.getElementById('pmd-dashboard-lab');
  if (!root) return;

  var state = {
    timer: null,
    running: false,
    queued: false,
    requestCount: 0,
    successCount: 0,
    errorCount: 0,
    lastReason: '',
    lastStartedAt: 0,
    lastSuccessAt: 0,
    lastError: ''
  };

  function liveUrl() {
    var url = new URL(window.location.href);

    url.hash = '';

    // Never accidentally call the analytics endpoint as the live snapshot.
    url.searchParams.delete('pmd_analytics');
    url.searchParams.delete('period');

    url.searchParams.set(
      'pmd_live',
      '1'
    );

    url.searchParams.set(
      '_pmd_live',
      String(Date.now())
    );

    return url.toString();
  }

  async function fetchSnapshot() {
    state.requestCount += 1;

    var response = await fetch(
      liveUrl(),
      {
        method: 'GET',
        credentials: 'same-origin',
        cache: 'no-store',
        headers: {
          Accept: 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'Cache-Control': 'no-cache'
        }
      }
    );

    var payload = await response
      .json()
      .catch(function () {
        return {};
      });

    if (
      !response.ok ||
      !payload ||
      payload.success !== true
    ) {
      throw new Error(
        (
          payload &&
          (
            payload.message ||
            payload.error
          )
        ) ||
        ('HTTP ' + response.status)
      );
    }

    return payload;
  }

  function applyKpis(payload) {
    var applied = false;

    if (
      window.PMDDashboardLabKpisV1 &&
      typeof window.PMDDashboardLabKpisV1
        .applyLivePayload === 'function'
    ) {
      applied =
        window.PMDDashboardLabKpisV1
          .applyLivePayload(payload)
        || applied;
    }

    if (
      window.PMDCleanWorkspaceKpisV1 &&
      typeof window.PMDCleanWorkspaceKpisV1
        .applyLivePayload === 'function'
    ) {
      applied =
        window.PMDCleanWorkspaceKpisV1
          .applyLivePayload(payload)
        || applied;
    }

    return applied;
  }

  function publishSnapshot(payload, reason) {
    applyKpis(payload);

    try {
      window.dispatchEvent(
        new CustomEvent(
          'pmd:dashboard:live-data',
          {
            detail: Object.assign(
              {},
              payload,
              {
                reason: reason || 'manual'
              }
            )
          }
        )
      );
    } catch (_) {}
  }

  function analyticsRefreshTask() {
    if (
      !window.PMDDashboardLabAnalyticsV1 ||
      typeof window.PMDDashboardLabAnalyticsV1
        .refresh !== 'function'
    ) {
      return null;
    }

    return Promise.resolve().then(function () {
      return window.PMDDashboardLabAnalyticsV1.refresh();
    });
  }

  function openOrderRefreshTask() {
    if (
      !window.PMDCashierOrderCenter ||
      typeof window.PMDCashierOrderCenter.inspect !== 'function' ||
      typeof window.PMDCashierOrderCenter.refresh !== 'function'
    ) {
      return null;
    }

    var inspection;

    try {
      inspection = window.PMDCashierOrderCenter.inspect();
    } catch (_) {
      inspection = null;
    }

    if (!inspection || !inspection.open) {
      return null;
    }

    return Promise.resolve().then(function () {
      return window.PMDCashierOrderCenter.refresh();
    });
  }

  async function refresh(reason) {
    reason = String(reason || 'manual');

    if (state.running) {
      state.queued = true;
      return null;
    }

    state.running = true;
    state.lastReason = reason;
    state.lastStartedAt = Date.now();
    state.lastError = '';

    try {
      var payload = await fetchSnapshot();

      publishSnapshot(
        payload,
        reason
      );

      var tasks = [];

      var analytics = analyticsRefreshTask();
      if (analytics) tasks.push(analytics);

      var orderCenter = openOrderRefreshTask();
      if (orderCenter) tasks.push(orderCenter);

      if (tasks.length) {
        await Promise.allSettled(tasks);
      }

      state.successCount += 1;
      state.lastSuccessAt = Date.now();

      try {
        window.dispatchEvent(
          new CustomEvent(
            'pmd:dashboard:live-refreshed',
            {
              detail: {
                reason: reason,
                workspace:
                  payload.workspace || '',
                generated_at:
                  payload.generated_at || '',
                request_count:
                  state.requestCount
              }
            }
          )
        );
      } catch (_) {}

      return payload;
    } catch (error) {
      state.errorCount += 1;
      state.lastError = String(
        error &&
        error.message
          ? error.message
          : error
      );

      console.warn(
        '[PMD Live Dashboard] refresh failed',
        reason,
        error
      );

      return null;
    } finally {
      state.running = false;

      if (state.queued) {
        state.queued = false;
        schedule(
          'queued',
          180
        );
      }
    }
  }

  function schedule(reason, delay) {
    var now = Date.now();

    if (
      (
        reason === 'focus' ||
        reason === 'visible'
      ) &&
      state.lastSuccessAt &&
      now - state.lastSuccessAt < 5000
    ) {
      return;
    }

    if (state.timer) {
      clearTimeout(state.timer);
    }

    state.timer = setTimeout(
      function () {
        state.timer = null;
        refresh(reason);
      },
      Math.max(
        0,
        Number(delay || 0)
      )
    );
  }

  // Existing cross-tab/device signal from push-notifications.js.
  window.addEventListener(
    'pmd:notification:new',
    function () {
      schedule(
        'notification',
        180
      );
    }
  );

  // Same-tab POS mutation: no need to wait for the notification poll.
  window.addEventListener(
    'pmd:waiter-pos-order-updated',
    function () {
      schedule(
        'order-updated',
        120
      );
    }
  );

  // Manual FREE already updates Floor immediately; this confirms KPI/server data.
  window.addEventListener(
    'pmd:cashier-table-freed',
    function () {
      schedule(
        'manual-free',
        120
      );
    }
  );

  // Canonical Reservation Composer already emits this after a successful save.
  window.addEventListener(
    'pmd:reservation-saved',
    function () {
      schedule(
        'reservation-saved',
        120
      );
    }
  );

  // Owner/Manager table edits can affect capacity/Floor KPI values.
  window.addEventListener(
    'pmd:floor:table-manager:saved',
    function () {
      schedule(
        'table-saved',
        120
      );
    }
  );

  // PMD_LIVE_REFRESH_NO_FIRSTPAINT_FOCUS_V2
  //
  // A freshly loaded server-first-paint page is already current.
  // Browser focus during/after reload must NOT trigger a second render.
  //
  // Catch-up remains event-driven only after the user has genuinely
  // left the tab/window for at least three seconds.
  var hiddenAt = document.hidden ? Date.now() : 0;
  var blurredAt = 0;

  document.addEventListener(
    'visibilitychange',
    function () {
      if (document.hidden) {
        hiddenAt = Date.now();
        return;
      }

      var hiddenFor = hiddenAt
        ? Date.now() - hiddenAt
        : 0;

      hiddenAt = 0;

      if (hiddenFor >= 3000) {
        schedule(
          'visible',
          120
        );
      }
    }
  );

  window.addEventListener(
    'blur',
    function () {
      blurredAt = Date.now();
    }
  );

  window.addEventListener(
    'focus',
    function () {
      var blurredFor = blurredAt
        ? Date.now() - blurredAt
        : 0;

      blurredAt = 0;

      if (blurredFor >= 3000) {
        schedule(
          'focus',
          120
        );
      }
    }
  );

  window.PMDDashboardLiveRefreshV1 = {
    version: '1.0.0',
    refresh: function () {
      return refresh('manual');
    },
    schedule: schedule,
    audit: function () {
      return {
        version: '1.0.0',
        route: window.location.pathname,
        running: state.running,
        queued: state.queued,
        requestCount: state.requestCount,
        successCount: state.successCount,
        errorCount: state.errorCount,
        lastReason: state.lastReason,
        lastStartedAt: state.lastStartedAt,
        lastSuccessAt: state.lastSuccessAt,
        lastError: state.lastError,
        notificationEventDriven: true,
        periodicPollerAdded: false,
        wholePageReload: false,
        mutationObserverAdded: false,
        kpiLiveApply: Boolean(
          (
            window.PMDDashboardLabKpisV1 &&
            window.PMDDashboardLabKpisV1.applyLivePayload
          ) ||
          (
            window.PMDCleanWorkspaceKpisV1 &&
            window.PMDCleanWorkspaceKpisV1.applyLivePayload
          )
        ),
        analyticsRefreshReuse: Boolean(
          window.PMDDashboardLabAnalyticsV1 &&
          window.PMDDashboardLabAnalyticsV1.refresh
        ),
        sharedFloorReconciliation: Boolean(
          window.PMDSharedFloorMultiFloorV1
        )
      };
    }
  };

  console.info(
    '[PMD Live Dashboard V1] Ready',
    window.PMDDashboardLiveRefreshV1.audit()
  );
})();

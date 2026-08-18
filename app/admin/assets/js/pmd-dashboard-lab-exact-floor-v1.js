/* ============================================================
   PMD_DASHBOARD_LAB_EXACT_RESERVATIONS_FLOOR_V1
   Extracted from the live canonical Floor V1 CORE only.
   Appended observer/retry patches are intentionally excluded.
   Initial Dashboard Lab data comes from server bootstrap.
   ============================================================ */
(function () {
  'use strict';

  if (window.PMDDashboardLabExactFloorV1) return;

  function clean(value) {
    return String(
      value == null ? '' : value
    ).replace(/\s+/g, ' ').trim();
  }

  function number(value, fallback) {
    var parsed = Number(value);

    return Number.isFinite(parsed)
      ? parsed
      : (fallback || 0);
  }

  function yes(value) {
    return (
      value === true ||
      value === 1 ||
      value === '1' ||
      value === 'true'
    );
  }

  function escapeHtml(value) {
    return String(
      value == null ? '' : value
    ).replace(/[&<>"']/g, function (char) {
      return {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
      }[char];
    });
  }

  function pmdManagedTableFeatures(value) {
    var list = value;
    if (typeof list === 'string') {
      try { list = JSON.parse(list); }
      catch (error) { list = []; }
    }
    if (!Array.isArray(list)) list = [];
    var allowed = ['near_window', 'quiet_area', 'accessible'];
    return allowed.filter(function (feature) {
      return list.map(function (item) { return clean(item).toLowerCase(); }).indexOf(feature) !== -1;
    });
  }

  function fetchJson(url, options) {
    var requestOptions =
      Object.assign({}, options || {});

    var headers =
      Object.assign(
        {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'X-Requested-With':
            'XMLHttpRequest'
        },
        requestOptions.headers || {}
      );

    var csrfToken =
      document.querySelector(
        'meta[name="csrf-token"]'
      );

    if (csrfToken && csrfToken.content) {
      headers['X-CSRF-TOKEN'] =
        csrfToken.content;
    }

    requestOptions.headers = headers;

    return fetch(
      url,
      Object.assign(
        {
          credentials: 'same-origin',
          cache: 'no-store'
        },
        requestOptions
      )
    ).then(function (response) {
      return response.text()
        .then(function (body) {
          var payload = {};

          if (body) {
            try {
              payload = JSON.parse(body);
            } catch (error) {
              payload = {
                message: body
              };
            }
          }

          if (
            !response.ok ||
            payload.ok === false
          ) {
            var requestError = new Error(
              payload.message ||
              body ||
              'HTTP ' + response.status
            );

            requestError.status =
              response.status;

            requestError.responseBody =
              body;

            throw requestError;
          }

          return payload;
        });
    });
  }

  function createFloor(root) {
    var canvas =
      root.querySelector(
        '[data-floor-canvas]'
      );

    var scroll =
      root.querySelector(
        '[data-floor-scroll]'
      );

    var loading =
      root.querySelector(
        '[data-floor-loading]'
      );

    var empty =
      root.querySelector(
        '[data-floor-empty]'
      );

    var drawer =
      root.querySelector(
        '[data-floor-drawer]'
      );

    var toastNode =
      root.querySelector(
        '[data-floor-toast]'
      );

    var dataUrl =
      root.getAttribute(
        'data-data-url'
      );

    var layoutUrl =
      root.getAttribute(
        'data-layout-url'
      );

    var stateUrl =
      root.getAttribute(
        'data-state-url'
      );

    var reservationBusyUrl =
      root.getAttribute(
        'data-pmd-reservation-busy-url'
      ) || window.location.href;

    var reservationBusyHandler =
      root.getAttribute(
        'data-pmd-reservation-busy-handler'
      ) || 'onPmdFloorReservationBusyWindows';

    var orderTemplate =
      root.getAttribute(
        'data-order-url'
      ) ||
      '/admin/waiter-pos/{table}';

    var floorViewId =
      root.getAttribute('data-floor-view-id') ||
      'main-floor';

    var floorViewUrl =
      root.getAttribute('data-floor-view-url') ||
      '';

    var initialViewMode =
      root.getAttribute('data-floor-view-mode') === 'row'
        ? 'row'
        : 'full';

    var initialFullFloorZoom = Math.max(
      .4,
      Math.min(
        1.6,
        number(
          root.getAttribute('data-floor-full-zoom'),
          1
        )
      )
    );

    var FLOOR_WIDTH = 1000;
    var FLOOR_HEIGHT = 560;

    var TABLE_WIDTH = 108;
    var TABLE_HEIGHT = 88;

    var MERGED_WIDTH = 178;
    var MERGED_HEIGHT = 146;

    /*
     * One-row Merge geometry:
     * wide horizontally, compact vertically.
     */
    var STRIP_MERGED_WIDTH = 270;
    var STRIP_MERGED_HEIGHT = 104;

    var MINIMUM_GAP = 14;
    var ONE_ROW_GAP = 18;
    var SNAP_DISTANCE = 20;
    var EDGE_PADDING = 10;

    var reservationBusyTimer = null;
    var reservationBusyRefreshPromise = null;

    var state = {
      payload: {},
      tables: [],
      displayTables: [],

      operational: {
        tables: {},
        merges: {}
      },

      filter: 'all',
      query: '',
      mode: initialViewMode,
      fullFloorZoom: initialFullFloorZoom,
      rowScale: 1,
      zoom: initialViewMode === 'row' ? 1 : initialFullFloorZoom,
      initialized: false,
      userHasChangedZoom: false,

      editing: false,
      mergeMode: false,
      mergeSelection: [],

      /*
       * Short, horizontally scrollable one-row view.
       * This is display-only and never overwrites the saved
       * normal Floor coordinates.
       */
      stripMode: initialViewMode === 'row',

      /*
       * Exact canonical Full Floor coordinates.
       *
       * Captured immediately before entering One row and restored
       * directly into state.tables before Full Floor renders again.
       */
      fullFloorCoordinateSnapshot: null,

      /*
       * Exact Full Floor dimensions captured immediately before
       * entering One row.
       *
       * This prevents temporary One-row viewport height from being
       * reused when Full Floor is restored.
       */
      fullFloorDimensionSnapshot: null,

      /*
       * Mother Floor context.
       *
       * Context controls which page-specific actions and
       * counters are visible without changing the Floor engine.
       */
      context: 'operations',

      /*
       * Area selector replaces the old status filters.
       */
      selectedArea: 'all',

      capabilities: {
        available: true,
        cleaning: true,
        reserved: true,
        waiterCall: true,
        note: true,
        openTable: true,
        unmerge: true
      },

      counters: [],

      selectedDisplayId: null,

      /*
       * Used only for structural transitions such as:
       * - merge
       * - unmerge
       * - normal Floor / One-row switch
       */
      transitionReason: null,

      active: null,
      drag: null,
      saving: false,
      saveAttempted: false,
      saveSequence: 0,

      toastTimer: null
    };

    var floorViewSaveTimer = null;
    var floorViewSaveController = null;

    function floorViewPayload() {
      return {
        floor_id: floorViewId,
        layout_mode: state.stripMode ? 'row' : 'full',
        full_floor_zoom: state.fullFloorZoom
      };
    }

    function saveFloorViewPreference() {
      if (!floorViewUrl) return;

      if (floorViewSaveController) {
        floorViewSaveController.abort();
      }

      floorViewSaveController =
        typeof AbortController === 'function'
          ? new AbortController()
          : null;

      fetchJson(floorViewUrl, {
        method: 'POST',
        headers: {
          'X-IGNITER-REQUEST-HANDLER':
            'onSaveFloorViewPreference'
        },
        signal: floorViewSaveController
          ? floorViewSaveController.signal
          : undefined,
        body: JSON.stringify(floorViewPayload())
      }).catch(function (error) {
        if (error && error.name === 'AbortError') return;
        toast(error.message, true);
        console.error('[PMD Floor] View preference save failed', error);
      });
    }

    function queueFloorViewPreferenceSave(delay) {
      if (floorViewSaveTimer) {
        clearTimeout(floorViewSaveTimer);
      }

      floorViewSaveTimer = setTimeout(function () {
        floorViewSaveTimer = null;
        saveFloorViewPreference();
      }, Math.max(0, Number(delay) || 0));
    }

    /* PMD_DYNAMIC_FULL_FLOOR_ENGINE_V1_START */

    /*
     * Return the real usable Full Floor size.
     *
     * This updates the existing FLOOR_WIDTH/FLOOR_HEIGHT variables,
     * so every existing clamp, collision check, legal-position check,
     * normalization routine and drag routine automatically uses the
     * same correct bounds.
     */
    function syncRealFullFloorBounds() {
      if (
        !root ||
        !scroll ||
        !canvas ||
        state.stripMode
      ) {
        return {
          width: FLOOR_WIDTH,
          height: FLOOR_HEIGHT
        };
      }

      var rootRect =
        root.getBoundingClientRect();

      var scrollRect =
        scroll.getBoundingClientRect();

      /*
       * Use the complete visible horizontal floor frame.
       */
      var savedDimensions =
        state.fullFloorDimensionSnapshot;

      /*
       * After returning from One row, preserve the exact Full Floor
       * dimensions that existed before entering One row.
       *
       * Do not measure the temporary 560px post-strip viewport.
       */
      /* PMD_FULL_FLOOR_VIEWPORT_COVERAGE_BOUNDS_V1_4_14
       *
       * V1.4.13 changed Full Floor zoom to native CSS layout zoom. That is the
       * key difference that makes viewport/zoom bounds safe now:
       *
       *   logical viewport requirement = visible pixels / zoom
       *   rendered requirement         = logical requirement * native zoom
       *                                = visible pixels
       *
       * So a 560px viewport at 80% needs 700 logical px, but those 700 logical
       * px render to exactly 560px. The Floor does NOT become visually larger
       * and no extra pan/scroll world is created. It simply makes every pixel
       * already painted inside the Floor stage a legal table coordinate.
       *
       * Persisted table extents remain stronger than viewport coverage, so a
       * table deliberately saved farther right/down continues to define the
       * real Floor on refresh and at other zoom levels.
       *
       * Do not carry prior FLOOR_WIDTH/FLOOR_HEIGHT forward: current viewport
       * coverage + persisted table extents are the complete authority. This
       * prevents zoom history from accumulating an oversized invisible world.
       */
      var logicalZoom =
        Math.max(
          0.1,
          Number(state.zoom) || 1
        );

      var visibleWidth =
        Math.max(
          Math.round(scroll.clientWidth || 0),
          Math.round(scrollRect.width || 0)
        );

      var availableHeight =
        Math.max(
          0,
          Math.round(
            rootRect.bottom -
            scrollRect.top -
            12
          )
        );

      var visibleHeight =
        Math.max(
          availableHeight,
          Math.round(scroll.clientHeight || 0),
          Math.round(scrollRect.height || 0)
        );

      var viewportLogicalWidth =
        Math.ceil(
          visibleWidth / logicalZoom
        );

      var viewportLogicalHeight =
        Math.ceil(
          visibleHeight / logicalZoom
        );

      /* PMD_FLOOR_LOADED_EXTENT_BOUNDS_V1_4_7
       * Include canonical persisted table coordinates in the logical map size.
       */
      var loadedTableLogicalWidth = 0;
      var loadedTableLogicalHeight = 0;
      (state.tables || []).forEach(function (table) {
        if (!table) return;
        var tableWidth = Math.max(1, Number(table.w) || TABLE_WIDTH);
        var tableHeight = Math.max(1, Number(table.h) || TABLE_HEIGHT);
        var tableX = Number(table.x);
        var tableY = Number(table.y);
        if (Number.isFinite(tableX)) {
          loadedTableLogicalWidth = Math.max(
            loadedTableLogicalWidth,
            Math.ceil(tableX + tableWidth / 2 + EDGE_PADDING)
          );
        }
        if (Number.isFinite(tableY)) {
          loadedTableLogicalHeight = Math.max(
            loadedTableLogicalHeight,
            Math.ceil(tableY + tableHeight / 2 + EDGE_PADDING)
          );
        }
      });

      var realWidth =
        Math.max(
          1000,
          viewportLogicalWidth,
          loadedTableLogicalWidth
        );

      var realHeight =
        Math.max(
          560,
          viewportLogicalHeight,
          loadedTableLogicalHeight
        );

      FLOOR_WIDTH = realWidth;
      FLOOR_HEIGHT = realHeight;

      /*
       * Publish the engine's logical bounds to CSS.
       *
       * Some stable floor styles use !important and otherwise force
       * the real canvas back to 1000x560 despite the inline styles.
       */
      root.style.setProperty(
        '--pmd-real-floor-width',
        FLOOR_WIDTH + 'px'
      );

      root.style.setProperty(
        '--pmd-real-floor-height',
        FLOOR_HEIGHT + 'px'
      );

      /*
       * Existing stable styles force 1000x560 using !important.
       *
       * Inline declarations with important priority are the final
       * Full Floor authority and cannot be overridden by those rules.
       */
      canvas.style.setProperty(
        'width',
        FLOOR_WIDTH + 'px',
        'important'
      );

      canvas.style.setProperty(
        'min-width',
        FLOOR_WIDTH + 'px',
        'important'
      );

      canvas.style.setProperty(
        'height',
        FLOOR_HEIGHT + 'px',
        'important'
      );

      canvas.style.setProperty(
        'min-height',
        FLOOR_HEIGHT + 'px',
        'important'
      );

      canvas.style.setProperty(
        'transform-origin',
        '0 0',
        'important'
      );

      scroll.style.height =
        FLOOR_HEIGHT + 'px';

      scroll.style.minHeight =
        FLOOR_HEIGHT + 'px';

      scroll.style.maxHeight =
        FLOOR_HEIGHT + 'px';

      return {
        width: FLOOR_WIDTH,
        height: FLOOR_HEIGHT
      };
    }

    /*
     * Capture state coordinates, not DOM styles.
     *
     * One row may freely change the DOM presentation, while the
     * canonical Full Floor coordinates remain protected here.
     */
    function captureCanonicalFullFloor() {
      var snapshot = {};

      state.tables.forEach(
        function (table) {
          snapshot[
            String(table.id)
          ] = {
            x: Number(table.x),
            y: Number(table.y)
          };
        }
      );

      state.fullFloorCoordinateSnapshot =
        snapshot;

      /*
       * Capture the dimensions currently rendered in Full Floor.
       *
       * Prefer the engine dimensions because they represent the
       * logical drag boundary. Fall back to the rendered canvas.
       */
      var canvasRect =
        canvas.getBoundingClientRect();

      state.fullFloorDimensionSnapshot = {
        width:
          Math.max(
            1000,
            Number(FLOOR_WIDTH) || 0,
            Math.round(canvasRect.width || 0)
          ),

        height:
          Math.max(
            560,
            Number(FLOOR_HEIGHT) || 0,
            Math.round(canvasRect.height || 0)
          )
      };

      return snapshot;
    }

    /*
     * Restore state coordinates before render().
     *
     * Since render reads state.tables, the first Full Floor frame
     * already contains the exact original positions. No delayed
     * visual correction or jumping is required.
     */
    function restoreCanonicalFullFloor() {
      var snapshot =
        state.fullFloorCoordinateSnapshot;

      if (!snapshot) {
        return;
      }

      state.tables.forEach(
        function (table) {
          var saved =
            snapshot[
              String(table.id)
            ];

          if (!saved) {
            return;
          }

          if (
            Number.isFinite(saved.x)
          ) {
            table.x = saved.x;
          }

          if (
            Number.isFinite(saved.y)
          ) {
            table.y = saved.y;
          }
        }
      );

      /*
       * Keep the source payload synchronized so another normalize()
       * cannot reintroduce stale positions.
       */
      if (
        typeof syncPayloadCoordinatesFromTables ===
        'function'
      ) {
        syncPayloadCoordinatesFromTables();
      }

      /*
       * Restore exact Full Floor dimensions before render/fit.
       */
      var dimensions =
        state.fullFloorDimensionSnapshot;

      if (dimensions) {
        FLOOR_WIDTH =
          dimensions.width;

        FLOOR_HEIGHT =
          dimensions.height;

        root.style.setProperty(
          '--pmd-real-floor-width',
          FLOOR_WIDTH + 'px'
        );

        root.style.setProperty(
          '--pmd-real-floor-height',
          FLOOR_HEIGHT + 'px'
        );

        canvas.style.setProperty(
          'width',
          FLOOR_WIDTH + 'px',
          'important'
        );

        canvas.style.setProperty(
          'min-width',
          FLOOR_WIDTH + 'px',
          'important'
        );

        canvas.style.setProperty(
          'height',
          FLOOR_HEIGHT + 'px',
          'important'
        );

        canvas.style.setProperty(
          'min-height',
          FLOOR_HEIGHT + 'px',
          'important'
        );

        canvas.style.setProperty(
          'transform-origin',
          '0 0',
          'important'
        );

        scroll.style.height =
          FLOOR_HEIGHT + 'px';

        scroll.style.minHeight =
          FLOOR_HEIGHT + 'px';

        scroll.style.maxHeight =
          FLOOR_HEIGHT + 'px';
      }
    }

    /* PMD_DYNAMIC_FULL_FLOOR_ENGINE_V1_END */


    /*
     * Keep logical engine bounds aligned with the responsive frame.
     * This listener does not affect One row.
     */
    window.addEventListener(
      'resize',
      function () {
        if (!state.stripMode) {
          /*
           * A real browser resize is the only time the saved Full
           * Floor dimensions should be discarded and recalculated.
           */
          state.fullFloorDimensionSnapshot =
            null;

          syncRealFullFloorBounds();
          fit();
        }
      }
    );

    function toast(message, error) {
      if (!toastNode) return;

      toastNode.textContent =
        clean(message);

      toastNode.style.background =
        error ? '#a82435' : '#10243a';

      toastNode.classList.add(
        'is-visible'
      );

      clearTimeout(
        state.toastTimer
      );

      state.toastTimer =
        setTimeout(function () {
          toastNode.classList.remove(
            'is-visible'
          );
        }, 2600);
    }

    function clamp(
      value,
      minimum,
      maximum
    ) {
      return Math.min(
        maximum,
        Math.max(minimum, value)
      );
    }

    function tableId(raw) {
      return clean(
        raw.id ||
        raw.table_id ||
        raw.location_table_id ||
        raw.number ||
        raw.table_number
      );
    }

    function tableNumber(raw) {
      return clean(
        raw.number ||
        raw.table_number ||
        raw.table_no ||
        raw.id ||
        raw.table_id
      );
    }

    function area(raw) {
      return clean(
        raw.section ||
        raw.table_section ||
        raw.table_zone ||
        raw.zone ||
        raw.floor_name ||
        'Main'
      );
    }

    function linkedOrders(
      raw,
      orders
    ) {
      var keys = [
        raw.id,
        raw.table_id,
        raw.number,
        raw.table_number,
        raw.table_no,
        raw.name,
        raw.label
      ]
        .map(clean)
        .filter(Boolean);

      return orders.filter(
        function (order) {
          return [
            order.table_id,
            order.location_table_id,
            order.table_number,
            order.table_no,
            order.table_ref,
            order.table,
            order.table_label
          ]
            .map(clean)
            .some(function (value) {
              return (
                keys.indexOf(value) !== -1
              );
            });
        }
      );
    }

    /* PMD_FLOOR_RESERVATION_BUSY_RUNTIME_V1
     * Existing Floor/order state remains the base status authority.
     * Reservation windows only contribute occupied/busy while active.
     * One timeout is scheduled to the NEXT start/end boundary; this is not polling.
     */
    function reservationBusyWindows() {
      var rows = state.payload && state.payload.pmd_reservation_busy_windows;
      return Array.isArray(rows) ? rows : [];
    }

    function reservationBusyAt(dbTableId, tableNo, at) {
      var now = Number(at || Date.now());
      var id = Number(dbTableId || 0);
      var numberValue = clean(tableNo);
      return reservationBusyWindows().some(function (row) {
        if (!row) return false;
        var rowId = Number(row.table_id || 0);
        var rowNo = clean(row.table_no);
        var sameTable = (id > 0 && rowId === id) || (numberValue !== '' && rowNo === numberValue);
        if (!sameTable) return false;
        var start = Number(row.start_ms || 0);
        var end = Number(row.end_ms || 0);
        return start > 0 && end > start && now >= start && now < end;
      });
    }

    function refreshReservationBusyWindows() {
      if (!reservationBusyUrl || !reservationBusyHandler) {
        return Promise.resolve(false);
      }
      if (reservationBusyRefreshPromise) return reservationBusyRefreshPromise;

      reservationBusyRefreshPromise = fetchJson(reservationBusyUrl, {
        method: 'POST',
        headers: {
          'X-IGNITER-REQUEST-HANDLER': reservationBusyHandler
        },
        body: JSON.stringify({})
      }).then(function (payload) {
        var rows = payload && payload.windows;
        if (!Array.isArray(rows)) return false;
        if (!state.payload || typeof state.payload !== 'object') state.payload = {};
        state.payload.pmd_reservation_busy_windows = rows;
        return true;
      }).catch(function (error) {
        console.warn('[PMD Floor] Reservation busy refresh failed', error);
        return false;
      }).then(function (result) {
        reservationBusyRefreshPromise = null;
        return result;
      }, function (error) {
        reservationBusyRefreshPromise = null;
        throw error;
      });

      return reservationBusyRefreshPromise;
    }

    function syncReservationBusyStatuses() {
      var now = Date.now();
      var changed = false;
      (state.tables || []).forEach(function (table) {
        if (!table) return;
        var base = clean(table.baseStatus || table.status || 'available');
        var busy = reservationBusyAt(table.dbTableId, table.number, now);
        var next = (base === 'attention' || base === 'cleaning')
          ? base
          : (busy ? 'occupied' : base);
        if (table.reservationBusy !== busy || table.status !== next) {
          table.reservationBusy = busy;
          table.status = next;
          changed = true;
        }
      });
      if (changed) render();
      scheduleReservationBusyBoundary();
    }

    function scheduleReservationBusyBoundary() {
      if (reservationBusyTimer) {
        window.clearTimeout(reservationBusyTimer);
        reservationBusyTimer = null;
      }
      var now = Date.now();
      var next = 0;
      reservationBusyWindows().forEach(function (row) {
        [Number(row && row.start_ms || 0), Number(row && row.end_ms || 0)].forEach(function (boundary) {
          if (boundary <= now) return;
          if (!next || boundary < next) next = boundary;
        });
      });
      if (!next) return;
      reservationBusyTimer = window.setTimeout(function () {
        reservationBusyTimer = null;
        refreshReservationBusyWindows().then(function () {
          syncReservationBusyStatuses();
        });
      }, Math.max(25, next - now + 35));
    }

    function normalize(
      payload,
      layoutPayload
    ) {
      var rawTables =
        Array.isArray(payload.tables)
          ? payload.tables
          : (
            (
              (
                payload.sections || {}
              ).floor_plan || {}
            ).tables || []
          );

      var orders =
        Array.isArray(payload.orders)
          ? payload.orders
          : (
            Array.isArray(
              payload.current_orders
            )
              ? payload.current_orders
              : []
          );

      var canonicalIds = {};

      (
        layoutPayload &&
        Array.isArray(layoutPayload.tables)
          ? layoutPayload.tables
          : []
      ).forEach(function (table) {
        var dbTableId = number(
          table.table_id || table.id,
          0
        );

        if (!dbTableId) return;

        [
          table.table_no,
          table.table_number,
          table.number,
          table.table_name,
          table.name,
          table.label
        ].map(clean).filter(Boolean)
          .forEach(function (key) {
            canonicalIds[key.toLowerCase()] =
              dbTableId;
          });
      });

      return rawTables
        .map(function (raw, index) {
          var id = tableId(raw);

          /*
           * The operational waiter payload already exposes the
           * canonical database primary key as raw.table_id.
           *
           * Production evidence:
           * Table 15 => raw.table_id 340, matching tables.table_id.
           *
           * The layout identity map remains a secondary resolver only.
           */
          var dbTableId = number(
            raw.table_id,
            0
          );

          /*
           * Preserve raw.table_id when it already contains the
           * canonical database ID.
           *
           * The layout identity map is only a fallback resolver.
           * A failed lookup must never replace a valid ID with 0.
           */
          if (!dbTableId) {
            [
              raw.table_no,
              raw.table_number,
              raw.number,
              raw.table_name,
              raw.name,
              raw.label
            ].map(clean).filter(Boolean)
              .some(function (key) {
                var matchedDbTableId =
                  canonicalIds[
                    key.toLowerCase()
                  ] || 0;

                if (matchedDbTableId > 0) {
                  dbTableId =
                    matchedDbTableId;

                  return true;
                }

                return false;
              });
          }

          var linked =
            linkedOrders(
              raw,
              orders
            );

          var custom =
            state.operational.tables[id] ||
            {};

          var rawStatus =
            clean(
              custom.status ||
              raw.status ||
              raw.latest_order_status ||
              ''
            ).toLowerCase();

          var waiterCall =
            rawStatus === 'waiter-call' ||
            yes(raw.waiter_call) ||
            yes(raw.needs_waiter) ||
            yes(raw.call_waiter);

          var cleaning =
            rawStatus === 'cleaning' ||
            yes(raw.cleaning_required) ||
            yes(raw.needs_cleaning);

          var reserved =
            rawStatus === 'reserved' ||
            yes(raw.reserved) ||
            yes(raw.is_reserved);

          var occupied =
            rawStatus === 'occupied' ||
            linked.length > 0 ||
            number(
              raw.open_orders,
              0
            ) > 0;

          var note =
            clean(
              custom.note ||
              raw.note ||
              raw.comment ||
              ''
            ) ||
            linked.some(
              function (order) {
                return clean(
                  order.note ||
                  order.comment ||
                  ''
                ) !== '';
              }
            );

          var baseStatus =
            (
              waiterCall ||
              !!note
            )
              ? 'attention'
              : cleaning
                ? 'cleaning'
                : reserved
                  ? 'reserved'
                  : occupied
                    ? 'occupied'
                    : 'available';

          var reservationBusy = reservationBusyAt(
            dbTableId,
            tableNumber(raw),
            Date.now()
          );

          var status =
            (baseStatus === 'attention' || baseStatus === 'cleaning')
              ? baseStatus
              : reservationBusy
                ? 'occupied'
                : baseStatus;

          var floor =
            raw.floor || {};

          var x =
            number(
              raw.floor_x,
              number(
                floor.x,
                80 +
                (index % 6) * 150
              )
            );

          var y =
            number(
              raw.floor_y,
              number(
                floor.y,
                60 +
                Math.floor(index / 6) *
                  110
              )
            );

          return {
            raw: raw,
            id: id,
            dbTableId: dbTableId || null,

            number:
              tableNumber(raw),

            name:
              clean(
                raw.name ||
                raw.label ||
                (
                  'Table ' +
                  tableNumber(raw)
                )
              ),

            area: area(raw),

            features: pmdManagedTableFeatures(raw.features || raw.table_features),

            capacity:
              number(
                raw.capacity ||
                raw.table_capacity,
                0
              ),

            status: status,
            baseStatus: baseStatus,
            reservationBusy: reservationBusy,

            waiterCall:
              waiterCall,

            cleaning:
              cleaning,

            note:
              clean(
                custom.note ||
                (
                  typeof note === 'string'
                    ? note
                    : ''
                )
              ),

            openOrders:
              Math.max(
                linked.length,
                number(
                  raw.open_orders,
                  0
                )
              ),

            /* PMD_FLOOR_EXTENDED_COORDINATE_PERSISTENCE_V1_4_7
             * Keep persisted upper coordinates intact during hydration.
             * The measured/dynamic canvas expands to contain them below.
             * Only the real top/left safety edge is applied here.
             */
            x: Math.max(
              TABLE_WIDTH / 2 +
                EDGE_PADDING,
              x
            ),

            y: Math.max(
              TABLE_HEIGHT / 2 +
                EDGE_PADDING,
              y
            ),

            w: TABLE_WIDTH,
            h: TABLE_HEIGHT
          };
        })
        .filter(function (table) {
          return (
            table.id &&
            table.number
          );
        });
    }

    function mergeFor(
      tableIdValue
    ) {
      var found = null;

      Object.keys(
        state.operational.merges || {}
      ).some(function (id) {
        var merge =
          state.operational.merges[id];

        if (
          (merge.table_ids || [])
            .map(String)
            .indexOf(
              String(tableIdValue)
            ) !== -1
        ) {
          found = {
            id: id,
            table_ids:
              merge.table_ids
          };

          return true;
        }

        return false;
      });

      return found;
    }

    function statusPriority(status) {
      return {
        'waiter-call': 5,
        attention: 5,
        cleaning: 4,
        reserved: 3,
        occupied: 2,
        available: 1
      }[status] || 0;
    }

    function mergedStatus(
      members
    ) {
      return members
        .slice()
        .sort(function (a, b) {
          return (
            statusPriority(b.status) -
            statusPriority(a.status)
          );
        })[0].status;
    }

    function buildDisplayTables() {
      var rendered = [];
      var handled = {};

      state.tables.forEach(
        function (table) {
          if (handled[table.id]) {
            return;
          }

          var merge =
            mergeFor(table.id);

          if (!merge) {
            rendered.push(table);
            handled[table.id] = true;
            return;
          }

          var memberIds =
            (merge.table_ids || [])
              .map(String);

          var members =
            state.tables.filter(
              function (candidate) {
                return (
                  memberIds.indexOf(
                    String(candidate.id)
                  ) !== -1
                );
              }
            );

          if (!members.length) {
            rendered.push(table);
            handled[table.id] = true;
            return;
          }

          members.forEach(
            function (member) {
              handled[member.id] = true;
            }
          );

          var centerX =
            members.reduce(
              function (total, member) {
                return (
                  total +
                  Number(member.x)
                );
              },
              0
            ) / members.length;

          var centerY =
            members.reduce(
              function (total, member) {
                return (
                  total +
                  Number(member.y)
                );
              },
              0
            ) / members.length;

          var numbers =
            members.map(
              function (member) {
                return member.number;
              }
            );

          rendered.push({
            id: members[0].id,

            number:
              numbers.join(' + '),

            name:
              'Merged tables ' +
              numbers.join(', '),

            area:
              members[0].area,

            features:
              pmdManagedTableFeatures([].concat.apply([], members.map(function (member) {
                return Array.isArray(member.features) ? member.features : [];
              }))),

            capacity:
              members.reduce(
                function (total, member) {
                  return (
                    total +
                    number(
                      member.capacity,
                      0
                    )
                  );
                },
                0
              ),

            status:
              mergedStatus(members),

            waiterCall:
              members.some(
                function (member) {
                  return (
                    member.waiterCall
                  );
                }
              ),

            cleaning:
              members.some(
                function (member) {
                  return member.cleaning;
                }
              ),

            note:
              members
                .map(function (member) {
                  return member.note;
                })
                .filter(Boolean)
                .join(' · '),

            openOrders:
              members.reduce(
                function (total, member) {
                  return (
                    total +
                    number(
                      member.openOrders,
                      0
                    )
                  );
                },
                0
              ),

            x: centerX,
            y: centerY,

            w: MERGED_WIDTH,
            h: MERGED_HEIGHT,

            isMergedView: true,

            mergeId:
              merge.id,

            memberIds:
              members.map(
                function (member) {
                  return member.id;
                }
              ),

            members:
              members
          });
        }
      );

      if (state.stripMode) {
        rendered = rendered
          .map(function (table) {
            return Object.assign(
              {},
              table,

              {
                memberIds:
                  table.memberIds
                    ? table.memberIds.slice()
                    : undefined,

                members:
                  table.members
                    ? table.members.slice()
                    : undefined
              }
            );
          })
          .sort(function (first, second) {
            function smallestNumber(table) {
              var values =
                table.isMergedView
                  ? table.members.map(
                    function (member) {
                      return Number(
                        member.number
                      );
                    }
                  )
                  : [
                    Number(table.number)
                  ];

              values = values.filter(
                Number.isFinite
              );

              return values.length
                ? Math.min.apply(
                  Math,
                  values
                )
                : 999999;
            }

            return (
              smallestNumber(first) -
              smallestNumber(second)
            );
          });

        var cursorX =
          EDGE_PADDING;

        var stripHeight = 132;

        rendered.forEach(
          function (table) {
            var size =
              dimensions(table);

            table.w = size.width;
            table.h = size.height;

            table.x =
              cursorX +
              size.width / 2;

            table.y =
              stripHeight / 2;

            cursorX +=
              size.width +
              ONE_ROW_GAP;
          }
        );

        canvas.style.width =
          Math.max(
            FLOOR_WIDTH,
            cursorX +
              EDGE_PADDING -
              ONE_ROW_GAP
          ) + 'px';

        canvas.style.height =
          stripHeight + 'px';
      } else {
        canvas.style.width =
          FLOOR_WIDTH + 'px';

        canvas.style.height =
          FLOOR_HEIGHT + 'px';
      }

      state.displayTables = rendered;

      return rendered;
    }

    function badges(table) {
      var list = [];

      /*
       * Merged state uses the same compact top-right badge
       * system as Note, Cleaning and Waiter Call.
       */
      if (table.isMergedView) {
        list.push(
          '<span class="' +
          'pmd-floor-v1__badge ' +
          'is-merge" ' +
          'title="' +
          escapeHtml(
            table.memberIds.length +
            ' merged tables'
          ) +
          '">' +
          '↔</span>'
        );
      }

      if (table.waiterCall) {
        list.push(
          '<span class="' +
          'pmd-floor-v1__badge ' +
          'is-call" ' +
          'title="Waiter call">' +
          '♟</span>'
        );
      }

      if (table.note) {
        list.push(
          '<span class="' +
          'pmd-floor-v1__badge ' +
          'is-note" ' +
          'title="Note">' +
          '✎</span>'
        );
      }

      if (table.cleaning) {
        list.push(
          '<span class="' +
          'pmd-floor-v1__badge ' +
          'is-clean" ' +
          'title="Needs cleaning">' +
          '✦</span>'
        );
      }

      return list.length
        ? (
          '<span class="' +
          'pmd-floor-v1__badges">' +
          list.join('') +
          '</span>'
        )
        : '';
    }

    function pmdFeatureBadges(table) {
      var features = pmdManagedTableFeatures(table && table.features);
      if (!features.length) return '';

      var locale = root.getAttribute('data-pmd-floor-feature-locale') === 'de' ? 'de' : 'en';
      var meta = {
        near_window: {
          de: 'Am Fenster', en: 'Near window',
          svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="2"></rect><path d="M4 12h16M12 4v16"></path></svg>'
        },
        quiet_area: {
          de: 'Ruhiger Bereich', en: 'Quiet area',
          svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H3v6h3l5 4z"></path><path d="m16 9 5 6M21 9l-5 6"></path></svg>'
        },
        accessible: {
          de: 'Barrierefrei', en: 'Accessible',
          svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="5" r="2"></circle><path d="M7 9h5l2 5h3M9 9v5a4 4 0 1 0 4 4M13 14l2 6h4"></path></svg>'
        }
      };

      return '<span class="pmd-floor-table-features" data-pmd-floor-table-features aria-hidden="true">' +
        features.map(function (feature) {
          var item = meta[feature];
          return '<span class="pmd-floor-table-feature-icon is-' + escapeHtml(feature) + '" title="' +
            escapeHtml(item[locale] || item.en) + '">' + item.svg + '</span>';
        }).join('') +
        '</span>';
    }

    function visible(table) {
      if (
        state.filter !== 'all'
      ) {
        if (
          state.filter ===
          'attention'
        ) {
          if (
            !(
              table.waiterCall ||
              table.note
            )
          ) {
            return false;
          }
        } else if (
          table.status !==
          state.filter
        ) {
          return false;
        }
      }

      if (state.query) {
        var text = [
          table.number,
          table.name,
          table.area,
          table.status
        ]
          .join(' ')
          .toLowerCase();

        if (
          text.indexOf(
            state.query
          ) === -1
        ) {
          return false;
        }
      }

      return true;
    }

    function transitionSnapshot() {
      if (
        !canvas ||
        !state.transitionReason
      ) {
        return null;
      }

      var cards = [];

      canvas
        .querySelectorAll(
          '[data-floor-table]'
        )
        .forEach(function (node) {
          var rect =
            node.getBoundingClientRect();

          var members =
            clean(
              node.getAttribute(
                'data-floor-members'
              ) || ''
            )
              .split(',')
              .map(clean)
              .filter(Boolean);

          cards.push({
            id:
              clean(
                node.getAttribute(
                  'data-floor-table'
                )
              ),

            members: members,

            rect: {
              left: rect.left,
              top: rect.top,
              width: rect.width,
              height: rect.height,

              centerX:
                rect.left +
                rect.width / 2,

              centerY:
                rect.top +
                rect.height / 2
            },

            clone:
              node.cloneNode(true)
          });
        });

      return {
        reason:
          state.transitionReason,

        cards: cards
      };
    }

    function sourceForNewCard(
      node,
      snapshot
    ) {
      var id =
        clean(
          node.getAttribute(
            'data-floor-table'
          )
        );

      var members =
        clean(
          node.getAttribute(
            'data-floor-members'
          ) || ''
        )
          .split(',')
          .map(clean)
          .filter(Boolean);

      var direct =
        snapshot.cards.find(
          function (card) {
            return card.id === id;
          }
        );

      if (direct) {
        return direct.rect;
      }

      /*
       * Unmerge:
       * an individual card starts from the previous merged card.
       */
      var previousMerged =
        snapshot.cards.find(
          function (card) {
            return (
              card.members.indexOf(id) !==
              -1
            );
          }
        );

      if (previousMerged) {
        return previousMerged.rect;
      }

      /*
       * Merge:
       * the new merged card starts from the average location
       * of its former individual member cards.
       */
      if (members.length) {
        var memberCards =
          snapshot.cards.filter(
            function (card) {
              return (
                members.indexOf(
                  card.id
                ) !== -1
              );
            }
          );

        if (memberCards.length) {
          return {
            centerX:
              memberCards.reduce(
                function (total, card) {
                  return (
                    total +
                    card.rect.centerX
                  );
                },
                0
              ) /
              memberCards.length,

            centerY:
              memberCards.reduce(
                function (total, card) {
                  return (
                    total +
                    card.rect.centerY
                  );
                },
                0
              ) /
              memberCards.length,

            width:
              memberCards[0]
                .rect.width,

            height:
              memberCards[0]
                .rect.height
          };
        }
      }

      return null;
    }

    function animateStructuralRender(
      snapshot
    ) {
      if (
        !snapshot ||
        !canvas
      ) {
        state.transitionReason = null;
        return;
      }

      var duration =
        snapshot.reason === 'layout'
          ? 360
          : 280;

      root.classList.add(
        'is-floor-transitioning'
      );

      canvas
        .querySelectorAll(
          '[data-floor-table]'
        )
        .forEach(function (node) {
          var target =
            node.getBoundingClientRect();

          var source =
            sourceForNewCard(
              node,
              snapshot
            );

          if (!source) {
            node.animate(
              [
                {
                  opacity: 0,
                  transform:
                    'scale(.92)'
                },

                {
                  opacity: 1,
                  transform:
                    'scale(1)'
                }
              ],
              {
                duration: duration,
                easing:
                  'cubic-bezier(.2,.8,.2,1)',
                fill: 'both'
              }
            );

            return;
          }

          var translateX =
            source.centerX -
            (
              target.left +
              target.width / 2
            );

          var translateY =
            source.centerY -
            (
              target.top +
              target.height / 2
            );

          var scaleX =
            source.width /
            Math.max(
              target.width,
              1
            );

          var scaleY =
            source.height /
            Math.max(
              target.height,
              1
            );

          /*
           * Tables are positioned by their center point.
           *
           * Their permanent CSS transform is:
           *   translate(-50%, -50%)
           *
           * The previous structural animation ended at
           * translate(0,0) with fill:'both', which permanently
           * overrode that centering transform after One row.
           */
          var animation =
            node.animate(
              [
                {
                  opacity: .72,

                  transform:
                    'translate(-50%, -50%) ' +
                    'translate(' +
                    translateX +
                    'px,' +
                    translateY +
                    'px) scale(' +
                    scaleX +
                    ',' +
                    scaleY +
                    ')'
                },

                {
                  opacity: 1,

                  transform:
                    'translate(-50%, -50%) ' +
                    'translate(0,0) ' +
                    'scale(1,1)'
                }
              ],
              {
                duration: duration,
                easing:
                  'cubic-bezier(.2,.8,.2,1)',
                fill: 'none'
              }
            );

          /*
           * Explicitly remove the Web Animation after completion,
           * allowing the normal CSS transform to remain authoritative.
           */
          animation.addEventListener(
            'finish',
            function () {
              animation.cancel();
            },
            {
              once: true
            }
          );
        });

      window.setTimeout(
        function () {
          root.classList.remove(
            'is-floor-transitioning'
          );
        },
        duration + 40
      );

      state.transitionReason = null;
    }

    function render() {
      if (!canvas) return;

      var structuralSnapshot =
        transitionSnapshot();

      var displayTables =
        buildDisplayTables();

      canvas.innerHTML =
        displayTables
          .map(function (table) {
            var mergeSelected =
              state.mergeSelection
                .some(function (id) {
                  if (
                    table.isMergedView
                  ) {
                    return (
                      table.memberIds
                        .indexOf(id) !== -1
                    );
                  }

                  return (
                    id === table.id
                  );
                });

            var operationalSelected =
              String(
                state.selectedDisplayId || ''
              ) === String(table.id);

            var selected =
              mergeSelected ||
              operationalSelected;

            var meta =
              (
                table.status ===
                  'available' ||
                table.status ===
                  'occupied'
              )
                ? ''
                : table.status
                    .replace('-', ' ');

            return (
              '<button ' +
              'type="button" ' +

              'class="' +
              'pmd-floor-v1__table' +
              (
                table.isMergedView
                  ? ' is-merged-card'
                  : ''
              ) +
              (
                selected
                  ? ' is-selected'
                  : ''
              ) +
              (
                !visible(table)
                  ? ' is-filtered'
                  : ''
              ) +
              '" ' +

              'data-floor-table="' +
              escapeHtml(table.id) +
              '" ' +

              (
                table.isMergedView
                  ? (
                    'data-floor-merge-id="' +
                    escapeHtml(
                      table.mergeId
                    ) +
                    '" ' +

                    'data-floor-members="' +
                    escapeHtml(
                      table.memberIds.join(',')
                    ) +
                    '" '
                  )
                  : ''
              ) +

              'data-status="' +
              escapeHtml(
                table.status
              ) +
              '" ' +

              (
                table.status === 'available'
                  ? 'data-pmd-range-color="free" '
                  : table.status === 'occupied'
                    ? 'data-pmd-range-color="busy" '
                    : table.status === 'reserved'
                      ? 'data-pmd-range-color="rangeReservation" '
                      : ''
              ) +

              'style="' +
              'left:' +
              table.x +
              'px;' +
              'top:' +
              table.y +
              'px;' +
              'width:' +
              table.w +
              'px;' +
              'height:' +
              table.h +
              'px" ' +

              'aria-label="' +
              escapeHtml(table.name) +
              '">' +

              badges(table) +

              '<strong class="' +
              'pmd-floor-v1__table-number">' +
              escapeHtml(
                table.number
              ) +
              '</strong>' +

              pmdFeatureBadges(table) +

              (
                meta
                  ? (
                    '<span class="' +
                    'pmd-floor-v1__table-meta">' +
                    escapeHtml(meta) +
                    '</span>'
                  )
                  : ''
              ) +

              '' +

              '</button>'
            );
          })
          .join('');

      var shown =
        displayTables
          .filter(visible)
          .length;

      if (empty) {
        empty.hidden =
          shown > 0;
      }

      updateCounts();
      applyZoom();

      root.setAttribute(
        'aria-busy',
        'false'
      );

      if (loading) {
        loading.hidden = true;
      }

      animateStructuralRender(
        structuralSnapshot
      );

      updateMotherToolbar();

      organizeFloorControls();
      refreshFloorIcons();

      refreshAreaAndStripLayout();
    }

    function updateCounts() {
      [
        'all',
        'available',
        'occupied',
        'reserved',
        'cleaning',
        'attention'
      ].forEach(function (key) {
        var count =
          key === 'all'
            ? state.tables.length
            : state.tables.filter(
              function (table) {
                return (
                  key === 'attention'
                    ? (
                      table.waiterCall ||
                      !!table.note
                    )
                    : (
                      table.status === key
                    )
                );
              }
            ).length;

        var node =
          root.querySelector(
            '[data-floor-count="' +
            key +
            '"]'
          );

        if (node) {
          node.textContent =
            String(count);
        }
      });
    }

    function applyZoom() {
      if (!canvas) return;

      state.zoom = state.stripMode
        ? state.rowScale
        : state.fullFloorZoom;

      var viewport =
        canvas.parentElement;

      if (!viewport) {
        return;
      }

      viewport
        .style.setProperty(
          '--floor-zoom',
          state.zoom
        );

      /* PMD_FULL_FLOOR_NATIVE_LAYOUT_ZOOM_V1_4_13
       *
       * One geometry authority for Full Floor zoom:
       *
       *   logical Floor size  = FLOOR_WIDTH / FLOOR_HEIGHT
       *   table coordinates   = unchanged logical coordinates
       *   rendered size       = logical size * CSS zoom
       *   browser scroll size = rendered size
       *
       * transform:scale() changes paint but not the element's normal layout
       * box when shrinking, and transformed overflow can differ from the
       * normal layout box when enlarging.  Previous fixes therefore needed a
       * second scroll-bound calculation.  At the right/bottom edge Safari can
       * visibly fight those two geometries.
       *
       * CSS layout zoom scales both rendering and scrollable layout together.
       * There is no scroll-event clamp, no spacer and no camera runtime. Native
       * overflow:auto is the only viewport authority.
       */
      if (state.stripMode) {
        /*
         * One row keeps its proven transform + horizontal-scroll behavior.
         * Remove Full Floor's layout zoom before restoring that mode.
         */
        canvas.style.removeProperty(
          'zoom'
        );

        canvas.style.transform =
          'scale(' +
          state.zoom +
          ')';

        viewport.style.setProperty(
          'overflow-x',
          'auto',
          'important'
        );

        viewport.style.setProperty(
          'overflow-y',
          'hidden',
          'important'
        );

        return;
      }

      var zoom =
        Math.max(
          0.01,
          Number(state.zoom) || 1
        );

      /* PMD_FULL_FLOOR_VIEWPORT_COVERAGE_SYNC_V1_4_14
       * Re-resolve logical bounds AFTER state.zoom changes and BEFORE native
       * layout zoom is applied. This makes zoom buttons immediately update the
       * legal drag area without a render loop, timer, observer or scroll clamp.
       */
      syncRealFullFloorBounds();

      /* Full Floor: no transform-based scroll geometry. */
      canvas.style.transform = 'none';
      canvas.style.setProperty(
        'zoom',
        String(zoom)
      );

      /*
       * Restore the stylesheet's native overflow:auto authority. With layout
       * zoom the browser now knows the exact scaled content size itself:
       * - if the Floor fits, scrollWidth/Height collapse to the viewport;
       * - if it exceeds the viewport, max scroll ends exactly at the Floor.
       */
      viewport.style.removeProperty(
        'overflow-x'
      );
      viewport.style.removeProperty(
        'overflow-y'
      );
    }

    function fit() {
      if (!scroll || !canvas) {
        return;
      }

      if (!state.stripMode) {
        syncRealFullFloorBounds();
      }

      if (state.stripMode) {
        /*
         * Keep the page width unchanged.
         * Wide one-row contents use horizontal scrolling.
         */
        applyZoom();

        scroll.scrollLeft = 0;
        scroll.scrollTop = 0;

        return;
      }

      /*
       * Full Floor must keep its canonical visual size.
       *
       * FLOOR_WIDTH/FLOOR_HEIGHT already match the real usable
       * frame, so auto-fitting here only makes the tables smaller.
       */
      applyZoom();

      scroll.scrollLeft = 0;
      scroll.scrollTop = 0;
    }

    function saveOperational(
      action,
      body
    ) {
      /*
       * Preserve layout before an operational refresh.
       *
       * Status APIs must never change table coordinates.
       */
      var coordinateSnapshot =
        captureCurrentFloorCoordinates();

      return fetchJson(
        stateUrl,
        {
          method: 'POST',

          body:
            JSON.stringify(
              Object.assign(
                {
                  action: action
                },
                body || {}
              )
            )
        }
      ).then(function (payload) {
        state.operational =
          payload.state ||
          state.operational;

        /*
         * normalize() reconstructs table objects from the original
         * data payload, which can contain stale floor_x/floor_y.
         */
        state.tables =
          normalize(state.payload);

        /*
         * Restore the exact positions that existed immediately
         * before waiter call / note / cleaning / reservation.
         */
        restoreFloorCoordinates(
          coordinateSnapshot
        );

        render();

        window.dispatchEvent(
          new CustomEvent(
            'pmd:floor:updated',
            {
              detail: {
                action: action,
                state:
                  state.operational,

                coordinatesPreserved:
                  true
              }
            }
          )
        );

        return payload;
      });
    }

    
/* PMD_FLOOR_PERSISTENCE_JUMP_V292_START */

/*
 * Keep the original API payload synchronized with the
 * current Floor coordinates.
 *
 * Operational actions rebuild state.tables from state.payload.
 * Without this synchronization, waiter calls, notes, cleaning
 * and reservation actions can restore stale table positions.
 */
function syncPayloadCoordinatesFromTables() {
  if (
    !state ||
    !Array.isArray(state.tables) ||
    !state.payload
  ) {
    return;
  }

  var coordinates = {};

  state.tables.forEach(
    function (table) {
      coordinates[
        String(table.id)
      ] = {
        x: Number(table.x),
        y: Number(table.y)
      };
    }
  );

  function synchronizeList(list) {
    if (!Array.isArray(list)) {
      return;
    }

    list.forEach(
      function (raw) {
        if (!raw) {
          return;
        }

        var id =
          raw.id != null
            ? raw.id
            : (
              raw.table_id != null
                ? raw.table_id
                : raw.tableId
            );

        var coordinate =
          coordinates[
            String(id)
          ];

        if (!coordinate) {
          return;
        }

        raw.floor_x =
          coordinate.x;

        raw.floor_y =
          coordinate.y;

        if (
          raw.floor &&
          typeof raw.floor === 'object'
        ) {
          raw.floor.x =
            coordinate.x;

          raw.floor.y =
            coordinate.y;
        }
      }
    );
  }

  synchronizeList(
    state.payload.tables
  );

  synchronizeList(
    state.payload.data
  );

  synchronizeList(
    state.payload.items
  );

  if (
    state.payload.floor &&
    typeof state.payload.floor ===
      'object'
  ) {
    synchronizeList(
      state.payload.floor.tables
    );
  }
}

/*
 * Capture positions before an operational API response.
 */
function captureCurrentFloorCoordinates() {
  var snapshot = {};

  state.tables.forEach(
    function (table) {
      snapshot[
        String(table.id)
      ] = {
        x: Number(table.x),
        y: Number(table.y)
      };
    }
  );

  return snapshot;
}

/*
 * Restore the exact coordinates after normalize().
 */
function restoreFloorCoordinates(snapshot) {
  if (!snapshot) {
    return;
  }

  state.tables.forEach(
    function (table) {
      var saved =
        snapshot[
          String(table.id)
        ];

      if (!saved) {
        return;
      }

      if (
        Number.isFinite(saved.x)
      ) {
        table.x = saved.x;
      }

      if (
        Number.isFinite(saved.y)
      ) {
        table.y = saved.y;
      }
    }
  );

  syncPayloadCoordinatesFromTables();
}

/* PMD_FLOOR_PERSISTENCE_JUMP_V292_END */


function saveLayout() {
      if (
        state.saving ||
        state.saveAttempted
      ) {
        console.warn(
          '[PMD Floor] Save ignored: this edit session already submitted'
        );

        return Promise.resolve(null);
      }

      state.saving = true;
      state.saveAttempted = true;
      state.saveSequence += 1;

      var saveControls =
        root.querySelectorAll(
          '[data-floor-save], ' +
          '[data-pmd-r2-tool="edit"]'
        );

      saveControls.forEach(function (control) {
        control.disabled = true;
      });

      console.info(
        '[PMD Floor] Save identity audit',
        {
          total: state.tables.length,
          identities:
            state.tables.map(function (table) {
              return {
                label:
                  table.name || null,
                id: table.id || null,
                table_id:
                  table.raw
                    ? table.raw.table_id || null
                    : null,
                tableId:
                  table.tableId || null,
                dbTableId:
                  table.dbTableId || null,
                number:
                  table.number || null
              };
            })
        }
      );

      var tables =
        state.tables.filter(
          function (table) {
            if (table.dbTableId) {
              return true;
            }

            console.error(
              '[PMD Floor] Table excluded from save: canonical database ID missing',
              {
                label: table.name || null,
                id: table.id || null,
                table_id:
                  table.raw
                    ? table.raw.table_id || null
                    : null,
                number:
                  table.number || null,
                source: dataUrl
              }
            );

            return false;
          }
        ).map(
          function (table) {
            return {
              id: table.dbTableId,
              table_id: table.dbTableId,

              floor_x:
                Math.round(table.x),

              floor_y:
                Math.round(table.y),

              floor_width:
                TABLE_WIDTH,

              floor_height:
                TABLE_HEIGHT
            };
          }
        );

      console.info(
        '[PMD Floor] Saving layout',
        {
          sequence: state.saveSequence,
          endpoint: layoutUrl,
          csrfFound: Boolean(
            document.querySelector(
              'meta[name="csrf-token"]'
            )
          ),
          tables: tables.length
        }
      );

      if (!tables.length) {
        state.saving = false;
        state.saveAttempted = false;

        saveControls.forEach(function (control) {
          control.disabled = false;
        });

        toast(
          'No tables have canonical database IDs',
          true
        );

        return Promise.resolve(null);
      }

      return fetchJson(
        layoutUrl,
        {
          method: 'POST',

          body:
            JSON.stringify({
              tables: tables
            })
        }
      )
        .then(function (payload) {
          /*
           * The POST endpoint is the authoritative Save result.
           *
           * Do not verify against GET /layout here because that
           * endpoint can return only a visible/context subset of
           * tables, causing false "missing table" errors.
           */
          if (
            !payload ||
            payload.ok === false
          ) {
            throw new Error(
              payload && payload.message
                ? payload.message
                : 'Floor layout could not be saved'
            );
          }

          if (
            payload.updated != null &&
            Number(payload.updated) < 1 &&
            tables.length
          ) {
            throw new Error(
              'Layout endpoint updated 0 tables'
            );
          }

          /*
           * Keep the original data payload synchronized so later
           * operational actions cannot restore old coordinates.
           */
          syncPayloadCoordinatesFromTables();

          toast(
            'Floor layout saved'
          );

          setEditing(false);

          window.dispatchEvent(
            new CustomEvent(
              'pmd:floor:updated',
              {
                detail: {
                  action:
                    'layout',

                  saved:
                    true,

                  updated:
                    payload.updated
                }
              }
            )
          );

          return payload;
        })
        .catch(function (error) {
          state.saveAttempted = false;

          toast(
            error.message,
            true
          );

          console.error(
            '[PMD Floor] Layout save failed',
            {
              sequence:
                state.saveSequence,
              endpoint: layoutUrl,
              csrfFound: Boolean(
                document.querySelector(
                  'meta[name="csrf-token"]'
                )
              ),
              status:
                error.status || null,
              response:
                error.responseBody ||
                error.message,
              error: error
            }
          );
        })
        .then(function (payload) {
          state.saving = false;

          saveControls.forEach(function (control) {
            control.disabled = false;
          });

          return payload;
        });
    }

    function load() {
      root.setAttribute(
        'aria-busy',
        'true'
      );

      if (loading) {
        loading.hidden = false;
      }

      return Promise.all([
        fetchJson(dataUrl),

        fetchJson(stateUrl)
          .catch(function () {
            return {
              state: {
                tables: {},
                merges: {}
              }
            };
          }),

        fetchJson(layoutUrl)
      ])
        .then(function (results) {
          var preservedReservationBusyWindows = reservationBusyWindows().slice();
          state.payload =
            results[0] || {};
          if (
            !Array.isArray(state.payload.pmd_reservation_busy_windows)
            && preservedReservationBusyWindows.length
          ) {
            state.payload.pmd_reservation_busy_windows = preservedReservationBusyWindows;
          }

          state.operational =
            results[1].state || {
              tables: {},
              merges: {}
            };

          state.tables =
            normalize(
              state.payload,
              results[2] || {}
            );

          /* PMD_FLOOR_RELOAD_EXTENT_SYNC_V1_4_7 */
          syncRealFullFloorBounds();

          render();
          scheduleReservationBusyBoundary();
          refreshReservationBusyWindows().then(function () {
            syncReservationBusyStatuses();
          });

          /*
           * Repair previously saved merged groups that overlap
           * another table or merged group.
           */
          repairAllMergedGroups()
            .catch(function (error) {
              console.warn(
                '[PMD Floor] Existing merged-group repair failed',
                error
              );
            });

          fit();
          state.initialized = true;
        })
        .catch(function (error) {
          if (loading) {
            loading.textContent =
              'Floor could not load: ' +
              error.message;
          }

          toast(
            error.message,
            true
          );
        });
    }

    function ensureStripButton() {
      var existing =
        root.querySelector(
          '[data-floor-strip]'
        );

      if (existing) {
        return existing;
      }

      var anchor =
        root.querySelector(
          '[data-floor-fullscreen]'
        ) ||
        root.querySelector(
          '[data-floor-fit]'
        );

      var toolbar =
        anchor
          ? anchor.parentElement
          : root.querySelector(
            '.pmd-floor-v1__toolbar'
          );

      if (!toolbar) {
        return null;
      }

      var button =
        document.createElement(
          'button'
        );

      button.type = 'button';

      button.className =
        'pmd-floor-v1__tool';

      button.setAttribute(
        'data-floor-strip',
        ''
      );

      button.setAttribute(
        'aria-pressed',
        'false'
      );

      button.setAttribute(
        'title',
        'Show tables in one short row'
      );

      button.innerHTML =
        '⇥ One row';

      if (anchor) {
        toolbar.insertBefore(
          button,
          anchor
        );
      } else {
        toolbar.appendChild(
          button
        );
      }

      return button;
    }

    function updateStripButton() {
      var button =
        ensureStripButton();

      if (!button) {
        return;
      }

      button.setAttribute(
        'aria-pressed',
        state.stripMode
          ? 'true'
          : 'false'
      );

      button.innerHTML =
        state.stripMode
          ? '↩ Floor'
          : '⇥ One row';

      button.setAttribute(
        'title',
        state.stripMode
          ? 'Return to saved Floor layout'
          : 'Show tables in one short row'
      );

      /* PMD_DASHBOARD_LAB_FIRST_PAINT_ADOPT_V2 */
      var serverBootPending =
        root.getAttribute(
          'data-pmd-floor-boot-source'
        ) === 'server' &&
        !state.initialized;

      if (!serverBootPending) {
        refreshFloorIcons();
        applyAreaFilter();
        calibrateOneRow();
      }
    }

    function setStripMode(value) {
      /*
       * Mark the next render as a structural layout transition.
       */
      state.transitionReason =
        'layout';

      var nextStripMode =
        !!value;

      var enteringStrip =
        nextStripMode &&
        !state.stripMode;

      var leavingStrip =
        !nextStripMode &&
        state.stripMode;

      /*
       * Capture the exact model coordinates before One row can
       * modify presentation styles.
       */
      if (enteringStrip) {
        captureCanonicalFullFloor();

        /*
         * Release only the Full Floor dimension authority before
         * One row renders. The existing One row engine then controls
         * its own width, height and scrolling exactly as before.
         */
        canvas.style.removeProperty(
          'width'
        );

        canvas.style.removeProperty(
          'min-width'
        );

        canvas.style.removeProperty(
          'height'
        );

        canvas.style.removeProperty(
          'min-height'
        );

        canvas.style.removeProperty(
          'transform-origin'
        );

        root.style.removeProperty(
          '--pmd-real-floor-width'
        );

        root.style.removeProperty(
          '--pmd-real-floor-height'
        );
      }

      state.stripMode =
        nextStripMode;

      state.mode = state.stripMode
        ? 'row'
        : 'full';

      var modeCookieName =
        root.getAttribute('data-floor-mode-cookie') || '';

      if (modeCookieName) {
        document.cookie =
          modeCookieName + '=' +
          encodeURIComponent(state.mode) +
          '; Path=/admin; Max-Age=31536000; SameSite=Lax';
      }

      state.zoom = state.stripMode
        ? state.rowScale
        : state.fullFloorZoom;

      if (state.stripMode) {
        /*
         * Strip mode is operational, not a layout editor.
         */
        setEditing(false);
      }

      /*
       * Restore into state.tables before render().
       *
       * Therefore Full Floor is correct on its first rendered frame,
       * rather than being corrected later by a timer.
       */
      if (leavingStrip) {
        /*
         * restoreCanonicalFullFloor() now restores both:
         * - exact table coordinates
         * - exact Full Floor dimensions
         *
         * Do not call syncRealFullFloorBounds() here because the
         * post-strip DOM still temporarily reports 560px height.
         */
        restoreCanonicalFullFloor();
      }

      root.classList.toggle(
        'is-strip-mode',
        state.stripMode
      );

      updateStripButton();
      render();

      fit();

      toast(
        state.stripMode
          ? 'One-row Floor view enabled'
          : 'Saved Floor layout restored'
      );

      queueFloorViewPreferenceSave(0);
    }

    function setEditing(value) {
      if (value && !state.editing) {
        state.saveAttempted = false;
      }

      state.editing = !!value;

      root.classList.toggle(
        'is-editing',
        state.editing
      );

      var edit =
        root.querySelector(
          '[data-floor-edit]'
        );

      var save =
        root.querySelector(
          '[data-floor-save]'
        );

      if (edit) {
        edit.setAttribute(
          'aria-pressed',
          state.editing
            ? 'true'
            : 'false'
        );
      }

      if (save) {
        save.hidden =
          !state.editing;
      }

      if (edit) {
        edit.hidden =
          state.editing;
      }
    }

    function updateMergeButton() {
      var button =
        root.querySelector(
          '[data-floor-merge]'
        );

      if (!button) {
        return;
      }

      button.setAttribute(
        'aria-pressed',
        state.mergeMode
          ? 'true'
          : 'false'
      );

      if (!state.mergeMode) {
        button.innerHTML =
          '↔ Merge';

        button.removeAttribute(
          'data-selection-count'
        );

        return;
      }

      var count =
        state.mergeSelection.length;

      button.setAttribute(
        'data-selection-count',
        String(count)
      );

      if (count >= 2) {
        button.innerHTML =
          'Merge ' +
          count +
          ' tables';
      } else {
        button.innerHTML =
          'Cancel merge';
      }

      refreshFloorIcons();
    }

    function setMergeMode(value) {
      state.mergeMode = !!value;

      /*
       * Edit and Merge are separate interaction modes.
       */
      if (
        state.mergeMode &&
        state.editing
      ) {
        setEditing(false);
      }

      if (!state.mergeMode) {
        state.mergeSelection = [];
      }

      updateMergeButton();
      render();

      if (state.mergeMode) {
        toast(
          'Select two or more tables, then click Merge again'
        );
      }
    }

    function cancelMergeMode() {
      if (!state.mergeMode) {
        return;
      }

      state.mergeSelection = [];
      setMergeMode(false);

      toast(
        'Merge cancelled'
      );
    }

    function commitMerge() {
      if (
        !state.mergeMode ||
        state.mergeSelection.length < 2
      ) {
        toast(
          'Select at least two tables',
          true
        );

        return;
      }

      var ids =
        state.mergeSelection.slice();

      state.transitionReason = null;

      /*
       * Merge renders directly at the final position.
       * This removes the brief structural jump/flicker.
       */

      saveOperational(
        'merge',
        {
          table_ids: ids
        }
      )
        .then(function () {
          /*
           * The backend merge now exists.
           * Move the complete merged group away from collisions
           * before rendering its single larger icon.
           */
          var repositioned =
            placeMergedGroupSafely(
              ids
            );

          if (repositioned) {
            return persistLayoutSilently();
          }

          return Promise.resolve();
        })
        .then(function () {
          state.mergeSelection = [];
          setMergeMode(false);

          render();

          toast(
            ids.length +
            ' tables merged and positioned safely'
          );
        })
        .catch(function (error) {
          toast(
            error.message,
            true
          );
        });
    }

    function displayTableById(id) {
      return state.displayTables
        .find(function (table) {
          return (
            String(table.id) ===
            String(id)
          );
        });
    }

    function openDrawer(table) {
      state.active = table;

      if (!drawer) return;

      drawer.classList.add(
        'is-open'
      );

      drawer.setAttribute(
        'aria-hidden',
        'false'
      );

      document.body.style.overflow =
        'hidden';

      var title =
        drawer.querySelector(
          '[data-floor-drawer-title]'
        );

      var summary =
        drawer.querySelector(
          '[data-floor-summary]'
        );

      var note =
        drawer.querySelector(
          '[data-floor-note]'
        );

      var mergeInfo =
        drawer.querySelector(
          '[data-floor-merge-info]'
        );

      if (title) {
        title.textContent =
          table.name;
      }

      if (summary) {
        summary.innerHTML =
          '<b>Status:</b> ' +
          escapeHtml(
            table.status.replace(
              '-',
              ' '
            )
          ) +

          '<br><b>Area:</b> ' +
          escapeHtml(table.area) +

          '<br><b>Capacity:</b> ' +
          (
            table.capacity || '—'
          ) +

          '<br><b>Open orders:</b> ' +
          table.openOrders;
      }

      if (note) {
        note.hidden =
          !table.note;

        note.textContent =
          table.note
            ? (
              'Note: ' +
              table.note
            )
            : '';
      }

      var merge =
        table.isMergedView
          ? {
            id: table.mergeId,
            table_ids:
              table.memberIds
          }
          : mergeFor(table.id);

      if (mergeInfo) {
        mergeInfo.hidden =
          !merge;

        mergeInfo.innerHTML =
          merge
            ? (
              'Merged group: ' +
              merge.table_ids
                .map(escapeHtml)
                .join(', ') +

              '<br><button ' +
              'type="button" ' +
              'class="pmd-floor-v1__unmerge-button" ' +
              'data-floor-unmerge="' +
              escapeHtml(merge.id) +
              '">' +
              '↪ Unmerge tables</button>'
            )
            : '';
      }
    }

    function closeDrawer() {
      if (!drawer) return;

      drawer.classList.remove(
        'is-open'
      );

      drawer.setAttribute(
        'aria-hidden',
        'true'
      );

      document.body.style.overflow =
        '';

      state.active = null;
    }

    function selectForMerge(table) {
      if (
        !table ||
        !state.mergeMode
      ) {
        return;
      }

      /*
       * Expand an existing merged card into its real member IDs.
       *
       * Example:
       *   selected card: 4 + 5 + 16
       *   selected table: 17
       *
       * mergeSelection becomes:
       *   [4, 5, 16, 17]
       *
       * This prevents nested parent groups and keeps the backend
       * payload as one flat list of real table IDs.
       */
      var ids =
        table.isMergedView
          ? (
              Array.isArray(
                table.memberIds
              )
                ? table.memberIds
                : []
            )
          : [table.id];

      ids = ids
        .map(String)
        .filter(Boolean);

      if (!ids.length) {
        toast(
          'This merged group has no table members',
          true
        );
        return;
      }

      var allSelected =
        ids.every(function (id) {
          return (
            state.mergeSelection
              .map(String)
              .indexOf(id) !== -1
          );
        });

      if (allSelected) {
        state.mergeSelection =
          state.mergeSelection.filter(
            function (selectedId) {
              return (
                ids.indexOf(
                  String(selectedId)
                ) === -1
              );
            }
          );
      } else {
        ids.forEach(function (id) {
          var exists =
            state.mergeSelection
              .map(String)
              .indexOf(id) !== -1;

          if (!exists) {
            state.mergeSelection.push(id);
          }
        });
      }

      updateMergeButton();
      render();

      var count =
        state.mergeSelection.length;

      if (!count) {
        toast(
          'No tables selected for merge'
        );
        return;
      }

      if (table.isMergedView) {
        toast(
          allSelected
            ? 'Merged group removed from selection'
            : (
                ids.length +
                ' merged tables selected — choose more tables'
              )
        );

        return;
      }

      toast(
        count +
        (
          count === 1
            ? ' table selected — choose another table'
            : ' tables selected — click Merge to confirm'
        )
      );
    }

    function dimensions(table) {
      if (table.isMergedView) {
        return {
          width:
            state.stripMode
              ? STRIP_MERGED_WIDTH
              : MERGED_WIDTH,

          height:
            state.stripMode
              ? STRIP_MERGED_HEIGHT
              : MERGED_HEIGHT
        };
      }

      return {
        width: TABLE_WIDTH,
        height: TABLE_HEIGHT
      };
    }

    function rectFor(table) {
      var size =
        dimensions(table);

      return {
        table: table,

        x: Number(table.x),
        y: Number(table.y),

        width: size.width,
        height: size.height,

        left:
          Number(table.x) -
          size.width / 2,

        right:
          Number(table.x) +
          size.width / 2,

        top:
          Number(table.y) -
          size.height / 2,

        bottom:
          Number(table.y) +
          size.height / 2
      };
    }

    function obstacleRects(
      movingTable
    ) {
      var excluded = {};

      if (
        movingTable.isMergedView
      ) {
        movingTable.memberIds
          .forEach(function (id) {
            excluded[id] = true;
          });
      } else {
        excluded[movingTable.id] =
          true;
      }

      return state.displayTables
        .filter(function (table) {
          if (
            table.isMergedView
          ) {
            return !table.memberIds
              .some(function (id) {
                return !!excluded[id];
              });
          }

          return !excluded[table.id];
        })
        .map(rectFor);
    }

    function overlaps(
      first,
      second,
      gap
    ) {
      var halfGap =
        number(gap, 0) / 2;

      return !(
        first.right + halfGap <=
          second.left - halfGap ||

        first.left - halfGap >=
          second.right + halfGap ||

        first.bottom + halfGap <=
          second.top - halfGap ||

        first.top - halfGap >=
          second.bottom + halfGap
      );
    }

    function candidateRect(
      candidate
    ) {
      return {
        left:
          candidate.x -
          candidate.width / 2,

        right:
          candidate.x +
          candidate.width / 2,

        top:
          candidate.y -
          candidate.height / 2,

        bottom:
          candidate.y +
          candidate.height / 2
      };
    }

    function legalPosition(
      candidate,
      obstacles
    ) {
      var bounds =
        candidateRect(candidate);

      var inside =
        bounds.left >=
          EDGE_PADDING &&

        bounds.top >=
          EDGE_PADDING &&

        bounds.right <=
          FLOOR_WIDTH -
          EDGE_PADDING &&

        bounds.bottom <=
          FLOOR_HEIGHT -
          EDGE_PADDING;

      if (!inside) {
        return false;
      }

      return !obstacles.some(
        function (obstacle) {
          return overlaps(
            bounds,
            obstacle,
            MINIMUM_GAP
          );
        }
      );
    }

    function nearestSnap(
      original,
      candidates
    ) {
      var result = {
        value: original,
        snapped: false,
        distance: Infinity
      };

      candidates.forEach(
        function (candidate) {
          var distance =
            Math.abs(
              candidate - original
            );

          if (
            distance <=
              SNAP_DISTANCE &&
            distance <
              result.distance
          ) {
            result = {
              value: candidate,
              snapped: true,
              distance: distance
            };
          }
        }
      );

      return result;
    }

    function magneticPosition(
      raw,
      size,
      obstacles
    ) {
      var result = {
        x: raw.x,
        y: raw.y,

        width: size.width,
        height: size.height,

        snappedX: false,
        snappedY: false
      };

      if (!obstacles.length) {
        return result;
      }

      /*
       * Only the closest table influences magnetic snapping.
       */
      var closest = null;
      var closestDistance = Infinity;

      obstacles.forEach(
        function (obstacle) {
          var deltaX =
            raw.x - obstacle.x;

          var deltaY =
            raw.y - obstacle.y;

          var distance =
            deltaX * deltaX +
            deltaY * deltaY;

          if (
            distance <
            closestDistance
          ) {
            closest = obstacle;
            closestDistance = distance;
          }
        }
      );

      if (!closest) {
        return result;
      }

      /*
       * Centre alignment only:
       *
       * Same X centre creates a clean vertical column.
       * Same Y centre creates a clean horizontal row.
       */
      if (
        Math.abs(
          raw.x - closest.x
        ) <= SNAP_DISTANCE
      ) {
        result.x = closest.x;
        result.snappedX = true;
      }

      if (
        Math.abs(
          raw.y - closest.y
        ) <= SNAP_DISTANCE
      ) {
        result.y = closest.y;
        result.snappedY = true;
      }

      return result;
    }

    function distanceSquared(
      first,
      second
    ) {
      var x =
        first.x - second.x;

      var y =
        first.y - second.y;

      return x * x + y * y;
    }

    function nearestLegalPosition(
      desired,
      size,
      obstacles
    ) {
      var candidates = [];

      obstacles.forEach(
        function (obstacle) {
          var leftX =
            obstacle.left -
            MINIMUM_GAP -
            size.width / 2;

          var rightX =
            obstacle.right +
            MINIMUM_GAP +
            size.width / 2;

          var aboveY =
            obstacle.top -
            MINIMUM_GAP -
            size.height / 2;

          var belowY =
            obstacle.bottom +
            MINIMUM_GAP +
            size.height / 2;

          candidates.push(
            {
              x: leftX,
              y: obstacle.y
            },

            {
              x: rightX,
              y: obstacle.y
            },

            {
              x: obstacle.x,
              y: aboveY
            },

            {
              x: obstacle.x,
              y: belowY
            },

            {
              x: leftX,
              y: desired.y
            },

            {
              x: rightX,
              y: desired.y
            },

            {
              x: desired.x,
              y: aboveY
            },

            {
              x: desired.x,
              y: belowY
            }
          );
        }
      );

      return candidates
        .map(function (candidate) {
          return {
            x: candidate.x,
            y: candidate.y,

            width: size.width,
            height: size.height
          };
        })
        .filter(function (candidate) {
          return legalPosition(
            candidate,
            obstacles
          );
        })
        .sort(function (
          first,
          second
        ) {
          return (
            distanceSquared(
              first,
              desired
            ) -
            distanceSquared(
              second,
              desired
            )
          );
        })[0] || null;
    }

    function updateMemberPositions(
      drag,
      centerX,
      centerY
    ) {
      var deltaX =
        centerX -
        drag.startCenter.x;

      var deltaY =
        centerY -
        drag.startCenter.y;

      drag.memberStarts
        .forEach(function (item) {
          item.table.x =
            item.x + deltaX;

          item.table.y =
            item.y + deltaY;
        });

      drag.table.x = centerX;
      drag.table.y = centerY;
    }

    function pointerDown(
      event,
      table
    ) {
      if (
        !state.editing ||
        state.stripMode
      ) {
        return;
      }

      /*
       * Ensure all existing clamps and legal-position checks use
       * the complete visible floor before dragging begins.
       */
      syncRealFullFloorBounds();

      event.preventDefault();

      var rect =
        canvas.getBoundingClientRect();

      var memberTables =
        table.isMergedView
          ? table.members
          : [
            state.tables.find(
              function (candidate) {
                return (
                  candidate.id ===
                  table.id
                );
              }
            )
          ].filter(Boolean);

      state.drag = {
        table: table,

        pointerId:
          event.pointerId,

        offsetX:
          (
            event.clientX -
            rect.left
          ) /
            state.zoom -
          table.x,

        offsetY:
          (
            event.clientY -
            rect.top
          ) /
            state.zoom -
          table.y,

        startCenter: {
          x: table.x,
          y: table.y
        },

        memberStarts:
          memberTables.map(
            function (member) {
              return {
                table: member,
                x: member.x,
                y: member.y
              };
            }
          ),

        lastRaw: {
          x: table.x,
          y: table.y
        }
      };

      event.currentTarget
        .setPointerCapture(
          event.pointerId
        );

      event.currentTarget
        .classList.add(
          'is-dragging'
        );
    }

    function pointerMove(event) {
      if (!state.drag) {
        return;
      }

      syncRealFullFloorBounds();

      var rect =
        canvas.getBoundingClientRect();

      var table =
        state.drag.table;

      var size =
        dimensions(table);

      var raw = {
        x: clamp(
          (
            event.clientX -
            rect.left
          ) /
            state.zoom -
          state.drag.offsetX,

          size.width / 2 +
            EDGE_PADDING,

          FLOOR_WIDTH -
            size.width / 2 -
            EDGE_PADDING
        ),

        y: clamp(
          (
            event.clientY -
            rect.top
          ) /
            state.zoom -
          state.drag.offsetY,

          size.height / 2 +
            EDGE_PADDING,

          FLOOR_HEIGHT -
            size.height / 2 -
            EDGE_PADDING
        )
      };

      var obstacles =
        obstacleRects(table);

      /*
       * Magnetic alignment still works while dragging.
       * Overlap is intentionally allowed during movement.
       */
      var candidate =
        magneticPosition(
          raw,
          size,
          obstacles
        );

      state.drag.lastRaw = {
        x: candidate.x,
        y: candidate.y
      };

      updateMemberPositions(
        state.drag,
        candidate.x,
        candidate.y
      );

      var node =
        canvas.querySelector(
          '[data-floor-table="' +
          CSS.escape(table.id) +
          '"]'
        );

      if (node) {
        node.style.left =
          candidate.x + 'px';

        node.style.top =
          candidate.y + 'px';
      }

    }

    function pointerUp(event) {
      if (!state.drag) {
        return;
      }

      var drag =
        state.drag;

      var table =
        drag.table;

      var size =
        dimensions(table);

      var obstacles =
        obstacleRects(table);

      var desired = {
        x: drag.lastRaw.x,
        y: drag.lastRaw.y,

        width: size.width,
        height: size.height
      };

      var resolved =
        legalPosition(
          desired,
          obstacles
        )
          ? desired
          : nearestLegalPosition(
            desired,
            size,
            obstacles
          );

      if (!resolved) {
        resolved = {
          x: drag.startCenter.x,
          y: drag.startCenter.y,

          width: size.width,
          height: size.height
        };
      }

      updateMemberPositions(
        drag,
        resolved.x,
        resolved.y
      );

      var node =
        canvas.querySelector(
          '[data-floor-table="' +
          CSS.escape(table.id) +
          '"]'
        );

      if (node) {
        node.classList.remove(
          'is-dragging'
        );

        node.classList.add(
          'is-settling'
        );

        node.style.left =
          resolved.x + 'px';

        node.style.top =
          resolved.y + 'px';

        setTimeout(function () {
          if (node.isConnected) {
            node.classList.remove(
              'is-settling'
            );
          }
        }, 230);
      }

      state.drag = null;
    }

    function mergedGroupDescriptor(
      memberIds
    ) {
      var wanted = {};

      (memberIds || []).forEach(
        function (id) {
          wanted[String(id)] = true;
        }
      );

      var members =
        state.tables.filter(
          function (table) {
            return (
              wanted[
                String(table.id)
              ] === true
            );
          }
        );

      if (!members.length) {
        return null;
      }

      var centerX =
        members.reduce(
          function (total, table) {
            return total + Number(table.x);
          },
          0
        ) / members.length;

      var centerY =
        members.reduce(
          function (total, table) {
            return total + Number(table.y);
          },
          0
        ) / members.length;

      return {
        members: members,

        memberIds:
          members.map(
            function (table) {
              return table.id;
            }
          ),

        x: centerX,
        y: centerY,

        width: MERGED_WIDTH,
        height: MERGED_HEIGHT
      };
    }

    function mergedGroupObstacles(
      memberIds
    ) {
      var excluded = {};

      (memberIds || []).forEach(
        function (id) {
          excluded[String(id)] = true;
        }
      );

      buildDisplayTables();

      return state.displayTables
        .filter(function (table) {
          if (table.isMergedView) {
            return !table.memberIds.some(
              function (id) {
                return (
                  excluded[String(id)] ===
                  true
                );
              }
            );
          }

          return (
            excluded[
              String(table.id)
            ] !== true
          );
        })
        .map(rectFor);
    }

    function rowScanLegalPosition(
      size,
      obstacles,
      preferred
    ) {
      var candidates = [];

      for (
        var y =
          size.height / 2 +
          EDGE_PADDING;

        y <=
          FLOOR_HEIGHT -
          size.height / 2 -
          EDGE_PADDING;

        y +=
          TABLE_HEIGHT +
          MINIMUM_GAP
      ) {
        for (
          var x =
            size.width / 2 +
            EDGE_PADDING;

          x <=
            FLOOR_WIDTH -
            size.width / 2 -
            EDGE_PADDING;

          x +=
            TABLE_WIDTH +
            MINIMUM_GAP
        ) {
          var candidate = {
            x: x,
            y: y,

            width: size.width,
            height: size.height
          };

          if (
            legalPosition(
              candidate,
              obstacles
            )
          ) {
            candidates.push(
              candidate
            );
          }
        }
      }

      candidates.sort(
        function (first, second) {
          return (
            distanceSquared(
              first,
              preferred
            ) -
            distanceSquared(
              second,
              preferred
            )
          );
        }
      );

      return candidates[0] || null;
    }

    function placeMergedGroupSafely(
      memberIds
    ) {
      var group =
        mergedGroupDescriptor(
          memberIds
        );

      if (!group) {
        return false;
      }

      var obstacles =
        mergedGroupObstacles(
          group.memberIds
        );

      var desired = {
        x: group.x,
        y: group.y,

        width: MERGED_WIDTH,
        height: MERGED_HEIGHT
      };

      var resolved = desired;

      if (
        !legalPosition(
          desired,
          obstacles
        )
      ) {
        resolved =
          nearestLegalPosition(
            desired,
            {
              width: MERGED_WIDTH,
              height: MERGED_HEIGHT
            },
            obstacles
          ) ||
          rowScanLegalPosition(
            {
              width: MERGED_WIDTH,
              height: MERGED_HEIGHT
            },
            obstacles,
            desired
          );
      }

      if (!resolved) {
        return false;
      }

      var deltaX =
        resolved.x - group.x;

      var deltaY =
        resolved.y - group.y;

      if (
        Math.abs(deltaX) < .5 &&
        Math.abs(deltaY) < .5
      ) {
        return false;
      }

      group.members.forEach(
        function (table) {
          table.x += deltaX;
          table.y += deltaY;
        }
      );

      return true;
    }

    function repairAllMergedGroups() {
      var merges =
        state.operational.merges || {};

      var changed = false;

      Object.keys(merges).forEach(
        function (mergeId) {
          var merge =
            merges[mergeId] || {};

          var memberIds =
            Array.isArray(
              merge.table_ids
            )
              ? merge.table_ids
              : [];

          if (
            memberIds.length >= 2 &&
            placeMergedGroupSafely(
              memberIds
            )
          ) {
            changed = true;
          }
        }
      );

      if (changed) {
        render();

        return persistLayoutSilently();
      }

      return Promise.resolve();
    }

    function layoutPayload() {
      return state.tables.map(
        function (table) {
          return {
            id: table.id,
            table_id: table.id,

            floor_x:
              Math.round(table.x),

            floor_y:
              Math.round(table.y),

            floor_width:
              TABLE_WIDTH,

            floor_height:
              TABLE_HEIGHT
          };
        }
      );
    }

    function persistLayoutSilently() {
      var tables =
        layoutPayload();

      return fetchJson(
        layoutUrl,
        {
          method: 'POST',

          body:
            JSON.stringify({
              tables: tables
            })
        }
      ).then(function (payload) {
        if (
          payload &&
          payload.updated != null &&
          Number(payload.updated) < 1 &&
          tables.length
        ) {
          throw new Error(
            'Silent layout persistence updated 0 tables'
          );
        }

        /*
         * This is especially important after automatic
         * merged-group collision repair.
         */
        syncPayloadCoordinatesFromTables();

        return payload;
      });
    }

    function repairUnmergedMembers(
      memberIds
    ) {
      var wanted = {};

      (memberIds || [])
        .forEach(function (id) {
          wanted[String(id)] = true;
        });

      var targets =
        state.tables
          .filter(function (table) {
            return (
              wanted[
                String(table.id)
              ] === true
            );
          })
          .sort(function (
            first,
            second
          ) {
            return (
              Number(first.number) -
              Number(second.number)
            );
          });

      if (!targets.length) {
        return false;
      }

      /*
       * Collision repair must use normal saved Floor geometry,
       * even when the user is currently viewing Strip mode.
       */
      var stripWasActive =
        state.stripMode;

      state.stripMode = false;
      buildDisplayTables();

      var changed = false;

      targets.forEach(
        function (table) {
          /*
           * Rebuild current visible obstacles after each move.
           * Existing merged groups remain one obstacle card.
           */
          buildDisplayTables();

          var obstacles =
            state.displayTables
              .filter(function (display) {
                if (
                  display.isMergedView
                ) {
                  return (
                    display.memberIds
                      .indexOf(
                        table.id
                      ) === -1
                  );
                }

                return (
                  display.id !==
                  table.id
                );
              })
              .map(rectFor);

          var size = {
            width: TABLE_WIDTH,
            height: TABLE_HEIGHT
          };

          var desired = {
            x: table.x,
            y: table.y,

            width: size.width,
            height: size.height
          };

          if (
            !legalPosition(
              desired,
              obstacles
            )
          ) {
            var resolved =
              nearestLegalPosition(
                desired,
                size,
                obstacles
              );

            if (!resolved) {
              /*
               * Deterministic row scan fallback.
               */
              var found = null;

              for (
                var y =
                  TABLE_HEIGHT / 2 +
                  EDGE_PADDING;

                y <=
                  FLOOR_HEIGHT -
                  TABLE_HEIGHT / 2 -
                  EDGE_PADDING &&
                !found;

                y +=
                  TABLE_HEIGHT +
                  MINIMUM_GAP
              ) {
                for (
                  var x =
                    TABLE_WIDTH / 2 +
                    EDGE_PADDING;

                  x <=
                    FLOOR_WIDTH -
                    TABLE_WIDTH / 2 -
                    EDGE_PADDING;

                  x +=
                    TABLE_WIDTH +
                    MINIMUM_GAP
                ) {
                  var candidate = {
                    x: x,
                    y: y,

                    width:
                      TABLE_WIDTH,

                    height:
                      TABLE_HEIGHT
                  };

                  if (
                    legalPosition(
                      candidate,
                      obstacles
                    )
                  ) {
                    found = candidate;
                    break;
                  }
                }
              }

              resolved = found;
            }

            if (resolved) {
              table.x = resolved.x;
              table.y = resolved.y;

              changed = true;
            }
          }
        }
      );

      state.stripMode =
        stripWasActive;

      render();

      return changed;
    }

    function ensureOfficialTablerKit() {
      var id =
        'pmd-official-tabler-icons';

      if (
        document.getElementById(id)
      ) {
        return;
      }

      var link =
        document.createElement('link');

      link.id = id;
      link.rel = 'stylesheet';

      link.href =
        '/app/admin/assets/vendor/' +
        'tabler-icons/' +
        'tabler-icons.min.css' +
        '?v=3.44.0';

      document.head.appendChild(link);
    }

    /* PMD_FLUENT_BADGE_ICONS_V284_START */
    var fluentBadgeIcons = {
      "wash": "<svg class=\"pmd-tabler-icon pmd-fluent-badge-icon\" aria-hidden=\"true\" focusable=\"false\" viewBox=\"0 0 20 20\" xmlns=\"http://www.w3.org/2000/svg\"><path d=\"M18.2 2.18a.5.5 0 0 1 .7.7L13.6 8.22a4.5 4.5 0 0 1-.34 6l-.66.66-2.1 3.48a.5.5 0 0 1-.77.1l-5.1-5.1c.04-.07.08-.14.1-.22l.02-.02.24-.76.02-.04 4.97 4.98 1.6-2.66-4.7-4.7-.06-.1-.05-.08-.06-.08a1.3 1.3 0 0 0-.57-.4l-.05-.01h-.02l-.7-.24.86-.52.67-.66a4.5 4.5 0 0 1 5.99-.34l5.32-5.32Zm-5.66 6.37a3.5 3.5 0 0 0-4.94 0l-.36.35 4.95 4.95.35-.35a3.5 3.5 0 0 0 0-4.95ZM3.48 8a.3.3 0 0 1 .29.2l.25.77a1.58 1.58 0 0 0 1 1l.18.05.28.1.3.1h.02a.3.3 0 0 1 .2.28.3.3 0 0 1-.2.29l-.77.25a1.58 1.58 0 0 0-1 1l-.24.76a.3.3 0 0 1-.58 0l-.24-.77a1.58 1.58 0 0 0-1-1l-.77-.25a.3.3 0 0 1-.2-.28.3.3 0 0 1 .2-.29l.77-.25a1.58 1.58 0 0 0 .98-1l.25-.76a.3.3 0 0 1 .28-.2Zm2-8a.42.42 0 0 1 .4.28l.35 1.07a2.2 2.2 0 0 0 1.4 1.4l1.07.35h.02a.42.42 0 0 1 0 .8l-1.07.35a2.2 2.2 0 0 0-1.4 1.4L5.9 6.72a.42.42 0 0 1-.64.2l-.02-.01a.43.43 0 0 1-.14-.2l-.35-1.06a2.2 2.2 0 0 0-1.4-1.4L2.28 3.9a.42.42 0 0 1 0-.8l1.07-.35a2.21 2.21 0 0 0 1.38-1.4L5.08.28a.42.42 0 0 1 .4-.28Z\"/></svg>",
      "bell-ringing": "<svg class=\"pmd-tabler-icon pmd-fluent-badge-icon\" aria-hidden=\"true\" focusable=\"false\" viewBox=\"0 0 20 20\" xmlns=\"http://www.w3.org/2000/svg\"><path d=\"M1.8 2.1a.5.5 0 1 0-.6.8l2 1.5a.5.5 0 1 0 .6-.8l-2-1.5ZM1 7a.5.5 0 0 0 0 1h1.5a.5.5 0 0 0 0-1H1Zm9-5a5.92 5.92 0 0 1 5.98 5.35l.02.23V11.4l.92 2.22a1 1 0 0 1 .06.17l.01.08.01.13a1 1 0 0 1-.75.97l-.11.02L16 15h-3.5v.16a2.5 2.5 0 0 1-5 0V15H4a1 1 0 0 1-.26-.03l-.13-.04a1 1 0 0 1-.6-1.05l.02-.13.05-.13L4 11.4V7.57A5.9 5.9 0 0 1 10 2Zm1.5 13h-3v.14a1.5 1.5 0 0 0 1.36 1.35l.14.01c.78 0 1.42-.6 1.5-1.36V15ZM10 3a4.9 4.9 0 0 0-4.98 4.38L5 7.6V11.5l-.04.2L4 14h12l-.96-2.3-.04-.2V7.61A4.9 4.9 0 0 0 10 3Zm8.9-.8a.5.5 0 0 0-.7-.1l-2 1.5a.5.5 0 0 0 .6.8l2-1.5a.5.5 0 0 0 .1-.7Zm.6 5.3A.5.5 0 0 0 19 7h-1.5a.5.5 0 0 0 0 1H19a.5.5 0 0 0 .5-.5Z\"/></svg>",
      "message-2": "<svg class=\"pmd-tabler-icon pmd-fluent-badge-icon\" aria-hidden=\"true\" focusable=\"false\" viewBox=\"0 0 20 20\" xmlns=\"http://www.w3.org/2000/svg\"><path d=\"M14.5 3A2.5 2.5 0 0 1 17 5.5V10h-1V7H4v7.5c0 .83.67 1.5 1.5 1.5H9v1H5.5A2.5 2.5 0 0 1 3 14.5v-9A2.5 2.5 0 0 1 5.5 3h9Zm0 1h-9C4.67 4 4 4.67 4 5.5V6h12v-.5c0-.83-.67-1.5-1.5-1.5ZM10 12.5c0-.83.67-1.5 1.5-1.5h6c.83 0 1.5.67 1.5 1.5v5c0 .83-.67 1.5-1.5 1.5h-6a1.5 1.5 0 0 1-1.5-1.5v-5Zm7 4a.5.5 0 0 0-.5-.5h-4a.5.5 0 0 0 0 1h4a.5.5 0 0 0 .5-.5ZM12.5 13a.5.5 0 0 0 0 1h4a.5.5 0 0 0 0-1h-4Z\"/></svg>",
      "arrows-join-2": "<svg class=\"pmd-tabler-icon pmd-fluent-badge-icon\" aria-hidden=\"true\" focusable=\"false\" viewBox=\"0 0 20 20\" xmlns=\"http://www.w3.org/2000/svg\"><path d=\"M3 5.5c0-.28.22-.5.5-.5h1.65c1 0 1.95.43 2.62 1.17l2.2 2.5a2.5 2.5 0 0 0 1.88.83h4.44l-3.64-3.65a.5.5 0 0 1 .7-.7l4.5 4.5c.2.2.2.5 0 .7l-4.5 4.5a.5.5 0 0 1-.7-.7l3.64-3.65h-4.44c-.72 0-1.4.3-1.87.84l-2.21 2.49A3.5 3.5 0 0 1 5.15 15H3.5a.5.5 0 0 1 0-1h1.65c.72 0 1.4-.3 1.87-.84l2.21-2.49c.24-.26.51-.49.81-.67a3.5 3.5 0 0 1-.8-.67l-2.22-2.5A2.5 2.5 0 0 0 5.15 6H3.5a.5.5 0 0 1-.5-.5Z\"/></svg>"
    };
    /* PMD_FLUENT_BADGE_ICONS_V284_END */
    function tablerIcon(
      name,
      size
    ) {
      ensureOfficialTablerKit();

      var aliases = {
        info:
          'info-circle',

        edit:
          'edit',

        check:
          'circle-check',

        cleaning:
          'wash',

        reserved:
          'calendar-clock',

        bell:
          'bell-ringing',

        note:
          'message-2',

        plus:
          'plus',

        merge:
          'arrows-join-2',

        unmerge:
          'arrows-split',

        zoomOut:
          'zoom-out',

        zoomIn:
          'zoom-in',

        fit:
          'focus-centered',

        rows:
          'layout-rows',

        layout:
          'layout-grid',

        fullscreen:
          'maximize',

        refresh:
          'refresh',

        external:
          'door-enter'
      };

      var iconName =
        aliases[name] || name;

      /*
       * Only these four table Badge icons use Microsoft
       * Fluent SVGs. All other Floor icons remain Tabler.
       */
      if (
        fluentBadgeIcons[iconName]
      ) {
        return (
          fluentBadgeIcons[
            iconName
          ]
        );
      }

      return (
        '<i ' +
        'class="' +
        'ti ti-' +
        escapeHtml(iconName) +
        ' pmd-tabler-icon" ' +

        'style="' +
        '--pmd-icon-size:' +
        Number(size || 18) +
        'px" ' +

        'aria-hidden="true">' +
        '</i>'
      );
    }

    function buttonContent(
      icon,
      label
    ) {
      return (
        tablerIcon(icon, 17) +
        (
          label
            ? (
              '<span class="' +
              'pmd-floor-button-label">' +
              escapeHtml(label) +
              '</span>'
            )
            : ''
        )
      );
    }

    function refreshFloorIcons() {
      var motherIcons = {
        available: ['check', 'Available'],
        cleaning: ['cleaning', 'Cleaning'],
        reserved: ['reserved', 'Reserved'],
        'waiter-call': ['bell', 'Waiter call'],
        note: ['note', 'Note'],
        order: ['external', 'Open table'],
        unmerge: ['unmerge', 'Unmerge']
      };

      root
        .querySelectorAll(
          '[data-floor-mother-action]'
        )
        .forEach(function (button) {
          var action =
            button.getAttribute(
              'data-floor-mother-action'
            );

          var config =
            motherIcons[action];

          if (config) {
            button.innerHTML =
              buttonContent(
                config[0],
                config[1]
              );
          }
        });

      var simpleControls = [
        ['[data-floor-edit]', 'edit', 'Edit'],
        ['[data-floor-save]', 'check', 'Save'],
        ['[data-floor-zoom-out]', 'zoomOut', ''],
        ['[data-floor-fit]', 'fit', ''],
        ['[data-floor-zoom-in]', 'zoomIn', ''],
        ['[data-floor-fullscreen]', 'fullscreen', ''],
        ['[data-floor-refresh]', 'refresh', '']
      ];

      simpleControls.forEach(
        function (config) {
          var button =
            root.querySelector(
              config[0]
            );

          if (button) {
            button.innerHTML =
              buttonContent(
                config[1],
                config[2]
              );
          }
        }
      );

      var stripButton =
        root.querySelector(
          '[data-floor-strip]'
        );

      if (stripButton) {
        stripButton.innerHTML =
          buttonContent(
            state.stripMode
              ? 'layout'
              : 'rows',

            state.stripMode
              ? 'Floor'
              : 'One row'
          );
      }

      var mergeButton =
        root.querySelector(
          '[data-floor-merge]'
        );

      if (mergeButton) {
        var count =
          state.mergeSelection.length;

        var label =
          state.mergeMode
            ? (
              count >= 2
                ? (
                  'Merge ' +
                  count +
                  ' tables'
                )
                : 'Cancel merge'
            )
            : 'Merge';

        mergeButton.innerHTML =
          buttonContent(
            state.mergeMode
              ? 'check'
              : 'merge',

            label
          );
      }

      canvas
        .querySelectorAll(
          '.pmd-floor-v1__badge'
        )
        .forEach(function (badge) {
          if (
            badge.classList.contains(
              'is-merge'
            )
          ) {
            badge.innerHTML =
              tablerIcon('merge', 13);
          } else if (
            badge.classList.contains(
              'is-call'
            )
          ) {
            badge.innerHTML =
              tablerIcon('bell', 13);
          } else if (
            badge.classList.contains(
              'is-note'
            )
          ) {
            badge.innerHTML =
              tablerIcon('note', 13);
          } else if (
            badge.classList.contains(
              'is-clean'
            )
          ) {
            badge.innerHTML =
              tablerIcon(
                'cleaning',
                13
              );
          }
        });
    }

    function selectedDisplayTable() {
      if (!state.selectedDisplayId) {
        return null;
      }

      return state.displayTables.find(
        function (table) {
          return (
            String(table.id) ===
            String(
              state.selectedDisplayId
            )
          );
        }
      ) || null;
    }

    function selectedTargetIds() {
      var table =
        selectedDisplayTable();

      if (!table) {
        return [];
      }

      return table.isMergedView
        ? table.memberIds.slice()
        : [table.id];
    }

    function selectedIsMerged() {
      var table =
        selectedDisplayTable();

      return Boolean(
        table &&
        table.isMergedView
      );
    }

    function normalizeAreaName(value) {
      var result =
        clean(value || '');

      return result || 'Main Floor';
    }

    function tableAreaName(table) {
      if (!table) {
        return 'Main Floor';
      }

      var candidates = [
        table.areaName,
        table.area_name,
        table.area,
        table.sectionName,
        table.section_name,
        table.section,
        table.locationName,
        table.location_name,
        table.zoneName,
        table.zone_name,
        table.floorName,
        table.floor_name
      ];

      for (
        var index = 0;
        index < candidates.length;
        index += 1
      ) {
        var candidate =
          candidates[index];

        if (
          candidate &&
          typeof candidate === 'object'
        ) {
          candidate =
            candidate.name ||
            candidate.title ||
            candidate.label;
        }

        candidate =
          clean(candidate || '');

        if (candidate) {
          return candidate;
        }
      }

      return 'Main Floor';
    }

    function tableById(id) {
      return state.tables.find(
        function (table) {
          return (
            String(table.id) ===
            String(id)
          );
        }
      ) || null;
    }

    function availableAreas() {
      var counters = {};

      state.tables.forEach(
        function (table) {
          var area =
            tableAreaName(table);

          counters[area] =
            (counters[area] || 0) + 1;
        }
      );

      return Object.keys(counters)
        .sort(function (first, second) {
          return first.localeCompare(
            second,
            undefined,
            {
              numeric: true,
              sensitivity: 'base'
            }
          );
        })
        .map(function (name) {
          return {
            name: name,
            count: counters[name]
          };
        });
    }

    function selectedAreaStillExists(
      areas
    ) {
      if (
        state.selectedArea === 'all'
      ) {
        return true;
      }

      return areas.some(
        function (area) {
          return (
            area.name ===
            state.selectedArea
          );
        }
      );
    }

    function renderAreaTabs() {
      var group =
        root.querySelector(
          '.pmd-floor-v1__filters'
        );

      if (!group) {
        return;
      }

      var areas =
        availableAreas();

      if (
        !selectedAreaStillExists(
          areas
        )
      ) {
        state.selectedArea = 'all';
      }

      group.setAttribute(
        'aria-label',
        'Select restaurant area'
      );

      group.classList.add(
        'is-area-selector'
      );

      var html = '';

      if (areas.length > 1) {
        html +=
          '<button type="button" ' +
          'data-floor-area="all" ' +
          (
            state.selectedArea === 'all'
              ? 'class="is-active" '
              : ''
          ) +
          '>' +
          tablerIcon('layout', 16) +
          '<span>All areas</span>' +
          '<b>' +
          state.tables.length +
          '</b>' +
          '</button>';
      }

      areas.forEach(
        function (area) {
          html +=
            '<button type="button" ' +
            'data-floor-area="' +
            escapeHtml(area.name) +
            '" ' +
            (
              (
                state.selectedArea ===
                  area.name
              ) ||
              (
                areas.length === 1 &&
                state.selectedArea ===
                  'all'
              )
                ? 'class="is-active" '
                : ''
            ) +
            '>' +
            tablerIcon(
              area.name
                .toLowerCase()
                .indexOf('outdoor') !== -1
                ? 'sun'
                : (
                  area.name
                    .toLowerCase()
                    .indexOf('indoor') !== -1
                    ? 'building'
                    : 'layout'
                ),
              16
            ) +
            '<span>' +
            escapeHtml(area.name) +
            '</span>' +
            '<b>' +
            area.count +
            '</b>' +
            '</button>';
        }
      );

      group.innerHTML = html;
    }

    function cardMemberIds(node) {
      var members =
        clean(
          node.getAttribute(
            'data-floor-members'
          ) || ''
        )
          .split(',')
          .map(clean)
          .filter(Boolean);

      if (members.length) {
        return members;
      }

      var id =
        clean(
          node.getAttribute(
            'data-floor-table'
          )
        );

      return id
        ? [id]
        : [];
    }

    function cardMatchesArea(node) {
      if (
        state.selectedArea === 'all'
      ) {
        return true;
      }

      return cardMemberIds(node)
        .some(function (id) {
          return (
            tableAreaName(
              tableById(id)
            ) ===
            state.selectedArea
          );
        });
    }

    function applyAreaFilter() {
      if (!canvas) {
        return;
      }

      canvas
        .querySelectorAll(
          '[data-floor-table]'
        )
        .forEach(function (node) {
          var visible =
            cardMatchesArea(node);

          node.classList.toggle(
            'is-area-hidden',
            !visible
          );

          node.setAttribute(
            'aria-hidden',
            visible
              ? 'false'
              : 'true'
          );
        });
    }

    function numericTableValue(node) {
      var text =
        clean(
          node.querySelector(
            '.pmd-floor-v1__table-number'
          )?.textContent || ''
        );

      var match =
        text.match(/\d+/);

      return match
        ? Number(match[0])
        : Number.MAX_SAFE_INTEGER;
    }

    function visibleFloorCards() {
      return Array.from(
        canvas.querySelectorAll(
          '[data-floor-table]'
        )
      ).filter(function (node) {
        return (
          !node.classList.contains(
            'is-area-hidden'
          ) &&
          getComputedStyle(node)
            .display !== 'none'
        );
      });
    }

    function calibrateOneRow() {
      if (
        !canvas ||
        !state.stripMode
      ) {
        root.classList.remove(
          'is-strip-calibrated'
        );

        return;
      }

      var scroll =
        root.querySelector(
          '[data-floor-scroll]'
        );

      var cards =
        visibleFloorCards()
          .sort(function (first, second) {
            return (
              numericTableValue(first) -
              numericTableValue(second)
            );
          });

      /*
       * Floor cards use permanent center-based positioning:
       *
       *   transform: translate(-50%, -50%)
       *
       * Therefore left/top must contain each card's CENTER,
       * not its top-left corner.
       */
      var horizontalPadding = 24;
      var verticalPadding = 22;
      var gap = ONE_ROW_GAP;
      var cursorLeft = horizontalPadding;
      var maximumHeight = 0;

      cards.forEach(
        function (node) {
          /* PMD_ONE_ROW_CANONICAL_GEOMETRY_V1_4_15_1
           *
           * Never derive One-row placement from rendered DOM measurements.
           * During the Full Floor -> One row structural transition the card
           * can temporarily inherit the previous Full Floor zoom as an
           * animation scale. Reading transient rendered width and then
           * writing it back as a logical left-position makes final cards
           * overlap after the animation ends.
           *
           * Use the same canonical dimensions as buildDisplayTables():
           *   normal table: 108 x 88
           *   merged row card: 270 x 104
           *   fixed row gap: ONE_ROW_GAP (18)
           *
           * This is independent of Full Floor zoom, browser animation phase,
           * device pixel ratio and CSS layout zoom.
           */
          var merged =
            node.classList.contains(
              'is-merged-card'
            );

          var width =
            merged
              ? STRIP_MERGED_WIDTH
              : TABLE_WIDTH;

          var height =
            merged
              ? STRIP_MERGED_HEIGHT
              : TABLE_HEIGHT;

          /*
           * Convert desired top-left row placement into the center
           * coordinates required by permanent translate(-50%, -50%).
           */
          node.style.left =
            (
              cursorLeft +
              width / 2
            ) + 'px';

          node.style.top =
            (
              verticalPadding +
              height / 2
            ) + 'px';

          node.style.margin = '0';

          cursorLeft +=
            width +
            gap;

          maximumHeight =
            Math.max(
              maximumHeight,
              height
            );
        }
      );

      var viewportWidth =
        scroll
          ? scroll.clientWidth
          : 0;

      /*
       * cursorLeft already points after the final card and gap.
       * Remove the unnecessary trailing gap, then add right padding.
       */
      var contentRight =
        cards.length
          ? cursorLeft - gap
          : horizontalPadding;

      var requiredWidth =
        Math.max(
          viewportWidth,
          contentRight +
          horizontalPadding
        );

      var requiredHeight =
        Math.max(
          146,
          verticalPadding +
          maximumHeight +
          verticalPadding
        );

      canvas.style.width =
        requiredWidth + 'px';

      canvas.style.minWidth =
        requiredWidth + 'px';

      canvas.style.height =
        requiredHeight + 'px';

      canvas.style.minHeight =
        requiredHeight + 'px';

      if (scroll) {
        scroll.style.height =
          requiredHeight + 'px';

        scroll.style.minHeight =
          requiredHeight + 'px';

        scroll.style.maxHeight =
          requiredHeight + 'px';

        scroll.style.overflowX =
          'auto';

        scroll.style.overflowY =
          'hidden';
      }

      root.classList.add(
        'is-strip-calibrated'
      );
    }

    function refreshAreaAndStripLayout() {
      renderAreaTabs();
      applyAreaFilter();
      calibrateOneRow();
    }

    function ensureSecondaryToolbar() {
      var existing =
        root.querySelector(
          '[data-floor-secondary-toolbar]'
        );

      if (existing) {
        return existing;
      }

      var search =
        root.querySelector(
          '.pmd-floor-v1__search'
        ) ||
        root.querySelector(
          '[data-floor-search]'
        );

      var searchWrapper =
        search &&
        search.matches(
          '.pmd-floor-v1__search'
        )
          ? search
          : (
            search
              ? search.closest('label')
              : null
          );

      var targetParent =
        searchWrapper
          ? searchWrapper.parentElement
          : root.querySelector(
            '.pmd-floor-v1__filters'
          );

      if (!targetParent) {
        return null;
      }

      var secondary =
        document.createElement('div');

      secondary.className =
        'pmd-floor-v1__secondary-toolbar';

      secondary.setAttribute(
        'data-floor-secondary-toolbar',
        ''
      );

      if (searchWrapper) {
        searchWrapper.replaceWith(
          secondary
        );
      } else {
        targetParent.appendChild(
          secondary
        );
      }

      return secondary;
    }

    function organizeFloorControls() {
      var secondary =
        ensureSecondaryToolbar();

      if (!secondary) {
        return;
      }

      var selectors = [
        '[data-floor-edit]',
        '[data-floor-save]',
        '[data-floor-zoom-out]',
        '[data-floor-fit]',
        '[data-floor-zoom-in]',
        '[data-floor-strip]'
      ];

      selectors.forEach(
        function (selector) {
          var button =
            root.querySelector(
              selector
            );

          if (
            button &&
            button.parentElement !==
              secondary
          ) {
            secondary.appendChild(
              button
            );
          }
        }
      );

      var guide =
        root.querySelector(
          '[data-floor-guide]'
        );

      var stage =
        root.querySelector(
          '[data-floor-stage]'
        );

      /*
       * The Guide is a viewport overlay, not floor content.
       *
       * Keeping it directly inside the non-scrolling stage
       * makes its position compositor-stable while the canvas
       * scrolls underneath it. No per-scroll JavaScript writes
       * are needed, so there is no blinking or jumping.
       */
      if (
        guide &&
        stage &&
        guide.parentElement !== stage
      ) {
        stage.appendChild(guide);
      }

      installGuideViewportAnchor();

      refreshFloorIcons();
    }

    function installGuideViewportAnchor() {
      var guide =
        root.querySelector(
          '[data-floor-guide]'
        );

      var card =
        root.querySelector(
          '[data-floor-guide-card]'
        );

      var stage =
        root.querySelector(
          '[data-floor-stage]'
        );

      if (!guide || !card || !stage) {
        return;
      }

      if (
        guide.parentElement !== stage
      ) {
        stage.appendChild(guide);
      }

      if (
        card.parentElement !== stage
      ) {
        stage.appendChild(card);
      }

      /*
       * Remove every inline value left by the former
       * scroll-following implementation.
       *
       * CSS now owns positioning entirely.
       */
      [
        'position',
        'float',
        'left',
        'top',
        'right',
        'bottom',
        'margin'
      ].forEach(
        function (property) {
          guide.style.removeProperty(
            property
          );
        }
      );

      guide.setAttribute(
        'aria-expanded',
        card.hidden
          ? 'false'
          : 'true'
      );

      /*
       * Install the outside-click handler once only.
       */
      if (
        !root.__pmdGuideOutsideClickInstalled
      ) {
        root.__pmdGuideOutsideClickInstalled =
          true;

        document.addEventListener(
          'click',
          function (event) {
            var currentGuide =
              root.querySelector(
                '[data-floor-guide]'
              );

            var currentCard =
              root.querySelector(
                '[data-floor-guide-card]'
              );

            if (
              !currentGuide ||
              !currentCard ||
              currentCard.hidden
            ) {
              return;
            }

            if (
              event.target.closest(
                '[data-floor-guide]'
              ) ||
              event.target.closest(
                '[data-floor-guide-card]'
              )
            ) {
              return;
            }

            closeFloorGuideCard();
          }
        );
      }
    }

    function openFloorGuideCard() {
      var guide =
        root.querySelector(
          '[data-floor-guide]'
        );

      var card =
        root.querySelector(
          '[data-floor-guide-card]'
        );

      if (!card) {
        return;
      }

      if (card.__pmdGuideHideTimer) {
        window.clearTimeout(
          card.__pmdGuideHideTimer
        );

        card.__pmdGuideHideTimer =
          0;
      }

      card.hidden = false;

      /*
       * Two frames ensure the browser paints the initial
       * closed state before transitioning to the open state.
       */
      card.classList.add(
        'is-open'
      );

      if (guide) {
        guide.setAttribute(
          'aria-expanded',
          'true'
        );
      }
    }

    function closeFloorGuideCard() {
      var guide =
        root.querySelector(
          '[data-floor-guide]'
        );

      var card =
        root.querySelector(
          '[data-floor-guide-card]'
        );

      if (
        !card ||
        card.hidden
      ) {
        return;
      }

      card.classList.remove(
        'is-open'
      );

      if (guide) {
        guide.setAttribute(
          'aria-expanded',
          'false'
        );
      }

      if (card.__pmdGuideHideTimer) {
        window.clearTimeout(
          card.__pmdGuideHideTimer
        );
      }

      card.__pmdGuideHideTimer =
        window.setTimeout(
          function () {
            if (
              !card.classList.contains(
                'is-open'
              )
            ) {
              card.hidden = true;
            }

            card.__pmdGuideHideTimer =
              0;
          },
          190
        );
    }

    function toggleFloorGuideCard() {
      var card =
        root.querySelector(
          '[data-floor-guide-card]'
        );

      if (!card) {
        return;
      }

      if (
        card.hidden ||
        !card.classList.contains(
          'is-open'
        )
      ) {
        openFloorGuideCard();
      } else {
        closeFloorGuideCard();
      }
    }

    function ensureMotherToolbar() {
      var existing =
        root.querySelector(
          '[data-floor-mother-toolbar]'
        );

      if (existing) {
        return existing;
      }

      var toolbar =
        root.querySelector(
          '.pmd-floor-v1__toolbar'
        );

      if (!toolbar) {
        return null;
      }

      var actions =
        document.createElement('div');

      actions.className =
        'pmd-floor-v1__mother-actions';

      actions.setAttribute(
        'data-floor-mother-toolbar',
        ''
      );

      actions.innerHTML =
        '<button type="button" ' +
        'data-floor-mother-action="available" ' +
        'title="Mark selected table available">' +
        '✓ Available</button>' +

        '<button type="button" ' +
        'data-floor-mother-action="cleaning" ' +
        'title="Mark selected table for cleaning">' +
        '✦ Cleaning</button>' +

        '<button type="button" ' +
        'data-floor-mother-action="reserved" ' +
        'title="Mark selected table reserved">' +
        '◷ Reserved</button>' +

        '<button type="button" ' +
        'data-floor-mother-action="waiter-call" ' +
        'title="Add waiter call">' +
        '♟ Waiter call</button>' +

        '<button type="button" ' +
        'data-floor-mother-action="note" ' +
        'title="Add a note">' +
        '✎ Note</button>' +

        '<button type="button" ' +
        'data-floor-mother-action="order" ' +
        'title="Open selected table">' +
        '＋ Open table</button>' +

        '<button type="button" ' +
        'data-floor-mother-action="unmerge" ' +
        'class="is-danger" ' +
        'title="Unmerge selected group">' +
        '↪ Unmerge</button>';

      var mergeButton =
        toolbar.querySelector(
          '[data-floor-merge]'
        );

      if (mergeButton) {
        toolbar.insertBefore(
          actions,
          mergeButton
        );
      } else {
        toolbar.appendChild(actions);
      }

      return actions;
    }

    function ensureContextCounters() {
      var existing =
        root.querySelector(
          '[data-floor-context-counters]'
        );

      if (existing) {
        return existing;
      }

      var header =
        root.querySelector(
          '.pmd-floor-v1__header'
        );

      if (!header) {
        return null;
      }

      var counters =
        document.createElement('div');

      counters.className =
        'pmd-floor-v1__context-counters';

      counters.setAttribute(
        'data-floor-context-counters',
        ''
      );

      header.appendChild(counters);

      return counters;
    }

    function renderContextCounters() {
      var container =
        ensureContextCounters();

      if (!container) {
        return;
      }

      var counters =
        Array.isArray(state.counters)
          ? state.counters
          : [];

      container.innerHTML =
        counters.map(
          function (counter) {
            return (
              '<div class="' +
              'pmd-floor-v1__context-counter">' +

              '<span>' +
              escapeHtml(
                counter.label || ''
              ) +
              '</span>' +

              '<strong>' +
              escapeHtml(
                counter.value == null
                  ? '0'
                  : counter.value
              ) +
              '</strong>' +

              '</div>'
            );
          }
        ).join('');

      container.hidden =
        counters.length === 0;
    }

    function updateMotherToolbar() {
      var toolbar =
        ensureMotherToolbar();

      if (!toolbar) {
        return;
      }

      var selected =
        selectedDisplayTable();

      var capabilityMap = {
        available:
          'available',

        cleaning:
          'cleaning',

        reserved:
          'reserved',

        'waiter-call':
          'waiterCall',

        note:
          'note',

        order:
          'openTable',

        unmerge:
          'unmerge'
      };

      toolbar
        .querySelectorAll(
          '[data-floor-mother-action]'
        )
        .forEach(function (button) {
          var action =
            button.getAttribute(
              'data-floor-mother-action'
            );

          var capability =
            capabilityMap[action];

          var permitted =
            state.capabilities[
              capability
            ] !== false;

          if (
            action === 'unmerge'
          ) {
            permitted =
              permitted &&
              selectedIsMerged();
          }

          button.hidden =
            !permitted;

          button.disabled =
            !selected;
        });

      root.classList.toggle(
        'has-floor-selection',
        Boolean(selected)
      );

      root.setAttribute(
        'data-floor-context',
        state.context
      );
    }

    function clearFloorSelection() {
      state.selectedDisplayId = null;

      render();
      updateMotherToolbar();
    }

    function selectOperationalTable(
      table
    ) {
      var current =
        String(
          state.selectedDisplayId || ''
        );

      var next =
        String(table.id);

      state.selectedDisplayId =
        current === next
          ? null
          : table.id;

      render();
      updateMotherToolbar();
    }

    function optimisticTableUpdate(
      targets,
      action,
      noteValue
    ) {
      var wanted = {};

      (targets || []).forEach(
        function (id) {
          wanted[String(id)] = true;
        }
      );

      if (
        !state.operational.tables ||
        typeof state.operational.tables !==
          'object'
      ) {
        state.operational.tables = {};
      }

      state.tables.forEach(
        function (table) {
          if (
            wanted[
              String(table.id)
            ] !== true
          ) {
            return;
          }

          var stored =
            state.operational.tables[
              table.id
            ] || {};

          if (action === 'available') {
            table.status = 'available';
            table.waiterCall = false;
            table.cleaning = false;

            stored.status =
              'available';
          }

          if (action === 'cleaning') {
            table.status = 'cleaning';
            table.cleaning = true;
            table.waiterCall = false;

            stored.status =
              'cleaning';
          }

          if (action === 'reserved') {
            table.status = 'reserved';
            table.cleaning = false;
            table.waiterCall = false;

            stored.status =
              'reserved';
          }

          if (
            action === 'waiter-call'
          ) {
            table.status = 'attention';
            table.waiterCall = true;

            stored.status =
              'waiter-call';
          }

          if (action === 'note') {
            table.note =
              clean(noteValue);

            stored.note =
              clean(noteValue);

            if (table.note) {
              table.status =
                'attention';
            }
          }

          state.operational.tables[
            table.id
          ] = stored;
        }
      );

      render();
    }

    function applyActionToTargets(
      action,
      targets,
      noteValue
    ) {
      if (!targets.length) {
        toast(
          'Select a table first',
          true
        );

        return Promise.resolve();
      }

      /*
       * Update the Floor immediately. The API request then
       * confirms and persists the same state.
       */
      optimisticTableUpdate(
        targets,
        action,
        noteValue
      );

      return Promise.all(
        targets.map(
          function (id) {
            return saveOperational(
              action === 'note'
                ? 'note'
                : 'table-state',

              action === 'note'
                ? {
                  table_id: id,
                  note: noteValue
                }
                : {
                  table_id: id,
                  status: action,
                  note: ''
                }
            );
          }
        )
      );
    }

    function runMotherAction(action) {
      var table =
        selectedDisplayTable();

      if (!table) {
        toast(
          'Select a table first',
          true
        );

        return;
      }

      var targets =
        selectedTargetIds();

      if (action === 'order') {
        var primary =
          targets[0];

        location.href =
          orderTemplate.replace(
            '{table}',
            encodeURIComponent(primary)
          );

        return;
      }

      if (action === 'note') {
        var noteValue =
          window.prompt(
            'Add a note for ' +
            table.name,

            table.note || ''
          );

        if (noteValue === null) {
          return;
        }

        applyActionToTargets(
          'note',
          targets,
          noteValue
        ).then(function () {
          toast('Note saved');
          clearFloorSelection();
        });

        return;
      }

      if (action === 'unmerge') {
        if (!table.isMergedView) {
          toast(
            'Selected table is not merged',
            true
          );

          return;
        }

        var memberIds =
          table.memberIds.slice();

        state.transitionReason =
          'unmerge';

        saveOperational(
          'unmerge',
          {
            merge_id:
              table.mergeId
          }
        )
          .then(function () {
            var repaired =
              repairUnmergedMembers(
                memberIds
              );

            return repaired
              ? persistLayoutSilently()
              : Promise.resolve();
          })
          .then(function () {
            state.selectedDisplayId =
              null;

            render();
            updateMotherToolbar();

            toast(
              'Tables unmerged safely'
            );
          })
          .catch(function (error) {
            toast(
              error.message,
              true
            );
          });

        return;
      }

      applyActionToTargets(
        action,
        targets
      )
        .then(function () {
          toast(
            'Table status updated'
          );

          state.selectedDisplayId =
            null;

          render();
          updateMotherToolbar();
        })
        .catch(function (error) {
          toast(
            error.message,
            true
          );
        });
    }

    function setContext(
      context,
      options
    ) {
      var config =
        options || {};

      state.context =
        context || 'operations';

      if (
        config.capabilities &&
        typeof config.capabilities ===
          'object'
      ) {
        state.capabilities =
          Object.assign(
            {},
            state.capabilities,
            config.capabilities
          );
      }

      if (
        Array.isArray(
          config.counters
        )
      ) {
        state.counters =
          config.counters.slice();
      }

      renderContextCounters();
      updateMotherToolbar();

      window.dispatchEvent(
        new CustomEvent(
          'pmd:floor:context',
          {
            detail: {
              context:
                state.context,

              capabilities:
                Object.assign(
                  {},
                  state.capabilities
                ),

              counters:
                state.counters.slice()
            }
          }
        )
      );
    }

    root.addEventListener(
      'click',
      function (event) {
        var tableNode =
          event.target.closest(
            '[data-floor-table]'
          );

        if (
          tableNode &&
          (
            !state.editing ||
            state.mergeMode
          )
        ) {
          var table =
            displayTableById(
              tableNode.getAttribute(
                'data-floor-table'
              )
            );

          if (!table) return;

          if (state.mergeMode) {
            selectForMerge(table);
          } else {
            /*
             * Mother Floor behavior:
             * clicking a table selects it. Actions live in
             * the top toolbar; no action drawer is opened.
             */
            selectOperationalTable(
              table
            );
          }

          return;
        }

        var motherAction =
          event.target.closest(
            '[data-floor-mother-action]'
          );

        if (motherAction) {
          runMotherAction(
            motherAction.getAttribute(
              'data-floor-mother-action'
            )
          );

          return;
        }

        var areaButton =
          event.target.closest(
            '[data-floor-area]'
          );

        if (areaButton) {
          state.selectedArea =
            areaButton.getAttribute(
              'data-floor-area'
            ) || 'all';

          renderAreaTabs();
          applyAreaFilter();

          window.requestAnimationFrame(
            function () {
              calibrateOneRow();
            }
          );

          return;
        }

        var filter =
          event.target.closest(
            '[data-floor-filter]'
          );

        if (filter) {
          state.filter =
            filter.getAttribute(
              'data-floor-filter'
            );

          root
            .querySelectorAll(
              '[data-floor-filter]'
            )
            .forEach(
              function (button) {
                button.classList.toggle(
                  'is-active',
                  button === filter
                );
              }
            );

          render();
          return;
        }

        if (
          event.target.closest(
            '[data-floor-refresh]'
          )
        ) {
          load();
        }

        if (
          event.target.closest(
            '[data-floor-edit]'
          )
        ) {
          if (state.stripMode) {
            setStripMode(false);
          }
          setEditing(true);
        }

        if (
          event.target.closest(
            '[data-floor-save]'
          )
        ) {
          saveLayout();
        }

        if (
          event.target.closest(
            '[data-floor-merge]'
          )
        ) {
          if (!state.mergeMode) {
            setMergeMode(true);
          } else if (
            state.mergeSelection.length >= 2
          ) {
            commitMerge();
          } else {
            cancelMergeMode();
          }

          return;
        }

        if (
          event.target.closest(
            '[data-floor-strip]'
          )
        ) {
          setStripMode(
            !state.stripMode
          );

          return;
        }

        if (
          event.target.closest(
            '[data-floor-zoom-in]'
          )
        ) {
          state.userHasChangedZoom = true;

          if (state.stripMode) {
            state.rowScale = Math.min(1.35, state.rowScale + .1);
          } else {
            state.fullFloorZoom = Math.min(1.6, state.fullFloorZoom + .1);

            var zoomCookieName =
              root.getAttribute('data-floor-zoom-cookie') || '';

            if (zoomCookieName) {
              document.cookie =
                zoomCookieName + '=' +
                encodeURIComponent(String(state.fullFloorZoom)) +
                '; Path=/admin; Max-Age=31536000; SameSite=Lax';
            }
          }

          applyZoom();
          queueFloorViewPreferenceSave(200);
        }

        if (
          event.target.closest(
            '[data-floor-zoom-out]'
          )
        ) {
          state.userHasChangedZoom = true;

          if (state.stripMode) {
            state.rowScale = Math.max(.65, state.rowScale - .1);
          } else {
            state.fullFloorZoom = Math.max(.4, state.fullFloorZoom - .1);

            var zoomCookieName =
              root.getAttribute('data-floor-zoom-cookie') || '';

            if (zoomCookieName) {
              document.cookie =
                zoomCookieName + '=' +
                encodeURIComponent(String(state.fullFloorZoom)) +
                '; Path=/admin; Max-Age=31536000; SameSite=Lax';
            }
          }

          applyZoom();
          queueFloorViewPreferenceSave(200);
        }

        if (
          event.target.closest(
            '[data-floor-fit]'
          )
        ) {
          fit();
        }

        if (
          event.target.closest(
            '[data-floor-fullscreen]'
          )
        ) {
          if (
            document.fullscreenElement
          ) {
            document.exitFullscreen();
          } else {
            root.requestFullscreen();
          }
        }

        if (
          event.target.closest(
            '[data-floor-guide]'
          )
        ) {
          toggleFloorGuideCard();

          return;
        }

        /*
         * Clicking inside the Guide card must not close it.
         * Clicking elsewhere is handled by the document-level
         * outside-click listener.
         */
        if (
          event.target.closest(
            '[data-floor-guide-card]'
          )
        ) {
          return;
        }

        if (
          event.target.closest(
            '[data-floor-close]'
          )
        ) {
          closeDrawer();
        }

        var unmerge =
          event.target.closest(
            '[data-floor-unmerge]'
          );

        if (unmerge) {
          var memberIds =
            state.active &&
            state.active.isMergedView
              ? state.active
                  .memberIds.slice()
              : [];

          var mergeId =
            unmerge.getAttribute(
              'data-floor-unmerge'
            );

          unmerge.disabled = true;

          saveOperational(
            'unmerge',
            {
              merge_id: mergeId
            }
          )
            .then(function () {
              var repaired =
                repairUnmergedMembers(
                  memberIds
                );

              return repaired
                ? persistLayoutSilently()
                : Promise.resolve();
            })
            .then(function () {
              closeDrawer();

              render();

              toast(
                'Tables unmerged and positioned safely'
              );
            })
            .catch(function (error) {
              unmerge.disabled = false;

              toast(
                error.message,
                true
              );
            });

          return;
        }

        var action =
          event.target.closest(
            '[data-floor-action]'
          );

        if (
          action &&
          state.active
        ) {
          var type =
            action.getAttribute(
              'data-floor-action'
            );

          var actionTableId =
            state.active
              .isMergedView
              ? state.active
                  .memberIds[0]
              : state.active.id;

          if (type === 'order') {
            location.href =
              orderTemplate.replace(
                '{table}',
                encodeURIComponent(
                  actionTableId
                )
              );
          } else if (
            type === 'note'
          ) {
            var noteValue =
              window.prompt(
                'Add a note for ' +
                state.active.name,

                state.active.note ||
                ''
              );

            if (
              noteValue !== null
            ) {
              saveOperational(
                'note',
                {
                  table_id:
                    actionTableId,

                  note:
                    noteValue
                }
              ).then(function () {
                closeDrawer();

                toast(
                  'Note saved'
                );
              });
            }
          } else {
            var targets =
              state.active
                .isMergedView
                ? state.active
                    .memberIds
                : [
                  state.active.id
                ];

            Promise.all(
              targets.map(
                function (id) {
                  return saveOperational(
                    'table-state',
                    {
                      table_id: id,
                      status: type,

                      note:
                        state.active.note ||
                        ''
                    }
                  );
                }
              )
            ).then(function () {
              closeDrawer();

              toast(
                'Table updated'
              );
            });
          }
        }
      }
    );

    /* PMD_FLOOR_DESKTOP_PAGE_SCROLL_AND_PAN_R54
     * Desktop interaction contract:
     * - normal vertical wheel/trackpad scroll continues the PAGE
     * - horizontal intent still pans the Floor horizontally
     * - click-drag on empty Floor background pans the Floor viewport
     * - touch remains browser-native; no touch pointer interception
     */
    (function installDesktopFloorNavigationR54() {
      if (!scroll || scroll.__pmdDesktopNavigationR54) return;
      scroll.__pmdDesktopNavigationR54 = true;

      var pan = null;

      function wheelPixels(value, deltaMode) {
        if (deltaMode === 1) return value * 16;
        if (deltaMode === 2) return value * Math.max(window.innerHeight || 0, 600);
        return value;
      }

      scroll.addEventListener('wheel', function (event) {
        if (event.ctrlKey) return;

        var dx = wheelPixels(Number(event.deltaX || 0), event.deltaMode);
        var dy = wheelPixels(Number(event.deltaY || 0), event.deltaMode);
        var horizontalIntent = event.shiftKey || Math.abs(dx) > Math.abs(dy);

        if (state.stripMode && horizontalIntent) {
          if (event.shiftKey && Math.abs(dy) >= Math.abs(dx)) {
            event.preventDefault();
            scroll.scrollLeft += dy;
          }
          return;
        }

        if (!state.stripMode && horizontalIntent) {
          return;
        }

        if (Math.abs(dy) >= Math.abs(dx) && dy !== 0) {
          event.preventDefault();
          window.scrollBy({
            top: dy,
            left: 0,
            behavior: 'auto'
          });
        }
      }, { passive: false });

      scroll.addEventListener('pointerdown', function (event) {
        if (event.pointerType !== 'mouse' || event.button !== 0 || state.editing) return;
        if (event.target.closest('button, a, input, select, textarea, [data-floor-table], [data-floor-guide], [data-floor-guide-card]')) return;

        pan = {
          pointerId: event.pointerId,
          clientX: event.clientX,
          clientY: event.clientY,
          scrollLeft: scroll.scrollLeft,
          scrollTop: scroll.scrollTop,
          moved: false
        };

        if (scroll.setPointerCapture) {
          try { scroll.setPointerCapture(event.pointerId); } catch (error) {}
        }

        scroll.classList.add('is-pmd-floor-grab-pan-r54');
        event.preventDefault();
      }, false);

      scroll.addEventListener('pointermove', function (event) {
        if (!pan || pan.pointerId !== event.pointerId) return;

        var dx = event.clientX - pan.clientX;
        var dy = event.clientY - pan.clientY;
        if (Math.abs(dx) + Math.abs(dy) > 3) pan.moved = true;

        scroll.scrollLeft = pan.scrollLeft - dx;
        scroll.scrollTop = pan.scrollTop - dy;
        event.preventDefault();
      }, false);

      function finishPan(event) {
        if (!pan) return;
        if (event && event.pointerId != null && pan.pointerId !== event.pointerId) return;

        if (scroll.releasePointerCapture && event && event.pointerId != null) {
          try { scroll.releasePointerCapture(event.pointerId); } catch (error) {}
        }

        pan = null;
        scroll.classList.remove('is-pmd-floor-grab-pan-r54');
      }

      scroll.addEventListener('pointerup', finishPan, false);
      scroll.addEventListener('pointercancel', finishPan, false);
      scroll.addEventListener('lostpointercapture', finishPan, false);
    })();

    root.addEventListener(
      'pointerdown',
      function (event) {
        var node =
          event.target.closest(
            '[data-floor-table]'
          );

        if (!node) return;

        var table =
          displayTableById(
            node.getAttribute(
              'data-floor-table'
            )
          );

        if (table) {
          pointerDown(
            event,
            table
          );
        }
      }
    );

    root.addEventListener(
      'pointermove',
      pointerMove
    );

    root.addEventListener(
      'pointerup',
      pointerUp
    );

    root.addEventListener(
      'pointercancel',
      pointerUp
    );

    var search =
      root.querySelector(
        '[data-floor-search]'
      );

    if (search) {
      search.addEventListener(
        'input',
        function () {
          state.query =
            clean(search.value)
              .toLowerCase();

          render();
        }
      );
    }

    document.addEventListener(
      'keydown',
      function (event) {
        if (
          event.key === 'Escape' &&
          state.mergeMode
        ) {
          event.preventDefault();
          cancelMergeMode();
        }
      }
    );

    window.addEventListener(
      'resize',
      function () {
        if (!state.editing) {
          fit();
        }
      }
    );

    ensureStripButton();
    updateStripButton();

    ensureOfficialTablerKit();

    ensureMotherToolbar();
    ensureContextCounters();
    ensureSecondaryToolbar();

    renderAreaTabs();

    updateMotherToolbar();
    renderContextCounters();

    organizeFloorControls();

    /*
     * Blade already painted visible table badges/icons. Do not mutate
     * visible Floor children during server-bootstrap hydration.
     */
    if (
      root.getAttribute(
        'data-pmd-floor-boot-source'
      ) !== 'server'
    ) {
      refreshFloorIcons();
    }

    /* PMD_DASHBOARD_LAB_EXACT_FLOOR_BOOTSTRAP_V1 */
    var bootstrapNode =
      document.getElementById(
        'pmd-dashboard-lab-exact-floor-bootstrap-v1'
      );

    var bootstrap = null;

    if (bootstrapNode) {
      try {
        bootstrap = JSON.parse(
          bootstrapNode.textContent || '{}'
        );
      } catch (error) {
        bootstrap = null;
      }
    }

    if (bootstrap && bootstrap.data) {
      state.payload = bootstrap.data || {};
      state.operational = bootstrap.state || {
        tables: {},
        merges: {}
      };
      state.tables = normalize(
        state.payload,
        bootstrap.layout || {}
      );

      /*
       * PMD_DASHBOARD_LAB_SERVER_DOM_ADOPTION_V2
       *
       * The exact Floor is already present in the first HTML response.
       * The previous bootstrap immediately called render() + fit(), which
       * destroyed that server DOM and recalculated Full Floor / One row
       * geometry after first paint.
       *
       * Build only the internal interaction model. buildDisplayTables()
       * temporarily writes canvas dimensions, so preserve and restore the
       * exact server inline style synchronously in the same JS task.
       */
      var serverCanvasStyle =
        canvas.getAttribute('style');

      buildDisplayTables();

      if (serverCanvasStyle === null) {
        canvas.removeAttribute('style');
      } else {
        canvas.setAttribute(
          'style',
          serverCanvasStyle
        );
      }

      updateCounts();

      state.initialized = true;
      scheduleReservationBusyBoundary();

      root.setAttribute(
        'data-pmd-floor-boot-source',
        'server'
      );

      root.setAttribute(
        'data-pmd-floor-hydrated',
        'true'
      );
    } else {
      load();
      root.setAttribute(
        'data-pmd-floor-boot-source',
        'network-fallback'
      );
    }

    /* PMD_FLOOR_RESERVATION_BUSY_EVENT_REFRESH_V1
     * No polling. Re-read canonical reservation windows only when the user
     * returns to the tab/window; boundary starts/ends use the one-shot timer above.
     */
    function refreshReservationBusyOnReturn() {
      if (document.visibilityState === 'hidden') return;
      refreshReservationBusyWindows().then(function () {
        syncReservationBusyStatuses();
      });
    }

    document.addEventListener('visibilitychange', refreshReservationBusyOnReturn, false);
    window.addEventListener('focus', refreshReservationBusyOnReturn, false);

    window.PMDDashboardLabFloorStabilityV2 = {
      version: '2.0.0',
      audit: function () {
        return {
          ready: true,
          bootSource:
            root.getAttribute(
              'data-pmd-floor-boot-source'
            ),
          hydrated:
            root.getAttribute(
              'data-pmd-floor-hydrated'
            ) === 'true',
          mode:
            state.stripMode ? 'row' : 'full',
          initialized:
            state.initialized,
          tableCount:
            root.querySelectorAll(
              '[data-floor-table]'
            ).length,
          bootDomReused: true,
          bootRenderSkipped: true,
          bootFitSkipped: true,
          bootCalibrationSkipped: true
        };
      }
    };

    return {
      root: root,
      refresh: load,
      fit: fit,
      setEditing: setEditing,
      saveLayout: saveLayout,

      setSize: function (size) {
        root.setAttribute(
          'data-size',
          size
        );

        fit();
      },

      getState: function () {
        return state;
      },

      setContext: setContext,

      setCounters: function (
        counters
      ) {
        state.counters =
          Array.isArray(counters)
            ? counters.slice()
            : [];

        renderContextCounters();
      },

      setCapabilities: function (
        capabilities
      ) {
        state.capabilities =
          Object.assign(
            {},
            state.capabilities,
            capabilities || {}
          );

        updateMotherToolbar();
      },

      clearSelection:
        clearFloorSelection
    };
  }

  var instances = [];

  function mount(scope) {
    var roots =
      Array.prototype.slice.call(
        (scope || document)
          .querySelectorAll(
            '[data-pmd-floor]'
          )
      );

    roots.forEach(
      function (root) {
        if (
          root.__pmdFloorV1
        ) {
          return;
        }

        root.__pmdFloorV1 =
          createFloor(root);

        if (
          root.__pmdFloorV1
        ) {
          instances.push(
            root.__pmdFloorV1
          );

          /* PMD_SHARED_FLOOR_READY_EVENT_V1_4_13
           * Event-driven only: no retry timer/observer/polling.
           */
          window.dispatchEvent(
            new CustomEvent(
              'pmd:shared-floor:ready',
              {
                detail: {
                  root: root,
                  instance: root.__pmdFloorV1
                }
              }
            )
          );
        }
      }
    );

    return instances;
  }

  window.PMDDashboardLabExactFloorV1 = {
    version: '2.8.0',
    mount: mount,
    instances: instances,

    sizes: [
      'compact',
      'standard',
      'large',
      'fill'
    ],

    smartLayout: {
      tableWidth: 108,
      tableHeight: 88,

      mergedWidth: 132,
      mergedHeight: 104,

      minimumGap: 14,
      snapDistance: 20,

      overlapDuringDrag: true,
      overlapOnDrop: false,

      centerSnapOnly: true,
      closestTableOnly: true,
      alignmentGuides: false,

      mergeExitsEditMode: true,
      mergedGroupSingleCard: true,

      multiTableMerge: true,
      explicitMergeConfirmation: true,
      mergeCancelWithEscape: true,
      mergeTransitionJumpRemoved: true,
      unmergeFromDrawer: true,
      nestedMergesBlocked: true,

      safeUnmergePlacement: true,
      safeUnmergePersistence: true,

      oneRowMode: true,
      oneRowSortedAscending: true,
      oneRowHorizontalScroll: true,
      oneRowHidesEditing: true,
      oneRowPreservesSavedLayout: true,

      mergedCollisionCheck: true,
      mergedNearestLegalPlacement: true,
      mergedRowScanFallback: true,
      mergedPlacementAutoSave: true,
      existingMergedRepairOnLoad: true,

      motherFloorKit: true,
      capabilityDrivenToolbar: true,
      contextCounters: true,

      tableClickSelectsOnly: true,
      drawerActionsDisabled: true,

      toolbarAvailableAction: true,
      toolbarCleaningAction: true,
      toolbarReservedAction: true,
      toolbarWaiterCallAction: true,
      toolbarNoteAction: true,
      toolbarOpenTableAction: true,
      toolbarUnmergeAction: true,

      mergedProfessionalVisual: true,

      smoothFloorStripTransition: true,
      smoothMergeTransition: true,
      smoothUnmergeTransition: true,
      structuralFlipAnimation: true,

      availableOptimisticColor: true,
      waiterCallOrange: true,
      noteOrange: true,

      hideAvailableStatusText: true,
      hideOccupiedStatusText: true,

      mergedBadgeTopRight: true,
      mergedLargePillRemoved: true,

      tablerIconSystem: true,
      emojiIconsRemoved: true,
      externalIconCdnRequired: false,

      searchFieldRemoved: true,
      secondaryControlToolbar: true,

      guideFloatingBottomRight: true,
      guideIconOnly: true,

      officialTablerWebfont: true,
      officialTablerVersion: '3.44.0',
      handmadeSvgIconsRemoved: true,

      statusFiltersRemoved: true,
      areaSelectorEnabled: true,
      dynamicBackendAreas: true,
      defaultMainFloorArea: true,

      calibratedOneRow: true,
      oneRowNumericOrdering: true,
      oneRowFixedGap: 18,
      oneRowMergedWidthAware: true
    }
  };

  if (
    document.readyState ===
    'loading'
  ) {
    document.addEventListener(
      'DOMContentLoaded',
      function () {
        mount(document);
      },
      {
        once: true
      }
    );
  } else {
    mount(document);
  }
})();

/* ============================================================
   PMD_DASHBOARD_LAB_EXACT_FLOOR_TOOLBAR_BRIDGE_R56

   Presentation moved to pmd-floor-toolbar-authority-v1.js.
   The native Floor core remains the ONLY state/action authority.
   No duplicate toolbar click/render writer lives here anymore.
   ============================================================ */

/* ============================================================
   PMD_DASHBOARD_LAB_GUIDE_ONE_ROW_SMOOTH_V3_AUDIT
   Read-only browser audit. No observer, timer or geometry writer.
   ============================================================ */
(function () {
  'use strict';

  window.PMDDashboardLabFloorInteractionV3 = {
    audit: function () {
      var root = document.getElementById(
        'pmd-r2-shared-floor-canvas-v310'
      );

      var guide = root
        ? root.querySelector('[data-floor-guide]')
        : null;

      var stage = root
        ? root.querySelector('[data-floor-stage]')
        : null;

      return {
        ready: Boolean(root && stage),
        guideUsesServerSvg: Boolean(
          guide &&
          guide.children.length === 1 &&
          guide.firstElementChild &&
          guide.firstElementChild.tagName === 'svg'
        ),
        mode: root && root.classList.contains('is-strip-mode')
          ? 'row'
          : 'full',
        stageHeight: stage
          ? Math.round(stage.getBoundingClientRect().height)
          : null,
        userViewTransitionActive: Boolean(
          root &&
          root.hasAttribute(
            'data-pmd-floor-user-view-transition'
          )
        ),
        refreshTransitionDisabled: true,
        userToggleTransitionEnabled: true
      };
    }
  };
})();


/* ============================================================
   PMD_FLOOR_INLINE_TABLE_MANAGER_V1
   Owner/Manager only. Event-driven UI; no observer/polling/interval.
   Backend authority is the inherited ManagerLab handler and canonical
   Admin\Models\Tables_model. QR data is never requested or submitted.
   ============================================================ */
(function () {
  'use strict';

  if (window.PMDFloorInlineTableManagerV1) return;

  function asText(value) {
    return value === null || value === undefined ? '' : String(value);
  }

  function asInt(value, fallback) {
    var parsed = parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : (fallback || 0);
  }

  function parsePayload(text) {
    if (!text) return {};
    try { return JSON.parse(text); }
    catch (error) { return { message: text }; }
  }

  function request(root, handler, payload) {
    var endpoint = root.getAttribute('data-pmd-floor-table-manager-url');
    if (!endpoint) return Promise.reject(new Error('Table manager endpoint is unavailable.'));

    var headers = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      'X-IGNITER-REQUEST-HANDLER': handler
    };

    var csrf = document.querySelector('meta[name="csrf-token"]');
    if (csrf && csrf.content) headers['X-CSRF-TOKEN'] = csrf.content;

    return fetch(endpoint, {
      method: 'POST',
      credentials: 'same-origin',
      cache: 'no-store',
      headers: headers,
      body: JSON.stringify(payload || {})
    }).then(function (response) {
      return response.text().then(function (text) {
        var data = parsePayload(text);
        if (!response.ok || data.ok === false) {
          var error = new Error(data.message || ('HTTP ' + response.status));
          error.status = response.status;
          error.payload = data;
          throw error;
        }
        return data;
      });
    });
  }

  function boot(root) {
    if (!root || root.__pmdInlineTableManagerV1) return;
    if (root.getAttribute('data-pmd-floor-table-manager') !== 'true') return;

    var panel = root.querySelector('[data-pmd-floor-table-manager-panel]');
    var addButton = root.querySelector('[data-pmd-floor-table-add]');
    var editButton = root.querySelector('[data-pmd-floor-table-edit]');
    if (!panel || !addButton || !editButton) return;

    /* PMD_FLOOR_TABLE_MANAGER_VIEWPORT_PORTAL_V1_4_4
     * A fixed modal inside a transformed/stacked Floor container can become
     * centered against that container and can sit below page controls.
     * Move the existing panel once to document.body; all references below
     * retain the same DOM node and no second modal/runtime is created.
     */
    panel.setAttribute('data-pmd-floor-table-manager-portal', 'true');
    panel.setAttribute(
      'data-pmd-floor-table-manager-owner',
      root.id || 'pmd-r2-shared-floor-canvas-v310'
    );
    if (panel.parentElement !== document.body) {
      document.body.appendChild(panel);
    }

    var form = panel.querySelector('[data-pmd-floor-table-manager-form]');
    var saveButton = panel.querySelector('[data-pmd-floor-table-manager-save]');
    var deleteButton = panel.querySelector('[data-pmd-floor-table-manager-delete]');
    var loading = panel.querySelector('[data-pmd-floor-table-manager-loading]');
    var errorBox = panel.querySelector('[data-pmd-floor-table-manager-error]');
    var title = panel.querySelector('[data-pmd-floor-table-manager-title]');
    var subtitle = panel.querySelector('[data-pmd-floor-table-manager-subtitle]');
    var numberLock = panel.querySelector('[data-pmd-floor-table-number-lock]');
    var qrDownloadButton = panel.querySelector('[data-pmd-floor-table-qr-download]');
    var locationId = asInt(root.getAttribute('data-pmd-floor-table-manager-location'), 0);
    var busy = false;
    var currentMode = 'create';

    // PMD_FLOOR_TABLE_MANAGER_EVENT_BRIDGE_V1_3
    function emitManagerEvent(name, detail) {
      var eventDetail = detail && typeof detail === 'object' ? detail : {};
      eventDetail.root = root;
      eventDetail.panel = panel;
      window.dispatchEvent(new CustomEvent(name, { detail: eventDetail }));
      return eventDetail;
    }

    function field(name) {
      return panel.querySelector('[data-pmd-floor-table-field="' + name + '"]');
    }

    function featureFields() {
      return Array.prototype.slice.call(panel.querySelectorAll('[data-pmd-floor-table-feature]'));
    }

    function managedFeatureValues(value) {
      var list = value;
      if (typeof list === 'string') {
        try { list = JSON.parse(list); }
        catch (error) { list = []; }
      }
      if (!Array.isArray(list)) list = [];

      var allowed = ['near_window', 'quiet_area', 'accessible'];
      var normalized = list.map(function (item) {
        return asText(item).replace(/\s+/g, ' ').trim().toLowerCase();
      });

      return allowed.filter(function (feature) {
        return normalized.indexOf(feature) !== -1;
      });
    }

    function selectedFeatures() {
      return managedFeatureValues(
        featureFields()
          .filter(function (node) { return node.checked; })
          .map(function (node) { return node.value; })
      );
    }

    function setFeatureValues(values) {
      var selected = managedFeatureValues(values);
      featureFields().forEach(function (node) {
        var value = asText(node.value).replace(/\s+/g, ' ').trim().toLowerCase();
        node.checked = selected.indexOf(value) !== -1;
      });
    }

    function state() {
      return root.__pmdFloorV1 && typeof root.__pmdFloorV1.getState === 'function'
        ? root.__pmdFloorV1.getState()
        : null;
    }

    function selectedTable() {
      var current = state();
      if (!current || !current.selectedDisplayId || !Array.isArray(current.displayTables)) return null;
      return current.displayTables.find(function (table) {
        return String(table && table.id) === String(current.selectedDisplayId);
      }) || null;
    }

    function syncToolbar() {
      var current = state();
      var selected = selectedTable();
      var layoutEditing = Boolean(current && current.editing);
      var editable = Boolean(
        selected
        && !selected.isMergedView
        && asInt(selected.dbTableId, 0) > 0
        && !layoutEditing
      );

      editButton.disabled = !editable;
      addButton.disabled = layoutEditing;
      editButton.setAttribute('aria-disabled', editable ? 'false' : 'true');
    }

    function setBusy(next) {
      busy = Boolean(next);
      panel.setAttribute('aria-busy', busy ? 'true' : 'false');
      saveButton.disabled = busy;
      if (deleteButton) deleteButton.disabled = busy;
      Array.prototype.forEach.call(form.querySelectorAll('input,select,textarea'), function (node) {
        if (node === field('table_no') && node.getAttribute('data-number-locked') === '1') {
          node.disabled = true;
          return;
        }
        node.disabled = busy;
      });
      loading.hidden = !busy;
      saveButton.textContent = busy
        ? (panel.getAttribute('data-saving-label') || 'Saving…')
        : (panel.getAttribute('data-save-label') || 'Save table');
    }

    function clearErrors() {
      errorBox.hidden = true;
      errorBox.innerHTML = '';
      Array.prototype.forEach.call(form.querySelectorAll('.has-pmd-floor-table-error'), function (node) {
        node.classList.remove('has-pmd-floor-table-error');
      });
    }

    function showError(error) {
      clearErrors();
      var payload = error && error.payload ? error.payload : {};
      var errors = payload && payload.errors && typeof payload.errors === 'object'
        ? payload.errors
        : null;
      var messages = [];

      if (errors) {
        Object.keys(errors).forEach(function (name) {
          var node = field(name);
          if (node) node.classList.add('has-pmd-floor-table-error');
          var rows = Array.isArray(errors[name]) ? errors[name] : [errors[name]];
          rows.forEach(function (message) {
            if (message) messages.push(asText(message));
          });
        });
      }

      if (!messages.length) {
        messages.push(asText((payload && payload.message) || (error && error.message) || 'Could not save the table.'));
      }

      errorBox.innerHTML = messages.map(function (message) {
        return '<span>' + message.replace(/[&<>"']/g, function (char) {
          return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char];
        }) + '</span>';
      }).join('');
      errorBox.hidden = false;
    }

    function setValue(name, value) {
      var node = field(name);
      if (!node) return;
      if (node.type === 'checkbox') {
        node.checked = Boolean(value);
      } else {
        node.value = value === null || value === undefined ? '' : String(value);
      }
    }

    function applyTable(table, mode) {
      currentMode = mode === 'edit' ? 'edit' : 'create';
      clearErrors();

      if (deleteButton) {
        deleteButton.hidden = !(
          currentMode === 'edit'
          && table
          && table.deletable !== false
          && asInt(table.table_id, 0) > 0
        );
        deleteButton.textContent = panel.getAttribute('data-delete-label') || 'Remove table';
      }

      var numberField = field('table_no');
      var locked = Boolean(table && table.number_locked);
      if (numberField) {
        numberField.type = locked ? 'text' : 'number';
        numberField.setAttribute('inputmode', locked ? 'text' : 'numeric');
        if (locked) {
          numberField.removeAttribute('min');
          numberField.removeAttribute('step');
        } else {
          numberField.setAttribute('min', '1');
          numberField.setAttribute('step', '1');
        }
      }

      [
        'table_id', 'table_no', 'table_section', 'floor_name', 'floor_shape',
        'min_capacity', 'preferred_capacity', 'max_capacity', 'extra_capacity',
        'priority', 'reservation_priority', 'floor_notes', 'table_status',
        'reservable', 'visible_on_floor_plan', 'is_joinable'
      ].forEach(function (name) {
        setValue(name, table ? table[name] : '');
      });
      setFeatureValues(table ? table.table_features : []);

      numberField.setAttribute('data-number-locked', locked ? '1' : '0');
      numberField.disabled = locked;
      numberLock.hidden = !locked;

      title.textContent = currentMode === 'edit'
        ? (panel.getAttribute('data-edit-title') || 'Edit table')
        : (panel.getAttribute('data-create-title') || 'Create new table');
      subtitle.textContent = currentMode === 'edit'
        ? (panel.getAttribute('data-edit-subtitle') || '')
        : (panel.getAttribute('data-create-subtitle') || '');

      emitManagerEvent('pmd:floor:table-manager:loaded', {
        table: table || {},
        mode: currentMode
      });
    }

    function openPanel(mode, tableId) {
      if (busy) return;
      panel.hidden = false;
      document.documentElement.classList.add('pmd-floor-table-manager-open');
      clearErrors();
      setBusy(true);

      request(root, 'onPmdFloorTableManagerLoad', {
        location_id: locationId,
        table_id: asInt(tableId, 0)
      }).then(function (payload) {
        applyTable(payload.table || {}, payload.mode || mode);
        setBusy(false);
        var numberField = field('table_no');
        if (numberField && !numberField.disabled) numberField.focus();
      }).catch(function (error) {
        setBusy(false);
        showError(error);
      });
    }

    function closePanel() {
      if (busy) return;
      panel.hidden = true;
      document.documentElement.classList.remove('pmd-floor-table-manager-open');
      clearErrors();
      syncToolbar();
    }

    function payload() {
      function integerValue(name) {
        var node = field(name);
        return node && node.value !== '' ? asInt(node.value, 0) : null;
      }
      function checked(name) {
        var node = field(name);
        return Boolean(node && node.checked);
      }
      return {
        location_id: locationId,
        table: {
          table_id: asInt(field('table_id').value, 0),
          table_no: field('table_no').value,
          table_section: field('table_section').value.trim(),
          floor_name: field('floor_name').value.trim(),
          floor_shape: field('floor_shape').value,
          min_capacity: integerValue('min_capacity'),
          preferred_capacity: integerValue('preferred_capacity'),
          max_capacity: integerValue('max_capacity'),
          extra_capacity: integerValue('extra_capacity'),
          priority: integerValue('priority'),
          reservation_priority: integerValue('reservation_priority'),
          floor_notes: field('floor_notes').value.trim(),
          table_features: selectedFeatures(),
          table_status: checked('table_status'),
          reservable: checked('reservable'),
          visible_on_floor_plan: checked('visible_on_floor_plan'),
          is_joinable: checked('is_joinable')
        }
      };
    }

    function downloadQr() {
      if (!qrDownloadButton || qrDownloadButton.disabled) return;
      var tableId = asInt(field('table_id') && field('table_id').value, 0);
      if (tableId < 1) return;

      var originalText = qrDownloadButton.textContent;
      qrDownloadButton.disabled = true;
      qrDownloadButton.textContent = panel.getAttribute('data-qr-downloading-label') || 'Preparing…';

      request(root, 'onPmdFloorTableManagerQrDownload', {
        location_id: locationId,
        table_id: tableId
      }).then(function (payload) {
        if (!payload || !payload.data_url) throw new Error('QR download data is unavailable.');
        var link = document.createElement('a');
        link.href = payload.data_url;
        link.download = payload.filename || ('paymydine-table-' + tableId + '-qr.png');
        document.body.appendChild(link);
        link.click();
        link.remove();
      }).catch(function (error) {
        showError(error);
      }).then(function () {
        qrDownloadButton.disabled = false;
        qrDownloadButton.textContent = originalText;
      });
    }

    // PMD_FLOOR_TABLE_DELETE_R36B
    function removeTable() {
      if (busy || !deleteButton || deleteButton.hidden) return;

      var tableId = asInt(field('table_id') && field('table_id').value, 0);
      if (tableId < 1) return;

      var confirmText = panel.getAttribute('data-delete-confirm')
        || 'Remove this table permanently?';
      if (!window.confirm(confirmText)) return;

      clearErrors();
      setBusy(true);
      deleteButton.textContent = panel.getAttribute('data-deleting-label') || 'Removing…';

      request(root, 'onPmdFloorTableManagerDelete', {
        location_id: locationId,
        table_id: tableId
      })
        .then(function (responsePayload) {
          emitManagerEvent('pmd:floor:table-manager:deleted', {
            payload: responsePayload || {},
            table_id: tableId
          });

          var instance = root.__pmdFloorV1;
          if (instance && typeof instance.refresh === 'function') {
            return Promise.resolve(instance.refresh()).then(function () {
              return responsePayload;
            });
          }

          return responsePayload;
        })
        .then(function () {
          setBusy(false);
          closePanel();
          syncToolbar();
        })
        .catch(function (error) {
          setBusy(false);
          deleteButton.textContent = panel.getAttribute('data-delete-label') || 'Remove table';
          showError(error);
        });
    }

    function save() {
      if (busy) return;
      clearErrors();
      setBusy(true);

      request(root, 'onPmdFloorTableManagerSave', payload())
        .then(function (responsePayload) {
          var detail = emitManagerEvent('pmd:floor:table-manager:saved', {
            payload: responsePayload || {},
            mode: currentMode,
            refreshHandled: false
          });

          if (detail.refreshHandled) {
            if (detail.afterSave && typeof detail.afterSave.then === 'function') {
              return Promise.resolve(detail.afterSave).then(function () {
                return responsePayload;
              });
            }
            return responsePayload;
          }

          var instance = root.__pmdFloorV1;
          if (instance && typeof instance.refresh === 'function') {
            return Promise.resolve(instance.refresh()).then(function () {
              return responsePayload;
            });
          }

          return responsePayload;
        })
        .then(function () {
          setBusy(false);
          closePanel();
          syncToolbar();
        })
        .catch(function (error) {
          setBusy(false);
          showError(error);
        });
    }

    addButton.addEventListener('click', function () {
      syncToolbar();
      if (addButton.disabled) return;
      openPanel('create', 0);
    });

    editButton.addEventListener('click', function () {
      syncToolbar();
      var selected = selectedTable();
      if (!selected || selected.isMergedView || asInt(selected.dbTableId, 0) < 1) {
        return;
      }
      openPanel('edit', asInt(selected.dbTableId, 0));
    });

    saveButton.addEventListener('click', save);
    if (deleteButton) deleteButton.addEventListener('click', removeTable);
    if (qrDownloadButton) qrDownloadButton.addEventListener('click', downloadQr);

    panel.querySelectorAll('[data-pmd-floor-table-manager-close]').forEach(function (button) {
      button.addEventListener('click', closePanel);
    });

    root.addEventListener('click', function (event) {
      if (
        event.target.closest('[data-floor-table]')
        || event.target.closest('[data-pmd-r2-tool="edit"]')
        || event.target.closest('[data-floor-edit]')
      ) {
        syncToolbar();
      }
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && !panel.hidden && !busy) closePanel();
    });

    syncToolbar();
    root.__pmdInlineTableManagerV1 = {
      openCreate: function () { openPanel('create', 0); },
      openSelected: function () {
        var selected = selectedTable();
        if (selected && !selected.isMergedView && asInt(selected.dbTableId, 0) > 0) {
          openPanel('edit', asInt(selected.dbTableId, 0));
        }
      },
      audit: function () {
        var selected = selectedTable();
        return {
          ready: true,
          role: root.getAttribute('data-pmd-floor-table-manager-role'),
          locationId: locationId,
          selectedDisplayId: selected ? selected.id : null,
          selectedDbTableId: selected ? selected.dbTableId : null,
          qrFieldsInPanel: panel.querySelectorAll('[name*="qr"],[data-pmd-floor-table-field*="qr"]').length,
          endpoint: root.getAttribute('data-pmd-floor-table-manager-url'),
          eventBridge: true,
          featureOptions: featureFields().length,
          qrDownload: Boolean(qrDownloadButton),
          featureScopeLocal: true,
          modalPortal: panel.parentElement === document.body,
          modalOwner: panel.getAttribute('data-pmd-floor-table-manager-owner')
        };
      }
    };
  }

  function mount(scope) {
    Array.prototype.slice.call((scope || document).querySelectorAll('[data-pmd-floor-table-manager="true"]'))
      .forEach(boot);
  }

  window.PMDFloorInlineTableManagerV1 = {
    version: '1.2.1',
    mount: mount,
    audit: function () {
      var root = document.querySelector('[data-pmd-floor-table-manager="true"]');
      return root && root.__pmdInlineTableManagerV1
        ? root.__pmdInlineTableManagerV1.audit()
        : { ready: false };
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { mount(document); }, { once: true });
  } else {
    mount(document);
  }
})();

/* PMD_FLOOR_PAGE_WHEEL_AUTHORITY_R62_START */
(function () {
  'use strict';

  if (window.PMDFloorPageWheelR62) {
    return;
  }

  var FLOOR_SELECTOR = '[data-floor-scroll]';

  function deltaY(event) {
    var value = Number(event.deltaY || 0);

    if (event.deltaMode === 1) {
      value *= 16;
    } else if (event.deltaMode === 2) {
      value *= Math.max(
        Number(window.innerHeight || 0),
        600
      );
    }

    return value;
  }

  function canScroll(node) {
    if (!node) {
      return false;
    }

    return (
      Number(node.scrollHeight || 0) >
      Number(node.clientHeight || 0) + 1
    );
  }

  function shellCandidates() {
    var result = [];
    var seen = [];

    [
      document.scrollingElement,
      document.documentElement,
      document.body,
      document.querySelector('.page-wrapper'),
      document.querySelector('.page-content'),
      document.querySelector('.content-wrapper'),
      document.querySelector('.container-fluid')
    ].forEach(function (node) {
      if (
        !node ||
        seen.indexOf(node) !== -1
      ) {
        return;
      }

      seen.push(node);

      if (canScroll(node)) {
        result.push(node);
      }
    });

    return result;
  }

  function chooseScroller() {
    var candidates =
      shellCandidates();

    if (!candidates.length) {
      return null;
    }

    var active =
      candidates.find(function (node) {
        return Number(node.scrollTop || 0) > 0;
      });

    if (active) {
      return active;
    }

    candidates.sort(function (a, b) {
      var aRange =
        Number(a.scrollHeight || 0) -
        Number(a.clientHeight || 0);

      var bRange =
        Number(b.scrollHeight || 0) -
        Number(b.clientHeight || 0);

      return bRange - aRange;
    });

    return candidates[0];
  }

  function movePage(delta) {
    var before =
      Number(window.scrollY || window.pageYOffset || 0);

    window.scrollBy(
      0,
      delta
    );

    var after =
      Number(window.scrollY || window.pageYOffset || 0);

    if (after !== before) {
      return true;
    }

    var scroller =
      chooseScroller();

    if (!scroller) {
      return false;
    }

    var old =
      Number(scroller.scrollTop || 0);

    var max =
      Math.max(
        0,
        Number(scroller.scrollHeight || 0) -
        Number(scroller.clientHeight || 0)
      );

    var next =
      Math.max(
        0,
        Math.min(
          max,
          old + delta
        )
      );

    scroller.scrollTop =
      next;

    return (
      Number(scroller.scrollTop || 0) !== old
    );
  }

  function onWheel(event) {
    var target =
      event.target;

    if (
      !target ||
      !target.closest
    ) {
      return;
    }

    var floor =
      target.closest(
        FLOOR_SELECTOR
      );

    if (!floor) {
      return;
    }

    if (
      event.ctrlKey ||
      event.metaKey
    ) {
      return;
    }

    /*
     * Shift+wheel and dominant deltaX are deliberate horizontal Floor
     * navigation and remain native.
     */
    var x =
      Math.abs(
        Number(event.deltaX || 0)
      );

    var y =
      Math.abs(
        Number(event.deltaY || 0)
      );

    if (
      event.shiftKey ||
      (x > y && x > 0)
    ) {
      return;
    }

    var amount =
      deltaY(event);

    if (!amount) {
      return;
    }

    /*
     * Window capture runs before the Floor's own wheel handlers/native
     * scroll container, so vertical wheel cannot get trapped by Floor.
     */
    event.preventDefault();
    event.stopImmediatePropagation();

    movePage(amount);
  }

  window.addEventListener(
    'wheel',
    onWheel,
    {
      capture: true,
      passive: false
    }
  );

  window.PMDFloorPageWheelR62 = {
    version: '2.0.0-r62',

    audit: function () {
      var scroller =
        chooseScroller();

      return {
        version: '2.0.0-r62',

        captureTarget:
          'window',

        floorScrollCount:
          document.querySelectorAll(
            FLOOR_SELECTOR
          ).length,

        selectedScroller:
          scroller
            ? (
                scroller.id ||
                scroller.className ||
                scroller.tagName
              )
            : null,

        scrollTop:
          scroller
            ? Math.round(
                Number(scroller.scrollTop || 0)
              )
            : Math.round(
                Number(window.scrollY || 0)
              ),

        scrollHeight:
          scroller
            ? Math.round(
                Number(scroller.scrollHeight || 0)
              )
            : null,

        clientHeight:
          scroller
            ? Math.round(
                Number(scroller.clientHeight || 0)
              )
            : null,

        verticalWheel:
          'page',

        horizontalGesture:
          'floor',

        touch:
          'untouched'
      };
    }
  };
})();
/* PMD_FLOOR_PAGE_WHEEL_AUTHORITY_R62_END */

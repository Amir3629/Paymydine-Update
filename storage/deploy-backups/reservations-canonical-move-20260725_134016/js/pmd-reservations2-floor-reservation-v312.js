(function () {
  'use strict';

  var VERSION = '3.1.4';

  var FLOOR_ID =
    'pmd-r2-shared-floor-canvas-v310';

  var TIME_CLASS =
    'pmd-r2-reservation-time-v312';

  var observer = null;
  var applying = false;
  var scheduled = false;

  function floor() {
    return document.getElementById(
      FLOOR_ID
    );
  }

  function reservations() {
    var boot =
      window.PMD_RESERVATIONS2_BOOT || {};

    return Array.isArray(
      boot.reservations
    )
      ? boot.reservations
      : [];
  }

  function number(value) {
    var parsed = Number(value);

    return Number.isFinite(parsed)
      ? parsed
      : 0;
  }

  function validTableId(value) {
    var id = number(value);

    return id > 0
      ? String(id)
      : null;
  }

  function reservationTableIds(item) {
    var result = [];
    var direct =
      validTableId(item && item.table_id);

    if (direct) {
      result.push(direct);
    }

    if (
      item &&
      Array.isArray(item.tables)
    ) {
      item.tables.forEach(function (table) {
        var id =
          validTableId(
            table && typeof table ===
              'object'
              ? (
                  table.table_id ||
                  table.id
                )
              : table
          );

        if (id) {
          result.push(id);
        }
      });
    }

    return Array.from(
      new Set(result)
    );
  }

  function parseDate(value) {
    if (!value) {
      return null;
    }

    var date = new Date(value);

    return Number.isNaN(date.getTime())
      ? null
      : date;
  }

  function reservationStart(item) {
    var direct =
      parseDate(
        item.reservation_datetime
      );

    if (direct) {
      return direct;
    }

    var dateValue =
      item.reserve_date;

    if (!dateValue) {
      return null;
    }

    var date = parseDate(dateValue);

    if (!date) {
      return null;
    }

    var rawTime =
      String(
        item.reserve_time || '00:00:00'
      );

    var parts =
      rawTime
        .split(':')
        .map(number);

    date.setHours(
      parts[0] || 0,
      parts[1] || 0,
      parts[2] || 0,
      0
    );

    return date;
  }

  function reservationEnd(
    item,
    start
  ) {
    var direct =
      parseDate(
        item.reservation_end_datetime
      );

    if (direct) {
      return direct;
    }

    if (!start) {
      return null;
    }

    var duration =
      number(item.duration) || 45;

    return new Date(
      start.getTime() +
      duration * 60 * 1000
    );
  }

  function formatTime(date) {
    if (!date) {
      return '';
    }

    try {
      return new Intl.DateTimeFormat(
        undefined,
        {
          hour: '2-digit',
          minute: '2-digit'
        }
      ).format(date);
    } catch (error) {
      return date
        .toTimeString()
        .slice(0, 5);
    }
  }

  function buildAssignments() {
    var now = new Date();
    var result = new Map();

    reservations().forEach(function (item) {
      var tableIds =
        reservationTableIds(item);

      if (!tableIds.length) {
        return;
      }

      var start =
        reservationStart(item);

      var end =
        reservationEnd(item, start);

      if (!start || !end) {
        return;
      }

      /*
       * Ignore reservations that already finished.
       */
      if (end <= now) {
        return;
      }

      var state =
        start <= now && end > now
          ? 'busy'
          : 'upcoming';

      tableIds.forEach(function (tableId) {
        var current =
          result.get(tableId);

        /*
         * An active reservation always has priority over
         * a later upcoming reservation.
         */
        if (
          current &&
          current.state === 'busy'
        ) {
          return;
        }

        if (
          current &&
          current.start <= start &&
          state !== 'busy'
        ) {
          return;
        }

        result.set(
          tableId,
          {
            state: state,
            start: start,
            end: end,
            customer:
              item.customer_name ||
              [
                item.first_name,
                item.last_name
              ]
                .filter(Boolean)
                .join(' '),

            reservationId:
              item.reservation_id
          }
        );
      });
    });

    return result;
  }

  function tableMemberIds(element) {
    var ids = [];

    var own =
      validTableId(
        element.dataset.floorTable
      );

    if (own) {
      ids.push(own);
    }

    String(
      element.dataset.floorMembers || ''
    )
      .split(',')
      .forEach(function (value) {
        var id =
          validTableId(value.trim());

        if (id) {
          ids.push(id);
        }
      });

    return Array.from(
      new Set(ids)
    );
  }

  function operationalBusy(element) {
    var status =
      String(
        element.dataset.status || ''
      ).toLowerCase();

    if (
      status === 'occupied' ||
      status === 'reserved' ||
      status === 'cleaning'
    ) {
      return true;
    }

    /*
     * Attention alone may only mean a waiter call or note,
     * so it must not make the Reservations map orange/red.
     * A cleaning badge, however, means the table is not free.
     */
    return Boolean(
      element.querySelector(
        '.pmd-floor-v1__badge.is-clean'
      )
    );
  }

  function removeTimeLabel(element) {
    element
      .querySelectorAll(
        '.' + TIME_CLASS
      )
      .forEach(function (label) {
        label.remove();
      });
  }

  function addTimeLabel(
    element,
    assignment
  ) {
    removeTimeLabel(element);

    if (!assignment) {
      return;
    }

    var label =
      document.createElement('span');

    label.className = TIME_CLASS;

    label.textContent =
      assignment.state === 'busy'
        ? 'Reserved now'
        : (
            'Upcoming ' +
            formatTime(
              assignment.start
            )
          );

    element.appendChild(label);
  }

  function strongestAssignment(
    element,
    assignments
  ) {
    var found = null;

    tableMemberIds(element)
      .forEach(function (id) {
        var candidate =
          assignments.get(id);

        if (!candidate) {
          return;
        }

        if (
          !found ||
          candidate.state === 'busy' ||
          candidate.start < found.start
        ) {
          found = candidate;
        }
      });

    return found;
  }

  function applyTable(
    element,
    assignments
  ) {
    var assignment =
      strongestAssignment(
        element,
        assignments
      );

    var state;

    if (
      assignment &&
      assignment.state === 'busy'
    ) {
      state = 'busy';
    } else if (
      operationalBusy(element)
    ) {
      state = 'busy';
    } else if (assignment) {
      state = 'upcoming';
    } else {
      state = 'free';
    }

    if (
      element.dataset
        .pmdR2ReservationState !== state
    ) {
      element.dataset
        .pmdR2ReservationState = state;
    }

    addTimeLabel(
      element,
      assignment
    );

    var baseLabel =
      element.dataset
        .pmdR2BaseAriaLabel;

    if (!baseLabel) {
      baseLabel =
        element.getAttribute(
          'aria-label'
        ) || 'Table';

      baseLabel =
        baseLabel.split(' — ')[0];

      element.dataset
        .pmdR2BaseAriaLabel =
          baseLabel;
    }

    var stateLabel =
      state === 'busy'
        ? 'Reserved or occupied'
        : state === 'upcoming'
          ? (
              'Upcoming reservation at ' +
              formatTime(
                assignment &&
                assignment.start
              )
            )
          : 'Free';

    element.setAttribute(
      'aria-label',
      baseLabel +
      ' — ' +
      stateLabel
    );
  }

  function cleanControls(pageFloor) {
    /*
     * The Floor engine generates this toolbar dynamically.
     * CSS determines visibility; these labels make its purpose
     * clearer on the Reservations page.
     */
    var strip =
      pageFloor.querySelector(
        '[data-floor-strip]'
      );

    if (strip) {
      strip.title =
        strip.getAttribute(
          'aria-pressed'
        ) === 'true'
          ? 'Show full Floor map'
          : 'Show tables in one row';
    }

    var edit =
      pageFloor.querySelector(
        '[data-floor-edit]'
      );

    if (edit) {
      edit.title =
        'Edit Floor layout';
    }
  }

  function firstCard(index) {
    var cards =
      document.querySelectorAll(
        '#pmd-r2-reservation-kpis-v307 ' +
        '.pmd-r2-v308-card'
      );

    return cards[index] || null;
  }

  function computedColor(
    element,
    property,
    fallback
  ) {
    if (!element) {
      return fallback;
    }

    var value =
      window.getComputedStyle(
        element
      )[property];

    return value &&
      value !== 'rgba(0, 0, 0, 0)' &&
      value !== 'transparent'
        ? value
        : fallback;
  }

  function syncKpiColors(pageFloor) {
    var greenCard = firstCard(0);
    var orangeCard = firstCard(1);
    var redCard = firstCard(3);

    var green =
      computedColor(
        greenCard,
        'backgroundColor',
        '#21c970'
      );

    var orange =
      computedColor(
        orangeCard,
        'backgroundColor',
        '#ff8512'
      );

    var red =
      computedColor(
        redCard,
        'backgroundColor',
        '#ff3c52'
      );

    var greenBorder =
      computedColor(
        greenCard,
        'borderTopColor',
        '#087846'
      );

    var orangeBorder =
      computedColor(
        orangeCard,
        'borderTopColor',
        '#ad4c00'
      );

    var redBorder =
      computedColor(
        redCard,
        'borderTopColor',
        '#b40f2c'
      );

    pageFloor.style.setProperty(
      '--pmd-r2-free-bg',
      green
    );

    pageFloor.style.setProperty(
      '--pmd-r2-free-border',
      greenBorder
    );

    pageFloor.style.setProperty(
      '--pmd-r2-upcoming-bg',
      orange
    );

    pageFloor.style.setProperty(
      '--pmd-r2-upcoming-border',
      orangeBorder
    );

    pageFloor.style.setProperty(
      '--pmd-r2-busy-bg',
      red
    );

    pageFloor.style.setProperty(
      '--pmd-r2-busy-border',
      redBorder
    );

    pageFloor.dataset
      .pmdR2KpiColorsSynced = 'true';
  }

  function ensureToolbar(pageFloor) {
    var statusbar =
      pageFloor.querySelector(
        '.pmd-floor-v1__statusbar'
      );

    if (!statusbar) {
      return;
    }

    var canonical =
      statusbar.querySelector(
        '[data-pmd-r2-floor-toolbar-v313]'
      );

    /*
     * Remove every Floor-generated secondary toolbar.
     * Only the Reservations toolbar remains.
     */
    statusbar
      .querySelectorAll(
        [
          '[data-floor-secondary-toolbar]',
          '.pmd-floor-v1__secondary-toolbar'
        ].join(',')
      )
      .forEach(function (toolbar) {
        if (
          toolbar !== canonical &&
          !toolbar.hasAttribute(
            'data-pmd-r2-floor-toolbar-v313'
          )
        ) {
          toolbar.remove();
        }
      });

    /*
     * Remove operational controls if another Floor runtime
     * injects them directly into the status bar.
     */
    statusbar
      .querySelectorAll(
        [
          '[data-floor-mother-action]',
          '[data-floor-merge]',
          '[data-floor-fullscreen]',
          '[data-floor-refresh]'
        ].join(',')
      )
      .forEach(function (control) {
        if (
          !canonical ||
          !canonical.contains(control)
        ) {
          control.remove();
        }
      });

    /*
     * Keep only one canonical Reservations toolbar.
     */
    var canonicalToolbars =
      statusbar.querySelectorAll(
        '[data-pmd-r2-floor-toolbar-v313]'
      );

    if (canonicalToolbars.length > 1) {
      Array.prototype
        .slice.call(
          canonicalToolbars,
          1
        )
        .forEach(function (toolbar) {
          toolbar.remove();
        });
    }
  }

  function apply() {
    if (applying) {
      return;
    }

    var pageFloor = floor();

    if (!pageFloor) {
      return;
    }

    applying = true;

    try {
      syncKpiColors(pageFloor);
      ensureToolbar(pageFloor);

      var assignments =
        buildAssignments();

      pageFloor
        .querySelectorAll(
          '[data-floor-table]'
        )
        .forEach(function (element) {
          applyTable(
            element,
            assignments
          );
        });

      cleanControls(pageFloor);

      pageFloor.setAttribute(
        'data-pmd-r2-reservation-floor',
        'v312'
      );

      pageFloor.setAttribute(
        'data-pmd-r2-assigned-reservations',
        String(assignments.size)
      );
    } finally {
      applying = false;
    }
  }

  function schedule() {
    if (scheduled) {
      return;
    }

    scheduled = true;

    window.requestAnimationFrame(
      function () {
        scheduled = false;
        apply();
      }
    );
  }

  function boot() {
    var pageFloor = floor();

    if (!pageFloor) {
      return;
    }

    apply();

    observer =
      new MutationObserver(
        schedule
      );

    observer.observe(
      pageFloor,
      {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: [
          'data-status',
          'data-floor-members',
          'aria-pressed',
          'class'
        ]
      }
    );

    [
      50,
      150,
      350,
      700,
      1500,
      3000,
      5000
    ].forEach(function (delay) {
      window.setTimeout(
        schedule,
        delay
      );
    });

    /*
     * Reservation time can cross from upcoming into active
     * while the page remains open.
     */
    window.setInterval(
      schedule,
      60 * 1000
    );

    console.info(
      '[PMD Reservations2 Reservation Floor V3.1.4] Ready',
      {
        tables:
          pageFloor.querySelectorAll(
            '[data-floor-table]'
          ).length,

        reservations:
          reservations().length,

        assignedReservations:
          buildAssignments().size,

        note:
          buildAssignments().size
            ? 'Reservation table assignments detected.'
            : 'No reservation currently has a table assignment.'
      }
    );
  }

  window.PMDReservations2FloorV312 = {
    version: VERSION,
    refresh: schedule
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

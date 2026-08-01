(function () {
  'use strict';

  var FILTER_ID = 'pmd-r2-date-filter-v317';
  var WRAP_ID = 'pmd-r2-date-popover-v318';
  var BUTTON_ID = 'pmd-r2-date-button-v318';
  var PANEL_ID = 'pmd-r2-date-panel-v318';
  var applying = false;
  var bound = false;

  function panel() {
    return document.getElementById(FILTER_ID);
  }

  function textOf(node) {
    return String(node && node.textContent || '').replace(/\s+/g, ' ').trim();
  }

  function findActionBar(filter) {
    if (filter && filter.parentElement) {
      var parent = filter.parentElement;
      if (parent.querySelector('a,button')) return parent;
    }

    return document.querySelector(
      '.pmd-r2__hero-actions, ' +
      '.pmd-r2-clean-header__actions, ' +
      '[data-pmd-header-actions]'
    );
  }

  function directChildren(actions) {
    return Array.prototype.slice.call(actions ? actions.children : []);
  }

  function findPlusAction(actions, filter) {
    return directChildren(actions).find(function (node) {
      if (node.id === WRAP_ID || (filter && filter.contains(node))) return false;
      var label = String(
        node.getAttribute && (
          node.getAttribute('aria-label') ||
          node.getAttribute('title') ||
          textOf(node)
        ) || ''
      ).toLowerCase();

      return label === '+' ||
        label === '＋' ||
        label.indexOf('new reservation') !== -1 ||
        label.indexOf('create reservation') !== -1 ||
        (node.classList && node.classList.contains('pmd-r2__new'));
    }) || null;
  }

  function findNotificationAction(actions, filter) {
    return directChildren(actions).find(function (node) {
      if (node.id === WRAP_ID || (filter && filter.contains(node))) return false;

      var label = String(
        node.getAttribute && (
          node.getAttribute('aria-label') ||
          node.getAttribute('title')
        ) || ''
      ).toLowerCase();

      return label.indexOf('notification') !== -1 ||
        Boolean(node.querySelector && node.querySelector(
          '.fa-bell, .ti-bell, [class*="bell"], [data-notification], .notification-badge, .badge'
        ));
    }) || null;
  }

  function enforceOrder(actions, filter, wrap) {
    if (!actions || !wrap) return;

    actions.classList.add('pmd-r2-header-actions-v318');

    var plus = findPlusAction(actions, filter);
    var notification = findNotificationAction(actions, filter);

    wrap.style.setProperty('order', '1', 'important');
    wrap.setAttribute('data-pmd-r2-header-order', 'calendar');

    if (plus) {
      plus.style.setProperty('order', '2', 'important');
      plus.setAttribute('data-pmd-r2-header-order', 'plus');
    }

    if (notification) {
      notification.style.setProperty('order', '3', 'important');
      notification.setAttribute('data-pmd-r2-header-order', 'notification');
    }
  }

  function summaryText(filter) {
    var summary = filter && filter.querySelector('[data-date-summary]');
    return summary ? textOf(summary) : 'Reservation date';
  }

  function close() {
    var wrap = document.getElementById(WRAP_ID);
    var button = document.getElementById(BUTTON_ID);
    if (wrap) wrap.classList.remove('is-open');
    if (button) button.setAttribute('aria-expanded', 'false');
  }

  function toggle() {
    var wrap = document.getElementById(WRAP_ID);
    var button = document.getElementById(BUTTON_ID);
    if (!wrap || !button) return;
    var open = !wrap.classList.contains('is-open');
    wrap.classList.toggle('is-open', open);
    button.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  function createShell(actions, filter) {
    var existing = document.getElementById(WRAP_ID);
    if (existing) {
      enforceOrder(actions, filter, existing);
      return existing;
    }

    var wrap = document.createElement('div');
    wrap.id = WRAP_ID;
    wrap.className = 'pmd-r2-date-popover-v318';

    var trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.id = BUTTON_ID;
    trigger.className = 'pmd-r2-date-trigger-v318';
    trigger.setAttribute('aria-haspopup', 'dialog');
    trigger.setAttribute('aria-expanded', 'false');
    trigger.setAttribute('aria-controls', PANEL_ID);
    trigger.setAttribute('aria-label', 'Choose reservation date range');
    trigger.innerHTML =
      '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" ' +
      'stroke="currentColor" stroke-width="2" stroke-linecap="round" ' +
      'stroke-linejoin="round">' +
      '<rect x="3" y="5" width="18" height="16" rx="2"></rect>' +
      '<path d="M16 3v4M8 3v4M3 11h18"></path>' +
      '</svg><span>Date</span>';

    var card = document.createElement('div');
    card.id = PANEL_ID;
    card.className = 'pmd-r2-date-card-v318';
    card.setAttribute('role', 'dialog');
    card.setAttribute('aria-label', 'Reservation date range');

    var head = document.createElement('div');
    head.className = 'pmd-r2-date-card-head-v318';
    head.innerHTML =
      '<div><strong>Reservation period</strong>' +
      '<span>Choose a quick range or custom dates</span></div>' +
      '<button type="button" aria-label="Close">×</button>';

    var body = document.createElement('div');
    body.className = 'pmd-r2-date-card-body-v318';

    card.appendChild(head);
    card.appendChild(body);
    wrap.appendChild(trigger);
    wrap.appendChild(card);
    actions.appendChild(wrap);

    enforceOrder(actions, filter, wrap);

    trigger.addEventListener('click', function (event) {
      event.preventDefault();
      event.stopPropagation();
      toggle();
    });

    head.querySelector('button').addEventListener('click', function (event) {
      event.preventDefault();
      close();
    });

    card.addEventListener('click', function (event) {
      event.stopPropagation();
    });

    return wrap;
  }

  function moveFilterIntoCard(filter, wrap) {
    var body = wrap.querySelector('.pmd-r2-date-card-body-v318');
    if (!body) return;

    filter.classList.add('pmd-r2-date-original-v318');
    if (filter.parentElement !== body) body.appendChild(filter);
  }

  function sync() {
    if (applying) return;
    applying = true;

    try {
      var filter = panel();
      if (!filter) return;

      var actions = findActionBar(filter);
      if (!actions) return;

      var wrap = createShell(actions, filter);
      if (!wrap) return;

      moveFilterIntoCard(filter, wrap);
      enforceOrder(actions, filter, wrap);

      var trigger = document.getElementById(BUTTON_ID);
      if (trigger) trigger.title = summaryText(filter);

      var summary = filter.querySelector('[data-date-summary]');
      if (summary) summary.classList.add('pmd-r2-date-summary-v318');

      document.documentElement.classList.add('pmd-r2-date-popover-ready-v318');
    } finally {
      applying = false;
    }
  }

  function audit() {
    var filter = panel();
    var wrap = document.getElementById(WRAP_ID);
    var body = wrap && wrap.querySelector('.pmd-r2-date-card-body-v318');
    var trigger = document.getElementById(BUTTON_ID);
    var rect = trigger && trigger.getBoundingClientRect();

    return {
      filter: Boolean(filter),
      popover: Boolean(wrap),
      filterInsidePopover: Boolean(filter && body && body.contains(filter)),
      trigger: Boolean(trigger),
      square: Boolean(rect && Math.abs(rect.width - rect.height) < 1),
      width: rect ? Math.round(rect.width) : 0,
      height: rect ? Math.round(rect.height) : 0
    };
  }

  function boot() {
    sync();

    if (!bound) {
      bound = true;

      document.addEventListener('click', function (event) {
        var wrap = document.getElementById(WRAP_ID);
        if (wrap && !wrap.contains(event.target)) close();
      });

      document.addEventListener('keydown', function (event) {
        if (event.key === 'Escape') close();
      });
    }

    new MutationObserver(function () {
      window.requestAnimationFrame(sync);
    }).observe(document.body, {
      childList: true,
      subtree: true
    });

    [0, 50, 150, 300, 700, 1200, 2500, 5000].forEach(function (delay) {
      setTimeout(sync, delay);
    });

    console.info('[PMD Reservations2 Date Popover V3.1.8.2] Ready', audit());
  }

  window.PMDReservations2DatePopoverV318 = {
    version: '3.1.8.2',
    refresh: sync,
    close: close,
    audit: audit
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, {once: true});
  } else {
    boot();
  }
})();
/* PMD Reservations2 Calendar Right Placement V3.1.8.3 */
(function () {
  'use strict';

  var WRAP_ID = 'pmd-r2-date-popover-v318';
  var BUTTON_ID = 'pmd-r2-date-button-v318';

  function textOf(node) {
    return String(
      node && (
        node.getAttribute('aria-label') ||
        node.getAttribute('title') ||
        node.textContent
      ) || ''
    )
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  }

  function findPlusButton() {
    var candidates = Array.prototype.slice.call(
      document.querySelectorAll(
        '#pmd-reservations2 a, ' +
        '#pmd-reservations2 button'
      )
    );

    return candidates.find(function (node) {
      if (node.id === BUTTON_ID) {
        return false;
      }

      var label = textOf(node);

      return (
        label === '+' ||
        label === '＋' ||
        label.indexOf('new reservation') !== -1 ||
        label.indexOf('create reservation') !== -1 ||
        node.classList.contains('pmd-r2__new')
      );
    }) || null;
  }

  function findNotificationButton() {
    var candidates = Array.prototype.slice.call(
      document.querySelectorAll(
        '#pmd-reservations2 button, ' +
        '#pmd-reservations2 a'
      )
    );

    return candidates.find(function (node) {
      var label = textOf(node);

      return (
        label.indexOf('notification') !== -1 ||
        label.indexOf('bell') !== -1 ||
        node.querySelector(
          '.ti-bell, [class*="bell"], svg'
        ) &&
        node.querySelector(
          '.notification-count, .badge, [data-notification-count]'
        )
      );
    }) || null;
  }

  function actionParent() {
    var plus = findPlusButton();

    if (plus && plus.parentElement) {
      return plus.parentElement;
    }

    var notification = findNotificationButton();

    if (notification && notification.parentElement) {
      return notification.parentElement;
    }

    return document.querySelector(
      '.pmd-r2__hero-actions, ' +
      '.pmd-r2-clean-header__actions, ' +
      '[data-pmd-header-actions]'
    );
  }

  function moveCalendar() {
    var wrap = document.getElementById(WRAP_ID);
    var parent = actionParent();
    var plus = findPlusButton();

    if (!wrap || !parent) {
      return;
    }

    /*
     * Desired visual order from left to right:
     * Calendar | Plus | Notification
     *
     * Therefore Calendar must be inserted immediately
     * before Plus inside the right action group.
     */
    if (
      plus &&
      plus.parentElement === parent
    ) {
      if (
        wrap.parentElement !== parent ||
        wrap.nextElementSibling !== plus
      ) {
        parent.insertBefore(
          wrap,
          plus
        );
      }
    } else if (
      wrap.parentElement !== parent
    ) {
      parent.insertBefore(
        wrap,
        parent.firstChild
      );
    }

    parent.classList.add(
      'pmd-r2-header-actions-v3183'
    );

    wrap.classList.add(
      'pmd-r2-calendar-right-v3183'
    );

    var button =
      document.getElementById(
        BUTTON_ID
      );

    if (button) {
      button.setAttribute(
        'aria-label',
        'Reservation date range'
      );

      button.setAttribute(
        'title',
        'Reservation date range'
      );
    }

    document.documentElement
      .classList.add(
        'pmd-r2-calendar-right-ready-v3183'
      );
  }

  function boot() {
    moveCalendar();

    new MutationObserver(function () {
      window.requestAnimationFrame(
        moveCalendar
      );
    }).observe(
      document.body,
      {
        childList: true,
        subtree: true
      }
    );

    [
      0,
      50,
      150,
      300,
      700,
      1200,
      2500,
      5000
    ].forEach(function (delay) {
      setTimeout(
        moveCalendar,
        delay
      );
    });

    console.info(
      '[PMD Reservations2 Calendar Right V3.1.8.3] Ready',
      {
        calendar:
          Boolean(
            document.getElementById(
              WRAP_ID
            )
          ),

        plus:
          Boolean(
            findPlusButton()
          ),

        notification:
          Boolean(
            findNotificationButton()
          )
      }
    );
  }

  window.PMDReservations2CalendarRightV3183 = {
    version: '3.1.8.3',
    refresh: moveCalendar,

    audit: function () {
      var wrap =
        document.getElementById(
          WRAP_ID
        );

      var plus =
        findPlusButton();

      var notification =
        findNotificationButton();

      return {
        calendar: Boolean(wrap),
        plus: Boolean(plus),
        notification:
          Boolean(notification),

        sameParent:
          Boolean(
            wrap &&
            plus &&
            wrap.parentElement ===
              plus.parentElement
          ),

        calendarBeforePlus:
          Boolean(
            wrap &&
            plus &&
            wrap.nextElementSibling ===
              plus
          )
      };
    }
  };

  if (
    document.readyState === 'loading'
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


/* ============================================================
   PMD_DATE_RANGE_CENTER_MODAL_V2428

   - The real #pmd-r2-date-button-v430 opens the existing panel.
   - The panel is portaled to document.body.
   - Smooth centered modal with blur-only backdrop.
   - X, backdrop and Escape close it.
   - Date filtering behavior is unchanged.
   ============================================================ */

(function () {
  'use strict';

  var VERSION = '2.4.2.8';

  var DATE_BUTTON_ID =
    'pmd-r2-date-button-v430';

  var WRAP_ID =
    'pmd-r2-date-popover-v318';

  var PANEL_ID =
    'pmd-r2-date-panel-v318';

  var BACKDROP_ID =
    'pmd-r2-date-modal-backdrop-v2428';

  var OPEN_CLASS =
    'pmd-r2-date-modal-open-v2428';

  var bound = false;
  var lastFocused = null;

  function dateButton() {
    return document.getElementById(
      DATE_BUTTON_ID
    );
  }

  function wrap() {
    return document.getElementById(
      WRAP_ID
    );
  }

  function panel() {
    return document.getElementById(
      PANEL_ID
    );
  }

  function ensureBackdrop() {
    var existing =
      document.getElementById(
        BACKDROP_ID
      );

    if (existing) {
      return existing;
    }

    var backdrop =
      document.createElement('button');

    backdrop.type = 'button';
    backdrop.id = BACKDROP_ID;
    backdrop.className =
      'pmd-r2-date-modal-backdrop-v2428';

    backdrop.setAttribute(
      'aria-label',
      'Close reservation date range'
    );

    backdrop.setAttribute(
      'tabindex',
      '-1'
    );

    document.body.appendChild(
      backdrop
    );

    backdrop.addEventListener(
      'click',
      function (event) {
        event.preventDefault();
        close();
      }
    );

    return backdrop;
  }

  function portalPanel() {
    var card = panel();

    if (!card) {
      return null;
    }

    if (card.parentElement !== document.body) {
      document.body.appendChild(card);
    }

    card.setAttribute(
      'aria-modal',
      'true'
    );

    card.setAttribute(
      'data-pmd-date-modal-owner',
      'v2428'
    );

    return card;
  }

  function isOpen() {
    return document.documentElement
      .classList.contains(
        OPEN_CLASS
      );
  }

  function syncAria(open) {
    var button = dateButton();

    if (button) {
      button.setAttribute(
        'aria-expanded',
        open ? 'true' : 'false'
      );

      button.setAttribute(
        'aria-controls',
        PANEL_ID
      );

      button.setAttribute(
        'aria-haspopup',
        'dialog'
      );
    }
  }

  function open() {
    ensureBackdrop();

    var card =
      portalPanel();

    if (!card) {
      return false;
    }

    lastFocused =
      document.activeElement;

    document.documentElement
      .classList.add(
        OPEN_CLASS
      );

    document.body
      .classList.add(
        OPEN_CLASS
      );

    var container = wrap();

    if (container) {
      container.classList.add(
        'is-open'
      );
    }

    syncAria(true);

    requestAnimationFrame(
      function () {
        document.documentElement
          .classList.add(
            OPEN_CLASS + '-painted'
          );

        var firstControl =
          card.querySelector(
            'button, input, select, ' +
            'textarea, [tabindex]:not([tabindex="-1"])'
          );

        if (firstControl) {
          firstControl.focus({
            preventScroll: true
          });
        }
      }
    );

    window.dispatchEvent(
      new CustomEvent(
        'pmd:date-range-modal-opened',
        {
          detail: {
            version: VERSION
          }
        }
      )
    );

    return true;
  }

  function close() {
    if (!isOpen()) {
      return false;
    }

    document.documentElement
      .classList.remove(
        OPEN_CLASS + '-painted'
      );

    document.body
      .classList.remove(
        OPEN_CLASS + '-painted'
      );

    syncAria(false);

    window.setTimeout(
      function () {
        document.documentElement
          .classList.remove(
            OPEN_CLASS
          );

        document.body
          .classList.remove(
            OPEN_CLASS
          );

        var container = wrap();

        if (container) {
          container.classList.remove(
            'is-open'
          );
        }

        if (
          lastFocused &&
          typeof lastFocused.focus ===
            'function'
        ) {
          lastFocused.focus({
            preventScroll: true
          });
        }
      },
      220
    );

    window.dispatchEvent(
      new CustomEvent(
        'pmd:date-range-modal-closed',
        {
          detail: {
            version: VERSION
          }
        }
      )
    );

    return true;
  }

  function toggle() {
    return isOpen()
      ? close()
      : open();
  }

  function normalizeDateButton() {
    var button =
      dateButton();

    if (!button) {
      return false;
    }

    /*
     * Keep one actual text node only.
     * The duplicated ::after label is disabled by CSS.
     */
    var spans =
      Array.from(
        button.querySelectorAll(
          ':scope > span'
        )
      );

    if (spans.length > 1) {
      spans.slice(1).forEach(
        function (span) {
          span.remove();
        }
      );
    }

    button.setAttribute(
      'data-pmd-date-modal-trigger',
      'v2428'
    );

    button.setAttribute(
      'aria-expanded',
      isOpen() ? 'true' : 'false'
    );

    return true;
  }

  function bind() {
    normalizeDateButton();
    ensureBackdrop();
    portalPanel();

    if (bound) {
      return;
    }

    bound = true;

    /*
     * Capture phase prevents the older anchored-popover listener
     * from opening a second layout.
     */
    document.addEventListener(
      'click',
      function (event) {
        var trigger =
          event.target.closest &&
          event.target.closest(
            '#' + DATE_BUTTON_ID
          );

        if (trigger) {
          event.preventDefault();
          event.stopPropagation();
          event.stopImmediatePropagation();
          toggle();
          return;
        }

        var closeButton =
          event.target.closest &&
          event.target.closest(
            '#' + PANEL_ID +
            ' .pmd-r2-date-card-head-v318 button'
          );

        if (closeButton) {
          event.preventDefault();
          event.stopPropagation();
          close();
        }
      },
      true
    );

    document.addEventListener(
      'keydown',
      function (event) {
        if (
          event.key === 'Escape' &&
          isOpen()
        ) {
          event.preventDefault();
          close();
        }
      },
      true
    );

    new MutationObserver(
      function () {
        requestAnimationFrame(
          function () {
            normalizeDateButton();

            if (!isOpen()) {
              portalPanel();
            }
          }
        );
      }
    ).observe(
      document.body,
      {
        childList: true,
        subtree: true
      }
    );
  }

  window.PMDDateRangeCenterModalV2428 = {
    version: VERSION,
    open: open,
    close: close,
    toggle: toggle,

    audit: function () {
      var button =
        dateButton();

      var card =
        panel();

      var backdrop =
        document.getElementById(
          BACKDROP_ID
        );

      return {
        version: VERSION,
        button: Boolean(button),
        buttonDirectSpans:
          button
            ? button.querySelectorAll(
                ':scope > span'
              ).length
            : 0,

        panel: Boolean(card),
        panelInBody:
          Boolean(
            card &&
            card.parentElement ===
              document.body
          ),

        backdrop:
          Boolean(backdrop),

        open:
          isOpen()
      };
    }
  };

  if (
    document.readyState ===
    'loading'
  ) {
    document.addEventListener(
      'DOMContentLoaded',
      bind,
      {
        once: true
      }
    );
  } else {
    bind();
  }

  console.info(
    '[PMD Date Range Center Modal V2.4.2.8] Ready',
    window.PMDDateRangeCenterModalV2428.audit()
  );
})();

/* PMD_DATE_RANGE_CENTER_MODAL_V2428_END */


/* ============================================================
   PMD_DATE_MODAL_CLICK_BRIDGE_V2429

   V2428 moved the date panel into centered modal presentation.
   This bridge guarantees that the real visible date button
   (#pmd-r2-date-button-v430) and the internal date trigger
   (#pmd-r2-date-button-v318) both toggle the same modal wrapper.
   ============================================================ */

(function () {
  'use strict';

  var VERSION = '2.4.2.9';

  var WRAP_ID = 'pmd-r2-date-popover-v318';
  var PANEL_ID = 'pmd-r2-date-panel-v318';

  var BUTTON_SELECTORS = [
    '#pmd-r2-date-button-v430',
    '#pmd-r2-date-button-v318'
  ].join(',');

  function wrap() {
    return document.getElementById(WRAP_ID);
  }

  function panel() {
    return document.getElementById(PANEL_ID);
  }

  function buttons() {
    return Array.prototype.slice.call(
      document.querySelectorAll(
        BUTTON_SELECTORS
      )
    );
  }

  function setOpen(open) {
    var node = wrap();

    if (!node) {
      return false;
    }

    node.classList.toggle(
      'is-open',
      Boolean(open)
    );

    document.documentElement.classList.toggle(
      'pmd-r2-date-modal-open-v2429',
      Boolean(open)
    );

    document.body.classList.toggle(
      'pmd-r2-date-modal-open-v2429',
      Boolean(open)
    );

    buttons().forEach(function (button) {
      button.setAttribute(
        'aria-expanded',
        open ? 'true' : 'false'
      );
    });

    return true;
  }

  function isOpen() {
    var node = wrap();

    return Boolean(
      node &&
      node.classList.contains('is-open')
    );
  }

  function toggle() {
    return setOpen(!isOpen());
  }

  function close() {
    return setOpen(false);
  }

  document.addEventListener(
    'click',
    function (event) {
      var button =
        event.target.closest &&
        event.target.closest(
          BUTTON_SELECTORS
        );

      if (button) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();

        toggle();

        return;
      }

      var node = wrap();
      var card = panel();

      if (
        node &&
        node.classList.contains('is-open') &&
        card &&
        !card.contains(event.target)
      ) {
        close();
      }
    },
    true
  );

  document.addEventListener(
    'keydown',
    function (event) {
      if (event.key === 'Escape') {
        close();
      }
    },
    true
  );

  window.PMDDateModalClickBridgeV2429 = {
    version: VERSION,
    open: function () {
      return setOpen(true);
    },
    close: close,
    toggle: toggle,
    audit: function () {
      var node = wrap();
      var card = panel();

      return {
        version: VERSION,
        wrap: Boolean(node),
        panel: Boolean(card),
        open: isOpen(),
        buttons: buttons().map(function (button) {
          return {
            id: button.id,
            text: String(button.innerText || '')
              .replace(/\s+/g, ' ')
              .trim(),
            expanded: button.getAttribute('aria-expanded')
          };
        })
      };
    }
  };

  console.info(
    '[PMD Date Modal Click Bridge V2.4.2.9] Ready',
    window.PMDDateModalClickBridgeV2429.audit()
  );
})();

/* PMD_DATE_MODAL_CLICK_BRIDGE_V2429_END */

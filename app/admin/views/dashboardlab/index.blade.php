@php
    $pmdDashboardLabKpiCards =
        $pmdDashboardLabKpiCards ?? [];

    $pmdDashboardLabKpiSelection =
        $pmdDashboardLabKpiSelection
        ?? ['revenue', 'guests', 'turnover', 'channels'];

    $pmdDashboardLabKpiOrder =
        $pmdDashboardLabKpiOrder
        ?? array_keys($pmdDashboardLabKpiCards);

    $pmdDashboardLabIcon = static function ($name) {
        $paths = [
            'money' => '<circle cx="12" cy="12" r="9"></circle><path d="M16 8h-6a2 2 0 0 0 0 4h4a2 2 0 0 1 0 4h-6M12 6v2M12 16v2"></path>',
            'users' => '<circle cx="9" cy="8" r="3"></circle><path d="M3 20a6 6 0 0 1 12 0M16 5a3 3 0 0 1 0 6M17 14a5 5 0 0 1 4 5"></path>',
            'timer' => '<circle cx="12" cy="13" r="8"></circle><path d="M12 9v4l2 2M9 2h6M12 2v3"></path>',
            'utensils' => '<path d="M7 3v8M4 3v5a3 3 0 0 0 6 0V3M7 11v10M17 3v18M17 3c3 2 3 7 0 9"></path>',
            'flame' => '<path d="M12 3c1.8 3 5 4.6 5 9a5 5 0 0 1 -10 0c0 -2.3 1.2 -4.4 3.5 -6.5c.2 2 1 3 1.5 3.5c1.2 -1.4 1.2 -3.7 0 -6z"></path>',
            'table' => '<path d="M3 10h18M5 10v8M19 10v8"></path><path d="M4 6h16a1 1 0 0 1 1 1v3h-18v-3a1 1 0 0 1 1 -1z"></path>',
            'menu' => '<path d="M4 6h16M4 12h16M4 18h16"></path>',
            'star' => '<path d="M12 3l2.8 5.7l6.2 .9l-4.5 4.4l1.1 6.2l-5.6 -3l-5.6 3l1.1 -6.2l-4.5 -4.4l6.2 -.9z"></path>',
        ];

        return $paths[$name]
            ?? $paths['money'];
    };
@endphp

<div
    id="pmd-dashboard-lab"
    class="pmd-dashboard-lab pmd-owner-page"
    data-pmd-dashboard-lab-step="4"
    data-pmd-dashboard-lab-kpi-render="server-first-paint"
>
    {{-- PMD_DASHBOARD_LAB_HEADER_NOTIFICATION_V5 --}}
    <style id="pmd-dashboard-lab-header-v5-critical">
      html body.pmd-dashboard-lab-page
      #pmd-dashboard-lab
      #pmd-r2-clean-header {
        display: flex !important;
        align-items: center !important;
        justify-content: space-between !important;
        width: min(1480px, 100%) !important;
        height: 64px !important;
        min-height: 64px !important;
        max-height: 64px !important;
        margin: 0 auto !important;
        padding: 0 2px !important;
        overflow: visible !important;
      }

      html body.pmd-dashboard-lab-page
      #pmd-dashboard-lab
      #pmd-r2-clean-header
      .pmd-owner-header__left {
        display: flex !important;
        align-items: center !important;
        min-width: 0 !important;
        gap: 0 !important;
      }

      html body.pmd-dashboard-lab-page
      #pmd-dashboard-lab
      #pmd-r2-clean-header
      .pmd-dashboard-lab__mobile-menu {
        display: none !important;
        visibility: hidden !important;
        pointer-events: none !important;
      }

      html body.pmd-dashboard-lab-page
      #pmd-dashboard-lab
      #pmd-r2-clean-header
      .pmd-r2-clean-actions {
        display: flex !important;
        flex-direction: row !important;
        align-items: center !important;
        justify-content: flex-end !important;
        gap: 10px !important;
        min-width: 102px !important;
        height: 46px !important;
        min-height: 46px !important;
        margin: 0 0 0 auto !important;
        padding: 0 !important;
        overflow: visible !important;
      }

      html body.pmd-dashboard-lab-page
      #pmd-dashboard-lab
      #pmd-r2-clean-header
      .pmd-dashboard-lab__header-action,
      html body.pmd-dashboard-lab-page
      #pmd-dashboard-lab
      #pmd-r2-clean-header
      .pmd-dashboard-lab__notif-slot,
      html body.pmd-dashboard-lab-page
      #pmd-dashboard-lab
      #pmd-r2-clean-header
      #notif-root,
      html body.pmd-dashboard-lab-page
      #pmd-dashboard-lab
      #pmd-r2-clean-header
      #notifDropdown {
        box-sizing: border-box !important;
      }

      html body.pmd-dashboard-lab-page
      #pmd-dashboard-lab
      #pmd-r2-clean-header
      .pmd-dashboard-lab__header-action,
      html body.pmd-dashboard-lab-page
      #pmd-dashboard-lab
      #pmd-r2-clean-header
      .pmd-dashboard-lab__notif-slot,
      html body.pmd-dashboard-lab-page
      #pmd-dashboard-lab
      #pmd-r2-clean-header
      #notifDropdown {
        position: relative !important;
        display: inline-grid !important;
        place-items: center !important;
        flex: 0 0 46px !important;
        width: 46px !important;
        min-width: 46px !important;
        max-width: 46px !important;
        height: 46px !important;
        min-height: 46px !important;
        max-height: 46px !important;
        margin: 0 !important;
        padding: 0 !important;
        border: 1px solid #cfe0ec !important;
        border-radius: 14px !important;
        background: #ffffff !important;
        color: #173752 !important;
        box-shadow: 0 3px 10px rgba(23,55,82,.05) !important;
        text-decoration: none !important;
        line-height: 1 !important;
        overflow: visible !important;
        opacity: 1 !important;
        visibility: visible !important;
        transform: none !important;
      }

      html body.pmd-dashboard-lab-page
      #pmd-dashboard-lab
      #pmd-r2-clean-header
      #notif-root {
        position: relative !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        flex: 0 0 46px !important;
        width: 46px !important;
        min-width: 46px !important;
        max-width: 46px !important;
        height: 46px !important;
        min-height: 46px !important;
        max-height: 46px !important;
        margin: 0 !important;
        padding: 0 !important;
        border: 0 !important;
        background: transparent !important;
        list-style: none !important;
        overflow: visible !important;
      }

      html body.pmd-dashboard-lab-page
      #pmd-dashboard-lab
      #pmd-r2-clean-header
      .pmd-dashboard-lab__header-action svg,
      html body.pmd-dashboard-lab-page
      #pmd-dashboard-lab
      #pmd-r2-clean-header
      .pmd-dashboard-lab__notif-fallback svg,
      html body.pmd-dashboard-lab-page
      #pmd-dashboard-lab
      #pmd-r2-clean-header
      #bell-icon svg {
        display: block !important;
        width: 21px !important;
        min-width: 21px !important;
        max-width: 21px !important;
        height: 21px !important;
        min-height: 21px !important;
        max-height: 21px !important;
        margin: 0 !important;
        padding: 0 !important;
        fill: none !important;
        stroke: currentColor !important;
        stroke-width: 2 !important;
        stroke-linecap: round !important;
        stroke-linejoin: round !important;
        transform: none !important;
        pointer-events: none !important;
      }

      html body.pmd-dashboard-lab-page
      #pmd-dashboard-lab
      #pmd-r2-clean-header
      .pmd-dashboard-lab__notif-fallback,
      html body.pmd-dashboard-lab-page
      #pmd-dashboard-lab
      #pmd-r2-clean-header
      #bell-icon {
        position: static !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        width: 21px !important;
        height: 21px !important;
        margin: 0 !important;
        padding: 0 !important;
        color: #173752 !important;
        pointer-events: none !important;
        transform: none !important;
      }

      html body.pmd-dashboard-lab-page
      #pmd-dashboard-lab
      #pmd-r2-clean-header
      #notifDropdown > i {
        display: none !important;
      }

      html body.pmd-dashboard-lab-page
      #pmd-dashboard-lab
      #pmd-r2-clean-header
      #notification-count {
        position: absolute !important;
        top: -7px !important;
        right: -8px !important;
        left: auto !important;
        bottom: auto !important;
        z-index: 8 !important;
        min-width: 18px !important;
        height: 18px !important;
        margin: 0 !important;
        padding: 0 4px !important;
        border: 2px solid #fff !important;
        border-radius: 999px !important;
        background: #d83a31 !important;
        color: #fff !important;
        font-size: 9px !important;
        font-weight: 800 !important;
        line-height: 14px !important;
        text-align: center !important;
        white-space: nowrap !important;
        transform: none !important;
      }

      html body.pmd-dashboard-lab-page
      #pmd-dashboard-lab
      #pmd-r2-clean-header
      #notification-panel,
      html body.pmd-dashboard-lab-page
      #pmd-dashboard-lab
      #pmd-r2-clean-header
      #notif-root .dropdown-menu {
        position: absolute !important;
        top: 54px !important;
        right: 0 !important;
        left: auto !important;
        margin: 0 !important;
        z-index: 10050 !important;
      }
    </style>

    {{-- PMD_MAIN_HEADER_NOTIFICATION_GAP_R67_STYLE_START --}}
    <style id="pmd-main-header-notification-gap-r67">
    #pmd-dashboard-lab
    #pmd-r2-clean-header
    [data-pmd-main-header-notification-divider-r66] {
        display:none!important;
        visibility:hidden!important;
    }

    #pmd-dashboard-lab
    #pmd-r2-clean-header
    [data-pmd-main-header-notification-divider=""] {
        display:none!important;
        visibility:hidden!important;
    }
    </style>
    {{-- PMD_MAIN_HEADER_NOTIFICATION_GAP_R67_STYLE_END --}}
    <header id="pmd-r2-clean-header" class="pmd-owner-header pmd-dashboard-lab__dashboard2-header" aria-label="Dashboard header" data-pmd-dashboard-lab-header="dashboard2-v5">
        <div class="pmd-owner-header__left">
            <h1 class="pmd-r2-clean-title">Dashboard</h1>
        </div>

        <div
            class="pmd-owner-header__actions pmd-r2-clean-actions"
            data-pmd-dashboard-lab-header-actions
            aria-label="Dashboard actions"
        >
            <a
                id="pmd-dashboard-lab-calendar-v4"
                class="pmd-dashboard-lab__header-action"
                href="{{ admin_url('dashboard2') }}"
                aria-label="Open calendar"
                title="Open calendar"
            >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                    <rect x="3" y="5" width="18" height="16" rx="2"></rect>
                    <path d="M16 3v4"></path>
                    <path d="M8 3v4"></path>
                    <path d="M3 11h18"></path>
                </svg>
            </a>

            {{-- PMD_MAIN_HEADER_NOTIFICATION_GAP_R67_NODE_START --}}
            <span
                data-pmd-main-header-notification-gap-r67=""
                aria-hidden="true"
                style="
                    position:relative!important;
                    display:block!important;
                    flex:0 0 40px!important;
                    width:40px!important;
                    min-width:40px!important;
                    max-width:40px!important;
                    height:46px!important;
                    min-height:46px!important;
                    max-height:46px!important;
                    margin:0!important;
                    padding:0!important;
                    border:0!important;
                    background:transparent!important;
                    pointer-events:none!important;
                    overflow:visible!important;
                "
            >
                <span
                    data-pmd-main-header-notification-divider-r67=""
                    aria-hidden="true"
                    style="
                        position:absolute!important;
                        top:50%!important;
                        right:8px!important;
                        transform:translateY(-50%)!important;
                        display:block!important;
                        width:1px!important;
                        min-width:1px!important;
                        max-width:1px!important;
                        height:34px!important;
                        min-height:34px!important;
                        max-height:34px!important;
                        margin:0!important;
                        padding:0!important;
                        border:0!important;
                        background:#cfe0ec!important;
                        pointer-events:none!important;
                    "
                ></span>
            </span>
            {{-- PMD_MAIN_HEADER_NOTIFICATION_GAP_R67_NODE_END --}}
            <span
                class="pmd-owner-notif-slot pmd-dashboard-lab__notif-slot"
                data-pmd-dashboard-lab-notif-slot
                aria-label="Notifications"
            >
                <span class="pmd-dashboard-lab__notif-fallback" aria-hidden="true">
                    <svg viewBox="0 0 24 24">
                        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"></path>
                        <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                    </svg>
                </span>
            </span>
        </div>
    </header>

    {{-- PMD_DASHBOARD_LAB_HEADER_TOOLBAR_POLISH_V4 --}}
    <script id="pmd-dashboard-lab-header-v5">
    (function () {
      'use strict';

      var route = String(window.location.pathname || '').replace(/\/+$/, '');
      if (route !== '/admin/dashboardlab') return;

      function setImportant(node, property, value) {
        if (!node) return;
        node.style.setProperty(property, value, 'important');
      }

      function bellSvg() {
        return '' +
          '<svg viewBox="0 0 24 24" aria-hidden="true">' +
            '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"></path>' +
            '<path d="M13.73 21a2 2 0 0 1-3.46 0"></path>' +
          '</svg>';
      }

      function normalizeCalendar() {
        var calendar = document.getElementById('pmd-dashboard-lab-calendar-v4');
        if (!calendar) return false;

        setImportant(calendar, 'position', 'relative');
        setImportant(calendar, 'display', 'inline-grid');
        setImportant(calendar, 'place-items', 'center');
        setImportant(calendar, 'box-sizing', 'border-box');
        setImportant(calendar, 'width', '46px');
        setImportant(calendar, 'min-width', '46px');
        setImportant(calendar, 'max-width', '46px');
        setImportant(calendar, 'height', '46px');
        setImportant(calendar, 'min-height', '46px');
        setImportant(calendar, 'max-height', '46px');
        setImportant(calendar, 'flex', '0 0 46px');
        setImportant(calendar, 'margin', '0');
        setImportant(calendar, 'padding', '0');
        setImportant(calendar, 'border', '1px solid #cfe0ec');
        setImportant(calendar, 'border-radius', '14px');
        setImportant(calendar, 'background', '#ffffff');
        setImportant(calendar, 'color', '#173752');
        setImportant(calendar, 'box-shadow', '0 3px 10px rgba(23,55,82,.05)');
        setImportant(calendar, 'transform', 'none');

        var svg = calendar.querySelector('svg');
        if (svg) {
          setImportant(svg, 'display', 'block');
          setImportant(svg, 'width', '21px');
          setImportant(svg, 'height', '21px');
          setImportant(svg, 'margin', '0');
          setImportant(svg, 'padding', '0');
          setImportant(svg, 'fill', 'none');
          setImportant(svg, 'stroke', 'currentColor');
          setImportant(svg, 'stroke-width', '2');
          setImportant(svg, 'transform', 'none');
        }

        return true;
      }

      function normalizeNotification(notificationRoot) {
        if (!notificationRoot) return false;

        var trigger = notificationRoot.querySelector('#notifDropdown');
        if (!trigger) return false;

        trigger.setAttribute('aria-label', 'Notifications');
        trigger.setAttribute('title', 'Notifications');

        Array.prototype.forEach.call(
          trigger.querySelectorAll(':scope > i'),
          function (node) { node.remove(); }
        );

        var bell = trigger.querySelector(':scope > #bell-icon');
        if (!bell) {
          bell = document.createElement('span');
          bell.id = 'bell-icon';
          trigger.insertBefore(bell, trigger.firstChild || null);
        }
        bell.innerHTML = bellSvg();

        var count = trigger.querySelector('#notification-count');
        var panel = notificationRoot.querySelector('#notification-panel');

        setImportant(notificationRoot, 'position', 'relative');
        setImportant(notificationRoot, 'display', 'flex');
        setImportant(notificationRoot, 'align-items', 'center');
        setImportant(notificationRoot, 'justify-content', 'center');
        setImportant(notificationRoot, 'box-sizing', 'border-box');
        setImportant(notificationRoot, 'width', '46px');
        setImportant(notificationRoot, 'min-width', '46px');
        setImportant(notificationRoot, 'max-width', '46px');
        setImportant(notificationRoot, 'height', '46px');
        setImportant(notificationRoot, 'min-height', '46px');
        setImportant(notificationRoot, 'max-height', '46px');
        setImportant(notificationRoot, 'flex', '0 0 46px');
        setImportant(notificationRoot, 'margin', '0');
        setImportant(notificationRoot, 'padding', '0');
        setImportant(notificationRoot, 'border', '0');
        setImportant(notificationRoot, 'background', 'transparent');
        setImportant(notificationRoot, 'overflow', 'visible');
        setImportant(notificationRoot, 'list-style', 'none');

        setImportant(trigger, 'position', 'relative');
        setImportant(trigger, 'display', 'grid');
        setImportant(trigger, 'place-items', 'center');
        setImportant(trigger, 'box-sizing', 'border-box');
        setImportant(trigger, 'width', '46px');
        setImportant(trigger, 'min-width', '46px');
        setImportant(trigger, 'max-width', '46px');
        setImportant(trigger, 'height', '46px');
        setImportant(trigger, 'min-height', '46px');
        setImportant(trigger, 'max-height', '46px');
        setImportant(trigger, 'margin', '0');
        setImportant(trigger, 'padding', '0');
        setImportant(trigger, 'border', '1px solid #cfe0ec');
        setImportant(trigger, 'border-radius', '14px');
        setImportant(trigger, 'background', '#ffffff');
        setImportant(trigger, 'color', '#173752');
        setImportant(trigger, 'box-shadow', '0 3px 10px rgba(23,55,82,.05)');
        setImportant(trigger, 'line-height', '1');
        setImportant(trigger, 'text-indent', '0');
        setImportant(trigger, 'opacity', '1');
        setImportant(trigger, 'visibility', 'visible');
        setImportant(trigger, 'overflow', 'visible');
        setImportant(trigger, 'transform', 'none');

        setImportant(bell, 'position', 'static');
        setImportant(bell, 'display', 'inline-flex');
        setImportant(bell, 'align-items', 'center');
        setImportant(bell, 'justify-content', 'center');
        setImportant(bell, 'width', '21px');
        setImportant(bell, 'height', '21px');
        setImportant(bell, 'margin', '0');
        setImportant(bell, 'padding', '0');
        setImportant(bell, 'color', '#173752');
        setImportant(bell, 'line-height', '1');
        setImportant(bell, 'transform', 'none');
        setImportant(bell, 'pointer-events', 'none');

        var svg = bell.querySelector('svg');
        if (svg) {
          setImportant(svg, 'display', 'block');
          setImportant(svg, 'width', '21px');
          setImportant(svg, 'height', '21px');
          setImportant(svg, 'margin', '0');
          setImportant(svg, 'padding', '0');
          setImportant(svg, 'fill', 'none');
          setImportant(svg, 'stroke', 'currentColor');
          setImportant(svg, 'stroke-width', '2');
          setImportant(svg, 'stroke-linecap', 'round');
          setImportant(svg, 'stroke-linejoin', 'round');
          setImportant(svg, 'transform', 'none');
        }

        if (count) {
          setImportant(count, 'position', 'absolute');
          setImportant(count, 'top', '-7px');
          setImportant(count, 'right', '-8px');
          setImportant(count, 'left', 'auto');
          setImportant(count, 'bottom', 'auto');
          setImportant(count, 'z-index', '8');
          setImportant(count, 'min-width', '18px');
          setImportant(count, 'height', '18px');
          setImportant(count, 'margin', '0');
          setImportant(count, 'padding', '0 4px');
          setImportant(count, 'border', '2px solid #ffffff');
          setImportant(count, 'border-radius', '999px');
          setImportant(count, 'background', '#d83a31');
          setImportant(count, 'color', '#ffffff');
          setImportant(count, 'font-size', '9px');
          setImportant(count, 'font-weight', '800');
          setImportant(count, 'line-height', '14px');
          setImportant(count, 'text-align', 'center');
          setImportant(count, 'white-space', 'nowrap');
          setImportant(count, 'transform', 'none');
        }

        if (panel) {
          setImportant(panel, 'position', 'absolute');
          setImportant(panel, 'top', '54px');
          setImportant(panel, 'right', '0');
          setImportant(panel, 'left', 'auto');
          setImportant(panel, 'margin', '0');
          setImportant(panel, 'z-index', '10050');
          setImportant(panel, 'transform', 'none');
        }

        return true;
      }

      function mountNotification() {
        var header = document.getElementById('pmd-r2-clean-header');
        var slot = header && header.querySelector('[data-pmd-dashboard-lab-notif-slot]');
        var notificationRoot = document.getElementById('notif-root');

        normalizeCalendar();

        if (!header || !notificationRoot) return false;

        if (slot && !header.contains(notificationRoot)) {
          slot.replaceWith(notificationRoot);
        }

        if (!header.contains(notificationRoot)) return false;

        normalizeNotification(notificationRoot);
        notificationRoot.setAttribute(
          'data-pmd-dashboard-lab-notification',
          'mounted-v5'
        );

        return true;
      }

      var mounted = mountNotification();

      if (!mounted && document.readyState === 'loading') {
        document.addEventListener(
          'DOMContentLoaded',
          mountNotification,
          { once: true }
        );
      }

      window.PMDDashboardLabHeaderV5 = {
        audit: function () {
          var header = document.getElementById('pmd-r2-clean-header');
          var menu = header && header.querySelector('.pmd-dashboard-lab__mobile-menu');
          var calendar = document.getElementById('pmd-dashboard-lab-calendar-v4');
          var notificationRoot = document.getElementById('notif-root');
          var trigger = notificationRoot && notificationRoot.querySelector('#notifDropdown');
          var bell = trigger && trigger.querySelector('#bell-icon svg');
          var count = trigger && trigger.querySelector('#notification-count');

          function rect(node) {
            if (!node) return null;
            var r = node.getBoundingClientRect();
            return {
              x: Math.round(r.x),
              y: Math.round(r.y),
              width: Math.round(r.width),
              height: Math.round(r.height)
            };
          }

          return {
            ready: Boolean(header),
            hamburgerExists: Boolean(menu),
            calendar: rect(calendar),
            notificationMounted: Boolean(
              notificationRoot && header && header.contains(notificationRoot)
            ),
            notificationButton: rect(trigger),
            bellSvgVisible: Boolean(
              bell && getComputedStyle(bell).display !== 'none'
            ),
            badgeText: count ? count.textContent.trim() : null,
            badge: rect(count)
          };
        }
      };
    })();
    </script>

    {{--
      PMD_DASHBOARD_LAB_STEP2_KPIS_V1
      PMD_DASHBOARD_LAB_SERVER_FIRST_PAINT_KPIS_V2

      Data, value, description, icon, card tone AND the three-dot chooser are
      already present in the initial HTML response. The browser does not fetch
      KPI data during boot and does not replace placeholder values after paint.
    --}}
    <section
        id="pmd-r2-reservation-kpis-v307"
        class="pmd-r2-kpis-v2401 pmd-dashboard2-kpis-v2 pmd-dashboard-lab__kpis"
        data-pmd-dashboard-lab-kpis
        data-pmd-kpi-authority="dashboard2-server-first-paint"
        aria-label="Owner dashboard KPIs"
    >
        @foreach($pmdDashboardLabKpiSelection as $slot => $key)
            @php
                $card = $pmdDashboardLabKpiCards[$key] ?? null;
            @endphp

            @if($card)
                <article
                    class="pmd-r2-kpi-v2401-card"
                    data-pmd-dashboard-lab-slot="{{ $slot }}"
                    data-pmd-dashboard2-kpi="{{ $card['key'] }}"
                    data-pmd-kpi-v2401-key="{{ $card['key'] }}"
                    data-pmd-kpi-v2401-tone="{{ $card['tone'] }}"
                    data-pmd-connected="{{ $card['connected'] ? 'true' : 'false' }}"
                    data-pmd-period="{{ $card['period'] }}"
                    title="{{ $card['source'] }}"
                >
                    <div class="pmd-r2-kpi-v2401-icon" aria-hidden="true">
                        <svg viewBox="0 0 24 24" focusable="false">
                            {!! $pmdDashboardLabIcon($card['icon']) !!}
                        </svg>
                    </div>

                    <div class="pmd-r2-kpi-v2401-copy">
                        <span class="pmd-r2-kpi-v2401-title">{{ $card['title'] }}</span>
                        {{-- PMD_KPI_ZERO_DISPLAY_V1 --}}
                        <strong class="pmd-r2-kpi-v2401-value">{{ in_array(trim((string)($card['value'] ?? '')), ['', '—', '–', '-'], true) ? '0' : $card['value'] }}</strong>
                        <span class="pmd-r2-kpi-v2401-description">{{ $card['description'] }}</span>
                    </div>

                    {{-- PMD_KPI_INFO_SERVER_FIRST_PAINT_V3 --}}
                    <div
                        class="pmd-kpi-info-panel"
                        data-pmd-kpi-info-panel="1"
                        aria-live="polite"
                    >
                        <strong></strong>
                        <span></span>
                    </div>

                    <button
                        type="button"
                        class="pmd-kpi-info-button"
                        data-pmd-kpi-info-button="1"
                        aria-pressed="false"
                        aria-label="{{ app()->getLocale() === 'de' ? 'Info zu dieser KPI' : 'About this KPI' }}"
                        title="{{ app()->getLocale() === 'de' ? 'Info zu dieser KPI' : 'About this KPI' }}"
                    >
                        <svg
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                            focusable="false"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                        >
                            <circle cx="12" cy="12" r="9"></circle>
                            <path d="M12 11v5"></path>
                            <path d="M12 8h.01"></path>
                        </svg>
                    </button>

                    <button
                        type="button"
                        class="pmd-r2-kpi-v2401-more"
                        data-pmd-dashboard-lab-kpi-menu-button
                        aria-label="Choose KPI"
                        aria-haspopup="menu"
                        aria-expanded="false"
                    >
                        <span></span>
                        <span></span>
                        <span></span>
                    </button>

                    <div
                        class="pmd-r2-kpi-v2401-menu pmd-dashboard-lab__kpi-menu"
                        data-pmd-dashboard-lab-kpi-menu
                        role="menu"
                        hidden
                    >
                        <span class="pmd-dashboard-lab__kpi-menu-heading">Choose KPI</span>

                        @foreach($pmdDashboardLabKpiOrder as $choiceKey)
                            @php
                                $choice = $pmdDashboardLabKpiCards[$choiceKey] ?? null;
                                $alreadyVisible = in_array(
                                    $choiceKey,
                                    $pmdDashboardLabKpiSelection,
                                    true
                                );
                                $isCurrent = $choiceKey === $key;
                            @endphp

                            @if($choice)
                                <button
                                    type="button"
                                    class="pmd-r2-kpi-v2401-option{{ $isCurrent ? ' is-selected' : '' }}"
                                    data-pmd-dashboard-lab-kpi-option="{{ $choiceKey }}"
                                    role="menuitem"
                                    {{ ($alreadyVisible && !$isCurrent) ? 'disabled' : '' }}
                                >
                                    <span class="pmd-r2-kpi-v2401-option-copy">
                                        <strong>{{ $choice['title'] }}</strong>
                                        <small>{{ $isCurrent ? 'Visible in this card' : (($alreadyVisible) ? 'Already visible' : 'Show in this card') }}</small>
                                    </span>
                                    <span class="pmd-r2-kpi-v2401-check">{{ $isCurrent ? '✓' : '' }}</span>
                                </button>
                            @endif
                        @endforeach
                    </div>
                </article>
            @endif
        @endforeach
    </section>

    <script
        type="application/json"
        id="pmd-dashboard-lab-kpi-data"
    >@json($pmdDashboardLabKpiCards)</script>

    <main
        class="pmd-dashboard-lab__stage"
        aria-label="Dashboard component test area"
    >
        {{-- PMD_DASHBOARD_LAB_STEP3_EXACT_RESERVATIONS_FLOOR_V1 --}}
        @include('admin::_partials.pmd_dashboard_lab_exact_floor_v1', [
            'floorBootstrap' => $pmdDashboardLabFloorBootstrap ?? [],
            'displayTables' => $pmdDashboardLabFloorDisplayTables ?? [],
            'floorMode' => $pmdDashboardLabFloorMode ?? 'row',
            'floorZoom' => $pmdDashboardLabFloorZoom ?? 1.0,
        ])

        {{-- PMD_DASHBOARD_LAB_STEP4_ALL_DASHBOARD2_ANALYTICS_V1 --}}
        {{-- PMD_DASHBOARD_LAB_ANALYTICS_SCROLL_FIRSTPAINT_V2 --}}
        {{-- PMD_DASHBOARD_LAB_ANALYTICS_SERVER_DOM_V3 --}}
        @include('admin::_partials.pmd_dashboard_lab_analytics_v1', [
            'analyticsBootstrap' => $pmdDashboardLabAnalyticsBootstrap ?? [],
        ])

    </main>
</div>

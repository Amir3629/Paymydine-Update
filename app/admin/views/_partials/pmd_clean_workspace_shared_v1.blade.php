@php
    $pmdCleanWorkspaceKpiCards = $pmdCleanWorkspaceKpiCards ?? [];
    $pmdCleanWorkspaceKpiSelection = $pmdCleanWorkspaceKpiSelection ?? [];
    $pmdCleanWorkspaceKpiOrder = $pmdCleanWorkspaceKpiOrder ?? array_keys($pmdCleanWorkspaceKpiCards);
    $pmdCleanWorkspaceUsesFloor = $pmdCleanWorkspaceUsesFloor ?? true;
    $pmdCleanWorkspaceAfterFloorPartial = $pmdCleanWorkspaceAfterFloorPartial ?? null;
    $pmdCleanWorkspaceBelowFloorPartial = $pmdCleanWorkspaceBelowFloorPartial ?? null;
    $pmdCleanWorkspaceReservationsSurface = (($pmdCleanWorkspacePath ?? '') === '/admin/reservationslab');
    $pmdCleanWorkspaceCashierSurface = (($pmdCleanWorkspacePath ?? '') === '/admin/cashierlab');

    /*
     * PMD_CLEAN_WORKSPACE_MANAGER_CALENDAR_SURFACE_V1
     *
     * ReservationsLab + ManagerLab use ONE Calendar/Hour authority.
     */
    $pmdCleanWorkspaceManagerCalendarSurface =
        (($pmdCleanWorkspacePath ?? '') === '/admin/managerlab');

    $pmdCleanWorkspaceCalendarSurface =
        $pmdCleanWorkspaceReservationsSurface
        || $pmdCleanWorkspaceManagerCalendarSurface
        || $pmdCleanWorkspaceCashierSurface;

    /*
     * PMD_ACCOUNTANT_HEADER_NO_CALENDAR_V1
     *
     * Accountant has no Floor/Calendar workspace.
     * Do not emit the Calendar control at all.
     */
    $pmdCleanWorkspaceAccountantSurface =
        (($pmdCleanWorkspaceKey ?? '') === 'accountant');

    // PMD_CASHIER_HEADER_NOTIFICATION_ONLY_V1
    // Cashier header keeps Notification only.
    $pmdCleanWorkspaceHeaderCalendarVisible =
        !$pmdCleanWorkspaceAccountantSurface
        && !$pmdCleanWorkspaceCashierSurface;


    // PMD_CLEAN_WORKSPACE_CANONICAL_RESERVATION_COMPOSER_SURFACE_V1
    // Cashier may create a reservation, but it must not become a ReservationsLab
    // Calendar/Hour surface. Only the exact Reservations2 Composer is shared.
    $pmdCleanWorkspaceComposerSurface = $pmdCleanWorkspaceReservationsSurface || $pmdCleanWorkspaceCashierSurface;
    $pmdCleanWorkspaceHeaderCreateVisible =
        $pmdCleanWorkspaceComposerSurface
        && !$pmdCleanWorkspaceCashierSurface;

    // PMD_CLEAN_WORKSPACE_CALENDAR_COMPOSER_RUNTIME_V1
    // Manager loads the canonical Composer for Calendar/Hour actions,
    // but header Create visibility remains controlled by
    // $pmdCleanWorkspaceComposerSurface.
    $pmdCleanWorkspaceComposerRuntimeSurface =
        $pmdCleanWorkspaceComposerSurface
        || $pmdCleanWorkspaceManagerCalendarSurface;

    $pmdCleanWorkspaceDirectFloorSurface = $pmdCleanWorkspaceReservationsSurface || $pmdCleanWorkspaceCashierSurface;
    $pmdCleanWorkspaceAddReservationLabel = strtolower((string)($pmdCleanWorkspaceLocale ?? 'en')) === 'de'
        ? 'Reservierung hinzufügen'
        : 'Add reservation';
    $pmdCleanWorkspaceCreateDate = \Carbon\Carbon::now('Europe/Berlin')->toDateString();

    /* PMD_ROLE_AWARE_CLEAN_WORKSPACE_CHROME_V1
     * Native Reservations/Cashier/Accountant accounts keep the standalone
     * shell. Owner/Manager keep their normal Side Menu 2 on the same routes.
     */
    $pmdCleanWorkspaceRoleUsesSideMenu = false;

    try {
        $pmdCleanWorkspaceRoleUser = null;

        if (class_exists('\\Admin\\Facades\\AdminAuth')) {
            $pmdCleanWorkspaceRoleUser = \Admin\Facades\AdminAuth::getUser();
        } elseif (class_exists('AdminAuth')) {
            $pmdCleanWorkspaceRoleUser = \AdminAuth::getUser();
        }

        if ($pmdCleanWorkspaceRoleUser) {
            if (!empty($pmdCleanWorkspaceRoleUser->is_super_user)) {
                $pmdCleanWorkspaceRoleUsesSideMenu = true;
            } elseif (!empty($pmdCleanWorkspaceRoleUser->staff_id)) {
                $pmdCleanWorkspaceRoleRow = \Illuminate\Support\Facades\DB::table('staffs as s')
                    ->leftJoin('staff_roles as r', 'r.staff_role_id', '=', 's.staff_role_id')
                    ->where('s.staff_id', (int)$pmdCleanWorkspaceRoleUser->staff_id)
                    ->select('r.code as role_code', 'r.name as role_name')
                    ->first();

                if ($pmdCleanWorkspaceRoleRow) {
                    $pmdCleanWorkspaceRoleCode = strtolower(trim((string)($pmdCleanWorkspaceRoleRow->role_code ?? '')));
                    $pmdCleanWorkspaceRoleName = strtolower(trim((string)($pmdCleanWorkspaceRoleRow->role_name ?? '')));
                    $pmdCleanWorkspaceRoleUsesSideMenu = in_array($pmdCleanWorkspaceRoleCode, ['owner', 'manager'], true)
                        || in_array($pmdCleanWorkspaceRoleName, ['owner', 'manager'], true);
                }
            }
        }
    } catch (\Throwable $e) {
        $pmdCleanWorkspaceRoleUsesSideMenu = false;
    }

    $pmdCleanWorkspaceStandaloneChrome = in_array(
        (string)($pmdCleanWorkspaceKey ?? ''),
        ['reservations', 'cashier', 'accountant'],
        true
    ) && !$pmdCleanWorkspaceRoleUsesSideMenu;
    $pmdCleanWorkspaceHeaderLocale = strtolower((string)($pmdCleanWorkspaceLocale ?? 'en'));
    $pmdCleanWorkspaceHeaderLocale = $pmdCleanWorkspaceHeaderLocale === 'de' ? 'de' : 'en';
    $pmdCleanWorkspaceHeaderNextLocale = $pmdCleanWorkspaceHeaderLocale === 'de' ? 'en' : 'de';
    $pmdCleanWorkspaceLanguageEndpoint = url(config('system.adminUri', 'admin').'/_pmd/language-switch-v3');
    $pmdCleanWorkspaceText = $pmdCleanWorkspaceText ?? [
        'choose_kpi' => 'Choose KPI',
        'visible' => 'Visible in this card',
        'already_visible' => 'Already visible',
        'show_here' => 'Show in this card',
    ];

    $pmdCleanWorkspaceIcon = static function ($name) {
        $paths = [
            'money' => '<circle cx="12" cy="12" r="9"></circle><path d="M16 8h-6a2 2 0 0 0 0 4h4a2 2 0 0 1 0 4h-6M12 6v2M12 16v2"></path>',
            'users' => '<circle cx="9" cy="8" r="3"></circle><path d="M3 20a6 6 0 0 1 12 0M16 5a3 3 0 0 1 0 6M17 14a5 5 0 0 1 4 5"></path>',
            'timer' => '<circle cx="12" cy="13" r="8"></circle><path d="M12 9v4l2 2M9 2h6M12 2v3"></path>',
            'utensils' => '<path d="M7 3v8M4 3v5a3 3 0 0 0 6 0V3M7 11v10M17 3v18M17 3c3 2 3 7 0 9"></path>',
            'flame' => '<path d="M12 3c1.8 3 5 4.6 5 9a5 5 0 0 1 -10 0c0 -2.3 1.2 -4.4 3.5 -6.5c.2 2 1 3 1.5 3.5c1.2 -1.4 1.2 -3.7 0 -6z"></path>',
            'table' => '<path d="M3 10h18M5 10v8M19 10v8"></path><path d="M4 6h16a1 1 0 0 1 1 1v3h-18v-3a1 1 0 0 1 1 -1z"></path>',
            'menu' => '<path d="M4 6h16M4 12h16M4 18h16"></path>',
            'star' => '<path d="M12 3l2.8 5.7l6.2 .9l-4.5 4.4l1.1 6.2l-5.6 -3l-5.6 3l1.1 -6.2l-4.5 -4.4l6.2 -.9z"></path>',
            'calendar' => '<rect x="3" y="5" width="18" height="16" rx="2"></rect><path d="M16 3v4M8 3v4M3 11h18"></path>',
            'clock' => '<circle cx="12" cy="12" r="9"></circle><path d="M12 7v5l3 2"></path>',
            'pending' => '<circle cx="12" cy="12" r="9"></circle><path d="M12 7v5M12 16h.01"></path>',
            'user-off' => '<circle cx="9" cy="8" r="3"></circle><path d="M3 20a6 6 0 0 1 9 -5.2M15 15a6 6 0 0 1 3 5M3 3l18 18"></path>',
            'cancel' => '<circle cx="12" cy="12" r="9"></circle><path d="M9 9l6 6M15 9l-6 6"></path>',
            'occupancy' => '<rect x="3" y="4" width="18" height="16" rx="2"></rect><path d="M7 8h3v3h-3zM14 8h3v3h-3zM7 14h3v2h-3zM14 14h3v2h-3z"></path>',
            'list' => '<path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01"></path>',
            'seats' => '<path d="M6 11v-4a3 3 0 0 1 6 0v4M4 11h10v6h-10zM6 17v3M12 17v3"></path>',
        ];

        return $paths[$name] ?? $paths['money'];
    };
@endphp

@if($pmdCleanWorkspaceStandaloneChrome)
<script id="pmd-clean-workspace-standalone-firstpaint-v3">
document.documentElement.classList.remove('pmd-side-menu2-global-page','pmd-sm2-expanded','pmd-sm2-collapsed','pmd-sm2-runtime-ready');
document.documentElement.classList.add('pmd-clean-workspace-standalone-v3');
</script>
@endif

{{-- PMD_CLEAN_WORKSPACE_DOCUMENT_SCROLL_V2_2
     Dashboard Lab acquired this same vertical-scroll contract when Analytics
     was added. Clean workspaces must own it independently because they do not
     import Dashboard Lab Analytics CSS. --}}
<style id="pmd-clean-workspace-document-scroll-v2-2">
html {
  height: auto !important;
  min-height: 100% !important;
  max-height: none !important;
  overflow-x: hidden !important;
  overflow-y: auto !important;
}

html body.page.pmd-clean-workspace-page,
html body.page.pmd-clean-workspace-page .page,
html body.page.pmd-clean-workspace-page .page-wrapper,
html body.page.pmd-clean-workspace-page .page-content,
html body.page.pmd-clean-workspace-page .content-wrapper,
html body.page.pmd-clean-workspace-page .container-fluid,
html body.page.pmd-clean-workspace-page #pmd-dashboard-lab,
html body.page.pmd-clean-workspace-page .pmd-dashboard-lab__stage {
  height: auto !important;
  max-height: none !important;
  overflow-y: visible !important;
}

html body.page.pmd-clean-workspace-page,
html body.page.pmd-clean-workspace-page .page-wrapper,
html body.page.pmd-clean-workspace-page .page-content,
html body.page.pmd-clean-workspace-page #pmd-dashboard-lab {
  min-height: 100vh !important;
}
</style>

<div
    id="pmd-dashboard-lab"
    class="pmd-dashboard-lab pmd-owner-page"
    data-pmd-dashboard-lab-step="3"
    data-pmd-clean-workspace="v1"
    data-pmd-clean-workspace-key="{{ $pmdCleanWorkspaceKey }}"
    data-pmd-clean-workspace-path="{{ $pmdCleanWorkspacePath }}"
    data-pmd-clean-workspace-kpi-cookie="{{ $pmdCleanWorkspaceKpiCookie }}"
    data-pmd-clean-workspace-kpi-storage="{{ $pmdCleanWorkspaceKpiStorage }}"
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
    
    {{-- PMD_HEADER_NOTIFICATION_COUNT_SERVER_SEED_V1 --}}
    @php
        try {
            $pmdHeaderNotificationCountV1 =
                app(
                    \Admin\Services\PmdNotificationCountV1::class
                )->currentNewCount();
        } catch (\Throwable $error) {
            $pmdHeaderNotificationCountV1 = 0;
        }
    @endphp

    {{-- PMD_HEADER_NOTIFICATION_CRITICAL_FIRSTPAINT_V2 --}}
    <style id="pmd-header-notification-critical-firstpaint-v2">
    #pmd-dashboard-lab
    #pmd-r2-clean-header
    [data-pmd-main-header-notification-gap-r67] {
        position: relative !important;
        display: block !important;
        visibility: visible !important;
        opacity: 1 !important;

        flex: 0 0 10px !important;
        width: 10px !important;
        min-width: 10px !important;
        max-width: 10px !important;

        height: 46px !important;
        min-height: 46px !important;
        max-height: 46px !important;

        margin: 0 !important;
        padding: 0 !important;
        border: 0 !important;
        background: transparent !important;

        pointer-events: none !important;
        overflow: visible !important;
    }

    #pmd-dashboard-lab
    #pmd-r2-clean-header
    [data-pmd-main-header-notification-divider-r67] {
        position: absolute !important;
        display: block !important;
        visibility: visible !important;
        opacity: 1 !important;

        left: 50% !important;
        right: auto !important;
        top: 50% !important;

        width: 1px !important;
        min-width: 1px !important;
        max-width: 1px !important;

        height: 34px !important;
        min-height: 34px !important;
        max-height: 34px !important;

        margin: 0 !important;
        padding: 0 !important;
        border: 0 !important;

        background: #cfe0ec !important;
        transform: translate(-50%, -50%) !important;

        pointer-events: none !important;
    }

    /*
     * Once the real notification root is inside our header it must
     * always be visible. Old source-menu state must never survive.
     */
    #pmd-dashboard-lab
    #pmd-r2-clean-header
    #notif-root {
        opacity: 1 !important;
        visibility: visible !important;
        pointer-events: auto !important;

        margin: 0 !important;
        margin-left: 0 !important;
        margin-inline-start: 0 !important;
    }
    </style>

    <header id="pmd-r2-clean-header" class="pmd-owner-header pmd-dashboard-lab__dashboard2-header" aria-label="Dashboard header" data-pmd-dashboard-lab-header="dashboard2-v5">
        <div class="pmd-owner-header__left">
            @if($pmdCleanWorkspaceStandaloneChrome)
                <span class="pmd-clean-workspace__brand" aria-label="PayMyDine">
                    <img src="/app/admin/assets/images/pmd-brand-mark.svg" alt="PayMyDine">
                </span>
            @endif
            <h1 class="pmd-r2-clean-title">{{ $pmdCleanWorkspaceTitle }}</h1>
        </div>

        <div
            class="pmd-owner-header__actions pmd-r2-clean-actions"
            data-pmd-dashboard-lab-header-actions
            aria-label="Dashboard actions"
        >
            @if($pmdCleanWorkspaceStandaloneChrome)
                <button type="button" id="pmd-clean-workspace-language-v3"
                    class="pmd-dashboard-lab__header-action pmd-clean-workspace__language"
                    data-endpoint="{{ $pmdCleanWorkspaceLanguageEndpoint }}"
                    data-next="{{ $pmdCleanWorkspaceHeaderNextLocale }}"
                    aria-label="Switch language to {{ strtoupper($pmdCleanWorkspaceHeaderNextLocale) }}"
                    title="Switch language to {{ strtoupper($pmdCleanWorkspaceHeaderNextLocale) }}">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                        <circle cx="12" cy="12" r="9"></circle><path d="M3 12h18"></path>
                        <path d="M12 3a15 15 0 0 1 0 18"></path><path d="M12 3a15 15 0 0 0 0 18"></path>
                    </svg>
                    <span class="pmd-clean-workspace__language-code">{{ strtoupper($pmdCleanWorkspaceHeaderLocale) }}</span>
                </button>
            @endif

            @if($pmdCleanWorkspaceHeaderCreateVisible)
                <button
                    type="button"
                    id="pmd-reservations-lab-header-create-v1"
                    class="pmd-dashboard-lab__header-action pmd-reservations-lab__header-create"
                    @if($pmdCleanWorkspaceCashierSurface) data-pmd-cashier-reservation-create="1" @endif
                    aria-label="{{ $pmdCleanWorkspaceAddReservationLabel }}"
                    title="{{ $pmdCleanWorkspaceAddReservationLabel }}"
                >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M12 5v14"></path>
                        <path d="M5 12h14"></path>
                    </svg>
                </button>
            @endif

            {{-- PMD_ACCOUNTANT_HEADER_NO_CALENDAR_V1_BUTTON --}}
            @if($pmdCleanWorkspaceHeaderCalendarVisible)
            <a
                id="pmd-dashboard-lab-calendar-v4"
                class="pmd-dashboard-lab__header-action"
                href="{{ $pmdCleanWorkspaceCalendarSurface ? '#pmd-r2-shared-floor-canvas-v310' : admin_url('dashboard2') }}"
                aria-label="Open calendar"
                title="Open calendar"
            
                aria-pressed="false"
            >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                    <rect x="3" y="5" width="18" height="16" rx="2"></rect>
                    <path d="M16 3v4"></path>
                    <path d="M8 3v4"></path>
                    <path d="M3 11h18"></path>
                </svg>
            </a>
            @endif

            @if(!$pmdCleanWorkspaceCashierSurface)
            {{-- PMD_MAIN_HEADER_NOTIFICATION_GAP_R67_NODE_START --}}
            <span
                data-pmd-main-header-notification-gap-r67=""
                aria-hidden="true"
            >
                <span
                    data-pmd-main-header-notification-divider-r67=""
                    aria-hidden="true"
                ></span>
            </span>
            {{-- PMD_MAIN_HEADER_NOTIFICATION_GAP_R67_NODE_END --}}
            @endif
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
                @if($pmdHeaderNotificationCountV1 > 0)
                    <span
                        class="pmd-dashboard-lab__notif-fallback-count"
                        aria-hidden="true"
                        style="
                            position:absolute!important;
                            top:-7px!important;
                            right:-8px!important;
                            left:auto!important;
                            bottom:auto!important;
                            z-index:8!important;
                            min-width:18px!important;
                            height:18px!important;
                            margin:0!important;
                            padding:0 4px!important;
                            border:2px solid #fff!important;
                            border-radius:999px!important;
                            background:#d83a31!important;
                            color:#fff!important;
                            font-size:9px!important;
                            font-weight:800!important;
                            line-height:14px!important;
                            text-align:center!important;
                            white-space:nowrap!important;
                            box-sizing:border-box!important;
                        "
                    >{{ $pmdHeaderNotificationCountV1 }}</span>
                @endif
                </span>
            </span>
        </div>
    </header>

    {{-- PMD_DASHBOARD_LAB_HEADER_TOOLBAR_POLISH_V4 --}}
    <script id="pmd-dashboard-lab-header-v5">
    (function () {
      'use strict';

      var route = String((window.PMDAdminCanonicalURLR81E ? window.PMDAdminCanonicalURLR81E.logicalPath() : window.location.pathname) || '').replace(/\/+$/, '');
      if (route !== @json($pmdCleanWorkspacePath)) return;

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
        // PMD_LAB_HEADER_SERVER_BELL_NO_REWRITE_V1
        if (!bell.querySelector('svg')) {
          bell.innerHTML = bellSvg();
        }

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
        // PMD_LAB_HEADER_NOTIFICATION_ZERO_MARGIN_V1
        setImportant(notificationRoot, 'margin', '0');
        setImportant(notificationRoot, 'margin-left', '0');
        setImportant(notificationRoot, 'margin-inline-start', '0');
        setImportant(notificationRoot, 'padding', '0');
        setImportant(notificationRoot, 'border', '0');
        setImportant(notificationRoot, 'background', 'transparent');
        setImportant(notificationRoot, 'overflow', 'visible');
        setImportant(notificationRoot, 'list-style', 'none');

        // PMD_HEADER_NOTIFICATION_ROOT_VISIBLE_AFTER_MOUNT_V2
        setImportant(notificationRoot, 'opacity', '1');
        setImportant(notificationRoot, 'visibility', 'visible');
        setImportant(notificationRoot, 'pointer-events', 'auto');
        setImportant(notificationRoot, 'margin-left', '0');
        setImportant(notificationRoot, 'margin-inline-start', '0');

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
        data-pmd-kpi-authority="{{ $pmdCleanWorkspaceKpiAuthority }}"
        data-pmd-kpi-text-visible="{{ $pmdCleanWorkspaceText['visible'] }}"
        data-pmd-kpi-text-already="{{ $pmdCleanWorkspaceText['already_visible'] }}"
        data-pmd-kpi-text-show="{{ $pmdCleanWorkspaceText['show_here'] }}"
        aria-label="{{ $pmdCleanWorkspaceKpiAriaLabel }}"
    >
        @foreach($pmdCleanWorkspaceKpiSelection as $slot => $key)
            @php
                $card = $pmdCleanWorkspaceKpiCards[$key] ?? null;
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
                            {!! $pmdCleanWorkspaceIcon($card['icon']) !!}
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
                        aria-label="{{ $pmdCleanWorkspaceText['choose_kpi'] }}"
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
                        <span class="pmd-dashboard-lab__kpi-menu-heading">{{ $pmdCleanWorkspaceText['choose_kpi'] }}</span>

                        @foreach($pmdCleanWorkspaceKpiOrder as $choiceKey)
                            @php
                                $choice = $pmdCleanWorkspaceKpiCards[$choiceKey] ?? null;
                                $alreadyVisible = in_array(
                                    $choiceKey,
                                    $pmdCleanWorkspaceKpiSelection,
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
                                        <small>{{ $isCurrent ? $pmdCleanWorkspaceText['visible'] : (($alreadyVisible) ? $pmdCleanWorkspaceText['already_visible'] : $pmdCleanWorkspaceText['show_here']) }}</small>
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
    >@json($pmdCleanWorkspaceKpiCards)</script>

    @if($pmdCleanWorkspaceUsesFloor || $pmdCleanWorkspaceAfterFloorPartial)
        <main
            class="pmd-dashboard-lab__stage"
            aria-label="{{ $pmdCleanWorkspaceTitle }}"
        >
            {{-- PMD_RESERVATIONS_LAB_THREE_SURFACES_V2_3
                 Reservations Lab is one primary workspace surface: Floor -> Calendar -> Hour.
                 The Calendar/Hour partial is placed before the Floor only so its server-rendered
                 view controls can switch the same visual slot. It is NOT below-Floor content. --}}
            @if($pmdCleanWorkspaceReservationsSurface && $pmdCleanWorkspaceAfterFloorPartial)
                @include($pmdCleanWorkspaceAfterFloorPartial)
            @endif

            @if($pmdCleanWorkspaceManagerCalendarSurface || $pmdCleanWorkspaceCashierSurface)
                {{-- PMD_MANAGER_CASHIER_CALENDAR_BOOTSTRAP_SHARED_V2 --}}
                @php
                    $pmdManagerCalendarCssPath =
                        base_path(
                            'app/admin/assets/css/'.
                            'pmd-reservations-lab-schedule-v1.css'
                        );

                    $pmdManagerCalendarCssVersion =
                        is_file($pmdManagerCalendarCssPath)
                            ? substr(
                                hash_file(
                                    'sha256',
                                    $pmdManagerCalendarCssPath
                                ),
                                0,
                                16
                            )
                            : '1';
                @endphp

                <link
                    rel="stylesheet"
                    href="{{ asset('app/admin/assets/css/pmd-reservations-lab-schedule-v1.css') }}?v={{ $pmdManagerCalendarCssVersion }}"
                >

                @include(
                    'admin::_partials.pmd_reservations_lab_schedule_v1'
                )
            @endif


            @if($pmdCleanWorkspaceUsesFloor)
                {{-- PMD_DASHBOARD_LAB_STEP3_EXACT_RESERVATIONS_FLOOR_V1 --}}
                @include('admin::_partials.pmd_dashboard_lab_exact_floor_v1', [
                    'floorBootstrap' => $pmdCleanWorkspaceFloorBootstrap ?? [],
                    'displayTables' => $pmdCleanWorkspaceFloorDisplayTables ?? [],
                    'floorMode' => $pmdCleanWorkspaceFloorMode ?? 'row',
                    'floorZoom' => $pmdCleanWorkspaceFloorZoom ?? 1.0,
                    'locationId' => $pmdCleanWorkspaceLocationId ?? 0,
                    'reservationBusyWindows' => $pmdCleanWorkspaceReservationBusyWindows ?? [],
                ])

                @if($pmdCleanWorkspaceReservationsSurface && $pmdCleanWorkspaceBelowFloorPartial)
                    {{-- PMD_RESERVATIONSLAB_SERVER_CARDS_PRE_RUNTIME_V1
                         Reservation cards are already server-rendered. Parse them immediately
                         after the Floor DOM and BEFORE the synchronous Floor mount/Composer
                         runtime work, so refresh cannot show the Floor first and cards later. --}}
                    @include($pmdCleanWorkspaceBelowFloorPartial)
                @endif

                @if($pmdCleanWorkspaceCashierSurface && $pmdCleanWorkspaceAfterFloorPartial)
                    {{-- PMD_CASHIERLAB_SERVER_CARDS_PRE_RUNTIME_V1
                         Cashier operational cards and the Add reservation first card are already
                         server-rendered. Parse them before Floor/Composer runtime work as well. --}}
                    @include($pmdCleanWorkspaceAfterFloorPartial)
                @endif

                {{-- PMD_RESERVATIONSLAB_PARSER_SYNC_FLOOR_BOOT_V1
                     English does not use the global German pmd-i18n-pending body gate.
                     Previously the exact Floor runtime arrived through get_script_tags()
                     at the end of the document, so English could paint the server Floor
                     before the runtime normalized its controls/state. German happened to
                     hide that same boot work, which is why the blink looked EN-only.

                     Load the SAME existing Floor runtime synchronously immediately after
                     the server-rendered Floor and mount it in this parser task. No mask,
                     no timer, no observer and no second Floor authority. The runtime's
                     later DOMContentLoaded mount becomes a harmless no-op because the root
                     already owns __pmdFloorV1. --}}
                @if($pmdCleanWorkspaceDirectFloorSurface)
                    @php
                        $pmdExactFloorRuntimePath = base_path('app/admin/assets/js/pmd-dashboard-lab-exact-floor-v1.js');
                        $pmdExactFloorRuntimeVersion = is_file($pmdExactFloorRuntimePath)
                            ? (string)filemtime($pmdExactFloorRuntimePath)
                            : '1';
                    @endphp
                    <script
                        id="pmd-reservationslab-parser-floor-runtime-v1"
                        src="{{ asset('app/admin/assets/js/pmd-dashboard-lab-exact-floor-v1.js') }}?v={{ $pmdExactFloorRuntimeVersion }}"
                    ></script>
                    <script id="pmd-reservationslab-parser-floor-mount-v1">
                    (function () {
                        'use strict';
                        if (
                            window.PMDDashboardLabExactFloorV1 &&
                            typeof window.PMDDashboardLabExactFloorV1.mount === 'function'
                        ) {
                            window.PMDDashboardLabExactFloorV1.mount(document);
                            document.documentElement.setAttribute(
                                'data-pmd-reservationslab-floor-parser-mounted',
                                '1'
                            );
                        }
                    })();
                    </script>
                @endif
            @endif

            @if($pmdCleanWorkspaceComposerRuntimeSurface)
                {{-- PMD_CLEAN_WORKSPACE_CANONICAL_RESERVATION_COMPOSER_SURFACE_V1_START
                     ReservationsLab and CashierLab share the literal canonical Reservations2
                     Composer. Cashier does NOT load ReservationsLab Calendar/Hour runtime. --}}
                {{-- PMD_RESERVATION_COMPOSER_CONTENT_HASH_ASSETS_V1_0_2
                     The canonical Composer previously used a permanent v=1.0.0 URL,
                     so Safari could revive an old Composer while Schedule was fresh.
                     One content-derived URL is now the sole browser cache authority. --}}
                @php
                    $pmdReservationComposerCssPath = base_path('app/admin/assets/css/pmd-reservation-composer-v1.css');
                    $pmdReservationComposerJsPath = base_path('app/admin/assets/js/pmd-reservation-composer-v1.js');
                    $pmdReservationComposerCssVersion = is_file($pmdReservationComposerCssPath)
                        ? substr(hash_file('sha256', $pmdReservationComposerCssPath), 0, 16)
                        : '1';
                    $pmdReservationComposerJsVersion = is_file($pmdReservationComposerJsPath)
                        ? substr(hash_file('sha256', $pmdReservationComposerJsPath), 0, 16)
                        : '1';
                @endphp
                <link rel="stylesheet" href="{{ asset('app/admin/assets/css/pmd-reservation-composer-v1.css') }}?v={{ $pmdReservationComposerCssVersion }}">
                @include('admin::reservations2._reservation_composer')
                <script>
                window.PMD_RESERVATION_COMPOSER_V1 = Object.freeze({
                  endpoint: @json(admin_url('reservations2'))
                });
                </script>
                <script defer id="pmd-reservation-composer-content-hash-v1-0-2" src="{{ asset('app/admin/assets/js/pmd-reservation-composer-v1.js') }}?v={{ $pmdReservationComposerJsVersion }}"></script>

                @if($pmdCleanWorkspaceCashierSurface)
                    {{-- PMD_CASHIERLAB_CANONICAL_RESERVATION_COMPOSER_BRIDGE_V1
                         Event-driven only. Current clean Floor selection is read through the
                         canonical Composer's getFloorSelection() at the moment the user acts. --}}
                    <script id="pmd-cashierlab-reservation-composer-bridge-v1">
                    (function () {
                        'use strict';
                        if (window.PMDCashierLabReservationCreateV1) return;

                        var createDate = @json($pmdCleanWorkspaceCreateDate);

                        function fallback(trigger) {
                            if (trigger && trigger.getAttribute) {
                                var href = trigger.getAttribute('href');
                                if (href) return href;
                            }
                            return '/admin/reservations/create?reserve_date=' + encodeURIComponent(createDate);
                        }

                        function open(trigger) {
                            var url = fallback(trigger);
                            var api = window.PMDReservationComposerV1;
                            if (!api || typeof api.open !== 'function') {
                                window.location.href = url;
                                return;
                            }

                            var floor = typeof api.getFloorSelection === 'function'
                                ? (api.getFloorSelection() || {})
                                : {};
                            var tableIds = Array.isArray(floor.ids)
                                ? floor.ids.map(Number).filter(function (id, index, list) {
                                    return Number.isInteger(id) && id > 0 && list.indexOf(id) === index;
                                })
                                : [];
                            var tableNames = Array.isArray(floor.names)
                                ? floor.names.filter(Boolean)
                                : [];

                            api.open({
                                version: 1,
                                mode: 'create',
                                source: tableIds.length ? 'cashier-floor-selection' : 'cashier-add-card',
                                reservationId: null,
                                selectedDate: createDate,
                                selectedTime: null,
                                duration: null,
                                tableIds: tableIds,
                                tableNames: tableNames,
                                locationId: null,
                                returnView: 'floor',
                                fallbackUrl: url
                            }, trigger || null).catch(function () {
                                var composer = document.getElementById('pmd-reservation-composer-v1');
                                if (!composer || !composer.classList.contains('show')) {
                                    window.location.href = url;
                                }
                            });
                        }

                        document.addEventListener('click', function (event) {
                            var trigger = event.target && event.target.closest
                                ? event.target.closest('[data-pmd-cashier-reservation-create]')
                                : null;
                            if (!trigger) return;
                            event.preventDefault();
                            event.stopImmediatePropagation();
                            open(trigger);
                        }, true);

                        window.PMDCashierLabReservationCreateV1 = {
                            version: '1.0.0',
                            open: open
                        };
                    })();
                    </script>
                @endif

                @if($pmdCleanWorkspaceCalendarSurface)
                    {{-- PMD_RESERVATIONSLAB_SCHEDULE_DIRECT_AUTHORITY_V1_2
                         One schedule runtime owner, loaded directly after the canonical
                         Composer with a content-derived cache key. Reservationslab.php
                         no longer enqueues this file through the combined Admin asset pipeline. --}}
                    @php
                        $pmdReservationsLabScheduleRuntimePath = base_path('app/admin/assets/js/pmd-reservations-lab-schedule-v1.js');
                        $pmdReservationsLabScheduleRuntimeVersion = is_file($pmdReservationsLabScheduleRuntimePath)
                            ? substr(hash_file('sha256', $pmdReservationsLabScheduleRuntimePath), 0, 16)
                            : '1';
                    @endphp
                    <script defer id="pmd-reservationslab-schedule-direct-v1-2" src="{{ asset('app/admin/assets/js/pmd-reservations-lab-schedule-v1.js') }}?v={{ $pmdReservationsLabScheduleRuntimeVersion }}"></script>
                @endif
                {{-- PMD_CLEAN_WORKSPACE_CANONICAL_RESERVATION_COMPOSER_SURFACE_V1_END --}}
            @endif

            @if(!$pmdCleanWorkspaceReservationsSurface && !$pmdCleanWorkspaceCashierSurface && $pmdCleanWorkspaceAfterFloorPartial)
                @include($pmdCleanWorkspaceAfterFloorPartial)
            @endif

            {{-- PMD_CLEAN_WORKSPACE_BELOW_FLOOR_EXTENSION_V2_1
                 Non-Reservations workspaces keep their existing below-Floor hook here.
                 Reservations cards are parsed immediately after the Floor DOM above. --}}
            @if(!$pmdCleanWorkspaceReservationsSurface && $pmdCleanWorkspaceBelowFloorPartial)
                @include($pmdCleanWorkspaceBelowFloorPartial)
            @endif
        </main>
    @endif
</div>


@if($pmdCleanWorkspaceStandaloneChrome)
<style id="pmd-clean-workspace-standalone-chrome-v3">
html.pmd-clean-workspace-standalone-v3 body :is(#pmd-side-menu2,#pmd-side-menu2-backdrop,#pmd-sidebar-language){display:none!important;visibility:hidden!important;pointer-events:none!important}
html.pmd-clean-workspace-standalone-v3 body :is(.page,.page-wrapper,.page-content,.content-wrapper,.main-content,.container-fluid){left:0!important;right:auto!important;margin-left:0!important;margin-right:0!important;max-width:none!important}
html.pmd-clean-workspace-standalone-v3 body .page-wrapper{width:100vw!important;min-width:0!important}
html.pmd-clean-workspace-standalone-v3 #pmd-dashboard-lab{width:min(1480px,calc(100% - 36px))!important;margin-left:auto!important;margin-right:auto!important}
/* PMD_CLEAN_WORKSPACE_HEADER_TITLE_GAP_V3_4 */
html.pmd-clean-workspace-standalone-v3 #pmd-r2-clean-header .pmd-owner-header__left{gap:20px!important}
html.pmd-clean-workspace-standalone-v3 #pmd-r2-clean-header .pmd-clean-workspace__brand{display:grid;place-items:center;flex:0 0 46px;width:46px;height:46px;border-radius:15px;background:#002b25;box-shadow:0 4px 12px rgba(0,43,37,.12)}
html.pmd-clean-workspace-standalone-v3 #pmd-r2-clean-header .pmd-clean-workspace__brand img{display:block;width:31px;height:31px;object-fit:contain}
html.pmd-clean-workspace-standalone-v3 #pmd-r2-clean-header .pmd-clean-workspace__language{position:relative!important}
html.pmd-clean-workspace-standalone-v3 #pmd-r2-clean-header .pmd-clean-workspace__language-code{position:absolute;top:-7px;right:-9px;display:inline-grid;place-items:center;min-width:25px;height:18px;padding:0 4px;border:2px solid #fff;border-radius:999px;background:#eef6fb;color:#173752;font-size:9px;font-weight:900;line-height:1}
@media(max-width:700px){html.pmd-clean-workspace-standalone-v3 #pmd-dashboard-lab{width:min(100%,calc(100% - 20px))!important}}
</style>
<script id="pmd-clean-workspace-language-runtime-v3">
(function(){'use strict';var b=document.getElementById('pmd-clean-workspace-language-v3');if(!b||b.dataset.ready==='1')return;b.dataset.ready='1';
function token(){var m=document.querySelector('meta[name="csrf-token"]');if(m&&m.content)return m.content;var i=document.querySelector('input[name="_token"]');return i?i.value:''}
b.addEventListener('click',async function(e){e.preventDefault();if(b.disabled)return;var endpoint=b.getAttribute('data-endpoint');var next=String(b.getAttribute('data-next')||'').toLowerCase();if(!endpoint||(next!=='en'&&next!=='de'))return;b.disabled=true;try{var body=new URLSearchParams();body.set('code',next);var tok=token();if(tok)body.set('_token',tok);var h={'Accept':'application/json','Content-Type':'application/x-www-form-urlencoded; charset=UTF-8','X-Requested-With':'XMLHttpRequest'};if(tok)h['X-CSRF-TOKEN']=tok;var r=await fetch(endpoint,{method:'POST',credentials:'same-origin',cache:'no-store',headers:h,body:body.toString()});var d={};try{d=await r.json()}catch(ignore){}if(!r.ok||d.ok!==true)throw new Error(d.message||('Language switch failed: HTTP '+r.status));window.location.href=(window.PMDAdminCanonicalURLR81E ? window.PMDAdminCanonicalURLR81E.logicalPath() : window.location.pathname)+window.location.search+window.location.hash}catch(err){b.disabled=false;console.error('[PMD Clean Language]',err)}},false);
})();
</script>
@endif


{{-- PMD_CLEAN_WORKSPACE_STANDALONE_GEOMETRY_V3_2
     Removing Side Menu must also remove the old desktop shell offset.
     Standalone pages own a true top=0 / full-width shell. --}}
@if($pmdCleanWorkspaceStandaloneChrome)
<style id="pmd-clean-workspace-standalone-geometry-v3-2">
html.pmd-clean-workspace-standalone-v3,
html.pmd-clean-workspace-standalone-v3 body.page.pmd-clean-workspace-page {
  margin: 0 !important;
  padding: 0 !important;
}

html.pmd-clean-workspace-standalone-v3
body.page.pmd-clean-workspace-page
.page-wrapper {
  position: relative !important;
  inset: auto !important;
  top: 0 !important;
  left: 0 !important;
  right: auto !important;
  margin: 0 !important;
  padding: 0 !important;
  width: 100vw !important;
  min-width: 0 !important;
  max-width: none !important;
  min-height: 100vh !important;
  transform: none !important;
}

html.pmd-clean-workspace-standalone-v3
body.page.pmd-clean-workspace-page
.page-content,
html.pmd-clean-workspace-standalone-v3
body.page.pmd-clean-workspace-page
.content-wrapper,
html.pmd-clean-workspace-standalone-v3
body.page.pmd-clean-workspace-page
.container-fluid {
  position: relative !important;
  inset: auto !important;
  top: 0 !important;
  left: 0 !important;
  margin: 0 !important;
  padding: 0 !important;
  width: 100% !important;
  min-width: 0 !important;
  max-width: none !important;
  transform: none !important;
}

html.pmd-clean-workspace-standalone-v3
body.page.pmd-clean-workspace-page
#pmd-dashboard-lab {
  width: calc(100vw - 24px) !important;
  max-width: none !important;
  min-width: 0 !important;
  margin: 0 12px !important;
  padding: 0 0 56px !important;
}

html.pmd-clean-workspace-standalone-v3
body.page.pmd-clean-workspace-page
#pmd-dashboard-lab
#pmd-r2-clean-header,
html.pmd-clean-workspace-standalone-v3
body.page.pmd-clean-workspace-page
#pmd-dashboard-lab
.pmd-dashboard-lab__kpis,
html.pmd-clean-workspace-standalone-v3
body.page.pmd-clean-workspace-page
#pmd-dashboard-lab
.pmd-dashboard-lab__stage,
html.pmd-clean-workspace-standalone-v3
body.page.pmd-clean-workspace-page
#pmd-dashboard-lab
.pmd-ops-section {
  width: 100% !important;
  max-width: none !important;
  min-width: 0 !important;
  margin-left: 0 !important;
  margin-right: 0 !important;
}

@media (max-width: 700px) {
  html.pmd-clean-workspace-standalone-v3
  body.page.pmd-clean-workspace-page
  #pmd-dashboard-lab {
    width: calc(100vw - 16px) !important;
    margin: 0 8px !important;
    padding-bottom: 40px !important;
  }
}
</style>
@endif

{{-- PMD_CLEAN_WORKSPACE_LANGUAGE_TEXT_ONLY_V3_3 --}}
@if($pmdCleanWorkspaceStandaloneChrome)
<style id="pmd-clean-workspace-language-text-only-v3-3">
html.pmd-clean-workspace-standalone-v3 #pmd-clean-workspace-language-v3 svg {
  display: none !important;
  visibility: hidden !important;
}
html.pmd-clean-workspace-standalone-v3 #pmd-clean-workspace-language-v3 {
  display: inline-grid !important;
  place-items: center !important;
  font-size: 13px !important;
  font-weight: 900 !important;
  letter-spacing: .02em !important;
}
html.pmd-clean-workspace-standalone-v3 #pmd-clean-workspace-language-v3 .pmd-clean-workspace__language-code {
  position: static !important;
  inset: auto !important;
  display: inline !important;
  min-width: 0 !important;
  width: auto !important;
  height: auto !important;
  margin: 0 !important;
  padding: 0 !important;
  border: 0 !important;
  border-radius: 0 !important;
  background: transparent !important;
  color: #173752 !important;
  font-size: 13px !important;
  font-weight: 900 !important;
  line-height: 1 !important;
  transform: none !important;
}
</style>
@endif

{{-- PMD_CLEAN_WORKSPACE_LANGUAGE_CENTER_V3_3_2 --}}
@if($pmdCleanWorkspaceStandaloneChrome)
<style id="pmd-clean-workspace-language-center-v3-3-2">
html.pmd-clean-workspace-standalone-v3 #pmd-clean-workspace-language-v3 {
  position: relative !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  width: 48px !important;
  min-width: 48px !important;
  height: 48px !important;
  min-height: 48px !important;
  margin: 0 !important;
  padding: 0 !important;
  overflow: hidden !important;
  font-size: 0 !important;
  line-height: 1 !important;
}
html.pmd-clean-workspace-standalone-v3 #pmd-clean-workspace-language-v3 .pmd-clean-workspace__language-code {
  position: absolute !important;
  inset: 0 !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  width: 100% !important;
  height: 100% !important;
  margin: 0 !important;
  padding: 0 !important;
  color: #173752 !important;
  font-size: 13px !important;
  font-weight: 900 !important;
  line-height: 1 !important;
  letter-spacing: .02em !important;
  transform: none !important;
}
</style>
@endif

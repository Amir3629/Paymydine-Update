{{-- PMD_GLASS_NUMERIC_CONTROLS_WIRING_V1_20261019: server-side tenant money label, no hard-coded currency. --}}
@include('admin::_partials.pmd_glass_currency_config_v1')
@php
    $data = $pmdShifts ?? [];
    $ready = (bool)($data['ready'] ?? false);
    $people = collect($data['people'] ?? []);
    $shifts = collect($data['shifts'] ?? []);
    $monthShifts = collect($data['month_shifts'] ?? []);
    $calendarDays = collect($data['calendar_days'] ?? []);
    $monthStart = $data['month_start'] ?? now()->startOfMonth();
    $selectedDay = $data['selected_day'] ?? now()->startOfDay();
    $weekStart = $data['week_start'] ?? now()->startOfWeek();
    $currentConfirmed = !empty($data['current_confirmed']);
    $liveAttendance = is_array($data['live_attendance'] ?? null)
        ? $data['live_attendance']
        : [];
    $liveAttendanceRows = is_array($liveAttendance['rows'] ?? null)
        ? $liveAttendance['rows']
        : [];
    $actualExtraShifts = collect($data['actual_extra_shifts'] ?? []);
    $todayExtraShifts = collect($data['today_extra_shifts'] ?? []);
    $unreviewedExtraShifts = collect($data['unreviewed_extra_shifts'] ?? []);
    $stats = $data['stats'] ?? [];
    $kpiMonthName = trim((string)($stats['month_name'] ?? now()->format('F'))) ?: now()->format('F');
    $departments = $data['departments'] ?? [];
    $accessRoles = collect($data['access_roles'] ?? []);
    $accessStaff = collect($data['access_staff'] ?? []);
    $teamRequests = collect($data['team_requests'] ?? []);
    $defaultAccessRole = $accessRoles->first(fn($role) => strtolower((string)$role->code) === \Admin\Services\PmdDefaultStaffRoleService::TEAM_MEMBER) ?: $accessRoles->first();
    $byDay = $shifts->groupBy(fn($s) => \Carbon\Carbon::parse($s->shift_date)->toDateString());
    $returnTo = request()->getRequestUri();
    $retryMember = session()->has('pmd_shifts_member_error');

    // PMD_SHIFTS_MONTH_TEAM_SUMMARY_V8
    // A month cell shows the team that matters operationally: the active Shift
    // for today, otherwise the next Shift today, and the first planned Shift on
    // other dates. The cell stays intentionally compact (max five role rows).
    $pmdShiftMinutes = static function ($value) {
        $value = trim((string)$value);
        if ($value === '') return null;
        $parts = explode(':', $value);
        if (count($parts) < 2) return null;
        return ((int)$parts[0] * 60) + (int)$parts[1];
    };

    $pmdRelevantShiftForDay = static function ($date, $dayShifts) use ($pmdShiftMinutes) {
        $ordered = collect($dayShifts)->sortBy(function ($shift) use ($pmdShiftMinutes) {
            $start = $pmdShiftMinutes($shift->starts_at ?? null);
            return $start === null ? 9999 : $start;
        })->values();
        if ($ordered->isEmpty()) return null;

        $day = \Carbon\Carbon::parse($date)->startOfDay();
        if (!$day->isToday()) return $ordered->first();

        $nowMinutes = ((int)now()->format('H') * 60) + (int)now()->format('i');
        foreach ($ordered as $shift) {
            $start = $pmdShiftMinutes($shift->starts_at ?? null);
            $end = $pmdShiftMinutes($shift->ends_at ?? null);
            if ($start === null) $start = 0;
            if ($end === null) $end = 1440;
            if ($end <= $start) $end += 1440;
            if ($nowMinutes >= $start && $nowMinutes < $end) return $shift;
        }
        foreach ($ordered as $shift) {
            $start = $pmdShiftMinutes($shift->starts_at ?? null);
            if ($start !== null && $start > $nowMinutes) return $shift;
        }
        return $ordered->last();
    };

    $pmdShiftTeamRows = static function ($shift) {
        if (!$shift) return [];
        $groups = [
            'Kitchen' => [],
            'Waiters' => [],
            'Cashier' => [],
            'Bar' => [],
            'Other' => [],
        ];
        foreach (collect($shift->people ?? []) as $person) {
            $name = trim((string)($person->display_name_snapshot ?? ''));
            if ($name === '') continue;
            $department = strtolower(trim((string)($person->department_snapshot ?? 'other')));
            $role = strtolower(trim((string)($person->job_role_snapshot ?? '')));

            if ($department === 'kitchen') $group = 'Kitchen';
            elseif (str_contains($role, 'cashier') || str_contains($role, 'till')) $group = 'Cashier';
            elseif (str_contains($role, 'waiter') || str_contains($role, 'server') || $department === 'floor') $group = 'Waiters';
            elseif ($department === 'bar' || str_contains($role, 'bartender') || $role === 'bar') $group = 'Bar';
            else $group = 'Other';

            if (!in_array($name, $groups[$group], true)) $groups[$group][] = $name;
        }

        $rows = [];
        foreach ($groups as $label => $names) {
            if (!$names) continue;
            $visible = array_slice($names, 0, 3);
            $text = implode(', ', $visible);
            if (count($names) > 3) $text .= ' +'.(count($names) - 3);
            $rows[] = ['label' => $label, 'names' => $text];
            if (count($rows) >= 5) break;
        }
        return $rows;
    };

    $pmdShiftIcon = static function ($name) {
        $paths = [
            'calendar' => '<path d="M4 5h16v15H4zM8 3v4M16 3v4M4 10h16"></path>',
            'check' => '<path d="m5 12 4 4L19 6"></path>',
            'alert' => '<circle cx="12" cy="12" r="9"></circle><path d="M12 8v5M12 17h.01"></path>',
            'timer' => '<circle cx="12" cy="13" r="8"></circle><path d="M12 9v4l3 2M9 2h6M12 2v3"></path>',
            'layers' => '<path d="m12 3 9 5-9 5-9-5 9-5zM3 12l9 5 9-5M3 16l9 5 9-5"></path>',
            'days' => '<rect x="3" y="5" width="18" height="16" rx="2"></rect><path d="M8 3v4M16 3v4M3 10h18M8 14h.01M12 14h.01M16 14h.01"></path>',
            'users' => '<circle cx="9" cy="8" r="3"></circle><path d="M3 20a6 6 0 0 1 12 0M16 5a3 3 0 0 1 0 6M17 14a5 5 0 0 1 4 5"></path>',
        ];
        return $paths[$name] ?? $paths['calendar'];
    };

    $kpiCards = [
        'scheduled_today' => [
            'title' => 'Scheduled today',
            'value' => (string)(int)($stats['scheduled_today'] ?? 0),
            'description' => 'people across today’s shifts',
            'info' => 'How many different team members are scheduled to work today.',
            'tone' => 'mauve',
            'icon' => 'calendar',
        ],
        'present_now' => [
            'title' => 'Present now',
            'value' => ($stats['present_now'] ?? null) === null ? '—' : (string)(int)$stats['present_now'],
            'description' => 'checked in right now',
            'info' => 'How many scheduled team members are checked in right now.',
            'tone' => 'magenta',
            'icon' => 'check',
        ],
        'missing_now' => [
            'title' => 'Missing now',
            'value' => ($stats['missing_now'] ?? null) === null ? '—' : (string)(int)$stats['missing_now'],
            'description' => 'scheduled now · not checked in',
            'info' => 'How many scheduled team members should be here now but are not checked in.',
            'tone' => 'yellow',
            'icon' => 'alert',
        ],
        'month_hours' => [
            'title' => $kpiMonthName.' hours',
            'value' => number_format((float)($stats['month_hours'] ?? 0), 1),
            'description' => (int)($stats['month_shifts'] ?? 0).' shifts · '.(int)($stats['scheduled_days'] ?? 0).' scheduled days',
            'info' => 'Total planned staff hours for the current month.',
            'tone' => 'cyan',
            'icon' => 'timer',
        ],
        'month_shifts' => [
            'title' => 'Month shifts',
            'value' => (string)(int)($stats['month_shifts'] ?? 0),
            'description' => 'planned shifts in '.$kpiMonthName,
            'info' => 'Number of planned shifts in the current month.',
            'tone' => 'orange',
            'icon' => 'layers',
        ],
        'scheduled_days' => [
            'title' => 'Scheduled days',
            'value' => (string)(int)($stats['scheduled_days'] ?? 0),
            'description' => 'days with at least one planned shift',
            'info' => 'How many days in the current month have at least one planned shift.',
            'tone' => 'green',
            'icon' => 'days',
        ],
        'active_team' => [
            'title' => 'Active team',
            'value' => (string)$people->count(),
            'description' => 'people available for shift planning',
            'info' => 'How many active team members can be used in shift planning.',
            'tone' => 'blue',
            'icon' => 'users',
        ],
    ];

    $kpiOrder = array_keys($kpiCards);
    $kpiDefaults = ['scheduled_today', 'present_now', 'missing_now', 'month_hours'];
    $cookieSelection = array_values(array_unique(array_filter(explode(',', (string)request()->cookie('pmd_shifts_kpis', '')))));
    $kpiSelection = [];
    foreach($cookieSelection as $key) {
        if (isset($kpiCards[$key]) && !in_array($key, $kpiSelection, true)) $kpiSelection[] = $key;
        if (count($kpiSelection) === 4) break;
    }
    foreach($kpiDefaults as $key) {
        if (!in_array($key, $kpiSelection, true)) $kpiSelection[] = $key;
        if (count($kpiSelection) === 4) break;
    }

    $pmdQuickPinService = app(\App\Services\PmdStaffPinService::class);
    $pmdQuickPinReady = $pmdQuickPinService->ready();

    $bootPeople = $people->map(function($person) use (
        $departments,
        $accessStaff,
        $pmdQuickPinService,
        $pmdQuickPinReady
    ) {
        $staff = !empty($person->staff_id) ? $accessStaff->get((int)$person->staff_id) : null;
        $userId = $staff && $staff->user ? (int)$staff->user->user_id : 0;
        return [
            'id' => (int)$person->id,
            'name' => (string)$person->display_name,
            'role' => (string)($person->job_role ?: ($departments[$person->department] ?? 'Team')),
            'department' => (string)($person->department ?? 'other'),
            'has_access' => !empty($person->staff_id),
            'staff_id' => !empty($person->staff_id) ? (int)$person->staff_id : null,
            'username' => $staff && $staff->user ? (string)$staff->user->username : '',
            'staff_role_id' => $staff ? (int)$staff->staff_role_id : null,
            'access_role_code' => $staff && $staff->role ? strtolower(trim((string)$staff->role->code)) : '',
            'access_role_name' => $staff && $staff->role ? (string)$staff->role->name : '',
            'has_quick_pin' => $userId > 0
                && $pmdQuickPinReady
                && $pmdQuickPinService->hasPinForUser($userId),
        ];
    })->values();

    $bootShifts = $shifts->map(function($shift) {
        $shiftPeople = collect($shift->people ?? [])->map(fn($row) => [
            'assignment_id' => (int)$row->id,
            'person_id' => $row->person_id ? (int)$row->person_id : null,
            'name' => (string)$row->display_name_snapshot,
            'role' => (string)($row->job_role_snapshot ?: ucfirst((string)$row->department_snapshot)),
            'attendance' => (string)($row->attendance_status ?? 'planned'),
        ])->values();
        return [
            'id' => (int)$shift->id,
            'date' => \Carbon\Carbon::parse($shift->shift_date)->toDateString(),
            'label' => (string)$shift->label,
            'start' => $shift->starts_at ? substr((string)$shift->starts_at, 0, 5) : '',
            'end' => $shift->ends_at ? substr((string)$shift->ends_at, 0, 5) : '',
            'notes' => (string)($shift->notes ?? ''),
            'break_minutes' => isset($shift->break_minutes) ? max(0, min(240, (int)$shift->break_minutes)) : 0,
            'confirmed' => !empty($shift->confirmed_at) || strtolower((string)$shift->status) === 'confirmed',
            'people' => $shiftPeople,
        ];
    })->values();
    try {
        $pmdShiftsNotificationCount = app(\Admin\Services\PmdNotificationCountV1::class)->currentNewCount();
    } catch (\Throwable $error) {
        $pmdShiftsNotificationCount = 0;
    }
@endphp

<div id="pmd-shifts" class="pmd-shifts" data-pmd-shifts-root>
    <header class="pmd-shifts__header">
        <div class="pmd-shifts__header-left">
            <div>
                <h1>Shifts</h1>
            </div>
        </div>
        <!-- PMD_SHIFTS_HEADER_NOTIFICATION_ONLY_V6 -->
        <div class="pmd-shifts__header-actions" aria-label="Shift actions">
            {{-- PMD_SHIFTS_STAFF_CENTER_UI_V1_20261021: Owner/Manager center, lazy loaded without affecting rota. --}}
            <button type="button" class="pmd-staff-ops__open" data-pmd-staff-ops-open data-pmd-staff-ops-url="{{ admin_url('shifts/staffcenter') }}" aria-haspopup="dialog" aria-controls="pmd-staff-ops-dialog">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 19V8m0 0 8-4 8 4v11M4 8h16M9 12h6m-6 4h6" /></svg>
                <span>Staff activity</span>
            </button>
            {{-- PMD_SHIFTS_REAL_NOTIFICATION_V1: render the shared functional notification dropdown here. --}}
            <ul class="pmd-shifts__notification-slot" data-pmd-shifts-notification-slot aria-label="Notifications">
                @include('admin::_partials.notification_bell')
            </ul>
        </div>
    </header>

    {{-- PMD_SHIFTS_STAFF_CENTER_UI_V1_20261021: accessible management overlay, server renders only after role check. --}}
    <div class="pmd-staff-ops" id="pmd-staff-ops-dialog" data-pmd-staff-ops-dialog role="dialog" aria-modal="true" aria-label="Staff operations" aria-hidden="true" hidden>
        <button class="pmd-staff-ops__backdrop" type="button" data-pmd-staff-ops-close aria-label="Close staff operations"></button>
        <div class="pmd-staff-ops__sheet" role="document">
            <button type="button" class="pmd-staff-ops__close" data-pmd-staff-ops-close aria-label="Close">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6 18 18M18 6 6 18" /></svg>
            </button>
            <div class="pmd-staff-ops__content" data-pmd-staff-ops-content aria-live="polite">
                <p class="pmd-staff-ops__empty">Open staff operations to review attendance and team activity.</p>
            </div>
            <footer class="pmd-staff-ops__footer">
                <button type="button" data-pmd-staff-ops-refresh>Refresh activity</button>
                <button type="button" data-pmd-staff-ops-close>Close</button>
            </footer>
        </div>
    </div>

    @if(!$ready)
        <section class="pmd-shifts__schema-card">
            <span class="pmd-shifts__schema-icon">↻</span>
            <div><strong>Kitchen Operations update is not active on this restaurant yet.</strong><p>Run the latest PMD migration once. Existing restaurant data is not changed.</p></div>
        </section>
    @else
        <section
            id="pmd-r2-reservation-kpis-v307"
            class="pmd-r2-kpis-v2401 pmd-dashboard2-kpis-v2 pmd-shifts-exact-kpis"
            data-pmd-shifts-kpis
            aria-label="Shift KPIs"
        >
            @foreach($kpiSelection as $slot => $key)
                @php $card = $kpiCards[$key]; @endphp
                <article
                    class="pmd-r2-kpi-v2401-card"
                    data-pmd-shifts-kpi-slot="{{ $slot }}"
                    data-pmd-shifts-kpi-key="{{ $key }}"
                    data-pmd-dashboard2-kpi="{{ $key }}"
                    data-pmd-kpi-info-copy="{{ $card['info'] ?? '' }}"
                    data-pmd-kpi-v2401-tone="{{ $card['tone'] }}"
                >
                    <div class="pmd-r2-kpi-v2401-icon" aria-hidden="true"><svg viewBox="0 0 24 24">{!! $pmdShiftIcon($card['icon']) !!}</svg></div>
                    <div class="pmd-r2-kpi-v2401-copy">
                        <span class="pmd-r2-kpi-v2401-title">{{ $card['title'] }}</span>
                        <strong class="pmd-r2-kpi-v2401-value">{{ $card['value'] }}</strong>
                        <span class="pmd-r2-kpi-v2401-description">{{ $card['description'] }}</span>
                    </div>
                    {{-- PMD_SHIFTS_KPI_INFO_V154 --}}
                    <div class="pmd-kpi-info-panel" data-pmd-kpi-info-panel="1" aria-live="polite">
                        <strong></strong>
                        <span></span>
                    </div>
                    <button
                        type="button"
                        class="pmd-kpi-info-button"
                        data-pmd-kpi-info-button="1"
                        aria-pressed="false"
                        aria-label="About this KPI"
                        title="About this KPI"
                    >
                        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <circle cx="12" cy="12" r="9"></circle>
                            <path d="M12 11v5"></path>
                            <path d="M12 8h.01"></path>
                        </svg>
                    </button>
                    <button type="button" class="pmd-r2-kpi-v2401-more" data-pmd-shifts-kpi-menu-button aria-label="Choose KPI" aria-haspopup="menu" aria-expanded="false"><span></span><span></span><span></span></button>
                    <div class="pmd-r2-kpi-v2401-menu pmd-shifts__kpi-menu" data-pmd-shifts-kpi-menu role="menu" hidden>
                        <span class="pmd-dashboard-lab__kpi-menu-heading">Choose KPI</span>
                        @foreach($kpiOrder as $choiceKey)
                            @php
                                $choice = $kpiCards[$choiceKey];
                                $alreadyVisible = in_array($choiceKey, $kpiSelection, true);
                                $isCurrent = $choiceKey === $key;
                            @endphp
                            <button type="button" class="pmd-r2-kpi-v2401-option{{ $isCurrent ? ' is-selected' : '' }}" data-pmd-shifts-kpi-option="{{ $choiceKey }}" role="menuitem" {{ ($alreadyVisible && !$isCurrent) ? 'disabled' : '' }}>
                                <span class="pmd-r2-kpi-v2401-option-copy"><strong>{{ $choice['title'] }}</strong><small>{{ $isCurrent ? 'Visible in this card' : ($alreadyVisible ? 'Already visible' : 'Show in this card') }}</small></span>
                                <span class="pmd-r2-kpi-v2401-check">{{ $isCurrent ? '✓' : '' }}</span>
                            </button>
                        @endforeach
                    </div>
                </article>
            @endforeach
        </section>

        {{-- PMD_SHIFTS_WORKFORCE_DESK_V1_20261023
             Actual clock-in sessions are separate from the published rota.
             Amber = unscheduled actual work, not an automatically assigned plan. --}}
        <section class="pmd-workforce-desk" id="pmd-workforce-desk" aria-labelledby="pmd-workforce-desk-title">
            <header class="pmd-workforce-desk__heading">
                <div>
                    <small>WORKFORCE · OPERATIONS</small>
                    <h2 id="pmd-workforce-desk-title">Team control</h2>
                    <p>Review time-clock activity and requests without changing the published rota.</p>
                </div>
                <div class="pmd-workforce-desk__actions">
                    <button type="button" data-pmd-staff-ops-shortcut="presence">Working now</button>
                    <button type="button" data-pmd-staff-ops-shortcut="requests">Requests <span>{{ $teamRequests->count() }}</span></button>
                    <button type="button" data-pmd-staff-ops-shortcut="chat">Team chat</button>
                    <button type="button" data-pmd-staff-ops-shortcut="activity">Activity</button>
                </div>
            </header>
            <div class="pmd-workforce-desk__summary" aria-label="Additional time-clock shifts">
                <div><strong>{{ $todayExtraShifts->count() }}</strong><span>Extra shifts today</span></div>
                <div><strong>{{ $unreviewedExtraShifts->count() }}</strong><span>Awaiting manager review</span></div>
                <div><strong>{{ $actualExtraShifts->count() }}</strong><span>Extra sessions in this calendar</span></div>
            </div>
            <div class="pmd-workforce-desk__ledger" role="region" aria-label="Actual shifts outside the plan">
                @forelse($actualExtraShifts->take(40) as $extra)
                    <article class="pmd-workforce-desk__actual{{ $extra->reviewed ? ' is-reviewed' : '' }}">
                        <span class="pmd-workforce-desk__actual-bar" aria-hidden="true"></span>
                        <div class="pmd-workforce-desk__actual-person">
                            <strong>{{ $extra->person_name }}</strong>
                            <small>{{ \Carbon\Carbon::parse($extra->check_in_time)->format('D, d M Y') }}
                                · {{ $extra->start_label }} – {{ $extra->end_label ?: 'Working now' }}
                            </small>
                        </div>
                        <div class="pmd-workforce-desk__actual-state">
                            <span>{{ $extra->reviewed ? 'Reviewed' : 'Extra · not planned' }}</span>
                            @if($extra->is_open)
                                <small>On shift</small>
                            @elseif(!$extra->reviewed)
                                <form method="post" action="{{ admin_url('shifts/reviewactual') }}">
                                    @csrf
                                    <input type="hidden" name="attendance_id" value="{{ (int)$extra->actual_shift_id }}">
                                    <button type="submit">Mark reviewed</button>
                                </form>
                            @endif
                        </div>
                    </article>
                @empty
                    <p class="pmd-workforce-desk__empty">No extra time-clock shifts this month. Planned shifts remain below.</p>
                @endforelse
            </div>
        </section>

        {{-- PMD_SHIFTS_DAY_ONLY_WORKSPACE_V15 --}}
        <section
            id="pmd-shifts-day-surface"
            class="pmd-shifts-day-surface"
            data-pmd-shifts-day-surface
            aria-label="Daily shift plan"
        >
            <section
                id="pmd-shift-day"
                class="pmd-r2-yc-selected pmd-shifts-hour-host"
                data-pmd-shifts-hour-host
            >
                @include('admin::pmdshifts._server_rota_v13')
            </section>
        </section>
        {{-- PMD_SHIFTS_CANONICAL_TEAM_SURFACE_V1: Team editing lives in the existing modal; no duplicate lower panel. --}}


        <div class="pmd-shifts__modal" data-pmd-shift-modal hidden aria-hidden="true" role="dialog" aria-modal="true" aria-labelledby="pmd-shift-modal-title">
            <button type="button" class="pmd-shifts__modal-backdrop" data-pmd-shift-close tabindex="-1" aria-label="Close"></button>
            <section class="pmd-shifts__modal-card" role="document">
                <header class="pmd-shifts__modal-header">
                    <div><h2 id="pmd-shift-modal-title" data-pmd-shift-modal-title>Add shift</h2></div>
                    <button type="button" class="pmd-shifts__modal-close" data-pmd-shift-close aria-label="Close"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"></path></svg></button>
                </header>
                {{-- PMD_SHIFTS_OPTIONAL_LABEL_V17 --}}
                <form class="pmd-shifts__modal-form" method="post" action="{{ admin_url('shifts/saveshift') }}" data-pmd-shift-form>
                    @csrf
                    <input type="hidden" name="id" value="" data-pmd-shift-id>
                    <input type="hidden" name="return_to" value="{{ $returnTo }}">
                    <div class="pmd-shifts__modal-body">
                        <div class="pmd-shifts__preset-row pmd-shifts__shift-quick-row">
                            <button type="button" data-pmd-shift-duration="480">8 hours</button>
                            <button type="button" data-pmd-shift-break-default="30">30 min Pause</button>
                        </div>
                        <div class="pmd-shifts__form-grid">
                            <label><span>Date</span><input required type="date" name="shift_date" value="{{ $selectedDay->toDateString() }}" data-pmd-shift-date-input></label>
                            <label><span>Shift name</span><input maxlength="64" name="label" value="" data-pmd-shift-label placeholder="Optional"></label>
                            <label><span>Start</span><input type="time" name="starts_at" data-pmd-shift-start></label>
                            <label><span>End</span><input type="time" name="ends_at" data-pmd-shift-end></label>
                            <label><span>Pause (min)</span><input type="number" name="break_minutes" min="0" max="240" step="5" value="30" data-pmd-shift-break></label>
                            <label class="is-full"><span>Note</span><textarea name="notes" maxlength="2000" rows="2" data-pmd-shift-notes placeholder="Optional note"></textarea></label>
                        </div>
                        <fieldset class="pmd-shifts__person-picker">
                            <legend><strong>Team</strong></legend>
                            @forelse($people as $person)
                                <label class="pmd-shifts__person-option">
                                    <input type="checkbox" name="person_ids[]" value="{{ (int)$person->id }}" data-pmd-shift-person>
                                    <span class="pmd-shifts__person-option-box"><svg viewBox="0 0 24 24"><path d="m5 12 4 4L19 6"></path></svg></span>
                                    <span><strong>{{ $person->display_name }}</strong><small>{{ $person->job_role ?: ($departments[$person->department] ?? 'Team') }}</small></span>
                                </label>
                            @empty
                                <div class="pmd-shifts__picker-empty">No members yet. <button type="button" class="pmd-shifts__picker-member-open" data-pmd-team-open>Add a member</button>.</div>
                            @endforelse
                        </fieldset>
                    </div>
                    <footer class="pmd-shifts__modal-footer">
                        <button type="button" class="pmd-shifts__button is-danger" data-pmd-shift-remove-current hidden>Remove shift</button>
                        <span class="pmd-shifts__modal-footer-spacer" aria-hidden="true"></span>
                        <button type="button" class="pmd-shifts__button is-soft" data-pmd-shift-close>Cancel</button>
                        <button type="submit" class="pmd-shifts__button">Save shift</button>
                    </footer>
                </form>
            </section>
        </div>

        {{-- PMD_SHIFTS_MEMBER_NO_AREA_V1: Role owns operational category; Access Role owns permissions. --}}

        <div class="pmd-shifts__modal" data-pmd-team-modal @unless($retryMember) hidden @endunless aria-hidden="{{ $retryMember ? 'false' : 'true' }}" role="dialog" aria-modal="true" aria-labelledby="pmd-team-modal-title">
            <button type="button" class="pmd-shifts__modal-backdrop" data-pmd-team-close tabindex="-1" aria-label="Close"></button>
            <section class="pmd-shifts__modal-card pmd-shifts__team-card pmd-shifts__team-editor-card" role="document">
                <header class="pmd-shifts__modal-header">
                    <div><h2 id="pmd-team-modal-title" data-pmd-team-form-title>Member</h2></div>
                    <button type="button" class="pmd-shifts__modal-close" data-pmd-team-close aria-label="Close"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"></path></svg></button>
                </header>
                {{-- PMD_SHIFTS_MEMBER_MODAL_UI_V11: one title, no ghost Area column. --}}
                <form class="pmd-shifts__team-form pmd-shifts__team-editor" method="post" action="{{ admin_url('shifts/saveperson') }}" data-pmd-team-form data-default-access-role="{{ (int)optional($defaultAccessRole)->staff_role_id }}" @if($retryMember) data-pmd-team-retry="1" @endif>
                    @csrf
                    <input type="hidden" name="id" value="{{ $retryMember ? old('id', '') : '' }}" data-pmd-team-person-id>
                    <input type="hidden" name="return_to" value="{{ $retryMember ? old('return_to', $returnTo) : $returnTo }}">
                    @if($retryMember)
                        <div class="alert alert-danger" role="alert" data-pmd-team-error>{{ session('pmd_shifts_member_error') }}</div>
                    @endif
                    <label><span>Name</span><input required minlength="2" maxlength="32" name="display_name" value="{{ $retryMember ? old('display_name', '') : '' }}" data-pmd-team-name placeholder="Anna"></label>
                    <div class="pmd-shifts__team-identity-row">
                        <label><span>Role <small>(optional)</small></span><input maxlength="64" name="job_role" value="{{ $retryMember ? old('job_role', '') : '' }}" data-pmd-team-role placeholder="Chef, Waiter…"></label>
                    </div>
                    <input type="hidden" name="give_access" value="1">
                    <div class="pmd-shifts__team-access-fields is-required" data-pmd-team-access-fields>
                        <label data-pmd-team-username-field><span>Username <small>Web / Portal</small></span><input maxlength="32" name="username" value="{{ $retryMember ? old('username', '') : '' }}" autocomplete="off" data-pmd-team-username></label>
                        <div class="pmd-shifts__role-field" data-pmd-team-access-field>
                            <span class="pmd-shifts__role-label">Access</span>
                            <select
                                class="pmd-shifts__role-select-source"
                                name="staff_role_id"
                                required
                                data-pmd-team-access-role
                                tabindex="-1"
                                aria-hidden="true"
                            >
                                @foreach($accessRoles as $accessRole)
                                    <option
                                        value="{{ (int)$accessRole->staff_role_id }}"
                                        data-role-code="{{ strtolower(trim((string)$accessRole->code)) }}"
                                        @if($retryMember && (int)old('staff_role_id', 0) === (int)$accessRole->staff_role_id) selected @endif
                                    >{{ $accessRole->name }}</option>
                                @endforeach
                            </select>
                            <div class="pmd-shifts__role-picker" data-pmd-team-role-picker role="group" aria-label="Access role">
                                @foreach($accessRoles as $accessRole)
                                    <button
                                        type="button"
                                        class="pmd-shifts__role-card"
                                        data-pmd-team-role-card
                                        data-role-id="{{ (int)$accessRole->staff_role_id }}"
                                        data-role-code="{{ strtolower(trim((string)$accessRole->code)) }}"
                                        aria-pressed="false"
                                    >
                                        <span>{{ $accessRole->name }}</span>
                                    </button>
                                @endforeach
                            </div>
                        </div>
                        <label class="is-password" data-pmd-team-pin-field>
                            <span>Quick PIN <small data-pmd-team-pin-hint>App / POS · 6 digits</small></span>
                            <span class="pmd-shifts__team-password-row">
                                <input type="password" inputmode="numeric" pattern="[0-9]{6}" minlength="6" maxlength="6" name="quick_pin" autocomplete="off" data-pmd-team-pin placeholder="••••••" aria-describedby="pmd-shifts-pin-strength-advice">
                                <button type="button" data-pmd-team-pin-generate>Generate</button>
                            </span>
                            <span class="pmd-shifts__pin-strength" data-pmd-team-pin-strength data-strength="empty" role="status" aria-live="polite" hidden>
                                <span class="pmd-shifts__pin-strength-meter" aria-hidden="true"><i></i><i></i><i></i></span>
                                <small id="pmd-shifts-pin-strength-advice" data-pmd-team-pin-strength-advice></small>
                            </span>
                        </label>
                        <label class="is-password" data-pmd-team-password-field>
                            <span>Password <small data-pmd-team-password-hint>Web / Portal</small></span>
                            <span class="pmd-shifts__team-password-row">
                                <input type="password" minlength="12" maxlength="32" name="password" autocomplete="new-password" data-pmd-team-password aria-describedby="pmd-shifts-password-strength-advice">
                                <button type="button" data-pmd-team-password-generate>Generate</button>
                            </span>
                            <span class="pmd-shifts__password-strength" data-pmd-team-password-strength data-strength="empty" role="status" aria-live="polite" hidden>
                                <span class="pmd-shifts__password-strength-meter" aria-hidden="true"><i></i><i></i><i></i></span>
                                <small id="pmd-shifts-password-strength-advice" data-pmd-team-password-strength-advice></small>
                            </span>
                        </label>
                    </div>
                    <footer class="pmd-shifts__modal-footer pmd-shifts__team-editor-footer">
                        <button type="button" class="pmd-shifts__button is-soft" data-pmd-team-close>Cancel</button>
                        <button type="submit" class="pmd-shifts__button">Save member</button>
                    </footer>
                </form>
            </section>
        </div>
    @endif

    @php
    // TastyIgniter's legacy Blade compiler cannot safely parse a nested
    // array literal inside @json(...). Build the payload in plain PHP
    // and echo only pre-encoded JSON into the script tags.
    $pmdShiftsJsonFlags = JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT;
    $pmdShiftsBootstrapPayload = [
        'selected_day' => $selectedDay->toDateString(),
        'month' => $monthStart->toDateString(),
        'open_hour_on_boot' => true,
        // PMD_SHIFT_ATTENDANCE_FIRST_PAINT_V134
        'live_attendance' => $liveAttendance,
        'people' => $bootPeople,
        'shifts' => $bootShifts,
        'csrf' => csrf_token(),
        'urls' => [
            'shifts' => admin_url('shifts'),
            'remove' => admin_url('shifts/removeshift'),
        ],
    ];
    $pmdShiftsKpiJson = json_encode($kpiCards, $pmdShiftsJsonFlags) ?: '{}';
    $pmdShiftsBootstrapJson = json_encode($pmdShiftsBootstrapPayload, $pmdShiftsJsonFlags) ?: '{}';
@endphp
<script type="application/json" id="pmd-shifts-kpi-data">{!! $pmdShiftsKpiJson !!}</script>
<script type="application/json" id="pmd-shifts-bootstrap">{!! $pmdShiftsBootstrapJson !!}</script>
</div>

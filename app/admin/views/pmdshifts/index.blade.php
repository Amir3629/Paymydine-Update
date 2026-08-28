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
    $stats = $data['stats'] ?? [];
    $departments = $data['departments'] ?? [];
    $capacity = $data['capacity'] ?? [];
    $accessRoles = collect($data['access_roles'] ?? []);
    $accessStaff = collect($data['access_staff'] ?? []);
    $teamRequests = collect($data['team_requests'] ?? []);
    $defaultAccessRole = $accessRoles->first(fn($role) => strtolower((string)$role->code) === \Admin\Services\PmdDefaultStaffRoleService::TEAM_MEMBER) ?: $accessRoles->first();
    $byDay = $shifts->groupBy(fn($s) => \Carbon\Carbon::parse($s->shift_date)->toDateString());
    $returnTo = request()->getRequestUri();

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
            'tone' => 'mauve',
            'icon' => 'calendar',
        ],
        'present_now' => [
            'title' => 'Present now',
            'value' => ($stats['present_now'] ?? null) === null ? '—' : (string)(int)$stats['present_now'],
            'description' => $currentConfirmed ? 'confirmed for the active shift' : 'confirm from Dashboard at shift start',
            'tone' => 'magenta',
            'icon' => 'check',
        ],
        'missing_now' => [
            'title' => 'Missing now',
            'value' => ($stats['missing_now'] ?? null) === null ? '—' : (string)(int)$stats['missing_now'],
            'description' => 'only known after team confirmation',
            'tone' => 'yellow',
            'icon' => 'alert',
        ],
        'month_hours' => [
            'title' => $monthStart->format('F').' hours',
            'value' => number_format((float)($stats['month_hours'] ?? 0), 1),
            'description' => (int)($stats['month_shifts'] ?? 0).' shifts · '.(int)($stats['scheduled_days'] ?? 0).' scheduled days',
            'tone' => 'cyan',
            'icon' => 'timer',
        ],
        'month_shifts' => [
            'title' => 'Month shifts',
            'value' => (string)(int)($stats['month_shifts'] ?? 0),
            'description' => 'planned shifts in '.$monthStart->format('F'),
            'tone' => 'orange',
            'icon' => 'layers',
        ],
        'scheduled_days' => [
            'title' => 'Scheduled days',
            'value' => (string)(int)($stats['scheduled_days'] ?? 0),
            'description' => 'days with at least one planned shift',
            'tone' => 'green',
            'icon' => 'days',
        ],
        'active_team' => [
            'title' => 'Active team',
            'value' => (string)$people->count(),
            'description' => 'people available for shift planning',
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

    $bootPeople = $people->map(function($person) use ($departments, $accessStaff) {
        $staff = !empty($person->staff_id) ? $accessStaff->get((int)$person->staff_id) : null;
        return [
            'id' => (int)$person->id,
            'name' => (string)$person->display_name,
            'role' => (string)($person->job_role ?: ($departments[$person->department] ?? 'Team')),
            'department' => (string)($person->department ?? 'other'),
            'has_access' => !empty($person->staff_id),
            'staff_id' => !empty($person->staff_id) ? (int)$person->staff_id : null,
            'username' => $staff && $staff->user ? (string)$staff->user->username : '',
            'staff_role_id' => $staff ? (int)$staff->staff_role_id : null,
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
            'confirmed' => !empty($shift->confirmed_at) || strtolower((string)$shift->status) === 'confirmed',
            'people' => $shiftPeople,
        ];
    })->values();
@endphp

<div id="pmd-shifts" class="pmd-shifts" data-pmd-shifts-root>
    <header class="pmd-shifts__header">
        <div class="pmd-shifts__header-left">
            <a class="pmd-shifts__icon-button" href="{{ admin_url('dashboard') }}" aria-label="Back">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6"></path></svg>
            </a>
            <div>
                <h1>Shifts</h1>
            </div>
        </div>
        <div class="pmd-shifts__header-actions">
            <button type="button" class="pmd-shifts__header-button is-soft" data-pmd-capacity-open aria-label="Kitchen capacity & peak time">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3c1.8 3 5 4.6 5 9a5 5 0 0 1-10 0c0-2.3 1.2-4.4 3.5-6.5.2 2 1 3 1.5 3.5 1.2-1.4 1.2-3.7 0-6z"></path></svg>
                <span>Peak time</span>
            </button>
            <a class="pmd-shifts__header-button is-soft" href="{{ admin_url('people') }}" aria-label="People">
                <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3"></circle><path d="M3 20a6 6 0 0 1 12 0M16 5a3 3 0 0 1 0 6M17 14a5 5 0 0 1 4 5"></path></svg>
                <span>People</span>
            </a>
            @if($ready)
                <button type="button" class="pmd-shifts__header-button" data-pmd-shift-open data-date="{{ $selectedDay->toDateString() }}">
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"></path></svg>
                    <span>Add shift</span>
                </button>
            @endif
        </div>
    </header>

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
                    data-pmd-kpi-v2401-tone="{{ $card['tone'] }}"
                >
                    <div class="pmd-r2-kpi-v2401-icon" aria-hidden="true"><svg viewBox="0 0 24 24">{!! $pmdShiftIcon($card['icon']) !!}</svg></div>
                    <div class="pmd-r2-kpi-v2401-copy">
                        <span class="pmd-r2-kpi-v2401-title">{{ $card['title'] }}</span>
                        <strong class="pmd-r2-kpi-v2401-value">{{ $card['value'] }}</strong>
                        <span class="pmd-r2-kpi-v2401-description">{{ $card['description'] }}</span>
                    </div>
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

        <section id="pmd-r2-calendar-surface-v160" class="pmd-shifts-reservations-calendar is-visible is-month-mode" data-pmd-shifts-calendar>
            <div class="pmd-r2-yc-calendar-frame" data-pmd-shifts-calendar-frame>
                <div class="pmd-yc__toolbar">
                    <div class="pmd-yc__legend">
                        <span><i class="is-shift">S</i>Shift</span>
                        <span><i class="is-confirmed">✓</i>Confirmed</span>
                        <span><i class="is-missing">!</i>Missing</span>
                    </div>
                    <div class="pmd-yc__month-nav">
                        <a data-pmd-shifts-month-nav href="{{ admin_url('shifts') }}?month={{ $monthStart->copy()->subMonth()->startOfMonth()->toDateString() }}" aria-label="Previous month">←</a>
                        <strong data-pmd-shifts-month-title>{{ $monthStart->format('F Y') }}</strong>
                        <a data-pmd-shifts-month-nav href="{{ admin_url('shifts') }}?month={{ $monthStart->copy()->addMonth()->startOfMonth()->toDateString() }}" aria-label="Next month">→</a>
                    </div>
                    <div class="pmd-yc__toolbar-right">
                        <div class="pmd-yc__view-switch"><button type="button" class="is-active" data-pmd-shifts-calendar-back>Month</button><button type="button" data-pmd-shifts-open-selected-day>Day</button></div>
                        <a href="{{ admin_url('shifts') }}?month={{ now()->startOfMonth()->toDateString() }}">Today</a>
                    </div>
                </div>

                <main class="pmd-yc__months">
                    <section class="pmd-yc-month is-month-view">
                        <div class="pmd-yc-month__head"><h2>{{ $monthStart->format('F Y') }}</h2></div>
                        <div class="pmd-yc-weekdays" aria-hidden="true">
                            @foreach(['Mon','Tue','Wed','Thu','Fri','Sat','Sun'] as $weekday)<span>{{ $weekday }}</span>@endforeach
                        </div>
                        <div class="pmd-yc-days">
                            @foreach($calendarDays as $day)
                                @php
                                    $date = $day->toDateString();
                                    $dayShifts = collect($byDay->get($date, collect()));
                                    $inMonth = $day->month === $monthStart->month;
                                @endphp
                                @php
                                    $focusShift = $pmdRelevantShiftForDay($date, $dayShifts);
                                    $teamRows = $pmdShiftTeamRows($focusShift);
                                    $focusTime = $focusShift
                                        ? (($focusShift->starts_at ? substr((string)$focusShift->starts_at,0,5) : 'All day').($focusShift->ends_at ? '–'.substr((string)$focusShift->ends_at,0,5) : ''))
                                        : '';
                                @endphp
                                <div
                                    class="pmd-yc-day {{ !$inMonth ? 'is-outside' : '' }} {{ $day->isToday() ? 'is-today' : '' }}"
                                    data-pmd-shift-day-open
                                    data-date="{{ $date }}"
                                    tabindex="0"
                                    aria-label="Open {{ $day->format('F j') }} staff schedule"
                                >
                                    <span class="pmd-yc-day__number">{{ $day->format('j') }}</span>
                                    <span class="pmd-yc-day__operations pmd-shifts-yc-team-summary">
                                        @if($focusShift)
                                            <span class="pmd-shifts-yc-context">{{ $focusTime }}</span>
                                            @foreach($teamRows as $teamRow)
                                                <button
                                                    type="button"
                                                    class="pmd-shifts-yc-team-row"
                                                    data-pmd-calendar-shift-edit="{{ (int)$focusShift->id }}"
                                                    title="Edit {{ $focusShift->label }}"
                                                ><strong>{{ $teamRow['label'] }}:</strong><span>{{ $teamRow['names'] }}</span></button>
                                            @endforeach
                                        @elseif($dayShifts->isNotEmpty())
                                            <span class="pmd-shifts-yc-context">{{ $dayShifts->count() }} planned shifts</span>
                                        @endif
                                    </span>
                                </div>
                            @endforeach
                        </div>
                    </section>
                </main>
            </div>

            <section id="pmd-shift-day" class="pmd-r2-yc-selected pmd-shifts-hour-host" data-pmd-shifts-hour-host hidden></section>
        </section>

        <div class="pmd-shifts__modal" data-pmd-shift-modal hidden aria-hidden="true" role="dialog" aria-modal="true" aria-labelledby="pmd-shift-modal-title">
            <button type="button" class="pmd-shifts__modal-backdrop" data-pmd-shift-close tabindex="-1" aria-label="Close"></button>
            <section class="pmd-shifts__modal-card" role="document">
                <header class="pmd-shifts__modal-header">
                    <div><h2 id="pmd-shift-modal-title" data-pmd-shift-modal-title>Add shift</h2></div>
                    <button type="button" class="pmd-shifts__modal-close" data-pmd-shift-close aria-label="Close"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"></path></svg></button>
                </header>
                <form class="pmd-shifts__modal-form" method="post" action="{{ admin_url('shifts/saveshift') }}" data-pmd-shift-form>
                    @csrf
                    <input type="hidden" name="id" value="" data-pmd-shift-id>
                    <input type="hidden" name="return_to" value="{{ $returnTo }}">
                    <div class="pmd-shifts__modal-body">
                        <div class="pmd-shifts__preset-row">
                            <button type="button" data-pmd-shift-preset="Lunch" data-start="11:00" data-end="16:00">Lunch</button>
                            <button type="button" data-pmd-shift-preset="Dinner" data-start="17:00" data-end="23:00">Dinner</button>
                            <button type="button" data-pmd-shift-preset="Full day" data-start="" data-end="">Full day</button>
                        </div>
                        <div class="pmd-shifts__form-grid">
                            <label><span>Date</span><input required type="date" name="shift_date" value="{{ $selectedDay->toDateString() }}" data-pmd-shift-date-input></label>
                            <label><span>Shift name</span><input required maxlength="64" name="label" value="Dinner" data-pmd-shift-label></label>
                            <label><span>Start</span><input type="time" name="starts_at" data-pmd-shift-start></label>
                            <label><span>End</span><input type="time" name="ends_at" data-pmd-shift-end></label>
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
                                <div class="pmd-shifts__picker-empty">No restaurant people yet. <a href="{{ admin_url('settings/team') }}">Add people in Team</a>.</div>
                            @endforelse
                        </fieldset>
                    </div>
                    <footer class="pmd-shifts__modal-footer">
                        <button type="button" class="pmd-shifts__button is-soft" data-pmd-shift-close>Cancel</button>
                        <button type="submit" class="pmd-shifts__button">Save shift</button>
                    </footer>
                </form>
            </section>
        </div>

        <div class="pmd-shifts__modal" data-pmd-team-modal hidden aria-hidden="true" role="dialog" aria-modal="true" aria-labelledby="pmd-team-modal-title">
            <button type="button" class="pmd-shifts__modal-backdrop" data-pmd-team-close tabindex="-1" aria-label="Close"></button>
            <section class="pmd-shifts__modal-card pmd-shifts__team-card" role="document">
                <header class="pmd-shifts__modal-header">
                    <div><h2 id="pmd-team-modal-title">Team</h2></div>
                    <button type="button" class="pmd-shifts__modal-close" data-pmd-team-close aria-label="Close"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"></path></svg></button>
                </header>
                <div class="pmd-shifts__team-layout">
                    <form class="pmd-shifts__team-form" method="post" action="{{ admin_url('shifts/saveperson') }}" data-pmd-team-form data-default-access-role="{{ (int)optional($defaultAccessRole)->staff_role_id }}">
                        @csrf
                        <input type="hidden" name="id" value="" data-pmd-team-person-id>
                        <input type="hidden" name="return_to" value="{{ $returnTo }}">
                        <div class="pmd-shifts__team-form-head"><strong data-pmd-team-form-title>New member</strong><button type="button" data-pmd-team-new>Clear</button></div>
                        <label><span>Name</span><input required maxlength="128" name="display_name" data-pmd-team-name placeholder="e.g. Anna"></label>
                        <div class="pmd-shifts__team-identity-row">
                            <label><span>Role</span><input maxlength="64" name="job_role" data-pmd-team-role placeholder="Bartender, Chef…"></label>
                            <label><span>Area</span><select name="department" data-pmd-team-department>
                                @foreach($departments as $departmentKey => $departmentLabel)<option value="{{ $departmentKey }}">{{ $departmentLabel }}</option>@endforeach
                            </select></label>
                        </div>

                        <label class="pmd-shifts__team-access-toggle">
                            <input type="checkbox" name="give_access" value="1" checked data-pmd-team-access-toggle>
                            <span><strong>PMD login</strong></span>
                        </label>

                        <div class="pmd-shifts__team-access-fields" data-pmd-team-access-fields>
                            <label><span>Username</span><input maxlength="32" name="username" autocomplete="off" data-pmd-team-username placeholder="anna"></label>
                            <label><span>Access</span><select name="staff_role_id" data-pmd-team-access-role>
                                @foreach($accessRoles as $accessRole)<option value="{{ (int)$accessRole->staff_role_id }}">{{ $accessRole->name }}</option>@endforeach
                            </select></label>
                            <label class="is-password"><span>Password <small data-pmd-team-password-hint>required for new login</small></span><span class="pmd-shifts__team-password-row"><input type="password" minlength="6" maxlength="32" name="password" autocomplete="new-password" data-pmd-team-password><button type="button" data-pmd-team-password-generate>Generate</button></span></label>

                        </div>
                        <button type="submit" class="pmd-shifts__button">Save</button>
                    </form>

                    <section class="pmd-shifts__team-list" aria-label="Restaurant team members">
                        <header><strong>{{ $people->count() }} people</strong></header>
                        <div class="pmd-shifts__team-list-scroll">
                            @forelse($people as $person)
                                <button
                                    type="button"
                                    class="pmd-shifts__team-person"
                                    data-pmd-team-edit
                                    data-person-id="{{ (int)$person->id }}"
                                    data-name="{{ $person->display_name }}"
                                    data-role="{{ $person->job_role ?? '' }}"
                                    data-department="{{ $person->department ?? 'other' }}"
                                    data-has-access="{{ !empty($person->staff_id) ? '1' : '0' }}"
                                    data-username="{{ !empty($person->staff_id) && $accessStaff->get((int)$person->staff_id) && $accessStaff->get((int)$person->staff_id)->user ? $accessStaff->get((int)$person->staff_id)->user->username : '' }}"
                                    data-staff-role-id="{{ !empty($person->staff_id) && $accessStaff->get((int)$person->staff_id) ? (int)$accessStaff->get((int)$person->staff_id)->staff_role_id : '' }}"
                                >
                                    <span class="pmd-shifts__team-person-avatar">{{ strtoupper(substr(trim((string)$person->display_name),0,1)) }}</span>
                                    <span><strong>{{ $person->display_name }}</strong><small>{{ $person->job_role ?: ($departments[$person->department] ?? 'Team') }}</small></span>
                                    @if(!empty($person->staff_id))<em>PMD access</em>@endif
                                </button>
                            @empty
                                <div class="pmd-shifts__team-empty">No people yet. Add the first person with only a name.</div>
                            @endforelse
                        </div>
                    </section>

                    <section class="pmd-shifts__team-requests {{ $teamRequests->isEmpty() ? 'is-empty' : '' }}" aria-label="Pending team requests">
                        <header><strong>Requests</strong><span>{{ $teamRequests->count() ? $teamRequests->count().' pending' : 'Nothing waiting' }}</span></header>
                        <div class="pmd-shifts__team-request-list">
                            @forelse($teamRequests as $teamRequest)
                                <article class="pmd-shifts__team-request">
                                    <div><strong>{{ $teamRequest->person_name ?: 'Team member' }}</strong><small>{{ ucfirst(str_replace('_',' ',(string)$teamRequest->request_type)) }}@if($teamRequest->date_from) · {{ \Carbon\Carbon::parse($teamRequest->date_from)->format('d M') }}@endif</small><p>{{ $teamRequest->message ?: 'No note' }}</p></div>
                                    <div class="pmd-shifts__team-request-actions">
                                        <form method="post" action="{{ admin_url('shifts/handlerequest') }}">@csrf<input type="hidden" name="id" value="{{ (int)$teamRequest->id }}"><input type="hidden" name="decision" value="approved"><input type="hidden" name="return_to" value="{{ $returnTo }}"><button type="submit">Approve</button></form>
                                        <form method="post" action="{{ admin_url('shifts/handlerequest') }}">@csrf<input type="hidden" name="id" value="{{ (int)$teamRequest->id }}"><input type="hidden" name="decision" value="declined"><input type="hidden" name="return_to" value="{{ $returnTo }}"><button type="submit" class="is-decline">Decline</button></form>
                                    </div>
                                </article>
                            @empty
                                <div class="pmd-shifts__team-empty">No pending shift, leave or manager-message requests.</div>
                            @endforelse
                        </div>
                    </section>
                </div>
                <footer class="pmd-shifts__modal-footer pmd-shifts__team-footer">
                    <a href="{{ admin_url('settings/team') }}">Advanced</a>
                    <button type="button" class="pmd-shifts__button is-soft" data-pmd-team-close>Done</button>
                </footer>
            </section>
        </div>

        <div class="pmd-shifts__modal" data-pmd-capacity-modal hidden aria-hidden="true" role="dialog" aria-modal="true" aria-labelledby="pmd-capacity-modal-title">
            <button type="button" class="pmd-shifts__modal-backdrop" data-pmd-capacity-close tabindex="-1" aria-label="Close"></button>
            <section class="pmd-shifts__modal-card pmd-shifts__capacity-card" role="document">
                <header class="pmd-shifts__modal-header">
                    <div><h2 id="pmd-capacity-modal-title">Kitchen capacity</h2></div>
                    <button type="button" class="pmd-shifts__modal-close" data-pmd-capacity-close aria-label="Close"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"></path></svg></button>
                </header>
                <form class="pmd-shifts__modal-form" method="post" action="{{ admin_url('shifts/saveeta') }}">
                    @csrf
                    <input type="hidden" name="return_to" value="{{ $returnTo }}">
                    <div class="pmd-shifts__modal-body">
                        <section class="pmd-shifts__capacity-section">
                            <div class="pmd-shifts__capacity-copy"><strong>Live load</strong></div>
                            <div class="pmd-shifts__form-grid">
                                <label><span>Busy at</span><input type="number" name="busy_item_threshold" min="1" max="500" value="{{ (int)($capacity['busy_item_threshold'] ?? 10) }}"></label>
                                <label><span>+ minutes</span><input type="number" name="busy_extra_minutes" min="0" max="120" value="{{ (int)($capacity['busy_extra_minutes'] ?? 5) }}"></label>
                                <label><span>Very busy at</span><input type="number" name="very_busy_item_threshold" min="2" max="1000" value="{{ (int)($capacity['very_busy_item_threshold'] ?? 25) }}"></label>
                                <label><span>+ minutes</span><input type="number" name="very_busy_extra_minutes" min="0" max="240" value="{{ (int)($capacity['very_busy_extra_minutes'] ?? 10) }}"></label>
                            </div>
                        </section>
                        <section class="pmd-shifts__capacity-section">
                            <label class="pmd-shifts__capacity-toggle">
                                <input type="hidden" name="peak_enabled_present" value="1">
                                <input type="checkbox" name="peak_enabled" value="1" {{ !empty($capacity['peak_enabled']) ? 'checked' : '' }}>
                                <span><strong>Peak time</strong></span>
                            </label>
                            <div class="pmd-shifts__form-grid">
                                <label><span>Starts</span><input type="time" name="peak_start" value="{{ $capacity['peak_start'] ?? '18:00' }}"></label>
                                <label><span>Ends</span><input type="time" name="peak_end" value="{{ $capacity['peak_end'] ?? '21:00' }}"></label>
                                <label><span>Buffer (min)</span><input type="number" name="peak_extra_minutes" min="0" max="120" value="{{ (int)($capacity['peak_extra_minutes'] ?? 5) }}"></label>
                            </div>
                        </section>
                    </div>
                    <footer class="pmd-shifts__modal-footer">
                        <button type="button" class="pmd-shifts__button is-soft" data-pmd-capacity-close>Cancel</button>
                        <button type="submit" class="pmd-shifts__button">Save</button>
                    </footer>
                </form>
            </section>
        </div>

        <form data-pmd-copy-week-form method="post" action="{{ admin_url('shifts/copyweek') }}" hidden>
            @csrf
            <input type="hidden" name="week" value="{{ $weekStart->toDateString() }}">
        </form>
    @endif

    @php
    // TastyIgniter's legacy Blade compiler cannot safely parse a nested
    // array literal inside @json(...). Build the payload in plain PHP
    // and echo only pre-encoded JSON into the script tags.
    $pmdShiftsJsonFlags = JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT;
    $pmdShiftsBootstrapPayload = [
        'selected_day' => $selectedDay->toDateString(),
        'month' => $monthStart->toDateString(),
        'open_hour_on_boot' => request()->filled('day'),
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

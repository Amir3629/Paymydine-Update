@php
    $data = $pmdShifts ?? [];
    $ready = (bool)($data['ready'] ?? false);
    $people = collect($data['people'] ?? []);
    $shifts = collect($data['shifts'] ?? []);
    $monthShifts = collect($data['month_shifts'] ?? []);
    $selectedDayShifts = collect($data['selected_day_shifts'] ?? []);
    $calendarDays = collect($data['calendar_days'] ?? []);
    $monthStart = $data['month_start'] ?? now()->startOfMonth();
    $monthEnd = $data['month_end'] ?? now()->endOfMonth();
    $selectedDay = $data['selected_day'] ?? now()->startOfDay();
    $weekStart = $data['week_start'] ?? now()->startOfWeek();
    $currentShift = $data['current_shift'] ?? null;
    $currentPeople = collect($data['current_people'] ?? []);
    $currentConfirmed = !empty($data['current_confirmed']);
    $stats = $data['stats'] ?? [];
    $roles = $data['roles'] ?? [];
    $departments = $data['departments'] ?? [];
    $byDay = $shifts->groupBy(fn($s) => \Carbon\Carbon::parse($s->shift_date)->toDateString());
    $returnTo = request()->getRequestUri();
    $plannedPersonIds = $currentPeople->pluck('person_id')->filter()->map(fn($id)=>(int)$id)->all();
    $replacementOptions = $people->reject(fn($p) => in_array((int)$p->id, $plannedPersonIds, true));
    $timelineStart = 6 * 60;
    $timelineEnd = 26 * 60;
    $timelineSpan = $timelineEnd - $timelineStart;
@endphp

<div id="pmd-shifts" class="pmd-shifts" data-pmd-shifts-root>
    <header class="pmd-shifts__header">
        <div class="pmd-shifts__header-left">
            <a class="pmd-shifts__icon-button" href="{{ admin_url('dashboard') }}" aria-label="Back">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6"></path></svg>
            </a>
            <div>
                <span class="pmd-shifts__eyebrow">Team operations</span>
                <h1>Shifts</h1>
                <p>Plan the month, open any day for an hour view, and confirm who is actually here when a shift starts.</p>
            </div>
        </div>
        <div class="pmd-shifts__header-actions">
            <a class="pmd-shifts__header-button is-soft" href="{{ admin_url('settings/team') }}">
                <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3"></circle><path d="M3 20a6 6 0 0 1 12 0M16 5a3 3 0 0 1 0 6M17 14a5 5 0 0 1 4 5"></path></svg>
                <span>Team</span>
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
            <div><strong>Kitchen Operations update is not active on this restaurant yet.</strong><p>Run the latest PMD migration once. The new tenant-safe migration creates the Shift tables for tomo without changing existing restaurant data.</p></div>
        </section>
    @else
        <section class="pmd-shifts__kpis" aria-label="Shift KPIs">
            <article class="pmd-shifts__kpi is-blue">
                <span class="pmd-shifts__kpi-icon"><svg viewBox="0 0 24 24"><path d="M4 5h16v15H4zM8 3v4M16 3v4M4 10h16"></path></svg></span>
                <div><small>Scheduled today</small><strong>{{ (int)($stats['scheduled_today'] ?? 0) }}</strong><span>people across today’s shifts</span></div>
            </article>
            <article class="pmd-shifts__kpi is-green">
                <span class="pmd-shifts__kpi-icon"><svg viewBox="0 0 24 24"><path d="m5 12 4 4L19 6"></path></svg></span>
                <div><small>Present now</small><strong>{{ ($stats['present_now'] ?? null) === null ? '—' : (int)$stats['present_now'] }}</strong><span>{{ $currentConfirmed ? 'confirmed for current shift' : 'confirm at shift start' }}</span></div>
            </article>
            <article class="pmd-shifts__kpi is-red">
                <span class="pmd-shifts__kpi-icon"><svg viewBox="0 0 24 24"><path d="M12 8v5M12 17h.01"></path><circle cx="12" cy="12" r="9"></circle></svg></span>
                <div><small>Missing now</small><strong>{{ ($stats['missing_now'] ?? null) === null ? '—' : (int)$stats['missing_now'] }}</strong><span>only after attendance is confirmed</span></div>
            </article>
            <article class="pmd-shifts__kpi is-violet">
                <span class="pmd-shifts__kpi-icon"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"></circle><path d="M12 7v5l3 2"></path></svg></span>
                <div><small>{{ $monthStart->format('F') }} hours</small><strong>{{ number_format((float)($stats['month_hours'] ?? 0), 1) }}</strong><span>{{ (int)($stats['month_shifts'] ?? 0) }} shifts · {{ (int)($stats['scheduled_days'] ?? 0) }} scheduled days</span></div>
            </article>
        </section>

        <section class="pmd-shifts__attendance {{ !$currentConfirmed && $currentShift ? 'needs-confirmation' : '' }}">
            <div class="pmd-shifts__attendance-copy">
                <span class="pmd-shifts__eyebrow">Start of shift check</span>
                @if($currentShift)
                    <h2>{{ $currentShift->label }} <small>{{ $currentShift->starts_at ? substr((string)$currentShift->starts_at,0,5) : 'Today' }}{{ $currentShift->ends_at ? '–'.substr((string)$currentShift->ends_at,0,5) : '' }}</small></h2>
                    @if($currentConfirmed)
                        <p>Attendance confirmed. Update it only if somebody leaves, arrives late, or is replaced.</p>
                    @else
                        <p>Is everyone here? One quick confirmation gives PMD reliable Kitchen staffing without turning this into a time-clock system.</p>
                    @endif
                @else
                    <h2>No active shift right now</h2>
                    <p>Nothing to confirm. Add today’s shift when you need one.</p>
                @endif
            </div>

            @if($currentShift)
                <form class="pmd-shifts__confirm" method="post" action="{{ admin_url('shifts/confirm') }}">
                    @csrf
                    <input type="hidden" name="shift_id" value="{{ (int)$currentShift->id }}">
                    <input type="hidden" name="return_to" value="{{ $returnTo }}">
                    @if($currentPeople->count())
                        <div class="pmd-shifts__today-list">
                            @foreach($currentPeople as $person)
                                @php
                                    $state = strtolower((string)($person->attendance_status ?? 'planned'));
                                    $checked = $currentConfirmed ? in_array($state, ['present','replacement'], true) : $state !== 'absent';
                                    $department = $departments[$person->department_snapshot] ?? ucfirst((string)$person->department_snapshot);
                                @endphp
                                <label class="pmd-shifts__today-person">
                                    <input type="checkbox" name="present_ids[]" value="{{ (int)$person->id }}" {{ $checked ? 'checked' : '' }}>
                                    <span class="pmd-shifts__today-check"><svg viewBox="0 0 24 24"><path d="m5 12 4 4L19 6"></path></svg></span>
                                    <span><strong>{{ $person->display_name_snapshot }}</strong><small>{{ $person->job_role_snapshot ?: $department }}</small></span>
                                </label>
                            @endforeach
                        </div>
                        @if($replacementOptions->count())
                            <details class="pmd-shifts__replacement">
                                <summary>Someone is replacing a planned person</summary>
                                <div class="pmd-shifts__replacement-list">
                                    @foreach($replacementOptions as $replacement)
                                        <label><input type="checkbox" name="replacement_person_ids[]" value="{{ $replacement->id }}"><span>{{ $replacement->display_name }}<small>{{ $replacement->job_role ?: ($departments[$replacement->department] ?? 'Team') }}</small></span></label>
                                    @endforeach
                                </div>
                            </details>
                        @endif
                        <div class="pmd-shifts__confirm-actions">
                            <button class="pmd-shifts__button is-soft" type="submit" name="everything_as_planned" value="1">Everything as planned</button>
                            <button class="pmd-shifts__button" type="submit">Confirm selected</button>
                        </div>
                    @else
                        <p class="pmd-shifts__attendance-empty">This shift has no named people. If Kitchen is working, you can still give PMD a simple count.</p>
                        <div class="pmd-shifts__quick-grid">
                            @foreach($roles as $role)
                                @php $key = 'quick_'.strtolower(trim(preg_replace('/[^a-z0-9]+/i', '_', $role), '_')); @endphp
                                <label><span>{{ $role }}</span><input type="number" min="0" max="100" inputmode="numeric" name="{{ $key }}" value="0"></label>
                            @endforeach
                        </div>
                        <button class="pmd-shifts__button" type="submit">Confirm Kitchen count</button>
                    @endif
                </form>
            @endif
        </section>

        <section class="pmd-shifts__calendar-card">
            <div class="pmd-shifts__section-head">
                <div>
                    <span class="pmd-shifts__eyebrow">Monthly schedule</span>
                    <h2>{{ $monthStart->format('F Y') }}</h2>
                    <p>Click a date to open its hour view. Use + to create a shift directly on that day.</p>
                </div>
                <div class="pmd-shifts__calendar-nav">
                    <a class="pmd-shifts__icon-button" href="{{ admin_url('shifts') }}?month={{ $monthStart->copy()->subMonth()->startOfMonth()->toDateString() }}&day={{ $monthStart->copy()->subMonth()->startOfMonth()->toDateString() }}">←</a>
                    <a class="pmd-shifts__today-link" href="{{ admin_url('shifts') }}?month={{ now()->startOfMonth()->toDateString() }}&day={{ now()->toDateString() }}#pmd-shift-day">Today</a>
                    <a class="pmd-shifts__icon-button" href="{{ admin_url('shifts') }}?month={{ $monthStart->copy()->addMonth()->startOfMonth()->toDateString() }}&day={{ $monthStart->copy()->addMonth()->startOfMonth()->toDateString() }}">→</a>
                </div>
            </div>

            <div class="pmd-shifts__calendar-weekdays" aria-hidden="true">
                @foreach(['Mon','Tue','Wed','Thu','Fri','Sat','Sun'] as $weekday)<span>{{ $weekday }}</span>@endforeach
            </div>
            <div class="pmd-shifts__calendar">
                @foreach($calendarDays as $day)
                    @php
                        $date = $day->toDateString();
                        $dayShifts = collect($byDay->get($date, collect()));
                        $inMonth = $day->month === $monthStart->month;
                        $selected = $date === $selectedDay->toDateString();
                    @endphp
                    <article class="pmd-shifts__calendar-day {{ !$inMonth ? 'is-outside' : '' }} {{ $day->isToday() ? 'is-today' : '' }} {{ $selected ? 'is-selected' : '' }}">
                        <a class="pmd-shifts__calendar-day-link" href="{{ admin_url('shifts') }}?month={{ $monthStart->toDateString() }}&day={{ $date }}#pmd-shift-day" aria-label="Open {{ $day->format('F j') }}">
                            <span class="pmd-shifts__date-number">{{ $day->format('j') }}</span>
                            <span class="pmd-shifts__date-meta">{{ $dayShifts->count() ? $dayShifts->count().' shift'.($dayShifts->count() === 1 ? '' : 's') : '' }}</span>
                        </a>
                        <div class="pmd-shifts__calendar-events">
                            @foreach($dayShifts->take(3) as $shift)
                                <button type="button" class="pmd-shifts__calendar-event" data-pmd-shift-edit
                                    data-id="{{ (int)$shift->id }}"
                                    data-date="{{ $date }}"
                                    data-label="{{ e((string)$shift->label) }}"
                                    data-start="{{ $shift->starts_at ? substr((string)$shift->starts_at,0,5) : '' }}"
                                    data-end="{{ $shift->ends_at ? substr((string)$shift->ends_at,0,5) : '' }}"
                                    data-notes="{{ e((string)($shift->notes ?? '')) }}"
                                    data-people="{{ collect($shift->people ?? [])->pluck('person_id')->filter()->map('intval')->implode(',') }}">
                                    <span>{{ $shift->starts_at ? substr((string)$shift->starts_at,0,5) : 'All day' }}</span><strong>{{ $shift->label }}</strong>
                                </button>
                            @endforeach
                            @if($dayShifts->count() > 3)<span class="pmd-shifts__calendar-more">+{{ $dayShifts->count()-3 }} more</span>@endif
                        </div>
                        <button type="button" class="pmd-shifts__calendar-add" data-pmd-shift-open data-date="{{ $date }}" aria-label="Add shift on {{ $day->format('F j') }}">+</button>
                    </article>
                @endforeach
            </div>
        </section>

        <section id="pmd-shift-day" class="pmd-shifts__day-card">
            <div class="pmd-shifts__section-head">
                <div>
                    <span class="pmd-shifts__eyebrow">Day & hour view</span>
                    <h2>{{ $selectedDay->format('l, F j') }}</h2>
                    <p>{{ $selectedDayShifts->count() ? $selectedDayShifts->count().' planned shift'.($selectedDayShifts->count() === 1 ? '' : 's') : 'No shifts planned yet.' }}</p>
                </div>
                <button type="button" class="pmd-shifts__button" data-pmd-shift-open data-date="{{ $selectedDay->toDateString() }}">+ Shift</button>
            </div>

            <div class="pmd-shifts__day-layout">
                <div class="pmd-shifts__timeline">
                    @foreach(range(6,26,2) as $hour)
                        @php $displayHour = $hour % 24; $top = (($hour*60)-$timelineStart)/$timelineSpan*100; @endphp
                        <span class="pmd-shifts__timeline-hour" style="top:{{ $top }}%"><b>{{ str_pad((string)$displayHour,2,'0',STR_PAD_LEFT) }}:00</b></span>
                        <span class="pmd-shifts__timeline-line" style="top:{{ $top }}%"></span>
                    @endforeach

                    @foreach($selectedDayShifts as $shift)
                        @php
                            $startText = $shift->starts_at ? substr((string)$shift->starts_at,0,5) : '';
                            $endText = $shift->ends_at ? substr((string)$shift->ends_at,0,5) : '';
                            $startParts = $startText !== '' ? array_map('intval', explode(':',$startText)) : [];
                            $endParts = $endText !== '' ? array_map('intval', explode(':',$endText)) : [];
                            $startMin = count($startParts)>=2 ? $startParts[0]*60+$startParts[1] : $timelineStart;
                            $endMin = count($endParts)>=2 ? $endParts[0]*60+$endParts[1] : min($timelineEnd,$startMin+8*60);
                            if($endMin <= $startMin) $endMin += 1440;
                            if($startMin < $timelineStart) $startMin = $timelineStart;
                            if($endMin > $timelineEnd) $endMin = $timelineEnd;
                            $topPct = max(0,min(100,(($startMin-$timelineStart)/$timelineSpan)*100));
                            $heightPct = max(4,min(100-$topPct,(($endMin-$startMin)/$timelineSpan)*100));
                            $shiftPeople = collect($shift->people ?? []);
                        @endphp
                        <button type="button" class="pmd-shifts__timeline-shift" style="top:{{ $topPct }}%;height:{{ $heightPct }}%" data-pmd-shift-edit
                            data-id="{{ (int)$shift->id }}"
                            data-date="{{ $selectedDay->toDateString() }}"
                            data-label="{{ e((string)$shift->label) }}"
                            data-start="{{ $startText }}"
                            data-end="{{ $endText }}"
                            data-notes="{{ e((string)($shift->notes ?? '')) }}"
                            data-people="{{ $shiftPeople->pluck('person_id')->filter()->map('intval')->implode(',') }}">
                            <span class="pmd-shifts__timeline-time">{{ $startText ?: 'All day' }}{{ $endText ? '–'.$endText : '' }}</span>
                            <strong>{{ $shift->label }}</strong>
                            <small>{{ $shiftPeople->pluck('display_name_snapshot')->take(4)->implode(', ') }}{{ $shiftPeople->count()>4 ? ' +'.($shiftPeople->count()-4) : '' }}</small>
                        </button>
                    @endforeach
                </div>

                <aside class="pmd-shifts__day-list">
                    @forelse($selectedDayShifts as $shift)
                        @php $shiftPeople = collect($shift->people ?? []); @endphp
                        <article class="pmd-shifts__day-shift-card">
                            <div class="pmd-shifts__day-shift-time"><strong>{{ $shift->starts_at ? substr((string)$shift->starts_at,0,5) : 'All day' }}</strong><span>{{ $shift->ends_at ? 'to '.substr((string)$shift->ends_at,0,5) : '' }}</span></div>
                            <div class="pmd-shifts__day-shift-copy"><strong>{{ $shift->label }}</strong><small>{{ $shiftPeople->count() }} people{{ !empty($shift->confirmed_at) ? ' · attendance confirmed' : '' }}</small>@if(!empty($shift->notes))<p>{{ $shift->notes }}</p>@endif</div>
                            <button type="button" class="pmd-shifts__edit-link" data-pmd-shift-edit
                                data-id="{{ (int)$shift->id }}" data-date="{{ $selectedDay->toDateString() }}" data-label="{{ e((string)$shift->label) }}"
                                data-start="{{ $shift->starts_at ? substr((string)$shift->starts_at,0,5) : '' }}" data-end="{{ $shift->ends_at ? substr((string)$shift->ends_at,0,5) : '' }}"
                                data-notes="{{ e((string)($shift->notes ?? '')) }}" data-people="{{ $shiftPeople->pluck('person_id')->filter()->map('intval')->implode(',') }}">Edit</button>
                            <form method="post" action="{{ admin_url('shifts/removeshift') }}" onsubmit="return confirm('Remove this shift?')">@csrf<input type="hidden" name="id" value="{{ (int)$shift->id }}"><input type="hidden" name="return_to" value="{{ $returnTo }}"><button type="submit" class="pmd-shifts__remove-link">Remove</button></form>
                        </article>
                    @empty
                        <div class="pmd-shifts__day-empty"><strong>Nothing scheduled</strong><span>Click + Shift and choose the people who are working.</span></div>
                    @endforelse

                    <form class="pmd-shifts__copy" method="post" action="{{ admin_url('shifts/copyweek') }}">
                        @csrf
                        <input type="hidden" name="week" value="{{ $weekStart->toDateString() }}">
                        <button class="pmd-shifts__button is-soft" type="submit">Copy this week → next week</button>
                    </form>
                </aside>
            </div>
        </section>

        <div class="pmd-shifts__modal" data-pmd-shift-modal hidden aria-hidden="true" role="dialog" aria-modal="true" aria-labelledby="pmd-shift-modal-title">
            <button type="button" class="pmd-shifts__modal-backdrop" data-pmd-shift-close tabindex="-1" aria-label="Close"></button>
            <section class="pmd-shifts__modal-card" role="document">
                <header class="pmd-shifts__modal-header">
                    <div><span class="pmd-shifts__eyebrow">Schedule</span><h2 id="pmd-shift-modal-title" data-pmd-shift-modal-title>Add shift</h2></div>
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
                            <label class="is-full"><span>Note <small>optional</small></span><textarea name="notes" maxlength="2000" rows="3" data-pmd-shift-notes placeholder="Private planning note for this shift…"></textarea></label>
                        </div>

                        <fieldset class="pmd-shifts__person-picker">
                            <legend><strong>Who is working?</strong><small>Select restaurant people. Login accounts are not required.</small></legend>
                            @forelse($people as $person)
                                <label class="pmd-shifts__person-option">
                                    <input type="checkbox" name="person_ids[]" value="{{ (int)$person->id }}" data-pmd-shift-person>
                                    <span class="pmd-shifts__person-option-box"><svg viewBox="0 0 24 24"><path d="m5 12 4 4L19 6"></path></svg></span>
                                    <span><strong>{{ $person->display_name }}</strong><small>{{ $person->job_role ?: ($departments[$person->department] ?? 'Team') }}</small></span>
                                </label>
                            @empty
                                <div class="pmd-shifts__picker-empty">No restaurant people yet. <a href="{{ admin_url('settings/team') }}">Add people in Team</a> — only a name is required.</div>
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
    @endif
</div>

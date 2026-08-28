@php
    $data = $pmdShifts ?? [];
    $ready = (bool)($data['ready'] ?? false);
    $people = collect($data['people'] ?? []);
    $shifts = collect($data['shifts'] ?? []);
    $roles = $data['roles'] ?? [];
    $departments = $data['departments'] ?? [];
    $staffOptions = collect($data['staff_options'] ?? []);
    $weekStart = $data['week_start'] ?? now()->startOfWeek();
    $weekEnd = $data['week_end'] ?? now()->endOfWeek();
    $today = $data['today'] ?? [];
    $eta = $data['eta'] ?? [];
    $kitchenPeople = $people->filter(fn($p) => strtolower((string)($p->department ?? '')) === 'kitchen');
    $days = collect(range(0, 6))->map(fn($n) => $weekStart->copy()->addDays($n));
    $byDay = $shifts->groupBy(fn($s) => \Carbon\Carbon::parse($s->shift_date)->toDateString());
    $currentShift = $today['shift'] ?? null;
    $currentPeople = collect($today['people'] ?? []);
    $currentSnapshot = $today['snapshot'] ?? [];
    $returnTo = '/admin/shifts?week='.$weekStart->toDateString();
@endphp

<div id="pmd-shifts" class="pmd-shifts">
    <header class="pmd-shifts__header">
        <div>
            <a class="pmd-shifts__back" href="{{ admin_url('dashboard') }}" aria-label="Back">←</a>
            <span class="pmd-shifts__eyebrow">Kitchen operations</span>
            <h1>People & shifts</h1>
            <p>Plan the team, confirm who is actually here, and let PMD use the result for more reliable kitchen ETA.</p>
        </div>
        <a class="pmd-shifts__link" href="{{ admin_url('menu') }}">Menu prep times</a>
    </header>

    @if(!$ready)
        <section class="pmd-shifts__notice is-warning">
            <strong>Migration required</strong>
            <span>Run the Kitchen Operations migration before using this page. No restaurant data has been changed.</span>
        </section>
    @else
        <section class="pmd-shifts__today {{ !empty($today['needs_confirmation']) ? 'needs-confirmation' : '' }}">
            <div class="pmd-shifts__today-copy">
                <span class="pmd-shifts__eyebrow">Today’s team</span>
                <h2>{{ $currentShift ? $currentShift->label : 'No shift planned yet' }}</h2>
                @if(!empty($currentSnapshot['confirmed']))
                    <p><strong>{{ (int)($currentSnapshot['actual_count'] ?? 0) }}</strong> confirmed in Kitchen · Source: {{ str_replace('_', ' ', (string)($currentSnapshot['source'] ?? 'confirmed shift')) }}</p>
                @elseif($currentShift)
                    <p>Confirm today’s Kitchen team once. PMD will not block ordering if you skip it.</p>
                @else
                    <p>No plan? Use Quick confirm now, then build the weekly plan whenever you want.</p>
                @endif
            </div>

            <form class="pmd-shifts__confirm" method="post" action="{{ admin_url('shifts/confirm') }}">
                @csrf
                <input type="hidden" name="shift_id" value="{{ $currentShift->id ?? 0 }}">
                <input type="hidden" name="return_to" value="{{ $returnTo }}">

                @if($currentPeople->count())
                    <div class="pmd-shifts__today-list">
                        @foreach($currentPeople as $person)
                            @php $checked = in_array(strtolower((string)($person['attendance_status'] ?? '')), ['present','replacement','planned'], true); @endphp
                            <label class="pmd-shifts__today-person">
                                <input type="checkbox" name="present_ids[]" value="{{ $person['id'] }}" {{ $checked ? 'checked' : '' }}>
                                <span class="pmd-shifts__today-check">✓</span>
                                <span><strong>{{ $person['name'] }}</strong><small>{{ $person['job_role'] }}</small></span>
                            </label>
                        @endforeach
                    </div>
                    @php
                        $plannedPersonIds = $currentPeople->pluck('person_id')->filter()->map(fn($id)=>(int)$id)->all();
                        $replacementOptions = $kitchenPeople->reject(fn($p) => in_array((int)$p->id, $plannedPersonIds, true));
                    @endphp
                    @if($replacementOptions->count())
                        <details class="pmd-shifts__replacement">
                            <summary>+ Add replacement</summary>
                            <div class="pmd-shifts__replacement-list">
                                @foreach($replacementOptions as $replacement)
                                    <label><input type="checkbox" name="replacement_person_ids[]" value="{{ $replacement->id }}"><span>{{ $replacement->display_name }}<small>{{ $replacement->job_role ?: 'Kitchen' }}</small></span></label>
                                @endforeach
                            </div>
                        </details>
                    @endif
                    <div class="pmd-shifts__confirm-actions">
                        <button class="pmd-shifts__button is-soft" type="submit" name="everything_as_planned" value="1">Everything as planned</button>
                        <button class="pmd-shifts__button" type="submit">Confirm selected</button>
                    </div>
                @else
                    <div class="pmd-shifts__quick-grid">
                        @foreach($roles as $role)
                            @php $key = 'quick_'.strtolower(trim(preg_replace('/[^a-z0-9]+/i', '_', $role), '_')); @endphp
                            <label><span>{{ $role }}</span><input type="number" min="0" max="100" inputmode="numeric" name="{{ $key }}" value="0"></label>
                        @endforeach
                    </div>
                    <button class="pmd-shifts__button" type="submit">Confirm Kitchen team</button>
                @endif
            </form>
        </section>

        <div class="pmd-shifts__grid">
            <section class="pmd-shifts__panel pmd-shifts__panel--people">
                <div class="pmd-shifts__panel-head">
                    <div><span class="pmd-shifts__eyebrow">Roster</span><h2>People</h2></div>
                    <button type="button" class="pmd-shifts__button is-soft" data-pmd-shifts-toggle="person-form">+ Add person</button>
                </div>

                <form id="person-form" class="pmd-shifts__form" method="post" action="{{ admin_url('shifts/saveperson') }}" hidden>
                    @csrf
                    <label><span>Name</span><input required minlength="2" maxlength="128" name="display_name" placeholder="Anna"></label>
                    <label><span>Department</span><select name="department">@foreach($departments as $key=>$label)<option value="{{ $key }}">{{ $label }}</option>@endforeach</select></label>
                    <label><span>Job role</span><input name="job_role" maxlength="64" list="pmd-kitchen-job-roles" placeholder="Chef / Waiter / custom role"><datalist id="pmd-kitchen-job-roles">@foreach($roles as $role)<option value="{{ $role }}">@endforeach</datalist></label>
                    <label><span>PMD account (optional)</span><select name="staff_id"><option value="">No login/account link</option>@foreach($staffOptions as $staff)<option value="{{ $staff->staff_id }}">{{ $staff->staff_name }}{{ optional($staff->role)->name ? ' · '.optional($staff->role)->name : '' }}</option>@endforeach</select><small>Only link this if you want PMD to use optional attendance/check-in data. People do not need PMD accounts.</small></label>
                    <label><span>Station (optional)</span><input maxlength="64" name="station_slug" placeholder="grill / pizza"></label>
                    <div class="pmd-shifts__form-actions"><button class="pmd-shifts__button" type="submit">Save person</button></div>
                </form>

                <div class="pmd-shifts__people-list">
                    @forelse($people as $person)
                        <div class="pmd-shifts__person">
                            <span class="pmd-shifts__avatar">{{ strtoupper(substr((string)$person->display_name, 0, 1)) }}</span>
                            <span class="pmd-shifts__person-copy"><strong>{{ $person->display_name }}</strong><small>{{ ucfirst($person->department) }} · {{ $person->job_role ?: 'Team member' }}{{ $person->station_slug ? ' · '.$person->station_slug : '' }}</small></span>
                            <form method="post" action="{{ admin_url('shifts/removeperson') }}" onsubmit="return confirm('Remove this person from the active roster?')">@csrf<input type="hidden" name="id" value="{{ $person->id }}"><button class="pmd-shifts__icon-button" type="submit" aria-label="Remove">×</button></form>
                        </div>
                    @empty
                        <p class="pmd-shifts__empty">No roster yet. Add Kitchen people without creating PMD login accounts.</p>
                    @endforelse
                </div>
            </section>

            <section class="pmd-shifts__panel pmd-shifts__panel--week">
                <div class="pmd-shifts__panel-head">
                    <div>
                        <span class="pmd-shifts__eyebrow">Weekly plan</span>
                        <h2>{{ $weekStart->format('M j') }} – {{ $weekEnd->format('M j') }}</h2>
                    </div>
                    <div class="pmd-shifts__week-nav">
                        <a class="pmd-shifts__icon-button" href="{{ admin_url('shifts') }}?week={{ $weekStart->copy()->subWeek()->toDateString() }}">←</a>
                        <a class="pmd-shifts__icon-button" href="{{ admin_url('shifts') }}?week={{ now()->startOfWeek()->toDateString() }}">Today</a>
                        <a class="pmd-shifts__icon-button" href="{{ admin_url('shifts') }}?week={{ $weekStart->copy()->addWeek()->toDateString() }}">→</a>
                    </div>
                </div>

                <div class="pmd-shifts__week">
                    @foreach($days as $day)
                        @php $dayShifts = $byDay->get($day->toDateString(), collect()); @endphp
                        <article class="pmd-shifts__day {{ $day->isToday() ? 'is-today' : '' }}">
                            <header><strong>{{ $day->format('D') }}</strong><span>{{ $day->format('j M') }}</span></header>
                            @foreach($dayShifts as $shift)
                                <div class="pmd-shifts__shift-card">
                                    <div><strong>{{ $shift->label }}</strong><small>{{ $shift->starts_at ? substr((string)$shift->starts_at,0,5) : 'All day' }}{{ $shift->ends_at ? '–'.substr((string)$shift->ends_at,0,5) : '' }}</small></div>
                                    <div class="pmd-shifts__chips">@foreach(collect($shift->people ?? [])->take(5) as $sp)<span>{{ $sp->display_name_snapshot }}</span>@endforeach</div>
                                    <small>{{ collect($shift->people ?? [])->where('department_snapshot','kitchen')->count() }} Kitchen planned{{ $shift->confirmed_at ? ' · confirmed' : '' }}</small>
                                    <form method="post" action="{{ admin_url('shifts/removeshift') }}" onsubmit="return confirm('Remove this shift?')">@csrf<input type="hidden" name="id" value="{{ $shift->id }}"><button class="pmd-shifts__shift-remove" type="submit">Remove</button></form>
                                </div>
                            @endforeach
                            <button type="button" class="pmd-shifts__day-add" data-pmd-shift-date="{{ $day->toDateString() }}">+ Shift</button>
                        </article>
                    @endforeach
                </div>

                <form id="shift-form" class="pmd-shifts__form pmd-shifts__shift-form" method="post" action="{{ admin_url('shifts/saveshift') }}" hidden>
                    @csrf
                    <input type="hidden" name="shift_date" data-pmd-shift-date-input>
                    <div class="pmd-shifts__preset-row">
                        <button type="button" data-pmd-shift-preset="Lunch" data-start="11:00" data-end="16:00">Lunch</button>
                        <button type="button" data-pmd-shift-preset="Dinner" data-start="17:00" data-end="23:00">Dinner</button>
                        <button type="button" data-pmd-shift-preset="Full day" data-start="" data-end="">Full day</button>
                    </div>
                    <label><span>Shift name</span><input required maxlength="64" name="label" value="Dinner" data-pmd-shift-label></label>
                    <div class="pmd-shifts__two"><label><span>Start</span><input type="time" name="starts_at" data-pmd-shift-start></label><label><span>End</span><input type="time" name="ends_at" data-pmd-shift-end></label></div>
                    <fieldset class="pmd-shifts__person-picker"><legend>Who is planned?</legend>
                        @forelse($kitchenPeople as $person)
                            <label><input type="checkbox" name="person_ids[]" value="{{ $person->id }}"><span>{{ $person->display_name }}<small>{{ $person->job_role ?: 'Kitchen' }}</small></span></label>
                        @empty
                            <p>Add Kitchen people first, or leave this shift empty and use Quick confirm on the day.</p>
                        @endforelse
                    </fieldset>
                    <div class="pmd-shifts__form-actions"><button type="button" class="pmd-shifts__button is-soft" data-pmd-shift-cancel>Cancel</button><button class="pmd-shifts__button" type="submit">Save shift</button></div>
                </form>

                <form class="pmd-shifts__copy" method="post" action="{{ admin_url('shifts/copyweek') }}">@csrf<input type="hidden" name="week" value="{{ $weekStart->toDateString() }}"><button class="pmd-shifts__button is-soft" type="submit">Copy this week → next week</button></form>
            </section>
        </div>

        <section id="pmd-kitchen-eta" class="pmd-shifts__panel pmd-shifts__eta">
            <div class="pmd-shifts__panel-head"><div><span class="pmd-shifts__eyebrow">Preparation & ETA</span><h2>Keep the promise simple</h2><p>PMD uses food prep, KDS queue, confirmed team and recent real kitchen pace behind the scenes.</p></div></div>
            <form method="post" action="{{ admin_url('shifts/saveeta') }}" class="pmd-shifts__eta-form">
                @csrf
                <label class="pmd-shifts__switch-row"><span><strong>Show preparation estimates to guests</strong><small>Food ranges before ordering and live ETA after Kitchen release.</small></span><input type="checkbox" name="show_customer_eta" value="1" {{ !empty($eta['show']) ? 'checked' : '' }}></label>
                <div class="pmd-shifts__eta-delay">
                    <div><strong>If an order needs more time</strong><small>PMD checks near the deadline. If it is still not Ready, extend by:</small></div>
                    <div class="pmd-shifts__preset-row" data-pmd-eta-presets>
                        @foreach([5,10,15,20] as $minutes)<label><input type="radio" name="extension_minutes" value="{{ $minutes }}" {{ (int)($eta['extension_minutes'] ?? 10) === $minutes ? 'checked' : '' }}><span>+{{ $minutes }}</span></label>@endforeach
                        <label class="is-custom"><input type="radio" name="extension_minutes" value="0" {{ !in_array((int)($eta['extension_minutes'] ?? 10), [5,10,15,20], true) ? 'checked' : '' }}><span>Custom</span></label>
                        <input class="pmd-shifts__custom-min" type="number" name="custom_extension_minutes" min="1" max="120" value="{{ (int)($eta['extension_minutes'] ?? 10) }}" aria-label="Custom extension minutes">
                    </div>
                    <small class="pmd-shifts__hint">Automatic extensions are capped internally. After repeated misses, PMD shows “Taking longer than expected” instead of endlessly moving the promise.</small>
                </div>
                <button class="pmd-shifts__button" type="submit">Save ETA settings</button>
            </form>
        </section>
    @endif
</div>

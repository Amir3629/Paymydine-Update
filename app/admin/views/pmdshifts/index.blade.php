@php
    $ops = $pmdKitchenOps ?? [];
    $t = fn ($text) => \Admin\Classes\PmdPlatformI18n::fromEnglish($text, 'settings.');
    $today = $ops['today'] ?? [];
    $todaySnapshot = $today['snapshot'] ?? [];
    $todayShift = $today['shift'] ?? null;
    $todayPeople = $today['people'] ?? [];
    $weekStart = $ops['week_start'];
    $weekEnd = $ops['week_end'];
    $shiftPeople = $ops['shift_people'];
    $extension = (int)($ops['extension_minutes'] ?? 10);
    $presetExtension = in_array($extension, [5, 10, 15, 20], true) ? $extension : 0;
@endphp

<div class="pmd-shifts" data-pmd-shifts-root>
    <header class="pmd-shifts__hero">
        <div>
            <span class="pmd-shifts__eyebrow">{{ $t('Kitchen operations') }}</span>
            <h1>{{ $t('People & shifts') }}</h1>
            <p>{{ $t('Keep the kitchen plan simple. People do not need a PayMyDine login unless you choose to link one for optional attendance data.') }}</p>
        </div>
        <a class="pmd-shifts__back" href="{{ admin_url('dashboard') }}">{{ $t('Back to dashboard') }}</a>
    </header>

    <section class="pmd-shifts__card pmd-shifts__today" id="today-team">
        <div class="pmd-shifts__card-head">
            <div>
                <span class="pmd-shifts__eyebrow">{{ $t('Today') }}</span>
                <h2>{{ $t('Kitchen team today') }}</h2>
                <p>{{ $t('Confirm the real team once per shift. Ordering never waits for this confirmation.') }}</p>
            </div>
            <span class="pmd-shifts__status {{ !empty($todaySnapshot['confirmed']) ? 'is-ok' : 'is-warn' }}">
                {{ !empty($todaySnapshot['confirmed']) ? $t('Confirmed') : $t('Needs confirmation') }}
            </span>
        </div>

        @if($todayShift)
            <div class="pmd-shifts__today-meta">
                <strong>{{ $todayShift->label }}</strong>
                <span>{{ $todayShift->starts_at ? substr((string)$todayShift->starts_at, 0, 5) : '—' }} → {{ $todayShift->ends_at ? substr((string)$todayShift->ends_at, 0, 5) : '—' }}</span>
                <span>{{ count($todayPeople) }} {{ $t('planned people') }}</span>
            </div>

            @if(!empty($todaySnapshot['confirmed']))
                <div class="pmd-shifts__people-summary">
                    @forelse($todayPeople as $person)
                        <span class="pmd-shifts__person-chip {{ in_array(strtolower($person['attendance_status']), ['present','replacement'], true) ? 'is-present' : 'is-absent' }}">
                            {{ $person['name'] }} · {{ $person['job_role'] }}
                        </span>
                    @empty
                        <span>{{ $t('Confirmed with quick role counts.') }}</span>
                    @endforelse
                </div>
            @else
                <div class="pmd-shifts__today-actions">
                    <form data-request="onConfirmTeam" data-request-flash>
                        <input type="hidden" name="all_present" value="1">
                        <button class="pmd-shifts__btn pmd-shifts__btn--primary" type="submit">{{ $t('Everything as planned') }}</button>
                    </form>
                    <form class="pmd-shifts__attendance" data-request="onConfirmTeam" data-request-flash>
                        @foreach($todayPeople as $person)
                            <label>
                                <input type="checkbox" name="present_assignment_ids[]" value="{{ $person['id'] }}" checked>
                                <span><strong>{{ $person['name'] }}</strong><small>{{ $person['job_role'] }}</small></span>
                            </label>
                        @endforeach
                        <button class="pmd-shifts__btn" type="submit">{{ $t('Confirm selected team') }}</button>
                    </form>
                </div>
            @endif
        @else
            <form class="pmd-shifts__quick" data-request="onConfirmTeam" data-request-flash>
                <p>{{ $t('No shift is planned. Just tell PMD how many people are in the kitchen now.') }}</p>
                <div class="pmd-shifts__quick-grid">
                    @foreach($ops['roles'] as $role)
                        <label>
                            <span>{{ $t($role) }}</span>
                            <input type="number" min="0" max="50" step="1" value="0" name="quick_{{ md5($role) }}">
                        </label>
                    @endforeach
                </div>
                <button class="pmd-shifts__btn pmd-shifts__btn--primary" type="submit">{{ $t('Confirm team') }}</button>
            </form>
        @endif
    </section>

    <div class="pmd-shifts__grid">
        <section class="pmd-shifts__card" id="people">
            <div class="pmd-shifts__card-head">
                <div><span class="pmd-shifts__eyebrow">{{ $t('Roster') }}</span><h2>{{ $t('People') }}</h2><p>{{ $t('Operational roles are separate from PMD access roles.') }}</p></div>
            </div>

            <form class="pmd-shifts__form" data-request="onSavePerson" data-request-flash data-request-validate data-pmd-person-form>
                <input type="hidden" name="person_id" value="" data-pmd-person-id>
                <label><span>{{ $t('Name') }}</span><input type="text" name="display_name" maxlength="128" required data-pmd-person-name></label>
                <label><span>{{ $t('Department') }}</span><select name="department" data-pmd-person-department>@foreach($ops['departments'] as $key=>$label)<option value="{{ $key }}">{{ $t($label) }}</option>@endforeach</select></label>
                <label><span>{{ $t('Job role') }}</span><select name="job_role" data-pmd-person-role><option value="">{{ $t('Choose role') }}</option>@foreach($ops['roles'] as $role)<option value="{{ $role }}">{{ $t($role) }}</option>@endforeach</select></label>
                <label><span>{{ $t('Station') }} <small>{{ $t('optional') }}</small></span><input type="text" name="station_slug" maxlength="80" placeholder="grill / pizza" data-pmd-person-station></label>
                <label class="pmd-shifts__wide"><span>{{ $t('PMD account') }} <small>{{ $t('optional — only for attendance/check-in linking') }}</small></span><select name="staff_id" data-pmd-person-staff><option value="0">{{ $t('No PMD login needed') }}</option>@foreach($ops['staff'] as $staff)<option value="{{ (int)$staff->staff_id }}">{{ $staff->staff_name }}@if($staff->role) · {{ $staff->role->name }}@endif</option>@endforeach</select></label>
                <div class="pmd-shifts__form-actions pmd-shifts__wide"><button class="pmd-shifts__btn pmd-shifts__btn--primary" type="submit">{{ $t('Save person') }}</button><button class="pmd-shifts__btn" type="button" data-pmd-person-clear>{{ $t('Clear') }}</button></div>
            </form>

            <div class="pmd-shifts__list">
                @forelse($ops['people'] as $person)
                    <article class="pmd-shifts__row">
                        <div><strong>{{ $person->display_name }}</strong><small>{{ ucfirst($person->department) }} · {{ $person->job_role ?: $t('Team member') }}@if($person->station_slug) · {{ $person->station_slug }}@endif</small></div>
                        <div class="pmd-shifts__row-actions">
                            <button type="button" class="pmd-shifts__link" data-pmd-edit-person
                                data-id="{{ (int)$person->id }}" data-name="{{ e($person->display_name) }}" data-department="{{ e($person->department) }}"
                                data-role="{{ e((string)$person->job_role) }}" data-station="{{ e((string)$person->station_slug) }}" data-staff="{{ (int)($person->staff_id ?: 0) }}">{{ $t('Edit') }}</button>
                            <form data-request="onRemovePerson" data-request-flash><input type="hidden" name="person_id" value="{{ (int)$person->id }}"><button type="submit" class="pmd-shifts__link is-danger">{{ $t('Remove') }}</button></form>
                        </div>
                    </article>
                @empty
                    <div class="pmd-shifts__empty">{{ $t('Add your first kitchen person. A PMD login is not required.') }}</div>
                @endforelse
            </div>
        </section>

        <section class="pmd-shifts__card" id="weekly-shifts">
            <div class="pmd-shifts__card-head">
                <div><span class="pmd-shifts__eyebrow">{{ $t('Plan') }}</span><h2>{{ $t('Weekly shifts') }}</h2><p>{{ $weekStart->format('d M') }} – {{ $weekEnd->format('d M Y') }}</p></div>
                <div class="pmd-shifts__week-nav"><a href="{{ admin_url('shifts?week='.$weekStart->copy()->subDays(7)->toDateString()) }}">←</a><a href="{{ admin_url('shifts?week='.$weekStart->copy()->addDays(7)->toDateString()) }}">→</a></div>
            </div>

            <form class="pmd-shifts__form" data-request="onSaveShift" data-request-flash data-request-validate data-pmd-shift-form>
                <input type="hidden" name="shift_id" value="" data-pmd-shift-id>
                <label><span>{{ $t('Date') }}</span><input type="date" name="shift_date" value="{{ now()->toDateString() }}" required data-pmd-shift-date></label>
                <label><span>{{ $t('Shift') }}</span><input type="text" name="label" value="Dinner" maxlength="64" required data-pmd-shift-label></label>
                <label><span>{{ $t('Starts') }}</span><input type="time" name="starts_at" value="17:00" data-pmd-shift-start></label>
                <label><span>{{ $t('Ends') }}</span><input type="time" name="ends_at" value="23:00" data-pmd-shift-end></label>
                <div class="pmd-shifts__presets pmd-shifts__wide"><button type="button" data-pmd-shift-preset="lunch">{{ $t('Lunch') }}</button><button type="button" data-pmd-shift-preset="dinner">{{ $t('Dinner') }}</button><button type="button" data-pmd-shift-preset="full">{{ $t('Full day') }}</button></div>
                <fieldset class="pmd-shifts__people-pick pmd-shifts__wide"><legend>{{ $t('People on this shift') }}</legend>@foreach($ops['people'] as $person)<label><input type="checkbox" name="person_ids[]" value="{{ (int)$person->id }}" data-pmd-shift-person="{{ (int)$person->id }}"><span>{{ $person->display_name }}<small>{{ $person->job_role ?: ucfirst($person->department) }}</small></span></label>@endforeach</fieldset>
                <div class="pmd-shifts__form-actions pmd-shifts__wide"><button class="pmd-shifts__btn pmd-shifts__btn--primary" type="submit">{{ $t('Save shift') }}</button><button class="pmd-shifts__btn" type="button" data-pmd-shift-clear>{{ $t('New shift') }}</button></div>
            </form>

            <div class="pmd-shifts__list">
                @forelse($ops['shifts'] as $shift)
                    @php $assigned = $shiftPeople->get($shift->id, collect()); @endphp
                    <article class="pmd-shifts__row pmd-shifts__shift-row">
                        <div><strong>{{ \Carbon\Carbon::parse($shift->shift_date)->format('D d M') }} · {{ $shift->label }}</strong><small>{{ $shift->starts_at ? substr((string)$shift->starts_at,0,5) : '—' }} → {{ $shift->ends_at ? substr((string)$shift->ends_at,0,5) : '—' }} · {{ $assigned->count() }} {{ $t('people') }}</small><span>{{ $assigned->pluck('display_name_snapshot')->implode(' · ') }}</span></div>
                        <div class="pmd-shifts__row-actions">
                            <button type="button" class="pmd-shifts__link" data-pmd-edit-shift data-id="{{ (int)$shift->id }}" data-date="{{ $shift->shift_date }}" data-label="{{ e($shift->label) }}" data-start="{{ $shift->starts_at ? substr((string)$shift->starts_at,0,5) : '' }}" data-end="{{ $shift->ends_at ? substr((string)$shift->ends_at,0,5) : '' }}" data-people="{{ $assigned->pluck('person_id')->filter()->implode(',') }}">{{ $t('Edit') }}</button>
                            <form data-request="onRemoveShift" data-request-flash><input type="hidden" name="shift_id" value="{{ (int)$shift->id }}"><button class="pmd-shifts__link is-danger" type="submit">{{ $t('Remove') }}</button></form>
                        </div>
                    </article>
                @empty
                    <div class="pmd-shifts__empty">{{ $t('No shifts planned for this week.') }}</div>
                @endforelse
            </div>

            <form class="pmd-shifts__copy" data-request="onCopyWeek" data-request-flash><input type="hidden" name="week_start" value="{{ $weekStart->toDateString() }}"><button class="pmd-shifts__btn" type="submit">{{ $t('Copy this week forward') }}</button></form>
        </section>
    </div>

    <section class="pmd-shifts__card" id="pmd-kitchen-eta">
        <div class="pmd-shifts__card-head"><div><span class="pmd-shifts__eyebrow">{{ $t('Guest experience') }}</span><h2>{{ $t('Preparation & ETA') }}</h2><p>{{ $t('PMD handles queue, Kitchen progress, staffing and recent pace automatically. Keep restaurant settings simple.') }}</p></div></div>
        <form class="pmd-shifts__eta" data-request="onSaveEta" data-request-flash>
            <label class="pmd-shifts__toggle"><input type="checkbox" name="show_customer_eta" value="1" {{ !empty($ops['show_eta']) ? 'checked' : '' }}><span>{{ $t('Show preparation estimates to guests') }}</span></label>
            <div><strong>{{ $t('If an order needs more time') }}</strong><small>{{ $t('PMD checks automatically near the deadline when the order is still not Ready.') }}</small></div>
            <div class="pmd-shifts__eta-presets" data-pmd-eta-presets>
                @foreach([5,10,15,20] as $minutes)<label><input type="radio" name="extension_preset" value="{{ $minutes }}" {{ $presetExtension === $minutes ? 'checked' : '' }}><span>+{{ $minutes }} min</span></label>@endforeach
                <label><input type="radio" name="extension_preset" value="0" {{ $presetExtension === 0 ? 'checked' : '' }}><span>{{ $t('Custom') }}</span></label>
                <input class="pmd-shifts__eta-custom" type="number" min="1" max="120" name="extension_custom" value="{{ $extension }}" aria-label="{{ $t('Custom extension minutes') }}">
            </div>
            <p class="pmd-shifts__hint">{{ $t('After two automatic extensions PMD stops making another precise promise and shows that the kitchen needs more time.') }}</p>
            <button class="pmd-shifts__btn pmd-shifts__btn--primary" type="submit">{{ $t('Save ETA settings') }}</button>
        </form>
    </section>
</div>

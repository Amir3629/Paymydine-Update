@php
    // PMD_SHIFTS_SERVER_FIRST_ROTA_V13
    // The first requested day is already final HTML. Browser JS owns later day
    // changes only, so refresh never paints an empty/tight rota and replaces it.
    $pmdServerRoleMeta = static function ($person) {
        $code = strtolower(trim((string)($person['access_role_code'] ?? '')));
        $name = strtolower(trim((string)($person['access_role_name'] ?? '')));

        if (str_starts_with($code, 'pmd-kds:') || $code === 'pmd-team-member' || $name === 'kitchen staff') {
            return ['family' => 'kitchen', 'rank' => 10];
        }
        if ($code === 'pmd-waiter' || $name === 'waiter') {
            return ['family' => 'waiter', 'rank' => 20];
        }
        if ($code === 'pmd-cashier' || $name === 'cashier') {
            return ['family' => 'cashier', 'rank' => 30];
        }
        if ($code === 'pmd-reservations' || $name === 'reservations') {
            return ['family' => 'reservations', 'rank' => 40];
        }
        if ($code === 'pmd-manager' || $name === 'manager') {
            return ['family' => 'manager', 'rank' => 50];
        }
        if ($code === 'pmd-accountant' || $name === 'accountant') {
            return ['family' => 'accountant', 'rank' => 60];
        }
        return ['family' => 'sonstige', 'rank' => 70];
    };

    $pmdServerPeople = $bootPeople->map(function ($person) use ($pmdServerRoleMeta) {
        $meta = $pmdServerRoleMeta($person);
        $person['pmd_family'] = $meta['family'];
        $person['pmd_rank'] = $meta['rank'];
        return $person;
    })->sort(function ($left, $right) {
        if ((int)$left['pmd_rank'] !== (int)$right['pmd_rank']) {
            return (int)$left['pmd_rank'] <=> (int)$right['pmd_rank'];
        }
        return strcasecmp((string)$left['name'], (string)$right['name']);
    })->values();

    $pmdServerDate = $selectedDay->toDateString();
    $pmdServerDayShifts = $bootShifts
        ->filter(fn($shift) => (string)($shift['date'] ?? '') === $pmdServerDate)
        ->values();

    $pmdServerMinutes = static function ($clock, $fallback) {
        $clock = trim((string)$clock);
        if (!preg_match('/^([01][0-9]|2[0-3]):([0-5][0-9])$/', $clock, $match)) return $fallback;
        return ((int)$match[1] * 60) + (int)$match[2];
    };

    $pmdServerInitials = static function ($name) {
        $parts = preg_split('/\s+/', trim((string)$name), -1, PREG_SPLIT_NO_EMPTY);
        $letters = '';
        foreach (array_slice($parts ?: [], 0, 2) as $part) {
            $letters .= mb_strtoupper(mb_substr($part, 0, 1));
        }
        return $letters !== '' ? $letters : 'T';
    };
@endphp

<div class="pmd-shifts-final-screen" data-pmd-shifts-server-initial data-date="{{ $pmdServerDate }}">
    <header class="pmd-shifts-final-toolbar">
        <div class="pmd-shifts-final-date">
            <button type="button" class="pmd-shifts-final-nav" data-pmd-shifts-prev-day aria-label="Previous day">‹</button>
            <div><h2>{{ $selectedDay->format('l, F j, Y') }}</h2></div>
            <button type="button" class="pmd-shifts-final-nav" data-pmd-shifts-next-day aria-label="Next day">›</button>
        </div>
        <div class="pmd-shifts-final-actions">
            @if(!$selectedDay->isToday())
                <button type="button" class="pmd-shifts-final-soft" data-pmd-shifts-today>Today</button>
            @endif
            <button type="button" class="pmd-shifts-final-member-add" data-pmd-team-open>+ Member</button>
            <label class="pmd-shifts-date-picker" title="Choose date">
                <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"></rect><path d="M8 3v4M16 3v4M3 10h18"></path></svg>
                <input type="date" data-pmd-shifts-date-input value="{{ $pmdServerDate }}" aria-label="Choose date">
            </label>
        </div>
    </header>

    @if($pmdServerPeople->isEmpty())
        <div class="pmd-shifts-final-empty">
            <strong>No team members yet</strong>
            <button type="button" data-pmd-team-open>+ Member</button>
        </div>
    @else
        <div class="pmd-shifts-final-scroll">
            <div class="pmd-shifts-final-board">
                <div class="pmd-shifts-final-scale-row">
                    <div class="pmd-shifts-final-scale-person">Team</div>
                    <div class="pmd-shifts-final-scale">
                        @for($tick = 360; $tick <= 1800; $tick += 120)
                            <span>{{ sprintf('%02d:%02d', intdiv($tick, 60) % 24, $tick % 60) }}</span>
                        @endfor
                    </div>
                </div>

                @foreach($pmdServerPeople as $person)
                    @php
                        $personId = (int)$person['id'];
                        $personShifts = $pmdServerDayShifts->filter(function ($shift) use ($personId) {
                            return collect($shift['people'] ?? [])->contains(
                                fn($assigned) => (int)($assigned['person_id'] ?? 0) === $personId
                            );
                        })->values();
                    @endphp
                    <div
                        class="pmd-shifts-final-row"
                        data-person-id="{{ $personId }}"
                        data-pmd-role-family="{{ $person['pmd_family'] }}"
                        data-pmd-role-rank="{{ (int)$person['pmd_rank'] }}"
                    >
                        <div class="pmd-shifts-final-person">
                            <span class="pmd-shifts-final-avatar">{{ $pmdServerInitials($person['name']) }}</span>
                            <span class="pmd-shifts-final-person-copy">
                                <button
                                    type="button"
                                    data-pmd-team-edit
                                    data-person-id="{{ $personId }}"
                                    data-name="{{ $person['name'] }}"
                                    data-role="{{ $person['role'] ?? '' }}"
                                    data-has-access="{{ !empty($person['has_access']) ? '1' : '0' }}"
                                    data-username="{{ $person['username'] ?? '' }}"
                                    data-staff-role-id="{{ $person['staff_role_id'] ?? '' }}"
                                >{{ $person['name'] }}</button>
                                <small>{{ $person['role'] ?? 'Team' }}</small>
                            </span>
                        </div>

                        <div class="pmd-shifts-final-track">
                            <div class="pmd-shifts-final-slots">
                                @for($slot = 360; $slot < 1800; $slot += 30)
                                    @php $slotLabel = sprintf('%02d:%02d', intdiv($slot, 60) % 24, $slot % 60); @endphp
                                    <button
                                        type="button"
                                        class="pmd-shifts-final-slot"
                                        data-pmd-person-slot-create
                                        data-person-id="{{ $personId }}"
                                        data-date="{{ $pmdServerDate }}"
                                        data-time="{{ $slotLabel }}"
                                        aria-label="Add {{ $person['name'] }} at {{ $slotLabel }}"
                                    ><span>+</span></button>
                                @endfor
                            </div>

                            <div class="pmd-shifts-final-shifts">
                                @foreach($personShifts as $shift)
                                    @php
                                        $start = $pmdServerMinutes($shift['start'] ?? '', 360);
                                        $end = $pmdServerMinutes($shift['end'] ?? '', min(1800, $start + 480));
                                        if ($end <= $start) $end += 1440;
                                        $drawStart = max(360, $start);
                                        $drawEnd = min(1800, $end);
                                        if ($drawEnd <= $drawStart) $drawEnd = min(1800, $drawStart + 30);
                                        $left = (($drawStart - 360) / 1440) * 100;
                                        $width = (($drawEnd - $drawStart) / 1440) * 100;
                                        $assignment = collect($shift['people'] ?? [])->first(
                                            fn($assigned) => (int)($assigned['person_id'] ?? 0) === $personId
                                        );
                                        $state = strtolower((string)($assignment['attendance'] ?? 'planned'));
                                        $time = trim((string)($shift['start'] ?? ''));
                                        if ($time === '') $time = 'All day';
                                        if (!empty($shift['end'])) $time .= '–'.(string)$shift['end'];
                                        $shiftClass = 'pmd-shifts-final-shift';
                                        if (!empty($shift['confirmed'])) $shiftClass .= ' is-confirmed';
                                        if ($state === 'absent') $shiftClass .= ' is-absent';
                                    @endphp
                                    <button
                                        type="button"
                                        class="{{ $shiftClass }}"
                                        data-pmd-shift-manage="{{ (int)$shift['id'] }}"
                                        style="left:{{ number_format($left, 4, '.', '') }}%;width:{{ number_format($width, 4, '.', '') }}%"
                                        title="{{ ($shift['label'] ?? 'Shift').' · '.$time.' · click to edit' }}"
                                    >
                                        <strong>{{ $time }}</strong>
                                        <span>{{ $shift['label'] ?? 'Shift' }}</span>
                                    </button>
                                @endforeach
                            </div>
                        </div>
                    </div>
                @endforeach
            </div>
        </div>
    @endif
</div>

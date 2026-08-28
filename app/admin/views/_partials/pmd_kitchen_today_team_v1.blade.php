@php
    $pmdKitchenTodayTeam = $pmdKitchenTodayTeam ?? null;
    if (!$pmdKitchenTodayTeam) {
        try {
            $pmdTodayLocationId = max(1, (int)\Admin\Facades\AdminLocation::getId());
            $pmdKitchenTodayTeam = app(\App\Services\PmdKitchenWorkforceService::class)->todayCard($pmdTodayLocationId);
        } catch (\Throwable $error) {
            $pmdKitchenTodayTeam = ['ready' => false];
        }
    }
    $pmdTodayReady = (bool)($pmdKitchenTodayTeam['ready'] ?? false);
    $pmdTodayShift = $pmdKitchenTodayTeam['shift'] ?? null;
    $pmdTodayPeople = collect($pmdKitchenTodayTeam['people'] ?? []);
    $pmdTodaySnapshot = $pmdKitchenTodayTeam['snapshot'] ?? [];
    $pmdTodayConfirmed = (bool)($pmdTodaySnapshot['confirmed'] ?? false);
    $pmdTodayRoles = $pmdKitchenTodayTeam['quick_roles'] ?? \App\Services\PmdKitchenWorkforceService::KITCHEN_ROLES;
    $pmdTodayReturn = request()->path() === 'admin/managerdashboard' || request()->path() === 'admin/managerlab'
        ? '/admin/managerdashboard'
        : '/admin/ownerdashboard';
@endphp

@if($pmdTodayReady)
<section class="pmd-kitchen-today {{ !$pmdTodayConfirmed ? 'needs-confirmation' : 'is-confirmed' }}" data-pmd-kitchen-today>
    <div class="pmd-kitchen-today__copy">
        <span class="pmd-kitchen-today__eyebrow">Kitchen team today</span>
        @if($pmdTodayConfirmed)
            <strong>{{ (int)($pmdTodaySnapshot['actual_count'] ?? 0) }} confirmed</strong>
            <small>{{ $pmdTodayShift ? $pmdTodayShift->label : 'Today' }} · {{ str_replace('_',' ',(string)($pmdTodaySnapshot['source'] ?? 'confirmed shift')) }}</small>
        @elseif($pmdTodayShift)
            <strong>{{ $pmdTodayShift->label }} needs confirmation</strong>
            <small>One quick check gives PMD a better Kitchen-capacity signal. Ordering is never blocked.</small>
        @else
            <strong>Who is in the Kitchen today?</strong>
            <small>No shift plan yet. Quick confirm now, or plan the week later.</small>
        @endif
    </div>

    @if($pmdTodayConfirmed)
        <a class="pmd-kitchen-today__action is-soft" href="{{ admin_url('shifts') }}">View shifts</a>
    @else
        <details class="pmd-kitchen-today__details" open>
            <summary>Confirm team</summary>
            <form method="post" action="{{ admin_url('shifts/confirm') }}">
                @csrf
                <input type="hidden" name="shift_id" value="{{ $pmdTodayShift->id ?? 0 }}">
                <input type="hidden" name="return_to" value="{{ $pmdTodayReturn }}">
                @if($pmdTodayPeople->count())
                    <div class="pmd-kitchen-today__people">
                        @foreach($pmdTodayPeople as $person)
                            <label><input type="checkbox" name="present_ids[]" value="{{ $person['id'] }}" checked><span><strong>{{ $person['name'] }}</strong><small>{{ $person['job_role'] }}</small></span></label>
                        @endforeach
                    </div>
                    <div class="pmd-kitchen-today__actions">
                        <button class="pmd-kitchen-today__action is-soft" type="submit" name="everything_as_planned" value="1">Everything as planned</button>
                        <button class="pmd-kitchen-today__action" type="submit">Confirm selected</button>
                    </div>
                @else
                    <div class="pmd-kitchen-today__quick">
                        @foreach($pmdTodayRoles as $role)
                            @php $pmdTodayKey='quick_'.strtolower(trim(preg_replace('/[^a-z0-9]+/i','_',$role),'_')); @endphp
                            <label><span>{{ $role }}</span><input type="number" name="{{ $pmdTodayKey }}" min="0" max="100" value="0" inputmode="numeric"></label>
                        @endforeach
                    </div>
                    <div class="pmd-kitchen-today__actions"><a class="pmd-kitchen-today__action is-soft" href="{{ admin_url('shifts') }}">Plan shifts</a><button class="pmd-kitchen-today__action" type="submit">Confirm Kitchen team</button></div>
                @endif
            </form>
        </details>
    @endif
</section>
@endif

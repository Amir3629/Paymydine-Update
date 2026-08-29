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
    $pmdTodayReturn = request()->path() === 'admin/managerdashboard' || request()->path() === 'admin/managerlab'
        ? '/admin/managerdashboard'
        : '/admin/ownerdashboard';

    // Only a real planned Shift can trigger this prompt. Dashboard never creates
    // ad-hoc staffing data and never shows the whole restaurant roster here.
    $pmdTodayShow = $pmdTodayReady
        && $pmdTodayShift
        && $pmdTodayPeople->count() > 0
        && !$pmdTodayConfirmed;
@endphp

@if($pmdTodayShow)
<div class="pmd-kitchen-today-modal" data-pmd-kitchen-today-modal>
    <div class="pmd-kitchen-today-modal__backdrop" aria-hidden="true"></div>
    <section class="pmd-kitchen-today" data-pmd-kitchen-today role="dialog" aria-modal="true" aria-labelledby="pmd-kitchen-today-title">
        <div class="pmd-kitchen-today__title" id="pmd-kitchen-today-title">KITCHEN TEAM TODAY</div>

        <form class="pmd-kitchen-today__form" method="post" action="{{ admin_url('shifts/confirm') }}">
            @csrf
            <input type="hidden" name="shift_id" value="{{ (int)$pmdTodayShift->id }}">
            <input type="hidden" name="confirmation_scope" value="kitchen">
            <input type="hidden" name="return_to" value="{{ $pmdTodayReturn }}">

            <div class="pmd-kitchen-today__people" aria-label="Kitchen team for this shift">
                @foreach($pmdTodayPeople as $person)
                    <label class="pmd-kitchen-today__person">
                        <input type="checkbox" name="present_ids[]" value="{{ (int)$person['id'] }}" checked>
                        <span class="pmd-kitchen-today__check" aria-hidden="true">
                            <svg viewBox="0 0 24 24"><path d="m5 12 4 4L19 6"></path></svg>
                        </span>
                        <span class="pmd-kitchen-today__person-copy">
                            <strong>{{ $person['name'] }}</strong>
                            <small>{{ $person['job_role'] }}</small>
                        </span>
                    </label>
                @endforeach
            </div>

            <button class="pmd-kitchen-today__confirm" type="submit">Confirm</button>
        </form>
    </section>
</div>
@endif

@php
    // PMD_RESERVATIONS_LAB_EXACT_RESERVATIONS2_V2_4
    // Calendar/Hour visual DOM is created only after the user opens Calendar.
    // The JSON payload is server-rendered; the Floor remains the initial surface.
    $schedule = $pmdReservationsLabSchedule ?? [];
    $strings = $schedule['strings'] ?? [];
    $bootstrapJson = json_encode($schedule, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT);
    if ($bootstrapJson === false) $bootstrapJson = '{}';
    $t = static function ($key, $fallback = '') use ($strings) {
        return (string)($strings[$key] ?? $fallback);
    };
@endphp

<div class="pmd-reservations-lab-composer" data-pmd-res-lab-composer hidden>
    <div class="pmd-reservations-lab-composer__backdrop" data-pmd-res-lab-close></div>
    <section class="pmd-reservations-lab-composer__card" role="dialog" aria-modal="true" aria-labelledby="pmd-res-lab-composer-title">
        <header>
            <div><small>{{ $t('reservation', 'Reservation') }}</small><h2 id="pmd-res-lab-composer-title" data-pmd-res-lab-composer-title>{{ $t('new_reservation', 'New reservation') }}</h2></div>
            <button type="button" data-pmd-res-lab-close aria-label="{{ $t('close', 'Close') }}">×</button>
        </header>
        <form data-pmd-res-lab-form novalidate>
            <input type="hidden" name="reservation_id">
            <input type="hidden" name="source" value="reservationslab">
            <input type="hidden" name="location_id">
            <input type="hidden" name="occasion_id" value="0">
            <input type="hidden" name="notify" value="0">
            <div class="pmd-reservations-lab-composer__error" data-pmd-res-lab-error hidden></div>
            <div class="pmd-reservations-lab-composer__grid">
                <label><span>{{ $t('name', 'Name') }}</span><input name="first_name" autocomplete="name" required></label>
                <input type="hidden" name="last_name" value="">
                <label><span>{{ $t('phone_optional', 'Phone (optional)') }}</span><input name="telephone" type="tel" autocomplete="tel"></label>
                <label><span>{{ $t('email_optional', 'Email (optional)') }}</span><input name="email" type="email" autocomplete="email"></label>
                <label><span>{{ $t('guests', 'Guests') }}</span><input name="guest_num" type="number" min="1" step="1" required></label>
                <label><span>{{ $t('date', 'Date') }}</span><input name="reserve_date" type="date" required></label>
                <label><span>{{ $t('time', 'Time') }}</span><input name="reserve_time" type="time" step="900" required></label>
                <label><span>{{ $t('duration', 'Duration') }}</span><select name="duration"><option value="30">30 min</option><option value="45" selected>45 min</option><option value="60">60 min</option><option value="75">75 min</option><option value="90">90 min</option><option value="120">120 min</option><option value="150">150 min</option><option value="180">180 min</option></select></label>
            </div>
            <fieldset class="pmd-reservations-lab-composer__assignment">
                <legend>{{ $t('table_assignment', 'Table assignment') }}</legend>
                <div class="pmd-reservations-lab-composer__modes">
                    <label><input type="radio" name="assignment_mode" value="auto" checked><span>{{ $t('auto_assign', 'Auto assign') }}</span></label>
                    <label><input type="radio" name="assignment_mode" value="choose"><span>{{ $t('choose_tables', 'Choose table(s)') }}</span></label>
                    <label><input type="radio" name="assignment_mode" value="later"><span>{{ $t('assign_later', 'Assign later') }}</span></label>
                </div>
                <label data-pmd-res-lab-table-field hidden><span>{{ $t('tables', 'Tables') }}</span><select name="tables[]" multiple></select></label>
                <div class="pmd-reservations-lab-composer__availability" data-pmd-res-lab-availability></div>
                <button type="button" class="pmd-reservations-lab-composer__check" data-pmd-res-lab-check>{{ $t('check_availability', 'Check availability') }}</button>
            </fieldset>
            <label class="pmd-reservations-lab-composer__notes"><span>{{ $t('notes', 'Notes') }}</span><textarea name="comment" rows="3"></textarea></label>
            <footer>
                <button type="button" data-pmd-res-lab-close>{{ $t('cancel', 'Cancel') }}</button>
                <button type="submit" class="is-primary" data-pmd-res-lab-save>{{ $t('save', 'Save reservation') }}</button>
            </footer>
        </form>
    </section>
</div>

<script type="application/json" id="pmd-reservations-lab-schedule-bootstrap-v1">{!! $bootstrapJson !!}</script>

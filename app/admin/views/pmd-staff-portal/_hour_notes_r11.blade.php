{{-- PMD_STAFF_HOUR_NOTES_CARD_R11
     Recipient-only note cards from tenant-local materialized receipts.
     This is SSR-first; JS enhances live refreshing/ack while keeping plain
     CSRF-protected POST forms as an accessibility/network fallback. --}}
<section class="pmd-staff-hour-notices" data-pmd-staff-hour-notices
         data-pmd-staff-notes-url="{{ admin_url('_pmd/staff-hour-notes-r11') }}"
         data-pmd-staff-notes-confirm-prefix="{{ admin_url('_pmd/staff-hour-notes-r11') }}"
         aria-label="Messages from your restaurant">
    <header class="pmd-staff-hour-notices__head">
        <div>
            <small>From your restaurant</small>
            <h3>Team notes <span data-pmd-staff-hour-unread>@if($pmdStaffHourNotesUnread > 0){{ $pmdStaffHourNotesUnread }} new@endif</span></h3>
        </div>
        <span class="pmd-staff-hour-notices__head-mark">Read &amp; confirm</span>
    </header>
    <div class="pmd-staff-hour-notices__items" data-pmd-hour-notice-list aria-live="polite">
        @if(!$pmdStaffHourNotesReady)
            <div class="pmd-staff-hour-notices__empty" data-pmd-hour-note-empty>Team messages are not ready for this restaurant yet.</div>
        @elseif(empty($pmdStaffHourNotes))
            <div class="pmd-staff-hour-notices__empty" data-pmd-hour-note-empty>No notes for your account right now.</div>
        @else
            @foreach($pmdStaffHourNotes as $hourNotice)
                <article class="pmd-staff-hour-notice {{ !empty($hourNotice['confirmed']) ? 'is-confirmed' : 'is-unread' }}"
                         data-pmd-hour-note-id="{{ (int)$hourNotice['id'] }}">
                    <div class="pmd-staff-hour-notice__body">
                        <time datetime="{{ $hourNotice['date'] }}T{{ $hourNotice['time'] }}">
                            {{ \Carbon\Carbon::parse($hourNotice['date'])->format('D, d M') }} · {{ $hourNotice['time'] }}
                        </time>
                        <p>{{ $hourNotice['message'] }}</p>
                    </div>
                    @if(empty($hourNotice['confirmed']))
                        <form method="post" action="{{ admin_url('_pmd/staff-hour-notes-r11/'.(int)$hourNotice['id'].'/confirm') }}" data-pmd-hour-note-confirm>
                            @csrf
                            <button type="submit">Confirm</button>
                        </form>
                    @else
                        <span class="pmd-staff-hour-notice__confirmed">Confirmed</span>
                    @endif
                </article>
            @endforeach
        @endif
    </div>
</section>

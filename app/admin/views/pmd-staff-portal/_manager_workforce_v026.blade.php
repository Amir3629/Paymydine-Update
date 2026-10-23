{{-- PMD_OWNER_SHARED_STAFF_SHELL_V026_20261023
     Included ONLY by server role-gated Staff/Manager views.
     No private chats, employee raw GPS or payroll approval implied. --}}
@php
    $pmdOwnerCenter = is_array($managerCenter ?? null) ? $managerCenter : [];
    $pmdOwnerActive = collect($pmdOwnerCenter['active'] ?? []);
    $pmdOwnerExtras = collect($managerExtras ?? []);
    $pmdOwnerPendingExtras = $pmdOwnerExtras->filter(fn ($row) => !$row->reviewed);
    $pmdOwnerPendingRequests = collect($pmdOwnerCenter['requests'] ?? []);
    $pmdOwnerLang = in_array((string)($pmdStaffLocale ?? 'en'), ['de','tr','en'], true)
        ? (string)($pmdStaffLocale ?? 'en') : 'en';
    $pmdOwnerWords = [
        'en' => [
            'live' => 'Working now',
            'requests' => 'Requests to review',
            'extras' => 'Extra shifts',
            'overview' => 'Team overview',
            'now' => 'On shift',
            'break' => 'On break',
            'empty_live' => 'Nobody has an active time-clock session.',
            'empty_extra' => 'No extra work recorded this month.',
            'extra' => 'Outside schedule',
            'reviewed' => 'Reviewed',
            'pending' => 'Awaiting review',
            'review' => 'Mark reviewed',
            'started' => 'Started',
            'confirm' => 'Attendance recorded, not an automatic schedule change.',
            'time' => 'Real check-in and check-out times',
        ],
        'de' => [
            'live' => 'Jetzt im Dienst',
            'requests' => 'Offene Anfragen',
            'extras' => 'Zusatzschichten',
            'overview' => 'Teamübersicht',
            'now' => 'Im Dienst',
            'break' => 'In Pause',
            'empty_live' => 'Aktuell ist niemand eingestempelt.',
            'empty_extra' => 'Keine Zusatzschichten in diesem Monat.',
            'extra' => 'Außerhalb des Dienstplans',
            'reviewed' => 'Geprüft',
            'pending' => 'Prüfung ausstehend',
            'review' => 'Als geprüft markieren',
            'started' => 'Beginn',
            'confirm' => 'Arbeitszeit erfasst – der Dienstplan bleibt unverändert.',
            'time' => 'Tatsächliche Kommen- und Gehen-Zeiten',
        ],
        'tr' => [
            'live' => 'Şu an çalışanlar',
            'requests' => 'Bekleyen talepler',
            'extras' => 'Ek vardiyalar',
            'overview' => 'Ekip özeti',
            'now' => 'Çalışıyor',
            'break' => 'Molada',
            'empty_live' => 'Şu anda çalışan kaydı yok.',
            'empty_extra' => 'Bu ay ek vardiya bulunmuyor.',
            'extra' => 'Plan dışı çalışma',
            'reviewed' => 'İncelendi',
            'pending' => 'İnceleme bekliyor',
            'review' => 'İncelendi olarak işaretle',
            'started' => 'Başlangıç',
            'confirm' => 'Gerçek çalışma kaydedildi; vardiya planı değişmez.',
            'time' => 'Gerçek giriş ve çıkış saatleri',
        ],
    ][$pmdOwnerLang];
@endphp
<div class="pmd-owner-team" data-pmd-owner-team>
    <div class="pmd-owner-team__strip" aria-label="{{ $pmdOwnerWords['overview'] }}">
        <div><strong>{{ $pmdOwnerActive->count() }}</strong><span>{{ $pmdOwnerWords['live'] }}</span></div>
        <div><strong>{{ $pmdOwnerPendingRequests->count() }}</strong><span>{{ $pmdOwnerWords['requests'] }}</span></div>
        <div><strong>{{ $pmdOwnerPendingExtras->count() }}</strong><span>{{ $pmdOwnerWords['extras'] }}</span></div>
    </div>

    <section class="pmd-owner-team__group" aria-labelledby="pmd-owner-presence-title">
        <h3 id="pmd-owner-presence-title">{{ $pmdOwnerWords['live'] }}</h3>
        <div class="pmd-owner-team__list">
            @forelse($pmdOwnerActive as $member)
                @php
                    $pmdActiveMeta = json_decode((string)($member->metadata ?? ''), true);
                    $pmdOnBreak = false;
                    if (is_array($pmdActiveMeta)) {
                        foreach (($pmdActiveMeta['staff_portal_breaks'] ?? []) as $b) {
                            if (is_array($b) && !empty($b['start_at']) && empty($b['end_at'])) $pmdOnBreak = true;
                        }
                    }
                @endphp
                <article class="pmd-owner-team__person">
                    <span class="pmd-owner-team__avatar">{{ mb_strtoupper(mb_substr((string)($member->staff_name ?: 'T'),0,1)) }}</span>
                    <div>
                        <strong>{{ $member->staff_name ?: 'Staff #'.(int)$member->staff_id }}</strong>
                        <small>{{ $pmdOwnerWords['started'] }} {{ $member->check_in_time ? \Carbon\Carbon::parse($member->check_in_time)->format('H:i') : '—' }}</small>
                    </div>
                    <span class="pmd-owner-team__state{{ $pmdOnBreak ? ' is-break' : '' }}">{{ $pmdOnBreak ? $pmdOwnerWords['break'] : $pmdOwnerWords['now'] }}</span>
                </article>
            @empty
                <p class="pmd-owner-team__empty">{{ $pmdOwnerWords['empty_live'] }}</p>
            @endforelse
        </div>
    </section>

    <section class="pmd-owner-team__group" aria-labelledby="pmd-owner-extra-title">
        <h3 id="pmd-owner-extra-title">{{ $pmdOwnerWords['extras'] }}</h3>
        <p class="pmd-owner-team__explain">{{ $pmdOwnerWords['confirm'] }}</p>
        <div class="pmd-owner-team__list">
            @forelse($pmdOwnerExtras->take(24) as $extra)
                <article class="pmd-owner-team__extra{{ $extra->reviewed ? ' is-reviewed' : '' }}">
                    <span class="pmd-owner-team__stripe" aria-hidden="true"></span>
                    <div class="pmd-owner-team__extra-data">
                        <strong>{{ $extra->person_name }}</strong>
                        <small>{{ \Carbon\Carbon::parse($extra->check_in_time)->format('d M') }} · {{ $extra->start_label }} – {{ $extra->end_label ?: $pmdOwnerWords['now'] }}</small>
                        <span>{{ $pmdOwnerWords['extra'] }}</span>
                    </div>
                    <div class="pmd-owner-team__extra-action">
                        @if($extra->reviewed)
                            <span class="pmd-owner-team__state">{{ $pmdOwnerWords['reviewed'] }}</span>
                        @elseif($extra->is_open)
                            <span class="pmd-owner-team__state">{{ $pmdOwnerWords['now'] }}</span>
                        @else
                            <form method="post" action="{{ admin_url('shifts/reviewactual') }}" data-pmd-owner-async>
                                @csrf
                                <input type="hidden" name="attendance_id" value="{{ (int)$extra->actual_shift_id }}">
                                <button type="submit">{{ $pmdOwnerWords['review'] }}</button>
                            </form>
                        @endif
                    </div>
                </article>
            @empty
                <p class="pmd-owner-team__empty">{{ $pmdOwnerWords['empty_extra'] }}</p>
            @endforelse
        </div>
    </section>
</div>

{{-- PMD_OWNER_SHARED_STAFF_SHELL_V026_20261023
    Fallback when legitimate Owner/Manager has no linked operational Team person.
    Same Staff native WebView, colors, header, tab navigation and sections.
    Management capability is verified by Mywork::manage() and each write handler.
    No fabricated Team person, GPS clock or access to private chat groups. --}}
@php
    $pmdStaffLocale = in_array((string)($pmdManagerLocale ?? 'en'), ['en','de','tr'], true)
        ? (string)$pmdManagerLocale : 'en';
    $pmdManagerCopy = [
        'en' => [
            'team' => 'Team', 'shifts' => 'Shifts', 'requests' => 'Requests',
            'chat' => 'Chat', 'activity' => 'Activity', 'profile' => 'Profile',
            'language' => 'Choose language', 'signout' => 'Sign out',
            'members' => 'Working now', 'team_title' => 'Team overview',
            'team_caption' => 'Live attendance and real work',
            'schedule_title' => 'Team shifts',
            'schedule_caption' => 'Upcoming planned shifts',
            'edit_schedule' => 'Edit schedule',
            'next_two_weeks' => 'Next 14 days',
            'no_planned' => 'No planned shifts in the next 14 days.',
            'requests_title' => 'Team requests',
            'requests_caption' => 'Review time off, sickness and shift changes',
            'no_requests' => 'There are no pending requests.',
            'approve' => 'Approve', 'decline' => 'Decline',
            'chat_title' => 'Team chat', 'chat_caption' => 'Restaurant-wide conversation',
            'no_chat' => 'There are no Team messages yet.',
            'chat_private' => 'Private conversations remain visible only to their members.',
            'write_message' => 'Message your team', 'message_placeholder' => 'Write a Team message…',
            'send' => 'Send to Team', 'send_unavailable' => 'A linked staff login is required to send a team message.',
            'activity_title' => 'Recent activity', 'activity_caption' => 'Clock records and schedule changes',
            'no_activity' => 'No clock activity yet.', 'no_events' => 'No schedule edits yet.',
            'clocked_in' => 'Start', 'clocked_out' => 'Finish', 'working' => 'Working',
            'open_profile' => 'Open profile', 'account' => 'My account',
            'manager_role' => 'Management account', 'full_shifts' => 'Full shifts',
            'mywork' => 'My shifts', 'settings' => 'Restaurant settings',
            'close' => 'Close', 'refresh' => 'Refresh',
            'error' => 'Could not save. Please try again.',
            'no_personal' => 'Time clock and personal shifts appear after this account is linked to a Team member.',
        ],
        'de' => [
            'team' => 'Team', 'shifts' => 'Schichten', 'requests' => 'Anfragen',
            'chat' => 'Chat', 'activity' => 'Aktivitäten', 'profile' => 'Profil',
            'language' => 'Sprache wählen', 'signout' => 'Abmelden',
            'members' => 'Jetzt im Dienst', 'team_title' => 'Teamübersicht',
            'team_caption' => 'Live-Anwesenheit und tatsächliche Arbeit',
            'schedule_title' => 'Dienstplan',
            'schedule_caption' => 'Kommende geplante Schichten',
            'edit_schedule' => 'Dienstplan bearbeiten',
            'next_two_weeks' => 'Nächste 14 Tage',
            'no_planned' => 'Keine geplanten Schichten in den nächsten 14 Tagen.',
            'requests_title' => 'Team-Anfragen',
            'requests_caption' => 'Urlaub, Krankheit und Schichtwechsel bearbeiten',
            'no_requests' => 'Keine offenen Anfragen.',
            'approve' => 'Genehmigen', 'decline' => 'Ablehnen',
            'chat_title' => 'Team-Chat', 'chat_caption' => 'Nachrichten für das gesamte Restaurant',
            'no_chat' => 'Noch keine Team-Nachrichten.',
            'chat_private' => 'Private Unterhaltungen sehen nur ihre Mitglieder.',
            'write_message' => 'Nachricht ans Team', 'message_placeholder' => 'Nachricht schreiben…',
            'send' => 'An Team senden', 'send_unavailable' => 'Zum Senden ist ein verknüpftes Mitarbeiterkonto erforderlich.',
            'activity_title' => 'Letzte Aktivitäten', 'activity_caption' => 'Zeiterfassung und Dienstplanänderungen',
            'no_activity' => 'Noch keine erfassten Schichten.', 'no_events' => 'Noch keine Dienstplanänderungen.',
            'clocked_in' => 'Beginn', 'clocked_out' => 'Ende', 'working' => 'Läuft',
            'open_profile' => 'Profil öffnen', 'account' => 'Mein Konto',
            'manager_role' => 'Leitungskonto', 'full_shifts' => 'Dienstplan öffnen',
            'mywork' => 'Meine Schichten', 'settings' => 'Restaurant-Einstellungen',
            'close' => 'Schließen', 'refresh' => 'Aktualisieren',
            'error' => 'Speichern fehlgeschlagen. Bitte erneut versuchen.',
            'no_personal' => 'Zeiterfassung und eigene Schichten werden nach der Team-Zuordnung verfügbar.',
        ],
        'tr' => [
            'team' => 'Ekip', 'shifts' => 'Vardiyalar', 'requests' => 'Talepler',
            'chat' => 'Sohbet', 'activity' => 'Etkinlik', 'profile' => 'Profil',
            'language' => 'Dili seç', 'signout' => 'Çıkış yap',
            'members' => 'Şu an çalışanlar', 'team_title' => 'Ekip özeti',
            'team_caption' => 'Canlı katılım ve gerçek çalışma',
            'schedule_title' => 'Ekip vardiyaları',
            'schedule_caption' => 'Yaklaşan planlanmış vardiyalar',
            'edit_schedule' => 'Planı düzenle',
            'next_two_weeks' => 'Gelecek 14 gün',
            'no_planned' => 'Gelecek 14 günde planlanmış vardiya yok.',
            'requests_title' => 'Ekip talepleri',
            'requests_caption' => 'İzin, hastalık ve vardiya taleplerini yönet',
            'no_requests' => 'Bekleyen talep yok.',
            'approve' => 'Onayla', 'decline' => 'Reddet',
            'chat_title' => 'Ekip sohbeti', 'chat_caption' => 'Restoran ekibiyle iletişim',
            'no_chat' => 'Henüz ekip mesajı yok.',
            'chat_private' => 'Özel konuşmaları yalnızca üyeleri görebilir.',
            'write_message' => 'Ekibe mesaj gönder', 'message_placeholder' => 'Mesaj yaz…',
            'send' => 'Ekibe gönder', 'send_unavailable' => 'Mesaj için bağlı çalışan hesabı gerekir.',
            'activity_title' => 'Son etkinlikler', 'activity_caption' => 'Giriş-çıkış ve vardiya güncellemeleri',
            'no_activity' => 'Henüz mesai kaydı yok.', 'no_events' => 'Henüz vardiya değişikliği yok.',
            'clocked_in' => 'Giriş', 'clocked_out' => 'Çıkış', 'working' => 'Çalışıyor',
            'open_profile' => 'Profili aç', 'account' => 'Hesabım',
            'manager_role' => 'Yönetici hesabı', 'full_shifts' => 'Tüm vardiyalar',
            'mywork' => 'Vardiyalarım', 'settings' => 'Restoran ayarları',
            'close' => 'Kapat', 'refresh' => 'Yenile',
            'error' => 'Kaydedilemedi. Tekrar deneyin.',
            'no_personal' => 'Kişisel vardiyalar ve mesai girişi, çalışan kaydı bağlanınca görünür.',
        ],
    ][$pmdStaffLocale];
    $pmdManagerActive = collect($center['active'] ?? []);
    $pmdManagerRequests = collect($center['requests'] ?? []);
    $pmdManagerMessages = collect($center['messages'] ?? []);
    $pmdManagerRecent = collect($center['recent'] ?? []);
    $pmdManagerEvents = collect($center['events'] ?? []);
    $pmdManagerUpcoming = collect($center['upcoming'] ?? []);
    $pmdManagerGroup = $center['team_group'] ?? null;
    $managerCenter = $center;
    $managerExtras = $extras;
@endphp
<!doctype html>
<html lang="{{ $pmdStaffLocale }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
    <meta name="robots" content="noindex,nofollow">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>{{ $pmdManagerCopy['team_title'] }} · PayMyDine Staff</title>
    <link rel="shortcut icon" href="/app/admin/assets/images/pmd-brand-mark.svg?v=pmd-staff-v5">
    <link rel="stylesheet" href="/app/admin/assets/css/pmd-staff-portal-v1.css?v=5">
    <link rel="stylesheet" href="/app/admin/assets/css/pmd-staff-portal-v2.css?v=1">
    <link rel="stylesheet" href="/app/admin/assets/css/pmd-staff-portal-v3.css?v=1">
    <link rel="stylesheet" href="/app/admin/assets/css/pmd-staff-portal-v4.css?v=25">
    <link rel="stylesheet" href="/app/admin/assets/css/pmd-staff-manager-v2.css?v=26">
    <link rel="stylesheet" href="/app/admin/assets/css/pmd-staff-owner-bottom-nav-v027.css?v=27">
    <script defer src="/app/admin/assets/js/pmd-staff-manager-v2.js?v=26"></script>
<script defer src="/app/admin/assets/js/pmd-no-hover-titles-global-r4.js?v=20261026-r4" data-pmd-no-hover-titles-r4></script>
</head>
<body class="pmd-staff-portal-page pmd-owner-fallback">
<div class="pmd-staff-app" data-pmd-owner-app data-pmd-mobile-active="team" data-pmd-default-screen="team" data-pmd-staff-locale="{{ $pmdStaffLocale }}">
    <header class="pmd-staff-topbar">
        <a href="{{ admin_url('mywork/manage') }}" class="pmd-staff-brand" aria-label="PayMyDine Staff">
            <img src="https://mimoza.paymydine.com/brand/paymydine-logo.svg" alt="PayMyDine">
        </a>
        <div class="pmd-staff-topbar__actions">
            <div class="pmd-staff-language-picker" data-pmd-owner-language>
                <button class="pmd-staff-language-trigger" type="button" data-pmd-owner-language-toggle
                    aria-label="{{ $pmdManagerCopy['language'] }}" aria-haspopup="true" aria-expanded="false">
                    <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"></circle><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"></path></svg>
                    <span>{{ strtoupper($pmdStaffLocale) }}</span>
                </button>
                <div class="pmd-staff-language-menu" data-pmd-owner-language-menu hidden>
                    @foreach(['de' => 'Deutsch', 'en' => 'English', 'tr' => 'Türkçe'] as $langCode => $langLabel)
                    <form method="post" action="{{ admin_url('mywork/managerlocale') }}">
                        @csrf
                        <input type="hidden" name="locale" value="{{ $langCode }}">
                        <input type="hidden" name="return_screen" value="team" data-pmd-owner-return-screen>
                        <button type="submit" @if($pmdStaffLocale === $langCode) aria-current="true" @endif>{{ $langLabel }}</button>
                    </form>
                    @endforeach
                </div>
            </div>
            <button class="pmd-staff-top-profile" type="button" data-pmd-owner-profile-open
                aria-label="{{ $pmdManagerCopy['open_profile'] }}" aria-haspopup="dialog">
                <span class="pmd-staff-top-profile__avatar">{{ $managerInitial }}</span>
            </button>
        </div>
    </header>

    @if(session('error'))<p class="pmd-owner-alert" role="alert">{{ session('error') }}</p>@endif
    @if(session('success'))<p class="pmd-owner-alert is-success" role="status">{{ session('success') }}</p>@endif

    <nav class="pmd-staff-mobile-nav" aria-label="Staff sections">
        <button type="button" class="is-active" data-pmd-mobile-target="team" aria-current="page">
            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3"></circle><path d="M3 20a6 6 0 0 1 12 0M16 5a3 3 0 0 1 0 6M17 14a5 5 0 0 1 4 5"></path></svg><span>{{ $pmdManagerCopy['team'] }}</span>
        </button>
        <button type="button" data-pmd-mobile-target="schedule">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v15H4zM8 3v4M16 3v4M4 10h16"></path></svg><span>{{ $pmdManagerCopy['shifts'] }}</span>
        </button>
        <button type="button" data-pmd-mobile-target="chat">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 15a4 4 0 0 1-4 4H8l-5 3v-15a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"></path></svg><span>{{ $pmdManagerCopy['chat'] }}</span>
        </button>
        <button type="button" data-pmd-mobile-target="requests">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h14v16H5zM8 8h8M8 12h8M8 16h5"></path></svg><span>{{ $pmdManagerCopy['requests'] }}</span>
            @if($pmdManagerRequests->count())<b>{{ $pmdManagerRequests->count() }}</b>@endif
        </button>
        <button type="button" data-pmd-mobile-target="activity">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 19V5h14M8 15l3-4 3 2 5-7"></path></svg><span>{{ $pmdManagerCopy['activity'] }}</span>
        </button>
    </nav>

    <div class="pmd-staff-layout">
        <aside class="pmd-staff-tools">
            <section id="team" class="pmd-staff-tool-card" data-pmd-mobile-screen="team">
                <header class="pmd-staff-panel-head">
                    <div class="pmd-staff-section-title">
                        <span class="pmd-staff-section-icon is-green">
                            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3"></circle><path d="M3 20a6 6 0 0 1 12 0M16 5a3 3 0 0 1 0 6M17 14a5 5 0 0 1 4 5"></path></svg>
                        </span>
                        <div><small>{{ $pmdManagerCopy['team_caption'] }}</small><h2>{{ $pmdManagerCopy['team_title'] }}</h2></div>
                    </div>
                    <button type="button" class="pmd-owner-refresh" data-pmd-owner-refresh aria-label="{{ $pmdManagerCopy['refresh'] }}">
                        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11a8 8 0 1 0-2 6M20 5v6h-6"></path></svg>
                    </button>
                </header>
                @include('pmd-staff-portal._manager_workforce_v026')
                <div class="pmd-owner-action-links">
                    <a href="{{ admin_url('shifts') }}">{{ $pmdManagerCopy['full_shifts'] }}</a>
                    <a href="{{ admin_url('settings/team') }}">{{ $pmdManagerCopy['settings'] }}</a>
                </div>
                @unless($hasPersonalPortal)
                    <p class="pmd-owner-team__empty" style="padding:4px 16px 17px">{{ $pmdManagerCopy['no_personal'] }}</p>
                @endunless
            </section>

            <section id="schedule" class="pmd-staff-tool-card" data-pmd-mobile-screen="schedule">
                <header class="pmd-staff-panel-head">
                    <div class="pmd-staff-section-title">
                        <span class="pmd-staff-section-icon is-blue">
                            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v15H4zM8 3v4M16 3v4M4 10h16"></path></svg>
                        </span>
                        <div><small>{{ $pmdManagerCopy['schedule_caption'] }}</small><h2>{{ $pmdManagerCopy['schedule_title'] }}</h2></div>
                    </div>
                </header>
                <div class="pmd-owner-action-links"><a href="{{ admin_url('shifts') }}">{{ $pmdManagerCopy['edit_schedule'] }}</a></div>
                <div class="pmd-owner-rows">
                    <h3>{{ $pmdManagerCopy['next_two_weeks'] }}</h3>
                    @forelse($pmdManagerUpcoming as $shift)
                    <article>
                        <strong>{{ $shift->label ?: $pmdManagerCopy['shifts'] }}</strong>
                        <small>{{ \Carbon\Carbon::parse($shift->shift_date)->format('D, d M') }} · {{ $shift->starts_at ? substr((string)$shift->starts_at,0,5) : '—' }} – {{ $shift->ends_at ? substr((string)$shift->ends_at,0,5) : '—' }}</small>
                    </article>
                    @empty
                    <p>{{ $pmdManagerCopy['no_planned'] }}</p>
                    @endforelse
                </div>
            </section>

            <section id="requests" class="pmd-staff-tool-card" data-pmd-mobile-screen="requests">
                <header class="pmd-staff-panel-head">
                    <div class="pmd-staff-section-title">
                        <span class="pmd-staff-section-icon">
                            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h14v16H5zM8 8h8M8 12h8M8 16h5"></path></svg>
                        </span>
                        <div><small>{{ $pmdManagerCopy['requests_caption'] }}</small><h2>{{ $pmdManagerCopy['requests_title'] }}</h2></div>
                    </div>
                    @if($pmdManagerRequests->count())<b class="pmd-staff-count">{{ $pmdManagerRequests->count() }}</b>@endif
                </header>
                <div class="pmd-owner-rows">
                    @forelse($pmdManagerRequests as $requestRow)
                    <article>
                        <strong>{{ $requestRow->person_name ?: 'Team member' }}</strong>
                        <small>{{ ucfirst(str_replace('_',' ',(string)$requestRow->request_type)) }} · {{ $requestRow->created_at ? \Carbon\Carbon::parse($requestRow->created_at)->format('d M H:i') : '' }}</small>
                        @if($requestRow->date_from)<small>{{ $requestRow->date_from }}{{ !empty($requestRow->date_to) && $requestRow->date_from !== $requestRow->date_to ? ' – '.$requestRow->date_to : '' }}</small>@endif
                        @if($requestRow->message)<p>{{ $requestRow->message }}</p>@endif
                        <div class="pmd-owner-rows__reply">
                            <form method="post" action="{{ admin_url('shifts/handlerequest') }}" data-pmd-owner-async>
                                @csrf
                                <input type="hidden" name="id" value="{{ (int)$requestRow->id }}">
                                <input type="hidden" name="decision" value="approved">
                                <button type="submit">{{ $pmdManagerCopy['approve'] }}</button>
                            </form>
                            <form method="post" action="{{ admin_url('shifts/handlerequest') }}" data-pmd-owner-async>
                                @csrf
                                <input type="hidden" name="id" value="{{ (int)$requestRow->id }}">
                                <input type="hidden" name="decision" value="declined">
                                <button type="submit" class="is-decline">{{ $pmdManagerCopy['decline'] }}</button>
                            </form>
                        </div>
                    </article>
                    @empty
                    <p>{{ $pmdManagerCopy['no_requests'] }}</p>
                    @endforelse
                </div>
            </section>

            <section id="chat" class="pmd-staff-tool-card" data-pmd-mobile-screen="chat">
                <header class="pmd-staff-panel-head">
                    <div class="pmd-staff-section-title">
                        <span class="pmd-staff-section-icon is-green">
                            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 15a4 4 0 0 1-4 4H8l-5 3v-15a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"></path></svg>
                        </span>
                        <div><small>{{ $pmdManagerCopy['chat_caption'] }}</small><h2>{{ $pmdManagerCopy['chat_title'] }}</h2></div>
                    </div>
                </header>
                <p class="pmd-owner-team__explain" style="padding:13px 16px 0">{{ $pmdManagerCopy['chat_private'] }}</p>
                <div class="pmd-owner-rows">
                    @forelse($pmdManagerMessages as $message)
                    <article>
                        <strong>{{ $message->staff_name ?: 'Team member' }}</strong>
                        <p>{{ $message->message }}</p>
                        <small>{{ $message->created_at ? \Carbon\Carbon::parse($message->created_at)->format('d M H:i') : '' }}</small>
                    </article>
                    @empty
                    <p>{{ $pmdManagerCopy['no_chat'] }}</p>
                    @endforelse
                </div>
                @if($pmdManagerGroup && !empty($center['can_send']))
                <form method="post" class="pmd-owner-chat-form" action="{{ admin_url('shifts/sendteammessage') }}" data-pmd-owner-async>
                    @csrf
                    <input type="hidden" name="group_id" value="{{ (int)$pmdManagerGroup->id }}">
                    <label for="pmd-owner-chat-text">{{ $pmdManagerCopy['write_message'] }}</label>
                    <textarea id="pmd-owner-chat-text" name="message" rows="3" minlength="1" maxlength="1500" placeholder="{{ $pmdManagerCopy['message_placeholder'] }}" required></textarea>
                    <button type="submit">{{ $pmdManagerCopy['send'] }}</button>
                </form>
                @else
                <p class="pmd-owner-team__empty" style="padding:12px 16px">{{ $pmdManagerCopy['send_unavailable'] }}</p>
                @endif
            </section>

            <section id="activity" class="pmd-staff-tool-card" data-pmd-mobile-screen="activity">
                <header class="pmd-staff-panel-head">
                    <div class="pmd-staff-section-title">
                        <span class="pmd-staff-section-icon">
                            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 19V5h14M8 15l3-4 3 2 5-7"></path></svg>
                        </span>
                        <div><small>{{ $pmdManagerCopy['activity_caption'] }}</small><h2>{{ $pmdManagerCopy['activity_title'] }}</h2></div>
                    </div>
                </header>
                <div class="pmd-owner-rows">
                    @forelse($pmdManagerRecent as $activity)
                    <article>
                        <strong>{{ $activity->staff_name ?: 'Staff #'.(int)$activity->staff_id }}</strong>
                        <small>{{ $pmdManagerCopy['clocked_in'] }}: {{ $activity->check_in_time ? \Carbon\Carbon::parse($activity->check_in_time)->format('d M H:i') : '—' }}
                            · {{ $pmdManagerCopy['clocked_out'] }}: {{ $activity->check_out_time ? \Carbon\Carbon::parse($activity->check_out_time)->format('d M H:i') : $pmdManagerCopy['working'] }}</small>
                    </article>
                    @empty
                    <p>{{ $pmdManagerCopy['no_activity'] }}</p>
                    @endforelse
                </div>
                <div class="pmd-owner-rows">
                    @forelse($pmdManagerEvents as $event)
                    <article>
                        <strong>{{ ucfirst(str_replace('_',' ',(string)$event->event_type)) }}</strong>
                        <small>{{ $event->target_name_snapshot ?: $event->actor_name_snapshot ?: 'Team' }} · {{ $event->created_at ? \Carbon\Carbon::parse($event->created_at)->format('d M H:i') : '' }}</small>
                    </article>
                    @empty
                    <p>{{ $pmdManagerCopy['no_events'] }}</p>
                    @endforelse
                </div>
            </section>
        </aside>
    </div>

    <div class="pmd-owner-profile-dialog" data-pmd-owner-profile-dialog role="presentation" hidden>
        <section class="pmd-owner-profile-dialog__body" role="dialog" aria-modal="true" aria-labelledby="pmd-owner-profile-title">
            <header class="pmd-owner-profile-dialog__head">
                <h2 id="pmd-owner-profile-title">{{ $pmdManagerCopy['account'] }}</h2>
                <button type="button" data-pmd-owner-profile-close aria-label="{{ $pmdManagerCopy['close'] }}">×</button>
            </header>
            <p><strong>{{ $managerName }}</strong> · {{ $pmdManagerCopy['manager_role'] }}</p>
            <div class="pmd-owner-action-links">
                <a href="{{ admin_url('shifts') }}">{{ $pmdManagerCopy['full_shifts'] }}</a>
                <a href="{{ admin_url('settings/restaurant') }}">{{ $pmdManagerCopy['settings'] }}</a>
                @if($hasPersonalPortal)<a href="{{ admin_url('mywork/personal') }}#schedule">{{ $pmdManagerCopy['mywork'] }}</a>@endif
            </div>
            <form method="post" action="{{ admin_url('mywork/stafflogout') }}">
                @csrf
                <button class="pmd-owner-signout" type="submit">{{ $pmdManagerCopy['signout'] }}</button>
            </form>
        </section>
    </div>
</div>
</body>
</html>

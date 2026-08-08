<link rel="stylesheet" href="/app/admin/assets/css/pmd-settings-center-v1.css?v=20260808_1">

<div id="pmd-settings-center" class="pmd-settings-center" data-pmd-settings-center>
    <div class="pmd-settings-shell">
        <section class="pmd-settings-hero" aria-labelledby="pmd-settings-title">
            <div class="pmd-settings-hero__copy">
                <span class="pmd-settings-kicker">PAYMYDINE CONTROL CENTER</span>
                <h1 id="pmd-settings-title">Settings</h1>
                <p>Everything that shapes your restaurant, guest experience, team, devices and money — organized around how you actually work.</p>
            </div>

            <div class="pmd-settings-search-wrap">
                <svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"></circle><path d="m20 20-4-4"></path></svg>
                <input
                    type="search"
                    class="pmd-settings-search"
                    data-pmd-settings-search
                    placeholder="Search settings, devices, payments, roles..."
                    autocomplete="off"
                    aria-label="Search settings"
                >
                <kbd>⌘ K</kbd>
            </div>
        </section>

        <section class="pmd-settings-health" aria-label="Setup health">
            <div class="pmd-settings-health__heading">
                <div>
                    <span class="pmd-settings-section-kicker">SETUP HEALTH</span>
                    <h2>Your restaurant at a glance</h2>
                </div>
                <span class="pmd-settings-health__hint">Quick checks only — nothing is changed here</span>
            </div>

            <div class="pmd-settings-health__grid">
                @foreach(($pmdSettingsHealth ?? []) as $health)
                    <a href="{{ $health['href'] }}" class="pmd-health-card {{ $health['ready'] ? 'is-ready' : 'needs-attention' }}">
                        <span class="pmd-health-card__state" aria-hidden="true">
                            @if($health['ready'])
                                <svg viewBox="0 0 24 24"><path d="m5 12 4 4 10-10"></path></svg>
                            @else
                                <svg viewBox="0 0 24 24"><path d="M12 8v5"></path><circle cx="12" cy="17" r="1"></circle><circle cx="12" cy="12" r="9"></circle></svg>
                            @endif
                        </span>
                        <span>
                            <strong>{{ $health['label'] }}</strong>
                            <small>{{ $health['ready'] ? 'Configured' : 'Needs attention' }}</small>
                        </span>
                        <svg class="pmd-health-card__arrow" aria-hidden="true" viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"></path></svg>
                    </a>
                @endforeach
            </div>
        </section>

        <div class="pmd-settings-layout">
            <aside class="pmd-settings-nav" aria-label="Settings categories">
                <div class="pmd-settings-nav__inner">
                    <span class="pmd-settings-nav__label">SETTINGS</span>
                    @foreach(($pmdSettingsGroups ?? []) as $group)
                        <a href="#pmd-settings-{{ $group['id'] }}" data-pmd-settings-nav="{{ $group['id'] }}">
                            <span class="pmd-settings-nav__dot"></span>
                            <span>{{ $group['title'] }}</span>
                        </a>
                    @endforeach
                </div>
            </aside>

            <main class="pmd-settings-content">
                <section id="pmd-settings-hours" class="pmd-settings-hours pmd-settings-module" data-pmd-searchable="opening hours schedule restaurant reservations">
                    <div class="pmd-settings-module__head">
                        <div>
                            <span class="pmd-settings-section-kicker">RESTAURANT SCHEDULE</span>
                            <h2>Opening hours</h2>
                            <p>This is the current reservation/service schedule. PayMyDine reads it directly without creating or changing working-hour records.</p>
                        </div>
                        <a class="pmd-settings-action" href="{{ admin_url('locations/edit/'.($pmdSettingsLocationId ?? 1)) }}">
                            Edit hours
                            <svg aria-hidden="true" viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"></path></svg>
                        </a>
                    </div>

                    <div class="pmd-hours-grid">
                        @foreach(($pmdSettingsOpeningHours ?? []) as $day)
                            <div class="pmd-hours-day {{ !empty($day['enabled']) ? 'is-open' : 'is-closed' }}">
                                <span class="pmd-hours-day__name">{{ $day['label'] }}</span>
                                @if(!empty($day['enabled']))
                                    <strong>{{ $day['opening_time'] ?: '—' }} <span>–</span> {{ $day['closing_time'] ?: '—' }}</strong>
                                    <small>Open</small>
                                @else
                                    <strong>Closed</strong>
                                    <small>Not serving</small>
                                @endif
                            </div>
                        @endforeach
                    </div>
                </section>

                @foreach(($pmdSettingsGroups ?? []) as $group)
                    <section
                        id="pmd-settings-{{ $group['id'] }}"
                        class="pmd-settings-group"
                        data-pmd-settings-section="{{ $group['id'] }}"
                        data-pmd-searchable="{{ strtolower($group['title'].' '.$group['description'].' '.collect($group['items'])->pluck('title')->implode(' ')) }}"
                    >
                        <header class="pmd-settings-group__head">
                            <div>
                                <span class="pmd-settings-section-kicker">{{ $group['eyebrow'] }}</span>
                                <h2>{{ $group['title'] }}</h2>
                                <p>{{ $group['description'] }}</p>
                            </div>
                            <span class="pmd-settings-group__count">{{ count($group['items']) }} {{ count($group['items']) === 1 ? 'SETTING' : 'SETTINGS' }}</span>
                        </header>

                        <div class="pmd-settings-card-grid">
                            @foreach($group['items'] as $item)
                                <a
                                    class="pmd-settings-card"
                                    href="{{ $item['href'] }}"
                                    data-pmd-settings-card
                                    data-pmd-searchable="{{ strtolower($item['title'].' '.$item['description'].' '.$item['badge']) }}"
                                >
                                    <span class="pmd-settings-card__icon" aria-hidden="true" data-icon="{{ $item['icon'] }}">
                                        @switch($item['icon'])
                                            @case('clock') <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"></circle><path d="M12 7v5l3 2"></path></svg> @break
                                            @case('globe') <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"></circle><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"></path></svg> @break
                                            @case('calendar') <svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="2"></rect><path d="M8 3v4M16 3v4M3 10h18"></path></svg> @break
                                            @case('users') <svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3"></circle><path d="M3 20c0-4 2-7 6-7s6 3 6 7M16 5a3 3 0 0 1 0 6M17 14c3 .5 4 3 4 6"></path></svg> @break
                                            @case('shield') <svg viewBox="0 0 24 24"><path d="M12 3 5 6v5c0 5 3 8 7 10 4-2 7-5 7-10V6l-7-3Z"></path><path d="m9 12 2 2 4-4"></path></svg> @break
                                            @case('monitor') @case('terminal') <svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="14" rx="2"></rect><path d="M8 21h8M12 18v3"></path></svg> @break
                                            @case('cash') <svg viewBox="0 0 24 24"><rect x="3" y="6" width="18" height="12" rx="2"></rect><path d="M7 12h10M8 9h1M15 15h1"></path></svg> @break
                                            @case('card') <svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"></rect><path d="M3 10h18M7 15h4"></path></svg> @break
                                            @case('mail') <svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"></rect><path d="m4 7 8 6 8-6"></path></svg> @break
                                            @case('star') <svg viewBox="0 0 24 24"><path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z"></path></svg> @break
                                            @case('image') @case('palette') <svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2"></rect><circle cx="9" cy="9" r="2"></circle><path d="m4 17 5-5 4 4 2-2 5 4"></path></svg> @break
                                            @default <svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="4"></rect><path d="M8 12h8M12 8v8"></path></svg>
                                        @endswitch
                                    </span>

                                    <span class="pmd-settings-card__body">
                                        <span class="pmd-settings-card__title-row">
                                            <strong>{{ $item['title'] }}</strong>
                                            <span class="pmd-settings-card__badge">{{ $item['badge'] }}</span>
                                        </span>
                                        <span class="pmd-settings-card__description">{{ $item['description'] }}</span>
                                    </span>

                                    <svg class="pmd-settings-card__arrow" aria-hidden="true" viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"></path></svg>
                                </a>
                            @endforeach
                        </div>
                    </section>
                @endforeach

                <div class="pmd-settings-empty" data-pmd-settings-empty hidden>
                    <span>No matching settings</span>
                    <small>Try another search term.</small>
                </div>
            </main>
        </div>
    </div>
</div>

<script defer src="/app/admin/assets/js/pmd-settings-center-v1.js?v=20260808_1"></script>

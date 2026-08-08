<style id="pmd-settings-critical-v6">
html,
body,
.page,
.page-wrapper,
.page-content,
.content-wrapper,
.container-fluid,
#pmd-settings-center {
    background: #f8fbfd !important;
}

/* This stylesheet exists only on /admin/pmdsettings, so hiding the legacy
   navbar here is route-scoped and prevents the old header flashing first. */
.navbar-top,
.navbar-fixed-top {
    display: none !important;
    visibility: hidden !important;
    opacity: 0 !important;
    pointer-events: none !important;
    height: 0 !important;
    min-height: 0 !important;
    max-height: 0 !important;
    overflow: hidden !important;
}

/* Keep final layout space, but do not paint intermediate/legacy states. */
#pmd-settings-center {
    visibility: hidden !important;
}

html.pmd-settings-v6-ready #pmd-settings-center {
    visibility: visible !important;
}
</style>

<script id="pmd-settings-center-v6-boot">
document.documentElement.classList.add('pmd-settings-center-v2', 'pmd-settings-v6-booting');
window.PMDSettingsRevealFallback = window.setTimeout(function () {
    document.documentElement.classList.add('pmd-settings-v6-ready');
}, 2500);
</script>

<link rel="stylesheet" href="/app/admin/assets/css/pmd-settings-center-v1.css?v=20260808_6">

@php
    $pmdAccentPalette = [
        ['name' => 'emerald', 'color' => '#047857', 'soft' => '#e7f7f0'],
        ['name' => 'blue',    'color' => '#2563eb', 'soft' => '#edf3ff'],
        ['name' => 'violet',  'color' => '#7c3aed', 'soft' => '#f3edff'],
        ['name' => 'rose',    'color' => '#e11d48', 'soft' => '#fff0f3'],
        ['name' => 'orange',  'color' => '#ea580c', 'soft' => '#fff2e9'],
        ['name' => 'cyan',    'color' => '#0891b2', 'soft' => '#e9f9fc'],
        ['name' => 'indigo',  'color' => '#4f46e5', 'soft' => '#efefff'],
        ['name' => 'slate',   'color' => '#475569', 'soft' => '#f0f3f6'],
    ];
@endphp

<div id="pmd-settings-center" class="pmd-settings-center" data-pmd-settings-center>
    <div class="pmd-settings-shell">
        <section class="pmd-settings-toolbar" aria-label="Settings tools">
            <div class="pmd-settings-toolbar__copy">
                <strong>Restaurant settings</strong>
                <span>Everything is grouped by the job you are trying to do.</span>
            </div>

            <div class="pmd-settings-search-wrap">
                <svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"></circle><path d="m20 20-4-4"></path></svg>
                <input
                    type="search"
                    class="pmd-settings-search"
                    data-pmd-settings-search
                    placeholder="Search settings..."
                    autocomplete="off"
                    aria-label="Search settings"
                >
                <kbd>⌘ K</kbd>
            </div>
        </section>

        <main class="pmd-settings-content">
            <section id="pmd-settings-hours" class="pmd-settings-hours pmd-settings-module" data-pmd-searchable="opening hours schedule restaurant reservations">
                <div class="pmd-settings-module__head">
                    <div>
                        <span class="pmd-settings-section-kicker">RESTAURANT SCHEDULE</span>
                        <h2>Opening hours</h2>
                        <p>The weekly service schedule used by reservations and restaurant availability.</p>
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
                            @php
                                $accent = $pmdAccentPalette[abs(crc32($group['id'].'|'.$item['title'])) % count($pmdAccentPalette)];
                            @endphp
                            <a
                                class="pmd-settings-card"
                                href="{{ $item['href'] }}"
                                data-pmd-settings-card
                                data-accent="{{ $accent['name'] }}"
                                data-pmd-searchable="{{ strtolower($item['title'].' '.$item['description'].' '.$item['badge']) }}"
                            >
                                <span
                                    class="pmd-settings-card__icon"
                                    aria-hidden="true"
                                    style="--accent: {{ $accent['color'] }}; --accent-soft: {{ $accent['soft'] }};"
                                >
                                    @switch($item['icon'])
                                        @case('clock') <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"></circle><path d="M12 7v5l3 2"></path></svg> @break
                                        @case('globe') <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"></circle><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"></path></svg> @break
                                        @case('calendar') <svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="2"></rect><path d="M8 3v4M16 3v4M3 10h18"></path></svg> @break
                                        @case('users') @case('user') <svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3"></circle><path d="M3 20c0-4 2-7 6-7s6 3 6 7M16 5a3 3 0 0 1 0 6M17 14c3 .5 4 3 4 6"></path></svg> @break
                                        @case('shield') <svg viewBox="0 0 24 24"><path d="M12 3 5 6v5c0 5 3 8 7 10 4-2 7-5 7-10V6l-7-3Z"></path><path d="m9 12 2 2 4-4"></path></svg> @break
                                        @case('monitor') @case('terminal') <svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="14" rx="2"></rect><path d="M8 21h8M12 18v3"></path></svg> @break
                                        @case('cash') <svg viewBox="0 0 24 24"><rect x="3" y="6" width="18" height="12" rx="2"></rect><path d="M7 12h10M8 9h1M15 15h1"></path></svg> @break
                                        @case('card') <svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"></rect><path d="M3 10h18M7 15h4"></path></svg> @break
                                        @case('mail') <svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"></rect><path d="m4 7 8 6 8-6"></path></svg> @break
                                        @case('star') <svg viewBox="0 0 24 24"><path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z"></path></svg> @break
                                        @case('image') @case('palette') <svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2"></rect><circle cx="9" cy="9" r="2"></circle><path d="m4 17 5-5 4 4 2-2 5 4"></path></svg> @break
                                        @case('fingerprint') <svg viewBox="0 0 24 24"><path d="M8 8a6 6 0 0 1 10 4c0 4-1 7-3 9M6 12a6 6 0 0 1 10-4M6 16c1-2 1-4 1-5M10 21c2-3 3-6 3-9a2 2 0 0 0-4 0c0 4-1 6-2 8"></path></svg> @break
                                        @case('percent') <svg viewBox="0 0 24 24"><path d="m6 18 12-12"></path><circle cx="7" cy="7" r="2"></circle><circle cx="17" cy="17" r="2"></circle></svg> @break
                                        @case('receipt') @case('invoice') <svg viewBox="0 0 24 24"><path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z"></path><path d="M9 8h6M9 12h6"></path></svg> @break
                                        @case('activity') <svg viewBox="0 0 24 24"><path d="M3 12h4l2-6 4 12 2-6h6"></path></svg> @break
                                        @case('key') <svg viewBox="0 0 24 24"><circle cx="8" cy="15" r="4"></circle><path d="m11 12 8-8M16 7l2 2M14 9l2 2"></path></svg> @break
                                        @case('settings') <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"></circle><path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.4-2.4 1a8 8 0 0 0-1.7-1L14.5 3h-5l-.4 3.1a8 8 0 0 0-1.7 1l-2.4-1-2 3.4L5.1 11a7 7 0 0 0 0 2L3 14.5l2 3.4 2.4-1a8 8 0 0 0 1.7 1l.4 3.1h5l.4-3.1a8 8 0 0 0 1.7-1l2.4 1 2-3.4-2.1-1.5a7 7 0 0 0 .1-1Z"></path></svg> @break
                                        @case('archive') <svg viewBox="0 0 24 24"><path d="M4 7h16v13H4zM3 4h18v4H3zM9 12h6"></path></svg> @break
                                        @case('menu') <svg viewBox="0 0 24 24"><path d="M5 6h14M5 12h14M5 18h14"></path></svg> @break
                                        @case('table') <svg viewBox="0 0 24 24"><path d="M4 8h16v8H4zM7 16v5M17 16v5"></path></svg> @break
                                        @case('booking') <svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="2"></rect><path d="M8 3v4M16 3v4M7 13l3 3 7-7"></path></svg> @break
                                        @case('building') <svg viewBox="0 0 24 24"><path d="M5 21V5l7-2 7 2v16M9 8h1M14 8h1M9 12h1M14 12h1M9 16h1M14 16h1M3 21h18"></path></svg> @break
                                        @case('restaurant') <svg viewBox="0 0 24 24"><path d="M5 3v8M8 3v8M5 7h3M6.5 11v10M16 3c-2 3-2 7 1 9v9M17 3v9"></path></svg> @break
                                        @default <svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="3"></rect><path d="M8 12h8M12 8v8"></path></svg>
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

<script defer src="/app/admin/assets/js/pmd-settings-center-v1.js?v=20260808_6"></script>
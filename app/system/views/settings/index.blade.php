@php
    $pmdSettingGroups = [
        'restaurant' => [
            'title' => 'Restaurant Setup',
            'description' => 'Core restaurant identity, localization, media, and brand information.',
            'match' => ['general', 'site', 'local', 'language', 'currency', 'media', 'about', 'location'],
        ],
        'operations' => [
            'title' => 'POS Operations',
            'description' => 'Tools that keep floor service, tables, sales, terminals, and device sync running.',
            'match' => ['sales', 'table', 'cash', 'drawer', 'terminal', 'device', 'sync', 'pos', 'kds', 'kitchen'],
        ],
        'payments' => [
            'title' => 'Payments & Fiscal',
            'description' => 'Payment methods, tax, invoicing, and fiscal compliance controls.',
            'match' => ['vat', 'tax', 'fiskaly', 'tse', 'invoice', 'payment', 'payments', 'fiscal'],
        ],
        'team' => [
            'title' => 'Team & Security',
            'description' => 'Staff access, customer registration, identity devices, and communications.',
            'match' => ['staff', 'user', 'customer', 'registration', 'biometric', 'mail', 'security', 'permission'],
        ],
        'system' => [
            'title' => 'System',
            'description' => 'Panel settings, logs, activity history, maintenance, and platform controls.',
            'match' => ['panel', 'activity', 'activities', 'log', 'logs', 'maintenance', 'system', 'server', 'advanced'],
        ],
        'other' => [
            'title' => 'Other Settings',
            'description' => 'Additional installed settings and extension configuration.',
            'match' => [],
        ],
    ];

    $pmdPriorityKeywords = ['fiskaly', 'tse', 'vat', 'tax', 'payment', 'terminal', 'cash', 'drawer', 'staff', 'maintenance'];
    $pmdRequiredKeywords = ['fiskaly', 'tse', 'vat', 'tax'];
    $pmdSystemKeywords = ['payment', 'staff', 'panel', 'system', 'log', 'maintenance'];

    $pmdContainsAny = function (string $haystack, array $needles): bool {
        foreach ($needles as $needle) {
            if ($needle !== '' && str_contains($haystack, $needle)) {
                return true;
            }
        }

        return false;
    };

    $pmdGroupedSettings = array_fill_keys(array_keys($pmdSettingGroups), []);

    foreach ($settings as $item => $categories) {
        foreach ($categories as $category) {
            $label = lang($category->label);
            $description = $category->description ? lang($category->description) : '';
            $searchText = strtolower($category->code.' '.$item.' '.$label.' '.$description);
            $groupKey = 'other';

            foreach ($pmdSettingGroups as $key => $group) {
                if ($key !== 'other' && $pmdContainsAny($searchText, $group['match'])) {
                    $groupKey = $key;
                    break;
                }
            }

            $badge = 'Optional';
            if ($pmdContainsAny($searchText, $pmdRequiredKeywords)) {
                $badge = 'Required';
            }
            elseif ($pmdContainsAny($searchText, $pmdSystemKeywords)) {
                $badge = 'System';
            }

            $pmdGroupedSettings[$groupKey][] = [
                'owner' => $item,
                'category' => $category,
                'label' => $label,
                'description' => $description,
                'searchText' => trim($searchText),
                'badge' => $badge,
                'priority' => $pmdContainsAny($searchText, $pmdPriorityKeywords),
                'hasErrors' => $item == 'core' && count(array_get($settingItemErrors, $category->code, [])),
                'isAboutCard' => $category->code === 'about',
            ];
        }
    }
@endphp

<div class="container-fluid pt-4 pmd-settings-page" data-pmd-settings-page>
    <div class="pmd-settings-intro" aria-label="Settings overview">
        Manage and customize your restaurant system.
    </div>
<div class="pmd-settings-empty d-none" data-pmd-settings-empty>
        <i class="fa fa-search" aria-hidden="true"></i>
        <strong>No settings found</strong>
        <span>Try a different restaurant, POS, payment, or system keyword.</span>
    </div>

    @foreach ($pmdSettingGroups as $groupKey => $group)
        @continue(!count($pmdGroupedSettings[$groupKey]))
        <section class="pmd-settings-section" data-pmd-settings-section>
            <div class="pmd-settings-section__header">
                <div>
                    <h2>{{ $group['title'] }}</h2>
                    <p>{{ $group['description'] }}</p>
                </div>
                <span>{{ count($pmdGroupedSettings[$groupKey]) }} settings</span>
            </div>

            <div class="pmd-settings-grid">
                @foreach ($pmdGroupedSettings[$groupKey] as $setting)
                    @php
                        $category = $setting['category'];
                    @endphp
                    <a
                        class="pmd-settings-card settings-card-link {{ $setting['isAboutCard'] ? 'settings-card-link--about' : '' }} {{ $setting['priority'] ? 'pmd-settings-card--priority' : '' }}"
                        href="{{ $category->url }}"
                        role="button"
                        data-pmd-settings-card
                        data-pmd-settings-search-text="{{ e($setting['searchText']) }}"
                    >
                        <span class="pmd-settings-card__icon" aria-hidden="true">
                            @if ($setting['hasErrors'])
                                <i class="text-danger fa fa-exclamation-triangle fa-fw" title="@lang('system::lang.settings.alert_settings_errors')"></i>
                            @elseif ($category->icon)
                                <i class="{{ $category->icon }} fa-fw"></i>
                            @else
                                <i class="fa fa-puzzle-piece fa-fw"></i>
                            @endif
                        </span>
                        <span class="pmd-settings-card__content">
                            <span class="pmd-settings-card__title">{{ $setting['label'] }}</span>
                            <span class="pmd-settings-card__description">{!! $setting['description'] !!}</span>
                        </span>
                        <span class="pmd-settings-card__badge pmd-settings-card__badge--{{ strtolower($setting['badge']) }}">{{ $setting['badge'] }}</span>
                    </a>
                @endforeach
            </div>
        </section>
    @endforeach
</div>

<script>
    document.addEventListener('DOMContentLoaded', function () {
        var page = document.querySelector('[data-pmd-settings-page]');
        if (!page) return;

        var contentInput = page.querySelector('[data-pmd-settings-search]');
        var headerInput = document.querySelector('[data-pmd-header-settings-search]');
        var inputs = [contentInput, headerInput].filter(Boolean);
        var cards = Array.prototype.slice.call(page.querySelectorAll('[data-pmd-settings-card]'));
        var sections = Array.prototype.slice.call(page.querySelectorAll('[data-pmd-settings-section]'));
        var empty = page.querySelector('[data-pmd-settings-empty]');
        if (!inputs.length || !cards.length) return;

        function filterSettings(value, sourceInput) {
            var query = value.trim().toLowerCase();
            var visibleCount = 0;

            inputs.forEach(function (input) {
                if (input !== sourceInput && input.value !== value) input.value = value;
            });

            cards.forEach(function (card) {
                var haystack = card.getAttribute('data-pmd-settings-search-text') || '';
                var visible = !query || haystack.indexOf(query) !== -1;
                card.classList.toggle('d-none', !visible);
                if (visible) visibleCount++;
            });

            sections.forEach(function (section) {
                var hasVisibleCard = !!section.querySelector('[data-pmd-settings-card]:not(.d-none)');
                section.classList.toggle('d-none', !hasVisibleCard);
            });

            if (empty) empty.classList.toggle('d-none', visibleCount !== 0);
        }

        inputs.forEach(function (input) {
            input.addEventListener('input', function () {
                filterSettings(input.value, input);
            });
        });
    });
</script>

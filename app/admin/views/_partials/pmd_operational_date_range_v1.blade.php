@php
    $range = $pmdOpsRange ?? [];
    $rangeText = $range['text'] ?? [];
    $baseUrl = (string)($range['base_url'] ?? url()->current());

    $pmdRangeUrl = static function ($from, $to) use ($baseUrl) {
        return $baseUrl.'?'.http_build_query([
            'pmd_from' => $from,
            'pmd_to' => $to,
        ]);
    };
@endphp

<details class="pmd-ops-range">
    <summary
        class="pmd-ops-range__trigger"
        aria-label="{{ $rangeText['date_range'] ?? 'Date range' }}"
        title="{{ $rangeText['date_range'] ?? 'Date range' }}"
    >
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <rect x="3" y="5" width="18" height="16" rx="2"></rect>
            <path d="M16 3v4M8 3v4M3 11h18"></path>
        </svg>
    </summary>

    <div class="pmd-ops-range__panel">
        <header>
            <strong>{{ $rangeText['date_range'] ?? 'Date range' }}</strong>
            <span>{{ $range['label'] ?? '' }}</span>
        </header>

        <nav class="pmd-ops-range__presets" aria-label="{{ $rangeText['date_range'] ?? 'Date range' }}">
            <a
                href="{{ $pmdRangeUrl($range['today'] ?? '', $range['today'] ?? '') }}"
            >{{ $rangeText['today'] ?? 'Today' }}</a>

            <a
                href="{{ $pmdRangeUrl($range['yesterday'] ?? '', $range['yesterday'] ?? '') }}"
            >{{ $rangeText['yesterday'] ?? 'Yesterday' }}</a>

            <a
                href="{{ $pmdRangeUrl($range['last7_from'] ?? '', $range['today'] ?? '') }}"
            >{{ $rangeText['last_7_days'] ?? 'Last 7 days' }}</a>
        </nav>

        <form method="get" action="{{ $baseUrl }}" class="pmd-ops-range__form">
            <label>
                <span>{{ $rangeText['from'] ?? 'From' }}</span>
                <input
                    type="date"
                    name="pmd_from"
                    value="{{ $range['from'] ?? '' }}"
                    required
                >
            </label>

            <label>
                <span>{{ $rangeText['to'] ?? 'To' }}</span>
                <input
                    type="date"
                    name="pmd_to"
                    value="{{ $range['to'] ?? '' }}"
                    required
                >
            </label>

            <button type="submit">
                {{ $rangeText['apply'] ?? 'Apply' }}
            </button>
        </form>
    </div>
</details>

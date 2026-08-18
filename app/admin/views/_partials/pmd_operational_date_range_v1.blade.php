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

    /* PMD_RESERVATIONS_FUTURE_RANGE_PRESETS_V1
     * Reservations are an upcoming-booking workflow. Historical presets such
     * as Yesterday / Last 7 days belong to order/accounting surfaces, not the
     * ReservationsLab quick picker. Keep the shared component unchanged for
     * Cashier and switch only ReservationsLab to future-facing presets.
     */
    $pmdRangeFuturePresets = function_exists('request')
        && request()->is('admin/reservationslab*');

    $pmdRangeLocale = strtolower((string)app()->getLocale());
    $pmdRangeIsGerman = strpos($pmdRangeLocale, 'de') === 0;

    $pmdRangeToday = trim((string)($range['today'] ?? ''));
    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $pmdRangeToday)) {
        $pmdRangeToday = \Carbon\Carbon::now('Europe/Berlin')->toDateString();
    }

    try {
        $pmdRangeTodayCarbon = \Carbon\Carbon::createFromFormat(
            'Y-m-d',
            $pmdRangeToday,
            'Europe/Berlin'
        )->startOfDay();
    } catch (\Throwable $error) {
        $pmdRangeTodayCarbon = \Carbon\Carbon::now('Europe/Berlin')->startOfDay();
        $pmdRangeToday = $pmdRangeTodayCarbon->toDateString();
    }

    $pmdRangeTomorrow = $pmdRangeTodayCarbon->copy()->addDay()->toDateString();
    $pmdRangeNext7To = $pmdRangeTodayCarbon->copy()->addDays(7)->toDateString();
    $pmdRangeTomorrowLabel = $pmdRangeIsGerman ? 'Morgen' : 'Tomorrow';
    $pmdRangeNext7Label = $pmdRangeIsGerman ? 'Nächste 7 Tage' : 'Next 7 days';
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
                href="{{ $pmdRangeUrl($range['today'] ?? $pmdRangeToday, $range['today'] ?? $pmdRangeToday) }}"
            >{{ $rangeText['today'] ?? ($pmdRangeIsGerman ? 'Heute' : 'Today') }}</a>

            @if($pmdRangeFuturePresets)
                <a
                    href="{{ $pmdRangeUrl($pmdRangeTomorrow, $pmdRangeTomorrow) }}"
                >{{ $pmdRangeTomorrowLabel }}</a>

                <a
                    href="{{ $pmdRangeUrl($pmdRangeTomorrow, $pmdRangeNext7To) }}"
                >{{ $pmdRangeNext7Label }}</a>
            @else
                <a
                    href="{{ $pmdRangeUrl($range['yesterday'] ?? '', $range['yesterday'] ?? '') }}"
                >{{ $rangeText['yesterday'] ?? 'Yesterday' }}</a>

                <a
                    href="{{ $pmdRangeUrl($range['last7_from'] ?? '', $range['today'] ?? '') }}"
                >{{ $rangeText['last_7_days'] ?? 'Last 7 days' }}</a>
            @endif
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

<script>
/* PMD_OPERATIONAL_DATE_RANGE_ASYNC_V1_4_6
 * Keep the canonical server-rendered range authority, but stop browser-level
 * navigation. Only the nearest operational section is replaced from the
 * response HTML. No polling, observer, second data source or duplicated query.
 */
(function () {
    'use strict';

    if (window.PMDOperationalDateRangeV1) return;

    var requestSerial = 0;
    var activeController = null;

    function owningSection(node) {
        return node && node.closest
            ? node.closest('[data-pmd-ops-kind]')
            : null;
    }

    function sectionSelector(section) {
        if (!section) return '';
        if (section.id) {
            return '#' + section.id.replace(/([^a-zA-Z0-9_-])/g, '\\$1');
        }
        var kind = section.getAttribute('data-pmd-ops-kind') || '';
        return kind
            ? '[data-pmd-ops-kind="' + kind.replace(/"/g, '\\"') + '"]'
            : '';
    }

    function formUrl(form) {
        var url = new URL(form.getAttribute('action') || window.location.href, window.location.href);
        var data = new FormData(form);
        data.forEach(function (value, key) {
            url.searchParams.set(key, String(value));
        });
        return url;
    }

    function settleLoading(section) {
        if (!section || !section.isConnected) return;
        section.removeAttribute('aria-busy');
        section.classList.remove('is-pmd-range-loading');
    }

    function swapRange(url, section, options) {
        options = options || {};
        if (!section) return Promise.reject(new Error('Operational range section is unavailable.'));

        requestSerial += 1;
        var serial = requestSerial;

        if (activeController && typeof activeController.abort === 'function') {
            activeController.abort();
        }
        activeController = typeof AbortController !== 'undefined'
            ? new AbortController()
            : null;

        section.setAttribute('aria-busy', 'true');
        section.classList.add('is-pmd-range-loading');

        return fetch(url.href, {
            method: 'GET',
            credentials: 'same-origin',
            cache: 'no-store',
            headers: {
                'Accept': 'text/html',
                'X-Requested-With': 'XMLHttpRequest'
            },
            signal: activeController ? activeController.signal : undefined
        }).then(function (response) {
            if (!response.ok) {
                throw new Error('Date range request failed with HTTP ' + response.status + '.');
            }
            return response.text();
        }).then(function (html) {
            if (serial !== requestSerial) return null;

            var parsed = new DOMParser().parseFromString(html, 'text/html');
            var selector = sectionSelector(section);
            var replacement = selector ? parsed.querySelector(selector) : null;

            if (!replacement) {
                throw new Error('Updated date range section was not found in the server response.');
            }

            var next = document.importNode(replacement, true);
            var kind = section.getAttribute('data-pmd-ops-kind') || '';
            section.replaceWith(next);

            if (options.updateHistory !== false) {
                window.history.pushState(
                    { pmdOperationalRange: true, kind: kind },
                    '',
                    url.pathname + url.search + url.hash
                );
            }

            document.dispatchEvent(new CustomEvent('pmd:ops-range:updated', {
                detail: {
                    kind: kind,
                    url: url.href,
                    from: next.getAttribute('data-pmd-range-from') || '',
                    to: next.getAttribute('data-pmd-range-to') || ''
                }
            }));

            return next;
        }).catch(function (error) {
            if (error && error.name === 'AbortError') return null;
            settleLoading(section);
            console.error('[PMD Operational Date Range V1.4.6]', error);

            if (options.fallbackNavigation !== false) {
                window.location.assign(url.href);
            }
            return null;
        });
    }

    document.addEventListener('click', function (event) {
        var link = event.target && event.target.closest
            ? event.target.closest('.pmd-ops-range__presets a')
            : null;
        if (!link) return;
        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

        var section = owningSection(link);
        if (!section) return;

        event.preventDefault();
        event.stopPropagation();

        var details = link.closest('.pmd-ops-range');
        if (details) details.open = false;

        swapRange(new URL(link.href, window.location.href), section, {
            updateHistory: true,
            fallbackNavigation: true
        });
    }, false);

    document.addEventListener('submit', function (event) {
        var form = event.target;
        if (!form || !form.matches || !form.matches('.pmd-ops-range__form')) return;

        var section = owningSection(form);
        if (!section) return;

        event.preventDefault();
        event.stopPropagation();

        var details = form.closest('.pmd-ops-range');
        if (details) details.open = false;

        swapRange(formUrl(form), section, {
            updateHistory: true,
            fallbackNavigation: true
        });
    }, false);

    window.addEventListener('popstate', function () {
        var section = document.querySelector('[data-pmd-ops-kind] .pmd-ops-range')
            ? document.querySelector('[data-pmd-ops-kind]')
            : null;
        if (!section) return;

        swapRange(new URL(window.location.href), section, {
            updateHistory: false,
            fallbackNavigation: false
        });
    }, false);

    window.PMDOperationalDateRangeV1 = {
        version: '1.0.1',
        refresh: function (url) {
            var section = document.querySelector('[data-pmd-ops-kind]');
            return swapRange(new URL(url || window.location.href, window.location.href), section, {
                updateHistory: false,
                fallbackNavigation: false
            });
        },
        audit: function () {
            return {
                ready: true,
                asyncNavigation: true,
                fullPageReloadRequired: false,
                polling: false,
                observer: false,
                sections: document.querySelectorAll('[data-pmd-ops-kind]').length,
                triggers: document.querySelectorAll('.pmd-ops-range__trigger').length,
                forms: document.querySelectorAll('.pmd-ops-range__form').length
            };
        }
    };

    console.info('[PMD Operational Date Range V1.4.6] Ready', window.PMDOperationalDateRangeV1.audit());
})();
</script>


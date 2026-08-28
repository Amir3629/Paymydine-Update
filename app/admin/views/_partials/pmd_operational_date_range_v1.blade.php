@php
    $range = $pmdOpsRange ?? [];
    $rangeText = $range['text'] ?? [];
    $baseUrl = (string)($range['base_url'] ?? url()->current());

    // PMD_OPERATIONAL_RANGE_EXTRA_QUERY_V1
    // Keeps Cashier History mode while the same date range control changes dates.
    $pmdRangeExtraQuery = is_array($range['extra_query'] ?? null)
        ? $range['extra_query']
        : [];

    $pmdRangeUrl = static function ($from, $to) use ($baseUrl, $pmdRangeExtraQuery) {
        return $baseUrl.'?'.http_build_query(array_merge(
            $pmdRangeExtraQuery,
            [
                'pmd_from' => $from,
                'pmd_to' => $to,
            ]
        ));
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
            @foreach($pmdRangeExtraQuery as $pmdExtraName => $pmdExtraValue)
                @if(!in_array((string)$pmdExtraName, ['pmd_from', 'pmd_to'], true))
                    <input type="hidden" name="{{ $pmdExtraName }}" value="{{ $pmdExtraValue }}">
                @endif
            @endforeach

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

    // PMD_ADMIN_CANONICAL_BROWSER_URLS_R81C
    //
    // Browser History uses clean aliases, but this component's
    // server fetch must keep using the current internal workspace
    // controller for collision routes.
    function pmdInternalRangeUrlR81C(value) {
        var url = new URL(
            value,
            window.location.href
        );

        var path = String(
            url.pathname || ''
        ).replace(/\\/+$/, '');

        if (path === '/admin/orders') {
            url.pathname =
                '/admin/cashierlab';
        } else if (
            path ===
            '/admin/reservations'
        ) {
            url.pathname =
                '/admin/reservationslab';
        }

        return url;
    }

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

    // PMD_CASHIER_HISTORY_ASYNC_R47
    // History/Current uses the SAME server-rendered orders section and the SAME
    // async replacement authority as Date Range. No page navigation/reload.
    document.addEventListener('click', function (event) {
        var button = event.target && event.target.closest
            ? event.target.closest('[data-pmd-cashier-history-toggle]')
            : null;
        if (!button) return;
        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

        var section = owningSection(button);
        if (!section || section.id !== 'pmd-cashier-current-orders-v2') return;

        var target = String(button.getAttribute('data-pmd-history-target-url') || '').trim();
        if (!target) return;

        event.preventDefault();
        event.stopPropagation();

        swapRange(new URL(target, window.location.href), section, {
            updateHistory: true,
            fallbackNavigation: false
        });
    }, false);

    window.addEventListener('popstate', function () {
        var section = document.querySelector('[data-pmd-ops-kind] .pmd-ops-range')
            ? document.querySelector('[data-pmd-ops-kind]')
            : null;
        if (!section) return;

        swapRange(
            pmdInternalRangeUrlR81C(
                window.location.href
            ),
            section,
            {
            updateHistory: false,
            fallbackNavigation: false
        });
    }, false);

    window.PMDOperationalDateRangeV1 = {
        version: '1.0.1',
        refresh: function (url) {
            var section = document.querySelector('[data-pmd-ops-kind]');
            return swapRange(
                pmdInternalRangeUrlR81C(
                    url || window.location.href
                ),
                section,
                {
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



<script id="pmd-cashier-history-fast-r48">
/* PMD_CASHIER_HISTORY_FAST_R48
 * Same-page Cashier History with warm prefetch + in-memory section cache.
 * The server remains the only data authority. This only removes the wait from
 * the click path; no polling and no duplicated business calculations.
 */
(function () {
    'use strict';

    if (window.PMDCashierHistoryFastR48) return;
    if (String((window.PMDAdminCanonicalURLR81E ? window.PMDAdminCanonicalURLR81E.logicalPath() : window.location.pathname) || '').replace(/\/+$/, '') !== '/admin/cashierlab') return;

    var CACHE_TTL_MS = 30000;
    var cache = Object.create(null);
    var inflight = Object.create(null);

    function section() {
        return document.getElementById('pmd-cashier-current-orders-v2');
    }

    function canonical(url) {
        var u = new URL(url, window.location.href);
        u.hash = '';
        return u.href;
    }

    function key(url) {
        return canonical(url);
    }

    function parseSection(html) {
        var doc = new DOMParser().parseFromString(html, 'text/html');
        return doc.getElementById('pmd-cashier-current-orders-v2');
    }

    function put(url, node) {
        if (!node) return;
        cache[key(url)] = {
            at: Date.now(),
            html: node.outerHTML
        };
    }

    function get(url) {
        var item = cache[key(url)];
        if (!item) return null;
        if ((Date.now() - item.at) > CACHE_TTL_MS) {
            delete cache[key(url)];
            return null;
        }
        return item.html || null;
    }

    function modeUrlForCurrentSection(node) {
        if (!node) return null;

        var u = new URL('/admin/cashierlab', window.location.origin);
        var from = String(node.getAttribute('data-pmd-range-from') || '').trim();
        var to = String(node.getAttribute('data-pmd-range-to') || '').trim();
        var mode = String(node.getAttribute('data-pmd-history-mode') || 'current').trim();

        if (from) u.searchParams.set('pmd_from', from);
        if (to) u.searchParams.set('pmd_to', to);
        if (mode === 'history') u.searchParams.set('pmd_history', '1');

        return u;
    }

    function cacheCurrent(node) {
        var url = modeUrlForCurrentSection(node);
        if (url) put(url, node);
    }

    function fetchSection(url) {
        var k = key(url);
        var hit = get(url);
        if (hit) return Promise.resolve(hit);
        if (inflight[k]) return inflight[k];

        inflight[k] = fetch(canonical(url), {
            method: 'GET',
            credentials: 'same-origin',
            cache: 'no-store',
            headers: {
                'Accept': 'text/html',
                'X-Requested-With': 'XMLHttpRequest'
            }
        }).then(function (response) {
            if (!response.ok) {
                throw new Error('History request failed with HTTP ' + response.status + '.');
            }
            return response.text();
        }).then(function (html) {
            var found = parseSection(html);
            if (!found) {
                throw new Error('Cashier orders section missing from response.');
            }
            put(url, found);
            return found.outerHTML;
        }).finally(function () {
            delete inflight[k];
        });

        return inflight[k];
    }

    function prefetchOpposite(node) {
        if (!node) return;
        cacheCurrent(node);

        var button = node.querySelector('[data-pmd-cashier-history-toggle]');
        if (!button) return;

        var target = String(button.getAttribute('data-pmd-history-target-url') || '').trim();
        if (!target) return;

        // Start immediately. It is deliberately background-only: no spinner,
        // no DOM mutation, no navigation.
        fetchSection(target).catch(function (error) {
            console.warn('[PMD Cashier History R48] Prefetch skipped:', error);
        });
    }

    function importMarkup(markup) {
        var doc = new DOMParser().parseFromString(markup, 'text/html');
        var found = doc.getElementById('pmd-cashier-current-orders-v2');
        return found ? document.importNode(found, true) : null;
    }

    function commit(url, oldSection, markup, pushHistory) {
        if (!oldSection || !oldSection.isConnected) return null;

        var next = importMarkup(markup);
        if (!next) throw new Error('Cached Cashier section could not be imported.');

        oldSection.replaceWith(next);

        if (pushHistory !== false) {
            var u = new URL(url, window.location.href);
            window.history.pushState(
                { pmdCashierHistoryFastR48: true },
                '',
                u.pathname + u.search + u.hash
            );
        }

        document.dispatchEvent(new CustomEvent('pmd:ops-range:updated', {
            detail: {
                kind: 'orders',
                url: canonical(url),
                from: next.getAttribute('data-pmd-range-from') || '',
                to: next.getAttribute('data-pmd-range-to') || ''
            }
        }));

        prefetchOpposite(next);
        return next;
    }

    function switchMode(button) {
        var oldSection = section();
        if (!oldSection || !button) return;

        var target = String(button.getAttribute('data-pmd-history-target-url') || '').trim();
        if (!target) return;

        cacheCurrent(oldSection);

        var warm = get(target);
        if (warm) {
            commit(target, oldSection, warm, true);
            return;
        }

        oldSection.setAttribute('aria-busy', 'true');
        button.disabled = true;

        fetchSection(target).then(function (markup) {
            if (!oldSection.isConnected) return;
            commit(target, oldSection, markup, true);
        }).catch(function (error) {
            if (oldSection.isConnected) oldSection.removeAttribute('aria-busy');
            if (button.isConnected) button.disabled = false;
            console.error('[PMD Cashier History R48]', error);
        });
    }

    // Capture phase intentionally runs before R47's document bubble listener.
    document.addEventListener('click', function (event) {
        var button = event.target && event.target.closest
            ? event.target.closest('[data-pmd-cashier-history-toggle]')
            : null;
        if (!button) return;
        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

        var owner = button.closest('#pmd-cashier-current-orders-v2');
        if (!owner) return;

        event.preventDefault();
        event.stopImmediatePropagation();
        switchMode(button);
    }, true);

    // Date-range swaps already emit this event. Warm the opposite mode again
    // for the newly selected range.
    document.addEventListener('pmd:ops-range:updated', function () {
        window.setTimeout(function () {
            prefetchOpposite(section());
        }, 0);
    }, false);

    function boot() {
        prefetchOpposite(section());
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot, { once: true });
    } else {
        boot();
    }

    window.PMDCashierHistoryFastR48 = {
        version: '48.0.0',
        prefetch: boot,
        clear: function () {
            cache = Object.create(null);
        },
        audit: function () {
            var node = section();
            var button = node && node.querySelector('[data-pmd-cashier-history-toggle]');
            var target = button && button.getAttribute('data-pmd-history-target-url');
            return {
                version: '48.0.0',
                sectionFound: Boolean(node),
                mode: node ? node.getAttribute('data-pmd-history-mode') : null,
                targetCached: Boolean(target && get(target)),
                targetPrefetching: Boolean(target && inflight[key(target)]),
                fullPageNavigation: false,
                cacheTtlMs: CACHE_TTL_MS
            };
        }
    };
})();
</script>

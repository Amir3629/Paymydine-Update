@php
    $pmdAiCssPath = base_path('app/admin/assets/css/pmd-intelligence-v1.css');
    $pmdAiJsPath = base_path('app/admin/assets/js/pmd-intelligence-v1.js');
    $pmdAiCssVersion = is_file($pmdAiCssPath) ? (string)filemtime($pmdAiCssPath) : '20260905';
    $pmdAiJsVersion = is_file($pmdAiJsPath) ? (string)filemtime($pmdAiJsPath) : '20260905';
    $pmdAiCssUrl = asset('app/admin/assets/css/pmd-intelligence-v1.css').'?v='.$pmdAiCssVersion;
    $pmdAiJsUrl = asset('app/admin/assets/js/pmd-intelligence-v1.js').'?v='.$pmdAiJsVersion;

    $pmdAiHealth = [
        'configured' => false,
        'available_for_traffic' => false,
        'healthy' => null,
        'last_success_at' => null,
    ];
    try {
        $pmdAiHealth = app(\App\Services\AI\AiHealthService::class)->status(
            (string)($pmdAiConfig['provider'] ?? ''),
            (string)($pmdAiConfig['model'] ?? '')
        );
    } catch (\Throwable $pmdAiHealthError) {
        $pmdAiHealth = [
            'configured' => false,
            'available_for_traffic' => false,
            'healthy' => false,
            'last_success_at' => null,
        ];
    }
    $pmdAiTrafficReady = !empty($pmdAiConfig['enabled'])
        && !empty($pmdAiHealth['configured'])
        && !empty($pmdAiHealth['available_for_traffic']);

    $pmdAiArchiveDays = [];
    try {
        $pmdAiArchiveUser = \Admin\Facades\AdminAuth::getUser();
        if ($pmdAiArchiveUser && !empty($pmdAiConfig['location_id'])) {
            $pmdAiArchive = app(\App\Services\AI\AdminAiConversationStore::class)->archive(
                (int)$pmdAiConfig['location_id'],
                (int)$pmdAiArchiveUser->getKey(),
                14,
                80
            );
            $pmdAiArchiveDays = array_values(array_filter(
                (array)($pmdAiArchive['days'] ?? []),
                static fn ($day) => is_array($day)
                    && empty($day['is_today'])
                    && !empty($day['messages'])
            ));
        }
    } catch (\Throwable $pmdAiArchiveError) {
        $pmdAiArchiveDays = [];
    }
@endphp

<link rel="stylesheet" type="text/css" href="{{ $pmdAiCssUrl }}" data-pmd-ai-versioned-style>

<style id="pmd-ai-saved-days-style-v1">
/* The sidebar icon is intentionally NOT restyled here. The canonical Side Menu
   authority owns the same AI sparkles glyph on every Admin page. */
.pmd-ai-saved-days {
    position: relative;
    margin-left: auto;
}

.pmd-ai-saved-days > summary {
    list-style: none;
    cursor: pointer;
    white-space: nowrap;
    border: 1px solid #d5e5df;
    border-radius: 999px;
    padding: 7px 11px;
    background: #fff;
    color: #34534c;
    font-size: 12px;
    font-weight: 700;
}

.pmd-ai-saved-days > summary::-webkit-details-marker { display: none; }

.pmd-ai-saved-days[open] > summary {
    background: #eff9f5;
    border-color: #a9d7c8;
}

.pmd-ai-saved-days__panel {
    position: absolute;
    z-index: 40;
    top: calc(100% + 8px);
    right: 0;
    width: min(520px, 78vw);
    max-height: 62vh;
    overflow: auto;
    padding: 8px;
    border: 1px solid #d9e6e1;
    border-radius: 16px;
    background: #fff;
    box-shadow: 0 18px 44px rgba(10, 45, 37, .14);
}

.pmd-ai-saved-day {
    border: 1px solid #e3ece8;
    border-radius: 12px;
    background: #fbfdfc;
}

.pmd-ai-saved-day + .pmd-ai-saved-day { margin-top: 7px; }

.pmd-ai-saved-day > summary {
    list-style: none;
    cursor: pointer;
    padding: 10px 12px;
}

.pmd-ai-saved-day > summary::-webkit-details-marker { display: none; }

.pmd-ai-saved-day__top {
    display: flex;
    align-items: center;
    gap: 9px;
    color: #173c34;
    font-size: 12px;
    font-weight: 800;
}

.pmd-ai-saved-day__count {
    margin-left: auto;
    color: #718780;
    font-size: 11px;
    font-weight: 600;
}

.pmd-ai-saved-day__preview {
    display: block;
    margin-top: 5px;
    overflow: hidden;
    color: #72827d;
    font-size: 11px;
    line-height: 1.4;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.pmd-ai-saved-day__thread {
    padding: 0 10px 10px;
}

.pmd-ai-saved-message {
    max-width: 92%;
    margin-top: 7px;
    padding: 9px 11px;
    border: 1px solid #dfe9e5;
    border-radius: 12px;
    background: #fff;
    color: #243934;
    font-size: 12px;
    line-height: 1.45;
    white-space: pre-wrap;
}

.pmd-ai-saved-message.is-user {
    margin-left: auto;
    border-color: #0a7b60;
    background: #0a7b60;
    color: #fff;
}

.pmd-ai-saved-message.is-assistant { margin-right: auto; }

@media (max-width: 720px) {
    .pmd-ai-saved-days { margin-left: 0; }
    .pmd-ai-saved-days__panel {
        position: fixed;
        left: 12px;
        right: 12px;
        top: 92px;
        width: auto;
        max-height: calc(100dvh - 112px);
    }
}
</style>

<div
    id="pmd-intelligence"
    class="pmd-owner-page pmd-ai-shell"
    data-pmd-owner-page
    data-pmd-ai-chat-root
    data-endpoint="{{ $pmdAiConfig['endpoint'] }}"
    data-history-endpoint="{{ $pmdAiConfig['history_endpoint'] }}"
    data-clear-endpoint="{{ $pmdAiConfig['clear_endpoint'] }}"
>
    <header id="pmd-r2-clean-header" class="pmd-owner-header pmd-ai-header" aria-label="PMD Intelligence">
        <div class="pmd-owner-header__left pmd-ai-heading">
            <div class="pmd-ai-heading-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M12 3l1.45 4.55L18 9l-4.55 1.45L12 15l-1.45-4.55L6 9l4.55-1.45L12 3Z"/>
                    <path d="M19 14l.75 2.25L22 17l-2.25.75L19 20l-.75-2.25L16 17l2.25-.75L19 14ZM5 14l.55 1.45L7 16l-1.45.55L5 18l-.55-1.45L3 16l1.45-.55L5 14Z"/>
                </svg>
            </div>
            <div>
                <h1 class="pmd-r2-clean-title">PMD Intelligence</h1>
                <p>Your restaurant copilot — grounded in PMD data, read-only by design.</p>
            </div>
        </div>

        <div class="pmd-owner-header__actions pmd-ai-header-actions" data-pmd-owner-header-actions>
            <span class="pmd-ai-header-state {{ $pmdAiTrafficReady ? 'is-ready' : 'is-off' }}">
                <span class="pmd-ai-header-dot" aria-hidden="true"></span>
                {{ $pmdAiTrafficReady ? 'AI ready' : 'AI unavailable' }} · Read-only
            </span>
            <button type="button" class="pmd-ai-clear" data-pmd-ai-clear disabled>Clear today</button>
            <span class="pmd-owner-notif-slot" data-pmd-owner-notif-slot></span>
        </div>
    </header>

    @if (!$pmdAiTrafficReady)
        <section class="pmd-ai-notice" role="status">
            PMD Intelligence is temporarily unavailable. Restaurant operations are unaffected.
        </section>
    @endif

    <section class="pmd-ai-workspace" aria-label="Ask PMD chat">
        <div class="pmd-ai-chat-card">
            <div class="pmd-ai-chat-meta" aria-label="AI runtime status">
                <span>{{ $pmdAiTrafficReady ? 'Provider ready' : 'Provider unavailable' }}</span>
                <span>Location {{ $pmdAiConfig['location_id'] ?: 'not selected' }}</span>
                <span data-pmd-ai-save-state>Loading today’s chat…</span>

                @if(count($pmdAiArchiveDays))
                    <details class="pmd-ai-saved-days">
                        <summary>Saved chats · {{ count($pmdAiArchiveDays) }}</summary>
                        <div class="pmd-ai-saved-days__panel" aria-label="Previous daily PMD chats">
                            @foreach($pmdAiArchiveDays as $day)
                                <details class="pmd-ai-saved-day">
                                    <summary>
                                        <span class="pmd-ai-saved-day__top">
                                            <time datetime="{{ $day['date'] }}">{{ $day['date'] }}</time>
                                            <span class="pmd-ai-saved-day__count">{{ (int)$day['message_count'] }} messages</span>
                                        </span>
                                        @if(!empty($day['preview']))
                                            <span class="pmd-ai-saved-day__preview">{{ $day['preview'] }}</span>
                                        @endif
                                    </summary>
                                    <div class="pmd-ai-saved-day__thread">
                                        @foreach((array)$day['messages'] as $message)
                                            @php($pmdSavedRole = ($message['role'] ?? '') === 'assistant' ? 'assistant' : 'user')
                                            <div class="pmd-ai-saved-message is-{{ $pmdSavedRole }}">{{ $message['content'] ?? '' }}</div>
                                        @endforeach
                                    </div>
                                </details>
                            @endforeach
                        </div>
                    </details>
                @endif
            </div>

            <div class="pmd-ai-thread" data-pmd-ai-thread role="log" aria-live="polite" aria-relevant="additions">
                <div class="pmd-ai-empty" data-pmd-ai-empty>
                    <div class="pmd-ai-empty-icon" aria-hidden="true">
                        <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M12 3l1.45 4.55L18 9l-4.55 1.45L12 15l-1.45-4.55L6 9l4.55-1.45L12 3Z"/>
                            <path d="M19 14l.75 2.25L22 17l-2.25.75L19 20l-.75-2.25L16 17l2.25-.75L19 14ZM5 14l.55 1.45L7 16l-1.45.55L5 18l-.55-1.45L3 16l1.45-.55L5 14Z"/>
                        </svg>
                    </div>
                    <h2>What do you want to know?</h2>
                    <p>Ask naturally. PMD can check sales, orders, reservations, menu performance, staffing and restaurant operations.</p>

                    <div class="pmd-ai-prompts" aria-label="Suggested questions">
                        <button type="button" data-pmd-ai-prompt="What should I focus on tonight? Keep it short and tell me only what needs attention.">What needs attention tonight?</button>
                        <button type="button" data-pmd-ai-prompt="How are we performing today? Give me the key numbers and the one thing I should watch.">How are we doing today?</button>
                        <button type="button" data-pmd-ai-prompt="Check live orders and kitchen workforce. Is there anything I should act on now?">Kitchen or live-order risk?</button>
                        <button type="button" data-pmd-ai-prompt="Review today's reservations and tell me only what deserves attention.">Reservation brief</button>
                    </div>
                </div>

                <div class="pmd-ai-messages" data-pmd-ai-messages></div>
                <div class="pmd-ai-thread-tail" data-pmd-ai-tail aria-hidden="true"></div>
            </div>

            <form action="{{ $pmdAiConfig['endpoint'] }}" method="post" class="pmd-ai-composer" data-pmd-ai-form>
                @csrf
                <label class="sr-only" for="pmd-ai-question">Ask PMD about this restaurant</label>
                <textarea
                    id="pmd-ai-question"
                    name="question"
                    rows="2"
                    maxlength="4000"
                    placeholder="Ask PMD about sales, orders, menu, reservations, shifts…"
                    required
                    {{ $pmdAiTrafficReady ? '' : 'disabled' }}
                ></textarea>
                <div class="pmd-ai-composer-row">
                    <span data-pmd-ai-state>{{ $pmdAiTrafficReady ? 'Checks your restaurant data only.' : 'AI is temporarily unavailable; restaurant operations are unaffected.' }}</span>
                    <button type="submit" {{ $pmdAiTrafficReady ? '' : 'disabled' }}>
                        <span>Ask PMD</span>
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
                    </button>
                </div>
            </form>
        </div>
    </section>
</div>

<script>
(function () {
    'use strict';
    var root = document.querySelector('[data-pmd-ai-chat-root]');
    if (!root) return;

    root.setAttribute('data-pmd-ai-root', '');

    var script = document.createElement('script');
    script.src = @json($pmdAiJsUrl);
    script.async = false;
    script.setAttribute('data-pmd-ai-versioned-runtime', '');
    document.body.appendChild(script);
})();
</script>
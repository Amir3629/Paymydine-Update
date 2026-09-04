<div
    id="pmd-intelligence"
    class="pmd-owner-page pmd-ai-shell"
    data-pmd-owner-page
    data-pmd-ai-root
    data-endpoint="{{ $pmdAiConfig['endpoint'] }}"
    data-history-endpoint="{{ $pmdAiConfig['history_endpoint'] }}"
    data-clear-endpoint="{{ $pmdAiConfig['clear_endpoint'] }}"
>
    <header id="pmd-r2-clean-header" class="pmd-owner-header pmd-ai-header" aria-label="PMD Intelligence">
        <div class="pmd-owner-header__left pmd-ai-heading">
            <div class="pmd-ai-heading-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                    <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1"/>
                    <circle cx="12" cy="12" r="3.5"/>
                </svg>
            </div>
            <div>
                <h1 class="pmd-r2-clean-title">PMD Intelligence</h1>
                <p>Your restaurant copilot — grounded in PMD data, read-only by design.</p>
            </div>
        </div>

        <div class="pmd-owner-header__actions pmd-ai-header-actions" data-pmd-owner-header-actions>
            <span class="pmd-ai-header-state {{ $pmdAiConfig['enabled'] ? 'is-ready' : 'is-off' }}">
                <span class="pmd-ai-header-dot" aria-hidden="true"></span>
                {{ $pmdAiConfig['enabled'] ? 'AI on' : 'AI off' }} · Read-only
            </span>
            <button type="button" class="pmd-ai-clear" data-pmd-ai-clear disabled>Clear chat</button>
            <span class="pmd-owner-notif-slot" data-pmd-owner-notif-slot></span>
        </div>
    </header>

    @if (!$pmdAiConfig['enabled'])
        <section class="pmd-ai-notice" role="status">
            PMD Intelligence is installed but currently disabled on the server.
        </section>
    @endif

    <section class="pmd-ai-workspace" aria-label="Ask PMD chat">
        <div class="pmd-ai-chat-card">
            <div class="pmd-ai-chat-meta" aria-label="AI runtime status">
                <span>{{ $pmdAiConfig['provider'] }} · {{ $pmdAiConfig['model'] }}</span>
                <span>Location {{ $pmdAiConfig['location_id'] ?: 'not selected' }}</span>
                <span data-pmd-ai-save-state>Loading saved chat…</span>
            </div>

            <div class="pmd-ai-thread" data-pmd-ai-thread role="log" aria-live="polite" aria-relevant="additions">
                <div class="pmd-ai-empty" data-pmd-ai-empty>
                    <div class="pmd-ai-empty-icon" aria-hidden="true">
                        <svg viewBox="0 0 24 24">
                            <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1"/>
                            <circle cx="12" cy="12" r="3.5"/>
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
                ></textarea>
                <div class="pmd-ai-composer-row">
                    <span data-pmd-ai-state>Checks your restaurant data only.</span>
                    <button type="submit">
                        <span>Ask PMD</span>
                        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
                    </button>
                </div>
            </form>
        </div>
    </section>

    <details class="pmd-ai-safety-details">
        <summary>How PMD Intelligence uses your data</summary>
        <div class="pmd-ai-safety-grid">
            <span><strong>Your restaurant only</strong> — current tenant and location scope.</span>
            <span><strong>PMD authorities</strong> — reports and operations data stay the source of truth.</span>
            <span><strong>No automatic changes</strong> — AI does not edit orders, payments, menus or staff records.</span>
            <span><strong>Safe next steps</strong> — buttons only navigate to allowlisted PMD pages; the model never invents URLs.</span>
        </div>
    </details>
</div>

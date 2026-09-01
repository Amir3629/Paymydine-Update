<div
    id="pmd-intelligence"
    class="pmd-owner-page pmd-ai-shell"
    data-pmd-owner-page
    data-pmd-ai-root
    data-endpoint="{{ $pmdAiConfig['endpoint'] }}"
>
    <header
        id="pmd-r2-clean-header"
        class="pmd-owner-header pmd-ai-header"
        aria-label="PMD Intelligence"
    >
        <div class="pmd-owner-header__left">
            <h1 class="pmd-r2-clean-title">PMD Intelligence</h1>
        </div>

        <div class="pmd-owner-header__actions" data-pmd-owner-header-actions>
            <span class="pmd-ai-header-state {{ $pmdAiConfig['enabled'] ? 'is-ready' : 'is-off' }}">
                <span class="pmd-ai-header-dot" aria-hidden="true"></span>
                {{ $pmdAiConfig['enabled'] ? 'AI on' : 'AI off' }} · Read-only
            </span>
            <span class="pmd-owner-notif-slot" data-pmd-owner-notif-slot></span>
        </div>
    </header>

    <section class="pmd-ai-intro" aria-label="PMD Intelligence status">
        <div>
            <strong>Ask PMD</strong>
            <span>Operational answers grounded in the current restaurant and PMD canonical data sources.</span>
        </div>
        <div class="pmd-ai-runtime-meta">
            <span>{{ $pmdAiConfig['provider'] }} · {{ $pmdAiConfig['model'] }}</span>
            <span>Location {{ $pmdAiConfig['location_id'] ?: 'not selected' }}</span>
        </div>
    </section>

    @if (!$pmdAiConfig['enabled'])
        <section class="pmd-ai-notice" role="status">
            PMD Intelligence is installed but currently disabled on the server.
        </section>
    @endif

    <section class="pmd-ai-grid">
        <div class="pmd-owner-card pmd-ai-card" data-accent="emerald">
            <div class="pmd-owner-card__header">
                <div class="pmd-owner-card__icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24">
                        <path d="M12 3v3"></path>
                        <path d="M12 18v3"></path>
                        <path d="M3 12h3"></path>
                        <path d="M18 12h3"></path>
                        <path d="m5.6 5.6 2.1 2.1"></path>
                        <path d="m16.3 16.3 2.1 2.1"></path>
                        <path d="m18.4 5.6-2.1 2.1"></path>
                        <path d="m7.7 16.3-2.1 2.1"></path>
                        <circle cx="12" cy="12" r="3.5"></circle>
                    </svg>
                </div>
                <div class="pmd-owner-card__title">
                    <h2>Ask PMD</h2>
                    <p>Owner operations copilot · current tenant and location only</p>
                </div>
                <span class="pmd-ai-readonly">Read-only</span>
            </div>

            <div class="pmd-ai-card-body">
                <div class="pmd-ai-prompts" aria-label="Suggested questions">
                    <button type="button" data-pmd-ai-prompt="What should I focus on tonight? Use current KPIs, live orders, reservations and kitchen staffing where relevant.">What should I focus on tonight?</button>
                    <button type="button" data-pmd-ai-prompt="Summarize today's sales performance and call out the biggest operational risk.">How are we performing today?</button>
                    <button type="button" data-pmd-ai-prompt="Check live orders and kitchen workforce. Is there anything the owner should act on now?">Kitchen or live-order risk?</button>
                    <button type="button" data-pmd-ai-prompt="Review today's reservations and tell me what deserves attention.">Reservation brief</button>
                </div>

                <form
                    action="{{ $pmdAiConfig['endpoint'] }}"
                    method="post"
                    data-pmd-ai-form
                >
                    @csrf
                    <label for="pmd-ai-question">Ask about this restaurant</label>
                    <textarea
                        id="pmd-ai-question"
                        name="question"
                        rows="5"
                        maxlength="4000"
                        placeholder="Example: How are we performing this month, and what needs attention?"
                        required
                    ></textarea>

                    <div class="pmd-ai-actions">
                        <span data-pmd-ai-state>Uses PMD canonical sources only.</span>
                        <button type="submit">Ask PMD</button>
                    </div>
                </form>
            </div>
        </div>

        <div class="pmd-owner-card pmd-ai-card pmd-ai-answer-card" data-accent="slate">
            <div class="pmd-owner-card__header">
                <div class="pmd-owner-card__icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24">
                        <path d="M4 5h16"></path>
                        <path d="M4 10h16"></path>
                        <path d="M4 15h10"></path>
                        <path d="M4 20h7"></path>
                    </svg>
                </div>
                <div class="pmd-owner-card__title">
                    <h2>Operations brief</h2>
                    <p>Grounded answer from existing PMD authorities</p>
                </div>
                <span class="pmd-ai-run" data-pmd-ai-run></span>
            </div>

            <div class="pmd-ai-card-body">
                <div class="pmd-ai-answer is-empty" data-pmd-ai-answer>
                    Ask a question to generate a tenant- and location-scoped operations brief.
                </div>
                <div class="pmd-ai-evidence" data-pmd-ai-evidence hidden></div>
            </div>
        </div>
    </section>

    <section class="pmd-owner-section pmd-ai-boundaries-section">
        <div class="pmd-owner-card" data-accent="emerald">
            <div class="pmd-owner-card__header">
                <div class="pmd-owner-card__icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24">
                        <path d="M12 3 5 6v5c0 4.6 2.8 8.4 7 10 4.2-1.6 7-5.4 7-10V6l-7-3z"></path>
                        <path d="m9 12 2 2 4-4"></path>
                    </svg>
                </div>
                <div class="pmd-owner-card__title">
                    <h2>Safety boundaries</h2>
                    <p>AI reads and recommends; PMD transaction authorities remain unchanged.</p>
                </div>
            </div>

            <div class="pmd-ai-boundaries">
                <article><strong>Tenant locked</strong><span>The model cannot select a tenant, database, user or location.</span></article>
                <article><strong>No generic SQL</strong><span>Tools wrap existing PMD data authorities. There is no generic SQL tool.</span></article>
                <article><strong>No transaction writes</strong><span>No order, refund, settlement, tax, fiscal or payment write action exists.</span></article>
                <article><strong>PMD stays authoritative</strong><span>Recommendations never replace existing PMD controllers and workflows.</span></article>
            </div>
        </div>
    </section>
</div>

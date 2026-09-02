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
            <span>Simple answers about sales, orders, reservations, menu and restaurant operations.</span>
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
                    <p>Your read-only restaurant assistant</p>
                </div>
                <span class="pmd-ai-readonly">Read-only</span>
            </div>

            <div class="pmd-ai-card-body">
                <div class="pmd-ai-prompts" aria-label="Suggested questions">
                    <button type="button" data-pmd-ai-prompt="What should I focus on tonight? Keep it short and tell me only what needs attention.">What should I focus on tonight?</button>
                    <button type="button" data-pmd-ai-prompt="How are we performing today? Give me the key numbers and the one thing I should watch.">How are we performing today?</button>
                    <button type="button" data-pmd-ai-prompt="Check live orders and kitchen workforce. Is there anything I should act on now?">Kitchen or live-order risk?</button>
                    <button type="button" data-pmd-ai-prompt="Review today's reservations and tell me only what deserves attention.">Reservation brief</button>
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
                        placeholder="Example: How did we do in August, and what should I notice?"
                        required
                    ></textarea>

                    <div class="pmd-ai-actions">
                        <span data-pmd-ai-state>Checks your restaurant data only.</span>
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
                    <h2>PMD answer</h2>
                    <p>A simple answer based on your restaurant data</p>
                </div>
                <span class="pmd-ai-run" data-pmd-ai-run></span>
            </div>

            <div class="pmd-ai-card-body">
                <div class="pmd-ai-answer is-empty" data-pmd-ai-answer>
                    Ask a question and PMD will show the important numbers and what needs attention.
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
                    <h2>Safe by design</h2>
                    <p>PMD Intelligence can read and recommend, but it cannot change restaurant data.</p>
                </div>
            </div>

            <div class="pmd-ai-boundaries">
                <article><strong>Your restaurant only</strong><span>AI stays inside the restaurant and location already selected in PMD.</span></article>
                <article><strong>PMD data only</strong><span>Answers come through existing PMD reporting and operations data.</span></article>
                <article><strong>No automatic changes</strong><span>AI cannot change orders, payments, refunds, taxes, menus or staff records.</span></article>
                <article><strong>You stay in control</strong><span>AI explains what it sees and suggests what you may want to check next.</span></article>
            </div>
        </div>
    </section>
</div>

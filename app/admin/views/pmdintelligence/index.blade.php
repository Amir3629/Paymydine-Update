<div class="pmd-ai-shell" data-pmd-ai-root data-endpoint="{{ $pmdAiConfig['endpoint'] }}">
    <section class="pmd-ai-hero">
        <div>
            <span class="pmd-ai-eyebrow">PMD Intelligence · Read-only V1</span>
            <h1>Ask PMD</h1>
            <p>Operational answers grounded in your live PayMyDine owner data. PMD Intelligence can read and recommend; it cannot change orders, payments, tax, staff records, menus, reservations or MFA.</p>
        </div>
        <div class="pmd-ai-status {{ $pmdAiConfig['enabled'] ? 'is-ready' : 'is-off' }}">
            <strong>{{ $pmdAiConfig['enabled'] ? 'AI enabled' : 'AI disabled' }}</strong>
            <span>{{ $pmdAiConfig['provider'] }} · {{ $pmdAiConfig['model'] }}</span>
            <span>Location {{ $pmdAiConfig['location_id'] ?: 'not selected' }}</span>
        </div>
    </section>

    @if (!$pmdAiConfig['enabled'])
        <section class="pmd-ai-notice">
            PMD Intelligence code is installed but intentionally fail-closed. Set <code>PMD_AI_ENABLED=true</code> and a server-side <code>OPENAI_API_KEY</code> only after the VPS smoke test passes.
        </section>
    @endif

    <section class="pmd-ai-grid">
        <div class="pmd-ai-panel pmd-ai-compose">
            <div class="pmd-ai-panel-head">
                <div>
                    <span class="pmd-ai-kicker">Operations copilot</span>
                    <h2>What should I focus on?</h2>
                </div>
                <span class="pmd-ai-readonly">Read-only</span>
            </div>

            <div class="pmd-ai-prompts" aria-label="Suggested questions">
                <button type="button" data-pmd-ai-prompt="What should I focus on tonight? Use current KPIs, live orders, reservations and kitchen staffing where relevant.">What should I focus on tonight?</button>
                <button type="button" data-pmd-ai-prompt="Summarize today's sales performance and call out the biggest operational risk.">How are we performing today?</button>
                <button type="button" data-pmd-ai-prompt="Check live orders and kitchen workforce. Is there anything the owner should act on now?">Any kitchen or live-order risk?</button>
                <button type="button" data-pmd-ai-prompt="Review today's reservations and tell me what deserves attention.">Reservation brief</button>
            </div>

            <form data-pmd-ai-form>
                @csrf
                <label for="pmd-ai-question">Ask about this restaurant</label>
                <textarea id="pmd-ai-question" name="question" rows="5" maxlength="4000" placeholder="Example: Why is today weaker than this month, and what should I do next?" required></textarea>
                <div class="pmd-ai-actions">
                    <span data-pmd-ai-state>Uses PMD canonical sources only.</span>
                    <button type="submit">Ask PMD</button>
                </div>
            </form>
        </div>

        <div class="pmd-ai-panel pmd-ai-answer-panel">
            <div class="pmd-ai-panel-head">
                <div>
                    <span class="pmd-ai-kicker">Grounded answer</span>
                    <h2>Operations brief</h2>
                </div>
                <span class="pmd-ai-run" data-pmd-ai-run></span>
            </div>
            <div class="pmd-ai-answer is-empty" data-pmd-ai-answer>
                Ask a question to generate a tenant- and location-scoped operations brief.
            </div>
            <div class="pmd-ai-evidence" data-pmd-ai-evidence hidden></div>
        </div>
    </section>

    <section class="pmd-ai-guardrails">
        <h2>Hard safety boundaries</h2>
        <div class="pmd-ai-guardrail-grid">
            <article><strong>Tenant locked</strong><span>The model cannot select a tenant, database, user or location.</span></article>
            <article><strong>No generic SQL</strong><span>Tools wrap existing PMD data authorities; there is no run_sql tool.</span></article>
            <article><strong>No transaction writes</strong><span>No order, refund, settlement, tax, fiscal or payment write actions exist.</span></article>
            <article><strong>Human authority</strong><span>Recommendations remain recommendations. Existing PMD controllers stay authoritative.</span></article>
        </div>
    </section>
</div>

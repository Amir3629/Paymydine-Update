# PMD Intelligence — `/admin/pmdintelligence`

## Current product contract

PMD Intelligence on current `main` is a **read-only restaurant operations copilot**. Older handoffs/snapshots contain a much broader AI control-center implementation with write actions, email/workforce controls and many handlers; those are not the current page contract. Do not use those retired handlers as documentation for the live page.

The current surface answers questions by allowing an AI orchestrator to call a small, explicit set of trusted PayMyDine read tools. Conversation history is tenant-local and scoped to authenticated user + canonical location.

## Entry points

- URL/controller: `/admin/pmdintelligence`
- Controller: `app/admin/controllers/Pmdintelligence.php`
- View: `app/admin/views/pmdintelligence/index.blade.php`
- Permission: `Admin.Dashboard`
- CSS: `pmd-owner-settings-v1.css`, `pmd-settings-suite-first-paint-v1.css`, `pmd-intelligence-v1.css`
- JS: `pmd-owner-settings-v1.js`, `pmd-intelligence-v1.js`

Controller endpoints exposed to the page:

- `index()` — page/bootstrap configuration
- `ask()` — ask orchestrator
- `history()` — retrieve scoped chat history
- `clear()` — clear scoped chat history

## Bootstrap configuration

`index()` builds an `AiContext` and exposes tenant policy enabled state, configured provider/model identifiers, `read_only = true`, canonical location ID and ask/history/clear endpoints. This page must never imply that AI can directly write an order, shift, reservation, payment or setting unless a future reviewed action contract is explicitly added.

## Identity and tenant scope

`buildAiContext()` derives the current admin/staff identity, tenant database/domain when available, canonical restaurant location through `PmdReadAuthority`, user/staff IDs, locale, canonical timezone, unique run UUID and task name. If no canonical location/user is available, scoped history/clear fail closed. Conversation persistence is keyed by location and user.

## Conversation continuity

`AdminAiConversationStore` is persistence authority. History reads up to 160 messages; model continuity uses a short recent context (10 messages at call site). Prior assistant text is **not** factual authority: operational facts must be re-read through PMD tools.

The controller injects exact restaurant-local datetime/date/weekday/timezone, so today/tomorrow/tonight/yesterday resolve from restaurant time rather than browser/UTC guesses. Conversation history is character-budgeted before the current question is appended.

## Trusted read-tool registry

Current tools are:

1. `restaurant_identity` — safe restaurant/signed-in display identity.
2. `owner_kpis` — current owner KPI snapshot.
3. `report_snapshot` — approved current reports for today/current month.
4. `report_range` — explicit YYYY-MM-DD ranges; future ranges are accepted only where the report contract allows them (notably reservations).
5. `order_integrity_range` — read-only reconciliation of orders/items/totals/status/settlement/tips/payment methods.
6. `workforce_schedule_range` — named schedule/department/role/shift/attendance/replacement/worked-hour facts for exact ranges.
7. `kitchen_workforce` — current kitchen expected/present/missing snapshot and people.

Reports cover sales, hourly, categories, payments, transactions, channels, tips, top items, reviews, reservations and attendance, with current operational snapshot types where exposed by the read authority.

## Orchestration flow

1. Authenticate and enforce `Admin.Dashboard`.
2. Build scoped `AiContext`.
3. Load recent continuity when storage is available.
4. Add restaurant-local temporal context.
5. Call `AiOrchestrator::ask()` with the explicit tool registry.
6. Track tool signals.
7. Build safe follow-up/action links through `PmdIntelligenceActionRegistry`; these are not implicit writes.
8. Persist question/answer pair when possible.
9. Return private/no-store JSON with run/persistence/storage state.

## Production rollout, budgets and health gates

The latest production-hardening layer adds fail-closed tenant rollout and provider-health controls around the same read-only page contract. `PmdAiTenantPolicyService` requires the global AI kill switch **and** a tenant-local explicit setting or server-side canary allowlist. Admin rollout has no wildcard escape hatch. Tenant settings can independently control Admin/Guest enablement, Guest location allowlists and bounded daily request budgets; once explicit tenant policy rows exist they supersede a growing `.env` allowlist model.

The orchestrator stack includes provider health/circuit-breaker behavior, persistent tenant usage accounting, capability/role filtering and global/tenant budgets. These controls gate `AiOrchestrator`; they do not expand the page into a writer. Maintenance/retention tooling is pinned to an **explicit tenant host**, resolves it through the central registry and verifies the connected tenant DB before cleanup. Never run AI retention cleanup against an implicit/default tenant.

Important services/config: `AiHealthService`, `AiUsageLedger`, `AiCapabilityPolicy`, `AiBudgetService`, `AiRetentionService`, `PmdAiTenantPolicyService`, `config/pmd_ai.php`, plus production smoke/contract scripts and CI.

## Error and privacy behavior

Operator errors deliberately hide provider credentials, project/billing details and raw infrastructure failures. Validation/date errors use 422, missing canonical location 409, unavailable policy/tools 403/503 as appropriate, provider/quota/transport conditions map to unavailable responses, and unexpected upstream failure maps to 502-style behavior. Logs use run/type/location for support tracing without exposing secrets. Chat JSON is `Cache-Control: private, no-store, max-age=0`.

## Regression checklist

- Ask/history/clear require authenticated dashboard permission.
- No query can escape canonical tenant/location scope.
- Relative dates are restaurant-local.
- Previous chat provides continuity only; current facts are re-read.
- Tools remain read-only.
- Workforce identity is returned only through approved services/role context.
- Provider keys/secrets never enter browser JSON/operator errors.
- History isolates by user and location.
- Tenant rollout fails closed; Admin has no wildcard allowlisting.
- AI storage/provider failure does not affect restaurant operations.

---

## Documentation authority and maintenance rule

Audited on **2026-09-06** against `main` at `d6e443b88a0fd72a5727854b245d8f0678497447`, plus supplied PayMyDine engineering handoffs. Current `main` wins when older handoffs disagree. Update this README with any route, service, permission, persisted field, API, UI-state, asset-authority or cross-page invariant change.

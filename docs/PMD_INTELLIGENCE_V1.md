# PMD Intelligence V1 — production contract

PMD Intelligence is PayMyDine's shared, read-only restaurant intelligence platform.
It has two current surfaces:

1. authenticated Admin / staff intelligence;
2. public Digital Menu guest concierge.

Both surfaces share the same provider abstraction and redaction conventions, but they do **not** share data authority. Admin uses PMD operational tools. Guest AI receives only a location-filtered public menu projection.

## Current production provider

Production is currently configured explicitly with Gemini on the server. Provider choice is never controlled by the browser or model.

```dotenv
PMD_AI_ENABLED=true
PMD_AI_PROVIDER=gemini
PMD_AI_MODEL=gemini-3.1-flash-lite
GEMINI_API_KEY=<server-only secret>
PMD_AI_GEMINI_THINKING_LEVEL=minimal
```

The server must set `PMD_AI_PROVIDER` explicitly. There is no safe production fallback from a missing provider to another vendor.

Never paste API keys into tickets, chat, Git, browser JavaScript, templates, screenshots or logs.

## Security and authority contract

- Tenant, database, authenticated user and canonical location are server-owned.
- No generic SQL tool exists.
- Admin tools are read-only wrappers around existing PMD authorities.
- Guest AI cannot access owner KPIs, staff, shifts, reservations, private order data or payment administration.
- Tool output is minimized/redacted before provider submission.
- Provider response storage stays disabled (`store=false`).
- AI never becomes payment, tax/fiscal, order-state, authentication, employment or authorization authority.
- Any future write action follows: **AI proposes -> human clicks -> canonical PMD endpoint validates RBAC/state -> PMD writes -> PMD audits**.

## Production hardening

The shared runtime contains:

- `AiHealthService`: cached provider health state and circuit breaker;
- `AiUsageLedger`: persistent tenant-local, per-location/surface token/request accounting without storing raw prompts or answers;
- `PmdAiTenantPolicyService`: tenant entitlement, location rollout and budget overlay;
- `AiCapabilityPolicy`: server-owned tool filtering by authenticated PMD permissions;
- `AiBudgetService`: tenant, user and global provider-call budgets;
- `AiRetentionService`: bounded Admin/Guest chat and usage-ledger retention cleanup;
- `GuestAiContextBuilder`: deterministic menu-context compaction before provider submission;
- `GuestAiVisitBudgetService`: table/visit abuse limits without storing raw guest session identifiers;
- `AiAuditLogger`: run/provider/model/tool/latency metadata with secret redaction.

The health endpoint/state must never make a paid provider request merely to paint a green status indicator. Real traffic and explicit smoke tests update provider health.

## Fail-closed tenant rollout

`PMD_AI_ENABLED=true` is only the global platform switch. It must **not** automatically enable Admin AI for every restaurant.

For initial canaries, allow Admin AI only for named tenants:

```dotenv
PMD_AI_ADMIN_TENANT_ALLOWLIST=tomo,tomo.paymydine.com
```

For Guest AI, keep the existing explicit tenant + location gates:

```dotenv
PMD_AI_GUEST_ENABLED=true
PMD_AI_GUEST_TENANT_ALLOWLIST=tomo,tomo.paymydine.com
PMD_AI_GUEST_LOCATION_ALLOWLIST=1
PMD_AI_GUEST_ALLOW_WILDCARD=false
```

As restaurants are promoted, tenant-local `settings` become the control plane and override the server canary fallback:

- `pmd_ai_admin_enabled`
- `pmd_ai_guest_enabled`
- `pmd_ai_guest_location_allowlist`
- `pmd_ai_admin_daily_request_budget`
- `pmd_ai_guest_daily_request_budget`
- `pmd_ai_guest_visit_daily_request_budget`

This avoids an ever-growing `.env` allowlist while keeping the global server switch as an emergency kill switch.

## Multi-tenant budget defaults

```dotenv
PMD_AI_DAILY_REQUEST_BUDGET=250
PMD_AI_GLOBAL_REQUESTS_PER_MINUTE=120
PMD_AI_GLOBAL_REQUESTS_PER_DAY=20000
PMD_AI_GUEST_REQUESTS_PER_MINUTE=6
PMD_AI_GUEST_DAILY_REQUESTS_PER_IP=60
PMD_AI_GUEST_DAILY_REQUESTS_PER_VISIT=40
PMD_AI_GUEST_DAILY_REQUESTS_PER_TENANT=250
```

These are safety defaults, not product pricing. Production pricing decisions must be based on measured usage from `AiUsageLedger`, not guesses.

The persistent usage ledger stores daily aggregates only: request counts, provider-call counts, input/output/thinking/total tokens and latency by location/surface/provider/model. It stores no raw prompt or answer.

## Retention defaults

```dotenv
PMD_AI_ADMIN_CHAT_RETENTION_DAYS=90
PMD_AI_GUEST_CHAT_RETENTION_DAYS=7
PMD_AI_USAGE_RETENTION_DAYS=400
```

Maintenance is deliberately pinned to an explicit tenant. It never guesses which database to clean:

```bash
php scripts/pmd-ai-maintenance.php --tenant-host=tomo.paymydine.com
```

For a multi-tenant scheduler, invoke the command once for each explicitly selected tenant host. Cleanup touches only PMD AI conversation/usage tables in that tenant database.

## Guest AI rollout gates

Guest AI remains fail-closed and requires the global Guest switch plus tenant and location policy. The initial environment canary remains:

```dotenv
PMD_AI_ENABLED=true
PMD_AI_GUEST_ENABLED=true
PMD_AI_GUEST_TENANT_ALLOWLIST=<explicit tenants>
PMD_AI_GUEST_LOCATION_ALLOWLIST=<explicit locations>
PMD_AI_GUEST_ALLOW_WILDCARD=false
```

The guest model receives only a compact public menu projection. The source menu may contain up to `PMD_AI_GUEST_MAX_MENU_ITEMS`, but `GuestAiContextBuilder` reduces provider context to `PMD_AI_GUEST_CONTEXT_MENU_ITEMS` relevant candidates (default 28) without changing availability or inventing facts.

## Provider failure behavior

AI failure must never become PayMyDine failure.

Expected behavior:

- invalid/deleted/disabled provider credential -> circuit opens;
- suspended provider project -> circuit opens;
- repeated transient failures -> short circuit cooldown;
- quota/rate limit -> bounded cooldown;
- Digital Menu itself remains usable without AI;
- Admin restaurant operations remain usable without AI;
- public errors do not expose provider secrets, project IDs, raw stack traces or credentials.

After fixing a credential/provider issue, run an explicit smoke test and clear stale Laravel config if needed.

## Provider smoke

Use the provider-neutral runtime smoke:

```bash
php scripts/pmd-ai-provider-smoke.php
```

Never print the API key. Expected final result:

```text
PROVIDER: gemini
OUTPUT: PMD_PROVIDER_OK
RESULT: PASS
```

Then verify:

```text
/admin/pmdintelligence
/api/v1/guest-ai/status?location_id=<canary-location>
```

## CI gates

AI changes must pass:

- PHP syntax for shared AI services;
- `scripts/pmd-ai-production-contract-audit.php`;
- Guest AI source contract audit;
- Frontend V2 type/theme/source/build gates where relevant;
- existing attendance/workforce contracts when those files change.

The repository should require PR review and required CI checks on `main`. CI files existing in the repository are not enough if branch protection is disabled.

## Evaluation before model/prompt changes

Do not promote a model merely because a smoke test returns 200. Before model or major prompt changes, evaluate at least:

### Admin

- today sales summary;
- historical named date/month;
- highest sales vs highest order volume;
- live order/kitchen pressure;
- reservations today/future;
- named workforce schedule;
- actual attendance hours vs scheduled hours;
- order integrity mismatch;
- off-topic refusal;
- no fabricated cause/explanation.

### Guest

- normal recommendation;
- budget recommendation;
- vegetarian/dietary question;
- sold-out item;
- measured popularity;
- no-popularity-data UX without internal weakness disclosure;
- severe allergy safety;
- prompt extraction attempt;
- locale/RTL behavior;
- waiter/cart/checkout action markers remain allowlisted and user-clicked.

## Future surfaces

There is one Intelligence platform, not one AI engine per page.

- Orders/Waiter: current order/table/menu/KDS context, read-only first.
- Reception: arrivals, no-shows, conflicts and redacted guest-note summaries.
- Shifts: coverage gaps, attendance exceptions and workload patterns.
- KDS: deterministic/versioned ETA and demand prediction service; AI may explain predictions but does not invent them.

Never build duplicate provider clients, generic SQL agents, or isolated AI runtimes inside individual pages.

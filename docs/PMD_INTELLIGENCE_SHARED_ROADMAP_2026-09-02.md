# PMD Intelligence — shared rollout contract

Date: 2026-09-02

## Architectural rule

PayMyDine has one Intelligence platform, not one AI engine per screen.

Shared authority stays in `app/Services/AI/`:

- `AiProvider` and provider adapters own model transport.
- `AiOrchestrator` owns authenticated operational conversations and tool execution.
- `AiContext` owns tenant/user/location scope.
- `AiRedactor` owns model-bound redaction.
- `AiAuditLogger` owns audit metadata.
- `AiBudgetService` owns authenticated AI request budgets.
- `PmdReadAuthority` is the read-only bridge to existing PMD operational/report authorities.
- `GuestMenuAiService` is a deliberately isolated public adapter. It shares providers/redaction conventions but receives only a location-filtered public menu projection and has no operational tools.

No new provider client, hidden SQL agent, or independent AI runtime may be created inside Orders, Reception, Shifts or KDS.

## Phase 1 — Guest AI / Frontend V2 canary

Authority: Frontend V2 only.

Required gates before enabling a restaurant:

1. live routing proves the tenant customer host is served by Frontend V2;
2. `PMD_AI_ENABLED=true`;
3. `PMD_AI_GUEST_ENABLED=true`;
4. tenant is explicitly in `PMD_AI_GUEST_TENANT_ALLOWLIST`;
5. location is explicitly in `PMD_AI_GUEST_LOCATION_ALLOWLIST`;
6. wildcard remains disabled;
7. canary smoke passes recommendation, sold-out, severe-allergy and prompt-extraction cases;
8. all 10 V2 themes pass contract/type/theme audits.

Guest AI remains read-only. The model never mutates cart, order, payment, waiter calls or reservations. A future “add this” UX must return a controlled menu-item identifier and let the deterministic existing frontend/cart authority perform the action.

## Phase 2 — Waiter assist inside Orders workspace

Surface: current `orders` workspace only. Do not resurrect retired Waiter Workstation pages.

Use the existing authenticated `AiOrchestrator` and `AiContext` with role/location scope. Expose a waiter-specific read-only capability set from existing PMD authorities, for example:

- current table/order state;
- ready/late/attention-needed orders;
- menu availability and sold-out items;
- kitchen ETA already calculated by PMD;
- concise next-action suggestions.

No order mutation by the model. Any eventual action button must call the existing deterministic Orders/Waiter endpoint after explicit user action and permission checks.

Acceptance gate: no separate provider/service engine, no generic SQL, no cross-location data, no private owner-only KPI tool leakage.

## Phase 3 — Reception intelligence

Surface: canonical Reservations/Reception workspace.

Reuse the shared orchestrator and existing reservation authority. Read-only first:

- arrivals/no-shows/upcoming load;
- table/party conflicts visible in the current reservation authority;
- guest-note summaries with redaction;
- operational suggestions.

Do not resurrect `reservations2`, `reservations3` or other retired browser authorities. Mutations remain in the existing reservation workflow and require explicit staff action.

## Phase 4 — Staff / Shifts intelligence

Surface: canonical Shifts / staff workspace.

Read-only first:

- coverage gaps;
- schedule overlap/union results already owned by PMD;
- attendance exceptions;
- workload patterns by location/time;
- suggested checks, never automatic roster changes.

Sensitive employee data must stay minimized and role-permission scoped. The model must not receive secrets, MFA data, trusted-device data or unnecessary personal information.

## Phase 5 — KDS predictive ETA / demand

This is a prediction layer, not a second AI engine.

Start with deterministic features and measurable labels from existing order/KDS data. The model may explain predictions, but prediction generation should be a versioned PMD service with explicit feature schema, confidence and fallback behavior.

Initial outputs:

- prep-time / ready-time estimate;
- station load forecast;
- short-horizon demand signal;
- confidence and reason codes.

Required before product use: offline evaluation, tenant/location isolation, drift monitoring, confidence thresholds, fallback to existing deterministic ETA, and no autonomous kitchen/order mutation.

## Legacy retirement rule

For every concern, keep one browser authority and one server/data authority. Retirement is deletion/consolidation after proof, not another overlay.

Do not add:

- `V20`, `V21`, `final2`, `emergency` replacements;
- new MutationObserver/querySelector repair layers for first paint;
- duplicate customer AI mounts in legacy `frontend/` and Frontend V2;
- backup copies inside authoritative source directories.

Every retirement PR must identify the replacement authority, prove no route/runtime reference remains, and add a regression test before deleting tracked legacy code.

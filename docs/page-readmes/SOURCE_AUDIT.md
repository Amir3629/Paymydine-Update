# Source Audit and Documentation Provenance

## Baseline

- Repository: `Amir3629/Paymydine-Update`
- Branch: `main`
- Latest audited HEAD: `d6e443b88a0fd72a5727854b245d8f0678497447`
- Audit date: `2026-09-06`

## Sources inspected

Primary authority was current GitHub code: Admin controllers, clean-workspace base/shared services, role/report services, current payment/device/menu/settings authorities, Frontend V2 source/package/docs and recent commit history.

Supplied archives were also inspected, especially:

- Full/workspace engineering handoffs for Shifts/Team/first-paint/trusted access;
- Admin multilingual runbook;
- Payments master handoff;
- Worldline/Square deep handoff;
- VR Payment handoff;
- SumUp/terminal/guest checkout handoff;
- extracted Admin source snapshot.

## Conflict resolution rule

1. Current GitHub `main` wins for current behavior.
2. Current code comments are treated as architectural intent when implementation agrees.
3. Handoffs supply rationale, deployment lessons, invariants and historical context.
4. A handler/service found only in an older snapshot is not documented as current unless current code still exposes it.

The most important example is PMD Intelligence: older snapshots contain a broad write/control center; current `Pmdintelligence.php` is a read-only operations copilot. The current README documents the latter.

## Moving-main parity check

The audit began at clean VPS sync `602b677a1bc775b634f731390792225faed66401`. `main` advanced while documentation was being produced. The delta through `d6e443b88a0fd72a5727854b245d8f0678497447` was reviewed before delivery.

Material changes in that delta:

- AI production hardening: tenant-local/canary policy, bounded budgets, provider health/circuit breaker, persistent usage ledger, capability filtering, retention/maintenance safety and production UX/CI tooling.
- Dashboard onboarding presentation: the one-time welcome/Quick setup experience became a centered modal with blurred backdrop while preserving action behavior.

Those changes are incorporated in the AI and Owner Dashboard READMEs. No other requested page authority materially changed in that delta.

## High-confidence architecture conclusions

- Product clean URLs intentionally map to historical internal controller names on several Admin pages.
- Server-first first paint and removal of competing browser authorities are deliberate across Dashboard, Shifts, Settings/Menu and Frontend V2.
- Shared Floor spans Owner, Manager, Orders and Reservations; Accountant intentionally disables Floor.
- Menu visible controller is not food/combo write authority.
- Devices visible controller composes a clean UI while mature specialized controllers own create/edit writes.
- Payments configuration and transaction settlement are separate layers.
- Frontend V2 is an independent Next.js package with ten isolated themes and an explicit Laravel backend contract.
- AI current Admin surface is read-only even though historical experiments included broader actions.

## Limitation

These READMEs are an engineering map, not a substitute for automated tests or schema inspection on a target tenant. PayMyDine intentionally supports tenant schema evolution and market-specific configuration, often guarded by `Schema::hasTable/hasColumn`. Before a destructive migration, provider cutover or production data repair, verify actual target tenant schema/config and deployment state.

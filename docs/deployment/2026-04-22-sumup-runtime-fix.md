# Deployment Notes — 2026-04-22 — SumUp card runtime strictness

## Scope
- `app/admin/routes.php`
- `app/admin/models/Payments_model.php`

## What changed
1. Runtime card method loading now normalizes `supported_providers` against the method/provider matrix and auto-reconciles with persisted `provider_code` where valid.
2. Runtime resolver now checks selected provider against normalized `supported_providers` to prevent stale provider drift.
3. Payment method admin persistence now writes canonical `supported_providers` per method and includes selected `provider_code` when valid.
4. Card create-session now records explicit SumUp resolver-selection diagnostics and explicit final-response diagnostics on the `sumup` log channel.
5. SumUp create-session payload now sends validated request currency and returns a strict success/error mapping with provider metadata.

## Deploy/verify checklist
- Clear config/cache if applicable:
  - `php artisan config:clear`
  - `php artisan cache:clear`
- Verify runtime selection:
  - `GET /api/v1/payments/debug/availability-trace`
  - ensure `card` resolves to `provider_code=sumup` when configured/enabled.
- Verify session flow:
  - `POST /api/v1/payments/card/create-session` with `amount`, `currency`, `order_id`.
- Verify logs (`storage/logs/sumup.log`):
  - `SUMUP_CARD_RESOLVER_SELECTION`
  - `SUMUP_CREATE_SESSION_REQUEST`
  - `SUMUP_CREATE_SESSION_RESPONSE`
  - `SUMUP_CREATE_SESSION_FINAL_RESPONSE`

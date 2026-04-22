# Deployment Note — Final cleanup (2026-04-22)

## Files to deploy for this step
- `app/admin/routes.php`

## Why
- Fixes misplaced admin routes for `terminal_devices`/`sumup/test` that were registered outside the `/admin` route group, restoring correct admin prefix, middleware, and layout context.
- Keeps SumUp create-session success mapping behavior intact (`2xx + checkout_id => success:true`) with no POS-sync reintroduction.

## Minimal verification
- Open `/admin/terminal_devices` and confirm Terminal Devices list/form renders in normal admin context.
- Verify `/admin/sumup/test` resolves under admin prefix.
- Verify SumUp online card create-session still returns `success:true` for upstream `201 Created` + checkout id.

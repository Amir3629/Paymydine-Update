# Deployment Notes — 2026-04-22 — SumUp create-session final-response fix

## Scope (this patch only)
- `app/admin/routes.php`
- `frontend/components/payment/sumup-hosted-checkout.tsx`

## Root cause fixed
In `POST /api/v1/payments/card/create-session` (SumUp branch), success detection used `$sumupResponse->ok()`.
In Laravel HTTP client, `ok()` is strict for HTTP 200 only; successful `201 Created` responses were treated as failures and mapped to `sumup_error` in final response.

## What changed
1. SumUp upstream success detection now uses `successful()` (2xx) and requires `checkout_id` presence for successful creation mapping.
2. Final response envelope now returns frontend aliases consistently:
   - `success`, `provider`, `checkout_id`, `checkout_url`, `hosted_checkout_url`, `redirect_url`, `status`, `raw_body`.
3. Redirect resolution priority is now:
   - `hosted_checkout_url`
   - `checkout_url`
   - fallback URL candidates from documented-style payload/link structures.
4. `SUMUP_CREATE_SESSION_FINAL_RESPONSE` log now emits in both success and failure paths, with `success:true` on successful 2xx + valid checkout id.
5. Frontend SumUp checkout now redirects immediately when backend returns `success:true` and any redirect URL alias (`redirect_url`, `hosted_checkout_url`, `checkout_url`).
6. If no redirect URL exists but `checkout_id` exists, frontend shows a safe message while backend returns widget-ready metadata (`widget_ready: true`).

## Deploy/verify checklist
- Clear caches if your deploy process requires it.
- Verify endpoint behavior with real SumUp response status `201`:
  - `POST /api/v1/payments/card/create-session`
  - confirm response includes `success:true` and `status:201`.
- Verify log stream (`storage/logs/sumup.log`) contains:
  - `SUMUP_CREATE_SESSION_REQUEST`
  - `SUMUP_CREATE_SESSION_RESPONSE`
  - `SUMUP_CREATE_SESSION_FINAL_RESPONSE` (with `success:true` for successful creations).
- Verify frontend redirects to SumUp when backend returns any of:
  - `redirect_url`, `hosted_checkout_url`, `checkout_url`.

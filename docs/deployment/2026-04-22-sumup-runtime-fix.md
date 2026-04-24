# Deployment Note — SumUp online guest checkout completion

## Files to deploy (this step only)
- `app/admin/routes.php`
- `frontend/components/payment/sumup-hosted-checkout.tsx`

## Root cause
- The backend correctly created SumUp checkouts (`201` + `checkout_id`), but this flow did not always return redirect URLs.
- The frontend only handled redirect URLs and had no production widget-processing path using `checkout_id`.

## Implementation choice
- **A) SumUp Payment Widget using `checkout_id`** (aligned with SumUp docs for create-checkout + widget processing).
- Redirect is still used when available; widget is used when redirect URLs are absent.

## Post-deploy steps
- Frontend: build and restart web app (`npm run build`, then restart Next.js process).
- Backend: clear caches if needed (`php artisan optimize:clear`).

## Minimal verification
1. Select card payment with provider `sumup` on menu frontend.
2. Confirm `/api/v1/payments/card/create-session` returns `success:true` and `checkout_id`.
3. If no redirect URL is returned, SumUp widget mounts and processes payment.
4. Confirm logs include:
   - `SUMUP_CREATE_SESSION_FINAL_RESPONSE`
   - `SUMUP_WIDGET_EVENT`
   - `SUMUP_CHECKOUT_STATUS`

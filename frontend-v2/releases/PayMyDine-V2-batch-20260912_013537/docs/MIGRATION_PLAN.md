# Migration Plan

## Phase 1 — Parallel foundation

- Keep current frontend and backend unchanged.
- Deploy this package on 3002.
- Compare payload normalization with current 3001 behavior.
- Add contract fixtures from Mimoza without credentials or secrets.

## Phase 2 — Operational parity

- Table/QR context
- Menu and options
- Personal cart
- Shared table draft
- Kitchen submission
- Multi-device sync
- Waiter, note and valet
- VAT, tip and coupon
- Split bill
- Provider-by-provider payment verification

## Phase 3 — Admin publishing

- Add the 10 canonical IDs to the Admin Theme selector.
- Store structured Theme options.
- Remove duplicate `/simple-theme` responders only after a live route audit.
- Introduce a canonical `/api/v2/customer/bootstrap` when safe.

## Phase 4 — Canary

- One preview hostname.
- One test tenant.
- One real restaurant only after owner approval.
- Monitor errors, provider callbacks, order totals and notification delivery.

## Phase 5 — Production cutover

- Switch Nginx customer upstream from 3001 to 3002.
- Keep the old process and build for immediate rollback.
- Do not delete legacy CSS or the old frontend until production has remained stable through multiple service periods.

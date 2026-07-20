# PayMyDine Frontend Current State

## Status

The customer frontend builds and typechecks successfully. The main customer menu now uses separated theme route files for each active theme.

## Active Theme Routes

- Gold Luxury: `frontend/features/customer-menu/theme/GoldThemeRoute.tsx`
- Modern Green: `frontend/features/customer-menu/theme/ModernGreenThemeRoute.tsx`
- Organic Botanical Paper: `frontend/features/customer-menu/theme/OrganicThemeRoute.tsx`
- Kazen Japanese: `frontend/features/customer-menu/theme/KazenThemeRoute.tsx`

## Main Structure

- `frontend/app/` — Next.js routes and API routes
- `frontend/components/` — shared UI components
- `frontend/components/themes/` — visual theme components
- `frontend/features/customer-menu/` — customer menu controller, checkout, guest actions, theme routes
- `frontend/features/checkout/` — shared checkout calculation utilities
- `frontend/features/table-order/` — table order draft logic
- `frontend/lib/` — API client, theme utilities, payment service
- `frontend/store/` — Zustand stores
- `frontend/styles/` — global and theme CSS
- `frontend/types/` — local TypeScript declarations

## Important Caution Areas

Do not casually refactor these files without build/typecheck and manual QA:

- `frontend/features/customer-menu/checkout/PaymentModal.tsx`
- `frontend/lib/payment-service.ts`
- `frontend/app/api/payments/`
- `frontend/features/customer-menu/legacy-dom-repairs/`
- `frontend/store/cart-store.ts`

## Current Technical Debt

- `PaymentModal.tsx` is large and should be split only after checkout smoke tests exist.
- Some theme route props are still broad typed; this is acceptable for now after live refactor.
- `legacy-dom-repairs/` should be replaced gradually with normal React/CSS fixes.
- Dev/test routes should be reviewed before final production cleanup.

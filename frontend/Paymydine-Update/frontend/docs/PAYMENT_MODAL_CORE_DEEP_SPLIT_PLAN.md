# PaymentModalCore Deep Split Plan

Current status:

- PaymentModal.tsx is already a tiny entrypoint.
- PaymentModalCore.tsx is the active checkout controller and is still large.
- Checkout panels are already split behind canonical boundaries:
  - CheckoutReviewPanel.tsx
  - CheckoutSplitPanel.tsx
  - CheckoutPaymentPanel.tsx
  - CheckoutReceiptPanel.tsx
- Playwright checkout E2E exists and passes.
- Real payment submit is intentionally not automated in Playwright.

## Rule

Do not move payment state or provider submit logic in one large change.

## Safe next extraction order

1. Extract non-payment UI/controller helpers from PaymentModalCore.tsx.
2. Extract checkout step transition helpers.
3. Extract submitted snapshot/order status helpers.
4. Only after those are stable, consider a focused checkout state store.
5. Payment provider submit logic must remain guarded by checkout E2E and manual provider QA.

## Validation after every extraction

Run:

npm run e2e:checkout:guard
PMD_E2E_BASE_URL="https://mimoza.paymydine.com" npm run e2e:checkout
npm run checkout:safety
npm run checkout:architecture
npm run build
node node_modules/typescript/bin/tsc --noEmit --pretty false
npm run smoke:prod
npm run frontend:acceptance

# PaymentModal decomposition status

The active checkout entrypoint is intentionally tiny:

- `features/customer-menu/checkout/PaymentModal.tsx` re-exports `PaymentModalCore`.
- `PaymentModalCore.tsx` is now the checkout orchestrator, not the place for every panel implementation.
- Review, split bill, payment, order status, provider forms, hosted checkout and payment flow live in focused files under `features/customer-menu/checkout/`.

## Owner files

- `CheckoutShellRouter.tsx` routes visual checkout shells.
- `NeutralCheckoutShell.tsx` owns neutral shell layout.
- `NeutralReviewPanels.tsx` owns review panels.
- `NeutralSplitBillPanel.tsx` owns split-bill panels.
- `NeutralPaymentPanel.tsx` owns payment method panel UI.
- `NeutralOrderStatusPanel.tsx` owns submitted/paid order status UI.
- `PaymentMethodForm.tsx` owns provider-specific payment form rendering.
- `paymentModalPaymentFlow.ts` owns payment submission side effects.
- `paymentModalVisualStyles.ts` owns checkout button class/style compatibility.
- `paymentModalContextLabels.ts` owns table/order context labels.

## Guard

Run:

```bash
npm run checkout:architecture
```

This prevents `PaymentModal.tsx` from becoming a monolith again and verifies the extracted panel/helper files are present.

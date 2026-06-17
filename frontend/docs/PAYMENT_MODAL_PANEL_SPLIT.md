# PaymentModal panel split

## 2026-06-17 safe panel-boundary split

PaymentModal is the live checkout/payment entrypoint, so this phase avoids changing payment flow behavior.

This step formalizes panel boundaries without moving payment logic:

- `CheckoutReviewPanel.tsx` wraps the existing neutral review panel.
- `CheckoutSplitPanel.tsx` wraps the existing neutral split-bill panel.
- `CheckoutPaymentPanel.tsx` wraps the existing neutral payment panel.
- `CheckoutReceiptPanel.tsx` wraps the existing neutral order status / receipt panel.
- `NeutralCheckoutShell.tsx` now depends on the canonical panel names.
- `ThemedCheckoutShellRoutes.tsx` owns Kazen and Modern Green shell routing.
- `CheckoutShellRouter.tsx` is now a small router that delegates to themed routes or the neutral shell.

`PaymentModalCore.tsx` remains the payment controller for now. The next safe step is to add E2E checkout coverage before moving payment state into a checkout store or reducing PaymentModalCore toward a 200-line shell.

# Modern Green — Restaurant Menu Theme

A premium, dark, mobile-first restaurant menu + ordering **theme/presentation
layer**. Green accent (`#29BC7E`), dark green-black background, glassy cards.

This package is **presentation only**. It holds no business logic — no API
calls, no payment processing, no split-bill math, no totals computation, no
tenant/domain detection, and no checkout flow logic. Everything is driven by
**props and callbacks** so it can be wired into an existing codebase.

## Folder

```
components/themes/modern-green/
├── index.ts                        → public barrel (import everything here)
├── types.ts                        → data contracts (MenuItem, OrderSummary, …)
├── sample-data.ts                  → DEMO data so the theme renders complete
├── primitives.tsx                  → shared building blocks (see below)
├── ModernGreenMenuShell.tsx        → menu page shell (header/hero/search/categories)
├── ModernGreenMenuSections.tsx     → menu sections + item cards (green "+" button)
├── ModernGreenThemeActions.tsx     → sticky bottom toolbar (Waiter / Note / Checkout)
├── ModernGreenCheckoutCards.tsx    → 3A order review + 3B order status
├── ModernGreenPaymentCards.tsx     → 3C payment (summary, tip, coupon, methods, card form)
├── ModernGreenSplitBillCards.tsx   → 3D split bill + 3E review split
├── ModernGreenWaiterCards.tsx      → 3F call waiter
├── ModernGreenNoteCards.tsx        → 3G note / request
├── ModernGreenValetCards.tsx       → 3H valet form + success state
└── ModernGreenDemo.tsx             → DEMO harness only (delete in production)
```

Theme styles live under the `.modern-green-theme` scope in `app/globals.css`
(`.mg-glass`, `.mg-glass-strong`, overlay/sheet animations). Wrap any themed
surface in an element with the `modern-green-theme` class so the CSS variables apply.
`ThemeModal` already applies `modern-green-theme` to its portal content.

## Which component does what

| Area              | Component(s) |
|-------------------|--------------|
| **Menu shell**    | `ModernGreenMenuShell`, `ModernGreenMenuSections`, `ModernGreenThemeActions` |
| **Checkout cards**| `ModernGreenOrderReviewCard` (review), `ModernGreenOrderStatusCard` (status) |
| **Payment cards** | `ModernGreenPaymentCard` + parts: `ThemeTipSelector`, `ThemeCouponField`, `ThemePaymentMethodGrid`, `ThemeCardPaymentForm` |
| **Split bill cards** | `ModernGreenSplitBillCard` (choose split), `ModernGreenReviewSplitCard` (confirm payer) |
| **Waiter / note / valet** | `ModernGreenWaiterCard`, `ModernGreenNoteCard`, `ModernGreenValetCard` + `ModernGreenValetSuccessCard` |

## Shared primitives

- `ThemeCardFrame` — glassy surface wrapper
- `ThemeActionButton` — canonical themed button (`primary`/`secondary`/`ghost`/`outline`)
- `ThemeActionSlot` — named placeholder where the host injects a wired action
- `ThemePill` — table / language / category / valet pills
- `ThemeBadgeChip` — small item badges (Bestseller / New)
- `ThemeModal` — bottom-sheet on mobile, centered dialog on desktop (controlled)
- `ThemeStepper` — round +/- control (quantities, guest count, shares)
- `ThemeSummaryRow`, `ThemeDivider`, `ThemeInput`, `ThemeTextarea`

## Integration rules (followed by this theme)

- Every button/action accepts a callback via props (`onCheckout`, `onCallWaiter`,
  `onOpenNote`, `onOpenValet`, `onSelectMethod`, `onReviewSplit`, …).
- Every card/modal receives its data via props (`lines`, `totals`, `order`,
  `guests`, `methods`, …).
- Price formatting is delegated to a `formatPrice` callback — no currency/locale
  is hardcoded.
- Open/close of every overlay is controlled by the host (`open` + `onClose`).
- No totals, tip amounts, split amounts, or discounts are computed here; they are
  passed in already-computed.

## Usage

```tsx
import {
  ModernGreenMenuShell,
  ModernGreenMenuSections,
  ModernGreenThemeActions,
  ThemeModal,
  ModernGreenPaymentCard,
} from "@/components/themes/modern-green"

// Supply your own data + callbacks; formatPrice controls currency/locale.
<ModernGreenMenuShell
  categories={categories}
  activeCategory={active}
  onSelectCategory={setActive}
  onCheckout={openCheckout}
>
  <ModernGreenMenuSections
    sections={sections}
    formatPrice={formatPrice}
    onAddItem={addItem}
  />
</ModernGreenMenuShell>
```

See `ModernGreenDemo.tsx` for a complete wiring example of every modal/card
state. **`ModernGreenDemo.tsx` and `sample-data.ts` are for demonstration only**
— replace them with your real data and handlers when integrating.

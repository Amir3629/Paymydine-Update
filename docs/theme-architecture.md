# PayMyDine Theme Architecture

## Current problem

PayMyDine currently has working customer flows, but theme responsibility is spread across too many places:

- `frontend/app/menu/page.tsx` contains theme detection, Organic iframe embedding, checkout, table order, payment, waiter/note modals, split bill behavior, and runtime style patches.
- `frontend/app/globals.css` contains broad selectors and one-off overrides that can affect more than one theme.
- Gold Luxury is mostly implemented in the main frontend.
- Organic Botanical Paper is currently special-cased and still depends on the v0 iframe prototype for the menu experience.
- Theme selection is loaded client-side after initial render, which can cause a short flash of default/old styling before the selected theme is applied.

This creates three risks:

1. A visual fix for one theme can leak into another theme.
2. Business flows are harder to reuse because they are coupled to specific cards, modals, and style patches.
3. Future themes would likely duplicate checkout/order/payment logic instead of sharing it.

## Correct future architecture

The target architecture is one main frontend with multiple theme UI layers:

```text
frontend/
  features/
    cart/
    checkout/
    order/
    payment/
    waiter/
    note/
    valet/
  components/
    shared/
    themes/
      gold-luxury/
      organic-botanical-paper/
  lib/
    theme-registry.ts
  styles/
    customer/themes/
```

Business functionality should live in shared hooks/services. Theme components should only decide how that functionality looks.

## Shared logic vs theme UI

Shared logic should include:

- Cart state and item quantity changes.
- Checkout step state.
- Table draft/order submission.
- Existing order payment and payment provider submission.
- Split bill calculations and selected payer state.
- Waiter call submission.
- Table note submission.
- Valet request submission.
- Order status polling/display data.

Theme UI should include:

- Menu top bar, category navigation, cards, and product modal layout.
- Checkout card visual design.
- Table Order, My Order, Order Status, Split Bill, and Payment card appearance.
- Waiter and note modal appearance.
- Valet entry button/card/page appearance.
- Button shapes, typography, spacing, and theme-scoped CSS variables.

A theme component should receive shared state/actions as props, for example:

```tsx
<CheckoutController>
  {(checkout) =>
    theme.id === "organic_botanical_paper"
      ? <OrganicCheckoutCard checkout={checkout} />
      : <GoldCheckoutCard checkout={checkout} />
  }
</CheckoutController>
```

The controller owns behavior. The theme card owns presentation.

## Why one frontend is better than separate PM2 theme apps

Separate PM2 apps are useful for prototypes, but they are not the right long-term production architecture for themes because they create:

- Separate deployment and routing concerns.
- Iframe or cross-app message contracts.
- Split UI state between parent and child apps.
- Higher risk that cart/order/payment behavior drifts between themes.
- More places to patch when checkout, payment, or table-order rules change.

One frontend with isolated theme components keeps behavior consistent while still allowing each theme to look different.

## Shared checkout/order/payment/waiter/note/valet model

Future shared modules should expose stable actions such as:

- `addItem`, `removeItem`, `updateQuantity`, `clearCart`.
- `confirmTableItems`, `submitTableOrder`, `refreshTableDraft`.
- `startPayment`, `finalizePayment`, `payExistingOrder`.
- `startSplit`, `assignSplitItem`, `paySplitShare`.
- `callWaiter`.
- `sendTableNote`.
- `createValetRequest`.

Theme components should call these shared actions and never reimplement backend submission rules.

## Theme-specific cards and buttons

Theme cards/buttons should be implemented as theme components with scoped styles. They should not rely on global DOM selectors or runtime style mutation.

Good pattern:

- `GoldCheckoutCard` and `OrganicCheckoutCard` both receive the same checkout model.
- `GoldWaiterModal` and `OrganicWaiterModal` both call the same `callWaiter` action.
- `GoldValetEntry` and `OrganicValetEntry` both call or route to the same shared valet request flow.

Bad pattern:

- One theme querying the DOM and repainting another theme's cards.
- Business logic copied into a v0 prototype.
- Hostname, tenant, or domain being used to decide visual theme.

## Flicker prevention

The selected theme should be known before first paint whenever possible.

Preferred future options:

1. Resolve theme server-side and render `<html data-theme="...">` with the selected theme on the initial response.
2. If server-side resolution is not available, use one canonical prepaint script that reads one canonical localStorage key and sets `data-theme` before CSS paints.
3. Keep complete CSS variable definitions available for each theme in static CSS.
4. Avoid multiple competing theme defaults and tenant-specific localStorage shortcuts.

Theme selection should come from backend/admin configuration and normalized aliases, not from host/domain special cases.

## MVP plan

For MVP, keep behavior stable and avoid a large rewrite:

1. Document the target architecture.
2. Add a typed theme registry and normalization helpers.
3. Keep `/valet` available for every theme.
4. Fix valet submission to use the backend API when implementing Phase 1.
5. Keep the Organic v0 iframe temporarily, but do not add more runtime DOM hacks.
6. Make theme prepaint deterministic and canonical when safe.

## Post-MVP plan

After MVP:

1. Extract checkout/order/payment hooks from `frontend/app/menu/page.tsx`.
2. Create theme-specific checkout, waiter/note, menu, toolbar, and valet components.
3. Migrate Organic v0 UI into the main frontend.
4. Remove iframe dependency only after native Organic UI is feature-complete.
5. Replace broad global CSS and MutationObserver style hacks with scoped theme CSS/components.

## Final theme UI shell foundation

The theme UI layer is now split from shared functionality:

- `frontend/features/*` contains shared PayMyDine functionality: checkout calculations, checkout state helpers, split-bill helpers, payment-method helpers, payment summary helpers, table-order hooks/actions, valet request hooks, and menu action adapters.
- `frontend/components/themes/*` contains visual theme UI: shell components, section slots, action slots, and theme-specific action buttons.
- `frontend/components/themes/theme-renderer.tsx` maps normalized theme ids to visual component sets. The renderer uses `theme-registry` and must not use host/domain decisions.

Theme components should receive `ThemeMenuActions`, `ThemeCheckoutActions`, and typed state props. They should render the restaurant-specific visual experience only. Checkout/payment/order/valet behavior should remain in shared feature hooks and controllers until a dedicated safe extraction phase moves controller logic into shared modules.

For MVP, keep `frontend/app/menu/page.tsx` as the production orchestrator while moving non-payment visual sections into Gold and Organic slots one at a time. PaymentModal JSX, payment provider submit flows, final order submit, and split-payment submit should remain in `menu/page.tsx` until a separate payment controller phase.

# Customer Frontend Clean Rebuild Audit

Date: 2026-05-31
Branch: `codex/customer-frontend-clean-rebuild-gold`

## Executive decision

This audit confirms the requested clean rebuild is too large and risky to complete safely as a single follow-up patch. The current customer frontend is not failing because of one missing selector; it is failing because several generations of CSS, runtime DOM mutation helpers, theme systems, and Framer Motion patterns all operate on the same customer DOM.

Per instruction, implementation should stop after this audit and proceed only with a planned, staged rebuild. Do not add more override CSS to `globals.css` and do not continue wrapping old checkout JSX with new shells.

## Commands run

### 1. CSS file sizes

Command:

```bash
find frontend -name "*.css" -not -path "*/node_modules/*" -not -path "*/.next/*" -print0 | xargs -0 wc -l | sort -n
```

Key result:

```text
     6 frontend/styles/customer/index.css
    23 frontend/styles/customer/themes/clean-light.css
    23 frontend/styles/customer/themes/minimal.css
    23 frontend/styles/customer/themes/modern-dark.css
    23 frontend/styles/customer/themes/vibrant-colors.css
    32 frontend/styles/customer/base.css
    48 frontend/styles/customer/themes/gold-luxury.css
    89 frontend/app/nuclear-fix.css
   248 frontend/app/globals-clean.css
   289 frontend/components/customer-checkout/CheckoutModalV3.css
   367 frontend/styles/globals.css
  1283 frontend/app/globals-backup.css
 11980 frontend/app/globals.css
 14434 total
```

### 2. Broad dangerous CSS selector audit

Command:

```bash
grep -RIn "body \|body:has\|\[role=\"dialog\"\]\|\[data-theme\].*button\|\[data-theme\].*span\|\[data-theme\].*div\|surface-sub\|surface.rounded\|!important\|text-fill-color\|-webkit-text-fill-color" frontend/app frontend/components frontend/styles --include="*.css" --include="*.tsx" --include="*.ts" | sed -n '1,260p'
```

Representative findings:

- `frontend/app/globals.css` and `frontend/app/globals-backup.css` contain many `!important`, `-webkit-text-fill-color`, `[data-theme]`, `surface`, `surface-sub`, and modal override selectors.
- `frontend/app/nuclear-fix.css` contains broad selectors like `[data-theme] button`, `[data-theme] span`, and `[data-theme] div[class*="surface"]`.
- `frontend/app/checkout/page.tsx`, `frontend/app/menu/page.tsx`, `frontend/components/payment-flow.tsx`, and payment components still use `surface` / `surface-sub` classes.
- The old customer styling system is not isolated. It relies on global theme attributes and legacy utility classes.

### 3. Runtime style mutation audit

Command:

```bash
grep -RIn "style.setProperty\|MutationObserver\|setInterval\|setTimeout\|document.querySelectorAll\|document.body\|getComputedStyle\|data-theme" frontend/app frontend/components frontend/lib frontend/store | sed -n '1,260p'
```

Representative findings:

- `frontend/app/layout.tsx` contains inline scripts such as `fixModalCards`, modal info card fixes, and waiter/note modal fixes that use `document.querySelectorAll` and `style.setProperty`.
- `frontend/components/language-switcher.tsx` reads computed CSS variables and writes inline `!important` styles to action buttons, badges, prices, cards, and overlays.
- `frontend/components/clean-light-customer-guard.tsx` applies repeated timed style mutations and event-triggered style cleanup/reapplication for customer paths.
- `frontend/app/menu/page.tsx` contains many checkout-specific effects using `document.querySelector('[data-pmd-checkout-scroll="1"]')`, `setTimeout`, `MutationObserver`, and direct `style.setProperty` calls. These are legacy patch systems, not clean UI architecture.
- `frontend/components/payment/secure-payment-form.tsx` contains direct DOM hiding and style normalization logic for payment form internals.

### 4. Motion/layout animation audit

Command:

```bash
grep -RIn "framer-motion\|motion\.\|AnimatePresence\|layoutId\|layout=\|whileHover\|whileTap\|scale:\| y:\| x:\|height.*auto\|active:scale\|hover:-translate\|group-hover:translate" frontend/app frontend/components | sed -n '1,260p'
```

Representative findings:

- `frontend/app/menu/page.tsx` imports `framer-motion` and still contains many `motion.div`, `AnimatePresence`, and motion button usages outside and inside customer UI.
- Checkout-related sections still contain old `AnimatePresence` and motion wrappers, even after V3 shell work.
- `frontend/app/checkout/page.tsx`, `frontend/components/payment-flow.tsx`, and `frontend/components/payment/secure-payment-flow.tsx` contain `height: "auto"`, `whileHover`, `whileTap`, and scale animations.
- Customer entry pages (`frontend/app/page.tsx`, table pages, food toolbar) use hover scale/y motion patterns that conflict with a no-transform customer UI strategy.

### 5. Customer page dependency audit

`frontend/app/menu/page.tsx` imports a large mix of business logic and UI/styling concerns:

Business/data/payment dependencies that must be preserved:

- `@/lib/currency` (`formatCurrency`)
- `@/lib/data` (`MenuItem`, menu/category data loaders)
- `@/store/language-store`
- `@/store/cms-store`
- `@/store/cart-store`
- `@/lib/api-client` (`ApiClient`, payment method and table draft types)
- `@/lib/payment-icons`
- `@stripe/react-stripe-js`, `@stripe/stripe-js`
- `@paypal/react-paypal-js`
- `@/components/payment/secure-payment-form`
- `@/components/payment/sumup-hosted-checkout`
- table URL/query helpers and websocket/API clients

UI/styling dependencies that should move behind clean customer components:

- `framer-motion`
- `lucide-react` icons used directly throughout page JSX
- `@/components/ui/button`, `Input`, `Label`, `Textarea`, Dialog primitives
- `Logo`, `CartSheet`, `CategoryNav`, `MenuItemModal`, food display components
- `clsx`, `cn`, many Tailwind class strings in page JSX
- `CheckoutModalV3` shell (currently only wraps legacy checkout content and is not sufficient)

## Answers required by audit

### Why `globals.css` became huge

`globals.css` became a dumping ground because each visible customer regression was handled with another global or semi-global override. The file now contains:

- multiple customer theme systems (`clean-light`, `modern-dark`, `gold-luxury`, `vibrant-colors`, `minimal`),
- old modal/card patches,
- `surface` / `surface-sub` patches,
- button/action patches,
- checkout-specific lockdown blocks,
- broad `[data-theme]` selectors,
- `!important` and `-webkit-text-fill-color` fixes,
- one-off emergency sections appended after earlier patches.

This creates cascade races: old rules paint one value, later rules paint another, and runtime helpers can still write inline styles after first render.

### Which CSS blocks are obsolete

Likely obsolete for a Gold-only customer rebuild:

- old multi-theme customer CSS in `frontend/app/globals.css`, especially clean-light/modern-dark/vibrant/minimal customer surface overrides,
- old checkout lockdown blocks (`PMD_CHECKOUT_LOCKDOWN_V2`, `data-pmd-checkout-lockdown`) once the real V3 checkout is complete,
- broad `[data-theme]` button/span/div/surface rules,
- `nuclear-fix.css`,
- `globals-backup.css` and `globals-clean.css` if they are not imported,
- the current `CheckoutModalV3.css` as a temporary bridge if replaced by `frontend/customer/styles/customer-gold.css`.

These should not be deleted blindly. They should first be moved to `frontend/app/globals.legacy.css` and not imported, then tested customer/admin routes separately.

### Which runtime helpers are dangerous

Dangerous or incompatible with the clean customer target:

- `fixModalCards` and related modal style scripts in `frontend/app/layout.tsx` because they query broad modal/card selectors and write inline styles.
- `fixModalInfoCards` and waiter/note modal scripts in `layout.tsx` for the same reason.
- `LanguageSwitcher` inline theme fixes in `frontend/components/language-switcher.tsx`, because it queries action/card/price selectors and writes `!important` inline colors.
- `CleanLightCustomerGuard` in `frontend/components/clean-light-customer-guard.tsx`, because it targets customer routes and applies timed/event-driven style changes.
- Checkout-specific DOM patch effects in `frontend/app/menu/page.tsx`, because they use `setTimeout`, `MutationObserver`, and style mutations to correct UI after render.
- Payment form DOM cleanup in `frontend/components/payment/secure-payment-form.tsx`, which may be necessary for provider internals but must be contained to provider-specific wrappers.

### Which components still use legacy `surface` / `surface-sub` / theme classes

Known examples from grep:

- `frontend/app/menu/page.tsx`
- `frontend/app/checkout/page.tsx`
- `frontend/components/payment-flow.tsx`
- `frontend/components/payment/secure-payment-flow.tsx`
- `frontend/components/payment/worldline-inline-grid-button.tsx`
- `frontend/components/payment/secure-payment-form.tsx`
- `frontend/components/menu-item-modal.tsx`
- `frontend/components/menu-item-card.tsx`
- legacy backup files under `frontend/app/*.backup*` and `frontend/app/globals-backup.css`

### Which sections of `menu/page.tsx` mix business logic with UI

The entire file is currently both controller and view. High-risk mixed areas include:

- checkout/payment modal state and rendering (`PaymentModal`),
- split bill calculation and split bill JSX,
- payment method loading/selection and payment method JSX,
- table draft/order status data handling and status JSX,
- menu item cards, toolbar, cart controls, note/waiter dialogs,
- runtime styling effects interleaved with checkout business state.

This makes it hard to preserve payment/order behavior while changing layout because UI changes and business behavior share the same component scope.

### What can be removed immediately

Safe immediate removals only after a new Gold customer app is wired and tested:

- customer use of multi-theme selectors and runtime theme mutation helpers on `/`, `/menu`, `/table/*`, `/valet`,
- old checkout DOM marker/style effects that query `data-pmd-checkout-scroll`,
- unused backup CSS files if not imported,
- old checkout lockdown CSS after no rendered customer component uses `data-pmd-checkout-lockdown`,
- Framer layout/height/scale hover effects from customer surfaces.

### What must be preserved for order/payment functionality

Must preserve:

- cart store semantics and quantity updates,
- table context and shared table draft/order status state,
- order confirmation and table draft submission handlers,
- payment method API loading/filtering,
- Stripe/PayPal/SumUp/Worldline provider wrappers and callbacks,
- tip/coupon calculations and state,
- split bill calculations and selected payer/share state,
- `ApiClient`, websocket, table URL, sticky query behavior,
- tax/VAT and currency formatting logic.

## Proposed clean rebuild plan

### Stage 1: Create clean Gold foundation without switching routes

Create the requested `frontend/customer/` tree:

```text
frontend/customer/
  theme/goldTokens.ts
  theme/GoldThemeProvider.tsx
  styles/customer-gold.css
  components/CustomerShell.tsx
  components/CustomerHeader.tsx
  components/CustomerButton.tsx
  components/CustomerCard.tsx
  components/CustomerModal.tsx
  components/CustomerInput.tsx
  components/CustomerBadge.tsx
  components/CustomerQuantityControl.tsx
```

Add `[data-pmd-customer-app="gold-v1"]` root scoping and import `customer-gold.css` once.

### Stage 2: Extract menu controller vs view

Split `frontend/app/menu/page.tsx` into:

- controller/data/state hooks in `page.tsx`,
- `frontend/customer/menu/MenuPageView.tsx`,
- `MenuCategoryNav.tsx`,
- `MenuItemCard.tsx`,
- `MenuItemDetailsModal.tsx`.

No business logic changes; only prop passing.

### Stage 3: Rebuild checkout as real components

Create:

```text
frontend/customer/checkout/CheckoutFlow.tsx
frontend/customer/checkout/CheckoutMyOrder.tsx
frontend/customer/checkout/CheckoutOrderStatus.tsx
frontend/customer/checkout/CheckoutPayment.tsx
frontend/customer/checkout/CheckoutSplitBill.tsx
frontend/customer/checkout/CheckoutSummary.tsx
frontend/customer/checkout/CheckoutPaymentMethods.tsx
```

Pass existing callbacks/state from `page.tsx`. Do not render old checkout JSX. Do not use `surface`, `surface-sub`, old lockdown, old `data-pmd-checkout-scroll`, or Framer layout/height/scale animation.

### Stage 4: Disable customer runtime style mutators

For routes under `[data-pmd-customer-app="gold-v1"]`, disable:

- `fixModalCards`,
- modal info card helper,
- waiter/note modal helper,
- `LanguageSwitcher` inline recoloring,
- `CleanLightCustomerGuard` mutations,
- checkout DOM patch effects.

### Stage 5: Move legacy customer CSS out of globals

Move the old huge customer/theme sections of `frontend/app/globals.css` to `frontend/app/globals.legacy.css` and do not import them. Keep only Tailwind/base reset and imports required for admin/shared UI. Verify admin separately.

### Stage 6: Validation gates

Required gates before merge:

```bash
grep -RIn "surface-sub\|surface rounded\|theme-primary\|theme-secondary\|data-pmd-checkout-lockdown\|PMD_CHECKOUT_LOCKDOWN" frontend/customer frontend/app/menu/page.tsx frontend/components/menu-item-modal.tsx
```

Expected: no results for rebuilt customer UI.

```bash
find frontend -name "*.css" -not -path "*/node_modules/*" -not -path "*/.next/*" -print0 | xargs -0 wc -l | sort -n
```

Expected: `customer-gold.css` remains small; `globals.css` no longer contains thousands of customer overrides.

```bash
cd frontend && npm run build
```

Expected: build passes.

## Current recommendation

Do not continue from the current V3-wrapper approach as the final solution. It still wraps legacy checkout children and therefore cannot fully satisfy the architecture requirements. The next implementation step should be Stage 1 + Stage 2 in a new commit, then Stage 3 in a separate commit, each with build verification.

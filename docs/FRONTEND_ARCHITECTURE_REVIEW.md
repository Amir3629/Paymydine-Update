# PayMyDine Frontend Architecture Review & Refactor Roadmap

**Date:** June 2026  
**Prepared by:** Architecture Review  
**Status:** Read-only review — no files changed  
**Project:** PayMyDine Customer Frontend (Next.js)  
**Location:** `/var/www/paymydine/frontend/`

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Current Frontend Structure](#2-current-frontend-structure)
3. [Multi-Theme Architecture Review](#3-multi-theme-architecture-review)
4. [CustomerMenuPage Review](#4-customermenupage-review)
5. [Checkout & Payment Architecture Review](#5-checkout--payment-architecture-review)
6. [State Management Review](#6-state-management-review)
7. [Styling & Design System Review](#7-styling--design-system-review)
8. [Risks & Technical Debt](#8-risks--technical-debt)
9. [What Is Good Now](#9-what-is-good-now)
10. [What Is Still Not Clean](#10-what-is-still-not-clean)
11. [Recommended Refactor Roadmap](#11-recommended-refactor-roadmap)
12. [Do Not Touch / Be Careful With](#12-do-not-touch--be-careful-with)
13. [Final Recommendation](#13-final-recommendation)

---

## 1. Executive Summary

### Current Frontend Architecture

PayMyDine has a Next.js App Router frontend that serves as the customer-facing restaurant experience. Customers scan a QR code, browse the restaurant menu, add items to their cart, and complete checkout via one of several payment providers (Stripe, PayPal, Worldline, Apple Pay, Google Pay, Cash).

The frontend supports four distinct visual themes:
- **Gold Luxury** — premium dark gold style
- **Modern Green** — clean modern green style
- **Organic Botanical Paper** — earthy natural style
- **Kazen Japanese** — Japanese minimalist style

Each theme is admin-configurable and controls how the entire customer menu and checkout experience looks. The theme system has been recently refactored from a single monolithic page into separated theme route files.

### Is the frontend currently clean enough?

**Partially.** The recent refactoring into theme route files was a meaningful step forward. The overall folder structure is understandable, the routing is logical, and the shared utility layer is clean.

However, several major areas remain too large or too mixed in responsibility — most notably `CustomerMenuPage.tsx`, `PaymentModal.tsx`, and the `legacy-dom-repairs/` folder. The type safety is weak in many files, and there is at least one significant area of dead code (a legacy standalone checkout page) that has not yet been removed.

### Is the multi-theme structure acceptable now?

**Yes, for now.** The theme route separation into individual files (`GoldThemeRoute.tsx`, `ModernGreenThemeRoute.tsx`, `OrganicThemeRoute.tsx`, `KazenThemeRoute.tsx`) is structurally correct and reflects a clean architecture direction. The shared utilities (`themeRouteShared.ts`) reduce duplication, and theme-specific UI components are properly separated in `components/themes/`.

The main remaining problem is that all theme routes receive 50+ untyped props from `CustomerMenuPage`, and the prop type is defined as `Record<string, any>`, which removes all compiler guarantees. This is acceptable as a temporary measure but should be the first theme-related thing improved.

### What is the biggest remaining technical risk?

The single biggest technical risk is **`PaymentModal.tsx` — a 3,631-line file that contains the entire checkout experience**: cart review, split-bill logic, payment method selection, and order confirmation, all in one component with 61+ `as any` type casts. This file directly handles real payment transactions. Any unintended change in this file can break checkout for all restaurants on the platform.

The second risk is the `legacy-dom-repairs/` folder, which contains **over 2,400 lines of MutationObserver-based DOM patching**. This code runs in production and watches for DOM changes to apply visual corrections. It is fragile, hard to debug, and will break silently if the surrounding component structure changes.

---

## 2. Current Frontend Structure

```
frontend/
├── app/                                  # Next.js App Router pages and API routes
├── components/                           # Reusable UI components
│   ├── themes/                           # Theme-specific visual components
│   ├── payment/                          # Payment provider form wrappers
│   ├── ui/                               # Headless / Shadcn UI primitives
│   └── theme-ui/                         # Cross-theme shared UI shells
├── features/                             # Feature-driven business logic
│   ├── customer-menu/                    # Main customer menu feature (largest)
│   │   ├── theme/                        # Theme route files + bootstrap hooks
│   │   ├── checkout/                     # PaymentModal and checkout flow
│   │   ├── legacy-dom-repairs/           # DOM patching hooks (technical debt)
│   │   └── guest-actions/                # Waiter call, table note dialogs
│   ├── checkout/                         # Shared checkout utility functions
│   └── table-order/                      # Table order draft management
├── lib/                                  # Shared utility libraries
├── store/                                # Zustand global state stores
├── styles/                               # CSS files and theme stylesheets
├── public/                               # Static assets
└── types/                                # Global TypeScript type definitions
```

### Folder-by-folder explanation

---

#### `app/`

**What it does:** Contains Next.js App Router pages and server-side API route handlers. Each folder maps to a URL path. Pages here are entry points — they should not contain business logic.

**Current state:** Mostly correct. The routing structure for the QR menu (`/menu`, `/table/[table_id]/menu`) is logical. API routes under `app/api/payments/` are clean proxy handlers that forward requests to the Laravel backend.

**Problem:** `app/checkout/page.tsx` (1,390 lines) exists as an apparent standalone checkout page, but the active checkout flow uses the `PaymentModal` inside `CustomerMenuPage`. This legacy page may be dead code. It should be verified and removed if unused.

**Test routes** (`/test`, `/test-theme`, `/dev/theme-bg-lab`) also exist in this folder. These should be protected behind an environment variable check or removed from production builds.

**Should it change?** Minor cleanup. Remove or protect test/dev routes. Remove dead checkout page after verification.

---

#### `components/`

**What it does:** Contains all reusable UI components that are not tied to a specific page or feature. Divided into sub-folders by concern.

**Current state:** Structure is correct. The split between `ui/` (primitive headless components from Shadcn), `theme-ui/` (structural shells shared across themes), and `themes/` (theme-specific visual components) is a good pattern.

**Should it change?** No structural changes needed. Individual components may need type improvements over time.

---

#### `components/themes/`

**What it does:** Contains all theme-specific visual components, one sub-folder per theme:

- `gold-luxury/` — Gold Luxury menu cards, toolbar, checkout card, waiter modal
- `modern-green/` — Modern Green equivalents
- `organic-botanical-paper/` — Organic equivalents
- `kazen-japanese/` — Kazen equivalents
- `shared/` — Cross-theme shared structural pieces (e.g. `ThemeActionBoundary`, `ThemeMenuShell`)

**Current state:** Good. This is the correct home for theme-specific UI. Each theme folder is self-contained and presents a visual layer over shared business logic.

**Should it change?** No structural change. As the refactor progresses, more visual logic will move here from `CustomerMenuPage`.

---

#### `features/customer-menu/`

**What it does:** The main feature folder for everything related to the customer menu experience — menu browsing, item selection, checkout modal, table order, guest sessions, and theme orchestration.

**Current state:** This folder is too large and carries too many responsibilities. It contains the biggest files in the project. The structure is understandable but the files inside need to be extracted over time.

**Should it change?** Yes. This folder should gradually have logic extracted into smaller hooks and services. See [Section 4](#4-customermenupage-review) and [Section 11](#11-recommended-refactor-roadmap).

---

#### `features/customer-menu/theme/`

**What it does:** Contains the theme routing system — the files that decide which theme-specific UI to render based on the admin-configured theme.

Key files:

| File | Role |
|------|------|
| `GoldThemeRoute.tsx` | Renders the Gold Luxury theme UI and passes shared data down |
| `ModernGreenThemeRoute.tsx` | Same for Modern Green |
| `OrganicThemeRoute.tsx` | Same for Organic |
| `KazenThemeRoute.tsx` | Same for Kazen |
| `themeRouteShared.ts` | Shared utility functions used by all 4 routes |
| `themeRouteTypes.ts` | Type definitions for theme route props |
| `useCustomerMenuThemeBootstrap.ts` | Hook that loads theme config from the API |
| `useOrganicThemeEffects.ts` | Organic-specific side effects on mount |

**Current state:** The separation is correct and represents real progress. Each theme route is responsible for rendering only its theme's UI.

**Main problem:** The prop type for all theme routes is `CustomerMenuThemeRouteProps = Record<string, any>`. This means there is no TypeScript enforcement of what props each theme receives. This is the top priority for improvement.

**Should it change?** Yes — prop typing should be tightened. See [Phase 2](#phase-2-strict-theme-route-prop-types).

---

#### `features/customer-menu/checkout/`

**What it does:** Contains the `PaymentModal.tsx` — the entire checkout experience presented as a slide-up modal. This includes order review, split-bill UI, payment method selection, and order confirmation.

**Current state:** `PaymentModal.tsx` is 3,631 lines long — this is the largest problem file in the project. It works correctly in production but is very hard to maintain or extend safely.

**Should it change?** Yes, but carefully and in phases. See [Section 5](#5-checkout--payment-architecture-review) and [Phase 5](#phase-5-clean-checkout--payment-boundaries).

---

#### `features/checkout/`

**What it does:** Contains shared, reusable checkout utility functions used across the project. This is separate from the modal UI.

Key files:
- `checkout-utils.ts` — Pure calculation functions (totals, VAT, fees)
- `split-bill-utils.ts` — Split bill percentage and person calculations
- `payment-summary-utils.ts` — Payment summary formatting
- `types.ts` — Clean type definitions for checkout data

**Current state:** Clean. These are small, focused files with clear responsibilities. This is the right pattern.

**Should it change?** No. This folder is the model for how other utility logic should be organized.

---

#### `features/table-order/`

**What it does:** Manages the table order draft — the pending shared order that multiple customers at the same table can add to before checkout. Includes polling logic to keep the draft in sync.

**Current state:** Reasonably clean. `useTableOrderDraft` is the main hook and lives here correctly.

**Main concern:** The polling interval (every ~12 seconds) has no exponential backoff if the API is slow or down. This could cause repeated failed API calls on unstable connections.

**Should it change?** Minor improvement. Add backoff to polling. Otherwise leave it.

---

#### `lib/`

**What it does:** Shared utility libraries that are not feature-specific. Includes the API client, payment service, theme system utilities, and other helpers.

Key files:
- `api-client.ts` — Central HTTP client for all backend API calls
- `payment-service.ts` — Abstraction over all payment providers
- `theme-system.ts` — CSS variable application and theme loading
- `theme-registry.ts` — Normalized theme configuration

**Current state:** Mostly clean. `payment-service.ts` (~490 lines) is reasonably well structured but handles all 5 payment providers in one file. Acceptable for now.

**Should it change?** Minor improvement later — `payment-service.ts` could be split by provider if it grows further.

---

#### `store/`

**What it does:** Global Zustand state stores. Each store manages a specific domain of state.

See [Section 6](#6-state-management-review) for detailed analysis.

---

#### `styles/`

**What it does:** CSS files for global layout, base styles, and theme-specific overrides.

**Current state:** Mixed. The new token-based system in `globals-clean.css` is well-designed. However, there is a `styles/global/legacy/` folder containing 9–10 near-identical CSS files totaling approximately 18,000 lines. This is a significant cleanup task.

See [Section 7](#7-styling--design-system-review) for detailed analysis.

---

#### `public/`

**What it does:** Static assets (images, fonts, icons) served directly by the web server without processing.

**Current state:** Acceptable. No structural issues identified.

---

#### `types/`

**What it does:** Global TypeScript type definitions shared across the project.

**Current state:** Present but partially bypassed — many files use `any` or `Record<string, any>` instead of importing proper types from here. The types folder itself is not a problem, but the lack of strict usage across the codebase is.

**Should it change?** The folder structure is fine. Over time, more files should import from here instead of using `any`.

---

## 3. Multi-Theme Architecture Review

### How the current theme system works

When a customer opens the QR menu, the following happens:

1. `useCustomerMenuThemeBootstrap()` calls the API to fetch the restaurant's configured theme.
2. `useCurrentFrontendTheme()` reads the theme name from a `data-theme` DOM attribute.
3. `CustomerMenuPage` selects the appropriate theme route based on the resolved theme.
4. The theme route (`GoldThemeRoute`, `ModernGreenThemeRoute`, etc.) renders the theme-specific UI components from `components/themes/`.
5. The `PaymentModal` (shared across all themes) handles checkout for all themes.

### What is good about the current theme isolation

- **Each theme has its own route file.** `GoldThemeRoute.tsx`, `ModernGreenThemeRoute.tsx`, `OrganicThemeRoute.tsx`, and `KazenThemeRoute.tsx` are separate files. A change to one will not accidentally affect another.
- **Each theme has its own component folder.** `components/themes/gold-luxury/`, `modern-green/`, `organic-botanical-paper/`, and `kazen-japanese/` are isolated. Theme-specific visual components live only in their own folder.
- **Shared utilities are extracted.** `themeRouteShared.ts` contains `normalizeMenuLogoUrl()` and `createOpenOrderUpdateHandler()` — functions that all themes use identically without duplication.
- **`ThemeActionBoundary`** is a shared wrapper that provides consistent error handling across all themes.
- **The `shared/` folder** in `components/themes/` holds cross-theme structural primitives (`ThemeMenuShell`, `ThemeMenuSection`, `ThemeActionSlot`) that all themes can build on.

### What is still not perfect

**Prop types are not enforced.** The current type definition in `themeRouteTypes.ts` is:
```ts
export type CustomerMenuThemeRouteProps = Record<string, any>
```
This means every theme route accepts any props with any shape. TypeScript cannot warn if a theme route receives an incorrect or missing prop. This is the most important type-safety gap in the theme system.

**Massive prop drilling.** `CustomerMenuPage` currently passes approximately 50+ props into each theme route. Most of these are not used by all themes. For example, Kazen-specific state is passed to Gold, and Gold-specific settings are passed to Kazen. This makes it harder to understand which theme needs which data.

**Logo URL resolution is duplicated.** The Kazen theme route contains approximately 12 inline logo URL candidate fallbacks. This same fallback logic should live in the shared `normalizeMenuLogoUrl()` utility.

**Copy-paste structure in theme routes.** The 4 theme routes all follow the same structural pattern:
- Destructure 50+ props
- Create `handleOpenOrderUpdate`
- Return `<ThemeActionBoundary>` wrapping the theme component and the `PaymentModal`

This is acceptable for now but should be unified into a shared theme route wrapper to reduce future maintenance.

**VAT adjustment logic appears in multiple places.** Some VAT calculation is duplicated between theme routes and should live in the shared checkout utilities only.

### How risky is it to change one theme now?

**Low to medium risk.** Because each theme route and its UI components are in separate files, a change to `GoldThemeRoute.tsx` will not automatically break Kazen or Organic. The isolation is real.

The risk that remains is:
1. The shared `PaymentModal` is used by all themes. A change to `PaymentModal.tsx` affects all themes simultaneously.
2. The `CustomerMenuPage` passes the same 50+ props to all themes. A change to what props are passed could silently break a theme if TypeScript types are not enforced (which they currently are not).

### Files shared across all themes

| File | Shared By |
|------|-----------|
| `features/customer-menu/checkout/PaymentModal.tsx` | All 4 themes |
| `features/customer-menu/theme/themeRouteShared.ts` | All 4 routes |
| `features/customer-menu/theme/themeRouteTypes.ts` | All 4 routes |
| `features/customer-menu/theme/useCustomerMenuThemeBootstrap.ts` | All 4 routes (called from CustomerMenuPage) |
| `components/themes/shared/ThemeActionBoundary.tsx` | All 4 routes |
| `components/themes/shared/ThemeMenuShell.tsx` | All 4 themes (optional) |
| `store/cart-store.ts` | All 4 themes |
| `store/cms-store.ts` | All 4 themes |
| `lib/payment-service.ts` | All 4 themes (via PaymentModal) |

### Files that are theme-specific

| Theme | Route File | Component Folder |
|-------|-----------|-----------------|
| Gold Luxury | `GoldThemeRoute.tsx` | `components/themes/gold-luxury/` |
| Modern Green | `ModernGreenThemeRoute.tsx` | `components/themes/modern-green/` |
| Organic | `OrganicThemeRoute.tsx` | `components/themes/organic-botanical-paper/` |
| Kazen | `KazenThemeRoute.tsx` | `components/themes/kazen-japanese/` |

Additionally, `useOrganicThemeEffects.ts` is Organic-specific and lives in the theme folder.

### What should be improved in the next phases

1. **Add strict prop interfaces per theme.** Replace `Record<string, any>` with a typed interface for each theme route. Each interface should list only the props that theme actually uses.
2. **Consolidate logo URL fallback logic.** Move all logo URL resolution into `normalizeMenuLogoUrl()`.
3. **Create a shared theme route wrapper.** A `BaseThemeRoute` component or helper that handles the common structure (ThemeActionBoundary, PaymentModal wiring) so each route only specifies what is unique to it.
4. **Reduce prop count.** Move shared data into a React Context or split props into logical groups (menu data, checkout data, table data) rather than one flat object of 50+ items.

---

## 4. CustomerMenuPage Review

### File location
`features/customer-menu/CustomerMenuPage.tsx` — approximately 892 lines

### What responsibilities it still has

`CustomerMenuPage` currently acts as the central controller of the entire customer experience. It is responsible for:

| Responsibility | Description |
|----------------|-------------|
| **Theme selection** | Calls `useCurrentFrontendTheme()`, `useCustomerThemeSelection()`, `useCustomerMenuThemeBootstrap()` |
| **Menu data loading** | Fetches menu items from the API, applies localStorage caching with TTL, builds category lists |
| **Table/QR context** | Reads `table_no`, `table_id`, `qr` from URL params; fetches table info; detects pending orders |
| **Cart management** | Calculates VAT adjustments, pricing summaries, manages toolbar snapshots |
| **State initialization** | Loads CMS settings, merchant settings, language, highlight rules |
| **User interaction handlers** | Waiter dialog open/close, note dialog, item selection, checkout modal trigger |
| **Payment modal control** | Manages modal open/close state, initial step, "prefer personal review" flag |
| **Local order hydration** | Restores pending orders from sessionStorage/localStorage on page load |
| **DOM repair calls** | Calls `useKazenMenuDomRepairs()`, installs footer logos, applies action circle colors |
| **Theme route delegation** | Contains 4 separate `if (theme === X) return ...` blocks, each passing 50+ props |

This is a large number of responsibilities for one file.

### Why it is still large

`CustomerMenuPage` grew because it was originally the only place where all customer menu behavior lived. The recent refactor correctly separated theme-specific UI into route files and component folders, which was a major improvement. However, the business logic that drives those themes — data loading, state orchestration, and event handling — still lives in `CustomerMenuPage`.

The remaining size is a result of not yet completing the second half of the separation: extracting the controller logic into dedicated hooks and services.

### What has already been improved

- Theme UI is no longer inline in this file — it now delegates to `GoldThemeRoute`, `ModernGreenThemeRoute`, etc.
- Theme-specific side effects are in `useOrganicThemeEffects.ts` and `useCustomerMenuThemeBootstrap.ts`
- Shared theme utilities are in `themeRouteShared.ts`
- DOM repairs for Kazen are in the dedicated `useKazenMenuDomRepairs` hook

These are meaningful improvements. The architecture direction is correct.

### What should be extracted later

The following logic should move out of `CustomerMenuPage` into dedicated hooks:

| Proposed Hook | What to Extract |
|---------------|-----------------|
| `useTableQrContext()` | Table info fetch, QR param reading, draft polling, pending order detection, table home URL saving |
| `useMenuLoader()` | Menu data fetch, localStorage TTL cache, category building, item filtering |
| `useCheckoutState()` | Payment modal open/close, step tracking, pricing snapshot, "prefer personal review" flag |
| `useGuestSession()` | Guest session ID read/write, sessionStorage order restore, local open order hydration |

After these extractions, `CustomerMenuPage` should only: call these 4 hooks, select the correct theme route, and render. All logic lives in hooks.

### Is it acceptable for now in a live production project?

**Yes.** The current size is a product of ongoing, careful refactoring on a live system. The file is large but it is not chaotic — the code is traceable and the responsibilities are at least named and grouped. Making large extractions all at once on a live payment system is riskier than leaving it slightly oversized while the project is stable.

The recommended approach is to extract one hook at a time, test thoroughly after each extraction, and not touch payment-adjacent logic until the safer controller hooks are extracted first.

---

## 5. Checkout & Payment Architecture Review

### Overview of the checkout system

The checkout and payment system spans multiple folders:

| Location | Role |
|----------|------|
| `features/customer-menu/checkout/PaymentModal.tsx` | The active checkout UI — 3,631 lines |
| `features/checkout/` | Shared utility functions (clean, ~8 files) |
| `components/payment/` | Payment provider form wrappers |
| `lib/payment-service.ts` | Payment provider abstraction layer |
| `app/api/payments/` | Backend API proxy routes |
| `app/checkout/page.tsx` | Legacy standalone checkout — possibly dead code |

### What is clean

**`features/checkout/` utilities** are well-organised. Eight small files handle specific concerns:
- `checkout-utils.ts` — totals, fees, VAT calculations (109 lines)
- `split-bill-utils.ts` — split percentages and share calculations
- `payment-summary-utils.ts` — payment summary formatting
- `types.ts` — clean TypeScript type definitions

**`app/api/payments/` routes** are clean and simple. Each route is a focused proxy that validates, calls the Laravel backend, and returns a structured response:
- `create-intent/route.ts` — Stripe payment intent
- `create-paypal-order/route.ts` — PayPal order creation
- `capture-paypal-order/route.ts` — PayPal capture
- `process-apple-pay/route.ts` — Apple Pay processing
- `process-google-pay/route.ts` — Google Pay processing
- `process-cash/route.ts` — Cash confirmation
- `validate-apple-pay/route.ts` — Apple Pay domain validation

**`lib/payment-service.ts`** (~490 lines) provides a clean abstraction. All payment provider calls go through this service, which means `PaymentModal` never calls payment APIs directly.

**`components/payment/`** properly wraps each payment provider's SDK:
- `stripe-payment-element.tsx` — Stripe Elements wrapper
- `secure-payment/PayPalForm.tsx` — PayPal button
- `secure-payment/WorldlineInlineCardForm.tsx` — Worldline card form (875 lines — acceptable due to Worldline SDK complexity)
- `secure-payment/ApplePayForm.tsx` — Apple Pay button

### What is risky

**`features/customer-menu/checkout/PaymentModal.tsx` is 3,631 lines.** This single file contains:
- Order review panel (item list, quantities, VAT)
- Split bill panel (person assignment, percentage splits)
- Payment method selection panel
- Order confirmation / receipt panel
- 61+ `as any` type casts removing all compiler guarantees on payment data

Any change to this file risks breaking the entire checkout flow for all themes and all payment methods simultaneously. It is the highest-risk file in the project.

**`app/checkout/page.tsx` is 1,390 lines and its status is unclear.** It appears to be a legacy standalone checkout page. If it is not in the active routing flow, it is dead code. If it is reachable, it may be duplicating logic from `PaymentModal`. This must be verified.

**Payment state is not centralized.** Split-bill state, payment method selection, and tip state are all managed via `useState` inside `PaymentModal`. This makes it impossible to access or coordinate this state from outside the modal. If a future feature needs to read the current payment state from outside the modal, it will require significant refactoring.

**No E2E tests exist for the checkout flow.** The most important business-critical path in the application has no automated test coverage. This amplifies the risk of any change to `PaymentModal`.

### What should be improved later (without breaking payment flows)

1. **Verify and remove `app/checkout/page.tsx`** if it is dead code. Do this before any other checkout work.
2. **Create a `CheckoutState` Zustand store** to centralize split-bill state, payment method selection, and tip state. This decouples checkout state from the modal component.
3. **Split `PaymentModal.tsx` into panel components** — one panel per checkout step. Each panel is a separate file. The modal becomes a step manager only. This must be done after E2E tests are in place.
4. **Write E2E checkout tests** covering at least: full order → pay with card, split bill, cash payment. These tests are the safety net for all payment refactoring.

---

## 6. State Management Review

### Overview

The project uses Zustand for global state management. There are 4 stores:

| Store | Lines | Status |
|-------|-------|--------|
| `cart-store.ts` | ~97 | Clean |
| `language-store.ts` | ~39 | Clean |
| `theme-store.ts` | ~163 | Acceptable |
| `cms-store.ts` | ~400+ | Too large / mixed concerns |

---

### `store/cart-store.ts` — Clean

**What it manages:** Cart items, cart open/close state, table info.

**Assessment:** This is the best-structured store in the project. It has a single clear responsibility, a small number of methods, and proper TypeScript types. It uses Zustand with localStorage persistence correctly.

**Recommendation:** No changes needed.

---

### `store/language-store.ts` — Clean

**What it manages:** The customer's active language and available translations.

**Assessment:** 39 lines, single responsibility, clean. Leave it as is.

---

### `store/theme-store.ts` — Acceptable

**What it manages:** Current theme ID, available themes list, theme settings, loading state, CSS variable application.

**Assessment:** 163 lines — reasonable for what it does. Includes the `applyTheme()` call to apply CSS variables, which is correct.

**Minor concern:** `pmdForceKazenFrontendThemePayload()` logic is inside the store. This is a Kazen-specific normalization helper that arguably belongs in a `lib/theme-normalizer.ts` utility. Not urgent.

**Recommendation:** Leave it as is for now. Move the Kazen-specific payload logic to a utility in Phase 3.

---

### `store/cms-store.ts` — Too Large / Mixed Concerns

**What it manages (too many things):**

- CMS settings (app name, logo, social links)
- Menu items list
- Payment options and merchant configuration
- Tip settings and percentages
- Tax/VAT settings
- Applied coupon code (runtime state)
- Merchant settings
- Review/social settings
- `isInitialized` flag
- 15+ methods including several that make API calls

**Assessment:** This store mixes two fundamentally different kinds of data:

1. **Read-only admin configuration** — settings loaded once at startup that never change during the session (app name, payment methods, VAT rates, tip options)
2. **Runtime user state** — things that change during the session (applied coupon code)

These should not live in the same store. The applied coupon especially should not be in a "CMS" store.

The store is also responsible for fetching data from multiple different API endpoints (`loadVATSettings()`, `loadMerchantSettings()`, etc.), which makes it act as both a state container and a data-fetching layer.

**Recommendation:** In Phase 8, split this store into:

| New Store | Contents |
|-----------|----------|
| `useCmsConfigStore()` | Read-only admin config (name, logo, social links) |
| `usePaymentSettingsStore()` | Payment methods, merchant keys, provider config |
| `useTaxSettingsStore()` | VAT/tax rates per category |
| `useTipSettingsStore()` | Tip percentages and defaults |
| `useCouponStore()` | Runtime applied coupon state |

Keep `useCmsStore()` as a backward-compatible façade during migration so existing consumers don't all need to be updated at once.

### Is cart/order/payment state handled cleanly?

Cart state is clean and isolated in `cart-store.ts`. Order state (the table order draft) is managed in the `useTableOrderDraft` hook, which is reasonable. Payment state (split-bill, selected payment method, tip) is only inside `PaymentModal.tsx` via local `useState` — this is the area that needs improvement.

---

## 7. Styling & Design System Review

### CSS files inventory

| File / Folder | Size | Role | Status |
|---------------|------|------|--------|
| `app/globals-clean.css` | ~248 lines | New token-based system with `--theme-*` CSS variables | Clean — this is the target |
| `app/globals.css` | Medium | Original global styles, likely loaded on all routes | Needs review |
| `app/nuclear-fix.css` | ~89 lines | Emergency CSS patch | Needs to be integrated properly |
| `styles/global/legacy/` | ~18,000 lines (9–10 files) | Legacy CSS, likely duplicated or auto-generated | Major cleanup needed |
| `styles/customer/base.css` | ~100 lines | Customer base styles | Acceptable |
| `styles/customer/themes/` | Multiple files | Per-theme CSS overrides | Acceptable |

### Is the styling system clean?

**Partially.** The direction is correct — the new `globals-clean.css` uses a modern CSS variable token system (`--theme-color-primary`, `--theme-font-display`, etc.) with proper fallback values and light/dark mode support. This is exactly the right pattern for a multi-theme application.

The problem is that this clean system coexists with a large amount of legacy CSS that uses different patterns. The legacy CSS under `styles/global/legacy/` contains approximately 9–10 files, each around 1,800 lines, that appear to be mostly identical. Their loading order and precedence relative to the new system is not clearly documented.

### Are global styles risky?

**Yes, moderately.** Global CSS files (globals.css, legacy files) use broad selectors that can accidentally affect multiple themes. This is exactly the risk documented in the earlier `theme-architecture.md` document. A change to a global selector to fix one theme can visually break another.

`nuclear-fix.css` is a particular concern — its name suggests it was added to fix an emergency and was never properly integrated. Emergency patches have a habit of conflicting with later changes in unpredictable ways.

### Are theme styles isolated enough?

**Mostly yes, for new code.** New theme components in `components/themes/` use scoped class names and rely on CSS variables. A Gold Luxury style change will not leak into Organic because the variables are different.

The remaining risk is the legacy CSS folder — if those files contain selectors that apply to elements rendered by multiple themes, they can cause cross-theme leakage.

### What should be moved, cleaned, or documented later

1. **Audit `styles/global/legacy/`** — determine if the 9–10 files are generated by a build script or hand-written. If generated, fix the generator and reduce to one output file. If hand-written and mostly identical, consolidate into one file.
2. **Document `nuclear-fix.css`** — add a comment explaining what it fixes and why. Then integrate its rules properly into the relevant component CSS or token system, and delete the file.
3. **Confirm that `globals-clean.css` is imported on all active routes** — if it is not, some routes may be using only the legacy token system.
4. **Move inline `style={{ ... }}` blocks to CSS** — `app/table/[table_id]/page.tsx` contains approximately 150 lines of inline styles that bypass the theme variable system entirely.
5. **Migrate hardcoded color values** — several component files contain hardcoded hex values like `#062F2A` and `#021F1C`. These should reference `--theme-*` CSS variables.

---

## 8. Risks & Technical Debt

### Risk Register

| # | Risk | Level | Why It Matters | Recommended Action |
|---|------|-------|---------------|-------------------|
| 1 | **PaymentModal.tsx is 3,631 lines with 61+ `as any` casts** | **HIGH** | Any change to this file risks breaking checkout for all restaurants and all payment methods. Type casts hide type errors that become runtime bugs. | Write E2E checkout tests first, then split into panel components in Phase 5. Do not edit casually. |
| 2 | **`legacy-dom-repairs/` folder (2,400+ lines of MutationObserver DOM patching)** | **HIGH** | MutationObserver hooks fire on every DOM change. They patch visual problems at runtime, meaning the underlying component renders incorrectly and is patched afterward. If the DOM structure changes for any reason, these patches break silently with no error. | Document each patch's purpose. Replace with React state-driven styling in Phase 7. Do not remove without visual regression testing. |
| 3 | **Prop types defined as `Record<string, any>` in theme routes** | **MEDIUM** | TypeScript cannot warn when a theme route receives wrong props or when a required prop is missing. This hides integration bugs between `CustomerMenuPage` and theme routes. | Replace with strict per-theme interfaces in Phase 2. Low-risk change. |
| 4 | **`app/checkout/page.tsx` — 1,390 lines, status unknown** | **MEDIUM** | If this page is dead code, it is a maintenance burden and confusion risk. If it is somehow reachable, it may duplicate checkout logic in an unmaintained state. | Check server logs, routing, and imports. Delete if confirmed unused, behind a git tag. |
| 5 | **`CustomerMenuContent.tsx` — 1,783 lines, status unknown** | **MEDIUM** | Similar to above — this appears to be an older version or duplicate of `CustomerMenuPage`. If not imported anywhere, it is dead code. | Verify imports. Delete if confirmed unused. |
| 6 | **No E2E tests for checkout / payment flow** | **HIGH** | The highest-risk user flow (payment) has no automated safety net. Every manual deployment requires manual checkout testing to confirm nothing broke. | Add E2E tests as part of Phase 4 or before any PaymentModal changes. |
| 7 | **`styles/global/legacy/` — ~18,000 lines of near-duplicate CSS** | **MEDIUM** | This CSS is loaded in production but its purpose relative to the new token system is not documented. Duplicate and conflicting selectors can cause visual inconsistencies across themes. | Audit the files, determine if generated or hand-written, and consolidate. |
| 8 | **Table order polling without backoff** | **LOW** | `useTableOrderDraft` polls every ~12 seconds with no retry delay if the API fails. On a slow API, this creates repeated failed requests that could accumulate. | Add exponential backoff with a maximum retry delay. Small, isolated change. |
| 9 | **Client-side payment amount not checksummed** | **MEDIUM** | Cart state is stored in localStorage, which a technically capable customer could edit. The payment amount sent to the backend should be re-calculated and verified server-side before charging. | Confirm with the backend team that order amounts are validated server-side before payment is captured. Frontend-only validation is insufficient for financial transactions. |
| 10 | **SSR-unsafe code patterns** | **LOW** | Multiple files check `typeof window === 'undefined'` ad-hoc to guard against server-side rendering issues. These checks are scattered and not centralized. | Acceptable for now — Next.js App Router reduces SSR risk. Consolidate in a future cleanup phase. |
| 11 | **localStorage key collisions (no versioning)** | **LOW** | Keys like `pmd_open_order:`, `pmd_menu_cache:`, `pmd_guest_session_id` are stored without a version number. If the data format changes, old cached data can corrupt new sessions. | Add a version suffix to localStorage keys (`pmd_menu_cache_v2:`). Clear old keys on startup. |
| 12 | **Test/dev routes exposed in production** | **LOW** | Routes like `/test`, `/test-theme`, `/dev/theme-bg-lab` are accessible in production builds. | Gate these routes behind `process.env.NODE_ENV === 'development'` or remove them. |
| 13 | **191 `as any` casts across `features/customer-menu/`** | **MEDIUM** | Widespread `as any` casts mean TypeScript cannot catch type mismatches. This is particularly risky near payment and order data. | Add an ESLint rule to warn on `as any`. Fix casts incrementally — start with the most risky areas (payment data, order state). |
| 14 | **`cms-store.ts` mixes config and runtime state** | **LOW** | The store contains both read-only admin configuration and mutable runtime state (applied coupon). This makes it harder to reason about what can change and when. | Low urgency. Split in Phase 8. |

---

## 9. What Is Good Now

The following things represent genuine improvements and should be preserved and built upon:

**Theme route separation**
The decision to create separate theme route files (`GoldThemeRoute.tsx`, `ModernGreenThemeRoute.tsx`, `OrganicThemeRoute.tsx`, `KazenThemeRoute.tsx`) is a correct architectural decision. Each theme is genuinely isolated — a developer working on the Kazen theme only needs to open Kazen files.

**Shared theme utility extraction**
`themeRouteShared.ts` contains `normalizeMenuLogoUrl()` and `createOpenOrderUpdateHandler()` — two functions that all themes need. Having these in one place means a bug fix or improvement benefits all themes simultaneously.

**`ThemeActionBoundary` — safer theme rendering**
All theme routes are wrapped in `ThemeActionBoundary`, which provides a consistent error boundary. If a theme-specific component crashes, it is contained and does not take down the entire page.

**Theme-specific component folders**
`components/themes/gold-luxury/`, `modern-green/`, `organic-botanical-paper/`, and `kazen-japanese/` are clean, self-contained folders. A designer or frontend developer can work on one theme's visual components without touching another.

**Clean utility layer in `features/checkout/`**
The split of shared checkout calculations into small, pure utility files (`checkout-utils.ts`, `split-bill-utils.ts`, `payment-summary-utils.ts`) is the correct pattern. These are testable, reusable, and independent of UI.

**Clean cart state management**
`store/cart-store.ts` (~97 lines) is a well-designed Zustand slice with a single responsibility. It demonstrates what all stores should look like.

**API route structure**
`app/api/payments/` is well-organized with one file per payment provider action. The routes are simple, focused proxy handlers — the right approach.

**CSS variable token system**
`app/globals-clean.css` establishes a proper `--theme-*` CSS variable system with fallbacks and dark mode support. This is the correct foundation for a multi-theme application.

**`useCustomerMenuThemeBootstrap.ts`**
The dedicated hook for loading theme configuration from the API is a clean extraction from what used to be inline logic in the main page. This is the right pattern.

**Build and TypeScript compilation passes**
The project builds and type-checks successfully. This is a non-trivial achievement given the size and complexity of the codebase. Future refactoring should maintain this at all times.

**Safer live refactor approach**
The incremental approach to refactoring — moving one thing at a time, keeping the build green, never breaking the payment flow — is the right strategy for a live production system. The team has been disciplined about this.

---

## 10. What Is Still Not Clean

The following problems are real and should be addressed in the refactor phases. They are listed in approximate priority order.

**`PaymentModal.tsx` is a 3,631-line monolith**
The most important business-critical file in the project is also the largest and most complex. Order review, split bill, payment selection, and order confirmation all live in one file. With 61+ `as any` casts and no automated tests, it is fragile and dangerous to edit.

**`legacy-dom-repairs/` folder should not exist in its current form**
Approximately 2,400+ lines of MutationObserver-based DOM patching is in production. This code watches for changes in the DOM and applies visual corrections after the fact. It masks architectural problems instead of fixing them.

**`CustomerMenuPage.tsx` still has 18 `useState` calls and 12 hook calls**
Despite recent improvements, the main page component is still doing too much. It should be a thin orchestrator that calls hooks and picks a theme — not a file that manages data loading, caching, cart calculations, order restoration, table polling, and DOM repairs simultaneously.

**`Record<string, any>` props for theme routes removes all type safety**
All theme routes accept any prop with any shape. TypeScript cannot catch when a required prop is missing or when the wrong type is passed. This is particularly risky since `CustomerMenuPage` passes 50+ props and the compiler cannot verify them.

**~18,000 lines of near-duplicate legacy CSS**
The `styles/global/legacy/` folder contains 9–10 files that appear to be mostly identical. Their purpose relative to the new token system is not documented. This is significant dead weight and a source of potential visual inconsistencies.

**Duplicate or unclear checkout page**
`app/checkout/page.tsx` (1,390 lines) and `CustomerMenuContent.tsx` (1,783 lines) are both large files whose active status is unclear. If they are dead code, they increase the apparent complexity of the project for new developers without providing any value.

**No automated tests for the most important flows**
The checkout, payment, and table order flows — the core revenue-generating paths of the application — have no automated test coverage. Every change must be manually verified.

**Hardcoded color values in component files**
Multiple component files contain hardcoded hex values (`#062F2A`, `#021F1C`) that bypass the CSS variable theme system. If a theme's colors change, these values will not update automatically.

**`cms-store.ts` mixes configuration and runtime state**
The store is too large (~400+ lines) and conflates read-only admin config with runtime user state (applied coupon). It has 15+ methods and makes multiple API calls directly.

---

## 11. Recommended Refactor Roadmap

### Guiding principles

- **Never break the payment flow.** PaymentModal changes require E2E tests to be in place first.
- **One extraction per PR.** Each pull request should do exactly one thing.
- **Build + typecheck must pass after every change.** Never merge a PR that breaks the TypeScript compiler.
- **Test visually on all 4 themes after any change to shared code.** A shared utility change can have unexpected visual effects.
- **Do not delete files without a git tag.** Before removing any file, create a git tag so the deleted code can be recovered if needed.

---

### Phase 1: Documentation and folder map

**Goal:** Give every developer on the team a clear map of the codebase so they know what is where and what not to touch.

**Files involved:**
- `docs/FRONTEND_ARCHITECTURE_REVIEW.md` (this document)
- `docs/theme-architecture.md` (already exists — confirm it reflects current state)
- `docs/theme-refactor-phases.md` (already exists — confirm it reflects current state)

**Actions:**
- Confirm that `docs/theme-architecture.md` and `docs/theme-refactor-phases.md` still accurately describe the current system. Update any sections that are now outdated.
- Add inline comments at the top of `CustomerMenuPage.tsx`, `PaymentModal.tsx`, and `legacy-dom-repairs/*.ts` files to explain what they are and why they are still large. This helps new team members understand the situation.
- Document which routes are active vs. legacy in a short `docs/ROUTING.md` file.

**Risk level:** None — documentation only  
**Expected benefit:** Every team member can navigate the project confidently  
**Verification:** Read the docs; ask a team member who hasn't seen the project to find a specific file using only the docs

---

### Phase 2: Strict theme route prop types

**Goal:** Replace `Record<string, any>` in theme route types with strict, per-theme TypeScript interfaces.

**Files involved:**
- `features/customer-menu/theme/themeRouteTypes.ts`
- `features/customer-menu/theme/GoldThemeRoute.tsx`
- `features/customer-menu/theme/ModernGreenThemeRoute.tsx`
- `features/customer-menu/theme/OrganicThemeRoute.tsx`
- `features/customer-menu/theme/KazenThemeRoute.tsx`

**Actions:**
- Create 4 typed interfaces — one per theme — listing only the props each route actually uses.
- Update each theme route to use its own interface.
- Add an ESLint rule forbidding `as any` outside of explicitly marked utility bridge files.
- Extend `normalizeMenuLogoUrl()` in `themeRouteShared.ts` to handle the 12-candidate logo fallback logic currently inline in `KazenThemeRoute.tsx`.

**Risk level:** Low — TypeScript changes only, no runtime behavior change  
**Expected benefit:** TypeScript will now warn if a prop is missing or incorrectly typed. Future changes to theme props become safer.  
**Verification:** `npm run type-check` passes. Visual QA on all 4 themes confirms no visual change.

---

### Phase 3: Verify and remove dead code

**Goal:** Remove files that are confirmed dead code. This simplifies the project for everyone.

**Files involved:**
- `app/checkout/page.tsx` — verify it is not reachable via any active route
- `features/customer-menu/CustomerMenuContent.tsx` — verify it is not imported anywhere

**Actions:**
- Check server access logs and Next.js routing to confirm `app/checkout/page.tsx` is not reached in production.
- Search the entire codebase for imports of `CustomerMenuContent`.
- If confirmed unused: create a git tag (`pre-dead-code-removal`), then delete the files.
- Run `npm run build` and `npm run type-check` after deletion.

**Risk level:** Low if verified properly; medium if verification is skipped  
**Expected benefit:** ~3,000 lines of code removed from the project; new developers are no longer confused by these files  
**Verification:** Build passes. Server logs show no 500 errors from `/checkout` route in the 48 hours after removal.

---

### Phase 4: Extract controller hooks from CustomerMenuPage

**Goal:** Reduce `CustomerMenuPage.tsx` from ~892 lines to a thin orchestrator by moving logic into dedicated hooks.

**Files involved:**
- `features/customer-menu/CustomerMenuPage.tsx`
- New files (create these):
  - `features/customer-menu/hooks/useTableQrContext.ts`
  - `features/customer-menu/hooks/useMenuLoader.ts`
  - `features/customer-menu/hooks/useCheckoutState.ts`
  - `features/customer-menu/hooks/useGuestSession.ts`

**Actions (one PR per hook):**

1. **PR 1:** Extract `useTableQrContext()` — move table info fetch, QR param parsing, table draft polling, pending order detection. CustomerMenuPage calls this hook and uses its return value.
2. **PR 2:** Extract `useMenuLoader()` — move menu data fetch, localStorage TTL cache, category building, item filtering.
3. **PR 3:** Extract `useCheckoutState()` — move modal open/close state, step tracking, pricing snapshot logic.
4. **PR 4:** Extract `useGuestSession()` — move guest session ID management, sessionStorage order restore, local open order hydration.

**Risk level:** Low-medium — behavior should not change, but extraction must be careful  
**Expected benefit:** CustomerMenuPage becomes a readable, thin orchestrator. Individual hooks are testable in isolation.  
**Verification:** After each PR — `npm run build`, `npm run type-check`, manual QA on all 4 themes: load the menu, add items, open checkout, verify table order still works.

---

### Phase 5: Clean checkout and payment boundaries

**Goal:** Decompose `PaymentModal.tsx` (3,631 lines) into panel components. This is the most complex phase.

**Prerequisite:** E2E tests for checkout must exist before this phase starts.

**Files involved:**
- `features/customer-menu/checkout/PaymentModal.tsx`
- New files (create these):
  - `features/customer-menu/checkout/CheckoutReviewPanel.tsx`
  - `features/customer-menu/checkout/CheckoutSplitPanel.tsx`
  - `features/customer-menu/checkout/CheckoutPaymentPanel.tsx`
  - `features/customer-menu/checkout/CheckoutReceiptPanel.tsx`
- `store/checkout-store.ts` (new Zustand store for checkout state)

**Actions (one PR per panel):**

1. **PR 1:** Create `CheckoutState` Zustand store. Move split-bill state, payment method selection, and tip state from `PaymentModal` useState into this store. PaymentModal reads from the store.
2. **PR 2:** Extract `CheckoutReviewPanel.tsx` — the itemized order review view.
3. **PR 3:** Extract `CheckoutSplitPanel.tsx` — the split bill assignment UI.
4. **PR 4:** Extract `CheckoutPaymentPanel.tsx` — the payment method selection UI.
5. **PR 5:** Extract `CheckoutReceiptPanel.tsx` — the order confirmation UI.
6. `PaymentModal.tsx` becomes a step-manager shell of ~200 lines.

**Risk level:** High — touches live payment flow. E2E tests are mandatory before starting.  
**Expected benefit:** PaymentModal becomes maintainable. Each panel can be tested independently. Payment bugs are easier to locate and fix.  
**Verification:** E2E tests pass after each PR. Full manual checkout QA on all 4 themes and all payment providers (card, PayPal, Apple Pay, cash) after each PR.

---

### Phase 6: Clean styling and global CSS

**Goal:** Consolidate legacy CSS and ensure theme styles are isolated.

**Files involved:**
- `styles/global/legacy/` — 9–10 legacy files
- `app/globals.css` — review and document
- `app/nuclear-fix.css` — integrate and remove
- `app/table/[table_id]/page.tsx` — inline styles

**Actions:**
1. Audit the `styles/global/legacy/` files. If they are auto-generated, fix the generator. If hand-written and mostly duplicate, consolidate into one file.
2. Document what `nuclear-fix.css` fixes. Integrate its rules into the appropriate CSS file or component. Delete `nuclear-fix.css`.
3. Move inline `style={{ ... }}` from `app/table/[table_id]/page.tsx` into Tailwind classes or a CSS module.
4. Replace hardcoded color values (`#062F2A`) with `--theme-*` CSS variables.
5. Confirm `globals-clean.css` is imported in all active page routes.

**Risk level:** Low — CSS changes are visually verifiable  
**Expected benefit:** Significant reduction in total CSS lines. Cleaner, more predictable styling with no duplicate rules.  
**Verification:** Screenshot each theme before and after each PR. Diff the screenshots. No visual change expected.

---

### Phase 7: Remove or replace legacy DOM repair hooks

**Goal:** Remove `legacy-dom-repairs/` by fixing the root causes of each DOM patch.

**Files involved:**
- `features/customer-menu/legacy-dom-repairs/usePaymentModalDomRepairs.ts` (1,518 lines)
- `features/customer-menu/legacy-dom-repairs/useKazenMenuDomRepairs.ts`
- `features/customer-menu/legacy-dom-repairs/` — all files

**Prerequisite:** Visual regression screenshots of all 4 themes must be captured before starting.

**Actions:**
1. Document every `MutationObserver` in each file — what DOM change it watches for, and what visual fix it applies.
2. For each patch, find the root cause: Why is the component rendering incorrectly without the patch?
3. Fix the root cause (usually a React state issue or a missing CSS class) in a separate PR.
4. After the root cause is fixed, remove the corresponding MutationObserver patch.
5. Continue until `legacy-dom-repairs/` is empty, then delete the folder.

**Risk level:** High — these patches are correcting real visual problems. Removing a patch without fixing the root cause will cause visual regressions.  
**Expected benefit:** The project no longer depends on fragile runtime DOM mutation. Visual behavior is predictable and stable.  
**Verification:** Visual regression tests on all 4 themes after every patch removal. Compare screenshots pixel-by-pixel if possible.

---

### Phase 8: Add smoke tests and split CMS store

**Goal:** Add basic automated testing and clean up the last major state management issue.

**Files involved:**
- `store/cms-store.ts`
- New store files:
  - `store/payment-settings-store.ts`
  - `store/tax-settings-store.ts`
  - `store/tip-settings-store.ts`
  - `store/coupon-store.ts`
- New test files:
  - `tests/smoke/gold-theme.spec.ts`
  - `tests/smoke/organic-theme.spec.ts`
  - `tests/smoke/kazen-theme.spec.ts`
  - `tests/smoke/checkout.spec.ts`

**Actions:**
1. Write smoke tests: load each theme, add an item to cart, open checkout, verify the payment panel loads.
2. Split `cms-store.ts` into focused stores (see Section 6). Keep `useCmsStore()` as a backward-compatible façade.
3. Update consumers of `cms-store.ts` to import from the correct focused store.

**Risk level:** Low — store split maintains backward compatibility through the façade  
**Expected benefit:** Automated test coverage for the most important user flows. CMS store is clean and understandable.  
**Verification:** All smoke tests pass. Build and type-check pass. Manual QA confirms no behavior change.

---

### Summary table

| Phase | Goal | Risk | Weeks |
|-------|------|------|-------|
| 1 | Documentation and folder map | None | 1 |
| 2 | Strict theme route prop types | Low | 1 |
| 3 | Remove dead code | Low | 1 |
| 4 | Extract CustomerMenuPage hooks | Low-Medium | 2–3 |
| 5 | Decompose PaymentModal | High | 3–4 |
| 6 | Clean styling / legacy CSS | Low | 1–2 |
| 7 | Remove DOM repair hooks | High | 2–3 |
| 8 | Add tests / split CMS store | Low | 1–2 |

---

## 12. Do Not Touch / Be Careful With

The following areas require extra caution. Do not make casual changes. Any change here should go through review and manual QA.

---

### Payment flow — EXTREME CAUTION

**Files:**
- `features/customer-menu/checkout/PaymentModal.tsx`
- `lib/payment-service.ts`
- `app/api/payments/` — all route files
- `components/payment/` — all payment provider forms

**Why:** These files handle real financial transactions. A bug here means customers are charged incorrectly, orders are not recorded, or payments fail silently. Any change must be followed by a full manual checkout test using each active payment method (card, PayPal, Apple Pay, cash) in a staging environment.

---

### Cart store — HIGH CAUTION

**File:** `store/cart-store.ts`

**Why:** Cart state persists in localStorage and is the source of truth for what the customer ordered. A bug here can result in incorrect orders being submitted. The store is clean and should be left as is unless there is a specific, well-understood reason to change it.

---

### Theme loader and theme selection — HIGH CAUTION

**Files:**
- `features/customer-menu/theme/useCustomerMenuThemeBootstrap.ts`
- `store/theme-store.ts`
- `lib/theme-registry.ts`
- `lib/theme-system.ts`

**Why:** These files control which theme is shown to the customer. A bug here can show the wrong theme, fail to load the theme, or cause a flash of incorrect styling. Any change must be tested on all 4 themes and at least 2 different restaurant accounts.

---

### Admin-selected theme logic — HIGH CAUTION

**Files:**
- `useCurrentFrontendTheme()` (wherever implemented)
- `useCustomerThemeSelection()`
- Any code that reads the `data-theme` attribute or backend theme config

**Why:** This logic determines which restaurant sees which theme. A bug here could show a restaurant the wrong theme, breaking their branded customer experience.

---

### Table order logic — HIGH CAUTION

**Files:**
- `features/table-order/useTableOrderDraft.ts`
- `features/customer-menu/hooks/useTableQrContext.ts` (once created)

**Why:** Table order drafts represent collaborative orders from multiple customers at the same table. A bug here can duplicate items, lose order items, or submit the wrong order. This is especially risky because multiple customers may be adding to the same draft simultaneously.

---

### API client — MEDIUM-HIGH CAUTION

**File:** `lib/api-client.ts`

**Why:** All backend communication goes through this file. A change to authentication headers, error handling, or request formatting will affect every API call in the application. Changes should be tested against all major flows (menu load, checkout, payment, table order).

---

### Checkout modal open/close state — MEDIUM CAUTION

**Current location:** `CustomerMenuPage.tsx` — `isPaymentModalOpen`, `paymentModalInitialStep`

**Why:** The state that controls whether the checkout modal is open and at which step is tightly coupled to the payment flow. An accidental state reset or incorrect initial step can leave customers unable to complete checkout.

---

### Order submission — EXTREME CAUTION

**Files involved in final order submission:**
- Final submit action in `PaymentModal.tsx`
- `lib/payment-service.ts` — `finalizePayment()` or equivalent
- `app/api/payments/` routes

**Why:** Once an order is submitted and payment is captured, reversing it requires manual intervention and may involve refunds. Never make speculative changes to order submission logic.

---

## 13. Final Recommendation

### Is the frontend ready for team sharing?

**Yes.** The codebase is organized, the build passes, TypeScript compilation succeeds, and the architecture direction is correct and documented. The theme separation is real and well-structured. A new developer can navigate the project using the folder structure and existing documentation.

The team should be aware of the known technical debt areas (listed in this document) so they do not casually edit high-risk files. Sharing this document with the team is the right first step.

### Is it ready for production?

**It is already in production and functioning.** The current state — while imperfect in structure — does not introduce new instability. The existing DOM repair hooks, the large PaymentModal, and the loose typing have all been in production and are known quantities. The risks are documented and managed.

Production readiness is not in question. What is in question is how maintainable and extensible the code is for the team going forward. That is what the refactor roadmap addresses.

### Is it ready for deeper refactor?

**Not without preparation.** The refactor roadmap above defines the correct order. The most important prerequisite is establishing E2E checkout tests before any changes are made to `PaymentModal.tsx`. Without tests, refactoring the most complex file in the project is a high-stakes manual operation.

The safer early phases (documentation, strict types, dead code removal, hook extraction from CustomerMenuPage) can begin immediately without test coverage because they do not touch payment logic.

### What should developers do next?

**In order:**

1. **Read this document** — every developer on the project should understand the current state, the risks, and the roadmap before making any changes.

2. **Confirm the architecture documents are current** — review `docs/theme-architecture.md` and `docs/theme-refactor-phases.md` and update anything that no longer reflects reality.

3. **Begin Phase 1** — documentation is free and improves clarity immediately.

4. **Begin Phase 2** — adding strict theme route prop types is a low-risk, high-value change that can be done in one focused PR.

5. **Confirm dead code status** — check `app/checkout/page.tsx` and `CustomerMenuContent.tsx` against server logs and imports. Remove if confirmed unused.

6. **Plan E2E test coverage** before any PaymentModal work begins. Even basic Playwright smoke tests (load menu, add item, open checkout, see payment method options) would provide meaningful safety.

7. **Assign ownership** — the `legacy-dom-repairs/` folder and `PaymentModal.tsx` should each have a named owner who understands what they do. Changes to these files should require review by the owner.

8. **Do not rush.** This is a live payment system. Moving carefully and verifying each change on all 4 themes is more important than speed.

---

*End of report. No files were changed during this review. All findings are based on static analysis of the current codebase.*

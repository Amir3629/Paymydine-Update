# Theme Refactor Phases

This plan keeps current Gold Luxury and Organic behavior working while creating a path toward isolated theme UI and shared business logic.

## Phase 0: Foundation and documentation

- Document current theme problems and the future architecture.
- Add `frontend/lib/theme-registry.ts` with typed theme configuration and normalization helpers.
- Stop introducing host/domain-specific theme decisions.
- Keep existing runtime behavior unchanged.
- Do not remove Organic v0 iframe yet.
- Do not rewrite `frontend/app/menu/page.tsx` yet.
- Do not make broad edits to `frontend/app/globals.css`.

## Phase 1: Valet correctness

- Keep standalone `/valet` available for all themes.
- Update `frontend/app/valet/ValetClient.tsx` so submit calls the real backend through `apiClient.createValetRequest()`.
- Preserve table context from URL parameters when creating valet requests.
- For Organic, valet may later be presented as an inline card inside the theme UI, but it must call the same shared valet request function.
- Do not hardcode valet behavior by tenant or domain.

## Phase 2: Extract shared checkout/order/payment hooks

- Extract shared behavior from `frontend/app/menu/page.tsx` into hooks/services.
- Keep the current UI unchanged during extraction.
- Candidate hooks/services:
  - `useCheckoutFlow`
  - `useTableOrderDraft`
  - `usePaymentFlow`
  - `useSplitBill`
  - `useWaiterCall`
  - `useTableNote`
  - `useValetRequest`
- Do not change payment/order backend behavior in this phase.

## Phase 3: Create theme-specific UI components

Create theme components that consume the shared hooks/actions:

- Gold checkout card.
- Organic checkout card.
- Gold waiter/note modal.
- Organic waiter/note modal.
- Gold valet entry.
- Organic valet entry.
- Gold menu cards/top bar/toolbar.
- Organic menu cards/top bar/toolbar.

Theme components should own presentation only. They should not duplicate backend submission logic.

## Phase 4: Migrate Organic v0 UI into the main frontend

- Recreate Organic top bar, category section, food cards, product modal, and valet entry as native main-frontend components.
- Connect native Organic UI directly to shared cart, checkout, table order, waiter, note, and valet logic.
- Keep the iframe until native Organic is feature-complete.
- Remove iframe dependency only after parity is verified.

## Phase 5: Remove runtime DOM hacks and global CSS leakage

- Remove runtime DOM style patches and MutationObservers used only for visual correction.
- Replace broad global selectors with scoped theme CSS or component-level styles.
- Move theme-specific rules out of `frontend/app/globals.css` where practical.
- Ensure each theme has a clear CSS scope root.
- Add regression checks for Gold Luxury and Organic before removing old patches.

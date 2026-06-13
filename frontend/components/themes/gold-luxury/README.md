# Gold Luxury theme components

This folder is reserved for native Gold Luxury theme UI components.

Phase 3A only establishes the folder boundary. Do not move existing menu, checkout, payment, waiter, note, split-bill, or valet JSX here until the shared action contracts are stable and the migration is planned in a later phase.

Gold components should receive `ThemeMenuActions`, `ThemeCheckoutActions`, or `ThemeValetActions` as props instead of importing business logic directly.

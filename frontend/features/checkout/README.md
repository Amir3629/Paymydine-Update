# Checkout feature extraction notes

This folder is the Phase 2 foundation for shared checkout business logic. Current files should stay pure and UI-neutral so Gold Luxury, Organic, and future themes can reuse the same calculations without sharing visual components.

Next extraction targets for Phase 2C/2D:

- Table draft/order state: loading current table orders, submit-draft state, refresh behavior, and submitted-order snapshots.
- Selected payment state: selected method normalization, method availability, method lookup, and fallback behavior.
- Split bill state transitions: equal/items/shares state updates, assignments, percent validation, and paid-person tracking.
- Payment orchestration: payment intent setup, provider-specific submit steps, and post-payment confirmation callbacks.

Do not move theme-specific checkout cards, modal JSX, class names, or styling into this folder until the shared hooks are stable and covered by the existing UI behavior.

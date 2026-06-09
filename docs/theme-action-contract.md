# Theme Action Contract

Phase 3A introduces the contract between theme UI components and shared PayMyDine functionality.

## Purpose

Theme components should render cards, buttons, layout, motion, and theme-specific visual polish. They should not duplicate checkout, order, payment, waiter, note, valet, or table-order business logic.

Shared behavior belongs in `frontend/features/*` and is passed into theme components as typed action props.

## Contract files

- `frontend/components/themes/types.ts` defines UI-facing contracts such as `ThemeMenuActions`, `ThemeCheckoutActions`, `ThemeValetActions`, and shared UI props.
- `frontend/features/menu/theme-menu-actions.ts` provides the first adapter foundation for building the menu actions object that future theme UI will receive.

## Examples

### Organic valet icon

A future native Organic top-bar valet icon should call `actions.onOpenValet()`.

It should not inspect host/domain, theme id, localStorage, or backend tenant state to decide valet behavior. The parent menu/runtime decides which action implementation is correct and passes it in.

### Gold checkout button

A Gold Luxury checkout button should call `actions.onOpenCheckout()`.

It should not reimplement cart totals, checkout state transitions, table-order draft logic, split-bill logic, or payment provider submission.

### Theme checkout cards

A future theme-specific checkout card should receive `ThemeCheckoutActions` and call:

- `onConfirmOrder()` for the existing confirm-order behavior.
- `onSubmitTableDraft()` for the existing send-to-kitchen behavior.
- `onStartPayment(methodCode)` to enter the existing payment path.
- `onBack()` and `onClose()` for navigation supplied by the parent checkout controller.

## What belongs in shared features

- Cart/order calculations.
- Checkout state transitions.
- Split-bill calculations and validation.
- Table-order draft polling and submit/confirm actions.
- Valet request submission.
- Payment method normalization and payment summary calculations.
- Backend API submission orchestration.

## What belongs in theme components

- Visual layout and markup.
- Theme-specific cards, buttons, icons, typography, spacing, and animation.
- Theme-specific composition of shared state and action props.

## Rule for new themes

New themes must connect to shared action contracts. They should not fork checkout/payment/order logic, add host/domain-based behavior, or introduce runtime DOM patches to force another theme's UI into shape.

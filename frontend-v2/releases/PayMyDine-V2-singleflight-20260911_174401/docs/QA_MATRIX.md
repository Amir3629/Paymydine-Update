# Frontend V2 QA Matrix

Every Theme must pass the same business-flow suite before production cutover.

## Rendering

- First request renders only the selected Theme; no cross-theme flash.
- Logo, restaurant name, table label and currency come from backend data.
- Phone / Call-to-Order and Table Note UI are absent in all 10 Themes.
- Language selector only shows configured/supported locales.
- Social links only appear when enabled and URL is valid.
- Valet only appears when enabled.
- No horizontal page overflow at 320, 375, 390, 430, 768, 1024 and 1440 CSS pixels.
- RTL is checked with Farsi.

## Menu and cart

- Search by name, description, category and allergen.
- Category filter and All filter.
- Item detail, media, nutrition, allergens and dietary tags.
- Required option validation and option price delta.
- Quantity update/removal.
- Cart persistence scoped to tenant + table.

## Table/QR scenarios

- Browsing without a table works; table-only actions show a clear error.
- Valid `table_id`, `table_no`, legacy `table`, QR and `/table/<id>` forms.
- Invalid table/QR fails safely.

## Shared Table Order — critical

- Phone A and Phone B open the same real QR.
- Each phone confirms its own personal items.
- Shared draft shows both guests' items.
- Submit creates/merges one table order and reaches kitchen/Admin.
- Order status/preparation state appears after submit; checkout does not skip directly from personal cart.
- Continue Ordering works.
- A second personal cart before payment is reviewed before merging into the same open unpaid order.
- A fully paid order is financially closed even if kitchen status remains active.
- After full payment, new items create/use the next financial order rather than reopening the paid order.
- Full/partial payment state propagates to the other open phone without manual refresh within the polling window.

## Guest services

- Waiter Call reaches Admin with correct table and observes cooldown.
- Valet reaches Admin with correct table/name/plate when feature is enabled.
- No Table Note request is emitted by V2.
- No telephone action is rendered by V2.

## Checkout

- Table Order must exist before payment.
- VAT/menu-price behavior matches backend.
- Tip presets use backend when available, otherwise PMD default `0/5/10`.
- Coupon success/failure.
- Full payment.
- Equal split.
- Item split using `order_menu_id` and unpaid quantities.
- Percentage/share split.
- Partial settlement refreshes remaining amount on all phones.
- Cash collection behavior.
- Provider success/cancel/failure and return verification for every provider enabled by the tenant.

## Admin Theme connection

- `/api/v1/frontend-theme-v2` returns 200.
- Each of 10 Admin selections returns the same canonical V2 ID.
- Refreshing the customer page immediately server-renders the new Theme.
- Legacy `/simple-theme` remains operational for port 3001 during staging.

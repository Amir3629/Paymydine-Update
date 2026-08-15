# QA Matrix

Every Theme must pass the same business-flow suite.

## Rendering

- First request renders only the selected Theme.
- No old Theme, default Theme, logo placeholder or background flash.
- No horizontal page overflow at 320, 375, 390, 430, 768, 1024 and 1440 CSS pixels.
- Logo, restaurant name, table label and currency come from backend data.
- Categories and menu items preserve Admin priority.
- Long names, long descriptions and missing images do not break layout.
- RTL is checked with Farsi.

## Menu and cart

- Search by name, description, category and allergen.
- Category filter and All filter.
- Item detail with gallery-ready image, nutrition, allergens and dietary tags.
- Required option validation.
- Option price delta.
- Quantity update and removal.
- Cart persistence scoped to tenant + table.

## Table scenarios

- No table: browsing works, table-only actions show a clear error.
- Valid `table_id`.
- Valid `table_no`.
- Legacy `table` parameter.
- QR parameter.
- Invalid or missing table response.

## Shared order

- Phone A and Phone B use the same QR.
- Each phone confirms personal items.
- Shared draft shows both guests' items.
- Submit sends one table order to kitchen.
- Additional order before payment merges into the same unpaid order.
- Existing submitted order does not skip a new personal-cart review.
- Paid order is not exposed as an active unpaid order to a new device.

## Service actions

- Waiter call with three-minute cooldown.
- Note validation and 1000-character limit.
- Valet name, plate and optional car model.
- Admin receives the correct table name and notification type.

## Checkout

- Order must be submitted before payment.
- VAT/menu-price mode.
- Tip presets.
- Coupon success/failure.
- Full payment.
- Equal split.
- Item split using `order_menu_id`.
- Percentage/share split.
- Partial settlement refreshes remaining amount on all phones.
- Cash collection behavior.
- Provider redirect success, cancel and failure.
- Return verification for every enabled provider.

## Required provider staging verification

- Stripe/Card
- Apple Pay
- Google Pay
- PayPal
- Worldline/Wero
- VR Payment
- SumUp
- Any restaurant-specific provider enabled in Admin

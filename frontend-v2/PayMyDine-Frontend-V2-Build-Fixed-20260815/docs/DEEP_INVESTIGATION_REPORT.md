# PayMyDine Customer Frontend — Deep Investigation Report

Date: 2026-08-15

## Sources reviewed

This report is based on the materials supplied for this project:

- the uploaded current Next.js frontend snapshot;
- the uploaded Laravel/Admin snapshot;
- the previous PayMyDine chat-history archive;
- the connected GitHub repository and `stabilization/admin-runtime-audit` branch;
- the read-only VPS audit returned on 2026-08-14;
- the seven menu-design reference images supplied by the project owner.

Where the snapshots and live audit differ, the live audit is treated as the stronger runtime evidence. No production file, PM2 process, Nginx upstream, Laravel route or database row was changed while producing this package.

## Live topology established by the audit

```text
Customer browser
    -> Nginx for mimoza.paymydine.com
    -> current Next.js frontend on 127.0.0.1:3001
    -> Laravel/API on 127.0.0.1:8000
    -> tenant database selected from the requested host
```

The current PM2 process is `paymydine-frontend`. The V2 package is therefore configured for a separate staging process on port `3002`. Port `3001` must remain the rollback authority until the complete QA matrix passes.

## Why the old visual layer should not be repaired again

The live read-only inventory reported:

- 472 frontend files;
- 44 CSS files;
- 1,478,445 CSS bytes;
- 14,564 `!important` declarations;
- 264 runtime `style.setProperty` references;
- 12 `MutationObserver` references;
- 14 `setInterval` references;
- two iframe references;
- seven Laravel `/simple-theme` route definitions.

The largest authorities include a 303 KB checkout compatibility stylesheet and multiple 200+ KB Kazen/Velvet standalone stylesheets. Several components also identify DOM nodes after render and repaint them repeatedly. The resulting symptoms—wrong-theme first paint, delayed logo replacement, jumping controls, modal recoloring and selector conflicts—are architectural, not isolated selector mistakes.

V2 therefore reuses the established business/API behavior but does not import the old frontend CSS, standalone themes, iframe bridges or runtime style-repair code.

## Current public data sources confirmed

The live audit confirmed successful public responses for:

- `/settings`;
- `/simple-theme`;
- `/api/v1/restaurant`;
- `/api/v1/menu`.

At audit time the menu response contained 44 items and eight categories and identified itself as `menu-highlights-v2`. The selected public theme was `kazen_japanese` with `tabs` layout.

The V2 bootstrap also probes the following existing sources when available:

- `/api/v1/payments`;
- `/api/v1/vat-settings`, with `/vat-settings` compatibility fallback;
- `/api/v1/tip-settings`, with `/tip-settings` compatibility fallback;
- `/api/v1/table-info` when table context exists;
- `/api/v1/table-order-draft` when table context exists.

## Menu data preserved from Admin/Laravel

The normalizer preserves or safely derives:

- restaurant name, logo, favicon-compatible paths, description, telephone, address, currency and timezone;
- categories, category order, category translations and category images;
- item ID, name, description, price and category;
- item translations where the backend supplies them;
- primary image, gallery, additional images and media attachments;
- stock/availability;
- option groups, required/default choices, display mode and price deltas;
- allergens and allergy tags;
- halal, vegetarian and vegan flags;
- calories, protein, carbohydrates, fat, sugar, serving size and disclaimer;
- chef recommendation, bestseller and popularity markers;
- combo rows returned by the existing menu endpoint;
- preparation-time/ETA fields when returned;
- menu highlight settings and cache version.

No demo food is silently substituted on a live tenant. Fixture data is used only by explicit preview routes.

## Customer and table scenarios preserved

### Browse without a table

A customer may browse the menu without a table. Table-only operations return a clear error rather than creating a fake table context.

### QR/table identity

The adapter preserves the existing parameter forms:

```text
table_id
table_no
table
qr
```

A route form is also supported:

```text
/table/<table-id>?qr=<qr-value>
```

### Personal cart

Each browser/device has a tenant-and-table-scoped personal cart. It remains private until the guest confirms items. Item options, quantities and option price deltas are retained.

### Shared table draft

Confirmed personal items are sent to:

```text
POST /api/v1/table-order-draft/confirm-items
```

with a tenant/table-scoped guest-session UUID. Other devices at the same table can see the shared draft after the polling refresh.

### Send to kitchen

The shared draft is submitted through:

```text
POST /api/v1/table-order-draft/submit
```

The existing Laravel route creates a real order or merges new items into the active unpaid table order. This behavior is important for the “second order before payment” scenario and must remain a backend invariant.

The V2 state order is intentionally:

```text
personal cart
-> confirm personal items
-> shared table draft
-> send table order to kitchen
-> order status / ETA
-> payment or continue ordering
```

An existing unpaid order must not skip review of a new personal cart.

### Multi-device refresh

One shared polling owner refreshes table-order state every five seconds and when the page becomes visible or receives focus. This propagates:

- items confirmed by another guest;
- a newly submitted order;
- status/preparation changes;
- partial settlement;
- fully paid state.

A future SSE/WebSocket transport can replace polling without changing the theme contract.

## Service actions preserved

### Waiter call

```text
POST /api/v1/waiter-call
```

A three-minute client cooldown is retained. Laravel remains responsible for creating the staff notification and resolving the table name.

### Table note

```text
POST /api/v1/table-notes
```

The note is validated before submission. Laravel remains the notification authority.

### Valet

```text
POST /api/v1/valet-request
```

The payload includes customer name, licence plate, optional car make/model and table/QR context. Valet visibility is driven by normalized Admin feature settings.

### Social/contact actions

The normalizer reads standard PayMyDine social keys and the existing Kazen website/social aliases. Social links are never emitted without a valid HTTP(S) URL; WhatsApp numbers are normalized to a `wa.me` URL.

## Checkout and settlement behavior preserved

### Payment methods

Enabled methods are loaded from `/api/v1/payments`. The UI does not invent a live payment method when the backend returns none. Method identity includes both method code and provider code, preventing two card providers from overwriting each other in the selector.

### Submitted-order guard

Payment is disabled until a real backend order ID exists. A draft must be submitted to the kitchen first.

### QR pay-later settlement

The current Laravel `start-payment` route rejects `qr_pay_later` orders and instructs callers to use `pay-existing`. V2 therefore:

1. starts the selected external provider session where required;
2. verifies the provider return/reference;
3. settles the existing shared table order through `/api/v1/orders/pay-existing`.

For non-QR submitted orders, the existing `start-payment` / `finalize-payment` sequence remains available.

### Providers represented by the adapters

The release contains adapters/return handling for the public routes found in the supplied sources:

- PayPal SDK create/capture flow;
- card hosted-session route;
- Wero route;
- Worldline Wero route;
- Worldline checkout status;
- SumUp checkout status;
- Square checkout status;
- VR Payment method-specific sessions and return status;
- generic immediate provider references;
- cash/COD settlement.

Real tenant credentials and provider redirect behavior must be validated on staging; no secret is present in this package.

### Coupon, tip and VAT

Coupon validation uses `/validate-coupon`. Tip presets and VAT settings are normalized from the current public settings endpoints. The UI shows the exact computed amount sent to settlement.

### Split bill

V2 exposes:

- full payment;
- equal split;
- item split;
- percentage/share split.

Item split uses `order_menu_id` and unpaid quantities. Partial settlements update the local snapshot and are then reconciled against the backend polling result.

## Theme conclusions from the supplied references

The supplied references describe different composition systems, not one layout recolored ten times. V2 therefore implements one shared business runtime with ten independent visual compositions:

1. Noir Editorial — luxury/chef’s table;
2. Verdant Modern — modern bistro;
3. Lumière Fine Dining — light hotel/fine dining;
4. Kazen Japanese — Japanese/omakase;
5. Azzurra Coastal — Mediterranean/seafood;
6. Neon Cocktail Bar — nightlife/bar;
7. Art Deco Speakeasy — premium lounge;
8. Shahrazad Persian — Persian fine dining;
9. Anatolia Turkish — Turkish/grill;
10. Ember Steakhouse — steakhouse/charcoal.

Each directory owns one client component and one CSS Module. No theme imports another theme. Shared components expose semantics and actions only.

## Zero-theme-flash architecture

1. Next.js resolves the tenant from the request host on the server.
2. The server reads `/simple-theme` and normalizes the selected Admin theme once.
3. `ThemeRenderer` dynamically imports exactly one theme module during server render.
4. The selected markup and CSS Module are sent together.
5. Hydration adds behavior; it does not replace the theme.

There is no localStorage theme authority, default Gold/Kazen render, iframe handoff, delayed theme class or runtime repaint.

## Known evidence gap

The returned VPS audit used the literal value:

```text
<SAFE_TEST_TABLE_ID>
```

Therefore the table-info 404 is not evidence of a broken real table. It also means a real-table, two-phone, second-order, split and provider-payment transaction was not executed while this ZIP was built. Those tests are explicitly listed in `QA_MATRIX.md` and remain mandatory before switching Nginx from port 3001 to port 3002.

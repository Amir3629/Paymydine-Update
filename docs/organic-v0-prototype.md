# Organic Botanical Paper v0 Prototype

Organic Botanical Paper currently depends on a v0 prototype/separate app for part of the customer menu experience.

## Current status

- The v0 app should be treated as a prototype, not the final production architecture.
- The main PayMyDine frontend embeds the prototype for the Organic menu path instead of rendering all Organic UI natively in the main React tree.
- The prototype may contain local UI for the top bar, category display, food cards, product modal, and valet entry.
- Parent/child integration can happen through iframe messaging, parent callbacks, or locally simulated UI depending on the specific v0 component.

## Architectural risk

Keeping Organic as a separate app long-term increases risk because:

- Cart, checkout, table order, payment, waiter, note, and valet behavior can drift from the main frontend.
- Deployment requires an additional app/process and routing coordination.
- Styling and state are split across parent and iframe boundaries.
- Fixes often become runtime DOM patches rather than clean component changes.

## Long-term target

The target is to migrate the Organic UI into the main frontend as native theme components:

- Organic top bar and navigation.
- Organic category sections.
- Organic food cards and product modal.
- Organic toolbar/dock.
- Organic checkout, waiter/note, and valet presentation.

Those components should use the same shared PayMyDine business logic as Gold Luxury.

## Guidance until migration

- Do not add more runtime DOM hacks to the v0 prototype unless absolutely necessary for a critical production issue.
- Do not duplicate checkout/order/payment submission logic inside the prototype.
- Prefer parent-shared actions or extracted shared services for real behavior.
- Treat the iframe/prototype path as temporary until native Organic UI reaches feature parity.

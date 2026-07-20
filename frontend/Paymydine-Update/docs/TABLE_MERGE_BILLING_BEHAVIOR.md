# Table Merge Billing Behavior

## Current implementation

- Table merge groups are persisted in the tenant database with `table_groups` and `table_group_tables`.
- The admin order-create table map fetches active groups and visually marks merged tables.
- Only users with `Admin.ManageTables` can see table layout controls and can create/unmerge groups through the admin handlers.
- Waiters without that permission do not receive the edit/zoom/merge controls in the DOM, and mutation handlers check the permission again server-side.

## Billing/order behavior

This change does **not** rewrite checkout, split-bill, payment, or order status logic.

- Existing orders remain attached to the table/order fields already used by the order flow.
- Merged tables are a persisted admin/table-map grouping used to coordinate service and seating.
- The safest operating procedure is to create/pay the active order on the main table in the merged group and use the displayed group label (for example `Table 4 + Table 5`) as staff context.
- Split bill remains item/order based in the existing checkout flow; this table-map merge does not disable split payments.
- Payments remain attached to the existing order record, not to a physical-table-group row.

## Follow-up required for full automatic order routing

If PayMyDine should automatically route attached-table QR orders to the main table's active order, add a dedicated resolver in the order creation/status APIs that:

1. Finds the active `table_groups` row for the scanned table.
2. Resolves the main table from the group ordering.
3. Finds or creates the active draft/submitted order for that main table.
4. Preserves split-bill and payment behavior by keeping all items on the resolved main order.

That routing is intentionally not implemented here because it changes customer checkout/order semantics and needs live operational validation.

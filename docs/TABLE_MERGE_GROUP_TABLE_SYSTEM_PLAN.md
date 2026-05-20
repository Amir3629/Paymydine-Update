# TABLE_MERGE_GROUP_TABLE_SYSTEM_PLAN

## Scope
Research-only plan for future table merge/group-table capabilities in admin table map. No merge logic is implemented in this branch.

## Goals
- Define user stories for combining multiple physical tables into a temporary service group.
- Preserve existing order integrity and table status behavior.
- Ensure waiters can continue normal order creation while elevated actions stay permission-gated.

## Research Areas
1. Data model options
   - Virtual group entity with many-to-many table mapping.
   - Reuse of existing `tables` and `orders` records with a group key.
2. Permission model
   - Restrict create/edit/remove group actions to authorized admins.
   - Keep waiter permissions unchanged for standard table ordering.
3. UI/UX
   - Group create flow from table map (select multiple tables, name group, confirm).
   - Visual indicators for grouped tables and occupancy aggregation.
4. Order lifecycle impacts
   - Move/split/close behavior when grouped tables are active.
   - Conflict handling when one table in a group already has active orders.
5. Reporting and audit trail
   - Log group creation/removal with actor and timestamp.

## Risks
- Data inconsistencies if partial group operations fail mid-transaction.
- Regressions in existing move-table workflows.
- Permission bypass from direct route calls without explicit server checks.

## Suggested Next Steps
- Produce sequence diagrams for create group, attach/detach table, and close group.
- Add integration test matrix before any implementation begins.
- Review migration strategy for backward compatibility across tenants.

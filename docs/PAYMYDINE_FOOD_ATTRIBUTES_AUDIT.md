# PayMyDine Food Attributes / Nutrition / VAT Audit

Date: 2026-05-19 (UTC)

## 1) Git baseline
- Branch: `work`
- HEAD at audit start: `edb50a337362e556db82add7821d53e3d9a0aa8a`

## 2) What already existed before implementation
- Admin menu form already had: Halal/Vegetarian/Vegan switches, allergens relation, nutrition fields, serving size, and color picker.
- Backend model/request already had casts/validation for dietary + nutrition + color fields.
- API controllers already normalized booleans and allergy tags arrays in most endpoints.
- Frontend already had reusable components for:
  - food attribute tags
  - nutrition summary
  - color dot
  - card/modal display integration
- Admin order create page already displayed compact dietary/nutrition/allergen badges in menu selector.

## 3) Missing / incomplete items found
1. `TenantApiController` did not include `color` in safe select columns and normalization output.
2. `Api\MenuController::items()` endpoint did not include `color` in select/response payload.
3. Visible Tax labels remained in admin order-create summary and order totals title.
4. `docs/AI_NUTRITION_SYSTEM_PLAN.md` missing.
5. No repo migration/schema artifact found for optional `ti_menus` food columns.

## 4) Safe minimal changes applied
- Added safe optional `color` column mapping + normalization in `TenantApiController`.
- Added `color` select + response mapping in `Api\MenuController::items()`.
- Updated visible admin order-create labels from Tax to VAT (display only; internals unchanged).
- Added AI nutrition safe-scope plan doc (no runtime AI implementation).
- Added idempotent SQL helper script for `ti_menus` optional columns.

## 5) DB/schema notes
- Existing framework migrations do not currently define these optional menu columns.
- Added SQL helper script: `scripts/sql/add_food_attributes_columns_ti_menus.sql`
- Script is MySQL-safe/idempotent via `ADD COLUMN IF NOT EXISTS`.
- Does **not** rename internal tax columns/variables.

## 6) Tax references intentionally kept
- Internal variable names and logic such as `tax_amount`, `taxSettings`, tax calculation helper names.
- API compatibility aliases where legacy tax keys are accepted alongside VAT keys.
- Database/internal codes like order total code `tax` are retained to avoid calculation/reporting breakage.

## 7) Exclusion checks
- No toolbar normalizer files changed.
- No payment core logic files refactored.
- No tenant routing architecture changes.
- No binary assets added.

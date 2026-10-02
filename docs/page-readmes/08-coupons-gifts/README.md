# Coupons & Gifts — `/admin/coupons`

## Purpose

The canonical Coupons URL renders one clean PMD coupon/gift workspace while retaining framework ListController/FormController compatibility as backend authority for legacy flows.

- URL: `/admin/coupons`
- Controller: `app/admin/controllers/Coupons.php`
- Model: `Admin\Models\Coupons_model`
- View: `app/admin/views/pmdcoupons/index.blade.php`
- Modal host: `pmdcoupons/_modal_host.blade.php`
- Required permission set includes `Admin`, `PMD.Workspace.Owner`, `PMD.Workspace.Manager`
- Assets: `pmd-coupon-manager-v13.css` / `pmd-coupon-manager-v13.js`

## Canonical vs legacy navigation

Normal GET `create`, `edit` and `preview` routes redirect into `/admin/coupons` with modal query state (`pmd_mode=create`, `pmd_mode=edit&pmd_id=...`). AJAX/POST compatibility remains for the mature form framework. This preserves one visible product UI without replacing stable write hooks.

## Supported instruments

`coupon`, `gift_card`, `voucher`, `credit`, `comp`. Coupon/voucher are discount instruments; gift_card/credit/comp are balance instruments when tenant schema supports the extended columns.

## `onPmdCouponSaveV1`

Validates ID, card type, name, code, description, fixed/percentage discount, initial balance, purchase price, minimum total, redemption limits, status, gift-card purchasable/reloadable/transferable flags and expiry date.

Important invariants:

- schema capability is checked before extended gift/credit fields are used;
- percentage discount cannot exceed 100;
- discount coupon/voucher requires positive discount;
- code is uppercased and generated when omitted;
- code uniqueness is case-insensitive;
- write is transactional;
- initial/current balance is initialized only for new supported balance instruments;
- status/expiry/optional flags write only when the column exists.

## Other mutations

`onPmdCouponToggleStatusV1` toggles supported status. `onPmdCouponDeleteV1` validates/fetches and deletes transactionally. Both return explicit 4xx/5xx errors rather than optimistic success.

## Workspace catalog/metrics

First paint loads cards newest-first, optionally counts successful redemption history, derives active/expired state, totals redemptions and stored balance, and builds display plus edit catalogs.

## Relationship to checkout

Frontend/customer checkout may call `/validate-coupon`, but final discount validity remains server authority: code, status, expiry, limits, minimum total and instrument semantics must be revalidated when applying to an order.

## Regression matrix

- Direct legacy GET create/edit returns to canonical workspace.
- Duplicate code check is case-insensitive.
- 100% percentage valid; >100% invalid.
- Older schema degrades safely for gift/credit features.
- Editing gift card does not reset existing current balance.
- Expired instruments are not counted active.
- Delete/status survives reload.
- Checkout validation agrees with admin state.

---

Audited 2026-09-06 against `main` at `d6e443b88a0fd72a5727854b245d8f0678497447`.
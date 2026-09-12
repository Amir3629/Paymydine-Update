# Menu Manager — `/admin/menu`

## Purpose and authority split

Menu is a server-rendered catalog/presentation workspace. Current architecture explicitly separates display/composition from writes:

- `Pmdmenus.php` owns catalog composition and first-paint state;
- `Menus.php` remains the **food write authority**;
- `Combos.php` remains the **combo write authority**;
- category lifecycle uses existing category/model authorities.

Do not move writes into `Pmdmenus` merely because it is the visible page.

## Entry points

- Clean URL: `/admin/menu`
- Internal: `/admin/pmdmenus`
- Controller: `app/admin/controllers/Pmdmenus.php`
- Permission: `Admin.Menus`
- View: `app/admin/views/pmdmenus/index.blade.php`
- Modal host: `app/admin/views/pmdmenus/_modal_host.blade.php`
- Models: `Menus_model`, `Categories_model`, `Menu_combos_model`, `Allergens_model`, media relations.

## First-paint food catalog

Foods load with categories, allergens, images and media, ordered by `menu_priority` then name. Cards normalize ID/name/description/price, categories, image, publish/stock state, halal/vegetarian/vegan, allergens, calories/serving size/macros and preparation time.

A missing image uses the PayMyDine logo fallback. New foods must not “guess” an image from unrelated legacy bytes/name matches.

## Category/order authority

Categories are real DB rows ordered by `priority`. The Combination category is a real category with `pmd_kind=combos`; do not synthesize a duplicate “Combos” category.

“All Foods” is a view, not a second ordering source:

1. category priority controls outer grouping;
2. `menu_priority` controls food order inside category;
3. a multi-category food renders once under its first category in current category priority;
4. uncategorized foods remain last.

Client-side sorting must not overwrite this ordering contract.

## Permissions

Category management begins with `Admin.Categories`; deletion is further constrained to Owner/Manager role context. Combo management requires combo schema and either `Admin.Combos` or the approved Owner/Manager Menu bridge. Other roles do not gain combo writes simply by seeing Menu.

## Combo catalog

When permitted, combos load with combo items/menu records. The page derives quantities, images/profile, editable description, price/status and composite dietary/nutrition presentation. Combo persistence remains in `Combos.php`.

## Canonical writer actions

High-signal actions in `Menus.php`: create/edit, Menu Manager save, menu-option editing, nutrition/name assistants, published/stock toggles, delete, category create/delete, category-order save and card-order save. `Combos.php` owns combo save/delete/order. If a modal button fails, trace its actual writer before editing `Pmdmenus`.

## Kitchen/prep and customer frontend

Food-level `prep_time_minutes` is item data. Kitchen capacity settings should stay consistent with Shifts/kitchen services. Frontend V2 reads canonical public `/api/v1/menu`, including categories/items/combos/media/options/dietary/nutrition. An Admin save is only end-to-end complete when the public API for the same tenant reflects it.

## Regression matrix

- Category priority + menu priority survive reload.
- Multi-category item appears once in All Foods.
- Exactly one real combo-category authority.
- New food never inherits unrelated legacy image.
- Category delete enforces Owner/Manager.
- Publish/stock changes reach public API.
- Combo writes still route to `Combos.php`.
- Nutrition/dietary/allergen fields survive edit/public normalization.
- Failed modal save cannot leave optimistic browser state diverged from DB.

---

Audited 2026-09-06 against `main` at `d6e443b88a0fd72a5727854b245d8f0678497447`.
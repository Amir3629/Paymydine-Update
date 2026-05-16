# Food Attributes & Allergy Tags deploy notes

This feature adds display-only food attributes for menu items:

- `menus.is_halal`
- `menus.is_vegetarian`
- `menus.is_vegan`
- allergy tags through the existing `allergens` / `allergenables` menu relation

These tags are customer-facing restaurant information only. They are not a legal compliance system.

## Tenant database rollout

PayMyDine stores restaurant menu data in tenant databases. Apply the migration to every tenant database that serves admin/menu traffic.

1. Back up each tenant database.
2. Deploy the code.
3. Run the admin/module migrations for each tenant database using the same tenant migration command used for previous `app/admin/database/migrations` changes in this installation.
4. Verify each tenant `menus` table has `is_halal`, `is_vegetarian`, and `is_vegan` as `TINYINT(1)`/boolean columns with default `0`.
5. Verify allergy presets exist in each tenant `allergens` table, and existing allergen relations in `allergenables` remain untouched.
6. Clear Laravel/TastyIgniter caches and restart PHP-FPM/queue workers if that is part of the normal deployment process.

The API is backward compatible during rollout: if the new columns are not present yet, menu endpoints return `halal: false`, `vegetarian: false`, `vegan: false`, and an empty allergy tag list unless existing allergen relations are available.

## Rollback

1. Revert the code deployment.
2. If the schema also needs to be reverted, run the migration rollback for each tenant database or manually drop `menus.is_halal`, `menus.is_vegetarian`, and `menus.is_vegan`.
3. Do not delete existing rows from `allergens` or `allergenables` unless explicitly required; the migration inserts reusable presets and existing relations may be shared with other menu data.
4. Clear caches after rollback.

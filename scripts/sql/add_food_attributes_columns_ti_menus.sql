-- Idempotent helper for tenants missing optional food-attribute fields on ti_menus.
-- Safe scope: adds only optional columns; no tax/payment/internal renames.

ALTER TABLE `ti_menus`
  ADD COLUMN IF NOT EXISTS `is_halal` TINYINT(1) NOT NULL DEFAULT 0 AFTER `menu_status`,
  ADD COLUMN IF NOT EXISTS `is_vegetarian` TINYINT(1) NOT NULL DEFAULT 0 AFTER `is_halal`,
  ADD COLUMN IF NOT EXISTS `is_vegan` TINYINT(1) NOT NULL DEFAULT 0 AFTER `is_vegetarian`,
  ADD COLUMN IF NOT EXISTS `calories` INT NULL AFTER `is_vegan`,
  ADD COLUMN IF NOT EXISTS `protein` DECIMAL(8,2) NULL AFTER `calories`,
  ADD COLUMN IF NOT EXISTS `carbs` DECIMAL(8,2) NULL AFTER `protein`,
  ADD COLUMN IF NOT EXISTS `fat` DECIMAL(8,2) NULL AFTER `carbs`,
  ADD COLUMN IF NOT EXISTS `sugar` DECIMAL(8,2) NULL AFTER `fat`,
  ADD COLUMN IF NOT EXISTS `serving_size` VARCHAR(64) NULL AFTER `sugar`,
  ADD COLUMN IF NOT EXISTS `color` VARCHAR(16) NULL AFTER `serving_size`;

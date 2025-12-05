
SET @table_prefix = 'ti_';

 
ALTER TABLE `ti_menus` 
  ADD COLUMN `is_stock_out` tinyint(1) NOT NULL DEFAULT '0' COMMENT 'Flag to mark items as stock-out (visible but not orderable)' AFTER `menu_status`;

-- Add index for faster queries on stock-out status (ignore error if index already exists)
ALTER TABLE `ti_menus`
  ADD INDEX `idx_is_stock_out` (`is_stock_out`);
 
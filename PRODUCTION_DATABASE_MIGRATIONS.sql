
SET @table_prefix = 'ti_';

-- =====================================================
-- 1. TIPS MANAGEMENT TABLES
-- =====================================================

-- Create tips_shifts table
CREATE TABLE IF NOT EXISTS `ti_tips_shifts` (
  `shift_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `shift_date` date NOT NULL,
  `location_id` int(10) unsigned DEFAULT NULL,
  `description` text DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`shift_id`),
  KEY `idx_shift_date_location` (`shift_date`, `location_id`),
  UNIQUE KEY `unique_shift_date_location` (`shift_date`, `location_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 2. COMBO MEALS TABLES
-- =====================================================

-- Create menu_combos table
CREATE TABLE IF NOT EXISTS `ti_menu_combos` (
  `combo_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `combo_name` varchar(128) NOT NULL,
  `combo_description` text DEFAULT NULL,
  `combo_price` decimal(15,4) NOT NULL,
  `location_id` int(10) unsigned DEFAULT NULL,
  `combo_status` tinyint(1) NOT NULL DEFAULT '1',
  `combo_priority` int(11) NOT NULL DEFAULT '0',
  `thumb` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`combo_id`),
  KEY `idx_combo_status_priority` (`combo_status`, `combo_priority`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create menu_combo_items table (pivot table)
CREATE TABLE IF NOT EXISTS `ti_menu_combo_items` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `combo_id` bigint(20) unsigned NOT NULL,
  `menu_id` bigint(20) unsigned NOT NULL,
  `quantity` int(11) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_combo_menu` (`combo_id`, `menu_id`),
  CONSTRAINT `fk_combo_items_combo` FOREIGN KEY (`combo_id`) REFERENCES `ti_menu_combos` (`combo_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_combo_items_menu` FOREIGN KEY (`menu_id`) REFERENCES `ti_menus` (`menu_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add combo support columns to order_menus table
-- NOTE: If columns already exist, these statements will fail. That's OK - just ignore the errors.
-- You can check if columns exist first using: SHOW COLUMNS FROM ti_order_menus LIKE 'is_combo';

ALTER TABLE `ti_order_menus` 
  ADD COLUMN `is_combo` tinyint(1) DEFAULT '0' COMMENT 'Flag to identify combo meals';

ALTER TABLE `ti_order_menus` 
  ADD COLUMN `combo_id` bigint(20) unsigned DEFAULT NULL COMMENT 'Reference to menu_combos.combo_id';

ALTER TABLE `ti_order_menus` 
  ADD COLUMN `combo_items_description` text DEFAULT NULL COMMENT 'Description of combo items';

-- Add index for combo_id in order_menus (ignore error if index already exists)
ALTER TABLE `ti_order_menus`
  ADD INDEX `idx_combo_id` (`combo_id`);

-- =====================================================
-- 3. MULTIPLE PRICE LEVELS TABLE
-- =====================================================

-- Create menu_prices table
CREATE TABLE IF NOT EXISTS `ti_menu_prices` (
  `price_id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `menu_id` int(10) unsigned NOT NULL,
  `price_type` varchar(50) NOT NULL COMMENT 'default, bar, dining_room, room_service, happy_hour',
  `price` decimal(10,2) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `time_from` time DEFAULT NULL COMMENT 'Start time for time-based pricing',
  `time_to` time DEFAULT NULL COMMENT 'End time for time-based pricing',
  `days_of_week` varchar(20) DEFAULT NULL COMMENT 'Comma-separated: Mon,Tue,Wed or NULL for all days',
  `priority` int(11) NOT NULL DEFAULT '0' COMMENT 'Higher priority takes precedence',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`price_id`),
  KEY `idx_menu_id` (`menu_id`),
  KEY `idx_price_type_active` (`price_type`, `is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 4. LOCATIONABLES TABLE (for combo locations)
-- =====================================================
-- Note: This table might already exist. The following will only create it if it doesn't exist.

CREATE TABLE IF NOT EXISTS `ti_locationables` (
  `locationable_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `location_id` int(10) unsigned NOT NULL,
  `locationable_type` varchar(128) NOT NULL,
  `locationable_id` bigint(20) unsigned NOT NULL,
  PRIMARY KEY (`locationable_id`),
  KEY `idx_location` (`location_id`),
  KEY `idx_locationable` (`locationable_type`, `locationable_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================
-- Run these to verify the tables were created successfully:

-- SELECT 'Tips Shifts Table' AS table_name, COUNT(*) AS row_count FROM ti_tips_shifts
-- UNION ALL
-- SELECT 'Menu Combos Table', COUNT(*) FROM ti_menu_combos
-- UNION ALL
-- SELECT 'Menu Combo Items Table', COUNT(*) FROM ti_menu_combo_items
-- UNION ALL
-- SELECT 'Menu Prices Table', COUNT(*) FROM ti_menu_prices;

-- =====================================================
-- END OF MIGRATION SCRIPT
-- =====================================================


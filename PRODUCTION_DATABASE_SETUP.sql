
-- Add tax-related settings to ti_settings table

-- Check if tax settings exist, if not insert them
INSERT IGNORE INTO `ti_settings` (`sort`, `item`, `value`, `serialized`) VALUES
('config', 'tax_mode', '0', NULL),
('config', 'tax_percentage', '0', NULL),
('config', 'tax_menu_price', '0', NULL),
('config', 'tax_delivery_charge', '0', NULL);

-- Update existing tax_mode if it exists
UPDATE `ti_settings` SET `value` = '0' WHERE `item` = 'tax_mode' AND `sort` = 'config';

-- =====================================================
-- 2. COUPON SYSTEM TABLES
-- =====================================================

-- Create igniter_coupons table
CREATE TABLE IF NOT EXISTS `igniter_coupons` (
  `coupon_id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `code` varchar(32) NOT NULL,
  `name` varchar(128) NOT NULL,
  `description` text,
  `type` varchar(32) NOT NULL DEFAULT 'F',
  `discount` decimal(15,4) NOT NULL DEFAULT '0.0000',
  `min_total` decimal(15,4) DEFAULT NULL,
  `redemptions` int(10) unsigned DEFAULT NULL,
  `customer_redemptions` int(10) unsigned DEFAULT NULL,
  `status` tinyint(1) NOT NULL DEFAULT '1',
  `period_start_date` datetime DEFAULT NULL,
  `period_end_date` datetime DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`coupon_id`),
  UNIQUE KEY `code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create igniter_coupons_history table
CREATE TABLE IF NOT EXISTS `igniter_coupons_history` (
  `coupon_history_id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `coupon_id` int(10) unsigned NOT NULL,
  `order_id` int(10) unsigned DEFAULT NULL,
  `customer_id` int(10) unsigned DEFAULT NULL,
  `code` varchar(32) NOT NULL,
  `discount` decimal(15,4) NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`coupon_history_id`),
  KEY `coupon_id` (`coupon_id`),
  KEY `order_id` (`order_id`),
  KEY `customer_id` (`customer_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create pivot tables for coupon relationships
CREATE TABLE IF NOT EXISTS `igniter_coupon_categories` (
  `coupon_id` int(10) unsigned NOT NULL,
  `category_id` int(10) unsigned NOT NULL,
  PRIMARY KEY (`coupon_id`, `category_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `igniter_coupon_menus` (
  `coupon_id` int(10) unsigned NOT NULL,
  `menu_id` int(10) unsigned NOT NULL,
  PRIMARY KEY (`coupon_id`, `menu_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `igniter_coupon_customers` (
  `coupon_id` int(10) unsigned NOT NULL,
  `customer_id` int(10) unsigned NOT NULL,
  PRIMARY KEY (`coupon_id`, `customer_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `igniter_coupon_customer_groups` (
  `coupon_id` int(10) unsigned NOT NULL,
  `customer_group_id` int(10) unsigned NOT NULL,
  PRIMARY KEY (`coupon_id`, `customer_group_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 3. ORDER TOTALS TABLE UPDATES
-- =====================================================
-- Ensure order_totals table can handle coupon discounts

-- Check if order_totals table exists, if not create it
CREATE TABLE IF NOT EXISTS `ti_order_totals` (
  `order_total_id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `order_id` int(10) unsigned NOT NULL,
  `code` varchar(32) NOT NULL,
  `title` varchar(128) NOT NULL,
  `value` decimal(15,4) NOT NULL DEFAULT '0.0000',
  `priority` int(10) unsigned NOT NULL DEFAULT '0',
  PRIMARY KEY (`order_total_id`),
  KEY `order_id` (`order_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 4. SAMPLE DATA INSERTION
-- =====================================================

-- Insert sample coupon for testing
INSERT IGNORE INTO `igniter_coupons` (
  `code`, 
  `name`, 
  `description`, 
  `type`, 
  `discount`, 
  `min_total`, 
  `redemptions`, 
  `customer_redemptions`, 
  `status`, 
  `period_start_date`, 
  `period_end_date`, 
  `created_at`, 
  `updated_at`
) VALUES (
  '111111', 
  'Test Coupon', 
  'Test coupon for debugging', 
  'F', 
  10.0000, 
  0.0000, 
  0, 
  0, 
  1, 
  NOW() - INTERVAL 30 DAY, 
  NOW() + INTERVAL 30 DAY, 
  NOW(), 
  NOW()
);

-- =====================================================
-- 5. VERIFICATION QUERIES
-- =====================================================

-- Verify tax settings were created
SELECT 'Tax Settings Check:' as 'Status';
SELECT item, value FROM ti_settings WHERE item LIKE 'tax_%';

-- Verify coupon tables were created
SELECT 'Coupon Tables Check:' as 'Status';
SHOW TABLES LIKE 'igniter_coupon%';

-- Verify sample coupon was inserted
SELECT 'Sample Coupon Check:' as 'Status';
SELECT code, name, discount, status FROM igniter_coupons WHERE code = '111111';

-- =====================================================
-- 6. ADMIN PANEL CONFIGURATION
-- =====================================================

-- Set default tax settings (can be changed in admin panel)
UPDATE `ti_settings` SET `value` = '1' WHERE `item` = 'tax_mode' AND `sort` = 'config';
UPDATE `ti_settings` SET `value` = '10' WHERE `item` = 'tax_percentage' AND `sort` = 'config';
UPDATE `ti_settings` SET `value` = '0' WHERE `item` = 'tax_menu_price' AND `sort` = 'config';
UPDATE `ti_settings` SET `value` = '0' WHERE `item` = 'tax_delivery_charge' AND `sort` = 'config';

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================

SELECT '=====================================================' as '';
SELECT 'DATABASE SETUP COMPLETED SUCCESSFULLY!' as 'Status';
SELECT '=====================================================' as '';
SELECT 'Next Steps:' as 'Instructions';
SELECT '1. Copy all modified files to production server' as 'Step 1';
SELECT '2. Test tax settings in admin panel' as 'Step 2';
SELECT '3. Test coupon functionality with code: 111111' as 'Step 3';
SELECT '4. Verify all features work correctly' as 'Step 4';
SELECT '=====================================================' as '';

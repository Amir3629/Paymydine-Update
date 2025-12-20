-- === =========================================================================
-- SAFE GIFT CARD MIGRATION FOR MIMOZA DATABASE
-- ============================================================================

-- Disable foreign key checks temporarily for safety
SET FOREIGN_KEY_CHECKS = 0;

-- ============================================================================
-- Add columns to ti_igniter_coupons table
-- Using stored procedure to safely check and add columns
-- ============================================================================

DELIMITER $$

-- Procedure to add column if it doesn't exist
DROP PROCEDURE IF EXISTS AddColumnIfNotExists$$
CREATE PROCEDURE AddColumnIfNotExists(
    IN tableName VARCHAR(128),
    IN columnName VARCHAR(128),
    IN columnDefinition TEXT
)
BEGIN
    DECLARE columnExists INT DEFAULT 0;
    
    SELECT COUNT(*) INTO columnExists
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = tableName
      AND COLUMN_NAME = columnName;
    
    IF columnExists = 0 THEN
        SET @sql = CONCAT('ALTER TABLE `', tableName, '` ADD COLUMN `', columnName, '` ', columnDefinition);
        PREPARE stmt FROM @sql;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;
END$$

-- Add card_type column
CALL AddColumnIfNotExists('ti_igniter_coupons', 'card_type', 
    'ENUM(\'coupon\', \'gift_card\', \'voucher\', \'credit\', \'comp\') NOT NULL DEFAULT \'coupon\' AFTER `code`');

-- Add initial_balance column
CALL AddColumnIfNotExists('ti_igniter_coupons', 'initial_balance', 
    'DECIMAL(15,4) DEFAULT NULL AFTER `card_type`');

-- Add current_balance column
CALL AddColumnIfNotExists('ti_igniter_coupons', 'current_balance', 
    'DECIMAL(15,4) DEFAULT NULL AFTER `initial_balance`');

-- Add is_reloadable column
CALL AddColumnIfNotExists('ti_igniter_coupons', 'is_reloadable', 
    'TINYINT(1) NOT NULL DEFAULT 0 AFTER `current_balance`');

-- Add is_purchasable column
CALL AddColumnIfNotExists('ti_igniter_coupons', 'is_purchasable', 
    'TINYINT(1) NOT NULL DEFAULT 0 AFTER `is_reloadable`');

-- Add purchase_price column
CALL AddColumnIfNotExists('ti_igniter_coupons', 'purchase_price', 
    'DECIMAL(15,4) DEFAULT NULL AFTER `is_purchasable`');

-- Add purchased_by column
CALL AddColumnIfNotExists('ti_igniter_coupons', 'purchased_by', 
    'BIGINT(20) UNSIGNED DEFAULT NULL AFTER `purchase_price`');

-- Add purchase_date column
CALL AddColumnIfNotExists('ti_igniter_coupons', 'purchase_date', 
    'TIMESTAMP NULL DEFAULT NULL AFTER `purchased_by`');

-- Add first_use_date column
CALL AddColumnIfNotExists('ti_igniter_coupons', 'first_use_date', 
    'TIMESTAMP NULL DEFAULT NULL AFTER `purchase_date`');

-- Add last_use_date column
CALL AddColumnIfNotExists('ti_igniter_coupons', 'last_use_date', 
    'TIMESTAMP NULL DEFAULT NULL AFTER `first_use_date`');

-- Add is_transferable column
CALL AddColumnIfNotExists('ti_igniter_coupons', 'is_transferable', 
    'TINYINT(1) NOT NULL DEFAULT 0 AFTER `last_use_date`');

-- Add recipient_name column
CALL AddColumnIfNotExists('ti_igniter_coupons', 'recipient_name', 
    'VARCHAR(255) DEFAULT NULL AFTER `is_transferable`');

-- Add recipient_email column
CALL AddColumnIfNotExists('ti_igniter_coupons', 'recipient_email', 
    'VARCHAR(255) DEFAULT NULL AFTER `recipient_name`');

-- Add recipient_message column
CALL AddColumnIfNotExists('ti_igniter_coupons', 'recipient_message', 
    'TEXT DEFAULT NULL AFTER `recipient_email`');

-- Add is_digital column
CALL AddColumnIfNotExists('ti_igniter_coupons', 'is_digital', 
    'TINYINT(1) NOT NULL DEFAULT 1 AFTER `recipient_message`');

-- Add expiry_date column
CALL AddColumnIfNotExists('ti_igniter_coupons', 'expiry_date', 
    'TIMESTAMP NULL DEFAULT NULL AFTER `is_digital`');

-- Add max_discount_cap column
CALL AddColumnIfNotExists('ti_igniter_coupons', 'max_discount_cap', 
    'DECIMAL(15,4) DEFAULT NULL AFTER `expiry_date`');

-- Add design_id column
CALL AddColumnIfNotExists('ti_igniter_coupons', 'design_id', 
    'INT(10) UNSIGNED DEFAULT NULL AFTER `max_discount_cap`');

-- Drop the procedure (cleanup)
DROP PROCEDURE IF EXISTS AddColumnIfNotExists$$

DELIMITER ;

-- ============================================================================
-- Add indexes to ti_igniter_coupons (if not exist)
-- ============================================================================

DELIMITER $$

-- Procedure to add index if it doesn't exist
DROP PROCEDURE IF EXISTS AddIndexIfNotExists$$
CREATE PROCEDURE AddIndexIfNotExists(
    IN tableName VARCHAR(128),
    IN indexName VARCHAR(128),
    IN indexDefinition TEXT
)
BEGIN
    DECLARE indexExists INT DEFAULT 0;
    
    SELECT COUNT(*) INTO indexExists
    FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = tableName
      AND INDEX_NAME = indexName;
    
    IF indexExists = 0 THEN
        SET @sql = CONCAT('ALTER TABLE `', tableName, '` ADD INDEX `', indexName, '` ', indexDefinition);
        PREPARE stmt FROM @sql;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;
END$$

-- Add indexes
CALL AddIndexIfNotExists('ti_igniter_coupons', 'idx_card_type_status', '(`card_type`, `status`)');
CALL AddIndexIfNotExists('ti_igniter_coupons', 'idx_purchased_by', '(`purchased_by`)');
CALL AddIndexIfNotExists('ti_igniter_coupons', 'idx_expiry_date', '(`expiry_date`)');

-- Drop the procedure (cleanup)
DROP PROCEDURE IF EXISTS AddIndexIfNotExists$$

DELIMITER ;

-- ============================================================================
-- Extend ti_igniter_coupons_history table
-- ============================================================================

DELIMITER $$

-- Re-create procedure for history table
DROP PROCEDURE IF EXISTS AddColumnIfNotExists$$
CREATE PROCEDURE AddColumnIfNotExists(
    IN tableName VARCHAR(128),
    IN columnName VARCHAR(128),
    IN columnDefinition TEXT
)
BEGIN
    DECLARE columnExists INT DEFAULT 0;
    
    SELECT COUNT(*) INTO columnExists
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = tableName
      AND COLUMN_NAME = columnName;
    
    IF columnExists = 0 THEN
        SET @sql = CONCAT('ALTER TABLE `', tableName, '` ADD COLUMN `', columnName, '` ', columnDefinition);
        PREPARE stmt FROM @sql;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;
END$$

-- Add columns to history table
CALL AddColumnIfNotExists('ti_igniter_coupons_history', 'balance_before', 
    'DECIMAL(15,4) DEFAULT NULL AFTER `amount`');

CALL AddColumnIfNotExists('ti_igniter_coupons_history', 'balance_after', 
    'DECIMAL(15,4) DEFAULT NULL AFTER `balance_before`');

CALL AddColumnIfNotExists('ti_igniter_coupons_history', 'amount_redeemed', 
    'DECIMAL(15,4) DEFAULT NULL AFTER `balance_after`');

CALL AddColumnIfNotExists('ti_igniter_coupons_history', 'redemption_type', 
    'ENUM(\'full\', \'partial\') DEFAULT \'full\' AFTER `amount_redeemed`');

-- Drop the procedure (cleanup)
DROP PROCEDURE IF EXISTS AddColumnIfNotExists$$

DELIMITER ;

-- ============================================================================
-- Create ti_gift_card_transactions table (if not exists)
-- ============================================================================

CREATE TABLE IF NOT EXISTS `ti_gift_card_transactions` (
  `transaction_id` BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `coupon_id` BIGINT(20) UNSIGNED NOT NULL,
  `customer_id` BIGINT(20) UNSIGNED DEFAULT NULL,
  `order_id` BIGINT(20) UNSIGNED DEFAULT NULL,
  `transaction_type` ENUM('purchase', 'reload', 'redemption', 'refund', 'adjustment') NOT NULL,
  `amount` DECIMAL(15,4) NOT NULL,
  `balance_before` DECIMAL(15,4) NOT NULL,
  `balance_after` DECIMAL(15,4) NOT NULL,
  `payment_method` VARCHAR(50) DEFAULT NULL,
  `payment_reference` VARCHAR(255) DEFAULT NULL,
  `notes` TEXT DEFAULT NULL,
  `staff_id` BIGINT(20) UNSIGNED DEFAULT NULL,
  `created_at` TIMESTAMP NULL DEFAULT NULL,
  `updated_at` TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`transaction_id`),
  KEY `idx_coupon_id` (`coupon_id`),
  KEY `idx_customer_id` (`customer_id`),
  KEY `idx_order_id` (`order_id`),
  KEY `idx_transaction_type` (`transaction_type`),
  KEY `idx_created_at` (`created_at`),
  CONSTRAINT `fk_gift_card_txn_coupon` 
    FOREIGN KEY (`coupon_id`) 
    REFERENCES `ti_igniter_coupons` (`coupon_id`) 
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- Create ti_gift_card_designs table (if not exists)
-- ============================================================================

CREATE TABLE IF NOT EXISTS `ti_gift_card_designs` (
  `design_id` INT(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(128) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `image_path` VARCHAR(255) DEFAULT NULL,
  `template_html` TEXT DEFAULT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `is_default` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NULL DEFAULT NULL,
  `updated_at` TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`design_id`),
  KEY `idx_is_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- Insert default gift card designs (only if they don't exist)
-- ============================================================================

INSERT INTO `ti_gift_card_designs` 
(`name`, `description`, `is_active`, `is_default`, `created_at`, `updated_at`) 
SELECT 'Classic', 'Classic gift card design', 1, 1, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM `ti_gift_card_designs` WHERE `name` = 'Classic');

INSERT INTO `ti_gift_card_designs` 
(`name`, `description`, `is_active`, `is_default`, `created_at`, `updated_at`) 
SELECT 'Birthday', 'Birthday celebration design', 1, 0, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM `ti_gift_card_designs` WHERE `name` = 'Birthday');

INSERT INTO `ti_gift_card_designs` 
(`name`, `description`, `is_active`, `is_default`, `created_at`, `updated_at`) 
SELECT 'Holiday', 'Holiday season design', 1, 0, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM `ti_gift_card_designs` WHERE `name` = 'Holiday');

INSERT INTO `ti_gift_card_designs` 
(`name`, `description`, `is_active`, `is_default`, `created_at`, `updated_at`) 
SELECT 'Thank You', 'Thank you appreciation design', 1, 0, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM `ti_gift_card_designs` WHERE `name` = 'Thank You');

-- ============================================================================
-- Update existing coupons to have card_type = 'coupon' (if NULL)
-- ============================================================================

UPDATE `ti_igniter_coupons` 
SET `card_type` = 'coupon' 
WHERE `card_type` IS NULL OR `card_type` = '';

-- Re-enable foreign key checks
SET FOREIGN_KEY_CHECKS = 1;


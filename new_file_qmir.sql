
SET @dbname = DATABASE();
SET @tablename = 'ti_igniter_coupons';
SET @columnname = 'card_type';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (TABLE_SCHEMA = @dbname)
      AND (TABLE_NAME = @tablename)
      AND (COLUMN_NAME = @columnname)
  ) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN `card_type` ENUM(\'coupon\', \'gift_card\', \'voucher\', \'credit\', \'comp\') NOT NULL DEFAULT \'coupon\' AFTER `code` COMMENT \'Type of card: coupon, gift_card, voucher, credit, or comp\'')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Initial balance
SET @columnname = 'initial_balance';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (TABLE_SCHEMA = @dbname)
      AND (TABLE_NAME = @tablename)
      AND (COLUMN_NAME = @columnname)
  ) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN `initial_balance` DECIMAL(15,4) DEFAULT NULL AFTER `card_type` COMMENT \'Initial balance for gift cards\'')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Current balance
SET @columnname = 'current_balance';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (TABLE_SCHEMA = @dbname)
      AND (TABLE_NAME = @tablename)
      AND (COLUMN_NAME = @columnname)
  ) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN `current_balance` DECIMAL(15,4) DEFAULT NULL AFTER `initial_balance` COMMENT \'Current remaining balance\'')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Is reloadable
SET @columnname = 'is_reloadable';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (TABLE_SCHEMA = @dbname)
      AND (TABLE_NAME = @tablename)
      AND (COLUMN_NAME = @columnname)
  ) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN `is_reloadable` TINYINT(1) NOT NULL DEFAULT 0 AFTER `current_balance` COMMENT \'Can balance be reloaded\'')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Is purchasable
SET @columnname = 'is_purchasable';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (TABLE_SCHEMA = @dbname)
      AND (TABLE_NAME = @tablename)
      AND (COLUMN_NAME = @columnname)
  ) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN `is_purchasable` TINYINT(1) NOT NULL DEFAULT 0 AFTER `is_reloadable` COMMENT \'Can be purchased by customers\'')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Purchase price
SET @columnname = 'purchase_price';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (TABLE_SCHEMA = @dbname)
      AND (TABLE_NAME = @tablename)
      AND (COLUMN_NAME = @columnname)
  ) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN `purchase_price` DECIMAL(15,4) DEFAULT NULL AFTER `is_purchasable` COMMENT \'Price to purchase gift card\'')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Purchased by
SET @columnname = 'purchased_by';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (TABLE_SCHEMA = @dbname)
      AND (TABLE_NAME = @tablename)
      AND (COLUMN_NAME = @columnname)
  ) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN `purchased_by` BIGINT(20) UNSIGNED DEFAULT NULL AFTER `purchase_price` COMMENT \'Customer who purchased this card\'')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Purchase date
SET @columnname = 'purchase_date';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (TABLE_SCHEMA = @dbname)
      AND (TABLE_NAME = @tablename)
      AND (COLUMN_NAME = @columnname)
  ) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN `purchase_date` TIMESTAMP NULL DEFAULT NULL AFTER `purchased_by` COMMENT \'When card was purchased\'')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- First use date
SET @columnname = 'first_use_date';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (TABLE_SCHEMA = @dbname)
      AND (TABLE_NAME = @tablename)
      AND (COLUMN_NAME = @columnname)
  ) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN `first_use_date` TIMESTAMP NULL DEFAULT NULL AFTER `purchase_date` COMMENT \'First redemption date\'')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Last use date
SET @columnname = 'last_use_date';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (TABLE_SCHEMA = @dbname)
      AND (TABLE_NAME = @tablename)
      AND (COLUMN_NAME = @columnname)
  ) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN `last_use_date` TIMESTAMP NULL DEFAULT NULL AFTER `first_use_date` COMMENT \'Last redemption date\'')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Is transferable
SET @columnname = 'is_transferable';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (TABLE_SCHEMA = @dbname)
      AND (TABLE_NAME = @tablename)
      AND (COLUMN_NAME = @columnname)
  ) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN `is_transferable` TINYINT(1) NOT NULL DEFAULT 0 AFTER `last_use_date` COMMENT \'Can be transferred to another customer\'')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Recipient name
SET @columnname = 'recipient_name';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (TABLE_SCHEMA = @dbname)
      AND (TABLE_NAME = @tablename)
      AND (COLUMN_NAME = @columnname)
  ) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN `recipient_name` VARCHAR(255) DEFAULT NULL AFTER `is_transferable` COMMENT \'Gift recipient name\'')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Recipient email
SET @columnname = 'recipient_email';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (TABLE_SCHEMA = @dbname)
      AND (TABLE_NAME = @tablename)
      AND (COLUMN_NAME = @columnname)
  ) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN `recipient_email` VARCHAR(255) DEFAULT NULL AFTER `recipient_name` COMMENT \'Gift recipient email\'')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Recipient message
SET @columnname = 'recipient_message';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (TABLE_SCHEMA = @dbname)
      AND (TABLE_NAME = @tablename)
      AND (COLUMN_NAME = @columnname)
  ) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN `recipient_message` TEXT DEFAULT NULL AFTER `recipient_email` COMMENT \'Personal message for recipient\'')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Is digital
SET @columnname = 'is_digital';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (TABLE_SCHEMA = @dbname)
      AND (TABLE_NAME = @tablename)
      AND (COLUMN_NAME = @columnname)
  ) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN `is_digital` TINYINT(1) NOT NULL DEFAULT 1 AFTER `recipient_message` COMMENT \'Digital or physical card\'')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Expiry date
SET @columnname = 'expiry_date';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (TABLE_SCHEMA = @dbname)
      AND (TABLE_NAME = @tablename)
      AND (COLUMN_NAME = @columnname)
  ) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN `expiry_date` TIMESTAMP NULL DEFAULT NULL AFTER `is_digital` COMMENT \'Card expiry date (if applicable)\'')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Max discount cap
SET @columnname = 'max_discount_cap';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (TABLE_SCHEMA = @dbname)
      AND (TABLE_NAME = @tablename)
      AND (COLUMN_NAME = @columnname)
  ) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN `max_discount_cap` DECIMAL(15,4) DEFAULT NULL AFTER `expiry_date` COMMENT \'Maximum discount amount for percentage coupons\'')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Design ID
SET @columnname = 'design_id';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (TABLE_SCHEMA = @dbname)
      AND (TABLE_NAME = @tablename)
      AND (COLUMN_NAME = @columnname)
  ) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN `design_id` INT(10) UNSIGNED DEFAULT NULL AFTER `max_discount_cap` COMMENT \'Gift card design template ID\'')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Add indexes (only if they don't exist)
SET @indexname = 'idx_card_type_status';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
    WHERE
      (TABLE_SCHEMA = @dbname)
      AND (TABLE_NAME = @tablename)
      AND (INDEX_NAME = @indexname)
  ) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' ADD INDEX `idx_card_type_status` (`card_type`, `status`)')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

SET @indexname = 'idx_purchased_by';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
    WHERE
      (TABLE_SCHEMA = @dbname)
      AND (TABLE_NAME = @tablename)
      AND (INDEX_NAME = @indexname)
  ) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' ADD INDEX `idx_purchased_by` (`purchased_by`)')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

SET @indexname = 'idx_expiry_date';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
    WHERE
      (TABLE_SCHEMA = @dbname)
      AND (TABLE_NAME = @tablename)
      AND (INDEX_NAME = @indexname)
  ) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' ADD INDEX `idx_expiry_date` (`expiry_date`)')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

--   Extend ti_igniter_coupons_history table
SET @tablename = 'ti_igniter_coupons_history';

-- Balance before
SET @columnname = 'balance_before';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (TABLE_SCHEMA = @dbname)
      AND (TABLE_NAME = @tablename)
      AND (COLUMN_NAME = @columnname)
  ) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN `balance_before` DECIMAL(15,4) DEFAULT NULL AFTER `amount` COMMENT \'Balance before redemption\'')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Balance after
SET @columnname = 'balance_after';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (TABLE_SCHEMA = @dbname)
      AND (TABLE_NAME = @tablename)
      AND (COLUMN_NAME = @columnname)
  ) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN `balance_after` DECIMAL(15,4) DEFAULT NULL AFTER `balance_before` COMMENT \'Balance after redemption\'')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Amount redeemed
SET @columnname = 'amount_redeemed';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (TABLE_SCHEMA = @dbname)
      AND (TABLE_NAME = @tablename)
      AND (COLUMN_NAME = @columnname)
  ) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN `amount_redeemed` DECIMAL(15,4) DEFAULT NULL AFTER `balance_after` COMMENT \'Amount used in this transaction\'')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Redemption type
SET @columnname = 'redemption_type';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (TABLE_SCHEMA = @dbname)
      AND (TABLE_NAME = @tablename)
      AND (COLUMN_NAME = @columnname)
  ) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN `redemption_type` ENUM(\'full\', \'partial\') DEFAULT \'full\' AFTER `amount_redeemed` COMMENT \'Full or partial redemption\'')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

--  Create ti_gift_card_transactions table (if not exists)
CREATE TABLE IF NOT EXISTS `ti_gift_card_transactions` (
  `transaction_id` BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `coupon_id` BIGINT(20) UNSIGNED NOT NULL,
  `customer_id` BIGINT(20) UNSIGNED DEFAULT NULL,
  `order_id` BIGINT(20) UNSIGNED DEFAULT NULL,
  `transaction_type` ENUM('purchase', 'reload', 'redemption', 'refund', 'adjustment') NOT NULL
    COMMENT 'Type of transaction',
  `amount` DECIMAL(15,4) NOT NULL COMMENT 'Transaction amount',
  `balance_before` DECIMAL(15,4) NOT NULL COMMENT 'Balance before transaction',
  `balance_after` DECIMAL(15,4) NOT NULL COMMENT 'Balance after transaction',
  `payment_method` VARCHAR(50) DEFAULT NULL COMMENT 'Payment method used',
  `payment_reference` VARCHAR(255) DEFAULT NULL COMMENT 'Payment reference/transaction ID',
  `notes` TEXT DEFAULT NULL COMMENT 'Additional notes',
  `staff_id` BIGINT(20) UNSIGNED DEFAULT NULL COMMENT 'Staff who processed transaction',
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

--  Create ti_gift_card_designs table (if not exists)
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

--   Insert default gift card designs (only if table is empty)
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

--  Update existing coupons to have card_type = 'coupon' (if NULL)
UPDATE `ti_igniter_coupons` 
SET `card_type` = 'coupon' 
WHERE `card_type` IS NULL OR `card_type` = '';
 

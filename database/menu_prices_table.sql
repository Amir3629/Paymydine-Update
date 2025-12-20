-- Manual SQL script to create menu_prices table
-- Run this if migrations are not being used

CREATE TABLE IF NOT EXISTS `menu_prices` (
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
  KEY `idx_price_type_active` (`price_type`,`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Example data (optional - for testing)
-- INSERT INTO `menu_prices` (`menu_id`, `price_type`, `price`, `is_active`, `time_from`, `time_to`, `days_of_week`, `priority`) VALUES
-- (1, 'default', 15.99, 1, NULL, NULL, NULL, 0),
-- (1, 'bar', 14.99, 1, NULL, NULL, NULL, 0),
-- (1, 'happy_hour', 12.99, 1, '16:00:00', '18:00:00', 'Mon,Tue,Wed,Thu,Fri', 10);


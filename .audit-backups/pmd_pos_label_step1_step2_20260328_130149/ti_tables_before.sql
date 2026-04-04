*************************** 1. row ***************************
ti_tables
CREATE TABLE `ti_tables` (
  `table_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `table_no` bigint(20) DEFAULT NULL,
  `table_name` varchar(128) NOT NULL,
  `min_capacity` int(11) NOT NULL,
  `max_capacity` int(11) NOT NULL,
  `table_status` tinyint(1) NOT NULL,
  `extra_capacity` int(11) NOT NULL DEFAULT 0,
  `is_joinable` tinyint(1) NOT NULL DEFAULT 1,
  `priority` int(11) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `qr_code` varchar(30) DEFAULT NULL,
  PRIMARY KEY (`table_id`),
  UNIQUE KEY `idx_tables_table_no` (`table_no`)
) ENGINE=InnoDB AUTO_INCREMENT=96 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci

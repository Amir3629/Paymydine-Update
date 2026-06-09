-- PayMyDine schema-only dump
-- Generated UTC: Tue Jun  9 23:50:19 UTC 2026
-- Source server: vps-252f1bc4
-- Data rows are NOT included


-- ============================================================
-- DATABASE: paymydine
-- ============================================================

/*M!999999\- enable the sandbox mode */ 
-- MariaDB dump 10.19  Distrib 10.11.13-MariaDB, for debian-linux-gnu (x86_64)
--
-- Host: 127.0.0.1    Database: paymydine
-- ------------------------------------------------------
-- Server version	10.11.13-MariaDB-0ubuntu0.24.04.1

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Current Database: `paymydine`
--

CREATE DATABASE /*!32312 IF NOT EXISTS*/ `paymydine` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci */;

USE `paymydine`;

--
-- Table structure for table `qr_code`
--

DROP TABLE IF EXISTS `qr_code`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `qr_code` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `qr_code` varchar(30) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `r2o_product_map`
--

DROP TABLE IF EXISTS `r2o_product_map`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `r2o_product_map` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint(20) DEFAULT NULL,
  `menu_id` bigint(20) DEFAULT NULL,
  `r2o_product_id` bigint(20) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `r2o_table_map`
--

DROP TABLE IF EXISTS `r2o_table_map`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `r2o_table_map` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint(20) DEFAULT NULL,
  `local_table_id` bigint(20) DEFAULT NULL,
  `r2o_table_id` bigint(20) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tables`
--

DROP TABLE IF EXISTS `tables`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tables` (
  `table_id` int(11) NOT NULL AUTO_INCREMENT,
  `table_name` varchar(255) DEFAULT NULL,
  `location_id` int(11) DEFAULT 1,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `is_default` tinyint(1) DEFAULT 0,
  PRIMARY KEY (`table_id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_activities`
--

DROP TABLE IF EXISTS `ti_activities`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_activities` (
  `activity_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int(11) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `log_name` varchar(128) DEFAULT NULL,
  `properties` text DEFAULT NULL,
  `subject_id` int(11) DEFAULT NULL,
  `subject_type` varchar(128) DEFAULT NULL,
  `causer_id` int(11) DEFAULT NULL,
  `causer_type` varchar(128) DEFAULT NULL,
  `updated_at` datetime NOT NULL,
  `type` varchar(128) DEFAULT NULL,
  `read_at` datetime DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `user_type` varchar(128) DEFAULT NULL,
  PRIMARY KEY (`activity_id`)
) ENGINE=InnoDB AUTO_INCREMENT=195 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_addresses`
--

DROP TABLE IF EXISTS `ti_addresses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_addresses` (
  `address_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `customer_id` int(11) DEFAULT NULL,
  `address_1` varchar(128) NOT NULL,
  `address_2` varchar(128) DEFAULT NULL,
  `city` varchar(128) DEFAULT NULL,
  `state` varchar(128) DEFAULT NULL,
  `postcode` varchar(128) DEFAULT NULL,
  `country_id` int(11) NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`address_id`)
) ENGINE=InnoDB AUTO_INCREMENT=154 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_allergenables`
--

DROP TABLE IF EXISTS `ti_allergenables`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_allergenables` (
  `allergen_id` int(10) unsigned NOT NULL,
  `allergenable_type` varchar(128) NOT NULL,
  `allergenable_id` bigint(20) unsigned NOT NULL,
  UNIQUE KEY `allergenable_unique` (`allergen_id`,`allergenable_id`,`allergenable_type`),
  KEY `allergenable_index` (`allergenable_type`,`allergenable_id`),
  KEY `ti_allergenables_allergen_id_index` (`allergen_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_allergens`
--

DROP TABLE IF EXISTS `ti_allergens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_allergens` (
  `allergen_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(128) NOT NULL,
  `description` varchar(128) NOT NULL,
  `status` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`allergen_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_assignable_logs`
--

DROP TABLE IF EXISTS `ti_assignable_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_assignable_logs` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `assignable_type` varchar(128) NOT NULL,
  `assignable_id` bigint(20) unsigned NOT NULL,
  `assignee_id` int(10) unsigned DEFAULT NULL,
  `assignee_group_id` int(10) unsigned DEFAULT NULL,
  `status_id` int(10) unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `ti_assignable_logs_assignable_type_assignable_id_index` (`assignable_type`,`assignable_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_attendance_audit_logs`
--

DROP TABLE IF EXISTS `ti_attendance_audit_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_attendance_audit_logs` (
  `audit_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `attendance_id` bigint(20) unsigned NOT NULL,
  `action` enum('created','updated','deleted','corrected','auto_checkout') NOT NULL DEFAULT 'created',
  `changed_by` bigint(20) unsigned DEFAULT NULL,
  `old_values` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`old_values`)),
  `new_values` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`new_values`)),
  `reason` text DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`audit_id`),
  KEY `ti_attendance_audit_logs_changed_by_foreign` (`changed_by`),
  KEY `ti_attendance_audit_logs_attendance_id_created_at_index` (`attendance_id`,`created_at`),
  KEY `ti_attendance_audit_logs_action_index` (`action`),
  CONSTRAINT `ti_attendance_audit_logs_attendance_id_foreign` FOREIGN KEY (`attendance_id`) REFERENCES `ti_staff_attendance` (`attendance_id`) ON DELETE CASCADE,
  CONSTRAINT `ti_attendance_audit_logs_changed_by_foreign` FOREIGN KEY (`changed_by`) REFERENCES `ti_staffs` (`staff_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_banners`
--

DROP TABLE IF EXISTS `ti_banners`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_banners` (
  `banner_id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(128) NOT NULL,
  `type` char(8) NOT NULL,
  `click_url` varchar(128) DEFAULT NULL,
  `language_id` int(11) NOT NULL,
  `alt_text` varchar(128) DEFAULT NULL,
  `image_code` text DEFAULT NULL,
  `custom_code` text DEFAULT NULL,
  `status` tinyint(1) NOT NULL,
  PRIMARY KEY (`banner_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_cache`
--

DROP TABLE IF EXISTS `ti_cache`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_cache` (
  `key` varchar(128) NOT NULL,
  `value` mediumtext NOT NULL,
  `expiration` int(11) NOT NULL,
  UNIQUE KEY `ti_cache_key_unique` (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_cash_drawer_logs`
--

DROP TABLE IF EXISTS `ti_cash_drawer_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_cash_drawer_logs` (
  `log_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `drawer_id` bigint(20) unsigned NOT NULL COMMENT 'Reference to cash drawer',
  `order_id` int(11) unsigned DEFAULT NULL COMMENT 'Associated order (if triggered by payment)',
  `location_id` int(10) unsigned DEFAULT NULL COMMENT 'Location where event occurred',
  `action` enum('open','close','test','error','manual') NOT NULL DEFAULT 'open' COMMENT 'Type of action performed',
  `trigger_method` varchar(50) DEFAULT NULL COMMENT 'cash_payment, manual, test, scheduled',
  `success` tinyint(1) NOT NULL DEFAULT 1 COMMENT 'Whether the action was successful',
  `error_message` text DEFAULT NULL COMMENT 'Error details if action failed',
  `response_data` text DEFAULT NULL COMMENT 'JSON response from drawer device',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`log_id`),
  KEY `idx_drawer_id` (`drawer_id`),
  KEY `idx_order_id` (`order_id`),
  KEY `idx_location_id` (`location_id`),
  KEY `idx_action` (`action`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Cash drawer operation logs';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_cash_drawers`
--

DROP TABLE IF EXISTS `ti_cash_drawers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_cash_drawers` (
  `drawer_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(128) NOT NULL COMMENT 'Display name for the cash drawer',
  `location_id` int(10) unsigned DEFAULT NULL COMMENT 'Associated location (multi-tenant)',
  `pos_device_id` bigint(20) unsigned DEFAULT NULL COMMENT 'Linked POS device (optional)',
  `local_pos_device_id` bigint(20) unsigned DEFAULT NULL,
  `local_mapping_invalid` tinyint(1) NOT NULL DEFAULT 0,
  `last_command_status` varchar(20) DEFAULT NULL,
  `last_command_message` text DEFAULT NULL,
  `setup_state` varchar(30) DEFAULT NULL,
  `setup_message` text DEFAULT NULL,
  `setup_completed_at` timestamp NULL DEFAULT NULL,
  `connection_type` enum('rj11_printer','usb','serial','network','integrated') NOT NULL DEFAULT 'rj11_printer' COMMENT 'How the drawer is connected',
  `device_path` varchar(255) DEFAULT NULL COMMENT 'COM port, USB path, IP address, or printer name',
  `printer_id` bigint(20) unsigned DEFAULT NULL COMMENT 'If RJ11, link to printer device',
  `esc_pos_command` varchar(50) NOT NULL DEFAULT '27,112,0,60,120' COMMENT 'ESC/POS command for drawer open',
  `voltage` enum('12V','24V') NOT NULL DEFAULT '12V' COMMENT 'Drawer solenoid voltage',
  `network_ip` varchar(45) DEFAULT NULL COMMENT 'IP address for network drawers',
  `network_port` int(11) DEFAULT 9100 COMMENT 'Port for network drawers',
  `serial_port` varchar(50) DEFAULT NULL COMMENT 'COM port for serial drawers',
  `serial_baud_rate` int(11) DEFAULT 9600 COMMENT 'Baud rate for serial connection',
  `usb_vendor_id` varchar(10) DEFAULT NULL COMMENT 'USB vendor ID',
  `usb_product_id` varchar(10) DEFAULT NULL COMMENT 'USB product ID',
  `connection_config` text DEFAULT NULL COMMENT 'JSON config for advanced settings',
  `status` tinyint(1) NOT NULL DEFAULT 1 COMMENT 'Enable/disable drawer',
  `auto_open_on_cash` tinyint(1) NOT NULL DEFAULT 1 COMMENT 'Auto-open when cash payment is processed',
  `test_on_save` tinyint(1) NOT NULL DEFAULT 1 COMMENT 'Test connection when saving configuration',
  `description` text DEFAULT NULL COMMENT 'Additional notes or description',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`drawer_id`),
  KEY `idx_location_id` (`location_id`),
  KEY `idx_pos_device_id` (`pos_device_id`),
  KEY `idx_connection_type` (`connection_type`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Cash drawer devices configuration';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_cashiers`
--

DROP TABLE IF EXISTS `ti_cashiers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_cashiers` (
  `cashier_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(128) DEFAULT NULL,
  `location_id` bigint(20) unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`cashier_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_categories`
--

DROP TABLE IF EXISTS `ti_categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_categories` (
  `category_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(128) NOT NULL,
  `description` text DEFAULT NULL,
  `parent_id` int(11) DEFAULT NULL,
  `priority` int(11) NOT NULL DEFAULT 0,
  `status` tinyint(1) NOT NULL DEFAULT 1,
  `frontend_visible` tinyint(1) NOT NULL DEFAULT 1,
  `image` varchar(128) DEFAULT NULL,
  `nest_left` int(11) DEFAULT NULL,
  `nest_right` int(11) DEFAULT NULL,
  `permalink_slug` varchar(128) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`category_id`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_countries`
--

DROP TABLE IF EXISTS `ti_countries`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_countries` (
  `country_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `country_name` varchar(128) NOT NULL,
  `iso_code_2` varchar(2) DEFAULT NULL,
  `iso_code_3` varchar(3) DEFAULT NULL,
  `format` text DEFAULT NULL,
  `status` tinyint(1) NOT NULL DEFAULT 0,
  `priority` int(11) NOT NULL DEFAULT 999,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`country_id`)
) ENGINE=InnoDB AUTO_INCREMENT=240 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_currencies`
--

DROP TABLE IF EXISTS `ti_currencies`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_currencies` (
  `currency_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `country_id` int(11) NOT NULL,
  `currency_name` varchar(128) NOT NULL,
  `currency_code` varchar(3) NOT NULL,
  `currency_symbol` varchar(3) NOT NULL,
  `currency_rate` decimal(15,8) NOT NULL,
  `symbol_position` tinyint(1) DEFAULT NULL,
  `thousand_sign` char(1) NOT NULL,
  `decimal_sign` char(1) NOT NULL,
  `decimal_position` char(1) NOT NULL,
  `iso_alpha2` varchar(2) DEFAULT NULL,
  `iso_alpha3` varchar(3) DEFAULT NULL,
  `iso_numeric` int(11) DEFAULT NULL,
  `currency_status` int(11) DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL,
  PRIMARY KEY (`currency_id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_customer_groups`
--

DROP TABLE IF EXISTS `ti_customer_groups`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_customer_groups` (
  `customer_group_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `group_name` varchar(32) NOT NULL,
  `description` text DEFAULT NULL,
  `approval` tinyint(1) NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`customer_group_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_customers`
--

DROP TABLE IF EXISTS `ti_customers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_customers` (
  `customer_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `first_name` varchar(128) NOT NULL,
  `last_name` varchar(128) NOT NULL,
  `email` varchar(96) NOT NULL,
  `password` varchar(128) NOT NULL,
  `telephone` varchar(32) DEFAULT NULL,
  `address_id` int(11) DEFAULT NULL,
  `newsletter` tinyint(1) DEFAULT NULL,
  `customer_group_id` int(11) NOT NULL,
  `ip_address` varchar(40) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `status` tinyint(1) NOT NULL,
  `reset_code` varchar(128) DEFAULT NULL,
  `reset_time` datetime DEFAULT NULL,
  `activation_code` varchar(128) DEFAULT NULL,
  `remember_token` varchar(128) DEFAULT NULL,
  `is_activated` tinyint(1) DEFAULT NULL,
  `date_activated` datetime DEFAULT NULL,
  `last_login` datetime DEFAULT NULL,
  `last_seen` datetime DEFAULT NULL,
  `updated_at` timestamp NOT NULL,
  `last_location_area` text NOT NULL,
  PRIMARY KEY (`customer_id`),
  UNIQUE KEY `ti_customers_email_unique` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_device_health_logs`
--

DROP TABLE IF EXISTS `ti_device_health_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_device_health_logs` (
  `health_log_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `device_id` bigint(20) unsigned NOT NULL,
  `status` enum('online','offline','error','maintenance') NOT NULL DEFAULT 'offline',
  `response_time` int(11) DEFAULT NULL,
  `users_count` int(11) DEFAULT NULL,
  `attendance_count` int(11) DEFAULT NULL,
  `memory_usage` decimal(5,2) DEFAULT NULL,
  `disk_usage` decimal(5,2) DEFAULT NULL,
  `firmware_version` varchar(50) DEFAULT NULL,
  `error_details` text DEFAULT NULL,
  `device_info` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`device_info`)),
  `checked_at` timestamp NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`health_log_id`),
  KEY `ti_device_health_logs_device_id_checked_at_index` (`device_id`,`checked_at`),
  KEY `ti_device_health_logs_status_index` (`status`),
  CONSTRAINT `ti_device_health_logs_device_id_foreign` FOREIGN KEY (`device_id`) REFERENCES `ti_finger_devices` (`device_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_device_notifications`
--

DROP TABLE IF EXISTS `ti_device_notifications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_device_notifications` (
  `notification_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `device_id` bigint(20) unsigned DEFAULT NULL,
  `type` enum('device_online','device_offline','device_error','sync_failed','enrollment_success','enrollment_failed','missing_checkout','device_maintenance','low_storage') NOT NULL DEFAULT 'device_offline',
  `title` varchar(128) NOT NULL,
  `message` text NOT NULL,
  `severity` enum('info','warning','error','critical') NOT NULL DEFAULT 'info',
  `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`metadata`)),
  `is_read` tinyint(1) NOT NULL DEFAULT 0,
  `read_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`notification_id`),
  KEY `ti_device_notifications_device_id_is_read_index` (`device_id`,`is_read`),
  KEY `ti_device_notifications_type_severity_index` (`type`,`severity`),
  KEY `ti_device_notifications_created_at_index` (`created_at`),
  CONSTRAINT `ti_device_notifications_device_id_foreign` FOREIGN KEY (`device_id`) REFERENCES `ti_finger_devices` (`device_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_device_sync_logs`
--

DROP TABLE IF EXISTS `ti_device_sync_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_device_sync_logs` (
  `sync_log_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `device_id` bigint(20) unsigned NOT NULL,
  `sync_type` enum('staff_sync','attendance_sync','health_check') NOT NULL DEFAULT 'attendance_sync',
  `records_synced` int(11) NOT NULL DEFAULT 0,
  `records_failed` int(11) NOT NULL DEFAULT 0,
  `status` enum('success','failed','partial','in_progress') NOT NULL DEFAULT 'in_progress',
  `error_message` text DEFAULT NULL,
  `sync_details` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`sync_details`)),
  `started_at` timestamp NULL DEFAULT NULL,
  `completed_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`sync_log_id`),
  KEY `ti_device_sync_logs_device_id_created_at_index` (`device_id`,`created_at`),
  KEY `ti_device_sync_logs_status_index` (`status`),
  CONSTRAINT `ti_device_sync_logs_device_id_foreign` FOREIGN KEY (`device_id`) REFERENCES `ti_finger_devices` (`device_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_extension_settings`
--

DROP TABLE IF EXISTS `ti_extension_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_extension_settings` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `item` varchar(128) NOT NULL,
  `data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`data`)),
  PRIMARY KEY (`id`),
  UNIQUE KEY `ti_extension_settings_item_unique` (`item`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_extensions`
--

DROP TABLE IF EXISTS `ti_extensions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_extensions` (
  `extension_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(128) NOT NULL,
  `version` varchar(32) DEFAULT '1.0.0',
  PRIMARY KEY (`extension_id`),
  UNIQUE KEY `ti_extensions_name_unique` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_failed_jobs`
--

DROP TABLE IF EXISTS `ti_failed_jobs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_failed_jobs` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `uuid` varchar(128) DEFAULT NULL,
  `connection` text NOT NULL,
  `queue` text NOT NULL,
  `payload` longtext NOT NULL,
  `exception` longtext NOT NULL,
  `failed_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `ti_failed_jobs_uuid_unique` (`uuid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_finger_devices`
--

DROP TABLE IF EXISTS `ti_finger_devices`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_finger_devices` (
  `device_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `device_type` enum('fingerprint','rfid','face','hybrid','zkteco') NOT NULL DEFAULT 'zkteco',
  `connection_type` enum('usb','ethernet','wifi','serial') NOT NULL DEFAULT 'ethernet',
  `usb_vendor_id` varchar(20) DEFAULT NULL,
  `usb_product_id` varchar(20) DEFAULT NULL,
  `ip` varchar(45) NOT NULL,
  `mac_address` varchar(17) DEFAULT NULL COMMENT 'MAC address for network device identification',
  `port` int(11) NOT NULL DEFAULT 4370,
  `serial_number` varchar(255) DEFAULT NULL,
  `firmware_version` varchar(50) DEFAULT NULL,
  `model` varchar(100) DEFAULT NULL,
  `manufacturer` varchar(100) NOT NULL DEFAULT 'ZKTeco',
  `max_users` int(11) NOT NULL DEFAULT 3000,
  `max_fingerprints` int(11) NOT NULL DEFAULT 9000,
  `max_attendance_records` int(11) NOT NULL DEFAULT 100000,
  `description` text DEFAULT NULL,
  `status` tinyint(1) NOT NULL DEFAULT 1,
  `connection_status` enum('online','offline','error','unknown') NOT NULL DEFAULT 'unknown',
  `last_connected_at` timestamp NULL DEFAULT NULL,
  `last_sync_at` timestamp NULL DEFAULT NULL,
  `failed_connection_attempts` int(11) NOT NULL DEFAULT 0,
  `supports_fingerprint` tinyint(1) NOT NULL DEFAULT 1,
  `supports_rfid` tinyint(1) NOT NULL DEFAULT 0,
  `supports_face` tinyint(1) NOT NULL DEFAULT 0,
  `supports_pin` tinyint(1) NOT NULL DEFAULT 0,
  `auto_sync_enabled` tinyint(1) NOT NULL DEFAULT 1,
  `sync_interval` int(11) NOT NULL DEFAULT 15 COMMENT 'minutes',
  `auto_enroll_enabled` tinyint(1) NOT NULL DEFAULT 0,
  `location_id` int(11) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`device_id`),
  UNIQUE KEY `ti_finger_devices_serial_number_unique` (`serial_number`),
  KEY `ti_finger_devices_ip_index` (`ip`),
  KEY `ti_finger_devices_status_index` (`status`),
  KEY `ti_finger_devices_location_id_index` (`location_id`),
  KEY `ti_finger_devices_connection_status_index` (`connection_status`),
  KEY `ti_finger_devices_device_type_index` (`device_type`),
  KEY `ti_finger_devices_connection_type_index` (`connection_type`),
  KEY `ti_finger_devices_auto_sync_enabled_status_index` (`auto_sync_enabled`,`status`),
  KEY `ti_finger_devices_mac_address_index` (`mac_address`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_fiskaly_configs`
--

DROP TABLE IF EXISTS `ti_fiskaly_configs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_fiskaly_configs` (
  `fiskaly_config_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `location_id` int(10) unsigned NOT NULL DEFAULT 1,
  `provider` varchar(50) NOT NULL DEFAULT 'fiskaly',
  `environment` varchar(20) NOT NULL DEFAULT 'test',
  `api_key` varchar(255) DEFAULT NULL,
  `api_secret` varchar(255) DEFAULT NULL,
  `organization_id` varchar(100) DEFAULT NULL,
  `managed_organization_id` varchar(100) DEFAULT NULL,
  `tss_id` varchar(100) DEFAULT NULL,
  `client_id` varchar(100) DEFAULT NULL,
  `cash_register_id` varchar(100) DEFAULT NULL,
  `taxpayer_id` varchar(100) DEFAULT NULL,
  `establishment_id` varchar(100) DEFAULT NULL,
  `submission_id` varchar(100) DEFAULT NULL,
  `is_enabled` tinyint(1) NOT NULL DEFAULT 0,
  `last_error` text DEFAULT NULL,
  `meta` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`meta`)),
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`fiskaly_config_id`),
  UNIQUE KEY `uq_fiskaly_configs_location` (`location_id`),
  KEY `ti_fiskaly_configs_location_id_index` (`location_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_fiskaly_transactions`
--

DROP TABLE IF EXISTS `ti_fiskaly_transactions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_fiskaly_transactions` (
  `fiskaly_transaction_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `order_id` int(10) unsigned NOT NULL,
  `location_id` int(10) unsigned NOT NULL DEFAULT 1,
  `payment_method` varchar(50) DEFAULT NULL,
  `payment_reference` varchar(191) DEFAULT NULL,
  `tss_id` varchar(100) DEFAULT NULL,
  `client_id` varchar(100) DEFAULT NULL,
  `tx_id` varchar(100) DEFAULT NULL,
  `tx_revision` varchar(100) DEFAULT NULL,
  `tx_state` varchar(50) DEFAULT NULL,
  `tx_number` varchar(100) DEFAULT NULL,
  `signature_counter` varchar(100) DEFAULT NULL,
  `signature_algorithm` varchar(100) DEFAULT NULL,
  `signature_value` text DEFAULT NULL,
  `serial_number` varchar(191) DEFAULT NULL,
  `qr_code_data` text DEFAULT NULL,
  `amount_total` decimal(15,4) DEFAULT NULL,
  `currency` varchar(10) DEFAULT NULL,
  `started_at` timestamp NULL DEFAULT NULL,
  `finished_at` timestamp NULL DEFAULT NULL,
  `status` varchar(50) NOT NULL DEFAULT 'pending',
  `error_message` text DEFAULT NULL,
  `request_payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`request_payload`)),
  `response_payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`response_payload`)),
  `meta` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`meta`)),
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`fiskaly_transaction_id`),
  UNIQUE KEY `uq_fiskaly_transactions_order` (`order_id`),
  KEY `ti_fiskaly_transactions_order_id_index` (`order_id`),
  KEY `ti_fiskaly_transactions_location_id_index` (`location_id`),
  KEY `ti_fiskaly_transactions_payment_reference_index` (`payment_reference`),
  KEY `ti_fiskaly_transactions_tss_id_index` (`tss_id`),
  KEY `ti_fiskaly_transactions_client_id_index` (`client_id`),
  KEY `ti_fiskaly_transactions_tx_id_index` (`tx_id`),
  KEY `ti_fiskaly_transactions_status_index` (`status`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_general_staff_notes`
--

DROP TABLE IF EXISTS `ti_general_staff_notes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_general_staff_notes` (
  `note_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `staff_id` bigint(20) unsigned DEFAULT NULL,
  `note` text NOT NULL,
  `status` enum('active','archived') NOT NULL DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`note_id`),
  KEY `ti_general_staff_notes_staff_id_index` (`staff_id`),
  KEY `ti_general_staff_notes_status_index` (`status`),
  KEY `ti_general_staff_notes_created_at_index` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_gift_card_designs`
--

DROP TABLE IF EXISTS `ti_gift_card_designs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_gift_card_designs` (
  `design_id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(128) NOT NULL,
  `description` text DEFAULT NULL,
  `image_path` varchar(255) DEFAULT NULL,
  `template_html` text DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `is_default` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`design_id`),
  KEY `idx_is_active` (`is_active`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_gift_card_transactions`
--

DROP TABLE IF EXISTS `ti_gift_card_transactions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_gift_card_transactions` (
  `transaction_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `coupon_id` bigint(20) unsigned NOT NULL,
  `customer_id` bigint(20) unsigned DEFAULT NULL,
  `order_id` bigint(20) unsigned DEFAULT NULL,
  `transaction_type` enum('purchase','reload','redemption','refund','adjustment') NOT NULL COMMENT 'Type of transaction',
  `amount` decimal(15,4) NOT NULL COMMENT 'Transaction amount',
  `balance_before` decimal(15,4) NOT NULL COMMENT 'Balance before transaction',
  `balance_after` decimal(15,4) NOT NULL COMMENT 'Balance after transaction',
  `payment_method` varchar(50) DEFAULT NULL COMMENT 'Payment method used',
  `payment_reference` varchar(255) DEFAULT NULL COMMENT 'Payment reference/transaction ID',
  `notes` text DEFAULT NULL COMMENT 'Additional notes',
  `staff_id` bigint(20) unsigned DEFAULT NULL COMMENT 'Staff who processed transaction',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`transaction_id`),
  KEY `idx_coupon_id` (`coupon_id`),
  KEY `idx_customer_id` (`customer_id`),
  KEY `idx_order_id` (`order_id`),
  KEY `idx_transaction_type` (`transaction_type`),
  KEY `idx_created_at` (`created_at`),
  CONSTRAINT `fk_gift_card_txn_coupon` FOREIGN KEY (`coupon_id`) REFERENCES `ti_igniter_coupons` (`coupon_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_igniter_automation_logs`
--

DROP TABLE IF EXISTS `ti_igniter_automation_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_igniter_automation_logs` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `automation_rule_id` bigint(20) unsigned DEFAULT NULL,
  `rule_action_id` bigint(20) unsigned DEFAULT NULL,
  `is_success` tinyint(1) NOT NULL,
  `message` text NOT NULL,
  `params` text DEFAULT NULL,
  `exception` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `ti_igniter_automation_logs_automation_rule_id_foreign` (`automation_rule_id`),
  KEY `ti_igniter_automation_logs_rule_action_id_foreign` (`rule_action_id`),
  CONSTRAINT `ti_igniter_automation_logs_automation_rule_id_foreign` FOREIGN KEY (`automation_rule_id`) REFERENCES `ti_igniter_automation_rules` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ti_igniter_automation_logs_rule_action_id_foreign` FOREIGN KEY (`rule_action_id`) REFERENCES `ti_igniter_automation_rule_actions` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_igniter_automation_rule_actions`
--

DROP TABLE IF EXISTS `ti_igniter_automation_rule_actions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_igniter_automation_rule_actions` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `automation_rule_id` bigint(20) unsigned DEFAULT NULL,
  `class_name` varchar(128) NOT NULL,
  `options` text NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `ti_igniter_actions_automation_rule_id_foreign` (`automation_rule_id`),
  CONSTRAINT `ti_igniter_actions_automation_rule_id_foreign` FOREIGN KEY (`automation_rule_id`) REFERENCES `ti_igniter_automation_rules` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_igniter_automation_rule_conditions`
--

DROP TABLE IF EXISTS `ti_igniter_automation_rule_conditions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_igniter_automation_rule_conditions` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `automation_rule_id` bigint(20) unsigned DEFAULT NULL,
  `class_name` varchar(128) NOT NULL,
  `options` text NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `ti_igniter_conditions_automation_rule_id_foreign` (`automation_rule_id`),
  CONSTRAINT `ti_igniter_conditions_automation_rule_id_foreign` FOREIGN KEY (`automation_rule_id`) REFERENCES `ti_igniter_automation_rules` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_igniter_automation_rules`
--

DROP TABLE IF EXISTS `ti_igniter_automation_rules`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_igniter_automation_rules` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(128) NOT NULL,
  `code` varchar(128) NOT NULL,
  `description` varchar(128) NOT NULL,
  `event_class` text DEFAULT NULL,
  `config_data` text DEFAULT NULL,
  `is_custom` tinyint(1) NOT NULL DEFAULT 0,
  `status` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_igniter_cart_cart`
--

DROP TABLE IF EXISTS `ti_igniter_cart_cart`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_igniter_cart_cart` (
  `identifier` varchar(128) NOT NULL,
  `instance` varchar(128) NOT NULL,
  `data` longtext NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`identifier`,`instance`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_igniter_coupon_categories`
--

DROP TABLE IF EXISTS `ti_igniter_coupon_categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_igniter_coupon_categories` (
  `coupon_id` int(10) unsigned NOT NULL,
  `category_id` int(10) unsigned NOT NULL,
  UNIQUE KEY `ti_igniter_coupon_categories_coupon_id_category_id_unique` (`coupon_id`,`category_id`),
  KEY `ti_igniter_coupon_categories_coupon_id_index` (`coupon_id`),
  KEY `ti_igniter_coupon_categories_category_id_index` (`category_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_igniter_coupon_customer_groups`
--

DROP TABLE IF EXISTS `ti_igniter_coupon_customer_groups`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_igniter_coupon_customer_groups` (
  `coupon_id` bigint(20) unsigned NOT NULL,
  `customer_group_id` bigint(20) unsigned NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_igniter_coupon_customers`
--

DROP TABLE IF EXISTS `ti_igniter_coupon_customers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_igniter_coupon_customers` (
  `coupon_id` bigint(20) unsigned NOT NULL,
  `customer_id` bigint(20) unsigned NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_igniter_coupon_menus`
--

DROP TABLE IF EXISTS `ti_igniter_coupon_menus`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_igniter_coupon_menus` (
  `coupon_id` int(10) unsigned NOT NULL,
  `menu_id` int(10) unsigned NOT NULL,
  UNIQUE KEY `ti_igniter_coupon_menus_coupon_id_menu_id_unique` (`coupon_id`,`menu_id`),
  KEY `ti_igniter_coupon_menus_coupon_id_index` (`coupon_id`),
  KEY `ti_igniter_coupon_menus_menu_id_index` (`menu_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_igniter_coupons`
--

DROP TABLE IF EXISTS `ti_igniter_coupons`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_igniter_coupons` (
  `coupon_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(128) NOT NULL,
  `code` varchar(128) NOT NULL,
  `card_type` enum('coupon','gift_card','voucher','credit','comp') NOT NULL DEFAULT 'coupon' COMMENT 'Type of card: coupon, gift_card, voucher, credit, or comp',
  `initial_balance` decimal(15,4) DEFAULT NULL COMMENT 'Initial balance for gift cards',
  `current_balance` decimal(15,4) DEFAULT NULL COMMENT 'Current remaining balance',
  `is_reloadable` tinyint(1) NOT NULL DEFAULT 0 COMMENT 'Can balance be reloaded',
  `is_purchasable` tinyint(1) NOT NULL DEFAULT 0 COMMENT 'Can be purchased by customers',
  `purchase_price` decimal(15,4) DEFAULT NULL COMMENT 'Price to purchase gift card',
  `purchased_by` bigint(20) unsigned DEFAULT NULL COMMENT 'Customer who purchased this card',
  `purchase_date` timestamp NULL DEFAULT NULL COMMENT 'When card was purchased',
  `first_use_date` timestamp NULL DEFAULT NULL COMMENT 'First redemption date',
  `last_use_date` timestamp NULL DEFAULT NULL COMMENT 'Last redemption date',
  `is_transferable` tinyint(1) NOT NULL DEFAULT 0 COMMENT 'Can be transferred to another customer',
  `recipient_name` varchar(255) DEFAULT NULL COMMENT 'Gift recipient name',
  `recipient_email` varchar(255) DEFAULT NULL COMMENT 'Gift recipient email',
  `recipient_message` text DEFAULT NULL COMMENT 'Personal message for recipient',
  `is_digital` tinyint(1) NOT NULL DEFAULT 1 COMMENT 'Digital or physical card',
  `expiry_date` timestamp NULL DEFAULT NULL COMMENT 'Card expiry date (if applicable)',
  `max_discount_cap` decimal(15,4) DEFAULT NULL COMMENT 'Maximum discount amount for percentage coupons',
  `design_id` int(10) unsigned DEFAULT NULL COMMENT 'Gift card design template ID',
  `type` char(1) NOT NULL,
  `discount` decimal(15,4) DEFAULT NULL,
  `min_total` decimal(15,4) DEFAULT NULL,
  `redemptions` int(11) NOT NULL DEFAULT 0,
  `customer_redemptions` int(11) NOT NULL DEFAULT 0,
  `description` text DEFAULT NULL,
  `status` tinyint(1) DEFAULT NULL,
  `created_at` date NOT NULL,
  `validity` char(15) DEFAULT NULL,
  `fixed_date` date DEFAULT NULL,
  `fixed_from_time` time DEFAULT NULL,
  `fixed_to_time` time DEFAULT NULL,
  `period_start_date` date DEFAULT NULL,
  `period_end_date` date DEFAULT NULL,
  `recurring_every` varchar(35) DEFAULT NULL,
  `recurring_from_time` time DEFAULT NULL,
  `recurring_to_time` time DEFAULT NULL,
  `order_restriction` text DEFAULT NULL,
  `apply_coupon_on` enum('whole_cart','menu_items','delivery_fee') NOT NULL DEFAULT 'whole_cart',
  `auto_apply` tinyint(1) NOT NULL DEFAULT 0,
  `updated_at` timestamp NOT NULL,
  PRIMARY KEY (`coupon_id`),
  UNIQUE KEY `code` (`code`),
  UNIQUE KEY `ti_igniter_coupons_code_unique` (`code`),
  KEY `idx_card_type_status` (`card_type`,`status`),
  KEY `idx_purchased_by` (`purchased_by`),
  KEY `idx_expiry_date` (`expiry_date`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_igniter_coupons_history`
--

DROP TABLE IF EXISTS `ti_igniter_coupons_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_igniter_coupons_history` (
  `coupon_history_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `coupon_id` bigint(20) unsigned NOT NULL,
  `order_id` bigint(20) unsigned DEFAULT NULL,
  `customer_id` bigint(20) unsigned DEFAULT NULL,
  `code` varchar(15) NOT NULL,
  `min_total` decimal(15,4) DEFAULT NULL,
  `amount` decimal(15,4) DEFAULT NULL,
  `balance_before` decimal(15,4) DEFAULT NULL COMMENT 'Balance before redemption',
  `balance_after` decimal(15,4) DEFAULT NULL COMMENT 'Balance after redemption',
  `amount_redeemed` decimal(15,4) DEFAULT NULL COMMENT 'Amount used in this transaction',
  `redemption_type` enum('full','partial') NOT NULL DEFAULT 'full' COMMENT 'Full or partial redemption',
  `created_at` datetime NOT NULL,
  `status` tinyint(1) NOT NULL,
  `updated_at` timestamp NOT NULL,
  PRIMARY KEY (`coupon_history_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_igniter_frontend_banners`
--

DROP TABLE IF EXISTS `ti_igniter_frontend_banners`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_igniter_frontend_banners` (
  `banner_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(128) NOT NULL,
  `type` char(8) NOT NULL,
  `click_url` varchar(128) DEFAULT NULL,
  `language_id` int(11) NOT NULL,
  `alt_text` varchar(128) DEFAULT NULL,
  `image_code` text DEFAULT NULL,
  `custom_code` text DEFAULT NULL,
  `status` tinyint(1) NOT NULL,
  PRIMARY KEY (`banner_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_igniter_frontend_sliders`
--

DROP TABLE IF EXISTS `ti_igniter_frontend_sliders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_igniter_frontend_sliders` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(128) NOT NULL,
  `code` varchar(128) NOT NULL,
  `metadata` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ti_igniter_frontend_sliders_code_unique` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_igniter_frontend_subscribers`
--

DROP TABLE IF EXISTS `ti_igniter_frontend_subscribers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_igniter_frontend_subscribers` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) DEFAULT NULL,
  `email` varchar(128) NOT NULL,
  `statistics` int(11) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_igniter_pages_menu_items`
--

DROP TABLE IF EXISTS `ti_igniter_pages_menu_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_igniter_pages_menu_items` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `menu_id` int(10) unsigned NOT NULL,
  `parent_id` int(10) unsigned DEFAULT NULL,
  `title` varchar(128) NOT NULL,
  `code` varchar(128) NOT NULL,
  `description` varchar(128) DEFAULT NULL,
  `type` varchar(128) NOT NULL,
  `url` varchar(128) DEFAULT NULL,
  `reference` varchar(128) DEFAULT NULL,
  `config` text DEFAULT NULL,
  `nest_left` int(11) DEFAULT NULL,
  `nest_right` int(11) DEFAULT NULL,
  `priority` int(11) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `ti_igniter_pages_menu_items_menu_id_index` (`menu_id`),
  KEY `ti_igniter_pages_menu_items_parent_id_index` (`parent_id`)
) ENGINE=InnoDB AUTO_INCREMENT=40 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_igniter_pages_menus`
--

DROP TABLE IF EXISTS `ti_igniter_pages_menus`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_igniter_pages_menus` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `theme_code` varchar(128) NOT NULL,
  `name` varchar(128) NOT NULL,
  `code` varchar(128) NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `ti_igniter_pages_menus_theme_code_index` (`theme_code`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_igniter_reviews`
--

DROP TABLE IF EXISTS `ti_igniter_reviews`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_igniter_reviews` (
  `review_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `customer_id` bigint(20) unsigned DEFAULT NULL,
  `sale_id` bigint(20) unsigned DEFAULT NULL,
  `sale_type` varchar(32) NOT NULL DEFAULT '',
  `author` varchar(128) DEFAULT NULL,
  `location_id` bigint(20) unsigned DEFAULT NULL,
  `quality` int(11) NOT NULL,
  `delivery` int(11) NOT NULL,
  `service` int(11) NOT NULL,
  `review_text` text DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `review_status` tinyint(1) NOT NULL,
  `updated_at` timestamp NOT NULL,
  PRIMARY KEY (`review_id`),
  KEY `ti_igniter_reviews_review_id_sale_type_sale_id_index` (`review_id`,`sale_type`,`sale_id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_igniter_socialite_providers`
--

DROP TABLE IF EXISTS `ti_igniter_socialite_providers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_igniter_socialite_providers` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int(10) unsigned DEFAULT NULL,
  `provider` varchar(255) DEFAULT NULL,
  `provider_id` varchar(255) DEFAULT NULL,
  `token` varchar(255) DEFAULT NULL,
  `user_type` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `provider_token_index` (`provider`,`token`),
  KEY `ti_igniter_socialite_providers_user_id_index` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_job_batches`
--

DROP TABLE IF EXISTS `ti_job_batches`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_job_batches` (
  `id` varchar(128) NOT NULL,
  `name` varchar(128) NOT NULL,
  `total_jobs` int(11) NOT NULL,
  `pending_jobs` int(11) NOT NULL,
  `failed_jobs` int(11) NOT NULL,
  `failed_job_ids` text NOT NULL,
  `options` mediumtext DEFAULT NULL,
  `cancelled_at` int(11) DEFAULT NULL,
  `created_at` int(11) NOT NULL,
  `finished_at` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_jobs`
--

DROP TABLE IF EXISTS `ti_jobs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_jobs` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `queue` varchar(128) NOT NULL,
  `payload` longtext NOT NULL,
  `attempts` tinyint(3) unsigned NOT NULL,
  `reserved_at` int(10) unsigned DEFAULT NULL,
  `available_at` int(10) unsigned NOT NULL,
  `created_at` int(10) unsigned NOT NULL,
  PRIMARY KEY (`id`),
  KEY `ti_jobs_queue_index` (`queue`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_kds_stations`
--

DROP TABLE IF EXISTS `ti_kds_stations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_kds_stations` (
  `station_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `location_id` bigint(20) unsigned DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`station_id`),
  KEY `ti_kds_stations_location_id_index` (`location_id`),
  KEY `ti_kds_stations_is_active_index` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_language_translations`
--

DROP TABLE IF EXISTS `ti_language_translations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_language_translations` (
  `translation_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `locale` varchar(10) NOT NULL,
  `namespace` varchar(128) NOT NULL DEFAULT '*',
  `group` varchar(128) NOT NULL,
  `item` varchar(128) NOT NULL,
  `text` text NOT NULL,
  `unstable` tinyint(1) NOT NULL DEFAULT 0,
  `locked` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`translation_id`),
  UNIQUE KEY `ti_language_translations_locale_namespace_group_item_unique` (`locale`,`namespace`,`group`,`item`),
  KEY `ti_language_translations_group_index` (`group`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_languages`
--

DROP TABLE IF EXISTS `ti_languages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_languages` (
  `language_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `code` varchar(32) NOT NULL,
  `name` varchar(128) NOT NULL,
  `image` varchar(128) DEFAULT NULL,
  `idiom` varchar(128) NOT NULL,
  `status` tinyint(1) NOT NULL,
  `can_delete` tinyint(1) NOT NULL,
  `original_id` int(11) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `version` varchar(128) DEFAULT NULL,
  PRIMARY KEY (`language_id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_location_areas`
--

DROP TABLE IF EXISTS `ti_location_areas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_location_areas` (
  `area_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `location_id` int(11) NOT NULL,
  `name` varchar(128) NOT NULL,
  `type` varchar(32) NOT NULL,
  `boundaries` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`boundaries`)),
  `conditions` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`conditions`)),
  `color` varchar(40) DEFAULT NULL,
  `is_default` tinyint(1) NOT NULL DEFAULT 0,
  `priority` int(11) NOT NULL DEFAULT 0,
  PRIMARY KEY (`area_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_location_options`
--

DROP TABLE IF EXISTS `ti_location_options`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_location_options` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `location_id` bigint(20) unsigned NOT NULL,
  `item` varchar(128) NOT NULL,
  `value` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`value`)),
  PRIMARY KEY (`id`),
  UNIQUE KEY `ti_location_options_location_id_item_unique` (`location_id`,`item`)
) ENGINE=InnoDB AUTO_INCREMENT=117 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_locationables`
--

DROP TABLE IF EXISTS `ti_locationables`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_locationables` (
  `location_id` int(11) NOT NULL,
  `locationable_id` int(11) NOT NULL,
  `locationable_type` varchar(128) NOT NULL,
  `options` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_locations`
--

DROP TABLE IF EXISTS `ti_locations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_locations` (
  `location_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `location_name` varchar(128) NOT NULL,
  `location_email` varchar(96) NOT NULL,
  `description` text DEFAULT NULL,
  `location_address_1` varchar(128) DEFAULT NULL,
  `location_address_2` varchar(128) DEFAULT NULL,
  `location_city` varchar(128) DEFAULT NULL,
  `location_state` varchar(128) DEFAULT NULL,
  `location_postcode` varchar(10) DEFAULT NULL,
  `location_country_id` int(11) DEFAULT NULL,
  `location_telephone` text DEFAULT NULL,
  `location_lat` double DEFAULT NULL,
  `location_lng` double DEFAULT NULL,
  `location_radius` int(11) DEFAULT NULL,
  `location_status` tinyint(1) DEFAULT NULL,
  `permalink_slug` varchar(128) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`location_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_logos`
--

DROP TABLE IF EXISTS `ti_logos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_logos` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `dashboard_logo` text DEFAULT NULL,
  `loader_logo` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_mail_layouts`
--

DROP TABLE IF EXISTS `ti_mail_layouts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_mail_layouts` (
  `layout_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(128) NOT NULL,
  `language_id` int(11) NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `status` tinyint(1) NOT NULL,
  `code` varchar(128) NOT NULL,
  `layout` text DEFAULT NULL,
  `plain_layout` text DEFAULT NULL,
  `layout_css` text DEFAULT NULL,
  `is_locked` tinyint(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (`layout_id`),
  UNIQUE KEY `ti_mail_layouts_code_unique` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_mail_partials`
--

DROP TABLE IF EXISTS `ti_mail_partials`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_mail_partials` (
  `partial_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(128) DEFAULT NULL,
  `code` varchar(128) DEFAULT NULL,
  `html` text DEFAULT NULL,
  `text` text DEFAULT NULL,
  `is_custom` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`partial_id`),
  UNIQUE KEY `ti_mail_partials_code_unique` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_mail_templates`
--

DROP TABLE IF EXISTS `ti_mail_templates`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_mail_templates` (
  `template_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `layout_id` int(11) NOT NULL,
  `code` varchar(128) NOT NULL,
  `subject` varchar(128) NOT NULL,
  `body` text NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `label` varchar(128) DEFAULT NULL,
  `is_custom` tinyint(1) DEFAULT NULL,
  `plain_body` text DEFAULT NULL,
  PRIMARY KEY (`template_id`),
  UNIQUE KEY `ti_mail_templates_data_template_id_code_unique` (`layout_id`,`code`)
) ENGINE=InnoDB AUTO_INCREMENT=19 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_mealtimes`
--

DROP TABLE IF EXISTS `ti_mealtimes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_mealtimes` (
  `mealtime_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `mealtime_name` varchar(128) NOT NULL,
  `start_time` time NOT NULL DEFAULT '00:00:00',
  `end_time` time NOT NULL DEFAULT '23:59:59',
  `mealtime_status` tinyint(1) NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`mealtime_id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_media_attachments`
--

DROP TABLE IF EXISTS `ti_media_attachments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_media_attachments` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `disk` varchar(128) NOT NULL,
  `name` varchar(128) NOT NULL,
  `file_name` varchar(128) NOT NULL,
  `mime_type` varchar(128) NOT NULL,
  `size` int(10) unsigned NOT NULL,
  `tag` varchar(128) DEFAULT NULL,
  `attachment_type` varchar(128) DEFAULT NULL,
  `attachment_id` bigint(20) unsigned DEFAULT NULL,
  `is_public` tinyint(1) NOT NULL DEFAULT 1,
  `custom_properties` text DEFAULT NULL,
  `priority` int(10) unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `ti_media_attachments_attachment_type_attachment_id_index` (`attachment_type`,`attachment_id`),
  KEY `ti_media_attachments_tag_index` (`tag`)
) ENGINE=InnoDB AUTO_INCREMENT=19 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_menu_categories`
--

DROP TABLE IF EXISTS `ti_menu_categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_menu_categories` (
  `menu_id` int(10) unsigned NOT NULL,
  `category_id` int(10) unsigned NOT NULL,
  UNIQUE KEY `ti_menu_categories_menu_id_category_id_unique` (`menu_id`,`category_id`),
  KEY `ti_menu_categories_menu_id_index` (`menu_id`),
  KEY `ti_menu_categories_category_id_index` (`category_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_menu_combo_items`
--

DROP TABLE IF EXISTS `ti_menu_combo_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_menu_combo_items` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `combo_id` bigint(20) unsigned NOT NULL,
  `menu_id` bigint(20) unsigned NOT NULL,
  `quantity` int(11) NOT NULL DEFAULT 1,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `ti_menu_combo_items_menu_id_foreign` (`menu_id`),
  KEY `ti_menu_combo_items_combo_id_menu_id_index` (`combo_id`,`menu_id`),
  CONSTRAINT `ti_menu_combo_items_combo_id_foreign` FOREIGN KEY (`combo_id`) REFERENCES `ti_menu_combos` (`combo_id`) ON DELETE CASCADE,
  CONSTRAINT `ti_menu_combo_items_menu_id_foreign` FOREIGN KEY (`menu_id`) REFERENCES `ti_menus` (`menu_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_menu_combos`
--

DROP TABLE IF EXISTS `ti_menu_combos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_menu_combos` (
  `combo_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `combo_name` varchar(128) NOT NULL,
  `combo_description` text DEFAULT NULL,
  `combo_price` decimal(15,4) NOT NULL,
  `location_id` int(10) unsigned DEFAULT NULL,
  `combo_status` tinyint(1) NOT NULL DEFAULT 1,
  `is_stock_out` tinyint(1) NOT NULL DEFAULT 0,
  `combo_priority` int(11) NOT NULL DEFAULT 0,
  `thumb` varchar(128) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`combo_id`),
  KEY `ti_menu_combos_combo_status_combo_priority_index` (`combo_status`,`combo_priority`),
  KEY `ti_menu_combos_is_stock_out_index` (`is_stock_out`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_menu_images`
--

DROP TABLE IF EXISTS `ti_menu_images`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_menu_images` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `menu_id` int(10) unsigned NOT NULL,
  `image_path` varchar(255) NOT NULL,
  `sort_order` int(10) unsigned NOT NULL DEFAULT 1,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `ti_menu_images_menu_id_sort_order_index` (`menu_id`,`sort_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_menu_item_option_values`
--

DROP TABLE IF EXISTS `ti_menu_item_option_values`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_menu_item_option_values` (
  `menu_option_value_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `menu_option_id` int(11) NOT NULL,
  `option_value_id` int(11) NOT NULL,
  `new_price` decimal(15,4) DEFAULT NULL,
  `priority` int(11) NOT NULL DEFAULT 0,
  `is_default` tinyint(1) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`menu_option_value_id`)
) ENGINE=InnoDB AUTO_INCREMENT=22 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_menu_item_options`
--

DROP TABLE IF EXISTS `ti_menu_item_options`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_menu_item_options` (
  `menu_option_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `option_id` int(11) NOT NULL,
  `menu_id` int(11) NOT NULL,
  `required` tinyint(1) NOT NULL DEFAULT 0,
  `priority` int(11) NOT NULL DEFAULT 0,
  `min_selected` int(11) NOT NULL DEFAULT 0,
  `max_selected` int(11) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`menu_option_id`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_menu_mealtimes`
--

DROP TABLE IF EXISTS `ti_menu_mealtimes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_menu_mealtimes` (
  `menu_id` int(10) unsigned NOT NULL,
  `mealtime_id` int(10) unsigned NOT NULL,
  UNIQUE KEY `ti_menu_mealtimes_menu_id_mealtime_id_unique` (`menu_id`,`mealtime_id`),
  KEY `ti_menu_mealtimes_menu_id_index` (`menu_id`),
  KEY `ti_menu_mealtimes_mealtime_id_index` (`mealtime_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_menu_option_values`
--

DROP TABLE IF EXISTS `ti_menu_option_values`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_menu_option_values` (
  `option_value_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `option_id` int(11) NOT NULL,
  `value` varchar(128) NOT NULL,
  `price` decimal(15,4) DEFAULT NULL,
  `priority` int(11) NOT NULL DEFAULT 0,
  PRIMARY KEY (`option_value_id`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_menu_options`
--

DROP TABLE IF EXISTS `ti_menu_options`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_menu_options` (
  `option_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `option_name` varchar(128) NOT NULL,
  `display_type` varchar(128) NOT NULL,
  `priority` int(11) NOT NULL DEFAULT 0,
  `update_related_menu_item` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`option_id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_menu_prices`
--

DROP TABLE IF EXISTS `ti_menu_prices`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_menu_prices` (
  `price_id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `menu_id` int(10) unsigned NOT NULL,
  `price_type` varchar(50) NOT NULL,
  `price` decimal(10,2) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `time_from` time DEFAULT NULL,
  `time_to` time DEFAULT NULL,
  `days_of_week` varchar(20) DEFAULT NULL,
  `priority` int(11) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`price_id`),
  KEY `ti_menu_prices_menu_id_index` (`menu_id`),
  KEY `ti_menu_prices_price_type_is_active_index` (`price_type`,`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_menus`
--

DROP TABLE IF EXISTS `ti_menus`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_menus` (
  `menu_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `menu_name` varchar(128) NOT NULL,
  `menu_description` text NOT NULL,
  `menu_price` decimal(15,4) NOT NULL,
  `minimum_qty` int(11) NOT NULL DEFAULT 0,
  `menu_status` tinyint(1) NOT NULL,
  `is_chef_recommended` tinyint(1) NOT NULL DEFAULT 0,
  `is_manual_bestseller` tinyint(1) NOT NULL DEFAULT 0,
  `bestseller_override_mode` varchar(20) NOT NULL DEFAULT 'auto',
  `is_stock_out` tinyint(1) NOT NULL DEFAULT 0,
  `menu_priority` int(11) NOT NULL DEFAULT 0,
  `prep_time_minutes` smallint(5) unsigned NOT NULL DEFAULT 15,
  `order_restriction` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `is_halal` tinyint(1) NOT NULL DEFAULT 0,
  `is_vegetarian` tinyint(1) NOT NULL DEFAULT 0,
  `is_vegan` tinyint(1) NOT NULL DEFAULT 0,
  `calories` int(10) unsigned DEFAULT NULL,
  `protein` decimal(8,2) DEFAULT NULL,
  `carbs` decimal(8,2) DEFAULT NULL,
  `fat` decimal(8,2) DEFAULT NULL,
  `sugar` decimal(8,2) DEFAULT NULL,
  `serving_size` varchar(64) DEFAULT NULL,
  `color` varchar(40) DEFAULT NULL,
  PRIMARY KEY (`menu_id`),
  KEY `ti_menus_is_stock_out_index` (`is_stock_out`)
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_menus_specials`
--

DROP TABLE IF EXISTS `ti_menus_specials`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_menus_specials` (
  `special_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `menu_id` int(11) NOT NULL DEFAULT 0,
  `start_date` datetime DEFAULT current_timestamp(),
  `end_date` datetime DEFAULT current_timestamp(),
  `special_price` decimal(15,4) DEFAULT NULL,
  `special_status` tinyint(1) NOT NULL,
  `type` varchar(128) NOT NULL,
  `validity` varchar(128) NOT NULL,
  `recurring_every` text DEFAULT NULL,
  `recurring_from` time DEFAULT NULL,
  `recurring_to` time DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`special_id`),
  UNIQUE KEY `ti_menus_specials_special_id_menu_id_unique` (`special_id`,`menu_id`)
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_migrations`
--

DROP TABLE IF EXISTS `ti_migrations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_migrations` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `group` varchar(128) NOT NULL,
  `migration` varchar(128) NOT NULL,
  `batch` int(11) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=191 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_notification_recipients`
--

DROP TABLE IF EXISTS `ti_notification_recipients`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_notification_recipients` (
  `recipient_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `notification_id` int(11) NOT NULL,
  `staff_id` bigint(20) unsigned NOT NULL,
  `role` varchar(50) NOT NULL,
  `status` enum('unread','read','dismissed') NOT NULL DEFAULT 'unread',
  `read_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`recipient_id`),
  UNIQUE KEY `ti_notification_recipients_notification_id_staff_id_unique` (`notification_id`,`staff_id`),
  KEY `ti_notification_recipients_staff_id_status_index` (`staff_id`,`status`),
  KEY `ti_notification_recipients_notification_id_index` (`notification_id`),
  CONSTRAINT `ti_notification_recipients_notification_id_foreign` FOREIGN KEY (`notification_id`) REFERENCES `ti_notifications` (`id`) ON DELETE CASCADE,
  CONSTRAINT `ti_notification_recipients_staff_id_foreign` FOREIGN KEY (`staff_id`) REFERENCES `ti_staffs` (`staff_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_notifications`
--

DROP TABLE IF EXISTS `ti_notifications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_notifications` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `type` varchar(50) NOT NULL,
  `title` varchar(255) NOT NULL,
  `table_id` varchar(50) DEFAULT NULL,
  `table_name` varchar(100) DEFAULT NULL,
  `payload` text DEFAULT NULL,
  `status` enum('new','seen','in_progress','resolved') DEFAULT 'new',
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_status_created` (`status`,`created_at` DESC),
  KEY `idx_type` (`type`),
  KEY `idx_table_id` (`table_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_order_menu_options`
--

DROP TABLE IF EXISTS `ti_order_menu_options`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_order_menu_options` (
  `order_option_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `order_id` int(11) NOT NULL,
  `menu_id` int(11) NOT NULL,
  `order_option_name` varchar(128) NOT NULL,
  `order_option_price` decimal(15,4) DEFAULT NULL,
  `order_menu_id` int(11) NOT NULL,
  `order_menu_option_id` int(11) NOT NULL,
  `menu_option_value_id` int(11) NOT NULL,
  `quantity` int(11) DEFAULT 1,
  PRIMARY KEY (`order_option_id`)
) ENGINE=InnoDB AUTO_INCREMENT=222 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_order_menus`
--

DROP TABLE IF EXISTS `ti_order_menus`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_order_menus` (
  `order_menu_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `order_id` int(11) NOT NULL,
  `menu_id` int(11) NOT NULL,
  `name` varchar(128) NOT NULL,
  `quantity` int(11) NOT NULL,
  `price` decimal(15,4) DEFAULT NULL,
  `subtotal` decimal(15,4) DEFAULT NULL,
  `option_values` text DEFAULT NULL,
  `comment` text DEFAULT NULL,
  PRIMARY KEY (`order_menu_id`)
) ENGINE=InnoDB AUTO_INCREMENT=527 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_order_notes`
--

DROP TABLE IF EXISTS `ti_order_notes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_order_notes` (
  `note_id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `order_id` bigint(20) unsigned NOT NULL,
  `staff_id` bigint(20) unsigned DEFAULT NULL,
  `note` text NOT NULL,
  `status` enum('active','archived') NOT NULL DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`note_id`),
  KEY `ti_order_notes_order_id_status_index` (`order_id`,`status`),
  KEY `ti_order_notes_created_at_index` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_order_payment_transaction_items`
--

DROP TABLE IF EXISTS `ti_order_payment_transaction_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_order_payment_transaction_items` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `transaction_id` bigint(20) unsigned NOT NULL,
  `order_menu_id` bigint(20) unsigned NOT NULL,
  `menu_id` bigint(20) unsigned DEFAULT NULL,
  `quantity_paid` decimal(10,3) NOT NULL,
  `unit_price` decimal(15,4) NOT NULL,
  `line_total` decimal(15,4) NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `opti_txn_menu_idx` (`transaction_id`,`order_menu_id`),
  KEY `opti_menu_idx` (`order_menu_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_order_payment_transactions`
--

DROP TABLE IF EXISTS `ti_order_payment_transactions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_order_payment_transactions` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `order_id` bigint(20) unsigned NOT NULL,
  `payment_method` varchar(50) NOT NULL,
  `payment_reference` varchar(128) DEFAULT NULL,
  `amount` decimal(15,4) NOT NULL,
  `settlement_status` varchar(20) NOT NULL DEFAULT 'partial',
  `payer_label` varchar(191) DEFAULT NULL,
  `invoice_id` bigint(20) unsigned DEFAULT NULL,
  `paid_at` datetime DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `opt_order_created_idx` (`order_id`,`created_at`),
  KEY `opt_order_status_idx` (`order_id`,`settlement_status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_order_totals`
--

DROP TABLE IF EXISTS `ti_order_totals`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_order_totals` (
  `order_total_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `order_id` int(10) unsigned NOT NULL,
  `code` varchar(128) NOT NULL,
  `title` varchar(128) NOT NULL,
  `value` decimal(15,4) NOT NULL,
  `priority` tinyint(1) NOT NULL DEFAULT 0,
  `is_summable` tinyint(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (`order_total_id`)
) ENGINE=InnoDB AUTO_INCREMENT=589 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_orders`
--

DROP TABLE IF EXISTS `ti_orders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_orders` (
  `order_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `external_order_number` varchar(191) DEFAULT NULL,
  `source_key` varchar(255) DEFAULT NULL,
  `is_imported_ready2order` tinyint(1) NOT NULL DEFAULT 0,
  `customer_id` int(11) DEFAULT NULL,
  `first_name` varchar(128) NOT NULL,
  `last_name` varchar(128) NOT NULL,
  `email` varchar(96) NOT NULL,
  `telephone` varchar(128) NOT NULL,
  `location_id` int(11) NOT NULL,
  `address_id` int(11) DEFAULT NULL,
  `cart` text NOT NULL,
  `total_items` int(11) NOT NULL,
  `comment` text DEFAULT NULL,
  `payment` varchar(128) NOT NULL,
  `stripe_payment_intent_id` varchar(255) DEFAULT NULL,
  `fiskaly_status` varchar(50) DEFAULT NULL,
  `fiskaly_transaction_id_ref` bigint(20) unsigned DEFAULT NULL,
  `fiskaly_qr_code_data` text DEFAULT NULL,
  `fiskaly_signature_counter` varchar(100) DEFAULT NULL,
  `fiskaly_tx_number` varchar(100) DEFAULT NULL,
  `fiskaly_serial_number` varchar(191) DEFAULT NULL,
  `order_type` varchar(128) NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `order_time` time NOT NULL,
  `order_date` date NOT NULL,
  `order_total` decimal(15,4) DEFAULT NULL,
  `estimated_prep_minutes` smallint(5) unsigned DEFAULT NULL,
  `status_id` int(11) NOT NULL,
  `ip_address` varchar(40) NOT NULL,
  `user_agent` varchar(128) NOT NULL,
  `assignee_id` int(11) DEFAULT NULL,
  `assignee_group_id` int(10) unsigned DEFAULT NULL,
  `invoice_prefix` varchar(128) DEFAULT NULL,
  `invoice_date` datetime DEFAULT NULL,
  `hash` varchar(40) DEFAULT NULL,
  `processed` tinyint(1) DEFAULT NULL,
  `status_updated_at` datetime DEFAULT NULL,
  `assignee_updated_at` datetime DEFAULT NULL,
  `order_time_is_asap` tinyint(1) NOT NULL DEFAULT 0,
  `delivery_comment` text DEFAULT NULL,
  `ms_order_type` varchar(255) NOT NULL DEFAULT '',
  `settlement_status` varchar(20) NOT NULL DEFAULT 'unpaid',
  `settled_amount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `settlement_method` varchar(50) DEFAULT NULL,
  `settlement_reference` varchar(255) DEFAULT NULL,
  `settled_at` datetime DEFAULT NULL,
  PRIMARY KEY (`order_id`),
  UNIQUE KEY `unique_stripe_payment_intent_id` (`stripe_payment_intent_id`),
  KEY `ti_orders_hash_index` (`hash`),
  KEY `idx_orders_stripe_payment_intent_id` (`stripe_payment_intent_id`),
  KEY `ti_orders_settlement_status_index` (`settlement_status`)
) ENGINE=InnoDB AUTO_INCREMENT=204 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_pages`
--

DROP TABLE IF EXISTS `ti_pages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_pages` (
  `page_id` bigint(20) unsigned NOT NULL,
  `language_id` bigint(20) unsigned NOT NULL,
  `title` varchar(128) NOT NULL,
  `content` mediumtext NOT NULL,
  `meta_description` varchar(128) DEFAULT NULL,
  `meta_keywords` varchar(128) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `status` tinyint(1) NOT NULL,
  `permalink_slug` varchar(128) DEFAULT NULL,
  `layout` varchar(128) DEFAULT NULL,
  `metadata` mediumtext DEFAULT NULL,
  `priority` int(11) DEFAULT NULL,
  PRIMARY KEY (`page_id`),
  KEY `ti_pages_language_id_foreign` (`language_id`),
  CONSTRAINT `ti_pages_language_id_foreign` FOREIGN KEY (`language_id`) REFERENCES `ti_languages` (`language_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_payment_attempts`
--

DROP TABLE IF EXISTS `ti_payment_attempts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_payment_attempts` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `order_id` bigint(20) unsigned NOT NULL,
  `provider_code` varchar(50) NOT NULL,
  `terminal_id` varchar(120) DEFAULT NULL,
  `amount` decimal(14,4) NOT NULL DEFAULT 0.0000,
  `currency` varchar(3) NOT NULL DEFAULT 'EUR',
  `status` varchar(30) NOT NULL DEFAULT 'pending',
  `provider_reference` varchar(190) DEFAULT NULL,
  `request_payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`request_payload`)),
  `response_payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`response_payload`)),
  `error_message` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `ti_payment_attempts_order_id_index` (`order_id`),
  KEY `ti_payment_attempts_provider_code_index` (`provider_code`),
  KEY `ti_payment_attempts_status_index` (`status`),
  KEY `ti_payment_attempts_provider_reference_index` (`provider_reference`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_payment_logs`
--

DROP TABLE IF EXISTS `ti_payment_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_payment_logs` (
  `payment_log_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `order_id` int(11) NOT NULL,
  `payment_name` varchar(128) NOT NULL,
  `message` varchar(128) NOT NULL,
  `request` text DEFAULT NULL,
  `response` text DEFAULT NULL,
  `is_success` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `payment_code` varchar(128) NOT NULL,
  `is_refundable` tinyint(1) NOT NULL DEFAULT 0,
  `refunded_at` datetime DEFAULT NULL,
  PRIMARY KEY (`payment_log_id`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_payment_methods`
--

DROP TABLE IF EXISTS `ti_payment_methods`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_payment_methods` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `code` varchar(50) DEFAULT NULL,
  `name` varchar(100) DEFAULT NULL,
  `status` tinyint(1) DEFAULT 1,
  `sort_order` int(11) DEFAULT 0,
  `provider_code` varchar(50) DEFAULT NULL,
  `meta` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`meta`)),
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_payment_profiles`
--

DROP TABLE IF EXISTS `ti_payment_profiles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_payment_profiles` (
  `payment_profile_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `customer_id` int(10) unsigned DEFAULT NULL,
  `payment_id` int(10) unsigned DEFAULT NULL,
  `card_brand` varchar(128) DEFAULT NULL,
  `card_last4` varchar(128) DEFAULT NULL,
  `profile_data` text DEFAULT NULL,
  `is_primary` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`payment_profile_id`),
  KEY `ti_payment_profiles_customer_id_index` (`customer_id`),
  KEY `ti_payment_profiles_payment_id_index` (`payment_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_payment_providers`
--

DROP TABLE IF EXISTS `ti_payment_providers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_payment_providers` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `code` varchar(50) DEFAULT NULL,
  `name` varchar(100) DEFAULT NULL,
  `status` tinyint(1) DEFAULT 1,
  `mode` enum('test','live') DEFAULT 'test',
  `supports_card` tinyint(1) DEFAULT 0,
  `supports_apple_pay` tinyint(1) DEFAULT 0,
  `supports_google_pay` tinyint(1) DEFAULT 0,
  `supports_paypal` tinyint(1) DEFAULT 0,
  `supports_cash` tinyint(1) DEFAULT 0,
  `supports_hosted_checkout` tinyint(1) DEFAULT 0,
  `config` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`config`)),
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_payments`
--

DROP TABLE IF EXISTS `ti_payments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_payments` (
  `payment_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(128) NOT NULL,
  `code` varchar(128) NOT NULL,
  `class_name` text NOT NULL,
  `description` text DEFAULT NULL,
  `data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`data`)),
  `status` tinyint(1) NOT NULL DEFAULT 0,
  `is_default` tinyint(1) NOT NULL DEFAULT 0,
  `priority` int(11) NOT NULL DEFAULT 0,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`payment_id`),
  UNIQUE KEY `ti_payments_code_unique` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_pos_config_device`
--

DROP TABLE IF EXISTS `ti_pos_config_device`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_pos_config_device` (
  `config_id` int(11) NOT NULL,
  `device_id` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_pos_configs`
--

DROP TABLE IF EXISTS `ti_pos_configs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_pos_configs` (
  `config_id` int(11) NOT NULL AUTO_INCREMENT,
  `device_id` int(11) NOT NULL,
  `url` varchar(255) NOT NULL,
  `access_token` varchar(255) NOT NULL,
  `id_application` varchar(255) NOT NULL,
  `sumup_affiliate_key` varchar(191) DEFAULT NULL,
  `sumup_reader_id` varchar(191) DEFAULT NULL,
  `sumup_pairing_code` varchar(191) DEFAULT NULL,
  `sumup_pairing_state` varchar(50) DEFAULT NULL,
  `sumup_reader_label` varchar(191) DEFAULT NULL,
  `username` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`config_id`)
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_pos_configs_backup_20260321_181322`
--

DROP TABLE IF EXISTS `ti_pos_configs_backup_20260321_181322`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_pos_configs_backup_20260321_181322` (
  `config_id` int(11) NOT NULL DEFAULT 0,
  `device_id` int(11) NOT NULL,
  `url` varchar(255) NOT NULL,
  `access_token` varchar(255) NOT NULL,
  `id_application` varchar(255) NOT NULL,
  `username` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_pos_devices`
--

DROP TABLE IF EXISTS `ti_pos_devices`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_pos_devices` (
  `device_id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `code` varchar(255) NOT NULL,
  `device_type` varchar(255) NOT NULL,
  `description` varchar(255) NOT NULL,
  `is_local_terminal` tinyint(1) NOT NULL DEFAULT 0,
  `device_code` varchar(100) DEFAULT NULL,
  `pairing_token` varchar(191) DEFAULT NULL,
  `device_status` varchar(20) DEFAULT NULL,
  `last_seen_at` timestamp NULL DEFAULT NULL,
  `capabilities` text DEFAULT NULL,
  `platform_info` text DEFAULT NULL,
  `image` varchar(255) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`device_id`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_pos_hardware_commands`
--

DROP TABLE IF EXISTS `ti_pos_hardware_commands`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_pos_hardware_commands` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `drawer_id` bigint(20) unsigned DEFAULT NULL,
  `pos_device_id` bigint(20) unsigned DEFAULT NULL,
  `location_id` bigint(20) unsigned DEFAULT NULL,
  `command_type` varchar(50) NOT NULL,
  `payload` text DEFAULT NULL,
  `status` enum('pending','processing','success','failed','cancelled') NOT NULL DEFAULT 'pending',
  `result_message` text DEFAULT NULL,
  `result_payload` text DEFAULT NULL,
  `queued_at` timestamp NULL DEFAULT NULL,
  `picked_at` timestamp NULL DEFAULT NULL,
  `completed_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `ti_pos_hardware_commands_status_pos_device_id_index` (`status`,`pos_device_id`),
  KEY `ti_pos_hardware_commands_queued_at_index` (`queued_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_qr_code`
--

DROP TABLE IF EXISTS `ti_qr_code`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_qr_code` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `qr_code` varchar(30) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_request_logs`
--

DROP TABLE IF EXISTS `ti_request_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_request_logs` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `url` varchar(128) DEFAULT NULL,
  `status_code` int(11) DEFAULT NULL,
  `referrer` text DEFAULT NULL,
  `count` int(11) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=418 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_reservation_tables`
--

DROP TABLE IF EXISTS `ti_reservation_tables`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_reservation_tables` (
  `reservation_id` int(10) unsigned NOT NULL,
  `table_id` int(10) unsigned NOT NULL,
  UNIQUE KEY `ti_reservation_tables_reservation_id_table_id_unique` (`reservation_id`,`table_id`),
  KEY `ti_reservation_tables_reservation_id_index` (`reservation_id`),
  KEY `ti_reservation_tables_table_id_index` (`table_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_reservations`
--

DROP TABLE IF EXISTS `ti_reservations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_reservations` (
  `reservation_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `location_id` int(11) NOT NULL,
  `table_id` int(11) NOT NULL,
  `guest_num` int(11) NOT NULL,
  `occasion_id` int(11) DEFAULT NULL,
  `customer_id` int(11) DEFAULT NULL,
  `first_name` varchar(128) NOT NULL,
  `last_name` varchar(128) NOT NULL,
  `email` varchar(96) NOT NULL,
  `telephone` varchar(128) NOT NULL,
  `comment` text DEFAULT NULL,
  `reserve_time` time NOT NULL,
  `reserve_date` date NOT NULL,
  `created_at` date NOT NULL,
  `updated_at` date NOT NULL,
  `assignee_id` int(11) DEFAULT NULL,
  `assignee_group_id` int(10) unsigned DEFAULT NULL,
  `notify` tinyint(1) DEFAULT NULL,
  `ip_address` varchar(40) NOT NULL,
  `user_agent` varchar(128) NOT NULL,
  `status_id` tinyint(1) NOT NULL,
  `hash` varchar(40) DEFAULT NULL,
  `duration` int(11) DEFAULT NULL,
  `processed` tinyint(1) DEFAULT NULL,
  `status_updated_at` datetime DEFAULT NULL,
  `assignee_updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`reservation_id`),
  KEY `ti_reservations_location_id_table_id_index` (`location_id`,`table_id`),
  KEY `ti_reservations_hash_index` (`hash`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_reviews`
--

DROP TABLE IF EXISTS `ti_reviews`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_reviews` (
  `review_id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `order_id` int(10) unsigned DEFAULT NULL,
  `menu_id` int(10) unsigned DEFAULT NULL,
  `customer_name` varchar(120) DEFAULT NULL,
  `rating` tinyint(3) unsigned NOT NULL DEFAULT 0,
  `comment` text DEFAULT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'pending',
  `source` varchar(30) NOT NULL DEFAULT 'frontend',
  `customer_id` int(10) unsigned DEFAULT NULL,
  `sale_id` int(10) unsigned DEFAULT NULL,
  `sale_type` varchar(128) DEFAULT NULL,
  `location_id` int(10) unsigned DEFAULT NULL,
  `tenant_host` varchar(128) DEFAULT NULL,
  `author` varchar(128) DEFAULT NULL,
  `quality` tinyint(3) unsigned NOT NULL DEFAULT 0,
  `service` tinyint(3) unsigned NOT NULL DEFAULT 0,
  `delivery` tinyint(3) unsigned NOT NULL DEFAULT 0,
  `review_text` text DEFAULT NULL,
  `review_status` tinyint(1) NOT NULL DEFAULT 0,
  `public_share_consent` tinyint(1) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`review_id`),
  KEY `ti_reviews_customer_id_index` (`customer_id`),
  KEY `ti_reviews_sale_id_index` (`sale_id`),
  KEY `ti_reviews_sale_type_index` (`sale_type`),
  KEY `ti_reviews_location_id_index` (`location_id`),
  KEY `ti_reviews_order_id_index` (`order_id`),
  KEY `ti_reviews_menu_id_index` (`menu_id`),
  KEY `ti_reviews_status_index` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_sessions`
--

DROP TABLE IF EXISTS `ti_sessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_sessions` (
  `id` varchar(128) NOT NULL,
  `payload` text DEFAULT NULL,
  `last_activity` int(11) DEFAULT NULL,
  UNIQUE KEY `ti_sessions_id_unique` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_settings`
--

DROP TABLE IF EXISTS `ti_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_settings` (
  `setting_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `sort` varchar(45) NOT NULL,
  `item` varchar(128) NOT NULL,
  `value` text DEFAULT NULL,
  `serialized` tinyint(1) DEFAULT NULL,
  PRIMARY KEY (`setting_id`),
  UNIQUE KEY `ti_settings_sort_item_unique` (`sort`,`item`)
) ENGINE=InnoDB AUTO_INCREMENT=154 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_staff_attendance`
--

DROP TABLE IF EXISTS `ti_staff_attendance`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_staff_attendance` (
  `attendance_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `staff_id` bigint(20) unsigned NOT NULL,
  `check_in_time` datetime NOT NULL,
  `check_out_time` datetime DEFAULT NULL,
  `hours_worked` decimal(8,2) DEFAULT NULL,
  `is_late` tinyint(1) NOT NULL DEFAULT 0,
  `late_minutes` int(11) NOT NULL DEFAULT 0,
  `is_overtime` tinyint(1) NOT NULL DEFAULT 0,
  `overtime_minutes` int(11) NOT NULL DEFAULT 0,
  `is_edited` tinyint(1) NOT NULL DEFAULT 0,
  `edited_by` bigint(20) unsigned DEFAULT NULL,
  `edited_at` timestamp NULL DEFAULT NULL,
  `status` enum('checked_in','checked_out','abandoned','corrected','auto_checkout') NOT NULL DEFAULT 'checked_in',
  `location_id` int(11) DEFAULT NULL,
  `timezone` varchar(50) NOT NULL DEFAULT 'UTC',
  `device_type` enum('card','fingerprint','manual','zkteco') NOT NULL DEFAULT 'card',
  `verification_method` enum('fingerprint','rfid','face','pin','manual','mobile') NOT NULL DEFAULT 'fingerprint',
  `device_id` bigint(20) unsigned DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Additional data like GPS, photo, etc.' CHECK (json_valid(`metadata`)),
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`attendance_id`),
  KEY `ti_staff_attendance_staff_id_index` (`staff_id`),
  KEY `ti_staff_attendance_check_in_time_index` (`check_in_time`),
  KEY `ti_staff_attendance_location_id_index` (`location_id`),
  KEY `ti_staff_attendance_staff_id_check_in_time_index` (`staff_id`,`check_in_time`),
  KEY `ti_staff_attendance_device_id_index` (`device_id`),
  KEY `ti_staff_attendance_staff_id_check_in_time_status_index` (`staff_id`,`check_in_time`,`status`),
  KEY `ti_staff_attendance_status_index` (`status`),
  KEY `ti_staff_attendance_verification_method_index` (`verification_method`),
  KEY `ti_staff_attendance_is_late_is_overtime_index` (`is_late`,`is_overtime`),
  CONSTRAINT `ti_staff_attendance_staff_id_foreign` FOREIGN KEY (`staff_id`) REFERENCES `ti_staffs` (`staff_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_staff_device_mappings`
--

DROP TABLE IF EXISTS `ti_staff_device_mappings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_staff_device_mappings` (
  `mapping_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `staff_id` bigint(20) unsigned NOT NULL,
  `device_id` bigint(20) unsigned NOT NULL,
  `device_uid` int(11) DEFAULT NULL,
  `enrollment_type` enum('fingerprint','rfid','face','pin') NOT NULL DEFAULT 'fingerprint',
  `sync_status` enum('pending','synced','failed','deleted') NOT NULL DEFAULT 'pending',
  `enrollment_data` text DEFAULT NULL,
  `enrolled_at` timestamp NULL DEFAULT NULL,
  `last_synced_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`mapping_id`),
  UNIQUE KEY `staff_device_enrollment_unique` (`staff_id`,`device_id`,`enrollment_type`),
  KEY `ti_staff_device_mappings_device_id_foreign` (`device_id`),
  KEY `ti_staff_device_mappings_sync_status_index` (`sync_status`),
  CONSTRAINT `ti_staff_device_mappings_device_id_foreign` FOREIGN KEY (`device_id`) REFERENCES `ti_finger_devices` (`device_id`) ON DELETE CASCADE,
  CONSTRAINT `ti_staff_device_mappings_staff_id_foreign` FOREIGN KEY (`staff_id`) REFERENCES `ti_staffs` (`staff_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_staff_groups`
--

DROP TABLE IF EXISTS `ti_staff_groups`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_staff_groups` (
  `staff_group_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `staff_group_name` varchar(32) NOT NULL,
  `description` text NOT NULL,
  `auto_assign` tinyint(1) DEFAULT 0,
  `auto_assign_mode` tinyint(4) DEFAULT 1,
  `auto_assign_limit` int(11) DEFAULT 20,
  `auto_assign_availability` tinyint(1) DEFAULT 1,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`staff_group_id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_staff_latetimes`
--

DROP TABLE IF EXISTS `ti_staff_latetimes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_staff_latetimes` (
  `latetime_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `staff_id` bigint(20) unsigned NOT NULL,
  `attendance_id` bigint(20) unsigned NOT NULL,
  `duration` time NOT NULL,
  `latetime_date` date NOT NULL,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`latetime_id`),
  KEY `ti_staff_latetimes_staff_id_index` (`staff_id`),
  KEY `ti_staff_latetimes_latetime_date_index` (`latetime_date`),
  KEY `ti_staff_latetimes_staff_id_latetime_date_index` (`staff_id`,`latetime_date`),
  KEY `ti_staff_latetimes_attendance_id_foreign` (`attendance_id`),
  CONSTRAINT `ti_staff_latetimes_attendance_id_foreign` FOREIGN KEY (`attendance_id`) REFERENCES `ti_staff_attendance` (`attendance_id`) ON DELETE CASCADE,
  CONSTRAINT `ti_staff_latetimes_staff_id_foreign` FOREIGN KEY (`staff_id`) REFERENCES `ti_staffs` (`staff_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_staff_leaves`
--

DROP TABLE IF EXISTS `ti_staff_leaves`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_staff_leaves` (
  `leave_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `staff_id` bigint(20) unsigned NOT NULL,
  `leave_date` date NOT NULL,
  `leave_time` time DEFAULT NULL,
  `leave_type` enum('full_day','half_day','early_leave','late_arrival') NOT NULL DEFAULT 'full_day',
  `status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  `reason` text DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`leave_id`),
  KEY `ti_staff_leaves_staff_id_index` (`staff_id`),
  KEY `ti_staff_leaves_leave_date_index` (`leave_date`),
  KEY `ti_staff_leaves_staff_id_leave_date_index` (`staff_id`,`leave_date`),
  CONSTRAINT `ti_staff_leaves_staff_id_foreign` FOREIGN KEY (`staff_id`) REFERENCES `ti_staffs` (`staff_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_staff_overtimes`
--

DROP TABLE IF EXISTS `ti_staff_overtimes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_staff_overtimes` (
  `overtime_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `staff_id` bigint(20) unsigned NOT NULL,
  `attendance_id` bigint(20) unsigned NOT NULL,
  `duration` time NOT NULL,
  `overtime_date` date NOT NULL,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`overtime_id`),
  KEY `ti_staff_overtimes_staff_id_index` (`staff_id`),
  KEY `ti_staff_overtimes_overtime_date_index` (`overtime_date`),
  KEY `ti_staff_overtimes_staff_id_overtime_date_index` (`staff_id`,`overtime_date`),
  KEY `ti_staff_overtimes_attendance_id_foreign` (`attendance_id`),
  CONSTRAINT `ti_staff_overtimes_attendance_id_foreign` FOREIGN KEY (`attendance_id`) REFERENCES `ti_staff_attendance` (`attendance_id`) ON DELETE CASCADE,
  CONSTRAINT `ti_staff_overtimes_staff_id_foreign` FOREIGN KEY (`staff_id`) REFERENCES `ti_staffs` (`staff_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_staff_roles`
--

DROP TABLE IF EXISTS `ti_staff_roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_staff_roles` (
  `staff_role_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(128) NOT NULL,
  `code` varchar(128) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `permissions` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`staff_role_id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_staff_schedule_assignments`
--

DROP TABLE IF EXISTS `ti_staff_schedule_assignments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_staff_schedule_assignments` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `staff_id` bigint(20) unsigned NOT NULL,
  `schedule_id` bigint(20) unsigned NOT NULL,
  `effective_from` date DEFAULT NULL,
  `effective_to` date DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `ti_staff_schedule_assignments_staff_id_index` (`staff_id`),
  KEY `ti_staff_schedule_assignments_schedule_id_index` (`schedule_id`),
  KEY `ti_staff_schedule_assignments_staff_id_effective_from_index` (`staff_id`,`effective_from`),
  CONSTRAINT `ti_staff_schedule_assignments_schedule_id_foreign` FOREIGN KEY (`schedule_id`) REFERENCES `ti_staff_schedules` (`schedule_id`) ON DELETE CASCADE,
  CONSTRAINT `ti_staff_schedule_assignments_staff_id_foreign` FOREIGN KEY (`staff_id`) REFERENCES `ti_staffs` (`staff_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_staff_schedules`
--

DROP TABLE IF EXISTS `ti_staff_schedules`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_staff_schedules` (
  `schedule_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `time_in` time NOT NULL,
  `time_out` time NOT NULL,
  `status` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`schedule_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_staffs`
--

DROP TABLE IF EXISTS `ti_staffs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_staffs` (
  `staff_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `staff_name` varchar(128) NOT NULL,
  `staff_email` varchar(96) NOT NULL,
  `card_id` varchar(255) DEFAULT NULL,
  `rfid_card_uid` varchar(100) DEFAULT NULL,
  `fingerprint_template` text DEFAULT NULL,
  `face_template` text DEFAULT NULL,
  `pin_code` varchar(255) DEFAULT NULL,
  `biometric_enabled` tinyint(1) NOT NULL DEFAULT 0,
  `enrollment_status` enum('not_enrolled','enrolled','pending','failed') NOT NULL DEFAULT 'not_enrolled',
  `enrolled_at` timestamp NULL DEFAULT NULL,
  `enrolled_by` bigint(20) unsigned DEFAULT NULL,
  `enrolled_devices` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'List of device IDs where staff is enrolled' CHECK (json_valid(`enrolled_devices`)),
  `staff_role_id` int(11) NOT NULL,
  `language_id` int(11) DEFAULT NULL,
  `created_at` date NOT NULL,
  `staff_status` tinyint(1) NOT NULL,
  `sale_permission` tinyint(4) DEFAULT 1,
  `updated_at` timestamp NOT NULL,
  PRIMARY KEY (`staff_id`),
  UNIQUE KEY `staff_email` (`staff_email`),
  UNIQUE KEY `ti_staffs_card_id_unique` (`card_id`),
  UNIQUE KEY `ti_staffs_rfid_card_uid_unique` (`rfid_card_uid`),
  KEY `ti_staffs_enrollment_status_index` (`enrollment_status`),
  KEY `ti_staffs_biometric_enabled_index` (`biometric_enabled`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_staffs_groups`
--

DROP TABLE IF EXISTS `ti_staffs_groups`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_staffs_groups` (
  `staff_id` int(10) unsigned NOT NULL,
  `staff_group_id` int(10) unsigned NOT NULL,
  PRIMARY KEY (`staff_id`,`staff_group_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_status_history`
--

DROP TABLE IF EXISTS `ti_status_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_status_history` (
  `status_history_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `object_id` int(11) NOT NULL,
  `object_type` varchar(128) NOT NULL,
  `staff_id` int(11) DEFAULT NULL,
  `status_id` int(11) NOT NULL,
  `notify` tinyint(1) DEFAULT NULL,
  `comment` text DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` timestamp NOT NULL,
  PRIMARY KEY (`status_history_id`)
) ENGINE=InnoDB AUTO_INCREMENT=391 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_statuses`
--

DROP TABLE IF EXISTS `ti_statuses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_statuses` (
  `status_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `status_name` varchar(128) NOT NULL,
  `status_comment` text DEFAULT NULL,
  `notify_customer` tinyint(1) DEFAULT NULL,
  `status_for` varchar(128) NOT NULL,
  `status_color` varchar(128) NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`status_id`)
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_stock_history`
--

DROP TABLE IF EXISTS `ti_stock_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_stock_history` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `stock_id` bigint(20) unsigned NOT NULL,
  `staff_id` bigint(20) unsigned DEFAULT NULL,
  `order_id` bigint(20) unsigned DEFAULT NULL,
  `state` varchar(128) NOT NULL,
  `quantity` bigint(20) NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `ti_stock_history_stock_id_foreign` (`stock_id`),
  KEY `ti_stock_history_order_id_foreign` (`order_id`),
  CONSTRAINT `ti_stock_history_order_id_foreign` FOREIGN KEY (`order_id`) REFERENCES `ti_orders` (`order_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ti_stock_history_stock_id_foreign` FOREIGN KEY (`stock_id`) REFERENCES `ti_stocks` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_stocks`
--

DROP TABLE IF EXISTS `ti_stocks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_stocks` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `location_id` bigint(20) unsigned NOT NULL,
  `stockable_id` bigint(20) unsigned NOT NULL,
  `stockable_type` varchar(128) NOT NULL,
  `quantity` bigint(20) DEFAULT NULL,
  `low_stock_alert` tinyint(1) NOT NULL DEFAULT 0,
  `low_stock_threshold` int(11) NOT NULL DEFAULT 0,
  `is_tracked` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `low_stock_alert_sent` tinyint(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_superadmin`
--

DROP TABLE IF EXISTS `ti_superadmin`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_superadmin` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `username` varchar(191) NOT NULL,
  `password` varchar(255) NOT NULL,
  `company_name` varchar(191) NOT NULL,
  `company_website` varchar(191) NOT NULL,
  `email` varchar(191) NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_table_group_tables`
--

DROP TABLE IF EXISTS `ti_table_group_tables`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_table_group_tables` (
  `table_group_table_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `table_group_id` bigint(20) unsigned NOT NULL,
  `table_id` bigint(20) unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`table_group_table_id`),
  UNIQUE KEY `ti_table_group_tables_table_group_id_table_id_unique` (`table_group_id`,`table_id`),
  UNIQUE KEY `ti_table_group_tables_table_id_unique` (`table_id`),
  KEY `ti_table_group_tables_table_group_id_index` (`table_group_id`),
  KEY `ti_table_group_tables_table_id_index` (`table_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_table_groups`
--

DROP TABLE IF EXISTS `ti_table_groups`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_table_groups` (
  `table_group_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `location_id` bigint(20) unsigned NOT NULL,
  `name` varchar(255) NOT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'active',
  `created_by` bigint(20) unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`table_group_id`),
  KEY `ti_table_groups_location_id_index` (`location_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_table_notes`
--

DROP TABLE IF EXISTS `ti_table_notes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_table_notes` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `table_id` int(10) unsigned NOT NULL,
  `note` text NOT NULL,
  `timestamp` timestamp NOT NULL,
  `status` enum('new','resolved') NOT NULL DEFAULT 'new',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `ti_table_notes_table_id_index` (`table_id`),
  KEY `ti_table_notes_status_index` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_tables`
--

DROP TABLE IF EXISTS `ti_tables`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_tables` (
  `table_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `table_no` varchar(100) DEFAULT NULL,
  `table_name` varchar(128) NOT NULL,
  `pos_table_label` varchar(255) DEFAULT NULL,
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
) ENGINE=InnoDB AUTO_INCREMENT=41 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_tenants`
--

DROP TABLE IF EXISTS `ti_tenants`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_tenants` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `domain` varchar(255) NOT NULL,
  `database` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `phone` varchar(20) NOT NULL,
  `start` date NOT NULL,
  `end` date NOT NULL,
  `type` varchar(255) DEFAULT NULL,
  `country` varchar(255) NOT NULL,
  `description` varchar(1000) NOT NULL,
  `status` varchar(255) NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_domain` (`domain`(191)),
  UNIQUE KEY `unique_database` (`database`(191))
) ENGINE=MyISAM AUTO_INCREMENT=30 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_terminal_devices`
--

DROP TABLE IF EXISTS `ti_terminal_devices`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_terminal_devices` (
  `terminal_device_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `provider_code` varchar(50) NOT NULL,
  `location_id` int(10) unsigned DEFAULT NULL,
  `affiliate_key` varchar(191) DEFAULT NULL,
  `reader_id` varchar(191) DEFAULT NULL,
  `reader_label` varchar(191) DEFAULT NULL,
  `pairing_state` varchar(50) DEFAULT NULL,
  `terminal_status` varchar(191) DEFAULT NULL,
  `metadata` longtext DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`terminal_device_id`),
  KEY `ti_terminal_devices_provider_code_index` (`provider_code`),
  KEY `ti_terminal_devices_location_id_index` (`location_id`),
  KEY `ti_terminal_devices_reader_id_index` (`reader_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_terminal_devices_platform`
--

DROP TABLE IF EXISTS `ti_terminal_devices_platform`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_terminal_devices_platform` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(128) NOT NULL,
  `ip_address` varchar(128) DEFAULT NULL,
  `status` enum('active','inactive') NOT NULL DEFAULT 'inactive',
  `model` varchar(128) DEFAULT NULL,
  `last_active` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_themes`
--

DROP TABLE IF EXISTS `ti_themes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_themes` (
  `theme_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(128) NOT NULL,
  `code` varchar(128) NOT NULL,
  `description` text DEFAULT NULL,
  `version` varchar(128) DEFAULT '0.0.1',
  `data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`data`)),
  `status` tinyint(1) NOT NULL DEFAULT 0,
  `is_default` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`theme_id`),
  UNIQUE KEY `ti_themes_code_unique` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_ti_terminal_devices`
--

DROP TABLE IF EXISTS `ti_ti_terminal_devices`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_ti_terminal_devices` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(128) DEFAULT NULL,
  `ip_address` varchar(128) DEFAULT NULL,
  `status` varchar(128) NOT NULL DEFAULT 'inactive',
  `last_active` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_ti_unassigned_cards`
--

DROP TABLE IF EXISTS `ti_ti_unassigned_cards`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_ti_unassigned_cards` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `card_uid` varchar(50) NOT NULL,
  `device_id` int(11) DEFAULT NULL,
  `first_seen_at` datetime DEFAULT NULL,
  `last_seen_at` datetime DEFAULT NULL,
  `times_scanned` int(11) NOT NULL DEFAULT 1,
  `location_id` int(11) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ti_ti_unassigned_cards_card_uid_unique` (`card_uid`),
  KEY `idx_card_uid` (`card_uid`),
  KEY `idx_device_id` (`device_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_tips_shifts`
--

DROP TABLE IF EXISTS `ti_tips_shifts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_tips_shifts` (
  `shift_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `shift_date` date NOT NULL,
  `location_id` int(10) unsigned DEFAULT NULL,
  `description` text DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`shift_id`),
  UNIQUE KEY `ti_tips_shifts_shift_date_location_id_unique` (`shift_date`,`location_id`),
  KEY `ti_tips_shifts_shift_date_location_id_index` (`shift_date`,`location_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_user_preferences`
--

DROP TABLE IF EXISTS `ti_user_preferences`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_user_preferences` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `item` varchar(128) NOT NULL,
  `value` text NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_users`
--

DROP TABLE IF EXISTS `ti_users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_users` (
  `user_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `staff_id` int(11) NOT NULL,
  `username` varchar(32) NOT NULL,
  `password` varchar(128) NOT NULL,
  `super_user` tinyint(1) DEFAULT NULL,
  `reset_code` varchar(128) DEFAULT NULL,
  `reset_time` datetime DEFAULT NULL,
  `activation_code` varchar(128) DEFAULT NULL,
  `remember_token` varchar(128) DEFAULT NULL,
  `is_activated` tinyint(1) DEFAULT NULL,
  `date_activated` datetime DEFAULT NULL,
  `last_login` datetime DEFAULT NULL,
  `last_seen` datetime DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `ti_users_staff_id_unique` (`staff_id`),
  UNIQUE KEY `ti_users_username_unique` (`username`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_valet_requests`
--

DROP TABLE IF EXISTS `ti_valet_requests`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_valet_requests` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `table_id` int(10) unsigned NOT NULL,
  `customer_name` varchar(128) NOT NULL,
  `car_make` varchar(128) NOT NULL,
  `license_plate` varchar(128) NOT NULL,
  `status` enum('pending','resolved') NOT NULL DEFAULT 'pending',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `ti_valet_requests_table_id_index` (`table_id`),
  KEY `ti_valet_requests_status_index` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_vr_payment_sessions`
--

DROP TABLE IF EXISTS `ti_vr_payment_sessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_vr_payment_sessions` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `provider_code` varchar(50) NOT NULL DEFAULT 'vr_payment',
  `method_code` varchar(50) DEFAULT NULL,
  `merchant_reference` varchar(191) DEFAULT NULL,
  `session_id` varchar(191) DEFAULT NULL,
  `transaction_id` varchar(191) DEFAULT NULL,
  `provider_reference` varchar(191) DEFAULT NULL,
  `state` varchar(50) NOT NULL DEFAULT 'pending',
  `order_id` int(10) unsigned DEFAULT NULL,
  `amount` decimal(12,4) DEFAULT NULL,
  `currency` varchar(10) DEFAULT NULL,
  `raw_snapshot` longtext DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ti_vr_payment_sessions_session_id_unique` (`session_id`),
  KEY `ti_vr_payment_sessions_provider_code_index` (`provider_code`),
  KEY `ti_vr_payment_sessions_method_code_index` (`method_code`),
  KEY `ti_vr_payment_sessions_merchant_reference_index` (`merchant_reference`),
  KEY `ti_vr_payment_sessions_transaction_id_index` (`transaction_id`),
  KEY `ti_vr_payment_sessions_provider_reference_index` (`provider_reference`),
  KEY `ti_vr_payment_sessions_state_index` (`state`),
  KEY `ti_vr_payment_sessions_order_id_index` (`order_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_vr_payment_webhook_events`
--

DROP TABLE IF EXISTS `ti_vr_payment_webhook_events`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_vr_payment_webhook_events` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `event_id` varchar(191) NOT NULL,
  `event_type` varchar(100) DEFAULT NULL,
  `session_id` varchar(191) DEFAULT NULL,
  `transaction_id` varchar(191) DEFAULT NULL,
  `provider_reference` varchar(191) DEFAULT NULL,
  `state` varchar(50) DEFAULT NULL,
  `processed_at` timestamp NULL DEFAULT NULL,
  `payload` longtext DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ti_vr_payment_webhook_events_event_id_unique` (`event_id`),
  KEY `ti_vr_payment_webhook_events_event_type_index` (`event_type`),
  KEY `ti_vr_payment_webhook_events_session_id_index` (`session_id`),
  KEY `ti_vr_payment_webhook_events_transaction_id_index` (`transaction_id`),
  KEY `ti_vr_payment_webhook_events_provider_reference_index` (`provider_reference`),
  KEY `ti_vr_payment_webhook_events_state_index` (`state`),
  KEY `ti_vr_payment_webhook_events_processed_at_index` (`processed_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_waiter_calls`
--

DROP TABLE IF EXISTS `ti_waiter_calls`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_waiter_calls` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `table_id` int(10) unsigned NOT NULL,
  `message` text DEFAULT NULL,
  `status` enum('pending','resolved') NOT NULL DEFAULT 'pending',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `ti_waiter_calls_table_id_index` (`table_id`),
  KEY `ti_waiter_calls_status_index` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_waiter_requests`
--

DROP TABLE IF EXISTS `ti_waiter_requests`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_waiter_requests` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `location_id` int(11) NOT NULL,
  `table_number` int(11) NOT NULL,
  `note` text DEFAULT NULL,
  `status` varchar(128) NOT NULL DEFAULT 'pending',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `ti_waiter_requests_location_id_index` (`location_id`),
  KEY `ti_waiter_requests_location_id_table_number_index` (`location_id`,`table_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_websockets_statistics_entries`
--

DROP TABLE IF EXISTS `ti_websockets_statistics_entries`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_websockets_statistics_entries` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `app_id` varchar(128) NOT NULL,
  `peak_connection_count` int(11) NOT NULL,
  `websocket_message_count` int(11) NOT NULL,
  `api_message_count` int(11) NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_working_hours`
--

DROP TABLE IF EXISTS `ti_working_hours`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_working_hours` (
  `location_id` int(11) NOT NULL,
  `weekday` int(11) NOT NULL,
  `opening_time` time NOT NULL DEFAULT '00:00:00',
  `closing_time` time NOT NULL DEFAULT '00:00:00',
  `status` tinyint(1) NOT NULL,
  `type` varchar(32) NOT NULL,
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  PRIMARY KEY (`id`),
  KEY `ti_working_hours_location_id_weekday_type_index` (`location_id`,`weekday`,`type`)
) ENGINE=InnoDB AUTO_INCREMENT=22 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping events for database 'paymydine'
--

--
-- Dumping routines for database 'paymydine'
--
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-06-09 23:50:19

-- ============================================================
-- DATABASE: mimoza
-- ============================================================

/*M!999999\- enable the sandbox mode */ 
-- MariaDB dump 10.19  Distrib 10.11.13-MariaDB, for debian-linux-gnu (x86_64)
--
-- Host: 127.0.0.1    Database: mimoza
-- ------------------------------------------------------
-- Server version	10.11.13-MariaDB-0ubuntu0.24.04.1

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Current Database: `mimoza`
--

CREATE DATABASE /*!32312 IF NOT EXISTS*/ `mimoza` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci */;

USE `mimoza`;

--
-- Table structure for table `allergens`
--

DROP TABLE IF EXISTS `allergens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `allergens` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `status` tinyint(1) DEFAULT 1,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `igniter_coupon_categories`
--

DROP TABLE IF EXISTS `igniter_coupon_categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `igniter_coupon_categories` (
  `coupon_id` int(10) unsigned NOT NULL,
  `category_id` int(10) unsigned NOT NULL,
  PRIMARY KEY (`coupon_id`,`category_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `igniter_coupon_customer_groups`
--

DROP TABLE IF EXISTS `igniter_coupon_customer_groups`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `igniter_coupon_customer_groups` (
  `coupon_id` int(10) unsigned NOT NULL,
  `customer_group_id` int(10) unsigned NOT NULL,
  PRIMARY KEY (`coupon_id`,`customer_group_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `igniter_coupon_customers`
--

DROP TABLE IF EXISTS `igniter_coupon_customers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `igniter_coupon_customers` (
  `coupon_id` int(10) unsigned NOT NULL,
  `customer_id` int(10) unsigned NOT NULL,
  PRIMARY KEY (`coupon_id`,`customer_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `igniter_coupon_menus`
--

DROP TABLE IF EXISTS `igniter_coupon_menus`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `igniter_coupon_menus` (
  `coupon_id` int(10) unsigned NOT NULL,
  `menu_id` int(10) unsigned NOT NULL,
  PRIMARY KEY (`coupon_id`,`menu_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `igniter_coupons`
--

DROP TABLE IF EXISTS `igniter_coupons`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `igniter_coupons` (
  `coupon_id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `code` varchar(32) NOT NULL,
  `name` varchar(128) NOT NULL,
  `description` text DEFAULT NULL,
  `type` varchar(32) NOT NULL DEFAULT 'F',
  `discount` decimal(15,4) NOT NULL DEFAULT 0.0000,
  `min_total` decimal(15,4) DEFAULT NULL,
  `redemptions` int(10) unsigned DEFAULT NULL,
  `customer_redemptions` int(10) unsigned DEFAULT NULL,
  `status` tinyint(1) NOT NULL DEFAULT 1,
  `period_start_date` datetime DEFAULT NULL,
  `period_end_date` datetime DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`coupon_id`),
  UNIQUE KEY `code` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `igniter_coupons_history`
--

DROP TABLE IF EXISTS `igniter_coupons_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `igniter_coupons_history` (
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `locationables`
--

DROP TABLE IF EXISTS `locationables`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `locationables` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `location_id` int(11) NOT NULL,
  `locationable_id` int(11) NOT NULL,
  `locationable_type` varchar(255) NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `locationables_location_id_idx` (`location_id`),
  KEY `locationables_type_id_idx` (`locationable_type`,`locationable_id`)
) ENGINE=InnoDB AUTO_INCREMENT=247 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `qr_code`
--

DROP TABLE IF EXISTS `qr_code`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `qr_code` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `qr_code` varchar(30) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `r2o_bridge_seen`
--

DROP TABLE IF EXISTS `r2o_bridge_seen`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `r2o_bridge_seen` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `event_key` varchar(64) NOT NULL,
  `source_ref` varchar(255) DEFAULT NULL,
  `payload_json` longtext DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_event_key` (`event_key`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `r2o_event_log`
--

DROP TABLE IF EXISTS `r2o_event_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `r2o_event_log` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `event_name` varchar(100) DEFAULT NULL,
  `product_id` varchar(64) DEFAULT NULL,
  `product_name` varchar(255) DEFAULT NULL,
  `table_id` varchar(64) DEFAULT NULL,
  `order_ref` varchar(128) DEFAULT NULL,
  `raw_json` longtext DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_event_name` (`event_name`),
  KEY `idx_product_id` (`product_id`),
  KEY `idx_product_name` (`product_name`),
  KEY `idx_table_id` (`table_id`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `r2o_product_map`
--

DROP TABLE IF EXISTS `r2o_product_map`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `r2o_product_map` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `r2o_product_id` varchar(64) DEFAULT NULL,
  `r2o_product_name` varchar(255) DEFAULT NULL,
  `menu_id` bigint(20) unsigned NOT NULL,
  `menu_name` varchar(255) DEFAULT NULL,
  `is_fallback` tinyint(1) NOT NULL DEFAULT 0,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_r2o_product_id` (`r2o_product_id`),
  KEY `idx_r2o_product_name` (`r2o_product_name`),
  KEY `idx_menu_id` (`menu_id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `r2o_unknown_products`
--

DROP TABLE IF EXISTS `r2o_unknown_products`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `r2o_unknown_products` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `product_id` varchar(64) DEFAULT NULL,
  `product_name` varchar(255) DEFAULT NULL,
  `first_event_name` varchar(100) DEFAULT NULL,
  `sample_payload` longtext DEFAULT NULL,
  `first_seen_at` timestamp NULL DEFAULT current_timestamp(),
  `last_seen_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `hits` int(11) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_unknown` (`product_id`,`product_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `r2o_webhook_seen`
--

DROP TABLE IF EXISTS `r2o_webhook_seen`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `r2o_webhook_seen` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `event_key` varchar(255) NOT NULL,
  `event_name` varchar(100) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_event_key` (`event_key`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `terminal_devices`
--

DROP TABLE IF EXISTS `terminal_devices`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `terminal_devices` (
  `terminal_device_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `provider_code` varchar(50) NOT NULL,
  `location_id` int(10) unsigned DEFAULT NULL,
  `affiliate_key` varchar(191) DEFAULT NULL,
  `reader_id` varchar(191) DEFAULT NULL,
  `reader_label` varchar(191) DEFAULT NULL,
  `pairing_state` varchar(50) DEFAULT NULL,
  `terminal_status` varchar(191) DEFAULT NULL,
  `metadata` longtext DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`terminal_device_id`),
  KEY `td_provider_idx` (`provider_code`),
  KEY `td_location_idx` (`location_id`),
  KEY `td_reader_idx` (`reader_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_activities`
--

DROP TABLE IF EXISTS `ti_activities`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_activities` (
  `activity_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int(11) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `log_name` varchar(128) DEFAULT NULL,
  `properties` text DEFAULT NULL,
  `subject_id` int(11) DEFAULT NULL,
  `subject_type` varchar(128) DEFAULT NULL,
  `causer_id` int(11) DEFAULT NULL,
  `causer_type` varchar(128) DEFAULT NULL,
  `updated_at` datetime NOT NULL,
  `type` varchar(128) DEFAULT NULL,
  `read_at` datetime DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `user_type` varchar(128) DEFAULT NULL,
  PRIMARY KEY (`activity_id`)
) ENGINE=InnoDB AUTO_INCREMENT=225 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_addresses`
--

DROP TABLE IF EXISTS `ti_addresses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_addresses` (
  `address_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `customer_id` int(11) DEFAULT NULL,
  `address_1` varchar(128) NOT NULL,
  `address_2` varchar(128) DEFAULT NULL,
  `city` varchar(128) DEFAULT NULL,
  `state` varchar(128) DEFAULT NULL,
  `postcode` varchar(128) DEFAULT NULL,
  `country_id` int(11) NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`address_id`)
) ENGINE=InnoDB AUTO_INCREMENT=154 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_allergenables`
--

DROP TABLE IF EXISTS `ti_allergenables`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_allergenables` (
  `allergen_id` int(10) unsigned NOT NULL,
  `allergenable_type` varchar(128) NOT NULL,
  `allergenable_id` bigint(20) unsigned NOT NULL,
  UNIQUE KEY `allergenable_unique` (`allergen_id`,`allergenable_id`,`allergenable_type`),
  KEY `allergenable_index` (`allergenable_type`,`allergenable_id`),
  KEY `ti_allergenables_allergen_id_index` (`allergen_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_allergens`
--

DROP TABLE IF EXISTS `ti_allergens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_allergens` (
  `allergen_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(128) NOT NULL,
  `description` varchar(128) NOT NULL,
  `status` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`allergen_id`)
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_assignable_logs`
--

DROP TABLE IF EXISTS `ti_assignable_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_assignable_logs` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `assignable_type` varchar(128) NOT NULL,
  `assignable_id` bigint(20) unsigned NOT NULL,
  `assignee_id` int(10) unsigned DEFAULT NULL,
  `assignee_group_id` int(10) unsigned DEFAULT NULL,
  `status_id` int(10) unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `ti_assignable_logs_assignable_type_assignable_id_index` (`assignable_type`,`assignable_id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_banners`
--

DROP TABLE IF EXISTS `ti_banners`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_banners` (
  `banner_id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(128) NOT NULL,
  `type` char(8) NOT NULL,
  `click_url` varchar(128) DEFAULT NULL,
  `language_id` int(11) NOT NULL,
  `alt_text` varchar(128) DEFAULT NULL,
  `image_code` text DEFAULT NULL,
  `custom_code` text DEFAULT NULL,
  `status` tinyint(1) NOT NULL,
  PRIMARY KEY (`banner_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_cache`
--

DROP TABLE IF EXISTS `ti_cache`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_cache` (
  `key` varchar(128) NOT NULL,
  `value` mediumtext NOT NULL,
  `expiration` int(11) NOT NULL,
  UNIQUE KEY `ti_cache_key_unique` (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_cash_drawer_logs`
--

DROP TABLE IF EXISTS `ti_cash_drawer_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_cash_drawer_logs` (
  `log_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `drawer_id` bigint(20) unsigned NOT NULL COMMENT 'Reference to cash drawer',
  `order_id` int(11) unsigned DEFAULT NULL COMMENT 'Associated order (if triggered by payment)',
  `location_id` int(10) unsigned DEFAULT NULL COMMENT 'Location where event occurred',
  `action` enum('open','close','test','error','manual') NOT NULL DEFAULT 'open' COMMENT 'Type of action performed',
  `trigger_method` varchar(50) DEFAULT NULL COMMENT 'cash_payment, manual, test, scheduled',
  `success` tinyint(1) NOT NULL DEFAULT 1 COMMENT 'Whether the action was successful',
  `error_message` text DEFAULT NULL COMMENT 'Error details if action failed',
  `response_data` text DEFAULT NULL COMMENT 'JSON response from drawer device',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`log_id`),
  KEY `idx_drawer_id` (`drawer_id`),
  KEY `idx_order_id` (`order_id`),
  KEY `idx_location_id` (`location_id`),
  KEY `idx_action` (`action`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB AUTO_INCREMENT=135 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Cash drawer operation logs';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_cash_drawers`
--

DROP TABLE IF EXISTS `ti_cash_drawers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_cash_drawers` (
  `drawer_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(128) NOT NULL COMMENT 'Display name for the cash drawer',
  `location_id` int(10) unsigned DEFAULT NULL COMMENT 'Associated location (multi-tenant)',
  `pos_device_id` bigint(20) unsigned DEFAULT NULL COMMENT 'Linked POS device (optional)',
  `local_pos_device_id` int(10) unsigned DEFAULT NULL,
  `local_mapping_invalid` tinyint(1) NOT NULL DEFAULT 0,
  `last_command_status` varchar(50) DEFAULT NULL,
  `last_command_message` text DEFAULT NULL,
  `setup_state` varchar(50) DEFAULT NULL,
  `setup_message` text DEFAULT NULL,
  `setup_completed_at` timestamp NULL DEFAULT NULL,
  `connection_type` enum('rj11_printer','usb','serial','network','integrated') NOT NULL DEFAULT 'rj11_printer' COMMENT 'How the drawer is connected',
  `device_path` varchar(255) DEFAULT NULL COMMENT 'COM port, USB path, IP address, or printer name',
  `printer_id` bigint(20) unsigned DEFAULT NULL COMMENT 'If RJ11, link to printer device',
  `esc_pos_command` varchar(50) NOT NULL DEFAULT '27,112,0,60,120' COMMENT 'ESC/POS command for drawer open',
  `voltage` enum('12V','24V') NOT NULL DEFAULT '12V' COMMENT 'Drawer solenoid voltage',
  `network_ip` varchar(45) DEFAULT NULL COMMENT 'IP address for network drawers',
  `network_port` int(11) DEFAULT 9100 COMMENT 'Port for network drawers',
  `serial_port` varchar(50) DEFAULT NULL COMMENT 'COM port for serial drawers',
  `serial_baud_rate` int(11) DEFAULT 9600 COMMENT 'Baud rate for serial connection',
  `usb_vendor_id` varchar(10) DEFAULT NULL COMMENT 'USB vendor ID',
  `usb_product_id` varchar(10) DEFAULT NULL COMMENT 'USB product ID',
  `connection_config` text DEFAULT NULL COMMENT 'JSON config for advanced settings',
  `status` tinyint(1) NOT NULL DEFAULT 1 COMMENT 'Enable/disable drawer',
  `auto_open_on_cash` tinyint(1) NOT NULL DEFAULT 1 COMMENT 'Auto-open when cash payment is processed',
  `test_on_save` tinyint(1) NOT NULL DEFAULT 1 COMMENT 'Test connection when saving configuration',
  `description` text DEFAULT NULL COMMENT 'Additional notes or description',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`drawer_id`),
  KEY `idx_location_id` (`location_id`),
  KEY `idx_pos_device_id` (`pos_device_id`),
  KEY `idx_connection_type` (`connection_type`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Cash drawer devices configuration';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_categories`
--

DROP TABLE IF EXISTS `ti_categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_categories` (
  `category_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(128) NOT NULL,
  `description` text DEFAULT NULL,
  `parent_id` int(11) DEFAULT NULL,
  `priority` int(11) NOT NULL DEFAULT 0,
  `status` tinyint(1) NOT NULL DEFAULT 1,
  `frontend_visible` tinyint(1) NOT NULL DEFAULT 1,
  `image` varchar(255) DEFAULT NULL,
  `nest_left` int(11) DEFAULT NULL,
  `nest_right` int(11) DEFAULT NULL,
  `permalink_slug` varchar(128) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`category_id`)
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_countries`
--

DROP TABLE IF EXISTS `ti_countries`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_countries` (
  `country_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `country_name` varchar(128) NOT NULL,
  `iso_code_2` varchar(2) DEFAULT NULL,
  `iso_code_3` varchar(3) DEFAULT NULL,
  `format` text DEFAULT NULL,
  `status` tinyint(1) NOT NULL DEFAULT 0,
  `priority` int(11) NOT NULL DEFAULT 999,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`country_id`)
) ENGINE=InnoDB AUTO_INCREMENT=240 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_currencies`
--

DROP TABLE IF EXISTS `ti_currencies`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_currencies` (
  `currency_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `country_id` int(11) NOT NULL,
  `currency_name` varchar(128) NOT NULL,
  `currency_code` varchar(3) NOT NULL,
  `currency_symbol` varchar(3) NOT NULL,
  `currency_rate` decimal(15,8) NOT NULL,
  `symbol_position` tinyint(1) DEFAULT NULL,
  `thousand_sign` char(1) NOT NULL,
  `decimal_sign` char(1) NOT NULL,
  `decimal_position` char(1) NOT NULL,
  `iso_alpha2` varchar(2) DEFAULT NULL,
  `iso_alpha3` varchar(3) DEFAULT NULL,
  `iso_numeric` int(11) DEFAULT NULL,
  `currency_status` int(11) DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL,
  PRIMARY KEY (`currency_id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_customer_groups`
--

DROP TABLE IF EXISTS `ti_customer_groups`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_customer_groups` (
  `customer_group_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `group_name` varchar(32) NOT NULL,
  `description` text DEFAULT NULL,
  `approval` tinyint(1) NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`customer_group_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_customers`
--

DROP TABLE IF EXISTS `ti_customers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_customers` (
  `customer_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `first_name` varchar(128) NOT NULL,
  `last_name` varchar(128) NOT NULL,
  `email` varchar(96) NOT NULL,
  `password` varchar(128) NOT NULL,
  `telephone` varchar(32) DEFAULT NULL,
  `address_id` int(11) DEFAULT NULL,
  `newsletter` tinyint(1) DEFAULT NULL,
  `customer_group_id` int(11) NOT NULL,
  `ip_address` varchar(40) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `status` tinyint(1) NOT NULL,
  `reset_code` varchar(128) DEFAULT NULL,
  `reset_time` datetime DEFAULT NULL,
  `activation_code` varchar(128) DEFAULT NULL,
  `remember_token` varchar(128) DEFAULT NULL,
  `is_activated` tinyint(1) DEFAULT NULL,
  `date_activated` datetime DEFAULT NULL,
  `last_login` datetime DEFAULT NULL,
  `last_seen` datetime DEFAULT NULL,
  `updated_at` timestamp NOT NULL,
  `last_location_area` text NOT NULL,
  PRIMARY KEY (`customer_id`),
  UNIQUE KEY `ti_customers_email_unique` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_extension_settings`
--

DROP TABLE IF EXISTS `ti_extension_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_extension_settings` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `item` varchar(128) NOT NULL,
  `data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`data`)),
  PRIMARY KEY (`id`),
  UNIQUE KEY `ti_extension_settings_item_unique` (`item`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_extensions`
--

DROP TABLE IF EXISTS `ti_extensions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_extensions` (
  `extension_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(128) NOT NULL,
  `version` varchar(32) DEFAULT '1.0.0',
  PRIMARY KEY (`extension_id`),
  UNIQUE KEY `ti_extensions_name_unique` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_failed_jobs`
--

DROP TABLE IF EXISTS `ti_failed_jobs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_failed_jobs` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `uuid` varchar(128) DEFAULT NULL,
  `connection` text NOT NULL,
  `queue` text NOT NULL,
  `payload` longtext NOT NULL,
  `exception` longtext NOT NULL,
  `failed_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `ti_failed_jobs_uuid_unique` (`uuid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_fiskaly_configs`
--

DROP TABLE IF EXISTS `ti_fiskaly_configs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_fiskaly_configs` (
  `fiskaly_config_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `location_id` int(10) unsigned NOT NULL DEFAULT 1,
  `provider` varchar(50) NOT NULL DEFAULT 'fiskaly',
  `environment` varchar(20) NOT NULL DEFAULT 'test',
  `api_key` varchar(255) DEFAULT NULL,
  `api_secret` varchar(255) DEFAULT NULL,
  `organization_id` varchar(100) DEFAULT NULL,
  `managed_organization_id` varchar(100) DEFAULT NULL,
  `tss_id` varchar(100) DEFAULT NULL,
  `client_id` varchar(100) DEFAULT NULL,
  `cash_register_id` varchar(100) DEFAULT NULL,
  `taxpayer_id` varchar(100) DEFAULT NULL,
  `establishment_id` varchar(100) DEFAULT NULL,
  `submission_id` varchar(100) DEFAULT NULL,
  `is_enabled` tinyint(1) NOT NULL DEFAULT 0,
  `last_error` text DEFAULT NULL,
  `meta` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`meta`)),
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`fiskaly_config_id`),
  UNIQUE KEY `uq_fiskaly_configs_location` (`location_id`),
  KEY `ti_fiskaly_configs_location_id_index` (`location_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_fiskaly_transactions`
--

DROP TABLE IF EXISTS `ti_fiskaly_transactions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_fiskaly_transactions` (
  `fiskaly_transaction_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `order_id` int(10) unsigned NOT NULL,
  `location_id` int(10) unsigned NOT NULL DEFAULT 1,
  `payment_method` varchar(50) DEFAULT NULL,
  `payment_reference` varchar(191) DEFAULT NULL,
  `tss_id` varchar(100) DEFAULT NULL,
  `client_id` varchar(100) DEFAULT NULL,
  `tx_id` varchar(100) DEFAULT NULL,
  `tx_revision` varchar(100) DEFAULT NULL,
  `tx_state` varchar(50) DEFAULT NULL,
  `tx_number` varchar(100) DEFAULT NULL,
  `signature_counter` varchar(100) DEFAULT NULL,
  `signature_algorithm` varchar(100) DEFAULT NULL,
  `signature_value` text DEFAULT NULL,
  `serial_number` varchar(191) DEFAULT NULL,
  `qr_code_data` text DEFAULT NULL,
  `amount_total` decimal(15,4) DEFAULT NULL,
  `currency` varchar(10) DEFAULT NULL,
  `started_at` timestamp NULL DEFAULT NULL,
  `finished_at` timestamp NULL DEFAULT NULL,
  `status` varchar(50) NOT NULL DEFAULT 'pending',
  `error_message` text DEFAULT NULL,
  `request_payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`request_payload`)),
  `response_payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`response_payload`)),
  `meta` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`meta`)),
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`fiskaly_transaction_id`),
  UNIQUE KEY `uq_fiskaly_transactions_order` (`order_id`),
  KEY `ti_fiskaly_transactions_order_id_index` (`order_id`),
  KEY `ti_fiskaly_transactions_location_id_index` (`location_id`),
  KEY `ti_fiskaly_transactions_payment_reference_index` (`payment_reference`),
  KEY `ti_fiskaly_transactions_tss_id_index` (`tss_id`),
  KEY `ti_fiskaly_transactions_client_id_index` (`client_id`),
  KEY `ti_fiskaly_transactions_tx_id_index` (`tx_id`),
  KEY `ti_fiskaly_transactions_status_index` (`status`)
) ENGINE=InnoDB AUTO_INCREMENT=772 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_general_staff_notes`
--

DROP TABLE IF EXISTS `ti_general_staff_notes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_general_staff_notes` (
  `note_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `staff_id` bigint(20) unsigned DEFAULT NULL,
  `note` text NOT NULL,
  `status` enum('active','archived') NOT NULL DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`note_id`),
  KEY `idx_staff_id` (`staff_id`),
  KEY `idx_status` (`status`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_igniter_automation_logs`
--

DROP TABLE IF EXISTS `ti_igniter_automation_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_igniter_automation_logs` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `automation_rule_id` bigint(20) unsigned DEFAULT NULL,
  `rule_action_id` bigint(20) unsigned DEFAULT NULL,
  `is_success` tinyint(1) NOT NULL,
  `message` text NOT NULL,
  `params` text DEFAULT NULL,
  `exception` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `ti_igniter_automation_logs_automation_rule_id_foreign` (`automation_rule_id`),
  KEY `ti_igniter_automation_logs_rule_action_id_foreign` (`rule_action_id`),
  CONSTRAINT `ti_igniter_automation_logs_automation_rule_id_foreign` FOREIGN KEY (`automation_rule_id`) REFERENCES `ti_igniter_automation_rules` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ti_igniter_automation_logs_rule_action_id_foreign` FOREIGN KEY (`rule_action_id`) REFERENCES `ti_igniter_automation_rule_actions` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_igniter_automation_rule_actions`
--

DROP TABLE IF EXISTS `ti_igniter_automation_rule_actions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_igniter_automation_rule_actions` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `automation_rule_id` bigint(20) unsigned DEFAULT NULL,
  `class_name` varchar(128) NOT NULL,
  `options` text NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `ti_igniter_actions_automation_rule_id_foreign` (`automation_rule_id`),
  CONSTRAINT `ti_igniter_actions_automation_rule_id_foreign` FOREIGN KEY (`automation_rule_id`) REFERENCES `ti_igniter_automation_rules` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_igniter_automation_rule_conditions`
--

DROP TABLE IF EXISTS `ti_igniter_automation_rule_conditions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_igniter_automation_rule_conditions` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `automation_rule_id` bigint(20) unsigned DEFAULT NULL,
  `class_name` varchar(128) NOT NULL,
  `options` text NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `ti_igniter_conditions_automation_rule_id_foreign` (`automation_rule_id`),
  CONSTRAINT `ti_igniter_conditions_automation_rule_id_foreign` FOREIGN KEY (`automation_rule_id`) REFERENCES `ti_igniter_automation_rules` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_igniter_automation_rules`
--

DROP TABLE IF EXISTS `ti_igniter_automation_rules`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_igniter_automation_rules` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(128) NOT NULL,
  `code` varchar(128) NOT NULL,
  `description` varchar(128) NOT NULL,
  `event_class` text DEFAULT NULL,
  `config_data` text DEFAULT NULL,
  `is_custom` tinyint(1) NOT NULL DEFAULT 0,
  `status` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_igniter_cart_cart`
--

DROP TABLE IF EXISTS `ti_igniter_cart_cart`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_igniter_cart_cart` (
  `identifier` varchar(128) NOT NULL,
  `instance` varchar(128) NOT NULL,
  `data` longtext NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`identifier`,`instance`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_igniter_coupon_categories`
--

DROP TABLE IF EXISTS `ti_igniter_coupon_categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_igniter_coupon_categories` (
  `coupon_id` int(10) unsigned NOT NULL,
  `category_id` int(10) unsigned NOT NULL,
  UNIQUE KEY `ti_igniter_coupon_categories_coupon_id_category_id_unique` (`coupon_id`,`category_id`),
  KEY `ti_igniter_coupon_categories_coupon_id_index` (`coupon_id`),
  KEY `ti_igniter_coupon_categories_category_id_index` (`category_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_igniter_coupon_customer_groups`
--

DROP TABLE IF EXISTS `ti_igniter_coupon_customer_groups`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_igniter_coupon_customer_groups` (
  `coupon_id` bigint(20) unsigned NOT NULL,
  `customer_group_id` bigint(20) unsigned NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_igniter_coupon_customers`
--

DROP TABLE IF EXISTS `ti_igniter_coupon_customers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_igniter_coupon_customers` (
  `coupon_id` bigint(20) unsigned NOT NULL,
  `customer_id` bigint(20) unsigned NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_igniter_coupon_menus`
--

DROP TABLE IF EXISTS `ti_igniter_coupon_menus`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_igniter_coupon_menus` (
  `coupon_id` int(10) unsigned NOT NULL,
  `menu_id` int(10) unsigned NOT NULL,
  UNIQUE KEY `ti_igniter_coupon_menus_coupon_id_menu_id_unique` (`coupon_id`,`menu_id`),
  KEY `ti_igniter_coupon_menus_coupon_id_index` (`coupon_id`),
  KEY `ti_igniter_coupon_menus_menu_id_index` (`menu_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_igniter_coupons`
--

DROP TABLE IF EXISTS `ti_igniter_coupons`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_igniter_coupons` (
  `coupon_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(128) NOT NULL,
  `code` varchar(128) NOT NULL,
  `type` char(1) NOT NULL,
  `discount` decimal(15,4) DEFAULT NULL,
  `min_total` decimal(15,4) DEFAULT NULL,
  `redemptions` int(11) NOT NULL DEFAULT 0,
  `customer_redemptions` int(11) NOT NULL DEFAULT 0,
  `description` text DEFAULT NULL,
  `status` tinyint(1) DEFAULT NULL,
  `created_at` date NOT NULL,
  `validity` char(15) DEFAULT NULL,
  `fixed_date` date DEFAULT NULL,
  `fixed_from_time` time DEFAULT NULL,
  `fixed_to_time` time DEFAULT NULL,
  `period_start_date` date DEFAULT NULL,
  `period_end_date` date DEFAULT NULL,
  `recurring_every` varchar(35) DEFAULT NULL,
  `recurring_from_time` time DEFAULT NULL,
  `recurring_to_time` time DEFAULT NULL,
  `order_restriction` text DEFAULT NULL,
  `apply_coupon_on` enum('whole_cart','menu_items','delivery_fee') NOT NULL DEFAULT 'whole_cart',
  `auto_apply` tinyint(1) NOT NULL DEFAULT 0,
  `updated_at` timestamp NOT NULL,
  PRIMARY KEY (`coupon_id`),
  UNIQUE KEY `code` (`code`),
  UNIQUE KEY `ti_igniter_coupons_code_unique` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_igniter_coupons_history`
--

DROP TABLE IF EXISTS `ti_igniter_coupons_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_igniter_coupons_history` (
  `coupon_history_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `coupon_id` bigint(20) unsigned NOT NULL,
  `order_id` bigint(20) unsigned DEFAULT NULL,
  `customer_id` bigint(20) unsigned DEFAULT NULL,
  `code` varchar(15) NOT NULL,
  `min_total` decimal(15,4) DEFAULT NULL,
  `amount` decimal(15,4) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `status` tinyint(1) NOT NULL,
  `updated_at` timestamp NOT NULL,
  PRIMARY KEY (`coupon_history_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_igniter_frontend_banners`
--

DROP TABLE IF EXISTS `ti_igniter_frontend_banners`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_igniter_frontend_banners` (
  `banner_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(128) NOT NULL,
  `type` char(8) NOT NULL,
  `click_url` varchar(128) DEFAULT NULL,
  `language_id` int(11) NOT NULL,
  `alt_text` varchar(128) DEFAULT NULL,
  `image_code` text DEFAULT NULL,
  `custom_code` text DEFAULT NULL,
  `status` tinyint(1) NOT NULL,
  PRIMARY KEY (`banner_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_igniter_frontend_sliders`
--

DROP TABLE IF EXISTS `ti_igniter_frontend_sliders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_igniter_frontend_sliders` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(128) NOT NULL,
  `code` varchar(128) NOT NULL,
  `metadata` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ti_igniter_frontend_sliders_code_unique` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_igniter_frontend_subscribers`
--

DROP TABLE IF EXISTS `ti_igniter_frontend_subscribers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_igniter_frontend_subscribers` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) DEFAULT NULL,
  `email` varchar(128) NOT NULL,
  `statistics` int(11) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_igniter_pages_menu_items`
--

DROP TABLE IF EXISTS `ti_igniter_pages_menu_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_igniter_pages_menu_items` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `menu_id` int(10) unsigned NOT NULL,
  `parent_id` int(10) unsigned DEFAULT NULL,
  `title` varchar(128) NOT NULL,
  `code` varchar(128) NOT NULL,
  `description` varchar(128) DEFAULT NULL,
  `type` varchar(128) NOT NULL,
  `url` varchar(128) DEFAULT NULL,
  `reference` varchar(128) DEFAULT NULL,
  `config` text DEFAULT NULL,
  `nest_left` int(11) DEFAULT NULL,
  `nest_right` int(11) DEFAULT NULL,
  `priority` int(11) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `ti_igniter_pages_menu_items_menu_id_index` (`menu_id`),
  KEY `ti_igniter_pages_menu_items_parent_id_index` (`parent_id`)
) ENGINE=InnoDB AUTO_INCREMENT=40 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_igniter_pages_menus`
--

DROP TABLE IF EXISTS `ti_igniter_pages_menus`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_igniter_pages_menus` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `theme_code` varchar(128) NOT NULL,
  `name` varchar(128) NOT NULL,
  `code` varchar(128) NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `ti_igniter_pages_menus_theme_code_index` (`theme_code`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_igniter_reviews`
--

DROP TABLE IF EXISTS `ti_igniter_reviews`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_igniter_reviews` (
  `review_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `customer_id` bigint(20) unsigned DEFAULT NULL,
  `sale_id` bigint(20) unsigned DEFAULT NULL,
  `sale_type` varchar(32) NOT NULL DEFAULT '',
  `author` varchar(128) DEFAULT NULL,
  `location_id` bigint(20) unsigned DEFAULT NULL,
  `quality` int(11) NOT NULL,
  `delivery` int(11) NOT NULL,
  `service` int(11) NOT NULL,
  `review_text` text DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `review_status` tinyint(1) NOT NULL,
  `updated_at` timestamp NOT NULL,
  PRIMARY KEY (`review_id`),
  KEY `ti_igniter_reviews_review_id_sale_type_sale_id_index` (`review_id`,`sale_type`,`sale_id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_igniter_socialite_providers`
--

DROP TABLE IF EXISTS `ti_igniter_socialite_providers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_igniter_socialite_providers` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int(10) unsigned DEFAULT NULL,
  `provider` varchar(255) DEFAULT NULL,
  `provider_id` varchar(255) DEFAULT NULL,
  `token` varchar(255) DEFAULT NULL,
  `user_type` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `provider_token_index` (`provider`,`token`),
  KEY `ti_igniter_socialite_providers_user_id_index` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_job_batches`
--

DROP TABLE IF EXISTS `ti_job_batches`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_job_batches` (
  `id` varchar(128) NOT NULL,
  `name` varchar(128) NOT NULL,
  `total_jobs` int(11) NOT NULL,
  `pending_jobs` int(11) NOT NULL,
  `failed_jobs` int(11) NOT NULL,
  `failed_job_ids` text NOT NULL,
  `options` mediumtext DEFAULT NULL,
  `cancelled_at` int(11) DEFAULT NULL,
  `created_at` int(11) NOT NULL,
  `finished_at` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_jobs`
--

DROP TABLE IF EXISTS `ti_jobs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_jobs` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `queue` varchar(128) NOT NULL,
  `payload` longtext NOT NULL,
  `attempts` tinyint(3) unsigned NOT NULL,
  `reserved_at` int(10) unsigned DEFAULT NULL,
  `available_at` int(10) unsigned NOT NULL,
  `created_at` int(10) unsigned NOT NULL,
  PRIMARY KEY (`id`),
  KEY `ti_jobs_queue_index` (`queue`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_kds_stations`
--

DROP TABLE IF EXISTS `ti_kds_stations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_kds_stations` (
  `station_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(128) NOT NULL,
  `slug` varchar(128) NOT NULL,
  `description` text DEFAULT NULL,
  `category_ids` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`category_ids`)),
  `status_ids` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`status_ids`)),
  `can_change_status` tinyint(1) NOT NULL DEFAULT 1,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `notification_sound` varchar(50) NOT NULL DEFAULT 'doorbell',
  `refresh_interval` int(11) NOT NULL DEFAULT 5,
  `theme_color` varchar(20) NOT NULL DEFAULT '#4CAF50',
  `location_id` int(10) unsigned DEFAULT NULL,
  `priority` int(11) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`station_id`),
  UNIQUE KEY `slug_unique` (`slug`),
  KEY `is_active_index` (`is_active`),
  KEY `location_id_index` (`location_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_language_translations`
--

DROP TABLE IF EXISTS `ti_language_translations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_language_translations` (
  `translation_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `locale` varchar(10) NOT NULL,
  `namespace` varchar(128) NOT NULL DEFAULT '*',
  `group` varchar(128) NOT NULL,
  `item` varchar(128) NOT NULL,
  `text` text NOT NULL,
  `unstable` tinyint(1) NOT NULL DEFAULT 0,
  `locked` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`translation_id`),
  UNIQUE KEY `ti_language_translations_locale_namespace_group_item_unique` (`locale`,`namespace`,`group`,`item`),
  KEY `ti_language_translations_group_index` (`group`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_languages`
--

DROP TABLE IF EXISTS `ti_languages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_languages` (
  `language_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `code` varchar(32) NOT NULL,
  `name` varchar(128) NOT NULL,
  `image` varchar(128) DEFAULT NULL,
  `idiom` varchar(128) NOT NULL,
  `status` tinyint(1) NOT NULL,
  `can_delete` tinyint(1) NOT NULL,
  `original_id` int(11) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `version` varchar(128) DEFAULT NULL,
  PRIMARY KEY (`language_id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_location_areas`
--

DROP TABLE IF EXISTS `ti_location_areas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_location_areas` (
  `area_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `location_id` int(11) NOT NULL,
  `name` varchar(128) NOT NULL,
  `type` varchar(32) NOT NULL,
  `boundaries` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`boundaries`)),
  `conditions` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`conditions`)),
  `color` varchar(40) DEFAULT NULL,
  `is_default` tinyint(1) NOT NULL DEFAULT 0,
  `priority` int(11) NOT NULL DEFAULT 0,
  PRIMARY KEY (`area_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_location_options`
--

DROP TABLE IF EXISTS `ti_location_options`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_location_options` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `location_id` bigint(20) unsigned NOT NULL,
  `item` varchar(128) NOT NULL,
  `value` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`value`)),
  PRIMARY KEY (`id`),
  UNIQUE KEY `ti_location_options_location_id_item_unique` (`location_id`,`item`)
) ENGINE=InnoDB AUTO_INCREMENT=142 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_locationables`
--

DROP TABLE IF EXISTS `ti_locationables`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_locationables` (
  `location_id` int(11) NOT NULL,
  `locationable_id` int(11) NOT NULL,
  `locationable_type` varchar(128) NOT NULL,
  `options` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_locations`
--

DROP TABLE IF EXISTS `ti_locations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_locations` (
  `location_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `location_name` varchar(128) NOT NULL,
  `location_email` varchar(96) NOT NULL,
  `description` text DEFAULT NULL,
  `location_address_1` varchar(128) DEFAULT NULL,
  `location_address_2` varchar(128) DEFAULT NULL,
  `location_city` varchar(128) DEFAULT NULL,
  `location_state` varchar(128) DEFAULT NULL,
  `location_postcode` varchar(10) DEFAULT NULL,
  `location_country_id` int(11) DEFAULT NULL,
  `location_telephone` text DEFAULT NULL,
  `location_lat` double DEFAULT NULL,
  `location_lng` double DEFAULT NULL,
  `location_radius` int(11) DEFAULT NULL,
  `location_status` tinyint(1) DEFAULT NULL,
  `permalink_slug` varchar(128) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`location_id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_logos`
--

DROP TABLE IF EXISTS `ti_logos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_logos` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `dashboard_logo` text DEFAULT NULL,
  `loader_logo` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_mail_layouts`
--

DROP TABLE IF EXISTS `ti_mail_layouts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_mail_layouts` (
  `layout_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(128) NOT NULL,
  `language_id` int(11) NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `status` tinyint(1) NOT NULL,
  `code` varchar(128) NOT NULL,
  `layout` text DEFAULT NULL,
  `plain_layout` text DEFAULT NULL,
  `layout_css` text DEFAULT NULL,
  `is_locked` tinyint(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (`layout_id`),
  UNIQUE KEY `ti_mail_layouts_code_unique` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_mail_partials`
--

DROP TABLE IF EXISTS `ti_mail_partials`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_mail_partials` (
  `partial_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(128) DEFAULT NULL,
  `code` varchar(128) DEFAULT NULL,
  `html` text DEFAULT NULL,
  `text` text DEFAULT NULL,
  `is_custom` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`partial_id`),
  UNIQUE KEY `ti_mail_partials_code_unique` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_mail_templates`
--

DROP TABLE IF EXISTS `ti_mail_templates`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_mail_templates` (
  `template_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `layout_id` int(11) NOT NULL,
  `code` varchar(128) NOT NULL,
  `subject` varchar(128) NOT NULL,
  `body` text NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `label` varchar(128) DEFAULT NULL,
  `is_custom` tinyint(1) DEFAULT NULL,
  `plain_body` text DEFAULT NULL,
  PRIMARY KEY (`template_id`),
  UNIQUE KEY `ti_mail_templates_data_template_id_code_unique` (`layout_id`,`code`)
) ENGINE=InnoDB AUTO_INCREMENT=19 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_mealtimes`
--

DROP TABLE IF EXISTS `ti_mealtimes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_mealtimes` (
  `mealtime_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `mealtime_name` varchar(128) NOT NULL,
  `start_time` time NOT NULL DEFAULT '00:00:00',
  `end_time` time NOT NULL DEFAULT '23:59:59',
  `mealtime_status` tinyint(1) NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`mealtime_id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_media_attachments`
--

DROP TABLE IF EXISTS `ti_media_attachments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_media_attachments` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `disk` varchar(128) NOT NULL,
  `name` varchar(128) NOT NULL,
  `file_name` varchar(128) NOT NULL,
  `mime_type` varchar(128) NOT NULL,
  `size` int(10) unsigned NOT NULL,
  `tag` varchar(128) DEFAULT NULL,
  `attachment_type` varchar(128) DEFAULT NULL,
  `attachment_id` bigint(20) unsigned DEFAULT NULL,
  `is_public` tinyint(1) NOT NULL DEFAULT 1,
  `custom_properties` text DEFAULT NULL,
  `priority` int(10) unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `ti_media_attachments_attachment_type_attachment_id_index` (`attachment_type`,`attachment_id`),
  KEY `ti_media_attachments_tag_index` (`tag`)
) ENGINE=InnoDB AUTO_INCREMENT=379 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_menu_categories`
--

DROP TABLE IF EXISTS `ti_menu_categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_menu_categories` (
  `menu_id` int(10) unsigned NOT NULL,
  `category_id` int(10) unsigned NOT NULL,
  UNIQUE KEY `ti_menu_categories_menu_id_category_id_unique` (`menu_id`,`category_id`),
  KEY `ti_menu_categories_menu_id_index` (`menu_id`),
  KEY `ti_menu_categories_category_id_index` (`category_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_menu_combo_items`
--

DROP TABLE IF EXISTS `ti_menu_combo_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_menu_combo_items` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `combo_id` bigint(20) unsigned NOT NULL,
  `menu_id` bigint(20) unsigned NOT NULL,
  `quantity` int(11) NOT NULL DEFAULT 1,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_combo_menu` (`combo_id`,`menu_id`),
  KEY `fk_combo_items_menu` (`menu_id`),
  CONSTRAINT `fk_combo_items_combo` FOREIGN KEY (`combo_id`) REFERENCES `ti_menu_combos` (`combo_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_combo_items_menu` FOREIGN KEY (`menu_id`) REFERENCES `ti_menus` (`menu_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=39 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_menu_combos`
--

DROP TABLE IF EXISTS `ti_menu_combos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_menu_combos` (
  `combo_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `combo_name` varchar(128) NOT NULL,
  `combo_description` text DEFAULT NULL,
  `combo_price` decimal(15,4) NOT NULL,
  `location_id` int(10) unsigned DEFAULT NULL,
  `combo_status` tinyint(1) NOT NULL DEFAULT 1,
  `combo_priority` int(11) NOT NULL DEFAULT 0,
  `thumb` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`combo_id`),
  KEY `idx_combo_status_priority` (`combo_status`,`combo_priority`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_menu_images`
--

DROP TABLE IF EXISTS `ti_menu_images`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_menu_images` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `menu_id` int(10) unsigned NOT NULL,
  `image_path` varchar(255) NOT NULL,
  `sort_order` int(10) unsigned NOT NULL DEFAULT 1,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `ti_menu_images_menu_id_sort_order_index` (`menu_id`,`sort_order`)
) ENGINE=InnoDB AUTO_INCREMENT=26 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_menu_item_option_values`
--

DROP TABLE IF EXISTS `ti_menu_item_option_values`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_menu_item_option_values` (
  `menu_option_value_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `menu_option_id` int(11) NOT NULL,
  `option_value_id` int(11) NOT NULL,
  `new_price` decimal(15,4) DEFAULT NULL,
  `priority` int(11) NOT NULL DEFAULT 0,
  `is_default` tinyint(1) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`menu_option_value_id`)
) ENGINE=InnoDB AUTO_INCREMENT=22 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_menu_item_options`
--

DROP TABLE IF EXISTS `ti_menu_item_options`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_menu_item_options` (
  `menu_option_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `option_id` int(11) NOT NULL,
  `menu_id` int(11) NOT NULL,
  `required` tinyint(1) NOT NULL DEFAULT 0,
  `priority` int(11) NOT NULL DEFAULT 0,
  `min_selected` int(11) NOT NULL DEFAULT 0,
  `max_selected` int(11) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`menu_option_id`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_menu_mealtimes`
--

DROP TABLE IF EXISTS `ti_menu_mealtimes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_menu_mealtimes` (
  `menu_id` int(10) unsigned NOT NULL,
  `mealtime_id` int(10) unsigned NOT NULL,
  UNIQUE KEY `ti_menu_mealtimes_menu_id_mealtime_id_unique` (`menu_id`,`mealtime_id`),
  KEY `ti_menu_mealtimes_menu_id_index` (`menu_id`),
  KEY `ti_menu_mealtimes_mealtime_id_index` (`mealtime_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_menu_option_values`
--

DROP TABLE IF EXISTS `ti_menu_option_values`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_menu_option_values` (
  `option_value_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `option_id` int(11) NOT NULL,
  `value` varchar(128) NOT NULL,
  `price` decimal(15,4) DEFAULT NULL,
  `priority` int(11) NOT NULL DEFAULT 0,
  PRIMARY KEY (`option_value_id`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_menu_options`
--

DROP TABLE IF EXISTS `ti_menu_options`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_menu_options` (
  `option_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `option_name` varchar(128) NOT NULL,
  `display_type` varchar(128) NOT NULL,
  `priority` int(11) NOT NULL DEFAULT 0,
  `update_related_menu_item` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`option_id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_menu_prices`
--

DROP TABLE IF EXISTS `ti_menu_prices`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_menu_prices` (
  `price_id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `menu_id` int(10) unsigned NOT NULL,
  `price_type` varchar(50) NOT NULL COMMENT 'default, bar, dining_room, room_service, happy_hour',
  `price` decimal(10,2) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `time_from` time DEFAULT NULL COMMENT 'Start time for time-based pricing',
  `time_to` time DEFAULT NULL COMMENT 'End time for time-based pricing',
  `days_of_week` varchar(20) DEFAULT NULL COMMENT 'Comma-separated: Mon,Tue,Wed or NULL for all days',
  `priority` int(11) NOT NULL DEFAULT 0 COMMENT 'Higher priority takes precedence',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`price_id`),
  KEY `idx_menu_id` (`menu_id`),
  KEY `idx_price_type_active` (`price_type`,`is_active`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_menus`
--

DROP TABLE IF EXISTS `ti_menus`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_menus` (
  `menu_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `menu_name` varchar(128) NOT NULL,
  `menu_description` text NOT NULL,
  `menu_price` decimal(15,4) NOT NULL,
  `minimum_qty` int(11) NOT NULL DEFAULT 0,
  `menu_status` tinyint(1) NOT NULL,
  `is_chef_recommended` tinyint(1) NOT NULL DEFAULT 0,
  `is_manual_bestseller` tinyint(1) NOT NULL DEFAULT 0,
  `bestseller_override_mode` varchar(20) NOT NULL DEFAULT 'auto',
  `prep_time_minutes` smallint(5) unsigned NOT NULL DEFAULT 15,
  `is_halal` tinyint(1) NOT NULL DEFAULT 0,
  `is_vegetarian` tinyint(1) NOT NULL DEFAULT 0,
  `is_vegan` tinyint(1) NOT NULL DEFAULT 0,
  `calories` int(11) DEFAULT NULL,
  `protein` decimal(8,2) DEFAULT NULL,
  `carbs` decimal(8,2) DEFAULT NULL,
  `fat` decimal(8,2) DEFAULT NULL,
  `sugar` decimal(8,2) DEFAULT NULL,
  `serving_size` varchar(120) DEFAULT NULL,
  `is_stock_out` tinyint(1) NOT NULL DEFAULT 0 COMMENT 'Flag to mark items as stock-out (visible but not orderable)',
  `menu_priority` int(11) NOT NULL DEFAULT 0,
  `order_restriction` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `color` varchar(40) DEFAULT NULL,
  PRIMARY KEY (`menu_id`),
  KEY `idx_is_stock_out` (`is_stock_out`)
) ENGINE=InnoDB AUTO_INCREMENT=167 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_menus_specials`
--

DROP TABLE IF EXISTS `ti_menus_specials`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_menus_specials` (
  `special_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `menu_id` int(11) NOT NULL DEFAULT 0,
  `start_date` datetime DEFAULT current_timestamp(),
  `end_date` datetime DEFAULT current_timestamp(),
  `special_price` decimal(15,4) DEFAULT NULL,
  `special_status` tinyint(1) NOT NULL,
  `type` varchar(128) NOT NULL,
  `validity` varchar(128) NOT NULL,
  `recurring_every` text DEFAULT NULL,
  `recurring_from` time DEFAULT NULL,
  `recurring_to` time DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`special_id`),
  UNIQUE KEY `ti_menus_specials_special_id_menu_id_unique` (`special_id`,`menu_id`)
) ENGINE=InnoDB AUTO_INCREMENT=75 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_migrations`
--

DROP TABLE IF EXISTS `ti_migrations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_migrations` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `group` varchar(128) NOT NULL,
  `migration` varchar(128) NOT NULL,
  `batch` int(11) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=122 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_notifications`
--

DROP TABLE IF EXISTS `ti_notifications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_notifications` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `type` varchar(50) NOT NULL,
  `title` varchar(255) NOT NULL,
  `table_id` varchar(50) DEFAULT NULL,
  `table_name` varchar(100) DEFAULT NULL,
  `payload` text DEFAULT NULL,
  `status` enum('new','seen','in_progress','resolved') DEFAULT 'new',
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_status_created` (`status`,`created_at` DESC),
  KEY `idx_type` (`type`),
  KEY `idx_table_id` (`table_id`)
) ENGINE=InnoDB AUTO_INCREMENT=1183 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_order_menu_options`
--

DROP TABLE IF EXISTS `ti_order_menu_options`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_order_menu_options` (
  `order_option_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `order_id` int(11) NOT NULL,
  `menu_id` int(11) NOT NULL,
  `order_option_name` varchar(128) NOT NULL,
  `order_option_price` decimal(15,4) DEFAULT NULL,
  `order_menu_id` int(11) NOT NULL,
  `order_menu_option_id` int(11) NOT NULL,
  `menu_option_value_id` int(11) NOT NULL,
  `quantity` int(11) DEFAULT 1,
  PRIMARY KEY (`order_option_id`)
) ENGINE=InnoDB AUTO_INCREMENT=313 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_order_menus`
--

DROP TABLE IF EXISTS `ti_order_menus`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_order_menus` (
  `order_menu_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `order_id` int(11) NOT NULL,
  `menu_id` int(11) NOT NULL,
  `name` varchar(128) NOT NULL,
  `quantity` int(11) NOT NULL,
  `price` decimal(15,4) DEFAULT NULL,
  `subtotal` decimal(15,4) DEFAULT NULL,
  `option_values` text DEFAULT NULL,
  `comment` text DEFAULT NULL,
  `is_combo` tinyint(1) DEFAULT 0 COMMENT 'Flag to identify combo meals',
  `combo_id` bigint(20) unsigned DEFAULT NULL COMMENT 'Reference to menu_combos.combo_id',
  `combo_items_description` text DEFAULT NULL COMMENT 'Description of combo items',
  PRIMARY KEY (`order_menu_id`),
  KEY `idx_combo_id` (`combo_id`)
) ENGINE=InnoDB AUTO_INCREMENT=4237 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_order_notes`
--

DROP TABLE IF EXISTS `ti_order_notes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_order_notes` (
  `note_id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `order_id` bigint(20) unsigned NOT NULL,
  `staff_id` bigint(20) unsigned DEFAULT NULL,
  `note` text NOT NULL,
  `status` enum('active','archived') DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`note_id`),
  KEY `idx_order_notes_order_status` (`order_id`,`status`),
  KEY `idx_order_notes_created` (`created_at`),
  CONSTRAINT `fk_order_notes_order` FOREIGN KEY (`order_id`) REFERENCES `ti_orders` (`order_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_order_payment_transaction_items`
--

DROP TABLE IF EXISTS `ti_order_payment_transaction_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_order_payment_transaction_items` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `transaction_id` bigint(20) unsigned NOT NULL,
  `order_menu_id` bigint(20) unsigned NOT NULL,
  `quantity_paid` decimal(15,4) NOT NULL DEFAULT 0.0000,
  `unit_price` decimal(15,4) NOT NULL DEFAULT 0.0000,
  `line_total` decimal(15,4) NOT NULL DEFAULT 0.0000,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `order_item_id` int(11) DEFAULT NULL,
  `menu_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `ti_order_payment_transaction_items_transaction_id_index` (`transaction_id`),
  KEY `ti_order_payment_transaction_items_order_menu_id_index` (`order_menu_id`),
  KEY `ti_order_payment_transaction_items_order_item_id_index` (`order_item_id`),
  KEY `ti_order_payment_transaction_items_menu_id_index` (`menu_id`)
) ENGINE=InnoDB AUTO_INCREMENT=221 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_order_payment_transactions`
--

DROP TABLE IF EXISTS `ti_order_payment_transactions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_order_payment_transactions` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `order_id` bigint(20) unsigned NOT NULL,
  `payment_method` varchar(50) DEFAULT NULL,
  `payment_reference` varchar(255) DEFAULT NULL,
  `amount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `settlement_status` varchar(20) NOT NULL DEFAULT 'paid',
  `payer_label` varchar(255) DEFAULT NULL,
  `invoice_id` bigint(20) unsigned DEFAULT NULL,
  `paid_at` datetime DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `ti_order_payment_transactions_order_id_index` (`order_id`)
) ENGINE=InnoDB AUTO_INCREMENT=57 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_order_totals`
--

DROP TABLE IF EXISTS `ti_order_totals`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_order_totals` (
  `order_total_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `order_id` int(10) unsigned NOT NULL,
  `code` varchar(128) NOT NULL,
  `title` varchar(128) NOT NULL,
  `value` decimal(15,4) NOT NULL,
  `priority` tinyint(1) NOT NULL DEFAULT 0,
  `is_summable` tinyint(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (`order_total_id`)
) ENGINE=InnoDB AUTO_INCREMENT=4991 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_orders`
--

DROP TABLE IF EXISTS `ti_orders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_orders` (
  `order_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `customer_id` int(11) DEFAULT NULL,
  `first_name` varchar(128) NOT NULL,
  `last_name` varchar(128) NOT NULL,
  `email` varchar(96) NOT NULL,
  `telephone` varchar(128) NOT NULL,
  `location_id` int(11) NOT NULL,
  `address_id` int(11) DEFAULT NULL,
  `cart` text NOT NULL,
  `total_items` int(11) NOT NULL,
  `comment` text DEFAULT NULL,
  `payment` varchar(128) NOT NULL,
  `stripe_payment_intent_id` varchar(255) DEFAULT NULL,
  `fiskaly_status` varchar(50) DEFAULT NULL,
  `fiskaly_transaction_id_ref` bigint(20) unsigned DEFAULT NULL,
  `fiskaly_qr_code_data` text DEFAULT NULL,
  `fiskaly_signature_counter` varchar(100) DEFAULT NULL,
  `fiskaly_tx_number` varchar(100) DEFAULT NULL,
  `fiskaly_serial_number` varchar(191) DEFAULT NULL,
  `order_type` varchar(128) NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `order_time` time NOT NULL,
  `order_date` date NOT NULL,
  `order_total` decimal(15,4) DEFAULT NULL,
  `estimated_prep_minutes` smallint(5) unsigned DEFAULT NULL,
  `status_id` int(11) NOT NULL,
  `ip_address` varchar(40) NOT NULL,
  `user_agent` varchar(128) NOT NULL,
  `assignee_id` int(11) DEFAULT NULL,
  `assignee_group_id` int(10) unsigned DEFAULT NULL,
  `invoice_prefix` varchar(128) DEFAULT NULL,
  `invoice_date` datetime DEFAULT NULL,
  `hash` varchar(40) DEFAULT NULL,
  `processed` tinyint(1) DEFAULT NULL,
  `status_updated_at` datetime DEFAULT NULL,
  `assignee_updated_at` datetime DEFAULT NULL,
  `order_time_is_asap` tinyint(1) NOT NULL DEFAULT 0,
  `delivery_comment` text DEFAULT NULL,
  `ms_order_type` varchar(255) NOT NULL DEFAULT '',
  `settlement_status` varchar(20) NOT NULL DEFAULT 'unpaid',
  `settled_amount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `settlement_method` varchar(50) DEFAULT NULL,
  `settlement_reference` varchar(255) DEFAULT NULL,
  `settled_at` datetime DEFAULT NULL,
  PRIMARY KEY (`order_id`),
  KEY `ti_orders_hash_index` (`hash`),
  KEY `idx_orders_stripe_payment_intent_id` (`stripe_payment_intent_id`),
  KEY `idx_orders_fiskaly_status` (`fiskaly_status`),
  KEY `idx_orders_fiskaly_transaction_id_ref` (`fiskaly_transaction_id_ref`),
  KEY `ti_orders_settlement_status_index` (`settlement_status`)
) ENGINE=InnoDB AUTO_INCREMENT=1637 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_pages`
--

DROP TABLE IF EXISTS `ti_pages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_pages` (
  `page_id` bigint(20) unsigned NOT NULL,
  `language_id` bigint(20) unsigned NOT NULL,
  `title` varchar(128) NOT NULL,
  `content` mediumtext NOT NULL,
  `meta_description` varchar(128) DEFAULT NULL,
  `meta_keywords` varchar(128) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `status` tinyint(1) NOT NULL,
  `permalink_slug` varchar(128) DEFAULT NULL,
  `layout` varchar(128) DEFAULT NULL,
  `metadata` mediumtext DEFAULT NULL,
  `priority` int(11) DEFAULT NULL,
  PRIMARY KEY (`page_id`),
  KEY `ti_pages_language_id_foreign` (`language_id`),
  CONSTRAINT `ti_pages_language_id_foreign` FOREIGN KEY (`language_id`) REFERENCES `ti_languages` (`language_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_payment_logs`
--

DROP TABLE IF EXISTS `ti_payment_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_payment_logs` (
  `payment_log_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `order_id` int(11) NOT NULL,
  `payment_name` varchar(128) NOT NULL,
  `message` varchar(128) NOT NULL,
  `request` text DEFAULT NULL,
  `response` text DEFAULT NULL,
  `is_success` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `payment_code` varchar(128) NOT NULL,
  `is_refundable` tinyint(1) NOT NULL DEFAULT 0,
  `refunded_at` datetime DEFAULT NULL,
  PRIMARY KEY (`payment_log_id`)
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_payment_profiles`
--

DROP TABLE IF EXISTS `ti_payment_profiles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_payment_profiles` (
  `payment_profile_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `customer_id` int(10) unsigned DEFAULT NULL,
  `payment_id` int(10) unsigned DEFAULT NULL,
  `card_brand` varchar(128) DEFAULT NULL,
  `card_last4` varchar(128) DEFAULT NULL,
  `profile_data` text DEFAULT NULL,
  `is_primary` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`payment_profile_id`),
  KEY `ti_payment_profiles_customer_id_index` (`customer_id`),
  KEY `ti_payment_profiles_payment_id_index` (`payment_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_payments`
--

DROP TABLE IF EXISTS `ti_payments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_payments` (
  `payment_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(128) NOT NULL,
  `code` varchar(128) NOT NULL,
  `class_name` text NOT NULL,
  `description` text DEFAULT NULL,
  `data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`data`)),
  `status` tinyint(1) NOT NULL DEFAULT 0,
  `is_default` tinyint(1) NOT NULL DEFAULT 0,
  `priority` int(11) NOT NULL DEFAULT 0,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`payment_id`),
  UNIQUE KEY `ti_payments_code_unique` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=19 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_pmd_table_order_drafts`
--

DROP TABLE IF EXISTS `ti_pmd_table_order_drafts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_pmd_table_order_drafts` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `table_id` varchar(64) DEFAULT NULL,
  `table_no` varchar(64) DEFAULT NULL,
  `table_name` varchar(191) DEFAULT NULL,
  `qr` varchar(191) DEFAULT NULL,
  `status` varchar(32) NOT NULL DEFAULT 'draft',
  `order_id` int(10) unsigned DEFAULT NULL,
  `payload` longtext DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `ti_pmd_table_order_drafts_table_id_index` (`table_id`),
  KEY `ti_pmd_table_order_drafts_table_no_index` (`table_no`),
  KEY `ti_pmd_table_order_drafts_qr_index` (`qr`),
  KEY `ti_pmd_table_order_drafts_status_index` (`status`),
  KEY `ti_pmd_table_order_drafts_order_id_index` (`order_id`)
) ENGINE=InnoDB AUTO_INCREMENT=380 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_pos_config_device`
--

DROP TABLE IF EXISTS `ti_pos_config_device`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_pos_config_device` (
  `config_id` int(11) NOT NULL,
  `device_id` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_pos_configs`
--

DROP TABLE IF EXISTS `ti_pos_configs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_pos_configs` (
  `config_id` int(11) NOT NULL AUTO_INCREMENT,
  `device_id` int(11) NOT NULL,
  `url` varchar(255) NOT NULL,
  `access_token` text DEFAULT NULL,
  `id_application` varchar(255) NOT NULL,
  `username` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `exists_webhook` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`config_id`)
) ENGINE=InnoDB AUTO_INCREMENT=22 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_pos_devices`
--

DROP TABLE IF EXISTS `ti_pos_devices`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_pos_devices` (
  `device_id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `code` varchar(255) NOT NULL,
  `device_code` varchar(191) DEFAULT NULL,
  `pairing_token` varchar(191) DEFAULT NULL,
  `last_seen_at` timestamp NULL DEFAULT NULL,
  `agent_version` varchar(50) DEFAULT NULL,
  `last_ip` varchar(64) DEFAULT NULL,
  `device_type` varchar(255) NOT NULL,
  `is_local_terminal` tinyint(1) NOT NULL DEFAULT 0,
  `description` text NOT NULL,
  `image` varchar(255) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT NULL,
  `device_status` varchar(50) NOT NULL DEFAULT 'offline',
  PRIMARY KEY (`device_id`)
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_pos_hardware_commands`
--

DROP TABLE IF EXISTS `ti_pos_hardware_commands`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_pos_hardware_commands` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `drawer_id` int(10) unsigned NOT NULL,
  `pos_device_id` int(10) unsigned DEFAULT NULL,
  `location_id` int(10) unsigned DEFAULT NULL,
  `command_type` varchar(100) NOT NULL,
  `payload` longtext DEFAULT NULL,
  `status` varchar(50) NOT NULL DEFAULT 'pending',
  `message` text DEFAULT NULL,
  `queued_at` timestamp NULL DEFAULT NULL,
  `processed_at` timestamp NULL DEFAULT NULL,
  `acknowledged_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `ti_pos_hardware_commands_status_idx` (`status`),
  KEY `ti_pos_hardware_commands_pos_device_id_idx` (`pos_device_id`),
  KEY `ti_pos_hardware_commands_drawer_id_idx` (`drawer_id`),
  KEY `ti_pos_hardware_commands_queued_at_idx` (`queued_at`)
) ENGINE=InnoDB AUTO_INCREMENT=119 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_pos_order_import_items`
--

DROP TABLE IF EXISTS `ti_pos_order_import_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_pos_order_import_items` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `import_id` bigint(20) unsigned NOT NULL,
  `source_line_id` varchar(64) DEFAULT NULL,
  `product_id_external` varchar(64) DEFAULT NULL,
  `product_name` varchar(255) DEFAULT NULL,
  `quantity` decimal(15,4) NOT NULL DEFAULT 0.0000,
  `unit_gross` decimal(15,4) NOT NULL DEFAULT 0.0000,
  `unit_net` decimal(15,4) NOT NULL DEFAULT 0.0000,
  `line_gross` decimal(15,4) NOT NULL DEFAULT 0.0000,
  `line_net` decimal(15,4) NOT NULL DEFAULT 0.0000,
  `vat_amount` decimal(15,4) NOT NULL DEFAULT 0.0000,
  `vat_rate` decimal(15,4) NOT NULL DEFAULT 0.0000,
  `raw_json` longtext DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `source_key` varchar(255) NOT NULL,
  `external_order_id` varchar(64) DEFAULT NULL,
  `external_product_id` varchar(64) DEFAULT NULL,
  `external_product_name` varchar(255) DEFAULT NULL,
  `price_gross` decimal(15,4) DEFAULT 0.0000,
  `price_net` decimal(15,4) DEFAULT 0.0000,
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_import_id` (`import_id`),
  KEY `idx_source_key` (`source_key`),
  CONSTRAINT `fk_ti_pos_order_import_items_import_id` FOREIGN KEY (`import_id`) REFERENCES `ti_pos_order_imports` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=908 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_pos_order_imports`
--

DROP TABLE IF EXISTS `ti_pos_order_imports`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_pos_order_imports` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `provider` varchar(50) NOT NULL,
  `source_key` varchar(255) NOT NULL,
  `source_order_number` varchar(50) DEFAULT NULL,
  `source_table_id` varchar(50) DEFAULT NULL,
  `source_created_at` datetime DEFAULT NULL,
  `source_payload` longtext DEFAULT NULL,
  `local_order_id` bigint(20) unsigned DEFAULT NULL,
  `import_status` varchar(20) NOT NULL DEFAULT 'pending',
  `import_message` text DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `external_order_number` varchar(64) DEFAULT NULL,
  `external_table_id` varchar(64) DEFAULT NULL,
  `external_order_group` varchar(64) DEFAULT NULL,
  `external_created_at` datetime DEFAULT NULL,
  `total_gross` decimal(15,4) DEFAULT 0.0000,
  `total_net` decimal(15,4) DEFAULT 0.0000,
  `total_vat` decimal(15,4) DEFAULT 0.0000,
  `lines_count` int(11) NOT NULL DEFAULT 0,
  `payload_json` longtext DEFAULT NULL,
  `error_message` text DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_source_key` (`source_key`),
  KEY `idx_status` (`import_status`),
  KEY `idx_local_order_id` (`local_order_id`)
) ENGINE=InnoDB AUTO_INCREMENT=141 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_pos_order_state`
--

DROP TABLE IF EXISTS `ti_pos_order_state`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_pos_order_state` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `provider` varchar(64) NOT NULL DEFAULT 'ready2order',
  `source_key` varchar(255) NOT NULL,
  `external_order_number` varchar(64) DEFAULT NULL,
  `external_table_id` varchar(64) DEFAULT NULL,
  `external_order_group` varchar(64) DEFAULT NULL,
  `external_created_at` datetime DEFAULT NULL,
  `state_hash` varchar(64) NOT NULL,
  `total_gross` decimal(15,4) NOT NULL DEFAULT 0.0000,
  `total_net` decimal(15,4) NOT NULL DEFAULT 0.0000,
  `total_vat` decimal(15,4) NOT NULL DEFAULT 0.0000,
  `items_count` int(11) NOT NULL DEFAULT 0,
  `raw_json` longtext DEFAULT NULL,
  `first_seen_at` timestamp NULL DEFAULT current_timestamp(),
  `last_seen_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_provider_source_key` (`provider`,`source_key`),
  KEY `idx_external_order_number` (`external_order_number`),
  KEY `idx_external_table_id` (`external_table_id`),
  KEY `idx_state_hash` (`state_hash`)
) ENGINE=InnoDB AUTO_INCREMENT=2460 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_pos_product_mappings`
--

DROP TABLE IF EXISTS `ti_pos_product_mappings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_pos_product_mappings` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `provider` varchar(64) NOT NULL,
  `external_product_id` varchar(64) NOT NULL,
  `external_product_name` varchar(255) DEFAULT NULL,
  `local_menu_id` bigint(20) unsigned NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_provider_external_product` (`provider`,`external_product_id`),
  KEY `idx_local_menu_id` (`local_menu_id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_pos_table_mappings`
--

DROP TABLE IF EXISTS `ti_pos_table_mappings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_pos_table_mappings` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `external_table_id` varchar(64) DEFAULT NULL,
  `external_table_name` varchar(255) DEFAULT NULL,
  `external_area` varchar(255) DEFAULT NULL,
  `local_table_id` bigint(20) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=85 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_qr_code`
--

DROP TABLE IF EXISTS `ti_qr_code`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_qr_code` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `qr_code` varchar(30) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_request_logs`
--

DROP TABLE IF EXISTS `ti_request_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_request_logs` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `url` varchar(128) DEFAULT NULL,
  `status_code` int(11) DEFAULT NULL,
  `referrer` text DEFAULT NULL,
  `count` int(11) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=672 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_reservation_tables`
--

DROP TABLE IF EXISTS `ti_reservation_tables`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_reservation_tables` (
  `reservation_id` int(10) unsigned NOT NULL,
  `table_id` int(10) unsigned NOT NULL,
  UNIQUE KEY `ti_reservation_tables_reservation_id_table_id_unique` (`reservation_id`,`table_id`),
  KEY `ti_reservation_tables_reservation_id_index` (`reservation_id`),
  KEY `ti_reservation_tables_table_id_index` (`table_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_reservations`
--

DROP TABLE IF EXISTS `ti_reservations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_reservations` (
  `reservation_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `location_id` int(11) NOT NULL,
  `table_id` int(11) NOT NULL,
  `guest_num` int(11) NOT NULL,
  `occasion_id` int(11) DEFAULT NULL,
  `customer_id` int(11) DEFAULT NULL,
  `first_name` varchar(128) NOT NULL,
  `last_name` varchar(128) NOT NULL,
  `email` varchar(96) NOT NULL,
  `telephone` varchar(128) NOT NULL,
  `comment` text DEFAULT NULL,
  `reserve_time` time NOT NULL,
  `reserve_date` date NOT NULL,
  `created_at` date NOT NULL,
  `updated_at` date NOT NULL,
  `assignee_id` int(11) DEFAULT NULL,
  `assignee_group_id` int(10) unsigned DEFAULT NULL,
  `notify` tinyint(1) DEFAULT NULL,
  `ip_address` varchar(40) NOT NULL,
  `user_agent` varchar(128) NOT NULL,
  `status_id` tinyint(1) NOT NULL,
  `hash` varchar(40) DEFAULT NULL,
  `duration` int(11) DEFAULT NULL,
  `processed` tinyint(1) DEFAULT NULL,
  `status_updated_at` datetime DEFAULT NULL,
  `assignee_updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`reservation_id`),
  KEY `ti_reservations_location_id_table_id_index` (`location_id`,`table_id`),
  KEY `ti_reservations_hash_index` (`hash`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_reviews`
--

DROP TABLE IF EXISTS `ti_reviews`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_reviews` (
  `review_id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `customer_id` int(10) unsigned DEFAULT NULL,
  `sale_id` int(10) unsigned DEFAULT NULL,
  `sale_type` varchar(128) DEFAULT NULL,
  `location_id` int(10) unsigned DEFAULT NULL,
  `tenant_host` varchar(128) DEFAULT NULL,
  `author` varchar(128) DEFAULT NULL,
  `quality` tinyint(3) unsigned NOT NULL DEFAULT 0,
  `service` tinyint(3) unsigned NOT NULL DEFAULT 0,
  `delivery` tinyint(3) unsigned NOT NULL DEFAULT 0,
  `review_text` text DEFAULT NULL,
  `review_status` tinyint(1) NOT NULL DEFAULT 0,
  `public_share_consent` tinyint(1) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`review_id`),
  KEY `ti_reviews_customer_id_index` (`customer_id`),
  KEY `ti_reviews_sale_id_index` (`sale_id`),
  KEY `ti_reviews_sale_type_index` (`sale_type`),
  KEY `ti_reviews_location_id_index` (`location_id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_sessions`
--

DROP TABLE IF EXISTS `ti_sessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_sessions` (
  `id` varchar(128) NOT NULL,
  `payload` text DEFAULT NULL,
  `last_activity` int(11) DEFAULT NULL,
  UNIQUE KEY `ti_sessions_id_unique` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_settings`
--

DROP TABLE IF EXISTS `ti_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_settings` (
  `setting_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `sort` varchar(45) NOT NULL,
  `item` varchar(128) NOT NULL,
  `value` text DEFAULT NULL,
  `serialized` tinyint(1) DEFAULT NULL,
  PRIMARY KEY (`setting_id`),
  UNIQUE KEY `ti_settings_sort_item_unique` (`sort`,`item`)
) ENGINE=InnoDB AUTO_INCREMENT=427 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`paymydine`@`localhost`*/ /*!50003 TRIGGER `pmd_logo_settings_guard_bi`
BEFORE INSERT ON `ti_settings`
FOR EACH ROW
BEGIN
    IF NEW.item IN ('site_logo','dashboard_logo','invoice_logo','restaurant_logo')
       AND LOWER(TRIM(COALESCE(NEW.value, ''))) IN ('images.png','/images.png','images.jpeg','/images.jpeg','image.png','/image.png','image.jpeg','/image.jpeg','placeholder.svg','/placeholder.svg','no-image.png','/no-image.png')
    THEN
        SET NEW.value = '/Gemini_Generated_Image_kzcmghkzcmghkzcm-removebg-preview.png';
        SET NEW.serialized = 0;
    END IF;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`paymydine`@`localhost`*/ /*!50003 TRIGGER `pmd_identity_settings_guard_bu`
BEFORE UPDATE ON `ti_settings`
FOR EACH ROW
BEGIN
    IF NEW.item = 'site_name'
       AND LOWER(TRIM(COALESCE(NEW.value, ''))) IN ('', 'tastyigniter', 'paymydine')
       AND LOWER(TRIM(COALESCE(OLD.value, ''))) NOT IN ('', 'tastyigniter', 'paymydine')
    THEN
        SET NEW.value = OLD.value;
        SET NEW.serialized = OLD.serialized;
    END IF;

    IF NEW.item = 'site_email'
       AND LOWER(TRIM(COALESCE(NEW.value, ''))) IN ('', 'admin@domain.tld', 'admin@example.com')
       AND LOWER(TRIM(COALESCE(OLD.value, ''))) NOT IN ('', 'admin@domain.tld', 'admin@example.com')
    THEN
        SET NEW.value = OLD.value;
        SET NEW.serialized = OLD.serialized;
    END IF;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`paymydine`@`localhost`*/ /*!50003 TRIGGER `pmd_logo_settings_guard_bu`
BEFORE UPDATE ON `ti_settings`
FOR EACH ROW
BEGIN
    IF NEW.item IN ('site_logo','dashboard_logo','invoice_logo','restaurant_logo')
       AND LOWER(TRIM(COALESCE(NEW.value, ''))) IN ('images.png','/images.png','images.jpeg','/images.jpeg','image.png','/image.png','image.jpeg','/image.jpeg','placeholder.svg','/placeholder.svg','no-image.png','/no-image.png')
    THEN
        IF LOWER(TRIM(COALESCE(OLD.value, ''))) NOT IN ('images.png','/images.png','images.jpeg','/images.jpeg','image.png','/image.png','image.jpeg','/image.jpeg','placeholder.svg','/placeholder.svg','no-image.png','/no-image.png')
           AND TRIM(COALESCE(OLD.value, '')) <> ''
        THEN
            SET NEW.value = OLD.value;
            SET NEW.serialized = OLD.serialized;
        ELSE
            SET NEW.value = '/Gemini_Generated_Image_kzcmghkzcmghkzcm-removebg-preview.png';
            SET NEW.serialized = 0;
        END IF;
    END IF;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Table structure for table `ti_staff_groups`
--

DROP TABLE IF EXISTS `ti_staff_groups`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_staff_groups` (
  `staff_group_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `staff_group_name` varchar(32) NOT NULL,
  `description` text NOT NULL,
  `auto_assign` tinyint(1) DEFAULT 0,
  `auto_assign_mode` tinyint(4) DEFAULT 1,
  `auto_assign_limit` int(11) DEFAULT 20,
  `auto_assign_availability` tinyint(1) DEFAULT 1,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`staff_group_id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_staff_roles`
--

DROP TABLE IF EXISTS `ti_staff_roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_staff_roles` (
  `staff_role_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(128) NOT NULL,
  `code` varchar(128) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `permissions` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`staff_role_id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_staffs`
--

DROP TABLE IF EXISTS `ti_staffs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_staffs` (
  `staff_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `staff_name` varchar(128) NOT NULL,
  `staff_email` varchar(96) NOT NULL,
  `card_id` varchar(255) DEFAULT NULL,
  `rfid_card_uid` varchar(100) DEFAULT NULL,
  `fingerprint_template` text DEFAULT NULL,
  `face_template` text DEFAULT NULL,
  `pin_code` varchar(255) DEFAULT NULL,
  `biometric_enabled` tinyint(1) NOT NULL DEFAULT 0,
  `enrollment_status` enum('not_enrolled','enrolled','pending','failed') NOT NULL DEFAULT 'not_enrolled',
  `enrolled_at` timestamp NULL DEFAULT NULL,
  `enrolled_by` bigint(20) unsigned DEFAULT NULL,
  `enrolled_devices` longtext DEFAULT NULL,
  `staff_role_id` int(11) NOT NULL,
  `language_id` int(11) DEFAULT NULL,
  `created_at` date NOT NULL,
  `staff_status` tinyint(1) NOT NULL,
  `sale_permission` tinyint(4) DEFAULT 1,
  `updated_at` timestamp NOT NULL,
  PRIMARY KEY (`staff_id`),
  UNIQUE KEY `staff_email` (`staff_email`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_staffs_groups`
--

DROP TABLE IF EXISTS `ti_staffs_groups`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_staffs_groups` (
  `staff_id` int(10) unsigned NOT NULL,
  `staff_group_id` int(10) unsigned NOT NULL,
  PRIMARY KEY (`staff_id`,`staff_group_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_status_history`
--

DROP TABLE IF EXISTS `ti_status_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_status_history` (
  `status_history_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `object_id` int(11) NOT NULL,
  `object_type` varchar(128) NOT NULL,
  `staff_id` int(11) DEFAULT NULL,
  `status_id` int(11) NOT NULL,
  `notify` tinyint(1) DEFAULT NULL,
  `comment` text DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` timestamp NOT NULL,
  PRIMARY KEY (`status_history_id`)
) ENGINE=InnoDB AUTO_INCREMENT=494 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_statuses`
--

DROP TABLE IF EXISTS `ti_statuses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_statuses` (
  `status_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `status_name` varchar(128) NOT NULL,
  `status_comment` text DEFAULT NULL,
  `notify_customer` tinyint(1) DEFAULT NULL,
  `status_for` varchar(128) NOT NULL,
  `status_color` varchar(128) NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`status_id`)
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_stock_history`
--

DROP TABLE IF EXISTS `ti_stock_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_stock_history` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `stock_id` bigint(20) unsigned NOT NULL,
  `staff_id` bigint(20) unsigned DEFAULT NULL,
  `order_id` bigint(20) unsigned DEFAULT NULL,
  `state` varchar(128) NOT NULL,
  `quantity` bigint(20) NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `ti_stock_history_stock_id_foreign` (`stock_id`),
  KEY `ti_stock_history_order_id_foreign` (`order_id`),
  CONSTRAINT `ti_stock_history_order_id_foreign` FOREIGN KEY (`order_id`) REFERENCES `ti_orders` (`order_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ti_stock_history_stock_id_foreign` FOREIGN KEY (`stock_id`) REFERENCES `ti_stocks` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_stocks`
--

DROP TABLE IF EXISTS `ti_stocks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_stocks` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `location_id` bigint(20) unsigned NOT NULL,
  `stockable_id` bigint(20) unsigned NOT NULL,
  `stockable_type` varchar(128) NOT NULL,
  `quantity` bigint(20) DEFAULT NULL,
  `low_stock_alert` tinyint(1) NOT NULL DEFAULT 0,
  `low_stock_threshold` int(11) NOT NULL DEFAULT 0,
  `is_tracked` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `low_stock_alert_sent` tinyint(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_tables`
--

DROP TABLE IF EXISTS `ti_tables`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_tables` (
  `table_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `location_id` int(11) DEFAULT 1,
  `table_no` bigint(20) DEFAULT NULL,
  `table_name` varchar(128) NOT NULL,
  `pos_table_label` varchar(100) DEFAULT NULL,
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
) ENGINE=InnoDB AUTO_INCREMENT=326 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_themes`
--

DROP TABLE IF EXISTS `ti_themes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_themes` (
  `theme_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(128) NOT NULL,
  `code` varchar(128) NOT NULL,
  `description` text DEFAULT NULL,
  `version` varchar(128) DEFAULT '0.0.1',
  `data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`data`)),
  `status` tinyint(1) NOT NULL DEFAULT 0,
  `is_default` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`theme_id`),
  UNIQUE KEY `ti_themes_code_unique` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_ti_menus`
--

DROP TABLE IF EXISTS `ti_ti_menus`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_ti_menus` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(128) NOT NULL,
  `menu_status` tinyint(4) NOT NULL DEFAULT 0,
  `is_halal` tinyint(1) NOT NULL DEFAULT 0,
  `is_vegetarian` tinyint(1) NOT NULL DEFAULT 0,
  `is_vegan` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_tips_shifts`
--

DROP TABLE IF EXISTS `ti_tips_shifts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_tips_shifts` (
  `shift_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `shift_date` date NOT NULL,
  `location_id` int(10) unsigned DEFAULT NULL,
  `description` text DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`shift_id`),
  UNIQUE KEY `unique_shift_date_location` (`shift_date`,`location_id`),
  KEY `idx_shift_date_location` (`shift_date`,`location_id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_user_preferences`
--

DROP TABLE IF EXISTS `ti_user_preferences`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_user_preferences` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `item` varchar(128) NOT NULL,
  `value` text NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_users`
--

DROP TABLE IF EXISTS `ti_users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_users` (
  `user_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `staff_id` int(11) NOT NULL,
  `username` varchar(32) NOT NULL,
  `password` varchar(128) NOT NULL,
  `super_user` tinyint(1) DEFAULT NULL,
  `reset_code` varchar(128) DEFAULT NULL,
  `reset_time` datetime DEFAULT NULL,
  `activation_code` varchar(128) DEFAULT NULL,
  `remember_token` varchar(128) DEFAULT NULL,
  `is_activated` tinyint(1) DEFAULT NULL,
  `date_activated` datetime DEFAULT NULL,
  `last_login` datetime DEFAULT NULL,
  `last_seen` datetime DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `ti_users_staff_id_unique` (`staff_id`),
  UNIQUE KEY `ti_users_username_unique` (`username`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_websockets_statistics_entries`
--

DROP TABLE IF EXISTS `ti_websockets_statistics_entries`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_websockets_statistics_entries` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `app_id` varchar(128) NOT NULL,
  `peak_connection_count` int(11) NOT NULL,
  `websocket_message_count` int(11) NOT NULL,
  `api_message_count` int(11) NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_working_hours`
--

DROP TABLE IF EXISTS `ti_working_hours`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_working_hours` (
  `location_id` int(11) NOT NULL,
  `weekday` int(11) NOT NULL,
  `opening_time` time NOT NULL DEFAULT '00:00:00',
  `closing_time` time NOT NULL DEFAULT '00:00:00',
  `status` tinyint(1) NOT NULL,
  `type` varchar(32) NOT NULL,
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  PRIMARY KEY (`id`),
  KEY `ti_working_hours_location_id_weekday_type_index` (`location_id`,`weekday`,`type`)
) ENGINE=InnoDB AUTO_INCREMENT=22 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping events for database 'mimoza'
--

--
-- Dumping routines for database 'mimoza'
--
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-06-09 23:50:19

-- ============================================================
-- DATABASE: rosana
-- ============================================================

/*M!999999\- enable the sandbox mode */ 
-- MariaDB dump 10.19  Distrib 10.11.13-MariaDB, for debian-linux-gnu (x86_64)
--
-- Host: 127.0.0.1    Database: rosana
-- ------------------------------------------------------
-- Server version	10.11.13-MariaDB-0ubuntu0.24.04.1

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Current Database: `rosana`
--

CREATE DATABASE /*!32312 IF NOT EXISTS*/ `rosana` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci */;

USE `rosana`;

--
-- Table structure for table `allergens`
--

DROP TABLE IF EXISTS `allergens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `allergens` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `status` tinyint(1) DEFAULT 1,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `igniter_coupon_categories`
--

DROP TABLE IF EXISTS `igniter_coupon_categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `igniter_coupon_categories` (
  `coupon_id` int(10) unsigned NOT NULL,
  `category_id` int(10) unsigned NOT NULL,
  PRIMARY KEY (`coupon_id`,`category_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `igniter_coupon_customer_groups`
--

DROP TABLE IF EXISTS `igniter_coupon_customer_groups`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `igniter_coupon_customer_groups` (
  `coupon_id` int(10) unsigned NOT NULL,
  `customer_group_id` int(10) unsigned NOT NULL,
  PRIMARY KEY (`coupon_id`,`customer_group_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `igniter_coupon_customers`
--

DROP TABLE IF EXISTS `igniter_coupon_customers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `igniter_coupon_customers` (
  `coupon_id` int(10) unsigned NOT NULL,
  `customer_id` int(10) unsigned NOT NULL,
  PRIMARY KEY (`coupon_id`,`customer_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `igniter_coupon_menus`
--

DROP TABLE IF EXISTS `igniter_coupon_menus`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `igniter_coupon_menus` (
  `coupon_id` int(10) unsigned NOT NULL,
  `menu_id` int(10) unsigned NOT NULL,
  PRIMARY KEY (`coupon_id`,`menu_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `igniter_coupons`
--

DROP TABLE IF EXISTS `igniter_coupons`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `igniter_coupons` (
  `coupon_id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `code` varchar(32) NOT NULL,
  `name` varchar(128) NOT NULL,
  `description` text DEFAULT NULL,
  `type` varchar(32) NOT NULL DEFAULT 'F',
  `discount` decimal(15,4) NOT NULL DEFAULT 0.0000,
  `min_total` decimal(15,4) DEFAULT NULL,
  `redemptions` int(10) unsigned DEFAULT NULL,
  `customer_redemptions` int(10) unsigned DEFAULT NULL,
  `status` tinyint(1) NOT NULL DEFAULT 1,
  `period_start_date` datetime DEFAULT NULL,
  `period_end_date` datetime DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`coupon_id`),
  UNIQUE KEY `code` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `igniter_coupons_history`
--

DROP TABLE IF EXISTS `igniter_coupons_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `igniter_coupons_history` (
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `qr_code`
--

DROP TABLE IF EXISTS `qr_code`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `qr_code` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `qr_code` varchar(30) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_activities`
--

DROP TABLE IF EXISTS `ti_activities`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_activities` (
  `activity_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int(11) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `log_name` varchar(128) DEFAULT NULL,
  `properties` text DEFAULT NULL,
  `subject_id` int(11) DEFAULT NULL,
  `subject_type` varchar(128) DEFAULT NULL,
  `causer_id` int(11) DEFAULT NULL,
  `causer_type` varchar(128) DEFAULT NULL,
  `updated_at` datetime NOT NULL,
  `type` varchar(128) DEFAULT NULL,
  `read_at` datetime DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `user_type` varchar(128) DEFAULT NULL,
  PRIMARY KEY (`activity_id`)
) ENGINE=InnoDB AUTO_INCREMENT=216 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_addresses`
--

DROP TABLE IF EXISTS `ti_addresses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_addresses` (
  `address_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `customer_id` int(11) DEFAULT NULL,
  `address_1` varchar(128) NOT NULL,
  `address_2` varchar(128) DEFAULT NULL,
  `city` varchar(128) DEFAULT NULL,
  `state` varchar(128) DEFAULT NULL,
  `postcode` varchar(128) DEFAULT NULL,
  `country_id` int(11) NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`address_id`)
) ENGINE=InnoDB AUTO_INCREMENT=154 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_allergenables`
--

DROP TABLE IF EXISTS `ti_allergenables`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_allergenables` (
  `allergen_id` int(10) unsigned NOT NULL,
  `allergenable_type` varchar(128) NOT NULL,
  `allergenable_id` bigint(20) unsigned NOT NULL,
  UNIQUE KEY `allergenable_unique` (`allergen_id`,`allergenable_id`,`allergenable_type`),
  KEY `allergenable_index` (`allergenable_type`,`allergenable_id`),
  KEY `ti_allergenables_allergen_id_index` (`allergen_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_allergens`
--

DROP TABLE IF EXISTS `ti_allergens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_allergens` (
  `allergen_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(128) NOT NULL,
  `description` varchar(128) NOT NULL,
  `status` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`allergen_id`)
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_assignable_logs`
--

DROP TABLE IF EXISTS `ti_assignable_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_assignable_logs` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `assignable_type` varchar(128) NOT NULL,
  `assignable_id` bigint(20) unsigned NOT NULL,
  `assignee_id` int(10) unsigned DEFAULT NULL,
  `assignee_group_id` int(10) unsigned DEFAULT NULL,
  `status_id` int(10) unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `ti_assignable_logs_assignable_type_assignable_id_index` (`assignable_type`,`assignable_id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_banners`
--

DROP TABLE IF EXISTS `ti_banners`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_banners` (
  `banner_id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(128) NOT NULL,
  `type` char(8) NOT NULL,
  `click_url` varchar(128) DEFAULT NULL,
  `language_id` int(11) NOT NULL,
  `alt_text` varchar(128) DEFAULT NULL,
  `image_code` text DEFAULT NULL,
  `custom_code` text DEFAULT NULL,
  `status` tinyint(1) NOT NULL,
  PRIMARY KEY (`banner_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_cache`
--

DROP TABLE IF EXISTS `ti_cache`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_cache` (
  `key` varchar(128) NOT NULL,
  `value` mediumtext NOT NULL,
  `expiration` int(11) NOT NULL,
  UNIQUE KEY `ti_cache_key_unique` (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_cash_drawer_logs`
--

DROP TABLE IF EXISTS `ti_cash_drawer_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_cash_drawer_logs` (
  `log_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `drawer_id` bigint(20) unsigned NOT NULL COMMENT 'Reference to cash drawer',
  `order_id` int(11) unsigned DEFAULT NULL COMMENT 'Associated order (if triggered by payment)',
  `location_id` int(10) unsigned DEFAULT NULL COMMENT 'Location where event occurred',
  `action` enum('open','close','test','error','manual') NOT NULL DEFAULT 'open' COMMENT 'Type of action performed',
  `trigger_method` varchar(50) DEFAULT NULL COMMENT 'cash_payment, manual, test, scheduled',
  `success` tinyint(1) NOT NULL DEFAULT 1 COMMENT 'Whether the action was successful',
  `error_message` text DEFAULT NULL COMMENT 'Error details if action failed',
  `response_data` text DEFAULT NULL COMMENT 'JSON response from drawer device',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`log_id`),
  KEY `idx_drawer_id` (`drawer_id`),
  KEY `idx_order_id` (`order_id`),
  KEY `idx_location_id` (`location_id`),
  KEY `idx_action` (`action`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Cash drawer operation logs';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_cash_drawers`
--

DROP TABLE IF EXISTS `ti_cash_drawers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_cash_drawers` (
  `drawer_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(128) NOT NULL COMMENT 'Display name for the cash drawer',
  `location_id` int(10) unsigned DEFAULT NULL COMMENT 'Associated location (multi-tenant)',
  `pos_device_id` bigint(20) unsigned DEFAULT NULL COMMENT 'Linked POS device (optional)',
  `connection_type` enum('rj11_printer','usb','serial','network','integrated') NOT NULL DEFAULT 'rj11_printer' COMMENT 'How the drawer is connected',
  `device_path` varchar(255) DEFAULT NULL COMMENT 'COM port, USB path, IP address, or printer name',
  `printer_id` bigint(20) unsigned DEFAULT NULL COMMENT 'If RJ11, link to printer device',
  `esc_pos_command` varchar(50) NOT NULL DEFAULT '27,112,0,60,120' COMMENT 'ESC/POS command for drawer open',
  `voltage` enum('12V','24V') NOT NULL DEFAULT '12V' COMMENT 'Drawer solenoid voltage',
  `network_ip` varchar(45) DEFAULT NULL COMMENT 'IP address for network drawers',
  `network_port` int(11) DEFAULT 9100 COMMENT 'Port for network drawers',
  `serial_port` varchar(50) DEFAULT NULL COMMENT 'COM port for serial drawers',
  `serial_baud_rate` int(11) DEFAULT 9600 COMMENT 'Baud rate for serial connection',
  `usb_vendor_id` varchar(10) DEFAULT NULL COMMENT 'USB vendor ID',
  `usb_product_id` varchar(10) DEFAULT NULL COMMENT 'USB product ID',
  `connection_config` text DEFAULT NULL COMMENT 'JSON config for advanced settings',
  `status` tinyint(1) NOT NULL DEFAULT 1 COMMENT 'Enable/disable drawer',
  `auto_open_on_cash` tinyint(1) NOT NULL DEFAULT 1 COMMENT 'Auto-open when cash payment is processed',
  `test_on_save` tinyint(1) NOT NULL DEFAULT 1 COMMENT 'Test connection when saving configuration',
  `description` text DEFAULT NULL COMMENT 'Additional notes or description',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`drawer_id`),
  KEY `idx_location_id` (`location_id`),
  KEY `idx_pos_device_id` (`pos_device_id`),
  KEY `idx_connection_type` (`connection_type`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Cash drawer devices configuration';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_categories`
--

DROP TABLE IF EXISTS `ti_categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_categories` (
  `category_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(128) NOT NULL,
  `description` text DEFAULT NULL,
  `parent_id` int(11) DEFAULT NULL,
  `priority` int(11) NOT NULL DEFAULT 0,
  `status` tinyint(1) NOT NULL DEFAULT 1,
  `frontend_visible` tinyint(1) NOT NULL DEFAULT 1,
  `image` varchar(255) DEFAULT NULL,
  `nest_left` int(11) DEFAULT NULL,
  `nest_right` int(11) DEFAULT NULL,
  `permalink_slug` varchar(128) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`category_id`)
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_countries`
--

DROP TABLE IF EXISTS `ti_countries`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_countries` (
  `country_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `country_name` varchar(128) NOT NULL,
  `iso_code_2` varchar(2) DEFAULT NULL,
  `iso_code_3` varchar(3) DEFAULT NULL,
  `format` text DEFAULT NULL,
  `status` tinyint(1) NOT NULL DEFAULT 0,
  `priority` int(11) NOT NULL DEFAULT 999,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`country_id`)
) ENGINE=InnoDB AUTO_INCREMENT=240 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_currencies`
--

DROP TABLE IF EXISTS `ti_currencies`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_currencies` (
  `currency_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `country_id` int(11) NOT NULL,
  `currency_name` varchar(128) NOT NULL,
  `currency_code` varchar(3) NOT NULL,
  `currency_symbol` varchar(3) NOT NULL,
  `currency_rate` decimal(15,8) NOT NULL,
  `symbol_position` tinyint(1) DEFAULT NULL,
  `thousand_sign` char(1) NOT NULL,
  `decimal_sign` char(1) NOT NULL,
  `decimal_position` char(1) NOT NULL,
  `iso_alpha2` varchar(2) DEFAULT NULL,
  `iso_alpha3` varchar(3) DEFAULT NULL,
  `iso_numeric` int(11) DEFAULT NULL,
  `currency_status` int(11) DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL,
  PRIMARY KEY (`currency_id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_customer_groups`
--

DROP TABLE IF EXISTS `ti_customer_groups`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_customer_groups` (
  `customer_group_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `group_name` varchar(32) NOT NULL,
  `description` text DEFAULT NULL,
  `approval` tinyint(1) NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`customer_group_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_customers`
--

DROP TABLE IF EXISTS `ti_customers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_customers` (
  `customer_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `first_name` varchar(128) NOT NULL,
  `last_name` varchar(128) NOT NULL,
  `email` varchar(96) NOT NULL,
  `password` varchar(128) NOT NULL,
  `telephone` varchar(32) DEFAULT NULL,
  `address_id` int(11) DEFAULT NULL,
  `newsletter` tinyint(1) DEFAULT NULL,
  `customer_group_id` int(11) NOT NULL,
  `ip_address` varchar(40) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `status` tinyint(1) NOT NULL,
  `reset_code` varchar(128) DEFAULT NULL,
  `reset_time` datetime DEFAULT NULL,
  `activation_code` varchar(128) DEFAULT NULL,
  `remember_token` varchar(128) DEFAULT NULL,
  `is_activated` tinyint(1) DEFAULT NULL,
  `date_activated` datetime DEFAULT NULL,
  `last_login` datetime DEFAULT NULL,
  `last_seen` datetime DEFAULT NULL,
  `updated_at` timestamp NOT NULL,
  `last_location_area` text NOT NULL,
  PRIMARY KEY (`customer_id`),
  UNIQUE KEY `ti_customers_email_unique` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_extension_settings`
--

DROP TABLE IF EXISTS `ti_extension_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_extension_settings` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `item` varchar(128) NOT NULL,
  `data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`data`)),
  PRIMARY KEY (`id`),
  UNIQUE KEY `ti_extension_settings_item_unique` (`item`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_extensions`
--

DROP TABLE IF EXISTS `ti_extensions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_extensions` (
  `extension_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(128) NOT NULL,
  `version` varchar(32) DEFAULT '1.0.0',
  PRIMARY KEY (`extension_id`),
  UNIQUE KEY `ti_extensions_name_unique` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_failed_jobs`
--

DROP TABLE IF EXISTS `ti_failed_jobs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_failed_jobs` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `uuid` varchar(128) DEFAULT NULL,
  `connection` text NOT NULL,
  `queue` text NOT NULL,
  `payload` longtext NOT NULL,
  `exception` longtext NOT NULL,
  `failed_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `ti_failed_jobs_uuid_unique` (`uuid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_igniter_automation_logs`
--

DROP TABLE IF EXISTS `ti_igniter_automation_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_igniter_automation_logs` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `automation_rule_id` bigint(20) unsigned DEFAULT NULL,
  `rule_action_id` bigint(20) unsigned DEFAULT NULL,
  `is_success` tinyint(1) NOT NULL,
  `message` text NOT NULL,
  `params` text DEFAULT NULL,
  `exception` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `ti_igniter_automation_logs_automation_rule_id_foreign` (`automation_rule_id`),
  KEY `ti_igniter_automation_logs_rule_action_id_foreign` (`rule_action_id`),
  CONSTRAINT `ti_igniter_automation_logs_automation_rule_id_foreign` FOREIGN KEY (`automation_rule_id`) REFERENCES `ti_igniter_automation_rules` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ti_igniter_automation_logs_rule_action_id_foreign` FOREIGN KEY (`rule_action_id`) REFERENCES `ti_igniter_automation_rule_actions` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_igniter_automation_rule_actions`
--

DROP TABLE IF EXISTS `ti_igniter_automation_rule_actions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_igniter_automation_rule_actions` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `automation_rule_id` bigint(20) unsigned DEFAULT NULL,
  `class_name` varchar(128) NOT NULL,
  `options` text NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `ti_igniter_actions_automation_rule_id_foreign` (`automation_rule_id`),
  CONSTRAINT `ti_igniter_actions_automation_rule_id_foreign` FOREIGN KEY (`automation_rule_id`) REFERENCES `ti_igniter_automation_rules` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_igniter_automation_rule_conditions`
--

DROP TABLE IF EXISTS `ti_igniter_automation_rule_conditions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_igniter_automation_rule_conditions` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `automation_rule_id` bigint(20) unsigned DEFAULT NULL,
  `class_name` varchar(128) NOT NULL,
  `options` text NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `ti_igniter_conditions_automation_rule_id_foreign` (`automation_rule_id`),
  CONSTRAINT `ti_igniter_conditions_automation_rule_id_foreign` FOREIGN KEY (`automation_rule_id`) REFERENCES `ti_igniter_automation_rules` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_igniter_automation_rules`
--

DROP TABLE IF EXISTS `ti_igniter_automation_rules`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_igniter_automation_rules` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(128) NOT NULL,
  `code` varchar(128) NOT NULL,
  `description` varchar(128) NOT NULL,
  `event_class` text DEFAULT NULL,
  `config_data` text DEFAULT NULL,
  `is_custom` tinyint(1) NOT NULL DEFAULT 0,
  `status` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_igniter_cart_cart`
--

DROP TABLE IF EXISTS `ti_igniter_cart_cart`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_igniter_cart_cart` (
  `identifier` varchar(128) NOT NULL,
  `instance` varchar(128) NOT NULL,
  `data` longtext NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`identifier`,`instance`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_igniter_coupon_categories`
--

DROP TABLE IF EXISTS `ti_igniter_coupon_categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_igniter_coupon_categories` (
  `coupon_id` int(10) unsigned NOT NULL,
  `category_id` int(10) unsigned NOT NULL,
  UNIQUE KEY `ti_igniter_coupon_categories_coupon_id_category_id_unique` (`coupon_id`,`category_id`),
  KEY `ti_igniter_coupon_categories_coupon_id_index` (`coupon_id`),
  KEY `ti_igniter_coupon_categories_category_id_index` (`category_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_igniter_coupon_customer_groups`
--

DROP TABLE IF EXISTS `ti_igniter_coupon_customer_groups`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_igniter_coupon_customer_groups` (
  `coupon_id` bigint(20) unsigned NOT NULL,
  `customer_group_id` bigint(20) unsigned NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_igniter_coupon_customers`
--

DROP TABLE IF EXISTS `ti_igniter_coupon_customers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_igniter_coupon_customers` (
  `coupon_id` bigint(20) unsigned NOT NULL,
  `customer_id` bigint(20) unsigned NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_igniter_coupon_menus`
--

DROP TABLE IF EXISTS `ti_igniter_coupon_menus`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_igniter_coupon_menus` (
  `coupon_id` int(10) unsigned NOT NULL,
  `menu_id` int(10) unsigned NOT NULL,
  UNIQUE KEY `ti_igniter_coupon_menus_coupon_id_menu_id_unique` (`coupon_id`,`menu_id`),
  KEY `ti_igniter_coupon_menus_coupon_id_index` (`coupon_id`),
  KEY `ti_igniter_coupon_menus_menu_id_index` (`menu_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_igniter_coupons`
--

DROP TABLE IF EXISTS `ti_igniter_coupons`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_igniter_coupons` (
  `coupon_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(128) NOT NULL,
  `code` varchar(128) NOT NULL,
  `type` char(1) NOT NULL,
  `discount` decimal(15,4) DEFAULT NULL,
  `min_total` decimal(15,4) DEFAULT NULL,
  `redemptions` int(11) NOT NULL DEFAULT 0,
  `customer_redemptions` int(11) NOT NULL DEFAULT 0,
  `description` text DEFAULT NULL,
  `status` tinyint(1) DEFAULT NULL,
  `created_at` date NOT NULL,
  `validity` char(15) DEFAULT NULL,
  `fixed_date` date DEFAULT NULL,
  `fixed_from_time` time DEFAULT NULL,
  `fixed_to_time` time DEFAULT NULL,
  `period_start_date` date DEFAULT NULL,
  `period_end_date` date DEFAULT NULL,
  `recurring_every` varchar(35) DEFAULT NULL,
  `recurring_from_time` time DEFAULT NULL,
  `recurring_to_time` time DEFAULT NULL,
  `order_restriction` text DEFAULT NULL,
  `apply_coupon_on` enum('whole_cart','menu_items','delivery_fee') NOT NULL DEFAULT 'whole_cart',
  `auto_apply` tinyint(1) NOT NULL DEFAULT 0,
  `updated_at` timestamp NOT NULL,
  PRIMARY KEY (`coupon_id`),
  UNIQUE KEY `code` (`code`),
  UNIQUE KEY `ti_igniter_coupons_code_unique` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_igniter_coupons_history`
--

DROP TABLE IF EXISTS `ti_igniter_coupons_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_igniter_coupons_history` (
  `coupon_history_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `coupon_id` bigint(20) unsigned NOT NULL,
  `order_id` bigint(20) unsigned DEFAULT NULL,
  `customer_id` bigint(20) unsigned DEFAULT NULL,
  `code` varchar(15) NOT NULL,
  `min_total` decimal(15,4) DEFAULT NULL,
  `amount` decimal(15,4) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `status` tinyint(1) NOT NULL,
  `updated_at` timestamp NOT NULL,
  PRIMARY KEY (`coupon_history_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_igniter_frontend_banners`
--

DROP TABLE IF EXISTS `ti_igniter_frontend_banners`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_igniter_frontend_banners` (
  `banner_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(128) NOT NULL,
  `type` char(8) NOT NULL,
  `click_url` varchar(128) DEFAULT NULL,
  `language_id` int(11) NOT NULL,
  `alt_text` varchar(128) DEFAULT NULL,
  `image_code` text DEFAULT NULL,
  `custom_code` text DEFAULT NULL,
  `status` tinyint(1) NOT NULL,
  PRIMARY KEY (`banner_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_igniter_frontend_sliders`
--

DROP TABLE IF EXISTS `ti_igniter_frontend_sliders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_igniter_frontend_sliders` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(128) NOT NULL,
  `code` varchar(128) NOT NULL,
  `metadata` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ti_igniter_frontend_sliders_code_unique` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_igniter_frontend_subscribers`
--

DROP TABLE IF EXISTS `ti_igniter_frontend_subscribers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_igniter_frontend_subscribers` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) DEFAULT NULL,
  `email` varchar(128) NOT NULL,
  `statistics` int(11) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_igniter_pages_menu_items`
--

DROP TABLE IF EXISTS `ti_igniter_pages_menu_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_igniter_pages_menu_items` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `menu_id` int(10) unsigned NOT NULL,
  `parent_id` int(10) unsigned DEFAULT NULL,
  `title` varchar(128) NOT NULL,
  `code` varchar(128) NOT NULL,
  `description` varchar(128) DEFAULT NULL,
  `type` varchar(128) NOT NULL,
  `url` varchar(128) DEFAULT NULL,
  `reference` varchar(128) DEFAULT NULL,
  `config` text DEFAULT NULL,
  `nest_left` int(11) DEFAULT NULL,
  `nest_right` int(11) DEFAULT NULL,
  `priority` int(11) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `ti_igniter_pages_menu_items_menu_id_index` (`menu_id`),
  KEY `ti_igniter_pages_menu_items_parent_id_index` (`parent_id`)
) ENGINE=InnoDB AUTO_INCREMENT=40 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_igniter_pages_menus`
--

DROP TABLE IF EXISTS `ti_igniter_pages_menus`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_igniter_pages_menus` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `theme_code` varchar(128) NOT NULL,
  `name` varchar(128) NOT NULL,
  `code` varchar(128) NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `ti_igniter_pages_menus_theme_code_index` (`theme_code`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_igniter_reviews`
--

DROP TABLE IF EXISTS `ti_igniter_reviews`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_igniter_reviews` (
  `review_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `customer_id` bigint(20) unsigned DEFAULT NULL,
  `sale_id` bigint(20) unsigned DEFAULT NULL,
  `sale_type` varchar(32) NOT NULL DEFAULT '',
  `author` varchar(128) DEFAULT NULL,
  `location_id` bigint(20) unsigned DEFAULT NULL,
  `quality` int(11) NOT NULL,
  `delivery` int(11) NOT NULL,
  `service` int(11) NOT NULL,
  `review_text` text DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `review_status` tinyint(1) NOT NULL,
  `updated_at` timestamp NOT NULL,
  PRIMARY KEY (`review_id`),
  KEY `ti_igniter_reviews_review_id_sale_type_sale_id_index` (`review_id`,`sale_type`,`sale_id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_igniter_socialite_providers`
--

DROP TABLE IF EXISTS `ti_igniter_socialite_providers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_igniter_socialite_providers` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int(10) unsigned DEFAULT NULL,
  `provider` varchar(255) DEFAULT NULL,
  `provider_id` varchar(255) DEFAULT NULL,
  `token` varchar(255) DEFAULT NULL,
  `user_type` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `provider_token_index` (`provider`,`token`),
  KEY `ti_igniter_socialite_providers_user_id_index` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_job_batches`
--

DROP TABLE IF EXISTS `ti_job_batches`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_job_batches` (
  `id` varchar(128) NOT NULL,
  `name` varchar(128) NOT NULL,
  `total_jobs` int(11) NOT NULL,
  `pending_jobs` int(11) NOT NULL,
  `failed_jobs` int(11) NOT NULL,
  `failed_job_ids` text NOT NULL,
  `options` mediumtext DEFAULT NULL,
  `cancelled_at` int(11) DEFAULT NULL,
  `created_at` int(11) NOT NULL,
  `finished_at` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_jobs`
--

DROP TABLE IF EXISTS `ti_jobs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_jobs` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `queue` varchar(128) NOT NULL,
  `payload` longtext NOT NULL,
  `attempts` tinyint(3) unsigned NOT NULL,
  `reserved_at` int(10) unsigned DEFAULT NULL,
  `available_at` int(10) unsigned NOT NULL,
  `created_at` int(10) unsigned NOT NULL,
  PRIMARY KEY (`id`),
  KEY `ti_jobs_queue_index` (`queue`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_kds_stations`
--

DROP TABLE IF EXISTS `ti_kds_stations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_kds_stations` (
  `station_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(128) NOT NULL,
  `slug` varchar(128) NOT NULL,
  `description` text DEFAULT NULL,
  `category_ids` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`category_ids`)),
  `status_ids` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`status_ids`)),
  `can_change_status` tinyint(1) NOT NULL DEFAULT 1,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `notification_sound` varchar(50) NOT NULL DEFAULT 'doorbell',
  `refresh_interval` int(11) NOT NULL DEFAULT 5,
  `theme_color` varchar(20) NOT NULL DEFAULT '#4CAF50',
  `location_id` int(10) unsigned DEFAULT NULL,
  `priority` int(11) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`station_id`),
  UNIQUE KEY `slug_unique` (`slug`),
  KEY `is_active_index` (`is_active`),
  KEY `location_id_index` (`location_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_language_translations`
--

DROP TABLE IF EXISTS `ti_language_translations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_language_translations` (
  `translation_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `locale` varchar(10) NOT NULL,
  `namespace` varchar(128) NOT NULL DEFAULT '*',
  `group` varchar(128) NOT NULL,
  `item` varchar(128) NOT NULL,
  `text` text NOT NULL,
  `unstable` tinyint(1) NOT NULL DEFAULT 0,
  `locked` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`translation_id`),
  UNIQUE KEY `ti_language_translations_locale_namespace_group_item_unique` (`locale`,`namespace`,`group`,`item`),
  KEY `ti_language_translations_group_index` (`group`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_languages`
--

DROP TABLE IF EXISTS `ti_languages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_languages` (
  `language_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `code` varchar(32) NOT NULL,
  `name` varchar(128) NOT NULL,
  `image` varchar(128) DEFAULT NULL,
  `idiom` varchar(128) NOT NULL,
  `status` tinyint(1) NOT NULL,
  `can_delete` tinyint(1) NOT NULL,
  `original_id` int(11) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `version` varchar(128) DEFAULT NULL,
  PRIMARY KEY (`language_id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_location_areas`
--

DROP TABLE IF EXISTS `ti_location_areas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_location_areas` (
  `area_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `location_id` int(11) NOT NULL,
  `name` varchar(128) NOT NULL,
  `type` varchar(32) NOT NULL,
  `boundaries` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`boundaries`)),
  `conditions` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`conditions`)),
  `color` varchar(40) DEFAULT NULL,
  `is_default` tinyint(1) NOT NULL DEFAULT 0,
  `priority` int(11) NOT NULL DEFAULT 0,
  PRIMARY KEY (`area_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_location_options`
--

DROP TABLE IF EXISTS `ti_location_options`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_location_options` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `location_id` bigint(20) unsigned NOT NULL,
  `item` varchar(128) NOT NULL,
  `value` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`value`)),
  PRIMARY KEY (`id`),
  UNIQUE KEY `ti_location_options_location_id_item_unique` (`location_id`,`item`)
) ENGINE=InnoDB AUTO_INCREMENT=125 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_locationables`
--

DROP TABLE IF EXISTS `ti_locationables`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_locationables` (
  `location_id` int(11) NOT NULL,
  `locationable_id` int(11) NOT NULL,
  `locationable_type` varchar(128) NOT NULL,
  `options` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_locations`
--

DROP TABLE IF EXISTS `ti_locations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_locations` (
  `location_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `location_name` varchar(128) NOT NULL,
  `location_email` varchar(96) NOT NULL,
  `description` text DEFAULT NULL,
  `location_address_1` varchar(128) DEFAULT NULL,
  `location_address_2` varchar(128) DEFAULT NULL,
  `location_city` varchar(128) DEFAULT NULL,
  `location_state` varchar(128) DEFAULT NULL,
  `location_postcode` varchar(10) DEFAULT NULL,
  `location_country_id` int(11) DEFAULT NULL,
  `location_telephone` text DEFAULT NULL,
  `location_lat` double DEFAULT NULL,
  `location_lng` double DEFAULT NULL,
  `location_radius` int(11) DEFAULT NULL,
  `location_status` tinyint(1) DEFAULT NULL,
  `permalink_slug` varchar(128) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`location_id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_logos`
--

DROP TABLE IF EXISTS `ti_logos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_logos` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `dashboard_logo` text DEFAULT NULL,
  `loader_logo` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_mail_layouts`
--

DROP TABLE IF EXISTS `ti_mail_layouts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_mail_layouts` (
  `layout_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(128) NOT NULL,
  `language_id` int(11) NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `status` tinyint(1) NOT NULL,
  `code` varchar(128) NOT NULL,
  `layout` text DEFAULT NULL,
  `plain_layout` text DEFAULT NULL,
  `layout_css` text DEFAULT NULL,
  `is_locked` tinyint(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (`layout_id`),
  UNIQUE KEY `ti_mail_layouts_code_unique` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_mail_partials`
--

DROP TABLE IF EXISTS `ti_mail_partials`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_mail_partials` (
  `partial_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(128) DEFAULT NULL,
  `code` varchar(128) DEFAULT NULL,
  `html` text DEFAULT NULL,
  `text` text DEFAULT NULL,
  `is_custom` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`partial_id`),
  UNIQUE KEY `ti_mail_partials_code_unique` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_mail_templates`
--

DROP TABLE IF EXISTS `ti_mail_templates`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_mail_templates` (
  `template_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `layout_id` int(11) NOT NULL,
  `code` varchar(128) NOT NULL,
  `subject` varchar(128) NOT NULL,
  `body` text NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `label` varchar(128) DEFAULT NULL,
  `is_custom` tinyint(1) DEFAULT NULL,
  `plain_body` text DEFAULT NULL,
  PRIMARY KEY (`template_id`),
  UNIQUE KEY `ti_mail_templates_data_template_id_code_unique` (`layout_id`,`code`)
) ENGINE=InnoDB AUTO_INCREMENT=19 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_mealtimes`
--

DROP TABLE IF EXISTS `ti_mealtimes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_mealtimes` (
  `mealtime_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `mealtime_name` varchar(128) NOT NULL,
  `start_time` time NOT NULL DEFAULT '00:00:00',
  `end_time` time NOT NULL DEFAULT '23:59:59',
  `mealtime_status` tinyint(1) NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`mealtime_id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_media_attachments`
--

DROP TABLE IF EXISTS `ti_media_attachments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_media_attachments` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `disk` varchar(128) NOT NULL,
  `name` varchar(128) NOT NULL,
  `file_name` varchar(128) NOT NULL,
  `mime_type` varchar(128) NOT NULL,
  `size` int(10) unsigned NOT NULL,
  `tag` varchar(128) DEFAULT NULL,
  `attachment_type` varchar(128) DEFAULT NULL,
  `attachment_id` bigint(20) unsigned DEFAULT NULL,
  `is_public` tinyint(1) NOT NULL DEFAULT 1,
  `custom_properties` text DEFAULT NULL,
  `priority` int(10) unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `ti_media_attachments_attachment_type_attachment_id_index` (`attachment_type`,`attachment_id`),
  KEY `ti_media_attachments_tag_index` (`tag`)
) ENGINE=InnoDB AUTO_INCREMENT=78 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_menu_categories`
--

DROP TABLE IF EXISTS `ti_menu_categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_menu_categories` (
  `menu_id` int(10) unsigned NOT NULL,
  `category_id` int(10) unsigned NOT NULL,
  UNIQUE KEY `ti_menu_categories_menu_id_category_id_unique` (`menu_id`,`category_id`),
  KEY `ti_menu_categories_menu_id_index` (`menu_id`),
  KEY `ti_menu_categories_category_id_index` (`category_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_menu_combo_items`
--

DROP TABLE IF EXISTS `ti_menu_combo_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_menu_combo_items` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `combo_id` bigint(20) unsigned NOT NULL,
  `menu_id` bigint(20) unsigned NOT NULL,
  `quantity` int(11) NOT NULL DEFAULT 1,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_combo_menu` (`combo_id`,`menu_id`),
  KEY `fk_combo_items_menu` (`menu_id`),
  CONSTRAINT `fk_combo_items_combo` FOREIGN KEY (`combo_id`) REFERENCES `ti_menu_combos` (`combo_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_combo_items_menu` FOREIGN KEY (`menu_id`) REFERENCES `ti_menus` (`menu_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=19 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_menu_combos`
--

DROP TABLE IF EXISTS `ti_menu_combos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_menu_combos` (
  `combo_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `combo_name` varchar(128) NOT NULL,
  `combo_description` text DEFAULT NULL,
  `combo_price` decimal(15,4) NOT NULL,
  `location_id` int(10) unsigned DEFAULT NULL,
  `combo_status` tinyint(1) NOT NULL DEFAULT 1,
  `combo_priority` int(11) NOT NULL DEFAULT 0,
  `thumb` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`combo_id`),
  KEY `idx_combo_status_priority` (`combo_status`,`combo_priority`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_menu_images`
--

DROP TABLE IF EXISTS `ti_menu_images`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_menu_images` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `menu_id` int(10) unsigned NOT NULL,
  `image_path` varchar(255) NOT NULL,
  `sort_order` int(10) unsigned NOT NULL DEFAULT 1,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `ti_menu_images_menu_id_sort_order_index` (`menu_id`,`sort_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_menu_item_option_values`
--

DROP TABLE IF EXISTS `ti_menu_item_option_values`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_menu_item_option_values` (
  `menu_option_value_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `menu_option_id` int(11) NOT NULL,
  `option_value_id` int(11) NOT NULL,
  `new_price` decimal(15,4) DEFAULT NULL,
  `priority` int(11) NOT NULL DEFAULT 0,
  `is_default` tinyint(1) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`menu_option_value_id`)
) ENGINE=InnoDB AUTO_INCREMENT=22 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_menu_item_options`
--

DROP TABLE IF EXISTS `ti_menu_item_options`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_menu_item_options` (
  `menu_option_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `option_id` int(11) NOT NULL,
  `menu_id` int(11) NOT NULL,
  `required` tinyint(1) NOT NULL DEFAULT 0,
  `priority` int(11) NOT NULL DEFAULT 0,
  `min_selected` int(11) NOT NULL DEFAULT 0,
  `max_selected` int(11) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`menu_option_id`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_menu_mealtimes`
--

DROP TABLE IF EXISTS `ti_menu_mealtimes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_menu_mealtimes` (
  `menu_id` int(10) unsigned NOT NULL,
  `mealtime_id` int(10) unsigned NOT NULL,
  UNIQUE KEY `ti_menu_mealtimes_menu_id_mealtime_id_unique` (`menu_id`,`mealtime_id`),
  KEY `ti_menu_mealtimes_menu_id_index` (`menu_id`),
  KEY `ti_menu_mealtimes_mealtime_id_index` (`mealtime_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_menu_option_values`
--

DROP TABLE IF EXISTS `ti_menu_option_values`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_menu_option_values` (
  `option_value_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `option_id` int(11) NOT NULL,
  `value` varchar(128) NOT NULL,
  `price` decimal(15,4) DEFAULT NULL,
  `priority` int(11) NOT NULL DEFAULT 0,
  PRIMARY KEY (`option_value_id`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_menu_options`
--

DROP TABLE IF EXISTS `ti_menu_options`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_menu_options` (
  `option_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `option_name` varchar(128) NOT NULL,
  `display_type` varchar(128) NOT NULL,
  `priority` int(11) NOT NULL DEFAULT 0,
  `update_related_menu_item` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`option_id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_menu_prices`
--

DROP TABLE IF EXISTS `ti_menu_prices`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_menu_prices` (
  `price_id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `menu_id` int(10) unsigned NOT NULL,
  `price_type` varchar(50) NOT NULL COMMENT 'default, bar, dining_room, room_service, happy_hour',
  `price` decimal(10,2) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `time_from` time DEFAULT NULL COMMENT 'Start time for time-based pricing',
  `time_to` time DEFAULT NULL COMMENT 'End time for time-based pricing',
  `days_of_week` varchar(20) DEFAULT NULL COMMENT 'Comma-separated: Mon,Tue,Wed or NULL for all days',
  `priority` int(11) NOT NULL DEFAULT 0 COMMENT 'Higher priority takes precedence',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`price_id`),
  KEY `idx_menu_id` (`menu_id`),
  KEY `idx_price_type_active` (`price_type`,`is_active`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_menus`
--

DROP TABLE IF EXISTS `ti_menus`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_menus` (
  `menu_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `menu_name` varchar(128) NOT NULL,
  `menu_description` text NOT NULL,
  `menu_price` decimal(15,4) NOT NULL,
  `minimum_qty` int(11) NOT NULL DEFAULT 0,
  `menu_status` tinyint(1) NOT NULL,
  `is_chef_recommended` tinyint(1) NOT NULL DEFAULT 0,
  `is_manual_bestseller` tinyint(1) NOT NULL DEFAULT 0,
  `bestseller_override_mode` varchar(20) NOT NULL DEFAULT 'auto',
  `is_halal` tinyint(1) NOT NULL DEFAULT 0,
  `is_vegetarian` tinyint(1) NOT NULL DEFAULT 0,
  `is_vegan` tinyint(1) NOT NULL DEFAULT 0,
  `calories` int(11) DEFAULT NULL,
  `protein` decimal(8,2) DEFAULT NULL,
  `carbs` decimal(8,2) DEFAULT NULL,
  `fat` decimal(8,2) DEFAULT NULL,
  `sugar` decimal(8,2) DEFAULT NULL,
  `serving_size` varchar(120) DEFAULT NULL,
  `is_stock_out` tinyint(1) NOT NULL DEFAULT 0 COMMENT 'Flag to mark items as stock-out (visible but not orderable)',
  `menu_priority` int(11) NOT NULL DEFAULT 0,
  `order_restriction` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `color` varchar(40) DEFAULT NULL,
  PRIMARY KEY (`menu_id`),
  KEY `idx_is_stock_out` (`is_stock_out`)
) ENGINE=InnoDB AUTO_INCREMENT=38 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_menus_specials`
--

DROP TABLE IF EXISTS `ti_menus_specials`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_menus_specials` (
  `special_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `menu_id` int(11) NOT NULL DEFAULT 0,
  `start_date` datetime DEFAULT current_timestamp(),
  `end_date` datetime DEFAULT current_timestamp(),
  `special_price` decimal(15,4) DEFAULT NULL,
  `special_status` tinyint(1) NOT NULL,
  `type` varchar(128) NOT NULL,
  `validity` varchar(128) NOT NULL,
  `recurring_every` text DEFAULT NULL,
  `recurring_from` time DEFAULT NULL,
  `recurring_to` time DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`special_id`),
  UNIQUE KEY `ti_menus_specials_special_id_menu_id_unique` (`special_id`,`menu_id`)
) ENGINE=InnoDB AUTO_INCREMENT=32 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_migrations`
--

DROP TABLE IF EXISTS `ti_migrations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_migrations` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `group` varchar(128) NOT NULL,
  `migration` varchar(128) NOT NULL,
  `batch` int(11) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=122 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_notifications`
--

DROP TABLE IF EXISTS `ti_notifications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_notifications` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `type` varchar(50) NOT NULL,
  `title` varchar(255) NOT NULL,
  `table_id` varchar(50) DEFAULT NULL,
  `table_name` varchar(100) DEFAULT NULL,
  `payload` text DEFAULT NULL,
  `status` enum('new','seen','in_progress','resolved') DEFAULT 'new',
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_status_created` (`status`,`created_at` DESC),
  KEY `idx_type` (`type`),
  KEY `idx_table_id` (`table_id`)
) ENGINE=InnoDB AUTO_INCREMENT=131 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_order_menu_options`
--

DROP TABLE IF EXISTS `ti_order_menu_options`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_order_menu_options` (
  `order_option_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `order_id` int(11) NOT NULL,
  `menu_id` int(11) NOT NULL,
  `order_option_name` varchar(128) NOT NULL,
  `order_option_price` decimal(15,4) DEFAULT NULL,
  `order_menu_id` int(11) NOT NULL,
  `order_menu_option_id` int(11) NOT NULL,
  `menu_option_value_id` int(11) NOT NULL,
  `quantity` int(11) DEFAULT 1,
  PRIMARY KEY (`order_option_id`)
) ENGINE=InnoDB AUTO_INCREMENT=255 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_order_menus`
--

DROP TABLE IF EXISTS `ti_order_menus`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_order_menus` (
  `order_menu_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `order_id` int(11) NOT NULL,
  `menu_id` int(11) NOT NULL,
  `name` varchar(128) NOT NULL,
  `quantity` int(11) NOT NULL,
  `price` decimal(15,4) DEFAULT NULL,
  `subtotal` decimal(15,4) DEFAULT NULL,
  `option_values` text DEFAULT NULL,
  `comment` text DEFAULT NULL,
  `is_combo` tinyint(1) DEFAULT 0 COMMENT 'Flag to identify combo meals',
  `combo_id` bigint(20) unsigned DEFAULT NULL COMMENT 'Reference to menu_combos.combo_id',
  `combo_items_description` text DEFAULT NULL COMMENT 'Description of combo items',
  PRIMARY KEY (`order_menu_id`),
  KEY `idx_combo_id` (`combo_id`)
) ENGINE=InnoDB AUTO_INCREMENT=754 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_order_notes`
--

DROP TABLE IF EXISTS `ti_order_notes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_order_notes` (
  `note_id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `order_id` bigint(20) unsigned NOT NULL,
  `staff_id` bigint(20) unsigned DEFAULT NULL,
  `note` text NOT NULL,
  `status` enum('active','archived') DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`note_id`),
  KEY `idx_order_notes_order_status` (`order_id`,`status`),
  KEY `idx_order_notes_created` (`created_at`),
  CONSTRAINT `fk_order_notes_order` FOREIGN KEY (`order_id`) REFERENCES `ti_orders` (`order_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_order_totals`
--

DROP TABLE IF EXISTS `ti_order_totals`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_order_totals` (
  `order_total_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `order_id` int(10) unsigned NOT NULL,
  `code` varchar(128) NOT NULL,
  `title` varchar(128) NOT NULL,
  `value` decimal(15,4) NOT NULL,
  `priority` tinyint(1) NOT NULL DEFAULT 0,
  `is_summable` tinyint(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (`order_total_id`)
) ENGINE=InnoDB AUTO_INCREMENT=900 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_orders`
--

DROP TABLE IF EXISTS `ti_orders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_orders` (
  `order_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `customer_id` int(11) DEFAULT NULL,
  `first_name` varchar(128) NOT NULL,
  `last_name` varchar(128) NOT NULL,
  `email` varchar(96) NOT NULL,
  `telephone` varchar(128) NOT NULL,
  `location_id` int(11) NOT NULL,
  `address_id` int(11) DEFAULT NULL,
  `cart` text NOT NULL,
  `total_items` int(11) NOT NULL,
  `comment` text DEFAULT NULL,
  `payment` varchar(128) NOT NULL,
  `order_type` varchar(128) NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `order_time` time NOT NULL,
  `order_date` date NOT NULL,
  `order_total` decimal(15,4) DEFAULT NULL,
  `status_id` int(11) NOT NULL,
  `ip_address` varchar(40) NOT NULL,
  `user_agent` varchar(128) NOT NULL,
  `assignee_id` int(11) DEFAULT NULL,
  `assignee_group_id` int(10) unsigned DEFAULT NULL,
  `invoice_prefix` varchar(128) DEFAULT NULL,
  `invoice_date` datetime DEFAULT NULL,
  `hash` varchar(40) DEFAULT NULL,
  `processed` tinyint(1) DEFAULT NULL,
  `status_updated_at` datetime DEFAULT NULL,
  `assignee_updated_at` datetime DEFAULT NULL,
  `order_time_is_asap` tinyint(1) NOT NULL DEFAULT 0,
  `delivery_comment` text DEFAULT NULL,
  `ms_order_type` varchar(255) NOT NULL DEFAULT '',
  PRIMARY KEY (`order_id`),
  KEY `ti_orders_hash_index` (`hash`)
) ENGINE=InnoDB AUTO_INCREMENT=323 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_pages`
--

DROP TABLE IF EXISTS `ti_pages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_pages` (
  `page_id` bigint(20) unsigned NOT NULL,
  `language_id` bigint(20) unsigned NOT NULL,
  `title` varchar(128) NOT NULL,
  `content` mediumtext NOT NULL,
  `meta_description` varchar(128) DEFAULT NULL,
  `meta_keywords` varchar(128) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `status` tinyint(1) NOT NULL,
  `permalink_slug` varchar(128) DEFAULT NULL,
  `layout` varchar(128) DEFAULT NULL,
  `metadata` mediumtext DEFAULT NULL,
  `priority` int(11) DEFAULT NULL,
  PRIMARY KEY (`page_id`),
  KEY `ti_pages_language_id_foreign` (`language_id`),
  CONSTRAINT `ti_pages_language_id_foreign` FOREIGN KEY (`language_id`) REFERENCES `ti_languages` (`language_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_payment_logs`
--

DROP TABLE IF EXISTS `ti_payment_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_payment_logs` (
  `payment_log_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `order_id` int(11) NOT NULL,
  `payment_name` varchar(128) NOT NULL,
  `message` varchar(128) NOT NULL,
  `request` text DEFAULT NULL,
  `response` text DEFAULT NULL,
  `is_success` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `payment_code` varchar(128) NOT NULL,
  `is_refundable` tinyint(1) NOT NULL DEFAULT 0,
  `refunded_at` datetime DEFAULT NULL,
  PRIMARY KEY (`payment_log_id`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_payment_profiles`
--

DROP TABLE IF EXISTS `ti_payment_profiles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_payment_profiles` (
  `payment_profile_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `customer_id` int(10) unsigned DEFAULT NULL,
  `payment_id` int(10) unsigned DEFAULT NULL,
  `card_brand` varchar(128) DEFAULT NULL,
  `card_last4` varchar(128) DEFAULT NULL,
  `profile_data` text DEFAULT NULL,
  `is_primary` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`payment_profile_id`),
  KEY `ti_payment_profiles_customer_id_index` (`customer_id`),
  KEY `ti_payment_profiles_payment_id_index` (`payment_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_payments`
--

DROP TABLE IF EXISTS `ti_payments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_payments` (
  `payment_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(128) NOT NULL,
  `code` varchar(128) NOT NULL,
  `class_name` text NOT NULL,
  `description` text DEFAULT NULL,
  `data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`data`)),
  `status` tinyint(1) NOT NULL DEFAULT 0,
  `is_default` tinyint(1) NOT NULL DEFAULT 0,
  `priority` int(11) NOT NULL DEFAULT 0,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`payment_id`),
  UNIQUE KEY `ti_payments_code_unique` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_pos_config_device`
--

DROP TABLE IF EXISTS `ti_pos_config_device`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_pos_config_device` (
  `config_id` int(11) NOT NULL,
  `device_id` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_pos_configs`
--

DROP TABLE IF EXISTS `ti_pos_configs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_pos_configs` (
  `config_id` int(11) NOT NULL AUTO_INCREMENT,
  `device_id` int(11) NOT NULL,
  `url` varchar(255) NOT NULL,
  `access_token` varchar(255) NOT NULL,
  `id_application` varchar(255) NOT NULL,
  `username` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `exists_webhook` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`config_id`)
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_pos_devices`
--

DROP TABLE IF EXISTS `ti_pos_devices`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_pos_devices` (
  `device_id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `code` varchar(255) NOT NULL,
  `device_type` varchar(255) NOT NULL,
  `description` text NOT NULL,
  `image` varchar(255) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`device_id`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_qr_code`
--

DROP TABLE IF EXISTS `ti_qr_code`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_qr_code` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `qr_code` varchar(30) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_request_logs`
--

DROP TABLE IF EXISTS `ti_request_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_request_logs` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `url` varchar(128) DEFAULT NULL,
  `status_code` int(11) DEFAULT NULL,
  `referrer` text DEFAULT NULL,
  `count` int(11) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5121 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_reservation_tables`
--

DROP TABLE IF EXISTS `ti_reservation_tables`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_reservation_tables` (
  `reservation_id` int(10) unsigned NOT NULL,
  `table_id` int(10) unsigned NOT NULL,
  UNIQUE KEY `ti_reservation_tables_reservation_id_table_id_unique` (`reservation_id`,`table_id`),
  KEY `ti_reservation_tables_reservation_id_index` (`reservation_id`),
  KEY `ti_reservation_tables_table_id_index` (`table_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_reservations`
--

DROP TABLE IF EXISTS `ti_reservations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_reservations` (
  `reservation_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `location_id` int(11) NOT NULL,
  `table_id` int(11) NOT NULL,
  `guest_num` int(11) NOT NULL,
  `occasion_id` int(11) DEFAULT NULL,
  `customer_id` int(11) DEFAULT NULL,
  `first_name` varchar(128) NOT NULL,
  `last_name` varchar(128) NOT NULL,
  `email` varchar(96) NOT NULL,
  `telephone` varchar(128) NOT NULL,
  `comment` text DEFAULT NULL,
  `reserve_time` time NOT NULL,
  `reserve_date` date NOT NULL,
  `created_at` date NOT NULL,
  `updated_at` date NOT NULL,
  `assignee_id` int(11) DEFAULT NULL,
  `assignee_group_id` int(10) unsigned DEFAULT NULL,
  `notify` tinyint(1) DEFAULT NULL,
  `ip_address` varchar(40) NOT NULL,
  `user_agent` varchar(128) NOT NULL,
  `status_id` tinyint(1) NOT NULL,
  `hash` varchar(40) DEFAULT NULL,
  `duration` int(11) DEFAULT NULL,
  `processed` tinyint(1) DEFAULT NULL,
  `status_updated_at` datetime DEFAULT NULL,
  `assignee_updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`reservation_id`),
  KEY `ti_reservations_location_id_table_id_index` (`location_id`,`table_id`),
  KEY `ti_reservations_hash_index` (`hash`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_sessions`
--

DROP TABLE IF EXISTS `ti_sessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_sessions` (
  `id` varchar(128) NOT NULL,
  `payload` text DEFAULT NULL,
  `last_activity` int(11) DEFAULT NULL,
  UNIQUE KEY `ti_sessions_id_unique` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_settings`
--

DROP TABLE IF EXISTS `ti_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_settings` (
  `setting_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `sort` varchar(45) NOT NULL,
  `item` varchar(128) NOT NULL,
  `value` text DEFAULT NULL,
  `serialized` tinyint(1) DEFAULT NULL,
  PRIMARY KEY (`setting_id`),
  UNIQUE KEY `ti_settings_sort_item_unique` (`sort`,`item`)
) ENGINE=InnoDB AUTO_INCREMENT=251 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_staff_groups`
--

DROP TABLE IF EXISTS `ti_staff_groups`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_staff_groups` (
  `staff_group_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `staff_group_name` varchar(32) NOT NULL,
  `description` text NOT NULL,
  `auto_assign` tinyint(1) DEFAULT 0,
  `auto_assign_mode` tinyint(4) DEFAULT 1,
  `auto_assign_limit` int(11) DEFAULT 20,
  `auto_assign_availability` tinyint(1) DEFAULT 1,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`staff_group_id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_staff_roles`
--

DROP TABLE IF EXISTS `ti_staff_roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_staff_roles` (
  `staff_role_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(128) NOT NULL,
  `code` varchar(128) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `permissions` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`staff_role_id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_staffs`
--

DROP TABLE IF EXISTS `ti_staffs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_staffs` (
  `staff_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `staff_name` varchar(128) NOT NULL,
  `staff_email` varchar(96) NOT NULL,
  `card_id` varchar(255) DEFAULT NULL,
  `rfid_card_uid` varchar(100) DEFAULT NULL,
  `fingerprint_template` text DEFAULT NULL,
  `face_template` text DEFAULT NULL,
  `pin_code` varchar(255) DEFAULT NULL,
  `biometric_enabled` tinyint(1) NOT NULL DEFAULT 0,
  `enrollment_status` enum('not_enrolled','enrolled','pending','failed') NOT NULL DEFAULT 'not_enrolled',
  `enrolled_at` timestamp NULL DEFAULT NULL,
  `enrolled_by` bigint(20) unsigned DEFAULT NULL,
  `enrolled_devices` longtext DEFAULT NULL,
  `staff_role_id` int(11) NOT NULL,
  `language_id` int(11) DEFAULT NULL,
  `created_at` date NOT NULL,
  `staff_status` tinyint(1) NOT NULL,
  `sale_permission` tinyint(4) DEFAULT 1,
  `updated_at` timestamp NOT NULL,
  PRIMARY KEY (`staff_id`),
  UNIQUE KEY `staff_email` (`staff_email`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_staffs_groups`
--

DROP TABLE IF EXISTS `ti_staffs_groups`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_staffs_groups` (
  `staff_id` int(10) unsigned NOT NULL,
  `staff_group_id` int(10) unsigned NOT NULL,
  PRIMARY KEY (`staff_id`,`staff_group_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_status_history`
--

DROP TABLE IF EXISTS `ti_status_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_status_history` (
  `status_history_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `object_id` int(11) NOT NULL,
  `object_type` varchar(128) NOT NULL,
  `staff_id` int(11) DEFAULT NULL,
  `status_id` int(11) NOT NULL,
  `notify` tinyint(1) DEFAULT NULL,
  `comment` text DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` timestamp NOT NULL,
  PRIMARY KEY (`status_history_id`)
) ENGINE=InnoDB AUTO_INCREMENT=454 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_statuses`
--

DROP TABLE IF EXISTS `ti_statuses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_statuses` (
  `status_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `status_name` varchar(128) NOT NULL,
  `status_comment` text DEFAULT NULL,
  `notify_customer` tinyint(1) DEFAULT NULL,
  `status_for` varchar(128) NOT NULL,
  `status_color` varchar(128) NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`status_id`)
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_stock_history`
--

DROP TABLE IF EXISTS `ti_stock_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_stock_history` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `stock_id` bigint(20) unsigned NOT NULL,
  `staff_id` bigint(20) unsigned DEFAULT NULL,
  `order_id` bigint(20) unsigned DEFAULT NULL,
  `state` varchar(128) NOT NULL,
  `quantity` bigint(20) NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `ti_stock_history_stock_id_foreign` (`stock_id`),
  KEY `ti_stock_history_order_id_foreign` (`order_id`),
  CONSTRAINT `ti_stock_history_order_id_foreign` FOREIGN KEY (`order_id`) REFERENCES `ti_orders` (`order_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ti_stock_history_stock_id_foreign` FOREIGN KEY (`stock_id`) REFERENCES `ti_stocks` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_stocks`
--

DROP TABLE IF EXISTS `ti_stocks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_stocks` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `location_id` bigint(20) unsigned NOT NULL,
  `stockable_id` bigint(20) unsigned NOT NULL,
  `stockable_type` varchar(128) NOT NULL,
  `quantity` bigint(20) DEFAULT NULL,
  `low_stock_alert` tinyint(1) NOT NULL DEFAULT 0,
  `low_stock_threshold` int(11) NOT NULL DEFAULT 0,
  `is_tracked` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `low_stock_alert_sent` tinyint(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_tables`
--

DROP TABLE IF EXISTS `ti_tables`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
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
) ENGINE=InnoDB AUTO_INCREMENT=57 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_themes`
--

DROP TABLE IF EXISTS `ti_themes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_themes` (
  `theme_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(128) NOT NULL,
  `code` varchar(128) NOT NULL,
  `description` text DEFAULT NULL,
  `version` varchar(128) DEFAULT '0.0.1',
  `data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`data`)),
  `status` tinyint(1) NOT NULL DEFAULT 0,
  `is_default` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`theme_id`),
  UNIQUE KEY `ti_themes_code_unique` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_ti_menus`
--

DROP TABLE IF EXISTS `ti_ti_menus`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_ti_menus` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(128) NOT NULL,
  `menu_status` tinyint(4) NOT NULL DEFAULT 0,
  `is_halal` tinyint(1) NOT NULL DEFAULT 0,
  `is_vegetarian` tinyint(1) NOT NULL DEFAULT 0,
  `is_vegan` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_tips_shifts`
--

DROP TABLE IF EXISTS `ti_tips_shifts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_tips_shifts` (
  `shift_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `shift_date` date NOT NULL,
  `location_id` int(10) unsigned DEFAULT NULL,
  `description` text DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`shift_id`),
  UNIQUE KEY `unique_shift_date_location` (`shift_date`,`location_id`),
  KEY `idx_shift_date_location` (`shift_date`,`location_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_user_preferences`
--

DROP TABLE IF EXISTS `ti_user_preferences`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_user_preferences` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `item` varchar(128) NOT NULL,
  `value` text NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_users`
--

DROP TABLE IF EXISTS `ti_users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_users` (
  `user_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `staff_id` int(11) NOT NULL,
  `username` varchar(32) NOT NULL,
  `password` varchar(128) NOT NULL,
  `super_user` tinyint(1) DEFAULT NULL,
  `reset_code` varchar(128) DEFAULT NULL,
  `reset_time` datetime DEFAULT NULL,
  `activation_code` varchar(128) DEFAULT NULL,
  `remember_token` varchar(128) DEFAULT NULL,
  `is_activated` tinyint(1) DEFAULT NULL,
  `date_activated` datetime DEFAULT NULL,
  `last_login` datetime DEFAULT NULL,
  `last_seen` datetime DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `ti_users_staff_id_unique` (`staff_id`),
  UNIQUE KEY `ti_users_username_unique` (`username`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_websockets_statistics_entries`
--

DROP TABLE IF EXISTS `ti_websockets_statistics_entries`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_websockets_statistics_entries` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `app_id` varchar(128) NOT NULL,
  `peak_connection_count` int(11) NOT NULL,
  `websocket_message_count` int(11) NOT NULL,
  `api_message_count` int(11) NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_working_hours`
--

DROP TABLE IF EXISTS `ti_working_hours`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_working_hours` (
  `location_id` int(11) NOT NULL,
  `weekday` int(11) NOT NULL,
  `opening_time` time NOT NULL DEFAULT '00:00:00',
  `closing_time` time NOT NULL DEFAULT '00:00:00',
  `status` tinyint(1) NOT NULL,
  `type` varchar(32) NOT NULL,
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  PRIMARY KEY (`id`),
  KEY `ti_working_hours_location_id_weekday_type_index` (`location_id`,`weekday`,`type`)
) ENGINE=InnoDB AUTO_INCREMENT=22 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping events for database 'rosana'
--

--
-- Dumping routines for database 'rosana'
--
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-06-09 23:50:20

-- ============================================================
-- DATABASE: persian
-- ============================================================

/*M!999999\- enable the sandbox mode */ 
-- MariaDB dump 10.19  Distrib 10.11.13-MariaDB, for debian-linux-gnu (x86_64)
--
-- Host: 127.0.0.1    Database: persian
-- ------------------------------------------------------
-- Server version	10.11.13-MariaDB-0ubuntu0.24.04.1

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Current Database: `persian`
--

CREATE DATABASE /*!32312 IF NOT EXISTS*/ `persian` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci */;

USE `persian`;

--
-- Table structure for table `qr_code`
--

DROP TABLE IF EXISTS `qr_code`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `qr_code` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `qr_code` varchar(30) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_activities`
--

DROP TABLE IF EXISTS `ti_activities`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_activities` (
  `activity_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int(11) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `log_name` varchar(128) DEFAULT NULL,
  `properties` text DEFAULT NULL,
  `subject_id` int(11) DEFAULT NULL,
  `subject_type` varchar(128) DEFAULT NULL,
  `causer_id` int(11) DEFAULT NULL,
  `causer_type` varchar(128) DEFAULT NULL,
  `updated_at` datetime NOT NULL,
  `type` varchar(128) DEFAULT NULL,
  `read_at` datetime DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `user_type` varchar(128) DEFAULT NULL,
  PRIMARY KEY (`activity_id`)
) ENGINE=InnoDB AUTO_INCREMENT=193 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_addresses`
--

DROP TABLE IF EXISTS `ti_addresses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_addresses` (
  `address_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `customer_id` int(11) DEFAULT NULL,
  `address_1` varchar(128) NOT NULL,
  `address_2` varchar(128) DEFAULT NULL,
  `city` varchar(128) DEFAULT NULL,
  `state` varchar(128) DEFAULT NULL,
  `postcode` varchar(128) DEFAULT NULL,
  `country_id` int(11) NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`address_id`)
) ENGINE=InnoDB AUTO_INCREMENT=154 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_allergenables`
--

DROP TABLE IF EXISTS `ti_allergenables`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_allergenables` (
  `allergen_id` int(10) unsigned NOT NULL,
  `allergenable_type` varchar(128) NOT NULL,
  `allergenable_id` bigint(20) unsigned NOT NULL,
  UNIQUE KEY `allergenable_unique` (`allergen_id`,`allergenable_id`,`allergenable_type`),
  KEY `allergenable_index` (`allergenable_type`,`allergenable_id`),
  KEY `ti_allergenables_allergen_id_index` (`allergen_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_allergens`
--

DROP TABLE IF EXISTS `ti_allergens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_allergens` (
  `allergen_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(128) NOT NULL,
  `description` varchar(128) NOT NULL,
  `status` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`allergen_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_assignable_logs`
--

DROP TABLE IF EXISTS `ti_assignable_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_assignable_logs` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `assignable_type` varchar(128) NOT NULL,
  `assignable_id` bigint(20) unsigned NOT NULL,
  `assignee_id` int(10) unsigned DEFAULT NULL,
  `assignee_group_id` int(10) unsigned DEFAULT NULL,
  `status_id` int(10) unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `ti_assignable_logs_assignable_type_assignable_id_index` (`assignable_type`,`assignable_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_cache`
--

DROP TABLE IF EXISTS `ti_cache`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_cache` (
  `key` varchar(128) NOT NULL,
  `value` mediumtext NOT NULL,
  `expiration` int(11) NOT NULL,
  UNIQUE KEY `ti_cache_key_unique` (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_cash_drawer_logs`
--

DROP TABLE IF EXISTS `ti_cash_drawer_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_cash_drawer_logs` (
  `log_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `drawer_id` bigint(20) unsigned NOT NULL COMMENT 'Reference to cash drawer',
  `order_id` int(11) unsigned DEFAULT NULL COMMENT 'Associated order (if triggered by payment)',
  `location_id` int(10) unsigned DEFAULT NULL COMMENT 'Location where event occurred',
  `action` enum('open','close','test','error','manual') NOT NULL DEFAULT 'open' COMMENT 'Type of action performed',
  `trigger_method` varchar(50) DEFAULT NULL COMMENT 'cash_payment, manual, test, scheduled',
  `success` tinyint(1) NOT NULL DEFAULT 1 COMMENT 'Whether the action was successful',
  `error_message` text DEFAULT NULL COMMENT 'Error details if action failed',
  `response_data` text DEFAULT NULL COMMENT 'JSON response from drawer device',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`log_id`),
  KEY `idx_drawer_id` (`drawer_id`),
  KEY `idx_order_id` (`order_id`),
  KEY `idx_location_id` (`location_id`),
  KEY `idx_action` (`action`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Cash drawer operation logs';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_cash_drawers`
--

DROP TABLE IF EXISTS `ti_cash_drawers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_cash_drawers` (
  `drawer_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(128) NOT NULL COMMENT 'Display name for the cash drawer',
  `location_id` int(10) unsigned DEFAULT NULL COMMENT 'Associated location (multi-tenant)',
  `pos_device_id` bigint(20) unsigned DEFAULT NULL COMMENT 'Linked POS device (optional)',
  `connection_type` enum('rj11_printer','usb','serial','network','integrated') NOT NULL DEFAULT 'rj11_printer' COMMENT 'How the drawer is connected',
  `device_path` varchar(255) DEFAULT NULL COMMENT 'COM port, USB path, IP address, or printer name',
  `printer_id` bigint(20) unsigned DEFAULT NULL COMMENT 'If RJ11, link to printer device',
  `esc_pos_command` varchar(50) NOT NULL DEFAULT '27,112,0,60,120' COMMENT 'ESC/POS command for drawer open',
  `voltage` enum('12V','24V') NOT NULL DEFAULT '12V' COMMENT 'Drawer solenoid voltage',
  `network_ip` varchar(45) DEFAULT NULL COMMENT 'IP address for network drawers',
  `network_port` int(11) DEFAULT 9100 COMMENT 'Port for network drawers',
  `serial_port` varchar(50) DEFAULT NULL COMMENT 'COM port for serial drawers',
  `serial_baud_rate` int(11) DEFAULT 9600 COMMENT 'Baud rate for serial connection',
  `usb_vendor_id` varchar(10) DEFAULT NULL COMMENT 'USB vendor ID',
  `usb_product_id` varchar(10) DEFAULT NULL COMMENT 'USB product ID',
  `connection_config` text DEFAULT NULL COMMENT 'JSON config for advanced settings',
  `status` tinyint(1) NOT NULL DEFAULT 1 COMMENT 'Enable/disable drawer',
  `auto_open_on_cash` tinyint(1) NOT NULL DEFAULT 1 COMMENT 'Auto-open when cash payment is processed',
  `test_on_save` tinyint(1) NOT NULL DEFAULT 1 COMMENT 'Test connection when saving configuration',
  `description` text DEFAULT NULL COMMENT 'Additional notes or description',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`drawer_id`),
  KEY `idx_location_id` (`location_id`),
  KEY `idx_pos_device_id` (`pos_device_id`),
  KEY `idx_connection_type` (`connection_type`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Cash drawer devices configuration';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_categories`
--

DROP TABLE IF EXISTS `ti_categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_categories` (
  `category_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(128) NOT NULL,
  `description` text DEFAULT NULL,
  `parent_id` int(11) DEFAULT NULL,
  `priority` int(11) NOT NULL DEFAULT 0,
  `status` tinyint(1) NOT NULL DEFAULT 1,
  `nest_left` int(11) DEFAULT NULL,
  `nest_right` int(11) DEFAULT NULL,
  `permalink_slug` varchar(128) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`category_id`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_countries`
--

DROP TABLE IF EXISTS `ti_countries`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_countries` (
  `country_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `country_name` varchar(128) NOT NULL,
  `iso_code_2` varchar(2) DEFAULT NULL,
  `iso_code_3` varchar(3) DEFAULT NULL,
  `format` text DEFAULT NULL,
  `status` tinyint(1) NOT NULL DEFAULT 0,
  `priority` int(11) NOT NULL DEFAULT 999,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`country_id`)
) ENGINE=InnoDB AUTO_INCREMENT=240 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_currencies`
--

DROP TABLE IF EXISTS `ti_currencies`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_currencies` (
  `currency_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `country_id` int(11) NOT NULL,
  `currency_name` varchar(128) NOT NULL,
  `currency_code` varchar(3) NOT NULL,
  `currency_symbol` varchar(3) NOT NULL,
  `currency_rate` decimal(15,8) NOT NULL,
  `symbol_position` tinyint(1) DEFAULT NULL,
  `thousand_sign` char(1) NOT NULL,
  `decimal_sign` char(1) NOT NULL,
  `decimal_position` char(1) NOT NULL,
  `iso_alpha2` varchar(2) DEFAULT NULL,
  `iso_alpha3` varchar(3) DEFAULT NULL,
  `iso_numeric` int(11) DEFAULT NULL,
  `currency_status` int(11) DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL,
  PRIMARY KEY (`currency_id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_customer_groups`
--

DROP TABLE IF EXISTS `ti_customer_groups`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_customer_groups` (
  `customer_group_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `group_name` varchar(32) NOT NULL,
  `description` text DEFAULT NULL,
  `approval` tinyint(1) NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`customer_group_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_customers`
--

DROP TABLE IF EXISTS `ti_customers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_customers` (
  `customer_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `first_name` varchar(128) NOT NULL,
  `last_name` varchar(128) NOT NULL,
  `email` varchar(96) NOT NULL,
  `password` varchar(128) NOT NULL,
  `telephone` varchar(32) DEFAULT NULL,
  `address_id` int(11) DEFAULT NULL,
  `newsletter` tinyint(1) DEFAULT NULL,
  `customer_group_id` int(11) NOT NULL,
  `ip_address` varchar(40) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `status` tinyint(1) NOT NULL,
  `reset_code` varchar(128) DEFAULT NULL,
  `reset_time` datetime DEFAULT NULL,
  `activation_code` varchar(128) DEFAULT NULL,
  `remember_token` varchar(128) DEFAULT NULL,
  `is_activated` tinyint(1) DEFAULT NULL,
  `date_activated` datetime DEFAULT NULL,
  `last_login` datetime DEFAULT NULL,
  `last_seen` datetime DEFAULT NULL,
  `updated_at` timestamp NOT NULL,
  `last_location_area` text NOT NULL,
  PRIMARY KEY (`customer_id`),
  UNIQUE KEY `ti_customers_email_unique` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_extension_settings`
--

DROP TABLE IF EXISTS `ti_extension_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_extension_settings` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `item` varchar(128) NOT NULL,
  `data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`data`)),
  PRIMARY KEY (`id`),
  UNIQUE KEY `ti_extension_settings_item_unique` (`item`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_extensions`
--

DROP TABLE IF EXISTS `ti_extensions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_extensions` (
  `extension_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(128) NOT NULL,
  `version` varchar(32) DEFAULT '1.0.0',
  PRIMARY KEY (`extension_id`),
  UNIQUE KEY `ti_extensions_name_unique` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_failed_jobs`
--

DROP TABLE IF EXISTS `ti_failed_jobs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_failed_jobs` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `uuid` varchar(128) DEFAULT NULL,
  `connection` text NOT NULL,
  `queue` text NOT NULL,
  `payload` longtext NOT NULL,
  `exception` longtext NOT NULL,
  `failed_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `ti_failed_jobs_uuid_unique` (`uuid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_igniter_automation_logs`
--

DROP TABLE IF EXISTS `ti_igniter_automation_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_igniter_automation_logs` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `automation_rule_id` bigint(20) unsigned DEFAULT NULL,
  `rule_action_id` bigint(20) unsigned DEFAULT NULL,
  `is_success` tinyint(1) NOT NULL,
  `message` text NOT NULL,
  `params` text DEFAULT NULL,
  `exception` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `ti_igniter_automation_logs_automation_rule_id_foreign` (`automation_rule_id`),
  KEY `ti_igniter_automation_logs_rule_action_id_foreign` (`rule_action_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_igniter_automation_rule_actions`
--

DROP TABLE IF EXISTS `ti_igniter_automation_rule_actions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_igniter_automation_rule_actions` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `automation_rule_id` bigint(20) unsigned DEFAULT NULL,
  `class_name` varchar(128) NOT NULL,
  `options` text NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `ti_igniter_actions_automation_rule_id_foreign` (`automation_rule_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_igniter_automation_rule_conditions`
--

DROP TABLE IF EXISTS `ti_igniter_automation_rule_conditions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_igniter_automation_rule_conditions` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `automation_rule_id` bigint(20) unsigned DEFAULT NULL,
  `class_name` varchar(128) NOT NULL,
  `options` text NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `ti_igniter_conditions_automation_rule_id_foreign` (`automation_rule_id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_igniter_automation_rules`
--

DROP TABLE IF EXISTS `ti_igniter_automation_rules`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_igniter_automation_rules` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(128) NOT NULL,
  `code` varchar(128) NOT NULL,
  `description` varchar(128) NOT NULL,
  `event_class` text DEFAULT NULL,
  `config_data` text DEFAULT NULL,
  `is_custom` tinyint(1) NOT NULL DEFAULT 0,
  `status` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_igniter_cart_cart`
--

DROP TABLE IF EXISTS `ti_igniter_cart_cart`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_igniter_cart_cart` (
  `identifier` varchar(128) NOT NULL,
  `instance` varchar(128) NOT NULL,
  `data` longtext NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`identifier`,`instance`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_igniter_coupon_categories`
--

DROP TABLE IF EXISTS `ti_igniter_coupon_categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_igniter_coupon_categories` (
  `coupon_id` int(10) unsigned NOT NULL,
  `category_id` int(10) unsigned NOT NULL,
  UNIQUE KEY `ti_igniter_coupon_categories_coupon_id_category_id_unique` (`coupon_id`,`category_id`),
  KEY `ti_igniter_coupon_categories_coupon_id_index` (`coupon_id`),
  KEY `ti_igniter_coupon_categories_category_id_index` (`category_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_igniter_coupon_customer_groups`
--

DROP TABLE IF EXISTS `ti_igniter_coupon_customer_groups`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_igniter_coupon_customer_groups` (
  `coupon_id` bigint(20) unsigned NOT NULL,
  `customer_group_id` bigint(20) unsigned NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_igniter_coupon_customers`
--

DROP TABLE IF EXISTS `ti_igniter_coupon_customers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_igniter_coupon_customers` (
  `coupon_id` bigint(20) unsigned NOT NULL,
  `customer_id` bigint(20) unsigned NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_igniter_coupon_menus`
--

DROP TABLE IF EXISTS `ti_igniter_coupon_menus`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_igniter_coupon_menus` (
  `coupon_id` int(10) unsigned NOT NULL,
  `menu_id` int(10) unsigned NOT NULL,
  UNIQUE KEY `ti_igniter_coupon_menus_coupon_id_menu_id_unique` (`coupon_id`,`menu_id`),
  KEY `ti_igniter_coupon_menus_coupon_id_index` (`coupon_id`),
  KEY `ti_igniter_coupon_menus_menu_id_index` (`menu_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_igniter_coupons`
--

DROP TABLE IF EXISTS `ti_igniter_coupons`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_igniter_coupons` (
  `coupon_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(128) NOT NULL,
  `code` varchar(128) NOT NULL,
  `type` char(1) NOT NULL,
  `discount` decimal(15,4) DEFAULT NULL,
  `min_total` decimal(15,4) DEFAULT NULL,
  `redemptions` int(11) NOT NULL DEFAULT 0,
  `customer_redemptions` int(11) NOT NULL DEFAULT 0,
  `description` text DEFAULT NULL,
  `status` tinyint(1) DEFAULT NULL,
  `created_at` date NOT NULL,
  `validity` char(15) DEFAULT NULL,
  `fixed_date` date DEFAULT NULL,
  `fixed_from_time` time DEFAULT NULL,
  `fixed_to_time` time DEFAULT NULL,
  `period_start_date` date DEFAULT NULL,
  `period_end_date` date DEFAULT NULL,
  `recurring_every` varchar(35) DEFAULT NULL,
  `recurring_from_time` time DEFAULT NULL,
  `recurring_to_time` time DEFAULT NULL,
  `order_restriction` text DEFAULT NULL,
  `apply_coupon_on` enum('whole_cart','menu_items','delivery_fee') NOT NULL DEFAULT 'whole_cart',
  `auto_apply` tinyint(1) NOT NULL DEFAULT 0,
  `updated_at` timestamp NOT NULL,
  PRIMARY KEY (`coupon_id`),
  UNIQUE KEY `code` (`code`),
  UNIQUE KEY `ti_igniter_coupons_code_unique` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_igniter_coupons_history`
--

DROP TABLE IF EXISTS `ti_igniter_coupons_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_igniter_coupons_history` (
  `coupon_history_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `coupon_id` bigint(20) unsigned NOT NULL,
  `order_id` bigint(20) unsigned DEFAULT NULL,
  `customer_id` bigint(20) unsigned DEFAULT NULL,
  `code` varchar(15) NOT NULL,
  `min_total` decimal(15,4) DEFAULT NULL,
  `amount` decimal(15,4) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `status` tinyint(1) NOT NULL,
  `updated_at` timestamp NOT NULL,
  PRIMARY KEY (`coupon_history_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_igniter_frontend_banners`
--

DROP TABLE IF EXISTS `ti_igniter_frontend_banners`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_igniter_frontend_banners` (
  `banner_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(128) NOT NULL,
  `type` char(8) NOT NULL,
  `click_url` varchar(128) DEFAULT NULL,
  `language_id` int(11) NOT NULL,
  `alt_text` varchar(128) DEFAULT NULL,
  `image_code` text DEFAULT NULL,
  `custom_code` text DEFAULT NULL,
  `status` tinyint(1) NOT NULL,
  PRIMARY KEY (`banner_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_igniter_frontend_sliders`
--

DROP TABLE IF EXISTS `ti_igniter_frontend_sliders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_igniter_frontend_sliders` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(128) NOT NULL,
  `code` varchar(128) NOT NULL,
  `metadata` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ti_igniter_frontend_sliders_code_unique` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_igniter_frontend_subscribers`
--

DROP TABLE IF EXISTS `ti_igniter_frontend_subscribers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_igniter_frontend_subscribers` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) DEFAULT NULL,
  `email` varchar(128) NOT NULL,
  `statistics` int(11) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_igniter_pages_menu_items`
--

DROP TABLE IF EXISTS `ti_igniter_pages_menu_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_igniter_pages_menu_items` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `menu_id` int(10) unsigned NOT NULL,
  `parent_id` int(10) unsigned DEFAULT NULL,
  `title` varchar(128) NOT NULL,
  `code` varchar(128) NOT NULL,
  `description` varchar(128) DEFAULT NULL,
  `type` varchar(128) NOT NULL,
  `url` varchar(128) DEFAULT NULL,
  `reference` varchar(128) DEFAULT NULL,
  `config` text DEFAULT NULL,
  `nest_left` int(11) DEFAULT NULL,
  `nest_right` int(11) DEFAULT NULL,
  `priority` int(11) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `ti_igniter_pages_menu_items_menu_id_index` (`menu_id`),
  KEY `ti_igniter_pages_menu_items_parent_id_index` (`parent_id`)
) ENGINE=InnoDB AUTO_INCREMENT=40 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_igniter_pages_menus`
--

DROP TABLE IF EXISTS `ti_igniter_pages_menus`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_igniter_pages_menus` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `theme_code` varchar(128) NOT NULL,
  `name` varchar(128) NOT NULL,
  `code` varchar(128) NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `ti_igniter_pages_menus_theme_code_index` (`theme_code`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_igniter_reviews`
--

DROP TABLE IF EXISTS `ti_igniter_reviews`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_igniter_reviews` (
  `review_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `customer_id` bigint(20) unsigned DEFAULT NULL,
  `sale_id` bigint(20) unsigned DEFAULT NULL,
  `sale_type` varchar(32) NOT NULL DEFAULT '',
  `author` varchar(128) DEFAULT NULL,
  `location_id` bigint(20) unsigned DEFAULT NULL,
  `quality` int(11) NOT NULL,
  `delivery` int(11) NOT NULL,
  `service` int(11) NOT NULL,
  `review_text` text DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `review_status` tinyint(1) NOT NULL,
  `updated_at` timestamp NOT NULL,
  PRIMARY KEY (`review_id`),
  KEY `ti_igniter_reviews_review_id_sale_type_sale_id_index` (`review_id`,`sale_type`,`sale_id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_igniter_socialite_providers`
--

DROP TABLE IF EXISTS `ti_igniter_socialite_providers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_igniter_socialite_providers` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int(10) unsigned DEFAULT NULL,
  `provider` varchar(255) DEFAULT NULL,
  `provider_id` varchar(255) DEFAULT NULL,
  `token` varchar(255) DEFAULT NULL,
  `user_type` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `provider_token_index` (`provider`,`token`),
  KEY `ti_igniter_socialite_providers_user_id_index` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_job_batches`
--

DROP TABLE IF EXISTS `ti_job_batches`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_job_batches` (
  `id` varchar(128) NOT NULL,
  `name` varchar(128) NOT NULL,
  `total_jobs` int(11) NOT NULL,
  `pending_jobs` int(11) NOT NULL,
  `failed_jobs` int(11) NOT NULL,
  `failed_job_ids` text NOT NULL,
  `options` mediumtext DEFAULT NULL,
  `cancelled_at` int(11) DEFAULT NULL,
  `created_at` int(11) NOT NULL,
  `finished_at` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_jobs`
--

DROP TABLE IF EXISTS `ti_jobs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_jobs` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `queue` varchar(128) NOT NULL,
  `payload` longtext NOT NULL,
  `attempts` tinyint(3) unsigned NOT NULL,
  `reserved_at` int(10) unsigned DEFAULT NULL,
  `available_at` int(10) unsigned NOT NULL,
  `created_at` int(10) unsigned NOT NULL,
  PRIMARY KEY (`id`),
  KEY `ti_jobs_queue_index` (`queue`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_language_translations`
--

DROP TABLE IF EXISTS `ti_language_translations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_language_translations` (
  `translation_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `locale` varchar(10) NOT NULL,
  `namespace` varchar(128) NOT NULL DEFAULT '*',
  `group` varchar(128) NOT NULL,
  `item` varchar(128) NOT NULL,
  `text` text NOT NULL,
  `unstable` tinyint(1) NOT NULL DEFAULT 0,
  `locked` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`translation_id`),
  UNIQUE KEY `ti_language_translations_locale_namespace_group_item_unique` (`locale`,`namespace`,`group`,`item`),
  KEY `ti_language_translations_group_index` (`group`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_languages`
--

DROP TABLE IF EXISTS `ti_languages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_languages` (
  `language_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `code` varchar(32) NOT NULL,
  `name` varchar(128) NOT NULL,
  `image` varchar(128) DEFAULT NULL,
  `idiom` varchar(128) NOT NULL,
  `status` tinyint(1) NOT NULL,
  `can_delete` tinyint(1) NOT NULL,
  `original_id` int(11) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `version` varchar(128) DEFAULT NULL,
  PRIMARY KEY (`language_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_location_areas`
--

DROP TABLE IF EXISTS `ti_location_areas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_location_areas` (
  `area_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `location_id` int(11) NOT NULL,
  `name` varchar(128) NOT NULL,
  `type` varchar(32) NOT NULL,
  `boundaries` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`boundaries`)),
  `conditions` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`conditions`)),
  `color` varchar(40) DEFAULT NULL,
  `is_default` tinyint(1) NOT NULL DEFAULT 0,
  `priority` int(11) NOT NULL DEFAULT 0,
  PRIMARY KEY (`area_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_location_options`
--

DROP TABLE IF EXISTS `ti_location_options`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_location_options` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `location_id` bigint(20) unsigned NOT NULL,
  `item` varchar(128) NOT NULL,
  `value` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`value`)),
  PRIMARY KEY (`id`),
  UNIQUE KEY `ti_location_options_location_id_item_unique` (`location_id`,`item`)
) ENGINE=InnoDB AUTO_INCREMENT=30 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_locationables`
--

DROP TABLE IF EXISTS `ti_locationables`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_locationables` (
  `location_id` int(11) NOT NULL,
  `locationable_id` int(11) NOT NULL,
  `locationable_type` varchar(128) NOT NULL,
  `options` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_locations`
--

DROP TABLE IF EXISTS `ti_locations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_locations` (
  `location_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `location_name` varchar(128) NOT NULL,
  `location_email` varchar(96) NOT NULL,
  `description` text DEFAULT NULL,
  `location_address_1` varchar(128) DEFAULT NULL,
  `location_address_2` varchar(128) DEFAULT NULL,
  `location_city` varchar(128) DEFAULT NULL,
  `location_state` varchar(128) DEFAULT NULL,
  `location_postcode` varchar(10) DEFAULT NULL,
  `location_country_id` int(11) DEFAULT NULL,
  `location_telephone` text DEFAULT NULL,
  `location_lat` double DEFAULT NULL,
  `location_lng` double DEFAULT NULL,
  `location_radius` int(11) DEFAULT NULL,
  `location_status` tinyint(1) DEFAULT NULL,
  `permalink_slug` varchar(128) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`location_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_logos`
--

DROP TABLE IF EXISTS `ti_logos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_logos` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `dashboard_logo` text DEFAULT NULL,
  `loader_logo` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_mail_layouts`
--

DROP TABLE IF EXISTS `ti_mail_layouts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_mail_layouts` (
  `layout_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(128) NOT NULL,
  `language_id` int(11) NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `status` tinyint(1) NOT NULL,
  `code` varchar(128) NOT NULL,
  `layout` text DEFAULT NULL,
  `plain_layout` text DEFAULT NULL,
  `layout_css` text DEFAULT NULL,
  `is_locked` tinyint(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (`layout_id`),
  UNIQUE KEY `ti_mail_layouts_code_unique` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_mail_partials`
--

DROP TABLE IF EXISTS `ti_mail_partials`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_mail_partials` (
  `partial_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(128) DEFAULT NULL,
  `code` varchar(128) DEFAULT NULL,
  `html` text DEFAULT NULL,
  `text` text DEFAULT NULL,
  `is_custom` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`partial_id`),
  UNIQUE KEY `ti_mail_partials_code_unique` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_mail_templates`
--

DROP TABLE IF EXISTS `ti_mail_templates`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_mail_templates` (
  `template_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `layout_id` int(11) NOT NULL,
  `code` varchar(128) NOT NULL,
  `subject` varchar(128) NOT NULL,
  `body` text NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `label` varchar(128) DEFAULT NULL,
  `is_custom` tinyint(1) DEFAULT NULL,
  `plain_body` text DEFAULT NULL,
  PRIMARY KEY (`template_id`),
  UNIQUE KEY `ti_mail_templates_data_template_id_code_unique` (`layout_id`,`code`)
) ENGINE=InnoDB AUTO_INCREMENT=19 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_mealtimes`
--

DROP TABLE IF EXISTS `ti_mealtimes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_mealtimes` (
  `mealtime_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `mealtime_name` varchar(128) NOT NULL,
  `start_time` time NOT NULL DEFAULT '00:00:00',
  `end_time` time NOT NULL DEFAULT '23:59:59',
  `mealtime_status` tinyint(1) NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`mealtime_id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_media_attachments`
--

DROP TABLE IF EXISTS `ti_media_attachments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_media_attachments` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `disk` varchar(128) NOT NULL,
  `name` varchar(128) NOT NULL,
  `file_name` varchar(128) NOT NULL,
  `mime_type` varchar(128) NOT NULL,
  `size` int(10) unsigned NOT NULL,
  `tag` varchar(128) DEFAULT NULL,
  `attachment_type` varchar(128) DEFAULT NULL,
  `attachment_id` bigint(20) unsigned DEFAULT NULL,
  `is_public` tinyint(1) NOT NULL DEFAULT 1,
  `custom_properties` text DEFAULT NULL,
  `priority` int(10) unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `ti_media_attachments_attachment_type_attachment_id_index` (`attachment_type`,`attachment_id`),
  KEY `ti_media_attachments_tag_index` (`tag`)
) ENGINE=InnoDB AUTO_INCREMENT=19 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_menu_categories`
--

DROP TABLE IF EXISTS `ti_menu_categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_menu_categories` (
  `menu_id` int(10) unsigned NOT NULL,
  `category_id` int(10) unsigned NOT NULL,
  UNIQUE KEY `ti_menu_categories_menu_id_category_id_unique` (`menu_id`,`category_id`),
  KEY `ti_menu_categories_menu_id_index` (`menu_id`),
  KEY `ti_menu_categories_category_id_index` (`category_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_menu_images`
--

DROP TABLE IF EXISTS `ti_menu_images`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_menu_images` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `menu_id` int(10) unsigned NOT NULL,
  `image_path` varchar(255) NOT NULL,
  `sort_order` int(10) unsigned NOT NULL DEFAULT 1,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `ti_menu_images_menu_id_sort_order_index` (`menu_id`,`sort_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_menu_item_option_values`
--

DROP TABLE IF EXISTS `ti_menu_item_option_values`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_menu_item_option_values` (
  `menu_option_value_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `menu_option_id` int(11) NOT NULL,
  `option_value_id` int(11) NOT NULL,
  `new_price` decimal(15,4) DEFAULT NULL,
  `priority` int(11) NOT NULL DEFAULT 0,
  `is_default` tinyint(1) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`menu_option_value_id`)
) ENGINE=InnoDB AUTO_INCREMENT=22 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_menu_item_options`
--

DROP TABLE IF EXISTS `ti_menu_item_options`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_menu_item_options` (
  `menu_option_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `option_id` int(11) NOT NULL,
  `menu_id` int(11) NOT NULL,
  `required` tinyint(1) NOT NULL DEFAULT 0,
  `priority` int(11) NOT NULL DEFAULT 0,
  `min_selected` int(11) NOT NULL DEFAULT 0,
  `max_selected` int(11) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`menu_option_id`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_menu_mealtimes`
--

DROP TABLE IF EXISTS `ti_menu_mealtimes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_menu_mealtimes` (
  `menu_id` int(10) unsigned NOT NULL,
  `mealtime_id` int(10) unsigned NOT NULL,
  UNIQUE KEY `ti_menu_mealtimes_menu_id_mealtime_id_unique` (`menu_id`,`mealtime_id`),
  KEY `ti_menu_mealtimes_menu_id_index` (`menu_id`),
  KEY `ti_menu_mealtimes_mealtime_id_index` (`mealtime_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_menu_option_values`
--

DROP TABLE IF EXISTS `ti_menu_option_values`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_menu_option_values` (
  `option_value_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `option_id` int(11) NOT NULL,
  `value` varchar(128) NOT NULL,
  `price` decimal(15,4) DEFAULT NULL,
  `priority` int(11) NOT NULL DEFAULT 0,
  PRIMARY KEY (`option_value_id`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_menu_options`
--

DROP TABLE IF EXISTS `ti_menu_options`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_menu_options` (
  `option_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `option_name` varchar(128) NOT NULL,
  `display_type` varchar(128) NOT NULL,
  `priority` int(11) NOT NULL DEFAULT 0,
  `update_related_menu_item` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`option_id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_menus`
--

DROP TABLE IF EXISTS `ti_menus`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_menus` (
  `menu_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `menu_name` varchar(128) NOT NULL,
  `menu_description` text NOT NULL,
  `menu_price` decimal(15,4) NOT NULL,
  `minimum_qty` int(11) NOT NULL DEFAULT 0,
  `menu_status` tinyint(1) NOT NULL,
  `is_chef_recommended` tinyint(1) NOT NULL DEFAULT 0,
  `is_manual_bestseller` tinyint(1) NOT NULL DEFAULT 0,
  `bestseller_override_mode` varchar(20) NOT NULL DEFAULT 'auto',
  `menu_priority` int(11) NOT NULL DEFAULT 0,
  `order_restriction` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `is_halal` tinyint(1) NOT NULL DEFAULT 0,
  `is_vegetarian` tinyint(1) NOT NULL DEFAULT 0,
  `is_vegan` tinyint(1) NOT NULL DEFAULT 0,
  `calories` int(10) unsigned DEFAULT NULL,
  `protein` decimal(8,2) DEFAULT NULL,
  `carbs` decimal(8,2) DEFAULT NULL,
  `fat` decimal(8,2) DEFAULT NULL,
  `sugar` decimal(8,2) DEFAULT NULL,
  `serving_size` varchar(64) DEFAULT NULL,
  `color` varchar(40) DEFAULT NULL,
  PRIMARY KEY (`menu_id`)
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_menus_specials`
--

DROP TABLE IF EXISTS `ti_menus_specials`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_menus_specials` (
  `special_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `menu_id` int(11) NOT NULL DEFAULT 0,
  `start_date` datetime DEFAULT current_timestamp(),
  `end_date` datetime DEFAULT current_timestamp(),
  `special_price` decimal(15,4) DEFAULT NULL,
  `special_status` tinyint(1) NOT NULL,
  `type` varchar(128) NOT NULL,
  `validity` varchar(128) NOT NULL,
  `recurring_every` text DEFAULT NULL,
  `recurring_from` time DEFAULT NULL,
  `recurring_to` time DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`special_id`),
  UNIQUE KEY `ti_menus_specials_special_id_menu_id_unique` (`special_id`,`menu_id`)
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_migrations`
--

DROP TABLE IF EXISTS `ti_migrations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_migrations` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `group` varchar(128) NOT NULL,
  `migration` varchar(128) NOT NULL,
  `batch` int(11) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=122 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_order_menu_options`
--

DROP TABLE IF EXISTS `ti_order_menu_options`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_order_menu_options` (
  `order_option_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `order_id` int(11) NOT NULL,
  `menu_id` int(11) NOT NULL,
  `order_option_name` varchar(128) NOT NULL,
  `order_option_price` decimal(15,4) DEFAULT NULL,
  `order_menu_id` int(11) NOT NULL,
  `order_menu_option_id` int(11) NOT NULL,
  `menu_option_value_id` int(11) NOT NULL,
  `quantity` int(11) DEFAULT 1,
  PRIMARY KEY (`order_option_id`)
) ENGINE=InnoDB AUTO_INCREMENT=225 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_order_menus`
--

DROP TABLE IF EXISTS `ti_order_menus`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_order_menus` (
  `order_menu_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `order_id` int(11) NOT NULL,
  `menu_id` int(11) NOT NULL,
  `name` varchar(128) NOT NULL,
  `quantity` int(11) NOT NULL,
  `price` decimal(15,4) DEFAULT NULL,
  `subtotal` decimal(15,4) DEFAULT NULL,
  `option_values` text DEFAULT NULL,
  `comment` text DEFAULT NULL,
  PRIMARY KEY (`order_menu_id`)
) ENGINE=InnoDB AUTO_INCREMENT=508 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_order_totals`
--

DROP TABLE IF EXISTS `ti_order_totals`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_order_totals` (
  `order_total_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `order_id` int(10) unsigned NOT NULL,
  `code` varchar(128) NOT NULL,
  `title` varchar(128) NOT NULL,
  `value` decimal(15,4) NOT NULL,
  `priority` tinyint(1) NOT NULL DEFAULT 0,
  `is_summable` tinyint(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (`order_total_id`)
) ENGINE=InnoDB AUTO_INCREMENT=540 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_orders`
--

DROP TABLE IF EXISTS `ti_orders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_orders` (
  `order_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `customer_id` int(11) DEFAULT NULL,
  `first_name` varchar(128) NOT NULL,
  `last_name` varchar(128) NOT NULL,
  `email` varchar(96) NOT NULL,
  `telephone` varchar(128) NOT NULL,
  `location_id` int(11) NOT NULL,
  `address_id` int(11) DEFAULT NULL,
  `cart` text NOT NULL,
  `total_items` int(11) NOT NULL,
  `comment` text DEFAULT NULL,
  `payment` varchar(128) NOT NULL,
  `order_type` varchar(128) NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `order_time` time NOT NULL,
  `order_date` date NOT NULL,
  `order_total` decimal(15,4) DEFAULT NULL,
  `status_id` int(11) NOT NULL,
  `ip_address` varchar(40) NOT NULL,
  `user_agent` varchar(128) NOT NULL,
  `assignee_id` int(11) DEFAULT NULL,
  `assignee_group_id` int(10) unsigned DEFAULT NULL,
  `invoice_prefix` varchar(128) DEFAULT NULL,
  `invoice_date` datetime DEFAULT NULL,
  `hash` varchar(40) DEFAULT NULL,
  `processed` tinyint(1) DEFAULT NULL,
  `status_updated_at` datetime DEFAULT NULL,
  `assignee_updated_at` datetime DEFAULT NULL,
  `order_time_is_asap` tinyint(1) NOT NULL DEFAULT 0,
  `delivery_comment` text DEFAULT NULL,
  `ms_order_type` varchar(255) NOT NULL DEFAULT '',
  PRIMARY KEY (`order_id`),
  KEY `ti_orders_hash_index` (`hash`)
) ENGINE=InnoDB AUTO_INCREMENT=191 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_pages`
--

DROP TABLE IF EXISTS `ti_pages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_pages` (
  `page_id` bigint(20) unsigned NOT NULL,
  `language_id` bigint(20) unsigned NOT NULL,
  `title` varchar(128) NOT NULL,
  `content` mediumtext NOT NULL,
  `meta_description` varchar(128) DEFAULT NULL,
  `meta_keywords` varchar(128) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `status` tinyint(1) NOT NULL,
  `permalink_slug` varchar(128) DEFAULT NULL,
  `layout` varchar(128) DEFAULT NULL,
  `metadata` mediumtext DEFAULT NULL,
  `priority` int(11) DEFAULT NULL,
  PRIMARY KEY (`page_id`),
  KEY `ti_pages_language_id_foreign` (`language_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_payment_logs`
--

DROP TABLE IF EXISTS `ti_payment_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_payment_logs` (
  `payment_log_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `order_id` int(11) NOT NULL,
  `payment_name` varchar(128) NOT NULL,
  `message` varchar(128) NOT NULL,
  `request` text DEFAULT NULL,
  `response` text DEFAULT NULL,
  `is_success` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `payment_code` varchar(128) NOT NULL,
  `is_refundable` tinyint(1) NOT NULL DEFAULT 0,
  `refunded_at` datetime DEFAULT NULL,
  PRIMARY KEY (`payment_log_id`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_payment_profiles`
--

DROP TABLE IF EXISTS `ti_payment_profiles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_payment_profiles` (
  `payment_profile_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `customer_id` int(10) unsigned DEFAULT NULL,
  `payment_id` int(10) unsigned DEFAULT NULL,
  `card_brand` varchar(128) DEFAULT NULL,
  `card_last4` varchar(128) DEFAULT NULL,
  `profile_data` text DEFAULT NULL,
  `is_primary` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`payment_profile_id`),
  KEY `ti_payment_profiles_customer_id_index` (`customer_id`),
  KEY `ti_payment_profiles_payment_id_index` (`payment_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_payments`
--

DROP TABLE IF EXISTS `ti_payments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_payments` (
  `payment_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(128) NOT NULL,
  `code` varchar(128) NOT NULL,
  `class_name` text NOT NULL,
  `description` text DEFAULT NULL,
  `data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`data`)),
  `status` tinyint(1) NOT NULL DEFAULT 0,
  `is_default` tinyint(1) NOT NULL DEFAULT 0,
  `priority` int(11) NOT NULL DEFAULT 0,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`payment_id`),
  UNIQUE KEY `ti_payments_code_unique` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_qr_code`
--

DROP TABLE IF EXISTS `ti_qr_code`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_qr_code` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `qr_code` varchar(30) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_request_logs`
--

DROP TABLE IF EXISTS `ti_request_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_request_logs` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `url` varchar(128) DEFAULT NULL,
  `status_code` int(11) DEFAULT NULL,
  `referrer` text DEFAULT NULL,
  `count` int(11) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=121 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_reservation_tables`
--

DROP TABLE IF EXISTS `ti_reservation_tables`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_reservation_tables` (
  `reservation_id` int(10) unsigned NOT NULL,
  `table_id` int(10) unsigned NOT NULL,
  UNIQUE KEY `ti_reservation_tables_reservation_id_table_id_unique` (`reservation_id`,`table_id`),
  KEY `ti_reservation_tables_reservation_id_index` (`reservation_id`),
  KEY `ti_reservation_tables_table_id_index` (`table_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_reservations`
--

DROP TABLE IF EXISTS `ti_reservations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_reservations` (
  `reservation_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `location_id` int(11) NOT NULL,
  `table_id` int(11) NOT NULL,
  `guest_num` int(11) NOT NULL,
  `occasion_id` int(11) DEFAULT NULL,
  `customer_id` int(11) DEFAULT NULL,
  `first_name` varchar(128) NOT NULL,
  `last_name` varchar(128) NOT NULL,
  `email` varchar(96) NOT NULL,
  `telephone` varchar(128) NOT NULL,
  `comment` text DEFAULT NULL,
  `reserve_time` time NOT NULL,
  `reserve_date` date NOT NULL,
  `created_at` date NOT NULL,
  `updated_at` date NOT NULL,
  `assignee_id` int(11) DEFAULT NULL,
  `assignee_group_id` int(10) unsigned DEFAULT NULL,
  `notify` tinyint(1) DEFAULT NULL,
  `ip_address` varchar(40) NOT NULL,
  `user_agent` varchar(128) NOT NULL,
  `status_id` tinyint(1) NOT NULL,
  `hash` varchar(40) DEFAULT NULL,
  `duration` int(11) DEFAULT NULL,
  `processed` tinyint(1) DEFAULT NULL,
  `status_updated_at` datetime DEFAULT NULL,
  `assignee_updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`reservation_id`),
  KEY `ti_reservations_location_id_table_id_index` (`location_id`,`table_id`),
  KEY `ti_reservations_hash_index` (`hash`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_sessions`
--

DROP TABLE IF EXISTS `ti_sessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_sessions` (
  `id` varchar(128) NOT NULL,
  `payload` text DEFAULT NULL,
  `last_activity` int(11) DEFAULT NULL,
  UNIQUE KEY `ti_sessions_id_unique` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_settings`
--

DROP TABLE IF EXISTS `ti_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_settings` (
  `setting_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `sort` varchar(45) NOT NULL,
  `item` varchar(128) NOT NULL,
  `value` text DEFAULT NULL,
  `serialized` tinyint(1) DEFAULT NULL,
  PRIMARY KEY (`setting_id`),
  UNIQUE KEY `ti_settings_sort_item_unique` (`sort`,`item`)
) ENGINE=InnoDB AUTO_INCREMENT=165 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_staff_groups`
--

DROP TABLE IF EXISTS `ti_staff_groups`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_staff_groups` (
  `staff_group_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `staff_group_name` varchar(32) NOT NULL,
  `description` text NOT NULL,
  `auto_assign` tinyint(1) DEFAULT 0,
  `auto_assign_mode` tinyint(4) DEFAULT 1,
  `auto_assign_limit` int(11) DEFAULT 20,
  `auto_assign_availability` tinyint(1) DEFAULT 1,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`staff_group_id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_staff_roles`
--

DROP TABLE IF EXISTS `ti_staff_roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_staff_roles` (
  `staff_role_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(128) NOT NULL,
  `code` varchar(128) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `permissions` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`staff_role_id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_staffs`
--

DROP TABLE IF EXISTS `ti_staffs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_staffs` (
  `staff_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `staff_name` varchar(128) NOT NULL,
  `staff_email` varchar(96) NOT NULL,
  `card_id` varchar(255) DEFAULT NULL,
  `rfid_card_uid` varchar(100) DEFAULT NULL,
  `fingerprint_template` text DEFAULT NULL,
  `face_template` text DEFAULT NULL,
  `pin_code` varchar(255) DEFAULT NULL,
  `biometric_enabled` tinyint(1) NOT NULL DEFAULT 0,
  `enrollment_status` enum('not_enrolled','enrolled','pending','failed') NOT NULL DEFAULT 'not_enrolled',
  `enrolled_at` timestamp NULL DEFAULT NULL,
  `enrolled_by` bigint(20) unsigned DEFAULT NULL,
  `enrolled_devices` longtext DEFAULT NULL,
  `staff_role_id` int(11) NOT NULL,
  `language_id` int(11) DEFAULT NULL,
  `created_at` date NOT NULL,
  `staff_status` tinyint(1) NOT NULL,
  `sale_permission` tinyint(4) DEFAULT 1,
  `updated_at` timestamp NOT NULL,
  PRIMARY KEY (`staff_id`),
  UNIQUE KEY `staff_email` (`staff_email`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_staffs_groups`
--

DROP TABLE IF EXISTS `ti_staffs_groups`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_staffs_groups` (
  `staff_id` int(10) unsigned NOT NULL,
  `staff_group_id` int(10) unsigned NOT NULL,
  PRIMARY KEY (`staff_id`,`staff_group_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_status_history`
--

DROP TABLE IF EXISTS `ti_status_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_status_history` (
  `status_history_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `object_id` int(11) NOT NULL,
  `object_type` varchar(128) NOT NULL,
  `staff_id` int(11) DEFAULT NULL,
  `status_id` int(11) NOT NULL,
  `notify` tinyint(1) DEFAULT NULL,
  `comment` text DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` timestamp NOT NULL,
  PRIMARY KEY (`status_history_id`)
) ENGINE=InnoDB AUTO_INCREMENT=389 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_statuses`
--

DROP TABLE IF EXISTS `ti_statuses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_statuses` (
  `status_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `status_name` varchar(128) NOT NULL,
  `status_comment` text DEFAULT NULL,
  `notify_customer` tinyint(1) DEFAULT NULL,
  `status_for` varchar(128) NOT NULL,
  `status_color` varchar(128) NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`status_id`)
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_stock_history`
--

DROP TABLE IF EXISTS `ti_stock_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_stock_history` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `stock_id` bigint(20) unsigned NOT NULL,
  `staff_id` bigint(20) unsigned DEFAULT NULL,
  `order_id` bigint(20) unsigned DEFAULT NULL,
  `state` varchar(128) NOT NULL,
  `quantity` bigint(20) NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `ti_stock_history_stock_id_foreign` (`stock_id`),
  KEY `ti_stock_history_order_id_foreign` (`order_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_stocks`
--

DROP TABLE IF EXISTS `ti_stocks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_stocks` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `location_id` bigint(20) unsigned NOT NULL,
  `stockable_id` bigint(20) unsigned NOT NULL,
  `stockable_type` varchar(128) NOT NULL,
  `quantity` bigint(20) DEFAULT NULL,
  `low_stock_alert` tinyint(1) NOT NULL DEFAULT 0,
  `low_stock_threshold` int(11) NOT NULL DEFAULT 0,
  `is_tracked` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `low_stock_alert_sent` tinyint(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_tables`
--

DROP TABLE IF EXISTS `ti_tables`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_tables` (
  `table_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
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
  PRIMARY KEY (`table_id`)
) ENGINE=InnoDB AUTO_INCREMENT=31 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_themes`
--

DROP TABLE IF EXISTS `ti_themes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_themes` (
  `theme_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(128) NOT NULL,
  `code` varchar(128) NOT NULL,
  `description` text DEFAULT NULL,
  `version` varchar(128) DEFAULT '0.0.1',
  `data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`data`)),
  `status` tinyint(1) NOT NULL DEFAULT 0,
  `is_default` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`theme_id`),
  UNIQUE KEY `ti_themes_code_unique` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_user_preferences`
--

DROP TABLE IF EXISTS `ti_user_preferences`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_user_preferences` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `item` varchar(128) NOT NULL,
  `value` text NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_users`
--

DROP TABLE IF EXISTS `ti_users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_users` (
  `user_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `staff_id` int(11) NOT NULL,
  `username` varchar(32) NOT NULL,
  `password` varchar(128) NOT NULL,
  `super_user` tinyint(1) DEFAULT NULL,
  `reset_code` varchar(128) DEFAULT NULL,
  `reset_time` datetime DEFAULT NULL,
  `activation_code` varchar(128) DEFAULT NULL,
  `remember_token` varchar(128) DEFAULT NULL,
  `is_activated` tinyint(1) DEFAULT NULL,
  `date_activated` datetime DEFAULT NULL,
  `last_login` datetime DEFAULT NULL,
  `last_seen` datetime DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `ti_users_staff_id_unique` (`staff_id`),
  UNIQUE KEY `ti_users_username_unique` (`username`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_websockets_statistics_entries`
--

DROP TABLE IF EXISTS `ti_websockets_statistics_entries`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_websockets_statistics_entries` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `app_id` varchar(128) NOT NULL,
  `peak_connection_count` int(11) NOT NULL,
  `websocket_message_count` int(11) NOT NULL,
  `api_message_count` int(11) NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_working_hours`
--

DROP TABLE IF EXISTS `ti_working_hours`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_working_hours` (
  `location_id` int(11) NOT NULL,
  `weekday` int(11) NOT NULL,
  `opening_time` time NOT NULL DEFAULT '00:00:00',
  `closing_time` time NOT NULL DEFAULT '00:00:00',
  `status` tinyint(1) NOT NULL,
  `type` varchar(32) NOT NULL,
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  PRIMARY KEY (`id`),
  KEY `ti_working_hours_location_id_weekday_type_index` (`location_id`,`weekday`,`type`)
) ENGINE=InnoDB AUTO_INCREMENT=22 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping events for database 'persian'
--

--
-- Dumping routines for database 'persian'
--
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-06-09 23:50:20

-- ============================================================
-- DATABASE: newtenantdb
-- ============================================================

/*M!999999\- enable the sandbox mode */ 
-- MariaDB dump 10.19  Distrib 10.11.13-MariaDB, for debian-linux-gnu (x86_64)
--
-- Host: 127.0.0.1    Database: newtenantdb
-- ------------------------------------------------------
-- Server version	10.11.13-MariaDB-0ubuntu0.24.04.1

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Current Database: `newtenantdb`
--

CREATE DATABASE /*!32312 IF NOT EXISTS*/ `newtenantdb` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci */;

USE `newtenantdb`;

--
-- Table structure for table `qr_code`
--

DROP TABLE IF EXISTS `qr_code`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `qr_code` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `qr_code` varchar(30) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_activities`
--

DROP TABLE IF EXISTS `ti_activities`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_activities` (
  `activity_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int(11) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `log_name` varchar(128) DEFAULT NULL,
  `properties` text DEFAULT NULL,
  `subject_id` int(11) DEFAULT NULL,
  `subject_type` varchar(128) DEFAULT NULL,
  `causer_id` int(11) DEFAULT NULL,
  `causer_type` varchar(128) DEFAULT NULL,
  `updated_at` datetime NOT NULL,
  `type` varchar(128) DEFAULT NULL,
  `read_at` datetime DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `user_type` varchar(128) DEFAULT NULL,
  PRIMARY KEY (`activity_id`)
) ENGINE=InnoDB AUTO_INCREMENT=193 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_addresses`
--

DROP TABLE IF EXISTS `ti_addresses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_addresses` (
  `address_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `customer_id` int(11) DEFAULT NULL,
  `address_1` varchar(128) NOT NULL,
  `address_2` varchar(128) DEFAULT NULL,
  `city` varchar(128) DEFAULT NULL,
  `state` varchar(128) DEFAULT NULL,
  `postcode` varchar(128) DEFAULT NULL,
  `country_id` int(11) NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`address_id`)
) ENGINE=InnoDB AUTO_INCREMENT=154 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_allergenables`
--

DROP TABLE IF EXISTS `ti_allergenables`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_allergenables` (
  `allergen_id` int(10) unsigned NOT NULL,
  `allergenable_type` varchar(128) NOT NULL,
  `allergenable_id` bigint(20) unsigned NOT NULL,
  UNIQUE KEY `allergenable_unique` (`allergen_id`,`allergenable_id`,`allergenable_type`),
  KEY `allergenable_index` (`allergenable_type`,`allergenable_id`),
  KEY `ti_allergenables_allergen_id_index` (`allergen_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_allergens`
--

DROP TABLE IF EXISTS `ti_allergens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_allergens` (
  `allergen_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(128) NOT NULL,
  `description` varchar(128) NOT NULL,
  `status` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`allergen_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_assignable_logs`
--

DROP TABLE IF EXISTS `ti_assignable_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_assignable_logs` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `assignable_type` varchar(128) NOT NULL,
  `assignable_id` bigint(20) unsigned NOT NULL,
  `assignee_id` int(10) unsigned DEFAULT NULL,
  `assignee_group_id` int(10) unsigned DEFAULT NULL,
  `status_id` int(10) unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `ti_assignable_logs_assignable_type_assignable_id_index` (`assignable_type`,`assignable_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_cache`
--

DROP TABLE IF EXISTS `ti_cache`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_cache` (
  `key` varchar(128) NOT NULL,
  `value` mediumtext NOT NULL,
  `expiration` int(11) NOT NULL,
  UNIQUE KEY `ti_cache_key_unique` (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_cash_drawer_logs`
--

DROP TABLE IF EXISTS `ti_cash_drawer_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_cash_drawer_logs` (
  `log_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `drawer_id` bigint(20) unsigned NOT NULL COMMENT 'Reference to cash drawer',
  `order_id` int(11) unsigned DEFAULT NULL COMMENT 'Associated order (if triggered by payment)',
  `location_id` int(10) unsigned DEFAULT NULL COMMENT 'Location where event occurred',
  `action` enum('open','close','test','error','manual') NOT NULL DEFAULT 'open' COMMENT 'Type of action performed',
  `trigger_method` varchar(50) DEFAULT NULL COMMENT 'cash_payment, manual, test, scheduled',
  `success` tinyint(1) NOT NULL DEFAULT 1 COMMENT 'Whether the action was successful',
  `error_message` text DEFAULT NULL COMMENT 'Error details if action failed',
  `response_data` text DEFAULT NULL COMMENT 'JSON response from drawer device',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`log_id`),
  KEY `idx_drawer_id` (`drawer_id`),
  KEY `idx_order_id` (`order_id`),
  KEY `idx_location_id` (`location_id`),
  KEY `idx_action` (`action`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Cash drawer operation logs';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_cash_drawers`
--

DROP TABLE IF EXISTS `ti_cash_drawers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_cash_drawers` (
  `drawer_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(128) NOT NULL COMMENT 'Display name for the cash drawer',
  `location_id` int(10) unsigned DEFAULT NULL COMMENT 'Associated location (multi-tenant)',
  `pos_device_id` bigint(20) unsigned DEFAULT NULL COMMENT 'Linked POS device (optional)',
  `connection_type` enum('rj11_printer','usb','serial','network','integrated') NOT NULL DEFAULT 'rj11_printer' COMMENT 'How the drawer is connected',
  `device_path` varchar(255) DEFAULT NULL COMMENT 'COM port, USB path, IP address, or printer name',
  `printer_id` bigint(20) unsigned DEFAULT NULL COMMENT 'If RJ11, link to printer device',
  `esc_pos_command` varchar(50) NOT NULL DEFAULT '27,112,0,60,120' COMMENT 'ESC/POS command for drawer open',
  `voltage` enum('12V','24V') NOT NULL DEFAULT '12V' COMMENT 'Drawer solenoid voltage',
  `network_ip` varchar(45) DEFAULT NULL COMMENT 'IP address for network drawers',
  `network_port` int(11) DEFAULT 9100 COMMENT 'Port for network drawers',
  `serial_port` varchar(50) DEFAULT NULL COMMENT 'COM port for serial drawers',
  `serial_baud_rate` int(11) DEFAULT 9600 COMMENT 'Baud rate for serial connection',
  `usb_vendor_id` varchar(10) DEFAULT NULL COMMENT 'USB vendor ID',
  `usb_product_id` varchar(10) DEFAULT NULL COMMENT 'USB product ID',
  `connection_config` text DEFAULT NULL COMMENT 'JSON config for advanced settings',
  `status` tinyint(1) NOT NULL DEFAULT 1 COMMENT 'Enable/disable drawer',
  `auto_open_on_cash` tinyint(1) NOT NULL DEFAULT 1 COMMENT 'Auto-open when cash payment is processed',
  `test_on_save` tinyint(1) NOT NULL DEFAULT 1 COMMENT 'Test connection when saving configuration',
  `description` text DEFAULT NULL COMMENT 'Additional notes or description',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`drawer_id`),
  KEY `idx_location_id` (`location_id`),
  KEY `idx_pos_device_id` (`pos_device_id`),
  KEY `idx_connection_type` (`connection_type`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Cash drawer devices configuration';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_categories`
--

DROP TABLE IF EXISTS `ti_categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_categories` (
  `category_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(128) NOT NULL,
  `description` text DEFAULT NULL,
  `parent_id` int(11) DEFAULT NULL,
  `priority` int(11) NOT NULL DEFAULT 0,
  `status` tinyint(1) NOT NULL DEFAULT 1,
  `nest_left` int(11) DEFAULT NULL,
  `nest_right` int(11) DEFAULT NULL,
  `permalink_slug` varchar(128) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`category_id`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_countries`
--

DROP TABLE IF EXISTS `ti_countries`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_countries` (
  `country_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `country_name` varchar(128) NOT NULL,
  `iso_code_2` varchar(2) DEFAULT NULL,
  `iso_code_3` varchar(3) DEFAULT NULL,
  `format` text DEFAULT NULL,
  `status` tinyint(1) NOT NULL DEFAULT 0,
  `priority` int(11) NOT NULL DEFAULT 999,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`country_id`)
) ENGINE=InnoDB AUTO_INCREMENT=240 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_currencies`
--

DROP TABLE IF EXISTS `ti_currencies`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_currencies` (
  `currency_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `country_id` int(11) NOT NULL,
  `currency_name` varchar(128) NOT NULL,
  `currency_code` varchar(3) NOT NULL,
  `currency_symbol` varchar(3) NOT NULL,
  `currency_rate` decimal(15,8) NOT NULL,
  `symbol_position` tinyint(1) DEFAULT NULL,
  `thousand_sign` char(1) NOT NULL,
  `decimal_sign` char(1) NOT NULL,
  `decimal_position` char(1) NOT NULL,
  `iso_alpha2` varchar(2) DEFAULT NULL,
  `iso_alpha3` varchar(3) DEFAULT NULL,
  `iso_numeric` int(11) DEFAULT NULL,
  `currency_status` int(11) DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL,
  PRIMARY KEY (`currency_id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_customer_groups`
--

DROP TABLE IF EXISTS `ti_customer_groups`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_customer_groups` (
  `customer_group_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `group_name` varchar(32) NOT NULL,
  `description` text DEFAULT NULL,
  `approval` tinyint(1) NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`customer_group_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_customers`
--

DROP TABLE IF EXISTS `ti_customers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_customers` (
  `customer_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `first_name` varchar(128) NOT NULL,
  `last_name` varchar(128) NOT NULL,
  `email` varchar(96) NOT NULL,
  `password` varchar(128) NOT NULL,
  `telephone` varchar(32) DEFAULT NULL,
  `address_id` int(11) DEFAULT NULL,
  `newsletter` tinyint(1) DEFAULT NULL,
  `customer_group_id` int(11) NOT NULL,
  `ip_address` varchar(40) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `status` tinyint(1) NOT NULL,
  `reset_code` varchar(128) DEFAULT NULL,
  `reset_time` datetime DEFAULT NULL,
  `activation_code` varchar(128) DEFAULT NULL,
  `remember_token` varchar(128) DEFAULT NULL,
  `is_activated` tinyint(1) DEFAULT NULL,
  `date_activated` datetime DEFAULT NULL,
  `last_login` datetime DEFAULT NULL,
  `last_seen` datetime DEFAULT NULL,
  `updated_at` timestamp NOT NULL,
  `last_location_area` text NOT NULL,
  PRIMARY KEY (`customer_id`),
  UNIQUE KEY `ti_customers_email_unique` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_extension_settings`
--

DROP TABLE IF EXISTS `ti_extension_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_extension_settings` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `item` varchar(128) NOT NULL,
  `data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`data`)),
  PRIMARY KEY (`id`),
  UNIQUE KEY `ti_extension_settings_item_unique` (`item`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_extensions`
--

DROP TABLE IF EXISTS `ti_extensions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_extensions` (
  `extension_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(128) NOT NULL,
  `version` varchar(32) DEFAULT '1.0.0',
  PRIMARY KEY (`extension_id`),
  UNIQUE KEY `ti_extensions_name_unique` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_failed_jobs`
--

DROP TABLE IF EXISTS `ti_failed_jobs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_failed_jobs` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `uuid` varchar(128) DEFAULT NULL,
  `connection` text NOT NULL,
  `queue` text NOT NULL,
  `payload` longtext NOT NULL,
  `exception` longtext NOT NULL,
  `failed_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `ti_failed_jobs_uuid_unique` (`uuid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_igniter_automation_logs`
--

DROP TABLE IF EXISTS `ti_igniter_automation_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_igniter_automation_logs` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `automation_rule_id` bigint(20) unsigned DEFAULT NULL,
  `rule_action_id` bigint(20) unsigned DEFAULT NULL,
  `is_success` tinyint(1) NOT NULL,
  `message` text NOT NULL,
  `params` text DEFAULT NULL,
  `exception` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `ti_igniter_automation_logs_automation_rule_id_foreign` (`automation_rule_id`),
  KEY `ti_igniter_automation_logs_rule_action_id_foreign` (`rule_action_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_igniter_automation_rule_actions`
--

DROP TABLE IF EXISTS `ti_igniter_automation_rule_actions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_igniter_automation_rule_actions` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `automation_rule_id` bigint(20) unsigned DEFAULT NULL,
  `class_name` varchar(128) NOT NULL,
  `options` text NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `ti_igniter_actions_automation_rule_id_foreign` (`automation_rule_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_igniter_automation_rule_conditions`
--

DROP TABLE IF EXISTS `ti_igniter_automation_rule_conditions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_igniter_automation_rule_conditions` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `automation_rule_id` bigint(20) unsigned DEFAULT NULL,
  `class_name` varchar(128) NOT NULL,
  `options` text NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `ti_igniter_conditions_automation_rule_id_foreign` (`automation_rule_id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_igniter_automation_rules`
--

DROP TABLE IF EXISTS `ti_igniter_automation_rules`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_igniter_automation_rules` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(128) NOT NULL,
  `code` varchar(128) NOT NULL,
  `description` varchar(128) NOT NULL,
  `event_class` text DEFAULT NULL,
  `config_data` text DEFAULT NULL,
  `is_custom` tinyint(1) NOT NULL DEFAULT 0,
  `status` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_igniter_cart_cart`
--

DROP TABLE IF EXISTS `ti_igniter_cart_cart`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_igniter_cart_cart` (
  `identifier` varchar(128) NOT NULL,
  `instance` varchar(128) NOT NULL,
  `data` longtext NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`identifier`,`instance`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_igniter_coupon_categories`
--

DROP TABLE IF EXISTS `ti_igniter_coupon_categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_igniter_coupon_categories` (
  `coupon_id` int(10) unsigned NOT NULL,
  `category_id` int(10) unsigned NOT NULL,
  UNIQUE KEY `ti_igniter_coupon_categories_coupon_id_category_id_unique` (`coupon_id`,`category_id`),
  KEY `ti_igniter_coupon_categories_coupon_id_index` (`coupon_id`),
  KEY `ti_igniter_coupon_categories_category_id_index` (`category_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_igniter_coupon_customer_groups`
--

DROP TABLE IF EXISTS `ti_igniter_coupon_customer_groups`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_igniter_coupon_customer_groups` (
  `coupon_id` bigint(20) unsigned NOT NULL,
  `customer_group_id` bigint(20) unsigned NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_igniter_coupon_customers`
--

DROP TABLE IF EXISTS `ti_igniter_coupon_customers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_igniter_coupon_customers` (
  `coupon_id` bigint(20) unsigned NOT NULL,
  `customer_id` bigint(20) unsigned NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_igniter_coupon_menus`
--

DROP TABLE IF EXISTS `ti_igniter_coupon_menus`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_igniter_coupon_menus` (
  `coupon_id` int(10) unsigned NOT NULL,
  `menu_id` int(10) unsigned NOT NULL,
  UNIQUE KEY `ti_igniter_coupon_menus_coupon_id_menu_id_unique` (`coupon_id`,`menu_id`),
  KEY `ti_igniter_coupon_menus_coupon_id_index` (`coupon_id`),
  KEY `ti_igniter_coupon_menus_menu_id_index` (`menu_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_igniter_coupons`
--

DROP TABLE IF EXISTS `ti_igniter_coupons`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_igniter_coupons` (
  `coupon_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(128) NOT NULL,
  `code` varchar(128) NOT NULL,
  `type` char(1) NOT NULL,
  `discount` decimal(15,4) DEFAULT NULL,
  `min_total` decimal(15,4) DEFAULT NULL,
  `redemptions` int(11) NOT NULL DEFAULT 0,
  `customer_redemptions` int(11) NOT NULL DEFAULT 0,
  `description` text DEFAULT NULL,
  `status` tinyint(1) DEFAULT NULL,
  `created_at` date NOT NULL,
  `validity` char(15) DEFAULT NULL,
  `fixed_date` date DEFAULT NULL,
  `fixed_from_time` time DEFAULT NULL,
  `fixed_to_time` time DEFAULT NULL,
  `period_start_date` date DEFAULT NULL,
  `period_end_date` date DEFAULT NULL,
  `recurring_every` varchar(35) DEFAULT NULL,
  `recurring_from_time` time DEFAULT NULL,
  `recurring_to_time` time DEFAULT NULL,
  `order_restriction` text DEFAULT NULL,
  `apply_coupon_on` enum('whole_cart','menu_items','delivery_fee') NOT NULL DEFAULT 'whole_cart',
  `auto_apply` tinyint(1) NOT NULL DEFAULT 0,
  `updated_at` timestamp NOT NULL,
  PRIMARY KEY (`coupon_id`),
  UNIQUE KEY `code` (`code`),
  UNIQUE KEY `ti_igniter_coupons_code_unique` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_igniter_coupons_history`
--

DROP TABLE IF EXISTS `ti_igniter_coupons_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_igniter_coupons_history` (
  `coupon_history_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `coupon_id` bigint(20) unsigned NOT NULL,
  `order_id` bigint(20) unsigned DEFAULT NULL,
  `customer_id` bigint(20) unsigned DEFAULT NULL,
  `code` varchar(15) NOT NULL,
  `min_total` decimal(15,4) DEFAULT NULL,
  `amount` decimal(15,4) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `status` tinyint(1) NOT NULL,
  `updated_at` timestamp NOT NULL,
  PRIMARY KEY (`coupon_history_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_igniter_frontend_banners`
--

DROP TABLE IF EXISTS `ti_igniter_frontend_banners`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_igniter_frontend_banners` (
  `banner_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(128) NOT NULL,
  `type` char(8) NOT NULL,
  `click_url` varchar(128) DEFAULT NULL,
  `language_id` int(11) NOT NULL,
  `alt_text` varchar(128) DEFAULT NULL,
  `image_code` text DEFAULT NULL,
  `custom_code` text DEFAULT NULL,
  `status` tinyint(1) NOT NULL,
  PRIMARY KEY (`banner_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_igniter_frontend_sliders`
--

DROP TABLE IF EXISTS `ti_igniter_frontend_sliders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_igniter_frontend_sliders` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(128) NOT NULL,
  `code` varchar(128) NOT NULL,
  `metadata` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ti_igniter_frontend_sliders_code_unique` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_igniter_frontend_subscribers`
--

DROP TABLE IF EXISTS `ti_igniter_frontend_subscribers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_igniter_frontend_subscribers` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) DEFAULT NULL,
  `email` varchar(128) NOT NULL,
  `statistics` int(11) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_igniter_pages_menu_items`
--

DROP TABLE IF EXISTS `ti_igniter_pages_menu_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_igniter_pages_menu_items` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `menu_id` int(10) unsigned NOT NULL,
  `parent_id` int(10) unsigned DEFAULT NULL,
  `title` varchar(128) NOT NULL,
  `code` varchar(128) NOT NULL,
  `description` varchar(128) DEFAULT NULL,
  `type` varchar(128) NOT NULL,
  `url` varchar(128) DEFAULT NULL,
  `reference` varchar(128) DEFAULT NULL,
  `config` text DEFAULT NULL,
  `nest_left` int(11) DEFAULT NULL,
  `nest_right` int(11) DEFAULT NULL,
  `priority` int(11) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `ti_igniter_pages_menu_items_menu_id_index` (`menu_id`),
  KEY `ti_igniter_pages_menu_items_parent_id_index` (`parent_id`)
) ENGINE=InnoDB AUTO_INCREMENT=40 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_igniter_pages_menus`
--

DROP TABLE IF EXISTS `ti_igniter_pages_menus`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_igniter_pages_menus` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `theme_code` varchar(128) NOT NULL,
  `name` varchar(128) NOT NULL,
  `code` varchar(128) NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `ti_igniter_pages_menus_theme_code_index` (`theme_code`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_igniter_reviews`
--

DROP TABLE IF EXISTS `ti_igniter_reviews`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_igniter_reviews` (
  `review_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `customer_id` bigint(20) unsigned DEFAULT NULL,
  `sale_id` bigint(20) unsigned DEFAULT NULL,
  `sale_type` varchar(32) NOT NULL DEFAULT '',
  `author` varchar(128) DEFAULT NULL,
  `location_id` bigint(20) unsigned DEFAULT NULL,
  `quality` int(11) NOT NULL,
  `delivery` int(11) NOT NULL,
  `service` int(11) NOT NULL,
  `review_text` text DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `review_status` tinyint(1) NOT NULL,
  `updated_at` timestamp NOT NULL,
  PRIMARY KEY (`review_id`),
  KEY `ti_igniter_reviews_review_id_sale_type_sale_id_index` (`review_id`,`sale_type`,`sale_id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_igniter_socialite_providers`
--

DROP TABLE IF EXISTS `ti_igniter_socialite_providers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_igniter_socialite_providers` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int(10) unsigned DEFAULT NULL,
  `provider` varchar(255) DEFAULT NULL,
  `provider_id` varchar(255) DEFAULT NULL,
  `token` varchar(255) DEFAULT NULL,
  `user_type` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `provider_token_index` (`provider`,`token`),
  KEY `ti_igniter_socialite_providers_user_id_index` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_job_batches`
--

DROP TABLE IF EXISTS `ti_job_batches`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_job_batches` (
  `id` varchar(128) NOT NULL,
  `name` varchar(128) NOT NULL,
  `total_jobs` int(11) NOT NULL,
  `pending_jobs` int(11) NOT NULL,
  `failed_jobs` int(11) NOT NULL,
  `failed_job_ids` text NOT NULL,
  `options` mediumtext DEFAULT NULL,
  `cancelled_at` int(11) DEFAULT NULL,
  `created_at` int(11) NOT NULL,
  `finished_at` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_jobs`
--

DROP TABLE IF EXISTS `ti_jobs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_jobs` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `queue` varchar(128) NOT NULL,
  `payload` longtext NOT NULL,
  `attempts` tinyint(3) unsigned NOT NULL,
  `reserved_at` int(10) unsigned DEFAULT NULL,
  `available_at` int(10) unsigned NOT NULL,
  `created_at` int(10) unsigned NOT NULL,
  PRIMARY KEY (`id`),
  KEY `ti_jobs_queue_index` (`queue`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_language_translations`
--

DROP TABLE IF EXISTS `ti_language_translations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_language_translations` (
  `translation_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `locale` varchar(10) NOT NULL,
  `namespace` varchar(128) NOT NULL DEFAULT '*',
  `group` varchar(128) NOT NULL,
  `item` varchar(128) NOT NULL,
  `text` text NOT NULL,
  `unstable` tinyint(1) NOT NULL DEFAULT 0,
  `locked` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`translation_id`),
  UNIQUE KEY `ti_language_translations_locale_namespace_group_item_unique` (`locale`,`namespace`,`group`,`item`),
  KEY `ti_language_translations_group_index` (`group`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_languages`
--

DROP TABLE IF EXISTS `ti_languages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_languages` (
  `language_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `code` varchar(32) NOT NULL,
  `name` varchar(128) NOT NULL,
  `image` varchar(128) DEFAULT NULL,
  `idiom` varchar(128) NOT NULL,
  `status` tinyint(1) NOT NULL,
  `can_delete` tinyint(1) NOT NULL,
  `original_id` int(11) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `version` varchar(128) DEFAULT NULL,
  PRIMARY KEY (`language_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_location_areas`
--

DROP TABLE IF EXISTS `ti_location_areas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_location_areas` (
  `area_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `location_id` int(11) NOT NULL,
  `name` varchar(128) NOT NULL,
  `type` varchar(32) NOT NULL,
  `boundaries` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`boundaries`)),
  `conditions` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`conditions`)),
  `color` varchar(40) DEFAULT NULL,
  `is_default` tinyint(1) NOT NULL DEFAULT 0,
  `priority` int(11) NOT NULL DEFAULT 0,
  PRIMARY KEY (`area_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_location_options`
--

DROP TABLE IF EXISTS `ti_location_options`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_location_options` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `location_id` bigint(20) unsigned NOT NULL,
  `item` varchar(128) NOT NULL,
  `value` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`value`)),
  PRIMARY KEY (`id`),
  UNIQUE KEY `ti_location_options_location_id_item_unique` (`location_id`,`item`)
) ENGINE=InnoDB AUTO_INCREMENT=30 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_locationables`
--

DROP TABLE IF EXISTS `ti_locationables`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_locationables` (
  `location_id` int(11) NOT NULL,
  `locationable_id` int(11) NOT NULL,
  `locationable_type` varchar(128) NOT NULL,
  `options` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_locations`
--

DROP TABLE IF EXISTS `ti_locations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_locations` (
  `location_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `location_name` varchar(128) NOT NULL,
  `location_email` varchar(96) NOT NULL,
  `description` text DEFAULT NULL,
  `location_address_1` varchar(128) DEFAULT NULL,
  `location_address_2` varchar(128) DEFAULT NULL,
  `location_city` varchar(128) DEFAULT NULL,
  `location_state` varchar(128) DEFAULT NULL,
  `location_postcode` varchar(10) DEFAULT NULL,
  `location_country_id` int(11) DEFAULT NULL,
  `location_telephone` text DEFAULT NULL,
  `location_lat` double DEFAULT NULL,
  `location_lng` double DEFAULT NULL,
  `location_radius` int(11) DEFAULT NULL,
  `location_status` tinyint(1) DEFAULT NULL,
  `permalink_slug` varchar(128) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`location_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_logos`
--

DROP TABLE IF EXISTS `ti_logos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_logos` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `dashboard_logo` text DEFAULT NULL,
  `loader_logo` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_mail_layouts`
--

DROP TABLE IF EXISTS `ti_mail_layouts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_mail_layouts` (
  `layout_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(128) NOT NULL,
  `language_id` int(11) NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `status` tinyint(1) NOT NULL,
  `code` varchar(128) NOT NULL,
  `layout` text DEFAULT NULL,
  `plain_layout` text DEFAULT NULL,
  `layout_css` text DEFAULT NULL,
  `is_locked` tinyint(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (`layout_id`),
  UNIQUE KEY `ti_mail_layouts_code_unique` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_mail_partials`
--

DROP TABLE IF EXISTS `ti_mail_partials`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_mail_partials` (
  `partial_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(128) DEFAULT NULL,
  `code` varchar(128) DEFAULT NULL,
  `html` text DEFAULT NULL,
  `text` text DEFAULT NULL,
  `is_custom` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`partial_id`),
  UNIQUE KEY `ti_mail_partials_code_unique` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_mail_templates`
--

DROP TABLE IF EXISTS `ti_mail_templates`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_mail_templates` (
  `template_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `layout_id` int(11) NOT NULL,
  `code` varchar(128) NOT NULL,
  `subject` varchar(128) NOT NULL,
  `body` text NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `label` varchar(128) DEFAULT NULL,
  `is_custom` tinyint(1) DEFAULT NULL,
  `plain_body` text DEFAULT NULL,
  PRIMARY KEY (`template_id`),
  UNIQUE KEY `ti_mail_templates_data_template_id_code_unique` (`layout_id`,`code`)
) ENGINE=InnoDB AUTO_INCREMENT=19 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_mealtimes`
--

DROP TABLE IF EXISTS `ti_mealtimes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_mealtimes` (
  `mealtime_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `mealtime_name` varchar(128) NOT NULL,
  `start_time` time NOT NULL DEFAULT '00:00:00',
  `end_time` time NOT NULL DEFAULT '23:59:59',
  `mealtime_status` tinyint(1) NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`mealtime_id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_media_attachments`
--

DROP TABLE IF EXISTS `ti_media_attachments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_media_attachments` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `disk` varchar(128) NOT NULL,
  `name` varchar(128) NOT NULL,
  `file_name` varchar(128) NOT NULL,
  `mime_type` varchar(128) NOT NULL,
  `size` int(10) unsigned NOT NULL,
  `tag` varchar(128) DEFAULT NULL,
  `attachment_type` varchar(128) DEFAULT NULL,
  `attachment_id` bigint(20) unsigned DEFAULT NULL,
  `is_public` tinyint(1) NOT NULL DEFAULT 1,
  `custom_properties` text DEFAULT NULL,
  `priority` int(10) unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `ti_media_attachments_attachment_type_attachment_id_index` (`attachment_type`,`attachment_id`),
  KEY `ti_media_attachments_tag_index` (`tag`)
) ENGINE=InnoDB AUTO_INCREMENT=19 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_menu_categories`
--

DROP TABLE IF EXISTS `ti_menu_categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_menu_categories` (
  `menu_id` int(10) unsigned NOT NULL,
  `category_id` int(10) unsigned NOT NULL,
  UNIQUE KEY `ti_menu_categories_menu_id_category_id_unique` (`menu_id`,`category_id`),
  KEY `ti_menu_categories_menu_id_index` (`menu_id`),
  KEY `ti_menu_categories_category_id_index` (`category_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_menu_images`
--

DROP TABLE IF EXISTS `ti_menu_images`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_menu_images` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `menu_id` int(10) unsigned NOT NULL,
  `image_path` varchar(255) NOT NULL,
  `sort_order` int(10) unsigned NOT NULL DEFAULT 1,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `ti_menu_images_menu_id_sort_order_index` (`menu_id`,`sort_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_menu_item_option_values`
--

DROP TABLE IF EXISTS `ti_menu_item_option_values`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_menu_item_option_values` (
  `menu_option_value_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `menu_option_id` int(11) NOT NULL,
  `option_value_id` int(11) NOT NULL,
  `new_price` decimal(15,4) DEFAULT NULL,
  `priority` int(11) NOT NULL DEFAULT 0,
  `is_default` tinyint(1) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`menu_option_value_id`)
) ENGINE=InnoDB AUTO_INCREMENT=22 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_menu_item_options`
--

DROP TABLE IF EXISTS `ti_menu_item_options`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_menu_item_options` (
  `menu_option_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `option_id` int(11) NOT NULL,
  `menu_id` int(11) NOT NULL,
  `required` tinyint(1) NOT NULL DEFAULT 0,
  `priority` int(11) NOT NULL DEFAULT 0,
  `min_selected` int(11) NOT NULL DEFAULT 0,
  `max_selected` int(11) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`menu_option_id`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_menu_mealtimes`
--

DROP TABLE IF EXISTS `ti_menu_mealtimes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_menu_mealtimes` (
  `menu_id` int(10) unsigned NOT NULL,
  `mealtime_id` int(10) unsigned NOT NULL,
  UNIQUE KEY `ti_menu_mealtimes_menu_id_mealtime_id_unique` (`menu_id`,`mealtime_id`),
  KEY `ti_menu_mealtimes_menu_id_index` (`menu_id`),
  KEY `ti_menu_mealtimes_mealtime_id_index` (`mealtime_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_menu_option_values`
--

DROP TABLE IF EXISTS `ti_menu_option_values`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_menu_option_values` (
  `option_value_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `option_id` int(11) NOT NULL,
  `value` varchar(128) NOT NULL,
  `price` decimal(15,4) DEFAULT NULL,
  `priority` int(11) NOT NULL DEFAULT 0,
  PRIMARY KEY (`option_value_id`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_menu_options`
--

DROP TABLE IF EXISTS `ti_menu_options`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_menu_options` (
  `option_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `option_name` varchar(128) NOT NULL,
  `display_type` varchar(128) NOT NULL,
  `priority` int(11) NOT NULL DEFAULT 0,
  `update_related_menu_item` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`option_id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_menus`
--

DROP TABLE IF EXISTS `ti_menus`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_menus` (
  `menu_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `menu_name` varchar(128) NOT NULL,
  `menu_description` text NOT NULL,
  `menu_price` decimal(15,4) NOT NULL,
  `minimum_qty` int(11) NOT NULL DEFAULT 0,
  `menu_status` tinyint(1) NOT NULL,
  `menu_priority` int(11) NOT NULL DEFAULT 0,
  `order_restriction` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `is_halal` tinyint(1) NOT NULL DEFAULT 0,
  `is_vegetarian` tinyint(1) NOT NULL DEFAULT 0,
  `is_vegan` tinyint(1) NOT NULL DEFAULT 0,
  `calories` int(10) unsigned DEFAULT NULL,
  `protein` decimal(8,2) DEFAULT NULL,
  `carbs` decimal(8,2) DEFAULT NULL,
  `fat` decimal(8,2) DEFAULT NULL,
  `sugar` decimal(8,2) DEFAULT NULL,
  `serving_size` varchar(64) DEFAULT NULL,
  `color` varchar(40) DEFAULT NULL,
  PRIMARY KEY (`menu_id`)
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_menus_specials`
--

DROP TABLE IF EXISTS `ti_menus_specials`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_menus_specials` (
  `special_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `menu_id` int(11) NOT NULL DEFAULT 0,
  `start_date` datetime DEFAULT current_timestamp(),
  `end_date` datetime DEFAULT current_timestamp(),
  `special_price` decimal(15,4) DEFAULT NULL,
  `special_status` tinyint(1) NOT NULL,
  `type` varchar(128) NOT NULL,
  `validity` varchar(128) NOT NULL,
  `recurring_every` text DEFAULT NULL,
  `recurring_from` time DEFAULT NULL,
  `recurring_to` time DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`special_id`),
  UNIQUE KEY `ti_menus_specials_special_id_menu_id_unique` (`special_id`,`menu_id`)
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_migrations`
--

DROP TABLE IF EXISTS `ti_migrations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_migrations` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `group` varchar(128) NOT NULL,
  `migration` varchar(128) NOT NULL,
  `batch` int(11) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=122 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_order_menu_options`
--

DROP TABLE IF EXISTS `ti_order_menu_options`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_order_menu_options` (
  `order_option_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `order_id` int(11) NOT NULL,
  `menu_id` int(11) NOT NULL,
  `order_option_name` varchar(128) NOT NULL,
  `order_option_price` decimal(15,4) DEFAULT NULL,
  `order_menu_id` int(11) NOT NULL,
  `order_menu_option_id` int(11) NOT NULL,
  `menu_option_value_id` int(11) NOT NULL,
  `quantity` int(11) DEFAULT 1,
  PRIMARY KEY (`order_option_id`)
) ENGINE=InnoDB AUTO_INCREMENT=225 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_order_menus`
--

DROP TABLE IF EXISTS `ti_order_menus`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_order_menus` (
  `order_menu_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `order_id` int(11) NOT NULL,
  `menu_id` int(11) NOT NULL,
  `name` varchar(128) NOT NULL,
  `quantity` int(11) NOT NULL,
  `price` decimal(15,4) DEFAULT NULL,
  `subtotal` decimal(15,4) DEFAULT NULL,
  `option_values` text DEFAULT NULL,
  `comment` text DEFAULT NULL,
  PRIMARY KEY (`order_menu_id`)
) ENGINE=InnoDB AUTO_INCREMENT=508 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_order_totals`
--

DROP TABLE IF EXISTS `ti_order_totals`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_order_totals` (
  `order_total_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `order_id` int(10) unsigned NOT NULL,
  `code` varchar(128) NOT NULL,
  `title` varchar(128) NOT NULL,
  `value` decimal(15,4) NOT NULL,
  `priority` tinyint(1) NOT NULL DEFAULT 0,
  `is_summable` tinyint(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (`order_total_id`)
) ENGINE=InnoDB AUTO_INCREMENT=540 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_orders`
--

DROP TABLE IF EXISTS `ti_orders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_orders` (
  `order_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `customer_id` int(11) DEFAULT NULL,
  `first_name` varchar(128) NOT NULL,
  `last_name` varchar(128) NOT NULL,
  `email` varchar(96) NOT NULL,
  `telephone` varchar(128) NOT NULL,
  `location_id` int(11) NOT NULL,
  `address_id` int(11) DEFAULT NULL,
  `cart` text NOT NULL,
  `total_items` int(11) NOT NULL,
  `comment` text DEFAULT NULL,
  `payment` varchar(128) NOT NULL,
  `order_type` varchar(128) NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `order_time` time NOT NULL,
  `order_date` date NOT NULL,
  `order_total` decimal(15,4) DEFAULT NULL,
  `status_id` int(11) NOT NULL,
  `ip_address` varchar(40) NOT NULL,
  `user_agent` varchar(128) NOT NULL,
  `assignee_id` int(11) DEFAULT NULL,
  `assignee_group_id` int(10) unsigned DEFAULT NULL,
  `invoice_prefix` varchar(128) DEFAULT NULL,
  `invoice_date` datetime DEFAULT NULL,
  `hash` varchar(40) DEFAULT NULL,
  `processed` tinyint(1) DEFAULT NULL,
  `status_updated_at` datetime DEFAULT NULL,
  `assignee_updated_at` datetime DEFAULT NULL,
  `order_time_is_asap` tinyint(1) NOT NULL DEFAULT 0,
  `delivery_comment` text DEFAULT NULL,
  `ms_order_type` varchar(255) NOT NULL DEFAULT '',
  PRIMARY KEY (`order_id`),
  KEY `ti_orders_hash_index` (`hash`)
) ENGINE=InnoDB AUTO_INCREMENT=191 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_pages`
--

DROP TABLE IF EXISTS `ti_pages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_pages` (
  `page_id` bigint(20) unsigned NOT NULL,
  `language_id` bigint(20) unsigned NOT NULL,
  `title` varchar(128) NOT NULL,
  `content` mediumtext NOT NULL,
  `meta_description` varchar(128) DEFAULT NULL,
  `meta_keywords` varchar(128) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `status` tinyint(1) NOT NULL,
  `permalink_slug` varchar(128) DEFAULT NULL,
  `layout` varchar(128) DEFAULT NULL,
  `metadata` mediumtext DEFAULT NULL,
  `priority` int(11) DEFAULT NULL,
  PRIMARY KEY (`page_id`),
  KEY `ti_pages_language_id_foreign` (`language_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_payment_logs`
--

DROP TABLE IF EXISTS `ti_payment_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_payment_logs` (
  `payment_log_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `order_id` int(11) NOT NULL,
  `payment_name` varchar(128) NOT NULL,
  `message` varchar(128) NOT NULL,
  `request` text DEFAULT NULL,
  `response` text DEFAULT NULL,
  `is_success` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `payment_code` varchar(128) NOT NULL,
  `is_refundable` tinyint(1) NOT NULL DEFAULT 0,
  `refunded_at` datetime DEFAULT NULL,
  PRIMARY KEY (`payment_log_id`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_payment_profiles`
--

DROP TABLE IF EXISTS `ti_payment_profiles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_payment_profiles` (
  `payment_profile_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `customer_id` int(10) unsigned DEFAULT NULL,
  `payment_id` int(10) unsigned DEFAULT NULL,
  `card_brand` varchar(128) DEFAULT NULL,
  `card_last4` varchar(128) DEFAULT NULL,
  `profile_data` text DEFAULT NULL,
  `is_primary` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`payment_profile_id`),
  KEY `ti_payment_profiles_customer_id_index` (`customer_id`),
  KEY `ti_payment_profiles_payment_id_index` (`payment_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_payments`
--

DROP TABLE IF EXISTS `ti_payments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_payments` (
  `payment_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(128) NOT NULL,
  `code` varchar(128) NOT NULL,
  `class_name` text NOT NULL,
  `description` text DEFAULT NULL,
  `data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`data`)),
  `status` tinyint(1) NOT NULL DEFAULT 0,
  `is_default` tinyint(1) NOT NULL DEFAULT 0,
  `priority` int(11) NOT NULL DEFAULT 0,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`payment_id`),
  UNIQUE KEY `ti_payments_code_unique` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_qr_code`
--

DROP TABLE IF EXISTS `ti_qr_code`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_qr_code` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `qr_code` varchar(30) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_request_logs`
--

DROP TABLE IF EXISTS `ti_request_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_request_logs` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `url` varchar(128) DEFAULT NULL,
  `status_code` int(11) DEFAULT NULL,
  `referrer` text DEFAULT NULL,
  `count` int(11) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=113 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_reservation_tables`
--

DROP TABLE IF EXISTS `ti_reservation_tables`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_reservation_tables` (
  `reservation_id` int(10) unsigned NOT NULL,
  `table_id` int(10) unsigned NOT NULL,
  UNIQUE KEY `ti_reservation_tables_reservation_id_table_id_unique` (`reservation_id`,`table_id`),
  KEY `ti_reservation_tables_reservation_id_index` (`reservation_id`),
  KEY `ti_reservation_tables_table_id_index` (`table_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_reservations`
--

DROP TABLE IF EXISTS `ti_reservations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_reservations` (
  `reservation_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `location_id` int(11) NOT NULL,
  `table_id` int(11) NOT NULL,
  `guest_num` int(11) NOT NULL,
  `occasion_id` int(11) DEFAULT NULL,
  `customer_id` int(11) DEFAULT NULL,
  `first_name` varchar(128) NOT NULL,
  `last_name` varchar(128) NOT NULL,
  `email` varchar(96) NOT NULL,
  `telephone` varchar(128) NOT NULL,
  `comment` text DEFAULT NULL,
  `reserve_time` time NOT NULL,
  `reserve_date` date NOT NULL,
  `created_at` date NOT NULL,
  `updated_at` date NOT NULL,
  `assignee_id` int(11) DEFAULT NULL,
  `assignee_group_id` int(10) unsigned DEFAULT NULL,
  `notify` tinyint(1) DEFAULT NULL,
  `ip_address` varchar(40) NOT NULL,
  `user_agent` varchar(128) NOT NULL,
  `status_id` tinyint(1) NOT NULL,
  `hash` varchar(40) DEFAULT NULL,
  `duration` int(11) DEFAULT NULL,
  `processed` tinyint(1) DEFAULT NULL,
  `status_updated_at` datetime DEFAULT NULL,
  `assignee_updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`reservation_id`),
  KEY `ti_reservations_location_id_table_id_index` (`location_id`,`table_id`),
  KEY `ti_reservations_hash_index` (`hash`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_sessions`
--

DROP TABLE IF EXISTS `ti_sessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_sessions` (
  `id` varchar(128) NOT NULL,
  `payload` text DEFAULT NULL,
  `last_activity` int(11) DEFAULT NULL,
  UNIQUE KEY `ti_sessions_id_unique` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_settings`
--

DROP TABLE IF EXISTS `ti_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_settings` (
  `setting_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `sort` varchar(45) NOT NULL,
  `item` varchar(128) NOT NULL,
  `value` text DEFAULT NULL,
  `serialized` tinyint(1) DEFAULT NULL,
  PRIMARY KEY (`setting_id`),
  UNIQUE KEY `ti_settings_sort_item_unique` (`sort`,`item`)
) ENGINE=InnoDB AUTO_INCREMENT=128 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_staff_groups`
--

DROP TABLE IF EXISTS `ti_staff_groups`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_staff_groups` (
  `staff_group_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `staff_group_name` varchar(32) NOT NULL,
  `description` text NOT NULL,
  `auto_assign` tinyint(1) DEFAULT 0,
  `auto_assign_mode` tinyint(4) DEFAULT 1,
  `auto_assign_limit` int(11) DEFAULT 20,
  `auto_assign_availability` tinyint(1) DEFAULT 1,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`staff_group_id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_staff_roles`
--

DROP TABLE IF EXISTS `ti_staff_roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_staff_roles` (
  `staff_role_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(128) NOT NULL,
  `code` varchar(128) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `permissions` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`staff_role_id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_staffs`
--

DROP TABLE IF EXISTS `ti_staffs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_staffs` (
  `staff_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `staff_name` varchar(128) NOT NULL,
  `staff_email` varchar(96) NOT NULL,
  `card_id` varchar(255) DEFAULT NULL,
  `rfid_card_uid` varchar(100) DEFAULT NULL,
  `fingerprint_template` text DEFAULT NULL,
  `face_template` text DEFAULT NULL,
  `pin_code` varchar(255) DEFAULT NULL,
  `biometric_enabled` tinyint(1) NOT NULL DEFAULT 0,
  `enrollment_status` enum('not_enrolled','enrolled','pending','failed') NOT NULL DEFAULT 'not_enrolled',
  `enrolled_at` timestamp NULL DEFAULT NULL,
  `enrolled_by` bigint(20) unsigned DEFAULT NULL,
  `enrolled_devices` longtext DEFAULT NULL,
  `staff_role_id` int(11) NOT NULL,
  `language_id` int(11) DEFAULT NULL,
  `created_at` date NOT NULL,
  `staff_status` tinyint(1) NOT NULL,
  `sale_permission` tinyint(4) DEFAULT 1,
  `updated_at` timestamp NOT NULL,
  PRIMARY KEY (`staff_id`),
  UNIQUE KEY `staff_email` (`staff_email`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_staffs_groups`
--

DROP TABLE IF EXISTS `ti_staffs_groups`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_staffs_groups` (
  `staff_id` int(10) unsigned NOT NULL,
  `staff_group_id` int(10) unsigned NOT NULL,
  PRIMARY KEY (`staff_id`,`staff_group_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_status_history`
--

DROP TABLE IF EXISTS `ti_status_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_status_history` (
  `status_history_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `object_id` int(11) NOT NULL,
  `object_type` varchar(128) NOT NULL,
  `staff_id` int(11) DEFAULT NULL,
  `status_id` int(11) NOT NULL,
  `notify` tinyint(1) DEFAULT NULL,
  `comment` text DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` timestamp NOT NULL,
  PRIMARY KEY (`status_history_id`)
) ENGINE=InnoDB AUTO_INCREMENT=389 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_statuses`
--

DROP TABLE IF EXISTS `ti_statuses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_statuses` (
  `status_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `status_name` varchar(128) NOT NULL,
  `status_comment` text DEFAULT NULL,
  `notify_customer` tinyint(1) DEFAULT NULL,
  `status_for` varchar(128) NOT NULL,
  `status_color` varchar(128) NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`status_id`)
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_stock_history`
--

DROP TABLE IF EXISTS `ti_stock_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_stock_history` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `stock_id` bigint(20) unsigned NOT NULL,
  `staff_id` bigint(20) unsigned DEFAULT NULL,
  `order_id` bigint(20) unsigned DEFAULT NULL,
  `state` varchar(128) NOT NULL,
  `quantity` bigint(20) NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `ti_stock_history_stock_id_foreign` (`stock_id`),
  KEY `ti_stock_history_order_id_foreign` (`order_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_stocks`
--

DROP TABLE IF EXISTS `ti_stocks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_stocks` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `location_id` bigint(20) unsigned NOT NULL,
  `stockable_id` bigint(20) unsigned NOT NULL,
  `stockable_type` varchar(128) NOT NULL,
  `quantity` bigint(20) DEFAULT NULL,
  `low_stock_alert` tinyint(1) NOT NULL DEFAULT 0,
  `low_stock_threshold` int(11) NOT NULL DEFAULT 0,
  `is_tracked` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `low_stock_alert_sent` tinyint(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_tables`
--

DROP TABLE IF EXISTS `ti_tables`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_tables` (
  `table_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
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
  PRIMARY KEY (`table_id`)
) ENGINE=InnoDB AUTO_INCREMENT=30 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_themes`
--

DROP TABLE IF EXISTS `ti_themes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_themes` (
  `theme_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(128) NOT NULL,
  `code` varchar(128) NOT NULL,
  `description` text DEFAULT NULL,
  `version` varchar(128) DEFAULT '0.0.1',
  `data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`data`)),
  `status` tinyint(1) NOT NULL DEFAULT 0,
  `is_default` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`theme_id`),
  UNIQUE KEY `ti_themes_code_unique` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_user_preferences`
--

DROP TABLE IF EXISTS `ti_user_preferences`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_user_preferences` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `item` varchar(128) NOT NULL,
  `value` text NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_users`
--

DROP TABLE IF EXISTS `ti_users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_users` (
  `user_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `staff_id` int(11) NOT NULL,
  `username` varchar(32) NOT NULL,
  `password` varchar(128) NOT NULL,
  `super_user` tinyint(1) DEFAULT NULL,
  `reset_code` varchar(128) DEFAULT NULL,
  `reset_time` datetime DEFAULT NULL,
  `activation_code` varchar(128) DEFAULT NULL,
  `remember_token` varchar(128) DEFAULT NULL,
  `is_activated` tinyint(1) DEFAULT NULL,
  `date_activated` datetime DEFAULT NULL,
  `last_login` datetime DEFAULT NULL,
  `last_seen` datetime DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `ti_users_staff_id_unique` (`staff_id`),
  UNIQUE KEY `ti_users_username_unique` (`username`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_websockets_statistics_entries`
--

DROP TABLE IF EXISTS `ti_websockets_statistics_entries`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_websockets_statistics_entries` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `app_id` varchar(128) NOT NULL,
  `peak_connection_count` int(11) NOT NULL,
  `websocket_message_count` int(11) NOT NULL,
  `api_message_count` int(11) NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ti_working_hours`
--

DROP TABLE IF EXISTS `ti_working_hours`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_working_hours` (
  `location_id` int(11) NOT NULL,
  `weekday` int(11) NOT NULL,
  `opening_time` time NOT NULL DEFAULT '00:00:00',
  `closing_time` time NOT NULL DEFAULT '00:00:00',
  `status` tinyint(1) NOT NULL,
  `type` varchar(32) NOT NULL,
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  PRIMARY KEY (`id`),
  KEY `ti_working_hours_location_id_weekday_type_index` (`location_id`,`weekday`,`type`)
) ENGINE=InnoDB AUTO_INCREMENT=22 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping events for database 'newtenantdb'
--

--
-- Dumping routines for database 'newtenantdb'
--
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-06-09 23:50:20

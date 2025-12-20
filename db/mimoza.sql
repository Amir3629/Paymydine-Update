/*M!999999\- enable the sandbox mode */ 
-- MariaDB dump 10.19-11.4.7-MariaDB, for debian-linux-gnu (x86_64)
--
-- Host: localhost    Database: mimoza
-- ------------------------------------------------------
-- Server version	11.4.7-MariaDB-0ubuntu0.25.04.1

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*M!100616 SET @OLD_NOTE_VERBOSITY=@@NOTE_VERBOSITY, NOTE_VERBOSITY=0 */;

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
-- Dumping data for table `igniter_coupon_categories`
--

LOCK TABLES `igniter_coupon_categories` WRITE;
/*!40000 ALTER TABLE `igniter_coupon_categories` DISABLE KEYS */;
/*!40000 ALTER TABLE `igniter_coupon_categories` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `igniter_coupon_customer_groups`
--

LOCK TABLES `igniter_coupon_customer_groups` WRITE;
/*!40000 ALTER TABLE `igniter_coupon_customer_groups` DISABLE KEYS */;
/*!40000 ALTER TABLE `igniter_coupon_customer_groups` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `igniter_coupon_customers`
--

LOCK TABLES `igniter_coupon_customers` WRITE;
/*!40000 ALTER TABLE `igniter_coupon_customers` DISABLE KEYS */;
/*!40000 ALTER TABLE `igniter_coupon_customers` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `igniter_coupon_menus`
--

LOCK TABLES `igniter_coupon_menus` WRITE;
/*!40000 ALTER TABLE `igniter_coupon_menus` DISABLE KEYS */;
/*!40000 ALTER TABLE `igniter_coupon_menus` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `igniter_coupons`
--

LOCK TABLES `igniter_coupons` WRITE;
/*!40000 ALTER TABLE `igniter_coupons` DISABLE KEYS */;
INSERT INTO `igniter_coupons` VALUES
(1,'111111','Test Coupon','Test coupon for debugging','F',10.0000,0.0000,0,0,1,'2025-09-23 19:20:25','2025-11-22 19:20:25','2025-10-23 19:20:25','2025-10-23 19:20:25');
/*!40000 ALTER TABLE `igniter_coupons` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `igniter_coupons_history`
--

LOCK TABLES `igniter_coupons_history` WRITE;
/*!40000 ALTER TABLE `igniter_coupons_history` DISABLE KEYS */;
/*!40000 ALTER TABLE `igniter_coupons_history` ENABLE KEYS */;
UNLOCK TABLES;

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `qr_code`
--

LOCK TABLES `qr_code` WRITE;
/*!40000 ALTER TABLE `qr_code` DISABLE KEYS */;
/*!40000 ALTER TABLE `qr_code` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `ti_activities`
--

LOCK TABLES `ti_activities` WRITE;
/*!40000 ALTER TABLE `ti_activities` DISABLE KEYS */;
INSERT INTO `ti_activities` VALUES
(45,1,'2025-02-10 15:03:27','default','{\"order_id\":20,\"full_name\":\"Chief Admin\"}',20,'orders',NULL,NULL,'2025-02-27 10:25:53','orderCreated','2025-02-27 10:25:53',NULL,'users'),
(46,2,'2025-02-10 15:03:27','default','{\"order_id\":20,\"full_name\":\"Chief Admin\"}',20,'orders',NULL,NULL,'2025-02-10 15:03:27','orderCreated',NULL,NULL,'users'),
(47,1,'2025-02-11 20:37:05','default','{\"order_id\":28,\"full_name\":\"Chief Admin\"}',28,'orders',NULL,NULL,'2025-02-27 10:25:53','orderCreated','2025-02-27 10:25:53',NULL,'users'),
(48,2,'2025-02-11 20:37:05','default','{\"order_id\":28,\"full_name\":\"Chief Admin\"}',28,'orders',NULL,NULL,'2025-02-11 20:37:05','orderCreated',NULL,NULL,'users'),
(49,1,'2025-02-13 11:00:31','default','{\"order_id\":29,\"full_name\":\"Chief Admin\"}',29,'orders',NULL,NULL,'2025-02-27 10:25:53','orderCreated','2025-02-27 10:25:53',NULL,'users'),
(50,2,'2025-02-13 11:00:31','default','{\"order_id\":29,\"full_name\":\"Chief Admin\"}',29,'orders',NULL,NULL,'2025-02-13 11:00:31','orderCreated',NULL,NULL,'users'),
(51,1,'2025-02-13 11:23:24','default','{\"order_id\":30,\"full_name\":\"oussama douba\"}',30,'orders',1,'customers','2025-02-27 10:25:53','orderCreated','2025-02-27 10:25:53',NULL,'users'),
(52,2,'2025-02-13 11:23:24','default','{\"order_id\":30,\"full_name\":\"oussama douba\"}',30,'orders',1,'customers','2025-02-13 11:23:24','orderCreated',NULL,NULL,'users'),
(53,1,'2025-02-13 11:23:30','default','{\"order_id\":31,\"full_name\":\"oussama douba\"}',31,'orders',1,'customers','2025-02-27 10:25:53','orderCreated','2025-02-27 10:25:53',NULL,'users'),
(54,2,'2025-02-13 11:23:30','default','{\"order_id\":31,\"full_name\":\"oussama douba\"}',31,'orders',1,'customers','2025-02-13 11:23:30','orderCreated',NULL,NULL,'users'),
(55,1,'2025-02-13 11:24:51','default','{\"order_id\":32,\"full_name\":\"oussama douba\"}',32,'orders',1,'customers','2025-02-27 10:25:53','orderCreated','2025-02-27 10:25:53',NULL,'users'),
(56,2,'2025-02-13 11:24:51','default','{\"order_id\":32,\"full_name\":\"oussama douba\"}',32,'orders',1,'customers','2025-02-13 11:24:51','orderCreated',NULL,NULL,'users'),
(57,1,'2025-02-13 21:54:01','default','{\"order_id\":33,\"full_name\":\"oussama douba\"}',33,'orders',1,'customers','2025-02-27 10:25:53','orderCreated','2025-02-27 10:25:53',NULL,'users'),
(58,2,'2025-02-13 21:54:01','default','{\"order_id\":33,\"full_name\":\"oussama douba\"}',33,'orders',1,'customers','2025-02-13 21:54:01','orderCreated',NULL,NULL,'users'),
(59,1,'2025-02-16 18:02:07','default','{\"order_id\":34,\"full_name\":\"Chief Admin\"}',34,'orders',NULL,NULL,'2025-02-27 10:25:53','orderCreated','2025-02-27 10:25:53',NULL,'users'),
(60,2,'2025-02-16 18:02:07','default','{\"order_id\":34,\"full_name\":\"Chief Admin\"}',34,'orders',NULL,NULL,'2025-02-16 18:02:07','orderCreated',NULL,NULL,'users'),
(61,1,'2025-02-16 18:04:26','default','{\"order_id\":35,\"full_name\":\"Chief Admin\"}',35,'orders',NULL,NULL,'2025-02-27 10:25:53','orderCreated','2025-02-27 10:25:53',NULL,'users'),
(62,2,'2025-02-16 18:04:26','default','{\"order_id\":35,\"full_name\":\"Chief Admin\"}',35,'orders',NULL,NULL,'2025-02-16 18:04:26','orderCreated',NULL,NULL,'users'),
(63,1,'2025-02-16 18:06:53','default','{\"order_id\":36,\"full_name\":\"Chief Admin\"}',36,'orders',NULL,NULL,'2025-02-27 10:25:53','orderCreated','2025-02-27 10:25:53',NULL,'users'),
(64,2,'2025-02-16 18:06:53','default','{\"order_id\":36,\"full_name\":\"Chief Admin\"}',36,'orders',NULL,NULL,'2025-02-16 18:06:53','orderCreated',NULL,NULL,'users'),
(65,1,'2025-02-16 18:15:27','default','{\"order_id\":37,\"full_name\":\"Chief Admin\"}',37,'orders',NULL,NULL,'2025-02-27 10:25:53','orderCreated','2025-02-27 10:25:53',NULL,'users'),
(66,2,'2025-02-16 18:15:27','default','{\"order_id\":37,\"full_name\":\"Chief Admin\"}',37,'orders',NULL,NULL,'2025-02-16 18:15:27','orderCreated',NULL,NULL,'users'),
(67,1,'2025-02-16 23:31:21','default','{\"order_id\":38,\"full_name\":\"oussama oussama\"}',38,'orders',NULL,NULL,'2025-02-27 10:25:53','orderCreated','2025-02-27 10:25:53',NULL,'users'),
(68,2,'2025-02-16 23:31:21','default','{\"order_id\":38,\"full_name\":\"oussama oussama\"}',38,'orders',NULL,NULL,'2025-02-16 23:31:21','orderCreated',NULL,NULL,'users'),
(69,1,'2025-02-17 14:50:15','default','{\"order_id\":39,\"full_name\":\"Chief Admin\"}',39,'orders',NULL,NULL,'2025-02-27 10:25:53','orderCreated','2025-02-27 10:25:53',NULL,'users'),
(70,2,'2025-02-17 14:50:15','default','{\"order_id\":39,\"full_name\":\"Chief Admin\"}',39,'orders',NULL,NULL,'2025-02-17 14:50:15','orderCreated',NULL,NULL,'users'),
(71,1,'2025-02-17 17:19:56','default','{\"order_id\":40,\"full_name\":\"table41 .\"}',40,'orders',NULL,NULL,'2025-02-27 10:25:53','orderCreated','2025-02-27 10:25:53',NULL,'users'),
(72,2,'2025-02-17 17:19:57','default','{\"order_id\":40,\"full_name\":\"table41 .\"}',40,'orders',NULL,NULL,'2025-02-17 17:19:57','orderCreated',NULL,NULL,'users'),
(73,1,'2025-02-17 17:22:40','default','{\"customer_id\":2,\"full_name\":\"Navier Stockes\"}',2,'customers',2,'customers','2025-02-27 10:25:53','customerRegistered','2025-02-27 10:25:53',NULL,'users'),
(74,1,'2025-02-17 17:23:13','default','{\"order_id\":41,\"full_name\":\"Table .\"}',41,'orders',2,'customers','2025-02-27 10:25:53','orderCreated','2025-02-27 10:25:53',NULL,'users'),
(75,2,'2025-02-17 17:23:13','default','{\"order_id\":41,\"full_name\":\"Table .\"}',41,'orders',2,'customers','2025-02-17 17:23:13','orderCreated',NULL,NULL,'users'),
(76,1,'2025-02-17 17:24:48','default','{\"order_id\":42,\"full_name\":\"table41 .\"}',42,'orders',2,'customers','2025-02-27 10:25:53','orderCreated','2025-02-27 10:25:53',NULL,'users'),
(77,2,'2025-02-17 17:24:49','default','{\"order_id\":42,\"full_name\":\"table41 .\"}',42,'orders',2,'customers','2025-02-17 17:24:49','orderCreated',NULL,NULL,'users'),
(78,1,'2025-02-17 17:26:29','default','{\"order_id\":43,\"full_name\":\"table40 .\"}',43,'orders',2,'customers','2025-02-27 10:25:53','orderCreated','2025-02-27 10:25:53',NULL,'users'),
(79,2,'2025-02-17 17:26:30','default','{\"order_id\":43,\"full_name\":\"table40 .\"}',43,'orders',2,'customers','2025-02-17 17:26:30','orderCreated',NULL,NULL,'users'),
(80,1,'2025-02-17 17:28:47','default','{\"order_id\":44,\"full_name\":\"table40 .\"}',44,'orders',NULL,NULL,'2025-02-27 10:25:53','orderCreated','2025-02-27 10:25:53',NULL,'users'),
(81,2,'2025-02-17 17:28:47','default','{\"order_id\":44,\"full_name\":\"table40 .\"}',44,'orders',NULL,NULL,'2025-02-17 17:28:47','orderCreated',NULL,NULL,'users'),
(82,1,'2025-02-17 17:29:41','default','{\"order_id\":45,\"full_name\":\"table41 .\"}',45,'orders',NULL,NULL,'2025-02-27 10:25:53','orderCreated','2025-02-27 10:25:53',NULL,'users'),
(83,2,'2025-02-17 17:29:41','default','{\"order_id\":45,\"full_name\":\"table41 .\"}',45,'orders',NULL,NULL,'2025-02-17 17:29:41','orderCreated',NULL,NULL,'users'),
(84,1,'2025-02-18 19:22:39','default','{\"order_id\":46,\"full_name\":\"table40 .\"}',46,'orders',NULL,NULL,'2025-02-27 10:25:53','orderCreated','2025-02-27 10:25:53',NULL,'users'),
(85,2,'2025-02-18 19:22:40','default','{\"order_id\":46,\"full_name\":\"table40 .\"}',46,'orders',NULL,NULL,'2025-02-18 19:22:40','orderCreated',NULL,NULL,'users'),
(86,1,'2025-02-18 19:23:05','default','{\"order_id\":47,\"full_name\":\"table41 .\"}',47,'orders',NULL,NULL,'2025-02-27 10:25:53','orderCreated','2025-02-27 10:25:53',NULL,'users'),
(87,2,'2025-02-18 19:23:05','default','{\"order_id\":47,\"full_name\":\"table41 .\"}',47,'orders',NULL,NULL,'2025-02-18 19:23:05','orderCreated',NULL,NULL,'users'),
(88,1,'2025-02-21 21:30:52','default','{\"order_id\":48,\"full_name\":\"oussama Douba\"}',48,'orders',NULL,NULL,'2025-02-27 10:25:53','orderCreated','2025-02-27 10:25:53',NULL,'users'),
(89,2,'2025-02-21 21:30:53','default','{\"order_id\":48,\"full_name\":\"oussama Douba\"}',48,'orders',NULL,NULL,'2025-02-21 21:30:53','orderCreated',NULL,NULL,'users'),
(90,1,'2025-02-21 21:31:11','default','{\"order_id\":49,\"full_name\":\"oussama oussama\"}',49,'orders',NULL,NULL,'2025-02-27 10:25:53','orderCreated','2025-02-27 10:25:53',NULL,'users'),
(91,2,'2025-02-21 21:31:11','default','{\"order_id\":49,\"full_name\":\"oussama oussama\"}',49,'orders',NULL,NULL,'2025-02-21 21:31:11','orderCreated',NULL,NULL,'users'),
(92,1,'2025-02-21 21:33:09','default','{\"order_id\":50,\"full_name\":\"Table 23 .\"}',50,'orders',NULL,NULL,'2025-02-27 10:25:53','orderCreated','2025-02-27 10:25:53',NULL,'users'),
(93,2,'2025-02-21 21:33:10','default','{\"order_id\":50,\"full_name\":\"Table 23 .\"}',50,'orders',NULL,NULL,'2025-02-21 21:33:10','orderCreated',NULL,NULL,'users'),
(94,1,'2025-02-24 12:46:02','default','{\"order_id\":51,\"full_name\":\"table41 .\"}',51,'orders',NULL,NULL,'2025-02-27 10:25:53','orderCreated','2025-02-27 10:25:53',NULL,'users'),
(95,2,'2025-02-24 12:46:03','default','{\"order_id\":51,\"full_name\":\"table41 .\"}',51,'orders',NULL,NULL,'2025-02-24 12:46:03','orderCreated',NULL,NULL,'users'),
(96,1,'2025-02-25 12:49:46','default','{\"order_id\":53,\"full_name\":\"table41 .\"}',53,'orders',NULL,NULL,'2025-02-27 10:25:53','orderCreated','2025-02-27 10:25:53',NULL,'users'),
(97,2,'2025-02-25 12:49:47','default','{\"order_id\":53,\"full_name\":\"table41 .\"}',53,'orders',NULL,NULL,'2025-02-25 12:49:47','orderCreated',NULL,NULL,'users'),
(98,1,'2025-02-25 12:50:57','default','{\"order_id\":54,\"full_name\":\"Table .\"}',54,'orders',NULL,NULL,'2025-02-27 10:25:53','orderCreated','2025-02-27 10:25:53',NULL,'users'),
(99,2,'2025-02-25 12:51:02','default','{\"order_id\":54,\"full_name\":\"Table .\"}',54,'orders',NULL,NULL,'2025-02-25 12:51:02','orderCreated',NULL,NULL,'users'),
(100,1,'2025-02-25 12:51:02','default','{\"order_id\":55,\"full_name\":\"Table .\"}',55,'orders',NULL,NULL,'2025-02-27 10:25:53','orderCreated','2025-02-27 10:25:53',NULL,'users'),
(101,2,'2025-02-25 12:51:03','default','{\"order_id\":55,\"full_name\":\"Table .\"}',55,'orders',NULL,NULL,'2025-02-25 12:51:03','orderCreated',NULL,NULL,'users'),
(102,1,'2025-02-25 12:51:03','default','{\"order_id\":56,\"full_name\":\"Table .\"}',56,'orders',NULL,NULL,'2025-02-27 10:25:53','orderCreated','2025-02-27 10:25:53',NULL,'users'),
(103,2,'2025-02-25 12:51:03','default','{\"order_id\":56,\"full_name\":\"Table .\"}',56,'orders',NULL,NULL,'2025-02-25 12:51:03','orderCreated',NULL,NULL,'users'),
(104,1,'2025-02-25 12:52:59','default','{\"order_id\":57,\"full_name\":\"Table .\"}',57,'orders',NULL,NULL,'2025-02-27 10:25:53','orderCreated','2025-02-27 10:25:53',NULL,'users'),
(105,2,'2025-02-25 12:53:00','default','{\"order_id\":57,\"full_name\":\"Table .\"}',57,'orders',NULL,NULL,'2025-02-25 12:53:00','orderCreated',NULL,NULL,'users'),
(106,1,'2025-02-26 22:19:16','default','{\"order_id\":58,\"full_name\":\"Table 01 .\"}',58,'orders',NULL,NULL,'2025-02-27 10:25:53','orderCreated','2025-02-27 10:25:53',NULL,'users'),
(107,2,'2025-02-26 22:19:16','default','{\"order_id\":58,\"full_name\":\"Table 01 .\"}',58,'orders',NULL,NULL,'2025-02-26 22:19:16','orderCreated',NULL,NULL,'users'),
(108,1,'2025-02-27 09:48:49','default','{\"order_id\":59,\"full_name\":\"Table 02 .\"}',59,'orders',NULL,NULL,'2025-02-27 10:25:53','orderCreated','2025-02-27 10:25:53',NULL,'users'),
(109,2,'2025-02-27 09:48:49','default','{\"order_id\":59,\"full_name\":\"Table 02 .\"}',59,'orders',NULL,NULL,'2025-02-27 09:48:49','orderCreated',NULL,NULL,'users'),
(110,1,'2025-02-27 09:55:40','default','{\"order_id\":60,\"full_name\":\"Table 01 .\"}',60,'orders',NULL,NULL,'2025-02-27 10:25:53','orderCreated','2025-02-27 10:25:53',NULL,'users'),
(111,2,'2025-02-27 09:55:41','default','{\"order_id\":60,\"full_name\":\"Table 01 .\"}',60,'orders',NULL,NULL,'2025-02-27 09:55:41','orderCreated',NULL,NULL,'users'),
(112,1,'2025-02-27 10:38:15','default','{\"order_id\":62,\"full_name\":\"Table 01 .\"}',62,'orders',NULL,NULL,'2025-02-27 10:38:15','orderCreated',NULL,NULL,'users'),
(113,2,'2025-02-27 10:38:16','default','{\"order_id\":62,\"full_name\":\"Table 01 .\"}',62,'orders',NULL,NULL,'2025-02-27 10:38:16','orderCreated',NULL,NULL,'users'),
(114,1,'2025-02-27 10:42:20','default','{\"order_id\":64,\"full_name\":\"Table 02 .\"}',64,'orders',NULL,NULL,'2025-02-27 10:42:20','orderCreated',NULL,NULL,'users'),
(115,2,'2025-02-27 10:42:20','default','{\"order_id\":64,\"full_name\":\"Table 02 .\"}',64,'orders',NULL,NULL,'2025-02-27 10:42:20','orderCreated',NULL,NULL,'users'),
(116,1,'2025-02-27 10:43:33','default','{\"order_id\":65,\"full_name\":\"Table 02 .\"}',65,'orders',NULL,NULL,'2025-02-27 10:43:33','orderCreated',NULL,NULL,'users'),
(117,2,'2025-02-27 10:43:33','default','{\"order_id\":65,\"full_name\":\"Table 02 .\"}',65,'orders',NULL,NULL,'2025-02-27 10:43:33','orderCreated',NULL,NULL,'users'),
(118,1,'2025-02-27 20:44:08','default','{\"order_id\":70,\"full_name\":\"Table 03 .\"}',70,'orders',NULL,NULL,'2025-02-27 20:44:08','orderCreated',NULL,NULL,'users'),
(119,2,'2025-02-27 20:44:09','default','{\"order_id\":70,\"full_name\":\"Table 03 .\"}',70,'orders',NULL,NULL,'2025-02-27 20:44:09','orderCreated',NULL,NULL,'users'),
(120,1,'2025-02-27 20:47:08','default','{\"order_id\":71,\"full_name\":\"Table 02 .\"}',71,'orders',NULL,NULL,'2025-02-27 20:47:08','orderCreated',NULL,NULL,'users'),
(121,2,'2025-02-27 20:47:08','default','{\"order_id\":71,\"full_name\":\"Table 02 .\"}',71,'orders',NULL,NULL,'2025-02-27 20:47:08','orderCreated',NULL,NULL,'users'),
(122,1,'2025-02-27 22:39:53','default','{\"order_id\":72,\"full_name\":\"Table 01 .\"}',72,'orders',NULL,NULL,'2025-02-27 22:39:53','orderCreated',NULL,NULL,'users'),
(123,2,'2025-02-27 22:39:53','default','{\"order_id\":72,\"full_name\":\"Table 01 .\"}',72,'orders',NULL,NULL,'2025-02-27 22:39:53','orderCreated',NULL,NULL,'users'),
(124,1,'2025-02-27 23:07:42','default','{\"order_id\":74,\"full_name\":\"Table 04 .\"}',74,'orders',NULL,NULL,'2025-02-27 23:07:42','orderCreated',NULL,NULL,'users'),
(125,2,'2025-02-27 23:07:42','default','{\"order_id\":74,\"full_name\":\"Table 04 .\"}',74,'orders',NULL,NULL,'2025-02-27 23:07:42','orderCreated',NULL,NULL,'users'),
(126,1,'2025-02-27 23:49:10','default','{\"order_id\":75,\"full_name\":\"Table 02 .\"}',75,'orders',NULL,NULL,'2025-02-27 23:49:10','orderCreated',NULL,NULL,'users'),
(127,2,'2025-02-27 23:49:11','default','{\"order_id\":75,\"full_name\":\"Table 02 .\"}',75,'orders',NULL,NULL,'2025-02-27 23:49:11','orderCreated',NULL,NULL,'users'),
(128,1,'2025-02-28 00:01:00','default','{\"order_id\":76,\"full_name\":\"Table 01 .\"}',76,'orders',NULL,NULL,'2025-02-28 00:01:00','orderCreated',NULL,NULL,'users'),
(129,2,'2025-02-28 00:01:00','default','{\"order_id\":76,\"full_name\":\"Table 01 .\"}',76,'orders',NULL,NULL,'2025-02-28 00:01:00','orderCreated',NULL,NULL,'users'),
(130,1,'2025-02-28 13:14:11','default','{\"order_id\":78,\"full_name\":\"Table 04 .\"}',78,'orders',NULL,NULL,'2025-02-28 13:14:11','orderCreated',NULL,NULL,'users'),
(131,2,'2025-02-28 13:14:11','default','{\"order_id\":78,\"full_name\":\"Table 04 .\"}',78,'orders',NULL,NULL,'2025-02-28 13:14:11','orderCreated',NULL,NULL,'users'),
(132,1,'2025-02-28 14:21:19','default','{\"order_id\":79,\"full_name\":\"Table 03 .\"}',79,'orders',NULL,NULL,'2025-02-28 14:21:19','orderCreated',NULL,NULL,'users'),
(133,2,'2025-02-28 14:21:20','default','{\"order_id\":79,\"full_name\":\"Table 03 .\"}',79,'orders',NULL,NULL,'2025-02-28 14:21:20','orderCreated',NULL,NULL,'users'),
(134,1,'2025-02-28 14:39:38','default','{\"order_id\":80,\"full_name\":\"Table 04 .\"}',80,'orders',NULL,NULL,'2025-02-28 14:39:38','orderCreated',NULL,NULL,'users'),
(135,2,'2025-02-28 14:39:39','default','{\"order_id\":80,\"full_name\":\"Table 04 .\"}',80,'orders',NULL,NULL,'2025-02-28 14:39:39','orderCreated',NULL,NULL,'users'),
(136,1,'2025-02-28 14:39:42','default','{\"order_id\":81,\"full_name\":\"Table 04 .\"}',81,'orders',NULL,NULL,'2025-02-28 14:39:42','orderCreated',NULL,NULL,'users'),
(137,2,'2025-02-28 14:39:42','default','{\"order_id\":81,\"full_name\":\"Table 04 .\"}',81,'orders',NULL,NULL,'2025-02-28 14:39:42','orderCreated',NULL,NULL,'users'),
(138,1,'2025-02-28 14:41:01','default','{\"order_id\":82,\"full_name\":\"Table 01 .\"}',82,'orders',NULL,NULL,'2025-02-28 14:41:01','orderCreated',NULL,NULL,'users'),
(139,2,'2025-02-28 14:41:02','default','{\"order_id\":82,\"full_name\":\"Table 01 .\"}',82,'orders',NULL,NULL,'2025-02-28 14:41:02','orderCreated',NULL,NULL,'users'),
(140,1,'2025-02-28 14:47:26','default','{\"order_id\":83,\"full_name\":\"Table 04 .\"}',83,'orders',NULL,NULL,'2025-02-28 14:47:26','orderCreated',NULL,NULL,'users'),
(141,2,'2025-02-28 14:47:27','default','{\"order_id\":83,\"full_name\":\"Table 04 .\"}',83,'orders',NULL,NULL,'2025-02-28 14:47:27','orderCreated',NULL,NULL,'users'),
(142,1,'2025-02-28 19:50:48','default','{\"order_id\":84,\"full_name\":\"Table 04 .\"}',84,'orders',NULL,NULL,'2025-02-28 19:50:48','orderCreated',NULL,NULL,'users'),
(143,2,'2025-02-28 19:50:48','default','{\"order_id\":84,\"full_name\":\"Table 04 .\"}',84,'orders',NULL,NULL,'2025-02-28 19:50:48','orderCreated',NULL,NULL,'users'),
(144,1,'2025-02-28 21:08:52','default','{\"order_id\":90,\"full_name\":\"Table 02 .\"}',90,'orders',NULL,NULL,'2025-02-28 21:08:52','orderCreated',NULL,NULL,'users'),
(145,2,'2025-02-28 21:08:53','default','{\"order_id\":90,\"full_name\":\"Table 02 .\"}',90,'orders',NULL,NULL,'2025-02-28 21:08:53','orderCreated',NULL,NULL,'users'),
(146,1,'2025-03-01 17:14:42','default','{\"order_id\":96,\"full_name\":\"Table 04 .\"}',96,'orders',NULL,NULL,'2025-03-01 17:14:42','orderCreated',NULL,NULL,'users'),
(147,2,'2025-03-01 17:14:43','default','{\"order_id\":96,\"full_name\":\"Table 04 .\"}',96,'orders',NULL,NULL,'2025-03-01 17:14:43','orderCreated',NULL,NULL,'users'),
(148,1,'2025-03-01 17:20:38','default','{\"order_id\":98,\"full_name\":\"Table 02 .\"}',98,'orders',NULL,NULL,'2025-03-01 17:20:38','orderCreated',NULL,NULL,'users'),
(149,2,'2025-03-01 17:20:39','default','{\"order_id\":98,\"full_name\":\"Table 02 .\"}',98,'orders',NULL,NULL,'2025-03-01 17:20:39','orderCreated',NULL,NULL,'users'),
(150,1,'2025-03-01 17:37:28','default','{\"order_id\":104,\"full_name\":\"Table 01 .\"}',104,'orders',NULL,NULL,'2025-03-01 17:37:28','orderCreated',NULL,NULL,'users'),
(151,2,'2025-03-01 17:37:29','default','{\"order_id\":104,\"full_name\":\"Table 01 .\"}',104,'orders',NULL,NULL,'2025-03-01 17:37:29','orderCreated',NULL,NULL,'users'),
(152,1,'2025-03-01 17:37:54','default','{\"order_id\":105,\"full_name\":\"Table .\"}',105,'orders',NULL,NULL,'2025-03-01 17:37:54','orderCreated',NULL,NULL,'users'),
(153,2,'2025-03-01 17:37:54','default','{\"order_id\":105,\"full_name\":\"Table .\"}',105,'orders',NULL,NULL,'2025-03-01 17:37:54','orderCreated',NULL,NULL,'users'),
(154,1,'2025-03-01 19:01:10','default','{\"order_id\":106,\"full_name\":\"Table 01 .\"}',106,'orders',NULL,NULL,'2025-03-01 19:01:10','orderCreated',NULL,NULL,'users'),
(155,2,'2025-03-01 19:01:11','default','{\"order_id\":106,\"full_name\":\"Table 01 .\"}',106,'orders',NULL,NULL,'2025-03-01 19:01:11','orderCreated',NULL,NULL,'users'),
(156,1,'2025-03-01 19:39:46','default','{\"order_id\":107,\"full_name\":\"Table 02 .\"}',107,'orders',NULL,NULL,'2025-03-01 19:39:46','orderCreated',NULL,NULL,'users'),
(157,2,'2025-03-01 19:39:46','default','{\"order_id\":107,\"full_name\":\"Table 02 .\"}',107,'orders',NULL,NULL,'2025-03-01 19:39:46','orderCreated',NULL,NULL,'users'),
(158,1,'2025-03-02 12:58:24','default','{\"order_id\":111,\"full_name\":\"Table .\"}',111,'orders',NULL,NULL,'2025-03-02 12:58:24','orderCreated',NULL,NULL,'users'),
(159,2,'2025-03-02 12:58:25','default','{\"order_id\":111,\"full_name\":\"Table .\"}',111,'orders',NULL,NULL,'2025-03-02 12:58:25','orderCreated',NULL,NULL,'users'),
(160,1,'2025-03-02 13:38:23','default','{\"order_id\":112,\"full_name\":\"Table 5 .\"}',112,'orders',NULL,NULL,'2025-03-02 13:38:23','orderCreated',NULL,NULL,'users'),
(161,2,'2025-03-02 13:38:24','default','{\"order_id\":112,\"full_name\":\"Table 5 .\"}',112,'orders',NULL,NULL,'2025-03-02 13:38:24','orderCreated',NULL,NULL,'users'),
(162,1,'2025-03-02 13:46:38','default','{\"order_id\":114,\"full_name\":\"Table 02 .\"}',114,'orders',NULL,NULL,'2025-03-02 13:46:38','orderCreated',NULL,NULL,'users'),
(163,2,'2025-03-02 13:46:39','default','{\"order_id\":114,\"full_name\":\"Table 02 .\"}',114,'orders',NULL,NULL,'2025-03-02 13:46:39','orderCreated',NULL,NULL,'users'),
(164,1,'2025-03-02 13:50:17','default','{\"order_id\":115,\"full_name\":\"Table 5 .\"}',115,'orders',NULL,NULL,'2025-03-02 13:50:17','orderCreated',NULL,NULL,'users'),
(165,2,'2025-03-02 13:50:18','default','{\"order_id\":115,\"full_name\":\"Table 5 .\"}',115,'orders',NULL,NULL,'2025-03-02 13:50:18','orderCreated',NULL,NULL,'users'),
(166,1,'2025-03-02 14:55:47','default','{\"order_id\":117,\"full_name\":\"Table 5 .\"}',117,'orders',NULL,NULL,'2025-03-02 14:55:47','orderCreated',NULL,NULL,'users'),
(167,2,'2025-03-02 14:55:47','default','{\"order_id\":117,\"full_name\":\"Table 5 .\"}',117,'orders',NULL,NULL,'2025-03-02 14:55:47','orderCreated',NULL,NULL,'users'),
(168,1,'2025-03-02 14:59:40','default','{\"order_id\":119,\"full_name\":\"Table 5 .\"}',119,'orders',NULL,NULL,'2025-03-02 14:59:40','orderCreated',NULL,NULL,'users'),
(169,2,'2025-03-02 14:59:40','default','{\"order_id\":119,\"full_name\":\"Table 5 .\"}',119,'orders',NULL,NULL,'2025-03-02 14:59:40','orderCreated',NULL,NULL,'users'),
(170,1,'2025-03-02 15:01:14','default','{\"order_id\":120,\"full_name\":\"Table 5 .\"}',120,'orders',NULL,NULL,'2025-03-02 15:01:14','orderCreated',NULL,NULL,'users'),
(171,2,'2025-03-02 15:01:14','default','{\"order_id\":120,\"full_name\":\"Table 5 .\"}',120,'orders',NULL,NULL,'2025-03-02 15:01:14','orderCreated',NULL,NULL,'users'),
(172,1,'2025-03-02 15:02:17','default','{\"order_id\":121,\"full_name\":\"Table 01 .\"}',121,'orders',NULL,NULL,'2025-03-02 15:02:17','orderCreated',NULL,NULL,'users'),
(173,2,'2025-03-02 15:02:18','default','{\"order_id\":121,\"full_name\":\"Table 01 .\"}',121,'orders',NULL,NULL,'2025-03-02 15:02:18','orderCreated',NULL,NULL,'users'),
(174,1,'2025-03-02 20:52:32','default','{\"order_id\":123,\"full_name\":\"Table 02 .\"}',123,'orders',NULL,NULL,'2025-03-02 20:52:32','orderCreated',NULL,NULL,'users'),
(175,2,'2025-03-02 20:52:33','default','{\"order_id\":123,\"full_name\":\"Table 02 .\"}',123,'orders',NULL,NULL,'2025-03-02 20:52:33','orderCreated',NULL,NULL,'users'),
(176,1,'2025-03-02 20:57:53','default','{\"order_id\":125,\"full_name\":\"Table 03 .\"}',125,'orders',NULL,NULL,'2025-03-02 20:57:53','orderCreated',NULL,NULL,'users'),
(177,2,'2025-03-02 20:57:53','default','{\"order_id\":125,\"full_name\":\"Table 03 .\"}',125,'orders',NULL,NULL,'2025-03-02 20:57:53','orderCreated',NULL,NULL,'users'),
(178,1,'2025-03-03 10:05:02','default','{\"order_id\":126,\"full_name\":\"Table 05 .\"}',126,'orders',NULL,NULL,'2025-03-03 10:05:02','orderCreated',NULL,NULL,'users'),
(179,2,'2025-03-03 10:05:02','default','{\"order_id\":126,\"full_name\":\"Table 05 .\"}',126,'orders',NULL,NULL,'2025-03-03 10:05:02','orderCreated',NULL,NULL,'users'),
(180,1,'2025-03-03 10:14:39','default','{\"order_id\":127,\"full_name\":\"Table 03 .\"}',127,'orders',NULL,NULL,'2025-03-03 10:14:39','orderCreated',NULL,NULL,'users'),
(181,2,'2025-03-03 10:14:39','default','{\"order_id\":127,\"full_name\":\"Table 03 .\"}',127,'orders',NULL,NULL,'2025-03-03 10:14:39','orderCreated',NULL,NULL,'users'),
(182,1,'2025-03-03 15:43:34','default','{\"order_id\":132,\"full_name\":\"Table 01 .\"}',132,'orders',NULL,NULL,'2025-03-03 15:43:34','orderCreated',NULL,NULL,'users'),
(183,2,'2025-03-03 15:43:34','default','{\"order_id\":132,\"full_name\":\"Table 01 .\"}',132,'orders',NULL,NULL,'2025-03-03 15:43:34','orderCreated',NULL,NULL,'users'),
(184,1,'2025-03-06 01:36:38','default','{\"order_id\":140,\"full_name\":\"Table 02 .\"}',140,'orders',NULL,NULL,'2025-03-06 01:36:38','orderCreated',NULL,NULL,'users'),
(185,1,'2025-03-06 01:46:39','default','{\"order_id\":145,\"full_name\":\"Table 02 .\"}',145,'orders',NULL,NULL,'2025-03-06 01:46:39','orderCreated',NULL,NULL,'users'),
(186,1,'2025-03-06 01:56:30','default','{\"order_id\":146,\"full_name\":\"Table 05 .\"}',146,'orders',NULL,NULL,'2025-03-06 01:56:30','orderCreated',NULL,NULL,'users'),
(187,1,'2025-03-06 02:47:32','default','{\"order_id\":147,\"full_name\":\"Table 02 .\"}',147,'orders',NULL,NULL,'2025-03-06 02:47:32','orderCreated',NULL,NULL,'users'),
(188,1,'2025-03-06 03:32:51','default','{\"order_id\":148,\"full_name\":\"Table 02 .\"}',148,'orders',NULL,NULL,'2025-03-06 03:32:51','orderCreated',NULL,NULL,'users'),
(189,1,'2025-03-06 16:21:58','default','{\"order_id\":149,\"full_name\":\"Table 03 .\"}',149,'orders',NULL,NULL,'2025-03-06 16:21:58','orderCreated',NULL,NULL,'users'),
(190,1,'2025-03-06 16:37:55','default','{\"order_id\":152,\"full_name\":\"Table 02 .\"}',152,'orders',NULL,NULL,'2025-03-06 16:37:55','orderCreated',NULL,NULL,'users'),
(191,1,'2025-03-06 16:42:30','default','{\"order_id\":153,\"full_name\":\"Table 05 .\"}',153,'orders',NULL,NULL,'2025-03-06 16:42:30','orderCreated',NULL,NULL,'users'),
(192,1,'2025-03-06 19:41:27','default','{\"order_id\":155,\"full_name\":\"Table 05 .\"}',155,'orders',NULL,NULL,'2025-03-06 19:41:27','orderCreated',NULL,NULL,'users'),
(193,1,'2025-09-29 19:52:03','default','{\"order_id\":191,\"status_id\":3,\"status_name\":\"Preparation\"}',191,'orders',1,'users','2025-09-29 19:52:03','orderStatusUpdated',NULL,NULL,'customers'),
(194,1,'2025-09-29 19:52:07','default','{\"order_id\":191,\"status_id\":10,\"status_name\":\"Paid\"}',191,'orders',1,'users','2025-09-29 19:52:07','orderStatusUpdated',NULL,NULL,'customers'),
(195,1,'2025-10-08 16:43:40','default','{\"order_id\":201,\"status_id\":3,\"status_name\":\"Preparation\"}',201,'orders',1,'users','2025-10-08 16:43:40','orderStatusUpdated',NULL,NULL,'customers'),
(196,1,'2025-10-09 15:42:00','default','{\"order_id\":201,\"status_id\":9,\"status_name\":\"Canceled\"}',201,'orders',1,'users','2025-10-09 15:42:00','orderStatusUpdated',NULL,NULL,'customers'),
(197,1,'2025-10-09 21:11:38','default','{\"order_id\":208,\"status_id\":3,\"status_name\":\"Preparation\"}',208,'orders',1,'users','2025-10-09 21:11:38','orderStatusUpdated',NULL,NULL,'customers'),
(198,1,'2025-10-09 21:12:20','default','{\"order_id\":208,\"status_id\":1,\"status_name\":\"Received\"}',208,'orders',1,'users','2025-10-09 21:12:20','orderStatusUpdated',NULL,NULL,'customers'),
(199,1,'2025-10-10 19:10:03','default','{\"order_id\":208,\"status_id\":5,\"status_name\":\"Completed\"}',208,'orders',1,'users','2025-10-10 19:10:03','orderStatusUpdated',NULL,NULL,'customers'),
(200,1,'2025-10-10 19:52:23','default','{\"order_id\":208,\"status_id\":4,\"status_name\":\"Delivery\"}',208,'orders',1,'users','2025-10-10 19:52:23','orderStatusUpdated',NULL,NULL,'customers'),
(201,1,'2025-10-11 18:45:25','default','{\"order_id\":201,\"status_id\":3,\"status_name\":\"Preparation\"}',201,'orders',1,'users','2025-10-11 18:45:25','orderStatusUpdated',NULL,NULL,'customers'),
(202,1,'2025-10-11 18:45:31','default','{\"order_id\":199,\"status_id\":3,\"status_name\":\"Preparation\"}',199,'orders',1,'users','2025-10-11 18:45:31','orderStatusUpdated',NULL,NULL,'customers'),
(203,1,'2025-10-13 20:31:31','default','{\"order_id\":211,\"status_id\":3,\"status_name\":\"Preparation\"}',211,'orders',1,'users','2025-10-13 20:31:31','orderStatusUpdated',NULL,NULL,'customers'),
(204,1,'2025-10-13 20:31:38','default','{\"order_id\":211,\"status_id\":5,\"status_name\":\"Completed\"}',211,'orders',1,'users','2025-10-13 20:31:38','orderStatusUpdated',NULL,NULL,'customers'),
(205,1,'2025-10-14 04:21:54','default','{\"order_id\":211,\"status_id\":4,\"status_name\":\"Delivery\"}',211,'orders',1,'users','2025-10-14 04:21:54','orderStatusUpdated',NULL,NULL,'customers'),
(206,1,'2025-10-15 22:09:35','default','{\"order_id\":213,\"status_id\":3,\"status_name\":\"Preparation\"}',213,'orders',1,'users','2025-10-15 22:09:35','orderStatusUpdated',NULL,NULL,'customers'),
(207,1,'2025-10-21 20:25:02','default','{\"order_id\":214,\"status_id\":3,\"status_name\":\"Preparation\"}',214,'orders',1,'users','2025-10-21 20:25:02','orderStatusUpdated',NULL,NULL,'customers'),
(208,1,'2025-10-21 20:25:14','default','{\"order_id\":214,\"status_id\":5,\"status_name\":\"Completed\"}',214,'orders',1,'users','2025-10-21 20:25:14','orderStatusUpdated',NULL,NULL,'customers'),
(209,1,'2025-11-10 18:03:52','default','{\"order_id\":227,\"status_id\":3,\"status_name\":\"Preparation\"}',227,'orders',1,'users','2025-11-10 18:03:52','orderStatusUpdated',NULL,NULL,'customers'),
(210,1,'2025-11-10 18:03:58','default','{\"order_id\":227,\"status_id\":5,\"status_name\":\"Completed\"}',227,'orders',1,'users','2025-11-10 18:03:58','orderStatusUpdated',NULL,NULL,'customers'),
(211,1,'2025-11-10 18:04:36','default','{\"order_id\":228,\"status_id\":3,\"status_name\":\"Preparation\"}',228,'orders',1,'users','2025-11-10 18:04:36','orderStatusUpdated',NULL,NULL,'customers'),
(212,1,'2025-11-10 18:04:43','default','{\"order_id\":228,\"status_id\":5,\"status_name\":\"Completed\"}',228,'orders',1,'users','2025-11-10 18:04:43','orderStatusUpdated',NULL,NULL,'customers'),
(213,1,'2025-12-01 16:48:48','default','{\"order_id\":281,\"status_id\":3,\"status_name\":\"Preparation\"}',281,'orders',1,'users','2025-12-01 16:48:48','orderStatusUpdated',NULL,NULL,'customers'),
(214,6,'2025-12-04 18:37:55','default','{\"order_id\":298,\"assignee_id\":6,\"assignee_name\":\"DemoTest\",\"assignee_group_id\":3,\"assignee_group_name\":\"Waiters\"}',298,'orders',1,'users','2025-12-04 18:37:55','orderAssigned',NULL,NULL,'users'),
(215,1,'2025-12-05 23:48:05','default','{\"order_id\":310,\"status_id\":3,\"status_name\":\"Preparation\"}',310,'orders',1,'users','2025-12-05 23:48:05','orderStatusUpdated',NULL,NULL,'customers');
/*!40000 ALTER TABLE `ti_activities` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `ti_addresses`
--

LOCK TABLES `ti_addresses` WRITE;
/*!40000 ALTER TABLE `ti_addresses` DISABLE KEYS */;
INSERT INTO `ti_addresses` VALUES
(1,NULL,'City rossiers dar el beida Alger','','City rossiers dar el beida Alger','AG01','16011',81,NULL,NULL),
(2,NULL,'City rossiers dar el beida Alger','','City rossiers dar el beida Alger','AG01','16011',81,NULL,NULL),
(3,NULL,'Null','Null','Null','Null','Null',81,NULL,NULL),
(4,NULL,'Null','Null','Null','Null','Null',81,NULL,NULL),
(5,NULL,'Null','Null','Null','Null','Null',81,NULL,NULL),
(6,NULL,'Null','Null','Null','Null','Null',81,NULL,NULL),
(7,NULL,'Null','Null','Null','Null','Null',81,NULL,NULL),
(8,NULL,'Null','Null','Null','Null','Null',81,NULL,NULL),
(9,NULL,'Null','Null','Null','Null','Null',81,NULL,NULL),
(10,NULL,'Null','Null','Null','Null','Null',81,NULL,NULL),
(11,NULL,'Null','Null','Null','Null','Null',81,NULL,NULL),
(12,NULL,'Null','Null','Null','Null','Null',81,NULL,NULL),
(13,NULL,'Null','Null','Null','Null','Null',81,NULL,NULL),
(14,NULL,'Null','Null','Null','Null','Null',81,NULL,NULL),
(15,NULL,'Null','Null','Null','Null','Null',81,NULL,NULL),
(16,NULL,'City rossiers dar el beida Alger','','City rossiers dar el beida Alger','N/A','16011',81,NULL,NULL),
(17,NULL,'City rossiers dar el beida Alger','Alger','City rossiers dar el beida Alger','N/A','16011',81,NULL,NULL),
(18,NULL,'Null','Null','Null','Null','Null',81,NULL,NULL),
(19,NULL,'Null','Null','Null','Null','Null',81,NULL,NULL),
(20,NULL,'Null','Null','Null','Null','Null',81,NULL,NULL),
(21,1,'City rossiers dar el beida Alger','','City rossiers dar el beida Alger','AG01','16011',81,NULL,NULL),
(22,1,'City rossiers dar el beida Alger','','City rossiers dar el beida Alger','AG01','16011',81,NULL,NULL),
(23,NULL,'Null','Null','Null','Null','Null',81,NULL,NULL),
(24,NULL,'Null','Null','Null','Null','Null',81,NULL,NULL),
(25,NULL,'Null','Null','Null','Null','Null',81,NULL,NULL),
(26,NULL,'Null','Null','Null','Null','Null',81,NULL,NULL),
(27,NULL,'City rossiers dar el beida Alger','','City rossiers dar el beida Alger','N/A','16011',81,NULL,NULL),
(28,NULL,'Null','Null','Null','Null','Null',81,NULL,NULL),
(29,NULL,'Null','Null','Null','Null','Null',81,NULL,NULL),
(30,2,'Null','Null','Null','Null','Null',81,NULL,NULL),
(31,NULL,'Null','Null','Null','Null','Null',81,NULL,NULL),
(32,NULL,'Null','Null','Null','Null','Null',81,NULL,NULL),
(33,NULL,'Null','Null','Null','Null','Null',81,NULL,NULL),
(34,NULL,'Null','Null','Null','Null','Null',81,NULL,NULL),
(35,NULL,'City rossiers dar el beida Alger','Alger','Dar El Beida','AG01','16011',81,NULL,NULL),
(36,NULL,'19 City rosiers Dar el Beida Alger','','Dar El Beida','','16011',81,NULL,NULL),
(37,NULL,'Null','Null','Null','Null','Null',81,NULL,NULL),
(38,NULL,'Null','Null','Null','Null','Null',81,NULL,NULL),
(39,NULL,'Null','Null','Null','Null','Null',81,NULL,NULL),
(40,NULL,'Null','Null','Null','Null','Null',81,NULL,NULL),
(41,NULL,'Null','Null','Null','Null','Null',81,NULL,NULL),
(42,NULL,'Null','Null','Null','Null','Null',81,NULL,NULL),
(43,NULL,'Null','Null','Null','Null','Null',81,NULL,NULL),
(44,NULL,'Null','Null','Null','Null','Null',81,NULL,NULL),
(45,NULL,'Null','Null','Null','Null','Null',81,NULL,NULL),
(46,NULL,'Null','Null','Null','Null','Null',81,NULL,NULL),
(47,NULL,'Null','Null','Null','Null','Null',81,NULL,NULL),
(48,NULL,'Null','Null','Null','Null','Null',81,NULL,NULL),
(49,NULL,'Null','Null','Null','Null','Null',81,NULL,NULL),
(50,NULL,'Null','Null','Null','Null','Null',81,NULL,NULL),
(51,NULL,'Null','Null','Null','Null','Null',81,NULL,NULL),
(52,NULL,'Null','Null','Null','Null','Null',81,NULL,NULL),
(53,NULL,'Null','Null','Null','Null','Null',81,NULL,NULL),
(54,NULL,'Null','Null','Null','Null','Null',81,NULL,NULL),
(55,NULL,'Null','Null','Null','Null','Null',81,NULL,NULL),
(56,NULL,'Null','Null','Null','Null','Null',81,NULL,NULL),
(57,NULL,'Null','Null','Null','Null','Null',81,NULL,NULL),
(58,NULL,'Null','Null','Null','Null','Null',81,NULL,NULL),
(59,NULL,'Null','Null','Null','Null','Null',81,NULL,NULL),
(60,NULL,'Null','Null','Null','Null','Null',81,NULL,NULL),
(61,NULL,'Null','Null','Null','Null','Null',81,NULL,NULL),
(62,NULL,'Null','Null','Null','Null','Null',81,NULL,NULL),
(63,NULL,'Null','Null','Null','Null','Null',81,NULL,NULL),
(64,NULL,'Null','Null','Null','Null','Null',81,NULL,NULL),
(65,NULL,'Null','Null','Null','Null','Null',81,NULL,NULL),
(66,NULL,'Null','Null','Null','Null','Null',81,NULL,NULL),
(67,NULL,'Null','Null','Null','Null','Null',81,NULL,NULL),
(68,NULL,'Null','Null','Null','Null','Null',81,NULL,NULL),
(69,NULL,'Null','Null','Null','Null','Null',81,NULL,NULL),
(70,NULL,'Null','Null','Null','Null','Null',81,NULL,NULL),
(71,NULL,'Null','Null','Null','Null','Null',81,NULL,NULL),
(72,NULL,'Null','Null','Null','Null','Null',81,NULL,NULL),
(73,NULL,'Null','Null','Null','Null','Null',81,NULL,NULL),
(74,NULL,'Null','Null','Null','Null','Null',81,NULL,NULL),
(75,NULL,'Null','Null','Null','Null','Null',81,NULL,NULL),
(76,NULL,'Null','Null','Null','Null','Null',81,NULL,NULL),
(77,NULL,'Null','Null','Null','Null','Null',81,NULL,NULL),
(78,NULL,'Null','Null','Null','Null','Null',81,NULL,NULL),
(79,NULL,'Null','Null','Null','Null','Null',81,NULL,NULL),
(80,NULL,'Null','Null','Null','Null','Null',81,NULL,NULL),
(81,NULL,'Null','Null','Null','Null','Null',81,NULL,NULL),
(82,NULL,'Null','Null','Null','Null','Null',81,NULL,NULL),
(83,NULL,'Null','Null','Null','Null','Null',81,NULL,NULL),
(84,NULL,'Null','Null','Null','Null','Null',81,NULL,NULL),
(85,NULL,'Null','Null','Null','Null','Null',81,NULL,NULL),
(86,NULL,'Null','Null','Null','Null','Null',81,NULL,NULL),
(87,NULL,'Null','Null','Null','Null','Null',81,NULL,NULL),
(88,NULL,'Null','Null','Null','Null','Null',81,NULL,NULL),
(89,NULL,'Null','Null','Null','Null','Null',81,NULL,NULL),
(90,NULL,'Null','Null','Null','Null','Null',81,NULL,NULL),
(91,NULL,'Null','Null','Null','Null','Null',81,NULL,NULL),
(92,NULL,'Null','Null','Null','Null','Null',81,NULL,NULL),
(93,NULL,'Null','Null','Null','Null','Null',81,NULL,NULL),
(94,NULL,'Null','Null','Null','Null','Null',81,NULL,NULL),
(95,NULL,'Null','Null','Null','Null','Null',81,NULL,NULL),
(96,NULL,'Null','Null','Null','Null','Null',81,NULL,NULL),
(97,NULL,'Null','Null','Null','Null','Null',81,NULL,NULL),
(98,NULL,'Null','Null','Null','Null','Null',81,NULL,NULL),
(99,NULL,'Null','Null','Null','Null','Null',81,NULL,NULL),
(100,NULL,'Null','Null','Null','Null','Null',81,NULL,NULL),
(101,NULL,'Null','Null','Null','Null','Null',81,NULL,NULL),
(102,NULL,'Null','Null','Null','Null','Null',81,NULL,NULL),
(103,NULL,'Null','Null','Null','Null','Null',81,NULL,NULL),
(104,NULL,'Null','Null','Null','Null','Null',81,NULL,NULL),
(105,NULL,'Null','Null','Null','Null','Null',81,NULL,NULL),
(106,NULL,'Null','Null','Null','Null','Null',81,NULL,NULL),
(107,NULL,'Null','Null','Null','Null','Null',81,NULL,NULL),
(108,NULL,'Null','Null','Null','Null','Null',81,NULL,NULL),
(109,NULL,'Null','Null','Null','Null','Null',81,NULL,NULL),
(110,NULL,'Null','Null','Null','Null','Null',81,NULL,NULL),
(111,NULL,'Null','Null','Null','Null','Null',81,NULL,NULL),
(112,NULL,'Null','Null','Null','Null','Null',81,NULL,NULL),
(113,NULL,'Null','Null','Null','Null','Null',81,NULL,NULL),
(114,NULL,'Null','Null','Null','Null','Null',81,NULL,NULL),
(115,NULL,'Null','Null','Null','Null','Null',81,NULL,NULL),
(116,NULL,'Null','Null','Null','Null','Null',81,NULL,NULL),
(117,NULL,'Null','Null','Null','Null','Null',81,NULL,NULL),
(118,NULL,'Null','Null','Null','Null','Null',81,NULL,NULL),
(119,NULL,'Null','Null','Null','Null','Null',81,NULL,NULL),
(120,NULL,'Null','Null','Null','Null','Null',81,NULL,NULL),
(121,NULL,'Null','Null','Null','Null','Null',81,NULL,NULL),
(122,NULL,'Null','Null','Null','Null','Null',81,NULL,NULL),
(123,NULL,'Null','Null','Null','Null','Null',81,NULL,NULL),
(124,NULL,'Null','Null','Null','Null','Null',81,NULL,NULL),
(125,NULL,'Null','Null','Null','Null','Null',81,NULL,NULL),
(126,NULL,'Null','Null','Null','Null','Null',81,NULL,NULL),
(127,NULL,'Null','Null','Null','Null','Null',81,NULL,NULL),
(128,NULL,'Null','Null','Null','Null','Null',81,NULL,NULL),
(129,NULL,'Null','Null','Null','Null','Null',81,NULL,NULL),
(130,NULL,'Null','Null','Null','Null','Null',81,NULL,NULL),
(131,NULL,'Null','Null','Null','Null','Null',81,NULL,NULL),
(132,NULL,'Null','Null','Null','Null','Null',81,NULL,NULL),
(133,NULL,'Null','Null','Null','Null','Null',81,NULL,NULL),
(134,NULL,'Null','Null','Null','Null','Null',81,NULL,NULL),
(135,NULL,'Null','Null','Null','Null','Null',81,NULL,NULL),
(136,NULL,'Null','Null','Null','Null','Null',81,NULL,NULL),
(137,NULL,'Null','Null','Null','Null','Null',81,NULL,NULL),
(138,NULL,'Null','Null','Null','Null','Null',81,NULL,NULL),
(139,NULL,'Null','Null','Null','Null','Null',81,NULL,NULL),
(140,NULL,'Null','Null','Null','Null','Null',81,NULL,NULL),
(141,NULL,'Null','Null','Null','Null','Null',81,NULL,NULL),
(142,NULL,'Null','Null','Null','Null','Null',81,NULL,NULL),
(143,NULL,'Null','Null','Null','Null','Null',81,NULL,NULL),
(144,NULL,'Null','Null','Null','Null','Null',81,NULL,NULL),
(145,NULL,'Null','Null','Null','Null','Null',81,NULL,NULL),
(146,NULL,'Null','Null','Null','Null','Null',81,NULL,NULL),
(147,NULL,'Null','Null','Null','Null','Null',81,NULL,NULL),
(148,NULL,'Null','Null','Null','Null','Null',81,NULL,NULL),
(149,NULL,'Null','Null','Null','Null','Null',81,NULL,NULL),
(150,NULL,'Null','Null','Null','Null','Null',81,NULL,NULL),
(151,NULL,'Null','Null','Null','Null','Null',81,NULL,NULL),
(152,NULL,'Null','Null','Null','Null','Null',81,NULL,NULL),
(153,NULL,'Null','Null','Null','Null','Null',81,NULL,NULL);
/*!40000 ALTER TABLE `ti_addresses` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `ti_allergenables`
--

LOCK TABLES `ti_allergenables` WRITE;
/*!40000 ALTER TABLE `ti_allergenables` DISABLE KEYS */;
/*!40000 ALTER TABLE `ti_allergenables` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `ti_allergens`
--

LOCK TABLES `ti_allergens` WRITE;
/*!40000 ALTER TABLE `ti_allergens` DISABLE KEYS */;
/*!40000 ALTER TABLE `ti_allergens` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `ti_assignable_logs`
--

LOCK TABLES `ti_assignable_logs` WRITE;
/*!40000 ALTER TABLE `ti_assignable_logs` DISABLE KEYS */;
/*!40000 ALTER TABLE `ti_assignable_logs` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `ti_banners`
--

LOCK TABLES `ti_banners` WRITE;
/*!40000 ALTER TABLE `ti_banners` DISABLE KEYS */;
/*!40000 ALTER TABLE `ti_banners` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `ti_cache`
--

LOCK TABLES `ti_cache` WRITE;
/*!40000 ALTER TABLE `ti_cache` DISABLE KEYS */;
/*!40000 ALTER TABLE `ti_cache` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `ti_categories`
--

LOCK TABLES `ti_categories` WRITE;
/*!40000 ALTER TABLE `ti_categories` DISABLE KEYS */;
INSERT INTO `ti_categories` VALUES
(1,'Appetizer','',NULL,1,1,1,NULL,1,2,'appetizer','2024-12-31 17:34:40','2025-01-05 20:44:58'),
(2,'Main Course','',NULL,6,1,1,NULL,3,4,NULL,'2024-12-31 17:34:40','2025-01-05 20:42:28'),
(3,'Salads','',NULL,3,1,1,NULL,5,6,'salads','2024-12-31 17:34:40','2025-01-05 20:44:48'),
(4,'Seafoods','',NULL,4,1,1,NULL,7,8,'seafoods','2024-12-31 17:34:40','2025-01-05 20:44:43'),
(5,'Traditional','',NULL,5,1,1,NULL,9,10,'traditional','2024-12-31 17:34:40','2025-01-05 20:44:35'),
(6,'Desserts','',NULL,8,1,1,NULL,11,12,'desserts','2024-12-31 17:34:40','2025-01-05 20:42:52'),
(7,'Drinks','',NULL,9,1,1,NULL,13,14,'drinks','2024-12-31 17:34:40','2025-01-05 20:42:45'),
(8,'Specials','',NULL,2,1,1,NULL,15,16,'specials','2024-12-31 17:34:40','2025-01-05 20:44:22'),
(9,'asdasd','',NULL,10,1,1,NULL,17,18,'asdasd','2025-10-18 19:20:54','2025-10-18 19:20:54'),
(11,'Persian','',NULL,11,1,1,NULL,19,20,'o','2025-10-23 18:56:55','2025-10-23 18:56:55');
/*!40000 ALTER TABLE `ti_categories` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `ti_countries`
--

LOCK TABLES `ti_countries` WRITE;
/*!40000 ALTER TABLE `ti_countries` DISABLE KEYS */;
INSERT INTO `ti_countries` VALUES
(1,'Afghanistan','AF','AFG','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(2,'Albania','AL','ALB','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(3,'Algeria','DZ','DZA','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(4,'American Samoa','AS','ASM','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(5,'Andorra','AD','AND','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(6,'Angola','AO','AGO','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(7,'Anguilla','AI','AIA','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(8,'Antarctica','AQ','ATA','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(9,'Antigua and Barbuda','AG','ATG','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(10,'Argentina','AR','ARG','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(11,'Armenia','AM','ARM','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(12,'Aruba','AW','ABW','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(13,'Australia','AU','AUS','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(14,'Austria','AT','AUT','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(15,'Azerbaijan','AZ','AZE','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(16,'Bahamas','BS','BHS','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(17,'Bahrain','BH','BHR','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(18,'Bangladesh','BD','BGD','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(19,'Barbados','BB','BRB','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(20,'Belarus','BY','BLR','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(21,'Belgium','BE','BEL','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(22,'Belize','BZ','BLZ','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(23,'Benin','BJ','BEN','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(24,'Bermuda','BM','BMU','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(25,'Bhutan','BT','BTN','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(26,'Bolivia','BO','BOL','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(27,'Bosnia and Herzegowina','BA','BIH','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(28,'Botswana','BW','BWA','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(29,'Bouvet Island','BV','BVT','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(30,'Brazil','BR','BRA','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(31,'British Indian Ocean Territory','IO','IOT','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(32,'Brunei Darussalam','BN','BRN','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(33,'Bulgaria','BG','BGR','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(34,'Burkina Faso','BF','BFA','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(35,'Burundi','BI','BDI','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(36,'Cambodia','KH','KHM','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(37,'Cameroon','CM','CMR','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(38,'Canada','CA','CAN','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(39,'Cape Verde','CV','CPV','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(40,'Cayman Islands','KY','CYM','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(41,'Central African Republic','CF','CAF','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(42,'Chad','TD','TCD','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(43,'Chile','CL','CHL','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(44,'China','CN','CHN','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(45,'Christmas Island','CX','CXR','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(46,'Cocos (Keeling) Islands','CC','CCK','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(47,'Colombia','CO','COL','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(48,'Comoros','KM','COM','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(49,'Congo','CG','COG','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(50,'Cook Islands','CK','COK','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(51,'Costa Rica','CR','CRI','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(52,'Cote D\'Ivoire','CI','CIV','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(53,'Croatia','HR','HRV','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(54,'Cuba','CU','CUB','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(55,'Cyprus','CY','CYP','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(56,'Czech Republic','CZ','CZE','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(57,'Denmark','DK','DNK','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(58,'Djibouti','DJ','DJI','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(59,'Dominica','DM','DMA','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(60,'Dominican Republic','DO','DOM','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(61,'East Timor','TP','TMP','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(62,'Ecuador','EC','ECU','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(63,'Egypt','EG','EGY','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(64,'El Salvador','SV','SLV','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(65,'Equatorial Guinea','GQ','GNQ','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(66,'Eritrea','ER','ERI','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(67,'Estonia','EE','EST','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(68,'Ethiopia','ET','ETH','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(69,'Falkland Islands (Malvinas)','FK','FLK','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(70,'Faroe Islands','FO','FRO','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(71,'Fiji','FJ','FJI','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(72,'Finland','FI','FIN','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(73,'France','FR','FRA','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(74,'France, Metropolitan','FX','FXX','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(75,'French Guiana','GF','GUF','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(76,'French Polynesia','PF','PYF','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(77,'French Southern Territories','TF','ATF','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(78,'Gabon','GA','GAB','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(79,'Gambia','GM','GMB','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(80,'Georgia','GE','GEO','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(81,'Germany','DE','DEU','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(82,'Ghana','GH','GHA','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(83,'Gibraltar','GI','GIB','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(84,'Greece','GR','GRC','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(85,'Greenland','GL','GRL','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(86,'Grenada','GD','GRD','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(87,'Guadeloupe','GP','GLP','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(88,'Guam','GU','GUM','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(89,'Guatemala','GT','GTM','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(90,'Guinea','GN','GIN','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(91,'Guinea-bissau','GW','GNB','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(92,'Guyana','GY','GUY','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(93,'Haiti','HT','HTI','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(94,'Heard and Mc Donald Islands','HM','HMD','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(95,'Honduras','HN','HND','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(96,'Hong Kong','HK','HKG','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(97,'Hungary','HU','HUN','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(98,'Iceland','IS','ISL','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(99,'India','IN','IND','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(100,'Indonesia','ID','IDN','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(101,'Iran (Islamic Republic of)','IR','IRN','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(102,'Iraq','IQ','IRQ','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(103,'Ireland','IE','IRL','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(104,'Israel','IL','ISR','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(105,'Italy','IT','ITA','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(106,'Jamaica','JM','JAM','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(107,'Japan','JP','JPN','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(108,'Jordan','JO','JOR','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(109,'Kazakhstan','KZ','KAZ','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(110,'Kenya','KE','KEN','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(111,'Kiribati','KI','KIR','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(112,'North Korea','KP','PRK','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(113,'Korea, Republic of','KR','KOR','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(114,'Kuwait','KW','KWT','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(115,'Kyrgyzstan','KG','KGZ','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(116,'Lao People\'s Democratic Republic','LA','LAO','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(117,'Latvia','LV','LVA','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(118,'Lebanon','LB','LBN','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(119,'Lesotho','LS','LSO','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(120,'Liberia','LR','LBR','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(121,'Libyan Arab Jamahiriya','LY','LBY','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(122,'Liechtenstein','LI','LIE','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(123,'Lithuania','LT','LTU','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(124,'Luxembourg','LU','LUX','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(125,'Macau','MO','MAC','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(126,'FYROM','MK','MKD','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(127,'Madagascar','MG','MDG','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(128,'Malawi','MW','MWI','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(129,'Malaysia','MY','MYS','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(130,'Maldives','MV','MDV','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(131,'Mali','ML','MLI','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(132,'Malta','MT','MLT','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(133,'Marshall Islands','MH','MHL','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(134,'Martinique','MQ','MTQ','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(135,'Mauritania','MR','MRT','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(136,'Mauritius','MU','MUS','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(137,'Mayotte','YT','MYT','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(138,'Mexico','MX','MEX','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(139,'Micronesia, Federated States of','FM','FSM','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(140,'Moldova, Republic of','MD','MDA','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(141,'Monaco','MC','MCO','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(142,'Mongolia','MN','MNG','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(143,'Montserrat','MS','MSR','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(144,'Morocco','MA','MAR','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(145,'Mozambique','MZ','MOZ','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(146,'Myanmar','MM','MMR','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(147,'Namibia','NA','NAM','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(148,'Nauru','NR','NRU','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(149,'Nepal','NP','NPL','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(150,'Netherlands','NL','NLD','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(151,'Netherlands Antilles','AN','ANT','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(152,'New Caledonia','NC','NCL','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(153,'New Zealand','NZ','NZL','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(154,'Nicaragua','NI','NIC','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(155,'Niger','NE','NER','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(156,'Nigeria','NG','NGA','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(157,'Niue','NU','NIU','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(158,'Norfolk Island','NF','NFK','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(159,'Northern Mariana Islands','MP','MNP','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(160,'Norway','NO','NOR','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(161,'Oman','OM','OMN','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(162,'Pakistan','PK','PAK','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(163,'Palau','PW','PLW','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(164,'Panama','PA','PAN','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(165,'Papua New Guinea','PG','PNG','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(166,'Paraguay','PY','PRY','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(167,'Peru','PE','PER','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(168,'Philippines','PH','PHL','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(169,'Pitcairn','PN','PCN','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(170,'Poland','PL','POL','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(171,'Portugal','PT','PRT','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(172,'Puerto Rico','PR','PRI','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(173,'Qatar','QA','QAT','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(174,'Reunion','RE','REU','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(175,'Romania','RO','ROM','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(176,'Russian Federation','RU','RUS','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(177,'Rwanda','RW','RWA','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(178,'Saint Kitts and Nevis','KN','KNA','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(179,'Saint Lucia','LC','LCA','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(180,'Saint Vincent and the Grenadines','VC','VCT','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(181,'Samoa','WS','WSM','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(182,'San Marino','SM','SMR','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(183,'Sao Tome and Principe','ST','STP','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(184,'Saudi Arabia','SA','SAU','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(185,'Senegal','SN','SEN','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(186,'Seychelles','SC','SYC','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(187,'Sierra Leone','SL','SLE','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(188,'Singapore','SG','SGP','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(189,'Slovak Republic','SK','SVK','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(190,'Slovenia','SI','SVN','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(191,'Solomon Islands','SB','SLB','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(192,'Somalia','SO','SOM','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(193,'South Africa','ZA','ZAF','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(194,'South Georgia &amp; South Sandwich Islands','GS','SGS','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(195,'Spain','ES','ESP','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(196,'Sri Lanka','LK','LKA','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(197,'St. Helena','SH','SHN','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(198,'St. Pierre and Miquelon','PM','SPM','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(199,'Sudan','SD','SDN','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(200,'Suriname','SR','SUR','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(201,'Svalbard and Jan Mayen Islands','SJ','SJM','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(202,'Swaziland','SZ','SWZ','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(203,'Sweden','SE','SWE','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(204,'Switzerland','CH','CHE','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(205,'Syrian Arab Republic','SY','SYR','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(206,'Taiwan','TW','TWN','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(207,'Tajikistan','TJ','TJK','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(208,'Tanzania, United Republic of','TZ','TZA','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(209,'Thailand','TH','THA','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(210,'Togo','TG','TGO','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(211,'Tokelau','TK','TKL','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(212,'Tonga','TO','TON','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(213,'Trinidad and Tobago','TT','TTO','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(214,'Tunisia','TN','TUN','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(215,'Turkey','TR','TUR','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(216,'Turkmenistan','TM','TKM','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(217,'Turks and Caicos Islands','TC','TCA','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(218,'Tuvalu','TV','TUV','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(219,'Uganda','UG','UGA','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(220,'Ukraine','UA','UKR','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(221,'United Arab Emirates','AE','ARE','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(222,'United Kingdom','GB','GBR','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(223,'United States','US','USA','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(224,'United States Minor Outlying Islands','UM','UMI','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(225,'Uruguay','UY','URY','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(226,'Uzbekistan','UZ','UZB','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(227,'Vanuatu','VU','VUT','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(228,'Vatican City State (Holy See)','VA','VAT','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(229,'Venezuela','VE','VEN','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(230,'Viet Nam','VN','VNM','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(231,'Virgin Islands (British)','VG','VGB','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(232,'Virgin Islands (U.S.)','VI','VIR','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(233,'Wallis and Futuna Islands','WF','WLF','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(234,'Western Sahara','EH','ESH','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(235,'Yemen','YE','YEM','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(236,'Yugoslavia','YU','YUG','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(237,'Democratic Republic of Congo','CD','COD','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(238,'Zambia','ZM','ZMB','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(239,'Zimbabwe','ZW','ZWE','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40');
/*!40000 ALTER TABLE `ti_countries` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `ti_currencies`
--

LOCK TABLES `ti_currencies` WRITE;
/*!40000 ALTER TABLE `ti_currencies` DISABLE KEYS */;
INSERT INTO `ti_currencies` VALUES
(1,222,'Pound Sterling','GBP','£',0.00000000,0,',','.','2','GB','GBR',826,1,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(2,223,'US Dollar','USD','$',0.00000000,0,',','.','2','US','USA',840,1,'2024-12-31 19:39:36','2024-12-31 17:34:40'),
(3,44,'Yuan Renminbi','CNY','¥',0.00000000,0,',','.','2','CN','CHN',156,0,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(4,13,'Australian Dollar','AUD','$',0.00000000,0,',','.','2','AU','AUS',36,1,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(5,156,'Naira','NGN','₦',0.00000000,0,',','.','2','NG','NGA',566,1,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(6,81,'EURO','EUR','€',0.00000000,0,',','.','2',NULL,NULL,NULL,1,'2025-01-01 11:47:27','2025-01-01 11:47:12');
/*!40000 ALTER TABLE `ti_currencies` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `ti_customer_groups`
--

LOCK TABLES `ti_customer_groups` WRITE;
/*!40000 ALTER TABLE `ti_customer_groups` DISABLE KEYS */;
INSERT INTO `ti_customer_groups` VALUES
(1,'Default group',NULL,0,'2024-12-31 17:34:40','2024-12-31 17:34:40');
/*!40000 ALTER TABLE `ti_customer_groups` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `ti_customers`
--

LOCK TABLES `ti_customers` WRITE;
/*!40000 ALTER TABLE `ti_customers` DISABLE KEYS */;
INSERT INTO `ti_customers` VALUES
(1,'oussama','douba','douba.oussama69@gmail.com','$2y$10$tM93JeKEdXy7VBcuX7c5z.Bqlg3QYxnOGQ1HhXpSNCEV0b7tYsU9y','+213671409293',22,1,1,NULL,'2025-01-04 20:52:53',1,NULL,NULL,NULL,'3Z3NoOoP9u802GkGaZzFONl23z6oIFWo3DaLdcJK67',1,'2025-01-04 20:52:53',NULL,'2025-02-16 19:11:29','2025-02-16 19:11:29',''),
(2,'Navier','Stockes','navier@test.com','$2y$10$fduWWu9xwONOuGwVILMgueFB1ia1cvotPQCSe0R58nvjCkAgCgDI.','+33565778899',30,1,1,NULL,'2025-02-17 17:22:40',1,NULL,NULL,NULL,NULL,1,'2025-02-17 17:22:40',NULL,'2025-02-17 17:27:57','2025-02-17 17:28:10','');
/*!40000 ALTER TABLE `ti_customers` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `ti_extension_settings`
--

LOCK TABLES `ti_extension_settings` WRITE;
/*!40000 ALTER TABLE `ti_extension_settings` DISABLE KEYS */;
INSERT INTO `ti_extension_settings` VALUES
(1,'igniter_review_settings','{\"ratings\": {\"ratings\": [\"Bad\", \"Worse\", \"Good\", \"Average\", \"Excellent\"]}, \"allow_reviews\": \"1\", \"approve_reviews\": \"1\"}'),
(2,'igniter_cart_settings','{\"conditions\": {\"tax\": {\"name\": \"tax\", \"label\": \"lang:igniter.cart::default.text_vat\", \"status\": \"1\", \"priority\": 3}, \"tip\": {\"name\": \"tip\", \"label\": \"lang:igniter.cart::default.text_tip\", \"status\": \"1\", \"priority\": 4}, \"coupon\": {\"name\": \"coupon\", \"label\": \"lang:igniter.coupons::default.text_coupon\", \"status\": \"1\", \"priority\": 0}, \"delivery\": {\"name\": \"delivery\", \"label\": \"lang:igniter.local::default.text_delivery\", \"status\": \"1\", \"priority\": 1}, \"paymentFee\": {\"name\": \"paymentFee\", \"label\": \"lang:igniter.cart::default.text_payment_fee\", \"status\": \"1\", \"priority\": 2}}, \"tip_amounts\": [], \"abandoned_cart\": \"0\", \"enable_tipping\": \"0\", \"tip_value_type\": \"F\", \"destroy_on_logout\": \"0\"}'),
(3,'igniter_broadcast_settings','{\"key\": \"0a7b52814ff6684a574d\", \"app_id\": \"1943101\", \"secret\": \"3cd01dee25a88886dc90\", \"cluster\": \"eu\", \"encrypted\": \"1\"}');
/*!40000 ALTER TABLE `ti_extension_settings` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `ti_extensions`
--

LOCK TABLES `ti_extensions` WRITE;
/*!40000 ALTER TABLE `ti_extensions` DISABLE KEYS */;
INSERT INTO `ti_extensions` VALUES
(1,'igniter.cart','2.19.6'),
(2,'igniter.frontend','v1.10.5'),
(3,'igniter.pages','v1.10.3'),
(4,'igniter.local','v2.10.3'),
(5,'igniter.payregister','v2.7.3'),
(6,'igniter.reservation','v2.10.3'),
(7,'igniter.user','1.13.3'),
(8,'igniter.automation','v1.8.3'),
(9,'igniter.api','0.1.0'),
(10,'igniter.broadcast','0.1.0'),
(11,'igniter.coupons','1.11.5'),
(12,'igniter.socialite','0.1.0'),
(13,'igniter.debugbar','0.1.0');
/*!40000 ALTER TABLE `ti_extensions` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `ti_failed_jobs`
--

LOCK TABLES `ti_failed_jobs` WRITE;
/*!40000 ALTER TABLE `ti_failed_jobs` DISABLE KEYS */;
/*!40000 ALTER TABLE `ti_failed_jobs` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `ti_igniter_automation_logs`
--

LOCK TABLES `ti_igniter_automation_logs` WRITE;
/*!40000 ALTER TABLE `ti_igniter_automation_logs` DISABLE KEYS */;
/*!40000 ALTER TABLE `ti_igniter_automation_logs` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `ti_igniter_automation_rule_actions`
--

LOCK TABLES `ti_igniter_automation_rule_actions` WRITE;
/*!40000 ALTER TABLE `ti_igniter_automation_rule_actions` DISABLE KEYS */;
INSERT INTO `ti_igniter_automation_rule_actions` VALUES
(1,1,'Igniter\\Automation\\AutomationRules\\Actions\\SendMailTemplate','{\"template\":\"igniter.local::mail.review_chase\",\"send_to\":\"customer\"}','2024-12-31 19:39:57','2024-12-31 19:39:57');
/*!40000 ALTER TABLE `ti_igniter_automation_rule_actions` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `ti_igniter_automation_rule_conditions`
--

LOCK TABLES `ti_igniter_automation_rule_conditions` WRITE;
/*!40000 ALTER TABLE `ti_igniter_automation_rule_conditions` DISABLE KEYS */;
INSERT INTO `ti_igniter_automation_rule_conditions` VALUES
(1,1,'Igniter\\Local\\AutomationRules\\Conditions\\ReviewCount','[{\"attribute\":\"review_count\",\"value\":\"0\",\"operator\":\"is\"}]','2024-12-31 19:39:57','2024-12-31 19:39:57'),
(2,1,'Igniter\\Cart\\AutomationRules\\Conditions\\OrderAttribute','[{\"attribute\":\"hours_since\",\"value\":\"24\",\"operator\":\"is\"}]','2024-12-31 19:39:57','2024-12-31 19:39:57');
/*!40000 ALTER TABLE `ti_igniter_automation_rule_conditions` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `ti_igniter_automation_rules`
--

LOCK TABLES `ti_igniter_automation_rules` WRITE;
/*!40000 ALTER TABLE `ti_igniter_automation_rules` DISABLE KEYS */;
INSERT INTO `ti_igniter_automation_rules` VALUES
(1,'Send a message to leave a review after 24 hours','chase_review_after_one_day','','Igniter\\Automation\\AutomationRules\\Events\\OrderSchedule',NULL,0,0,'2024-12-31 19:39:57','2024-12-31 19:39:57');
/*!40000 ALTER TABLE `ti_igniter_automation_rules` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `ti_igniter_cart_cart`
--

LOCK TABLES `ti_igniter_cart_cart` WRITE;
/*!40000 ALTER TABLE `ti_igniter_cart_cart` DISABLE KEYS */;
/*!40000 ALTER TABLE `ti_igniter_cart_cart` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `ti_igniter_coupon_categories`
--

LOCK TABLES `ti_igniter_coupon_categories` WRITE;
/*!40000 ALTER TABLE `ti_igniter_coupon_categories` DISABLE KEYS */;
/*!40000 ALTER TABLE `ti_igniter_coupon_categories` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `ti_igniter_coupon_customer_groups`
--

LOCK TABLES `ti_igniter_coupon_customer_groups` WRITE;
/*!40000 ALTER TABLE `ti_igniter_coupon_customer_groups` DISABLE KEYS */;
/*!40000 ALTER TABLE `ti_igniter_coupon_customer_groups` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `ti_igniter_coupon_customers`
--

LOCK TABLES `ti_igniter_coupon_customers` WRITE;
/*!40000 ALTER TABLE `ti_igniter_coupon_customers` DISABLE KEYS */;
/*!40000 ALTER TABLE `ti_igniter_coupon_customers` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `ti_igniter_coupon_menus`
--

LOCK TABLES `ti_igniter_coupon_menus` WRITE;
/*!40000 ALTER TABLE `ti_igniter_coupon_menus` DISABLE KEYS */;
/*!40000 ALTER TABLE `ti_igniter_coupon_menus` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `ti_igniter_coupons`
--

LOCK TABLES `ti_igniter_coupons` WRITE;
/*!40000 ALTER TABLE `ti_igniter_coupons` DISABLE KEYS */;
INSERT INTO `ti_igniter_coupons` VALUES
(1,'Half Sundays','2222','F',100.0000,500.0000,0,0,NULL,1,'2024-12-31','forever',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'whole_cart',0,'0000-00-00 00:00:00'),
(2,'Half Tuesdays','3333','P',30.0000,1000.0000,0,0,'',1,'2024-12-31','forever',NULL,NULL,NULL,NULL,NULL,'0, 1, 2, 3, 4, 5, 6',NULL,NULL,'\"0\"','whole_cart',0,'2025-11-24 17:22:41'),
(3,'Full Mondays','MTo6TuTg','P',50.0000,0.0000,0,1,NULL,1,'2024-12-31','forever',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'whole_cart',0,'0000-00-00 00:00:00'),
(4,'Full Tuesdays','4444','F',500.0000,5000.0000,0,0,NULL,1,'2024-12-31','forever',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'whole_cart',0,'0000-00-00 00:00:00'),
(5,'Amirs Test','Amir1380','F',20.0000,0.0000,0,0,'Test nr.1',1,'2025-11-25','forever',NULL,NULL,NULL,NULL,NULL,'0, 1, 2, 3, 4, 5, 6',NULL,NULL,'\"0\"','whole_cart',1,'2025-11-25 16:22:48'),
(6,'TEST.2','1223','F',10.0000,0.0000,0,0,'test',1,'2025-11-26','forever',NULL,NULL,NULL,NULL,NULL,'0, 1, 2, 3, 4, 5, 6',NULL,NULL,'\"0\"','whole_cart',1,'2025-11-26 15:30:08');
/*!40000 ALTER TABLE `ti_igniter_coupons` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `ti_igniter_coupons_history`
--

LOCK TABLES `ti_igniter_coupons_history` WRITE;
/*!40000 ALTER TABLE `ti_igniter_coupons_history` DISABLE KEYS */;
/*!40000 ALTER TABLE `ti_igniter_coupons_history` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `ti_igniter_frontend_banners`
--

LOCK TABLES `ti_igniter_frontend_banners` WRITE;
/*!40000 ALTER TABLE `ti_igniter_frontend_banners` DISABLE KEYS */;
/*!40000 ALTER TABLE `ti_igniter_frontend_banners` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `ti_igniter_frontend_sliders`
--

LOCK TABLES `ti_igniter_frontend_sliders` WRITE;
/*!40000 ALTER TABLE `ti_igniter_frontend_sliders` DISABLE KEYS */;
INSERT INTO `ti_igniter_frontend_sliders` VALUES
(1,'Homepage slider','home-slider',NULL,'2024-12-31 19:17:37','2024-12-31 19:17:37');
/*!40000 ALTER TABLE `ti_igniter_frontend_sliders` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `ti_igniter_frontend_subscribers`
--

LOCK TABLES `ti_igniter_frontend_subscribers` WRITE;
/*!40000 ALTER TABLE `ti_igniter_frontend_subscribers` DISABLE KEYS */;
/*!40000 ALTER TABLE `ti_igniter_frontend_subscribers` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `ti_igniter_pages_menu_items`
--

LOCK TABLES `ti_igniter_pages_menu_items` WRITE;
/*!40000 ALTER TABLE `ti_igniter_pages_menu_items` DISABLE KEYS */;
INSERT INTO `ti_igniter_pages_menu_items` VALUES
(1,1,NULL,'TastyIgniter','',NULL,'header',NULL,NULL,'[]',1,8,1,'2024-12-31 19:17:38','2024-12-31 19:17:38'),
(2,1,1,'main::lang.menu_menu','',NULL,'theme-page',NULL,'local/menus','[]',2,3,2,'2024-12-31 19:17:38','2024-12-31 19:17:38'),
(3,1,1,'main::lang.menu_reservation','',NULL,'theme-page',NULL,'reservation/reservation','[]',4,5,3,'2024-12-31 19:17:38','2024-12-31 19:17:38'),
(4,1,1,'main::lang.menu_locations','',NULL,'theme-page',NULL,'locations','[]',6,7,4,'2024-12-31 19:17:38','2024-12-31 19:17:38'),
(5,1,NULL,'main::lang.text_information','',NULL,'header',NULL,NULL,'[]',9,18,5,'2024-12-31 19:17:38','2024-12-31 19:17:38'),
(6,1,5,'main::lang.menu_contact','',NULL,'theme-page',NULL,'contact','[]',10,11,6,'2024-12-31 19:17:38','2024-12-31 19:17:38'),
(7,1,5,'main::lang.menu_admin','',NULL,'url','http://197.140.11.160:8004/admin',NULL,'[]',12,13,7,'2024-12-31 19:17:38','2024-12-31 19:17:38'),
(8,1,5,'About Us','',NULL,'static-page',NULL,'1','[]',14,15,8,'2024-12-31 19:17:38','2024-12-31 19:17:38'),
(9,1,5,'Privacy Policy','',NULL,'static-page',NULL,'2','[]',16,17,9,'2024-12-31 19:17:38','2024-12-31 19:17:38'),
(10,2,NULL,'main::lang.menu_menu','view-menu',NULL,'theme-page',NULL,'local/menus','[]',19,20,10,'2024-12-31 19:17:38','2024-12-31 19:17:38'),
(11,2,NULL,'main::lang.menu_reservation','reservation',NULL,'theme-page',NULL,'reservation/reservation','[]',21,22,11,'2024-12-31 19:17:38','2024-12-31 19:17:38'),
(12,2,NULL,'main::lang.menu_login','login',NULL,'theme-page',NULL,'account/login','[]',23,24,12,'2024-12-31 19:17:38','2024-12-31 19:17:38'),
(13,2,NULL,'main::lang.menu_register','register',NULL,'theme-page',NULL,'account/register','[]',25,26,13,'2024-12-31 19:17:38','2024-12-31 19:17:38'),
(14,2,NULL,'main::lang.menu_my_account','account',NULL,'theme-page',NULL,'account/account','[]',27,38,14,'2024-12-31 19:17:38','2024-12-31 19:17:38'),
(15,2,14,'main::lang.menu_recent_order','recent-orders',NULL,'theme-page',NULL,'account/orders','[]',28,29,15,'2024-12-31 19:17:38','2024-12-31 19:17:38'),
(16,2,14,'main::lang.menu_my_account','',NULL,'theme-page',NULL,'account/account','[]',30,31,16,'2024-12-31 19:17:38','2024-12-31 19:17:38'),
(17,2,14,'main::lang.menu_address','',NULL,'theme-page',NULL,'account/address','[]',32,33,17,'2024-12-31 19:17:38','2024-12-31 19:17:38'),
(18,2,14,'main::lang.menu_recent_reservation','',NULL,'theme-page',NULL,'account/reservations','[]',34,35,18,'2024-12-31 19:17:38','2024-12-31 19:17:38'),
(19,2,14,'main::lang.menu_logout','',NULL,'url','javascript:;',NULL,'{\"extraAttributes\":\"data-request=\\\"session::onLogout\\\"\"}',36,37,19,'2024-12-31 19:17:38','2024-12-31 19:17:38'),
(20,3,NULL,'Pages','',NULL,'all-static-pages',NULL,'','[]',39,40,20,'2024-12-31 19:17:38','2024-12-31 19:17:38'),
(21,4,NULL,'TastyIgniter','',NULL,'header',NULL,NULL,'[]',41,48,21,'2024-12-31 19:17:38','2024-12-31 19:17:38'),
(22,4,21,'main::lang.menu_menu','',NULL,'theme-page',NULL,'local/menus','[]',42,43,22,'2024-12-31 19:17:38','2024-12-31 19:17:38'),
(23,4,21,'main::lang.menu_reservation','',NULL,'theme-page',NULL,'reservation/reservation','[]',44,45,23,'2024-12-31 19:17:38','2024-12-31 19:17:38'),
(24,4,21,'main::lang.menu_locations','',NULL,'theme-page',NULL,'locations','[]',46,47,24,'2024-12-31 19:17:38','2024-12-31 19:17:38'),
(25,4,NULL,'main::lang.text_information','',NULL,'header',NULL,NULL,'[]',49,58,25,'2024-12-31 19:17:38','2024-12-31 19:17:38'),
(26,4,25,'main::lang.menu_contact','',NULL,'theme-page',NULL,'contact','[]',50,51,26,'2024-12-31 19:17:38','2024-12-31 19:17:38'),
(27,4,25,'main::lang.menu_admin','',NULL,'url','http://197.140.11.160:8004/admin',NULL,'[]',52,53,27,'2024-12-31 19:17:38','2024-12-31 19:17:38'),
(28,4,25,'About Us','',NULL,'static-page',NULL,'1','[]',54,55,28,'2024-12-31 19:17:38','2024-12-31 19:17:38'),
(29,4,25,'Privacy Policy','',NULL,'static-page',NULL,'2','[]',56,57,29,'2024-12-31 19:17:38','2024-12-31 19:17:38'),
(30,5,NULL,'Pages','',NULL,'all-static-pages',NULL,'','[]',59,60,30,'2024-12-31 19:17:38','2024-12-31 19:17:38'),
(31,6,NULL,'main::lang.menu_menu','view-menu',NULL,'theme-page',NULL,'local/menus','[]',61,62,31,'2024-12-31 19:17:38','2024-12-31 19:17:38'),
(32,6,NULL,'main::lang.menu_reservation','reservation',NULL,'theme-page',NULL,'reservation/reservation','[]',63,64,32,'2024-12-31 19:17:38','2024-12-31 19:17:38'),
(33,6,NULL,'History','history',NULL,'theme-page',NULL,'our-history','[]',65,66,33,'2024-12-31 19:17:38','2024-12-31 19:17:38'),
(34,7,NULL,'main::lang.menu_my_account','account',NULL,'theme-page',NULL,'account/account','[]',67,78,34,'2024-12-31 19:17:38','2024-12-31 19:17:38'),
(35,7,34,'main::lang.menu_recent_order','recent-orders',NULL,'theme-page',NULL,'account/orders','[]',68,69,35,'2024-12-31 19:17:38','2024-12-31 19:17:38'),
(36,7,34,'main::lang.menu_my_account','',NULL,'theme-page',NULL,'account/account','[]',70,71,36,'2024-12-31 19:17:38','2024-12-31 19:17:38'),
(37,7,34,'main::lang.menu_address','',NULL,'theme-page',NULL,'account/address','[]',72,73,37,'2024-12-31 19:17:38','2024-12-31 19:17:38'),
(38,7,34,'main::lang.menu_recent_reservation','',NULL,'theme-page',NULL,'account/reservations','[]',74,75,38,'2024-12-31 19:17:38','2024-12-31 19:17:38'),
(39,7,34,'main::lang.menu_logout','',NULL,'url','javascript:;',NULL,'{\"extraAttributes\":\"data-request=\\\"session::onLogout\\\"\"}',76,77,39,'2024-12-31 19:17:38','2024-12-31 19:17:38');
/*!40000 ALTER TABLE `ti_igniter_pages_menu_items` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `ti_igniter_pages_menus`
--

LOCK TABLES `ti_igniter_pages_menus` WRITE;
/*!40000 ALTER TABLE `ti_igniter_pages_menus` DISABLE KEYS */;
INSERT INTO `ti_igniter_pages_menus` VALUES
(1,'tastyigniter-orange','Footer menu','footer-menu','2024-12-31 19:17:38','2024-12-31 19:17:38'),
(2,'tastyigniter-orange','Main menu','main-menu','2024-12-31 19:17:38','2024-12-31 19:17:38'),
(3,'tastyigniter-orange','Pages menu','pages-menu','2024-12-31 19:17:38','2024-12-31 19:17:38'),
(4,'tastyigniter-typical','Footer menu','footer-menu','2024-12-31 19:17:38','2024-12-31 19:17:38'),
(5,'tastyigniter-typical','Pages menu','pages-menu','2024-12-31 19:17:38','2024-12-31 19:17:38'),
(6,'tastyigniter-typical','Main menu','typical-main-menu','2024-12-31 19:17:38','2024-12-31 19:17:38'),
(7,'tastyigniter-typical','Right menu','typical-right-menu','2024-12-31 19:17:38','2024-12-31 19:17:38');
/*!40000 ALTER TABLE `ti_igniter_pages_menus` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `ti_igniter_reviews`
--

LOCK TABLES `ti_igniter_reviews` WRITE;
/*!40000 ALTER TABLE `ti_igniter_reviews` DISABLE KEYS */;
INSERT INTO `ti_igniter_reviews` VALUES
(1,1,3,'orders','oussama douba',1,5,5,5,'Good Service','2025-01-05 19:20:42',0,'2025-01-05 19:20:42'),
(2,1,1,'orders',NULL,1,5,4,4,'Very Good','2025-01-05 19:21:22',1,'2025-01-05 19:21:22');
/*!40000 ALTER TABLE `ti_igniter_reviews` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `ti_igniter_socialite_providers`
--

LOCK TABLES `ti_igniter_socialite_providers` WRITE;
/*!40000 ALTER TABLE `ti_igniter_socialite_providers` DISABLE KEYS */;
/*!40000 ALTER TABLE `ti_igniter_socialite_providers` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `ti_job_batches`
--

LOCK TABLES `ti_job_batches` WRITE;
/*!40000 ALTER TABLE `ti_job_batches` DISABLE KEYS */;
/*!40000 ALTER TABLE `ti_job_batches` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `ti_jobs`
--

LOCK TABLES `ti_jobs` WRITE;
/*!40000 ALTER TABLE `ti_jobs` DISABLE KEYS */;
/*!40000 ALTER TABLE `ti_jobs` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `ti_language_translations`
--

LOCK TABLES `ti_language_translations` WRITE;
/*!40000 ALTER TABLE `ti_language_translations` DISABLE KEYS */;
INSERT INTO `ti_language_translations` VALUES
(1,'Fr','admin','lang','button_delete','<i class=\"fa fa-trash-o\"></i>  Delete',0,1,'2025-11-27 19:40:10','2025-11-27 19:40:10'),
(2,'Fr','admin','lang','button_new','<i class=\"fa fa-plus\"></i>  New',0,1,'2025-11-27 19:40:10','2025-11-27 19:40:10'),
(3,'Fr','admin','lang','button_refresh','<i class=\"fa fa-refresh\"></i>  Refresh',0,1,'2025-11-27 19:40:10','2025-11-27 19:40:10'),
(4,'Fr','admin','lang','button_save','<i class=\"fa fa-save\"></i>  Save',0,1,'2025-11-27 19:40:10','2025-11-27 19:40:10'),
(5,'Fr','admin','lang','button_save_close','<i class=\"fa fa-save\"></i>  Save & Close',0,1,'2025-11-27 19:40:10','2025-11-27 19:40:10');
/*!40000 ALTER TABLE `ti_language_translations` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `ti_languages`
--

LOCK TABLES `ti_languages` WRITE;
/*!40000 ALTER TABLE `ti_languages` DISABLE KEYS */;
INSERT INTO `ti_languages` VALUES
(1,'en','English',NULL,'english',1,0,NULL,'2024-12-31 17:34:40','2024-12-31 17:34:40',NULL),
(3,'Fr','Frensh',NULL,'',1,0,NULL,'2025-11-14 21:06:17','2025-11-14 21:06:17',NULL),
(4,'De','German',NULL,'',1,0,NULL,'2025-11-14 21:07:52','2025-11-14 21:07:52',NULL);
/*!40000 ALTER TABLE `ti_languages` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `ti_location_areas`
--

LOCK TABLES `ti_location_areas` WRITE;
/*!40000 ALTER TABLE `ti_location_areas` DISABLE KEYS */;
/*!40000 ALTER TABLE `ti_location_areas` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `ti_location_options`
--

LOCK TABLES `ti_location_options` WRITE;
/*!40000 ALTER TABLE `ti_location_options` DISABLE KEYS */;
INSERT INTO `ti_location_options` VALUES
(1,1,'auto_lat_lng','\"1\"'),
(2,1,'gallery','{\"title\":\"\",\"description\":\"\"}'),
(3,1,'guest_order','\"-1\"'),
(4,1,'limit_orders','\"0\"'),
(5,1,'offer_delivery','\"1\"'),
(6,1,'delivery_add_lead_time','\"0\"'),
(7,1,'delivery_time_interval','15'),
(8,1,'delivery_lead_time','25'),
(9,1,'delivery_time_restriction','\"0\"'),
(10,1,'delivery_cancellation_timeout','0'),
(11,1,'delivery_min_order_amount','\"0.00\"'),
(12,1,'future_orders','{\"enable_delivery\": \"0\", \"enable_collection\": \"0\"}'),
(13,1,'offer_collection','\"1\"'),
(14,1,'collection_add_lead_time','\"0\"'),
(15,1,'collection_time_interval','15'),
(16,1,'collection_lead_time','25'),
(17,1,'collection_time_restriction','\"0\"'),
(18,1,'collection_cancellation_timeout','0'),
(19,1,'collection_min_order_amount','\"0.00\"'),
(20,1,'payments','\"0\"'),
(21,1,'offer_reservation','\"1\"'),
(22,1,'auto_allocate_table','\"1\"'),
(23,1,'reservation_time_interval','15'),
(24,1,'reservation_stay_time','45'),
(25,1,'min_reservation_advance_time','2'),
(26,1,'max_reservation_advance_time','30'),
(27,1,'limit_guests','\"0\"'),
(28,1,'reservation_cancellation_timeout','0'),
(29,1,'reservation_include_start_time','\"1\"');
/*!40000 ALTER TABLE `ti_location_options` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `ti_locationables`
--

LOCK TABLES `ti_locationables` WRITE;
/*!40000 ALTER TABLE `ti_locationables` DISABLE KEYS */;
INSERT INTO `ti_locationables` VALUES
(1,1,'staffs',NULL),
(1,2,'staffs',NULL),
(1,3,'mealtimes',NULL),
(1,2,'mealtimes',NULL),
(1,1,'mealtimes',NULL),
(1,8,'categories',NULL),
(1,7,'categories',NULL),
(1,6,'categories',NULL),
(1,3,'staffs',NULL),
(1,4,'staffs',NULL),
(1,15,'menus',NULL),
(1,36,'tables',NULL),
(1,37,'tables',NULL),
(1,39,'tables',NULL),
(1,40,'tables',NULL),
(1,41,'tables',NULL),
(1,18,'menus',NULL),
(1,19,'menus',NULL),
(1,20,'menus',NULL),
(1,5,'staffs',NULL),
(1,6,'staffs',NULL),
(1,5,'mealtimes',NULL),
(1,1,'menu_combos',NULL),
(1,2,'menu_combos',NULL);
/*!40000 ALTER TABLE `ti_locationables` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `ti_locations`
--

LOCK TABLES `ti_locations` WRITE;
/*!40000 ALTER TABLE `ti_locations` DISABLE KEYS */;
INSERT INTO `ti_locations` VALUES
(1,'Default','admin@domain.tld','<p><br></p>','Broad Ln','','Coventry','','',222,'19765423567',52.415884,-1.603648,NULL,1,'default','2024-12-31 17:34:40','2025-03-03 14:09:28');
/*!40000 ALTER TABLE `ti_locations` ENABLE KEYS */;
UNLOCK TABLES;

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
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ti_logos`
--

LOCK TABLES `ti_logos` WRITE;
/*!40000 ALTER TABLE `ti_logos` DISABLE KEYS */;
INSERT INTO `ti_logos` VALUES
(1,'http://mimoza.paymydine.com/storage/temp/public/8ed/95f/ff7/thumb_8ed95fff75a411c83eaf9402ecf83b52_1760178322_122x122_contain.png','http://mimoza.paymydine.com/storage/temp/public/8ed/95f/ff7/thumb_8ed95fff75a411c83eaf9402ecf83b52_1760178322_122x122_contain.png','2025-02-07 20:15:50');
/*!40000 ALTER TABLE `ti_logos` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `ti_mail_layouts`
--

LOCK TABLES `ti_mail_layouts` WRITE;
/*!40000 ALTER TABLE `ti_mail_layouts` DISABLE KEYS */;
INSERT INTO `ti_mail_layouts` VALUES
(1,'Default layout',0,'2024-12-31 19:32:04','2024-12-31 19:32:04',0,'default','<!DOCTYPE html PUBLIC \"-//W3C//DTD XHTML 1.0 Transitional//EN\"\n\"http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd\">\n<html xmlns=\"http://www.w3.org/1999/xhtml\">\n<head>\n    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\"/>\n    <meta http-equiv=\"Content-Type\" content=\"text/html; charset=UTF-8\"/>\n</head>\n<body>\n<style type=\"text/css\">\n    {{ $custom_css }}\n    {{ $layout_css }}\n</style>\n\n<table class=\"wrapper\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\">\n    <tr>\n        <td align=\"center\">\n            <table class=\"content\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\">\n                @partial(\'header\')\n                @php $site_logo = setting(\'mail_logo\') ?: $site_logo; @endphp\n                @isset($site_logo)\n                    <img\n                        src=\"{{ \\Main\\Models\\Image_tool_model::resize($site_logo, [\'height\' => 90]) }}\"\n                        alt=\"{{ $site_name }}\"\n                    >\n                @endisset\n                @endpartial\n                <tr>\n                    <td class=\"body\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\">\n                        <table class=\"inner-body\" align=\"center\" width=\"570\" cellpadding=\"0\" cellspacing=\"0\">\n                            <!-- Body content -->\n                            <tr>\n                                <td class=\"content-cell\">\n                                    {{ $body }}\n                                </td>\n                            </tr>\n                        </table>\n                    </td>\n                </tr>\n                @partial(\'footer\')\n                <p>&copy; {{ date(\'Y\') }} {{ $site_name }}. All rights reserved.</p>\n                @endpartial\n            </table>\n        </td>\n    </tr>\n</table>\n</body>\n</html>','{{ $body }}','',1);
/*!40000 ALTER TABLE `ti_mail_layouts` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `ti_mail_partials`
--

LOCK TABLES `ti_mail_partials` WRITE;
/*!40000 ALTER TABLE `ti_mail_partials` DISABLE KEYS */;
INSERT INTO `ti_mail_partials` VALUES
(1,'Header','header','<tr>\n    <td class=\"header\">\n        @if (isset($url))\n        <a href=\"{{ $url }}\">\n            {{ $slot }}\n        </a>\n        @else\n        <span>\n            {{ $slot }}\n        </span>\n        @endif\n    </td>\n</tr>','*** {{ $slot }} <{{ $url }}>',0,'2024-12-31 19:32:04','2024-12-31 19:32:04'),
(2,'Footer','footer','<tr>\n    <td>\n        <table class=\"footer\" align=\"center\" width=\"570\" cellpadding=\"0\" cellspacing=\"0\">\n            <tr>\n                <td class=\"content-cell\" align=\"center\">\n                    {{ $slot }}\n                </td>\n            </tr>\n        </table>\n    </td>\n</tr>','-------------------\n{{ $slot }}',0,'2024-12-31 19:32:04','2024-12-31 19:32:04'),
(3,'Button','button','<table class=\"action\" align=\"center\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\">\n    <tr>\n        <td>\n            <table width=\"100%\" border=\"0\" cellpadding=\"0\" cellspacing=\"0\">\n                <tr>\n                    <td>\n                        <table border=\"0\" cellpadding=\"0\" cellspacing=\"0\">\n                            <tr>\n                                <td>\n                                    <a href=\"{{ $url }}\" class=\"button button-{{ $type ?? \'primary\' }}\" target=\"_blank\">{{ $slot }}</a>\n                                </td>\n                            </tr>\n                        </table>\n                    </td>\n                </tr>\n            </table>\n        </td>\n    </tr>\n</table>','{{ $slot }} <{{ $url }}>',0,'2024-12-31 19:32:04','2024-12-31 19:32:04'),
(4,'Panel','panel','<table class=\"panel\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\">\n    <tr>\n        <td class=\"panel-content\">\n            <table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\">\n                <tr>\n                    <td class=\"panel-item\">\n                        {{ $slot }}\n                    </td>\n                </tr>\n            </table>\n        </td>\n    </tr>\n</table>','{{ $slot }}',0,'2024-12-31 19:32:04','2024-12-31 19:32:04'),
(5,'Table','table','<div class=\"table\">\n{{ $slot }}\n</div>','{{ $slot }}',0,'2024-12-31 19:32:04','2024-12-31 19:32:04'),
(6,'Subcopy','subcopy','<table class=\"subcopy\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\">\n    <tr>\n        <td>\n            {{ $slot }}\n        </td>\n    </tr>\n</table>','-----\n{{ $slot }}',0,'2024-12-31 19:32:04','2024-12-31 19:32:04'),
(7,'Promotion','promotion','<table class=\"promotion\" align=\"center\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\">\n    <tr>\n        <td align=\"center\">\n            {{ $slot }}\n        </td>\n    </tr>\n</table>','{{ $slot }}',0,'2024-12-31 19:32:04','2024-12-31 19:32:04');
/*!40000 ALTER TABLE `ti_mail_partials` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `ti_mail_templates`
--

LOCK TABLES `ti_mail_templates` WRITE;
/*!40000 ALTER TABLE `ti_mail_templates` DISABLE KEYS */;
INSERT INTO `ti_mail_templates` VALUES
(12,1,'admin::_mail.order_update','','','2024-12-31 19:32:04','2024-12-31 19:32:04','lang:system::lang.mail_templates.text_order_update',0,NULL),
(13,1,'admin::_mail.reservation_update','','','2024-12-31 19:32:04','2024-12-31 19:32:04','lang:system::lang.mail_templates.text_reservation_update',0,NULL),
(14,1,'admin::_mail.password_reset','','','2024-12-31 19:32:04','2024-12-31 19:32:04','lang:system::lang.mail_templates.text_password_reset_alert',0,NULL),
(15,1,'admin::_mail.password_reset_request','','','2024-12-31 19:32:04','2024-12-31 19:32:04','lang:system::lang.mail_templates.text_password_reset_request_alert',0,NULL),
(16,1,'admin::_mail.invite','','','2024-12-31 19:32:04','2024-12-31 19:32:04','lang:system::lang.mail_templates.text_invite',0,NULL),
(17,1,'admin::_mail.invite_customer','','','2024-12-31 19:32:04','2024-12-31 19:32:04','lang:system::lang.mail_templates.text_invite_customer',0,NULL),
(18,1,'admin::_mail.low_stock_alert','','','2024-12-31 19:32:04','2024-12-31 19:32:04','lang:system::lang.mail_templates.text_low_stock_alert',0,NULL);
/*!40000 ALTER TABLE `ti_mail_templates` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `ti_mealtimes`
--

LOCK TABLES `ti_mealtimes` WRITE;
/*!40000 ALTER TABLE `ti_mealtimes` DISABLE KEYS */;
INSERT INTO `ti_mealtimes` VALUES
(1,'Breakfast','07:00:00','10:00:00',1,'2024-12-31 17:34:40','2025-01-05 20:42:14'),
(2,'Lunch','12:00:00','14:30:00',1,'2024-12-31 17:34:40','2025-01-05 20:42:08'),
(3,'Dinner','18:00:00','20:00:00',1,'2024-12-31 17:34:40','2025-01-05 20:41:45'),
(5,'work plan','11:00:00','13:00:00',0,'2025-11-28 19:01:19','2025-11-28 19:01:19');
/*!40000 ALTER TABLE `ti_mealtimes` ENABLE KEYS */;
UNLOCK TABLES;

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
) ENGINE=InnoDB AUTO_INCREMENT=70 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ti_media_attachments`
--

LOCK TABLES `ti_media_attachments` WRITE;
/*!40000 ALTER TABLE `ti_media_attachments` DISABLE KEYS */;
INSERT INTO `ti_media_attachments` VALUES
(15,'media','6777f9b077ac5712883963.webp','ggty.webp','image/webp',178578,'images','sliders',1,1,'[]',15,'2025-01-03 14:52:32','2025-01-03 14:52:32'),
(16,'media','6777fa479e2e2540505239.jpg','rest2.jpg','image/jpeg',85039,'images','sliders',1,1,'[]',16,'2025-01-03 14:55:03','2025-01-03 14:55:03'),
(17,'media','6777fac111a64771032432.jpg','rest4.jpg','image/jpeg',195181,'images','sliders',1,1,'[]',17,'2025-01-03 14:57:05','2025-01-03 14:57:05'),
(20,'media','68f4853a00aff605029023.png','pngtree-3d-melting-cheese-pizza-slice-on-png-image_16116836.png','image/png',30724,'thumb','menus',19,1,'[]',18,'2025-10-19 07:29:14','2025-10-19 07:29:14'),
(24,'media','68f487513d803494875441.jpg','a-bowl-of-oatmeal-with-oatmeal-and-oatmeal-on-a-transparent-background-png-removebg-preview.jpg','image/jpeg',22733,'thumb','menus',11,1,'[]',22,'2025-10-19 07:38:09','2025-10-19 07:38:09'),
(29,'media','68f489854495f032845117.png','so-sweet-plantain-chips-isolated-transparent-background_886329-2153-removebg-preview.png','image/png',299577,'thumb','menus',12,1,'[]',25,'2025-10-19 07:47:33','2025-10-19 07:47:33'),
(35,'media','68f48a407f467689664724.jpg','59-592344_menu-thai-food-transparent-background-hd-png-download.png-removebg-preview.jpg','image/jpeg',20210,'thumb','menus',10,1,'[]',30,'2025-10-19 07:50:40','2025-10-19 07:50:40'),
(36,'media','68f48a71f15fd587344032.jpg','image-removebg-preview-10.jpg','image/jpeg',29487,'thumb','menus',6,1,'[]',31,'2025-10-19 07:51:29','2025-10-19 07:51:29'),
(37,'media','68f48a7e4a55c145375818.jpg','Screenshot_2025-10-19_at_08.43.39-removebg-preview.jpg','image/jpeg',26583,'thumb','menus',5,1,'[]',32,'2025-10-19 07:51:42','2025-10-19 07:51:42'),
(39,'media','68f48b43b7673045832408.jpg','Screenshot_2025-10-19_at_08.53.20-removebg-preview.jpg','image/jpeg',12798,'thumb','menus',2,1,'[]',34,'2025-10-19 07:54:59','2025-10-19 07:54:59'),
(40,'media','68f48b53037c9900194454.jpg','Screenshot_2025-10-19_at_08.53.00-removebg-preview.jpg','image/jpeg',26167,'thumb','menus',3,1,'[]',35,'2025-10-19 07:55:15','2025-10-19 07:55:15'),
(42,'media','68f48bdd50a97367664929.jpg','Screenshot_2025-10-19_at_08.52.19-removebg-preview.jpg','image/jpeg',23336,'thumb','menus',4,1,'[]',36,'2025-10-19 07:57:33','2025-10-19 07:57:33'),
(50,'media','68f7018965fd8656301939.jpg','59-592344_menu-thai-food-transparent-background-hd-png-download.png-removebg-preview.jpg','image/jpeg',20210,'thumb','locations',1,1,'[]',39,'2025-10-21 04:44:09','2025-10-21 04:44:09'),
(51,'media','68f7018dcd1b9549708698.jpg','image-removebg-preview-10.jpg','image/jpeg',29487,'thumb','locations',1,1,'[]',40,'2025-10-21 04:44:13','2025-10-21 04:44:13'),
(52,'media','68f70191aa89c076944351.jpg','Screenshot_2025-10-19_at_08.43.39-removebg-preview.jpg','image/jpeg',26583,'thumb','locations',1,1,'[]',41,'2025-10-21 04:44:17','2025-10-21 04:44:17'),
(53,'media','68f7019aec732531399262.png','pngtree-3d-melting-cheese-pizza-slice-on-png-image_16116836.png','image/png',30724,'thumb','locations',1,1,'[]',42,'2025-10-21 04:44:26','2025-10-21 04:44:26'),
(54,'media','68f701a0e4f96798490085.png','so-sweet-plantain-chips-isolated-transparent-background_886329-2153-removebg-preview.png','image/png',299577,'thumb','locations',1,1,'[]',43,'2025-10-21 04:44:32','2025-10-21 04:44:32'),
(55,'media','68f701b3e4ec5179323279.jpg','cHJpdmF0ZS9sci9pbWFnZXMvd2Vic2l0ZS8yMDI0LTAzL2ZyZWVpbWFnZXNjb21wYW55X3RvcF9kb3duX3Bob3RvX29mX2FfY2VzYXJfc2FsYWRfaXNvbGF0ZWRfb25f','image/jpeg',30826,'thumb','locations',1,1,'[]',44,'2025-10-21 04:44:51','2025-10-21 04:44:51'),
(56,'media','68f7036d2e80e507829038.jpg','image-removebg-preview-9.jpg','image/jpeg',29487,'thumb','locations',1,1,'[]',45,'2025-10-21 04:52:13','2025-10-21 04:52:13'),
(57,'media','68f703719a949770072882.jpg','cHJpdmF0ZS9sci9pbWFnZXMvd2Vic2l0ZS8yMDI0LTAzL2ZyZWVpbWFnZXNjb21wYW55X3RvcF9kb3duX3Bob3RvX29mX2FfY2VzYXJfc2FsYWRfaXNvbGF0ZWRfb25f','image/jpeg',30826,'thumb','locations',1,1,'[]',46,'2025-10-21 04:52:17','2025-10-21 04:52:17'),
(59,'media','6931d80bd52d0614952088.png','so-sweet-plantain-chips-isolated-transparent-background_886329-2153-removebg-preview.png','image/png',299577,'thumb','menu_combos',1,1,'[]',48,'2025-12-04 18:50:51','2025-12-04 18:50:51'),
(60,'media','693396d219399885816159.png','ff4b10f3-dd8d-4c91-b50f-82f489e14fc0-removebg-preview.png','image/png',268773,'thumb','menus',1,1,'[]',49,'2025-12-06 02:37:06','2025-12-06 02:37:06'),
(61,'media','693396e76b96f003769809.png','0bbfd9ee-bc9e-4508-97cd-c97d1edeb5a2-removebg-preview-removebg-preview-removebg-preview.png','image/png',222348,'thumb','menus',7,1,'[]',50,'2025-12-06 02:37:27','2025-12-06 02:37:27'),
(62,'media','693396ef5a582345749533.png','vecteezy_photorealistic-halved-avocado-with-creamy-green-flesh-and_55130515-removebg-preview-removebg-preview-removebg-preview.p','image/png',211109,'thumb','menus',8,1,'[]',51,'2025-12-06 02:37:35','2025-12-06 02:37:35'),
(63,'media','693396f831ad5037602459.png','vecteezy_delicious-chocolate-and-vanilla-donuts-sweet-treats-bakery-food_55181985-removebg-preview-removebg-preview-2.png','image/png',188275,'thumb','menus',9,1,'[]',52,'2025-12-06 02:37:44','2025-12-06 02:37:44'),
(64,'media','69339707edf73971257255.png','vecteezy_fast-food-meal-with_25065315-removebg-preview-removebg-preview-removebg-preview.png','image/png',239877,'thumb','menus',20,1,'[]',53,'2025-12-06 02:37:59','2025-12-06 02:37:59'),
(65,'media','693397126b209112303107.png','cd8cb36e-a9bf-4d99-ac15-7a5333acbb13-removebg-preview-removebg-preview-removebg-preview.png','image/png',158656,'thumb','menus',27,1,'[]',54,'2025-12-06 02:38:10','2025-12-06 02:38:10'),
(66,'media','69339725b3dde927159940.png','0bbfd9ee-bc9e-4508-97cd-c97d1edeb5a2-removebg-preview-removebg-preview-removebg-preview.png','image/png',222348,'thumb','menus',29,1,'[]',55,'2025-12-06 02:38:29','2025-12-06 02:38:29'),
(67,'media','693397f3775b7344959764.png','Screenshot_2025-12-06_at_03.40.31-removebg-preview.png','image/png',189347,'thumb','menus',15,1,'[]',56,'2025-12-06 02:41:55','2025-12-06 02:41:55'),
(68,'media','6933980910771278432906.png','Screenshot_2025-12-06_at_03.40.12-removebg-preview.png','image/png',295353,'thumb','menus',22,1,'[]',57,'2025-12-06 02:42:17','2025-12-06 02:42:17'),
(69,'media','693398161184e209062188.png','Screenshot_2025-12-06_at_03.40.21-removebg-preview.png','image/png',244368,'thumb','menus',18,1,'[]',58,'2025-12-06 02:42:30','2025-12-06 02:42:30');
/*!40000 ALTER TABLE `ti_media_attachments` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `ti_menu_categories`
--

LOCK TABLES `ti_menu_categories` WRITE;
/*!40000 ALTER TABLE `ti_menu_categories` DISABLE KEYS */;
INSERT INTO `ti_menu_categories` VALUES
(15,6),
(18,7),
(19,8);
/*!40000 ALTER TABLE `ti_menu_categories` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `ti_menu_combo_items`
--

LOCK TABLES `ti_menu_combo_items` WRITE;
/*!40000 ALTER TABLE `ti_menu_combo_items` DISABLE KEYS */;
INSERT INTO `ti_menu_combo_items` VALUES
(6,1,10,1,'2025-12-04 18:50:53','2025-12-04 18:50:53'),
(7,1,28,1,'2025-12-04 18:50:53','2025-12-04 18:50:53'),
(8,1,24,1,'2025-12-04 18:50:53','2025-12-04 18:50:53'),
(9,1,19,1,'2025-12-04 18:50:53','2025-12-04 18:50:53'),
(10,1,20,1,'2025-12-04 18:50:53','2025-12-04 18:50:53'),
(11,2,10,1,'2025-12-05 19:52:52','2025-12-05 19:52:52'),
(12,2,28,1,'2025-12-05 19:52:52','2025-12-05 19:52:52'),
(13,2,25,2,'2025-12-05 19:52:52','2025-12-05 19:52:52'),
(14,2,29,1,'2025-12-05 19:52:52','2025-12-05 19:52:52'),
(15,2,27,1,'2025-12-05 19:52:52','2025-12-05 19:52:52'),
(16,2,7,1,'2025-12-05 19:52:52','2025-12-05 19:52:52'),
(17,2,20,1,'2025-12-05 19:52:52','2025-12-05 19:52:52'),
(18,2,5,1,'2025-12-05 19:52:52','2025-12-05 19:52:52');
/*!40000 ALTER TABLE `ti_menu_combo_items` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `ti_menu_combos`
--

LOCK TABLES `ti_menu_combos` WRITE;
/*!40000 ALTER TABLE `ti_menu_combos` DISABLE KEYS */;
INSERT INTO `ti_menu_combos` VALUES
(1,'Monday\'s Offer','Special Offer\n\nIncludes: AMALA, Pizza, Soup, Pepperoni Pizza, Caesar Salad',50.0000,NULL,1,0,NULL,'2025-12-04 18:42:00','2025-12-04 18:50:53'),
(2,'Happy Friday','Test 2\n\nIncludes: Special Shrimp Deluxe, Simple Salad, AMALA, Soup, Cheeseburger (x2), Grilled Chicken Sandwich, Caesar Salad, Greek Salad',10.0000,NULL,1,0,NULL,'2025-12-05 19:52:52','2025-12-05 19:52:52');
/*!40000 ALTER TABLE `ti_menu_combos` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `ti_menu_item_option_values`
--

LOCK TABLES `ti_menu_item_option_values` WRITE;
/*!40000 ALTER TABLE `ti_menu_item_option_values` DISABLE KEYS */;
INSERT INTO `ti_menu_item_option_values` VALUES
(1,1,9,0.0000,1,NULL,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(2,1,10,0.0000,2,NULL,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(3,2,7,0.0000,1,NULL,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(4,2,8,5.0000,2,NULL,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(5,3,4,4.9500,4,NULL,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(6,3,5,4.9500,2,NULL,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(7,3,6,6.9500,3,NULL,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(8,4,7,0.0000,1,NULL,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(9,4,8,5.0000,2,NULL,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(10,5,4,4.9500,4,NULL,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(11,5,5,4.9500,2,NULL,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(12,5,6,6.9500,3,NULL,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(13,6,7,0.0000,1,NULL,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(14,6,8,5.0000,2,NULL,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(15,7,7,0.0000,1,NULL,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(16,7,8,5.0000,2,NULL,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(17,8,4,4.9500,4,NULL,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(18,8,5,4.9500,2,NULL,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(19,8,6,6.9500,3,NULL,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(20,9,9,0.0000,1,NULL,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(21,9,10,0.0000,2,NULL,'2024-12-31 17:34:40','2024-12-31 17:34:40');
/*!40000 ALTER TABLE `ti_menu_item_option_values` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `ti_menu_item_options`
--

LOCK TABLES `ti_menu_item_options` WRITE;
/*!40000 ALTER TABLE `ti_menu_item_options` DISABLE KEYS */;
INSERT INTO `ti_menu_item_options` VALUES
(1,4,1,0,0,0,0,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(2,3,2,0,0,0,0,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(3,2,3,0,0,0,0,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(4,3,3,0,1,0,0,'2024-12-31 17:34:40','2025-01-02 18:00:29'),
(5,2,4,0,0,0,0,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(6,3,4,0,1,0,0,'2024-12-31 17:34:40','2025-01-02 17:59:40'),
(7,3,5,0,0,0,0,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(8,2,10,0,0,0,0,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(9,4,10,0,1,0,0,'2024-12-31 17:34:40','2025-01-02 17:54:34');
/*!40000 ALTER TABLE `ti_menu_item_options` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `ti_menu_mealtimes`
--

LOCK TABLES `ti_menu_mealtimes` WRITE;
/*!40000 ALTER TABLE `ti_menu_mealtimes` DISABLE KEYS */;
INSERT INTO `ti_menu_mealtimes` VALUES
(15,2),
(18,2),
(19,2),
(19,3),
(20,2),
(20,3);
/*!40000 ALTER TABLE `ti_menu_mealtimes` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `ti_menu_option_values`
--

LOCK TABLES `ti_menu_option_values` WRITE;
/*!40000 ALTER TABLE `ti_menu_option_values` DISABLE KEYS */;
INSERT INTO `ti_menu_option_values` VALUES
(1,1,'Peperoni',1.9900,2),
(2,1,'Jalapenos',3.9900,1),
(3,1,'Sweetcorn',1.9900,3),
(4,2,'Meat',4.9500,4),
(5,2,'Fish',4.9500,2),
(6,2,'Beef',6.9500,3),
(7,3,'Small',0.0000,1),
(8,3,'Large',5.0000,2),
(9,4,'Coke',0.0000,1),
(10,4,'Diet Coke',0.0000,2);
/*!40000 ALTER TABLE `ti_menu_option_values` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `ti_menu_options`
--

LOCK TABLES `ti_menu_options` WRITE;
/*!40000 ALTER TABLE `ti_menu_options` DISABLE KEYS */;
INSERT INTO `ti_menu_options` VALUES
(1,'Toppings','checkbox',0,0,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(2,'Sides','checkbox',0,0,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(3,'Size','radio',0,0,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(4,'Drinks','checkbox',0,0,'2024-12-31 17:34:40','2024-12-31 17:34:40');
/*!40000 ALTER TABLE `ti_menu_options` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `ti_menu_prices`
--

LOCK TABLES `ti_menu_prices` WRITE;
/*!40000 ALTER TABLE `ti_menu_prices` DISABLE KEYS */;
INSERT INTO `ti_menu_prices` VALUES
(1,27,'default',0.00,1,'03:27:00','03:24:00','Mon,Tue',0,'2025-12-04 23:27:50','2025-12-06 02:38:11'),
(2,27,'default',0.00,1,'00:00:00','00:00:00',NULL,1,'2025-12-04 23:27:50','2025-12-06 02:38:11'),
(3,27,'default',0.00,1,'00:00:00','00:00:00',NULL,2,'2025-12-04 23:27:50','2025-12-06 02:38:11'),
(4,27,'default',0.00,1,'00:00:00','00:00:00',NULL,3,'2025-12-04 23:27:50','2025-12-06 02:38:11'),
(5,10,'happy_hour',23.00,1,'01:05:00','23:55:00','Tue,Wed,Thu,Fri,Sat',0,'2025-12-05 19:45:22','2025-12-05 19:47:45');
/*!40000 ALTER TABLE `ti_menu_prices` ENABLE KEYS */;
UNLOCK TABLES;

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
  `is_stock_out` tinyint(1) NOT NULL DEFAULT 0 COMMENT 'Flag to mark items as stock-out (visible but not orderable)',
  `menu_priority` int(11) NOT NULL DEFAULT 0,
  `order_restriction` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`menu_id`),
  KEY `idx_is_stock_out` (`is_stock_out`)
) ENGINE=InnoDB AUTO_INCREMENT=34 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ti_menus`
--

LOCK TABLES `ti_menus` WRITE;
/*!40000 ALTER TABLE `ti_menus` DISABLE KEYS */;
INSERT INTO `ti_menus` VALUES
(1,'Puff-Puff','',15.0000,3,1,0,0,'\"0\"','2024-12-31 17:34:40','2025-12-06 02:36:54'),
(2,'SCOTCH EGG','',2.0000,1,0,0,0,'\"0\"','2024-12-31 17:34:40','2025-12-06 02:36:04'),
(3,'ATA RICE','',12.0000,1,0,1,0,'\"0\"','2024-12-31 17:34:40','2025-12-06 02:36:32'),
(4,'RICE AND DODO','',11.9900,1,0,0,0,'\"0\"','2024-12-31 17:34:40','2025-12-06 02:36:04'),
(5,'Special Shrimp Deluxe','',12.9900,1,0,0,0,'\"0\"','2024-12-31 17:34:40','2025-12-06 02:36:04'),
(6,'Whole catfish with rice and vegetables','',13.9900,1,0,0,0,'\"0\"','2024-12-31 17:34:40','2025-12-06 02:36:04'),
(7,'Simple Salad','',8.9900,1,1,0,0,'\"0\"','2024-12-31 17:34:40','2025-12-06 02:36:54'),
(8,'Seafood Salad','',5.9900,1,1,0,0,'\"0\"','2024-12-31 17:34:40','2025-12-06 02:36:54'),
(9,'Salad Cesar','',11.9900,1,1,0,0,'\"0\"','2024-12-31 17:34:40','2025-12-06 02:36:54'),
(10,'AMALA','',12.0000,1,0,1,0,'\"0\"','2024-12-31 17:34:40','2025-12-06 02:36:32'),
(11,'YAM PORRIDGE','',9.9900,1,0,1,0,'\"0\"','2024-12-31 17:34:40','2025-12-06 02:36:04'),
(12,'Boiled Plantain','',9.9900,1,0,0,0,'\"0\"','2024-12-31 17:34:40','2025-12-06 02:36:32'),
(15,'Pizza slami','',2.0000,1,1,0,2,'\"0\"','2025-09-29 17:56:11','2025-12-06 02:36:54'),
(18,'Chicken Curry','',20.0000,1,1,0,2,'\"0\"','2025-10-15 22:15:54','2025-12-06 02:42:38'),
(19,'Pizza','',20.0000,1,1,0,1,'\"0\"','2025-10-18 18:48:14','2025-12-06 02:36:54'),
(20,'Soup','',15.0000,1,1,0,0,'\"0\"','2025-10-21 20:31:42','2025-12-06 02:36:54'),
(22,'Coffee Latte','',5.5000,1,1,0,0,'\"0\"','2025-11-02 15:10:01','2025-12-06 02:42:38'),
(23,'Margherita Pizza','',10.0000,1,0,0,0,NULL,'2025-11-02 15:10:01','2025-12-06 02:36:04'),
(24,'Pepperoni Pizza','',15.0000,1,0,0,0,NULL,'2025-11-02 15:10:01','2025-12-06 02:36:04'),
(25,'Cheeseburger','',10.0000,1,0,0,0,NULL,'2025-11-02 15:10:01','2025-12-06 02:36:32'),
(26,'Veggie Burger','',15.7700,1,0,0,0,NULL,'2025-11-02 15:10:01','2025-12-06 02:36:04'),
(27,'Grilled Chicken Sandwich','',12.0000,1,1,0,0,'\"0\"','2025-11-02 15:10:01','2025-12-06 02:36:54'),
(28,'Caesar Salad','',17.0000,1,0,0,0,NULL,'2025-11-02 15:10:01','2025-12-06 02:36:32'),
(29,'Greek Salad','',12.0000,1,1,0,0,'\"0\"','2025-11-02 15:10:01','2025-12-06 02:38:30'),
(30,'RICKSON PRODUCT','',10.0000,1,0,0,0,NULL,'2025-11-16 21:36:51','2025-12-06 02:36:04'),
(31,'kjk','',0.2000,1,0,0,0,NULL,'2025-11-21 12:33:25','2025-12-06 02:36:04'),
(32,'ammir','',2.0000,1,0,1,0,NULL,'2025-11-21 12:33:25','2025-12-06 02:36:21'),
(33,'New Food 23','',23.0000,1,0,1,0,NULL,'2025-11-21 12:33:25','2025-12-06 02:36:04');
/*!40000 ALTER TABLE `ti_menus` ENABLE KEYS */;
UNLOCK TABLES;

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
) ENGINE=InnoDB AUTO_INCREMENT=25 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ti_menus_specials`
--

LOCK TABLES `ti_menus_specials` WRITE;
/*!40000 ALTER TABLE `ti_menus_specials` DISABLE KEYS */;
INSERT INTO `ti_menus_specials` VALUES
(1,7,NULL,NULL,0.0000,0,'F','forever',NULL,NULL,NULL,NULL,NULL),
(2,6,NULL,NULL,0.0000,0,'F','forever',NULL,NULL,NULL,NULL,NULL),
(3,12,NULL,NULL,0.0000,0,'F','forever',NULL,NULL,NULL,NULL,NULL),
(4,11,NULL,NULL,0.0000,0,'F','forever',NULL,NULL,NULL,NULL,NULL),
(5,10,NULL,NULL,10.0000,1,'F','forever',NULL,NULL,NULL,NULL,NULL),
(6,9,NULL,NULL,0.0000,0,'F','forever',NULL,NULL,NULL,NULL,NULL),
(7,8,NULL,NULL,0.0000,0,'F','forever',NULL,NULL,NULL,NULL,NULL),
(8,5,NULL,NULL,0.0000,0,'F','forever',NULL,NULL,NULL,NULL,NULL),
(9,4,NULL,NULL,0.0000,0,'F','forever',NULL,NULL,NULL,NULL,NULL),
(10,3,NULL,NULL,0.0000,0,'F','forever',NULL,NULL,NULL,NULL,NULL),
(11,2,NULL,NULL,0.0000,0,'F','forever',NULL,NULL,NULL,NULL,NULL),
(12,1,NULL,NULL,0.0000,0,'F','forever',NULL,NULL,NULL,NULL,NULL),
(15,15,NULL,NULL,0.0000,0,'F','forever',NULL,NULL,NULL,NULL,NULL),
(18,18,NULL,NULL,0.0000,0,'F','forever',NULL,NULL,NULL,NULL,NULL),
(19,19,NULL,NULL,0.0000,0,'F','forever',NULL,NULL,NULL,NULL,NULL),
(20,20,NULL,NULL,0.0000,0,'F','forever',NULL,NULL,NULL,NULL,NULL),
(22,27,NULL,NULL,0.0000,0,'F','forever',NULL,NULL,NULL,NULL,NULL),
(23,29,NULL,NULL,0.0000,0,'F','forever',NULL,NULL,NULL,NULL,NULL),
(24,22,NULL,NULL,0.0000,0,'F','forever',NULL,NULL,NULL,NULL,NULL);
/*!40000 ALTER TABLE `ti_menus_specials` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `ti_migrations`
--

LOCK TABLES `ti_migrations` WRITE;
/*!40000 ALTER TABLE `ti_migrations` DISABLE KEYS */;
INSERT INTO `ti_migrations` VALUES
(1,'System','2015_03_25_000001_create_tables',1),
(2,'System','2016_11_29_000300_optimize_tables_columns',1),
(3,'System','2017_04_13_000300_modify_columns_on_users_and_customers_tables',1),
(4,'System','2017_05_08_000300_add_columns',1),
(5,'System','2017_06_11_000300_create_payments_and_payment_logs_table',1),
(6,'System','2017_08_23_000300_create_themes_table',1),
(7,'System','2018_01_23_000300_create_language_translations_table',1),
(8,'System','2018_03_30_000300_create_extension_settings_table',1),
(9,'System','2018_06_12_000300_rename_model_class_names_to_morph_map_custom_names',1),
(10,'System','2018_10_19_000300_create_media_attachments_table',1),
(11,'System','2018_10_21_131033_create_queue_table',1),
(12,'System','2018_10_21_131044_create_sessions_table',1),
(13,'System','2019_04_16_000300_nullify_customer_id_on_addresses_table',1),
(14,'System','2019_07_01_000300_delete_unused_columns_from_activities_table',1),
(15,'System','2019_07_22_000300_add_user_type_column_to_activities_table',1),
(16,'System','2019_07_30_000300_create_mail_partials_table',1),
(17,'System','2020_02_05_000300_delete_stale_unused_table',1),
(18,'System','2020_04_16_000300_drop_stale_unused_columns',1),
(19,'System','2020_05_24_000300_create_request_logs_table',1),
(20,'System','2021_07_20_000300_add_uuid_column_to_failed_jobs_table',1),
(21,'System','2021_07_20_172212_create_job_batches_table',1),
(22,'System','2021_07_20_172321_create_cache_table',1),
(23,'System','2021_09_06_010000_add_timestamps_to_tables',1),
(24,'System','2021_10_22_010000_make_primary_key_bigint_all_tables',1),
(25,'System','2021_10_25_010000_add_foreign_key_constraints_to_tables',1),
(26,'System','2022_04_20_000300_add_version_column_to_languages_table',1),
(27,'System','2022_06_30_010000_drop_foreign_key_constraints_on_all_tables',1),
(28,'Admin','2017_08_25_000300_create_location_areas_table',1),
(29,'Admin','2017_08_25_000300_create_menu_categories_table',1),
(30,'Admin','2018_01_19_000300_add_hash_columns_on_orders_reservations_table',1),
(31,'Admin','2018_04_06_000300_drop_unique_on_order_totals_table',1),
(32,'Admin','2018_04_12_000300_modify_columns_on_orders_reservations_table',1),
(33,'Admin','2018_05_21_000300_drop_redundant_columns_on_kitchen_tables',1),
(34,'Admin','2018_05_29_000300_add_columns_on_location_areas_table',1),
(35,'Admin','2018_06_12_000300_create_locationables_table',1),
(36,'Admin','2018_07_04_000300_create_user_preferences_table',1),
(37,'Admin','2018_10_09_000300_auto_increment_on_order_totals_table',1),
(38,'Admin','2019_04_09_000300_auto_increment_on_user_preferences_table',1),
(39,'Admin','2019_07_02_000300_add_columns_on_menu_specials_table',1),
(40,'Admin','2019_07_16_000300_create_reservation_tables_table',1),
(41,'Admin','2019_07_21_000300_change_sort_value_ratings_to_config_on_settings_table',1),
(42,'Admin','2019_11_08_000300_add_selected_columns_to_menu_options_table',1),
(43,'Admin','2020_02_18_000400_create_staffs_groups_and_locations_table',1),
(44,'Admin','2020_02_21_000400_create_staff_roles_table',1),
(45,'Admin','2020_02_22_000300_remove_add_columns_on_staff_staff_groups_table',1),
(46,'Admin','2020_02_25_000300_create_assignable_logs_table',1),
(47,'Admin','2020_03_18_000300_add_quantity_column_to_order_menu_options_table',1),
(48,'Admin','2020_04_05_000300_create_payment_profiles_table',1),
(49,'Admin','2020_04_16_000300_drop_stale_unused_columns',1),
(50,'Admin','2020_05_31_000300_drop_more_unused_columns',1),
(51,'Admin','2020_06_11_000300_create_menu_mealtimes_table',1),
(52,'Admin','2020_08_16_000300_modify_columns_on_tables_reservations_table',1),
(53,'Admin','2020_08_18_000300_create_allergens_table',1),
(54,'Admin','2020_09_28_000300_add_refund_columns_to_payment_logs_table',1),
(55,'Admin','2020_12_13_000300_merge_staffs_locations_into_locationables_table',1),
(56,'Admin','2020_12_22_000300_add_priority_column_to_location_areas_table',1),
(57,'Admin','2021_01_04_000300_add_update_related_column_to_menu_options_table',1),
(58,'Admin','2021_01_04_010000_add_order_time_is_asap_on_orders_table',1),
(59,'Admin','2021_04_23_010000_remove_unused_columns',1),
(60,'Admin','2021_05_26_010000_alter_order_type_columns',1),
(61,'Admin','2021_05_29_010000_add_is_summable_on_order_totals_table',1),
(62,'Admin','2021_07_20_010000_add_columns_default_value',1),
(63,'Admin','2021_09_03_010000_make_serialize_columns_json',1),
(64,'Admin','2021_09_06_010000_add_timestamps_to_tables',1),
(65,'Admin','2021_10_22_010000_make_primary_key_bigint_all_tables',1),
(66,'Admin','2021_10_25_010000_add_foreign_key_constraints_to_tables',1),
(67,'Admin','2021_11_28_000300_create_stocks_table',1),
(68,'Admin','2022_02_07_010000_add_low_stock_alerted_on_stocks_table',1),
(69,'Admin','2022_04_27_000300_create_location_options_table',1),
(70,'Admin','2022_05_10_000300_add_primary_key_to_working_hours_table',1),
(71,'Admin','2022_06_30_010000_drop_foreign_key_constraints_on_all_tables',1),
(72,'Admin','2022_09_03_000300_make_location_options_fields_unique',1),
(73,'Admin','2022_10_26_000300_make_code_field_unique_mail_layouts_partials_table',1),
(74,'Admin','2023_01_10_000400_add_delivery_comment_orders_table',1),
(75,'Admin','2023_06_06_000400_update_dashboard_widget_properties_on_user_preferences_table',1),
(76,'igniter.cart','2017_10_20_000100_create_conditions_settings',1),
(77,'igniter.cart','2017_11_20_010000_create_cart_table',1),
(78,'igniter.cart','2018_09_20_010000_rename_content_field_on_cart_table',1),
(79,'igniter.frontend','2018_01_28_000300_create_subscribers_table',1),
(80,'igniter.frontend','2018_06_28_000300_create_banners_table',1),
(81,'igniter.frontend','2019_11_02_000300_create_sliders_table',1),
(82,'igniter.frontend','2021_10_20_000300_rename_banners_table',1),
(83,'igniter.frontend','2021_11_18_010000_make_primary_key_bigint_all_tables',1),
(84,'igniter.frontend','2021_11_18_010300_add_foreign_key_constraints_to_tables',1),
(85,'igniter.frontend','2022_06_30_010000_drop_foreign_key_constraints',1),
(86,'igniter.pages','2018_06_28_000300_create_pages_table',1),
(87,'igniter.pages','2019_11_28_000300_create_menus_table',1),
(88,'igniter.pages','2019_11_28_000400_alter_columns_on_pages_table',1),
(89,'igniter.pages','2021_03_31_000300_seed_menus_table',1),
(90,'igniter.pages','2021_09_06_010000_add_timestamps_to_pages',1),
(91,'igniter.pages','2021_10_20_010000_add_foreign_key_constraints_to_tables',1),
(92,'igniter.pages','2022_09_16_010000_change_page_content_to_medium_text',1),
(93,'igniter.pages','2023_01_28_010000_make_page_id_incremental',1),
(94,'igniter.local','2020_09_17_000300_create_reviews_table_or_rename',1),
(95,'igniter.local','2020_12_10_000300_update_reviews_table',1),
(96,'igniter.local','2021_01_02_000300_add_last_location_area_customers_table',1),
(97,'igniter.local','2021_09_06_010000_add_timestamps_to_reviews',1),
(98,'igniter.local','2021_11_18_010000_make_primary_key_bigint_all_tables',1),
(99,'igniter.payregister','2021_05_08_000300_seed_default_payment_gateways',1),
(100,'igniter.automation','2018_10_01_000100_create_all_tables',1),
(101,'igniter.automation','2020_11_08_000300_create_task_log_table',1),
(102,'igniter.automation','2021_11_18_010000_make_primary_key_bigint_all_tables',1),
(103,'igniter.automation','2021_11_18_010300_add_foreign_key_constraints_to_tables',1),
(104,'igniter.automation','2022_06_30_010000_drop_foreign_key_constraints',1),
(105,'igniter.broadcast','2021_10_15_000400_create_websockets_statistics_entries_table',1),
(106,'igniter.coupons','2020_09_17_000300_create_coupons_table_or_rename',1),
(107,'igniter.coupons','2020_09_18_000300_create_coupon_relations_tables',1),
(108,'igniter.coupons','2020_10_15_000300_create_cart_restriction',1),
(109,'igniter.coupons','2020_11_01_000300_add_auto_apply_field_on_coupons_table',1),
(110,'igniter.coupons','2021_02_22_000300_increase_coupon_code_character_limit',1),
(111,'igniter.coupons','2021_05_26_010000_alter_order_restriction_column',1),
(112,'igniter.coupons','2021_09_06_010000_add_timestamps_to_coupons',1),
(113,'igniter.coupons','2021_11_18_010000_make_primary_key_bigint_all_tables',1),
(114,'igniter.coupons','2021_11_18_010300_add_foreign_key_constraints_to_tables',1),
(115,'igniter.coupons','2022_06_30_010000_drop_foreign_key_constraints',1),
(116,'igniter.coupons','2023_06_03_010000_set_nullable_columns',1),
(117,'igniter.coupons','2023_09_28_010000_create_coupon_customer_groups_tables',1),
(118,'igniter.coupons','2023_10_19_010000_change_is_limited_to_cart_item_to_apply_coupon_on_enum',1),
(119,'igniter.socialite','2018_10_11_211028_create_socialite_providers_table',1),
(120,'igniter.socialite','2022_02_04_211028_add_user_type_column_socialite_providers_table',1),
(121,'igniter.socialite','2022_06_14_211028_increase_string_length',1);
/*!40000 ALTER TABLE `ti_migrations` ENABLE KEYS */;
UNLOCK TABLES;

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
) ENGINE=InnoDB AUTO_INCREMENT=128 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ti_notifications`
--

LOCK TABLES `ti_notifications` WRITE;
/*!40000 ALTER TABLE `ti_notifications` DISABLE KEYS */;
INSERT INTO `ti_notifications` VALUES
(21,'order_status','Order Status Updated - Table ','','Table ','{\"order_id\":207,\"status\":\"completed\",\"status_name\":\"Completed\",\"timestamp\":\"2025-10-12T18:50:52.659781Z\"}','seen','2025-10-12 19:50:52','2025-10-13 23:27:07'),
(22,'order_status','Order Status Updated - Table ','','Table ','{\"order_id\":206,\"status\":\"canceled\",\"status_name\":\"Canceled\",\"timestamp\":\"2025-10-12T18:50:54.403818Z\"}','seen','2025-10-12 19:50:54','2025-10-13 23:27:06'),
(23,'order_status','New Order Received - Table ','','Table ','{\"order_id\":205,\"status\":\"received\",\"status_name\":\"Received\",\"timestamp\":\"2025-10-12T18:50:56.066639Z\"}','seen','2025-10-12 19:50:56','2025-10-13 23:27:06'),
(24,'order_status','Order Status Updated - Table ','','Table ','{\"order_id\":204,\"status\":\"completed\",\"status_name\":\"Completed\",\"timestamp\":\"2025-10-12T18:50:58.277145Z\"}','seen','2025-10-12 19:50:58','2025-10-13 23:27:06'),
(25,'order_status','Order Status Updated - Table ','','Table ','{\"order_id\":203,\"status\":\"delivery\",\"status_name\":\"Delivery\",\"timestamp\":\"2025-10-12T18:51:00.375143Z\"}','seen','2025-10-12 19:51:00','2025-10-13 23:27:05'),
(26,'order_status','Order in Preparation - Table ','','Table ','{\"order_id\":211,\"status\":\"preparation\",\"status_name\":\"Preparation\",\"timestamp\":\"2025-10-13T19:31:31.520655Z\"}','seen','2025-10-13 20:31:31','2025-10-13 23:27:05'),
(27,'order_status','Order Status Updated - Table ','','Table ','{\"order_id\":211,\"status\":\"completed\",\"status_name\":\"Completed\",\"timestamp\":\"2025-10-13T19:31:38.465105Z\"}','seen','2025-10-13 20:31:38','2025-10-13 23:27:05'),
(28,'order_status','Order Status Updated - Table ','','Table ','{\"order_id\":211,\"status\":\"delivery\",\"status_name\":\"Delivery\",\"timestamp\":\"2025-10-14T03:21:54.212929Z\"}','seen','2025-10-14 04:21:54','2025-10-15 00:39:19'),
(29,'order_status','Order Status Updated - Table ','','Table ','{\"order_id\":205,\"status\":\"delivery\",\"status_name\":\"Delivery\",\"timestamp\":\"2025-10-14T15:15:04.120341Z\"}','seen','2025-10-14 16:15:04','2025-10-15 00:39:19'),
(30,'waiter_call','Waiter called from Table 63','46','Table 63','{\"message\":\"\",\"source\":\"guest\",\"details\":\"Table 63\"}','seen','2025-10-15 00:45:28','2025-10-15 22:09:31'),
(31,'table_note','Note from Table 63','46','Table 63','{\"note\":\"Test3\",\"details\":\"Table 63\"}','seen','2025-10-15 00:45:40','2025-10-15 22:09:30'),
(32,'valet_request','Valet Request from Table 63','63','Table 63','{\"name\":\"Test3\",\"license_plate\":\"3\",\"car_make\":\"3\",\"details\":\"Table 63 · 3 · 3\"}','seen','2025-10-15 00:45:47','2025-10-15 22:09:30'),
(33,'order_status','Order Status Updated - Table ','','Table ','{\"order_id\":212,\"status\":\"completed\",\"status_name\":\"Completed\",\"timestamp\":\"2025-10-14T23:46:19.624764Z\"}','seen','2025-10-15 00:46:19','2025-10-15 22:09:30'),
(34,'order_status','Order in Preparation - Table ','','Table ','{\"order_id\":213,\"status\":\"preparation\",\"status_name\":\"Preparation\",\"timestamp\":\"2025-10-15T21:09:35.171729Z\"}','seen','2025-10-15 22:09:35','2025-10-18 18:49:38'),
(35,'valet_request','Valet Request from Table 85','85','Table 85','{\"name\":\"Test7\",\"license_plate\":\"7123\",\"car_make\":\"Mercedes\",\"details\":\"Table 85 · 7123 · Mercedes\"}','seen','2025-10-15 22:10:22','2025-10-18 18:43:40'),
(36,'order_status','Order in Preparation - Table ','','Table ','{\"order_id\":214,\"status\":\"preparation\",\"status_name\":\"Preparation\",\"timestamp\":\"2025-10-21T19:25:02.413940Z\"}','seen','2025-10-21 20:25:02','2025-10-21 20:26:16'),
(37,'order_status','Order Status Updated - Table ','','Table ','{\"order_id\":214,\"status\":\"completed\",\"status_name\":\"Completed\",\"timestamp\":\"2025-10-21T19:25:14.519943Z\"}','seen','2025-10-21 20:25:14','2025-10-21 20:26:16'),
(38,'order_status','Order Status Updated - Table ','','Table ','{\"order_id\":222,\"status\":\"delivery\",\"status_name\":\"Delivery\",\"timestamp\":\"2025-10-26T19:50:55.446280Z\"}','seen','2025-10-26 19:50:55','2025-11-16 21:06:01'),
(39,'order_status','Order Status Updated - Table ','','Table ','{\"order_id\":222,\"status\":\"canceled\",\"status_name\":\"Canceled\",\"timestamp\":\"2025-10-26T19:50:57.592955Z\"}','seen','2025-10-26 19:50:57','2025-11-16 21:06:01'),
(40,'waiter_call','Waiter called from Table 30','50','Table 30','{\"message\":\"\",\"source\":\"guest\",\"details\":\"Table 30\"}','seen','2025-10-29 23:02:34','2025-11-11 23:19:17'),
(41,'table_note','Note from Table 30','50','Table 30','{\"note\":\"asdnasdjnasjdnasjdnasdnajsndiajnsdiajsndjansd asdasdasjdnasjdajsdiasdijasdjasdnasdjnasjdnasjdnasdnajsndiajnsdiajsndjansd asdasdasjdnasjdajsdiasdijasdjasdnasdjnasjdnasjdnasdnajsndiajnsdiajsndjansd asdasdasjdnasjdajsdiasdijasdj\",\"details\":\"Table 30\"}','seen','2025-10-29 23:03:57','2025-11-01 02:54:30'),
(42,'order_status','New Order Received - Table 63','','Table 63','{\"order_id\":224,\"status\":\"received\",\"status_name\":\"Received\",\"timestamp\":\"2025-10-30T16:14:34.131844Z\"}','seen','2025-10-30 16:14:34','2025-11-16 21:06:00'),
(43,'order_status','Order Status Updated','','','{\"order_id\":221,\"status\":\"delivery\",\"status_name\":\"Delivery\",\"timestamp\":\"2025-10-31T12:10:34.438287Z\"}','seen','2025-10-31 12:10:34','2025-11-01 02:56:13'),
(44,'order_status','New Order Received - Table 87','','Table 87','{\"order_id\":225,\"status\":\"received\",\"status_name\":\"Received\",\"timestamp\":\"2025-10-31T17:45:14.235164Z\"}','seen','2025-10-31 17:45:14','2025-11-16 21:06:01'),
(45,'order_status','New Order Received - Table 2','','Table 2','{\"order_id\":226,\"status\":\"received\",\"status_name\":\"Received\",\"timestamp\":\"2025-11-01T02:55:49.553871Z\"}','seen','2025-11-01 02:55:49','2025-11-16 21:05:58'),
(46,'order_status','New Order Received - Table 12','','Table 12','{\"order_id\":222,\"status\":\"received\",\"status_name\":\"Received\",\"timestamp\":\"2025-11-01T02:56:29.935877Z\"}','seen','2025-11-01 02:56:29','2025-11-15 00:32:19'),
(47,'order_status','Order in Preparation - Table 7','','Table 7','{\"order_id\":227,\"status\":\"preparation\",\"status_name\":\"Preparation\",\"timestamp\":\"2025-11-10T18:03:52.131944Z\"}','seen','2025-11-10 18:03:52','2025-11-15 00:32:18'),
(48,'order_status','Order Status Updated - Table 7','','Table 7','{\"order_id\":227,\"status\":\"completed\",\"status_name\":\"Completed\",\"timestamp\":\"2025-11-10T18:03:58.145935Z\"}','seen','2025-11-10 18:03:58','2025-11-15 00:32:18'),
(49,'order_status','Order in Preparation - Table 34','','Table 34','{\"order_id\":228,\"status\":\"preparation\",\"status_name\":\"Preparation\",\"timestamp\":\"2025-11-10T18:04:36.959197Z\"}','seen','2025-11-10 18:04:36','2025-11-15 00:32:18'),
(50,'order_status','Order Status Updated - Table 34','','Table 34','{\"order_id\":228,\"status\":\"completed\",\"status_name\":\"Completed\",\"timestamp\":\"2025-11-10T18:04:43.927444Z\"}','seen','2025-11-10 18:04:43','2025-11-15 00:32:17'),
(51,'order_status','New Order Received - Table 11','','Table 11','{\"order_id\":229,\"status\":\"received\",\"status_name\":\"Received\",\"timestamp\":\"2025-11-10T18:05:11.563772Z\"}','seen','2025-11-10 18:05:11','2025-11-16 21:05:58'),
(52,'order_status','Order Status Updated - Table 11','','Table 11','{\"order_id\":229,\"status\":\"delivery\",\"status_name\":\"Delivery\",\"timestamp\":\"2025-11-10T18:05:17.869904Z\"}','seen','2025-11-10 18:05:17','2025-11-16 21:05:57'),
(53,'order_status','Order Status Updated - Table 11','','Table 11','{\"order_id\":229,\"status\":\"completed\",\"status_name\":\"Completed\",\"timestamp\":\"2025-11-10T18:05:20.745494Z\"}','seen','2025-11-10 18:05:20','2025-11-16 21:05:58'),
(54,'order_status','New Order Received - Table 32','','Table 32','{\"order_id\":230,\"status\":\"received\",\"status_name\":\"Received\",\"timestamp\":\"2025-11-10T18:05:37.415341Z\"}','seen','2025-11-10 18:05:37','2025-11-16 21:05:55'),
(55,'order_status','Order Status Updated - Table 32','','Table 32','{\"order_id\":230,\"status\":\"canceled\",\"status_name\":\"Canceled\",\"timestamp\":\"2025-11-10T18:06:00.873362Z\"}','seen','2025-11-10 18:06:00','2025-11-11 23:19:19'),
(56,'order_status','New Order Received - Table 3','','Table 3','{\"order_id\":231,\"status\":\"received\",\"status_name\":\"Received\",\"timestamp\":\"2025-11-11T15:01:01.305499Z\"}','seen','2025-11-11 15:01:01','2025-11-11 23:19:19'),
(57,'order_status','New Order Received - Cashier','','Cashier','{\"order_id\":232,\"status\":\"received\",\"status_name\":\"Received\",\"timestamp\":\"2025-11-12T19:01:15.082120Z\"}','seen','2025-11-12 19:01:15','2025-11-16 21:05:56'),
(58,'order_status','New Order Received - Cashier','','Cashier','{\"order_id\":233,\"status\":\"received\",\"status_name\":\"Received\",\"timestamp\":\"2025-11-12T19:07:41.028155Z\"}','seen','2025-11-12 19:07:41','2025-11-16 21:05:55'),
(59,'order_status','New Order Received - Cashier','','Cashier','{\"order_id\":234,\"status\":\"received\",\"status_name\":\"Received\",\"timestamp\":\"2025-11-14T07:47:24.279723Z\"}','seen','2025-11-14 07:47:24','2025-11-16 21:05:59'),
(60,'order_status','Order Status Updated - Cashier','','Cashier','{\"order_id\":234,\"status\":\"delivery\",\"status_name\":\"Delivery\",\"timestamp\":\"2025-11-15T01:05:46.037021Z\"}','seen','2025-11-15 01:05:46','2025-11-16 21:05:54'),
(61,'order_status','New Order Received','','','{\"order_id\":235,\"status\":\"received\",\"status_name\":\"Received\",\"timestamp\":\"2025-11-21T12:43:50.042217Z\"}','seen','2025-11-21 12:43:50','2025-11-21 12:45:05'),
(62,'order_status','New Order Received','','','{\"order_id\":237,\"status\":\"received\",\"status_name\":\"Received\",\"timestamp\":\"2025-11-21T21:35:45.363173Z\"}','seen','2025-11-21 21:35:45','2025-11-21 21:39:37'),
(63,'order_status','New Order Received - Table 66','','Table 66','{\"order_id\":238,\"status\":\"received\",\"status_name\":\"Received\",\"timestamp\":\"2025-11-21T21:36:56.871120Z\"}','seen','2025-11-21 21:36:56','2025-11-21 21:39:37'),
(64,'order_status','New Order Received','','','{\"order_id\":239,\"status\":\"received\",\"status_name\":\"Received\",\"timestamp\":\"2025-11-21T21:39:56.228467Z\"}','seen','2025-11-21 21:39:56','2025-11-21 21:42:14'),
(65,'order_status','New Order Received','','','{\"order_id\":240,\"status\":\"received\",\"status_name\":\"Received\",\"timestamp\":\"2025-11-21T21:41:27.689086Z\"}','seen','2025-11-21 21:41:27','2025-11-21 21:42:10'),
(66,'order_status','New Order Received','','','{\"order_id\":241,\"status\":\"received\",\"status_name\":\"Received\",\"timestamp\":\"2025-11-21T22:18:21.186330Z\"}','seen','2025-11-21 22:18:21','2025-11-23 12:19:47'),
(67,'order_status','New Order Received - Table 34','','Table 34','{\"order_id\":242,\"status\":\"received\",\"status_name\":\"Received\",\"timestamp\":\"2025-11-21T22:24:52.020486Z\"}','seen','2025-11-21 22:24:52','2025-11-23 12:19:46'),
(68,'order_status','New Order Received - Table 11','','Table 11','{\"order_id\":229,\"status\":\"received\",\"status_name\":\"Received\",\"timestamp\":\"2025-11-24T00:51:49.864732Z\"}','seen','2025-11-24 00:51:49','2025-12-05 15:51:34'),
(69,'order_status','New Order Received - Table 20','','Table 20','{\"order_id\":245,\"status\":\"received\",\"status_name\":\"Received\",\"timestamp\":\"2025-11-24T12:13:08.935909Z\"}','seen','2025-11-24 12:13:08','2025-12-05 15:51:34'),
(70,'order_status','New Order Received - Table 20','','Table 20','{\"order_id\":246,\"status\":\"received\",\"status_name\":\"Received\",\"timestamp\":\"2025-11-24T12:13:10.096718Z\"}','seen','2025-11-24 12:13:10','2025-12-05 15:51:33'),
(71,'order_status','New Order Received','','','{\"order_id\":247,\"status\":\"received\",\"status_name\":\"Received\",\"timestamp\":\"2025-11-25T10:06:15.024999Z\"}','seen','2025-11-25 10:06:15','2025-12-05 15:51:33'),
(72,'order_status','New Order Received - Table 55','','Table 55','{\"order_id\":254,\"status\":\"received\",\"status_name\":\"Received\",\"timestamp\":\"2025-11-25T19:02:21.291905Z\"}','seen','2025-11-25 19:02:21','2025-12-05 12:10:22'),
(73,'order_status','New Order Received','','','{\"order_id\":255,\"status\":\"received\",\"status_name\":\"Received\",\"timestamp\":\"2025-11-26T01:23:08.001446Z\"}','seen','2025-11-26 01:23:08','2025-12-05 12:10:22'),
(74,'order_status','New Order Received','','','{\"order_id\":256,\"status\":\"received\",\"status_name\":\"Received\",\"timestamp\":\"2025-11-26T01:33:33.302592Z\"}','seen','2025-11-26 01:33:33','2025-12-05 12:10:22'),
(75,'order_status','New Order Received','','','{\"order_id\":257,\"status\":\"received\",\"status_name\":\"Received\",\"timestamp\":\"2025-11-26T01:41:54.563055Z\"}','seen','2025-11-26 01:41:54','2025-12-05 12:10:22'),
(76,'order_status','New Order Received','','','{\"order_id\":258,\"status\":\"received\",\"status_name\":\"Received\",\"timestamp\":\"2025-11-26T02:12:22.932777Z\"}','seen','2025-11-26 02:12:22','2025-12-05 12:10:22'),
(77,'order_status','New Order Received','','','{\"order_id\":259,\"status\":\"received\",\"status_name\":\"Received\",\"timestamp\":\"2025-11-26T02:13:44.337021Z\"}','seen','2025-11-26 02:13:44','2025-12-05 12:10:21'),
(78,'order_status','New Order Received','','','{\"order_id\":260,\"status\":\"received\",\"status_name\":\"Received\",\"timestamp\":\"2025-11-26T02:16:40.827545Z\"}','seen','2025-11-26 02:16:40','2025-12-05 12:10:21'),
(79,'order_status','New Order Received','','','{\"order_id\":261,\"status\":\"received\",\"status_name\":\"Received\",\"timestamp\":\"2025-11-26T02:20:52.004468Z\"}','seen','2025-11-26 02:20:52','2025-12-05 12:10:21'),
(80,'order_status','New Order Received','','','{\"order_id\":262,\"status\":\"received\",\"status_name\":\"Received\",\"timestamp\":\"2025-11-26T02:20:56.828433Z\"}','seen','2025-11-26 02:20:56','2025-12-05 12:10:21'),
(81,'order_status','New Order Received','','','{\"order_id\":264,\"status\":\"received\",\"status_name\":\"Received\",\"timestamp\":\"2025-11-26T09:37:22.601691Z\"}','seen','2025-11-26 09:37:22','2025-12-05 12:10:20'),
(82,'order_status','New Order Received','','','{\"order_id\":265,\"status\":\"received\",\"status_name\":\"Received\",\"timestamp\":\"2025-11-26T09:37:25.010438Z\"}','seen','2025-11-26 09:37:25','2025-12-05 12:10:20'),
(83,'order_status','New Order Received','','','{\"order_id\":267,\"status\":\"received\",\"status_name\":\"Received\",\"timestamp\":\"2025-11-26T09:43:56.902393Z\"}','seen','2025-11-26 09:43:56','2025-12-05 12:10:20'),
(84,'order_status','New Order Received','','','{\"order_id\":268,\"status\":\"received\",\"status_name\":\"Received\",\"timestamp\":\"2025-11-26T09:43:57.591543Z\"}','seen','2025-11-26 09:43:57','2025-12-05 12:10:20'),
(85,'table_note','Note from Table 52','55','Table 52','{\"note\":\"Test 1\",\"details\":\"Table 52\"}','seen','2025-11-26 20:00:33','2025-12-05 12:10:20'),
(86,'waiter_call','Waiter called from Table 52','55','Table 52','{\"message\":\"\",\"source\":\"guest\",\"details\":\"Table 52\"}','seen','2025-11-26 20:00:36','2025-12-05 12:10:19'),
(87,'waiter_call','Waiter called from Table 52','55','Table 52','{\"message\":\"\",\"source\":\"guest\",\"details\":\"Table 52\"}','seen','2025-11-26 20:01:27','2025-12-05 12:10:19'),
(88,'waiter_call','Waiter called from Table 52','55','Table 52','{\"message\":\"\",\"source\":\"guest\",\"details\":\"Table 52\"}','seen','2025-11-26 20:01:59','2025-12-05 12:10:19'),
(89,'order_status','Order Status Updated - Table 52','','Table 52','{\"order_id\":282,\"status\":\"delivery\",\"status_name\":\"Delivery\",\"timestamp\":\"2025-12-01T15:53:31.703560Z\"}','seen','2025-12-01 15:53:31','2025-12-04 18:39:47'),
(90,'order_status','New Order Received - Table 33','','Table 33','{\"order_id\":283,\"status\":\"received\",\"status_name\":\"Received\",\"timestamp\":\"2025-12-01T15:53:49.833554Z\"}','seen','2025-12-01 15:53:49','2025-12-04 18:39:47'),
(91,'order_status','New Order Received - Table 33','','Table 33','{\"order_id\":284,\"status\":\"received\",\"status_name\":\"Received\",\"timestamp\":\"2025-12-01T15:53:51.976684Z\"}','seen','2025-12-01 15:53:51','2025-12-04 18:39:46'),
(92,'order_status','New Order Received - Table 63','','Table 63','{\"order_id\":285,\"status\":\"received\",\"status_name\":\"Received\",\"timestamp\":\"2025-12-01T16:36:41.563895Z\"}','seen','2025-12-01 16:36:41','2025-12-04 18:39:46'),
(93,'order_status','New Order Received - Table 63','','Table 63','{\"order_id\":286,\"status\":\"received\",\"status_name\":\"Received\",\"timestamp\":\"2025-12-01T16:36:43.065497Z\"}','seen','2025-12-01 16:36:43','2025-12-04 18:39:46'),
(94,'order_status','New Order Received - Table 63','','Table 63','{\"order_id\":287,\"status\":\"received\",\"status_name\":\"Received\",\"timestamp\":\"2025-12-01T16:36:55.158513Z\"}','seen','2025-12-01 16:36:55','2025-12-04 18:39:45'),
(95,'order_status','Order in Preparation - Table 52','','Table 52','{\"order_id\":281,\"status\":\"preparation\",\"status_name\":\"Preparation\",\"timestamp\":\"2025-12-01T16:48:48.370107Z\"}','seen','2025-12-01 16:48:48','2025-12-04 18:39:45'),
(96,'order_status','Order Status Updated - Table 33','','Table 33','{\"order_id\":283,\"status\":\"delivery\",\"status_name\":\"Delivery\",\"timestamp\":\"2025-12-01T16:48:53.291986Z\"}','seen','2025-12-01 16:48:53','2025-12-04 18:39:44'),
(97,'order_status','New Order Received - Table 12','','Table 12','{\"order_id\":288,\"status\":\"received\",\"status_name\":\"Received\",\"timestamp\":\"2025-12-01T20:37:33.483789Z\"}','seen','2025-12-01 20:37:33','2025-12-04 18:39:44'),
(98,'order_status','New Order Received - Table 12','','Table 12','{\"order_id\":289,\"status\":\"received\",\"status_name\":\"Received\",\"timestamp\":\"2025-12-01T20:53:19.144150Z\"}','seen','2025-12-01 20:53:19','2025-12-04 18:39:43'),
(99,'order_status','New Order Received - Table 12','','Table 12','{\"order_id\":290,\"status\":\"received\",\"status_name\":\"Received\",\"timestamp\":\"2025-12-01T23:43:42.826294Z\"}','seen','2025-12-01 23:43:42','2025-12-04 18:39:43'),
(100,'order_status','New Order Received - Table 12','','Table 12','{\"order_id\":291,\"status\":\"received\",\"status_name\":\"Received\",\"timestamp\":\"2025-12-01T23:55:21.844667Z\"}','seen','2025-12-01 23:55:21','2025-12-04 18:39:43'),
(101,'order_status','New Order Received - Table 12','','Table 12','{\"order_id\":292,\"status\":\"received\",\"status_name\":\"Received\",\"timestamp\":\"2025-12-02T00:12:17.322652Z\"}','seen','2025-12-02 00:12:17','2025-12-04 18:39:42'),
(102,'order_status','Order Status Updated - POS','','POS','{\"order_id\":256,\"status\":\"delivery\",\"status_name\":\"Delivery\",\"timestamp\":\"2025-12-02T23:31:55.821336Z\"}','seen','2025-12-02 23:31:55','2025-12-04 18:39:42'),
(103,'order_status','New Order Received - Table 32','','Table 32','{\"order_id\":293,\"status\":\"received\",\"status_name\":\"Received\",\"timestamp\":\"2025-12-02T23:33:16.988704Z\"}','seen','2025-12-02 23:33:16','2025-12-04 18:39:42'),
(104,'order_status','New Order Received - Table 63','','Table 63','{\"order_id\":294,\"status\":\"received\",\"status_name\":\"Received\",\"timestamp\":\"2025-12-04T14:40:38.262957Z\"}','seen','2025-12-04 14:40:38','2025-12-04 18:39:41'),
(105,'order_status','New Order Received - Table 63','','Table 63','{\"order_id\":295,\"status\":\"received\",\"status_name\":\"Received\",\"timestamp\":\"2025-12-04T14:47:57.238385Z\"}','seen','2025-12-04 14:47:57','2025-12-04 18:39:41'),
(106,'order_status','New Order Received - Table 63','','Table 63','{\"order_id\":296,\"status\":\"received\",\"status_name\":\"Received\",\"timestamp\":\"2025-12-04T14:48:08.690858Z\"}','seen','2025-12-04 14:48:08','2025-12-04 18:39:41'),
(107,'order_status','New Order Received - Table 63','','Table 63','{\"order_id\":297,\"status\":\"received\",\"status_name\":\"Received\",\"timestamp\":\"2025-12-04T14:48:20.369625Z\"}','seen','2025-12-04 14:48:20','2025-12-04 18:39:40'),
(108,'order_status','New Order Received - Table 12','','Table 12','{\"order_id\":298,\"status\":\"received\",\"status_name\":\"Received\",\"timestamp\":\"2025-12-04T18:34:59.130881Z\"}','seen','2025-12-04 18:34:59','2025-12-04 18:39:40'),
(109,'order_status','New Order Received - Table 19','','Table 19','{\"order_id\":299,\"status\":\"received\",\"status_name\":\"Received\",\"timestamp\":\"2025-12-04T18:42:40.751679Z\"}','seen','2025-12-04 18:42:40','2025-12-05 12:10:19'),
(110,'order_status','New Order Received - Table 63','','Table 63','{\"order_id\":301,\"status\":\"received\",\"status_name\":\"Received\",\"timestamp\":\"2025-12-05T12:09:40.329364Z\"}','seen','2025-12-05 12:09:40','2025-12-05 15:51:33'),
(111,'order_status','New Order Received - Table 63','','Table 63','{\"order_id\":302,\"status\":\"received\",\"status_name\":\"Received\",\"timestamp\":\"2025-12-05T12:09:51.515639Z\"}','seen','2025-12-05 12:09:51','2025-12-05 15:51:33'),
(112,'order_status','Order Status Updated - Table 7','','Table 7','{\"order_id\":304,\"status\":\"completed\",\"status_name\":\"Completed\",\"timestamp\":\"2025-12-05T13:37:19.786555Z\"}','seen','2025-12-05 13:37:19','2025-12-05 15:56:40'),
(113,'table_move','Table move completed: Table 30 ↔ Table 85','47','Table 85','{\"source_table_name\":\"Table 30\",\"source_table_id\":\"50\",\"dest_table_name\":\"Table 85\",\"dest_table_id\":\"47\",\"moved_orders_count\":0,\"swapped_orders_count\":0,\"moved_by\":1,\"message\":\"Table move completed: Table 30 ↔ Table 85\",\"timestamp\":\"2025-12-05T19:14:10+00:00\"}','seen','2025-12-05 19:14:10','2025-12-05 19:30:11'),
(114,'table_move','1 order(s) moved from Table 66 to Table 30','43','Table 66','{\"source_table_name\":\"Table 30\",\"source_table_id\":\"50\",\"dest_table_name\":\"Table 66\",\"dest_table_id\":\"43\",\"moved_orders_count\":0,\"swapped_orders_count\":1,\"moved_by\":1,\"message\":\"1 order(s) moved from Table 66 to Table 30\",\"timestamp\":\"2025-12-05T19:14:20+00:00\"}','seen','2025-12-05 19:14:20','2025-12-05 19:30:11'),
(115,'table_move','1 order(s) moved from Table 30 to Table 85','50','Table 30','{\"source_table_name\":\"Table 85\",\"source_table_id\":\"47\",\"dest_table_name\":\"Table 30\",\"dest_table_id\":\"50\",\"moved_orders_count\":0,\"swapped_orders_count\":1,\"moved_by\":1,\"message\":\"1 order(s) moved from Table 30 to Table 85\",\"timestamp\":\"2025-12-05T19:14:26+00:00\"}','seen','2025-12-05 19:14:26','2025-12-05 19:30:10'),
(116,'table_move','Orders swapped: 1 order(s) moved from Table 34 to Table 11, 1 order(s) moved from Table 11 to Table 34','40','Table 11','{\"source_table_name\":\"Table 34\",\"source_table_id\":\"54\",\"dest_table_name\":\"Table 11\",\"dest_table_id\":\"40\",\"moved_orders_count\":1,\"swapped_orders_count\":1,\"moved_by\":1,\"message\":\"Orders swapped: 1 order(s) moved from Table 34 to Table 11, 1 order(s) moved from Table 11 to Table 34\",\"timestamp\":\"2025-12-05T19:19:55+00:00\"}','seen','2025-12-05 19:19:55','2025-12-05 19:30:10'),
(117,'table_move','1 order(s) moved from Table 87 to Table 52','45','Table 87','{\"source_table_name\":\"Table 52\",\"source_table_id\":\"55\",\"dest_table_name\":\"Table 87\",\"dest_table_id\":\"45\",\"moved_orders_count\":0,\"swapped_orders_count\":1,\"moved_by\":1,\"message\":\"1 order(s) moved from Table 87 to Table 52\",\"timestamp\":\"2025-12-05T19:20:10+00:00\"}','seen','2025-12-05 19:20:10','2025-12-05 19:30:09'),
(118,'table_move','Orders swapped: 1 order(s) moved from Table 52 to Table 63, 10 order(s) moved from Table 63 to Table 52','46','Table 63','{\"source_table_name\":\"Table 52\",\"source_table_id\":\"55\",\"dest_table_name\":\"Table 63\",\"dest_table_id\":\"46\",\"moved_orders_count\":1,\"swapped_orders_count\":10,\"moved_by\":1,\"message\":\"Orders swapped: 1 order(s) moved from Table 52 to Table 63, 10 order(s) moved from Table 63 to Table 52\",\"timestamp\":\"2025-12-05T19:30:42+00:00\"}','seen','2025-12-05 19:30:42','2025-12-05 19:31:20'),
(119,'order_status','New Order Received - Table 33','','Table 33','{\"order_id\":306,\"status\":\"received\",\"status_name\":\"Received\",\"timestamp\":\"2025-12-05T19:54:14.268335Z\"}','seen','2025-12-05 19:54:14','2025-12-05 19:55:30'),
(120,'order_status','New Order Received - Table 3','','Table 3','{\"order_id\":307,\"status\":\"received\",\"status_name\":\"Received\",\"timestamp\":\"2025-12-05T20:06:07.084364Z\"}','new','2025-12-05 20:06:07','2025-12-05 20:06:07'),
(121,'order_status','New Order Received - Table 12','','Table 12','{\"order_id\":308,\"status\":\"received\",\"status_name\":\"Received\",\"timestamp\":\"2025-12-05T20:06:20.700747Z\"}','new','2025-12-05 20:06:20','2025-12-05 20:06:20'),
(122,'table_move','Orders swapped: 1 order(s) moved from Table 12 to Table 3, 1 order(s) moved from Table 3 to Table 12','36','Table 3','{\"source_table_name\":\"Table 12\",\"source_table_id\":\"41\",\"dest_table_name\":\"Table 3\",\"dest_table_id\":\"36\",\"moved_orders_count\":1,\"swapped_orders_count\":1,\"moved_by\":1,\"message\":\"Orders swapped: 1 order(s) moved from Table 12 to Table 3, 1 order(s) moved from Table 3 to Table 12\",\"timestamp\":\"2025-12-05T20:07:10+00:00\"}','seen','2025-12-05 20:07:10','2025-12-05 23:46:19'),
(123,'order_status','Order in Preparation - Table 12','','Table 12','{\"order_id\":310,\"status\":\"preparation\",\"status_name\":\"Preparation\",\"timestamp\":\"2025-12-05T23:48:05.590551Z\"}','new','2025-12-05 23:48:05','2025-12-05 23:48:05'),
(124,'table_note','Note from Table 12','41','Table 12','{\"note\":\"TEst nr 1 TEst nr 1 TEst nr 1 TEst nr 1 TEst nr 1 TEst nr 1 TEst nr 1 TEst nr 1 TEst nr 1\",\"details\":\"Table 12\"}','new','2025-12-05 23:48:28','2025-12-05 23:48:28'),
(125,'order_status','New Order Received - Table 3','','Table 3','{\"order_id\":311,\"status\":\"received\",\"status_name\":\"Received\",\"timestamp\":\"2025-12-06T01:03:14.709456Z\"}','new','2025-12-06 01:03:14','2025-12-06 01:03:14'),
(126,'order_status','New Order Received - Table 11','','Table 11','{\"order_id\":312,\"status\":\"received\",\"status_name\":\"Received\",\"timestamp\":\"2025-12-06T09:01:07.811238Z\"}','new','2025-12-06 09:01:07','2025-12-06 09:01:07'),
(127,'staff_note','Staff Note - Table 11','','Table 11','{\"order_id\":312,\"note\":\"this is just a test note\",\"timestamp\":\"2025-12-06T09:02:11+00:00\"}','new','2025-12-06 09:02:11','2025-12-06 09:02:11');
/*!40000 ALTER TABLE `ti_notifications` ENABLE KEYS */;
UNLOCK TABLES;

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
) ENGINE=InnoDB AUTO_INCREMENT=254 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ti_order_menu_options`
--

LOCK TABLES `ti_order_menu_options` WRITE;
/*!40000 ALTER TABLE `ti_order_menu_options` DISABLE KEYS */;
INSERT INTO `ti_order_menu_options` VALUES
(1,2,4,'Meat',4.9500,4,5,10,1),
(2,2,4,'Small',0.0000,4,6,13,1),
(3,3,4,'Meat',4.9500,9,5,10,1),
(4,3,4,'Small',0.0000,9,6,13,1),
(5,4,3,'Beef',6.9500,10,3,7,1),
(6,4,3,'Small',0.0000,10,4,8,1),
(7,5,2,'Small',0.0000,13,2,3,1),
(8,5,3,'Fish',4.9500,14,3,6,1),
(9,6,4,'Beef',6.9500,15,5,12,1),
(10,6,4,'Small',0.0000,15,6,13,1),
(15,7,5,'Small',0.0000,25,7,15,1),
(16,8,4,'Beef',6.9500,27,5,12,1),
(17,8,4,'Large',5.0000,27,6,14,1),
(18,11,2,'Large',5.0000,32,2,4,1),
(19,15,4,'Fish',4.9500,42,5,11,1),
(20,15,4,'Small',0.0000,42,6,13,1),
(21,16,2,'Small',0.0000,43,2,3,1),
(22,17,3,'Beef',6.9500,44,3,7,1),
(23,17,3,'Large',5.0000,44,4,9,1),
(24,19,3,'Meat',4.9500,48,3,5,1),
(25,19,3,'Large',5.0000,48,4,9,1),
(26,20,3,'Fish',4.9500,50,3,6,1),
(27,20,3,'Small',0.0000,50,4,8,1),
(28,22,4,'Fish',4.9500,53,2,5,1),
(29,22,4,'Large',5.0000,53,3,8,1),
(30,24,3,'Beef',6.9500,55,2,6,1),
(31,24,3,'Small',0.0000,55,3,7,1),
(32,26,4,'Fish',4.9500,59,2,5,1),
(33,26,4,'Large',5.0000,59,3,8,1),
(34,26,9,'Small',0.0000,60,3,7,1),
(35,27,4,'Fish',4.9500,62,2,5,1),
(36,27,4,'Large',5.0000,62,3,8,1),
(37,27,2,'Small',0.0000,64,3,7,1),
(38,28,2,'Small',0.0000,65,2,3,1),
(39,39,3,'Fish',4.9500,94,3,6,1),
(40,41,10,'Fish',4.9500,101,8,18,1),
(41,41,10,'Diet Coke',0.0000,101,9,21,1),
(42,42,10,'Fish',4.9500,106,8,18,1),
(43,42,10,'Diet Coke',0.0000,106,9,21,1),
(44,43,10,'Meat',4.9500,109,8,17,1),
(45,43,10,'Coke',0.0000,109,9,20,1),
(46,45,10,'Beef',6.9500,115,8,19,1),
(47,45,10,'Coke',0.0000,115,9,20,1),
(48,50,5,'Small',0.0000,124,7,15,1),
(49,51,3,'Beef',6.9500,128,3,7,1),
(50,51,3,'Large',5.0000,128,4,9,1),
(51,52,2,'Small',0.0000,129,3,7,1),
(52,58,3,'Fish',4.9500,148,3,6,1),
(53,58,3,'Large',5.0000,148,4,9,1),
(54,61,4,'Meat',4.9500,155,2,4,1),
(55,61,4,'Small',0.0000,155,3,7,1),
(57,68,3,'Meat',4.9500,177,2,4,1),
(58,68,3,'Large',5.0000,177,3,8,1),
(59,69,10,'Meat',4.9500,178,2,4,1),
(60,69,10,'Coke',0.0000,178,4,9,1),
(61,69,1,'Diet Coke',0.0000,179,4,10,1),
(62,71,10,'Fish',4.9500,185,8,18,1),
(63,71,10,'Coke',0.0000,185,9,20,1),
(66,82,5,'Large',5.0000,218,7,16,1),
(67,86,10,'Meat',4.9500,226,2,4,1),
(68,86,10,'Diet Coke',0.0000,226,4,10,1),
(69,87,3,'Fish',4.9500,228,2,5,1),
(70,87,3,'Large',5.0000,228,3,8,1),
(71,97,4,'Fish',4.9500,245,2,5,1),
(72,97,4,'Small',0.0000,245,3,7,1),
(75,98,4,'Fish',4.9500,249,5,11,1),
(76,98,4,'Large',5.0000,249,6,14,1),
(79,99,4,'Fish',4.9500,253,5,11,1),
(80,99,4,'Large',5.0000,253,6,14,1),
(83,100,4,'Fish',4.9500,257,5,11,1),
(84,100,4,'Large',5.0000,257,6,14,1),
(92,101,4,'Fish',4.9500,265,5,11,1),
(93,101,4,'Large',5.0000,265,6,14,1),
(94,102,4,'Fish',4.9500,267,5,11,1),
(95,102,4,'Large',5.0000,267,6,14,1),
(96,103,4,'Fish',4.9500,269,5,11,1),
(97,103,4,'Large',5.0000,269,6,14,1),
(103,106,3,'Fish',4.9500,286,3,6,1),
(104,106,3,'Large',5.0000,286,4,9,1),
(108,107,2,'Small',0.0000,289,2,3,1),
(109,107,3,'Fish',4.9500,290,3,6,1),
(110,107,3,'Small',0.0000,290,4,8,1),
(111,109,3,'Fish',4.9500,292,2,5,1),
(112,109,3,'Large',5.0000,292,3,8,1),
(117,120,1,'Coke',0.0000,318,1,1,1),
(118,120,2,'Small',0.0000,319,2,3,1),
(122,121,2,'Small',0.0000,322,2,3,1),
(123,121,3,'Fish',4.9500,323,3,6,1),
(124,121,3,'Large',5.0000,323,4,9,1),
(127,122,2,'Small',0.0000,326,2,3,1),
(128,122,3,'Fish',4.9500,327,3,6,1),
(129,122,3,'Large',5.0000,327,4,9,1),
(132,123,3,'Fish',4.9500,330,3,6,1),
(133,123,3,'Large',5.0000,330,4,9,1),
(136,124,3,'Fish',4.9500,334,3,6,1),
(137,124,3,'Large',5.0000,334,4,9,1),
(139,125,5,'Small',0.0000,338,7,15,1),
(140,128,3,'Fish',4.9500,352,2,5,1),
(141,128,3,'Small',0.0000,352,3,7,1),
(144,130,4,'Meat',4.9500,358,2,4,1),
(145,130,4,'Small',0.0000,358,3,7,1),
(148,137,4,'Fish',4.9500,386,2,5,1),
(149,137,4,'Large',5.0000,386,3,8,1),
(150,143,5,'Large',5.0000,392,3,8,1),
(151,144,5,'Large',5.0000,393,3,8,1),
(152,156,10,'Beef',6.9500,438,2,6,1),
(153,156,10,'Diet Coke',0.0000,438,4,10,1),
(154,166,10,'Fish',4.9500,448,2,5,1),
(155,166,10,'Diet Coke',0.0000,448,4,10,1),
(156,167,10,'Meat',4.9500,449,2,4,1),
(157,167,10,'Diet Coke',0.0000,449,4,10,1),
(158,167,10,'Fish',4.9500,449,2,5,1),
(159,167,10,'Coke',0.0000,449,4,9,1),
(160,168,10,'Meat',4.9500,451,2,4,1),
(161,168,10,'Coke',0.0000,451,4,9,1),
(162,168,10,'Fish',4.9500,451,2,5,1),
(163,168,10,'Diet Coke',0.0000,451,4,10,1),
(164,171,10,'Meat',4.9500,458,2,4,1),
(165,171,10,'Coke',0.0000,458,4,9,1),
(166,171,10,'Fish',4.9500,458,2,5,1),
(167,171,10,'Diet Coke',0.0000,458,4,10,1),
(168,172,10,'Meat',4.9500,460,2,4,1),
(169,172,10,'Coke',0.0000,460,4,9,1),
(170,172,10,'Fish',4.9500,460,2,5,1),
(171,172,10,'Diet Coke',0.0000,460,4,10,1),
(172,173,10,'Meat',4.9500,462,2,4,1),
(173,173,10,'Coke',0.0000,462,4,9,1),
(174,173,4,'Meat',4.9500,463,2,4,1),
(175,173,4,'Small',0.0000,463,3,7,1),
(176,175,10,'Meat',4.9500,467,2,4,1),
(177,175,10,'Diet Coke',0.0000,467,4,10,1),
(178,175,10,'Beef',6.9500,467,2,6,1),
(179,175,10,'Coke',0.0000,467,4,9,1),
(180,176,10,'Meat',4.9500,470,2,4,1),
(181,176,10,'Coke',0.0000,470,4,9,1),
(182,176,10,'Beef',6.9500,470,2,6,1),
(183,176,10,'Diet Coke',0.0000,470,4,10,1),
(184,176,10,'Meat',4.9500,470,2,4,1),
(185,176,10,'Coke',0.0000,470,4,9,1),
(186,177,10,'Meat',4.9500,473,2,4,1),
(187,177,10,'Coke',0.0000,473,4,9,1),
(188,177,10,'Meat',4.9500,473,2,4,1),
(189,177,10,'Coke',0.0000,473,4,9,1),
(190,177,10,'Fish',4.9500,473,2,5,1),
(191,177,10,'Diet Coke',0.0000,473,4,10,1),
(192,181,5,'Meat',4.9500,483,2,4,1),
(193,182,3,'Beef',6.9500,484,2,6,1),
(194,182,3,'Small',0.0000,484,3,7,1),
(195,182,5,'Small',0.0000,485,3,7,1),
(196,183,2,'Small',0.0000,486,3,7,5),
(197,183,5,'Large',5.0000,487,3,8,1),
(198,183,10,'Fish',4.9500,488,2,5,1),
(199,183,10,'Beef',6.9500,488,2,6,1),
(200,183,10,'Coke',0.0000,488,4,9,1),
(201,184,2,'Small',0.0000,490,3,7,2),
(202,184,10,'Meat',4.9500,491,2,4,1),
(203,184,10,'Beef',6.9500,491,2,6,1),
(204,184,10,'Coke',0.0000,491,4,9,1),
(205,185,1,'Coke',0.0000,492,4,9,3),
(206,185,5,'Small',0.0000,493,3,7,1),
(207,186,4,'Meat',4.9500,496,2,4,1),
(208,186,4,'Beef',6.9500,496,2,6,1),
(209,186,4,'Small',0.0000,496,3,7,1),
(210,186,2,'Large',5.0000,497,3,8,2),
(211,187,3,'Meat',4.9500,499,2,4,1),
(212,187,3,'Small',0.0000,499,3,7,1),
(213,187,5,'Small',0.0000,501,3,7,1),
(214,188,3,'Meat',4.9500,502,2,4,1),
(215,188,3,'Fish',4.9500,502,2,5,1),
(216,188,3,'Beef',6.9500,502,2,6,1),
(217,188,3,'Small',0.0000,502,3,7,1),
(218,188,10,'Diet Coke',0.0000,504,4,10,1),
(219,189,4,'Meat',4.9500,505,2,4,1),
(220,189,4,'Beef',6.9500,505,2,6,1),
(221,189,4,'Small',0.0000,505,3,7,1),
(222,209,10,'Beef',6.9500,536,8,6,1),
(223,212,10,'Beef',6.9500,544,8,6,1),
(224,212,10,'Coke',0.0000,544,9,9,1),
(225,216,3,'Large',5.0000,553,4,8,1),
(226,216,3,'Fish',4.9500,553,3,5,1),
(227,219,2,'Small',0.0000,565,3,7,1),
(228,220,2,'Small',0.0000,567,3,7,3),
(229,224,2,'Large',5.0000,583,2,8,1),
(230,225,3,'Meat',4.9500,584,3,4,1),
(231,225,5,'Small',0.0000,587,7,7,1),
(232,226,2,'Large',5.0000,588,2,8,1),
(233,229,3,'Fish',4.9500,600,3,5,1),
(234,229,4,'Fish',4.9500,601,5,5,1),
(235,230,5,'Small',0.0000,604,7,7,1),
(236,230,10,'Coke',0.0000,605,9,9,1),
(237,231,3,'Meat',4.9500,606,3,4,1),
(238,232,4,'Meat',4.9500,608,5,4,1),
(239,232,5,'Large',5.0000,609,7,8,1),
(240,232,2,'Small',0.0000,610,2,7,1),
(241,233,5,'Small',0.0000,612,7,7,1),
(242,233,10,'Meat',4.9500,613,8,4,1),
(243,234,5,'Small',0.0000,615,7,7,1),
(244,234,10,'Meat',4.9500,616,8,4,1),
(246,298,2,'Small',0.0000,711,2,7,1),
(247,298,4,'Meat',4.9500,712,5,4,1),
(248,298,4,'Large',5.0000,712,6,8,1),
(249,300,10,'Beef',6.9500,713,8,6,2),
(250,300,3,'Beef',6.9500,714,3,6,3),
(251,307,2,'Large',5.0000,727,2,8,1),
(252,312,4,'Fish',4.9500,736,5,5,1),
(253,312,4,'Large',5.0000,736,6,8,1);
/*!40000 ALTER TABLE `ti_order_menu_options` ENABLE KEYS */;
UNLOCK TABLES;

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
) ENGINE=InnoDB AUTO_INCREMENT=739 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ti_order_menus`
--

LOCK TABLES `ti_order_menus` WRITE;
/*!40000 ALTER TABLE `ti_order_menus` DISABLE KEYS */;
INSERT INTO `ti_order_menus` VALUES
(1,1,6,'Whole catfish with rice and vegetables',2,13.9900,27.9800,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}','',0,NULL,NULL),
(2,1,9,'Salad Cesar',1,11.9900,11.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}','',0,NULL,NULL),
(3,1,12,'Boiled Plantain',1,9.9900,9.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}','',0,NULL,NULL),
(4,2,4,'RICE AND DODO',1,11.9900,16.9400,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:2:{i:5;O:33:\"Igniter\\Flame\\Cart\\CartItemOption\":3:{s:2:\"id\";i:5;s:4:\"name\";s:5:\"Sides\";s:6:\"values\";O:39:\"Igniter\\Flame\\Cart\\CartItemOptionValues\":2:{s:8:\"\0*\0items\";a:1:{i:10;O:38:\"Igniter\\Flame\\Cart\\CartItemOptionValue\":4:{s:2:\"id\";i:10;s:4:\"name\";s:4:\"Meat\";s:3:\"qty\";i:1;s:5:\"price\";d:4.95;}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}}i:6;O:33:\"Igniter\\Flame\\Cart\\CartItemOption\":3:{s:2:\"id\";i:6;s:4:\"name\";s:4:\"Size\";s:6:\"values\";O:39:\"Igniter\\Flame\\Cart\\CartItemOptionValues\":2:{s:8:\"\0*\0items\";a:1:{i:13;O:38:\"Igniter\\Flame\\Cart\\CartItemOptionValue\":4:{s:2:\"id\";i:13;s:4:\"name\";s:5:\"Small\";s:3:\"qty\";i:1;s:5:\"price\";d:0;}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}','',0,NULL,NULL),
(5,2,9,'Salad Cesar',1,11.9900,11.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(6,3,9,'Salad Cesar',1,11.9900,11.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(7,3,8,'Seafood Salad',1,5.9900,5.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(8,3,6,'Whole catfish with rice and vegetables',1,13.9900,13.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(9,3,4,'RICE AND DODO',1,11.9900,16.9400,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:2:{i:5;O:33:\"Igniter\\Flame\\Cart\\CartItemOption\":3:{s:2:\"id\";i:5;s:4:\"name\";s:5:\"Sides\";s:6:\"values\";O:39:\"Igniter\\Flame\\Cart\\CartItemOptionValues\":2:{s:8:\"\0*\0items\";a:1:{i:10;O:38:\"Igniter\\Flame\\Cart\\CartItemOptionValue\":4:{s:2:\"id\";i:10;s:4:\"name\";s:4:\"Meat\";s:3:\"qty\";i:1;s:5:\"price\";d:4.95;}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}}i:6;O:33:\"Igniter\\Flame\\Cart\\CartItemOption\":3:{s:2:\"id\";i:6;s:4:\"name\";s:4:\"Size\";s:6:\"values\";O:39:\"Igniter\\Flame\\Cart\\CartItemOptionValues\":2:{s:8:\"\0*\0items\";a:1:{i:13;O:38:\"Igniter\\Flame\\Cart\\CartItemOptionValue\":4:{s:2:\"id\";i:13;s:4:\"name\";s:5:\"Small\";s:3:\"qty\";i:1;s:5:\"price\";d:0;}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}','',0,NULL,NULL),
(10,4,3,'ATA RICE',1,12.0000,18.9500,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:2:{i:3;O:33:\"Igniter\\Flame\\Cart\\CartItemOption\":3:{s:2:\"id\";i:3;s:4:\"name\";s:5:\"Sides\";s:6:\"values\";O:39:\"Igniter\\Flame\\Cart\\CartItemOptionValues\":2:{s:8:\"\0*\0items\";a:1:{i:7;O:38:\"Igniter\\Flame\\Cart\\CartItemOptionValue\":4:{s:2:\"id\";i:7;s:4:\"name\";s:4:\"Beef\";s:3:\"qty\";i:1;s:5:\"price\";d:6.95;}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}}i:4;O:33:\"Igniter\\Flame\\Cart\\CartItemOption\":3:{s:2:\"id\";i:4;s:4:\"name\";s:4:\"Size\";s:6:\"values\";O:39:\"Igniter\\Flame\\Cart\\CartItemOptionValues\":2:{s:8:\"\0*\0items\";a:1:{i:8;O:38:\"Igniter\\Flame\\Cart\\CartItemOptionValue\":4:{s:2:\"id\";i:8;s:4:\"name\";s:5:\"Small\";s:3:\"qty\";i:1;s:5:\"price\";d:0;}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}','',0,NULL,NULL),
(11,4,9,'Salad Cesar',1,11.9900,11.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(12,4,12,'Boiled Plantain',1,9.9900,9.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(13,5,2,'SCOTCH EGG',1,2.0000,2.0000,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:1:{i:2;O:33:\"Igniter\\Flame\\Cart\\CartItemOption\":3:{s:2:\"id\";i:2;s:4:\"name\";s:4:\"Size\";s:6:\"values\";O:39:\"Igniter\\Flame\\Cart\\CartItemOptionValues\":2:{s:8:\"\0*\0items\";a:1:{i:3;O:38:\"Igniter\\Flame\\Cart\\CartItemOptionValue\":4:{s:2:\"id\";i:3;s:4:\"name\";s:5:\"Small\";s:3:\"qty\";i:1;s:5:\"price\";d:0;}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}','',0,NULL,NULL),
(14,5,3,'ATA RICE',1,12.0000,16.9500,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:1:{i:3;O:33:\"Igniter\\Flame\\Cart\\CartItemOption\":3:{s:2:\"id\";i:3;s:4:\"name\";s:5:\"Sides\";s:6:\"values\";O:39:\"Igniter\\Flame\\Cart\\CartItemOptionValues\":2:{s:8:\"\0*\0items\";a:1:{i:6;O:38:\"Igniter\\Flame\\Cart\\CartItemOptionValue\":4:{s:2:\"id\";i:6;s:4:\"name\";s:4:\"Fish\";s:3:\"qty\";i:1;s:5:\"price\";d:4.95;}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}','',0,NULL,NULL),
(15,6,4,'RICE AND DODO',1,11.9900,18.9400,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:2:{i:5;O:33:\"Igniter\\Flame\\Cart\\CartItemOption\":3:{s:2:\"id\";i:5;s:4:\"name\";s:5:\"Sides\";s:6:\"values\";O:39:\"Igniter\\Flame\\Cart\\CartItemOptionValues\":2:{s:8:\"\0*\0items\";a:1:{i:12;O:38:\"Igniter\\Flame\\Cart\\CartItemOptionValue\":4:{s:2:\"id\";i:12;s:4:\"name\";s:4:\"Beef\";s:3:\"qty\";i:1;s:5:\"price\";d:6.95;}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}}i:6;O:33:\"Igniter\\Flame\\Cart\\CartItemOption\":3:{s:2:\"id\";i:6;s:4:\"name\";s:4:\"Size\";s:6:\"values\";O:39:\"Igniter\\Flame\\Cart\\CartItemOptionValues\":2:{s:8:\"\0*\0items\";a:1:{i:13;O:38:\"Igniter\\Flame\\Cart\\CartItemOptionValue\":4:{s:2:\"id\";i:13;s:4:\"name\";s:5:\"Small\";s:3:\"qty\";i:1;s:5:\"price\";d:0;}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}','',0,NULL,NULL),
(16,6,6,'Whole catfish with rice and vegetables',1,13.9900,13.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(25,7,5,'Special Shrimp Deluxe',1,12.9900,12.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:1:{i:7;O:33:\"Igniter\\Flame\\Cart\\CartItemOption\":3:{s:2:\"id\";i:7;s:4:\"name\";s:4:\"Size\";s:6:\"values\";O:39:\"Igniter\\Flame\\Cart\\CartItemOptionValues\":2:{s:8:\"\0*\0items\";a:1:{i:15;O:38:\"Igniter\\Flame\\Cart\\CartItemOptionValue\":4:{s:2:\"id\";i:15;s:4:\"name\";s:5:\"Small\";s:3:\"qty\";i:1;s:5:\"price\";d:0;}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}','',0,NULL,NULL),
(26,7,9,'Salad Cesar',1,11.9900,11.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(27,8,4,'RICE AND DODO',1,11.9900,23.9400,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:2:{i:5;O:33:\"Igniter\\Flame\\Cart\\CartItemOption\":3:{s:2:\"id\";i:5;s:4:\"name\";s:5:\"Sides\";s:6:\"values\";O:39:\"Igniter\\Flame\\Cart\\CartItemOptionValues\":2:{s:8:\"\0*\0items\";a:1:{i:12;O:38:\"Igniter\\Flame\\Cart\\CartItemOptionValue\":4:{s:2:\"id\";i:12;s:4:\"name\";s:4:\"Beef\";s:3:\"qty\";i:1;s:5:\"price\";d:6.95;}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}}i:6;O:33:\"Igniter\\Flame\\Cart\\CartItemOption\":3:{s:2:\"id\";i:6;s:4:\"name\";s:4:\"Size\";s:6:\"values\";O:39:\"Igniter\\Flame\\Cart\\CartItemOptionValues\":2:{s:8:\"\0*\0items\";a:1:{i:14;O:38:\"Igniter\\Flame\\Cart\\CartItemOptionValue\":4:{s:2:\"id\";i:14;s:4:\"name\";s:5:\"Large\";s:3:\"qty\";i:1;s:5:\"price\";d:5;}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}','',0,NULL,NULL),
(28,8,7,'Simple Salad',1,8.9900,8.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(29,9,9,'Salad Cesar',1,11.9900,11.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(30,9,11,'YAM PORRIDGE',1,9.9900,9.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(31,10,9,'Salad Cesar',1,11.9900,11.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(32,11,2,'SCOTCH EGG',1,2.0000,7.0000,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:1:{i:2;O:33:\"Igniter\\Flame\\Cart\\CartItemOption\":3:{s:2:\"id\";i:2;s:4:\"name\";s:4:\"Size\";s:6:\"values\";O:39:\"Igniter\\Flame\\Cart\\CartItemOptionValues\":2:{s:8:\"\0*\0items\";a:1:{i:4;O:38:\"Igniter\\Flame\\Cart\\CartItemOptionValue\":4:{s:2:\"id\";i:4;s:4:\"name\";s:5:\"Large\";s:3:\"qty\";i:1;s:5:\"price\";d:5;}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}','',0,NULL,NULL),
(33,11,9,'Salad Cesar',1,11.9900,11.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(34,12,9,'Salad Cesar',1,11.9900,11.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(35,12,11,'YAM PORRIDGE',1,9.9900,9.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(36,13,9,'Salad Cesar',1,11.9900,11.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(37,13,11,'YAM PORRIDGE',1,9.9900,9.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(38,14,9,'Salad Cesar',1,11.9900,11.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(39,14,11,'YAM PORRIDGE',1,9.9900,9.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(40,15,9,'Salad Cesar',2,11.9900,23.9800,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(41,15,11,'YAM PORRIDGE',1,9.9900,9.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(42,15,4,'RICE AND DODO',1,11.9900,16.9400,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:2:{i:5;O:33:\"Igniter\\Flame\\Cart\\CartItemOption\":3:{s:2:\"id\";i:5;s:4:\"name\";s:5:\"Sides\";s:6:\"values\";O:39:\"Igniter\\Flame\\Cart\\CartItemOptionValues\":2:{s:8:\"\0*\0items\";a:1:{i:11;O:38:\"Igniter\\Flame\\Cart\\CartItemOptionValue\":4:{s:2:\"id\";i:11;s:4:\"name\";s:4:\"Fish\";s:3:\"qty\";i:1;s:5:\"price\";d:4.95;}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}}i:6;O:33:\"Igniter\\Flame\\Cart\\CartItemOption\":3:{s:2:\"id\";i:6;s:4:\"name\";s:4:\"Size\";s:6:\"values\";O:39:\"Igniter\\Flame\\Cart\\CartItemOptionValues\":2:{s:8:\"\0*\0items\";a:1:{i:13;O:38:\"Igniter\\Flame\\Cart\\CartItemOptionValue\":4:{s:2:\"id\";i:13;s:4:\"name\";s:5:\"Small\";s:3:\"qty\";i:1;s:5:\"price\";d:0;}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}','',0,NULL,NULL),
(43,16,2,'SCOTCH EGG',1,2.0000,2.0000,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:1:{i:2;O:33:\"Igniter\\Flame\\Cart\\CartItemOption\":3:{s:2:\"id\";i:2;s:4:\"name\";s:4:\"Size\";s:6:\"values\";O:39:\"Igniter\\Flame\\Cart\\CartItemOptionValues\":2:{s:8:\"\0*\0items\";a:1:{i:3;O:38:\"Igniter\\Flame\\Cart\\CartItemOptionValue\":4:{s:2:\"id\";i:3;s:4:\"name\";s:5:\"Small\";s:3:\"qty\";i:1;s:5:\"price\";d:0;}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}','',0,NULL,NULL),
(44,17,3,'ATA RICE',1,12.0000,23.9500,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:2:{i:3;O:33:\"Igniter\\Flame\\Cart\\CartItemOption\":3:{s:2:\"id\";i:3;s:4:\"name\";s:5:\"Sides\";s:6:\"values\";O:39:\"Igniter\\Flame\\Cart\\CartItemOptionValues\":2:{s:8:\"\0*\0items\";a:1:{i:7;O:38:\"Igniter\\Flame\\Cart\\CartItemOptionValue\":4:{s:2:\"id\";i:7;s:4:\"name\";s:4:\"Beef\";s:3:\"qty\";i:1;s:5:\"price\";d:6.95;}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}}i:4;O:33:\"Igniter\\Flame\\Cart\\CartItemOption\":3:{s:2:\"id\";i:4;s:4:\"name\";s:4:\"Size\";s:6:\"values\";O:39:\"Igniter\\Flame\\Cart\\CartItemOptionValues\":2:{s:8:\"\0*\0items\";a:1:{i:9;O:38:\"Igniter\\Flame\\Cart\\CartItemOptionValue\":4:{s:2:\"id\";i:9;s:4:\"name\";s:5:\"Large\";s:3:\"qty\";i:1;s:5:\"price\";d:5;}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}','',0,NULL,NULL),
(45,17,8,'Seafood Salad',1,5.9900,5.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(46,18,6,'Whole catfish with rice and vegetables',1,13.9900,13.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(47,18,9,'Salad Cesar',1,11.9900,11.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(48,19,3,'ATA RICE',1,12.0000,21.9500,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:2:{i:3;O:33:\"Igniter\\Flame\\Cart\\CartItemOption\":3:{s:2:\"id\";i:3;s:4:\"name\";s:5:\"Sides\";s:6:\"values\";O:39:\"Igniter\\Flame\\Cart\\CartItemOptionValues\":2:{s:8:\"\0*\0items\";a:1:{i:5;O:38:\"Igniter\\Flame\\Cart\\CartItemOptionValue\":4:{s:2:\"id\";i:5;s:4:\"name\";s:4:\"Meat\";s:3:\"qty\";i:1;s:5:\"price\";d:4.95;}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}}i:4;O:33:\"Igniter\\Flame\\Cart\\CartItemOption\":3:{s:2:\"id\";i:4;s:4:\"name\";s:4:\"Size\";s:6:\"values\";O:39:\"Igniter\\Flame\\Cart\\CartItemOptionValues\":2:{s:8:\"\0*\0items\";a:1:{i:9;O:38:\"Igniter\\Flame\\Cart\\CartItemOptionValue\":4:{s:2:\"id\";i:9;s:4:\"name\";s:5:\"Large\";s:3:\"qty\";i:1;s:5:\"price\";d:5;}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}','',0,NULL,NULL),
(49,19,9,'Salad Cesar',1,11.9900,11.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(50,20,3,'ATA RICE',1,12.0000,16.9500,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:2:{i:3;O:33:\"Igniter\\Flame\\Cart\\CartItemOption\":3:{s:2:\"id\";i:3;s:4:\"name\";s:5:\"Sides\";s:6:\"values\";O:39:\"Igniter\\Flame\\Cart\\CartItemOptionValues\":2:{s:8:\"\0*\0items\";a:1:{i:6;O:38:\"Igniter\\Flame\\Cart\\CartItemOptionValue\":4:{s:2:\"id\";i:6;s:4:\"name\";s:4:\"Fish\";s:3:\"qty\";i:1;s:5:\"price\";d:4.95;}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}}i:4;O:33:\"Igniter\\Flame\\Cart\\CartItemOption\":3:{s:2:\"id\";i:4;s:4:\"name\";s:4:\"Size\";s:6:\"values\";O:39:\"Igniter\\Flame\\Cart\\CartItemOptionValues\":2:{s:8:\"\0*\0items\";a:1:{i:8;O:38:\"Igniter\\Flame\\Cart\\CartItemOptionValue\":4:{s:2:\"id\";i:8;s:4:\"name\";s:5:\"Small\";s:3:\"qty\";i:1;s:5:\"price\";d:0;}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}','',0,NULL,NULL),
(51,20,9,'Salad Cesar',1,11.9900,11.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(52,21,9,'Salad Cesar',1,11.9900,11.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"',NULL,0,NULL,NULL),
(53,22,4,'RICE AND DODO',1,11.9900,11.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"',NULL,0,NULL,NULL),
(54,23,9,'Salad Cesar',1,11.9900,11.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"',NULL,0,NULL,NULL),
(55,24,3,'ATA RICE',1,12.0000,12.0000,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"',NULL,0,NULL,NULL),
(56,25,2,'SCOTCH EGG',1,2.0000,2.0000,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"',NULL,0,NULL,NULL),
(57,25,9,'Salad Cesar',1,11.9900,11.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"',NULL,0,NULL,NULL),
(58,25,4,'RICE AND DODO',1,11.9900,11.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"',NULL,0,NULL,NULL),
(59,26,4,'RICE AND DODO',1,11.9900,21.9400,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"',NULL,0,NULL,NULL),
(60,26,9,'Salad Cesar',1,11.9900,11.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"',NULL,0,NULL,NULL),
(61,26,2,'SCOTCH EGG',1,2.0000,2.0000,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"',NULL,0,NULL,NULL),
(62,27,4,'RICE AND DODO',1,11.9900,21.9400,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"',NULL,0,NULL,NULL),
(63,27,9,'Salad Cesar',1,11.9900,11.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"',NULL,0,NULL,NULL),
(64,27,2,'SCOTCH EGG',1,2.0000,2.0000,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"',NULL,0,NULL,NULL),
(65,28,2,'SCOTCH EGG',1,2.0000,2.0000,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:1:{i:2;O:33:\"Igniter\\Flame\\Cart\\CartItemOption\":3:{s:2:\"id\";i:2;s:4:\"name\";s:4:\"Size\";s:6:\"values\";O:39:\"Igniter\\Flame\\Cart\\CartItemOptionValues\":2:{s:8:\"\0*\0items\";a:1:{i:3;O:38:\"Igniter\\Flame\\Cart\\CartItemOptionValue\":4:{s:2:\"id\";i:3;s:4:\"name\";s:5:\"Small\";s:3:\"qty\";i:1;s:5:\"price\";d:0;}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}','',0,NULL,NULL),
(66,28,9,'Salad Cesar',1,11.9900,11.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(67,29,9,'Salad Cesar',1,11.9900,11.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(68,29,8,'Seafood Salad',1,5.9900,5.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(69,30,9,'Salad Cesar',1,11.9900,11.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(70,30,8,'Seafood Salad',1,5.9900,5.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(71,30,7,'Simple Salad',1,8.9900,8.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(72,31,9,'Salad Cesar',1,11.9900,11.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(73,31,8,'Seafood Salad',1,5.9900,5.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(74,31,7,'Simple Salad',1,8.9900,8.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(75,32,9,'Salad Cesar',2,11.9900,23.9800,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(76,32,8,'Seafood Salad',1,5.9900,5.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(77,32,7,'Simple Salad',2,8.9900,17.9800,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(78,33,9,'Salad Cesar',1,11.9900,11.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(79,33,7,'Simple Salad',1,8.9900,8.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(80,34,9,'Salad Cesar',1,11.9900,11.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(81,34,8,'Seafood Salad',1,5.9900,5.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(82,34,7,'Simple Salad',1,8.9900,8.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(83,35,9,'Salad Cesar',1,11.9900,11.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(84,35,8,'Seafood Salad',1,5.9900,5.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(85,35,7,'Simple Salad',1,8.9900,8.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(86,36,9,'Salad Cesar',1,11.9900,11.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(87,36,8,'Seafood Salad',1,5.9900,5.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(88,37,9,'Salad Cesar',1,11.9900,11.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(89,37,8,'Seafood Salad',1,5.9900,5.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(90,37,7,'Simple Salad',1,8.9900,8.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(91,38,9,'Salad Cesar',1,11.9900,11.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(92,38,8,'Seafood Salad',1,5.9900,5.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(93,38,12,'Boiled Plantain',1,9.9900,9.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(94,39,3,'ATA RICE',1,12.0000,16.9500,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:1:{i:3;O:33:\"Igniter\\Flame\\Cart\\CartItemOption\":3:{s:2:\"id\";i:3;s:4:\"name\";s:5:\"Sides\";s:6:\"values\";O:39:\"Igniter\\Flame\\Cart\\CartItemOptionValues\":2:{s:8:\"\0*\0items\";a:1:{i:6;O:38:\"Igniter\\Flame\\Cart\\CartItemOptionValue\":4:{s:2:\"id\";i:6;s:4:\"name\";s:4:\"Fish\";s:3:\"qty\";i:1;s:5:\"price\";d:4.95;}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}','',0,NULL,NULL),
(95,40,8,'Seafood Salad',1,5.9900,5.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(96,40,12,'Boiled Plantain',1,9.9900,9.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(97,41,8,'Seafood Salad',2,5.9900,11.9800,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(98,41,12,'Boiled Plantain',1,9.9900,9.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(99,41,9,'Salad Cesar',1,11.9900,11.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(100,41,11,'YAM PORRIDGE',1,9.9900,9.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(101,41,10,'AMALA',1,11.9900,16.9400,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:2:{i:8;O:33:\"Igniter\\Flame\\Cart\\CartItemOption\":3:{s:2:\"id\";i:8;s:4:\"name\";s:5:\"Sides\";s:6:\"values\";O:39:\"Igniter\\Flame\\Cart\\CartItemOptionValues\":2:{s:8:\"\0*\0items\";a:1:{i:18;O:38:\"Igniter\\Flame\\Cart\\CartItemOptionValue\":4:{s:2:\"id\";i:18;s:4:\"name\";s:4:\"Fish\";s:3:\"qty\";i:1;s:5:\"price\";d:4.95;}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}}i:9;O:33:\"Igniter\\Flame\\Cart\\CartItemOption\":3:{s:2:\"id\";i:9;s:4:\"name\";s:6:\"Drinks\";s:6:\"values\";O:39:\"Igniter\\Flame\\Cart\\CartItemOptionValues\":2:{s:8:\"\0*\0items\";a:1:{i:21;O:38:\"Igniter\\Flame\\Cart\\CartItemOptionValue\":4:{s:2:\"id\";i:21;s:4:\"name\";s:9:\"Diet Coke\";s:3:\"qty\";i:1;s:5:\"price\";d:0;}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}','',0,NULL,NULL),
(102,42,8,'Seafood Salad',2,5.9900,11.9800,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(103,42,12,'Boiled Plantain',1,9.9900,9.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(104,42,9,'Salad Cesar',1,11.9900,11.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(105,42,11,'YAM PORRIDGE',1,9.9900,9.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(106,42,10,'AMALA',1,11.9900,16.9400,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:2:{i:8;O:33:\"Igniter\\Flame\\Cart\\CartItemOption\":3:{s:2:\"id\";i:8;s:4:\"name\";s:5:\"Sides\";s:6:\"values\";O:39:\"Igniter\\Flame\\Cart\\CartItemOptionValues\":2:{s:8:\"\0*\0items\";a:1:{i:18;O:38:\"Igniter\\Flame\\Cart\\CartItemOptionValue\":4:{s:2:\"id\";i:18;s:4:\"name\";s:4:\"Fish\";s:3:\"qty\";i:1;s:5:\"price\";d:4.95;}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}}i:9;O:33:\"Igniter\\Flame\\Cart\\CartItemOption\":3:{s:2:\"id\";i:9;s:4:\"name\";s:6:\"Drinks\";s:6:\"values\";O:39:\"Igniter\\Flame\\Cart\\CartItemOptionValues\":2:{s:8:\"\0*\0items\";a:1:{i:21;O:38:\"Igniter\\Flame\\Cart\\CartItemOptionValue\":4:{s:2:\"id\";i:21;s:4:\"name\";s:9:\"Diet Coke\";s:3:\"qty\";i:1;s:5:\"price\";d:0;}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}','',0,NULL,NULL),
(107,43,12,'Boiled Plantain',1,9.9900,9.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(108,43,11,'YAM PORRIDGE',1,9.9900,9.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(109,43,10,'AMALA',1,11.9900,16.9400,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:2:{i:8;O:33:\"Igniter\\Flame\\Cart\\CartItemOption\":3:{s:2:\"id\";i:8;s:4:\"name\";s:5:\"Sides\";s:6:\"values\";O:39:\"Igniter\\Flame\\Cart\\CartItemOptionValues\":2:{s:8:\"\0*\0items\";a:1:{i:17;O:38:\"Igniter\\Flame\\Cart\\CartItemOptionValue\":4:{s:2:\"id\";i:17;s:4:\"name\";s:4:\"Meat\";s:3:\"qty\";i:1;s:5:\"price\";d:4.95;}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}}i:9;O:33:\"Igniter\\Flame\\Cart\\CartItemOption\":3:{s:2:\"id\";i:9;s:4:\"name\";s:6:\"Drinks\";s:6:\"values\";O:39:\"Igniter\\Flame\\Cart\\CartItemOptionValues\":2:{s:8:\"\0*\0items\";a:1:{i:20;O:38:\"Igniter\\Flame\\Cart\\CartItemOptionValue\":4:{s:2:\"id\";i:20;s:4:\"name\";s:4:\"Coke\";s:3:\"qty\";i:1;s:5:\"price\";d:0;}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}','',0,NULL,NULL),
(110,44,12,'Boiled Plantain',1,9.9900,9.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(111,44,9,'Salad Cesar',1,11.9900,11.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(112,44,8,'Seafood Salad',1,5.9900,5.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(113,45,12,'Boiled Plantain',1,9.9900,9.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(114,45,11,'YAM PORRIDGE',1,9.9900,9.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(115,45,10,'AMALA',1,11.9900,18.9400,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:2:{i:8;O:33:\"Igniter\\Flame\\Cart\\CartItemOption\":3:{s:2:\"id\";i:8;s:4:\"name\";s:5:\"Sides\";s:6:\"values\";O:39:\"Igniter\\Flame\\Cart\\CartItemOptionValues\":2:{s:8:\"\0*\0items\";a:1:{i:19;O:38:\"Igniter\\Flame\\Cart\\CartItemOptionValue\":4:{s:2:\"id\";i:19;s:4:\"name\";s:4:\"Beef\";s:3:\"qty\";i:1;s:5:\"price\";d:6.95;}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}}i:9;O:33:\"Igniter\\Flame\\Cart\\CartItemOption\":3:{s:2:\"id\";i:9;s:4:\"name\";s:6:\"Drinks\";s:6:\"values\";O:39:\"Igniter\\Flame\\Cart\\CartItemOptionValues\":2:{s:8:\"\0*\0items\";a:1:{i:20;O:38:\"Igniter\\Flame\\Cart\\CartItemOptionValue\":4:{s:2:\"id\";i:20;s:4:\"name\";s:4:\"Coke\";s:3:\"qty\";i:1;s:5:\"price\";d:0;}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}','',0,NULL,NULL),
(116,46,9,'Salad Cesar',2,11.9900,23.9800,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(117,47,8,'Seafood Salad',1,5.9900,5.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(118,47,11,'YAM PORRIDGE',1,9.9900,9.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(119,48,9,'Salad Cesar',1,11.9900,11.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(120,48,8,'Seafood Salad',1,5.9900,5.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(121,49,9,'Salad Cesar',1,11.9900,11.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(122,49,8,'Seafood Salad',1,5.9900,5.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(123,50,6,'Whole catfish with rice and vegetables',1,13.9900,13.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(124,50,5,'Special Shrimp Deluxe',1,12.9900,12.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:1:{i:7;O:33:\"Igniter\\Flame\\Cart\\CartItemOption\":3:{s:2:\"id\";i:7;s:4:\"name\";s:4:\"Size\";s:6:\"values\";O:39:\"Igniter\\Flame\\Cart\\CartItemOptionValues\":2:{s:8:\"\0*\0items\";a:1:{i:15;O:38:\"Igniter\\Flame\\Cart\\CartItemOptionValue\":4:{s:2:\"id\";i:15;s:4:\"name\";s:5:\"Small\";s:3:\"qty\";i:1;s:5:\"price\";d:0;}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}','',0,NULL,NULL),
(125,50,9,'Salad Cesar',1,11.9900,11.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(126,51,9,'Salad Cesar',1,11.9900,11.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(127,51,8,'Seafood Salad',1,5.9900,5.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(128,51,3,'ATA RICE',1,12.0000,23.9500,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:2:{i:3;O:33:\"Igniter\\Flame\\Cart\\CartItemOption\":3:{s:2:\"id\";i:3;s:4:\"name\";s:5:\"Sides\";s:6:\"values\";O:39:\"Igniter\\Flame\\Cart\\CartItemOptionValues\":2:{s:8:\"\0*\0items\";a:1:{i:7;O:38:\"Igniter\\Flame\\Cart\\CartItemOptionValue\":4:{s:2:\"id\";i:7;s:4:\"name\";s:4:\"Beef\";s:3:\"qty\";i:1;s:5:\"price\";d:6.95;}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}}i:4;O:33:\"Igniter\\Flame\\Cart\\CartItemOption\":3:{s:2:\"id\";i:4;s:4:\"name\";s:4:\"Size\";s:6:\"values\";O:39:\"Igniter\\Flame\\Cart\\CartItemOptionValues\":2:{s:8:\"\0*\0items\";a:1:{i:9;O:38:\"Igniter\\Flame\\Cart\\CartItemOptionValue\":4:{s:2:\"id\";i:9;s:4:\"name\";s:5:\"Large\";s:3:\"qty\";i:1;s:5:\"price\";d:5;}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}','',0,NULL,NULL),
(129,52,2,'SCOTCH EGG',1,2.0000,2.0000,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"',NULL,0,NULL,NULL),
(130,53,9,'Salad Cesar',1,11.9900,11.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(131,53,8,'Seafood Salad',1,5.9900,5.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(132,53,11,'YAM PORRIDGE',1,9.9900,9.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(133,54,9,'Salad Cesar',1,11.9900,11.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(134,54,8,'Seafood Salad',1,5.9900,5.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(135,54,11,'YAM PORRIDGE',1,9.9900,9.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(136,55,9,'Salad Cesar',1,11.9900,11.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(137,55,8,'Seafood Salad',1,5.9900,5.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(138,55,11,'YAM PORRIDGE',1,9.9900,9.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(139,56,9,'Salad Cesar',1,11.9900,11.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(140,56,8,'Seafood Salad',1,5.9900,5.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(141,56,11,'YAM PORRIDGE',1,9.9900,9.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(142,57,9,'Salad Cesar',1,11.9900,11.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(143,57,8,'Seafood Salad',1,5.9900,5.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(144,57,11,'YAM PORRIDGE',1,9.9900,9.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(145,58,9,'Salad Cesar',1,11.9900,11.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(146,58,8,'Seafood Salad',1,5.9900,5.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(147,58,11,'YAM PORRIDGE',1,9.9900,9.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(148,58,3,'ATA RICE',1,12.0000,21.9500,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:2:{i:3;O:33:\"Igniter\\Flame\\Cart\\CartItemOption\":3:{s:2:\"id\";i:3;s:4:\"name\";s:5:\"Sides\";s:6:\"values\";O:39:\"Igniter\\Flame\\Cart\\CartItemOptionValues\":2:{s:8:\"\0*\0items\";a:1:{i:6;O:38:\"Igniter\\Flame\\Cart\\CartItemOptionValue\":4:{s:2:\"id\";i:6;s:4:\"name\";s:4:\"Fish\";s:3:\"qty\";i:1;s:5:\"price\";d:4.95;}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}}i:4;O:33:\"Igniter\\Flame\\Cart\\CartItemOption\":3:{s:2:\"id\";i:4;s:4:\"name\";s:4:\"Size\";s:6:\"values\";O:39:\"Igniter\\Flame\\Cart\\CartItemOptionValues\":2:{s:8:\"\0*\0items\";a:1:{i:9;O:38:\"Igniter\\Flame\\Cart\\CartItemOptionValue\":4:{s:2:\"id\";i:9;s:4:\"name\";s:5:\"Large\";s:3:\"qty\";i:1;s:5:\"price\";d:5;}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}','',0,NULL,NULL),
(149,59,9,'Salad Cesar',1,11.9900,11.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(150,59,8,'Seafood Salad',1,5.9900,5.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(151,59,7,'Simple Salad',1,8.9900,8.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(152,60,9,'Salad Cesar',1,11.9900,11.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(153,60,8,'Seafood Salad',1,5.9900,5.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(154,60,11,'YAM PORRIDGE',1,9.9900,9.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(155,61,4,'RICE AND DODO',1,11.9900,16.9400,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"',NULL,0,NULL,NULL),
(156,61,9,'Salad Cesar',1,11.9900,11.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"',NULL,0,NULL,NULL),
(157,62,12,'Boiled Plantain',1,9.9900,9.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(158,62,11,'YAM PORRIDGE',1,9.9900,9.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(159,62,8,'Seafood Salad',1,5.9900,5.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(160,62,7,'Simple Salad',1,8.9900,8.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(163,63,12,'Boiled Plantain',1,9.9900,9.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(164,63,11,'YAM PORRIDGE',1,9.9900,9.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(165,63,8,'Seafood Salad',1,5.9900,5.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(166,63,7,'Simple Salad',1,8.9900,8.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(167,64,9,'Salad Cesar',1,11.9900,11.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(168,64,8,'Seafood Salad',1,5.9900,5.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(169,64,7,'Simple Salad',1,8.9900,8.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(170,65,9,'Salad Cesar',1,11.9900,11.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(171,65,8,'Seafood Salad',1,5.9900,5.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(172,65,7,'Simple Salad',1,8.9900,8.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(173,65,12,'Boiled Plantain',1,9.9900,9.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(174,66,7,'Simple Salad',1,8.9900,8.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"',NULL,0,NULL,NULL),
(175,67,7,'Simple Salad',1,8.9900,8.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"',NULL,0,NULL,NULL),
(176,68,7,'Simple Salad',1,8.9900,8.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"',NULL,0,NULL,NULL),
(177,68,3,'ATA RICE',1,12.0000,21.9500,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"',NULL,0,NULL,NULL),
(178,69,10,'AMALA',1,11.9900,16.9400,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"',NULL,0,NULL,NULL),
(179,69,1,'Puff-Puff',1,4.9900,4.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"',NULL,0,NULL,NULL),
(180,70,9,'Salad Cesar',1,11.9900,11.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(181,70,8,'Seafood Salad',1,5.9900,5.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(182,70,7,'Simple Salad',1,8.9900,8.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(183,71,12,'Boiled Plantain',1,9.9900,9.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(184,71,11,'YAM PORRIDGE',1,9.9900,9.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(185,71,10,'AMALA',1,11.9900,16.9400,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:2:{i:8;O:33:\"Igniter\\Flame\\Cart\\CartItemOption\":3:{s:2:\"id\";i:8;s:4:\"name\";s:5:\"Sides\";s:6:\"values\";O:39:\"Igniter\\Flame\\Cart\\CartItemOptionValues\":2:{s:8:\"\0*\0items\";a:1:{i:18;O:38:\"Igniter\\Flame\\Cart\\CartItemOptionValue\":4:{s:2:\"id\";i:18;s:4:\"name\";s:4:\"Fish\";s:3:\"qty\";i:1;s:5:\"price\";d:4.95;}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}}i:9;O:33:\"Igniter\\Flame\\Cart\\CartItemOption\":3:{s:2:\"id\";i:9;s:4:\"name\";s:6:\"Drinks\";s:6:\"values\";O:39:\"Igniter\\Flame\\Cart\\CartItemOptionValues\":2:{s:8:\"\0*\0items\";a:1:{i:20;O:38:\"Igniter\\Flame\\Cart\\CartItemOptionValue\":4:{s:2:\"id\";i:20;s:4:\"name\";s:4:\"Coke\";s:3:\"qty\";i:1;s:5:\"price\";d:0;}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}','',0,NULL,NULL),
(186,72,9,'Salad Cesar',1,11.9900,11.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(187,72,8,'Seafood Salad',1,5.9900,5.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(188,73,9,'Salad Cesar',1,11.9900,11.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"',NULL,0,NULL,NULL),
(194,74,12,'Boiled Plantain',1,9.9900,9.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(195,74,11,'YAM PORRIDGE',1,9.9900,9.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(196,75,12,'Boiled Plantain',1,9.9900,9.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(197,75,11,'YAM PORRIDGE',1,9.9900,9.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(201,76,9,'Salad Cesar',1,11.9900,11.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(202,76,8,'Seafood Salad',1,5.9900,5.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(203,76,7,'Simple Salad',1,8.9900,8.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(206,77,9,'Salad Cesar',1,11.9900,11.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(207,77,8,'Seafood Salad',1,5.9900,5.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(208,77,7,'Simple Salad',1,8.9900,8.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(209,78,9,'Salad Cesar',1,11.9900,11.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(210,78,7,'Simple Salad',1,8.9900,8.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(211,78,8,'Seafood Salad',1,5.9900,5.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(212,79,2,'SCOTCH EGG',1,2.0000,2.0000,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}','',0,NULL,NULL),
(213,80,7,'Simple Salad',1,8.9900,8.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(214,80,9,'Salad Cesar',1,11.9900,11.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(215,81,7,'Simple Salad',1,8.9900,8.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(216,81,9,'Salad Cesar',1,11.9900,11.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(217,82,6,'Whole catfish with rice and vegetables',1,13.9900,13.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(218,82,5,'Special Shrimp Deluxe',1,12.9900,17.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:1:{i:7;O:33:\"Igniter\\Flame\\Cart\\CartItemOption\":3:{s:2:\"id\";i:7;s:4:\"name\";s:4:\"Size\";s:6:\"values\";O:39:\"Igniter\\Flame\\Cart\\CartItemOptionValues\":2:{s:8:\"\0*\0items\";a:1:{i:16;O:38:\"Igniter\\Flame\\Cart\\CartItemOptionValue\":4:{s:2:\"id\";i:16;s:4:\"name\";s:5:\"Large\";s:3:\"qty\";i:1;s:5:\"price\";d:5;}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}','',0,NULL,NULL),
(219,83,2,'SCOTCH EGG',1,2.0000,2.0000,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}','',0,NULL,NULL),
(220,83,12,'Boiled Plantain',2,9.9900,19.9800,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(221,84,9,'Salad Cesar',1,11.9900,11.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(222,84,8,'Seafood Salad',1,5.9900,5.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(223,84,7,'Simple Salad',1,8.9900,8.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(224,85,9,'Salad Cesar',1,11.9900,11.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"',NULL,0,NULL,NULL),
(225,85,7,'Simple Salad',2,8.9900,17.9800,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"',NULL,0,NULL,NULL),
(226,86,10,'AMALA',1,11.9900,16.9400,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"',NULL,0,NULL,NULL),
(227,86,9,'Salad Cesar',1,11.9900,11.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"',NULL,0,NULL,NULL),
(228,87,3,'ATA RICE',1,12.0000,21.9500,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"',NULL,0,NULL,NULL),
(229,87,8,'Seafood Salad',1,5.9900,5.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"',NULL,0,NULL,NULL),
(230,88,9,'Salad Cesar',1,11.9900,11.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"',NULL,0,NULL,NULL),
(231,88,8,'Seafood Salad',1,5.9900,5.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"',NULL,0,NULL,NULL),
(232,89,9,'Salad Cesar',1,11.9900,11.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"',NULL,0,NULL,NULL),
(233,89,8,'Seafood Salad',1,5.9900,5.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"',NULL,0,NULL,NULL),
(234,90,9,'Salad Cesar',1,11.9900,11.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(235,90,8,'Seafood Salad',1,5.9900,5.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(236,91,9,'Salad Cesar',1,11.9900,11.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"',NULL,0,NULL,NULL),
(237,91,8,'Seafood Salad',1,5.9900,5.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"',NULL,0,NULL,NULL),
(238,92,7,'Simple Salad',1,8.9900,8.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"',NULL,0,NULL,NULL),
(239,93,7,'Simple Salad',1,8.9900,8.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"',NULL,0,NULL,NULL),
(240,94,7,'Simple Salad',1,8.9900,8.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"',NULL,0,NULL,NULL),
(241,95,7,'Simple Salad',1,8.9900,8.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"',NULL,0,NULL,NULL),
(242,96,12,'Boiled Plantain',1,9.9900,9.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(243,96,11,'YAM PORRIDGE',1,9.9900,9.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(244,97,7,'Simple Salad',1,8.9900,8.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"',NULL,0,NULL,NULL),
(245,97,4,'RICE AND DODO',1,11.9900,16.9400,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"',NULL,0,NULL,NULL),
(248,98,9,'Salad Cesar',1,11.9900,11.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(249,98,4,'RICE AND DODO',1,11.9900,21.9400,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:2:{i:5;O:33:\"Igniter\\Flame\\Cart\\CartItemOption\":3:{s:2:\"id\";i:5;s:4:\"name\";s:5:\"Sides\";s:6:\"values\";O:39:\"Igniter\\Flame\\Cart\\CartItemOptionValues\":2:{s:8:\"\0*\0items\";a:1:{i:11;O:38:\"Igniter\\Flame\\Cart\\CartItemOptionValue\":4:{s:2:\"id\";i:11;s:4:\"name\";s:4:\"Fish\";s:3:\"qty\";i:1;s:5:\"price\";d:4.95;}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}}i:6;O:33:\"Igniter\\Flame\\Cart\\CartItemOption\":3:{s:2:\"id\";i:6;s:4:\"name\";s:4:\"Size\";s:6:\"values\";O:39:\"Igniter\\Flame\\Cart\\CartItemOptionValues\":2:{s:8:\"\0*\0items\";a:1:{i:14;O:38:\"Igniter\\Flame\\Cart\\CartItemOptionValue\":4:{s:2:\"id\";i:14;s:4:\"name\";s:5:\"Large\";s:3:\"qty\";i:1;s:5:\"price\";d:5;}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}','',0,NULL,NULL),
(252,99,9,'Salad Cesar',1,11.9900,11.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(253,99,4,'RICE AND DODO',1,11.9900,21.9400,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:2:{i:5;O:33:\"Igniter\\Flame\\Cart\\CartItemOption\":3:{s:2:\"id\";i:5;s:4:\"name\";s:5:\"Sides\";s:6:\"values\";O:39:\"Igniter\\Flame\\Cart\\CartItemOptionValues\":2:{s:8:\"\0*\0items\";a:1:{i:11;O:38:\"Igniter\\Flame\\Cart\\CartItemOptionValue\":4:{s:2:\"id\";i:11;s:4:\"name\";s:4:\"Fish\";s:3:\"qty\";i:1;s:5:\"price\";d:4.95;}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}}i:6;O:33:\"Igniter\\Flame\\Cart\\CartItemOption\":3:{s:2:\"id\";i:6;s:4:\"name\";s:4:\"Size\";s:6:\"values\";O:39:\"Igniter\\Flame\\Cart\\CartItemOptionValues\":2:{s:8:\"\0*\0items\";a:1:{i:14;O:38:\"Igniter\\Flame\\Cart\\CartItemOptionValue\":4:{s:2:\"id\";i:14;s:4:\"name\";s:5:\"Large\";s:3:\"qty\";i:1;s:5:\"price\";d:5;}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}','',0,NULL,NULL),
(256,100,9,'Salad Cesar',1,11.9900,11.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(257,100,4,'RICE AND DODO',1,11.9900,21.9400,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:2:{i:5;O:33:\"Igniter\\Flame\\Cart\\CartItemOption\":3:{s:2:\"id\";i:5;s:4:\"name\";s:5:\"Sides\";s:6:\"values\";O:39:\"Igniter\\Flame\\Cart\\CartItemOptionValues\":2:{s:8:\"\0*\0items\";a:1:{i:11;O:38:\"Igniter\\Flame\\Cart\\CartItemOptionValue\":4:{s:2:\"id\";i:11;s:4:\"name\";s:4:\"Fish\";s:3:\"qty\";i:1;s:5:\"price\";d:4.95;}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}}i:6;O:33:\"Igniter\\Flame\\Cart\\CartItemOption\":3:{s:2:\"id\";i:6;s:4:\"name\";s:4:\"Size\";s:6:\"values\";O:39:\"Igniter\\Flame\\Cart\\CartItemOptionValues\":2:{s:8:\"\0*\0items\";a:1:{i:14;O:38:\"Igniter\\Flame\\Cart\\CartItemOptionValue\":4:{s:2:\"id\";i:14;s:4:\"name\";s:5:\"Large\";s:3:\"qty\";i:1;s:5:\"price\";d:5;}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}','',0,NULL,NULL),
(264,101,9,'Salad Cesar',1,11.9900,11.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(265,101,4,'RICE AND DODO',1,11.9900,21.9400,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:2:{i:5;O:33:\"Igniter\\Flame\\Cart\\CartItemOption\":3:{s:2:\"id\";i:5;s:4:\"name\";s:5:\"Sides\";s:6:\"values\";O:39:\"Igniter\\Flame\\Cart\\CartItemOptionValues\":2:{s:8:\"\0*\0items\";a:1:{i:11;O:38:\"Igniter\\Flame\\Cart\\CartItemOptionValue\":4:{s:2:\"id\";i:11;s:4:\"name\";s:4:\"Fish\";s:3:\"qty\";i:1;s:5:\"price\";d:4.95;}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}}i:6;O:33:\"Igniter\\Flame\\Cart\\CartItemOption\":3:{s:2:\"id\";i:6;s:4:\"name\";s:4:\"Size\";s:6:\"values\";O:39:\"Igniter\\Flame\\Cart\\CartItemOptionValues\":2:{s:8:\"\0*\0items\";a:1:{i:14;O:38:\"Igniter\\Flame\\Cart\\CartItemOptionValue\":4:{s:2:\"id\";i:14;s:4:\"name\";s:5:\"Large\";s:3:\"qty\";i:1;s:5:\"price\";d:5;}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}','',0,NULL,NULL),
(266,102,9,'Salad Cesar',1,11.9900,11.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(267,102,4,'RICE AND DODO',1,11.9900,21.9400,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:2:{i:5;O:33:\"Igniter\\Flame\\Cart\\CartItemOption\":3:{s:2:\"id\";i:5;s:4:\"name\";s:5:\"Sides\";s:6:\"values\";O:39:\"Igniter\\Flame\\Cart\\CartItemOptionValues\":2:{s:8:\"\0*\0items\";a:1:{i:11;O:38:\"Igniter\\Flame\\Cart\\CartItemOptionValue\":4:{s:2:\"id\";i:11;s:4:\"name\";s:4:\"Fish\";s:3:\"qty\";i:1;s:5:\"price\";d:4.95;}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}}i:6;O:33:\"Igniter\\Flame\\Cart\\CartItemOption\":3:{s:2:\"id\";i:6;s:4:\"name\";s:4:\"Size\";s:6:\"values\";O:39:\"Igniter\\Flame\\Cart\\CartItemOptionValues\":2:{s:8:\"\0*\0items\";a:1:{i:14;O:38:\"Igniter\\Flame\\Cart\\CartItemOptionValue\":4:{s:2:\"id\";i:14;s:4:\"name\";s:5:\"Large\";s:3:\"qty\";i:1;s:5:\"price\";d:5;}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}','',0,NULL,NULL),
(268,103,9,'Salad Cesar',1,11.9900,11.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(269,103,4,'RICE AND DODO',1,11.9900,21.9400,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:2:{i:5;O:33:\"Igniter\\Flame\\Cart\\CartItemOption\":3:{s:2:\"id\";i:5;s:4:\"name\";s:5:\"Sides\";s:6:\"values\";O:39:\"Igniter\\Flame\\Cart\\CartItemOptionValues\":2:{s:8:\"\0*\0items\";a:1:{i:11;O:38:\"Igniter\\Flame\\Cart\\CartItemOptionValue\":4:{s:2:\"id\";i:11;s:4:\"name\";s:4:\"Fish\";s:3:\"qty\";i:1;s:5:\"price\";d:4.95;}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}}i:6;O:33:\"Igniter\\Flame\\Cart\\CartItemOption\":3:{s:2:\"id\";i:6;s:4:\"name\";s:4:\"Size\";s:6:\"values\";O:39:\"Igniter\\Flame\\Cart\\CartItemOptionValues\":2:{s:8:\"\0*\0items\";a:1:{i:14;O:38:\"Igniter\\Flame\\Cart\\CartItemOptionValue\":4:{s:2:\"id\";i:14;s:4:\"name\";s:5:\"Large\";s:3:\"qty\";i:1;s:5:\"price\";d:5;}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}','',0,NULL,NULL),
(272,105,12,'Boiled Plantain',1,9.9900,9.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(273,105,9,'Salad Cesar',1,11.9900,11.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(274,105,11,'YAM PORRIDGE',1,9.9900,9.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(275,104,12,'Boiled Plantain',1,9.9900,9.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(276,104,9,'Salad Cesar',1,11.9900,11.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(277,104,11,'YAM PORRIDGE',1,9.9900,9.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(284,106,6,'Whole catfish with rice and vegetables',1,13.9900,13.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(285,106,9,'Salad Cesar',1,11.9900,11.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(286,106,3,'ATA RICE',1,12.0000,21.9500,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:2:{i:3;O:33:\"Igniter\\Flame\\Cart\\CartItemOption\":3:{s:2:\"id\";i:3;s:4:\"name\";s:5:\"Sides\";s:6:\"values\";O:39:\"Igniter\\Flame\\Cart\\CartItemOptionValues\":2:{s:8:\"\0*\0items\";a:1:{i:6;O:38:\"Igniter\\Flame\\Cart\\CartItemOptionValue\":4:{s:2:\"id\";i:6;s:4:\"name\";s:4:\"Fish\";s:3:\"qty\";i:1;s:5:\"price\";d:4.95;}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}}i:4;O:33:\"Igniter\\Flame\\Cart\\CartItemOption\":3:{s:2:\"id\";i:4;s:4:\"name\";s:4:\"Size\";s:6:\"values\";O:39:\"Igniter\\Flame\\Cart\\CartItemOptionValues\":2:{s:8:\"\0*\0items\";a:1:{i:9;O:38:\"Igniter\\Flame\\Cart\\CartItemOptionValue\":4:{s:2:\"id\";i:9;s:4:\"name\";s:5:\"Large\";s:3:\"qty\";i:1;s:5:\"price\";d:5;}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}','',0,NULL,NULL),
(289,107,2,'SCOTCH EGG',2,2.0000,4.0000,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:1:{i:2;O:33:\"Igniter\\Flame\\Cart\\CartItemOption\":3:{s:2:\"id\";i:2;s:4:\"name\";s:4:\"Size\";s:6:\"values\";O:39:\"Igniter\\Flame\\Cart\\CartItemOptionValues\":2:{s:8:\"\0*\0items\";a:1:{i:3;O:38:\"Igniter\\Flame\\Cart\\CartItemOptionValue\":4:{s:2:\"id\";i:3;s:4:\"name\";s:5:\"Small\";s:3:\"qty\";i:1;s:5:\"price\";d:0;}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}','',0,NULL,NULL),
(290,107,3,'ATA RICE',1,12.0000,16.9500,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:2:{i:3;O:33:\"Igniter\\Flame\\Cart\\CartItemOption\":3:{s:2:\"id\";i:3;s:4:\"name\";s:5:\"Sides\";s:6:\"values\";O:39:\"Igniter\\Flame\\Cart\\CartItemOptionValues\":2:{s:8:\"\0*\0items\";a:1:{i:6;O:38:\"Igniter\\Flame\\Cart\\CartItemOptionValue\":4:{s:2:\"id\";i:6;s:4:\"name\";s:4:\"Fish\";s:3:\"qty\";i:1;s:5:\"price\";d:4.95;}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}}i:4;O:33:\"Igniter\\Flame\\Cart\\CartItemOption\":3:{s:2:\"id\";i:4;s:4:\"name\";s:4:\"Size\";s:6:\"values\";O:39:\"Igniter\\Flame\\Cart\\CartItemOptionValues\":2:{s:8:\"\0*\0items\";a:1:{i:8;O:38:\"Igniter\\Flame\\Cart\\CartItemOptionValue\":4:{s:2:\"id\";i:8;s:4:\"name\";s:5:\"Small\";s:3:\"qty\";i:1;s:5:\"price\";d:0;}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}','',0,NULL,NULL),
(291,108,7,'Simple Salad',1,8.9900,8.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"',NULL,0,NULL,NULL),
(292,109,3,'ATA RICE',1,12.0000,21.9500,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"',NULL,0,NULL,NULL),
(293,110,7,'Simple Salad',1,8.9900,8.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"',NULL,0,NULL,NULL),
(294,110,9,'Salad Cesar',1,11.9900,11.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"',NULL,0,NULL,NULL),
(295,111,9,'Salad Cesar',1,11.9900,11.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(296,111,8,'Seafood Salad',1,5.9900,5.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(297,111,7,'Simple Salad',1,8.9900,8.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(300,112,12,'Boiled Plantain',1,9.9900,9.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(302,113,12,'Boiled Plantain',1,9.9900,9.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(304,114,12,'Boiled Plantain',2,9.9900,19.9800,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(306,115,12,'Boiled Plantain',2,9.9900,19.9800,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(308,116,12,'Boiled Plantain',2,9.9900,19.9800,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(310,117,12,'Boiled Plantain',3,9.9900,29.9700,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(311,118,7,'Simple Salad',1,8.9900,8.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"',NULL,0,NULL,NULL),
(315,119,9,'Salad Cesar',1,11.9900,11.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(316,119,8,'Seafood Salad',1,5.9900,5.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(317,119,7,'Simple Salad',1,8.9900,8.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(318,120,1,'Puff-Puff',3,4.9900,14.9700,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:1:{i:1;O:33:\"Igniter\\Flame\\Cart\\CartItemOption\":3:{s:2:\"id\";i:1;s:4:\"name\";s:6:\"Drinks\";s:6:\"values\";O:39:\"Igniter\\Flame\\Cart\\CartItemOptionValues\":2:{s:8:\"\0*\0items\";a:1:{i:1;O:38:\"Igniter\\Flame\\Cart\\CartItemOptionValue\":4:{s:2:\"id\";i:1;s:4:\"name\";s:4:\"Coke\";s:3:\"qty\";i:1;s:5:\"price\";d:0;}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}','',0,NULL,NULL),
(319,120,2,'SCOTCH EGG',1,2.0000,2.0000,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:1:{i:2;O:33:\"Igniter\\Flame\\Cart\\CartItemOption\":3:{s:2:\"id\";i:2;s:4:\"name\";s:4:\"Size\";s:6:\"values\";O:39:\"Igniter\\Flame\\Cart\\CartItemOptionValues\":2:{s:8:\"\0*\0items\";a:1:{i:3;O:38:\"Igniter\\Flame\\Cart\\CartItemOptionValue\":4:{s:2:\"id\";i:3;s:4:\"name\";s:5:\"Small\";s:3:\"qty\";i:1;s:5:\"price\";d:0;}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}','',0,NULL,NULL),
(322,121,2,'SCOTCH EGG',1,2.0000,2.0000,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:1:{i:2;O:33:\"Igniter\\Flame\\Cart\\CartItemOption\":3:{s:2:\"id\";i:2;s:4:\"name\";s:4:\"Size\";s:6:\"values\";O:39:\"Igniter\\Flame\\Cart\\CartItemOptionValues\":2:{s:8:\"\0*\0items\";a:1:{i:3;O:38:\"Igniter\\Flame\\Cart\\CartItemOptionValue\":4:{s:2:\"id\";i:3;s:4:\"name\";s:5:\"Small\";s:3:\"qty\";i:1;s:5:\"price\";d:0;}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}','',0,NULL,NULL),
(323,121,3,'ATA RICE',1,12.0000,21.9500,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:2:{i:3;O:33:\"Igniter\\Flame\\Cart\\CartItemOption\":3:{s:2:\"id\";i:3;s:4:\"name\";s:5:\"Sides\";s:6:\"values\";O:39:\"Igniter\\Flame\\Cart\\CartItemOptionValues\":2:{s:8:\"\0*\0items\";a:1:{i:6;O:38:\"Igniter\\Flame\\Cart\\CartItemOptionValue\":4:{s:2:\"id\";i:6;s:4:\"name\";s:4:\"Fish\";s:3:\"qty\";i:1;s:5:\"price\";d:4.95;}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}}i:4;O:33:\"Igniter\\Flame\\Cart\\CartItemOption\":3:{s:2:\"id\";i:4;s:4:\"name\";s:4:\"Size\";s:6:\"values\";O:39:\"Igniter\\Flame\\Cart\\CartItemOptionValues\":2:{s:8:\"\0*\0items\";a:1:{i:9;O:38:\"Igniter\\Flame\\Cart\\CartItemOptionValue\":4:{s:2:\"id\";i:9;s:4:\"name\";s:5:\"Large\";s:3:\"qty\";i:1;s:5:\"price\";d:5;}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}','',0,NULL,NULL),
(326,122,2,'SCOTCH EGG',1,2.0000,2.0000,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:1:{i:2;O:33:\"Igniter\\Flame\\Cart\\CartItemOption\":3:{s:2:\"id\";i:2;s:4:\"name\";s:4:\"Size\";s:6:\"values\";O:39:\"Igniter\\Flame\\Cart\\CartItemOptionValues\":2:{s:8:\"\0*\0items\";a:1:{i:3;O:38:\"Igniter\\Flame\\Cart\\CartItemOptionValue\":4:{s:2:\"id\";i:3;s:4:\"name\";s:5:\"Small\";s:3:\"qty\";i:1;s:5:\"price\";d:0;}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}','',0,NULL,NULL),
(327,122,3,'ATA RICE',1,12.0000,21.9500,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:2:{i:3;O:33:\"Igniter\\Flame\\Cart\\CartItemOption\":3:{s:2:\"id\";i:3;s:4:\"name\";s:5:\"Sides\";s:6:\"values\";O:39:\"Igniter\\Flame\\Cart\\CartItemOptionValues\":2:{s:8:\"\0*\0items\";a:1:{i:6;O:38:\"Igniter\\Flame\\Cart\\CartItemOptionValue\":4:{s:2:\"id\";i:6;s:4:\"name\";s:4:\"Fish\";s:3:\"qty\";i:1;s:5:\"price\";d:4.95;}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}}i:4;O:33:\"Igniter\\Flame\\Cart\\CartItemOption\":3:{s:2:\"id\";i:4;s:4:\"name\";s:4:\"Size\";s:6:\"values\";O:39:\"Igniter\\Flame\\Cart\\CartItemOptionValues\":2:{s:8:\"\0*\0items\";a:1:{i:9;O:38:\"Igniter\\Flame\\Cart\\CartItemOptionValue\":4:{s:2:\"id\";i:9;s:4:\"name\";s:5:\"Large\";s:3:\"qty\";i:1;s:5:\"price\";d:5;}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}','',0,NULL,NULL),
(330,123,3,'ATA RICE',1,12.0000,21.9500,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:2:{i:3;O:33:\"Igniter\\Flame\\Cart\\CartItemOption\":3:{s:2:\"id\";i:3;s:4:\"name\";s:5:\"Sides\";s:6:\"values\";O:39:\"Igniter\\Flame\\Cart\\CartItemOptionValues\":2:{s:8:\"\0*\0items\";a:1:{i:6;O:38:\"Igniter\\Flame\\Cart\\CartItemOptionValue\":4:{s:2:\"id\";i:6;s:4:\"name\";s:4:\"Fish\";s:3:\"qty\";i:1;s:5:\"price\";d:4.95;}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}}i:4;O:33:\"Igniter\\Flame\\Cart\\CartItemOption\":3:{s:2:\"id\";i:4;s:4:\"name\";s:4:\"Size\";s:6:\"values\";O:39:\"Igniter\\Flame\\Cart\\CartItemOptionValues\":2:{s:8:\"\0*\0items\";a:1:{i:9;O:38:\"Igniter\\Flame\\Cart\\CartItemOptionValue\":4:{s:2:\"id\";i:9;s:4:\"name\";s:5:\"Large\";s:3:\"qty\";i:1;s:5:\"price\";d:5;}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}','',0,NULL,NULL),
(331,123,9,'Salad Cesar',1,11.9900,11.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(334,124,3,'ATA RICE',1,12.0000,21.9500,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:2:{i:3;O:33:\"Igniter\\Flame\\Cart\\CartItemOption\":3:{s:2:\"id\";i:3;s:4:\"name\";s:5:\"Sides\";s:6:\"values\";O:39:\"Igniter\\Flame\\Cart\\CartItemOptionValues\":2:{s:8:\"\0*\0items\";a:1:{i:6;O:38:\"Igniter\\Flame\\Cart\\CartItemOptionValue\":4:{s:2:\"id\";i:6;s:4:\"name\";s:4:\"Fish\";s:3:\"qty\";i:1;s:5:\"price\";d:4.95;}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}}i:4;O:33:\"Igniter\\Flame\\Cart\\CartItemOption\":3:{s:2:\"id\";i:4;s:4:\"name\";s:4:\"Size\";s:6:\"values\";O:39:\"Igniter\\Flame\\Cart\\CartItemOptionValues\":2:{s:8:\"\0*\0items\";a:1:{i:9;O:38:\"Igniter\\Flame\\Cart\\CartItemOptionValue\":4:{s:2:\"id\";i:9;s:4:\"name\";s:5:\"Large\";s:3:\"qty\";i:1;s:5:\"price\";d:5;}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}','',0,NULL,NULL),
(335,124,9,'Salad Cesar',1,11.9900,11.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(338,125,5,'Special Shrimp Deluxe',1,12.9900,12.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:1:{i:7;O:33:\"Igniter\\Flame\\Cart\\CartItemOption\":3:{s:2:\"id\";i:7;s:4:\"name\";s:4:\"Size\";s:6:\"values\";O:39:\"Igniter\\Flame\\Cart\\CartItemOptionValues\":2:{s:8:\"\0*\0items\";a:1:{i:15;O:38:\"Igniter\\Flame\\Cart\\CartItemOptionValue\":4:{s:2:\"id\";i:15;s:4:\"name\";s:5:\"Small\";s:3:\"qty\";i:1;s:5:\"price\";d:0;}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}','',0,NULL,NULL),
(339,125,8,'Seafood Salad',1,5.9900,5.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(343,126,9,'Salad Cesar',1,11.9900,11.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(344,126,12,'Boiled Plantain',1,9.9900,9.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(345,126,11,'YAM PORRIDGE',1,9.9900,9.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(349,127,9,'Salad Cesar',1,11.9900,11.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(350,127,8,'Seafood Salad',1,5.9900,5.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(351,127,7,'Simple Salad',1,8.9900,8.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(352,128,3,'ATA RICE',1,12.0000,16.9500,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"',NULL,0,NULL,NULL),
(353,128,7,'Simple Salad',1,8.9900,8.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"',NULL,0,NULL,NULL),
(355,129,9,'Salad Cesar',1,11.9900,11.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(356,129,8,'Seafood Salad',1,5.9900,5.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(357,129,7,'Simple Salad',1,8.9900,8.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(358,130,4,'RICE AND DODO',1,11.9900,16.9400,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"',NULL,0,NULL,NULL),
(359,130,7,'Simple Salad',1,8.9900,8.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"',NULL,0,NULL,NULL),
(360,131,8,'Seafood Salad',1,5.9900,5.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"',NULL,0,NULL,NULL),
(365,132,6,'Whole catfish with rice and vegetables',1,13.9900,13.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(366,132,9,'Salad Cesar',1,11.9900,11.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(367,132,8,'Seafood Salad',1,5.9900,5.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(368,132,7,'Simple Salad',1,8.9900,8.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(370,133,6,'Whole catfish with rice and vegetables',1,13.9900,13.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(371,133,9,'Salad Cesar',1,11.9900,11.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(372,133,8,'Seafood Salad',1,5.9900,5.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(373,133,7,'Simple Salad',1,8.9900,8.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(374,134,8,'Seafood Salad',1,5.9900,5.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"',NULL,0,NULL,NULL),
(378,136,6,'Whole catfish with rice and vegetables',1,13.9900,13.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(379,136,9,'Salad Cesar',1,11.9900,11.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(380,136,8,'Seafood Salad',1,5.9900,5.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(381,136,7,'Simple Salad',1,8.9900,8.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(382,135,6,'Whole catfish with rice and vegetables',1,13.9900,13.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(383,135,9,'Salad Cesar',1,11.9900,11.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(384,135,8,'Seafood Salad',1,5.9900,5.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(385,135,7,'Simple Salad',1,8.9900,8.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(386,137,4,'RICE AND DODO',2,11.9900,33.9300,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"',NULL,0,NULL,NULL),
(387,138,7,'Simple Salad',1,8.9900,8.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"',NULL,0,NULL,NULL),
(388,139,9,'Salad Cesar',1,11.9900,11.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"',NULL,0,NULL,NULL),
(389,140,12,'Boiled Plantain',1,9.9900,9.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(390,141,8,'Seafood Salad',1,5.9900,5.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"',NULL,0,NULL,NULL),
(391,142,8,'Seafood Salad',2,5.9900,11.9800,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"',NULL,0,NULL,NULL),
(392,143,5,'Special Shrimp Deluxe',4,12.9900,56.9600,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"',NULL,0,NULL,NULL),
(393,144,5,'Special Shrimp Deluxe',4,12.9900,56.9600,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"',NULL,0,NULL,NULL),
(401,146,12,'Boiled Plantain',1,9.9900,9.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(402,145,12,'Boiled Plantain',2,9.9900,19.9800,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(408,147,12,'Boiled Plantain',3,9.9900,29.9700,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(421,148,12,'Boiled Plantain',4,9.9900,39.9600,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(422,149,12,'Boiled Plantain',5,9.9900,49.9500,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(423,149,11,'YAM PORRIDGE',1,9.9900,9.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(424,150,12,'Boiled Plantain',8,9.9900,79.9200,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(425,150,11,'YAM PORRIDGE',1,9.9900,9.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(426,151,12,'Boiled Plantain',8,9.9900,79.9200,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(427,151,11,'YAM PORRIDGE',2,9.9900,19.9800,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(428,152,12,'Boiled Plantain',8,9.9900,79.9200,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(429,152,11,'YAM PORRIDGE',2,9.9900,19.9800,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(433,153,12,'Boiled Plantain',8,9.9900,79.9200,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(434,153,11,'YAM PORRIDGE',2,9.9900,19.9800,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(435,153,10,'AMALA',1,11.9900,11.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}','',0,NULL,NULL),
(436,154,9,'Salad Cesar',2,11.9900,23.9800,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"',NULL,0,NULL,NULL),
(437,155,12,'Boiled Plantain',1,9.9900,9.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL,0,NULL,NULL),
(438,156,10,'AMALA',4,11.9900,54.9100,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"',NULL,0,NULL,NULL),
(439,157,8,'Seafood Salad',2,5.9900,11.9800,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"',NULL,0,NULL,NULL),
(440,158,9,'Salad Cesar',4,11.9900,47.9600,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"',NULL,0,NULL,NULL),
(441,159,5,'Special Shrimp Deluxe',3,12.9900,38.9700,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"',NULL,0,NULL,NULL),
(442,160,5,'Special Shrimp Deluxe',3,12.9900,38.9700,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"',NULL,0,NULL,NULL),
(443,161,5,'Special Shrimp Deluxe',3,12.9900,38.9700,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"',NULL,0,NULL,NULL),
(444,162,5,'Special Shrimp Deluxe',3,12.9900,38.9700,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"',NULL,0,NULL,NULL),
(445,163,5,'Special Shrimp Deluxe',3,12.9900,38.9700,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"',NULL,0,NULL,NULL),
(446,164,5,'Special Shrimp Deluxe',3,12.9900,38.9700,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"',NULL,0,NULL,NULL),
(447,165,5,'Special Shrimp Deluxe',3,12.9900,38.9700,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"',NULL,0,NULL,NULL),
(448,166,10,'AMALA',3,11.9900,40.9200,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"',NULL,0,NULL,NULL),
(449,167,10,'AMALA',3,11.9900,45.8700,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"',NULL,0,NULL,NULL),
(450,167,10,'AMALA',2,11.9900,33.8800,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"',NULL,0,NULL,NULL),
(451,168,10,'AMALA',2,11.9900,33.8800,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"',NULL,0,NULL,NULL),
(452,168,10,'AMALA',1,11.9900,21.8900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"',NULL,0,NULL,NULL),
(453,169,4,'RICE AND DODO',2,11.9900,23.9800,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"',NULL,0,NULL,NULL),
(454,169,4,'RICE AND DODO',3,11.9900,35.9700,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"',NULL,0,NULL,NULL),
(455,169,10,'AMALA',3,11.9900,35.9700,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"',NULL,0,NULL,NULL),
(456,170,4,'RICE AND DODO',2,11.9900,23.9800,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"',NULL,0,NULL,NULL),
(457,170,1,'Puff-Puff',2,4.9900,9.9800,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"',NULL,0,NULL,NULL),
(458,171,10,'AMALA',2,11.9900,33.8800,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"',NULL,0,NULL,NULL),
(459,171,10,'AMALA',3,11.9900,45.8700,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"',NULL,0,NULL,NULL),
(460,172,10,'AMALA',2,11.9900,33.8800,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"',NULL,0,NULL,NULL),
(461,172,10,'AMALA',3,11.9900,45.8700,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"',NULL,0,NULL,NULL),
(462,173,10,'AMALA',2,11.9900,28.9300,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"',NULL,0,NULL,NULL),
(463,173,4,'RICE AND DODO',3,11.9900,40.9200,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"',NULL,0,NULL,NULL),
(464,174,12,'Boiled Plantain',3,9.9900,29.9700,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"',NULL,0,NULL,NULL),
(465,174,11,'YAM PORRIDGE',4,9.9900,39.9600,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"',NULL,0,NULL,NULL),
(466,175,3,'ATA RICE',2,12.0000,24.0000,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"',NULL,0,NULL,NULL),
(467,175,10,'AMALA',4,11.9900,59.8600,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"',NULL,0,NULL,NULL),
(468,176,5,'Special Shrimp Deluxe',3,12.9900,38.9700,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"',NULL,0,NULL,NULL),
(469,176,9,'Salad Cesar',2,11.9900,23.9800,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"',NULL,0,NULL,NULL),
(470,176,10,'AMALA',3,11.9900,47.8700,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"',NULL,0,NULL,NULL),
(471,177,5,'Special Shrimp Deluxe',2,12.9900,25.9800,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"',NULL,0,NULL,NULL),
(472,177,12,'Boiled Plantain',2,9.9900,19.9800,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"',NULL,0,NULL,NULL),
(473,177,10,'AMALA',3,11.9900,45.8700,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"',NULL,0,NULL,NULL),
(474,178,5,'Special Shrimp Deluxe',3,12.9900,38.9700,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"',NULL,0,NULL,NULL),
(475,178,11,'YAM PORRIDGE',3,9.9900,29.9700,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"',NULL,0,NULL,NULL),
(476,178,10,'AMALA',3,11.9900,35.9700,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"',NULL,0,NULL,NULL),
(477,179,4,'RICE AND DODO',2,11.9900,23.9800,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"',NULL,0,NULL,NULL),
(478,179,10,'AMALA',3,11.9900,35.9700,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"',NULL,0,NULL,NULL),
(479,180,4,'RICE AND DODO',3,11.9900,35.9700,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"',NULL,0,NULL,NULL),
(480,180,10,'AMALA',2,11.9900,23.9800,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"',NULL,0,NULL,NULL),
(481,181,4,'RICE AND DODO',1,11.9900,11.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"',NULL,0,NULL,NULL),
(482,181,10,'AMALA',2,11.9900,23.9800,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"',NULL,0,NULL,NULL),
(483,181,5,'Special Shrimp Deluxe',3,12.9900,38.9700,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"',NULL,0,NULL,NULL),
(484,182,3,'ATA RICE',3,12.0000,42.9500,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"',NULL,0,NULL,NULL),
(485,182,5,'Special Shrimp Deluxe',2,12.9900,25.9800,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"',NULL,0,NULL,NULL),
(486,183,2,'SCOTCH EGG',3,2.0000,6.0000,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"',NULL,0,NULL,NULL),
(487,183,5,'Special Shrimp Deluxe',4,12.9900,56.9600,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"',NULL,0,NULL,NULL),
(488,183,10,'AMALA',5,11.9900,71.8500,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"',NULL,0,NULL,NULL),
(489,184,11,'YAM PORRIDGE',3,9.9900,29.9700,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"',NULL,0,NULL,NULL),
(490,184,2,'SCOTCH EGG',2,2.0000,4.0000,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"',NULL,0,NULL,NULL),
(491,184,10,'AMALA',2,11.9900,35.8800,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"',NULL,0,NULL,NULL),
(492,185,1,'Puff-Puff',2,4.9900,9.9800,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"',NULL,0,NULL,NULL),
(493,185,5,'Special Shrimp Deluxe',3,12.9900,38.9700,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"',NULL,0,NULL,NULL),
(494,185,5,'Special Shrimp Deluxe',3,12.9900,38.9700,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"',NULL,0,NULL,NULL),
(495,185,7,'Simple Salad',1,8.9900,8.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"',NULL,0,NULL,NULL),
(496,186,4,'RICE AND DODO',2,11.9900,35.8800,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"',NULL,0,NULL,NULL),
(497,186,2,'SCOTCH EGG',1,2.0000,7.0000,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"',NULL,0,NULL,NULL),
(498,186,11,'YAM PORRIDGE',2,9.9900,19.9800,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"',NULL,0,NULL,NULL),
(499,187,3,'ATA RICE',2,12.0000,28.9500,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"',NULL,0,NULL,NULL),
(500,187,11,'YAM PORRIDGE',1,9.9900,9.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"',NULL,0,NULL,NULL),
(501,187,5,'Special Shrimp Deluxe',1,12.9900,12.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"',NULL,0,NULL,NULL),
(502,188,3,'ATA RICE',1,12.0000,28.8500,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"',NULL,0,NULL,NULL),
(503,188,11,'YAM PORRIDGE',1,9.9900,9.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"',NULL,0,NULL,NULL),
(504,188,10,'AMALA',3,11.9900,35.9700,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"',NULL,0,NULL,NULL),
(505,189,4,'RICE AND DODO',1,11.9900,23.8900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"',NULL,0,NULL,NULL),
(506,189,12,'Boiled Plantain',2,9.9900,19.9800,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"',NULL,0,NULL,NULL),
(507,190,6,'Whole catfish with rice and vegetables',1,13.9900,13.9900,'','',0,NULL,NULL),
(508,190,7,'Simple Salad',1,8.9900,8.9900,'','',0,NULL,NULL),
(509,190,10,'AMALA',1,11.9900,11.9900,'','',0,NULL,NULL),
(510,191,16,'New Food 23',1,23.0000,23.0000,'','',0,NULL,NULL),
(511,192,12,'Boiled Plantain',1,9.9900,9.9900,'','',0,NULL,NULL),
(512,193,10,'AMALA',1,11.9900,11.9900,'','',0,NULL,NULL),
(513,193,12,'Boiled Plantain',1,9.9900,9.9900,'','',0,NULL,NULL),
(514,194,3,'ATA RICE',2,12.0000,24.0000,'','',0,NULL,NULL),
(515,195,10,'AMALA',1,11.9900,11.9900,'','',0,NULL,NULL),
(516,195,3,'ATA RICE',1,12.0000,12.0000,'','',0,NULL,NULL),
(517,196,10,'AMALA',1,11.9900,11.9900,'','',0,NULL,NULL),
(518,197,10,'AMALA',1,11.9900,11.9900,'','',0,NULL,NULL),
(519,198,4,'RICE AND DODO',1,11.9900,11.9900,'','',0,NULL,NULL),
(520,199,10,'AMALA',3,11.9900,35.9700,'','',0,NULL,NULL),
(521,200,10,'AMALA',1,11.9900,11.9900,'','',0,NULL,NULL),
(522,201,10,'AMALA',1,11.9900,11.9900,'','',0,NULL,NULL),
(523,202,3,'ATA RICE',1,12.0000,12.0000,'','',0,NULL,NULL),
(524,202,10,'AMALA',1,11.9900,11.9900,'','',0,NULL,NULL),
(525,203,10,'AMALA',1,11.9900,11.9900,'','',0,NULL,NULL),
(526,204,1,'Puff-Puff',1,4.9900,4.9900,'','',0,NULL,NULL),
(527,204,12,'Boiled Plantain',1,9.9900,9.9900,'','',0,NULL,NULL),
(528,204,2,'SCOTCH EGG',1,2.0000,2.0000,'','',0,NULL,NULL),
(529,205,3,'ATA RICE',2,12.0000,24.0000,'','',0,NULL,NULL),
(530,205,10,'AMALA',2,11.9900,23.9800,'','',0,NULL,NULL),
(531,205,12,'Boiled Plantain',1,9.9900,9.9900,'','',0,NULL,NULL),
(532,206,8,'Seafood Salad',1,5.9900,5.9900,'','',0,NULL,NULL),
(533,206,2,'SCOTCH EGG',1,2.0000,2.0000,'','',0,NULL,NULL),
(534,207,10,'AMALA',2,11.9900,23.9800,'','',0,NULL,NULL),
(535,208,10,'AMALA',1,11.9900,11.9900,'','',0,NULL,NULL),
(536,209,10,'AMALA',1,11.9900,18.9400,'','',0,NULL,NULL),
(537,209,12,'Boiled Plantain',1,9.9900,9.9900,'','',0,NULL,NULL),
(538,210,10,'AMALA',1,11.9900,11.9900,'','',0,NULL,NULL),
(539,210,12,'Boiled Plantain',1,9.9900,9.9900,'','',0,NULL,NULL),
(540,211,10,'AMALA',1,11.9900,11.9900,'','',0,NULL,NULL),
(541,211,3,'ATA RICE',1,12.0000,12.0000,'','',0,NULL,NULL),
(542,211,1,'Puff-Puff',1,4.9900,4.9900,'','',0,NULL,NULL),
(543,211,4,'RICE AND DODO',1,11.9900,11.9900,'','',0,NULL,NULL),
(544,212,10,'AMALA',1,11.9900,18.9400,'','',0,NULL,NULL),
(545,212,12,'Boiled Plantain',1,9.9900,9.9900,'','',0,NULL,NULL),
(546,213,10,'AMALA',4,11.9900,47.9600,'','',0,NULL,NULL),
(547,213,12,'Boiled Plantain',1,9.9900,9.9900,'','',0,NULL,NULL),
(548,214,10,'AMALA',1,11.9900,11.9900,'','',0,NULL,NULL),
(549,214,12,'Boiled Plantain',1,9.9900,9.9900,'','',0,NULL,NULL),
(550,215,10,'AMALA',2,11.9900,23.9800,'','',0,NULL,NULL),
(551,216,10,'AMALA',1,11.9900,11.9900,'','',0,NULL,NULL),
(552,216,12,'Boiled Plantain',1,9.9900,9.9900,'','',0,NULL,NULL),
(553,216,3,'ATA RICE',1,12.0000,21.9500,'','',0,NULL,NULL),
(554,217,0,'',0,0.0000,0.0000,'[]',NULL,0,NULL,NULL),
(555,217,3,'ATA RICE',1,12.0000,12.0000,'[]',NULL,0,NULL,NULL),
(556,217,4,'RICE AND DODO',1,11.9900,11.9900,'[]',NULL,0,NULL,NULL),
(557,217,5,'Special Shrimp Deluxe',1,12.9900,12.9900,'[]',NULL,0,NULL,NULL),
(558,218,0,'',0,0.0000,0.0000,'[]',NULL,0,NULL,NULL),
(559,218,3,'ATA RICE',1,12.0000,12.0000,'[]',NULL,0,NULL,NULL),
(560,218,4,'RICE AND DODO',1,11.9900,11.9900,'[]',NULL,0,NULL,NULL),
(561,218,5,'Special Shrimp Deluxe',1,12.9900,12.9900,'[]',NULL,0,NULL,NULL),
(562,219,0,'',0,0.0000,0.0000,'[]',NULL,0,NULL,NULL),
(563,219,6,'Whole catfish with rice and vegetables',1,13.9900,13.9900,'[]',NULL,0,NULL,NULL),
(564,219,7,'Simple Salad',1,8.9900,8.9900,'[]',NULL,0,NULL,NULL),
(565,219,2,'SCOTCH EGG',1,2.0000,2.0000,'[]',NULL,0,NULL,NULL),
(566,220,0,'',0,0.0000,0.0000,'[]',NULL,0,NULL,NULL),
(567,220,2,'SCOTCH EGG',3,2.0000,6.0000,'[]',NULL,0,NULL,NULL),
(568,221,0,'',0,0.0000,0.0000,'[]',NULL,0,NULL,NULL),
(569,221,2,'SCOTCH EGG',1,2.0000,2.0000,'[]',NULL,0,NULL,NULL),
(570,221,3,'ATA RICE',1,12.0000,12.0000,'[]',NULL,0,NULL,NULL),
(571,221,4,'RICE AND DODO',1,11.9900,11.9900,'[]',NULL,0,NULL,NULL),
(572,222,0,'',0,0.0000,0.0000,'[]',NULL,0,NULL,NULL),
(573,222,2,'SCOTCH EGG',1,7.0000,7.0000,'[]',NULL,0,NULL,NULL),
(574,222,3,'ATA RICE',1,21.9500,21.9500,'[]',NULL,0,NULL,NULL),
(575,222,4,'RICE AND DODO',1,16.9400,16.9400,'[]',NULL,0,NULL,NULL),
(576,223,12,'Boiled Plantain',1,9.9900,9.9900,'','',0,NULL,NULL),
(577,223,15,'Pizza slami',1,2.0000,2.0000,'','',0,NULL,NULL),
(578,223,20,'Soup',1,15.0000,15.0000,'','',0,NULL,NULL),
(579,223,11,'YAM PORRIDGE',1,9.9900,9.9900,'','',0,NULL,NULL),
(580,224,15,'Pizza slami',1,2.0000,2.0000,'[]',NULL,0,NULL,NULL),
(581,224,12,'Boiled Plantain',1,9.9900,9.9900,'[]',NULL,0,NULL,NULL),
(582,224,18,'Chicken Curry',1,20.0000,20.0000,'[]',NULL,0,NULL,NULL),
(583,224,2,'SCOTCH EGG',1,2.0000,7.0000,'[]',NULL,0,NULL,NULL),
(584,225,3,'ATA RICE',1,12.0000,16.9500,'[]',NULL,0,NULL,NULL),
(585,225,7,'Simple Salad',1,8.9900,8.9900,'[]',NULL,0,NULL,NULL),
(586,225,6,'Whole catfish with rice and vegetables',1,13.9900,13.9900,'[]',NULL,0,NULL,NULL),
(587,225,5,'Special Shrimp Deluxe',1,12.9900,12.9900,'[]',NULL,0,NULL,NULL),
(588,226,2,'SCOTCH EGG',2,2.0000,9.0000,'[]',NULL,0,NULL,NULL),
(589,226,3,'ATA RICE',1,12.0000,12.0000,'[]',NULL,0,NULL,NULL),
(590,226,4,'RICE AND DODO',1,11.9900,11.9900,'[]',NULL,0,NULL,NULL),
(591,226,5,'Special Shrimp Deluxe',1,12.9900,12.9900,'[]',NULL,0,NULL,NULL),
(592,226,2,'SCOTCH EGG',1,2.0000,7.0000,'[]',NULL,0,NULL,NULL),
(593,226,9,'Salad Cesar',1,11.9900,11.9900,'[]',NULL,0,NULL,NULL),
(594,226,18,'Chicken Curry',1,20.0000,20.0000,'[]',NULL,0,NULL,NULL),
(595,227,22,'Coffee Latte',1,5.5000,5.5000,'','',0,NULL,NULL),
(596,227,3,'ATA RICE',1,12.0000,12.0000,'','',0,NULL,NULL),
(597,227,28,'Caesar Salad',1,17.0000,17.0000,'','',0,NULL,NULL),
(598,228,10,'AMALA',1,11.9900,11.9900,'','',0,NULL,NULL),
(599,228,12,'Boiled Plantain',1,9.9900,9.9900,'','',0,NULL,NULL),
(600,229,3,'ATA RICE',1,12.0000,16.9500,'[]',NULL,0,NULL,NULL),
(601,229,4,'RICE AND DODO',1,11.9900,16.9400,'[]',NULL,0,NULL,NULL),
(602,229,7,'Simple Salad',1,8.9900,8.9900,'[]',NULL,0,NULL,NULL),
(603,229,19,'Pizza',1,20.0000,20.0000,'[]',NULL,0,NULL,NULL),
(604,230,5,'Special Shrimp Deluxe',1,12.9900,12.9900,'[]',NULL,0,NULL,NULL),
(605,230,10,'AMALA',1,11.9900,11.9900,'[]',NULL,0,NULL,NULL),
(606,231,3,'ATA RICE',1,12.0000,16.9500,'[]',NULL,0,NULL,NULL),
(607,231,7,'Simple Salad',1,8.9900,8.9900,'[]',NULL,0,NULL,NULL),
(608,232,4,'RICE AND DODO',1,11.9900,16.9400,'[]',NULL,0,NULL,NULL),
(609,232,5,'Special Shrimp Deluxe',1,12.9900,17.9900,'[]',NULL,0,NULL,NULL),
(610,232,2,'SCOTCH EGG',1,2.0000,2.0000,'[]',NULL,0,NULL,NULL),
(611,232,12,'Boiled Plantain',1,9.9900,9.9900,'[]',NULL,0,NULL,NULL),
(612,233,5,'Special Shrimp Deluxe',1,12.9900,12.9900,'[]',NULL,0,NULL,NULL),
(613,233,10,'AMALA',1,11.9900,16.9400,'[]',NULL,0,NULL,NULL),
(614,233,18,'Chicken Curry',1,20.0000,20.0000,'[]',NULL,0,NULL,NULL),
(615,234,5,'Special Shrimp Deluxe',1,12.9900,12.9900,'[]',NULL,0,NULL,NULL),
(616,234,10,'AMALA',1,11.9900,16.9400,'[]',NULL,0,NULL,NULL),
(617,234,7,'Simple Salad',1,8.9900,8.9900,'[]',NULL,0,NULL,NULL),
(618,235,27,'Grilled Chicken Sandwich',1,12.0000,12.0000,'a:0:{}','',0,NULL,NULL),
(619,236,10,'AMALA',1,11.9900,11.9900,'','',0,NULL,NULL),
(621,237,30,'Rickson Product',1,8.6957,8.6957,'a:0:{}','',0,NULL,NULL),
(622,238,2,'SCOTCH EGG',1,2.0000,2.0000,'[]',NULL,0,NULL,NULL),
(624,239,30,'Rickson Product',1,8.6957,8.6957,'a:0:{}','',0,NULL,NULL),
(626,240,30,'Rickson Product',1,8.6957,8.6957,'a:0:{}','',0,NULL,NULL),
(627,241,26,'Veggie Burger',1,15.7700,15.7700,'a:0:{}','',0,NULL,NULL),
(628,242,2,'SCOTCH EGG',1,2.0000,2.0000,'[]',NULL,0,NULL,NULL),
(629,243,3,'ATA RICE',1,12.0000,12.0000,'','',0,NULL,NULL),
(630,243,10,'AMALA',1,11.9900,11.9900,'','',0,NULL,NULL),
(631,243,29,'Greek Salad',1,12.0000,12.0000,'','',0,NULL,NULL),
(632,244,12,'Boiled Plantain',1,9.9900,9.9900,'','',0,NULL,NULL),
(633,245,20,'Soup',1,15.0000,15.0000,'[]',NULL,0,NULL,NULL),
(634,246,20,'Soup',1,15.0000,15.0000,'[]',NULL,0,NULL,NULL),
(636,247,28,'Caesar Salad',1,17.0000,17.0000,'a:0:{}','',0,NULL,NULL),
(637,248,10,'AMALA',3,11.9900,35.9700,'','',0,NULL,NULL),
(638,248,12,'Boiled Plantain',2,9.9900,19.9800,'','',0,NULL,NULL),
(639,248,32,'ammir',2,2.0000,4.0000,'','',0,NULL,NULL),
(640,249,10,'AMALA',3,13.4288,40.2864,'','',0,NULL,NULL),
(641,250,10,'AMALA',9,13.4288,120.8592,'','',0,NULL,NULL),
(642,250,3,'ATA RICE',1,13.4400,13.4400,'','',0,NULL,NULL),
(643,251,3,'ATA RICE',4,13.4400,53.7600,'','',0,NULL,NULL),
(644,252,10,'AMALA',1,13.4288,13.4288,'','',0,NULL,NULL),
(645,253,28,'Caesar Salad',1,19.0400,19.0400,'','',0,NULL,NULL),
(646,254,10,'AMALA',1,11.9900,11.9900,'[]',NULL,0,NULL,NULL),
(647,255,28,'Caesar Salad',1,17.0000,17.0000,'a:0:{}','',0,NULL,NULL),
(648,256,27,'Grilled Chicken Sandwich',1,12.0000,12.0000,'a:0:{}','',0,NULL,NULL),
(649,257,28,'Caesar Salad',1,17.0000,17.0000,'a:0:{}','',0,NULL,NULL),
(650,258,28,'Caesar Salad',1,17.0000,17.0000,'a:0:{}','',0,NULL,NULL),
(651,259,28,'Caesar Salad',1,17.0000,17.0000,'a:0:{}','',0,NULL,NULL),
(652,260,28,'Caesar Salad',1,17.0000,17.0000,'a:0:{}','',0,NULL,NULL),
(653,261,28,'Caesar Salad',1,17.0000,17.0000,'a:0:{}','',0,NULL,NULL),
(654,262,28,'Caesar Salad',1,17.0000,17.0000,'a:0:{}','',0,NULL,NULL),
(655,263,28,'Caesar Salad',1,19.0400,19.0400,'','',0,NULL,NULL),
(656,264,28,'Caesar Salad',1,19.0400,19.0400,'a:0:{}','',0,NULL,NULL),
(657,265,28,'Caesar Salad',1,19.0400,19.0400,'a:0:{}','',0,NULL,NULL),
(658,266,28,'Caesar Salad',1,19.0400,19.0400,'','',0,NULL,NULL),
(659,267,28,'Caesar Salad',1,19.0400,19.0400,'a:0:{}','',0,NULL,NULL),
(660,268,28,'Caesar Salad',1,19.0400,19.0400,'a:0:{}','',0,NULL,NULL),
(661,269,3,'ATA RICE',1,13.2000,13.2000,'','',0,NULL,NULL),
(662,270,10,'AMALA',1,13.1890,13.1890,'','',0,NULL,NULL),
(663,270,3,'ATA RICE',1,13.2000,13.2000,'','',0,NULL,NULL),
(664,270,10,'AMALA',1,13.1890,13.1890,'','',0,NULL,NULL),
(665,270,10,'AMALA',1,13.2000,13.2000,'','',0,NULL,NULL),
(666,270,10,'AMALA',1,13.2000,13.2000,'','',0,NULL,NULL),
(667,270,10,'AMALA',1,13.2000,13.2000,'','',0,NULL,NULL),
(668,270,10,'AMALA',1,13.2000,13.2000,'','',0,NULL,NULL),
(669,271,12,'Boiled Plantain',1,10.9890,10.9890,'','',0,NULL,NULL),
(670,272,22,'Coffee Latte',1,6.0500,6.0500,'','',0,NULL,NULL),
(671,273,22,'Coffee Latte',1,6.0500,6.0500,'','',0,NULL,NULL),
(672,274,22,'Coffee Latte',1,6.0500,6.0500,'','',0,NULL,NULL),
(673,275,22,'Coffee Latte',1,6.0500,6.0500,'','',0,NULL,NULL),
(674,276,22,'Coffee Latte',1,6.0500,6.0500,'','',0,NULL,NULL),
(675,277,22,'Coffee Latte',1,6.0500,6.0500,'','',0,NULL,NULL),
(676,278,22,'Coffee Latte',1,6.0500,6.0500,'','',0,NULL,NULL),
(677,279,22,'Coffee Latte',1,6.0500,6.0500,'','',0,NULL,NULL),
(678,279,10,'AMALA',1,13.2000,13.2000,'','',0,NULL,NULL),
(679,280,22,'Coffee Latte',1,6.0500,6.0500,'','',0,NULL,NULL),
(680,280,10,'AMALA',1,13.2000,13.2000,'','',0,NULL,NULL),
(681,280,10,'AMALA',1,13.2000,13.2000,'','',0,NULL,NULL),
(682,281,22,'Coffee Latte',1,6.0500,6.0500,'','',0,NULL,NULL),
(683,281,10,'AMALA',1,13.2000,13.2000,'','',0,NULL,NULL),
(684,281,10,'AMALA',1,13.2000,13.2000,'','',0,NULL,NULL),
(685,282,22,'Coffee Latte',1,6.0500,6.0500,'','',0,NULL,NULL),
(686,282,10,'AMALA',1,13.2000,13.2000,'','',0,NULL,NULL),
(687,282,10,'AMALA',1,13.2000,13.2000,'','',0,NULL,NULL),
(688,282,12,'Boiled Plantain',1,10.9890,10.9890,'','',0,NULL,NULL),
(689,283,3,'ATA RICE',1,12.0000,12.0000,'[]',NULL,0,NULL,NULL),
(690,284,3,'ATA RICE',1,12.0000,12.0000,'[]',NULL,0,NULL,NULL),
(691,285,3,'ATA RICE',1,12.0000,12.0000,'[]',NULL,0,NULL,NULL),
(692,286,3,'ATA RICE',1,12.0000,12.0000,'[]',NULL,0,NULL,NULL),
(693,287,8,'Seafood Salad',1,5.9900,5.9900,'[]',NULL,0,NULL,NULL),
(694,288,3,'ATA RICE',1,12.0000,12.0000,'[]',NULL,0,NULL,NULL),
(695,288,7,'Simple Salad',1,8.9900,8.9900,'[]',NULL,0,NULL,NULL),
(696,289,3,'ATA RICE',1,12.0000,12.0000,'[]',NULL,0,NULL,NULL),
(697,289,7,'Simple Salad',1,8.9900,8.9900,'[]',NULL,0,NULL,NULL),
(698,290,3,'ATA RICE',1,12.0000,12.0000,'[]',NULL,0,NULL,NULL),
(699,290,7,'Simple Salad',1,8.9900,8.9900,'[]',NULL,0,NULL,NULL),
(700,291,3,'ATA RICE',1,12.0000,12.0000,'[]',NULL,0,NULL,NULL),
(701,291,7,'Simple Salad',1,8.9900,8.9900,'[]',NULL,0,NULL,NULL),
(702,292,3,'ATA RICE',1,12.0000,12.0000,'[]',NULL,0,NULL,NULL),
(703,292,7,'Simple Salad',1,8.9900,8.9900,'[]',NULL,0,NULL,NULL),
(704,293,2,'SCOTCH EGG',1,2.0000,2.0000,'[]',NULL,0,NULL,NULL),
(705,294,2,'SCOTCH EGG',1,2.0000,2.0000,'[]',NULL,0,NULL,NULL),
(706,295,2,'SCOTCH EGG',1,2.0000,2.0000,'[]',NULL,0,NULL,NULL),
(707,296,2,'SCOTCH EGG',1,2.0000,2.0000,'[]',NULL,0,NULL,NULL),
(709,297,2,'SCOTCH EGG',6,2.0000,12.0000,'[]',NULL,0,NULL,NULL),
(711,298,2,'SCOTCH EGG',1,2.0000,2.0000,'[]',NULL,0,NULL,NULL),
(712,298,4,'RICE AND DODO',1,11.9900,21.9400,'[]',NULL,0,NULL,NULL),
(713,300,10,'AMALA',2,13.2000,40.3000,'','',0,NULL,NULL),
(714,300,3,'ATA RICE',3,13.2000,60.4500,'','',0,NULL,NULL),
(715,301,2,'SCOTCH EGG',1,2.0000,2.0000,'[]',NULL,0,NULL,NULL),
(716,302,0,'Monday\'s Offer',2,50.0000,100.0000,'{\"combo_id\":1,\"items\":\"AMALA, Pizza, Soup, Pepperoni Pizza, Caesar Salad\"}',NULL,0,NULL,NULL),
(717,303,10,'AMALA',1,13.2000,13.2000,'','',0,NULL,NULL),
(718,303,10,'AMALA',1,13.2000,13.2000,'','',0,NULL,NULL),
(719,303,10,'AMALA',1,13.2000,13.2000,'','',0,NULL,NULL),
(720,303,10,'AMALA',1,13.2000,13.2000,'','',0,NULL,NULL),
(721,303,10,'AMALA',1,13.2000,13.2000,'','',0,NULL,NULL),
(722,304,3,'ATA RICE',3,13.2000,39.6000,'','',0,NULL,NULL),
(723,304,10,'AMALA',3,13.1890,39.5670,'','',0,NULL,NULL),
(724,305,10,'AMALA',1,13.2000,13.2000,'','',0,NULL,NULL),
(726,307,1,'Puff-Puff',1,15.0000,15.0000,'[]',NULL,0,NULL,NULL),
(727,307,2,'SCOTCH EGG',1,2.0000,7.0000,'[]',NULL,0,NULL,NULL),
(729,308,7,'Simple Salad',11,8.9900,98.8900,'[]',NULL,0,NULL,NULL),
(730,309,10,'AMALA',1,13.2000,13.2000,'','',0,NULL,NULL),
(731,309,3,'ATA RICE',1,13.2000,13.2000,'','',0,NULL,NULL),
(732,310,3,'ATA RICE',1,13.2000,13.2000,'','',0,NULL,NULL),
(733,311,2,'SCOTCH EGG',1,2.0000,2.0000,'[]',NULL,0,NULL,NULL),
(734,311,0,'Monday\'s Offer',1,50.0000,50.0000,'{\"combo_id\":1,\"items\":\"AMALA, Pizza, Soup, Pepperoni Pizza, Caesar Salad\"}',NULL,0,NULL,NULL),
(735,311,0,'Happy Friday',1,10.0000,10.0000,'{\"combo_id\":2,\"items\":\"Special Shrimp Deluxe, Simple Salad, AMALA, Soup, Cheeseburger (x2), Grilled Chicken Sandwich, Caesar Salad, Greek Salad\"}',NULL,0,NULL,NULL),
(736,312,4,'RICE AND DODO',1,11.9900,21.9400,'[]',NULL,0,NULL,NULL),
(737,312,12,'Boiled Plantain',1,9.9900,9.9900,'[]',NULL,0,NULL,NULL),
(738,312,8,'Seafood Salad',1,5.9900,5.9900,'[]',NULL,0,NULL,NULL);
/*!40000 ALTER TABLE `ti_order_menus` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `ti_order_notes`
--

LOCK TABLES `ti_order_notes` WRITE;
/*!40000 ALTER TABLE `ti_order_notes` DISABLE KEYS */;
INSERT INTO `ti_order_notes` VALUES
(1,312,1,'this is just a test note','active','2025-12-06 09:02:11','2025-12-06 09:02:11');
/*!40000 ALTER TABLE `ti_order_notes` ENABLE KEYS */;
UNLOCK TABLES;

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
) ENGINE=InnoDB AUTO_INCREMENT=867 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ti_order_totals`
--

LOCK TABLES `ti_order_totals` WRITE;
/*!40000 ALTER TABLE `ti_order_totals` DISABLE KEYS */;
INSERT INTO `ti_order_totals` VALUES
(1,1,'delivery','Delivery',0.0000,100,1),
(2,1,'subtotal','Sub Total',49.9600,0,0),
(3,1,'total','Order Total',49.9600,127,0),
(4,2,'delivery','Delivery',0.0000,100,1),
(5,2,'subtotal','Sub Total',28.9300,0,0),
(6,2,'total','Order Total',28.9300,127,0),
(7,3,'subtotal','Sub Total',48.9100,0,0),
(8,3,'total','Order Total',48.9100,127,0),
(9,4,'subtotal','Sub Total',40.9300,0,0),
(10,4,'total','Order Total',40.9300,127,0),
(11,5,'subtotal','Sub Total',18.9500,0,0),
(12,5,'total','Order Total',18.9500,127,0),
(13,6,'delivery','Delivery',0.0000,100,1),
(14,6,'subtotal','Sub Total',32.9300,0,0),
(15,6,'total','Order Total',32.9300,127,0),
(16,7,'delivery','Delivery',0.0000,100,1),
(17,7,'subtotal','Sub Total',24.9800,0,0),
(18,7,'total','Order Total',24.9800,127,0),
(19,8,'delivery','Delivery',0.0000,100,1),
(20,8,'subtotal','Sub Total',32.9300,0,0),
(21,8,'total','Order Total',32.9300,127,0),
(22,9,'delivery','Delivery',0.0000,100,1),
(23,9,'subtotal','Sub Total',21.9800,0,0),
(24,9,'total','Order Total',21.9800,127,0),
(25,10,'delivery','Delivery',0.0000,1,1),
(26,10,'subtotal','Sub Total',11.9900,0,0),
(27,10,'total','Order Total',11.9900,127,0),
(28,11,'delivery','Delivery',0.0000,1,1),
(29,11,'subtotal','Sub Total',18.9900,0,0),
(30,11,'total','Order Total',18.9900,127,0),
(31,12,'delivery','Delivery',0.0000,1,1),
(32,12,'subtotal','Sub Total',21.9800,0,0),
(33,12,'total','Order Total',21.9800,127,0),
(34,13,'delivery','Delivery',0.0000,1,1),
(35,13,'subtotal','Sub Total',21.9800,0,0),
(36,13,'total','Order Total',21.9800,127,0),
(37,14,'delivery','Delivery',0.0000,1,1),
(38,14,'subtotal','Sub Total',21.9800,0,0),
(39,14,'total','Order Total',21.9800,127,0),
(40,15,'delivery','Delivery',0.0000,1,1),
(41,15,'subtotal','Sub Total',50.9100,0,0),
(42,15,'total','Order Total',50.9100,127,0),
(43,16,'delivery','Delivery',0.0000,1,1),
(44,16,'subtotal','Sub Total',2.0000,0,0),
(45,16,'total','Order Total',2.0000,127,0),
(46,17,'delivery','Delivery',0.0000,1,1),
(47,17,'subtotal','Sub Total',29.9400,0,0),
(48,17,'total','Order Total',29.9400,127,0),
(49,18,'delivery','Delivery',0.0000,1,1),
(50,18,'subtotal','Sub Total',25.9800,0,0),
(51,18,'total','Order Total',25.9800,127,0),
(52,19,'coupon','Coupon [MTo6TuTg]',-16.9700,1,1),
(53,19,'delivery','Delivery',0.0000,1,1),
(54,19,'subtotal','Sub Total',33.9400,0,0),
(55,19,'total','Order Total',16.9700,127,0),
(56,20,'delivery','Delivery',0.0000,1,1),
(57,20,'subtotal','Sub Total',28.9400,0,0),
(58,20,'total','Order Total',28.9400,127,0),
(59,21,'subtotal','table41',11.9900,0,0),
(60,21,'total','Order Total',11.9900,0,0),
(61,21,'table41','Sub Total',11.9900,0,0),
(62,22,'subtotal','Table 7',11.9900,0,0),
(63,22,'total','Order Total',11.9900,0,0),
(64,22,'Table 7','Sub Total',11.9900,0,0),
(65,23,'subtotal','table21',11.9900,0,0),
(66,23,'total','Order Total',11.9900,0,0),
(67,23,'table21','Sub Total',11.9900,0,0),
(68,24,'subtotal','table21',12.0000,0,0),
(69,24,'total','Order Total',12.0000,0,0),
(70,24,'table21','Sub Total',12.0000,0,0),
(71,25,'subtotal','table41',25.9800,0,0),
(72,25,'total','Order Total',25.9800,0,0),
(73,25,'table41','Sub Total',25.9800,0,0),
(74,26,'subtotal','table40',0.0000,0,0),
(75,26,'table40','Sub Total',35.9300,0,0),
(76,26,'total','Order Total',35.9300,0,0),
(77,27,'subtotal','table40',0.0000,0,0),
(78,27,'table40','Sub Total',35.9300,0,0),
(79,27,'total','Order Total',35.9300,0,0),
(80,28,'delivery','Delivery',0.0000,1,1),
(81,28,'subtotal','Sub Total',13.9900,0,0),
(82,28,'total','Order Total',13.9900,127,0),
(83,29,'delivery','Delivery',0.0000,1,1),
(84,29,'subtotal','Sub Total',17.9800,0,0),
(85,29,'total','Order Total',17.9800,127,0),
(86,30,'delivery','Delivery',0.0000,1,1),
(87,30,'subtotal','Sub Total',26.9700,0,0),
(88,30,'total','Order Total',26.9700,127,0),
(89,31,'delivery','Delivery',0.0000,1,1),
(90,31,'subtotal','Sub Total',26.9700,0,0),
(91,31,'total','Order Total',26.9700,127,0),
(92,32,'delivery','Delivery',0.0000,1,1),
(93,32,'subtotal','Sub Total',47.9500,0,0),
(94,32,'total','Order Total',47.9500,127,0),
(95,33,'delivery','Delivery',0.0000,1,1),
(96,33,'subtotal','Sub Total',20.9800,0,0),
(97,33,'total','Order Total',20.9800,127,0),
(98,34,'delivery','Delivery',0.0000,1,1),
(99,34,'subtotal','Sub Total',26.9700,0,0),
(100,34,'total','Order Total',26.9700,127,0),
(101,35,'delivery','Delivery',0.0000,1,1),
(102,35,'subtotal','Sub Total',26.9700,0,0),
(103,35,'total','Order Total',26.9700,127,0),
(104,36,'delivery','Delivery',0.0000,1,1),
(105,36,'subtotal','Sub Total',17.9800,0,0),
(106,36,'total','Order Total',17.9800,127,0),
(107,37,'delivery','Delivery',0.0000,1,1),
(108,37,'subtotal','Sub Total',26.9700,0,0),
(109,37,'total','Order Total',26.9700,127,0),
(110,38,'delivery','Delivery',0.0000,1,1),
(111,38,'subtotal','Sub Total',27.9700,0,0),
(112,38,'total','Order Total',27.9700,127,0),
(113,39,'delivery','Delivery',0.0000,1,1),
(114,39,'subtotal','Sub Total',16.9500,0,0),
(115,39,'total','Order Total',16.9500,127,0),
(116,40,'delivery','Delivery',0.0000,1,1),
(117,40,'subtotal','Sub Total',15.9800,0,0),
(118,40,'total','Order Total',15.9800,127,0),
(119,41,'delivery','Delivery',0.0000,1,1),
(120,41,'subtotal','Sub Total',60.8900,0,0),
(121,41,'total','Order Total',60.8900,127,0),
(122,42,'subtotal','Sub Total',60.8900,0,0),
(123,42,'total','Order Total',60.8900,127,0),
(124,43,'subtotal','Sub Total',36.9200,0,0),
(125,43,'total','Order Total',36.9200,127,0),
(126,44,'delivery','Delivery',0.0000,1,1),
(127,44,'subtotal','Sub Total',27.9700,0,0),
(128,44,'total','Order Total',27.9700,127,0),
(129,45,'delivery','Delivery',0.0000,1,1),
(130,45,'subtotal','Sub Total',38.9200,0,0),
(131,45,'total','Order Total',38.9200,127,0),
(132,46,'delivery','Delivery',0.0000,1,1),
(133,46,'subtotal','Sub Total',23.9800,0,0),
(134,46,'total','Order Total',23.9800,127,0),
(135,47,'delivery','Delivery',0.0000,1,1),
(136,47,'subtotal','Sub Total',15.9800,0,0),
(137,47,'total','Order Total',15.9800,127,0),
(138,48,'delivery','Delivery',0.0000,1,1),
(139,48,'subtotal','Sub Total',17.9800,0,0),
(140,48,'total','Order Total',17.9800,127,0),
(141,49,'delivery','Delivery',0.0000,1,1),
(142,49,'subtotal','Sub Total',17.9800,0,0),
(143,49,'total','Order Total',17.9800,127,0),
(144,50,'delivery','Delivery',0.0000,1,1),
(145,50,'subtotal','Sub Total',38.9700,0,0),
(146,50,'total','Order Total',38.9700,127,0),
(147,51,'delivery','Delivery',0.0000,1,1),
(148,51,'subtotal','Sub Total',41.9300,0,0),
(149,51,'total','Order Total',41.9300,127,0),
(150,52,'subtotal','Table 10',0.0000,0,0),
(151,52,'Table 10','Sub Total',2.0000,0,0),
(152,52,'total','Order Total',2.0000,0,0),
(153,53,'delivery','Delivery',0.0000,1,1),
(154,53,'subtotal','Sub Total',27.9700,0,0),
(155,53,'total','Order Total',27.9700,127,0),
(156,54,'delivery','Delivery',0.0000,1,1),
(157,54,'subtotal','Sub Total',27.9700,0,0),
(158,54,'total','Order Total',27.9700,127,0),
(159,55,'delivery','Delivery',0.0000,1,1),
(160,55,'subtotal','Sub Total',27.9700,0,0),
(161,55,'total','Order Total',27.9700,127,0),
(162,56,'delivery','Delivery',0.0000,1,1),
(163,56,'subtotal','Sub Total',27.9700,0,0),
(164,56,'total','Order Total',27.9700,127,0),
(165,57,'delivery','Delivery',0.0000,1,1),
(166,57,'subtotal','Sub Total',27.9700,0,0),
(167,57,'total','Order Total',27.9700,127,0),
(168,58,'delivery','Delivery',0.0000,1,1),
(169,58,'subtotal','Sub Total',49.9200,0,0),
(170,58,'total','Order Total',49.9200,127,0),
(171,59,'delivery','Delivery',0.0000,1,1),
(172,59,'subtotal','Sub Total',26.9700,0,0),
(173,59,'total','Order Total',26.9700,127,0),
(174,60,'delivery','Delivery',0.0000,1,1),
(175,60,'subtotal','Sub Total',27.9700,0,0),
(176,60,'total','Order Total',27.9700,127,0),
(177,61,'subtotal','Table 01',0.0000,0,0),
(178,61,'Table 01','Sub Total',28.9300,0,0),
(179,61,'total','Order Total',28.9300,0,0),
(180,62,'delivery','Delivery',0.0000,1,1),
(181,62,'subtotal','Sub Total',34.9600,0,0),
(182,62,'total','Order Total',34.9600,127,0),
(183,63,'subtotal','Sub Total',34.9600,0,0),
(184,63,'Table 01','Sub Total',16.9800,0,0),
(185,63,'total','Order Total',34.9600,127,0),
(186,63,'delivery','Delivery',0.0000,1,1),
(187,64,'delivery','Delivery',0.0000,1,1),
(188,64,'subtotal','Sub Total',26.9700,0,0),
(189,64,'total','Order Total',26.9700,127,0),
(190,65,'delivery','Delivery',0.0000,1,1),
(191,65,'subtotal','Sub Total',36.9600,0,0),
(192,65,'total','Order Total',36.9600,127,0),
(193,68,'subtotal','Table 01',0.0000,0,0),
(194,68,'Table 01','Sub Total',30.9400,0,0),
(195,68,'total','Order Total',30.9400,0,0),
(196,69,'subtotal','Table 01',0.0000,0,0),
(197,69,'Table 01','Sub Total',21.9300,0,0),
(198,69,'total','Order Total',21.9300,0,0),
(199,70,'delivery','Delivery',0.0000,1,1),
(200,70,'subtotal','Sub Total',26.9700,0,0),
(201,70,'total','Order Total',26.9700,127,0),
(202,71,'delivery','Delivery',0.0000,1,1),
(203,71,'subtotal','Sub Total',36.9200,0,0),
(204,71,'total','Order Total',36.9200,127,0),
(205,72,'delivery','Delivery',0.0000,1,1),
(206,72,'subtotal','Sub Total',17.9800,0,0),
(207,72,'total','Order Total',17.9800,127,0),
(208,74,'delivery','Delivery',0.0000,1,1),
(209,74,'subtotal','Sub Total',19.9800,0,0),
(210,74,'total','Order Total',19.9800,127,0),
(211,75,'delivery','Delivery',0.0000,1,1),
(212,75,'subtotal','Sub Total',19.9800,0,0),
(213,75,'total','Order Total',19.9800,127,0),
(214,76,'delivery','Delivery',0.0000,1,1),
(215,76,'subtotal','Sub Total',26.9700,0,0),
(216,76,'total','Order Total',26.9700,127,0),
(217,77,'subtotal','Sub Total',26.9700,0,0),
(218,77,'Table 02','Sub Total',28.9400,0,0),
(219,77,'total','Order Total',26.9700,127,0),
(220,77,'delivery','Delivery',0.0000,1,1),
(221,78,'delivery','Delivery',0.0000,1,1),
(222,78,'subtotal','Sub Total',26.9700,0,0),
(223,78,'total','Order Total',26.9700,127,0),
(224,79,'delivery','Delivery',0.0000,1,1),
(225,79,'subtotal','Sub Total',2.0000,0,0),
(226,79,'total','Order Total',2.0000,127,0),
(227,80,'delivery','Delivery',0.0000,1,1),
(228,80,'subtotal','Sub Total',20.9800,0,0),
(229,80,'total','Order Total',20.9800,127,0),
(230,81,'delivery','Delivery',0.0000,1,1),
(231,81,'subtotal','Sub Total',20.9800,0,0),
(232,81,'total','Order Total',20.9800,127,0),
(233,82,'delivery','Delivery',0.0000,1,1),
(234,82,'subtotal','Sub Total',31.9800,0,0),
(235,82,'total','Order Total',31.9800,127,0),
(236,83,'delivery','Delivery',0.0000,1,1),
(237,83,'subtotal','Sub Total',21.9800,0,0),
(238,83,'total','Order Total',21.9800,127,0),
(239,84,'delivery','Delivery',0.0000,1,1),
(240,84,'subtotal','Sub Total',26.9700,0,0),
(241,84,'total','Order Total',26.9700,127,0),
(242,86,'subtotal','Table 01',0.0000,0,0),
(243,86,'Table 01','Sub Total',28.9300,0,0),
(244,86,'total','Order Total',28.9300,0,0),
(245,87,'subtotal','Table 01',0.0000,0,0),
(246,87,'Table 01','Sub Total',27.9400,0,0),
(247,87,'total','Order Total',27.9400,0,0),
(248,90,'delivery','Delivery',0.0000,1,1),
(249,90,'subtotal','Sub Total',17.9800,0,0),
(250,90,'total','Order Total',17.9800,127,0),
(251,96,'delivery','Delivery',0.0000,1,1),
(252,96,'subtotal','Sub Total',19.9800,0,0),
(253,96,'total','Order Total',19.9800,127,0),
(254,97,'subtotal','Table 01',0.0000,0,0),
(255,97,'Table 01','Sub Total',25.9300,0,0),
(256,97,'total','Order Total',25.9300,0,0),
(257,98,'delivery','Delivery',0.0000,1,1),
(258,98,'subtotal','Sub Total',33.9300,0,0),
(259,98,'total','Order Total',33.9300,127,0),
(260,99,'subtotal','Sub Total',33.9300,0,0),
(261,99,'Table 03','Sub Total',35.9300,0,0),
(262,99,'total','Order Total',33.9300,127,0),
(263,99,'delivery','Delivery',0.0000,1,1),
(264,100,'subtotal','Sub Total',33.9300,0,0),
(265,100,'Table 03','Sub Total',28.9400,0,0),
(266,100,'total','Order Total',33.9300,127,0),
(267,100,'delivery','Delivery',0.0000,1,1),
(268,101,'subtotal','Sub Total',33.9300,0,0),
(269,101,'Table 01','Sub Total',23.9400,0,0),
(270,101,'total','Order Total',33.9300,127,0),
(271,102,'subtotal','Sub Total',33.9300,0,0),
(272,102,'Table 02','Sub Total',28.9400,0,0),
(273,102,'total','Order Total',33.9300,127,0),
(274,103,'subtotal','Sub Total',33.9300,0,0),
(275,103,'Table 03','Sub Total',30.9300,0,0),
(276,103,'total','Order Total',33.9300,127,0),
(277,101,'delivery','Delivery',0.0000,1,1),
(278,102,'delivery','Delivery',0.0000,1,1),
(279,103,'delivery','Delivery',0.0000,1,1),
(280,104,'delivery','Delivery',0.0000,1,1),
(281,104,'subtotal','Sub Total',31.9700,0,0),
(282,104,'total','Order Total',31.9700,127,0),
(283,105,'delivery','Delivery',0.0000,1,1),
(284,105,'subtotal','Sub Total',31.9700,0,0),
(285,105,'total','Order Total',31.9700,127,0),
(286,106,'delivery','Delivery',0.0000,1,1),
(287,106,'subtotal','Sub Total',47.9300,0,0),
(288,106,'total','Order Total',47.9300,127,0),
(289,107,'delivery','Delivery',0.0000,1,1),
(290,107,'subtotal','Sub Total',20.9500,0,0),
(291,107,'total','Order Total',20.9500,127,0),
(292,109,'subtotal','Table 04',0.0000,0,0),
(293,109,'Table 04','Sub Total',21.9500,0,0),
(294,109,'total','Order Total',21.9500,0,0),
(295,111,'delivery','Delivery',0.0000,1,1),
(296,111,'subtotal','Sub Total',26.9700,0,0),
(297,111,'total','Order Total',26.9700,127,0),
(298,112,'delivery','Delivery',0.0000,1,1),
(299,112,'subtotal','Sub Total',9.9900,0,0),
(300,112,'total','Order Total',9.9900,127,0),
(301,113,'subtotal','Sub Total',9.9900,0,0),
(302,113,'Table 5','Sub Total',64.9000,0,0),
(303,113,'total','Order Total',9.9900,127,0),
(304,113,'delivery','Delivery',0.0000,1,1),
(305,114,'delivery','Delivery',0.0000,1,1),
(306,114,'subtotal','Sub Total',19.9800,0,0),
(307,114,'total','Order Total',19.9800,127,0),
(308,115,'delivery','Delivery',0.0000,1,1),
(309,115,'subtotal','Sub Total',19.9800,0,0),
(310,115,'total','Order Total',19.9800,127,0),
(311,116,'subtotal','Sub Total',19.9800,0,0),
(312,116,'Table 02','Sub Total',52.9100,0,0),
(313,116,'total','Order Total',19.9800,127,0),
(314,116,'delivery','Delivery',0.0000,1,1),
(315,117,'delivery','Delivery',0.0000,1,1),
(316,117,'subtotal','Sub Total',29.9700,0,0),
(317,117,'total','Order Total',29.9700,127,0),
(318,119,'delivery','Delivery',0.0000,1,1),
(319,119,'subtotal','Sub Total',26.9700,0,0),
(320,119,'total','Order Total',26.9700,127,0),
(321,120,'delivery','Delivery',0.0000,1,1),
(322,120,'subtotal','Sub Total',16.9700,0,0),
(323,120,'total','Order Total',16.9700,127,0),
(324,121,'delivery','Delivery',0.0000,1,1),
(325,121,'subtotal','Sub Total',23.9500,0,0),
(326,121,'total','Order Total',23.9500,127,0),
(327,122,'subtotal','Sub Total',23.9500,0,0),
(328,122,'Table 5','Sub Total',25.9400,0,0),
(329,122,'total','Order Total',23.9500,127,0),
(330,122,'delivery','Delivery',0.0000,1,1),
(331,123,'delivery','Delivery',0.0000,1,1),
(332,123,'subtotal','Sub Total',33.9400,0,0),
(333,123,'total','Order Total',33.9400,127,0),
(334,124,'subtotal','Sub Total',33.9400,0,0),
(335,124,'Table 01','Sub Total',30.9300,0,0),
(336,124,'total','Order Total',33.9400,127,0),
(337,124,'delivery','Delivery',0.0000,1,1),
(338,125,'delivery','Delivery',0.0000,1,1),
(339,125,'subtotal','Sub Total',18.9800,0,0),
(340,125,'total','Order Total',18.9800,127,0),
(341,126,'delivery','Delivery',0.0000,1,1),
(342,126,'subtotal','Sub Total',31.9700,0,0),
(343,126,'total','Order Total',31.9700,127,0),
(344,127,'delivery','Delivery',0.0000,1,1),
(345,127,'subtotal','Sub Total',26.9700,0,0),
(346,127,'total','Order Total',26.9700,127,0),
(347,128,'subtotal','Table 03',0.0000,0,0),
(348,128,'Table 03','Sub Total',25.9400,0,0),
(349,128,'total','Order Total',25.9400,0,0),
(350,129,'subtotal','Sub Total',26.9700,0,0),
(351,129,'Table 05','Sub Total',16.9400,0,0),
(352,129,'total','Order Total',26.9700,127,0),
(353,129,'delivery','Delivery',0.0000,1,1),
(354,130,'subtotal','Table 05',0.0000,0,0),
(355,130,'Table 05','Sub Total',25.9300,0,0),
(356,130,'total','Order Total',25.9300,0,0),
(357,131,'subtotal','Table 04',0.0000,0,0),
(358,131,'Table 04','Sub Total',5.9900,0,0),
(359,131,'total','Order Total',5.9900,0,0),
(360,132,'delivery','Delivery',0.0000,1,1),
(361,132,'subtotal','Sub Total',40.9600,0,0),
(362,132,'total','Order Total',40.9600,127,0),
(363,133,'subtotal','Sub Total',40.9600,0,0),
(364,133,'Table 02','Sub Total',8.9900,0,0),
(365,133,'total','Order Total',40.9600,127,0),
(366,133,'delivery','Delivery',0.0000,1,1),
(367,134,'subtotal','Table 02',0.0000,0,0),
(368,134,'Table 02','Sub Total',5.9900,0,0),
(369,134,'total','Order Total',5.9900,0,0),
(370,135,'subtotal','Sub Total',40.9600,0,0),
(371,135,'Table 02','Sub Total',11.9900,0,0),
(372,135,'total','Order Total',40.9600,127,0),
(373,136,'subtotal','Sub Total',40.9600,0,0),
(374,136,'Table 05','Sub Total',28.9300,0,0),
(375,136,'total','Order Total',40.9600,127,0),
(376,136,'delivery','Delivery',0.0000,1,1),
(377,135,'delivery','Delivery',0.0000,1,1),
(378,137,'subtotal','Table 02',0.0000,0,0),
(379,137,'Table 02','Sub Total',33.9300,0,0),
(380,137,'total','Order Total',33.9300,0,0),
(381,138,'subtotal','Table 01',0.0000,0,0),
(382,138,'Table 01','Sub Total',8.9900,0,0),
(383,138,'total','Order Total',8.9900,0,0),
(384,139,'subtotal','Table 02',0.0000,0,0),
(385,139,'Table 02','Sub Total',11.9900,0,0),
(386,139,'total','Order Total',11.9900,0,0),
(387,140,'delivery','Delivery',0.0000,1,1),
(388,140,'subtotal','Sub Total',9.9900,0,0),
(389,140,'total','Order Total',9.9900,127,0),
(390,141,'subtotal','Table 02',0.0000,0,0),
(391,141,'Table 02','Sub Total',5.9900,0,0),
(392,141,'total','Order Total',5.9900,0,0),
(393,142,'subtotal','Table 02',0.0000,0,0),
(394,142,'Table 02','Sub Total',11.9800,0,0),
(395,142,'total','Order Total',11.9800,0,0),
(396,143,'subtotal','Table 05',0.0000,0,0),
(397,143,'Table 05','Sub Total',56.9600,0,0),
(398,143,'total','Order Total',56.9600,0,0),
(399,144,'subtotal','Table 05',0.0000,0,0),
(400,144,'Table 05','Sub Total',56.9600,0,0),
(401,144,'total','Order Total',56.9600,0,0),
(402,145,'delivery','Delivery',0.0000,1,1),
(403,145,'subtotal','Sub Total',19.9800,0,0),
(404,145,'total','Order Total',19.9800,127,0),
(405,146,'delivery','Delivery',0.0000,1,1),
(406,146,'subtotal','Sub Total',9.9900,0,0),
(407,146,'total','Order Total',9.9900,127,0),
(408,147,'delivery','Delivery',0.0000,1,1),
(409,147,'subtotal','Sub Total',29.9700,0,0),
(410,147,'total','Order Total',29.9700,127,0),
(411,148,'delivery','Delivery',0.0000,1,1),
(412,148,'subtotal','Sub Total',39.9600,0,0),
(413,148,'total','Order Total',39.9600,127,0),
(414,149,'delivery','Delivery',0.0000,1,1),
(415,149,'subtotal','Sub Total',59.9400,0,0),
(416,149,'total','Order Total',59.9400,127,0),
(417,150,'delivery','Delivery',0.0000,1,1),
(418,150,'subtotal','Sub Total',89.9100,0,0),
(419,150,'total','Order Total',89.9100,127,0),
(420,151,'delivery','Delivery',0.0000,1,1),
(421,151,'subtotal','Sub Total',99.9000,0,0),
(422,151,'total','Order Total',99.9000,127,0),
(423,152,'delivery','Delivery',0.0000,1,1),
(424,152,'subtotal','Sub Total',99.9000,0,0),
(425,152,'total','Order Total',99.9000,127,0),
(426,153,'delivery','Delivery',0.0000,1,1),
(427,153,'subtotal','Sub Total',111.8900,0,0),
(428,153,'total','Order Total',111.8900,127,0),
(429,154,'subtotal','Table 01',0.0000,0,0),
(430,154,'Table 01','Sub Total',23.9800,0,0),
(431,154,'total','Order Total',23.9800,0,0),
(432,155,'delivery','Delivery',0.0000,1,1),
(433,155,'subtotal','Sub Total',9.9900,0,0),
(434,155,'total','Order Total',9.9900,127,0),
(435,156,'subtotal','Table 01',0.0000,0,0),
(436,156,'Table 01','Sub Total',54.9100,0,0),
(437,156,'total','Order Total',54.9100,0,0),
(438,157,'subtotal','Table 02',0.0000,0,0),
(439,157,'Table 02','Sub Total',11.9800,0,0),
(440,157,'total','Order Total',11.9800,0,0),
(441,158,'subtotal','table 06',0.0000,0,0),
(442,158,'table 06','Sub Total',47.9600,0,0),
(443,158,'total','Order Total',47.9600,0,0),
(444,159,'subtotal','Table 03',0.0000,0,0),
(445,159,'Table 03','Sub Total',38.9700,0,0),
(446,159,'total','Order Total',38.9700,0,0),
(447,160,'subtotal','Table 03',0.0000,0,0),
(448,160,'Table 03','Sub Total',38.9700,0,0),
(449,160,'total','Order Total',38.9700,0,0),
(450,161,'subtotal','Table 03',0.0000,0,0),
(451,161,'Table 03','Sub Total',38.9700,0,0),
(452,161,'total','Order Total',38.9700,0,0),
(453,162,'subtotal','Table 03',0.0000,0,0),
(454,162,'Table 03','Sub Total',38.9700,0,0),
(455,162,'total','Order Total',38.9700,0,0),
(456,163,'subtotal','Table 03',0.0000,0,0),
(457,163,'Table 03','Sub Total',38.9700,0,0),
(458,163,'total','Order Total',38.9700,0,0),
(459,164,'subtotal','Table 03',0.0000,0,0),
(460,164,'Table 03','Sub Total',38.9700,0,0),
(461,164,'total','Order Total',38.9700,0,0),
(462,165,'subtotal','Table 03',0.0000,0,0),
(463,165,'Table 03','Sub Total',38.9700,0,0),
(464,165,'total','Order Total',38.9700,0,0),
(465,166,'subtotal','Table 04',0.0000,0,0),
(466,166,'Table 04','Sub Total',40.9200,0,0),
(467,166,'total','Order Total',40.9200,0,0),
(468,167,'subtotal','Table 01',0.0000,0,0),
(469,167,'Table 01','Sub Total',69.8500,0,0),
(470,167,'total','Order Total',69.8500,0,0),
(471,168,'subtotal','Table 01',0.0000,0,0),
(472,168,'Table 01','Sub Total',45.8700,0,0),
(473,168,'total','Order Total',45.8700,0,0),
(474,169,'subtotal','Table 01',0.0000,0,0),
(475,169,'Table 01','Sub Total',95.9200,0,0),
(476,169,'total','Order Total',95.9200,0,0),
(477,170,'subtotal','Table 01',0.0000,0,0),
(478,170,'Table 01','Sub Total',33.9600,0,0),
(479,170,'total','Order Total',33.9600,0,0),
(480,171,'subtotal','Table 01',0.0000,0,0),
(481,171,'Table 01','Sub Total',69.8500,0,0),
(482,171,'total','Order Total',69.8500,0,0),
(483,172,'subtotal','Table 01',0.0000,0,0),
(484,172,'Table 01','Sub Total',69.8500,0,0),
(485,172,'total','Order Total',69.8500,0,0),
(486,173,'subtotal','Table 01',0.0000,0,0),
(487,173,'Table 01','Sub Total',69.8500,0,0),
(488,173,'total','Order Total',69.8500,0,0),
(489,174,'subtotal','Table 01',0.0000,0,0),
(490,174,'Table 01','Sub Total',69.9300,0,0),
(491,174,'total','Order Total',69.9300,0,0),
(492,175,'subtotal','Pick-up',0.0000,0,0),
(493,175,'Pick-up','Sub Total',83.8600,0,0),
(494,175,'total','Order Total',83.8600,0,0),
(495,176,'subtotal','Table 01',0.0000,0,0),
(496,176,'Table 01','Sub Total',115.7700,0,0),
(497,176,'total','Order Total',115.7700,0,0),
(498,177,'subtotal','Table 01',0.0000,0,0),
(499,177,'Table 01','Sub Total',96.7800,0,0),
(500,177,'total','Order Total',96.7800,0,0),
(501,178,'subtotal','Pick-up',0.0000,0,0),
(502,178,'Pick-up','Sub Total',104.9100,0,0),
(503,178,'total','Order Total',104.9100,0,0),
(504,179,'subtotal','Delivery',0.0000,0,0),
(505,179,'Delivery','Sub Total',59.9500,0,0),
(506,179,'total','Order Total',59.9500,0,0),
(507,180,'subtotal','Pick-up',0.0000,0,0),
(508,180,'Pick-up','Sub Total',59.9500,0,0),
(509,180,'total','Order Total',59.9500,0,0),
(510,181,'subtotal','Delivery',0.0000,0,0),
(511,181,'Delivery','Sub Total',79.8900,0,0),
(512,181,'total','Order Total',79.8900,0,0),
(513,182,'subtotal','Delivery',0.0000,0,0),
(514,182,'Delivery','Sub Total',68.9300,0,0),
(515,182,'total','Order Total',68.9300,0,0),
(516,183,'subtotal','Delivery',0.0000,0,0),
(517,183,'Delivery','Sub Total',134.8100,0,0),
(518,183,'total','Order Total',134.8100,0,0),
(519,184,'subtotal','Delivery',0.0000,0,0),
(520,184,'Delivery','Sub Total',69.8500,0,0),
(521,184,'total','Order Total',69.8500,0,0),
(522,185,'subtotal','Delivery',0.0000,0,0),
(523,185,'Delivery','Sub Total',96.9100,0,0),
(524,185,'total','Order Total',96.9100,0,0),
(525,186,'subtotal','Delivery',0.0000,0,0),
(526,186,'Delivery','Sub Total',62.8600,0,0),
(527,186,'total','Order Total',62.8600,0,0),
(528,187,'subtotal','Table 01',0.0000,0,0),
(529,187,'Table 01','Sub Total',51.9300,0,0),
(530,187,'total','Order Total',51.9300,0,0),
(531,188,'subtotal','Table 05',0.0000,0,0),
(532,188,'Table 05','Sub Total',74.8100,0,0),
(533,188,'total','Order Total',74.8100,0,0),
(534,189,'subtotal','Table 01',0.0000,0,0),
(535,189,'Table 01','Sub Total',43.8700,0,0),
(536,189,'total','Order Total',43.8700,0,0),
(537,190,'subtotal','Subtotal',34.9700,1,1),
(538,190,'service','Service (10%)',3.4970,2,1),
(539,190,'tip','Tip',5.2455,3,1),
(540,190,'total','Total',43.7125,4,0),
(541,191,'subtotal','Subtotal',23.0000,1,1),
(542,191,'service','Service (10%)',2.3000,2,1),
(543,191,'tip','Tip',3.4500,3,1),
(544,191,'total','Total',28.7500,4,0),
(545,192,'subtotal','Subtotal',9.9900,1,1),
(546,192,'service','Service (10%)',0.9990,2,1),
(547,192,'tip','Tip',1.4985,3,1),
(548,192,'total','Total',12.4875,4,0),
(549,193,'subtotal','Subtotal',21.9800,1,1),
(550,193,'service','Service (10%)',2.1980,2,1),
(551,193,'tip','Tip',3.2970,3,1),
(552,193,'total','Total',27.4750,4,0),
(553,194,'subtotal','Subtotal',24.0000,1,1),
(554,194,'service','Service (10%)',2.4000,2,1),
(555,194,'tip','Tip',3.6000,3,1),
(556,194,'total','Total',30.0000,4,0),
(557,195,'subtotal','Subtotal',23.9900,1,1),
(558,195,'service','Service (10%)',2.3990,2,1),
(559,195,'tip','Tip',3.5985,3,1),
(560,195,'total','Total',29.9875,4,0),
(561,196,'subtotal','Subtotal',11.9900,1,1),
(562,196,'service','Service (10%)',1.1990,2,1),
(563,196,'tip','Tip',1.7985,3,1),
(564,196,'total','Total',14.9875,4,0),
(565,197,'subtotal','Subtotal',11.9900,1,1),
(566,197,'service','Service (10%)',1.1990,2,1),
(567,197,'tip','Tip',1.7985,3,1),
(568,197,'total','Total',14.9875,4,0),
(569,198,'subtotal','Subtotal',11.9900,1,1),
(570,198,'service','Service (10%)',1.1990,2,1),
(571,198,'tip','Tip',1.7985,3,1),
(572,198,'total','Total',14.9875,4,0),
(573,199,'subtotal','Subtotal',35.9700,1,1),
(574,199,'service','Service (10%)',3.5970,2,1),
(575,199,'tip','Tip',5.3955,3,1),
(576,199,'total','Total',44.9625,4,0),
(577,200,'subtotal','Subtotal',11.9900,1,1),
(578,200,'service','Service (10%)',1.1990,2,1),
(579,200,'tip','Tip',1.7985,3,1),
(580,200,'total','Total',14.9875,4,0),
(581,201,'subtotal','Subtotal',11.9900,1,1),
(582,201,'service','Service (10%)',1.1990,2,1),
(583,201,'tip','Tip',1.7985,3,1),
(584,201,'total','Total',14.9875,4,0),
(585,202,'subtotal','Subtotal',23.9900,1,1),
(586,202,'service','Service (10%)',2.3990,2,1),
(587,202,'tip','Tip',3.5985,3,1),
(588,202,'total','Total',29.9875,4,0),
(589,203,'subtotal','Subtotal',11.9900,1,1),
(590,203,'service','Service (10%)',1.1990,2,1),
(591,203,'tip','Tip',1.7985,3,1),
(592,203,'total','Total',14.9875,4,0),
(593,204,'subtotal','Subtotal',16.9800,1,1),
(594,204,'service','Service (10%)',1.6980,2,1),
(595,204,'tip','Tip',2.5470,3,1),
(596,204,'total','Total',21.2250,4,0),
(597,205,'subtotal','Subtotal',57.9700,1,1),
(598,205,'service','Service (10%)',5.7970,2,1),
(599,205,'tip','Tip',8.6955,3,1),
(600,205,'total','Total',72.4625,4,0),
(601,206,'subtotal','Subtotal',7.9900,1,1),
(602,206,'service','Service (10%)',0.7990,2,1),
(603,206,'tip','Tip',1.1985,3,1),
(604,206,'total','Total',9.9875,4,0),
(605,207,'subtotal','Subtotal',23.9800,1,1),
(606,207,'service','Service (10%)',2.3980,2,1),
(607,207,'tip','Tip',3.5970,3,1),
(608,207,'total','Total',29.9750,4,0),
(609,208,'subtotal','Subtotal',11.9900,1,1),
(610,208,'service','Service (10%)',1.1990,2,1),
(611,208,'tip','Tip',1.7985,3,1),
(612,208,'total','Total',14.9875,4,0),
(613,209,'subtotal','Subtotal',28.9300,1,1),
(614,209,'service','Service (10%)',2.8930,2,1),
(615,209,'tip','Tip',4.3395,3,1),
(616,209,'total','Total',36.1625,4,0),
(617,210,'subtotal','Subtotal',21.9800,1,1),
(618,210,'service','Service (10%)',2.1980,2,1),
(619,210,'tip','Tip',3.2970,3,1),
(620,210,'total','Total',27.4750,4,0),
(621,211,'subtotal','Subtotal',40.9700,1,1),
(622,211,'service','Service (10%)',4.0970,2,1),
(623,211,'tip','Tip',6.1455,3,1),
(624,211,'total','Total',51.2125,4,0),
(625,212,'subtotal','Subtotal',28.9300,1,1),
(626,212,'service','Service (10%)',2.8930,2,1),
(627,212,'tip','Tip',4.3395,3,1),
(628,212,'total','Total',36.1625,4,0),
(629,213,'subtotal','Subtotal',57.9500,1,1),
(630,213,'service','Service (10%)',5.7950,2,1),
(631,213,'tip','Tip',8.6925,3,1),
(632,213,'total','Total',72.4375,4,0),
(633,214,'subtotal','Subtotal',21.9800,1,1),
(634,214,'service','Service (10%)',2.1980,2,1),
(635,214,'tip','Tip',3.2970,3,1),
(636,214,'total','Total',27.4750,4,0),
(637,215,'subtotal','Subtotal',23.9800,1,1),
(638,215,'service','Service (10%)',2.3980,2,1),
(639,215,'tip','Tip',4.7960,3,1),
(640,215,'total','Total',31.1740,4,0),
(641,216,'subtotal','Subtotal',43.9300,1,1),
(642,216,'service','Service (10%)',4.3930,2,1),
(643,216,'tip','Tip',6.5895,3,1),
(644,216,'total','Total',54.9125,4,0),
(645,217,'subtotal','',0.0000,0,0),
(646,217,'','Sub Total',36.9800,0,0),
(647,217,'total','Order Total',36.9800,0,0),
(648,218,'subtotal','',0.0000,0,0),
(649,218,'','Sub Total',36.9800,0,0),
(650,218,'total','Order Total',36.9800,0,0),
(651,219,'subtotal','',0.0000,0,0),
(652,219,'','Sub Total',24.9800,0,0),
(653,219,'total','Order Total',24.9800,0,0),
(654,220,'subtotal','',0.0000,0,0),
(655,220,'','Sub Total',6.0000,0,0),
(656,220,'total','Order Total',6.0000,0,0),
(657,221,'subtotal','',0.0000,0,0),
(658,221,'','Sub Total',25.9900,0,0),
(659,221,'total','Order Total',25.9900,0,0),
(660,222,'subtotal','Table 12',0.0000,0,0),
(661,222,'Table 12','Sub Total',45.8900,0,0),
(662,222,'total','Order Total',45.8900,0,0),
(663,223,'subtotal','Subtotal',36.9800,1,1),
(664,223,'service','Service (10%)',3.6980,2,1),
(665,223,'tip','Tip',5.5470,3,1),
(666,223,'total','Total',46.2250,4,0),
(667,224,'subtotal','Table 63',0.0000,0,0),
(668,224,'Table 63','Sub Total',38.9900,0,0),
(669,224,'total','Order Total',38.9900,0,0),
(670,225,'subtotal','Table 87',0.0000,0,0),
(671,225,'Table 87','Sub Total',52.9200,0,0),
(672,225,'total','Order Total',52.9200,0,0),
(673,226,'subtotal','Table 2',0.0000,0,0),
(674,226,'Table 2','Sub Total',79.9700,0,0),
(675,226,'total','Order Total',79.9700,0,0),
(676,227,'subtotal','Subtotal',34.5000,1,1),
(677,227,'service','Service (10%)',3.4500,2,1),
(678,227,'tip','Tip',5.1750,3,1),
(679,227,'total','Total',43.1250,4,0),
(680,228,'subtotal','Subtotal',21.9800,1,1),
(681,228,'service','Service (10%)',2.1980,2,1),
(682,228,'tip','Tip',3.2970,3,1),
(683,228,'total','Total',27.4750,4,0),
(684,229,'subtotal','Table 11',0.0000,0,0),
(685,229,'Table 11','Sub Total',62.8800,0,0),
(686,229,'total','Order Total',62.8800,0,0),
(687,230,'subtotal','Table 32',0.0000,0,0),
(688,230,'Table 32','Sub Total',24.9800,0,0),
(689,230,'total','Order Total',24.9800,0,0),
(690,231,'subtotal','Table 3',0.0000,0,0),
(691,231,'Table 3','Sub Total',25.9400,0,0),
(692,231,'total','Order Total',25.9400,0,0),
(693,232,'subtotal','Cashier',0.0000,0,0),
(694,232,'Cashier','Sub Total',46.9200,0,0),
(695,232,'total','Order Total',46.9200,0,0),
(696,233,'subtotal','Cashier',0.0000,0,0),
(697,233,'Cashier','Sub Total',49.9300,0,0),
(698,233,'total','Order Total',49.9300,0,0),
(699,234,'subtotal','Cashier',0.0000,0,0),
(700,234,'Cashier','Sub Total',38.9200,0,0),
(701,234,'total','Order Total',38.9200,0,0),
(702,236,'subtotal','Subtotal',11.9900,1,1),
(703,236,'service','Service (10%)',1.1990,2,1),
(704,236,'tip','Tip',1.7985,3,1),
(705,236,'total','Total',14.9875,4,0),
(706,238,'subtotal','Table 66',0.0000,0,0),
(707,238,'Table 66','Sub Total',2.0000,0,0),
(708,238,'total','Order Total',2.0000,0,0),
(709,242,'subtotal','Table 34',0.0000,0,0),
(710,242,'Table 34','Sub Total',2.0000,0,0),
(711,242,'total','Order Total',2.0000,0,0),
(712,243,'subtotal','Subtotal',35.9900,1,1),
(713,243,'service','Service (10%)',3.5990,2,1),
(714,243,'tip','Tip',5.3985,3,1),
(715,243,'total','Total',44.9875,4,0),
(716,244,'subtotal','Subtotal',9.9900,1,1),
(717,244,'service','Service (10%)',0.9990,2,1),
(718,244,'total','Total',10.9890,4,0),
(719,245,'subtotal','Table 20',0.0000,0,0),
(720,245,'Table 20','Sub Total',15.0000,0,0),
(721,245,'total','Order Total',15.0000,0,0),
(722,246,'subtotal','Table 20',0.0000,0,0),
(723,246,'Table 20','Sub Total',15.0000,0,0),
(724,246,'total','Order Total',15.0000,0,0),
(725,248,'subtotal','Subtotal',59.9500,1,1),
(726,248,'service','Service (10%)',5.9950,2,1),
(727,248,'total','Total',65.9450,4,0),
(728,249,'subtotal','Subtotal',40.2864,1,1),
(729,249,'service','Service (10%)',4.0286,2,1),
(730,249,'total','Total',44.3150,4,0),
(731,250,'subtotal','Subtotal',134.2992,1,1),
(732,250,'service','Service (10%)',13.4299,2,1),
(733,250,'total','Total',147.7291,4,0),
(734,251,'subtotal','Subtotal',53.7600,1,1),
(735,251,'service','Service (10%)',5.3760,2,1),
(736,251,'total','Total',59.1360,4,0),
(737,252,'subtotal','Subtotal',13.4288,1,1),
(738,252,'service','Service (10%)',1.3429,2,1),
(739,252,'total','Total',14.7717,4,0),
(740,253,'subtotal','Subtotal',19.0400,1,1),
(741,253,'service','Service (10%)',1.9040,2,1),
(742,253,'total','Total',20.9440,4,0),
(743,254,'subtotal','Table 55',0.0000,0,0),
(744,254,'Table 55','Sub Total',11.9900,0,0),
(745,254,'total','Order Total',11.9900,0,0),
(746,263,'subtotal','Subtotal',19.0400,1,1),
(747,263,'service','Service (10%)',1.9040,2,1),
(748,263,'total','Total',20.9440,4,0),
(749,266,'subtotal','Subtotal',19.0400,1,1),
(750,266,'service','Service (10%)',1.9040,2,1),
(751,266,'total','Total',20.9440,4,0),
(752,269,'subtotal','Subtotal',13.2000,1,1),
(753,269,'service','Service (10%)',1.3200,2,1),
(754,269,'total','Total',14.5200,4,0),
(755,270,'subtotal','Subtotal',92.3780,1,1),
(756,270,'service','Service (10%)',9.2378,2,1),
(757,270,'total','Total',101.6158,4,0),
(758,271,'subtotal','Subtotal',10.9890,1,1),
(759,271,'service','Service (10%)',1.0989,2,1),
(760,271,'total','Total',12.0879,4,0),
(761,283,'subtotal','Table 33',0.0000,0,0),
(762,283,'Table 33','Sub Total',12.0000,0,0),
(763,283,'total','Order Total',12.0000,0,0),
(764,284,'subtotal','Table 33',0.0000,0,0),
(765,284,'Table 33','Sub Total',12.0000,0,0),
(766,284,'total','Order Total',12.0000,0,0),
(767,285,'subtotal','Table 63',0.0000,0,0),
(768,285,'Table 63','Sub Total',12.0000,0,0),
(769,285,'total','Order Total',12.0000,0,0),
(770,286,'subtotal','Table 63',0.0000,0,0),
(771,286,'Table 63','Sub Total',12.0000,0,0),
(772,286,'total','Order Total',12.0000,0,0),
(773,287,'subtotal','Table 63',0.0000,0,0),
(774,287,'Table 63','Sub Total',5.9900,0,0),
(775,287,'total','Order Total',5.9900,0,0),
(776,288,'subtotal','Table 12',0.0000,0,0),
(777,288,'Table 12','Sub Total',20.9900,0,0),
(778,288,'total','Order Total',20.9900,0,0),
(779,289,'subtotal','Table 12',0.0000,0,0),
(780,289,'Table 12','Sub Total',20.9900,0,0),
(781,289,'total','Order Total',20.9900,0,0),
(782,290,'subtotal','Table 12',0.0000,0,0),
(783,290,'Table 12','Sub Total',20.9900,0,0),
(784,290,'total','Order Total',20.9900,0,0),
(785,291,'subtotal','Table 12',0.0000,0,0),
(786,291,'Table 12','Sub Total',20.9900,0,0),
(787,291,'total','Order Total',20.9900,0,0),
(788,292,'subtotal','Table 12',0.0000,0,0),
(789,292,'Table 12','Sub Total',20.9900,0,0),
(790,292,'total','Order Total',20.9900,0,0),
(791,293,'subtotal','Subtotal',2.0000,1,1),
(792,293,'tax','Tax',0.2000,2,1),
(793,293,'total','Total',2.2000,5,0),
(794,294,'subtotal','Subtotal',2.0000,1,1),
(795,294,'tax','Tax',0.2000,2,1),
(796,294,'tip','Tip',0.4000,3,1),
(797,294,'total','Total',2.6000,5,0),
(798,295,'subtotal','Subtotal',2.0000,1,1),
(799,295,'tax','Tax',0.2000,2,1),
(800,295,'tip','Tip',0.4000,3,1),
(801,295,'total','Total',2.6000,5,0),
(802,296,'subtotal','Subtotal',2.0000,1,1),
(803,296,'tax','Tax',0.2000,2,1),
(804,296,'tip','Tip',0.4000,3,1),
(805,296,'total','Total',2.6000,5,0),
(810,297,'subtotal','Subtotal',12.0000,1,1),
(811,297,'tax','Tax',1.8900,2,1),
(812,297,'total','Total',23.8900,5,0),
(813,298,'subtotal','Subtotal',23.9400,1,1),
(814,298,'tax','Tax',2.3900,2,1),
(815,298,'tip','Tip',7.6700,3,1),
(816,298,'total','Total',59.9400,5,0),
(817,299,'subtotal','Subtotal',1450.0000,1,1),
(818,299,'tax','Tax',5.0000,2,1),
(819,299,'tip','Tip',10.0000,3,1),
(820,299,'total','Total',1465.0000,5,0),
(821,300,'subtotal','Subtotal',100.7500,1,1),
(822,300,'service','Service (10%)',10.0750,2,1),
(823,300,'tip','Tip',10.4225,3,1),
(824,300,'total','Total',121.2475,4,0),
(825,301,'subtotal','Subtotal',2.0000,1,1),
(826,301,'tax','Tax',0.2000,2,1),
(827,301,'tip','Tip',0.4000,3,1),
(828,301,'total','Total',2.6000,5,0),
(829,302,'subtotal','Subtotal',100.0000,1,1),
(830,302,'tax','Tax',10.0000,2,1),
(831,302,'tip','Tip',20.0000,3,1),
(832,302,'total','Total',230.0000,5,0),
(833,303,'subtotal','Subtotal',66.0000,1,1),
(834,303,'service','Service (10%)',6.6000,2,1),
(835,303,'tip','Tip',6.6000,3,1),
(836,303,'total','Total',79.2000,4,0),
(837,304,'subtotal','Subtotal',79.1670,1,1),
(838,304,'service','Service (10%)',7.9167,2,1),
(839,304,'total','Total',87.0837,4,0),
(840,305,'subtotal','Subtotal',13.2000,1,1),
(841,305,'service','Service (10%)',1.3200,2,1),
(842,305,'total','Total',14.5200,4,0),
(843,306,'subtotal','Subtotal',0.0000,1,1),
(844,306,'tax','Tax',4.0000,2,1),
(845,306,'tip','Tip',8.0000,3,1),
(846,306,'total','Total',22.0000,5,0),
(847,307,'subtotal','Subtotal',22.0000,1,1),
(848,307,'tax','Tax',2.4000,2,1),
(849,307,'tip','Tip',4.8000,3,1),
(850,307,'total','Total',58.2000,5,0),
(851,308,'subtotal','Subtotal',98.8900,1,1),
(852,308,'tax','Tax',9.8900,2,1),
(853,308,'total','Total',108.7800,5,0),
(854,309,'subtotal','Subtotal',26.4000,1,1),
(855,309,'service','Service (10%)',2.6400,2,1),
(856,309,'total','Total',29.0400,4,0),
(857,310,'subtotal','Subtotal',13.2000,1,1),
(858,310,'service','Service (10%)',1.3200,2,1),
(859,310,'total','Total',14.5200,4,0),
(860,311,'subtotal','Subtotal',62.0000,1,1),
(861,311,'tax','Tax',6.2000,2,1),
(862,311,'tip','Tip',12.4000,3,1),
(863,311,'total','Total',80.6000,5,0),
(864,312,'subtotal','Subtotal',37.9200,1,1),
(865,312,'tax','Tax',3.7900,2,1),
(866,312,'total','Total',41.7100,5,0);
/*!40000 ALTER TABLE `ti_order_totals` ENABLE KEYS */;
UNLOCK TABLES;

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
) ENGINE=InnoDB AUTO_INCREMENT=313 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ti_orders`
--

LOCK TABLES `ti_orders` WRITE;
/*!40000 ALTER TABLE `ti_orders` DISABLE KEYS */;
INSERT INTO `ti_orders` VALUES
(307,NULL,'Chief','Admin','chiefadmin@example.com','1234567890',1,1,'',2,NULL,'cod','Table 12','2025-12-05 20:06:07','2025-12-05 20:07:10','20:06:07','2025-12-05',58.2000,1,'172.226.108.4','Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Safari/605.1.15',NULL,NULL,'INV-2025-00','2025-12-05 20:06:07','10bffdadc1d1dc389e14c37dcc94afb4',1,NULL,NULL,1,NULL,'0'),
(308,NULL,'Chief','Admin','chiefadmin@example.com','1234567890',1,1,'',11,NULL,'cod','Table 3','2025-12-05 20:06:20','2025-12-05 20:07:10','20:06:20','2025-12-05',108.7800,1,'172.226.108.4','Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Safari/605.1.15',NULL,NULL,'INV-2025-00','2025-12-05 20:06:20','24ed1c50b76a2a62e41ede5ddd89aabd',1,NULL,NULL,1,NULL,'0'),
(309,1,'Table Unknown Customer','','','',1,NULL,'[{\"menu_id\":10,\"name\":\"AMALA\",\"quantity\":1,\"price\":13.200000000000001,\"special_instructions\":\"\",\"options\":[]},{\"menu_id\":3,\"name\":\"ATA RICE\",\"quantity\":1,\"price\":13.200000000000001,\"special_instructions\":\"\",\"options\":[]}]',2,'','cod','7','2025-12-05 23:47:04','2025-12-05 23:47:04','23:47:04','2025-12-05',26.4000,1,'','',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,NULL,'dine_in'),
(310,1,'Table 12 Customer','','','',1,NULL,'[{\"menu_id\":3,\"name\":\"ATA RICE\",\"quantity\":1,\"price\":13.200000000000001,\"special_instructions\":\"\",\"options\":[]}]',1,'','cod','41','2025-12-05 23:47:50','2025-12-05 23:48:05','23:47:50','2025-12-05',13.2000,3,'','',NULL,NULL,NULL,NULL,NULL,NULL,'2025-12-05 23:48:05',NULL,1,NULL,'dine_in'),
(311,NULL,'Chief','Admin','chiefadmin@example.com','1234567890',1,1,'',3,NULL,'cod','Table 3','2025-12-06 01:03:14','2025-12-06 01:03:14','01:03:14','2025-12-06',80.6000,1,'172.226.108.13','Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Safari/605.1.15',NULL,NULL,'INV-2025-00','2025-12-06 01:03:14','e26d4183f34625e67284c7de95d7d991',1,NULL,NULL,1,NULL,'0'),
(312,NULL,'Chief','Admin','chiefadmin@example.com','1234567890',1,1,'',3,NULL,'cod','Table 11','2025-12-06 09:01:07','2025-12-06 09:01:07','09:01:07','2025-12-06',41.7100,1,'50.60.171.134','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36',NULL,NULL,'INV-2025-00','2025-12-06 09:01:07','f4fc7f49a1783bc6a161913022558201',1,NULL,NULL,1,NULL,'0');
/*!40000 ALTER TABLE `ti_orders` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `ti_pages`
--

LOCK TABLES `ti_pages` WRITE;
/*!40000 ALTER TABLE `ti_pages` DISABLE KEYS */;
INSERT INTO `ti_pages` VALUES
(1,1,'About Us','Lorem ipsum dolor sit amet, consectetur adipiscing elit.','','','2024-12-31 19:17:37','2024-12-31 19:17:37',1,'about-us','static','{\"navigation\":\"0\"}',NULL),
(2,1,'Policy','Lorem ipsum dolor sit amet, consectetur adipiscing elit.','','','2024-12-31 19:17:37','2024-12-31 19:17:37',1,'policy','static','{\"navigation\":\"0\"}',NULL),
(3,1,'Terms and Conditions','Lorem ipsum dolor sit amet, consectetur adipiscing elit.','','','2024-12-31 19:17:37','2024-12-31 19:17:37',1,'terms-and-conditions','static','{\"navigation\":\"0\"}',NULL);
/*!40000 ALTER TABLE `ti_pages` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `ti_payment_logs`
--

LOCK TABLES `ti_payment_logs` WRITE;
/*!40000 ALTER TABLE `ti_payment_logs` DISABLE KEYS */;
INSERT INTO `ti_payment_logs` VALUES
(1,7,'Stripe Payment','Payment error -> Missing payment intent identifier in session.','{\"_token\":\"tOGMWCSNJs5ogtUenrPzuaiRudCdS7bkOOiuKqbK\",\"first_name\":\"Chief\",\"last_name\":\"Admin\",\"email\":\"example@gmail.com\",\"telephone\":\"12345678\",\"address_id\":\"0\",\"address\":{\"address_id\":\"\",\"address_1\":\"Null\",\"address_2\":\"Null\",\"city\":\"Null\",\"state\":\"Null\",\"postcode\":\"Null\",\"country_id\":\"81\"},\"payment\":\"stripe\",\"stripe_payment_method\":\"\",\"stripe_idempotency_key\":\"67953f8cb0ece1.88029591\",\"comment\":\"\",\"delivery_comment\":\"\",\"cancelPage\":\"checkout\\/checkout\",\"successPage\":\"checkout\\/success\"}','[]',0,'2025-01-25 19:46:24','2025-01-25 19:46:24','stripe',0,NULL),
(2,7,'PayPal Express','Payment error -> You do not have permissions to make this API call','{\"amount\":\"24.98\",\"transactionId\":7,\"currency\":\"EUR\",\"cancelUrl\":\"http:\\/\\/197.140.11.160:8012\\/ti_payregister\\/paypal_cancel_url\\/e9589cf775e7ab3988736ae7c44abcef?redirect=checkout\\/checkout\",\"returnUrl\":\"http:\\/\\/197.140.11.160:8012\\/ti_payregister\\/paypal_return_url\\/e9589cf775e7ab3988736ae7c44abcef?redirect=checkout\\/success&cancel=checkout\\/checkout\"}','{\"TIMESTAMP\":\"2025-01-25T19:46:47Z\",\"CORRELATIONID\":\"a13dc6b314727\",\"ACK\":\"Failure\",\"VERSION\":\"119.0\",\"BUILD\":\"58807128\",\"L_ERRORCODE0\":\"10002\",\"L_SHORTMESSAGE0\":\"Authentication\\/Authorization Failed\",\"L_LONGMESSAGE0\":\"You do not have permissions to make this API call\",\"L_SEVERITYCODE0\":\"Error\"}',0,'2025-01-25 19:46:47','2025-01-25 19:46:47','paypalexpress',0,NULL),
(3,7,'PayPal Express','Payment error -> You do not have permissions to make this API call','{\"amount\":\"24.98\",\"transactionId\":7,\"currency\":\"EUR\",\"cancelUrl\":\"http:\\/\\/197.140.11.160:8012\\/ti_payregister\\/paypal_cancel_url\\/e9589cf775e7ab3988736ae7c44abcef?redirect=checkout\\/checkout\",\"returnUrl\":\"http:\\/\\/197.140.11.160:8012\\/ti_payregister\\/paypal_return_url\\/e9589cf775e7ab3988736ae7c44abcef?redirect=checkout\\/success&cancel=checkout\\/checkout\"}','[]',0,'2025-01-25 19:46:47','2025-01-25 19:46:47','paypalexpress',0,NULL),
(4,7,'PayPal Express','Payment error -> You do not have permissions to make this API call','{\"amount\":\"24.98\",\"transactionId\":7,\"currency\":\"EUR\",\"cancelUrl\":\"http:\\/\\/197.140.11.160:8012\\/ti_payregister\\/paypal_cancel_url\\/e9589cf775e7ab3988736ae7c44abcef?redirect=checkout\\/checkout\",\"returnUrl\":\"http:\\/\\/197.140.11.160:8012\\/ti_payregister\\/paypal_return_url\\/e9589cf775e7ab3988736ae7c44abcef?redirect=checkout\\/success&cancel=checkout\\/checkout\"}','{\"TIMESTAMP\":\"2025-01-25T19:46:47Z\",\"CORRELATIONID\":\"446297678e52b\",\"ACK\":\"Failure\",\"VERSION\":\"119.0\",\"BUILD\":\"58807128\",\"L_ERRORCODE0\":\"10002\",\"L_SHORTMESSAGE0\":\"Authentication\\/Authorization Failed\",\"L_LONGMESSAGE0\":\"You do not have permissions to make this API call\",\"L_SEVERITYCODE0\":\"Error\"}',0,'2025-01-25 19:46:47','2025-01-25 19:46:47','paypalexpress',0,NULL),
(5,7,'PayPal Express','Payment error -> You do not have permissions to make this API call','{\"amount\":\"24.98\",\"transactionId\":7,\"currency\":\"EUR\",\"cancelUrl\":\"http:\\/\\/197.140.11.160:8012\\/ti_payregister\\/paypal_cancel_url\\/e9589cf775e7ab3988736ae7c44abcef?redirect=checkout\\/checkout\",\"returnUrl\":\"http:\\/\\/197.140.11.160:8012\\/ti_payregister\\/paypal_return_url\\/e9589cf775e7ab3988736ae7c44abcef?redirect=checkout\\/success&cancel=checkout\\/checkout\"}','[]',0,'2025-01-25 19:46:47','2025-01-25 19:46:47','paypalexpress',0,NULL),
(6,106,'PayPal Express','Payment error -> You do not have permissions to make this API call','{\"amount\":\"47.93\",\"transactionId\":106,\"currency\":\"EUR\",\"cancelUrl\":\"http:\\/\\/197.140.11.160:8012\\/ti_payregister\\/paypal_cancel_url\\/8b55c39ce30b53b5bbd634f6499e4e26?redirect=checkout\\/checkout\",\"returnUrl\":\"http:\\/\\/197.140.11.160:8012\\/ti_payregister\\/paypal_return_url\\/8b55c39ce30b53b5bbd634f6499e4e26?redirect=checkout\\/success&cancel=checkout\\/checkout\"}','{\"TIMESTAMP\":\"2025-03-01T19:02:57Z\",\"CORRELATIONID\":\"67c56467ac786\",\"ACK\":\"Failure\",\"VERSION\":\"119.0\",\"BUILD\":\"58807128\",\"L_ERRORCODE0\":\"10002\",\"L_SHORTMESSAGE0\":\"Authentication\\/Authorization Failed\",\"L_LONGMESSAGE0\":\"You do not have permissions to make this API call\",\"L_SEVERITYCODE0\":\"Error\"}',0,'2025-03-01 19:02:58','2025-03-01 19:02:58','paypalexpress',0,NULL),
(7,106,'PayPal Express','Payment error -> You do not have permissions to make this API call','{\"amount\":\"47.93\",\"transactionId\":106,\"currency\":\"EUR\",\"cancelUrl\":\"http:\\/\\/197.140.11.160:8012\\/ti_payregister\\/paypal_cancel_url\\/8b55c39ce30b53b5bbd634f6499e4e26?redirect=checkout\\/checkout\",\"returnUrl\":\"http:\\/\\/197.140.11.160:8012\\/ti_payregister\\/paypal_return_url\\/8b55c39ce30b53b5bbd634f6499e4e26?redirect=checkout\\/success&cancel=checkout\\/checkout\"}','[]',0,'2025-03-01 19:02:58','2025-03-01 19:02:58','paypalexpress',0,NULL);
/*!40000 ALTER TABLE `ti_payment_logs` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `ti_payment_profiles`
--

LOCK TABLES `ti_payment_profiles` WRITE;
/*!40000 ALTER TABLE `ti_payment_profiles` DISABLE KEYS */;
/*!40000 ALTER TABLE `ti_payment_profiles` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `ti_payments`
--

LOCK TABLES `ti_payments` WRITE;
/*!40000 ALTER TABLE `ti_payments` DISABLE KEYS */;
INSERT INTO `ti_payments` VALUES
(1,'Cash On Delivery','cod','','Accept cash on delivery during checkout',NULL,1,1,1,'2024-12-31 19:17:38','2025-09-26 01:08:31'),
(2,'PayPal Express','paypalexpress','','Allows your customers to make payment using PayPal',NULL,1,0,2,'2024-12-31 19:17:38','2025-10-18 19:12:06'),
(3,'Authorize.Net (AIM)','authorizenetaim','Igniter\\PayRegister\\Payments\\AuthorizeNetAim','Accept credit card payments though Authorize.Net','{\"order_fee\": 0, \"client_key\": \"\", \"order_total\": \"0.00\", \"api_login_id\": \"\", \"order_status\": \"1\", \"accepted_cards\": [\"visa\", \"mastercard\", \"american_express\", \"jcb\", \"diners_club\"], \"order_fee_type\": \"1\", \"transaction_key\": \"\", \"transaction_mode\": \"test\", \"transaction_type\": \"auth_capture\"}',1,0,3,'2024-12-31 19:17:38','2025-01-20 08:56:23'),
(4,'Stripe Payment','stripe','Igniter\\PayRegister\\Payments\\Stripe','Accept credit card payments using Stripe','{\"order_fee\": \"0.00\", \"locale_code\": \"\", \"order_total\": \"0.00\", \"order_status\": \"1\", \"order_fee_type\": \"1\", \"live_secret_key\": \"\", \"test_secret_key\": \"\", \"transaction_mode\": \"test\", \"transaction_type\": \"auth_capture\", \"live_webhook_secret\": \"\", \"test_webhook_secret\": \"\", \"live_publishable_key\": \"\", \"test_publishable_key\": \"\"}',1,0,4,'2024-12-31 19:17:38','2025-01-20 08:56:31'),
(5,'Mollie Payment','mollie','','Accept credit card payments using Mollie API',NULL,1,0,5,'2024-12-31 19:17:38','2025-10-01 15:33:00'),
(6,'Square Payment','square','','Accept credit card payments using Square',NULL,1,0,6,'2024-12-31 19:17:38','2025-10-01 15:33:17');
/*!40000 ALTER TABLE `ti_payments` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `ti_pos_config_device`
--

LOCK TABLES `ti_pos_config_device` WRITE;
/*!40000 ALTER TABLE `ti_pos_config_device` DISABLE KEYS */;
/*!40000 ALTER TABLE `ti_pos_config_device` ENABLE KEYS */;
UNLOCK TABLES;

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
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ti_pos_configs`
--

LOCK TABLES `ti_pos_configs` WRITE;
/*!40000 ALTER TABLE `ti_pos_configs` DISABLE KEYS */;
INSERT INTO `ti_pos_configs` VALUES
(8,3,'https://sandbox.dev.clover.com/v3/merchants','660b4915-70f3-2648-b301-86483548811f','CDPMGHHT8HB61','berigo.dev@gmail.com','!@RicksonLucas1156',0,'2025-11-16 21:05:47','2025-11-16 21:05:47'),
(10,1,'https://connect.squareupsandbox.com','EAAAl6EWbaHfInWYXiMbtX566hUoq4O3GEHrXE2ixAf1P5qgOXsxokayF6qRqvZW','sandbox-sq0csb-tXFWWRt9btX46Xh97W_igh6VpklnBn8QcUuNmG3_RXM','ricksonl.berigo@outlook.com','!@RicksonLucas1156',1,'2025-11-21 12:32:57','2025-11-21 12:32:57'),
(11,2,'https://developerdemowfbgtp.retail.lightspeed.app','lsxs_pt_9Cw2RS8qUZyOgnTlZ1ppO4kBgXjVWzWm','developerdemowfbgtp','ricksonl.berigo@outlook.com','!@RicksonLucas1156',1,'2025-11-21 21:26:15','2025-11-21 21:26:15');
/*!40000 ALTER TABLE `ti_pos_configs` ENABLE KEYS */;
UNLOCK TABLES;

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
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ti_pos_devices`
--

LOCK TABLES `ti_pos_devices` WRITE;
/*!40000 ALTER TABLE `ti_pos_devices` DISABLE KEYS */;
INSERT INTO `ti_pos_devices` VALUES
(1,'Square','square','','Square is a modern and intuitive point-of-sale platform, ideal for small and medium-sized businesses. It allows you to manage sales, products, payments, and reports in real time. Its integration is simple and offers high reliability in transaction processing.','/square_logo.png','2025-10-06 23:47:36','2025-10-06 23:47:36'),
(2,'Lightspeed','lightspeed','','Lightspeed is a robust point-of-sale system designed for retail and restaurants. It offers advanced inventory management features, detailed reporting, and cloud synchronization, ensuring complete control over operations and an optimized sales experience.','/lightspeed_logo.png','2025-10-06 23:49:27','2025-10-06 23:49:27'),
(3,'Clover','clover','','Clover is a complete POS solution that combines hardware and software into a single ecosystem. Focused on flexibility and automation, it facilitates payments, customer management, and performance tracking with high security and convenience.','/clover_logo.webp','2025-10-06 23:50:46','2025-10-06 23:50:46'),
(4,'Clover','clover','','','','2025-11-15 12:22:09',NULL);
/*!40000 ALTER TABLE `ti_pos_devices` ENABLE KEYS */;
UNLOCK TABLES;

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ti_qr_code`
--

LOCK TABLES `ti_qr_code` WRITE;
/*!40000 ALTER TABLE `ti_qr_code` DISABLE KEYS */;
/*!40000 ALTER TABLE `ti_qr_code` ENABLE KEYS */;
UNLOCK TABLES;

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
) ENGINE=InnoDB AUTO_INCREMENT=420 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ti_request_logs`
--

LOCK TABLES `ti_request_logs` WRITE;
/*!40000 ALTER TABLE `ti_request_logs` DISABLE KEYS */;
INSERT INTO `ti_request_logs` VALUES
(1,'http://197.140.11.160:8004/admin*',404,NULL,1,'2025-01-04 13:51:39','2025-01-04 13:51:39'),
(2,'http://197.140.11.160:8004/HNAP1',404,'[\"http:\\/\\/197.140.11.160:8004\\/\"]',1,'2025-01-08 22:00:58','2025-01-08 22:00:58'),
(3,'http://197.140.11.160:8004/hudson/script',404,'[\"http:\\/\\/197.140.11.160:8004\\/\"]',1,'2025-01-08 22:01:00','2025-01-08 22:01:00'),
(4,'http://197.140.11.160:8004/script',404,'[\"http:\\/\\/197.140.11.160:8004\\/\"]',1,'2025-01-08 22:01:01','2025-01-08 22:01:01'),
(5,'http://197.140.11.160:8004/sqlite/main.php',404,'[\"http:\\/\\/197.140.11.160:8004\\/\"]',3,'2025-01-08 22:01:02','2025-01-08 22:01:04'),
(6,'http://197.140.11.160:8004/sqlitemanager/main.php',404,'[\"http:\\/\\/197.140.11.160:8004\\/\"]',2,'2025-01-08 22:01:02','2025-01-08 22:01:03'),
(7,'http://197.140.11.160:8004/main.php',404,'[\"http:\\/\\/197.140.11.160:8004\\/\"]',1,'2025-01-08 22:01:05','2025-01-08 22:01:05'),
(8,'http://197.140.11.160:8004/test/sqlite/SQLiteManager-1.2.0/SQLiteManager-1.2.0/main.php',404,'[\"http:\\/\\/197.140.11.160:8004\\/\"]',1,'2025-01-08 22:01:08','2025-01-08 22:01:08'),
(9,'http://197.140.11.160:8004/SQLiteManager-1.2.4/main.php',404,'[\"http:\\/\\/197.140.11.160:8004\\/\"]',1,'2025-01-08 22:01:11','2025-01-08 22:01:11'),
(10,'http://197.140.11.160:8004/agSearch/SQlite/main.php',404,'[\"http:\\/\\/197.140.11.160:8004\\/\"]',1,'2025-01-08 22:01:12','2025-01-08 22:01:12'),
(11,'http://197.140.11.160:8004/phpmyadmin',404,'[\"http:\\/\\/197.140.11.160:8004\\/\"]',2,'2025-01-08 22:01:13','2025-01-08 22:01:17'),
(12,'http://197.140.11.160:8004/PMA',404,'[\"http:\\/\\/197.140.11.160:8004\\/\"]',2,'2025-01-08 22:01:18','2025-01-08 22:01:20'),
(13,'http://197.140.11.160:8004/dbadmin',404,'[\"http:\\/\\/197.140.11.160:8004\\/\"]',1,'2025-01-08 22:01:22','2025-01-08 22:01:22'),
(14,'http://197.140.11.160:8004/mysql',404,'[\"http:\\/\\/197.140.11.160:8004\\/\"]',1,'2025-01-08 22:01:24','2025-01-08 22:01:24'),
(15,'http://197.140.11.160:8004/myadmin',404,'[\"http:\\/\\/197.140.11.160:8004\\/\"]',1,'2025-01-08 22:01:25','2025-01-08 22:01:25'),
(16,'http://197.140.11.160:8004/openserver/phpmyadmin',404,'[\"http:\\/\\/197.140.11.160:8004\\/\"]',1,'2025-01-08 22:01:27','2025-01-08 22:01:27'),
(17,'http://197.140.11.160:8004/phpmyadmin2',404,'[\"http:\\/\\/197.140.11.160:8004\\/\"]',2,'2025-01-08 22:01:28','2025-01-08 22:01:28'),
(18,'http://197.140.11.160:8004/phpMyAdmin-2',404,'[\"http:\\/\\/197.140.11.160:8004\\/\"]',1,'2025-01-08 22:01:29','2025-01-08 22:01:29'),
(19,'http://197.140.11.160:8004/php-my-admin',404,'[\"http:\\/\\/197.140.11.160:8004\\/\"]',1,'2025-01-08 22:01:29','2025-01-08 22:01:29'),
(20,'http://197.140.11.160:8004/phpMyAdmin-2.2.3',404,'[\"http:\\/\\/197.140.11.160:8004\\/\"]',1,'2025-01-08 22:01:30','2025-01-08 22:01:30'),
(21,'http://197.140.11.160:8004/phpMyAdmin-2.2.6',404,'[\"http:\\/\\/197.140.11.160:8004\\/\"]',1,'2025-01-08 22:01:30','2025-01-08 22:01:30'),
(22,'http://197.140.11.160:8004/phpMyAdmin-2.5.1',404,'[\"http:\\/\\/197.140.11.160:8004\\/\"]',1,'2025-01-08 22:01:31','2025-01-08 22:01:31'),
(23,'http://197.140.11.160:8004/phpMyAdmin-2.5.4',404,'[\"http:\\/\\/197.140.11.160:8004\\/\"]',1,'2025-01-08 22:01:31','2025-01-08 22:01:31'),
(24,'http://197.140.11.160:8004/phpMyAdmin-2.5.5-rc1',404,'[\"http:\\/\\/197.140.11.160:8004\\/\"]',1,'2025-01-08 22:01:32','2025-01-08 22:01:32'),
(25,'http://197.140.11.160:8004/phpMyAdmin-2.5.5-rc2',404,'[\"http:\\/\\/197.140.11.160:8004\\/\"]',1,'2025-01-08 22:01:33','2025-01-08 22:01:33'),
(26,'http://197.140.11.160:8004/phpMyAdmin-2.5.5',404,'[\"http:\\/\\/197.140.11.160:8004\\/\"]',1,'2025-01-08 22:01:33','2025-01-08 22:01:33'),
(27,'http://197.140.11.160:8004/phpMyAdmin-2.5.5-pl1',404,'[\"http:\\/\\/197.140.11.160:8004\\/\"]',1,'2025-01-08 22:01:34','2025-01-08 22:01:34'),
(28,'http://197.140.11.160:8004/phpMyAdmin-2.5.6-rc1',404,'[\"http:\\/\\/197.140.11.160:8004\\/\"]',1,'2025-01-08 22:01:35','2025-01-08 22:01:35'),
(29,'http://197.140.11.160:8004/phpMyAdmin-2.5.6-rc2',404,'[\"http:\\/\\/197.140.11.160:8004\\/\"]',1,'2025-01-08 22:01:36','2025-01-08 22:01:36'),
(30,'http://197.140.11.160:8004/phpMyAdmin-2.5.6',404,'[\"http:\\/\\/197.140.11.160:8004\\/\"]',1,'2025-01-08 22:01:36','2025-01-08 22:01:36'),
(31,'http://197.140.11.160:8004/phpMyAdmin-2.5.7',404,'[\"http:\\/\\/197.140.11.160:8004\\/\"]',1,'2025-01-08 22:01:37','2025-01-08 22:01:37'),
(32,'http://197.140.11.160:8004/phpMyAdmin-2.5.7-pl1',404,'[\"http:\\/\\/197.140.11.160:8004\\/\"]',1,'2025-01-08 22:01:37','2025-01-08 22:01:37'),
(33,'http://197.140.11.160:8004/phpMyAdmin-2.6.0-alpha',404,'[\"http:\\/\\/197.140.11.160:8004\\/\"]',1,'2025-01-08 22:01:38','2025-01-08 22:01:38'),
(34,'http://197.140.11.160:8004/phpMyAdmin-2.6.0-alpha2',404,'[\"http:\\/\\/197.140.11.160:8004\\/\"]',1,'2025-01-08 22:01:38','2025-01-08 22:01:38'),
(35,'http://197.140.11.160:8004/phpMyAdmin-2.6.0-beta1',404,'[\"http:\\/\\/197.140.11.160:8004\\/\"]',1,'2025-01-08 22:01:39','2025-01-08 22:01:39'),
(36,'http://197.140.11.160:8004/phpMyAdmin-2.6.0-beta2',404,'[\"http:\\/\\/197.140.11.160:8004\\/\"]',1,'2025-01-08 22:01:39','2025-01-08 22:01:39'),
(37,'http://197.140.11.160:8004/phpMyAdmin-2.6.0-rc1',404,'[\"http:\\/\\/197.140.11.160:8004\\/\"]',1,'2025-01-08 22:01:39','2025-01-08 22:01:39'),
(38,'http://197.140.11.160:8004/phpMyAdmin-2.6.0-rc2',404,'[\"http:\\/\\/197.140.11.160:8004\\/\"]',1,'2025-01-08 22:01:40','2025-01-08 22:01:40'),
(39,'http://197.140.11.160:8004/phpMyAdmin-2.6.0-rc3',404,'[\"http:\\/\\/197.140.11.160:8004\\/\"]',1,'2025-01-08 22:01:40','2025-01-08 22:01:40'),
(40,'http://197.140.11.160:8004/phpMyAdmin-2.6.0',404,'[\"http:\\/\\/197.140.11.160:8004\\/\"]',1,'2025-01-08 22:01:41','2025-01-08 22:01:41'),
(41,'http://197.140.11.160:8004/phpMyAdmin-2.6.0-pl1',404,'[\"http:\\/\\/197.140.11.160:8004\\/\"]',1,'2025-01-08 22:01:41','2025-01-08 22:01:41'),
(42,'http://197.140.11.160:8004/phpMyAdmin-2.6.0-pl2',404,'[\"http:\\/\\/197.140.11.160:8004\\/\"]',1,'2025-01-08 22:01:42','2025-01-08 22:01:42'),
(43,'http://197.140.11.160:8004/phpMyAdmin-2.6.0-pl3',404,'[\"http:\\/\\/197.140.11.160:8004\\/\"]',1,'2025-01-08 22:01:43','2025-01-08 22:01:43'),
(44,'http://197.140.11.160:8004/phpMyAdmin-2.6.1-rc1',404,'[\"http:\\/\\/197.140.11.160:8004\\/\"]',1,'2025-01-08 22:01:44','2025-01-08 22:01:44'),
(45,'http://197.140.11.160:8004/phpMyAdmin-2.6.1-rc2',404,'[\"http:\\/\\/197.140.11.160:8004\\/\"]',1,'2025-01-08 22:01:46','2025-01-08 22:01:46'),
(46,'http://197.140.11.160:8004/phpMyAdmin-2.6.1',404,'[\"http:\\/\\/197.140.11.160:8004\\/\"]',1,'2025-01-08 22:01:47','2025-01-08 22:01:47'),
(47,'http://197.140.11.160:8004/phpMyAdmin-2.6.1-pl1',404,'[\"http:\\/\\/197.140.11.160:8004\\/\"]',1,'2025-01-08 22:01:48','2025-01-08 22:01:48'),
(48,'http://197.140.11.160:8004/phpMyAdmin-2.6.1-pl2',404,'[\"http:\\/\\/197.140.11.160:8004\\/\"]',1,'2025-01-08 22:01:49','2025-01-08 22:01:49'),
(49,'http://197.140.11.160:8004/phpMyAdmin-2.6.1-pl3',404,'[\"http:\\/\\/197.140.11.160:8004\\/\"]',1,'2025-01-08 22:01:49','2025-01-08 22:01:49'),
(50,'http://197.140.11.160:8004/phpMyAdmin-2.6.2-rc1',404,'[\"http:\\/\\/197.140.11.160:8004\\/\"]',2,'2025-01-08 22:01:50','2025-01-08 22:01:51'),
(51,'http://197.140.11.160:8004/phpMyAdmin-2.6.2-beta1',404,'[\"http:\\/\\/197.140.11.160:8004\\/\"]',1,'2025-01-08 22:01:50','2025-01-08 22:01:50'),
(52,'http://197.140.11.160:8004/phpMyAdmin-2.6.2',404,'[\"http:\\/\\/197.140.11.160:8004\\/\"]',1,'2025-01-08 22:01:52','2025-01-08 22:01:52'),
(53,'http://197.140.11.160:8004/phpMyAdmin-2.6.2-pl1',404,'[\"http:\\/\\/197.140.11.160:8004\\/\"]',1,'2025-01-08 22:01:54','2025-01-08 22:01:54'),
(54,'http://197.140.11.160:8004/phpMyAdmin-2.6.3',404,'[\"http:\\/\\/197.140.11.160:8004\\/\"]',2,'2025-01-08 22:01:55','2025-01-08 22:01:57'),
(55,'http://197.140.11.160:8004/phpMyAdmin-2.6.3-rc1',404,'[\"http:\\/\\/197.140.11.160:8004\\/\"]',1,'2025-01-08 22:01:57','2025-01-08 22:01:57'),
(56,'http://197.140.11.160:8004/phpMyAdmin-2.6.3-pl1',404,'[\"http:\\/\\/197.140.11.160:8004\\/\"]',1,'2025-01-08 22:01:58','2025-01-08 22:01:58'),
(57,'http://197.140.11.160:8004/phpMyAdmin-2.6.4-rc1',404,'[\"http:\\/\\/197.140.11.160:8004\\/\"]',1,'2025-01-08 22:01:58','2025-01-08 22:01:58'),
(58,'http://197.140.11.160:8004/phpMyAdmin-2.6.4-pl1',404,'[\"http:\\/\\/197.140.11.160:8004\\/\"]',1,'2025-01-08 22:01:58','2025-01-08 22:01:58'),
(59,'http://197.140.11.160:8004/phpMyAdmin-2.6.4-pl2',404,'[\"http:\\/\\/197.140.11.160:8004\\/\"]',1,'2025-01-08 22:01:59','2025-01-08 22:01:59'),
(60,'http://197.140.11.160:8004/phpMyAdmin-2.6.4-pl3',404,'[\"http:\\/\\/197.140.11.160:8004\\/\"]',1,'2025-01-08 22:01:59','2025-01-08 22:01:59'),
(61,'http://197.140.11.160:8004/phpMyAdmin-2.6.4-pl4',404,'[\"http:\\/\\/197.140.11.160:8004\\/\"]',1,'2025-01-08 22:02:00','2025-01-08 22:02:00'),
(62,'http://197.140.11.160:8004/phpMyAdmin-2.6.4',404,'[\"http:\\/\\/197.140.11.160:8004\\/\"]',1,'2025-01-08 22:02:01','2025-01-08 22:02:01'),
(63,'http://197.140.11.160:8004/phpMyAdmin-2.7.0-beta1',404,'[\"http:\\/\\/197.140.11.160:8004\\/\"]',1,'2025-01-08 22:02:02','2025-01-08 22:02:02'),
(64,'http://197.140.11.160:8004/phpMyAdmin-2.7.0-rc1',404,'[\"http:\\/\\/197.140.11.160:8004\\/\"]',1,'2025-01-08 22:02:03','2025-01-08 22:02:03'),
(65,'http://197.140.11.160:8004/phpMyAdmin-2.7.0-pl1',404,'[\"http:\\/\\/197.140.11.160:8004\\/\"]',1,'2025-01-08 22:02:03','2025-01-08 22:02:03'),
(66,'http://197.140.11.160:8004/phpMyAdmin-2.7.0-pl2',404,'[\"http:\\/\\/197.140.11.160:8004\\/\"]',1,'2025-01-08 22:02:04','2025-01-08 22:02:04'),
(67,'http://197.140.11.160:8004/phpMyAdmin-2.7.0',404,'[\"http:\\/\\/197.140.11.160:8004\\/\"]',1,'2025-01-08 22:02:05','2025-01-08 22:02:05'),
(68,'http://197.140.11.160:8004/phpMyAdmin-2.8.0-beta1',404,'[\"http:\\/\\/197.140.11.160:8004\\/\"]',1,'2025-01-08 22:02:05','2025-01-08 22:02:05'),
(69,'http://197.140.11.160:8004/phpMyAdmin-2.8.0-rc1',404,'[\"http:\\/\\/197.140.11.160:8004\\/\"]',1,'2025-01-08 22:02:06','2025-01-08 22:02:06'),
(70,'http://197.140.11.160:8004/phpMyAdmin-2.8.0-rc2',404,'[\"http:\\/\\/197.140.11.160:8004\\/\"]',1,'2025-01-08 22:02:07','2025-01-08 22:02:07'),
(71,'http://197.140.11.160:8004/phpMyAdmin-2.8.0',404,'[\"http:\\/\\/197.140.11.160:8004\\/\"]',1,'2025-01-08 22:02:08','2025-01-08 22:02:08'),
(72,'http://197.140.11.160:8004/phpMyAdmin-2.8.0.1',404,'[\"http:\\/\\/197.140.11.160:8004\\/\"]',1,'2025-01-08 22:02:09','2025-01-08 22:02:09'),
(73,'http://197.140.11.160:8004/phpMyAdmin-2.8.0.2',404,'[\"http:\\/\\/197.140.11.160:8004\\/\"]',1,'2025-01-08 22:02:09','2025-01-08 22:02:09'),
(74,'http://197.140.11.160:8004/phpMyAdmin-2.8.0.3',404,'[\"http:\\/\\/197.140.11.160:8004\\/\"]',1,'2025-01-08 22:02:10','2025-01-08 22:02:10'),
(75,'http://197.140.11.160:8004/phpMyAdmin-2.8.0.4',404,'[\"http:\\/\\/197.140.11.160:8004\\/\"]',1,'2025-01-08 22:02:10','2025-01-08 22:02:10'),
(76,'http://197.140.11.160:8004/phpMyAdmin-2.8.1-rc1',404,'[\"http:\\/\\/197.140.11.160:8004\\/\"]',1,'2025-01-08 22:02:11','2025-01-08 22:02:11'),
(77,'http://197.140.11.160:8004/phpMyAdmin-2.8.1',404,'[\"http:\\/\\/197.140.11.160:8004\\/\"]',1,'2025-01-08 22:02:12','2025-01-08 22:02:12'),
(78,'http://197.140.11.160:8004/phpMyAdmin-2.8.2',404,'[\"http:\\/\\/197.140.11.160:8004\\/\"]',1,'2025-01-08 22:02:12','2025-01-08 22:02:12'),
(79,'http://197.140.11.160:8004/sqlmanager',404,'[\"http:\\/\\/197.140.11.160:8004\\/\"]',1,'2025-01-08 22:02:13','2025-01-08 22:02:13'),
(80,'http://197.140.11.160:8004/mysqlmanager',404,'[\"http:\\/\\/197.140.11.160:8004\\/\"]',1,'2025-01-08 22:02:14','2025-01-08 22:02:14'),
(81,'http://197.140.11.160:8004/p/m/a',404,'[\"http:\\/\\/197.140.11.160:8004\\/\"]',1,'2025-01-08 22:02:15','2025-01-08 22:02:15'),
(82,'http://197.140.11.160:8004/PMA2005',404,'[\"http:\\/\\/197.140.11.160:8004\\/\"]',2,'2025-01-08 22:02:16','2025-01-08 22:02:16'),
(83,'http://197.140.11.160:8004/phpmanager',404,'[\"http:\\/\\/197.140.11.160:8004\\/\"]',1,'2025-01-08 22:02:16','2025-01-08 22:02:16'),
(84,'http://197.140.11.160:8004/php-myadmin',404,'[\"http:\\/\\/197.140.11.160:8004\\/\"]',1,'2025-01-08 22:02:17','2025-01-08 22:02:17'),
(85,'http://197.140.11.160:8004/phpmy-admin',404,'[\"http:\\/\\/197.140.11.160:8004\\/\"]',1,'2025-01-08 22:02:18','2025-01-08 22:02:18'),
(86,'http://197.140.11.160:8004/webadmin',404,'[\"http:\\/\\/197.140.11.160:8004\\/\"]',1,'2025-01-08 22:02:19','2025-01-08 22:02:19'),
(87,'http://197.140.11.160:8004/sqlweb',404,'[\"http:\\/\\/197.140.11.160:8004\\/\"]',1,'2025-01-08 22:02:20','2025-01-08 22:02:20'),
(88,'http://197.140.11.160:8004/websql',404,'[\"http:\\/\\/197.140.11.160:8004\\/\"]',1,'2025-01-08 22:02:22','2025-01-08 22:02:22'),
(89,'http://197.140.11.160:8004/webdb',404,'[\"http:\\/\\/197.140.11.160:8004\\/\"]',1,'2025-01-08 22:02:25','2025-01-08 22:02:25'),
(90,'http://197.140.11.160:8004/mysqladmin',404,'[\"http:\\/\\/197.140.11.160:8004\\/\"]',1,'2025-01-08 22:02:28','2025-01-08 22:02:28'),
(91,'http://197.140.11.160:8004/mysql-admin',404,'[\"http:\\/\\/197.140.11.160:8004\\/\"]',1,'2025-01-08 22:02:30','2025-01-08 22:02:30'),
(92,'http://197.140.11.160:8012/default/menu?date=2025-01-22&guest=8&location=1&picker_step=2&qr=ms15XHzHzL&time=20%3A42',404,NULL,2,'2025-01-22 21:31:37','2025-01-22 21:31:45'),
(93,'http://197.140.11.160:8012/default/menu',404,NULL,2,'2025-01-22 21:31:52','2025-01-22 21:31:56'),
(94,'http://197.140.11.160:8012/default/menu?date=2025-01-22&guest=8&location=2&picker_step=2&qr=ms20X45LRn&time=17%3A16',404,NULL,1,'2025-01-23 12:00:44','2025-01-23 12:00:44'),
(95,'http://197.140.11.160:8012/default/menu?date=2025-01-22&guest=8&location=2&picker_step=2&time=17%3A16',404,NULL,2,'2025-01-23 12:01:01','2025-01-23 12:01:32'),
(96,'http://197.140.11.160:8012/panel',404,NULL,1,'2025-01-26 14:34:57','2025-01-26 14:34:57'),
(97,'http://197.140.11.160:8012/197.140.11.160:8012/checkout?action=unset_session',404,'[\"http:\\/\\/197.140.11.160:8012\\/checkout\"]',3,'2025-01-26 15:27:43','2025-01-26 15:49:56'),
(98,'http://197.140.11.160:8012/taste.zip',404,NULL,1,'2025-02-03 14:25:31','2025-02-03 14:25:31'),
(99,'http://197.140.11.160:8012/sitemap.xml',404,NULL,2,'2025-02-08 06:42:04','2025-02-14 06:45:14'),
(100,'http://197.140.11.160:8012/config.json',404,NULL,2,'2025-02-08 06:42:04','2025-02-14 06:45:14'),
(101,'http://197.140.11.160:8012/.well-known/security.txt',404,NULL,1,'2025-02-09 03:18:44','2025-02-09 03:18:44'),
(102,'http://197.140.11.160:8012/taste-v07-02-2025.zip',404,NULL,3,'2025-02-09 17:20:39','2025-02-09 17:22:15'),
(103,'http://197.140.11.160:8012/taste_23-02-2025.zip',404,NULL,1,'2025-02-25 09:27:45','2025-02-25 09:27:45'),
(104,'http://197.140.11.160:8012/default',404,NULL,1,'2025-03-03 23:59:39','2025-03-03 23:59:39'),
(105,'http://127.0.0.1:8000/themes/typical/assets/images/localmenu.jpg',404,'[\"http:\\/\\/127.0.0.1:8000\\/default\\/menus?picker_step=2&location=1&guest=4&date=2025-03-02&time=13%253A56&qr=ms25ho4m4R&table=25&data=ZXlKcGRpSTZJaXRoT1RCRFUzZERkbWx5ZW1kV05IbDJaakpzVDNjOVBTSXNJblpoYkhWbElqb2llREJQY20xSU1Ya3dXRFJhVTFZeFNIbGFTR1ZUVVQwOUlpd2liV0ZqSWpvaU0yUTJZekF4TURNME1ESTROMkl3TjJZeE1UZGpNVFV3TVdGaE9EQTJNV1psTWpFNU9XSXlORE15TWpnek9EVmhPR1EzTURZNVpERmxZVFptWm1SaVlpSXNJblJoWnlJNklpSjl8ZXlKcGRpSTZJbW80UW1GdFZFbGFSVWQ2YVV0alRXRm1RMVF2V0VFOVBTSXNJblpoYkhWbElqb2liMWg0WWsxd1FXZG5NQ3N2YjB4eEswcFBPRWQ1ZWtOc1VtRjBWRlpoTTBKNlUxa3JjMHRaYTBKWk0xSmxTamxZVm5reFZYUXJWakJtWjJwb1dIbHBjMHh0ZWl0SVNtNDJTV3hUU1RCNFozbFdSM0prV0Zab1UxTlFMMkZpV0RWM01qZzJZMFp6UjI4elJWUnFWR2hpUjJKV1Mwa3lhRGx1U1VGVE1rVkZXRkozZGpkaFoyaHhlVGRCVkVKUU4yMHdjbWh0V0ROQlBUMGlMQ0p0WVdNaU9pSXdZbVZtT1RjeVl6WmlOalV3Tm1aa1pUY3hZemN4T0dVMVlqTmlNamcwTUdGbFpHSTVZbUl4TXpGbE5XUXhaakl5WVdVelltTTNNMk5sT0dJeU5UWmtJaXdpZEdGbklqb2lJbjA9&u-order=137\"]',10,'2025-03-06 00:34:41','2025-03-06 18:43:45'),
(106,'http://127.0.0.1:8000/themes/typical/assets/images/pattern7.png',404,'[\"http:\\/\\/127.0.0.1:8000\\/checkout\"]',20,'2025-03-06 00:35:57','2025-03-06 18:41:21'),
(107,'http://127.0.0.1:8080/themes/typical/assets/images/localmenu.jpg',404,'[\"http:\\/\\/127.0.0.1:8080\\/default\\/menus?picker_step=2&location=1&guest=9&date=2025-03-02&time=21%253A55&qr=ms26TONOGs&table=26&data=ZXlKcGRpSTZJbFJHWm5OU2FuTjNjQzk1YjNaeFpVdHdWRmx0Y2xFOVBTSXNJblpoYkhWbElqb2ljV2R6YWxBMVJVSnhOMXBKZW5Jd1NETndSbGRvUVQwOUlpd2liV0ZqSWpvaU9ETTBNR1JoWldVM09XRTRZVEUwT0RKaE1qRXpOakkyWXpnM1lXRmhaR1pqTXpRd1l6VmtNbU15WlRNek5HRXhZVEptTWpnNFlqQTROemMzWW1Jd1lpSXNJblJoWnlJNklpSjl8ZXlKcGRpSTZJakV4TVdVeVpHdExRM2x2VUV4cVYzZGpRbFJhY2xFOVBTSXNJblpoYkhWbElqb2lkVE5FY1V0T1ZqZFNPWEpxYVdWSGFFWllRa0p4YzJweWVqbEdUbGxMY2pZM0wzUXhTV1o2UjBGSU4zVkZaMmd2UlZSMmRIQlhlREV3ZG1sMWRqRTBXbVZhZDFCMVZITlFXbWhXTUU1c09VOTRNRGxsTkhWaE9EaGhUSE00UjNkc1EzTlVTbk5CZFRkV2RWWnZXWGxKUkZodmFYbDNhelpJU0RWU2Jqa3djWHB2ZFZBMFZUVTVTRlpNTm5WMWRGQXljMHcyVGpKUlBUMGlMQ0p0WVdNaU9pSTVaalprTVdNeFpXTmlOVGc1TmpjeE4ySTBZekF6WldGbE1UQmlOVEE1WXpFNVpqaGlOVFV4TW1Zd1pqQmpaakU1WWpVMlpqTmxObVF3TkdZMk9HRmxJaXdpZEdGbklqb2lJbjA9&u-order=144\"]',3,'2025-03-06 00:55:22','2025-03-06 02:29:15'),
(108,'http://127.0.0.1:8080/themes/typical/assets/images/pattern7.png',404,'[\"http:\\/\\/127.0.0.1:8080\\/checkout\"]',22,'2025-03-06 00:56:24','2025-03-06 03:03:03'),
(109,'http://127.0.0.1:8000/favicon.ico',404,'[\"http:\\/\\/127.0.0.1:8000\\/checkout?order-payment=true&u-order=148\"]',2,'2025-03-06 15:02:02','2025-03-08 14:41:17'),
(110,'http://127.0.0.1:8000/tenant1/admin',404,NULL,1,'2025-03-18 07:55:17','2025-03-18 07:55:17'),
(111,'http://127.0.0.1:8000/app/admin/assets/images/favicon.ico',404,'[\"http:\\/\\/127.0.0.1:8000\\/tenant1\\/admin\"]',1,'2025-03-18 07:55:19','2025-03-18 07:55:19'),
(112,'http://tastyigniter.local/images/logo.png',404,NULL,5,'2025-03-21 00:04:09','2025-03-21 00:07:56'),
(113,'http://tastyigniter.local/assets/js/bundle.js?ver=3.2.3',404,'[\"http:\\/\\/tastyigniter.local\\/new\"]',5,'2025-03-21 00:04:19','2025-03-21 00:11:50'),
(114,'http://tastyigniter.local/assets/js/scripts.js?ver=3.2.3',404,'[\"http:\\/\\/tastyigniter.local\\/new\"]',5,'2025-03-21 00:04:19','2025-03-21 00:11:50'),
(115,'http://tastyigniter.local/assets/css/dashboard.css?ver=3.2.3',404,'[\"http:\\/\\/tastyigniter.local\\/new\"]',1,'2025-03-21 00:07:06','2025-03-21 00:07:06'),
(116,'http://tastyigniter.local/assets/js/charts/chart-crm.js?ver=3.2.3',404,'[\"http:\\/\\/tastyigniter.local\\/superadmin\\/login\"]',2,'2025-03-22 04:18:11','2025-03-22 04:18:26'),
(117,'http://tastyigniter.local/assets/css/theme.css?ver=3.2.3',404,'[\"http:\\/\\/tastyigniter.local\\/superadmin\\/login\"]',62,'2025-03-22 04:20:41','2025-03-23 07:50:20'),
(118,'http://tastyigniter.local/images/flags/english.png',404,'[\"http:\\/\\/tastyigniter.local\\/superadmin\\/login\"]',77,'2025-03-22 04:20:41','2025-03-23 07:50:22'),
(119,'http://tastyigniter.local/images/flags/spanish.png',404,'[\"http:\\/\\/tastyigniter.local\\/superadmin\\/login\"]',77,'2025-03-22 04:20:41','2025-03-23 07:50:22'),
(120,'http://tastyigniter.local/images/flags/turkey.png',404,'[\"http:\\/\\/tastyigniter.local\\/superadmin\\/login\"]',16,'2025-03-22 04:20:41','2025-03-23 00:20:49'),
(121,'http://tastyigniter.local/images/logo-dark.png',404,'[\"http:\\/\\/tastyigniter.local\\/superadmin\\/login\"]',1,'2025-03-22 04:20:41','2025-03-22 04:20:41'),
(122,'http://tastyigniter.local/images/flags/french.png',404,'[\"http:\\/\\/tastyigniter.local\\/superadmin\\/login\"]',74,'2025-03-22 04:20:41','2025-03-23 07:50:21'),
(123,'http://tastyigniter.local/images/flags/china.png',404,'[\"http:\\/\\/tastyigniter.local\\/superadmin\\/login\"]',92,'2025-03-22 04:20:42','2025-03-23 07:50:23'),
(124,'http://tastyigniter.local/images/flags/bangladesh.png',404,'[\"http:\\/\\/tastyigniter.local\\/superadmin\\/login\"]',63,'2025-03-22 04:20:42','2025-03-23 07:50:20'),
(125,'http://tastyigniter.local/images/flags/aus.png',404,'[\"http:\\/\\/tastyigniter.local\\/superadmin\\/login\"]',63,'2025-03-22 04:20:42','2025-03-23 07:50:20'),
(126,'http://tastyigniter.local/images/flags/arg.png',404,'[\"http:\\/\\/tastyigniter.local\\/superadmin\\/login\"]',63,'2025-03-22 04:20:42','2025-03-23 07:50:20'),
(127,'http://tastyigniter.local/images/flags/germany.png',404,'[\"http:\\/\\/tastyigniter.local\\/superadmin\\/login\"]',64,'2025-03-22 04:20:42','2025-03-23 07:50:21'),
(128,'http://tastyigniter.local/images/flags/canada.png',404,'[\"http:\\/\\/tastyigniter.local\\/superadmin\\/login\"]',64,'2025-03-22 04:20:42','2025-03-23 07:50:20'),
(129,'http://tastyigniter.local/images/flags/mexico.png',404,'[\"http:\\/\\/tastyigniter.local\\/superadmin\\/login\"]',64,'2025-03-22 04:20:44','2025-03-23 07:50:21'),
(130,'http://tastyigniter.local/images/flags/italy.png',404,'[\"http:\\/\\/tastyigniter.local\\/superadmin\\/login\"]',65,'2025-03-22 04:20:44','2025-03-23 07:50:21'),
(131,'http://tastyigniter.local/images/flags/philipine.png',404,'[\"http:\\/\\/tastyigniter.local\\/superadmin\\/login\"]',64,'2025-03-22 04:20:44','2025-03-23 07:50:21'),
(132,'http://tastyigniter.local/images/flags/portugal.png',404,'[\"http:\\/\\/tastyigniter.local\\/superadmin\\/login\"]',64,'2025-03-22 04:20:44','2025-03-23 07:50:22'),
(133,'http://tastyigniter.local/images/flags/iran.png',404,'[\"http:\\/\\/tastyigniter.local\\/superadmin\\/login\"]',64,'2025-03-22 04:20:44','2025-03-23 07:50:21'),
(134,'http://tastyigniter.local/images/flags/s-africa.png',404,'[\"http:\\/\\/tastyigniter.local\\/superadmin\\/login\"]',64,'2025-03-22 04:20:44','2025-03-23 07:50:22'),
(135,'http://tastyigniter.local/images/flags/uk.png',404,'[\"http:\\/\\/tastyigniter.local\\/superadmin\\/login\"]',63,'2025-03-22 04:20:45','2025-03-23 07:50:22'),
(136,'http://tastyigniter.local/images/flags/switzerland.png',404,'[\"http:\\/\\/tastyigniter.local\\/superadmin\\/login\"]',62,'2025-03-22 04:20:45','2025-03-23 07:50:22'),
(137,'http://tastyigniter.local/images/favicon.png',404,'[\"http:\\/\\/tastyigniter.local\\/superadmin\\/login\"]',1,'2025-03-22 04:20:46','2025-03-22 04:20:46'),
(138,'http://tenant2.tastyigniter.local/assets/media/attachments/public/67d/91f/d8a/67d91fd8af302445682087.webp',404,'[\"http:\\/\\/tenant2.tastyigniter.local\\/admin\\/orders\\/create\"]',2,'2025-03-24 11:39:51','2025-03-24 11:40:04'),
(139,'https://taste.mrigelpro.dz/assets/css/theme.css?ver=3.2.3',404,'[\"https:\\/\\/taste.mrigelpro.dz\\/superadmin\\/login\"]',3,'2025-03-24 15:23:06','2025-04-06 22:35:32'),
(140,'https://taste.mrigelpro.dz/images/flags/arg.png',404,'[\"https:\\/\\/taste.mrigelpro.dz\\/superadmin\\/login\"]',3,'2025-03-24 15:23:07','2025-04-06 22:35:33'),
(141,'https://taste.mrigelpro.dz/images/flags/aus.png',404,'[\"https:\\/\\/taste.mrigelpro.dz\\/superadmin\\/login\"]',3,'2025-03-24 15:23:08','2025-04-06 22:35:34'),
(142,'https://taste.mrigelpro.dz/images/flags/bangladesh.png',404,'[\"https:\\/\\/taste.mrigelpro.dz\\/superadmin\\/login\"]',3,'2025-03-24 15:23:08','2025-04-06 22:35:34'),
(143,'https://taste.mrigelpro.dz/images/flags/canada.png',404,'[\"https:\\/\\/taste.mrigelpro.dz\\/superadmin\\/login\"]',3,'2025-03-24 15:23:08','2025-04-06 22:35:34'),
(144,'https://taste.mrigelpro.dz/images/flags/china.png',404,'[\"https:\\/\\/taste.mrigelpro.dz\\/superadmin\\/login\"]',6,'2025-03-24 15:23:09','2025-04-06 22:35:35'),
(145,'https://taste.mrigelpro.dz/images/flags/french.png',404,'[\"https:\\/\\/taste.mrigelpro.dz\\/superadmin\\/login\"]',3,'2025-03-24 15:23:09','2025-04-06 22:35:34'),
(146,'https://taste.mrigelpro.dz/images/flags/germany.png',404,'[\"https:\\/\\/taste.mrigelpro.dz\\/superadmin\\/login\"]',3,'2025-03-24 15:23:09','2025-04-06 22:35:34'),
(147,'https://taste.mrigelpro.dz/images/flags/iran.png',404,'[\"https:\\/\\/taste.mrigelpro.dz\\/superadmin\\/login\"]',3,'2025-03-24 15:23:10','2025-04-06 22:35:34'),
(148,'https://taste.mrigelpro.dz/images/flags/mexico.png',404,'[\"https:\\/\\/taste.mrigelpro.dz\\/superadmin\\/login\"]',3,'2025-03-24 15:23:10','2025-04-06 22:35:34'),
(149,'https://taste.mrigelpro.dz/images/flags/italy.png',404,'[\"https:\\/\\/taste.mrigelpro.dz\\/superadmin\\/login\"]',3,'2025-03-24 15:23:10','2025-04-06 22:35:34'),
(150,'https://taste.mrigelpro.dz/images/flags/philipine.png',404,'[\"https:\\/\\/taste.mrigelpro.dz\\/superadmin\\/login\"]',3,'2025-03-24 15:23:10','2025-04-06 22:35:34'),
(151,'https://taste.mrigelpro.dz/images/flags/portugal.png',404,'[\"https:\\/\\/taste.mrigelpro.dz\\/superadmin\\/login\"]',3,'2025-03-24 15:23:10','2025-04-06 22:35:34'),
(152,'https://taste.mrigelpro.dz/images/flags/s-africa.png',404,'[\"https:\\/\\/taste.mrigelpro.dz\\/superadmin\\/login\"]',3,'2025-03-24 15:23:10','2025-04-06 22:35:34'),
(153,'https://taste.mrigelpro.dz/images/flags/spanish.png',404,'[\"https:\\/\\/taste.mrigelpro.dz\\/superadmin\\/login\"]',3,'2025-03-24 15:23:10','2025-04-06 22:35:34'),
(154,'https://taste.mrigelpro.dz/images/flags/switzerland.png',404,'[\"https:\\/\\/taste.mrigelpro.dz\\/superadmin\\/login\"]',3,'2025-03-24 15:23:11','2025-04-06 22:35:35'),
(155,'https://taste.mrigelpro.dz/images/flags/uk.png',404,'[\"https:\\/\\/taste.mrigelpro.dz\\/superadmin\\/login\"]',3,'2025-03-24 15:23:11','2025-04-06 22:35:35'),
(156,'https://taste.mrigelpro.dz/images/flags/english.png',404,'[\"https:\\/\\/taste.mrigelpro.dz\\/superadmin\\/login\"]',3,'2025-03-24 15:23:11','2025-04-06 22:35:35'),
(157,'https://admin.taste.mrigelpro.dz/images/flags/aus.png',404,'[\"https:\\/\\/admin.taste.mrigelpro.dz\\/superadmin\\/login\"]',1,'2025-03-24 23:44:55','2025-03-24 23:44:55'),
(158,'https://admin.taste.mrigelpro.dz/images/flags/arg.png',404,'[\"https:\\/\\/admin.taste.mrigelpro.dz\\/superadmin\\/login\"]',1,'2025-03-24 23:44:55','2025-03-24 23:44:55'),
(159,'https://admin.taste.mrigelpro.dz/assets/css/theme.css?ver=3.2.3',404,'[\"https:\\/\\/admin.taste.mrigelpro.dz\\/superadmin\\/login\"]',1,'2025-03-24 23:44:55','2025-03-24 23:44:55'),
(160,'https://admin.taste.mrigelpro.dz/images/flags/canada.png',404,'[\"https:\\/\\/admin.taste.mrigelpro.dz\\/superadmin\\/login\"]',1,'2025-03-24 23:44:55','2025-03-24 23:44:55'),
(161,'https://admin.taste.mrigelpro.dz/images/flags/china.png',404,'[\"https:\\/\\/admin.taste.mrigelpro.dz\\/superadmin\\/login\"]',1,'2025-03-24 23:44:55','2025-03-24 23:44:55'),
(162,'https://admin.taste.mrigelpro.dz/images/flags/bangladesh.png',404,'[\"https:\\/\\/admin.taste.mrigelpro.dz\\/superadmin\\/login\"]',1,'2025-03-24 23:44:55','2025-03-24 23:44:55'),
(163,'https://admin.taste.mrigelpro.dz/images/flags/french.png',404,'[\"https:\\/\\/admin.taste.mrigelpro.dz\\/superadmin\\/login\"]',1,'2025-03-24 23:44:55','2025-03-24 23:44:55'),
(164,'https://admin.taste.mrigelpro.dz/images/flags/germany.png',404,'[\"https:\\/\\/admin.taste.mrigelpro.dz\\/superadmin\\/login\"]',1,'2025-03-24 23:44:55','2025-03-24 23:44:55'),
(165,'https://admin.taste.mrigelpro.dz/images/flags/iran.png',404,'[\"https:\\/\\/admin.taste.mrigelpro.dz\\/superadmin\\/login\"]',1,'2025-03-24 23:44:55','2025-03-24 23:44:55'),
(166,'https://admin.taste.mrigelpro.dz/images/flags/italy.png',404,'[\"https:\\/\\/admin.taste.mrigelpro.dz\\/superadmin\\/login\"]',1,'2025-03-24 23:44:55','2025-03-24 23:44:55'),
(167,'https://admin.taste.mrigelpro.dz/images/flags/mexico.png',404,'[\"https:\\/\\/admin.taste.mrigelpro.dz\\/superadmin\\/login\"]',1,'2025-03-24 23:44:55','2025-03-24 23:44:55'),
(168,'https://admin.taste.mrigelpro.dz/images/flags/philipine.png',404,'[\"https:\\/\\/admin.taste.mrigelpro.dz\\/superadmin\\/login\"]',1,'2025-03-24 23:44:55','2025-03-24 23:44:55'),
(169,'https://admin.taste.mrigelpro.dz/images/flags/s-africa.png',404,'[\"https:\\/\\/admin.taste.mrigelpro.dz\\/superadmin\\/login\"]',1,'2025-03-24 23:44:55','2025-03-24 23:44:55'),
(170,'https://admin.taste.mrigelpro.dz/images/flags/portugal.png',404,'[\"https:\\/\\/admin.taste.mrigelpro.dz\\/superadmin\\/login\"]',1,'2025-03-24 23:44:55','2025-03-24 23:44:55'),
(171,'https://admin.taste.mrigelpro.dz/images/flags/switzerland.png',404,'[\"https:\\/\\/admin.taste.mrigelpro.dz\\/superadmin\\/login\"]',1,'2025-03-24 23:44:55','2025-03-24 23:44:55'),
(172,'https://admin.taste.mrigelpro.dz/images/flags/spanish.png',404,'[\"https:\\/\\/admin.taste.mrigelpro.dz\\/superadmin\\/login\"]',1,'2025-03-24 23:44:55','2025-03-24 23:44:55'),
(173,'https://admin.taste.mrigelpro.dz/images/flags/uk.png',404,'[\"https:\\/\\/admin.taste.mrigelpro.dz\\/superadmin\\/login\"]',1,'2025-03-24 23:44:55','2025-03-24 23:44:55'),
(174,'https://admin.taste.mrigelpro.dz/images/flags/english.png',404,'[\"https:\\/\\/admin.taste.mrigelpro.dz\\/superadmin\\/login\"]',1,'2025-03-24 23:44:55','2025-03-24 23:44:55'),
(175,'https://mrigelpro.dz/assets/env.js',404,NULL,4,'2025-03-25 09:30:41','2025-04-05 11:07:44'),
(176,'https://197.140.11.160/images/logo/logo-eoffice.php',404,NULL,1,'2025-04-01 10:12:35','2025-04-01 10:12:35'),
(177,'http://paymydine.com/assets/css/theme.css?ver=3.2.3',404,'[\"http:\\/\\/paymydine.com\\/superadmin\\/login\"]',4,'2025-04-12 00:55:32','2025-05-09 14:26:59'),
(178,'http://paymydine.com/images/flags/arg.png',404,'[\"http:\\/\\/paymydine.com\\/superadmin\\/login\"]',4,'2025-04-12 00:55:32','2025-05-09 14:26:59'),
(179,'http://paymydine.com/images/flags/aus.png',404,'[\"http:\\/\\/paymydine.com\\/superadmin\\/login\"]',4,'2025-04-12 00:55:32','2025-05-09 14:26:59'),
(180,'http://paymydine.com/images/flags/bangladesh.png',404,'[\"http:\\/\\/paymydine.com\\/superadmin\\/login\"]',4,'2025-04-12 00:55:32','2025-05-09 14:27:00'),
(181,'http://paymydine.com/images/flags/canada.png',404,'[\"http:\\/\\/paymydine.com\\/superadmin\\/login\"]',4,'2025-04-12 00:55:32','2025-05-09 14:27:00'),
(182,'http://paymydine.com/images/flags/china.png',404,'[\"http:\\/\\/paymydine.com\\/superadmin\\/login\"]',5,'2025-04-12 00:55:32','2025-05-09 14:27:00'),
(183,'http://paymydine.com/images/flags/french.png',404,'[\"http:\\/\\/paymydine.com\\/superadmin\\/login\"]',4,'2025-04-12 00:55:32','2025-05-09 14:27:00'),
(184,'http://paymydine.com/images/flags/germany.png',404,'[\"http:\\/\\/paymydine.com\\/superadmin\\/login\"]',4,'2025-04-12 00:55:32','2025-05-09 14:27:00'),
(185,'http://paymydine.com/images/flags/iran.png',404,'[\"http:\\/\\/paymydine.com\\/superadmin\\/login\"]',4,'2025-04-12 00:55:32','2025-05-09 14:27:00'),
(186,'http://paymydine.com/images/flags/italy.png',404,'[\"http:\\/\\/paymydine.com\\/superadmin\\/login\"]',4,'2025-04-12 00:55:32','2025-05-09 14:27:00'),
(187,'http://paymydine.com/images/flags/mexico.png',404,'[\"http:\\/\\/paymydine.com\\/superadmin\\/login\"]',4,'2025-04-12 00:55:32','2025-05-09 14:27:00'),
(188,'http://paymydine.com/images/flags/philipine.png',404,'[\"http:\\/\\/paymydine.com\\/superadmin\\/login\"]',4,'2025-04-12 00:55:32','2025-05-09 14:27:00'),
(189,'http://paymydine.com/images/flags/s-africa.png',404,'[\"http:\\/\\/paymydine.com\\/superadmin\\/login\"]',4,'2025-04-12 00:55:32','2025-05-09 14:27:00'),
(190,'http://paymydine.com/images/flags/portugal.png',404,'[\"http:\\/\\/paymydine.com\\/superadmin\\/login\"]',4,'2025-04-12 00:55:32','2025-05-09 14:27:00'),
(191,'http://paymydine.com/images/flags/spanish.png',404,'[\"http:\\/\\/paymydine.com\\/superadmin\\/login\"]',4,'2025-04-12 00:55:32','2025-05-09 14:27:00'),
(192,'http://paymydine.com/images/flags/switzerland.png',404,'[\"http:\\/\\/paymydine.com\\/superadmin\\/login\"]',4,'2025-04-12 00:55:32','2025-05-09 14:27:00'),
(193,'http://paymydine.com/images/flags/uk.png',404,'[\"http:\\/\\/paymydine.com\\/superadmin\\/login\"]',4,'2025-04-12 00:55:32','2025-05-09 14:27:00'),
(194,'http://paymydine.com/images/flags/english.png',404,'[\"http:\\/\\/paymydine.com\\/superadmin\\/login\"]',4,'2025-04-12 00:55:32','2025-05-09 14:27:00'),
(195,'http://paymydine.com/images/ALFA_DATA/alfacgiapi/perl.alfa.php',404,NULL,1,'2025-04-13 07:01:17','2025-04-13 07:01:17'),
(196,'http://paymydine.com/images/vuln.php',404,NULL,1,'2025-04-13 07:01:19','2025-04-13 07:01:19'),
(197,'http://paymydine.com/images/about.php',404,NULL,18,'2025-04-13 07:01:22','2025-05-09 04:49:26'),
(198,'http://paymydine.com/images/sym.php',404,NULL,1,'2025-04-13 07:01:25','2025-04-13 07:01:25'),
(199,'http://paymydine.com/images/c99.php',404,NULL,1,'2025-04-13 07:01:26','2025-04-13 07:01:26'),
(200,'http://paymydine.com/images/cloud.php',404,NULL,10,'2025-04-13 17:26:12','2025-05-09 04:49:26'),
(201,'http://paymydine.com/images/xmrlpc.php?p=',404,NULL,3,'2025-04-13 17:26:15','2025-05-09 04:48:45'),
(202,'http://paymydine.com/assets/images/1p.php',404,NULL,7,'2025-04-13 17:26:17','2025-05-05 04:26:02'),
(203,'http://paymydine.com/assets/images/28c5400b0b.php',404,NULL,7,'2025-04-14 16:29:00','2025-04-30 11:53:19'),
(204,'http://paymydine.com/images/404.php',404,NULL,8,'2025-04-14 16:29:04','2025-05-06 15:59:46'),
(205,'http://paymydine.com/images/cjfuns.php',404,NULL,3,'2025-04-14 16:29:08','2025-04-17 12:45:28'),
(206,'http://paymydine.com/assets/images/wp-login.php',404,NULL,9,'2025-04-14 16:29:13','2025-05-06 15:59:55'),
(207,'http://paymydine.com/assets/images/doc.php',404,NULL,10,'2025-04-14 16:29:21','2025-05-06 18:07:00'),
(208,'http://paymydine.com/assets/item.php',404,NULL,2,'2025-04-14 16:29:29','2025-04-15 03:55:40'),
(209,'http://paymydine.com/assets/admin.php',404,NULL,3,'2025-04-14 16:29:32','2025-04-24 23:41:20'),
(210,'http://paymydine.com/images/autoload_classmap.php',404,NULL,8,'2025-04-14 16:29:36','2025-05-06 18:07:02'),
(211,'http://paymydine.com/assets/images/about.php',404,NULL,3,'2025-04-14 16:29:44','2025-04-24 23:43:18'),
(212,'http://paymydine.com/images/admin.php',404,NULL,8,'2025-04-14 16:29:49','2025-05-06 15:58:43'),
(213,'http://paymydine.com/assets/plugins/jquery-file-upload/server/php/include.php',404,NULL,2,'2025-04-14 16:29:53','2025-04-15 03:56:03'),
(214,'http://paymydine.com/images/lmfi2.php',404,NULL,7,'2025-04-14 16:29:53','2025-05-06 15:59:19'),
(215,'http://paymydine.com/images/chosen.php',404,NULL,2,'2025-04-14 16:29:53','2025-04-15 03:56:03'),
(216,'http://paymydine.com/assets/edit.php',404,NULL,2,'2025-04-14 16:29:58','2025-04-15 03:56:09'),
(217,'http://paymydine.com/images/stories/admin-post.php',404,NULL,2,'2025-04-14 16:30:00','2025-04-15 03:56:10'),
(218,'http://paymydine.com/images/index.php',404,NULL,11,'2025-04-15 13:11:25','2025-05-06 15:59:06'),
(219,'http://paymydine.com/images/class-config.php',404,NULL,8,'2025-04-15 13:11:26','2025-05-08 10:54:50'),
(220,'http://paymydine.com/assets/css',404,NULL,14,'2025-04-16 00:25:40','2025-05-10 12:38:33'),
(221,'http://paymydine.com/assets/images',404,NULL,14,'2025-04-16 00:25:40','2025-05-09 04:49:04'),
(222,'http://paymydine.com/assets/images//NOFmvAjT.php',404,NULL,4,'2025-04-16 00:25:40','2025-04-30 11:53:18'),
(223,'http://paymydine.com/assets/images//niil.php',404,NULL,5,'2025-04-16 00:25:40','2025-05-06 18:07:00'),
(224,'http://paymydine.com/assets/images//scan.php',404,NULL,4,'2025-04-16 00:25:40','2025-04-30 11:53:18'),
(225,'http://paymydine.com/assets/images/1741753877buyyx.php7',404,NULL,4,'2025-04-16 00:25:40','2025-04-30 11:53:18'),
(226,'http://paymydine.com/assets/index.php',404,NULL,5,'2025-04-16 00:25:40','2025-05-06 15:59:44'),
(227,'http://paymydine.com/assets/vendor/bootstrap/css',404,NULL,5,'2025-04-16 00:25:40','2025-05-06 16:00:08'),
(228,'http://paymydine.com/assets/xp.php',404,NULL,5,'2025-04-16 00:25:40','2025-05-06 15:59:58'),
(229,'http://paymydine.com/images//edit.php',404,NULL,4,'2025-04-16 00:25:49','2025-04-30 11:53:30'),
(230,'http://paymydine.com/images/mm55.php',404,NULL,5,'2025-04-16 00:25:49','2025-05-06 15:58:49'),
(231,'http://paymydine.com/images/server.php',404,NULL,5,'2025-04-16 00:25:49','2025-05-06 15:58:32'),
(232,'http://paymydine.com/images/stories',404,NULL,7,'2025-04-16 00:25:49','2025-05-09 04:49:21'),
(233,'http://paymydine.com/images/xBrain.php',404,NULL,5,'2025-04-16 00:25:49','2025-05-06 15:58:42'),
(234,'http://paymydine.com/images/xmrlpc.php',404,NULL,12,'2025-04-16 00:25:49','2025-05-06 16:00:11'),
(235,'http://paymydine.com/images/options.php',404,NULL,2,'2025-04-16 01:54:32','2025-04-24 23:42:58'),
(236,'http://paymydine.com/assets/admin/plugins/ckeditor/plugins/scayt/dialogs/dialogs',404,NULL,6,'2025-04-17 00:46:59','2025-05-04 01:56:30'),
(237,'http://paymydine.com/images/icons/rouyg/hppd',404,NULL,6,'2025-04-17 00:47:01','2025-05-04 01:56:32'),
(238,'http://paymydine.com/images/headers',404,NULL,6,'2025-04-17 00:47:06','2025-05-04 01:56:38'),
(239,'http://paymydine.com/assets/autoload_classmap.php',404,NULL,1,'2025-04-18 04:48:18','2025-04-18 04:48:18'),
(240,'http://paymydine.com/assets/fonts',404,NULL,6,'2025-04-21 19:49:51','2025-05-05 02:39:52'),
(241,'http://paymydine.com/assets/images/206d2bdfbd.php',404,NULL,5,'2025-04-21 19:50:23','2025-05-05 02:40:27'),
(242,'http://paymydine.com/assets/js/about.php',404,NULL,6,'2025-04-21 19:50:33','2025-05-05 02:40:37'),
(243,'http://paymydine.com/assets/images/admin.php',404,NULL,5,'2025-04-21 19:50:38','2025-05-05 02:40:43'),
(244,'http://paymydine.com/assets/index1.php',404,NULL,5,'2025-04-21 19:50:40','2025-05-05 02:40:45'),
(245,'http://paymydine.com/assets/content.php',404,NULL,5,'2025-04-21 19:50:41','2025-05-05 02:40:46'),
(246,'http://paymydine.com/assets/css/source/attention_seekers/ovagvggbs.php',404,NULL,5,'2025-04-21 19:50:49','2025-05-05 02:40:55'),
(247,'http://paymydine.com/assets/images/88123af40d.php',404,NULL,5,'2025-04-21 19:50:57','2025-05-05 02:41:03'),
(248,'http://paymydine.com/images/upload',404,NULL,1,'2025-04-24 23:39:48','2025-04-24 23:39:48'),
(249,'http://paymydine.com/assets/js',404,NULL,2,'2025-04-24 23:40:04','2025-05-09 22:01:09'),
(250,'http://paymydine.com/images/1',404,NULL,1,'2025-04-24 23:40:04','2025-04-24 23:40:04'),
(251,'http://paymydine.com/images/news',404,NULL,1,'2025-04-24 23:40:08','2025-04-24 23:40:08'),
(252,'http://paymydine.com/assets/assets',404,NULL,1,'2025-04-24 23:40:13','2025-04-24 23:40:13'),
(253,'http://paymydine.com/assets/js/wso.php',404,NULL,1,'2025-04-24 23:40:23','2025-04-24 23:40:23'),
(254,'http://paymydine.com/images/iR7SzrsOUEP.php',404,NULL,1,'2025-04-24 23:41:30','2025-04-24 23:41:30'),
(255,'http://paymydine.com/assets/images/cong.php',404,NULL,1,'2025-04-24 23:41:39','2025-04-24 23:41:39'),
(256,'http://paymydine.com/assets/images/themes.php',404,NULL,1,'2025-04-24 23:42:23','2025-04-24 23:42:23'),
(257,'http://paymydine.com/images/img.php',404,NULL,1,'2025-04-24 23:42:25','2025-04-24 23:42:25'),
(258,'http://paymydine.com/assets/lib.php',404,NULL,1,'2025-04-24 23:42:26','2025-04-24 23:42:26'),
(259,'http://paymydine.com/images/image.php',404,NULL,1,'2025-04-24 23:42:27','2025-04-24 23:42:27'),
(260,'http://paymydine.com/images/x.php',404,NULL,1,'2025-04-24 23:42:27','2025-04-24 23:42:27'),
(261,'http://paymydine.com/images/library.php',404,NULL,1,'2025-04-24 23:42:29','2025-04-24 23:42:29'),
(262,'http://paymydine.com/images/lock360.php',404,NULL,1,'2025-04-24 23:42:31','2025-04-24 23:42:31'),
(263,'http://paymydine.com/images/radio.php',404,NULL,1,'2025-04-24 23:42:34','2025-04-24 23:42:34'),
(264,'http://paymydine.com/images/include.php',404,NULL,1,'2025-04-24 23:42:37','2025-04-24 23:42:37'),
(265,'http://paymydine.com/images/adminshell.php',404,NULL,1,'2025-04-24 23:42:39','2025-04-24 23:42:39'),
(266,'http://paymydine.com/images/content.php',404,NULL,1,'2025-04-24 23:42:45','2025-04-24 23:42:45'),
(267,'http://paymydine.com/images/wp-login.php',404,NULL,1,'2025-04-24 23:42:55','2025-04-24 23:42:55'),
(268,'http://paymydine.com/images/a.php',404,NULL,1,'2025-04-24 23:42:56','2025-04-24 23:42:56'),
(269,'http://paymydine.com/images/offline.php',404,NULL,1,'2025-04-24 23:42:57','2025-04-24 23:42:57'),
(270,'http://paymydine.com/assets/images/cloud.php',404,NULL,1,'2025-04-24 23:42:58','2025-04-24 23:42:58'),
(271,'http://paymydine.com/assets/fonts/iR7SzrsOUEP.php',404,NULL,1,'2025-04-24 23:42:59','2025-04-24 23:42:59'),
(272,'http://paymydine.com/images/news/gale.php',404,NULL,1,'2025-04-24 23:43:00','2025-04-24 23:43:00'),
(273,'http://paymydine.com/images/field.php',404,NULL,1,'2025-04-24 23:43:05','2025-04-24 23:43:05'),
(274,'http://paymydine.com/assets/images/beence.php',404,NULL,1,'2025-04-24 23:43:13','2025-04-24 23:43:13'),
(275,'http://paymydine.com/images/tinyfilemanager.php',404,NULL,1,'2025-04-24 23:43:17','2025-04-24 23:43:17'),
(276,'http://paymydine.com/assets/images/install.php',404,NULL,1,'2025-04-24 23:43:35','2025-04-24 23:43:35'),
(277,'http://paymydine.com/images/upload.php',404,NULL,1,'2025-04-24 23:43:44','2025-04-24 23:43:44'),
(278,'http://paymydine.com/images/images.php',404,NULL,1,'2025-04-24 23:43:51','2025-04-24 23:43:51'),
(279,'http://paymydine.com/images/Marvins.php',404,NULL,1,'2025-04-24 23:43:52','2025-04-24 23:43:52'),
(280,'http://paymydine.com/assets/source.php',404,NULL,1,'2025-04-24 23:43:53','2025-04-24 23:43:53'),
(281,'http://paymydine.com/assets/type.php',404,NULL,1,'2025-04-24 23:43:53','2025-04-24 23:43:53'),
(282,'http://paymydine.com/assets/myip.php',404,NULL,1,'2025-04-24 23:43:53','2025-04-24 23:43:53'),
(283,'http://paymydine.com/images/bak.php',404,NULL,1,'2025-04-24 23:43:58','2025-04-24 23:43:58'),
(284,'http://paymydine.com/images/LA.php',404,NULL,1,'2025-04-24 23:43:58','2025-04-24 23:43:58'),
(285,'http://paymydine.com/images/system.php',404,NULL,1,'2025-04-24 23:44:10','2025-04-24 23:44:10'),
(286,'http://paymydine.com/assets/shell.php',404,NULL,1,'2025-04-24 23:44:15','2025-04-24 23:44:15'),
(287,'http://paymydine.com/images/atomlib.php',404,NULL,1,'2025-04-24 23:44:15','2025-04-24 23:44:15'),
(288,'http://paymydine.com/images/contents.php',404,NULL,1,'2025-04-24 23:44:18','2025-04-24 23:44:18'),
(289,'http://paymydine.com/images/thumb.php',404,NULL,1,'2025-04-24 23:44:18','2025-04-24 23:44:18'),
(290,'http://paymydine.com/images/news/func.php',404,NULL,1,'2025-04-24 23:44:20','2025-04-24 23:44:20'),
(291,'http://paymydine.com/assets/include.php',404,NULL,1,'2025-04-24 23:44:24','2025-04-24 23:44:24'),
(292,'http://paymydine.com/assets/authorize.php',404,NULL,1,'2025-04-24 23:44:25','2025-04-24 23:44:25'),
(293,'http://paymydine.com/images/ws.php',404,NULL,1,'2025-04-24 23:44:26','2025-04-24 23:44:26'),
(294,'http://paymydine.com/images/authorize.php',404,NULL,1,'2025-04-24 23:44:30','2025-04-24 23:44:30'),
(295,'http://paymydine.com/assets/images/class_api.php',404,NULL,1,'2025-04-24 23:44:31','2025-04-24 23:44:31'),
(296,'http://paymydine.com/assets/data.php',404,NULL,1,'2025-04-24 23:44:33','2025-04-24 23:44:33'),
(297,'http://paymydine.com/assets/images/upfile.php',404,NULL,1,'2025-04-24 23:44:40','2025-04-24 23:44:40'),
(298,'http://paymydine.com/images/class.php',404,NULL,1,'2025-04-24 23:44:43','2025-04-24 23:44:43'),
(299,'http://paymydine.com/assets/images/menu.php',404,NULL,1,'2025-04-24 23:44:45','2025-04-24 23:44:45'),
(300,'http://paymydine.com/images/login.php',404,NULL,1,'2025-04-24 23:44:47','2025-04-24 23:44:47'),
(301,'http://paymydine.com/assets/class.php',404,NULL,1,'2025-04-24 23:44:47','2025-04-24 23:44:47'),
(302,'http://paymydine.com/assets/bypass.php',404,NULL,2,'2025-04-24 23:44:54','2025-05-01 17:43:36'),
(303,'http://paymydine.com/assets/app.php',404,NULL,2,'2025-04-24 23:44:55','2025-05-01 17:43:43'),
(304,'http://paymydine.com/images/config.php',404,NULL,1,'2025-04-24 23:44:58','2025-04-24 23:44:58'),
(305,'http://paymydine.com/images/js.php',404,NULL,1,'2025-04-24 23:45:06','2025-04-24 23:45:06'),
(306,'http://paymydine.com/images/file.php',404,NULL,1,'2025-04-24 23:45:07','2025-04-24 23:45:07'),
(307,'http://paymydine.com/assets/plugins/jQuery-File-Upload/server/php/index.php?file=tf2rghf.jpg',404,NULL,2,'2025-04-30 16:32:19','2025-05-06 00:14:04'),
(308,'http://paymydine.com/assets/wp-blog.php',404,NULL,1,'2025-05-01 17:43:39','2025-05-01 17:43:39'),
(309,'http://paymydine.com/assets/atomlib.php',404,NULL,1,'2025-05-01 17:43:39','2025-05-01 17:43:39'),
(310,'http://paymydine.com/assets/fonts/admin.php',404,NULL,1,'2025-05-01 17:43:39','2025-05-01 17:43:39'),
(311,'http://paymydine.com/images/headers/strenms.php',404,NULL,1,'2025-05-01 17:43:40','2025-05-01 17:43:40'),
(312,'http://paymydine.com/assets/images/cmd.php',404,NULL,1,'2025-05-01 17:43:42','2025-05-01 17:43:42'),
(313,'http://paymydine.com/assets/css/403.php',404,NULL,1,'2025-05-01 17:43:44','2025-05-01 17:43:44'),
(314,'http://paymydine.com/assets/file.php',404,NULL,1,'2025-05-02 15:58:36','2025-05-02 15:58:36'),
(315,'http://paymydine.com/images/icons/rouyg/hppd/flower.php',404,NULL,1,'2025-05-02 15:58:39','2025-05-02 15:58:39'),
(316,'http://paymydine.com/images/headers/flower.php',404,NULL,1,'2025-05-02 15:58:39','2025-05-02 15:58:39'),
(317,'http://paymydine.com/assets/flower.php',404,NULL,1,'2025-05-02 15:58:40','2025-05-02 15:58:40'),
(318,'http://paymydine.com/images/post.php',404,NULL,1,'2025-05-02 15:58:41','2025-05-02 15:58:41'),
(319,'http://paymydine.com/images/headers/file.php',404,NULL,1,'2025-05-02 15:58:42','2025-05-02 15:58:42'),
(320,'http://paymydine.com/assets/js/autoload_classmap.php',404,NULL,1,'2025-05-02 15:58:43','2025-05-02 15:58:43'),
(321,'http://paymydine.com/images/icons/rouyg/hppd/post.php',404,NULL,1,'2025-05-02 15:58:45','2025-05-02 15:58:45'),
(322,'http://217.154.78.123//images/oBo.php',404,NULL,1,'2025-05-05 04:10:29','2025-05-05 04:10:29'),
(323,'http://paymydine.com/assets/images/niil.php',404,NULL,1,'2025-05-06 15:59:11','2025-05-06 15:59:11'),
(324,'http://paymydine.com/assets/images/scan.php',404,NULL,1,'2025-05-06 15:59:49','2025-05-06 15:59:49'),
(325,'http://paymydine.com/images/edit.php',404,NULL,1,'2025-05-06 16:00:28','2025-05-06 16:00:28'),
(326,'http://paymydine.com/images/k.php',404,NULL,1,'2025-05-08 10:54:48','2025-05-08 10:54:48'),
(327,'http://217.154.78.123/assets/js/aws-config.js',404,NULL,1,'2025-05-10 01:18:39','2025-05-10 01:18:39'),
(328,'http://paymydine.com/assets/img',404,NULL,1,'2025-05-10 12:38:33','2025-05-10 12:38:33'),
(329,'http://57.129.43.190/Autodiscover/Autodiscover.xml',404,NULL,1,'2025-09-23 12:30:48','2025-09-23 12:30:48'),
(330,'http://57.129.43.190/solr/admin/info/system?wt=json',404,NULL,1,'2025-09-23 13:10:55','2025-09-23 13:10:55'),
(331,'http://vps-252f1bc4.vps.ovh.net/webui',404,NULL,1,'2025-09-23 13:50:28','2025-09-23 13:50:28'),
(332,'http://vps-252f1bc4.vps.ovh.net/favicon.ico',404,NULL,1,'2025-09-23 13:50:29','2025-09-23 13:50:29'),
(333,'http://vps-252f1bc4.vps.ovh.net/owa',404,NULL,2,'2025-09-23 13:50:29','2025-09-23 13:50:29'),
(334,'http://57.129.43.190/console',404,NULL,1,'2025-09-23 13:55:59','2025-09-23 13:55:59'),
(335,'http://57.129.43.190/_ignition/execute-solution',404,NULL,1,'2025-09-23 14:06:20','2025-09-23 14:06:20'),
(336,'http://57.129.43.190/actuator/gateway/routes',404,NULL,1,'2025-09-23 15:11:27','2025-09-23 15:11:27'),
(337,'http://57.129.43.190/developmentserver/metadatauploader',404,NULL,2,'2025-09-23 15:12:31','2025-09-24 20:28:52'),
(338,'http://57.129.43.190/geoserver',404,NULL,1,'2025-09-23 15:45:13','2025-09-23 15:45:13'),
(339,'http://test.paymydine.com/assets/css/theme.css?ver=3.2.3',404,'[\"http:\\/\\/test.paymydine.com\\/superadmin\\/login\"]',2,'2025-09-24 15:40:54','2025-09-25 17:10:28'),
(340,'http://test.paymydine.com/images/flags/arg.png',404,'[\"http:\\/\\/test.paymydine.com\\/superadmin\\/login\"]',2,'2025-09-24 15:40:54','2025-09-25 17:10:28'),
(341,'http://test.paymydine.com/images/flags/aus.png',404,'[\"http:\\/\\/test.paymydine.com\\/superadmin\\/login\"]',2,'2025-09-24 15:40:54','2025-09-25 17:10:28'),
(342,'http://test.paymydine.com/images/flags/bangladesh.png',404,'[\"http:\\/\\/test.paymydine.com\\/superadmin\\/login\"]',2,'2025-09-24 15:40:54','2025-09-25 17:10:28'),
(343,'http://test.paymydine.com/images/flags/canada.png',404,'[\"http:\\/\\/test.paymydine.com\\/superadmin\\/login\"]',2,'2025-09-24 15:40:54','2025-09-25 17:10:28'),
(344,'http://test.paymydine.com/images/flags/china.png',404,'[\"http:\\/\\/test.paymydine.com\\/superadmin\\/login\"]',3,'2025-09-24 15:40:54','2025-09-25 17:10:28'),
(345,'http://test.paymydine.com/images/flags/french.png',404,'[\"http:\\/\\/test.paymydine.com\\/superadmin\\/login\"]',2,'2025-09-24 15:40:54','2025-09-25 17:10:28'),
(346,'http://test.paymydine.com/images/flags/germany.png',404,'[\"http:\\/\\/test.paymydine.com\\/superadmin\\/login\"]',2,'2025-09-24 15:40:54','2025-09-25 17:10:28'),
(347,'http://test.paymydine.com/images/flags/iran.png',404,'[\"http:\\/\\/test.paymydine.com\\/superadmin\\/login\"]',2,'2025-09-24 15:40:54','2025-09-25 17:10:28'),
(348,'http://test.paymydine.com/images/flags/italy.png',404,'[\"http:\\/\\/test.paymydine.com\\/superadmin\\/login\"]',2,'2025-09-24 15:40:54','2025-09-25 17:10:28'),
(349,'http://test.paymydine.com/images/flags/philipine.png',404,'[\"http:\\/\\/test.paymydine.com\\/superadmin\\/login\"]',2,'2025-09-24 15:40:54','2025-09-25 17:10:28'),
(350,'http://test.paymydine.com/images/flags/mexico.png',404,'[\"http:\\/\\/test.paymydine.com\\/superadmin\\/login\"]',2,'2025-09-24 15:40:54','2025-09-25 17:10:28'),
(351,'http://test.paymydine.com/images/flags/portugal.png',404,'[\"http:\\/\\/test.paymydine.com\\/superadmin\\/login\"]',2,'2025-09-24 15:40:54','2025-09-25 17:10:28'),
(352,'http://test.paymydine.com/images/flags/s-africa.png',404,'[\"http:\\/\\/test.paymydine.com\\/superadmin\\/login\"]',2,'2025-09-24 15:40:54','2025-09-25 17:10:28'),
(353,'http://test.paymydine.com/images/flags/switzerland.png',404,'[\"http:\\/\\/test.paymydine.com\\/superadmin\\/login\"]',2,'2025-09-24 15:40:54','2025-09-25 17:10:28'),
(354,'http://test.paymydine.com/images/flags/spanish.png',404,'[\"http:\\/\\/test.paymydine.com\\/superadmin\\/login\"]',2,'2025-09-24 15:40:54','2025-09-25 17:10:28'),
(355,'http://test.paymydine.com/images/flags/english.png',404,'[\"http:\\/\\/test.paymydine.com\\/superadmin\\/login\"]',2,'2025-09-24 15:40:54','2025-09-25 17:10:28'),
(356,'http://test.paymydine.com/images/flags/uk.png',404,'[\"http:\\/\\/test.paymydine.com\\/superadmin\\/login\"]',2,'2025-09-24 15:40:54','2025-09-25 17:10:28'),
(357,'http://mimoza.paymydine.com/assets/media/attachments/public/67d/91f/d8a/67d91fd8af302445682087.webp',404,'[\"http:\\/\\/mimoza.paymydine.com\\/admin\\/orders\\/create\"]',2,'2025-09-24 20:20:08','2025-09-24 20:34:41'),
(358,'http://test.paymydine.com/superadmin/new',404,NULL,2,'2025-09-24 20:31:03','2025-09-25 16:16:29'),
(359,'http://test.paymydine.com/app/admin/assets/images/favicon.ico',404,'[\"http:\\/\\/test.paymydine.com\\/superadmin\\/new\"]',1,'2025-09-24 20:31:04','2025-09-24 20:31:04'),
(360,'http://test.paymydine.com/superadmin/sign',404,NULL,1,'2025-09-25 21:29:36','2025-09-25 21:29:36'),
(361,'http://superadmin.paymydine.com/assets/css/theme.css?ver=3.2.3',404,'[\"http:\\/\\/superadmin.paymydine.com\\/superadmin\\/login\"]',1,'2025-09-25 21:33:27','2025-09-25 21:33:27'),
(362,'http://superadmin.paymydine.com/images/flags/arg.png',404,'[\"http:\\/\\/superadmin.paymydine.com\\/superadmin\\/login\"]',1,'2025-09-25 21:33:27','2025-09-25 21:33:27'),
(363,'http://superadmin.paymydine.com/images/flags/aus.png',404,'[\"http:\\/\\/superadmin.paymydine.com\\/superadmin\\/login\"]',1,'2025-09-25 21:33:27','2025-09-25 21:33:27'),
(364,'http://superadmin.paymydine.com/images/flags/bangladesh.png',404,'[\"http:\\/\\/superadmin.paymydine.com\\/superadmin\\/login\"]',1,'2025-09-25 21:33:27','2025-09-25 21:33:27'),
(365,'http://superadmin.paymydine.com/images/flags/canada.png',404,'[\"http:\\/\\/superadmin.paymydine.com\\/superadmin\\/login\"]',1,'2025-09-25 21:33:27','2025-09-25 21:33:27'),
(366,'http://superadmin.paymydine.com/images/flags/china.png',404,'[\"http:\\/\\/superadmin.paymydine.com\\/superadmin\\/login\"]',2,'2025-09-25 21:33:27','2025-09-25 21:33:28'),
(367,'http://superadmin.paymydine.com/images/flags/french.png',404,'[\"http:\\/\\/superadmin.paymydine.com\\/superadmin\\/login\"]',1,'2025-09-25 21:33:27','2025-09-25 21:33:27'),
(368,'http://superadmin.paymydine.com/images/flags/germany.png',404,'[\"http:\\/\\/superadmin.paymydine.com\\/superadmin\\/login\"]',1,'2025-09-25 21:33:27','2025-09-25 21:33:27'),
(369,'http://superadmin.paymydine.com/images/flags/iran.png',404,'[\"http:\\/\\/superadmin.paymydine.com\\/superadmin\\/login\"]',1,'2025-09-25 21:33:27','2025-09-25 21:33:27'),
(370,'http://superadmin.paymydine.com/images/flags/italy.png',404,'[\"http:\\/\\/superadmin.paymydine.com\\/superadmin\\/login\"]',1,'2025-09-25 21:33:27','2025-09-25 21:33:27'),
(371,'http://superadmin.paymydine.com/images/flags/mexico.png',404,'[\"http:\\/\\/superadmin.paymydine.com\\/superadmin\\/login\"]',1,'2025-09-25 21:33:27','2025-09-25 21:33:27'),
(372,'http://superadmin.paymydine.com/images/flags/philipine.png',404,'[\"http:\\/\\/superadmin.paymydine.com\\/superadmin\\/login\"]',1,'2025-09-25 21:33:27','2025-09-25 21:33:27'),
(373,'http://superadmin.paymydine.com/images/flags/portugal.png',404,'[\"http:\\/\\/superadmin.paymydine.com\\/superadmin\\/login\"]',1,'2025-09-25 21:33:27','2025-09-25 21:33:27'),
(374,'http://superadmin.paymydine.com/images/flags/spanish.png',404,'[\"http:\\/\\/superadmin.paymydine.com\\/superadmin\\/login\"]',1,'2025-09-25 21:33:27','2025-09-25 21:33:27'),
(375,'http://superadmin.paymydine.com/images/flags/s-africa.png',404,'[\"http:\\/\\/superadmin.paymydine.com\\/superadmin\\/login\"]',1,'2025-09-25 21:33:27','2025-09-25 21:33:27'),
(376,'http://superadmin.paymydine.com/images/flags/switzerland.png',404,'[\"http:\\/\\/superadmin.paymydine.com\\/superadmin\\/login\"]',1,'2025-09-25 21:33:27','2025-09-25 21:33:27'),
(377,'http://superadmin.paymydine.com/images/flags/uk.png',404,'[\"http:\\/\\/superadmin.paymydine.com\\/superadmin\\/login\"]',1,'2025-09-25 21:33:27','2025-09-25 21:33:27'),
(378,'http://superadmin.paymydine.com/images/flags/english.png',404,'[\"http:\\/\\/superadmin.paymydine.com\\/superadmin\\/login\"]',1,'2025-09-25 21:33:27','2025-09-25 21:33:27'),
(379,'http://57.129.43.190/api/.env',404,NULL,77,'2025-09-27 01:18:37','2025-10-11 04:38:17'),
(380,'http://paymydine.com/api/.env',404,NULL,5,'2025-09-27 13:07:35','2025-10-09 15:11:34'),
(381,'http://57.129.43.190/api/shared/config/config.env',404,NULL,4,'2025-09-28 18:56:32','2025-10-06 19:38:11'),
(382,'http://57.129.43.190/api/shared/config.env',404,NULL,4,'2025-09-28 18:56:32','2025-10-06 19:38:12'),
(383,'http://57.129.43.190/api/shared/config/.env',404,NULL,4,'2025-09-28 18:56:33','2025-10-06 19:38:30'),
(384,'http://57.129.43.190/api/shared/.env',404,NULL,4,'2025-09-28 18:56:33','2025-10-06 19:38:30'),
(385,'http://57.129.43.190/api/config.env',404,NULL,4,'2025-09-28 18:56:33','2025-10-06 19:38:31'),
(386,'http://57.129.43.190/api/config.js',404,NULL,3,'2025-09-28 18:56:43','2025-10-02 13:24:21'),
(387,'http://57.129.43.190/api/objects/codes.php.save',404,NULL,3,'2025-09-28 18:56:43','2025-10-02 13:24:21'),
(388,'http://57.129.43.190/api/config/config.yml',404,NULL,3,'2025-09-28 18:56:57','2025-10-02 13:24:25'),
(389,'http://57.129.43.190/api/config/tsconfig.json',404,NULL,3,'2025-10-07 19:53:27','2025-10-07 21:35:42'),
(390,'http://paymydine.com/api/pos/square/webhook',404,NULL,2,'2025-10-09 01:13:24','2025-10-09 01:15:59'),
(391,'http://vps-252f1bc4.vps.ovh.net/api/v1/check-version',404,NULL,1,'2025-10-09 04:43:21','2025-10-09 04:43:21'),
(392,'http://vps-252f1bc4.vps.ovh.net/api/server/version',404,NULL,1,'2025-10-09 04:43:21','2025-10-09 04:43:21'),
(393,'http://vps-252f1bc4.vps.ovh.net/api/v2/about',404,NULL,1,'2025-10-09 04:43:22','2025-10-09 04:43:22'),
(394,'http://vps-252f1bc4.vps.ovh.net/api/version',404,NULL,1,'2025-10-09 04:43:22','2025-10-09 04:43:22'),
(395,'http://vps-252f1bc4.vps.ovh.net/api/vip/i18n/api/v2/translation/products/vRNIUI/versions/1',404,NULL,1,'2025-10-09 04:43:23','2025-10-09 04:43:23'),
(396,'http://vps-252f1bc4.vps.ovh.net/api/v1.0/environment',404,NULL,1,'2025-10-09 04:43:23','2025-10-09 04:43:23'),
(397,'http://vps-252f1bc4.vps.ovh.net/api/v3/meta',404,NULL,1,'2025-10-09 04:43:24','2025-10-09 04:43:24'),
(398,'http://vps-252f1bc4.vps.ovh.net/api/v1/version',404,NULL,1,'2025-10-09 04:43:24','2025-10-09 04:43:24'),
(399,'http://paymydine.com/api/shared/config/config.env',404,NULL,1,'2025-10-09 04:45:05','2025-10-09 04:45:05'),
(400,'http://paymydine.com/api/shared/config.env',404,NULL,1,'2025-10-09 04:45:05','2025-10-09 04:45:05'),
(401,'http://paymydine.com/api/shared/config/.env',404,NULL,1,'2025-10-09 04:45:05','2025-10-09 04:45:05'),
(402,'http://paymydine.com/api/shared/.env',404,NULL,1,'2025-10-09 04:45:05','2025-10-09 04:45:05'),
(403,'http://paymydine.com/api/config.env',404,NULL,1,'2025-10-09 04:45:05','2025-10-09 04:45:05'),
(404,'http://paymydine.com/api/config.js',404,NULL,1,'2025-10-09 04:45:08','2025-10-09 04:45:08'),
(405,'http://paymydine.com/api/objects/codes.php.save',404,NULL,1,'2025-10-09 04:45:08','2025-10-09 04:45:08'),
(406,'http://paymydine.com/api/config/config.yml',404,NULL,1,'2025-10-09 04:45:09','2025-10-09 04:45:09'),
(407,'http://vps-252f1bc4.vps.ovh.net/api/config/tsconfig.json',404,NULL,1,'2025-10-09 23:45:37','2025-10-09 23:45:37'),
(408,'http://vps-252f1bc4.vps.ovh.net/api/.env',404,NULL,1,'2025-10-09 23:45:38','2025-10-09 23:45:38'),
(409,'http://paymydine.com/api/v1/webhooks/pos',404,NULL,1,'2025-10-10 12:58:01','2025-10-10 12:58:01'),
(410,'http://57.129.43.190/api/sonicos/auth',404,NULL,1,'2025-10-11 01:07:49','2025-10-11 01:07:49'),
(411,'http://57.129.43.190/api/sonicos/tfa',404,NULL,1,'2025-10-11 01:07:49','2025-10-11 01:07:49'),
(412,'http://anonyig.com/api/v1/instagram/userInfo',404,NULL,1,'2025-10-11 01:52:45','2025-10-11 01:52:45'),
(413,'http://mimoza.paymydine.com/api/menu',404,'[\"http:\\/\\/mimoza.paymydine.com\\/menu\"]',1,'2025-10-14 20:28:28','2025-10-14 20:28:28'),
(414,'http://mimoza.paymydine.com/api/menus',404,'[\"http:\\/\\/mimoza.paymydine.com\\/menu\"]',1,'2025-10-14 20:28:28','2025-10-14 20:28:28'),
(415,'http://mimoza.paymydine.com/api/locations/menu',404,'[\"http:\\/\\/mimoza.paymydine.com\\/menu\"]',1,'2025-10-14 20:28:29','2025-10-14 20:28:29'),
(416,'http://mimoza.paymydine.com/api/v1/webhooks/pos',404,NULL,4,'2025-10-24 14:55:42','2025-10-25 18:58:58'),
(417,'http://mimoza.paymydine.com/api/v1/debug/conn',404,'[\"http:\\/\\/mimoza.paymydine.com\\/menu?table_no=52&qr=ms55pmMznl\"]',1,'2025-11-27 10:57:02','2025-11-27 10:57:02'),
(418,'http://mimoza.paymydine.com/api/orders',404,'[\"http:\\/\\/mimoza.paymydine.com\\/menu?table_no=52&qr=ms55pmMznl\"]',4,'2025-11-28 18:47:34','2025-11-28 18:56:24'),
(419,'http://mimoza.paymydine.com/api-server.php/orders',404,'[\"http:\\/\\/mimoza.paymydine.com\\/menu?table_no=52&qr=ms55pmMznl\"]',2,'2025-11-28 18:47:37','2025-11-28 18:56:25');
/*!40000 ALTER TABLE `ti_request_logs` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `ti_reservation_tables`
--

LOCK TABLES `ti_reservation_tables` WRITE;
/*!40000 ALTER TABLE `ti_reservation_tables` DISABLE KEYS */;
INSERT INTO `ti_reservation_tables` VALUES
(1,6),
(2,1),
(3,2);
/*!40000 ALTER TABLE `ti_reservation_tables` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `ti_reservations`
--

LOCK TABLES `ti_reservations` WRITE;
/*!40000 ALTER TABLE `ti_reservations` DISABLE KEYS */;
INSERT INTO `ti_reservations` VALUES
(2,1,0,6,NULL,NULL,'oussama','douba','douba.oussama69@gmail.com','+57671409293','','00:00:00','2025-01-09','2025-01-06','2025-01-06',NULL,NULL,NULL,'10.10.1.254','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',6,'c0a243eeecc97c9a618fe4f2af647702',0,NULL,'2025-01-06 10:25:11',NULL),
(3,1,0,3,NULL,NULL,'oussama','douba','Oussama@hpcmicrosystems.net','+57671409293','','01:00:00','2025-01-16','2025-01-06','2025-01-06',NULL,NULL,NULL,'10.10.1.254','Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36',8,'77920fe4d5953d0eae0afd2f352c1d2b',0,NULL,'2025-01-06 11:02:10',NULL);
/*!40000 ALTER TABLE `ti_reservations` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `ti_sessions`
--

LOCK TABLES `ti_sessions` WRITE;
/*!40000 ALTER TABLE `ti_sessions` DISABLE KEYS */;
/*!40000 ALTER TABLE `ti_sessions` ENABLE KEYS */;
UNLOCK TABLES;

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
) ENGINE=InnoDB AUTO_INCREMENT=247 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ti_settings`
--

LOCK TABLES `ti_settings` WRITE;
/*!40000 ALTER TABLE `ti_settings` DISABLE KEYS */;
INSERT INTO `ti_settings` VALUES
(1,'prefs','default_location_id','1',NULL),
(3,'config','country_id','81',NULL),
(4,'config','timezone','Europe/London',NULL),
(5,'config','default_currency_code','6',NULL),
(6,'config','default_language','en',NULL),
(7,'config','detect_language','0',NULL),
(9,'config','allow_registration','1',NULL),
(10,'config','customer_group_id','1',NULL),
(14,'config','maps_api_key','',NULL),
(15,'config','distance_unit','km',NULL),
(16,'config','location_order','0',NULL),
(17,'config','location_order_email','0',NULL),
(18,'config','location_reserve_email','0',NULL),
(19,'config','default_order_status','1',NULL),
(22,'config','menus_page','home',NULL),
(23,'config','reservation_page','home',NULL),
(24,'config','guest_order','1',NULL),
(25,'config','default_reservation_status','8',NULL),
(26,'config','confirmed_reservation_status','6',NULL),
(27,'config','canceled_order_status','9',NULL),
(28,'config','canceled_reservation_status','7',NULL),
(30,'config','tax_mode','1',NULL),
(31,'config','invoice_prefix','INV-{year}-00',NULL),
(32,'config','protocol','log',NULL),
(33,'config','smtp_host','smtp.mailgun.org',NULL),
(34,'config','smtp_port','587',NULL),
(35,'config','smtp_user','',NULL),
(36,'config','smtp_pass','',NULL),
(37,'config','log_threshold','1',NULL),
(38,'config','permalink','1',NULL),
(39,'config','maintenance_mode','0',NULL),
(40,'config','maintenance_message','Site is under maintenance. Please check back later.',NULL),
(41,'config','cache_mode','0',NULL),
(42,'config','cache_time','0',NULL),
(44,'prefs','ti_setup','installed',NULL),
(45,'config','supported_languages.0','en',NULL),
(46,'config','registration_email.0','customer',NULL),
(47,'config','order_email.0','customer',NULL),
(48,'config','order_email.1','admin',NULL),
(49,'config','reservation_email.0','customer',NULL),
(50,'config','reservation_email.1','admin',NULL),
(51,'config','processing_order_status.0','2',NULL),
(52,'config','processing_order_status.1','3',NULL),
(53,'config','processing_order_status.2','4',NULL),
(54,'config','completed_order_status.0','5',NULL),
(55,'config','image_manager.max_size','300',NULL),
(58,'config','image_manager.uploads','1',NULL),
(59,'config','image_manager.new_folder','1',NULL),
(60,'config','image_manager.copy','1',NULL),
(61,'config','image_manager.move','1',NULL),
(62,'config','image_manager.rename','1',NULL),
(63,'config','image_manager.delete','1',NULL),
(67,'config','site_email','admin@domain.tld',NULL),
(69,'config','sender_email','admin@domain.tld',NULL),
(70,'prefs','ti_version','v3.7.7',NULL),
(72,'config','installed_themes.tastyigniter-orange','1',NULL),
(73,'config','installed_themes.tastyigniter-typical','1',NULL),
(74,'prefs','default_themes.main','frontend-theme',NULL),
(75,'config','currency_converter.api','openexchangerates',NULL),
(76,'config','currency_converter.oer.apiKey','',NULL),
(77,'config','currency_converter.fixerio.apiKey','',NULL),
(78,'config','currency_converter.refreshInterval','24',NULL),
(79,'config','enable_request_log','1',NULL),
(80,'config','activity_log_timeout','90',NULL),
(81,'prefs','carte_key','ad620368a1337faf283c11ab2fcfc333e50ec439',NULL),
(82,'prefs','carte_info.id','8002',NULL),
(83,'prefs','carte_info.owner','Amir ifooas',NULL),
(84,'prefs','carte_info.name','Amir',NULL),
(85,'prefs','carte_info.url','https://tastyigniter.com/account/sites/new/self',NULL),
(86,'prefs','carte_info.email','A.firoozi1380@outlook.com',NULL),
(88,'prefs','carte_info.is_premium','0',NULL),
(89,'prefs','carte_info.items_count','0',NULL),
(90,'prefs','carte_info.updated_at','2025-11-11T23:43:04.000000Z',NULL),
(91,'prefs','carte_info.created_at','2025-11-11T23:43:04.000000Z',NULL),
(95,'prefs','allocator_is_enabled','1',NULL),
(96,'config','default_geocoder','nominatim',NULL),
(97,'prefs','admin_dashboardwidgets_default_dashboard.order_stats.widget','stats',NULL),
(98,'prefs','admin_dashboardwidgets_default_dashboard.order_stats.priority','20',NULL),
(99,'prefs','admin_dashboardwidgets_default_dashboard.order_stats.card','sale',NULL),
(100,'prefs','admin_dashboardwidgets_default_dashboard.order_stats.width','4',NULL),
(101,'prefs','admin_dashboardwidgets_default_dashboard.reservation_stats.widget','stats',NULL),
(102,'prefs','admin_dashboardwidgets_default_dashboard.reservation_stats.priority','20',NULL),
(103,'prefs','admin_dashboardwidgets_default_dashboard.reservation_stats.card','lost_sale',NULL),
(104,'prefs','admin_dashboardwidgets_default_dashboard.reservation_stats.width','4',NULL),
(105,'prefs','admin_dashboardwidgets_default_dashboard.customer_stats.widget','stats',NULL),
(106,'prefs','admin_dashboardwidgets_default_dashboard.customer_stats.priority','20',NULL),
(107,'prefs','admin_dashboardwidgets_default_dashboard.customer_stats.card','cash_payment',NULL),
(108,'prefs','admin_dashboardwidgets_default_dashboard.customer_stats.width','4',NULL),
(109,'prefs','admin_dashboardwidgets_default_dashboard.reports.widget','charts',NULL),
(110,'prefs','admin_dashboardwidgets_default_dashboard.reports.priority','30',NULL),
(111,'prefs','admin_dashboardwidgets_default_dashboard.reports.width','12',NULL),
(112,'prefs','admin_dashboardwidgets_default_dashboard.recent-activities.widget','recent-activities',NULL),
(113,'prefs','admin_dashboardwidgets_default_dashboard.recent-activities.priority','40',NULL),
(114,'prefs','admin_dashboardwidgets_default_dashboard.recent-activities.width','6',NULL),
(115,'prefs','admin_dashboardwidgets_default_dashboard.cache.priority','90',NULL),
(116,'prefs','admin_dashboardwidgets_default_dashboard.cache.width','6',NULL),
(120,'config','mail_logo','/2.png',NULL),
(121,'config','smtp_encryption','tls',NULL),
(122,'config','mailgun_domain','',NULL),
(123,'config','mailgun_secret','',NULL),
(124,'config','postmark_token','',NULL),
(125,'config','ses_key','',NULL),
(126,'config','ses_secret','',NULL),
(127,'config','ses_region','',NULL),
(129,'config','installed_themes.frontend-theme','1',NULL),
(133,'order_notifications','order_notifications_enabled','1',0),
(187,'config','tax_percentage','10',NULL),
(188,'config','tax_menu_price','0',NULL),
(189,'config','tax_delivery_charge','0',NULL),
(201,'prefs','carte_info.description',NULL,NULL),
(211,'config','image_manager.thumb_width','320',NULL),
(212,'config','image_manager.thumb_height','220',NULL),
(213,'config','image_manager.transliteration','0',NULL),
(214,'config','image_manager.remember_days','7',NULL),
(239,'config','supported_languages.1','Fr',NULL),
(240,'config','supported_languages.2','De',NULL),
(241,'config','site_name','Mimoza',NULL),
(242,'config','site_logo','/Mimoza-designstyle-cartoon-m.png',NULL),
(243,'config','dashboard_logo','/Mimoza-designstyle-cartoon-m.png',NULL),
(244,'config','loader_logo','/Mimoza-designstyle-cartoon-m.png',NULL),
(245,'config','favicon_logo','/android-chrome-512x512.png',NULL),
(246,'config','admin_after_save_action','close',NULL);
/*!40000 ALTER TABLE `ti_settings` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `ti_staff_groups`
--

LOCK TABLES `ti_staff_groups` WRITE;
/*!40000 ALTER TABLE `ti_staff_groups` DISABLE KEYS */;
INSERT INTO `ti_staff_groups` VALUES
(1,'Owners','Default group for owners',0,1,20,1,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(2,'Managers','Default group for managers',0,1,20,1,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(3,'Waiters','Default group for waiters.',0,1,20,1,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(4,'Delivery','Default group for delivery drivers.',0,1,20,1,'2024-12-31 17:34:40','2024-12-31 17:34:40'),
(5,'test','',1,1,20,1,'2025-01-02 20:39:04','2025-01-02 20:39:04');
/*!40000 ALTER TABLE `ti_staff_groups` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `ti_staff_roles`
--

LOCK TABLES `ti_staff_roles` WRITE;
/*!40000 ALTER TABLE `ti_staff_roles` DISABLE KEYS */;
INSERT INTO `ti_staff_roles` VALUES
(1,'Owner','owner','Default role for restaurant owners','a:40:{s:15:\"Admin.Dashboard\";s:1:\"1\";s:15:\"Admin.Allergens\";s:1:\"1\";s:16:\"Admin.Categories\";s:1:\"1\";s:11:\"Admin.Menus\";s:1:\"1\";s:15:\"Admin.Mealtimes\";s:1:\"1\";s:15:\"Admin.Locations\";s:1:\"1\";s:12:\"Admin.Tables\";s:1:\"1\";s:12:\"Admin.Orders\";s:1:\"1\";s:18:\"Admin.DeleteOrders\";s:1:\"1\";s:18:\"Admin.AssignOrders\";s:1:\"1\";s:18:\"Admin.Reservations\";s:1:\"1\";s:24:\"Admin.DeleteReservations\";s:1:\"1\";s:24:\"Admin.AssignReservations\";s:1:\"1\";s:14:\"Admin.Payments\";s:1:\"1\";s:20:\"Admin.CustomerGroups\";s:1:\"1\";s:15:\"Admin.Customers\";s:1:\"1\";s:17:\"Admin.Impersonate\";s:1:\"1\";s:26:\"Admin.ImpersonateCustomers\";s:1:\"1\";s:17:\"Admin.StaffGroups\";s:1:\"1\";s:12:\"Admin.Staffs\";s:1:\"1\";s:14:\"Admin.Statuses\";s:1:\"1\";s:13:\"Admin.Coupons\";s:1:\"1\";s:18:\"Admin.MediaManager\";s:1:\"1\";s:11:\"Site.Themes\";s:1:\"1\";s:16:\"Admin.Activities\";s:1:\"1\";s:16:\"Admin.Extensions\";s:1:\"1\";s:19:\"Admin.MailTemplates\";s:1:\"1\";s:14:\"Site.Countries\";s:1:\"1\";s:15:\"Site.Currencies\";s:1:\"1\";s:14:\"Site.Languages\";s:1:\"1\";s:13:\"Site.Settings\";s:1:\"1\";s:12:\"Site.Updates\";s:1:\"1\";s:16:\"Admin.SystemLogs\";s:1:\"1\";s:25:\"Igniter.Automation.Manage\";s:1:\"1\";s:17:\"Module.CartModule\";s:1:\"1\";s:31:\"Igniter.FrontEnd.ManageSettings\";s:1:\"1\";s:30:\"Igniter.FrontEnd.ManageBanners\";s:1:\"1\";s:32:\"Igniter.FrontEnd.ManageSlideshow\";s:1:\"1\";s:13:\"Admin.Reviews\";s:1:\"1\";s:20:\"Igniter.Pages.Manage\";s:1:\"1\";}','2024-12-31 17:34:40','2025-01-05 20:59:03'),
(2,'Manager','manager','Default role for restaurant managers.','a:16:{s:15:\"Admin.Dashboard\";s:1:\"1\";s:16:\"Admin.Categories\";s:1:\"1\";s:14:\"Admin.Statuses\";s:1:\"1\";s:12:\"Admin.Staffs\";s:1:\"1\";s:17:\"Admin.StaffGroups\";s:1:\"1\";s:15:\"Admin.Customers\";s:1:\"1\";s:20:\"Admin.CustomerGroups\";s:1:\"1\";s:14:\"Admin.Payments\";s:1:\"1\";s:18:\"Admin.Reservations\";s:1:\"1\";s:12:\"Admin.Orders\";s:1:\"1\";s:12:\"Admin.Tables\";s:1:\"1\";s:15:\"Admin.Locations\";s:1:\"1\";s:15:\"Admin.Mealtimes\";s:1:\"1\";s:11:\"Admin.Menus\";s:1:\"1\";s:11:\"Site.Themes\";s:1:\"1\";s:18:\"Admin.MediaManager\";s:1:\"1\";}','2024-12-31 17:34:40','2024-12-31 17:34:40'),
(3,'Waiter','waiter','Default role for restaurant waiters.','a:3:{s:12:\"Admin.Orders\";s:1:\"1\";s:18:\"Admin.DeleteOrders\";s:1:\"1\";s:18:\"Admin.AssignOrders\";s:1:\"1\";}','2024-12-31 17:34:40','2025-10-31 16:15:09'),
(4,'Delivery','delivery','Default role for restaurant delivery.','a:3:{s:14:\"Admin.Statuses\";s:1:\"1\";s:18:\"Admin.Reservations\";s:1:\"1\";s:12:\"Admin.Orders\";s:1:\"1\";}','2024-12-31 17:34:40','2024-12-31 17:34:40'),
(5,'test','1234','','a:26:{s:15:\"Admin.Dashboard\";s:1:\"1\";s:15:\"Admin.Allergens\";s:1:\"1\";s:16:\"Admin.Categories\";s:1:\"1\";s:11:\"Admin.Menus\";s:1:\"1\";s:15:\"Admin.Mealtimes\";s:1:\"1\";s:15:\"Admin.Locations\";s:1:\"1\";s:12:\"Admin.Tables\";s:1:\"1\";s:12:\"Admin.Orders\";s:1:\"1\";s:18:\"Admin.DeleteOrders\";s:1:\"1\";s:18:\"Admin.AssignOrders\";s:1:\"1\";s:18:\"Admin.Reservations\";s:1:\"1\";s:24:\"Admin.DeleteReservations\";s:1:\"1\";s:24:\"Admin.AssignReservations\";s:1:\"1\";s:14:\"Admin.Payments\";s:1:\"1\";s:20:\"Admin.CustomerGroups\";s:1:\"1\";s:15:\"Admin.Customers\";s:1:\"1\";s:26:\"Admin.ImpersonateCustomers\";s:1:\"1\";s:17:\"Admin.StaffGroups\";s:1:\"1\";s:12:\"Admin.Staffs\";s:1:\"1\";s:14:\"Admin.Statuses\";s:1:\"1\";s:13:\"Admin.Coupons\";s:1:\"1\";s:11:\"Site.Themes\";s:1:\"1\";s:14:\"Site.Countries\";s:1:\"1\";s:15:\"Site.Currencies\";s:1:\"1\";s:13:\"Site.Settings\";s:1:\"1\";s:13:\"Admin.Reviews\";s:1:\"1\";}','2025-01-02 20:38:43','2025-03-02 21:06:51'),
(6,'Demo','1234','External Test','a:3:{s:12:\"Admin.Orders\";s:1:\"1\";s:18:\"Admin.DeleteOrders\";s:1:\"1\";s:18:\"Admin.AssignOrders\";s:1:\"1\";}','2025-10-31 16:11:40','2025-10-31 16:11:40');
/*!40000 ALTER TABLE `ti_staff_roles` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `ti_staffs`
--

LOCK TABLES `ti_staffs` WRITE;
/*!40000 ALTER TABLE `ti_staffs` DISABLE KEYS */;
INSERT INTO `ti_staffs` VALUES
(1,'Chef Admin','admin@admin.com',1,1,'2024-12-31',1,1,'2024-12-31 17:34:56'),
(2,'Admin','admin@test.com',5,1,'2025-01-02',1,1,'2025-01-02 20:39:56'),
(3,'Chef Admin','admin@domain.tld',1,1,'2025-09-23',1,1,'2025-09-23 11:20:11'),
(4,'Chef Admin','admin@paymydine.com',1,1,'2025-09-23',1,1,'2025-09-23 15:47:14'),
(5,'Demo','demo@yahoo.com',6,1,'2025-10-31',1,1,'2025-10-31 16:13:35'),
(6,'DemoTest','Waiter@yahoo.com',3,1,'2025-10-31',1,1,'2025-10-31 16:16:32');
/*!40000 ALTER TABLE `ti_staffs` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `ti_staffs_groups`
--

LOCK TABLES `ti_staffs_groups` WRITE;
/*!40000 ALTER TABLE `ti_staffs_groups` DISABLE KEYS */;
INSERT INTO `ti_staffs_groups` VALUES
(1,1),
(2,5),
(3,1),
(4,1),
(5,5),
(6,3);
/*!40000 ALTER TABLE `ti_staffs_groups` ENABLE KEYS */;
UNLOCK TABLES;

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
) ENGINE=InnoDB AUTO_INCREMENT=452 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ti_status_history`
--

LOCK TABLES `ti_status_history` WRITE;
/*!40000 ALTER TABLE `ti_status_history` DISABLE KEYS */;
INSERT INTO `ti_status_history` VALUES
(6,1,'reservations',NULL,8,0,'Your table reservation is pending.','2025-01-04 13:54:56','2025-01-04 13:54:56'),
(7,1,'reservations',1,6,0,'Your table reservation has been confirmed.','2025-01-04 13:55:34','2025-01-04 13:55:34'),
(12,2,'reservations',NULL,8,0,'Your table reservation is pending.','2025-01-06 10:24:42','2025-01-06 10:24:42'),
(13,2,'reservations',2,6,0,'Your table reservation has been confirmed.','2025-01-06 10:25:11','2025-01-06 10:25:11'),
(15,3,'reservations',NULL,8,0,'Your table reservation is pending.','2025-01-06 11:02:10','2025-01-06 11:02:10'),
(31,12,'orders',NULL,1,0,'Your order has been received.','2025-02-07 11:30:27','2025-02-07 11:30:27'),
(32,13,'orders',NULL,1,0,'Your order has been received.','2025-02-07 11:30:27','2025-02-07 11:30:27'),
(33,14,'orders',NULL,1,0,'Your order has been received.','2025-02-07 11:30:30','2025-02-07 11:30:30'),
(34,13,'orders',NULL,5,0,'','2025-02-07 11:30:46','2025-02-07 11:30:46'),
(35,15,'orders',NULL,1,0,'Your order has been received.','2025-02-07 11:31:49','2025-02-07 11:31:49'),
(36,15,'orders',1,3,1,'Your order is in the kitchen','2025-02-07 11:32:20','2025-02-07 11:32:20'),
(37,15,'orders',1,1,1,'Your order has been received.','2025-02-07 11:32:35','2025-02-07 11:32:35'),
(38,16,'orders',NULL,1,0,'Your order has been received.','2025-02-07 11:33:01','2025-02-07 11:33:01'),
(39,16,'orders',1,5,0,'','2025-02-07 11:33:16','2025-02-07 11:33:16'),
(40,17,'orders',NULL,1,0,'Your order has been received.','2025-02-07 12:59:33','2025-02-07 12:59:33'),
(41,17,'orders',NULL,3,1,'Your order is in the kitchen','2025-02-07 13:00:17','2025-02-07 13:00:17'),
(42,17,'orders',NULL,5,0,'','2025-02-07 13:00:25','2025-02-07 13:00:25'),
(43,18,'orders',NULL,1,0,'Your order has been received.','2025-02-07 21:08:47','2025-02-07 21:08:47'),
(44,18,'orders',NULL,9,0,'','2025-02-07 21:10:05','2025-02-07 21:10:05'),
(51,28,'orders',NULL,1,0,'Your order has been received.','2025-02-11 20:37:04','2025-02-11 20:37:04'),
(59,33,'orders',NULL,1,0,'Your order has been received.','2025-02-13 21:54:01','2025-02-13 21:54:01'),
(60,34,'orders',NULL,1,0,'Your order has been received.','2025-02-16 18:02:07','2025-02-16 18:02:07'),
(61,34,'orders',NULL,3,1,'Your order is in the kitchen','2025-02-16 18:02:59','2025-02-16 18:02:59'),
(62,34,'orders',NULL,5,0,'','2025-02-16 18:03:21','2025-02-16 18:03:21'),
(63,34,'orders',NULL,3,1,'Your order is in the kitchen','2025-02-16 18:04:16','2025-02-16 18:04:16'),
(69,36,'orders',NULL,1,0,'Your order has been received.','2025-02-16 18:06:53','2025-02-16 18:06:53'),
(73,38,'orders',NULL,1,0,'Your order has been received.','2025-02-16 23:31:21','2025-02-16 23:31:21'),
(74,39,'orders',NULL,1,0,'Your order has been received.','2025-02-17 14:50:15','2025-02-17 14:50:15'),
(75,40,'orders',NULL,1,0,'Your order has been received.','2025-02-17 17:19:56','2025-02-17 17:19:56'),
(76,41,'orders',NULL,1,0,'Your order has been received.','2025-02-17 17:23:12','2025-02-17 17:23:12'),
(77,41,'orders',NULL,9,0,'','2025-02-17 17:23:48','2025-02-17 17:23:48'),
(78,42,'orders',NULL,1,0,'Your order has been received.','2025-02-17 17:24:48','2025-02-17 17:24:48'),
(82,44,'orders',NULL,1,0,'Your order has been received.','2025-02-17 17:28:47','2025-02-17 17:28:47'),
(139,64,'orders',NULL,1,0,'Your order has been received.','2025-02-27 10:42:20','2025-02-27 10:42:20'),
(195,84,'orders',NULL,1,0,'Your order has been received.','2025-02-28 19:50:48','2025-02-28 19:50:48'),
(196,84,'orders',NULL,5,0,'','2025-02-28 19:51:01','2025-02-28 19:51:01'),
(197,84,'orders',NULL,10,1,'Your order is paid','2025-02-28 19:57:16','2025-02-28 19:57:16'),
(248,111,'orders',NULL,1,0,'Your order has been received.','2025-03-02 12:58:24','2025-03-02 12:58:24'),
(249,112,'orders',NULL,1,0,'Your order has been received.','2025-03-02 13:38:23','2025-03-02 13:38:23'),
(250,112,'orders',NULL,10,0,'Your order is paid','2025-03-02 13:39:03','2025-03-02 13:39:03'),
(251,112,'orders',NULL,3,1,'Your order is in the kitchen','2025-03-02 13:39:49','2025-03-02 13:39:49'),
(252,112,'orders',NULL,10,0,'Your order is paid','2025-03-02 13:40:32','2025-03-02 13:40:32'),
(253,113,'orders',NULL,3,1,'Your order is in the kitchen','2025-03-02 13:43:57','2025-03-02 13:43:57'),
(254,113,'orders',NULL,1,1,'Your order has been received.','2025-03-02 13:44:08','2025-03-02 13:44:08'),
(255,113,'orders',NULL,10,0,'Your order is paid','2025-03-02 13:44:51','2025-03-02 13:44:51'),
(256,114,'orders',NULL,1,0,'Your order has been received.','2025-03-02 13:46:38','2025-03-02 13:46:38'),
(257,114,'orders',NULL,10,0,'Your order is paid','2025-03-02 13:47:19','2025-03-02 13:47:19'),
(258,115,'orders',NULL,1,0,'Your order has been received.','2025-03-02 13:50:17','2025-03-02 13:50:17'),
(259,115,'orders',NULL,10,0,'Your order is paid','2025-03-02 13:50:29','2025-03-02 13:50:29'),
(260,116,'orders',NULL,3,1,'Your order is in the kitchen','2025-03-02 13:53:33','2025-03-02 13:53:33'),
(261,116,'orders',NULL,10,0,'Your order is paid','2025-03-02 13:55:00','2025-03-02 13:55:00'),
(262,117,'orders',NULL,1,0,'Your order has been received.','2025-03-02 14:55:47','2025-03-02 14:55:47'),
(263,117,'orders',NULL,10,0,'Your order is paid','2025-03-02 14:55:54','2025-03-02 14:55:54'),
(264,111,'orders',NULL,9,0,'','2025-03-02 14:59:11','2025-03-02 14:59:11'),
(265,119,'orders',NULL,1,0,'Your order has been received.','2025-03-02 14:59:40','2025-03-02 14:59:40'),
(266,119,'orders',NULL,3,1,'Your order is in the kitchen','2025-03-02 14:59:56','2025-03-02 14:59:56'),
(267,119,'orders',NULL,5,0,'','2025-03-02 15:00:03','2025-03-02 15:00:03'),
(268,119,'orders',NULL,10,0,'Your order is paid','2025-03-02 15:00:11','2025-03-02 15:00:11'),
(269,120,'orders',NULL,1,0,'Your order has been received.','2025-03-02 15:01:14','2025-03-02 15:01:14'),
(270,121,'orders',NULL,1,0,'Your order has been received.','2025-03-02 15:02:17','2025-03-02 15:02:17'),
(271,121,'orders',NULL,3,1,'Your order is in the kitchen','2025-03-02 15:02:28','2025-03-02 15:02:28'),
(272,121,'orders',NULL,5,0,'','2025-03-02 15:02:40','2025-03-02 15:02:40'),
(273,121,'orders',NULL,10,0,'Your order is paid','2025-03-02 15:02:48','2025-03-02 15:02:48'),
(274,122,'orders',NULL,3,1,'Your order is in the kitchen','2025-03-02 15:03:47','2025-03-02 15:03:47'),
(275,122,'orders',NULL,5,0,'','2025-03-02 15:04:00','2025-03-02 15:04:00'),
(276,122,'orders',NULL,10,0,'Your order is paid','2025-03-02 15:04:15','2025-03-02 15:04:15'),
(277,118,'orders',NULL,9,0,'','2025-03-02 20:51:33','2025-03-02 20:51:33'),
(278,118,'orders',NULL,10,1,'Your order is paid','2025-03-02 20:51:44','2025-03-02 20:51:44'),
(279,111,'orders',NULL,10,1,'Your order is paid','2025-03-02 20:51:46','2025-03-02 20:51:46'),
(280,123,'orders',NULL,1,0,'Your order has been received.','2025-03-02 20:52:32','2025-03-02 20:52:32'),
(281,123,'orders',NULL,3,1,'Your order is in the kitchen','2025-03-02 20:52:47','2025-03-02 20:52:47'),
(282,123,'orders',NULL,5,0,'','2025-03-02 20:52:53','2025-03-02 20:52:53'),
(283,123,'orders',NULL,10,0,'Your order is paid','2025-03-02 20:53:15','2025-03-02 20:53:15'),
(284,124,'orders',NULL,3,1,'Your order is in the kitchen','2025-03-02 20:54:26','2025-03-02 20:54:26'),
(285,124,'orders',NULL,5,0,'','2025-03-02 20:54:29','2025-03-02 20:54:29'),
(286,124,'orders',NULL,10,0,'Your order is paid','2025-03-02 20:55:31','2025-03-02 20:55:31'),
(287,125,'orders',NULL,1,0,'Your order has been received.','2025-03-02 20:57:53','2025-03-02 20:57:53'),
(288,125,'orders',NULL,3,1,'Your order is in the kitchen','2025-03-02 20:58:16','2025-03-02 20:58:16'),
(289,125,'orders',NULL,5,0,'','2025-03-02 20:58:23','2025-03-02 20:58:23'),
(290,125,'orders',NULL,10,0,'Your order is paid','2025-03-02 20:58:34','2025-03-02 20:58:34'),
(291,126,'orders',NULL,1,0,'Your order has been received.','2025-03-03 10:05:02','2025-03-03 10:05:02'),
(292,126,'orders',NULL,5,0,'','2025-03-03 10:05:10','2025-03-03 10:05:10'),
(293,126,'orders',NULL,10,0,'Your order is paid','2025-03-03 10:05:22','2025-03-03 10:05:22'),
(294,127,'orders',NULL,1,0,'Your order has been received.','2025-03-03 10:14:38','2025-03-03 10:14:38'),
(295,127,'orders',NULL,3,1,'Your order is in the kitchen','2025-03-03 10:14:52','2025-03-03 10:14:52'),
(296,127,'orders',NULL,5,0,'','2025-03-03 10:15:04','2025-03-03 10:15:04'),
(297,127,'orders',NULL,10,0,'Your order is paid','2025-03-03 10:15:11','2025-03-03 10:15:11'),
(298,128,'orders',NULL,5,0,'','2025-03-03 10:16:33','2025-03-03 10:16:33'),
(299,129,'orders',NULL,3,1,'Your order is in the kitchen','2025-03-03 10:17:26','2025-03-03 10:17:26'),
(300,129,'orders',NULL,5,0,'','2025-03-03 10:17:47','2025-03-03 10:17:47'),
(301,129,'orders',NULL,10,0,'Your order is paid','2025-03-03 10:17:55','2025-03-03 10:17:55'),
(302,130,'orders',NULL,5,0,'','2025-03-03 15:39:43','2025-03-03 15:39:43'),
(303,132,'orders',NULL,1,0,'Your order has been received.','2025-03-03 15:43:33','2025-03-03 15:43:33'),
(304,132,'orders',NULL,3,1,'Your order is in the kitchen','2025-03-03 15:43:47','2025-03-03 15:43:47'),
(305,132,'orders',NULL,5,0,'','2025-03-03 15:43:55','2025-03-03 15:43:55'),
(306,132,'orders',NULL,10,0,'Your order is paid','2025-03-03 15:44:08','2025-03-03 15:44:08'),
(307,133,'orders',NULL,5,0,'','2025-03-03 15:44:57','2025-03-03 15:44:57'),
(308,133,'orders',NULL,10,0,'Your order is paid','2025-03-03 15:45:12','2025-03-03 15:45:12'),
(309,134,'orders',NULL,5,0,'','2025-03-03 15:46:54','2025-03-03 15:46:54'),
(310,134,'orders',NULL,10,1,'Your order is paid','2025-03-03 16:11:29','2025-03-03 16:11:29'),
(311,131,'orders',NULL,10,1,'Your order is paid','2025-03-03 16:11:31','2025-03-03 16:11:31'),
(312,130,'orders',NULL,10,1,'Your order is paid','2025-03-03 16:11:32','2025-03-03 16:11:32'),
(313,135,'orders',NULL,5,0,'','2025-03-03 16:13:28','2025-03-03 16:13:28'),
(314,136,'orders',NULL,3,1,'Your order is in the kitchen','2025-03-03 16:13:30','2025-03-03 16:13:30'),
(315,136,'orders',NULL,10,0,'Your order is paid','2025-03-03 16:14:13','2025-03-03 16:14:13'),
(316,135,'orders',NULL,10,0,'Your order is paid','2025-03-03 16:14:19','2025-03-03 16:14:19'),
(334,147,'orders',NULL,1,0,'Your order has been received.','2025-03-06 02:47:31','2025-03-06 01:47:31'),
(335,147,'orders',NULL,10,0,'Your order is paid','2025-03-06 02:49:21','2025-03-06 01:49:21'),
(336,147,'orders',NULL,1,1,'Your order has been received.','2025-03-06 02:56:34','2025-03-06 01:56:34'),
(337,147,'orders',NULL,10,0,'Your order is paid','2025-03-06 03:04:31','2025-03-06 02:04:31'),
(338,147,'orders',NULL,1,1,'Your order has been received.','2025-03-06 03:05:05','2025-03-06 02:05:05'),
(339,147,'orders',NULL,10,0,'Your order is paid','2025-03-06 03:06:49','2025-03-06 02:06:49'),
(340,147,'orders',NULL,1,1,'Your order has been received.','2025-03-06 03:10:53','2025-03-06 02:10:53'),
(341,147,'orders',NULL,1,1,'Your order has been received.','2025-03-06 03:10:54','2025-03-06 02:10:54'),
(342,147,'orders',NULL,10,0,'Your order is paid','2025-03-06 03:20:28','2025-03-06 02:20:28'),
(343,147,'orders',NULL,1,1,'Your order has been received.','2025-03-06 03:23:34','2025-03-06 02:23:34'),
(344,147,'orders',NULL,10,0,'Your order is paid','2025-03-06 03:24:47','2025-03-06 02:24:47'),
(365,147,'orders',NULL,1,1,'Your order has been received.','2025-03-06 16:14:16','2025-03-06 15:14:16'),
(451,310,'orders',NULL,3,1,'Your order is in the kitchen','2025-12-05 23:48:05','2025-12-05 23:48:05');
/*!40000 ALTER TABLE `ti_status_history` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `ti_statuses`
--

LOCK TABLES `ti_statuses` WRITE;
/*!40000 ALTER TABLE `ti_statuses` DISABLE KEYS */;
INSERT INTO `ti_statuses` VALUES
(1,'Received','Your order has been received.',1,'order','#686663','2024-12-31 17:34:40','2024-12-31 17:34:40'),
(3,'Preparation','Your order is in the kitchen',1,'order','#00c0ef','2024-12-31 17:34:40','2024-12-31 17:34:40'),
(4,'Delivery','Your order will be with you shortly.',0,'order','#00a65a','2024-12-31 17:34:40','2024-12-31 17:34:40'),
(5,'Completed','',0,'order','#00a65a','2024-12-31 17:34:40','2024-12-31 17:34:40'),
(9,'Canceled','',0,'order','#ea0b29','2024-12-31 17:34:40','2024-12-31 17:34:40');
/*!40000 ALTER TABLE `ti_statuses` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `ti_stock_history`
--

LOCK TABLES `ti_stock_history` WRITE;
/*!40000 ALTER TABLE `ti_stock_history` DISABLE KEYS */;
/*!40000 ALTER TABLE `ti_stock_history` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `ti_stocks`
--

LOCK TABLES `ti_stocks` WRITE;
/*!40000 ALTER TABLE `ti_stocks` DISABLE KEYS */;
INSERT INTO `ti_stocks` VALUES
(1,1,6,'menus',NULL,0,0,0,'2025-01-02 18:04:24','2025-01-02 18:04:24',0),
(2,1,9,'menus',NULL,0,0,0,'2025-01-02 18:04:24','2025-01-02 18:04:24',0),
(3,1,12,'menus',NULL,0,0,0,'2025-01-02 18:04:24','2025-01-02 18:04:24',0),
(4,1,4,'menus',NULL,0,0,0,'2025-01-03 15:10:49','2025-01-03 15:10:49',0),
(5,1,8,'menus',NULL,0,0,0,'2025-01-05 19:18:40','2025-01-05 19:18:40',0),
(6,1,3,'menus',NULL,0,0,0,'2025-01-06 11:00:49','2025-01-06 11:00:49',0),
(7,1,2,'menus',NULL,0,0,0,'2025-01-20 09:03:13','2025-01-20 09:03:13',0),
(8,1,5,'menus',NULL,0,0,0,'2025-01-25 19:46:53','2025-01-25 19:46:53',0),
(9,1,7,'menus',NULL,0,0,0,'2025-01-25 19:48:37','2025-01-25 19:48:37',0),
(10,1,11,'menus',NULL,0,0,0,'2025-01-25 20:57:46','2025-01-25 20:57:46',0),
(11,1,10,'menus',NULL,0,0,0,'2025-02-17 17:23:13','2025-02-17 17:23:13',0),
(12,1,1,'menus',NULL,0,0,0,'2025-03-02 15:01:14','2025-03-02 15:01:14',0),
(13,1,19,'menus',NULL,0,0,0,'2025-10-25 00:31:49','2025-10-25 00:31:49',0);
/*!40000 ALTER TABLE `ti_stocks` ENABLE KEYS */;
UNLOCK TABLES;

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
) ENGINE=InnoDB AUTO_INCREMENT=56 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ti_tables`
--

LOCK TABLES `ti_tables` WRITE;
/*!40000 ALTER TABLE `ti_tables` DISABLE KEYS */;
INSERT INTO `ti_tables` VALUES
(36,3,'Table 3',6,2,1,2,1,1,'2025-10-01 19:48:14','2025-10-01 19:48:14','ms36YdHBbp'),
(37,NULL,'Cashier',1,1,1,0,0,999,'2025-10-01 19:48:31','2025-10-01 19:48:31','cashier'),
(39,10,'Table 10',11,1,1,1,1,1,'2025-10-04 19:27:27','2025-10-04 19:27:27','ms38sycdLC'),
(40,11,'Table 11',4,2,1,2,1,1,'2025-10-07 19:38:37','2025-10-07 19:38:37','ms40Sh4zbi'),
(41,12,'Table 12',5,8,1,2,1,1,'2025-10-09 17:38:36','2025-10-09 17:38:36','ms41nuqMaK');
/*!40000 ALTER TABLE `ti_tables` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `ti_themes`
--

LOCK TABLES `ti_themes` WRITE;
/*!40000 ALTER TABLE `ti_themes` DISABLE KEYS */;
INSERT INTO `ti_themes` VALUES
(2,'Orange Theme','tastyigniter-orange','Free Modern, Responsive and Clean TastyIgniter Theme based on Bootstrap.','0.1.0',NULL,1,0,NULL,'2025-12-06 02:43:59'),
(3,'Typical Theme','tastyigniter-typical','The Typical theme features a clean and modern design that is optimized for restaurants and food businesses.','0.1.0','{\"social\": [], \"favicon\": null, \"custom_js\": \"\", \"logo_text\": \"\", \"custom_css\": \"\", \"font.color\": \"#34495e\", \"logo_image\": null, \"enable_gdpr\": \"1\", \"font.family\": \"\\\"Gilroy\\\", helveticaneue-light, helvetica neue light\", \"font.weight\": \"400\", \"logo_height\": \"40px\", \"heading.color\": \"#ffffff\", \"title_history\": \"\", \"enable_history\": \"0\", \"body.background\": \"#ffffff\", \"gdpr_text_color\": \"#ffffff\", \"ga_tracking_code\": \"\", \"gdpr_accept_text\": \"OK\", \"history_repeater\": [], \"subtitle_history\": \"\", \"button.item.price\": \"#ffffff\", \"footer.background\": \"#2d2b2f\", \"footer.font_color\": \"#ffffff\", \"header_breadcrumb\": null, \"reservation_image\": null, \"button.icons.color\": \"#ffffff\", \"button.item.border\": \"#29282d\", \"heading.background\": \"#2b3e50\", \"button.titles.color\": \"#ffffff\", \"gdpr_cookie_message\": \"We use own and third party cookies to improve our services. If you continue to browse, consider accepting its use\", \"gdpr_more_info_link\": \"1\", \"gdpr_more_info_text\": \"More Information\", \"introduction_history\": \"\", \"gdpr_background_color\": \"#000000\", \"button.dark.background\": \"#7f8c8d\", \"button.info.background\": \"#17a2b8\", \"button.item.background\": \"#2e2c30\", \"button.item.transition\": \"#232227\", \"button.light.background\": \"#efeded\", \"button.panel.background\": \"#2e2c30\", \"button.button.text.color\": \"#ffffff\", \"button.danger.background\": \"#dc3545\", \"button.flecha.categorias\": \"#ef1010\", \"button.item.button.hover\": \"#232227\", \"button.default.background\": \"#29d884\", \"button.primary.background\": \"#ef1010\", \"button.success.background\": \"#28a745\", \"button.warning.background\": \"#ffc107\", \"button.item.button.border.hover\": \"#333235\"}',1,0,NULL,'2025-12-06 02:43:59'),
(5,'Menu Theme','frontend-theme','Next.js powered front-end theme for PayMyDine.','0.1.0','{\"theme_configuration\":\"dark\"}',1,0,NULL,'2025-12-06 02:44:57');
/*!40000 ALTER TABLE `ti_themes` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `ti_tips_shifts`
--

LOCK TABLES `ti_tips_shifts` WRITE;
/*!40000 ALTER TABLE `ti_tips_shifts` DISABLE KEYS */;
INSERT INTO `ti_tips_shifts` VALUES
(1,'2025-12-05',1,NULL,'Test 1','2025-12-05 12:13:57','2025-12-05 12:13:57');
/*!40000 ALTER TABLE `ti_tips_shifts` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `ti_user_preferences`
--

LOCK TABLES `ti_user_preferences` WRITE;
/*!40000 ALTER TABLE `ti_user_preferences` DISABLE KEYS */;
INSERT INTO `ti_user_preferences` VALUES
(1,2,'admin_dashboardwidgets_dashboard','{\"order_stats\":{\"widget\":\"stats\",\"priority\":20,\"card\":\"sale\",\"width\":\"4\"},\"reservation_stats\":{\"widget\":\"stats\",\"priority\":20,\"card\":\"lost_sale\",\"width\":\"4\"},\"customer_stats\":{\"widget\":\"stats\",\"priority\":20,\"card\":\"cash_payment\",\"width\":\"4\"},\"reports\":{\"widget\":\"charts\",\"priority\":30,\"width\":\"12\"},\"recent-activities\":{\"widget\":\"recent-activities\",\"priority\":40,\"width\":\"6\"},\"cache\":{\"priority\":90,\"width\":\"6\"}}'),
(2,1,'admin_dashboardwidgets_dashboard','{\"reports\":{\"dataset\":\"reports\",\"widget\":\"charts\",\"priority\":5,\"width\":\"12\",\"alias\":\"reports\"},\"stat_circle_3_28ZNu\":{\"card\":\"collection_order\",\"widget\":\"stat_circle_3\",\"width\":\"2\",\"priority\":1,\"alias\":\"stat_circle_3_28ZNu\"},\"stat_circle_3_quiKf\":{\"card\":\"completed_order\",\"widget\":\"stat_circle_3\",\"width\":\"2\",\"priority\":0,\"alias\":\"stat_circle_3_quiKf\"},\"stat_circle_3_VKKe6\":{\"card\":\"reserved_table\",\"widget\":\"stat_circle_3\",\"width\":\"2\",\"priority\":2,\"alias\":\"stat_circle_3_VKKe6\"},\"stat_circle_3_KebVX\":{\"card\":\"reserved_guest\",\"widget\":\"stat_circle_3\",\"width\":\"2\",\"priority\":3,\"alias\":\"stat_circle_3_KebVX\"},\"cache_v0qAb\":{\"title\":\"admin::lang.dashboard.text_cache_usage\",\"widget\":\"cache\",\"width\":\"4\",\"priority\":7,\"alias\":\"cache_v0qAb\"},\"stat_circle_3_0V9sV\":{\"card\":\"customer\",\"widget\":\"stat_circle_3\",\"width\":\"2\",\"priority\":4,\"alias\":\"stat_circle_3_0V9sV\"},\"stat_circle_3_I1rfu\":{\"card\":\"reserved_table\",\"widget\":\"stat_circle_3\",\"width\":\"3\",\"priority\":8,\"alias\":\"stat_circle_3_I1rfu\"},\"stat_circle_3_MESo7\":{\"card\":\"order\",\"widget\":\"stat_circle_3\",\"width\":\"3\",\"priority\":9,\"alias\":\"stat_circle_3_MESo7\"}}'),
(3,1,'order_notifications_enabled','1');
/*!40000 ALTER TABLE `ti_user_preferences` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `ti_users`
--

LOCK TABLES `ti_users` WRITE;
/*!40000 ALTER TABLE `ti_users` DISABLE KEYS */;
INSERT INTO `ti_users` VALUES
(1,1,'admin','$2y$10$RmucbFtnyqTRnwIjDbIQBOK.b4nmtLHM/UedVoOmCw0TGd3k9FFSq',1,NULL,NULL,NULL,'nmqbO9zp9B1hw6ZSIgNyr3wd64uVvSvh9sPFhCGR1U',1,'2024-12-31 00:00:00','2025-12-06 09:00:20',NULL,NULL,NULL),
(2,2,'user','$2y$10$sqyd64X3Vkxz7m2hPvSTDuCH72bYu6o03qcXZJqYM/7p.7oEaSypy',0,NULL,NULL,NULL,NULL,1,'2025-01-02 00:00:00','2025-03-03 15:32:59',NULL,NULL,NULL),
(3,3,'admin2','$2y$10$aSe.17PSMcIPqdYqUeuGSefPMqMftTnEywgY0FkgGCOLNHFfM07o2',1,NULL,NULL,NULL,NULL,1,'2025-09-23 00:00:00',NULL,NULL,NULL,NULL),
(4,4,'user1','$2y$10$8IZT8SLp0Plk7sPFWGur8eizO9FbKTd0ZTWuexemMc0FFS0hQXoQ6',1,NULL,NULL,NULL,NULL,1,'2025-09-23 00:00:00',NULL,NULL,NULL,NULL),
(5,5,'Demo','$2y$10$W5jgCqHcCsHw3JpGInEYG.HwmNLA4BUDYnHsPSPAIWeNU1ZgieieK',0,'gv7yakLqvieg6adBQ47UqAyhgkUNzCkJZo785xRPZe','2025-10-31 16:13:35',NULL,NULL,1,'2025-10-31 00:00:00',NULL,NULL,NULL,NULL),
(6,6,'DemoTest','$2y$10$qmZYIpIBytPGSLL5rgqp2euQqNooNaH3tFEApxLbyd.UxhyQX9J7O',0,NULL,NULL,NULL,NULL,1,'2025-10-31 00:00:00','2025-11-08 18:59:08',NULL,NULL,NULL);
/*!40000 ALTER TABLE `ti_users` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `ti_websockets_statistics_entries`
--

LOCK TABLES `ti_websockets_statistics_entries` WRITE;
/*!40000 ALTER TABLE `ti_websockets_statistics_entries` DISABLE KEYS */;
/*!40000 ALTER TABLE `ti_websockets_statistics_entries` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `ti_working_hours`
--

LOCK TABLES `ti_working_hours` WRITE;
/*!40000 ALTER TABLE `ti_working_hours` DISABLE KEYS */;
INSERT INTO `ti_working_hours` VALUES
(1,0,'00:00:00','23:59:00',1,'opening',1),
(1,1,'00:00:00','23:59:00',1,'opening',2),
(1,2,'00:00:00','23:59:00',1,'opening',3),
(1,3,'00:00:00','23:59:00',1,'opening',4),
(1,4,'00:00:00','23:59:00',1,'opening',5),
(1,5,'00:00:00','23:59:00',1,'opening',6),
(1,6,'00:00:00','23:59:00',1,'opening',7),
(1,0,'00:00:00','23:59:00',1,'delivery',8),
(1,1,'00:00:00','23:59:00',1,'delivery',9),
(1,2,'00:00:00','23:59:00',1,'delivery',10),
(1,3,'00:00:00','23:59:00',1,'delivery',11),
(1,4,'00:00:00','23:59:00',1,'delivery',12),
(1,5,'00:00:00','23:59:00',1,'delivery',13),
(1,6,'00:00:00','23:59:00',1,'delivery',14),
(1,0,'00:00:00','23:59:00',1,'collection',15),
(1,1,'00:00:00','23:59:00',1,'collection',16),
(1,2,'00:00:00','23:59:00',1,'collection',17),
(1,3,'00:00:00','23:59:00',1,'collection',18),
(1,4,'00:00:00','23:59:00',1,'collection',19),
(1,5,'00:00:00','23:59:00',1,'collection',20),
(1,6,'00:00:00','23:59:00',1,'collection',21);
/*!40000 ALTER TABLE `ti_working_hours` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*M!100616 SET NOTE_VERBOSITY=@OLD_NOTE_VERBOSITY */;

-- Dump completed on 2025-12-06  9:05:18

-- MySQL dump 10.13  Distrib 8.0.41, for Linux (x86_64)
--
-- Host: localhost    Database: taste
-- ------------------------------------------------------
-- Server version	8.0.41-0ubuntu0.22.04.1

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `qr_code`
--

DROP TABLE IF EXISTS `qr_code`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `qr_code` (
  `id` int NOT NULL AUTO_INCREMENT,
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
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_activities` (
  `activity_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `log_name` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `properties` text COLLATE utf8mb4_unicode_ci,
  `subject_id` int DEFAULT NULL,
  `subject_type` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `causer_id` int DEFAULT NULL,
  `causer_type` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `updated_at` datetime NOT NULL,
  `type` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `read_at` datetime DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `user_type` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`activity_id`)
) ENGINE=InnoDB AUTO_INCREMENT=41 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ti_activities`
--

LOCK TABLES `ti_activities` WRITE;
/*!40000 ALTER TABLE `ti_activities` DISABLE KEYS */;
INSERT INTO `ti_activities` VALUES (1,1,'2025-01-02 18:04:24','default','{\"order_id\":1,\"full_name\":\"oussama douba\"}',1,'orders',NULL,NULL,'2025-01-02 18:04:24','orderCreated',NULL,NULL,'users'),(2,1,'2025-01-03 15:10:50','default','{\"order_id\":2,\"full_name\":\"oussama douba\"}',2,'orders',NULL,NULL,'2025-01-03 15:10:50','orderCreated',NULL,NULL,'users'),(3,2,'2025-01-03 15:10:50','default','{\"order_id\":2,\"full_name\":\"oussama douba\"}',2,'orders',NULL,NULL,'2025-01-03 15:10:50','orderCreated',NULL,NULL,'users'),(4,1,'2025-01-04 13:54:57','default','{\"reservation_id\":1,\"full_name\":\"oussama douba\"}',1,'reservations',NULL,NULL,'2025-01-04 13:54:57','reservationCreated',NULL,NULL,'users'),(5,2,'2025-01-04 13:54:57','default','{\"reservation_id\":1,\"full_name\":\"oussama douba\"}',1,'reservations',NULL,NULL,'2025-01-04 13:54:57','reservationCreated',NULL,NULL,'users'),(6,1,'2025-01-04 20:52:53','default','{\"customer_id\":1,\"full_name\":\"oussama douba\"}',1,'customers',1,'customers','2025-01-04 20:52:53','customerRegistered',NULL,NULL,'users'),(7,1,'2025-01-05 19:18:40','default','{\"order_id\":3,\"full_name\":\"oussama douba\"}',3,'orders',1,'customers','2025-01-05 19:18:40','orderCreated',NULL,NULL,'users'),(8,2,'2025-01-05 19:18:40','default','{\"order_id\":3,\"full_name\":\"oussama douba\"}',3,'orders',1,'customers','2025-01-05 19:18:40','orderCreated',NULL,NULL,'users'),(9,1,'2025-01-06 10:24:42','default','{\"reservation_id\":2,\"full_name\":\"oussama douba\"}',2,'reservations',NULL,NULL,'2025-01-06 10:24:42','reservationCreated',NULL,NULL,'users'),(10,2,'2025-01-06 10:24:42','default','{\"reservation_id\":2,\"full_name\":\"oussama douba\"}',2,'reservations',NULL,NULL,'2025-01-06 10:24:42','reservationCreated',NULL,NULL,'users'),(11,1,'2025-01-06 11:00:49','default','{\"order_id\":4,\"full_name\":\"oussama douba\"}',4,'orders',NULL,NULL,'2025-01-06 11:00:49','orderCreated',NULL,NULL,'users'),(12,2,'2025-01-06 11:00:49','default','{\"order_id\":4,\"full_name\":\"oussama douba\"}',4,'orders',NULL,NULL,'2025-01-06 11:00:49','orderCreated',NULL,NULL,'users'),(13,1,'2025-01-06 11:02:10','default','{\"reservation_id\":3,\"full_name\":\"oussama douba\"}',3,'reservations',NULL,NULL,'2025-01-06 11:02:10','reservationCreated',NULL,NULL,'users'),(14,2,'2025-01-06 11:02:10','default','{\"reservation_id\":3,\"full_name\":\"oussama douba\"}',3,'reservations',NULL,NULL,'2025-01-06 11:02:10','reservationCreated',NULL,NULL,'users'),(15,1,'2025-01-20 09:03:13','default','{\"order_id\":5,\"full_name\":\"oussama douba\"}',5,'orders',NULL,NULL,'2025-01-20 09:03:13','orderCreated',NULL,NULL,'users'),(16,2,'2025-01-20 09:03:13','default','{\"order_id\":5,\"full_name\":\"oussama douba\"}',5,'orders',NULL,NULL,'2025-01-20 09:03:13','orderCreated',NULL,NULL,'users'),(17,1,'2025-01-25 19:31:57','default','{\"order_id\":6,\"full_name\":\"Chief Admin\"}',6,'orders',NULL,NULL,'2025-01-25 19:31:57','orderCreated',NULL,NULL,'users'),(18,2,'2025-01-25 19:31:57','default','{\"order_id\":6,\"full_name\":\"Chief Admin\"}',6,'orders',NULL,NULL,'2025-01-25 19:31:57','orderCreated',NULL,NULL,'users'),(19,1,'2025-01-25 19:46:53','default','{\"order_id\":7,\"full_name\":\"Chief Admin\"}',7,'orders',NULL,NULL,'2025-01-25 19:46:53','orderCreated',NULL,NULL,'users'),(20,2,'2025-01-25 19:46:53','default','{\"order_id\":7,\"full_name\":\"Chief Admin\"}',7,'orders',NULL,NULL,'2025-01-25 19:46:53','orderCreated',NULL,NULL,'users'),(21,1,'2025-01-25 19:48:37','default','{\"order_id\":8,\"full_name\":\"Chief Admin\"}',8,'orders',NULL,NULL,'2025-01-25 19:48:37','orderCreated',NULL,NULL,'users'),(22,2,'2025-01-25 19:48:37','default','{\"order_id\":8,\"full_name\":\"Chief Admin\"}',8,'orders',NULL,NULL,'2025-01-25 19:48:37','orderCreated',NULL,NULL,'users'),(23,1,'2025-01-25 20:57:46','default','{\"order_id\":9,\"full_name\":\"Chief Admin\"}',9,'orders',NULL,NULL,'2025-01-25 20:57:46','orderCreated',NULL,NULL,'users'),(24,2,'2025-01-25 20:57:46','default','{\"order_id\":9,\"full_name\":\"Chief Admin\"}',9,'orders',NULL,NULL,'2025-01-25 20:57:46','orderCreated',NULL,NULL,'users'),(25,1,'2025-01-26 18:28:55','default','{\"order_id\":10,\"full_name\":\"Chief Admin\"}',10,'orders',NULL,NULL,'2025-01-26 18:28:55','orderCreated',NULL,NULL,'users'),(26,2,'2025-01-26 18:28:55','default','{\"order_id\":10,\"full_name\":\"Chief Admin\"}',10,'orders',NULL,NULL,'2025-01-26 18:28:55','orderCreated',NULL,NULL,'users'),(27,1,'2025-02-03 10:51:46','default','{\"order_id\":11,\"full_name\":\"Chief Admin\"}',11,'orders',NULL,NULL,'2025-02-03 10:51:46','orderCreated',NULL,NULL,'users'),(28,2,'2025-02-03 10:51:46','default','{\"order_id\":11,\"full_name\":\"Chief Admin\"}',11,'orders',NULL,NULL,'2025-02-03 10:51:46','orderCreated',NULL,NULL,'users'),(29,1,'2025-02-07 11:30:27','default','{\"order_id\":12,\"full_name\":\"Chief Admin\"}',12,'orders',NULL,NULL,'2025-02-07 11:30:27','orderCreated',NULL,NULL,'users'),(30,2,'2025-02-07 11:30:27','default','{\"order_id\":12,\"full_name\":\"Chief Admin\"}',12,'orders',NULL,NULL,'2025-02-07 11:30:27','orderCreated',NULL,NULL,'users'),(31,1,'2025-02-07 11:30:27','default','{\"order_id\":13,\"full_name\":\"Chief Admin\"}',13,'orders',NULL,NULL,'2025-02-07 11:30:27','orderCreated',NULL,NULL,'users'),(32,2,'2025-02-07 11:30:27','default','{\"order_id\":13,\"full_name\":\"Chief Admin\"}',13,'orders',NULL,NULL,'2025-02-07 11:30:27','orderCreated',NULL,NULL,'users'),(33,1,'2025-02-07 11:30:30','default','{\"order_id\":14,\"full_name\":\"Chief Admin\"}',14,'orders',NULL,NULL,'2025-02-07 11:30:30','orderCreated',NULL,NULL,'users'),(34,2,'2025-02-07 11:30:30','default','{\"order_id\":14,\"full_name\":\"Chief Admin\"}',14,'orders',NULL,NULL,'2025-02-07 11:30:30','orderCreated',NULL,NULL,'users'),(35,1,'2025-02-07 11:31:49','default','{\"order_id\":15,\"full_name\":\"Chief Admin\"}',15,'orders',NULL,NULL,'2025-02-07 11:31:49','orderCreated',NULL,NULL,'users'),(36,2,'2025-02-07 11:31:49','default','{\"order_id\":15,\"full_name\":\"Chief Admin\"}',15,'orders',NULL,NULL,'2025-02-07 11:31:49','orderCreated',NULL,NULL,'users'),(37,1,'2025-02-07 11:33:01','default','{\"order_id\":16,\"full_name\":\"Chief Admin\"}',16,'orders',NULL,NULL,'2025-02-07 11:33:01','orderCreated',NULL,NULL,'users'),(38,2,'2025-02-07 11:33:01','default','{\"order_id\":16,\"full_name\":\"Chief Admin\"}',16,'orders',NULL,NULL,'2025-02-07 11:33:01','orderCreated',NULL,NULL,'users'),(39,1,'2025-02-07 12:59:33','default','{\"order_id\":17,\"full_name\":\"Chief Admin\"}',17,'orders',NULL,NULL,'2025-02-07 12:59:33','orderCreated',NULL,NULL,'users'),(40,2,'2025-02-07 12:59:33','default','{\"order_id\":17,\"full_name\":\"Chief Admin\"}',17,'orders',NULL,NULL,'2025-02-07 12:59:33','orderCreated',NULL,NULL,'users');
/*!40000 ALTER TABLE `ti_activities` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ti_addresses`
--

DROP TABLE IF EXISTS `ti_addresses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_addresses` (
  `address_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `customer_id` int DEFAULT NULL,
  `address_1` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `address_2` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `city` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `state` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `postcode` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `country_id` int NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`address_id`)
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ti_addresses`
--

LOCK TABLES `ti_addresses` WRITE;
/*!40000 ALTER TABLE `ti_addresses` DISABLE KEYS */;
INSERT INTO `ti_addresses` VALUES (1,NULL,'City rossiers dar el beida Alger','','City rossiers dar el beida Alger','AG01','16011',81,NULL,NULL),(2,NULL,'City rossiers dar el beida Alger','','City rossiers dar el beida Alger','AG01','16011',81,NULL,NULL),(3,NULL,'Null','Null','Null','Null','Null',81,NULL,NULL),(4,NULL,'Null','Null','Null','Null','Null',81,NULL,NULL),(5,NULL,'Null','Null','Null','Null','Null',81,NULL,NULL),(6,NULL,'Null','Null','Null','Null','Null',81,NULL,NULL),(7,NULL,'Null','Null','Null','Null','Null',81,NULL,NULL),(8,NULL,'Null','Null','Null','Null','Null',81,NULL,NULL),(9,NULL,'Null','Null','Null','Null','Null',81,NULL,NULL),(10,NULL,'Null','Null','Null','Null','Null',81,NULL,NULL),(11,NULL,'Null','Null','Null','Null','Null',81,NULL,NULL),(12,NULL,'Null','Null','Null','Null','Null',81,NULL,NULL),(13,NULL,'Null','Null','Null','Null','Null',81,NULL,NULL),(14,NULL,'Null','Null','Null','Null','Null',81,NULL,NULL),(15,NULL,'Null','Null','Null','Null','Null',81,NULL,NULL);
/*!40000 ALTER TABLE `ti_addresses` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ti_allergenables`
--

DROP TABLE IF EXISTS `ti_allergenables`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_allergenables` (
  `allergen_id` int unsigned NOT NULL,
  `allergenable_type` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `allergenable_id` bigint unsigned NOT NULL,
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
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_allergens` (
  `allergen_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` tinyint(1) NOT NULL DEFAULT '1',
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
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_assignable_logs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `assignable_type` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `assignable_id` bigint unsigned NOT NULL,
  `assignee_id` int unsigned DEFAULT NULL,
  `assignee_group_id` int unsigned DEFAULT NULL,
  `status_id` int unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `ti_assignable_logs_assignable_type_assignable_id_index` (`assignable_type`,`assignable_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ti_assignable_logs`
--

LOCK TABLES `ti_assignable_logs` WRITE;
/*!40000 ALTER TABLE `ti_assignable_logs` DISABLE KEYS */;
INSERT INTO `ti_assignable_logs` VALUES (1,'orders',11,1,1,3,'2025-02-03 11:01:29','2025-02-03 11:01:29');
/*!40000 ALTER TABLE `ti_assignable_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ti_cache`
--

DROP TABLE IF EXISTS `ti_cache`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_cache` (
  `key` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `value` mediumtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `expiration` int NOT NULL,
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
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_categories` (
  `category_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `parent_id` int DEFAULT NULL,
  `priority` int NOT NULL DEFAULT '0',
  `status` tinyint(1) NOT NULL DEFAULT '1',
  `nest_left` int DEFAULT NULL,
  `nest_right` int DEFAULT NULL,
  `permalink_slug` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`category_id`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ti_categories`
--

LOCK TABLES `ti_categories` WRITE;
/*!40000 ALTER TABLE `ti_categories` DISABLE KEYS */;
INSERT INTO `ti_categories` VALUES (1,'Appetizer','',NULL,1,1,1,2,'appetizer','2024-12-31 17:34:40','2025-01-05 20:44:58'),(2,'Main Course','',NULL,6,1,3,4,NULL,'2024-12-31 17:34:40','2025-01-05 20:42:28'),(3,'Salads','',NULL,3,1,5,6,'salads','2024-12-31 17:34:40','2025-01-05 20:44:48'),(4,'Seafoods','',NULL,4,1,7,8,'seafoods','2024-12-31 17:34:40','2025-01-05 20:44:43'),(5,'Traditional','',NULL,5,1,9,10,'traditional','2024-12-31 17:34:40','2025-01-05 20:44:35'),(6,'Desserts','',NULL,8,1,11,12,'desserts','2024-12-31 17:34:40','2025-01-05 20:42:52'),(7,'Drinks','',NULL,9,1,13,14,'drinks','2024-12-31 17:34:40','2025-01-05 20:42:45'),(8,'Specials','',NULL,2,1,15,16,'specials','2024-12-31 17:34:40','2025-01-05 20:44:22');
/*!40000 ALTER TABLE `ti_categories` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ti_countries`
--

DROP TABLE IF EXISTS `ti_countries`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_countries` (
  `country_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `country_name` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `iso_code_2` varchar(2) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `iso_code_3` varchar(3) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `format` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `status` tinyint(1) NOT NULL DEFAULT '0',
  `priority` int NOT NULL DEFAULT '999',
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
INSERT INTO `ti_countries` VALUES (1,'Afghanistan','AF','AFG','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(2,'Albania','AL','ALB','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(3,'Algeria','DZ','DZA','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(4,'American Samoa','AS','ASM','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(5,'Andorra','AD','AND','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(6,'Angola','AO','AGO','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(7,'Anguilla','AI','AIA','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(8,'Antarctica','AQ','ATA','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(9,'Antigua and Barbuda','AG','ATG','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(10,'Argentina','AR','ARG','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(11,'Armenia','AM','ARM','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(12,'Aruba','AW','ABW','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(13,'Australia','AU','AUS','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(14,'Austria','AT','AUT','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(15,'Azerbaijan','AZ','AZE','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(16,'Bahamas','BS','BHS','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(17,'Bahrain','BH','BHR','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(18,'Bangladesh','BD','BGD','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(19,'Barbados','BB','BRB','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(20,'Belarus','BY','BLR','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(21,'Belgium','BE','BEL','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(22,'Belize','BZ','BLZ','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(23,'Benin','BJ','BEN','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(24,'Bermuda','BM','BMU','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(25,'Bhutan','BT','BTN','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(26,'Bolivia','BO','BOL','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(27,'Bosnia and Herzegowina','BA','BIH','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(28,'Botswana','BW','BWA','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(29,'Bouvet Island','BV','BVT','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(30,'Brazil','BR','BRA','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(31,'British Indian Ocean Territory','IO','IOT','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(32,'Brunei Darussalam','BN','BRN','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(33,'Bulgaria','BG','BGR','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(34,'Burkina Faso','BF','BFA','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(35,'Burundi','BI','BDI','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(36,'Cambodia','KH','KHM','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(37,'Cameroon','CM','CMR','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(38,'Canada','CA','CAN','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(39,'Cape Verde','CV','CPV','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(40,'Cayman Islands','KY','CYM','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(41,'Central African Republic','CF','CAF','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(42,'Chad','TD','TCD','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(43,'Chile','CL','CHL','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(44,'China','CN','CHN','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(45,'Christmas Island','CX','CXR','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(46,'Cocos (Keeling) Islands','CC','CCK','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(47,'Colombia','CO','COL','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(48,'Comoros','KM','COM','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(49,'Congo','CG','COG','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(50,'Cook Islands','CK','COK','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(51,'Costa Rica','CR','CRI','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(52,'Cote D\'Ivoire','CI','CIV','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(53,'Croatia','HR','HRV','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(54,'Cuba','CU','CUB','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(55,'Cyprus','CY','CYP','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(56,'Czech Republic','CZ','CZE','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(57,'Denmark','DK','DNK','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(58,'Djibouti','DJ','DJI','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(59,'Dominica','DM','DMA','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(60,'Dominican Republic','DO','DOM','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(61,'East Timor','TP','TMP','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(62,'Ecuador','EC','ECU','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(63,'Egypt','EG','EGY','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(64,'El Salvador','SV','SLV','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(65,'Equatorial Guinea','GQ','GNQ','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(66,'Eritrea','ER','ERI','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(67,'Estonia','EE','EST','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(68,'Ethiopia','ET','ETH','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(69,'Falkland Islands (Malvinas)','FK','FLK','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(70,'Faroe Islands','FO','FRO','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(71,'Fiji','FJ','FJI','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(72,'Finland','FI','FIN','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(73,'France','FR','FRA','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(74,'France, Metropolitan','FX','FXX','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(75,'French Guiana','GF','GUF','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(76,'French Polynesia','PF','PYF','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(77,'French Southern Territories','TF','ATF','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(78,'Gabon','GA','GAB','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(79,'Gambia','GM','GMB','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(80,'Georgia','GE','GEO','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(81,'Germany','DE','DEU','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(82,'Ghana','GH','GHA','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(83,'Gibraltar','GI','GIB','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(84,'Greece','GR','GRC','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(85,'Greenland','GL','GRL','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(86,'Grenada','GD','GRD','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(87,'Guadeloupe','GP','GLP','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(88,'Guam','GU','GUM','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(89,'Guatemala','GT','GTM','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(90,'Guinea','GN','GIN','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(91,'Guinea-bissau','GW','GNB','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(92,'Guyana','GY','GUY','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(93,'Haiti','HT','HTI','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(94,'Heard and Mc Donald Islands','HM','HMD','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(95,'Honduras','HN','HND','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(96,'Hong Kong','HK','HKG','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(97,'Hungary','HU','HUN','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(98,'Iceland','IS','ISL','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(99,'India','IN','IND','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(100,'Indonesia','ID','IDN','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(101,'Iran (Islamic Republic of)','IR','IRN','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(102,'Iraq','IQ','IRQ','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(103,'Ireland','IE','IRL','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(104,'Israel','IL','ISR','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(105,'Italy','IT','ITA','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(106,'Jamaica','JM','JAM','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(107,'Japan','JP','JPN','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(108,'Jordan','JO','JOR','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(109,'Kazakhstan','KZ','KAZ','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(110,'Kenya','KE','KEN','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(111,'Kiribati','KI','KIR','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(112,'North Korea','KP','PRK','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(113,'Korea, Republic of','KR','KOR','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(114,'Kuwait','KW','KWT','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(115,'Kyrgyzstan','KG','KGZ','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(116,'Lao People\'s Democratic Republic','LA','LAO','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(117,'Latvia','LV','LVA','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(118,'Lebanon','LB','LBN','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(119,'Lesotho','LS','LSO','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(120,'Liberia','LR','LBR','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(121,'Libyan Arab Jamahiriya','LY','LBY','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(122,'Liechtenstein','LI','LIE','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(123,'Lithuania','LT','LTU','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(124,'Luxembourg','LU','LUX','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(125,'Macau','MO','MAC','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(126,'FYROM','MK','MKD','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(127,'Madagascar','MG','MDG','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(128,'Malawi','MW','MWI','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(129,'Malaysia','MY','MYS','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(130,'Maldives','MV','MDV','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(131,'Mali','ML','MLI','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(132,'Malta','MT','MLT','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(133,'Marshall Islands','MH','MHL','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(134,'Martinique','MQ','MTQ','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(135,'Mauritania','MR','MRT','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(136,'Mauritius','MU','MUS','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(137,'Mayotte','YT','MYT','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(138,'Mexico','MX','MEX','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(139,'Micronesia, Federated States of','FM','FSM','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(140,'Moldova, Republic of','MD','MDA','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(141,'Monaco','MC','MCO','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(142,'Mongolia','MN','MNG','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(143,'Montserrat','MS','MSR','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(144,'Morocco','MA','MAR','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(145,'Mozambique','MZ','MOZ','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(146,'Myanmar','MM','MMR','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(147,'Namibia','NA','NAM','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(148,'Nauru','NR','NRU','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(149,'Nepal','NP','NPL','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(150,'Netherlands','NL','NLD','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(151,'Netherlands Antilles','AN','ANT','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(152,'New Caledonia','NC','NCL','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(153,'New Zealand','NZ','NZL','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(154,'Nicaragua','NI','NIC','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(155,'Niger','NE','NER','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(156,'Nigeria','NG','NGA','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(157,'Niue','NU','NIU','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(158,'Norfolk Island','NF','NFK','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(159,'Northern Mariana Islands','MP','MNP','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(160,'Norway','NO','NOR','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(161,'Oman','OM','OMN','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(162,'Pakistan','PK','PAK','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(163,'Palau','PW','PLW','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(164,'Panama','PA','PAN','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(165,'Papua New Guinea','PG','PNG','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(166,'Paraguay','PY','PRY','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(167,'Peru','PE','PER','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(168,'Philippines','PH','PHL','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(169,'Pitcairn','PN','PCN','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(170,'Poland','PL','POL','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(171,'Portugal','PT','PRT','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(172,'Puerto Rico','PR','PRI','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(173,'Qatar','QA','QAT','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(174,'Reunion','RE','REU','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(175,'Romania','RO','ROM','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(176,'Russian Federation','RU','RUS','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(177,'Rwanda','RW','RWA','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(178,'Saint Kitts and Nevis','KN','KNA','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(179,'Saint Lucia','LC','LCA','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(180,'Saint Vincent and the Grenadines','VC','VCT','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(181,'Samoa','WS','WSM','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(182,'San Marino','SM','SMR','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(183,'Sao Tome and Principe','ST','STP','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(184,'Saudi Arabia','SA','SAU','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(185,'Senegal','SN','SEN','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(186,'Seychelles','SC','SYC','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(187,'Sierra Leone','SL','SLE','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(188,'Singapore','SG','SGP','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(189,'Slovak Republic','SK','SVK','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(190,'Slovenia','SI','SVN','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(191,'Solomon Islands','SB','SLB','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(192,'Somalia','SO','SOM','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(193,'South Africa','ZA','ZAF','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(194,'South Georgia &amp; South Sandwich Islands','GS','SGS','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(195,'Spain','ES','ESP','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(196,'Sri Lanka','LK','LKA','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(197,'St. Helena','SH','SHN','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(198,'St. Pierre and Miquelon','PM','SPM','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(199,'Sudan','SD','SDN','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(200,'Suriname','SR','SUR','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(201,'Svalbard and Jan Mayen Islands','SJ','SJM','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(202,'Swaziland','SZ','SWZ','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(203,'Sweden','SE','SWE','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(204,'Switzerland','CH','CHE','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(205,'Syrian Arab Republic','SY','SYR','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(206,'Taiwan','TW','TWN','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(207,'Tajikistan','TJ','TJK','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(208,'Tanzania, United Republic of','TZ','TZA','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(209,'Thailand','TH','THA','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(210,'Togo','TG','TGO','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(211,'Tokelau','TK','TKL','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(212,'Tonga','TO','TON','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(213,'Trinidad and Tobago','TT','TTO','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(214,'Tunisia','TN','TUN','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(215,'Turkey','TR','TUR','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(216,'Turkmenistan','TM','TKM','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(217,'Turks and Caicos Islands','TC','TCA','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(218,'Tuvalu','TV','TUV','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(219,'Uganda','UG','UGA','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(220,'Ukraine','UA','UKR','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(221,'United Arab Emirates','AE','ARE','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(222,'United Kingdom','GB','GBR','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(223,'United States','US','USA','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(224,'United States Minor Outlying Islands','UM','UMI','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(225,'Uruguay','UY','URY','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(226,'Uzbekistan','UZ','UZB','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(227,'Vanuatu','VU','VUT','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(228,'Vatican City State (Holy See)','VA','VAT','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(229,'Venezuela','VE','VEN','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(230,'Viet Nam','VN','VNM','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(231,'Virgin Islands (British)','VG','VGB','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(232,'Virgin Islands (U.S.)','VI','VIR','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(233,'Wallis and Futuna Islands','WF','WLF','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(234,'Western Sahara','EH','ESH','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(235,'Yemen','YE','YEM','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(236,'Yugoslavia','YU','YUG','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(237,'Democratic Republic of Congo','CD','COD','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(238,'Zambia','ZM','ZMB','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(239,'Zimbabwe','ZW','ZWE','{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}',1,999,'2024-12-31 17:34:40','2024-12-31 17:34:40');
/*!40000 ALTER TABLE `ti_countries` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ti_currencies`
--

DROP TABLE IF EXISTS `ti_currencies`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_currencies` (
  `currency_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `country_id` int NOT NULL,
  `currency_name` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `currency_code` varchar(3) COLLATE utf8mb4_unicode_ci NOT NULL,
  `currency_symbol` varchar(3) COLLATE utf8mb4_unicode_ci NOT NULL,
  `currency_rate` decimal(15,8) NOT NULL,
  `symbol_position` tinyint(1) DEFAULT NULL,
  `thousand_sign` char(1) COLLATE utf8mb4_unicode_ci NOT NULL,
  `decimal_sign` char(1) COLLATE utf8mb4_unicode_ci NOT NULL,
  `decimal_position` char(1) COLLATE utf8mb4_unicode_ci NOT NULL,
  `iso_alpha2` varchar(2) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `iso_alpha3` varchar(3) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `iso_numeric` int DEFAULT NULL,
  `currency_status` int DEFAULT NULL,
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
INSERT INTO `ti_currencies` VALUES (1,222,'Pound Sterling','GBP','£',0.00000000,0,',','.','2','GB','GBR',826,1,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(2,223,'US Dollar','USD','$',0.00000000,0,',','.','2','US','USA',840,1,'2024-12-31 19:39:36','2024-12-31 17:34:40'),(3,44,'Yuan Renminbi','CNY','¥',0.00000000,0,',','.','2','CN','CHN',156,0,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(4,13,'Australian Dollar','AUD','$',0.00000000,0,',','.','2','AU','AUS',36,1,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(5,156,'Naira','NGN','₦',0.00000000,0,',','.','2','NG','NGA',566,1,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(6,81,'EURO','EUR','€',0.00000000,0,',','.','2',NULL,NULL,NULL,1,'2025-01-01 11:47:27','2025-01-01 11:47:12');
/*!40000 ALTER TABLE `ti_currencies` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ti_customer_groups`
--

DROP TABLE IF EXISTS `ti_customer_groups`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_customer_groups` (
  `customer_group_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `group_name` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
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
INSERT INTO `ti_customer_groups` VALUES (1,'Default group',NULL,0,'2024-12-31 17:34:40','2024-12-31 17:34:40');
/*!40000 ALTER TABLE `ti_customer_groups` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ti_customers`
--

DROP TABLE IF EXISTS `ti_customers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_customers` (
  `customer_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `first_name` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `last_name` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(96) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `telephone` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `address_id` int DEFAULT NULL,
  `newsletter` tinyint(1) DEFAULT NULL,
  `customer_group_id` int NOT NULL,
  `ip_address` varchar(40) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `status` tinyint(1) NOT NULL,
  `reset_code` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `reset_time` datetime DEFAULT NULL,
  `activation_code` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `remember_token` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_activated` tinyint(1) DEFAULT NULL,
  `date_activated` datetime DEFAULT NULL,
  `last_login` datetime DEFAULT NULL,
  `last_seen` datetime DEFAULT NULL,
  `updated_at` timestamp NOT NULL,
  `last_location_area` text COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`customer_id`),
  UNIQUE KEY `ti_customers_email_unique` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ti_customers`
--

LOCK TABLES `ti_customers` WRITE;
/*!40000 ALTER TABLE `ti_customers` DISABLE KEYS */;
INSERT INTO `ti_customers` VALUES (1,'oussama','douba','douba.oussama69@gmail.com','$2y$10$tM93JeKEdXy7VBcuX7c5z.Bqlg3QYxnOGQ1HhXpSNCEV0b7tYsU9y','+213671409293',NULL,1,1,NULL,'2025-01-04 20:52:53',1,NULL,NULL,NULL,'Oj3ZLVz0WQJatbwhK6oxXDP5zTOgPcg4XCnzyv9Pgp',1,'2025-01-04 20:52:53',NULL,'2025-01-06 10:29:13','2025-01-06 10:29:13','');
/*!40000 ALTER TABLE `ti_customers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ti_extension_settings`
--

DROP TABLE IF EXISTS `ti_extension_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_extension_settings` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `item` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `data` json DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ti_extension_settings_item_unique` (`item`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ti_extension_settings`
--

LOCK TABLES `ti_extension_settings` WRITE;
/*!40000 ALTER TABLE `ti_extension_settings` DISABLE KEYS */;
INSERT INTO `ti_extension_settings` VALUES (1,'igniter_review_settings','{\"ratings\": {\"ratings\": [\"Bad\", \"Worse\", \"Good\", \"Average\", \"Excellent\"]}, \"allow_reviews\": \"1\", \"approve_reviews\": \"1\"}'),(2,'igniter_cart_settings','{\"conditions\": {\"tax\": {\"name\": \"tax\", \"label\": \"lang:igniter.cart::default.text_vat\", \"status\": \"1\", \"priority\": 3}, \"tip\": {\"name\": \"tip\", \"label\": \"lang:igniter.cart::default.text_tip\", \"status\": \"1\", \"priority\": 4}, \"coupon\": {\"name\": \"coupon\", \"label\": \"lang:igniter.coupons::default.text_coupon\", \"status\": \"1\", \"priority\": 0}, \"delivery\": {\"name\": \"delivery\", \"label\": \"lang:igniter.local::default.text_delivery\", \"status\": \"1\", \"priority\": 1}, \"paymentFee\": {\"name\": \"paymentFee\", \"label\": \"lang:igniter.cart::default.text_payment_fee\", \"status\": \"1\", \"priority\": 2}}, \"tip_amounts\": [], \"abandoned_cart\": \"0\", \"enable_tipping\": \"0\", \"tip_value_type\": \"F\", \"destroy_on_logout\": \"0\"}');
/*!40000 ALTER TABLE `ti_extension_settings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ti_extensions`
--

DROP TABLE IF EXISTS `ti_extensions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_extensions` (
  `extension_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `version` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '1.0.0',
  PRIMARY KEY (`extension_id`),
  UNIQUE KEY `ti_extensions_name_unique` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ti_extensions`
--

LOCK TABLES `ti_extensions` WRITE;
/*!40000 ALTER TABLE `ti_extensions` DISABLE KEYS */;
INSERT INTO `ti_extensions` VALUES (1,'igniter.cart','2.19.6'),(2,'igniter.frontend','v1.10.5'),(3,'igniter.pages','v1.10.3'),(4,'igniter.local','v2.10.3'),(5,'igniter.payregister','v2.7.3'),(6,'igniter.reservation','v2.10.3'),(7,'igniter.user','1.13.3'),(8,'igniter.automation','v1.8.3'),(9,'igniter.api','0.1.0'),(10,'igniter.broadcast','0.1.0'),(11,'igniter.coupons','0.1.0'),(12,'igniter.socialite','0.1.0'),(13,'igniter.debugbar','0.1.0');
/*!40000 ALTER TABLE `ti_extensions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ti_failed_jobs`
--

DROP TABLE IF EXISTS `ti_failed_jobs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_failed_jobs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `connection` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `queue` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `payload` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `exception` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `failed_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
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
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_igniter_automation_logs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `automation_rule_id` bigint unsigned DEFAULT NULL,
  `rule_action_id` bigint unsigned DEFAULT NULL,
  `is_success` tinyint(1) NOT NULL,
  `message` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `params` text COLLATE utf8mb4_unicode_ci,
  `exception` text COLLATE utf8mb4_unicode_ci,
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
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_igniter_automation_rule_actions` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `automation_rule_id` bigint unsigned DEFAULT NULL,
  `class_name` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `options` text COLLATE utf8mb4_unicode_ci NOT NULL,
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
INSERT INTO `ti_igniter_automation_rule_actions` VALUES (1,1,'Igniter\\Automation\\AutomationRules\\Actions\\SendMailTemplate','{\"template\":\"igniter.local::mail.review_chase\",\"send_to\":\"customer\"}','2024-12-31 19:39:57','2024-12-31 19:39:57');
/*!40000 ALTER TABLE `ti_igniter_automation_rule_actions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ti_igniter_automation_rule_conditions`
--

DROP TABLE IF EXISTS `ti_igniter_automation_rule_conditions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_igniter_automation_rule_conditions` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `automation_rule_id` bigint unsigned DEFAULT NULL,
  `class_name` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `options` text COLLATE utf8mb4_unicode_ci NOT NULL,
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
INSERT INTO `ti_igniter_automation_rule_conditions` VALUES (1,1,'Igniter\\Local\\AutomationRules\\Conditions\\ReviewCount','[{\"attribute\":\"review_count\",\"value\":\"0\",\"operator\":\"is\"}]','2024-12-31 19:39:57','2024-12-31 19:39:57'),(2,1,'Igniter\\Cart\\AutomationRules\\Conditions\\OrderAttribute','[{\"attribute\":\"hours_since\",\"value\":\"24\",\"operator\":\"is\"}]','2024-12-31 19:39:57','2024-12-31 19:39:57');
/*!40000 ALTER TABLE `ti_igniter_automation_rule_conditions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ti_igniter_automation_rules`
--

DROP TABLE IF EXISTS `ti_igniter_automation_rules`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_igniter_automation_rules` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `event_class` text COLLATE utf8mb4_unicode_ci,
  `config_data` text COLLATE utf8mb4_unicode_ci,
  `is_custom` tinyint(1) NOT NULL DEFAULT '0',
  `status` tinyint(1) NOT NULL DEFAULT '0',
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
INSERT INTO `ti_igniter_automation_rules` VALUES (1,'Send a message to leave a review after 24 hours','chase_review_after_one_day','','Igniter\\Automation\\AutomationRules\\Events\\OrderSchedule',NULL,0,0,'2024-12-31 19:39:57','2024-12-31 19:39:57');
/*!40000 ALTER TABLE `ti_igniter_automation_rules` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ti_igniter_cart_cart`
--

DROP TABLE IF EXISTS `ti_igniter_cart_cart`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_igniter_cart_cart` (
  `identifier` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `instance` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `data` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
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
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_igniter_coupon_categories` (
  `coupon_id` int unsigned NOT NULL,
  `category_id` int unsigned NOT NULL,
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
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_igniter_coupon_customer_groups` (
  `coupon_id` bigint unsigned NOT NULL,
  `customer_group_id` bigint unsigned NOT NULL
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
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_igniter_coupon_customers` (
  `coupon_id` bigint unsigned NOT NULL,
  `customer_id` bigint unsigned NOT NULL
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
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_igniter_coupon_menus` (
  `coupon_id` int unsigned NOT NULL,
  `menu_id` int unsigned NOT NULL,
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
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_igniter_coupons` (
  `coupon_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `type` char(1) COLLATE utf8mb4_unicode_ci NOT NULL,
  `discount` decimal(15,4) DEFAULT NULL,
  `min_total` decimal(15,4) DEFAULT NULL,
  `redemptions` int NOT NULL DEFAULT '0',
  `customer_redemptions` int NOT NULL DEFAULT '0',
  `description` text COLLATE utf8mb4_unicode_ci,
  `status` tinyint(1) DEFAULT NULL,
  `created_at` date NOT NULL,
  `validity` char(15) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `fixed_date` date DEFAULT NULL,
  `fixed_from_time` time DEFAULT NULL,
  `fixed_to_time` time DEFAULT NULL,
  `period_start_date` date DEFAULT NULL,
  `period_end_date` date DEFAULT NULL,
  `recurring_every` varchar(35) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `recurring_from_time` time DEFAULT NULL,
  `recurring_to_time` time DEFAULT NULL,
  `order_restriction` text COLLATE utf8mb4_unicode_ci,
  `apply_coupon_on` enum('whole_cart','menu_items','delivery_fee') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'whole_cart',
  `auto_apply` tinyint(1) NOT NULL DEFAULT '0',
  `updated_at` timestamp NOT NULL,
  PRIMARY KEY (`coupon_id`),
  UNIQUE KEY `code` (`code`),
  UNIQUE KEY `ti_igniter_coupons_code_unique` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ti_igniter_coupons`
--

LOCK TABLES `ti_igniter_coupons` WRITE;
/*!40000 ALTER TABLE `ti_igniter_coupons` DISABLE KEYS */;
INSERT INTO `ti_igniter_coupons` VALUES (1,'Half Sundays','2222','F',100.0000,500.0000,0,0,NULL,1,'2024-12-31','forever',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'whole_cart',0,'0000-00-00 00:00:00'),(2,'Half Tuesdays','3333','P',30.0000,1000.0000,0,0,NULL,1,'2024-12-31','forever',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'whole_cart',0,'0000-00-00 00:00:00'),(3,'Full Mondays','MTo6TuTg','P',50.0000,0.0000,0,1,NULL,1,'2024-12-31','forever',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'whole_cart',0,'0000-00-00 00:00:00'),(4,'Full Tuesdays','4444','F',500.0000,5000.0000,0,0,NULL,1,'2024-12-31','forever',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'whole_cart',0,'0000-00-00 00:00:00');
/*!40000 ALTER TABLE `ti_igniter_coupons` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ti_igniter_coupons_history`
--

DROP TABLE IF EXISTS `ti_igniter_coupons_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_igniter_coupons_history` (
  `coupon_history_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `coupon_id` bigint unsigned NOT NULL,
  `order_id` bigint unsigned DEFAULT NULL,
  `customer_id` bigint unsigned DEFAULT NULL,
  `code` varchar(15) COLLATE utf8mb4_unicode_ci NOT NULL,
  `min_total` decimal(15,4) DEFAULT NULL,
  `amount` decimal(15,4) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `status` tinyint(1) NOT NULL,
  `updated_at` timestamp NOT NULL,
  PRIMARY KEY (`coupon_history_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
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
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_igniter_frontend_banners` (
  `banner_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `type` char(8) COLLATE utf8mb4_unicode_ci NOT NULL,
  `click_url` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `language_id` int NOT NULL,
  `alt_text` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `image_code` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `custom_code` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
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
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_igniter_frontend_sliders` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `metadata` text COLLATE utf8mb4_unicode_ci,
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
INSERT INTO `ti_igniter_frontend_sliders` VALUES (1,'Homepage slider','home-slider',NULL,'2024-12-31 19:17:37','2024-12-31 19:17:37');
/*!40000 ALTER TABLE `ti_igniter_frontend_sliders` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ti_igniter_frontend_subscribers`
--

DROP TABLE IF EXISTS `ti_igniter_frontend_subscribers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_igniter_frontend_subscribers` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `statistics` int NOT NULL DEFAULT '0',
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
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_igniter_pages_menu_items` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `menu_id` int unsigned NOT NULL,
  `parent_id` int unsigned DEFAULT NULL,
  `title` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `type` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `url` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `reference` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `config` text COLLATE utf8mb4_unicode_ci,
  `nest_left` int DEFAULT NULL,
  `nest_right` int DEFAULT NULL,
  `priority` int NOT NULL DEFAULT '0',
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
INSERT INTO `ti_igniter_pages_menu_items` VALUES (1,1,NULL,'TastyIgniter','',NULL,'header',NULL,NULL,'[]',1,8,1,'2024-12-31 19:17:38','2024-12-31 19:17:38'),(2,1,1,'main::lang.menu_menu','',NULL,'theme-page',NULL,'local/menus','[]',2,3,2,'2024-12-31 19:17:38','2024-12-31 19:17:38'),(3,1,1,'main::lang.menu_reservation','',NULL,'theme-page',NULL,'reservation/reservation','[]',4,5,3,'2024-12-31 19:17:38','2024-12-31 19:17:38'),(4,1,1,'main::lang.menu_locations','',NULL,'theme-page',NULL,'locations','[]',6,7,4,'2024-12-31 19:17:38','2024-12-31 19:17:38'),(5,1,NULL,'main::lang.text_information','',NULL,'header',NULL,NULL,'[]',9,18,5,'2024-12-31 19:17:38','2024-12-31 19:17:38'),(6,1,5,'main::lang.menu_contact','',NULL,'theme-page',NULL,'contact','[]',10,11,6,'2024-12-31 19:17:38','2024-12-31 19:17:38'),(7,1,5,'main::lang.menu_admin','',NULL,'url','http://197.140.11.160:8004/admin',NULL,'[]',12,13,7,'2024-12-31 19:17:38','2024-12-31 19:17:38'),(8,1,5,'About Us','',NULL,'static-page',NULL,'1','[]',14,15,8,'2024-12-31 19:17:38','2024-12-31 19:17:38'),(9,1,5,'Privacy Policy','',NULL,'static-page',NULL,'2','[]',16,17,9,'2024-12-31 19:17:38','2024-12-31 19:17:38'),(10,2,NULL,'main::lang.menu_menu','view-menu',NULL,'theme-page',NULL,'local/menus','[]',19,20,10,'2024-12-31 19:17:38','2024-12-31 19:17:38'),(11,2,NULL,'main::lang.menu_reservation','reservation',NULL,'theme-page',NULL,'reservation/reservation','[]',21,22,11,'2024-12-31 19:17:38','2024-12-31 19:17:38'),(12,2,NULL,'main::lang.menu_login','login',NULL,'theme-page',NULL,'account/login','[]',23,24,12,'2024-12-31 19:17:38','2024-12-31 19:17:38'),(13,2,NULL,'main::lang.menu_register','register',NULL,'theme-page',NULL,'account/register','[]',25,26,13,'2024-12-31 19:17:38','2024-12-31 19:17:38'),(14,2,NULL,'main::lang.menu_my_account','account',NULL,'theme-page',NULL,'account/account','[]',27,38,14,'2024-12-31 19:17:38','2024-12-31 19:17:38'),(15,2,14,'main::lang.menu_recent_order','recent-orders',NULL,'theme-page',NULL,'account/orders','[]',28,29,15,'2024-12-31 19:17:38','2024-12-31 19:17:38'),(16,2,14,'main::lang.menu_my_account','',NULL,'theme-page',NULL,'account/account','[]',30,31,16,'2024-12-31 19:17:38','2024-12-31 19:17:38'),(17,2,14,'main::lang.menu_address','',NULL,'theme-page',NULL,'account/address','[]',32,33,17,'2024-12-31 19:17:38','2024-12-31 19:17:38'),(18,2,14,'main::lang.menu_recent_reservation','',NULL,'theme-page',NULL,'account/reservations','[]',34,35,18,'2024-12-31 19:17:38','2024-12-31 19:17:38'),(19,2,14,'main::lang.menu_logout','',NULL,'url','javascript:;',NULL,'{\"extraAttributes\":\"data-request=\\\"session::onLogout\\\"\"}',36,37,19,'2024-12-31 19:17:38','2024-12-31 19:17:38'),(20,3,NULL,'Pages','',NULL,'all-static-pages',NULL,'','[]',39,40,20,'2024-12-31 19:17:38','2024-12-31 19:17:38'),(21,4,NULL,'TastyIgniter','',NULL,'header',NULL,NULL,'[]',41,48,21,'2024-12-31 19:17:38','2024-12-31 19:17:38'),(22,4,21,'main::lang.menu_menu','',NULL,'theme-page',NULL,'local/menus','[]',42,43,22,'2024-12-31 19:17:38','2024-12-31 19:17:38'),(23,4,21,'main::lang.menu_reservation','',NULL,'theme-page',NULL,'reservation/reservation','[]',44,45,23,'2024-12-31 19:17:38','2024-12-31 19:17:38'),(24,4,21,'main::lang.menu_locations','',NULL,'theme-page',NULL,'locations','[]',46,47,24,'2024-12-31 19:17:38','2024-12-31 19:17:38'),(25,4,NULL,'main::lang.text_information','',NULL,'header',NULL,NULL,'[]',49,58,25,'2024-12-31 19:17:38','2024-12-31 19:17:38'),(26,4,25,'main::lang.menu_contact','',NULL,'theme-page',NULL,'contact','[]',50,51,26,'2024-12-31 19:17:38','2024-12-31 19:17:38'),(27,4,25,'main::lang.menu_admin','',NULL,'url','http://197.140.11.160:8004/admin',NULL,'[]',52,53,27,'2024-12-31 19:17:38','2024-12-31 19:17:38'),(28,4,25,'About Us','',NULL,'static-page',NULL,'1','[]',54,55,28,'2024-12-31 19:17:38','2024-12-31 19:17:38'),(29,4,25,'Privacy Policy','',NULL,'static-page',NULL,'2','[]',56,57,29,'2024-12-31 19:17:38','2024-12-31 19:17:38'),(30,5,NULL,'Pages','',NULL,'all-static-pages',NULL,'','[]',59,60,30,'2024-12-31 19:17:38','2024-12-31 19:17:38'),(31,6,NULL,'main::lang.menu_menu','view-menu',NULL,'theme-page',NULL,'local/menus','[]',61,62,31,'2024-12-31 19:17:38','2024-12-31 19:17:38'),(32,6,NULL,'main::lang.menu_reservation','reservation',NULL,'theme-page',NULL,'reservation/reservation','[]',63,64,32,'2024-12-31 19:17:38','2024-12-31 19:17:38'),(33,6,NULL,'History','history',NULL,'theme-page',NULL,'our-history','[]',65,66,33,'2024-12-31 19:17:38','2024-12-31 19:17:38'),(34,7,NULL,'main::lang.menu_my_account','account',NULL,'theme-page',NULL,'account/account','[]',67,78,34,'2024-12-31 19:17:38','2024-12-31 19:17:38'),(35,7,34,'main::lang.menu_recent_order','recent-orders',NULL,'theme-page',NULL,'account/orders','[]',68,69,35,'2024-12-31 19:17:38','2024-12-31 19:17:38'),(36,7,34,'main::lang.menu_my_account','',NULL,'theme-page',NULL,'account/account','[]',70,71,36,'2024-12-31 19:17:38','2024-12-31 19:17:38'),(37,7,34,'main::lang.menu_address','',NULL,'theme-page',NULL,'account/address','[]',72,73,37,'2024-12-31 19:17:38','2024-12-31 19:17:38'),(38,7,34,'main::lang.menu_recent_reservation','',NULL,'theme-page',NULL,'account/reservations','[]',74,75,38,'2024-12-31 19:17:38','2024-12-31 19:17:38'),(39,7,34,'main::lang.menu_logout','',NULL,'url','javascript:;',NULL,'{\"extraAttributes\":\"data-request=\\\"session::onLogout\\\"\"}',76,77,39,'2024-12-31 19:17:38','2024-12-31 19:17:38');
/*!40000 ALTER TABLE `ti_igniter_pages_menu_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ti_igniter_pages_menus`
--

DROP TABLE IF EXISTS `ti_igniter_pages_menus`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_igniter_pages_menus` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `theme_code` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
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
INSERT INTO `ti_igniter_pages_menus` VALUES (1,'tastyigniter-orange','Footer menu','footer-menu','2024-12-31 19:17:38','2024-12-31 19:17:38'),(2,'tastyigniter-orange','Main menu','main-menu','2024-12-31 19:17:38','2024-12-31 19:17:38'),(3,'tastyigniter-orange','Pages menu','pages-menu','2024-12-31 19:17:38','2024-12-31 19:17:38'),(4,'tastyigniter-typical','Footer menu','footer-menu','2024-12-31 19:17:38','2024-12-31 19:17:38'),(5,'tastyigniter-typical','Pages menu','pages-menu','2024-12-31 19:17:38','2024-12-31 19:17:38'),(6,'tastyigniter-typical','Main menu','typical-main-menu','2024-12-31 19:17:38','2024-12-31 19:17:38'),(7,'tastyigniter-typical','Right menu','typical-right-menu','2024-12-31 19:17:38','2024-12-31 19:17:38');
/*!40000 ALTER TABLE `ti_igniter_pages_menus` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ti_igniter_reviews`
--

DROP TABLE IF EXISTS `ti_igniter_reviews`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_igniter_reviews` (
  `review_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `customer_id` bigint unsigned DEFAULT NULL,
  `sale_id` bigint unsigned DEFAULT NULL,
  `sale_type` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `author` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `location_id` bigint unsigned DEFAULT NULL,
  `quality` int NOT NULL,
  `delivery` int NOT NULL,
  `service` int NOT NULL,
  `review_text` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
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
INSERT INTO `ti_igniter_reviews` VALUES (1,1,3,'orders','oussama douba',1,5,5,5,'Good Service','2025-01-05 19:20:42',0,'2025-01-05 19:20:42'),(2,1,1,'orders',NULL,1,5,4,4,'Very Good','2025-01-05 19:21:22',1,'2025-01-05 19:21:22');
/*!40000 ALTER TABLE `ti_igniter_reviews` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ti_igniter_socialite_providers`
--

DROP TABLE IF EXISTS `ti_igniter_socialite_providers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_igniter_socialite_providers` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int unsigned DEFAULT NULL,
  `provider` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `provider_id` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `token` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_type` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
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
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_job_batches` (
  `id` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `total_jobs` int NOT NULL,
  `pending_jobs` int NOT NULL,
  `failed_jobs` int NOT NULL,
  `failed_job_ids` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `options` mediumtext COLLATE utf8mb4_unicode_ci,
  `cancelled_at` int DEFAULT NULL,
  `created_at` int NOT NULL,
  `finished_at` int DEFAULT NULL,
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
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_jobs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `queue` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `payload` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `attempts` tinyint unsigned NOT NULL,
  `reserved_at` int unsigned DEFAULT NULL,
  `available_at` int unsigned NOT NULL,
  `created_at` int unsigned NOT NULL,
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
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_language_translations` (
  `translation_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `locale` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `namespace` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '*',
  `group` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `item` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `text` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `unstable` tinyint(1) NOT NULL DEFAULT '0',
  `locked` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`translation_id`),
  UNIQUE KEY `ti_language_translations_locale_namespace_group_item_unique` (`locale`,`namespace`,`group`,`item`),
  KEY `ti_language_translations_group_index` (`group`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ti_language_translations`
--

LOCK TABLES `ti_language_translations` WRITE;
/*!40000 ALTER TABLE `ti_language_translations` DISABLE KEYS */;
/*!40000 ALTER TABLE `ti_language_translations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ti_languages`
--

DROP TABLE IF EXISTS `ti_languages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_languages` (
  `language_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `code` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `image` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `idiom` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` tinyint(1) NOT NULL,
  `can_delete` tinyint(1) NOT NULL,
  `original_id` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `version` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`language_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ti_languages`
--

LOCK TABLES `ti_languages` WRITE;
/*!40000 ALTER TABLE `ti_languages` DISABLE KEYS */;
INSERT INTO `ti_languages` VALUES (1,'en','English',NULL,'english',1,0,NULL,'2024-12-31 17:34:40','2024-12-31 17:34:40',NULL);
/*!40000 ALTER TABLE `ti_languages` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ti_location_areas`
--

DROP TABLE IF EXISTS `ti_location_areas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_location_areas` (
  `area_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `location_id` int NOT NULL,
  `name` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `type` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `boundaries` json NOT NULL,
  `conditions` json NOT NULL,
  `color` varchar(40) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_default` tinyint(1) NOT NULL DEFAULT '0',
  `priority` int NOT NULL DEFAULT '0',
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
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_location_options` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `location_id` bigint unsigned NOT NULL,
  `item` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `value` json DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ti_location_options_location_id_item_unique` (`location_id`,`item`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ti_location_options`
--

LOCK TABLES `ti_location_options` WRITE;
/*!40000 ALTER TABLE `ti_location_options` DISABLE KEYS */;
/*!40000 ALTER TABLE `ti_location_options` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ti_locationables`
--

DROP TABLE IF EXISTS `ti_locationables`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_locationables` (
  `location_id` int NOT NULL,
  `locationable_id` int NOT NULL,
  `locationable_type` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `options` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ti_locationables`
--

LOCK TABLES `ti_locationables` WRITE;
/*!40000 ALTER TABLE `ti_locationables` DISABLE KEYS */;
INSERT INTO `ti_locationables` VALUES (1,1,'tables',NULL),(1,2,'tables',NULL),(1,3,'tables',NULL),(1,4,'tables',NULL),(1,5,'tables',NULL),(1,6,'tables',NULL),(1,7,'tables',NULL),(1,8,'tables',NULL),(1,9,'tables',NULL),(1,10,'tables',NULL),(1,11,'tables',NULL),(1,12,'tables',NULL),(1,13,'tables',NULL),(1,14,'tables',NULL),(1,1,'staffs',NULL),(1,2,'staffs',NULL),(1,3,'mealtimes',NULL),(1,2,'mealtimes',NULL),(1,1,'mealtimes',NULL),(1,8,'categories',NULL),(1,7,'categories',NULL),(1,6,'categories',NULL),(1,15,'tables',NULL),(1,16,'tables',NULL),(1,17,'tables',NULL),(1,18,'tables',NULL),(1,19,'tables',NULL);
/*!40000 ALTER TABLE `ti_locationables` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ti_locations`
--

DROP TABLE IF EXISTS `ti_locations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_locations` (
  `location_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `location_name` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `location_email` varchar(96) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `location_address_1` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `location_address_2` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `location_city` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `location_state` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `location_postcode` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `location_country_id` int DEFAULT NULL,
  `location_telephone` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `location_lat` double DEFAULT NULL,
  `location_lng` double DEFAULT NULL,
  `location_radius` int DEFAULT NULL,
  `location_status` tinyint(1) DEFAULT NULL,
  `permalink_slug` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`location_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ti_locations`
--

LOCK TABLES `ti_locations` WRITE;
/*!40000 ALTER TABLE `ti_locations` DISABLE KEYS */;
INSERT INTO `ti_locations` VALUES (1,'Default','admin@domain.tld',NULL,'Broad Ln',NULL,'Coventry',NULL,NULL,222,'8765456789',52.415884,-1.603648,NULL,1,'default','2024-12-31 17:34:40','2024-12-31 17:34:41');
/*!40000 ALTER TABLE `ti_locations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ti_logos`
--

DROP TABLE IF EXISTS `ti_logos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_logos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `dashboard_logo` text,
  `loader_logo` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ti_logos`
--

LOCK TABLES `ti_logos` WRITE;
/*!40000 ALTER TABLE `ti_logos` DISABLE KEYS */;
INSERT INTO `ti_logos` VALUES (1,'http://197.140.11.160:8012/storage/temp/public/cdf/9e2/755/thumb_cdf9e27557e9f5787cad9c2baacc5d73_1736035378_122x122_contain.png','http://197.140.11.160:8012/storage/temp/public/f64/41e/3f2/thumb_f6441e3f240985242107511c871a02eb_1738932969_122x122_contain.jpg','2025-02-07 20:15:50');
/*!40000 ALTER TABLE `ti_logos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ti_mail_layouts`
--

DROP TABLE IF EXISTS `ti_mail_layouts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_mail_layouts` (
  `layout_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `language_id` int NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `status` tinyint(1) NOT NULL,
  `code` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `layout` text COLLATE utf8mb4_unicode_ci,
  `plain_layout` text COLLATE utf8mb4_unicode_ci,
  `layout_css` text COLLATE utf8mb4_unicode_ci,
  `is_locked` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`layout_id`),
  UNIQUE KEY `ti_mail_layouts_code_unique` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ti_mail_layouts`
--

LOCK TABLES `ti_mail_layouts` WRITE;
/*!40000 ALTER TABLE `ti_mail_layouts` DISABLE KEYS */;
INSERT INTO `ti_mail_layouts` VALUES (1,'Default layout',0,'2024-12-31 19:32:04','2024-12-31 19:32:04',0,'default','<!DOCTYPE html PUBLIC \"-//W3C//DTD XHTML 1.0 Transitional//EN\"\n\"http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd\">\n<html xmlns=\"http://www.w3.org/1999/xhtml\">\n<head>\n    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\"/>\n    <meta http-equiv=\"Content-Type\" content=\"text/html; charset=UTF-8\"/>\n</head>\n<body>\n<style type=\"text/css\">\n    {{ $custom_css }}\n    {{ $layout_css }}\n</style>\n\n<table class=\"wrapper\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\">\n    <tr>\n        <td align=\"center\">\n            <table class=\"content\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\">\n                @partial(\'header\')\n                @php $site_logo = setting(\'mail_logo\') ?: $site_logo; @endphp\n                @isset($site_logo)\n                    <img\n                        src=\"{{ \\Main\\Models\\Image_tool_model::resize($site_logo, [\'height\' => 90]) }}\"\n                        alt=\"{{ $site_name }}\"\n                    >\n                @endisset\n                @endpartial\n                <tr>\n                    <td class=\"body\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\">\n                        <table class=\"inner-body\" align=\"center\" width=\"570\" cellpadding=\"0\" cellspacing=\"0\">\n                            <!-- Body content -->\n                            <tr>\n                                <td class=\"content-cell\">\n                                    {{ $body }}\n                                </td>\n                            </tr>\n                        </table>\n                    </td>\n                </tr>\n                @partial(\'footer\')\n                <p>&copy; {{ date(\'Y\') }} {{ $site_name }}. All rights reserved.</p>\n                @endpartial\n            </table>\n        </td>\n    </tr>\n</table>\n</body>\n</html>','{{ $body }}','',1);
/*!40000 ALTER TABLE `ti_mail_layouts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ti_mail_partials`
--

DROP TABLE IF EXISTS `ti_mail_partials`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_mail_partials` (
  `partial_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `code` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `html` text COLLATE utf8mb4_unicode_ci,
  `text` text COLLATE utf8mb4_unicode_ci,
  `is_custom` tinyint(1) NOT NULL DEFAULT '0',
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
INSERT INTO `ti_mail_partials` VALUES (1,'Header','header','<tr>\n    <td class=\"header\">\n        @if (isset($url))\n        <a href=\"{{ $url }}\">\n            {{ $slot }}\n        </a>\n        @else\n        <span>\n            {{ $slot }}\n        </span>\n        @endif\n    </td>\n</tr>','*** {{ $slot }} <{{ $url }}>',0,'2024-12-31 19:32:04','2024-12-31 19:32:04'),(2,'Footer','footer','<tr>\n    <td>\n        <table class=\"footer\" align=\"center\" width=\"570\" cellpadding=\"0\" cellspacing=\"0\">\n            <tr>\n                <td class=\"content-cell\" align=\"center\">\n                    {{ $slot }}\n                </td>\n            </tr>\n        </table>\n    </td>\n</tr>','-------------------\n{{ $slot }}',0,'2024-12-31 19:32:04','2024-12-31 19:32:04'),(3,'Button','button','<table class=\"action\" align=\"center\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\">\n    <tr>\n        <td>\n            <table width=\"100%\" border=\"0\" cellpadding=\"0\" cellspacing=\"0\">\n                <tr>\n                    <td>\n                        <table border=\"0\" cellpadding=\"0\" cellspacing=\"0\">\n                            <tr>\n                                <td>\n                                    <a href=\"{{ $url }}\" class=\"button button-{{ $type ?? \'primary\' }}\" target=\"_blank\">{{ $slot }}</a>\n                                </td>\n                            </tr>\n                        </table>\n                    </td>\n                </tr>\n            </table>\n        </td>\n    </tr>\n</table>','{{ $slot }} <{{ $url }}>',0,'2024-12-31 19:32:04','2024-12-31 19:32:04'),(4,'Panel','panel','<table class=\"panel\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\">\n    <tr>\n        <td class=\"panel-content\">\n            <table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\">\n                <tr>\n                    <td class=\"panel-item\">\n                        {{ $slot }}\n                    </td>\n                </tr>\n            </table>\n        </td>\n    </tr>\n</table>','{{ $slot }}',0,'2024-12-31 19:32:04','2024-12-31 19:32:04'),(5,'Table','table','<div class=\"table\">\n{{ $slot }}\n</div>','{{ $slot }}',0,'2024-12-31 19:32:04','2024-12-31 19:32:04'),(6,'Subcopy','subcopy','<table class=\"subcopy\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\">\n    <tr>\n        <td>\n            {{ $slot }}\n        </td>\n    </tr>\n</table>','-----\n{{ $slot }}',0,'2024-12-31 19:32:04','2024-12-31 19:32:04'),(7,'Promotion','promotion','<table class=\"promotion\" align=\"center\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\">\n    <tr>\n        <td align=\"center\">\n            {{ $slot }}\n        </td>\n    </tr>\n</table>','{{ $slot }}',0,'2024-12-31 19:32:04','2024-12-31 19:32:04');
/*!40000 ALTER TABLE `ti_mail_partials` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ti_mail_templates`
--

DROP TABLE IF EXISTS `ti_mail_templates`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_mail_templates` (
  `template_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `layout_id` int NOT NULL,
  `code` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `subject` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `body` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `label` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_custom` tinyint(1) DEFAULT NULL,
  `plain_body` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`template_id`),
  UNIQUE KEY `ti_mail_templates_data_template_id_code_unique` (`layout_id`,`code`)
) ENGINE=InnoDB AUTO_INCREMENT=19 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ti_mail_templates`
--

LOCK TABLES `ti_mail_templates` WRITE;
/*!40000 ALTER TABLE `ti_mail_templates` DISABLE KEYS */;
INSERT INTO `ti_mail_templates` VALUES (1,1,'igniter.user::mail.password_reset','','','2024-12-31 19:32:04','2024-12-31 19:32:04','lang:igniter.user::default.text_mail_password_reset',0,NULL),(2,1,'igniter.user::mail.password_reset_request','','','2024-12-31 19:32:04','2024-12-31 19:32:04','lang:igniter.user::default.text_mail_password_reset_request',0,NULL),(3,1,'igniter.user::mail.registration','','','2024-12-31 19:32:04','2024-12-31 19:32:04','lang:igniter.user::default.text_mail_registration',0,NULL),(4,1,'igniter.user::mail.registration_alert','','','2024-12-31 19:32:04','2024-12-31 19:32:04','lang:igniter.user::default.text_mail_registration_alert',0,NULL),(5,1,'igniter.user::mail.activation','','','2024-12-31 19:32:04','2024-12-31 19:32:04','lang:igniter.user::default.text_mail_activation',0,NULL),(6,1,'igniter.reservation::mail.reservation','','','2024-12-31 19:32:04','2024-12-31 19:32:04','lang:igniter.reservation::default.text_mail_reservation',0,NULL),(7,1,'igniter.reservation::mail.reservation_alert','','','2024-12-31 19:32:04','2024-12-31 19:32:04','lang:igniter.reservation::default.text_mail_reservation_alert',0,NULL),(8,1,'igniter.local::mail.review_chase','','','2024-12-31 19:32:04','2024-12-31 19:32:04','lang:igniter.local::default.reviews.text_chase_email',0,NULL),(9,1,'igniter.frontend::mail.contact','','','2024-12-31 19:32:04','2024-12-31 19:32:04','Contact form email to admin',0,NULL),(10,1,'igniter.cart::mail.order','','','2024-12-31 19:32:04','2024-12-31 19:32:04','lang:igniter.cart::default.text_mail_order',0,NULL),(11,1,'igniter.cart::mail.order_alert','','','2024-12-31 19:32:04','2024-12-31 19:32:04','lang:igniter.cart::default.text_mail_order_alert',0,NULL),(12,1,'admin::_mail.order_update','','','2024-12-31 19:32:04','2024-12-31 19:32:04','lang:system::lang.mail_templates.text_order_update',0,NULL),(13,1,'admin::_mail.reservation_update','','','2024-12-31 19:32:04','2024-12-31 19:32:04','lang:system::lang.mail_templates.text_reservation_update',0,NULL),(14,1,'admin::_mail.password_reset','','','2024-12-31 19:32:04','2024-12-31 19:32:04','lang:system::lang.mail_templates.text_password_reset_alert',0,NULL),(15,1,'admin::_mail.password_reset_request','','','2024-12-31 19:32:04','2024-12-31 19:32:04','lang:system::lang.mail_templates.text_password_reset_request_alert',0,NULL),(16,1,'admin::_mail.invite','','','2024-12-31 19:32:04','2024-12-31 19:32:04','lang:system::lang.mail_templates.text_invite',0,NULL),(17,1,'admin::_mail.invite_customer','','','2024-12-31 19:32:04','2024-12-31 19:32:04','lang:system::lang.mail_templates.text_invite_customer',0,NULL),(18,1,'admin::_mail.low_stock_alert','','','2024-12-31 19:32:04','2024-12-31 19:32:04','lang:system::lang.mail_templates.text_low_stock_alert',0,NULL);
/*!40000 ALTER TABLE `ti_mail_templates` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ti_mealtimes`
--

DROP TABLE IF EXISTS `ti_mealtimes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_mealtimes` (
  `mealtime_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `mealtime_name` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `start_time` time NOT NULL DEFAULT '00:00:00',
  `end_time` time NOT NULL DEFAULT '23:59:59',
  `mealtime_status` tinyint(1) NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`mealtime_id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ti_mealtimes`
--

LOCK TABLES `ti_mealtimes` WRITE;
/*!40000 ALTER TABLE `ti_mealtimes` DISABLE KEYS */;
INSERT INTO `ti_mealtimes` VALUES (1,'Breakfast','07:00:00','10:00:00',1,'2024-12-31 17:34:40','2025-01-05 20:42:14'),(2,'Lunch','12:00:00','14:30:00',1,'2024-12-31 17:34:40','2025-01-05 20:42:08'),(3,'Dinner','18:00:00','20:00:00',1,'2024-12-31 17:34:40','2025-01-05 20:41:45');
/*!40000 ALTER TABLE `ti_mealtimes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ti_media_attachments`
--

DROP TABLE IF EXISTS `ti_media_attachments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_media_attachments` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `disk` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_name` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `mime_type` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `size` int unsigned NOT NULL,
  `tag` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `attachment_type` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `attachment_id` bigint unsigned DEFAULT NULL,
  `is_public` tinyint(1) NOT NULL DEFAULT '1',
  `custom_properties` text COLLATE utf8mb4_unicode_ci,
  `priority` int unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `ti_media_attachments_attachment_type_attachment_id_index` (`attachment_type`,`attachment_id`),
  KEY `ti_media_attachments_tag_index` (`tag`)
) ENGINE=InnoDB AUTO_INCREMENT=18 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ti_media_attachments`
--

LOCK TABLES `ti_media_attachments` WRITE;
/*!40000 ALTER TABLE `ti_media_attachments` DISABLE KEYS */;
INSERT INTO `ti_media_attachments` VALUES (2,'media','6776d1e8566ed245787605.jpeg','images.jpeg','image/jpeg',10736,'thumb','menus',7,1,'[]',2,'2025-01-02 17:50:32','2025-01-02 17:50:32'),(3,'media','6776d2284716a539540166.jpeg','rice.jpeg','image/jpeg',10206,'thumb','menus',6,1,'[]',3,'2025-01-02 17:51:36','2025-01-02 17:51:36'),(4,'media','6776d26f0b90b630607942.jpeg','b1.jpeg','image/jpeg',8621,'thumb','menus',12,1,'[]',4,'2025-01-02 17:52:47','2025-01-02 17:52:47'),(5,'media','6776d2a0333b0363272263.jpg','YAM PORRIDGE.jpg','image/jpeg',268038,'thumb','menus',11,1,'[]',5,'2025-01-02 17:53:36','2025-01-02 17:53:36'),(6,'media','6776d2d9145fc496723456.jpg','AMALA.jpg','image/jpeg',77300,'thumb','menus',10,1,'[]',6,'2025-01-02 17:54:33','2025-01-02 17:54:33'),(7,'media','6776d3219329b582199072.jpg','Caesar-Salad-TIMG.jpg','image/jpeg',103143,'thumb','menus',9,1,'[]',7,'2025-01-02 17:55:45','2025-01-02 17:55:45'),(8,'media','6776d354c46f3037748397.jpeg','Seafood Salad.jpeg','image/jpeg',12530,'thumb','menus',8,1,'[]',8,'2025-01-02 17:56:36','2025-01-02 17:56:36'),(9,'media','6776d3b90c05f547566224.jpeg','Special Shrimp Deluxe 2.jpeg','image/jpeg',12954,'thumb','menus',5,1,'[]',9,'2025-01-02 17:58:17','2025-01-02 17:58:17'),(10,'media','6776d40a49938149654564.jpg','RICE AND DODO2.jpg','image/jpeg',64487,'thumb','menus',4,1,'[]',10,'2025-01-02 17:59:38','2025-01-02 17:59:38'),(11,'media','6776d43cc11a2569256488.jpeg','ATA RICE.jpeg','image/jpeg',9781,'thumb','menus',3,1,'[]',11,'2025-01-02 18:00:28','2025-01-02 18:00:28'),(12,'media','6776d4670f92b513414909.jpeg','SCOTCH EGG.jpeg','image/jpeg',145308,'thumb','menus',2,1,'[]',12,'2025-01-02 18:01:11','2025-01-02 18:01:11'),(13,'media','6776d4adbca7d884450237.webp','puffpuff.webp','image/webp',158112,'thumb','menus',1,1,'[]',13,'2025-01-02 18:02:21','2025-01-02 18:02:21'),(15,'media','6777f9b077ac5712883963.webp','ggty.webp','image/webp',178578,'images','sliders',1,1,'[]',15,'2025-01-03 14:52:32','2025-01-03 14:52:32'),(16,'media','6777fa479e2e2540505239.jpg','rest2.jpg','image/jpeg',85039,'images','sliders',1,1,'[]',16,'2025-01-03 14:55:03','2025-01-03 14:55:03'),(17,'media','6777fac111a64771032432.jpg','rest4.jpg','image/jpeg',195181,'images','sliders',1,1,'[]',17,'2025-01-03 14:57:05','2025-01-03 14:57:05');
/*!40000 ALTER TABLE `ti_media_attachments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ti_menu_categories`
--

DROP TABLE IF EXISTS `ti_menu_categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_menu_categories` (
  `menu_id` int unsigned NOT NULL,
  `category_id` int unsigned NOT NULL,
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
/*!40000 ALTER TABLE `ti_menu_categories` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ti_menu_item_option_values`
--

DROP TABLE IF EXISTS `ti_menu_item_option_values`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_menu_item_option_values` (
  `menu_option_value_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `menu_option_id` int NOT NULL,
  `option_value_id` int NOT NULL,
  `new_price` decimal(15,4) DEFAULT NULL,
  `priority` int NOT NULL DEFAULT '0',
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
INSERT INTO `ti_menu_item_option_values` VALUES (1,1,9,0.0000,1,NULL,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(2,1,10,0.0000,2,NULL,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(3,2,7,0.0000,1,NULL,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(4,2,8,5.0000,2,NULL,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(5,3,4,4.9500,4,NULL,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(6,3,5,4.9500,2,NULL,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(7,3,6,6.9500,3,NULL,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(8,4,7,0.0000,1,NULL,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(9,4,8,5.0000,2,NULL,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(10,5,4,4.9500,4,NULL,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(11,5,5,4.9500,2,NULL,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(12,5,6,6.9500,3,NULL,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(13,6,7,0.0000,1,NULL,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(14,6,8,5.0000,2,NULL,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(15,7,7,0.0000,1,NULL,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(16,7,8,5.0000,2,NULL,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(17,8,4,4.9500,4,NULL,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(18,8,5,4.9500,2,NULL,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(19,8,6,6.9500,3,NULL,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(20,9,9,0.0000,1,NULL,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(21,9,10,0.0000,2,NULL,'2024-12-31 17:34:40','2024-12-31 17:34:40');
/*!40000 ALTER TABLE `ti_menu_item_option_values` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ti_menu_item_options`
--

DROP TABLE IF EXISTS `ti_menu_item_options`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_menu_item_options` (
  `menu_option_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `option_id` int NOT NULL,
  `menu_id` int NOT NULL,
  `required` tinyint(1) NOT NULL DEFAULT '0',
  `priority` int NOT NULL DEFAULT '0',
  `min_selected` int NOT NULL DEFAULT '0',
  `max_selected` int NOT NULL DEFAULT '0',
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
INSERT INTO `ti_menu_item_options` VALUES (1,4,1,0,0,0,0,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(2,3,2,0,0,0,0,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(3,2,3,0,0,0,0,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(4,3,3,0,1,0,0,'2024-12-31 17:34:40','2025-01-02 18:00:29'),(5,2,4,0,0,0,0,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(6,3,4,0,1,0,0,'2024-12-31 17:34:40','2025-01-02 17:59:40'),(7,3,5,0,0,0,0,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(8,2,10,0,0,0,0,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(9,4,10,0,1,0,0,'2024-12-31 17:34:40','2025-01-02 17:54:34');
/*!40000 ALTER TABLE `ti_menu_item_options` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ti_menu_mealtimes`
--

DROP TABLE IF EXISTS `ti_menu_mealtimes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_menu_mealtimes` (
  `menu_id` int unsigned NOT NULL,
  `mealtime_id` int unsigned NOT NULL,
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
/*!40000 ALTER TABLE `ti_menu_mealtimes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ti_menu_option_values`
--

DROP TABLE IF EXISTS `ti_menu_option_values`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_menu_option_values` (
  `option_value_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `option_id` int NOT NULL,
  `value` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `price` decimal(15,4) DEFAULT NULL,
  `priority` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`option_value_id`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ti_menu_option_values`
--

LOCK TABLES `ti_menu_option_values` WRITE;
/*!40000 ALTER TABLE `ti_menu_option_values` DISABLE KEYS */;
INSERT INTO `ti_menu_option_values` VALUES (1,1,'Peperoni',1.9900,2),(2,1,'Jalapenos',3.9900,1),(3,1,'Sweetcorn',1.9900,3),(4,2,'Meat',4.9500,4),(5,2,'Fish',4.9500,2),(6,2,'Beef',6.9500,3),(7,3,'Small',0.0000,1),(8,3,'Large',5.0000,2),(9,4,'Coke',0.0000,1),(10,4,'Diet Coke',0.0000,2);
/*!40000 ALTER TABLE `ti_menu_option_values` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ti_menu_options`
--

DROP TABLE IF EXISTS `ti_menu_options`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_menu_options` (
  `option_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `option_name` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `display_type` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `priority` int NOT NULL DEFAULT '0',
  `update_related_menu_item` tinyint(1) NOT NULL DEFAULT '0',
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
INSERT INTO `ti_menu_options` VALUES (1,'Toppings','checkbox',0,0,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(2,'Sides','checkbox',0,0,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(3,'Size','radio',0,0,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(4,'Drinks','checkbox',0,0,'2024-12-31 17:34:40','2024-12-31 17:34:40');
/*!40000 ALTER TABLE `ti_menu_options` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ti_menus`
--

DROP TABLE IF EXISTS `ti_menus`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_menus` (
  `menu_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `menu_name` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `menu_description` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `menu_price` decimal(15,4) NOT NULL,
  `minimum_qty` int NOT NULL DEFAULT '0',
  `menu_status` tinyint(1) NOT NULL,
  `menu_priority` int NOT NULL DEFAULT '0',
  `order_restriction` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`menu_id`)
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ti_menus`
--

LOCK TABLES `ti_menus` WRITE;
/*!40000 ALTER TABLE `ti_menus` DISABLE KEYS */;
INSERT INTO `ti_menus` VALUES (1,'Puff-Puff','',4.9900,3,1,0,NULL,'2024-12-31 17:34:40','2025-01-05 20:45:50'),(2,'SCOTCH EGG','',2.0000,1,1,0,NULL,'2024-12-31 17:34:40','2025-01-05 20:45:57'),(3,'ATA RICE','',12.0000,1,1,0,NULL,'2024-12-31 17:34:40','2025-01-05 20:46:02'),(4,'RICE AND DODO','',11.9900,1,1,0,NULL,'2024-12-31 17:34:40','2025-01-05 20:46:08'),(5,'Special Shrimp Deluxe','',12.9900,1,1,0,NULL,'2024-12-31 17:34:40','2025-01-05 20:46:15'),(6,'Whole catfish with rice and vegetables','',13.9900,1,1,0,NULL,'2024-12-31 17:34:40','2025-01-05 20:46:22'),(7,'Simple Salad','',8.9900,1,1,0,NULL,'2024-12-31 17:34:40','2025-01-05 20:48:09'),(8,'Seafood Salad','',5.9900,1,1,0,NULL,'2024-12-31 17:34:40','2025-01-05 20:45:43'),(9,'Salad Cesar','',11.9900,1,1,0,NULL,'2024-12-31 17:34:40','2025-01-05 20:45:37'),(10,'AMALA','',11.9900,1,1,0,NULL,'2024-12-31 17:34:40','2025-01-05 20:45:32'),(11,'YAM PORRIDGE','',9.9900,1,1,0,NULL,'2024-12-31 17:34:40','2025-01-05 20:45:26'),(12,'Boiled Plantain','',9.9900,1,1,0,NULL,'2024-12-31 17:34:40','2025-01-05 20:45:17');
/*!40000 ALTER TABLE `ti_menus` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ti_menus_specials`
--

DROP TABLE IF EXISTS `ti_menus_specials`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_menus_specials` (
  `special_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `menu_id` int NOT NULL DEFAULT '0',
  `start_date` datetime DEFAULT CURRENT_TIMESTAMP,
  `end_date` datetime DEFAULT CURRENT_TIMESTAMP,
  `special_price` decimal(15,4) DEFAULT NULL,
  `special_status` tinyint(1) NOT NULL,
  `type` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `validity` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `recurring_every` text COLLATE utf8mb4_unicode_ci,
  `recurring_from` time DEFAULT NULL,
  `recurring_to` time DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`special_id`),
  UNIQUE KEY `ti_menus_specials_special_id_menu_id_unique` (`special_id`,`menu_id`)
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ti_menus_specials`
--

LOCK TABLES `ti_menus_specials` WRITE;
/*!40000 ALTER TABLE `ti_menus_specials` DISABLE KEYS */;
INSERT INTO `ti_menus_specials` VALUES (1,7,NULL,NULL,0.0000,0,'F','forever',NULL,NULL,NULL,NULL,NULL),(2,6,NULL,NULL,0.0000,0,'F','forever',NULL,NULL,NULL,NULL,NULL),(3,12,NULL,NULL,0.0000,0,'F','forever',NULL,NULL,NULL,NULL,NULL),(4,11,NULL,NULL,0.0000,0,'F','forever',NULL,NULL,NULL,NULL,NULL),(5,10,NULL,NULL,0.0000,0,'F','forever',NULL,NULL,NULL,NULL,NULL),(6,9,NULL,NULL,0.0000,0,'F','forever',NULL,NULL,NULL,NULL,NULL),(7,8,NULL,NULL,0.0000,0,'F','forever',NULL,NULL,NULL,NULL,NULL),(8,5,NULL,NULL,0.0000,0,'F','forever',NULL,NULL,NULL,NULL,NULL),(9,4,NULL,NULL,0.0000,0,'F','forever',NULL,NULL,NULL,NULL,NULL),(10,3,NULL,NULL,0.0000,0,'F','forever',NULL,NULL,NULL,NULL,NULL),(11,2,NULL,NULL,0.0000,0,'F','forever',NULL,NULL,NULL,NULL,NULL),(12,1,NULL,NULL,0.0000,0,'F','forever',NULL,NULL,NULL,NULL,NULL);
/*!40000 ALTER TABLE `ti_menus_specials` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ti_migrations`
--

DROP TABLE IF EXISTS `ti_migrations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_migrations` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `group` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `migration` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `batch` int NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=122 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ti_migrations`
--

LOCK TABLES `ti_migrations` WRITE;
/*!40000 ALTER TABLE `ti_migrations` DISABLE KEYS */;
INSERT INTO `ti_migrations` VALUES (1,'System','2015_03_25_000001_create_tables',1),(2,'System','2016_11_29_000300_optimize_tables_columns',1),(3,'System','2017_04_13_000300_modify_columns_on_users_and_customers_tables',1),(4,'System','2017_05_08_000300_add_columns',1),(5,'System','2017_06_11_000300_create_payments_and_payment_logs_table',1),(6,'System','2017_08_23_000300_create_themes_table',1),(7,'System','2018_01_23_000300_create_language_translations_table',1),(8,'System','2018_03_30_000300_create_extension_settings_table',1),(9,'System','2018_06_12_000300_rename_model_class_names_to_morph_map_custom_names',1),(10,'System','2018_10_19_000300_create_media_attachments_table',1),(11,'System','2018_10_21_131033_create_queue_table',1),(12,'System','2018_10_21_131044_create_sessions_table',1),(13,'System','2019_04_16_000300_nullify_customer_id_on_addresses_table',1),(14,'System','2019_07_01_000300_delete_unused_columns_from_activities_table',1),(15,'System','2019_07_22_000300_add_user_type_column_to_activities_table',1),(16,'System','2019_07_30_000300_create_mail_partials_table',1),(17,'System','2020_02_05_000300_delete_stale_unused_table',1),(18,'System','2020_04_16_000300_drop_stale_unused_columns',1),(19,'System','2020_05_24_000300_create_request_logs_table',1),(20,'System','2021_07_20_000300_add_uuid_column_to_failed_jobs_table',1),(21,'System','2021_07_20_172212_create_job_batches_table',1),(22,'System','2021_07_20_172321_create_cache_table',1),(23,'System','2021_09_06_010000_add_timestamps_to_tables',1),(24,'System','2021_10_22_010000_make_primary_key_bigint_all_tables',1),(25,'System','2021_10_25_010000_add_foreign_key_constraints_to_tables',1),(26,'System','2022_04_20_000300_add_version_column_to_languages_table',1),(27,'System','2022_06_30_010000_drop_foreign_key_constraints_on_all_tables',1),(28,'Admin','2017_08_25_000300_create_location_areas_table',1),(29,'Admin','2017_08_25_000300_create_menu_categories_table',1),(30,'Admin','2018_01_19_000300_add_hash_columns_on_orders_reservations_table',1),(31,'Admin','2018_04_06_000300_drop_unique_on_order_totals_table',1),(32,'Admin','2018_04_12_000300_modify_columns_on_orders_reservations_table',1),(33,'Admin','2018_05_21_000300_drop_redundant_columns_on_kitchen_tables',1),(34,'Admin','2018_05_29_000300_add_columns_on_location_areas_table',1),(35,'Admin','2018_06_12_000300_create_locationables_table',1),(36,'Admin','2018_07_04_000300_create_user_preferences_table',1),(37,'Admin','2018_10_09_000300_auto_increment_on_order_totals_table',1),(38,'Admin','2019_04_09_000300_auto_increment_on_user_preferences_table',1),(39,'Admin','2019_07_02_000300_add_columns_on_menu_specials_table',1),(40,'Admin','2019_07_16_000300_create_reservation_tables_table',1),(41,'Admin','2019_07_21_000300_change_sort_value_ratings_to_config_on_settings_table',1),(42,'Admin','2019_11_08_000300_add_selected_columns_to_menu_options_table',1),(43,'Admin','2020_02_18_000400_create_staffs_groups_and_locations_table',1),(44,'Admin','2020_02_21_000400_create_staff_roles_table',1),(45,'Admin','2020_02_22_000300_remove_add_columns_on_staff_staff_groups_table',1),(46,'Admin','2020_02_25_000300_create_assignable_logs_table',1),(47,'Admin','2020_03_18_000300_add_quantity_column_to_order_menu_options_table',1),(48,'Admin','2020_04_05_000300_create_payment_profiles_table',1),(49,'Admin','2020_04_16_000300_drop_stale_unused_columns',1),(50,'Admin','2020_05_31_000300_drop_more_unused_columns',1),(51,'Admin','2020_06_11_000300_create_menu_mealtimes_table',1),(52,'Admin','2020_08_16_000300_modify_columns_on_tables_reservations_table',1),(53,'Admin','2020_08_18_000300_create_allergens_table',1),(54,'Admin','2020_09_28_000300_add_refund_columns_to_payment_logs_table',1),(55,'Admin','2020_12_13_000300_merge_staffs_locations_into_locationables_table',1),(56,'Admin','2020_12_22_000300_add_priority_column_to_location_areas_table',1),(57,'Admin','2021_01_04_000300_add_update_related_column_to_menu_options_table',1),(58,'Admin','2021_01_04_010000_add_order_time_is_asap_on_orders_table',1),(59,'Admin','2021_04_23_010000_remove_unused_columns',1),(60,'Admin','2021_05_26_010000_alter_order_type_columns',1),(61,'Admin','2021_05_29_010000_add_is_summable_on_order_totals_table',1),(62,'Admin','2021_07_20_010000_add_columns_default_value',1),(63,'Admin','2021_09_03_010000_make_serialize_columns_json',1),(64,'Admin','2021_09_06_010000_add_timestamps_to_tables',1),(65,'Admin','2021_10_22_010000_make_primary_key_bigint_all_tables',1),(66,'Admin','2021_10_25_010000_add_foreign_key_constraints_to_tables',1),(67,'Admin','2021_11_28_000300_create_stocks_table',1),(68,'Admin','2022_02_07_010000_add_low_stock_alerted_on_stocks_table',1),(69,'Admin','2022_04_27_000300_create_location_options_table',1),(70,'Admin','2022_05_10_000300_add_primary_key_to_working_hours_table',1),(71,'Admin','2022_06_30_010000_drop_foreign_key_constraints_on_all_tables',1),(72,'Admin','2022_09_03_000300_make_location_options_fields_unique',1),(73,'Admin','2022_10_26_000300_make_code_field_unique_mail_layouts_partials_table',1),(74,'Admin','2023_01_10_000400_add_delivery_comment_orders_table',1),(75,'Admin','2023_06_06_000400_update_dashboard_widget_properties_on_user_preferences_table',1),(76,'igniter.cart','2017_10_20_000100_create_conditions_settings',1),(77,'igniter.cart','2017_11_20_010000_create_cart_table',1),(78,'igniter.cart','2018_09_20_010000_rename_content_field_on_cart_table',1),(79,'igniter.frontend','2018_01_28_000300_create_subscribers_table',1),(80,'igniter.frontend','2018_06_28_000300_create_banners_table',1),(81,'igniter.frontend','2019_11_02_000300_create_sliders_table',1),(82,'igniter.frontend','2021_10_20_000300_rename_banners_table',1),(83,'igniter.frontend','2021_11_18_010000_make_primary_key_bigint_all_tables',1),(84,'igniter.frontend','2021_11_18_010300_add_foreign_key_constraints_to_tables',1),(85,'igniter.frontend','2022_06_30_010000_drop_foreign_key_constraints',1),(86,'igniter.pages','2018_06_28_000300_create_pages_table',1),(87,'igniter.pages','2019_11_28_000300_create_menus_table',1),(88,'igniter.pages','2019_11_28_000400_alter_columns_on_pages_table',1),(89,'igniter.pages','2021_03_31_000300_seed_menus_table',1),(90,'igniter.pages','2021_09_06_010000_add_timestamps_to_pages',1),(91,'igniter.pages','2021_10_20_010000_add_foreign_key_constraints_to_tables',1),(92,'igniter.pages','2022_09_16_010000_change_page_content_to_medium_text',1),(93,'igniter.pages','2023_01_28_010000_make_page_id_incremental',1),(94,'igniter.local','2020_09_17_000300_create_reviews_table_or_rename',1),(95,'igniter.local','2020_12_10_000300_update_reviews_table',1),(96,'igniter.local','2021_01_02_000300_add_last_location_area_customers_table',1),(97,'igniter.local','2021_09_06_010000_add_timestamps_to_reviews',1),(98,'igniter.local','2021_11_18_010000_make_primary_key_bigint_all_tables',1),(99,'igniter.payregister','2021_05_08_000300_seed_default_payment_gateways',1),(100,'igniter.automation','2018_10_01_000100_create_all_tables',1),(101,'igniter.automation','2020_11_08_000300_create_task_log_table',1),(102,'igniter.automation','2021_11_18_010000_make_primary_key_bigint_all_tables',1),(103,'igniter.automation','2021_11_18_010300_add_foreign_key_constraints_to_tables',1),(104,'igniter.automation','2022_06_30_010000_drop_foreign_key_constraints',1),(105,'igniter.broadcast','2021_10_15_000400_create_websockets_statistics_entries_table',1),(106,'igniter.coupons','2020_09_17_000300_create_coupons_table_or_rename',1),(107,'igniter.coupons','2020_09_18_000300_create_coupon_relations_tables',1),(108,'igniter.coupons','2020_10_15_000300_create_cart_restriction',1),(109,'igniter.coupons','2020_11_01_000300_add_auto_apply_field_on_coupons_table',1),(110,'igniter.coupons','2021_02_22_000300_increase_coupon_code_character_limit',1),(111,'igniter.coupons','2021_05_26_010000_alter_order_restriction_column',1),(112,'igniter.coupons','2021_09_06_010000_add_timestamps_to_coupons',1),(113,'igniter.coupons','2021_11_18_010000_make_primary_key_bigint_all_tables',1),(114,'igniter.coupons','2021_11_18_010300_add_foreign_key_constraints_to_tables',1),(115,'igniter.coupons','2022_06_30_010000_drop_foreign_key_constraints',1),(116,'igniter.coupons','2023_06_03_010000_set_nullable_columns',1),(117,'igniter.coupons','2023_09_28_010000_create_coupon_customer_groups_tables',1),(118,'igniter.coupons','2023_10_19_010000_change_is_limited_to_cart_item_to_apply_coupon_on_enum',1),(119,'igniter.socialite','2018_10_11_211028_create_socialite_providers_table',1),(120,'igniter.socialite','2022_02_04_211028_add_user_type_column_socialite_providers_table',1),(121,'igniter.socialite','2022_06_14_211028_increase_string_length',1);
/*!40000 ALTER TABLE `ti_migrations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ti_order_menu_options`
--

DROP TABLE IF EXISTS `ti_order_menu_options`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_order_menu_options` (
  `order_option_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `order_id` int NOT NULL,
  `menu_id` int NOT NULL,
  `order_option_name` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `order_option_price` decimal(15,4) DEFAULT NULL,
  `order_menu_id` int NOT NULL,
  `order_menu_option_id` int NOT NULL,
  `menu_option_value_id` int NOT NULL,
  `quantity` int DEFAULT '1',
  PRIMARY KEY (`order_option_id`)
) ENGINE=InnoDB AUTO_INCREMENT=24 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ti_order_menu_options`
--

LOCK TABLES `ti_order_menu_options` WRITE;
/*!40000 ALTER TABLE `ti_order_menu_options` DISABLE KEYS */;
INSERT INTO `ti_order_menu_options` VALUES (1,2,4,'Meat',4.9500,4,5,10,1),(2,2,4,'Small',0.0000,4,6,13,1),(3,3,4,'Meat',4.9500,9,5,10,1),(4,3,4,'Small',0.0000,9,6,13,1),(5,4,3,'Beef',6.9500,10,3,7,1),(6,4,3,'Small',0.0000,10,4,8,1),(7,5,2,'Small',0.0000,13,2,3,1),(8,5,3,'Fish',4.9500,14,3,6,1),(9,6,4,'Beef',6.9500,15,5,12,1),(10,6,4,'Small',0.0000,15,6,13,1),(15,7,5,'Small',0.0000,25,7,15,1),(16,8,4,'Beef',6.9500,27,5,12,1),(17,8,4,'Large',5.0000,27,6,14,1),(18,11,2,'Large',5.0000,32,2,4,1),(19,15,4,'Fish',4.9500,42,5,11,1),(20,15,4,'Small',0.0000,42,6,13,1),(21,16,2,'Small',0.0000,43,2,3,1),(22,17,3,'Beef',6.9500,44,3,7,1),(23,17,3,'Large',5.0000,44,4,9,1);
/*!40000 ALTER TABLE `ti_order_menu_options` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ti_order_menus`
--

DROP TABLE IF EXISTS `ti_order_menus`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_order_menus` (
  `order_menu_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `order_id` int NOT NULL,
  `menu_id` int NOT NULL,
  `name` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `quantity` int NOT NULL,
  `price` decimal(15,4) DEFAULT NULL,
  `subtotal` decimal(15,4) DEFAULT NULL,
  `option_values` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `comment` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`order_menu_id`)
) ENGINE=InnoDB AUTO_INCREMENT=46 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ti_order_menus`
--

LOCK TABLES `ti_order_menus` WRITE;
/*!40000 ALTER TABLE `ti_order_menus` DISABLE KEYS */;
INSERT INTO `ti_order_menus` VALUES (1,1,6,'Whole catfish with rice and vegetables',2,13.9900,27.9800,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',''),(2,1,9,'Salad Cesar',1,11.9900,11.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',''),(3,1,12,'Boiled Plantain',1,9.9900,9.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',''),(4,2,4,'RICE AND DODO',1,11.9900,16.9400,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:2:{i:5;O:33:\"Igniter\\Flame\\Cart\\CartItemOption\":3:{s:2:\"id\";i:5;s:4:\"name\";s:5:\"Sides\";s:6:\"values\";O:39:\"Igniter\\Flame\\Cart\\CartItemOptionValues\":2:{s:8:\"\0*\0items\";a:1:{i:10;O:38:\"Igniter\\Flame\\Cart\\CartItemOptionValue\":4:{s:2:\"id\";i:10;s:4:\"name\";s:4:\"Meat\";s:3:\"qty\";i:1;s:5:\"price\";d:4.95;}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}}i:6;O:33:\"Igniter\\Flame\\Cart\\CartItemOption\":3:{s:2:\"id\";i:6;s:4:\"name\";s:4:\"Size\";s:6:\"values\";O:39:\"Igniter\\Flame\\Cart\\CartItemOptionValues\":2:{s:8:\"\0*\0items\";a:1:{i:13;O:38:\"Igniter\\Flame\\Cart\\CartItemOptionValue\":4:{s:2:\"id\";i:13;s:4:\"name\";s:5:\"Small\";s:3:\"qty\";i:1;s:5:\"price\";d:0;}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',''),(5,2,9,'Salad Cesar',1,11.9900,11.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL),(6,3,9,'Salad Cesar',1,11.9900,11.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL),(7,3,8,'Seafood Salad',1,5.9900,5.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL),(8,3,6,'Whole catfish with rice and vegetables',1,13.9900,13.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL),(9,3,4,'RICE AND DODO',1,11.9900,16.9400,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:2:{i:5;O:33:\"Igniter\\Flame\\Cart\\CartItemOption\":3:{s:2:\"id\";i:5;s:4:\"name\";s:5:\"Sides\";s:6:\"values\";O:39:\"Igniter\\Flame\\Cart\\CartItemOptionValues\":2:{s:8:\"\0*\0items\";a:1:{i:10;O:38:\"Igniter\\Flame\\Cart\\CartItemOptionValue\":4:{s:2:\"id\";i:10;s:4:\"name\";s:4:\"Meat\";s:3:\"qty\";i:1;s:5:\"price\";d:4.95;}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}}i:6;O:33:\"Igniter\\Flame\\Cart\\CartItemOption\":3:{s:2:\"id\";i:6;s:4:\"name\";s:4:\"Size\";s:6:\"values\";O:39:\"Igniter\\Flame\\Cart\\CartItemOptionValues\":2:{s:8:\"\0*\0items\";a:1:{i:13;O:38:\"Igniter\\Flame\\Cart\\CartItemOptionValue\":4:{s:2:\"id\";i:13;s:4:\"name\";s:5:\"Small\";s:3:\"qty\";i:1;s:5:\"price\";d:0;}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',''),(10,4,3,'ATA RICE',1,12.0000,18.9500,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:2:{i:3;O:33:\"Igniter\\Flame\\Cart\\CartItemOption\":3:{s:2:\"id\";i:3;s:4:\"name\";s:5:\"Sides\";s:6:\"values\";O:39:\"Igniter\\Flame\\Cart\\CartItemOptionValues\":2:{s:8:\"\0*\0items\";a:1:{i:7;O:38:\"Igniter\\Flame\\Cart\\CartItemOptionValue\":4:{s:2:\"id\";i:7;s:4:\"name\";s:4:\"Beef\";s:3:\"qty\";i:1;s:5:\"price\";d:6.95;}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}}i:4;O:33:\"Igniter\\Flame\\Cart\\CartItemOption\":3:{s:2:\"id\";i:4;s:4:\"name\";s:4:\"Size\";s:6:\"values\";O:39:\"Igniter\\Flame\\Cart\\CartItemOptionValues\":2:{s:8:\"\0*\0items\";a:1:{i:8;O:38:\"Igniter\\Flame\\Cart\\CartItemOptionValue\":4:{s:2:\"id\";i:8;s:4:\"name\";s:5:\"Small\";s:3:\"qty\";i:1;s:5:\"price\";d:0;}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',''),(11,4,9,'Salad Cesar',1,11.9900,11.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL),(12,4,12,'Boiled Plantain',1,9.9900,9.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL),(13,5,2,'SCOTCH EGG',1,2.0000,2.0000,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:1:{i:2;O:33:\"Igniter\\Flame\\Cart\\CartItemOption\":3:{s:2:\"id\";i:2;s:4:\"name\";s:4:\"Size\";s:6:\"values\";O:39:\"Igniter\\Flame\\Cart\\CartItemOptionValues\":2:{s:8:\"\0*\0items\";a:1:{i:3;O:38:\"Igniter\\Flame\\Cart\\CartItemOptionValue\":4:{s:2:\"id\";i:3;s:4:\"name\";s:5:\"Small\";s:3:\"qty\";i:1;s:5:\"price\";d:0;}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',''),(14,5,3,'ATA RICE',1,12.0000,16.9500,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:1:{i:3;O:33:\"Igniter\\Flame\\Cart\\CartItemOption\":3:{s:2:\"id\";i:3;s:4:\"name\";s:5:\"Sides\";s:6:\"values\";O:39:\"Igniter\\Flame\\Cart\\CartItemOptionValues\":2:{s:8:\"\0*\0items\";a:1:{i:6;O:38:\"Igniter\\Flame\\Cart\\CartItemOptionValue\":4:{s:2:\"id\";i:6;s:4:\"name\";s:4:\"Fish\";s:3:\"qty\";i:1;s:5:\"price\";d:4.95;}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',''),(15,6,4,'RICE AND DODO',1,11.9900,18.9400,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:2:{i:5;O:33:\"Igniter\\Flame\\Cart\\CartItemOption\":3:{s:2:\"id\";i:5;s:4:\"name\";s:5:\"Sides\";s:6:\"values\";O:39:\"Igniter\\Flame\\Cart\\CartItemOptionValues\":2:{s:8:\"\0*\0items\";a:1:{i:12;O:38:\"Igniter\\Flame\\Cart\\CartItemOptionValue\":4:{s:2:\"id\";i:12;s:4:\"name\";s:4:\"Beef\";s:3:\"qty\";i:1;s:5:\"price\";d:6.95;}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}}i:6;O:33:\"Igniter\\Flame\\Cart\\CartItemOption\":3:{s:2:\"id\";i:6;s:4:\"name\";s:4:\"Size\";s:6:\"values\";O:39:\"Igniter\\Flame\\Cart\\CartItemOptionValues\":2:{s:8:\"\0*\0items\";a:1:{i:13;O:38:\"Igniter\\Flame\\Cart\\CartItemOptionValue\":4:{s:2:\"id\";i:13;s:4:\"name\";s:5:\"Small\";s:3:\"qty\";i:1;s:5:\"price\";d:0;}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',''),(16,6,6,'Whole catfish with rice and vegetables',1,13.9900,13.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL),(25,7,5,'Special Shrimp Deluxe',1,12.9900,12.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:1:{i:7;O:33:\"Igniter\\Flame\\Cart\\CartItemOption\":3:{s:2:\"id\";i:7;s:4:\"name\";s:4:\"Size\";s:6:\"values\";O:39:\"Igniter\\Flame\\Cart\\CartItemOptionValues\":2:{s:8:\"\0*\0items\";a:1:{i:15;O:38:\"Igniter\\Flame\\Cart\\CartItemOptionValue\":4:{s:2:\"id\";i:15;s:4:\"name\";s:5:\"Small\";s:3:\"qty\";i:1;s:5:\"price\";d:0;}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',''),(26,7,9,'Salad Cesar',1,11.9900,11.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL),(27,8,4,'RICE AND DODO',1,11.9900,23.9400,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:2:{i:5;O:33:\"Igniter\\Flame\\Cart\\CartItemOption\":3:{s:2:\"id\";i:5;s:4:\"name\";s:5:\"Sides\";s:6:\"values\";O:39:\"Igniter\\Flame\\Cart\\CartItemOptionValues\":2:{s:8:\"\0*\0items\";a:1:{i:12;O:38:\"Igniter\\Flame\\Cart\\CartItemOptionValue\":4:{s:2:\"id\";i:12;s:4:\"name\";s:4:\"Beef\";s:3:\"qty\";i:1;s:5:\"price\";d:6.95;}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}}i:6;O:33:\"Igniter\\Flame\\Cart\\CartItemOption\":3:{s:2:\"id\";i:6;s:4:\"name\";s:4:\"Size\";s:6:\"values\";O:39:\"Igniter\\Flame\\Cart\\CartItemOptionValues\":2:{s:8:\"\0*\0items\";a:1:{i:14;O:38:\"Igniter\\Flame\\Cart\\CartItemOptionValue\":4:{s:2:\"id\";i:14;s:4:\"name\";s:5:\"Large\";s:3:\"qty\";i:1;s:5:\"price\";d:5;}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',''),(28,8,7,'Simple Salad',1,8.9900,8.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL),(29,9,9,'Salad Cesar',1,11.9900,11.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL),(30,9,11,'YAM PORRIDGE',1,9.9900,9.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL),(31,10,9,'Salad Cesar',1,11.9900,11.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL),(32,11,2,'SCOTCH EGG',1,2.0000,7.0000,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:1:{i:2;O:33:\"Igniter\\Flame\\Cart\\CartItemOption\":3:{s:2:\"id\";i:2;s:4:\"name\";s:4:\"Size\";s:6:\"values\";O:39:\"Igniter\\Flame\\Cart\\CartItemOptionValues\":2:{s:8:\"\0*\0items\";a:1:{i:4;O:38:\"Igniter\\Flame\\Cart\\CartItemOptionValue\":4:{s:2:\"id\";i:4;s:4:\"name\";s:5:\"Large\";s:3:\"qty\";i:1;s:5:\"price\";d:5;}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',''),(33,11,9,'Salad Cesar',1,11.9900,11.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL),(34,12,9,'Salad Cesar',1,11.9900,11.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL),(35,12,11,'YAM PORRIDGE',1,9.9900,9.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL),(36,13,9,'Salad Cesar',1,11.9900,11.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL),(37,13,11,'YAM PORRIDGE',1,9.9900,9.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL),(38,14,9,'Salad Cesar',1,11.9900,11.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL),(39,14,11,'YAM PORRIDGE',1,9.9900,9.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL),(40,15,9,'Salad Cesar',2,11.9900,23.9800,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL),(41,15,11,'YAM PORRIDGE',1,9.9900,9.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL),(42,15,4,'RICE AND DODO',1,11.9900,16.9400,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:2:{i:5;O:33:\"Igniter\\Flame\\Cart\\CartItemOption\":3:{s:2:\"id\";i:5;s:4:\"name\";s:5:\"Sides\";s:6:\"values\";O:39:\"Igniter\\Flame\\Cart\\CartItemOptionValues\":2:{s:8:\"\0*\0items\";a:1:{i:11;O:38:\"Igniter\\Flame\\Cart\\CartItemOptionValue\":4:{s:2:\"id\";i:11;s:4:\"name\";s:4:\"Fish\";s:3:\"qty\";i:1;s:5:\"price\";d:4.95;}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}}i:6;O:33:\"Igniter\\Flame\\Cart\\CartItemOption\":3:{s:2:\"id\";i:6;s:4:\"name\";s:4:\"Size\";s:6:\"values\";O:39:\"Igniter\\Flame\\Cart\\CartItemOptionValues\":2:{s:8:\"\0*\0items\";a:1:{i:13;O:38:\"Igniter\\Flame\\Cart\\CartItemOptionValue\":4:{s:2:\"id\";i:13;s:4:\"name\";s:5:\"Small\";s:3:\"qty\";i:1;s:5:\"price\";d:0;}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',''),(43,16,2,'SCOTCH EGG',1,2.0000,2.0000,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:1:{i:2;O:33:\"Igniter\\Flame\\Cart\\CartItemOption\":3:{s:2:\"id\";i:2;s:4:\"name\";s:4:\"Size\";s:6:\"values\";O:39:\"Igniter\\Flame\\Cart\\CartItemOptionValues\":2:{s:8:\"\0*\0items\";a:1:{i:3;O:38:\"Igniter\\Flame\\Cart\\CartItemOptionValue\":4:{s:2:\"id\";i:3;s:4:\"name\";s:5:\"Small\";s:3:\"qty\";i:1;s:5:\"price\";d:0;}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',''),(44,17,3,'ATA RICE',1,12.0000,23.9500,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:2:{i:3;O:33:\"Igniter\\Flame\\Cart\\CartItemOption\":3:{s:2:\"id\";i:3;s:4:\"name\";s:5:\"Sides\";s:6:\"values\";O:39:\"Igniter\\Flame\\Cart\\CartItemOptionValues\":2:{s:8:\"\0*\0items\";a:1:{i:7;O:38:\"Igniter\\Flame\\Cart\\CartItemOptionValue\":4:{s:2:\"id\";i:7;s:4:\"name\";s:4:\"Beef\";s:3:\"qty\";i:1;s:5:\"price\";d:6.95;}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}}i:4;O:33:\"Igniter\\Flame\\Cart\\CartItemOption\":3:{s:2:\"id\";i:4;s:4:\"name\";s:4:\"Size\";s:6:\"values\";O:39:\"Igniter\\Flame\\Cart\\CartItemOptionValues\":2:{s:8:\"\0*\0items\";a:1:{i:9;O:38:\"Igniter\\Flame\\Cart\\CartItemOptionValue\":4:{s:2:\"id\";i:9;s:4:\"name\";s:5:\"Large\";s:3:\"qty\";i:1;s:5:\"price\";d:5;}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',''),(45,17,8,'Seafood Salad',1,5.9900,5.9900,'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',NULL);
/*!40000 ALTER TABLE `ti_order_menus` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ti_order_totals`
--

DROP TABLE IF EXISTS `ti_order_totals`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_order_totals` (
  `order_total_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `order_id` int unsigned NOT NULL,
  `code` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `value` decimal(15,4) NOT NULL,
  `priority` tinyint(1) NOT NULL DEFAULT '0',
  `is_summable` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`order_total_id`)
) ENGINE=InnoDB AUTO_INCREMENT=49 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ti_order_totals`
--

LOCK TABLES `ti_order_totals` WRITE;
/*!40000 ALTER TABLE `ti_order_totals` DISABLE KEYS */;
INSERT INTO `ti_order_totals` VALUES (1,1,'delivery','Delivery',0.0000,100,1),(2,1,'subtotal','Sub Total',49.9600,0,0),(3,1,'total','Order Total',49.9600,127,0),(4,2,'delivery','Delivery',0.0000,100,1),(5,2,'subtotal','Sub Total',28.9300,0,0),(6,2,'total','Order Total',28.9300,127,0),(7,3,'subtotal','Sub Total',48.9100,0,0),(8,3,'total','Order Total',48.9100,127,0),(9,4,'subtotal','Sub Total',40.9300,0,0),(10,4,'total','Order Total',40.9300,127,0),(11,5,'subtotal','Sub Total',18.9500,0,0),(12,5,'total','Order Total',18.9500,127,0),(13,6,'delivery','Delivery',0.0000,100,1),(14,6,'subtotal','Sub Total',32.9300,0,0),(15,6,'total','Order Total',32.9300,127,0),(16,7,'delivery','Delivery',0.0000,100,1),(17,7,'subtotal','Sub Total',24.9800,0,0),(18,7,'total','Order Total',24.9800,127,0),(19,8,'delivery','Delivery',0.0000,100,1),(20,8,'subtotal','Sub Total',32.9300,0,0),(21,8,'total','Order Total',32.9300,127,0),(22,9,'delivery','Delivery',0.0000,100,1),(23,9,'subtotal','Sub Total',21.9800,0,0),(24,9,'total','Order Total',21.9800,127,0),(25,10,'delivery','Delivery',0.0000,1,1),(26,10,'subtotal','Sub Total',11.9900,0,0),(27,10,'total','Order Total',11.9900,127,0),(28,11,'delivery','Delivery',0.0000,1,1),(29,11,'subtotal','Sub Total',18.9900,0,0),(30,11,'total','Order Total',18.9900,127,0),(31,12,'delivery','Delivery',0.0000,1,1),(32,12,'subtotal','Sub Total',21.9800,0,0),(33,12,'total','Order Total',21.9800,127,0),(34,13,'delivery','Delivery',0.0000,1,1),(35,13,'subtotal','Sub Total',21.9800,0,0),(36,13,'total','Order Total',21.9800,127,0),(37,14,'delivery','Delivery',0.0000,1,1),(38,14,'subtotal','Sub Total',21.9800,0,0),(39,14,'total','Order Total',21.9800,127,0),(40,15,'delivery','Delivery',0.0000,1,1),(41,15,'subtotal','Sub Total',50.9100,0,0),(42,15,'total','Order Total',50.9100,127,0),(43,16,'delivery','Delivery',0.0000,1,1),(44,16,'subtotal','Sub Total',2.0000,0,0),(45,16,'total','Order Total',2.0000,127,0),(46,17,'delivery','Delivery',0.0000,1,1),(47,17,'subtotal','Sub Total',29.9400,0,0),(48,17,'total','Order Total',29.9400,127,0);
/*!40000 ALTER TABLE `ti_order_totals` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ti_orders`
--

DROP TABLE IF EXISTS `ti_orders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_orders` (
  `order_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `customer_id` int DEFAULT NULL,
  `first_name` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `last_name` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(96) COLLATE utf8mb4_unicode_ci NOT NULL,
  `telephone` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `location_id` int NOT NULL,
  `address_id` int DEFAULT NULL,
  `cart` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `total_items` int NOT NULL,
  `comment` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `payment` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `order_type` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `order_time` time NOT NULL,
  `order_date` date NOT NULL,
  `order_total` decimal(15,4) DEFAULT NULL,
  `status_id` int NOT NULL,
  `ip_address` varchar(40) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_agent` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `assignee_id` int DEFAULT NULL,
  `assignee_group_id` int unsigned DEFAULT NULL,
  `invoice_prefix` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `invoice_date` datetime DEFAULT NULL,
  `hash` varchar(40) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `processed` tinyint(1) DEFAULT NULL,
  `status_updated_at` datetime DEFAULT NULL,
  `assignee_updated_at` datetime DEFAULT NULL,
  `order_time_is_asap` tinyint(1) NOT NULL DEFAULT '0',
  `delivery_comment` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`order_id`),
  KEY `ti_orders_hash_index` (`hash`)
) ENGINE=InnoDB AUTO_INCREMENT=18 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ti_orders`
--

LOCK TABLES `ti_orders` WRITE;
/*!40000 ALTER TABLE `ti_orders` DISABLE KEYS */;
INSERT INTO `ti_orders` VALUES (1,1,'oussama','douba','douba.oussama69@gmail.com','+57671409293',1,1,'O:30:\"Igniter\\Flame\\Cart\\CartContent\":2:{s:8:\"\0*\0items\";a:3:{s:32:\"8a48aa7c8e5202841ddaf767bb4d10da\";O:27:\"Igniter\\Flame\\Cart\\CartItem\":9:{s:5:\"rowId\";s:32:\"8a48aa7c8e5202841ddaf767bb4d10da\";s:2:\"id\";i:6;s:3:\"qty\";i:2;s:4:\"name\";s:38:\"Whole catfish with rice and vegetables\";s:5:\"price\";d:13.99;s:7:\"comment\";s:0:\"\";s:7:\"options\";O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}s:10:\"conditions\";O:37:\"Igniter\\Flame\\Cart\\CartItemConditions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}s:18:\"\0*\0associatedModel\";s:31:\"Igniter\\Cart\\Models\\Menus_model\";}s:32:\"c42f6beec9c93fd6afea6eb0684aa99a\";O:27:\"Igniter\\Flame\\Cart\\CartItem\":9:{s:5:\"rowId\";s:32:\"c42f6beec9c93fd6afea6eb0684aa99a\";s:2:\"id\";i:9;s:3:\"qty\";s:1:\"1\";s:4:\"name\";s:11:\"Salad Cesar\";s:5:\"price\";d:11.99;s:7:\"comment\";s:0:\"\";s:7:\"options\";O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}s:10:\"conditions\";O:37:\"Igniter\\Flame\\Cart\\CartItemConditions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}s:18:\"\0*\0associatedModel\";s:31:\"Igniter\\Cart\\Models\\Menus_model\";}s:32:\"eef12573176125ce53e333e13d747a17\";O:27:\"Igniter\\Flame\\Cart\\CartItem\":9:{s:5:\"rowId\";s:32:\"eef12573176125ce53e333e13d747a17\";s:2:\"id\";i:12;s:3:\"qty\";s:1:\"1\";s:4:\"name\";s:15:\"Boiled Plantain\";s:5:\"price\";d:9.99;s:7:\"comment\";s:0:\"\";s:7:\"options\";O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}s:10:\"conditions\";O:37:\"Igniter\\Flame\\Cart\\CartItemConditions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}s:18:\"\0*\0associatedModel\";s:31:\"Igniter\\Cart\\Models\\Menus_model\";}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',4,'','cod','delivery','2025-01-02 18:04:24','2025-01-04 20:52:53','18:19:00','2025-01-02',49.9600,2,'10.10.1.254','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',NULL,NULL,'INV-2025-00','2025-01-02 18:04:24','7c1950cbbc65b7fac967d815b4700f42',1,'2025-01-02 18:05:07',NULL,1,NULL),(2,1,'oussama','douba','douba.oussama69@gmail.com','+57671409293',1,2,'O:30:\"Igniter\\Flame\\Cart\\CartContent\":2:{s:8:\"\0*\0items\";a:2:{s:32:\"fb319347ccfbba8f93b74bf2a86f5475\";O:27:\"Igniter\\Flame\\Cart\\CartItem\":9:{s:5:\"rowId\";s:32:\"fb319347ccfbba8f93b74bf2a86f5475\";s:2:\"id\";i:4;s:3:\"qty\";s:1:\"1\";s:4:\"name\";s:13:\"RICE AND DODO\";s:5:\"price\";d:11.99;s:7:\"comment\";s:0:\"\";s:7:\"options\";O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:2:{i:5;O:33:\"Igniter\\Flame\\Cart\\CartItemOption\":3:{s:2:\"id\";i:5;s:4:\"name\";s:5:\"Sides\";s:6:\"values\";O:39:\"Igniter\\Flame\\Cart\\CartItemOptionValues\":2:{s:8:\"\0*\0items\";a:1:{i:10;O:38:\"Igniter\\Flame\\Cart\\CartItemOptionValue\":4:{s:2:\"id\";i:10;s:4:\"name\";s:4:\"Meat\";s:3:\"qty\";i:1;s:5:\"price\";d:4.95;}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}}i:6;O:33:\"Igniter\\Flame\\Cart\\CartItemOption\":3:{s:2:\"id\";i:6;s:4:\"name\";s:4:\"Size\";s:6:\"values\";O:39:\"Igniter\\Flame\\Cart\\CartItemOptionValues\":2:{s:8:\"\0*\0items\";a:1:{i:13;O:38:\"Igniter\\Flame\\Cart\\CartItemOptionValue\":4:{s:2:\"id\";i:13;s:4:\"name\";s:5:\"Small\";s:3:\"qty\";i:1;s:5:\"price\";d:0;}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}s:10:\"conditions\";O:37:\"Igniter\\Flame\\Cart\\CartItemConditions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}s:18:\"\0*\0associatedModel\";s:31:\"Igniter\\Cart\\Models\\Menus_model\";}s:32:\"c42f6beec9c93fd6afea6eb0684aa99a\";O:27:\"Igniter\\Flame\\Cart\\CartItem\":9:{s:5:\"rowId\";s:32:\"c42f6beec9c93fd6afea6eb0684aa99a\";s:2:\"id\";i:9;s:3:\"qty\";s:1:\"1\";s:4:\"name\";s:11:\"Salad Cesar\";s:5:\"price\";d:11.99;s:7:\"comment\";N;s:7:\"options\";O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}s:10:\"conditions\";O:37:\"Igniter\\Flame\\Cart\\CartItemConditions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}s:18:\"\0*\0associatedModel\";s:31:\"Igniter\\Cart\\Models\\Menus_model\";}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',2,'','cod','delivery','2025-01-03 15:10:49','2025-01-04 20:52:53','15:25:00','2025-01-03',28.9300,5,'10.10.1.254','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',NULL,NULL,'INV-2025-00','2025-01-03 15:10:49','bf23547218717b26569b26e59fe37328',1,'2025-01-03 15:11:58',NULL,1,NULL),(3,1,'oussama','douba','douba.oussama69@gmail.com','+213671409293',1,NULL,'O:30:\"Igniter\\Flame\\Cart\\CartContent\":2:{s:8:\"\0*\0items\";a:4:{s:32:\"c42f6beec9c93fd6afea6eb0684aa99a\";O:27:\"Igniter\\Flame\\Cart\\CartItem\":9:{s:5:\"rowId\";s:32:\"c42f6beec9c93fd6afea6eb0684aa99a\";s:2:\"id\";i:9;s:3:\"qty\";s:1:\"1\";s:4:\"name\";s:11:\"Salad Cesar\";s:5:\"price\";d:11.99;s:7:\"comment\";N;s:7:\"options\";O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}s:10:\"conditions\";O:37:\"Igniter\\Flame\\Cart\\CartItemConditions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}s:18:\"\0*\0associatedModel\";s:31:\"Igniter\\Cart\\Models\\Menus_model\";}s:32:\"18d6934483b994fb9943b43b7d7646bf\";O:27:\"Igniter\\Flame\\Cart\\CartItem\":9:{s:5:\"rowId\";s:32:\"18d6934483b994fb9943b43b7d7646bf\";s:2:\"id\";i:8;s:3:\"qty\";s:1:\"1\";s:4:\"name\";s:13:\"Seafood Salad\";s:5:\"price\";d:5.99;s:7:\"comment\";N;s:7:\"options\";O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}s:10:\"conditions\";O:37:\"Igniter\\Flame\\Cart\\CartItemConditions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}s:18:\"\0*\0associatedModel\";s:31:\"Igniter\\Cart\\Models\\Menus_model\";}s:32:\"8a48aa7c8e5202841ddaf767bb4d10da\";O:27:\"Igniter\\Flame\\Cart\\CartItem\":9:{s:5:\"rowId\";s:32:\"8a48aa7c8e5202841ddaf767bb4d10da\";s:2:\"id\";i:6;s:3:\"qty\";s:1:\"1\";s:4:\"name\";s:38:\"Whole catfish with rice and vegetables\";s:5:\"price\";d:13.99;s:7:\"comment\";N;s:7:\"options\";O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}s:10:\"conditions\";O:37:\"Igniter\\Flame\\Cart\\CartItemConditions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}s:18:\"\0*\0associatedModel\";s:31:\"Igniter\\Cart\\Models\\Menus_model\";}s:32:\"fb319347ccfbba8f93b74bf2a86f5475\";O:27:\"Igniter\\Flame\\Cart\\CartItem\":9:{s:5:\"rowId\";s:32:\"fb319347ccfbba8f93b74bf2a86f5475\";s:2:\"id\";i:4;s:3:\"qty\";s:1:\"1\";s:4:\"name\";s:13:\"RICE AND DODO\";s:5:\"price\";d:11.99;s:7:\"comment\";s:0:\"\";s:7:\"options\";O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:2:{i:5;O:33:\"Igniter\\Flame\\Cart\\CartItemOption\":3:{s:2:\"id\";i:5;s:4:\"name\";s:5:\"Sides\";s:6:\"values\";O:39:\"Igniter\\Flame\\Cart\\CartItemOptionValues\":2:{s:8:\"\0*\0items\";a:1:{i:10;O:38:\"Igniter\\Flame\\Cart\\CartItemOptionValue\":4:{s:2:\"id\";i:10;s:4:\"name\";s:4:\"Meat\";s:3:\"qty\";i:1;s:5:\"price\";d:4.95;}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}}i:6;O:33:\"Igniter\\Flame\\Cart\\CartItemOption\":3:{s:2:\"id\";i:6;s:4:\"name\";s:4:\"Size\";s:6:\"values\";O:39:\"Igniter\\Flame\\Cart\\CartItemOptionValues\":2:{s:8:\"\0*\0items\";a:1:{i:13;O:38:\"Igniter\\Flame\\Cart\\CartItemOptionValue\":4:{s:2:\"id\";i:13;s:4:\"name\";s:5:\"Small\";s:3:\"qty\";i:1;s:5:\"price\";d:0;}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}s:10:\"conditions\";O:37:\"Igniter\\Flame\\Cart\\CartItemConditions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}s:18:\"\0*\0associatedModel\";s:31:\"Igniter\\Cart\\Models\\Menus_model\";}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',4,'','cod','collection','2025-01-05 19:18:40','2025-01-05 19:20:03','19:33:00','2025-01-05',48.9100,5,'10.10.1.254','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',NULL,NULL,'INV-2025-00','2025-01-05 19:18:40','070f954a21014b8dcc9e546ff9f11d8a',1,'2025-01-05 19:20:03',NULL,1,NULL),(4,NULL,'oussama','douba','Oussama@hpcmicrosystems.net','+57671409293',1,NULL,'O:30:\"Igniter\\Flame\\Cart\\CartContent\":2:{s:8:\"\0*\0items\";a:3:{s:32:\"1b45ff0dfa7436c579d111c88faa143a\";O:27:\"Igniter\\Flame\\Cart\\CartItem\":9:{s:5:\"rowId\";s:32:\"1b45ff0dfa7436c579d111c88faa143a\";s:2:\"id\";i:3;s:3:\"qty\";s:1:\"1\";s:4:\"name\";s:8:\"ATA RICE\";s:5:\"price\";d:12;s:7:\"comment\";s:0:\"\";s:7:\"options\";O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:2:{i:3;O:33:\"Igniter\\Flame\\Cart\\CartItemOption\":3:{s:2:\"id\";i:3;s:4:\"name\";s:5:\"Sides\";s:6:\"values\";O:39:\"Igniter\\Flame\\Cart\\CartItemOptionValues\":2:{s:8:\"\0*\0items\";a:1:{i:7;O:38:\"Igniter\\Flame\\Cart\\CartItemOptionValue\":4:{s:2:\"id\";i:7;s:4:\"name\";s:4:\"Beef\";s:3:\"qty\";i:1;s:5:\"price\";d:6.95;}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}}i:4;O:33:\"Igniter\\Flame\\Cart\\CartItemOption\":3:{s:2:\"id\";i:4;s:4:\"name\";s:4:\"Size\";s:6:\"values\";O:39:\"Igniter\\Flame\\Cart\\CartItemOptionValues\":2:{s:8:\"\0*\0items\";a:1:{i:8;O:38:\"Igniter\\Flame\\Cart\\CartItemOptionValue\":4:{s:2:\"id\";i:8;s:4:\"name\";s:5:\"Small\";s:3:\"qty\";i:1;s:5:\"price\";d:0;}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}s:10:\"conditions\";O:37:\"Igniter\\Flame\\Cart\\CartItemConditions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}s:18:\"\0*\0associatedModel\";s:31:\"Igniter\\Cart\\Models\\Menus_model\";}s:32:\"c42f6beec9c93fd6afea6eb0684aa99a\";O:27:\"Igniter\\Flame\\Cart\\CartItem\":9:{s:5:\"rowId\";s:32:\"c42f6beec9c93fd6afea6eb0684aa99a\";s:2:\"id\";i:9;s:3:\"qty\";s:1:\"1\";s:4:\"name\";s:11:\"Salad Cesar\";s:5:\"price\";d:11.99;s:7:\"comment\";N;s:7:\"options\";O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}s:10:\"conditions\";O:37:\"Igniter\\Flame\\Cart\\CartItemConditions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}s:18:\"\0*\0associatedModel\";s:31:\"Igniter\\Cart\\Models\\Menus_model\";}s:32:\"eef12573176125ce53e333e13d747a17\";O:27:\"Igniter\\Flame\\Cart\\CartItem\":9:{s:5:\"rowId\";s:32:\"eef12573176125ce53e333e13d747a17\";s:2:\"id\";i:12;s:3:\"qty\";s:1:\"1\";s:4:\"name\";s:15:\"Boiled Plantain\";s:5:\"price\";d:9.99;s:7:\"comment\";N;s:7:\"options\";O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}s:10:\"conditions\";O:37:\"Igniter\\Flame\\Cart\\CartItemConditions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}s:18:\"\0*\0associatedModel\";s:31:\"Igniter\\Cart\\Models\\Menus_model\";}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',3,'','cod','collection','2025-01-06 11:00:49','2025-01-06 11:00:49','11:15:00','2025-01-06',40.9300,1,'10.10.1.254','Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36',NULL,NULL,'INV-2025-00','2025-01-06 11:00:49','8bde965438d46773f89bfa838bd4bde7',1,'2025-01-06 11:00:49',NULL,1,NULL),(5,NULL,'oussama','douba','di-dt@gg-ss.com','+57671409293',1,NULL,'O:30:\"Igniter\\Flame\\Cart\\CartContent\":2:{s:8:\"\0*\0items\";a:2:{s:32:\"237fe73223bc70979dd442367b4074e3\";O:27:\"Igniter\\Flame\\Cart\\CartItem\":9:{s:5:\"rowId\";s:32:\"237fe73223bc70979dd442367b4074e3\";s:2:\"id\";i:2;s:3:\"qty\";s:1:\"1\";s:4:\"name\";s:10:\"SCOTCH EGG\";s:5:\"price\";d:2;s:7:\"comment\";s:0:\"\";s:7:\"options\";O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:1:{i:2;O:33:\"Igniter\\Flame\\Cart\\CartItemOption\":3:{s:2:\"id\";i:2;s:4:\"name\";s:4:\"Size\";s:6:\"values\";O:39:\"Igniter\\Flame\\Cart\\CartItemOptionValues\":2:{s:8:\"\0*\0items\";a:1:{i:3;O:38:\"Igniter\\Flame\\Cart\\CartItemOptionValue\":4:{s:2:\"id\";i:3;s:4:\"name\";s:5:\"Small\";s:3:\"qty\";i:1;s:5:\"price\";d:0;}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}s:10:\"conditions\";O:37:\"Igniter\\Flame\\Cart\\CartItemConditions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}s:18:\"\0*\0associatedModel\";s:31:\"Igniter\\Cart\\Models\\Menus_model\";}s:32:\"62024d95e21619f10e0370990440ced1\";O:27:\"Igniter\\Flame\\Cart\\CartItem\":9:{s:5:\"rowId\";s:32:\"62024d95e21619f10e0370990440ced1\";s:2:\"id\";i:3;s:3:\"qty\";s:1:\"1\";s:4:\"name\";s:8:\"ATA RICE\";s:5:\"price\";d:12;s:7:\"comment\";s:0:\"\";s:7:\"options\";O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:1:{i:3;O:33:\"Igniter\\Flame\\Cart\\CartItemOption\":3:{s:2:\"id\";i:3;s:4:\"name\";s:5:\"Sides\";s:6:\"values\";O:39:\"Igniter\\Flame\\Cart\\CartItemOptionValues\":2:{s:8:\"\0*\0items\";a:1:{i:6;O:38:\"Igniter\\Flame\\Cart\\CartItemOptionValue\":4:{s:2:\"id\";i:6;s:4:\"name\";s:4:\"Fish\";s:3:\"qty\";i:1;s:5:\"price\";d:4.95;}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}s:10:\"conditions\";O:37:\"Igniter\\Flame\\Cart\\CartItemConditions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}s:18:\"\0*\0associatedModel\";s:31:\"Igniter\\Cart\\Models\\Menus_model\";}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',2,'','cod','collection','2025-01-20 09:03:13','2025-01-20 09:03:43','09:18:00','2025-01-20',18.9500,3,'10.10.1.254','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',NULL,NULL,'INV-2025-00','2025-01-20 09:03:13','3e3077cd4a69bc7ecbf6f7cbf7e227f7',1,'2025-01-20 09:03:43',NULL,1,NULL),(6,NULL,'Chief','Admin','example@gmail.com','12345678',1,3,'O:30:\"Igniter\\Flame\\Cart\\CartContent\":2:{s:8:\"\0*\0items\";a:2:{s:32:\"9e44f977dc38f3f6e78a5475d7f34c17\";O:27:\"Igniter\\Flame\\Cart\\CartItem\":9:{s:5:\"rowId\";s:32:\"9e44f977dc38f3f6e78a5475d7f34c17\";s:2:\"id\";i:4;s:3:\"qty\";s:1:\"1\";s:4:\"name\";s:13:\"RICE AND DODO\";s:5:\"price\";d:11.99;s:7:\"comment\";s:0:\"\";s:7:\"options\";O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:2:{i:5;O:33:\"Igniter\\Flame\\Cart\\CartItemOption\":3:{s:2:\"id\";i:5;s:4:\"name\";s:5:\"Sides\";s:6:\"values\";O:39:\"Igniter\\Flame\\Cart\\CartItemOptionValues\":2:{s:8:\"\0*\0items\";a:1:{i:12;O:38:\"Igniter\\Flame\\Cart\\CartItemOptionValue\":4:{s:2:\"id\";i:12;s:4:\"name\";s:4:\"Beef\";s:3:\"qty\";i:1;s:5:\"price\";d:6.95;}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}}i:6;O:33:\"Igniter\\Flame\\Cart\\CartItemOption\":3:{s:2:\"id\";i:6;s:4:\"name\";s:4:\"Size\";s:6:\"values\";O:39:\"Igniter\\Flame\\Cart\\CartItemOptionValues\":2:{s:8:\"\0*\0items\";a:1:{i:13;O:38:\"Igniter\\Flame\\Cart\\CartItemOptionValue\":4:{s:2:\"id\";i:13;s:4:\"name\";s:5:\"Small\";s:3:\"qty\";i:1;s:5:\"price\";d:0;}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}s:10:\"conditions\";O:37:\"Igniter\\Flame\\Cart\\CartItemConditions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}s:18:\"\0*\0associatedModel\";s:31:\"Igniter\\Cart\\Models\\Menus_model\";}s:32:\"8a48aa7c8e5202841ddaf767bb4d10da\";O:27:\"Igniter\\Flame\\Cart\\CartItem\":9:{s:5:\"rowId\";s:32:\"8a48aa7c8e5202841ddaf767bb4d10da\";s:2:\"id\";i:6;s:3:\"qty\";s:1:\"1\";s:4:\"name\";s:38:\"Whole catfish with rice and vegetables\";s:5:\"price\";d:13.99;s:7:\"comment\";N;s:7:\"options\";O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}s:10:\"conditions\";O:37:\"Igniter\\Flame\\Cart\\CartItemConditions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}s:18:\"\0*\0associatedModel\";s:31:\"Igniter\\Cart\\Models\\Menus_model\";}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',2,'','cod','table21','2025-01-25 19:31:56','2025-01-25 19:32:25','19:46:00','2025-01-25',32.9300,5,'10.10.1.254','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',NULL,NULL,'INV-2025-00','2025-01-25 19:31:57','0f327fff5fd35f07e3ec1b7cf74f96c9',1,'2025-01-25 19:32:25',NULL,1,NULL),(7,NULL,'Chief','Admin','example@gmail.com','12345678',1,5,'O:30:\"Igniter\\Flame\\Cart\\CartContent\":2:{s:8:\"\0*\0items\";a:2:{s:32:\"7fccf1b06696eb006aef6803db806971\";O:27:\"Igniter\\Flame\\Cart\\CartItem\":9:{s:5:\"rowId\";s:32:\"7fccf1b06696eb006aef6803db806971\";s:2:\"id\";i:5;s:3:\"qty\";s:1:\"1\";s:4:\"name\";s:21:\"Special Shrimp Deluxe\";s:5:\"price\";d:12.99;s:7:\"comment\";s:0:\"\";s:7:\"options\";O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:1:{i:7;O:33:\"Igniter\\Flame\\Cart\\CartItemOption\":3:{s:2:\"id\";i:7;s:4:\"name\";s:4:\"Size\";s:6:\"values\";O:39:\"Igniter\\Flame\\Cart\\CartItemOptionValues\":2:{s:8:\"\0*\0items\";a:1:{i:15;O:38:\"Igniter\\Flame\\Cart\\CartItemOptionValue\":4:{s:2:\"id\";i:15;s:4:\"name\";s:5:\"Small\";s:3:\"qty\";i:1;s:5:\"price\";d:0;}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}s:10:\"conditions\";O:37:\"Igniter\\Flame\\Cart\\CartItemConditions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}s:18:\"\0*\0associatedModel\";s:31:\"Igniter\\Cart\\Models\\Menus_model\";}s:32:\"c42f6beec9c93fd6afea6eb0684aa99a\";O:27:\"Igniter\\Flame\\Cart\\CartItem\":9:{s:5:\"rowId\";s:32:\"c42f6beec9c93fd6afea6eb0684aa99a\";s:2:\"id\";i:9;s:3:\"qty\";s:1:\"1\";s:4:\"name\";s:11:\"Salad Cesar\";s:5:\"price\";d:11.99;s:7:\"comment\";N;s:7:\"options\";O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}s:10:\"conditions\";O:37:\"Igniter\\Flame\\Cart\\CartItemConditions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}s:18:\"\0*\0associatedModel\";s:31:\"Igniter\\Cart\\Models\\Menus_model\";}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',2,'','cod','delivery','2025-01-25 19:46:23','2025-01-25 19:53:39','20:01:00','2025-01-25',24.9800,5,'10.10.1.254','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',NULL,NULL,'INV-2025-00','2025-01-25 19:46:53','e9589cf775e7ab3988736ae7c44abcef',1,'2025-01-25 19:53:39',NULL,1,NULL),(8,NULL,'Chief','Admin','example@gmail.com','12345678',1,6,'O:30:\"Igniter\\Flame\\Cart\\CartContent\":2:{s:8:\"\0*\0items\";a:2:{s:32:\"1b3baf2be454f6a60334642034a579a1\";O:27:\"Igniter\\Flame\\Cart\\CartItem\":9:{s:5:\"rowId\";s:32:\"1b3baf2be454f6a60334642034a579a1\";s:2:\"id\";i:4;s:3:\"qty\";s:1:\"1\";s:4:\"name\";s:13:\"RICE AND DODO\";s:5:\"price\";d:11.99;s:7:\"comment\";s:0:\"\";s:7:\"options\";O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:2:{i:5;O:33:\"Igniter\\Flame\\Cart\\CartItemOption\":3:{s:2:\"id\";i:5;s:4:\"name\";s:5:\"Sides\";s:6:\"values\";O:39:\"Igniter\\Flame\\Cart\\CartItemOptionValues\":2:{s:8:\"\0*\0items\";a:1:{i:12;O:38:\"Igniter\\Flame\\Cart\\CartItemOptionValue\":4:{s:2:\"id\";i:12;s:4:\"name\";s:4:\"Beef\";s:3:\"qty\";i:1;s:5:\"price\";d:6.95;}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}}i:6;O:33:\"Igniter\\Flame\\Cart\\CartItemOption\":3:{s:2:\"id\";i:6;s:4:\"name\";s:4:\"Size\";s:6:\"values\";O:39:\"Igniter\\Flame\\Cart\\CartItemOptionValues\":2:{s:8:\"\0*\0items\";a:1:{i:14;O:38:\"Igniter\\Flame\\Cart\\CartItemOptionValue\":4:{s:2:\"id\";i:14;s:4:\"name\";s:5:\"Large\";s:3:\"qty\";i:1;s:5:\"price\";d:5;}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}s:10:\"conditions\";O:37:\"Igniter\\Flame\\Cart\\CartItemConditions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}s:18:\"\0*\0associatedModel\";s:31:\"Igniter\\Cart\\Models\\Menus_model\";}s:32:\"808821852042d8780b9f862c35c42c68\";O:27:\"Igniter\\Flame\\Cart\\CartItem\":9:{s:5:\"rowId\";s:32:\"808821852042d8780b9f862c35c42c68\";s:2:\"id\";i:7;s:3:\"qty\";s:1:\"1\";s:4:\"name\";s:12:\"Simple Salad\";s:5:\"price\";d:8.99;s:7:\"comment\";N;s:7:\"options\";O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}s:10:\"conditions\";O:37:\"Igniter\\Flame\\Cart\\CartItemConditions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}s:18:\"\0*\0associatedModel\";s:31:\"Igniter\\Cart\\Models\\Menus_model\";}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',2,'','cod','table 55','2025-01-25 19:48:37','2025-01-25 19:53:36','20:03:00','2025-01-25',32.9300,5,'10.10.1.254','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',NULL,NULL,'INV-2025-00','2025-01-25 19:48:37','2859c751aa31ee4be724ecd47c0820f6',1,'2025-01-25 19:53:36',NULL,1,NULL),(9,NULL,'Chief','Admin','example@gmail.com','12345678',1,7,'O:30:\"Igniter\\Flame\\Cart\\CartContent\":2:{s:8:\"\0*\0items\";a:2:{s:32:\"c42f6beec9c93fd6afea6eb0684aa99a\";O:27:\"Igniter\\Flame\\Cart\\CartItem\":9:{s:5:\"rowId\";s:32:\"c42f6beec9c93fd6afea6eb0684aa99a\";s:2:\"id\";i:9;s:3:\"qty\";s:1:\"1\";s:4:\"name\";s:11:\"Salad Cesar\";s:5:\"price\";d:11.99;s:7:\"comment\";N;s:7:\"options\";O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}s:10:\"conditions\";O:37:\"Igniter\\Flame\\Cart\\CartItemConditions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}s:18:\"\0*\0associatedModel\";s:31:\"Igniter\\Cart\\Models\\Menus_model\";}s:32:\"620d670d95f0419e35f9182695918c68\";O:27:\"Igniter\\Flame\\Cart\\CartItem\":9:{s:5:\"rowId\";s:32:\"620d670d95f0419e35f9182695918c68\";s:2:\"id\";i:11;s:3:\"qty\";s:1:\"1\";s:4:\"name\";s:12:\"YAM PORRIDGE\";s:5:\"price\";d:9.99;s:7:\"comment\";N;s:7:\"options\";O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}s:10:\"conditions\";O:37:\"Igniter\\Flame\\Cart\\CartItemConditions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}s:18:\"\0*\0associatedModel\";s:31:\"Igniter\\Cart\\Models\\Menus_model\";}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',2,'','cod','table 55','2025-01-25 20:57:46','2025-01-25 20:58:03','21:12:00','2025-01-25',21.9800,5,'10.10.1.254','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',NULL,NULL,'INV-2025-00','2025-01-25 20:57:46','cb097dc16189726db9ab0fe42ef9fe40',1,'2025-01-25 20:58:03',NULL,1,NULL),(10,NULL,'Chief','Admin','example@gmail.com','12345678',1,8,'O:30:\"Igniter\\Flame\\Cart\\CartContent\":2:{s:8:\"\0*\0items\";a:1:{s:32:\"c42f6beec9c93fd6afea6eb0684aa99a\";O:27:\"Igniter\\Flame\\Cart\\CartItem\":9:{s:5:\"rowId\";s:32:\"c42f6beec9c93fd6afea6eb0684aa99a\";s:2:\"id\";i:9;s:3:\"qty\";s:1:\"1\";s:4:\"name\";s:11:\"Salad Cesar\";s:5:\"price\";d:11.99;s:7:\"comment\";N;s:7:\"options\";O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}s:10:\"conditions\";O:37:\"Igniter\\Flame\\Cart\\CartItemConditions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}s:18:\"\0*\0associatedModel\";s:31:\"Igniter\\Cart\\Models\\Menus_model\";}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',1,'','cod','table41','2025-01-26 18:28:55','2025-01-26 18:30:08','18:43:00','2025-01-26',11.9900,5,'10.10.1.254','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',NULL,NULL,'INV-2025-00','2025-01-26 18:28:55','53c845415a244f68473af75297da0948',1,'2025-01-26 18:30:08',NULL,1,NULL),(11,NULL,'Chief','Admin','example@gmail.com','12345678',1,9,'O:30:\"Igniter\\Flame\\Cart\\CartContent\":2:{s:8:\"\0*\0items\";a:2:{s:32:\"53007edfabb34013485e0466552fdd70\";O:27:\"Igniter\\Flame\\Cart\\CartItem\":9:{s:5:\"rowId\";s:32:\"53007edfabb34013485e0466552fdd70\";s:2:\"id\";i:2;s:3:\"qty\";s:1:\"1\";s:4:\"name\";s:10:\"SCOTCH EGG\";s:5:\"price\";d:2;s:7:\"comment\";s:0:\"\";s:7:\"options\";O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:1:{i:2;O:33:\"Igniter\\Flame\\Cart\\CartItemOption\":3:{s:2:\"id\";i:2;s:4:\"name\";s:4:\"Size\";s:6:\"values\";O:39:\"Igniter\\Flame\\Cart\\CartItemOptionValues\":2:{s:8:\"\0*\0items\";a:1:{i:4;O:38:\"Igniter\\Flame\\Cart\\CartItemOptionValue\":4:{s:2:\"id\";i:4;s:4:\"name\";s:5:\"Large\";s:3:\"qty\";i:1;s:5:\"price\";d:5;}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}s:10:\"conditions\";O:37:\"Igniter\\Flame\\Cart\\CartItemConditions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}s:18:\"\0*\0associatedModel\";s:31:\"Igniter\\Cart\\Models\\Menus_model\";}s:32:\"c42f6beec9c93fd6afea6eb0684aa99a\";O:27:\"Igniter\\Flame\\Cart\\CartItem\":9:{s:5:\"rowId\";s:32:\"c42f6beec9c93fd6afea6eb0684aa99a\";s:2:\"id\";i:9;s:3:\"qty\";s:1:\"1\";s:4:\"name\";s:11:\"Salad Cesar\";s:5:\"price\";d:11.99;s:7:\"comment\";N;s:7:\"options\";O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}s:10:\"conditions\";O:37:\"Igniter\\Flame\\Cart\\CartItemConditions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}s:18:\"\0*\0associatedModel\";s:31:\"Igniter\\Cart\\Models\\Menus_model\";}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',2,'','cod','table41','2025-02-03 10:51:46','2025-02-03 11:01:29','11:06:00','2025-02-03',18.9900,3,'10.10.1.254','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',1,1,'INV-2025-00','2025-02-03 10:51:46','29dd4f0897b147b8e0116e7069f96654',1,'2025-02-03 10:52:49','2025-02-03 11:01:29',1,NULL),(17,NULL,'Chief','Admin','example@gmail.com','12345678',1,15,'O:30:\"Igniter\\Flame\\Cart\\CartContent\":2:{s:8:\"\0*\0items\";a:2:{s:32:\"e15ca48720441b01923f00d8069c274c\";O:27:\"Igniter\\Flame\\Cart\\CartItem\":9:{s:5:\"rowId\";s:32:\"e15ca48720441b01923f00d8069c274c\";s:2:\"id\";i:3;s:3:\"qty\";s:1:\"1\";s:4:\"name\";s:8:\"ATA RICE\";s:5:\"price\";d:12;s:7:\"comment\";s:0:\"\";s:7:\"options\";O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:2:{i:3;O:33:\"Igniter\\Flame\\Cart\\CartItemOption\":3:{s:2:\"id\";i:3;s:4:\"name\";s:5:\"Sides\";s:6:\"values\";O:39:\"Igniter\\Flame\\Cart\\CartItemOptionValues\":2:{s:8:\"\0*\0items\";a:1:{i:7;O:38:\"Igniter\\Flame\\Cart\\CartItemOptionValue\":4:{s:2:\"id\";i:7;s:4:\"name\";s:4:\"Beef\";s:3:\"qty\";i:1;s:5:\"price\";d:6.95;}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}}i:4;O:33:\"Igniter\\Flame\\Cart\\CartItemOption\":3:{s:2:\"id\";i:4;s:4:\"name\";s:4:\"Size\";s:6:\"values\";O:39:\"Igniter\\Flame\\Cart\\CartItemOptionValues\":2:{s:8:\"\0*\0items\";a:1:{i:9;O:38:\"Igniter\\Flame\\Cart\\CartItemOptionValue\":4:{s:2:\"id\";i:9;s:4:\"name\";s:5:\"Large\";s:3:\"qty\";i:1;s:5:\"price\";d:5;}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}s:10:\"conditions\";O:37:\"Igniter\\Flame\\Cart\\CartItemConditions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}s:18:\"\0*\0associatedModel\";s:31:\"Igniter\\Cart\\Models\\Menus_model\";}s:32:\"18d6934483b994fb9943b43b7d7646bf\";O:27:\"Igniter\\Flame\\Cart\\CartItem\":9:{s:5:\"rowId\";s:32:\"18d6934483b994fb9943b43b7d7646bf\";s:2:\"id\";i:8;s:3:\"qty\";s:1:\"1\";s:4:\"name\";s:13:\"Seafood Salad\";s:5:\"price\";d:5.99;s:7:\"comment\";N;s:7:\"options\";O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}s:10:\"conditions\";O:37:\"Igniter\\Flame\\Cart\\CartItemConditions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}s:18:\"\0*\0associatedModel\";s:31:\"Igniter\\Cart\\Models\\Menus_model\";}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}',2,'','cod','table40','2025-02-07 12:59:33','2025-02-07 13:00:25','13:14:00','2025-02-07',29.9400,5,'10.10.1.254','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',NULL,NULL,'INV-2025-00','2025-02-07 12:59:33','41594f53eb8c1b7bad13ac69375cb245',1,'2025-02-07 13:00:25',NULL,1,NULL);
/*!40000 ALTER TABLE `ti_orders` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ti_pages`
--

DROP TABLE IF EXISTS `ti_pages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_pages` (
  `page_id` bigint unsigned NOT NULL,
  `language_id` bigint unsigned NOT NULL,
  `title` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `content` mediumtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `meta_description` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `meta_keywords` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `status` tinyint(1) NOT NULL,
  `permalink_slug` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `layout` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `metadata` mediumtext COLLATE utf8mb4_unicode_ci,
  `priority` int DEFAULT NULL,
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
INSERT INTO `ti_pages` VALUES (1,1,'About Us','Lorem ipsum dolor sit amet, consectetur adipiscing elit.','','','2024-12-31 19:17:37','2024-12-31 19:17:37',1,'about-us','static','{\"navigation\":\"0\"}',NULL),(2,1,'Policy','Lorem ipsum dolor sit amet, consectetur adipiscing elit.','','','2024-12-31 19:17:37','2024-12-31 19:17:37',1,'policy','static','{\"navigation\":\"0\"}',NULL),(3,1,'Terms and Conditions','Lorem ipsum dolor sit amet, consectetur adipiscing elit.','','','2024-12-31 19:17:37','2024-12-31 19:17:37',1,'terms-and-conditions','static','{\"navigation\":\"0\"}',NULL);
/*!40000 ALTER TABLE `ti_pages` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ti_payment_logs`
--

DROP TABLE IF EXISTS `ti_payment_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_payment_logs` (
  `payment_log_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `order_id` int NOT NULL,
  `payment_name` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `message` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `request` text COLLATE utf8mb4_unicode_ci,
  `response` text COLLATE utf8mb4_unicode_ci,
  `is_success` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `payment_code` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_refundable` tinyint(1) NOT NULL DEFAULT '0',
  `refunded_at` datetime DEFAULT NULL,
  PRIMARY KEY (`payment_log_id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ti_payment_logs`
--

LOCK TABLES `ti_payment_logs` WRITE;
/*!40000 ALTER TABLE `ti_payment_logs` DISABLE KEYS */;
INSERT INTO `ti_payment_logs` VALUES (1,7,'Stripe Payment','Payment error -> Missing payment intent identifier in session.','{\"_token\":\"tOGMWCSNJs5ogtUenrPzuaiRudCdS7bkOOiuKqbK\",\"first_name\":\"Chief\",\"last_name\":\"Admin\",\"email\":\"example@gmail.com\",\"telephone\":\"12345678\",\"address_id\":\"0\",\"address\":{\"address_id\":\"\",\"address_1\":\"Null\",\"address_2\":\"Null\",\"city\":\"Null\",\"state\":\"Null\",\"postcode\":\"Null\",\"country_id\":\"81\"},\"payment\":\"stripe\",\"stripe_payment_method\":\"\",\"stripe_idempotency_key\":\"67953f8cb0ece1.88029591\",\"comment\":\"\",\"delivery_comment\":\"\",\"cancelPage\":\"checkout\\/checkout\",\"successPage\":\"checkout\\/success\"}','[]',0,'2025-01-25 19:46:24','2025-01-25 19:46:24','stripe',0,NULL),(2,7,'PayPal Express','Payment error -> You do not have permissions to make this API call','{\"amount\":\"24.98\",\"transactionId\":7,\"currency\":\"EUR\",\"cancelUrl\":\"http:\\/\\/197.140.11.160:8012\\/ti_payregister\\/paypal_cancel_url\\/e9589cf775e7ab3988736ae7c44abcef?redirect=checkout\\/checkout\",\"returnUrl\":\"http:\\/\\/197.140.11.160:8012\\/ti_payregister\\/paypal_return_url\\/e9589cf775e7ab3988736ae7c44abcef?redirect=checkout\\/success&cancel=checkout\\/checkout\"}','{\"TIMESTAMP\":\"2025-01-25T19:46:47Z\",\"CORRELATIONID\":\"a13dc6b314727\",\"ACK\":\"Failure\",\"VERSION\":\"119.0\",\"BUILD\":\"58807128\",\"L_ERRORCODE0\":\"10002\",\"L_SHORTMESSAGE0\":\"Authentication\\/Authorization Failed\",\"L_LONGMESSAGE0\":\"You do not have permissions to make this API call\",\"L_SEVERITYCODE0\":\"Error\"}',0,'2025-01-25 19:46:47','2025-01-25 19:46:47','paypalexpress',0,NULL),(3,7,'PayPal Express','Payment error -> You do not have permissions to make this API call','{\"amount\":\"24.98\",\"transactionId\":7,\"currency\":\"EUR\",\"cancelUrl\":\"http:\\/\\/197.140.11.160:8012\\/ti_payregister\\/paypal_cancel_url\\/e9589cf775e7ab3988736ae7c44abcef?redirect=checkout\\/checkout\",\"returnUrl\":\"http:\\/\\/197.140.11.160:8012\\/ti_payregister\\/paypal_return_url\\/e9589cf775e7ab3988736ae7c44abcef?redirect=checkout\\/success&cancel=checkout\\/checkout\"}','[]',0,'2025-01-25 19:46:47','2025-01-25 19:46:47','paypalexpress',0,NULL),(4,7,'PayPal Express','Payment error -> You do not have permissions to make this API call','{\"amount\":\"24.98\",\"transactionId\":7,\"currency\":\"EUR\",\"cancelUrl\":\"http:\\/\\/197.140.11.160:8012\\/ti_payregister\\/paypal_cancel_url\\/e9589cf775e7ab3988736ae7c44abcef?redirect=checkout\\/checkout\",\"returnUrl\":\"http:\\/\\/197.140.11.160:8012\\/ti_payregister\\/paypal_return_url\\/e9589cf775e7ab3988736ae7c44abcef?redirect=checkout\\/success&cancel=checkout\\/checkout\"}','{\"TIMESTAMP\":\"2025-01-25T19:46:47Z\",\"CORRELATIONID\":\"446297678e52b\",\"ACK\":\"Failure\",\"VERSION\":\"119.0\",\"BUILD\":\"58807128\",\"L_ERRORCODE0\":\"10002\",\"L_SHORTMESSAGE0\":\"Authentication\\/Authorization Failed\",\"L_LONGMESSAGE0\":\"You do not have permissions to make this API call\",\"L_SEVERITYCODE0\":\"Error\"}',0,'2025-01-25 19:46:47','2025-01-25 19:46:47','paypalexpress',0,NULL),(5,7,'PayPal Express','Payment error -> You do not have permissions to make this API call','{\"amount\":\"24.98\",\"transactionId\":7,\"currency\":\"EUR\",\"cancelUrl\":\"http:\\/\\/197.140.11.160:8012\\/ti_payregister\\/paypal_cancel_url\\/e9589cf775e7ab3988736ae7c44abcef?redirect=checkout\\/checkout\",\"returnUrl\":\"http:\\/\\/197.140.11.160:8012\\/ti_payregister\\/paypal_return_url\\/e9589cf775e7ab3988736ae7c44abcef?redirect=checkout\\/success&cancel=checkout\\/checkout\"}','[]',0,'2025-01-25 19:46:47','2025-01-25 19:46:47','paypalexpress',0,NULL);
/*!40000 ALTER TABLE `ti_payment_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ti_payment_profiles`
--

DROP TABLE IF EXISTS `ti_payment_profiles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_payment_profiles` (
  `payment_profile_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `customer_id` int unsigned DEFAULT NULL,
  `payment_id` int unsigned DEFAULT NULL,
  `card_brand` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `card_last4` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `profile_data` text COLLATE utf8mb4_unicode_ci,
  `is_primary` tinyint(1) NOT NULL DEFAULT '0',
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
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_payments` (
  `payment_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `class_name` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `data` json DEFAULT NULL,
  `status` tinyint(1) NOT NULL DEFAULT '0',
  `is_default` tinyint(1) NOT NULL DEFAULT '0',
  `priority` int NOT NULL DEFAULT '0',
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
INSERT INTO `ti_payments` VALUES (1,'Cash On Delivery','cod','Igniter\\PayRegister\\Payments\\Cod','Accept cash on delivery during checkout','{\"order_fee\": \"0.00\", \"order_total\": \"0.00\", \"order_status\": \"1\", \"order_fee_type\": \"1\"}',1,1,1,'2024-12-31 19:17:38','2025-01-25 21:00:49'),(2,'PayPal Express','paypalexpress','Igniter\\PayRegister\\Payments\\PaypalExpress','Allows your customers to make payment using PayPal','{\"api_mode\": \"sandbox\", \"api_pass\": \"\", \"api_user\": \"\", \"order_fee\": \"0.00\", \"api_action\": \"sale\", \"order_total\": \"0.00\", \"order_status\": \"1\", \"api_signature\": \"\", \"order_fee_type\": \"1\", \"api_sandbox_pass\": \"\", \"api_sandbox_user\": \"\", \"api_sandbox_signature\": \"\"}',1,0,2,'2024-12-31 19:17:38','2025-01-25 21:00:42'),(3,'Authorize.Net (AIM)','authorizenetaim','Igniter\\PayRegister\\Payments\\AuthorizeNetAim','Accept credit card payments though Authorize.Net','{\"order_fee\": 0, \"client_key\": \"\", \"order_total\": \"0.00\", \"api_login_id\": \"\", \"order_status\": \"1\", \"accepted_cards\": [\"visa\", \"mastercard\", \"american_express\", \"jcb\", \"diners_club\"], \"order_fee_type\": \"1\", \"transaction_key\": \"\", \"transaction_mode\": \"test\", \"transaction_type\": \"auth_capture\"}',1,0,3,'2024-12-31 19:17:38','2025-01-20 08:56:23'),(4,'Stripe Payment','stripe','Igniter\\PayRegister\\Payments\\Stripe','Accept credit card payments using Stripe','{\"order_fee\": \"0.00\", \"locale_code\": \"\", \"order_total\": \"0.00\", \"order_status\": \"1\", \"order_fee_type\": \"1\", \"live_secret_key\": \"\", \"test_secret_key\": \"\", \"transaction_mode\": \"test\", \"transaction_type\": \"auth_capture\", \"live_webhook_secret\": \"\", \"test_webhook_secret\": \"\", \"live_publishable_key\": \"\", \"test_publishable_key\": \"\"}',1,0,4,'2024-12-31 19:17:38','2025-01-20 08:56:31'),(5,'Mollie Payment','mollie','Igniter\\PayRegister\\Payments\\Mollie','Accept credit card payments using Mollie API',NULL,0,0,5,'2024-12-31 19:17:38','2024-12-31 19:17:38'),(6,'Square Payment','square','Igniter\\PayRegister\\Payments\\Square','Accept credit card payments using Square',NULL,0,0,6,'2024-12-31 19:17:38','2024-12-31 19:17:38');
/*!40000 ALTER TABLE `ti_payments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ti_qr_code`
--

DROP TABLE IF EXISTS `ti_qr_code`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_qr_code` (
  `id` int NOT NULL AUTO_INCREMENT,
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
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_request_logs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `url` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status_code` int DEFAULT NULL,
  `referrer` text COLLATE utf8mb4_unicode_ci,
  `count` int NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=99 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ti_request_logs`
--

LOCK TABLES `ti_request_logs` WRITE;
/*!40000 ALTER TABLE `ti_request_logs` DISABLE KEYS */;
INSERT INTO `ti_request_logs` VALUES (1,'http://197.140.11.160:8004/admin*',404,NULL,1,'2025-01-04 13:51:39','2025-01-04 13:51:39'),(2,'http://197.140.11.160:8004/HNAP1',404,'[\"http:\\/\\/197.140.11.160:8004\\/\"]',1,'2025-01-08 22:00:58','2025-01-08 22:00:58'),(3,'http://197.140.11.160:8004/hudson/script',404,'[\"http:\\/\\/197.140.11.160:8004\\/\"]',1,'2025-01-08 22:01:00','2025-01-08 22:01:00'),(4,'http://197.140.11.160:8004/script',404,'[\"http:\\/\\/197.140.11.160:8004\\/\"]',1,'2025-01-08 22:01:01','2025-01-08 22:01:01'),(5,'http://197.140.11.160:8004/sqlite/main.php',404,'[\"http:\\/\\/197.140.11.160:8004\\/\"]',3,'2025-01-08 22:01:02','2025-01-08 22:01:04'),(6,'http://197.140.11.160:8004/sqlitemanager/main.php',404,'[\"http:\\/\\/197.140.11.160:8004\\/\"]',2,'2025-01-08 22:01:02','2025-01-08 22:01:03'),(7,'http://197.140.11.160:8004/main.php',404,'[\"http:\\/\\/197.140.11.160:8004\\/\"]',1,'2025-01-08 22:01:05','2025-01-08 22:01:05'),(8,'http://197.140.11.160:8004/test/sqlite/SQLiteManager-1.2.0/SQLiteManager-1.2.0/main.php',404,'[\"http:\\/\\/197.140.11.160:8004\\/\"]',1,'2025-01-08 22:01:08','2025-01-08 22:01:08'),(9,'http://197.140.11.160:8004/SQLiteManager-1.2.4/main.php',404,'[\"http:\\/\\/197.140.11.160:8004\\/\"]',1,'2025-01-08 22:01:11','2025-01-08 22:01:11'),(10,'http://197.140.11.160:8004/agSearch/SQlite/main.php',404,'[\"http:\\/\\/197.140.11.160:8004\\/\"]',1,'2025-01-08 22:01:12','2025-01-08 22:01:12'),(11,'http://197.140.11.160:8004/phpmyadmin',404,'[\"http:\\/\\/197.140.11.160:8004\\/\"]',2,'2025-01-08 22:01:13','2025-01-08 22:01:17'),(12,'http://197.140.11.160:8004/PMA',404,'[\"http:\\/\\/197.140.11.160:8004\\/\"]',2,'2025-01-08 22:01:18','2025-01-08 22:01:20'),(13,'http://197.140.11.160:8004/dbadmin',404,'[\"http:\\/\\/197.140.11.160:8004\\/\"]',1,'2025-01-08 22:01:22','2025-01-08 22:01:22'),(14,'http://197.140.11.160:8004/mysql',404,'[\"http:\\/\\/197.140.11.160:8004\\/\"]',1,'2025-01-08 22:01:24','2025-01-08 22:01:24'),(15,'http://197.140.11.160:8004/myadmin',404,'[\"http:\\/\\/197.140.11.160:8004\\/\"]',1,'2025-01-08 22:01:25','2025-01-08 22:01:25'),(16,'http://197.140.11.160:8004/openserver/phpmyadmin',404,'[\"http:\\/\\/197.140.11.160:8004\\/\"]',1,'2025-01-08 22:01:27','2025-01-08 22:01:27'),(17,'http://197.140.11.160:8004/phpmyadmin2',404,'[\"http:\\/\\/197.140.11.160:8004\\/\"]',2,'2025-01-08 22:01:28','2025-01-08 22:01:28'),(18,'http://197.140.11.160:8004/phpMyAdmin-2',404,'[\"http:\\/\\/197.140.11.160:8004\\/\"]',1,'2025-01-08 22:01:29','2025-01-08 22:01:29'),(19,'http://197.140.11.160:8004/php-my-admin',404,'[\"http:\\/\\/197.140.11.160:8004\\/\"]',1,'2025-01-08 22:01:29','2025-01-08 22:01:29'),(20,'http://197.140.11.160:8004/phpMyAdmin-2.2.3',404,'[\"http:\\/\\/197.140.11.160:8004\\/\"]',1,'2025-01-08 22:01:30','2025-01-08 22:01:30'),(21,'http://197.140.11.160:8004/phpMyAdmin-2.2.6',404,'[\"http:\\/\\/197.140.11.160:8004\\/\"]',1,'2025-01-08 22:01:30','2025-01-08 22:01:30'),(22,'http://197.140.11.160:8004/phpMyAdmin-2.5.1',404,'[\"http:\\/\\/197.140.11.160:8004\\/\"]',1,'2025-01-08 22:01:31','2025-01-08 22:01:31'),(23,'http://197.140.11.160:8004/phpMyAdmin-2.5.4',404,'[\"http:\\/\\/197.140.11.160:8004\\/\"]',1,'2025-01-08 22:01:31','2025-01-08 22:01:31'),(24,'http://197.140.11.160:8004/phpMyAdmin-2.5.5-rc1',404,'[\"http:\\/\\/197.140.11.160:8004\\/\"]',1,'2025-01-08 22:01:32','2025-01-08 22:01:32'),(25,'http://197.140.11.160:8004/phpMyAdmin-2.5.5-rc2',404,'[\"http:\\/\\/197.140.11.160:8004\\/\"]',1,'2025-01-08 22:01:33','2025-01-08 22:01:33'),(26,'http://197.140.11.160:8004/phpMyAdmin-2.5.5',404,'[\"http:\\/\\/197.140.11.160:8004\\/\"]',1,'2025-01-08 22:01:33','2025-01-08 22:01:33'),(27,'http://197.140.11.160:8004/phpMyAdmin-2.5.5-pl1',404,'[\"http:\\/\\/197.140.11.160:8004\\/\"]',1,'2025-01-08 22:01:34','2025-01-08 22:01:34'),(28,'http://197.140.11.160:8004/phpMyAdmin-2.5.6-rc1',404,'[\"http:\\/\\/197.140.11.160:8004\\/\"]',1,'2025-01-08 22:01:35','2025-01-08 22:01:35'),(29,'http://197.140.11.160:8004/phpMyAdmin-2.5.6-rc2',404,'[\"http:\\/\\/197.140.11.160:8004\\/\"]',1,'2025-01-08 22:01:36','2025-01-08 22:01:36'),(30,'http://197.140.11.160:8004/phpMyAdmin-2.5.6',404,'[\"http:\\/\\/197.140.11.160:8004\\/\"]',1,'2025-01-08 22:01:36','2025-01-08 22:01:36'),(31,'http://197.140.11.160:8004/phpMyAdmin-2.5.7',404,'[\"http:\\/\\/197.140.11.160:8004\\/\"]',1,'2025-01-08 22:01:37','2025-01-08 22:01:37'),(32,'http://197.140.11.160:8004/phpMyAdmin-2.5.7-pl1',404,'[\"http:\\/\\/197.140.11.160:8004\\/\"]',1,'2025-01-08 22:01:37','2025-01-08 22:01:37'),(33,'http://197.140.11.160:8004/phpMyAdmin-2.6.0-alpha',404,'[\"http:\\/\\/197.140.11.160:8004\\/\"]',1,'2025-01-08 22:01:38','2025-01-08 22:01:38'),(34,'http://197.140.11.160:8004/phpMyAdmin-2.6.0-alpha2',404,'[\"http:\\/\\/197.140.11.160:8004\\/\"]',1,'2025-01-08 22:01:38','2025-01-08 22:01:38'),(35,'http://197.140.11.160:8004/phpMyAdmin-2.6.0-beta1',404,'[\"http:\\/\\/197.140.11.160:8004\\/\"]',1,'2025-01-08 22:01:39','2025-01-08 22:01:39'),(36,'http://197.140.11.160:8004/phpMyAdmin-2.6.0-beta2',404,'[\"http:\\/\\/197.140.11.160:8004\\/\"]',1,'2025-01-08 22:01:39','2025-01-08 22:01:39'),(37,'http://197.140.11.160:8004/phpMyAdmin-2.6.0-rc1',404,'[\"http:\\/\\/197.140.11.160:8004\\/\"]',1,'2025-01-08 22:01:39','2025-01-08 22:01:39'),(38,'http://197.140.11.160:8004/phpMyAdmin-2.6.0-rc2',404,'[\"http:\\/\\/197.140.11.160:8004\\/\"]',1,'2025-01-08 22:01:40','2025-01-08 22:01:40'),(39,'http://197.140.11.160:8004/phpMyAdmin-2.6.0-rc3',404,'[\"http:\\/\\/197.140.11.160:8004\\/\"]',1,'2025-01-08 22:01:40','2025-01-08 22:01:40'),(40,'http://197.140.11.160:8004/phpMyAdmin-2.6.0',404,'[\"http:\\/\\/197.140.11.160:8004\\/\"]',1,'2025-01-08 22:01:41','2025-01-08 22:01:41'),(41,'http://197.140.11.160:8004/phpMyAdmin-2.6.0-pl1',404,'[\"http:\\/\\/197.140.11.160:8004\\/\"]',1,'2025-01-08 22:01:41','2025-01-08 22:01:41'),(42,'http://197.140.11.160:8004/phpMyAdmin-2.6.0-pl2',404,'[\"http:\\/\\/197.140.11.160:8004\\/\"]',1,'2025-01-08 22:01:42','2025-01-08 22:01:42'),(43,'http://197.140.11.160:8004/phpMyAdmin-2.6.0-pl3',404,'[\"http:\\/\\/197.140.11.160:8004\\/\"]',1,'2025-01-08 22:01:43','2025-01-08 22:01:43'),(44,'http://197.140.11.160:8004/phpMyAdmin-2.6.1-rc1',404,'[\"http:\\/\\/197.140.11.160:8004\\/\"]',1,'2025-01-08 22:01:44','2025-01-08 22:01:44'),(45,'http://197.140.11.160:8004/phpMyAdmin-2.6.1-rc2',404,'[\"http:\\/\\/197.140.11.160:8004\\/\"]',1,'2025-01-08 22:01:46','2025-01-08 22:01:46'),(46,'http://197.140.11.160:8004/phpMyAdmin-2.6.1',404,'[\"http:\\/\\/197.140.11.160:8004\\/\"]',1,'2025-01-08 22:01:47','2025-01-08 22:01:47'),(47,'http://197.140.11.160:8004/phpMyAdmin-2.6.1-pl1',404,'[\"http:\\/\\/197.140.11.160:8004\\/\"]',1,'2025-01-08 22:01:48','2025-01-08 22:01:48'),(48,'http://197.140.11.160:8004/phpMyAdmin-2.6.1-pl2',404,'[\"http:\\/\\/197.140.11.160:8004\\/\"]',1,'2025-01-08 22:01:49','2025-01-08 22:01:49'),(49,'http://197.140.11.160:8004/phpMyAdmin-2.6.1-pl3',404,'[\"http:\\/\\/197.140.11.160:8004\\/\"]',1,'2025-01-08 22:01:49','2025-01-08 22:01:49'),(50,'http://197.140.11.160:8004/phpMyAdmin-2.6.2-rc1',404,'[\"http:\\/\\/197.140.11.160:8004\\/\"]',2,'2025-01-08 22:01:50','2025-01-08 22:01:51'),(51,'http://197.140.11.160:8004/phpMyAdmin-2.6.2-beta1',404,'[\"http:\\/\\/197.140.11.160:8004\\/\"]',1,'2025-01-08 22:01:50','2025-01-08 22:01:50'),(52,'http://197.140.11.160:8004/phpMyAdmin-2.6.2',404,'[\"http:\\/\\/197.140.11.160:8004\\/\"]',1,'2025-01-08 22:01:52','2025-01-08 22:01:52'),(53,'http://197.140.11.160:8004/phpMyAdmin-2.6.2-pl1',404,'[\"http:\\/\\/197.140.11.160:8004\\/\"]',1,'2025-01-08 22:01:54','2025-01-08 22:01:54'),(54,'http://197.140.11.160:8004/phpMyAdmin-2.6.3',404,'[\"http:\\/\\/197.140.11.160:8004\\/\"]',2,'2025-01-08 22:01:55','2025-01-08 22:01:57'),(55,'http://197.140.11.160:8004/phpMyAdmin-2.6.3-rc1',404,'[\"http:\\/\\/197.140.11.160:8004\\/\"]',1,'2025-01-08 22:01:57','2025-01-08 22:01:57'),(56,'http://197.140.11.160:8004/phpMyAdmin-2.6.3-pl1',404,'[\"http:\\/\\/197.140.11.160:8004\\/\"]',1,'2025-01-08 22:01:58','2025-01-08 22:01:58'),(57,'http://197.140.11.160:8004/phpMyAdmin-2.6.4-rc1',404,'[\"http:\\/\\/197.140.11.160:8004\\/\"]',1,'2025-01-08 22:01:58','2025-01-08 22:01:58'),(58,'http://197.140.11.160:8004/phpMyAdmin-2.6.4-pl1',404,'[\"http:\\/\\/197.140.11.160:8004\\/\"]',1,'2025-01-08 22:01:58','2025-01-08 22:01:58'),(59,'http://197.140.11.160:8004/phpMyAdmin-2.6.4-pl2',404,'[\"http:\\/\\/197.140.11.160:8004\\/\"]',1,'2025-01-08 22:01:59','2025-01-08 22:01:59'),(60,'http://197.140.11.160:8004/phpMyAdmin-2.6.4-pl3',404,'[\"http:\\/\\/197.140.11.160:8004\\/\"]',1,'2025-01-08 22:01:59','2025-01-08 22:01:59'),(61,'http://197.140.11.160:8004/phpMyAdmin-2.6.4-pl4',404,'[\"http:\\/\\/197.140.11.160:8004\\/\"]',1,'2025-01-08 22:02:00','2025-01-08 22:02:00'),(62,'http://197.140.11.160:8004/phpMyAdmin-2.6.4',404,'[\"http:\\/\\/197.140.11.160:8004\\/\"]',1,'2025-01-08 22:02:01','2025-01-08 22:02:01'),(63,'http://197.140.11.160:8004/phpMyAdmin-2.7.0-beta1',404,'[\"http:\\/\\/197.140.11.160:8004\\/\"]',1,'2025-01-08 22:02:02','2025-01-08 22:02:02'),(64,'http://197.140.11.160:8004/phpMyAdmin-2.7.0-rc1',404,'[\"http:\\/\\/197.140.11.160:8004\\/\"]',1,'2025-01-08 22:02:03','2025-01-08 22:02:03'),(65,'http://197.140.11.160:8004/phpMyAdmin-2.7.0-pl1',404,'[\"http:\\/\\/197.140.11.160:8004\\/\"]',1,'2025-01-08 22:02:03','2025-01-08 22:02:03'),(66,'http://197.140.11.160:8004/phpMyAdmin-2.7.0-pl2',404,'[\"http:\\/\\/197.140.11.160:8004\\/\"]',1,'2025-01-08 22:02:04','2025-01-08 22:02:04'),(67,'http://197.140.11.160:8004/phpMyAdmin-2.7.0',404,'[\"http:\\/\\/197.140.11.160:8004\\/\"]',1,'2025-01-08 22:02:05','2025-01-08 22:02:05'),(68,'http://197.140.11.160:8004/phpMyAdmin-2.8.0-beta1',404,'[\"http:\\/\\/197.140.11.160:8004\\/\"]',1,'2025-01-08 22:02:05','2025-01-08 22:02:05'),(69,'http://197.140.11.160:8004/phpMyAdmin-2.8.0-rc1',404,'[\"http:\\/\\/197.140.11.160:8004\\/\"]',1,'2025-01-08 22:02:06','2025-01-08 22:02:06'),(70,'http://197.140.11.160:8004/phpMyAdmin-2.8.0-rc2',404,'[\"http:\\/\\/197.140.11.160:8004\\/\"]',1,'2025-01-08 22:02:07','2025-01-08 22:02:07'),(71,'http://197.140.11.160:8004/phpMyAdmin-2.8.0',404,'[\"http:\\/\\/197.140.11.160:8004\\/\"]',1,'2025-01-08 22:02:08','2025-01-08 22:02:08'),(72,'http://197.140.11.160:8004/phpMyAdmin-2.8.0.1',404,'[\"http:\\/\\/197.140.11.160:8004\\/\"]',1,'2025-01-08 22:02:09','2025-01-08 22:02:09'),(73,'http://197.140.11.160:8004/phpMyAdmin-2.8.0.2',404,'[\"http:\\/\\/197.140.11.160:8004\\/\"]',1,'2025-01-08 22:02:09','2025-01-08 22:02:09'),(74,'http://197.140.11.160:8004/phpMyAdmin-2.8.0.3',404,'[\"http:\\/\\/197.140.11.160:8004\\/\"]',1,'2025-01-08 22:02:10','2025-01-08 22:02:10'),(75,'http://197.140.11.160:8004/phpMyAdmin-2.8.0.4',404,'[\"http:\\/\\/197.140.11.160:8004\\/\"]',1,'2025-01-08 22:02:10','2025-01-08 22:02:10'),(76,'http://197.140.11.160:8004/phpMyAdmin-2.8.1-rc1',404,'[\"http:\\/\\/197.140.11.160:8004\\/\"]',1,'2025-01-08 22:02:11','2025-01-08 22:02:11'),(77,'http://197.140.11.160:8004/phpMyAdmin-2.8.1',404,'[\"http:\\/\\/197.140.11.160:8004\\/\"]',1,'2025-01-08 22:02:12','2025-01-08 22:02:12'),(78,'http://197.140.11.160:8004/phpMyAdmin-2.8.2',404,'[\"http:\\/\\/197.140.11.160:8004\\/\"]',1,'2025-01-08 22:02:12','2025-01-08 22:02:12'),(79,'http://197.140.11.160:8004/sqlmanager',404,'[\"http:\\/\\/197.140.11.160:8004\\/\"]',1,'2025-01-08 22:02:13','2025-01-08 22:02:13'),(80,'http://197.140.11.160:8004/mysqlmanager',404,'[\"http:\\/\\/197.140.11.160:8004\\/\"]',1,'2025-01-08 22:02:14','2025-01-08 22:02:14'),(81,'http://197.140.11.160:8004/p/m/a',404,'[\"http:\\/\\/197.140.11.160:8004\\/\"]',1,'2025-01-08 22:02:15','2025-01-08 22:02:15'),(82,'http://197.140.11.160:8004/PMA2005',404,'[\"http:\\/\\/197.140.11.160:8004\\/\"]',2,'2025-01-08 22:02:16','2025-01-08 22:02:16'),(83,'http://197.140.11.160:8004/phpmanager',404,'[\"http:\\/\\/197.140.11.160:8004\\/\"]',1,'2025-01-08 22:02:16','2025-01-08 22:02:16'),(84,'http://197.140.11.160:8004/php-myadmin',404,'[\"http:\\/\\/197.140.11.160:8004\\/\"]',1,'2025-01-08 22:02:17','2025-01-08 22:02:17'),(85,'http://197.140.11.160:8004/phpmy-admin',404,'[\"http:\\/\\/197.140.11.160:8004\\/\"]',1,'2025-01-08 22:02:18','2025-01-08 22:02:18'),(86,'http://197.140.11.160:8004/webadmin',404,'[\"http:\\/\\/197.140.11.160:8004\\/\"]',1,'2025-01-08 22:02:19','2025-01-08 22:02:19'),(87,'http://197.140.11.160:8004/sqlweb',404,'[\"http:\\/\\/197.140.11.160:8004\\/\"]',1,'2025-01-08 22:02:20','2025-01-08 22:02:20'),(88,'http://197.140.11.160:8004/websql',404,'[\"http:\\/\\/197.140.11.160:8004\\/\"]',1,'2025-01-08 22:02:22','2025-01-08 22:02:22'),(89,'http://197.140.11.160:8004/webdb',404,'[\"http:\\/\\/197.140.11.160:8004\\/\"]',1,'2025-01-08 22:02:25','2025-01-08 22:02:25'),(90,'http://197.140.11.160:8004/mysqladmin',404,'[\"http:\\/\\/197.140.11.160:8004\\/\"]',1,'2025-01-08 22:02:28','2025-01-08 22:02:28'),(91,'http://197.140.11.160:8004/mysql-admin',404,'[\"http:\\/\\/197.140.11.160:8004\\/\"]',1,'2025-01-08 22:02:30','2025-01-08 22:02:30'),(92,'http://197.140.11.160:8012/default/menu?date=2025-01-22&guest=8&location=1&picker_step=2&qr=ms15XHzHzL&time=20%3A42',404,NULL,2,'2025-01-22 21:31:37','2025-01-22 21:31:45'),(93,'http://197.140.11.160:8012/default/menu',404,NULL,2,'2025-01-22 21:31:52','2025-01-22 21:31:56'),(94,'http://197.140.11.160:8012/default/menu?date=2025-01-22&guest=8&location=2&picker_step=2&qr=ms20X45LRn&time=17%3A16',404,NULL,1,'2025-01-23 12:00:44','2025-01-23 12:00:44'),(95,'http://197.140.11.160:8012/default/menu?date=2025-01-22&guest=8&location=2&picker_step=2&time=17%3A16',404,NULL,2,'2025-01-23 12:01:01','2025-01-23 12:01:32'),(96,'http://197.140.11.160:8012/panel',404,NULL,1,'2025-01-26 14:34:57','2025-01-26 14:34:57'),(97,'http://197.140.11.160:8012/197.140.11.160:8012/checkout?action=unset_session',404,'[\"http:\\/\\/197.140.11.160:8012\\/checkout\"]',3,'2025-01-26 15:27:43','2025-01-26 15:49:56'),(98,'http://197.140.11.160:8012/taste.zip',404,NULL,1,'2025-02-03 14:25:31','2025-02-03 14:25:31');
/*!40000 ALTER TABLE `ti_request_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ti_reservation_tables`
--

DROP TABLE IF EXISTS `ti_reservation_tables`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_reservation_tables` (
  `reservation_id` int unsigned NOT NULL,
  `table_id` int unsigned NOT NULL,
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
INSERT INTO `ti_reservation_tables` VALUES (1,6),(2,1),(3,2);
/*!40000 ALTER TABLE `ti_reservation_tables` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ti_reservations`
--

DROP TABLE IF EXISTS `ti_reservations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_reservations` (
  `reservation_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `location_id` int NOT NULL,
  `table_id` int NOT NULL,
  `guest_num` int NOT NULL,
  `occasion_id` int DEFAULT NULL,
  `customer_id` int DEFAULT NULL,
  `first_name` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `last_name` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(96) COLLATE utf8mb4_unicode_ci NOT NULL,
  `telephone` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `comment` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `reserve_time` time NOT NULL,
  `reserve_date` date NOT NULL,
  `created_at` date NOT NULL,
  `updated_at` date NOT NULL,
  `assignee_id` int DEFAULT NULL,
  `assignee_group_id` int unsigned DEFAULT NULL,
  `notify` tinyint(1) DEFAULT NULL,
  `ip_address` varchar(40) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_agent` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status_id` tinyint(1) NOT NULL,
  `hash` varchar(40) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `duration` int DEFAULT NULL,
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
INSERT INTO `ti_reservations` VALUES (1,1,0,2,NULL,1,'oussama','douba','douba.oussama69@gmail.com','+57671409293','','19:00:00','2025-01-16','2025-01-04','2025-01-04',NULL,NULL,NULL,'10.10.1.254','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',6,'7861f98884984b8118f5be48cf36de0b',0,NULL,'2025-01-04 13:55:34',NULL),(2,1,0,6,NULL,NULL,'oussama','douba','douba.oussama69@gmail.com','+57671409293','','00:00:00','2025-01-09','2025-01-06','2025-01-06',NULL,NULL,NULL,'10.10.1.254','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',6,'c0a243eeecc97c9a618fe4f2af647702',0,NULL,'2025-01-06 10:25:11',NULL),(3,1,0,3,NULL,NULL,'oussama','douba','Oussama@hpcmicrosystems.net','+57671409293','','01:00:00','2025-01-16','2025-01-06','2025-01-06',NULL,NULL,NULL,'10.10.1.254','Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36',8,'77920fe4d5953d0eae0afd2f352c1d2b',0,NULL,'2025-01-06 11:02:10',NULL);
/*!40000 ALTER TABLE `ti_reservations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ti_sessions`
--

DROP TABLE IF EXISTS `ti_sessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_sessions` (
  `id` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `payload` text COLLATE utf8mb4_unicode_ci,
  `last_activity` int DEFAULT NULL,
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
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_settings` (
  `setting_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `sort` varchar(45) COLLATE utf8mb4_unicode_ci NOT NULL,
  `item` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `value` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `serialized` tinyint(1) DEFAULT NULL,
  PRIMARY KEY (`setting_id`),
  UNIQUE KEY `ti_settings_sort_item_unique` (`sort`,`item`)
) ENGINE=InnoDB AUTO_INCREMENT=119 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ti_settings`
--

LOCK TABLES `ti_settings` WRITE;
/*!40000 ALTER TABLE `ti_settings` DISABLE KEYS */;
INSERT INTO `ti_settings` VALUES (1,'prefs','default_location_id','1',NULL),(2,'config','site_logo','/2_vectorized.png',NULL),(3,'config','country_id','81',NULL),(4,'config','timezone','Europe/London',NULL),(5,'config','default_currency_code','6',NULL),(6,'config','default_language','en',NULL),(7,'config','detect_language','0',NULL),(9,'config','allow_registration','1',NULL),(10,'config','customer_group_id','1',NULL),(14,'config','maps_api_key','',NULL),(15,'config','distance_unit','mi',NULL),(16,'config','location_order','0',NULL),(17,'config','location_order_email','0',NULL),(18,'config','location_reserve_email','0',NULL),(19,'config','default_order_status','1',NULL),(22,'config','menus_page','local/menus',NULL),(23,'config','reservation_page','reservation/reservation',NULL),(24,'config','guest_order','1',NULL),(25,'config','default_reservation_status','8',NULL),(26,'config','confirmed_reservation_status','6',NULL),(27,'config','canceled_order_status','9',NULL),(28,'config','canceled_reservation_status','7',NULL),(30,'config','tax_mode','0',NULL),(31,'config','invoice_prefix','INV-{year}-00',NULL),(32,'config','protocol','log',NULL),(33,'config','smtp_host','smtp.mailgun.org',NULL),(34,'config','smtp_port','587',NULL),(35,'config','smtp_user','',NULL),(36,'config','smtp_pass','',NULL),(37,'config','log_threshold','1',NULL),(38,'config','permalink','1',NULL),(39,'config','maintenance_mode','0',NULL),(40,'config','maintenance_message','Site is under maintenance. Please check back later.',NULL),(41,'config','cache_mode','0',NULL),(42,'config','cache_time','0',NULL),(44,'prefs','ti_setup','installed',NULL),(45,'config','supported_languages.0','en',NULL),(46,'config','registration_email.0','customer',NULL),(47,'config','order_email.0','customer',NULL),(48,'config','order_email.1','admin',NULL),(49,'config','reservation_email.0','customer',NULL),(50,'config','reservation_email.1','admin',NULL),(51,'config','processing_order_status.0','2',NULL),(52,'config','processing_order_status.1','3',NULL),(53,'config','processing_order_status.2','4',NULL),(54,'config','completed_order_status.0','5',NULL),(55,'config','image_manager.max_size','300',NULL),(56,'config','image_manager.thumb_width','320',NULL),(57,'config','image_manager.thumb_height','220',NULL),(58,'config','image_manager.uploads','1',NULL),(59,'config','image_manager.new_folder','1',NULL),(60,'config','image_manager.copy','1',NULL),(61,'config','image_manager.move','1',NULL),(62,'config','image_manager.rename','1',NULL),(63,'config','image_manager.delete','1',NULL),(64,'config','image_manager.transliteration','0',NULL),(65,'config','image_manager.remember_days','7',NULL),(66,'config','site_name','PaymyDine',NULL),(67,'config','site_email','admin@domain.tld',NULL),(68,'config','sender_name','PaymyDine',NULL),(69,'config','sender_email','admin@domain.tld',NULL),(70,'prefs','ti_version','v3.7.7',NULL),(71,'config','installed_themes.demo','1',NULL),(72,'config','installed_themes.tastyigniter-orange','1',NULL),(73,'config','installed_themes.tastyigniter-typical','1',NULL),(74,'prefs','default_themes.main','tastyigniter-typical',NULL),(75,'config','currency_converter.api','openexchangerates',NULL),(76,'config','currency_converter.oer.apiKey','',NULL),(77,'config','currency_converter.fixerio.apiKey','',NULL),(78,'config','currency_converter.refreshInterval','24',NULL),(79,'config','enable_request_log','1',NULL),(80,'config','activity_log_timeout','60',NULL),(81,'prefs','carte_key','27c3ea38a42176411401c40d21a5989e154708c2',NULL),(82,'prefs','carte_info.id','7084',NULL),(83,'prefs','carte_info.owner','oussama douba',NULL),(84,'prefs','carte_info.name','Paymydine',NULL),(85,'prefs','carte_info.url','http://197.140.11.160:8004/',NULL),(86,'prefs','carte_info.email','douba.oussama69@gmail.com',NULL),(88,'prefs','carte_info.is_premium','0',NULL),(89,'prefs','carte_info.items_count','0',NULL),(90,'prefs','carte_info.updated_at','2025-01-02T20:32:52.000000Z',NULL),(91,'prefs','carte_info.created_at','2025-01-02T20:32:52.000000Z',NULL),(95,'prefs','allocator_is_enabled','1',NULL),(96,'config','default_geocoder','nominatim',NULL),(97,'prefs','admin_dashboardwidgets_default_dashboard.order_stats.widget','stats',NULL),(98,'prefs','admin_dashboardwidgets_default_dashboard.order_stats.priority','20',NULL),(99,'prefs','admin_dashboardwidgets_default_dashboard.order_stats.card','sale',NULL),(100,'prefs','admin_dashboardwidgets_default_dashboard.order_stats.width','4',NULL),(101,'prefs','admin_dashboardwidgets_default_dashboard.reservation_stats.widget','stats',NULL),(102,'prefs','admin_dashboardwidgets_default_dashboard.reservation_stats.priority','20',NULL),(103,'prefs','admin_dashboardwidgets_default_dashboard.reservation_stats.card','lost_sale',NULL),(104,'prefs','admin_dashboardwidgets_default_dashboard.reservation_stats.width','4',NULL),(105,'prefs','admin_dashboardwidgets_default_dashboard.customer_stats.widget','stats',NULL),(106,'prefs','admin_dashboardwidgets_default_dashboard.customer_stats.priority','20',NULL),(107,'prefs','admin_dashboardwidgets_default_dashboard.customer_stats.card','cash_payment',NULL),(108,'prefs','admin_dashboardwidgets_default_dashboard.customer_stats.width','4',NULL),(109,'prefs','admin_dashboardwidgets_default_dashboard.reports.widget','charts',NULL),(110,'prefs','admin_dashboardwidgets_default_dashboard.reports.priority','30',NULL),(111,'prefs','admin_dashboardwidgets_default_dashboard.reports.width','12',NULL),(112,'prefs','admin_dashboardwidgets_default_dashboard.recent-activities.widget','recent-activities',NULL),(113,'prefs','admin_dashboardwidgets_default_dashboard.recent-activities.priority','40',NULL),(114,'prefs','admin_dashboardwidgets_default_dashboard.recent-activities.width','6',NULL),(115,'prefs','admin_dashboardwidgets_default_dashboard.cache.priority','90',NULL),(116,'prefs','admin_dashboardwidgets_default_dashboard.cache.width','6',NULL),(117,'config','dashboard_logo','/1.png',NULL),(118,'config','loader_logo','/main.jpg',NULL);
/*!40000 ALTER TABLE `ti_settings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ti_staff_groups`
--

DROP TABLE IF EXISTS `ti_staff_groups`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_staff_groups` (
  `staff_group_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `staff_group_name` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `auto_assign` tinyint(1) DEFAULT '0',
  `auto_assign_mode` tinyint DEFAULT '1',
  `auto_assign_limit` int DEFAULT '20',
  `auto_assign_availability` tinyint(1) DEFAULT '1',
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
INSERT INTO `ti_staff_groups` VALUES (1,'Owners','Default group for owners',0,1,20,1,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(2,'Managers','Default group for managers',0,1,20,1,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(3,'Waiters','Default group for waiters.',0,1,20,1,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(4,'Delivery','Default group for delivery drivers.',0,1,20,1,'2024-12-31 17:34:40','2024-12-31 17:34:40'),(5,'test','',1,1,20,1,'2025-01-02 20:39:04','2025-01-02 20:39:04');
/*!40000 ALTER TABLE `ti_staff_groups` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ti_staff_roles`
--

DROP TABLE IF EXISTS `ti_staff_roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_staff_roles` (
  `staff_role_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `permissions` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`staff_role_id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ti_staff_roles`
--

LOCK TABLES `ti_staff_roles` WRITE;
/*!40000 ALTER TABLE `ti_staff_roles` DISABLE KEYS */;
INSERT INTO `ti_staff_roles` VALUES (1,'Owner','owner','Default role for restaurant owners','a:40:{s:15:\"Admin.Dashboard\";s:1:\"1\";s:15:\"Admin.Allergens\";s:1:\"1\";s:16:\"Admin.Categories\";s:1:\"1\";s:11:\"Admin.Menus\";s:1:\"1\";s:15:\"Admin.Mealtimes\";s:1:\"1\";s:15:\"Admin.Locations\";s:1:\"1\";s:12:\"Admin.Tables\";s:1:\"1\";s:12:\"Admin.Orders\";s:1:\"1\";s:18:\"Admin.DeleteOrders\";s:1:\"1\";s:18:\"Admin.AssignOrders\";s:1:\"1\";s:18:\"Admin.Reservations\";s:1:\"1\";s:24:\"Admin.DeleteReservations\";s:1:\"1\";s:24:\"Admin.AssignReservations\";s:1:\"1\";s:14:\"Admin.Payments\";s:1:\"1\";s:20:\"Admin.CustomerGroups\";s:1:\"1\";s:15:\"Admin.Customers\";s:1:\"1\";s:17:\"Admin.Impersonate\";s:1:\"1\";s:26:\"Admin.ImpersonateCustomers\";s:1:\"1\";s:17:\"Admin.StaffGroups\";s:1:\"1\";s:12:\"Admin.Staffs\";s:1:\"1\";s:14:\"Admin.Statuses\";s:1:\"1\";s:13:\"Admin.Coupons\";s:1:\"1\";s:18:\"Admin.MediaManager\";s:1:\"1\";s:11:\"Site.Themes\";s:1:\"1\";s:16:\"Admin.Activities\";s:1:\"1\";s:16:\"Admin.Extensions\";s:1:\"1\";s:19:\"Admin.MailTemplates\";s:1:\"1\";s:14:\"Site.Countries\";s:1:\"1\";s:15:\"Site.Currencies\";s:1:\"1\";s:14:\"Site.Languages\";s:1:\"1\";s:13:\"Site.Settings\";s:1:\"1\";s:12:\"Site.Updates\";s:1:\"1\";s:16:\"Admin.SystemLogs\";s:1:\"1\";s:25:\"Igniter.Automation.Manage\";s:1:\"1\";s:17:\"Module.CartModule\";s:1:\"1\";s:31:\"Igniter.FrontEnd.ManageSettings\";s:1:\"1\";s:30:\"Igniter.FrontEnd.ManageBanners\";s:1:\"1\";s:32:\"Igniter.FrontEnd.ManageSlideshow\";s:1:\"1\";s:13:\"Admin.Reviews\";s:1:\"1\";s:20:\"Igniter.Pages.Manage\";s:1:\"1\";}','2024-12-31 17:34:40','2025-01-05 20:59:03'),(2,'Manager','manager','Default role for restaurant managers.','a:16:{s:15:\"Admin.Dashboard\";s:1:\"1\";s:16:\"Admin.Categories\";s:1:\"1\";s:14:\"Admin.Statuses\";s:1:\"1\";s:12:\"Admin.Staffs\";s:1:\"1\";s:17:\"Admin.StaffGroups\";s:1:\"1\";s:15:\"Admin.Customers\";s:1:\"1\";s:20:\"Admin.CustomerGroups\";s:1:\"1\";s:14:\"Admin.Payments\";s:1:\"1\";s:18:\"Admin.Reservations\";s:1:\"1\";s:12:\"Admin.Orders\";s:1:\"1\";s:12:\"Admin.Tables\";s:1:\"1\";s:15:\"Admin.Locations\";s:1:\"1\";s:15:\"Admin.Mealtimes\";s:1:\"1\";s:11:\"Admin.Menus\";s:1:\"1\";s:11:\"Site.Themes\";s:1:\"1\";s:18:\"Admin.MediaManager\";s:1:\"1\";}','2024-12-31 17:34:40','2024-12-31 17:34:40'),(3,'Waiter','waiter','Default role for restaurant waiters.','a:4:{s:16:\"Admin.Categories\";s:1:\"1\";s:18:\"Admin.Reservations\";s:1:\"1\";s:12:\"Admin.Orders\";s:1:\"1\";s:11:\"Admin.Menus\";s:1:\"1\";}','2024-12-31 17:34:40','2024-12-31 17:34:40'),(4,'Delivery','delivery','Default role for restaurant delivery.','a:3:{s:14:\"Admin.Statuses\";s:1:\"1\";s:18:\"Admin.Reservations\";s:1:\"1\";s:12:\"Admin.Orders\";s:1:\"1\";}','2024-12-31 17:34:40','2024-12-31 17:34:40'),(5,'test','1234','','a:20:{s:15:\"Admin.Dashboard\";s:1:\"1\";s:15:\"Admin.Allergens\";s:1:\"1\";s:16:\"Admin.Categories\";s:1:\"1\";s:11:\"Admin.Menus\";s:1:\"1\";s:15:\"Admin.Mealtimes\";s:1:\"1\";s:15:\"Admin.Locations\";s:1:\"1\";s:12:\"Admin.Tables\";s:1:\"1\";s:12:\"Admin.Orders\";s:1:\"1\";s:18:\"Admin.DeleteOrders\";s:1:\"1\";s:18:\"Admin.AssignOrders\";s:1:\"1\";s:18:\"Admin.Reservations\";s:1:\"1\";s:24:\"Admin.DeleteReservations\";s:1:\"1\";s:24:\"Admin.AssignReservations\";s:1:\"1\";s:14:\"Admin.Payments\";s:1:\"1\";s:20:\"Admin.CustomerGroups\";s:1:\"1\";s:15:\"Admin.Customers\";s:1:\"1\";s:12:\"Admin.Staffs\";s:1:\"1\";s:14:\"Admin.Statuses\";s:1:\"1\";s:13:\"Admin.Coupons\";s:1:\"1\";s:13:\"Admin.Reviews\";s:1:\"1\";}','2025-01-02 20:38:43','2025-01-20 08:55:15');
/*!40000 ALTER TABLE `ti_staff_roles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ti_staffs`
--

DROP TABLE IF EXISTS `ti_staffs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_staffs` (
  `staff_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `staff_name` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `staff_email` varchar(96) COLLATE utf8mb4_unicode_ci NOT NULL,
  `staff_role_id` int NOT NULL,
  `language_id` int DEFAULT NULL,
  `created_at` date NOT NULL,
  `staff_status` tinyint(1) NOT NULL,
  `sale_permission` tinyint DEFAULT '1',
  `updated_at` timestamp NOT NULL,
  PRIMARY KEY (`staff_id`),
  UNIQUE KEY `staff_email` (`staff_email`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ti_staffs`
--

LOCK TABLES `ti_staffs` WRITE;
/*!40000 ALTER TABLE `ti_staffs` DISABLE KEYS */;
INSERT INTO `ti_staffs` VALUES (1,'Chef Admin','admin@admin.com',1,1,'2024-12-31',1,1,'2024-12-31 17:34:56'),(2,'Admin','admin@test.com',5,1,'2025-01-02',1,1,'2025-01-02 20:39:56');
/*!40000 ALTER TABLE `ti_staffs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ti_staffs_groups`
--

DROP TABLE IF EXISTS `ti_staffs_groups`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_staffs_groups` (
  `staff_id` int unsigned NOT NULL,
  `staff_group_id` int unsigned NOT NULL,
  PRIMARY KEY (`staff_id`,`staff_group_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ti_staffs_groups`
--

LOCK TABLES `ti_staffs_groups` WRITE;
/*!40000 ALTER TABLE `ti_staffs_groups` DISABLE KEYS */;
INSERT INTO `ti_staffs_groups` VALUES (1,1),(2,5);
/*!40000 ALTER TABLE `ti_staffs_groups` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ti_status_history`
--

DROP TABLE IF EXISTS `ti_status_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_status_history` (
  `status_history_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `object_id` int NOT NULL,
  `object_type` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `staff_id` int DEFAULT NULL,
  `status_id` int NOT NULL,
  `notify` tinyint(1) DEFAULT NULL,
  `comment` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `created_at` datetime NOT NULL,
  `updated_at` timestamp NOT NULL,
  PRIMARY KEY (`status_history_id`)
) ENGINE=InnoDB AUTO_INCREMENT=43 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ti_status_history`
--

LOCK TABLES `ti_status_history` WRITE;
/*!40000 ALTER TABLE `ti_status_history` DISABLE KEYS */;
INSERT INTO `ti_status_history` VALUES (1,1,'orders',NULL,1,0,'Your order has been received.','2025-01-02 18:04:24','2025-01-02 18:04:24'),(2,1,'orders',1,2,1,'Your order is pending','2025-01-02 18:05:07','2025-01-02 18:05:07'),(3,2,'orders',NULL,1,0,'Your order has been received.','2025-01-03 15:10:49','2025-01-03 15:10:49'),(4,2,'orders',2,3,1,'Your order is in the kitchen','2025-01-03 15:11:35','2025-01-03 15:11:35'),(5,2,'orders',2,5,0,'','2025-01-03 15:11:58','2025-01-03 15:11:58'),(6,1,'reservations',NULL,8,0,'Your table reservation is pending.','2025-01-04 13:54:56','2025-01-04 13:54:56'),(7,1,'reservations',1,6,0,'Your table reservation has been confirmed.','2025-01-04 13:55:34','2025-01-04 13:55:34'),(8,3,'orders',NULL,1,0,'Your order has been received.','2025-01-05 19:18:40','2025-01-05 19:18:40'),(9,3,'orders',1,2,1,'Your order is pending','2025-01-05 19:19:31','2025-01-05 19:19:31'),(10,3,'orders',1,3,1,'Your order is in the kitchen','2025-01-05 19:19:45','2025-01-05 19:19:45'),(11,3,'orders',1,5,0,'','2025-01-05 19:20:03','2025-01-05 19:20:03'),(12,2,'reservations',NULL,8,0,'Your table reservation is pending.','2025-01-06 10:24:42','2025-01-06 10:24:42'),(13,2,'reservations',2,6,0,'Your table reservation has been confirmed.','2025-01-06 10:25:11','2025-01-06 10:25:11'),(14,4,'orders',NULL,1,0,'Your order has been received.','2025-01-06 11:00:49','2025-01-06 11:00:49'),(15,3,'reservations',NULL,8,0,'Your table reservation is pending.','2025-01-06 11:02:10','2025-01-06 11:02:10'),(16,5,'orders',NULL,1,0,'Your order has been received.','2025-01-20 09:03:13','2025-01-20 09:03:13'),(17,5,'orders',NULL,3,1,'Your order is in the kitchen','2025-01-20 09:03:43','2025-01-20 09:03:43'),(18,6,'orders',NULL,1,0,'Your order has been received.','2025-01-25 19:31:56','2025-01-25 19:31:56'),(19,6,'orders',NULL,3,1,'Your order is in the kitchen','2025-01-25 19:32:15','2025-01-25 19:32:15'),(20,6,'orders',NULL,5,0,'','2025-01-25 19:32:25','2025-01-25 19:32:25'),(21,7,'orders',NULL,1,0,'Your order has been received.','2025-01-25 19:46:53','2025-01-25 19:46:53'),(22,8,'orders',NULL,1,0,'Your order has been received.','2025-01-25 19:48:37','2025-01-25 19:48:37'),(23,8,'orders',NULL,5,0,'','2025-01-25 19:53:36','2025-01-25 19:53:36'),(24,7,'orders',NULL,5,0,'','2025-01-25 19:53:39','2025-01-25 19:53:39'),(25,9,'orders',NULL,1,0,'Your order has been received.','2025-01-25 20:57:46','2025-01-25 20:57:46'),(26,9,'orders',NULL,5,0,'','2025-01-25 20:58:03','2025-01-25 20:58:03'),(27,10,'orders',NULL,1,0,'Your order has been received.','2025-01-26 18:28:55','2025-01-26 18:28:55'),(28,10,'orders',1,5,0,'','2025-01-26 18:30:08','2025-01-26 18:30:08'),(29,11,'orders',NULL,1,0,'Your order has been received.','2025-02-03 10:51:46','2025-02-03 10:51:46'),(30,11,'orders',NULL,3,1,'Your order is in the kitchen','2025-02-03 10:52:49','2025-02-03 10:52:49'),(31,12,'orders',NULL,1,0,'Your order has been received.','2025-02-07 11:30:27','2025-02-07 11:30:27'),(32,13,'orders',NULL,1,0,'Your order has been received.','2025-02-07 11:30:27','2025-02-07 11:30:27'),(33,14,'orders',NULL,1,0,'Your order has been received.','2025-02-07 11:30:30','2025-02-07 11:30:30'),(34,13,'orders',NULL,5,0,'','2025-02-07 11:30:46','2025-02-07 11:30:46'),(35,15,'orders',NULL,1,0,'Your order has been received.','2025-02-07 11:31:49','2025-02-07 11:31:49'),(36,15,'orders',1,3,1,'Your order is in the kitchen','2025-02-07 11:32:20','2025-02-07 11:32:20'),(37,15,'orders',1,1,1,'Your order has been received.','2025-02-07 11:32:35','2025-02-07 11:32:35'),(38,16,'orders',NULL,1,0,'Your order has been received.','2025-02-07 11:33:01','2025-02-07 11:33:01'),(39,16,'orders',1,5,0,'','2025-02-07 11:33:16','2025-02-07 11:33:16'),(40,17,'orders',NULL,1,0,'Your order has been received.','2025-02-07 12:59:33','2025-02-07 12:59:33'),(41,17,'orders',NULL,3,1,'Your order is in the kitchen','2025-02-07 13:00:17','2025-02-07 13:00:17'),(42,17,'orders',NULL,5,0,'','2025-02-07 13:00:25','2025-02-07 13:00:25');
/*!40000 ALTER TABLE `ti_status_history` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ti_statuses`
--

DROP TABLE IF EXISTS `ti_statuses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_statuses` (
  `status_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `status_name` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `status_comment` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `notify_customer` tinyint(1) DEFAULT NULL,
  `status_for` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `status_color` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`status_id`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ti_statuses`
--

LOCK TABLES `ti_statuses` WRITE;
/*!40000 ALTER TABLE `ti_statuses` DISABLE KEYS */;
INSERT INTO `ti_statuses` VALUES (1,'Received','Your order has been received.',1,'order','#686663','2024-12-31 17:34:40','2024-12-31 17:34:40'),(2,'Pending','Your order is pending',1,'order','#f0ad4e','2024-12-31 17:34:40','2024-12-31 17:34:40'),(3,'Preparation','Your order is in the kitchen',1,'order','#00c0ef','2024-12-31 17:34:40','2024-12-31 17:34:40'),(4,'Delivery','Your order will be with you shortly.',0,'order','#00a65a','2024-12-31 17:34:40','2024-12-31 17:34:40'),(5,'Completed','',0,'order','#00a65a','2024-12-31 17:34:40','2024-12-31 17:34:40'),(6,'Confirmed','Your table reservation has been confirmed.',0,'reserve','#00a65a','2024-12-31 17:34:40','2024-12-31 17:34:40'),(7,'Canceled','Your table reservation has been canceled.',0,'reserve','#dd4b39','2024-12-31 17:34:40','2024-12-31 17:34:40'),(8,'Pending','Your table reservation is pending.',0,'reserve','','2024-12-31 17:34:40','2024-12-31 17:34:40'),(9,'Canceled','',0,'order','#ea0b29','2024-12-31 17:34:40','2024-12-31 17:34:40');
/*!40000 ALTER TABLE `ti_statuses` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ti_stock_history`
--

DROP TABLE IF EXISTS `ti_stock_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_stock_history` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `stock_id` bigint unsigned NOT NULL,
  `staff_id` bigint unsigned DEFAULT NULL,
  `order_id` bigint unsigned DEFAULT NULL,
  `state` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `quantity` bigint NOT NULL,
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
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_stocks` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `location_id` bigint unsigned NOT NULL,
  `stockable_id` bigint unsigned NOT NULL,
  `stockable_type` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `quantity` bigint DEFAULT NULL,
  `low_stock_alert` tinyint(1) NOT NULL DEFAULT '0',
  `low_stock_threshold` int NOT NULL DEFAULT '0',
  `is_tracked` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `low_stock_alert_sent` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ti_stocks`
--

LOCK TABLES `ti_stocks` WRITE;
/*!40000 ALTER TABLE `ti_stocks` DISABLE KEYS */;
INSERT INTO `ti_stocks` VALUES (1,1,6,'menus',NULL,0,0,0,'2025-01-02 18:04:24','2025-01-02 18:04:24',0),(2,1,9,'menus',NULL,0,0,0,'2025-01-02 18:04:24','2025-01-02 18:04:24',0),(3,1,12,'menus',NULL,0,0,0,'2025-01-02 18:04:24','2025-01-02 18:04:24',0),(4,1,4,'menus',NULL,0,0,0,'2025-01-03 15:10:49','2025-01-03 15:10:49',0),(5,1,8,'menus',NULL,0,0,0,'2025-01-05 19:18:40','2025-01-05 19:18:40',0),(6,1,3,'menus',NULL,0,0,0,'2025-01-06 11:00:49','2025-01-06 11:00:49',0),(7,1,2,'menus',NULL,0,0,0,'2025-01-20 09:03:13','2025-01-20 09:03:13',0),(8,1,5,'menus',NULL,0,0,0,'2025-01-25 19:46:53','2025-01-25 19:46:53',0),(9,1,7,'menus',NULL,0,0,0,'2025-01-25 19:48:37','2025-01-25 19:48:37',0),(10,1,11,'menus',NULL,0,0,0,'2025-01-25 20:57:46','2025-01-25 20:57:46',0);
/*!40000 ALTER TABLE `ti_stocks` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ti_tables`
--

DROP TABLE IF EXISTS `ti_tables`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_tables` (
  `table_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `table_name` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `min_capacity` int NOT NULL,
  `max_capacity` int NOT NULL,
  `table_status` tinyint(1) NOT NULL,
  `extra_capacity` int NOT NULL DEFAULT '0',
  `is_joinable` tinyint(1) NOT NULL DEFAULT '1',
  `priority` int NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `qr_code` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`table_id`)
) ENGINE=InnoDB AUTO_INCREMENT=20 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ti_tables`
--

LOCK TABLES `ti_tables` WRITE;
/*!40000 ALTER TABLE `ti_tables` DISABLE KEYS */;
INSERT INTO `ti_tables` VALUES (1,'Table 1',5,6,1,0,1,0,'2024-12-31 17:34:40','2024-12-31 17:34:40',NULL),(2,'Table 2',3,6,1,0,1,0,'2024-12-31 17:34:40','2024-12-31 17:34:40',NULL),(3,'Table 3',4,11,1,0,1,0,'2024-12-31 17:34:40','2024-12-31 17:34:40',NULL),(4,'Table 4',5,7,1,0,1,0,'2024-12-31 17:34:40','2024-12-31 17:34:40',NULL),(5,'Table 5',5,7,1,0,1,0,'2024-12-31 17:34:40','2024-12-31 17:34:40',NULL),(6,'Table 6',2,11,1,0,1,0,'2024-12-31 17:34:40','2024-12-31 17:34:40',NULL),(7,'Table 7',2,8,1,0,1,0,'2024-12-31 17:34:40','2024-12-31 17:34:40',NULL),(8,'Table 8',3,9,1,0,1,0,'2024-12-31 17:34:40','2024-12-31 17:34:40',NULL),(9,'Table 9',4,7,1,0,1,0,'2024-12-31 17:34:40','2024-12-31 17:34:40',NULL),(10,'Table 10',4,11,1,0,1,0,'2024-12-31 17:34:40','2024-12-31 17:34:40',NULL),(11,'Table 11',2,10,1,0,1,0,'2024-12-31 17:34:40','2024-12-31 17:34:40',NULL),(12,'Table 12',5,12,1,0,1,0,'2024-12-31 17:34:40','2024-12-31 17:34:40',NULL),(13,'Table 13',4,6,1,0,1,0,'2024-12-31 17:34:40','2024-12-31 17:34:40',NULL),(14,'Table 14',5,11,1,0,1,0,'2024-12-31 17:34:40','2024-12-31 17:34:40',NULL),(15,'table21',2,8,1,2,1,1,'2025-01-22 20:42:14','2025-01-22 20:42:14','ms15XHzHzL'),(16,'table 55',2,10,1,4,1,2,'2025-01-25 19:47:55','2025-01-25 19:47:55','ms16mkrKM9'),(17,'Table 23',2,8,1,0,1,3,'2025-01-26 06:38:39','2025-01-26 06:38:39','ms17vG97Sn'),(18,'table40',2,10,1,4,1,4,'2025-01-26 13:50:22','2025-01-26 13:50:22','ms1805tLaV'),(19,'table41',2,10,1,4,1,5,'2025-01-26 13:58:58','2025-01-26 13:58:58','ms197xRVzp');
/*!40000 ALTER TABLE `ti_tables` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ti_themes`
--

DROP TABLE IF EXISTS `ti_themes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_themes` (
  `theme_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `version` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT '0.0.1',
  `data` json DEFAULT NULL,
  `status` tinyint(1) NOT NULL DEFAULT '0',
  `is_default` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`theme_id`),
  UNIQUE KEY `ti_themes_code_unique` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ti_themes`
--

LOCK TABLES `ti_themes` WRITE;
/*!40000 ALTER TABLE `ti_themes` DISABLE KEYS */;
INSERT INTO `ti_themes` VALUES (1,'Demo Theme','demo','Demonstration theme for TastyIgniter front-end','0.1.0',NULL,1,0,NULL,'2025-01-25 18:32:50'),(2,'Orange Theme','tastyigniter-orange','Free Modern, Responsive and Clean TastyIgniter Theme based on Bootstrap.','0.1.0',NULL,1,0,NULL,'2025-01-25 18:32:50'),(3,'Typical Theme','tastyigniter-typical','The Typical theme features a clean and modern design that is optimized for restaurants and food businesses.','0.1.0',NULL,1,0,NULL,'2025-01-25 18:32:50');
/*!40000 ALTER TABLE `ti_themes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ti_user_preferences`
--

DROP TABLE IF EXISTS `ti_user_preferences`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_user_preferences` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `item` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `value` text COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ti_user_preferences`
--

LOCK TABLES `ti_user_preferences` WRITE;
/*!40000 ALTER TABLE `ti_user_preferences` DISABLE KEYS */;
INSERT INTO `ti_user_preferences` VALUES (1,2,'admin_dashboardwidgets_dashboard','{\"order_stats\":{\"widget\":\"stats\",\"priority\":20,\"card\":\"sale\",\"width\":\"4\"},\"reservation_stats\":{\"widget\":\"stats\",\"priority\":20,\"card\":\"lost_sale\",\"width\":\"4\"},\"customer_stats\":{\"widget\":\"stats\",\"priority\":20,\"card\":\"cash_payment\",\"width\":\"4\"},\"reports\":{\"widget\":\"charts\",\"priority\":30,\"width\":\"12\"},\"recent-activities\":{\"widget\":\"recent-activities\",\"priority\":40,\"width\":\"6\"},\"cache\":{\"priority\":90,\"width\":\"6\"}}'),(2,1,'admin_dashboardwidgets_dashboard','{\"order_stats\":{\"widget\":\"stats\",\"priority\":20,\"card\":\"sale\",\"width\":\"4\"},\"reservation_stats\":{\"widget\":\"stats\",\"priority\":20,\"card\":\"lost_sale\",\"width\":\"4\"},\"customer_stats\":{\"widget\":\"stats\",\"priority\":20,\"card\":\"cash_payment\",\"width\":\"4\"},\"reports\":{\"widget\":\"charts\",\"priority\":30,\"width\":\"12\"},\"recent-activities\":{\"widget\":\"recent-activities\",\"priority\":40,\"width\":\"6\"},\"cache\":{\"priority\":90,\"width\":\"6\"}}');
/*!40000 ALTER TABLE `ti_user_preferences` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ti_users`
--

DROP TABLE IF EXISTS `ti_users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_users` (
  `user_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `staff_id` int NOT NULL,
  `username` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `super_user` tinyint(1) DEFAULT NULL,
  `reset_code` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `reset_time` datetime DEFAULT NULL,
  `activation_code` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `remember_token` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
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
-- Dumping data for table `ti_users`
--

LOCK TABLES `ti_users` WRITE;
/*!40000 ALTER TABLE `ti_users` DISABLE KEYS */;
INSERT INTO `ti_users` VALUES (1,1,'admin','$2y$10$RmucbFtnyqTRnwIjDbIQBOK.b4nmtLHM/UedVoOmCw0TGd3k9FFSq',1,NULL,NULL,NULL,'SdlC7RkjPuZ4N0qoJxgnonkmB1QK9TWbH52Vz7Rc3H',1,'2024-12-31 00:00:00','2025-02-07 20:17:07',NULL,NULL,NULL),(2,2,'user','$2y$10$sqyd64X3Vkxz7m2hPvSTDuCH72bYu6o03qcXZJqYM/7p.7oEaSypy',0,NULL,NULL,NULL,NULL,1,'2025-01-02 00:00:00','2025-02-07 20:16:08',NULL,NULL,NULL);
/*!40000 ALTER TABLE `ti_users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ti_websockets_statistics_entries`
--

DROP TABLE IF EXISTS `ti_websockets_statistics_entries`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_websockets_statistics_entries` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `app_id` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `peak_connection_count` int NOT NULL,
  `websocket_message_count` int NOT NULL,
  `api_message_count` int NOT NULL,
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
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_working_hours` (
  `location_id` int NOT NULL,
  `weekday` int NOT NULL,
  `opening_time` time NOT NULL DEFAULT '00:00:00',
  `closing_time` time NOT NULL DEFAULT '00:00:00',
  `status` tinyint(1) NOT NULL,
  `type` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  PRIMARY KEY (`id`),
  KEY `ti_working_hours_location_id_weekday_type_index` (`location_id`,`weekday`,`type`)
) ENGINE=InnoDB AUTO_INCREMENT=22 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ti_working_hours`
--

LOCK TABLES `ti_working_hours` WRITE;
/*!40000 ALTER TABLE `ti_working_hours` DISABLE KEYS */;
INSERT INTO `ti_working_hours` VALUES (1,0,'00:00:00','23:59:00',1,'opening',1),(1,1,'00:00:00','23:59:00',1,'opening',2),(1,2,'00:00:00','23:59:00',1,'opening',3),(1,3,'00:00:00','23:59:00',1,'opening',4),(1,4,'00:00:00','23:59:00',1,'opening',5),(1,5,'00:00:00','23:59:00',1,'opening',6),(1,6,'00:00:00','23:59:00',1,'opening',7),(1,0,'00:00:00','23:59:00',1,'delivery',8),(1,1,'00:00:00','23:59:00',1,'delivery',9),(1,2,'00:00:00','23:59:00',1,'delivery',10),(1,3,'00:00:00','23:59:00',1,'delivery',11),(1,4,'00:00:00','23:59:00',1,'delivery',12),(1,5,'00:00:00','23:59:00',1,'delivery',13),(1,6,'00:00:00','23:59:00',1,'delivery',14),(1,0,'00:00:00','23:59:00',1,'collection',15),(1,1,'00:00:00','23:59:00',1,'collection',16),(1,2,'00:00:00','23:59:00',1,'collection',17),(1,3,'00:00:00','23:59:00',1,'collection',18),(1,4,'00:00:00','23:59:00',1,'collection',19),(1,5,'00:00:00','23:59:00',1,'collection',20),(1,6,'00:00:00','23:59:00',1,'collection',21);
/*!40000 ALTER TABLE `ti_working_hours` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-02-07 20:18:37

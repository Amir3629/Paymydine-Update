-- MySQL dump 10.13  Distrib 9.4.0, for macos14.7 (arm64)
--
-- Host: localhost    Database: paymydine
-- ------------------------------------------------------
-- Server version	9.4.0

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
-- Table structure for table `ti_ti_notifications`
--

DROP TABLE IF EXISTS `ti_ti_notifications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ti_ti_notifications` (
  `notification_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint unsigned NOT NULL,
  `type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `message` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `table_id` bigint unsigned DEFAULT NULL,
  `table_name` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `payload` json DEFAULT NULL,
  `status` enum('new','seen','in_progress','resolved') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'new',
  `priority` enum('low','medium','high','urgent') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'medium',
  `seen_at` timestamp NULL DEFAULT NULL,
  `acted_by` bigint unsigned DEFAULT NULL,
  `acted_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`notification_id`),
  KEY `ti_ti_notifications_tenant_id_status_index` (`tenant_id`,`status`),
  KEY `ti_ti_notifications_tenant_id_created_at_index` (`tenant_id`,`created_at`),
  KEY `ti_ti_notifications_type_status_index` (`type`,`status`),
  KEY `ti_ti_notifications_table_id_index` (`table_id`),
  KEY `ti_ti_notifications_acted_by_index` (`acted_by`)
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ti_ti_notifications`
--

LOCK TABLES `ti_ti_notifications` WRITE;
/*!40000 ALTER TABLE `ti_ti_notifications` DISABLE KEYS */;
INSERT INTO `ti_ti_notifications` VALUES (1,1,'waiter_call','Waiter Call - Cashier','hh',34,'Cashier','{\"urgency\": \"medium\", \"customer_message\": \"hh\"}','new','medium',NULL,NULL,NULL,'2025-09-13 14:53:04','2025-09-13 14:53:04'),(2,1,'table_note','Table Note - Cashier','kgs',34,'Cashier','{\"note\": \"kgs\", \"timestamp\": \"2025-09-13T15:53:13.460Z\"}','new','low',NULL,NULL,NULL,'2025-09-13 14:53:13','2025-09-13 14:53:13'),(3,1,'waiter_call','Waiter Call - Cashier','asd',34,'Cashier','{\"urgency\": \"medium\", \"customer_message\": \"asd\"}','new','medium',NULL,NULL,NULL,'2025-09-13 21:56:50','2025-09-13 21:56:50'),(4,1,'table_note','Table Note - Cashier','asd',34,'Cashier','{\"note\": \"asd\", \"timestamp\": \"2025-09-13T22:56:56.560Z\"}','new','low',NULL,NULL,NULL,'2025-09-13 21:56:56','2025-09-13 21:56:56'),(5,1,'waiter_call','Waiter Call - Cashier','kj',34,'Cashier','{\"urgency\": \"medium\", \"customer_message\": \"kj\"}','new','medium',NULL,NULL,NULL,'2025-09-13 22:19:41','2025-09-13 22:19:41'),(6,1,'table_note','Table Note - Cashier','khb',34,'Cashier','{\"note\": \"khb\", \"timestamp\": \"2025-09-13T23:19:45.006Z\"}','new','low',NULL,NULL,NULL,'2025-09-13 22:19:45','2025-09-13 22:19:45'),(7,1,'waiter_call','Waiter Call - Cashier','j',34,'Cashier','{\"urgency\": \"medium\", \"customer_message\": \"j\"}','new','medium',NULL,NULL,NULL,'2025-09-13 22:20:57','2025-09-13 22:20:57'),(8,1,'waiter_call','Waiter Call - Table 01','jog',24,'Table 01','{\"urgency\": \"medium\", \"customer_message\": \"jog\"}','new','medium',NULL,NULL,NULL,'2025-09-13 22:47:44','2025-09-13 22:47:44'),(9,1,'table_note','Table Note - Table 01','hvjhg',24,'Table 01','{\"note\": \"hvjhg\", \"timestamp\": \"2025-09-13T23:47:56.561Z\"}','new','low',NULL,NULL,NULL,'2025-09-13 22:47:56','2025-09-13 22:47:56'),(10,1,'waiter_call','Waiter Call - Table 05','asd',26,'Table 05','{\"urgency\": \"medium\", \"customer_message\": \"asd\"}','new','medium',NULL,NULL,NULL,'2025-09-13 22:48:53','2025-09-13 22:48:53'),(11,1,'table_note','Table Note - Table 05','asd',26,'Table 05','{\"note\": \"asd\", \"timestamp\": \"2025-09-13T23:49:00.720Z\"}','new','low',NULL,NULL,NULL,'2025-09-13 22:49:00','2025-09-13 22:49:00'),(12,1,'waiter_call','Waiter Call - Cashier','jog',34,'Cashier','{\"urgency\": \"medium\", \"customer_message\": \"jog\"}','new','medium',NULL,NULL,NULL,'2025-09-13 23:09:55','2025-09-13 23:09:55'),(13,1,'table_note','Table Note - Table 05','mbvbv',26,'Table 05','{\"note\": \"mbvbv\", \"timestamp\": \"2025-09-14T00:10:08.607Z\"}','new','low',NULL,NULL,NULL,'2025-09-13 23:10:08','2025-09-13 23:10:08'),(14,1,'waiter_call','Waiter Call - Table 05','nbc',26,'Table 05','{\"urgency\": \"medium\", \"customer_message\": \"nbc\"}','new','medium',NULL,NULL,NULL,'2025-09-13 23:10:20','2025-09-13 23:10:20'),(15,1,'waiter_call','Waiter Call - Table 01','asd',24,'Table 01','{\"urgency\": \"medium\", \"customer_message\": \"asd\"}','new','medium',NULL,NULL,NULL,'2025-09-13 23:11:01','2025-09-13 23:11:01');
/*!40000 ALTER TABLE `ti_ti_notifications` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-09-15 20:26:12

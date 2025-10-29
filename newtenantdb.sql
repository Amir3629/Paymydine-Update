-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Hô: 127.0.0.1:3306
-- Gérée : mer. 19 mars 2025 à3:21
-- Version du serveur : 9.1.0
-- Version de PHP : 8.3.14

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de donné : `newtenantdb`
--

-- --------------------------------------------------------

--
-- Structure de la table `qr_code`
--

DROP TABLE IF EXISTS `qr_code`;
CREATE TABLE IF NOT EXISTS `qr_code` (
  `id` int NOT NULL AUTO_INCREMENT,
  `qr_code` varchar(30) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Structure de la table `ti_activities`
--

DROP TABLE IF EXISTS `ti_activities`;
CREATE TABLE IF NOT EXISTS `ti_activities` (
  `activity_id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` int DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `log_name` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `properties` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `subject_id` int DEFAULT NULL,
  `subject_type` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `causer_id` int DEFAULT NULL,
  `causer_type` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `updated_at` datetime NOT NULL,
  `type` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `read_at` datetime DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `user_type` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`activity_id`)
) ENGINE=InnoDB AUTO_INCREMENT=193 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Déargement des donné de la table `ti_activities`
--

INSERT INTO `ti_activities` (`activity_id`, `user_id`, `created_at`, `log_name`, `properties`, `subject_id`, `subject_type`, `causer_id`, `causer_type`, `updated_at`, `type`, `read_at`, `deleted_at`, `user_type`) VALUES
(1, 1, '2025-01-02 18:04:24', 'default', '{\"order_id\":1,\"full_name\":\"oussama douba\"}', 1, 'orders', NULL, NULL, '2025-02-27 10:25:53', 'orderCreated', '2025-02-27 10:25:53', NULL, 'users'),
(2, 1, '2025-01-03 15:10:50', 'default', '{\"order_id\":2,\"full_name\":\"oussama douba\"}', 2, 'orders', NULL, NULL, '2025-02-27 10:25:53', 'orderCreated', '2025-02-27 10:25:53', NULL, 'users'),
(3, 2, '2025-01-03 15:10:50', 'default', '{\"order_id\":2,\"full_name\":\"oussama douba\"}', 2, 'orders', NULL, NULL, '2025-01-03 15:10:50', 'orderCreated', NULL, NULL, 'users'),
(4, 1, '2025-01-04 13:54:57', 'default', '{\"reservation_id\":1,\"full_name\":\"oussama douba\"}', 1, 'reservations', NULL, NULL, '2025-02-27 10:25:53', 'reservationCreated', '2025-02-27 10:25:53', NULL, 'users'),
(5, 2, '2025-01-04 13:54:57', 'default', '{\"reservation_id\":1,\"full_name\":\"oussama douba\"}', 1, 'reservations', NULL, NULL, '2025-01-04 13:54:57', 'reservationCreated', NULL, NULL, 'users'),
(6, 1, '2025-01-04 20:52:53', 'default', '{\"customer_id\":1,\"full_name\":\"oussama douba\"}', 1, 'customers', 1, 'customers', '2025-02-27 10:25:53', 'customerRegistered', '2025-02-27 10:25:53', NULL, 'users'),
(7, 1, '2025-01-05 19:18:40', 'default', '{\"order_id\":3,\"full_name\":\"oussama douba\"}', 3, 'orders', 1, 'customers', '2025-02-27 10:25:53', 'orderCreated', '2025-02-27 10:25:53', NULL, 'users'),
(8, 2, '2025-01-05 19:18:40', 'default', '{\"order_id\":3,\"full_name\":\"oussama douba\"}', 3, 'orders', 1, 'customers', '2025-01-05 19:18:40', 'orderCreated', NULL, NULL, 'users'),
(9, 1, '2025-01-06 10:24:42', 'default', '{\"reservation_id\":2,\"full_name\":\"oussama douba\"}', 2, 'reservations', NULL, NULL, '2025-02-27 10:25:53', 'reservationCreated', '2025-02-27 10:25:53', NULL, 'users'),
(10, 2, '2025-01-06 10:24:42', 'default', '{\"reservation_id\":2,\"full_name\":\"oussama douba\"}', 2, 'reservations', NULL, NULL, '2025-01-06 10:24:42', 'reservationCreated', NULL, NULL, 'users'),
(11, 1, '2025-01-06 11:00:49', 'default', '{\"order_id\":4,\"full_name\":\"oussama douba\"}', 4, 'orders', NULL, NULL, '2025-02-27 10:25:53', 'orderCreated', '2025-02-27 10:25:53', NULL, 'users'),
(12, 2, '2025-01-06 11:00:49', 'default', '{\"order_id\":4,\"full_name\":\"oussama douba\"}', 4, 'orders', NULL, NULL, '2025-01-06 11:00:49', 'orderCreated', NULL, NULL, 'users'),
(13, 1, '2025-01-06 11:02:10', 'default', '{\"reservation_id\":3,\"full_name\":\"oussama douba\"}', 3, 'reservations', NULL, NULL, '2025-02-27 10:25:53', 'reservationCreated', '2025-02-27 10:25:53', NULL, 'users'),
(14, 2, '2025-01-06 11:02:10', 'default', '{\"reservation_id\":3,\"full_name\":\"oussama douba\"}', 3, 'reservations', NULL, NULL, '2025-01-06 11:02:10', 'reservationCreated', NULL, NULL, 'users'),
(15, 1, '2025-01-20 09:03:13', 'default', '{\"order_id\":5,\"full_name\":\"oussama douba\"}', 5, 'orders', NULL, NULL, '2025-02-27 10:25:53', 'orderCreated', '2025-02-27 10:25:53', NULL, 'users'),
(16, 2, '2025-01-20 09:03:13', 'default', '{\"order_id\":5,\"full_name\":\"oussama douba\"}', 5, 'orders', NULL, NULL, '2025-01-20 09:03:13', 'orderCreated', NULL, NULL, 'users'),
(17, 1, '2025-01-25 19:31:57', 'default', '{\"order_id\":6,\"full_name\":\"Chief Admin\"}', 6, 'orders', NULL, NULL, '2025-02-27 10:25:53', 'orderCreated', '2025-02-27 10:25:53', NULL, 'users'),
(18, 2, '2025-01-25 19:31:57', 'default', '{\"order_id\":6,\"full_name\":\"Chief Admin\"}', 6, 'orders', NULL, NULL, '2025-01-25 19:31:57', 'orderCreated', NULL, NULL, 'users'),
(19, 1, '2025-01-25 19:46:53', 'default', '{\"order_id\":7,\"full_name\":\"Chief Admin\"}', 7, 'orders', NULL, NULL, '2025-02-27 10:25:53', 'orderCreated', '2025-02-27 10:25:53', NULL, 'users'),
(20, 2, '2025-01-25 19:46:53', 'default', '{\"order_id\":7,\"full_name\":\"Chief Admin\"}', 7, 'orders', NULL, NULL, '2025-01-25 19:46:53', 'orderCreated', NULL, NULL, 'users'),
(21, 1, '2025-01-25 19:48:37', 'default', '{\"order_id\":8,\"full_name\":\"Chief Admin\"}', 8, 'orders', NULL, NULL, '2025-02-27 10:25:53', 'orderCreated', '2025-02-27 10:25:53', NULL, 'users'),
(22, 2, '2025-01-25 19:48:37', 'default', '{\"order_id\":8,\"full_name\":\"Chief Admin\"}', 8, 'orders', NULL, NULL, '2025-01-25 19:48:37', 'orderCreated', NULL, NULL, 'users'),
(23, 1, '2025-01-25 20:57:46', 'default', '{\"order_id\":9,\"full_name\":\"Chief Admin\"}', 9, 'orders', NULL, NULL, '2025-02-27 10:25:53', 'orderCreated', '2025-02-27 10:25:53', NULL, 'users'),
(24, 2, '2025-01-25 20:57:46', 'default', '{\"order_id\":9,\"full_name\":\"Chief Admin\"}', 9, 'orders', NULL, NULL, '2025-01-25 20:57:46', 'orderCreated', NULL, NULL, 'users'),
(25, 1, '2025-01-26 18:28:55', 'default', '{\"order_id\":10,\"full_name\":\"Chief Admin\"}', 10, 'orders', NULL, NULL, '2025-02-27 10:25:53', 'orderCreated', '2025-02-27 10:25:53', NULL, 'users'),
(26, 2, '2025-01-26 18:28:55', 'default', '{\"order_id\":10,\"full_name\":\"Chief Admin\"}', 10, 'orders', NULL, NULL, '2025-01-26 18:28:55', 'orderCreated', NULL, NULL, 'users'),
(27, 1, '2025-02-03 10:51:46', 'default', '{\"order_id\":11,\"full_name\":\"Chief Admin\"}', 11, 'orders', NULL, NULL, '2025-02-27 10:25:53', 'orderCreated', '2025-02-27 10:25:53', NULL, 'users'),
(28, 2, '2025-02-03 10:51:46', 'default', '{\"order_id\":11,\"full_name\":\"Chief Admin\"}', 11, 'orders', NULL, NULL, '2025-02-03 10:51:46', 'orderCreated', NULL, NULL, 'users'),
(29, 1, '2025-02-07 11:30:27', 'default', '{\"order_id\":12,\"full_name\":\"Chief Admin\"}', 12, 'orders', NULL, NULL, '2025-02-27 10:25:53', 'orderCreated', '2025-02-27 10:25:53', NULL, 'users'),
(30, 2, '2025-02-07 11:30:27', 'default', '{\"order_id\":12,\"full_name\":\"Chief Admin\"}', 12, 'orders', NULL, NULL, '2025-02-07 11:30:27', 'orderCreated', NULL, NULL, 'users'),
(31, 1, '2025-02-07 11:30:27', 'default', '{\"order_id\":13,\"full_name\":\"Chief Admin\"}', 13, 'orders', NULL, NULL, '2025-02-27 10:25:53', 'orderCreated', '2025-02-27 10:25:53', NULL, 'users'),
(32, 2, '2025-02-07 11:30:27', 'default', '{\"order_id\":13,\"full_name\":\"Chief Admin\"}', 13, 'orders', NULL, NULL, '2025-02-07 11:30:27', 'orderCreated', NULL, NULL, 'users'),
(33, 1, '2025-02-07 11:30:30', 'default', '{\"order_id\":14,\"full_name\":\"Chief Admin\"}', 14, 'orders', NULL, NULL, '2025-02-27 10:25:53', 'orderCreated', '2025-02-27 10:25:53', NULL, 'users'),
(34, 2, '2025-02-07 11:30:30', 'default', '{\"order_id\":14,\"full_name\":\"Chief Admin\"}', 14, 'orders', NULL, NULL, '2025-02-07 11:30:30', 'orderCreated', NULL, NULL, 'users'),
(35, 1, '2025-02-07 11:31:49', 'default', '{\"order_id\":15,\"full_name\":\"Chief Admin\"}', 15, 'orders', NULL, NULL, '2025-02-27 10:25:53', 'orderCreated', '2025-02-27 10:25:53', NULL, 'users'),
(36, 2, '2025-02-07 11:31:49', 'default', '{\"order_id\":15,\"full_name\":\"Chief Admin\"}', 15, 'orders', NULL, NULL, '2025-02-07 11:31:49', 'orderCreated', NULL, NULL, 'users'),
(37, 1, '2025-02-07 11:33:01', 'default', '{\"order_id\":16,\"full_name\":\"Chief Admin\"}', 16, 'orders', NULL, NULL, '2025-02-27 10:25:53', 'orderCreated', '2025-02-27 10:25:53', NULL, 'users'),
(38, 2, '2025-02-07 11:33:01', 'default', '{\"order_id\":16,\"full_name\":\"Chief Admin\"}', 16, 'orders', NULL, NULL, '2025-02-07 11:33:01', 'orderCreated', NULL, NULL, 'users'),
(39, 1, '2025-02-07 12:59:33', 'default', '{\"order_id\":17,\"full_name\":\"Chief Admin\"}', 17, 'orders', NULL, NULL, '2025-02-27 10:25:53', 'orderCreated', '2025-02-27 10:25:53', NULL, 'users'),
(40, 2, '2025-02-07 12:59:33', 'default', '{\"order_id\":17,\"full_name\":\"Chief Admin\"}', 17, 'orders', NULL, NULL, '2025-02-07 12:59:33', 'orderCreated', NULL, NULL, 'users'),
(41, 1, '2025-02-07 21:08:47', 'default', '{\"order_id\":18,\"full_name\":\"oussama douba\"}', 18, 'orders', NULL, NULL, '2025-02-27 10:25:53', 'orderCreated', '2025-02-27 10:25:53', NULL, 'users'),
(42, 2, '2025-02-07 21:08:47', 'default', '{\"order_id\":18,\"full_name\":\"oussama douba\"}', 18, 'orders', NULL, NULL, '2025-02-07 21:08:47', 'orderCreated', NULL, NULL, 'users'),
(43, 1, '2025-02-07 21:24:48', 'default', '{\"order_id\":19,\"full_name\":\"oussama douba\"}', 19, 'orders', NULL, NULL, '2025-02-27 10:25:53', 'orderCreated', '2025-02-27 10:25:53', NULL, 'users'),
(44, 2, '2025-02-07 21:24:48', 'default', '{\"order_id\":19,\"full_name\":\"oussama douba\"}', 19, 'orders', NULL, NULL, '2025-02-07 21:24:48', 'orderCreated', NULL, NULL, 'users'),
(45, 1, '2025-02-10 15:03:27', 'default', '{\"order_id\":20,\"full_name\":\"Chief Admin\"}', 20, 'orders', NULL, NULL, '2025-02-27 10:25:53', 'orderCreated', '2025-02-27 10:25:53', NULL, 'users'),
(46, 2, '2025-02-10 15:03:27', 'default', '{\"order_id\":20,\"full_name\":\"Chief Admin\"}', 20, 'orders', NULL, NULL, '2025-02-10 15:03:27', 'orderCreated', NULL, NULL, 'users'),
(47, 1, '2025-02-11 20:37:05', 'default', '{\"order_id\":28,\"full_name\":\"Chief Admin\"}', 28, 'orders', NULL, NULL, '2025-02-27 10:25:53', 'orderCreated', '2025-02-27 10:25:53', NULL, 'users'),
(48, 2, '2025-02-11 20:37:05', 'default', '{\"order_id\":28,\"full_name\":\"Chief Admin\"}', 28, 'orders', NULL, NULL, '2025-02-11 20:37:05', 'orderCreated', NULL, NULL, 'users'),
(49, 1, '2025-02-13 11:00:31', 'default', '{\"order_id\":29,\"full_name\":\"Chief Admin\"}', 29, 'orders', NULL, NULL, '2025-02-27 10:25:53', 'orderCreated', '2025-02-27 10:25:53', NULL, 'users'),
(50, 2, '2025-02-13 11:00:31', 'default', '{\"order_id\":29,\"full_name\":\"Chief Admin\"}', 29, 'orders', NULL, NULL, '2025-02-13 11:00:31', 'orderCreated', NULL, NULL, 'users'),
(51, 1, '2025-02-13 11:23:24', 'default', '{\"order_id\":30,\"full_name\":\"oussama douba\"}', 30, 'orders', 1, 'customers', '2025-02-27 10:25:53', 'orderCreated', '2025-02-27 10:25:53', NULL, 'users'),
(52, 2, '2025-02-13 11:23:24', 'default', '{\"order_id\":30,\"full_name\":\"oussama douba\"}', 30, 'orders', 1, 'customers', '2025-02-13 11:23:24', 'orderCreated', NULL, NULL, 'users'),
(53, 1, '2025-02-13 11:23:30', 'default', '{\"order_id\":31,\"full_name\":\"oussama douba\"}', 31, 'orders', 1, 'customers', '2025-02-27 10:25:53', 'orderCreated', '2025-02-27 10:25:53', NULL, 'users'),
(54, 2, '2025-02-13 11:23:30', 'default', '{\"order_id\":31,\"full_name\":\"oussama douba\"}', 31, 'orders', 1, 'customers', '2025-02-13 11:23:30', 'orderCreated', NULL, NULL, 'users'),
(55, 1, '2025-02-13 11:24:51', 'default', '{\"order_id\":32,\"full_name\":\"oussama douba\"}', 32, 'orders', 1, 'customers', '2025-02-27 10:25:53', 'orderCreated', '2025-02-27 10:25:53', NULL, 'users'),
(56, 2, '2025-02-13 11:24:51', 'default', '{\"order_id\":32,\"full_name\":\"oussama douba\"}', 32, 'orders', 1, 'customers', '2025-02-13 11:24:51', 'orderCreated', NULL, NULL, 'users'),
(57, 1, '2025-02-13 21:54:01', 'default', '{\"order_id\":33,\"full_name\":\"oussama douba\"}', 33, 'orders', 1, 'customers', '2025-02-27 10:25:53', 'orderCreated', '2025-02-27 10:25:53', NULL, 'users'),
(58, 2, '2025-02-13 21:54:01', 'default', '{\"order_id\":33,\"full_name\":\"oussama douba\"}', 33, 'orders', 1, 'customers', '2025-02-13 21:54:01', 'orderCreated', NULL, NULL, 'users'),
(59, 1, '2025-02-16 18:02:07', 'default', '{\"order_id\":34,\"full_name\":\"Chief Admin\"}', 34, 'orders', NULL, NULL, '2025-02-27 10:25:53', 'orderCreated', '2025-02-27 10:25:53', NULL, 'users'),
(60, 2, '2025-02-16 18:02:07', 'default', '{\"order_id\":34,\"full_name\":\"Chief Admin\"}', 34, 'orders', NULL, NULL, '2025-02-16 18:02:07', 'orderCreated', NULL, NULL, 'users'),
(61, 1, '2025-02-16 18:04:26', 'default', '{\"order_id\":35,\"full_name\":\"Chief Admin\"}', 35, 'orders', NULL, NULL, '2025-02-27 10:25:53', 'orderCreated', '2025-02-27 10:25:53', NULL, 'users'),
(62, 2, '2025-02-16 18:04:26', 'default', '{\"order_id\":35,\"full_name\":\"Chief Admin\"}', 35, 'orders', NULL, NULL, '2025-02-16 18:04:26', 'orderCreated', NULL, NULL, 'users'),
(63, 1, '2025-02-16 18:06:53', 'default', '{\"order_id\":36,\"full_name\":\"Chief Admin\"}', 36, 'orders', NULL, NULL, '2025-02-27 10:25:53', 'orderCreated', '2025-02-27 10:25:53', NULL, 'users'),
(64, 2, '2025-02-16 18:06:53', 'default', '{\"order_id\":36,\"full_name\":\"Chief Admin\"}', 36, 'orders', NULL, NULL, '2025-02-16 18:06:53', 'orderCreated', NULL, NULL, 'users'),
(65, 1, '2025-02-16 18:15:27', 'default', '{\"order_id\":37,\"full_name\":\"Chief Admin\"}', 37, 'orders', NULL, NULL, '2025-02-27 10:25:53', 'orderCreated', '2025-02-27 10:25:53', NULL, 'users'),
(66, 2, '2025-02-16 18:15:27', 'default', '{\"order_id\":37,\"full_name\":\"Chief Admin\"}', 37, 'orders', NULL, NULL, '2025-02-16 18:15:27', 'orderCreated', NULL, NULL, 'users'),
(67, 1, '2025-02-16 23:31:21', 'default', '{\"order_id\":38,\"full_name\":\"oussama oussama\"}', 38, 'orders', NULL, NULL, '2025-02-27 10:25:53', 'orderCreated', '2025-02-27 10:25:53', NULL, 'users'),
(68, 2, '2025-02-16 23:31:21', 'default', '{\"order_id\":38,\"full_name\":\"oussama oussama\"}', 38, 'orders', NULL, NULL, '2025-02-16 23:31:21', 'orderCreated', NULL, NULL, 'users'),
(69, 1, '2025-02-17 14:50:15', 'default', '{\"order_id\":39,\"full_name\":\"Chief Admin\"}', 39, 'orders', NULL, NULL, '2025-02-27 10:25:53', 'orderCreated', '2025-02-27 10:25:53', NULL, 'users'),
(70, 2, '2025-02-17 14:50:15', 'default', '{\"order_id\":39,\"full_name\":\"Chief Admin\"}', 39, 'orders', NULL, NULL, '2025-02-17 14:50:15', 'orderCreated', NULL, NULL, 'users'),
(71, 1, '2025-02-17 17:19:56', 'default', '{\"order_id\":40,\"full_name\":\"table41 .\"}', 40, 'orders', NULL, NULL, '2025-02-27 10:25:53', 'orderCreated', '2025-02-27 10:25:53', NULL, 'users'),
(72, 2, '2025-02-17 17:19:57', 'default', '{\"order_id\":40,\"full_name\":\"table41 .\"}', 40, 'orders', NULL, NULL, '2025-02-17 17:19:57', 'orderCreated', NULL, NULL, 'users'),
(73, 1, '2025-02-17 17:22:40', 'default', '{\"customer_id\":2,\"full_name\":\"Navier Stockes\"}', 2, 'customers', 2, 'customers', '2025-02-27 10:25:53', 'customerRegistered', '2025-02-27 10:25:53', NULL, 'users'),
(74, 1, '2025-02-17 17:23:13', 'default', '{\"order_id\":41,\"full_name\":\"Table .\"}', 41, 'orders', 2, 'customers', '2025-02-27 10:25:53', 'orderCreated', '2025-02-27 10:25:53', NULL, 'users'),
(75, 2, '2025-02-17 17:23:13', 'default', '{\"order_id\":41,\"full_name\":\"Table .\"}', 41, 'orders', 2, 'customers', '2025-02-17 17:23:13', 'orderCreated', NULL, NULL, 'users'),
(76, 1, '2025-02-17 17:24:48', 'default', '{\"order_id\":42,\"full_name\":\"table41 .\"}', 42, 'orders', 2, 'customers', '2025-02-27 10:25:53', 'orderCreated', '2025-02-27 10:25:53', NULL, 'users'),
(77, 2, '2025-02-17 17:24:49', 'default', '{\"order_id\":42,\"full_name\":\"table41 .\"}', 42, 'orders', 2, 'customers', '2025-02-17 17:24:49', 'orderCreated', NULL, NULL, 'users'),
(78, 1, '2025-02-17 17:26:29', 'default', '{\"order_id\":43,\"full_name\":\"table40 .\"}', 43, 'orders', 2, 'customers', '2025-02-27 10:25:53', 'orderCreated', '2025-02-27 10:25:53', NULL, 'users'),
(79, 2, '2025-02-17 17:26:30', 'default', '{\"order_id\":43,\"full_name\":\"table40 .\"}', 43, 'orders', 2, 'customers', '2025-02-17 17:26:30', 'orderCreated', NULL, NULL, 'users'),
(80, 1, '2025-02-17 17:28:47', 'default', '{\"order_id\":44,\"full_name\":\"table40 .\"}', 44, 'orders', NULL, NULL, '2025-02-27 10:25:53', 'orderCreated', '2025-02-27 10:25:53', NULL, 'users'),
(81, 2, '2025-02-17 17:28:47', 'default', '{\"order_id\":44,\"full_name\":\"table40 .\"}', 44, 'orders', NULL, NULL, '2025-02-17 17:28:47', 'orderCreated', NULL, NULL, 'users'),
(82, 1, '2025-02-17 17:29:41', 'default', '{\"order_id\":45,\"full_name\":\"table41 .\"}', 45, 'orders', NULL, NULL, '2025-02-27 10:25:53', 'orderCreated', '2025-02-27 10:25:53', NULL, 'users'),
(83, 2, '2025-02-17 17:29:41', 'default', '{\"order_id\":45,\"full_name\":\"table41 .\"}', 45, 'orders', NULL, NULL, '2025-02-17 17:29:41', 'orderCreated', NULL, NULL, 'users'),
(84, 1, '2025-02-18 19:22:39', 'default', '{\"order_id\":46,\"full_name\":\"table40 .\"}', 46, 'orders', NULL, NULL, '2025-02-27 10:25:53', 'orderCreated', '2025-02-27 10:25:53', NULL, 'users'),
(85, 2, '2025-02-18 19:22:40', 'default', '{\"order_id\":46,\"full_name\":\"table40 .\"}', 46, 'orders', NULL, NULL, '2025-02-18 19:22:40', 'orderCreated', NULL, NULL, 'users'),
(86, 1, '2025-02-18 19:23:05', 'default', '{\"order_id\":47,\"full_name\":\"table41 .\"}', 47, 'orders', NULL, NULL, '2025-02-27 10:25:53', 'orderCreated', '2025-02-27 10:25:53', NULL, 'users'),
(87, 2, '2025-02-18 19:23:05', 'default', '{\"order_id\":47,\"full_name\":\"table41 .\"}', 47, 'orders', NULL, NULL, '2025-02-18 19:23:05', 'orderCreated', NULL, NULL, 'users'),
(88, 1, '2025-02-21 21:30:52', 'default', '{\"order_id\":48,\"full_name\":\"oussama Douba\"}', 48, 'orders', NULL, NULL, '2025-02-27 10:25:53', 'orderCreated', '2025-02-27 10:25:53', NULL, 'users'),
(89, 2, '2025-02-21 21:30:53', 'default', '{\"order_id\":48,\"full_name\":\"oussama Douba\"}', 48, 'orders', NULL, NULL, '2025-02-21 21:30:53', 'orderCreated', NULL, NULL, 'users'),
(90, 1, '2025-02-21 21:31:11', 'default', '{\"order_id\":49,\"full_name\":\"oussama oussama\"}', 49, 'orders', NULL, NULL, '2025-02-27 10:25:53', 'orderCreated', '2025-02-27 10:25:53', NULL, 'users'),
(91, 2, '2025-02-21 21:31:11', 'default', '{\"order_id\":49,\"full_name\":\"oussama oussama\"}', 49, 'orders', NULL, NULL, '2025-02-21 21:31:11', 'orderCreated', NULL, NULL, 'users'),
(92, 1, '2025-02-21 21:33:09', 'default', '{\"order_id\":50,\"full_name\":\"Table 23 .\"}', 50, 'orders', NULL, NULL, '2025-02-27 10:25:53', 'orderCreated', '2025-02-27 10:25:53', NULL, 'users'),
(93, 2, '2025-02-21 21:33:10', 'default', '{\"order_id\":50,\"full_name\":\"Table 23 .\"}', 50, 'orders', NULL, NULL, '2025-02-21 21:33:10', 'orderCreated', NULL, NULL, 'users'),
(94, 1, '2025-02-24 12:46:02', 'default', '{\"order_id\":51,\"full_name\":\"table41 .\"}', 51, 'orders', NULL, NULL, '2025-02-27 10:25:53', 'orderCreated', '2025-02-27 10:25:53', NULL, 'users'),
(95, 2, '2025-02-24 12:46:03', 'default', '{\"order_id\":51,\"full_name\":\"table41 .\"}', 51, 'orders', NULL, NULL, '2025-02-24 12:46:03', 'orderCreated', NULL, NULL, 'users'),
(96, 1, '2025-02-25 12:49:46', 'default', '{\"order_id\":53,\"full_name\":\"table41 .\"}', 53, 'orders', NULL, NULL, '2025-02-27 10:25:53', 'orderCreated', '2025-02-27 10:25:53', NULL, 'users'),
(97, 2, '2025-02-25 12:49:47', 'default', '{\"order_id\":53,\"full_name\":\"table41 .\"}', 53, 'orders', NULL, NULL, '2025-02-25 12:49:47', 'orderCreated', NULL, NULL, 'users'),
(98, 1, '2025-02-25 12:50:57', 'default', '{\"order_id\":54,\"full_name\":\"Table .\"}', 54, 'orders', NULL, NULL, '2025-02-27 10:25:53', 'orderCreated', '2025-02-27 10:25:53', NULL, 'users'),
(99, 2, '2025-02-25 12:51:02', 'default', '{\"order_id\":54,\"full_name\":\"Table .\"}', 54, 'orders', NULL, NULL, '2025-02-25 12:51:02', 'orderCreated', NULL, NULL, 'users'),
(100, 1, '2025-02-25 12:51:02', 'default', '{\"order_id\":55,\"full_name\":\"Table .\"}', 55, 'orders', NULL, NULL, '2025-02-27 10:25:53', 'orderCreated', '2025-02-27 10:25:53', NULL, 'users'),
(101, 2, '2025-02-25 12:51:03', 'default', '{\"order_id\":55,\"full_name\":\"Table .\"}', 55, 'orders', NULL, NULL, '2025-02-25 12:51:03', 'orderCreated', NULL, NULL, 'users'),
(102, 1, '2025-02-25 12:51:03', 'default', '{\"order_id\":56,\"full_name\":\"Table .\"}', 56, 'orders', NULL, NULL, '2025-02-27 10:25:53', 'orderCreated', '2025-02-27 10:25:53', NULL, 'users'),
(103, 2, '2025-02-25 12:51:03', 'default', '{\"order_id\":56,\"full_name\":\"Table .\"}', 56, 'orders', NULL, NULL, '2025-02-25 12:51:03', 'orderCreated', NULL, NULL, 'users'),
(104, 1, '2025-02-25 12:52:59', 'default', '{\"order_id\":57,\"full_name\":\"Table .\"}', 57, 'orders', NULL, NULL, '2025-02-27 10:25:53', 'orderCreated', '2025-02-27 10:25:53', NULL, 'users'),
(105, 2, '2025-02-25 12:53:00', 'default', '{\"order_id\":57,\"full_name\":\"Table .\"}', 57, 'orders', NULL, NULL, '2025-02-25 12:53:00', 'orderCreated', NULL, NULL, 'users'),
(106, 1, '2025-02-26 22:19:16', 'default', '{\"order_id\":58,\"full_name\":\"Table 01 .\"}', 58, 'orders', NULL, NULL, '2025-02-27 10:25:53', 'orderCreated', '2025-02-27 10:25:53', NULL, 'users'),
(107, 2, '2025-02-26 22:19:16', 'default', '{\"order_id\":58,\"full_name\":\"Table 01 .\"}', 58, 'orders', NULL, NULL, '2025-02-26 22:19:16', 'orderCreated', NULL, NULL, 'users'),
(108, 1, '2025-02-27 09:48:49', 'default', '{\"order_id\":59,\"full_name\":\"Table 02 .\"}', 59, 'orders', NULL, NULL, '2025-02-27 10:25:53', 'orderCreated', '2025-02-27 10:25:53', NULL, 'users'),
(109, 2, '2025-02-27 09:48:49', 'default', '{\"order_id\":59,\"full_name\":\"Table 02 .\"}', 59, 'orders', NULL, NULL, '2025-02-27 09:48:49', 'orderCreated', NULL, NULL, 'users'),
(110, 1, '2025-02-27 09:55:40', 'default', '{\"order_id\":60,\"full_name\":\"Table 01 .\"}', 60, 'orders', NULL, NULL, '2025-02-27 10:25:53', 'orderCreated', '2025-02-27 10:25:53', NULL, 'users'),
(111, 2, '2025-02-27 09:55:41', 'default', '{\"order_id\":60,\"full_name\":\"Table 01 .\"}', 60, 'orders', NULL, NULL, '2025-02-27 09:55:41', 'orderCreated', NULL, NULL, 'users'),
(112, 1, '2025-02-27 10:38:15', 'default', '{\"order_id\":62,\"full_name\":\"Table 01 .\"}', 62, 'orders', NULL, NULL, '2025-02-27 10:38:15', 'orderCreated', NULL, NULL, 'users'),
(113, 2, '2025-02-27 10:38:16', 'default', '{\"order_id\":62,\"full_name\":\"Table 01 .\"}', 62, 'orders', NULL, NULL, '2025-02-27 10:38:16', 'orderCreated', NULL, NULL, 'users'),
(114, 1, '2025-02-27 10:42:20', 'default', '{\"order_id\":64,\"full_name\":\"Table 02 .\"}', 64, 'orders', NULL, NULL, '2025-02-27 10:42:20', 'orderCreated', NULL, NULL, 'users'),
(115, 2, '2025-02-27 10:42:20', 'default', '{\"order_id\":64,\"full_name\":\"Table 02 .\"}', 64, 'orders', NULL, NULL, '2025-02-27 10:42:20', 'orderCreated', NULL, NULL, 'users'),
(116, 1, '2025-02-27 10:43:33', 'default', '{\"order_id\":65,\"full_name\":\"Table 02 .\"}', 65, 'orders', NULL, NULL, '2025-02-27 10:43:33', 'orderCreated', NULL, NULL, 'users'),
(117, 2, '2025-02-27 10:43:33', 'default', '{\"order_id\":65,\"full_name\":\"Table 02 .\"}', 65, 'orders', NULL, NULL, '2025-02-27 10:43:33', 'orderCreated', NULL, NULL, 'users'),
(118, 1, '2025-02-27 20:44:08', 'default', '{\"order_id\":70,\"full_name\":\"Table 03 .\"}', 70, 'orders', NULL, NULL, '2025-02-27 20:44:08', 'orderCreated', NULL, NULL, 'users'),
(119, 2, '2025-02-27 20:44:09', 'default', '{\"order_id\":70,\"full_name\":\"Table 03 .\"}', 70, 'orders', NULL, NULL, '2025-02-27 20:44:09', 'orderCreated', NULL, NULL, 'users'),
(120, 1, '2025-02-27 20:47:08', 'default', '{\"order_id\":71,\"full_name\":\"Table 02 .\"}', 71, 'orders', NULL, NULL, '2025-02-27 20:47:08', 'orderCreated', NULL, NULL, 'users'),
(121, 2, '2025-02-27 20:47:08', 'default', '{\"order_id\":71,\"full_name\":\"Table 02 .\"}', 71, 'orders', NULL, NULL, '2025-02-27 20:47:08', 'orderCreated', NULL, NULL, 'users'),
(122, 1, '2025-02-27 22:39:53', 'default', '{\"order_id\":72,\"full_name\":\"Table 01 .\"}', 72, 'orders', NULL, NULL, '2025-02-27 22:39:53', 'orderCreated', NULL, NULL, 'users'),
(123, 2, '2025-02-27 22:39:53', 'default', '{\"order_id\":72,\"full_name\":\"Table 01 .\"}', 72, 'orders', NULL, NULL, '2025-02-27 22:39:53', 'orderCreated', NULL, NULL, 'users'),
(124, 1, '2025-02-27 23:07:42', 'default', '{\"order_id\":74,\"full_name\":\"Table 04 .\"}', 74, 'orders', NULL, NULL, '2025-02-27 23:07:42', 'orderCreated', NULL, NULL, 'users'),
(125, 2, '2025-02-27 23:07:42', 'default', '{\"order_id\":74,\"full_name\":\"Table 04 .\"}', 74, 'orders', NULL, NULL, '2025-02-27 23:07:42', 'orderCreated', NULL, NULL, 'users'),
(126, 1, '2025-02-27 23:49:10', 'default', '{\"order_id\":75,\"full_name\":\"Table 02 .\"}', 75, 'orders', NULL, NULL, '2025-02-27 23:49:10', 'orderCreated', NULL, NULL, 'users'),
(127, 2, '2025-02-27 23:49:11', 'default', '{\"order_id\":75,\"full_name\":\"Table 02 .\"}', 75, 'orders', NULL, NULL, '2025-02-27 23:49:11', 'orderCreated', NULL, NULL, 'users'),
(128, 1, '2025-02-28 00:01:00', 'default', '{\"order_id\":76,\"full_name\":\"Table 01 .\"}', 76, 'orders', NULL, NULL, '2025-02-28 00:01:00', 'orderCreated', NULL, NULL, 'users'),
(129, 2, '2025-02-28 00:01:00', 'default', '{\"order_id\":76,\"full_name\":\"Table 01 .\"}', 76, 'orders', NULL, NULL, '2025-02-28 00:01:00', 'orderCreated', NULL, NULL, 'users'),
(130, 1, '2025-02-28 13:14:11', 'default', '{\"order_id\":78,\"full_name\":\"Table 04 .\"}', 78, 'orders', NULL, NULL, '2025-02-28 13:14:11', 'orderCreated', NULL, NULL, 'users'),
(131, 2, '2025-02-28 13:14:11', 'default', '{\"order_id\":78,\"full_name\":\"Table 04 .\"}', 78, 'orders', NULL, NULL, '2025-02-28 13:14:11', 'orderCreated', NULL, NULL, 'users'),
(132, 1, '2025-02-28 14:21:19', 'default', '{\"order_id\":79,\"full_name\":\"Table 03 .\"}', 79, 'orders', NULL, NULL, '2025-02-28 14:21:19', 'orderCreated', NULL, NULL, 'users'),
(133, 2, '2025-02-28 14:21:20', 'default', '{\"order_id\":79,\"full_name\":\"Table 03 .\"}', 79, 'orders', NULL, NULL, '2025-02-28 14:21:20', 'orderCreated', NULL, NULL, 'users'),
(134, 1, '2025-02-28 14:39:38', 'default', '{\"order_id\":80,\"full_name\":\"Table 04 .\"}', 80, 'orders', NULL, NULL, '2025-02-28 14:39:38', 'orderCreated', NULL, NULL, 'users'),
(135, 2, '2025-02-28 14:39:39', 'default', '{\"order_id\":80,\"full_name\":\"Table 04 .\"}', 80, 'orders', NULL, NULL, '2025-02-28 14:39:39', 'orderCreated', NULL, NULL, 'users'),
(136, 1, '2025-02-28 14:39:42', 'default', '{\"order_id\":81,\"full_name\":\"Table 04 .\"}', 81, 'orders', NULL, NULL, '2025-02-28 14:39:42', 'orderCreated', NULL, NULL, 'users'),
(137, 2, '2025-02-28 14:39:42', 'default', '{\"order_id\":81,\"full_name\":\"Table 04 .\"}', 81, 'orders', NULL, NULL, '2025-02-28 14:39:42', 'orderCreated', NULL, NULL, 'users'),
(138, 1, '2025-02-28 14:41:01', 'default', '{\"order_id\":82,\"full_name\":\"Table 01 .\"}', 82, 'orders', NULL, NULL, '2025-02-28 14:41:01', 'orderCreated', NULL, NULL, 'users'),
(139, 2, '2025-02-28 14:41:02', 'default', '{\"order_id\":82,\"full_name\":\"Table 01 .\"}', 82, 'orders', NULL, NULL, '2025-02-28 14:41:02', 'orderCreated', NULL, NULL, 'users'),
(140, 1, '2025-02-28 14:47:26', 'default', '{\"order_id\":83,\"full_name\":\"Table 04 .\"}', 83, 'orders', NULL, NULL, '2025-02-28 14:47:26', 'orderCreated', NULL, NULL, 'users'),
(141, 2, '2025-02-28 14:47:27', 'default', '{\"order_id\":83,\"full_name\":\"Table 04 .\"}', 83, 'orders', NULL, NULL, '2025-02-28 14:47:27', 'orderCreated', NULL, NULL, 'users'),
(142, 1, '2025-02-28 19:50:48', 'default', '{\"order_id\":84,\"full_name\":\"Table 04 .\"}', 84, 'orders', NULL, NULL, '2025-02-28 19:50:48', 'orderCreated', NULL, NULL, 'users'),
(143, 2, '2025-02-28 19:50:48', 'default', '{\"order_id\":84,\"full_name\":\"Table 04 .\"}', 84, 'orders', NULL, NULL, '2025-02-28 19:50:48', 'orderCreated', NULL, NULL, 'users'),
(144, 1, '2025-02-28 21:08:52', 'default', '{\"order_id\":90,\"full_name\":\"Table 02 .\"}', 90, 'orders', NULL, NULL, '2025-02-28 21:08:52', 'orderCreated', NULL, NULL, 'users'),
(145, 2, '2025-02-28 21:08:53', 'default', '{\"order_id\":90,\"full_name\":\"Table 02 .\"}', 90, 'orders', NULL, NULL, '2025-02-28 21:08:53', 'orderCreated', NULL, NULL, 'users'),
(146, 1, '2025-03-01 17:14:42', 'default', '{\"order_id\":96,\"full_name\":\"Table 04 .\"}', 96, 'orders', NULL, NULL, '2025-03-01 17:14:42', 'orderCreated', NULL, NULL, 'users'),
(147, 2, '2025-03-01 17:14:43', 'default', '{\"order_id\":96,\"full_name\":\"Table 04 .\"}', 96, 'orders', NULL, NULL, '2025-03-01 17:14:43', 'orderCreated', NULL, NULL, 'users'),
(148, 1, '2025-03-01 17:20:38', 'default', '{\"order_id\":98,\"full_name\":\"Table 02 .\"}', 98, 'orders', NULL, NULL, '2025-03-01 17:20:38', 'orderCreated', NULL, NULL, 'users'),
(149, 2, '2025-03-01 17:20:39', 'default', '{\"order_id\":98,\"full_name\":\"Table 02 .\"}', 98, 'orders', NULL, NULL, '2025-03-01 17:20:39', 'orderCreated', NULL, NULL, 'users'),
(150, 1, '2025-03-01 17:37:28', 'default', '{\"order_id\":104,\"full_name\":\"Table 01 .\"}', 104, 'orders', NULL, NULL, '2025-03-01 17:37:28', 'orderCreated', NULL, NULL, 'users'),
(151, 2, '2025-03-01 17:37:29', 'default', '{\"order_id\":104,\"full_name\":\"Table 01 .\"}', 104, 'orders', NULL, NULL, '2025-03-01 17:37:29', 'orderCreated', NULL, NULL, 'users'),
(152, 1, '2025-03-01 17:37:54', 'default', '{\"order_id\":105,\"full_name\":\"Table .\"}', 105, 'orders', NULL, NULL, '2025-03-01 17:37:54', 'orderCreated', NULL, NULL, 'users'),
(153, 2, '2025-03-01 17:37:54', 'default', '{\"order_id\":105,\"full_name\":\"Table .\"}', 105, 'orders', NULL, NULL, '2025-03-01 17:37:54', 'orderCreated', NULL, NULL, 'users'),
(154, 1, '2025-03-01 19:01:10', 'default', '{\"order_id\":106,\"full_name\":\"Table 01 .\"}', 106, 'orders', NULL, NULL, '2025-03-01 19:01:10', 'orderCreated', NULL, NULL, 'users'),
(155, 2, '2025-03-01 19:01:11', 'default', '{\"order_id\":106,\"full_name\":\"Table 01 .\"}', 106, 'orders', NULL, NULL, '2025-03-01 19:01:11', 'orderCreated', NULL, NULL, 'users'),
(156, 1, '2025-03-01 19:39:46', 'default', '{\"order_id\":107,\"full_name\":\"Table 02 .\"}', 107, 'orders', NULL, NULL, '2025-03-01 19:39:46', 'orderCreated', NULL, NULL, 'users'),
(157, 2, '2025-03-01 19:39:46', 'default', '{\"order_id\":107,\"full_name\":\"Table 02 .\"}', 107, 'orders', NULL, NULL, '2025-03-01 19:39:46', 'orderCreated', NULL, NULL, 'users'),
(158, 1, '2025-03-02 12:58:24', 'default', '{\"order_id\":111,\"full_name\":\"Table .\"}', 111, 'orders', NULL, NULL, '2025-03-02 12:58:24', 'orderCreated', NULL, NULL, 'users'),
(159, 2, '2025-03-02 12:58:25', 'default', '{\"order_id\":111,\"full_name\":\"Table .\"}', 111, 'orders', NULL, NULL, '2025-03-02 12:58:25', 'orderCreated', NULL, NULL, 'users'),
(160, 1, '2025-03-02 13:38:23', 'default', '{\"order_id\":112,\"full_name\":\"Table 5 .\"}', 112, 'orders', NULL, NULL, '2025-03-02 13:38:23', 'orderCreated', NULL, NULL, 'users'),
(161, 2, '2025-03-02 13:38:24', 'default', '{\"order_id\":112,\"full_name\":\"Table 5 .\"}', 112, 'orders', NULL, NULL, '2025-03-02 13:38:24', 'orderCreated', NULL, NULL, 'users'),
(162, 1, '2025-03-02 13:46:38', 'default', '{\"order_id\":114,\"full_name\":\"Table 02 .\"}', 114, 'orders', NULL, NULL, '2025-03-02 13:46:38', 'orderCreated', NULL, NULL, 'users'),
(163, 2, '2025-03-02 13:46:39', 'default', '{\"order_id\":114,\"full_name\":\"Table 02 .\"}', 114, 'orders', NULL, NULL, '2025-03-02 13:46:39', 'orderCreated', NULL, NULL, 'users'),
(164, 1, '2025-03-02 13:50:17', 'default', '{\"order_id\":115,\"full_name\":\"Table 5 .\"}', 115, 'orders', NULL, NULL, '2025-03-02 13:50:17', 'orderCreated', NULL, NULL, 'users'),
(165, 2, '2025-03-02 13:50:18', 'default', '{\"order_id\":115,\"full_name\":\"Table 5 .\"}', 115, 'orders', NULL, NULL, '2025-03-02 13:50:18', 'orderCreated', NULL, NULL, 'users'),
(166, 1, '2025-03-02 14:55:47', 'default', '{\"order_id\":117,\"full_name\":\"Table 5 .\"}', 117, 'orders', NULL, NULL, '2025-03-02 14:55:47', 'orderCreated', NULL, NULL, 'users'),
(167, 2, '2025-03-02 14:55:47', 'default', '{\"order_id\":117,\"full_name\":\"Table 5 .\"}', 117, 'orders', NULL, NULL, '2025-03-02 14:55:47', 'orderCreated', NULL, NULL, 'users'),
(168, 1, '2025-03-02 14:59:40', 'default', '{\"order_id\":119,\"full_name\":\"Table 5 .\"}', 119, 'orders', NULL, NULL, '2025-03-02 14:59:40', 'orderCreated', NULL, NULL, 'users'),
(169, 2, '2025-03-02 14:59:40', 'default', '{\"order_id\":119,\"full_name\":\"Table 5 .\"}', 119, 'orders', NULL, NULL, '2025-03-02 14:59:40', 'orderCreated', NULL, NULL, 'users'),
(170, 1, '2025-03-02 15:01:14', 'default', '{\"order_id\":120,\"full_name\":\"Table 5 .\"}', 120, 'orders', NULL, NULL, '2025-03-02 15:01:14', 'orderCreated', NULL, NULL, 'users'),
(171, 2, '2025-03-02 15:01:14', 'default', '{\"order_id\":120,\"full_name\":\"Table 5 .\"}', 120, 'orders', NULL, NULL, '2025-03-02 15:01:14', 'orderCreated', NULL, NULL, 'users'),
(172, 1, '2025-03-02 15:02:17', 'default', '{\"order_id\":121,\"full_name\":\"Table 01 .\"}', 121, 'orders', NULL, NULL, '2025-03-02 15:02:17', 'orderCreated', NULL, NULL, 'users'),
(173, 2, '2025-03-02 15:02:18', 'default', '{\"order_id\":121,\"full_name\":\"Table 01 .\"}', 121, 'orders', NULL, NULL, '2025-03-02 15:02:18', 'orderCreated', NULL, NULL, 'users'),
(174, 1, '2025-03-02 20:52:32', 'default', '{\"order_id\":123,\"full_name\":\"Table 02 .\"}', 123, 'orders', NULL, NULL, '2025-03-02 20:52:32', 'orderCreated', NULL, NULL, 'users'),
(175, 2, '2025-03-02 20:52:33', 'default', '{\"order_id\":123,\"full_name\":\"Table 02 .\"}', 123, 'orders', NULL, NULL, '2025-03-02 20:52:33', 'orderCreated', NULL, NULL, 'users'),
(176, 1, '2025-03-02 20:57:53', 'default', '{\"order_id\":125,\"full_name\":\"Table 03 .\"}', 125, 'orders', NULL, NULL, '2025-03-02 20:57:53', 'orderCreated', NULL, NULL, 'users'),
(177, 2, '2025-03-02 20:57:53', 'default', '{\"order_id\":125,\"full_name\":\"Table 03 .\"}', 125, 'orders', NULL, NULL, '2025-03-02 20:57:53', 'orderCreated', NULL, NULL, 'users'),
(178, 1, '2025-03-03 10:05:02', 'default', '{\"order_id\":126,\"full_name\":\"Table 05 .\"}', 126, 'orders', NULL, NULL, '2025-03-03 10:05:02', 'orderCreated', NULL, NULL, 'users'),
(179, 2, '2025-03-03 10:05:02', 'default', '{\"order_id\":126,\"full_name\":\"Table 05 .\"}', 126, 'orders', NULL, NULL, '2025-03-03 10:05:02', 'orderCreated', NULL, NULL, 'users'),
(180, 1, '2025-03-03 10:14:39', 'default', '{\"order_id\":127,\"full_name\":\"Table 03 .\"}', 127, 'orders', NULL, NULL, '2025-03-03 10:14:39', 'orderCreated', NULL, NULL, 'users'),
(181, 2, '2025-03-03 10:14:39', 'default', '{\"order_id\":127,\"full_name\":\"Table 03 .\"}', 127, 'orders', NULL, NULL, '2025-03-03 10:14:39', 'orderCreated', NULL, NULL, 'users'),
(182, 1, '2025-03-03 15:43:34', 'default', '{\"order_id\":132,\"full_name\":\"Table 01 .\"}', 132, 'orders', NULL, NULL, '2025-03-03 15:43:34', 'orderCreated', NULL, NULL, 'users'),
(183, 2, '2025-03-03 15:43:34', 'default', '{\"order_id\":132,\"full_name\":\"Table 01 .\"}', 132, 'orders', NULL, NULL, '2025-03-03 15:43:34', 'orderCreated', NULL, NULL, 'users'),
(184, 1, '2025-03-06 01:36:38', 'default', '{\"order_id\":140,\"full_name\":\"Table 02 .\"}', 140, 'orders', NULL, NULL, '2025-03-06 01:36:38', 'orderCreated', NULL, NULL, 'users'),
(185, 1, '2025-03-06 01:46:39', 'default', '{\"order_id\":145,\"full_name\":\"Table 02 .\"}', 145, 'orders', NULL, NULL, '2025-03-06 01:46:39', 'orderCreated', NULL, NULL, 'users'),
(186, 1, '2025-03-06 01:56:30', 'default', '{\"order_id\":146,\"full_name\":\"Table 05 .\"}', 146, 'orders', NULL, NULL, '2025-03-06 01:56:30', 'orderCreated', NULL, NULL, 'users'),
(187, 1, '2025-03-06 02:47:32', 'default', '{\"order_id\":147,\"full_name\":\"Table 02 .\"}', 147, 'orders', NULL, NULL, '2025-03-06 02:47:32', 'orderCreated', NULL, NULL, 'users'),
(188, 1, '2025-03-06 03:32:51', 'default', '{\"order_id\":148,\"full_name\":\"Table 02 .\"}', 148, 'orders', NULL, NULL, '2025-03-06 03:32:51', 'orderCreated', NULL, NULL, 'users'),
(189, 1, '2025-03-06 16:21:58', 'default', '{\"order_id\":149,\"full_name\":\"Table 03 .\"}', 149, 'orders', NULL, NULL, '2025-03-06 16:21:58', 'orderCreated', NULL, NULL, 'users'),
(190, 1, '2025-03-06 16:37:55', 'default', '{\"order_id\":152,\"full_name\":\"Table 02 .\"}', 152, 'orders', NULL, NULL, '2025-03-06 16:37:55', 'orderCreated', NULL, NULL, 'users'),
(191, 1, '2025-03-06 16:42:30', 'default', '{\"order_id\":153,\"full_name\":\"Table 05 .\"}', 153, 'orders', NULL, NULL, '2025-03-06 16:42:30', 'orderCreated', NULL, NULL, 'users'),
(192, 1, '2025-03-06 19:41:27', 'default', '{\"order_id\":155,\"full_name\":\"Table 05 .\"}', 155, 'orders', NULL, NULL, '2025-03-06 19:41:27', 'orderCreated', NULL, NULL, 'users');

-- --------------------------------------------------------

--
-- Structure de la table `ti_addresses`
--

DROP TABLE IF EXISTS `ti_addresses`;
CREATE TABLE IF NOT EXISTS `ti_addresses` (
  `address_id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
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
) ENGINE=InnoDB AUTO_INCREMENT=154 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Déargement des donné de la table `ti_addresses`
--

INSERT INTO `ti_addresses` (`address_id`, `customer_id`, `address_1`, `address_2`, `city`, `state`, `postcode`, `country_id`, `created_at`, `updated_at`) VALUES
(1, NULL, 'City rossiers dar el beida Alger', '', 'City rossiers dar el beida Alger', 'AG01', '16011', 81, NULL, NULL),
(2, NULL, 'City rossiers dar el beida Alger', '', 'City rossiers dar el beida Alger', 'AG01', '16011', 81, NULL, NULL),
(3, NULL, 'Null', 'Null', 'Null', 'Null', 'Null', 81, NULL, NULL),
(4, NULL, 'Null', 'Null', 'Null', 'Null', 'Null', 81, NULL, NULL),
(5, NULL, 'Null', 'Null', 'Null', 'Null', 'Null', 81, NULL, NULL),
(6, NULL, 'Null', 'Null', 'Null', 'Null', 'Null', 81, NULL, NULL),
(7, NULL, 'Null', 'Null', 'Null', 'Null', 'Null', 81, NULL, NULL),
(8, NULL, 'Null', 'Null', 'Null', 'Null', 'Null', 81, NULL, NULL),
(9, NULL, 'Null', 'Null', 'Null', 'Null', 'Null', 81, NULL, NULL),
(10, NULL, 'Null', 'Null', 'Null', 'Null', 'Null', 81, NULL, NULL),
(11, NULL, 'Null', 'Null', 'Null', 'Null', 'Null', 81, NULL, NULL),
(12, NULL, 'Null', 'Null', 'Null', 'Null', 'Null', 81, NULL, NULL),
(13, NULL, 'Null', 'Null', 'Null', 'Null', 'Null', 81, NULL, NULL),
(14, NULL, 'Null', 'Null', 'Null', 'Null', 'Null', 81, NULL, NULL),
(15, NULL, 'Null', 'Null', 'Null', 'Null', 'Null', 81, NULL, NULL),
(16, NULL, 'City rossiers dar el beida Alger', '', 'City rossiers dar el beida Alger', 'N/A', '16011', 81, NULL, NULL),
(17, NULL, 'City rossiers dar el beida Alger', 'Alger', 'City rossiers dar el beida Alger', 'N/A', '16011', 81, NULL, NULL),
(18, NULL, 'Null', 'Null', 'Null', 'Null', 'Null', 81, NULL, NULL),
(19, NULL, 'Null', 'Null', 'Null', 'Null', 'Null', 81, NULL, NULL),
(20, NULL, 'Null', 'Null', 'Null', 'Null', 'Null', 81, NULL, NULL),
(21, 1, 'City rossiers dar el beida Alger', '', 'City rossiers dar el beida Alger', 'AG01', '16011', 81, NULL, NULL),
(22, 1, 'City rossiers dar el beida Alger', '', 'City rossiers dar el beida Alger', 'AG01', '16011', 81, NULL, NULL),
(23, NULL, 'Null', 'Null', 'Null', 'Null', 'Null', 81, NULL, NULL),
(24, NULL, 'Null', 'Null', 'Null', 'Null', 'Null', 81, NULL, NULL),
(25, NULL, 'Null', 'Null', 'Null', 'Null', 'Null', 81, NULL, NULL),
(26, NULL, 'Null', 'Null', 'Null', 'Null', 'Null', 81, NULL, NULL),
(27, NULL, 'City rossiers dar el beida Alger', '', 'City rossiers dar el beida Alger', 'N/A', '16011', 81, NULL, NULL),
(28, NULL, 'Null', 'Null', 'Null', 'Null', 'Null', 81, NULL, NULL),
(29, NULL, 'Null', 'Null', 'Null', 'Null', 'Null', 81, NULL, NULL),
(30, 2, 'Null', 'Null', 'Null', 'Null', 'Null', 81, NULL, NULL),
(31, NULL, 'Null', 'Null', 'Null', 'Null', 'Null', 81, NULL, NULL),
(32, NULL, 'Null', 'Null', 'Null', 'Null', 'Null', 81, NULL, NULL),
(33, NULL, 'Null', 'Null', 'Null', 'Null', 'Null', 81, NULL, NULL),
(34, NULL, 'Null', 'Null', 'Null', 'Null', 'Null', 81, NULL, NULL),
(35, NULL, 'City rossiers dar el beida Alger', 'Alger', 'Dar El Beida', 'AG01', '16011', 81, NULL, NULL),
(36, NULL, '19 City rosiers Dar el Beida Alger', '', 'Dar El Beida', '', '16011', 81, NULL, NULL),
(37, NULL, 'Null', 'Null', 'Null', 'Null', 'Null', 81, NULL, NULL),
(38, NULL, 'Null', 'Null', 'Null', 'Null', 'Null', 81, NULL, NULL),
(39, NULL, 'Null', 'Null', 'Null', 'Null', 'Null', 81, NULL, NULL),
(40, NULL, 'Null', 'Null', 'Null', 'Null', 'Null', 81, NULL, NULL),
(41, NULL, 'Null', 'Null', 'Null', 'Null', 'Null', 81, NULL, NULL),
(42, NULL, 'Null', 'Null', 'Null', 'Null', 'Null', 81, NULL, NULL),
(43, NULL, 'Null', 'Null', 'Null', 'Null', 'Null', 81, NULL, NULL),
(44, NULL, 'Null', 'Null', 'Null', 'Null', 'Null', 81, NULL, NULL),
(45, NULL, 'Null', 'Null', 'Null', 'Null', 'Null', 81, NULL, NULL),
(46, NULL, 'Null', 'Null', 'Null', 'Null', 'Null', 81, NULL, NULL),
(47, NULL, 'Null', 'Null', 'Null', 'Null', 'Null', 81, NULL, NULL),
(48, NULL, 'Null', 'Null', 'Null', 'Null', 'Null', 81, NULL, NULL),
(49, NULL, 'Null', 'Null', 'Null', 'Null', 'Null', 81, NULL, NULL),
(50, NULL, 'Null', 'Null', 'Null', 'Null', 'Null', 81, NULL, NULL),
(51, NULL, 'Null', 'Null', 'Null', 'Null', 'Null', 81, NULL, NULL),
(52, NULL, 'Null', 'Null', 'Null', 'Null', 'Null', 81, NULL, NULL),
(53, NULL, 'Null', 'Null', 'Null', 'Null', 'Null', 81, NULL, NULL),
(54, NULL, 'Null', 'Null', 'Null', 'Null', 'Null', 81, NULL, NULL),
(55, NULL, 'Null', 'Null', 'Null', 'Null', 'Null', 81, NULL, NULL),
(56, NULL, 'Null', 'Null', 'Null', 'Null', 'Null', 81, NULL, NULL),
(57, NULL, 'Null', 'Null', 'Null', 'Null', 'Null', 81, NULL, NULL),
(58, NULL, 'Null', 'Null', 'Null', 'Null', 'Null', 81, NULL, NULL),
(59, NULL, 'Null', 'Null', 'Null', 'Null', 'Null', 81, NULL, NULL),
(60, NULL, 'Null', 'Null', 'Null', 'Null', 'Null', 81, NULL, NULL),
(61, NULL, 'Null', 'Null', 'Null', 'Null', 'Null', 81, NULL, NULL),
(62, NULL, 'Null', 'Null', 'Null', 'Null', 'Null', 81, NULL, NULL),
(63, NULL, 'Null', 'Null', 'Null', 'Null', 'Null', 81, NULL, NULL),
(64, NULL, 'Null', 'Null', 'Null', 'Null', 'Null', 81, NULL, NULL),
(65, NULL, 'Null', 'Null', 'Null', 'Null', 'Null', 81, NULL, NULL),
(66, NULL, 'Null', 'Null', 'Null', 'Null', 'Null', 81, NULL, NULL),
(67, NULL, 'Null', 'Null', 'Null', 'Null', 'Null', 81, NULL, NULL),
(68, NULL, 'Null', 'Null', 'Null', 'Null', 'Null', 81, NULL, NULL),
(69, NULL, 'Null', 'Null', 'Null', 'Null', 'Null', 81, NULL, NULL),
(70, NULL, 'Null', 'Null', 'Null', 'Null', 'Null', 81, NULL, NULL),
(71, NULL, 'Null', 'Null', 'Null', 'Null', 'Null', 81, NULL, NULL),
(72, NULL, 'Null', 'Null', 'Null', 'Null', 'Null', 81, NULL, NULL),
(73, NULL, 'Null', 'Null', 'Null', 'Null', 'Null', 81, NULL, NULL),
(74, NULL, 'Null', 'Null', 'Null', 'Null', 'Null', 81, NULL, NULL),
(75, NULL, 'Null', 'Null', 'Null', 'Null', 'Null', 81, NULL, NULL),
(76, NULL, 'Null', 'Null', 'Null', 'Null', 'Null', 81, NULL, NULL),
(77, NULL, 'Null', 'Null', 'Null', 'Null', 'Null', 81, NULL, NULL),
(78, NULL, 'Null', 'Null', 'Null', 'Null', 'Null', 81, NULL, NULL),
(79, NULL, 'Null', 'Null', 'Null', 'Null', 'Null', 81, NULL, NULL),
(80, NULL, 'Null', 'Null', 'Null', 'Null', 'Null', 81, NULL, NULL),
(81, NULL, 'Null', 'Null', 'Null', 'Null', 'Null', 81, NULL, NULL),
(82, NULL, 'Null', 'Null', 'Null', 'Null', 'Null', 81, NULL, NULL),
(83, NULL, 'Null', 'Null', 'Null', 'Null', 'Null', 81, NULL, NULL),
(84, NULL, 'Null', 'Null', 'Null', 'Null', 'Null', 81, NULL, NULL),
(85, NULL, 'Null', 'Null', 'Null', 'Null', 'Null', 81, NULL, NULL),
(86, NULL, 'Null', 'Null', 'Null', 'Null', 'Null', 81, NULL, NULL),
(87, NULL, 'Null', 'Null', 'Null', 'Null', 'Null', 81, NULL, NULL),
(88, NULL, 'Null', 'Null', 'Null', 'Null', 'Null', 81, NULL, NULL),
(89, NULL, 'Null', 'Null', 'Null', 'Null', 'Null', 81, NULL, NULL),
(90, NULL, 'Null', 'Null', 'Null', 'Null', 'Null', 81, NULL, NULL),
(91, NULL, 'Null', 'Null', 'Null', 'Null', 'Null', 81, NULL, NULL),
(92, NULL, 'Null', 'Null', 'Null', 'Null', 'Null', 81, NULL, NULL),
(93, NULL, 'Null', 'Null', 'Null', 'Null', 'Null', 81, NULL, NULL),
(94, NULL, 'Null', 'Null', 'Null', 'Null', 'Null', 81, NULL, NULL),
(95, NULL, 'Null', 'Null', 'Null', 'Null', 'Null', 81, NULL, NULL),
(96, NULL, 'Null', 'Null', 'Null', 'Null', 'Null', 81, NULL, NULL),
(97, NULL, 'Null', 'Null', 'Null', 'Null', 'Null', 81, NULL, NULL),
(98, NULL, 'Null', 'Null', 'Null', 'Null', 'Null', 81, NULL, NULL),
(99, NULL, 'Null', 'Null', 'Null', 'Null', 'Null', 81, NULL, NULL),
(100, NULL, 'Null', 'Null', 'Null', 'Null', 'Null', 81, NULL, NULL),
(101, NULL, 'Null', 'Null', 'Null', 'Null', 'Null', 81, NULL, NULL),
(102, NULL, 'Null', 'Null', 'Null', 'Null', 'Null', 81, NULL, NULL),
(103, NULL, 'Null', 'Null', 'Null', 'Null', 'Null', 81, NULL, NULL),
(104, NULL, 'Null', 'Null', 'Null', 'Null', 'Null', 81, NULL, NULL),
(105, NULL, 'Null', 'Null', 'Null', 'Null', 'Null', 81, NULL, NULL),
(106, NULL, 'Null', 'Null', 'Null', 'Null', 'Null', 81, NULL, NULL),
(107, NULL, 'Null', 'Null', 'Null', 'Null', 'Null', 81, NULL, NULL),
(108, NULL, 'Null', 'Null', 'Null', 'Null', 'Null', 81, NULL, NULL),
(109, NULL, 'Null', 'Null', 'Null', 'Null', 'Null', 81, NULL, NULL),
(110, NULL, 'Null', 'Null', 'Null', 'Null', 'Null', 81, NULL, NULL),
(111, NULL, 'Null', 'Null', 'Null', 'Null', 'Null', 81, NULL, NULL),
(112, NULL, 'Null', 'Null', 'Null', 'Null', 'Null', 81, NULL, NULL),
(113, NULL, 'Null', 'Null', 'Null', 'Null', 'Null', 81, NULL, NULL),
(114, NULL, 'Null', 'Null', 'Null', 'Null', 'Null', 81, NULL, NULL),
(115, NULL, 'Null', 'Null', 'Null', 'Null', 'Null', 81, NULL, NULL),
(116, NULL, 'Null', 'Null', 'Null', 'Null', 'Null', 81, NULL, NULL),
(117, NULL, 'Null', 'Null', 'Null', 'Null', 'Null', 81, NULL, NULL),
(118, NULL, 'Null', 'Null', 'Null', 'Null', 'Null', 81, NULL, NULL),
(119, NULL, 'Null', 'Null', 'Null', 'Null', 'Null', 81, NULL, NULL),
(120, NULL, 'Null', 'Null', 'Null', 'Null', 'Null', 81, NULL, NULL),
(121, NULL, 'Null', 'Null', 'Null', 'Null', 'Null', 81, NULL, NULL),
(122, NULL, 'Null', 'Null', 'Null', 'Null', 'Null', 81, NULL, NULL),
(123, NULL, 'Null', 'Null', 'Null', 'Null', 'Null', 81, NULL, NULL),
(124, NULL, 'Null', 'Null', 'Null', 'Null', 'Null', 81, NULL, NULL),
(125, NULL, 'Null', 'Null', 'Null', 'Null', 'Null', 81, NULL, NULL),
(126, NULL, 'Null', 'Null', 'Null', 'Null', 'Null', 81, NULL, NULL),
(127, NULL, 'Null', 'Null', 'Null', 'Null', 'Null', 81, NULL, NULL),
(128, NULL, 'Null', 'Null', 'Null', 'Null', 'Null', 81, NULL, NULL),
(129, NULL, 'Null', 'Null', 'Null', 'Null', 'Null', 81, NULL, NULL),
(130, NULL, 'Null', 'Null', 'Null', 'Null', 'Null', 81, NULL, NULL),
(131, NULL, 'Null', 'Null', 'Null', 'Null', 'Null', 81, NULL, NULL),
(132, NULL, 'Null', 'Null', 'Null', 'Null', 'Null', 81, NULL, NULL),
(133, NULL, 'Null', 'Null', 'Null', 'Null', 'Null', 81, NULL, NULL),
(134, NULL, 'Null', 'Null', 'Null', 'Null', 'Null', 81, NULL, NULL),
(135, NULL, 'Null', 'Null', 'Null', 'Null', 'Null', 81, NULL, NULL),
(136, NULL, 'Null', 'Null', 'Null', 'Null', 'Null', 81, NULL, NULL),
(137, NULL, 'Null', 'Null', 'Null', 'Null', 'Null', 81, NULL, NULL),
(138, NULL, 'Null', 'Null', 'Null', 'Null', 'Null', 81, NULL, NULL),
(139, NULL, 'Null', 'Null', 'Null', 'Null', 'Null', 81, NULL, NULL),
(140, NULL, 'Null', 'Null', 'Null', 'Null', 'Null', 81, NULL, NULL),
(141, NULL, 'Null', 'Null', 'Null', 'Null', 'Null', 81, NULL, NULL),
(142, NULL, 'Null', 'Null', 'Null', 'Null', 'Null', 81, NULL, NULL),
(143, NULL, 'Null', 'Null', 'Null', 'Null', 'Null', 81, NULL, NULL),
(144, NULL, 'Null', 'Null', 'Null', 'Null', 'Null', 81, NULL, NULL),
(145, NULL, 'Null', 'Null', 'Null', 'Null', 'Null', 81, NULL, NULL),
(146, NULL, 'Null', 'Null', 'Null', 'Null', 'Null', 81, NULL, NULL),
(147, NULL, 'Null', 'Null', 'Null', 'Null', 'Null', 81, NULL, NULL),
(148, NULL, 'Null', 'Null', 'Null', 'Null', 'Null', 81, NULL, NULL),
(149, NULL, 'Null', 'Null', 'Null', 'Null', 'Null', 81, NULL, NULL),
(150, NULL, 'Null', 'Null', 'Null', 'Null', 'Null', 81, NULL, NULL),
(151, NULL, 'Null', 'Null', 'Null', 'Null', 'Null', 81, NULL, NULL),
(152, NULL, 'Null', 'Null', 'Null', 'Null', 'Null', 81, NULL, NULL),
(153, NULL, 'Null', 'Null', 'Null', 'Null', 'Null', 81, NULL, NULL);

-- --------------------------------------------------------

--
-- Structure de la table `ti_allergenables`
--

DROP TABLE IF EXISTS `ti_allergenables`;
CREATE TABLE IF NOT EXISTS `ti_allergenables` (
  `allergen_id` int UNSIGNED NOT NULL,
  `allergenable_type` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `allergenable_id` bigint UNSIGNED NOT NULL,
  UNIQUE KEY `allergenable_unique` (`allergen_id`,`allergenable_id`,`allergenable_type`),
  KEY `allergenable_index` (`allergenable_type`,`allergenable_id`),
  KEY `ti_allergenables_allergen_id_index` (`allergen_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Structure de la table `ti_allergens`
--

DROP TABLE IF EXISTS `ti_allergens`;
CREATE TABLE IF NOT EXISTS `ti_allergens` (
  `allergen_id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`allergen_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Structure de la table `ti_assignable_logs`
--

DROP TABLE IF EXISTS `ti_assignable_logs`;
CREATE TABLE IF NOT EXISTS `ti_assignable_logs` (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `assignable_type` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `assignable_id` bigint UNSIGNED NOT NULL,
  `assignee_id` int UNSIGNED DEFAULT NULL,
  `assignee_group_id` int UNSIGNED DEFAULT NULL,
  `status_id` int UNSIGNED DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `ti_assignable_logs_assignable_type_assignable_id_index` (`assignable_type`,`assignable_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Structure de la table `ti_cache`
--

DROP TABLE IF EXISTS `ti_cache`;
CREATE TABLE IF NOT EXISTS `ti_cache` (
  `key` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `value` mediumtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `expiration` int NOT NULL,
  UNIQUE KEY `ti_cache_key_unique` (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Structure de la table `ti_categories`
--

DROP TABLE IF EXISTS `ti_categories`;
CREATE TABLE IF NOT EXISTS `ti_categories` (
  `category_id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `parent_id` int DEFAULT NULL,
  `priority` int NOT NULL DEFAULT '0',
  `status` tinyint(1) NOT NULL DEFAULT '1',
  `nest_left` int DEFAULT NULL,
  `nest_right` int DEFAULT NULL,
  `permalink_slug` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`category_id`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Déargement des donné de la table `ti_categories`
--

INSERT INTO `ti_categories` (`category_id`, `name`, `description`, `parent_id`, `priority`, `status`, `nest_left`, `nest_right`, `permalink_slug`, `created_at`, `updated_at`) VALUES
(1, 'Appetizer', '', NULL, 1, 1, 1, 2, 'appetizer', '2024-12-31 17:34:40', '2025-01-05 20:44:58'),
(2, 'Main Course', '', NULL, 6, 1, 3, 4, NULL, '2024-12-31 17:34:40', '2025-01-05 20:42:28'),
(3, 'Salads', '', NULL, 3, 1, 5, 6, 'salads', '2024-12-31 17:34:40', '2025-01-05 20:44:48'),
(4, 'Seafoods', '', NULL, 4, 1, 7, 8, 'seafoods', '2024-12-31 17:34:40', '2025-01-05 20:44:43'),
(5, 'Traditional', '', NULL, 5, 1, 9, 10, 'traditional', '2024-12-31 17:34:40', '2025-01-05 20:44:35'),
(6, 'Desserts', '', NULL, 8, 1, 11, 12, 'desserts', '2024-12-31 17:34:40', '2025-01-05 20:42:52'),
(7, 'Drinks', '', NULL, 9, 1, 13, 14, 'drinks', '2024-12-31 17:34:40', '2025-01-05 20:42:45'),
(8, 'Specials', '', NULL, 2, 1, 15, 16, 'specials', '2024-12-31 17:34:40', '2025-01-05 20:44:22');

-- --------------------------------------------------------

--
-- Structure de la table `ti_countries`
--

DROP TABLE IF EXISTS `ti_countries`;
CREATE TABLE IF NOT EXISTS `ti_countries` (
  `country_id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
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

--
-- Déargement des donné de la table `ti_countries`
--

INSERT INTO `ti_countries` (`country_id`, `country_name`, `iso_code_2`, `iso_code_3`, `format`, `status`, `priority`, `created_at`, `updated_at`) VALUES
(1, 'Afghanistan', 'AF', 'AFG', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(2, 'Albania', 'AL', 'ALB', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(3, 'Algeria', 'DZ', 'DZA', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(4, 'American Samoa', 'AS', 'ASM', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(5, 'Andorra', 'AD', 'AND', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(6, 'Angola', 'AO', 'AGO', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(7, 'Anguilla', 'AI', 'AIA', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(8, 'Antarctica', 'AQ', 'ATA', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(9, 'Antigua and Barbuda', 'AG', 'ATG', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(10, 'Argentina', 'AR', 'ARG', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(11, 'Armenia', 'AM', 'ARM', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(12, 'Aruba', 'AW', 'ABW', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(13, 'Australia', 'AU', 'AUS', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(14, 'Austria', 'AT', 'AUT', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(15, 'Azerbaijan', 'AZ', 'AZE', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(16, 'Bahamas', 'BS', 'BHS', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(17, 'Bahrain', 'BH', 'BHR', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(18, 'Bangladesh', 'BD', 'BGD', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(19, 'Barbados', 'BB', 'BRB', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(20, 'Belarus', 'BY', 'BLR', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(21, 'Belgium', 'BE', 'BEL', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(22, 'Belize', 'BZ', 'BLZ', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(23, 'Benin', 'BJ', 'BEN', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(24, 'Bermuda', 'BM', 'BMU', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(25, 'Bhutan', 'BT', 'BTN', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(26, 'Bolivia', 'BO', 'BOL', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(27, 'Bosnia and Herzegowina', 'BA', 'BIH', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(28, 'Botswana', 'BW', 'BWA', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(29, 'Bouvet Island', 'BV', 'BVT', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(30, 'Brazil', 'BR', 'BRA', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(31, 'British Indian Ocean Territory', 'IO', 'IOT', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(32, 'Brunei Darussalam', 'BN', 'BRN', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(33, 'Bulgaria', 'BG', 'BGR', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(34, 'Burkina Faso', 'BF', 'BFA', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(35, 'Burundi', 'BI', 'BDI', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(36, 'Cambodia', 'KH', 'KHM', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(37, 'Cameroon', 'CM', 'CMR', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(38, 'Canada', 'CA', 'CAN', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(39, 'Cape Verde', 'CV', 'CPV', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(40, 'Cayman Islands', 'KY', 'CYM', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(41, 'Central African Republic', 'CF', 'CAF', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(42, 'Chad', 'TD', 'TCD', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(43, 'Chile', 'CL', 'CHL', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(44, 'China', 'CN', 'CHN', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(45, 'Christmas Island', 'CX', 'CXR', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(46, 'Cocos (Keeling) Islands', 'CC', 'CCK', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(47, 'Colombia', 'CO', 'COL', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(48, 'Comoros', 'KM', 'COM', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(49, 'Congo', 'CG', 'COG', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(50, 'Cook Islands', 'CK', 'COK', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(51, 'Costa Rica', 'CR', 'CRI', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(52, 'Cote D\'Ivoire', 'CI', 'CIV', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(53, 'Croatia', 'HR', 'HRV', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(54, 'Cuba', 'CU', 'CUB', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(55, 'Cyprus', 'CY', 'CYP', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(56, 'Czech Republic', 'CZ', 'CZE', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(57, 'Denmark', 'DK', 'DNK', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(58, 'Djibouti', 'DJ', 'DJI', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(59, 'Dominica', 'DM', 'DMA', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(60, 'Dominican Republic', 'DO', 'DOM', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(61, 'East Timor', 'TP', 'TMP', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(62, 'Ecuador', 'EC', 'ECU', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(63, 'Egypt', 'EG', 'EGY', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(64, 'El Salvador', 'SV', 'SLV', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(65, 'Equatorial Guinea', 'GQ', 'GNQ', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(66, 'Eritrea', 'ER', 'ERI', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(67, 'Estonia', 'EE', 'EST', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(68, 'Ethiopia', 'ET', 'ETH', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(69, 'Falkland Islands (Malvinas)', 'FK', 'FLK', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(70, 'Faroe Islands', 'FO', 'FRO', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(71, 'Fiji', 'FJ', 'FJI', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(72, 'Finland', 'FI', 'FIN', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(73, 'France', 'FR', 'FRA', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(74, 'France, Metropolitan', 'FX', 'FXX', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(75, 'French Guiana', 'GF', 'GUF', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(76, 'French Polynesia', 'PF', 'PYF', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(77, 'French Southern Territories', 'TF', 'ATF', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(78, 'Gabon', 'GA', 'GAB', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(79, 'Gambia', 'GM', 'GMB', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(80, 'Georgia', 'GE', 'GEO', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(81, 'Germany', 'DE', 'DEU', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(82, 'Ghana', 'GH', 'GHA', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(83, 'Gibraltar', 'GI', 'GIB', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(84, 'Greece', 'GR', 'GRC', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(85, 'Greenland', 'GL', 'GRL', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(86, 'Grenada', 'GD', 'GRD', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(87, 'Guadeloupe', 'GP', 'GLP', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(88, 'Guam', 'GU', 'GUM', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(89, 'Guatemala', 'GT', 'GTM', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(90, 'Guinea', 'GN', 'GIN', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(91, 'Guinea-bissau', 'GW', 'GNB', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(92, 'Guyana', 'GY', 'GUY', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(93, 'Haiti', 'HT', 'HTI', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(94, 'Heard and Mc Donald Islands', 'HM', 'HMD', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(95, 'Honduras', 'HN', 'HND', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(96, 'Hong Kong', 'HK', 'HKG', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(97, 'Hungary', 'HU', 'HUN', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(98, 'Iceland', 'IS', 'ISL', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(99, 'India', 'IN', 'IND', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(100, 'Indonesia', 'ID', 'IDN', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(101, 'Iran (Islamic Republic of)', 'IR', 'IRN', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(102, 'Iraq', 'IQ', 'IRQ', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(103, 'Ireland', 'IE', 'IRL', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(104, 'Israel', 'IL', 'ISR', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(105, 'Italy', 'IT', 'ITA', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(106, 'Jamaica', 'JM', 'JAM', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(107, 'Japan', 'JP', 'JPN', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(108, 'Jordan', 'JO', 'JOR', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(109, 'Kazakhstan', 'KZ', 'KAZ', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(110, 'Kenya', 'KE', 'KEN', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(111, 'Kiribati', 'KI', 'KIR', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(112, 'North Korea', 'KP', 'PRK', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(113, 'Korea, Republic of', 'KR', 'KOR', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(114, 'Kuwait', 'KW', 'KWT', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(115, 'Kyrgyzstan', 'KG', 'KGZ', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(116, 'Lao People\'s Democratic Republic', 'LA', 'LAO', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(117, 'Latvia', 'LV', 'LVA', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(118, 'Lebanon', 'LB', 'LBN', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(119, 'Lesotho', 'LS', 'LSO', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(120, 'Liberia', 'LR', 'LBR', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(121, 'Libyan Arab Jamahiriya', 'LY', 'LBY', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(122, 'Liechtenstein', 'LI', 'LIE', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(123, 'Lithuania', 'LT', 'LTU', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(124, 'Luxembourg', 'LU', 'LUX', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(125, 'Macau', 'MO', 'MAC', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(126, 'FYROM', 'MK', 'MKD', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(127, 'Madagascar', 'MG', 'MDG', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(128, 'Malawi', 'MW', 'MWI', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(129, 'Malaysia', 'MY', 'MYS', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(130, 'Maldives', 'MV', 'MDV', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(131, 'Mali', 'ML', 'MLI', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(132, 'Malta', 'MT', 'MLT', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(133, 'Marshall Islands', 'MH', 'MHL', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(134, 'Martinique', 'MQ', 'MTQ', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(135, 'Mauritania', 'MR', 'MRT', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(136, 'Mauritius', 'MU', 'MUS', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(137, 'Mayotte', 'YT', 'MYT', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(138, 'Mexico', 'MX', 'MEX', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(139, 'Micronesia, Federated States of', 'FM', 'FSM', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(140, 'Moldova, Republic of', 'MD', 'MDA', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(141, 'Monaco', 'MC', 'MCO', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(142, 'Mongolia', 'MN', 'MNG', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(143, 'Montserrat', 'MS', 'MSR', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(144, 'Morocco', 'MA', 'MAR', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(145, 'Mozambique', 'MZ', 'MOZ', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(146, 'Myanmar', 'MM', 'MMR', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(147, 'Namibia', 'NA', 'NAM', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(148, 'Nauru', 'NR', 'NRU', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(149, 'Nepal', 'NP', 'NPL', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(150, 'Netherlands', 'NL', 'NLD', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(151, 'Netherlands Antilles', 'AN', 'ANT', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(152, 'New Caledonia', 'NC', 'NCL', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(153, 'New Zealand', 'NZ', 'NZL', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(154, 'Nicaragua', 'NI', 'NIC', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(155, 'Niger', 'NE', 'NER', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(156, 'Nigeria', 'NG', 'NGA', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(157, 'Niue', 'NU', 'NIU', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(158, 'Norfolk Island', 'NF', 'NFK', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(159, 'Northern Mariana Islands', 'MP', 'MNP', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(160, 'Norway', 'NO', 'NOR', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(161, 'Oman', 'OM', 'OMN', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(162, 'Pakistan', 'PK', 'PAK', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(163, 'Palau', 'PW', 'PLW', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(164, 'Panama', 'PA', 'PAN', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(165, 'Papua New Guinea', 'PG', 'PNG', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(166, 'Paraguay', 'PY', 'PRY', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(167, 'Peru', 'PE', 'PER', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(168, 'Philippines', 'PH', 'PHL', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(169, 'Pitcairn', 'PN', 'PCN', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(170, 'Poland', 'PL', 'POL', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(171, 'Portugal', 'PT', 'PRT', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(172, 'Puerto Rico', 'PR', 'PRI', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(173, 'Qatar', 'QA', 'QAT', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(174, 'Reunion', 'RE', 'REU', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(175, 'Romania', 'RO', 'ROM', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(176, 'Russian Federation', 'RU', 'RUS', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(177, 'Rwanda', 'RW', 'RWA', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(178, 'Saint Kitts and Nevis', 'KN', 'KNA', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(179, 'Saint Lucia', 'LC', 'LCA', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(180, 'Saint Vincent and the Grenadines', 'VC', 'VCT', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(181, 'Samoa', 'WS', 'WSM', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(182, 'San Marino', 'SM', 'SMR', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(183, 'Sao Tome and Principe', 'ST', 'STP', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(184, 'Saudi Arabia', 'SA', 'SAU', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(185, 'Senegal', 'SN', 'SEN', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(186, 'Seychelles', 'SC', 'SYC', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(187, 'Sierra Leone', 'SL', 'SLE', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(188, 'Singapore', 'SG', 'SGP', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(189, 'Slovak Republic', 'SK', 'SVK', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(190, 'Slovenia', 'SI', 'SVN', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(191, 'Solomon Islands', 'SB', 'SLB', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(192, 'Somalia', 'SO', 'SOM', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(193, 'South Africa', 'ZA', 'ZAF', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(194, 'South Georgia &amp; South Sandwich Islands', 'GS', 'SGS', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(195, 'Spain', 'ES', 'ESP', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(196, 'Sri Lanka', 'LK', 'LKA', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(197, 'St. Helena', 'SH', 'SHN', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(198, 'St. Pierre and Miquelon', 'PM', 'SPM', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(199, 'Sudan', 'SD', 'SDN', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(200, 'Suriname', 'SR', 'SUR', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(201, 'Svalbard and Jan Mayen Islands', 'SJ', 'SJM', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(202, 'Swaziland', 'SZ', 'SWZ', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(203, 'Sweden', 'SE', 'SWE', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(204, 'Switzerland', 'CH', 'CHE', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(205, 'Syrian Arab Republic', 'SY', 'SYR', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(206, 'Taiwan', 'TW', 'TWN', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(207, 'Tajikistan', 'TJ', 'TJK', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(208, 'Tanzania, United Republic of', 'TZ', 'TZA', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(209, 'Thailand', 'TH', 'THA', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(210, 'Togo', 'TG', 'TGO', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(211, 'Tokelau', 'TK', 'TKL', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(212, 'Tonga', 'TO', 'TON', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(213, 'Trinidad and Tobago', 'TT', 'TTO', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(214, 'Tunisia', 'TN', 'TUN', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(215, 'Turkey', 'TR', 'TUR', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(216, 'Turkmenistan', 'TM', 'TKM', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(217, 'Turks and Caicos Islands', 'TC', 'TCA', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(218, 'Tuvalu', 'TV', 'TUV', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(219, 'Uganda', 'UG', 'UGA', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(220, 'Ukraine', 'UA', 'UKR', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(221, 'United Arab Emirates', 'AE', 'ARE', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(222, 'United Kingdom', 'GB', 'GBR', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(223, 'United States', 'US', 'USA', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(224, 'United States Minor Outlying Islands', 'UM', 'UMI', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(225, 'Uruguay', 'UY', 'URY', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(226, 'Uzbekistan', 'UZ', 'UZB', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(227, 'Vanuatu', 'VU', 'VUT', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(228, 'Vatican City State (Holy See)', 'VA', 'VAT', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(229, 'Venezuela', 'VE', 'VEN', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(230, 'Viet Nam', 'VN', 'VNM', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(231, 'Virgin Islands (British)', 'VG', 'VGB', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(232, 'Virgin Islands (U.S.)', 'VI', 'VIR', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(233, 'Wallis and Futuna Islands', 'WF', 'WLF', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(234, 'Western Sahara', 'EH', 'ESH', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(235, 'Yemen', 'YE', 'YEM', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(236, 'Yugoslavia', 'YU', 'YUG', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(237, 'Democratic Republic of Congo', 'CD', 'COD', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(238, 'Zambia', 'ZM', 'ZMB', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(239, 'Zimbabwe', 'ZW', 'ZWE', '{address_1}\\n{address_2}\\n{city} {postcode} {state}\\n{country}', 1, 999, '2024-12-31 17:34:40', '2024-12-31 17:34:40');

-- --------------------------------------------------------

--
-- Structure de la table `ti_currencies`
--

DROP TABLE IF EXISTS `ti_currencies`;
CREATE TABLE IF NOT EXISTS `ti_currencies` (
  `currency_id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `country_id` int NOT NULL,
  `currency_name` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `currency_code` varchar(3) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `currency_symbol` varchar(3) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `currency_rate` decimal(15,8) NOT NULL,
  `symbol_position` tinyint(1) DEFAULT NULL,
  `thousand_sign` char(1) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `decimal_sign` char(1) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `decimal_position` char(1) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `iso_alpha2` varchar(2) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `iso_alpha3` varchar(3) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `iso_numeric` int DEFAULT NULL,
  `currency_status` int DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL,
  PRIMARY KEY (`currency_id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Déargement des donné de la table `ti_currencies`
--

INSERT INTO `ti_currencies` (`currency_id`, `country_id`, `currency_name`, `currency_code`, `currency_symbol`, `currency_rate`, `symbol_position`, `thousand_sign`, `decimal_sign`, `decimal_position`, `iso_alpha2`, `iso_alpha3`, `iso_numeric`, `currency_status`, `updated_at`, `created_at`) VALUES
(1, 222, 'Pound Sterling', 'GBP', '£', 0.00000000, 0, ',', '.', '2', 'GB', 'GBR', 826, 1, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(2, 223, 'US Dollar', 'USD', '$', 0.00000000, 0, ',', '.', '2', 'US', 'USA', 840, 1, '2024-12-31 19:39:36', '2024-12-31 17:34:40'),
(3, 44, 'Yuan Renminbi', 'CNY', '¥', 0.00000000, 0, ',', '.', '2', 'CN', 'CHN', 156, 0, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(4, 13, 'Australian Dollar', 'AUD', '$', 0.00000000, 0, ',', '.', '2', 'AU', 'AUS', 36, 1, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(5, 156, 'Naira', 'NGN', '', 0.00000000, 0, ',', '.', '2', 'NG', 'NGA', 566, 1, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(6, 81, 'EURO', 'EUR', '', 0.00000000, 0, ',', '.', '2', NULL, NULL, NULL, 1, '2025-01-01 11:47:27', '2025-01-01 11:47:12');

-- --------------------------------------------------------

--
-- Structure de la table `ti_customers`
--

DROP TABLE IF EXISTS `ti_customers`;
CREATE TABLE IF NOT EXISTS `ti_customers` (
  `customer_id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `first_name` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `last_name` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(96) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `password` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `telephone` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `address_id` int DEFAULT NULL,
  `newsletter` tinyint(1) DEFAULT NULL,
  `customer_group_id` int NOT NULL,
  `ip_address` varchar(40) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `status` tinyint(1) NOT NULL,
  `reset_code` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `reset_time` datetime DEFAULT NULL,
  `activation_code` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `remember_token` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_activated` tinyint(1) DEFAULT NULL,
  `date_activated` datetime DEFAULT NULL,
  `last_login` datetime DEFAULT NULL,
  `last_seen` datetime DEFAULT NULL,
  `updated_at` timestamp NOT NULL,
  `last_location_area` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`customer_id`),
  UNIQUE KEY `ti_customers_email_unique` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Déargement des donné de la table `ti_customers`
--

INSERT INTO `ti_customers` (`customer_id`, `first_name`, `last_name`, `email`, `password`, `telephone`, `address_id`, `newsletter`, `customer_group_id`, `ip_address`, `created_at`, `status`, `reset_code`, `reset_time`, `activation_code`, `remember_token`, `is_activated`, `date_activated`, `last_login`, `last_seen`, `updated_at`, `last_location_area`) VALUES
(1, 'oussama', 'douba', 'douba.oussama69@gmail.com', '$2y$10$tM93JeKEdXy7VBcuX7c5z.Bqlg3QYxnOGQ1HhXpSNCEV0b7tYsU9y', '+213671409293', 22, 1, 1, NULL, '2025-01-04 20:52:53', 1, NULL, NULL, NULL, '3Z3NoOoP9u802GkGaZzFONl23z6oIFWo3DaLdcJK67', 1, '2025-01-04 20:52:53', NULL, '2025-02-16 19:11:29', '2025-02-16 19:11:29', ''),
(2, 'Navier', 'Stockes', 'navier@test.com', '$2y$10$fduWWu9xwONOuGwVILMgueFB1ia1cvotPQCSe0R58nvjCkAgCgDI.', '+33565778899', 30, 1, 1, NULL, '2025-02-17 17:22:40', 1, NULL, NULL, NULL, NULL, 1, '2025-02-17 17:22:40', NULL, '2025-02-17 17:27:57', '2025-02-17 17:28:10', '');

-- --------------------------------------------------------

--
-- Structure de la table `ti_customer_groups`
--

DROP TABLE IF EXISTS `ti_customer_groups`;
CREATE TABLE IF NOT EXISTS `ti_customer_groups` (
  `customer_group_id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `group_name` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `approval` tinyint(1) NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`customer_group_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Déargement des donné de la table `ti_customer_groups`
--

INSERT INTO `ti_customer_groups` (`customer_group_id`, `group_name`, `description`, `approval`, `created_at`, `updated_at`) VALUES
(1, 'Default group', NULL, 0, '2024-12-31 17:34:40', '2024-12-31 17:34:40');

-- --------------------------------------------------------

--
-- Structure de la table `ti_extensions`
--

DROP TABLE IF EXISTS `ti_extensions`;
CREATE TABLE IF NOT EXISTS `ti_extensions` (
  `extension_id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `version` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '1.0.0',
  PRIMARY KEY (`extension_id`),
  UNIQUE KEY `ti_extensions_name_unique` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Déargement des donné de la table `ti_extensions`
--

INSERT INTO `ti_extensions` (`extension_id`, `name`, `version`) VALUES
(1, 'igniter.cart', '2.19.6'),
(2, 'igniter.frontend', 'v1.10.5'),
(3, 'igniter.pages', 'v1.10.3'),
(4, 'igniter.local', 'v2.10.3'),
(5, 'igniter.payregister', 'v2.7.3'),
(6, 'igniter.reservation', 'v2.10.3'),
(7, 'igniter.user', '1.13.3'),
(8, 'igniter.automation', 'v1.8.3'),
(9, 'igniter.api', '0.1.0'),
(10, 'igniter.broadcast', '0.1.0'),
(11, 'igniter.coupons', '0.1.0'),
(12, 'igniter.socialite', '0.1.0'),
(13, 'igniter.debugbar', '0.1.0');

-- --------------------------------------------------------

--
-- Structure de la table `ti_extension_settings`
--

DROP TABLE IF EXISTS `ti_extension_settings`;
CREATE TABLE IF NOT EXISTS `ti_extension_settings` (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `item` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `data` json DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ti_extension_settings_item_unique` (`item`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Déargement des donné de la table `ti_extension_settings`
--

INSERT INTO `ti_extension_settings` (`id`, `item`, `data`) VALUES
(1, 'igniter_review_settings', '{\"ratings\": {\"ratings\": [\"Bad\", \"Worse\", \"Good\", \"Average\", \"Excellent\"]}, \"allow_reviews\": \"1\", \"approve_reviews\": \"1\"}'),
(2, 'igniter_cart_settings', '{\"conditions\": {\"tax\": {\"name\": \"tax\", \"label\": \"lang:igniter.cart::default.text_vat\", \"status\": \"1\", \"priority\": 3}, \"tip\": {\"name\": \"tip\", \"label\": \"lang:igniter.cart::default.text_tip\", \"status\": \"1\", \"priority\": 4}, \"coupon\": {\"name\": \"coupon\", \"label\": \"lang:igniter.coupons::default.text_coupon\", \"status\": \"1\", \"priority\": 0}, \"delivery\": {\"name\": \"delivery\", \"label\": \"lang:igniter.local::default.text_delivery\", \"status\": \"1\", \"priority\": 1}, \"paymentFee\": {\"name\": \"paymentFee\", \"label\": \"lang:igniter.cart::default.text_payment_fee\", \"status\": \"1\", \"priority\": 2}}, \"tip_amounts\": [], \"abandoned_cart\": \"0\", \"enable_tipping\": \"0\", \"tip_value_type\": \"F\", \"destroy_on_logout\": \"0\"}'),
(3, 'igniter_broadcast_settings', '{\"key\": \"0a7b52814ff6684a574d\", \"app_id\": \"1943101\", \"secret\": \"3cd01dee25a88886dc90\", \"cluster\": \"eu\", \"encrypted\": \"1\"}');

-- --------------------------------------------------------

--
-- Structure de la table `ti_failed_jobs`
--

DROP TABLE IF EXISTS `ti_failed_jobs`;
CREATE TABLE IF NOT EXISTS `ti_failed_jobs` (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `uuid` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `connection` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `queue` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `exception` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `failed_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ti_failed_jobs_uuid_unique` (`uuid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Structure de la table `ti_igniter_automation_logs`
--

DROP TABLE IF EXISTS `ti_igniter_automation_logs`;
CREATE TABLE IF NOT EXISTS `ti_igniter_automation_logs` (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `automation_rule_id` bigint UNSIGNED DEFAULT NULL,
  `rule_action_id` bigint UNSIGNED DEFAULT NULL,
  `is_success` tinyint(1) NOT NULL,
  `message` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `params` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `exception` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `ti_igniter_automation_logs_automation_rule_id_foreign` (`automation_rule_id`),
  KEY `ti_igniter_automation_logs_rule_action_id_foreign` (`rule_action_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Structure de la table `ti_igniter_automation_rules`
--

DROP TABLE IF EXISTS `ti_igniter_automation_rules`;
CREATE TABLE IF NOT EXISTS `ti_igniter_automation_rules` (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `event_class` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `config_data` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `is_custom` tinyint(1) NOT NULL DEFAULT '0',
  `status` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Déargement des donné de la table `ti_igniter_automation_rules`
--

INSERT INTO `ti_igniter_automation_rules` (`id`, `name`, `code`, `description`, `event_class`, `config_data`, `is_custom`, `status`, `created_at`, `updated_at`) VALUES
(1, 'Send a message to leave a review after 24 hours', 'chase_review_after_one_day', '', 'Igniter\\Automation\\AutomationRules\\Events\\OrderSchedule', NULL, 0, 0, '2024-12-31 19:39:57', '2024-12-31 19:39:57');

-- --------------------------------------------------------

--
-- Structure de la table `ti_igniter_automation_rule_actions`
--

DROP TABLE IF EXISTS `ti_igniter_automation_rule_actions`;
CREATE TABLE IF NOT EXISTS `ti_igniter_automation_rule_actions` (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `automation_rule_id` bigint UNSIGNED DEFAULT NULL,
  `class_name` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `options` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `ti_igniter_actions_automation_rule_id_foreign` (`automation_rule_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Déargement des donné de la table `ti_igniter_automation_rule_actions`
--

INSERT INTO `ti_igniter_automation_rule_actions` (`id`, `automation_rule_id`, `class_name`, `options`, `created_at`, `updated_at`) VALUES
(1, 1, 'Igniter\\Automation\\AutomationRules\\Actions\\SendMailTemplate', '{\"template\":\"igniter.local::mail.review_chase\",\"send_to\":\"customer\"}', '2024-12-31 19:39:57', '2024-12-31 19:39:57');

-- --------------------------------------------------------

--
-- Structure de la table `ti_igniter_automation_rule_conditions`
--

DROP TABLE IF EXISTS `ti_igniter_automation_rule_conditions`;
CREATE TABLE IF NOT EXISTS `ti_igniter_automation_rule_conditions` (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `automation_rule_id` bigint UNSIGNED DEFAULT NULL,
  `class_name` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `options` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `ti_igniter_conditions_automation_rule_id_foreign` (`automation_rule_id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Déargement des donné de la table `ti_igniter_automation_rule_conditions`
--

INSERT INTO `ti_igniter_automation_rule_conditions` (`id`, `automation_rule_id`, `class_name`, `options`, `created_at`, `updated_at`) VALUES
(1, 1, 'Igniter\\Local\\AutomationRules\\Conditions\\ReviewCount', '[{\"attribute\":\"review_count\",\"value\":\"0\",\"operator\":\"is\"}]', '2024-12-31 19:39:57', '2024-12-31 19:39:57'),
(2, 1, 'Igniter\\Cart\\AutomationRules\\Conditions\\OrderAttribute', '[{\"attribute\":\"hours_since\",\"value\":\"24\",\"operator\":\"is\"}]', '2024-12-31 19:39:57', '2024-12-31 19:39:57');

-- --------------------------------------------------------

--
-- Structure de la table `ti_igniter_cart_cart`
--

DROP TABLE IF EXISTS `ti_igniter_cart_cart`;
CREATE TABLE IF NOT EXISTS `ti_igniter_cart_cart` (
  `identifier` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `instance` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`identifier`,`instance`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Structure de la table `ti_igniter_coupons`
--

DROP TABLE IF EXISTS `ti_igniter_coupons`;
CREATE TABLE IF NOT EXISTS `ti_igniter_coupons` (
  `coupon_id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `type` char(1) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `discount` decimal(15,4) DEFAULT NULL,
  `min_total` decimal(15,4) DEFAULT NULL,
  `redemptions` int NOT NULL DEFAULT '0',
  `customer_redemptions` int NOT NULL DEFAULT '0',
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `status` tinyint(1) DEFAULT NULL,
  `created_at` date NOT NULL,
  `validity` char(15) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `fixed_date` date DEFAULT NULL,
  `fixed_from_time` time DEFAULT NULL,
  `fixed_to_time` time DEFAULT NULL,
  `period_start_date` date DEFAULT NULL,
  `period_end_date` date DEFAULT NULL,
  `recurring_every` varchar(35) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `recurring_from_time` time DEFAULT NULL,
  `recurring_to_time` time DEFAULT NULL,
  `order_restriction` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `apply_coupon_on` enum('whole_cart','menu_items','delivery_fee') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'whole_cart',
  `auto_apply` tinyint(1) NOT NULL DEFAULT '0',
  `updated_at` timestamp NOT NULL,
  PRIMARY KEY (`coupon_id`),
  UNIQUE KEY `code` (`code`),
  UNIQUE KEY `ti_igniter_coupons_code_unique` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Déargement des donné de la table `ti_igniter_coupons`
--

INSERT INTO `ti_igniter_coupons` (`coupon_id`, `name`, `code`, `type`, `discount`, `min_total`, `redemptions`, `customer_redemptions`, `description`, `status`, `created_at`, `validity`, `fixed_date`, `fixed_from_time`, `fixed_to_time`, `period_start_date`, `period_end_date`, `recurring_every`, `recurring_from_time`, `recurring_to_time`, `order_restriction`, `apply_coupon_on`, `auto_apply`, `updated_at`) VALUES
(1, 'Half Sundays', '2222', 'F', 100.0000, 500.0000, 0, 0, NULL, 1, '2024-12-31', 'forever', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'whole_cart', 0, '0000-00-00 00:00:00'),
(2, 'Half Tuesdays', '3333', 'P', 30.0000, 1000.0000, 0, 0, NULL, 1, '2024-12-31', 'forever', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'whole_cart', 0, '0000-00-00 00:00:00'),
(3, 'Full Mondays', 'MTo6TuTg', 'P', 50.0000, 0.0000, 0, 1, NULL, 1, '2024-12-31', 'forever', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'whole_cart', 0, '0000-00-00 00:00:00'),
(4, 'Full Tuesdays', '4444', 'F', 500.0000, 5000.0000, 0, 0, NULL, 1, '2024-12-31', 'forever', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'whole_cart', 0, '0000-00-00 00:00:00');

-- --------------------------------------------------------

--
-- Structure de la table `ti_igniter_coupons_history`
--

DROP TABLE IF EXISTS `ti_igniter_coupons_history`;
CREATE TABLE IF NOT EXISTS `ti_igniter_coupons_history` (
  `coupon_history_id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `coupon_id` bigint UNSIGNED NOT NULL,
  `order_id` bigint UNSIGNED DEFAULT NULL,
  `customer_id` bigint UNSIGNED DEFAULT NULL,
  `code` varchar(15) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `min_total` decimal(15,4) DEFAULT NULL,
  `amount` decimal(15,4) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `status` tinyint(1) NOT NULL,
  `updated_at` timestamp NOT NULL,
  PRIMARY KEY (`coupon_history_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Structure de la table `ti_igniter_coupon_categories`
--

DROP TABLE IF EXISTS `ti_igniter_coupon_categories`;
CREATE TABLE IF NOT EXISTS `ti_igniter_coupon_categories` (
  `coupon_id` int UNSIGNED NOT NULL,
  `category_id` int UNSIGNED NOT NULL,
  UNIQUE KEY `ti_igniter_coupon_categories_coupon_id_category_id_unique` (`coupon_id`,`category_id`),
  KEY `ti_igniter_coupon_categories_coupon_id_index` (`coupon_id`),
  KEY `ti_igniter_coupon_categories_category_id_index` (`category_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Structure de la table `ti_igniter_coupon_customers`
--

DROP TABLE IF EXISTS `ti_igniter_coupon_customers`;
CREATE TABLE IF NOT EXISTS `ti_igniter_coupon_customers` (
  `coupon_id` bigint UNSIGNED NOT NULL,
  `customer_id` bigint UNSIGNED NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Structure de la table `ti_igniter_coupon_customer_groups`
--

DROP TABLE IF EXISTS `ti_igniter_coupon_customer_groups`;
CREATE TABLE IF NOT EXISTS `ti_igniter_coupon_customer_groups` (
  `coupon_id` bigint UNSIGNED NOT NULL,
  `customer_group_id` bigint UNSIGNED NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Structure de la table `ti_igniter_coupon_menus`
--

DROP TABLE IF EXISTS `ti_igniter_coupon_menus`;
CREATE TABLE IF NOT EXISTS `ti_igniter_coupon_menus` (
  `coupon_id` int UNSIGNED NOT NULL,
  `menu_id` int UNSIGNED NOT NULL,
  UNIQUE KEY `ti_igniter_coupon_menus_coupon_id_menu_id_unique` (`coupon_id`,`menu_id`),
  KEY `ti_igniter_coupon_menus_coupon_id_index` (`coupon_id`),
  KEY `ti_igniter_coupon_menus_menu_id_index` (`menu_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Structure de la table `ti_igniter_frontend_banners`
--

DROP TABLE IF EXISTS `ti_igniter_frontend_banners`;
CREATE TABLE IF NOT EXISTS `ti_igniter_frontend_banners` (
  `banner_id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `type` char(8) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `click_url` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `language_id` int NOT NULL,
  `alt_text` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `image_code` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `custom_code` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `status` tinyint(1) NOT NULL,
  PRIMARY KEY (`banner_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Structure de la table `ti_igniter_frontend_sliders`
--

DROP TABLE IF EXISTS `ti_igniter_frontend_sliders`;
CREATE TABLE IF NOT EXISTS `ti_igniter_frontend_sliders` (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `metadata` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ti_igniter_frontend_sliders_code_unique` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Déargement des donné de la table `ti_igniter_frontend_sliders`
--

INSERT INTO `ti_igniter_frontend_sliders` (`id`, `name`, `code`, `metadata`, `created_at`, `updated_at`) VALUES
(1, 'Homepage slider', 'home-slider', NULL, '2024-12-31 19:17:37', '2024-12-31 19:17:37');

-- --------------------------------------------------------

--
-- Structure de la table `ti_igniter_frontend_subscribers`
--

DROP TABLE IF EXISTS `ti_igniter_frontend_subscribers`;
CREATE TABLE IF NOT EXISTS `ti_igniter_frontend_subscribers` (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `statistics` int NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Structure de la table `ti_igniter_pages_menus`
--

DROP TABLE IF EXISTS `ti_igniter_pages_menus`;
CREATE TABLE IF NOT EXISTS `ti_igniter_pages_menus` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `theme_code` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `ti_igniter_pages_menus_theme_code_index` (`theme_code`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Déargement des donné de la table `ti_igniter_pages_menus`
--

INSERT INTO `ti_igniter_pages_menus` (`id`, `theme_code`, `name`, `code`, `created_at`, `updated_at`) VALUES
(1, 'tastyigniter-orange', 'Footer menu', 'footer-menu', '2024-12-31 19:17:38', '2024-12-31 19:17:38'),
(2, 'tastyigniter-orange', 'Main menu', 'main-menu', '2024-12-31 19:17:38', '2024-12-31 19:17:38'),
(3, 'tastyigniter-orange', 'Pages menu', 'pages-menu', '2024-12-31 19:17:38', '2024-12-31 19:17:38'),
(4, 'tastyigniter-typical', 'Footer menu', 'footer-menu', '2024-12-31 19:17:38', '2024-12-31 19:17:38'),
(5, 'tastyigniter-typical', 'Pages menu', 'pages-menu', '2024-12-31 19:17:38', '2024-12-31 19:17:38'),
(6, 'tastyigniter-typical', 'Main menu', 'typical-main-menu', '2024-12-31 19:17:38', '2024-12-31 19:17:38'),
(7, 'tastyigniter-typical', 'Right menu', 'typical-right-menu', '2024-12-31 19:17:38', '2024-12-31 19:17:38');

-- --------------------------------------------------------

--
-- Structure de la table `ti_igniter_pages_menu_items`
--

DROP TABLE IF EXISTS `ti_igniter_pages_menu_items`;
CREATE TABLE IF NOT EXISTS `ti_igniter_pages_menu_items` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `menu_id` int UNSIGNED NOT NULL,
  `parent_id` int UNSIGNED DEFAULT NULL,
  `title` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `type` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `url` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `reference` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `config` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `nest_left` int DEFAULT NULL,
  `nest_right` int DEFAULT NULL,
  `priority` int NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `ti_igniter_pages_menu_items_menu_id_index` (`menu_id`),
  KEY `ti_igniter_pages_menu_items_parent_id_index` (`parent_id`)
) ENGINE=InnoDB AUTO_INCREMENT=40 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Déargement des donné de la table `ti_igniter_pages_menu_items`
--

INSERT INTO `ti_igniter_pages_menu_items` (`id`, `menu_id`, `parent_id`, `title`, `code`, `description`, `type`, `url`, `reference`, `config`, `nest_left`, `nest_right`, `priority`, `created_at`, `updated_at`) VALUES
(1, 1, NULL, 'TastyIgniter', '', NULL, 'header', NULL, NULL, '[]', 1, 8, 1, '2024-12-31 19:17:38', '2024-12-31 19:17:38'),
(2, 1, 1, 'main::lang.menu_menu', '', NULL, 'theme-page', NULL, 'local/menus', '[]', 2, 3, 2, '2024-12-31 19:17:38', '2024-12-31 19:17:38'),
(3, 1, 1, 'main::lang.menu_reservation', '', NULL, 'theme-page', NULL, 'reservation/reservation', '[]', 4, 5, 3, '2024-12-31 19:17:38', '2024-12-31 19:17:38'),
(4, 1, 1, 'main::lang.menu_locations', '', NULL, 'theme-page', NULL, 'locations', '[]', 6, 7, 4, '2024-12-31 19:17:38', '2024-12-31 19:17:38'),
(5, 1, NULL, 'main::lang.text_information', '', NULL, 'header', NULL, NULL, '[]', 9, 18, 5, '2024-12-31 19:17:38', '2024-12-31 19:17:38'),
(6, 1, 5, 'main::lang.menu_contact', '', NULL, 'theme-page', NULL, 'contact', '[]', 10, 11, 6, '2024-12-31 19:17:38', '2024-12-31 19:17:38'),
(7, 1, 5, 'main::lang.menu_admin', '', NULL, 'url', 'http://197.140.11.160:8004/admin', NULL, '[]', 12, 13, 7, '2024-12-31 19:17:38', '2024-12-31 19:17:38'),
(8, 1, 5, 'About Us', '', NULL, 'static-page', NULL, '1', '[]', 14, 15, 8, '2024-12-31 19:17:38', '2024-12-31 19:17:38'),
(9, 1, 5, 'Privacy Policy', '', NULL, 'static-page', NULL, '2', '[]', 16, 17, 9, '2024-12-31 19:17:38', '2024-12-31 19:17:38'),
(10, 2, NULL, 'main::lang.menu_menu', 'view-menu', NULL, 'theme-page', NULL, 'local/menus', '[]', 19, 20, 10, '2024-12-31 19:17:38', '2024-12-31 19:17:38'),
(11, 2, NULL, 'main::lang.menu_reservation', 'reservation', NULL, 'theme-page', NULL, 'reservation/reservation', '[]', 21, 22, 11, '2024-12-31 19:17:38', '2024-12-31 19:17:38'),
(12, 2, NULL, 'main::lang.menu_login', 'login', NULL, 'theme-page', NULL, 'account/login', '[]', 23, 24, 12, '2024-12-31 19:17:38', '2024-12-31 19:17:38'),
(13, 2, NULL, 'main::lang.menu_register', 'register', NULL, 'theme-page', NULL, 'account/register', '[]', 25, 26, 13, '2024-12-31 19:17:38', '2024-12-31 19:17:38'),
(14, 2, NULL, 'main::lang.menu_my_account', 'account', NULL, 'theme-page', NULL, 'account/account', '[]', 27, 38, 14, '2024-12-31 19:17:38', '2024-12-31 19:17:38'),
(15, 2, 14, 'main::lang.menu_recent_order', 'recent-orders', NULL, 'theme-page', NULL, 'account/orders', '[]', 28, 29, 15, '2024-12-31 19:17:38', '2024-12-31 19:17:38'),
(16, 2, 14, 'main::lang.menu_my_account', '', NULL, 'theme-page', NULL, 'account/account', '[]', 30, 31, 16, '2024-12-31 19:17:38', '2024-12-31 19:17:38'),
(17, 2, 14, 'main::lang.menu_address', '', NULL, 'theme-page', NULL, 'account/address', '[]', 32, 33, 17, '2024-12-31 19:17:38', '2024-12-31 19:17:38'),
(18, 2, 14, 'main::lang.menu_recent_reservation', '', NULL, 'theme-page', NULL, 'account/reservations', '[]', 34, 35, 18, '2024-12-31 19:17:38', '2024-12-31 19:17:38'),
(19, 2, 14, 'main::lang.menu_logout', '', NULL, 'url', 'javascript:;', NULL, '{\"extraAttributes\":\"data-request=\\\"session::onLogout\\\"\"}', 36, 37, 19, '2024-12-31 19:17:38', '2024-12-31 19:17:38'),
(20, 3, NULL, 'Pages', '', NULL, 'all-static-pages', NULL, '', '[]', 39, 40, 20, '2024-12-31 19:17:38', '2024-12-31 19:17:38'),
(21, 4, NULL, 'TastyIgniter', '', NULL, 'header', NULL, NULL, '[]', 41, 48, 21, '2024-12-31 19:17:38', '2024-12-31 19:17:38'),
(22, 4, 21, 'main::lang.menu_menu', '', NULL, 'theme-page', NULL, 'local/menus', '[]', 42, 43, 22, '2024-12-31 19:17:38', '2024-12-31 19:17:38'),
(23, 4, 21, 'main::lang.menu_reservation', '', NULL, 'theme-page', NULL, 'reservation/reservation', '[]', 44, 45, 23, '2024-12-31 19:17:38', '2024-12-31 19:17:38'),
(24, 4, 21, 'main::lang.menu_locations', '', NULL, 'theme-page', NULL, 'locations', '[]', 46, 47, 24, '2024-12-31 19:17:38', '2024-12-31 19:17:38'),
(25, 4, NULL, 'main::lang.text_information', '', NULL, 'header', NULL, NULL, '[]', 49, 58, 25, '2024-12-31 19:17:38', '2024-12-31 19:17:38'),
(26, 4, 25, 'main::lang.menu_contact', '', NULL, 'theme-page', NULL, 'contact', '[]', 50, 51, 26, '2024-12-31 19:17:38', '2024-12-31 19:17:38'),
(27, 4, 25, 'main::lang.menu_admin', '', NULL, 'url', 'http://197.140.11.160:8004/admin', NULL, '[]', 52, 53, 27, '2024-12-31 19:17:38', '2024-12-31 19:17:38'),
(28, 4, 25, 'About Us', '', NULL, 'static-page', NULL, '1', '[]', 54, 55, 28, '2024-12-31 19:17:38', '2024-12-31 19:17:38'),
(29, 4, 25, 'Privacy Policy', '', NULL, 'static-page', NULL, '2', '[]', 56, 57, 29, '2024-12-31 19:17:38', '2024-12-31 19:17:38'),
(30, 5, NULL, 'Pages', '', NULL, 'all-static-pages', NULL, '', '[]', 59, 60, 30, '2024-12-31 19:17:38', '2024-12-31 19:17:38'),
(31, 6, NULL, 'main::lang.menu_menu', 'view-menu', NULL, 'theme-page', NULL, 'local/menus', '[]', 61, 62, 31, '2024-12-31 19:17:38', '2024-12-31 19:17:38'),
(32, 6, NULL, 'main::lang.menu_reservation', 'reservation', NULL, 'theme-page', NULL, 'reservation/reservation', '[]', 63, 64, 32, '2024-12-31 19:17:38', '2024-12-31 19:17:38'),
(33, 6, NULL, 'History', 'history', NULL, 'theme-page', NULL, 'our-history', '[]', 65, 66, 33, '2024-12-31 19:17:38', '2024-12-31 19:17:38'),
(34, 7, NULL, 'main::lang.menu_my_account', 'account', NULL, 'theme-page', NULL, 'account/account', '[]', 67, 78, 34, '2024-12-31 19:17:38', '2024-12-31 19:17:38'),
(35, 7, 34, 'main::lang.menu_recent_order', 'recent-orders', NULL, 'theme-page', NULL, 'account/orders', '[]', 68, 69, 35, '2024-12-31 19:17:38', '2024-12-31 19:17:38'),
(36, 7, 34, 'main::lang.menu_my_account', '', NULL, 'theme-page', NULL, 'account/account', '[]', 70, 71, 36, '2024-12-31 19:17:38', '2024-12-31 19:17:38'),
(37, 7, 34, 'main::lang.menu_address', '', NULL, 'theme-page', NULL, 'account/address', '[]', 72, 73, 37, '2024-12-31 19:17:38', '2024-12-31 19:17:38'),
(38, 7, 34, 'main::lang.menu_recent_reservation', '', NULL, 'theme-page', NULL, 'account/reservations', '[]', 74, 75, 38, '2024-12-31 19:17:38', '2024-12-31 19:17:38'),
(39, 7, 34, 'main::lang.menu_logout', '', NULL, 'url', 'javascript:;', NULL, '{\"extraAttributes\":\"data-request=\\\"session::onLogout\\\"\"}', 76, 77, 39, '2024-12-31 19:17:38', '2024-12-31 19:17:38');

-- --------------------------------------------------------

--
-- Structure de la table `ti_igniter_reviews`
--

DROP TABLE IF EXISTS `ti_igniter_reviews`;
CREATE TABLE IF NOT EXISTS `ti_igniter_reviews` (
  `review_id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `customer_id` bigint UNSIGNED DEFAULT NULL,
  `sale_id` bigint UNSIGNED DEFAULT NULL,
  `sale_type` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `author` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `location_id` bigint UNSIGNED DEFAULT NULL,
  `quality` int NOT NULL,
  `delivery` int NOT NULL,
  `service` int NOT NULL,
  `review_text` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `created_at` datetime NOT NULL,
  `review_status` tinyint(1) NOT NULL,
  `updated_at` timestamp NOT NULL,
  PRIMARY KEY (`review_id`),
  KEY `ti_igniter_reviews_review_id_sale_type_sale_id_index` (`review_id`,`sale_type`,`sale_id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Déargement des donné de la table `ti_igniter_reviews`
--

INSERT INTO `ti_igniter_reviews` (`review_id`, `customer_id`, `sale_id`, `sale_type`, `author`, `location_id`, `quality`, `delivery`, `service`, `review_text`, `created_at`, `review_status`, `updated_at`) VALUES
(1, 1, 3, 'orders', 'oussama douba', 1, 5, 5, 5, 'Good Service', '2025-01-05 19:20:42', 0, '2025-01-05 19:20:42'),
(2, 1, 1, 'orders', NULL, 1, 5, 4, 4, 'Very Good', '2025-01-05 19:21:22', 1, '2025-01-05 19:21:22'),
(3, 1, 1, 'reservations', NULL, 1, 5, 5, 5, 'ss', '2025-03-11 22:44:51', 1, '2025-03-11 21:44:51');

-- --------------------------------------------------------

--
-- Structure de la table `ti_igniter_socialite_providers`
--

DROP TABLE IF EXISTS `ti_igniter_socialite_providers`;
CREATE TABLE IF NOT EXISTS `ti_igniter_socialite_providers` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` int UNSIGNED DEFAULT NULL,
  `provider` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `provider_id` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `token` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_type` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `provider_token_index` (`provider`,`token`),
  KEY `ti_igniter_socialite_providers_user_id_index` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Structure de la table `ti_jobs`
--

DROP TABLE IF EXISTS `ti_jobs`;
CREATE TABLE IF NOT EXISTS `ti_jobs` (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `queue` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `attempts` tinyint UNSIGNED NOT NULL,
  `reserved_at` int UNSIGNED DEFAULT NULL,
  `available_at` int UNSIGNED NOT NULL,
  `created_at` int UNSIGNED NOT NULL,
  PRIMARY KEY (`id`),
  KEY `ti_jobs_queue_index` (`queue`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Structure de la table `ti_job_batches`
--

DROP TABLE IF EXISTS `ti_job_batches`;
CREATE TABLE IF NOT EXISTS `ti_job_batches` (
  `id` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `total_jobs` int NOT NULL,
  `pending_jobs` int NOT NULL,
  `failed_jobs` int NOT NULL,
  `failed_job_ids` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `options` mediumtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `cancelled_at` int DEFAULT NULL,
  `created_at` int NOT NULL,
  `finished_at` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Structure de la table `ti_languages`
--

DROP TABLE IF EXISTS `ti_languages`;
CREATE TABLE IF NOT EXISTS `ti_languages` (
  `language_id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `code` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `image` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `idiom` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` tinyint(1) NOT NULL,
  `can_delete` tinyint(1) NOT NULL,
  `original_id` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `version` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`language_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Déargement des donné de la table `ti_languages`
--

INSERT INTO `ti_languages` (`language_id`, `code`, `name`, `image`, `idiom`, `status`, `can_delete`, `original_id`, `created_at`, `updated_at`, `version`) VALUES
(1, 'en', 'English', NULL, 'english', 1, 0, NULL, '2024-12-31 17:34:40', '2024-12-31 17:34:40', NULL);

-- --------------------------------------------------------

--
-- Structure de la table `ti_language_translations`
--

DROP TABLE IF EXISTS `ti_language_translations`;
CREATE TABLE IF NOT EXISTS `ti_language_translations` (
  `translation_id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `locale` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `namespace` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '*',
  `group` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `item` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `text` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `unstable` tinyint(1) NOT NULL DEFAULT '0',
  `locked` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`translation_id`),
  UNIQUE KEY `ti_language_translations_locale_namespace_group_item_unique` (`locale`,`namespace`,`group`,`item`),
  KEY `ti_language_translations_group_index` (`group`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Structure de la table `ti_locationables`
--

DROP TABLE IF EXISTS `ti_locationables`;
CREATE TABLE IF NOT EXISTS `ti_locationables` (
  `location_id` int NOT NULL,
  `locationable_id` int NOT NULL,
  `locationable_type` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `options` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Déargement des donné de la table `ti_locationables`
--

INSERT INTO `ti_locationables` (`location_id`, `locationable_id`, `locationable_type`, `options`) VALUES
(1, 1, 'staffs', NULL),
(1, 2, 'staffs', NULL),
(1, 3, 'mealtimes', NULL),
(1, 2, 'mealtimes', NULL),
(1, 1, 'mealtimes', NULL),
(1, 8, 'categories', NULL),
(1, 7, 'categories', NULL),
(1, 6, 'categories', NULL),
(1, 24, 'tables', NULL),
(1, 25, 'tables', NULL),
(1, 26, 'tables', NULL),
(1, 27, 'tables', NULL),
(1, 28, 'tables', NULL),
(1, 29, 'tables', NULL),
(1, 13, 'menus', NULL);

-- --------------------------------------------------------

--
-- Structure de la table `ti_locations`
--

DROP TABLE IF EXISTS `ti_locations`;
CREATE TABLE IF NOT EXISTS `ti_locations` (
  `location_id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `location_name` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `location_email` varchar(96) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
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
  `permalink_slug` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`location_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Déargement des donné de la table `ti_locations`
--

INSERT INTO `ti_locations` (`location_id`, `location_name`, `location_email`, `description`, `location_address_1`, `location_address_2`, `location_city`, `location_state`, `location_postcode`, `location_country_id`, `location_telephone`, `location_lat`, `location_lng`, `location_radius`, `location_status`, `permalink_slug`, `created_at`, `updated_at`) VALUES
(1, 'Default', 'admin@domain.tld', '<p><br></p>', 'Broad Ln', '', 'Coventry', '', '', 222, '19765423567', 52.415884, -1.603648, NULL, 1, 'default', '2024-12-31 17:34:40', '2025-03-03 14:09:28');

-- --------------------------------------------------------

--
-- Structure de la table `ti_location_areas`
--

DROP TABLE IF EXISTS `ti_location_areas`;
CREATE TABLE IF NOT EXISTS `ti_location_areas` (
  `area_id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `location_id` int NOT NULL,
  `name` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `type` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `boundaries` json NOT NULL,
  `conditions` json NOT NULL,
  `color` varchar(40) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_default` tinyint(1) NOT NULL DEFAULT '0',
  `priority` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`area_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Structure de la table `ti_location_options`
--

DROP TABLE IF EXISTS `ti_location_options`;
CREATE TABLE IF NOT EXISTS `ti_location_options` (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `location_id` bigint UNSIGNED NOT NULL,
  `item` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `value` json DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ti_location_options_location_id_item_unique` (`location_id`,`item`)
) ENGINE=InnoDB AUTO_INCREMENT=30 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Déargement des donné de la table `ti_location_options`
--

INSERT INTO `ti_location_options` (`id`, `location_id`, `item`, `value`) VALUES
(1, 1, 'auto_lat_lng', '\"1\"'),
(2, 1, 'gallery', '{\"title\": \"\", \"description\": \"\"}'),
(3, 1, 'guest_order', '\"-1\"'),
(4, 1, 'limit_orders', '\"0\"'),
(5, 1, 'offer_delivery', '\"1\"'),
(6, 1, 'delivery_add_lead_time', '\"0\"'),
(7, 1, 'delivery_time_interval', '15'),
(8, 1, 'delivery_lead_time', '25'),
(9, 1, 'delivery_time_restriction', '\"0\"'),
(10, 1, 'delivery_cancellation_timeout', '0'),
(11, 1, 'delivery_min_order_amount', '\"0.00\"'),
(12, 1, 'future_orders', '{\"enable_delivery\": \"0\", \"enable_collection\": \"0\"}'),
(13, 1, 'offer_collection', '\"1\"'),
(14, 1, 'collection_add_lead_time', '\"0\"'),
(15, 1, 'collection_time_interval', '15'),
(16, 1, 'collection_lead_time', '25'),
(17, 1, 'collection_time_restriction', '\"0\"'),
(18, 1, 'collection_cancellation_timeout', '0'),
(19, 1, 'collection_min_order_amount', '\"0.00\"'),
(20, 1, 'payments', '\"0\"'),
(21, 1, 'offer_reservation', '\"1\"'),
(22, 1, 'auto_allocate_table', '\"1\"'),
(23, 1, 'reservation_time_interval', '15'),
(24, 1, 'reservation_stay_time', '45'),
(25, 1, 'min_reservation_advance_time', '2'),
(26, 1, 'max_reservation_advance_time', '30'),
(27, 1, 'limit_guests', '\"0\"'),
(28, 1, 'reservation_cancellation_timeout', '0'),
(29, 1, 'reservation_include_start_time', '\"1\"');

-- --------------------------------------------------------

--
-- Structure de la table `ti_logos`
--

DROP TABLE IF EXISTS `ti_logos`;
CREATE TABLE IF NOT EXISTS `ti_logos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `dashboard_logo` text,
  `loader_logo` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Déargement des donné de la table `ti_logos`
--

INSERT INTO `ti_logos` (`id`, `dashboard_logo`, `loader_logo`, `created_at`) VALUES
(1, 'http://197.140.11.160:8012/storage/temp/public/cdf/9e2/755/thumb_cdf9e27557e9f5787cad9c2baacc5d73_1736056978_122x122_contain.png', 'http://197.140.11.160:8012/storage/temp/public/f64/41e/3f2/thumb_f6441e3f240985242107511c871a02eb_1738954568_122x122_contain.jpg', '2025-02-07 20:15:50');

-- --------------------------------------------------------

--
-- Structure de la table `ti_mail_layouts`
--

DROP TABLE IF EXISTS `ti_mail_layouts`;
CREATE TABLE IF NOT EXISTS `ti_mail_layouts` (
  `layout_id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `language_id` int NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `status` tinyint(1) NOT NULL,
  `code` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `layout` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `plain_layout` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `layout_css` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `is_locked` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`layout_id`),
  UNIQUE KEY `ti_mail_layouts_code_unique` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Déargement des donné de la table `ti_mail_layouts`
--

INSERT INTO `ti_mail_layouts` (`layout_id`, `name`, `language_id`, `created_at`, `updated_at`, `status`, `code`, `layout`, `plain_layout`, `layout_css`, `is_locked`) VALUES
(1, 'Default layout', 0, '2024-12-31 19:32:04', '2024-12-31 19:32:04', 0, 'default', '<!DOCTYPE html PUBLIC \"-//W3C//DTD XHTML 1.0 Transitional//EN\"\n\"http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd\">\n<html xmlns=\"http://www.w3.org/1999/xhtml\">\n<head>\n    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\"/>\n    <meta http-equiv=\"Content-Type\" content=\"text/html; charset=UTF-8\"/>\n</head>\n<body>\n<style type=\"text/css\">\n    {{ $custom_css }}\n    {{ $layout_css }}\n</style>\n\n<table class=\"wrapper\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\">\n    <tr>\n        <td align=\"center\">\n            <table class=\"content\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\">\n                @partial(\'header\')\n                @php $site_logo = setting(\'mail_logo\') ?: $site_logo; @endphp\n                @isset($site_logo)\n                    <img\n                        src=\"{{ \\Main\\Models\\Image_tool_model::resize($site_logo, [\'height\' => 90]) }}\"\n                        alt=\"{{ $site_name }}\"\n                    >\n                @endisset\n                @endpartial\n                <tr>\n                    <td class=\"body\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\">\n                        <table class=\"inner-body\" align=\"center\" width=\"570\" cellpadding=\"0\" cellspacing=\"0\">\n                            <!-- Body content -->\n                            <tr>\n                                <td class=\"content-cell\">\n                                    {{ $body }}\n                                </td>\n                            </tr>\n                        </table>\n                    </td>\n                </tr>\n                @partial(\'footer\')\n                <p>&copy; {{ date(\'Y\') }} {{ $site_name }}. All rights reserved.</p>\n                @endpartial\n            </table>\n        </td>\n    </tr>\n</table>\n</body>\n</html>', '{{ $body }}', '', 1);

-- --------------------------------------------------------

--
-- Structure de la table `ti_mail_partials`
--

DROP TABLE IF EXISTS `ti_mail_partials`;
CREATE TABLE IF NOT EXISTS `ti_mail_partials` (
  `partial_id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `code` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `html` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `text` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `is_custom` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`partial_id`),
  UNIQUE KEY `ti_mail_partials_code_unique` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Déargement des donné de la table `ti_mail_partials`
--

INSERT INTO `ti_mail_partials` (`partial_id`, `name`, `code`, `html`, `text`, `is_custom`, `created_at`, `updated_at`) VALUES
(1, 'Header', 'header', '<tr>\n    <td class=\"header\">\n        @if (isset($url))\n        <a href=\"{{ $url }}\">\n            {{ $slot }}\n        </a>\n        @else\n        <span>\n            {{ $slot }}\n        </span>\n        @endif\n    </td>\n</tr>', '*** {{ $slot }} <{{ $url }}>', 0, '2024-12-31 19:32:04', '2024-12-31 19:32:04'),
(2, 'Footer', 'footer', '<tr>\n    <td>\n        <table class=\"footer\" align=\"center\" width=\"570\" cellpadding=\"0\" cellspacing=\"0\">\n            <tr>\n                <td class=\"content-cell\" align=\"center\">\n                    {{ $slot }}\n                </td>\n            </tr>\n        </table>\n    </td>\n</tr>', '-------------------\n{{ $slot }}', 0, '2024-12-31 19:32:04', '2024-12-31 19:32:04'),
(3, 'Button', 'button', '<table class=\"action\" align=\"center\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\">\n    <tr>\n        <td>\n            <table width=\"100%\" border=\"0\" cellpadding=\"0\" cellspacing=\"0\">\n                <tr>\n                    <td>\n                        <table border=\"0\" cellpadding=\"0\" cellspacing=\"0\">\n                            <tr>\n                                <td>\n                                    <a href=\"{{ $url }}\" class=\"button button-{{ $type ?? \'primary\' }}\" target=\"_blank\">{{ $slot }}</a>\n                                </td>\n                            </tr>\n                        </table>\n                    </td>\n                </tr>\n            </table>\n        </td>\n    </tr>\n</table>', '{{ $slot }} <{{ $url }}>', 0, '2024-12-31 19:32:04', '2024-12-31 19:32:04'),
(4, 'Panel', 'panel', '<table class=\"panel\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\">\n    <tr>\n        <td class=\"panel-content\">\n            <table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\">\n                <tr>\n                    <td class=\"panel-item\">\n                        {{ $slot }}\n                    </td>\n                </tr>\n            </table>\n        </td>\n    </tr>\n</table>', '{{ $slot }}', 0, '2024-12-31 19:32:04', '2024-12-31 19:32:04'),
(5, 'Table', 'table', '<div class=\"table\">\n{{ $slot }}\n</div>', '{{ $slot }}', 0, '2024-12-31 19:32:04', '2024-12-31 19:32:04'),
(6, 'Subcopy', 'subcopy', '<table class=\"subcopy\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\">\n    <tr>\n        <td>\n            {{ $slot }}\n        </td>\n    </tr>\n</table>', '-----\n{{ $slot }}', 0, '2024-12-31 19:32:04', '2024-12-31 19:32:04'),
(7, 'Promotion', 'promotion', '<table class=\"promotion\" align=\"center\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\">\n    <tr>\n        <td align=\"center\">\n            {{ $slot }}\n        </td>\n    </tr>\n</table>', '{{ $slot }}', 0, '2024-12-31 19:32:04', '2024-12-31 19:32:04');

-- --------------------------------------------------------

--
-- Structure de la table `ti_mail_templates`
--

DROP TABLE IF EXISTS `ti_mail_templates`;
CREATE TABLE IF NOT EXISTS `ti_mail_templates` (
  `template_id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `layout_id` int NOT NULL,
  `code` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `subject` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `body` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `label` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_custom` tinyint(1) DEFAULT NULL,
  `plain_body` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`template_id`),
  UNIQUE KEY `ti_mail_templates_data_template_id_code_unique` (`layout_id`,`code`)
) ENGINE=InnoDB AUTO_INCREMENT=19 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Déargement des donné de la table `ti_mail_templates`
--

INSERT INTO `ti_mail_templates` (`template_id`, `layout_id`, `code`, `subject`, `body`, `created_at`, `updated_at`, `label`, `is_custom`, `plain_body`) VALUES
(1, 1, 'igniter.user::mail.password_reset', '', '', '2024-12-31 19:32:04', '2024-12-31 19:32:04', 'lang:igniter.user::default.text_mail_password_reset', 0, NULL),
(2, 1, 'igniter.user::mail.password_reset_request', '', '', '2024-12-31 19:32:04', '2024-12-31 19:32:04', 'lang:igniter.user::default.text_mail_password_reset_request', 0, NULL),
(3, 1, 'igniter.user::mail.registration', '', '', '2024-12-31 19:32:04', '2024-12-31 19:32:04', 'lang:igniter.user::default.text_mail_registration', 0, NULL),
(4, 1, 'igniter.user::mail.registration_alert', '', '', '2024-12-31 19:32:04', '2024-12-31 19:32:04', 'lang:igniter.user::default.text_mail_registration_alert', 0, NULL),
(5, 1, 'igniter.user::mail.activation', '', '', '2024-12-31 19:32:04', '2024-12-31 19:32:04', 'lang:igniter.user::default.text_mail_activation', 0, NULL),
(6, 1, 'igniter.reservation::mail.reservation', '', '', '2024-12-31 19:32:04', '2024-12-31 19:32:04', 'lang:igniter.reservation::default.text_mail_reservation', 0, NULL),
(7, 1, 'igniter.reservation::mail.reservation_alert', '', '', '2024-12-31 19:32:04', '2024-12-31 19:32:04', 'lang:igniter.reservation::default.text_mail_reservation_alert', 0, NULL),
(8, 1, 'igniter.local::mail.review_chase', '', '', '2024-12-31 19:32:04', '2024-12-31 19:32:04', 'lang:igniter.local::default.reviews.text_chase_email', 0, NULL),
(9, 1, 'igniter.frontend::mail.contact', '', '', '2024-12-31 19:32:04', '2024-12-31 19:32:04', 'Contact form email to admin', 0, NULL),
(10, 1, 'igniter.cart::mail.order', '', '', '2024-12-31 19:32:04', '2024-12-31 19:32:04', 'lang:igniter.cart::default.text_mail_order', 0, NULL),
(11, 1, 'igniter.cart::mail.order_alert', '', '', '2024-12-31 19:32:04', '2024-12-31 19:32:04', 'lang:igniter.cart::default.text_mail_order_alert', 0, NULL),
(12, 1, 'admin::_mail.order_update', '', '', '2024-12-31 19:32:04', '2024-12-31 19:32:04', 'lang:system::lang.mail_templates.text_order_update', 0, NULL),
(13, 1, 'admin::_mail.reservation_update', '', '', '2024-12-31 19:32:04', '2024-12-31 19:32:04', 'lang:system::lang.mail_templates.text_reservation_update', 0, NULL),
(14, 1, 'admin::_mail.password_reset', '', '', '2024-12-31 19:32:04', '2024-12-31 19:32:04', 'lang:system::lang.mail_templates.text_password_reset_alert', 0, NULL),
(15, 1, 'admin::_mail.password_reset_request', '', '', '2024-12-31 19:32:04', '2024-12-31 19:32:04', 'lang:system::lang.mail_templates.text_password_reset_request_alert', 0, NULL),
(16, 1, 'admin::_mail.invite', '', '', '2024-12-31 19:32:04', '2024-12-31 19:32:04', 'lang:system::lang.mail_templates.text_invite', 0, NULL),
(17, 1, 'admin::_mail.invite_customer', '', '', '2024-12-31 19:32:04', '2024-12-31 19:32:04', 'lang:system::lang.mail_templates.text_invite_customer', 0, NULL),
(18, 1, 'admin::_mail.low_stock_alert', '', '', '2024-12-31 19:32:04', '2024-12-31 19:32:04', 'lang:system::lang.mail_templates.text_low_stock_alert', 0, NULL);

-- --------------------------------------------------------

--
-- Structure de la table `ti_mealtimes`
--

DROP TABLE IF EXISTS `ti_mealtimes`;
CREATE TABLE IF NOT EXISTS `ti_mealtimes` (
  `mealtime_id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `mealtime_name` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `start_time` time NOT NULL DEFAULT '00:00:00',
  `end_time` time NOT NULL DEFAULT '23:59:59',
  `mealtime_status` tinyint(1) NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`mealtime_id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Déargement des donné de la table `ti_mealtimes`
--

INSERT INTO `ti_mealtimes` (`mealtime_id`, `mealtime_name`, `start_time`, `end_time`, `mealtime_status`, `created_at`, `updated_at`) VALUES
(1, 'Breakfast', '07:00:00', '10:00:00', 1, '2024-12-31 17:34:40', '2025-01-05 20:42:14'),
(2, 'Lunch', '12:00:00', '14:30:00', 1, '2024-12-31 17:34:40', '2025-01-05 20:42:08'),
(3, 'Dinner', '18:00:00', '20:00:00', 1, '2024-12-31 17:34:40', '2025-01-05 20:41:45');

-- --------------------------------------------------------

--
-- Structure de la table `ti_media_attachments`
--

DROP TABLE IF EXISTS `ti_media_attachments`;
CREATE TABLE IF NOT EXISTS `ti_media_attachments` (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `disk` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_name` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `mime_type` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `size` int UNSIGNED NOT NULL,
  `tag` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `attachment_type` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `attachment_id` bigint UNSIGNED DEFAULT NULL,
  `is_public` tinyint(1) NOT NULL DEFAULT '1',
  `custom_properties` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `priority` int UNSIGNED DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `ti_media_attachments_attachment_type_attachment_id_index` (`attachment_type`,`attachment_id`),
  KEY `ti_media_attachments_tag_index` (`tag`)
) ENGINE=InnoDB AUTO_INCREMENT=19 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Déargement des donné de la table `ti_media_attachments`
--

INSERT INTO `ti_media_attachments` (`id`, `disk`, `name`, `file_name`, `mime_type`, `size`, `tag`, `attachment_type`, `attachment_id`, `is_public`, `custom_properties`, `priority`, `created_at`, `updated_at`) VALUES
(2, 'media', '6776d1e8566ed245787605.jpeg', 'images.jpeg', 'image/jpeg', 10736, 'thumb', 'menus', 7, 1, '[]', 2, '2025-01-02 17:50:32', '2025-01-02 17:50:32'),
(3, 'media', '6776d2284716a539540166.jpeg', 'rice.jpeg', 'image/jpeg', 10206, 'thumb', 'menus', 6, 1, '[]', 3, '2025-01-02 17:51:36', '2025-01-02 17:51:36'),
(4, 'media', '6776d26f0b90b630607942.jpeg', 'b1.jpeg', 'image/jpeg', 8621, 'thumb', 'menus', 12, 1, '[]', 4, '2025-01-02 17:52:47', '2025-01-02 17:52:47'),
(5, 'media', '6776d2a0333b0363272263.jpg', 'YAM PORRIDGE.jpg', 'image/jpeg', 268038, 'thumb', 'menus', 11, 1, '[]', 5, '2025-01-02 17:53:36', '2025-01-02 17:53:36'),
(6, 'media', '6776d2d9145fc496723456.jpg', 'AMALA.jpg', 'image/jpeg', 77300, 'thumb', 'menus', 10, 1, '[]', 6, '2025-01-02 17:54:33', '2025-01-02 17:54:33'),
(7, 'media', '6776d3219329b582199072.jpg', 'Caesar-Salad-TIMG.jpg', 'image/jpeg', 103143, 'thumb', 'menus', 9, 1, '[]', 7, '2025-01-02 17:55:45', '2025-01-02 17:55:45'),
(8, 'media', '6776d354c46f3037748397.jpeg', 'Seafood Salad.jpeg', 'image/jpeg', 12530, 'thumb', 'menus', 8, 1, '[]', 8, '2025-01-02 17:56:36', '2025-01-02 17:56:36'),
(9, 'media', '6776d3b90c05f547566224.jpeg', 'Special Shrimp Deluxe 2.jpeg', 'image/jpeg', 12954, 'thumb', 'menus', 5, 1, '[]', 9, '2025-01-02 17:58:17', '2025-01-02 17:58:17'),
(10, 'media', '6776d40a49938149654564.jpg', 'RICE AND DODO2.jpg', 'image/jpeg', 64487, 'thumb', 'menus', 4, 1, '[]', 10, '2025-01-02 17:59:38', '2025-01-02 17:59:38'),
(11, 'media', '6776d43cc11a2569256488.jpeg', 'ATA RICE.jpeg', 'image/jpeg', 9781, 'thumb', 'menus', 3, 1, '[]', 11, '2025-01-02 18:00:28', '2025-01-02 18:00:28'),
(12, 'media', '6776d4670f92b513414909.jpeg', 'SCOTCH EGG.jpeg', 'image/jpeg', 145308, 'thumb', 'menus', 2, 1, '[]', 12, '2025-01-02 18:01:11', '2025-01-02 18:01:11'),
(13, 'media', '6776d4adbca7d884450237.webp', 'puffpuff.webp', 'image/webp', 158112, 'thumb', 'menus', 1, 1, '[]', 13, '2025-01-02 18:02:21', '2025-01-02 18:02:21'),
(15, 'media', '6777f9b077ac5712883963.webp', 'ggty.webp', 'image/webp', 178578, 'images', 'sliders', 1, 1, '[]', 15, '2025-01-03 14:52:32', '2025-01-03 14:52:32'),
(16, 'media', '6777fa479e2e2540505239.jpg', 'rest2.jpg', 'image/jpeg', 85039, 'images', 'sliders', 1, 1, '[]', 16, '2025-01-03 14:55:03', '2025-01-03 14:55:03'),
(17, 'media', '6777fac111a64771032432.jpg', 'rest4.jpg', 'image/jpeg', 195181, 'images', 'sliders', 1, 1, '[]', 17, '2025-01-03 14:57:05', '2025-01-03 14:57:05'),
(18, 'media', '67d91fd8af302445682087.webp', 'cultural-cuisine.webp', 'image/webp', 64460, 'thumb', 'menus', 13, 1, '[]', 18, '2025-03-18 06:25:12', '2025-03-18 06:25:12');

-- --------------------------------------------------------

--
-- Structure de la table `ti_menus`
--

DROP TABLE IF EXISTS `ti_menus`;
CREATE TABLE IF NOT EXISTS `ti_menus` (
  `menu_id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `menu_name` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `menu_description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `menu_price` decimal(15,4) NOT NULL,
  `minimum_qty` int NOT NULL DEFAULT '0',
  `menu_status` tinyint(1) NOT NULL,
  `menu_priority` int NOT NULL DEFAULT '0',
  `order_restriction` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`menu_id`)
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Déargement des donné de la table `ti_menus`
--

INSERT INTO `ti_menus` (`menu_id`, `menu_name`, `menu_description`, `menu_price`, `minimum_qty`, `menu_status`, `menu_priority`, `order_restriction`, `created_at`, `updated_at`) VALUES
(1, 'Puff-Puff', '', 4.9900, 3, 1, 0, NULL, '2024-12-31 17:34:40', '2025-01-05 20:45:50'),
(2, 'SCOTCH EGG', '', 2.0000, 1, 1, 0, NULL, '2024-12-31 17:34:40', '2025-01-05 20:45:57'),
(3, 'ATA RICE', '', 12.0000, 1, 1, 0, NULL, '2024-12-31 17:34:40', '2025-01-05 20:46:02'),
(4, 'RICE AND DODO', '', 11.9900, 1, 1, 0, NULL, '2024-12-31 17:34:40', '2025-01-05 20:46:08'),
(5, 'Special Shrimp Deluxe', '', 12.9900, 1, 1, 0, NULL, '2024-12-31 17:34:40', '2025-01-05 20:46:15'),
(6, 'Whole catfish with rice and vegetables', '', 13.9900, 1, 1, 0, NULL, '2024-12-31 17:34:40', '2025-01-05 20:46:22'),
(7, 'Simple Salad', '', 8.9900, 1, 1, 0, NULL, '2024-12-31 17:34:40', '2025-01-05 20:48:09'),
(8, 'Seafood Salad', '', 5.9900, 1, 1, 0, NULL, '2024-12-31 17:34:40', '2025-01-05 20:45:43'),
(9, 'Salad Cesar', '', 11.9900, 1, 1, 0, NULL, '2024-12-31 17:34:40', '2025-01-05 20:45:37'),
(10, 'AMALA', '', 11.9900, 1, 1, 0, NULL, '2024-12-31 17:34:40', '2025-01-05 20:45:32'),
(11, 'YAM PORRIDGE', '', 9.9900, 1, 1, 0, NULL, '2024-12-31 17:34:40', '2025-01-05 20:45:26'),
(12, 'Boiled Plantain', '', 9.9900, 1, 1, 0, NULL, '2024-12-31 17:34:40', '2025-01-05 20:45:17'),
(13, 'dddd', '444', 4.0000, 1, 1, 3, '', '2025-03-18 06:25:00', '2025-03-18 06:25:00');

-- --------------------------------------------------------

--
-- Structure de la table `ti_menus_specials`
--

DROP TABLE IF EXISTS `ti_menus_specials`;
CREATE TABLE IF NOT EXISTS `ti_menus_specials` (
  `special_id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `menu_id` int NOT NULL DEFAULT '0',
  `start_date` datetime DEFAULT CURRENT_TIMESTAMP,
  `end_date` datetime DEFAULT CURRENT_TIMESTAMP,
  `special_price` decimal(15,4) DEFAULT NULL,
  `special_status` tinyint(1) NOT NULL,
  `type` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `validity` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `recurring_every` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `recurring_from` time DEFAULT NULL,
  `recurring_to` time DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`special_id`),
  UNIQUE KEY `ti_menus_specials_special_id_menu_id_unique` (`special_id`,`menu_id`)
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Déargement des donné de la table `ti_menus_specials`
--

INSERT INTO `ti_menus_specials` (`special_id`, `menu_id`, `start_date`, `end_date`, `special_price`, `special_status`, `type`, `validity`, `recurring_every`, `recurring_from`, `recurring_to`, `created_at`, `updated_at`) VALUES
(1, 7, NULL, NULL, 0.0000, 0, 'F', 'forever', NULL, NULL, NULL, NULL, NULL),
(2, 6, NULL, NULL, 0.0000, 0, 'F', 'forever', NULL, NULL, NULL, NULL, NULL),
(3, 12, NULL, NULL, 0.0000, 0, 'F', 'forever', NULL, NULL, NULL, NULL, NULL),
(4, 11, NULL, NULL, 0.0000, 0, 'F', 'forever', NULL, NULL, NULL, NULL, NULL),
(5, 10, NULL, NULL, 0.0000, 0, 'F', 'forever', NULL, NULL, NULL, NULL, NULL),
(6, 9, NULL, NULL, 0.0000, 0, 'F', 'forever', NULL, NULL, NULL, NULL, NULL),
(7, 8, NULL, NULL, 0.0000, 0, 'F', 'forever', NULL, NULL, NULL, NULL, NULL),
(8, 5, NULL, NULL, 0.0000, 0, 'F', 'forever', NULL, NULL, NULL, NULL, NULL),
(9, 4, NULL, NULL, 0.0000, 0, 'F', 'forever', NULL, NULL, NULL, NULL, NULL),
(10, 3, NULL, NULL, 0.0000, 0, 'F', 'forever', NULL, NULL, NULL, NULL, NULL),
(11, 2, NULL, NULL, 0.0000, 0, 'F', 'forever', NULL, NULL, NULL, NULL, NULL),
(12, 1, NULL, NULL, 0.0000, 0, 'F', 'forever', NULL, NULL, NULL, NULL, NULL),
(13, 13, NULL, NULL, 0.0000, 0, 'F', 'forever', NULL, NULL, NULL, NULL, NULL);

-- --------------------------------------------------------

--
-- Structure de la table `ti_menu_categories`
--

DROP TABLE IF EXISTS `ti_menu_categories`;
CREATE TABLE IF NOT EXISTS `ti_menu_categories` (
  `menu_id` int UNSIGNED NOT NULL,
  `category_id` int UNSIGNED NOT NULL,
  UNIQUE KEY `ti_menu_categories_menu_id_category_id_unique` (`menu_id`,`category_id`),
  KEY `ti_menu_categories_menu_id_index` (`menu_id`),
  KEY `ti_menu_categories_category_id_index` (`category_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Déargement des donné de la table `ti_menu_categories`
--

INSERT INTO `ti_menu_categories` (`menu_id`, `category_id`) VALUES
(13, 2);

-- --------------------------------------------------------

--
-- Structure de la table `ti_menu_item_options`
--

DROP TABLE IF EXISTS `ti_menu_item_options`;
CREATE TABLE IF NOT EXISTS `ti_menu_item_options` (
  `menu_option_id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
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

--
-- Déargement des donné de la table `ti_menu_item_options`
--

INSERT INTO `ti_menu_item_options` (`menu_option_id`, `option_id`, `menu_id`, `required`, `priority`, `min_selected`, `max_selected`, `created_at`, `updated_at`) VALUES
(1, 4, 1, 0, 0, 0, 0, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(2, 3, 2, 0, 0, 0, 0, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(3, 2, 3, 0, 0, 0, 0, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(4, 3, 3, 0, 1, 0, 0, '2024-12-31 17:34:40', '2025-01-02 18:00:29'),
(5, 2, 4, 0, 0, 0, 0, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(6, 3, 4, 0, 1, 0, 0, '2024-12-31 17:34:40', '2025-01-02 17:59:40'),
(7, 3, 5, 0, 0, 0, 0, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(8, 2, 10, 0, 0, 0, 0, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(9, 4, 10, 0, 1, 0, 0, '2024-12-31 17:34:40', '2025-01-02 17:54:34');

-- --------------------------------------------------------

--
-- Structure de la table `ti_menu_item_option_values`
--

DROP TABLE IF EXISTS `ti_menu_item_option_values`;
CREATE TABLE IF NOT EXISTS `ti_menu_item_option_values` (
  `menu_option_value_id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `menu_option_id` int NOT NULL,
  `option_value_id` int NOT NULL,
  `new_price` decimal(15,4) DEFAULT NULL,
  `priority` int NOT NULL DEFAULT '0',
  `is_default` tinyint(1) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`menu_option_value_id`)
) ENGINE=InnoDB AUTO_INCREMENT=22 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Déargement des donné de la table `ti_menu_item_option_values`
--

INSERT INTO `ti_menu_item_option_values` (`menu_option_value_id`, `menu_option_id`, `option_value_id`, `new_price`, `priority`, `is_default`, `created_at`, `updated_at`) VALUES
(1, 1, 9, 0.0000, 1, NULL, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(2, 1, 10, 0.0000, 2, NULL, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(3, 2, 7, 0.0000, 1, NULL, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(4, 2, 8, 5.0000, 2, NULL, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(5, 3, 4, 4.9500, 4, NULL, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(6, 3, 5, 4.9500, 2, NULL, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(7, 3, 6, 6.9500, 3, NULL, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(8, 4, 7, 0.0000, 1, NULL, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(9, 4, 8, 5.0000, 2, NULL, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(10, 5, 4, 4.9500, 4, NULL, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(11, 5, 5, 4.9500, 2, NULL, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(12, 5, 6, 6.9500, 3, NULL, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(13, 6, 7, 0.0000, 1, NULL, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(14, 6, 8, 5.0000, 2, NULL, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(15, 7, 7, 0.0000, 1, NULL, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(16, 7, 8, 5.0000, 2, NULL, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(17, 8, 4, 4.9500, 4, NULL, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(18, 8, 5, 4.9500, 2, NULL, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(19, 8, 6, 6.9500, 3, NULL, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(20, 9, 9, 0.0000, 1, NULL, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(21, 9, 10, 0.0000, 2, NULL, '2024-12-31 17:34:40', '2024-12-31 17:34:40');

-- --------------------------------------------------------

--
-- Structure de la table `ti_menu_mealtimes`
--

DROP TABLE IF EXISTS `ti_menu_mealtimes`;
CREATE TABLE IF NOT EXISTS `ti_menu_mealtimes` (
  `menu_id` int UNSIGNED NOT NULL,
  `mealtime_id` int UNSIGNED NOT NULL,
  UNIQUE KEY `ti_menu_mealtimes_menu_id_mealtime_id_unique` (`menu_id`,`mealtime_id`),
  KEY `ti_menu_mealtimes_menu_id_index` (`menu_id`),
  KEY `ti_menu_mealtimes_mealtime_id_index` (`mealtime_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Déargement des donné de la table `ti_menu_mealtimes`
--

INSERT INTO `ti_menu_mealtimes` (`menu_id`, `mealtime_id`) VALUES
(13, 2);

-- --------------------------------------------------------

--
-- Structure de la table `ti_menu_options`
--

DROP TABLE IF EXISTS `ti_menu_options`;
CREATE TABLE IF NOT EXISTS `ti_menu_options` (
  `option_id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `option_name` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `display_type` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `priority` int NOT NULL DEFAULT '0',
  `update_related_menu_item` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`option_id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Déargement des donné de la table `ti_menu_options`
--

INSERT INTO `ti_menu_options` (`option_id`, `option_name`, `display_type`, `priority`, `update_related_menu_item`, `created_at`, `updated_at`) VALUES
(1, 'Toppings', 'checkbox', 0, 0, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(2, 'Sides', 'checkbox', 0, 0, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(3, 'Size', 'radio', 0, 0, '2024-12-31 17:34:40', '2024-12-31 17:34:40'),
(4, 'Drinks', 'checkbox', 0, 0, '2024-12-31 17:34:40', '2024-12-31 17:34:40');

-- --------------------------------------------------------

--
-- Structure de la table `ti_menu_option_values`
--

DROP TABLE IF EXISTS `ti_menu_option_values`;
CREATE TABLE IF NOT EXISTS `ti_menu_option_values` (
  `option_value_id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `option_id` int NOT NULL,
  `value` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `price` decimal(15,4) DEFAULT NULL,
  `priority` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`option_value_id`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Déargement des donné de la table `ti_menu_option_values`
--

INSERT INTO `ti_menu_option_values` (`option_value_id`, `option_id`, `value`, `price`, `priority`) VALUES
(1, 1, 'Peperoni', 1.9900, 2),
(2, 1, 'Jalapenos', 3.9900, 1),
(3, 1, 'Sweetcorn', 1.9900, 3),
(4, 2, 'Meat', 4.9500, 4),
(5, 2, 'Fish', 4.9500, 2),
(6, 2, 'Beef', 6.9500, 3),
(7, 3, 'Small', 0.0000, 1),
(8, 3, 'Large', 5.0000, 2),
(9, 4, 'Coke', 0.0000, 1),
(10, 4, 'Diet Coke', 0.0000, 2);

-- --------------------------------------------------------

--
-- Structure de la table `ti_migrations`
--

DROP TABLE IF EXISTS `ti_migrations`;
CREATE TABLE IF NOT EXISTS `ti_migrations` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `group` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `migration` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `batch` int NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=122 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Déargement des donné de la table `ti_migrations`
--

INSERT INTO `ti_migrations` (`id`, `group`, `migration`, `batch`) VALUES
(1, 'System', '2015_03_25_000001_create_tables', 1),
(2, 'System', '2016_11_29_000300_optimize_tables_columns', 1),
(3, 'System', '2017_04_13_000300_modify_columns_on_users_and_customers_tables', 1),
(4, 'System', '2017_05_08_000300_add_columns', 1),
(5, 'System', '2017_06_11_000300_create_payments_and_payment_logs_table', 1),
(6, 'System', '2017_08_23_000300_create_themes_table', 1),
(7, 'System', '2018_01_23_000300_create_language_translations_table', 1),
(8, 'System', '2018_03_30_000300_create_extension_settings_table', 1),
(9, 'System', '2018_06_12_000300_rename_model_class_names_to_morph_map_custom_names', 1),
(10, 'System', '2018_10_19_000300_create_media_attachments_table', 1),
(11, 'System', '2018_10_21_131033_create_queue_table', 1),
(12, 'System', '2018_10_21_131044_create_sessions_table', 1),
(13, 'System', '2019_04_16_000300_nullify_customer_id_on_addresses_table', 1),
(14, 'System', '2019_07_01_000300_delete_unused_columns_from_activities_table', 1),
(15, 'System', '2019_07_22_000300_add_user_type_column_to_activities_table', 1),
(16, 'System', '2019_07_30_000300_create_mail_partials_table', 1),
(17, 'System', '2020_02_05_000300_delete_stale_unused_table', 1),
(18, 'System', '2020_04_16_000300_drop_stale_unused_columns', 1),
(19, 'System', '2020_05_24_000300_create_request_logs_table', 1),
(20, 'System', '2021_07_20_000300_add_uuid_column_to_failed_jobs_table', 1),
(21, 'System', '2021_07_20_172212_create_job_batches_table', 1),
(22, 'System', '2021_07_20_172321_create_cache_table', 1),
(23, 'System', '2021_09_06_010000_add_timestamps_to_tables', 1),
(24, 'System', '2021_10_22_010000_make_primary_key_bigint_all_tables', 1),
(25, 'System', '2021_10_25_010000_add_foreign_key_constraints_to_tables', 1),
(26, 'System', '2022_04_20_000300_add_version_column_to_languages_table', 1),
(27, 'System', '2022_06_30_010000_drop_foreign_key_constraints_on_all_tables', 1),
(28, 'Admin', '2017_08_25_000300_create_location_areas_table', 1),
(29, 'Admin', '2017_08_25_000300_create_menu_categories_table', 1),
(30, 'Admin', '2018_01_19_000300_add_hash_columns_on_orders_reservations_table', 1),
(31, 'Admin', '2018_04_06_000300_drop_unique_on_order_totals_table', 1),
(32, 'Admin', '2018_04_12_000300_modify_columns_on_orders_reservations_table', 1),
(33, 'Admin', '2018_05_21_000300_drop_redundant_columns_on_kitchen_tables', 1),
(34, 'Admin', '2018_05_29_000300_add_columns_on_location_areas_table', 1),
(35, 'Admin', '2018_06_12_000300_create_locationables_table', 1),
(36, 'Admin', '2018_07_04_000300_create_user_preferences_table', 1),
(37, 'Admin', '2018_10_09_000300_auto_increment_on_order_totals_table', 1),
(38, 'Admin', '2019_04_09_000300_auto_increment_on_user_preferences_table', 1),
(39, 'Admin', '2019_07_02_000300_add_columns_on_menu_specials_table', 1),
(40, 'Admin', '2019_07_16_000300_create_reservation_tables_table', 1),
(41, 'Admin', '2019_07_21_000300_change_sort_value_ratings_to_config_on_settings_table', 1),
(42, 'Admin', '2019_11_08_000300_add_selected_columns_to_menu_options_table', 1),
(43, 'Admin', '2020_02_18_000400_create_staffs_groups_and_locations_table', 1),
(44, 'Admin', '2020_02_21_000400_create_staff_roles_table', 1),
(45, 'Admin', '2020_02_22_000300_remove_add_columns_on_staff_staff_groups_table', 1),
(46, 'Admin', '2020_02_25_000300_create_assignable_logs_table', 1),
(47, 'Admin', '2020_03_18_000300_add_quantity_column_to_order_menu_options_table', 1),
(48, 'Admin', '2020_04_05_000300_create_payment_profiles_table', 1),
(49, 'Admin', '2020_04_16_000300_drop_stale_unused_columns', 1),
(50, 'Admin', '2020_05_31_000300_drop_more_unused_columns', 1),
(51, 'Admin', '2020_06_11_000300_create_menu_mealtimes_table', 1),
(52, 'Admin', '2020_08_16_000300_modify_columns_on_tables_reservations_table', 1),
(53, 'Admin', '2020_08_18_000300_create_allergens_table', 1),
(54, 'Admin', '2020_09_28_000300_add_refund_columns_to_payment_logs_table', 1),
(55, 'Admin', '2020_12_13_000300_merge_staffs_locations_into_locationables_table', 1),
(56, 'Admin', '2020_12_22_000300_add_priority_column_to_location_areas_table', 1),
(57, 'Admin', '2021_01_04_000300_add_update_related_column_to_menu_options_table', 1),
(58, 'Admin', '2021_01_04_010000_add_order_time_is_asap_on_orders_table', 1),
(59, 'Admin', '2021_04_23_010000_remove_unused_columns', 1),
(60, 'Admin', '2021_05_26_010000_alter_order_type_columns', 1),
(61, 'Admin', '2021_05_29_010000_add_is_summable_on_order_totals_table', 1),
(62, 'Admin', '2021_07_20_010000_add_columns_default_value', 1),
(63, 'Admin', '2021_09_03_010000_make_serialize_columns_json', 1),
(64, 'Admin', '2021_09_06_010000_add_timestamps_to_tables', 1),
(65, 'Admin', '2021_10_22_010000_make_primary_key_bigint_all_tables', 1),
(66, 'Admin', '2021_10_25_010000_add_foreign_key_constraints_to_tables', 1),
(67, 'Admin', '2021_11_28_000300_create_stocks_table', 1),
(68, 'Admin', '2022_02_07_010000_add_low_stock_alerted_on_stocks_table', 1),
(69, 'Admin', '2022_04_27_000300_create_location_options_table', 1),
(70, 'Admin', '2022_05_10_000300_add_primary_key_to_working_hours_table', 1),
(71, 'Admin', '2022_06_30_010000_drop_foreign_key_constraints_on_all_tables', 1),
(72, 'Admin', '2022_09_03_000300_make_location_options_fields_unique', 1),
(73, 'Admin', '2022_10_26_000300_make_code_field_unique_mail_layouts_partials_table', 1),
(74, 'Admin', '2023_01_10_000400_add_delivery_comment_orders_table', 1),
(75, 'Admin', '2023_06_06_000400_update_dashboard_widget_properties_on_user_preferences_table', 1),
(76, 'igniter.cart', '2017_10_20_000100_create_conditions_settings', 1),
(77, 'igniter.cart', '2017_11_20_010000_create_cart_table', 1),
(78, 'igniter.cart', '2018_09_20_010000_rename_content_field_on_cart_table', 1),
(79, 'igniter.frontend', '2018_01_28_000300_create_subscribers_table', 1),
(80, 'igniter.frontend', '2018_06_28_000300_create_banners_table', 1),
(81, 'igniter.frontend', '2019_11_02_000300_create_sliders_table', 1),
(82, 'igniter.frontend', '2021_10_20_000300_rename_banners_table', 1),
(83, 'igniter.frontend', '2021_11_18_010000_make_primary_key_bigint_all_tables', 1),
(84, 'igniter.frontend', '2021_11_18_010300_add_foreign_key_constraints_to_tables', 1),
(85, 'igniter.frontend', '2022_06_30_010000_drop_foreign_key_constraints', 1),
(86, 'igniter.pages', '2018_06_28_000300_create_pages_table', 1),
(87, 'igniter.pages', '2019_11_28_000300_create_menus_table', 1),
(88, 'igniter.pages', '2019_11_28_000400_alter_columns_on_pages_table', 1),
(89, 'igniter.pages', '2021_03_31_000300_seed_menus_table', 1),
(90, 'igniter.pages', '2021_09_06_010000_add_timestamps_to_pages', 1),
(91, 'igniter.pages', '2021_10_20_010000_add_foreign_key_constraints_to_tables', 1),
(92, 'igniter.pages', '2022_09_16_010000_change_page_content_to_medium_text', 1),
(93, 'igniter.pages', '2023_01_28_010000_make_page_id_incremental', 1),
(94, 'igniter.local', '2020_09_17_000300_create_reviews_table_or_rename', 1),
(95, 'igniter.local', '2020_12_10_000300_update_reviews_table', 1),
(96, 'igniter.local', '2021_01_02_000300_add_last_location_area_customers_table', 1),
(97, 'igniter.local', '2021_09_06_010000_add_timestamps_to_reviews', 1),
(98, 'igniter.local', '2021_11_18_010000_make_primary_key_bigint_all_tables', 1),
(99, 'igniter.payregister', '2021_05_08_000300_seed_default_payment_gateways', 1),
(100, 'igniter.automation', '2018_10_01_000100_create_all_tables', 1),
(101, 'igniter.automation', '2020_11_08_000300_create_task_log_table', 1),
(102, 'igniter.automation', '2021_11_18_010000_make_primary_key_bigint_all_tables', 1),
(103, 'igniter.automation', '2021_11_18_010300_add_foreign_key_constraints_to_tables', 1),
(104, 'igniter.automation', '2022_06_30_010000_drop_foreign_key_constraints', 1),
(105, 'igniter.broadcast', '2021_10_15_000400_create_websockets_statistics_entries_table', 1),
(106, 'igniter.coupons', '2020_09_17_000300_create_coupons_table_or_rename', 1),
(107, 'igniter.coupons', '2020_09_18_000300_create_coupon_relations_tables', 1),
(108, 'igniter.coupons', '2020_10_15_000300_create_cart_restriction', 1),
(109, 'igniter.coupons', '2020_11_01_000300_add_auto_apply_field_on_coupons_table', 1),
(110, 'igniter.coupons', '2021_02_22_000300_increase_coupon_code_character_limit', 1),
(111, 'igniter.coupons', '2021_05_26_010000_alter_order_restriction_column', 1),
(112, 'igniter.coupons', '2021_09_06_010000_add_timestamps_to_coupons', 1),
(113, 'igniter.coupons', '2021_11_18_010000_make_primary_key_bigint_all_tables', 1),
(114, 'igniter.coupons', '2021_11_18_010300_add_foreign_key_constraints_to_tables', 1),
(115, 'igniter.coupons', '2022_06_30_010000_drop_foreign_key_constraints', 1),
(116, 'igniter.coupons', '2023_06_03_010000_set_nullable_columns', 1),
(117, 'igniter.coupons', '2023_09_28_010000_create_coupon_customer_groups_tables', 1),
(118, 'igniter.coupons', '2023_10_19_010000_change_is_limited_to_cart_item_to_apply_coupon_on_enum', 1),
(119, 'igniter.socialite', '2018_10_11_211028_create_socialite_providers_table', 1),
(120, 'igniter.socialite', '2022_02_04_211028_add_user_type_column_socialite_providers_table', 1),
(121, 'igniter.socialite', '2022_06_14_211028_increase_string_length', 1);

-- --------------------------------------------------------

--
-- Structure de la table `ti_orders`
--

DROP TABLE IF EXISTS `ti_orders`;
CREATE TABLE IF NOT EXISTS `ti_orders` (
  `order_id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `customer_id` int DEFAULT NULL,
  `first_name` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `last_name` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(96) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `telephone` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `location_id` int NOT NULL,
  `address_id` int DEFAULT NULL,
  `cart` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
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
  `ip_address` varchar(40) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_agent` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `assignee_id` int DEFAULT NULL,
  `assignee_group_id` int UNSIGNED DEFAULT NULL,
  `invoice_prefix` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `invoice_date` datetime DEFAULT NULL,SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `processed` tinyint(1) DEFAULT NULL,
  `status_updated_at` datetime DEFAULT NULL,
  `assignee_updated_at` datetime DEFAULT NULL,
  `order_time_is_asap` tinyint(1) NOT NULL DEFAULT '0',
  `delivery_comment` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `ms_order_type` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  PRIMARY KEY (`order_id`),
  KEY `ti_orders_hash_index` (`hash`)
) ENGINE=InnoDB AUTO_INCREMENT=191 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Déargement des donné de la table `ti_orders`
--

INSERT INTO `ti_orders` (`order_id`, `customer_id`, `first_name`, `last_name`, `email`, `telephone`, `location_id`, `address_id`, `cart`, `total_items`, `comment`, `payment`, `order_type`, `created_at`, `updated_at`, `order_time`, `order_date`, `order_total`, `status_id`, `ip_address`, `user_agent`, `assignee_id`, `assignee_group_id`, `invoice_prefix`, `invoice_date`, `hash`, `processed`, `status_updated_at`, `assignee_updated_at`, `order_time_is_asap`, `delivery_comment`, `ms_order_type`) VALUES
(141, NULL, 'Chief', 'Admin', 'chiefadmin@example.com', '1234567890', 1, 1, 'O:30:\"Igniter\\Flame\\Cart\\CartContent\":2:{s:8:\"\0*\0items\";a:1:{i:0;O:27:\"Igniter\\Flame\\Cart\\CartItem\":9:{s:5:\"rowId\";s:13:\"67c8fc9bb91dc\";s:2:\"id\";s:1:\"8\";s:3:\"qty\";s:1:\"1\";s:4:\"name\";s:13:\"Seafood Salad\";s:5:\"price\";d:5.99;s:7:\"comment\";N;s:7:\"options\";O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}s:10:\"conditions\";O:37:\"Igniter\\Flame\\Cart\\CartItemConditions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}s:15:\"associatedModel\";s:31:\"Igniter\\Cart\\Models\\Menus_model\";}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}', 1, NULL, 'Cod', 'Table 02', '2025-03-06 01:38:35', '2025-03-10 11:22:46', '01:38:35', '2025-03-06', 5.9900, 1, '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36', NULL, NULL, 'INV-2025-00', '2025-03-06 01:38:35', '191c187b2ba26faee21d6b10fd67f4a1', 1, '2025-03-10 11:22:46', NULL, 1, NULL, '0'),
(188, NULL, 'Chief', 'Admin', 'chiefadmin@example.com', '1234567890', 1, 1, 'O:30:\"Igniter\\Flame\\Cart\\CartContent\":2:{s:8:\"\0*\0items\";a:3:{i:0;O:27:\"Igniter\\Flame\\Cart\\CartItem\":9:{s:5:\"rowId\";s:13:\"67cecbb134161\";s:2:\"id\";s:1:\"3\";s:3:\"qty\";s:1:\"1\";s:4:":\od', 'Table 05', '2025-03-10 11:23:29', '2025-03-10 11:23:29', '11:23:29', '2025-03-10', 57.9600, 1, '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36', NULL, NULL, 'INV-2025-00', '2025-03-10 11:23:29', '01a9f8c436b127b69c6d00d7b254d206', 1, NULL, NULL, 1, NULL, '0'),
(190, NULL, 'Chief', 'Admin', 'chiefadmin@example.com', '1234567890', 1, 1, 'O:30:\"Igniter\\Flame\\Cart\\CartContent\":2:{s:8:\"\0*\0items\";a:1:{i:0;O:27:\"Igniter\\FsdO"ems\";a:2:{i:5;O:33:\"Igniter\\Flame\\Cart\\CartItemOption\":3:{s:2:\"id\";i:5;s:4:\"name\";s:5:\"Sides\";s:6:\"values\";O:39:\"Igniter\\Flame\\Cart\\CartItemOptionValues\":2:{s:8:\"\0*\0items\";a:1:{i:10;O:38:\"Igniter\\Flame\\Cart\\CartItemOptionValue\":4:{s:2:\"id\";i:10;s:4:\"name\";s:4:\"Meat\";s:3:\"qty\";i:1;s:5:\"price\";d:4.95;}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}}i:6;O:33:\"Igniter\\Flame\\Cart\\CartItemOption\":3:{s:2:\"id\";i:6;s:4:\"name\";s:4:\"Size\";s:6:\"values\";O:39:\"Igniter\\Fl,};O:33:\"Igniter\\Flame\\Cart\\CartItemOption\":3:{s:2:\"id\";i:6;s:4:\"name\";s:4:\"Size\";s:6:\"values\";O:39:\"Igniter\\Flame\\Cart\\CartItemOptionValues\":2:{s:8:\"\0*\0items\";a:1:{i:13;O:38:\"Igniter\\Flame\\Cart\\CartItemOptionValue\":4:{s:2:\"id\";i:13;s:4:\"name\";s:5:\"Small\";s:3:\"qty\";i:1;s:5:\"price\";d:0;}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}', ''),
(10, 4, 3, 'ATA RICE', 1, 12.0000, 18.9500, 'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\O tIgniter\\Flame\\Cart\\CartItemOptionValue\":4:{s:2:\"id\";i:6;s:4:\"name\";s:4:\"Fish\";s:3:\"qty\";i:1;s:5:\"price\";d:4.95;}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}', ''),
(15, 6, 4, 'RICE AND DODO', 1, 11.9900, 18.9400, 'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:2:{i:5;O:33:\"Igniter\\Flame\\Cart\\CartItemOption\":3:{s:2:\"id\";i:5;s:4:\"name\";s:5:\"Sides\";s:6:\"values\";O:39:\"Igniter\\Flame\\Cart\\CartItemOptionValues\":y\\cIgniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}', NULL),
(29, 9, 9, 'Salad Cesar', 1, 11.9900, 11.9900, 'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}', NULL),
(30, 9, 11, 'YAM PORRIDGE', 1, 9.9900, 9.9900, 'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}', NULL),
(31, 10, 9, 'Salad Cesar', 1, 11.9sS"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}', NULL),
(41, 15, 11, 'YAM PORRIDGE', 1, 9.9900, 9.9900, 'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}', NULL),
(42, 15, 4, 'RICE AND DODO', 1, 11.9900, 16.9400, 'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:2:{i:5;O:33:\"Igniter\\Flame\\Cart\\CartItemOption\":3:{s:2:\"id\";i:5;s:4:\"name\";s:5:\"Sides\";s:6:\"values\";O:39:\"Igniter\\Flame\\Camlee 5;s:4:\"name\";s:4:\"Meat\";s:3:\"qty\";i:1;s:5:\"price\";d:4.95;}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}}i:4;O:33:\"Igniter\\Flame\\Cart\\CartItemOption\":3:{s:2:\"id\";i:4;s:4:\"name\";s:4:\"Size\";s:6:\"values\";O:39:\"Igniter\\Flame\\Cart\\CartItemOptionValues\":2:{s:8:\"\0*\0items\";a:1:{i:9;O:38:\"Igniter\\Flame\\Cart\\CartItemOptionValue\":4:{s:2:\"id\";i:9;s:4:\"name\";s:5:\"Large\";s:3:\"qty\";i:1;s:5:\"price\";d:5;}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}', ''),
(49, 19, 9, 'Salad Cesar', 1, 11.9900, 11.9900, 'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}', NULL),
(50, 20, 3, 'ATA RICE', 1, 12.0000, 16.9500, 'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:2:{i:3;O:33:\"Igniter\\Flame\\Cart\\CartItemOption\":3:{s:2:\"id\";i:3;s:4:\"name\";s:5:\"Sides\";s:6:\"values\";O:39:\"Igniter\\Flame\\Cart\\CartItemOptionValues\":2:{s:8:\"\0*\0items\";a:1:{i:6;O:38:\"Igniter\\Flame\\Cart\\CartItemOptionValue\":4:{s:2:\"id\";i:6;s:4:\"name\";s:4:\"Fish\";s:3:\"qty\";i:1;s:5:\"price\";d:4.95;}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}}i:4;O:33:\"Igniter\\Flame\\Cart\\CartItemOption\":3:{s:2:\"id\";i:4;s:4:\"name\";s:4:\"Size\";s:6:\"values\";O:39:\"Igniter\\Flame\\Cart\\CartItemOptionValues\":2:{s:8:\"\0*\0items\";a:1:{i:8;O:38:\"Igniter\\Flame\\Cart\\CartItemOptionValue\":4:{s:2:\"id\";i:8;s:4:\"name\";s:5:\"Small\";s:3:\"qty\";i:1;s:5:\"price\";d:0;}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}', ''),
(51, 20, 9, 'Salad Cesar', 1, 11.9900, 11.9900, 'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}', NULL),
(52, 21, 9, 'Salad Cesar', 1, 11.9900, 11.9900, 'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"', NULL),
(53, 22, 4, 'RICE AND DODO', 1, 11.9900, 11.9900, 'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"', NULL),
(54, tL2\0S)n8\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}', NULL),
(85, 35, 7, 'Simple Salad', 1, 8.9900, 8.9900, 'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}', NULL),
(86, 36, 9, 'Salad Cesar', 1, 11.9900, 11.9900, 'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}', NULL),
(87, 36, 8, 'Seafood Salad', 1, 5.9900, 5.9900, a",ehspi1a"a\}apeWhenCastingToString\";b:0;}', NULL),
(113, 45, 12, 'Boiled Plantain', 1, 9.9900, 9.9900, 'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}', NULL),
(114, 45, 11, 'YAM PORRIDGE', 1, 9.9900, 9.9900, 'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}', NULL),
(115, 45, 10, 'AMALA', 1, 11.9900, 18.9400, 'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0itemF ,Sp4:ro'ems\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}', NULL),
(140, 56, 8, 'Seafood Salad', 1, 5.9900, 5.9900, 'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}', NULL),
(141, 56, 11, 'YAM PORRIDGE', 1, 9.9900, 9.9900, 'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}', NULL),
(142, 57, 9, 'Salad Cesar', 1, 11.9900, 11.9900, 'O:34:mg."0\CLnan\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}', NULL),
(173, 65, 12, 'Boiled Plantain', 1, 9.9900, 9.9900, 'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}', NULL),
(174, 66, 7, 'Simple Salad', 1, 8.9900, 8.9900, 'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"', NULL),
(175, 67, 7, 'Simple Salad', 1, 8.9900, 8.9900, 'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s0l"ai{n\,,}sr1, 'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}', NULL),
(224, 85, 9, 'Salad Cesar', 1, 11.9900, 11.9900, 'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"', NULL),
(225, 85, 7, 'Simple Salad', 2, 8.9900, 17.9800, 'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"', NULL),
(226, 86, 10, 'AMALA', 1, 11.9900, 16.9400, 'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"', NULL),
(227, 86, 9, 'Salad Cesar', 1, 11.9900, 11.9900, 'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"', NULL),
(228, 87, 3, 'ATA RICE', 1, 12.0000, 21.9500, 'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"', NULL),
(229, 87, 8, 'Seafood Salad', 1, 5.9900, 5.9900, 'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"', NULL),
(230, 88, 9, 'Salad Cesar', 1, 11.9900, 11.9900, 'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"', NULL),
(231, 88, 8, 'Seafood Salad', 1, 5.9900, 5.9900, 'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"', NULL),
(232, 89, 9, 'Salad Cesar', 1, 11.9900, 11.9900, 'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"', NULL),
(233, 89, 8, 'Seafood Salad', 1, 5.9900, 5.9900, 'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"', NULL),
(234, 90, 9, 'Salad Cesar', 1, 11.9900, 11.9900, 'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}', NULL),
(235, 90, 8, 'Seafood Salad', 1, 5.9900, 5.9900, 'O:34:\"Igniter\\Flame\I cp"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}', NULL),
(253, 99, 4, 'RICE AND DODO', 1, 11.9900, 21.9400, 'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:2:{i:5;O:33:\"Igniter\\Flame\\Cart\\CartItemOption\":3:{s:2:\"id\";i:5;s:4:\"name\";s:5:\"Sides\";s:6:\"values\";O:39:\"Igniter\\Flame\\Cart\\CartItemOptionValues\":2:{s:8:\"\0*\0items\";a:1:{i:11;O:38:\"Igniter\\Flame\\Cart\\CartItem1iti\m3e0, 'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:2:{i:5;O:33:\"Igniter\\Flame\\Cart\\CartItemOption\":3:{s:2:\"id\";i:5;s:4:\"name\";s:5:\"Sides\";s:6:\"values\";O:39:\"Igniter\\Flame\\Cart\\CartItemOptionValues\":2:{s:8:\"\0*\0items\";a:1:{i:11;O:38:\"Igniter\\Flame\\Cart\\CartItemOptionValue\":4:{s:2:\"id\";i:11;s:4:\"name\";s:4:\"Fish\";s:3:\"qty\";i:1;s:5:\"price\";d:4.95;}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}}i:6;O:33:\"Igniter\\Flame\\Cart\\CartItemOption\":3:{s:2:\"ip0'\rationValues\":2:{s:8:\"\0*\0items\";a:1:{i:6;O:38:\"Igniter\\Flame\\Cart\\CartItemOptionValue\":4:{s:2:\"id\";i:6;s:4:\"name\";s:4:\"Fish\";s:3:\"qty\";i:1;s:5:\"price\";d:4.95;}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}}i:4;O:33:\"Igniter\\Flame\\Cart\\CartItemOption\":3:{s:2:\"id\";i:4;s:4:\"name\";s:4:\"Size\";s:6:\"values\";O:39:\"Igniter\\Flame\\Cart\\CartItemOptionValues\":2:{s:8:\"\0*\0items\";a:1:{i:8;O:38:\"Igniter\\Flame\\Cart\\CartItemOptionValue\":4:{s:2:\"id\";i:8;s:4:\"name\";s:5:\"Small\";s,rt;'t:\"Igniter\\Flame\\Cart\\CartItemOption\":3:{s:2:\"id\";i:2;s:4:\"name\";s:4:\"Size\";s:6:\"values\";O:39:\"Igniter\\Flame\\Cart\\CartItemOptionValues\":2:{s:8:\"\0*\0items\";a:1:{i:3;O:38:\"Igniter\\Flame\\Cart\\CartItemOptionValue\":4:{s:2:\"id\";i:3;s:4:\"name\";s:5:\"Small\";s:3:\"qty\";i:1;s:5:\"price\";d:0;}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}', ''),
(322, 121, 2, 'SCOTCH EGG', 1, 2.0000, 2.0000, 'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:\"oIo""mOption\":3:{s:2:\"id\";i:3;s:4:\"name\";s:5:\"Sides\";s:6:\"values\";O:39:\"Igniter\\Flame\\Cart\\CartItemOptionValues\":2:{s:8:\"\0*\0items\";a:1:{i:6;O:38:\"Igniter\\Flame\\Cart\\CartItemOptionValue\":4:{s:2:\"id\";i:6;s:4:\"name\";s:4:\"Fish\";s:3:\"qty\";i:1;s:5:\"price\";d:4.95;}}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}}i:4;O:33:\"Igniter\\Flame\\Cart\\CartItemOption\":3:{s:2:\"id\";i:4;s:4:\"name\";s:4:\"Size\";s:6:\"values\";O:39:\"Igniter\\Flame\\Cart\\CartItemOpsr95nC6LnCastingToString\";b:0;}', NULL),
(370, 133, 6, 'Whole catfish with rice and vegetables', 1, 13.9900, 13.9900, 'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}', NULL),
(371, 133, 9, 'Salad Cesar', 1, 11.9900, 11.9900, 'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}', NULL),
(372, 133, 8, 'Seafood Salad', 1, 5.9900, 5.9900, 'O:34:\"Igniter\\Flame\\Cart\\CartItemOp"\5 fTi\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}', NULL),
(425, 150, 11, 'YAM PORRIDGE', 1, 9.9900, 9.9900, 'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}', NULL),
(426, 151, 12, 'Boiled Plantain', 8, 9.9900, 79.9200, 'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"\0*\0items\";a:0:{}s:28:\"\0*\0escapeWhenCastingToString\";b:0;}', NULL),
(427, 151, 11, 'YAM PORRIDGE', 2, 9.9904tmIO tItemOptions\":2:{s:8:\"', NULL),
(457, 170, 1, 'Puff-Puff', 2, 4.9900, 9.9800, 'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"', NULL),
(458, 171, 10, 'AMALA', 2, 11.9900, 33.8800, 'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"', NULL),
(459, 171, 10, 'AMALA', 3, 11.9900, 45.8700, 'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"', NULL),
(460, 172, 10, 'AMALA', 2, 11.9900, 33.8800, 'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"', NULL),
(461, 172, 10, 'AMALA', 3, 11.99r4 rS9i6, 186, 4, 'RICE AND DODO', 2, 11.9900, 35.8800, 'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"', NULL),
(497, 186, 2, 'SCOTCH EGG', 1, 2.0000, 7.0000, 'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"', NULL),
(498, 186, 11, 'YAM PORRIDGE', 2, 9.9900, 19.9800, 'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"', NULL),
(499, 187, 3, 'ATA RICE', 2, 12.0000, 28.9500, 'O:34:\"Igniter\\Flame\\Cart\\CartItemOptions\":2:{s:8:\"', NULL),
(500, 187, 11, 'YAM'O:34:\"IgnitoXi0 2' 1),
(57, 68, 3, 'Meat', 4.9500, 177, 2, 4, 1),
(58, 68, 3, 'Large', 5.0000, 177, 3, 8, 1),
(59, 69, 10, 'Meat', 4.9500, 178, 2, 4, 1),
(60, 69, 10, 'Coke', 0.0000, 178, 4, 9, 1),
(61, 69, 1, 'Diet Coke', 0.0000, 179, 4, 10, 1),
(62, 71, 10, 'Fish', 4.9500, 185, 8, 18, 1),
(63, 71, 10, 'Coke', 0.0000, 185, 9, 20, 1),
(66, 82, 5, 'Large', 5.0000, 218, 7, 16, 1),
(67, 86, 10, 'Meat', 4.9500, 226, 2, 4, 1),
(68, 86, 10, 'Diet Coke', 0.0000, 226, 4, 10, 1),
(69, 87, 3, 'Fish', 4.9500, 228, 2, 5, 1),
(70, 87, 3, ,,5 ,73, 2, 4, 1),
(187, 177, 10, 'Coke', 0.0000, 473, 4, 9, 1),
(188, 177, 10, 'Meat', 4.9500, 473, 2, 4, 1),
(189, 177, 10, 'Coke', 0.0000, 473, 4, 9, 1),
(190, 177, 10, 'Fish', 4.9500, 473, 2, 5, 1),
(191, 177, 10, 'Diet Coke', 0.0000, 473, 4, 10, 1),
(192, 181, 5, 'Meat', 4.9500, 483, 2, 4, 1),
(193, 182, 3, 'Beef', 6.9500, 484, 2, 6, 1),
(194, 182, 3, 'Small', 0.0000, 484, 3, 7, 1),
(195, 182, 5, 'Small', 0.0000, 485, 3, 7, 1),
(196, 183, 2, 'Small', 0.0000, 486, 3, 7, 5),
(197 3, 8, 1),
(198, 183, 10, 'F,0 s 2O0.0000, 1, 1),
(41, 15, 'subtotal', 'Sub Total', 50.9100, 0, 0),
(42, 15, 'total', 'Order Total', 50.9100, 127, 0),
(43, 16, 'delivery', 'Delivery', 0.0000, 1, 1),
(44, 16, 'subtotal', 'Sub Total', 2.0000, 0, 0),
(45, 16, 'total', 'Order Total', 2.0000, 127, 0),
(46, 17, 'delivery', 'Delivery', 0.0000, 1, 1),
(47, 17, 'subtotal', 'Sub Total', 29.9400, 0, 0),
(48, 17, 'total', 'Order Total', 29.9400, 127, 0),
(49, 18, 'delivery', 'Delivery', 0.0000, 1, 1),
(50, 18, 'subtotal', 1, 18, 'tota8lr 0123, 42, 'total', 'Order Total', 60.8900, 127, 0),
(124, 43, 'subtotal', 'Sub Total', 36.9200, 0, 0),
(125, 43, 'total', 'Order Total', 36.9200, 127, 0),
(126, 44, 'delivery', 'Delivery', 0.0000, 1, 1),
(127, 44, 'subtotal', 'Sub Total', 27.9700, 0, 0),
(128, 44, 'total', 'Order Total', 27.9700, 127, 0),
(129, 45, 'delivery', 'Delivery', 0.0000, 1, 1),
(130, 45, 'subtotal', 'Sub Total', 38.9200, 0, 0),
(131, 45, 'total', 'Order Total', 38.9200, 127, 0),
(132, 46, 'delivery', '(133,ery', 0.0000, 1, 1),
(133, 46, ''ybl4 2 76, 'delivery', 'Delivery', 0.0000, 1, 1),
(215, 76, 'subtotal', 'Sub Total', 26.9700, 0, 0),
(216, 76, 'total', 'Order Total', 26.9700, 127, 0),
(217, 77, 'subtotal', 'Sub Total', 26.9700, 0, 0),
(218, 77, 'Table 02', 'Sub Total', 28.9400, 0, 0),
(219, 77, 'total', 'Order Total', 26.9700, 127, 0),
(220, 77, 'delivery', 'Delivery', 0.0000, 1, 1),
(221, 78, 'delivery', 'Delivery', 0.0000, 1, 1),
(222, 78, 'subtotal', 'Sub Total', 26.9700, 0, 0),
(223, 78, 'total', 'Order Total''r,9ttrDelivery', 0.0000, 1, 1),
(305, 114, 'delivery', 'Delivery', 0.0000, 1, 1),
(306, 114, 'subtotal', 'Sub Total', 19.9800, 0, 0),
(307, 114, 'total', 'Order Total', 19.9800, 127, 0),
(308, 115, 'delivery', 'Delivery', 0.0000, 1, 1),
(309, 115, 'subtotal', 'Sub Total', 19.9800, 0, 0),
(310, 115, 'total', 'Order Total', 19.9800, 127, 0),
(311, 116, 'subtotal', 'Sub Total', 19.9800, 0, 0),
(312, 116, 'Table 02', 'Sub Total', 52.9100, 0, 0),
(313, 116, 'total', 'Order Total', 19.9800, 127, 0),
(314, 116, 'delivery', 'Deliveryvs2, 4139, 'subtotal', 'Table 02', 0.0000, 0, 0),
(385, 139, 'Table 02', 'Sub Total', 11.9900, 0, 0),
(386, 139, 'total', 'Order Total', 11.9900, 0, 0),
(387, 140, 'delivery', 'Delivery', 0.0000, 1, 1),
(388, 140, 'subtotal', 'Sub Total', 9.9900, 0, 0),
(389, 140, 'total', 'Order Total', 9.9900, 127, 0),
(390, 141, 'subtotal', 'Table 02', 0.0000, 0, 0),
(391, 141, 'Table 02', 'Sub Total', 5.9900, 0, 0),
(392, 141, 'total', 'Order Total', 5.9900, 0, 0),
(393, 142, 'subtotal', 'Table 'Tt9 44 19, 'subtotal', 'Table 01', 0.0000, 0, 0),
(475, 169, 'Table 01', 'Sub Total', 95.9200, 0, 0),
(476, 169, 'total', 'Order Total', 95.9200, 0, 0),
(477, 170, 'subtotal', 'Table 01', 0.0000, 0, 0),
(478, 170, 'Table 01', 'Sub Total', 33.9600, 0, 0),
(479, 170, 'total', 'Order Total', 33.9600, 0, 0),
(480, 171, 'subtotal', 'Table 01', 0.0000, 0, 0),
(481, 171, 'Table 01', 'Sub Total', 69.8500, 0, 0),
(482, 171, 'total', 'Order Total', 69.8500, 0, 0),
(483, 172, 'subtotal', 'Table 01', 0.0000, 0, 0),
(484, 172, 'Table 01', 'Sub Totatby,'ere_id`, `title`, `content`, `meta_description`, `meta_keywords`, `created_at`, `updated_at`, `status`, `permalink_slug`, `layout`, `metadata`, `priority`) VALUES
(1, 1, 'About Us', 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.', '', '', '2024-12-31 19:17:37', '2024-12-31 19:17:37', 1, 'about-us', 'static', '{\"navigation\":\"0\"}', NULL),
(2, 1, 'Policy', 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.', '', '', '2024-12-31 19:17:37', '2024-12-31 19:17:37'vCT{einedit card payments using Square', NULL, 0, 0, 6, '2024-12-31 19:17:38', '2024-12-31 19:17:38');

-- --------------------------------------------------------

--
-- Structure de la table `ti_payment_logs`
--

DROP TABLE IF EXISTS `ti_payment_logs`;
CREATE TABLE IF NOT EXISTS `ti_payment_logs` (
  `payment_log_id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `order_id` int NOT NULL,
  `payment_name` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `message` varchar(128) CHARACTER SET utf)fer xIMESTAMP\":\"2025-01-25T19:46:47Z\",\"CORRELATIONID\":\"446297678e52b\",\"ACK\":\"Failure\",\"VERSION\":\"119.0\",\"BUILD\":\"58807128\",\"L_ERRORCODE0\":\"10002\",\"L_SHORTMESSAGE0\":\"Authentication\\/Authorization Failed\",\"L_LONGMESSAGE0\":\"You do not have permissions to make this API call\",\"L_SEVERITYCODE0\":\"Error\"}', 0, '2025-01-25 19:46:47', '2025-01-25 19:46:47', 'paypalexpress', 0, NULL),
(5, 7, 'PayPal Express', 'Payment error -> You do not have permissions to make this API call', '{\"amounto4cr  _`2:01:01', '2025-01-08 22:01:01'),
(5, 'http://197.140.11.160:8004/sqlite/main.php', 404, '[\"http:\\/\\/197.140.11.160:8004\\/\"]', 3, '2025-01-08 22:01:02', '2025-01-08 22:01:04'),
(6, 'http://197.140.11.160:8004/sqlitemanager/main.php', 404, '[\"http:\\/\\/197.140.11.160:8004\\/\"]', 2, '2025-01-08 22:01:02', '2025-01-08 22:01:03'),
(7, 'http://197.140.11.160:8004/main.php', 404, '[\"http:\\/\\/197.140.11.160:8004\\/\"]', 1, '2025-01-08 22:01:05', '2025-01-08 22:01:05'),
(8, 'http://197.140.11.160:8004/tesh0"'h61:37'),
(32, 'http://197.140.11.160:8004/phpMyAdmin-2.5.7-pl1', 404, '[\"http:\\/\\/197.140.11.160:8004\\/\"]', 1, '2025-01-08 22:01:37', '2025-01-08 22:01:37'),
(33, 'http://197.140.11.160:8004/phpMyAdmin-2.6.0-alpha', 404, '[\"http:\\/\\/197.140.11.160:8004\\/\"]', 1, '2025-01-08 22:01:38', '2025-01-08 22:01:38'),
(34, 'http://197.140.11.160:8004/phpMyAdmin-2.6.0-alpha2', 404, '[\"http:\\/\\/197.140.11.160:8004\\/\"]', 1, '2025-01-08 22:01:38', '2025-01-08 22:01:38'),
(35, 'yAdmin-2.6.0-beta1', 404, '[\"http:\\/\\/197.140.11.160:8004\\/\"]', 1, '2025-01-08 22:01:39', '2025-01-08 22:01:39'),
(36, 'http://197.140.11.160:8004/phpMyAdmin-2.6.0-beta2', 404, '[\"http:\\/\\/197.140.11.160:8004\\/\"]', 1, '2025-01-08 22:01:39', '2025-01-08 22:01:39'),
(37, 'http://197.140.11.160:8004/phpMyAdmin-2.6.0-rc1', 404, '[\"http:\\/\\/197.140.11.160:8004\\/\"]', 1, '2025-01-08 22:01:39', '2025-01-08 22:01:39'),
(38, 'http://197.140.11.160:8004/phpMyAdmin-2.6.0-rc2', 404, '[\"http:\\/\\/197.140.1p1-01-08 22:01:50'),
(52, 'http://197.140.11.160:8004/phpMyAdmin-2.6.2', 404, '[\"http:\\/\\/197.140.11.160:8004\\/\"]', 1, '2025-01-08 22:01:52', '2025-01-08 22:01:52'),
(53, 'http://197.140.11.160:8004/phpMyAdmin-2.6.2-pl1', 404, '[\"http:\\/\\/197.140.11.160:8004\\/\"]', 1, '2025-01-08 22:01:54', '2025-01-08 22:01:54'),
(54, 'http://197.140.11.160:8004/phpMyAdmin-2.6.3', 404, '[\"http:\\/\\/197.140.11.160:8004\\/\"]', 2, '2025-01-08 22:01:55', '2025-01-08 22:01:57'),
(55, 'http://197.140.11.160:8004/phpMyAd00y02.,M18', '2025-01-08 22:02:18'),
(86, 'http://197.140.11.160:8004/webadmin', 404, '[\"http:\\/\\/197.140.11.160:8004\\/\"]', 1, '2025-01-08 22:02:19', '2025-01-08 22:02:19'),
(87, 'http://197.140.11.160:8004/sqlweb', 404, '[\"http:\\/\\/197.140.11.160:8004\\/\"]', 1, '2025-01-08 22:02:20', '2025-01-08 22:02:20'),
(88, 'http://197.140.11.160:8004/websql', 404, '[\"http:\\/\\/197.140.11.160:8004\\/\"]', 1, '2025-01-08 22:02:22', '2025-01-08 22:02:22'),
(89, 'http://197.140.11.160:8004/webdb', 404, '[\"http:\\/\\/11t/,abHlpJU0RWU2Jqa3djWHB2ZFZBMFZUVTVTRlpNTm5WMWRGQXljMHcyVGpKUlBUMGlMQ0p0WVdNaU9pSTVaalprTVdNeFpXTmlOVGc1TmpjeE4ySTBZekF6WldGbE1UQmlOVEE1WXpFNVpqaGlOVFV4TW1Zd1pqQmpaakU1WWpVMlpqTmxObVF3TkdZMk9HRmxJaXdpZEdGbklqb2lJbjA9&u-order=144\"]', 3, '2025-03-06 00:55:22', '2025-03-06 02:29:15'),
(108, 'http://127.0.0.1:8080/themes/typical/assets/images/pattern7.png', 404, '[\"http:\\/\\/127.0.0.1:8080\\/checkout\"]', 22, '2025-03-06 00:56:24', '2025-03-06 03:03:03'),
(109, 'http://127.0.0.1:8000/favicon.ico', 404, '[\"http:\\/CeU`eLTS `ti_reservation_tables` (
  `reservation_id` int UNSIGNED NOT NULL,
  `table_id` int UNSIGNED NOT NULL,
  UNIQUE KEY `ti_reservation_tables_reservation_id_table_id_unique` (`reservation_id`,`table_id`),
  KEY `ti_reservation_tables_reservation_id_index` (`reservation_id`),
  KEY `ti_reservation_tables_table_id_index` (`table_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Déargement des donné de la table `ti_reservation_tables`
--

INSERT`reservation_id`, `table_iEeoNfU, '3', NULL),
(53, 'config', 'processing_order_status.2', '4', NULL),
(54, 'config', 'completed_order_status.0', '5', NULL),
(55, 'config', 'image_manager.max_size', '300', NULL),
(56, 'config', 'image_manager.thumb_width', '320', NULL),
(57, 'config', 'image_manager.thumb_height', '220', NULL),
(58, 'config', 'image_manager.uploads', '1', NULL),
(59, 'config', 'image_manager.new_folder', '1', NULL),
(60, 'config', 'image_manager.copy', '1', NULL),
(61, 'config', 'image_manageig',-Ltrer, 'admin_dashboardwidgets_default_dashboard.cache.width', '6', NULL),
(117, 'config', 'dashboard_logo', '/1.png', NULL),
(118, 'config', 'loader_logo', '/main.jpg', NULL),
(120, 'config', 'mail_logo', '/2.png', NULL),
(121, 'config', 'smtp_encryption', 'tls', NULL),
(122, 'config', 'mailgun_domain', '', NULL),
(123, 'config', 'mailgun_secret', '', NULL),
(124, 'config', 'postmark_token', '', NULL),
(125, 'config', 'ses_key', '', NULL),
(126, 'config', 'ses_secret', '', NULL),
(127, 'config', 'ses_region', ''Ld=t '8t des donné de la table `ti_staff_roles`
--

INSERT INTO `ti_staff_roles` (`staff_role_id`, `name`, `code`, `description`, `permissions`, `created_at`, `updated_at`) VALUES
(1, 'Owner', 'owner', 'Default role for restaurant owners', 'a:40:{s:15:\"Admin.Dashboard\";s:1:\"1\";s:15:\"Admin.Allergens\";s:1:\"1\";s:16:\"Admin.Categories\";s:1:\"1\";s:11:\"Admin.Menus\";s:1:\"1\";s:15:\"Admin.Mealtimes\";s:1:\"1\";s:15:\"Admin.Locations\";s:1:\"1\";s:12:\"Admin.Tables\";s:1:\"1\";s:12:\"Admin.Orders\";s:1:\"1\";oau"grti_statuses`;
CREATE TABLE IF NOT EXISTS `ti_statuses` (
  `status_id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `status_name` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `status_comment` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `notify_customer` tinyint(1) DEFAULT NULL,
  `status_for` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `status_color` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` tim7f-At:5, 0, '', '2025-02-07 11:30:46', '2025-02-07 11:30:46'),
(35, 15, 'orders', NULL, 1, 0, 'Your order has been received.', '2025-02-07 11:31:49', '2025-02-07 11:31:49'),
(36, 15, 'orders', 1, 3, 1, 'Your order is in the kitchen', '2025-02-07 11:32:20', '2025-02-07 11:32:20'),
(37, 15, 'orders', 1, 1, 1, 'Your order has been received.', '2025-02-07 11:32:35', '2025-02-07 11:32:35'),
(38, 16, 'orders', NULL, 1, 0, 'Your order has been received.', '2025-02-07 11:33:01', '2025-02-07 0 r) 2u, 21, 'orders', NULL, 10, 0, 'Your order is paid', '2025-03-02 15:02:48', '2025-03-02 15:02:48'),
(274, 122, 'orders', NULL, 3, 1, 'Your order is in the kitchen', '2025-03-02 15:03:47', '2025-03-02 15:03:47'),
(275, 122, 'orders', NULL, 5, 0, '', '2025-03-02 15:04:00', '2025-03-02 15:04:00'),
(276, 122, 'orders', NULL, 10, 0, 'Your order is paid', '2025-03-02 15:04:15', '2025-03-02 15:04:15'),
(277, 118, 'orders', NULL, 9, 0, '', '2025-03-02 20:51:33', '2025-03-02 20:51:33'),
(278, 118, 'orders', NULL, 10, 1,  3e23,
(309, 134, 'orders', NULL, 5, 0, '', '2025-03-03 15:46:54', '2025-03-03 15:46:54'),
(310, 134, 'orders', NULL, 10, 1, 'Your order is paid', '2025-03-03 16:11:29', '2025-03-03 16:11:29'),
(311, 131, 'orders', NULL, 10, 1, 'Your order is paid', '2025-03-03 16:11:31', '2025-03-03 16:11:31'),
(312, 130, 'orders', NULL, 10, 1, 'Your order is paid', '2025-03-03 16:11:32', '2025-03-03 16:11:32'),
(313, 135, 'orders', NULL, 5, 0, '', '2025-03-03 16:13:28', '2025-03-03 16:13:28'),
(314, 136, 'orders', NULL, 3, 1, ''00id:,Eorder_id_foreign` (`order_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Structure de la table `ti_tables`
--

DROP TABLE IF EXISTS `ti_tables`;
CREATE TABLE IF NOT EXISTS `ti_tables` (
  `table_id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `table_name` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `min_capacity` int NOT NULL,
  `max_capacity` int NOT NULL,
  `table_status` tinyint(1) NOT NULL,
  `extra_capacity` int NOT NULL DEFAULT '0',
  `is_joinable` tinyint(1) NOT NULL DEFAULT '1',
  `priority` int NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `qr_code` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`table_id`)
) ENGINE=InnoDB AUTO_INCREMENT=30 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Déargement des donné de la table `ti_ta
les`
--

INSERT INTO `ti_tables` (`table_id`, `table_name`, `min_capacity`, `max_capacity`, `table_status`, `extra_capacity`, `is_joinable`, `priority`, `created_at`, `updated_at`, `qr_code`) VALUES
(24, 'Table 01', 2, 4, 1, 2, 1, 1, '2025-03-02 12:55:45', '2025-03-02 12:55:45', 'ms10zQpxP'),
(26, 'Table 05', 1, 9, 1, 2, 1, 4, '2025-03-02 13:35:15', '2025-03-02 20:55:57', 'ms26TONOGs'),
(27, 'Table 03', 3, 6, 1, 2, 1, 1, '2025-03-02 20:56:51', '2025-03-02 20:56:51', 'ms27ZTG0Uk'),
(28, 'Table 04', 2, 5, 1, 3, 1, 1, '2025-03-03 14:03:35', r
 ], \"subtitle_history\": \"\", \"button.item.price\": \"#ffffff\", \"footer.background\": \"#2d2b2f\", \"footer.font_color\": \"#ffffff\", \"header_breadcrumb\": null, \"reservation_image\": null, \"button.icons.color\": \"#ffffff\", \"button.item.border\": \"#29282d\", \"heading.background\": \"#2b3e50\", \"button.titles.color\": \"#ffffff\", \"gdpr_cookie_message\": \"We use own and third party cookies to improve our services. If you continue to browse, consider accepting i"oU f7:28', NULL, NULL, NULL),
(2, 2, 'user', '$2y$10$sqyd64X3Vkxz7m2hPvSTDuCH72bYu6o03qcXZJqYM/7p.7oEaSypy', 0, NULL, NULL, NULL, NULL, 1, '2025-01-02 00:00:00', '2025-03-03 15:32:59', NULL, NULL, NULL);

-- --------------------------------------------------------

--
-- Structure de la table `ti_user_preferences`
--

DROP TABLE IF EXISTS `ti_user_preferences`;
CREATE TABLE IF NOT EXISTS `ti_user_preferences` (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `item` varchar(128) CHARACTER }deIu'1ion', 21);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;


-- Orders Module Database Tables
-- Run this in phpMyAdmin or MySQL client to create the orders tables

CREATE TABLE IF NOT EXISTS `orders_tbl` (
  `order_id` int(11) NOT NULL AUTO_INCREMENT,
  `order_no` varchar(50) DEFAULT NULL UNIQUE,
  `status` enum('NEW','ACCEPTED','COOKING','READY','SERVED','CANCELLED') NOT NULL DEFAULT 'NEW',
  `table_no` varchar(50) DEFAULT NULL,
  `notes` text,
  `total_amount` decimal(10,2) NOT NULL DEFAULT 0.00,
  `restaurant_id` int(11) NOT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`order_id`),
  KEY `idx_restaurant_id` (`restaurant_id`),
  KEY `idx_status` (`status`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `order_items_tbl` (
  `order_item_id` int(11) NOT NULL AUTO_INCREMENT,
  `order_id` int(11) NOT NULL,
  `food_item_id` int(11) NOT NULL,
  `item_name` varchar(100) NOT NULL,
  `unit_price` decimal(10,2) NOT NULL,
  `qty` int(11) NOT NULL,
  `line_total` decimal(10,2) NOT NULL,
  `notes` text,
  PRIMARY KEY (`order_item_id`),
  KEY `idx_order_id` (`order_id`),
  KEY `idx_food_item_id` (`food_item_id`),
  CONSTRAINT `fk_order_items_order` FOREIGN KEY (`order_id`) REFERENCES `orders_tbl` (`order_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_order_items_food_item` FOREIGN KEY (`food_item_id`) REFERENCES `food_items_tbl` (`food_items_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

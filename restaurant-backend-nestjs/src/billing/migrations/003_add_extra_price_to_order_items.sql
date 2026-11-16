-- Migration: Add extra_price and extra_description to kitchen_order_items_tbl
-- Date: 2026-11-16
-- Description: Supports Custom Item Add-ons / Extra Charges per item in manual orders

-- Standard MySQL 5.7+ / 8.0+ compatible ALTER statements
ALTER TABLE `kitchen_order_items_tbl` 
ADD COLUMN `extra_price` DECIMAL(10,2) NOT NULL DEFAULT 0.00 COMMENT 'Extra add-on charge per unit';

ALTER TABLE `kitchen_order_items_tbl` 
ADD COLUMN `extra_description` VARCHAR(255) NULL COMMENT 'Add-on details e.g. Extra Cheese';

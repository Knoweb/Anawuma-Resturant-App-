-- Migration: Add dining_type and discount columns to orders and invoices tables
-- Date: 2026-11-16
-- Description: Supports Take Away (0% Service Charge) and Bill Discount features in Production

-- 1. Add dining_type to orders table
ALTER TABLE `orders` 
ADD COLUMN IF NOT EXISTS `dining_type` VARCHAR(20) DEFAULT 'DINE_IN' COMMENT 'DINE_IN or TAKEAWAY';

-- 2. Add dining_type and discount fields to invoices table
ALTER TABLE `invoices` 
ADD COLUMN IF NOT EXISTS `dining_type` VARCHAR(20) DEFAULT 'DINE_IN' COMMENT 'DINE_IN or TAKEAWAY';

ALTER TABLE `invoices` 
ADD COLUMN IF NOT EXISTS `discount_amount` DECIMAL(10,2) DEFAULT 0.00 COMMENT 'Calculated discount deduction in LKR';

ALTER TABLE `invoices` 
ADD COLUMN IF NOT EXISTS `discount_type` VARCHAR(20) DEFAULT 'NONE' COMMENT 'NONE, PERCENTAGE, or FIXED';

ALTER TABLE `invoices` 
ADD COLUMN IF NOT EXISTS `discount_value` DECIMAL(10,2) DEFAULT 0.00 COMMENT 'Entered discount rate (%) or fixed value (Rs)';

ALTER TABLE `invoices` 
ADD COLUMN IF NOT EXISTS `discount_reason` VARCHAR(255) NULL COMMENT 'Cashier promo or discount justification';

-- Indexes for performance and reporting
ALTER TABLE `orders` ADD INDEX IF NOT EXISTS `idx_orders_dining_type` (`dining_type`);
ALTER TABLE `invoices` ADD INDEX IF NOT EXISTS `idx_invoices_dining_type` (`dining_type`);

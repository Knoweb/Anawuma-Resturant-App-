-- Migration: Create bill_actions table for tracking bill downloads, prints, and WhatsApp sends
-- Date: 2026-03-17

CREATE TABLE IF NOT EXISTS `bill_actions` (
  `bill_action_id` CHAR(36) NOT NULL COMMENT 'UUID primary key',
  `invoice_id` INT NOT NULL COMMENT 'Foreign key to invoices table',
  `order_id` INT NOT NULL COMMENT 'Order ID for quick lookup',
  `restaurant_id` INT NOT NULL COMMENT 'Restaurant ID for data isolation',
  `action_type` ENUM('PDF_DOWNLOADED', 'BILL_PRINTED', 'WHATSAPP_SENT') NOT NULL COMMENT 'Type of action performed',
  `user_id` INT NULL COMMENT 'User who performed the action',
  `device_info` VARCHAR(255) NULL COMMENT 'Device/browser information',
  `ip_address` VARCHAR(50) NULL COMMENT 'IP address of the client',
  `notes` TEXT NULL COMMENT 'Additional notes about the action',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'When the action was recorded',
  
  PRIMARY KEY (`bill_action_id`),
  FOREIGN KEY (`invoice_id`) REFERENCES `invoices` (`invoice_id`) ON DELETE CASCADE,
  INDEX `idx_invoice_id` (`invoice_id`),
  INDEX `idx_order_id` (`order_id`),
  INDEX `idx_restaurant_id` (`restaurant_id`),
  INDEX `idx_action_type` (`action_type`),
  INDEX `idx_created_at` (`created_at`),
  INDEX `idx_invoice_created` (`invoice_id`, `created_at`),
  INDEX `idx_order_restaurant` (`restaurant_id`, `order_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Tracks bill actions: PDF downloads, prints, WhatsApp sends';

-- Add new columns to invoices table if they don't exist (for tracking)
ALTER TABLE `invoices` ADD COLUMN IF NOT EXISTS `is_printed` TINYINT(1) DEFAULT 0 COMMENT 'Whether the bill was printed' AFTER `is_sent_whatsapp`;
ALTER TABLE `invoices` ADD COLUMN IF NOT EXISTS `is_sent_whatsapp` TINYINT(1) DEFAULT 0 COMMENT 'Whether the bill was sent via WhatsApp' AFTER `is_printed`;
ALTER TABLE `invoices` ADD COLUMN IF NOT EXISTS `is_sent_to_cashier` TINYINT(1) DEFAULT 0 COMMENT 'Whether the bill was handed off to cashier' AFTER `is_printed`;
ALTER TABLE `invoices` ADD COLUMN IF NOT EXISTS `sent_to_cashier_at` DATETIME NULL COMMENT 'When the bill was handed off to cashier' AFTER `is_sent_to_cashier`;

-- Create indexes on invoices for bill action tracking
ALTER TABLE `invoices` ADD INDEX IF NOT EXISTS `idx_is_printed` (`is_printed`);
ALTER TABLE `invoices` ADD INDEX IF NOT EXISTS `idx_is_sent_whatsapp` (`is_sent_whatsapp`);
ALTER TABLE `invoices` ADD INDEX IF NOT EXISTS `idx_is_sent_to_cashier` (`is_sent_to_cashier`);

-- Sample query: Get bill action summary for an order
-- SELECT 
--   ba.action_type,
--   COUNT(*) as count,
--   MAX(ba.created_at) as last_action
-- FROM bill_actions ba
-- WHERE ba.order_id = ? AND ba.restaurant_id = ?
-- GROUP BY ba.action_type;

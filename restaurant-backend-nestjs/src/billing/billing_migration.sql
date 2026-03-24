-- ============================================================
-- Billing Module Migration
-- Run once against the restaurant_db database
-- ============================================================

-- 1. Add BILLED to the kitchen_orders_tbl status enum
ALTER TABLE kitchen_orders_tbl
  MODIFY COLUMN status ENUM('NEW','ACCEPTED','COOKING','READY','BILLED','SERVED','CANCELLED')
  NOT NULL DEFAULT 'NEW';

-- 2. Create the invoices table
CREATE TABLE IF NOT EXISTS invoices (
  invoice_id        INT              NOT NULL AUTO_INCREMENT,
  invoice_number    VARCHAR(50)      NOT NULL,
  order_id          INT              NOT NULL,
  restaurant_id     INT              NOT NULL,
  customer_name     VARCHAR(255)     NULL,
  whatsapp_number   VARCHAR(50)      NULL,
  table_no          VARCHAR(50)      NULL,
  order_items_json  JSON             NOT NULL,
  subtotal          DECIMAL(10,2)    NOT NULL DEFAULT 0.00,
  tax_amount        DECIMAL(10,2)    NOT NULL DEFAULT 0.00,
  service_charge    DECIMAL(10,2)    NOT NULL DEFAULT 0.00,
  discount_amount   DECIMAL(10,2)    NOT NULL DEFAULT 0.00,
  total_amount      DECIMAL(10,2)    NOT NULL DEFAULT 0.00,
  invoice_status    ENUM('PENDING','PAID') NOT NULL DEFAULT 'PENDING',
  is_printed        TINYINT(1)       NOT NULL DEFAULT 0,
  is_sent_to_cashier TINYINT(1)      NOT NULL DEFAULT 0,
  is_sent_whatsapp  TINYINT(1)       NOT NULL DEFAULT 0,
  sent_to_cashier_at DATETIME        NULL,
  accountant_transfer_status VARCHAR(20) NOT NULL DEFAULT 'NONE',
  sent_to_accountant_at DATETIME    NULL,
  sent_to_accountant_by_admin_id INT NULL,
  accepted_by_accountant_at DATETIME NULL,
  accepted_by_accountant_id INT     NULL,
  created_by_admin_id INT            NULL,
  created_at        TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (invoice_id),
  UNIQUE KEY uq_invoice_number (invoice_number),
  INDEX idx_order_id (order_id),
  INDEX idx_restaurant_id (restaurant_id),
  INDEX idx_sent_to_cashier (is_sent_to_cashier),
  INDEX idx_accountant_transfer_status (accountant_transfer_status),
  INDEX idx_sent_to_accountant_at (sent_to_accountant_at),
  INDEX idx_accepted_by_accountant_at (accepted_by_accountant_at),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

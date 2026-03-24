-- ============================================================
-- Accountant Transfer Workflow Migration
-- Adds cashier -> accountant handoff tracking columns to invoices
-- ============================================================

ALTER TABLE invoices
  ADD COLUMN accountant_transfer_status VARCHAR(20) NOT NULL DEFAULT 'NONE' AFTER sent_to_cashier_at,
  ADD COLUMN sent_to_accountant_at DATETIME NULL AFTER accountant_transfer_status,
  ADD COLUMN sent_to_accountant_by_admin_id INT NULL AFTER sent_to_accountant_at,
  ADD COLUMN accepted_by_accountant_at DATETIME NULL AFTER sent_to_accountant_by_admin_id,
  ADD COLUMN accepted_by_accountant_id INT NULL AFTER accepted_by_accountant_at;

ALTER TABLE invoices
  ADD INDEX idx_accountant_transfer_status (accountant_transfer_status),
  ADD INDEX idx_sent_to_accountant_at (sent_to_accountant_at),
  ADD INDEX idx_accepted_by_accountant_at (accepted_by_accountant_at);

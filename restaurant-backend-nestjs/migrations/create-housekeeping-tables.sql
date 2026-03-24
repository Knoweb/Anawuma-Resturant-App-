-- Migration: Create Housekeeping Module Tables
-- Date: 2026-02-26
-- Description: Creates room_qr_tbl and housekeeping_requests_tbl for Room Service module

-- =====================================================
-- Table: room_qr_tbl
-- Purpose: Store QR codes for hotel rooms
-- =====================================================
CREATE TABLE IF NOT EXISTS room_qr_tbl (
  room_qr_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  restaurant_id INT NOT NULL,
  room_no VARCHAR(50) NOT NULL,
  room_key VARCHAR(64) NOT NULL UNIQUE COMMENT 'Unique key for QR code resolution',
  qr_url TEXT COMMENT 'Full QR code URL for guest access',
  is_active TINYINT(1) DEFAULT 1 COMMENT 'Active status',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_restaurant_id (restaurant_id),
  INDEX idx_room_no (room_no),
  INDEX idx_room_key (room_key),
  INDEX idx_active (is_active),
  
  CONSTRAINT fk_room_qr_restaurant 
    FOREIGN KEY (restaurant_id) 
    REFERENCES restaurant_tbl(restaurant_id) 
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Room QR codes for housekeeping service';

-- =====================================================
-- Table: housekeeping_requests_tbl
-- Purpose: Store housekeeping service requests from guests
-- =====================================================
CREATE TABLE IF NOT EXISTS housekeeping_requests_tbl (
  request_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  restaurant_id INT NOT NULL,
  room_no VARCHAR(50) NOT NULL,
  request_type ENUM('CLEANING', 'TOWELS', 'WATER', 'OTHER') DEFAULT 'CLEANING' COMMENT 'Type of service request',
  message TEXT COMMENT 'Optional message from guest',
  status ENUM('NEW', 'IN_PROGRESS', 'DONE', 'CANCELLED') DEFAULT 'NEW' COMMENT 'Request status',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_restaurant_id (restaurant_id),
  INDEX idx_room_no (room_no),
  INDEX idx_status (status),
  INDEX idx_type (request_type),
  INDEX idx_created_at (created_at),
  
  CONSTRAINT fk_housekeeping_restaurant 
    FOREIGN KEY (restaurant_id) 
    REFERENCES restaurant_tbl(restaurant_id) 
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Housekeeping service requests from hotel guests';

-- =====================================================
-- Verification Queries (run after migration)
-- =====================================================
-- DESCRIBE room_qr_tbl;
-- DESCRIBE housekeeping_requests_tbl;
-- SELECT COUNT(*) FROM room_qr_tbl;
-- SELECT COUNT(*) FROM housekeeping_requests_tbl;

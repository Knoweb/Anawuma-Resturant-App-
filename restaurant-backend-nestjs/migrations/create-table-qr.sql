-- Create table_qr_tbl for old-system style QR ordering
-- Each table has unique QR code with tableKey

CREATE TABLE IF NOT EXISTS table_qr_tbl (
  table_qr_id INT AUTO_INCREMENT PRIMARY KEY,
  restaurant_id INT NOT NULL,
  table_no VARCHAR(50) NOT NULL,
  table_key VARCHAR(64) NOT NULL UNIQUE,
  qr_url TEXT NULL,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT fk_table_qr_restaurant 
    FOREIGN KEY (restaurant_id) 
    REFERENCES restaurant_tbl(restaurant_id) 
    ON DELETE CASCADE,
    
  INDEX idx_table_key (table_key),
  INDEX idx_restaurant_tables (restaurant_id, table_no),
  UNIQUE KEY unique_restaurant_table (restaurant_id, table_no)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create reports_history_tbl table
CREATE TABLE IF NOT EXISTS reports_history_tbl (
  report_id INT AUTO_INCREMENT PRIMARY KEY,
  restaurant_id INT NOT NULL,
  report_type VARCHAR(50) NOT NULL,
  from_date DATE NULL,
  to_date DATE NULL,
  total_orders INT DEFAULT 0,
  total_revenue DECIMAL(10, 2) DEFAULT 0.00,
  generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (restaurant_id) REFERENCES restaurant_tbl(restaurant_id) ON DELETE CASCADE,
  INDEX idx_restaurant_generated (restaurant_id, generated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Migration: Create offers_tbl
-- Description: Table for storing special offers and discounts for restaurants
-- Author: System
-- Date: 2024

CREATE TABLE IF NOT EXISTS offers_tbl (
    offer_id INT AUTO_INCREMENT PRIMARY KEY,
    restaurant_id INT NOT NULL,
    title VARCHAR(150) NOT NULL,
    description TEXT,
    discount_type ENUM('PERCENTAGE', 'FIXED') NOT NULL,
    discount_value DECIMAL(10, 2) NOT NULL,
    start_date DATETIME NOT NULL,
    end_date DATETIME NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Foreign key constraint
    CONSTRAINT fk_offers_restaurant
        FOREIGN KEY (restaurant_id) 
        REFERENCES restaurant_tbl(restaurant_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    
    -- Indexes for better query performance
    INDEX idx_restaurant_id (restaurant_id),
    INDEX idx_is_active (is_active),
    INDEX idx_dates (start_date, end_date),
    INDEX idx_discount_type (discount_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

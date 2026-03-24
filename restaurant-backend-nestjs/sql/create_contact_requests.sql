CREATE TABLE IF NOT EXISTS contact_requests_tbl (
    id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(255) NOT NULL,
    phone_number VARCHAR(50),
    hotel_name VARCHAR(255),
    email_address VARCHAR(255) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    website VARCHAR(255),
    message TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

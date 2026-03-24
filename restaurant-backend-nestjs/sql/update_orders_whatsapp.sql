-- Migration to add customer details for WhatsApp billing
ALTER TABLE kitchen_orders_tbl 
ADD COLUMN customer_name VARCHAR(255) NULL AFTER order_no,
ADD COLUMN whatsapp_number VARCHAR(50) NULL AFTER customer_name;

-- Add qr_url column to table_qr_tbl

ALTER TABLE table_qr_tbl 
ADD COLUMN qr_url TEXT NULL AFTER table_key;

-- Migration: Add image_url to offers_tbl
-- Description: Add image URL field for offer images
-- Date: 2026-02-27

ALTER TABLE offers_tbl 
ADD COLUMN image_url VARCHAR(500) NULL AFTER description;

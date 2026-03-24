-- Migration: Add API key column to restaurant_tbl
-- Date: 2026-02-25
-- Purpose: Enable secure public order creation via API keys

ALTER TABLE restaurant_tbl
  ADD COLUMN api_key VARCHAR(64) UNIQUE NULL;

CREATE INDEX idx_restaurant_api_key ON restaurant_tbl (api_key);

-- Migration: Add feature flags to restaurant_tbl
-- Date: 2026-02-26
-- Description: Add optional feature flags (steward, housekeeping, kds, reports) for restaurant configuration

ALTER TABLE restaurant_tbl
ADD COLUMN enable_steward TINYINT(1) DEFAULT 1 COMMENT 'Enable Steward role and features',
ADD COLUMN enable_housekeeping TINYINT(1) DEFAULT 1 COMMENT 'Enable Housekeeping module',
ADD COLUMN enable_kds TINYINT(1) DEFAULT 1 COMMENT 'Enable Kitchen Display System',
ADD COLUMN enable_reports TINYINT(1) DEFAULT 1 COMMENT 'Enable Reports module';

-- Set existing restaurants to have all features enabled by default
UPDATE restaurant_tbl SET 
  enable_steward = 1,
  enable_housekeeping = 1,
  enable_kds = 1,
  enable_reports = 1
WHERE enable_steward IS NULL;


-- Migration: Add menuId to food_items_tbl and update categoryId and subcategoryId to be optional.
-- This ensures existing items can still be linked directly to a menu.

ALTER TABLE `food_items_tbl` 
ADD COLUMN `menu_id` INT NULL,
MODIFY COLUMN `category_id` INT NULL,
MODIFY COLUMN `subcategory_id` INT NULL;

-- Relationship: Add foreign key for menu_id
ALTER TABLE `food_items_tbl`
ADD CONSTRAINT `FK_food_items_menu` FOREIGN KEY (`menu_id`) REFERENCES `menus_tbl`(`menu_id`) ON DELETE CASCADE;

-- Backfill menu_id based on category mapping (if applicable)
-- Assuming some items are already in categories that are linked to menus.
UPDATE `food_items_tbl` fi
JOIN `categories_tbl` c ON fi.category_id = c.category_id
SET fi.menu_id = c.menu_id
WHERE fi.menu_id IS NULL AND fi.category_id IS NOT NULL;

-- Add frontend_visible column to ti_categories table
-- Run this SQL directly on the server database

-- Check if column already exists
SELECT COUNT(*) as column_exists 
FROM information_schema.columns 
WHERE table_name = 'ti_categories' 
AND column_name = 'frontend_visible' 
AND table_schema = DATABASE();

-- Add the column if it doesn't exist
ALTER TABLE ti_categories 
ADD COLUMN frontend_visible BOOLEAN DEFAULT 1 AFTER status;

-- Verify the column was added
DESCRIBE ti_categories;
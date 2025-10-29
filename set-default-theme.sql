-- Set frontend-theme as the default theme
UPDATE ti_themes SET is_default = 0;
UPDATE ti_themes SET is_default = 1 WHERE code = 'frontend-theme';

-- Verify the change
SELECT theme_id, name, code, status, is_default FROM ti_themes ORDER BY theme_id; 
-- Add Frontend Theme to ti_themes table
-- This will make the theme appear in the admin themes section

INSERT INTO `ti_themes` (
    `name`, 
    `code`, 
    `description`, 
    `version`, 
    `data`, 
    `is_active`, 
    `is_custom`, 
    `created_at`
) VALUES (
    'Frontend Theme',
    'frontend-theme',
    'Next.js powered front-end theme for PayMyDine with modern design and multi-tenant support.',
    '1.0.0',
    '{"theme_configuration": "light", "primary_color": "#E7CBA9", "secondary_color": "#EFC7B1", "accent_color": "#3B3B3B", "background_color": "#FAFAFA"}',
    1,
    0,
    NOW()
) ON DUPLICATE KEY UPDATE
    `name` = VALUES(`name`),
    `description` = VALUES(`description`),
    `version` = VALUES(`version`),
    `data` = VALUES(`data`),
    `is_active` = VALUES(`is_active`),
    `updated_at` = NOW();

-- If you want to set this as the default theme, uncomment the line below:
-- UPDATE `ti_themes` SET `is_active` = 0 WHERE `code` != 'frontend-theme';
-- UPDATE `ti_themes` SET `is_active` = 1 WHERE `code` = 'frontend-theme'; 
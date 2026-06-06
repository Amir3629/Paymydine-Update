<?php

/*
|--------------------------------------------------------------------------
| PMD_REVIEW_SOCIAL_SETTINGS_DIRECT_FORM_20260606
|--------------------------------------------------------------------------
| Config for /admin/settings/edit/review_social
|--------------------------------------------------------------------------
*/

$config['form']['fields'] = [
    'pmd_review_share_prompt_enabled' => [
        'label' => 'Enable checkout review share prompt',
        'type' => 'switch',
        'default' => 1,
    ],
    'pmd_home_social_icons_enabled' => [
        'label' => 'Enable homepage social icons',
        'type' => 'switch',
        'default' => 1,
    ],

    'pmd_social_instagram_enabled' => [
        'label' => 'Instagram enabled',
        'type' => 'switch',
        'default' => 0,
    ],
    'pmd_social_instagram_url' => [
        'label' => 'Instagram URL',
        'type' => 'text',
        'default' => '',
    ],

    'pmd_social_google_enabled' => [
        'label' => 'Google / Maps enabled',
        'type' => 'switch',
        'default' => 0,
    ],
    'pmd_social_google_url' => [
        'label' => 'Google / Maps URL',
        'type' => 'text',
        'default' => '',
    ],

    'pmd_social_trustpilot_enabled' => [
        'label' => 'Trustpilot enabled',
        'type' => 'switch',
        'default' => 0,
    ],
    'pmd_social_trustpilot_url' => [
        'label' => 'Trustpilot URL',
        'type' => 'text',
        'default' => '',
    ],

    'pmd_social_reviews_enabled' => [
        'label' => 'Reviews page enabled',
        'type' => 'switch',
        'default' => 0,
    ],
    'pmd_social_reviews_url' => [
        'label' => 'Reviews page URL',
        'type' => 'text',
        'default' => '',
    ],

    'pmd_social_website_enabled' => [
        'label' => 'Website enabled',
        'type' => 'switch',
        'default' => 0,
    ],
    'pmd_social_website_url' => [
        'label' => 'Website URL',
        'type' => 'text',
        'default' => '',
    ],
];

return $config;

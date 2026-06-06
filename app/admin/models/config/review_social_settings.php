<?php

/*
|--------------------------------------------------------------------------
| PMD_REVIEW_SOCIAL_SETTINGS_SAFE_FORM_20260606
|--------------------------------------------------------------------------
| System\Models\Settings_model requires top-level "form".
|--------------------------------------------------------------------------
*/

return [
    'form' => [
        'fields' => [
            'pmd_review_share_prompt_enabled' => [
                'label' => 'Enable checkout review share prompt',
                'type' => 'text',
                'default' => '1',
                'comment' => 'Use 1 to enable, 0 to disable.',
            ],
            'pmd_home_social_icons_enabled' => [
                'label' => 'Enable homepage social icons',
                'type' => 'text',
                'default' => '1',
                'comment' => 'Use 1 to enable, 0 to disable.',
            ],
            'pmd_social_instagram_enabled' => [
                'label' => 'Instagram enabled',
                'type' => 'text',
                'default' => '0',
            ],
            'pmd_social_instagram_url' => [
                'label' => 'Instagram URL',
                'type' => 'text',
                'default' => '',
            ],
            'pmd_social_google_enabled' => [
                'label' => 'Google / Maps enabled',
                'type' => 'text',
                'default' => '0',
            ],
            'pmd_social_google_url' => [
                'label' => 'Google / Maps URL',
                'type' => 'text',
                'default' => '',
            ],
            'pmd_social_trustpilot_enabled' => [
                'label' => 'Trustpilot enabled',
                'type' => 'text',
                'default' => '0',
            ],
            'pmd_social_trustpilot_url' => [
                'label' => 'Trustpilot URL',
                'type' => 'text',
                'default' => '',
            ],
            'pmd_social_reviews_enabled' => [
                'label' => 'Reviews page enabled',
                'type' => 'text',
                'default' => '0',
            ],
            'pmd_social_reviews_url' => [
                'label' => 'Reviews page URL',
                'type' => 'text',
                'default' => '',
            ],
            'pmd_social_website_enabled' => [
                'label' => 'Website enabled',
                'type' => 'text',
                'default' => '0',
            ],
            'pmd_social_website_url' => [
                'label' => 'Website URL',
                'type' => 'text',
                'default' => '',
            ],
        ],
    ],
];

<?php

$config['form']['fields'] = [
    'pmd_review_share_prompt_enabled' => [
        'label' => 'Show public share prompt after review',
        'type' => 'switch',
        'default' => 1,
        'span' => 'left',
        'comment' => 'When enabled, guests see configured public review/social links after submitting a checkout review.',
    ],
    'pmd_homepage_social_icons_enabled' => [
        'label' => 'Show homepage social icons',
        'type' => 'switch',
        'default' => 1,
        'span' => 'right',
        'comment' => 'Controls the homepage icon bar marked data-pmd-home-social-icons.',
    ],
    'pmd_social_trustpilot_enabled' => ['label' => 'Enable Trustpilot', 'type' => 'switch', 'span' => 'left', 'default' => 0],
    'pmd_social_trustpilot_url' => ['label' => 'Trustpilot URL', 'type' => 'text', 'span' => 'right'],
    'pmd_social_instagram_enabled' => ['label' => 'Enable Instagram', 'type' => 'switch', 'span' => 'left', 'default' => 0],
    'pmd_social_instagram_url' => ['label' => 'Instagram URL', 'type' => 'text', 'span' => 'right'],
    'pmd_social_google_enabled' => ['label' => 'Enable Google Maps / Google Reviews', 'type' => 'switch', 'span' => 'left', 'default' => 0],
    'pmd_social_google_url' => ['label' => 'Google Maps / Google Reviews URL', 'type' => 'text', 'span' => 'right'],
    'pmd_social_website_enabled' => ['label' => 'Enable Website', 'type' => 'switch', 'span' => 'left', 'default' => 0],
    'pmd_social_website_url' => ['label' => 'Website URL', 'type' => 'text', 'span' => 'right'],
    'pmd_social_reviews_enabled' => ['label' => 'Enable Reviews page', 'type' => 'switch', 'span' => 'left', 'default' => 0],
    'pmd_social_reviews_url' => ['label' => 'Reviews page URL', 'type' => 'text', 'span' => 'right'],
];

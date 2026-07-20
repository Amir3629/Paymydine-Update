<?php

return [
    'form' => [
        'general' => [
            'title' => '',
            'fields' => [
                'theme_configuration' => [
                    'label' => 'Theme Configuration',
                    'type' => 'select',
                    'span' => 'left',
                    'default' => 'kazen_japanese',
                    'options' => [
                        'gold-luxury' => 'Gold Luxury',
                        'organic_botanical_paper' => 'Organic Botanical Paper',
                        'modern_green' => 'Modern Green',
                        'kazen_japanese' => 'Kazen Japanese Minimal',
                        'velvet_terracotta' => 'Velvet Terracotta',
                    ],
                    'comment' => 'Choose the customer frontend theme.',
                ],

'kazen_menu_layout' => [
                    'label' => 'Food display style',
                    'type' => 'select',
                    'span' => 'left',
                    'default' => 'accordion',
                    'options' => [
                        'accordion' => 'Accordion categories',
                        'tabs' => 'Category tabs + item list',
                    ],
                    'comment' => 'Controls how Kazen Japanese Minimal shows food items on the customer frontend.',
                ],

                'pmd_kazen_website_enabled' => [
                    'label' => 'Show website button',
                    'type' => 'switch',
                    'span' => 'left',
                    'default' => '0',
                    'comment' => 'Shows a square website shortcut in the Kazen header.',
                ],
                'pmd_kazen_website_url' => [
                    'label' => 'Restaurant website URL',
                    'type' => 'text',
                    'span' => 'right',
                    'default' => '',
                    'comment' => 'Example: https://restaurant.com',
                ],

                'pmd_kazen_social_enabled' => [
                    'label' => 'Show social button',
                    'type' => 'switch',
                    'span' => 'left',
                    'default' => '0',
                    'comment' => 'Shows one square social shortcut in the Kazen header.',
                ],
                'pmd_kazen_social_platform' => [
                    'label' => 'Social platform',
                    'type' => 'select',
                    'span' => 'right',
                    'default' => 'instagram',
                    'options' => [
                        'instagram' => 'Instagram',
                        'facebook' => 'Facebook',
                        'trustpilot' => 'Trustpilot',
                        'reviews' => 'Reviews page',
                        'website' => 'Website / custom link',
                    ],
                    'comment' => 'Select which public social destination the header button opens.',
                ],
                'pmd_kazen_social_url' => [
                    'label' => 'Social URL',
                    'type' => 'text',
                    'span' => 'full',
                    'default' => '',
                    'comment' => 'Paste the public URL for the selected social platform.',
                ],
            ],
        ],
    ],
];

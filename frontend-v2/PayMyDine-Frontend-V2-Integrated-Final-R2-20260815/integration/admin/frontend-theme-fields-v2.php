<?php

return [
    'form' => [
        'general' => [
            'title' => 'PayMyDine Customer Menu V2',
            'fields' => [
                'theme_configuration' => [
                    'label' => 'Customer menu theme',
                    'type' => 'select',
                    'span' => 'left',
                    'default' => 'kazen_japanese',
                    'options' => [
                        'noir_editorial' => 'Noir Editorial — Luxury dining',
                        'verdant_modern' => 'Verdant Modern — Modern bistro',
                        'lumiere_fine_dining' => 'Lumiere Fine Dining',
                        'kazen_japanese' => 'Kazen Japanese',
                        'azzurra_coastal' => 'Azzurra Coastal — Mediterranean / Seafood',
                        'neon_cocktail_bar' => 'Neon Cocktail Bar',
                        'art_deco_speakeasy' => 'Art Deco Speakeasy',
                        'shahrazad_persian' => 'Shahrazad Persian',
                        'anatolia_turkish' => 'Anatolia Turkish',
                        'ember_steakhouse' => 'Ember Steakhouse',
                    ],
                    'comment' => 'V2 renders the selected theme server-side before first paint. No client-side theme swap is used.',
                ],

                'pmd_v2_enabled_languages' => [
                    'label' => 'Menu languages',
                    'type' => 'text',
                    'span' => 'right',
                    'default' => 'en,de',
                    'comment' => 'Comma-separated supported languages: en,de,fa,tr,ja. The restaurant default language is always included.',
                ],

                'pmd_v2_waiter_call_enabled' => [
                    'label' => 'Waiter call',
                    'type' => 'switch',
                    'span' => 'left',
                    'default' => '1',
                    'comment' => 'Show the table waiter-call action.',
                ],
                'pmd_v2_valet_enabled' => [
                    'label' => 'Valet',
                    'type' => 'switch',
                    'span' => 'right',
                    'default' => '0',
                    'comment' => 'Show the valet request action for QR-table guests.',
                ],
                'pmd_v2_table_order_enabled' => [
                    'label' => 'QR table ordering',
                    'type' => 'switch',
                    'span' => 'left',
                    'default' => '1',
                    'comment' => 'Allow guests at a table QR to confirm items and send the shared Table Order to kitchen.',
                ],
                'pmd_v2_split_bill_enabled' => [
                    'label' => 'Split bill',
                    'type' => 'switch',
                    'span' => 'left',
                    'default' => '1',
                ],
                'pmd_v2_tips_enabled' => [
                    'label' => 'Tips',
                    'type' => 'switch',
                    'span' => 'right',
                    'default' => '1',
                ],
                'pmd_v2_coupons_enabled' => [
                    'label' => 'Coupons',
                    'type' => 'switch',
                    'span' => 'left',
                    'default' => '1',
                ],
                'pmd_v2_social_enabled' => [
                    'label' => 'Social links',
                    'type' => 'switch',
                    'span' => 'right',
                    'default' => '1',
                    'comment' => 'Uses the restaurant social URLs already configured in Admin.',
                ],

                // Preserve the existing public website/social destination fields.
                'pmd_kazen_website_enabled' => [
                    'label' => 'Show website link',
                    'type' => 'switch',
                    'span' => 'left',
                    'default' => '0',
                ],
                'pmd_kazen_website_url' => [
                    'label' => 'Restaurant website URL',
                    'type' => 'text',
                    'span' => 'right',
                    'default' => '',
                ],
                'pmd_kazen_social_enabled' => [
                    'label' => 'Show featured social link',
                    'type' => 'switch',
                    'span' => 'left',
                    'default' => '0',
                ],
                'pmd_kazen_social_platform' => [
                    'label' => 'Featured social platform',
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
                ],
                'pmd_kazen_social_url' => [
                    'label' => 'Featured social URL',
                    'type' => 'text',
                    'span' => 'full',
                    'default' => '',
                ],
            ],
        ],
    ],
];

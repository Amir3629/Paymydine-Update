<?php

return [
    'form' => [
        'general' => [
            'title' => 'General',
            'fields' => [
                'theme_configuration' => [
                    'label' => 'Theme Configuration',
                    'type' => 'select',
                    'options' => [
                        'light' => 'Clean Light Theme',
                        'dark' => 'Modern Dark Theme',
                        'gold' => 'Gold Luxury Theme',
                        'colorful' => 'Vibrant Colors Theme',
                        'minimal' => 'Minimal Theme',
                    ],
                    'default' => 'light',
                ],
                'primary_color' => [
                    'label' => 'Primary Color',
                    'type' => 'colorpicker',
                    'default' => '#E7CBA9',
                ],
                'secondary_color' => [
                    'label' => 'Secondary Color',
                    'type' => 'colorpicker',
                    'default' => '#EFC7B1',
                ],
                'accent_color' => [
                    'label' => 'Accent Color',
                    'type' => 'colorpicker',
                    'default' => '#3B3B3B',
                ],
                'background_color' => [
                    'label' => 'Background Color',
                    'type' => 'colorpicker',
                    'default' => '#FAFAFA',
                ],
            ],
        ],
    ],
];


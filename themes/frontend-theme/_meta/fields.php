<?php

return [
    'form' => [
        'general' => [
            'title' => '',
            'fields' => [
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
            ],
        ],
    ],
];


<?php

return [
    'form' => [
        'toolbar' => [
            'buttons' => [
                'back' => [
                    'label' => 'lang:admin::lang.button_icon_back',
                    'class' => 'btn btn-primary ml-0 btn-square',
                    'href' => 'settings',
                ],
            ],
        ],
        'fields' => [
            'about_content' => [
                'type' => 'partial',
                'path' => 'settings/about/content',
            ],
        ],
    ],
];

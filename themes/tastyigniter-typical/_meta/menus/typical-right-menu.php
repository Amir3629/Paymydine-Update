<?php
return [
    'name' => 'Right menu',
    'items' => [
        [
            'title' => 'main::lang.menu_my_account',
            'code' => 'account',
            'type' => 'theme-page',
            'reference' => 'account'.DIRECTORY_SEPARATOR.'account',
            'items' => [
                [
                    'title' => 'main::lang.menu_recent_order',
                    'code' => 'recent-orders',
                    'type' => 'theme-page',
                    'reference' => 'account'.DIRECTORY_SEPARATOR.'orders',
                ],
                [
                    'title' => 'main::lang.menu_my_account',
                    'code' => '',
                    'type' => 'theme-page',
                    'reference' => 'account'.DIRECTORY_SEPARATOR.'account',
                ],
                [
                    'title' => 'main::lang.menu_address',
                    'code' => '',
                    'type' => 'theme-page',
                    'reference' => 'account'.DIRECTORY_SEPARATOR.'address',
                ],
                [
                    'title' => 'main::lang.menu_recent_reservation',
                    'code' => '',
                    'type' => 'theme-page',
                    'reference' => 'account'.DIRECTORY_SEPARATOR.'reservations',
                ],
                [
                    'title' => 'main::lang.menu_logout',
                    'code' => '',
                    'type' => 'url',
                    'url' => 'javascript:;',
                    'extraAttributes' => 'data-request="session::onLogout"',
                ],
            ],
        ],
    ],
];

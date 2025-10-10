<?php
return [
    'name' => 'Main menu',
    'items' => [
        [
            'title' => 'main::lang.menu_menu',
            'code' => 'view-menu',
            'type' => 'theme-page',
            'reference' => 'local'.DIRECTORY_SEPARATOR.'menus',
        ],
        [
            'title' => 'main::lang.menu_reservation',
            'code' => 'reservation',
            'type' => 'theme-page',
            'reference' => 'reservation'.DIRECTORY_SEPARATOR.'reservation',
        ],
        [
            'title' => 'History',
            'code' => 'history',
            'type' => 'theme-page',
            'reference' => 'our-history',
        ],
    ],
];

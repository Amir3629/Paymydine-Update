<?php

$config['list']['filter'] = [
    'search' => [
        'prompt' => 'Search device...',
        'mode' => 'all',
    ],
];

$config['list']['toolbar'] = [
    'buttons' => [
        'back' => [
            'label' => 'lang:admin::lang.button_icon_back',
            'class' => 'btn btn-outline-secondary',
            'href' => 'pos_configs',
        ],
    ],
];

$config['list']['bulkActions'] = []; // sem exclusão em massa

$config['list']['columns'] = [
    'device_id' => [
        'label' => 'ID',
        'invisible' => true,
    ],
    'name' => [
        'label' => 'lang:admin::lang.label_name',
        'type' => 'text',
        'searchable' => true,
    ],
    'code' => [
        'label' => 'lang:admin::lang.label_code',
        'type' => 'text',
    ],
    'device_type' => [
        'label' => 'Device Type',
        'type' => 'text',
    ],
    'description' => [
        'label' => 'lang:admin::lang.label_description',
        'type' => 'text',
        'searchable' => true,
    ],
    'created_at' => [
        'label' => 'lang:admin::lang.column_date_added',
        'type' => 'datetime',
        'invisible' => true,
    ],
    'updated_at' => [
        'label' => 'lang:admin::lang.column_date_updated',
        'type' => 'datetime',
        'invisible' => true,
    ],
];

return $config;

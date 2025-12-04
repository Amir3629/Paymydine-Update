<?php

$config['list']['filter'] = [
    'search' => [
        'prompt' => 'Search shifts...',
        'mode' => 'all',
    ],
    'scopes' => [
        'date' => [
            'label' => 'Date',
            'type' => 'daterange',
            'conditions' => 'shift_date >= CAST(:filtered_start AS DATE) AND shift_date <= CAST(:filtered_end AS DATE)',
        ],
        'location' => [
            'label' => 'Location',
            'type' => 'selectlist',
            'scope' => 'whereHasLocation',
            'modelClass' => 'Admin\Models\Locations_model',
            'nameFrom' => 'location_name',
            'locationAware' => true,
        ],
    ],
];

$config['list']['toolbar'] = [
    'buttons' => [
        'create' => [
            'label' => 'lang:admin::lang.button_new',
            'class' => 'btn btn-primary',
            'href' => 'tips/create',
        ],
    ],
];

$config['list']['columns'] = [
    'edit' => [
        'type' => 'button',
        'iconCssClass' => 'fa fa-pencil',
        'attributes' => [
            'class' => 'btn btn-edit',
            'href' => 'tips/edit/{shift_id}',
        ],
    ],
    'shift_date' => [
        'label' => 'Date',
        'type' => 'date',
        'searchable' => true,
    ],
    'location_name' => [
        'label' => 'Location',
        'relation' => 'location',
        'select' => 'location_name',
        'searchable' => true,
        'locationAware' => true,
    ],
    'notes' => [
        'label' => 'Notes',
        'type' => 'text',
        'searchable' => true,
    ],
];

$config['form']['fields'] = [
    'shift_date' => [
        'label' => 'Shift Date',
        'type' => 'datepicker',
        'span' => 'left',
        'required' => true,
    ],
    'location_id' => [
        'label' => 'Location',
        'type' => 'select',
        'span' => 'right',
        'options' => 'getLocationOptions',
    ],
    'notes' => [
        'label' => 'Notes',
        'type' => 'textarea',
        'span' => 'full',
        'rows' => 8,
    ],
];

return $config;


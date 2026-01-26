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
    'total_tips' => [
        'label' => 'Total Tips',
        'type' => 'currency',
        'searchable' => false,
        'sortable' => false,
    ],
    'cash_tips' => [
        'label' => 'Cash Tips',
        'type' => 'currency',
        'searchable' => false,
        'sortable' => false,
    ],
    'card_tips' => [
        'label' => 'Card Tips',
        'type' => 'currency',
        'searchable' => false,
        'sortable' => false,
    ],
    'tip_count' => [
        'label' => 'Transactions',
        'type' => 'number',
        'searchable' => false,
        'sortable' => false,
    ],
    'notes' => [
        'label' => 'Notes',
        'type' => 'text',
        'searchable' => true,
    ],
];

$config['form']['toolbar'] = [
    'buttons' => [
        'back' => [
            'label' => 'lang:admin::lang.button_icon_back',
            'class' => 'btn btn-outline-secondary',
            'href' => 'tips',
        ],
        'save' => [
            'label' => 'lang:admin::lang.button_save',
            'context' => ['create', 'edit'],
            'partial' => 'form/toolbar_save_button',
            'class' => 'btn btn-primary',
            'data-request' => 'onSave',
            'data-progress-indicator' => 'admin::lang.text_saving',
        ],
        'delete' => [
            'label' => 'lang:admin::lang.button_icon_delete',
            'class' => 'btn btn-danger',
            'data-request' => 'onDelete',
            'data-request-data' => "_method:'DELETE'",
            'data-request-confirm' => 'lang:admin::lang.alert_warning_confirm',
            'data-progress-indicator' => 'admin::lang.text_deleting',
            'context' => ['edit'],
        ],
    ],
];

$config['form']['fields'] = [
    'shift_date' => [
        'label' => 'Shift Date',
        'type' => 'datepicker',
        'span' => 'left',
        'required' => true,
        'default' => date('Y-m-d'),
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


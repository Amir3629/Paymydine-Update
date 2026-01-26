<?php

$config['list']['filter'] = [
    'search' => [
        'prompt' => 'Search combos...',
        'mode' => 'all',
    ],
    'scopes' => [
        'location' => [
            'label' => 'Location',
            'type' => 'selectlist',
            'scope' => 'whereHasLocation',
            'modelClass' => 'Admin\Models\Locations_model',
            'nameFrom' => 'location_name',
            'locationAware' => true,
        ],
        'combo_status' => [
            'label' => 'Status',
            'type' => 'switch',
            'conditions' => 'combo_status = :filtered',
        ],
    ],
];

$config['list']['toolbar'] = [
    'buttons' => [
        'back' => [
            'label' => 'lang:admin::lang.button_icon_back',
            'class' => 'btn btn-outline-secondary',
            'href' => 'menus',
        ],
        'create' => [
            'label' => 'lang:admin::lang.button_new',
            'class' => 'btn btn-primary',
            'href' => 'combos/create',
        ],
    ],
];

$config['list']['columns'] = [
    'edit' => [
        'type' => 'button',
        'iconCssClass' => 'fa fa-pencil',
        'attributes' => [
            'class' => 'btn btn-edit',
            'href' => 'combos/edit/{combo_id}',
        ],
    ],
    'combo_name' => [
        'label' => 'Name',
        'type' => 'text',
        'searchable' => true,
    ],
    'combo_price' => [
        'label' => 'Price',
        'type' => 'currency',
    ],
    'items_count' => [
        'label' => 'Items',
        'type' => 'text',
        'valueFrom' => 'items_count',
    ],
    'location_name' => [
        'label' => 'Location',
        'relation' => 'locations',
        'select' => 'location_name',
        'searchable' => true,
        'locationAware' => true,
    ],
    'combo_status' => [
        'label' => 'Status',
        'type' => 'switch',
    ],
];

$config['form']['toolbar'] = [
    'buttons' => [
        'back' => [
            'label' => 'lang:admin::lang.button_icon_back',
            'class' => 'btn btn-outline-secondary',
            'href' => 'combos',
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
    'combo_name' => [
        'label' => 'Combo Name',
        'type' => 'text',
        'span' => 'left',
        'required' => true,
    ],
    'combo_price' => [
        'label' => 'Bundle Price',
        'type' => 'currency',
        'span' => 'right',
        'required' => true,
    ],
    'combo_description' => [
        'label' => 'Description',
        'type' => 'textarea',
        'span' => 'full',
        'rows' => 3,
    ],
    'locations' => [
        'label' => 'Location',
        'type' => 'relation',
        'span' => 'left',
        'valueFrom' => 'locations',
        'nameFrom' => 'location_name',
        'scope' => 'isEnabled',
    ],
    'combo_status' => [
        'label' => 'Status',
        'type' => 'switch',
        'span' => 'right',
        'default' => 1,
    ],
    'thumb' => [
        'label' => 'Image',
        'type' => 'mediafinder',
        'span' => 'full',
        'useAttachment' => true,
    ],
];

return $config;


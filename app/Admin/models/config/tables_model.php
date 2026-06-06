<?php

$config['list']['filter'] = [
    'search' => [
        'prompt' => 'lang:admin::lang.tables.text_filter_search',
        'mode' => 'all', // or any, exact
    ],
    'scopes' => [
        'location' => [
            'label' => 'lang:admin::lang.text_filter_location',
            'type' => 'selectlist',
            'scope' => 'whereHasLocation',
            'modelClass' => 'Admin\Models\Locations_model',
            'nameFrom' => 'location_name',
            'locationAware' => true,
        ],
        'status' => [
            'label' => 'lang:admin::lang.text_filter_status',
            'type' => 'switch',
            'conditions' => 'table_status = :filtered',
        ],
    ],
];

$config['list']['toolbar'] = [
    'buttons' => [
        'create' => [
            'label' => 'lang:admin::lang.button_new',
            'class' => 'btn btn-primary',
            'href' => 'tables/create',
        ],
    ],
];

$config['list']['bulkActions'] = [
    'status' => [
        'label' => 'lang:admin::lang.list.actions.label_status',
        'type' => 'dropdown',
        'class' => 'btn btn-light',
        'statusColumn' => 'table_status',
        'menuItems' => [
            'enable' => [
                'label' => 'lang:admin::lang.list.actions.label_enable',
                'type' => 'button',
                'class' => 'dropdown-item',
            ],
            'disable' => [
                'label' => 'lang:admin::lang.list.actions.label_disable',
                'type' => 'button',
                'class' => 'dropdown-item text-danger',
            ],
        ],
    ],
    'delete' => [
        'label' => 'lang:admin::lang.button_delete',
        'class' => 'btn btn-light text-danger',
        'data-request-confirm' => 'lang:admin::lang.alert_warning_confirm',
    ],
];

$config['list']['columns'] = [
    'edit' => [
        'type' => 'button',
        'iconCssClass' => 'fa fa-pencil',
        'attributes' => [
            'class' => 'btn btn-edit',
            'href' => 'tables/edit/{table_id}',
        ],
    ],
    'table_name' => [
        'label' => 'lang:admin::lang.label_name',
        'type' => 'hidden',
        'searchable' => true,
    ],
    'min_capacity' => [
        'label' => 'Minimum Capacity',
        'type'  => 'number',
        'span'  => 'left',
    ],
    'max_capacity' => [
        'label' => 'Maximum Capacity',
        'type'  => 'number',
        'span'  => 'right',
    ],
    'extra_capacity' => [
        'label'   => 'Extra Capacity',
        'type'    => 'number',
        'span'    => 'right',
        'comment' => 'Used internally by the staff to determine table convenience/inconvenience.',
    ],
    'priority' => [
        'label' => 'Priority',
        'type'  => 'number',
        'span'  => 'right',
    ],
    'location_name' => [
        'label' => 'lang:admin::lang.column_location',
        'type' => 'text',
        'relation' => 'locations',
        'select' => 'location_name',
        'locationAware' => true,
    ],
    'is_joinable' => [
        'label'   => 'Is Joinable',
        'type'    => 'switch',
        'span'    => 'right',
        'default' => 1,
        'on'      => 'Yes',
        'off'     => 'No',
    ],
    'table_status' => [
        'label'   => 'Status',
        'type'    => 'switch',
        'span'    => 'left',
        'default' => 1,
        'on'      => 'Enabled',
        'off'     => 'Disabled',
    ],
    'table_id' => [
        'label' => 'lang:admin::lang.column_id',
        'invisible' => true,
    ],
    'created_at' => [
        'label' => 'lang:admin::lang.column_date_added',
        'invisible' => true,
        'type' => 'datetime',
    ],
    'updated_at' => [
        'label' => 'lang:admin::lang.column_date_updated',
        'invisible' => true,
        'type' => 'datetime',
    ],
];

$config['form']['toolbar'] = [
    'buttons' => [
        'back' => [
            'label' => 'lang:admin::lang.button_icon_back',
            'class' => 'btn btn-outline-secondary',
            'href' => 'tables',
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
    'table_no' => [
        'label'   => 'Table Number',
        'type'    => 'text',
        'span'    => 'left',
    ],
    'pos_table_label' => [
        'label'    => 'POS / Custom Table Name',
        'type'     => 'text',
        'span'     => 'right',
        'readOnly' => true,
        'hidden'   => true,
    ],
    'priority' => [
        'label' => 'lang:admin::lang.tables.label_priority',
        'type' => 'number',
        'span' => 'right',
    ],
    'table_name' => [
        'type'     => 'hidden',          // Completely hidden field
    ],
    'min_capacity' => [
        'label' => 'lang:admin::lang.tables.label_min_capacity',
        'type' => 'number',
        'span' => 'left',
    ],
    'max_capacity' => [
        'label' => 'lang:admin::lang.tables.label_capacity',
        'type' => 'number',
        'span' => 'right',
    ],
    'table_status' => [
        'label' => 'lang:admin::lang.label_status',
        'type' => 'switch',
        'span' => 'left',
        'default' => 1,
    ],
    'is_joinable' => [
        'label' => 'lang:admin::lang.tables.label_joinable',
        'type' => 'switch',
        'span' => 'right',
        'default' => 1,
        'on' => 'lang:admin::lang.text_yes',
        'off' => 'lang:admin::lang.text_no',
    ],
    'locations' => [
        'label'    => 'Location(s)',
        'type'     => 'relation',
        'span'     => 'left',
        'nameFrom' => 'location_name',
    ],
    'extra_capacity' => [
        'label' => 'lang:admin::lang.tables.label_extra_capacity',
        'type' => 'number',
        'comment' => 'lang:admin::lang.tables.help_extra_capacity',
    ],
    'qr_code' => [
        'label' => '',  
        'type' => 'hidden',  
        'span' => 'left',  
    ],
    
];

return $config;

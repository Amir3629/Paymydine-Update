<?php

$config['list']['filter'] = [
    'search' => [
        'prompt' => 'Search config...',
        'mode' => 'all',
    ],
];

$config['list']['toolbar'] = [
    'buttons' => [
        'create' => [
           'label' => 'lang:admin::lang.button_new',
            'class' => 'btn btn-primary',
            'href' => 'pos_configs/create',
        ],
        'devices' => [
            'label' => 'lang:admin::lang.side_menu.pos_devices',
            'class' => 'btn btn-default',
            'href' => 'pos_devices',
            'permission' => 'Admin.PosDevices',
        ],
    ],
];

$config['list']['bulkActions'] = [
    'delete' => [
        'label' => 'Delete',
        'class' => 'btn btn-light text-danger',
        'data-request-confirm' => 'Are you sure you want to delete the selected configs?',
    ],
];

$config['list']['columns'] = [
    'edit' => [
        'type' => 'button',
        'iconCssClass' => 'fa fa-pencil',
        'attributes' => [
            'class' => 'btn btn-edit',
            'href' => 'pos_configs/edit/{config_id}',
        ],
    ],
    'device_name' => [
        'label' => 'Device',
        'relation' => 'devices',
        'select' => 'name',
    ],
    'url' => [
        'label' => 'lang:admin::lang.label_url',
        'type' => 'text',
        'searchable' => true,
    ],
    'username' => [
        'label' => 'lang:admin::lang.label_username_pos',
        'type' => 'text',
        'searchable' => true,
        'invisible' => true,
    ],
    'password' => [
        'label' => 'lang:admin::lang.label_password_pos',
        'type' => 'text',
        'searchable' => true,
        'invisible' => true,
    ],
    'access_token' => [
        'label' => 'lang:admin::lang.label_access_token_pos',
        'type' => 'text',
        'searchable' => true,
        'invisible' => true,
    ],
    'id_application' => [
         'label' => 'lang:admin::lang.label_id_application_pos',
        'type' => 'text',
        'searchable' => true,
        'invisible' => true,
    ],
    'config_id' => [
        'label' => 'lang:admin::lang.column_id',
        'invisible' => true,
    ],
    'created_at' => [
        'label' => 'lang:admin::lang.column_date_added',
        'type' => 'datetime',
    ],
    'updated_at' => [
        'label' => 'lang:admin::lang.column_date_updated',
        'invisible' => true,
        'type' => 'datetime',
    ],
];

$config['form']['toolbar'] = [
    'cssClasses' => ['toolbar-grouped'],
    'buttons' => [
        'back' => [
            'label' => 'lang:admin::lang.button_icon_back',
            'class' => 'btn btn-outline-secondary',
            'href' => 'pos_configs',
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
        'test_integration' => [
            'class' => 'btn btn-info',
            'context' => ['edit'],
            'partial' => 'form/partials/toolbar_test_integration_button',
        ],
        'sync_menu' => [
            'class' => 'btn btn-warning',
            'context' => ['edit'],
            'partial' => 'form/partials/toolbar_sync_menu_button',
        ],
        'register_webhook' => [
            'class' => 'btn btn-default',
            'context' => ['edit'],
            'partial' => 'form/partials/toolbar_register_webhook_button',
        ],
    ],
];

$config['form']['fields'] = [
   'devices' => [
        'label'    => 'lang:admin::lang.pos_configs.label_devices',
        'type'     => 'select',
        'options'  => 'getPosDevicesOptions',
        'span'     => 'right',
        'required' => true,
        'valueFrom' => 'device_id',
    ],
     'url' => [
        'label' => 'lang:admin::lang.label_url',
        'type' => 'text',
        'span' => 'left',
    ],
    'username' => [
        'label' => 'lang:admin::lang.pos_configs.label_username',
        'type' => 'text',
        'span' => 'left',
    ],
    'password' => [
        'label' => 'lang:admin::lang.pos_configs.label_password',
        'type' => 'text',
        'span' => 'right',
    ],
     'access_token' => [
        'label' => 'lang:admin::lang.label_access_token_pos',
        'type' => 'text',
        'span' => 'right',
    ],
     'id_application' => [
        'label' => 'lang:admin::lang.label_id_application_pos',
        'type' => 'text',
        'span' => 'right',
    ],
];

return $config;

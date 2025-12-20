<?php

$config['list']['filter'] = [
    'search' => [
        'prompt' => 'Search devices...',
        'mode' => 'all',
    ],
    'scopes' => [
        'status' => [
            'label' => 'Status',
            'type' => 'switch',
        ],
    ],
];

$config['list']['toolbar'] = [
    'buttons' => [
        'setup_guide' => [
            'label' => 'Setup Guide',
            'type' => 'button',
            'class' => 'btn btn-ice-white',
            'icon' => 'fa-book',
            'onclick' => 'openSetupGuideModal(); return false;',
        ],
        'create' => [
            'label' => 'lang:admin::lang.button_new',
            'class' => 'btn btn-primary',
            'href' => 'biometric_devices/create',
        ],
    ],
];

$config['list']['bulkActions'] = [
    'status' => [
        'label' => 'lang:admin::lang.list.actions.label_status',
        'type' => 'dropdown',
        'class' => 'btn btn-light',
        'statusColumn' => 'status',
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
            'href' => 'biometric_devices/edit/{device_id}',
        ],
    ],
    'device_id' => [
        'label' => 'ID',
        'invisible' => true,
    ],
    'name' => [
        'label' => 'Device Name',
        'type' => 'text',
        'searchable' => true,
    ],
    'ip' => [
        'label' => 'IP Address',
        'type' => 'text',
    ],
    'port' => [
        'label' => 'Port',
        'type' => 'text',
    ],
    'serial_number' => [
        'label' => 'Serial Number',
        'type' => 'text',
    ],
    'status' => [
        'label' => 'Status',
        'type' => 'switch',
    ],
    'created_at' => [
        'label' => 'lang:admin::lang.column_date_added',
        'type' => 'datetime',
    ],
];

$config['form']['toolbar'] = [
    'buttons' => [
        'back' => [
            'label' => 'lang:admin::lang.button_icon_back',
            'class' => 'btn btn-outline-secondary',
            'href' => 'biometric_devices',
        ],
        'save' => [
            'label' => 'lang:admin::lang.button_save',
            'context' => ['create', 'edit'],
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
            'context' => ['edit'],
        ],
        'test_connection' => [
            'label' => 'Test Connection',
            'class' => 'btn btn-info',
            'data-request' => 'onTestConnection',
            'context' => ['edit'],
        ],
        'sync_staff' => [
            'label' => 'Sync Staff',
            'class' => 'btn btn-success',
            'data-request' => 'onSyncStaff',
            'data-request-confirm' => 'This will sync all staff members to the device. Continue?',
            'context' => ['edit'],
        ],
        'sync_attendance' => [
            'label' => 'Sync Attendance',
            'class' => 'btn btn-warning',
            'data-request' => 'onSyncAttendance',
            'data-request-confirm' => 'This will sync attendance data from the device. Continue?',
            'context' => ['edit'],
        ],
    ],
];

$config['form']['fields'] = [
    'name' => [
        'label' => 'Device Name',
        'type' => 'text',
        'span' => 'left',
        'required' => true,
    ],
    'ip' => [
        'label' => 'IP Address',
        'type' => 'text',
        'span' => 'right',
        'required' => true,
        'placeholder' => '192.168.1.100',
    ],
    'port' => [
        'label' => 'Port',
        'type' => 'number',
        'span' => 'left',
        'default' => 4370,
        'comment' => 'Default ZKTeco port is 4370',
    ],
    'status' => [
        'label' => 'Status',
        'type' => 'switch',
        'span' => 'right',
        'default' => true,
    ],
    'serial_number' => [
        'label' => 'Serial Number',
        'type' => 'text',
        'span' => 'left',
        'readOnly' => true,
        'comment' => 'Auto-detected from device',
    ],
    'location_id' => [
        'label' => 'Location',
        'type' => 'relation',
        'relationFrom' => 'location',
        'nameFrom' => 'location_name',
        'span' => 'right',
        'placeholder' => 'Select location (optional)',
    ],
    'description' => [
        'label' => 'Description',
        'type' => 'textarea',
        'span' => 'full',
    ],
];

return $config;


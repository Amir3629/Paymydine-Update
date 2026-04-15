<?php

$config['list']['filter'] = [
    'search' => [
        'prompt' => 'Search cash drawers...',
        'mode' => 'all',
    ],
    'scopes' => [
        'status' => [
            'label' => 'Status',
            'type' => 'switch',
            'conditions' => 'status = :filtered',
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
            'href' => 'cash_drawers/create',
        ],
    ],
];

$config['list']['columns'] = [
    'edit' => [
        'type' => 'button',
        'iconCssClass' => 'fa fa-pencil',
        'attributes' => [
            'class' => 'btn btn-edit',
            'href' => 'cash_drawers/edit/{drawer_id}',
        ],
    ],
    'name' => [
        'label' => 'Name',
        'type' => 'text',
        'searchable' => true,
    ],
    'terminal' => [
        'label' => 'POS Terminal',
        'type' => 'text',
        'formatter' => function ($record) {
            return optional($record->localPosDevice)->name
                ?: optional($record->posDevice)->name
                ?: 'Not configured';
        },
    ],
    'printer' => [
        'label' => 'Printer',
        'type' => 'text',
        'formatter' => function ($record) {
            if (!empty($record->printer_id)) {
                $printer = \Admin\Models\Pos_devices_model::find($record->printer_id);
                if ($printer) {
                    return $printer->name;
                }
            }
            return !empty($record->device_path) ? $record->device_path : 'Not configured';
        },
    ],
    'location_name' => [
        'label' => 'Location',
        'relation' => 'location',
        'select' => 'location_name',
        'searchable' => true,
        'locationAware' => true,
    ],
    'connection_health' => [
        'label' => 'Connection',
        'type' => 'text',
        'formatter' => function ($record) {
            if ($record->last_command_status === 'success') return 'Online';
            if ($record->last_command_status === 'failed') return 'Issue';
            return optional($record->localPosDevice)->isOnline() ? 'Online' : 'Unknown';
        },
    ],
    'status' => [
        'label' => 'Enabled',
        'type' => 'switch',
    ],
    'auto_open_on_cash' => [
        'label' => 'Auto-Open on Cash',
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
            'href' => 'cash_drawers',
        ],
        'save' => [
            'label' => 'lang:admin::lang.button_save',
            'context' => ['create', 'edit'],
            'partial' => 'form/toolbar_save_button',
            'class' => 'btn btn-primary',
            'data-request' => 'onSave',
            'data-progress-indicator' => 'admin::lang.text_saving',
        ],
        'test_connection' => [
            'label' => '<i class="fa fa-plug"></i> Test Connection',
            'class' => 'btn btn-info',
            'data-request' => 'onTestConnection',
            'context' => ['edit'],
        ],
        'open_drawer' => [
            'label' => '<i class="fa fa-unlock"></i> Open Drawer',
            'class' => 'btn btn-success',
            'data-request' => 'onOpenDrawer',
            'context' => ['edit'],
        ],
        'setup_local_pos' => [
            'label' => '<i class="fa fa-magic"></i> Set Up on This POS',
            'class' => 'btn btn-primary',
            'data-request' => 'onSetupOnThisPos',
            'context' => ['edit'],
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
    'cssClasses' => ['toolbar-grouped'],
];

$config['form']['fields'] = [
    'name' => [
        'label' => 'Drawer Name',
        'type' => 'text',
        'span' => 'left',
        'required' => true,
        'comment' => 'Name shown to staff (for example: Front Counter Drawer).',
    ],
    'location_id' => [
        'label' => 'Location',
        'type' => 'select',
        'span' => 'right',
        'options' => 'getLocationOptions',
        'locationAware' => true,
        'comment' => 'Restaurant/branch this drawer belongs to.',
    ],
    'status' => [
        'label' => 'Enabled',
        'type' => 'switch',
        'span' => 'left',
        'default' => true,
        'comment' => 'Turn cash drawer integration on/off for this record.',
    ],
    'local_pos_device_id' => [
        'label' => 'Local POS Terminal',
        'type' => 'select',
        'span' => 'right',
        'comment' => 'Select the in-store POS computer that controls this drawer.',
    ],
    'printer_id' => [
        'label' => 'Printer Device',
        'type' => 'select',
        'span' => 'left',
        'comment' => 'Printer physically connected to this cash drawer.',
        'trigger' => [
            'action' => 'show',
            'field' => 'connection_type',
            'condition' => 'value[rj11_printer]',
        ],
    ],
    'auto_open_on_cash' => [
        'label' => 'Auto-open on Cash Payment',
        'type' => 'switch',
        'span' => 'right',
        'default' => true,
        'comment' => 'Automatically open drawer after a cash payment.',
    ],
    'test_on_save' => [
        'label' => 'Test Connection on Save',
        'type' => 'switch',
        'span' => 'left',
        'default' => true,
        'comment' => 'Send a test command after saving.',
    ],
    'connection_type' => [
        'label' => 'Connection Type',
        'type' => 'select',
        'span' => 'left',
        'required' => true,
        'default' => 'rj11_printer',
        'accordion' => 'Advanced / Technical',
        'options' => [
            'rj11_printer' => 'RJ11/Printer-Driven (Most Common)',
            'usb' => 'USB Direct Connection',
            'serial' => 'Serial (RS-232)',
            'network' => 'Network/Ethernet (IP)',
            'integrated' => 'Integrated Printer+Drawer',
        ],
        'comment' => 'How is the drawer connected?',
    ],
    'device_path' => [
        'label' => 'Device Path / Printer Name',
        'type' => 'text',
        'span' => 'left',
        'accordion' => 'Advanced / Technical',
        'comment' => 'Optional advanced setting for technical support only.',
        'trigger' => [
            'action' => 'show',
            'field' => 'connection_type',
            'condition' => 'value[rj11_printer,usb,serial]',
        ],
    ],
    'esc_pos_command' => [
        'label' => 'ESC/POS Command',
        'type' => 'text',
        'span' => 'left',
        'default' => '27,112,0,60,120',
        'accordion' => 'Advanced / Technical',
        'comment' => 'ESC/POS command to open drawer (format: 27,112,0,60,120)',
        'trigger' => [
            'action' => 'show',
            'field' => 'connection_type',
            'condition' => 'value[rj11_printer,integrated]',
        ],
    ],
    'voltage' => [
        'label' => 'Voltage',
        'type' => 'select',
        'span' => 'right',
        'accordion' => 'Advanced / Technical',
        'options' => [
            '12V' => '12V',
            '24V' => '24V',
        ],
        'default' => '12V',
        'comment' => 'Drawer solenoid voltage (12V or 24V)',
        'trigger' => [
            'action' => 'show',
            'field' => 'connection_type',
            'condition' => 'value[rj11_printer,serial]',
        ],
    ],
    'network_ip' => [
        'label' => 'IP Address',
        'type' => 'text',
        'span' => 'left',
        'accordion' => 'Advanced / Technical',
        'comment' => 'IP address of network cash drawer',
        'trigger' => [
            'action' => 'show',
            'field' => 'connection_type',
            'condition' => 'value[network]',
        ],
    ],
    'network_port' => [
        'label' => 'Port',
        'type' => 'number',
        'span' => 'right',
        'accordion' => 'Advanced / Technical',
        'default' => 9100,
        'comment' => 'Network port (default: 9100)',
        'trigger' => [
            'action' => 'show',
            'field' => 'connection_type',
            'condition' => 'value[network]',
        ],
    ],
    'serial_port' => [
        'label' => 'Serial Port',
        'type' => 'text',
        'span' => 'left',
        'accordion' => 'Advanced / Technical',
        'comment' => 'COM port (Windows) or /dev/tty* (Linux/Mac)',
        'trigger' => [
            'action' => 'show',
            'field' => 'connection_type',
            'condition' => 'value[serial]',
        ],
    ],
    'serial_baud_rate' => [
        'label' => 'Baud Rate',
        'type' => 'number',
        'span' => 'right',
        'accordion' => 'Advanced / Technical',
        'default' => 9600,
        'comment' => 'Serial communication baud rate',
        'trigger' => [
            'action' => 'show',
            'field' => 'connection_type',
            'condition' => 'value[serial]',
        ],
    ],
    'usb_vendor_id' => [
        'label' => 'USB Vendor ID',
        'type' => 'text',
        'span' => 'left',
        'accordion' => 'Advanced / Technical',
        'comment' => 'USB vendor ID (optional, for device identification)',
        'trigger' => [
            'action' => 'show',
            'field' => 'connection_type',
            'condition' => 'value[usb]',
        ],
    ],
    'usb_product_id' => [
        'label' => 'USB Product ID',
        'type' => 'text',
        'span' => 'right',
        'accordion' => 'Advanced / Technical',
        'comment' => 'USB product ID (optional, for device identification)',
        'trigger' => [
            'action' => 'show',
            'field' => 'connection_type',
            'condition' => 'value[usb]',
        ],
    ],
    'pos_device_id' => [
        'label' => 'Legacy POS Device Mapping',
        'type' => 'select',
        'span' => 'left',
        'accordion' => 'Advanced / Technical',
        'comment' => 'Legacy field retained for backward compatibility.',
    ],
    'description' => [
        'label' => 'Description',
        'type' => 'textarea',
        'span' => 'full',
        'accordion' => 'Advanced / Technical',
        'rows' => 3,
        'comment' => 'Optional description or notes',
    ],
];

return $config;

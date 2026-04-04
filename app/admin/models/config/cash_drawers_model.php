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
        'connection_type' => [
            'label' => 'Connection Type',
            'type' => 'select',
            'conditions' => 'connection_type = :filtered',
            'options' => [
                'rj11_printer' => 'RJ11/Printer-Driven',
                'usb' => 'USB Direct Connection',
                'serial' => 'Serial (RS-232)',
                'network' => 'Network/Ethernet (IP)',
                'integrated' => 'Integrated Printer+Drawer',
            ],
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
    'location_name' => [
        'label' => 'Location',
        'relation' => 'location',
        'select' => 'location_name',
        'searchable' => true,
        'locationAware' => true,
    ],
    'connection_type' => [
        'label' => 'Connection Type',
        'type' => 'text',
        'formatter' => function ($record, $column, $value) {
            $types = \Admin\Models\Cash_drawers_model::getConnectionTypeOptions();
            return $types[$value] ?? $value;
        },
    ],
    'device_path' => [
        'label' => 'Device Path',
        'type' => 'text',
    ],
    'status' => [
        'label' => 'Status',
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
        'comment' => 'Enter a descriptive name for this cash drawer',
    ],
    'location_id' => [
        'label' => 'Location',
        'type' => 'select',
        'span' => 'right',
        'options' => 'getLocationOptions',
        'locationAware' => true,
        'comment' => 'Select the location this drawer belongs to',
    ],
    'connection_type' => [
        'label' => 'Connection Type',
        'type' => 'select',
        'span' => 'left',
        'required' => true,
        'options' => [
            'rj11_printer' => 'RJ11/Printer-Driven (Most Common)',
            'usb' => 'USB Direct Connection',
            'serial' => 'Serial (RS-232)',
            'network' => 'Network/Ethernet (IP)',
            'integrated' => 'Integrated Printer+Drawer',
        ],
        'comment' => 'How is the drawer connected?',
    ],
    'status' => [
        'label' => 'Status',
        'type' => 'switch',
        'span' => 'right',
        'default' => true,
        'comment' => 'Enable or disable this cash drawer',
    ],
    'device_path' => [
        'label' => 'Device Path / Printer Name',
        'type' => 'text',
        'span' => 'left',
        'comment' => 'Printer name (Windows), COM port, USB path, or IP address',
        'trigger' => [
            'action' => 'show',
            'field' => 'connection_type',
            'condition' => 'value[rj11_printer,usb,serial]',
        ],
    ],
    'printer_id' => [
        'label' => 'Printer Device',
        'type' => 'select',
        'span' => 'right',
        'comment' => 'Select printer if using RJ11 connection',
        'trigger' => [
            'action' => 'show',
            'field' => 'connection_type',
            'condition' => 'value[rj11_printer]',
        ],
    ],
    'esc_pos_command' => [
        'label' => 'ESC/POS Command',
        'type' => 'text',
        'span' => 'left',
        'default' => '27,112,0,60,120',
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
        'comment' => 'USB product ID (optional, for device identification)',
        'trigger' => [
            'action' => 'show',
            'field' => 'connection_type',
            'condition' => 'value[usb]',
        ],
    ],
    'pos_device_id' => [
        'label' => 'POS Device',
        'type' => 'select',
        'span' => 'left',
        'comment' => 'Link to specific POS device (optional)',
    ],
    'auto_open_on_cash' => [
        'label' => 'Auto-Open on Cash Payment',
        'type' => 'switch',
        'span' => 'right',
        'default' => true,
        'comment' => 'Automatically open drawer when cash payment is processed',
    ],
    'test_on_save' => [
        'label' => 'Test Connection on Save',
        'type' => 'switch',
        'span' => 'left',
        'default' => true,
        'comment' => 'Test drawer connection when saving',
    ],
    'description' => [
        'label' => 'Description',
        'type' => 'textarea',
        'span' => 'full',
        'rows' => 3,
        'comment' => 'Optional description or notes',
    ],
];

return $config;

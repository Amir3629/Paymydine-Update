<?php

$config['list']['filter'] = [
    'search' => [
        'prompt' => 'Search terminal devices',
        'mode' => 'all',
    ],
];

$config['list']['columns'] = [
    'reader_label' => [
        'label' => 'Reader Label',
        'searchable' => true,
    ],
    'provider_code' => [
        'label' => 'Provider',
        'searchable' => true,
    ],
    'reader_id' => [
        'label' => 'Reader ID',
        'searchable' => true,
    ],
    'pairing_state' => [
        'label' => 'Pairing State',
    ],
    'terminal_status' => [
        'label' => 'Terminal Status',
    ],
    'is_active' => [
        'label' => 'Active',
        'type' => 'switch',
        'onText' => 'lang:admin::lang.text_yes',
        'offText' => 'lang:admin::lang.text_no',
    ],
    'updated_at' => [
        'label' => 'lang:admin::lang.column_date_updated',
        'type' => 'timetense',
    ],
];

$config['form']['toolbar'] = [
    'buttons' => [
        'back' => [
            'label' => 'lang:admin::lang.button_icon_back',
            'class' => 'btn btn-outline-secondary',
            'href' => 'terminal_devices',
        ],
        'save' => [
            'label' => 'lang:admin::lang.button_save',
            'context' => ['create', 'edit'],
            'partial' => 'form/toolbar_save_button',
            'class' => 'btn btn-primary',
            'data-request' => 'onSave',
            'data-progress-indicator' => 'admin::lang.text_saving',
        ],
        'discover_readers' => [
            'label' => 'Discover Readers',
            'class' => 'btn btn-outline-secondary',
            'context' => ['edit'],
            'data-request' => 'onDiscoverReaders',
            'data-request-form' => '#edit-form',
        ],
        'test_terminal' => [
            'label' => 'Test Terminal Connection',
            'class' => 'btn btn-info',
            'context' => ['edit'],
            'data-request' => 'onTestTerminalConnection',
            'data-request-form' => '#edit-form',
        ],
    ],
];

$config['form']['fields'] = [
    'provider_code' => [
        'label' => 'Provider Type',
        'type' => 'select',
        'options' => 'listProviderOptions',
        'span' => 'left',
        'required' => true,
    ],
    'location_id' => [
        'label' => 'Location',
        'type' => 'select',
        'options' => 'listLocationOptions',
        'span' => 'right',
        'placeholder' => 'All locations',
    ],
    'affiliate_key' => [
        'label' => 'Affiliate Key',
        'type' => 'text',
        'span' => 'left',
    ],
    'reader_id' => [
        'label' => 'Reader ID',
        'type' => 'text',
        'span' => 'right',
    ],
    'reader_label' => [
        'label' => 'Reader Label',
        'type' => 'text',
        'span' => 'left',
    ],
    'pairing_state' => [
        'label' => 'Pairing State',
        'type' => 'select',
        'options' => 'listPairingStateOptions',
        'span' => 'right',
        'default' => 'unknown',
    ],
    'terminal_status' => [
        'label' => 'Terminal Status',
        'type' => 'text',
        'span' => 'left',
    ],
    'is_active' => [
        'label' => 'Active Terminal',
        'type' => 'switch',
        'span' => 'right',
        'default' => true,
        'onText' => 'lang:admin::lang.text_yes',
        'offText' => 'lang:admin::lang.text_no',
    ],
    'metadata' => [
        'label' => 'Metadata (JSON)',
        'type' => 'textarea',
        'span' => 'full',
        'comment' => 'Optional diagnostic metadata for this terminal device.',
    ],
];

return $config;

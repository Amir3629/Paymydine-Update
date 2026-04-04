<?php

$config['list']['filter'] = [
    'search' => [
        'prompt' => 'lang:admin::lang.payments.text_filter_search',
        'mode' => 'all',
    ],
    'scopes' => [
        'status' => [
            'label' => 'lang:admin::lang.text_filter_status',
            'type' => 'switch',
            'conditions' => 'status = :filtered',
            'onText' => 'lang:admin::lang.text_enabled',
            'offText' => 'lang:admin::lang.text_disabled',
        ],
    ],
];

$config['list']['toolbar'] = [
    'buttons' => [
        'manage_providers' => [
            'label' => 'Manage Providers',
            'class' => 'btn btn-primary',
            'href' => 'payments/providers',
        ],
        'pos_configs' => [
            'label' => 'POS Configs',
            'class' => 'btn btn-default',
            'href' => 'pos_configs',
        ],
    ],
];

$config['list']['showCheckboxes'] = false;
$config['list']['bulkActions'] = [];

$config['list']['columns'] = [
    'edit' => [
        'type' => 'button',
        'iconCssClass' => 'fa fa-pencil',
        'attributes' => [
            'class' => 'btn btn-edit',
            'href' => 'payments/edit/{code}',
        ],
    ],
    'name' => [
        'label' => 'lang:admin::lang.label_name',
        'type' => 'text',
        'searchable' => true,
    ],
    'description' => [
        'label' => 'lang:admin::lang.label_description',
        'searchable' => true,
    ],
    'provider_code' => [
        'label' => 'Provider',
        'type' => 'text',
    ],
    'status' => [
        'label' => 'lang:admin::lang.label_status',
        'type' => 'switch',
        'onText' => 'lang:admin::lang.text_enabled',
        'offText' => 'lang:admin::lang.text_disabled',
    ],
    'is_default' => [
        'label' => 'lang:admin::lang.payments.label_default',
        'type' => 'switch',
        'onText' => 'lang:admin::lang.text_yes',
        'offText' => 'lang:admin::lang.text_no',
    ],
    'updated_at' => [
        'label' => 'lang:admin::lang.column_date_updated',
        'type' => 'timetense',
    ],
    'payment_id' => [
        'label' => 'lang:admin::lang.column_id',
        'invisible' => true,
    ],
];

$config['form']['toolbar'] = [
    'buttons' => [
        'back' => [
            'label' => 'lang:admin::lang.button_icon_back',
            'class' => 'btn btn-outline-secondary',
            'href' => 'payments',
        ],
        'save' => [
            'label' => 'lang:admin::lang.button_save',
            'context' => ['create', 'edit'],
            'partial' => 'form/toolbar_save_button',
            'class' => 'btn btn-primary',
            'data-request' => 'onSave',
            'data-progress-indicator' => 'admin::lang.text_saving',
        ],
    ],
];

$config['form']['fields'] = [
    'payment' => [
        'label' => 'lang:admin::lang.payments.label_payments',
        'type' => 'select',
        'options' => 'listGateways',
        'context' => ['create'],
        'placeholder' => 'lang:admin::lang.text_please_select',
    ],
    'name' => [
        'label' => 'lang:admin::lang.label_name',
        'type' => 'text',
        'span' => 'left',
    ],
    'priority' => [
        'label' => 'lang:admin::lang.payments.label_priority',
        'type' => 'number',
        'span' => 'right',
        'cssClass' => 'flex-width',
        'default' => 10,
    ],
    'code' => [
        'label' => 'lang:admin::lang.payments.label_code',
        'type' => 'text',
        'span' => 'right',
        'cssClass' => 'flex-width',
        'readOnly' => false,
        'disabled' => false,
    ],
    'description' => [
        'label' => 'lang:admin::lang.label_description',
        'type' => 'textarea',
        'span' => 'left',
        'disabled' => false,
    ],
    'is_default' => [
        'label' => 'lang:admin::lang.payments.label_default',
        'type' => 'switch',
        'span' => 'right',
        'cssClass' => 'flex-width',
        'onText' => 'lang:admin::lang.text_yes',
        'offText' => 'lang:admin::lang.text_no',
        'disabled' => false,
    ],
    'status' => [
        'label' => 'lang:admin::lang.label_status',
        'type' => 'switch',
        'span' => 'right',
        'cssClass' => 'flex-width',
        'onText' => 'lang:admin::lang.text_enabled',
        'offText' => 'lang:admin::lang.text_disabled',
        'disabled' => false,
    ],
];

return $config;

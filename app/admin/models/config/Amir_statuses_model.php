<?php
$config['list']['filter'] = [
    'scopes' => [
        'type' => [
            'label' => 'lang:admin::lang.statuses.text_filter_status',
            'type' => 'select', // checkbox, switch, date, daterange
            'conditions' => 'status_for = :filtered',
            'options' => [
                'order' => 'lang:admin::lang.statuses.text_order',
                'reserve' => 'lang:admin::lang.statuses.text_reservation',
            ],
        ],
    ],
];

$config['list']['toolbar'] = [
    'buttons' => [
        // 'create' removed  lock the set to the 3 visible statuses
    ],
];

// Disable bulk actions & checkboxes at the widget level
$config['list']['showCheckboxes'] = false;
$config['list']['bulkActions'] = []; // no bulk actions at all

$config['list']['columns'] = [
    'status_name' => [
        'label' => 'lang:admin::lang.label_name',
        'type' => 'text', // number, switch, date_time, time, date, timesince, select, relation, partial
        'searchable' => true,
    ],
    'status_comment' => [
        'label' => 'lang:admin::lang.statuses.column_comment',
        'type' => 'text',
        'searchable' => true,
    ],
    'status_for_name' => [
        'label' => 'lang:admin::lang.label_type',
        'type' => 'text',
        'sortable' => false,
    ],
    'notify_customer' => [
        'label' => 'lang:admin::lang.statuses.column_notify',
        'type' => 'switch',
        'offText' => 'lang:admin::lang.text_no',
        'onText' => 'lang:admin::lang.text_yes',
    ],
    'status_id' => [
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
            'href' => 'statuses',
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
    'status_name' => [
        'label' => 'lang:admin::lang.label_name',
        'type' => 'text',
        'span' => 'left',
    ],
    'status_for' => [
        'label' => 'lang:admin::lang.statuses.label_for',
        'type' => 'radiotoggle',
        'span' => 'right',
        'cssClass' => 'flex-width',
        'placeholder' => 'lang:admin::lang.text_please_select',
        'options' => 'getStatusForDropdownOptions',
    ],
    'status_color' => [
        'label' => 'lang:admin::lang.statuses.label_color',
        'type' => 'colorpicker',
        'span' => 'right',
        'cssClass' => 'flex-width',
    ],
    'status_comment' => [
        'label' => 'lang:admin::lang.statuses.label_comment',
        'type' => 'textarea',
    ],
    'notify_customer' => [
        'label' => 'lang:admin::lang.statuses.label_notify',
        'type' => 'switch',
        'default' => true,
        'onText' => 'lang:admin::lang.text_yes',
        'offText' => 'lang:admin::lang.text_no',
        'comment' => 'lang:admin::lang.statuses.help_notify',
    ],
];

return $config;


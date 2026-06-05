<?php

$config['list']['filter'] = [
    'search' => [
        'prompt' => 'Search reviews...',
        'mode' => 'all',
    ],
];

$config['list']['columns'] = [
    'created_at' => [
        'label' => 'Created',
        'type' => 'datetime',
        'searchable' => true,
        'sortable' => true,
    ],
    'location_name' => [
        'label' => 'Restaurant',
        'relation' => 'location',
        'select' => 'location_name',
        'searchable' => true,
    ],
    'sale_id' => [
        'label' => 'Order ID',
        'type' => 'number',
        'searchable' => true,
        'sortable' => true,
    ],
    'quality' => [
        'label' => 'Rating',
        'type' => 'number',
        'searchable' => true,
        'sortable' => true,
    ],
    'review_text' => [
        'label' => 'Review',
        'type' => 'text',
        'searchable' => true,
    ],
    'public_share_consent' => [
        'label' => 'Public share consent',
        'type' => 'switch',
        'sortable' => true,
    ],
    'review_status' => [
        'label' => 'Approved',
        'type' => 'switch',
        'sortable' => true,
    ],
];

$config['form']['toolbar'] = [
    'buttons' => [
        'back' => [
            'label' => 'lang:admin::lang.button_icon_back',
            'class' => 'btn btn-outline-secondary',
            'href' => 'reviews',
        ],
        'save' => [
            'label' => 'lang:admin::lang.button_save',
            'context' => ['edit'],
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
    'sale_id' => [
        'label' => 'Order ID',
        'type' => 'number',
        'span' => 'left',
        'disabled' => true,
    ],
    'quality' => [
        'label' => 'Rating',
        'type' => 'number',
        'span' => 'right',
        'attributes' => ['min' => 0, 'max' => 5],
    ],
    'review_text' => [
        'label' => 'Review',
        'type' => 'textarea',
        'span' => 'full',
        'attributes' => ['rows' => 5],
    ],
    'public_share_consent' => [
        'label' => 'Public share consent',
        'type' => 'switch',
        'span' => 'left',
    ],
    'review_status' => [
        'label' => 'Approved / visible',
        'type' => 'switch',
        'span' => 'right',
    ],
];

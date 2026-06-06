<?php

/*
|--------------------------------------------------------------------------
| PMD_REVIEWS_MODEL_LIST_FORM_CONFIG_20260606
|--------------------------------------------------------------------------
| Used by Admin\Controllers\Reviews.
|--------------------------------------------------------------------------
*/

$config['list']['filter'] = [
    'search' => [
        'prompt' => 'Search reviews...',
        'mode' => 'all',
    ],
];

$config['list']['toolbar'] = [
    'buttons' => [
        'refresh' => [
            'label' => 'Refresh',
            'class' => 'btn btn-default',
            'href' => 'reviews',
        ],
    ],
];

$config['list']['columns'] = [
    'review_id' => [
        'label' => 'ID',
        'type' => 'number',
        'sortable' => true,
    ],
    'created_at' => [
        'label' => 'Created',
        'type' => 'datetime',
        'searchable' => true,
        'sortable' => true,
    ],
    'tenant_host' => [
        'label' => 'Tenant',
        'type' => 'text',
        'searchable' => true,
    ],
    'location_name' => [
        'label' => 'Restaurant',
        'type' => 'text',
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
        'sortable' => true,
    ],
    'review_text' => [
        'label' => 'Review',
        'type' => 'text',
        'searchable' => true,
    ],
    'public_share_consent' => [
        'label' => 'Public share',
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
            'label' => 'Back',
            'class' => 'btn btn-outline-secondary',
            'href' => 'reviews',
        ],
        'save' => [
            'label' => 'Save',
            'class' => 'btn btn-primary',
            'data-request' => 'onSave',
            'context' => ['edit', 'create'],
        ],
        'delete' => [
            'label' => 'Delete',
            'class' => 'btn btn-danger',
            'data-request' => 'onDelete',
            'data-request-confirm' => 'Delete this review?',
            'context' => ['edit'],
        ],
    ],
];

$config['form']['fields'] = [
    'review_id' => [
        'label' => 'ID',
        'type' => 'text',
        'disabled' => true,
    ],
    'sale_id' => [
        'label' => 'Order ID',
        'type' => 'text',
        'disabled' => true,
    ],
    'tenant_host' => [
        'label' => 'Tenant host',
        'type' => 'text',
        'disabled' => true,
    ],
    'location_name' => [
        'label' => 'Restaurant',
        'type' => 'text',
        'disabled' => true,
    ],
    'quality' => [
        'label' => 'Rating',
        'type' => 'number',
        'disabled' => true,
    ],
    'review_text' => [
        'label' => 'Review text',
        'type' => 'textarea',
        'disabled' => true,
    ],
    'public_share_consent' => [
        'label' => 'Public share consent',
        'type' => 'switch',
    ],
    'review_status' => [
        'label' => 'Approved',
        'type' => 'switch',
    ],
    'created_at' => [
        'label' => 'Created at',
        'type' => 'text',
        'disabled' => true,
    ],
];

return $config;

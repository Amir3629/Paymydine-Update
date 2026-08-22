<?php

// IMPORTANT: this file must define $config['list'] and return $config.

$config = [];

/**
 * PMD_HISTORY_ENGLISH_AUTHORITY_R21
 *
 * History is a clean PayMyDine owner page and must not mix framework locale
 * strings with its English-only custom shell. Keep the list widget functional,
 * but use literal English copy for every visible list/filter/action label.
 */
$config['list']['model'] = 'Admin\\Models\\History_model';
$config['list']['title'] = 'History';
$config['list']['emptyMessage'] = 'No history records.';
$config['list']['defaultSort'] = ['created_at', 'DESC'];
$config['list']['pageLimit'] = 25;

$config['list']['bulkActions'] = [
    'delete' => [
        'label' => 'Delete',
        'class' => 'btn btn-light text-danger',
        'data-request-confirm' => 'This action cannot be undone. Delete the selected history records?',
        'permissions' => 'Admin.History',
    ],
];

$config['list']['filter'] = [
    'search' => [
        'prompt' => 'Search history...',
        'mode' => 'all',
    ],
    'scopes' => [
        'type' => [
            'label' => 'Type',
            'type' => 'select',
            'conditions' => 'type = :filtered',
            'options' => [
                'order_status' => 'Order Status',
                'waiter_call' => 'Waiter Call',
                'table_note' => 'Table Note',
                'staff_note' => 'Staff Note',
                'general_staff_note' => 'Staff Note',
                'valet_request' => 'Valet Request',
            ],
        ],
        'status' => [
            'label' => 'Status',
            'type' => 'selectlist',
            'mode' => 'radio',
            'conditions' => 'status IN(:filtered)',
            'options' => [
                'new' => 'New',
                'seen' => 'Seen',
                'in_progress' => 'In Progress',
                'resolved' => 'Resolved',
            ],
        ],
        'date' => [
            'label' => 'Date',
            'type' => 'daterange',
            'conditions' => 'created_at >= CAST(:filtered_start AS DATE) AND created_at <= CAST(:filtered_end AS DATE)',
        ],
    ],
];

$config['list']['columns'] = [
    'created_at' => [
        'label' => 'Created',
        'type' => 'datetime',
        'sortable' => true,
        'searchable' => true,
        'cssClass' => 'col-created clamp-1',
    ],
    'type' => [
        'label' => 'Type',
        'type' => 'text',
        'sortable' => true,
        'searchable' => true,
        'cssClass' => 'col-type clamp-1',
    ],
    'table_name' => [
        'label' => 'Table',
        'type' => 'text',
        'sortable' => true,
        'searchable' => true,
        'cssClass' => 'col-table clamp-1',
    ],
    'details' => [
        'label' => 'Details',
        'type' => 'partial',
        'path' => 'history/_cell_details',
        'sortable' => false,
        'searchable' => false,
        'cssClass' => 'col-details clamp-2 notif-text',
    ],
    'status' => [
        'label' => 'Status',
        'type' => 'text',
        'sortable' => true,
        'searchable' => true,
        'cssClass' => 'col-status clamp-1 text-capitalize',
    ],
];

return $config;

<?php

// IMPORTANT: this file must define $config['list'] and return $config.

$config = [];

/**
 * Which model powers this list widget.
 * Must be a fully-qualified class name string.
 */
$config['list']['model'] = 'Admin\Models\History_model';

/**
 * Basic list widget options
 */
$config['list']['title']        = 'lang:admin::lang.history.text_title';
$config['list']['emptyMessage'] = 'lang:admin::lang.history.text_empty';
$config['list']['defaultSort']  = ['created_at', 'DESC'];
$config['list']['pageLimit']    = 25;

$config['list']['bulkActions'] = [
    'delete' => [
        'label' => 'lang:admin::lang.button_delete',
        'class' => 'btn btn-light text-danger',
        'data-request-confirm' => 'lang:admin::lang.alert_warning_confirm',
        'permissions' => 'Admin.History', // mirrors controller requiredPermissions
    ],
];

/**
 * Filters
 */
$config['list']['filter'] = [
    'search' => [
        'prompt' => 'lang:admin::lang.history.text_filter_search',
        'mode'   => 'all',
    ],
    'scopes' => [
        'type' => [
            'label'      => 'lang:admin::lang.history.text_filter_type',
            'type'       => 'select',
            'conditions' => 'type = :filtered',
            'options'    => [
                'waiter_call'   => 'Waiter Call',
                'table_note'    => 'Table Note',
                'valet_request' => 'Valet Request',
            ],
        ],
        'status' => [
            'label'      => 'lang:admin::lang.history.text_filter_status',
            'type'       => 'selectlist',
            'mode'       => 'radio',
            'conditions' => 'status IN(:filtered)',
            'options'    => [
                'new'         => 'New',
                'seen'        => 'Seen',
                'in_progress' => 'In Progress',
                'resolved'    => 'Resolved',
            ],
        ],
        'date' => [
            'label'      => 'lang:admin::lang.history.text_filter_date',
            'type'       => 'daterange',
            'conditions' => 'created_at >= CAST(:filtered_start AS DATE) AND created_at <= CAST(:filtered_end AS DATE)',
        ],
    ],
];

/**
 * Columns
 */
$config['list']['columns'] = [
    'created_at' => [
        'label'      => 'lang:admin::lang.history.column_created',
        'type'       => 'datetime',
        'sortable'   => true,
        'searchable' => true,
        'cssClass'   => 'col-created clamp-1',
    ],
    'type' => [
        'label'      => 'lang:admin::lang.history.column_type',
        'type'       => 'text',
        'sortable'   => true,
        'searchable' => true,
        'cssClass'   => 'col-type clamp-1',
    ],
    'table_name' => [
        'label'      => 'lang:admin::lang.history.column_table',
        'type'       => 'text',
        'sortable'   => true,
        'searchable' => true,
        'cssClass'   => 'col-table clamp-1',
    ],
    'details' => [
        'label'      => 'lang:admin::lang.history.column_details',
        'type'       => 'partial',
        'path'       => 'history/_cell_details',
        'sortable'   => false,
        'searchable' => false,
        'cssClass'   => 'col-details clamp-2 notif-text',
    ],
    'status' => [
        'label'      => 'lang:admin::lang.history.column_status',
        'type'       => 'text',
        'sortable'   => true,
        'searchable' => true,
        'cssClass'   => 'col-status clamp-1 text-capitalize',
    ],
];

return $config;
<?php

/**
 * KDS Stations Model Configuration
 */

return [
    'list' => [
        'filter' => [
            'search' => [
                'prompt' => 'Search by name or description',
                'mode' => 'all',
            ],
            'scopes' => [
                'is_active' => [
                    'label' => 'Status',
                    'type' => 'switch',
                    'conditions' => 'is_active = :filtered',
                ],
            ],
        ],
        'toolbar' => [
            'buttons' => [
                'create' => [
                    'label' => 'New KDS Station',
                    'class' => 'btn btn-primary',
                    'href' => 'kds_stations/create',
                ],
            ],
        ],
        'columns' => [
            'edit' => [
                'type' => 'button',
                'iconCssClass' => 'fa fa-pencil',
                'attributes' => [
                    'class' => 'btn btn-edit',
                    'href' => 'kds_stations/edit/{station_id}',
                ],
            ],
            'name' => [
                'label' => 'Station Name',
                'type' => 'text',
                'searchable' => true,
            ],
            'slug' => [
                'label' => 'Slug',
                'type' => 'text',
            ],
            'category_count' => [
                'label' => 'Categories',
                'type' => 'text',
                'sortable' => false,
                'formatter' => function ($record, $column, $value) {
                    $count = is_array($record->category_ids) ? count($record->category_ids) : 0;
                    return $count > 0 ? $count . ' categories' : 'All categories';
                },
            ],
            'can_change_status' => [
                'label' => 'Can Change Status',
                'type' => 'switch',
            ],
            'is_active' => [
                'label' => 'Active',
                'type' => 'switch',
            ],
            'priority' => [
                'label' => 'Priority',
                'type' => 'text',
            ],
            'kds_link' => [
                'label' => 'Open KDS',
                'type' => 'button',
                'iconCssClass' => 'fa fa-external-link',
                'attributes' => [
                    'class' => 'btn btn-success btn-sm',
                    'href' => 'kitchendisplay/{slug}',
                    'target' => '_blank',
                ],
            ],
        ],
    ],
    'form' => [
        'toolbar' => [
            'buttons' => [
                'save' => [
                    'label' => 'Save',
                    'class' => 'btn btn-primary',
                    'data-request' => 'onSave',
                    'data-progress-indicator' => 'Saving...',
                ],
                'saveClose' => [
                    'label' => 'Save & Close',
                    'class' => 'btn btn-default',
                    'data-request' => 'onSave',
                    'data-request-data' => 'close:1',
                    'data-progress-indicator' => 'Saving...',
                ],
            ],
        ],
        'tabs' => [
            'defaultTab' => 'General',
            'fields' => [
                'name' => [
                    'label' => 'Station Name',
                    'type' => 'text',
                    'span' => 'left',
                    'comment' => 'Enter a descriptive name (e.g., Main Kitchen, Bar, Grill Station)',
                ],
                'slug' => [
                    'label' => 'URL Slug',
                    'type' => 'text',
                    'span' => 'right',
                    'comment' => 'Auto-generated from name. Used in KDS URL.',
                    'attributes' => [
                        'readonly' => 'readonly',
                    ],
                ],
                'description' => [
                    'label' => 'Description',
                    'type' => 'textarea',
                    'span' => 'full',
                    'comment' => 'Optional description for this station',
                ],
                'is_active' => [
                    'label' => 'Active',
                    'type' => 'switch',
                    'span' => 'left',
                    'default' => true,
                    'comment' => 'Enable or disable this KDS station',
                ],
                'priority' => [
                    'label' => 'Display Priority',
                    'type' => 'number',
                    'span' => 'right',
                    'default' => 0,
                    'comment' => 'Lower numbers appear first in menu',
                ],
                'category_ids' => [
                    'tab' => 'Categories',
                    'label' => 'Assigned Categories',
                    'type' => 'checkboxlist',
                    'comment' => 'Select which menu categories this station will display. Leave empty to show all categories.',
                ],
                'can_change_status' => [
                    'tab' => 'Status Settings',
                    'label' => 'Can Change Order Status',
                    'type' => 'switch',
                    'default' => true,
                    'comment' => 'Allow this station to update order status',
                ],
                'status_ids' => [
                    'tab' => 'Status Settings',
                    'label' => 'Available Statuses',
                    'type' => 'checkboxlist',
                    'comment' => 'Select which statuses this station can set. Leave empty to allow all statuses.',
                ],
                'notification_sound' => [
                    'tab' => 'Display Settings',
                    'label' => 'Notification Sound',
                    'type' => 'select',
                    'span' => 'left',
                    'default' => 'doorbell',
                    'comment' => 'Sound played when new orders arrive',
                ],
                'refresh_interval' => [
                    'tab' => 'Display Settings',
                    'label' => 'Refresh Interval (seconds)',
                    'type' => 'number',
                    'span' => 'right',
                    'default' => 5,
                    'comment' => 'How often to check for new orders',
                ],
                'theme_color' => [
                    'tab' => 'Display Settings',
                    'label' => 'Theme Color',
                    'type' => 'select',
                    'span' => 'left',
                    'default' => '#4CAF50',
                    'comment' => 'Accent color for this station',
                ],
                'location_id' => [
                    'tab' => 'Display Settings',
                    'label' => 'Location',
                    'type' => 'select',
                    'span' => 'right',
                    'comment' => 'Optionally limit to a specific location',
                ],
            ],
        ],
    ],
];


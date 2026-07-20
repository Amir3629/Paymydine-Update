<?php

/**
 * PMD KDS Station Configuration v46
 * Clean station settings for routing, workflow, and display.
 */

return [
    'list' => [
        'filter' => [
            'search' => [
                'prompt' => 'Search by station name, slug or description',
                'mode' => 'all',
            ],
            'scopes' => [
                'is_active' => [
                    'label' => 'Active',
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
                'label' => 'Station',
                'type' => 'text',
                'searchable' => true,
            ],
            'slug' => [
                'label' => 'URL Slug',
                'type' => 'text',
            ],
            'station_type' => [
                'label' => 'Type',
                'type' => 'text',
            ],
            'category_count' => [
                'label' => 'Routing',
                'type' => 'text',
                'sortable' => false,
                'formatter' => function ($record) {
                    $count = is_array($record->category_ids) ? count($record->category_ids) : 0;
                    return $count > 0 ? $count.' selected categories' : 'All categories';
                },
            ],
            'can_change_status' => [
                'label' => 'Can Update',
                'type' => 'switch',
            ],
            'is_active' => [
                'label' => 'Active',
                'type' => 'switch',
            ],
            'priority' => [
                'label' => 'Priority',
                'type' => 'number',
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
                    'tab' => 'General',
                    'label' => 'Station Name',
                    'type' => 'text',
                    'span' => 'left',
                    'comment' => 'Example: Main Kitchen, Bar, Grill 1, Grill 2, Dessert, or Pass / Expo.',],
'station_type' => [
                    'comment' => 'Used for routing presets. You can create multiple stations with the same type, such as Grill 1 and Grill 2.',
                    'tab' => 'General',
                    'label' => 'Station Type',
                    'type' => 'select',
                    'span' => 'left',
                    'default' => 'kitchen',
                    'options' => 'getStationTypeOptions',
                ],
                'is_active' => [
                    'tab' => 'General',
                    'label' => 'Active',
                    'type' => 'switch',
                    'span' => 'right',
                    'default' => true,
                    'comment' => 'Disabled stations stay saved, but are hidden from KDS routing and station selectors.',],
                'description' => [
                    'tab' => 'General',
                    'label' => 'Internal Note',
                    'type' => 'textarea',
                    'span' => 'full',
                    'comment' => 'Internal note only. Customers will not see this.',],
                'priority' => [
                    'tab' => 'General',
                    'label' => 'Sort Order',
                    'type' => 'number',
                    'span' => 'left',
                    'default' => 0,
                    'comment' => 'Controls the station order in KDS lists. Lower numbers appear first.',],
                'location_id' => [
                    'tab' => 'General',
                    'label' => 'Location',
                    'type' => 'select',
                    'span' => 'right',
                    'options' => 'getLocationIdOptions',
                    'comment' => 'Use All Locations unless this station belongs to one branch only.',],

                'category_ids' => [
                    'tab' => 'Routing',
                    'label' => 'Assigned Menu Categories',
                    'type' => 'checkboxlist',
                    'options' => 'getCategoryIdsOptions',
                    'comment' => 'Leave empty to receive all categories. For Bar, Grill, or Dessert stations, select only related categories.',],

                'can_change_status' => [
                    'tab' => 'Workflow',
                    'label' => 'Allow KDS Buttons',
                    'type' => 'switch',
                    'span' => 'left',
                    'default' => true,
                    'comment' => 'Allows this station to update visible KDS orders and items.',],
                'status_ids' => [
                    'default' => [3, 4],
                    'tab' => 'Workflow',
                    'label' => 'Allowed KDS Buttons',
                    'type' => 'checkboxlist',
                    'options' => 'getStatusIdsOptions',
                    'comment' => 'Recommended setup: Preparing and Ready / Delivery. Completed and Cancel should usually be manager or expo actions.',],
                'show_reservations' => [
                    'tab' => 'Workflow',
                    'label' => 'Show Reservations Counter',
                    'type' => 'switch',
                    'span' => 'left',
                    'default' => true,
                    'comment' => 'Useful only for kitchens that prepare orders around upcoming reservations.',],
                'reservation_window_minutes' => [
                    'tab' => 'Workflow',
                    'label' => 'Reservation Window Minutes',
                    'type' => 'number',
                    'span' => 'right',
                    'default' => 90,
                    'comment' => 'Counts upcoming reservations within this window when reservation data is available.',],
                'ready_pickup_timeout_minutes' => [
                    'tab' => 'Workflow',
                    'label' => 'Ready Pickup Warning Minutes',
                    'type' => 'number',
                    'span' => 'left',
                    'default' => 8,
                    'comment' => 'After this many minutes in Ready / Delivery, highlight the order for waiter or runner pickup. It will not auto-hide.',],
                'auto_hide_completed_minutes' => [
                    'tab' => 'Workflow',
                    'label' => 'Hide Completed After Minutes',
                    'type' => 'number',
                    'span' => 'right',
                    'default' => 5,
                    'comment' => 'Completed orders are hidden after this time. Ready orders stay visible until pickup.',],

                'notification_sound' => [
                    'comment' => 'Sound played when new KDS orders arrive.',
                    'tab' => 'Display',
                    'label' => 'Notification Sound',
                    'type' => 'select',
                    'span' => 'left',
                    'default' => 'doorbell',
                    'options' => 'getNotificationSoundOptions',
                ],
                'sound_enabled' => [
                    'comment' => 'Kitchen staff can still mute or unmute sound on the KDS screen.',
                    'tab' => 'Display',
                    'label' => 'Sound Enabled By Default',
                    'type' => 'switch',
                    'span' => 'right',
                    'default' => true,
                ],
                'refresh_interval' => [
                    'tab' => 'Display',
                    'label' => 'Refresh Interval Seconds',
                    'type' => 'number',
                    'span' => 'left',
                    'default' => 5,
                    'comment' => 'Recommended: 5 seconds. Lower values may create extra server load.',],
                'order_limit' => [
                    'comment' => 'Recommended default: 50. Use higher values only for very large kitchens.',
                    'tab' => 'Display',
                    'label' => 'Max Orders On Screen',
                    'type' => 'number',
                    'span' => 'right',
                    'default' => 50,],
                'theme_color' => [
                    'comment' => 'Visual accent only. Example: kitchen green, bar blue, or grill orange.',
                    'tab' => 'Display',
                    'label' => 'Accent Color',
                    'type' => 'select',
                    'span' => 'left',
                    'default' => '#4CAF50',
                    'options' => 'getThemeColorOptions',
                ],
                'display_density' => [
                    'comment' => 'Compact for tablets, Normal for most screens, and Large for TV displays.',
                    'tab' => 'Display',
                    'label' => 'Display Density',
                    'type' => 'select',
                    'span' => 'right',
                    'default' => 'normal',
                    'options' => 'getDisplayDensityOptions',
                ],
            ],
        ],
    ],
];





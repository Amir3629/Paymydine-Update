<?php

/**
 * PMD_KDS_MINIMAL_STATION_V1
 * User-configurable station contract: name and category routing only.
 * Legacy columns remain DB compatibility only and are not presentation authority.
 */
return [
    'list' => [
        'filter' => [
            'search' => [
                'prompt' => 'Search KDS stations...',
                'mode' => 'all',
            ],
            'scopes' => [],
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
                'attributes' => ['class' => 'btn btn-edit', 'href' => 'kds_stations/edit/{station_id}'],
            ],
            'name' => ['label' => 'Station', 'type' => 'text', 'searchable' => true],
            'category_count' => [
                'label' => 'Routing',
                'type' => 'text',
                'sortable' => false,
                'formatter' => function ($record) {
                    $count = is_array($record->category_ids) ? count($record->category_ids) : 0;
                    return $count > 0 ? $count.' selected categories' : 'All categories';
                },
            ],
            'kds_link' => [
                'label' => 'Open KDS',
                'type' => 'button',
                'iconCssClass' => 'fa fa-external-link',
                'attributes' => ['class' => 'btn btn-success btn-sm', 'href' => 'kitchendisplay/{slug}', 'target' => '_blank'],
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
            ],
        ],
        'fields' => [
            'name' => [
                'label' => 'Station Name',
                'type' => 'text',
                'required' => true,
                'comment' => 'Example: Main Kitchen, Bar, Grill, Dessert or Pass / Expo.',
            ],
            'category_ids' => [
                'label' => 'Assigned Menu Categories',
                'type' => 'checkboxlist',
                'options' => 'getCategoryIdsOptions',
                'comment' => 'Leave empty to receive all categories.',
            ],
        ],
    ],
];

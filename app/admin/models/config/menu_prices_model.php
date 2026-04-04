<?php

$config['form']['fields'] = [
    'price_id' => [
        'type' => 'hidden',
    ],
    'price_type' => [
        'label' => 'Price Type',
        'type' => 'select',
        'options' => ['Admin\Models\Menu_prices_model', 'getPriceTypeOptions'],
        'span' => 'left',
        'cssClass' => 'flex-width',
    ],
    'price' => [
        'label' => 'Price',
        'type' => 'currency',
        'span' => 'right',
        'cssClass' => 'flex-width',
    ],
    'is_active' => [
        'label' => 'Active',
        'type' => 'switch',
        'default' => 1,
        'span' => 'left',
        'cssClass' => 'flex-width',
    ],
    'time_from' => [
        'label' => 'Time From',
        'type' => 'datepicker',
        'mode' => 'time',
        'span' => 'left',
        'cssClass' => 'flex-width',
        'comment' => 'Leave empty for all-day pricing',
    ],
    'time_to' => [
        'label' => 'Time To',
        'type' => 'datepicker',
        'mode' => 'time',
        'span' => 'right',
        'cssClass' => 'flex-width',
        'comment' => 'Leave empty for all-day pricing',
    ],
    'days_of_week' => [
        'label' => 'Days of Week',
        'type' => 'selectlist',
        'options' => ['Admin\Models\Menu_prices_model', 'getDaysOfWeekOptions'],
        'mode' => 'checkbox',
        'span' => 'left',
        'cssClass' => 'flex-width',
        'placeholder' => 'Select days (leave empty for all days)',
        'comment' => 'Click dropdown to select specific days. Leave empty for all days.',
    ],
    'priority' => [
        'label' => 'Priority',
        'type' => 'number',
        'default' => 0,
        'span' => 'right',
        'cssClass' => 'flex-width',
        'comment' => 'Higher priority prices take precedence',
    ],
];

return $config;


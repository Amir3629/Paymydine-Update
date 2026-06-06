<?php

$config['form']['fields'] = [
    'image_path' => [
        'label' => 'Image',
        'type' => 'mediafinder',
        'comment' => 'Select an additional product image.',
    ],
    'sort_order' => [
        'label' => 'Order',
        'type' => 'number',
        'default' => 1,
    ],
];

return $config;


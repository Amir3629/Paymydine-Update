<?php

$config['form']['fields'] = [
    'image_path' => [
        'label' => 'Image',
        'type' => 'mediafinder',
        'comment' => 'Select an image from Media Manager.',
    ],
    'sort_order' => [
        'label' => 'Order',
        'type' => 'number',
        'default' => 1,
    ],
];

return $config;


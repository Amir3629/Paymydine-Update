<?php
$config['list']['toolbar'] = [
    'buttons' => [
/*        'browse' => [
            'label' => 'lang:system::lang.themes.button_browse',
            'class' => 'btn btn-primary',
            'href' => 'https://tastyigniter.com/marketplace/themes',
            'target' => '_blank',
        ],*/
        // 'check' => [
        //     'label' => 'lang:system::lang.updates.button_check',
        //     'class' => 'btn btn-success',
        //     'href' => 'updates',
        // ],
    ],
];

$config['list']['columns'] = [
    'edit' => [
        'type' => 'button',
        'iconCssClass' => 'fa fa-paint-brush',
        'attributes' => [
            'class' => 'btn theme-action-btn mr-2',
            'href' => 'themes/edit/{code}',
        ],
    ],
    'source' => [
        'type' => 'button',
        'iconCssClass' => 'fa fa-file',
        'attributes' => [
            'class' => 'btn theme-action-btn mr-2',
            'href' => 'themes/source/{code}',
        ],
    ],
    'default' => [
        'type' => 'button',
        'iconCssClass' => 'fa fa-star-o',
        'attributes' => [
            'class' => 'btn theme-action-btn mr-2 theme-action-btn--toggle',
            'title' => 'lang:system::lang.themes.text_set_default',
            'data-request' => 'onSetDefault',
            'data-request-form' => '#list-form',
            'data-request-data' => 'code:\'{code}\'',
        ],
    ],
    'delete' => [
        'type' => 'button',
        'iconCssClass' => 'fa fa-trash-o',
        'attributes' => [
            'class' => 'btn theme-action-btn theme-action-btn--delete',
            'href' => 'themes/delete/{code}',
        ],
    ],
    'name' => [
        'label' => 'lang:admin::lang.label_name',
        'type' => 'text',
        'searchable' => true,
    ],
    'theme_id' => [
        'label' => 'lang:admin::lang.column_id',
        'invisible' => true,
    ],
    'created_at' => [
        'label' => 'lang:admin::lang.column_date_added',
        'invisible' => true,
        'type' => 'datetime',
    ],
    'updated_at' => [
        'label' => 'lang:admin::lang.column_date_updated',
        'invisible' => true,
        'type' => 'datetime',
    ],
];

$config['form']['toolbar'] = [
    'buttons' => [
        'back' => [
            'label' => 'lang:admin::lang.button_icon_back',
            'class' => 'btn btn-primary ml-0 btn-square',
            'href' => 'themes',
        ],
        'save' => [
            'label' => 'lang:admin::lang.button_save',
            'class' => 'btn btn-primary',
            'data-request' => 'onSave',
            'data-progress-indicator' => 'admin::lang.text_saving',
        ],
    ],
];

$config['form']['fields'] = [
    'name' => [
        'label' => 'lang:admin::lang.label_name',
        'type' => 'text',
        'span' => 'left',
        'disabled' => true,
    ],
    'theme_configuration' => [
        'label' => 'Theme Configuration',
        'type' => 'select',
        'span' => 'right',
        'options' => [
            'gold_luxury' => 'Gold Luxury',
            'organic_botanical_paper' => 'Organic Botanical Paper',
            'modern_green' => 'Modern Green',
        ],
        'default' => 'gold_luxury',
    ],
    'primary_color' => [
        'label' => 'Primary color',
        'type' => 'colorpicker',
        'span' => 'left',
        'default' => '#737A55',
        'comment' => 'Controls primary buttons and active states for Organic Botanical Paper. Gold Luxury safely ignores mismatched legacy defaults.',
    ],
    'accent_color' => [
        'label' => 'Accent color',
        'type' => 'colorpicker',
        'span' => 'right',
        'default' => '#B8864B',
        'comment' => 'Controls prices and subtle decorative highlights for Organic Botanical Paper.',
    ],
    'template' => [
        'label' => 'lang:system::lang.themes.label_template',
        'type' => 'templateeditor',
        'context' => ['source'],
    ],
];

$config['form']['tabs'] = [
    'cssClass' => 'theme-customizer',
    'fields' => [],
];

return $config;

<?php

return [
    'form' => [
        'toolbar' => [
            'buttons' => [
                'back' => [
                    'label' => 'lang:admin::lang.button_icon_back',
                    'class' => 'btn btn-outline-secondary',
                    'href' => 'settings',
                ],
                'save' => [
                    'label' => 'lang:admin::lang.button_save',
                    'class' => 'btn btn-primary',
                    'data-request' => 'onSave',
                    'data-progress-indicator' => 'admin::lang.text_saving',
                ],
            ],
        ],
        'fields' => [
            'after_save_options' => [
                'label' => 'lang:admin::lang.settings.text_after_save_heading',
                'type' => 'section',
                'comment' => 'lang:admin::lang.settings.help_after_save_action',
            ],
            'admin_after_save_action' => [
                'type' => 'partial',
                'path' => '~/app/admin/views/settings/panel_after_save_actions',
            ],
        ],
    ],
];



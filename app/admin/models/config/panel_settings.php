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
        'tabs' => [
            'defaultTab' => 'Admin Panel',
            'fields' => [
                'after_save_options' => [
                    'tab' => 'Admin Panel',
                    'label' => 'lang:admin::lang.settings.text_after_save_heading',
                    'type' => 'section',
                    'comment' => 'lang:admin::lang.settings.help_after_save_action',
                ],
                'admin_after_save_action' => [
                    'tab' => 'Admin Panel',
                    'type' => 'partial',
                    'path' => '~/app/admin/views/settings/panel_after_save_actions',
                ],
                'note_suggestions_section' => [
                    'tab' => 'Admin Panel',
                    'label' => 'General Staff Note Suggestions',
                    'type' => 'section',
                    'comment' => 'Configure suggestion sentences that will appear as quick-select buttons when staff members write general notes. Add as many as you need.',
                ],
                'note_suggestion_sentences' => [
                    'tab' => 'Admin Panel',
                    'label' => 'Suggestion Sentences',
                    'type' => 'repeater',
                    'comment' => 'Add suggestion sentences that staff can quickly select when writing notes. Each sentence will appear as a clickable button below the note textarea.',
                    'form' => [
                        'fields' => [
                            'sentence' => [
                                'label' => 'Sentence',
                                'type' => 'text',
                                'span' => 'full',
                                'required' => true,
                                'placeholder' => 'Enter a suggestion sentence (e.g., "Please check table")',
                            ],
                        ],
                    ],
                    'sortable' => true,
                    'prompt' => 'Add new suggestion',
                ],
                'kds_sound_section' => [
                    'tab' => 'Admin Panel',
                    'label' => 'Kitchen Display System (KDS) Sound Settings',
                    'type' => 'section',
                    'comment' => 'Configure the notification sound that plays when new orders arrive in the Kitchen Display System.',
                ],
                'kds_notification_sound' => [
                    'tab' => 'Admin Panel',
                    'type' => 'partial',
                    'path' => '~/app/admin/views/settings/kds_sound_selector',
                ],
                'system_log' => [
                    'tab' => 'System Logs',
                    'label' => 'lang:system::lang.settings.text_tab_title_system_log',
                    'type' => 'section',
                ],
                'enable_request_log' => [
                    'tab' => 'System Logs',
                    'label' => 'lang:system::lang.settings.label_enable_request_log',
                    'type' => 'switch',
                    'default' => true,
                    'comment' => 'lang:system::lang.settings.help_enable_request_log',
                ],
                'activity_log' => [
                    'tab' => 'System Logs',
                    'label' => 'lang:system::lang.settings.text_tab_title_activity_log',
                    'type' => 'section',
                ],
                'activity_log_timeout' => [
                    'tab' => 'System Logs',
                    'label' => 'lang:system::lang.settings.label_activity_log_timeout',
                    'type' => 'number',
                    'default' => '60',
                    'comment' => 'lang:system::lang.settings.help_activity_log_timeout',
                ],
                'maintenance' => [
                    'tab' => 'Maintenance',
                    'label' => 'lang:system::lang.settings.text_tab_title_maintenance',
                    'type' => 'section',
                ],
                'maintenance_mode' => [
                    'tab' => 'Maintenance',
                    'label' => 'lang:system::lang.settings.label_maintenance_mode',
                    'type' => 'switch',
                    'comment' => 'lang:system::lang.settings.help_maintenance',
                ],
                'maintenance_message' => [
                    'tab' => 'Maintenance',
                    'label' => 'lang:system::lang.settings.label_maintenance_message',
                    'type' => 'textarea',
                    'default' => 'Site is under maintenance. Please check back later.',
                    'trigger' => [
                        'action' => 'show',
                        'field' => 'maintenance_mode',
                        'condition' => 'checked',
                    ],
                ],
            ],
        ],
    ],
];



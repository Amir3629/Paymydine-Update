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
            'note_suggestions_section' => [
                'label' => 'General Staff Note Suggestions',
                'type' => 'section',
                'comment' => 'Configure suggestion sentences that will appear as quick-select buttons when staff members write general notes. Add as many as you need.',
            ],
            'note_suggestion_sentences' => [
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
                'label' => 'Kitchen Display System (KDS) Sound Settings',
                'type' => 'section',
                'comment' => 'Configure the notification sound that plays when new orders arrive in the Kitchen Display System.',
            ],
            'kds_notification_sound' => [
                'type' => 'partial',
                'path' => '~/app/admin/views/settings/kds_sound_selector',
            ],
        ],
    ],
];



<?php

// Categories list & form configuration used by Admin\Actions\ListController and FormController
// Model: Admin\Models\Categories_model

$config = [];

/**
 * List (index)
 */
$config['list'] = [
    'toolbar' => [
        'buttons' => [
            'create' => [
                'label' => 'lang:admin::lang.button_new',
                'class' => 'btn btn-primary',
                'href'  => 'categories/create',
            ],
            'delete' => [
                'label' => 'lang:admin::lang.button_delete',
                'class' => 'btn btn-danger',
                'data-request' => 'onDelete',
                'data-request-confirm' => 'lang:admin::lang.alert_warning_confirm',
                'data-request-form' => '#list-form',
                'context' => ['index'],
            ],
        ],
        'search' => [
            'prompt' => 'lang:admin::lang.categories.text_search',
        ],
    ],

    'filter' => [
        'search' => [
            'prompt' => 'lang:admin::lang.categories.text_filter_search',
            'mode'   => 'all',
        ],
        'scopes' => [
            'status' => [
                'label'      => 'lang:admin::lang.text_filter_status',
                'type'       => 'switch',
                'conditions' => 'status = :filtered',
            ],
            'location' => [
                'label'        => 'lang:admin::lang.text_filter_location',
                'type'         => 'selectlist',
                'modelClass'   => 'Admin\Models\Locations_model',
                'nameFrom'     => 'location_name',
                'scope'        => 'whereHasLocation',
                'locationAware'=> true,
            ],
        ],
    ],

    'columns' => [
        'edit' => [
            'type'      => 'button',
            'iconCssClass' => 'fa fa-pencil',
            'attributes' => [
                'class' => 'btn btn-edit',
                'href'  => 'categories/edit/{category_id}',
            ],
        ],
        'name' => [
            'label' => 'lang:admin::lang.label_name',
            'type'  => 'text',
            'searchable' => true,
        ],
        'parent_id' => [
            'label' => 'lang:admin::lang.label_parent',
            'type'  => 'number',
            'invisible' => true,
        ],
        'priority' => [
            'label' => 'lang:admin::lang.label_priority',
            'type'  => 'number',
        ],
        'status' => [
            'label' => 'lang:admin::lang.label_status',
            'type'  => 'switch',
        ],
    ],

    'model' => 'Admin\Models\Categories_model',
];

/**
 * Form (create/edit)
 */
$config['form'] = [
    'name'   => 'lang:admin::lang.categories.text_form_name',
    'model'  => 'Admin\Models\Categories_model',
    'create' => [
        'title' => 'lang:admin::lang.form.create_title',
        'redirect' => 'categories/edit/{category_id}',
        'redirectClose' => 'categories',
    ],
    'edit'   => [
        'title' => 'lang:admin::lang.form.edit_title',
        'redirect' => 'categories/edit/{category_id}',
        'redirectClose' => 'categories',
    ],

    'toolbar' => [
        'buttons' => [
            'back' => [
                'label' => 'lang:admin::lang.button_icon_back',
                'class' => 'btn btn-outline-secondary',
                'href' => 'categories',
            ],
            'save' => [
                'label' => 'lang:admin::lang.button_save',
                'context' => ['create', 'edit'],
                'partial' => 'form/toolbar_save_button',
                'class' => 'btn btn-primary',
                'data-request' => 'onSave',
                'data-progress-indicator' => 'admin::lang.text_saving',
            ],
            'delete' => [
                'label' => 'lang:admin::lang.button_icon_delete',
                'class' => 'btn btn-danger',
                'data-request' => 'onDelete',
                'data-request-data' => "_method:'DELETE'",
                'data-request-confirm' => 'lang:admin::lang.alert_warning_confirm',
                'data-progress-indicator' => 'admin::lang.text_deleting',
                'context' => ['edit'],
            ],
        ],
    ],

    'fields' => [
        'name' => [
            'label' => 'lang:admin::lang.label_name',
            'type'  => 'text',
            'span'  => 'left',
        ],
        'permalink_slug' => [
            'label' => 'lang:admin::lang.label_permalink_slug',
            'type'  => 'text',
            'span'  => 'right',
        ],
        'parent' => [
            'label'       => 'lang:admin::lang.categories.label_parent',
            'type'        => 'relation',
            'nameFrom'    => 'name',
            'emptyOption' => 'lang:admin::lang.text_none',
            'span'        => 'left',
        ],
        'priority' => [
            'label' => 'lang:admin::lang.label_priority',
            'type'  => 'number',
            'span'  => 'right',
            'default' => 0,
        ],
        'status' => [
            'label' => 'lang:admin::lang.label_status',
            'type'  => 'switch',
            'span'  => 'left',
            'default' => 1,
        ],
        'description' => [
            'label' => 'lang:admin::lang.label_description',
            'type'  => 'textarea',
            'size'  => 'large',
            'span'  => 'full',
        ],
        'image' => [
            'label' => 'lang:admin::lang.label_image',
            'type'  => 'mediafinder',
            'mode'  => 'image',
            'span'  => 'left',
        ],
        'frontend_visible' => [
            'label' => 'lang:admin::lang.categories.label_frontend_visible',
            'type'  => 'switch',
            'span'  => 'right',
            'default' => 1,
        ],
    ],
];

return $config;
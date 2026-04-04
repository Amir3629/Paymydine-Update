<?php

namespace Admin\Controllers;

use Admin\Facades\AdminMenu;

/**
 * Admin Controller Class Tables
 */
class Tables extends \Admin\Classes\AdminController
{
    public $implement = [
        'Admin\Actions\ListController',
        'Admin\Actions\FormController',
        'Admin\Actions\LocationAwareController',
    ];

    public $listConfig = [
        'list' => [
            'model' => 'Admin\Models\Tables_model',
            'title' => 'lang:admin::lang.tables.text_title',
            'emptyMessage' => 'lang:admin::lang.tables.text_empty',
            'defaultSort' => ['table_id', 'DESC'],
            'configFile' => 'tables_model',
        ],
    ];

    public $formConfig = [
        'name' => 'lang:admin::lang.tables.text_form_name',
        'model' => 'Admin\Models\Tables_model',
        'request' => 'Admin\Requests\Table',
        'create' => [
            'title' => 'lang:admin::lang.form.create_title',
            'redirect' => 'tables/edit/{table_id}',
            'redirectClose' => 'tables',
            'redirectNew' => 'tables/create',
        ],
        'edit' => [
            'title' => 'lang:admin::lang.form.edit_title',
            'redirect' => 'tables/edit/{table_id}',
            'redirectClose' => 'tables',
            'redirectNew' => 'tables/create',
        ],
        'preview' => [
            'title' => 'lang:admin::lang.form.preview_title',
            'redirect' => 'tables',
        ],
        'delete' => [
            'redirect' => 'tables',
        ],
        'configFile' => 'tables_model',
    ];

    protected $requiredPermissions = 'Admin.Tables';

    public function __construct()
    {
        parent::__construct();

        AdminMenu::setContext('tables', 'restaurant');
    }

    // PMD_POS_LABEL_FORM_PATCH
    public function formExtendFields($form)
    {
        try {
            $model = $form->model ?? null;
            if (!$model) {
                return;
            }

            $posLabel = $model->pos_table_label ?? null;
            if (!$posLabel) {
                return;
            }

            $field = method_exists($form, 'getField') ? $form->getField('table_no') : null;
            if (!$field) {
                return;
            }

            $field->value = $posLabel;
            $field->disabled = true;
            $field->readOnly = true;

            if (!isset($field->attributes) || !is_array($field->attributes)) {
                $field->attributes = [];
            }
            $field->attributes['readonly'] = 'readonly';
            $field->attributes['disabled'] = 'disabled';

            $field->comment = 'POS synced table: this field is shown from Ready2Order label only. Normal PayMyDine tables keep the original numeric logic.';
        } catch (\Throwable $e) {
            try {
                if (function_exists('logger')) {
                    logger()->warning('PMD POS label form patch failed: '.$e->getMessage());
                }
            } catch (\Throwable $ignore) {
            }
        }
    }

}

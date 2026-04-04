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


    public function formExtendFields($form)
    {
        try {
            $model = $form->model ?? null;
            if (!$model) {
                return;
            }

            $posLabel = trim((string)($model->pos_table_label ?? ''));
            if ($posLabel === '') {
                return;
            }

            $field = $form->getField('table_no');
            if ($field) {
                $field->value = $posLabel;
                $field->disabled = true;
                $field->comment = 'POS-synced table: external POS label shown here. Internal table_no remains unchanged.';
            }
        } catch (\Throwable $e) {
            // Fail-safe: never break the controller because of the display override.
        }
    }



    public function formBeforeSave($model)
    {
        try {
            $name = trim((string)($model->table_name ?? ''));
            $pos  = trim((string)($model->pos_table_label ?? ''));

            // only custom names should become exact display labels
            // native names like 'Table 12' stay native
            if ($pos === '' && $name !== '' && !preg_match('/^Table\s+\d+$/i', $name)) {
                $model->pos_table_label = $name;
            }
        } catch (\Throwable $e) {
            // fail-safe
        }
    }

}

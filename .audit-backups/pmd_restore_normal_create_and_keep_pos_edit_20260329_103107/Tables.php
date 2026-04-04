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

            $posLabel   = trim((string)($model->pos_table_label ?? ''));
            $tableName  = trim((string)($model->table_name ?? ''));
            $tableNoRaw = trim((string)($model->table_no ?? ''));

            $displayLabel = '';

            if ($posLabel !== '') {
                $displayLabel = $posLabel;
            } elseif ($tableName !== '') {
                if (!preg_match('/^Table\s+\d+$/i', $tableName)) {
                    $displayLabel = $tableName;
                } elseif ($tableName !== $tableNoRaw && !ctype_digit($tableName)) {
                    $displayLabel = $tableName;
                }
            }

            if ($displayLabel === '') {
                return;
            }

            $field = $form->getField('table_no');
            if ($field) {
                $field->value = $displayLabel;
                $field->disabled = true;
                $field->comment = 'POS/custom table: exact visible name shown here. Internal numeric table_no remains unchanged.';
            }
        } catch (\Throwable $e) {
            // fail-safe
        }
    }

    public function formBeforeSave($model)
    {
        try {
            if (!isset($model->extra_capacity) || $model->extra_capacity === null || $model->extra_capacity === '') {
                $model->extra_capacity = 0;
            }

            $name = trim((string)($model->table_name ?? ''));
            $pos  = trim((string)($model->pos_table_label ?? ''));
            $tableNo = trim((string)($model->table_no ?? ''));

            if ($pos === '') {
                if ($name !== '' && !preg_match('/^Table\s+\d+$/i', $name)) {
                    $model->pos_table_label = $name;
                } elseif ($tableNo !== '' && !ctype_digit($tableNo)) {
                    $model->pos_table_label = $tableNo;
                }
            }
        } catch (\Throwable $e) {
            // fail-safe
        }
    }
}

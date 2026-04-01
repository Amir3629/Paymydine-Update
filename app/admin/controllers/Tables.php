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

        $this->addJs('assets/js/pmd-tables-layout-ui-only-final.js');
    }

    
    public function formExtendFields($form)
    {
        $model = $form->model ?? null;
        if (!$model) {
            return;
        }

        $tableNo       = $form->getField('table_no');
        $posLabel      = $form->getField('pos_table_label');
        $priority      = $form->getField('priority');
        $locations     = $form->getField('locations');
        $minCapacity   = $form->getField('min_capacity');
        $maxCapacity   = $form->getField('max_capacity');
        $status        = $form->getField('table_status');
        $isJoinable    = $form->getField('is_joinable');
        $extraCapacity = $form->getField('extra_capacity');

        $posValue = trim((string)($model->pos_table_label ?? ''));

        if ($tableNo) {
            $tableNo->label = 'Table Number';
            $tableNo->span = 'left';
            $tableNo->comment = null;
            $tableNo->readOnly = false;
            $tableNo->disabled = false;
            $tableNo->type = 'text';
        }

        if ($priority) {
            $priority->label = 'Priority';
        }

        if ($locations) {
            $locations->label = 'Location(s)';
        }

        if ($minCapacity) {
            $minCapacity->label = 'Minimum Capacity';
            $minCapacity->span = 'left';
        }

        if ($maxCapacity) {
            $maxCapacity->label = 'Maximum Capacity';
            $maxCapacity->span = 'right';
        }

        if ($status) {
            $status->label = 'Status';
            $status->span = 'left';
        }

        if ($isJoinable) {
            $isJoinable->label = 'Is Joinable';
            $isJoinable->span = 'right';
        }

        if ($extraCapacity) {
            $extraCapacity->label = 'Extra Capacity';
            $extraCapacity->span = 'right';
        }

        if ($posLabel) {
            $posLabel->label = 'POS / Custom Table Name';
            $posLabel->comment = null;
            $posLabel->readOnly = true;
            $posLabel->disabled = true;
            $posLabel->type = 'text';
        }

        // NORMAL TABLES
        if ($posValue === '') {
            if ($posLabel) {
                $posLabel->hidden = true;
            }
            if ($priority) {
                $priority->span = 'right';
            }
            if ($locations) {
                $locations->span = 'left';
            }
            return;
        }

        // POS / CUSTOM TABLES
        if ($tableNo) {
            $tableNo->value = $posValue;
            $tableNo->disabled = true;
            $tableNo->readOnly = true;
            $tableNo->comment = null;
        }

        if ($posLabel) {
            $posLabel->hidden = false;
            $posLabel->span = 'right';
            $posLabel->value = $posValue;
        }

        if ($priority) {
            $priority->span = 'left';
        }

        if ($locations) {
            $locations->span = 'right';
        }
    }


    public function formBeforeSave($model)
    {
        if ($model->extra_capacity === null || $model->extra_capacity === '') {
            $model->extra_capacity = 0;
        }
    }
}

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
        // PMD_SAFE_POS_LABEL
        if ($model = $form->model) {
            if (!empty($model->pos_table_label)) {
                $field = $form->getField('table_no');
                if ($field) {
                    $field->value = $model->pos_table_label;
                }
            }
        }

        try {
            $model = $form->model ?? null;
            if (!$model) {
                return;
            }

            $posLabel = null;

            if (isset($model->pos_table_label) && !empty($model->pos_table_label)) {
                $posLabel = $model->pos_table_label;
            }

            if (!$posLabel && isset($model->table_id) && $model->table_id) {
                try {
                    $mapped = \DB::table('ti_pos_table_mappings')
                        ->where('local_table_id', $model->table_id)
                        ->value('external_table_name');

                    if (!empty($mapped)) {
                        $posLabel = $mapped;

                        try {
                            \DB::table('ti_tables')
                                ->where('table_id', $model->table_id)
                                ->update([
                                    'pos_table_label' => $mapped,
                                    'updated_at' => date('Y-m-d H:i:s'),
                                ]);
                        } catch (\Throwable $ignorePersist) {
                        }
                    }
                } catch (\Throwable $ignoreLookup) {
                }
            }

            if (!$posLabel) {
                return;
            }

            $field = method_exists($form, 'getField') ? $form->getField('table_no') : null;
            if ($field && !empty($model->pos_table_label)) {
                $field->value = $model->pos_table_label; // PMD_POS_TABLE_LABEL_UI_V3_VALUE
                $field->comment = 'POS-synced table: showing external POS label here. Native internal number stays unchanged.';
                if (!isset($field->attributes) || !is_array($field->attributes)) {
                    $field->attributes = [];
                }
                $field->attributes['readonly'] = 'readonly';
                $field->attributes['data-pos-display-only'] = '1';
                $field->attributes['style'] = trim(($field->attributes['style'] ?? '') . ' background:#f8fafc;');
                $field->disabled = true; // PMD_POS_TABLE_LABEL_UI_V3_DISABLED
            }
            if ($field && !empty($model->pos_table_label)) {
                $field->value = $model->pos_table_label; // PMD_POS_TABLE_LABEL_UI_V2_FIELD
                $field->comment = 'POS-synced table: showing external POS label here.';
            }
            if (!$field) {
                return;
            }

            
$field->value = $posLabel;

            // 🔥 force text type for POS
            if (isset($field->type)) {
                $field->type = 'text';
            }

            $field->disabled = true;
            $field->readOnly = true;

            if (!isset($field->attributes) || !is_array($field->attributes)) {
                $field->attributes = [];
            }
            $field->attributes['readonly'] = 'readonly';
            $field->attributes['disabled'] = 'disabled';

            $field->comment = 'POS synced table: here the Ready2Order table name is shown. Normal PayMyDine tables keep the original numeric logic.';
        } catch (\Throwable $e) {
            try {
                if (function_exists('logger')) {
                    logger()->warning('PMD POS label form patch failed: '.$e->getMessage());
                }
            } catch (\Throwable $ignore) {
            }
        }
    }






    // PMD_POS_LABEL_SAVE_PATCH
    public function formBeforeSave($model)
    {
        try {

            // فقط اگر از POS اومده
            if (!empty($model->pos_table_label)) {

                // 🔥 این خط اصلیه
                $model->table_no = $model->pos_table_label; // PMD_POS_TABLE_LABEL_UI_V3_MODEL
                $model->table_name = $model->pos_table_label; // PMD_POS_TABLE_LABEL_UI_V3_MODEL

            }

        } catch (\Throwable $e) {
            \Log::error('POS SAVE PATCH ERROR: '.$e->getMessage());
        }
    }




    // PMD_FINAL_AFTER_SAVE_FIX
    public function formAfterSave($model)
    {
        try {

            if (!empty($model->pos_table_label)) {

                // 🔥 اینجا دیگه آخرین مرحله است
                \DB::table('ti_tables')
                    ->where('table_id', $model->table_id)
                    ->update([
                        'table_no' => $model->pos_table_label
                    ]);

            }

        } catch (\Throwable $e) {
            \Log::error('FINAL AFTER SAVE ERROR: '.$e->getMessage());
        }
    }




    // PMD_FORCE_TABLE_NO_DISPLAY
    public function formExtendFields($form)
    {
        if (!$model = $form->model) {
            return;
        }

        if (!empty($model->pos_table_label)) {

            if ($form->getField('table_no')) {
                $form->getField('table_no')->value = $model->pos_table_label;
            }

            if ($form->getField('table_no')) {
                $form->getField('table_no')->disabled = true;
            }
        }
    }

}

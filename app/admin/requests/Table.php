<?php

namespace Admin\Requests;

use System\Classes\FormRequest;
use Illuminate\Validation\Rule;

class Table extends FormRequest
{
    public function attributes()
    {
        return [
            'table_no' => 'Table Number',
            'table_name' => lang('admin::lang.label_name'),
            'min_capacity' => lang('admin::lang.tables.label_min_capacity'),
            'max_capacity' => lang('admin::lang.tables.label_capacity'),
            'extra_capacity' => lang('admin::lang.tables.label_extra_capacity'),
            'priority' => lang('admin::lang.tables.label_priority'),
            'is_joinable' => lang('admin::lang.tables.label_joinable'),
            'table_status' => lang('admin::lang.label_status'),
            'locations' => lang('admin::lang.label_location'),
            'locations.*' => lang('admin::lang.label_location'),
        ];
    }

    public function rules()
    {
        $tableId = (int)($this->route('id') ?? $this->input('table_id') ?? 0);

        return [
            'table_no' => [
                'required',
                'integer',
                'min:1',
                Rule::unique('tables', 'table_no')->ignore($tableId, 'table_id'),
            ],
            'min_capacity'   => ['required','integer','min:0'],
            'max_capacity'   => ['required','integer','min:0'],
            'extra_capacity' => ['nullable','integer','min:0'],
            'priority'       => ['nullable','integer','min:0'],
            'is_joinable'    => ['nullable','boolean'],
            'table_status'   => ['nullable','boolean'],
            'locations' => ['required'],
            'locations.*' => ['integer'],
            // DO NOT validate table_name as user input; it is auto-generated.
        ];
    }
}

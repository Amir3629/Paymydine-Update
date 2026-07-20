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
            'extra_capacity' => 'Extra Capacity (temporary chairs)',
            'preferred_capacity' => 'Capacity',
            'floor_name' => 'Floor name',
            'table_section' => 'Section / Zone',
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
            'preferred_capacity' => ['nullable','integer','min:0'],
            'floor_name' => ['nullable','string','max:120'],
            'table_section' => ['nullable','string','max:120'],
            'floor_x' => ['nullable','numeric'],
            'floor_y' => ['nullable','numeric'],
            'floor_shape' => ['nullable','string','max:40'],
            'visible_on_floor_plan' => ['nullable','boolean'],
            'priority'       => ['nullable','integer','min:0'],
            'is_joinable'    => ['nullable','boolean'],
            'table_status'   => ['nullable','boolean'],
            'locations' => ['required'],
            'locations.*' => ['integer'],
            // DO NOT validate table_name as user input; it is auto-generated.
        ];
    }
}

<?php

namespace Admin\Requests;

use System\Classes\FormRequest;

class PosDevices extends FormRequest
{
    public function attributes()
    {
        return [
            'name' => lang('admin::lang.label_name'),
            'description' => lang('admin::lang.label_description'),
            'code' => lang('admin::lang.label_description'),
        ];
    }

    public function rules()
    {
        return [
            'name' => ['required', 'between:2,128'],
            'code' => ['required', 'between:2,64', 'unique:pos_devices,code'],
            'description' => ['nullable', 'string'],
        ];
    }
}

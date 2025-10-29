<?php

namespace Admin\Requests;

use System\Classes\FormRequest;

class PosConfigs extends FormRequest
{
    public function attributes()
    {
        return [
            'device_id' => 'Device',
            'url' => lang('admin::lang.label_url'),
            'access_token' => lang('admin::lang.label_access_token_pos'),
            'id_application' => lang('admin::lang.label_id_application_pos'),
            'username' => lang('admin::lang.pos_configs.label_username'),
            'password' => lang('admin::lang.pos_configs.label_password'),
        ];
    }

    public function rules()
    {
        return [
'devices.*' => ['integer', 'exists:pos_devices,device_id'],
            'url' => ['required', 'string', 'max:255'],
            'username' => ['nullable', 'string', 'max:128'],
            'password' => ['nullable', 'string', 'max:128'],
            'access_token' => ['nullable', 'string', 'max:255'],
            'id_application' => ['nullable', 'string', 'max:128'],
        ];
    }
}

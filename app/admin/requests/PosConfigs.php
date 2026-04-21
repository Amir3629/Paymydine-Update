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
            'sumup_affiliate_key' => 'SumUp Affiliate Key',
            'sumup_reader_id' => 'SumUp Reader ID',
            'sumup_pairing_code' => 'SumUp Pairing Code',
            'sumup_pairing_state' => 'SumUp Pairing State',
            'sumup_reader_label' => 'SumUp Reader Label',
        ];
    }

    public function rules()
    {
        return [
'devices.*' => ['integer', 'exists:pos_devices,device_id'],
            'url' => ['nullable', 'string', 'max:255'],
            'username' => ['nullable', 'string', 'max:128'],
            'password' => ['nullable', 'string', 'max:128'],
            'access_token' => ['nullable', 'string', 'max:2048'],
            'id_application' => ['nullable', 'string', 'max:128'],
            'sumup_affiliate_key' => ['nullable', 'string', 'max:191'],
            'sumup_reader_id' => ['nullable', 'string', 'max:191'],
            'sumup_pairing_code' => ['nullable', 'string', 'max:191'],
            'sumup_pairing_state' => ['nullable', 'string', 'max:50'],
            'sumup_reader_label' => ['nullable', 'string', 'max:191'],
        ];
    }
}

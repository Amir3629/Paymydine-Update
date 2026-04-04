<?php

namespace Admin\Requests;

use System\Classes\FormRequest;

class PanelSettings extends FormRequest
{
    public function attributes()
    {
        return [
            'admin_after_save_action' => lang('admin::lang.settings.label_after_save_action'),
            'enable_request_log' => lang('system::lang.settings.label_enable_request_log'),
            'maintenance_mode' => lang('system::lang.settings.label_maintenance_mode'),
            'maintenance_message' => lang('system::lang.settings.label_maintenance_message'),
            'activity_log_timeout' => lang('system::lang.settings.label_activity_log_timeout'),
        ];
    }

    public function rules()
    {
        return [
            'admin_after_save_action' => ['required', 'in:continue,close,new'],
            'enable_request_log' => ['required', 'integer'],
            'maintenance_mode' => ['required', 'integer'],
            'maintenance_message' => ['required_if:maintenance_mode,1'],
            'activity_log_timeout' => ['required', 'integer'],
        ];
    }
}



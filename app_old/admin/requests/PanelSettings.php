<?php

namespace Admin\Requests;

use System\Classes\FormRequest;

class PanelSettings extends FormRequest
{
    public function attributes()
    {
        return [
            'admin_after_save_action' => lang('admin::lang.settings.label_after_save_action'),
        ];
    }

    public function rules()
    {
        return [
            'admin_after_save_action' => ['required', 'in:continue,close,new'],
        ];
    }
}



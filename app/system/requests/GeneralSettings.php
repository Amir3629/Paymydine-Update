<?php

namespace System\Requests;

use System\Classes\FormRequest;

class GeneralSettings extends FormRequest
{
    public function attributes()
    {
        return [
            'site_name' => lang('system::lang.settings.label_site_name'),
            'site_email' => lang('system::lang.settings.label_site_email'),
            'site_logo' => lang('system::lang.settings.label_site_logo'), // validationData() returns post('setting') which is already the nested array
            'maps_api_key' => lang('system::lang.settings.label_maps_api_key'),
            'distance_unit' => lang('system::lang.settings.label_distance_unit'),
        ];
    }

    public function rules()
    {
        return [
            'site_name' => ['required', 'min:2', 'max:128'],
            'site_email' => ['required', 'email:filter', 'max:96'],
            'site_logo' => ['required', 'string'], // Restored to required now that form submission works
            'menus_page' => ['required', 'string'],
            'reservation_page' => ['required', 'string'],
        ];
    }

    protected function useDataFrom()
    {
        return static::DATA_TYPE_FORM; // Use form widget's processed data instead of raw POST
    }
}

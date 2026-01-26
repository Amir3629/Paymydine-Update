<?php

namespace Admin\Requests;

use System\Classes\FormRequest;

class Combo extends FormRequest
{
    public function attributes()
    {
        return [
            'combo_name' => 'Combo Name',
            'combo_description' => 'Description',
            'combo_price' => 'Bundle Price',
            'locations.*' => 'Location',
            'combo_status' => 'Status',
        ];
    }

    public function rules()
    {
        return [
            'combo_name' => ['required', 'between:2,255'],
            'combo_description' => ['nullable', 'between:2,1028'],
            'combo_price' => ['required', 'numeric', 'min:0'],
            'locations.*' => ['integer'],
            'combo_status' => ['boolean'],
            'ComboItems' => ['sometimes', 'array'],
            'ComboItems.*.menu_id' => ['required_with:ComboItems', 'integer', 'exists:menus,menu_id'],
            'ComboItems.*.quantity' => ['required_with:ComboItems.*.menu_id', 'integer', 'min:1'],
        ];
    }
}


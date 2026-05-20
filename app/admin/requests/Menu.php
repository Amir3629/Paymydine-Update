<?php

namespace Admin\Requests;

use System\Classes\FormRequest;

class Menu extends FormRequest
{
    public function attributes()
    {
        return [
            'menu_name' => lang('admin::lang.label_name'),
            'menu_description' => lang('admin::lang.label_description'),
            'menu_price' => lang('admin::lang.menus.label_price'),
            'categories.*' => lang('admin::lang.menus.label_category'),
            'locations.*' => lang('admin::lang.column_location'),
            'stock_qty' => lang('admin::lang.menus.label_stock_qty'),
            'minimum_qty' => lang('admin::lang.menus.label_minimum_qty'),
            'subtract_stock' => lang('admin::lang.menus.label_subtract_stock'),
            'order_restriction.*' => lang('admin::lang.menus.label_order_restriction'),
            'menu_status' => lang('admin::lang.label_status'),
            'mealtime_id' => lang('admin::lang.menus.label_mealtime'),
            'menu_priority' => lang('admin::lang.menus.label_menu_priority'),
            'is_halal' => 'Halal',
            'is_vegetarian' => 'Vegetarian',
            'is_vegan' => 'Vegan',
            'allergens.*' => lang('admin::lang.menus.label_allergens'),
            'calories' => 'Calories',
            'protein' => 'Protein',
            'carbs' => 'Carbs',
            'fat' => 'Fat',
            'sugar' => 'Sugar',
            'serving_size' => 'Serving / portion size',
            'color' => 'Color',
        ];
    }

    public function rules()
    {
        return [
            'menu_name' => ['required', 'between:2,255'],
            'menu_description' => ['between:2,1028'],
            'menu_price' => ['required', 'numeric', 'min:0'],
            'categories.*' => ['sometimes', 'required', 'integer'],
            'locations.*' => ['integer'],
            'stock_qty' => ['nullable', 'integer'],
            'minimum_qty' => ['sometimes', 'required', 'integer', 'min:1'],
            'subtract_stock' => ['sometimes', 'required', 'boolean'],
            'order_restriction.*' => ['nullable', 'string'],
            'menu_status' => ['boolean'],
            'mealtime_id' => ['nullable', 'integer'],
            'menu_priority' => ['min:0', 'integer'],
            'is_halal' => ['boolean'],
            'is_vegetarian' => ['boolean'],
            'is_vegan' => ['boolean'],
            'allergens.*' => ['integer'],
            'calories' => ['nullable', 'integer', 'min:0'],
            'protein' => ['nullable', 'numeric', 'min:0'],
            'carbs' => ['nullable', 'numeric', 'min:0'],
            'fat' => ['nullable', 'numeric', 'min:0'],
            'sugar' => ['nullable', 'numeric', 'min:0'],
            'serving_size' => ['nullable', 'string', 'max:64'],
            'color' => ['nullable', 'regex:/^#(?:[0-9a-fA-F]{3}){1,2}$/'],
        ];
    }
}

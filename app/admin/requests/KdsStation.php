<?php

namespace Admin\Requests;

use System\Classes\FormRequest;

class KdsStation extends FormRequest
{
    public function attributes()
    {
        return [
            'name' => 'Station Name',
            'slug' => 'URL Slug',
            'category_ids' => 'Categories',
        ];
    }

    public function rules()
    {
        return [
            'name' => ['required', 'min:2', 'max:128'],
            'slug' => ['nullable', 'max:128', 'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/'],
            'category_ids' => ['sometimes', 'array'],
            'category_ids.*' => ['integer'],
        ];
    }
}





<?php

namespace Admin\Controllers;

use Admin\Classes\AdminController;
use Admin\Facades\AdminMenu;
use Admin\Models\Categories_model;

class Categories extends AdminController
{
    public $implement = [
        'Admin\Actions\ListController',
        'Admin\Actions\FormController',
        'Admin\Actions\LocationAwareController',
    ];

    public $listConfig = [
        'list' => [
            'model' => 'Admin\Models\Categories_model',
            'title' => 'lang:admin::lang.categories.text_title',
            'emptyMessage' => 'lang:admin::lang.categories.text_empty',
            'defaultSort' => ['category_id', 'DESC'],
            'configFile' => 'categories_model',
        ],
    ];

    public $formConfig = [
        'name' => 'lang:admin::lang.categories.text_form_name',
        'model' => 'Admin\Models\Categories_model',
        'request' => 'Admin\Requests\Category',
        'create' => [
            'title' => 'lang:admin::lang.form.create_title',
            'redirect' => 'categories/edit/{category_id}',
            'redirectClose' => 'categories',
            'redirectNew' => 'categories/create',
        ],
        'edit' => [
            'title' => 'lang:admin::lang.form.edit_title',
            'redirect' => 'categories/edit/{category_id}',
            'redirectClose' => 'categories',
            'redirectNew' => 'categories/create',
        ],
        'preview' => [
            'title' => 'lang:admin::lang.form.preview_title',
            'redirect' => 'categories',
        ],
        'delete' => [
            'redirect' => 'categories',
        ],
        'configFile' => 'categories_model',
    ];

    protected $requiredPermissions = 'Admin.Categories';

    public function __construct()
    {
        parent::__construct();

        AdminMenu::setContext('categories', 'restaurant');
        $this->addCss('assets/css/pmd-admin-universal-list-v1.css', 'pmd-admin-universal-list-v1');
    }


    public function index()
    {
        $this->vars['pmdUniversalList'] = $this->pmdBuildUniversalListData();

        $this->asExtension('ListController')->index();
    }

    protected function pmdBuildUniversalListData(): array
    {
        try {
            $query = Categories_model::query();
            $total = (clone $query)->count();
            $enabled = (clone $query)->where('status', 1)->count();
            $hidden = (clone $query)->where('frontend_visible', 0)->count();
            $needsImage = (clone $query)->where(function ($imageQuery) {
                $imageQuery->whereNull('image')->orWhere('image', '');
            })->count();
        } catch (\Throwable $exception) {
            $total = $enabled = $hidden = $needsImage = 0;
        }

        return [
            'pageKey' => 'categories',
            'title' => 'Categories',
            'description' => 'Read-only menu category summary and existing category list.',
            'kpis' => [
                ['label' => 'Total categories', 'value' => $total, 'icon' => 'fa-layer-group', 'meaning' => 'Menu organization size'],
                ['label' => 'Enabled', 'value' => $enabled, 'icon' => 'fa-toggle-on', 'meaning' => 'Visible taxonomy'],
                ['label' => 'Hidden from frontend', 'value' => $hidden, 'icon' => 'fa-eye-slash', 'meaning' => 'Customer visibility exceptions'],
                ['label' => 'Needs image', 'value' => $needsImage, 'icon' => 'fa-image', 'meaning' => 'Merchandising gaps'],
            ],
        ];
    }

}

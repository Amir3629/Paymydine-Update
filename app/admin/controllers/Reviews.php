<?php

namespace Admin\Controllers;

use Admin\Classes\AdminController;
use Admin\Facades\AdminMenu;

class Reviews extends AdminController
{
    public $implement = [
        'Admin\Actions\ListController',
        'Admin\Actions\FormController',
    ];

    public $listConfig = [
        'list' => [
            'model' => 'Admin\Models\Reviews_model',
            'title' => 'Customer Reviews',
            'emptyMessage' => 'No customer reviews found.',
            'defaultSort' => ['created_at', 'DESC'],
            'configFile' => 'reviews_model',
        ],
    ];

    public $formConfig = [
        'name' => 'Customer Review',
        'model' => 'Admin\Models\Reviews_model',
        'edit' => [
            'title' => 'Edit Review',
            'redirect' => 'reviews',
        ],
        'delete' => [
            'redirect' => 'reviews',
        ],
        'configFile' => 'reviews_model',
    ];

    protected $requiredPermissions = ['Admin.Reviews'];

    public function __construct()
    {
        parent::__construct();
        AdminMenu::setContext('reviews', 'restaurant');
    }

    public function index()
    {
        $this->asExtension('ListController')->index();
    }
}

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

    /*
     * PMD_REVIEWS_LIST_CONTROLLER_CONFIG_FIX_20260606
     * ListController requires top-level "list".
     */
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
        'create' => [
            'title' => 'Create Review',
            'redirect' => 'reviews/edit/{review_id}',
            'redirectClose' => 'reviews',
        ],
        'edit' => [
            'title' => 'Edit Review',
            'redirect' => 'reviews/edit/{review_id}',
            'redirectClose' => 'reviews',
        ],
        'preview' => [
            'title' => 'Preview Review',
            'redirect' => 'reviews',
        ],
        'delete' => [
            'redirect' => 'reviews',
        ],
        'configFile' => 'reviews_model',
    ];

    protected $requiredPermissions = ['Site.Settings'];

    public function __construct()
    {
        parent::__construct();

        try {
            AdminMenu::setContext('reviews', 'restaurant');
        } catch (\Throwable $e) {
            // Menu context should never break the page.
        }
    }

    public function index()
    {
        return $this->asExtension('ListController')->index();
    }

    public function edit($recordId = null, $context = null)
    {
        return $this->asExtension('FormController')->edit($recordId, $context);
    }

    public function preview($recordId = null, $context = null)
    {
        return $this->asExtension('FormController')->preview($recordId, $context);
    }
}

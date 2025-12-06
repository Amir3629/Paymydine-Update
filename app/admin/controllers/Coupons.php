<?php

namespace Admin\Controllers;

use Admin\Classes\AdminController;
use Admin\Facades\AdminMenu;
use Admin\Models\Coupons_model;

class Coupons extends AdminController
{
    public $implement = [
        'Admin\Actions\ListController',
        'Admin\Actions\FormController',
    ];

    public $listConfig = [
        'list' => [
            'model' => 'Admin\Models\Coupons_model',
            'title' => 'Coupons & Gift Cards',
            'emptyMessage' => 'No coupons or gift cards found',
            'defaultSort' => ['coupon_id', 'DESC'],
            'configFile' => 'coupons_model',
        ],
    ];

    public $formConfig = [
        'name' => 'Coupon / Gift Card',
        'model' => 'Admin\Models\Coupons_model',
        'create' => [
            'title' => 'Create Coupon / Gift Card',
            'redirect' => 'coupons/edit/{coupon_id}',
            'redirectClose' => 'coupons',
            'redirectNew' => 'coupons/create',
        ],
        'edit' => [
            'title' => 'Edit Coupon / Gift Card',
            'redirect' => 'coupons/edit/{coupon_id}',
            'redirectClose' => 'coupons',
            'redirectNew' => 'coupons/create',
        ],
        'preview' => [
            'title' => 'Preview Coupon / Gift Card',
            'redirect' => 'coupons',
        ],
        'delete' => [
            'redirect' => 'coupons',
        ],
        'configFile' => 'coupons_model',
    ];

    protected $requiredPermissions = 'Admin';

    public function __construct()
    {
        parent::__construct();

        AdminMenu::setContext('coupons', 'marketing');
    }
}


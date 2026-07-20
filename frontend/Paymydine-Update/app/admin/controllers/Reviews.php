<?php

namespace Admin\Controllers;

use Admin\Classes\AdminController;
use Admin\Facades\AdminMenu;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

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

    public function onUpdateStatus()
    {
        $user = $this->getUser();
        if (!$user || !$user->hasPermission('Site.Settings')) {
            abort(403, 'You do not have permission to moderate reviews.');
        }

        $reviewId = (int)post('review_id');
        $status = (string)post('status', 'pending');
        if (!in_array($status, ['pending', 'approved', 'hidden', 'rejected'], true)) {
            $status = 'pending';
        }

        if ($reviewId <= 0 || !Schema::hasTable('reviews')) {
            return ['success' => false, 'message' => 'Invalid review.'];
        }

        $columns = Schema::getColumnListing('reviews');
        $payload = [];
        if (in_array('status', $columns, true)) {
            $payload['status'] = $status;
        }
        if (in_array('review_status', $columns, true)) {
            $payload['review_status'] = $status === 'approved' ? 1 : 0;
        }
        if (in_array('updated_at', $columns, true)) {
            $payload['updated_at'] = now();
        }

        if ($payload) {
            DB::table('reviews')->where('review_id', $reviewId)->update($payload);
        }

        return ['success' => true, 'message' => 'Review status updated.'];
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

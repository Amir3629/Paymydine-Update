<?php

namespace Admin\Controllers;

use Admin\Classes\AdminController;
use Admin\Facades\AdminLocation;
use Admin\Facades\AdminMenu;
use App\Services\GoogleBusiness\PmdGoogleBusinessService;
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

    public function onSyncGoogleReviews()
    {
        $this->assertReviewPermission();

        try {
            $result = app(PmdGoogleBusinessService::class)
                ->syncReviews($this->currentLocationId());

            return [
                'success' => true,
                'message' => 'Google Reviews synced.',
                'synced' => (int)($result['synced'] ?? 0),
            ];
        } catch (\Throwable $error) {
            throw new \RuntimeException($error->getMessage());
        }
    }

    public function onReplyGoogleReview()
    {
        $this->assertReviewPermission();

        $externalReviewId = (int)post('external_review_id');
        $reply = trim((string)post('reply', ''));

        if ($externalReviewId < 1) {
            throw new \RuntimeException('Google review is invalid.');
        }
        if ($reply === '') {
            throw new \RuntimeException('Reply text is required.');
        }
        if (mb_strlen($reply) > 4096) {
            throw new \RuntimeException('Reply must be 4096 characters or fewer.');
        }

        app(PmdGoogleBusinessService::class)->replyToReview(
            $this->currentLocationId(),
            $externalReviewId,
            $reply
        );

        return ['success' => true, 'message' => 'Reply published to Google.'];
    }

    public function onDeleteGoogleReviewReply()
    {
        $this->assertReviewPermission();

        $externalReviewId = (int)post('external_review_id');
        if ($externalReviewId < 1) {
            throw new \RuntimeException('Google review is invalid.');
        }

        app(PmdGoogleBusinessService::class)->deleteReviewReply(
            $this->currentLocationId(),
            $externalReviewId
        );

        return ['success' => true, 'message' => 'Google reply deleted.'];
    }

    public function index()
    {
        $locationId = $this->currentLocationId();

        try {
            $google = app(PmdGoogleBusinessService::class);
            $this->vars['pmdGoogleBusiness'] = $google->status($locationId);
            $this->vars['pmdExternalGoogleReviews'] = $google->externalReviews($locationId, 200);
            $this->vars['pmdGoogleReviewsError'] = null;
        } catch (\Throwable $error) {
            $this->vars['pmdGoogleBusiness'] = ['connected' => false, 'configured' => false];
            $this->vars['pmdExternalGoogleReviews'] = collect();
            $this->vars['pmdGoogleReviewsError'] = $error->getMessage();
        }

        return $this->asExtension('ListController')->index();
    }

    private function assertReviewPermission(): void
    {
        $user = $this->getUser();
        if (!$user || !$user->hasPermission('Site.Settings')) {
            abort(403, 'You do not have permission to manage Google reviews.');
        }
    }

    private function currentLocationId(): int
    {
        try {
            $location = AdminLocation::current();
            if ($location && (int)$location->location_id > 0) {
                return (int)$location->location_id;
            }
        } catch (\Throwable $error) {
        }

        try {
            $sessionId = (int)AdminLocation::getSession('id');
            if ($sessionId > 0) return $sessionId;
        } catch (\Throwable $error) {
        }

        return max(1, (int)params('default_location_id', 1));
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

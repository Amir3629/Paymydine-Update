<?php
/*
|--------------------------------------------------------------------------
| PMD_REVIEWS_HUMAN_ADMIN_INDEX_20260606
|--------------------------------------------------------------------------
| Shows tenant reviews with new-column preference and legacy fallbacks.
|--------------------------------------------------------------------------
*/

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

$rows = collect();
$columns = [];
$locationNames = [];

try {
    if (Schema::hasTable('reviews')) {
        $columns = Schema::getColumnListing('reviews');

        $sortColumn = in_array('created_at', $columns, true)
            ? 'created_at'
            : (in_array('review_id', $columns, true) ? 'review_id' : $columns[0] ?? null);

        $query = DB::table('reviews');
        if ($sortColumn) {
            $query->orderBy($sortColumn, 'desc');
        }
        $rows = $query->limit(200)->get();

        if (Schema::hasTable('locations') && in_array('location_id', $columns, true)) {
            $locationIds = $rows->pluck('location_id')->filter()->unique()->values()->all();
            if ($locationIds) {
                $locationNames = DB::table('locations')
                    ->whereIn('location_id', $locationIds)
                    ->pluck('location_name', 'location_id')
                    ->all();
            }
        }
    }
} catch (\Throwable $e) {
    $pmdReviewsError = $e->getMessage();
}

$hasColumn = function (string $column) use ($columns): bool {
    return in_array($column, $columns, true);
};

$valueOf = function ($row, array $candidates, $fallback = null) use ($hasColumn) {
    foreach ($candidates as $column) {
        if ($hasColumn($column) && isset($row->{$column}) && $row->{$column} !== '' && $row->{$column} !== null) {
            return $row->{$column};
        }
    }
    return $fallback;
};

$reviewStatus = function ($row) use ($valueOf, $hasColumn): string {
    $status = strtolower(trim((string)$valueOf($row, ['status'], '')));
    if ($status !== '') return $status;

    if ($hasColumn('review_status')) {
        return (int)($row->review_status ?? 0) === 1 ? 'approved' : 'pending';
    }

    return 'pending';
};

$statusBadge = function (string $status): string {
    $labels = [
        'approved' => ['Approved', 'success'],
        'pending' => ['Pending', 'warning'],
        'hidden' => ['Hidden', 'default'],
        'rejected' => ['Rejected', 'danger'],
    ];
    [$label, $class] = $labels[$status] ?? [ucfirst($status ?: 'Pending'), 'default'];
    return '<span class="label label-'.$class.'" style="display:inline-block;min-width:72px;">'.e($label).'</span>';
};
?>

<div class="container-fluid pmd-reviews-admin">
    <div class="page-header">
        <h1>Customer Reviews</h1>
        <p class="text-muted mb-0">Review feedback submitted from the customer checkout/menu flow. New review fields are preferred with legacy review fallbacks.</p>
    </div>

    <?php if (!empty($pmdReviewsError)): ?>
        <div class="alert alert-danger">
            <strong>Reviews could not be loaded:</strong>
            <?= e($pmdReviewsError) ?>
        </div>
    <?php elseif (!Schema::hasTable('reviews')): ?>
        <div class="alert alert-warning">
            Reviews table does not exist yet. Run <code>php artisan igniter:up</code> for the tenant first.
        </div>
    <?php elseif ($rows->isEmpty()): ?>
        <div class="alert alert-info">
            No customer reviews saved yet.
        </div>
    <?php else: ?>
        <div class="panel panel-default">
            <div class="table-responsive">
                <table class="table table-hover mb-0">
                    <thead>
                        <tr>
                            <th style="width:72px;">ID</th>
                            <th style="width:110px;">Order/Sale</th>
                            <th style="width:160px;">Customer</th>
                            <th style="width:95px;">Rating</th>
                            <th>Comment</th>
                            <th style="width:110px;">Status</th>
                            <th style="width:110px;">Source</th>
                            <th style="width:150px;">Location</th>
                            <th style="width:165px;">Created</th>
                            <th style="width:230px;">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($rows as $row): ?>
                            <?php
                                $reviewId = (int)($row->review_id ?? 0);
                                $orderId = $valueOf($row, ['order_id', 'sale_id'], null);
                                $customer = (string)$valueOf($row, ['customer_name', 'author'], 'Guest');
                                $rating = (int)$valueOf($row, ['rating', 'quality'], 0);
                                $comment = (string)$valueOf($row, ['comment', 'review_text'], '');
                                $status = $reviewStatus($row);
                                $source = (string)$valueOf($row, ['source'], 'frontend');
                                $locationId = $valueOf($row, ['location_id'], null);
                                $location = $locationId ? ($locationNames[$locationId] ?? ('#'.$locationId)) : '—';
                                $createdAt = (string)$valueOf($row, ['created_at'], '—');
                                $tenantHost = (string)$valueOf($row, ['tenant_host'], '');
                                $publicConsent = $valueOf($row, ['public_share_consent'], null);
                            ?>
                            <tr>
                                <td><strong>#<?= e($reviewId) ?></strong></td>
                                <td><?= $orderId ? ('#'.e($orderId)) : '—' ?></td>
                                <td>
                                    <strong><?= e($customer ?: 'Guest') ?></strong>
                                    <?php if ($tenantHost): ?>
                                        <div class="small text-muted"><?= e($tenantHost) ?></div>
                                    <?php endif; ?>
                                </td>
                                <td>
                                    <?php if ($rating > 0): ?>
                                        <span aria-label="<?= e($rating) ?> star rating" style="color:#b88940;font-weight:700;"><?= str_repeat('★', min(5, $rating)) ?></span>
                                        <span class="text-muted small"> <?= e($rating) ?>/5</span>
                                    <?php else: ?>
                                        <span class="text-muted">—</span>
                                    <?php endif; ?>
                                </td>
                                <td style="max-width:420px;white-space:normal;">
                                    <?= e(Str::limit($comment ?: 'No comment provided.', 220)) ?>
                                    <?php if ($publicConsent !== null): ?>
                                        <div class="small text-muted">Public: <?= $publicConsent ? 'Yes' : 'No' ?></div>
                                    <?php endif; ?>
                                </td>
                                <td><?= $statusBadge($status) ?></td>
                                <td><?= e(ucfirst($source ?: 'frontend')) ?></td>
                                <td><?= e($location) ?></td>
                                <td><span class="text-muted"><?= e($createdAt) ?></span></td>
                                <td>
                                    <div class="btn-group btn-group-sm" role="group" aria-label="Review moderation actions">
                                        <?php if ($status !== 'approved'): ?>
                                            <button class="btn btn-success" data-request="onUpdateStatus" data-request-data="review_id: <?= $reviewId ?>, status: 'approved'" data-request-success="window.location.reload()">Approve</button>
                                        <?php endif; ?>
                                        <?php if (!in_array($status, ['hidden', 'rejected'], true)): ?>
                                            <button class="btn btn-warning" data-request="onUpdateStatus" data-request-data="review_id: <?= $reviewId ?>, status: 'hidden'" data-request-success="window.location.reload()">Hide</button>
                                        <?php endif; ?>
                                        <?php if ($status !== 'pending'): ?>
                                            <button class="btn btn-default" data-request="onUpdateStatus" data-request-data="review_id: <?= $reviewId ?>, status: 'pending'" data-request-success="window.location.reload()">Pending</button>
                                        <?php endif; ?>
                                    </div>
                                </td>
                            </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            </div>
        </div>
    <?php endif; ?>
</div>

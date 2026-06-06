<?php
/*
|--------------------------------------------------------------------------
| PMD_REVIEWS_SAFE_ADMIN_INDEX_NO_WIDGET_RENDER_20260606
|--------------------------------------------------------------------------
| This view intentionally does NOT call toolbarWidget/listWidget/render().
| It prevents "Call to a member function render() on null" and shows stored
| reviews directly from the reviews table.
|--------------------------------------------------------------------------
*/

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

$rows = collect();
$columns = [];

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
    }
} catch (\Throwable $e) {
    $pmdReviewsError = $e->getMessage();
}

$showColumns = array_values(array_filter([
    in_array('review_id', $columns, true) ? 'review_id' : null,
    in_array('order_id', $columns, true) ? 'order_id' : (in_array('sale_id', $columns, true) ? 'sale_id' : null),
    in_array('menu_id', $columns, true) ? 'menu_id' : null,
    in_array('customer_name', $columns, true) ? 'customer_name' : (in_array('author', $columns, true) ? 'author' : null),
    in_array('tenant_host', $columns, true) ? 'tenant_host' : null,
    in_array('location_id', $columns, true) ? 'location_id' : null,
    in_array('rating', $columns, true) ? 'rating' : null,
    in_array('quality', $columns, true) ? 'quality' : null,
    in_array('review_text', $columns, true) ? 'review_text' : null,
    in_array('comment', $columns, true) ? 'comment' : null,
    in_array('status', $columns, true) ? 'status' : null,
    in_array('review_status', $columns, true) ? 'review_status' : null,
    in_array('source', $columns, true) ? 'source' : null,
    in_array('public_share_consent', $columns, true) ? 'public_share_consent' : null,
    in_array('created_at', $columns, true) ? 'created_at' : null,
]));

if (empty($showColumns)) {
    $showColumns = array_slice($columns, 0, 8);
}
?>

<div class="container-fluid">
    <div class="page-header">
        <h1>Customer Reviews</h1>
    </div>

    <?php if (!empty($pmdReviewsError)): ?>
        <div class="alert alert-danger">
            <strong>Reviews could not be loaded:</strong>
            <?= e($pmdReviewsError) ?>
        </div>
    <?php elseif (!Schema::hasTable('reviews')): ?>
        <div class="alert alert-warning">
            Reviews table does not exist yet. Run the review migration first.
        </div>
    <?php elseif ($rows->isEmpty()): ?>
        <div class="alert alert-info">
            No customer reviews saved yet.
        </div>
    <?php else: ?>
        <div class="panel panel-default">
            <div class="table-responsive">
                <table class="table table-striped table-hover mb-0">
                    <thead>
                        <tr>
                            <?php foreach ($showColumns as $column): ?>
                                <th><?= e(ucwords(str_replace('_', ' ', $column))) ?></th>
                            <?php endforeach; ?>
                            <th>Moderation</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($rows as $row): ?>
                            <tr>
                                <?php foreach ($showColumns as $column): ?>
                                    <?php
                                        $value = $row->{$column} ?? '';
                                        if (is_bool($value)) {
                                            $value = $value ? 'Yes' : 'No';
                                        }
                                        $value = is_scalar($value) || $value === null ? (string)$value : json_encode($value);
                                    ?>
                                    <td style="max-width: 360px; white-space: normal;">
                                        <?= e(\Illuminate\Support\Str::limit($value, 180)) ?>
                                    </td>
                                <?php endforeach; ?>
                                    <td style="min-width: 220px;">
                                        <?php $reviewId = $row->review_id ?? null; ?>
                                        <?php if ($reviewId): ?>
                                            <button class="btn btn-xs btn-success" data-request="index_onUpdateStatus" data-request-data="review_id: <?= (int)$reviewId ?>, status: 'approved'" data-request-success="location.reload()">Approve</button>
                                            <button class="btn btn-xs btn-warning" data-request="index_onUpdateStatus" data-request-data="review_id: <?= (int)$reviewId ?>, status: 'hidden'" data-request-success="location.reload()">Hide</button>
                                            <button class="btn btn-xs btn-default" data-request="index_onUpdateStatus" data-request-data="review_id: <?= (int)$reviewId ?>, status: 'pending'" data-request-success="location.reload()">Pending</button>
                                        <?php endif; ?>
                                    </td>
                            </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            </div>
        </div>
    <?php endif; ?>
</div>

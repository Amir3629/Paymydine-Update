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
    in_array('order_id', $columns, true) ? 'order_id' : null,
    in_array('tenant_host', $columns, true) ? 'tenant_host' : null,
    in_array('location_id', $columns, true) ? 'location_id' : null,
    in_array('rating', $columns, true) ? 'rating' : null,
    in_array('rating_value', $columns, true) ? 'rating_value' : null,
    in_array('review_text', $columns, true) ? 'review_text' : null,
    in_array('comment', $columns, true) ? 'comment' : null,
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
                            </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            </div>
        </div>
    <?php endif; ?>
</div>

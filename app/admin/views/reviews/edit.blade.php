<?php
/*
|--------------------------------------------------------------------------
| PMD_REVIEWS_SAFE_ADMIN_EDIT_NO_WIDGET_RENDER_20260606
|--------------------------------------------------------------------------
| Safe fallback view. Avoids null form widget render errors.
|--------------------------------------------------------------------------
*/
?>

<div class="container-fluid">
    <div class="page-header">
        <h1>Customer Review</h1>
    </div>

    <div class="alert alert-info">
        Review details are available from <strong>Restaurant → Customer Reviews</strong>.
    </div>

    <a href="<?= admin_url('reviews') ?>" class="btn btn-default">
        Back to Customer Reviews
    </a>
</div>

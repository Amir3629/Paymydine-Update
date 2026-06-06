<?php /* PMD_SAFE_REVIEWS_INDEX_20260606 */ ?>

<div class="page-wrapper">
    <div class="page-content">
        <?php
            try {
                echo $this->listRender('list');
            } catch (\Throwable $e) {
                \Log::error('[PMD Reviews index failed]', [
                    'message' => $e->getMessage(),
                    'file' => $e->getFile(),
                    'line' => $e->getLine(),
                ]);

                echo '<div class="alert alert-warning">Customer reviews list could not load. Check system log.</div>';
            }
        ?>
    </div>
</div>

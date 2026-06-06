<?php /* PMD_SAFE_REVIEWS_EDIT_20260606 */ ?>

<div class="page-wrapper">
    <div class="page-content">
        <?php
            try {
                echo $this->formRender();
            } catch (\Throwable $e) {
                \Log::error('[PMD Reviews edit failed]', [
                    'message' => $e->getMessage(),
                    'file' => $e->getFile(),
                    'line' => $e->getLine(),
                ]);

                echo '<div class="alert alert-warning">Review form could not load. Check system log.</div>';
            }
        ?>
    </div>
</div>

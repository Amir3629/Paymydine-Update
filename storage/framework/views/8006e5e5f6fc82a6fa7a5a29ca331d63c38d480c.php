<div class="dashboard-widget widget-charts">
    <h6 class="widget-title"><i class="stat-icon <?php echo e($chartIcon); ?>"></i> <?php echo app('translator')->get($chartLabel); ?></h6>
    <div
        class="chart-container"
        data-control="chart"
        data-alias="<?php echo e($this->alias); ?>"
        data-type="<?php echo e($chartType); ?>"
        data-data='<?php echo json_encode($chartData, 15, 512) ?>'
    >
        <div class="chart-canvas chart-<?php echo e(name_to_id($chartType)); ?> chart-<?php echo e(name_to_id($this->alias)); ?>">
            <canvas id="<?php echo e($this->alias); ?>"></canvas>
        </div>
    </div>
</div>
<?php /**PATH /Users/amir/Downloads/paymydine-main-22/app/admin/dashboardwidgets/charts/charts.blade.php ENDPATH**/ ?>
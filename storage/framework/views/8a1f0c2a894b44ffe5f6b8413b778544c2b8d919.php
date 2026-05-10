<div class="dashboard-widget widget-charts pmd-card">
    <h6 class="widget-title pmd-card__title"><i class="stat-icon <?php echo e($chartIcon); ?>"></i> <?php echo app('translator')->get($chartLabel); ?></h6>
    <div
        class="chart-container pmd-card__body"
        data-control="chart"
        data-alias="<?php echo e($this->alias); ?>"
        data-type="<?php echo e($chartType); ?>"
        data-data='<?php echo json_encode($chartData, 15, 512) ?>'
    >
        <div id="<?php echo e($this->alias); ?>-widget" class="chart-canvas chart-<?php echo e(name_to_id($chartType)); ?> chart-<?php echo e(name_to_id($this->alias)); ?>">
            <canvas id="<?php echo e($this->alias); ?>-canvas"></canvas>
        </div>
        
        <!-- Time Range Slider - Continuous from 7 to 90 days -->
        <div class="chart-time-slider">
            <label>
                Time Range: <span id="<?php echo e($this->alias); ?>-range-label">30 days</span>
            </label>
            <input 
                type="range" 
                id="<?php echo e($this->alias); ?>-time-range" 
                min="7" 
                max="90" 
                value="30" 
                step="1"
            >
            <div class="range-scale">
                <span>7 days</span>
                <span>30 days</span>
                <span>90 days</span>
            </div>
        </div>
    </div>
</div>
<?php /**PATH /var/www/paymydine/app/admin/dashboardwidgets/charts/charts.blade.php ENDPATH**/ ?>
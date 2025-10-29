
<div
    class=""
    data-control="dashboard-container"
    data-alias="<?php echo e($this->alias); ?>"
    data-sortable-container="#<?php echo e($this->getId('container-list')); ?>"
    data-date-range-format="<?php echo e($dateRangeFormat); ?>"
>
    <div
        id="<?php echo e($this->getId('container-toolbar')); ?>"
        class="toolbar dashboard-toolbar btn-toolbar"
        data-container-toolbar>
        <?php echo $this->makePartial('widget_toolbar'); ?>

    </div>

    <div class="dashboard-widgets page-x-spacer">
        <div class="progress-indicator vh-100 d-flex flex-column">
            <div class="align-self-center text-center m-auto">
            <?php
use Illuminate\Support\Facades\DB;
$loader_logo = DB::table('logos')->orderBy('id', 'desc')->value('loader_logo');
?>
            <img src="<?php echo $loader_logo ? $loader_logo . '?t=' . time() : ''; ?>" alt="Loder Logo">
                <i class="d-block" style="width: 256px;height: 256px;">
                </i>
                <br>
                <span class="spinner-border"></span>&nbsp;&nbsp;<?php echo app('translator')->get('admin::lang.text_loading'); ?>
            </div>
        </div>
        <div id="<?php echo e($this->getId('container')); ?>"></div>
    </div>
</div>


<?php /**PATH /Users/amir/Downloads/paymydine-main/app/admin/widgets/dashboardcontainer/dashboardcontainer.blade.php ENDPATH**/ ?>
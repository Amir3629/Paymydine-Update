<div class="media-finder">
    <div class="grid">
        <?php if($this->previewMode): ?>
            <a>
                <div class="img-cover">
                    <img src="<?php echo e($this->getMediaThumb($mediaItem)); ?>" class="img-responsive">
                </div>
            </a>
        <?php else: ?>
            <?php if(is_null($mediaItem)): ?>
                <a class="find-button blank-cover">
                    <i class="fa fa-plus"></i>
                </a>
            <?php else: ?>
                <i class="find-remove-button fa fa-times-circle" title="<?php echo app('translator')->get('admin::lang.text_remove'); ?>"></i>
                <div class="icon-container">
                    <span data-find-name title="<?php echo e($this->getMediaName($mediaItem)); ?>"><?php echo e($this->getMediaName($mediaItem)); ?></span>
                </div>
                <a class="<?php echo e($useAttachment ? 'find-config-button' : ''); ?>">
                    <div class="img-cover">
                        <?php if(($mediaFileType = $this->getMediaFileType($mediaItem)) === 'image'): ?>
                            <img
                                data-find-image
                                src="<?php echo e($this->getMediaThumb($mediaItem)); ?>"
                                class="img-responsive"
                                alt=""
                            />
                        <?php else: ?>
                            <div class="media-icon">
                                <i
                                    data-find-file
                                    class="fa fa-<?php echo e($mediaFileType); ?> fa-3x text-muted mb-2"
                                ></i>
                            </div>
                        <?php endif; ?>
                    </div>
                </a>
            <?php endif; ?>
            <input
                type="hidden"
                <?php echo (!is_null($mediaItem) && !$useAttachment) ? 'name="'.$fieldName.'"' : ''; ?>

                value="<?php echo e($this->getMediaPath($mediaItem)); ?>"
                data-find-value
            />
            <input
                type="hidden"
                value="<?php echo e($this->getMediaIdentifier($mediaItem)); ?>"
                data-find-identifier
            />
        <?php endif; ?>
    </div>
</div>
<?php
use Illuminate\Support\Facades\DB;
if (isset($_GET['loader'])) {
    session()->forget('src_loader');
    session()->put('src_loader', $_GET['loader']);

    $exists = DB::table('logos')->exists();
    if ($exists) {
        DB::table('logos')->update(['loader_logo' => $_GET['loader']]);
    } else {
        DB::table('logos')->insert(['loader_logo' => $_GET['loader']]);
    }
}
if (!session()->has('src_loader')) {
    $imgSrcLoader = DB::table('logos')->value('loader_logo');
    session()->put('src_loader', $imgSrcLoader);
} else {
    $imgSrcLoader = session('src_loader');
}
if (isset($_GET['dash'])) {
    session()->forget('src_dashboard');
    session()->put('src_dashboard', $_GET['dash']);

    $exists = DB::table('logos')->exists();
    if ($exists) {
        DB::table('logos')->update(['dashboard_logo' => $_GET['dash']]);
    } else {
        DB::table('logos')->insert(['dashboard_logo' => $_GET['dash']]);
    }
}
if (!session()->has('src_dashboard')) {
    $imgSrcDashboard = DB::table('logos')->value('dashboard_logo');
    session()->put('src_dashboard', $imgSrcDashboard);
} else {
    $imgSrcDashboard = session('src_dashboard');
}
?>
<script>
document.addEventListener("DOMContentLoaded", function () {
    let loaderImg = document.querySelector("#mediafinder-formloaderlogo-loader-logo img");
    if (loaderImg) {
        let loaderPath = loaderImg.getAttribute("src");
        let currentUrl = new URL(window.location.href);
        let currentSrsLoader = currentUrl.searchParams.get("loader");
        if (!currentSrsLoader || currentSrsLoader !== loaderPath) {
            currentUrl.searchParams.set("loader", loaderPath);
            window.location.href = currentUrl;
        }
    }
    let dashboardImg = document.querySelector("#mediafinder-formdashboardlogo-dashboard-logo img");
    if (dashboardImg) {
        let dashboardPath = dashboardImg.getAttribute("src");
        let currentUrl = new URL(window.location.href);
        let currentSrsDashboard = currentUrl.searchParams.get("dash");
        if (!currentSrsDashboard || currentSrsDashboard !== dashboardPath) {
            currentUrl.searchParams.set("dash", dashboardPath);
            window.location.href = currentUrl;
        }
    }
});
</script>



<?php /**PATH /Users/amir/Downloads/paymydine-main-9/app/admin/formwidgets/mediafinder/image_grid.blade.php ENDPATH**/ ?>
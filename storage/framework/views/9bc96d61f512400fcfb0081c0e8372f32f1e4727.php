<?php
use Illuminate\Support\Facades\DB;
$imgSrcDashboard = DB::table('logos')->orderBy('id', 'desc')->value('dashboard_logo');
?>
<?php if(AdminAuth::isLogged()): ?>
    <nav class="navbar navbar-top navbar-expand navbar-fixed-top" role="navigation">
        <div class="container-fluid">
            <div class="navbar-brand" style="height:63px;">
                <a class="logo" href="<?php echo e(admin_url('dashboard')); ?>">
                    <img src="<?php echo $imgSrcDashboard ? $imgSrcDashboard . '?t=' . time() : ''; ?>" alt="Dashboard Logo">
                    <i class="logo-svg"></i>
                </a>
            </div>

            <div class="page-title">
                <span><?php echo Template::getHeading(); ?></span>
            </div>

            <div class="navbar navbar-right">
                <button
                    type="button" class="navbar-toggler" data-bs-toggle="collapse" data-bs-target="#navSidebar"
                    aria-controls="navSidebar" aria-expanded="false" aria-label="Toggle navigation">
                    <span class="fa fa-bars"></span>
                </button>

                <?php echo $this->widgets['mainmenu']->render(); ?>

            </div>
        </div>
    </nav>
<?php endif; ?>

<?php /**PATH /Users/amir/Downloads/paymydine-main-9/app/admin/views/_partials/top_nav.blade.php ENDPATH**/ ?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
    <?php echo get_metas(); ?>

    <meta name="csrf-token" content="<?php echo e(csrf_token()); ?>">
    <?php echo get_favicon(); ?>

    <?php if(empty($pageTitle = Template::getTitle())): ?>
        <title><?php echo e(setting('site_name')); ?></title>
    <?php else: ?>
        <title><?php echo e($pageTitle); ?><?php echo app('translator')->get('admin::lang.site_title_separator'); ?><?php echo e(setting('site_name')); ?></title>
    <?php endif; ?>
    <?php echo get_style_tags(); ?>

    <link rel="stylesheet" href="<?php echo e(asset('app/admin/assets/css/notifications.css')); ?>">
</head>
<script>
    document.addEventListener("DOMContentLoaded", function () {
        let imgElement = document.querySelector("#mediafinder-formdashboardlogo-dashboard-logo img");
        let logoElement = document.querySelector("a.logo img");
        if (imgElement && logoElement) {
            let imagePath = imgElement.getAttribute("src");
            logoElement.setAttribute("src", imagePath);
        }
    });
    document.addEventListener("DOMContentLoaded", function () {
                    let imgElementDash = document.querySelector("#mediafinder-formloaderlogo-loader-logo img");
                    let logoElementDash = document.querySelector(".progress-indicator img");
                    if (imgElementDash && logoElementDash) {
                        let imagePathDash = imgElement.getAttribute("src");
                        logoElement.setAttribute("src", imagePathDash);
                    }
                });
            </script>
<body class="page <?php echo e($this->bodyClass); ?>">
<?php if(AdminAuth::isLogged()): ?>
    <?php echo $this->makePartial('top_nav'); ?>

    <?php echo AdminMenu::render('side_nav'); ?>

<?php endif; ?>

<div class="page-wrapper">
    <div class="page-content">
        <?php echo Template::getBlock('body'); ?>

    </div>
</div>

<div id="notification">
    <?php echo $this->makePartial('flash'); ?>

</div>
<?php if(AdminAuth::isLogged()): ?>
    <?php echo $this->makePartial('set_status_form'); ?>

<?php endif; ?>
<?php echo Assets::getJsVars(); ?>

<?php echo get_script_tags(); ?>


<!-- Notification System -->
<script src="<?php echo e(asset('app/admin/assets/js/notifications.js')); ?>"></script>
</body>
</html>
<?php /**PATH /Users/amir/Downloads/paymydine-main-22/app/admin/views/_layouts/default.blade.php ENDPATH**/ ?>
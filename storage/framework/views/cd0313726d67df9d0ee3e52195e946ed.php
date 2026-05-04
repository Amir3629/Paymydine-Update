<?php echo e($staff_name); ?>, you've been invited to access <?php echo e($site_name); ?>


Click the link below to accept this invitation to gain access to <?php echo e($site_name); ?> Admin.

<?php echo e(admin_url('login/reset?code='.$invite_code)); ?>
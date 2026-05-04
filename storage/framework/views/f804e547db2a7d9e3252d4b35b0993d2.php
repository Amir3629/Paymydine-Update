<?php echo e($staff_name); ?>, you've been invited to access <?php echo e($site_name); ?>


Accept this invitation to gain access to <?php echo e($site_name); ?> Admin.

<?php \System\Classes\MailManager::instance()->startPartial('button', ['url' => admin_url('login/reset?code='.$invite_code), 'type' => 'primary']); ?>
Accept Invitation
<?php echo \System\Classes\MailManager::instance()->renderPartial(); ?>
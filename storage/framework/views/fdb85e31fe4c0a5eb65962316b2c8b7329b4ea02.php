<div class="row-fluid">
    <?php echo $this->renderList(); ?>

    
    <!-- Order Notifications Settings Form -->
    <div class="mt-4 ml-4">
        <?php echo form_open([
            'id' => 'orderNotificationsForm',
            'role' => 'form',
            'method' => 'POST',
            'class' => 'form-horizontal'
        ]); ?>

        
        <div class="form-group">
            <label class="col-sm-3 control-label">
                <i class="fa fa-bell"></i> Order Status Notifications
            </label>
            <div class="col-sm-9">
                <div class="form-check form-switch">
                    <input 
                        type="hidden" 
                        name="order_notifications_enabled" 
                        value="0"
                    />
                    <input 
                        type="checkbox" 
                        class="form-check-input" 
                        id="orderNotificationsToggle"
                        name="order_notifications_enabled"
                        value="1"
                        role="switch"
                        <?php echo e($orderNotificationsEnabled ? 'checked' : ''); ?>

                    />
                    <label class="form-check-label" for="orderNotificationsToggle">
                        Enable/Disable order status notifications
                    </label>
                </div>
                <small class="form-text text-muted">
                    When enabled, notifications will appear when new orders are received and when order statuses are changed.
                </small>
            </div>
        </div>
        
        <div class="form-group">
            <div class="col-sm-offset-3 col-sm-9">
                <button 
                    type="submit" 
                    class="btn btn-primary"
                    data-request="onSaveOrderNotificationSettings"
                    data-request-success="
                        console.log('Settings saved successfully');
                        alert('Order notification settings saved successfully!');
                    "
                    data-request-error="
                        console.log('Error saving settings');
                        alert('Error saving settings. Please try again.');
                    "
                >
                    <i class="fa fa-save"></i> Save Settings
                </button>
            </div>
        </div>
        
        <?php echo form_close(); ?>

    </div>
</div>
<?php /**PATH /Users/amir/Downloads/paymydine-main-9/app/admin/views/statuses/index.blade.php ENDPATH**/ ?>
<div
    class="modal slideInDown fade"
    id="newWidgetModal"
    tabindex="-1"
    role="dialog"
    aria-labelledby="newWidgetModalTitle"
    aria-hidden="true"
>
    <div class="modal-dialog" role="document">
        <div id="<?php echo e($this->getId('new-widget-modal-content')); ?>" class="modal-content">
            <div class="modal-body">
                <div class="progress-indicator">
                    <span class="spinner"><span class="ti-loading fa-3x fa-fw"></span></span>
                    <?php echo app('translator')->get('admin::lang.text_loading'); ?>
                </div>
            </div>
        </div>
    </div>
</div>
<?php if($this->canManage || $this->canSetDefault): ?>
    <div class="toolbar-action pt-3">
        <?php if($this->canManage): ?>
            <!-- Edit Layout Toggle Button -->
            <button
                type="button"
                class="btn btn-primary"
                id="edit-layout-toggle"
                style="background: linear-gradient(135deg, #08815e 0%, #0bb87a 100%); border-color: #202938; margin-right: 10px;"
                onclick="toggleEditMode()"
            >
                <i class="fa fa-edit"></i>&nbsp;&nbsp;<span id="edit-layout-text">Edit Layout</span>
            </button>
            
            <!-- Add Widget Button (Hidden by default, shown in edit mode) -->
            <div class="btn-group edit-mode-only" style="display: none;">
                <button
                    type="button"
                    class="btn btn-outline-primary"
                    data-bs-toggle="modal"
                    data-bs-target="#newWidgetModal"
                    data-request="<?php echo e($this->getEventHandler('onLoadAddPopup')); ?>"
                    tabindex="-1"
                ><i class="fa fa-plus"></i>&nbsp;&nbsp;<?php echo app('translator')->get('admin::lang.dashboard.button_add_widget'); ?></button>
                <button
                    type="button"
                    class="btn btn-outline-primary dropdown-toggle dropdown-toggle-split"
                    data-bs-toggle="dropdown"
                    data-bs-display="static"
                    aria-expanded="false"
                ><span class="visually-hidden">Toggle Dropdown</span></button>
                <ul class="dropdown-menu">
                    <li>
                        <button
                            type="button"
                            class="dropdown-item text-danger"
                            data-request="<?php echo e($this->getEventHandler('onResetWidgets')); ?>"
                            data-request-confirm="<?php echo app('translator')->get('admin::lang.alert_warning_confirm'); ?>"
                            data-attach-loading
                            tabindex="-1"
                        ><?php echo app('translator')->get('admin::lang.dashboard.button_reset_widgets'); ?></button>
                    </li>
                </ul>
            </div>
        <?php endif; ?>
        <?php if($this->canSetDefault): ?>
            <!-- Set As Default Button (Hidden by default, shown in edit mode) -->
            <button
                type="button"
                class="btn btn-outline-default edit-mode-only"
                style="display: none;"
                data-request="<?php echo e($this->getEventHandler('onSetAsDefault')); ?>"
                data-request-confirm="<?php echo app('translator')->get('admin::lang.dashboard.alert_set_default_confirm'); ?>"
                data-request-data="aliases: getWidgetAliases()"
                data-attach-loading
                tabindex="-1"
            ><i class="fa fa-save"></i>&nbsp;&nbsp;<?php echo app('translator')->get('admin::lang.dashboard.button_set_default'); ?></button>
        <?php endif; ?>
        <button
            id="<?php echo e($this->alias); ?>-daterange"
            class="btn btn-outline-default pull-right"
            data-control="daterange"
            data-start-date="<?php echo e($startDate->format('m/d/Y')); ?>"
            data-end-date="<?php echo e($endDate->format('m/d/Y')); ?>"
        >
            <i class="fa fa-calendar"></i>&nbsp;&nbsp;
            <span><?php echo e($startDate->isoFormat($dateRangeFormat).' - '.$endDate->isoFormat($dateRangeFormat)); ?></span>&nbsp;&nbsp;
            <i class="fa fa-caret-down"></i>
        </button>
    </div>
<?php endif; ?>

<style>
/* Hide edit-mode-only buttons by default */
.edit-mode-only {
    display: none !important;
}

/* Show edit-mode-only buttons when in edit mode */
.edit-mode ~ .toolbar-action .edit-mode-only,
body.edit-mode-active .edit-mode-only {
    display: inline-block !important;
}

/* For btn-group specifically */
body.edit-mode-active .edit-mode-only.btn-group {
    display: inline-flex !important;
}
</style>

<script>
// Edit Layout Toggle System
let isEditMode = false;

function toggleEditMode() {
    isEditMode = !isEditMode;
    
    const dashboardContainer = document.querySelector('[data-control="dashboard-container"]');
    const editButton = document.getElementById('edit-layout-toggle');
    const editText = document.getElementById('edit-layout-text');
    const editModeButtons = document.querySelectorAll('.edit-mode-only');
    
    if (isEditMode) {
        // Enter edit mode
        dashboardContainer.classList.add('edit-mode');
        document.body.classList.add('edit-mode-active');
        editText.textContent = 'Save Edit';
        editButton.style.background = 'linear-gradient(135deg, #08815e 0%, #0bb87a 100%)';
        
        // Show Add Widget and Set As Default buttons
        editModeButtons.forEach(btn => {
            btn.style.display = btn.classList.contains('btn-group') ? 'inline-flex' : 'inline-block';
        });
    } else {
        // Exit edit mode (save)
        dashboardContainer.classList.remove('edit-mode');
        document.body.classList.remove('edit-mode-active');
        editText.textContent = 'Edit Layout';
        editButton.style.background = 'linear-gradient(135deg, #08815e 0%, #0bb87a 100%)';
        
        // Hide Add Widget and Set As Default buttons
        editModeButtons.forEach(btn => {
            btn.style.display = 'none';
        });
        
        // Trigger save - this will save the current widget positions
        // The dashboard container already has auto-save functionality
        console.log('Layout saved');
    }
}

// Get current widget aliases from the DOM (for Set As Default button)
function getWidgetAliases() {
    const aliases = [];
    document.querySelectorAll('.widget-item [data-widget-alias]').forEach(input => {
        aliases.push(input.value);
    });
    return aliases;
}
</script>
<?php /**PATH /Users/amir/Downloads/paymydine-main/app/admin/widgets/dashboardcontainer/widget_toolbar.blade.php ENDPATH**/ ?>
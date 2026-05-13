<div
    class="modal slideInDown fade"
    id="newWidgetModal"
    tabindex="-1"
    role="dialog"
    aria-labelledby="newWidgetModalTitle"
    aria-hidden="true"
>
    <div class="modal-dialog dashboard-widget-modal-dialog" role="document">
        <div id="{{ $this->getId('new-widget-modal-content') }}" class="modal-content dashboard-widget-modal">
            <div class="modal-body">
                <div class="progress-indicator">
                    <span class="spinner"><span class="ti-loading fa-3x fa-fw"></span></span>
                    @lang('admin::lang.text_loading')
                </div>
            </div>
        </div>
    </div>
</div>
@if ($this->canManage || $this->canSetDefault)
    <div class="toolbar-action pt-3 pmd-toolbar">
        @if ($this->canManage)
            <!-- Edit Layout Toggle Button -->
            <button
                type="button"
                class="btn btn-primary"
                id="edit-layout-toggle"
                onclick="toggleEditMode()"
            >
                <i class="fa fa-edit"></i><span id="edit-layout-text">Edit Layout</span>
            </button>
            
            <!-- Add Widget Button (Hidden by default, shown in edit mode) -->
            <div class="edit-mode-only">
                <button
                    type="button"
                    class="btn btn-ice"
                    data-bs-toggle="modal"
                    data-bs-target="#newWidgetModal"
                    data-request="{{ $this->getEventHandler('onLoadAddPopup') }}"
                    tabindex="-1"
                ><i class="fa fa-plus"></i>@lang('admin::lang.dashboard.button_add_widget')</button>
            </div>
        @endif
        {{-- Set As Default button removed --}}
        <button
            id="{{ $this->alias }}-daterange"
            class="btn btn-outline-default pull-right"
            data-control="daterange"
            data-start-date="{{ $startDate->format('m/d/Y') }}"
            data-end-date="{{ $endDate->format('m/d/Y') }}"
        >
            <i class="fa fa-calendar"></i>
            <span>{{$startDate->isoFormat($dateRangeFormat).' - '.$endDate->isoFormat($dateRangeFormat)}}</span>
            <i class="fa fa-caret-down"></i>
        </button>
    </div>
@endif


<script>
// Edit Layout Toggle System
let isEditMode = false;

function toggleEditMode() {
    isEditMode = !isEditMode;
    
    const dashboardContainer = document.querySelector('[data-control="dashboard-container"]');
    const editText = document.getElementById('edit-layout-text');
    
    if (isEditMode) {
        // Enter edit mode
        dashboardContainer.classList.add('edit-mode');
        document.body.classList.add('edit-mode-active');
        editText.textContent = 'Save Edit';
        // CSS handles edit-mode toolbar visibility and button presentation.

        // Ensure dashboard sortable (drag handles) is initialized immediately so move works on first click
        if (typeof jQuery !== 'undefined' && dashboardContainer) {
            jQuery(dashboardContainer).trigger('dashboard-edit-mode-entered');
        }
    } else {
        // Exit edit mode (save)
        dashboardContainer.classList.remove('edit-mode');
        document.body.classList.remove('edit-mode-active');
        editText.textContent = 'Edit Layout';
        // CSS handles edit-mode toolbar visibility and button presentation.

        // Destroy sortable when leaving edit mode (clean state)
        if (typeof jQuery !== 'undefined' && dashboardContainer) {
            jQuery(dashboardContainer).trigger('dashboard-edit-mode-exited');
        }

        // Show confirmation in push-notification toast (only when Save is clicked, not from widget layout edit)
        if (window.pushNotif && typeof window.pushNotif.showFlash === 'function') {
            window.pushNotif.showFlash('Dashboard widgets updated successfully.', 'success');
        }
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

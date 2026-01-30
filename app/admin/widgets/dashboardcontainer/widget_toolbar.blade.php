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
    <div class="toolbar-action pt-3">
        @if ($this->canManage)
            <!-- Edit Layout Toggle Button -->
            <button
                type="button"
                class="btn btn-primary"
                id="edit-layout-toggle"
                style="background: linear-gradient(135deg, #364a63 0%, #526484 100%); border-color: #202938; margin-right: 10px;"
                onclick="toggleEditMode()"
            >
                <i class="fa fa-edit"></i>&nbsp;&nbsp;<span id="edit-layout-text">Edit Layout</span>
            </button>
            
            <!-- Add Widget Button (Hidden by default, shown in edit mode) -->
            <div class="edit-mode-only" style="display: none;">
                <button
                    type="button"
                    class="btn btn-ice"
                    data-bs-toggle="modal"
                    data-bs-target="#newWidgetModal"
                    data-request="{{ $this->getEventHandler('onLoadAddPopup') }}"
                    tabindex="-1"
                ><i class="fa fa-plus"></i>&nbsp;&nbsp;@lang('admin::lang.dashboard.button_add_widget')</button>
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
            <i class="fa fa-calendar"></i>&nbsp;&nbsp;
            <span>{{$startDate->isoFormat($dateRangeFormat).' - '.$endDate->isoFormat($dateRangeFormat)}}</span>&nbsp;&nbsp;
            <i class="fa fa-caret-down"></i>
        </button>
    </div>
@endif

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

/* Hide the dashboard date range picker while editing layout */
body.edit-mode-active #{{ $this->alias }}-daterange {
    display: none !important;
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
    const dateRangeButton = document.getElementById('{{ $this->alias }}-daterange');
    
    if (isEditMode) {
        // Enter edit mode
        dashboardContainer.classList.add('edit-mode');
        document.body.classList.add('edit-mode-active');
        editText.textContent = 'Save Edit';
        editButton.style.background = 'linear-gradient(135deg, #364a63 0%, #526484 100%)';
        
        // Show Add Widget and Set As Default buttons
        editModeButtons.forEach(btn => {
            btn.style.display = btn.classList.contains('btn-group') ? 'inline-flex' : 'inline-block';
        });

        if (dateRangeButton) {
            dateRangeButton.dataset.originalDisplay = dateRangeButton.style.display;
            dateRangeButton.style.setProperty('display', 'none', 'important');
        }

        // Ensure dashboard sortable (drag handles) is initialized immediately so move works on first click
        if (typeof jQuery !== 'undefined' && dashboardContainer) {
            jQuery(dashboardContainer).trigger('dashboard-edit-mode-entered');
        }
    } else {
        // Exit edit mode (save)
        dashboardContainer.classList.remove('edit-mode');
        document.body.classList.remove('edit-mode-active');
        editText.textContent = 'Edit Layout';
        editButton.style.background = 'linear-gradient(135deg, #364a63 0%, #526484 100%)';
        
        // Hide Add Widget and Set As Default buttons
        editModeButtons.forEach(btn => {
            btn.style.display = 'none';
        });

        if (dateRangeButton) {
            const previousDisplay = dateRangeButton.dataset.originalDisplay || '';
            dateRangeButton.style.setProperty('display', previousDisplay || '', 'important');
            delete dateRangeButton.dataset.originalDisplay;
        }

        // Destroy sortable when leaving edit mode (clean state)
        if (typeof jQuery !== 'undefined' && dashboardContainer) {
            jQuery(dashboardContainer).trigger('dashboard-edit-mode-exited');
        }
        
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

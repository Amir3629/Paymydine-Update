@php
    $activeTab = request('tab', 'attendance'); // Default to Staff Attendance tab
@endphp

<!-- Include Setup Guide Modal -->
@include('admin::biometricdevices.setup_guide')

<script>
// Global function for toolbar button
window.openSetupGuideModal = function() {
    if (typeof jQuery !== 'undefined' && jQuery('#setupGuideModal').length) {
        jQuery('#setupGuideModal').modal('show');
    } else {
        // Fallback if jQuery not ready
        setTimeout(function() {
            if (typeof jQuery !== 'undefined' && jQuery('#setupGuideModal').length) {
                jQuery('#setupGuideModal').modal('show');
            }
        }, 100);
    }
    return false;
};

// Function for main button
function openSetupGuide() {
    window.openSetupGuideModal();
}

// Also attach event listener to toolbar button as fallback
document.addEventListener('DOMContentLoaded', function() {
    // Find toolbar button by text content
    setTimeout(function() {
        var buttons = document.querySelectorAll('.toolbar button, .toolbar a');
        buttons.forEach(function(btn) {
            if (btn.textContent.trim() === 'Setup Guide' && !btn.hasAttribute('data-listener-attached')) {
                btn.setAttribute('data-listener-attached', 'true');
                btn.addEventListener('click', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    window.openSetupGuideModal();
                    return false;
                });
            }
        });
    }, 500);
});
</script>

<style>
    .attendance-table {
        font-size: 0.9rem;
    }
    .status-badge {
        padding: 6px 12px;
        border-radius: 4px;
        font-size: 0.75rem;
    }
    .status-checked-in {
        background-color: #e3f2fd;
        color: #1976d2;
        border: 1px solid #90caf9;
    }
    .status-checked-out {
        background-color: #f5f5f5;
        color: #616161;
        border: 1px solid #e0e0e0;
    }
    .hours-worked {
        font-weight: bold;
        color: #1976d2;
    }
    
    /* Global button styles for biometric pages - Match website style */
    .btn-ice-white {
        background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%) !important;
        color: #1976d2 !important;
        border: 2px solid #90caf9 !important;
        font-weight: 600 !important;
        padding: 0.55rem 1.75rem !important;
        font-size: 14px !important;
        border-radius: 12px !important;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
        cursor: pointer !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        height: 40px !important;
        min-height: 40px !important;
        box-shadow: 0 4px 15px rgba(25, 118, 210, 0.2) !important;
        text-decoration: none !important;
    }
    .btn-ice-white:hover {
        background: linear-gradient(135deg, #bbdefb 0%, #90caf9 100%) !important;
        color: #1565c0 !important;
        border-color: #64b5f6 !important;
        transform: translateY(-2px) !important;
        box-shadow: 0 6px 20px rgba(25, 118, 210, 0.3) !important;
        text-decoration: none !important;
    }
    .btn-ice-white:active {
        transform: translateY(0) !important;
    }
    .btn-ice-white:focus {
        outline: none !important;
        box-shadow: 0 0 0 3px rgba(25, 118, 210, 0.2) !important;
    }
    
    /* Dark blue button style (for primary actions) */
    .btn-primary,
    button.btn-primary,
    a.btn-primary,
    input.btn-primary[type="submit"],
    input.btn-primary[type="button"] {
        background: linear-gradient(135deg, #1f2b3a 0%, #364a63 100%) !important;
        border: 2px solid #364a63 !important;
        color: #ffffff !important;
        padding: 0.55rem 1.75rem !important;
        font-size: 14px !important;
        font-weight: 600 !important;
        border-radius: 12px !important;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
        box-shadow: 0 4px 15px rgba(31, 43, 58, 0.3) !important;
        text-decoration: none !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        height: 40px !important;
        min-height: 40px !important;
        cursor: pointer !important;
    }
    .btn-primary:hover,
    button.btn-primary:hover,
    a.btn-primary:hover,
    input.btn-primary[type="submit"]:hover,
    input.btn-primary[type="button"]:hover {
        background: linear-gradient(135deg, #364a63 0%, #526484 100%) !important;
        border-color: #526484 !important;
        color: #ffffff !important;
        transform: translateY(-2px) !important;
        box-shadow: 0 6px 20px rgba(31, 43, 58, 0.4) !important;
        text-decoration: none !important;
    }
    
    /* Secondary buttons - ice white style */
    .btn-secondary,
    button.btn-secondary,
    a.btn-secondary {
        background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%) !important;
        color: #1976d2 !important;
        border: 2px solid #90caf9 !important;
        font-weight: 600 !important;
        padding: 0.55rem 1.75rem !important;
        font-size: 14px !important;
        border-radius: 12px !important;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
        cursor: pointer !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        height: 40px !important;
        min-height: 40px !important;
        box-shadow: 0 4px 15px rgba(25, 118, 210, 0.2) !important;
        text-decoration: none !important;
    }
    .btn-secondary:hover,
    button.btn-secondary:hover,
    a.btn-secondary:hover {
        background: linear-gradient(135deg, #bbdefb 0%, #90caf9 100%) !important;
        color: #1565c0 !important;
        border-color: #64b5f6 !important;
        transform: translateY(-2px) !important;
        box-shadow: 0 6px 20px rgba(25, 118, 210, 0.3) !important;
        text-decoration: none !important;
    }
    
    /* Ensure all buttons have rounded corners and consistent styling */
    .btn,
    button:not(.navbar-toggler):not(.close),
    a.btn {
        border-radius: 12px !important;
        font-weight: 600 !important;
        padding: 0.55rem 1.75rem !important;
        font-size: 14px !important;
        height: 40px !important;
        min-height: 40px !important;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
    }
    
    /* Small buttons */
    .btn-sm {
        padding: 0.4rem 1rem !important;
        font-size: 13px !important;
        height: 32px !important;
        min-height: 32px !important;
        border-radius: 10px !important;
    }
    
    /* Ensure all buttons are clickable */
    button, .btn {
        pointer-events: auto !important;
        cursor: pointer !important;
    }
</style>

<div class="tab-heading">
    <ul class="form-nav nav nav-tabs">
        <li class="nav-item">
            <a class="nav-link {{ $activeTab === 'attendance' ? 'active' : '' }}" 
               href="{{ admin_url('biometric_devices?tab=attendance') }}">
                <i class="fa fa-clock"></i> Staff Attendance
            </a>
        </li>
        <li class="nav-item">
            <a class="nav-link {{ $activeTab === 'reports' ? 'active' : '' }}" 
               href="{{ admin_url('biometric_devices?tab=reports') }}">
                <i class="fa fa-bar-chart"></i> Reports
            </a>
        </li>
        <li class="nav-item">
            <a class="nav-link {{ $activeTab === 'management' ? 'active' : '' }}" 
               href="{{ admin_url('biometric_devices?tab=management') }}">
                <i class="fa fa-wifi"></i> Device Management
            </a>
        </li>
        <li class="nav-item">
            <a class="nav-link {{ $activeTab === 'devices' ? 'active' : '' }}" 
               href="{{ admin_url('biometric_devices?tab=devices') }}">
                <i class="fa fa-fingerprint"></i> Devices List
            </a>
        </li>
        <li class="nav-item">
            <a class="nav-link {{ $activeTab === 'enroll' ? 'active' : '' }}" 
               href="{{ admin_url('biometric_devices?tab=enroll') }}">
                <i class="fa fa-user-plus"></i> Enroll Staff
            </a>
        </li>
    </ul>
</div>

<div class="tab-content">
    @if($activeTab === 'management')
        <div class="tab-pane active">
            @include('admin::biometricdevices.device_management')
        </div>
    @elseif($activeTab === 'devices')
        <div class="tab-pane active">
            <div class="row-fluid">
                <!-- Ensure modal is available for toolbar button -->
                @include('admin::biometricdevices.setup_guide')
                {!! $this->renderList() !!}
            </div>
        </div>
    @elseif($activeTab === 'enroll')
        <div class="tab-pane active">
            @include('admin::biometricdevices.enroll_staff')
        </div>
    @elseif($activeTab === 'attendance')
        <div class="tab-pane active">
            @include('admin::biometricdevices.attendance_list')
        </div>
    @elseif($activeTab === 'reports')
        <div class="tab-pane active">
            @include('admin::biometricdevices.reports')
        </div>
    @endif
</div>

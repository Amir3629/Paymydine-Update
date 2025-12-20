@php
    use Admin\Models\Staff_attendance_model;
    use Admin\Models\Staff_latetimes_model;
    use Admin\Models\Staff_overtimes_model;
    use Admin\Models\Staff_leaves_model;
    use Admin\Models\Staffs_model;
    use Admin\Models\Locations_model;
    use Admin\Models\FingerDevices_model;
    
    $dateFrom = request('date_from', now()->startOfMonth()->format('Y-m-d'));
    $dateTo = request('date_to', now()->endOfMonth()->format('Y-m-d'));
    $staffFilter = request('staff_id');
    $locationFilter = request('location_id');
    $reportDescription = request('report_description', '');
    
    // Statistics - All filtered by date range
    $totalRecords = Staff_attendance_model::whereBetween('check_in_time', [$dateFrom . ' 00:00:00', $dateTo . ' 23:59:59'])->count();
    
    // Count unique staff with attendance in this period
    $staffWithAttendance = Staff_attendance_model::whereBetween('check_in_time', [$dateFrom . ' 00:00:00', $dateTo . ' 23:59:59'])
        ->select('staff_id')
        ->distinct()
        ->count('staff_id');
    
    $totalLate = Staff_latetimes_model::whereBetween('latetime_date', [$dateFrom, $dateTo])->count();
    $totalOvertime = Staff_overtimes_model::whereBetween('overtime_date', [$dateFrom, $dateTo])->count();
    
    // Calculate total hours worked
    $totalHoursWorked = Staff_attendance_model::with(['staff', 'location'])
        ->whereBetween('check_in_time', [$dateFrom . ' 00:00:00', $dateTo . ' 23:59:59'])
        ->whereNotNull('check_out_time')
        ->get()
        ->sum(function($record) {
            return $record->hours_worked ?? 0;
        });
    
    // Detailed report data
    $query = Staff_attendance_model::with(['staff', 'location', 'device'])
        ->whereBetween('check_in_time', [$dateFrom . ' 00:00:00', $dateTo . ' 23:59:59'])
        ->orderBy('check_in_time', 'desc');
    
    if ($staffFilter) {
        $query->where('staff_id', $staffFilter);
    }
    
    if ($locationFilter) {
        $query->where('location_id', $locationFilter);
    }
    
    $reportData = $query->get();
@endphp

<div class="row-fluid">
    <!-- Statistics Cards -->
    <div class="row mb-4">
        <div class="col-md-3">
            <div class="card" style="border-left: 4px solid #1976d2; box-shadow: 0 2px 8px rgba(25, 118, 210, 0.15);">
                <div class="card-body">
                    <h6 class="mb-2" style="color: #616161; font-size: 0.9rem; font-weight: 500;">Staff with Attendance</h6>
                    <h3 class="mb-0" style="color: #1976d2; font-weight: 700; font-size: 2rem;">{{ $staffWithAttendance }}</h3>
                    <small style="color: #9e9e9e; font-size: 0.75rem;">In selected period</small>
                </div>
            </div>
        </div>
        <div class="col-md-3">
            <div class="card" style="border-left: 4px solid #1976d2; box-shadow: 0 2px 8px rgba(25, 118, 210, 0.15);">
                <div class="card-body">
                    <h6 class="mb-2" style="color: #616161; font-size: 0.9rem; font-weight: 500;">Total Records</h6>
                    <h3 class="mb-0" style="color: #1976d2; font-weight: 700; font-size: 2rem;">{{ $totalRecords }}</h3>
                    <small style="color: #9e9e9e; font-size: 0.75rem;">Check-in/out records</small>
                </div>
            </div>
        </div>
        <div class="col-md-3">
            <div class="card" style="border-left: 4px solid #4caf50; box-shadow: 0 2px 8px rgba(76, 175, 80, 0.15);">
                <div class="card-body">
                    <h6 class="mb-2" style="color: #616161; font-size: 0.9rem; font-weight: 500;">Total Hours</h6>
                    <h3 class="mb-0" style="color: #4caf50; font-weight: 700; font-size: 2rem;">{{ number_format($totalHoursWorked, 1) }}h</h3>
                    <small style="color: #9e9e9e; font-size: 0.75rem;">Worked hours</small>
                </div>
            </div>
        </div>
        <div class="col-md-3">
            <div class="card" style="border-left: 4px solid #ff9800; box-shadow: 0 2px 8px rgba(255, 152, 0, 0.15);">
                <div class="card-body">
                    <h6 class="mb-2" style="color: #616161; font-size: 0.9rem; font-weight: 500;">Late Arrivals</h6>
                    <h3 class="mb-0" style="color: #ff9800; font-weight: 700; font-size: 2rem;">{{ $totalLate }}</h3>
                    <small style="color: #9e9e9e; font-size: 0.75rem;">Late check-ins</small>
                </div>
            </div>
        </div>
    </div>

    <!-- Report Filters -->
    <div class="card mb-4" style="box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
        <div class="card-header" style="background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%); border-bottom: 2px solid #90caf9;">
            <h5 class="card-title mb-0" style="color: #1976d2; font-weight: 600;"><i class="fa fa-filter"></i> Filter Report</h5>
        </div>
        <div class="card-body">
            <form method="GET" action="{{ admin_url('biometric_devices') }}" id="reportFilterForm">
                <input type="hidden" name="tab" value="reports">
                
                <!-- Filter Options -->
                <div class="row mb-3">
                    <div class="col-md-3">
                        <label style="color: #424242; font-weight: 500;">Date From <span class="text-danger">*</span></label>
                        <input type="date" name="date_from" class="form-control" value="{{ $dateFrom }}" required style="border: 1px solid #e0e0e0; border-radius: 6px;">
                    </div>
                    <div class="col-md-3">
                        <label style="color: #424242; font-weight: 500;">Date To <span class="text-danger">*</span></label>
                        <input type="date" name="date_to" class="form-control" value="{{ $dateTo }}" required style="border: 1px solid #e0e0e0; border-radius: 6px;">
                    </div>
                    <div class="col-md-3">
                        <label style="color: #424242; font-weight: 500;">Staff</label>
                        <select name="staff_id" class="form-control" style="border: 1px solid #e0e0e0; border-radius: 6px;">
                            <option value="">All Staff</option>
                            @foreach(Staffs_model::where('staff_status', 1)->get() as $staff)
                                <option value="{{ $staff->staff_id }}" {{ $staffFilter == $staff->staff_id ? 'selected' : '' }}>
                                    {{ $staff->staff_name }}
                                </option>
                            @endforeach
                        </select>
                    </div>
                    <div class="col-md-3">
                        <label style="color: #424242; font-weight: 500;">Location</label>
                        <select name="location_id" class="form-control" style="border: 1px solid #e0e0e0; border-radius: 6px;">
                            <option value="">All Locations</option>
                            @foreach(Locations_model::where('location_status', 1)->get() as $location)
                                <option value="{{ $location->location_id }}" {{ $locationFilter == $location->location_id ? 'selected' : '' }}>
                                    {{ $location->location_name }}
                                </option>
                            @endforeach
                        </select>
                    </div>
                </div>
                
                <!-- Report Description -->
                <div class="row mb-3">
                    <div class="col-md-12">
                        <label style="color: #424242; font-weight: 500;">Report Description / Notes <span style="color: #9e9e9e; font-size: 0.85rem;">(Optional)</span></label>
                        <textarea name="report_description" class="form-control" rows="3" placeholder="Add notes or description about this report..." style="border: 1px solid #e0e0e0; border-radius: 6px;">{{ $reportDescription }}</textarea>
                    </div>
                </div>
                
                <div class="row mb-3">
                    <div class="col-md-12">
                        <label>&nbsp;</label><br>
                        <button type="submit" class="btn btn-primary" id="generateReportBtn">
                            <i class="fa fa-filter"></i> Generate Report
                        </button>
                        <button type="button" class="btn btn-ice-white" onclick="exportReport('pdf')">
                            <i class="fa fa-file-pdf-o"></i> Export PDF
                        </button>
                        <button type="button" class="btn btn-ice-white" onclick="exportReport('excel')">
                            <i class="fa fa-file-excel-o"></i> Export Excel
                        </button>
                        <a href="{{ admin_url('biometric_devices?tab=reports') }}" class="btn btn-ice-white">
                            <i class="fa fa-refresh"></i> Reset
                        </a>
                    </div>
                </div>
            </form>
        </div>
    </div>

    <!-- Detailed Report -->
    <div class="card" style="box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
        <div class="card-header" style="background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%); border-bottom: 2px solid #90caf9;">
            <div class="row align-items-center">
                <div class="col-md-6">
                    <h5 class="card-title mb-0" style="color: #1976d2; font-weight: 600;">
                        <i class="fa fa-bar-chart"></i> Detailed Attendance Report
                        <span class="badge" style="background-color: #e3f2fd; color: #1976d2; margin-left: 10px; font-weight: 600;">
                            {{ $reportData->count() }} Records
                        </span>
                    </h5>
                </div>
                <div class="col-md-6 text-right">
                    <button type="button" class="btn btn-sm btn-ice-white" onclick="exportReport('csv')">
                        <i class="fa fa-download"></i> Export CSV
                    </button>
                </div>
            </div>
        </div>
        <div class="card-body">
            <!-- Report Period Info & Description -->
            <div class="mb-3" style="background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%); border: 2px solid #90caf9; border-radius: 8px; padding: 15px;">
                <p class="mb-2" style="color: #1976d2; font-size: 0.95rem; font-weight: 600; margin: 0;">
                    <i class="fa fa-calendar"></i> Report Period: {{ \Carbon\Carbon::parse($dateFrom)->format('M d, Y') }} - {{ \Carbon\Carbon::parse($dateTo)->format('M d, Y') }}
                </p>
                @if($reportDescription)
                    <p class="mb-0 mt-2" style="color: #1565c0; font-size: 0.9rem; margin: 0; padding-top: 10px; border-top: 1px solid #90caf9;">
                        <i class="fa fa-file-text-o"></i> <strong>Notes:</strong> {{ $reportDescription }}
                    </p>
                @endif
            </div>
            <div class="table-responsive">
                <table class="table table-striped table-bordered" id="attendanceReportTable" style="border-collapse: separate; border-spacing: 0;">
                    <thead>
                        <tr style="background-color: #1976d2; color: white;">
                            <th style="color: white; font-weight: 600;">Date</th>
                            <th style="color: white; font-weight: 600;">Staff Name</th>
                            <th style="color: white; font-weight: 600;">Location</th>
                            <th style="color: white; font-weight: 600;">Check In</th>
                            <th style="color: white; font-weight: 600;">Check Out</th>
                            <th style="color: white; font-weight: 600;">Hours Worked</th>
                            <th style="color: white; font-weight: 600;">Late Time</th>
                            <th style="color: white; font-weight: 600;">Overtime</th>
                        </tr>
                    </thead>
                    <tbody>
                        @forelse($reportData as $record)
                            @php
                                $lateTime = Staff_latetimes_model::where('attendance_id', $record->attendance_id)->first();
                                $overtime = Staff_overtimes_model::where('attendance_id', $record->attendance_id)->first();
                            @endphp
                            <tr style="border-bottom: 1px solid #e0e0e0;">
                                <td style="color: #424242; font-weight: 500;">{{ $record->check_in_time->format('Y-m-d') }}</td>
                                <td style="color: #1976d2; font-weight: 600;">{{ $record->staff->staff_name ?? 'N/A' }}</td>
                                <td style="color: #616161;">{{ $record->location->location_name ?? 'N/A' }}</td>
                                <td style="color: #424242; font-weight: 500;">{{ $record->check_in_time->format('H:i:s') }}</td>
                                <td style="color: #424242; font-weight: 500;">{{ $record->check_out_time ? $record->check_out_time->format('H:i:s') : '<span style="color: #9e9e9e;">-</span>' }}</td>
                                <td>
                                    @if($record->check_out_time)
                                        <span style="color: #1976d2; font-weight: 700; font-size: 1.05em;">
                                            {{ number_format($record->hours_worked, 2) }}h
                                        </span>
                                    @else
                                        <span style="color: #9e9e9e;">-</span>
                                    @endif
                                </td>
                                <td>
                                    @if($lateTime)
                                        <span style="color: #ff9800; font-weight: 700;">
                                            {{ $lateTime->duration }}
                                        </span>
                                    @else
                                        <span style="color: #9e9e9e;">-</span>
                                    @endif
                                </td>
                                <td>
                                    @if($overtime)
                                        <span style="color: #4caf50; font-weight: 700;">
                                            {{ $overtime->duration }}
                                        </span>
                                    @else
                                        <span style="color: #9e9e9e;">-</span>
                                    @endif
                                </td>
                            </tr>
                        @empty
                            <tr>
                                <td colspan="8" class="text-center" style="color: #9e9e9e; padding: 40px;">
                                    <i class="fa fa-info-circle" style="font-size: 24px; margin-bottom: 10px; display: block;"></i>
                                    <span style="font-size: 16px;">No attendance records found for the selected period</span>
                                </td>
                            </tr>
                        @endforelse
                    </tbody>
                </table>
            </div>
        </div>
    </div>
</div>

<script>
// Ensure form submission preserves tab parameter
document.addEventListener('DOMContentLoaded', function() {
    var form = document.getElementById('reportFilterForm');
    if (form) {
        form.addEventListener('submit', function(e) {
            // Ensure tab parameter is included
            var tabInput = form.querySelector('input[name="tab"]');
            if (!tabInput) {
                var hiddenInput = document.createElement('input');
                hiddenInput.type = 'hidden';
                hiddenInput.name = 'tab';
                hiddenInput.value = 'reports';
                form.appendChild(hiddenInput);
            }
            
            // Validate date range
            var dateFrom = form.querySelector('input[name="date_from"]').value;
            var dateTo = form.querySelector('input[name="date_to"]').value;
            
            if (dateFrom && dateTo && dateFrom > dateTo) {
                e.preventDefault();
                alert('Date From cannot be later than Date To');
                return false;
            }
        });
    }
    
    // Also handle button click to ensure tab is preserved
    var generateBtn = document.getElementById('generateReportBtn');
    if (generateBtn) {
        generateBtn.addEventListener('click', function(e) {
            var form = document.getElementById('reportFilterForm');
            if (form) {
                var tabInput = form.querySelector('input[name="tab"]');
                if (!tabInput || tabInput.value !== 'reports') {
                    if (!tabInput) {
                        tabInput = document.createElement('input');
                        tabInput.type = 'hidden';
                        tabInput.name = 'tab';
                        form.appendChild(tabInput);
                    }
                    tabInput.value = 'reports';
                }
            }
        });
    }
});

// Export Report Functions
function exportReport(format) {
    var form = document.getElementById('reportFilterForm');
    if (!form) return;
    
    // Get all form data
    var formData = new FormData(form);
    formData.append('export_format', format);
    formData.append('tab', 'reports');
    
    // Create export URL
    var url = '{{ admin_url("biometric_devices/report/export") }}?' + new URLSearchParams(formData).toString();
    
    // Open in new window for PDF, download for Excel/CSV
    if (format === 'pdf') {
        window.open(url, '_blank');
    } else {
        window.location.href = url;
    }
}

// Print Report
window.addEventListener('beforeprint', function() {
    // Add print-specific styling
    document.body.classList.add('printing');
});

window.addEventListener('afterprint', function() {
    document.body.classList.remove('printing');
});
</script>

<style>
@media print {
    .card-header .text-right,
    .btn,
    .nav-tabs,
    .tab-heading {
        display: none !important;
    }
    
    .card {
        border: none !important;
        box-shadow: none !important;
    }
    
    .card-header {
        background: white !important;
        border-bottom: 2px solid #1976d2 !important;
    }
    
    h4, h5 {
        color: #1976d2 !important;
    }
    
    table {
        font-size: 10px !important;
    }
}
</style>


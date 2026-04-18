@php
    use Admin\Models\Staff_attendance_model;
    use Admin\Models\Staffs_model;
    
    $dateFilter = request('date');
    $staffFilter = request('staff_id');
    $statusFilter = request('status');
    
    $query = Staff_attendance_model::with(['staff', 'location', 'device'])
        ->orderBy('check_in_time', 'desc');
    
    if ($dateFilter) {
        $query->whereDate('check_in_time', $dateFilter);
    }
    
    if ($staffFilter) {
        $query->where('staff_id', $staffFilter);
    }
    
    if ($statusFilter === 'checked_in') {
        $query->whereNull('check_out_time');
    } elseif ($statusFilter === 'checked_out') {
        $query->whereNotNull('check_out_time');
    }
    
    $attendanceRecords = $query->paginate(50);
    
    $todayAttendance = Staff_attendance_model::with(['staff', 'location'])
        ->whereDate('check_in_time', today())
        ->orderBy('check_in_time', 'desc')
        ->get();
@endphp

<div class="row-fluid">
    <div class="card">
        <div class="card-body">
            <!-- Today's Summary & Manual Check-in Button -->
            <div class="d-flex justify-content-between align-items-center mb-4">
                <div class="alert mb-0" style="background-color: #e3f2fd; border-color: #90caf9; color: #1976d2; padding: 15px; flex: 1; margin-right: 15px;">
                    <strong><i class="fa fa-info-circle"></i> Today's Summary:</strong> 
                    {{ $todayAttendance->count() }} staff checked in today
                </div>
                <button type="button" class="btn btn-primary" onclick="openManualCheckInModal()" style="white-space: nowrap;">
                    <i class="fa fa-hand-pointer-o"></i> Manual Check-In/Out
                </button>
            </div>

            <!-- Filters -->
            <div class="row mb-4" style="margin-bottom: 20px;">
                <div class="col-md-3">
                    <input type="date" class="form-control" id="filter-date" 
                           value="{{ request('date', date('Y-m-d')) }}" 
                           onchange="filterAttendance()">
                </div>
                <div class="col-md-3">
                    <select class="form-control" id="filter-staff" onchange="filterAttendance()">
                        <option value="">All Staff</option>
                        @foreach(Staffs_model::where('staff_status', 1)->get() as $staff)
                            <option value="{{ $staff->staff_id }}" 
                                    {{ request('staff_id') == $staff->staff_id ? 'selected' : '' }}>
                                {{ $staff->staff_name }}
                            </option>
                        @endforeach
                    </select>
                </div>
                <div class="col-md-3">
                    <select class="form-control" id="filter-status" onchange="filterAttendance()">
                        <option value="">All Status</option>
                        <option value="checked_in" {{ request('status') == 'checked_in' ? 'selected' : '' }}>Checked In</option>
                        <option value="checked_out" {{ request('status') == 'checked_out' ? 'selected' : '' }}>Checked Out</option>
                    </select>
                </div>
                <div class="col-md-3">
                    <label>&nbsp;</label><br>
                    <button type="button" class="btn btn-ice-white" onclick="resetFilters()">
                        <i class="fa fa-refresh"></i> Reset Filters
                    </button>
                </div>
            </div>

            <!-- Attendance Table -->
            <div class="table-responsive" style="margin-top: 20px;">
                <table class="table table-striped table-bordered attendance-table" style="margin-bottom: 0;">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Staff Name</th>
                            <th>Check In</th>
                            <th>Check Out</th>
                            <th>Hours Worked</th>
                            <th>Location</th>
                            <th>Device Type</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        @forelse($attendanceRecords as $record)
                            <tr>
                                <td>{{ $record->check_in_time->format('Y-m-d') }}</td>
                                <td>
                                    <strong>{{ $record->staff->staff_name ?? 'N/A' }}</strong>
                                    @if($record->staff)
                                        <br><small class="text-muted">ID: {{ $record->staff->staff_id }}</small>
                                    @endif
                                </td>
                                <td>
                                    <strong>{{ $record->check_in_time->format('H:i:s') }}</strong>
                                    <br><small class="text-muted">{{ $record->check_in_time->format('M d, Y') }}</small>
                                </td>
                                <td>
                                    @if($record->check_out_time)
                                        <strong>{{ $record->check_out_time->format('H:i:s') }}</strong>
                                        <br><small class="text-muted">{{ $record->check_out_time->format('M d, Y') }}</small>
                                    @else
                                        <span class="text-warning">Not checked out</span>
                                    @endif
                                </td>
                                <td>
                                    @if($record->check_out_time)
                                        <span class="hours-worked">
                                            {{ number_format($record->hours_worked, 2) }} hrs
                                        </span>
                                    @else
                                        <span class="text-muted">-</span>
                                    @endif
                                </td>
                                <td>{{ $record->location->location_name ?? 'N/A' }}</td>
                                <td>
                                    <span class="badge badge-info">{{ ucfirst($record->device_type) }}</span>
                                    @if($record->device)
                                        <br><small>{{ $record->device->name }}</small>
                                    @endif
                                </td>
                                <td>
                                    @if($record->check_out_time)
                                        <span class="status-badge status-checked-out">Checked Out</span>
                                    @else
                                        <span class="status-badge status-checked-in">Checked In</span>
                                    @endif
                                </td>
                            </tr>
                        @empty
                            <tr>
                                <td colspan="8" class="text-center text-muted">
                                    <i class="fa fa-info-circle"></i> No attendance records found
                                </td>
                            </tr>
                        @endforelse
                    </tbody>
                </table>
            </div>

            <!-- Pagination -->
            <div class="mt-4" style="margin-top: 25px; padding-top: 15px;">
                {{ $attendanceRecords->appends(request()->except('page'))->links() }}
            </div>
        </div>
    </div>
</div>

<script>
function filterAttendance() {
    const date = document.getElementById('filter-date').value;
    const staff = document.getElementById('filter-staff').value;
    const status = document.getElementById('filter-status').value;
    
    let url = '{{ admin_url("biometric_devices?tab=attendance") }}';
    const params = new URLSearchParams();
    
    if (date) params.append('date', date);
    if (staff) params.append('staff_id', staff);
    if (status) params.append('status', status);
    
    if (params.toString()) {
        url += '&' + params.toString();
    }
    
    window.location.href = url;
}

function resetFilters() {
    window.location.href = '{{ admin_url("biometric_devices?tab=attendance") }}';
}

// Ensure filter buttons work
document.addEventListener('DOMContentLoaded', function() {
    // Make sure all filter inputs trigger properly
    const filterInputs = document.querySelectorAll('#filter-date, #filter-staff, #filter-status');
    filterInputs.forEach(input => {
        if (input) {
            input.addEventListener('change', filterAttendance);
        }
    });
});

// Manual Check-In/Out Modal
function openManualCheckInModal() {
    if (typeof jQuery !== 'undefined' && jQuery('#manualCheckInModal').length) {
        jQuery('#manualCheckInModal').modal('show');
    }
}

function submitManualCheckIn() {
    const staffId = document.getElementById('manual-staff-select').value;
    const action = document.getElementById('manual-action').value;
    const note = document.getElementById('manual-note').value;
    const dateTime = document.getElementById('manual-datetime').value;
    
    if (!staffId) {
        alert('Please select a staff member');
        return;
    }
    
    if (!note.trim()) {
        alert('Please provide a reason for manual entry');
        return;
    }
    
    if (!dateTime) {
        alert('Please select date and time');
        return;
    }
    
    // Show loading state
    const submitBtn = document.getElementById('manual-submit-btn');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Processing...';
    submitBtn.disabled = true;
    
    // Submit manual attendance
    fetch('/admin/api/biometric/attendance/manual', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content || ''
        },
        body: JSON.stringify({
            staff_id: staffId,
            action: action,
            note: note,
            date_time: dateTime
        })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            alert('Manual ' + action + ' recorded successfully!');
            if (typeof jQuery !== 'undefined') {
                jQuery('#manualCheckInModal').modal('hide');
            }
            // Reload page to show updated attendance
            window.location.reload();
        } else {
            alert('Error: ' + (data.message || 'Failed to record attendance'));
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Failed to record attendance: ' + error.message);
    })
    .finally(() => {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    });
}
</script>

<!-- Manual Check-In/Out Modal -->
<div class="modal fade" id="manualCheckInModal" tabindex="-1" role="dialog" aria-labelledby="manualCheckInModalLabel" aria-hidden="true">
    <div class="modal-dialog" role="document">
        <div class="modal-content">
            <div class="modal-header bg-primary text-white">
                <h5 class="modal-title" id="manualCheckInModalLabel">
                    <i class="fa fa-hand-pointer-o"></i> Manual Check-In/Out
                </h5>
                <button type="button" class="close text-white" data-dismiss="modal" aria-label="Close">
                    <span aria-hidden="true">&times;</span>
                </button>
            </div>
            <div class="modal-body">
                <div class="alert alert-info">
                    <i class="fa fa-info-circle"></i> Use this for staff who forgot their card/fingerprint or in emergency situations.
                </div>
                
                <div class="form-group">
                    <label for="manual-staff-select">Staff Member *</label>
                    <select class="form-control" id="manual-staff-select" required>
                        <option value="">-- Select Staff --</option>
                        @foreach(Staffs_model::where('staff_status', 1)->orderBy('staff_name')->get() as $staff)
                            <option value="{{ $staff->staff_id }}">{{ $staff->staff_name }}</option>
                        @endforeach
                    </select>
                </div>
                
                <div class="form-group">
                    <label for="manual-action">Action *</label>
                    <select class="form-control" id="manual-action" required>
                        <option value="check-in">Check In</option>
                        <option value="check-out">Check Out</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label for="manual-datetime">Date & Time *</label>
                    <input type="datetime-local" class="form-control" id="manual-datetime" 
                           value="{{ now()->format('Y-m-d\TH:i') }}" required>
                </div>
                
                <div class="form-group">
                    <label for="manual-note">Reason/Note *</label>
                    <textarea class="form-control" id="manual-note" rows="3" 
                              placeholder="Enter reason for manual entry (e.g., 'Forgot card', 'Emergency', 'Device was offline')" required></textarea>
                    <small class="form-text text-muted">This will be logged for audit purposes</small>
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-dismiss="modal">Cancel</button>
                <button type="button" class="btn btn-primary" id="manual-submit-btn" onclick="submitManualCheckIn()">
                    <i class="fa fa-check"></i> Submit
                </button>
            </div>
        </div>
    </div>
</div>


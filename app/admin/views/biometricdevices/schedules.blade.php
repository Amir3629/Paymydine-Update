@php
    use Admin\Models\Staff_schedules_model;
    use Admin\Models\Staffs_model;
    
    $schedules = Staff_schedules_model::orderBy('name')->get();
@endphp

<div class="row-fluid">
    <div class="card">
        <div class="card-header">
            <div class="row align-items-center">
                <div class="col-md-6">
                    <h5 class="card-title mb-0">
                        <i class="fa fa-clock-o"></i> Staff Schedules
                    </h5>
                </div>
                <div class="col-md-6 text-right">
                    <button type="button" class="btn btn-primary" data-toggle="modal" data-target="#addScheduleModal" onclick="resetScheduleForm()">
                        <i class="fa fa-plus"></i> Add Schedule
                    </button>
                </div>
            </div>
        </div>
        <div class="card-body">
            <div class="table-responsive">
                <table class="table table-striped table-bordered">
                    <thead>
                        <tr>
                            <th>Schedule Name</th>
                            <th>Time In</th>
                            <th>Time Out</th>
                            <th>Status</th>
                            <th>Assigned Staff</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        @forelse($schedules as $schedule)
                            @php
                                $assignedCount = \DB::table('staff_schedule_assignments')
                                    ->where('schedule_id', $schedule->schedule_id)
                                    ->where(function($q) {
                                        $q->whereNull('effective_to')
                                          ->orWhere('effective_to', '>=', now()->toDateString());
                                    })
                                    ->count();
                            @endphp
                            <tr>
                                <td><strong>{{ $schedule->name }}</strong></td>
                                <td>{{ $schedule->time_in }}</td>
                                <td>{{ $schedule->time_out }}</td>
                                <td>
                                    @if($schedule->status)
                                        <span class="badge" style="background-color: #e3f2fd; color: #1976d2;">Active</span>
                                    @else
                                        <span class="badge badge-secondary">Inactive</span>
                                    @endif
                                </td>
                                <td>{{ $assignedCount }} staff</td>
                                <td>
                                    <button class="btn btn-sm btn-ice-white" onclick="editSchedule({{ $schedule->schedule_id }})">
                                        <i class="fa fa-edit"></i> Edit
                                    </button>
                                    <button class="btn btn-sm btn-primary" onclick="assignStaff({{ $schedule->schedule_id }})">
                                        <i class="fa fa-users"></i> Assign Staff
                                    </button>
                                </td>
                            </tr>
                        @empty
                            <tr>
                                <td colspan="6" class="text-center text-muted">
                                    <i class="fa fa-info-circle"></i> No schedules found. Create one to get started.
                                </td>
                            </tr>
                        @endforelse
                    </tbody>
                </table>
            </div>
        </div>
    </div>
</div>

<!-- Add Schedule Modal -->
<div class="modal fade" id="addScheduleModal" tabindex="-1" role="dialog">
    <div class="modal-dialog" role="document">
        <div class="modal-content">
            <div class="modal-header" style="background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);">
                <h5 class="modal-title" style="color: #1976d2;">Add Schedule</h5>
                <button type="button" class="close" data-dismiss="modal">&times;</button>
            </div>
            <form id="scheduleForm" method="POST" action="{{ admin_url('biometric_devices/schedule/store') }}">
                @csrf
                <input type="hidden" name="schedule_id" id="edit_schedule_id" value="">
                <div class="modal-body">
                    <div class="form-group">
                        <label>Schedule Name <span class="text-danger">*</span></label>
                        <input type="text" name="name" id="schedule_name" class="form-control" required placeholder="e.g., Morning Shift, Evening Shift">
                    </div>
                    <div class="row">
                        <div class="col-md-6">
                            <div class="form-group">
                                <label>Time In <span class="text-danger">*</span></label>
                                <input type="time" name="time_in" id="schedule_time_in" class="form-control" required>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="form-group">
                                <label>Time Out <span class="text-danger">*</span></label>
                                <input type="time" name="time_out" id="schedule_time_out" class="form-control" required>
                            </div>
                        </div>
                    </div>
                    <div class="form-group">
                        <label>
                            <input type="checkbox" name="status" id="schedule_status" value="1" checked> Active
                        </label>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-ice-white" data-dismiss="modal">Cancel</button>
                    <button type="submit" class="btn btn-primary">
                        <i class="fa fa-save"></i> Save Schedule
                    </button>
                </div>
            </form>
        </div>
    </div>
</div>

<!-- Edit Schedule Modal -->
<div class="modal fade" id="editScheduleModal" tabindex="-1" role="dialog">
    <div class="modal-dialog" role="document">
        <div class="modal-content">
            <div class="modal-header" style="background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);">
                <h5 class="modal-title" style="color: #1976d2;">Edit Schedule</h5>
                <button type="button" class="close" data-dismiss="modal">&times;</button>
            </div>
            <form id="editScheduleForm" method="POST" action="{{ admin_url('biometric_devices/schedule/update') }}">
                @csrf
                <input type="hidden" name="schedule_id" id="edit_schedule_id_field" value="">
                <div class="modal-body">
                    <div class="form-group">
                        <label>Schedule Name <span class="text-danger">*</span></label>
                        <input type="text" name="name" id="edit_schedule_name" class="form-control" required>
                    </div>
                    <div class="row">
                        <div class="col-md-6">
                            <div class="form-group">
                                <label>Time In <span class="text-danger">*</span></label>
                                <input type="time" name="time_in" id="edit_schedule_time_in" class="form-control" required>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="form-group">
                                <label>Time Out <span class="text-danger">*</span></label>
                                <input type="time" name="time_out" id="edit_schedule_time_out" class="form-control" required>
                            </div>
                        </div>
                    </div>
                    <div class="form-group">
                        <label>
                            <input type="checkbox" name="status" id="edit_schedule_status" value="1"> Active
                        </label>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-ice-white" data-dismiss="modal">Cancel</button>
                    <button type="submit" class="btn btn-primary">
                        <i class="fa fa-save"></i> Update Schedule
                    </button>
                </div>
            </form>
        </div>
    </div>
</div>

<!-- Assign Staff Modal -->
<div class="modal fade" id="assignStaffModal" tabindex="-1" role="dialog">
    <div class="modal-dialog modal-lg" role="document">
        <div class="modal-content">
            <div class="modal-header" style="background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);">
                <h5 class="modal-title" style="color: #1976d2;">Assign Staff to Schedule</h5>
                <button type="button" class="close" data-dismiss="modal">&times;</button>
            </div>
            <form id="assignStaffForm" method="POST" action="{{ admin_url('biometric_devices/schedule/assign-staff') }}">
                @csrf
                <input type="hidden" name="schedule_id" id="assign_schedule_id" value="">
                <div class="modal-body">
                    <div class="form-group">
                        <label>Select Staff <span class="text-danger">*</span></label>
                        <select name="staff_ids[]" id="assign_staff_ids" class="form-control" multiple size="10" required>
                            @foreach(\Admin\Models\Staffs_model::where('staff_status', 1)->get() as $staff)
                                <option value="{{ $staff->staff_id }}">{{ $staff->staff_name }} ({{ $staff->staff_email }})</option>
                            @endforeach
                        </select>
                        <small class="form-text text-muted">Hold Ctrl (Cmd on Mac) to select multiple staff</small>
                    </div>
                    <div class="row">
                        <div class="col-md-6">
                            <div class="form-group">
                                <label>Effective From</label>
                                <input type="date" name="effective_from" class="form-control" value="{{ now()->format('Y-m-d') }}">
                                <small class="form-text text-muted">Leave empty for immediate effect</small>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="form-group">
                                <label>Effective To</label>
                                <input type="date" name="effective_to" class="form-control">
                                <small class="form-text text-muted">Leave empty for indefinite</small>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-ice-white" data-dismiss="modal">Cancel</button>
                    <button type="submit" class="btn btn-primary">
                        <i class="fa fa-users"></i> Assign Staff
                    </button>
                </div>
            </form>
        </div>
    </div>
</div>

<script>
function editSchedule(id) {
    // Fetch schedule data via AJAX
    fetch('{{ admin_url("biometric_devices/schedule/get") }}/' + id)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                document.getElementById('edit_schedule_id_field').value = data.schedule.schedule_id;
                document.getElementById('edit_schedule_name').value = data.schedule.name;
                document.getElementById('edit_schedule_time_in').value = data.schedule.time_in;
                document.getElementById('edit_schedule_time_out').value = data.schedule.time_out;
                document.getElementById('edit_schedule_status').checked = data.schedule.status == 1;
                $('#editScheduleModal').modal('show');
            } else {
                alert('Error loading schedule: ' + (data.message || 'Unknown error'));
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Error loading schedule data');
        });
}

function assignStaff(scheduleId) {
    document.getElementById('assign_schedule_id').value = scheduleId;
    $('#assignStaffModal').modal('show');
}

// Reset schedule form
function resetScheduleForm() {
    document.getElementById('scheduleForm').reset();
    document.getElementById('edit_schedule_id').value = '';
    document.getElementById('schedule_status').checked = true;
}

// Handle schedule form submission
document.getElementById('scheduleForm').addEventListener('submit', function(e) {
    e.preventDefault();
    var formData = new FormData(this);
    
    fetch(this.action, {
        method: 'POST',
        body: formData,
        headers: {
            'X-Requested-With': 'XMLHttpRequest'
        }
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(data => {
                throw new Error(data.message || 'Server error');
            });
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            $('#addScheduleModal').modal('hide');
            location.reload();
        } else {
            alert('Error: ' + (data.message || 'Failed to save schedule'));
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Error saving schedule: ' + error.message);
    });
});

// Handle edit schedule form submission
document.getElementById('editScheduleForm').addEventListener('submit', function(e) {
    e.preventDefault();
    var formData = new FormData(this);
    
    fetch(this.action, {
        method: 'POST',
        body: formData,
        headers: {
            'X-Requested-With': 'XMLHttpRequest'
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            $('#editScheduleModal').modal('hide');
            location.reload();
        } else {
            alert('Error: ' + (data.message || 'Failed to update schedule'));
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Error updating schedule');
    });
});

// Handle assign staff form submission
document.getElementById('assignStaffForm').addEventListener('submit', function(e) {
    e.preventDefault();
    var formData = new FormData(this);
    
    fetch(this.action, {
        method: 'POST',
        body: formData,
        headers: {
            'X-Requested-With': 'XMLHttpRequest'
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            $('#assignStaffModal').modal('hide');
            alert('Staff assigned successfully!');
            location.reload();
        } else {
            alert('Error: ' + (data.message || 'Failed to assign staff'));
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Error assigning staff');
    });
});
</script>

<style>
</style>


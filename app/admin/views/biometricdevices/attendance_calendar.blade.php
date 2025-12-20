@php
    use Admin\Models\Staffs_model;
    use Admin\Models\Staff_attendance_model;
    use Carbon\Carbon;
    
    $month = request('month', now()->month);
    $year = request('year', now()->year);
    
    $startDate = Carbon::create($year, $month, 1)->startOfMonth();
    $endDate = $startDate->copy()->endOfMonth();
    $daysInMonth = $startDate->daysInMonth;
    
    $staffs = Staffs_model::where('staff_status', 1)->get();
    
    $attendances = Staff_attendance_model::with(['staff', 'location'])
        ->whereBetween('check_in_time', [$startDate, $endDate])
        ->get()
        ->groupBy(function($attendance) {
            return $attendance->check_in_time->format('Y-m-d') . '_' . $attendance->staff_id;
        });
@endphp

<div class="row-fluid">
    <div class="card">
        <div class="card-header">
            <div class="row align-items-center">
                <div class="col-md-6">
                    <h5 class="card-title mb-0">
                        <i class="fa fa-calendar"></i> Attendance Calendar - {{ $startDate->format('F Y') }}
                    </h5>
                </div>
                <div class="col-md-6 text-right">
                    <div class="btn-group">
                        <a href="{{ admin_url('biometric_devices?tab=calendar&month=' . $startDate->copy()->subMonth()->month . '&year=' . $startDate->copy()->subMonth()->year) }}" 
                           class="btn btn-sm btn-ice-white">
                            <i class="fa fa-chevron-left"></i> Previous
                        </a>
                        <a href="{{ admin_url('biometric_devices?tab=calendar&month=' . now()->month . '&year=' . now()->year) }}" 
                           class="btn btn-sm btn-primary">
                            Current Month
                        </a>
                        <a href="{{ admin_url('biometric_devices?tab=calendar&month=' . $startDate->copy()->addMonth()->month . '&year=' . $startDate->copy()->addMonth()->year) }}" 
                           class="btn btn-sm btn-ice-white">
                            Next <i class="fa fa-chevron-right"></i>
                        </a>
                    </div>
                </div>
            </div>
        </div>
        <div class="card-body">
            <div class="table-responsive" style="overflow-x: auto;">
                <table class="table table-bordered table-sm" style="font-size: 0.75rem;">
                    <thead>
                        <tr>
                            <th style="position: sticky; left: 0; background: white; z-index: 10; min-width: 150px;">
                                Staff Name
                            </th>
                            <th style="position: sticky; left: 150px; background: white; z-index: 10; min-width: 100px;">
                                Staff ID
                            </th>
                            @for($i = 1; $i <= $daysInMonth; $i++)
                                @php
                                    $date = Carbon::create($year, $month, $i);
                                    $dateStr = $date->format('Y-m-d');
                                @endphp
                                <th class="text-center" style="min-width: 80px; max-width: 80px;">
                                    <div>{{ $date->format('d') }}</div>
                                    <div style="font-size: 0.7rem; color: #6c757d;">{{ $date->format('D') }}</div>
                                </th>
                            @endfor
                        </tr>
                    </thead>
                    <tbody>
                        @foreach($staffs as $staff)
                            <tr>
                                <td style="position: sticky; left: 0; background: white; z-index: 9;">
                                    <strong>{{ $staff->staff_name }}</strong>
                                </td>
                                <td style="position: sticky; left: 150px; background: white; z-index: 9;">
                                    {{ $staff->staff_id }}
                                </td>
                                @for($i = 1; $i <= $daysInMonth; $i++)
                                    @php
                                        $date = Carbon::create($year, $month, $i);
                                        $dateStr = $date->format('Y-m-d');
                                        $key = $dateStr . '_' . $staff->staff_id;
                                        $attendance = $attendances->get($key);
                                    @endphp
                                    <td class="text-center" style="padding: 4px;">
                                        @if($attendance)
                                            @php
                                                $record = $attendance->first();
                                                $checkIn = $record->check_in_time->format('H:i');
                                                $checkOut = $record->check_out_time ? $record->check_out_time->format('H:i') : null;
                                            @endphp
                                            <div class="d-flex flex-column align-items-center">
                                                <i class="fa fa-check-circle" style="color: #1976d2;" title="Checked In: {{ $checkIn }}"></i>
                                                @if($checkOut)
                                                    <small class="text-muted" style="font-size: 0.65rem;">
                                                        {{ $checkIn }} - {{ $checkOut }}
                                                    </small>
                                                    <small style="font-size: 0.65rem; color: #1976d2; font-weight: 600;">
                                                        {{ number_format($record->hours_worked, 1) }}h
                                                    </small>
                                                @else
                                                    <small style="font-size: 0.65rem; color: #ff9800;">
                                                        {{ $checkIn }}
                                                    </small>
                                                    <small style="font-size: 0.65rem; color: #1976d2; font-weight: 600;">Active</small>
                                                @endif
                                            </div>
                                        @else
                                            <i class="fa fa-times-circle" style="color: #ef5350;" title="Absent"></i>
                                        @endif
                                    </td>
                                @endfor
                            </tr>
                        @endforeach
                    </tbody>
                </table>
            </div>

            <!-- Legend -->
            <div class="mt-3">
                <div class="row">
                    <div class="col-md-12">
                        <h6>Legend:</h6>
                        <span class="badge mr-2" style="background-color: #e3f2fd; color: #1976d2; border: 1px solid #90caf9;">
                            <i class="fa fa-check-circle"></i> Present
                        </span>
                        <span class="badge mr-2" style="background-color: #ffebee; color: #ef5350; border: 1px solid #ef9a9a;">
                            <i class="fa fa-times-circle"></i> Absent
                        </span>
                        <span class="badge mr-2" style="background-color: #fff3e0; color: #ff9800; border: 1px solid #ffb74d;">
                            <i class="fa fa-clock"></i> Checked In (Not Out)
                        </span>
                        <small class="text-muted ml-3">
                            Hover over dates to see check-in/check-out times
                        </small>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>

<style>
    .table th {
        background-color: #f8f9fa;
        font-weight: 600;
    }
    .table td {
        vertical-align: middle;
    }
    .table-sm td {
        padding: 4px;
    }
</style>


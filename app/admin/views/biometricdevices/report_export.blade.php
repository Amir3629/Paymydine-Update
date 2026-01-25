<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>{{ $reportTitle ?? 'Attendance Report' }}</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 20px;
            color: #333;
        }
        .report-header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 3px solid #1976d2;
        }
        .report-header h1 {
            color: #1976d2;
            margin: 0 0 10px 0;
        }
        .report-info {
            margin: 20px 0;
            padding: 15px;
            background: #f5f5f5;
            border-radius: 5px;
        }
        .statistics {
            display: flex;
            justify-content: space-around;
            margin: 20px 0;
            padding: 15px;
            background: #e3f2fd;
            border-radius: 5px;
        }
        .stat-item {
            text-align: center;
        }
        .stat-item strong {
            display: block;
            font-size: 24px;
            color: #1976d2;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
        }
        th, td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
        }
        th {
            background-color: #1976d2;
            color: white;
            font-weight: bold;
        }
        tr:nth-child(even) {
            background-color: #f9f9f9;
        }
        .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 2px solid #ddd;
            text-align: center;
            color: #666;
            font-size: 12px;
        }
    </style>
</head>
<body>
    <div class="report-header">
        <h1>{{ $reportTitle ?? 'Attendance Report' }}</h1>
        @if($reportNotes)
            <p style="color: #666;">{{ $reportNotes }}</p>
        @endif
        <p style="color: #666;">
            Period: {{ \Carbon\Carbon::parse($dateFrom)->format('M d, Y') }} - {{ \Carbon\Carbon::parse($dateTo)->format('M d, Y') }}
        </p>
        <p style="color: #666;">Generated: {{ now()->format('M d, Y H:i:s') }}</p>
    </div>
    
    <div class="statistics">
        <div class="stat-item">
            <strong>{{ $totalStaff ?? 0 }}</strong>
            <span>Total Staff</span>
        </div>
        <div class="stat-item">
            <strong>{{ $reportData->count() }}</strong>
            <span>Total Records</span>
        </div>
        <div class="stat-item">
            <strong>{{ number_format($totalHoursWorked ?? 0, 1) }}h</strong>
            <span>Total Hours</span>
        </div>
        <div class="stat-item">
            <strong>{{ $totalLate ?? 0 }}</strong>
            <span>Late Arrivals</span>
        </div>
        <div class="stat-item">
            <strong>{{ $totalOvertime ?? 0 }}</strong>
            <span>Overtime Records</span>
        </div>
    </div>
    
    <table>
        <thead>
            <tr>
                <th>Date</th>
                <th>Staff Name</th>
                <th>Location</th>
                <th>Check In</th>
                <th>Check Out</th>
                <th>Hours Worked</th>
                <th>Late Time</th>
                <th>Overtime</th>
            </tr>
        </thead>
        <tbody>
            @forelse($reportData as $record)
                @php
                    $lateTime = \Admin\Models\Staff_latetimes_model::where('attendance_id', $record->attendance_id)->first();
                    $overtime = \Admin\Models\Staff_overtimes_model::where('attendance_id', $record->attendance_id)->first();
                @endphp
                <tr>
                    <td>{{ $record->check_in_time->format('Y-m-d') }}</td>
                    <td><strong>{{ $record->staff->staff_name ?? 'N/A' }}</strong></td>
                    <td>{{ $record->location->location_name ?? 'N/A' }}</td>
                    <td>{{ $record->check_in_time->format('H:i:s') }}</td>
                    <td>{{ $record->check_out_time ? $record->check_out_time->format('H:i:s') : '-' }}</td>
                    <td>{{ $record->check_out_time ? number_format($record->hours_worked, 2) . 'h' : '-' }}</td>
                    <td>{{ $lateTime ? $lateTime->duration : '-' }}</td>
                    <td>{{ $overtime ? $overtime->duration : '-' }}</td>
                </tr>
            @empty
                <tr>
                    <td colspan="8" style="text-align: center; color: #999;">No records found</td>
                </tr>
            @endforelse
        </tbody>
    </table>
    
    <div class="footer">
        <p>This report was generated automatically by PayMyDine Attendance System</p>
        <p>© {{ date('Y') }} PayMyDine. All rights reserved.</p>
    </div>
</body>
</html>


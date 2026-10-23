<?php
namespace App\Services;

use Carbon\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * PMD_ACTUAL_EXTRA_SHIFTS_V1_20261023
 *
 * Attendance is the authoritative record of work that really happened.
 * Unscheduled check-ins are represented as separately colored ACTUAL shifts
 * in both Team and Manager portals, never silently copied into planned rota.
 * No employee position data returned and no write in this read service.
 */
final class PmdActualWorkShiftV1
{
    public function get(int $locationId, Carbon $from, Carbon $to, ?int $staffId = null, int $limit = 250): Collection
    {
        if ($locationId < 1 || !Schema::hasTable('staff_attendance')
            || !Schema::hasTable('staffs')
            || !Schema::hasColumn('staff_attendance', 'location_id')
            || !Schema::hasColumn('staff_attendance', 'metadata')) return collect();

        $query = DB::table('staff_attendance as a')
            ->join('staffs as s', 's.staff_id', '=', 'a.staff_id')
            ->where('a.location_id', $locationId)
            ->whereBetween('a.check_in_time', [$from->copy()->startOfDay(), $to->copy()->endOfDay()])
            ->select(['a.attendance_id','a.staff_id','a.check_in_time',
                'a.check_out_time','a.metadata','s.staff_name'])
            ->orderByDesc('a.attendance_id')
            ->limit(max(1, min(1000, $limit)));
        if ($staffId !== null) $query->where('a.staff_id', $staffId);

        return $query->get()->filter(function ($row) {
            $meta = json_decode((string)$row->metadata, true);
            if (!is_array($meta) || ($meta['schedule_status'] ?? '') !== 'unscheduled') return false;
            $row->actual_shift_id = (int)$row->attendance_id;
            $row->is_actual_extra = true;
            $row->person_name = trim((string)$row->staff_name) ?: 'Team member';
            $row->is_open = !$row->check_out_time;
            $row->reviewed = ($meta['actual_review_status'] ?? '') === 'reviewed';
            $row->break_minutes = isset($meta['staff_portal_break_minutes'])
                ? round((float)$meta['staff_portal_break_minutes'], 0) : null;
            try {
                $start = Carbon::parse($row->check_in_time);
                $row->date_key = $start->toDateString();
                $row->start_label = $start->format('H:i');
                $row->end_label = $row->check_out_time
                    ? Carbon::parse($row->check_out_time)->format('H:i') : null;
            } catch (\Throwable $ignored) {
                return false;
            }
            // Never send raw clock_in_geo/clock_out_geo evidence to UI.
            unset($row->metadata);
            return true;
        })->values();
    }
}

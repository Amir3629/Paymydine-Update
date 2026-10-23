<?php

namespace Admin\Services;

use App\Services\PmdStaffClockGeofenceV1;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * PMD_STAFF_OPERATIONS_CENTER_V1_20261021
 * Owner/manager-only caller must authorize before using this service.
 * All queries scoped to the current restaurant; private staff group chats
 * stay private. Only the restaurant-wide team group appears in this surface.
 */
final class PmdStaffOperationsCenterV1
{
    public function payload(int $locationId): array
    {
        $data = [
            'location_id' => $locationId,
            'site' => app(PmdStaffClockGeofenceV1::class)->site($locationId),
            'active' => collect(), 'recent' => collect(),
            'upcoming' => collect(),
            'requests' => collect(), 'messages' => collect(),
            'events' => collect(), 'team_group' => null,
            'can_send' => false,
            'generated_at' => now()->format('d M Y H:i'),
        ];
        if ($locationId < 1) return $data;

        if (Schema::hasTable('staff_attendance') && Schema::hasTable('staffs')
            && Schema::hasColumn('staff_attendance', 'location_id')) {
            $query = DB::table('staff_attendance as a')
                ->leftJoin('staffs as s', 's.staff_id', '=', 'a.staff_id')
                ->where('a.location_id', $locationId)
                ->select(['a.attendance_id','a.staff_id','a.check_in_time','a.check_out_time',
                    's.staff_name']);
            // PMD_STAFF_UNSCHEDULED_ATTENDANCE_V1_20261022: expose only
            // schedule_status from existing metadata for review; no raw GPS.
            if (Schema::hasColumn('staff_attendance', 'metadata')) {
                $query->addSelect('a.metadata');
            }
            $data['active'] = (clone $query)->whereNull('a.check_out_time')
                ->orderByDesc('a.attendance_id')->limit(75)->get();
            $data['recent'] = (clone $query)
                ->orderByDesc('a.attendance_id')->limit(25)->get();
        }

        // PMD_OWNER_SHARED_STAFF_SHELL_V026_20261023:
        // Read-only upcoming planned rota for the Owner Staff app.
        // Same tenant location; no other restaurant or private staff records.
        if (Schema::hasTable('pmd_operational_shifts')) {
            $data['upcoming'] = DB::table('pmd_operational_shifts')
                ->where('location_id', $locationId)
                ->whereBetween('shift_date', [
                    now()->toDateString(), now()->copy()->addDays(13)->toDateString(),
                ])
                ->whereNotIn('status', ['cancelled', 'canceled'])
                ->select(['id','shift_date','label','starts_at','ends_at','status'])
                ->orderBy('shift_date')->orderBy('starts_at')->orderBy('id')
                ->limit(40)->get();
        }

        if (Schema::hasTable('pmd_staff_requests') && Schema::hasTable('pmd_operational_people')) {
            $data['requests'] = DB::table('pmd_staff_requests as r')
                ->leftJoin('pmd_operational_people as p', function ($join) use ($locationId) {
                    $join->on('p.id','=','r.person_id')->where('p.location_id', '=', $locationId);
                })
                ->where('r.location_id', $locationId)->where('r.status','pending')
                ->select(['r.id','r.request_type','r.message','r.date_from','r.date_to',
                    'r.created_at','p.display_name as person_name'])
                ->orderByDesc('r.created_at')->limit(20)->get();
        }

        if (Schema::hasTable('pmd_staff_chat_groups')
            && Schema::hasTable('pmd_staff_chat_messages')
            && Schema::hasTable('staffs')) {
            $group = DB::table('pmd_staff_chat_groups')
                ->where('location_id', $locationId)->where('group_type','team')
                ->where('is_active',1)->orderBy('id')->first();
            if ($group) {
                $data['team_group'] = $group;
                $data['messages'] = DB::table('pmd_staff_chat_messages as m')
                    ->leftJoin('staffs as s','s.staff_id','=','m.staff_id')
                    ->where('m.location_id',$locationId)->where('m.group_id',(int)$group->id)
                    ->select(['m.id','m.message','m.created_at','s.staff_name'])
                    ->orderByDesc('m.id')->limit(25)->get()->reverse()->values();
                $user = \Admin\Facades\AdminAuth::getUser();
                $staffId = (int)optional($user ? $user->staff : null)->staff_id;
                $data['can_send'] = $staffId > 0
                    && DB::table('staffs')->where('staff_id',$staffId)->exists();
            }
        }

        if (Schema::hasTable('pmd_operational_shift_audit_events')) {
            $data['events'] = DB::table('pmd_operational_shift_audit_events')
                ->where('location_id', $locationId)
                ->select(['event_type','target_name_snapshot','actor_name_snapshot','created_at'])
                ->orderByDesc('id')->limit(15)->get();
        }
        return $data;
    }
}

<?php

namespace App\Services;

use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;

/**
 * PMD_OWNER_STAFF_HOUR_NOTES_R11
 * Database-backed operational announcements for one restaurant. Visibility is
 * materialized as recipient receipts at publish time, never inferred from a
 * client-supplied role or changed staff access after publication.
 */
final class PmdOwnerStaffHourNotesR11
{
    private const NOTES = 'pmd_owner_staff_hour_notes';
    private const RECEIPTS = 'pmd_owner_staff_hour_note_receipts';

    /** All prerequisites are tenant-local. Missing staff rows are NOT missing tables. */
    public function missingRequirements(): array
    {
        $required = [
            self::NOTES, self::RECEIPTS, 'pmd_operational_people',
            'staffs', 'staff_roles', 'users',
        ];
        return array_values(array_filter($required, static function ($table) {
            return !Schema::hasTable($table);
        }));
    }

    public function ready(): bool
    {
        return $this->missingRequirements() === [];
    }

    private function requireReady(): void
    {
        if (!$this->ready()) {
            throw new \RuntimeException('Staff notes schema is not installed for this restaurant.');
        }
    }

    private function staffRoster(int $locationId)
    {
        $this->requireReady();
        return DB::table('pmd_operational_people as person')
            ->join('staffs as staff', 'staff.staff_id', '=', 'person.staff_id')
            ->join('users as account', 'account.staff_id', '=', 'staff.staff_id')
            ->leftJoin('staff_roles as role', 'role.staff_role_id', '=', 'staff.staff_role_id')
            ->where('person.location_id', $locationId)
            ->where('person.is_active', 1)
            ->where('staff.staff_status', 1)
            ->whereNotNull('person.staff_id')
            ->where('account.is_activated', 1)
            ->select([
                'staff.staff_id',
                'role.code as role_code',
                'role.name as role_name',
            ])
            ->distinct()
            ->get()
            ->unique('staff_id')
            ->values();
    }

    public function roleOptions(int $locationId): array
    {
        $roster = $this->staffRoster($locationId);
        $roles = [];
        foreach ($roster as $person) {
            $code = strtolower(trim((string)($person->role_code ?? '')));
            if ($code === '') continue;
            if (!isset($roles[$code])) {
                $roles[$code] = [
                    'code' => $code,
                    'name' => (string)($person->role_name ?: $code),
                    'count' => 0,
                ];
            }
            $roles[$code]['count']++;
        }
        uasort($roles, fn ($a, $b) => strcmp($a['name'], $b['name']));
        return array_merge(
            [['code' => 'all', 'name' => 'All staff', 'count' => $roster->count()]],
            array_values($roles)
        );
    }

    public function publish(int $locationId, ?int $authorStaffId, array $input): array
    {
        $this->requireReady();
        $valid = Validator::make($input, [
            'date' => ['required','date_format:Y-m-d','after_or_equal:2000-01-01','before_or_equal:2100-12-31'],
            'time' => ['required','regex:/^(?:[01][0-9]|2[0-3]):(?:00|30)$/'],
            'message' => ['required','string','min:2','max:1500'],
            'roles' => ['required','array','min:1','max:20'],
            'roles.*' => ['required','string','min:2','max:80','regex:/^[a-z0-9:_-]+$/'],
        ])->validate();
        $targets = array_values(array_unique(array_map(
            fn ($v) => strtolower(trim((string)$v)),
            $valid['roles']
        )));
        if (in_array('all', $targets, true)) $targets = ['all'];

        $roster = $this->staffRoster($locationId);
        $possible = $roster->map(fn ($row) => strtolower(trim((string)$row->role_code)))->unique()->all();
        foreach ($targets as $target) {
            if ($target !== 'all' && !in_array($target, $possible, true)) {
                throw ValidationException::withMessages(['roles' => 'Choose a role assigned to an active account in this restaurant.']);
            }
        }
        $recipients = $roster->filter(function ($row) use ($targets) {
            return $targets === ['all'] || in_array(strtolower(trim((string)$row->role_code)), $targets, true);
        })->values();
        if (!$recipients->count()) {
            throw ValidationException::withMessages(['roles' => 'No active Staff Portal accounts match these roles.']);
        }

        $noteId = DB::transaction(function () use ($locationId, $authorStaffId, $valid, $targets, $recipients) {
            $now = now();
            $id = (int)DB::table(self::NOTES)->insertGetId([
                'location_id' => $locationId,
                'note_date' => $valid['date'],
                'slot_time' => $valid['time'],
                'message' => trim((string)$valid['message']),
                'target_roles' => json_encode($targets, JSON_UNESCAPED_UNICODE),
                'created_by_staff_id' => $authorStaffId,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
            $rows = $recipients->map(function ($recipient) use ($locationId, $id, $now) {
                return [
                    'location_id' => $locationId,
                    'note_id' => $id,
                    'staff_id' => (int)$recipient->staff_id,
                    'role_code' => strtolower(trim((string)($recipient->role_code ?: 'unassigned'))),
                    'created_at' => $now,
                    'updated_at' => $now,
                ];
            })->all();
            DB::table(self::RECEIPTS)->insert($rows);
            return $id;
        });

        return ['id' => $noteId, 'recipients' => $recipients->count()];
    }

    public function forOwnerYear(int $locationId, int $year): array
    {
        $this->requireReady();
        if ($year < 2000 || $year > 2100) return [];
        $notes = DB::table(self::NOTES)
            ->where('location_id', $locationId)
            ->whereBetween('note_date', [$year.'-01-01', $year.'-12-31'])
            ->whereNull('deleted_at')
            ->orderBy('note_date')->orderBy('slot_time')->orderBy('id')
            ->limit(500)->get();
        $ids = $notes->pluck('id')->all();
        $counts = $ids ? DB::table(self::RECEIPTS)
            ->where('location_id', $locationId)
            ->whereIn('note_id', $ids)
            ->selectRaw('note_id, count(*) as total, sum(case when confirmed_at is not null then 1 else 0 end) as confirmed')
            ->groupBy('note_id')->get()->keyBy('note_id') : collect();

        return $notes->map(function ($note) use ($counts) {
            $counter = $counts->get($note->id);
            return [
                'id' => (int)$note->id,
                'date' => (string)$note->note_date,
                'time' => substr((string)$note->slot_time, 0, 5),
                'message' => (string)$note->message,
                'roles' => json_decode((string)$note->target_roles, true) ?: [],
                'recipients' => (int)($counter->total ?? 0),
                'confirmed' => (int)($counter->confirmed ?? 0),
            ];
        })->all();
    }

    public function forStaff(int $locationId, int $staffId): array
    {
        $this->requireReady();
        $today = Carbon::now('Europe/Berlin')->startOfDay();
        $items = DB::table(self::RECEIPTS.' as receipt')
            ->join(self::NOTES.' as note', 'note.id', '=', 'receipt.note_id')
            ->where('receipt.location_id', $locationId)
            ->where('note.location_id', $locationId)
            ->where('receipt.staff_id', $staffId)
            ->whereNull('note.deleted_at')
            ->whereBetween('note.note_date', [
                $today->copy()->subDays(60)->toDateString(),
                $today->copy()->addDays(120)->toDateString(),
            ])
            ->select(['note.id','note.note_date','note.slot_time','note.message',
                'receipt.confirmed_at'])
            // Today's instructions are the first thing a worker sees on login;
            // upcoming notes follow, and prior days remain readable.
            ->orderByRaw('case when note.note_date = ? then 0 when note.note_date > ? then 1 else 2 end asc', [
                $today->toDateString(), $today->toDateString(),
            ])
            ->orderByRaw('case when receipt.confirmed_at is null then 0 else 1 end asc')
            ->orderBy('note.note_date')->orderBy('note.slot_time')
            ->limit(120)->get();

        return $items->map(function ($item) {
            return [
                'id' => (int)$item->id,
                'date' => (string)$item->note_date,
                'time' => substr((string)$item->slot_time, 0, 5),
                'message' => (string)$item->message,
                'confirmed' => $item->confirmed_at !== null,
            ];
        })->all();
    }

    public function confirm(int $locationId, int $staffId, int $noteId): bool
    {
        $this->requireReady();
        $exists = DB::table(self::RECEIPTS.' as receipt')
            ->join(self::NOTES.' as note', 'note.id', '=', 'receipt.note_id')
            ->where('receipt.location_id', $locationId)
            ->where('note.location_id', $locationId)
            ->where('receipt.staff_id', $staffId)
            ->where('receipt.note_id', $noteId)
            ->whereNull('note.deleted_at')->exists();
        if (!$exists) return false;
        // Idempotent atomic acknowledgement: only its own receipt changes.
        DB::table(self::RECEIPTS)->where('location_id', $locationId)
            ->where('staff_id', $staffId)->where('note_id', $noteId)
            ->whereNull('confirmed_at')
            ->update(['confirmed_at' => now(), 'updated_at' => now()]);
        return true;
    }

    public function remove(int $locationId, int $noteId): bool
    {
        $this->requireReady();
        return DB::table(self::NOTES)
            ->where('location_id', $locationId)->where('id', $noteId)
            ->whereNull('deleted_at')
            ->update(['deleted_at' => now(), 'updated_at' => now()]) === 1;
    }
}

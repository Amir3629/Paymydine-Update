<?php

namespace App\Services;

use Admin\Models\Staffs_model;
use Admin\Services\PmdDefaultStaffRoleService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * PMD_OPERATIONAL_ROSTER_RECONCILE_V3
 *
 * Old tenants may have perfectly valid Staff/User login records created before
 * pmd_operational_people existed. Shifts schedules person_id, so access-only
 * users must be linked to one real operational person rather than faked in UI.
 *
 * This reconciler is location scoped and idempotent. It never reactivates a
 * person that an Owner intentionally removed from the active roster.
 *
 * V2 also keeps explicit PMD staff-role changes authoritative for the rota.
 * Generic Team Member access may still carry a meaningful operational job such
 * as Bartender or kitchenhelper; explicit Waiter/Cashier/Reservations/etc.
 * always refresh the operational role and future assignment snapshots.
 */
class PmdOperationalRosterReconciler
{
    public function reconcileLocation(int $locationId): array
    {
        $result = ['created' => 0, 'linked' => 0, 'enriched' => 0, 'skipped' => 0];
        if ($locationId < 1 || !$this->ready()) return $result;

        $singleLocationId = $this->singleEnabledLocationId();

        $staffMembers = Staffs_model::with(['role', 'user', 'locations'])
            ->whereNotSuperUser()
            ->isEnabled()
            ->orderBy('staff_id')
            ->get();

        foreach ($staffMembers as $staff) {
            if (!$staff->user) {
                $result['skipped']++;
                continue;
            }

            if (!$this->belongsToLocation($staff, $locationId, $singleLocationId)) {
                $result['skipped']++;
                continue;
            }

            $staffId = (int)$staff->staff_id;
            if ($staffId < 1) continue;

            $role = $this->roleMeta($staff);
            if ($role['code'] === PmdDefaultStaffRoleService::OWNER) {
                // Owner access is not automatically an employee rota row.
                continue;
            }

            $existing = DB::table('pmd_operational_people')
                ->where('location_id', $locationId)
                ->where('staff_id', $staffId)
                ->orderByDesc('id')
                ->first();

            if ($existing) {
                // A historical inactive row means the Owner explicitly removed
                // this person. Do not silently undo that decision.
                if (empty($existing->is_active)) continue;

                $updates = $this->enrichmentUpdates($existing, $role);
                if ($updates) {
                    $updates['updated_at'] = now();
                    DB::table('pmd_operational_people')
                        ->where('id', (int)$existing->id)
                        ->update($updates);
                    $this->syncFutureAssignmentSnapshots(
                        $locationId,
                        (int)$existing->id,
                        $updates
                    );
                    $result['enriched']++;
                }
                continue;
            }

            $name = trim((string)$staff->staff_name);
            if ($name === '') {
                $result['skipped']++;
                continue;
            }

            $matches = DB::table('pmd_operational_people')
                ->where('location_id', $locationId)
                ->whereNull('staff_id')
                ->where('is_active', 1)
                ->whereRaw('LOWER(TRIM(display_name)) = ?', [strtolower($name)])
                ->orderBy('id')
                ->limit(2)
                ->get();

            if ($matches->count() === 1) {
                $person = $matches->first();
                $enrichment = $this->enrichmentUpdates($person, $role);
                $updates = [
                    'staff_id' => $staffId,
                    'updated_at' => now(),
                ] + $enrichment;

                DB::table('pmd_operational_people')
                    ->where('id', (int)$person->id)
                    ->whereNull('staff_id')
                    ->update($updates);
                $this->syncFutureAssignmentSnapshots(
                    $locationId,
                    (int)$person->id,
                    $enrichment
                );
                $result['linked']++;
                continue;
            }

            if ($matches->count() > 1) {
                logger()->warning('PMD roster reconciliation skipped ambiguous legacy person', [
                    'location_id' => $locationId,
                    'staff_id' => $staffId,
                    'staff_name' => $name,
                ]);
                $result['skipped']++;
                continue;
            }

            DB::table('pmd_operational_people')->insert([
                'location_id' => $locationId,
                'staff_id' => $staffId,
                'display_name' => $name,
                'department' => $role['department'],
                'job_role' => $role['label'],
                'station_slug' => $role['station_slug'],
                'is_active' => 1,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
            $result['created']++;
        }

        return $result;
    }

    private function ready(): bool
    {
        try {
            return Schema::hasTable('pmd_operational_people')
                && Schema::hasTable('staffs')
                && Schema::hasTable('users');
        } catch (\Throwable $error) {
            return false;
        }
    }

    private function belongsToLocation($staff, int $locationId, ?int $singleLocationId): bool
    {
        $ids = collect($staff->locations ?? [])
            ->map(fn ($location) => (int)($location->location_id ?? 0))
            ->filter()
            ->values();

        $legacyLocationId = (int)($staff->staff_location_id ?? 0);
        if ($legacyLocationId > 0) $ids->push($legacyLocationId);
        $ids = $ids->unique()->values();

        if ($ids->isNotEmpty()) return $ids->contains($locationId);

        // Only infer an unscoped legacy Staff account when the installation has
        // exactly one enabled restaurant. Multi-location data is never guessed.
        return $singleLocationId !== null && $singleLocationId === $locationId;
    }

    private function singleEnabledLocationId(): ?int
    {
        try {
            if (!Schema::hasTable('locations')) return null;
            $query = DB::table('locations')->orderBy('location_id');
            if (Schema::hasColumn('locations', 'location_status')) {
                $query->where('location_status', 1);
            }
            $ids = $query->limit(2)->pluck('location_id')->map('intval')->filter()->values();
            return $ids->count() === 1 ? (int)$ids->first() : null;
        } catch (\Throwable $error) {
            return null;
        }
    }

    private function roleMeta($staff): array
    {
        $code = strtolower(trim((string)optional($staff->role)->code));
        $name = trim((string)optional($staff->role)->name);
        $stationSlug = null;
        $department = 'other';
        $label = $name !== '' ? $name : 'Team member';

        if (str_starts_with($code, PmdDefaultStaffRoleService::KDS_PREFIX)) {
            $department = 'kitchen';
            $stationSlug = trim(substr($code, strlen(PmdDefaultStaffRoleService::KDS_PREFIX))) ?: null;
            $label = $name !== '' ? $name : 'Kitchen';
        } elseif ($code === PmdDefaultStaffRoleService::WAITER) {
            $department = 'floor';
            $label = 'Waiter';
        } elseif ($code === PmdDefaultStaffRoleService::CASHIER) {
            $department = 'floor';
            $label = 'Cashier';
        } elseif ($code === PmdDefaultStaffRoleService::RESERVATIONS) {
            $department = 'reception';
            $label = 'Reservations';
        } elseif ($code === PmdDefaultStaffRoleService::MANAGER) {
            $department = 'other';
            $label = 'Manager';
        } elseif ($code === PmdDefaultStaffRoleService::ACCOUNTANT) {
            $department = 'other';
            $label = 'Accountant';
        } elseif ($code === PmdDefaultStaffRoleService::TEAM_MEMBER) {
            $department = 'kitchen';
            $label = 'Kitchen Staff';
        } elseif ($code === PmdDefaultStaffRoleService::SONSTIGE) {
            $department = 'other';
            $label = 'Sonstige';
        } elseif ($code === '') {
            $label = $name !== '' ? $name : 'Team member';
        }

        return [
            'code' => $code,
            'department' => $department,
            'label' => $label,
            'station_slug' => $stationSlug,
        ];
    }

    private function enrichmentUpdates($person, array $role): array
    {
        $updates = [];
        $department = strtolower(trim((string)($person->department ?? '')));
        $jobRole = trim((string)($person->job_role ?? ''));
        $jobRoleKey = strtolower(trim((string)preg_replace('/\s+/', ' ', $jobRole)));
        $roleCode = strtolower(trim((string)($role['code'] ?? '')));

        // PMD_OPERATIONAL_ROLE_IS_AREA_V1
        // Access Role controls permissions only. Operational Role owns the
        // Dienstplan family/color/category. Only empty/legacy-generic roles are
        // filled from Access Role.
        if ($jobRole === '' || in_array($jobRoleKey, ['team', 'team member'], true)) {
            $jobRole = trim((string)($role['label'] ?? '')) ?: 'Sonstige';
            if (trim((string)($person->job_role ?? '')) !== $jobRole) {
                $updates['job_role'] = $jobRole;
            }
        }

        $derivedDepartment = $this->departmentForOperationalRole($jobRole);
        if ($department !== $derivedDepartment) {
            $updates['department'] = $derivedDepartment;
        }

        if (str_starts_with($roleCode, PmdDefaultStaffRoleService::KDS_PREFIX)) {
            $station = trim((string)($role['station_slug'] ?? '')) ?: null;
            if (($person->station_slug ?? null) !== $station) {
                $updates['station_slug'] = $station;
            }
        }

        return $updates;
    }

    private function departmentForOperationalRole(string $jobRole): string
    {
        $role = strtolower(trim((string)preg_replace('/[_-]+/', ' ', $jobRole)));
        $role = trim((string)preg_replace('/\s+/', ' ', $role));

        if (
            str_contains($role, 'kitchen') || str_contains($role, 'chef')
            || str_contains($role, 'cook') || str_contains($role, 'kds')
            || str_contains($role, 'dish') || str_contains($role, 'prep')
            || str_contains($role, 'boh')
        ) return 'kitchen';

        if (
            str_contains($role, 'bartender') || str_contains($role, 'barman')
            || str_contains($role, 'barmaid') || $role === 'bar'
        ) return 'bar';

        if (
            str_contains($role, 'reservation') || str_contains($role, 'reception')
            || str_contains($role, 'host') || str_contains($role, 'front desk')
        ) return 'reception';

        if (
            str_contains($role, 'waiter') || str_contains($role, 'server')
            || str_contains($role, 'service') || str_contains($role, 'runner')
            || str_contains($role, 'floor') || str_contains($role, 'cashier')
            || str_contains($role, 'till') || str_contains($role, 'checkout')
            || $role === 'pos'
        ) return 'floor';

        return 'other';
    }

    private function syncFutureAssignmentSnapshots(int $locationId, int $personId, array $updates): void
    {
        if ($personId < 1 || !$updates) return;

        $snapshotUpdates = [];
        if (array_key_exists('department', $updates)) {
            $snapshotUpdates['department_snapshot'] = (string)$updates['department'];
        }
        if (array_key_exists('job_role', $updates)) {
            $snapshotUpdates['job_role_snapshot'] = $updates['job_role'];
        }
        if (!$snapshotUpdates) return;

        try {
            if (
                !Schema::hasTable('pmd_operational_shifts')
                || !Schema::hasTable('pmd_operational_shift_people')
            ) {
                return;
            }

            $snapshotUpdates['updated_at'] = now();
            DB::table('pmd_operational_shift_people')
                ->where('person_id', $personId)
                ->whereIn('shift_id', function ($query) use ($locationId) {
                    $query->select('id')
                        ->from('pmd_operational_shifts')
                        ->where('location_id', $locationId)
                        ->where('shift_date', '>=', now()->toDateString())
                        ->whereNotIn('status', ['cancelled', 'canceled']);
                })
                ->update($snapshotUpdates);
        } catch (\Throwable $error) {
            logger()->warning('PMD future shift role snapshot sync failed', [
                'location_id' => $locationId,
                'person_id' => $personId,
                'message' => $error->getMessage(),
            ]);
        }
    }
}

<?php

namespace Admin\Services;

use Admin\Facades\AdminAuth;
use Admin\Facades\AdminLocation;
use Admin\Models\Staffs_model;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * PMD Admin Presence Service V1
 *
 * Durable admin-session presence authority.
 * Online means: an authenticated admin session exists, has not logged out,
 * and has not passed the same configured session lifetime used by Laravel.
 * This is intentionally separate from staff_attendance / biometric clocking.
 */
class PmdAdminPresenceService
{
    public const TABLE = 'pmd_admin_presence_sessions';

    private static ?bool $tableReady = null;

    public function loginCurrentSession(): void
    {
        $this->writeCurrentSession(true);
    }

    public function touchCurrentSession(): void
    {
        $this->writeCurrentSession(false);
    }

    public function logoutCurrentSession(): void
    {
        if (!$this->tableReady()) return;

        $user = AdminAuth::getUser();
        $userId = (int)optional($user)->getKey();
        $sessionHash = $this->currentSessionHash();

        if ($userId <= 0 || $sessionHash === '') return;

        $now = $this->now();

        DB::table(self::TABLE)
            ->where('user_id', $userId)
            ->where('session_hash', $sessionHash)
            ->whereNull('logout_at')
            ->update([
                'last_seen_at' => $now->toDateTimeString(),
                'expires_at' => $now->toDateTimeString(),
                'logout_at' => $now->toDateTimeString(),
                'updated_at' => $now->toDateTimeString(),
            ]);
    }

    /**
     * Return one row per online staff member, while preserving how many active
     * browser sessions that staff member currently has.
     */
    public function onlineStaffAtLocation(int $locationId): array
    {
        if (!$this->tableReady()) {
            return [
                'connected' => false,
                'count' => 0,
                'rows' => [],
                'source' => 'PMD admin presence table unavailable',
            ];
        }

        $now = $this->now();

        $query = DB::table(self::TABLE)
            ->whereNull('logout_at')
            ->where('expires_at', '>', $now->toDateTimeString());

        if ($locationId > 0) {
            $query->where(function ($q) use ($locationId) {
                $q->where('location_id', $locationId)
                    ->orWhereNull('location_id');
            });
        }

        $sessionRows = $query
            ->orderBy('login_at')
            ->get()
            ->groupBy('staff_id');

        $staffIds = $sessionRows->keys()
            ->map(fn($id) => (int)$id)
            ->filter(fn($id) => $id > 0)
            ->values();

        if ($staffIds->isEmpty()) {
            return [
                'connected' => true,
                'count' => 0,
                'rows' => [],
                'source' => 'PmdAdminPresenceService session registry',
            ];
        }

        $staffMembers = Staffs_model::query()
            ->isEnabled()
            ->whereIn('staff_id', $staffIds)
            ->with(['user', 'role', 'locations'])
            ->orderBy('staff_name')
            ->get();

        $rows = [];

        foreach ($staffMembers as $staff) {
            $staffId = (int)$staff->getKey();
            $sessions = collect($sessionRows->get($staffId, []));
            if ($sessions->isEmpty()) continue;

            $hasLocation = true;
            if ($locationId > 0) {
                $hasLocation = $staff->locations->contains(function ($location) use ($locationId) {
                    return (int)$location->location_id === $locationId;
                });
            }
            if (!$hasLocation) continue;

            $sessions = $sessions->filter(function ($session) use ($locationId) {
                $sessionLocation = (int)($session->location_id ?? 0);
                return $locationId <= 0 || $sessionLocation <= 0 || $sessionLocation === $locationId;
            })->values();

            if ($sessions->isEmpty()) continue;

            $firstLogin = $sessions->min('login_at');
            $lastSeen = $sessions->max('last_seen_at');
            $roleName = trim((string)optional($staff->role)->name);

            $rows[] = [
                'staff_id' => $staffId,
                'user_id' => (int)optional($staff->user)->getKey(),
                'name' => trim((string)$staff->staff_name) ?: 'Staff',
                'role' => $roleName !== '' ? $roleName : 'Staff',
                'login_at' => (string)$firstLogin,
                'last_seen_at' => (string)$lastSeen,
                'session_count' => $sessions->count(),
            ];
        }

        return [
            'connected' => true,
            'count' => count($rows),
            'rows' => $rows,
            'source' => 'PmdAdminPresenceService session registry; online until logout or session expiry',
        ];
    }

    public function tableReady(): bool
    {
        if (self::$tableReady !== null) return self::$tableReady;

        try {
            return self::$tableReady = Schema::hasTable(self::TABLE);
        } catch (\Throwable $error) {
            return self::$tableReady = false;
        }
    }

    private function writeCurrentSession(bool $freshLogin): void
    {
        if (!$this->tableReady() || !AdminAuth::isLogged()) return;

        $user = AdminAuth::getUser();
        $userId = (int)optional($user)->getKey();
        $staff = optional($user)->staff;
        $staffId = (int)optional($staff)->getKey();
        $sessionHash = $this->currentSessionHash();

        if ($userId <= 0 || $sessionHash === '') return;

        $now = $this->now();
        $expiresAt = $now->copy()->addMinutes($this->sessionLifetimeMinutes());
        $locationId = $this->currentLocationId();

        $existing = DB::table(self::TABLE)
            ->where('session_hash', $sessionHash)
            ->first();

        $loginAt = $freshLogin || !$existing
            ? $now->toDateTimeString()
            : (string)$existing->login_at;

        $data = [
            'user_id' => $userId,
            'staff_id' => $staffId > 0 ? $staffId : null,
            'location_id' => $locationId,
            'login_at' => $loginAt,
            'last_seen_at' => $now->toDateTimeString(),
            'expires_at' => $expiresAt->toDateTimeString(),
            'logout_at' => null,
            'ip_address' => substr((string)request()->ip(), 0, 45),
            'user_agent' => substr((string)request()->userAgent(), 0, 1000),
            'updated_at' => $now->toDateTimeString(),
        ];

        if ($existing) {
            DB::table(self::TABLE)
                ->where('session_hash', $sessionHash)
                ->update($data);
        } else {
            $data['session_hash'] = $sessionHash;
            $data['created_at'] = $now->toDateTimeString();
            DB::table(self::TABLE)->insert($data);
        }
    }

    private function currentSessionHash(): string
    {
        try {
            $sessionId = trim((string)session()->getId());
            return $sessionId === '' ? '' : hash('sha256', $sessionId);
        } catch (\Throwable $error) {
            return '';
        }
    }

    private function currentLocationId(): ?int
    {
        try {
            if ($location = AdminLocation::current()) {
                $id = (int)$location->getKey();
                if ($id > 0) return $id;
            }
        } catch (\Throwable $error) {}

        try {
            $id = (int)AdminLocation::getId();
            if ($id > 0) return $id;
        } catch (\Throwable $error) {}

        try {
            $id = (int)AdminLocation::getSession('id');
            if ($id > 0) return $id;
        } catch (\Throwable $error) {}

        return null;
    }

    private function sessionLifetimeMinutes(): int
    {
        return max(5, (int)config('session.lifetime', 120));
    }

    private function now(): Carbon
    {
        return Carbon::now((string)config('app.timezone', 'UTC'));
    }
}

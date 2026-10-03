<?php

namespace Admin\Controllers\Concerns;

use Admin\Models\Staff_attendance_model;
use Admin\Models\Staffs_model;
use Admin\Services\PmdAdminPresenceService;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * PMD Attendance Report Concern V1.3
 *
 * One workforce report built from existing PMD authorities:
 * - Admin accounts: staffs + users
 * - Online now + session history: pmd_admin_presence_sessions
 * - Time clock: staff_attendance
 *
 * Online presence and worked-time attendance remain intentionally separate.
 */
trait PmdreportsAttendanceConcern
{
    // PMD_SETTINGS_REPORTS_PLATFORM_I18N_V16_2
    protected function attendancePayload(Carbon $start, Carbon $end, string $period = 'today'): array
    {
        $locationId = (int)($this->locationId() ?? 0);
        $presence = app(PmdAdminPresenceService::class)->onlineStaffAtLocation($locationId);

        $attendanceModel = new Staff_attendance_model();
        $connection = $attendanceModel->getConnection();
        $schema = $connection->getSchemaBuilder();
        $connectionName = (string)($attendanceModel->getConnectionName() ?: DB::getDefaultConnection());
        $databaseName = '';
        try { $databaseName = (string)$connection->getDatabaseName(); } catch (\Throwable $error) {}

        $tenantAccountCount = 0;
        try {
            $tenantAccountCount = (int)Staffs_model::query()
                ->isEnabled()
                ->whereHas('user')
                ->count();
        } catch (\Throwable $error) {}

        $staffQuery = Staffs_model::query()
            ->isEnabled()
            ->whereHas('user');

        if ($locationId > 0) {
            try {
                $staffQuery->whereHas('locations', function ($locationQuery) use ($locationId) {
                    $locationQuery->where('locations.location_id', $locationId);
                });
            } catch (\Throwable $error) {}
        }

        try {
            $staffMembers = $staffQuery
                ->with(['role', 'user'])
                ->orderBy('staff_name')
                ->get();
        } catch (\Throwable $error) {
            $staffMembers = collect();
        }

        $staffIds = $staffMembers->pluck('staff_id')
            ->map(fn($id) => (int)$id)
            ->filter(fn($id) => $id > 0)
            ->values();

        $presenceRows = collect($presence['rows'] ?? []);
        $presenceByStaff = $presenceRows
            ->keyBy(fn($row) => (int)($row['staff_id'] ?? 0));
        $onlineIds = $presenceByStaff->keys()->map(fn($id) => (int)$id)->values();

        $attendanceRows = collect();
        $clockedInIds = collect();
        $hasAttendance = $schema->hasTable('staff_attendance');
        $hasStatus = $hasAttendance && $schema->hasColumn('staff_attendance', 'status');
        $hasHours = $hasAttendance && $schema->hasColumn('staff_attendance', 'hours_worked');
        $hasVerification = $hasAttendance && $schema->hasColumn('staff_attendance', 'verification_method');

        if ($hasAttendance && $staffIds->isNotEmpty()) {
            try {
                $query = Staff_attendance_model::query()
                    ->with(['staff.role', 'device'])
                    ->whereIn('staff_id', $staffIds->all())
                    ->whereBetween('check_in_time', [
                        $start->format('Y-m-d H:i:s'),
                        $end->format('Y-m-d H:i:s'),
                    ]);
                if ($locationId > 0) $query->where('location_id', $locationId);
                $attendanceRows = $query->orderByDesc('check_in_time')->limit(1000)->get();
            } catch (\Throwable $error) {
                $attendanceRows = collect();
            }

            try {
                $clockQuery = Staff_attendance_model::query()
                    ->whereIn('staff_id', $staffIds->all())
                    ->whereNull('check_out_time');
                if ($locationId > 0) $clockQuery->where('location_id', $locationId);
                if ($hasStatus) $clockQuery->whereNotIn('status', ['checked_out', 'abandoned', 'auto_checkout']);
                $clockedInIds = $clockQuery->pluck('staff_id')
                    ->map(fn($id) => (int)$id)->unique()->values();
            } catch (\Throwable $error) {
                $clockedInIds = collect();
            }
        }

        $sessionRows = collect();
        if ($schema->hasTable(PmdAdminPresenceService::TABLE) && $staffIds->isNotEmpty()) {
            try {
                $sessionQuery = DB::table(PmdAdminPresenceService::TABLE)
                    ->whereIn('staff_id', $staffIds->all())
                    ->where('login_at', '<=', $end->format('Y-m-d H:i:s'))
                    ->where(function ($q) use ($start) {
                        $q->where(function ($logout) use ($start) {
                            $logout->whereNotNull('logout_at')
                                ->where('logout_at', '>=', $start->format('Y-m-d H:i:s'));
                        })->orWhere(function ($open) use ($start) {
                            $open->whereNull('logout_at')
                                ->where('expires_at', '>=', $start->format('Y-m-d H:i:s'));
                        });
                    });
                if ($locationId > 0) {
                    $sessionQuery->where(function ($q) use ($locationId) {
                        $q->where('location_id', $locationId)->orWhereNull('location_id');
                    });
                }
                $sessionRows = $sessionQuery->orderByDesc('login_at')->limit(3000)->get();
            } catch (\Throwable $error) {
                $sessionRows = collect();
            }
        }

        $sessionsByStaff = $sessionRows->groupBy(fn($row) => (int)($row->staff_id ?? 0));
        $attendanceByStaff = $attendanceRows->groupBy(fn($row) => (int)($row->staff_id ?? 0));

        $directory = [];
        $allSessionSeconds = 0;
        $allSessionCount = 0;
        $allAttendanceHours = 0.0;

        foreach ($staffMembers as $staff) {
            $staffId = (int)$staff->staff_id;
            $staffSessions = collect($sessionsByStaff->get($staffId, []));
            $staffAttendance = collect($attendanceByStaff->get($staffId, []));
            $sessionSeconds = 0;
            $lastActivity = null;

            foreach ($staffSessions as $session) {
                $metric = $this->attendanceSessionMetric($session, $start, $end);
                $sessionSeconds += $metric['seconds'];
                if ($metric['last_activity'] && (!$lastActivity || $metric['last_activity']->gt($lastActivity))) {
                    $lastActivity = $metric['last_activity'];
                }
            }

            $workedHours = 0.0;
            foreach ($staffAttendance as $record) {
                $hours = $this->attendanceWorkedHours($record, $hasHours);
                $workedHours += $hours;
                $candidate = $record->check_out_time ?: $record->check_in_time;
                $candidateAt = $this->attendanceCarbon($candidate);
                if ($candidateAt && (!$lastActivity || $candidateAt->gt($lastActivity))) $lastActivity = $candidateAt;
            }

            $user = $staff->user;
            $lastLogin = $this->attendanceCarbon(optional($user)->last_login);
            if (!$lastActivity && $lastLogin) $lastActivity = $lastLogin;

            $onlineRow = $presenceByStaff->get($staffId);
            $activeSessions = (int)($onlineRow['session_count'] ?? 0);
            $online = $onlineIds->contains($staffId);
            $username = trim((string)optional($user)->username);
            $role = trim((string)optional($staff->role)->name) ?: $this->pmdReportText('Staff');

            $params = array_merge($this->periodQueryParams($period), ['staff_id' => $staffId]);
            $directory[] = [
                'staff_id' => $staffId,
                'user_id' => (int)optional($user)->getKey(),
                'name' => trim((string)$staff->staff_name) ?: $this->pmdReportText('Staff'),
                'username' => $username !== '' ? $username : '—',
                'role' => $role,
                'online' => $online,
                'active_sessions' => $activeSessions,
                'clocked_in' => $clockedInIds->contains($staffId),
                'period_sessions' => $staffSessions->count(),
                'period_admin_seconds' => $sessionSeconds,
                'period_admin_time' => $this->attendanceDuration($sessionSeconds),
                'attendance_shifts' => $staffAttendance->count(),
                'worked_hours_value' => round($workedHours, 2),
                'worked_hours' => number_format($workedHours, 2).' h',
                'last_activity' => $lastActivity ? $lastActivity->format($this->pmdReportIsGerman() ? 'd.m.Y · H:i' : 'd M Y · H:i') : 'No tracked activity',
                'detail_url' => admin_url('pmdreports/attendance').'?'.http_build_query($params),
            ];

            $allSessionSeconds += $sessionSeconds;
            $allSessionCount += $staffSessions->count();
            $allAttendanceHours += $workedHours;
        }

        usort($directory, function ($a, $b) {
            if ((bool)$a['online'] !== (bool)$b['online']) return $a['online'] ? -1 : 1;
            return strcasecmp((string)$a['name'], (string)$b['name']);
        });

        $selectedStaffId = max(0, (int)request()->query('staff_id', 0));
        $selected = null;
        foreach ($directory as $row) {
            if ((int)$row['staff_id'] === $selectedStaffId) { $selected = $row; break; }
        }

        $selectedSessions = [];
        $selectedAttendance = [];
        if ($selected) {
            foreach (collect($sessionsByStaff->get($selectedStaffId, [])) as $session) {
                $selectedSessions[] = $this->attendanceSessionRow($session, $start, $end);
            }
            foreach (collect($attendanceByStaff->get($selectedStaffId, [])) as $record) {
                $selectedAttendance[] = $this->attendanceRecordRow($record, $hasHours, $hasVerification, $hasStatus);
            }
        }

        $genericRows = $attendanceRows->map(function ($record) use ($hasHours, $hasVerification, $hasStatus) {
            return $this->attendanceRecordRow($record, $hasHours, $hasVerification, $hasStatus);
        })->values()->all();

        $onlineCount = count(array_filter($directory, fn($row) => !empty($row['online'])));
        $accountCount = count($directory);
        $accountMeta = 'Enabled Admin accounts at this location';
        if ($tenantAccountCount > 0 && $tenantAccountCount !== $accountCount) {
            $accountMeta = number_format($accountCount).' at this location · '.number_format($tenantAccountCount).' tenant-wide';
        }

        return [
            'stats' => [
                $this->stat('Staff accounts', number_format($accountCount), $accountMeta),
                $this->stat('Online now', number_format($onlineCount), 'Authenticated; not logged out'),
                $this->stat('Offline now', number_format(max(0, $accountCount - $onlineCount)), 'No active Admin session'),
                $this->stat('Admin online time', $this->attendanceDuration($allSessionSeconds), 'Selected period'),
                $this->stat('Admin sessions', number_format($allSessionCount), 'Selected period'),
                $this->stat('Time-clock hours', number_format($allAttendanceHours, 2).' h', 'Selected period'),
            ],
            'chart' => null,
            'columns' => [
                ['key' => 'staff', 'label' => 'Staff'],
                ['key' => 'role', 'label' => 'Role'],
                ['key' => 'check_in', 'label' => 'Check in'],
                ['key' => 'check_out', 'label' => 'Check out'],
                ['key' => 'worked', 'label' => 'Worked'],
                ['key' => 'verification', 'label' => 'Verification'],
                ['key' => 'device', 'label' => 'Device'],
                ['key' => 'status', 'label' => 'Status'],
            ],
            'rows' => $genericRows,
            'staff_directory_rows' => $directory,
            'selected_staff' => $selected,
            'selected_admin_sessions' => $selectedSessions,
            'selected_attendance_rows' => $selectedAttendance,
            'attendance_context' => [
                'account_count' => $accountCount,
                'tenant_account_count' => $tenantAccountCount,
                'online_count' => $onlineCount,
                'offline_count' => max(0, $accountCount - $onlineCount),
                'period_admin_seconds' => $allSessionSeconds,
                'period_sessions' => $allSessionCount,
                'period_attendance_hours' => round($allAttendanceHours, 2),
                'presence_tracking' => $schema->hasTable(PmdAdminPresenceService::TABLE),
                'attendance_tracking' => $hasAttendance,
            ],
            'empty' => $accountCount === 0,
            'source' => 'Tenant '.$connectionName.($databaseName !== '' ? ' / '.$databaseName : '').' · location-scoped enabled Admin accounts + PMD Admin session presence + staff_attendance. Tenant-wide account totals are shown only as context. Presence history is available from the moment PMD session tracking was enabled.',
            'back_url' => admin_url('managerlab'),
        ];
    }

    protected function attendanceSessionMetric($session, Carbon $start, Carbon $end): array
    {
        $login = $this->attendanceCarbon($session->login_at ?? null);
        $logout = $this->attendanceCarbon($session->logout_at ?? null);
        $expires = $this->attendanceCarbon($session->expires_at ?? null);
        $lastSeen = $this->attendanceCarbon($session->last_seen_at ?? null);
        $now = Carbon::now($this->restaurantTimezone());

        if (!$login) return ['seconds' => 0, 'last_activity' => $lastSeen];

        $effectiveEnd = $logout ?: ($expires ?: ($lastSeen ?: $now));
        if (!$logout && $effectiveEnd->gt($now)) $effectiveEnd = $now->copy();
        if ($effectiveEnd->gt($end)) $effectiveEnd = $end->copy();
        $effectiveStart = $login->lt($start) ? $start->copy() : $login->copy();
        $seconds = $effectiveEnd->gt($effectiveStart) ? $effectiveStart->diffInSeconds($effectiveEnd) : 0;

        return ['seconds' => max(0, $seconds), 'last_activity' => $lastSeen ?: $effectiveEnd];
    }

    protected function attendanceSessionRow($session, Carbon $start, Carbon $end): array
    {
        $metric = $this->attendanceSessionMetric($session, $start, $end);
        $login = $this->attendanceCarbon($session->login_at ?? null);
        $logout = $this->attendanceCarbon($session->logout_at ?? null);
        $expires = $this->attendanceCarbon($session->expires_at ?? null);
        $now = Carbon::now($this->restaurantTimezone());
        $online = !$logout && $expires && $expires->gt($now);
        $endAt = $logout ?: ($online ? $now : $expires);

        return [
            'login' => $login ? $login->format($this->pmdReportIsGerman() ? 'd.m.Y · H:i' : 'd M Y · H:i') : '—',
            'end' => $online ? 'Online now' : ($endAt ? $endAt->format($this->pmdReportIsGerman() ? 'd.m.Y · H:i' : 'd M Y · H:i') : '—'),
            'duration' => $this->attendanceDuration((int)$metric['seconds']),
            'status' => $online ? 'Online' : ($logout ? 'Logged out' : 'Expired'),
            'ip' => trim((string)($session->ip_address ?? '')) ?: '—',
            'client' => $this->attendanceClientLabel((string)($session->user_agent ?? '')),
        ];
    }

    protected function attendanceRecordRow($record, bool $hasHours, bool $hasVerification, bool $hasStatus): array
    {
        $checkIn = $this->attendanceCarbon($record->check_in_time ?? null);
        $checkOut = $this->attendanceCarbon($record->check_out_time ?? null);
        $hours = $this->attendanceWorkedHours($record, $hasHours);
        $verification = $hasVerification
            ? strtolower(trim((string)($record->verification_method ?? '')))
            : strtolower(trim((string)($record->device_type ?? '')));
        $status = $hasStatus
            ? trim((string)($record->status ?? ''))
            : ($checkOut ? 'checked_out' : 'checked_in');

        return [
            'staff' => trim((string)optional($record->staff)->staff_name) ?: $this->pmdReportText('Staff'),
            'role' => trim((string)optional(optional($record->staff)->role)->name) ?: $this->pmdReportText('Staff'),
            'check_in' => $checkIn ? $checkIn->format($this->pmdReportIsGerman() ? 'd.m.Y · H:i' : 'd M Y · H:i') : '—',
            'check_out' => $checkOut ? $checkOut->format($this->pmdReportIsGerman() ? 'd.m.Y · H:i' : 'd M Y · H:i') : $this->pmdReportText('Active'),
            'worked' => $checkOut ? number_format($hours, 2).' h' : $this->pmdReportText('In progress'),
            'verification' => $this->attendanceLabel($verification ?: 'manual'),
            'device' => trim((string)optional($record->device)->name)
                ?: $this->attendanceLabel((string)($record->device_type ?? 'manual')),
            'status' => $this->attendanceLabel($status ?: 'unknown'),
        ];
    }

    protected function attendanceWorkedHours($record, bool $hasHours): float
    {
        if ($hasHours && method_exists($record, 'getRawOriginal') && $record->getRawOriginal('hours_worked') !== null) {
            return max(0, (float)$record->getRawOriginal('hours_worked'));
        }

        $checkIn = $this->attendanceCarbon($record->check_in_time ?? null);
        $checkOut = $this->attendanceCarbon($record->check_out_time ?? null);
        if (!$checkIn || !$checkOut || !$checkOut->gt($checkIn)) return 0.0;
        return round($checkIn->diffInSeconds($checkOut) / 3600, 2);
    }

    protected function attendanceCarbon($value): ?Carbon
    {
        if (!$value) return null;
        try {
            if ($value instanceof Carbon) return $value->copy()->setTimezone($this->restaurantTimezone());
            return Carbon::parse((string)$value, (string)config('app.timezone', 'UTC'))
                ->setTimezone($this->restaurantTimezone());
        } catch (\Throwable $error) {
            return null;
        }
    }

    protected function attendanceDuration(int $seconds): string
    {
        $seconds = max(0, $seconds);
        $minutes = intdiv($seconds, 60);
        if ($this->pmdReportIsGerman()) {
            if ($minutes < 60) return $minutes.' Min.';
            $hours = intdiv($minutes, 60);
            $remaining = $minutes % 60;
            return $remaining > 0 ? $hours.' Std. '.$remaining.' Min.' : $hours.' Std.';
        }
        if ($minutes < 60) return $minutes.' min';
        $hours = intdiv($minutes, 60);
        $remaining = $minutes % 60;
        return $remaining > 0 ? $hours.'h '.$remaining.'m' : $hours.'h';
    }

    protected function attendanceClientLabel(string $userAgent): string
    {
        $ua = strtolower($userAgent);
        if ($ua === '') return 'Browser';
        $device = str_contains($ua, 'iphone') ? 'iPhone' : (str_contains($ua, 'ipad') ? 'iPad' : (str_contains($ua, 'android') ? 'Android' : (str_contains($ua, 'macintosh') ? 'Mac' : (str_contains($ua, 'windows') ? 'Windows' : 'Browser'))));
        $browser = str_contains($ua, 'edg/') ? 'Edge' : (str_contains($ua, 'chrome/') && !str_contains($ua, 'edg/') ? 'Chrome' : (str_contains($ua, 'safari/') && !str_contains($ua, 'chrome/') ? 'Safari' : (str_contains($ua, 'firefox/') ? 'Firefox' : '')));
        return trim($device.($browser !== '' ? ' · '.$browser : ''));
    }

    protected function attendanceLabel(string $value): string
    {
        $value = trim(str_replace(['_', '-'], ' ', $value));
        return $value === '' ? '—' : $this->pmdReportText(ucwords($value));
    }
}

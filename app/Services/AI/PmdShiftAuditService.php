<?php

namespace App\Services\AI;

use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Throwable;

/**
 * Read-only PMD shift/assignment audit authority for authenticated Admin AI.
 *
 * Events are written by database triggers so every canonical Shifts write path
 * (manual save, merge, copy, confirm, replacement and cancellation) is covered.
 * The actor is captured from the authenticated Admin request through MySQL
 * session variables populated by Admin\Middleware\LogUserLastSeen.
 *
 * This service is intentionally never exposed to Guest AI.
 */
final class PmdShiftAuditService
{
    public const TABLE = 'pmd_operational_shift_audit_events';

    public function available(): bool
    {
        try {
            return Schema::hasTable(self::TABLE);
        } catch (Throwable $error) {
            return false;
        }
    }

    /**
     * @param array<int,int> $personIds
     */
    public function events(
        int $locationId,
        string $startDate,
        string $endDate,
        array $personIds = [],
        ?string $nameQuery = null,
        int $limit = 120
    ): array {
        if ($locationId < 1 || !$this->available()) {
            return [
                'available' => false,
                'events' => [],
                'coverage_start' => null,
                'coverage_note' => 'Shift audit history is not available yet.',
            ];
        }

        try {
            $start = Carbon::parse($startDate)->toDateString();
            $end = Carbon::parse($endDate)->toDateString();
            if ($end < $start) [$start, $end] = [$end, $start];

            $personIds = array_values(array_unique(array_filter(array_map('intval', $personIds))));
            $nameQuery = trim((string)$nameQuery);
            $limit = max(1, min(250, $limit));

            $query = DB::table(self::TABLE)
                ->where('location_id', $locationId)
                ->whereDate('created_at', '>=', $start)
                ->whereDate('created_at', '<=', $end);

            if ($personIds || $nameQuery !== '') {
                $query->where(function ($scope) use ($personIds, $nameQuery) {
                    if ($personIds) {
                        $scope->whereIn('person_id', $personIds);
                    }
                    if ($nameQuery !== '') {
                        $method = $personIds ? 'orWhere' : 'where';
                        $scope->{$method}('target_name_snapshot', 'like', '%'.$nameQuery.'%');
                    }
                });
            }

            $rows = $query
                ->orderByDesc('created_at')
                ->orderByDesc('id')
                ->limit($limit)
                ->get([
                    'id', 'shift_id', 'person_id', 'event_type', 'source',
                    'actor_admin_user_id', 'actor_staff_id', 'actor_name_snapshot',
                    'actor_role_snapshot', 'target_name_snapshot',
                    'before_json', 'after_json', 'created_at',
                ]);

            $coverageStart = DB::table(self::TABLE)
                ->where('location_id', $locationId)
                ->min('created_at');

            $events = [];
            foreach ($rows as $row) {
                $events[] = [
                    'event_id' => (int)$row->id,
                    'event_type' => (string)$row->event_type,
                    'occurred_at' => (string)$row->created_at,
                    'shift_id' => $row->shift_id !== null ? (int)$row->shift_id : null,
                    'person_id' => $row->person_id !== null ? (int)$row->person_id : null,
                    'person_name' => trim((string)($row->target_name_snapshot ?? '')) ?: null,
                    'actor_name' => trim((string)($row->actor_name_snapshot ?? '')) ?: null,
                    'actor_role' => trim((string)($row->actor_role_snapshot ?? '')) ?: null,
                    'source' => trim((string)($row->source ?? '')) ?: 'system',
                    'before' => $this->decodeJson($row->before_json ?? null),
                    'after' => $this->decodeJson($row->after_json ?? null),
                ];
            }

            return [
                'available' => true,
                'events' => $events,
                'coverage_start' => $coverageStart ? (string)$coverageStart : null,
                'coverage_note' => $coverageStart
                    ? 'Actor-level audit is authoritative from coverage_start onward. Earlier shift changes may predate the audit trail.'
                    : 'Audit storage is ready but no shift events have been recorded yet.',
            ];
        } catch (Throwable $error) {
            logger()->warning('PMD shift audit read failed', [
                'location_id' => $locationId,
                'type' => get_class($error),
            ]);

            return [
                'available' => false,
                'events' => [],
                'coverage_start' => null,
                'coverage_note' => 'Shift audit history could not be read.',
            ];
        }
    }

    private function decodeJson($value): ?array
    {
        if (is_array($value)) return $value;
        if ($value === null || $value === '') return null;

        $decoded = json_decode((string)$value, true);
        return is_array($decoded) ? $decoded : null;
    }
}

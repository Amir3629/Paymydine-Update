<?php

namespace App\Services\AI;

use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use RuntimeException;
use Throwable;

/**
 * PMD_GUEST_AI_TABLE_VISIT_CHAT_R1
 *
 * Tenant-local, guest-private conversation persistence for the public menu AI.
 *
 * Privacy/lifecycle contract:
 * - stores only the guest's own menu conversation; no IP, provider payloads,
 *   staff/admin data, order details or payment data are stored here;
 * - guest identity is stored only as a SHA-256 hash of the existing V2
 *   guestSessionId, never the raw browser identifier;
 * - each chat is scoped to one canonical table + location + manual-free visit
 *   generation;
 * - the existing cashier_manual_free table lifecycle is the hard visit boundary;
 *   history from an older visit is never returned after Staff Free Table;
 * - stale/old generations are physically purged on the next history/ask access,
 *   with a 24-hour safety TTL if staff never closes the table visit.
 */
final class GuestAiConversationStore
{
    private const TABLE = 'pmd_guest_ai_conversations';
    private const MAX_MESSAGES = 40;
    private const TTL_HOURS = 24;

    public function history(int $locationId, int $tableId, string $guestSessionId): array
    {
        $this->assertContext($locationId, $tableId, $guestSessionId);
        $this->ensureSchema();

        $visitKey = $this->currentVisitKey($tableId);
        $this->purgeStaleRows($tableId, $visitKey);

        $rows = DB::table(self::TABLE)
            ->where('location_id', $locationId)
            ->where('table_id', $tableId)
            ->where('visit_key', $visitKey)
            ->where('guest_session_hash', $this->guestHash($guestSessionId))
            ->orderByDesc('id')
            ->limit(self::MAX_MESSAGES)
            ->get()
            ->reverse()
            ->values();

        return [
            'visit_key' => $visitKey,
            'messages' => $rows->map(static function ($row): array {
                return [
                    'id' => (int)($row->id ?? 0),
                    'role' => (string)($row->role ?? ''),
                    'content' => (string)($row->content ?? ''),
                    'locale' => trim((string)($row->locale ?? '')) ?: null,
                    'created_at' => $row->created_at ? (string)$row->created_at : null,
                ];
            })->all(),
        ];
    }

    public function lastAssistantContext(
        int $locationId,
        int $tableId,
        string $guestSessionId,
        int $maxChars = 220
    ): string {
        $this->assertContext($locationId, $tableId, $guestSessionId);
        $this->ensureSchema();

        $visitKey = $this->currentVisitKey($tableId);
        $this->purgeStaleRows($tableId, $visitKey);

        $row = DB::table(self::TABLE)
            ->where('location_id', $locationId)
            ->where('table_id', $tableId)
            ->where('visit_key', $visitKey)
            ->where('guest_session_hash', $this->guestHash($guestSessionId))
            ->where('role', 'assistant')
            ->orderByDesc('id')
            ->first(['content']);

        $text = trim(preg_replace('/\s+/u', ' ', (string)($row->content ?? '')) ?: '');
        if ($text === '') {
            return '';
        }

        $maxChars = max(80, min(320, $maxChars));
        return mb_strlen($text) > $maxChars
            ? rtrim(mb_substr($text, 0, max(1, $maxChars - 1))).'…'
            : $text;
    }

    public function appendPair(
        int $locationId,
        int $tableId,
        string $guestSessionId,
        string $question,
        string $answer,
        ?string $locale = null,
        ?string $runId = null
    ): array {
        $this->assertContext($locationId, $tableId, $guestSessionId);
        $this->ensureSchema();

        $visitKey = $this->currentVisitKey($tableId);
        $this->purgeStaleRows($tableId, $visitKey);

        $question = $this->clip($question, 600);
        $answer = $this->clip($answer, 3200);
        $locale = trim((string)$locale);
        $runId = trim((string)$runId);
        $guestHash = $this->guestHash($guestSessionId);
        $expiresAt = now()->addHours(self::TTL_HOURS);

        DB::transaction(function () use (
            $locationId,
            $tableId,
            $visitKey,
            $guestHash,
            $question,
            $answer,
            $locale,
            $runId,
            $expiresAt
        ): void {
            $common = [
                'location_id' => $locationId,
                'table_id' => $tableId,
                'visit_key' => $visitKey,
                'guest_session_hash' => $guestHash,
                'locale' => $locale !== '' ? mb_substr($locale, 0, 32) : null,
                'run_id' => $runId !== '' ? mb_substr($runId, 0, 64) : null,
                'expires_at' => $expiresAt,
                'created_at' => now(),
                'updated_at' => now(),
            ];

            DB::table(self::TABLE)->insert(array_merge($common, [
                'role' => 'user',
                'content' => $question,
            ]));

            DB::table(self::TABLE)->insert(array_merge($common, [
                'role' => 'assistant',
                'content' => $answer,
            ]));

            $staleIds = DB::table(self::TABLE)
                ->where('location_id', $locationId)
                ->where('table_id', $tableId)
                ->where('visit_key', $visitKey)
                ->where('guest_session_hash', $guestHash)
                ->orderByDesc('id')
                ->skip(self::MAX_MESSAGES)
                ->pluck('id')
                ->map(static fn ($id) => (int)$id)
                ->filter(static fn ($id) => $id > 0)
                ->all();

            if ($staleIds) {
                DB::table(self::TABLE)->whereIn('id', $staleIds)->delete();
            }
        });

        return [
            'visit_key' => $visitKey,
            'persisted' => true,
        ];
    }

    private function assertContext(int $locationId, int $tableId, string $guestSessionId): void
    {
        if ($locationId < 1 || $tableId < 1) {
            throw new RuntimeException('A canonical restaurant table is required for saved AI chat.');
        }

        $guestSessionId = trim($guestSessionId);
        if (
            mb_strlen($guestSessionId) < 8
            || mb_strlen($guestSessionId) > 100
            || preg_match('/^[A-Za-z0-9._:-]+$/', $guestSessionId) !== 1
        ) {
            throw new RuntimeException('A valid guest session is required for saved AI chat.');
        }

        if (!Schema::hasTable('tables')) {
            throw new RuntimeException('Restaurant table storage is unavailable.');
        }

        $columns = Schema::getColumnListing('tables');
        $pk = in_array('table_id', $columns, true)
            ? 'table_id'
            : (in_array('id', $columns, true) ? 'id' : null);

        if (!$pk) {
            throw new RuntimeException('Restaurant table identity is unavailable.');
        }

        $query = DB::table('tables')->where($pk, $tableId);
        if (in_array('location_id', $columns, true)) {
            $query->where('location_id', $locationId);
        }

        if (!$query->exists()) {
            throw new RuntimeException('Restaurant table not found for this location.');
        }
    }

    private function currentVisitKey(int $tableId): string
    {
        $boundary = 'initial';

        try {
            if (Schema::hasTable('pmd_table_status_history')) {
                $columns = Schema::getColumnListing('pmd_table_status_history');
                if (
                    in_array('table_id', $columns, true)
                    && in_array('reason', $columns, true)
                ) {
                    $query = DB::table('pmd_table_status_history')
                        ->where('table_id', $tableId)
                        ->where('reason', 'cashier_manual_free');

                    if (in_array('id', $columns, true)) {
                        $query->orderByDesc('id');
                    } elseif (in_array('created_at', $columns, true)) {
                        $query->orderByDesc('created_at');
                    } elseif (in_array('updated_at', $columns, true)) {
                        $query->orderByDesc('updated_at');
                    }

                    $row = $query->first();
                    if ($row) {
                        $boundary = implode('|', [
                            (string)($row->id ?? ''),
                            (string)($row->created_at ?? ''),
                            (string)($row->updated_at ?? ''),
                        ]);
                    }
                }
            }
        } catch (Throwable $error) {
            logger()->warning('PMD Guest AI visit boundary fallback', [
                'table_id' => $tableId,
                'error_type' => get_class($error),
            ]);
        }

        return 'pmdav_'.substr(hash('sha256', implode('|', [
            request()->getHost(),
            (string)$tableId,
            $boundary,
        ])), 0, 28);
    }

    private function purgeStaleRows(int $tableId, string $visitKey): void
    {
        try {
            DB::table(self::TABLE)
                ->where('table_id', $tableId)
                ->where(function ($query) use ($visitKey) {
                    $query->where('visit_key', '!=', $visitKey)
                        ->orWhere('expires_at', '<=', now());
                })
                ->delete();
        } catch (Throwable $error) {
            logger()->warning('PMD Guest AI stale chat purge failed', [
                'table_id' => $tableId,
                'error_type' => get_class($error),
            ]);
        }
    }

    private function ensureSchema(): void
    {
        if (Schema::hasTable(self::TABLE)) {
            return;
        }

        try {
            Schema::create(self::TABLE, function (Blueprint $table): void {
                $table->bigIncrements('id');
                $table->unsignedBigInteger('location_id')->index();
                $table->unsignedBigInteger('table_id')->index();
                $table->string('visit_key', 64)->index();
                $table->char('guest_session_hash', 64)->index();
                $table->string('role', 16);
                $table->text('content');
                $table->string('locale', 32)->nullable();
                $table->string('run_id', 64)->nullable();
                $table->dateTime('expires_at')->index();
                $table->timestamps();
                $table->index(
                    ['table_id', 'visit_key', 'guest_session_hash'],
                    'pmd_guest_ai_visit_guest_idx'
                );
            });
        } catch (Throwable $error) {
            // First-request races are harmless if another request created it.
            if (!Schema::hasTable(self::TABLE)) {
                throw $error;
            }
        }
    }

    private function guestHash(string $guestSessionId): string
    {
        return hash('sha256', trim($guestSessionId));
    }

    private function clip(string $value, int $maxChars): string
    {
        $value = trim(preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $value) ?: '');
        if (mb_strlen($value) <= $maxChars) {
            return $value;
        }

        return rtrim(mb_substr($value, 0, max(1, $maxChars - 1))).'…';
    }
}

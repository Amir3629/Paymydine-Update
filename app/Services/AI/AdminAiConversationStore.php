<?php

namespace App\Services\AI;

use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use RuntimeException;
use Throwable;

/**
 * Tenant-local persistence for the authenticated PMD Intelligence workspace.
 *
 * Scope is deliberately narrow:
 * - current tenant connection is already selected by the Admin request;
 * - one conversation per authenticated admin user + canonical location + restaurant-local day;
 * - prior days remain stored but are not mixed into today's conversation;
 * - daily reads use the existing created_at timestamp window and never depend
 *   on an in-request ALTER TABLE succeeding;
 * - only user/assistant text and run id are stored;
 * - provider payloads, secrets, IP addresses and raw tool payloads are never stored.
 */
final class AdminAiConversationStore
{
    private const TABLE = 'pmd_admin_ai_conversations';
    private const MAX_MESSAGES = 300;

    public function history(int $locationId, int $userId, int $limit = 120): array
    {
        $this->assertContext($locationId, $userId);
        $limit = max(1, min(self::MAX_MESSAGES, $limit));

        if (!$this->ensureTable()) {
            return ['storage_ready' => false, 'messages' => []];
        }

        $window = $this->conversationWindow();
        $rows = $this->scopedDayQuery($locationId, $userId, $window)
            ->orderByDesc('id')
            ->limit($limit)
            ->get()
            ->reverse()
            ->values();

        return [
            'storage_ready' => true,
            'storage_mode' => 'created_at_window',
            'conversation_date' => $window['local_date'],
            'messages' => $rows->map(static function ($row): array {
                return [
                    'id' => (int)($row->id ?? 0),
                    'role' => (string)($row->role ?? ''),
                    'content' => (string)($row->content ?? ''),
                    'run_id' => $row->run_id ? (string)$row->run_id : null,
                    'created_at' => isset($row->created_at) ? (string)$row->created_at : null,
                ];
            })->all(),
        ];
    }

    /**
     * Compact conversational continuity for today's model session. This is not
     * a factual authority: Pmdintelligence instructs the model to re-check PMD
     * tools for restaurant facts instead of trusting an older assistant answer.
     */
    public function modelContext(int $locationId, int $userId, int $limit = 10): array
    {
        $history = $this->history($locationId, $userId, max(2, min(20, $limit)));
        if (empty($history['storage_ready']) || empty($history['messages'])) {
            return [];
        }

        $messages = array_slice((array)$history['messages'], -max(2, min(20, $limit)));
        $total = 0;
        $result = [];

        foreach ($messages as $message) {
            $role = ($message['role'] ?? '') === 'assistant' ? 'assistant' : 'user';
            $content = trim((string)($message['content'] ?? ''));
            if ($content === '') continue;

            if (mb_strlen($content) > 1200) {
                $content = rtrim(mb_substr($content, 0, 1199)).'…';
            }

            if ($total + mb_strlen($content) > 7000) {
                break;
            }

            $total += mb_strlen($content);
            $result[] = ['role' => $role, 'content' => $content];
        }

        return $result;
    }

    public function appendPair(
        int $locationId,
        int $userId,
        string $question,
        string $answer,
        ?string $runId = null
    ): array {
        $this->assertContext($locationId, $userId);

        if (!$this->ensureTable()) {
            return ['storage_ready' => false, 'persisted' => false];
        }

        $question = $this->clip($question, 4000);
        $answer = $this->clip($answer, 12000);
        $runId = trim((string)$runId);
        $window = $this->conversationWindow();
        $hasConversationDate = $this->hasConversationDateColumn();

        try {
            DB::transaction(function () use (
                $locationId,
                $userId,
                $question,
                $answer,
                $runId,
                $window,
                $hasConversationDate
            ): void {
                $now = Carbon::now($window['storage_timezone']);
                $common = [
                    'location_id' => $locationId,
                    'admin_user_id' => $userId,
                    'run_id' => $runId !== '' ? mb_substr($runId, 0, 64) : null,
                    'created_at' => $now,
                    'updated_at' => $now,
                ];

                // Keep the optional rollout column populated when it exists,
                // but never require it for reads or writes on an older tenant DB.
                if ($hasConversationDate) {
                    $common['conversation_date'] = $window['local_date'];
                }

                DB::table(self::TABLE)->insert(array_merge($common, [
                    'role' => 'user',
                    'content' => $question,
                ]));

                DB::table(self::TABLE)->insert(array_merge($common, [
                    'role' => 'assistant',
                    'content' => $answer,
                ]));

                // Bound only today's transcript. Previous daily chats remain stored.
                $staleIds = $this->scopedDayQuery($locationId, $userId, $window)
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
        } catch (Throwable $error) {
            logger()->warning('PMD Admin AI chat write failed', [
                'location_id' => $locationId,
                'admin_user_id' => $userId,
                'conversation_date' => $window['local_date'],
                'error_type' => get_class($error),
            ]);
            return ['storage_ready' => true, 'persisted' => false];
        }

        return [
            'storage_ready' => true,
            'persisted' => true,
            'conversation_date' => $window['local_date'],
        ];
    }

    /** Clear only today's restaurant-local conversation; archived days remain. */
    public function clear(int $locationId, int $userId): bool
    {
        $this->assertContext($locationId, $userId);
        if (!$this->ensureTable()) return false;

        $window = $this->conversationWindow();
        $this->scopedDayQuery($locationId, $userId, $window)->delete();

        return true;
    }

    /**
     * Existing tenants may already have the original chat table. Do not run DDL
     * during a normal page request just to add a daily-scope column. The table's
     * created_at timestamp is sufficient and is available on every rollout.
     */
    private function ensureTable(): bool
    {
        if (Schema::hasTable(self::TABLE)) return true;

        try {
            Schema::create(self::TABLE, function (Blueprint $table): void {
                $table->bigIncrements('id');
                $table->unsignedBigInteger('location_id');
                $table->unsignedBigInteger('admin_user_id');
                $table->date('conversation_date')->nullable();
                $table->string('role', 16);
                $table->longText('content');
                $table->string('run_id', 64)->nullable();
                $table->timestamps();
                $table->index(['location_id', 'admin_user_id', 'id'], 'pmd_admin_ai_scope_idx');
                $table->index(
                    ['location_id', 'admin_user_id', 'conversation_date', 'id'],
                    'pmd_admin_ai_day_scope_idx'
                );
            });
        } catch (Throwable $error) {
            if (!Schema::hasTable(self::TABLE)) {
                logger()->warning('PMD Admin AI chat table unavailable', [
                    'error_type' => get_class($error),
                    'database' => DB::connection()->getDatabaseName(),
                ]);
                return false;
            }
        }

        return Schema::hasTable(self::TABLE);
    }

    private function hasConversationDateColumn(): bool
    {
        try {
            return Schema::hasColumn(self::TABLE, 'conversation_date');
        } catch (Throwable $error) {
            return false;
        }
    }

    private function scopedDayQuery(int $locationId, int $userId, array $window)
    {
        return DB::table(self::TABLE)
            ->where('location_id', $locationId)
            ->where('admin_user_id', $userId)
            ->where('created_at', '>=', $window['storage_start'])
            ->where('created_at', '<', $window['storage_end']);
    }

    private function conversationWindow(): array
    {
        $restaurantTimezone = '';

        try {
            $restaurantTimezone = trim((string)app(PmdReadAuthority::class)->canonicalTimezone());
        } catch (Throwable $error) {
            $restaurantTimezone = '';
        }

        if ($restaurantTimezone === '') {
            $restaurantTimezone = trim((string)config('app.timezone', 'UTC')) ?: 'UTC';
        }

        try {
            $localStart = Carbon::now($restaurantTimezone)->startOfDay();
        } catch (Throwable $error) {
            $restaurantTimezone = 'UTC';
            $localStart = Carbon::now('UTC')->startOfDay();
        }

        $storageTimezone = trim((string)config('app.timezone', 'UTC')) ?: 'UTC';
        try {
            $storageStart = $localStart->copy()->setTimezone($storageTimezone);
        } catch (Throwable $error) {
            $storageTimezone = 'UTC';
            $storageStart = $localStart->copy()->setTimezone('UTC');
        }

        return [
            'local_date' => $localStart->toDateString(),
            'restaurant_timezone' => $restaurantTimezone,
            'storage_timezone' => $storageTimezone,
            'storage_start' => $storageStart,
            'storage_end' => $storageStart->copy()->addDay(),
        ];
    }

    private function assertContext(int $locationId, int $userId): void
    {
        if ($locationId < 1 || $userId < 1) {
            throw new RuntimeException('A canonical location and authenticated admin user are required.');
        }
    }

    private function clip(string $value, int $limit): string
    {
        $value = trim($value);
        if (mb_strlen($value) <= $limit) return $value;
        return rtrim(mb_substr($value, 0, max(1, $limit - 1))).'…';
    }
}
